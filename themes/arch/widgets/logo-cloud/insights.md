# logo-cloud

## Purpose

A grid or carousel of client, partner, press or certification logos under a short label. It is the lightest social-proof section in the theme: logos appear grey and faded, turning to full colour on hover, so the row stays calm until the visitor looks at it.

Each `logo` block is an image with a `name` used as its alternative text and an optional `link` that makes the whole tile clickable. `aspect_ratio` decides whether each logo keeps its own height or all tiles share one shape, and `card_layout` adds a bordered tile around each logo.

## When to use

- Role: a quiet credibility strip under the opener, a press bar, a "licensed and insured" badge row, or a partner list on an `about` or `services` page.
- Good for: agencies and consultancies (clients), trades and clinics (certifications, associations), shops (brands carried), anyone featured in the press.
- Bad for: a single badge (`image`), photos of people (`profile-grid`), or logos that need a sentence each (`card-grid`).
- Opening a page: no. It has nothing to say on its own and does not support the header's transparent mode, which only `banner`, `slideshow` and `video-popup` support.
- Natural neighbours: directly under `banner`, `split-hero` or `key-figures`; above or below `testimonials`, which it backs up.
- Content needed: enough logos to fill whole rows, typically four to eight, each supplied as a crisp file on a transparent background.

## Pitfalls

- Logos must be prepared, not just collected: transparent backgrounds, similar visual weight, trimmed of empty margins. One heavy dark logo among light ones dominates the row even in grey.
- `auto` lets each logo set its own height, which gives a ragged row when the files differ in shape. `3 / 2` or `4 / 3` makes uniform tiles for wordmarks; `1 / 1` suits round badges and seals.
- Fill complete rows: six logos for six columns, eight for four columns. A row with a gap at the end looks unfinished. Switch to `carousel` only when the logos exceed one row; `columns_desktop` is then how many show at once.
- On a highlight scheme, dark logos sink into the band. Use light or white logo versions there, or keep the row on a standard surface.
- The default `title` is a boast about hundreds of companies; replace it with a true statement or clear it and keep only the `eyebrow`.
- Set `name` on every block; it is what screen readers and search engines read instead of the picture.
- Linking every logo sends visitors away; link only the few with a reason, in a new tab.
- A `color_scheme` other than `standard-primary` makes the section a filled band whose spacing is padding inside its colour. The strip is a natural `small` spacing candidate; under a filled hero use `small`, and `none` only under an unfilled opener.
- Use only logos the business has permission to show; being a customer of a brand does not make its logo a partnership.

## Recipes

### Client wall under the hero

Six logos in one flat row with a short label, docked under a filled hero. Supply six logo files of similar weight on transparent backgrounds.

```json
{
  "type": "logo-cloud",
  "settings": { "eyebrow": "Trusted by", "title": "", "heading_alignment": "center", "card_layout": "flat", "layout": "grid", "columns_desktop": 6, "aspect_ratio": "3 / 2", "color_scheme": "standard-primary", "top_spacing": "small" },
  "blocks": [
    { "type": "logo", "settings": { "name": "Example Company" } },
    { "type": "logo", "settings": { "name": "Sample Studio" } },
    { "type": "logo", "settings": { "name": "Placeholder Partners" } },
    { "type": "logo", "settings": { "name": "Demo Industries" } },
    { "type": "logo", "settings": { "name": "Test Collective" } },
    { "type": "logo", "settings": { "name": "Specimen Group" } }
  ]
}
```

### Press strip

Five publication wordmarks with no heading on a soft band. Supply five press logos; link each to the article in a new tab if the coverage is public.

```json
{
  "type": "logo-cloud",
  "settings": { "eyebrow": "As seen in", "title": "", "heading_alignment": "center", "card_layout": "flat", "layout": "grid", "columns_desktop": 5, "aspect_ratio": "3 / 2", "color_scheme": "standard-secondary" },
  "blocks": [
    { "type": "logo", "settings": { "name": "Example Daily", "link": { "text": "Read the article", "href": "https://example.com/", "target": "_blank" } } },
    { "type": "logo", "settings": { "name": "Sample Magazine" } },
    { "type": "logo", "settings": { "name": "Placeholder Review" } },
    { "type": "logo", "settings": { "name": "Demo Journal" } },
    { "type": "logo", "settings": { "name": "Specimen Weekly" } }
  ]
}
```

### Certification badges

Three or four boxed square tiles for licences, memberships and awards. Supply square badge images; the border makes each badge read as a credential.

```json
{
  "type": "logo-cloud",
  "settings": { "eyebrow": "Credentials", "title": "Licensed, insured and accredited", "heading_alignment": "center", "card_layout": "box", "layout": "grid", "columns_desktop": 4, "aspect_ratio": "1 / 1", "color_scheme": "standard-primary" },
  "blocks": [
    { "type": "logo", "settings": { "name": "Example trade licence" } },
    { "type": "logo", "settings": { "name": "Sample association member" } },
    { "type": "logo", "settings": { "name": "Placeholder safety certificate" } },
    { "type": "logo", "settings": { "name": "Demo industry award" } }
  ]
}
```

### Partner carousel

Ten or more partner or brand logos shown five at a time with arrows and a short description. Supply the full set of logos in one consistent shape.

```json
{
  "type": "logo-cloud",
  "settings": { "eyebrow": "Brands we carry", "title": "Products from names you know", "description": "We stock and service every brand shown here.", "heading_alignment": "center", "card_layout": "box", "layout": "carousel", "columns_desktop": 5, "aspect_ratio": "3 / 2", "color_scheme": "standard-primary" },
  "blocks": [
    { "type": "logo", "settings": { "name": "Example Brand" } },
    { "type": "logo", "settings": { "name": "Sample Brand" } },
    { "type": "logo", "settings": { "name": "Placeholder Brand" } },
    { "type": "logo", "settings": { "name": "Demo Brand" } },
    { "type": "logo", "settings": { "name": "Specimen Brand" } },
    { "type": "logo", "settings": { "name": "Model Brand" } }
  ]
}
```
