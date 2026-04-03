# Saffron — Restaurant Preset Plan

## Identity

**Name:** Saffron
**Industry:** Upscale-casual restaurant
**Personality:** Warm, intimate, ingredient-driven. Evening dining with a seasonal focus. Not stuffy — the kind of place where the chef comes out to talk to guests.

---

## preset.json

### Colors

A deep navy + warm gold palette. NOT the terracotta/brown palette from the first attempt — that was too predictable for a restaurant. Saffron is named after a spice that's gold, so lean into that.

```json
"standard_bg_primary": "#fafaf8",
"standard_bg_secondary": "#f0ede6",
"standard_text_heading": "#1a1c2b",
"standard_text_content": "#3a3c4a",
"standard_text_muted": "#7a7c88",
"standard_border_color": "#dddbe0",
"standard_accent": "#b8860b",
"standard_accent_text": "#ffffff",
"standard_rating_star": "#d4a017",
"highlight_bg_primary": "#1a1c2b",
"highlight_bg_secondary": "#111220",
"highlight_text_heading": "#ffffff",
"highlight_text_content": "#c8c6d0",
"highlight_text_muted": "#8a889a",
"highlight_border_color": "#3a3c4a",
"highlight_accent": "#d4a843",
"highlight_accent_text": "#1a1c2b",
"highlight_rating_star": "#d4a017"
```

Rationale: Deep navy highlight gives an elegant evening feel. Gold accent nods to saffron the spice. The standard palette has a cool-warm balance — not the generic warm brown every restaurant uses.

### Typography

```json
"heading_font": { "stack": "\"Playfair Display\", serif", "weight": 700 },
"body_font": { "stack": "\"Source Sans 3\", sans-serif", "weight": 400 }
```

Playfair Display for editorial elegance. Source Sans 3 for clean readability — more refined than Lato.

### Style

```json
"corner_style": "slightly-rounded",
"spacing_density": "default",
"button_shape": "auto"
```

---

## Header

```json
{
  "type": "header",
  "settings": {
    "logoText": "Saffron",
    "contactDetailsLine1": "(555) 234-5678",
    "contactDetailsLine2": "247 Elm Street, Brooklyn",
    "contact_position": "logo",
    "ctaButtonLink": {
      "href": "contact.html",
      "text": "Reserve a Table",
      "target": "_self"
    },
    "ctaButtonStyle": "primary",
    "full_width": true,
    "sticky": true,
    "transparent_on_hero": true,
    "color_scheme": "standard"
  }
}
```

**What's different:** Sticky + transparent on hero. Contact details visible next to logo (professional restaurant with phone + address in header). Primary CTA button for bold reservation action.

---

## Footer

```json
{
  "type": "footer",
  "settings": {
    "copyright": "© 2024 Saffron Restaurant. All rights reserved.",
    "color_scheme": "highlight"
  }
}
```

Blocks: logo_text (short about), text_block (opening hours), menu_block (navigation), social_block.

---

## Pages (6 pages)

### Page 1: Home (`index.json`)

| # | Widget | Type | Color Scheme | Key Config |
|---|--------|------|-------------|------------|
| 1 | Hero | `banner` | `highlight` | Large height, center aligned, overlay `#1a1c2bcc`. Heading "Farm to Table, Heart to Plate" (6xl), text, dual buttons (View Our Menu + Reserve a Table) |
| 2 | Intro | `split-content` | `standard` | Balance: `equal`. Left: eyebrow "Our Story" (sm, uppercase, muted) + heading "A Celebration of Local Flavors" (5xl). Right: text paragraph + "About Us" secondary button |
| 3 | Featured dishes | `priced-list` | `standard-accent` | Eyebrow "From the Kitchen", title "Seasonal Highlights", heading_alignment `center`, single-column. 4 items with names, descriptions, prices |
| 4 | Experience | `image-callout` | `standard` | Image right. Heading "An Experience Worth Savoring" (3xl), text about the space, features list (open kitchen, candlelit tables, curated wine list), "Book a Table" button |
| 5 | Testimonials | `testimonials` | `standard` | 3 quotes, grid, 3 columns, `flat` cards. Real-feeling reviews |
| 6 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Heading "Ready for an Unforgettable Evening?" (3xl), dual buttons |

### Page 2: Menu (`menu.json`)

| # | Widget | Type | Color Scheme | Key Config |
|---|--------|------|-------------|------------|
| 1 | Hero | `banner` | `highlight` | Small height, center. "Our Menu" (5xl), subtitle text |
| 2 | Starters | `priced-list` | `standard` | Eyebrow "To Begin", title "Starters", heading_alignment `left`, single-column. 5 items |
| 3 | Mains | `priced-list` | `standard-accent` | Eyebrow "Main Course", title "Entrées", heading_alignment `left`, two-column. 8 items |
| 4 | Desserts | `priced-list` | `standard` | Eyebrow "To Finish", title "Desserts", heading_alignment `left`, single-column. 4 items |
| 5 | Drinks | `image-text` | `standard` | Image left. Eyebrow "The Bar", heading "Curated Wine & Cocktails" (3xl), text about the bar program, "Ask About Pairings" secondary button |
| 6 | CTA | `action-bar` | `highlight` | `fullwidth: true`. Heading "Join Us Tonight" (2xl), single "Reserve a Table" button |

### Page 3: Gallery (`gallery.json`)

| # | Widget | Type | Color Scheme | Key Config |
|---|--------|------|-------------|------------|
| 1 | Hero | `banner` | `highlight` | Small height, center. "Gallery" (5xl), subtitle |
| 2 | Food gallery | `masonry-gallery` | `standard` | Eyebrow "The Food", title "From Our Kitchen", 3 columns, medium gap. 6 items with dish names + categories (Seasonal/Signature/Dessert/Bar) |
| 3 | Space gallery | `gallery` | `standard-accent` | Eyebrow "The Space", title "Inside Saffron", grid, 3 columns, staggered, aspect_ratio `4 / 3`. 6 images with captions |
| 4 | Private events | `image-callout` | `standard` | Image left. Heading "Host Your Next Gathering" (3xl), text about private dining, features (dedicated menu, flexible seating, sommelier service), "Inquire About Events" button |

### Page 4: About (`about.json`)

| # | Widget | Type | Color Scheme | Key Config |
|---|--------|------|-------------|------------|
| 1 | Hero | `banner` | `highlight` | Small height, center. "Our Story" (5xl), subtitle |
| 2 | Founders | `image-text` | `standard` | Image right. Eyebrow "The Founders", heading "Marco & Elena Reyes" (3xl), text about their journey, "Meet the Team" secondary button |
| 3 | Philosophy | `image-callout` | `standard-accent` | Image left. Heading "Our Philosophy" (3xl), text about sourcing, features list (local farms, seasonal rotations, zero-waste, house-made everything) |
| 4 | Stats | `key-figures` | `standard` | 4 figures, 4 columns, `flat`, animate. "12+" Years Open, "40" Local Farm Partners, "850+" Wines Tasted, "4.8" Average Rating |
| 5 | Team | `profile-grid` | `standard` | Eyebrow "The Team", title "The People Behind Saffron", 3 columns, grid. 3 profiles: Marco (Chef), Elena (GM), Aisha (Pastry Chef) with roles, specialties, bios |
| 6 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Heading "Come Taste the Difference" (3xl), single button |

### Page 5: Contact (`contact.json`)

| # | Widget | Type | Color Scheme | Key Config |
|---|--------|------|-------------|------------|
| 1 | Intro | `rich-text` | `standard` | Center aligned, `medium` width. Heading "Visit Saffron" (5xl), paragraph with invitation |
| 2 | Map | `map` | `standard` | Address "247 Elm Street, Brooklyn, NY 11201", medium height, show_address true, sidebar_position `left`. 3 info blocks: Phone, Email, Hours |
| 3 | FAQ | `accordion` | `standard-accent` | Eyebrow "Questions", title "Before You Visit", style `separated`, heading_alignment `center`. 4 items: reservations, dress code, parking, private events |

### Page 6: Reservations (`reservations.json`)

| # | Widget | Type | Color Scheme | Key Config |
|---|--------|------|-------------|------------|
| 1 | Intro | `rich-text` | `standard` | Center aligned, `medium` width. Heading "Reserve a Table" (5xl), text explaining booking options |
| 2 | Details | `split-content` | `standard-accent` | Balance `equal`. Left: heading "Walk-ins Welcome" (3xl) + text about walk-in policy. Right: heading "Large Parties" (3xl) + text about groups 6+ + features (dedicated menu planning, flexible seating, wine pairing available) |
| 3 | Hours | `card-grid` | `standard` | Eyebrow "When to Visit", title "Opening Hours", heading_alignment `center`, 3 columns, `box` cards, alignment `center`. 3 cards: "Weeknight Dinner" (Mon-Thu 5-10 PM), "Weekend Dinner" (Fri-Sat 5-11 PM), "Brunch & Dinner" (Sun brunch 10-3, dinner 5-9) |
| 4 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Heading "Call to Reserve" (2xl) + text "(555) 234-5678" (base, muted) + "Email Us" button linking to mailto |

---

## Menus

**main-menu.json:** Home, Menu, Gallery, About, Reservations, Contact

**footer-menu.json:** Home, Menu, Gallery, About, Reservations, Contact

---

## Widget Usage Summary

Total unique widget types used: **13** (of 50 available)
- `banner` (4x — heroes)
- `split-content` (2x — home intro, reservations details)
- `priced-list` (3x — starters, mains, desserts)
- `image-callout` (2x — experience, private events)
- `image-text` (2x — drinks, founders)
- `testimonials` (1x)
- `action-bar` (3x — mix of fullwidth true/false)
- `masonry-gallery` (1x)
- `gallery` (1x)
- `profile-grid` (1x)
- `key-figures` (1x)
- `rich-text` (2x)
- `map` (1x)
- `accordion` (1x)
- `card-grid` (1x — opening hours on reservations page)

## Header Differentiation Notes

- Sticky + transparent on hero = immersive experience (hero image visible behind header)
- Contact details next to logo = professional, phone-accessible
- Primary CTA style = bold gold "Reserve a Table" button
- This is a distinct config — no other preset should use sticky + transparent + contact at logo + primary CTA in combination
