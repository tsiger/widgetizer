# Corkwell — Bar / Wine Bar Preset Plan

## Identity

**Name:** Corkwell
**Industry:** Wine bar / cocktail bar
**Personality:** Curated, intimate, unhurried. Natural wines and small-batch cocktails in a dimly lit space where the bartender knows your name. Not a nightclub — think exposed brick, candles in bottles, handwritten specials on a chalkboard. The kind of place you recommend to people you actually like.

---

## preset.json

### Colors

Deep teal/petrol accent — moody, sophisticated, completely different hue from Saffron's gold, Brewline's sage green, or Crumbly's plum. The teal evokes the cool glow of bar lighting through dark bottles.

```json
"standard_bg_primary": "#f7f6f3",
"standard_bg_secondary": "#edeae4",
"standard_text_heading": "#1a2024",
"standard_text_content": "#3c4448",
"standard_text_muted": "#6e777c",
"standard_border_color": "#d5d1ca",
"standard_accent": "#1d5e6e",
"standard_accent_text": "#ffffff",
"standard_rating_star": "#d4960a",
"highlight_bg_primary": "#151e22",
"highlight_bg_secondary": "#0d1416",
"highlight_text_heading": "#ffffff",
"highlight_text_content": "#b8c4ca",
"highlight_text_muted": "#7a8890",
"highlight_border_color": "#2a3a40",
"highlight_accent": "#4db8a4",
"highlight_accent_text": "#151e22",
"highlight_rating_star": "#d4960a"
```

Rationale: Standard palette is warm off-white with cool gray text — neutral backdrop for moody imagery. Highlight palette is teal-charcoal (not navy, not pure black, not plum). The highlight accent lightens to `#4db8a4` for readability on dark backgrounds. Rating star is warm amber, distinct from other presets' `#fbbf24` and `#d4a017`.

### Typography

```json
"heading_font": { "stack": "\"Cormorant Garamond\", serif", "weight": 500 },
"body_font": { "stack": "\"Space Grotesk\", sans-serif", "weight": 400 }
```

Cormorant Garamond at weight 500 — thin, elegant, editorial. Wine label typography. Not used by any preset. Space Grotesk for a modern, slightly technical body font — the bar menu card aesthetic. Not used by any preset.

### Style

```json
"corner_style": "sharp",
"spacing_density": "compact",
"button_shape": "sharp"
```

**First preset to use `sharp` corners and `compact` spacing.** Sharp edges = architectural, grown-up, no-nonsense. Compact spacing = intimate bar feel, dense menu cards. Sharp buttons match the overall aesthetic.

---

## Header

```json
{
  "type": "header",
  "settings": {
    "logoText": "Corkwell",
    "contactDetailsLine1": "",
    "contactDetailsLine2": "",
    "contact_position": "logo",
    "ctaButtonLink": {
      "href": "menu.html",
      "text": "Drinks & Bites",
      "target": "_self"
    },
    "ctaButtonStyle": "secondary",
    "center_nav": false,
    "full_width": true,
    "sticky": false,
    "transparent_on_hero": true,
    "color_scheme": "highlight"
  }
}
```

**What's different:** First preset with a `highlight` (dark) header — sets the moody tone immediately. Transparent on hero but NOT sticky (Saffron is both, Crumbly is sticky only, Brewline is neither). No contact details — bars don't put phone numbers in the header. Secondary CTA to "Drinks & Bites" — subtle, inviting. This is the only preset with highlight header + transparent + no contact + no sticky.

---

## Footer

```json
{
  "type": "footer",
  "settings": {
    "copyright": "© 2026 Corkwell. All rights reserved.",
    "color_scheme": "highlight"
  }
}
```

Blocks: logo_text (short about — "A wine bar and cocktail lounge..."), text_block (title "Hours", text with Wed-Mon evening hours + Closed Tuesday), menu_block (title "Explore"), social_block (title "Follow").

---

## Pages (6 pages)

A wine bar needs an Events page — tastings, pairing dinners, live music are core to the business. This differentiates from the other food & drink presets.

### Page 1: Home (`index.json`) — 7 widgets

| # | Widget | Type | Color Scheme | Key Config |
|---|--------|------|-------------|------------|
| 1 | Hero | `video-popup` | — | Large height, fullwidth. Moody bar interior bg image, overlay `#151e22cc`. Play button `light`. Video URL placeholder. `top_spacing: "none"`. **New hero type — not used in any preset.** |
| 2 | Intro | `rich-text` | `standard` | Center, `medium` width. Heading "Natural Wines. Crafted Cocktails. Small Plates." (4xl). Text paragraph about the Corkwell experience. No button — let the atmosphere speak. |
| 3 | What We Pour | `checkerboard` | `standard` | Eyebrow "What We Pour", title "Three Reasons to Stay", heading_alignment `center`, 3 columns. 3 cards: Natural Wine (image + description + "See the Wine List"), Cocktails (image + description + "View Cocktails"), Small Plates (image + description + "See the Menu"). **New widget — not in any preset.** |
| 4 | Featured | `priced-list` | `highlight` | Eyebrow "Tonight's Specials", title "From the Bar", heading_alignment `center`, single-column. 4 signature cocktails with names, tasting notes, prices. Highlight scheme for that chalkboard-specials feel. |
| 5 | Producers | `logo-cloud` | `standard-accent` | Eyebrow "Our Producers", title "We Pour From People We Trust", heading_alignment `center`, layout `grid`, 4 columns, aspect_ratio `auto`. 8 natural wine producer/distillery logos. **New widget — not in any preset.** |
| 6 | The Space | `image-callout` | `standard` | Image left. Heading "A Place to Linger" (3xl), text about the space (candlelit, exposed brick, vinyl), features (50+ wines by the glass, rotating cocktail menu, small plates until late), "See What's On" secondary button → events.html |
| 7 | CTA | `action-bar` | `highlight` | `fullwidth: true`. Heading "Open Wednesday Through Monday" (2xl), text "Doors at 5 PM. No reservations — just walk in." (base, muted), "Find Us" button → contact.html |

### Page 2: Menu (`menu.json`) — 6 widgets

| # | Widget | Type | Color Scheme | Key Config |
|---|--------|------|-------------|------------|
| 1 | Hero | `banner` | `highlight` | Small height, center. "Drinks & Bites" (5xl), subtitle "Natural wine, small-batch cocktails, and plates to share." `top_spacing: "none"` |
| 2 | Cocktails | `priced-list` | `standard` | Eyebrow "The Bar", title "Cocktails", heading_alignment `left`, single-column. 6 signature cocktails with tasting notes + prices |
| 3 | Wine | `content-switcher` | `standard-accent` | Eyebrow "The Cellar", title "Wine List", heading_alignment `center`, switcher_type `tabs`, option_1_label "Red", option_2_label "White", option_3_label "Orange & Natural", columns 2, aspect_ratio `auto`. 6 items: 2 per category, each with wine name, region, tasting notes, price. **New widget — not in any preset.** |
| 4 | Small Plates | `priced-list` | `standard` | Eyebrow "The Kitchen", title "Small Plates", heading_alignment `left`, two-column. 6 items — shareable dishes with descriptions + prices |
| 5 | Desserts & Cheese | `priced-list` | `standard-accent` | Eyebrow "To Finish", title "Cheese & Sweets", heading_alignment `left`, single-column. 3 items |
| 6 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Heading "Ask the Bartender" (2xl), text "Our team knows every bottle. Just ask." (base, muted), "Get in Touch" button → contact.html |

### Page 3: Events (`events.json`) — 5 widgets

| # | Widget | Type | Color Scheme | Key Config |
|---|--------|------|-------------|------------|
| 1 | Hero | `banner` | `highlight` | Small height, center. "What's On" (5xl), subtitle "Tastings, music, and good company." `top_spacing: "none"` |
| 2 | Next Tasting | `countdown` | `highlight` | Eyebrow "Coming Up", title "Spring Natural Wine Tasting", description "An evening exploring 12 natural wines from small European producers. Tickets include all pours and a cheese plate.", heading_alignment `center`, target_date "2027-06-15 19:00", style `cards`, show_seconds false, button: { href: "contact.html", text: "Reserve a Spot", target: "_self" }. **New widget — not in any preset.** |
| 3 | Regular Events | `icon-list` | `standard` | Eyebrow "Every Week", title "Regulars", heading_alignment `center`, layout `grid`, columns_desktop 3, icon_style `outline`, icon_size `xl`, icon_shape `rounded`. 3 items: Wine Wednesday (wine icon — "Half-price glasses of our featured natural wines"), Live Vinyl Fridays (music icon — "DJs spinning vinyl from 8 PM"), Sunday Aperitivo (sun icon — "Italian-style pre-dinner drinks and snacks from 4 PM"). **New widget — not in any preset.** |
| 4 | Private Hire | `image-callout` | `standard-accent` | Image right. Heading "Book the Bar" (3xl), text about private events (birthdays, corporate, launch parties), features (exclusive use, custom cocktail menu, catering available, capacity 40 seated), "Inquire About Private Events" secondary button → contact.html |
| 5 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Heading "Stay in the Loop" (2xl), text "Follow us for event announcements and last-minute specials." (base, muted), "Follow on Instagram" button (href: "#") |

### Page 4: Gallery (`gallery.json`) — 3 widgets

| # | Widget | Type | Color Scheme | Key Config |
|---|--------|------|-------------|------------|
| 1 | Hero | `banner` | `highlight` | Small height, center. "Gallery" (5xl), subtitle "The space, the drinks, the people." `top_spacing: "none"` |
| 2 | Drinks | `gallery` | `standard` | Eyebrow "The Drinks", title "What We Pour", layout `carousel`, 3 columns, aspect_ratio `1 / 1`, staggered false. 6 images of cocktails and wine. |
| 3 | The Bar | `gallery` | `standard-accent` | Eyebrow "The Space", title "Inside Corkwell", layout `grid`, 3 columns, aspect_ratio `4 / 3`, staggered true. 6 images of the bar interior, lighting, details. |

### Page 5: About (`about.json`) — 6 widgets

| # | Widget | Type | Color Scheme | Key Config |
|---|--------|------|-------------|------------|
| 1 | Hero | `banner` | `highlight` | Small height, center. "About" (5xl), subtitle "What Corkwell is, and isn't." `top_spacing: "none"` |
| 2 | Story | `image-text` | `standard` | Image right. Eyebrow "Our Story", heading "It Started With a Bottle of Trousseau" (3xl), text about founders Nico & Jules discovering natural wine in the Jura, opening a bar to share it. No button — story continues below. |
| 3 | Philosophy | `icon-list` | `standard-accent` | Eyebrow "What We Believe", title "The Corkwell Way", heading_alignment `center`, layout `grid`, columns_desktop 3, icon_style `outline`, icon_size `xl`, icon_shape `sharp`. 3 items: Drink Less, Drink Better (wine icon — quality over quantity), Know the Maker (users icon — relationships with producers), No Pretension (heart icon — approachable wine culture). |
| 4 | Founders | `profile-grid` | `standard` | Eyebrow "The Founders", title "Nico & Jules", heading_alignment `center`, columns_desktop 2, layout `grid`. 2 profiles: Nico Ferrara (Head Bartender / Co-Founder, specialty "Cocktails & Spirits", bio about his background), Jules Moreau (Sommelier / Co-Founder, specialty "Natural Wine", bio about her wine journey). |
| 5 | Partners | `image-text` | `standard-accent` | Image left. Eyebrow "Our Producers", heading "Wine Is Farming" (3xl), text about sourcing philosophy — small producers, organic/biodynamic, direct relationships. "See the Wine List" secondary button → menu.html |
| 6 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Heading "The Best Way to Know Us Is to Visit" (2xl), "Find the Bar" button → contact.html |

### Page 6: Contact (`contact.json`) — 3 widgets

| # | Widget | Type | Color Scheme | Key Config |
|---|--------|------|-------------|------------|
| 1 | Intro | `rich-text` | `standard` | Center, `medium` width. Heading "Find Corkwell" (5xl), text with address + "No reservations needed — just walk in." |
| 2 | Map | `map` | `standard` | Address "88 Vine Street, Brooklyn, NY 11201", height `medium`, show_address true, sidebar_position `right`. 3 info blocks: Phone, Email, Hours. |
| 3 | FAQ | `accordion` | `standard-accent` | Eyebrow "Before You Visit", title "Good to Know", style `connected`, heading_alignment `center`. 4 items: Do you take reservations? (no — first come, walk-in only), Can I buy bottles to take home? (yes — retail shelf), Do you serve food? (yes — small plates kitchen), Is there live music? (yes — vinyl Fridays, occasional live sets) |

---

## Menus

**main-menu.json:** Home, Menu, Events, Gallery, About, Contact (6 items — Events is unique to this preset)

**footer-menu.json:** Home, Menu, Events, Gallery, About, Contact

---

## Widget Usage Summary

Total unique widget types used: **12** (of 50 available)

| Widget | Count | In Saffron? | In Brewline? | In Crumbly? |
|--------|-------|-------------|--------------|-------------|
| `video-popup` | 1x | No | No | No |
| `checkerboard` | 1x | No | No | No |
| `logo-cloud` | 1x | No | No | No |
| `content-switcher` | 1x | No | No | No |
| `countdown` | 1x | No | No | No |
| `icon-list` | 2x | No | No | No |
| `banner` | 4x | Yes | Yes | Yes |
| `priced-list` | 4x | Yes | Yes | Yes |
| `image-callout` | 2x | Yes | Yes | Yes |
| `image-text` | 1x | Yes | Yes | Yes |
| `profile-grid` | 1x | Yes | No | Yes |
| `action-bar` | 4x | Yes | Yes | Yes |
| `rich-text` | 2x | Yes | Yes | Yes |
| `gallery` | 2x | Yes | Yes | Yes |
| `map` | 1x | Yes | Yes | Yes |
| `accordion` | 1x | Yes | No | No |

**6 widgets completely new** (not in any previous preset): `video-popup`, `checkerboard`, `logo-cloud`, `content-switcher`, `countdown`, `icon-list`

## Differentiation from All Previous Presets

| Aspect | Saffron | Brewline | Crumbly | Corkwell |
|--------|---------|----------|---------|----------|
| Accent | Dark gold `#b8860b` | Sage green `#2d6a4f` | Dusty plum `#7b4a6e` | Deep teal `#1d5e6e` |
| Highlight bg | Deep navy `#1a1c2b` | Near-black `#1a1a1a` | Deep plum `#2e1f2e` | Teal-charcoal `#151e22` |
| Standard bg | Warm cream `#fafaf8` | Pure white `#ffffff` | Parchment `#faf8f5` | Warm gray `#f7f6f3` |
| Heading font | Playfair Display 700 | Lora 600 | Fraunces 600 | Cormorant Garamond 500 |
| Body font | Source Sans 3 400 | DM Sans 400 | Nunito Sans 400 | Space Grotesk 400 |
| Corners | slightly-rounded | rounded | rounded | **sharp** |
| Buttons | auto | pill | auto | **sharp** |
| Spacing | default | default | default | **compact** |
| Header scheme | standard | standard | standard | **highlight** |
| Header contact | Phone + address at logo | None | Hours at menu | None |
| Header CTA | Reserve a Table (primary) | View Menu (secondary) | Order a Cake (primary) | Drinks & Bites (secondary) |
| Header sticky | Yes | No | Yes | No |
| Header transparent | Yes | No | No | Yes |
| Home hero | banner | split-hero | slideshow | **video-popup** |
| Unique page | Reservations | — | Custom Cakes | **Events** |
| New widgets | — | 6 | 9 | **6** |

## Header Differentiation Notes

- **Dark header** (`color_scheme: "highlight"`) — only preset with this. Sets the tone for a moody bar experience
- Transparent on hero + NOT sticky — the dark header melts into the video-popup hero, but doesn't follow you around (different from Saffron's sticky+transparent combo)
- No contact details — clean, minimal. Bars don't need phone numbers front and center
- Secondary CTA "Drinks & Bites" — casual, inviting, not transactional
- No other preset should use highlight header + transparent + secondary CTA to menu in combination
