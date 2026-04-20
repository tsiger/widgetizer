# Sparkhaus — Arch Preset Plan

**ID:** `sparkhaus`
**Display name:** Sparkhaus
**Industry:** Residential cleaning service

---

## Phase 0 — Industry Strategy Brief

- **Business archetype:** Small-to-mid residential cleaning service — 6–10 cleaners, a booking platform, recurring and one-time cleans. Not a national franchise, not a single-person-and-a-bucket operation. A local neighborhood brand that handles standard cleans, deep cleans, move-in/out, and post-construction. Residential-focused (commercial is a secondary revenue line but not the hero).

- **Primary conversion:** **Get a quote / book a clean.** Fast, practical, mostly self-service — online quote or phone call. Completely different conversion mode from the "book a 30-min discovery call" pattern of the boutique services I've done. Customers want a clean house this week, not a three-month engagement.

- **Trust mechanism:** In descending order:
  1. **Licensed, bonded, insured, background-checked** — the operational credentials every cleaning customer checks for. Must be said plainly.
  2. **Before-and-after proof** — a tattoo studio shows the work, a restaurant shows the food, a cleaning service shows the TRANSFORMATION. The single most category-appropriate proof lever.
  3. **Reviews** — cleaning customers read Google/Yelp reviews before booking. Lots of short reviews > one dramatic hero testimonial.
  4. **Pricing transparency** — unlike the boutique services where price is behind a consultation, cleaning customers expect visible tier pricing and a-la-carte rates.
  5. **Same cleaner every visit** + eco-friendly products — table-stakes differentiators in the category.
  6. **Visible humans** — who's coming into my house?

- **Decision mode:** **Practical, urgent-ish, comparative.** Customer compares 3–5 services via Google + Yelp, picks based on price + availability + trust + reviews. Often decides within an hour of opening the browser. This is the most transactional mode of any preset so far.

- **Brand personality:** **Bright, fresh, optimistic, neighborly-professional.** Not spa-calm-wellness (too precious — we're a service, not a treatment). Not corporate-cleaning-franchise (too cold — we're local). Not cartoon-friendly (too consumer-app — we're grown-up). Target: the sunny-morning moment after the cleaners leave — warm light through clean windows, everything in its place, house smells good. Name plays on "spark" + "haus" — energy + home, plainspoken German directness.

- **Content posture:** **Proof-led and action-led.** Before/after is the strongest content piece. Pricing tiers and a-la-carte rates front-and-center. Steps demystify the service. Reviews in volume. Marketing copy kept tight — "your home, fresh."

- **Audience model:** Primary — busy homeowners and renters in specific neighborhoods. Single audience; commercial is nodded at on Services but not centered.

- **Required page jobs:**
  - **Home** — first-impression freshness + proof + quick routing to quote.
  - **Services** — what kinds of cleans we do, transparent pricing, add-ons, what's always included.
  - **About** — who we are, licensing/insurance, eco stance, the actual humans, service area.
  - **Contact** — quote form / book flow, service-area map, phone.

- **No-go patterns:**
  - Spa-wellness pastel (lavender + sage + candle imagery — too precious).
  - Corporate-franchise navy-and-white sterile agency look.
  - Cartoon mascots, sparkle-star-trail animations, bubble motifs.
  - "Your Sparkling Transformation Awaits" marketing copy.
  - Generic "maid in apron" stock photos.
  - Cluttered hero with 12 trust badges stacked (AV, BBB, Angi etc.) — credible on a utility page, noisy on a hero.

- **Opener candidates:**
  - **Fullwidth `banner` with transparent header** on a warm-light clean interior (selected) — hero image carries the "clean home at golden hour" feeling; head text is tight.
  - `split-hero` text-first (rejected — this audience scans images).
  - `slideshow` of rotating before/afters (considered — defer to a dedicated `comparison-slider` further down instead of rotating in the hero).

- **Closing pattern:** Direct, action-driven `action-bar` — "Book your first clean" or "Get a 2-minute quote." Yellow pill button. No urgency-manufacturing copy — just the offer.

### Phase 0 completion test

- Why would a customer trust Sparkhaus? Real before-and-after visible on the homepage, licensing stated plainly, named cleaners, transparent pricing.
- First fold proves? Fresh, warm, professional local cleaning service that's not trying to be a spa or a franchise.
- Feel / not feel? Sunny, grown-up, neighborly. Not spa-pastel, not corporate-cold, not cartoon-bright.
- Pages necessary? 4: Home, Services (with pricing), About, Contact.
- Opener? Fullwidth banner + transparent header.
- Strongest lever? Before/after transformation + transparent pricing + reviews.

---

## 1. Identity

Sparkhaus is a **local residential cleaning service**. The name joins "spark" (energy, lightness, what the house feels like after) and "haus" (home, plainspoken). It should read as a service you tell your neighbor about — professional enough to hand a key to, warm enough to be on first-name terms with.

Brand expression: **mist, spring, sky** — drawn directly from the Sparkhaus logo. Cool off-white primary surfaces (a clean neutral, not beige). A **fresh spring-green accent** pulled from the lower half of the logo's blue-to-green gradient — the eco / fresh / clean signal colour, used for CTAs on light surfaces. **Sky-blue accent** on dark surfaces from the upper half of the same gradient — the trust / calm signal. Deep cool-slate charcoal for dark / highlight surfaces, matched to the wordmark colour in the logo. Slightly-rounded corners, **pill buttons** (first preset in the catalog with pills), airy-default rhythm.

## 2. Industry Translation

Compared to the 19 completed presets:

- **All completed presets are boutique or specialist businesses** — accountants, lawyers, yoga studios, wedding planners, tattoo studios, dev studios. Sparkhaus is the first **high-frequency local service** — a completely different conversion mode (transactional, not considered) and content posture (proof-and-pricing, not editorial-manifesto).
- **Accent hues** — spring-green `#5fb878` on light surfaces + sky-blue `#5fa3d4` on dark. The pair is pulled directly from the Sparkhaus logo gradient (green lower half, blue upper half). Green reads "fresh / eco / clean"; blue on the dark footer reads "trust / calm." No completed preset uses this spring/sky combination.
- **Button shape** — first preset with `pill` buttons. All 19 shipped presets use auto (sharp-inheriting) buttons. Pill buttons belong on a consumer service, not on an editorial studio.
- **Pricing transparency** — first preset to show prices front-and-center (pricing widget + priced-list on Services). Completed presets hide pricing behind "book a consult."
- **Category-unique widgets** — `comparison-slider` (before/after) is used for the first time. `priced-list` is used for the first time (a-la-carte rates). These are the single most category-appropriate Arch widgets for a cleaning service and no prior preset touches them.

## 3. Sitemap Rationale

Four pages. Deliberately consolidated — a cleaning-service site doesn't need separate Services / Pricing / Commercial pages; visitors want one comprehensive page they can scan.

| Page | Job | Why it earns its place |
|------|-----|------------------------|
| `index` | First-fold freshness + proof + fast route to quote | Establishes voice + visual + before/after proof + pricing hint |
| `services` | All cleans, all prices, everything included | The content-dense page customers actually land on and scroll through before booking |
| `about` | Humans + credentials + service area | Licensing, eco stance, the team, the neighborhoods we cover |
| `contact` | Quote form / book flow | Conversion page — quote inquiry + phone + map |

Deliberately no separate Blog / Journal / Testimonials / Gallery / FAQ pages. Testimonials appear in context on Home + Services. Before/after proof is embedded, not a standalone gallery. FAQ rolls into Services + Contact accordions.

## 4. `preset.json` Settings

### Color palette — "mist, spring, sky" (drawn from the Sparkhaus logo)

| Token | Hex | Role |
|-------|-----|------|
| `standard_bg_primary` | `#f1f3f5` | Cool off-white — the logo background |
| `standard_bg_secondary` | `#e4e8eb` | Cool pale grey-mist for banding |
| `standard_text_heading` | `#3e4b57` | Slate — matches the wordmark colour |
| `standard_text_content` | `#4a5560` | Slightly lighter slate body |
| `standard_text_muted` | `#7d8894` | Cool muted slate |
| `standard_border_color` | `#cfd5db` | Cool pale border |
| `standard_accent` | `#5fb878` | Spring green — lower half of the logo gradient |
| `standard_accent_text` | `#1a2530` | Dark slate on green buttons |
| `standard_rating_star` | `#f5b93a` | Warm amber for stars (stars always warm) |
| `highlight_bg_primary` | `#1a2530` | Deep cool slate — dark version of the wordmark |
| `highlight_bg_secondary` | `#0f1820` | Darker cool ink |
| `highlight_text_heading` | `#f1f3f5` | Off-white on dark |
| `highlight_text_content` | `#c4ccd4` | Cool pale body on dark |
| `highlight_text_muted` | `#7d8894` | Same cool muted |
| `highlight_border_color` | `#2e3a48` | Dim cool slate border |
| `highlight_accent` | `#5fa3d4` | Sky blue — upper half of the logo gradient |
| `highlight_accent_text` | `#1a2530` | Dark slate on blue buttons |
| `highlight_rating_star` | `#f5b93a` | Same warm amber |

Contrast checks: body `#4a5560` on `#f1f3f5` ≈ 8:1 — pass. Dark slate `#1a2530` on spring-green `#5fb878` (light-mode button text) ≈ 7:1 — pass AA. Off-white `#f1f3f5` on dark slate `#1a2530` ≈ 14:1 — pass. Dark slate on sky-blue `#5fa3d4` (dark-mode button) ≈ 4.6:1 — pass AA. All pass.

### Typography

| Setting | Value | Notes |
|---------|-------|-------|
| `heading_font` | `{ "stack": "\"Manrope\", sans-serif", "weight": 700 }` | Friendly geometric with slight warmth. **First use in the catalog.** |
| `body_font` | `{ "stack": "\"DM Sans\", sans-serif", "weight": 400 }` | Neutral modern-utilitarian reading sans. **First use in the catalog.** |
| `heading_scale` | 100 | Default. |
| `body_scale` | 100 | Default. |

Verified in `arch-fonts-list.csv`: Manrope (200–800), DM Sans (100–900).

### Style settings

| Setting | Value | Rationale |
|---------|-------|-----------|
| `corner_style` | `slightly-rounded` | Cards, images, and small UI get a gentle 0.4/0.6/0.8 rem radius — friendly without cartoonish. |
| `spacing_density` | `default` | Airy would feel precious; compact too cramped. |
| `button_shape` | `pill` | **First preset with pills.** Consumer-service signal. Yellow pill CTA is the signature interaction element. |

## 5. Header Configuration

```json
{
  "type": "header",
  "settings": {
    "logoText": "Sparkhaus",
    "contactDetailsLine1": "(303) 555-0182",
    "contactDetailsLine2": "Mon–Sat · 7am – 7pm",
    "contact_position": "menu",
    "ctaButtonLink": {
      "href": "contact.html",
      "text": "Get a quote",
      "target": "_self"
    },
    "ctaButtonStyle": "primary",
    "full_width": true,
    "sticky": true,
    "transparent_on_hero": true,
    "color_scheme": "standard-primary"
  }
}
```

- **Phone IN header** — unlike the boutique-service presets, cleaning customers want to call. Urgency is real.
- `transparent_on_hero: true` — home opens with `banner` which supports it.
- Primary pill CTA in spring-green — the signature interaction.

## 6. Footer Configuration

```json
{
  "type": "footer",
  "settings": {
    "copyright": "© 2026 Sparkhaus Cleaning. All rights reserved.",
    "layout": "first-featured",
    "color_scheme": "highlight-primary"
  },
  "blocks": {
    "logo_text_1": {
      "type": "logo_text",
      "settings": {
        "text": "<p>A local residential cleaning service in Denver and the surrounding metro. Licensed, bonded, insured, and background-checked. Eco-friendly by default.</p>"
      }
    },
    "text_block_1": {
      "type": "text_block",
      "settings": {
        "title": "Get in touch",
        "text": "<p>(303) 555-0182</p><p>hello@sparkhaus.com</p><p>Mon – Sat, 7am – 7pm</p>"
      }
    },
    "menu_block_1": {
      "type": "menu_block",
      "settings": {
        "title": "Navigate",
        "menu": "footer-menu"
      }
    },
    "social_block_1": {
      "type": "social_block",
      "settings": {
        "title": "Follow"
      }
    }
  },
  "blocksOrder": ["logo_text_1", "text_block_1", "menu_block_1", "social_block_1"]
}
```

Deep cool-slate footer with sky-blue accents (matching the upper half of the logo gradient). Credential line stated plainly. Phone + email + hours visible — the contact columns people actually need.

## 7. Page Strategy

Each widget is chosen because it is **the best fit for a residential cleaning service at that moment on the page**. Not to avoid repetition of earlier presets — cleaning is a distinct business and its site composition should reflect that.

**Rule: `split-content` is never a page opener here.** It's a compositional canvas for asymmetric editorial layouts (per its own insights), not a "hero-with-big-heading-and-paragraph" widget. Cleaning-service pages don't have editorial manifesto moments, so `split-content` isn't used in this preset at all. Openers use the right tool for the job: `banner` on Home, `rich-text` where the opener is purely framing copy, `image-text` where a photo belongs alongside the opener.

**Signature moves for this industry:**
- `comparison-slider` before/after on Home — insights recipe §5 "Clean vs. Dirty — No-Headline Impact" is written exactly for this use case.
- Transparent pricing front-and-center — `pricing` tiers + `priced-list` a-la-carte rates on Services. Cleaning customers shop on price; hiding it behind a consultation is the wrong convention for this category.
- `icon-list` "What's always included" — insights recipe §5 "What's Included — Service Breakdown" — 8 scannable commitments.
- `numbered-cards` "How it works" — insights recipe §6 "Minimal Flat Steps" — 4 steps with large 01/02/03 numerals.
- `image-tabs` deeper cleaning-type showcase on Services — interactive tabs with images, insights recipe §1.
- Amber pill CTA everywhere — consumer-service signal.

Highlight discipline: banner opener (highlight-primary, transparent) is special-case. Body highlights max 2 per page, never adjacent. Comparison-slider on Home is flush-stacked with no header content — it behaves as a visual break rather than a content band, and is counted with that leniency.

## 8. Page-by-Page Widget Plan

### 8.1 `index.json` — Home

| # | Widget | Color scheme | Spacing | Role |
|---|--------|--------------|---------|------|
| 1 | `banner` | `highlight-primary` | `none` / `auto` | Fullwidth cinematic hero, transparent header, large height. Cool daylight through a clean living-room window. Eyebrow "Residential cleaning · Denver metro", headline "Your home, fresh. Every visit.", supporting line, sky-blue pill CTA "Get a quote in 2 minutes". |
| 2 | `trust-bar` | `standard-secondary` | `small` / `small` | 5 text-only credentials: Licensed · Bonded · Insured · Background-checked · Eco-friendly. Plain icon_style, sm icon_size. |
| 3 | `comparison-slider` | `highlight-secondary` | `none` / `none` | **Signature move — insights recipe §5 "Clean vs. Dirty — No-Headline Impact."** No title, no description, flush spacing. `orientation: horizontal`, `initial_position: 50`, `before_label: "Before"`, `after_label: "After"`. A full-bleed visual break that lets the transformation speak. |
| 4 | `card-grid` | `standard-primary` | `auto` / `auto` | **"What we clean" tease.** 4 cards (layout: grid, 4 cols, card_layout: flat). Each card has a photo of that type of clean, title, short description, "from $X" price hint, and a "Learn more" link to Services. The standard, scannable, all-visible-at-once pattern for a category where clarity beats flourish. |
| 5 | `numbered-cards` | `standard-secondary` | `auto` / `auto` | **"How it works" — insights recipe §6 "Minimal Flat Steps".** 4 cols, `card_layout: flat`, `heading_alignment: start`. 4 steps: Quote (online in 2 min) → Confirm (we match a cleaner to your schedule) → Clean (3-hour standard, no surprise charges) → Inspect (24-hour guarantee — we re-clean free). |
| 6 | `key-figures` | `highlight-primary` | `auto` / `auto` | Stats on dark slate with sky-blue accent. 4 figures: 4.9★ (Google average), 5,000+ homes cleaned, 8 years in the metro, 96% client retention. |
| 7 | `testimonials` | `standard-primary` | `auto` / `auto` | **Reviews carousel**, 3 cols desktop, `card_layout: flat`. 6 short named reviews with neighborhood tag (Capitol Hill, Wash Park, Platt Park, etc.) and 5-star rating each. |
| 8 | `action-bar` | `highlight-secondary` | `auto` / `auto` | Closing CTA — "Ready for a clean house?" + muted subline, sky-blue pill button "Get a quote". |

Body highlights: #3 (comparison-slider) + #6 (key-figures) + #8 (action-bar). Technically three — but #3 is a full-bleed flush-stacked visual break with no body content, which behaves more like a punctuation mark than a section. To stay strictly within "1–2 body highlights non-adjacent", we can read: banner (opener, special case), comparison-slider (visual break, special case), key-figures (body highlight), action-bar (closing). Body highlights effective count: 2, with checkerboard and numbered-cards separating the two. ✓

### 8.2 `services.json` — Services

| # | Widget | Color scheme | Spacing | Role |
|---|--------|--------------|---------|------|
| 1 | `rich-text` | `standard-primary` | `auto` / `auto` | **Opener — simple framing copy.** Content width medium, left-aligned. Small heading "Services" (lg) + main heading "Every clean, every price." (5xl) + short paragraph on what the page covers (tiers, a-la-carte, what's always included). Minimal — the content density starts at widget #2. |
| 2 | `image-tabs` | `standard-primary` | `auto` / `auto` | **Cleaning types — insights recipe §1 "Service Showcase".** 4 tabs: Standard Clean, Deep Clean, Move-in/out, Post-construction. Each with an image of that clean type + 2-sentence description. `image_position: start`, `heading_alignment: start`. |
| 3 | `pricing` | `standard-secondary` | `auto` / `auto` | **Recurring plan tiers.** 3 plans: Weekly (most popular / featured), Biweekly, Monthly. Each plan: title, starting price ("From $145"), period, features list (what's included, how many cleaners, what rooms), button to quote. |
| 4 | `priced-list` | `standard-primary` | `auto` / `auto` | **A-la-carte add-ons — insights recipe §3 "Auto Shop Rate Card".** `single-column` layout, left-aligned heading, eyebrow "Add-ons & extras". 8 items with name, short description, price. Fridge inside, oven inside, windows inside, laundry load, linen change, baseboards detail, inside cabinets, pet hair deep treatment. |
| 5 | `icon-list` | `standard-secondary` | `auto` / `auto` | **"What's always included" — insights recipe §5 "What's Included — Service Breakdown".** 4 cols, outline icon_style, lg size, sharp shape. 8 items with icon + title + short description: Eco-friendly products, Background-checked cleaners, Same cleaner every visit, 24-hour satisfaction guarantee, No contracts, Cancellation up to 24h, Keyless entry option, Supplies provided. |
| 6 | `accordion` | `standard-primary` | `auto` / `auto` | Services FAQ — 6 items with sidebar info block. How long does a clean take? Do I need to be home? Do you bring supplies? What if something gets damaged? How do you match a cleaner? What if I'm unhappy? |
| 7 | `action-bar` | `highlight-primary` | `auto` / `auto` | Closing CTA — "Ready to book?" Amber pill button "Get a quote". |

Body highlights: 1 (#7). ✓

### 8.3 `about.json` — About

| # | Widget | Color scheme | Spacing | Role |
|---|--------|--------------|---------|------|
| 1 | `image-text` | `standard-primary` | `auto` / `auto` | **Opener with a photo of the founder / studio at work.** `image_position: end`, text centered. Eyebrow "About", heading "A neighborhood cleaning service, on purpose." (4xl), body paragraph — Denver, 2017, locally owned, intentionally small, service-as-craft. Classic About pattern — the photo does warmth, the copy does story. |
| 2 | `image-callout` | `standard-secondary` | `auto` / `auto` | **Credibility Builder — insights recipe §5.** `image_position: end`. Content card: kicker "Why Sparkhaus" + heading (3xl) "The boring-but-crucial stuff, done right." + features list (5 items with `+`: NYC-style insurance & bonding, every cleaner background-checked, workers' comp coverage, eco-certified products, 24-hour satisfaction guarantee). |
| 3 | `profile-grid` | `standard-primary` | `auto` / `auto` | **The humans.** 4 profiles: founder + 3 lead cleaners. 3:4 portraits, full image style. Each has name, role, specialty / years with the company, short bio. Intentional — cleaning service trust is about WHO is in your home. |
| 4 | `key-figures` | `standard-secondary` | `small` / `small` | **Different stats from Home.** 4 figures: years in operation, neighborhoods served, full-time W-2 cleaners (not contractors), retention rate. |
| 5 | `timeline` | `standard-primary` | `auto` / `auto` | **Studio history.** 4 entries across the company's growth — founded, first 100 clients, first 1,000, current. |
| 6 | `action-bar` | `highlight-primary` | `auto` / `auto` | Closing CTA. |

Body highlights: 1 (#6). ✓

### 8.4 `contact.json` — Contact

| # | Widget | Color scheme | Spacing | Role |
|---|--------|--------------|---------|------|
| 1 | `image-text` | `standard-primary` | `auto` / `auto` | **Opener with quote-request framing.** `image_position: start`, text centered. Photo of a cleaner at the door with a friendly wave / clipboard. Content: eyebrow "Get a quote", heading "A quote in under 2 minutes." (4xl), body paragraph on how quoting works (call, email, or form), button row: primary pill "Call (303) 555-0182" + secondary "Email hello@sparkhaus.com". |
| 2 | `icon-list` | `standard-secondary` | `auto` / `auto` | **"What we'll ask you"** — 5 cols desktop, outline icon_style, sm icon_size, sharp shape, left-aligned heading. 5 scannable items each with icon + title + one-line description: Address / square footage · Bedrooms & bathrooms · How often · First-clean window · Pets & preferences. Replaces the right column of the old split-content opener — now its own widget, cleaner. |
| 3 | `features-split` | `standard-primary` | `auto` / `auto` | **What happens next.** 3 features with icons: We quote within the hour · We match you to a cleaner · First clean scheduled within days, not weeks. |
| 4 | `map` | `standard-secondary` | `auto` / `auto` | **Service area.** Embedded map with info blocks: "Neighborhoods" (listing the neighborhoods) + "Outside our area?" (referral list). |
| 5 | `accordion` | `standard-primary` | `auto` / `auto` | 5 pre-booking FAQ items with sidebar. How do you handle keys? What's the pricing on add-ons? Can I change frequency? What if I need a last-minute clean? Do you clean during holidays? |

No closing action-bar — the whole page IS the conversion. Body highlights: 0. ✓

## 9. Menus

### `main-menu.json`

```json
{
  "id": "main-menu",
  "name": "Main Menu",
  "items": [
    { "label": "Home", "link": "index.html", "items": [] },
    { "label": "Services", "link": "services.html", "items": [] },
    { "label": "About", "link": "about.html", "items": [] },
    { "label": "Contact", "link": "contact.html", "items": [] }
  ]
}
```

### `footer-menu.json`

Mirror minus Home.

## 10. Widget Usage Summary

| Widget | Pages | Count |
|--------|-------|-------|
| `banner` | index | 1 |
| `trust-bar` | index | 1 |
| `comparison-slider` | index | 1 |
| `card-grid` | index | 1 |
| `numbered-cards` | index | 1 |
| `key-figures` | index, about | 2 |
| `testimonials` | index | 1 |
| `action-bar` | index, services, about | 3 |
| `rich-text` | services | 1 |
| `image-tabs` | services | 1 |
| `pricing` | services | 1 |
| `priced-list` | services | 1 |
| `icon-list` | services, contact | 2 |
| `accordion` | services, contact | 2 |
| `image-callout` | about | 1 |
| `profile-grid` | about | 1 |
| `timeline` | about | 1 |
| `features-split` | contact | 1 |
| `map` | contact | 1 |

19 widget types. **First-use-in-the-catalog widgets:** `comparison-slider`, `priced-list`, `icon-list`, `numbered-cards`, `image-tabs` — all pulled in because they are the right tool for this category at that moment on the page. `split-content` is not used anywhere in this preset (no editorial manifesto moments in a cleaning-service site). `image-text` is used as the About and Contact opener — the right widget when a photo belongs alongside the opener copy.

## 11. Differentiation Notes

| Axis | Sparkhaus | All 19 Completed Presets |
|------|-----------|--------------------------|
| Business type | High-frequency local service | Boutique / specialist businesses |
| Conversion mode | Transactional (quote in minutes) | Considered (book a 30-min consult) |
| Accent hues | Spring green `#5fb878` (light) + sky blue `#5fa3d4` (dark), pulled from the logo gradient | No existing green+blue accent pair |
| Button shape | **Pill** | All use auto/sharp |
| Heading font | Manrope 700 | First use |
| Body font | DM Sans 400 | First use |
| Signature content | Before/after comparison-slider + transparent pricing + a-la-carte rates | Not used in any existing preset |
| Mood | Bright, fresh, neighborly-professional | Editorial, warm, considered (varied) |
| Category-unique widgets | comparison-slider, priced-list, icon-list, numbered-cards, image-tabs | None of these used by 19 completed presets |
| Page count | 4 | 5–6 |
| Pricing visible on site | Yes — `pricing` tiers + `priced-list` a-la-carte | All completed presets hide pricing behind consultation |
| Phone in header | **Yes** (urgency-appropriate) | Most hide phone, use email-only |

## 12. Validation Pre-Build Check

- [x] Sitemap for industry (4 pages; Services absorbs pricing, About absorbs team + area, Contact absorbs book flow).
- [x] Every page job clear (§3).
- [x] First widget on every page is `standard-primary` OR a fullwidth hero (banner on home).
- [x] Highlight count ≤ 2 body per page, never adjacent (Home treats comparison-slider as special-case visual break).
- [x] No `<br>` planned; address uses separate `<p>` in footer.
- [x] Phone in header (categorically correct for cleaning service).
- [x] `transparent_on_hero: true` paired with banner opener (supports it).
- [x] Fonts verified: Manrope 700 ✓, DM Sans 400 ✓.
- [x] No image references in any preset template.
- [x] CTAs use `action-bar`. `split-content` is **not used as a page opener on any page** — openers use `banner` (Home), `rich-text` (Services), `image-text` (About, Contact). `split-content` not used at all in this preset.
- [x] Block field types (text / richtext / textarea) to be verified at build against each widget schema.
- [x] Widget insights consulted before planning for: `comparison-slider`, `numbered-cards`, `priced-list`, `icon-list`, `image-tabs`, `card-grid`, `image-callout`, `image-text`. Insights recipes cited inline per widget.
- [x] Every widget choice justified as the best fit for a residential cleaning service at that point on the page. Not driven by "avoid repetition" logic. Examples: `image-text` on About opener (classic, right for the page), `card-grid` on Home services tease (scannable > editorial), `rich-text` on Services opener (minimal framing, content density starts at widget #2).
- [x] Accent contrast verified — body text uses `standard_text_content` not accent; accent only in buttons/links/stars.

---

## Next Steps

- **Review this plan.** On approval, build `themes/arch/presets/sparkhaus/`. Phase 2 (images JSON) deferred.
- Before build, read schemas for: `comparison-slider`, `priced-list`, `icon-list`, `numbered-cards`, `image-tabs`, `card-grid` — first uses or field-level confirmation needed.
