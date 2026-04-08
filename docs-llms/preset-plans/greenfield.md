# Greenfield — Landscaping

## Identity

**Name:** Greenfield Landscaping
**Industry:** Landscaping / Lawn Care / Hardscaping
**Personality:** Natural, capable, transformative. Greenfield turns bare dirt into backyard retreats. The site is visual-first — lush photography, before/after proof, and organic colors that echo the outdoors. Professional but grounded, like someone who knows soil types and Latin plant names but explains things in plain English.

---

## Sitemap

5 pages — tight and visual:

| Page | Slug | Purpose |
|------|------|---------|
| Home | `index` | Hero slideshow of projects, trust credentials, services preview, before/after, testimonials |
| Services | `services` | Detailed service categories with images |
| Portfolio | `portfolio` | Project gallery with before/after showcase |
| About | `about` | Team, story, credentials, FAQ |
| Contact | `contact` | Scheduling, service area map, seasonal FAQ |

---

## preset.json Settings

### Color Palette

An earthy, green-tinted palette throughout — every color has a natural undertone. The leaf green accent is distinct from Brewline's cool sage (#2d6a4f) by being warmer and brighter, like living foliage.

**Standard palette (light):**

| Token | Value | Rationale |
|-------|-------|-----------|
| `standard_bg_primary` | `#fafbf8` | Greenish white — like natural paper |
| `standard_bg_secondary` | `#f0f3ec` | Light sage gray — dried herbs |
| `standard_text_heading` | `#1a2e1a` | Dark forest green-black |
| `standard_text_content` | `#3a4a3a` | Dark gray-green — earthy readability |
| `standard_text_muted` | `#6e7d6e` | Medium gray-green |
| `standard_border_color` | `#dde3d8` | Light green-gray border |
| `standard_accent` | `#3a7d44` | Leaf green — warm, vivid, natural |
| `standard_accent_text` | `#ffffff` | White on green — 5.0:1 contrast |
| `standard_rating_star` | `#e8b931` | Warm gold — sunshine |

**Highlight palette (dark):**

| Token | Value | Rationale |
|-------|-------|-----------|
| `highlight_bg_primary` | `#1a2e1a` | Dark forest — matches heading color |
| `highlight_bg_secondary` | `#121f12` | Deeper forest |
| `highlight_text_heading` | `#f0f3ec` | Sage white |
| `highlight_text_content` | `#adb8a8` | Gray-green body text — 5.4:1 |
| `highlight_text_muted` | `#78856f` | Muted green |
| `highlight_border_color` | `#2e3e2e` | Dark green border |
| `highlight_accent` | `#6db868` | Lighter leaf green for dark bg — 5.2:1 |
| `highlight_accent_text` | `#1a2e1a` | Dark on light accent |
| `highlight_rating_star` | `#e8b931` | Consistent gold |

### Typography

| Setting | Value | Rationale |
|---------|-------|-----------|
| `heading_font` | `{ "stack": "\"Lexend\", sans-serif", "weight": 600 }` | Designed for optimal readability, modern warmth. Not yet used. Friendly and clear — perfect for approachable outdoor brand. |
| `body_font` | `{ "stack": "\"Cabin\", sans-serif", "weight": 400 }` | Humanist sans with warmth — slightly rounded forms feel organic. Not yet used. |
| `heading_scale` | `100` | Standard |
| `body_scale` | `100` | Standard |

### Style

| Setting | Value | Rationale |
|---------|-------|-----------|
| `corner_style` | `rounded` | Organic, soft — like nature, no hard edges |
| `spacing_density` | `default` | Balanced, practical |
| `button_shape` | `pill` | Consistent with rounded corners — soft, inviting CTAs |

---

## Header Configuration

```json
{
  "logoText": "Greenfield",
  "contactDetailsLine1": "(503) 555-0147",
  "contactDetailsLine2": "",
  "contact_position": "logo",
  "headerNavigation": "main-menu",
  "center_nav": false,
  "ctaButtonLink": {
    "href": "contact.html",
    "text": "Free Estimate",
    "target": "_self"
  },
  "ctaButtonStyle": "primary",
  "full_width": true,
  "sticky": false,
  "transparent_on_hero": true,
  "color_scheme": "standard"
}
```

**Header differentiation:** Transparent on the slideshow hero for immersive landscape photography. Phone visible, primary CTA "Free Estimate" — standard for landscape contractors. Not sticky to maximize visual space on the photo-heavy pages.

---

## Footer Configuration

```json
{
  "copyright": "\u00a9 2026 Greenfield Landscaping. All rights reserved.",
  "color_scheme": "highlight"
}
```

**Blocks:**

| # | Type | Settings |
|---|------|----------|
| 1 | `logo_text` | `logo_text`: "Greenfield", `text`: "<p>Design, installation, and maintenance for residential and commercial landscapes across Greater Portland.</p>" |
| 2 | `text_block` | `title`: "Contact", `text`: "<p>(503) 555-0147</p><p>hello@greenfieldpdx.com</p><p>2740 SE Division St<br>Portland, OR 97202</p>" |
| 3 | `menu_block` | `title`: "Pages", `menu`: "footer-menu" |
| 4 | `social_block` | `title`: "Follow Us" |

---

## Pages

### Home (`index.json`) — 7 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Hero | `slideshow` | per-slide highlight | **Large** height, center-aligned, autoplay 7000ms. 3 slides — each a completed landscape project with full-bleed photo, overlay `rgba(26,46,26,0.5)`, heading 5xl (project type), text lg (brief description), button primary "See Our Work" → portfolio.html. `top_spacing: none`. Transparent header overlays. |
| 2 | Trust | `trust-bar` | `standard-accent` | Filled icons md rounded, left alignment, dividers on. 4 items: shield/"Licensed & Insured", leaf/"20+ Years Experience", star/"5-Star Rated"/"100+ reviews", certificate/"Certified Arborists". |
| 3 | Services | `icon-card-grid` | `standard` | Heading center, 4 columns, grid, box, center alignment, filled icons lg circle. Eyebrow "What We Do", title "Our Services". 4 cards: plant/"Landscape Design", fence/"Hardscaping", tree/"Tree & Lawn Care", snowflake/"Seasonal Services". Each with description + "Learn More" → services.html. |
| 4 | Before/After | `comparison-slider` | `standard-accent` | Eyebrow "Transformations", title "See the Difference", heading center. Horizontal orientation, initial position 30%, show labels. before_label "Before", after_label "After". Before/after images of a flagship project. |
| 5 | About | `image-text` | `standard` | Image right (team at work), text_position center. Eyebrow "ABOUT GREENFIELD", heading 3xl "Rooted in Portland Since 2004", text about family business and approach, button secondary "About Us" → about.html. |
| 6 | Testimonials | `testimonials` | `highlight` | 3 columns, grid, flat, heading center. Eyebrow "Client Stories", title "What Homeowners Say". 3 quotes with 5-star ratings. |
| 7 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Heading 2xl "Ready to Transform Your Outdoor Space?", text sm uppercase muted "Free estimates for all projects.", button primary medium "Get a Free Estimate" → contact.html. |

### Services (`services.json`) — 5 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Header | `banner` | `standard-accent` | Small height, center alignment. Heading 3xl "Services", text base "Design, build, and maintain — we handle it all." No image. `top_spacing: none`, `bottom_spacing: none`. |
| 2 | Grid | `card-grid` | `standard` | 3 columns, grid, box, 4/3 aspect, start alignment, heading left. No section heading. 6 cards: Landscape Design, Patio & Hardscaping, Lawn Installation & Sodding, Tree & Shrub Care, Seasonal Cleanup, Irrigation Systems. Each with image, subtitle, title, description, button_link "Get a Quote" → contact.html. |
| 3 | Process | `steps` | `standard-accent` | Heading center. Eyebrow "How It Works", title "From Idea to Finished Landscape". 4 steps with images: Consultation (site visit + goals), Design (custom plan + 3D rendering), Installation (professional build), Maintenance (ongoing care program). |
| 4 | Why Us | `image-text` | `highlight` | Image left (completed garden), text_position center. Eyebrow "WHY GREENFIELD", heading 3xl "We Grow What We Promise", features "+Custom designs — no cookie-cutter templates\n+Local plant expertise — right plants for Portland's climate\n+Full project warranty\n+Maintenance plans available". |
| 5 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Heading 2xl "Let's Plan Your Project", button primary medium "Free Estimate" → contact.html. |

### Portfolio (`portfolio.json`) — 4 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Header | `banner` | `standard-accent` | Small height, center alignment. Heading 3xl "Our Portfolio", text base "A selection of recent residential and commercial projects." No image. `top_spacing: none`, `bottom_spacing: none`. |
| 2 | Gallery | `project-showcase` | `standard` | 3 columns, grid, 4/3 aspect, always text, heading left. No section heading. 6 projects: "Modern Courtyard — Pearl District", "Full Backyard Redesign — Alberta Arts", "Patio & Fire Pit — Lake Oswego", "Native Plant Garden — Sellwood", "Commercial Entry Landscape — Lloyd District", "Retaining Wall & Terracing — West Hills". Each with photo + description of scope. |
| 3 | Before/After | `comparison-slider` | `highlight` | Eyebrow "Transformation", title "Overgrown to Oasis", heading center. Horizontal, initial position 40%, show labels. Dramatic before/after of a residential backyard. |
| 4 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Heading 2xl "Have a Project in Mind?", text sm uppercase muted "We'd love to see your space.", button primary medium "Schedule a Visit" → contact.html. |

### About (`about.json`) — 5 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Header | `banner` | `highlight` | Small height, center alignment. Background image: team working in garden, overlay `rgba(26,46,26,0.6)`. Heading 3xl "About Greenfield". `top_spacing: none`, `bottom_spacing: none`. |
| 2 | Story | `image-text` | `standard` | Image left (founder in garden), text_position center. Eyebrow "OUR STORY", heading 3xl "Growing Portland's Landscapes Since 2004", text about founding, local expertise, and team growth — 2 paragraphs. |
| 3 | Team | `profile-grid` | `standard-accent` | 3 columns, grid, heading center. Eyebrow "The Team", title "Meet the Crew". 3 profiles: owner/landscape designer, lead installer, maintenance manager. Each with photo, name, role, specialty, brief bio. |
| 4 | FAQ | `accordion` | `standard` | Separated style, heading center, allow_multiple true. Title "Common Questions". 5 items: "Are you licensed and insured?", "What areas do you serve?", "How long does a typical project take?", "Do you offer maintenance plans?", "When is the best time to start a project?". |
| 5 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Heading 2xl "Let's Work Together", text sm uppercase muted "Your first consultation is free.", button primary medium "Get in Touch" → contact.html. |

### Contact (`contact.json`) — 3 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Header | `banner` | `standard-accent` | Small height, center alignment. Heading 3xl "Contact", text base "Ready to start? Let's talk about your space." No image. `top_spacing: none`, `bottom_spacing: none`. |
| 2 | Map | `map` | `standard` | Medium height, sidebar right, show_address true. Address: "2740 SE Division St, Portland, OR 97202". Directions link → Google Maps. Sidebar: 1 info block (title "Office & Yard Hours", Mon-Fri 7am-5pm, Sat 8am-1pm, site visits by appointment), 1 social block. |
| 3 | FAQ | `accordion` | `standard-accent` | Separated style, heading center, allow_multiple true. Title "Before You Call". 4 items: "What should I prepare for a consultation?", "How much does a typical project cost?", "Do you work through winter?", "What's included in a maintenance plan?". |

---

## Menus

### main-menu.json

| Label | URL |
|-------|-----|
| Services | services.html |
| Portfolio | portfolio.html |
| About | about.html |
| Contact | contact.html |

### footer-menu.json

| Label | URL |
|-------|-----|
| Home | index.html |
| Services | services.html |
| Portfolio | portfolio.html |
| About | about.html |
| Contact | contact.html |

---

## Widget Usage Summary

| Widget Type | Count |
|-------------|-------|
| `slideshow` | 1 (homepage hero) |
| `trust-bar` | 1 |
| `icon-card-grid` | 1 |
| `comparison-slider` | 2 (home, portfolio) |
| `image-text` | 2 (home, services) |
| `testimonials` | 1 |
| `action-bar` | 4 |
| `banner` | 4 (page headers) |
| `card-grid` | 1 |
| `steps` | 1 |
| `project-showcase` | 1 |
| `profile-grid` | 1 |
| `accordion` | 2 |
| `map` | 1 |

**Total:** 23 widget instances across 5 pages, **14 unique types**.

**Notable widget choices:**
- **comparison-slider** used twice — this is the hero feature for a landscaping business. Before/after transformations are the #1 trust builder. Home page shows the capability; Portfolio page shows a specific project.
- **steps** on services — Consultation → Design → Installation → Maintenance is the real workflow. Each step has a photo showing that phase.
- **slideshow** hero with transparent header — rotating landscape photos, immersive and aspirational.

---

## Style Consistency Notes

- **Corner style: rounded** → **Button shape: pill** — both soft, both organic. Consistent visual language.
- **Spacing: default** — balanced, not trying to be premium (airy) or dense (compact). Just practical.
- Green-tinted palette flows naturally from a landscaping brand. Every color has a subtle green undertone — even the backgrounds and borders.
