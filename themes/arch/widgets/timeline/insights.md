# timeline

## Purpose

A numbered sequence of steps or milestones: each entry gets an automatically numbered marker, a short date or phase label, an optional duration, a title, a paragraph and a checklist. It answers "how does it work?" or "how did we get here?" in one scannable section.

The `vertical` layout stacks entries down a connecting line with each entry in a tinted box; `horizontal` lines three or four markers across the page with unboxed text beneath; `centered` alternates entries left and right of a central line. All three collapse to the vertical list on phones.

## When to use

- The process section of a services or about page, a company-history section, a course outline or an event agenda.
- Good for three to eight ordered steps where sequence matters. Bad for unordered features (use `icon-card-grid` or `icon-list`) and for prices or comparisons.
- Can open a page, since its `title` becomes the page heading; under a header with `transparent_on_hero` keep a `rich-text` or `split-content` opener before it.
- Sits naturally after a `services-grid` or `image-text` that says what you do, and before `testimonials`, `pricing` or an `action-bar`.
- Each `item` needs at least a `title`; a one-line `description` or a two-to-four-line `features` list makes it useful. Mixing boxes that have a checklist with boxes that do not looks uneven.
- Fits agencies, consultancies, trades and contractors, clinics (treatment journeys), schools and courses, event pages, manufacturing and fulfilment.

## Pitfalls

- Markers number themselves in order. There is no way to start at another number or to leave a gap; reorder the blocks and the numbers follow.
- `horizontal` divides the width equally, so it is best with three or four items; five or more squeeze into narrow columns. For longer sequences use `vertical` or `centered`.
- `centered` alternates sides, so an even number of items looks balanced and it needs at least four to read as a timeline rather than two boxes. It also uses a wider content area than the other layouts.
- `date` and `duration` are free text: "Phase 1", "2019", "09:00" and "45 min" all work, so the section also serves as an event agenda. `date` is shown in the accent colour, `duration` beside it in muted text; leave `duration` blank when there is nothing to pair.
- `features` is one line per entry. A line starting with a plus sign gets a check icon and the sign is removed; a line starting with a minus sign gets a cross icon. Lines without a prefix show no icon. Do not mix prefixed and unprefixed lines within one list.
- In `horizontal` layout the text is centred under each marker but the checklist stays left-aligned, so long feature lines look better in the two other layouts.
- Item titles are subheadings under the section `title`. If the section title is left blank the item titles step up to page-section headings, which is fine for a bare timeline under a `rich-text` intro.
- Filled schemes pad inside their own band. `top_spacing` or `bottom_spacing` set to `none` on a highlight timeline removes that padding; use `none` only to fuse with a neighbouring section of the same scheme.
- The boxes in `vertical` and `centered` use the scheme's secondary tint, so on `standard-secondary` the boxes sit on a background of nearly the same tone; prefer `standard-primary` or a highlight scheme for those layouts.

## Recipes

### How we work

A four-phase project process in the vertical layout with phase labels, week ranges and deliverables as a checklist. The user supplies the phase names, durations, one-sentence descriptions and deliverables.

```json
{
  "type": "timeline",
  "settings": {
    "eyebrow": "Process",
    "title": "How a project runs",
    "heading_alignment": "center",
    "layout": "vertical",
    "color_scheme": "standard-primary"
  },
  "blocks": [
    { "type": "item", "settings": { "date": "Phase 1", "duration": "Week 1-2", "title": "Discovery", "description": "<p>One sentence on what happens in this phase.</p>", "features": "+ Deliverable one\n+ Deliverable two" } },
    { "type": "item", "settings": { "date": "Phase 2", "duration": "Week 3-5", "title": "Design", "description": "<p>One sentence on what happens in this phase.</p>", "features": "+ Deliverable one\n+ Deliverable two" } },
    { "type": "item", "settings": { "date": "Phase 3", "duration": "Week 6-10", "title": "Build", "description": "<p>One sentence on what happens in this phase.</p>", "features": "+ Deliverable one\n+ Deliverable two" } },
    { "type": "item", "settings": { "date": "Phase 4", "duration": "Week 11-12", "title": "Launch", "description": "<p>One sentence on what happens in this phase.</p>", "features": "+ Deliverable one\n+ Deliverable two" } }
  ]
}
```

### Three steps to get started

A short, horizontal "book, visit, enjoy" strip for a service or appointment page. The user supplies three step titles and one sentence each; no checklists.

```json
{
  "type": "timeline",
  "settings": {
    "title": "Getting started is simple",
    "heading_alignment": "center",
    "layout": "horizontal",
    "color_scheme": "standard-secondary"
  },
  "blocks": [
    { "type": "item", "settings": { "date": "Step 1", "title": "Book", "description": "<p>One sentence on what the customer does.</p>" } },
    { "type": "item", "settings": { "date": "Step 2", "title": "Visit", "description": "<p>One sentence on what happens.</p>" } },
    { "type": "item", "settings": { "date": "Step 3", "title": "Follow up", "description": "<p>One sentence on what comes after.</p>" } }
  ]
}
```

### Company milestones

An about-page history in the centered layout on the strongest surface, years as labels and a short narrative per milestone. The user supplies four to six years and a sentence or two for each.

```json
{
  "type": "timeline",
  "settings": {
    "eyebrow": "Our story",
    "title": "Milestones",
    "heading_alignment": "center",
    "layout": "centered",
    "color_scheme": "highlight-primary"
  },
  "blocks": [
    { "type": "item", "settings": { "date": "2016", "title": "Founded", "description": "<p>A sentence or two about this milestone.</p>" } },
    { "type": "item", "settings": { "date": "2018", "title": "First studio", "description": "<p>A sentence or two about this milestone.</p>" } },
    { "type": "item", "settings": { "date": "2021", "title": "Team of ten", "description": "<p>A sentence or two about this milestone.</p>" } },
    { "type": "item", "settings": { "date": "2024", "title": "Second location", "description": "<p>A sentence or two about this milestone.</p>" } }
  ]
}
```
