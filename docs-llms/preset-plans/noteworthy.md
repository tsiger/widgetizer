# Noteworthy — Tutoring / Music Lessons Preset Plan

## Phase 0 — Industry Strategy Brief

- **Business archetype:** Booking-based service with dual offering. A private studio that provides both academic tutoring (K-12) and music instruction (piano, guitar, voice, drums). Revenue from recurring weekly lesson bookings. Small team of specialist instructors.

- **Primary conversion:** Book a trial lesson. Parents or adult learners need to see the instructor's expertise and teaching method before committing to weekly sessions.

- **Trust mechanism:** Instructor expertise and teaching results. Not safety (that's daycare). Parents want to know: does this teacher actually get results? Credentials, teaching methodology, student progress stories, and subject-matter depth. The site must demonstrate competence, not just warmth.

- **Decision mode:** Practical, considered. Parents compare 2-3 options based on subject availability, instructor qualifications, scheduling flexibility, and whether the approach fits their child's learning style. Less emotional than daycare — more like hiring a specialist.

- **Brand personality:** Scholarly and creative. Should feel like a place where real expertise meets genuine enthusiasm for teaching. Think independent bookshop meets recording studio — curated, knowledgeable, quietly confident. Not corporate, not cutesy, not clinical.

- **Content posture:** Offer-led with expertise support. The dual offering (academics + music) is the structural differentiator. The site must make both clear, then demonstrate the depth of each through instructor profiles and methodology.

- **Audience model:** Two audiences — parents booking for children (primary), and adult learners for themselves. Site leans toward parents but includes adult learners naturally.

- **Required page jobs:**
  - **Home** — Position the dual offering, demonstrate expertise, show proof, drive trial
  - **Lessons** — Detail both academic and music offerings with methodology, plus upcoming events/recitals
  - **About** — Teaching philosophy, instructor depth, studio story
  - **Pricing** — Rates, packages, policies
  - **Contact** — Trial booking, location, availability

- **No-go patterns:**
  - Rounded/pill/soft styling (that's daycare territory)
  - Warm nurturing tone (this is expertise, not caregiving)
  - Trust-bar credential strips (too generic — show expertise through content instead)
  - Key-figures stat strips (same problem)
  - Accordion on every page
  - Banner hero on homepage (too common)

- **Opener candidates:**
  - Editorial split-hero with a content card — positions the business as scholarly and intentional
  - Text-forward, not image-dependent

- **Closing pattern:**
  - Direct but not aggressive — "Book a trial lesson" as a clear next step. Practical, not emotional.

---

## Phase 1 — Full Plan

### Identity

- **Preset ID:** noteworthy
- **Preset name:** Noteworthy
- **Industry:** Tutoring / Music Lessons
- **Description:** Tutoring / music lessons

### Industry Translation

Noteworthy is a dual-offering studio: academic tutoring and private music instruction. The site leads with an editorial split-hero that positions both sides of the business. A scrolling-text marquee adds creative energy. The numbered-service-list presents offerings with deliberate curation (01, 02, 03...). A content-switcher lets visitors toggle between academic and music offerings. Instructor profiles go deep on credentials. An event-list shows upcoming recitals and workshops. The tone is scholarly and creative — not warm and nurturing.

### Sitemap

| Page | Slug | Job |
|------|------|-----|
| Home | index | Position dual offering, demonstrate expertise, proof, drive trial |
| Lessons | lessons | Detail both offerings with methodology, events |
| About | about | Philosophy, instructor depth, story |
| Pricing | pricing | Rates, packages, policies |
| Contact | contact | Trial booking, location |

### preset.json Settings

**Colors — Standard:**
- `standard_bg_primary`: `#f8fafc`
- `standard_bg_secondary`: `#f1f5f9`
- `standard_text_heading`: `#1e293b`
- `standard_text_content`: `#475569`
- `standard_text_muted`: `#94a3b8`
- `standard_border_color`: `#e2e8f0`
- `standard_accent`: `#4f46e5` (indigo — scholarly, creative, trustworthy)
- `standard_accent_text`: `#ffffff`
- `standard_rating_star`: `#f59e0b`

**Colors — Highlight:**
- `highlight_bg_primary`: `#1e1b4b` (deep indigo)
- `highlight_bg_secondary`: `#0f172a`
- `highlight_text_heading`: `#f8fafc`
- `highlight_text_content`: `#c7d2fe`
- `highlight_text_muted`: `#818cf8`
- `highlight_border_color`: `#312e81`
- `highlight_accent`: `#22d3ee` (cyan — pops against deep indigo)
- `highlight_accent_text`: `#0f172a`
- `highlight_rating_star`: `#f59e0b`

**Typography:**
- `heading_font`: `{ "stack": "\"Fraunces\", serif", "weight": 600 }` — editorial serif with character.
- `body_font`: `{ "stack": "\"Source Sans 3\", sans-serif", "weight": 400 }` — clean, readable.

**Style:**
- `corner_style`: `slightly-rounded`
- `spacing_density`: `airy`
- `button_shape`: `auto`

### Header Configuration

- `logoText`: `"Noteworthy"`
- `contactDetailsLine1`: `"(555) 607-2200"`
- `contactDetailsLine2`: `""`
- `contact_position`: `"logo"`
- `ctaButtonLink`: `{ "href": "contact.html", "text": "Book a Trial", "target": "_self" }`
- `ctaButtonStyle`: `"primary"`
- `full_width`: `true`
- `sticky`: `true`
- `transparent_on_hero`: `false`
- `color_scheme`: `"standard-primary"`

### Footer Configuration

- `copyright`: `"© 2026 Noteworthy Studio. All rights reserved."`
- `layout`: `"first-featured"`
- `color_scheme`: `"highlight-primary"`
- Blocks:
  1. `logo_text` — studio description
  2. `text_block` — title: "Studio Hours", hours
  3. `menu_block` — title: "Explore"
  4. `social_block` — title: "Follow Us"

### Menus

**Main Menu:** Home, Lessons, About, Pricing, Contact
**Footer Menu:** Lessons, Pricing, About, Contact

---

### Page Strategy

#### Homepage (index)

| # | Widget | Instance ID | Color Scheme | Purpose |
|---|--------|-------------|--------------|---------|
| 1 | split-hero | hero_split | standard-secondary | Editorial opener with content card — positions dual offering |
| 2 | scrolling-text | marquee | (custom colors) | Creative energy — "Academics. Music. One Studio." |
| 3 | numbered-service-list | services_list | standard-primary | 4 curated offerings: Math & Science, Reading & Writing, Piano & Keys, Guitar & Voice |
| 4 | content-switcher | offerings_switcher | standard-secondary | Toggle: Academic vs Music — 3 cards each |
| 5 | testimonials | parent_reviews | standard-primary | 3 parent/student testimonials in grid |
| 6 | image-text | method_section | highlight-primary | Teaching methodology — "we adapt to how you learn" |
| 7 | action-bar | trial_cta | highlight-secondary | "Book a trial lesson" |

**Spacing notes:**
- scrolling-text: `top_spacing: small`, `bottom_spacing: small`

#### Lessons (lessons)

| # | Widget | Instance ID | Color Scheme | Purpose |
|---|--------|-------------|--------------|---------|
| 1 | banner | lessons_hero | highlight-primary | Inner page title — "What We Teach" |
| 2 | features-split | academic_detail | standard-primary | Academic offering detail with icons |
| 3 | features-split | music_detail | standard-secondary | Music offering detail with icons (content_position flipped) |
| 4 | event-list | upcoming_events | standard-primary | Upcoming recitals, workshops, open days |
| 5 | action-bar | lessons_cta | highlight-primary | "Book your first lesson" |

#### About (about)

| # | Widget | Instance ID | Color Scheme | Purpose |
|---|--------|-------------|--------------|---------|
| 1 | banner | about_hero | highlight-primary | Inner page title — "About Noteworthy" |
| 2 | split-content | story_section | standard-primary | Two-column editorial: heading left, story text right |
| 3 | steps | approach_steps | standard-secondary | 3 teaching principles |
| 4 | profile-grid | instructors_grid | standard-primary | 3 instructor profiles with deep bios |
| 5 | testimonials | about_reviews | highlight-primary | 3 testimonials |
| 6 | action-bar | about_cta | highlight-secondary | "Meet us in person" |

#### Pricing (pricing)

| # | Widget | Instance ID | Color Scheme | Purpose |
|---|--------|-------------|--------------|---------|
| 1 | banner | pricing_hero | highlight-primary | Inner page title — "Lesson Rates" |
| 2 | pricing | lesson_rates | standard-primary | 3 tiers: Single, Monthly, Semester |
| 3 | rich-text | policies_note | standard-secondary | Cancellation and discount policies |
| 4 | accordion | pricing_faq | standard-primary | 4 pricing FAQs with sidebar |
| 5 | action-bar | pricing_cta | highlight-primary | "Start with a free trial" |

#### Contact (contact)

| # | Widget | Instance ID | Color Scheme | Purpose |
|---|--------|-------------|--------------|---------|
| 1 | banner | contact_hero | highlight-primary | Inner page title — "Get Started" |
| 2 | map | location_map | standard-primary | Studio location with sidebar hours |
| 3 | action-bar | contact_cta | highlight-primary | "Book your trial lesson" |

---

### Widget Usage Summary

| Widget | Count | Pages |
|--------|-------|-------|
| split-hero | 1 | Home |
| scrolling-text | 1 | Home |
| numbered-service-list | 1 | Home |
| content-switcher | 1 | Home |
| testimonials | 2 | Home, About |
| image-text | 1 | Home |
| banner | 4 | Lessons, About, Pricing, Contact |
| action-bar | 5 | All pages |
| features-split | 2 | Lessons |
| event-list | 1 | Lessons |
| split-content | 1 | About |
| steps | 1 | About |
| profile-grid | 1 | About |
| pricing | 1 | Pricing |
| rich-text | 1 | Pricing |
| accordion | 1 | Pricing (only once, with sidebar) |
| map | 1 | Contact |

**Underused widgets:** content-switcher (toggle between academic/music offerings), numbered-service-list (curated 01/02/03 list), scrolling-text (creative energy marquee), event-list (recitals/workshops), split-content (editorial two-column), features-split (detailed offering breakdown).

### Differentiation from Little Oaks

| Axis | Little Oaks (Daycare) | Noteworthy (Tutoring/Music) |
|------|----------------------|---------------------------|
| Style | rounded + pill | slightly-rounded + auto |
| Spacing | default | airy |
| Opener | split-hero (plain) | split-hero with content_color_scheme |
| Homepage flow | trust-bar → card-grid → image-text → key-figures | scrolling-text → numbered-service-list → content-switcher |
| Trust pattern | credentials strip + parent testimonials | instructor depth + methodology + results |
| Unique widgets | checkerboard, schedule-table | content-switcher, numbered-service-list, scrolling-text, event-list, features-split, split-content |
| Accordion usage | 2 pages | 1 page only |
| Tone | warm, nurturing | scholarly, creative |
| Font pairing | Fredoka + Nunito (rounded) | Fraunces + Source Sans 3 (editorial) |
| Palette feel | warm cream + sage green | cool slate + deep indigo + cyan |
