# Crumbly Preset — Image Usage Map

Preset templates live under `themes/arch/presets/crumbly/templates/`. Sizes and prompts for generated assets are in `crumbly-images.json`; the **sliding-panels** row uses a second plan file, `crumbly-images-2.json` (`panel-bread`, `panel-pastries`, `panel-cakes`, `panel-cookies` — **800×1000**).

Files below match **`temp/`** as currently present (`.jpg`). The four `panel-*.jpg` files are defined in `crumbly-images-2.json` but are **not** in `temp/` yet — generate them before assigning media to `categories` / `panel-1`–`panel-4`.

## Home (`index.json`)

| Image                    | Size      | Widget                     | Block      | Usage                                      |
| ------------------------ | --------- | -------------------------- | ---------- | ------------------------------------------ |
| `slide-1.jpg`            | 1920×1080 | `hero` (slideshow)         | `slide-1`  | “Baked Fresh Every Morning” slide          |
| `slide-2.jpg`            | 1920×1080 | `hero` (slideshow)         | `slide-2`  | “Custom Cakes for Every Occasion” slide    |
| `panel-bread.jpg`        | 800×1000  | `categories` (sliding-panels) | `panel-1` | Sourdough & Bread panel *(see note)*      |
| `panel-pastries.jpg`     | 800×1000  | `categories` (sliding-panels) | `panel-2` | Pastries panel *(see note)*               |
| `panel-cakes.jpg`        | 800×1000  | `categories` (sliding-panels) | `panel-3` | Cakes & Celebrations panel *(see note)*   |
| `panel-cookies.jpg`      | 800×1000  | `categories` (sliding-panels) | `panel-4` | Cookies & Treats panel *(see note)*       |
| `cake-teaser.jpg`        | 800×600   | `cake_teaser` (image-callout) | —       | Custom cakes callout (piping buttercream)  |
| `testimonial-couple.jpg` | 800×800   | `testimonial` (testimonial-hero) | —    | Quote / testimonial side image             |
| `bake-sourdough.jpg`     | 800×800   | `recent_bakes` (project-showcase) | `bake-1` | Classic Sourdough                         |
| `bake-croissants.jpg`    | 800×800   | `recent_bakes` (project-showcase) | `bake-2` | Almond Croissants                        |
| `bake-lemon-cake.jpg`    | 800×800   | `recent_bakes` (project-showcase) | `bake-3` | Lemon Layer Cake                          |
| `bake-cookies.jpg`       | 800×800   | `recent_bakes` (project-showcase) | `bake-4` | Chocolate Chip Cookies                    |

`trust_bar` and `cta` have no image fields in the preset JSON.

*\*Note: `panel-*.jpg` are listed for widget `panel-1`–`panel-4` but are only in `crumbly-images-2.json` until you add them to `temp/`.*

## About (`about.json`)

| Image              | Size     | Widget                 | Block       | Usage                          |
| ------------------ | -------- | ---------------------- | ----------- | ------------------------------ |
| `about-hero.jpg`   | 1920×600 | `about_hero` (banner)  | —           | Page hero (storefront)         |
| `about-founder.jpg`| 800×600  | `origin` (image-text)  | —           | “How It Started” / Nina’s story |
| `team-nina.jpg`    | 400×400  | `team` (profile-grid)  | `profile-1` | Nina Kowalski                  |
| `team-jordan.jpg`  | 400×400  | `team` (profile-grid)  | `profile-2` | Jordan Bell                    |
| `team-priya.jpg`   | 400×400  | `team` (profile-grid)  | `profile-3` | Priya Sharma                   |

`values`, `stats`, and `about_cta` use no images in the preset.

## Menu (`menu.json`)

| Image              | Size     | Widget                   | Block | Usage                         |
| ------------------ | -------- | ------------------------ | ----- | ----------------------------- |
| `menu-hero.jpg`    | 1920×600 | `menu_hero` (banner)     | —     | Page hero (display case)      |
| `custom-orders.jpg`| 800×600  | `custom_cta` (image-text)| —     | Custom orders / catering CTA  |

`breads`, `pastries`, `cakes`, and `cookies` are priced lists without per-item images in the preset JSON.

## Custom Cakes (`custom-cakes.json`)

| Image               | Size     | Widget                    | Block       | Usage (matches caption)              |
| ------------------- | -------- | ------------------------- | ----------- | ------------------------------------ |
| `cakes-hero.jpg`    | 1920×600 | `cakes_hero` (banner)     | —           | Page hero                            |
| `cake-wedding.jpg`  | 600×800  | `cake_gallery` (gallery)  | `cake-img-1` | Three-tier wedding / wildflowers    |
| `cake-chocolate.jpg`| 600×800  | `cake_gallery` (gallery)  | `cake-img-2` | Chocolate birthday / ganache        |
| `cake-naked.jpg`    | 600×800  | `cake_gallery` (gallery)  | `cake-img-3` | Naked cake / berries                |
| `cake-pastel.jpg`   | 600×800  | `cake_gallery` (gallery)  | `cake-img-4` | Pastel baby shower                 |
| `cake-lemon.jpg`    | 600×800  | `cake_gallery` (gallery)  | `cake-img-5` | Lemon drizzle                       |
| `cake-geometric.jpg`| 600×800  | `cake_gallery` (gallery)  | `cake-img-6` | Geometric fondant anniversary       |

`process`, `options`, and `cakes_cta` have no image fields in the preset JSON.

## Gallery (`gallery.json`)

| Image                   | Size       | Widget                      | Block      | Usage (matches caption / bento label) |
| ----------------------- | ---------- | --------------------------- | ---------- | ------------------------------------- |
| `gallery-hero.jpg`      | 1920×600   | `gallery_hero` (banner)     | —          | Page hero                             |
| `bento-sourdough.jpg`   | 1200×1200  | `bakes` (bento-grid)        | `bento-hero` | Sourdough (large 2×2 cell)         |
| `bento-croissants.jpg`  | 800×600    | `bakes` (bento-grid)        | `bento-2`  | Croissants                           |
| `bento-cinnamon.jpg`    | 800×600    | `bakes` (bento-grid)        | `bento-3`  | Cinnamon Rolls                       |
| `bento-cakes.jpg`       | 800×600    | `bakes` (bento-grid)        | `bento-4`  | Layer Cakes                          |
| `bento-cookies.jpg`     | 800×600    | `bakes` (bento-grid)        | `bento-5`  | Cookies & Bars                       |
| `space-display.jpg`     | 800×600    | `bakery_gallery` (gallery)  | `space-1`  | The display case                     |
| `space-shaping.jpg`     | 800×600    | `bakery_gallery` (gallery)  | `space-2`  | Dough shaping                        |
| `space-oven.jpg`        | 800×600    | `bakery_gallery` (gallery)  | `space-3`  | Our deck oven                        |
| `space-cafe.jpg`        | 800×600    | `bakery_gallery` (gallery)  | `space-4`  | Café seating                         |
| `space-hands.jpg`       | 800×600    | `bakery_gallery` (gallery)  | `space-5`  | Flour-dusted hands                   |
| `space-bread-wall.jpg`  | 800×600    | `bakery_gallery` (gallery)  | `space-6`  | The bread wall                       |

`events` (classes & events list) has no images in the preset JSON.

## Contact (`contact.json`)

| Image              | Size     | Widget                      | Block | Usage                              |
| ------------------ | -------- | --------------------------- | ----- | ---------------------------------- |
| `contact-cakes.jpg`| 800×600  | `custom_orders` (image-callout) | — | Custom cake inquiries (box / ribbon) |

`contact_intro` and `contact_map` use no raster images in the preset (map is configured by address).
