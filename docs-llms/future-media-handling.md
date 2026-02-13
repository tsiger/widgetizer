# Image Handling: Research & Ideas Report

> **Status: Brainstorming** — This document captures research and ideas for optimizing the image pipeline. Nothing here is implemented yet.

## Context

Three questions about the image pipeline after introducing theme-defined image sizes and theme presets:
1. How should presets interact with `imageSizes`?
2. What to do with huge uploaded originals (6000x4000)?
3. Can we track which sizes are used per image and only export those specific variants?

This report is based on a thorough review of the codebase and docs-llms documentation.

---

## 1. Presets + imageSizes

**Finding: No interaction needed — current behavior is already correct.**

`imageSizes` is defined at `theme.json > settings.imageSizes`. It's a special configuration block, not a regular setting item with an `id`. Presets override settings by matching `id` fields in the flat `preset.json` map, so they can't touch `imageSizes` — and they shouldn't.

**Why?** Image sizes are a **structural** concern, not a **visual** one. All presets of a theme share the same widgets, templates, and CSS. A card grid widget always renders its image at `size: 'medium'`; a hero always uses `size: 'large'`. That's determined by the widget template, not by the preset's color palette or fonts. Changing presets from "Restaurant" to "Creative Agency" changes colors and demo content — it doesn't change what image dimensions the layout needs.

All presets inherit the root theme's `imageSizes` automatically. This is the correct behavior.

---

## 2. What to do with huge originals

**The problem**: A user uploads a 6000x4000 JPEG (~10+ MB). The system generates variants (thumb at 150px, small at 480px, medium at 1024px, large at 1920px). The 6000px original is stored permanently but nothing ever references it — the largest the `{% image %}` tag ever asks for is `large` (1920px).

### Idea A: Cap the original on upload

After generating all size variants, resize the stored "original" down to a maximum width using Sharp. The original file is overwritten; `width`/`height` in `media.json` are updated.

**Sub-options for what the cap should be**:

| Cap strategy | Value | Pros | Cons |
|---|---|---|---|
| Largest enabled size | e.g., 1920px | Zero waste — perfectly matches what's needed | If user later enables a bigger size or switches themes, the data is gone |
| Fixed ceiling | e.g., 2560px | Simple to reason about, provides headroom for theme changes | Arbitrary number, still wastes some space |
| Configurable in App Settings | `media.imageProcessing.maxOriginalWidth`, default 2560, 0 = no cap | Flexible — power users control it | One more setting to manage |

**Implementation**: ~15 lines in `mediaController.js > uploadProjectMedia` (after the size-variant generation loop at ~line 625). Use `sharp(originalPath).resize({ width: maxWidth }).toFile(tempPath)`, then replace original. Update metadata.

**Trade-off**: Capping is destructive. The raw upload is permanently lost. For a website builder, this is usually fine — nobody needs 6000px for web. But if someone uses the media library for print assets too, it's a problem.

### Idea B: Don't store the original separately

If the original is larger than the biggest variant, the biggest variant effectively *is* the original. Don't keep a separate original file — just point `path` at the largest generated variant.

**Downside**: Removes the conceptual distinction between "original" and "variants". Complicates the data model — today, `sizes` is a map of named variants, and `path` always points to the original. Collapsing these could introduce edge cases (what if someone disables the `large` size later?).

### Idea C: Keep originals, optimize only at export time

Don't touch uploaded files at all. Rely entirely on smart export (section 3) to avoid exporting the bloated original. The original stays on the server's disk but never makes it into the exported site.

**Trade-off**: Server disk grows. For a desktop Electron app this might be acceptable (local disk). For a hosted web app, this costs storage money. But it's the safest option — no data loss, fully reversible.

### Idea D: Lazy/on-demand variant generation

Don't pre-generate all variants on upload. Store only the original + thumb. Generate other sizes on first request or at export time.

**Trade-off**: Adds complexity to the preview pipeline. The Liquid rendering service would need to trigger on-the-fly resizing (or show originals scaled via CSS until variants are ready). First preview of a page would be slow. Probably over-engineering for the current architecture — pre-generation is simple and fast.

### Idea E: Cap + archive

Cap the stored original (idea A), but before capping, move the raw upload to an `archive/` directory that isn't served or exported. Users could recover the full original if ever needed.

**Trade-off**: More disk than pure capping, less than keeping originals. Adds UX complexity (where do users find archived originals? how do they restore?). Might not be worth the complexity.

### Recommendation

For a web-focused tool, **Idea A (cap to a configurable max, default 2560px)** combined with **Idea C / section 3 (smart export)** gives the best balance. The cap reduces server disk usage substantially (a 6000x4000 JPEG capped to 2560px goes from ~10MB to ~3MB), while the smart export ensures the exported site only contains what's actually referenced. The configurable setting lets power users disable capping if they need full originals.

---

## 3. Smart export: Only export referenced size variants

**The problem**: Export currently copies the original file + ALL generated size variants for every used image. If a hero image has 4 variants, all 5 files (original + thumb + small + medium + large) are exported — even if the template only uses `size: 'large'`.

### The key insight

The `{% image %}` tag (`src/core/tags/imageTag.js`) already knows exactly which size it resolves at render time:

```liquid
{% image src: block.settings.image, size: 'medium', class: 'widget-card-image' %}
```

Line 46 of `imageTag.js`:
```js
imageSize = mediaFile.sizes?.[size] || { path: mediaFile.path, width: mediaFile.width, height: mediaFile.height };
```

The tag picks the named size if it exists, or falls back to the original. **It already knows the answer** — we just need to record it.

And the export pipeline (`exportController.js`) already renders every single page before copying assets (line 311-358). The rendering happens first, then the file copying happens. So we can piggyback a collector on the render pass.

### Proposed approach: Render-time size tracking

**Step 1 — Collector**: Before the page render loop in `exportController.js` (line 311), create a shared collector:
```js
const usedImageSizes = new Map();  // Map<filename, Set<sizeName|"original">>
```

Pass it into `sharedGlobals`. Currently `sharedGlobals` is created fresh per page (line 312-321), but the `usedImageSizes` Map should be created **once** outside the loop and shared across all pages via a reference.

**Step 2 — Recording**: In `imageTag.js`, after resolving the size variant, check for the collector on globals and record the resolved size:
```js
const usedImageSizes = context.get(["globals", "usedImageSizes"]);
if (usedImageSizes) {
  if (!usedImageSizes.has(filename)) usedImageSizes.set(filename, new Set());
  usedImageSizes.get(filename).add(mediaFile.sizes?.[size] ? size : "original");
}
```

This works for both `output: "url"` (CSS backgrounds) and full `<img>` tag rendering — both code paths resolve a size variant.

**Step 3 — Selective copying**: In `exportController.js` (line 547-563), replace the "copy all sizes" logic:

```
Before: for every size variant → copy it
After:  for every size variant → copy it ONLY IF it's in usedImageSizes for this file
        copy original ONLY IF "original" is in the set (fallback case)
        always copy thumb (safety net / future-proofing)
```

If a file has no entry in `usedImageSizes` (shouldn't happen, but safety), fall back to copying everything — same as today.

### Why this approach wins

| Approach | Pros | Cons |
|---|---|---|
| **Render-time tracking** | Zero schema changes. Zero template changes. Captures actual resolved behavior including fallbacks. ~25 lines across 2 files. | Only works at export time — can't answer "which sizes does this image need?" outside of an export render pass |
| Schema-declared sizes (`"imageSize": "medium"` in schema.json) | Explicit, queryable at any time, works outside export context | Requires updating every widget schema. Doesn't capture fallback behavior. Theme authors must maintain it. Disconnected from actual template behavior. |
| Template scanning at export time | No schema changes | Fragile Liquid regex parsing. Can't handle dynamic size values. Misses fallback logic. Doesn't capture `output: "url"` usage in inline styles. |

### Expected savings

For a site with 20 used images, each with 4 size variants:
- **Before**: 20 originals + 80 variants = **100 files** exported
- **After**: Only the specific variants referenced (~20-30) + 20 thumbs = **~40-50 files**

For large originals (6000px, ~10MB each), skipping originals alone saves **~200MB** on a 20-image site.

### Interaction with question 2

If you also cap originals (idea A), the savings compound:
- Capping shrinks the stored original from ~10MB to ~3MB
- Smart export then avoids exporting even that ~3MB original entirely (since templates reference named sizes, not the original)
- You get both smaller server storage AND dramatically smaller exports

---

## How the pieces fit together

```
Upload                          Storage                         Export
──────                          ───────                         ──────
6000x4000 JPEG ──→ Generate     thumb (150px)    ──→            ✓ Always copied
                   variants     small (480px)    ──→            ✓ Only if referenced
                                medium (1024px)  ──→            ✓ Only if referenced
                                large (1920px)   ──→            ✓ Only if referenced
                   Cap original original (2560px) ──→           ✗ Only if fallback needed
                   (Idea A)     (was 6000px)
```

The two optimizations are independent and complementary:
- **Cap** reduces what's stored on disk
- **Smart export** reduces what's in the exported site
- Either can be implemented alone; together they maximize savings

---

**See also:**

- [Media Library](core-media.md) - Current image processing and usage tracking
- [Export System](core-export.md) - Current export pipeline and optimized image copying
- [App Settings](core-appSettings.md) - Image processing configuration
