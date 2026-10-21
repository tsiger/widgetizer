# projects-grid

## Purpose

Lists case studies from the `projects` collection as a card grid: featured image, title, client and year, summary and a view-project button per project, plus an optional view-all button. For the portfolio page and a "selected work" teaser on the home page. Cards come from the collection, not blocks.

Each card is one project, showing its `featured_image` (only when one is set), `title`, a client and year line from `client` and `year`, and the `summary`, linking to the project's own page where the `gallery`, `description` and `external_url` appear. Projects are created, edited and ordered as collection items under Projects, never inside this section; the grid follows the collection's manual order and has no sort setting of its own. `limit` caps the number of cards (0 shows every project) and `view_all_link` adds a button to the full listing page. In the editor the section gains two more switches: `listing_anchor` marks the one listing that project pages link back to and that holds the collection's address, and `paginate` splits the collection into pages of `limit` cards. Only one section per page may paginate.

## When to use

- Two roles: a teaser on `index` (six selected projects, `view_all_link` pointing at the `projects` or `work` page) and the full listing on that page (`limit` 0, or `paginate`).
- Good for work that deserves its own page: renovations, builds, campaigns, websites, installations, before-and-after jobs.
- Bad for a quick image mosaic without detail pages; use `project-showcase` for hand-picked tiles or `gallery` for pure photography. Dated posts belong in `news-grid`.
- Can open a page when it has a `title`, but presets usually open the listing page with `rich-text` and give the grid no heading. It never supports a transparent header; only `banner`, `slideshow` and `video-popup` do.
- Sits well after a `rich-text` opener or a `banner`, and before social proof (`testimonials`) or a closing `action-bar`.
- Needs projects with a `featured_image`: a card without one shows text only, which looks uneven beside illustrated cards. Six or nine projects fill a three-column grid without orphans.
- Fits contractors, architects, interior designers, landscapers, agencies and photographers.

## Pitfalls

- Order comes from the collection. Reorder projects under Projects when the grid shows the wrong one first; nothing in the section changes it.
- `layout` `overlay` paints white text over a dark gradient on the image and makes the whole card the link. With `text_display` `hover` the text appears only under a pointer, so phone visitors see unlabelled pictures. Prefer `always`.
- `show_read_more` and the `read_more_text` button only exist in the `card` layout. Overlay always shows a picture, using a placeholder when the project has none.
- The client and year line disappears when both `show_client` and `show_year` are off or the project has neither; one project without a `client` makes its card shorter than the rest.
- `aspect_ratio` `auto` keeps each image's own height and makes rows ragged. Portfolios look best with one fixed ratio across all cards: 4:3 for interiors and builds, 3:2 for photography, square for a tile wall.
- Card height follows the project `summary`. Keep every summary to one sentence.
- `view_all_link` sits top right of the heading when `heading_alignment` is `start` and centred below the grid when `center`; it is hidden when the address or the collection is empty.
- With `paginate` on, `limit` is the page size. Put `paginate` and `listing_anchor` on the listing page, not on the home-page teaser: the anchor is where project pages send visitors back to.
- A blank `title` on a section that opens the page promotes the first project's title to the page heading. Give the section a title or open with `rich-text`.
- Filled schemes pad inside their own band and draw a border around cards. `top_spacing` `none` on a filled grid removes that inner padding rather than the gap to the neighbour; use `none` only directly under an unfilled `rich-text` opener.

## Recipes

### Selected work teaser

Home-page teaser with six projects and a view-all button beside the heading. Every project needs a `featured_image` in the same orientation.

```json
{
  "type": "projects-grid",
  "settings": {
    "eyebrow": "Our work",
    "title": "Selected projects",
    "description": "A few recent jobs, start to finish.",
    "heading_alignment": "start",
    "view_all_link": { "text": "View all projects", "href": "projects.html" },
    "layout": "card",
    "limit": 6,
    "columns_desktop": 3,
    "aspect_ratio": "4 / 3",
    "show_summary": true,
    "show_client": true,
    "show_year": true,
    "read_more_text": "View project",
    "color_scheme": "standard-primary"
  }
}
```

### Full portfolio page

The listing on the `projects` page under a `rich-text` opener: no heading, twelve projects per page, the anchor project pages return to.

```json
{
  "type": "projects-grid",
  "settings": {
    "title": "",
    "description": "",
    "heading_alignment": "start",
    "layout": "card",
    "limit": 12,
    "columns_desktop": 3,
    "aspect_ratio": "4 / 3",
    "listing_anchor": true,
    "paginate": true,
    "color_scheme": "standard-primary",
    "top_spacing": "none"
  }
}
```

### Image-first overlay wall

Four square tiles per row with the title and client over the image, every project on one page. Needs a strong `featured_image` on every project.

```json
{
  "type": "projects-grid",
  "settings": {
    "title": "Portfolio",
    "heading_alignment": "center",
    "layout": "overlay",
    "text_display": "always",
    "limit": 0,
    "columns_desktop": 4,
    "aspect_ratio": "1 / 1",
    "show_summary": false,
    "show_year": false,
    "color_scheme": "standard-primary"
  }
}
```

### Two large case studies

Two wide cards for a firm with few flagship projects, on a soft band with the summary doing the selling. Wide, cinematic images.

```json
{
  "type": "projects-grid",
  "settings": {
    "eyebrow": "Case studies",
    "title": "Two projects, in depth",
    "heading_alignment": "center",
    "view_all_link": { "text": "See all case studies", "href": "work.html" },
    "layout": "card",
    "limit": 2,
    "columns_desktop": 2,
    "aspect_ratio": "16 / 9",
    "show_client": false,
    "read_more_text": "Read the case study",
    "color_scheme": "standard-secondary"
  }
}
```
