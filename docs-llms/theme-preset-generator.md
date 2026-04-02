# Theme Preset Generator Guide

Reference for generating `preset.json` files for Arch theme presets. Covers the color system, font library, and style settings — everything needed to create visually distinct presets.

---

## 1. Color System

### Architecture

The Arch theme has **two palettes** (Standard and Highlight), each with **9 color tokens**. Every widget picks one of four color schemes via its `color_scheme` setting:

| Scheme | CSS class | Surface | Purpose |
|--------|-----------|---------|---------|
| `standard` | `.color-scheme-standard` | Light | Default — white/light background, dark text |
| `standard-accent` | `.color-scheme-standard-accent` | Light alt | Swaps bg_primary ↔ bg_secondary for subtle banding |
| `highlight` | `.color-scheme-highlight` | Dark | Emphasis sections — dark background, light text |
| `highlight-accent` | `.color-scheme-highlight-accent` | Dark alt | Swaps highlight bg_primary ↔ bg_secondary |

The accent variants are automatic — they just flip the two background colors. So you only define **18 color values** (9 standard + 9 highlight) and get 4 usable schemes.

### Token Reference

#### Standard palette (light surfaces)

| Token | Role | Base default | Notes |
|-------|------|-------------|-------|
| `standard_bg_primary` | Page background, widget default | `#ffffff` | Usually white or near-white |
| `standard_bg_secondary` | Alt background (accent scheme, cards) | `#f8fafc` | Subtle contrast vs primary — typically 2-5% darker |
| `standard_text_heading` | Headings (h1-h6) | `#0f172a` | Near-black for maximum readability |
| `standard_text_content` | Body text | `#334155` | Slightly lighter than headings |
| `standard_text_muted` | Captions, metadata, secondary text | `#6b7280` | Mid-gray |
| `standard_border_color` | Dividers, card borders, separators | `#e2e8f0` | Light gray, barely visible |
| `standard_accent` | Buttons, links, active states | `#0f172a` | The brand color for CTAs |
| `standard_accent_text` | Text on accent backgrounds | `#ffffff` | Must contrast against accent |
| `standard_rating_star` | Star rating fill color | `#fbbf24` | Usually amber/gold — rarely changed |

#### Highlight palette (dark surfaces)

| Token | Role | Base default | Notes |
|-------|------|-------------|-------|
| `highlight_bg_primary` | Dark section background | `#0f172a` | Deep navy/charcoal |
| `highlight_bg_secondary` | Dark alt background | `#020617` | Even darker — used in accent variant |
| `highlight_text_heading` | Headings on dark | `#ffffff` | Almost always white |
| `highlight_text_content` | Body text on dark | `#cbd5e1` | Light gray — not pure white |
| `highlight_text_muted` | Secondary text on dark | `#94a3b8` | Mid-tone, readable on dark |
| `highlight_border_color` | Borders on dark | `#334155` | Subtle, darker than text |
| `highlight_accent` | Buttons/links on dark | `#ffffff` | Can differ from standard accent |
| `highlight_accent_text` | Text on dark accent buttons | `#0f172a` | Must contrast against highlight accent |
| `highlight_rating_star` | Stars on dark | `#fbbf24` | Usually same as standard |

### How to Design a Palette

**Step 1: Pick a brand accent color.** This is the emotional core of the preset. It goes in `standard_accent` and optionally `highlight_accent`.

**Step 2: Build the standard (light) palette around it.**
- `bg_primary`: Almost always `#ffffff` or a very faint warm/cool tint (e.g., `#fffbf5` for warm, `#f8fafc` for cool)
- `bg_secondary`: 2-5% darker than primary, with the same temperature. This is the "banding" color for alternating sections
- `text_heading`: Near-black, can have a slight color cast (warm: `#1a1a1a`, cool: `#0f172a`, green: `#1b2e1b`)
- `text_content`: Slightly lighter than heading, same temperature
- `text_muted`: Mid-gray, same temperature family
- `border_color`: Very light, barely there — match the bg_secondary temperature
- `accent_text`: Almost always `#ffffff` unless the accent is very light (then use dark)

**Step 3: Build the highlight (dark) palette.**
- `bg_primary`: Deep, saturated version of the brand direction (navy, charcoal, forest, burgundy)
- `bg_secondary`: Even deeper — 10-20% darker than primary
- `text_heading`: Almost always `#ffffff`
- `text_content`: Light but not white — off-white with slight color cast
- `text_muted`: Mid-tone that reads on dark
- `border_color`: Subtle — darker than text_muted, lighter than backgrounds
- `accent`: Can match standard_accent, or go white/contrasting for dark sections
- `accent_text`: Must contrast against highlight_accent

**Step 4: Validate contrast.**
- Heading on bg_primary: minimum 7:1 ratio (WCAG AAA)
- Content text on bg_primary: minimum 4.5:1 (WCAG AA)
- Muted text on bg_primary: minimum 3:1 (WCAG AA for large text)
- Accent text on accent: minimum 4.5:1

### Palette Moods (cheat sheet for industries)

| Mood | Accent direction | Standard bg | Highlight bg | Industries |
|------|-----------------|-------------|-------------|------------|
| **Warm & inviting** | Terracotta, amber, burnt orange | Cream/ivory tint | Deep brown or warm charcoal | Restaurant, bakery, cafe, hotel |
| **Cool & professional** | Navy, slate blue, teal | Pure white or cool gray | Deep navy or slate | Lawyer, accountant, consultant, IT |
| **Fresh & natural** | Forest green, sage, olive | Off-white with warm tint | Deep forest or olive | Landscaping, florist, vet, daycare |
| **Bold & energetic** | Bright red, electric blue, magenta | Clean white | Near-black or deep navy | Personal trainer, auto repair, developer |
| **Soft & luxurious** | Dusty rose, mauve, gold | Warm cream | Deep plum or charcoal | Spa, interior designer, wedding planner |
| **Clean & clinical** | Teal, cerulean, calm blue | White with cool cast | Deep teal or slate | Dentist, yoga studio, cleaning service |
| **Creative & edgy** | Deep purple, coral, chartreuse | Pure white | Rich black | Photographer, tattoo studio, graphic designer |
| **Trustworthy & solid** | Deep blue, hunter green | Pure white | Deep navy | Real estate, plumber, electrician |

### What to Override in preset.json

You only need to include settings that differ from the base theme.json defaults. The consulting preset is a good example — it overrides 10 of the 18 color tokens plus the heading font, leaving the rest at defaults.

Minimum recommended overrides for visual distinctiveness:
- `standard_accent` (brand color — this alone changes buttons, links, active states)
- `highlight_bg_primary` + `highlight_bg_secondary` (dark section mood)
- `heading_font` (typography is the #1 differentiator)

Full override for maximum control: all 18 color tokens + both fonts + style settings.

---

## 2. Font Library

### Available Fonts by Category

The font picker offers **250 fonts** from Google Fonts plus 3 system stacks. In `preset.json`, fonts are specified as:

```json
"heading_font": { "stack": "\"Playfair Display\", serif", "weight": 700 },
"body_font": { "stack": "\"Inter\", sans-serif", "weight": 400 }
```

The `stack` must exactly match the font's stack string from `fonts.json`. The `weight` must be one of that font's `availableWeights`.

### Recommended Heading Fonts (by personality)

#### Elegant / Editorial serif
| Font | Stack | Best weights | Vibe |
|------|-------|-------------|------|
| Playfair Display | `"Playfair Display", serif` | 500, 600, 700 | Classic editorial, high contrast |
| Fraunces | `"Fraunces", serif` | 500, 600, 700 | Warm old-style, slightly quirky |
| Cormorant Garamond | `"Cormorant Garamond", serif` | 500, 600, 700 | Refined, light, Garamond lineage |
| Bodoni Moda | `"Bodoni Moda", serif` | 500, 600, 700 | Fashion editorial, high contrast |
| EB Garamond | `"EB Garamond", serif` | 500, 600, 700 | Classical, scholarly |
| Libre Baskerville | `"Libre Baskerville", serif` | 400, 700 | British traditional, trustworthy |
| Lora | `"Lora", serif` | 500, 600, 700 | Warm and contemporary serif |
| Literata | `"Literata", serif` | 500, 600, 700 | Book-quality, highly readable |
| Source Serif 4 | `"Source Serif 4", serif` | 600, 700 | Clean modern serif |
| Merriweather | `"Merriweather", serif` | 700, 800 | Screen-optimized, sturdy |

#### Bold / Impactful sans-serif
| Font | Stack | Best weights | Vibe |
|------|-------|-------------|------|
| Montserrat | `"Montserrat", sans-serif` | 600, 700 | Geometric, confident |
| Poppins | `"Poppins", sans-serif` | 600, 700 | Rounded geometric, friendly-bold |
| Raleway | `"Raleway", sans-serif` | 600, 700 | Elegant sans, thin strokes |
| Oswald | `"Oswald", sans-serif` | 500, 600, 700 | Condensed, industrial |
| Bebas Neue | `"Bebas Neue", sans-serif` | 400 | All-caps display, ultra-condensed |
| League Spartan | `"League Spartan", sans-serif` | 600, 700 | Bold geometric, sporty |
| Syne | `"Syne", sans-serif` | 600, 700, 800 | Art-directed, distinctive |
| Space Grotesk | `"Space Grotesk", sans-serif` | 500, 600, 700 | Techy, modern |
| Red Hat Display | `"Red Hat Display", sans-serif` | 600, 700 | Humanist, warm corporate |
| Outfit | `"Outfit", sans-serif` | 600, 700 | Clean geometric, versatile |

#### Warm / Friendly
| Font | Stack | Best weights | Vibe |
|------|-------|-------------|------|
| Nunito | `"Nunito", sans-serif` | 600, 700 | Rounded, approachable |
| Quicksand | `"Quicksand", sans-serif` | 600, 700 | Rounded geometric, soft |
| Cabin | `"Cabin", sans-serif` | 600, 700 | Humanist, balanced |
| Fredoka | `"Fredoka", sans-serif` | 500, 600, 700 | Playful, rounded |
| Comfortaa | `"Comfortaa", display` | 500, 600, 700 | Ultra-rounded, casual |
| Baloo 2 | `"Baloo 2", display` | 600, 700 | Fun, bubbly |

#### Display / Decorative (heading only)
| Font | Stack | Best weights | Vibe |
|------|-------|-------------|------|
| Abril Fatface | `"Abril Fatface", display` | 400 | Poster-style, dramatic |
| Alfa Slab One | `"Alfa Slab One", display` | 400 | Heavy slab, retro |
| Righteous | `"Righteous", display` | 400 | Retro-futuristic |
| Lobster | `"Lobster", display` | 400 | Script-like, casual |
| Shrikhand | `"Shrikhand", display` | 400 | Heavy, playful |
| Patua One | `"Patua One", display` | 400 | Strong slab, warm |

### Recommended Body Fonts

Body fonts need high readability at 16px. Stick to these categories:

#### Clean sans-serif (safest, most versatile)
| Font | Stack | Best weight | Vibe |
|------|-------|------------|------|
| Inter | `"Inter", sans-serif` | 400 | The default — neutral, screen-optimized |
| DM Sans | `"DM Sans", sans-serif` | 400 | Geometric, slightly more personality |
| Plus Jakarta Sans | `"Plus Jakarta Sans", sans-serif` | 400 | Modern, slightly rounded |
| Work Sans | `"Work Sans", sans-serif` | 400 | Humanist, warm |
| Manrope | `"Manrope", sans-serif` | 400 | Geometric, contemporary |
| Karla | `"Karla", sans-serif` | 400 | Grotesque, compact |
| Rubik | `"Rubik", sans-serif` | 400 | Slightly rounded, friendly |
| Open Sans | `"Open Sans", sans-serif` | 400 | Neutral, universally legible |
| Lato | `"Lato", sans-serif` | 400 | Warm, stable |
| Source Sans 3 | `"Source Sans 3", sans-serif` | 400 | Adobe's workhorse |
| Nunito Sans | `"Nunito Sans", sans-serif` | 400 | Rounded, approachable |
| IBM Plex Sans | `"IBM Plex Sans", sans-serif` | 400 | Technical, precise |
| Fira Sans | `"Fira Sans", sans-serif` | 400 | Mozilla lineage, readable |

#### Readable serif (for editorial/luxury feel)
| Font | Stack | Best weight | Vibe |
|------|-------|------------|------|
| Source Serif 4 | `"Source Serif 4", serif` | 400 | Clean modern serif |
| Lora | `"Lora", serif` | 400 | Warm, contemporary |
| Merriweather | `"Merriweather", serif` | 300 or 400 | Screen-optimized, sturdy |
| PT Serif | `"PT Serif", serif` | 400 | Traditional, reliable |
| Literata | `"Literata", serif` | 400 | Book-quality |
| Noto Serif | `"Noto Serif", serif` | 400 | Universal, multi-script |

### Font Pairing Strategies

**Strategy 1: Serif heading + Sans body** (most versatile)
- Creates natural hierarchy through contrast
- Serif adds personality to headlines, sans stays readable for body
- Example: Playfair Display 700 + Inter 400, Fraunces 600 + DM Sans 400

**Strategy 2: Sans heading + Sans body** (modern/clean)
- Use different sans families or just weight contrast
- Heading should be geometric/bold, body should be humanist/readable
- Example: Montserrat 700 + Open Sans 400, Space Grotesk 600 + Inter 400

**Strategy 3: Display heading + Sans body** (high personality)
- Display fonts are attention-grabbing but only work at large sizes
- Keep body very neutral to balance the drama
- Example: Abril Fatface 400 + Lato 400, Alfa Slab One 400 + Source Sans 3 400

**Strategy 4: Same family, different weights** (harmonious)
- Minimalist approach — heading and body share DNA
- Heading at 600-700, body at 400
- Example: Raleway 700 + Raleway 400, Bitter 700 + Bitter 400

### Font Pairing Ideas by Industry

| Industry | Heading | Body | Mood |
|----------|---------|------|------|
| Restaurant | Playfair Display 700 | Lato 400 | Elegant dining |
| Restaurant (casual) | Poppins 700 | Work Sans 400 | Friendly bistro |
| Cafe | Lora 600 | DM Sans 400 | Artisan warmth |
| Bakery | Fraunces 600 | Nunito Sans 400 | Handcrafted feel |
| Bar | Oswald 600 | Inter 400 | Urban edge |
| Yoga | Cormorant Garamond 500 | Plus Jakarta Sans 400 | Serene elegance |
| Spa | Bodoni Moda 500 | Manrope 400 | Luxury calm |
| Dentist | Outfit 600 | Inter 400 | Clean precision |
| Personal trainer | League Spartan 700 | Rubik 400 | Athletic power |
| Lawyer | Libre Baskerville 700 | Source Sans 3 400 | Trustworthy tradition |
| Accountant | Red Hat Display 600 | IBM Plex Sans 400 | Corporate reliable |
| Consultant | Fraunces 600 | Inter 400 | (current — see consulting preset) |
| Real estate | Montserrat 600 | Open Sans 400 | Confident modern |
| Plumber | Cabin 700 | Fira Sans 400 | Solid dependable |
| Landscaping | Bitter 600 | Work Sans 400 | Natural grounded |
| Cleaning | Nunito 700 | Nunito Sans 400 | Clean approachable |
| Interior designer | Bodoni Moda 600 | Karla 400 | Fashion-forward |
| Photographer | Space Grotesk 600 | Inter 400 | Minimalist modern |
| Tattoo | Syne 700 | DM Sans 400 | Creative edge |
| Graphic designer | Epilogue 600 | Inter 400 | Design-conscious |
| Architecture | Raleway 600 | Source Sans 3 400 | Precise elegant |
| Florist | Cormorant Garamond 600 | Lora 400 | Romantic natural |
| Pet grooming | Fredoka 600 | Rubik 400 | Playful friendly |
| Auto repair | Oswald 600 | Fira Sans 400 | Industrial honest |
| Tutoring | Cabin 600 | Open Sans 400 | Approachable smart |
| Daycare | Baloo 2 700 | Nunito Sans 400 | Fun warm |
| Veterinarian | Nunito 600 | Inter 400 | Caring professional |
| Developer | Space Grotesk 600 | IBM Plex Sans 400 | Techy clean |
| IT support | Outfit 600 | Source Sans 3 400 | Modern reliable |
| Wedding planner | Cormorant Garamond 500 | Manrope 400 | Romantic refined |
| Hotel | Playfair Display 600 | Plus Jakarta Sans 400 | Classic hospitality |

---

## 3. Style Settings

These go in `preset.json` alongside colors and fonts. They control body classes that cascade globally.

| Setting | Values | Visual effect |
|---------|--------|---------------|
| `corner_style` | `sharp`, `slightly-rounded`, `rounded` | Controls border-radius on cards, images, inputs, bento items |
| `spacing_density` | `compact`, `default`, `airy` | Multiplier on section padding and card spacing |
| `button_shape` | `auto`, `pill`, `sharp` | `auto` follows corner_style; `pill` = fully rounded; `sharp` = square corners |

### Style Combinations by Mood

| Mood | corner_style | spacing_density | button_shape | Industries |
|------|-------------|----------------|--------------|------------|
| Modern minimal | `sharp` | `default` | `auto` | Architecture, developer, photographer |
| Warm & friendly | `rounded` | `default` | `auto` | Bakery, daycare, pet grooming, florist |
| Professional | `slightly-rounded` | `default` | `auto` | Lawyer, accountant, consultant, dentist |
| Airy & spacious | `rounded` | `airy` | `pill` | Spa, yoga, wedding planner, interior designer |
| Dense & efficient | `slightly-rounded` | `compact` | `auto` | IT support, auto repair, plumber |
| Bold & punchy | `sharp` | `compact` | `sharp` | Personal trainer, tattoo studio, bar |
| Soft & luxurious | `rounded` | `airy` | `pill` | Hotel, spa, florist |

---

## 4. preset.json Format

```json
{
  "settings": {
    "standard_bg_primary": "#ffffff",
    "standard_bg_secondary": "#f5f0eb",
    "standard_text_heading": "#1a1a1a",
    "standard_text_content": "#3d3d3d",
    "standard_text_muted": "#7a7a7a",
    "standard_border_color": "#e5e0db",
    "standard_accent": "#c4540a",
    "standard_accent_text": "#ffffff",
    "highlight_bg_primary": "#2c1810",
    "highlight_bg_secondary": "#1a0e09",
    "highlight_text_heading": "#ffffff",
    "highlight_text_content": "#e8ddd4",
    "highlight_text_muted": "#a89585",
    "highlight_border_color": "#4a3828",
    "highlight_accent": "#e8a87c",
    "highlight_accent_text": "#1a0e09",
    "heading_font": { "stack": "\"Playfair Display\", serif", "weight": 700 },
    "body_font": { "stack": "\"Lato\", sans-serif", "weight": 400 },
    "corner_style": "slightly-rounded",
    "spacing_density": "default",
    "button_shape": "auto"
  }
}
```

Only include settings you want to override. Omitted settings fall back to the base `theme.json` defaults.

---

## 5. Widget Insights

Every widget in `themes/arch/widgets/` has an `insights.md` file co-located with its `schema.json` and `widget.liquid`. These files document:

- **Settings levers** — every knob you can turn and what it does visually
- **Available blocks** — what goes inside the widget and key options per block
- **Layout recipes** — 5-8 concrete compositions with specific settings, each tagged with industries they suit
- **Differentiation tips** — how to avoid using the same widget the same way across presets

**Before building any preset, read the insights.md for every widget you plan to use.** The recipes are designed so that when Saffron uses a `banner` it looks nothing like when Greystone or Framelight uses one.

Location pattern: `themes/arch/widgets/{widget-name}/insights.md` (e.g., `themes/arch/widgets/split-content/insights.md`). Global widgets are at `themes/arch/widgets/global/header/insights.md` and `themes/arch/widgets/global/footer/insights.md`.

---

## 6. Common Mistakes

### Action Bar: don't always use fullwidth

The `action-bar` widget has a `fullwidth` setting. **Do not default it to `true` on every instance.** Vary between fullwidth (edge-to-edge band) and contained (centered strip with padding) across presets and even within the same preset. A contained action-bar feels more like a nudge; fullwidth feels like a section divider. Both are valid — pick based on context.

### Contact page: don't duplicate the footer

The `contact-details` widget (with info, text, menu, and social blocks) serves nearly the same purpose as the global `footer` widget. **Never place contact-details as the last widget on the Contact page** — the footer renders right below it, creating visual and informational redundancy (same hours, same links, same social icons twice in a row).

Instead, end the Contact page with:
- An `action-bar` CTA (e.g., "Call us today")
- A `testimonial-slider` or `testimonials` section
- A `rich-text` closing message
- Or simply let the map be the last widget — the footer handles the rest

The footer already carries hours, links, and social. Trust it to do its job.

---

## 7. Differentiation Checklist

Before finalizing a preset's `preset.json`, verify:

- [ ] **Accent color** is unique across all 30 presets (no two share the same hue)
- [ ] **Heading font** differs from neighboring presets in the same industry category
- [ ] **Highlight palette** has a distinct mood (not just "generic dark navy" for every preset)
- [ ] **Style settings** vary — not every preset should be `slightly-rounded / default / auto`
- [ ] **Color temperature** matches the industry (warm for food/hospitality, cool for professional/tech)
- [ ] **Contrast ratios** pass WCAG AA minimum (4.5:1 for body text, 3:1 for large text)
- [ ] **Body font** is genuinely readable at 16px — avoid display/decorative fonts for body
- [ ] **Action bars** mix fullwidth and contained — not all `fullwidth: true`
- [ ] **Contact page** doesn't end with contact-details duplicating the footer
