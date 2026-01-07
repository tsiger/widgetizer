# Widget Standards Audit

Audit against [standards.md](file:///Users/tsiger/Playground/widgetizer/docs/standards.md).

---

## Issues Found

### Missing `data-setting` Attributes

These widgets are missing `data-setting="..."` on editable elements:

| Widget              | Issue                                                               |
| ------------------- | ------------------------------------------------------------------- |
| `comparison-slider` | 0 data-setting attributes (header elements not connected to editor) |
| `podcast-player`    | 0 data-setting attributes (header elements not connected to editor) |
| `video`             | 0 data-setting attributes (header elements not connected to editor) |
| `video-embed`       | 0 data-setting attributes (header elements not connected to editor) |

**Fix:** Add `data-setting="eyebrow"`, `data-setting="title"`, `data-setting="description"` to header elements.

---

## Standardization Completed

### Background Setting (Rule 6)

All widgets now have background setting at end of schema ✅

**Widgets standardized in this session:**

- `embed` - Added background, updated liquid
- `image-callout` - Added background, updated liquid
- `image-hotspots` - Added background, updated liquid
- `job-listing` - Added background, updated liquid
- `map` - Added background, updated liquid
- `podcast-player` - Added background, updated liquid
- `newsletter` - Moved background to end

---

## Compliant Widgets

These widgets pass all applicable standards:

accordion, alternating-rows, bento-grid, card-grid, comparison-table, contact-form, content-switcher, countdown, embed, event-list, feature-grid, featured-cards, gallery, image-callout, image-hotspots, image-tabs, image-text, job-listing, key-figures, logo-cloud, map, masonry-gallery, newsletter, numbered-cards, priced-list, pricing, profile-grid, project-showcase, schedule-table, social-icons, testimonials, timeline

---

## Skip (Special Cases)

| Widget      | Reason                                    |
| ----------- | ----------------------------------------- |
| `banner`    | Hero widget with custom background system |
| `slideshow` | Hero widget with per-slide backgrounds    |
| `styles`    | Internal design system showcase           |
| `global/`   | Header/footer - different pattern         |
