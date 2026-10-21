# accordion

## Purpose

A list of questions that open to reveal their answers, for FAQs, policies, "what to expect" notes and other reference content a visitor scans for one item. Keeps a long list of answers short on the page: only the question lines show until one is clicked.

Each `item` block is one question with a richtext answer. Adding an `info` or `social` block turns the single centred column into a two-column layout: the questions take about seventy percent of the width and the sidebar carries contact details, opening hours or social icons on the side chosen with `sidebar_position`. Without those blocks the list sits alone in a reading-width column.

## When to use

- A support role: it answers objections and practical questions after the persuasive sections have done their work. Typical homes are the lower half of a `services` or `pricing` page, a dedicated FAQ page, or above the form on the `contact` page.
- Good for independent questions a visitor picks from. Bad for content everyone must read (use `rich-text`) and for sequential steps (use `steps` or `timeline`).
- Can carry a page title when it is the first section, but it is a weak opener; let a `banner` or `rich-text` title section introduce the page and place the accordion after it.
- Sits well after `pricing` or `comparison-table` (questions about plans), before `action-bar` or `core-form` (the sidebar `info` block gives the "still have questions?" escalation path).
- Needs at least three questions to look intentional; beyond about ten, split by topic into two sections with their own titles.
- Fits every industry. Utility content, so it almost always belongs on `standard-primary` or `standard-secondary`, not on a highlight surface.

## Pitfalls

- With `allow_multiple` off, opening one question closes the others. Turn it on when visitors compare answers (plans, policies); keep it off for unrelated FAQs so the page stays tidy.
- A `social` block shows nothing unless the site's social links are filled in theme settings.
- `sidebar_position` has no effect until an `info` or `social` block exists. Left-aligned headings (`heading_alignment: start`) pair naturally with a sidebar; centred headings suit the standalone column.
- Questions are a single line beside a chevron: keep them under about seventy characters or they wrap to two lines and the list looks uneven. Answers can be long and may hold lists and links.
- `connected` draws one bordered box with hairlines between items and reads as documentation; `separated` draws individual cards with gaps and reads friendlier. On `standard-secondary` and `highlight-secondary` the items get a tinted background, which helps them hold their own on busy pages.
- Any scheme other than `standard-primary` makes this a filled band that pads inside itself, so a neighbour below needs its own `top_spacing`. Use `none` on the accordion's own spacing only to avoid a double gap under an unfilled title section, or to fuse it with a same-scheme neighbour.

## Recipes

### FAQ column

A plain FAQ for a services or product page. Needs five to eight real questions and answers; no images.

```json
{
  "type": "accordion",
  "settings": { "eyebrow": "Questions", "title": "Frequently asked questions", "description": "", "heading_alignment": "center", "style": "separated", "allow_multiple": false },
  "blocks": [
    { "type": "item", "settings": { "question": "How soon can we start?", "answer": "<p>Most projects begin within two weeks of the first call.</p>" } },
    { "type": "item", "settings": { "question": "Do you work outside the city?", "answer": "<p>Yes. Travel is included for locations within one hour of our office.</p>" } },
    { "type": "item", "settings": { "question": "What happens after I get in touch?", "answer": "<p>We reply within one working day to arrange a short introductory call.</p>" } }
  ]
}
```

### Support hub with sidebar

FAQ plus an escalation path: an `info` block with contact details and the site's social icons on the right. Good above the form on the `contact` page.

```json
{
  "type": "accordion",
  "settings": { "eyebrow": "Support", "title": "Need a hand?", "heading_alignment": "start", "style": "separated", "sidebar_position": "end", "color_scheme": "standard-secondary" },
  "blocks": [
    { "type": "item", "settings": { "question": "Where do I find my booking reference?", "answer": "<p>It is in the confirmation email, just under the date.</p>" } },
    { "type": "item", "settings": { "question": "Can I reschedule?", "answer": "<p>Yes, up to 24 hours before your appointment, at no charge.</p>" } },
    { "type": "info", "settings": { "title": "Still stuck?", "text": "<p>Email <a href=\"mailto:hello@example.com\">hello@example.com</a> or call (555) 010-0100, weekdays 9 to 5.</p>" } },
    { "type": "social", "settings": {} }
  ]
}
```

### Policy block

Compact terms the buyer can check without leaving the page: shipping, returns, warranty. Items are independent, so several may stay open. Place it under a `pricing` or `priced-list` section.

```json
{
  "type": "accordion",
  "settings": { "eyebrow": "", "title": "The small print", "description": "", "heading_alignment": "start", "style": "connected", "allow_multiple": true },
  "blocks": [
    { "type": "item", "settings": { "question": "Shipping", "answer": "<p>Orders ship within three working days. Tracking is emailed on dispatch.</p>" } },
    { "type": "item", "settings": { "question": "Returns", "answer": "<p>Unused items can be returned within 30 days.</p><ul><li>Keep the original packaging.</li><li>Include the order number.</li></ul>" } },
    { "type": "item", "settings": { "question": "Warranty", "answer": "<p>Two years against manufacturing defects.</p>" } }
  ]
}
```
