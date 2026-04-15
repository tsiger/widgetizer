# Greenfield Preset — Image Usage Map

Preset templates live under `themes/arch/presets/greenfield/templates/`. File names and dimensions follow `docs-llms/preset-plans/greenfield-images.json`; assets in `temp/` use the same base names (all **`.jpg`**).

## Home (`index.json`)

| Image               | Size (plan) | Widget                             | Block / setting | Usage |
| ------------------- | ----------- | ---------------------------------- | --------------- | ----- |
| `hero-slide-1.jpg`  | 1920×1080   | `hero` (slideshow)                 | `slide-1`       | Hero slide 1 |
| `hero-slide-2.jpg`  | 1920×1080   | `hero` (slideshow)                 | `slide-2`       | Hero slide 2 |
| `hero-slide-3.jpg`  | 1920×1080   | `hero` (slideshow)                 | `slide-3`       | Hero slide 3 |
| `before-1.jpg`      | 800×500     | `before_after` (comparison-slider) | `before_image`  | Before — “See the Difference” |
| `after-1.jpg`       | 800×500     | `before_after` (comparison-slider) | `after_image`   | After — same slider |
| `home-team.jpg`     | 800×600     | `about_teaser` (image-text)        | —               | “About Greenfield” image (crew on site) |
| `testimonial-1.jpg` | 400×400     | `testimonials` (testimonials)      | `review-1`      | Avatar — Lisa & Mark D. |
| `testimonial-2.jpg` | 400×400     | `testimonials` (testimonials)      | `review-2`      | Avatar — Joan P. |
| `testimonial-3.jpg` | 400×400     | `testimonials` (testimonials)      | `review-3`      | Avatar — Robert A. |

`trust`, `services` (icon-card-grid), and `cta` have no image fields in the preset JSON.

## About (`about.json`)

| Image                  | Size (plan) | Widget                 | Block       | Usage |
| ---------------------- | ----------- | ---------------------- | ----------- | ----- |
| `about-team-group.jpg` | 1920×600    | `hero` (banner)        | —           | Page hero (team wide shot) |
| `about-founder.jpg`    | 800×600     | `story` (image-text)   | —           | “Our Story” — founder / designer |
| `team-1.jpg`           | 400×400     | `team` (profile-grid)  | `member-1`  | Dan Novak |
| `team-2.jpg`           | 400×400     | `team` (profile-grid)  | `member-2`  | Maria Santos |
| `team-3.jpg`           | 400×400     | `team` (profile-grid)  | `member-3`  | Tyler Kim |

`faq` and `cta` use no images in the preset.

## Services (`services.json`)

| Image                    | Size    | Widget                      | Block   | Usage (matches card) |
| ------------------------ | ------- | --------------------------- | ------- | -------------------- |
| `service-design.jpg`     | 800×600 | `services_grid` (card-grid) | `svc-1` | Landscape Design     |
| `service-hardscape.jpg`  | 800×600 | `services_grid` (card-grid) | `svc-2` | Patio & Hardscaping  |
| `service-lawn.jpg`       | 800×600 | `services_grid` (card-grid) | `svc-3` | Lawn Installation & Sodding |
| `service-trees.jpg`      | 800×600 | `services_grid` (card-grid) | `svc-4` | Tree & Shrub Care    |
| `service-seasonal.jpg`   | 800×600 | `services_grid` (card-grid) | `svc-5` | Seasonal Cleanup     |
| `service-irrigation.jpg` | 800×600 | `services_grid` (card-grid) | `svc-6` | Irrigation Systems   |
| `step-consult.jpg`       | 800×600 | `process` (steps)           | `step-1` | Consultation        |
| `step-design.jpg`        | 800×600 | `process` (steps)           | `step-2` | Design              |
| `step-install.jpg`       | 800×600 | `process` (steps)           | `step-3` | Installation        |
| `step-maintain.jpg`      | 800×600 | `process` (steps)           | `step-4` | Maintenance         |
| `why-us.jpg`             | 800×600 | `why_us` (image-text)       | —       | “Why Greenfield” section |

`hero` (banner) and `cta` ship with empty `image` in the preset — reuse e.g. **`hero-slide-1.jpg`** or **`service-design.jpg`** for the services hero if desired.

## Portfolio (`portfolio.json`)

| Image                 | Size    | Widget                          | Block    | Usage (matches project title) |
| --------------------- | ------- | ------------------------------- | -------- | --------------------------- |
| `project-courtyard.jpg` | 800×600 | `gallery` (project-showcase)  | `proj-1` | Modern Courtyard — Pearl District |
| `project-backyard.jpg`  | 800×600 | `gallery` (project-showcase)  | `proj-2` | Full Backyard Redesign — Alberta Arts |
| `project-firepit.jpg`   | 800×600 | `gallery` (project-showcase)  | `proj-3` | Patio & Fire Pit — Lake Oswego |
| `project-native.jpg`    | 800×600 | `gallery` (project-showcase)  | `proj-4` | Native Plant Garden — Sellwood |
| `project-commercial.jpg`| 800×600 | `gallery` (project-showcase)  | `proj-5` | Commercial Entry — Lloyd District |
| `project-retaining.jpg` | 800×600 | `gallery` (project-showcase)  | `proj-6` | Retaining Wall — West Hills |
| `before-2.jpg`        | 800×500 | `before_after` (comparison-slider) | `before_image` | Second transformation — before |
| `after-2.jpg`         | 800×500 | `before_after` (comparison-slider) | `after_image`  | Second transformation — after |

`hero` (banner) and `cta` have no images in the preset beyond the above.

## Contact (`contact.json`)

`hero` (banner) `image` is empty in the preset. `location` (map) and `faq` have no raster image fields.

## Comparison sliders

Images are set on the widget **`settings`**, not on child blocks:

- **Home** `before_after`: **`before_image`** = `before-1.jpg`, **`after_image`** = `after-1.jpg`
- **Portfolio** `before_after`: **`before_image`** = `before-2.jpg`, **`after_image`** = `after-2.jpg`

## Shared / reuse notes

- **`home-team.jpg`** is only used on Home (`about_teaser`); **`about-team-group.jpg`** is the wide About hero — different crops from the plan.
- **Secondary banners** (Services, Portfolio, Contact `hero`) — empty in JSON; reuse **`hero-slide-1.jpg`**, **`project-backyard.jpg`**, or **`about-team-group.jpg`** when assigning in the CMS.
- **`temp/`** — All **33** files in `greenfield-images.json` are present in `temp/` with matching names; no extra files to remove for this preset.
