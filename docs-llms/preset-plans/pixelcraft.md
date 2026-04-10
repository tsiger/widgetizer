# Pixelcraft - Graphic Designer

## Identity

**Name:** Pixelcraft  
**Industry:** Graphic Designer  
**Brand personality:** Bold, system-minded, sharp, and commercially aware. Pixelcraft is positioned as an independent graphic designer working with founders, product teams, hospitality brands, and cultural businesses that need a clear visual system rather than disconnected one-off graphics.

**Primary conversion:** New project inquiry.  
**Trust mechanism:** Strong work, visible process, clear capabilities, and evidence that the designer can translate business goals into a usable system.  
**Emotional tone:** Confident, modern, energetic, and precise.  
**Image style:** Clean art direction, brand mockups, launch visuals, packaging, digital interfaces, and editorial product scenes.  
**Content density:** Medium. Enough structure to feel strategic, but not overloaded with agency jargon.  
**Homepage priority:** Show that Pixelcraft can turn messy ideas into a coherent brand world.

---

## Sitemap Rationale

Pixelcraft uses a compact five-page sitemap, but not the default small-business one.

- `Home`: establish point of view, trust, and range
- `Work`: prove quality through portfolio and outcomes
- `Capabilities`: explain the actual offer clearly
- `Process`: show how engagements run and what clients receive
- `Contact`: reduce friction for project inquiries

This works for the niche because a graphic designer needs to prove more than taste:

- `Work` carries visual proof
- `Capabilities` structures the offer in business terms
- `Process` proves rigor and lowers buyer anxiety
- `Contact` qualifies the right projects without requiring an extra About page

There is no separate `About` page because biography is not the strongest trust mechanism for this preset. The stronger proof is method + work + clear deliverables.

---

## preset.json Settings

### Color Palette

A studio palette built from warm paper neutrals, charcoal interface tones, and a vivid signal-orange accent.

**Standard palette**

| Token | Value | Rationale |
|-------|-------|-----------|
| `standard_bg_primary` | `#f3efe8` | Warm drafting-paper base |
| `standard_bg_secondary` | `#e5dfd4` | Soft alternate band for structured sections |
| `standard_text_heading` | `#15151a` | Near-black for crisp editorial contrast |
| `standard_text_content` | `#3e3a36` | Warm charcoal body copy |
| `standard_text_muted` | `#7d766f` | Useful neutral for metadata and helper text |
| `standard_border_color` | `#cfc6b9` | Quiet divider color that fits the paper palette |
| `standard_accent` | `#ff6b3d` | Signal-orange accent for CTAs and emphasis |
| `standard_accent_text` | `#141418` | Dark text for strong contrast on the accent |
| `standard_rating_star` | `#ffb84d` | Warm amber used only where stars appear |

**Highlight palette**

| Token | Value | Rationale |
|-------|-------|-----------|
| `highlight_bg_primary` | `#111216` | Studio-black anchor surface |
| `highlight_bg_secondary` | `#1a1c22` | Slightly cooler dark alternate |
| `highlight_text_heading` | `#f6f1e8` | Soft paper-white for headlines |
| `highlight_text_content` | `#d5cec1` | Readable warm-neutral body text |
| `highlight_text_muted` | `#9f9789` | Supporting copy on dark sections |
| `highlight_border_color` | `#323540` | Interface-like dark border tone |
| `highlight_accent` | `#ff8a65` | Lighter orange for dark-surface buttons |
| `highlight_accent_text` | `#141418` | Dark text on the accent |
| `highlight_rating_star` | `#ffb84d` | Consistent amber rating tone |

### Typography

| Setting | Value | Rationale |
|---------|-------|-----------|
| `heading_font` | `{ "stack": "\"Syne\", sans-serif", "weight": 700 }` | Graphic, contemporary, and distinctive without becoming novelty type |
| `body_font` | `{ "stack": "\"IBM Plex Sans\", sans-serif", "weight": 400 }` | Structured, readable, and system-friendly |
| `heading_scale` | `105` | Big enough to feel editorial while staying disciplined |
| `body_scale` | `95` | Slightly tightened for sharper studio rhythm |

### Style

| Setting | Value | Rationale |
|---------|-------|-----------|
| `corner_style` | `sharp` | Cleaner and more system-driven than rounded corners |
| `spacing_density` | `compact` | Keeps the preset taut and intentional |
| `button_shape` | `sharp` | Reinforces the precise studio tone |

---

## Header Configuration

```json
{
  "logoMaxWidth": 180,
  "logoText": "Pixelcraft",
  "contactDetailsLine1": "Identity / Campaigns / Launch Design",
  "contactDetailsLine2": "For founders, products, and cultural brands",
  "contact_position": "menu",
  "headerNavigation": "main-menu",
  "center_nav": true,
  "ctaButtonLink": {
    "href": "contact.html",
    "text": "Start a Project",
    "target": "_self"
  },
  "ctaButtonStyle": "primary",
  "full_width": true,
  "sticky": true,
  "transparent_on_hero": false,
  "color_scheme": "standard-secondary"
}
```

Header strategy:

- full-width paper-toned header instead of a dark portfolio bar
- centered navigation for a more studio/editorial feel
- sticky so the site stays conversion-ready without feeling like a generic SaaS shell

---

## Footer Configuration

```json
{
  "copyright": "(c) 2026 Pixelcraft Studio. All rights reserved.",
  "color_scheme": "highlight-secondary"
}
```

Blocks:

- `logo_text`: Pixelcraft with a short studio positioning statement
- `text_block`: studio contact details
- `menu_block`: footer navigation
- `social_block`: social follow prompt

---

## Pages

### Home (`index.json`) - 7 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Studio Opener | `rich-text` | `highlight-primary` | Wide left-aligned opener, `top_spacing: small`, `bottom_spacing: none`. Big studio thesis, short supporting copy, CTA to work and capabilities. |
| 2 | Hero Image | `image` | N/A | Full-width visual directly fused below the intro with `top_spacing: none`. Creates a strong designer statement without collapsing the opener into the header. |
| 3 | Client Proof | `logo-cloud` | `standard-secondary` | Left-aligned trust layer showing the kinds of brands Pixelcraft works with. |
| 4 | Capability Mosaic | `bento-grid` | `standard-primary` | Asymmetric tile grid translating services into modules and systems instead of a generic card list. |
| 5 | Work Lanes | `sliding-panels` | `highlight-secondary` | Four project lanes showing different sectors where the studio applies the same design rigor. |
| 6 | Client Quote | `testimonial-hero` | `standard-secondary` | One strong proof quote about clarity, rollout confidence, and business traction. |
| 7 | Close CTA | `rich-text` | `highlight-secondary` | Centered close pushing project inquiry. |

### Work (`work.json`) - 4 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Featured Projects | `project-showcase` | `standard-primary` | First widget on the page, `top_spacing: none`, 3-column grid with persistent titles and descriptions. |
| 2 | Deliverable Grid | `bento-grid` | `standard-secondary` | A supporting grid showing what each identity project extends into: launch pages, packaging, campaigns, and motion. |
| 3 | Results Quotes | `testimonials` | `standard-primary` | Grid layout with 3 testimonials focused on outcomes and ease of collaboration. |
| 4 | Next Step Prompt | `split-content` | `highlight-primary` | Clean two-column close with a decisive CTA into the contact page. |

### Capabilities (`capabilities.json`) - 3 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Offer Intro | `split-content` | `standard-secondary` | First widget on the page, `top_spacing: none`. Explains what Pixelcraft actually helps clients solve. |
| 2 | Core Services | `numbered-service-list` | `standard-primary` | Structured breakdown of four engagement types in a studio voice. |
| 3 | Working Principles | `trust-bar` | `highlight-secondary` | Compact icon-led section emphasizing outcome-first thinking, web readiness, and system building. |

### Process (`process.json`) - 3 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Process Intro | `rich-text` | `highlight-primary` | Page-opening explanation of how a design engagement moves from audit to rollout. |
| 2 | Engagement Timeline | `timeline` | `standard-primary` | Five clearly named phases with durations, descriptions, and feature lists. |
| 3 | What You Leave With | `split-content` | `standard-secondary` | Structured handoff section using numbered items to show what clients actually receive. |

### Contact (`contact.json`) - 3 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Inquiry Intro | `rich-text` | `standard-secondary` | First widget on the page, `top_spacing: none`. Sets expectations for the kinds of projects Pixelcraft takes on. |
| 2 | Studio Details | `contact-details` | `standard-primary` | Practical information, project fit guidance, and contact points. |
| 3 | Project FAQ | `accordion` | `highlight-secondary` | Connected accordion with sidebar info block. Covers timing, scope, budget, and collaboration questions. |

---

## Menus

### `main-menu.json`

- Work
- Capabilities
- Process
- Contact

### `footer-menu.json`

- Home
- Work
- Capabilities
- Process
- Contact

---

## Widget Usage Summary

| Widget Type | Count |
|-------------|-------|
| `rich-text` | 4 |
| `image` | 1 |
| `logo-cloud` | 1 |
| `bento-grid` | 2 |
| `sliding-panels` | 1 |
| `testimonial-hero` | 1 |
| `project-showcase` | 1 |
| `testimonials` | 1 |
| `split-content` | 3 |
| `numbered-service-list` | 1 |
| `trust-bar` | 1 |
| `timeline` | 1 |
| `contact-details` | 1 |
| `accordion` | 1 |

Underused / priority widgets used naturally:

- `bento-grid`
- `logo-cloud`
- `sliding-panels`
- `numbered-service-list`
- `timeline`

---

## Differentiation Notes

Pixelcraft is defined by:

- a sitemap centered on `Work`, `Capabilities`, and `Process` rather than `Services`, `Portfolio`, and `About`
- a paper-and-signal-orange visual system instead of a luxury or corporate palette
- a studio header that feels editorial and conversion-ready, not transparent or overly decorative
- a homepage that communicates design capability as systems, modules, and rollout thinking rather than just pretty work
