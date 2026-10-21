# numbered-cards

## Purpose

A row of numbered cards (01, 02, 03 …) each with a short title and a rich-text description, for explaining a process, a method or how working together goes. The numbers are generated from the order of the `step` blocks, so reordering renumbers.

The large muted number is the visual anchor of every card; the title and description sit beneath it. Cards show in a grid or, for longer sequences, in a swipeable carousel with previous and next buttons. `card_layout` `box` draws each step as a card; `flat` drops the card and lets the numbers and whitespace carry the structure.

## When to use

- Mid-page explainer on `index`, `services` or a `process` page: "how it works" between the offer and the proof. It also closes a service page well, right before the call to action.
- Good for three to five sequential steps with one sentence each; also for ordered principles or phases of an engagement.
- Bad for unordered features (use `icon-card-grid` or `card-grid`), for a long chronology (`timeline`) and for steps that need pictures (`steps`).
- Can open a page when it has a `title`, but it is better placed after a `rich-text` opener with `top_spacing` `none`. It never supports a transparent header; only `banner`, `slideshow` and `video-popup` do.
- Sits well after `rich-text`, `split-content` or `image-text`, and before `testimonials` or a `rich-text` call to action.
- Needs as many `step` blocks as `columns_desktop`, or a multiple of it, so no card sits alone on a last row. Three steps, three columns; four steps, four columns.
- Fits consultancies, agencies, contractors, clinics, movers, wedding planners, any service with a defined journey.

## Pitfalls

- Match `columns_desktop` to the number of steps. Five steps in four columns leave an orphan; four steps in five columns leave a hole.
- Titles should be two or three words; the number is already large, and a two-line title pushes descriptions out of line across the row. Keep descriptions to one or two sentences each so cards end at the same height.
- `layout` `carousel` only earns its buttons when there are more steps than columns. With four steps and four columns nothing scrolls and the arrows sit disabled. Use the carousel from six steps up.
- `card_layout` `box` on `standard-primary` shows a plain card on the page background; on `standard-secondary` and `highlight-secondary` cards get a soft fill and a border, on `highlight-primary` a border only. `flat` ignores all of that and spaces the columns wider.
- `alignment` `center` centres the number, title and description inside each card; it works with short titles and `heading_alignment` `center`. Left-aligned cards under a centred heading look unbalanced.
- Filled schemes pad inside their own band; `top_spacing` or `bottom_spacing` `none` removes the inner padding, not the gap to the neighbour. Use `none` only directly under an unfilled `rich-text` opener.
- Highlight bands belong to high-value content. A process is explanatory, so it usually stays on `standard-primary` or `standard-secondary`; make it a highlight only when it is the page's main message.
- Rich text in `description` allows bold phrases and a short list, but a bulleted list in every card turns the row into a wall. Steps that need a paragraph and a list each want `columns_desktop` 2.

## Recipes

### Four-step process

The classic "how we work" row on a soft band, centred, one sentence per step. No images needed.

```json
{
  "type": "numbered-cards",
  "settings": {
    "eyebrow": "How it works",
    "title": "From first call to finished job",
    "heading_alignment": "center",
    "layout": "grid",
    "columns_desktop": 4,
    "card_layout": "box",
    "alignment": "center",
    "color_scheme": "standard-secondary"
  },
  "blocks": [
    { "type": "step", "settings": { "title": "Consultation", "description": "<p>We listen, look at the space and agree what success looks like.</p>" } },
    { "type": "step", "settings": { "title": "Plan", "description": "<p>You receive a written plan with scope, timing and a fixed quote.</p>" } },
    { "type": "step", "settings": { "title": "Build", "description": "<p>Our own crew does the work and keeps you updated every day.</p>" } },
    { "type": "step", "settings": { "title": "Handover", "description": "<p>We walk through the result together and stay reachable afterwards.</p>" } }
  ]
}
```

### Three flat principles

Three editorial, left-aligned statements without card boxes; the numbers do the structuring. Works under a `rich-text` opener.

```json
{
  "type": "numbered-cards",
  "settings": {
    "eyebrow": "What we believe",
    "title": "Three rules we never bend",
    "heading_alignment": "start",
    "layout": "grid",
    "columns_desktop": 3,
    "card_layout": "flat",
    "alignment": "start",
    "color_scheme": "standard-primary",
    "top_spacing": "none"
  },
  "blocks": [
    { "type": "step", "settings": { "title": "Clarity first", "description": "<p>Every quote and every update is written in plain language.</p>" } },
    { "type": "step", "settings": { "title": "One team", "description": "<p>The people who plan the work are the people who do it.</p>" } },
    { "type": "step", "settings": { "title": "Finish properly", "description": "<p>A job ends when you are happy, not when the invoice is sent.</p>" } }
  ]
}
```

### Six-step carousel

A longer onboarding sequence that would crowd the page as a grid; three cards visible, the rest reachable with the arrows.

```json
{
  "type": "numbered-cards",
  "settings": {
    "title": "Your first six weeks",
    "heading_alignment": "center",
    "layout": "carousel",
    "columns_desktop": 3,
    "card_layout": "box",
    "alignment": "start",
    "color_scheme": "standard-primary"
  },
  "blocks": [
    { "type": "step", "settings": { "title": "Welcome call", "description": "<p>Meet your coordinator and set goals.</p>" } },
    { "type": "step", "settings": { "title": "Assessment", "description": "<p>A baseline so progress can be measured.</p>" } },
    { "type": "step", "settings": { "title": "Plan", "description": "<p>A weekly schedule built around your calendar.</p>" } },
    { "type": "step", "settings": { "title": "First sessions", "description": "<p>Short, supervised, and adjusted as we go.</p>" } },
    { "type": "step", "settings": { "title": "Check-in", "description": "<p>Halfway review and any changes needed.</p>" } },
    { "type": "step", "settings": { "title": "Next steps", "description": "<p>Where to go from here, with options laid out.</p>" } }
  ]
}
```
