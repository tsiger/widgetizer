# Pixelcraft — Graphic Designer

Plan for the Arch `pixelcraft` preset. A graphic-designer preset fails by default — the landscape is full of generic "creative studio" sites that could swap names and logos and mean nothing. Pixelcraft's job is to look like a self-aware design studio: **editorial, confident, type-led, restrained**. The preset is built around deliberately minimal split-content sections, a bento-grid of selected work, and a bold scrolling-text marquee — moves that signal "this is a designer's site" without having to say so.

---

## Phase 0 — Industry Strategy Brief

- **Business archetype:** Small independent design studio / solo designer taking project work from small and mid-sized clients. Not a freelance-marketplace hire. Not a 20-person agency. The brand has to feel like the work of a single confident eye (or a tight team) with distinct taste.

- **Primary conversion:** Project inquiry via email — and that's it. No phone number in the hero, no booking flow, no live-chat widget. Designers do not answer unsolicited calls. The form/email is the front door, and the bar to walk in is "tell us about the project in a paragraph." This sieves out tire-kickers on its own.

- **Trust mechanism:** Three proofs, stacked. **(1) The work itself** — a bento-grid of selected cases and a full portfolio page do more convincing than any copy will. **(2) Named client logos** — real recognizable brands signal "people who can afford us, hire us." **(3) Voice** — the copy throughout the site has to sound like the designer, not like a junior-MBA agency pitch deck. If the visitor doesn't like the voice, they're not the right client.

- **Decision mode:** Considered, multi-visit. A potential client typically lands on Home, clicks Work, skims two or three case studies, reads About, and only then opens the contact form. Decisions happen over days or weeks. The site is a portfolio and a tone-check, not a lead-capture funnel.

- **Brand personality:** **Editorial, bold, restrained, slightly irreverent.** Think of a design magazine's masthead, not a SaaS landing page. Oversized type, generous whitespace, deliberate asymmetry, a single bright accent color used like a highlighter rather than a chrome. The studio has taste and knows it, but doesn't shout about it.

- **Content posture:** Work-led first, voice-led second. Imagery carries the page, but the copy (especially on the About and Services pages) does the heavy lifting on the "is this studio actually good and do I want to work with them" question. Neither side can be weak.

- **Audience model:** Small-to-mid brand founders, marketing leads at mid-sized companies, other creative professionals commissioning brand/print/digital work. Not a consumer-service audience. Reader is sophisticated, scans quickly, values confident opinion over comprehensive feature lists.

- **Required page jobs:**
  - **Home** — set tone in 5 seconds, show best work in 30 seconds, prove it with client logos in 60, open the door to Work and About.
  - **Work** — the portfolio. The single most important page on the site for a researching visitor; if it doesn't land, nothing else matters.
  - **Services** — answer "what do you actually do and what does it cost roughly" — without turning into a pricing page.
  - **About** — the designer's voice at length. Manifesto-adjacent. Studio history, philosophy, credits. The single biggest differentiator vs. every other portfolio site.
  - **Contact** — one-field barrier to inquiry, clear response time, no nonsense.

- **No-go patterns:**
  - Generic "creative studio" templates — parallax hero with floating blobs, centered serif heading, "We create digital experiences that matter" tagline. Dead on arrival.
  - Stock imagery of people pointing at laptops, sticky-noted whiteboards, or open MacBooks on clean desks.
  - Any kind of Bauhaus pastiche, 90s-retro-y2k pastiche, or brutalism cosplay — those are aesthetics, not brands, and they age fast.
  - Animated hero type that bounces in one word at a time.
  - Emoji in copy, exclamation points in headings, or "Hi, I'm Sarah and I make brands that sparkle!" tone.
  - Agency buzz-talk: "strategic brand experiences," "purpose-driven design systems," "pixel-perfect craft at scale."
  - A services page that reads like a feature matrix. Services for a designer are verbs, not SKUs.

- **Opener candidates:** Minimal editorial hero — an oversized single-sentence heading in the studio's brand type on a calm background image of the studio's own work (a printed identity system, a packaging mockup, a magazine spread). The hero has two CTAs at most: **See the work** and **Start a project**. The accent color shows up as a single highlighted word in the heading or as the primary-button fill. No "hero video." No floating graphics. No scroll-to-see-more indicator.

- **Closing pattern:** Every page ends with an action-bar in highlight-primary. Primary CTA **Start a project** across the site, secondary CTA **See the work** (when not on Work page) or **Read the studio notes** (when on Work page, pointing to About). Never "Learn more" — always specific.

---

## Identity

- **ID:** `pixelcraft`
- **Name:** Pixelcraft
- **Industry:** Graphic Designer
- **Tagline used internally:** "A small studio with a loud voice."

---

## Industry Translation

A designer preset fails the moment it becomes a generic creative-studio template. Pixelcraft has to carry three things every other preset in this catalog doesn't:

1. **Editorial typography as the primary design element.** Headings are oversized (7xl–9xl), ranged left, sit on calm backgrounds. Body type is modest and well-leaded. The type does the design work; ornaments and effects do almost nothing. This is a deliberate anti-ornament move — graphic designers live and die by typographic judgment, and the site has to demonstrate it.

2. **Work shown with editorial restraint.** No hover-zoom gallery grids with equal-sized thumbnails. The bento-grid on Home uses asymmetric cells — some projects get a big spotlight, others get a small corner. The masonry-gallery on Work has variable image heights and a quiet grid gap. Captions are minimal (`Client · Year · Discipline`).

3. **Voice in every piece of copy.** Nothing on this site reads like a template. Every heading is an opinion. Every paragraph sounds like one specific studio. The services page calls out "what we don't do." The about page reads like an essay. The contact page tells you what *not* to send.

### The three sections that define the preset

- **Hero** — oversized single-sentence heading with one word highlighted in acid chartreuse, background image from the studio's own work. Dual CTA (see work / start project).
- **Bento-grid selected work** — six asymmetric cells. Two large spotlight cases, four smaller ones. Each cell is a piece of actual work — a logo, a poster, a packaging shot, a spread. No hover cards, no text overlays.
- **Scrolling-text marquee** — oversized rotating ticker of the studio's disciplines. Acid chartreuse on black, slight rotation for character. This is the preset's signature flourish — impossible on any other Arch preset, inseparable from a design studio.

### What this preset is **not**

- A portfolio-as-SaaS site (cards, hover states, filters).
- A Squarespace Brine template with cursive + san-serif pairing.
- A "we're creative problem solvers" agency site.
- A brutalist neon experiment.
- A wedding-planner-style pastel lifestyle portfolio.

It reads specifically as *a small modern design studio with taste*.

---

## `preset.json` Settings

### Palette — warm cream base, true black, acid chartreuse

The palette is intentionally unlike any preset already shipped. Pipeworks went warm off-white + steel-blue + bronze/blue. Torque went cool near-white + charcoal + vibrant orange. Pixelcraft goes **warm cream + true near-black + acid chartreuse** — a classic editorial-magazine triad with the accent pushed into a deliberately bold contemporary hue.

- **standard_bg_primary:** `#f2efe8` — warm cream, art-paper tone (not an office off-white)
- **standard_bg_secondary:** `#e4ddd0` — deeper cream for banding
- **standard_text_heading:** `#0a0a0a` — true near-black for maximum typographic weight
- **standard_text_content:** `#2a2826` — very deep ink with a whisper of warmth
- **standard_text_muted:** `#7a766d` — warm mid-grey metadata
- **standard_border_color:** `#d4cdbe` — soft warm border
- **standard_accent:** `#d1f600` — acid chartreuse, the editorial highlighter
- **standard_accent_text:** `#0a0a0a` — black on chartreuse is legible and high-contrast
- **standard_rating_star:** `#ff6b4a` — warm coral for ratings (deliberately different from the accent so reviews feel like their own visual language, not a brand moment)
- **highlight_bg_primary:** `#0a0a0a` — true near-black
- **highlight_bg_secondary:** `#000000` — pure black for the second highlight surface (scrolling-text, occasional moments)
- **highlight_text_heading:** `#f2efe8` — cream on black
- **highlight_text_content:** `#c4bfb4` — muted cream body
- **highlight_text_muted:** `#7a766d`
- **highlight_border_color:** `#2a2826`
- **highlight_accent:** `#d1f600` — chartreuse pops harder on black than on cream
- **highlight_accent_text:** `#0a0a0a`
- **highlight_rating_star:** `#ff6b4a`

### Typography — display + clean sans, editorial pairing

- **heading_font:** **Syne 700**. Syne is a contemporary geometric sans with distinctive letterforms — it's become a visual shorthand for "design studio" over the last few years, and for good reason: its personality shows up without being loud. Verified in `arch-fonts-list.csv`: `"Syne", sans-serif`, weights 400|500|600|700|800, using 700.
- **body_font:** **Inter Tight 400**. Clean, condensed x-height, reads well next to Syne's character. The tighter tracking gives body copy a modern editorial rhythm. Verified in `arch-fonts-list.csv`: `"Inter Tight", sans-serif`, weight 400 available.
- **heading_scale:** 100
- **body_scale:** 100

Pairing notes: Pipeworks used Archivo + IBM Plex Sans (industrial-honest). Torque used Space Grotesk + Inter (precision-modern). Pixelcraft uses Syne + Inter Tight — **display character + quiet modern body** — a fundamentally different type personality.

### Style — sharp edges, airy breathing room, pill buttons

Three deliberate choices, each contrasting at least one previous preset:

- **corner_style:** `sharp` — editorial, no softness on cards or images. (Pipeworks shipped sharp too; Torque shipped slightly-rounded.)
- **spacing_density:** `airy` — designer sites breathe. More whitespace between widgets than either Pipeworks or Torque (both `default`). This is the single most important style signal — an airy page with oversized type is the editorial-studio move.
- **button_shape:** `pill` — the intentional mix: sharp everywhere else, round-pill buttons. This is a classic editorial-design tension (think magazines with sharp type and round infographic badges), and no other Arch preset uses this combination. (Pipeworks was sharp buttons; Torque was auto/slightly-rounded.)

---

## Header Configuration

- **logoText:** "Pixelcraft"
- **logoMaxWidth:** 160
- **contactDetailsLine1:** `""` — deliberately empty; the phone number isn't a conversion channel for this business, and showing one undermines the "email only" inquiry rule.
- **contactDetailsLine2:** `""` — same reason. We'll rely on just the logo + nav + CTA in the header strip for a clean editorial feel.
- **contact_position:** `logo` — the contact strip collapses cleanly when both lines are empty.
- **headerNavigation:** `main-menu`
- **center_nav:** `false` — left-aligned nav is more editorial.
- **ctaButtonLink:** `{ text: "Start a project", href: "contact.html", target: "_self" }`
- **ctaButtonStyle:** `primary` — the acid chartreuse pill button is the single loudest element in the header. Intentional.
- **full_width:** `false` — contained header (Torque's learning applied from day one): a centered max-width strip sits better with the airy page rhythm.
- **sticky:** `true` — visitors scrolling the Work page for two minutes should always have one tap to Start a project.
- **transparent_on_hero:** `true` — every page opens with a banner; the header overlays cleanly on the large editorial imagery.
- **color_scheme:** `standard-primary`

---

## Footer Configuration

- **copyright:** "© 2026 Pixelcraft Studio. A small studio in Brooklyn."
- **layout:** `first-featured`
- **color_scheme:** `highlight-primary`
- **Blocks (4):**
  1. **logo_text** — logo text "Pixelcraft", short richtext paragraph: `<p>A small Brooklyn design studio working with founders, brands, and people who make things.</p>`
  2. **text_block** — title "Say hello", richtext with two `<p>` paragraphs: email, then studio hours/response time.
  3. **menu_block** — title "Navigate", menu `footer-menu`
  4. **social_block** — title "Elsewhere"

---

## Page Strategy

Five pages, each with a distinct job. The sitemap intentionally mirrors the conventional studio layout (most designer sites do use Home / Work / Services / About / Contact) — this is the one place Pixelcraft is conventional on purpose, because its audience expects that structure and abandons sites that overcomplicate navigation.

| Page | Primary Job | Emphasis |
|---|---|---|
| Home | Set tone + show best work + open the door | Hero + scrolling-text + bento-grid + split-content + logo-cloud + testimonials + split-content + CTA |
| Work | The portfolio. Show everything, well. | Opener + minimal split-content intro + masonry-gallery + split-content (case-study callout) + scrolling-text + CTA |
| Services | What we do, how we work, what it roughly costs | Opener + 4× split-content (services) + comparison-table (engagement types) + accordion + CTA |
| About | Designer voice + studio history + press | Opener + split-content (manifesto) + timeline + profile-grid + logo-cloud (press) + CTA |
| Contact | Low-friction inquiry | Opener + split-content (how to reach us + what to send) + accordion (common questions) + CTA |

### Scheme distribution

Across every page, `highlight-primary` is the **closing CTA** surface (consistent across all three preset outputs). `highlight-secondary` (pure black) gets used for **scrolling-text marquee moments** — a bold signature flourish that keeps the preset distinctive. Page openers all use `highlight-primary` with background images (Torque's learning applied).

---

## Page-by-page Widget Plan

### Home — 8 widgets

The home page is engineered for a 5-second tone check, a 30-second work skim, and a 60-second credibility check — in that order.

1. **`banner`** (hero) — **highlight-primary**, large, `top_spacing: none`, transparent header active.
   - `content_width: narrow`, `alignment: start`
   - Blocks: text eyebrow ("A small studio · Brooklyn, NY"), heading — ~8xl size — single sentence like "We design brands that mean something." with the word "mean" in chartreuse (handled via the accent color rendering; the heading text is plain), text ("Identity, editorial, packaging, and digital work for founders and brands who care about the details."), dual-link button (primary "Start a project" + secondary "See the work").
   - Overlay color `#0a0a0ab8` (true black at ~72%) — heavy enough for text on any imagery.

2. **`scrolling-text`** — marquee of disciplines.
   - `text`: "Brand Identity — Editorial Design — Packaging — Typography — Print — Digital — Art Direction"
   - `separator`: "★"
   - `speed: 6`, `rotate: -3` (subtle angle for editorial character), `font_size: lg`
   - `bg_color: #0a0a0a`, `text_color: #d1f600` — black band with chartreuse type, the preset's signature move
   - `top_spacing: none`, `bottom_spacing: none` — flush with the hero above and the bento below so it reads as a band, not a widget
   - **Underused widget used naturally** — a scrolling marquee makes sense here in a way it wouldn't on any trade/service preset.

3. **`bento-grid`** (selected work) — **standard-primary**, 6 asymmetric cells.
   - Eyebrow "Selected work", title "A few recent things.", `heading_alignment: start`
   - `gap: var(--space-md)`
   - 6 blocks with varying `col_span` and `row_span` (2×2 spotlight + 1×1 smaller cells): each block = one case study, with image + title + client/year in the text field.
   - Projects named concretely: "Vance & Oak — identity for a Brooklyn wine shop", "Orion Quarterly — editorial redesign", "Hearth Coffee — packaging system", "Sidereal — brand for a studio photographer", "Cordage Press — type family", "Northlake Zoo — wayfinding".
   - **Underused widget used naturally** — bento-grid is perfect for "curated highlight reel of our best work."

4. **`split-content`** #1 — **standard-primary**, `balance: right-heavy`.
   - **Minimal section per the user's ask.** Left column: a single oversized `heading` block (size 8xl) that reads "We work slowly, on purpose." — that's all that's on the left. Right column: two `text` blocks — a short paragraph about the studio's pace, and a secondary muted paragraph on how that translates to client experience.
   - `sticky_column: left` — the oversized heading stays pinned while the right column's text scrolls past. Strong editorial effect.
   - `top_spacing: auto`, `bottom_spacing: auto`

5. **`logo-cloud`** — **standard-secondary**, `layout: grid`, `columns_desktop: 6`, `card_layout: flat`, `aspect_ratio: "3 / 2"`.
   - Eyebrow "Client roster", title "Brands we've worked with.", `heading_alignment: center`
   - 12 logo blocks (name-only — image slots empty per §11). Each block's `name` is a real-sounding client: "Vance & Oak", "Orion Magazine", "Hearth Coffee", "Sidereal Studio", "Cordage Press", "Northlake Zoo", "Parson & Blake", "Foldline", "Aster Type Foundry", "The Clay Room", "Tenny Bros.", "Little Iron Bakery".

6. **`testimonials`** — **standard-primary**, `layout: grid`, `columns_desktop: 2`, `card_layout: flat`.
   - Eyebrow "Notes from clients", title "What people say."
   - Only 4 quotes (not 6 — a designer's page is restrained). Each from a named person at a named client, talking specifically about design process and outcome rather than generic praise.

7. **`split-content`** #2 — **standard-primary**, `balance: left-heavy`.
   - **Process / approach editorial.** Left column: 3 `numbered-item` blocks — "Listen", "Sketch", "Ship" — each a short process phase, minimal medium-size markers. Right column: one paragraph `text` block aligned to the top — a single short paragraph about how the studio works. Less text here; the structure is the message.
   - `sticky_column: none`

8. **`action-bar`** (closing) — **highlight-primary**.
   - Heading "Got a project?"
   - Muted text: "We take two to three new engagements a quarter. Email a paragraph — we reply within two business days."
   - Dual buttons: primary "Start a project" (→ contact.html), secondary "See the work" (→ work.html).

**Scheme pattern:** highlight-primary → highlight-secondary (fused marquee) → standard-primary → standard-primary → standard-secondary → standard-primary → standard-primary → highlight-primary. The scrolling-text marquee between hero and bento-grid is intentionally fused (spacing: none) to form a single dark band at the top of the page. Stats-like highlight moments aren't used — this preset doesn't need to prove scale, it needs to show taste.

---

### Work — 6 widgets

The portfolio. This page has to be a masonry gallery done right, with a light editorial intro and a single featured case callout to avoid the "wall of thumbnails" feel.

1. **`banner`** (opener) — **highlight-primary**, small, transparent header. Eyebrow "Work", heading "Things we've made." (~7xl), intro text about selection and range.

2. **`split-content`** (minimal intro) — **standard-primary**, `balance: right-heavy`.
   - Minimal: left column has just a small `text` eyebrow ("Portfolio — 2018 to now"); right column has one short paragraph about the curation — "Each project is chosen because it taught us something we now bring into the next." No other content.
   - `sticky_column: none`

3. **`masonry-gallery`** — **standard-primary**, `columns_desktop: 3`, `gap: medium`.
   - Eyebrow empty, title empty, description empty — the intro already established context. The gallery speaks for itself.
   - ~14 items, each with a `title` (project name) and `category` (discipline — "Identity" / "Editorial" / "Packaging" / "Type" / "Digital" / "Wayfinding"). Image slots left empty per §11.
   - `heading_alignment: start`, `alignment: start`
   - **Underused widget used naturally.**

4. **`split-content`** #2 (featured case callout) — **standard-secondary**, `balance: equal`.
   - Left column: an `image` block (wide) placeholder — featured case hero image.
   - Right column: `text` eyebrow ("Case study"), `heading` (project name — "Orion Quarterly"), 2× `text` paragraphs about the project and outcome, `button` ("Read the full study" — points to contact.html since we don't ship separate case-study pages).
   - `sticky_column: right`

5. **`scrolling-text`** — capabilities marquee repeated (different text from home).
   - `text`: "Logos — Wordmarks — Publications — Posters — Packaging — Signage — Wayfinding — Websites"
   - Same styling as home (`bg_color: #0a0a0a`, `text_color: #d1f600`), but `speed: 8`, `rotate: 2` (reversed angle for variety).
   - Spacing: small top and bottom (not none here — this isn't fused to an adjacent highlight).

6. **`action-bar`** (closing) — **highlight-primary**.
   - Heading "Want to work together?"
   - Text: "Tell us the project and the constraints. We'll tell you whether we're the right fit."
   - Buttons: primary "Start a project", secondary "Read the studio notes" → about.html.

**Scheme pattern:** highlight-primary → standard-primary → standard-primary → standard-secondary → highlight-secondary → highlight-primary. The marquee at position 5 functions as a transitional band between the case-study callout and the CTA.

---

### Services — 7 widgets

Services for a designer aren't a SKU list — they're a small set of editorial descriptions of how the studio works. The page uses four consecutive split-content widgets to deliver each service in the same editorial voice, with alternating left/right balance for visual rhythm.

1. **`banner`** (opener) — **highlight-primary**, small. Eyebrow "Services", heading "Four things we do, well." (~7xl), intro text ("Identity, editorial, packaging, and digital — with a small overflow of type and illustration when a project needs it.").

2. **`split-content`** — **standard-primary**, `balance: equal` — **Brand identity**.
   - Left: `text` eyebrow ("01 — Identity"), `heading` ("Brand identity systems.", size 4xl), `text` short paragraph on what an identity engagement looks like.
   - Right: `features` block — 4 lines with `+` prefixes listing deliverables (Wordmark + symbol / Typography system / Color system / Brand guidelines). Aligned right.
   - `sticky_column: none`

3. **`split-content`** — **standard-secondary**, `balance: right-heavy` — **Editorial & print**.
   - Same pattern, flipped balance. Left: eyebrow "02 — Editorial", heading "Editorial and print.", paragraph. Right: features (Magazine design / Book design / Report design / Annual report).

4. **`split-content`** — **standard-primary**, `balance: equal` — **Digital & web**.
   - Eyebrow "03 — Digital", heading "Digital and web.", paragraph, features (Marketing site / Product brand / Email + social / Digital-first systems).

5. **`split-content`** — **standard-secondary**, `balance: left-heavy` — **Type & illustration**.
   - Eyebrow "04 — Type & illustration", heading "Custom type and illustration.", paragraph, features (Custom wordmark / Display typeface / Editorial illustration / Icon system).

6. **`comparison-table`** — **standard-primary** — **Engagement types**.
   - Eyebrow "How we work", title "Three ways to engage.", `feature_column_label: "What's included"`
   - 3 columns: Sprint (1–2 weeks) / Project (4–12 weeks, featured with badge "Most Common") / Retainer (monthly).
   - 7 feature rows: typical duration, deliverables depth, team assigned, review cycles, source files handed over, support period, typical range.

7. **`action-bar`** (closing) — **highlight-primary**. Heading "Pick a starting point." CTA pair.

**Scheme pattern:** highlight-primary → standard-primary → standard-secondary → standard-primary → standard-secondary → standard-primary → highlight-primary. Alternating standard-primary/secondary across the four service splits gives the page a subtle editorial banding without relying on a hard graphic device.

(Accordion intentionally omitted on this page — the services page is already dense with content; moving common questions to the Contact page keeps this page clean.)

---

### About — 5 widgets

The most differentiator-heavy page in the preset. This is where the designer's voice does the work.

1. **`banner`** (opener) — **highlight-primary**, small. Eyebrow "About", heading "A small studio with a loud voice." (~7xl), intro text (brief studio framing).

2. **`split-content`** (manifesto) — **standard-primary**, `balance: right-heavy`, `sticky_column: left`.
   - **Maximum use of the minimal-section pattern per the user's hint.** Left column: one oversized `heading` block (size 9xl — huge) that reads "Taste is a choice." That is literally everything on the left. Right column: 3 `text` blocks — three short paragraphs arguing the point. Designer-essay format.

3. **`timeline`** — **standard-secondary**, `layout: vertical`, `heading_alignment: start`.
   - Eyebrow "Studio history", title "How we got here.", 5 milestones — 2018 founded, 2020 first book project, 2022 type foundry side-project, 2024 team of two, 2026 Brooklyn studio.

4. **`profile-grid`** — **standard-primary**, `columns_desktop: 2`, `aspect_ratio: "3 / 4"`, `image_style: full`.
   - Eyebrow "Who we are", title "The studio.", 2 profiles. It's a tight team, not a full roster. Names, roles, specialty area, short bio paragraph each.

5. **`action-bar`** (closing) — **highlight-primary**. Heading "Still with us?" Muted text: "Good. Tell us about your project." CTA pair.

(logo-cloud removed from About — keeping the client roster only on Home avoids repetition, and adding press/award logos here would feel like the studio is overselling. The About page earns trust through voice, not logos.)

**Scheme pattern:** highlight-primary → standard-primary → standard-secondary → standard-primary → highlight-primary.

---

### Contact — 4 widgets

Deliberately the shortest page in the preset. A designer's contact page is a low-friction door — anything added here is friction.

1. **`banner`** (opener) — **highlight-primary**, small. Eyebrow "Contact", heading "Send us a paragraph." (~7xl), intro text ("One honest paragraph about the project is better than a filled-in form with boxes checked.").

2. **`split-content`** — **standard-primary**, `balance: left-heavy`.
   - Left column: `text` eyebrow ("Email"), `heading` ("hello@pixelcraft.studio", size 3xl), `text` block with response-time detail, `button` (primary, "Email us", `mailto:` link).
   - Right column: `text` eyebrow ("What to send"), `text` paragraph — a short bulleted-in-prose list of what to include (what, why, when, how much). This is the "voice in copy" moment for this page.
   - `sticky_column: none`

3. **`accordion`** — **standard-primary**, `heading_alignment: center`.
   - Eyebrow "FAQ", title "Common questions.", 5 items covering response time, availability, project sizes, rates, NDA policy. Trailing `info` sidebar block with email + hours.

4. **`action-bar`** (closing) — **highlight-primary**. Heading "Still here?" Text: "Then we should talk." CTA pair — primary "Email us", secondary "See the work".

**Scheme pattern:** highlight-primary → standard-primary → standard-primary → highlight-primary.

---

## Menus

### `main-menu` (5 items)

1. Home → `index.html`
2. Work → `work.html`
3. Services → `services.html`
4. About → `about.html`
5. Contact → `contact.html`

### `footer-menu` (4 items)

1. Work → `work.html`
2. Services → `services.html`
3. About → `about.html`
4. Contact → `contact.html`

---

## Widget Usage Summary

| Widget | Used on | Count | Role |
|---|---|---|---|
| `banner` | every page | 5 | Opener on every page, all `highlight-primary` |
| `scrolling-text` | Home, Work | 2 | Signature editorial marquee (**underused widget**) |
| `bento-grid` | Home | 1 | Selected work asymmetric showcase (**underused widget**) |
| `split-content` | Home, Work, Services, About, Contact | **10** | The structural backbone of the preset |
| `logo-cloud` | Home | 1 | Client roster (**underused widget**) |
| `testimonials` | Home | 1 | Four named-client quotes, grid not carousel |
| `masonry-gallery` | Work | 1 | Full portfolio wall (**underused widget**) |
| `comparison-table` | Services | 1 | Three engagement types |
| `timeline` | About | 1 | Studio history |
| `profile-grid` | About | 1 | 2-person team |
| `accordion` | Contact | 1 | Common questions FAQ |
| `action-bar` | every page | 5 | Closing CTA, consistent highlight-primary |

**Underused widgets used naturally: `scrolling-text` (2×), `bento-grid`, `logo-cloud`, `masonry-gallery` — four distinct widgets, all industry-justified.** Plus `split-content` used 10× — not underused but deliberately heavy per user direction.

Widgets deliberately **not used** in this preset (to stay restrained / off-brand for designers): `trust-bar` (feels agency-corporate), `numbered-cards` (feels process-consulting), `features-split` (already heavy on split-content), `key-figures` / `stats` (designers don't lead with metrics), `countdown` (no promotional element), `contact-details` (replaced by a cleaner split-content email card), `map` (the studio runs remote-first — physical address isn't the hook), `checkerboard` (used heavily on Torque; different medium here), `image-text` / `image-callout` (split-content covers the same compositional moves with more flexibility), `numbered-service-list` (services are editorial splits, not a numbered list), `priced-list` (a designer's rates aren't a menu — handled via the comparison-table).

That's a deliberate restraint of the widget palette — about half the available widgets, chosen to enforce editorial cohesion.

---

## Differentiation Notes

Pixelcraft is engineered to feel architecturally different from every preset already shipped.

- **Palette:** Warm cream + true black + acid chartreuse. Pipeworks went warm + steel-blue + bronze/blue; Torque went cool + charcoal + orange. Pixelcraft's accent is a saturated editorial highlighter color, used sparingly — not a softer brand color worn evenly across every section.
- **Typography:** Syne + Inter Tight. Neither face was used on Pipeworks (Archivo + IBM Plex Sans) or Torque (Space Grotesk + Inter). Syne's character carries the "design studio" signal without any other visual cue having to do the work.
- **Style levers:** sharp + airy + pill. The three-lever combination is unique to this preset — the airy density creates whitespace most presets can't afford; the pill buttons are the single stylistic quirk that differentiates the preset from any sharp/serious business site.
- **Primary CTA:** "Start a project" — verb-first and specific. Pipeworks was phone-first ("Call now"), Torque was booking-first ("Book service"). Pixelcraft refuses both conventions and uses the language designers actually use.
- **No phone number anywhere.** Deliberate. Every previous preset led with a phone number. A designer preset that does the same would undermine its own brand.
- **Home widget sequence:** hero → marquee → bento → split → logos → testimonials → split → CTA. Neither Pipeworks nor Torque used a marquee, bento-grid, or logo-cloud on the home page. Pixelcraft uses all three, and the scrolling-text marquee fused to the hero is the page's signature moment.
- **Services as editorial splits, not a services grid.** Pipeworks used numbered-service-list + priced-list; Torque used checkerboard + priced-list. Pixelcraft uses four consecutive split-content widgets, each a service-as-essay — no other Arch preset does services this way.
- **Work page with masonry gallery.** Neither Pipeworks nor Torque has a dedicated portfolio page — this is a preset-specific need and a preset-specific widget choice.
- **About page as manifesto + tight team.** Pipeworks and Torque both used image-text + timeline + 4-profile grid. Pixelcraft uses split-content manifesto + timeline + 2-profile grid — tighter, voice-first.
- **Contact page without a contact-details widget.** Phone/hours/address get ~~stripped — replaced by a split-content email card with inquiry-etiquette copy.

**Anti-photocopy check.** Not a service trades preset (no phone, no appointment flow). Not a creative-agency template (no stock imagery, no buzzwords). Not a solo-freelancer portfolio (named studio, plural voice, professional roster). Not a minimalist Japanese-design pastiche (warm palette, not a cold one). It reads specifically as *a modern editorial-voiced small design studio*.

---

## Image Brief — for Phase 2

This preset needs the image brief to carry a very specific restraint:

- **The designer's own work is the imagery.** Hero and bento-grid and masonry-gallery images are all **mockups of real-looking design work** — identity systems, magazine spreads, packaging, posters, books, wordmarks — presented on neutral surfaces with good editorial photography. Not people working. Not offices.
- **No staged studio-lifestyle shots.** No MacBooks on desks. No people pointing at whiteboards. No "creative collaboration" imagery. The only people shown are the 2 profile-grid portraits, which are real portraits with calm backdrops.
- **Calm editorial backgrounds.** Concrete, cream paper, lightly textured surfaces, soft natural light. No dark-moody "creative process" aesthetics.
- **Featured case image (work page split-content callout)** should be a single deliberate photograph of a real-looking finished project — a magazine cover in hand, a logo on signage in context, a package on a shelf. Editorial photography, not product-catalog sterility.
- **Team portraits (2 total)** are warm, natural, calm — on a neutral backdrop in or near the studio. Not stylized. Not in uniform. This is a studio, not a service business.
- **No client logo images.** The logo-cloud uses name-only cells. Real clients get handled post-launch by the site owner adding actual logo uploads; the preset ships with text names so it's legible immediately and doesn't produce broken-image cells.

---

## Completion Test (§3.4)

- **Why would a customer trust this business?** The work speaks for itself (bento + masonry), named recognizable clients (logo-cloud), a voice consistent and distinctive across every page (About + services copy), and quiet specific testimonials (not generic praise).
- **What does this site need to prove in the first fold?** This is a real studio with taste. The hero heading + CTA pair + fused scrolling-text marquee does that in one scroll's worth of visual information.
- **What should this site feel like — and what should it not feel like?** A small modern editorial-voiced design studio. *Not* an agency, *not* a freelancer portfolio, *not* a template, *not* a trend-chase pastiche.
- **What pages are actually necessary?** Five — the designer-standard set (Home / Work / Services / About / Contact), because departing from that convention costs more than it gives.
- **What kind of opener fits?** Editorial minimal hero — oversized single-sentence heading, one accent word, dual CTA, background image of the studio's own work.
- **What should feel strongest: offer, proof, imagery, process, or atmosphere?** **Imagery + atmosphere**, in a tight tie, both carried by the visual rhythm of the widget mix (bento + marquee + masonry + split-content). Proof (clients + testimonials) comes second. Offer and process are deliberately de-emphasized.

Phase 0 gates pass. Ready for Phase 1 widget-by-widget schema validation → Phase 2 images → Phase 3 build.
