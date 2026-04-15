# Ledgerworks Preset — Image Usage Map

Preset templates live under `themes/arch/presets/ledgerworks/templates/`. File names and dimensions follow `docs-llms/preset-plans/ledgerworks-images.json`; assets in `temp/` use the same base names (**`.jpg`** for photos, **`.png`** for logos).

## Home (`index.json`)

| Image            | Size     | Widget                          | Block      | Usage                                      |
| ---------------- | -------- | ------------------------------- | ---------- | ------------------------------------------ |
| `home-hero.jpg`  | 800×1000 | `hero` (split-hero)             | —          | Hero image column (office scene)           |
| `testimonial-1.jpg` | 400×400 | `testimonials` (testimonial-slider) | `review-1` | Avatar — Mark Davidson, Relay Software |
| `testimonial-2.jpg` | 400×400 | `testimonials` (testimonial-slider) | `review-2` | Avatar — Dr. Sarah Nguyen, Beacon Health |
| `testimonial-3.jpg` | 400×400 | `testimonials` (testimonial-slider) | `review-3` | Avatar — James Ortiz, Ortiz Properties |

`trust`, `stats`, `services` (icon-card-grid), `why_us` (split-content), and `cta` have no image fields in the preset JSON.

## About (`about.json`)

| Image               | Size     | Widget                 | Block       | Usage                          |
| ------------------- | -------- | ---------------------- | ----------- | ------------------------------ |
| `about-building.jpg`| 1920×600 | `intro` (banner)     | —           | Page hero (building exterior)  |
| `about-story.jpg`   | 800×600  | `story` (image-text)   | —           | “Our Story” image              |
| `team-1.jpg`        | 400×400  | `team` (profile-grid)  | `member-1`  | Karen Whitfield — photo        |
| `team-2.jpg`        | 400×400  | `team` (profile-grid)  | `member-2`  | Michael Torres — photo         |
| `team-3.jpg`        | 400×400  | `team` (profile-grid)  | `member-3`  | Priya Sharma — photo           |

`stats`, `faq`, and `cta` use no images in the preset.

## Services (`services.json`)

| Image                    | Size    | Widget                     | Block  | Usage (matches card title)        |
| ------------------------ | ------- | -------------------------- | ------ | --------------------------------- |
| `service-tax.jpg`        | 800×600 | `services_grid` (card-grid) | `svc-1` | Tax Planning & Preparation     |
| `service-bookkeeping.jpg`| 800×600 | `services_grid` (card-grid) | `svc-2` | Bookkeeping & Payroll          |
| `service-audit.jpg`      | 800×600 | `services_grid` (card-grid) | `svc-3` | Audit & Assurance              |
| `service-advisory.jpg`   | 800×600 | `services_grid` (card-grid) | `svc-4` | Business Advisory              |
| `service-cfo.jpg`        | 800×600 | `services_grid` (card-grid) | `svc-5` | CFO Services                   |
| `service-personal.jpg`   | 800×600 | `services_grid` (card-grid) | `svc-6` | Personal Finance               |
| `services-approach.jpg`  | 800×600 | `approach` (image-text)     | —      | “Our Approach” section image      |

`intro` (banner), `fit` (content-switcher), `process` (numbered-cards), and `cta` have no filled images in the preset. The `fit` widget has six `item` blocks with `image: ""` (optional per-item art — not listed in `ledgerworks-images.json`). The `intro` banner `image` is empty; reuse e.g. **`about-building.jpg`** if you want a photo hero.

## Industries (`work.json`, slug `work`)

| Image                      | Size    | Widget                  | Block    | Usage (logo / sector)                    |
| -------------------------- | ------- | ----------------------- | -------- | ---------------------------------------- |
| `logo-1.png`               | 200×80  | `logos` (logo-cloud)    | `logo-1` | Relay Software                           |
| `logo-2.png`               | 200×80  | `logos` (logo-cloud)    | `logo-2` | Beacon Health                          |
| `logo-3.png`               | 200×80  | `logos` (logo-cloud)    | `logo-3` | Ortiz Properties                       |
| `logo-4.png`               | 200×80  | `logos` (logo-cloud)    | `logo-4` | GreenLeaf Organics                     |
| `logo-5.png`               | 200×80  | `logos` (logo-cloud)    | `logo-5` | Atlas Nonprofit                        |
| `industry-tech.jpg`        | 800×600 | `industries` (card-grid) | `ind-1`  | Technology Startups                      |
| `industry-healthcare.jpg`  | 800×600 | `industries` (card-grid) | `ind-2`  | Healthcare Practices                   |
| `industry-realestate.jpg`  | 800×600 | `industries` (card-grid) | `ind-3`  | Real Estate                            |
| `industry-professional.jpg`| 800×600 | `industries` (card-grid) | `ind-4`  | Professional Services                  |
| `industry-ecommerce.jpg`   | 800×600 | `industries` (card-grid) | `ind-5`  | E-Commerce                             |
| `industry-nonprofit.jpg`   | 800×600 | `industries` (card-grid) | `ind-6`  | Nonprofit Organizations                |
| `testimonial-4.jpg`        | 400×400 | `testimonials` (testimonials) | `review-1` | Avatar — Amanda Chen                |
| `testimonial-5.jpg`        | 400×400 | `testimonials` (testimonials) | `review-2` | Avatar — David Ramirez              |
| `testimonial-6.jpg`        | 400×400 | `testimonials` (testimonials) | `review-3` | Avatar — Patricia Holmes            |

`intro` (banner) and `closing` (rich-text) use no images. The `intro` banner ships with `image: ""`; reuse **`about-building.jpg`** (or another plan file) if desired.

## Contact (`contact.json`)

No image fields beyond the `intro` banner, which is empty in the preset.

## Shared / reuse notes

- **`testimonial-1.jpg`–`testimonial-3.jpg`** — Home slider (`index`). **`testimonial-4.jpg`–`testimonial-6.jpg`** — Industries page (`work`) grid quotes; together they exhaust the six testimonial assets in the plan.
- **`home-hero.jpg`** — Used only on Home (`split-hero`). **`about-building.jpg`** — Natural reuse for secondary page banners (`intro` on Services, Industries, Contact, or About) when you add hero photos.
- **`content-switcher`** (`fit` on Services) — Six optional `image` fields; assign custom assets in the editor if needed — the JSON plan does not define separate files for those panels.
