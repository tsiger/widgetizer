# testimonials

## Purpose

A wall of customer quotes: a headed section showing several reviews at once as cards in a grid or a scrolling carousel, each with optional stars, a small round avatar, the name and a role line. It is the section for volume of proof, where many voices matter more than any one of them.

Cards share one height per row and the author row sits at the bottom, so a row of quotes reads as a tidy set even when the quotes differ a little in length.

## When to use

- The main social-proof section of a homepage or a dedicated reviews page, usually two thirds of the way down, before the closing call to action.
- Good for four to eight short reviews with names and roles. Bad for one long story (use `testimonial-hero`) or for one quote at a time (`testimonial-slider`).
- Can open a page: its `title` becomes the page heading, so a reviews page may start with it, but under a header with `transparent_on_hero` the page should still open with `rich-text` or `split-content`.
- Natural neighbours are `logo-cloud`, `key-figures` and `trust-bar` before it and `action-bar` or `core-form` after it.
- Needs at least as many `quote` blocks as `columns_desktop`, ideally a full multiple so the last row is complete; quotes of one to three sentences each.
- Fits almost every industry: shops, restaurants, clinics, trades, agencies, courses, software.

## Pitfalls

- `columns_desktop` at 4 or 5 makes narrow cards; a three-sentence quote then becomes a tall column and the whole row stretches to match. Three columns suit two-sentence quotes; four or five suit one-liners with stars.
- Fill complete rows: six quotes for three columns, eight for four. A grid with a lone card on the last row looks unfinished.
- In `carousel` layout `columns_desktop` sets how many cards are visible at once and the rest scroll with the arrows, so a carousel needs more cards than columns to make sense; with fewer the arrows do nothing.
- `card_layout` `box` draws bordered cards; `flat` removes the card frame and relies on spacing, which suits long editorial quotes and fewer columns. On `standard-secondary` and `highlight-secondary` the boxed cards also pick up a tinted background.
- The quote is plain text, not rich text. Line breaks and formatting are not kept.
- `rating` left blank hides the stars for that card; mixing starred and unstarred cards in one grid looks inconsistent, so decide once for the whole section.
- Avatars are cropped to small circles. Use close-up faces or leave `avatar` empty on every card; one missing avatar in a row of faces stands out.
- Filled schemes pad inside their own band. `top_spacing` or `bottom_spacing` set to `none` on a highlight section removes that inner padding; use `none` only to fuse with a same-scheme band.
- The section heading is optional. Leaving `title`, `eyebrow` and `description` blank gives a bare grid, which works when a `rich-text` section above already introduces it.

## Recipes

### Classic wall of love

Three columns on the soft surface with headshots and stars, for a homepage proof section. Add three more `quote` blocks for a second full row. The user supplies the quotes, names, roles and headshots.

```json
{
  "type": "testimonials",
  "settings": {
    "eyebrow": "Reviews",
    "title": "What customers say",
    "heading_alignment": "center",
    "layout": "grid",
    "columns_desktop": 3,
    "card_layout": "box",
    "color_scheme": "standard-secondary"
  },
  "blocks": [
    { "type": "quote", "settings": { "quote": "A short quote from a customer goes here.", "name": "Customer name", "title": "Role, company", "rating": "5" } },
    { "type": "quote", "settings": { "quote": "A short quote from a customer goes here.", "name": "Customer name", "title": "Role, company", "rating": "4" } },
    { "type": "quote", "settings": { "quote": "A short quote from a customer goes here.", "name": "Customer name", "title": "Role, company", "rating": "5" } }
  ]
}
```

### Star-rated review carousel

One-sentence reviews, four visible at a time and the rest behind the arrows, for shops and booking sites where the stars matter most. The user supplies six to eight very short quotes with names; no avatars.

```json
{
  "type": "testimonials",
  "settings": {
    "title": "Rated by our customers",
    "layout": "carousel",
    "columns_desktop": 4,
    "card_layout": "box",
    "color_scheme": "standard-primary"
  },
  "blocks": [
    { "type": "quote", "settings": { "quote": "A one-sentence quote goes here.", "name": "Customer name", "title": "Role, company", "rating": "5" } },
    { "type": "quote", "settings": { "quote": "A one-sentence quote goes here.", "name": "Customer name", "title": "Role, company", "rating": "5" } },
    { "type": "quote", "settings": { "quote": "A one-sentence quote goes here.", "name": "Customer name", "title": "Role, company", "rating": "4" } },
    { "type": "quote", "settings": { "quote": "A one-sentence quote goes here.", "name": "Customer name", "title": "Role, company", "rating": "5" } },
    { "type": "quote", "settings": { "quote": "A one-sentence quote goes here.", "name": "Customer name", "title": "Role, company", "rating": "5" } }
  ]
}
```

### Editorial client stories

Two columns of longer quotes without cards or stars on the strongest surface, for portfolio and case-study pages. The user supplies two or four story-style quotes with names and companies.

```json
{
  "type": "testimonials",
  "settings": {
    "eyebrow": "Client stories",
    "title": "In their words",
    "heading_alignment": "start",
    "layout": "grid",
    "columns_desktop": 2,
    "card_layout": "flat",
    "color_scheme": "highlight-primary"
  },
  "blocks": [
    { "type": "quote", "settings": { "quote": "A longer, story-style quote from a customer goes here, with one concrete detail.", "name": "Customer name", "title": "Role, company", "rating": "" } },
    { "type": "quote", "settings": { "quote": "A longer, story-style quote from a customer goes here, with one concrete detail.", "name": "Customer name", "title": "Role, company", "rating": "" } }
  ]
}
```
