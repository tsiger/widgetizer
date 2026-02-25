# Responsive Images for `{% image %}`: Detailed Spec (Options A + B)

> **Status: Proposed**
> This document defines the concrete implementation plan for responsive image support in Widgetizer using:
> 1. Option A: `srcset` + `sizes` on `{% image %}`
> 2. Option B: `image_srcset` Liquid filter

## Decision

Implement **Option B + Option A**.

- **Option B (`image_srcset`) is the core primitive** for maximum theme-author flexibility.
- **Option A (`srcset: true`) is convenience sugar** on top of the same data.
- Both are opt-in and backward-compatible.
- No built-in `<picture>` mode (too opinionated).
- No WebP/AVIF generation in this scope (separate upload-pipeline project).

## Why this fits current Widgetizer media architecture

Current behavior and constraints in the codebase:

- The `{% image %}` tag currently resolves a single source URL from `mediaFiles` + `imagePath`.
- Upload pipeline already stores multiple size variants in `mediaFile.sizes` with width/height.
- Theme-defined image sizes support **custom size names** (not limited to `thumb/small/medium/large`).
- Tiny images can have `sizes: {}` (no generated variants).
- SVGs are stored/sanitized but do not have raster variants.
- Render context already exposes everything needed:
  - `mediaFiles`
  - `imagePath` (`/api/media/...` in preview, `assets/images` in publish)
- `enqueue_preload` already supports `imagesrcset` and `imagesizes`.
- Export currently copies original + all generated sizes for used images, so responsive output is safe immediately.

## Scope

In scope:

- Add `srcset` + `sizes` support to `{% image %}` HTML output.
- Add `image_srcset` filter for author-defined markup (`<picture>`, custom `<img>`, custom preloads).
- Keep behavior consistent in preview and publish render modes.
- Add tests for both paths.

Out of scope:

- Auto-generated `<picture>` markup.
- New media formats (WebP/AVIF variants).
- Upload pipeline/schema changes.

---

## Option A: `{% image %}` with `srcset` + `sizes`

### API

Existing tag (no breaking changes), add two optional params:

- `srcset`: boolean, default `false`
- `sizes`: string, optional

Example:

```liquid
{% image src: widget.settings.hero_image, size: 'medium', srcset: true, sizes: '(max-width: 900px) 100vw, 50vw' %}
```

### Output rules

1. `src` continues to be resolved from `size` (same fallback behavior as today).
2. `width`/`height` remain tied to resolved `src` image (for CLS protection).
3. `srcset` is added only when `srcset: true` and at least 2 viable width candidates exist.
4. `sizes` is emitted only when:
   - `srcset` is emitted, and
   - `sizes` param is provided and non-empty.
5. SVG behavior remains unchanged:
   - no `srcset`
   - no `sizes`
   - no width/height attrs from raster sizes.
6. `output: 'url'|'path'` mode remains path-only and never emits attributes.

### Candidate-building algorithm (for `srcset`)

Given `mediaFile`:

1. Collect candidates from `mediaFile.sizes` where `path` and numeric `width` exist.
2. Exclude `thumb` by default in Option A.
3. Convert each candidate path to final URL using `imagePath + basename(path)`.
4. Sort candidates by width ascending.
5. Optionally include original as a candidate when:
   - original has numeric width, and
   - original width is greater than current max candidate width.
6. Deduplicate by width (keep first stable entry).
7. Render as: `"url widthw, url widthw, ..."`

If final candidate count < 2, skip `srcset` entirely.

### Behavior matrix

| Case | Result |
|---|---|
| JPEG/PNG/WebP with multiple sizes | `<img src="..." srcset="..." ...>` |
| Image with no generated sizes (`sizes: {}`) | `<img src="...">` only |
| SVG | current SVG behavior, no responsive attrs |
| `output: 'url'/'path'` | URL string only |
| `srcset: false` (or omitted) | current behavior |

### Examples

Basic:

```liquid
{% image src: 'hero.jpg', srcset: true, sizes: '100vw' %}
```

Likely output (publish mode):

```html
<img src="assets/images/hero-medium.jpg"
     srcset="assets/images/hero-small.jpg 480w, assets/images/hero-medium.jpg 1024w, assets/images/hero-large.jpg 1920w"
     sizes="100vw"
     width="1024"
     height="768"
     loading="lazy"
     alt="">
```

No responsive attrs in path mode:

```liquid
{% image src: 'hero.jpg', srcset: true, output: 'url' %}
```

Returns only URL string.

---

## Option B: `image_srcset` filter (core flexibility primitive)

### API

New filter:

```liquid
{{ image_path_or_filename | image_srcset }}
{{ image_path_or_filename | image_srcset: 'small,medium,hero' }}
```

Arguments:

- arg1 (optional): comma-separated size names to include.
  - If omitted: include all available sizes except `thumb`.
  - If provided: include only those names, in the provided order, filtered to existing sizes.
  - `thumb` can be included explicitly if requested.

### Output contract

- Returns a valid `srcset` string (`"url 480w, url 1024w, ..."`), or empty string.
- Returns empty string for:
  - missing file
  - non-image file
  - SVG
  - insufficient candidates (< 1 for filter; caller can decide usage)
- Uses current `imagePath`, so output is correct in both preview and publish modes.

### Candidate-building algorithm (shared with Option A)

Use the same core builder as Option A for consistency.

Recommended implementation: move candidate construction to a shared helper used by:

- `src/core/tags/imageTag.js`
- `src/core/filters/imageSrcsetFilter.js`

Benefits:

- One source of truth for URL shaping, sorting, inclusion rules, SVG handling.
- Easier future smart-export integration.

### Why Option B is required for flexibility

Theme authors can build:

- `<picture>` for art direction
- media-query-specific `<source>` elements
- custom priority/LCP strategies
- custom preload tags with `imagesrcset`

Example: author-controlled `<picture>`:

```liquid
<picture>
  <source media="(min-width: 1200px)" srcset="{{ widget.settings.hero | image_srcset: 'hero,large' }}">
  <source media="(min-width: 700px)" srcset="{{ widget.settings.hero | image_srcset: 'medium' }}">
  <img
    src="{% image src: widget.settings.hero, size: 'small', output: 'url' %}"
    srcset="{{ widget.settings.hero | image_srcset: 'small,medium,hero' }}"
    sizes="100vw"
    alt="{{ widget.settings.hero | media_meta: 'alt' }}">
</picture>
```

Example: responsive preload:

```liquid
{% capture hero_srcset %}{{ widget.settings.hero | image_srcset: 'small,medium,large' }}{% endcapture %}
{% enqueue_preload src: "{% image src: widget.settings.hero, size: 'medium', output: 'url' %}", as: "image", imagesrcset: hero_srcset, imagesizes: "100vw", fetchpriority: "high" %}
```

---

## Backward compatibility

- Existing themes continue to render unchanged.
- Existing `{% image %}` usage remains valid.
- Existing app settings/theme image size configurations remain valid.
- No DB migration required.

---

## Edge cases and exact handling

1. **Custom theme size names**
   - Must work automatically (`hero`, `card`, `sidebar`, etc.).
   - Do not hardcode size names in srcset logic.

2. **Requested `size` missing in `{% image %}`**
   - Keep current fallback to original image for `src`.
   - `srcset` still built from available candidates.

3. **Duplicate widths**
   - Dedupe by width to avoid noisy srcset.

4. **Invalid metadata**
   - Ignore entries with missing path/width.

5. **Escaping**
   - Escape `sizes` attribute value.
   - Keep existing escaping for `alt`/`title`.

---

## Interaction with export and future smart export

Current export behavior copies original + all generated sizes for used images, so Options A/B are safe immediately.

For future smart export:

- Tracking only in `imageTag` is not enough once authors use `image_srcset` directly.
- Track used sizes in the **shared srcset helper** so both tag and filter usage can report size usage.
- When `srcset` is emitted, all included candidates should be considered used (browser may choose any).

---

## Implementation plan

### Files

| File | Change |
|---|---|
| `src/core/tags/imageTag.js` | Add `srcset` + `sizes` param handling for HTML output |
| `src/core/filters/imageSrcsetFilter.js` | Add new `image_srcset` filter |
| `src/core/media/buildSrcsetCandidates.js` (or similar) | Shared helper for candidate generation (recommended) |
| `server/services/renderingService.js` | Register new filter next to `media_meta` |
| `server/tests/tags.test.js` | Add Option A tests |
| `server/tests/tags.test.js` or new filter test file | Add Option B tests |

### Test cases

Option A tests:

- emits `srcset` + `sizes` when multiple raster candidates exist
- excludes `thumb` by default
- includes original candidate when larger than generated variants
- no `srcset` for SVG
- no `srcset` in `output: "url"` mode
- graceful fallback when requested `size` is missing

Option B tests:

- returns full srcset with default selection
- respects explicit size list
- supports custom size names
- returns empty for missing file/SVG/non-image
- returns publish/preview-correct paths

Integration sanity tests:

- verify no regressions in existing image/video/audio tag behavior
- verify existing theme templates still pass

---

## Recommended delivery order

1. Implement Option B (`image_srcset`) + shared helper.
2. Implement Option A by reusing the same helper.
3. Update theming docs with responsive examples.
4. Add future smart-export note to use shared helper signals.

---

## See also

- [Media Handling Ideas](future-media-handling.md)
- [Media Library](core-media.md)
- [Theming Guide](theming.md)
