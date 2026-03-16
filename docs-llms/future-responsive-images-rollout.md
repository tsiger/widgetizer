# Responsive Images Rollout

> **Status: Complete** — `srcset` support implemented on `{% image %}` tag and rolled out to all applicable widgets.

## What was done

- Added `srcset: true` and `sizes` params to `{% image %}` tag (`src/core/tags/imageTag.js`)
- Excludes `thumb` from srcset candidates, includes original if wider than all variants
- Backward compatible — existing templates render unchanged unless `srcset: true` is added

## Completed — Large size widgets

Full-width or hero images using `size: 'large'`.

| Widget | `sizes` value | Notes |
|--------|--------------|-------|
| `image` | `100vw` | Standalone image, fullwidth or constrained |
| `image-callout` | `(max-width: 768px) 100vw, 50vw` | Image beside text, ~50/50 split |
| `image-hotspots` | `100vw` | Full container width overlay |
| `image-text` | `(max-width: 768px) 100vw, 50vw` | Split layout, ~50/50 |
| `image-tabs` | `100vw` | Full container tabbed display |
| `comparison-slider` | `100vw` | Full container before/after (2 images) |
| `project-showcase` | `(max-width: 768px) 100vw, 50vw` | Portfolio grid cards |
| `testimonial-hero` | `100vw` | Author hero image (large) |

## Completed — Medium size widgets

Card-based or moderate-width images using `size: 'medium'`.

| Widget | `sizes` value | Notes |
|--------|--------------|-------|
| `card-grid` | `(max-width: 768px) 100vw, 400px` | 3-5 columns in fixed container |
| `content-switcher` | `(max-width: 768px) 100vw, 400px` | 3 layout variants with card images |
| `gallery` | `(max-width: 768px) 100vw, 400px` | Grid gallery |
| `masonry-gallery` | `(max-width: 768px) 100vw, 400px` | Masonry layout |
| `profile-grid` | `(max-width: 768px) 50vw, 300px` | Team member photos, 2+ columns |

## Skipped — Too small to benefit

Logos, avatars, and small accent images. These use `size: 'small'` or `size: 'medium'` for logos and are unlikely to have 2+ srcset candidates. The tag gracefully omits `srcset` when fewer than 2 candidates exist.

| Widget | Reason |
|--------|--------|
| `testimonials` | Reviewer avatars (`small`) |
| `priced-list` | Menu item images (`small`) |
| `logo-cloud` | Partner/client logos (`small`) |
| `global/footer` | Footer logo (`small`) |
| `global/header` | Site logo (`medium`, but logo-sized) |
| `testimonial-hero` | Company logo (`medium`, but logo-sized) |

## Skipped — NOT srcset-capable

These use `output: 'url'` for CSS `background-image`. `srcset` doesn't apply to CSS backgrounds.

| Widget | Reason |
|--------|--------|
| `banner` | CSS background-image |
| `bento-grid` | CSS background-image |
| `slideshow` | CSS background-image |
| `split-hero` | CSS background-image |
