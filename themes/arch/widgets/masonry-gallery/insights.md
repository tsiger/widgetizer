# masonry-gallery

## Purpose

A staggered grid of photos shown at their natural proportions, portrait, landscape and square side by side, with an optional title and category under each and a lightbox on click. It suits portfolios, project walls and inspiration boards, anywhere mixed image shapes are the point rather than a problem.

Images are dropped into equal-width columns in order, each going to the shortest column, so the stagger comes from the photos themselves. Clicking a tile opens the full image with its title, or with the caption stored in the media library when the title is blank.

## When to use

- Role: the visual showcase of a page: the work itself on a portfolio page, the space on a venue page, the dishes on a restaurant page.
- Good for: photographers, architects, interior designers, tattoo and makeup artists, florists, renovation trades, venues and hotels, bakeries and restaurants.
- Bad for: uniformly cropped photos (a plain `gallery` reads cleaner), projects that need their own pages (`projects-grid` with the `projects` collection), or fewer than six images.
- Opening a page: no. It has no words of its own and does not support the header's transparent mode, which only `banner`, `slideshow` and `video-popup` support. Put a `rich-text` title above it instead.
- Natural neighbours: a `rich-text` or `split-content` introduction above, `testimonials` or `action-bar` below.
- Content needed: at least twice as many images as columns, in deliberately mixed orientations, optimised for the web.

## Pitfalls

- The stagger only happens when the photos differ in shape. Identical crops produce a plain grid with odd gaps; mix portrait, landscape and square on purpose.
- Fewer than two images per column leaves columns short or empty. For `columns_desktop` of 3, bring six or more; for 4, eight or more.
- Order matters: the first images land at the top of the first columns. Lead with the strongest work.
- Captions add height unevenly. Either give every tile a `title` (and optionally a `category`) or none; a mix looks accidental. `alignment` only affects the caption text.
- A tall portrait in a two-column grid dominates the row; three or four columns absorb mixed shapes best. Five columns suit image-only boards.
- `category` is a label, not a filter; nothing is filtered or grouped. For browsable work by type, use the `projects` collection.
- `standard-secondary` and `highlight-secondary` give each tile a card fill and border, which helps when there are captions; `standard-primary` keeps image-only walls seamless. A `color_scheme` other than `standard-primary` makes the section a filled band whose spacing is padding inside its colour; under a filled hero use `small` top spacing.
- Many large photos make a heavy page. Upload web-sized files and keep the count to what the page needs.
- For image-only walls, set captions in the media library so the lightbox still has something to show.

## Recipes

### Portfolio wall

An image-only wall of recent work. Supply eight to twelve photos in mixed orientations, strongest first.

```json
{
  "type": "masonry-gallery",
  "settings": { "eyebrow": "Portfolio", "title": "Selected work", "description": "", "heading_alignment": "start", "columns_desktop": 4, "gap": "small", "color_scheme": "standard-primary" },
  "blocks": [
    { "type": "item", "settings": {} },
    { "type": "item", "settings": {} },
    { "type": "item", "settings": {} },
    { "type": "item", "settings": {} },
    { "type": "item", "settings": {} },
    { "type": "item", "settings": {} },
    { "type": "item", "settings": {} },
    { "type": "item", "settings": {} }
  ]
}
```

### Labelled project showcase

Tiles with a project name and type under each, on a soft surface that frames the captions. Supply six to nine photos and a short name and category for every one.

```json
{
  "type": "masonry-gallery",
  "settings": { "title": "Recent projects", "description": "A selection of completed work.", "heading_alignment": "center", "alignment": "start", "columns_desktop": 3, "gap": "medium", "color_scheme": "standard-secondary" },
  "blocks": [
    { "type": "item", "settings": { "title": "Example kitchen", "category": "Residential" } },
    { "type": "item", "settings": { "title": "Sample office", "category": "Commercial" } },
    { "type": "item", "settings": { "title": "Placeholder garden", "category": "Landscape" } },
    { "type": "item", "settings": { "title": "Demo loft", "category": "Residential" } },
    { "type": "item", "settings": { "title": "Specimen cafe", "category": "Hospitality" } },
    { "type": "item", "settings": { "title": "Model studio", "category": "Commercial" } }
  ]
}
```

### Two-column editorial

Few, large pieces with a title only, each given room to breathe. Supply four to six photos with varied shapes; the generous gap makes each one feel significant.

```json
{
  "type": "masonry-gallery",
  "settings": { "eyebrow": "Selected work", "title": "", "heading_alignment": "start", "alignment": "start", "columns_desktop": 2, "gap": "large", "color_scheme": "standard-primary" },
  "blocks": [
    { "type": "item", "settings": { "title": "Example project one" } },
    { "type": "item", "settings": { "title": "Example project two" } },
    { "type": "item", "settings": { "title": "Example project three" } },
    { "type": "item", "settings": { "title": "Example project four" } }
  ]
}
```

### Dense inspiration board

A tight, image-only mosaic of materials, moods or details. Supply ten to fifteen photos; small ones are fine because the lightbox shows each in full.

```json
{
  "type": "masonry-gallery",
  "settings": { "title": "Inspiration", "heading_alignment": "center", "columns_desktop": 5, "gap": "small", "color_scheme": "standard-primary", "top_spacing": "small" },
  "blocks": [
    { "type": "item", "settings": {} },
    { "type": "item", "settings": {} },
    { "type": "item", "settings": {} },
    { "type": "item", "settings": {} },
    { "type": "item", "settings": {} },
    { "type": "item", "settings": {} },
    { "type": "item", "settings": {} },
    { "type": "item", "settings": {} },
    { "type": "item", "settings": {} },
    { "type": "item", "settings": {} }
  ]
}
```
