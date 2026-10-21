# action-bar

## Purpose

A single-row call to action: a short headline and one line of text on the left, one or two buttons on the right. The compact closer that sends a visitor to the `contact` page, a booking link or a quote request after the content has made its case.

On phones the row stacks and centres. Text blocks follow their block order on the left; the `button` block always goes to the right, whatever position it has. With the default `highlight-primary` scheme it is a coloured band; an optional background photo with the overlay turns it into a small image strip.

## When to use

- The closing conversion of a page: last section before the footer, or right after the section that answers the final objection (`accordion`, `pricing`, `comparison-table`).
- Good for one clear next step. Bad for explaining anything: with more than a headline and one sentence it stops being a bar. Use `banner` for a tall, multi-block call to action.
- Never a page opener.
- Sits well after `testimonials`, `accordion`, `pricing` or a `card-grid`; on a `services` page it can also bridge two content sections as a low-key nudge on `standard-primary`.
- Needs almost no content: a headline of up to about sixty characters, one sentence, one or two button labels. The user must supply a photo only for the image variant.
- Fits every service business, clinics, studios, trades, agencies, restaurants (reservations) and software (free trial).

## Pitfalls

- The default scheme makes it one of the page's one or two highlight sections. Do not place it directly under another highlight or image section (a `banner` closer, a `testimonial-hero`); separate them with a standard surface, or switch this bar to `standard-secondary`.
- On `standard-primary` with no image it has no band at all and reads as a plain text row. That is fine for a soft informational strip, but it will not feel like a call to action.
- A long headline wraps and squeezes the buttons into a narrow column. Keep the heading to one line at `2xl`; sizes of `3xl` and above are for a few promotional words only.
- Two buttons should be one `primary` and one `secondary`; two primaries compete. Add the second button only for a genuinely different path (call versus email).
- The `text` block is muted by default so the headline leads. Turn `muted` off only when the sentence carries the essential information (a date, an address). `uppercase` suits a short tag, not a sentence.
- `fullwidth` stretches the row to the viewport; the contained version almost always looks better.
- With a background image the overlay sits between photo and text; a light photo needs the overlay kept dark or the white text disappears.
- As a filled band, its spacing is padding inside the band. The section below needs its own `top_spacing`; set this bar's `top_spacing` to `none` only to fuse it with a same-scheme neighbour above.

## Recipes

### Closing call to action

The standard page closer: headline, one sentence, one button to the `contact` page.

```json
{
  "type": "action-bar",
  "settings": { "color_scheme": "highlight-primary", "fullwidth": false },
  "blocks": [
    { "type": "heading", "settings": { "text": "Ready to talk it through?", "size": "2xl" } },
    { "type": "text", "settings": { "text": "<p>Tell us about your project and we will reply within one working day.</p>", "size": "base", "muted": true } },
    { "type": "button", "settings": { "link": { "text": "Get in touch", "href": "contact.html" }, "style": "primary", "size": "medium" } }
  ]
}
```

### Two paths

Headline plus a primary and a secondary button for visitors who prefer different channels. Use the alternate highlight surface when `highlight-primary` is already taken on the page.

```json
{
  "type": "action-bar",
  "settings": { "color_scheme": "highlight-secondary" },
  "blocks": [
    { "type": "heading", "settings": { "text": "Book a visit or ask a question", "size": "3xl" } },
    { "type": "button", "settings": { "link": { "text": "Book online", "href": "contact.html" }, "style": "primary", "link_2": { "text": "Call (555) 010-0100", "href": "tel:+15550100100" }, "style_2": "secondary", "size": "large" } }
  ]
}
```

### Quiet notice

An informational strip with no button: new hours, a seasonal closure, a relocation. Soft surface, small type.

```json
{
  "type": "action-bar",
  "settings": { "color_scheme": "standard-secondary" },
  "blocks": [
    { "type": "heading", "settings": { "text": "New opening hours from next month", "size": "lg" } },
    { "type": "text", "settings": { "text": "<p>We are open Tuesday to Saturday, 9 to 6. Closed on public holidays.</p>", "size": "sm", "muted": true } }
  ]
}
```

### Mid-page nudge

A low-contrast row between two content sections that points to a secondary page without shouting. Unfilled, so it inherits the page surface.

```json
{
  "type": "action-bar",
  "settings": { "color_scheme": "standard-primary", "top_spacing": "small", "bottom_spacing": "small" },
  "blocks": [
    { "type": "heading", "settings": { "text": "Curious how we work?", "size": "xl" } },
    { "type": "button", "settings": { "link": { "text": "See our process", "href": "about.html" }, "style": "secondary", "size": "small" } }
  ]
}
```
