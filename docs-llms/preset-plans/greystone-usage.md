# Greystone Preset — Image Usage Map

Preset templates live under `themes/arch/presets/greystone/templates/`. File names and dimensions follow `docs-llms/preset-plans/greystone-images.json`; assets in `temp/` use **`.jpg`** with the same base names.

## Home (`index.json`)

| Image                 | Size      | Widget               | Block      | Usage                                              |
| --------------------- | --------- | -------------------- | ---------- | -------------------------------------------------- |
| `home-hero.jpg`       | 1920×1080 | `hero` (banner)      | —          | Full-width hero background                         |
| `home-firm-interior.jpg` | 800×600  | `about_teaser` (image-text) | —    | “About the Firm” image column                      |
| `testimonial-1.jpg` | 400×400   | `testimonials` (testimonials) | `review-1` | Avatar — Margaret L.                          |
| `testimonial-2.jpg` | 400×400   | `testimonials` (testimonials) | `review-2` | Avatar — David H.                             |

`trust_strip`, `practice_areas` (features-split), `stats`, and `cta` have no image fields in the preset JSON.

## About (`about.json`)

| Image                 | Size      | Widget            | Block   | Usage                                |
| --------------------- | --------- | ----------------- | ------- | ------------------------------------ |
| `about-building.jpg`  | 1920×600  | `hero` (banner)   | —       | Page hero (building exterior)        |
| `about-firm-story.jpg`| 800×600   | `story` (image-text) | —    | “Our History” / firm story image     |
| `attorney-1.jpg`      | 400×400   | `team` (profile-grid) | `atty-1` | Richard Greystone — photo         |
| `attorney-2.jpg`      | 400×400   | `team` (profile-grid) | `atty-2` | Catherine Park — photo            |
| `attorney-3.jpg`      | 400×400   | `team` (profile-grid) | `atty-3` | James Whitfield — photo           |

`history` (timeline), `approach` (accordion), and `cta` use no images in the preset.

## Practice Areas (`services.json`)

| Image                         | Size    | Widget                      | Block  | Usage (card matches practice area) |
| ----------------------------- | ------- | --------------------------- | ------ | -------------------------------- |
| `service-business-litigation.jpg` | 800×600 | `services_grid` (card-grid) | `svc-1` | Business Litigation           |
| `service-estate-planning.jpg` | 800×600 | `services_grid` (card-grid) | `svc-2` | Estate Planning              |
| `service-real-estate.jpg`     | 800×600 | `services_grid` (card-grid) | `svc-3` | Real Estate Law              |
| `service-family-law.jpg`      | 800×600 | `services_grid` (card-grid) | `svc-4` | Family Law                   |
| `service-employment.jpg`      | 800×600 | `services_grid` (card-grid) | `svc-5` | Employment Law               |
| `service-personal-injury.jpg` | 800×600 | `services_grid` (card-grid) | `svc-6` | Personal Injury              |
| `home-firm-interior.jpg`      | 800×600 | `why_greystone` (image-text) | —      | “Why Greystone” section image (reuse from home) |

`hero` (banner), `process` (numbered-cards), and `cta` have no images in the plan. The `hero` widget’s `image` is empty in the preset; assign a banner asset separately (e.g. reuse `about-building.jpg`) if desired.

## Case Results (`work.json`)

| Image            | Size    | Widget                   | Block    | Usage                         |
| ---------------- | ------- | ------------------------ | -------- | ----------------------------- |
| `case-1.jpg`     | 800×600 | `showcase` (project-showcase) | `case-1` | $2.4M Business Dispute…   |
| `case-2.jpg`     | 800×600 | `showcase` (project-showcase) | `case-2` | Commercial Lease Negotiation |
| `case-3.jpg`     | 800×600 | `showcase` (project-showcase) | `case-3` | Partnership Dissolution      |
| `case-4.jpg`     | 800×600 | `showcase` (project-showcase) | `case-4` | Residential Property Defense |
| `case-5.jpg`     | 800×600 | `showcase` (project-showcase) | `case-5` | Estate Dispute Mediation     |
| `case-6.jpg`     | 800×600 | `showcase` (project-showcase) | `case-6` | Employment Discrimination…   |
| `testimonial-3.jpg` | 400×400 | `testimonials` (testimonials) | `review-1` | Avatar — Robert K.      |
| `testimonial-4.jpg` | 400×400 | `testimonials` (testimonials) | `review-2` | Avatar — Susan M.       |
| `testimonial-5.jpg` | 400×400 | `testimonials` (testimonials) | `review-3` | Avatar — Thomas R.      |

`hero` (banner), `stats`, and `closing` (rich-text) have no images in the preset. The `hero` widget’s `image` is empty; reuse a banner (e.g. `about-building.jpg`) if needed.

## Contact (`contact.json`)

No image fields in the preset JSON. `hero` banner `image` is empty.

## Shared / reuse notes

- **`home-firm-interior.jpg`** — Used on Home (`about_teaser`) and recommended for Services (`why_greystone`) so the interior matches the “firm” story without a sixth unique stock in the plan.
- **`testimonial-1.jpg`–`testimonial-5.jpg`** — Home uses `1`–`2`; Case Results uses `3`–`5` for the three quote blocks there.
- **Secondary banners** — `services`, `work`, and `contact` page `hero` banners ship with `image: ""`; `greystone-images.json` does not define separate hero files for those routes. Reuse **`about-building.jpg`** (or another plan file) when filling them in the CMS.
