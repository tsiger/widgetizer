# split-hero

## Purpose

A tall hero split in two: a photograph fills one half edge to edge, and a stack of blocks (label, heading, text, feature list, buttons, countdown, rating) sits vertically centred in the other. It opens a page with a photo and a message side by side instead of text over an image.

The photo half is a background fill, cropped to the half's height, with an optional tint from `overlay_color`. The content half takes the section's colour scheme. On phones the photo sits on top and the content follows.

## When to use

- A page opener for `index` or a landing page, and a strong mid-page story section on `about` or `services`.
- Good for businesses with one hero-worthy photo and a message that needs more than a headline: a short paragraph, three benefits, two buttons. Also for launches and events, where the `countdown` block gives it a reason to exist.
- Bad for text over a photo (`banner`), for several rotating messages (`slideshow`), and for small photo-and-text sections mid-page (`image-text`, which is lighter).
- It never engages the transparent header. Under `transparent_on_hero` the header simply stays solid above it, which makes split-hero a safe opener on any page, with or without a photo.
- Natural neighbours: `trust-bar` or `logo-cloud` with `top_spacing` `small` right under it, then `services-grid`, `card-grid` or `steps`.
- Needs one excellent photo and three to five blocks. It fills most of a laptop screen, so one per page is the rule.
- Fits consultancies, clinics, architects, trades, software and product launches, schools, event pages.

## Pitfalls

- The photo half is cropped, hard: tall and narrow on desktop, short and wide on phones. The subject must sit near the centre with room around it; a face at the edge or a product at the bottom is cut on one screen size or the other. Wide group photos and images with text do not survive.
- No `image` leaves a placeholder photo in the hero. Always supply one.
- `color_scheme` colours only the content half. A highlight scheme gives the hero a dark text half beside the photo; `standard-primary` keeps it light. The photo half never changes colour, so check the seam between a dark scheme and a bright photo.
- `overlay_color` is off by default; the photo shows as shot. Add a tint only to tame a busy or very bright photo, and keep it light, since there is no text over the photo to protect.
- The content column is vertically centred, so a long stack of blocks makes the hero taller than the screen and the photo stretches with it. Five blocks is plenty; one heading, one paragraph, one button block is the classic.
- `heading` at `5xl` or above fits two or three words beside a photo; `2xl` to `4xl` suits a sentence-length heading. A secondary split-hero deeper on a page should drop a size or two below the opener.
- `text` with `sm`, `uppercase` and `muted` makes a label above the heading; use one label, not several.
- `features` lines starting with a plus sign get a check mark, lines starting with a minus sign get a cross. Three to five short lines; long lines wrap awkwardly in half the width.
- `countdown` needs `target_date` written as year-month-day and time, for example 2027-03-15 09:00. Once the date passes only `expired_message` shows, so plan to replace the block.
- `button` defaults to the secondary style; set `style` to `primary` for the main action. Two buttons share one size.
- `top_spacing` `none` is right only for a first section the page should start with flush; otherwise leave `auto`. Filled schemes pad inside the content half, so `none` there removes inner padding rather than the gap to a neighbour.

## Recipes

### Home-page welcome

The classic opener: label, heading, two sentences, primary and secondary buttons, photo on the left. Supply one upright or square photo with a centred subject.

```json
{
  "type": "split-hero",
  "settings": {
    "image_position": "start",
    "color_scheme": "standard-primary",
    "top_spacing": "none"
  },
  "blocks": [
    { "type": "text", "settings": { "text": "<p>Family dental care</p>", "size": "sm", "uppercase": true, "muted": true } },
    { "type": "heading", "settings": { "text": "Gentle dentistry for every age", "size": "4xl" } },
    { "type": "text", "settings": { "text": "<p>Same-week appointments, clear prices and a team that explains everything before it happens.</p>", "size": "base" } },
    { "type": "button", "settings": { "link": { "text": "Book a visit", "href": "contact.html" }, "style": "primary", "link_2": { "text": "Our services", "href": "services.html" }, "style_2": "secondary", "size": "medium" } }
  ]
}
```

### Benefits beside a team photo

Mid-page on `services` or `about`: a short heading, a check-marked list of reasons and one button, photo on the right. Supply a warm team or workplace photo.

```json
{
  "type": "split-hero",
  "settings": {
    "image_position": "end",
    "color_scheme": "standard-secondary"
  },
  "blocks": [
    { "type": "text", "settings": { "text": "<p>Why clients stay</p>", "size": "sm", "uppercase": true, "muted": true } },
    { "type": "heading", "settings": { "text": "Built around your schedule", "size": "3xl" } },
    { "type": "features", "settings": { "features": "+ Evening and weekend slots\n+ One named contact\n+ Fixed quotes, no surprises\n+ Work guaranteed for two years" } },
    { "type": "button", "settings": { "link": { "text": "Get a quote", "href": "contact.html" }, "style": "primary", "size": "medium" } }
  ]
}
```

### Launch countdown

An event or opening page: the date as a label, a big heading, a live countdown and one button, on a dark content half. Supply an atmospheric photo; a light tint calms it.

```json
{
  "type": "split-hero",
  "settings": {
    "overlay_color": "#0a1e3833",
    "image_position": "start",
    "color_scheme": "highlight-primary",
    "top_spacing": "none"
  },
  "blocks": [
    { "type": "text", "settings": { "text": "<p>Opening 15 March</p>", "size": "sm", "uppercase": true, "muted": true } },
    { "type": "heading", "settings": { "text": "A new home for the gallery", "size": "5xl" } },
    { "type": "countdown", "settings": { "target_date": "2027-03-15 10:00", "expired_message": "We are open. Come and see.", "show_seconds": false } },
    { "type": "button", "settings": { "link": { "text": "Join the opening", "href": "contact.html" }, "style": "primary", "size": "large" } }
  ]
}
```

### Quiet brand story

A restrained section for an `about` page: one heading, one paragraph, a star rating as a nod to reviews, no buttons. Supply a calm detail photo rather than a portrait.

```json
{
  "type": "split-hero",
  "settings": {
    "image_position": "end",
    "color_scheme": "standard-primary"
  },
  "blocks": [
    { "type": "heading", "settings": { "text": "Twenty years, one workshop", "size": "3xl" } },
    { "type": "text", "settings": { "text": "<p>We started with a bench and a borrowed van. The bench is still here.</p><p>Everything we sell is made within fifty metres of where you are reading this.</p>", "size": "lg" } },
    { "type": "rating", "settings": { "rating": "5" } },
    { "type": "text", "settings": { "text": "<p>Rated by our customers on independent review sites.</p>", "size": "sm", "muted": true } }
  ]
}
```
