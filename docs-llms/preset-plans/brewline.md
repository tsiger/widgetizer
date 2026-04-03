# Brewline — Cafe / Coffee Shop Preset Plan

## Identity

**Name:** Brewline
**Industry:** Specialty coffee shop / roastery
**Personality:** Artisan, approachable, morning-energy. Third-wave coffee culture without the pretension. The kind of place that takes sourcing seriously but will happily make you a vanilla latte without judgment.

---

## preset.json

### Colors

Cool sage green + warm neutrals. NOT the same warm-brown territory as Saffron. The green says "natural, fresh, plant-based" without being cliché.

```json
"standard_bg_primary": "#ffffff",
"standard_bg_secondary": "#f4f1ec",
"standard_text_heading": "#1a1a1a",
"standard_text_content": "#3d3830",
"standard_text_muted": "#7a7368",
"standard_border_color": "#e4dfd8",
"standard_accent": "#2d6a4f",
"standard_accent_text": "#ffffff",
"standard_rating_star": "#e8a435",
"highlight_bg_primary": "#1a1a1a",
"highlight_bg_secondary": "#111111",
"highlight_text_heading": "#ffffff",
"highlight_text_content": "#d4cfc8",
"highlight_text_muted": "#8a847a",
"highlight_border_color": "#3a3a3a",
"highlight_accent": "#5eab8b",
"highlight_accent_text": "#1a1a1a",
"highlight_rating_star": "#e8a435"
```

Rationale: Clean white standard bg (not tinted like Saffron's cream). Near-black highlight (modern cafe aesthetic, not Saffron's deep navy). Sage green accent is completely different hue from Saffron's gold.

### Typography

```json
"heading_font": { "stack": "\"Lora\", serif", "weight": 600 },
"body_font": { "stack": "\"DM Sans\", sans-serif", "weight": 400 }
```

Lora for warm artisan feel (different from Saffron's Playfair Display — Lora is rounder, more contemporary). DM Sans for clean geometric body text (different from Saffron's Source Sans 3).

### Style

```json
"corner_style": "rounded",
"spacing_density": "default",
"button_shape": "pill"
```

Rounded + pill = friendly, modern cafe vibe. Distinct from Saffron's slightly-rounded + auto.

---

## Header

```json
{
  "type": "header",
  "settings": {
    "logoText": "Brewline",
    "contactDetailsLine1": "",
    "contactDetailsLine2": "",
    "contact_position": "logo",
    "ctaButtonLink": {
      "href": "menu.html",
      "text": "View Menu",
      "target": "_self"
    },
    "ctaButtonStyle": "secondary",
    "center_nav": true,
    "full_width": true,
    "sticky": false,
    "transparent_on_hero": false,
    "color_scheme": "standard"
  }
}
```

**What's different from Saffron:** No contact details in header (clean, minimal cafe look). Centered navigation (editorial feel). Secondary CTA style (subtle, not bold). NOT sticky, NOT transparent. CTA points to menu instead of reservations. Completely different personality from Saffron's professional restaurant header.

---

## Footer

```json
{
  "type": "footer",
  "settings": {
    "copyright": "© 2024 Brewline Coffee. All rights reserved.",
    "color_scheme": "highlight"
  }
}
```

Blocks: logo_text (short about), text_block (hours), menu_block (Explore), social_block (Follow Along).

---

## Pages (5 pages)

### Page 1: Home (`index.json`)

| # | Widget | Type | Color Scheme | Key Config |
|---|--------|------|-------------|------------|
| 1 | Hero | `split-hero` | `highlight` | Image right. Heading "Coffee Worth Waking Up For" (6xl), text, dual buttons (View Menu + Our Story). Different hero type from Saffron's banner |
| 2 | Marquee | `scrolling-text` | — | Text "Freshly Roasted · Single Origin · Pour Over · Espresso · Cold Brew · House-Made Pastries". bg_color `#2d6a4f`, text_color `#ffffff`, speed 8, rotate 0, top/bottom spacing `none`. Widget not used in Saffron |
| 3 | Intro | `image-callout` | `standard` | Image left. Heading "From Bean to Cup, Every Detail Matters" (3xl), text about sourcing, features (direct-trade, roasted weekly, brewing methods), "Learn About Our Process" secondary button |
| 4 | Drinks | `image-tabs` | `standard-accent` | Eyebrow "What We Brew", title "Find Your Cup", image_position `left`. 4 tabs: Espresso, Pour Over, Cold Brew, Seasonal Specials — each with description + image. Widget not used in Saffron |
| 5 | Testimonials | `testimonial-slider` | `standard` | Autoplay true, 6000ms. 3 quotes from regulars. Different widget type from Saffron's grid testimonials |
| 6 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Heading "Your Morning Ritual Starts Here" (2xl), dual buttons (See the Menu + Find Us) |

### Page 2: Menu (`menu.json`)

| # | Widget | Type | Color Scheme | Key Config |
|---|--------|------|-------------|------------|
| 1 | Hero | `banner` | `highlight` | Small height, center. "Our Menu" (5xl), subtitle |
| 2 | Coffee | `priced-list` | `standard` | Eyebrow "The Good Stuff", title "Coffee & Espresso", heading_alignment `left`, two-column. 8 items |
| 3 | Seasonal | `priced-list` | `standard-accent` | Eyebrow "Limited Time", title "Seasonal Specials", heading_alignment `left`, single-column. 3 items |
| 4 | Pastries | `priced-list` | `standard` | Eyebrow "Baked Fresh Daily", title "Pastries & Bites", heading_alignment `left`, two-column. 6 items |
| 5 | Retail | `image-text` | `standard` | Image right. Eyebrow "Take It Home", heading "Whole Bean & Retail" (3xl), text about bags/subscriptions, "Visit Us to Browse" secondary button |
| 6 | CTA | `action-bar` | `highlight` | `fullwidth: true`. Heading "See You Tomorrow Morning" (2xl), single "Find Us" button |

### Page 3: Gallery (`gallery.json`)

| # | Widget | Type | Color Scheme | Key Config |
|---|--------|------|-------------|------------|
| 1 | Hero | `banner` | `highlight` | Small height, center. "Gallery" (5xl), subtitle |
| 2 | Coffee gallery | `gallery` | `standard` | Eyebrow "The Coffee", title "Every Cup, a Small Work of Art", carousel layout, 3 columns, aspect_ratio `4 / 3`. 6 images. Different from Saffron's masonry for food |
| 3 | Space gallery | `masonry-gallery` | `standard-accent` | Eyebrow "The Space", title "Where the Magic Happens", 3 columns, medium gap. 6 items. Swapped layout from Saffron (Saffron used masonry for food, gallery for space — Brewline does the opposite) |
| 4 | Community | `image-text` | `standard` | Image left. Heading "More Than a Coffee Shop" (3xl), text about community events, "Get in Touch" primary button |

### Page 4: About (`about.json`)

| # | Widget | Type | Color Scheme | Key Config |
|---|--------|------|-------------|------------|
| 1 | Hero | `banner` | `highlight` | Small height, center. "Our Story" (5xl), subtitle |
| 2 | Origin | `image-text` | `standard` | Image left. Eyebrow "How It Started", heading "From a Garage Roaster to Your Morning Ritual" (3xl), text about Sam Chen's story. No button (story continues below) |
| 3 | Process | `steps` | `standard-accent` | Eyebrow "Bean to Cup", title "How We Brew", 4 steps: Source, Roast, Dial In, Serve — each with image + description. Zigzag layout. Widget not used in Saffron |
| 4 | Stats | `key-figures` | `standard` | 4 columns, flat, animate. "7" Years Roasting, "12" Farm Partners, "300K+" Cups Served, "4.9" Google Rating |
| 5 | Team | `team-highlight` | `standard` | Eyebrow "The Crew", title "Meet the People Behind the Counter", image_ratio `square`, 4 columns. 4 members: Sam (Founder/Roaster), Maya (Lead Barista), Kai (Pastry Chef), Lena (Green Buyer). Different widget type from Saffron's profile-grid |
| 6 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Heading "Come Say Hi" (2xl), dual buttons (Find Us + View Menu) |

### Page 5: Contact (`contact.json`)

| # | Widget | Type | Color Scheme | Key Config |
|---|--------|------|-------------|------------|
| 1 | Intro | `rich-text` | `standard` | Center, `medium` width. Heading "Find Us" (5xl), text with location description |
| 2 | Map | `map` | `standard` | Address "142 Oak Street, Portland, OR 97214", medium height, show_address true, sidebar_position `right`. 2 info blocks: Phone, Email. Sidebar on RIGHT (Saffron uses left) |
| 3 | Hours | `schedule-table` | `standard-accent` | Eyebrow "Hours", title "When We're Open", week_start_day `1`, sidebar_position `right`, note "Closed on major holidays". 7 day blocks. Widget not used in Saffron — and appropriate here (daily varying hours for a cafe) |
| 4 | FAQ | `accordion` | `standard` | Eyebrow "Good to Know", title "Quick Answers", style `separated`, heading_alignment `center`. 4 items: wifi/laptops, dairy alternatives, dog-friendly, retail beans |

---

## Menus

**main-menu.json:** Home, Menu, Gallery, About, Contact (5 items — simpler than Saffron's 6)

**footer-menu.json:** Home, Menu, Gallery, About, Contact

---

## Widget Usage Summary

Total unique widget types used: **14** (of 50 available)

| Widget | Count | Saffron uses? |
|--------|-------|---------------|
| `split-hero` | 1x | No |
| `scrolling-text` | 1x | No |
| `image-callout` | 1x | Yes |
| `image-tabs` | 1x | No |
| `testimonial-slider` | 1x | No (uses `testimonials` grid) |
| `banner` | 3x | Yes |
| `priced-list` | 3x | Yes |
| `image-text` | 3x | Yes |
| `action-bar` | 3x | Yes |
| `gallery` | 1x | Yes (but carousel vs Saffron's staggered grid) |
| `masonry-gallery` | 1x | Yes (but for space vs Saffron's food) |
| `steps` | 1x | No |
| `team-highlight` | 1x | No (Saffron uses `profile-grid`) |
| `key-figures` | 1x | Yes |
| `schedule-table` | 1x | No |
| `accordion` | 1x | Yes |
| `rich-text` | 1x | Yes |
| `map` | 1x | Yes |

**5 widgets unique to Brewline** (not in Saffron): `split-hero`, `scrolling-text`, `image-tabs`, `steps`, `team-highlight`, `schedule-table`

## Differentiation from Saffron

| Aspect | Saffron | Brewline |
|--------|---------|----------|
| Accent color | Dark goldenrod `#b8860b` | Sage green `#2d6a4f` |
| Highlight bg | Deep navy `#1a1c2b` | Near-black `#1a1a1a` |
| Standard bg | Warm cream `#fafaf8` | Pure white `#ffffff` |
| Heading font | Playfair Display 700 | Lora 600 |
| Body font | Source Sans 3 400 | DM Sans 400 |
| Corner style | slightly-rounded | rounded |
| Button shape | auto | pill |
| Header | Sticky, transparent, contact at logo, primary CTA | Not sticky, centered nav, no contact details, secondary CTA |
| Home hero | `banner` (fullwidth bg image) | `split-hero` (50/50 split) |
| Testimonials | `testimonials` (3-col grid, flat) | `testimonial-slider` (carousel) |
| Team | `profile-grid` (3 profiles, bios) | `team-highlight` (4 members, sticky intro) |
| About process | Not present | `steps` (bean-to-cup) |
| Contact hours | Not present (in footer) | `schedule-table` (full 7-day grid) |
| Page count | 6 pages (incl. Reservations) | 5 pages |
| Home marquee | Not present | `scrolling-text` |
| Drinks showcase | — | `image-tabs` |

## Header Differentiation Notes

- Centered nav + no contact details = clean, modern cafe aesthetic
- Secondary CTA to menu (not reservations — cafes don't take reservations)
- Not sticky, not transparent — simpler, lighter header presence
- No other preset should use centered nav + no contact + secondary CTA to menu in combination
