# steps

## Purpose

A numbered, zigzag "how it works" sequence of up to eight steps, each with a title, a short rich-text description, an optional photo and an optional button, joined by a vertical line with numbered badges. It explains a process in order: booking, onboarding, a project method, what happens on the day.

Odd steps put the image on the left and the text on the right; even steps flip, so the eye moves down the page in a zigzag along the line of badges. On phones everything stacks in one centred column.

## When to use

- A mid-page explainer on `index`, `services` or `about`, or the core of a "how it works" or new-client page.
- Good for any ordered process with three to five stages: how a consultation works, what a project looks like from enquiry to handover, how an order is made, what to expect at a first visit.
- Bad for unordered features (`icon-card-grid`, `card-grid`), for dated history (`timeline`), and for a compact three-number strip (`numbered-cards`). Bad for more than eight stages; split them or summarise.
- It can open a page when it has a `title`, but it never supports a transparent header; under `transparent_on_hero` open with `banner` or `split-content` first.
- Natural neighbours: `services-grid` or `split-hero` before it, `testimonials`, `pricing` or an `action-bar` after it, since a visitor who has understood the process is ready to act.
- Needs three steps minimum to look like a sequence; three to five is the sweet spot. Each step needs a title and one to three sentences.
- Fits clinics and therapists, trades and contractors, agencies and consultancies, makers, schools, event planners, cleaning and moving services.

## Pitfalls

- A step without an `image` leaves its image side empty, so the text sits on one half of the row with blank space on the other. Either give every step a photo or none; a mix looks unfinished. Without photos keep descriptions short so the empty halves do not grow tall.
- Photos in a zigzag alternate sides, so pick pictures that read well whether they are left or right: avoid images whose subject faces outward off the page.
- Photos display at their own proportions. Use the same shape for every step (all landscape or all square) or the rows become uneven.
- `title` is set large; four to six words. The step number comes from position, so do not write "Step 1" into the title.
- `description` is rich text; a paragraph or a short list, not both, and nothing that competes with the title.
- Every `button_link` is a secondary-style button. One or two buttons across the whole sequence (usually on the last step) guide the visitor; a button on every step dilutes the ending.
- The numbering restarts at one in every steps section. Two sections on one page means two "step one"s; use one section with more steps or a different section type for the second list.
- `heading_alignment` `start` with an `eyebrow` reads editorial; `center` reads corporate. Both work, but match the neighbours.
- This section carries content, not persuasion, so it rarely justifies a highlight surface. Prefer `standard-primary` or `standard-secondary`; a highlight scheme is defensible only when the process itself is the page's selling point.
- Filled schemes pad inside their own band, so `top_spacing` `none` on a filled section removes its inner padding rather than the gap to the neighbour. Use `none` only directly under an unfilled `rich-text` opener.

## Recipes

### Three-step how it works

The simplest version: three image-free steps that say "this is easy", closing with one button. No images needed.

```json
{
  "type": "steps",
  "settings": {
    "title": "How it works",
    "description": "Three steps from first call to finished job.",
    "heading_alignment": "center",
    "color_scheme": "standard-primary"
  },
  "blocks": [
    { "type": "step", "settings": { "title": "Tell us what you need", "description": "<p>Call, email or use the form. We reply within one working day.</p>" } },
    { "type": "step", "settings": { "title": "Get a fixed quote", "description": "<p>We visit, measure and send a written quote with no hidden extras.</p>" } },
    { "type": "step", "settings": { "title": "We do the work", "description": "<p>On the agreed date, tidy, and finished with a walkthrough.</p>", "button_link": { "text": "Request a quote", "href": "contact.html" } } }
  ]
}
```

### Illustrated project process

Four photographed stages for a studio, builder or landscaper, left-aligned with an eyebrow on a soft band. Supply four landscape photos of the same shape, one per stage.

```json
{
  "type": "steps",
  "settings": {
    "eyebrow": "Our process",
    "eyebrow_uppercase": true,
    "title": "From first sketch to final walkthrough",
    "heading_alignment": "start",
    "color_scheme": "standard-secondary"
  },
  "blocks": [
    { "type": "step", "settings": { "title": "Site visit and brief", "description": "<p>We walk the site with you and write down what matters most.</p>" } },
    { "type": "step", "settings": { "title": "Concept and budget", "description": "<p>Sketches, a materials palette and a realistic cost range.</p>" } },
    { "type": "step", "settings": { "title": "Detailed design", "description": "<p>Drawings for approval and for the people who will build it.</p>" } },
    { "type": "step", "settings": { "title": "Build and handover", "description": "<p>Weekly updates, then a walkthrough and a year of aftercare.</p>", "button_link": { "text": "See finished projects", "href": "work.html" } } }
  ]
}
```

### What to expect at a first visit

A reassurance sequence for clinics, therapists, dentists and salons: five short, image-free steps on the new-client page.

```json
{
  "type": "steps",
  "settings": {
    "eyebrow": "New patients",
    "title": "What to expect",
    "description": "Your first appointment, step by step.",
    "heading_alignment": "center",
    "color_scheme": "standard-primary"
  },
  "blocks": [
    { "type": "step", "settings": { "title": "Book", "description": "<p>Online or by phone. Choose a time that suits you.</p>" } },
    { "type": "step", "settings": { "title": "Arrive", "description": "<p>Come ten minutes early for a short form and a coffee.</p>" } },
    { "type": "step", "settings": { "title": "Talk", "description": "<p>We listen first: history, concerns and what you want from the visit.</p>" } },
    { "type": "step", "settings": { "title": "Examine", "description": "<p>A gentle check and clear explanations as we go.</p>" } },
    { "type": "step", "settings": { "title": "Plan", "description": "<p>You leave with options, prices and no pressure.</p>", "button_link": { "text": "Book your first visit", "href": "contact.html" } } }
  ]
}
```

### How an order is made

A craft or product story in six photographed stages, for makers who justify their price with process. Supply six square workshop photos.

```json
{
  "type": "steps",
  "settings": {
    "eyebrow": "Craft",
    "title": "How your piece is made",
    "heading_alignment": "start",
    "color_scheme": "standard-primary"
  },
  "blocks": [
    { "type": "step", "settings": { "title": "Choosing the timber", "description": "<p>Boards selected for grain and colour, then dried for a year.</p>" } },
    { "type": "step", "settings": { "title": "Cutting", "description": "<p>Every component cut by hand from one board so the grain runs through.</p>" } },
    { "type": "step", "settings": { "title": "Joinery", "description": "<p>Traditional joints, no screws where a joint will do.</p>" } },
    { "type": "step", "settings": { "title": "Assembly", "description": "<p>Glued, clamped and left overnight.</p>" } },
    { "type": "step", "settings": { "title": "Finishing", "description": "<p>Three coats of oil, each rubbed back by hand.</p>" } },
    { "type": "step", "settings": { "title": "Delivery", "description": "<p>Wrapped in blankets and placed where you want it.</p>", "button_link": { "text": "Commission a piece", "href": "contact.html" } } }
  ]
}
```
