# Saffron Preset — Image Usage Map

Preset templates live under `themes/arch/presets/saffron/templates/`. Generated assets under `temp/` use **`.webp`** filenames that match the base names in `saffron-images.json` (same stems as the `.jpg` entries there). When wiring media in the app, pick the file you actually have imported (e.g. `home-hero.webp`).

| File in `temp/`    | Typical size (from plan) | Intended use |
| ------------------ | ------------------------ | ------------ |
| `*-hero.webp`      | 1920×1080 or 1920×600    | Page heroes (banner widgets) |
| Other scenes/food  | 800×600 – 800×1000       | Callouts, gallery, bar, etc. |
| `team-*.webp`      | 400×400                  | About team headshots |

**Note:** `team-marco.jpg` in the generation plan corresponds to `temp/team-marc.webp` — rename to `team-marco.webp` if you want the filename to match the preset character name “Marco.”

## Home (`index.json`)

| Image                      | Size      | Widget                         | Block       | Usage                          |
| -------------------------- | --------- | ------------------------------ | ----------- | ------------------------------ |
| `home-hero.webp`           | 1920×1080 | `hero_banner` (banner)         | —           | Background image               |
| `experience-callout.webp`  | 800×600   | `experience_callout` (image-callout) | —     | Callout image (dining room scene) |

`intro_section`, `featured_dishes`, `testimonials`, and `cta_banner` have no image fields in the preset JSON (text / list / quotes only).

## About (`about.json`)

| Image               | Size      | Widget                       | Block       | Usage                         |
| ------------------- | --------- | ---------------------------- | ----------- | ----------------------------- |
| `about-hero.webp`   | 1920×600  | `about_hero` (banner)        | —           | Background image              |
| `founders.webp`     | 800×600   | `founders_story` (image-text) | —         | Section image (Marco & Elena) |
| `philosophy.webp`   | 800×600   | `philosophy` (image-callout)  | —         | Callout image (farm produce)  |
| `team-marc.webp`    | 400×400   | `team` (profile-grid)        | `profile-1` | Marco Reyes headshot          |
| `team-elena.webp`   | 400×400   | `team` (profile-grid)        | `profile-2` | Elena Reyes headshot          |
| `team-aisha.webp`   | 400×400   | `team` (profile-grid)        | `profile-3` | Aisha Okafor headshot         |

`key_figures` and `about_cta` use no images in the preset.

## Menu (`menu.json`)

| Image             | Size     | Widget                     | Block | Usage            |
| ----------------- | -------- | -------------------------- | ----- | ---------------- |
| `menu-hero.webp`  | 1920×600 | `menu_hero` (banner)       | —     | Background image |
| `drinks-bar.webp` | 800×600  | `drinks_section` (image-text) | —  | Bar / cocktails scene |

`starters`, `mains`, and `desserts` are priced lists with no per-item images in the preset JSON.

## Gallery (`gallery.json`)

| Image                          | Size      | Widget                      | Block    | Usage                          |
| ------------------------------ | --------- | --------------------------- | -------- | ------------------------------ |
| `gallery-hero.webp`            | 1920×600  | `gallery_hero` (banner)   | —        | Background image               |
| `food-beet-burrata.webp`       | 800×1000  | `food_gallery` (masonry)  | `food-1` | Roasted Beet & Burrata         |
| `food-halibut.webp`            | 800×600   | `food_gallery` (masonry)  | `food-2` | Pan-Seared Halibut             |
| `food-lamb-shank.webp`         | 800×800   | `food_gallery` (masonry)  | `food-3` | Braised Lamb Shank             |
| `food-pappardelle.webp`        | 800×600   | `food_gallery` (masonry)  | `food-4` | Handmade Pappardelle           |
| `food-chocolate-fondant.webp`  | 800×1000  | `food_gallery` (masonry)  | `food-5` | Dark Chocolate Fondant         |
| `food-cocktails.webp`          | 800×800   | `food_gallery` (masonry)  | `food-6` | Seasonal Cocktails             |
| `space-dining-room.webp`       | 800×600   | `space_gallery` (gallery) | `space-1` | Main dining room               |
| `space-kitchen.webp`           | 800×600   | `space_gallery` (gallery) | `space-2` | Open kitchen                   |
| `space-bar.webp`               | 800×600   | `space_gallery` (gallery) | `space-3` | Bar area                       |
| `space-patio.webp`             | 800×600   | `space_gallery` (gallery) | `space-4` | Outdoor patio                  |
| `space-private-dining.webp`    | 800×600   | `space_gallery` (gallery) | `space-5` | Private dining room            |
| `space-chefs-table.webp`       | 800×600   | `space_gallery` (gallery) | `space-6` | Chef's table                   |
| `private-event.webp`           | 800×600   | `events_section` (image-callout) | — | Private events / gatherings |

## Reservations (`reservations.json`)

No images.

## Contact (`contact.json`)

No images.
