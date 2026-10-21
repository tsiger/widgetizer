# rich-text

## Purpose

A single column of headings, paragraphs, buttons and an optional countdown, with chosen width and alignment. It is Arch's standard inner-page opener and its general-purpose text section: intros, statements, long-form copy and calls to action.

Blocks stack vertically in the order given. A `heading` block becomes the page heading when the section opens the page, and a sub-heading anywhere else. A `text` block holds rich text and can be small, uppercase and muted, which is how Arch builds an eyebrow line above a heading. A `button` block carries one or two buttons side by side. An optional background `image` turns the section into a tinted band with `overlay_color` over the picture.

## When to use

- The default opener for every inner page whose header is transparent: a transparent header only works over `banner`, `slideshow` and `video-popup`, so `about`, `services`, `contact`, `news` and `projects` pages open with a `rich-text` title block instead (eyebrow text, big heading, one paragraph).
- Good for a page intro before a grid, a mission or manifesto, legal and policy copy (a `medium` column with lists in one `text` block), a promotional band, a closing call to action, a countdown to a launch.
- Bad for anything that needs columns, cards or media beside the text; use `split-content`, `image-text` or `card-grid`. For a hero with a photo use `banner`.
- Sits above almost anything. A grid that follows an unfilled `rich-text` opener takes `top_spacing` `none`, because the opener's own bottom margin already supplies the gap.
- Content: one heading, one to three short paragraphs and at most one `button` block. Long copy wants `content_width` `narrow` or `medium`; the column is for reading, not for walls of text.
- Fits every industry; it carries the brand voice more than any other section.

## Pitfalls

- Heading sizes `6xl` and up suit one-line statements only; a two-line heading at `7xl` fills a phone screen. Keep openers at `5xl` or `6xl` with five words or fewer, and body sub-headings at `2xl` or `3xl`.
- `text_alignment` `center` with `content_width` `wide` or `fullwidth` spreads short lines into an awkward ragged shape. Centre narrow or medium columns; keep wide ones left-aligned.
- Only one `button` block per section. The first button is the main action and should be `primary`; make `link_2` `secondary`. Two primaries compete.
- With a background `image` the section becomes filled and padded like a highlight band, the overlay default is a dark navy tint and the text turns light. A pale `overlay_color` with low opacity over a busy photo makes the text unreadable; keep the overlay dark or drop the image.
- A background image does not make the section a hero for the transparent header. The header stays opaque over it.
- Filled schemes (`standard-secondary`, `highlight-primary`, `highlight-secondary`) pad inside their own band, so `top_spacing` or `bottom_spacing` `none` removes padding inside the colour, not the gap to the neighbour. On an unfilled `standard-primary` section `none` really fuses it with the neighbour.
- Do not stack two highlight bands back to back, and keep a page to one or two highlights. The closing call-to-action band is the usual place for `highlight-primary`.
- A `countdown` block counts to `target_date` in the visitor's local time and shows `expired_message` afterwards; it does nothing else, so pair it with a heading and a button.
- Rich text in `text` blocks is for paragraphs, lists and emphasis. Put headings in `heading` blocks so the page outline stays correct.

## Recipes

### Inner-page opener

The standard title block for an inner page under a transparent header: eyebrow, large heading, one paragraph. No image needed.

```json
{
  "type": "rich-text",
  "settings": {
    "text_alignment": "start",
    "content_width": "wide",
    "color_scheme": "standard-primary"
  },
  "blocks": [
    { "type": "text", "settings": { "text": "<p>About us</p>", "size": "sm", "uppercase": true, "muted": true } },
    { "type": "heading", "settings": { "text": "Built around the people we serve.", "size": "6xl" } },
    { "type": "text", "settings": { "text": "<p>A short paragraph that says who you are, where you work and what visitors will find on this page.</p>", "size": "lg" } }
  ]
}
```

### Closing call to action

A highlight band at the end of a page with one heading and two buttons; the primary leads to `contact`.

```json
{
  "type": "rich-text",
  "settings": {
    "text_alignment": "center",
    "content_width": "medium",
    "color_scheme": "highlight-primary"
  },
  "blocks": [
    { "type": "heading", "settings": { "text": "Ready to talk it through?", "size": "4xl" } },
    { "type": "text", "settings": { "text": "<p>Tell us about the project and we will reply within two working days.</p>", "size": "lg" } },
    { "type": "button", "settings": { "link": { "text": "Get in touch", "href": "contact.html" }, "style": "primary", "link_2": { "text": "See our services", "href": "services.html" }, "style_2": "secondary", "size": "large" } }
  ]
}
```

### Mission statement

One quotable paragraph on a soft band, centred and narrow so it reads like a pull quote.

```json
{
  "type": "rich-text",
  "settings": {
    "text_alignment": "center",
    "content_width": "narrow",
    "color_scheme": "standard-secondary"
  },
  "blocks": [
    { "type": "text", "settings": { "text": "<p>Our promise</p>", "size": "sm", "uppercase": true, "muted": true } },
    { "type": "heading", "settings": { "text": "Good work, explained plainly, finished on time.", "size": "3xl" } },
    { "type": "text", "settings": { "text": "<p>Two or three sentences on what that promise means in practice for a customer.</p>", "size": "base", "muted": true } }
  ]
}
```

### Launch countdown

An announcement band with a live countdown and one button. Set `target_date` to the real launch moment.

```json
{
  "type": "rich-text",
  "settings": {
    "text_alignment": "center",
    "content_width": "medium",
    "color_scheme": "highlight-secondary"
  },
  "blocks": [
    { "type": "text", "settings": { "text": "<p>Opening soon</p>", "size": "sm", "uppercase": true } },
    { "type": "heading", "settings": { "text": "Doors open this spring", "size": "5xl" } },
    { "type": "countdown", "settings": { "target_date": "2027-01-01 00:00", "expired_message": "We are open!", "show_seconds": false } },
    { "type": "button", "settings": { "link": { "text": "Join the waiting list", "href": "contact.html" }, "style": "primary", "size": "large" } }
  ]
}
```
