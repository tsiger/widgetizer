# Stillpoint — Yoga / Pilates Studio

## Identity

**Name:** Stillpoint
**Industry:** Yoga / Pilates Studio
**Personality:** Calm, grounded, and intentional. Stillpoint is a neighborhood studio that blends traditional yoga philosophy with contemporary wellness. The brand feels like a deep breath — warm earth tones, generous white space, and unhurried elegance. Copy is soft-spoken but confident, never preachy.

---

## preset.json Settings

### Color Palette

| Token | Value | Rationale |
|-------|-------|-----------|
| `standard_bg_primary` | `#faf9f6` | Warm off-white, softer than pure white — feels like natural linen |
| `standard_bg_secondary` | `#f0ece5` | Sandy cream for banding sections, like sun-warmed stone |
| `standard_text_heading` | `#2c2420` | Deep warm brown — grounding, earthy, avoids harsh black |
| `standard_text_content` | `#4a4340` | Medium brown-gray for comfortable reading |
| `standard_text_muted` | `#8a7f78` | Warm taupe for secondary text |
| `standard_border_color` | `#ddd5cb` | Subtle warm border, blends with cream backgrounds |
| `standard_accent` | `#c4724e` | Terracotta / clay — warm, earthy, unique across all presets |
| `standard_accent_text` | `#ffffff` | White on terracotta for strong contrast |
| `standard_rating_star` | `#e8a838` | Warm amber stars |
| `highlight_bg_primary` | `#2c2420` | Deep warm brown — the same heading color, not generic navy |
| `highlight_bg_secondary` | `#1e1814` | Darker espresso for highlight banding |
| `highlight_text_heading` | `#f5f0e8` | Warm cream headings on dark — not stark white |
| `highlight_text_content` | `#c8bfb4` | Muted sand for body text on dark |
| `highlight_text_muted` | `#96897c` | Faded taupe on dark |
| `highlight_border_color` | `#3d3530` | Subtle warm border on dark |
| `highlight_accent` | `#d4906e` | Lighter terracotta for dark backgrounds — softer warmth |
| `highlight_accent_text` | `#1e1814` | Dark text on light terracotta buttons |
| `highlight_rating_star` | `#e8a838` | Consistent amber stars |

### Typography

```json
"heading_font": { "stack": "\"Cormorant Garamond\", serif", "weight": 400 },
"body_font": { "stack": "\"Karla\", sans-serif", "weight": 400 }
```

**Rationale:** Cormorant Garamond at weight 400 is refined and airy — thin strokes evoke lightness and grace, perfect for a yoga studio. Karla is a humanist sans-serif with subtle personality, warm without being childish. Neither font has been used by any existing preset.

Additional settings:
- `heading_scale`: `105` — slightly larger headings for a generous, spacious feel
- `body_scale`: `100` — default body size

### Style Settings

| Setting | Value | Rationale |
|---------|-------|-----------|
| `corner_style` | `rounded` | Soft, organic shapes matching the wellness aesthetic |
| `spacing_density` | `airy` | First preset to use airy — generous breathing room fits yoga perfectly |
| `button_shape` | `pill` | Fully rounded pill buttons — soft, inviting, approachable |

---

## Header Configuration

```json
{
  "logoText": "Stillpoint",
  "contactDetailsLine1": "",
  "contactDetailsLine2": "",
  "contact_position": "logo",
  "headerNavigation": "main-menu",
  "center_nav": true,
  "ctaButtonLink": { "href": "contact.html", "text": "Book a Class", "target": "_self" },
  "ctaButtonStyle": "primary",
  "full_width": true,
  "sticky": false,
  "transparent_on_hero": false,
  "color_scheme": "standard"
}
```

### Header Differentiation Notes

**Unique combination:** Centered nav + no contact details + primary CTA + standard scheme + not sticky + not transparent. This is the cleanest, most minimal header across all presets — no contact info cluttering the bar, centered navigation creates a balanced, meditative feel. The primary "Book a Class" CTA in terracotta adds the only pop of color. None of the existing presets combine centered nav with primary CTA and zero contact details.

Comparison:
- Saffron: standard + sticky + transparent + contact at logo + primary CTA
- Brewline: standard + centered nav + secondary CTA (but no contact details)
- Crumbly: standard + sticky + contact at menu + primary CTA
- Corkwell: highlight + transparent + no contact + secondary CTA
- **Stillpoint: standard + centered nav + no contact + primary CTA (not sticky, not transparent)**

Differs from Brewline (the only other centered nav) by using primary CTA instead of secondary, and different CTA text.

---

## Footer Configuration

```json
{
  "copyright": "© 2026 Stillpoint Yoga Studio. All rights reserved.",
  "color_scheme": "highlight"
}
```

### Footer Blocks

1. **logo_text** — `logo_text: "Stillpoint"`, `text: "<p>Find your center. A neighborhood yoga and pilates studio offering classes for every body and every level.</p>"`
2. **text_block** — `title: "Visit Us"`, `text: "<p>82 Willow Street<br>Brooklyn, NY 11201</p><p>hello@stillpointyoga.com<br>(718) 555-0234</p>"`
3. **menu_block** — `title: "Explore"`, `menu: "footer-menu"`
4. **social_block** — `title: "Connect"`

---

## Pages

### Home (`index.json`) — 8 widgets

| # | Widget | Type | Color Scheme | Key Configuration |
|---|--------|------|-------------|-------------------|
| 1 | Hero | `banner` | `highlight` | `height: large`, `fullwidth: true`, `alignment: start`, `vertical_alignment: end`, `overlay_color: "#2c242099"`. Bottom-anchored cinematic hero — unique across all presets. Blocks: text (sm, muted, uppercase, "YOGA & PILATES STUDIO") → heading (6xl, "Find Your Stillpoint") → text (lg, "Classes for every body, every level. Your first class is free.") → button (primary, "Book a Class" + secondary "View Schedule", medium). `top_spacing: none` for header flush. Serene overhead shot of a yoga class in a sunlit studio |
| 2 | Marquee | `scrolling-text` | — | `text: "Breathe · Move · Rest"`, `separator: "·"`, `speed: 4`, `rotate: 0`, `font_size: lg`, `bg_color: "#c4724e"` (terracotta), `text_color: "#ffffff"`. `top_spacing: none`, `bottom_spacing: none`. Slow, meditative pace. No rotation for calm feel |
| 3 | Intro | `rich-text` | `standard` | `text_alignment: center`, `content_width: medium`. Blocks: heading (3xl, "Where Stillness Meets Strength") → text (base, paragraph about studio philosophy) → button (secondary, "Explore Our Classes", links to classes.html) |
| 4 | Class Types | `icon-card-grid` | `standard-accent` | `eyebrow: "Our Classes"`, `title: "Something for Every Body"`, `heading_alignment: center`, `columns_desktop: 3`, `card_layout: box`, `alignment: center`, `icon_style: plain`, `icon_size: lg`, `icon_shape: circle`. 6 cards: Vinyasa Flow (wind), Hatha (sun), Yin (moon), Pilates Mat (activity), Prenatal (heart), Meditation (eye). Each with short description + "Learn More" link to classes.html |
| 5 | Studio | `image-text` | `standard` | `image_position: left`, `text_position: center`, `content_color_scheme: none`. Blocks: text (sm, muted, uppercase, "THE SPACE") → heading (2xl, "Light-Filled, Distraction-Free") → text (base, description of the studio space) → button (secondary, "Visit Us", links to contact.html). Photo of a bright, airy studio interior |
| 6 | Process | `steps` | `standard-accent` | `eyebrow: "New Here?"`, `title: "Getting Started Is Easy"`, `heading_alignment: center`. 3 steps: "Pick a Class" (browse schedule illustration) → "Book Online" (phone/laptop mockup) → "Show Up & Breathe" (studio welcome photo). No buttons — simple and inviting |
| 7 | Testimonials | `trust-bar` | `highlight` | `icon_style: plain`, `icon_size: lg`, `icon_shape: circle`, `alignment: centered`, `show_dividers: true`. 3 items: star/"5.0 Rating"/Google Reviews, users/"2,000+"/Classes Taught, heart/"98%"/Would Recommend. Stats strip for credibility. `top_spacing: none`, `bottom_spacing: none` to dock flush |
| 8 | CTA | `action-bar` | `highlight` | `fullwidth: false`, `top_spacing: none`. Blocks: heading (2xl, "Your First Class Is on Us") → text (base, muted, "New students enjoy a complimentary drop-in class.") → button (primary, "Book Your Free Class", links to contact.html). Contained width for elegance |

### Classes (`classes.json`) — 6 widgets

| # | Widget | Type | Color Scheme | Key Configuration |
|---|--------|------|-------------|-------------------|
| 1 | Hero | `banner` | `highlight` | `height: small`, `fullwidth: true`, `alignment: center`. `overlay_color: "#2c242080"`. Blocks: heading (4xl, "Our Classes"), text (lg, "From gentle stretches to challenging flows"). `top_spacing: none` for header flush. Minimal class page hero |
| 2 | Class Grid | `icon-card-grid` | `standard` | `eyebrow: ""`, `title: "Find Your Practice"`, `heading_alignment: center`, `columns_desktop: 3`, `card_layout: flat`, `alignment: start`, `icon_style: filled`, `icon_size: xl`, `icon_shape: circle`. 6 cards matching homepage but with longer descriptions and "View Schedule" button links to schedule.html |
| 3 | What to Expect | `features-split` | `standard-accent` | `eyebrow: "First Time?"`, `title: "What to Expect"`, `heading_alignment: left`, `content_position: left`, `show_divider: true`, `icon_style: plain`, `icon_size: lg`, `icon_shape: circle`. 4 features: "Arrive 10 Minutes Early" (clock), "Mats & Props Provided" (box), "All Levels Welcome" (users), "Hydration Station Available" (droplet) |
| 4 | Pricing | `rich-text` | `highlight` | `text_alignment: center`, `content_width: medium`. Blocks: heading (3xl, "Simple, Honest Pricing") → text (base, "Drop-in: $22 · 5-Class Pack: $95 · Unlimited Monthly: $149") → text (sm, muted, "First class free for new students") → button (primary, "Get Started", links to contact.html) |
| 5 | Instructor | `image-text` | `standard` | `image_position: right`, `text_position: center`, `content_color_scheme: none`. Blocks: text (sm, muted, uppercase, "MEET YOUR TEACHER") → heading (2xl, "Sarah Chen") → text (base, bio paragraph about training and teaching philosophy) → button (secondary, "About Our Team", links to about.html). Portrait photo |
| 6 | FAQ | `accordion` | `standard-accent` | `eyebrow: "Questions?"`, `title: "Common Questions"`, `heading_alignment: center`, `style: separated`, `allow_multiple: false`. 5 items: "What should I wear?", "Do I need my own mat?", "Can I join mid-session?", "Is parking available?", "What's your cancellation policy?". No sidebar |

### Schedule (`schedule.json`) — 4 widgets

| # | Widget | Type | Color Scheme | Key Configuration |
|---|--------|------|-------------|-------------------|
| 1 | Hero | `banner` | `highlight` | `height: small`, `fullwidth: true`, `alignment: center`. `overlay_color: "#2c242080"`. Blocks: heading (4xl, "Class Schedule"). `top_spacing: none` |
| 2 | Schedule | `schedule-table` | `standard` | `eyebrow: ""`, `title: "Weekly Schedule"`, `heading_alignment: center`, `note: "Private sessions available by appointment"`, `sidebar_position: right`, `week_start_day: "1"`. 7 day blocks with yoga-specific hours (e.g., Mon: "6:30 AM, 9:00 AM, 12:00 PM, 5:30 PM, 7:00 PM"). 1 info block: "Drop In" with pricing summary. 1 social block |
| 3 | Intro Class | `image-text` | `standard-accent` | `image_position: left`, `text_position: center`, `content_color_scheme: none`. Blocks: heading (2xl, "New to Yoga?") → text (base, encouraging paragraph about intro classes) → button (primary, "Book an Intro Class", links to contact.html). Photo of a beginner-friendly class |
| 4 | CTA | `action-bar` | `highlight` | `fullwidth: true`, `top_spacing: auto`. Blocks: heading (2xl, "Can't Find a Time That Works?") → button (primary, "Request a Private Session" + secondary "Contact Us", links to contact.html). Fullwidth variation |

### About (`about.json`) — 6 widgets

| # | Widget | Type | Color Scheme | Key Configuration |
|---|--------|------|-------------|-------------------|
| 1 | Hero | `banner` | `highlight` | `height: small`, `fullwidth: true`, `alignment: center`. `overlay_color: "#2c242080"`. Blocks: heading (4xl, "Our Story"). `top_spacing: none` |
| 2 | Story | `image-text` | `standard` | `image_position: right`, `text_position: center`, `content_color_scheme: none`. Blocks: text (sm, muted, uppercase, "SINCE 2018") → heading (2xl, "Born from a Love of Practice") → text (base, founding story paragraph) → text (base, second paragraph about community). Photo of studio founder |
| 3 | Values | `features-split` | `standard-accent` | `eyebrow: "What Guides Us"`, `title: "Our Values"`, `heading_alignment: center`, `content_position: right`, `show_divider: false`, `icon_style: outline`, `icon_size: lg`, `icon_shape: circle`. 3 features: "Accessible to All" (unlock), "Rooted in Tradition" (tree-deciduous), "Community First" (users) |
| 4 | Team | `profile-grid` | `standard` | `eyebrow: "The Teachers"`, `title: "Meet Our Instructors"`, `heading_alignment: center`, `columns_desktop: 3`, `layout: grid`. 3 profiles with photo, name, role (e.g., "Lead Yoga Instructor"), specialty (e.g., "Vinyasa & Yin"), short bio. Instagram links for each |
| 5 | Studio Gallery | `gallery` | `standard-accent` | `eyebrow: ""`, `title: "The Studio"`, `heading_alignment: center`, `layout: grid`, `columns_desktop: 3`, `staggered: true`, `aspect_ratio: 4 / 3`. 6 images of studio spaces — practice room, entrance, changing area, props wall, outdoor courtyard, tea corner. Captions on each |
| 6 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Blocks: heading (2xl, "Come Practice With Us") → text (base, muted, "Your first class is always free.") → button (primary, "Book a Class", links to contact.html). Contained |

### Gallery (`gallery.json`) — 3 widgets

| # | Widget | Type | Color Scheme | Key Configuration |
|---|--------|------|-------------|-------------------|
| 1 | Hero | `banner` | `highlight` | `height: small`, `fullwidth: true`, `alignment: center`. `overlay_color: "#2c242080"`. Blocks: heading (4xl, "Gallery"). `top_spacing: none` |
| 2 | Gallery | `gallery` | `standard` | `eyebrow: ""`, `title: "Moments at Stillpoint"`, `heading_alignment: center`, `layout: grid`, `columns_desktop: 4`, `staggered: true`, `aspect_ratio: auto`. 12 images — mix of classes in session, studio details, community events, seasonal workshops. Captions on each |
| 3 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Blocks: heading (2xl, "See Yourself Here?") → button (primary, "Try a Free Class", links to contact.html) |

### Contact (`contact.json`) — 4 widgets

| # | Widget | Type | Color Scheme | Key Configuration |
|---|--------|------|-------------|-------------------|
| 1 | Hero | `banner` | `highlight` | `height: small`, `fullwidth: true`, `alignment: center`. `overlay_color: "#2c242080"`. Blocks: heading (4xl, "Get in Touch"). `top_spacing: none` |
| 2 | Contact | `image-text` | `standard` | `image_position: right`, `text_position: flex-start`, `content_color_scheme: none`. Blocks: heading (2xl, "We'd Love to Hear from You") → text (base, "Whether you're booking your first class or have a question about our schedule, we're here to help.") → text (base, "<p>82 Willow Street, Brooklyn, NY 11201<br>hello@stillpointyoga.com<br>(718) 555-0234</p>") → button (primary, "Book a Class"). Photo of the studio entrance/welcome area |
| 3 | Map | `map` | `standard-accent` | `title: "Find the Studio"`, `heading_alignment: left`, `address: "82 Willow Street, Brooklyn, NY 11201"`, `height: medium`, `show_address: true`, `sidebar_position: right`. 1 info block: "Studio Hours" with weekday/weekend hours. 1 social block |
| 4 | FAQ | `accordion` | `standard` | `eyebrow: ""`, `title: "Frequently Asked Questions"`, `heading_alignment: center`, `style: separated`, `allow_multiple: false`. 4 items: "Where do I park?", "Do you offer private lessons?", "What's the best class for beginners?", "How do I cancel a booking?" No sidebar — clean ending before footer |

---

## Menus

### main-menu.json

| Label | URL |
|-------|-----|
| Classes | classes.html |
| Schedule | schedule.html |
| About | about.html |
| Gallery | gallery.html |
| Contact | contact.html |

### footer-menu.json

| Label | URL |
|-------|-----|
| Classes | classes.html |
| Schedule | schedule.html |
| About | about.html |
| Gallery | gallery.html |
| Contact | contact.html |

---

## Widget Usage Summary

| Widget Type | Count |
|-------------|-------|
| `banner` | 6 (home hero + 5 subpage heroes) |
| `scrolling-text` | 1 |
| `rich-text` | 1 |
| `icon-card-grid` | 2 |
| `image-text` | 4 |
| `steps` | 1 |
| `trust-bar` | 1 |
| `action-bar` | 4 |
| `features-split` | 2 |
| `accordion` | 2 |
| `schedule-table` | 1 |
| `profile-grid` | 1 |
| `gallery` | 2 |
| `map` | 1 |

**Unique widget types used: 14**
**Total widget instances: 30**

---

## Header Differentiation Notes

Stillpoint's header is the **most minimal across all presets**: no contact details, centered navigation, primary CTA button, standard color scheme, not sticky, not transparent. This creates a calm, uncluttered top bar where the only color pop is the terracotta "Book a Class" pill button against the warm off-white background.

**Key differences from each existing preset:**

| Setting | Saffron | Brewline | Crumbly | Corkwell | Stillpoint |
|---------|---------|----------|---------|----------|------------|
| Contact details | Yes (logo) | No | Yes (menu) | No | **No** |
| Center nav | No | Yes | No | No | **Yes** |
| CTA style | Primary | Secondary | Primary | Secondary | **Primary** |
| Sticky | Yes | No | Yes | No | **No** |
| Transparent | Yes | No | No | Yes | **No** |
| Color scheme | Standard | Standard | Standard | Highlight | **Standard** |
| CTA text | Reserve a Table | View Menu | Order a Cake | Drinks & Bites | **Book a Class** |

While Brewline also uses centered nav + no contact, Stillpoint differentiates with a primary CTA (vs. secondary), different CTA text, and the completely different color/typography context (terracotta pill button in Cormorant Garamond vs. sage green in Lora).
