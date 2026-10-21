# image-text

## Purpose

The theme's everyday split section: a photo on one side and a stack of content blocks on the other, from heading, text and buttons to a feature list, an icon, a star rating, numbered steps, a countdown or a small inline image. Use it for any "one picture, one message" moment: an about story, a service detail, a feature explanation.

On desktop the halves sit side by side; on phones the image stacks above the text. With `content_color_scheme` at `none` the text sits directly on the section surface and the photo keeps its natural shape in a thin rounded frame. With a scheme chosen, the text gets its own padded panel and, on desktop, photo and panel lock together edge to edge with square corners, the image cropped to the panel's height, like a magazine spread.

## When to use

- Role: the flexible body section that does most of a page's explaining, used once or several times in alternating directions.
- Good for: nearly every industry; an `about` story, one section per service, a feature walk-through, a how-it-works list with numbered steps, a featured review, an event with a countdown.
- Bad for: several equal items (`card-grid`, `image-tabs`), a hero (`banner`), text-only passages (`rich-text`), the overlapping-card look (`image-callout`).
- Opening a page: fine for inner pages, since the `heading` block becomes the page title when the section is first. It does not support the header's transparent mode, which only `banner`, `slideshow` and `video-popup` support.
- Natural neighbours: another `image-text` with the opposite `image_position`, `key-figures`, `testimonials`, `action-bar`.
- Content needed: one photo, a heading of up to eight words, 40 to 100 words of text, optionally a button or two.

## Pitfalls

- With a content panel the photo is cropped to the panel's height; long text means a heavily cropped picture. Keep the subject centred and the text under about 100 words.
- Without a panel the photo shows at its natural ratio, so a tall portrait beside a short column leaves empty space; `text_position` then aligns the text to the top, middle or bottom of the image.
- `content_color_scheme` equal to `color_scheme` gives an invisible panel that still removes the frame and the gap; choose a contrasting surface or leave it at `none`. A highlight panel counts as one of the page's one or two highlight moments.
- A `color_scheme` other than `standard-primary` makes the section a filled band whose spacing is padding inside its colour; the panel alone does not.
- Label pattern: a `text` block with `size` `sm`, `muted` and `uppercase` above the `heading`, two or three words. Headings above `3xl` wrap badly in a half-width column.
- `features` lines starting with `+` get a check, `-` a cross, plain lines no icon; five lines at most. `numbered-item` blocks number themselves in order; three or four fit beside a photo.
- The `countdown` block takes `target_date` as year-month-day and 24-hour time, for example "2027-06-01 18:00", read in the visitor's local time; afterwards it shows `expired_message`.
- The inline `image` block is for a logo, badge or signature at 10 to 25 percent `width`, not a second photo. A `rating` block shows stars only; add a `text` block saying who is rating what.
- In the `button` block the second link appears only when it has text, and `small` is the standard button size.
- When stacking two of these, alternate `image_position`; fuse them with `none` on the touching edges only when both are unfilled.

## Recipes

### About story

Founder or company story with a label, heading, paragraph and a quiet button. Supply one landscape or square photo of the people or the place.

```json
{
  "type": "image-text",
  "settings": { "image_position": "end", "text_position": "center", "color_scheme": "standard-primary", "content_color_scheme": "none" },
  "blocks": [
    { "type": "text", "settings": { "text": "<p>Our story</p>", "size": "sm", "muted": true, "uppercase": true } },
    { "type": "heading", "settings": { "text": "How the business began", "size": "2xl" } },
    { "type": "text", "settings": { "text": "<p>Two or three sentences about the founding, the people and what they set out to do.</p>", "size": "base" } },
    { "type": "button", "settings": { "link": { "text": "Meet the team", "href": "about.html" }, "style": "secondary", "size": "medium" } }
  ]
}
```

### Service with benefits

One service explained with a short pitch, a check list and two buttons. Supply a landscape photo of the service being delivered.

```json
{
  "type": "image-text",
  "settings": { "image_position": "start", "text_position": "center", "color_scheme": "standard-secondary", "content_color_scheme": "none" },
  "blocks": [
    { "type": "heading", "settings": { "text": "A service that fits your day", "size": "2xl" } },
    { "type": "text", "settings": { "text": "<p>One or two sentences on what the service is and the outcome it delivers.</p>", "size": "base" } },
    { "type": "features", "settings": { "features": "+ Fixed, written quote\n+ Flexible appointment times\n+ Tidy, insured team" } },
    { "type": "button", "settings": { "link": { "text": "Book a visit", "href": "contact.html" }, "style": "primary", "link_2": { "text": "All services", "href": "services.html" }, "style_2": "secondary", "size": "medium" } }
  ]
}
```

### How it works in three steps

Numbered steps beside a photo, aligned to the top so the list reads from the image's top edge. Supply a portrait or square photo.

```json
{
  "type": "image-text",
  "settings": { "image_position": "end", "text_position": "flex-start", "color_scheme": "standard-primary", "content_color_scheme": "none" },
  "blocks": [
    { "type": "heading", "settings": { "text": "Three steps from enquiry to done", "size": "2xl" } },
    { "type": "numbered-item", "settings": { "title": "Tell us what you need", "description": "A short line on the first step.", "size": "medium", "shape": "circle" } },
    { "type": "numbered-item", "settings": { "title": "Get a plan and a quote", "description": "A short line on the second step.", "size": "medium", "shape": "circle" } },
    { "type": "numbered-item", "settings": { "title": "We do the work", "description": "A short line on the third step.", "size": "medium", "shape": "circle" } }
  ]
}
```

### Featured review card

A star rating and a pull quote on a highlight panel locked to the photo. Supply a landscape photo of the finished work; this is a highlight moment, so use it once per page.

```json
{
  "type": "image-text",
  "settings": { "image_position": "start", "text_position": "center", "color_scheme": "standard-primary", "content_color_scheme": "highlight-primary" },
  "blocks": [
    { "type": "rating", "settings": { "rating": "5" } },
    { "type": "heading", "settings": { "text": "A short quote from a client goes here, one or two lines long.", "size": "xl" } },
    { "type": "text", "settings": { "text": "<p>Customer name, Example City</p>", "size": "sm", "muted": true } }
  ]
}
```
