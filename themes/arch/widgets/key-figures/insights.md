# key-figures

## Purpose

A row of big numbers with short labels, such as years in business, clients served or a satisfaction score, that count up when they scroll into view. It is a compact credibility strip under a hero or a results block on a service page.

Each figure is a `number`, a static `suffix` such as "+" or "%", a `label` and an optional one-line `description`. Figures sit in a grid or, for many of them, in a carousel with arrows. `card_layout` decides whether each figure is boxed or floats freely on the section surface.

## When to use

- Role: a quick proof point between the opener and the first long section, or a "results" moment before the call to action.
- Good for: trades and agencies (projects, years, repeat clients), clinics and studios (patients, practitioners, rating), non-profits (funds, volunteers, communities), any `about` page.
- Bad for: numbers that need explanation or sources (use `rich-text` or `data-table`), prices (`pricing`), or more than six figures.
- Opening a page: no. The numbers mean nothing before the visitor knows what the business is, and the section does not support the header's transparent mode, which only `banner`, `slideshow` and `video-popup` support.
- Natural neighbours: directly under `banner` or `split-hero` as a strip, after `testimonials` as hard evidence, before `action-bar`.
- Content needed: three or four figures the business can stand behind; this is the smallest section in the theme and works with no heading at all.

## Pitfalls

- Only digits animate; commas, dots and slashes inside `number` stay still and words do not count up at all. Put units in `suffix` ("+", "%", "k", "/5") and keep `number` numeric ("4.9", "1,200").
- The count-up runs when the section scrolls into view. If it sits in the first screen it plays before anyone looks; turn `animate` off there. Visitors who prefer reduced motion see the final numbers at once.
- Three or four figures hit hardest. Five columns shrink the numbers; `carousel` hides figures behind arrows and is only worth it from six figures up, where `columns_desktop` is how many show at once.
- `card_layout` `box` on `standard-primary` adds padding but no fill or border, so it looks like `flat` with more air; the boxed look needs `standard-secondary` or a highlight scheme. `flat` on a highlight scheme gives bold floating numbers.
- A `color_scheme` other than `standard-primary` makes the section a filled band whose spacing is padding inside its colour. The strip is a natural `small` spacing candidate; under a filled hero use `small`, and `none` only under an unfilled opener.
- Labels of one to three words; `description` of at most eight ("Since 2015", "Across three cities"). Omit it when the label is self-explanatory.
- Figures are claims; use real, current numbers. A row of identical magnitudes ("500 / 600 / 700") reads as padding; vary them.
- Without a `title` the labels become the section's headings, which is fine for a strip; with a `title`, keep it short ("By the numbers").

## Recipes

### Trust strip under the hero

Four flat figures with no heading, docked under a filled hero. Supply four numbers with units; no images needed.

```json
{
  "type": "key-figures",
  "settings": { "title": "", "layout": "grid", "columns_desktop": 4, "card_layout": "flat", "animate": true, "color_scheme": "standard-primary", "top_spacing": "small", "bottom_spacing": "small" },
  "blocks": [
    { "type": "figure", "settings": { "number": "12", "suffix": "+", "label": "Years in business" } },
    { "type": "figure", "settings": { "number": "850", "suffix": "+", "label": "Projects completed" } },
    { "type": "figure", "settings": { "number": "4.9", "suffix": "/5", "label": "Average rating" } },
    { "type": "figure", "settings": { "number": "98", "suffix": "%", "label": "Repeat clients" } }
  ]
}
```

### Results block

Three boxed figures with a heading and a description on a highlight surface, as the page's evidence moment. Supply three outcome numbers and a one-line context for each.

```json
{
  "type": "key-figures",
  "settings": { "eyebrow": "Results", "title": "What our clients see", "description": "Figures from the last twelve months of completed work.", "heading_alignment": "start", "layout": "grid", "columns_desktop": 3, "card_layout": "box", "animate": true, "color_scheme": "highlight-primary" },
  "blocks": [
    { "type": "figure", "settings": { "number": "40", "suffix": "%", "label": "Faster turnaround", "description": "Compared with the previous process" } },
    { "type": "figure", "settings": { "number": "1,200", "suffix": "+", "label": "Hours saved", "description": "Across all client accounts" } },
    { "type": "figure", "settings": { "number": "30", "suffix": "", "label": "Active clients", "description": "In three cities" } }
  ]
}
```

### Two numbers inside a story

A pair of large figures on a soft surface between two text sections of an `about` page. Supply two numbers that summarise the story.

```json
{
  "type": "key-figures",
  "settings": { "title": "", "layout": "grid", "columns_desktop": 2, "card_layout": "flat", "animate": true, "color_scheme": "standard-secondary", "heading_alignment": "start" },
  "blocks": [
    { "type": "figure", "settings": { "number": "2015", "suffix": "", "label": "Founded" } },
    { "type": "figure", "settings": { "number": "3,000", "suffix": "+", "label": "Clients since" } }
  ]
}
```

### Carousel of proof points

Six or more figures that would not fit one row, shown four at a time with arrows. Supply six to eight numbers; keep labels to two words so the cards stay even.

```json
{
  "type": "key-figures",
  "settings": { "title": "Our track record", "layout": "carousel", "columns_desktop": 4, "card_layout": "box", "animate": true, "color_scheme": "standard-secondary" },
  "blocks": [
    { "type": "figure", "settings": { "number": "15", "suffix": "+", "label": "Years" } },
    { "type": "figure", "settings": { "number": "2,400", "suffix": "", "label": "Projects" } },
    { "type": "figure", "settings": { "number": "35", "suffix": "", "label": "Team members" } },
    { "type": "figure", "settings": { "number": "12", "suffix": "", "label": "Awards" } },
    { "type": "figure", "settings": { "number": "4", "suffix": "", "label": "Offices" } },
    { "type": "figure", "settings": { "number": "97", "suffix": "%", "label": "Recommend us" } }
  ]
}
```
