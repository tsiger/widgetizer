# Crumbly — Bakery Preset Plan

## Identity

**Name:** Crumbly
**Industry:** Artisan neighborhood bakery
**Personality:** Handcrafted, warm, flour-dusted. A family bakery with a sourdough starter older than most of its customers. Not precious — hearty, generous, and a little messy in the best way.

---

## Step 1: Global Settings Review

Overriding all 18 color tokens, both fonts, heading_scale, and all 3 style settings.

## Step 2: Header & Footer — see dedicated sections below

## Step 3: Widget Selection — see page plans below

## Step 4: Page Structure

A bakery is NOT a restaurant. Key differences:
- No reservations — it's walk-in only
- **Custom Cakes** is a major revenue driver and needs its own page
- A gallery page makes sense (people love bakery photos)
- The menu is structured by category (bread, pastries, cakes, cookies) not by course

**Pages (6):**
1. Home (`index.json`)
2. Menu (`menu.json`) — "What We Bake"
3. Custom Cakes (`custom-cakes.json`) — dedicated page for cake orders
4. Gallery (`gallery.json`)
5. About (`about.json`)
6. Contact (`contact.json`)

## Step 5: Color Palette

Dusty plum + warm cream. NOT brown/terracotta (Saffron) or green (Brewline). Plum is unexpected for a bakery — it's warm, artisanal, and distinctive without being cliché.

```json
"standard_bg_primary": "#faf8f5",
"standard_bg_secondary": "#f0ebe4",
"standard_text_heading": "#2e1f2e",
"standard_text_content": "#4a3d4a",
"standard_text_muted": "#8a7d8a",
"standard_border_color": "#ddd5dd",
"standard_accent": "#7b4a6e",
"standard_accent_text": "#ffffff",
"standard_rating_star": "#d4a017",
"highlight_bg_primary": "#2e1f2e",
"highlight_bg_secondary": "#1e1220",
"highlight_text_heading": "#ffffff",
"highlight_text_content": "#ddd0dd",
"highlight_text_muted": "#9a8d9a",
"highlight_border_color": "#4a3d4a",
"highlight_accent": "#c9a0bb",
"highlight_accent_text": "#2e1f2e",
"highlight_rating_star": "#d4a017"
```

Rationale: Dusty plum accent (`#7b4a6e`) is completely unique — no other preset uses purple/plum. Highlight is deep plum-charcoal, not navy or brown. The standard bg has a warm off-white that feels like parchment/flour.

### Typography

```json
"heading_font": { "stack": "\"Fraunces\", serif", "weight": 600 },
"body_font": { "stack": "\"Nunito Sans\", sans-serif", "weight": 400 }
```

Fraunces for quirky warmth (slightly irregular letterforms feel handcrafted). Nunito Sans for soft, rounded readability. Neither used in Saffron or Brewline.

### Style

```json
"corner_style": "rounded",
"spacing_density": "default",
"button_shape": "auto"
```

Rounded corners = warm, approachable. Auto button shape follows rounded (not pill like Brewline, not sharp like Saffron's slightly-rounded).

---

## Header

```json
{
  "type": "header",
  "settings": {
    "logoText": "Crumbly",
    "contactDetailsLine1": "Open Tue–Sun, 7 AM",
    "contactDetailsLine2": "",
    "contact_position": "menu",
    "ctaButtonLink": {
      "href": "custom-cakes.html",
      "text": "Order a Cake",
      "target": "_self"
    },
    "ctaButtonStyle": "primary",
    "center_nav": false,
    "full_width": true,
    "sticky": true,
    "transparent_on_hero": false,
    "color_scheme": "standard"
  }
}
```

**What's different from Saffron & Brewline:**
- Contact in the `menu` area (Saffron: `logo`, Brewline: no contact) — just hours, single line
- CTA points to Custom Cakes page (not contact or menu) — drives cake orders
- Primary CTA style (like Saffron, but different target)
- Sticky but NOT transparent (Saffron: sticky + transparent, Brewline: neither)
- Not centered nav (Brewline was centered)

---

## Footer

```json
{
  "type": "footer",
  "settings": {
    "copyright": "© 2026 Crumbly Bakery. All rights reserved.",
    "color_scheme": "highlight"
  }
}
```

Blocks: logo_text (about paragraph), text_block (Bakery Hours with Tue-Sun schedule + Monday Closed), menu_block (Explore), social_block (Follow Us).

---

## Page Plans

### Page 1: Home (`index.json`) — 7 widgets

| # | Widget | Type | Color Scheme | Key Config |
|---|--------|------|-------------|------------|
| 1 | Hero | `slideshow` | per-slide: `highlight` | 2 slides. Slide 1: "Baked Fresh Every Morning" (5xl), subtitle, "See Our Menu" primary + "Order a Cake" secondary. Slide 2: "Custom Cakes for Every Occasion", subtitle, "Start Your Order" primary. Autoplay true, 5000ms, large height, center. `top_spacing: "none"`. **New hero type — neither Saffron nor Brewline used slideshow.** |
| 2 | Trust strip | `trust-bar` | `standard-accent` | 3 items: "Baked Daily" (clock), "Real Ingredients" (leaf), "Made With Love" (heart). Alignment `centered`, icon_style `plain`, icon_shape `rounded`. |
| 3 | Categories | `sliding-panels` | `standard` | Eyebrow "What We Bake", title "From the Oven". 4 panels: Sourdough & Bread, Pastries, Cakes & Celebrations, Cookies & Treats. Each with subtitle + link to menu page. **New widget — not in Saffron or Brewline.** |
| 4 | Custom cakes teaser | `image-callout` | `standard-accent` | Image left. Heading "Dream It, We'll Bake It" (3xl), text about custom cakes, features (any size, any flavor, 72-hour notice), "Start Your Order" primary button → custom-cakes.html |
| 5 | Testimonial | `testimonial-hero` | `standard` | Image left. Big quote from a wedding cake customer. Name + attribution. **New widget — not in Saffron or Brewline.** |
| 6 | Instagram/bakes | `project-showcase` | `standard` | Eyebrow "From the Oven", title "Recent Bakes", 4 columns, aspect_ratio `1 / 1`, text_display `hover`. 4-6 items (pastries, breads, cakes). **New widget — not in Saffron or Brewline.** |
| 7 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Heading "Smells Better in Person" (2xl), text "Open Tuesday–Sunday from 7 AM" (base, muted), "Find the Bakery" button → contact.html |

### Page 2: Menu (`menu.json`) — 6 widgets

| # | Widget | Type | Color Scheme | Key Config |
|---|--------|------|-------------|------------|
| 1 | Hero | `banner` | `highlight` | Small height, center. "What We Bake" (5xl), subtitle. `top_spacing: "none"` |
| 2 | Bread | `priced-list` | `standard` | Eyebrow "The Foundation", title "Bread & Sourdough", heading_alignment `left`, single-column. 5 items |
| 3 | Pastries | `priced-list` | `standard-accent` | Eyebrow "Morning Favorites", title "Pastries & Viennoiserie", heading_alignment `left`, two-column. 6 items |
| 4 | Cakes | `priced-list` | `standard` | Eyebrow "Celebrations", title "Cakes & Tarts", heading_alignment `left`, single-column. 4 items (including "Custom Celebration Cake — From $65") |
| 5 | Cookies | `priced-list` | `standard-accent` | Eyebrow "Sweet Treats", title "Cookies & Bars", heading_alignment `left`, two-column. 4 items |
| 6 | Custom CTA | `image-text` | `standard` | Image left. Eyebrow "Made for You", heading "Custom Orders & Catering" (3xl), text about custom work + 72-hour notice, "Place a Custom Order" primary button → custom-cakes.html |

### Page 3: Custom Cakes (`custom-cakes.json`) — 5 widgets

| # | Widget | Type | Color Scheme | Key Config |
|---|--------|------|-------------|------------|
| 1 | Hero | `banner` | `highlight` | Small height, center. "Custom Cakes" (5xl), subtitle "Birthdays, weddings, and everything in between." `top_spacing: "none"` |
| 2 | How it works | `numbered-cards` | `standard` | Eyebrow "How It Works", title "From Your Idea to Your Table", 4 columns, flat, center. 4 steps: Tell Us Your Vision, We Design Together, We Bake It Fresh, Pick Up or Delivery. **New widget.** |
| 3 | Options | `comparison-table` | `standard-accent` | Eyebrow "Sizes & Pricing", title "Choose Your Cake". 3 columns: Small (6-8 servings), Medium (12-16), Large (24-30). Features: starting price, layers, flavors, custom decoration, delivery, turnaround. **New widget — not in Saffron or Brewline.** |
| 4 | Gallery | `gallery` | `standard` | Eyebrow "Inspiration", title "Cakes We've Made", carousel, 3 columns, aspect_ratio `3 / 4` (portrait — cakes look best tall). 6 images. |
| 5 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Heading "Ready to Order?" (2xl), text "Email us or call — we usually respond within a few hours." (base, muted), "Get in Touch" button → contact.html |

### Page 4: Gallery (`gallery.json`) — 4 widgets

| # | Widget | Type | Color Scheme | Key Config |
|---|--------|------|-------------|------------|
| 1 | Hero | `banner` | `highlight` | Small height, center. "Gallery" (5xl), subtitle. `top_spacing: "none"` |
| 2 | Bakes | `bento-grid` | `standard` | Eyebrow "From the Oven", title "Our Bakes". 5-6 items: hero image (col_span 2, row_span 2) of signature sourdough, plus smaller tiles of pastries, cakes, cookies. **New widget — not in Saffron or Brewline.** |
| 3 | The bakery | `gallery` | `standard-accent` | Eyebrow "The Bakery", title "Behind the Counter", grid, 3 columns, staggered, aspect_ratio `4 / 3`. 6 images of the bakery interior/process. |
| 4 | Events | `event-list` | `standard` | Eyebrow "Coming Up", title "Classes & Events". 3 events: Sourdough Workshop, Kids Decorating Class, Seasonal Pie Night. **New widget — not in Saffron or Brewline.** |

### Page 5: About (`about.json`) — 6 widgets

| # | Widget | Type | Color Scheme | Key Config |
|---|--------|------|-------------|------------|
| 1 | Hero | `banner` | `highlight` | Small height, center. "Our Story" (5xl), subtitle. `top_spacing: "none"` |
| 2 | Origin | `image-text` | `standard` | Image right. Eyebrow "How It Started", heading "It Started With a Sourdough Starter" (3xl), text about Nina Kowalski and her grandmother's starter. |
| 3 | Values | `features-split` | `standard-accent` | Eyebrow "What We Believe", title "The Crumbly Way", show_divider true, icon_style `outline`, icon_shape `rounded`. 3 features: Slow Is Better (clock), Know Your Ingredients (leaf), Feed Your Neighbors (users). **New widget — not in Saffron or Brewline.** |
| 4 | Stats | `key-figures` | `standard` | 4 columns, flat, animate. "14" Years Baking, "200+" Loaves Per Week, "1" Sourdough Starter, "4.9" Google Rating |
| 5 | Team | `profile-grid` | `standard-accent` | Eyebrow "The Bakers", title "The Hands Behind the Bread", 3 columns. Nina (Founder/Head Baker), Jordan (Pastry Chef), Priya (Cake Decorator). With roles, specialties, bios. |
| 6 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Heading "Come Smell the Bread" (2xl), "Find the Bakery" button → contact.html |

### Page 6: Contact (`contact.json`) — 3 widgets

| # | Widget | Type | Color Scheme | Key Config |
|---|--------|------|-------------|------------|
| 1 | Intro | `rich-text` | `standard` | Center, `medium` width. Heading "Visit the Bakery" (5xl), text with address + invitation |
| 2 | Map | `map` | `standard` | Title `""` (suppressed — intro above handles it). Address "58 Maple Avenue, Asheville, NC 28801", medium height, show_address true, sidebar_position `left`. 3 info blocks: Phone, Email, Hours. |
| 3 | Custom orders CTA | `image-callout` | `standard-accent` | Image right. Heading "Custom Cake Inquiries" (3xl), text about ordering process + 72-hour notice, "Email Us About a Cake" button → mailto |

---

## Menus

**main-menu.json:** Home, Menu, Custom Cakes, Gallery, About, Contact (6 items)

**footer-menu.json:** Home, Menu, Custom Cakes, Gallery, About, Contact

---

## Widget Usage Summary

Total unique widget types used: **16** (of 50 available)

| Widget | Count | In Saffron? | In Brewline? |
|--------|-------|-------------|--------------|
| `slideshow` | 1x | No | No |
| `trust-bar` | 1x | No | No |
| `sliding-panels` | 1x | No | No |
| `image-callout` | 2x | Yes | Yes |
| `testimonial-hero` | 1x | No | No |
| `project-showcase` | 1x | No | No |
| `banner` | 4x | Yes | Yes |
| `priced-list` | 4x | Yes | Yes |
| `numbered-cards` | 1x | No | No |
| `comparison-table` | 1x | No | No |
| `gallery` | 2x | Yes | Yes |
| `bento-grid` | 1x | No | No |
| `event-list` | 1x | No | No |
| `features-split` | 1x | No | No |
| `image-text` | 2x | Yes | Yes |
| `key-figures` | 1x | Yes | Yes |
| `profile-grid` | 1x | Yes | No |
| `action-bar` | 3x | Yes | Yes |
| `rich-text` | 1x | Yes | Yes |
| `map` | 1x | Yes | Yes |

**9 widgets completely new** (not in either Saffron or Brewline): `slideshow`, `sliding-panels`, `testimonial-hero`, `project-showcase`, `numbered-cards`, `comparison-table`, `bento-grid`, `event-list`, `features-split`

## Differentiation from Saffron & Brewline

| Aspect | Saffron | Brewline | Crumbly |
|--------|---------|----------|---------|
| Accent | Dark gold `#b8860b` | Sage green `#2d6a4f` | Dusty plum `#7b4a6e` |
| Highlight bg | Deep navy `#1a1c2b` | Near-black `#1a1a1a` | Deep plum `#2e1f2e` |
| Standard bg | Warm cream `#fafaf8` | Pure white `#ffffff` | Parchment `#faf8f5` |
| Heading font | Playfair Display 700 | Lora 600 | Fraunces 600 |
| Body font | Source Sans 3 400 | DM Sans 400 | Nunito Sans 400 |
| Corners | slightly-rounded | rounded | rounded |
| Buttons | auto | pill | auto |
| Header contact | At logo (phone + address) | None | At menu (hours only) |
| Header CTA target | Reservations | Menu | Custom Cakes |
| Header sticky/transparent | Both | Neither | Sticky only |
| Home hero | banner | split-hero | slideshow |
| Unique page | Reservations | — | Custom Cakes |
| New widgets | — | split-hero, scrolling-text, image-tabs, steps, team-highlight, schedule-table | slideshow, sliding-panels, testimonial-hero, project-showcase, numbered-cards, comparison-table, bento-grid, event-list, features-split |

## Header Differentiation Notes

- Contact at `menu` position with hours only (single line) — compact, informational
- CTA drives to Custom Cakes (unique target — neither contact nor menu)
- Sticky but not transparent — bread-and-butter reliability
- No other preset should use menu-position contact + cake-order CTA in combination
