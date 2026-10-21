# numbered-service-list

## Purpose

A tall, editorial list of services as full-width rows: a large number, a short title, a description and, when the row links somewhere, a round arrow button. For a curated menu of three to seven offerings where each one deserves a line of explanation and often its own page.

Each `service` block is one row. On desktop the number, title, description and arrow sit side by side on one line; on phones the number stacks above the title and the description wraps underneath. A row with a `link` becomes clickable in its entirety and shows the arrow, which fills on hover; a row without one is plain text. Thin dividers between rows can be turned off for a quieter look, and the numbers can be hidden to make it a simple titled list.

## When to use

- The "what we do" section on `index` directly under the hero, or the main body of a `services` page where each row leads to a service's own page.
- Good for a deliberate, prioritised set of three to seven offerings with a sentence each: practice areas, treatment lines, disciplines, engagement models.
- Bad for more than eight items (it gets very tall), for offerings that need icons or pictures (`services-grid`, `icon-card-grid`), and for items from the `services` collection, which `services-grid` lists automatically.
- Can open a page when it has a `title`; it never supports a transparent header, which only `banner`, `slideshow` and `video-popup` do. Under a `rich-text` opener give it `top_spacing` `none`.
- Sits well after a `banner` or `rich-text` opener and before `key-figures`, `testimonials` or a call to action. Avoid putting it next to another card grid: the quiet rows and the busy cards cancel each other out.
- Each row needs a title of two to four words and a description of one or two sentences. Fill the description on every row or on none; a mix looks unfinished.
- Fits law and accounting firms, consultancies, architects, agencies, clinics and studios.

## Pitfalls

- Titles are set large. More than four words wraps on desktop and pushes the description column down, breaking the one-line rhythm. Move detail into the description.
- Only add a `link` where a real page or anchor exists. The arrow promises depth; an empty or placeholder address makes a dead click. Mixed rows (some linked, some not) are fine, but the arrows then appear only on linked rows.
- With `show_numbers` off, the first column disappears and titles move to the left edge; the list becomes a plain titled list and loses its "curated" feel. Keep the numbers unless the page already numbers something else.
- With `show_dividers` off there is no line between rows, so the generous row padding is the only separation; this needs descriptions on every row to read as a list rather than scattered text.
- Filled schemes pad inside their own band and `top_spacing` or `bottom_spacing` `none` removes that inner padding, not the gap to the neighbour. On `standard-primary` the list is unfilled and `none` really fuses it with the section above.
- A highlight scheme makes a strong band, but a service menu is rarely the page's highest-value content. Use `highlight-primary` here only when the services are the point of the page and nothing else on it is highlighted.
- Rich text in `description` allows a bold phrase or a short list; a list in every row doubles the height of the section.

## Recipes

### Three core services

The concise "what we do" block under the home-page hero: three rows, each linking to its own page.

```json
{
  "type": "numbered-service-list",
  "settings": {
    "eyebrow": "What we do",
    "title": "Three things, done properly",
    "heading_alignment": "center",
    "show_numbers": true,
    "show_dividers": true,
    "color_scheme": "standard-primary"
  },
  "blocks": [
    { "type": "service", "settings": { "title": "Strategy", "description": "<p>Clear priorities and a roadmap your whole team can follow.</p>", "link": { "text": "Strategy", "href": "services.html" } } },
    { "type": "service", "settings": { "title": "Design", "description": "<p>Interfaces and identities built from research, not guesswork.</p>", "link": { "text": "Design", "href": "services.html" } } },
    { "type": "service", "settings": { "title": "Delivery", "description": "<p>Shipping in short cycles with your team in the loop.</p>", "link": { "text": "Delivery", "href": "services.html" } } }
  ]
}
```

### Services page index

Four left-aligned rows as the body of the `services` page under a `rich-text` opener, each linking to a detail page.

```json
{
  "type": "numbered-service-list",
  "settings": {
    "eyebrow": "Practice areas",
    "title": "",
    "heading_alignment": "start",
    "show_numbers": true,
    "show_dividers": true,
    "color_scheme": "standard-primary",
    "top_spacing": "none"
  },
  "blocks": [
    { "type": "service", "settings": { "title": "Family law", "description": "<p>Separation, custody and agreements handled with care.</p>", "link": { "text": "Family law", "href": "services.html" } } },
    { "type": "service", "settings": { "title": "Property", "description": "<p>Buying, selling and leasing without surprises.</p>", "link": { "text": "Property", "href": "services.html" } } },
    { "type": "service", "settings": { "title": "Wills and estates", "description": "<p>Plans that hold up when they are needed.</p>", "link": { "text": "Wills and estates", "href": "services.html" } } },
    { "type": "service", "settings": { "title": "Small business", "description": "<p>Contracts, structures and disputes for owner-run firms.</p>", "link": { "text": "Small business", "href": "services.html" } } }
  ]
}
```

### Quiet process steps

Three unlinked rows without dividers, used as a calm "how we work" sequence; the numbers carry the order.

```json
{
  "type": "numbered-service-list",
  "settings": {
    "eyebrow": "Our approach",
    "title": "How a project runs",
    "heading_alignment": "center",
    "show_numbers": true,
    "show_dividers": false,
    "color_scheme": "standard-secondary"
  },
  "blocks": [
    { "type": "service", "settings": { "title": "Listen", "description": "<p>A first conversation about goals, constraints and budget.</p>" } },
    { "type": "service", "settings": { "title": "Shape", "description": "<p>Sketches and a written plan before anything is built.</p>" } },
    { "type": "service", "settings": { "title": "Make", "description": "<p>Work in the open, with a review at the end of each week.</p>" } }
  ]
}
```
