# Image Handling: Optimizations

> **Status: Ready for implementation** — Section 1 is a resolved finding (no changes needed). Sections 2 and 3 have concrete implementation plans.

## Context

Three questions about the image pipeline after introducing theme-defined image sizes and theme presets:
1. How should presets interact with `imageSizes`?
2. What to do with huge uploaded originals (6000x4000)?
3. Can we track which sizes are used per image and only export those specific variants?

---

## 1. Presets + imageSizes

**Finding: No interaction needed — current behavior is already correct.**

`imageSizes` is defined at `theme.json > settings.imageSizes`. It's a special configuration block, not a regular setting item with an `id`. Presets override settings by matching `id` fields in the flat `preset.json` map, so they can't touch `imageSizes` — and they shouldn't.

Image sizes are a **structural** concern, not a **visual** one. All presets of a theme share the same widgets, templates, and CSS. A card grid widget always renders its image at `size: 'medium'`; a hero always uses `size: 'large'`. That's determined by the widget template, not by the preset's color palette or fonts.

All presets inherit the root theme's `imageSizes` automatically. No changes needed.

---

## 2. Cap huge originals on upload

**The problem**: A user uploads a 6000x4000 JPEG (~10+ MB). The system generates variants (thumb at 150px, small at 480px, medium at 1024px, large at 1920px). The 6000px original is stored permanently but nothing ever references it — the largest the `{% image %}` tag ever asks for is `large` (1920px).

**Solution**: After generating all size variants, resize the stored "original" down to a configurable maximum width. The original file is overwritten; `width`/`height` in the DB are updated.

### Implementation

**File: `server/controllers/mediaController.js`** — In `uploadProjectMedia`, after the size-variant generation loop (~line 625):

```js
// Cap the original if it exceeds the configured max width
const maxOriginalWidth = appSettings?.media?.imageProcessing?.maxOriginalWidth ?? 2560;
if (maxOriginalWidth > 0 && metadata.width > maxOriginalWidth) {
  const tempCapped = originalPath + ".capped.tmp";
  await sharp(originalPath)
    .resize({ width: maxOriginalWidth, withoutEnlargement: true })
    .toFile(tempCapped);
  await fs.move(tempCapped, originalPath, { overwrite: true });
  const cappedMeta = await sharp(originalPath).metadata();
  metadata.width = cappedMeta.width;
  metadata.height = cappedMeta.height;
  metadata.size = (await fs.stat(originalPath)).size;
}
```

**File: `server/db/repositories/settingsRepository.js`** — Add to `defaultSettings.media.imageProcessing`:

```js
maxOriginalWidth: 2560,  // 0 = no cap
```

**Trade-off**: Capping is destructive — the raw upload is permanently lost. For a web-focused tool this is fine (nobody needs 6000px for web). The configurable setting (with 0 = disabled) lets power users opt out.

**Expected savings**: A 6000x4000 JPEG (~10MB) capped to 2560px becomes ~3MB. For a project with 50 uploaded images, this can save ~350MB of disk.

---

## 3. Smart export: Only export referenced size variants

**The problem**: Export currently copies the original file + ALL generated size variants for every used image. If a hero image has 4 variants, all 5 files (original + thumb + small + medium + large) are exported — even if the template only uses `size: 'large'`.

### Approach: Render-time size tracking

The export pipeline already renders every page before copying assets. The `{% image %}` tag already resolves exactly which size variant to use (including fallback to original). We piggyback a lightweight in-memory collector on that render pass to record which sizes were actually resolved — then use that data to selectively copy only the referenced variants.

**Why this approach over alternatives:**

- **No schema changes, no migration, no DB writes** — purely in-memory during export
- **Captures actual resolved behavior** including fallbacks (if a widget asks for `size: 'large'` but the image doesn't have a large variant, the tag falls back to the original — this captures that truth)
- **Works for both `<img>` tags and `output: "url"` mode** (CSS backgrounds) — both code paths resolve a size variant
- **~25 lines across 2 files**
- **Memory footprint**: ~30KB for 500 images. The Map lives for one export request and is garbage collected after. No cross-request state, no shared memory, no contention in multitenant environments.

### Implementation

#### Step 1 — Create collector before the page render loop

**File: `server/controllers/exportController.js`** — Before the page loop (before line 258):

```js
// Track which image size variants are actually referenced during rendering.
// Map<filename, Set<sizeName | "original">>
const usedImageSizes = new Map();
```

Then inside the loop, add it to each page's `sharedGlobals` (line 260):

```js
const sharedGlobals = {
  projectId,
  apiUrl: "",
  renderMode: "publish",
  themeSettingsRaw: rawThemeSettings,
  enqueuedStyles: new Map(),
  enqueuedScripts: new Map(),
  exportVersion: version,
  usedImageSizes,  // shared across all pages — same Map reference
};
```

The `usedImageSizes` Map is created **once** outside the loop. Each page's `sharedGlobals` gets a reference to the same Map, so entries accumulate across all pages.

#### Step 2 — Record resolved sizes in the image tag

**File: `src/core/tags/imageTag.js`** — After both size resolution points (the `output: "url"` path at line 31 and the full `<img>` path at line 46), record what was resolved:

```js
// Record resolved size for smart export (only present during export render)
const usedImageSizes = context.get(["globals", "usedImageSizes"]);
if (usedImageSizes) {
  const resolvedSize = mediaFile.sizes?.[size] ? size : "original";
  if (!usedImageSizes.has(filename)) usedImageSizes.set(filename, new Set());
  usedImageSizes.get(filename).add(resolvedSize);
}
```

This must be added in **both** code paths:
1. After line 31 (the `output: "url"/"path"` early return path)
2. After line 46 (the full `<img>` tag path)

SVGs skip size resolution entirely, so no tracking is needed for them (they're already handled before the size resolution code).

#### Step 3 — Selective image copying

**File: `server/controllers/exportController.js`** — Replace the image copying section (lines 465-536). The current logic copies original + all sizes. The new logic:

```js
for (const imageFile of usedImages) {
  const fileSizes = usedImageSizes.get(imageFile.filename);

  // Safety: if no tracking data, copy everything (same as before)
  if (!fileSizes) {
    // ... copy original + all sizes (existing behavior)
    continue;
  }

  // Copy original only if it was used as a fallback
  if (fileSizes.has("original")) {
    // ... copy original
  }

  // Copy only referenced size variants (+ always copy thumb as safety net)
  if (imageFile.sizes) {
    for (const [sizeName, sizeInfo] of Object.entries(imageFile.sizes)) {
      if (fileSizes.has(sizeName) || sizeName === "thumb") {
        // ... copy this size variant
      }
    }
  }
}
```

**Thumb is always copied** as a safety net — it's tiny (~5KB) and useful for future features (search results, media library previews in exported admin panels, etc.).

### Expected savings

For a site with 20 used images, each with 4 size variants + original:

| | Files exported | Disk (if originals are ~10MB, variants ~1-3MB) |
|---|---|---|
| **Before** | 20 originals + 80 variants = **100 files** | ~250MB |
| **After** | ~20-30 referenced variants + 20 thumbs = **~40-50 files** | ~60-90MB |

Combined with capping (section 2), the original is never exported at all (templates reference named sizes, not the original), so even the capped 2560px version is skipped.

### Testing

Add tests to `server/tests/export.test.js`:

1. **Only referenced image sizes are exported** — Create a page that uses `{% image src: "photo.jpg", size: "medium" %}`, export, verify only `photo-medium.jpg` and `photo-thumb.jpg` are in the output (not `photo-small.jpg`, `photo-large.jpg`, or the original).
2. **Fallback to original is tracked** — Create a page that uses `{% image src: "photo.jpg", size: "xlarge" %}` where `xlarge` doesn't exist, export, verify the original is copied (fallback behavior).
3. **All sizes copied when no tracking data** — Safety net test: if `usedImageSizes` has no entry for an image, all sizes are copied (backward-compatible).
4. **Thumb always copied** — Even if only `size: "large"` is referenced, `thumb` is still in the export.

---

## How the pieces fit together

```
Upload                          Storage                         Export
------                          -------                         ------
6000x4000 JPEG --> Generate     thumb (150px)    -->            Always copied
                   variants     small (480px)    -->            Only if referenced
                                medium (1024px)  -->            Only if referenced
                                large (1920px)   -->            Only if referenced
                   Cap original original (2560px) -->           Only if fallback needed
                   (Section 2)  (was 6000px)
```

The two optimizations are independent and complementary:
- **Cap** (section 2) reduces what's stored on disk
- **Smart export** (section 3) reduces what's in the exported site
- Either can be implemented alone; together they maximize savings

---

**See also:**

- [Media Library](core-media.md) - Current image processing and usage tracking
- [Export System](core-export.md) - Current export pipeline and optimized image copying
- [App Settings](core-appSettings.md) - Image processing configuration
