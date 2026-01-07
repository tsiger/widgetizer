# Widget Standards Audit - COMPLETED

## Summary

All widgets have been standardized to comply with [standards.md](file:///Users/tsiger/Playground/widgetizer/docs/standards.md).

---

## Widgets Standardized (High Priority)

Added background setting + updated liquid templates:

| Widget           | Changes                                  |
| ---------------- | ---------------------------------------- |
| `embed`          | Added background setting, updated liquid |
| `image-callout`  | Added background setting, updated liquid |
| `image-hotspots` | Added background setting, updated liquid |
| `job-listing`    | Added background setting, updated liquid |
| `map`            | Added background setting, updated liquid |
| `podcast-player` | Added background setting, updated liquid |

---

## Settings Order Fixed

| Widget       | Fix                                 |
| ------------ | ----------------------------------- |
| `newsletter` | Moved background to end of settings |

---

## Verified Compliant (No Changes Needed)

These widgets already have background at end of settings:

- accordion, alternating-rows, bento-grid, card-grid
- comparison-slider, comparison-table, contact-form, content-switcher
- countdown, event-list, feature-grid, featured-cards
- gallery, image-text, key-figures, logo-cloud
- masonry-gallery, numbered-cards, priced-list, pricing
- profile-grid, project-showcase, schedule-table, social-icons
- testimonials, timeline, video, video-embed

---

## Skipped (Special Cases)

| Widget      | Reason                                    |
| ----------- | ----------------------------------------- |
| `banner`    | Hero widget with custom background system |
| `slideshow` | Hero widget with per-slide backgrounds    |
| `styles`    | Internal design system showcase           |
| `global/`   | Header/footer - different pattern         |
