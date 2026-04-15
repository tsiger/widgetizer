# Brewline Preset — Image Usage Map

Preset templates live under `themes/arch/presets/brewline/templates/`. File names and sizes follow `docs-llms/preset-plans/brewline-images.json`; assets in `temp/` use **`.jpg`** with the same base names.

## Home (`index.json`)

| Image               | Size      | Widget                   | Block    | Usage                                    |
| ------------------- | --------- | ------------------------ | -------- | ---------------------------------------- |
| `home-hero.jpg`     | 1200×900  | `hero` (split-hero)      | —        | Hero image column (latte pour)           |
| `intro-sourcing.jpg`| 800×600   | `intro` (image-callout)  | —        | “From Bean to Cup” sourcing callout      |
| `tab-espresso.jpg`  | 800×600   | `drinks` (image-tabs)    | `tab-1`  | Espresso tab                             |
| `tab-pourover.jpg`  | 800×600   | `drinks` (image-tabs)    | `tab-2`  | Pour Over tab                            |
| `tab-coldbrew.jpg`  | 800×600   | `drinks` (image-tabs)    | `tab-3`  | Cold Brew tab                            |
| `tab-seasonal.jpg`  | 800×600   | `drinks` (image-tabs)    | `tab-4`  | Seasonal Specials tab                    |

`marquee`, `testimonials`, and `cta` have no image fields in the preset JSON.

## About (`about.json`)

| Image              | Size     | Widget                    | Block    | Usage                                |
| ------------------ | -------- | ------------------------- | -------- | ------------------------------------ |
| `about-hero.jpg`   | 1920×600 | `about_hero` (banner)     | —        | Page hero (beans / roastery texture) |
| `about-founder.jpg`| 800×600  | `origin` (image-text)     | —        | “How It Started” / founder story     |
| `step-source.jpg`  | 800×600  | `process` (steps)         | `step-1` | Source step                          |
| `step-roast.jpg`   | 800×600  | `process` (steps)         | `step-2` | Roast step                           |
| `step-dialin.jpg`  | 800×600  | `process` (steps)         | `step-3` | Dial In step                         |
| `step-serve.jpg`   | 800×600  | `process` (steps)         | `step-4` | Serve step                           |
| `team-sam.jpg`     | 400×400  | `team` (team-highlight)   | `member-1` | Sam Chen                          |
| `team-maya.jpg`    | 400×400  | `team` (team-highlight)   | `member-2` | Maya Torres                       |
| `team-kai.jpg`     | 400×400  | `team` (team-highlight)   | `member-3` | Kai Okonkwo                       |
| `team-lena.jpg`    | 400×400  | `team` (team-highlight)   | `member-4` | Lena Bergström                    |

`stats` and `about_cta` use no images in the preset.

## Menu (`menu.json`)

| Image             | Size     | Widget                 | Block | Usage                         |
| ----------------- | -------- | ---------------------- | ----- | ----------------------------- |
| `menu-hero.jpg`   | 1920×600 | `menu_hero` (banner)   | —     | Page hero (overhead bar spread) |
| `retail-beans.jpg`| 800×600  | `retail` (image-text)  | —     | Whole Bean & Retail section   |

`coffee`, `seasonal`, `pastries`, and `menu_cta` have no per-item images in the preset JSON.

## Gallery (`gallery.json`)

| Image                    | Size      | Widget                       | Block    | Usage (matches caption)            |
| ------------------------ | --------- | ---------------------------- | -------- | ---------------------------------- |
| `gallery-hero.jpg`       | 1920×600  | `gallery_hero` (banner)      | —        | Page hero                          |
| `gallery-pourover.jpg`   | 800×600   | `coffee_gallery` (gallery) | `img-1`  | Morning pour over ritual           |
| `gallery-latteart.jpg`   | 800×600   | `coffee_gallery` (gallery) | `img-2`  | Latte art in progress              |
| `gallery-espresso.jpg`   | 800×600   | `coffee_gallery` (gallery) | `img-3`  | Single-origin espresso             |
| `gallery-coldbrew-tap.jpg` | 800×600 | `coffee_gallery` (gallery) | `img-4`  | Cold brew on tap                   |
| `gallery-roasting.jpg`   | 800×600   | `coffee_gallery` (gallery) | `img-5`  | Fresh roast cooling                |
| `gallery-lavender.jpg`   | 800×600   | `coffee_gallery` (gallery) | `img-6`  | Seasonal lavender latte            |
| `space-counter.jpg`      | 800×600   | `space_gallery` (masonry)    | `space-1` | The counter                       |
| `space-window.jpg`       | 800×1000  | `space_gallery` (masonry)    | `space-2` | Window seating                    |
| `space-roaster.jpg`      | 800×800   | `space_gallery` (masonry)    | `space-3` | The roaster                       |
| `space-patio.jpg`        | 800×600   | `space_gallery` (masonry)    | `space-4` | Back patio                        |
| `space-community-table.jpg` | 800×800 | `space_gallery` (masonry)    | `space-5` | Community table                   |
| `space-beans-wall.jpg`   | 800×600   | `space_gallery` (masonry)    | `space-6` | Bean display wall                 |
| `community.jpg`          | 800×600   | `community` (image-text)     | —        | “More Than a Coffee Shop” section  |

## Contact (`contact.json`)

No images.
