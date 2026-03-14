# Responsive Images Rollout

> **Status: In progress** — `srcset` support implemented on `{% image %}` tag. `card-grid` widget updated. Remaining widgets need `srcset: true` with appropriate `sizes` values.

## What was done

- Added `srcset: true` and `sizes` params to `{% image %}` tag (`src/core/tags/imageTag.js`)
- Excludes `thumb` from srcset candidates, includes original if wider than all variants
- Backward compatible — existing templates render unchanged unless `srcset: true` is added

## Completed

| Widget | `sizes` value | Notes |
|--------|--------------|-------|
| `card-grid` | `(max-width: 768px) 100vw, 400px` | 3-5 columns in fixed container |

## Remaining — Large size widgets

Full-width or hero images using `size: 'large'`. Likely `sizes: '100vw'` for fullwidth layouts, or container-relative for constrained ones.

| Widget | File | Notes |
|--------|------|-------|
| `image` | `widgets/image/widget.liquid` | Standalone image, can be fullwidth or constrained |
| `image-callout` | `widgets/image-callout/widget.liquid` | Image beside text |
| `image-hotspots` | `widgets/image-hotspots/widget.liquid` | Interactive hotspot overlay |
| `image-text` | `widgets/image-text/widget.liquid` | Split layout (image + text) |
| `image-tabs` | `widgets/image-tabs/widget.liquid` | Tabbed image display |
| `comparison-slider` | `widgets/comparison-slider/widget.liquid` | Before/after slider (2 images) |
| `project-showcase` | `widgets/project-showcase/widget.liquid` | Portfolio-style grid |
| `testimonial-hero` | `widgets/testimonial-hero/widget.liquid` | Author image (large) |

## Remaining — Medium size widgets

Card-based or moderate-width images using `size: 'medium'`.

| Widget | File | Notes |
|--------|------|-------|
| `content-switcher` | `widgets/content-switcher/widget.liquid` | 3 layout variants with card images |
| `gallery` | `widgets/gallery/widget.liquid` | Grid/masonry gallery |
| `masonry-gallery` | `widgets/masonry-gallery/widget.liquid` | Masonry layout |
| `profile-grid` | `widgets/profile-grid/widget.liquid` | Team member photos |
| `testimonial-hero` | `widgets/testimonial-hero/widget.liquid` | Logo image (medium) |
| `global/header` | `widgets/global/header/widget.liquid` | Site logo |

## Remaining — Small size widgets

Avatars, logos, and small accent images using `size: 'small'`.

| Widget | File | Notes |
|--------|------|-------|
| `testimonials` | `widgets/testimonials/widget.liquid` | Reviewer avatars |
| `priced-list` | `widgets/priced-list/widget.liquid` | Menu item images |
| `logo-cloud` | `widgets/logo-cloud/widget.liquid` | Partner/client logos |
| `global/footer` | `widgets/global/footer/widget.liquid` | Footer logo |

## Skip — NOT srcset-capable

These use `output: 'url'` for CSS `background-image`. `srcset` doesn't apply to CSS backgrounds.

| Widget | File | Reason |
|--------|------|--------|
| `banner` | `widgets/banner/widget.liquid` | CSS background-image |
| `bento-grid` | `widgets/bento-grid/widget.liquid` | CSS background-image |
| `slideshow` | `widgets/slideshow/widget.liquid` | CSS background-image |
| `split-hero` | `widgets/split-hero/widget.liquid` | CSS background-image |

## Approach

For each widget, determine the correct `sizes` value based on:
1. Is the image fullwidth or inside a fixed container (~1200px)?
2. How many columns on desktop?
3. Does it stack to full width on mobile?

The `sizes` attribute describes **CSS layout width**, not image file width. The browser handles retina (2x/3x) automatically.

All widget files are in `themes/arch/widgets/`.
