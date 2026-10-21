# services-grid

## Purpose

Lists the site's offerings from the `services` collection as a grid of cards: icon or photo, title, price and duration, a short summary and a button to each service's own page. Use it for the `services` page and for a "what we do" teaser on the home page. The cards come from the collection, not from blocks.

Each card is one service item showing its `title`, `icon`, `summary`, `featured_image`, `price` and `duration`; the service page itself carries the long `description`, the `gallery` and the item's `cta_link`. Services are created and edited as collection items under Services, never inside this section; the section decides how many to show and how the cards look. `limit` caps the number of cards (0 shows every service), the order follows the manual order of the Services list (there is no sort setting), and `view_all_link` adds a button to the full listing page. In the editor the section gains two more switches: `listing_anchor` marks the one listing that service pages link back to and that holds the collection's address, and `paginate` splits the list into pages of `limit` cards. Only one section per page may paginate.

## When to use

- Two roles: a teaser on `index` (three or six services, `view_all_link` pointing at `services`) and the full list on the `services` page (`limit` 0, or `paginate` with a page size).
- Good for anything sold as a named offering with its own page: treatments, practice areas, trades, classes, consulting packages, menus of services.
- Bad for a flat price list without detail pages (`priced-list`), for hand-written feature cards that are not items (`card-grid`, `icon-card-grid`), and for case studies (`projects-grid`).
- Can open the `services` page when it has a `title`; open with `rich-text` first when the page needs an intro paragraph, then set `top_spacing` `none` on the grid. It never supports a transparent header; that is for `banner`, `slideshow` and `video-popup` only.
- Sits well after a `banner` or `rich-text` opener and before `steps`, `testimonials` or a closing `action-bar`.
- Needs at least one published service, otherwise only `empty_text` shows. Three or six services fill three columns without orphans; four or eight fill four.
- Fits clinics, dentists, salons and spas, law and accounting firms, trades and contractors, agencies, tutors, vets, photographers.

## Pitfalls

- `layout` `overlay` fills the card with the `featured_image`, paints the text over a dark gradient and makes the whole card the link. Every service then needs a strong photo; a service without one gets a placeholder picture. The icon is never shown in overlay.
- With `text_display` `hover` the overlay text appears only while the pointer is over the card, and touch screens never hover, so phone visitors see pictures without titles. Prefer `always`.
- `show_icon` and `show_read_more` only affect the `card` layout. In `card`, a service without a `featured_image` shows no image area at all, so a mix of services with and without photos gives cards of different heights; either give every service a photo or none.
- `aspect_ratio` `auto` lets each photo keep its own height, so rows turn ragged; pick a fixed ratio for a grid. Overlay ignores `auto` and uses 4:3.
- Price and duration share one line ("From 80 · 60 min"); fill both consistently across services or turn `show_price` and `show_duration` off so cards do not look half-filled. Prices are plain text, so write the currency yourself.
- Card height follows the `summary`. Keep every summary to one or two sentences.
- `view_all_link` moves with `heading_alignment`: top right beside the heading when `start`, centred below the grid when `center`. It disappears when its address is empty or the collection is empty. On the `services` page itself leave it empty.
- With `paginate` on, `limit` is the page size and must be at least 1. Put `paginate` and `listing_anchor` on the `services` page, not on the home-page teaser: the anchor is where each service page sends visitors back to.
- A blank `title` on a section that opens the page promotes the first service's name to the page heading. Give the section a title or open with `rich-text`.
- Filled schemes (`standard-secondary`, `highlight-primary`, `highlight-secondary`) pad inside their own band. `top_spacing` `none` on a filled grid removes that inner padding rather than the gap to the neighbour; use `none` only directly under an unfilled `rich-text` opener.

## Recipes

### Home-page teaser with icons

Three icon cards without photos and a view-all button beside the heading. Give every service an `icon`; no images needed.

```json
{
  "type": "services-grid",
  "settings": {
    "eyebrow": "What we do",
    "title": "Our services",
    "description": "Everything we offer, at a glance.",
    "heading_alignment": "start",
    "view_all_link": { "text": "View all services", "href": "services.html" },
    "layout": "card",
    "limit": 3,
    "columns_desktop": 3,
    "show_icon": true,
    "show_summary": true,
    "show_price": false,
    "show_duration": false,
    "read_more_text": "Learn more",
    "icon_style": "filled",
    "icon_size": "lg",
    "icon_shape": "rounded",
    "color_scheme": "standard-primary"
  }
}
```

### Full services page

The `services` page listing under a `rich-text` opener: every service, photo cards with price and duration, the anchor that service pages return to. Each service needs a landscape `featured_image`.

```json
{
  "type": "services-grid",
  "settings": {
    "title": "",
    "description": "",
    "heading_alignment": "start",
    "layout": "card",
    "limit": 0,
    "columns_desktop": 3,
    "aspect_ratio": "4 / 3",
    "show_icon": false,
    "show_summary": true,
    "show_price": true,
    "show_duration": true,
    "read_more_text": "View service",
    "listing_anchor": true,
    "color_scheme": "standard-primary",
    "top_spacing": "none"
  }
}
```

### Photo overlay wall

Six square photo tiles with the title and price over the image, as a highlight band on the home page. Every service needs a strong `featured_image`, since the picture is the card.

```json
{
  "type": "services-grid",
  "settings": {
    "eyebrow": "Treatments",
    "title": "Choose your treatment",
    "heading_alignment": "center",
    "view_all_link": { "text": "All treatments", "href": "services.html" },
    "layout": "overlay",
    "text_display": "always",
    "limit": 6,
    "columns_desktop": 3,
    "aspect_ratio": "1 / 1",
    "show_summary": false,
    "show_price": true,
    "show_duration": true,
    "color_scheme": "highlight-primary"
  }
}
```

### Paginated catalogue

A long list of services split into pages of eight, four to a row, on the `services` page. Give each service a `featured_image` in 3:2.

```json
{
  "type": "services-grid",
  "settings": {
    "title": "All services",
    "heading_alignment": "center",
    "layout": "card",
    "limit": 8,
    "columns_desktop": 4,
    "aspect_ratio": "3 / 2",
    "show_icon": false,
    "show_summary": true,
    "show_price": true,
    "show_duration": false,
    "read_more_text": "Details",
    "listing_anchor": true,
    "paginate": true,
    "color_scheme": "standard-primary"
  }
}
```

