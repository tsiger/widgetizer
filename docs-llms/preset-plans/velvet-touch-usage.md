# Velvet Touch Preset — Image Usage Map

Preset templates live under `themes/arch/presets/velvet-touch/templates/`. File names and sizes follow `docs-llms/preset-plans/velvet-touch-images.json`. Assets in **`temp/`** match that plan (**46** `.jpg` files).

## Home (`index.json`)

| Image                   | Size      | Widget                         | Block     | Usage |
| ----------------------- | --------- | ------------------------------ | --------- | ----- |
| `home-hero.jpg`         | 1920×1080 | `hero` (split-hero)            | —         | Hero image column (treatment room scene) |
| `home-panel-massage.jpg`| 800×1000  | `treatments` (sliding-panels)  | `panel-1` | Massage Therapy                |
| `home-panel-facials.jpg`| 800×1000  | `treatments` (sliding-panels)  | `panel-2` | Facials                        |
| `home-panel-body.jpg`   | 800×1000  | `treatments` (sliding-panels)  | `panel-3` | Body Treatments                |
| `home-panel-couples.jpg`| 800×1000  | `treatments` (sliding-panels)  | `panel-4` | Couples Packages               |
| `home-philosophy.jpg`   | 800×600   | `about_teaser` (image-callout) | —         | “Touch Is a Language” / philosophy |
| `home-avatar-rachel.jpg`| 400×400   | `testimonials` (testimonial-slider) | `quote-1` | Rachel M. avatar           |
| `home-avatar-david.jpg` | 400×400   | `testimonials` (testimonial-slider) | `quote-2` | David K. avatar            |
| `home-avatar-sophia.jpg`| 400×400   | `testimonials` (testimonial-slider) | `quote-3` | Sophia L. avatar           |

`trust_strip` and `gift_cards` / `cta` have no raster images in the preset JSON.

## About (`about.json`)

| Image                        | Size     | Widget            | Block       | Usage (matches caption) |
| ---------------------------- | -------- | ----------------- | ----------- | ------------------------- |
| `about-hero.jpg`             | 1920×600 | `hero` (banner)   | —           | Page hero                 |
| `about-founder.jpg`          | 800×600  | `story` (image-text) | —        | Elena’s story             |
| `about-profile-elena.jpg`    | 400×400  | `team` (profile-grid) | `profile-1` | Elena Vasquez           |
| `about-profile-james.jpg`    | 400×400  | `team` (profile-grid) | `profile-2` | James Liu               |
| `about-profile-amara.jpg`    | 400×400  | `team` (profile-grid) | `profile-3` | Amara Osei                |
| `about-profile-sofia.jpg`    | 400×400  | `team` (profile-grid) | `profile-4` | Sofia Reyes               |
| `about-gallery-reception.jpg`| 800×600  | `space` (gallery) | `img-1`     | Reception                 |
| `about-gallery-treatment.jpg`| 800×600 | `space` (gallery) | `img-2`     | Treatment room            |
| `about-gallery-lounge.jpg`   | 800×600  | `space` (gallery) | `img-3`     | Relaxation lounge         |
| `about-gallery-products.jpg` | 800×600  | `space` (gallery) | `img-4`     | Product wall              |
| `about-gallery-courtyard.jpg`| 800×600  | `space` (gallery) | `img-5`     | Courtyard                 |
| `about-gallery-retail.jpg`   | 800×600  | `space` (gallery) | `img-6`     | Retail area               |

`values` uses icons only.

## Services (`services.json`)

| Image                  | Size      | Widget                 | Block   | Usage |
| ---------------------- | --------- | ---------------------- | ------- | ----- |
| `services-hero.jpg`    | 1920×600  | `hero` (banner)        | —       | Page hero |
| `services-swedish.jpg` | 800×1067  | `services` (card-grid) | `card-1`| Swedish Massage |
| `services-deep-tissue.jpg` | 800×1067 | `services` (card-grid) | `card-2` | Deep Tissue |
| `services-hot-stone.jpg` | 800×1067 | `services` (card-grid) | `card-3` | Hot Stone |
| `services-facial.jpg`  | 800×1067  | `services` (card-grid) | `card-4` | Signature Facial |
| `services-scrub.jpg`   | 800×1067  | `services` (card-grid) | `card-5` | Body Scrub |
| `services-couples.jpg` | 800×1067  | `services` (card-grid) | `card-6` | Couples Retreat |
| `services-process.jpg` | 800×600   | `process` (image-text) | —       | “What to Expect” / relaxation lounge |

`why_us` and `pricing` use no images in the preset JSON.

## Treatments (`treatments.json`)

| Image                   | Size     | Widget                 | Block | Usage |
| ----------------------- | -------- | ---------------------- | ----- | ----- |
| `treatments-hero.jpg`   | 1920×600 | `hero` (banner)        | —     | Page hero |
| `treatments-massage.jpg`| 800×600  | `massage` (image-text)  | —     | Massage therapy section |
| `treatments-facials.jpg`| 800×600  | `facials` (image-text)   | —     | Facials section         |
| `treatments-body.jpg`   | 800×600  | `body` (image-text)      | —     | Body treatments section |
| `treatments-couples.jpg`| 800×600  | `couples` (image-callout)| —     | Couples packages        |

## Gallery (`gallery.json`)

| Image                        | Size     | Widget            | Block   | Usage (matches caption)     |
| ---------------------------- | -------- | ----------------- | ------- | --------------------------- |
| `gallery-hero.jpg`           | 1920×600 | `hero` (banner)   | —       | Page hero                   |
| `gallery-treatment-room.jpg` | 800×800  | `gallery` (gallery) | `img-1` | Treatment room            |
| `gallery-oils.jpg`           | 800×800  | `gallery` (gallery) | `img-2` | Essential oils              |
| `gallery-lounge.jpg`         | 800×800  | `gallery` (gallery) | `img-3` | Relaxation lounge           |
| `gallery-stones.jpg`         | 800×800  | `gallery` (gallery) | `img-4` | Hot stone preparation       |
| `gallery-products.jpg`       | 800×800  | `gallery` (gallery) | `img-5` | Skincare products           |
| `treatments-couples.jpg`     | 800×600  | `gallery` (gallery) | `img-6` | Couples suite *(same file as `couples` on Treatments; optional)* |
| `gallery-reception.jpg`      | 800×800  | `gallery` (gallery) | `img-7` | Reception area              |
| `gallery-candles.jpg`        | 800×800  | `gallery` (gallery) | `img-8` | Candles and ambiance        |
| `gallery-courtyard.jpg`      | 800×800  | `gallery` (gallery) | `img-9` | Garden courtyard            |
| `gallery-therapist.jpg`      | 800×800  | *(flexible)*        | —       | Therapeutic hands / neck work — use for an extra slot, or swap with `img-4` / retitle a caption for massage imagery |

**Note:** For `img-6` you can use **`home-panel-couples.jpg`** instead if you want the same couples visual as the home sliding panel without reusing `treatments-couples.jpg`.

## Contact (`contact.json`)

| Image                | Size     | Widget                    | Block | Usage |
| -------------------- | -------- | ------------------------- | ----- | ----- |
| `contact-hero.jpg`   | 1920×600 | `hero` (banner)           | —     | Page hero (robe / slippers) |
| `contact-entrance.jpg` | 800×600 | `contact_info` (image-text) | —   | Studio exterior / welcome |

`map` and `faq` use no raster images in the preset JSON.
