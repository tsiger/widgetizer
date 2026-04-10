# Pawlish — Pet Grooming

## Identity

**Business name:** Pawlish Pet Spa
**Industry:** Pet Grooming
**Brand personality:** Cheerful, trustworthy, clean. Pawlish is a neighborhood pet grooming salon that treats every dog and cat like family. The site should feel warm and welcoming — bright colors, soft shapes, and images of happy, freshly groomed pets. Not cutesy to the point of being unserious — professional care with genuine love for animals.

---

## Industry Translation

Pet grooming is a **trust-driven, price-transparent, visual-results** business:

1. **Trust** — people are handing their pet to a stranger. Certifications, team bios, clean facility photos, and testimonials matter enormously.
2. **Pricing clarity** — grooming rates vary by animal size/breed. Customers want to know what it costs before they call. A priced list with size tiers is essential.
3. **Visual results** — before/after grooming transformations are the most compelling proof. Gallery and comparison slider are natural fits.
4. **Scheduling** — clear hours with appointment info. Schedule table with booking sidebar.
5. **Service packages** — most groomers offer tiers (basic bath, full groom, spa treatment). These need comparison or tiered presentation.

---

## Sitemap

| Page | Slug | Purpose |
|------|------|---------|
| Home | `index` | Hero, services preview, before/after, trust signals, testimonials |
| Services | `services` | Full service list with pricing, packages, what's included, FAQ |
| Gallery | `gallery` | Before/after transformations, happy groomed pets |
| About | `about` | Story, team, certifications, safety |
| Contact | `contact` | Hours, location, booking info, FAQ |

---

## preset.json Settings

### Color Palette

A bright, clean palette built around teal-blue and warm cream. The teal reads as clean and fresh (water/bath association). The highlight palette is a deep navy-teal — professional but not cold.

**Standard palette (light):**

| Token | Value | Rationale |
|-------|-------|-----------|
| `standard_bg_primary` | `#faf9f7` | Warm off-white |
| `standard_bg_secondary` | `#f0eeea` | Light warm gray |
| `standard_text_heading` | `#16202a` | Dark navy |
| `standard_text_content` | `#374151` | Dark gray |
| `standard_text_muted` | `#6b7280` | Medium gray |
| `standard_border_color` | `#d1d5db` | Light border |
| `standard_accent` | `#0891b2` | Bright teal — clean, fresh, water/bath, unique across presets |
| `standard_accent_text` | `#ffffff` | White on teal — 4.7:1 |
| `standard_rating_star` | `#f59e0b` | Warm amber |

**Highlight palette (dark):**

| Token | Value | Rationale |
|-------|-------|-----------|
| `highlight_bg_primary` | `#0f1a24` | Deep navy-teal |
| `highlight_bg_secondary` | `#081118` | Darker variant |
| `highlight_text_heading` | `#f0f4f8` | Cool white |
| `highlight_text_content` | `#94a3b8` | Light blue-gray — 5.3:1 |
| `highlight_text_muted` | `#64748b` | Medium blue-gray |
| `highlight_border_color` | `#1e3a4f` | Dark teal border |
| `highlight_accent` | `#22d3ee` | Bright cyan for dark bg — 5.0:1 |
| `highlight_accent_text` | `#0f1a24` | Dark on bright accent |
| `highlight_rating_star` | `#f59e0b` | Consistent amber |

### Typography

| Setting | Value | Rationale |
|---------|-------|-----------|
| `heading_font` | `{ "stack": "\"Fredoka\", sans-serif", "weight": 600 }` | Rounded, friendly display sans — playful but legible. Not used in any existing preset. Perfect for a pet business. |
| `body_font` | `{ "stack": "\"Mulish\", sans-serif", "weight": 400 }` | Clean, modern, highly readable sans. Not used in any existing preset. |
| `heading_scale` | `100` | Standard |
| `body_scale` | `100` | Standard |

### Style

| Setting | Value | Rationale |
|---------|-------|-----------|
| `corner_style` | `rounded` | Soft, friendly edges — matches the warm pet-care brand |
| `spacing_density` | `default` | Balanced |
| `button_shape` | `pill` | Fully rounded — playful, inviting |

---

## Header Configuration

```json
{
  "settings": {
    "logoText": "Pawlish",
    "contactDetailsLine1": "(555) 926-3400",
    "contactDetailsLine2": "",
    "contact_position": "menu",
    "headerNavigation": "main-menu",
    "center_nav": false,
    "ctaButtonLink": {
      "href": "contact.html",
      "text": "Book a Grooming",
      "target": "_self"
    },
    "ctaButtonStyle": "primary",
    "full_width": true,
    "sticky": true,
    "transparent_on_hero": false,
    "color_scheme": "standard-primary"
  }
}
```

**Differentiation:** Standard scheme, sticky, NOT transparent on hero (clean separation), phone in nav bar, primary CTA. The sticky non-transparent header gives a clean, app-like feel suited to a service business. Different from petalry (transparent, address by logo), formline (transparent, non-sticky, secondary CTA), inkwell (dark, centered nav).

---

## Footer Configuration

```json
{
  "settings": {
    "copyright": "\u00a9 2026 Pawlish Pet Spa. All rights reserved.",
    "color_scheme": "highlight-primary"
  },
  "blocks": {
    "logo": {
      "type": "logo_text",
      "settings": {
        "logo_text": "Pawlish",
        "text": "<p>Professional pet grooming for dogs and cats. By appointment.</p>"
      }
    },
    "contact": {
      "type": "text_block",
      "settings": {
        "title": "Contact",
        "text": "<p>(555) 926-3400<br>hello@pawlish.co<br>210 Birch Lane<br>Madison, WI 53703</p>"
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
| 1 | Hero | `split-hero` | standard-secondary | Image right (happy groomed dog), no overlay. Blocks: text (sm, uppercase, muted: "Professional Pet Grooming") > heading (4xl: "Happy Pets, Happy People") > text (base) > button (primary "Book a Grooming" + secondary "Our Services"). `top_spacing: none` |
| 2 | Trust Strip | `trust-bar` | standard-primary | 4 items: Certified Groomers, Fear-Free Handling, All Breeds Welcome, Organic Products. icon_style: filled, icon_shape: circle, alignment: centered. `top_spacing: small` |
| 3 | Services Preview | `icon-card-grid` | standard-secondary | 4 cards, grid, 4 columns, flat layout, center-aligned. Bath & Brush, Full Groom, Spa Package, Cat Grooming. No button_link. eyebrow: "What We Do", title: "Our Services" |
| 4 | Before/After | `comparison-slider` | standard-primary | Horizontal, initial_position: 30 (mostly showing the "before" to create curiosity). before_label: "Before", after_label: "After". eyebrow: "See the Difference", title: "Grooming Transformations" |
| 5 | Testimonials | `testimonial-slider` | highlight-primary | 4 quotes from pet owners. autoplay: true, autoplay_speed: 5000 |
| 6 | Gallery Preview | `gallery` | standard-primary | 8 images, grid, 4 columns, aspect_ratio: 1/1, staggered: false. Happy groomed pets. eyebrow: "Our Work", title: "Fresh & Fluffy" |
| 7 | CTA | `action-bar` | highlight-primary | "Ready for a Fresh Look?" with "Book a Grooming" button. `fullwidth: false` |

### Services (`services`)

| # | Widget | Type | Color Scheme | Key Details |
|---|--------|------|-------------|-------------|
| 1 | Page Banner | `banner` | highlight-primary | Small height, center-aligned. "Our Services" + subtitle. `top_spacing: none`, `bottom_spacing: small` |
| 2 | Dog Grooming | `priced-list` | standard-primary | eyebrow: "Dogs", title: "Dog Grooming", layout: two-column, heading_alignment: center. 5 items by size: Small Dog Bath ($35), Small Dog Full Groom ($55), Medium Dog Bath ($45), Medium Dog Full Groom ($65), Large Dog Full Groom ($85). `bottom_spacing: none` |
| 3 | Cat Grooming | `priced-list` | standard-secondary | eyebrow: "Cats", title: "Cat Grooming", layout: single-column, heading_alignment: center. 3 items: Cat Bath & Brush ($45), Cat Full Groom ($65), Lion Cut ($75). `top_spacing: none` |
| 4 | What's Included | `icon-list` | highlight-primary | 6 items, grid, 3 columns, icon_style: filled, icon_size: lg, icon_shape: rounded. Ear Cleaning, Nail Trimming, Teeth Brushing, Anal Gland Expression, Blueberry Facial, De-Shedding Treatment. Each with description. eyebrow: "Every Visit Includes", heading_alignment: center |
| 5 | Our Process | `numbered-cards` | standard-primary | 4 cards, grid. Check In, Bath & Dry, Style & Finish, Happy Pickup. eyebrow: "How It Works", heading_alignment: center |
| 6 | FAQ | `accordion` | standard-secondary | 5 items about appointments, first visits, nervous pets, timing, products. Sidebar with `info` block: "Questions?" + phone/email. sidebar_position: right, heading_alignment: left, style: separated |

### Gallery (`gallery`)

| # | Widget | Type | Color Scheme | Key Details |
|---|--------|------|-------------|-------------|
| 1 | Page Banner | `rich-text` | highlight-primary | heading (4xl: "Gallery"), text (base). text_alignment: center, content_width: medium. `top_spacing: none` |
| 2 | Before/After | `comparison-slider` | standard-primary | Horizontal, initial_position: 40. before_label: "Before", after_label: "After". title: "The Pawlish Difference" |
| 3 | Groomed Pets | `gallery` | standard-secondary | 12 images, grid, 4 columns, aspect_ratio: 1/1, staggered: false. Square pet portraits with captions. eyebrow: "Fresh & Fluffy", title: "Happy Customers", heading_alignment: center |
| 4 | Testimonials | `testimonial-slider` | highlight-primary | 3 quotes. autoplay: true, autoplay_speed: 6000 |

### About (`about`)

| # | Widget | Type | Color Scheme | Key Details |
|---|--------|------|-------------|-------------|
| 1 | Story | `split-hero` | highlight-primary | Image left (team in shop), overlay: rgba(0,0,0,0.15). Blocks: text (sm, uppercase, muted: "Since 2020") > heading (3xl: "Every Pet Deserves to Feel Great") > text (base: story paragraph) > button (secondary "Book a Grooming"). `top_spacing: none` |
| 2 | Team | `profile-grid` | standard-primary | 3 profiles, 3 columns: Lead Groomer/Owner, Senior Groomer, Junior Groomer. Each with photo, name, role, specialty, bio. eyebrow: "The Team", heading_alignment: center |
| 3 | Safety | `icon-card-grid` | standard-secondary | 3 cards, flat layout, 3 columns. Fear-Free Certified, Organic Products, Clean Facility. No button_link. title: "Your Pet's Safety", heading_alignment: center |
| 4 | FAQ | `accordion` | highlight-primary | 4 items about the team, certifications, products, facility. style: connected, heading_alignment: center. No sidebar |

### Contact (`contact`)

| # | Widget | Type | Color Scheme | Key Details |
|---|--------|------|-------------|-------------|
| 1 | Page Banner | `banner` | highlight-primary | Small height, center-aligned. "Book a Grooming" + "Call us or stop by to schedule your pet's next appointment." `top_spacing: none`, `bottom_spacing: small` |
| 2 | Hours | `schedule-table` | standard-primary | 6 day blocks (Mon-Sat, Sun closed), heading_alignment: left, sidebar_position: right, week_start_day: "1", note: "Last appointment at 4pm". Sidebar info block: "Book Now" + phone/email. Sidebar social block. title: "Grooming Hours", eyebrow: "By Appointment" |
| 3 | Booking FAQ | `accordion` | standard-secondary | 5 items about booking, cancellation, what to bring, drop-off/pickup, first visit. Sidebar with `info` block: "Ready to Book?" + phone. sidebar_position: right, heading_alignment: left, style: separated |
| 4 | Find Us | `map` | standard-primary | address: "210 Birch Lane, Madison, WI 53703". height: medium, sidebar_position: right. Sidebar info block with parking info |

---

## Menus

**main-menu.json:**
- Services → `services.html`
- Gallery → `gallery.html`
- About → `about.html`
- Contact → `contact.html`

**footer-menu.json:**
- Services → `services.html`
- Gallery → `gallery.html`
- About → `about.html`
- Contact → `contact.html`

---

## Widget Usage Summary

| Widget Type | Count |
|------------|-------|
| `split-hero` | 2 |
| `trust-bar` | 1 |
| `icon-card-grid` | 2 |
| `comparison-slider` | 2 |
| `testimonial-slider` | 2 |
| `gallery` | 2 |
| `action-bar` | 1 |
| `banner` | 2 |
| `priced-list` | 2 |
| `icon-list` | 1 |
| `numbered-cards` | 1 |
| `accordion` | 3 |
| `rich-text` | 1 |
| `profile-grid` | 1 |
| `schedule-table` | 1 |
| `contact-details` | 0 |
| `map` | 1 |

**16 unique widget types across 5 pages.**

---

## Header Differentiation Notes

- **Sticky, non-transparent** — clean separation, app-like feel for service booking
- **Phone in nav bar** (`contact_position: menu`) — prominent without taking logo space
- **Primary CTA** ("Book a Grooming") — conversion-focused
- No address in header — keeps it clean, address is in footer and contact page
