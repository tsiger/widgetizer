# gallery

## Purpose

A photo gallery: a grid or a scrolling carousel of images that open full-size in a lightbox, with optional captions revealed on hover. Use it to show work, spaces, products or events when the pictures are the content and nothing needs to link anywhere.

The grid can be uniform (every thumbnail cropped to the same ratio) or organic (native proportions with alternate columns dropped down). Visitors click any image to browse the whole set with arrow keys and captions.

## When to use

- The main section of a `gallery` or `portfolio` page, or a proof strip on a home, `about` or `services` page.
- Good for: portfolios, venues and rooms, finished jobs, dishes, team and event photos, product lookbooks. Bad for: images that should lead to their own pages (use `projects-grid` or `card-grid`), images needing always-visible text (use `card-grid` or `checkerboard`), a Pinterest-style column flow (use `masonry-gallery`).
- It can open a page: its title becomes the page heading when first. It cannot sit under a header with `transparent_on_hero`; only `banner`, `slideshow` and `video-popup` support the transparent header.
- Natural neighbours: `rich-text` or `banner` above, `testimonials` or `action-bar` below, a `trust-bar` after a compact proof strip.
- Needs at least as many images as columns; six to twelve is the sweet spot. Captions are optional.
- Fits photographers, architects and designers, builders and landscapers, restaurants, hotels and venues, salons, makers.

## Pitfalls

- Captions appear only on hover, so touch-screen visitors never see them until the lightbox opens. Treat captions as supplementary; information that matters belongs in a section that shows text permanently.
- A blank `caption` falls back to the caption stored with the image in the media library, so an unexpected caption usually comes from there. An `image` block with no photo shows a placeholder graphic on the published site; remove empty blocks.
- Every click opens the lightbox. On a page where you want visitors to move on to project pages, that slows them down; use a linking grid instead.
- `aspect_ratio` set to `auto` keeps native proportions and leaves ragged row bottoms unless `staggered` is on; `contain` fits each whole image into a fixed-height box, which letterboxes mixed shapes. Fixed ratios crop, and `1 / 1` at four or five columns is the most forgiving choice for mixed-quality photos.
- `staggered` is designed for the grid and only shows on tablet width and up; leave it off for `carousel`.
- The grid is two-up on tablets and one-up on phones, where every image is full width. Keep the image count a multiple of `columns_desktop` and remember that a 12-image gallery is 12 full-width photos on a phone.
- `carousel` uses `columns_desktop` as the number of visible slides. Two visible slides at `16 / 9` give a cinematic strip; more than three visible slides make a carousel pointless, use the grid.
- Any scheme other than `standard-primary` pads the grid inside its own coloured band, so `top_spacing` and `bottom_spacing` set to `none` remove that inner padding; under a filled hero use `small`. A highlight scheme makes the gallery a scroll landmark between text-heavy sections, but photos with their own strong colours can fight a dark band.

## Recipes

### Portfolio wall

Three columns, staggered, left-aligned heading, captions naming each project. The user supplies six to nine landscape project photos.

```json
{
  "type": "gallery",
  "settings": { "eyebrow": "Selected Work", "title": "Recent Projects", "heading_alignment": "start", "layout": "grid", "columns_desktop": 3, "staggered": true, "aspect_ratio": "4 / 3", "color_scheme": "standard-primary" },
  "blocks": [
    { "type": "image", "settings": { "caption": "Project one" } },
    { "type": "image", "settings": { "caption": "Project two" } },
    { "type": "image", "settings": { "caption": "Project three" } },
    { "type": "image", "settings": { "caption": "Project four" } },
    { "type": "image", "settings": { "caption": "Project five" } },
    { "type": "image", "settings": { "caption": "Project six" } }
  ]
}
```

### Product lookbook

Square crops in four tidy columns on the strongest surface. The user supplies eight square-friendly product or dish photos; captions carry the names.

```json
{
  "type": "gallery",
  "settings": { "eyebrow": "New Season", "title": "The Collection", "heading_alignment": "center", "layout": "grid", "columns_desktop": 4, "staggered": false, "aspect_ratio": "1 / 1", "color_scheme": "highlight-primary" },
  "blocks": [
    { "type": "image", "settings": { "caption": "Item one" } },
    { "type": "image", "settings": { "caption": "Item two" } },
    { "type": "image", "settings": { "caption": "Item three" } },
    { "type": "image", "settings": { "caption": "Item four" } }
  ]
}
```

### Cinematic carousel

Two wide slides visible at a time, docked under an opener. The user supplies five to seven wide photos (event recap, venue, landscapes).

```json
{
  "type": "gallery",
  "settings": { "title": "The Space", "heading_alignment": "center", "layout": "carousel", "columns_desktop": 2, "staggered": false, "aspect_ratio": "16 / 9", "color_scheme": "standard-primary", "top_spacing": "small" },
  "blocks": [
    { "type": "image", "settings": { "caption": "" } },
    { "type": "image", "settings": { "caption": "" } },
    { "type": "image", "settings": { "caption": "" } },
    { "type": "image", "settings": { "caption": "" } }
  ]
}
```

### Mixed proportions mosaic

Native proportions plus stagger for an editorial, curated feel. The user supplies eight or more photos of deliberately varied shapes.

```json
{
  "type": "gallery",
  "settings": { "eyebrow": "Behind the Scenes", "title": "Life at the Studio", "heading_alignment": "start", "layout": "grid", "columns_desktop": 4, "staggered": true, "aspect_ratio": "auto", "color_scheme": "standard-secondary" },
  "blocks": [
    { "type": "image", "settings": { "caption": "Placeholder scene" } },
    { "type": "image", "settings": { "caption": "Placeholder scene" } },
    { "type": "image", "settings": { "caption": "Placeholder scene" } },
    { "type": "image", "settings": { "caption": "Placeholder scene" } }
  ]
}
```

### Compact proof strip

Five squares, no captions, reduced spacing: shows volume of work without taking the page over. The user supplies exactly five photos.

```json
{
  "type": "gallery",
  "settings": { "eyebrow": "Our Work", "title": "", "layout": "grid", "columns_desktop": 5, "staggered": false, "aspect_ratio": "1 / 1", "color_scheme": "standard-primary", "top_spacing": "small", "bottom_spacing": "small" },
  "blocks": [
    { "type": "image", "settings": { "caption": "" } },
    { "type": "image", "settings": { "caption": "" } },
    { "type": "image", "settings": { "caption": "" } },
    { "type": "image", "settings": { "caption": "" } },
    { "type": "image", "settings": { "caption": "" } }
  ]
}
```
