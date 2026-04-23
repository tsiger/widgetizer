# Pawlish — Image Usage Map

One table per page. Every widget instance gets a row. If a widget needs more than one image (slider, gallery, slideshow, before/after), it gets one row per image. Widgets that need no image are still listed with `—` so nothing is hidden.

Image references live OUTSIDE the preset JSON files per the image rule — apply this map after install via the project editor.

---

## Home — `index.json`

| Widget ID | Type | Image slot | Filename | Dimensions |
|---|---|---|---|---|
| `home_hero` | `banner` | `image` (widget) | `home-hero-banner.jpg` | 1920×1080 |
| `home_promise` | `image-text` | `image` (widget) | `home-promise.jpg` | 1280×1280 |
| `home_services` | `icon-card-grid` | — (icons only) | — | — |
| `home_compare` | `comparison-slider` | `before_image` (widget) | `home-opener-before.jpg` | 1600×1067 |
| `home_compare` | `comparison-slider` | `after_image` (widget) | `home-opener-after.jpg` | 1600×1067 |
| `home_testimonials` | `testimonial-slider` | — (no avatars on quotes) | — | — |
| `home_close` | `action-bar` | — | — | — |

---

## Services — `services.json`

| Widget ID | Type | Image slot | Filename | Dimensions |
|---|---|---|---|---|
| `services_hero` | `banner` | `image` (widget) | `services-hero.jpg` | 1920×720 |
| `services_pricing` | `pricing` | — | — | — |
| `services_visual` | `bento-grid` | block `bento-full` → `image` | `services-bento-full.jpg` | 1280×1280 |
| `services_visual` | `bento-grid` | block `bento-bath` → `image` | `services-bento-bath.jpg` | 1024×1024 |
| `services_visual` | `bento-grid` | block `bento-deshed` → `image` | `services-bento-deshed.jpg` | 1024×1024 |
| `services_visual` | `bento-grid` | block `bento-hand-strip` → `image` | `services-bento-handstrip.jpg` | 1024×1024 |
| `services_visual` | `bento-grid` | block `bento-nail` → `image` | `services-bento-nails.jpg` | 1024×1024 |
| `services_included` | `icon-card-grid` | `featured_image` (widget, optional) | `services-included-featured.jpg` | 1280×1280 |
| `services_faq` | `accordion` | — | — | — |
| `services_close` | `action-bar` | — | — | — |

---

## Groomers — `groomers.json`

| Widget ID | Type | Image slot | Filename | Dimensions |
|---|---|---|---|---|
| `groomers_hero` | `banner` | `image` (widget) | `groomers-hero.jpg` | 1920×1080 |
| `groomers_intro` | `image-text` | `image` (widget) | `groomers-intro.jpg` | 1280×1280 |
| `groomers_team` | `profile-grid` | block `groomer-mara` → `image` | `groomer-mara.jpg` | 1024×1365 |
| `groomers_team` | `profile-grid` | block `groomer-dani` → `image` | `groomer-dani.jpg` | 1024×1365 |
| `groomers_team` | `profile-grid` | block `groomer-rae` → `image` | `groomer-rae.jpg` | 1024×1365 |
| `groomers_team` | `profile-grid` | block `groomer-jules` → `image` | `groomer-jules.jpg` | 1024×1365 |
| `groomers_promise` | `icon-card-grid` | — (icons only) | — | — |
| `groomers_quote` | `testimonial-hero` | `image` (widget) | `groomer-quote-portrait.jpg` | 1024×1280 |
| `groomers_close` | `action-bar` | — | — | — |

---

## Gallery — `gallery.json`

| Widget ID | Type | Image slot | Filename | Dimensions |
|---|---|---|---|---|
| `gallery_hero` | `banner` | `image` (widget) | `gallery-hero.jpg` | 1920×720 |
| `gallery_grid` | `masonry-gallery` | block `item-maple` → `image` | `gallery-cut-1.jpg` | 1600×1067 |
| `gallery_grid` | `masonry-gallery` | block `item-otis` → `image` | `gallery-cut-2.jpg` | 1600×1067 |
| `gallery_grid` | `masonry-gallery` | block `item-koda` → `image` | `gallery-cut-7.jpg` | 1600×1067 |
| `gallery_grid` | `masonry-gallery` | block `item-luna` → `image` | `gallery-cut-4.jpg` | 1067×1600 |
| `gallery_grid` | `masonry-gallery` | block `item-biscuit` → `image` | `gallery-cut-5.jpg` | 1600×1067 |
| `gallery_grid` | `masonry-gallery` | block `item-marlow` → `image` | `gallery-cut-9.jpg` | 1600×1067 |
| `gallery_grid` | `masonry-gallery` | block `item-finn` → `image` | `gallery-cut-6.jpg` | 1067×1600 |
| `gallery_grid` | `masonry-gallery` | block `item-ziggy` → `image` | `gallery-cut-8.jpg` | 1600×1067 |
| `gallery_grid` | `masonry-gallery` | block `item-arlo` → `image` | `gallery-cut-10.jpg` | 1600×1067 |
| `gallery_grid` | `masonry-gallery` | block `item-pepper` → `image` | `gallery-cut-11.jpg` | 1067×1600 |
| `gallery_grid` | `masonry-gallery` | block `item-hank` → `image` | `gallery-cut-12.jpg` | 1600×1067 |
| `gallery_grid` | `masonry-gallery` | block `item-rosie` → `image` | `gallery-cut-13.jpg` | 1067×1600 |
| `gallery_grid` | `masonry-gallery` | block `item-gus` → `image` | `gallery-cut-3.jpg` | 1600×1067 |
| `gallery_grid` | `masonry-gallery` | block `item-ivy` → `image` | `gallery-cut-14.jpg` | 1067×1600 |
| `gallery_close` | `action-bar` | — | — | — |

---

## First visit — `first-visit.json`

| Widget ID | Type | Image slot | Filename | Dimensions |
|---|---|---|---|---|
| `firstvisit_hero` | `banner` | `image` (widget) | `firstvisit-hero.jpg` | 1920×1080 |
| `firstvisit_steps` | `steps` | block `step-dropoff` → `image` | `first-visit-step-dropoff.jpg` | 1280×960 |
| `firstvisit_steps` | `steps` | block `step-settling` → `image` | `first-visit-step-settling.jpg` | 1280×960 |
| `firstvisit_steps` | `steps` | block `step-bath` → `image` | `first-visit-step-bath.jpg` | 1280×960 |
| `firstvisit_steps` | `steps` | block `step-dry` → `image` | `first-visit-step-dry.jpg` | 1280×960 |
| `firstvisit_steps` | `steps` | block `step-groom` → `image` | `first-visit-step-groom.jpg` | 1280×960 |
| `firstvisit_steps` | `steps` | block `step-pickup` → `image` | `first-visit-step-pickup.jpg` | 1280×960 |
| `firstvisit_diff` | `checkerboard` | block `diff-pace-image` → `image` | `firstvisit-diff-pace.jpg` | 1280×960 |
| `firstvisit_diff` | `checkerboard` | block `diff-honest-image` → `image` | `firstvisit-diff-honest.jpg` | 1280×960 |
| `firstvisit_diff` | `checkerboard` | block `diff-notes-image` → `image` | `firstvisit-diff-notes.jpg` | 1280×960 |
| `firstvisit_bring` | `icon-card-grid` | — (icons only) | — | — |
| `firstvisit_meet` | `image-callout` | `image` (widget) | `firstvisit-meet.jpg` | 1280×1280 |
| `firstvisit_faq` | `accordion` | — | — | — |
| `firstvisit_close` | `action-bar` | — | — | — |

---

## Contact — `contact.json`

| Widget ID | Type | Image slot | Filename | Dimensions |
|---|---|---|---|---|
| `contact_hero` | `banner` | `image` (widget) | `contact-hero.jpg` | 1920×720 |
| `contact_callout` | `image-callout` | `image` (widget) | `contact-callout.jpg` | 1280×1280 |
| `contact_details` | `contact-details` | — (icons only) | — | — |
| `contact_map` | `map` | — (uses geocoded address) | — | — |

---

## Inventory

- **46 generated images, 46 image slots filled** across 6 pages.
- 33 widget instances total across the site; 13 of them carry no image (icons-only, text-only, accordion, contact-details, map, action-bar, pricing).
- All image references live **outside** the preset JSON files. Apply this map after install via the project editor.
