# priced-list

## Purpose

A menu-style list of named items with a short description and a price on each row, like a printed menu, rate card or price sheet. Prices are free text, so "From $0", "Market price" or "60 min · $0" all work. Optional small thumbnails sit beside the price.

Each `item` block is one row: `name` and `description` on the left, `price` (and the thumbnail, when set) on the right, with a thin rule between rows. `layout` `single-column` is one long list; `two-column` splits the rows into two side-by-side lists on wider screens, filling left to right, and collapses to one column on phones. Several sections stacked with different eyebrows build a full multi-course menu.

## When to use

- The body of a `menu`, `pricing` or `treatments` page, one section per category (starters, mains, desserts; cuts, colour, treatments). Also a short rate card on a service page.
- Good for 4 to 12 items per section with a one-line description each. Restaurants, cafés, bakeries, bars, salons, spas, groomers, repair shops, studios renting rooms by the hour.
- Bad for tiered plans with feature lists and a button (use `pricing`), for side-by-side comparisons (`comparison-table`) and for items that need a large photo (`card-grid`).
- Can open a page when it has a `title`, but a menu page reads better opened by `rich-text` with the first list set to `top_spacing` `none`. It never supports a transparent header; only `banner`, `slideshow` and `video-popup` do.
- Stacks on itself: consecutive sections with `bottom_spacing` `none` on the upper and `top_spacing` `none` on the lower read as one continuous menu with category headings. Alternate `standard-primary` and `standard-secondary` between categories for banding.
- Fits hospitality and personal services best; also tuition lists, membership fees and workshop prices.

## Pitfalls

- `price` never wraps. Keep it short ("$0", "From $0", "$0 / hr"); a sentence in the price column squeezes the description into a sliver.
- The `two-column` layout pairs items row by row (first item left, second right). An odd number of items leaves an empty cell at the end; an even count looks finished. On phones the two columns become one list in the same order.
- Thumbnails are small squares. Use them on every item in a section or on none; one stray photo looks like a mistake. Tightly cropped product shots work, wide scenes do not.
- Descriptions are rich text but the column is narrow; one line is ideal, two is the limit. Put allergen notes or "prices include tax" in the section `description`, not on every row.
- The `eyebrow` is the category label visitors scan for on a long menu page. Keep it to one or two words and use it consistently across stacked sections; the `title` can repeat it in full or be left blank on all but the first section.
- Filled schemes pad inside their own band. Fusing two filled sections with `none` removes their inner padding, so stacked menu categories should be unfilled (`standard-primary`) when you want them to touch, or keep `auto` spacing when alternating with a filled band.
- A price list is utility content and rarely deserves a highlight scheme. One highlighted band for a chef's menu or a signature package is enough per page.

## Recipes

### Restaurant menu category

One course of a stacked menu: six items, no photos, one line each. Repeat the section for each course with its own eyebrow.

```json
{
  "type": "priced-list",
  "settings": {
    "eyebrow": "Starters",
    "title": "To begin",
    "heading_alignment": "center",
    "layout": "single-column",
    "color_scheme": "standard-primary",
    "bottom_spacing": "none"
  },
  "blocks": [
    { "type": "item", "settings": { "name": "Seasonal soup", "description": "<p>Changes daily, served with warm bread.</p>", "price": "$0" } },
    { "type": "item", "settings": { "name": "Garden salad", "description": "<p>Leaves, herbs and a house dressing.</p>", "price": "$0" } },
    { "type": "item", "settings": { "name": "Baked flatbread", "description": "<p>Olive oil, sea salt and rosemary.</p>", "price": "$0" } },
    { "type": "item", "settings": { "name": "Marinated olives", "description": "<p>Citrus and chilli.</p>", "price": "$0" } }
  ]
}
```

### Two-column service menu

A salon or spa price list with six services side by side, left-aligned heading, duration in the description.

```json
{
  "type": "priced-list",
  "settings": {
    "eyebrow": "Hair",
    "title": "Cuts and colour",
    "description": "Prices start from; a quick consultation confirms the final price.",
    "heading_alignment": "start",
    "layout": "two-column",
    "color_scheme": "standard-secondary"
  },
  "blocks": [
    { "type": "item", "settings": { "name": "Cut and finish", "description": "<p>45 min</p>", "price": "From $0" } },
    { "type": "item", "settings": { "name": "Restyle", "description": "<p>60 min</p>", "price": "From $0" } },
    { "type": "item", "settings": { "name": "Root colour", "description": "<p>90 min</p>", "price": "From $0" } },
    { "type": "item", "settings": { "name": "Full colour", "description": "<p>120 min</p>", "price": "From $0" } },
    { "type": "item", "settings": { "name": "Highlights", "description": "<p>120 min</p>", "price": "From $0" } },
    { "type": "item", "settings": { "name": "Toner", "description": "<p>30 min</p>", "price": "From $0" } }
  ]
}
```

### Rate card with inclusions

A short service-page rate card where each description lists what is included; three items, single column.

```json
{
  "type": "priced-list",
  "settings": {
    "eyebrow": "Pricing",
    "title": "Simple rates",
    "description": "All prices are placeholders and include materials unless noted.",
    "heading_alignment": "start",
    "layout": "single-column",
    "color_scheme": "standard-primary"
  },
  "blocks": [
    { "type": "item", "settings": { "name": "Standard service", "description": "<p>Inspection, filter change and written report.</p>", "price": "$0" } },
    { "type": "item", "settings": { "name": "Full service", "description": "<p>Everything in standard plus fluids and belts.</p>", "price": "$0" } },
    { "type": "item", "settings": { "name": "Call-out", "description": "<p>Diagnosis at your address, credited against repairs.</p>", "price": "$0 / hr" } }
  ]
}
```

