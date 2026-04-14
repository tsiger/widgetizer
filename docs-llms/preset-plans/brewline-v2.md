# Brewline v2 — Preset Plan

Industry: Cafe / Coffee Shop
Preset id: `brewline-v2`

---

## Phase 0 — Industry Strategy Brief

- **Business archetype:** Neighborhood coffee bar with a light menu and take-home beans. This is a one-location, in-person small business site for a cafe people return to several times a week. It is not a reservation-first restaurant, not a remote coffee subscription brand, not a generic bakery, and not a lifestyle merch store. The structural job is to make the space feel real, make the menu easy to scan, and make the decision to stop by feel immediate.

- **Primary conversion:** Visit the cafe in person. The strongest action is "Plan Your Visit" or simply deciding to walk over now. Secondary conversions: view the menu before leaving home, pick up a bag of beans, call with a quick question. The site should lower the friction between "that looks good" and "I'm going there."

- **Trust mechanism:** A coffee bar earns trust through atmosphere, menu clarity, and process credibility:
  1. **Atmosphere** — the room, the counter, the cups, the light. Visitors need to believe this is a place they want to spend twenty minutes in.
  2. **Menu clarity** — coffee drinks, pastries, and house specials need to be visible without digging. This is a habitual business; returning visitors come back to check what is pouring.
  3. **Roast/process credibility** — a short explanation of where the beans come from and how the shop approaches roasting and brewing. Enough to signal care, not enough to turn into a lecture.

  Reviews help, but only as supporting proof. A cafe does not need a giant social-proof wall to feel believable if the room and menu already look right.

- **Decision mode:** Fast, local, and repeat-visit. A visitor often decides in under a minute, often on mobile, often while already nearby. The site needs to feel warm and immediate, not high-consideration. On repeat visits, speed matters even more than persuasion.

- **Brand personality:** Grounded, warm, and quietly crafted. Morning light rather than nightlife. Contemporary without feeling trendy-for-a-season. Friendly without becoming cute. The site should feel like a thoughtfully designed neighborhood coffee bar with a real roasting habit, not a rustic faux-artisan concept and not a sleek startup cafe.

- **Content posture:** Image-led, anchored by menu and process. Photography carries the first impression, but the menu and the roast story do the real persuasion. Text should be concise and useful.

- **Audience model:** Effectively single-audience: local coffee drinkers and neighborhood visitors. Some come for a quick espresso, some stay for a slower cup and pastry, but they share the same site journey. There is no wholesale, no franchise, and no separate B2B path.

- **Required page jobs:**
  - **Home** — establish the room and the kind of coffee experience in the first fold.
  - **Menu** — show drinks, seasonal specials, pastries, and take-home beans clearly.
  - **Story** — explain the shop's roast-and-brew point of view without turning into a founder-bio page.
  - **Visit** — answer location, hours, map, parking, laptop, and seating questions fast.

  Not included on purpose:
  - No generic "Services" page.
  - No standalone gallery page; images support pages instead of becoming the page.
  - No blog.
  - No online store in v1; bags of beans are mentioned, not turned into a catalog flow.

- **No-go patterns:**
  - Overly rustic coffee clichés: chalkboard overload, burlap copy, fake workshop language.
  - Hyper-playful rounded UI or candy-shop color palettes.
  - Nightlife cocktail-bar darkness; this is morning-to-afternoon warmth.
  - Long brand-manifesto copy before showing the room or menu.
  - Corporate "productivity cafe" tone or laptop-startup language.
  - Generic stock photos of people laughing with takeaway cups.
  - Overbuilt multi-step CTA logic on every page.

- **Opener candidates:**
  - **Room-and-counter opener** — a real view into the bar and seating area with a short headline and two practical actions. Primary candidate.
  - **Cup-and-craft opener** — a detail-led opener showing espresso or pour-over service if the room image is weaker than the coffee imagery.
  - **Neighborhood-light opener** — exterior or front-window image that signals this is a real local place.

  Not suitable: proof-first openers, process-first openers, or hard-sell offer-first openers.

- **Closing pattern:** Soft visit invitation. Every page should end with a contained invitation to stop by, paired with a practical action. The tone should feel like "swing by this week," not "convert now."

---

## Phase 0 Completion Test

- **Why would a customer trust this business?** Because the room feels real, the menu is easy to scan, and the roast story sounds like practice rather than marketing.
- **What does this site need to prove in the first fold?** That Brewline is a real neighborhood place with a counter worth walking into and coffee worth making a small detour for.
- **What should this site feel like — and what should it not feel like?** Feels like: warm daylight, quiet craft, a local routine. Does not feel like: rustic cosplay, startup branding, or a nightlife bar.
- **What pages are actually necessary?** Home, Menu, Story, Visit. Four pages, each with a clear job.
- **What kind of opener fits this industry's decision mode?** A room-and-counter opener with immediate practical actions.
- **What should feel strongest: offer, proof, imagery, process, or atmosphere?** Atmosphere first, menu second, process third.

Gate passed. Proceeding to Phase 1 is permitted.

---

## Phase 1 — Plan

### Identity

- **Preset id:** `brewline-v2`
- **Name:** Brewline v2
- **Industry label:** Cafe / Coffee Shop
- **One-liner:** Warm neighborhood coffee bar preset with editorial serif typography, oat-and-espresso color surfaces, atmosphere-first imagery, and a tight 4-page structure built around daily visit intent.

### Industry translation (applied commitments from Phase 0)

- One-location cafe, not a chain or e-commerce-first coffee brand.
- Main action is visiting in person; supporting actions are menu lookup and quick contact.
- Trust = room atmosphere -> menu clarity -> roast process.
- Warm daylight brand world, not rustic and not nightlife-dark.
- Image-led, but menu and visit logistics stay practical and obvious.
- Four pages only: no filler pages, no generic business-shell extras.

### Sitemap rationale

Four pages, each earning its place:

- **Home (`index`)** — first impression, neighborhood atmosphere, and signature offer.
- **Menu (`menu`)** — drinks, pastries, and bagged beans in a readable flow.
- **Story (`story`)** — roast-and-brew philosophy with just enough process detail.
- **Visit (`visit`)** — hours, address, map, and practical questions.

Deliberately excluded:

- No "About" page separate from Story; the page job is the process and point of view.
- No "Contact" page separate from Visit; for a cafe these jobs belong together.
- No "Gallery" page; imagery is integrated into Home and Story.
- No online ordering or merch flow in v1.

### `preset.json` settings

**Colors (oat cream + espresso brown + copper accent):**

| Token | Hex | Role |
|---|---|---|
| `standard_bg_primary` | `#f4efe6` | Oat cream — warm default surface |
| `standard_bg_secondary` | `#e9dfd0` | Steamed-milk beige — section banding |
| `standard_text_heading` | `#241a14` | Espresso brown — primary heading tone |
| `standard_text_content` | `#4a3a31` | Deep roast brown — readable body |
| `standard_text_muted` | `#7b6a5b` | Warm muted taupe |
| `standard_border_color` | `#d7c9b7` | Soft warm border |
| `standard_accent` | `#8f5a34` | Coffee-copper accent |
| `standard_accent_text` | `#fffaf4` | Warm off-white on accent |
| `standard_rating_star` | `#c89242` | Roasted-gold star |
| `highlight_bg_primary` | `#241a14` | Espresso-dark highlight surface |
| `highlight_bg_secondary` | `#1a120e` | Darker roast surface |
| `highlight_text_heading` | `#fff9f1` | Warm cream-on-dark heading |
| `highlight_text_content` | `#d7cabd` | Warm light copy on dark |
| `highlight_text_muted` | `#a79686` | Muted copy on dark |
| `highlight_border_color` | `#43322a` | Dark warm border |
| `highlight_accent` | `#c89242` | Copper-gold accent on dark |
| `highlight_accent_text` | `#241a14` | Espresso text on accent |
| `highlight_rating_star` | `#c89242` | Copper-gold star |

Rationale: the palette stays in a warm coffee-bar world without collapsing into obvious brown-on-brown cliché. Standard surfaces feel like paper, milk, and daylight; highlight surfaces feel like espresso wood and shadow under the bar. The accent is coppery rather than orange, so buttons feel crafted rather than seasonal or trendy.

**Typography:**

- `heading_font`: `{ stack: "\"Fraunces\", serif", weight: 600 }`
- `heading_scale`: `105`
- `body_font`: `{ stack: "\"Manrope\", sans-serif", weight: 400 }`
- `body_scale`: `100`

Rationale: Fraunces gives Brewline a contemporary editorial voice without becoming formal or luxury-coded. Manrope is calm, compact, and modern enough to keep menu reading clear. The pair avoids the default coffee-shop trap of retro display fonts and chalkboard energy.

**Style:**

- `corner_style`: `slightly-rounded`
- `spacing_density`: `airy`
- `button_shape`: `auto`
- `instagram_url`: `"https://instagram.com/brewlinecoffee"`
- `threads_url`: `"https://threads.net/@brewlinecoffee"`

Rationale: slight rounding keeps the site approachable, while airy spacing gives the room and imagery breathing room. Auto button shape stays restrained and contemporary.

### Header configuration

Settings in `templates/global/header.json`:

| Setting | Value | Reason |
|---|---|---|
| `logoText` | `"Brewline"` | Wordmark in Fraunces |
| `contactDetailsLine1` | `"(718) 555-0188"` | Real contact detail, not a slogan |
| `contactDetailsLine2` | `"214 Dean Street, Brooklyn"` | Real location signal |
| `contact_position` | `"menu"` | Keeps the header practical and compact |
| `headerNavigation` | `"main-menu"` | Default |
| `center_nav` | `false` | Classic left-logo/right-nav composition |
| `ctaButtonLink` | `{ href: "visit.html", text: "Plan Your Visit", target: "_self" }` | Main action across the site |
| `ctaButtonStyle` | `"primary"` | Must read as the primary action |
| `full_width` | `true` | Continuous with the airy layout |
| `sticky` | `true` | Menu + visit action stays available on long scrolls |
| `transparent_on_hero` | `false` | First page uses split-hero, so a solid header reads cleaner |
| `color_scheme` | `"standard-primary"` | Warm default surface |

### Footer configuration

Settings in `templates/global/footer.json`:

| Setting | Value |
|---|---|
| `copyright` | `"© 2026 Brewline. All rights reserved."` |
| `layout` | `"first-featured"` |
| `color_scheme` | `"highlight-primary"` |

Four blocks, in order:

1. `logo_text` — `logo_text: "Brewline"`, text: `"Neighborhood coffee bar and small-batch roastery in downtown Brooklyn."`
2. `text_block` — title `"Hours"`, richtext with weekday/weekend hours and address.
3. `menu_block` — title `"Explore"`, menu: `footer-menu`.
4. `social_block` — title `"Follow"`.

### Page strategy

| Page | Role | Opener | Closer | Highlight sections |
|---|---|---|---|---|
| Home | Establish room + signature offer | `split-hero` room-and-counter opener | `action-bar` | 1 |
| Menu | Present drinks and pastries clearly | `banner` with coffee-service image | `action-bar` | 1 |
| Story | Explain roast-and-brew point of view | `split-hero` process opener | `action-bar` | 1 |
| Visit | Make the real-world visit frictionless | `banner` with storefront/exterior | `action-bar` | 1 |

Highlight-surface semantics:

- `highlight-primary` = contained invitation surface used in page closers and the footer.
- `highlight-secondary` = reserved for process emphasis on Story only if needed. In v1 it is not used.
- `standard-secondary` = warm banding surface for menu and practical information sections.

### Page-by-page widget plan

#### Home (`index.json`)

1. **`hero_intro`: `split-hero`**
   - `image_position: end`, `color_scheme: standard-primary`, `top_spacing: none`
   - Room-and-counter opener. One image, short headline, one practical paragraph, two actions.
   - Blocks: eyebrow text, heading, body text, button.

2. **`daily_trust_bar`: `trust-bar`**
   - `icon_style: outline`, `icon_size: md`, `icon_shape: rounded`, `alignment: start`, `show_dividers: true`, `color_scheme: standard-secondary`
   - Four quick truths: roasted weekly, pastries baked fresh, open daily, downtown location.

3. **`signature_grid`: `checkerboard`**
   - `columns_desktop: 2`, `heading_alignment: start`, `color_scheme: standard-primary`
   - Six cards alternating between image cards and text cards:
     - espresso bar
     - pastry case
     - take-home beans

4. **`atmosphere_break`: `image`**
   - `fullwidth: true`
   - One wide atmospheric room image that works as a visual breath between offerings and proof.

5. **`regulars_quotes`: `testimonials`**
   - `layout: grid`, `columns_desktop: 3`, `card_layout: flat`, `heading_alignment: center`, `color_scheme: standard-primary`
   - Three concise local-regular quotes.

6. **`visit_invite`: `action-bar`**
   - `fullwidth: false`, `color_scheme: highlight-primary`
   - Soft closing invitation with primary `visit.html`, secondary `menu.html`.

#### Menu (`menu.json`)

1. **`menu_intro`: `banner`**
   - `height: medium`, `content_width: medium`, `alignment: center`, `vertical_alignment: center`, `color_scheme: highlight-primary`, `top_spacing: none`
   - Coffee-service image plus simple menu orientation copy.

2. **`coffee_list`: `priced-list`**
   - `eyebrow: "Coffee & Espresso"`, `heading_alignment: start`, `layout: two-column`, `color_scheme: standard-primary`
   - Core drinks, no thumbnails.

3. **`seasonal_list`: `priced-list`**
   - `eyebrow: "Seasonal Specials"`, `heading_alignment: start`, `layout: single-column`, `color_scheme: standard-secondary`, `top_spacing: none`
   - Featured house drinks, limited list with slightly richer descriptions.

4. **`beans_feature`: `image-text`**
   - `image_position: start`, `text_position: center`, `color_scheme: standard-primary`
   - Explains the take-home bags and rotating roasts.

5. **`pastry_list`: `priced-list`**
   - `eyebrow: "Pastries & To-Go"`, `heading_alignment: start`, `layout: two-column`, `color_scheme: standard-primary`
   - Pastries and bagged beans/accessories.

6. **`menu_close`: `action-bar`**
   - `color_scheme: highlight-primary`
   - Practical close: visit page + phone call option.

#### Story (`story.json`)

1. **`story_intro`: `split-hero`**
   - `image_position: start`, `color_scheme: standard-primary`, `top_spacing: none`
   - Process-first opener, but only on the Story page.

2. **`roast_note`: `image-text`**
   - `image_position: end`, `text_position: center`, `color_scheme: standard-secondary`, `content_color_scheme: standard-primary`
   - Roast philosophy and sourcing posture.

3. **`craft_steps`: `steps`**
   - `heading_alignment: center`, `color_scheme: standard-primary`
   - Three steps: source, roast, brew. Images included because process credibility matters here.

4. **`story_break`: `image`**
   - `fullwidth: true`
   - Hands-and-cup atmospheric image to keep the page visual, not text-heavy.

5. **`story_close`: `action-bar`**
   - `color_scheme: highlight-primary`
   - Invite people back to Menu or Visit after the process story.

#### Visit (`visit.json`)

1. **`visit_intro`: `banner`**
   - `height: medium`, `content_width: medium`, `alignment: center`, `vertical_alignment: center`, `color_scheme: highlight-primary`, `top_spacing: none`
   - Exterior/storefront opener with practical copy.

2. **`visit_details`: `contact-details`**
   - `heading_alignment: start`, `layout: first-featured`, `color_scheme: standard-secondary`
   - One wider info block, one hours block, one quick-links menu block, one social block.

3. **`location_map`: `map`**
   - `heading_alignment: start`, `height: medium`, `sidebar_position: end`, `show_address: true`, `color_scheme: standard-primary`
   - Address, directions link, plus info blocks for transit and parking.

4. **`visit_faq`: `accordion`**
   - `style: separated`, `allow_multiple: true`, `heading_alignment: start`, `color_scheme: standard-secondary`
   - Answers laptop, seating, parking, and bean-bag questions.

5. **`visit_close`: `action-bar`**
   - `color_scheme: highlight-primary`
   - Last nudge: menu + phone.

### Menus

**Main menu (`main-menu.json`)**

- Home -> `index.html`
- Menu -> `menu.html`
- Story -> `story.html`
- Visit -> `visit.html`

**Footer menu (`footer-menu.json`)**

- Menu -> `menu.html`
- Story -> `story.html`
- Visit -> `visit.html`
- Call Us -> `tel:+17185550188`

### Widget usage summary

| Widget | Count | Why it belongs |
|---|---:|---|
| `split-hero` | 2 | Home opener and Story opener; one for atmosphere, one for process |
| `trust-bar` | 1 | Quick everyday credibility on Home |
| `checkerboard` | 1 | Alternating image/text signature offerings without default card-grid sameness |
| `image` | 2 | Atmospheric breathing moments on Home and Story |
| `testimonials` | 1 | Supporting proof only, not dominant |
| `banner` | 2 | Practical orientation openers on Menu and Visit |
| `priced-list` | 3 | Menu is primary content, so it gets real structure |
| `image-text` | 2 | One menu-side beans feature, one story-side roast note |
| `steps` | 1 | Process clarity where it matters |
| `contact-details` | 1 | Visit page summary block |
| `map` | 1 | Real-world conversion support |
| `accordion` | 1 | Friction-reducing visit logistics |
| `action-bar` | 4 | Quiet closer pattern shared across pages |

### Differentiation notes

- This preset earns its cafe identity through page jobs, not coffee-colored paint. Four pages instead of a generic five-page shell is the first differentiator.
- The homepage uses `checkerboard` instead of a safer `card-grid`, which makes the offering section feel editorial and room-aware rather than SaaS-like.
- The Story page uses `steps` specifically for roast credibility; the same widget would feel wrong on Home, where speed matters more than process.
- The Menu page is intentionally one of the strongest pages in the preset. For habitual businesses, menu clarity is not secondary content.
- The closing pattern is always invitational, never aggressive. That keeps the tone aligned with a repeat-visit local business.
