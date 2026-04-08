# Pipeworks — Plumber / Electrician

## Identity

**Name:** Pipeworks
**Industry:** Plumber / Electrician (Home Services / Trades)
**Personality:** Reliable, direct, skilled. Pipeworks doesn't oversell — they show up on time, do the job right, and clean up after themselves. The site feels like a firm handshake: confident, practical, no fluff. Bold colors signal urgency for emergencies; clean layouts signal professionalism for planned work. The kind of business you'd recommend to your neighbor without hesitation.

---

## Sitemap

6 pages, tailored to how homeowners actually find and evaluate a trades business:

| Page | Slug | Purpose |
|------|------|---------|
| Home | `index` | Emergency CTA, services overview, trust credentials, testimonials, stats |
| Services | `services` | Detailed plumbing + electrical services, pricing guidance, process |
| Projects | `projects` | Before/after gallery of completed jobs |
| Areas We Serve | `areas` | Service area coverage with towns and response info |
| About | `about` | Team, licensing, insurance, company story |
| Contact | `contact` | Emergency line, scheduling, office location, FAQ |

**Emergency CTA strategy:** The header contact line reads "24/7 Emergency: (555) 847-3200" — visible on every page via sticky header. No separate emergency page; the urgency is persistent, not buried.

---

## preset.json Settings

### Color Palette

Bold and practical — brick red accent on warm neutrals. The brick red is the first true red in any preset, conveying action, urgency, and construction. Completely distinct from all existing accents.

**Standard palette (light):**

| Token | Value | Rationale |
|-------|-------|-----------|
| `standard_bg_primary` | `#ffffff` | Clean white — functional, professional |
| `standard_bg_secondary` | `#f5f3f1` | Warm light gray — like drywall, practical |
| `standard_text_heading` | `#1a1a1a` | Near-black — bold, no-nonsense |
| `standard_text_content` | `#3d3d3d` | Dark gray — clear readability |
| `standard_text_muted` | `#6e6e6e` | Medium gray |
| `standard_border_color` | `#e0ddda` | Warm gray border |
| `standard_accent` | `#b83a2e` | Brick red — action, urgency, trades |
| `standard_accent_text` | `#ffffff` | White on brick — 5.4:1 contrast |
| `standard_rating_star` | `#e8b931` | Warm gold |

**Highlight palette (dark):**

| Token | Value | Rationale |
|-------|-------|-----------|
| `highlight_bg_primary` | `#1a1a1a` | Dark charcoal — serious, professional |
| `highlight_bg_secondary` | `#111111` | Darker for panel contrast |
| `highlight_text_heading` | `#f5f3f1` | Warm off-white |
| `highlight_text_content` | `#b5b0aa` | Warm light gray — 5.6:1 on bg_primary |
| `highlight_text_muted` | `#7a7570` | Warm muted |
| `highlight_border_color` | `#333030` | Dark warm border |
| `highlight_accent` | `#e06050` | Lighter brick for dark backgrounds — 5.1:1 |
| `highlight_accent_text` | `#1a1a1a` | Dark text on light accent |
| `highlight_rating_star` | `#e8b931` | Consistent gold |

### Typography

| Setting | Value | Rationale |
|---------|-------|-----------|
| `heading_font` | `{ "stack": "\"Red Hat Display\", sans-serif", "weight": 700 }` | Geometric, slightly wide — feels technical and confident. Not yet used. |
| `body_font` | `{ "stack": "\"Rubik\", sans-serif", "weight": 400 }` | Friendly, rounded, practical readability. Not yet used. |
| `heading_scale` | `100` | Standard — Red Hat Display is already bold at default |
| `body_scale` | `100` | Standard |

### Style

| Setting | Value | Rationale |
|---------|-------|-----------|
| `corner_style` | `slightly-rounded` | Professional, approachable — not sharp (too corporate for trades) |
| `spacing_density` | `default` | Balanced, practical |
| `button_shape` | `sharp` | Decisive, action-oriented buttons — "Call Now" needs to feel punchy |

---

## Header Configuration

```json
{
  "logoText": "Pipeworks",
  "contactDetailsLine1": "24/7 Emergency: (555) 847-3200",
  "contactDetailsLine2": "Serving Greater Portland",
  "contact_position": "logo",
  "headerNavigation": "main-menu",
  "center_nav": false,
  "ctaButtonLink": {
    "href": "contact.html",
    "text": "Get a Quote",
    "target": "_self"
  },
  "ctaButtonStyle": "primary",
  "full_width": true,
  "sticky": true,
  "transparent_on_hero": false,
  "color_scheme": "standard"
}
```

**Header differentiation:** Sticky header with **emergency messaging in contact line** ("24/7 Emergency: ...") + service area in line 2 ("Serving Greater Portland"). This is the first header that uses contact lines for marketing messaging, not just a phone number. The emergency number is visible on every page as you scroll — critical for trades businesses. Combined with primary CTA and sticky, this creates an always-available action bar.

---

## Footer Configuration

```json
{
  "copyright": "\u00a9 2026 Pipeworks. Licensed & Insured. All rights reserved.",
  "color_scheme": "highlight"
}
```

**Blocks:**

| # | Type | Settings |
|---|------|----------|
| 1 | `logo_text` | `logo_text`: "Pipeworks", `text`: "<p>Licensed plumbing and electrical services for homes and businesses across Greater Portland.</p>" |
| 2 | `text_block` | `title`: "Emergency Line", `text`: "<p>(555) 847-3200</p><p>Available 24/7, 365 days a year.</p><p>info@pipeworkspdx.com</p>" |
| 3 | `menu_block` | `title`: "Pages", `menu`: "footer-menu" |
| 4 | `social_block` | `title`: "Follow Us" |

---

## Pages

### Home (`index.json`) — 7 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Hero | `banner` | `highlight` | **Large** height, left-aligned (`start`), dark overlay `rgba(26,26,26,0.7)`. Image: technician working. Heading 5xl "Reliable Plumbing & Electrical — Day or Night", text base "Licensed, insured, and ready when you need us. Emergency service available 24/7 across Greater Portland.", features block "+24/7 Emergency Response\n+Licensed & Insured\n+Free Estimates", button primary medium "Get a Quote" → contact.html + button secondary "Our Services" → services.html. `top_spacing: none`. |
| 2 | Trust Strip | `trust-bar` | `standard-accent` | Filled icons md rounded, left alignment, dividers on. 4 items: shield/"Licensed & Insured"/"OR License #12345", clock/"24/7 Emergency"/"We answer day or night", certificate/"Satisfaction Guaranteed"/"100% workmanship warranty", star/"5-Star Rated"/"200+ reviews". |
| 3 | Services | `icon-card-grid` | `standard` | Heading center, 3 columns, grid, box, center alignment, filled icons lg rounded. Eyebrow "What We Do", title "Our Services". 3 cards: wrench/"Plumbing", zap/"Electrical", alert-triangle/"Emergency". Each with description + "Learn More" → services.html. |
| 4 | About Teaser | `image-text` | `standard` | Image right (team photo), text_position center. Eyebrow "ABOUT PIPEWORKS", heading 3xl "Family-Owned Since 2008", text about reliability and community, button secondary "About Us" → about.html. |
| 5 | Testimonials | `testimonials` | `standard-accent` | 3 columns, grid, box, heading center. Eyebrow "Reviews", title "What Homeowners Say". 3 quotes with 5-star ratings. |
| 6 | Stats | `key-figures` | `highlight` | 4 columns, grid, flat, animate true. No heading. 4 figures: "5,000+"/"Jobs Completed", "15+"/"Years in Business", "4.9"/"Star Rating", "60"/"Min Avg Response". |
| 7 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Heading 2xl "Need a Plumber or Electrician?", text sm uppercase muted "Same-day service available.", button primary medium "Call (555) 847-3200" → contact.html. |

### Services (`services.json`) — 5 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Header | `banner` | `standard-accent` | Small height, center alignment. Heading 3xl "Services", text base "Professional plumbing and electrical for homes and businesses." No image. `top_spacing: none`, `bottom_spacing: none`. |
| 2 | Service Grid | `card-grid` | `standard` | 3 columns, grid, box, 4/3 aspect, start alignment, heading left. No section heading. 6 cards: Drain Cleaning & Repair, Water Heater Installation, Bathroom & Kitchen Plumbing, Electrical Panel Upgrades, Wiring & Rewiring, Lighting Installation. Each with image, subtitle (Plumbing/Electrical), title, description, button_link "Get a Quote" → contact.html. |
| 3 | Why Us | `image-text` | `highlight` | Image left (technician with tools), text_position center. Eyebrow "WHY PIPEWORKS", heading 3xl "We Do It Right the First Time", features "+Upfront pricing — no surprise fees\n+Clean job sites — we leave it better than we found it\n+Warranty on all workmanship\n+Background-checked technicians". |
| 4 | Process | `numbered-cards` | `standard-accent` | 4 columns, grid, flat, center alignment, heading center. Eyebrow "How It Works", title "Simple as 1-2-3-4". Steps: 01 Call or Book Online, 02 Get a Free Estimate, 03 We Do the Work, 04 100% Satisfaction. |
| 5 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Heading 2xl "Ready to Get Started?", button primary medium "Get a Quote" → contact.html. |

### Projects (`projects.json`) — 4 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Header | `banner` | `standard-accent` | Small height, center alignment. Heading 3xl "Our Projects", text base "A look at recent work across plumbing and electrical." No image. `top_spacing: none`, `bottom_spacing: none`. |
| 2 | Gallery | `project-showcase` | `standard` | 3 columns, grid, 4/3 aspect, always text, heading left. No section heading. 6 projects: "Complete Bathroom Remodel — Pearl District", "Electrical Panel Upgrade — Lake Oswego", "Emergency Pipe Repair — Sellwood", "Kitchen Plumbing Renovation — Hawthorne", "Whole-Home Rewiring — Alberta Arts", "Water Heater Replacement — Beaverton". Each with image + description. |
| 3 | Testimonials | `testimonials` | `standard-accent` | 3 columns, grid, box, heading center. Eyebrow "Client Reviews", title "Straight From Our Customers". 3 quotes with 5-star ratings. |
| 4 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Heading 2xl "Have a Project in Mind?", text sm uppercase muted "Free estimates, no obligation.", button primary medium "Get a Quote" → contact.html. |

### Areas We Serve (`areas.json`) — 4 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Header | `banner` | `standard-accent` | Small height, center alignment. Heading 3xl "Areas We Serve", text base "Fast, reliable service across Greater Portland." No image. `top_spacing: none`, `bottom_spacing: none`. |
| 2 | Areas | `features-split` | `standard` | Heading left, content_position left, divider on, filled icons lg rounded. Eyebrow "Service Area", title "Where We Work". 4 features: location/"Portland Metro" (inner SE, NE, NW, SW, Pearl, Pearl District, downtown), location/"East Side" (Gresham, Milwaukie, Clackamas, Happy Valley), location/"West Side" (Beaverton, Tigard, Lake Oswego, West Linn), location/"North" (Vancouver WA, St Johns, Cathedral Park). |
| 3 | Response | `image-callout` | `highlight` | Image right (van on residential street). Heading 3xl "Same-Day Service, Every Day", text about fast response times, features "+Average 60-minute emergency response\n+Same-day appointments for non-emergencies\n+Saturday service available\n+No overtime charges for evenings", button primary medium "Call Now" → contact.html. |
| 4 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Heading 2xl "In Our Service Area?", button primary medium "Get a Quote" → contact.html. |

### About (`about.json`) — 5 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Header | `banner` | `highlight` | Small height, center alignment. Background image: team in front of van, dark overlay `rgba(26,26,26,0.65)`. Heading 3xl "About Pipeworks". `top_spacing: none`, `bottom_spacing: none`. |
| 2 | Story | `image-text` | `standard` | Image left (founder/workshop), text_position center. Eyebrow "OUR STORY", heading 3xl "Family-Owned, Community-Trusted", text about founding in 2008, growth, values — 2 paragraphs. |
| 3 | Team | `profile-grid` | `standard-accent` | 3 columns, grid, heading center. Eyebrow "The Crew", title "Meet the Team". 3 profiles: founder/owner, lead plumber, lead electrician. Each with photo, name, role, specialty, brief bio. |
| 4 | FAQ | `accordion` | `standard` | Separated style, heading center, allow_multiple true. Title "Common Questions". 5 items: "Are you licensed and insured?", "Do you offer warranties?", "What are your hours?", "Do you charge for estimates?", "How quickly can you respond to an emergency?". |
| 5 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Heading 2xl "Ready to Work With Us?", text sm uppercase muted "Free estimates on all projects.", button primary medium "Contact Us" → contact.html. |

### Contact (`contact.json`) — 3 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Intro | `features-split` | `standard-accent` | Heading left, content_position left, divider on, filled icons lg rounded. Eyebrow "Contact Us", title "We're Ready to Help". 3 features: alert-triangle/"Emergency Service" (call our 24/7 line for burst pipes, power outages, gas leaks), calendar/"Scheduled Service" (book online or call for planned repairs and installations), clipboard/"Free Estimate" (request a no-obligation quote for your project). `top_spacing: none`. |
| 2 | Map | `map` | `standard` | Medium height, sidebar right, show_address true. Address: "4821 SE Powell Blvd, Portland, OR 97206". Directions link → Google Maps. Sidebar: 1 info block (title "Business Hours", Mon-Fri 7am-6pm, Sat 8am-2pm, 24/7 emergency), 1 social block. |
| 3 | FAQ | `accordion` | `standard-accent` | Separated style, heading center, allow_multiple true. Title "Before You Call". 4 items: "What should I do in a plumbing emergency?", "How much does a typical repair cost?", "Do I need to be home during the service?", "What payment methods do you accept?". |

---

## Menus

### main-menu.json

| Label | URL |
|-------|-----|
| Services | services.html |
| Projects | projects.html |
| Areas We Serve | areas.html |
| About | about.html |
| Contact | contact.html |

### footer-menu.json

| Label | URL |
|-------|-----|
| Home | index.html |
| Services | services.html |
| Projects | projects.html |
| Areas We Serve | areas.html |
| About | about.html |
| Contact | contact.html |

---

## Widget Usage Summary

| Widget Type | Count |
|-------------|-------|
| `banner` | 5 (1 hero + 4 page headers) |
| `trust-bar` | 1 |
| `icon-card-grid` | 1 |
| `image-text` | 2 (home, services) |
| `testimonials` | 2 (home, projects) |
| `key-figures` | 1 |
| `action-bar` | 5 |
| `card-grid` | 1 |
| `numbered-cards` | 1 |
| `project-showcase` | 1 |
| `features-split` | 2 (areas, contact) |
| `image-callout` | 1 |
| `profile-grid` | 1 |
| `accordion` | 2 |
| `map` | 1 |

**Total:** 28 widget instances across 6 pages, **15 unique types**.

---

## Header Differentiation Notes

Pipeworks is the **first preset** to:
- Use **emergency messaging in the contact line** ("24/7 Emergency: ...") — not just a phone number but a marketing message
- Combine **sticky + both contact lines filled** with service area messaging ("Serving Greater Portland")
- This creates a persistent "we're always available" bar across all pages — essential for a trades business where emergency calls drive a significant portion of revenue
