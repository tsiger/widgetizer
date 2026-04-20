# Sparkhaus — Image Usage Map

Maps each image in `sparkhaus-images.json` to the page, widget, and block where it is assigned.

## Home (`templates/index.json`)

| Image | Size | Widget | Block / slot |
| --- | --- | --- | --- |
| `home-hero.jpg` | 1920×1072 | `hero` (banner) | background image |
| `before.jpg` | 1600×900 | `before_after` (comparison-slider) | "before" image |
| `after.jpg` | 1600×900 | `before_after` (comparison-slider) | "after" image |
| `clean-standard.jpg` | 1200×800 | `what_we_clean` (card-grid) | card 1 image |
| `clean-deep.jpg` | 1200×800 | `what_we_clean` (card-grid) | card 2 image |
| `clean-movein.jpg` | 1200×800 | `what_we_clean` (card-grid) | card 3 image |
| `clean-postconstruction.jpg` | 1200×800 | `what_we_clean` (card-grid) | card 4 image |

## Services (`templates/services.json`)

| Image | Size | Widget | Block / slot |
| --- | --- | --- | --- |
| `clean-standard.jpg` | 1200×800 | `clean_types` (image-tabs) | tab 1 image *(shared with home card-grid)* |
| `clean-deep.jpg` | 1200×800 | `clean_types` (image-tabs) | tab 2 image *(shared with home card-grid)* |
| `clean-movein.jpg` | 1200×800 | `clean_types` (image-tabs) | tab 3 image *(shared with home card-grid)* |
| `clean-postconstruction.jpg` | 1200×800 | `clean_types` (image-tabs) | tab 4 image *(shared with home card-grid)* |

## About (`templates/about.json`)

| Image | Size | Widget | Block / slot |
| --- | --- | --- | --- |
| `about-founder.jpg` | 800×592 | `opener` (image-text) | image |
| `about-credibility.jpg` | 800×800 | `credibility` (image-callout) | image |
| `team-amara.jpg` | 400×400 | `team` (profile-grid) | profile 1 avatar |
| `team-daniela.jpg` | 400×400 | `team` (profile-grid) | profile 2 avatar |
| `team-chris.jpg` | 400×400 | `team` (profile-grid) | profile 3 avatar |
| `team-tess.jpg` | 400×400 | `team` (profile-grid) | profile 4 avatar |

## Contact (`templates/contact.json`)

| Image | Size | Widget | Block / slot |
| --- | --- | --- | --- |
| `contact-opener.jpg` | 800×592 | `opener` (image-text) | image |

## Notes

- The four `clean-*.jpg` images are shared between the home `card-grid` and the services `image-tabs` — generate once, assign twice.
- `before.jpg` and `after.jpg` must match camera angle and lighting exactly (comparison-slider).
- Logos are handled separately via the process-doc Step 5, not listed here.
