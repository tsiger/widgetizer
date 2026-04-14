# Olympic — Gym Preset Plan

## Phase 0 — Industry Strategy Brief

- **Business archetype:** Membership-based fitness facility. Class/program business with recurring revenue from memberships, drop-ins, and personal training upsells.

- **Primary conversion:** Free trial visit or membership signup. The site must move visitors from curiosity to physically walking through the door.

- **Trust mechanism:** Facility quality (equipment, space, cleanliness), trainer credentials and experience, member transformation results, community energy. A gym earns trust by showing it is serious, well-equipped, and populated by real people getting real results.

- **Decision mode:** Considered but emotionally driven. Visitors compare gyms on location, price, and vibe. The final decision is often emotional — "do I see myself here?" Price transparency and a low-friction trial reduce hesitation.

- **Brand personality:** Bold, disciplined, and high-energy. Not aggressive or intimidating — confident and welcoming to all levels. Should feel like walking into a well-run training facility, not a luxury spa or a gritty garage gym.

- **Content posture:** Image-led with structured programs. The facility and action shots do the heavy lifting. Class schedules, pricing tiers, and trainer profiles provide the decision-making structure.

- **Audience model:** Single primary audience — individuals seeking gym membership. Range from beginners to experienced lifters, but the site speaks to one unified community rather than segmenting.

- **Required page jobs:**
  - **Home** — Establish energy, show the space, surface key programs, build trust with social proof, drive trial signup
  - **Classes** — Present the full class/program offering with schedule clarity
  - **About** — Introduce the facility story, values, and coaching team
  - **Pricing** — Clear membership tiers with transparent pricing and a strong signup CTA
  - **Contact** — Location, hours, and how to start

- **No-go patterns:**
  - Soft, delicate, spa-like aesthetics
  - Overly corporate or sterile minimalism
  - Aggressive/intimidating "no pain no gain" machismo
  - Playful rounded styling or pastel palettes
  - Too much text before showing the space and energy

- **Opener candidates:**
  - Cinematic full-bleed hero with a bold statement and trial CTA — sets the energy immediately
  - High-contrast action shot of the training floor with overlay text

- **Closing pattern:**
  - Strong CTA — free trial or membership signup with urgency but not pressure. "Start today" energy, not "limited time offer" sales tactics.

---

## Phase 1 — Full Plan

### Identity

- **Preset ID:** olympic
- **Preset name:** Olympic
- **Industry:** Gym / Fitness Center
- **Description:** Gym

### Industry Translation

Olympic is a membership-based gym. The site must communicate energy, discipline, and community — it should feel like walking into a serious training facility that welcomes all levels. The homepage leads with a cinematic hero showing the training floor, quickly surfaces programs and social proof, and closes with a trial CTA. Inner pages structure the decision: classes explain the offering, pricing removes hesitation, about builds trust through the team, and contact closes the loop.

### Sitemap

| Page | Slug | Job |
|------|------|-----|
| Home | index | Establish energy, show facility, surface programs, social proof, drive trial |
| Classes | classes | Present class/program offering with schedule |
| About | about | Facility story, values, coaching team |
| Pricing | pricing | Clear membership tiers, transparent pricing, signup CTA |
| Contact | contact | Location, hours, how to start |

### preset.json Settings

**Colors — Standard:**
- `standard_bg_primary`: `#ffffff`
- `standard_bg_secondary`: `#f2f4f7`
- `standard_text_heading`: `#111827`
- `standard_text_content`: `#374151`
- `standard_text_muted`: `#6b7280`
- `standard_border_color`: `#d1d5db`
- `standard_accent`: `#e0520e` (punchy burnt orange — energetic, bold, high-contrast)
- `standard_accent_text`: `#ffffff`
- `standard_rating_star`: `#f59e0b`

**Colors — Highlight:**
- `highlight_bg_primary`: `#0f1729` (deep midnight navy — much more dynamic than flat black)
- `highlight_bg_secondary`: `#0a1020`
- `highlight_text_heading`: `#ffffff`
- `highlight_text_content`: `#b8c5d6`
- `highlight_text_muted`: `#6b7fa0`
- `highlight_border_color`: `#1e2d45`
- `highlight_accent`: `#f06722` (bright orange for dark surfaces — pops against navy)
- `highlight_accent_text`: `#ffffff`
- `highlight_rating_star`: `#f59e0b`

**Typography:**
- `heading_font`: `{ "stack": "\"Barlow Condensed\", sans-serif", "weight": 700 }` — tall, athletic, condensed sans-serif. Bold and disciplined without being aggressive.
- `body_font`: `{ "stack": "\"Inter\", sans-serif", "weight": 400 }` — clean, highly readable, modern.

**Style:**
- `corner_style`: `sharp` — no roundness. Sharp edges reinforce the disciplined gym feel.
- `spacing_density`: `default`
- `button_shape`: `sharp` — squared-off buttons match the sharp corners.

### Header Configuration

- `logoText`: `"Olympic"`
- `contactDetailsLine1`: `"(555) 738-0200"`
- `contactDetailsLine2`: `"420 Iron Street, Portland"`
- `contact_position`: `"logo"`
- `ctaButtonLink`: `{ "href": "pricing.html", "text": "Start Free Trial", "target": "_self" }`
- `ctaButtonStyle`: `"primary"`
- `full_width`: `true`
- `sticky`: `true`
- `transparent_on_hero`: `true`
- `color_scheme`: `"standard-primary"`

### Footer Configuration

- `copyright`: `"© 2026 Olympic Gym. All rights reserved."`
- `layout`: `"first-featured"`
- `color_scheme`: `"highlight-primary"`
- Blocks:
  1. `logo_text` — text: short gym description
  2. `text_block` — title: "Hours", text: operating hours
  3. `menu_block` — title: "Explore"
  4. `social_block` — title: "Follow Us"

### Menus

**Main Menu:**
- Home → index.html
- Classes → classes.html
- About → about.html
- Pricing → pricing.html
- Contact → contact.html

**Footer Menu:**
- Home → index.html
- Classes → classes.html
- Pricing → pricing.html
- About → about.html
- Contact → contact.html

---

### Page Strategy

#### Homepage (index)

**Job:** Establish energy, show the space, surface key programs, build trust, drive trial.

| # | Widget | Instance ID | Color Scheme | Purpose |
|---|--------|-------------|--------------|---------|
| 1 | banner | hero_banner | highlight-primary | Cinematic hero — full-bleed gym floor shot, bold heading, trial CTA |
| 2 | trust-bar | trust_strip | standard-secondary | Quick USPs: certified trainers, open 7 days, free trial, etc. |
| 3 | card-grid | programs_grid | standard-primary | 4 class/program cards: Strength, HIIT, Boxing, Yoga |
| 4 | image-text | facility_split | standard-secondary | Facility showcase — image of training space + "built for results" copy |
| 5 | key-figures | stats_section | highlight-primary | 4 impact numbers: members, classes/week, trainers, years |
| 6 | testimonials | member_reviews | standard-primary | 3 member testimonials with ratings |
| 7 | action-bar | trial_cta | highlight-secondary | Closing CTA — "Your First Session Is Free" |

**Spacing notes:**
- trust-bar: `top_spacing: small`, `bottom_spacing: small`
- All others: `auto`

#### Classes (classes)

**Job:** Present the class/program offering with schedule clarity.

| # | Widget | Instance ID | Color Scheme | Purpose |
|---|--------|-------------|--------------|---------|
| 1 | banner | classes_hero | highlight-primary | Inner page title banner — "Our Classes" |
| 2 | icon-card-grid | class_types | standard-primary | 6 class type cards with icons: Strength Training, HIIT, Boxing, Yoga & Mobility, CrossFit, Personal Training |
| 3 | schedule-table | weekly_schedule | standard-secondary | Weekly class schedule with sidebar info |
| 4 | image-text | coaching_split | standard-primary | Image of trainer coaching + text about training philosophy |
| 5 | action-bar | classes_cta | highlight-primary | "Try a Class Free" CTA |

#### About (about)

**Job:** Introduce the facility story, values, and coaching team.

| # | Widget | Instance ID | Color Scheme | Purpose |
|---|--------|-------------|--------------|---------|
| 1 | banner | about_hero | highlight-primary | Inner page title — "About Olympic" |
| 2 | image-text | story_section | standard-primary | Gym story — image of facility + founding narrative |
| 3 | steps | values_process | standard-secondary | 3 values/pillars: Community, Discipline, Results |
| 4 | profile-grid | trainers_grid | standard-primary | 4 trainers with photos, roles, specialties |
| 5 | testimonials | about_reviews | highlight-primary | 2-3 member testimonials — proof after trust-building |
| 6 | action-bar | about_cta | highlight-secondary | "Come Train With Us" CTA |

#### Pricing (pricing)

**Job:** Clear membership tiers, transparent pricing, strong signup CTA.

| # | Widget | Instance ID | Color Scheme | Purpose |
|---|--------|-------------|--------------|---------|
| 1 | banner | pricing_hero | highlight-primary | Inner page title — "Membership Plans" with subtitle |
| 2 | pricing | membership_plans | standard-primary | 3 tiers: Day Pass, Monthly, Annual — with feature lists |
| 3 | icon-card-grid | membership_perks | standard-secondary | 4 membership perks/benefits with icons |
| 4 | accordion | pricing_faq | standard-primary | 5-6 pricing/membership FAQs with sidebar info block |
| 5 | action-bar | pricing_cta | highlight-primary | "Start Your Free Trial" CTA |

#### Contact (contact)

**Job:** Location, hours, and how to start.

| # | Widget | Instance ID | Color Scheme | Purpose |
|---|--------|-------------|--------------|---------|
| 1 | banner | contact_hero | highlight-primary | Inner page title — "Get In Touch" |
| 2 | map | location_map | standard-primary | Google Maps embed with sidebar: hours, parking info |
| 3 | accordion | contact_faq | standard-secondary | 4 FAQs about getting started, first visit, what to bring |
| 4 | action-bar | contact_cta | highlight-primary | "Start Your Free Trial Today" |

---

### Widget Usage Summary

| Widget | Count | Pages |
|--------|-------|-------|
| banner | 5 | All pages (hero/title) |
| action-bar | 5 | All pages (closing CTA) |
| trust-bar | 1 | Home |
| card-grid | 1 | Home |
| icon-card-grid | 2 | Classes, Pricing |
| image-text | 3 | Home, Classes, About |
| key-figures | 1 | Home |
| testimonials | 2 | Home, About |
| schedule-table | 1 | Classes |
| steps | 1 | About |
| profile-grid | 1 | About |
| pricing | 1 | Pricing |
| accordion | 2 | Pricing, Contact |
| map | 1 | Contact |

**Underused widgets featured:** schedule-table (perfect for gym class timetable), steps (used for values/pillars rather than typical process — shows range).

### Differentiation Notes

- **Opener:** Full-bleed banner with overlay on gym floor action shot — cinematic, high-energy
- **Composition:** Image-led home with trust-bar immediately after hero, stats as social proof anchor
- **Typography:** Barlow Condensed is tall and athletic — distinct from the serif/sans pairings used in most service presets
- **Palette:** Deep midnight navy highlight (#0f1729) with punchy orange accent (#e0520e / #f06722) — dynamic and energetic
- **Style:** Sharp corners + sharp buttons — every edge reinforces discipline
- **Schedule-table:** Natural fit for gym class schedules, rarely used in other presets
- **Closing:** Every page ends with an action-bar driving trial signup — consistent conversion pattern
