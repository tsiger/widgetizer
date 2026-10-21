# icon-list

## Purpose

A compact strip or grid of icon-and-label items, each centred with an optional one-line note: amenities, inclusions, facilities, quick reasons to choose you. The lightest way to say "we have all of this" at a glance, without cards, buttons or paragraphs.

Two to eight columns on wide screens, as a grid or a scrolling carousel. Icons share one style, size and shape, and the label uses the heading font so even an icon-only strip reads cleanly.

## When to use

- A bridge section: between the opener and the first content block, or between two text-heavy sections, on home, `services`, `rooms` or `visit` pages.
- Good for: amenities and facilities, what a package includes, trust points, a pictogram overview of services. Bad for: anything needing a sentence or two per item (use `icon-card-grid`), links (use `card-grid`), a heading-plus-list argument (use `features-split`).
- It can open a page, but should not: it has no weight as an opener and does not support the transparent header (only `banner`, `slideshow` and `video-popup` do).
- Natural neighbours: `banner` above with `top_spacing` set to `small`, `split-content` or `image-text` below, `trust-bar` as an alternative when the items are logos rather than icons.
- Needs four to twelve items with a one- or two-word label; descriptions optional and short. Keep the count a multiple of the column count.
- Fits hotels and rentals, venues, gyms and spas, coworking spaces, trades, clinics.

## Pitfalls

- Descriptions are plain text, small and muted: one short line, no formatting, no links. The moment an item needs more, this is the wrong section.
- Icon-only versus icon-plus-description is the biggest mood shift. Dropping descriptions turns the section into a scannable pictogram strip; adding them makes it a mini feature grid. Decide once per section; mixing items with and without notes leaves ragged gaps.
- `columns_desktop` applies on wide screens only. On laptops and tablets the grid reflows to fewer columns regardless, and on phones it is two across, so eight items make four rows on a phone.
- Match `icon_size` to density: `xl` or `lg` for two to four columns, `sm` or `md` for six to eight. Small icons in four or five wide columns look lost; large icons in eight columns crowd.
- `icon_shape` only shows with `outline` or `filled`. `filled` with `sharp` reads bold and technical; `plain` with `circle` reads light and hospitable. Match the site, not the section.
- `carousel` uses `columns_desktop` as the number of visible items; it earns its place above eight items, otherwise the grid is easier to scan.
- This is a lightweight bridge section, so `small` spacing is the natural setting. Any scheme other than `standard-primary` pads the items inside its own coloured band, so `top_spacing` and `bottom_spacing` set to `none` remove that inner padding; under a filled hero use `small`, not `none`.
- The eyebrow and title are optional; an icon-only strip often reads best with an eyebrow alone or no heading at all.

## Recipes

### Amenities bar

Six icon-only items on the strongest surface, meant to be read without reading. The user supplies the amenity names.

```json
{
  "type": "icon-list",
  "settings": { "eyebrow": "Included With Every Stay", "heading_alignment": "center", "layout": "grid", "columns_desktop": 6, "icon_style": "plain", "icon_size": "lg", "icon_shape": "circle", "color_scheme": "highlight-primary", "top_spacing": "small", "bottom_spacing": "small" },
  "blocks": [
    { "type": "item", "settings": { "icon": "wifi", "title": "Free Wi-Fi" } },
    { "type": "item", "settings": { "icon": "parking", "title": "Parking" } },
    { "type": "item", "settings": { "icon": "pool", "title": "Pool" } },
    { "type": "item", "settings": { "icon": "barbell", "title": "Gym" } },
    { "type": "item", "settings": { "icon": "coffee", "title": "Breakfast" } },
    { "type": "item", "settings": { "icon": "paw", "title": "Pet Friendly" } }
  ]
}
```

### Trust strip under the opener

Four reassurance points docked under a hero. The user supplies four short claims that are true for the business.

```json
{
  "type": "icon-list",
  "settings": { "heading_alignment": "center", "layout": "grid", "columns_desktop": 4, "icon_style": "outline", "icon_size": "md", "icon_shape": "circle", "color_scheme": "standard-secondary", "top_spacing": "small", "bottom_spacing": "small" },
  "blocks": [
    { "type": "item", "settings": { "icon": "shield", "title": "Licensed and Insured" } },
    { "type": "item", "settings": { "icon": "clock", "title": "Same-Week Appointments" } },
    { "type": "item", "settings": { "icon": "certificate", "title": "Certified Team" } },
    { "type": "item", "settings": { "icon": "thumb-up", "title": "Satisfaction Promise" } }
  ]
}
```

### Services with a line each

Three large filled icons with a short note, left-aligned heading. The user supplies three services and a few words on each.

```json
{
  "type": "icon-list",
  "settings": { "eyebrow": "Services", "title": "What We Offer", "heading_alignment": "start", "layout": "grid", "columns_desktop": 3, "icon_style": "filled", "icon_size": "xl", "icon_shape": "rounded", "color_scheme": "standard-primary" },
  "blocks": [
    { "type": "item", "settings": { "icon": "home", "title": "Service One", "description": "Placeholder note in a few words" } },
    { "type": "item", "settings": { "icon": "leaf", "title": "Service Two", "description": "Placeholder note in a few words" } },
    { "type": "item", "settings": { "icon": "sparkles", "title": "Service Three", "description": "Placeholder note in a few words" } }
  ]
}
```

### Dense facilities grid

Eight small pictograms for a venue or coworking space; add up to sixteen. The user supplies the facility names.

```json
{
  "type": "icon-list",
  "settings": { "title": "Facilities at a Glance", "heading_alignment": "center", "layout": "grid", "columns_desktop": 8, "icon_style": "plain", "icon_size": "sm", "icon_shape": "circle", "color_scheme": "standard-primary" },
  "blocks": [
    { "type": "item", "settings": { "icon": "wifi", "title": "Wi-Fi" } },
    { "type": "item", "settings": { "icon": "coffee", "title": "Kitchen" } },
    { "type": "item", "settings": { "icon": "parking", "title": "Parking" } },
    { "type": "item", "settings": { "icon": "lock", "title": "Lockers" } },
    { "type": "item", "settings": { "icon": "presentation", "title": "Meeting Rooms" } },
    { "type": "item", "settings": { "icon": "headphones", "title": "Quiet Zone" } },
    { "type": "item", "settings": { "icon": "bike", "title": "Bike Storage" } },
    { "type": "item", "settings": { "icon": "sun", "title": "Terrace" } }
  ]
}
```
