# news-grid

## Purpose

Lists articles from the `news` collection as a card grid: featured image, date, title, excerpt and a read-more button per article, plus an optional view-all button. For the blog or press page and a "latest news" teaser on the home page. Cards come from the collection, not blocks.

Each card is one article, showing its `featured_image`, `date`, `title` and `excerpt` and linking to the article's own page, where the `body` appears. Articles are created and edited as collection items under News, never inside this section; the section only decides how many to show, in which order and how the cards look. `limit` caps the number of cards (0 shows every article), `sort` orders them by date or title, and `view_all_link` adds a button to the full listing page. In the editor the section gains two more switches: `listing_anchor` marks the one listing that article pages link back to and that holds the collection's address, and `paginate` splits the collection into pages of `limit` cards. Only one section per page may paginate.

## When to use

- Two roles: a short teaser on `index` (three newest articles, `view_all_link` pointing at `news`) and the archive on the `news` page (`limit` 0, or `paginate` with a page size).
- Good for dated content: blog posts, press releases, announcements, event recaps, newsletters.
- Bad for evergreen content. Case studies belong in `projects-grid`, offerings in `services-grid`, hand-written cards that are not collection items in `card-grid`.
- Can open a page when it has a `title`; most Arch presets open `news` with it directly. Open with `rich-text` first when the page needs an intro paragraph, then set `top_spacing` to `none` on the grid. It never supports a transparent header; only `banner`, `slideshow` and `video-popup` do.
- Sits well after a `rich-text` opener or a `banner`, and before a closing call to action such as `action-bar`.
- Needs at least one article, otherwise only `empty_text` shows. Three or six articles fill a three-column grid without orphans; `columns_desktop` 1 turns it into a centred blog feed.
- Fits any business that publishes regularly: clinics, firms, schools, nonprofits, agencies.

## Pitfalls

- `layout` `overlay` paints white text over a dark gradient on the image and makes the whole card the link. With `text_display` `hover` the text stays hidden until the pointer is over the card, and touch screens never hover, so phone visitors see pictures with no titles. Prefer `always`.
- `show_image` and `show_read_more` only affect the `card` layout. Overlay always shows the image (a placeholder when the article has none) and never a button.
- `aspect_ratio` `auto` lets every image keep its own height, so rows turn ragged; pick a fixed ratio for a grid. Overlay ignores `auto` and uses 4:3.
- `view_all_link` moves with `heading_alignment`: top right of the heading when `start`, centred below the grid when `center`. It hides when its address or the collection is empty.
- Card height follows the article `excerpt`. Keep every excerpt to one or two sentences, or rows become uneven; overlay crops long excerpts.
- With `paginate` on, `limit` is the page size; `limit` 0 means everything on one page. Put `paginate` and `listing_anchor` on the archive page, not on the home-page teaser: the anchor is where article pages send readers back to.
- A blank `title` on a section that opens the page promotes the first article's title to the page heading. Give the section a title or open with `rich-text`.
- `sort` by date needs a `date` on every article; undated articles land unpredictably.
- Filled schemes (`standard-secondary`, `highlight-primary`, `highlight-secondary`) pad inside their own band and draw a border around cards. `top_spacing` `none` on a filled grid removes that inner padding rather than the gap to the neighbour; use `none` only directly under an unfilled `rich-text` opener.

## Recipes

### Latest news teaser

Home-page teaser with the three newest articles and a view-all button beside the heading. Each article needs a landscape `featured_image`.

```json
{
  "type": "news-grid",
  "settings": {
    "eyebrow": "From the blog",
    "title": "Latest news",
    "description": "Short updates from the team.",
    "heading_alignment": "start",
    "view_all_link": { "text": "View all news", "href": "news.html" },
    "layout": "card",
    "limit": 3,
    "sort": "date_desc",
    "columns_desktop": 3,
    "aspect_ratio": "16 / 9",
    "read_more_text": "Read article",
    "color_scheme": "standard-primary"
  }
}
```

### Paginated archive

The `news` page listing under a `rich-text` opener: no heading of its own, nine articles per page, the anchor article pages return to. Supply a `featured_image` on every article.

```json
{
  "type": "news-grid",
  "settings": {
    "title": "",
    "description": "",
    "heading_alignment": "start",
    "layout": "card",
    "limit": 9,
    "sort": "date_desc",
    "columns_desktop": 3,
    "aspect_ratio": "3 / 2",
    "listing_anchor": true,
    "paginate": true,
    "color_scheme": "standard-primary",
    "top_spacing": "none"
  }
}
```

### Single-column blog feed

A reading-first feed: one wide card per row at a comfortable measure, every article on one page. Wide images work best.

```json
{
  "type": "news-grid",
  "settings": {
    "title": "Journal",
    "description": "Notes, essays and announcements.",
    "heading_alignment": "center",
    "layout": "card",
    "limit": 0,
    "sort": "date_desc",
    "columns_desktop": 1,
    "aspect_ratio": "16 / 9",
    "show_read_more": false,
    "color_scheme": "standard-primary"
  }
}
```

### Overlay story wall

A visual band of six square tiles with the date and title over the image, as a highlight section. Every article needs a strong `featured_image`, since the picture is the card.

```json
{
  "type": "news-grid",
  "settings": {
    "eyebrow": "Stories",
    "title": "What we have been up to",
    "heading_alignment": "center",
    "view_all_link": { "text": "All stories", "href": "news.html" },
    "layout": "overlay",
    "text_display": "always",
    "limit": 6,
    "sort": "date_desc",
    "columns_desktop": 3,
    "aspect_ratio": "1 / 1",
    "show_excerpt": false,
    "color_scheme": "highlight-primary"
  }
}
```
