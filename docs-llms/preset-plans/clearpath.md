# Clearpath — Consultant

## Identity

**Name:** Clearpath Consulting
**Industry:** Management Consultant / Strategy Firm
**Personality:** Confident, minimal, forward-looking. Clearpath leads with ideas, not decoration. The site feels like a well-structured argument — every element earns its place. Spacious layouts signal premium positioning; bold typography does the heavy lifting. Think: the slide deck that won the deal, turned into a website.

**Structural constraint:** No `banner` widgets are used as the first widget on any page. Each page opens with a different widget type, demonstrating the theme's versatility.

---

## preset.json Settings

### Color Palette

A violet-anchored palette with cool undertones. The deep violet accent is completely unique across all presets — intellectual, innovative, and premium.

**Standard palette (light):**

| Token | Value | Rationale |
|-------|-------|-----------|
| `standard_bg_primary` | `#fafafa` | Near-white with warmth — editorial, spacious |
| `standard_bg_secondary` | `#f0eef5` | Light lavender-gray — subtle purple undertone ties to accent |
| `standard_text_heading` | `#1a1a2e` | Deep navy-violet — adds weight without pure black |
| `standard_text_content` | `#3d3d54` | Dark gray-violet — readable, cohesive |
| `standard_text_muted` | `#6e6e82` | Medium gray-violet |
| `standard_border_color` | `#e0dde8` | Light purple-gray — subtle but intentional |
| `standard_accent` | `#5b4a9e` | Deep violet — innovation, wisdom, premium |
| `standard_accent_text` | `#ffffff` | White on violet — 6.1:1 contrast |
| `standard_rating_star` | `#e8b931` | Warm gold — complements violet |

**Highlight palette (dark):**

| Token | Value | Rationale |
|-------|-------|-----------|
| `highlight_bg_primary` | `#1a1a2e` | Deep navy-violet — matches heading color for cohesion |
| `highlight_bg_secondary` | `#12121f` | Darker violet-black |
| `highlight_text_heading` | `#f2f0f8` | Off-white with lavender tint |
| `highlight_text_content` | `#b0adc4` | Soft violet-gray body text — 5.8:1 on bg_primary |
| `highlight_text_muted` | `#7a7890` | Muted violet |
| `highlight_border_color` | `#2e2c42` | Dark violet border |
| `highlight_accent` | `#9485d0` | Lighter violet for dark backgrounds — 4.9:1 |
| `highlight_accent_text` | `#1a1a2e` | Dark text on light accent — 5.6:1 |
| `highlight_rating_star` | `#e8b931` | Consistent gold |

### Typography

| Setting | Value | Rationale |
|---------|-------|-----------|
| `heading_font` | `{ "stack": "\"Manrope\", sans-serif", "weight": 700 }` | Geometric sans with character — crisp, modern, authoritative. Not yet used. |
| `body_font` | `{ "stack": "\"Work Sans\", sans-serif", "weight": 400 }` | Humanist sans — warm readability. Pairs with Manrope's geometry. Not yet used. |
| `heading_scale` | `105` | Slightly larger — consulting sites need big, bold headlines |
| `body_scale` | `100` | Standard |

### Style

| Setting | Value | Rationale |
|---------|-------|-----------|
| `corner_style` | `slightly-rounded` | Polished, professional — not sharp (too corporate) or rounded (too casual) |
| `spacing_density` | `airy` | Premium, spacious. Only Stillpoint uses airy (yoga — very different context) |
| `button_shape` | `auto` | Follows corner_style |

---

## Header Configuration

```json
{
  "logoText": "Clearpath",
  "contactDetailsLine1": "",
  "contactDetailsLine2": "",
  "contact_position": "logo",
  "headerNavigation": "main-menu",
  "center_nav": true,
  "ctaButtonLink": {
    "href": "contact.html",
    "text": "Book a Call",
    "target": "_self"
  },
  "ctaButtonStyle": "primary",
  "full_width": true,
  "sticky": true,
  "transparent_on_hero": false,
  "color_scheme": "standard"
}
```

**Header differentiation:** Sticky + centered nav + no contact details + primary CTA. This is the **first preset** with sticky + center_nav together. Creates an ultra-clean, minimal header — logo left, centered links, CTA right. No phone or address cluttering the bar. Premium consulting positioning.

---

## Footer Configuration

```json
{
  "copyright": "\u00a9 2026 Clearpath Consulting. All rights reserved.",
  "color_scheme": "highlight"
}
```

**Blocks:**

| # | Type | Settings |
|---|------|----------|
| 1 | `logo_text` | `logo_text`: "Clearpath", `text`: "<p>Strategy and transformation consulting for ambitious businesses.</p>" |
| 2 | `text_block` | `title`: "Contact", `text`: "<p>hello@clearpathconsulting.com</p><p>200 State St, 12th Floor<br>Boston, MA 02109</p>" |
| 3 | `menu_block` | `title`: "Pages", `menu`: "footer-menu" |
| 4 | `social_block` | `title`: "Follow" |

---

## Pages

### Home (`index.json`) — 6 widgets

Each widget is a different type. No banners.

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Hero Statement | `rich-text` | `highlight` | Center alignment, medium width. Heading 5xl "Strategy That Drives Results", text lg "We partner with leadership teams to solve complex problems, unlock growth, and build organizations that outperform.", button primary medium "Our Services" → services.html + button secondary "Book a Call" → contact.html. `top_spacing: none`. |
| 2 | Stats | `key-figures` | `standard-accent` | 4 columns, grid, flat, animate true. No heading. 4 figures: "200+"/"Engagements Completed", "15+"/"Years Experience", "$2.1B"/"Revenue Influenced", "96%"/"Client Retention". `top_spacing: none`. |
| 3 | Services | `icon-card-grid` | `standard` | Heading center, 3 columns, grid, flat, center alignment, outline icons lg circle. Eyebrow "What We Do", title "Our Practice Areas". 3 cards: compass/"Strategy & Growth", chart-bar/"Operations", users/"Organization Design". Each with description + "Learn More" → services.html. |
| 4 | About Teaser | `image-text` | `standard` | Image right, text_position center, content_color_scheme none. Eyebrow "ABOUT THE FIRM", heading 3xl "Clarity in Complexity", text about approach and values, button secondary medium "About Us" → about.html. |
| 5 | Testimonials | `testimonials` | `highlight` | 2 columns, grid, flat, heading center. Eyebrow "Client Impact", title "What Leaders Say". 2 in-depth quotes, 5-star ratings, names, titles. |
| 6 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Heading 2xl "Ready to Transform Your Business?", text sm uppercase muted "Complimentary strategy session for qualifying organizations.", button primary medium "Book a Call" → contact.html. |

### Services (`services.json`) — 5 widgets

Opens with `split-content` — a two-column layout acting as the page intro.

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Page Intro | `split-content` | `standard-accent` | Balance: left-heavy, sticky_column: none. Left: heading 4xl "Services", text lg "We bring clarity to your most pressing challenges." Right: text base with longer description of the consulting approach. `top_spacing: none`. |
| 2 | Services Grid | `card-grid` | `standard` | 3 columns, grid, box, 4/3 aspect, start alignment, heading left. No section heading. 6 cards: Strategy & Growth Planning, Operational Excellence, Organization Design, Digital Transformation, M&A Advisory, Leadership Development. Each with image, subtitle, title, description, button_link. |
| 3 | Process | `steps` | `standard-accent` | Heading center. Eyebrow "How We Work", title "Our Engagement Model". 4 steps: Diagnose (understand the challenge), Design (build the strategy), Deliver (execute with your team), Sustain (embed lasting change). Each with image + description. |
| 4 | Why Clearpath | `image-callout` | `highlight` | Image left. Heading 3xl "We Don't Just Advise. We Build.", text about hands-on approach, features "+Embedded with your team\n+Measurable outcomes tied to every engagement\n+Knowledge transfer — not dependency", button secondary medium "About the Firm" → about.html. |
| 5 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Heading 2xl "Let's Solve Your Biggest Challenge", button primary medium "Start a Conversation" → contact.html. |

### Work (`work.json`) — 5 widgets

Opens with `image-callout` — dramatic image with heading. No banner needed.

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Page Intro | `image-callout` | `standard-accent` | Image right. Heading 3xl "Our Work", text base "Selected engagements across strategy, operations, and transformation.", no button. `top_spacing: none`. |
| 2 | Case Studies | `project-showcase` | `standard` | 3 columns, grid, 4/3 aspect, hover text, heading left. No section heading. 6 projects: "SaaS Company 3x Revenue Growth", "Healthcare Network Operational Turnaround", "Private Equity Portfolio Optimization", "Fintech Market Entry Strategy", "Manufacturing Digital Transformation", "Nonprofit Organizational Restructure". Each with image + description. |
| 3 | Logos | `logo-cloud` | `standard-accent` | 5 columns, grid, heading center. Eyebrow "Trusted By", title "Organizations We've Partnered With". 5 logos. |
| 4 | Testimonials | `testimonials` | `standard` | 3 columns, grid, box, heading center. Eyebrow "Client Stories", title "Impact in Their Words". 3 quotes with ratings, names, titles. |
| 5 | Closing | `rich-text` | `highlight` | Center alignment, narrow width. Heading 2xl "Every Organization Has Untapped Potential", text lg "Let's find yours.", button primary medium "Get in Touch" → contact.html. |

### About (`about.json`) — 6 widgets

Opens with `image-text` — the firm story IS the hero.

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Story | `image-text` | `standard` | Image left, text_position center, content_color_scheme none. Eyebrow "ABOUT CLEARPATH", heading 3xl "Built to Solve Hard Problems", text about founding, philosophy, and growth — 2 paragraphs. No button. `top_spacing: none`. |
| 2 | History | `timeline` | `standard-accent` | Centered layout, heading center. Eyebrow "Our Journey", title "Milestones". 4 items: "2010"/"Founded in Boston", "2014"/"First $100M engagement", "2018"/"Expanded to digital transformation", "2023"/"200th engagement completed". |
| 3 | Values | `features-split` | `standard` | Heading left, content_position left, divider on, outline icons lg circle. Eyebrow "How We Think", title "Our Principles". 4 features: target/"Outcome-Obsessed", users/"Client-First", layers/"Systems Thinking", refresh-cw/"Continuous Improvement". |
| 4 | Team | `profile-grid` | `standard-accent` | 3 columns, grid, heading center. Eyebrow "Leadership", title "Meet the Team". 3 profiles: founding partner, managing director, principal consultant. Each with photo, name, role, specialty, bio, LinkedIn. |
| 5 | FAQ | `accordion` | `standard` | Separated style, heading center, allow_multiple true. Title "Working With Us". 4 items about engagement structure, timeline, fees, and team size. |
| 6 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Heading 2xl "Let's Work Together", text sm uppercase muted "Your first strategy session is complimentary.", button primary medium "Book a Call" → contact.html. |

### Contact (`contact.json`) — 4 widgets

Opens with `features-split` — engagement types as the page intro. No banner, no generic intro text.

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Engagement Types | `features-split` | `standard-accent` | Heading left, content_position left, divider on, filled icons lg circle. Eyebrow "Get in Touch", title "Ways to Work With Us". 3 features: message-circle/"Strategy Session" (free 60-min diagnostic), clipboard/"Full Engagement" (multi-month transformation), zap/"Rapid Sprint" (2-4 week focused sprint). `top_spacing: none`. |
| 2 | Map | `map` | `standard` | Medium height, sidebar right, show_address true. Address: "200 State St, 12th Floor, Boston, MA 02109". Directions link → Google Maps. Sidebar: 1 info block (title "Availability", text with meeting hours), 1 social block. |
| 3 | FAQ | `accordion` | `standard-accent` | Separated style, heading center, allow_multiple true. Title "Frequently Asked Questions". 4 items: "What does a typical engagement look like?", "How are your fees structured?", "Do you work with small businesses?", "What industries do you specialize in?". |

---

## Menus

### main-menu.json

| Label | URL |
|-------|-----|
| Services | services.html |
| Work | work.html |
| About | about.html |
| Contact | contact.html |

### footer-menu.json

| Label | URL |
|-------|-----|
| Home | index.html |
| Services | services.html |
| Work | work.html |
| About | about.html |
| Contact | contact.html |

---

## Widget Usage Summary

| Widget Type | Count |
|-------------|-------|
| `rich-text` | 2 (home hero, work closing) |
| `key-figures` | 1 |
| `icon-card-grid` | 1 |
| `image-text` | 2 (home, about opener) |
| `testimonials` | 2 (home, work) |
| `action-bar` | 3 |
| `split-content` | 1 (services opener) |
| `card-grid` | 1 |
| `steps` | 1 |
| `image-callout` | 2 (services, work opener) |
| `project-showcase` | 1 |
| `logo-cloud` | 1 |
| `features-split` | 2 (about, contact opener) |
| `timeline` | 1 |
| `profile-grid` | 1 |
| `accordion` | 2 |
| `map` | 1 |

**Total:** 25 widget instances, **17 unique types**, **0 banner widgets**.

---

## Page Opening Widget Diversity

| Page | First Widget | Why it works |
|------|-------------|--------------|
| Home | `rich-text` (highlight) | Bold text statement — consultants lead with ideas |
| Services | `split-content` (standard-accent) | Two-column intro — heading left, description right |
| Work | `image-callout` (standard-accent) | Dramatic image + heading — visual impact without a banner |
| About | `image-text` (standard) | Story opens the page — the firm history IS the hero |
| Contact | `features-split` (standard-accent) | Engagement types first — immediately actionable |

---

## Header Differentiation Notes

Clearpath is the **first preset** to combine:
- **Sticky** + **centered nav** (no other preset has both)
- **No contact details** in a sticky header (Greystone and Saffron are sticky but show phone/address)
- **Primary CTA** "Book a Call" with empty contact lines
- Creates an ultra-minimal, premium navigation bar — just logo, centered links, and a single CTA button
