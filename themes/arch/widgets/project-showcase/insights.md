# project-showcase

## Purpose

An image-led grid or carousel of hand-picked work: each tile is a photo with the project title and a one-line description laid over a dark gradient at the bottom, shown on hover or always. For portfolios, lookbooks and before-and-after galleries that do not need a detail page per item.

Each `project` block is one tile with its own `image`, `title`, `description` and optional `link`; with a link the whole tile is clickable. Tiles share one `aspect_ratio`, so the grid stays even whatever the source photos. Projects that live in the `projects` collection and need their own pages belong in `projects-grid` instead; this section is for curated tiles edited right here.

## When to use

- The proof section on `index` for a visual business, or the body of a `work`, `gallery` or `portfolio` page when there are no case-study pages.
- Good for 4 to 12 strong photographs with a short caption each: finished rooms, buildings, haircuts, cakes, cars, events, logos.
- Bad for text-heavy case studies (`projects-grid` or `card-grid`), for a loose photo wall without captions (`gallery`, `masonry-gallery`) and for one hero image (`image`, `banner`).
- Can open a page when it has a `title`, but presets open with `rich-text` and give the showcase `top_spacing` `none`. It never supports a transparent header; only `banner`, `slideshow` and `video-popup` do.
- Sits well after `rich-text` or `banner` and before `testimonials` or a call to action; photos followed by voices is the classic order.
- Needs images in one orientation shot in a similar style. A multiple of `columns_desktop` fills every row.
- Fits architects, interior designers, contractors, landscapers, photographers, salons, bakeries, tattoo studios, event venues.

## Pitfalls

- `text_display` defaults to `hover`, and touch screens never hover: on phones the tiles are pictures with no titles. Choose `always` whenever the title matters; keep `hover` for purely visual grids where the picture speaks.
- The overlay text is white over a dark gradient. Bright, light images at the bottom edge still carry it, but busy bottom edges fight the text; crop so the lower part of each image is calm.
- `description` is a subtitle of six to ten words. Longer text crowds the tile and gets cut on narrow cards.
- `aspect_ratio` `auto` keeps each image's natural shape and makes rows ragged. `contain` shows the whole image inside a fixed-height frame, leaving empty space around images of other shapes; use it only for logos or screenshots that must not be cropped. Fixed ratios crop to fit.
- A tile without an `image` shows a grey placeholder. Add all images before publishing, or remove the tile.
- `layout` `carousel` needs more tiles than `columns_desktop`, or the arrows sit disabled. Four or five columns in a carousel give a "peek" at the next tile that invites swiping.
- Two columns signal a few flagship projects; four or five signal volume. Pick by what the business wants to say, not by how many photos exist.
- Filled schemes draw the band behind the tiles; `highlight-primary` turns it into a dark gallery wall. `top_spacing` or `bottom_spacing` `none` on a filled showcase removes inner padding, not the gap to the neighbour; use `none` only directly under an unfilled `rich-text` opener.

## Recipes

### Flagship projects

Two large cinematic tiles per row for a firm that wants to look selective, titles always visible. Four wide images in 3:2.

```json
{
  "type": "project-showcase",
  "settings": {
    "eyebrow": "Selected work",
    "title": "Four projects we are proud of",
    "heading_alignment": "start",
    "layout": "grid",
    "columns_desktop": 2,
    "aspect_ratio": "3 / 2",
    "text_display": "always",
    "color_scheme": "standard-primary"
  },
  "blocks": [
    { "type": "project", "settings": { "title": "Hillside house", "description": "New build on a steep plot", "link": { "text": "Hillside house", "href": "work.html" } } },
    { "type": "project", "settings": { "title": "Corner café", "description": "Fit-out of a former bank", "link": { "text": "Corner café", "href": "work.html" } } },
    { "type": "project", "settings": { "title": "Garden studio", "description": "Timber workspace at the end of a garden", "link": { "text": "Garden studio", "href": "work.html" } } },
    { "type": "project", "settings": { "title": "Loft apartment", "description": "Open plan with a mezzanine", "link": { "text": "Loft apartment", "href": "work.html" } } }
  ]
}
```

### Square gallery wall

Six square tiles on a dark highlight band, captions on hover, for photographers and makers whose images speak for themselves.

```json
{
  "type": "project-showcase",
  "settings": {
    "eyebrow": "Portfolio",
    "title": "Recent work",
    "heading_alignment": "center",
    "layout": "grid",
    "columns_desktop": 3,
    "aspect_ratio": "1 / 1",
    "text_display": "hover",
    "color_scheme": "highlight-primary"
  },
  "blocks": [
    { "type": "project", "settings": { "title": "Spring wedding", "description": "Outdoor ceremony" } },
    { "type": "project", "settings": { "title": "Studio portraits", "description": "Natural light series" } },
    { "type": "project", "settings": { "title": "Harbour at dawn", "description": "Personal project" } },
    { "type": "project", "settings": { "title": "Family session", "description": "At home" } },
    { "type": "project", "settings": { "title": "Product launch", "description": "Event coverage" } },
    { "type": "project", "settings": { "title": "Winter market", "description": "Editorial" } }
  ]
}
```

### Lookbook carousel

Portrait tiles in a swipeable strip for salons, fashion and fitness; four visible, more to swipe. Eight or more portrait photos.

```json
{
  "type": "project-showcase",
  "settings": {
    "eyebrow": "Lookbook",
    "title": "This season's work",
    "heading_alignment": "center",
    "layout": "carousel",
    "columns_desktop": 4,
    "aspect_ratio": "3 / 4",
    "text_display": "always",
    "color_scheme": "standard-secondary"
  },
  "blocks": [
    { "type": "project", "settings": { "title": "Soft balayage", "description": "Low-maintenance colour" } },
    { "type": "project", "settings": { "title": "Textured crop", "description": "Short and easy" } },
    { "type": "project", "settings": { "title": "Bridal updo", "description": "Occasion styling" } },
    { "type": "project", "settings": { "title": "Copper gloss", "description": "Single-process colour" } },
    { "type": "project", "settings": { "title": "Curly cut", "description": "Shaped dry" } },
    { "type": "project", "settings": { "title": "Platinum", "description": "Full lightening" } }
  ]
}
```
