# map

## Purpose

An embedded Google map with the address and a directions link beneath it, and an optional sidebar of short info cards (hours, parking, contact) with the site's social icons. It is the location block of a `contact` page or a "visit us" section on the homepage.

The map itself comes from `embed_url`, the address URL Google Maps offers under Share, Embed a map. The sidebar appears only when the section has at least one `info` or `social` block; `sidebar_position` then puts it to the left or right of the map on desktop. On phones everything stacks.

## When to use

- Role: a practical utility section near the end of a page, after the visitor has decided to get in touch or come by.
- Good for: anywhere people visit in person: shops, restaurants, clinics, studios, venues, offices with walk-in hours, a market stall with a weekly spot.
- Bad for: online-only businesses, several locations (one map per location, or a `card-grid` of addresses), or carrying the whole contact story alone.
- Opening a page: avoid it; a map before any words is disorienting. Start the `contact` page with a `rich-text` title or `split-content`, then the form, then the map. It does not support the header's transparent mode, which only `banner`, `slideshow` and `video-popup` support.
- Natural neighbours: `contact-details`, `core-form`, `accordion` for visiting questions, `schedule-table` for opening hours when they vary.
- Content needed: the embed URL, the address written as a visitor would read it, and ideally a directions link; two to four sidebar cards at most.

## Pitfalls

- Paste only the address from inside the embed code, the part after src=, into `embed_url`. Pasting the whole embed snippet shows nothing. A plain Google Maps page link does not work either; it must be the embed address.
- With `embed_url` empty the editor shows a placeholder but the published site shows an empty gap. Never publish without it.
- `address` is for display; it does not move the map. The pin comes from the embed URL, so generate it from the exact place.
- The directions link needs its own text ("Get directions") and a maps link; it is the fastest route for phone visitors, so fill it in rather than relying on the small controls inside the embed.
- Sidebar cards are short: a title and two or three lines in `<p>` or a short list, no `<br>`. Hours work best as a list, one line per day group.
- The `social` block repeats the icons from theme settings; if the footer already shows them, leave it out. It shows nothing when no social links are set.
- Functional content belongs on standard surfaces; a map on a highlight band is decoration. A `color_scheme` other than `standard-primary` makes the section a filled band whose spacing is padding inside its colour.
- When the page already carries a "Contact" or "Visit" heading, clear `title` and `eyebrow` so the page does not say it twice.
- The map is loaded from Google; a privacy notice or cookie banner may be required where the site is published, and it adds load time, so one map per page.

## Recipes

### Simple locator

Map, address and directions link, no sidebar, for a single location. Supply the embed URL and a directions link; no images needed.

```json
{
  "type": "map",
  "settings": { "title": "Find us", "heading_alignment": "center", "address": "12 Example Street, Example City", "directions_link": { "text": "Get directions", "href": "https://maps.example.com/", "target": "_blank" }, "height": "medium", "show_address": true, "color_scheme": "standard-primary" },
  "blocks": []
}
```

### Contact hub

A tall map with hours and contact details beside it, replacing a separate details section. Supply the embed URL, opening hours and the public phone and email.

```json
{
  "type": "map",
  "settings": { "eyebrow": "Visit", "title": "Come and see us", "heading_alignment": "start", "address": "12 Example Street, Example City", "directions_link": { "text": "Get directions", "href": "https://maps.example.com/", "target": "_blank" }, "height": "large", "show_address": true, "sidebar_position": "end", "color_scheme": "standard-primary" },
  "blocks": [
    { "type": "info", "settings": { "title": "Hours", "text": "<ul><li>Monday to Friday, 9:00 to 18:00</li><li>Saturday, 10:00 to 14:00</li><li>Sunday, closed</li></ul>" } },
    { "type": "info", "settings": { "title": "Contact", "text": "<p>(555) 010-0100</p><p>hello@example.com</p>" } },
    { "type": "social", "settings": {} }
  ]
}
```

### Quiet map above the footer

A short map with no heading as the last section of the homepage. Supply the embed URL; the address line alone is enough.

```json
{
  "type": "map",
  "settings": { "title": "", "address": "12 Example Street, Example City", "height": "small", "show_address": true, "color_scheme": "standard-secondary", "bottom_spacing": "none" },
  "blocks": []
}
```

### Visiting details

Map with a left sidebar of practical notes for first-time visitors. Supply the embed URL and short notes on parking, transport and access.

```json
{
  "type": "map",
  "settings": { "eyebrow": "Plan your visit", "title": "Getting here", "heading_alignment": "start", "address": "12 Example Street, Example City", "height": "medium", "show_address": true, "sidebar_position": "start", "color_scheme": "standard-primary" },
  "blocks": [
    { "type": "info", "settings": { "title": "Parking", "text": "<p>One sentence on where to park and whether it is free.</p>" } },
    { "type": "info", "settings": { "title": "Public transport", "text": "<p>One sentence naming the nearest stop and the walk from it.</p>" } },
    { "type": "info", "settings": { "title": "Access", "text": "<p>One sentence on step-free access and facilities.</p>" } }
  ]
}
```
