# Hearthstone — Hotel / B&B

## Phase 0 — Industry Strategy Brief

- **Business archetype:** Booking-based boutique accommodation — a small independent hotel or bed & breakfast with character, not a chain. Somewhere between a curated B&B and a design-forward small hotel. 8–12 rooms, on-site breakfast, a sense of place.

- **Primary conversion:** Room booking inquiry / reservation request. The site must move visitors from browsing to wanting to stay. Secondary: direct phone call or email for questions.

- **Trust mechanism:** Atmosphere and room quality (proven through photography), guest reviews (social proof from past stays), location legitimacy (a real, desirable place), and personal hospitality (the people behind the property). Guests need to feel the place before they arrive.

- **Decision mode:** Considered. Guests typically compare 3–5 options. They look at room photos, read reviews, check location, compare amenities, and imagine themselves there. Price matters but atmosphere often decides. The site must make the property feel like a destination, not just a bed.

- **Brand personality:** Warm and refined. Feels like a well-kept secret — intimate, tasteful, grounded. Not flashy boutique-hotel slick, not rustic-cabin cozy. Somewhere between a European pension and a modern country house. Calm confidence, quiet luxury, real materials.

- **Content posture:** Image-led with atmosphere-first approach. The property and its rooms must carry the site. Photography does the heavy lifting — interiors, views, breakfast table, details. Text supports but doesn't lead. Every image should make the visitor want to be there.

- **Audience model:** Primarily leisure travelers — couples on weekends away, small families seeking charm over chains, solo travelers who value character. Secondary: small group bookings (weddings, retreats) and occasional business travelers wanting something better than a hotel chain.

- **Required page jobs:**
  - **Home** — Establish atmosphere, show the property at its best, surface room types, build trust through guest reviews, drive to booking
  - **Rooms** — Present each room type with photos, details, capacity, and pricing. This is the decision page — it must be thorough and beautiful.
  - **Experience** — Show what makes a stay special beyond the room: breakfast, grounds, local area, seasonal activities. Answers "what will I do there?"
  - **About** — Tell the story of the property and the hosts. Boutique accommodation lives on personal story and place history.
  - **Contact** — Location, directions, booking inquiry form context, FAQ for logistics (check-in time, parking, pets, cancellation)

- **No-go patterns:**
  - Corporate hotel chain aesthetic (generic stock photography, cold minimalism)
  - Overly rustic/cottage-core (this is refined, not folksy)
  - Heavy sales language or urgency tactics ("Book now! Only 2 rooms left!")
  - Dark/moody cinematic tone (the personality is warm and light)
  - Too many CTAs competing — one clear booking path

- **Opener candidates:**
  - Cinematic slideshow of the property (exterior, signature room, breakfast scene) — lets the visitor experience the place in 3 frames
  - Atmospheric banner with a single hero-quality exterior or interior shot
  - Split-hero with property image + welcome text (editorial entry point)

- **Closing pattern:** Soft booking invitation — not hard-sell CTA but a warm nudge to get in touch or check availability. "We'd love to welcome you" energy. Contact handoff with practical info.

---

## Phase 1 — Full Plan

### Identity

- **Preset ID:** hearthstone
- **Name:** Hearthstone
- **Industry:** Hotel / B&B
- **Tagline:** A boutique guesthouse in the Hudson Valley

### Industry Translation

Hearthstone is a boutique guesthouse — 10 rooms in a restored 1890s manor house in the Hudson Valley. The site must feel like an invitation, not a brochure. Atmosphere does the selling: warm natural light, real materials (wood, linen, stone), thoughtful details. The visitor should feel the property before reading a word.

The site logic is: atmosphere first → rooms → proof (reviews) → experience → booking. Every page reinforces "this is a place worth visiting."

### Sitemap Rationale

5 pages:

| Page | Slug | Job |
|------|------|-----|
| Home | index | Atmosphere + room preview + trust + booking path |
| Rooms | rooms | Room types with photos, descriptions, capacity, rates |
| Experience | experience | Breakfast, grounds, local area — what a stay includes |
| About | about | Property story + host introduction |
| Contact | contact | Location, directions, FAQ, booking inquiry |

Every page earns its place. Home sells the feeling. Rooms is the decision page. Experience answers "what will I do there?" About builds trust through story. Contact removes friction.

### preset.json Settings

**Colors — Standard (warm linen):**
- `standard_bg_primary`: #faf8f5
- `standard_bg_secondary`: #f0ece5
- `standard_text_heading`: #2a231c
- `standard_text_content`: #4d453c
- `standard_text_muted`: #8c8378
- `standard_border_color`: #ddd6cc
- `standard_accent`: #8b6f47
- `standard_accent_text`: #ffffff
- `standard_rating_star`: #d4960a

**Colors — Highlight (dark wood):**
- `highlight_bg_primary`: #2a231c
- `highlight_bg_secondary`: #1c1710
- `highlight_text_heading`: #ffffff
- `highlight_text_content`: #d1c8bc
- `highlight_text_muted`: #9b9184
- `highlight_border_color`: #4d453c
- `highlight_accent`: #c9a96e
- `highlight_accent_text`: #2a231c
- `highlight_rating_star`: #d4960a

**Typography:**
- `heading_font`: "Lora", serif — weight 600
- `body_font`: "Mulish", sans-serif — weight 400

**Style:**
- `corner_style`: slightly-rounded
- `spacing_density`: airy
- `button_shape`: auto

### Header Configuration

- `logoText`: "Hearthstone"
- `contactDetailsLine1`: "" (empty)
- `contactDetailsLine2`: "" (empty)
- `contact_position`: "logo"
- `ctaButtonLink`: { href: "contact.html", text: "Book a Room", target: "_self" }
- `ctaButtonStyle`: "primary"
- `center_nav`: false
- `full_width`: true
- `sticky`: true
- `transparent_on_hero`: true
- `color_scheme`: "highlight-primary"

Rationale: Transparent header overlays the slideshow hero, creating an immersive first impression. Sticky nav keeps booking CTA accessible throughout. Primary button style for the CTA — the main conversion action should always be visible.

### Footer Configuration

- Layout: first-featured
- Color scheme: highlight-primary
- Copyright: "© 2026 Hearthstone. All rights reserved."
- Blocks:
  1. `logo_text` — Tagline: "A boutique guesthouse in the Hudson Valley. Ten rooms, morning light, and a place to slow down."
  2. `text_block` — "Visit" with address and phone
  3. `menu_block` — "Explore"
  4. `social_block` — "Follow"

### Page Strategy

#### Home (index) — 7 widgets

The homepage is the atmosphere page. It must make the visitor feel the property in the first scroll, then build trust and show rooms.

| # | Widget | Type | Color Scheme | Spacing | Purpose |
|---|--------|------|-------------|---------|---------|
| 1 | hero_slideshow | slideshow | (per-slide highlight-primary) | — | 3 cinematic slides of the property |
| 2 | trust_figures | key-figures | standard-secondary | top: small, bottom: small | Quick trust stats strip |
| 3 | welcome | image-text | standard-primary | auto | Welcome intro with property photo |
| 4 | rooms_preview | sliding-panels | standard-primary | auto | Room preview — 4 panels |
| 5 | guest_reviews | testimonials | highlight-primary | auto | 3 guest reviews |
| 6 | local_area | image-text | standard-secondary | auto | Local area teaser |
| 7 | booking_cta | action-bar | highlight-primary | auto | "Book Your Stay" |

**hero_slideshow** — 3 slides, height: large, fullwidth: true, autoplay: true, speed: 6000. Slides:
1. Property exterior at golden hour — "Welcome to Hearthstone" / "A boutique guesthouse in the Hudson Valley" / "Explore Our Rooms" button
2. Signature suite interior — "Ten Rooms, Each With a Story" / "View Rooms" button
3. Breakfast table in morning light — "Wake Up to Something Beautiful" / "Plan Your Stay" button

**trust_figures** — 4 figures, layout: grid, columns: 4, card_layout: flat, animate: true. Compact stat strip.
1. "1896" / suffix: "" / label: "Year Established"
2. "10" / suffix: "" / label: "Guest Rooms"
3. "4.9" / suffix: "★" / label: "Guest Rating"
4. "2" / suffix: " acres" / label: "Of Gardens"

**welcome** — image_position: end. Heading: "A Place That Remembers How to Slow Down". Body text about the property's character — restored manor, morning light, quiet rooms, unhurried pace. Button: "Our Story" → about.html.

**rooms_preview** — sliding-panels with 4 panels (room types). Eyebrow: "Rooms", Title: "Find Your Room". Each panel: room photo, room name, capacity/rate as subtitle, "View Details" → rooms.html.
1. The Garden Room — "Queen bed · Garden view · From $245"
2. The Linden Suite — "King bed · Fireplace · From $325"
3. The Orchard Room — "Twin beds · Orchard view · From $215"
4. The Tower Room — "King bed · Panoramic view · From $385"

**guest_reviews** — layout: grid, columns: 3, card_layout: box. 3 testimonial quotes with ratings.

**local_area** — image_position: start (reverse from welcome). Eyebrow: "The Valley". Heading: "More Than a Place to Sleep". Description of Hudson Valley attractions. Button: "Your Stay" → experience.html.

**booking_cta** — Heading: "We'd Love to Welcome You". Text: "Check availability or get in touch — we're happy to help plan your stay." Button: "Book a Room" → contact.html.

#### Rooms (rooms) — 4 widgets

The rooms page is the decision page. Visitors need to see each room clearly, compare, and understand amenities.

| # | Widget | Type | Color Scheme | Spacing | Purpose |
|---|--------|------|-------------|---------|---------|
| 1 | rooms_banner | banner | (bg image, highlight-primary) | — | Page opener |
| 2 | room_cards | card-grid | standard-primary | auto | 4 room cards with photos, descriptions, rates |
| 3 | amenities | icon-card-grid | standard-secondary | auto | 6 amenities, no buttons, centered |
| 4 | rooms_cta | action-bar | highlight-primary | auto | Reserve CTA |

**rooms_banner** — Height: small, fullwidth: true, content_width: medium, alignment: center. Heading: "Our Rooms". Description: "Ten rooms across four styles, each with its own view and character." No button.

**room_cards** — card-grid, 4 cards, 2 columns, box layout, 3:2 aspect, start-aligned text. Eyebrow: "Accommodations", Title: "Choose Your Room". Each card has subtitle (rate), title (room name), description (full room details + specs). No buttons — the cards are the content, not a navigation hub.
1. The Garden Room — $245/night — Queen bed, garden view, rain shower, 280 sq ft
2. The Linden Suite — $325/night — King bed, stone fireplace, clawfoot tub, 420 sq ft
3. The Orchard Room — $215/night — Twin beds, orchard view, writing desk, 260 sq ft
4. The Tower Room — $385/night — King bed, panoramic windows, reading nook, 360 sq ft

**amenities** — icon-card-grid, 6 cards, layout: grid, columns: 3, card_layout: flat, alignment: center, icon_size: large. No buttons on any card. Eyebrow: "Included With Every Room", Title: "Amenities".
1. icon: coffee / "Fresh Breakfast" / Full farm breakfast 8–10 AM, local eggs, fresh bread, seasonal fruit
2. icon: wifi / "High-Speed Wi-Fi" / Complimentary throughout — rooms, porch, and garden
3. icon: car / "Free Parking" / Private on-site parking behind the house
4. icon: bath / "Luxury Bathrooms" / Rain showers or clawfoot tubs, heated floors, local bath products
5. icon: plant-2 / "Two Acres of Gardens" / Stone paths, seating under old oaks, cutting garden, valley views
6. icon: flame / "Evening Fireside" / Common room fireplace lit Oct–Apr, complimentary tea and biscuits

**rooms_cta** — "Ready to Book?" / "Check availability or call us directly." / "Reserve a Room" → contact.html.

#### Experience (experience) — 5 widgets

This page answers "what will I do there?" — it's about the stay, not just the room.

| # | Widget | Type | Color Scheme | Spacing | Purpose |
|---|--------|------|-------------|---------|---------|
| 1 | experience_banner | banner | (bg image, highlight-primary) | — | Page opener |
| 2 | breakfast | image-text | standard-primary | auto | Morning at Hearthstone |
| 3 | property_gallery | gallery | standard-secondary | auto | Property & surroundings |
| 4 | local_guide | image-text | standard-primary | auto | The local area |
| 5 | experience_cta | action-bar | highlight-primary | auto | Plan Your Visit |

**experience_banner** — Height: small, fullwidth: true, alignment: center. Heading: "Your Stay". Description: "Mornings in the garden, afternoons in the valley, evenings by the fire."

**breakfast** — image_position: end. Eyebrow: "Mornings". Heading: "Wake Up to a Real Breakfast". Description of the breakfast experience — farm eggs, fresh bread, seasonal fruit, served in the dining room. Features list. No button.

**property_gallery** — 8 images, layout: grid, columns: 4, aspect_ratio: 3:2, staggered: true. Eyebrow: "The Property", Title: "A Place to Explore". Mix of exterior, garden, common spaces, and detail shots.

**local_guide** — image_position: start. Eyebrow: "The Valley". Heading: "Right in the Heart of It". Description of Hudson Valley — farms, trails, antique shops, wineries, art galleries. Features list of nearby attractions. Button: "Get Directions" → contact.html.

**experience_cta** — "Plan Your Visit" / "We're happy to help you make the most of your stay." / "Get in Touch" → contact.html.

#### About (about) — 4 widgets

The about page tells the story of the place and the people. For a B&B, the hosts' story is the trust mechanism.

| # | Widget | Type | Color Scheme | Spacing | Purpose |
|---|--------|------|-------------|---------|---------|
| 1 | about_banner | banner | (bg image, highlight-primary) | — | Page opener |
| 2 | property_story | image-text | standard-primary | auto | The property's history |
| 3 | hosts | image-text | standard-secondary | auto | Meet the hosts |
| 4 | about_cta | action-bar | highlight-primary | auto | CTA |

**about_banner** — Height: small, fullwidth: true, alignment: center. Heading: "Our Story". Description: "A 130-year-old house with a second life."

**property_story** — image_position: end. Heading: "Built in 1896, Reimagined for Today". Story of the manor house — original character, thoughtful restoration, what was preserved and what was added. Body text about the building's journey.

**hosts** — image_position: start. Heading: "Meet Clara and James". Story of the hosts — why they left the city, what drew them to this house, how they run the place. Button: "Get in Touch" → contact.html.

**about_cta** — "Come Stay With Us" / "We'd love to show you around." / "Book a Room" → contact.html.

#### Contact (contact) — 3 widgets

Contact page removes friction. FAQ sidebar answers the most common pre-booking questions.

| # | Widget | Type | Color Scheme | Spacing | Purpose |
|---|--------|------|-------------|---------|---------|
| 1 | contact_intro | rich-text | standard-primary | auto | Address, phone, email |
| 2 | location_map | map | standard-primary | auto | Map with FAQ sidebar |
| 3 | contact_faq | accordion | standard-secondary | auto | Booking FAQ |

**contact_intro** — text_alignment: center, content_width: medium. Heading: "Get in Touch". Body: address, phone, email in separate paragraphs. Button: "Call Us" (tel link).

**location_map** — address: "142 Old Post Road, Rhinebeck, NY 12572", height: medium, sidebar_position: end. Info block: "Questions?" with phone and email. Social block.

**contact_faq** — Accordion with 5 items, style: separated, sidebar_position: start. Eyebrow: "FAQ", Title: "Before You Book". Sidebar info block with check-in/check-out times.
1. "What is included in the room rate?" — Breakfast, Wi-Fi, parking, garden access
2. "Do you allow pets?" — Small dogs in Garden Room and Orchard Room, $35/night fee
3. "What is your cancellation policy?" — Free cancellation 48 hours before, 50% charge after
4. "Is the property accessible?" — Ground floor rooms, ramp access, details
5. "Can we host a small event?" — Up to 30 guests, garden ceremonies, contact for details

### Menus

**Main menu:** Home, Rooms, Experience, About, Contact
**Footer menu:** Home, Rooms, Experience, About, Contact

### Widget Usage Summary

| Widget | Count | Pages |
|--------|-------|-------|
| slideshow | 1 | Home |
| key-figures | 1 | Home |
| image-text | 4 | Home (×2), Experience, About (×2) = 4 |
| sliding-panels | 1 | Home |
| testimonials | 1 | Home |
| action-bar | 4 | Home, Rooms, Experience, About |
| banner | 4 | Rooms, Experience, About (inner page openers) |
| card-grid | 1 | Rooms |
| icon-card-grid | 1 | Rooms |
| gallery | 1 | Experience |
| rich-text | 1 | Contact |
| map | 1 | Contact |
| accordion | 1 | Contact |

**Total: 13 unique widget types, 21 widget instances across 5 pages.**

**Underused widgets used naturally:**
1. sliding-panels — Room type preview on homepage (4 panels)
2. card-grid — Room detail cards on rooms page (2-col, box, no buttons)

**Accordion with sidebar blocks:** Yes — contact page FAQ with info sidebar

### Differentiation Notes

- **Opener:** Slideshow with 3 cinematic property slides — autoplay at 6s, large height, warm overlay. Different from Keystoned's slideshow (which is real estate listings) and Hue & Co's slideshow (portfolio showcase). Hearthstone's slideshow is atmospheric — more about feeling than information.
- **Color palette:** Warm golden-brown accent on linen white, dark wood highlight. No other preset uses this warm-earth palette.
- **Typography:** Lora (serif) + Mulish (sans-serif) — warm editorial pairing not used elsewhere.
- **Style:** slightly-rounded corners + airy spacing + auto buttons. The combination produces a soft, unhurried feel unique to this preset.
- **Page structure:** Rooms page uses image-tabs for detailed room presentations (not a card grid). Experience page is unique to hotel/B&B — no other preset has this "what your stay includes" concept.
- **Composition pattern:** Home uses atmosphere→stats→welcome→rooms→proof→area→CTA flow. The rooms page uses tabs→amenities flow. Both are distinct from the standard services→about→testimonials patterns.
- **Closing pattern:** Soft, inviting action-bars — "We'd love to welcome you" tone, not hard-sell.
