# Corkwell Preset — Image Usage Map

Preset templates live under `themes/arch/presets/corkwell/templates/`. File names and sizes follow `docs-llms/preset-plans/corkwell-images.json`; assets in `temp/` use the same **`.jpg`** names (25 files — full set).

## Home (`index.json`)

| Image                 | Size      | Widget                              | Block      | Usage |
| --------------------- | --------- | ----------------------------------- | ---------- | ----- |
| `home-hero.jpg`       | 1920×1080 | `hero` (video-popup)                | —          | Poster / cover image for “Inside Corkwell” (the widget uses a video URL; assign this as the visual background or thumbnail in the editor). |
| `checker-wine.jpg`    | 800×800   | `what_we_pour` (checkerboard)      | `checker-2`| Image tile — Natural Wine column (card `checker-1` is copy; `checker-2` is the empty title/description image slot). |
| `checker-cocktails.jpg` | 800×800 | `what_we_pour` (checkerboard)    | `checker-4`| Image tile — Cocktails column (same pattern: `checker-3` copy, `checker-4` image). |
| `space-callout.jpg`   | 800×600   | `space_callout` (image-callout)     | —          | “A Place to Linger” section |

`intro`, `featured`, and `cta` have no image fields in the preset JSON.

## About (`about.json`)

| Image                | Size     | Widget                | Block       | Usage |
| -------------------- | -------- | --------------------- | ----------- | ----- |
| `about-hero.jpg`     | 1920×600 | `hero` (banner)       | —           | Page hero (storefront exterior) |
| `founders-story.jpg` | 800×600  | `story` (image-text)  | —           | “Our Story” — Nico & Jules |
| `team-nico.jpg`      | 400×400  | `founders` (profile-grid) | `profile-1` | Nico Ferrara |
| `team-jules.jpg`     | 400×400  | `founders` (profile-grid) | `profile-2` | Jules Moreau |
| `wine-farming.jpg`   | 800×600  | `sourcing` (image-text) | —         | “Wine Is Farming” / producers |

`philosophy` (icon list) and `cta` use no images in the preset.

## Menu (`menu.json`)

| Image           | Size     | Widget          | Block | Usage |
| --------------- | -------- | --------------- | ----- | ----- |
| `menu-hero.jpg` | 1920×600 | `hero` (banner) | —     | Page hero (overhead cocktails) |

`cocktails`, `wine`, `small_plates`, `desserts`, and `cta` are text lists without per-item images in the preset JSON.

## Gallery (`gallery.json`)

| Image                  | Size     | Widget                      | Block    | Usage (matches caption)        |
| ---------------------- | -------- | --------------------------- | -------- | ------------------------------ |
| `gallery-hero.jpg`     | 1920×600 | `hero` (banner)             | —        | Page hero (wine pour)        |
| `drinks-negroni.jpg`   | 800×800  | `drinks_gallery` (gallery)  | `drink-1` | Corkwell Negroni            |
| `drinks-wine-glass.jpg`| 800×800  | `drinks_gallery` (gallery)  | `drink-2` | Orange wine, skin-contact   |
| `drinks-martini.jpg`   | 800×800  | `drinks_gallery` (gallery)  | `drink-3` | Dirty martini               |
| `drinks-old-fashioned.jpg` | 800×800 | `drinks_gallery` (gallery) | `drink-4` | Smoked old fashioned        |
| `drinks-spritz.jpg`    | 800×800  | `drinks_gallery` (gallery)  | `drink-5` | Aperol spritz               |
| `drinks-highball.jpg`  | 800×800  | `drinks_gallery` (gallery)  | `drink-6` | Garden highball             |
| `space-bar-counter.jpg`| 800×600  | `space_gallery` (gallery)   | `space-1` | The bar                     |
| `space-wine-wall.jpg`  | 800×600  | `space_gallery` (gallery)   | `space-2` | Wine wall                   |
| `space-seating.jpg`    | 800×600  | `space_gallery` (gallery)   | `space-3` | Table seating               |
| `space-detail-candle.jpg` | 800×600 | `space_gallery` (gallery) | `space-4` | Candlelight details         |
| `space-chalkboard.jpg` | 800×600  | `space_gallery` (gallery)   | `space-5` | The chalkboard              |
| `space-entrance.jpg`   | 800×600  | `space_gallery` (gallery)   | `space-6` | The entrance                |

## Events (`events.json`)

| Image              | Size     | Widget                    | Block | Usage |
| ------------------ | -------- | ------------------------- | ----- | ----- |
| `events-hero.jpg`  | 1920×600 | `hero` (banner)           | —     | Page hero (tasting setup) |
| `private-hire.jpg` | 800×600  | `private_hire` (image-callout) | — | “Book the Bar” private events |

`next_tasting`, `regulars`, and `cta` have no image fields in the preset JSON.

## Contact (`contact.json`)

No images (intro, map, FAQ only).
