# trust-bar

## Purpose

A slim strip of three to five icon-plus-text items, one row across the page, that states selling points, guarantees or credentials at a glance. It has no heading of its own and is meant to sit under a hero or between larger sections as a quick credibility beat.

Each `item` is an icon, a short title and a one-line text. On desktop the items share the row equally with thin dividers between them; on phones they stack.

## When to use

- Directly under the opening `banner`, `slideshow` or `split-hero` to back the headline with three or four proof points, or just above a `core-form` to settle last doubts.
- Good for "licensed and insured", "free delivery over 50", "open seven days", years in business, awards and certifications. Bad for anything that needs a sentence of explanation; that is `icon-card-grid` or `icon-list`.
- Never a page opener: it has no heading and reads as a strip, not a title.
- A bridge element: it belongs between sections rather than being one. Use `top_spacing` `small` as its usual setting, and keep that choice the same everywhere on the site.
- Needs three to five items. Two look thin, six squeeze on desktop because the row does not wrap at large widths.
- Fits trades and home services, shops, restaurants, clinics, hotels and any local business that sells on trust.

## Pitfalls

- `icon_style`, `icon_size` and `icon_shape` apply to every item at once; items cannot differ. `plain` is a bare icon, `outline` draws a ring, `filled` sits the icon on a solid accent shape. The shape only matters for `outline` and `filled`.
- `alignment` `start` puts the icon beside the text; `center` stacks the icon above centred text and needs short titles, since every item becomes a narrow column.
- `text` is one line of small type. Keep it to a handful of words; a sentence wraps into a second and third line and the items stop lining up.
- An item with an empty `icon` simply has no icon, which is how a numbers strip works: put the figure in `title` and the label in `text`.
- Under an image hero the hero's bottom spacing is padding inside its own image, so it contributes no gap; `top_spacing` `small` gives the docked-but-not-touching look. `none` there presses the bar against the image edge.
- A highlight scheme turns the bar into a coloured band that pads inside itself. That is a strong move for a thin strip; it counts as one of the page's one or two highlight sections and must not touch another highlight band.
- Icons are chosen by name from the theme's icon set; pick a concrete object (a delivery truck, a shield, a clock, a medal) rather than an abstract symbol the visitor has to decode.

## Recipes

### Why choose us, under the hero

Four filled circular icons with short titles docked under an image hero. The user supplies four proof points of two or three words each with a short supporting line.

```json
{
  "type": "trust-bar",
  "settings": {
    "icon_style": "filled",
    "icon_size": "lg",
    "icon_shape": "circle",
    "alignment": "start",
    "show_dividers": true,
    "color_scheme": "standard-primary",
    "top_spacing": "small"
  },
  "blocks": [
    { "type": "item", "settings": { "icon": "medal", "title": "Twenty years' experience", "text": "A short supporting line" } },
    { "type": "item", "settings": { "icon": "shield", "title": "Licensed and insured", "text": "A short supporting line" } },
    { "type": "item", "settings": { "icon": "clock", "title": "Same-day response", "text": "A short supporting line" } },
    { "type": "item", "settings": { "icon": "star", "title": "Five-star rated", "text": "A short supporting line" } }
  ]
}
```

### Shop reassurance strip

Three plain small icons about shipping, returns and payment, placed above the footer or under a product grid. The user supplies the three policies in a few words each.

```json
{
  "type": "trust-bar",
  "settings": {
    "icon_style": "plain",
    "icon_size": "sm",
    "icon_shape": "sharp",
    "alignment": "start",
    "show_dividers": true,
    "color_scheme": "standard-secondary",
    "top_spacing": "small",
    "bottom_spacing": "small"
  },
  "blocks": [
    { "type": "item", "settings": { "icon": "truck-delivery", "title": "Free delivery", "text": "On orders over a set amount" } },
    { "type": "item", "settings": { "icon": "package", "title": "Easy returns", "text": "Within 30 days" } },
    { "type": "item", "settings": { "icon": "lock", "title": "Secure checkout", "text": "All major cards accepted" } }
  ]
}
```

### Centred values row

Five outlined icons stacked above centred one-word titles, as a values section on an about page. The user supplies five values of one or two words; the text line is left empty.

```json
{
  "type": "trust-bar",
  "settings": {
    "icon_style": "outline",
    "icon_size": "xl",
    "icon_shape": "circle",
    "alignment": "center",
    "show_dividers": false,
    "color_scheme": "standard-primary"
  },
  "blocks": [
    { "type": "item", "settings": { "icon": "leaf", "title": "Organic", "text": "" } },
    { "type": "item", "settings": { "icon": "heart-handshake", "title": "Family run", "text": "" } },
    { "type": "item", "settings": { "icon": "recycle", "title": "Low waste", "text": "" } },
    { "type": "item", "settings": { "icon": "location", "title": "Local", "text": "" } },
    { "type": "item", "settings": { "icon": "certificate", "title": "Certified", "text": "" } }
  ]
}
```

### Numbers band

A highlight band of three figures with no icons: the number in the title, the label beneath. The user supplies three figures they can stand behind.

```json
{
  "type": "trust-bar",
  "settings": {
    "icon_style": "plain",
    "icon_size": "sm",
    "alignment": "center",
    "show_dividers": true,
    "color_scheme": "highlight-primary"
  },
  "blocks": [
    { "type": "item", "settings": { "icon": "", "title": "1,200+", "text": "Projects completed" } },
    { "type": "item", "settings": { "icon": "", "title": "15", "text": "Years in business" } },
    { "type": "item", "settings": { "icon": "", "title": "98%", "text": "Customers who return" } }
  ]
}
```
