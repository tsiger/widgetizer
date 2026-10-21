# features-split

## Purpose

A two-column section: the heading group (eyebrow, title, description) on one side and a vertical list of icon-led features on the other, optionally separated by a thin vertical line. Use it when one strong statement needs three to five supporting points, such as who you serve, why choose us, or how the process works.

Each `feature` is one row of the list: icon, title, short richtext description. The heading column stays short and the list column carries the detail, so the eye reads the claim first and the proof second.

## When to use

- The argument section of a home page or `services` page, after the opener and before social proof.
- Good for: customer segments, differentiators, a three-to-five-step process, what a package includes, locations with a line each. Bad for: more than six points (use `icon-card-grid` or `icon-list`), points that need images (use `image-text` or `checkerboard`), a single paragraph (use `split-content`).
- It can open a page: its title becomes the page heading when first. It cannot sit under a header with `transparent_on_hero`; only `banner`, `slideshow` and `video-popup` support the transparent header.
- Natural neighbours: `banner` or `rich-text` above, `testimonials`, `key-figures` or `action-bar` below. Alternate `content_position` with the image side of a neighbouring `split-content` so the page zigzags.
- Needs a title, ideally a one-sentence description, and three to five features with a title and one or two lines each.
- Fits trades, agencies, clinics, salons, gyms, consultancies, multi-location businesses.

## Pitfalls

- Keep `heading_alignment` at `start`. The heading sits in a half-width column; centring it there floats the text away from both the edge and the list and looks accidental. `center` only works when the heading column is a short title alone.
- Every feature title is printed even when empty, so give each `feature` a title; a blank one leaves an empty gap above its description.
- The heading column is short and the list column is tall. With five long features the heading floats at the top with empty space beneath it; keep descriptions to one or two sentences, or cut to three or four features.
- `show_divider` draws the line on the list side and flips with `content_position`. It suits sequential or categorical lists; turn it off for loosely related benefits where a softer feel is wanted.
- `icon_style`, `icon_size` and `icon_shape` apply to all features at once. `plain` reads minimal, `outline` approachable, `filled` confident; pick one per site rather than per section. `icon_shape` only shows with `outline` or `filled`.
- Below tablet width the two columns stack, heading first, so the section becomes a heading over a list; it is still fine, but do not rely on the side-by-side shape for meaning.
- Any scheme other than `standard-primary` pads the content inside its own coloured band, so `top_spacing` and `bottom_spacing` set to `none` remove that inner padding; under a filled hero use `small`. This section often carries the page's main argument, so it is a reasonable candidate for a highlight scheme when the page has no other.
- Replace the default eyebrow, title and description; they are template placeholders.

## Recipes

### Who we serve

Three customer types with filled circular icons and a divider. The user supplies the segment names and a sentence on the value for each.

```json
{
  "type": "features-split",
  "settings": { "eyebrow": "Who We Serve", "title": "Built for Every Kind of Property", "description": "Placeholder sentence on how the service adapts to each customer.", "heading_alignment": "start", "content_position": "start", "show_divider": true, "icon_style": "filled", "icon_size": "lg", "icon_shape": "circle", "color_scheme": "standard-primary" },
  "blocks": [
    { "type": "feature", "settings": { "icon": "home", "title": "Homeowners", "description": "<p>Placeholder line on what homeowners get.</p>" } },
    { "type": "feature", "settings": { "icon": "building", "title": "Property Managers", "description": "<p>Placeholder line on what managers get.</p>" } },
    { "type": "feature", "settings": { "icon": "users", "title": "Commercial Clients", "description": "<p>Placeholder line on what businesses get.</p>" } }
  ]
}
```

### Why choose us

The heading asks the question on the right, four plain-icon answers on the left, no divider, on the soft alternate surface. The user supplies four differentiators.

```json
{
  "type": "features-split",
  "settings": { "eyebrow": "Why Us", "title": "Reasons People Stay With Us", "heading_alignment": "start", "content_position": "end", "show_divider": false, "icon_style": "plain", "icon_size": "md", "color_scheme": "standard-secondary" },
  "blocks": [
    { "type": "feature", "settings": { "icon": "shield", "title": "Licensed and Insured", "description": "<p>Placeholder reassurance line.</p>" } },
    { "type": "feature", "settings": { "icon": "clock", "title": "On Time, Every Time", "description": "<p>Placeholder reassurance line.</p>" } },
    { "type": "feature", "settings": { "icon": "certificate", "title": "Certified Team", "description": "<p>Placeholder reassurance line.</p>" } },
    { "type": "feature", "settings": { "icon": "heart", "title": "Local and Independent", "description": "<p>Placeholder reassurance line.</p>" } }
  ]
}
```

### How it works

A four-step process; the divider reinforces the sequence and numbers lead each title. The user supplies the steps in order.

```json
{
  "type": "features-split",
  "settings": { "eyebrow": "Process", "title": "What Happens After You Get in Touch", "heading_alignment": "start", "content_position": "start", "show_divider": true, "icon_style": "filled", "icon_size": "md", "icon_shape": "sharp", "color_scheme": "standard-primary" },
  "blocks": [
    { "type": "feature", "settings": { "icon": "phone", "title": "1. Quick Call", "description": "<p>Placeholder line on the first conversation.</p>" } },
    { "type": "feature", "settings": { "icon": "clipboard-list", "title": "2. Site Visit and Quote", "description": "<p>Placeholder line on the assessment.</p>" } },
    { "type": "feature", "settings": { "icon": "calendar", "title": "3. Scheduled Work", "description": "<p>Placeholder line on booking the job.</p>" } },
    { "type": "feature", "settings": { "icon": "checks", "title": "4. Walkthrough", "description": "<p>Placeholder line on sign-off.</p>" } }
  ]
}
```

### Core services on a highlight band

The main argument of a services page, outlined icons on the strongest surface. The user supplies three or four service names with a line each.

```json
{
  "type": "features-split",
  "settings": { "eyebrow": "Services", "title": "Everything Under One Roof", "description": "Placeholder sentence on the breadth of the offer.", "heading_alignment": "start", "content_position": "start", "show_divider": true, "icon_style": "outline", "icon_size": "lg", "icon_shape": "rounded", "color_scheme": "highlight-primary" },
  "blocks": [
    { "type": "feature", "settings": { "icon": "sparkles", "title": "Service One", "description": "<p>Placeholder line.</p>" } },
    { "type": "feature", "settings": { "icon": "leaf", "title": "Service Two", "description": "<p>Placeholder line.</p>" } },
    { "type": "feature", "settings": { "icon": "star", "title": "Service Three", "description": "<p>Placeholder line.</p>" } }
  ]
}
```
