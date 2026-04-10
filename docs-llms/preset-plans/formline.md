# Formline — Architecture Firm

## Identity

**Business name:** Formline Architecture
**Industry:** Architecture Firm
**Brand personality:** Measured, refined, structurally confident. Formline is a mid-size studio that builds residential and commercial projects with a focus on materiality and site responsiveness. The site should feel like a well-designed building: deliberate proportions, honest materials, quiet authority. Not flashy, not minimalist to the point of emptiness — considered.
**Primary conversion:** Consultation inquiry
**Trust mechanism:** Built work (portfolio depth), process rigor, team expertise, awards/recognition
**Emotional tone:** Assured, spatial, contemplative
**Image style:** Dominant — large-format photography of completed buildings, construction details, site context. Architecture sells through images of finished work more than any other creative industry.
**Content density:** Medium — enough text to convey expertise and process, but images carry the argument
**What should feel strongest on the homepage:** The built work. Visitors should see completed projects within the first two scrolls and understand the studio's range and quality.

---

## Industry Translation

Architecture is a process-heavy, trust-heavy, long-cycle industry. Clients commit hundreds of thousands (or millions) before seeing results. The site must communicate:

1. **Built proof** — the portfolio is the primary trust signal. It must feel curated, not dumped.
2. **Process confidence** — clients need to understand the journey from inquiry to occupancy.
3. **Team credibility** — who is designing their building matters. Credentials, experience, and personality.
4. **Project depth** — architecture clients want to see more than a thumbnail. Sliding panels and showcases that reveal detail are natural fits.

This is not a business where a services grid and a CTA strip close the deal. The site needs to breathe, show work at scale, and communicate a design point of view.

---

## Sitemap

5 pages — the standard set works because architecture's needs map cleanly to it:

| Page | Slug | Purpose |
|------|------|---------|
| Home | `index` | Establish design sensibility through built work, process preview, credibility signals |
| Services | `services` | Explain project types and capabilities, show the design process |
| Portfolio | `portfolio` | Full project gallery with category labels, before/after detail |
| About | `about` | Studio story, team, awards, philosophy |
| Contact | `contact` | Inquiry form context, location, FAQ about engagement |

A dedicated "Process" page was considered but the content fits naturally within Services. Adding it would create a thin page that just restates the timeline widget.

---

## preset.json Settings

### Color Palette

A warm, material-driven palette inspired by concrete, stone, and aged brass. The standard palette uses a warm off-white (not sterile) that echoes plaster and renders. The highlight palette is a deep warm charcoal — like exposed concrete in shadow.

**Standard palette (light):**

| Token | Value | Rationale |
|-------|-------|-----------|
| `standard_bg_primary` | `#f7f4f0` | Warm plaster white — architectural, not clinical |
| `standard_bg_secondary` | `#eee9e2` | Warmer sand — like light stone banding |
| `standard_text_heading` | `#1c1917` | Near-black with warm brown undertone — stone |
| `standard_text_content` | `#44403c` | Dark warm gray — readable on warm backgrounds |
| `standard_text_muted` | `#78716c` | Medium stone gray |
| `standard_border_color` | `#d6d3d1` | Warm light border |
| `standard_accent` | `#8b6914` | Aged brass — warm, sophisticated, unique across presets. Not gold, not orange — oxidized metal |
| `standard_accent_text` | `#ffffff` | White on brass — 4.7:1 contrast |
| `standard_rating_star` | `#d4a017` | Warm gold |

**Highlight palette (dark):**

| Token | Value | Rationale |
|-------|-------|-----------|
| `highlight_bg_primary` | `#1c1917` | Charcoal concrete — same as heading color for cohesion |
| `highlight_bg_secondary` | `#0f0e0c` | Deeper shadow |
| `highlight_text_heading` | `#f5f0ea` | Warm cream white |
| `highlight_text_content` | `#a8a29e` | Warm light gray — 5.2:1 on dark bg |
| `highlight_text_muted` | `#78716c` | Medium warm gray |
| `highlight_border_color` | `#292524` | Dark warm border |
| `highlight_accent` | `#c49a2a` | Brighter brass for dark surfaces — 4.8:1 contrast |
| `highlight_accent_text` | `#1c1917` | Dark on bright accent |
| `highlight_rating_star` | `#d4a017` | Consistent gold |

### Typography

| Setting | Value | Rationale |
|---------|-------|-----------|
| `heading_font` | `{ "stack": "\"Epilogue\", sans-serif", "weight": 600 }` | Geometric sans with subtle personality — structured, modern, slightly softer than pure geometric fonts. Not used in any existing preset. Weight 600 for quiet authority without shouting. |
| `body_font` | `{ "stack": "\"Libre Franklin\", sans-serif", "weight": 400 }` | Neutral, professional sans-serif — stays out of the way while remaining warm. Not used in any existing preset. |
| `heading_scale` | `100` | Standard — Epilogue is well-proportioned at default scale |
| `body_scale` | `100` | Standard |

### Style

| Setting | Value | Rationale |
|---------|-------|-----------|
| `corner_style` | `slightly-rounded` | Soft enough to feel contemporary, not so rounded it feels casual. Matches the studio's considered-but-not-rigid personality. |
| `spacing_density` | `airy` | Architecture needs breathing room — projects need space to be seen. Airy density lets images and content feel unhurried. |
| `button_shape` | `auto` | Follows corner style — consistent, not forced |

---

## Header Configuration

```json
{
  "settings": {
    "logoText": "Formline",
    "contactDetailsLine1": "(555) 340-2100",
    "contactDetailsLine2": "",
    "contact_position": "logo",
    "headerNavigation": "main-menu",
    "center_nav": false,
    "ctaButtonLink": {
      "href": "contact.html",
      "text": "Start a Project",
      "target": "_self"
    },
    "ctaButtonStyle": "secondary",
    "full_width": true,
    "sticky": false,
    "transparent_on_hero": true,
    "color_scheme": "standard-primary"
  }
}
```

**Differentiation:** Standard (light) scheme + transparent on hero + non-sticky + phone by logo + secondary CTA. The non-sticky header is deliberate — architecture sites should feel like scrolling through a gallery, not an app. The light transparent header overlaying a large hero image creates an elegant entry. Secondary CTA ("Start a Project") is understated, matching the studio's confidence — they don't need to shout for leads. Different from inkwell (dark, centered nav, sticky, primary CTA, no contact).

---

## Footer Configuration

```json
{
  "settings": {
    "copyright": "\u00a9 2026 Formline Architecture. All rights reserved.",
    "color_scheme": "highlight-primary"
  },
  "blocks": {
    "logo": {
      "type": "logo_text",
      "settings": {
        "logo_text": "Formline",
        "text": "<p>Architecture and design for residential, commercial, and cultural projects.</p>"
      }
    },
    "contact": {
      "type": "text_block",
      "settings": {
        "title": "Contact",
        "text": "<p>(555) 340-2100<br>studio@formline.co<br>85 West Jackson Blvd, Suite 400<br>Chicago, IL 60604</p>"
      }
    },
    "links": {
      "type": "menu_block",
      "settings": {
        "title": "Navigation",
        "menu": "footer-menu"
      }
    },
    "social": {
      "type": "social_block",
      "settings": {
        "title": "Follow Us"
      }
    }
  },
  "blocksOrder": ["logo", "contact", "links", "social"]
}
```

---

## Pages

### Home (`index`)

| # | Widget | Type | Color Scheme | Key Details |
|---|--------|------|-------------|-------------|
| 1 | Hero | `banner` | highlight-primary | Large height, left-aligned (`alignment: start`), vertical center. Dark overlay (`#1c1917b3`). Background image of flagship project. Blocks: text (sm, uppercase, muted: "Architecture & Design") > heading (5xl: "Designing for How People Live") > text (base) > button (secondary "View Our Work" + secondary "Start a Project", medium). `top_spacing: none` |
| 2 | Project Panels | `sliding-panels` | standard-primary | 4 panels: Residential, Commercial, Cultural, Renovation. Each with project photo, project name as title, location as subtitle, "View Project" button. eyebrow: "Selected Work", title: "Recent Projects", heading_alignment: left |
| 3 | Process Preview | `timeline` | standard-secondary | 4 items, horizontal layout, heading_alignment: center. Phases: Discovery, Design Development, Documentation, Construction. Date field used as "Phase 1", "Phase 2", etc. Features with + prefix for deliverables. eyebrow: "Our Process", title: "From Vision to Built Form" |
| 4 | Portfolio Grid | `bento-grid` | highlight-primary | Asymmetric storytelling recipe: 1 hero image tile (col_span: 3, row_span: 2) + 2 stat tiles (col_span: 1, row_span: 1 each — "42 Projects Completed", "3 AIA Awards"). gap: `--space-md`, heading_alignment: left, eyebrow: "By the Numbers", title: "Built Work" |
| 5 | Client Quote | `testimonial-slider` | standard-primary | 3 client quotes with 5-star ratings. Architecture clients — homeowners and commercial developers. autoplay: true, autoplay_speed: 6000 |
| 6 | CTA | `action-bar` | highlight-primary | "Let's Build Something Together" with "Start a Project" button. `fullwidth: false` |

**Page logic:** Left-aligned banner hero sets an editorial, authoritative tone. Sliding panels immediately show project breadth by type — visitors understand what Formline builds. Horizontal timeline previews the process (answering "how does working with you work?" early). Bento grid adds a visual proof moment with stats. Testimonials and CTA close. 6 widgets — compact but complete.

### Services (`services`)

| # | Widget | Type | Color Scheme | Key Details |
|---|--------|------|-------------|-------------|
| 1 | Page Banner | `banner` | highlight-primary | Small height, left-aligned, "What We Do" heading + subtitle about project types. `top_spacing: none`, `bottom_spacing: small` |
| 2 | Project Types | `sliding-panels` | standard-primary | 5 panels: New Build Residential, Commercial & Workplace, Adaptive Reuse, Interior Architecture, Feasibility Studies. Each with image, title, one-line subtitle, "Learn More" button. eyebrow: "Services", title: "Project Types", heading_alignment: left |
| 3 | Design Process | `timeline` | highlight-primary | 6 items, centered layout, heading_alignment: center. Discovery > Schematic Design > Design Development > Construction Documents > Permitting > Construction Administration. Date field as phase labels. Features with deliverables. title: "Our Design Process" |
| 4 | Before/After | `comparison-slider` | standard-secondary | Horizontal, initial_position: 35. before_label: "Existing", after_label: "Completed". eyebrow: "Case Study", title: "Lakewood Residence Transformation". Shows building before and after renovation — proof of transformation capability |
| 5 | FAQ | `accordion` | standard-primary | 5 items about scope, fees, timeline, sustainability, permitting. Sidebar with `info` block: "Ready to Start?" + phone/email. sidebar_position: right, heading_alignment: left, style: separated |

**Page logic:** Sliding panels show the range of project types (not a flat card grid — each type gets full visual treatment). Centered timeline is the process deep-dive. Comparison slider is a natural architecture widget — before/after renovation is the most compelling visual proof for this industry. Accordion with sidebar handles practical questions and converts.

### Portfolio (`portfolio`)

| # | Widget | Type | Color Scheme | Key Details |
|---|--------|------|-------------|-------------|
| 1 | Page Banner | `rich-text` | highlight-primary | heading (4xl: "Portfolio"), text (base: "A selection of residential, commercial, and cultural projects completed over the past decade."). text_alignment: center, content_width: medium. `top_spacing: none` |
| 2 | Project Gallery | `project-showcase` | standard-primary | 6 projects, 2 columns, aspect_ratio: 3/2, text_display: hover, heading_alignment: left. Large cinematic cards — 2 columns signals selectiveness. Each project with title, location, and link. eyebrow: "Selected Work", title: "Our Projects" |
| 3 | Before/After | `comparison-slider` | standard-secondary | Horizontal, initial_position: 40. before_label: "Before", after_label: "After". title: "Adaptive Reuse". A warehouse-to-office conversion |
| 4 | Testimonial | `testimonial-slider` | highlight-primary | 3 quotes from architecture clients. autoplay: true, autoplay_speed: 7000 |

**Page logic:** Rich-text opener (highlight scheme) creates a colored band without needing a background image — variety from banner openers. 2-column project showcase with hover text is the architecture portfolio recipe from the insights. Comparison slider adds a renovation case study. Testimonials close with social proof. No action-bar — the work and client words are enough; the nav has Contact.

### About (`about`)

| # | Widget | Type | Color Scheme | Key Details |
|---|--------|------|-------------|-------------|
| 1 | Studio Story | `split-hero` | standard-secondary | Image left (studio/team workspace photo), overlay_color: rgba(0,0,0,0.1). Blocks: text (sm, uppercase, muted: "Est. 2012") > heading (3xl: "Design with Intent") > text (base: studio philosophy paragraph) > button (secondary "Start a Project", medium). `top_spacing: none` |
| 2 | Bento Stats | `bento-grid` | highlight-primary | Asymmetric storytelling: hero image (col_span: 3, row_span: 2 — team photo or project), stat tile 1 (col_span: 1, row_span: 1 — "12 Years"), stat tile 2 (col_span: 1, row_span: 1 — "42 Projects"). gap: `--space-md`, title: "Studio at a Glance", heading_alignment: left |
| 3 | Team | `profile-grid` | standard-primary | 3 profiles, 3 columns: Principal / Founding Partner, Project Director, Design Lead. Each with photo, name, role, bio. heading_alignment: center, eyebrow: "Leadership" |
| 4 | Values | `split-content` | standard-secondary | balance: equal, sticky_column: none. Left: heading (2xl: "What We Believe") + text (base: philosophy paragraph). Right: features ("+ Every building starts with listening\n+ Materiality matters as much as form\n+ Sustainability is a baseline, not a feature\n+ Great architecture outlasts its architects") |
| 5 | FAQ | `accordion` | highlight-primary | 4 items about the studio: How large is the team, What is your design philosophy, Do you work outside Chicago, What sustainability certifications do you pursue. style: connected, heading_alignment: center. No sidebar — short list, no need for sidebar to dwarf content |

**Page logic:** Split-hero opener (different from home's banner) creates a story-first introduction. Bento grid adds visual proof with stats mid-page. Team profiles show the leadership. Split-content for values is more editorial than an icon-card-grid — suits the thoughtful brand. Accordion closes with studio questions. No action-bar — About page doesn't need a hard sell.

### Contact (`contact`)

| # | Widget | Type | Color Scheme | Key Details |
|---|--------|------|-------------|-------------|
| 1 | Page Banner | `banner` | highlight-primary | Small height, center-aligned, "Start a Conversation" heading + "Tell us about your project and we'll schedule a consultation." `top_spacing: none`, `bottom_spacing: small` |
| 2 | Contact Info | `contact-details` | standard-primary | 3 blocks: info (studio name, address, phone, email), text_block (hours: Mon-Fri 9am-6pm, consultations by appointment), social. heading_alignment: left |
| 3 | Engagement FAQ | `accordion` | standard-secondary | 5 items about working with Formline: What should I prepare for a consultation, How are fees structured, What is a typical project timeline, Do you handle permits, Do you provide interior design. Sidebar with `info` block: "Have a Question?" + phone/email. sidebar_position: right, heading_alignment: left, style: separated |
| 4 | Find Us | `map` | standard-primary | address: "85 West Jackson Blvd, Suite 400, Chicago, IL 60604". height: medium, sidebar_position: right, heading_alignment: left. Sidebar info block with transit/parking details |

**Page logic:** Small banner with inviting language. Contact details give practical information. Accordion with sidebar handles engagement questions — this is where potential clients learn about fees, timelines, and process. Map with parking info closes. No action-bar or contact-details duplication before footer.

---

## Menus

**main-menu.json:**
- Services → `services.html`
- Portfolio → `portfolio.html`
- About → `about.html`
- Contact → `contact.html`

**footer-menu.json:**
- Services → `services.html`
- Portfolio → `portfolio.html`
- About → `about.html`
- Contact → `contact.html`

---

## Widget Usage Summary

| Widget Type | Count |
|------------|-------|
| `banner` | 3 (1 hero + 2 inner pages) |
| `sliding-panels` | 2 |
| `timeline` | 2 |
| `bento-grid` | 2 |
| `comparison-slider` | 2 |
| `testimonial-slider` | 2 |
| `action-bar` | 1 |
| `project-showcase` | 1 |
| `rich-text` | 1 |
| `split-hero` | 1 |
| `split-content` | 1 |
| `profile-grid` | 1 |
| `accordion` | 3 |
| `contact-details` | 1 |
| `map` | 1 |

**15 unique widget types across 5 pages.**

---

## Differentiation Notes

### From generator must-use list
- `sliding-panels` (x2) — project types on Services, project categories on Home
- `timeline` (x2) — horizontal preview on Home, centered deep-dive on Services
- `bento-grid` (x2) — asymmetric stats+image on Home and About
- `comparison-slider` (x2) — renovation before/after on Services and Portfolio

All 4 required underused widgets are used, each in natural positions.

### Pages ending without action-bar
- Portfolio ends with `testimonial-slider`
- About ends with `accordion`
- Contact ends with `map`

Only Home has an action-bar.

### Accordion sidebar usage
- Services FAQ: sidebar with info block (right)
- Contact FAQ: sidebar with info block (right)
- About FAQ: no sidebar (short list — sidebar would dwarf content)

### Opener variety
- Home: `banner` (large, left-aligned, editorial)
- Services: `banner` (small)
- Portfolio: `rich-text` (highlight scheme, no image)
- About: `split-hero` (image + content split)
- Contact: `banner` (small)

### Header strategy
- Standard (light) transparent header — elegant overlay on the dark hero image
- Non-sticky — gallery-like scroll experience
- Phone by logo, no address line — professional but not cluttered
- Secondary CTA — confident, not desperate
