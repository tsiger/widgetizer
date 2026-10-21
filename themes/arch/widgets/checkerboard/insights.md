# checkerboard

## Purpose

A grid of square tiles that alternates photos with text cards, for services, features or portfolio work presented as a magazine-style pattern. Each `card` is either a picture or a text tile, never both, and the rhythm between the two kinds is the whole effect.

A card with an image becomes a full-bleed square photo and ignores its text fields. A card without an image becomes a text tile with a title, a short richtext description and an optional secondary button, text aligned to the bottom. `columns_desktop` sets the pattern width on large screens; tablets show two tiles per row and phones one, so the order of the blocks should still make sense read straight down.

## When to use

- A showcase in the middle of a `services`, `about` or homepage, after the title section and before the proof and the call to action.
- Good for four to eight items with a photo each and one or two sentences. Bad for cards that need both a picture and text (use `card-grid`), for text-only lists (`icon-card-grid`, `services-grid`) and for pure photo sets (`gallery`).
- Not a page opener.
- Sits well after `banner`, `rich-text` or `split-content` and before `testimonials`, `key-figures` or an `action-bar`.
- Needs as many square-friendly photos as there are text tiles: subjects centred, nothing important at the edges, because every tile is cropped square.
- Fits trades and renovation, interiors, food and hospitality, wellness, creative studios, schools and anyone with strong photography of their work or space.

## Pitfalls

- Fill complete rows and alternate: at four columns, text, photo, text, photo on the first row, then photo, text, photo, text on the second. An all-text or all-photo checkerboard is a worse version of another section.
- Text tiles are squares of fixed size and clip what does not fit. At four columns a tile holds a title, one or two short sentences and a button; at two columns about twice that. Nothing grows the tile.
- A card with an image shows only the image; any title, description or button on it is invisible. Keep the text fields of photo cards empty so nobody wonders where they went.
- The button has a default label. Set `button_link` text to empty on text tiles that lead nowhere; put the one that matters in the first or second row.
- Fewer columns mean larger tiles: two columns reads premium and editorial, four reads dense and energetic.
- On `standard-secondary` and `highlight-secondary` the text tiles get a tinted background and a border, which separates them from the photos when the pictures vary in brightness. On `highlight-primary` the tiles get a border only.
- Any scheme other than `standard-primary` makes a filled band that pads inside itself; the section below needs its own `top_spacing`, and `top_spacing: small` here is right for docking under a filled hero.

## Recipes

### Four-column services

Eight tiles in two rows: the odd positions carry text, the even ones photos, then the pattern flips. Needs four square photos; the example shows the first row.

```json
{
  "type": "checkerboard",
  "settings": { "eyebrow": "Services", "title": "What we do", "heading_alignment": "center", "columns_desktop": 4, "color_scheme": "standard-secondary" },
  "blocks": [
    { "type": "card", "settings": { "title": "Kitchens", "description": "<p>Designed, built and fitted by one team.</p>", "button_link": { "text": "", "href": "" } } },
    { "type": "card", "settings": {} },
    { "type": "card", "settings": { "title": "Bathrooms", "description": "<p>From compact en-suites to full wet rooms.</p>", "button_link": { "text": "", "href": "" } } },
    { "type": "card", "settings": {} }
  ]
}
```

### Two-column spotlight

Four large tiles with room for a paragraph and a button each. Row one is text then photo, row two photo then text. Needs two photos.

```json
{
  "type": "checkerboard",
  "settings": { "eyebrow": "Specialities", "title": "Two things we do better than anyone", "heading_alignment": "start", "columns_desktop": 2 },
  "blocks": [
    { "type": "card", "settings": { "title": "Restoration", "description": "<p>Period features repaired rather than replaced, with materials matched to the original.</p>", "button_link": { "text": "See restoration work", "href": "services.html" } } },
    { "type": "card", "settings": {} },
    { "type": "card", "settings": {} },
    { "type": "card", "settings": { "title": "Extensions", "description": "<p>Extra space that looks like it was always there, planned with you from the first sketch.</p>", "button_link": { "text": "See extensions", "href": "services.html" } } }
  ]
}
```

### Portfolio mosaic

Three columns, mostly photos with one text tile for context; repeat the row with the text tile moved. Needs two photos per row.

```json
{
  "type": "checkerboard",
  "settings": { "title": "Recent work", "description": "A few favourites from the last year.", "heading_alignment": "center", "columns_desktop": 3 },
  "blocks": [
    { "type": "card", "settings": {} },
    { "type": "card", "settings": {} },
    { "type": "card", "settings": { "title": "Residential", "description": "<p>Homes across the region, large and small.</p>", "button_link": { "text": "All projects", "href": "services.html" } } }
  ]
}
```

### Compact duo

One photo beside one text tile: a featured service or seasonal announcement that behaves like a small split hero. Needs one square photo.

```json
{
  "type": "checkerboard",
  "settings": { "eyebrow": "Featured", "title": "", "heading_alignment": "start", "columns_desktop": 2, "color_scheme": "highlight-primary" },
  "blocks": [
    { "type": "card", "settings": {} },
    { "type": "card", "settings": { "title": "Spring garden clean-up", "description": "<p>Beds, borders and lawns made ready for the season, booked in a single visit.</p>", "button_link": { "text": "Book a visit", "href": "contact.html" } } }
  ]
}
```
