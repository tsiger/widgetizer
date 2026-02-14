# Image Tag: Responsive Images Research & Ideas

> **Status: Brainstorming** — This document captures research and ideas for adding responsive image support to the `{% image %}` Liquid tag. Nothing here is implemented yet.

## Context

The `{% image %}` tag (`src/core/tags/imageTag.js`) currently renders a single `<img>` element with one `src` pointing to a hardcoded size variant. The upload pipeline already generates multiple size variants (thumb, small, medium, large) via Sharp and stores their paths/dimensions in `media.json` — but there's no way for theme authors to leverage `srcset`/`sizes` to let the browser pick the optimal image for the viewport.

**Goal**: Give theme authors opt-in, un-opinionated building blocks for responsive images. Provide data and primitives — don't dictate markup patterns.

---

## Current Image Tag Behavior

**File**: `src/core/tags/imageTag.js`

```liquid
{% image src: 'hero.jpg', size: 'medium', class: 'hero-img', alt: 'Hero' %}
```

**Output**:
```html
<img src="hero-medium.jpg" alt="Hero" class="hero-img" width="1024" height="768" loading="lazy">
```

**Supported params**: `src`, `size` (thumb/small/medium/large, default: medium), `class`, `alt`, `title`, `lazy` (default: true), `loading`, `fetchpriority`, `decoding`, `output` (html/url/path).

**What's missing**: No `srcset`, no `sizes`, no `<picture>` support. The browser always downloads exactly the size hardcoded in the template, regardless of viewport width.

**What already exists**:
- All size variants are pre-generated at upload time with paths/dimensions in `media.json`
- `mediaFiles` context object provides full size data during rendering
- `enqueue_preload` tag already supports `imagesrcset` and `imagesizes` for link preloads
- `media_meta` filter exists as a pattern for custom filters

---

## Options for Responsive Support

### Option A: `srcset` + `sizes` params on `{% image %}`

Add two new opt-in parameters to the existing tag.

**Usage**:
```liquid
{% image src: 'hero.jpg', srcset: true, sizes: '(max-width: 768px) 100vw, 50vw' %}
```

**Output**:
```html
<img src="hero-medium.jpg"
     srcset="hero-small.jpg 480w, hero-medium.jpg 1024w, hero-large.jpg 1920w"
     sizes="(max-width: 768px) 100vw, 50vw"
     width="1024" height="768" loading="lazy" alt="...">
```

**Implementation details**:
- Build `srcset` from `mediaFile.sizes` entries, sorted by width ascending, using `{path} {width}w` format
- Include the original image in srcset if it's larger than all size variants
- Exclude `thumb` from srcset (too small for viewport-based selection; it's for UI thumbnails)
- SVGs skip srcset entirely (vector, no benefit)
- `sizes` param is passthrough — the tag doesn't interpret it, just emits it as-is
- The `size` param still controls which variant is used for `src` (fallback for non-srcset browsers)
- If `srcset: true` but only one size exists, render normal `<img>` (no srcset needed)

**Pros**: Simple, backward compatible, covers 80-90% of responsive needs, zero new concepts for theme authors.

**Cons**: All variants are same crop/aspect ratio — no art direction. No format switching (WebP/AVIF).

---

### Option B: `image_srcset` filter

A Liquid filter that returns just the srcset string, for theme authors who want to construct their own markup.

**New file**: `src/core/filters/imageSrcsetFilter.js`

**Registration**: Follow `registerMediaMetaFilter` pattern in `server/services/renderingService.js` (line ~30 import, line ~89 registration).

**Usage**:
```liquid
{{ 'hero.jpg' | image_srcset }}
→ "hero-small.jpg 480w, hero-medium.jpg 1024w, hero-large.jpg 1920w"

{{ 'hero.jpg' | image_srcset: 'small,medium' }}
→ "hero-small.jpg 480w, hero-medium.jpg 1024w"
```

**This enables fully custom markup**:
```liquid
<picture>
  <source media="(min-width: 1024px)"
          srcset="{{ widget.settings.image | image_srcset: 'large' }}">
  <img src="{% image src: widget.settings.image, size: 'medium', output: 'url' %}"
       srcset="{{ widget.settings.image | image_srcset: 'small,medium' }}"
       sizes="100vw"
       alt="{{ widget.settings.image | media_meta: 'alt' }}">
</picture>
```

**Implementation details**:
- Receives filename, looks up mediaFile from context `mediaFiles`
- Optional argument: comma-separated size names to include (e.g. `'small,medium'`)
- If no argument, includes all sizes except `thumb`
- Returns empty string for SVGs or missing files
- Prepends `imagePath` to each path (same as image tag does)

**Pros**: Maximum flexibility for theme authors who need `<picture>` or custom markup. Works with existing `media_meta` filter and `{% image output: 'url' %}` for complete control.

**Cons**: Requires more Liquid knowledge from theme authors. Only useful for advanced responsive patterns.

---

### Option C: `<picture>` element support

A `picture: true` param on the image tag that wraps output in `<picture>` with `<source>` elements per breakpoint.

```liquid
{% image src: 'hero.jpg', picture: true, sizes: '100vw' %}
```

**Output**:
```html
<picture>
  <source srcset="hero-large.jpg" media="(min-width: 1024px)" width="1920" height="1440">
  <source srcset="hero-medium.jpg" media="(min-width: 480px)" width="1024" height="768">
  <img src="hero-small.jpg" width="480" height="360" loading="lazy" alt="...">
</picture>
```

**Pros**: Art direction support. Future-proof for WebP/AVIF format switching.

**Cons**: Opinionated — the tag decides breakpoint media queries. Harder to style (CSS targets `<img>` inside `<picture>`). Theme authors lose control over breakpoint values. Conflicts with the "un-opinionated" goal.

**Verdict**: Skip this. Option B (the filter) gives theme authors the tools to build `<picture>` themselves with whatever breakpoints they want. A built-in `picture` mode would be opinionated about things that are layout-specific.

---

### Option D: WebP/AVIF format generation

Extend the Sharp upload pipeline to also generate WebP (and optionally AVIF) variants alongside the existing JPEG/PNG variants.

**Media.json addition**:
```json
{
  "sizes": {
    "medium": {
      "path": "/uploads/images/hero-medium.jpg",
      "width": 1024, "height": 768,
      "formats": {
        "webp": "/uploads/images/hero-medium.webp",
        "avif": "/uploads/images/hero-medium.avif"
      }
    }
  }
}
```

**Template usage** (combined with Option B):
```liquid
<picture>
  <source type="image/webp"
          srcset="{{ widget.settings.image | image_srcset: 'small,medium,large', format: 'webp' }}"
          sizes="100vw">
  <img src="{% image src: widget.settings.image, size: 'medium', output: 'url' %}"
       srcset="{{ widget.settings.image | image_srcset }}"
       sizes="100vw" alt="...">
</picture>
```

**Pros**: Best performance — modern browsers use WebP/AVIF (30-50% smaller files).

**Cons**: Significantly larger scope — changes the upload pipeline, `media.json` schema, disk usage (more variants), and export logic. Should be its own project, not bundled with responsive `srcset` support.

**Verdict**: Valuable but separate concern. Implement Options A+B first. Format generation can be added later and will naturally compose with the filter/srcset infrastructure.

---

## Recommendation

**Implement Options A + B together**:

1. **`srcset: true` param on `{% image %}`** — handles the 90% case. Theme authors add one param and get responsive images. Zero new concepts.

2. **`image_srcset` filter** — handles the 10% case where authors need `<picture>` or custom markup. Provides the raw srcset string; the author decides everything else.

Both are opt-in. Both are un-opinionated (the tag/filter provides data, the author decides layout). Both compose well with existing tools (`media_meta`, `output: 'url'`, `enqueue_preload`).

Skip Options C and D for now. `<picture>` is better served by the filter + manual markup. WebP/AVIF is a separate pipeline concern.

---

## Files to Modify

| File | Change |
|---|---|
| `src/core/tags/imageTag.js` | Add `srcset` and `sizes` param handling |
| `src/core/filters/imageSrcsetFilter.js` | New file — `image_srcset` filter |
| `server/services/renderingService.js` | Import and register the new filter (~line 30 + ~89) |
| `server/tests/tags.test.js` | Tests for both new features |

---

## Interaction with Smart Export

If/when smart export (see `future-media-handling.md` section 3) is implemented, the render-time size tracker in `imageTag.js` would need to be aware of srcset. When `srcset: true`, all included size variants should be recorded as "used" — since the browser may choose any of them at runtime. This means smart export would still copy all srcset-included variants for that image, which is correct behavior (the whole point of srcset is letting the browser choose).

---

**See also:**

- [Media Handling Ideas](future-media-handling.md) — Smart export, original capping, on-demand variants
- [Media Library](core-media.md) — Current image processing and upload pipeline
- [Theming: Widgets](theming-widgets.md) — Widget template patterns
