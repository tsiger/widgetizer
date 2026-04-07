# Brightside — Dentist

## Identity

**Name:** Brightside
**Industry:** Dentist / Dental Practice
**Personality:** Clean, confident, and reassuring. Brightside is a modern family dental practice that puts patients at ease through transparency, technology, and genuine warmth. The brand is clinical without being cold — bright blues, crisp whites, and geometric typography signal precision while friendly copy removes the anxiety. Professional but never intimidating.

---

## preset.json Settings

### Color Palette

| Token | Value | Rationale |
|-------|-------|-----------|
| `standard_bg_primary` | `#ffffff` | Pure white — clinical cleanliness, no warmth needed |
| `standard_bg_secondary` | `#f0f6fb` | Pale ice blue for banding sections — medical freshness |
| `standard_text_heading` | `#0f1d2e` | Near-black navy — authoritative and sharp |
| `standard_text_content` | `#384858` | Cool slate-blue for body text |
| `standard_text_muted` | `#6e7e8c` | Steel blue-gray for secondary text |
| `standard_border_color` | `#dce4ec` | Cool light border, clinical and clean |
| `standard_accent` | `#2e7dba` | Sky blue — trustworthy, medical, calming. Unique across all presets |
| `standard_accent_text` | `#ffffff` | White on blue for clear contrast |
| `standard_rating_star` | `#f0b429` | Bright gold stars — visibility on white |
| `highlight_bg_primary` | `#0f1d2e` | Deep navy — not generic black, matches heading color |
| `highlight_bg_secondary` | `#081420` | Darker midnight for highlight banding |
| `highlight_text_heading` | `#ffffff` | Pure white headings on dark |
| `highlight_text_content` | `#b8c8d8` | Cool blue-gray body text on dark |
| `highlight_text_muted` | `#7a8e9e` | Muted steel on dark |
| `highlight_border_color` | `#253545` | Subtle navy border on dark |
| `highlight_accent` | `#5ba3d9` | Lighter sky blue on dark — softer, approachable |
| `highlight_accent_text` | `#0f1d2e` | Dark text on light blue buttons |
| `highlight_rating_star` | `#f0b429` | Consistent gold stars |

### Typography

```json
"heading_font": { "stack": "\"Plus Jakarta Sans\", sans-serif", "weight": 700 },
"body_font": { "stack": "\"Inter\", sans-serif", "weight": 400 }
```

**Rationale:** Plus Jakarta Sans at weight 700 is geometric, modern, and confident — the kind of clean authority a dental practice needs. Inter at 400 is the gold standard for screen readability, perfect for medical content where clarity is essential. Neither font has been used by any existing preset.

Additional settings:
- `heading_scale`: `100` — default
- `body_scale`: `100` — default

### Style Settings

| Setting | Value | Rationale |
|---------|-------|-----------|
| `corner_style` | `sharp` | Precision and cleanliness — medical confidence |
| `spacing_density` | `default` | Balanced, professional |
| `button_shape` | `pill` | Softens the sharp edges — friendly contrast, inviting CTAs. No preset combines sharp + pill |

---

## Header Configuration

```json
{
  "logoText": "Brightside",
  "contactDetailsLine1": "(212) 555-0312",
  "contactDetailsLine2": "320 Park Avenue, Suite 4B",
  "contact_position": "logo",
  "headerNavigation": "main-menu",
  "center_nav": false,
  "ctaButtonLink": { "href": "contact.html", "text": "Book Appointment", "target": "_self" },
  "ctaButtonStyle": "primary",
  "full_width": false,
  "sticky": false,
  "transparent_on_hero": false,
  "color_scheme": "highlight-accent"
}
```

### Header Differentiation Notes

**Unique combination:** `highlight-accent` color scheme (first preset to use this) + `full_width: false` (first preset to use this) + contact at `logo` + NOT sticky + NOT transparent + NOT centered + primary CTA. The `highlight-accent` creates a dark accent-tinted header band, while `full_width: false` contains it — a distinctive look no other preset has.

Comparison:
- Saffron: standard + contact at logo + sticky + transparent + full_width true + primary CTA
- Brewline: standard + no contact + centered + full_width true + secondary CTA
- Crumbly: standard + contact at menu + sticky + full_width true + primary CTA
- Corkwell: highlight + no contact + transparent + full_width true + secondary CTA
- Stillpoint: standard + no contact + centered + full_width true + primary CTA
- Velvet Touch: standard-accent + contact at menu + sticky + full_width true + secondary CTA
- **Brightside: highlight-accent + contact at logo + NOT sticky + NOT transparent + full_width false + primary CTA**

---

## Footer Configuration

```json
{
  "copyright": "© 2026 Brightside Dental. All rights reserved.",
  "color_scheme": "highlight"
}
```

### Footer Blocks

1. **logo_text** — `logo_text: "Brightside"`, `text: "<p>Modern family dentistry in Midtown Manhattan. Gentle care, advanced technology, and smiles that last.</p>"`
2. **text_block** — `title: "Office Hours"`, `text: "<p>Monday — Friday: 8 AM – 6 PM<br>Saturday: 9 AM – 2 PM<br>Sunday: Closed</p>"`
3. **menu_block** — `title: "Quick Links"`, `menu: "footer-menu"`
4. **social_block** — `title: "Follow Us"`

---

## Pages

### Home (`index.json`) — 7 widgets

| # | Widget | Type | Color Scheme | Key Configuration |
|---|--------|------|-------------|-------------------|
| 1 | Hero | `banner` | `highlight` | `height: medium`, `fullwidth: true`, `alignment: center`, `vertical_alignment: center`, `overlay_color: "#0f1d2ecc"`. Blocks: rating (5) → heading (5xl, "Your Smile, Our Priority") → text (lg, "Comprehensive family dentistry with a gentle touch. New patients welcome — same-day appointments available.") → button (primary "Book Appointment" + secondary "Meet Our Team", medium). Social-proof hero leading with trust. `top_spacing: none` |
| 2 | Trust Strip | `trust-bar` | `standard` | `icon_style: filled`, `icon_size: md`, `icon_shape: sharp`, `alignment: left`, `show_dividers: true`. 4 items: shield/"Licensed & Insured"/"ADA Certified", clock/"Same-Day Visits"/"Walk-ins welcome", credit-card/"Flexible Payment"/"Insurance accepted", smile/"Gentle Approach"/"Anxiety-free dentistry" |
| 3 | Services | `icon-card-grid` | `standard-accent` | `eyebrow: "Our Services"`, `title: "Everything Your Smile Needs"`, `heading_alignment: center`, `columns_desktop: 3`, `card_layout: box`, `alignment: center`, `icon_style: outline`, `icon_size: xl`, `icon_shape: sharp`. 6 cards: "Checkups & Cleaning" (search), "Teeth Whitening" (sun), "Dental Implants" (plus-circle), "Invisalign" (align-left), "Crowns & Bridges" (shield), "Emergency Care" (zap). Each with description + "Learn More" link |
| 4 | Before/After | `comparison-slider` | `standard` | `eyebrow: "Real Results"`, `title: "See the Difference"`, `heading_alignment: center`, `orientation: horizontal`, `initial_position: 30`, `show_labels: true`, `before_label: "Before"`, `after_label: "After"`. Smile transformation photo pair |
| 5 | About Teaser | `image-text` | `standard-accent` | `image_position: right`, `text_position: center`, `content_color_scheme: none`. Blocks: text (sm, muted, uppercase, "MEET DR. ELENA RHODES") → heading (2xl, "Dentistry That Listens") → text (base, paragraph about the doctor's approach) → button (secondary, "About Us", links to about.html). Portrait of the lead dentist |
| 6 | Testimonials | `testimonials` | `standard` | `eyebrow: "Patient Reviews"`, `title: "What Our Patients Say"`, `heading_alignment: center`, `layout: grid`, `columns_desktop: 3`, `card_layout: flat`. 3 quotes with avatars, all 5-star, specific dental experiences |
| 7 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Blocks: heading (2xl, "Ready for a Brighter Smile?") → text (base, muted, "New patients receive a complimentary consultation.") → button (primary, "Book Your First Visit", links to contact.html) |

### Services (`services.json`) — 6 widgets

| # | Widget | Type | Color Scheme | Key Configuration |
|---|--------|------|-------------|-------------------|
| 1 | Hero | `banner` | `highlight` | `height: small`, `fullwidth: true`, `alignment: center`, `overlay_color: "#0f1d2e80"`. Blocks: heading (4xl, "Our Services"). `top_spacing: none`, `bottom_spacing: none` |
| 2 | Overview | `icon-card-grid` | `standard` | `eyebrow: ""`, `title: "Comprehensive Dental Care"`, `heading_alignment: center`, `columns_desktop: 3`, `card_layout: flat`, `alignment: start`, `icon_style: filled`, `icon_size: lg`, `icon_shape: sharp`. 6 cards with longer descriptions + "Book Now" links. Same services as homepage but with more detail |
| 3 | Process | `numbered-cards` | `standard-accent` | `eyebrow: "Your Visit"`, `title: "What to Expect"`, `heading_alignment: center`, `columns_desktop: 4`, `card_layout: box`, `alignment: center`. 4 steps: "Book Online" → "Arrive & Check In" → "Consultation & Treatment" → "Follow-Up Care" |
| 4 | Technology | `image-text` | `standard` | `image_position: left`, `text_position: center`, `content_color_scheme: none`. Blocks: text (sm, muted, uppercase, "ADVANCED TECHNOLOGY") → heading (2xl, "Modern Tools, Better Outcomes") → text (base, paragraph about digital X-rays, intraoral cameras, laser dentistry) → features ("+ Digital X-Rays\n+ Intraoral Cameras\n+ Laser Dentistry\n+ 3D Scanning") |
| 5 | Insurance | `rich-text` | `highlight` | `text_alignment: center`, `content_width: medium`. Blocks: heading (3xl, "Insurance & Payment") → text (base, "We accept most major insurance plans and offer flexible payment options including CareCredit financing.") → text (sm, muted, "Not sure if we accept your plan? Call us and we'll check for you.") → button (primary, "Contact Us", links to contact.html) |
| 6 | CTA | `action-bar` | `highlight` | `fullwidth: true`. Blocks: heading (2xl, "Don't Wait for a Toothache") → button (primary, "Book Appointment" + secondary "Call (212) 555-0312") |

### New Patients (`new-patients.json`) — 5 widgets

| # | Widget | Type | Color Scheme | Key Configuration |
|---|--------|------|-------------|-------------------|
| 1 | Hero | `banner` | `highlight` | `height: small`, `fullwidth: true`, `alignment: center`, `overlay_color: "#0f1d2e80"`. Blocks: heading (4xl, "New Patients"). `top_spacing: none`, `bottom_spacing: none` |
| 2 | Welcome | `image-text` | `standard` | `image_position: right`, `text_position: center`, `content_color_scheme: none`. Blocks: heading (2xl, "Welcome to Brightside") → text (base, welcoming paragraph about what new patients can expect) → text (base, "Your first visit includes a comprehensive exam, digital X-rays, and a personalized treatment plan.") → button (primary, "Book Your First Visit", links to contact.html). Photo of friendly reception area |
| 3 | First Visit | `steps` | `standard-accent` | `eyebrow: "Your First Visit"`, `title: "Step by Step"`, `heading_alignment: center`. 4 steps with images: "Paperwork & Check-In" → "Comprehensive Exam" → "Digital X-Rays" → "Treatment Plan Discussion". No buttons — reassuring and simple |
| 4 | FAQ | `accordion` | `standard` | `eyebrow: "New Patient FAQ"`, `title: "Common Questions"`, `heading_alignment: center`, `style: separated`, `allow_multiple: false`. 6 items: "What should I bring to my first visit?", "Do you accept my insurance?", "How long will my first appointment take?", "Do you treat children?", "What if I have dental anxiety?", "Is parking available?". No sidebar |
| 5 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Blocks: heading (2xl, "We Can't Wait to Meet You") → text (base, muted, "Same-day appointments available for new patients.") → button (primary, "Book Appointment", links to contact.html) |

### About (`about.json`) — 6 widgets

| # | Widget | Type | Color Scheme | Key Configuration |
|---|--------|------|-------------|-------------------|
| 1 | Hero | `banner` | `highlight` | `height: small`, `fullwidth: true`, `alignment: center`, `overlay_color: "#0f1d2e80"`. Blocks: heading (4xl, "About Us"). `top_spacing: none`, `bottom_spacing: none` |
| 2 | Story | `image-text` | `standard` | `image_position: left`, `text_position: center`, `content_color_scheme: none`. Blocks: text (sm, muted, uppercase, "EST. 2014") → heading (2xl, "A Decade of Smiles") → text (base, founding story) → text (base, second paragraph about the practice's growth). Photo of the practice exterior |
| 3 | Team | `profile-grid` | `standard-accent` | `eyebrow: "The Team"`, `title: "Meet Your Dentists"`, `heading_alignment: center`, `columns_desktop: 3`, `layout: grid`. 3 profiles: Dr. Elena Rhodes (Lead Dentist, "General & Cosmetic"), Dr. Marcus Chen (Associate Dentist, "Pediatric & Orthodontic"), Dr. Lena Okafor (Associate Dentist, "Oral Surgery & Implants"). Each with bio + LinkedIn |
| 4 | Values | `trust-bar` | `highlight` | `icon_style: outline`, `icon_size: xl`, `icon_shape: sharp`, `alignment: centered`, `show_dividers: false`. 3 items: heart/"Patient-First Care"/"Your comfort guides every decision", zap/"Modern Technology"/"Advanced tools for precise treatment", users/"Family Practice"/"Every age, every smile" |
| 5 | Office | `gallery` | `standard` | `eyebrow: ""`, `title: "Our Office"`, `heading_alignment: center`, `layout: grid`, `columns_desktop: 3`, `staggered: false`, `aspect_ratio: 16 / 9`. 6 images of the practice: lobby, treatment room, reception, sterilization area, patient lounge, exterior. Captions on each |
| 6 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Blocks: heading (2xl, "Join the Brightside Family") → button (primary, "Book Appointment", links to contact.html) |

### Smile Gallery (`smile-gallery.json`) — 4 widgets

| # | Widget | Type | Color Scheme | Key Configuration |
|---|--------|------|-------------|-------------------|
| 1 | Hero | `banner` | `highlight` | `height: small`, `fullwidth: true`, `alignment: center`, `overlay_color: "#0f1d2e80"`. Blocks: heading (4xl, "Smile Gallery"). `top_spacing: none`, `bottom_spacing: none` |
| 2 | Before/After | `comparison-slider` | `standard` | `title: "Whitening Transformation"`, `heading_alignment: center`, `orientation: horizontal`, `initial_position: 50`, `show_labels: true`, `before_label: "Before"`, `after_label: "After"` |
| 3 | Gallery | `gallery` | `standard-accent` | `eyebrow: ""`, `title: "Patient Results"`, `heading_alignment: center`, `layout: grid`, `columns_desktop: 3`, `staggered: false`, `aspect_ratio: 3 / 2`. 9 images of smile results — close-ups of completed dental work. Captions describing the procedure |
| 4 | CTA | `action-bar` | `highlight` | `fullwidth: true`. Blocks: heading (2xl, "Want Results Like These?") → button (primary, "Book a Consultation", links to contact.html) |

### Contact (`contact.json`) — 4 widgets

| # | Widget | Type | Color Scheme | Key Configuration |
|---|--------|------|-------------|-------------------|
| 1 | Hero | `banner` | `highlight` | `height: small`, `fullwidth: true`, `alignment: center`, `overlay_color: "#0f1d2e80"`. Blocks: heading (4xl, "Contact Us"). `top_spacing: none`, `bottom_spacing: none` |
| 2 | Contact | `image-text` | `standard` | `image_position: left`, `text_position: flex-start`, `content_color_scheme: none`. Blocks: heading (2xl, "Book an Appointment") → text (base, "Call us, walk in, or book online — whatever works best for you.") → text (base, "<p>320 Park Avenue, Suite 4B<br>New York, NY 10022</p><p>reception@brightsidedental.com<br>(212) 555-0312</p>") → button (primary, "Book Online"). Photo of the reception desk |
| 3 | Hours | `schedule-table` | `standard-accent` | `title: "Office Hours"`, `heading_alignment: center`, `note: "Emergency appointments available outside regular hours"`, `sidebar_position: right`, `week_start_day: "1"`. 6 day blocks (Mon-Sat, Sun closed). 1 info block: "Emergencies" with after-hours number |
| 4 | Map | `map` | `standard` | `title: "Find Us"`, `heading_alignment: left`, `address: "320 Park Avenue, Suite 4B, New York, NY 10022"`, `height: medium`, `show_address: true`, `sidebar_position: right`. 1 info block: "Getting Here" with subway/parking info. 1 social block |

---

## Menus

### main-menu.json

| Label | URL |
|-------|-----|
| Services | services.html |
| New Patients | new-patients.html |
| About | about.html |
| Smile Gallery | smile-gallery.html |
| Contact | contact.html |

### footer-menu.json

| Label | URL |
|-------|-----|
| Services | services.html |
| New Patients | new-patients.html |
| About | about.html |
| Smile Gallery | smile-gallery.html |
| Contact | contact.html |

---

## Widget Usage Summary

| Widget Type | Count |
|-------------|-------|
| `banner` | 6 (home hero + 5 subpage heroes) |
| `trust-bar` | 2 |
| `icon-card-grid` | 2 |
| `comparison-slider` | 2 |
| `image-text` | 4 |
| `testimonials` | 1 |
| `action-bar` | 5 |
| `numbered-cards` | 1 |
| `steps` | 1 |
| `rich-text` | 1 |
| `accordion` | 1 |
| `profile-grid` | 1 |
| `gallery` | 2 |
| `schedule-table` | 1 |
| `map` | 1 |

**Unique widget types used: 15**
**Total widget instances: 32**

---

## Header Differentiation Notes

Brightside is the **first preset to use `highlight-accent` header color scheme** and the **first to use `full_width: false`** (contained header). This creates a distinctive dark accent-tinted header that doesn't stretch edge to edge — a modern, premium look that signals clinical precision. The phone number and address sit next to the logo, and a bold blue pill "Book Appointment" button provides a clear call to action.

**Key differences from each existing preset:**

| Setting | Saffron | Brewline | Crumbly | Corkwell | Stillpoint | Velvet Touch | Brightside |
|---------|---------|----------|---------|----------|------------|--------------|------------|
| Color scheme | standard | standard | standard | highlight | standard | standard-accent | **highlight-accent** |
| Contact details | Yes (logo) | No | Yes (menu) | No | No | Yes (menu) | **Yes (logo)** |
| Center nav | No | Yes | No | No | Yes | No | **No** |
| CTA style | Primary | Secondary | Primary | Secondary | Primary | Secondary | **Primary** |
| Sticky | Yes | No | Yes | No | No | Yes | **No** |
| Transparent | Yes | No | No | Yes | No | No | **No** |
| Full width | True | True | True | True | True | True | **False** |
| CTA text | Reserve a Table | View Menu | Order a Cake | Drinks & Bites | Book a Class | Book Now | **Book Appointment** |

No other preset shares the `highlight-accent` + `full_width: false` combination. The contained dark header is Brightside's visual signature.
