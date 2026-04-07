# Velvet Touch — Spa / Massage

## Identity

**Name:** Velvet Touch
**Industry:** Spa / Massage
**Personality:** Luxurious, serene, and unhurried. Velvet Touch is a boutique day spa offering massage therapy, facials, and body treatments in a refined, intimate setting. The brand whispers rather than shouts — muted rose tones, soft serif typography, and generous negative space. Copy is warm, sensory, and inviting without being overly clinical.

---

## preset.json Settings

### Color Palette

| Token | Value | Rationale |
|-------|-------|-----------|
| `standard_bg_primary` | `#fdf9f7` | Barely-there blush white — warmer and softer than pure white |
| `standard_bg_secondary` | `#f3ebe6` | Soft rose-beige for banding sections, like powdered stone |
| `standard_text_heading` | `#2a2024` | Deep plum-brown — rich and grounding without being black |
| `standard_text_content` | `#4d4145` | Warm rose-gray for comfortable body text |
| `standard_text_muted` | `#8c7e82` | Dusty mauve for secondary text |
| `standard_border_color` | `#e0d5d0` | Warm blush border, nearly invisible against cream |
| `standard_accent` | `#8c5e6b` | Deep rose / mauve — sophisticated, luxurious, unique across all presets |
| `standard_accent_text` | `#ffffff` | White on deep rose for clear contrast |
| `standard_rating_star` | `#d4a060` | Warm gold stars — luxury warmth |
| `highlight_bg_primary` | `#2a2024` | Deep plum-brown matching headings — moody and intimate |
| `highlight_bg_secondary` | `#1e1618` | Darker plum-espresso for highlight banding |
| `highlight_text_heading` | `#f5efe8` | Warm ivory headings on dark — soft, not harsh white |
| `highlight_text_content` | `#c4b8b0` | Muted rose-sand for body text on dark |
| `highlight_text_muted` | `#8e807a` | Faded warm taupe on dark |
| `highlight_border_color` | `#3e3035` | Subtle plum border on dark |
| `highlight_accent` | `#c9929e` | Lighter rose on dark backgrounds — softer, more romantic |
| `highlight_accent_text` | `#1e1618` | Dark text on light rose buttons |
| `highlight_rating_star` | `#d4a060` | Consistent gold stars |

### Typography

```json
"heading_font": { "stack": "\"Bodoni Moda\", serif", "weight": 400 },
"body_font": { "stack": "\"Lato\", sans-serif", "weight": 300 }
```

**Rationale:** Bodoni Moda at weight 400 is high-contrast and razor-elegant — thin hairlines with dramatic thick strokes evoke luxury fashion and editorial beauty. Lato at weight 300 (light) is warm and humanist, creating an airy, breathable reading experience. Neither font has been used by any existing preset.

Additional settings:
- `heading_scale`: `100` — default, Bodoni's high contrast already commands attention
- `body_scale`: `100` — default body size

### Style Settings

| Setting | Value | Rationale |
|---------|-------|-----------|
| `corner_style` | `slightly-rounded` | Refined softness — not as casual as fully rounded, not as stark as sharp |
| `spacing_density` | `default` | Balanced — luxury breathes but doesn't feel empty |
| `button_shape` | `auto` | Follows slightly-rounded corners for visual harmony |

---

## Header Configuration

```json
{
  "logoText": "Velvet Touch",
  "contactDetailsLine1": "Open daily, 10 AM – 8 PM",
  "contactDetailsLine2": "",
  "contact_position": "menu",
  "headerNavigation": "main-menu",
  "center_nav": false,
  "ctaButtonLink": { "href": "contact.html", "text": "Book Now", "target": "_self" },
  "ctaButtonStyle": "secondary",
  "full_width": true,
  "sticky": true,
  "transparent_on_hero": false,
  "color_scheme": "standard-accent"
}
```

### Header Differentiation Notes

**Unique combination:** `standard-accent` color scheme (first preset to use this) + contact at `menu` position + sticky + NOT transparent + NOT centered + secondary CTA. The `standard-accent` header creates a subtle warm banding at the top — not a dark bar like Corkwell, but a soft rose-beige strip that feels polished. Hours displayed in the nav area reinforce the spa's availability.

Comparison:
- Saffron: standard + contact at logo + sticky + transparent + primary CTA
- Brewline: standard + no contact + centered + secondary CTA
- Crumbly: standard + contact at menu + sticky + primary CTA
- Corkwell: highlight + no contact + transparent + secondary CTA
- Stillpoint: standard + no contact + centered + primary CTA
- **Velvet Touch: standard-accent + contact at menu + sticky + NOT transparent + secondary CTA**

Differs from Crumbly (the only other `contact_position: menu`) by using `standard-accent` scheme (vs. `standard`) and secondary CTA (vs. primary). Totally different color and typography context.

---

## Footer Configuration

```json
{
  "copyright": "© 2026 Velvet Touch Day Spa. All rights reserved.",
  "color_scheme": "highlight"
}
```

### Footer Blocks

1. **logo_text** — `logo_text: "Velvet Touch"`, `text: "<p>A boutique day spa offering massage therapy, facials, and body treatments in an intimate, luxurious setting.</p>"`
2. **text_block** — `title: "Hours"`, `text: "<p>Monday — Sunday<br>10:00 AM – 8:00 PM</p><p>Last appointment at 7:00 PM</p>"`
3. **menu_block** — `title: "Quick Links"`, `menu: "footer-menu"`
4. **social_block** — `title: "Follow Us"`

---

## Pages

### Home (`index.json`) — 7 widgets

| # | Widget | Type | Color Scheme | Key Configuration |
|---|--------|------|-------------|-------------------|
| 1 | Hero | `split-hero` | `highlight` | `image_position: left`. Blocks: text (sm, muted, uppercase, "BOUTIQUE DAY SPA") → heading (5xl, "Indulge in Stillness") → text (lg, "Massage, facials, and body treatments designed to restore you.") → button (primary "View Treatments" + secondary "Book Now", medium). Moody, atmospheric spa interior photo. `top_spacing: none` |
| 2 | Trust Strip | `trust-bar` | `standard` | `icon_style: filled`, `icon_size: md`, `icon_shape: rounded`, `alignment: left`, `show_dividers: true`. 4 items: clock/"Open 7 Days"/"10 AM – 8 PM", award/"Award Winning"/"Best Spa 2025", shield/"Licensed Therapists"/"Certified & Insured", leaf/"Clean Beauty"/"Natural Products Only" |
| 3 | Treatments | `sliding-panels` | `standard-accent` | `eyebrow: "Our Treatments"`, `title: "Explore What We Offer"`, `heading_alignment: center`. 4 panels: "Massage Therapy" (hands on back) → "Facials" (skincare close-up) → "Body Treatments" (scrub/wrap) → "Couples Packages" (dual treatment room). Each with subtitle and "Learn More" link to treatments.html |
| 4 | About Teaser | `image-callout` | `standard` | `image_position: right`. Blocks: text (sm, muted, uppercase, "OUR PHILOSOPHY") → heading (2xl, "Touch Is a Language") → text (base, paragraph about their holistic approach) → button (secondary, "About Us", links to about.html). Warm photo of hands preparing treatment oils |
| 5 | Testimonials | `testimonial-slider` | `highlight` | `autoplay: true`, `autoplay_speed: 6000`. 3 quotes with avatars: 5-star reviews about specific treatments. Personal, specific language ("The hot stone massage changed how I sleep") |
| 6 | Gift Cards | `rich-text` | `standard-accent` | `text_alignment: center`, `content_width: medium`. Blocks: heading (3xl, "The Gift of Rest") → text (base, "Treat someone you love to a Velvet Touch experience. Gift cards available in any amount.") → button (primary, "Buy a Gift Card", medium, links to contact.html) |
| 7 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Blocks: heading (2xl, "Ready to Unwind?") → text (base, muted, "Same-day appointments available.") → button (primary, "Book an Appointment", links to contact.html) |

### Services (`services.json`) — 6 widgets

| # | Widget | Type | Color Scheme | Key Configuration |
|---|--------|------|-------------|-------------------|
| 1 | Hero | `banner` | `highlight` | `height: small`, `fullwidth: true`, `alignment: center`, `overlay_color: "#2a202480"`. Blocks: heading (4xl, "Our Services"). `top_spacing: none`, `bottom_spacing: none` |
| 2 | Services | `card-grid` | `standard` | `eyebrow: ""`, `title: "What We Offer"`, `heading_alignment: center`, `columns_desktop: 3`, `card_layout: box`, `alignment: center`, `aspect_ratio: 3 / 4`, `image_position: top`. 6 cards: "Swedish Massage" / "Deep Tissue" / "Hot Stone" / "Signature Facial" / "Body Scrub" / "Couples Retreat". Each with photo, subtitle (duration "60 min"), description, "Book Now" link |
| 3 | Why Us | `trust-bar` | `highlight` | `icon_style: outline`, `icon_size: xl`, `icon_shape: circle`, `alignment: centered`, `show_dividers: false`. 3 items: sparkles/"Luxury Products"/"Organic & cruelty-free", hand-heart/"Expert Therapists"/"500+ hours certified", lock/"Private Rooms"/"Complete comfort & privacy" |
| 4 | Process | `image-text` | `standard-accent` | `image_position: right`, `text_position: center`, `content_color_scheme: none`. Blocks: text (sm, muted, uppercase, "YOUR VISIT") → heading (2xl, "What to Expect") → numbered-item ("Arrive & Relax", circle) → numbered-item ("Consultation", circle) → numbered-item ("Your Treatment", circle) → numbered-item ("Aftercare", circle) → button (secondary, "Book Your Visit", links to contact.html) |
| 5 | Pricing | `pricing` | `standard` | `eyebrow: "Pricing"`, `title: "Treatment Packages"`, `heading_alignment: center`, `columns_desktop: 3`. 3 plans: "Essential" ($89, 60 min, Swedish or deep tissue, aromatherapy, hot towels, featured: false) / "Signature" ($139, 90 min, full-body massage + express facial, scalp treatment, priority booking, featured: true) / "Luxe Retreat" ($199, 120 min, full-body massage + facial + body scrub, champagne, extended aftercare lounge, featured: false) |
| 6 | CTA | `action-bar` | `highlight` | `fullwidth: true`. Blocks: heading (2xl, "Not Sure Which Treatment?") → button (primary, "Call Us" + secondary "View Treatments", links to contact.html / treatments.html) |

### Treatments (`treatments.json`) — 5 widgets

| # | Widget | Type | Color Scheme | Key Configuration |
|---|--------|------|-------------|-------------------|
| 1 | Hero | `banner` | `highlight` | `height: small`, `fullwidth: true`, `alignment: center`, `overlay_color: "#2a202480"`. Blocks: heading (4xl, "Treatments"). `top_spacing: none`, `bottom_spacing: none` |
| 2 | Massage | `image-text` | `standard` | `image_position: left`, `text_position: center`, `content_color_scheme: none`. Blocks: text (sm, muted, uppercase, "MASSAGE THERAPY") → heading (2xl, "Tension Dissolves Here") → text (base, description of massage modalities offered) → features ("+ Swedish Relaxation\n+ Deep Tissue\n+ Hot Stone\n+ Sports Recovery\n+ Prenatal") → button (primary, "Book a Massage", links to contact.html) |
| 3 | Facials | `image-text` | `standard-accent` | `image_position: right`, `text_position: center`, `content_color_scheme: none`. Blocks: text (sm, muted, uppercase, "FACIALS") → heading (2xl, "Your Skin, Renewed") → text (base, description of facial treatments) → features ("+ Signature Facial\n+ Express Glow\n+ Anti-Aging Lift\n+ Hydra-Soothe\n+ Gentleman's Facial") → button (primary, "Book a Facial", links to contact.html) |
| 4 | Body | `image-text` | `standard` | `image_position: left`, `text_position: center`, `content_color_scheme: none`. Blocks: text (sm, muted, uppercase, "BODY TREATMENTS") → heading (2xl, "Full-Body Restoration") → text (base, description of body treatments) → features ("+ Sugar Body Scrub\n+ Detox Mud Wrap\n+ Aromatherapy Cocoon\n+ Salt & Oil Glow") → button (primary, "Book a Body Treatment", links to contact.html) |
| 5 | Couples | `image-callout` | `highlight` | `image_position: right`. Blocks: heading (3xl, "Better Together") → text (base, "Share the experience with someone special. Our couples suite features side-by-side treatment tables, ambient lighting, and a complimentary champagne toast.") → button (primary, "Book a Couples Session", large, links to contact.html). Photo of a dual treatment room |

### About (`about.json`) — 6 widgets

| # | Widget | Type | Color Scheme | Key Configuration |
|---|--------|------|-------------|-------------------|
| 1 | Hero | `banner` | `highlight` | `height: small`, `fullwidth: true`, `alignment: center`, `overlay_color: "#2a202480"`. Blocks: heading (4xl, "About Us"). `top_spacing: none`, `bottom_spacing: none` |
| 2 | Story | `image-text` | `standard` | `image_position: right`, `text_position: center`, `content_color_scheme: none`. Blocks: text (sm, muted, uppercase, "EST. 2016") → heading (2xl, "Where Luxury Meets Healing") → text (base, founding story) → text (base, second paragraph about philosophy). Photo of founder in spa environment |
| 3 | Values | `trust-bar` | `standard-accent` | `icon_style: outline`, `icon_size: xl`, `icon_shape: circle`, `alignment: centered`, `show_dividers: false`. 4 items: leaf/"Natural Ingredients"/"Clean, organic products only", heart/"Personalized Care"/"Every treatment tailored to you", eye/"Attention to Detail"/"Nothing overlooked", shield/"Your Privacy"/"Discreet, comfortable spaces" |
| 4 | Team | `profile-grid` | `standard` | `eyebrow: "The Team"`, `title: "Meet Our Therapists"`, `heading_alignment: center`, `columns_desktop: 4`, `layout: grid`. 4 profiles: name + role (e.g., "Licensed Massage Therapist") + specialty (e.g., "Deep Tissue & Sports") + short bio. Instagram links for each |
| 5 | Space | `gallery` | `standard-accent` | `eyebrow: ""`, `title: "The Space"`, `heading_alignment: center`, `layout: grid`, `columns_desktop: 3`, `staggered: true`, `aspect_ratio: 4 / 3`. 6 images: reception, treatment room, relaxation lounge, product wall, courtyard, retail area. Captions on each |
| 6 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Blocks: heading (2xl, "Experience It Yourself") → text (base, muted, "Your first visit includes a complimentary consultation.") → button (primary, "Book Now", links to contact.html) |

### Gallery (`gallery.json`) — 3 widgets

| # | Widget | Type | Color Scheme | Key Configuration |
|---|--------|------|-------------|-------------------|
| 1 | Hero | `banner` | `highlight` | `height: small`, `fullwidth: true`, `alignment: center`, `overlay_color: "#2a202480"`. Blocks: heading (4xl, "Gallery"). `top_spacing: none`, `bottom_spacing: none` |
| 2 | Gallery | `gallery` | `standard` | `eyebrow: ""`, `title: "Inside Velvet Touch"`, `heading_alignment: center`, `layout: grid`, `columns_desktop: 3`, `staggered: false`, `aspect_ratio: 1 / 1`. 9 square images — treatment rooms, product close-ups, relaxation areas, therapist hands at work, essential oils, hot stones, candles, reception, courtyard. Captions on each |
| 3 | CTA | `action-bar` | `highlight` | `fullwidth: true`. Blocks: heading (2xl, "Like What You See?") → button (primary, "Book a Treatment", links to contact.html) |

### Contact (`contact.json`) — 4 widgets

| # | Widget | Type | Color Scheme | Key Configuration |
|---|--------|------|-------------|-------------------|
| 1 | Hero | `banner` | `highlight` | `height: small`, `fullwidth: true`, `alignment: center`, `overlay_color: "#2a202480"`. Blocks: heading (4xl, "Book Your Visit"). `top_spacing: none`, `bottom_spacing: none` |
| 2 | Contact | `image-text` | `standard` | `image_position: left`, `text_position: flex-start`, `content_color_scheme: none`. Blocks: heading (2xl, "We'd Love to Welcome You") → text (base, "Whether it's your first visit or your hundredth, we're here to help you find the right treatment.") → text (base, "<p>34 Garden Street, Suite 2<br>Manhattan, NY 10014</p><p>hello@velvettouch.com<br>(212) 555-0187</p>") → button (primary, "Book Now"). Photo of the spa entrance |
| 3 | Map | `map` | `standard-accent` | `title: "Find Us"`, `heading_alignment: left`, `address: "34 Garden Street, Suite 2, Manhattan, NY 10014"`, `height: medium`, `show_address: true`, `sidebar_position: right`. 1 info block: "Spa Hours" with daily hours. 1 social block |
| 4 | FAQ | `accordion` | `standard` | `eyebrow: ""`, `title: "Frequently Asked Questions"`, `heading_alignment: center`, `style: separated`, `allow_multiple: false`. 5 items: "What should I wear?", "How early should I arrive?", "Can I request a specific therapist?", "Do you offer prenatal massage?", "What's your cancellation policy?". No sidebar |

---

## Menus

### main-menu.json

| Label | URL |
|-------|-----|
| Services | services.html |
| Treatments | treatments.html |
| About | about.html |
| Gallery | gallery.html |
| Contact | contact.html |

### footer-menu.json

| Label | URL |
|-------|-----|
| Services | services.html |
| Treatments | treatments.html |
| About | about.html |
| Gallery | gallery.html |
| Contact | contact.html |

---

## Widget Usage Summary

| Widget Type | Count |
|-------------|-------|
| `split-hero` | 1 |
| `banner` | 5 (subpage heroes) |
| `trust-bar` | 3 |
| `sliding-panels` | 1 |
| `image-callout` | 2 |
| `testimonial-slider` | 1 |
| `rich-text` | 1 |
| `action-bar` | 4 |
| `card-grid` | 1 |
| `image-text` | 5 |
| `pricing` | 1 |
| `profile-grid` | 1 |
| `gallery` | 2 |
| `map` | 1 |
| `accordion` | 1 |

**Unique widget types used: 15**
**Total widget instances: 31**

---

## Header Differentiation Notes

Velvet Touch is the **first preset to use `standard-accent` header color scheme**, creating a distinctive warm rose-beige bar at the top. Combined with `contact_position: menu` (hours in the nav area), `sticky: true`, and a `secondary` CTA, this is a polished, informational header that stays visible as users scroll through long treatment pages.

**Key differences from each existing preset:**

| Setting | Saffron | Brewline | Crumbly | Corkwell | Stillpoint | Velvet Touch |
|---------|---------|----------|---------|----------|------------|--------------|
| Color scheme | standard | standard | standard | highlight | standard | **standard-accent** |
| Contact details | Yes (logo) | No | Yes (menu) | No | No | **Yes (menu)** |
| Center nav | No | Yes | No | No | Yes | **No** |
| CTA style | Primary | Secondary | Primary | Secondary | Primary | **Secondary** |
| Sticky | Yes | No | Yes | No | No | **Yes** |
| Transparent | Yes | No | No | Yes | No | **No** |
| CTA text | Reserve a Table | View Menu | Order a Cake | Drinks & Bites | Book a Class | **Book Now** |

While Crumbly also uses `contact at menu + sticky`, Velvet Touch differentiates with `standard-accent` scheme (warm background band), `secondary` CTA (vs. primary), no transparency, and completely different content/typography.
