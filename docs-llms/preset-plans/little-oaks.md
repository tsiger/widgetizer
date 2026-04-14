# Little Oaks — Daycare / Preschool Preset Plan

## Phase 0 — Industry Strategy Brief

- **Business archetype:** Class/program business with enrollment-based revenue. A neighborhood daycare or preschool that serves families with young children (infants through pre-K). Revenue comes from monthly tuition for enrolled children, with waitlists common in desirable areas.

- **Primary conversion:** Schedule a tour or inquire about enrollment. Parents almost never enroll without visiting first. The site must make them want to see the space in person.

- **Trust mechanism:** Safety credentials, staff qualifications, program structure, and parent testimonials. This is one of the highest-trust decisions a parent makes — leaving their child with strangers. The site must communicate safety, warmth, professionalism, and genuine care for children. Licensing, staff-to-child ratios, and curriculum philosophy all matter. Parent testimonials carry enormous weight.

- **Decision mode:** Highly emotional, deeply considered. Parents are anxious, protective, and comparing multiple options. They look for gut feeling ("does this feel right?") backed by evidence (credentials, ratios, curriculum). Price is a factor but secondary to trust. They visit before committing.

- **Brand personality:** Warm, nurturing, and reassuring without being saccharine. Should feel like a place run by caring professionals, not a corporate childcare chain. Approachable but structured — parents need to trust that this is organized, safe, and thoughtful. Not clinical, not overly playful, not corporate.

- **Content posture:** Atmosphere-led with program structure. The site must feel warm and safe first, then demonstrate structured programs and credentials. Parents need to imagine their child thriving here before they read the details.

- **Audience model:** Single primary audience — parents of young children (typically 0-5 years) looking for daycare or preschool. The decision-maker is usually a parent, often a mother, researching during pregnancy or early infancy.

- **Required page jobs:**
  - **Home** — Establish warmth and safety, surface programs by age group, show credentials, parent testimonials, drive tour booking
  - **Programs** — Detail age-group programs (infants, toddlers, preschool, pre-K) with curriculum philosophy and daily schedule
  - **About** — Story, values, teaching philosophy, staff introductions with qualifications
  - **Tuition** — Transparent pricing by program, what is included, enrollment process
  - **Contact** — Tour booking, location, hours, enrollment inquiry

- **No-go patterns:**
  - Dark or moody aesthetics (wrong emotional register entirely)
  - Sharp, aggressive styling (harsh corners, bold contrasts)
  - Overly corporate or clinical tone
  - Excessive playfulness that undermines professionalism (Comic Sans energy)
  - Heavy text without warmth cues
  - Aggressive sales language or urgency tactics

- **Opener candidates:**
  - Warm, inviting hero with a gentle value proposition — "where little ones grow." Atmosphere-first, not offer-first.
  - Soft editorial opener: warm heading + reassuring subtitle, conveying safety and care

- **Closing pattern:**
  - Warm invitation — "Schedule a visit" or "Come see us." Gentle, not pushy. Parents are protective and respond to invitation, not pressure.

---

## Phase 1 — Full Plan

### Identity

- **Preset ID:** little-oaks
- **Preset name:** Little Oaks
- **Industry:** Daycare / Preschool
- **Description:** Daycare / preschool

### Industry Translation

Little Oaks is a neighborhood daycare and preschool. The site leads with warmth and safety — soft, natural colors and rounded styling that immediately signals "this is a place for children." Programs are structured by age group with clear curriculum descriptions. Staff profiles emphasize qualifications. Parent testimonials carry the trust. Every page ends with a gentle tour invitation, never a sales push.

### Sitemap

| Page | Slug | Job |
|------|------|-----|
| Home | index | Establish warmth, surface programs, credentials, testimonials, drive tour |
| Programs | programs | Detail age-group programs with curriculum and daily schedule |
| About | about | Story, values, teaching philosophy, staff team |
| Tuition | tuition | Transparent pricing by program, what is included, enrollment process |
| Contact | contact | Tour booking, location, hours |

### preset.json Settings

**Colors — Standard:**
- `standard_bg_primary`: `#fffbf7` (very warm cream white)
- `standard_bg_secondary`: `#f5efe8` (warm linen)
- `standard_text_heading`: `#2d3436` (warm charcoal, not cold black)
- `standard_text_content`: `#4a5568`
- `standard_text_muted`: `#8a9199`
- `standard_border_color`: `#e8e0d8`
- `standard_accent`: `#5b8c5a` (sage green — natural, nurturing, growth)
- `standard_accent_text`: `#ffffff`
- `standard_rating_star`: `#f5b942`

**Colors — Highlight:**
- `highlight_bg_primary`: `#2d3436` (warm charcoal)
- `highlight_bg_secondary`: `#1e2526`
- `highlight_text_heading`: `#fffbf7`
- `highlight_text_content`: `#c8c0b8`
- `highlight_text_muted`: `#8a8480`
- `highlight_border_color`: `#4a4240`
- `highlight_accent`: `#7fb87e` (lighter sage for dark surfaces)
- `highlight_accent_text`: `#2d3436`
- `highlight_rating_star`: `#f5b942`

**Typography:**
- `heading_font`: `{ "stack": "\"Fredoka\", sans-serif", "weight": 600 }` — friendly rounded sans-serif with warmth. Playful enough for childcare, professional enough for parents.
- `body_font`: `{ "stack": "\"Nunito\", sans-serif", "weight": 400 }` — soft, rounded, highly readable. Pairs naturally with Fredoka.

**Style:**
- `corner_style`: `rounded` — soft edges throughout, appropriate for childcare
- `spacing_density`: `default`
- `button_shape`: `pill` — rounded pill buttons reinforce the soft, approachable feel

### Header Configuration

- `logoText`: `"Little Oaks"`
- `contactDetailsLine1`: `"(555) 482-3100"`
- `contactDetailsLine2`: `"140 Maple Lane, Asheville"`
- `contact_position`: `"logo"`
- `ctaButtonLink`: `{ "href": "contact.html", "text": "Schedule a Tour", "target": "_self" }`
- `ctaButtonStyle`: `"primary"`
- `full_width`: `true`
- `sticky`: `true`
- `transparent_on_hero`: `false`
- `color_scheme`: `"standard-primary"`

### Footer Configuration

- `copyright`: `"© 2026 Little Oaks Learning Center. All rights reserved."`
- `layout`: `"first-featured"`
- `color_scheme`: `"highlight-primary"`
- Blocks:
  1. `logo_text` — short warmth-first description
  2. `text_block` — title: "Hours", operating hours
  3. `menu_block` — title: "Explore"
  4. `social_block` — title: "Stay Connected"

### Menus

**Main Menu:**
- Home → index.html
- Programs → programs.html
- About → about.html
- Tuition → tuition.html
- Contact → contact.html

**Footer Menu:**
- Programs → programs.html
- Tuition → tuition.html
- About → about.html
- Contact → contact.html

---

### Page Strategy

#### Homepage (index)

| # | Widget | Instance ID | Color Scheme | Purpose |
|---|--------|-------------|--------------|---------|
| 1 | split-hero | hero_split | standard-primary | Warm hero — heading + subtitle + tour CTA, image placeholder on one side |
| 2 | trust-bar | credentials_strip | standard-secondary | Quick credentials: licensed, low ratios, qualified staff, outdoor play |
| 3 | card-grid | programs_overview | standard-primary | 4 age-group program cards: Infants, Toddlers, Preschool, Pre-K |
| 4 | image-text | philosophy_section | standard-secondary | Teaching philosophy — play-based learning, nurturing environment |
| 5 | key-figures | stats_section | standard-primary | 4 numbers: years, staff, families, ratio |
| 6 | testimonials | parent_reviews | highlight-primary | 3 parent testimonials |
| 7 | action-bar | tour_cta | highlight-secondary | "Come see us" tour invitation |

**Spacing notes:**
- trust-bar: `top_spacing: small`, `bottom_spacing: small`
- key-figures: `top_spacing: small`, `bottom_spacing: small`

#### Programs (programs)

| # | Widget | Instance ID | Color Scheme | Purpose |
|---|--------|-------------|--------------|---------|
| 1 | banner | programs_hero | highlight-primary | Inner page title — "Our Programs" |
| 2 | checkerboard | programs_grid | standard-primary | 8 alternating tiles: 4 program images + 4 program descriptions |
| 3 | schedule-table | daily_schedule | standard-secondary | Sample daily schedule with sidebar info |
| 4 | image-text | outdoor_section | standard-primary | Outdoor play and learning environment |
| 5 | action-bar | programs_cta | highlight-primary | "Schedule a tour to see our programs in action" |

#### About (about)

| # | Widget | Instance ID | Color Scheme | Purpose |
|---|--------|-------------|--------------|---------|
| 1 | banner | about_hero | highlight-primary | Inner page title — "About Little Oaks" |
| 2 | image-text | story_section | standard-primary | Founding story — why we started, what we believe |
| 3 | icon-card-grid | values_grid | standard-secondary | 4 values with icons: nurturing, learning, safety, community |
| 4 | profile-grid | staff_grid | standard-primary | 4 staff members with qualifications |
| 5 | testimonials | about_reviews | standard-secondary | 2 parent testimonials |
| 6 | action-bar | about_cta | highlight-primary | "Come meet our team" |

#### Tuition (tuition)

| # | Widget | Instance ID | Color Scheme | Purpose |
|---|--------|-------------|--------------|---------|
| 1 | banner | tuition_hero | highlight-primary | Inner page title — "Tuition & Enrollment" |
| 2 | pricing | tuition_plans | standard-primary | 4 program tiers with pricing and inclusions |
| 3 | steps | enrollment_process | standard-secondary | 4 enrollment steps |
| 4 | accordion | tuition_faq | standard-primary | 5 enrollment/tuition FAQs with sidebar info |
| 5 | action-bar | tuition_cta | highlight-primary | "Ready to enroll?" tour CTA |

#### Contact (contact)

| # | Widget | Instance ID | Color Scheme | Purpose |
|---|--------|-------------|--------------|---------|
| 1 | banner | contact_hero | highlight-primary | Inner page title — "Visit Little Oaks" |
| 2 | map | location_map | standard-primary | Location with sidebar: hours, parking, what to expect |
| 3 | accordion | contact_faq | standard-secondary | 4 FAQs about visiting and getting started |
| 4 | action-bar | contact_cta | highlight-primary | "Schedule your tour today" |

---

### Widget Usage Summary

| Widget | Count | Pages |
|--------|-------|-------|
| banner | 4 | Programs, About, Tuition, Contact |
| split-hero | 1 | Home |
| action-bar | 5 | All pages |
| trust-bar | 1 | Home |
| card-grid | 1 | Home |
| image-text | 3 | Home, Programs, About |
| key-figures | 1 | Home |
| testimonials | 2 | Home, About |
| checkerboard | 1 | Programs |
| schedule-table | 1 | Programs |
| icon-card-grid | 1 | About |
| profile-grid | 1 | About |
| pricing | 1 | Tuition |
| steps | 1 | Tuition |
| accordion | 2 | Tuition, Contact |
| map | 1 | Contact |

**Underused widgets featured:** checkerboard (alternating image/text tiles for program showcase), schedule-table (natural fit for daily routine display), split-hero (warm homepage opener without full-bleed image).

### Differentiation Notes

- **Opener:** split-hero instead of full-bleed banner — half-width image + warm text. Feels intimate and inviting, not cinematic.
- **Composition:** Atmosphere-led home with credentials strip, program cards, philosophy section, and parent proof. Trust-building flow.
- **Typography:** Fredoka + Nunito — both rounded, warm, friendly. Unique pairing that immediately signals "childcare" without being childish.
- **Palette:** Warm cream backgrounds (#fffbf7) with sage green accent (#5b8c5a) — natural, nurturing, growth-oriented. Warm charcoal highlight (#2d3436) instead of cold dark tones.
- **Style:** Rounded corners + pill buttons — every edge is soft. Strongest rounded styling in the catalog, appropriate for childcare.
- **Checkerboard:** Alternating program images and descriptions — playful grid layout that fits the industry.
- **Schedule-table:** Daily routine display — parents want to know what a typical day looks like.
- **Closing:** Every page ends with a gentle tour invitation — "Come see us" energy, never sales pressure.
