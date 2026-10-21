# content-switcher

## Purpose

A card grid with a switch above it: visitors flip between two groups of cards (a toggle) or three (tabs) without leaving the section. Built for monthly/yearly plans, services for different audiences, or any "pick a lens" comparison where each view has its own set of cards.

Every card belongs to exactly one view through its `target_option`, so each view needs its own complete set of `item` blocks. A card shows an optional image, title, a large price line, richtext body and a secondary button. Text inside cards is centred.

## When to use

- Mid-page on a `pricing` or `services` page, or as the offer section of a landing page.
- Good for: billing cycles, residential vs commercial, adults vs kids, dine-in vs takeaway, before/after image pairs. Bad for: a single list of services (use `icon-card-grid`), a feature matrix (use `comparison-table`), one plan set with a featured column (use `pricing`).
- It can open a page: its title becomes the page heading when it is first. Under a header with `transparent_on_hero` it cannot, because only `banner`, `slideshow` and `video-popup` support the transparent header.
- Natural neighbours: an `accordion` of questions directly below, an `action-bar` after it, `testimonials` before it.
- Needs at least two cards per view; three cards per view with `columns` set to 3 is the classic shape. Views with very different card counts make the section jump in height when switched.
- Fits gyms, studios, salons, agencies, software services, restaurants with distinct formats, retailers with a natural two-way split.

## Pitfalls

- `toggle` shows two views; `tabs` is what unlocks `option_3_label`. A third label set while `switcher_type` is `toggle` is silently ignored, and cards with `target_option` `3` are then unreachable.
- Never leave `option_1_label` blank: the first view is the one shown on load, and without its button nothing is visible until a visitor clicks another option. Blank out `option_3_label` instead when you want fewer views.
- Cards are not shared. The same offer in two views means two `item` blocks with different `target_option` values, which also lets the title, price and text differ per view.
- `price` is set very large. It dominates the card, so use it only for a real price or a short figure such as a duration; leave it blank for portfolios and catalogues and the card tightens up.
- `aspect_ratio` only matters when cards carry images. Use `auto` for text-only cards and give every image in a view the same ratio, or the row bottoms go ragged.
- Keep `columns` at or below the number of cards per view: four columns with three cards leaves a hole. Five columns only suit short, image-led cards.
- On `standard-secondary` and the two highlight schemes cards get a border and a filled background; on `standard-primary` cards float on the page with no outline. Any scheme other than `standard-primary` also pads the whole section inside its own coloured band, so `top_spacing` and `bottom_spacing` set to `none` remove that inner padding. Under a filled hero use `small`.
- Button text falls back to a generic label when only an `href` is given; always write the link `text`. Keep card titles to a few words and the body to one short paragraph or a short list.

## Recipes

### Monthly or yearly plans

Three plans, two billing cycles. The user supplies the plan names, what each includes and the real prices; no images needed.

```json
{
  "type": "content-switcher",
  "settings": { "eyebrow": "Membership", "title": "Choose Your Plan", "switcher_type": "toggle", "option_1_label": "Monthly", "option_2_label": "Yearly", "columns": 3, "aspect_ratio": "auto", "color_scheme": "standard-secondary" },
  "blocks": [
    { "type": "item", "settings": { "title": "Starter", "price": "$00/mo", "text": "<p>Placeholder summary of the plan.</p>", "link": { "text": "Get Started", "href": "contact.html" }, "target_option": "1" } },
    { "type": "item", "settings": { "title": "Standard", "price": "$00/mo", "text": "<p>Placeholder summary of the plan.</p>", "link": { "text": "Get Started", "href": "contact.html" }, "target_option": "1" } },
    { "type": "item", "settings": { "title": "Unlimited", "price": "$00/mo", "text": "<p>Placeholder summary of the plan.</p>", "link": { "text": "Get Started", "href": "contact.html" }, "target_option": "1" } },
    { "type": "item", "settings": { "title": "Starter", "price": "$00/yr", "text": "<p>Placeholder summary, billed yearly.</p>", "link": { "text": "Get Started", "href": "contact.html" }, "target_option": "2" } },
    { "type": "item", "settings": { "title": "Standard", "price": "$00/yr", "text": "<p>Placeholder summary, billed yearly.</p>", "link": { "text": "Get Started", "href": "contact.html" }, "target_option": "2" } },
    { "type": "item", "settings": { "title": "Unlimited", "price": "$00/yr", "text": "<p>Placeholder summary, billed yearly.</p>", "link": { "text": "Get Started", "href": "contact.html" }, "target_option": "2" } }
  ]
}
```

### Services by audience, three tabs

Three customer segments, each with its own service line-up and quote button; add two or three cards per tab. The user supplies the segment names and the services; no prices or images.

```json
{
  "type": "content-switcher",
  "settings": { "eyebrow": "Services", "title": "Built for the Way You Work", "switcher_type": "tabs", "option_1_label": "Residential", "option_2_label": "Commercial", "option_3_label": "Industrial", "columns": 3, "aspect_ratio": "auto", "color_scheme": "standard-primary" },
  "blocks": [
    { "type": "item", "settings": { "title": "Home Service", "text": "<ul><li>Placeholder scope item</li><li>Placeholder scope item</li></ul>", "link": { "text": "Request a Quote", "href": "contact.html" }, "target_option": "1" } },
    { "type": "item", "settings": { "title": "Office Service", "text": "<ul><li>Placeholder scope item</li><li>Placeholder scope item</li></ul>", "link": { "text": "Request a Quote", "href": "contact.html" }, "target_option": "2" } },
    { "type": "item", "settings": { "title": "Plant Service", "text": "<ul><li>Placeholder scope item</li><li>Placeholder scope item</li></ul>", "link": { "text": "Request a Quote", "href": "contact.html" }, "target_option": "3" } }
  ]
}
```

### Before and after pairs

Two columns, each project in the same grid position in both views, no prices. The user supplies matching before and after photos (same orientation) for two to four projects.

```json
{
  "type": "content-switcher",
  "settings": { "eyebrow": "Results", "title": "See the Difference", "heading_alignment": "start", "switcher_type": "toggle", "option_1_label": "Before", "option_2_label": "After", "columns": 2, "aspect_ratio": "3 / 2", "color_scheme": "standard-primary" },
  "blocks": [
    { "type": "item", "settings": { "title": "Project One", "text": "", "target_option": "1" } },
    { "type": "item", "settings": { "title": "Project Two", "text": "", "target_option": "1" } },
    { "type": "item", "settings": { "title": "Project One", "text": "", "target_option": "2" } },
    { "type": "item", "settings": { "title": "Project Two", "text": "", "target_option": "2" } }
  ]
}
```

