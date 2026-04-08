# Greystone — Lawyer / Law Firm

## Identity

**Name:** Greystone Law
**Industry:** Lawyer / Law Firm
**Personality:** Authoritative, established, quietly confident. Greystone projects the gravitas of a firm built over decades — warm stone surfaces, leather-bound volumes, brass accents. The tone is measured and deliberate, never flashy. Trust is earned through substance, not spectacle.

---

## preset.json Settings

### Color Palette

A warm-neutral palette inspired by granite, walnut, and aged brass. The bronze accent is unique across all presets — distinguished from Saffron's yellow-gold and warmer than any existing accent.

**Standard palette (light):**

| Token | Value | Rationale |
|-------|-------|-----------|
| `standard_bg_primary` | `#faf9f7` | Warm white — softer than pure white, feels like heavy paper stock |
| `standard_bg_secondary` | `#f0ede8` | Warm light gray — like polished limestone |
| `standard_text_heading` | `#1c1917` | Near-black with warm undertone — authoritative without being cold |
| `standard_text_content` | `#44403c` | Dark warm gray — readable, approachable |
| `standard_text_muted` | `#78716c` | Stone gray — secondary info |
| `standard_border_color` | `#d6d3cd` | Warm gray border — subtle warmth |
| `standard_accent` | `#8c6434` | Warm bronze — leather and brass, unique hue |
| `standard_accent_text` | `#ffffff` | White on bronze — 5.2:1 contrast |
| `standard_rating_star` | `#c9952e` | Warm gold stars |

**Highlight palette (dark):**

| Token | Value | Rationale |
|-------|-------|-----------|
| `highlight_bg_primary` | `#1c1917` | Dark charcoal with warm undertone — like slate stone |
| `highlight_bg_secondary` | `#121110` | Deeper charcoal — panel differentiation |
| `highlight_text_heading` | `#f5f2ed` | Warm off-white headings |
| `highlight_text_content` | `#b8b2a8` | Warm light gray body text — 6.1:1 on bg_primary |
| `highlight_text_muted` | `#8a847b` | Muted warm gray |
| `highlight_border_color` | `#3a3632` | Dark warm border |
| `highlight_accent` | `#c9a06c` | Lighter bronze for dark backgrounds — 4.8:1 on bg_primary |
| `highlight_accent_text` | `#1c1917` | Dark text on light bronze — 5.5:1 contrast |
| `highlight_rating_star` | `#c9952e` | Consistent gold |

### Typography

| Setting | Value | Rationale |
|---------|-------|-----------|
| `heading_font` | `{ "stack": "\"Libre Baskerville\", serif", "weight": 700 }` | Classic, authoritative transitional serif. Sharp and lawyerly. Not yet used in any preset. |
| `body_font` | `{ "stack": "\"Outfit\", sans-serif", "weight": 400 }` | Clean geometric sans — modern readability against the traditional headings. Not yet used. |
| `heading_scale` | `105` | Slightly larger headings — commands presence without shouting |
| `body_scale` | `100` | Standard body size |

### Style

| Setting | Value | Rationale |
|---------|-------|-----------|
| `corner_style` | `slightly-rounded` | Professional — not harsh (sharp) or casual (rounded) |
| `spacing_density` | `default` | Balanced, measured pacing |
| `button_shape` | `auto` | Follows corner_style for consistency |

---

## Header Configuration

```json
{
  "logoText": "Greystone",
  "contactDetailsLine1": "(555) 814-2600",
  "contactDetailsLine2": "320 Lexington Ave, Suite 1200",
  "contact_position": "logo",
  "headerNavigation": "main-menu",
  "center_nav": false,
  "ctaButtonLink": {
    "href": "contact.html",
    "text": "Free Consultation",
    "target": "_self"
  },
  "ctaButtonStyle": "primary",
  "full_width": false,
  "sticky": true,
  "transparent_on_hero": false,
  "color_scheme": "standard"
}
```

**Header differentiation:** Sticky + contained (full_width: false) + standard scheme + contact at logo + primary CTA. Only Brightside also uses contained, but Brightside is not sticky and uses highlight-accent scheme. This is the first sticky contained header.

---

## Footer Configuration

```json
{
  "copyright": "\u00a9 2026 Greystone Law. All rights reserved.",
  "color_scheme": "highlight"
}
```

**Blocks:**

| # | Type | Settings |
|---|------|----------|
| 1 | `logo_text` | `logo_text`: "Greystone", `text`: "<p>Experienced counsel for individuals and businesses navigating complex legal challenges.</p>" |
| 2 | `text_block` | `title`: "Contact", `text`: "<p>(555) 814-2600</p><p>info@greystonelaw.com</p><p>320 Lexington Ave, Suite 1200<br>New York, NY 10016</p>" |
| 3 | `menu_block` | `title`: "Pages", `menu`: "footer-menu" |
| 4 | `social_block` | `title`: "Follow Us" |

---

## Pages

### Home (`index.json`) — 6 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Banner | `banner` | `highlight` | **Large** height, **left-aligned** (`alignment: start`), vertical_alignment: center. Background: wide office photo, dark overlay `rgba(28,25,23,0.65)`. Blocks: heading 5xl "Trusted Counsel for Complex Matters", text base "For over four decades, Greystone has delivered strategic legal solutions for individuals and businesses across New York.", button primary medium "Our Practice Areas" → services.html. `top_spacing: none`. |
| 2 | Trust Bar | `trust-bar` | `standard-accent` | Filled icons, md size, sharp shape, left alignment, dividers on. 4 items: shield/"40+ Years Experience", scale/"500+ Cases Resolved", map-pin/"Multi-State Licensed", award/"Top-Rated Attorneys". `top_spacing: none`. |
| 3 | Features Split | `features-split` | `standard` | Heading left, content_position: left, divider on. Filled icons, lg, sharp. Section heading "Practice Areas" + description. 4 features: briefcase/"Business Litigation", file-text/"Estate Planning", home/"Real Estate Law", users/"Family Law". Each with 2-3 sentence description. |
| 4 | Image-Text | `image-text` | `standard` | Image right, text_position: center. content_color_scheme: none. Heading 3xl "A Firm Built on Integrity", text about firm history, button secondary medium "About the Firm" → about.html. Image: conference room or firm interior. |
| 5 | Testimonials | `testimonials` | `highlight` | 2 columns, grid, flat, heading center. Section heading "What Our Clients Say". 2 quotes with ratings (5 stars), avatars, names, and roles/case types. |
| 6 | Action Bar | `action-bar` | `highlight-accent` | `fullwidth: false`. Heading 2xl "Schedule Your Free Consultation", text sm uppercase muted "No obligation. Confidential.", button primary medium "Get in Touch" → contact.html. |

### Services (`services.json`) — 5 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Banner | `banner` | `standard-accent` | **Small** height, center alignment. Heading 3xl "Practice Areas", text base "Comprehensive legal services tailored to your needs." No image, no overlay. |
| 2 | Card Grid | `card-grid` | `standard` | 3 columns, grid, box, 4/3 aspect, center alignment, heading left. No section heading. 6 cards: Business Litigation, Estate Planning, Real Estate Law, Family Law, Employment Law, Personal Injury. Each with image, subtitle (category), title, description, button_link "Learn More" → #. |
| 3 | Image-Text | `image-text` | `highlight` | Image left, text_position: center, content_color_scheme: none. Heading 3xl "Why Greystone", text about approach/philosophy. Features block: +Personalized Strategy, +Transparent Fees, +Proven Track Record. |
| 4 | Numbered Cards | `numbered-cards` | `standard-accent` | 4 columns, grid, flat, center alignment, heading center. Section heading "Our Process". Steps: 01 Consultation, 02 Research & Analysis, 03 Strategy Development, 04 Resolution. Each with richtext description. |
| 5 | Action Bar | `action-bar` | `highlight` | `fullwidth: false`. Heading 2xl "Ready to Discuss Your Case?", button primary medium "Free Consultation" → contact.html. |

### Work (`work.json`) — 4 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Banner | `banner` | `standard-accent` | **Small** height, center alignment. Heading 3xl "Case Results", text base "A selection of outcomes we've achieved for our clients." No image. |
| 2 | Project Showcase | `project-showcase` | `standard` | 3 columns, grid, 4/3 aspect, hover text, heading left. No section heading. 6 projects: notable case results with titles like "$2.4M Business Dispute Resolution", "Commercial Lease Negotiation", etc. Each with description of outcome and image. |
| 3 | Testimonials | `testimonials` | `standard-accent` | 3 columns, grid, box, heading center. Section heading "Client Testimonials". 3 quotes, 5-star ratings, avatars, names with case context as title. |
| 4 | Rich Text | `rich-text` | `highlight` | Center alignment, narrow width. Heading 2xl "Every Case Is Unique", text lg "We'd welcome the opportunity to learn about yours and discuss how we can help.", button primary medium "Contact Us" → contact.html. |

### About (`about.json`) — 5 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Banner | `banner` | `highlight` | **Small** height, center alignment. Heading 3xl "About the Firm". Background image: building exterior or architectural detail, dark overlay `rgba(28,25,23,0.6)`. `top_spacing: none`. |
| 2 | Image-Text | `image-text` | `standard` | Image left, text_position: center, content_color_scheme: none. Heading 3xl "Founded on Principle", text about firm founding, history, and mission — 2-3 paragraphs. No button. |
| 3 | Profile Grid | `profile-grid` | `standard-accent` | 3 columns, grid, heading center. Section heading "Our Attorneys". 3 profiles: managing partner, senior associate, associate. Each with photo, name, role, specialty, brief bio, LinkedIn link. |
| 4 | Accordion | `accordion` | `standard` | Separated style, heading left, allow_multiple: true, sidebar_position: right. Section heading "Our Approach". Sidebar: 1 info block (title "Founded", text "1984 — New York, NY"). 4 items as Q&A about firm values: "What drives our legal philosophy?", "How do we approach client relationships?", "What makes our team different?", "How do we handle billing?". |
| 5 | Action Bar | `action-bar` | `highlight` | `fullwidth: false`. Heading 2xl "Let's Work Together", text sm uppercase muted "Your first consultation is always free.", button primary medium "Schedule a Call" → contact.html. |

### Contact (`contact.json`) — 4 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Banner | `banner` | `standard-accent` | **Small** height, center alignment. Heading 3xl "Contact", text base "We're ready to listen." No image. |
| 2 | Rich Text | `rich-text` | `standard` | Center alignment, narrow width. Heading 2xl "Get in Touch", text base with office hours and what to expect during a consultation. No button. |
| 3 | Map | `map` | `standard` | Medium height, sidebar right, show_address true. Address: "320 Lexington Ave, Suite 1200, New York, NY 10016". Directions link: "Get Directions" → Google Maps. Sidebar blocks: 1 info block (title "Office Hours", text with weekday/weekend hours), 1 social block. |
| 4 | Accordion | `accordion` | `standard-accent` | Separated style, heading center, allow_multiple: true. Section heading "Frequently Asked Questions". 5 items: "What should I bring to my first consultation?", "How are your fees structured?", "How long does a typical case take?", "Do you offer payment plans?", "What areas of New York do you serve?". |

---

## Menus

### main-menu.json

| Label | URL |
|-------|-----|
| Practice Areas | services.html |
| Case Results | work.html |
| About | about.html |
| Contact | contact.html |

*(Home is accessed via the logo — not in the main nav.)*

### footer-menu.json

| Label | URL |
|-------|-----|
| Home | index.html |
| Practice Areas | services.html |
| Case Results | work.html |
| About | about.html |
| Contact | contact.html |

---

## Widget Usage Summary

| Widget Type | Count |
|-------------|-------|
| `banner` | 5 (1 hero + 4 page headers) |
| `trust-bar` | 1 |
| `features-split` | 1 |
| `image-text` | 3 |
| `testimonials` | 2 |
| `action-bar` | 3 |
| `card-grid` | 1 |
| `numbered-cards` | 1 |
| `project-showcase` | 1 |
| `rich-text` | 2 |
| `profile-grid` | 1 |
| `accordion` | 2 |
| `map` | 1 |

**Total:** 24 widget instances, **13 unique types**.

---

## Header Differentiation Notes

Greystone is the **first preset** to combine:
- **Sticky** + **contained** (full_width: false)
- **Standard** color scheme (Brightside is the only other contained header but uses highlight-accent and is not sticky)
- **Contact at logo** with both phone and address filled
- **Primary CTA** button ("Free Consultation")

This creates a professional, ever-present navigation bar that feels contained and refined — appropriate for a prestigious law firm that wants to project accessibility without being casual.
