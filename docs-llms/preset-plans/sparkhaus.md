# Sparkhaus — Cleaning Service

## Identity

**Name:** Sparkhaus Cleaning Co.
**Industry:** Cleaning Service (Residential & Commercial)
**Personality:** Crisp, trustworthy, no-nonsense. Sparkhaus is the kind of cleaning company that sends a checklist after every visit. The site communicates precision and reliability through clean lines, sharp edges, and a cool teal accent that reads as fresh and sanitary. Professional without being corporate — approachable but detail-oriented.

---

## Sitemap

5 pages — standard service business:

| Page | Slug | Purpose |
|------|------|---------|
| Home | `index` | Hero with value prop, trust signals, services preview, process, testimonials, CTA |
| Services | `services` | Detailed service breakdown with visual cards |
| Work | `work` | Before/after results, client testimonials |
| About | `about` | Story, team, values, FAQ |
| Contact | `contact` | Contact details, service area map, booking CTA |

---

## preset.json Settings

### Color Palette

A cool, clinical palette built around teal — suggests cleanliness and freshness. The standard palette is bright and airy (white + cool gray). The highlight palette uses a deep charcoal-blue, not pure black, for warmth.

**Standard palette (light):**

| Token | Value | Rationale |
|-------|-------|-----------|
| `standard_bg_primary` | `#ffffff` | Pure white — spotless, on-brand |
| `standard_bg_secondary` | `#f4f7f9` | Cool blue-gray — subtle banding |
| `standard_text_heading` | `#131b23` | Near-black with blue undertone |
| `standard_text_content` | `#3b4856` | Cool dark gray — readable, professional |
| `standard_text_muted` | `#6d7a88` | Medium cool gray |
| `standard_border_color` | `#dce3ea` | Light cool border |
| `standard_accent` | `#0e8a7e` | Teal — fresh, clean, unique across presets |
| `standard_accent_text` | `#ffffff` | White on teal — 4.6:1 contrast |
| `standard_rating_star` | `#f0b429` | Warm amber — standard |

**Highlight palette (dark):**

| Token | Value | Rationale |
|-------|-------|-----------|
| `highlight_bg_primary` | `#131b23` | Deep charcoal-blue — matches heading color |
| `highlight_bg_secondary` | `#0b1118` | Darker variant |
| `highlight_text_heading` | `#f4f7f9` | Cool white |
| `highlight_text_content` | `#a8b5c2` | Light blue-gray body — 5.1:1 |
| `highlight_text_muted` | `#6d7a88` | Medium gray |
| `highlight_border_color` | `#263040` | Dark blue-gray border |
| `highlight_accent` | `#3ec9bb` | Lighter teal for dark bg — 5.3:1 |
| `highlight_accent_text` | `#131b23` | Dark on light accent |
| `highlight_rating_star` | `#f0b429` | Consistent amber |

### Typography

| Setting | Value | Rationale |
|---------|-------|-----------|
| `heading_font` | `{ "stack": "\"Outfit\", sans-serif", "weight": 600 }` | Geometric, clean, modern — feels precise and efficient. Not used in any existing preset. |
| `body_font` | `{ "stack": "\"Plus Jakarta Sans\", sans-serif", "weight": 400 }` | Friendly geometric sans — slightly softer than headings. Not used in any existing preset. |
| `heading_scale` | `100` | Standard |
| `body_scale` | `100` | Standard |

### Style

| Setting | Value | Rationale |
|---------|-------|-----------|
| `corner_style` | `sharp` | Clean, precise edges — matches the cleaning brand's attention to detail. Contrasts with greenfield (rounded) and pipeworks (slightly-rounded). |
| `spacing_density` | `compact` | Efficient, no wasted space — matches the brand's no-nonsense personality. Only ledgerworks uses compact among recent presets. |
| `button_shape` | `sharp` | Consistent with corner style — crisp rectangular buttons |

---

## Header Configuration

```json
{
  "settings": {
    "logoText": "Sparkhaus",
    "contactDetailsLine1": "Call us: (555) 718-2200",
    "contactDetailsLine2": "",
    "contact_position": "menu",
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
    "transparent_on_hero": true,
    "color_scheme": "standard-primary"
  }
}
```

**Differentiation:** Sticky + transparent on hero + primary CTA + phone in nav bar (`contact_position: "menu"`) + no address line. Gives a modern, conversion-focused header that overlays the hero. Different from greenfield (non-sticky, contact by logo) and pipeworks (non-transparent, secondary CTA).

---

## Footer Configuration

```json
{
  "settings": {
    "copyright": "\u00a9 2026 Sparkhaus Cleaning Co. All rights reserved.",
    "color_scheme": "highlight-primary"
  },
  "blocks": {
    "logo": {
      "type": "logo_text",
      "settings": {
        "logo_text": "Sparkhaus",
        "text": "<p>Professional cleaning services for homes and businesses. Licensed, bonded, and insured.</p>"
      }
    },
    "contact": {
      "type": "text_block",
      "settings": {
        "title": "Contact",
        "text": "<p>(555) 718-2200<br>hello@sparkhaus.co<br>Mon\u2013Fri: 7am\u20136pm<br>Sat: 8am\u20132pm</p>"
      }
    },
    "links": {
      "type": "menu_block",
      "settings": {
        "title": "Quick Links",
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
| 1 | Hero Banner | `banner` | highlight-primary | Medium height, overlay, transparent header support. Heading + text + CTA button. `top_spacing: none` |
| 2 | Trust Bar | `trust-bar` | standard-secondary | 4 items: Licensed & Insured, Eco-Friendly Products, Satisfaction Guaranteed, Same-Day Booking. Filled icons, centered. `top_spacing: none` |
| 3 | Services Preview | `icon-card-grid` | standard-primary | 4 cards, box layout, 4 columns. Residential, Commercial, Deep Clean, Move-In/Out |
| 4 | How It Works | `steps` | standard-secondary | 4 steps: Book Online, We Arrive On Time, Detailed Clean, Walk-Through Check |
| 5 | Image Callout | `image-callout` | standard-primary | Image right, "Why Choose Sparkhaus?" with features list |
| 6 | Testimonials | `testimonial-slider` | highlight-primary | 4 quotes with ratings, autoplay |
| 7 | CTA | `action-bar` | highlight-primary | "Ready for a Spotless Space?" with booking button. No background image |

### Services (`services`)

| # | Widget | Type | Color Scheme | Key Details |
|---|--------|------|-------------|-------------|
| 1 | Page Banner | `banner` | highlight-primary | Small height, "Our Services" heading. `top_spacing: none` |
| 2 | Service Cards | `checkerboard` | standard-primary | 4 cards, 2 columns: Residential, Commercial, Deep Clean, Move-In/Out with images |
| 3 | What's Included | `features-split` | standard-secondary | Left heading, 6 feature items with icons: Kitchens, Bathrooms, Living Areas, Bedrooms, Windows, Floors |
| 4 | Pricing Note | `image-callout` | standard-primary | Image left, "Transparent Pricing" + features list + CTA |
| 5 | FAQ | `accordion` | standard-primary | 5 items about services, products, scheduling. Connected style, left-aligned |

### Work (`work`)

| # | Widget | Type | Color Scheme | Key Details |
|---|--------|------|-------------|-------------|
| 1 | Page Banner | `banner` | highlight-primary | Small height, "Our Work" heading. `top_spacing: none` |
| 2 | Results | `card-grid` | standard-primary | 6 cards, 3 columns, box layout. Before/after project cards with descriptions |
| 3 | Testimonials | `testimonial-slider` | standard-secondary | 4 quotes, autoplay |
| 4 | CTA | `action-bar` | highlight-primary | "See What We Can Do for You" |

### About (`about`)

| # | Widget | Type | Color Scheme | Key Details |
|---|--------|------|-------------|-------------|
| 1 | Page Banner | `banner` | highlight-primary | Small height, "About Sparkhaus". `top_spacing: none` |
| 2 | Our Story | `image-callout` | standard-primary | Image left, company story with button |
| 3 | Team | `profile-grid` | standard-secondary | 3 profiles, 3 columns |
| 4 | Values | `icon-card-grid` | standard-primary | 3 cards, flat layout, 3 columns: Reliability, Quality, Sustainability |
| 5 | FAQ | `accordion` | standard-primary | 4 items about the company, hiring, insurance. Separated style |

### Contact (`contact`)

| # | Widget | Type | Color Scheme | Key Details |
|---|--------|------|-------------|-------------|
| 1 | Page Banner | `banner` | highlight-primary | Small height, "Get in Touch". `top_spacing: none` |
| 2 | Contact Info | `contact-details` | standard-primary | 3 blocks: info (address, phone, email), hours (text_block), social |
| 3 | Service Area Map | `map` | standard-secondary | Google Maps embed with sidebar info block |
| 4 | FAQ | `accordion` | standard-primary | 4 items about booking, cancellation, payment. Connected style |

---

## Menus

**main-menu.json:**
- Home → `index.html`
- Services → `services.html`
- Our Work → `work.html`
- About → `about.html`
- Contact → `contact.html`

**footer-menu.json:**
- Services → `services.html`
- Our Work → `work.html`
- About → `about.html`
- Contact → `contact.html`

---

## Widget Usage Summary

| Widget Type | Count |
|------------|-------|
| `banner` | 5 (1 hero + 4 inner pages) |
| `trust-bar` | 1 |
| `icon-card-grid` | 2 |
| `steps` | 1 |
| `image-callout` | 3 |
| `testimonial-slider` | 2 |
| `action-bar` | 2 |
| `checkerboard` | 1 |
| `features-split` | 1 |
| `accordion` | 3 |
| `card-grid` | 1 |
| `profile-grid` | 1 |
| `contact-details` | 1 |
| `map` | 1 |

**13 unique widget types across 5 pages.**

---

## Header Differentiation Notes

- **Sticky + Transparent on hero**: immersive hero experience, header always accessible
- **Primary CTA** ("Get a Quote"): strong conversion focus, teal button stands out
- **Phone in nav bar** (`contact_position: "menu"`): phone number visible but not taking logo space
- **No address line**: keeps header minimal and clean
- Differs from greenfield (non-sticky, contact by logo, secondary CTA) and pipeworks (non-transparent, secondary CTA, full contact details)
