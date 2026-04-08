# Ledgerworks — Accountant

## Identity

**Name:** Ledgerworks
**Industry:** Accountant / CPA Firm
**Personality:** Precise, modern, and approachable. Ledgerworks projects the confidence of a firm that speaks in numbers but thinks in outcomes. Clean lines, cool tones, and organized layouts that mirror the clarity they bring to their clients' finances. Professional without being corporate — the kind of accountant who explains things in plain English.

---

## preset.json Settings

### Color Palette

A cool, clean palette inspired by spreadsheets, blueprints, and steel. The steel blue accent is unique across all presets — distinct from Brightside's warmer sky blue (#2e7dba) by being darker and cooler.

**Standard palette (light):**

| Token | Value | Rationale |
|-------|-------|-----------|
| `standard_bg_primary` | `#ffffff` | Pure white — clean, precise, no warmth |
| `standard_bg_secondary` | `#f3f6f9` | Cool light gray — like a report background |
| `standard_text_heading` | `#1a2332` | Dark navy-charcoal — authoritative |
| `standard_text_content` | `#3e4d60` | Cool dark gray — readable, professional |
| `standard_text_muted` | `#6c7b8f` | Cool medium gray |
| `standard_border_color` | `#dce2ea` | Cool light border — structured |
| `standard_accent` | `#3d5a80` | Steel blue — trustworthy, analytical |
| `standard_accent_text` | `#ffffff` | White on steel blue — 5.8:1 contrast |
| `standard_rating_star` | `#e8b931` | Warm gold — contrasts the cool palette |

**Highlight palette (dark):**

| Token | Value | Rationale |
|-------|-------|-----------|
| `highlight_bg_primary` | `#1a2332` | Dark navy — complements the accent hue |
| `highlight_bg_secondary` | `#111926` | Deeper navy for panel differentiation |
| `highlight_text_heading` | `#f0f4f8` | Cool off-white headings |
| `highlight_text_content` | `#a8b8ca` | Cool light gray body text — 6.4:1 on bg_primary |
| `highlight_text_muted` | `#6e7f94` | Cool muted secondary |
| `highlight_border_color` | `#2a3a4e` | Dark cool border |
| `highlight_accent` | `#6b9fd4` | Lighter steel blue for dark backgrounds — 5.1:1 contrast |
| `highlight_accent_text` | `#1a2332` | Dark text on light accent — 5.8:1 contrast |
| `highlight_rating_star` | `#e8b931` | Consistent warm gold |

### Typography

| Setting | Value | Rationale |
|---------|-------|-----------|
| `heading_font` | `{ "stack": "\"Sora\", sans-serif", "weight": 600 }` | Geometric sans — clean, modern, precise. Feels data-driven. Not yet used in any preset. |
| `body_font` | `{ "stack": "\"IBM Plex Sans\", sans-serif", "weight": 400 }` | Designed for technical/data interfaces. Excellent readability. Not yet used. |
| `heading_scale` | `100` | Standard — the fonts carry enough presence at default size |
| `body_scale` | `100` | Standard body size |

### Style

| Setting | Value | Rationale |
|---------|-------|-----------|
| `corner_style` | `rounded` | Modern, approachable — signals that this isn't a stuffy firm |
| `spacing_density` | `compact` | Data-driven, efficient. Only Corkwell uses compact (very different context) |
| `button_shape` | `pill` | Soft CTAs — offsets the compact density. Rounded + compact + pill is a unique combo |

---

## Header Configuration

```json
{
  "logoText": "Ledgerworks",
  "contactDetailsLine1": "(555) 740-2200",
  "contactDetailsLine2": "",
  "contact_position": "menu",
  "headerNavigation": "main-menu",
  "center_nav": false,
  "ctaButtonLink": {
    "href": "contact.html",
    "text": "Get a Quote",
    "target": "_self"
  },
  "ctaButtonStyle": "secondary",
  "full_width": true,
  "sticky": false,
  "transparent_on_hero": false,
  "color_scheme": "highlight"
}
```

**Header differentiation:** Highlight header + contact at menu + secondary CTA + not sticky. Corkwell also uses highlight but has no contact info and uses transparent_on_hero. This is the first highlight header with contact info displayed in the menu area — creates a sleek dark nav bar with phone number integrated into the navigation row.

---

## Footer Configuration

```json
{
  "copyright": "\u00a9 2026 Ledgerworks CPA. All rights reserved.",
  "color_scheme": "highlight"
}
```

**Blocks:**

| # | Type | Settings |
|---|------|----------|
| 1 | `logo_text` | `logo_text`: "Ledgerworks", `text`: "<p>Modern accounting and advisory services for businesses and individuals.</p>" |
| 2 | `text_block` | `title`: "Contact", `text`: "<p>(555) 740-2200</p><p>hello@ledgerworks.com</p><p>85 Commerce St, Suite 400<br>Boston, MA 02109</p>" |
| 3 | `menu_block` | `title`: "Pages", `menu`: "footer-menu" |
| 4 | `social_block` | `title`: "Connect" |

---

## Pages

### Home (`index.json`) — 6 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Split Hero | `split-hero` | `standard` | Image right (team/office photo), no overlay. Blocks: heading 5xl "Financial Clarity for Growing Businesses", text base "Tax strategy, bookkeeping, and advisory services that let you focus on what you do best.", button primary medium "Our Services" → services.html, button secondary "Get a Quote" → contact.html. `top_spacing: none`. |
| 2 | Key Figures | `key-figures` | `standard-accent` | 4 columns, grid, flat, animate true. No section heading. 4 figures: "500+"/"Clients Served", "15+"/"Years Experience", "98%"/"Retention Rate", "$12M+"/"Tax Savings Delivered". |
| 3 | Icon Card Grid | `icon-card-grid` | `standard` | Heading center, 4 columns, grid, flat, center alignment, outline icons lg circle. Eyebrow "What We Do", title "Our Services". 4 cards: calculator/"Tax Planning", chart-bar/"Bookkeeping", shield/"Audit & Assurance", trending-up/"Business Advisory". Each with description + "Learn More" button link → services.html. |
| 4 | Split Content | `split-content` | `highlight` | Balance: equal, sticky_column: none. Left side: text sm uppercase muted "WHY LEDGERWORKS", heading 3xl "Numbers Tell Stories. We Help You Read Them.", button primary medium "About the Firm" → about.html. Right side: features block "+Dedicated Account Manager\n+Cloud-Based Real-Time Reporting\n+Industry-Specific Expertise\n+Year-Round Tax Strategy", text base explaining the approach. |
| 5 | Testimonial Slider | `testimonial-slider` | `standard-accent` | Autoplay true. 3 quotes with 5-star ratings, avatars, names, and business context as title. |
| 6 | Action Bar | `action-bar` | `highlight` | `fullwidth: false`. Heading 2xl "Ready to Simplify Your Finances?", text sm uppercase muted "Free initial consultation for new clients.", button primary medium "Get a Quote" → contact.html. |

### Services (`services.json`) — 5 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Banner | `banner` | `standard-accent` | **Small** height, center alignment. Heading 3xl "Services", text base "Comprehensive financial services tailored to your business." No image. `top_spacing: none`, `bottom_spacing: none`. |
| 2 | Card Grid | `card-grid` | `standard` | 3 columns, grid, box, 4/3 aspect, start alignment, heading left. No section heading. 6 cards: Tax Planning & Preparation, Bookkeeping & Payroll, Audit & Assurance, Business Advisory, CFO Services, Personal Finance. Each with image, subtitle (category), title, description, button_link. |
| 3 | Numbered Cards | `numbered-cards` | `standard-accent` | 4 columns, grid, flat, center alignment, heading center. Eyebrow "How It Works", title "Our Process". Steps: 01 Discovery Call, 02 Financial Review, 03 Strategy & Setup, 04 Ongoing Support. |
| 4 | Image-Text | `image-text` | `highlight` | Image left, text_position center, content_color_scheme none. Eyebrow "OUR APPROACH", heading 3xl "Proactive, Not Reactive", text about year-round strategy vs once-a-year tax filing, features "+Monthly Financial Reviews\n+Quarterly Tax Projections\n+Annual Strategy Sessions". |
| 5 | Action Bar | `action-bar` | `highlight` | `fullwidth: false`. Heading 2xl "Let's Talk About Your Business", button primary medium "Schedule a Call" → contact.html. |

### Work (`work.json`) — 5 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Banner | `banner` | `standard-accent` | **Small** height, center alignment. Heading 3xl "Our Work", text base "Industries and clients we serve." No image. `top_spacing: none`, `bottom_spacing: none`. |
| 2 | Logo Cloud | `logo-cloud` | `standard` | 5 columns, grid, heading center. Eyebrow "Trusted By", title "Clients Who Count on Us". 5 logos (placeholder). |
| 3 | Card Grid | `card-grid` | `standard-accent` | 3 columns, grid, box, 4/3 aspect, center alignment, heading center. Eyebrow "Industries", title "Sectors We Specialize In". 6 cards: Technology Startups, Healthcare Practices, Real Estate, Professional Services, E-Commerce, Nonprofit Organizations. Each with image + description. |
| 4 | Testimonials | `testimonials` | `standard` | 3 columns, grid, box, heading center. Eyebrow "Client Stories", title "What Our Clients Say". 3 quotes, 5-star ratings, avatars, names with business context. |
| 5 | Rich Text | `rich-text` | `highlight` | Center alignment, narrow width. Heading 2xl "Your Business Is Unique", text lg "Let's build a financial strategy that fits.", button primary medium "Get Started" → contact.html. |

### About (`about.json`) — 6 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Banner | `banner` | `highlight` | **Small** height, center alignment. Background image: office/building exterior, dark overlay `rgba(26,35,50,0.65)`. Heading 3xl "About the Firm". `top_spacing: none`, `bottom_spacing: none`. |
| 2 | Image-Text | `image-text` | `standard` | Image left, text_position center, content_color_scheme none. Eyebrow "OUR STORY", heading 3xl "Built on Precision", text about founding, mission, and growth. No button. |
| 3 | Key Figures | `key-figures` | `standard-accent` | 4 columns, grid, flat, animate true. No section heading. 4 figures: "15+"/"Years in Practice", "500+"/"Clients Served", "8"/"Team Members", "3"/"Office Locations". |
| 4 | Profile Grid | `profile-grid` | `standard` | 3 columns, grid, heading center. Eyebrow "Our Team", title "Meet the Team". 3 profiles: founding partner, senior accountant, tax specialist. Each with photo, name, role, specialty, brief bio, LinkedIn link. |
| 5 | Accordion | `accordion` | `standard-accent` | Separated style, heading center, allow_multiple true. Eyebrow "Working With Us", title "Frequently Asked Questions". 5 items about onboarding, fees, communication, software, and timelines. |
| 6 | Action Bar | `action-bar` | `highlight` | `fullwidth: false`. Heading 2xl "Let's Work Together", text sm uppercase muted "Your first consultation is free.", button primary medium "Contact Us" → contact.html. |

### Contact (`contact.json`) — 4 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Banner | `banner` | `standard-accent` | **Small** height, center alignment. Heading 3xl "Contact", text base "We'd love to hear from you." No image. `top_spacing: none`, `bottom_spacing: none`. |
| 2 | Rich Text | `rich-text` | `standard` | Center alignment, narrow width. Heading 2xl "Get in Touch", text base about what to expect from the first conversation. |
| 3 | Map | `map` | `standard` | Medium height, sidebar right, show_address true. Address: "85 Commerce St, Suite 400, Boston, MA 02109". Directions link: "Get Directions" → Google Maps. Sidebar: 1 info block (title "Office Hours", weekday/weekend hours), 1 social block. |
| 4 | Accordion | `accordion` | `standard-accent` | Separated style, heading center, allow_multiple true. Title "Common Questions". 4 items: "What do I need for my first meeting?", "How do you charge for services?", "Do you work with my accounting software?", "When should I start tax planning?". |

---

## Menus

### main-menu.json

| Label | URL |
|-------|-----|
| Services | services.html |
| Our Work | work.html |
| About | about.html |
| Contact | contact.html |

### footer-menu.json

| Label | URL |
|-------|-----|
| Home | index.html |
| Services | services.html |
| Our Work | work.html |
| About | about.html |
| Contact | contact.html |

---

## Widget Usage Summary

| Widget Type | Count |
|-------------|-------|
| `split-hero` | 1 |
| `key-figures` | 2 |
| `icon-card-grid` | 1 |
| `split-content` | 1 |
| `testimonial-slider` | 1 |
| `action-bar` | 3 |
| `banner` | 4 (page headers) |
| `card-grid` | 2 |
| `numbered-cards` | 1 |
| `image-text` | 2 |
| `logo-cloud` | 1 |
| `testimonials` | 1 |
| `rich-text` | 2 |
| `profile-grid` | 1 |
| `accordion` | 2 |
| `map` | 1 |

**Total:** 26 widget instances, **16 unique types**.

---

## Differentiation from Greystone (also professional services)

| Aspect | Greystone (Lawyer) | Ledgerworks (Accountant) |
|--------|-------------------|--------------------------|
| Accent | Warm bronze #8c6434 | Cool steel blue #3d5a80 |
| Palette temp | Warm neutrals | Cool neutrals |
| Heading font | Libre Baskerville (serif) | Sora (geometric sans) |
| Body font | Outfit | IBM Plex Sans |
| Corner style | Sharp | Rounded |
| Spacing | Default | Compact |
| Button shape | Auto | Pill |
| Header | Standard, sticky, contained | Highlight, not sticky, full width |
| Homepage hero | Banner (left-aligned) | Split-hero (image right) |
| Personality | Old-money gravitas | Modern precision |

---

## Header Differentiation Notes

Ledgerworks is the **first preset** to combine:
- **Highlight** color scheme + **contact at menu** position
- Corkwell also uses highlight but has empty contact lines and transparent_on_hero
- Crumbly and Velvet Touch use menu position but with standard/standard-accent schemes
- This creates a distinctive dark navigation bar with the phone number integrated into the menu row — authoritative and streamlined
