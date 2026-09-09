# Future: Image Optimization — formats, delivery sizes, one-click cleanup

> **Status: approaches proposed 2026-09-09, decision pending.** Standalone backlog item — deliberately **not** part of the feature series in `future-roadmap.md`; it has no dependency on those stages and none of them depend on it. Pick it up whenever.
>
> **Problem statement (Gerasimos, 2026-09-09):** users — increasingly with AI-generated images — upload large PNGs and end up with sites full of files that are far heavier than they need to be. The fix must not put a non-technical user through a process they don't understand. Facts below were verified against the code on `0.9.10` the same day.

---

## Where things stand

**What already works.** Every raster upload is resized into variants (`thumb` 150 / `small` 480 / `medium` 1024 / `large` 1920 by default, quality 85 — App Settings, theme-overridable via `theme.json` `settings.imageSizes`). Only sizes smaller than the original are generated; the original is recompressed in place when it is no larger than the largest size, otherwise stored untouched and the `large` variant becomes the delivery ceiling. Export copies the variants (except `thumb`) and the original only when no `large` variant exists. The `{% image %}` tag (`packages/core/src/tags/imageTag.js`) selects a variant by `size:`, builds `srcset` when asked, and passes a `sizes` attribute through. Arch uses it 124 times: 80 with `srcset: true`; 54 `large`, 41 `medium`, 29 `small`. Pipeline: `uploadProjectMedia` in `packages/builder-server/src/controllers/mediaController.js`; reference: `docs-llms/core-media.md`.

**What does not.**

1. **Format is never changed.** A PNG stays a PNG through every variant and into the export (`mediaController.js` ~362–410 branches on the upload MIME and re-encodes in the same format). PNG is the wrong container for photographs, and AI-generated images are photographs.
2. **PNG "quality" quantises to 256 colours.** Sharp's `png({ quality })` implies `palette: true` (`node_modules/sharp/lib/output.js:601`). That is how PNG variants get any smaller at all — and on skies and gradients it produces visible banding. Users are getting images that are both heavy *and* slightly degraded.
3. **Nothing fixes an existing library.** App Settings changes apply to the next upload only; there is no regenerate/reprocess action anywhere. `scripts/optimize-project-media.mjs` (Anastis, 2026-08) converts a project's PNG/JPEG to WebP in place and rewrites every reference — page/collection/global JSON, `theme.json`, `media_files` / `media_sizes` rows — with a dry-run estimate, but it is a CLI that needs the backend stopped. It is the prototype for approach 3, not a product feature.
4. **A third of Arch's placements have no `sizes` hint.** 49 of the 124 `{% image %}` calls pass `srcset` but no `sizes`, so browsers assume full viewport width and fetch the 1920px candidate for a card thumbnail. Format-independent waste.
5. **The settings are for engineers.** "Image Quality 1–100" and per-size pixel widths, global across projects (`core-appSettings.md`). Hidden entirely when the theme defines sizes. No non-technical user should see either.
6. **No feedback.** After upload the toast says "Successfully uploaded N file(s)"; the media list shows file size and dimensions; nothing says what was done or what is heavy.

**Measured** (a real 1024×1024 PNG from the repo — a UI screenshot, so a photograph would show a *larger* gap):

| encoding | size |
|---|---|
| source PNG | 1653 KB |
| today's pipeline (PNG, quality 85 → palette) | 512 KB |
| PNG lossless, max compression | 2343 KB |
| JPEG q82 (mozjpeg) | 184 KB |
| **WebP q80** | **164 KB** |
| AVIF q50 | 100 KB |

The installed Sharp (0.34.5, libvips 8.17.3, libheif 1.20.2) encodes AVIF. WebP has been supported by every browser since 2020 (Safari 14); AVIF since 2023 (Safari 16.4).

---

## Approaches

### 1. Convert on upload, silently — *recommended first*

Every photo-type upload (PNG, JPEG, static GIF) is encoded as **WebP** for all variants and for the delivered "original"; animated GIF and SVG are left alone; alpha is preserved (WebP supports it). The user sees nothing except one line after upload: *"Optimized: 4.2 MB → 480 KB"*.

- Conversion happens **before the image is referenced anywhere**, so none of the script's reference rewriting is needed — the stored `filename` / `path` simply end in `.webp`; `originalName` keeps what the user uploaded.
- **Keep the untouched upload bytes** under a non-served adapter key (e.g. `originals/<filename>`), excluded from export, so "download original" is always possible and a future re-encode (AVIF, different quality) is lossless. Counts toward the hosted storage quota (`LIMIT_KEYS.MAX_MEDIA_BYTES`); approach 3 can offer to purge them.
- Encoding choice per image: lossy WebP q80–82 for photographs; **near-lossless** WebP for flat-colour graphics (few distinct colours — a logo or icon exported as PNG), where lossy would blur edges. Sharp's `stats()` / a palette-entropy check decides; default to lossy when unsure.
- AVIF is a later second tier, not v1: several times slower to encode and a smaller gain over WebP than WebP over PNG. If added, serve `<picture>` with AVIF + WebP.
- Cost: small. Touches `uploadProjectMedia` (the format branches become "encode as WebP"), `media.test.js` (expects same-format variants today), the upload toast in `packages/editor-ui/src/hooks/useMediaUpload.js`, the accept lists (unchanged — inputs stay PNG/JPEG/GIF/WebP/SVG).

### 2. Send the right size to the right spot — *do with 1*

Pure theme work, zero UI. Audit the 49 `{% image %}` calls in `themes/arch` that pass `srcset: true` without `sizes` and add the display-width hint per widget layout (cards: `(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw`; heroes: `100vw`). Optionally a small Arch snippet that derives `sizes` from a widget's `columns_desktop` setting so authors stop hand-writing media queries. On listing pages this halves transfer again on top of approach 1.

### 3. One-button cleanup for existing libraries — *the follow-up*

Approach 1 only helps new uploads; most sites that have this problem already have a library full of PNGs. A single action on the Media page:

> **Optimize images** — Your images take 48 MB. Optimizing would bring them to about 9 MB. Nothing will look different.

Behind it, the script's logic promoted to a service and run as an in-app job with progress:

- Convert every PNG/JPEG original + variants to WebP (or regenerate variants from the retained original where one exists).
- Rewrite references: page JSON, global widgets, collection items, `theme.json` values, richtext `<img src>` inside saved HTML, `seo.og_image` — the usage tracker's path regex (`/\/uploads\/(?:images|files)\/[A-Za-z0-9._-]+/g` in `mediaUsageService.js`) already finds every one of them; then `refreshAllMediaUsage`.
- Update `media_files` (`filename`, `path`, `type`, `size`) and `media_sizes` rows in one transaction; invalidate the media cache.
- Skip the favicon source (the site-icon pipeline outputs PNG/ICO from whatever it reads, but older Safari cannot render a WebP favicon if the theme references the file directly — the script's `--include-favicons` caveat).
- Hold the project's write lock for the run (reuse the per-project export serialization in `exportController.js`) so a concurrent save cannot reference a path that is about to change; progress through the same polling pattern the export UI uses (`useExportState.js`).
- Dry-run first to produce the estimate in the button copy (the script's sampling approach: encode a sample, extrapolate).
- Offer, in the same dialog, to delete the retained originals to free space (off by default).

Cost: medium — the rewrite and a progress UI. The script already contains the hard part.

### 4. Replace the technical settings with three words — *when settings are next touched*

Per project, one control: **Image quality — Balanced (recommended) / Highest / Smallest files**, mapping to WebP quality (≈82 / 90 / 70) and optionally a max delivered width (1920 / 2560 / 1600). The 1–100 field and the pixel widths leave the normal UI (keep them reachable for theme authors if wanted); the per-file size limit stays in App Settings because it protects memory, not taste. The App Settings image-sizes group stays theme-driven and hidden.

### Not proposed

- **Client-side compression before upload** (browser canvas / wasm encoders). Would work for the web and Electron shells, but duplicates the server pipeline, produces different output per browser, and cannot fix an existing library. The server already has Sharp.
- **A "compress?" prompt at upload time.** That is exactly the process a non-technical user should not have to understand. Do it, tell them, move on.

---

## Recommendation

1 + 2 together first — no UI to design, and every new upload is fixed. Then 3, because it is what actually rescues existing sites. 4 whenever the settings screen is next opened.

---

## Open questions (decide before building)

- **Social crawlers and WebP `og:image`.** `resolveImageUrl` in `SeoTag.js` points `og:image` at the published variant. Twitter/X reads WebP; Facebook and LinkedIn support has been inconsistent. Safest: for an image used as `seo.og_image`, also emit one JPEG rendition (≈1200px) and point `og:image` at it. Verify current crawler support before deciding.
- **Download original.** Worth a media-item action once originals are retained; needs a route that serves the `originals/` key (never exported, never used in templates).
- **What "size" the media list shows** — the optimized size (what the site ships) with the original in a tooltip, so the saving is visible without a new column.
- **Hosted quota accounting** for retained originals: count them (simple, honest) or exempt them (kinder, more code). Default: count them, and let approach 3's purge option reclaim the space.
- **Existing exported sites** are unaffected until re-exported; note it in the cleanup dialog ("re-export to publish the smaller images").

---

## Definition of done (approach 1)

- A 4000px PNG upload yields `.webp` variants at 480 / 1024 / 1920 plus a retained, non-served original; export contains only WebP for that image; usage tracking resolves it.
- Transparency preserved; animated GIF and SVG untouched; a flat-colour PNG logo stays crisp (near-lossless path).
- The upload toast reports the saving; the media list shows the optimized size.
- `media.test.js`, `depthRenderSmoke.test.js` and the export tests pass with WebP fixtures; the single-language export fixture diff shows only the image files changing.
