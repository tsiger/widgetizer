# Petalry — Flower Shop

## Identity

**Business name:** Petalry Flower Studio
**Industry:** Flower Shop / Florist
**Brand personality:** Warm, romantic, seasonally alive. Petalry is a neighborhood florist that does daily arrangements, weddings, event florals, and workshops. The site should feel like walking into a shop full of fresh blooms — soft colors, organic textures, and a sense of something living and temporary. Not precious or overly feminine — grounded in craft and seasonal rhythm.

---

## Industry Translation

A flower shop is a **seasonal, visual, event-driven** retail business. What matters:

1. **Visual impact** — flowers sell through beauty. The gallery is the most important section on the site. Every page should show arrangements.
2. **Priced offerings** — customers want to know what's available and what it costs. Bouquets, arrangements, and add-ons need a browsable price list.
3. **Seasonal urgency** — Valentine's Day, Mother's Day, weddings, holidays. A countdown creates anticipation for the next ordering deadline.
4. **Events and workshops** — many florists run wreath-making classes, arrangement workshops, seasonal pop-ups. An event list drives registrations.
5. **Ordering flow** — walk-ins, phone orders, and online inquiries. The site should make it easy to reach the shop and understand the ordering process.

### Pages this business needs

| Page | Slug | Purpose |
|------|------|---------|
| Home | `index` | Showcase arrangements, seasonal urgency, trust signals |
| Shop | `shop` | Browsable priced bouquet/arrangement menu |
| Gallery | `gallery` | Full arrangement gallery — the visual portfolio |
| Workshops | `workshops` | Upcoming classes and events with registration |
| About | `about` | Story, team, sourcing philosophy |
| Contact | `contact` | Location, hours, ordering info, FAQ |

**6 pages.** A flower shop needs a dedicated Shop page (priced offerings — this is retail), a Gallery (visual proof), and a Workshops page (events are a real revenue stream, not an afterthought). This is more than the 5-page standard because the industry demands it.

---

## preset.json Settings

### Color Palette

A soft, garden-inspired palette. The standard palette is warm cream and sage. The highlight palette is deep forest green — like foliage in shade. The accent is a dusty rose that reads as floral without being cliché pink.

**Standard palette (light):**

| Token | Value | Rationale |
|-------|-------|-----------|
| `standard_bg_primary` | `#faf8f5` | Warm linen white — natural, not sterile |
| `standard_bg_secondary` | `#f2ede6` | Warm sand — like kraft paper wrapping |
| `standard_text_heading` | `#1f2118` | Near-black with green undertone — organic |
| `standard_text_content` | `#3d3f36` | Dark olive gray |
| `standard_text_muted` | `#6e7065` | Medium sage gray |
| `standard_border_color` | `#d4d1ca` | Warm neutral border |
| `standard_accent` | `#b5616a` | Dusty rose — floral, warm, unique across presets |
| `standard_accent_text` | `#ffffff` | White on rose — 4.6:1 contrast |
| `standard_rating_star` | `#d4a017` | Warm gold |

**Highlight palette (dark):**

| Token | Value | Rationale |
|-------|-------|-----------|
| `highlight_bg_primary` | `#1a2118` | Deep forest green — like dense foliage |
| `highlight_bg_secondary` | `#111610` | Darker shade |
| `highlight_text_heading` | `#f5f2ec` | Warm cream |
| `highlight_text_content` | `#a8a99f` | Light sage gray — 5.0:1 |
| `highlight_text_muted` | `#6e7065` | Medium sage |
| `highlight_border_color` | `#2a3126` | Dark green border |
| `highlight_accent` | `#d4828a` | Lighter rose for dark surfaces — 5.2:1 |
| `highlight_accent_text` | `#1a2118` | Dark on light accent |
| `highlight_rating_star` | `#d4a017` | Consistent gold |

### Typography

| Setting | Value | Rationale |
|---------|-------|-----------|
| `heading_font` | `{ "stack": "\"Lora\", serif", "weight": 600 }` | Classic, warm serif — romantic without being decorative. Used in brewline but at weight 400; weight 600 gives it a different character here. |
| `body_font` | `{ "stack": "\"Nunito\", sans-serif", "weight": 400 }` | Rounded, friendly sans — approachable and easy to read. Not used in any existing preset. |
| `heading_scale` | `100` | Standard |
| `body_scale` | `100` | Standard |

Wait — Lora is used by brewline. Let me pick a different serif.

| Setting | Value | Rationale |
|---------|-------|-----------|
| `heading_font` | `{ "stack": "\"Domine\", serif", "weight": 700 }` | Sturdy, warm serif with good weight options — feels grounded and botanical. Not used in any existing preset. |
| `body_font` | `{ "stack": "\"Nunito\", sans-serif", "weight": 400 }` | Rounded, friendly sans — approachable and easy to read. Not used in any existing preset. |
| `heading_scale` | `100` | Standard |
| `body_scale` | `100` | Standard |

### Style

| Setting | Value | Rationale |
|---------|-------|-----------|
| `corner_style` | `rounded` | Soft, organic edges — matches the natural/botanical brand. Same as brewline/stillpoint but different personality via color/typography. |
| `spacing_density` | `default` | Balanced — shop pages need density, gallery needs space |
| `button_shape` | `pill` | Fully rounded buttons — playful, inviting, matches the warm brand |

---

## Header Configuration

```json
{
  "settings": {
    "logoText": "Petalry",
    "contactDetailsLine1": "(555) 247-3100",
    "contactDetailsLine2": "124 Elm Street, Asheville, NC",
    "contact_position": "logo",
    "headerNavigation": "main-menu",
    "center_nav": false,
    "ctaButtonLink": {
      "href": "shop.html",
      "text": "Order Flowers",
      "target": "_self"
    },
    "ctaButtonStyle": "primary",
    "full_width": true,
    "sticky": false,
    "transparent_on_hero": true,
    "color_scheme": "standard-primary"
  }
}
```

**Differentiation:** Standard light scheme + transparent on hero + full contact details by logo (phone + address) + non-sticky + primary CTA pointing to Shop (not Contact — the conversion is ordering, not inquiring). Different from formline (secondary CTA, no address), inkwell (dark, centered nav, no contact).

---

## Footer Configuration

```json
{
  "settings": {
    "copyright": "\u00a9 2026 Petalry Flower Studio. All rights reserved.",
    "color_scheme": "highlight-primary"
  },
  "blocks": {
    "logo": {
      "type": "logo_text",
      "settings": {
        "logo_text": "Petalry",
        "text": "<p>Fresh flowers, hand-tied bouquets, and seasonal arrangements for every occasion.</p>"
      }
    },
    "contact": {
      "type": "text_block",
      "settings": {
        "title": "Visit Us",
        "text": "<p>124 Elm Street<br>Asheville, NC 28801<br>(555) 247-3100<br>hello@petalry.co</p>"
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
| 1 | Hero | `slideshow` | _(per-slide)_ | 3 slides: seasonal bouquet hero (highlight-primary), wedding florals (highlight-primary), workshop promo (highlight-secondary). Each with heading + text + button. `top_spacing: none` |
| 2 | Trust Strip | `trust-bar` | standard-secondary | 4 items: Same-Day Delivery, Locally Sourced, Hand-Tied Daily, Custom Orders. `top_spacing: small` |
| 3 | Seasonal Countdown | `countdown` | highlight-primary | "Mother's Day Orders" — target_date: "2027-05-11 00:00", style: cards, show_seconds: false, button: "Order Now" → shop.html. expired_message: "Mother's Day has passed — browse our everyday collection!" |
| 4 | Featured Arrangements | `card-grid` | standard-primary | 4 cards, grid, 4 columns, box layout. Best Sellers: Classic Bouquet, Garden Mix, Seasonal Vase, Dried Arrangement. Each with image, title, description. No button_link on cards (Shop is in the nav). eyebrow: "Popular Picks" |
| 5 | Gallery Preview | `gallery` | standard-secondary | 8 images, grid, 4 columns, aspect_ratio: 1/1, staggered: false. Square arrangement photos with captions. eyebrow: "Our Work", title: "Fresh from the Studio" |
| 6 | Upcoming Workshop | `event-list` | highlight-primary | 3 events: Spring Wreath Workshop, Hand-Tied Bouquet Class, Dried Flower Arranging. With dates, location, descriptions, "Register" buttons. eyebrow: "Learn With Us", title: "Upcoming Workshops" |
| 7 | Testimonials | `testimonial-slider` | standard-primary | 4 quotes from wedding clients and everyday customers. autoplay: true, autoplay_speed: 5000 |

**Page logic:** Slideshow hero (different from formline's banner and inkwell's banner — variety). Trust strip immediately. Countdown creates seasonal urgency — flower shops live and die by holiday ordering deadlines. Card grid shows best sellers. Gallery preview shows the visual range. Event list drives workshop registrations. Testimonials close. **No action-bar** — the slideshow CTAs and the countdown button are enough.

### Shop (`shop`)

| # | Widget | Type | Color Scheme | Key Details |
|---|--------|------|-------------|-------------|
| 1 | Page Banner | `banner` | highlight-primary | Small height, center-aligned, "Our Flowers" heading + "Hand-tied bouquets and arrangements, available for pickup or local delivery." `top_spacing: none`, `bottom_spacing: small` |
| 2 | Everyday Bouquets | `priced-list` | standard-primary | eyebrow: "Everyday", title: "Bouquets & Arrangements", layout: two-column, heading_alignment: center. 6 items: Classic Wrapped ($45), Garden Mix ($55), Seasonal Vase ($65), Petite Posy ($30), Statement Arrangement ($85), Dried Bouquet ($50). Each with description. `bottom_spacing: none` |
| 3 | Add-Ons | `priced-list` | standard-secondary | eyebrow: "Extras", title: "Add-Ons", layout: single-column, heading_alignment: center. 4 items: Greeting Card ($5), Chocolates ($15), Ceramic Vase Upgrade ($20), Weekly Delivery Subscription (from $160/mo). `top_spacing: none` |
| 4 | Custom & Events | `image-callout` | standard-primary | Image right, heading "Custom Orders & Events", text about weddings, events, and bespoke arrangements. Button: "Get in Touch" → contact.html |
| 5 | Ordering FAQ | `accordion` | standard-secondary | 5 items: How do I order, Do you deliver, Can I customize, How far in advance for weddings, What's your return policy. style: connected, heading_alignment: left. Sidebar with `info` block: "Need Help?" + phone/email. sidebar_position: right |

**Page logic:** Two stacked priced-lists (fused with none spacing) create a full menu feel — everyday bouquets in two-column for browsing, add-ons in single-column below. Image-callout for custom/event orders drives the higher-value inquiry. Accordion handles ordering questions with sidebar for immediate help.

### Gallery (`gallery`)

| # | Widget | Type | Color Scheme | Key Details |
|---|--------|------|-------------|-------------|
| 1 | Page Banner | `rich-text` | highlight-primary | heading (4xl: "Gallery"), text (base: "A collection of bouquets, arrangements, and event florals from our studio."). text_alignment: center, content_width: medium. `top_spacing: none` |
| 2 | Arrangement Gallery | `gallery` | standard-primary | 12 images, grid, 3 columns, aspect_ratio: 4/3, staggered: true. Each with caption (arrangement type). eyebrow: "Our Work", title: "Seasonal Arrangements", heading_alignment: left |
| 3 | Wedding Florals | `gallery` | standard-secondary | 8 images, grid, 4 columns, aspect_ratio: 1/1, staggered: false. Square wedding photos with captions. eyebrow: "Weddings", title: "Bridal & Event Florals", heading_alignment: center |
| 4 | Client Quote | `testimonial-slider` | highlight-primary | 3 quotes from wedding/event clients. autoplay: true, autoplay_speed: 6000 |

**Page logic:** Rich-text opener (variety from banners). Two gallery sections — staggered arrangements (organic, browsable) and square wedding grid (polished, uniform). Testimonials close with social proof from event clients. No action-bar.

### Workshops (`workshops`)

| # | Widget | Type | Color Scheme | Key Details |
|---|--------|------|-------------|-------------|
| 1 | Page Banner | `banner` | highlight-primary | Small height, center-aligned, "Workshops & Classes" heading + "Learn the art of floral arrangement in our hands-on studio sessions." `top_spacing: none`, `bottom_spacing: small` |
| 2 | Upcoming Events | `event-list` | standard-primary | 4 events with full details: Spring Wreath Workshop (May 3), Hand-Tied Bouquet Class (May 17), Dried Flower Arranging (Jun 7), Summer Centerpiece Workshop (Jun 21). Each with day, month, location ("Petalry Studio · 10am–12pm"), description, and "Register" button. eyebrow: "What's Coming", title: "Upcoming Workshops", heading_alignment: left |
| 3 | What to Expect | `split-content` | standard-secondary | balance: equal. Left: heading "What to Expect" + text about the workshop experience. Right: features ("+ All materials provided\n+ Take your creation home\n+ Complimentary refreshments\n+ Small groups of 8–12\n+ No experience needed\n+ Gift vouchers available") |
| 4 | Gallery | `gallery` | standard-primary | 6 images, carousel, columns_desktop: 3, aspect_ratio: 4/3, staggered: false. Workshop photos — people arranging flowers, finished pieces. eyebrow: "In the Studio", title: "Workshop Moments" |
| 5 | Gift Vouchers | `action-bar` | highlight-primary | "Give the Gift of Flowers" — "Workshop gift vouchers are available for all classes." Button: "Get in Touch" → contact.html. `fullwidth: false` |

**Page logic:** Event list is the core — upcoming workshops with dates, times, and registration. Split-content explains what attendees get. Carousel gallery shows real workshop moments. Action-bar drives gift voucher inquiries (legitimate CTA for this page).

### About (`about`)

| # | Widget | Type | Color Scheme | Key Details |
|---|--------|------|-------------|-------------|
| 1 | Studio Story | `split-hero` | highlight-primary | Image left (shop interior), overlay: rgba(0,0,0,0.15). Blocks: text (sm, uppercase, muted: "Since 2019") > heading (3xl: "Rooted in Asheville") > text (base: story paragraph about the studio, sourcing, and seasonal approach) > button (secondary "Visit the Shop" → contact.html). `top_spacing: none` |
| 2 | Team | `profile-grid` | standard-primary | 2 profiles, 2 columns: Founder/Lead Florist, Studio Manager. Each with photo, name, role, bio. eyebrow: "The Team", heading_alignment: center |
| 3 | Sourcing | `icon-card-grid` | standard-secondary | 3 cards, flat layout, 3 columns, icon_style: plain, icon_size: lg, icon_shape: circle. Locally Grown (leaf icon), Seasonal First (flower icon), Sustainable Practices (plant icon). No button_link. heading_alignment: center, title: "How We Source" |
| 4 | FAQ | `accordion` | standard-primary | 4 items about the business: Do you grow your own flowers, Where do you source from, Can I visit the studio, Do you do weddings outside Asheville. style: separated, heading_alignment: center. No sidebar — short list |

**Page logic:** Split-hero opener (different from home's slideshow). Team is small (2 people — realistic for a neighborhood florist). Icon cards communicate sourcing values. Accordion for studio questions. No action-bar — About doesn't need a hard sell.

### Contact (`contact`)

| # | Widget | Type | Color Scheme | Key Details |
|---|--------|------|-------------|-------------|
| 1 | Page Banner | `banner` | highlight-primary | Small height, center-aligned, "Get in Touch" heading + "Walk in, call, or send us a message." `top_spacing: none`, `bottom_spacing: small` |
| 2 | Contact Info | `contact-details` | standard-primary | 3 blocks: info (address, phone, email), text_block (hours: Tue–Sat 9am–6pm, Sun 10am–3pm, Closed Monday), social. heading_alignment: left |
| 3 | Ordering FAQ | `accordion` | standard-secondary | 5 items: How far in advance should I order, Do you deliver, What areas do you serve, Can I pick up same-day, Do you do weddings. Sidebar with `info` block: "Ready to Order?" + phone/email. sidebar_position: left, heading_alignment: left, style: connected |
| 4 | Find Us | `map` | standard-primary | address: "124 Elm Street, Asheville, NC 28801". height: medium, sidebar_position: right, heading_alignment: left. Sidebar info block with parking info |

**Page logic:** Banner, contact details, FAQ with left sidebar (variety from right-sidebar on other pages), map. Ends with map, not contact-details.

---

## Menus

**main-menu.json:**
- Shop → `shop.html`
- Gallery → `gallery.html`
- Workshops → `workshops.html`
- About → `about.html`
- Contact → `contact.html`

**footer-menu.json:**
- Shop → `shop.html`
- Gallery → `gallery.html`
- Workshops → `workshops.html`
- About → `about.html`
- Contact → `contact.html`

---

## Widget Usage Summary

| Widget Type | Count |
|------------|-------|
| `slideshow` | 1 |
| `trust-bar` | 1 |
| `countdown` | 1 |
| `card-grid` | 1 |
| `gallery` | 4 |
| `event-list` | 2 |
| `testimonial-slider` | 2 |
| `banner` | 3 |
| `priced-list` | 2 |
| `image-callout` | 1 |
| `accordion` | 3 |
| `rich-text` | 1 |
| `split-content` | 1 |
| `action-bar` | 1 |
| `split-hero` | 1 |
| `profile-grid` | 1 |
| `icon-card-grid` | 1 |
| `contact-details` | 1 |
| `map` | 1 |

**19 unique widget types across 6 pages.**

---

## Header Differentiation Notes

- **Standard light scheme** + transparent on hero — light header over slideshow
- **Full contact details** by logo (phone + address) — local retail shop wants to be found
- **Primary CTA pointing to Shop** (not Contact) — the conversion is ordering flowers
- **Non-sticky** — let the visual content breathe
- Different from formline (secondary CTA, no address), inkwell (dark, centered nav, no contact), sparkhaus (contact in menu bar)
