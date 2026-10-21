# sliding-panels

## Purpose

A tall band of up to six upright photo panels side by side, with a short title, subtitle and button over the first, widest panel. It is a visual showcase for a handful of services, spaces, locations or projects, where photographs do the selling.

The first panel is the open one: it takes about three times the width of the others and shows its text over a dark gradient at the bottom. The remaining panels are narrow image strips whose text stays hidden. On phones the panels stack, the first one tall and the rest as short bands.

## When to use

- A mid-page showcase on `index`, `services`, `work` or a rooms and spaces page. It fills the whole screen height, so it is a statement, not a filler.
- Good for three to five offerings with one great portrait photo each: venue spaces, treatment rooms, garden projects, menu categories, destinations, team specialities.
- Bad for content people must compare or read: use `card-grid`, `services-grid` or `image-tabs` for that. Bad for landscape-only photo libraries, which are cropped hard into upright strips.
- It can open a page only when the first panel has a `title` (that title becomes the page heading), and it never supports a transparent header. Most pages open with `banner`, `rich-text` or `split-content` and place the panels second or third.
- Natural neighbours: a `rich-text` intro above, `testimonials`, `steps` or an `action-bar` below.
- Needs three to five panels. Two looks like a broken split; six turns the closed panels into slivers on a laptop.
- Fits hospitality, landscaping and architecture, interiors, spas and salons, photographers, restaurants with distinct rooms or menus.

## Pitfalls

- Only the first panel's text is readable: the panels do not currently open on hover or click, so a visitor sees one message and a row of pictures. Put the headline you care about in panel one and treat the others as pure imagery. Give them titles anyway for the day the interaction returns, but do not rely on them.
- Order panels by image strength and message priority, since position one gets the width and the words.
- Photos are cropped to tall strips on desktop and to short wide bands on phones, so each image needs its subject near the centre and nothing essential at the edges. Upright photos with a clear focal point work; wide group shots and text-heavy images fail.
- The text sits on a dark gradient at the bottom of the panel. Photos that are dark at the bottom are fine; busy, bright bottoms fight the title. Keep `title` to two to four words and `subtitle` to one short line.
- A panel without an image shows a placeholder, which looks like a mistake next to real photos. Fill every panel or remove it.
- The band is tall on every screen size. Two sliding-panels sections on one page is one too many, and the section next to it should be quiet (`rich-text`, `testimonials`), not another full-height hero.
- The widget's `color_scheme` colours only the heading area above the band; the panels themselves are always photo-and-gradient. A highlight scheme here is rarely justified; keep it on `standard-primary` or `standard-secondary` unless the heading needs to sit on a band.
- Filled schemes pad inside their own band, so `top_spacing` `none` on a filled section removes its inner padding rather than the gap to the section above; use `none` only directly under an unfilled opener.

## Recipes

### Services showcase

Three core services with the signature one first. Supply three upright photos, each with its subject centred.

```json
{
  "type": "sliding-panels",
  "settings": {
    "eyebrow": "What we do",
    "title": "Our services",
    "description": "Three ways we can help, each with its own team.",
    "heading_alignment": "start",
    "color_scheme": "standard-primary"
  },
  "blocks": [
    { "type": "panel", "settings": { "title": "Garden design", "subtitle": "From first sketch to planting day", "button_link": { "text": "See the service", "href": "services.html" } } },
    { "type": "panel", "settings": { "title": "Maintenance", "subtitle": "Year-round care plans", "button_link": { "text": "See the service", "href": "services.html" } } },
    { "type": "panel", "settings": { "title": "Outdoor living", "subtitle": "Terraces, kitchens and lighting", "button_link": { "text": "See the service", "href": "services.html" } } }
  ]
}
```

### Rooms and spaces

A venue's spaces, each with a capacity line, for hotels, restaurants with private rooms, studios for hire. Supply one upright interior photo per space.

```json
{
  "type": "sliding-panels",
  "settings": {
    "eyebrow": "Host with us",
    "title": "Our spaces",
    "heading_alignment": "center",
    "color_scheme": "standard-secondary"
  },
  "blocks": [
    { "type": "panel", "settings": { "title": "The Garden Room", "subtitle": "Seats up to 60", "button_link": { "text": "Enquire", "href": "contact.html" } } },
    { "type": "panel", "settings": { "title": "The Loft", "subtitle": "Seats up to 24", "button_link": { "text": "Enquire", "href": "contact.html" } } },
    { "type": "panel", "settings": { "title": "The Terrace", "subtitle": "Standing up to 120", "button_link": { "text": "Enquire", "href": "contact.html" } } },
    { "type": "panel", "settings": { "title": "The Cellar", "subtitle": "Tastings for 12", "button_link": { "text": "Enquire", "href": "contact.html" } } }
  ]
}
```

### Portfolio strip

Four recent projects for a studio or trade, headline project first, no heading above so the band reads as a pure image moment under a `rich-text` intro. Supply four upright project photos.

```json
{
  "type": "sliding-panels",
  "settings": {
    "title": "",
    "description": "",
    "color_scheme": "standard-primary",
    "top_spacing": "none"
  },
  "blocks": [
    { "type": "panel", "settings": { "title": "Hillside house", "subtitle": "New build, 2025", "button_link": { "text": "View project", "href": "work.html" } } },
    { "type": "panel", "settings": { "title": "Canal studio", "subtitle": "Conversion", "button_link": { "text": "View project", "href": "work.html" } } },
    { "type": "panel", "settings": { "title": "Market hall", "subtitle": "Public space", "button_link": { "text": "View project", "href": "work.html" } } },
    { "type": "panel", "settings": { "title": "Orchard barn", "subtitle": "Restoration", "button_link": { "text": "View project", "href": "work.html" } } }
  ]
}
```
