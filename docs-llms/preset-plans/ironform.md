# Ironform — Personal Trainer

## Identity

**Name:** Ironform
**Industry:** Personal Trainer / Fitness Coaching
**Personality:** Intense, direct, and results-driven. Ironform is a solo personal trainer building a brand around discipline, transformation, and no-nonsense programming. The aesthetic is bold and muscular — dark backgrounds, punchy orange accents, condensed typography that feels like it's shouting from a gym wall. Copy is motivational but grounded in real results, never cheesy.

---

## preset.json Settings

### Color Palette

| Token | Value | Rationale |
|-------|-------|-----------|
| `standard_bg_primary` | `#ffffff` | Clean white — lets the bold orange and dark sections do the talking |
| `standard_bg_secondary` | `#f2f2f0` | Neutral warm gray for banding — gym-concrete feel |
| `standard_text_heading` | `#141414` | Near-black — maximum contrast, maximum impact |
| `standard_text_content` | `#3a3a3a` | Dark charcoal body text |
| `standard_text_muted` | `#717171` | Neutral mid-gray for secondary text |
| `standard_border_color` | `#e0e0e0` | Clean neutral border |
| `standard_accent` | `#e06820` | Bold orange — fiery, energetic, athletic. Unique across all presets |
| `standard_accent_text` | `#ffffff` | White on orange for punch |
| `standard_rating_star` | `#f0b429` | Gold stars |
| `highlight_bg_primary` | `#141414` | Near-black — intense, gym-dark |
| `highlight_bg_secondary` | `#0a0a0a` | Deeper black for highlight banding |
| `highlight_text_heading` | `#ffffff` | Pure white on dark |
| `highlight_text_content` | `#b5b5b5` | Neutral light gray body on dark |
| `highlight_text_muted` | `#808080` | Mid-gray muted on dark |
| `highlight_border_color` | `#2a2a2a` | Subtle dark border |
| `highlight_accent` | `#f08040` | Lighter orange on dark — stays visible and warm |
| `highlight_accent_text` | `#141414` | Dark text on light orange buttons |
| `highlight_rating_star` | `#f0b429` | Consistent gold stars |

### Typography

```json
"heading_font": { "stack": "\"Oswald\", sans-serif", "weight": 700 },
"body_font": { "stack": "\"Archivo\", sans-serif", "weight": 400 }
```

**Rationale:** Oswald at 700 is condensed and bold — it reads like gym signage, commanding and athletic. Archivo at 400 is a clean geometric sans-serif with excellent readability for workout descriptions and program details. Neither font has been used by any existing preset.

Additional settings:
- `heading_scale`: `110` — oversized headings for impact
- `body_scale`: `100` — default

### Style Settings

| Setting | Value | Rationale |
|---------|-------|-----------|
| `corner_style` | `sharp` | Hard edges — no softness, pure discipline |
| `spacing_density` | `default` | Balanced — content-dense but not cramped |
| `button_shape` | `sharp` | Squared-off CTAs match the sharp corner style — bold and decisive |

---

## Header Configuration

```json
{
  "logoText": "Ironform",
  "contactDetailsLine1": "(917) 555-0448",
  "contactDetailsLine2": "",
  "contact_position": "logo",
  "headerNavigation": "main-menu",
  "center_nav": false,
  "ctaButtonLink": { "href": "contact.html", "text": "Get Started", "target": "_self" },
  "ctaButtonStyle": "secondary",
  "full_width": true,
  "sticky": false,
  "transparent_on_hero": true,
  "color_scheme": "standard"
}
```

### Header Differentiation Notes

**Unique combination:** `standard` scheme + contact at `logo` (phone only, no address) + NOT sticky + transparent on hero + NOT centered + secondary CTA. The transparent standard header over a dark slideshow hero creates an immersive, full-bleed experience where the first thing visitors see is the training imagery. Phone number visible but not heavy — a trainer's brand is visual, not corporate.

Comparison:
- Saffron: standard + contact at logo + sticky + transparent + primary CTA
- Brewline: standard + no contact + centered + NOT transparent + secondary CTA
- Crumbly: standard + contact at menu + sticky + NOT transparent + primary CTA
- Corkwell: highlight + no contact + transparent + secondary CTA
- Stillpoint: standard + no contact + centered + NOT transparent + primary CTA
- Velvet Touch: standard-accent + contact at menu + sticky + NOT transparent + secondary CTA
- Brightside: highlight-accent + contact at logo + NOT sticky + NOT transparent + primary CTA
- **Ironform: standard + contact at logo (phone only) + NOT sticky + transparent + secondary CTA**

Differs from Saffron (the closest — also standard+contact at logo+transparent) by NOT being sticky and using secondary CTA instead of primary. Also only one contact line (phone) vs. Saffron's two (phone + address).

---

## Footer Configuration

```json
{
  "copyright": "© 2026 Ironform Training. All rights reserved.",
  "color_scheme": "highlight"
}
```

### Footer Blocks

1. **logo_text** — `logo_text: "Ironform"`, `text: "<p>Personal training and fitness coaching in Brooklyn. Strength, conditioning, and transformation programs built for real results.</p>"`
2. **text_block** — `title: "Training Hours"`, `text: "<p>Monday — Friday: 6 AM – 9 PM<br>Saturday: 7 AM – 4 PM<br>Sunday: By appointment</p>"`
3. **menu_block** — `title: "Links"`, `menu: "footer-menu"`
4. **social_block** — `title: "Follow the Grind"`

---

## Pages

### Home (`index.json`) — 7 widgets

| # | Widget | Type | Color Scheme | Key Configuration |
|---|--------|------|-------------|-------------------|
| 1 | Hero | `slideshow` | per-slide `highlight` | `height: large`, `fullwidth: true`, `alignment: start`, `autoplay: true`, `autoplay_speed: 4000`. 3 slides. Slide 1: heading (6xl, "Train Hard. Live Strong.") + text (lg) + button (primary "Start Training" + secondary "View Programs"). Slide 2: heading (5xl, "12-Week Transformation Program") + text (lg, "Structured strength and conditioning for serious results.") + button (primary "See Transformations"). Slide 3: heading (5xl, "1-on-1 Coaching") + text (lg, "Every rep, every set, every meal — programmed for you.") + button (primary "Get Started"). `top_spacing: none` |
| 2 | Marquee | `scrolling-text` | — | `text: "No Shortcuts"`, `separator: "///"`, `speed: 10`, `rotate: -3`, `font_size: xl`, `bg_color: "#e06820"`, `text_color: "#ffffff"`. `top_spacing: none`, `bottom_spacing: none`. Aggressive, high-energy. Angled strip |
| 3 | Stats | `trust-bar` | `standard` | `icon_style: plain`, `icon_size: sm`, `icon_shape: sharp`, `alignment: centered`, `show_dividers: true`. 4 items: title-as-numbers. "500+"/"Clients Trained", "12"/"Years Experience", "98%"/"Goal Completion", "4.9"/"Google Rating". Stats strip for credibility |
| 4 | Programs | `card-grid` | `standard-accent` | `eyebrow: "Programs"`, `title: "Built for Results"`, `heading_alignment: center`, `columns_desktop: 3`, `card_layout: box`, `alignment: center`, `aspect_ratio: 3 / 4`, `image_position: top`. 3 cards: "Strength & Hypertrophy" (barbell photo, subtitle "12 Weeks") / "Fat Loss & Conditioning" (HIIT photo, subtitle "8 Weeks") / "1-on-1 Coaching" (training session photo, subtitle "Ongoing"). Each with description + "Learn More" link to programs.html |
| 5 | Before/After | `comparison-slider` | `standard` | `eyebrow: "Real Results"`, `title: "The Proof Is in the Work"`, `heading_alignment: center`, `orientation: vertical`, `initial_position: 40`, `show_labels: true`, `before_label: "Day 1"`, `after_label: "Week 12"`. Full-body transformation photo pair. Vertical orientation for portrait body shots |
| 6 | Testimonials | `testimonials` | `highlight` | `eyebrow: ""`, `title: "What Clients Say"`, `heading_alignment: center`, `layout: grid`, `columns_desktop: 3`, `card_layout: box`. 3 quotes with avatars, all 5-star, specific training results ("Lost 30 lbs in 12 weeks", "First pull-up at 42") |
| 7 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Blocks: heading (3xl, "Stop Thinking. Start Training.") → button (primary, "Book a Free Consultation", links to contact.html) |

### Programs (`programs.json`) — 6 widgets

| # | Widget | Type | Color Scheme | Key Configuration |
|---|--------|------|-------------|-------------------|
| 1 | Hero | `banner` | `highlight` | `height: small`, `fullwidth: true`, `alignment: center`, `overlay_color: "#141414a0"`. Blocks: heading (4xl, "Programs"). `top_spacing: none`, `bottom_spacing: none` |
| 2 | Strength | `image-text` | `standard` | `image_position: left`, `text_position: center`, `content_color_scheme: none`. Blocks: text (sm, muted, uppercase, "12-WEEK PROGRAM") → heading (2xl, "Strength & Hypertrophy") → text (base, program description) → features ("+ Progressive overload programming\n+ Compound lift focus\n+ Nutrition guidance included\n+ Weekly check-ins") → button (primary, "Sign Up", links to contact.html). Photo of barbell training |
| 3 | Fat Loss | `image-text` | `standard-accent` | `image_position: right`, `text_position: center`, `content_color_scheme: none`. Blocks: text (sm, muted, uppercase, "8-WEEK PROGRAM") → heading (2xl, "Fat Loss & Conditioning") → text (base, program description) → features ("+ HIIT + strength hybrid\n+ Metabolic circuits\n+ Meal plan included\n+ Progress photos every 2 weeks") → button (primary, "Sign Up", links to contact.html). Photo of conditioning workout |
| 4 | Coaching | `image-text` | `standard` | `image_position: left`, `text_position: center`, `content_color_scheme: none`. Blocks: text (sm, muted, uppercase, "ONGOING") → heading (2xl, "1-on-1 Coaching") → text (base, description of personal coaching) → features ("+ Fully customized programming\n+ In-person or remote sessions\n+ Nutrition + recovery protocols\n+ Unlimited messaging support") → button (primary, "Apply Now", links to contact.html). Photo of 1-on-1 session |
| 5 | Video | `video-embed` | `highlight` | `eyebrow: ""`, `title: "See a Session in Action"`, `heading_alignment: center`, `video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"`, `video_title: "Ironform Training Session"`, `aspect_ratio: 16 / 9"` |
| 6 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Blocks: heading (2xl, "Ready to Commit?") → text (base, muted, "Book a free 30-minute consultation. No obligation.") → button (primary, "Book Free Consultation", links to contact.html) |

### Transformations (`transformations.json`) — 4 widgets

| # | Widget | Type | Color Scheme | Key Configuration |
|---|--------|------|-------------|-------------------|
| 1 | Hero | `banner` | `highlight` | `height: small`, `fullwidth: true`, `alignment: center`, `overlay_color: "#141414a0"`. Blocks: heading (4xl, "Transformations"). `top_spacing: none`, `bottom_spacing: none` |
| 2 | Before/After | `comparison-slider` | `standard` | `title: "12-Week Strength Program"`, `heading_alignment: center`, `orientation: vertical`, `initial_position: 50`, `show_labels: true`, `before_label: "Day 1"`, `after_label: "Week 12"` |
| 3 | Gallery | `gallery` | `standard-accent` | `eyebrow: ""`, `title: "Client Results"`, `heading_alignment: center`, `layout: grid`, `columns_desktop: 3`, `staggered: false`, `aspect_ratio: 3 / 4`. 9 portrait images of client transformation results. Captions with program name + timeframe |
| 4 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Blocks: heading (2xl, "Your Transformation Starts Now") → button (primary, "Book Free Consultation", links to contact.html) |

### About (`about.json`) — 5 widgets

| # | Widget | Type | Color Scheme | Key Configuration |
|---|--------|------|-------------|-------------------|
| 1 | Hero | `banner` | `highlight` | `height: small`, `fullwidth: true`, `alignment: center`, `overlay_color: "#141414a0"`. Blocks: heading (4xl, "About"). `top_spacing: none`, `bottom_spacing: none` |
| 2 | Story | `image-text` | `standard` | `image_position: right`, `text_position: center`, `content_color_scheme: none`. Blocks: text (sm, muted, uppercase, "THE COACH") → heading (2xl, "Marcus Cole") → text (base, bio paragraph — former athlete, NASM certified, 12 years experience) → text (base, second paragraph about training philosophy). Portrait photo |
| 3 | Credentials | `trust-bar` | `highlight` | `icon_style: outline`, `icon_size: xl`, `icon_shape: sharp`, `alignment: centered`, `show_dividers: false`. 3 items: award/"NASM Certified"/"Personal Trainer", activity/"500+ Clients"/"Trained & Transformed", trophy/"Competition Coach"/"USAPL Powerlifting" |
| 4 | Gallery | `gallery` | `standard` | `eyebrow: ""`, `title: "In the Gym"`, `heading_alignment: center`, `layout: grid`, `columns_desktop: 4`, `staggered: false`, `aspect_ratio: 1 / 1`. 8 square images — training sessions, gym environment, coaching moments, competition day. Captions on each |
| 5 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Blocks: heading (2xl, "Let's Build Something") → button (primary, "Get Started" + secondary "Call (917) 555-0448") |

### Contact (`contact.json`) — 3 widgets

| # | Widget | Type | Color Scheme | Key Configuration |
|---|--------|------|-------------|-------------------|
| 1 | Hero | `banner` | `highlight` | `height: small`, `fullwidth: true`, `alignment: center`, `overlay_color: "#141414a0"`. Blocks: heading (4xl, "Get in Touch"). `top_spacing: none`, `bottom_spacing: none` |
| 2 | Contact | `image-text` | `standard` | `image_position: left`, `text_position: flex-start`, `content_color_scheme: none`. Blocks: heading (2xl, "Book a Free Consultation") → text (base, "30 minutes. No obligation. We'll talk about your goals, your history, and whether we're a good fit.") → text (base, "<p>Iron Athletics Gym<br>450 Atlantic Avenue, Brooklyn, NY 11217</p><p>marcus@ironform.fit<br>(917) 555-0448</p>") → button (primary, "Book Now"). Photo of the gym entrance |
| 3 | Map | `map` | `standard-accent` | `title: "Find the Gym"`, `heading_alignment: left`, `address: "450 Atlantic Avenue, Brooklyn, NY 11217"`, `height: large`, `show_address: true`, `sidebar_position: left`. 1 info block: "Training Hours" with weekday/weekend hours. 1 social block. Left sidebar for prominent contact display |

---

## Menus

### main-menu.json

| Label | URL |
|-------|-----|
| Programs | programs.html |
| Transformations | transformations.html |
| About | about.html |
| Contact | contact.html |

### footer-menu.json

| Label | URL |
|-------|-----|
| Programs | programs.html |
| Transformations | transformations.html |
| About | about.html |
| Contact | contact.html |

---

## Widget Usage Summary

| Widget Type | Count |
|-------------|-------|
| `slideshow` | 1 |
| `banner` | 4 (subpage heroes) |
| `scrolling-text` | 1 |
| `trust-bar` | 2 |
| `card-grid` | 1 |
| `comparison-slider` | 2 |
| `image-text` | 4 |
| `testimonials` | 1 |
| `action-bar` | 4 |
| `video-embed` | 1 |
| `gallery` | 2 |
| `map` | 1 |

**Unique widget types used: 12**
**Total widget instances: 24**

---

## Header Differentiation Notes

Ironform uses `standard` scheme + transparent on hero + contact at logo (phone only) + NOT sticky + secondary CTA — creating an immersive hero experience where the slideshow dominates. The transparent header means the first full viewport is training imagery with the brand name floating on top.

**Key differences from each existing preset:**

| Setting | Saffron | Brewline | Crumbly | Corkwell | Stillpoint | Velvet Touch | Brightside | Ironform |
|---------|---------|----------|---------|----------|------------|--------------|------------|----------|
| Color scheme | standard | standard | standard | highlight | standard | standard-accent | highlight-accent | **standard** |
| Contact | Yes (logo, 2 lines) | No | Yes (menu) | No | No | Yes (menu) | Yes (logo, 2 lines) | **Yes (logo, 1 line)** |
| Center nav | No | Yes | No | No | Yes | No | No | **No** |
| CTA style | Primary | Secondary | Primary | Secondary | Primary | Secondary | Primary | **Secondary** |
| Sticky | Yes | No | Yes | No | No | Yes | No | **No** |
| Transparent | Yes | No | No | Yes | No | No | No | **Yes** |
| Full width | True | True | True | True | True | True | False | **True** |

Differs from Saffron (the other standard+transparent+contact at logo) by: NOT sticky, secondary CTA (vs primary), single contact line (vs two), and a completely different color/typography context (bold orange Oswald vs warm gold Playfair Display).
