# card-grid

## Purpose

A grid of uniform cards, each with an optional image, a small label, a title, a richtext description and an optional button, for any set of equal items: services, programmes, locations, team members, packages or highlights. The general-purpose grid when no dedicated section fits.

One card design repeats across every item: `columns_desktop` sets how many sit side by side on large screens (two on tablets, one on phones), `aspect_ratio` crops every image alike, `image_position` puts the picture above or below the text, and `layout: carousel` turns the grid into a swipeable row with arrows.

## When to use

- The main content block of a `services` or `about` page, or a showcase on the homepage after the hero.
- Good for three to twelve equal items with a sentence or two each. For items that live as collection entries use `services-grid`, `news-grid` or `projects-grid` instead; for people use `profile-grid`; for icon-led points use `icon-card-grid`.
- Not a page opener; its title would become the page title, so let a title section go first.
- Sits well after `banner` or `split-content`, before `testimonials`, `key-figures` or an `action-bar`.
- Needs one image per card in the same orientation, a short title and a description of similar length on every card. Cards without images work as plain text tiles.
- Fits every industry; the card look (`box` or `flat`) and ratio carry the tone: square for people and products, `4 / 3` or `3 / 2` for places and services, `16 / 9` for wide scenes, `3 / 4` for tall product shots.

## Pitfalls

- The button on each card has a default label. Leave `button_link` text empty unless the card really leads to its own page; a grid of identical "Learn more" buttons pointing nowhere is worse than none.
- Descriptions of different lengths give cards of different heights in the same row. Keep them within a sentence of each other.
- `carousel` only pays off with more cards than columns; otherwise it adds arrows for nothing, and a grid reads faster on phones.
- `aspect_ratio: auto` shows every image at its own proportions, so mixed photos break the row. Use it for cards without images or with identical images.
- `card_layout: box` gets a tinted background and border on `standard-secondary` and `highlight-secondary`, a border only on `highlight-primary`; `flat` drops the frame and relies on whitespace, so flat cards without images look unfinished.
- `image_position: bottom` puts the text first; a strong differentiator for quotes and bios, odd for photo-led services.
- Any scheme other than `standard-primary` makes a filled band that pads inside itself; the section below needs its own `top_spacing`.

## Recipes

### Services overview

Three photo cards with a label, a title and two lines, no buttons. Needs three landscape photos in the same style.

```json
{
  "type": "card-grid",
  "settings": { "eyebrow": "Services", "title": "What we do", "heading_alignment": "center", "columns_desktop": 3, "card_layout": "box", "alignment": "start", "image_position": "top", "aspect_ratio": "4 / 3", "color_scheme": "standard-secondary" },
  "blocks": [
    { "type": "card", "settings": { "subtitle": "Homes", "title": "Interior painting", "description": "<p>Walls, ceilings and woodwork, with the furniture covered and the floors protected.</p>", "button_link": { "text": "", "href": "" } } },
    { "type": "card", "settings": { "subtitle": "Homes", "title": "Exterior painting", "description": "<p>Weatherproof finishes for render, timber and metalwork.</p>", "button_link": { "text": "", "href": "" } } },
    { "type": "card", "settings": { "subtitle": "Business", "title": "Commercial work", "description": "<p>Offices and shops, scheduled around your opening hours.</p>", "button_link": { "text": "", "href": "" } } }
  ]
}
```

### Highlights carousel

Six or more flat cards with wide images in a swipeable row: dishes, products, portfolio pieces. Needs one wide photo per card.

```json
{
  "type": "card-grid",
  "settings": { "title": "Seasonal favourites", "heading_alignment": "start", "layout": "carousel", "columns_desktop": 4, "card_layout": "flat", "alignment": "start", "aspect_ratio": "16 / 9" },
  "blocks": [
    { "type": "card", "settings": { "subtitle": "Spring", "title": "Asparagus and lemon", "description": "<p>Available April to June.</p>", "button_link": { "text": "", "href": "" } } },
    { "type": "card", "settings": { "subtitle": "Summer", "title": "Tomato and basil", "description": "<p>From the garden, July to September.</p>", "button_link": { "text": "", "href": "" } } },
    { "type": "card", "settings": { "subtitle": "Autumn", "title": "Pumpkin and sage", "description": "<p>October to December.</p>", "button_link": { "text": "", "href": "" } } }
  ]
}
```

### Numbered steps

Flat text cards with no images: the label carries the step number. Good for a short "how it works".

```json
{
  "type": "card-grid",
  "settings": { "eyebrow": "How it works", "title": "Three steps, no surprises", "heading_alignment": "start", "columns_desktop": 3, "card_layout": "flat", "alignment": "start", "aspect_ratio": "auto" },
  "blocks": [
    { "type": "card", "settings": { "subtitle": "01", "title": "Call", "description": "<p>Tell us what you need.</p>", "button_link": { "text": "", "href": "" } } },
    { "type": "card", "settings": { "subtitle": "02", "title": "Visit", "description": "<p>We measure and listen.</p>", "button_link": { "text": "", "href": "" } } },
    { "type": "card", "settings": { "subtitle": "03", "title": "Quote", "description": "<p>A fixed price, in writing.</p>", "button_link": { "text": "", "href": "" } } }
  ]
}
```

### Linked locations

Branch cards where each button really leads to its own page; one card per location. Needs one storefront photo each.

```json
{
  "type": "card-grid",
  "settings": { "eyebrow": "Locations", "title": "Find us near you", "heading_alignment": "center", "columns_desktop": 3, "card_layout": "box", "alignment": "start", "aspect_ratio": "3 / 2", "color_scheme": "standard-secondary" },
  "blocks": [
    { "type": "card", "settings": { "subtitle": "North", "title": "Springfield", "description": "<p>12 Example Street. Open daily, 9 to 6.</p>", "button_link": { "text": "Visit this branch", "href": "contact.html" } } }
  ]
}
```
