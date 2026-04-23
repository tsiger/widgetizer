# Shearline — Image Usage Map

This document maps each generated image to the widget instance and block (where applicable) that consumes it. Image references live **outside** the preset JSON files per the image rule — apply this map after install via the project editor.

---

## index.json (Home)

### `home_opener` — `banner`

Widget-level image setting:

| Setting | File | Dimensions |
|---|---|---|
| `image` | `hero.jpg` | 1920×1080 |

### `home_services_teaser` — `numbered-service-list`

No images.

### `home_stylists` — `profile-grid`

Block `profile` images (re-used on `stylists.json`):

| Block ID | File | Dimensions |
|---|---|---|
| `stylist-rowan` | `stylist-rowan.jpg` | 960×1280 |
| `stylist-sloane` | `stylist-sloane.jpg` | 960×1280 |
| `stylist-mara` | `stylist-mara.jpg` | 960×1280 |
| `stylist-theo` | `stylist-theo.jpg` | 960×1280 |

### `home_recent_work` — `masonry-gallery`

Block `item` images (9 of the 15 work-gallery / work-home shots — re-use freely):

| Block ID | File | Dimensions |
|---|---|---|
| `work-01` | `work-home-1.jpg` | 1280×1600 |
| `work-02` | `work-home-2.jpg` | 1280×960 |
| `work-03` | `work-home-3.jpg` | 1280×1600 |
| `work-04` | `work-home-4.jpg` | 1280×960 |
| `work-05` | `work-home-5.jpg` | 1280×1600 |
| `work-06` | `work-home-6.jpg` | 1280×960 |
| `work-07` | `work-home-7.jpg` | 1280×1600 |
| `work-08` | `work-home-8.jpg` | 1280×960 |
| `work-09` | `work-home-9.jpg` | 1280×1600 |

### `home_philosophy` — `image-callout`

Widget-level image setting:

| Setting | File | Dimensions |
|---|---|---|
| `image` | `philosophy-scene.jpg` | 1024×1280 |

### `home_voices` — `testimonials`

Avatars omitted (no images).

### `home_closing` — `action-bar`

No images.

---

## services.json (Services)

No images on this page. Pricing cards in `services_pricing` (`content-switcher`) are text-led; `services_included` (`icon-list`) uses icons; `services_pricing_faq` (`accordion`) is text; `services_closing` is an action-bar.

---

## stylists.json (Stylists)

### `stylists_intro` — `rich-text`

No image.

### `stylists_roster` — `profile-grid`

Block `profile` images (same four portraits as home, reused):

| Block ID | File | Dimensions |
|---|---|---|
| `stylist-rowan` | `stylist-rowan.jpg` | 960×1280 |
| `stylist-sloane` | `stylist-sloane.jpg` | 960×1280 |
| `stylist-mara` | `stylist-mara.jpg` | 960×1280 |
| `stylist-theo` | `stylist-theo.jpg` | 960×1280 |

### `stylists_how_to_pick` — `icon-list`

Icons only. No images.

### `stylists_closing` — `action-bar`

No images.

---

## work.json (Work)

### `work_intro` — `rich-text`

No image.

### `work_by_category` — `image-tabs`

Block `tab` images:

| Block ID | File | Dimensions |
|---|---|---|
| `tab-short-cuts` | `work-tab-short-cuts.jpg` | 1600×1067 |
| `tab-long-lengths` | `work-tab-long-lengths.jpg` | 1600×1067 |
| `tab-color-balayage` | `work-tab-color-balayage.jpg` | 1600×1067 |
| `tab-mens` | `work-tab-mens.jpg` | 1600×1067 |
| `tab-editorial-events` | `work-tab-editorial-events.jpg` | 1600×1067 |

### `work_gallery` — `masonry-gallery`

Block `item` images (15 of the 15 `work-gallery-NN.jpg` slots):

| Block ID | File | Dimensions |
|---|---|---|
| `gallery-01` | `work-gallery-01.jpg` | 1280×1600 |
| `gallery-02` | `work-gallery-02.jpg` | 1280×960 |
| `gallery-03` | `work-gallery-03.jpg` | 1280×1600 |
| `gallery-04` | `work-gallery-04.jpg` | 1280×1600 |
| `gallery-05` | `work-gallery-05.jpg` | 1280×960 |
| `gallery-06` | `work-gallery-06.jpg` | 1280×1600 |
| `gallery-07` | `work-gallery-07.jpg` | 1280×960 |
| `gallery-08` | `work-gallery-08.jpg` | 1280×1600 |
| `gallery-09` | `work-gallery-09.jpg` | 1280×960 |
| `gallery-10` | `work-gallery-10.jpg` | 1280×960 |
| `gallery-11` | `work-gallery-11.jpg` | 1280×1600 |
| `gallery-12` | `work-gallery-12.jpg` | 1280×960 |
| `gallery-13` | `work-gallery-13.jpg` | 1280×1600 |
| `gallery-14` | `work-gallery-14.jpg` | 1280×1600 |
| `gallery-15` | `work-gallery-15.jpg` | 1280×960 |

### `work_closing` — `action-bar`

No images.

---

## new-clients.json (New Clients)

### `new_clients_intro` — `rich-text`

No image.

### `new_clients_steps` — `steps`

Step images omitted by design — each step reads as text-led guidance; adding photos would dilute the walkthrough. No images needed.

### `new_clients_color_process` — `image-text`

Widget-level image setting:

| Setting | File | Dimensions |
|---|---|---|
| `image` | `color-consult.jpg` | 1024×1280 |

### `new_clients_faq` — `accordion`

No images.

### `new_clients_closing` — `action-bar`

No images.

---

## contact.json (Contact)

No images. `contact_intro` is text; `contact_details` is text blocks; `contact_map` uses the Google Maps embed and a text sidebar.

---

## Summary

### Count by category

| Category | Files | Used in |
|---|---|---|
| Hero banner | 1 | `home_opener` |
| Stylist portraits | 4 | `home_stylists`, `stylists_roster` (reused on both pages) |
| Home recent work | 9 | `home_recent_work` |
| Editorial scene | 1 | `home_philosophy` |
| Work category tabs | 5 | `work_by_category` |
| Work gallery archive | 15 | `work_gallery` |
| Color consultation | 1 | `new_clients_color_process` |
| **Total** | **36** | |

### Usage slots

- **36 generated images** across 4 of the 6 pages (Services and Contact have no images).
- **40 total usage slots** — stylist portraits are applied to two widgets each (`home_stylists` and `stylists_roster`), which accounts for 4 extra slots beyond the 36 generated files.

### User-supplied images (outside this pipeline)

The following are **not** generated by `scripts/generate-images.js` — the user uploads them manually after install:

- Header logo (`logoImage` setting on `header`). The preset uses `logoText: "Shearline"` as a working default.
- Header transparent-state logo (`transparent_logo` setting on `header`) — required because the header uses `transparent_on_hero: true`. Recommended: a bone/stone-colored wordmark that reads on the deep-ink banner opener.
- Footer logo (`logo` on `logo_text_1` block in footer) — optional; the preset uses `logo_text: "Shearline"` by default.
- Favicon (`favicon` setting in global theme settings).

All image references in the preset template JSON files are omitted by design. Apply this map via the project editor once the generated images have been produced.
