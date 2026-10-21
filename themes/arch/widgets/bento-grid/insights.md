# bento-grid

## Purpose

A mosaic of tiles of different sizes on a four-column grid, for showcasing a handful of features, services, spaces or highlights where one or two items deserve more room than the rest. Each tile holds a short title and a line of text, optionally over a photo or a flat colour, and can link to a page.

Tiles are sized with `col_span` (one to four columns) and `row_span` (one or two rows). A tile with an image becomes a photo card with an overlay; a tile with a `background_color` is a flat colour card; a tile with neither is an outlined card on the section surface. Text sits at the bottom of every tile. On phones the grid becomes a single column and the spans are ignored.

## When to use

- A showcase in the upper half of a homepage or an `about` page, after the hero and before the detail sections.
- Good for four to eight items with a clear hierarchy (one flagship, several supporting). Bad for equal items with longer copy (`card-grid`, `services-grid`), for many photos (`gallery`, `masonry-gallery`) and for lists that need buttons.
- Not a page opener.
- Sits well after a `banner` or `split-content` intro and before `key-figures`, `testimonials` or an `action-bar`.
- Needs a title of two to five words and one sentence per tile; at least one or two tiles with strong photos. Flat and outlined tiles need no images.
- Fits agencies, studios, software, hospitality (rooms and amenities), venues, real estate, schools and makers who want a magazine-like feel.

## Pitfalls

- Plan complete rows: the spans in each row must add up to four, and a `row_span: 2` tile takes two columns' worth of height, so the tiles beside it must fill two rows (for example two tiles of `col_span: 2`). Leftover gaps look like a bug.
- `text_color` must match the tile, not the section: `light` on photos and dark fills, `dark` on outlined and pale fills. The overlay darkens every photo tile, so `light` is almost always right there.
- On `highlight-primary` or `highlight-secondary`, give every tile a photo or a `background_color`. An outlined tile has no fill, so `dark` text sits directly on the dark band and disappears.
- Mix tile kinds. All photo tiles turn noisy; all outlined tiles look unfinished. One photo per row with flat or outlined neighbours gives rhythm.
- The `text` field is plain text: one or two short lines. Long text pushes the title up and crowds the small tiles.
- `link` makes the whole tile clickable and adds a zoom on hover. Link all tiles or none, so the visitor does not have to guess which are clickable.
- `gap: 0` gives a seamless mosaic that only works when every tile has a photo or fill; with outlined tiles the borders double up.
- Any scheme other than `standard-primary` makes a filled band that pads inside itself; the section below needs its own `top_spacing`.

## Recipes

### Spotlight and two details

One large photo tile on the left, two flat tiles stacked on the right. Needs one strong landscape or square photo for the first tile.

```json
{
  "type": "bento-grid",
  "settings": { "eyebrow": "What we do", "title": "Three ways we can help", "heading_alignment": "start", "gap": "var(--space-md)" },
  "blocks": [
    { "type": "item", "settings": { "title": "Full renovations", "text": "From the first sketch to the last coat of paint.", "col_span": 2, "row_span": 2, "text_color": "light", "alignment": "start", "link": { "text": "Renovations", "href": "services.html" } } },
    { "type": "item", "settings": { "title": "Kitchens", "text": "Designed around how you cook.", "col_span": 2, "row_span": 1, "background_color": "#1f3a5f", "text_color": "light", "link": { "text": "Kitchens", "href": "services.html" } } },
    { "type": "item", "settings": { "title": "Repairs", "text": "Small jobs, done the same week.", "col_span": 2, "row_span": 1, "text_color": "dark", "link": { "text": "Repairs", "href": "services.html" } } }
  ]
}
```

### Wide strip and three cards

A full-width photo tile as the headline, then three cards beneath it (one wider for longer copy). One wide photo needed.

```json
{
  "type": "bento-grid",
  "settings": { "eyebrow": "This season", "title": "What is on", "heading_alignment": "start", "gap": "var(--space-md)", "color_scheme": "standard-secondary" },
  "blocks": [
    { "type": "item", "settings": { "title": "Summer programme", "text": "Workshops and open evenings, June to August.", "col_span": 4, "row_span": 1, "text_color": "light", "alignment": "center" } },
    { "type": "item", "settings": { "title": "Workshops", "text": "Weekly, all levels.", "col_span": 1, "row_span": 1, "text_color": "dark" } },
    { "type": "item", "settings": { "title": "Open evenings", "text": "First Friday of the month.", "col_span": 1, "row_span": 1, "text_color": "dark" } },
    { "type": "item", "settings": { "title": "Members", "text": "Priority booking and a discount on every course.", "col_span": 2, "row_span": 1, "background_color": "#1f3a5f", "text_color": "light" } }
  ]
}
```

### Seamless mosaic

Photo tiles with no gap for a premium, magazine-like block: one tall tile and two squares. Needs three photos; every tile must have an image.

```json
{
  "type": "bento-grid",
  "settings": { "title": "", "description": "", "gap": "0" },
  "blocks": [
    { "type": "item", "settings": { "title": "The main hall", "text": "Seats 200.", "col_span": 3, "row_span": 2, "text_color": "light" } },
    { "type": "item", "settings": { "title": "The bar", "text": "", "col_span": 1, "row_span": 1, "text_color": "light" } },
    { "type": "item", "settings": { "title": "The terrace", "text": "", "col_span": 1, "row_span": 1, "text_color": "light" } }
  ]
}
```
