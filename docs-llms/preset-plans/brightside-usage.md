# Brightside Preset — Image Usage Map

Preset templates live under `themes/arch/presets/brightside/templates/`. File names and sizes follow `docs-llms/preset-plans/brightside-images.json`. Assets in **`temp/`** use the same **`.jpg`** names (**40** files — full set).

## Home (`index.json`)

| Image                 | Size      | Widget                               | Block        | Usage |
| --------------------- | --------- | ------------------------------------ | ------------ | ----- |
| `home-hero.jpg`       | 1920×1080 | `hero` (banner)                    | —            | Page hero |
| `home-before.jpg`     | 1200×800  | `before_after` (comparison-slider) | *(settings)* | “Before” image |
| `home-after.jpg`      | 1200×800  | `before_after` (comparison-slider) | *(settings)* | “After” image |
| `home-dentist.jpg`    | 800×600   | `about_teaser` (image-text)        | —            | Dr. Rhodes / “Dentistry That Listens” |
| `home-avatar-michael.jpg` | 400×400 | `testimonials` (testimonials)  | `review-1`   | Michael T. |
| `home-avatar-sarah.jpg`   | 400×400 | `testimonials` (testimonials)  | `review-2`   | Sarah K.   |
| `home-avatar-james.jpg`   | 400×400 | `testimonials` (testimonials)  | `review-3`   | James R.   |

`trust_strip`, `services` (icon cards), and `cta` use no raster images in the preset JSON.

## About (`about.json`)

| Image                            | Size       | Widget              | Block       | Usage (matches caption) |
| -------------------------------- | ---------- | ------------------- | ----------- | ----------------------- |
| `about-hero.jpg`                 | 1920×600   | `hero` (banner)     | —           | Page hero               |
| `about-story.jpg`                | 800×600    | `story` (image-text) | —         | Practice story          |
| `about-profile-elena.jpg`        | 400×400    | `team` (profile-grid) | `profile-1` | Dr. Elena Rhodes      |
| `about-profile-marcus.jpg`       | 400×400    | `team` (profile-grid) | `profile-2` | Dr. Marcus Chen       |
| `about-profile-lena.jpg`         | 400×400    | `team` (profile-grid) | `profile-3` | Dr. Lena Okafor       |
| `about-gallery-lobby.jpg`        | 1200×675   | `office` (gallery)  | `img-1`     | Lobby                   |
| `about-gallery-treatment.jpg`    | 1200×675   | `office` (gallery)  | `img-2`     | Treatment room          |
| `about-gallery-reception.jpg`    | 1200×675   | `office` (gallery)  | `img-3`     | Reception               |
| `about-gallery-sterilization.jpg`| 1200×675   | `office` (gallery)  | `img-4`     | Sterilization area      |
| `about-gallery-lounge.jpg`       | 1200×675   | `office` (gallery)  | `img-5`     | Patient lounge          |
| `about-gallery-exterior.jpg`     | 1200×675   | `office` (gallery)  | `img-6`     | Exterior                |

`values` uses icons only.

## Services (`services.json`)

| Image                     | Size     | Widget                    | Block | Usage |
| ------------------------- | -------- | ------------------------- | ----- | ----- |
| `services-hero.jpg`       | 1920×600 | `hero` (banner)           | —     | Page hero (instruments flat lay) |
| `services-technology.jpg` | 800×600  | `technology` (image-text) | —     | “Modern Tools, Better Outcomes” |

`overview` (icon cards), `process`, `insurance`, and `cta` have no images in the preset JSON.

## New Patients (`new-patients.json`)

| Image                   | Size     | Widget                 | Block   | Usage |
| ----------------------- | -------- | ---------------------- | ------- | ----- |
| `new-patients-hero.jpg` | 1920×600 | `hero` (banner)        | —       | Page hero |
| `new-patients-welcome.jpg` | 800×600 | `welcome` (image-text) | —     | Welcome section |
| `new-patients-step-1.jpg` | 800×600 | `first_visit` (steps)  | `step-1` | Paperwork & check-in |
| `new-patients-step-2.jpg` | 800×600 | `first_visit` (steps)  | `step-2` | Comprehensive exam   |
| `new-patients-step-3.jpg` | 800×600 | `first_visit` (steps)  | `step-3` | Digital X-rays        |
| `new-patients-step-4.jpg` | 800×600 | `first_visit` (steps)  | `step-4` | Treatment plan discussion |

`faq` and `cta` use no images in the preset JSON.

## Smile Gallery (`smile-gallery.json`)

| Image                     | Size     | Widget                               | Block        | Usage (matches caption) |
| ------------------------- | -------- | ------------------------------------ | ------------ | ----------------------- |
| `smile-gallery-hero.jpg`  | 1920×600 | `hero` (banner)                    | —            | Page hero               |
| `smile-gallery-before.jpg`| 1200×800 | `before_after` (comparison-slider) | *(settings)* | “Whitening Transformation” before |
| `smile-gallery-after.jpg` | 1200×800 | `before_after` (comparison-slider) | *(settings)* | After |
| `smile-gallery-result-1.jpg` | 900×600 | `gallery` (gallery)              | `img-1`      | Teeth whitening        |
| `smile-gallery-result-2.jpg` | 900×600 | `gallery` (gallery)              | `img-2`      | Invisalign             |
| `smile-gallery-result-3.jpg` | 900×600 | `gallery` (gallery)              | `img-3`      | Porcelain veneers      |
| `smile-gallery-result-4.jpg` | 900×600 | `gallery` (gallery)              | `img-4`      | Dental implant         |
| `smile-gallery-result-5.jpg` | 900×600 | `gallery` (gallery)              | `img-5`      | Crown restoration      |
| `smile-gallery-result-6.jpg` | 900×600 | `gallery` (gallery)              | `img-6`      | Composite bonding      |
| `smile-gallery-result-7.jpg` | 900×600 | `gallery` (gallery)              | `img-7`      | Invisalign gap closure |
| `smile-gallery-result-8.jpg` | 900×600 | `gallery` (gallery)              | `img-8`      | Bridge                   |
| `smile-gallery-result-9.jpg` | 900×600 | `gallery` (gallery)              | `img-9`      | Whitening / stain removal |

## Contact (`contact.json`)

| Image                | Size     | Widget                    | Block | Usage |
| -------------------- | -------- | ------------------------- | ----- | ----- |
| `contact-hero.jpg`   | 1920×600 | `hero` (banner)           | —     | Page hero (hallway) |
| `contact-reception.jpg` | 800×600 | `contact_info` (image-text) | —  | Reception / booking  |

`hours` and `map` use no raster images in the preset JSON.

---

**Comparison sliders:** `before_after` widgets store **`before_image`** and **`after_image`** in settings (not block IDs). Use **`home-before` / `home-after`** on Home and **`smile-gallery-before` / `smile-gallery-after`** on Smile Gallery.
