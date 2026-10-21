# resource-list

## Purpose

A list of downloadable documents, each in its own boxed row with a title, a one-line description and a small button that opens the file in a new tab. For brochures, menus, price lists, forms, policies and class materials. An optional photo can sit beside the list.

Each `resource` block is one row; its `file` is the document the button opens and `button_label` is the button's wording. Without a file the row shows text only and no button. Without the section `image` the list sits in a centred reading column; with one, the page splits into two columns on desktop, the photo on the side chosen by `image_position` and staying in view while the list scrolls.

## When to use

- A `resources`, `menu` or `new-patients` page, or the end of a service page where visitors need the paperwork: intake forms, brochures, price sheets, handbooks, terms.
- Good for three to six documents with a clear name each. Clinics and practices, schools and clubs, restaurants with PDF menus, agencies with capability decks, landlords and venues with floor plans.
- Bad for a single download (a `rich-text` button is enough), for more than eight files (split into several sections by eyebrow, or move to a dedicated page) and for links to web pages rather than files (`icon-list`, `card-grid`).
- Can open a page when it has a `title`, but it is better placed after a `rich-text` opener with `top_spacing` `none`. It never supports a transparent header; only `banner`, `slideshow` and `video-popup` do.
- Sits well after explanatory `rich-text` or `accordion` and before `contact-details` or a call to action.
- Needs the actual files uploaded; a row without one is a promise with no button.

## Pitfalls

- Button labels should say what the visitor gets: "Download menu (PDF)", "Open intake form". A list where every row says "Download" wastes the only interactive element.
- Descriptions are plain text and read best as one sentence: what the document is and who needs it. Marketing copy belongs in the section `description`.
- `image_position` has no effect without an `image`. With an image, use `heading_alignment` `start`; a centred heading over a two-column body looks off balance.
- The photo should be a calm, relevant picture (the storefront, the team at work, the product), not a page of the document itself; it stays in view as the list scrolls, so a busy image is a distraction.
- On `standard-secondary` and `highlight-secondary` the rows take a soft fill; on `standard-primary` and `highlight-primary` they are outlined boxes. All four work, but documents are utility content, so prefer `standard-primary` or `standard-secondary` and leave the page's highlight for persuasion.
- Filled schemes pad inside their own band; `top_spacing` or `bottom_spacing` `none` on them removes inner padding, not the gap to the neighbour. Use `none` only directly under an unfilled `rich-text` opener.
- Files open in a new tab; some browsers download them straight away. Say so in the description for large files.

## Recipes

### Downloads page

A centred list of the three documents most visitors ask for, no photo, under a `rich-text` opener. Upload one file per row.

```json
{
  "type": "resource-list",
  "settings": {
    "eyebrow": "Downloads",
    "title": "Documents and forms",
    "description": "Everything you may need before your first visit.",
    "heading_alignment": "center",
    "color_scheme": "standard-primary",
    "top_spacing": "none"
  },
  "blocks": [
    { "type": "resource", "settings": { "title": "Service brochure", "description": "An overview of what we do and how we price it.", "button_label": "Download brochure (PDF)" } },
    { "type": "resource", "settings": { "title": "New client form", "description": "Fill it in before your first appointment.", "button_label": "Open form (PDF)" } },
    { "type": "resource", "settings": { "title": "Price list", "description": "Current prices for all services.", "button_label": "Download price list (PDF)" } }
  ]
}
```

### Menus beside a photo

Restaurant menus as PDFs with a photo of the dining room on the right; left-aligned heading, soft band. Supply one landscape photo and the menu files.

```json
{
  "type": "resource-list",
  "settings": {
    "eyebrow": "Menus",
    "title": "Download our menus",
    "description": "Menus change with the season; the files are updated each week.",
    "heading_alignment": "start",
    "image_position": "end",
    "color_scheme": "standard-secondary"
  },
  "blocks": [
    { "type": "resource", "settings": { "title": "Lunch menu", "description": "Served every day until three.", "button_label": "Open lunch menu" } },
    { "type": "resource", "settings": { "title": "Dinner menu", "description": "From six, with daily specials.", "button_label": "Open dinner menu" } },
    { "type": "resource", "settings": { "title": "Drinks list", "description": "Wine, beer and soft drinks.", "button_label": "Open drinks list" } },
    { "type": "resource", "settings": { "title": "Group bookings", "description": "Set menus for parties of eight or more.", "button_label": "Open group menu" } }
  ]
}
```

### Patient forms

Intake paperwork for a clinic with a reassuring photo on the left; four forms with specific labels.

```json
{
  "type": "resource-list",
  "settings": {
    "eyebrow": "Before your visit",
    "title": "Patient forms",
    "description": "Download, complete and bring these with you to save time at reception.",
    "heading_alignment": "start",
    "image_position": "start",
    "color_scheme": "standard-primary"
  },
  "blocks": [
    { "type": "resource", "settings": { "title": "Registration form", "description": "Your details and contact preferences.", "button_label": "Open registration form" } },
    { "type": "resource", "settings": { "title": "Medical history", "description": "Conditions, medication and allergies.", "button_label": "Open history form" } },
    { "type": "resource", "settings": { "title": "Insurance details", "description": "Only if you are claiming through an insurer.", "button_label": "Open insurance form" } },
    { "type": "resource", "settings": { "title": "Privacy notice", "description": "How we store and use your information.", "button_label": "Read privacy notice" } }
  ]
}
```
