# Keystoned Preset — Image Usage Map

Preset templates live under `themes/arch/presets/keystoned/templates/`. File names and dimensions follow `docs-llms/preset-plans/keystoned-images.json`; generated assets in `temp/` use the same base names (all **`.jpg`** in the plan).

## Home (`index.json`)

| Image               | Size       | Widget                    | Block      | Usage                                      |
| ------------------- | ---------- | ------------------------- | ---------- | ------------------------------------------ |
| `hero-slide-1.jpg`  | 1920×1080  | `hero` (slideshow)        | `slide-1`  | Beacon Hill listing hero slide             |
| `hero-slide-2.jpg`  | 1920×1080  | `hero` (slideshow)        | `slide-2`  | Back Bay listing hero slide                |
| `hero-slide-3.jpg`  | 1920×1080  | `hero` (slideshow)        | `slide-3`  | South End listing hero slide               |
| `listing-1.jpg`     | 800×600    | `listings` (card-grid)    | `prop-1`   | 42 Beacon St — card image                  |
| `listing-2.jpg`     | 800×600    | `listings` (card-grid)    | `prop-2`   | 7 Rutland Square — card image              |
| `listing-3.jpg`     | 800×600    | `listings` (card-grid)    | `prop-3`   | 18 Brattle St — card image                 |
| `agent-portrait.jpg`| 800×600    | `agent` (image-text)      | —          | Sarah Caldwell — environmental portrait    |
| `testimonial-1.jpg` | 400×400    | `testimonials` (testimonials) | `review-1` | Avatar — Daniel & Maria K.             |
| `testimonial-2.jpg` | 400×400    | `testimonials` (testimonials) | `review-2` | Avatar — Robert H.                     |
| `testimonial-3.jpg` | 400×400    | `testimonials` (testimonials) | `review-3` | Avatar — Jessica T.                    |

`trust`, `buyer_seller` (icon-card-grid), and `cta` have no image fields in the preset JSON.

## About (`about.json`)

| Image                 | Size    | Widget                             | Block      | Usage                         |
| --------------------- | ------- | ---------------------------------- | ---------- | ----------------------------- |
| `agent-headshot.jpg`  | 400×400 | `story` (image-text)               | —          | “Meet Sarah” main image       |
| `testimonial-1.jpg`   | 400×400 | `testimonials` (testimonial-slider) | `review-1` | Avatar — Margaret & Paul D.   |
| `testimonial-2.jpg`   | 400×400 | `testimonials` (testimonial-slider) | `review-2` | Avatar — Michael T.           |
| `testimonial-3.jpg`   | 400×400 | `testimonials` (testimonial-slider) | `review-3` | Avatar — Anthony R.           |
| `testimonial-4.jpg`   | 400×400 | `testimonials` (testimonial-slider) | `review-4` | Avatar — Priya & James L.     |

`stats`, `faq`, and `cta` use no images. The plan includes only four testimonial portraits; **Home** uses `testimonial-1`–`3` and **About** uses all **four** — expect **reuse** of the same files for `review-1`–`review-3` on both pages unless you replace them with unique assets in the CMS.

## Properties (`properties.json`)

| Image           | Size    | Widget                         | Block    | Usage (matches listing title)        |
| --------------- | ------- | ------------------------------ | -------- | ------------------------------------ |
| `listing-1.jpg` | 800×600 | `listings` (project-showcase)  | `prop-1` | 42 Beacon St, Beacon Hill            |
| `listing-2.jpg` | 800×600 | `listings` (project-showcase)  | `prop-2` | 185 Commonwealth Ave, Back Bay       |
| `listing-3.jpg` | 800×600 | `listings` (project-showcase)  | `prop-3` | 7 Rutland Square, South End          |
| `listing-4.jpg` | 800×600 | `listings` (project-showcase)  | `prop-4` | 18 Brattle St, Cambridge             |
| `listing-5.jpg` | 800×600 | `listings` (project-showcase)  | `prop-5` | 340 Harvard St, Brookline            |
| `listing-6.jpg` | 800×600 | `listings` (project-showcase)  | `prop-6` | 52 Pearl St, Somerville              |

`hero` (banner) and `stats` / `cta` have no images in the preset. The properties page **`hero`** `image` is empty — reuse e.g. **`hero-slide-1.jpg`** or **`listing-1.jpg`** if you want a banner photo.

## Neighborhoods (`neighborhoods.json`)

| Image                         | Size    | Widget                    | Block   | Usage              |
| ----------------------------- | ------- | ------------------------- | ------- | ------------------ |
| `neighborhood-beacon-hill.jpg`| 800×600 | `areas` (card-grid)       | `area-1` | Beacon Hill      |
| `neighborhood-back-bay.jpg`   | 800×600 | `areas` (card-grid)       | `area-2` | Back Bay         |
| `neighborhood-south-end.jpg`  | 800×600 | `areas` (card-grid)       | `area-3` | South End        |
| `neighborhood-cambridge.jpg`  | 800×600 | `areas` (card-grid)       | `area-4` | Cambridge        |
| `neighborhood-brookline.jpg`    | 800×600 | `areas` (card-grid)       | `area-5` | Brookline        |
| `neighborhood-somerville.jpg` | 800×600 | `areas` (card-grid)       | `area-6` | Somerville       |
| `callout-expertise.jpg`       | 800×600 | `expertise` (image-callout) | —      | Local knowledge callout image |
| `testimonial-*.jpg`          | 400×400 | `testimonials` (testimonials) | `review-1`, `review-2` | Avatars — Emily & James W.; Patricia M. (pick **two** of the four plan files; repeats expected) |

`hero` (banner) and `cta` use no images beyond the above. Only **four** testimonial files exist in the plan for **nine** quote blocks site-wide; reuse or add portraits in the CMS as needed.

## Buyers & Sellers (`guides.json`, slug `guides`)

| Image               | Size    | Widget              | Block   | Usage                         |
| ------------------- | ------- | ------------------- | ------- | ----------------------------- |
| `buyers-tour.jpg`   | 800×600 | `buyers` (image-text)  | —    | “For Buyers” section          |
| `sellers-staging.jpg` | 800×600 | `sellers` (image-text) | —  | “For Sellers” section         |
| `step-consult.jpg`  | 800×600 | `process` (steps)   | `step-1` | Consultation step image       |
| `step-strategy.jpg` | 800×600 | `process` (steps)   | `step-2` | Strategy step image         |
| `step-execute.jpg`  | 800×600 | `process` (steps)   | `step-3` | Execute step image           |
| `step-close.jpg`    | 800×600 | `process` (steps)   | `step-4` | Close step image             |

`intro` (split-content) and `cta` have no images in the preset.

## Contact (`contact.json`)

No image fields (`intro` is features-split; `location` is map; `faq` is accordion).

## Shared / reuse notes

- **Listings** — `listing-1`–`listing-3` appear on **Home** (featured trio) and again on **Properties** (full grid). Same filenames, two widgets.
- **`agent-portrait.jpg`** — Home agent section; **`agent-headshot.jpg`** — About story (distinct crops from the plan).
- **Testimonials** — Only **`testimonial-1.jpg`–`testimonial-4.jpg`** exist in the plan for **nine** quote blocks across Home (3), About (4), and Neighborhoods (2). Map the four files to the highest-traffic blocks first, reuse avatars elsewhere, or add more assets for unique faces per quote.
- **Empty heroes** — Properties and Neighborhoods **`intro`** banners ship with `image: ""`; reuse a **`hero-slide-*.jpg`** or **`listing-1.jpg`** when assigning in the CMS.
