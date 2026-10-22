# contact-details

## Purpose

A multi-column contact block: the business name and a short blurb, opening hours, a flat link list, social icons, or the address, phone and hours pulled straight from the site's project details. Use it where visitors need to find or reach the business, not as a sales section.

Each block is one column. With `first-featured` or `last-featured` the featured block takes two column widths, so the business identity (or the social column) reads as the anchor; `equal` makes every column the same width. The heading group (eyebrow, title, description) is optional and the section looks cleaner without it when the columns carry their own titles.

## When to use

- The practical "how to reach us" section of a `contact` page, usually next to a `map` and a form, or a compact contact strip on a `services` or `about` page.
- Good for: address, phone, email, opening hours, a short list of key links, social profiles. Bad for: persuasion, pricing, long text; keep that in `rich-text` or `split-content`.
- It never opens a page well: its title is always a secondary heading, so put a `banner`, `rich-text` or `split-content` title section above it.
- Natural neighbours: `map`, `core-form`, `accordion` (FAQ), `action-bar` before it.
- Two to four blocks. Three is often enough; an empty social column or a near-empty text column weakens the grid.
- Fits every local business: restaurants, clinics, trades, studios, nonprofits.
- Prefer `business_details` over typing the address and hours into a `text_block`: it reads the project details, so page and structured data never disagree, and days with the same hours collapse into one line.

## Pitfalls

- Do not place it as the last section of a page directly above the footer. The global footer already carries address, hours, links and social icons; stacked, the visitor sees the same content twice. End pages with an `action-bar` instead and use this section earlier in the flow.
- It is a utility section: it almost always belongs on `standard-primary` or `standard-secondary`. Highlight surfaces are for high-value content; a dark band around opening hours spends that emphasis for nothing.
- A `menu_block` shows one level only; items nested under a parent are hidden. Give it a flat menu such as `footer-menu`, never the main navigation with dropdowns. Five to seven links read best.
- `social_block` has no per-block settings: it shows the site's social profiles when any are set and nothing useful otherwise. Add the profiles first or leave the block out.
- `business_details` shows nothing but its title on the published site when the project details are empty; check the preview rather than assuming the column has content. Its `text` (Additional details) is for the owner's own extra lines, such as parking or "by appointment", never a retyped address.
- `first-featured` and `last-featured` widen one column by a full extra column; with two blocks that is a two-thirds/one-third split. Use `equal` when no block deserves the lead.
- Any scheme other than `standard-primary` pads the content inside its own coloured band, so `top_spacing` and `bottom_spacing` set to `none` remove that inner padding rather than closing an outer gap. Under a filled section above, `small` gives the docked look.
- Keep the `info` text to two or three short sentences; a long paragraph pushes the other columns far below their titles.

## Recipes

### Restaurant contact block

Business name, a one-line blurb, hours from project details and a flat footer menu. The user supplies the restaurant description and must have address and hours filled in the project details.

```json
{
  "type": "contact-details",
  "settings": { "heading_alignment": "center", "layout": "first-featured", "color_scheme": "standard-secondary" },
  "blocks": [
    { "type": "info", "settings": { "title": "Example Kitchen", "text": "<p>A neighbourhood restaurant serving seasonal dishes made with local produce.</p>" } },
    { "type": "business_details", "settings": { "title": "Visit Us", "show_address": true, "show_contact": true, "show_hours": true } },
    { "type": "menu_block", "settings": { "title": "Explore", "menu": "footer-menu" } },
    { "type": "social_block", "settings": { "title": "Follow Us" } }
  ]
}
```

### Professional services, minimal

Left-aligned, no title, three equal columns: firm name, office hours, quick links. The user supplies the firm description and the hours text.

```json
{
  "type": "contact-details",
  "settings": { "eyebrow": "Contact", "heading_alignment": "start", "layout": "equal", "color_scheme": "standard-primary" },
  "blocks": [
    { "type": "info", "settings": { "title": "Example Advisory", "text": "<p>Independent advice for owner-managed businesses.</p>" } },
    { "type": "text_block", "settings": { "title": "Office Hours", "text": "<p>Monday to Friday, 9am to 5pm</p><p>Meetings by appointment.</p>" } },
    { "type": "menu_block", "settings": { "title": "Quick Links", "menu": "footer-menu" } }
  ]
}
```

### Clinic with emergency instructions

Practice identity leads; a dedicated column tells patients what to do out of hours. The user supplies the after-hours instructions; address and hours come from project details.

```json
{
  "type": "contact-details",
  "settings": { "title": "Reach Out", "heading_alignment": "center", "layout": "first-featured", "color_scheme": "standard-primary" },
  "blocks": [
    { "type": "info", "settings": { "title": "Example Dental", "text": "<p>Family dentistry in a calm, modern practice. New patients welcome.</p>" } },
    { "type": "business_details", "settings": { "title": "Hours and Location", "show_address": true, "show_contact": true, "show_hours": true } },
    { "type": "text_block", "settings": { "title": "Out of Hours", "text": "<p>For urgent dental pain call (555) 010-0100 and follow the recorded instructions.</p>" } }
  ]
}
```

### Studio with social emphasis

For a studio whose social profiles matter more than a postal address: the social column is the wide one. The user supplies the blurb and needs social profiles set in the project details.

```json
{
  "type": "contact-details",
  "settings": { "eyebrow": "Let's Talk", "title": "Start a Project", "heading_alignment": "start", "layout": "last-featured", "color_scheme": "standard-secondary" },
  "blocks": [
    { "type": "info", "settings": { "title": "Example Studio", "text": "<p>Brand and web design for small teams. Email hello@example.com.</p>" } },
    { "type": "menu_block", "settings": { "title": "Work", "menu": "footer-menu" } },
    { "type": "social_block", "settings": { "title": "Follow" } }
  ]
}
```
