# footer

## Purpose

The site's closing band on every page: up to four columns chosen from logo and blurb, free text, a link list, social icons, business details and certification badges, with a small copyright line underneath. It is a global part: one footer, shared by every page.

By default it is a dark `highlight-primary` band that ends the page firmly; on a standard surface it fades into the page instead.

## When to use

- Every site has exactly one. Build it after the menus and the Project details exist, because `menu_block`, `social_block` and `business_details` draw on them.
- Three or four columns suit most sites: `logo_text` with a one-sentence blurb, a `menu_block`, then contact details and social icons. A single `logo_text` column makes a quiet signature footer for portfolios.
- Use `business_details` rather than typing an address into a `text_block`; it reads the address, phone, email and opening hours from Project details so they stay in step with what search engines are told.
- `text_block` is for anything else: a short contact note, a registration number, a service area, a newsletter sentence.
- `badges_block` is for third-party marks such as certifications, memberships and awards; it needs the badge images.
- `copyright` holds the legal line only: year, business name, rights statement, perhaps a privacy link.

## Pitfalls

- The footer takes at most four blocks. A fifth cannot be added; combine contact and hours in `business_details` to free a column.
- `layout` decides column widths: `first-featured` gives the first block a double column, `last-featured` the last, `equal` shares the width evenly. Put the block that carries the most text, usually `logo_text`, in the featured position; a featured `social_block` is a row of icons floating in empty space.
- Blocks are laid out in their order, left to right. On phones they stack in the same order, so the most useful column (contact or menu) should not be last.
- `menu_block` shows a flat list; submenus of the chosen menu are hidden. Point it at a shallow menu such as `footer-menu`, not at the nested `main-menu`.
- `social_block` shows the profiles entered in Project details, or failing that the theme's social settings, with no per-block choice. With none set the column is just its title, so remove the block or fill in the profiles.
- `business_details` and `social_block` show nothing from an empty Project details, which looks fine in the editor but leaves a bare title on the published site. Use the `text` (Additional details) of `business_details` for extra lines of the owner's own, not to retype the address.
- `copyright` left blank removes the line and its divider, and the footer closes with even padding; a line with only spaces still counts as blank.
- `logo_width` sizes the footer logo separately from the header's. A small mark reads well at 80 to 120; a wide wordmark may need 200 or more. Supply a light logo version when the footer is on a highlight scheme.
- `badges_block` images are capped by `max_height`; mixed badge shapes line up by height, so wide badges look larger than square ones. A `badge_1_link` and its siblings are optional; link only to pages that verify the badge.
- Colour scheme continuity matters: if the last section of most pages is already a highlight band, a footer in the same highlight fuses with it into one tall block. Pick the other highlight or a standard surface, and keep the choice consistent across the site.

## Recipes

### Classic four columns

Brand, contact, links and social on the default dark band with the brand column featured. The user supplies a light logo image, the blurb and the profiles in Project details.

```json
{
  "type": "footer",
  "settings": {
    "copyright": "<p>© 2026 Business name. All rights reserved.</p>",
    "layout": "first-featured",
    "color_scheme": "highlight-primary"
  },
  "blocks": [
    { "type": "logo_text", "settings": { "logo_text": "Business name", "logo_width": 120, "text": "<p>One sentence on what the business does and where.</p>" } },
    { "type": "business_details", "settings": { "title": "Visit us", "show_address": true, "show_contact": true, "show_hours": true } },
    { "type": "menu_block", "settings": { "title": "Explore", "menu": "footer-menu" } },
    { "type": "social_block", "settings": { "title": "Follow" } }
  ]
}
```

### Local business with hours

Address, phone and opening hours lead the footer on a soft surface, for shops, cafés, clinics and salons. The user fills the address, phone, email and opening hours in Project details.

```json
{
  "type": "footer",
  "settings": {
    "copyright": "<p>© 2026 Business name</p>",
    "layout": "first-featured",
    "color_scheme": "standard-secondary"
  },
  "blocks": [
    { "type": "business_details", "settings": { "title": "Find us", "show_address": true, "show_contact": true, "show_hours": true } },
    { "type": "menu_block", "settings": { "title": "Pages", "menu": "footer-menu" } },
    { "type": "logo_text", "settings": { "logo_text": "Business name", "text": "<p>A one-line description of the place.</p>" } }
  ]
}
```

### Signature footer

A single brand column with a short statement, for portfolios and studios that want a quiet ending. The user supplies the logo image or site name and one sentence.

```json
{
  "type": "footer",
  "settings": {
    "copyright": "<p>© 2026 Studio name</p>",
    "layout": "equal",
    "color_scheme": "standard-primary"
  },
  "blocks": [
    { "type": "logo_text", "settings": { "logo_text": "Studio name", "logo_width": 160, "text": "<p>One sentence that says what the studio stands for.</p>" } }
  ]
}
```

### Credentials and contact

Brand, a plain contact note, certification badges and social icons on the second highlight surface, for trades and professional services. The user supplies two to four badge images and a light logo.

```json
{
  "type": "footer",
  "settings": {
    "copyright": "<p>© 2026 Business name. Registered in Springfield, no. 0000000.</p>",
    "layout": "equal",
    "color_scheme": "highlight-secondary"
  },
  "blocks": [
    { "type": "logo_text", "settings": { "logo_text": "Business name", "text": "<p>Serving Springfield and the surrounding area.</p>" } },
    { "type": "text_block", "settings": { "title": "Contact", "text": "<p>hello@example.com</p><p>(555) 010-0100</p>" } },
    { "type": "badges_block", "settings": { "title": "Accredited by", "max_height": 50 } },
    { "type": "social_block", "settings": { "title": "Elsewhere" } }
  ]
}
```
