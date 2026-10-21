# image-callout

## Purpose

A large photo with a bordered content card that overlaps it on desktop, built for one focused message: a heading, a short paragraph, an optional feature list and one or two buttons. Use it for a single high-value statement such as a service spotlight, a promotion or a credibility block.

On desktop the card sits over the inner edge of the picture; on tablets and phones the image stacks above the card. The card always has its own surface, chosen with `content_color_scheme`, so it reads as an object placed on the photo rather than text beside it. The photo is cropped to fill its half.

## When to use

- Role: the "one thing to know" moment on a page: the lead service, the current promotion, the reason to trust the business.
- Good for: service businesses, hospitality, clinics and studios, campaign pages, an `about` page introducing the founder or team with one photo.
- Bad for: several equal items (`card-grid`, `image-tabs`), long copy (`image-text`, `rich-text`), or an opener that needs the header's transparent mode, which only `banner`, `slideshow` and `video-popup` support.
- Opening a page: possible, since the `heading` block becomes the page title when the section is first, but `banner` or a `rich-text` title is usually the better opener.
- Natural neighbours: a `trust-bar` or `key-figures` strip, `testimonials`, a `rich-text` paragraph. Two callouts with alternating `image_position` make a zigzag story.
- Content needed: one strong photo, a heading of up to eight words, up to about sixty words of text, optionally three to five feature lines and one or two buttons.

## Pitfalls

- The card hides a slice of the photo. With `image_position` `start` the card covers the photo's right portion; with `end` it covers the left. Keep the subject on the far side and away from the overlapped edge.
- The photo is cropped to the card's height. Long text makes a tall card and a heavily cropped picture; keep the heading short and the text to a few sentences.
- `content_color_scheme` identical to `color_scheme` makes the card almost disappear, leaving only its border. Pair a `standard-primary` section with a `highlight-primary` card, or a highlight band with a `standard-primary` card.
- Both the section and the card are surfaces. A highlight card on a highlight band is two emphasis surfaces in one place; count the callout as one of the page's one or two highlight moments.
- A `color_scheme` other than `standard-primary` makes the section a filled band, so its spacing is padding inside the colour; a neighbour below needs `small` top spacing of its own.
- `features` lines starting with `+` get a check, `-` a cross, plain lines no icon. Keep to five lines or fewer.
- `heading` sizes above `3xl` wrap awkwardly inside the card on tablets. In the `button` block the second link appears only when it has text, and `small` is the standard button size.
- A `text` block with `size` `sm` and `muted` above the heading works as a label of two or three words.

## Recipes

### Service spotlight

Introduces one core service with a label, a heading, a short paragraph and a primary button. Supply a landscape photo of the work with its subject in the left half.

```json
{
  "type": "image-callout",
  "settings": { "image_position": "start", "color_scheme": "standard-primary", "content_color_scheme": "standard-secondary" },
  "blocks": [
    { "type": "text", "settings": { "text": "<p>What we do</p>", "size": "sm", "muted": true } },
    { "type": "heading", "settings": { "text": "A service built around your schedule", "size": "2xl" } },
    { "type": "text", "settings": { "text": "<p>A short paragraph explaining the service, who it is for and what makes the approach different. Two or three sentences are enough.</p>", "size": "base" } },
    { "type": "button", "settings": { "link": { "text": "Explore the service", "href": "services.html" }, "style": "primary", "size": "medium" } }
  ]
}
```

### Credibility block

Replaces a paragraph of reassurance with a scannable list of proof points. Supply a candid photo of the team or workspace with its subject on the right.

```json
{
  "type": "image-callout",
  "settings": { "image_position": "end", "color_scheme": "standard-secondary", "content_color_scheme": "standard-primary" },
  "blocks": [
    { "type": "text", "settings": { "text": "<p>Why choose us</p>", "size": "sm", "muted": true, "uppercase": true } },
    { "type": "heading", "settings": { "text": "Reasons clients stay with us", "size": "2xl" } },
    { "type": "features", "settings": { "features": "+ Certified and insured team\n+ Clear written estimates\n+ Work guaranteed in writing\n+ One point of contact from start to finish" } },
    { "type": "button", "settings": { "link": { "text": "Meet the team", "href": "about.html" }, "style": "secondary", "size": "medium" } }
  ]
}
```

### Promotion band

A highlighted card for a limited offer or an announcement, with a large primary button. Supply a bright, on-brand photo; the card sits on the strongest surface, so this should be the page's main conversion moment.

```json
{
  "type": "image-callout",
  "settings": { "image_position": "start", "color_scheme": "standard-primary", "content_color_scheme": "highlight-primary" },
  "blocks": [
    { "type": "heading", "settings": { "text": "Seasonal offer for new clients", "size": "3xl" } },
    { "type": "text", "settings": { "text": "<p>One sentence that states the offer plainly and when it ends.</p>", "size": "lg" } },
    { "type": "button", "settings": { "link": { "text": "Claim the offer", "href": "contact.html" }, "style": "primary", "link_2": { "text": "See all services", "href": "services.html" }, "style_2": "secondary", "size": "large" } }
  ]
}
```

### Second beat of a zigzag pair

The second of two callouts placed back to back, flipped to the other side and fused to the first with `none` top spacing. Supply a photo with its subject in the right half; the first callout uses `image_position` `start` and the same surfaces.

```json
{
  "type": "image-callout",
  "settings": { "image_position": "end", "color_scheme": "standard-primary", "content_color_scheme": "standard-secondary", "top_spacing": "none" },
  "blocks": [
    { "type": "heading", "settings": { "text": "Where the business is heading next", "size": "2xl" } },
    { "type": "text", "settings": { "text": "<p>A paragraph continuing the story begun in the section above.</p>", "size": "base" } }
  ]
}
```
