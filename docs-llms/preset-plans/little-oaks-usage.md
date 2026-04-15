# Little Oaks Preset — Image Usage Map

Preset templates live under `themes/arch/presets/little-oaks/templates/`. File names and dimensions follow `docs-llms/preset-plans/little-oaks-images.json` (the `images` array). Assets in `temp/` use the same **`.jpg`** filenames.

The shipped preset JSON often **omits** empty `image` / `photo` fields; the table below is where each plan file should be assigned in the editor (or future preset fills).

## Home (`index.json`)

| File                       | Size (plan) | Widget                         | Block / usage |
| -------------------------- | ----------- | ------------------------------ | ------------- |
| `hero-children-playing.jpg`| 960×720     | `hero_split` (split-hero)      | Widget `settings.image` — hero photo column |
| `infant-room.jpg`          | 800×600     | `programs_overview` (card-grid) | `program-1` — Infants card image |
| `toddler-room.jpg`         | 800×600     | `programs_overview` (card-grid) | `program-2` — Toddlers |
| `preschool-class.jpg`      | 800×600     | `programs_overview` (card-grid) | `program-3` — Preschool |
| `pre-k-class.jpg`          | 800×600     | `programs_overview` (card-grid) | `program-4` — Pre-K |
| `teaching-philosophy.jpg`  | 960×720     | `philosophy_section` (image-text) | Widget `settings.image` — “Learning Through Play” |

`credentials_strip`, `stats_section`, `parent_reviews` (quotes have no avatar fields in the preset), and `tour_cta` have no raster images in the JSON.

## About (`about.json`)

| File               | Size (plan) | Widget              | Block / usage |
| ------------------ | ----------- | ------------------- | ------------- |
| `story-founding.jpg` | 960×720   | `story_section` (image-text) | Widget `settings.image` — “Our Story” (center exterior) |
| `staff-1.jpg`      | 800×800     | `staff_grid` (profile-grid) | `staff-1` — Claire Whitfield — `photo` |
| `staff-2.jpg`      | 800×800     | `staff_grid` (profile-grid) | `staff-2` — Rosa Gutierrez |
| `staff-3.jpg`      | 800×800     | `staff_grid` (profile-grid) | `staff-3` — David Kowalski |
| `staff-4.jpg`      | 800×800     | `staff_grid` (profile-grid) | `staff-4` — Aisha Thompson |

`about_hero` (banner) has no `image` in the preset — reuse **`story-founding.jpg`** or **`hero-children-playing.jpg`** if you add a photo banner. `values_grid`, `about_reviews`, and `about_cta` use no images in the preset.

## Programs (`programs.json`)

| File                    | Size (plan) | Widget                      | Block / usage |
| ----------------------- | ----------- | --------------------------- | ------------- |
| `checkerboard-art.jpg`  | 800×800     | `programs_grid` (checkerboard) | `tile-2` — image tile (empty title in preset) |
| `checkerboard-reading.jpg` | 800×800  | `programs_grid` (checkerboard) | `tile-3` |
| `checkerboard-blocks.jpg` | 800×800  | `programs_grid` (checkerboard) | `tile-6` |
| `checkerboard-garden.jpg` | 800×800  | `programs_grid` (checkerboard) | `tile-7` |
| `outdoor-play.jpg`      | 960×720     | `outdoor_section` (image-text) | Widget `settings.image` — outdoor learning |

`programs_hero` is text-only in the preset (no banner image). `daily_schedule` and `programs_cta` have no images.

**Checkerboard layout** — Text tiles in preset: `tile-1` (Infants), `tile-4` (Toddlers), `tile-5` (Preschool), `tile-8` (Pre-K). Image tiles **`tile-2`**, **`tile-3`**, **`tile-6`**, **`tile-7`** are the four **`checkerboard-*.jpg`** slots in order.

## Tuition (`tuition.json`)

No image fields in the preset (`tuition_hero`, `tuition_plans`, `enrollment_process`, `tuition_faq`, `tuition_cta`). Optional: reuse **`story-founding.jpg`** or **`preschool-class.jpg`** on `tuition_hero` if you add a banner image.

## Contact (`contact.json`)

No image fields (`contact_hero`, `location_map`, `contact_faq`, `contact_cta`).

## `temp/` vs plan

All **16** entries in `little-oaks-images.json` match **`temp/`** (same filenames). No extra files to remove for this preset.

## Shared / reuse notes

- **Program room photos** — The same four classroom shots (`infant-room` … `pre-k-class`) pair **Home** `programs_overview` with the narrative on **Programs** (text tiles); only Home uses them as card art unless you duplicate in the CMS.
- **Hero / story** — **`hero-children-playing.jpg`** is the main marketing hero; **`story-founding.jpg`** reads as the school exterior for About story or secondary banners.
