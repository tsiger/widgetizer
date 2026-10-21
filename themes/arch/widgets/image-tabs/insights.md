# image-tabs

## Purpose

A column of clickable tabs, each with a short title and one or two sentences, beside one image panel; choosing a tab swaps the picture. It presents three to five parallel items that each deserve their own photo, such as services, rooms, product variants or process steps, without a page per item.

All tab titles and descriptions are visible at once as a list, the active tab is marked with the accent colour, and the first tab is selected on load. On desktop the list and the image sit side by side; on phones the image stacks above the list. The panel's shape comes from `aspect_ratio`, and the photo is cropped to fill it.

## When to use

- Role: a compact "what we offer" or "how it works" section in the body of a page, where a grid of cards would be too dry and a page per item too much.
- Good for: service businesses with three to five offerings, venues showing their rooms, restaurants showing menu categories, agencies showing a process, makers showing variants or finishes.
- Bad for: one item (`image-text`), six or more items (the list grows far taller than the image; use `card-grid` or `accordion`), long explanations.
- Opening a page: possible, since the `title` becomes the page heading when the section is first, but the hidden images make a weak opener. It does not support the header's transparent mode, which only `banner`, `slideshow` and `video-popup` support.
- Natural neighbours: a `rich-text` introduction above, `key-figures` or `testimonials` below, an `action-bar` to close the page.
- Content needed: one photo per tab, all in the same orientation, a title of two to four words and at most about 25 words of description each.

## Pitfalls

- Photos must share a shape. `auto` uses each image's natural height, so the panel jumps between tabs when the photos differ; fix `4 / 3` or `3 / 2` for photos. `contain` shows the whole image with empty space around it, which suits screenshots, diagrams and packshots, not photos.
- The list grows with every description. Long descriptions make it far taller than the image on desktop, leaving the picture floating. One or two short sentences each, or none.
- All descriptions are visible all the time, so write each as a standalone teaser, not as text that only makes sense with its image showing.
- The first tab is what everyone sees; put the most important item and the strongest photo there.
- With `title` blank, the tab titles become the section's headings; keep them meaningful rather than "Tab 1".
- `image_position` only matters on desktop; alternate it against the previous split section so the page does not lean to one side.
- A `color_scheme` other than `standard-primary` makes the section a filled band whose spacing is padding inside its colour. Use a highlight surface only when the content is the page's persuasive core; otherwise `standard-secondary` for banding.

## Recipes

### Service showcase

One tab per core service with a photo of the work. Supply three landscape photos of similar framing and a two-sentence summary for each.

```json
{
  "type": "image-tabs",
  "settings": { "eyebrow": "What we do", "title": "Three ways we can help", "heading_alignment": "center", "image_position": "start", "aspect_ratio": "4 / 3", "color_scheme": "standard-primary" },
  "blocks": [
    { "type": "tab", "settings": { "title": "Design", "description": "<p>One sentence on what this service covers and who it is for.</p>" } },
    { "type": "tab", "settings": { "title": "Build", "description": "<p>One sentence on what this service covers and who it is for.</p>" } },
    { "type": "tab", "settings": { "title": "Maintain", "description": "<p>One sentence on what this service covers and who it is for.</p>" } }
  ]
}
```

### Room or space tour

Lets a visitor flip through the rooms or areas of a venue. Supply one landscape interior photo per area, shot at a similar height, and a line on capacity or mood for each.

```json
{
  "type": "image-tabs",
  "settings": { "title": "Explore the space", "heading_alignment": "start", "image_position": "end", "aspect_ratio": "3 / 2", "color_scheme": "standard-secondary" },
  "blocks": [
    { "type": "tab", "settings": { "title": "Main room", "description": "<p>Seats a stated number of guests; the room most events use.</p>" } },
    { "type": "tab", "settings": { "title": "Private room", "description": "<p>A smaller room for meetings and family gatherings.</p>" } },
    { "type": "tab", "settings": { "title": "Terrace", "description": "<p>Outdoor area open in the warmer months.</p>" } }
  ]
}
```

### Process in four steps

Walks a prospect through an engagement from first call to handover. Supply four photos showing the work at each stage; name the tabs as steps in order.

```json
{
  "type": "image-tabs",
  "settings": { "eyebrow": "How it works", "title": "From first call to handover", "heading_alignment": "center", "image_position": "start", "aspect_ratio": "4 / 3", "color_scheme": "standard-primary" },
  "blocks": [
    { "type": "tab", "settings": { "title": "1. Consultation", "description": "<p>What happens in the first conversation.</p>" } },
    { "type": "tab", "settings": { "title": "2. Plan", "description": "<p>What the client receives and approves.</p>" } },
    { "type": "tab", "settings": { "title": "3. Work", "description": "<p>How the work is carried out and communicated.</p>" } },
    { "type": "tab", "settings": { "title": "4. Handover", "description": "<p>What is delivered and what support follows.</p>" } }
  ]
}
```

### Product variants with the whole image shown

Shows finishes, colours or models of one product without cropping. Supply packshots or renders on a plain background; `contain` keeps every pixel visible inside the panel.

```json
{
  "type": "image-tabs",
  "settings": { "title": "Choose a finish", "heading_alignment": "start", "image_position": "end", "aspect_ratio": "contain", "color_scheme": "standard-primary" },
  "blocks": [
    { "type": "tab", "settings": { "title": "Natural oak", "description": "<p>A line on the look and where it fits best.</p>" } },
    { "type": "tab", "settings": { "title": "Matte black", "description": "<p>A line on the look and where it fits best.</p>" } },
    { "type": "tab", "settings": { "title": "Brushed steel", "description": "<p>A line on the look and where it fits best.</p>" } }
  ]
}
```
