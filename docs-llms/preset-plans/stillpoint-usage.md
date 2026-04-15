# Stillpoint Preset — Image Usage Map

Preset templates live under `themes/arch/presets/stillpoint/templates/`. File names and sizes follow `docs-llms/preset-plans/stillpoint-images.json`. A smaller **`stillpoint-images-v2.json`** redefines prompts for some of the same filenames (regeneration reference only).

All **41** files currently in **`temp/`** match the full **stillpoint-images.json** set (same `.jpg` names).

## Home (`index.json`)

| Image             | Size      | Widget              | Block   | Usage |
| ----------------- | --------- | ------------------- | ------- | ----- |
| `home-hero.jpg`   | 1920×1080 | `hero` (banner)     | —       | Main hero background |
| `home-studio.jpg` | 800×600   | `studio` (image-text) | —     | “The Space” — light-filled studio |
| `home-step-1.jpg` | 800×600   | `process` (steps)   | `step-1` | “Pick a Class” |
| `home-step-2.jpg` | 800×600   | `process` (steps)   | `step-2` | “Book Online” |
| `home-step-3.jpg` | 800×600   | `process` (steps)   | `step-3` | “Show Up & Breathe” |

`marquee`, `intro`, `classes` (icon cards), `stats`, and `cta` have no raster images in the preset JSON (icons only).

## About (`about.json`)

| Image                           | Size     | Widget                      | Block     | Usage (matches caption)     |
| ------------------------------- | -------- | --------------------------- | --------- | --------------------------- |
| `about-hero.jpg`                | 1920×600 | `hero` (banner)             | —         | Page hero                   |
| `about-founder.jpg`             | 800×600  | `story` (image-text)        | —         | Founder story               |
| `about-profile-sarah.jpg`       | 400×400  | `team` (profile-grid)       | `profile-1` | Sarah Chen              |
| `about-profile-marcus.jpg`      | 400×400  | `team` (profile-grid)       | `profile-2` | Marcus Rivera           |
| `about-profile-priya.jpg`       | 400×400  | `team` (profile-grid)       | `profile-3` | Priya Nair              |
| `about-gallery-practice-room.jpg` | 800×600 | `studio_gallery` (gallery) | `img-1` | Main practice room      |
| `about-gallery-entrance.jpg`  | 800×600  | `studio_gallery` (gallery)  | `img-2` | Studio entrance             |
| `about-gallery-changing.jpg`    | 800×600  | `studio_gallery` (gallery)  | `img-3` | Changing area               |
| `about-gallery-props.jpg`       | 800×600  | `studio_gallery` (gallery)  | `img-4` | Props wall                  |
| `about-gallery-courtyard.jpg`   | 800×600  | `studio_gallery` (gallery)  | `img-5` | Courtyard                   |
| `about-gallery-tea.jpg`         | 800×600  | `studio_gallery` (gallery)  | `img-6` | Tea corner                  |

`values` (features-split) uses icons only.

## Classes (`classes.json`)

| Image                 | Size     | Widget                 | Block | Usage |
| --------------------- | -------- | ---------------------- | ----- | ----- |
| `classes-hero.jpg`    | 1920×600 | `hero` (banner)        | —     | Page hero (namaste hands) |
| `classes-instructor.jpg` | 800×600 | `instructor` (image-text) | —  | Meet Sarah Chen section |

`class_grid`, `what_to_expect`, `pricing`, and `faq` have no images in the preset JSON.

## Schedule (`schedule.json`)

| Image                 | Size     | Widget                 | Block           | Usage |
| --------------------- | -------- | ---------------------- | --------------- | ----- |
| `schedule-hero.jpg`   | 1920×600 | `hero` (banner)        | —               | Page hero |
| `schedule-morning.jpg`| 800×600  | `schedule` (card-grid) | `card-weekday-am` | Morning Classes |
| `schedule-midday.jpg` | 800×600  | `schedule` (card-grid) | `card-weekday-mid` | Midday Reset |
| `schedule-evening.jpg`| 800×600  | `schedule` (card-grid) | `card-weekday-pm` | Evening Flow |
| `schedule-saturday.jpg` | 800×600 | `schedule` (card-grid) | `card-saturday` | Weekend Practice |
| `schedule-sunday.jpg` | 800×600  | `schedule` (card-grid) | `card-sunday` | Slow Sunday |
| `schedule-private.jpg` | 800×600 | `schedule` (card-grid) | `card-private` | Private Sessions |
| `schedule-beginner.jpg` | 800×600 | `intro_class` (image-text) | —            | “New to Yoga?” beginner scene |

`cta` has no image.

## Gallery (`gallery.json`)

| Image                 | Size      | Widget            | Block   | Usage (matches caption)        |
| --------------------- | --------- | ----------------- | ------- | ------------------------------ |
| `gallery-hero.jpg`    | 1920×600  | `hero` (banner)   | —       | Page hero (abstract floor light) |
| `gallery-vinyasa.jpg` | 800×800   | `gallery` (gallery) | `img-1` | Morning vinyasa flow          |
| `gallery-sunrise.jpg` | 800×600   | `gallery` (gallery) | `img-2` | Sunrise through the windows   |
| `gallery-yin.jpg`     | 800×800   | `gallery` (gallery) | `img-3` | Yin class in session          |
| `gallery-workshop.jpg`| 800×600   | `gallery` (gallery) | `img-4` | Community workshop            |
| `gallery-props.jpg`   | 600×800   | `gallery` (gallery) | `img-5` | Props and equipment           |
| `gallery-meditation.jpg` | 800×600 | `gallery` (gallery) | `img-6` | Meditation session            |
| `gallery-pilates.jpg` | 800×800   | `gallery` (gallery) | `img-7` | Pilates mat class             |
| `gallery-outdoor.jpg` | 800×600   | `gallery` (gallery) | `img-8` | Summer outdoor practice       |
| `gallery-courtyard.jpg` | 600×800 | `gallery` (gallery) | `img-9` | Studio courtyard              |
| `gallery-tea.jpg`     | 800×600   | `gallery` (gallery) | `img-10` | Tea and conversation         |
| `gallery-prenatal.jpg`| 800×800   | `gallery` (gallery) | `img-11` | Prenatal class               |
| `gallery-seasonal.jpg`| 800×600   | `gallery` (gallery) | `img-12` | Seasonal workshop            |

## Contact (`contact.json`)

| Image              | Size     | Widget                   | Block | Usage |
| ------------------ | -------- | ------------------------ | ----- | ----- |
| `contact-hero.jpg` | 1920×600 | `hero` (banner)          | —     | Page hero (hand on mat) |
| `contact-welcome.jpg` | 800×600 | `contact_info` (image-text) | — | Studio exterior / welcome |

`map` and `faq` use no raster images in the preset JSON (address-driven map).
