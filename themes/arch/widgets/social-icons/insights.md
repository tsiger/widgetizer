# social-icons

## Purpose

A row of linked social-media icons with an optional eyebrow, heading and one line of text above. It is a small "follow us" moment near the end of a page; the icons themselves come from the site's social settings, not from this section.

Whichever profile addresses are filled in under the theme's social settings (`instagram_url`, `facebook_url`, `linkedin_url`, `youtube_url`, `tiktok_url` and the rest) appear here as icons, in the same set the footer shows. There are no blocks and no per-section choice of networks.

## When to use

- A closing or supporting section: after `contact-details` or `map` on `contact`, after a `gallery` on a visual page, or just above the footer on `index`.
- Good for brands whose social feeds are part of the offer: cafés, bakeries, salons, fitness studios, photographers, makers, musicians, community groups.
- Bad as the only call to action on a page; it sends visitors away. Pair it with a real conversion section (`action-bar`, a form) higher up.
- It cannot sensibly open a page, and it never supports a transparent header.
- Natural neighbours: `contact-details`, `map`, `schedule-table`, `gallery`, `testimonials`.
- Needs at least two social addresses to look like a row. With one or none it looks broken; use a text link in `rich-text` instead.
- Fits consumer-facing businesses. Professional firms usually keep social links in the footer only.

## Pitfalls

- The icons are shared site-wide. Filling in a new network in the social settings adds it to every social-icons section and to the footer at once; there is no way to show different networks in different places.
- An empty social settings panel renders the heading with nothing under it. Check the settings before placing this section.
- `heading_alignment` moves the icon row as well as the text. `start` with two or three icons leaves a lonely cluster on the left; `center` suits small sets.
- `icon_size` at the top of its range turns the row into a statement and asks for a highlight scheme and a real heading; at the bottom it is a footnote and reads best without a heading.
- Keep `description` to one sentence. The section is a pause, not a paragraph.
- Functional content rarely earns a highlight surface. Use `highlight-primary` or `highlight-secondary` here only when the social invitation is genuinely the page's closing message, and never directly next to another highlight section.
- Filled schemes pad inside their own band, so `top_spacing` `none` on a filled section removes its inner padding rather than the gap to the neighbour. Use `none` only to tuck an unfilled icon row under an unfilled `contact-details` or `rich-text` section.
- The email icon opens the visitor's mail app rather than a web page; include it only when email is a channel you answer.

## Recipes

### Follow strip above the footer

Heading-less icon row that closes a page quietly. No images or text needed.

```json
{
  "type": "social-icons",
  "settings": {
    "eyebrow": "",
    "title": "",
    "description": "",
    "heading_alignment": "center",
    "icon_size": 2.0,
    "color_scheme": "standard-primary",
    "top_spacing": "small",
    "bottom_spacing": "small"
  }
}
```

### Community invitation band

A full highlight band with a heading and larger icons, as the closing section of a home page for a brand that lives on social media.

```json
{
  "type": "social-icons",
  "settings": {
    "eyebrow": "Join the community",
    "title": "Let's stay in touch",
    "description": "Behind-the-scenes, new work and the occasional giveaway.",
    "heading_alignment": "center",
    "icon_size": 3.2,
    "color_scheme": "highlight-primary"
  }
}
```

### Contact-page companion

Left-aligned, small icons tucked under `contact-details` so the two read as one block.

```json
{
  "type": "social-icons",
  "settings": {
    "title": "Find us online",
    "description": "",
    "heading_alignment": "start",
    "icon_size": 1.8,
    "color_scheme": "standard-primary",
    "top_spacing": "none"
  }
}
```

### Soft band with a line of text

A calm, centred section on the secondary surface for mid-page placement after a gallery or testimonials.

```json
{
  "type": "social-icons",
  "settings": {
    "eyebrow": "",
    "title": "Follow the work",
    "description": "New pieces appear on our feeds before they reach the site.",
    "heading_alignment": "center",
    "icon_size": 2.4,
    "color_scheme": "standard-secondary"
  }
}
```
