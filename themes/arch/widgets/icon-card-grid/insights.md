# icon-card-grid

## Purpose

A grid of icon-led cards, each with an optional small subtitle, a title, a richtext description and an optional button. The workhorse "what we do" section: services, features, benefits or process steps laid out in two to five columns, as boxed cards or a flat, borderless list.

A carousel variant scrolls the cards sideways, and a featured photo can sit beside a two-column grid when the section needs an image. Icons share one style, size and shape across the section.

## When to use

- The main services or features section of a home page, or the overview at the top of a `services` page, after the opener.
- Good for: three to eight services, benefits, "how it works" steps, what is included. Bad for: items that need photos (use `services-grid` or `card-grid`), a one-line pictogram strip (use `icon-list`), a heading-plus-list argument (use `features-split`).
- It can open a page: its title becomes the page heading when first. It cannot sit under a header with `transparent_on_hero`; only `banner`, `slideshow` and `video-popup` support the transparent header.
- Natural neighbours: `banner` or `rich-text` above, `testimonials`, `key-figures` or `action-bar` below. Keep one card style per page when other grid sections are present.
- Needs three to eight cards with a title and one or two sentences each. Three or six cards fill three columns; four or eight fill four.
- Fits every service business: trades, clinics, agencies, salons, gyms, schools, consultancies.

## Pitfalls

- New cards carry a placeholder subtitle and a "Learn More" button pointing nowhere. Clear `subtitle` unless it earns its place (a category or "Step 1"), and clear the `button_link` text unless the card has a real page to link to. Most small-business grids need no buttons at all.
- A `featured_image` locks the grid to two columns and ignores `columns_desktop`; it suits exactly four or six cards. With `layout` set to `carousel` the featured image is not shown at all.
- `card_layout` set to `flat` removes the card box and with it the per-scheme borders and fills, so on `standard-secondary` or a highlight scheme the cards read as a plain list on a coloured band. `box` on `standard-primary` gives cards with no border at all; use `standard-secondary` when the cards need an outline.
- `columns_desktop` is also the number of visible slides in `carousel`. A carousel only earns its place above five or six cards; below that, a grid is easier to scan.
- `alignment` set to `center` centres icon, text and button inside each card; it pairs with `box` and short copy. Left alignment reads better with longer descriptions and flat cards.
- Icon weight comes from `icon_style` more than `icon_size`: a small `filled` icon draws more attention than a large `plain` one. Keep the same style, size and shape across all grid sections of a site.
- Keep card titles to two to four words and descriptions to one or two sentences; uneven text lengths make boxed cards different heights in the same row.
- Any scheme other than `standard-primary` pads the grid inside its own coloured band, so `top_spacing` and `bottom_spacing` set to `none` remove that inner padding; under a filled hero use `small`. Never place it on a highlight scheme directly next to another highlight section.

## Recipes

### Services overview

The classic three-column "what we do" with filled icons in outlined cards. The user supplies three or six services with a sentence each.

```json
{
  "type": "icon-card-grid",
  "settings": { "eyebrow": "Our Services", "title": "What We Do", "description": "Placeholder sentence summarising the offer.", "layout": "grid", "columns_desktop": 3, "card_layout": "box", "alignment": "center", "icon_style": "filled", "icon_size": "lg", "icon_shape": "circle", "color_scheme": "standard-secondary" },
  "blocks": [
    { "type": "card", "settings": { "icon": "home", "subtitle": "", "title": "Service One", "description": "<p>Placeholder sentence on this service.</p>", "button_link": { "text": "", "href": "" } } },
    { "type": "card", "settings": { "icon": "sparkles", "subtitle": "", "title": "Service Two", "description": "<p>Placeholder sentence on this service.</p>", "button_link": { "text": "", "href": "" } } },
    { "type": "card", "settings": { "icon": "leaf", "subtitle": "", "title": "Service Three", "description": "<p>Placeholder sentence on this service.</p>", "button_link": { "text": "", "href": "" } } }
  ]
}
```

### Why choose us, flat

A quieter differentiators section that does not compete with the main services grid. The user supplies four short reasons.

```json
{
  "type": "icon-card-grid",
  "settings": { "eyebrow": "Why Us", "title": "What Sets Us Apart", "heading_alignment": "start", "layout": "grid", "columns_desktop": 4, "card_layout": "flat", "alignment": "start", "icon_style": "plain", "icon_size": "md", "color_scheme": "standard-primary" },
  "blocks": [
    { "type": "card", "settings": { "icon": "shield", "subtitle": "", "title": "Licensed and Insured", "description": "<p>Placeholder line.</p>", "button_link": { "text": "", "href": "" } } },
    { "type": "card", "settings": { "icon": "clock", "subtitle": "", "title": "On Time", "description": "<p>Placeholder line.</p>", "button_link": { "text": "", "href": "" } } },
    { "type": "card", "settings": { "icon": "certificate", "subtitle": "", "title": "Certified Team", "description": "<p>Placeholder line.</p>", "button_link": { "text": "", "href": "" } } },
    { "type": "card", "settings": { "icon": "heart", "subtitle": "", "title": "Local and Independent", "description": "<p>Placeholder line.</p>", "button_link": { "text": "", "href": "" } } }
  ]
}
```

### Process steps

Four numbered steps using the subtitle for the step label, outlined icons on the alternate highlight surface. The user supplies the steps in order.

```json
{
  "type": "icon-card-grid",
  "settings": { "eyebrow": "How It Works", "title": "From First Call to Finished Job", "layout": "grid", "columns_desktop": 4, "card_layout": "flat", "alignment": "center", "icon_style": "outline", "icon_size": "xl", "icon_shape": "circle", "color_scheme": "highlight-secondary" },
  "blocks": [
    { "type": "card", "settings": { "icon": "phone", "subtitle": "Step 1", "title": "Get in Touch", "description": "<p>Placeholder line.</p>", "button_link": { "text": "", "href": "" } } },
    { "type": "card", "settings": { "icon": "clipboard-list", "subtitle": "Step 2", "title": "Free Quote", "description": "<p>Placeholder line.</p>", "button_link": { "text": "", "href": "" } } },
    { "type": "card", "settings": { "icon": "calendar", "subtitle": "Step 3", "title": "Book a Date", "description": "<p>Placeholder line.</p>", "button_link": { "text": "", "href": "" } } },
    { "type": "card", "settings": { "icon": "checks", "subtitle": "Step 4", "title": "Done and Checked", "description": "<p>Placeholder line.</p>", "button_link": { "text": "", "href": "" } } }
  ]
}
```

### Service cards with pages

Boxed cards that each link to a dedicated service page; add one card per page. The user supplies the service names, a sentence each and the page links.

```json
{
  "type": "icon-card-grid",
  "settings": { "eyebrow": "Services", "title": "Explore What We Offer", "layout": "grid", "columns_desktop": 3, "card_layout": "box", "alignment": "start", "icon_style": "outline", "icon_size": "lg", "icon_shape": "rounded", "color_scheme": "standard-secondary" },
  "blocks": [
    { "type": "card", "settings": { "icon": "star", "subtitle": "", "title": "Service One", "description": "<p>Placeholder sentence.</p>", "button_link": { "text": "Learn More", "href": "services.html" } } },
    { "type": "card", "settings": { "icon": "users", "subtitle": "", "title": "Service Two", "description": "<p>Placeholder sentence.</p>", "button_link": { "text": "Learn More", "href": "services.html" } } },
    { "type": "card", "settings": { "icon": "rocket", "subtitle": "", "title": "Service Three", "description": "<p>Placeholder sentence.</p>", "button_link": { "text": "Learn More", "href": "services.html" } } }
  ]
}
```
