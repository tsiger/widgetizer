# Saffron v2 — Preset Plan

Industry: Restaurant
Preset id: `saffron-v2`

---

## Phase 0 — Industry Strategy Brief

- **Business archetype:** Menu/catalog business with a reservation flow. A sit-down, chef-driven restaurant — not a quick-service concept, not a delivery-first brand, not a multi-location chain. One room, one kitchen, one evolving menu. The site's structural job is to present the menu honestly, convey the atmosphere accurately, and make booking a table effortless. This is not a lead-gen site; there is no long consideration cycle. Visitors already know they are hungry — the site decides whether they choose this restaurant over the three others in the browser tab.

- **Primary conversion:** Reservation. A single dominant CTA — "Reserve a Table" — that must be visible and low-friction at every scroll depth. Secondary conversions: phone call for same-night seating, private-events inquiry, gift-card purchase. The primary CTA is persistent (header + closing section) and never competes with other actions on the homepage.

- **Trust mechanism:** Atmosphere and craft. A restaurant earns trust in three registers, in order of weight for this concept:
  1. **Atmosphere** — the room, the lighting, the plating, the visible care. If the photographs look like a real room with real food, the visitor believes the restaurant exists and is worth the trip.
  2. **Menu legibility and philosophy** — a menu visitors can actually read, with enough voice to signal point of view without reading as a manifesto. Dish names, prices, and short descriptive lines; not marketing copy.
  3. **Chef/kitchen voice** — a single short About that explains where the food comes from and why the menu looks the way it does. Not a founder bio. Not a mission statement. One paragraph of posture.

  Reviews and awards are secondary for this concept. A single testimonial panel is enough; a wall of quotes would cheapen the voice.

- **Decision mode:** Emotional, fast, and repeat-visit. Decisions are made in minutes, often on a phone, often while a dining companion is watching. The site needs to feel decisive and confident — visitors are not comparison-shopping specifications, they are deciding whether they want to *be in this room tonight*. Once a visitor has eaten here, they return through the site to book again; the experience of the site on repeat visits should feel consistent and quick, not surprising.

- **Brand personality:** Refined, warm, and quiet. Confident without being loud. Evening-forward — the room lives in warm lamplight, not daylight. Ingredient-driven but not precious; seasonal but not performatively so. The site should feel like an editorial food magazine at night — not a cafe, not a hotel restaurant, not a gastropub, not a fine-dining temple.

- **Content posture:** Image-led, anchored by menu. Photography does the heaviest lifting — food and room. The menu is the second-heaviest content surface: not hidden behind a PDF, not buried at the bottom, but given a dedicated page and treated as primary content. Text is spare and intentional; the site reads fast.

- **Audience model:** Effectively single-audience: the diner. There is a secondary slice (private-event inquirers and gift-card buyers) but those are handled by sub-paths, not restructured into co-equal primary journeys. No B2B, no franchising, no press-room.

- **Required page jobs:**
  - **Home** — establish atmosphere, communicate the kind of food and room in the first fold, drive to reservation.
  - **Menu** — present the full current menu clearly and legibly, grouped into courses. The page visitors come back to.
  - **About** — one short chef/kitchen voice section, a few interior and kitchen images. Keeps the site credible without slowing it down.
  - **Reservations** — the booking surface. Policy, hours, contact fallback, any external booking embed, plus the primary form/CTA.
  - **Contact** — location, hours, phone, map, parking and transit notes. A visitor deciding whether to come tonight needs this on its own page for speed.

  Not included on purpose:
  - No "Services" page — the service is dinner.
  - No "Gallery" page — galleries are folded into Home and About; a standalone gallery is tourist-brochure energy for a restaurant.
  - No "Private Events" page in v1 — handled as a single section on Reservations, promoted only if a private-dining program justifies a page later.
  - No blog.

- **No-go patterns:**
  - Overly salesy CTA stacking ("Reserve now! / Order! / Gift Card! / Newsletter!" in one row).
  - Playful rounded buttons or bubbly typography — this is an evening room, not a cafe.
  - Bright daylight-only photography — the mood is lamplight and evening.
  - Stock-looking "chef holding a plate smiling at camera" imagery.
  - Long marketing copy before any proof of food or room.
  - "Farm to table" or "passion for hospitality" language in headings.
  - Carousels of five dish close-ups as the homepage opener — one strong room shot is stronger than five plate shots.
  - Dark cinematic brutalism — the tone is warm and refined, not moody or edgy.

- **Opener candidates:** The homepage must put the visitor *in the room* immediately.
  - **Cinematic atmosphere opener** — a single wide evening interior image, held full-bleed, with a short confident headline overlaid and a single reservation CTA. The room is the first thing a visitor sees. This is the primary candidate.
  - **Editorial food opener** — a single still-life of a signature dish with concise kitchen posture as the headline. Secondary candidate if the room imagery is weaker than the food imagery.
  - Not suitable: proof-first (reviews before atmosphere), offer-first (prix-fixe callouts before anyone has seen the room), process-first (we do not sell "process" here — we sell evenings).

- **Closing pattern:** Reservation nudge with contact fallback. Every page ends with a quiet highlight-surface section that reads as an invitation, not a sales push — short line of copy, primary CTA to reserve, secondary link to phone/address for visitors who prefer to call. The closing should feel like the end of a menu, not the end of a landing page.

---

## Phase 0 Completion Test

- **Why would a customer trust this business?** Because the room looks real, the menu reads like a chef wrote it, and the booking flow is a single click away.
- **What does this site need to prove in the first fold?** That this is an actual restaurant with a point of view and a room worth sitting in — and that reserving a table takes one tap.
- **What should this site feel like — and what should it not feel like?** Feels like: a quiet evening in a warm room, flipping through a menu. Doesn't feel like: a hotel restaurant, a delivery app, a cafe, a fine-dining temple, a gastropub, a marketing landing page.
- **What pages are actually necessary?** Home, Menu, About, Reservations, Contact. Five pages, each with a clear job. No padding.
- **What kind of opener fits this industry's decision mode?** A cinematic atmosphere opener — one wide evening room shot, a short confident line, one CTA. Decisions happen in the first fold.
- **What should feel strongest: offer, proof, imagery, process, or atmosphere?** Atmosphere first, menu (imagery + structure) second. Proof plays a supporting role.

Gate passed. Proceeding to Phase 1 is now permitted.

---

## Phase 1 — Plan

### Identity

- **Preset id:** `saffron-v2`
- **Name:** Saffron v2
- **Industry label:** Restaurant
- **One-liner:** Refined, warm, evening-forward restaurant preset. Editorial serif-over-sans typography, saffron-amber accent on warm cream, warm near-black highlight surfaces. Atmosphere-first imagery, menu-as-primary-content, a single dominant reservation CTA that appears on every page close.

### Industry translation (applied commitments from Phase 0)

- Chef-driven, single-room restaurant. Not delivery, not chain, not cafe.
- One dominant action: Reserve a Table. Persistent header CTA + highlight closing CTA on every page.
- Trust = atmosphere → menu legibility → chef voice. Reviews/awards supporting, not dominant.
- Evening room: warm lamplight palette, not daylight, not moody-brutalist.
- Image-led, menu-anchored. Text is spare and confident.
- Audience: the diner. No B2B, no franchise, no press-room surface.

### Sitemap rationale

Five pages, each earning its place:

- **Home (`index`)** — establish room + kitchen voice in first fold, drive reservation.
- **Menu (`menu`)** — full readable menu, grouped by course. The page diners return to.
- **About (`about`)** — one kitchen-voice block, one full-width atmospheric moment, press panel. Credibility without slowing the site.
- **Reservations (`reservations`)** — booking info, policies, fallback contact. The conversion surface.
- **Contact (`contact`)** — location, hours, map, transit/parking. Answers "should I go tonight?" fast.

Deliberately excluded:
- No "Services" page — the service is dinner.
- No standalone "Gallery" — gallery is folded into Home masonry and About.
- No "Private Events" in v1 — handled as an accordion item on Reservations.
- No blog, no press page, no careers.

### `preset.json` settings

**Colors (warm cream + warm near-black + saffron amber):**

| Token | Hex | Role |
|---|---|---|
| `standard_bg_primary` | `#f8f4ec` | Warm cream — default page surface, paper-like warmth |
| `standard_bg_secondary` | `#efe8db` | Warm linen — banding surface |
| `standard_text_heading` | `#1e1812` | Warm near-black — same as highlight bg for palette coherence |
| `standard_text_content` | `#3a302a` | Warm dark grey — readable body |
| `standard_text_muted` | `#7a6e62` | Warm muted — eyebrows, captions |
| `standard_border_color` | `#ddd3c2` | Warm light grey |
| `standard_accent` | `#b07a2a` | Saffron amber — the preset's signature hue |
| `standard_accent_text` | `#fdfaf4` | Warm off-white — text on saffron buttons |
| `standard_rating_star` | `#d69a3e` | Warm gold |
| `highlight_bg_primary` | `#1e1812` | Warm evening near-black — CTA surface |
| `highlight_bg_secondary` | `#15110d` | Slightly deeper warm black — second highlight band |
| `highlight_text_heading` | `#fdfaf4` | Warm off-white |
| `highlight_text_content` | `#d8cfc2` | Warm light grey on dark |
| `highlight_text_muted` | `#9a8f80` | Warm muted on dark |
| `highlight_border_color` | `#3a302a` | Warm dark border |
| `highlight_accent` | `#d69a3e` | Brighter saffron — legible on dark |
| `highlight_accent_text` | `#1e1812` | Warm near-black — text on saffron button over dark |
| `highlight_rating_star` | `#d69a3e` | Warm gold |

Rationale: the whole palette lives in one warm evening brand world. Standard surfaces read as warm paper under lamplight; highlight surfaces read as the evening room after sunset. The saffron accent never competes with the photography — it punctuates, it never shouts. Contrast verified: `#3a302a` on `#f8f4ec` reads at editorial strength; `#d8cfc2` on `#1e1812` stays comfortable on dark; `#b07a2a` button on cream reads as button, not decoration.

**Typography:**

- `heading_font`: `{ stack: "\"Fraunces\", serif", weight: 500 }` — a modern editorial serif. Warm at mid-weight without being historicist (Playfair) or assertive (Bodoni). Exact values verified against `arch-fonts-list.csv` (Fraunces supports 100–900).
- `body_font`: `{ stack: "\"Inter Tight\", sans-serif", weight: 400 }` — a quiet, composed modern sans. Pairs with Fraunces for a clean editorial feel without either face dominating. Exact values verified (Inter Tight supports 100–900).

Rationale: Phase 0 called for "editorial food magazine at night." Fraunces gives the magazine tone; Inter Tight keeps reading copy contemporary and unhurried. Avoids the overused Playfair + Source-Sans pairing pattern. Rejects: cafe pairings (rounded display), gastropub pairings (slab serif + condensed sans), fine-dining pairings (Didone caps everywhere).

**Style:**

- `corner_style`: `sharp` — composed, editorial, no rounding to read as cafe.
- `spacing_density`: `airy` — evening, unhurried, magazine-style breathing room.
- `button_shape`: `sharp` — matches corner style; confident, not playful.

Rationale: these three together form a distinct identity axis before any content loads. Sharp + airy = the preset reads as a refined magazine from the first paint, distinct from compact/rounded or default/auto presets.

### Header configuration

Settings in `templates/global/header.json`:

| Setting | Value | Reason |
|---|---|---|
| `logoText` | `"Saffron"` | Word-mark in Fraunces |
| `contactDetailsLine1` | `"(718) 555-0142"` | Phone — real contact, not slogan (per header-contact-fields rule) |
| `contactDetailsLine2` | `"247 Elm Street, Brooklyn"` | Address — real contact |
| `contact_position` | `"logo"` | Groups with logo, keeps menu clean |
| `headerNavigation` | `"main-menu"` | Default |
| `center_nav` | `false` | Classic left-logo / right-nav feel for a restaurant |
| `ctaButtonLink` | `{ href: "reservations.html", text: "Reserve a Table", target: "_self" }` | The one dominant action, present on every page |
| `ctaButtonStyle` | `"primary"` | Must read as the primary action |
| `full_width` | `true` | Continuous with page rhythm |
| `sticky` | `true` | Reservation CTA stays in reach on long Menu scrolls |
| `transparent_on_hero` | `true` | Home banner uses a full-bleed evening image; transparent header keeps the room unbroken |
| `color_scheme` | `"standard-primary"` | Warm cream, saffron CTA, warm-black nav — matches palette |

### Footer configuration

Settings in `templates/global/footer.json`:

| Setting | Value |
|---|---|
| `copyright` | `"© 2026 Saffron. All rights reserved."` |
| `layout` | `"first-featured"` (brand column gets the prominence) |
| `color_scheme` | `"highlight-primary"` (evening room surface — continuous with closing CTA) |

Four blocks (max allowed), in order:

1. `logo_text` — brand posture. `logo_text` setting inherits from header's `"Saffron"`. `text`: short one-liner, e.g., `"Seasonal evening kitchen. Brooklyn."`
2. `text_block` — title `"Hours"`. richtext listing the opening hours (closed Mon; Tue–Sat dinner; Sun brunch). Plus a short address line.
3. `menu_block` — title `"Visit"`. Uses `footer-menu`.
4. `social_block` — title `"Follow"`. Social icons from theme settings (Instagram primary, no need to populate here).

Rationale: no contact-details widget near the footer on any page (per the anti-redundancy memory). The footer carries the address + hours; pages that need location info use the `map` widget (Contact) or a `split-content` (Reservations), not `contact-details`.

### Page strategy

| Page | Role | Opener | Closer | Highlight sections |
|---|---|---|---|---|
| Home | Establish atmosphere, drive reservation | `banner` full-bleed evening room (hero, transparent header) | `action-bar` CTA | 2 (banner hero, action-bar) |
| Menu | Present full menu clearly | `banner` text-only intro | `action-bar` CTA | 1 (action-bar) |
| About | Chef voice, room credibility | `split-hero` kitchen split | `action-bar` CTA | 1 (action-bar) |
| Reservations | Book / policies / fallback | `banner` text-only intro | `action-bar` CTA | 1 (action-bar) |
| Contact | Location / hours / transit | `banner` text-only intro | `action-bar` CTA | 1 (action-bar) |

Highlight surface semantics (consistent across the site per §9.4):
- `highlight-primary` = reservation CTA surface. Appears at every page close as an action-bar. Appears once on Home as the image-hero banner.
- `highlight-secondary` = not used in v1. The preset stays disciplined: one highlight role, one surface.
- `standard-secondary` = banding between standard-primary sections (used on Menu between courses, and on About/Contact for the policies/FAQ accordion).

### Page-by-page widget plan

Exact widget settings to follow the file format reference in Phase 3. Below is the intent and settings map per widget, enough to write JSON without rework.

#### Home (`index.json`)

1. **`home_hero`: `banner`** (widgetsOrder[0])
   - `fullwidth: true`, `height: large`, `content_width: medium`, `alignment: center`, `vertical_alignment: center`, `color_scheme: highlight-primary`, `top_spacing: none`, `bottom_spacing: auto`
   - Background image: wide evening interior (warm lamplight). Transparent header sits over it.
   - Blocks (`blocksOrder`): `eyebrow`, `title`, `subtitle`, `cta`
     - `eyebrow`: `text`, size `sm`, uppercase true, muted true, `"Brooklyn · Evening kitchen"`
     - `title`: `heading`, size `7xl`, `"An evening room,<br>one menu at a time."`
     - `subtitle`: `text`, size `base`, uppercase false, `"Seasonal, chef-led, served Tuesday through Sunday."`
     - `cta`: `button`, style `primary`, size `large`, link → `reservations.html` "Reserve a Table"

2. **`chef_note`: `split-content`** (widgetsOrder[1])
   - `balance: equal`, `sticky_column: none`, `color_scheme: standard-primary`, `top_spacing: auto`, `bottom_spacing: auto`
   - Blocks: left column holds `eyebrow` + `heading` + `text` + `button`; right column holds an accent `image` (detail shot — olives in a bowl, a plated dish close-up).
     - left `eyebrow`: text `"From the kitchen"`, size sm, uppercase, muted, position `left`
     - left `heading`: size `3xl`, position `left`, `"We write the menu each week<br>around what the market gives us."`
     - left `text`: richtext, size `base`, position `left`, one paragraph (3 sentences max) of kitchen posture — no "passion," no "farm to table."
     - left `button`: style `secondary`, size `medium`, link → `about.html` "Read more", position `left`
     - right `image`: accent detail photo, width 85%, position `right`

3. **`atmosphere_wall`: `masonry-gallery`** (widgetsOrder[2])
   - `eyebrow: "The room"`, `eyebrow_uppercase: true`, `title` omitted (the eyebrow is enough — editorial restraint), `description` omitted, `heading_alignment: center`, `alignment: center`, `columns_desktop: 3`, `gap: medium`, `color_scheme: standard-secondary`, `top_spacing: auto`, `bottom_spacing: auto`
   - 7 mixed-aspect images: wide room, plated dish overhead, bar detail, diners in-conversation (back of head, no faces), pastry close-up, warm-light corner table, kitchen pass detail. No captions — editorial silence.

4. **`menu_teaser`: `priced-list`** (widgetsOrder[3])
   - `eyebrow: "Selected dishes"`, `eyebrow_uppercase: true`, `title: "From this week's menu"`, `description` omitted, `heading_alignment: center`, `layout: two-column`, `color_scheme: standard-primary`, `top_spacing: auto`, `bottom_spacing: auto`
   - 6 items (no images — editorial text-only teaser). Dish name, 1-line description, price. Example tone: "Hand-cut tagliatelle / brown butter, sage, aged parmesan / 24".
   - After items: a follow-up `button` block? Priced-list has only `item` blocks. CTA to full menu is handled instead by the action-bar below. Fine.

5. **`press_quote`: `testimonial-hero`** (widgetsOrder[4])
   - `image_position: start`, `color_scheme: standard-secondary`, `top_spacing: auto`, `bottom_spacing: auto`
   - `author_image`: a diner-at-table or chef portrait (warm evening light).
   - Blocks: `quote` (text richtext, size `lg`, not uppercase, not muted — `"<p>One of the most assured new restaurants in Brooklyn. The room alone is worth the trip.</p>"`), `attribution` (text, size sm, uppercase, muted — `"— The New York Times"`)

6. **`home_cta`: `action-bar`** (widgetsOrder[5])
   - `fullwidth: false`, `color_scheme: highlight-primary`, `top_spacing: auto`, `bottom_spacing: auto`
   - Blocks: `heading` (size `3xl`, `"Join us for dinner."`), `text` (size `base`, not muted, `"Reservations open 30 days in advance."`), `button` (style `primary`, size `large`, link → `reservations.html` "Reserve a Table", link_2 style `secondary` → `tel:+17185550142` "Call (718) 555-0142")

#### Menu (`menu.json`)

1. **`menu_intro`: `banner`** (widgetsOrder[0])
   - `fullwidth: true`, `height: small`, `content_width: medium`, `alignment: center`, `vertical_alignment: center`, `color_scheme: standard-primary`, `top_spacing: auto`, `bottom_spacing: auto`
   - No background image (interior page header).
   - Blocks: `eyebrow` ("The menu", uppercase, muted), `title` (`heading`, size `5xl`, `"This week at Saffron"`), `subtitle` (`text`, size `base`, `"Updated every Tuesday. Available à la carte or as a four-course tasting."`)

2. **`menu_starters`: `priced-list`** (widgetsOrder[1])
   - `eyebrow: "Starters"`, uppercase, `title` omitted, `layout: single-column`, `heading_alignment: start`, `color_scheme: standard-primary`
   - 5 items. No images (clean typographic menu, editorial).

3. **`menu_mains`: `priced-list`** (widgetsOrder[2])
   - `eyebrow: "Mains"`, uppercase, `layout: single-column`, `heading_alignment: start`, `color_scheme: standard-secondary` (banding)
   - 6 items.

4. **`menu_desserts`: `priced-list`** (widgetsOrder[3])
   - `eyebrow: "Desserts"`, uppercase, `layout: single-column`, `heading_alignment: start`, `color_scheme: standard-primary`
   - 4 items.

5. **`menu_wine`: `priced-list`** (widgetsOrder[4])
   - `eyebrow: "Wine by the glass"`, uppercase, `title: ""`, `layout: two-column`, `heading_alignment: start`, `color_scheme: standard-secondary` (banding)
   - 8 items (natural/low-intervention focus to match kitchen posture). No descriptions on wine — just name, region, price.

6. **`menu_cta`: `action-bar`** (widgetsOrder[5]) — same shape as `home_cta` but copy: heading `"Ready to eat?"`, primary `"Reserve a Table"` → `reservations.html`, secondary `"Call (718) 555-0142"` → `tel:+17185550142`.

#### About (`about.json`)

1. **`about_hero`: `split-hero`** (widgetsOrder[0])
   - `image_position: start`, `overlay_color: ""` (no overlay needed since content is on right standard side), `color_scheme: standard-primary`, `top_spacing: auto`, `bottom_spacing: auto`
   - Left: warm kitchen-pass image (chef at the pass, low light, candid).
   - Right blocks: `eyebrow` ("About", uppercase, muted), `heading` (size `6xl`, `"A small kitchen,<br>a short menu,<br>an honest room."`), `text` (size `base`, one sentence of posture).

2. **`philosophy`: `split-content`** (widgetsOrder[1])
   - `balance: equal`, `sticky_column: left`, `color_scheme: standard-primary`, `top_spacing: auto`, `bottom_spacing: auto`
   - Left: sticky `eyebrow` ("Philosophy", uppercase, muted) + `heading` (size `3xl`, `"We cook around the market."`)
   - Right: two `text` blocks (two short paragraphs — kitchen approach, sourcing posture) + one `image` block (85% width, accent detail).

3. **`kitchen_image`: `image`** (widgetsOrder[2])
   - `fullwidth: true`, no link, `top_spacing: none`, `bottom_spacing: none`
   - Full-bleed atmospheric dining room (evening, candlelit). Placed flush against philosophy above and press panel below.

4. **`press`: `testimonials`** (widgetsOrder[3])
   - `eyebrow: "Press"`, uppercase, `title: "What critics have said"`, `heading_alignment: center`, `layout: grid`, `columns_desktop: 3`, `card_layout: flat`, `color_scheme: standard-secondary` (banding after the full-width image)
   - Three `quote` blocks. Each: short quote (1 sentence), name field as publication name ("The New York Times", "Eater NY", "Infatuation"), title field omitted, avatar omitted, rating blank. Editorial, not corporate.

5. **`about_cta`: `action-bar`** (widgetsOrder[4]) — highlight-primary, same shape as others. Heading `"Visit us."`, primary `"Reserve a Table"`, secondary `"See the menu"` → `menu.html`.

#### Reservations (`reservations.json`)

1. **`reservations_intro`: `banner`** (widgetsOrder[0])
   - `fullwidth: true`, `height: small`, `color_scheme: standard-primary`, text-only.
   - Blocks: `eyebrow` ("Reservations", uppercase, muted), `title` (size `5xl`, `"Book a table"`), `subtitle` (size `base`, `"Tuesday through Sunday. We seat parties up to 6 in the main room."`)

2. **`booking`: `split-content`** (widgetsOrder[1])
   - `balance: equal`, `color_scheme: standard-primary`, `top_spacing: auto`, `bottom_spacing: auto`
   - Left column (position `left`): `eyebrow` ("Online", uppercase, muted), `heading` (size `2xl`, `"Reserve online"`), `text` (1 sentence: "Our booking is handled by Resy. Tap below to check availability."), `button` (primary, large, link → external Resy URL placeholder `"https://resy.com/"`, text "Check availability", target `_blank`).
   - Right column (position `right`): `eyebrow` ("By phone or email", uppercase, muted), `heading` (size `2xl`, `"Prefer to call?"`), `text` (richtext with phone and email on separate lines), `button` (secondary, large, link → `tel:+17185550142` "Call us").

3. **`policies`: `accordion`** (widgetsOrder[2])
   - `eyebrow: "Before you visit"`, uppercase, `title: "Good to know"`, `heading_alignment: start`, `style: separated`, `allow_multiple: false`, `sidebar_position: end`, `color_scheme: standard-secondary` (banding)
   - `item` blocks (Q&A): Cancellation policy (24 hours), Dress code (smart casual), Arriving late (15-min grace), Dietary & allergies (kitchen accommodates; notify in advance), Children (welcome; high chairs available), Large parties (parties of 7+ → contact directly), Private dining (semi-private table of 10; email for inquiries).
   - No `info`/`social` blocks — no sidebar needed.

4. **`reservations_cta`: `action-bar`** (widgetsOrder[3]) — highlight-primary. Heading `"Still deciding?"`, primary button → `menu.html` "See the menu", secondary → `tel:+17185550142` "Call us".

#### Contact (`contact.json`)

1. **`contact_intro`: `banner`** (widgetsOrder[0])
   - `fullwidth: true`, `height: small`, `color_scheme: standard-primary`, text-only.
   - Blocks: `eyebrow` ("Find us", uppercase, muted), `title` (size `5xl`, `"Visit the room"`), `subtitle` (size `base`, `"Two blocks from the Classon Avenue G."`)

2. **`location`: `map`** (widgetsOrder[1])
   - `address: "247 Elm Street, Brooklyn, NY 11238"`, `embed_url`: placeholder Google Maps embed URL, `directions_link`: Google Maps directions URL, `height: large`, `show_address: true`, `sidebar_position: end`, `heading_alignment: start`, `color_scheme: standard-primary`
   - Two `info` blocks in sidebar:
     - `info_hours`: title `"Hours"`, richtext (Mon closed / Tue–Sat 5:30–11 / Sun 11–3 & 5:30–9)
     - `info_transit`: title `"Transit & parking"`, richtext (G to Classon Ave, bike racks on Elm, no dedicated parking — street spots after 7pm)

3. **`getting_here`: `accordion`** (widgetsOrder[2])
   - `eyebrow: "Getting here"`, uppercase, `title: "Practical details"`, `heading_alignment: start`, `style: separated`, `allow_multiple: false`, `color_scheme: standard-secondary` (banding)
   - `item` blocks: Public transit, Parking, Accessibility (step-free entry, accessible bathroom), Nearby stops for a drink before, What to do with bikes.

4. **`contact_cta`: `action-bar`** (widgetsOrder[3]) — highlight-primary. Heading `"Hungry already?"`, primary `"Reserve a Table"` → `reservations.html`, secondary `"See the menu"` → `menu.html`.

### Menus

**`main-menu.json`** (id: `main-menu`, name: `Main Menu`):

- Home → `index.html`
- Menu → `menu.html`
- About → `about.html`
- Reservations → `reservations.html`
- Contact → `contact.html`

Flat menu (no sub-items). Restaurant nav should be instant — no hover delays, no "More".

**`footer-menu.json`** (id: `footer-menu`, name: `Footer Menu`):

- Menu → `menu.html`
- About → `about.html`
- Reservations → `reservations.html`
- Contact → `contact.html`

No Home in footer (convention). No duplicate of the header CTA.

### Widget usage summary

| Widget | Count | Pages |
|---|---|---|
| `banner` | 4 | Home (hero with image), Menu, Reservations, Contact (all three text-only interior headers) |
| `split-hero` | 1 | About (kitchen split) |
| `split-content` | 3 | Home (chef note), About (philosophy), Reservations (booking split) |
| `priced-list` | 5 | Home (teaser), Menu (Starters, Mains, Desserts, Wine) |
| `masonry-gallery` | 1 | Home (atmosphere wall) |
| `testimonial-hero` | 1 | Home (single press quote) |
| `testimonials` | 1 | About (press panel, grid) |
| `image` | 1 | About (full-bleed kitchen) |
| `accordion` | 2 | Reservations (policies), Contact (getting here) |
| `map` | 1 | Contact |
| `action-bar` | 5 | Home, Menu, About, Reservations, Contact (one per page close, all highlight-primary, all `fullwidth: false`) |
| `header` (global) | 1 | |
| `footer` (global) | 1 | |

Widget count: 11 distinct widget types across 5 pages. No widget is used as filler. No carousels (`testimonial-slider`, `slideshow`), no corporate widgets (`logo-cloud`, `trust-bar`, `icon-card-grid`, `pricing`), no overly-commercial widgets (`countdown`, `event-list`) — these would contradict Phase 0 no-go patterns.

Two proof surfaces (testimonial-hero on Home, testimonials grid on About) — same trust mechanism (press), different visual weight for the two pages' different jobs.

### Differentiation notes (per §15)

- **Homepage opener type:** cinematic full-bleed evening interior via `banner` with `transparent_on_hero`. Image-first, not editorial-text-first, not proof-first, not offer-first.
- **Homepage composition pattern:** image hero → editorial split-content → atmosphere masonry band → typographic menu teaser → single quote band → CTA. Atmosphere → voice → proof-of-offering → press → ask.
- **Services-section pattern:** there is no Services page. The menu is the service. Menu page is a 4-course priced-list stack with banding — unusually content-heavy.
- **Proof pattern:** two formats, both press (not customer reviews). `testimonial-hero` (single, large) on Home; `testimonials` grid (three, flat) on About. No testimonial-slider. No review counts.
- **Closing pattern:** `action-bar` highlight-primary on every page, always `fullwidth: false`, always primary-to-reservations + secondary-to-call-or-menu. Copy varies per page, surface does not.
- **Header pattern:** left logo with stacked contact below, right nav with primary saffron CTA, sticky, transparent on homepage hero only. Not centered-nav (too ceremonial), not menu-with-contact-in-the-right (too corporate).
- **Accent family:** warm saffron amber on warm cream + warm near-black. The whole palette is one temperature. No cool accents, no gold-on-black "luxury" cliche, no primary-blue trust signaling.
- **Font pairing family:** modern serif (Fraunces 500) over modern sans (Inter Tight 400). Editorial but contemporary. Avoids Playfair cliche.

### Anti-photocopy check (per §15 anti-photocopy rule)

Not differentiated by images alone. Differentiated on every axis: opener type, sitemap shape (no Services page, Menu is the content anchor), proof pattern, palette family, typography family, style triplet, CTA surface consistency. Another restaurant preset could share the industry but still differ meaningfully via cooler palette, caps-Didone type, offer-first opener, review-grid proof, multiple conversion types — this preset commits to the "single evening room" identity and lets other axes fall in line.

