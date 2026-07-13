# Bedrock — General Contractor Preset Plan

Preset ID: `bedrock` · Industry: General contractor / construction & remodeling

---

## Phase 0 — Industry Strategy Brief

- **Business archetype:** Local lead-gen service with portfolio proof — a project-based contractor (remodels, additions, new builds) where every job is a quote, not a purchase. Structurally sits between a trades site (Pipeworks) and a portfolio studio (Framelight): the *lead form* converts, but the *built work* persuades.

- **Primary conversion:** Quote / consultation request. Secondary: phone call. There is no booking calendar, no pricing checkout — the entire site funnels toward "tell us about your project."

- **Trust mechanism:** Built-work proof above all — finished projects, before/after transformations, and a visible, explained process. Supporting signals: licensing/insurance/bonding statements, years in business, project counts, named crew (people you'll let into your home), and homeowner testimonials tied to specific projects. Contractors are a high-distrust category (cost overruns, abandoned jobs, cowboy builders) — the site's whole job is to look *established, methodical, and accountable*.

- **Decision mode:** Considered and high-ticket. A remodel is a five-figure decision researched over weeks; homeowners shortlist 2–3 contractors and compare. Not urgent (unlike Pipeworks) — the visitor will read the process page, count the portfolio projects, and look for the license number before making contact.

- **Brand personality:** Rugged and honest, with quiet competence. Solid, square, unfussy — the visual equivalent of a clean job site and a straight answer. Not slick-corporate (reads as markup), not grungy-industrial (reads as risky), not playful.

- **Content posture:** Proof-led — imagery of finished work carries persuasion, but *process clarity* carries credibility. Roughly: portfolio shows what they build, process shows they won't disappear mid-job, numbers/credentials show they're established.

- **Audience model:** Primarily homeowners (remodels, additions, kitchens/baths). Secondary: light-commercial clients (fit-outs, small commercial builds) — acknowledged with a service category and one portfolio entry, not a separate track.

- **Required page jobs:**
  - **Home** — establish scale + trust fast: what they build, proof it's real, how to start.
  - **Services** — structure the offer into clear project categories (kitchen/bath, additions, whole-home, light commercial) so the visitor self-identifies.
  - **Projects (portfolio)** — the evidence locker; category-spanning finished work, at least one before/after.
  - **Process** — the differentiator page for this industry: consultation → design/estimate → build → walkthrough. Directly attacks the "will they disappear with my deposit" fear. Warranty/guarantee lives here.
  - **About** — the humans and the history: owner story, crew, credentials, service area.
  - **Contact** — quote request form with expectation-setting (what happens after you submit, response time, service area).

- **No-go patterns:** Urgent/emergency framing (that's Pipeworks' logic); salesy CTA stacking or discount language (high-ticket considered purchases distrust pressure); playful rounded styling or pastel palettes; dark cinematic moodiness (reads architect/luxury, not builder); stock-photo hardhat clichés with rendered text on vests/signage; anything that hides the humans behind the brand.

- **Opener candidates:** Cinematic built-work opener (full-width finished project with a plain-spoken value line) — leads with proof and scale. Alternative considered: proof-first stat opener (projects completed / years / warranty), but numbers land better *after* an image establishes what they build. The opener must support the transparent header for an established, confident first fold.

- **Closing pattern:** Consistent quote-request handoff — a highlight CTA section ("Tell us about your project") closing most pages, softened on About/Process to an invitation rather than a push. Contact page closes with reassurance (response time, no-obligation) instead of another CTA.

### Completion test (§3.4)

- **Why trust?** Visible finished work, explained process, license/insurance up front, named crew, project-specific testimonials.
- **First fold must prove:** "We build serious residential projects, we've done it many times, and starting a conversation is easy."
- **Feel like / not like:** A well-run job site — ordered, sturdy, plain-spoken. Not a corporate brochure, not an emergency service, not a design magazine.
- **Necessary pages:** Home, Services, Projects, Process, About, Contact. (Process earns a page of its own in this industry; nothing else does — no blog, no FAQ page; objections are handled inside Process/Contact.)
- **Opener:** Cinematic image opener — considered decision mode + image-led proof.
- **Strongest signal:** Proof (portfolio) first, process second, credentials third.

---

## Phase 1 — Plan

### Identity

- **Name:** Bedrock · **ID:** `bedrock` · **Registry description:** "General contractor"
- **Voice:** plain-spoken, declarative, no superlatives. Short sentences. The copy should sound like a builder who answers questions directly ("We handle the permits. You get a fixed quote before we start.").
- **Fictional business:** Bedrock Contracting — a residential general contractor doing remodels, additions, and whole-home renovations, with occasional light-commercial fit-outs. All contact details are placeholders per the non-negotiable rules: `hello@example.com`, `(555) 555-0130`, `tel:+15555550130`, license shown as "Lic. #000000".

### Industry translation

Considered, high-ticket, high-distrust. The catalog's other trades presets are urgency-led (Pipeworks) or maintenance-led (Torque); Bedrock is **project-led**: the visitor is planning something big and slow, so the site sells accountability, not availability. Three proof layers, in order: built work (projects collection + before/after), process rigor (dedicated Process page), establishment signals (license/insurance trust-bar, stats, named crew).

### Collection seeding

Bedrock seeds the **`projects`** collection (6 items) — the first preset to use it. Case-study item pages at `projects/<slug>/` are the deepest trust artifact a contractor site has. Items: kitchen remodel, primary-bath remodel, two-story addition, whole-home renovation, cedar deck + pergola, café fit-out (covers the light-commercial audience). Each item ships `title`, `summary`, `description` (2–3 paragraphs: scope → complication → result), `client` (family-style placeholder, e.g. "The Alvarez family"), `year` (2024–2026), and a `featured_image` path following the media-manifest convention (`/uploads/images/bedrock-project-<slug>.webp`). Pipeline: FLUX outputs `.jpg` → `scripts/optimize-images.js` converts to lossless `.webp` → those are uploaded and packed, so `.webp` is the shipped truth. `gallery` and `external_url` are left for production. The **services** collection is NOT used — contractors don't publish prices, and block-based sections tell the services story better.

### preset.json settings

Palette: warm mineral world — timber, dried clay, site dust. Highlight surface is dark **umber** (not navy). Accent is **rust/burnt orange** — steel oxide, safety-adjacent without being safety-vest.

```json
{
  "settings": {
    "standard_bg_primary": "#faf9f6",
    "standard_bg_secondary": "#f1ece3",
    "standard_text_heading": "#241f19",
    "standard_text_content": "#443d33",
    "standard_text_muted": "#837a6c",
    "standard_border_color": "#ddd5c7",
    "standard_accent": "#b35c1e",
    "standard_accent_text": "#ffffff",
    "standard_rating_star": "#d9930d",
    "highlight_bg_primary": "#292219",
    "highlight_bg_secondary": "#1e1912",
    "highlight_text_heading": "#f7f3ec",
    "highlight_text_content": "#cec5b6",
    "highlight_text_muted": "#978d7c",
    "highlight_border_color": "#453c2f",
    "highlight_accent": "#e0813c",
    "highlight_accent_text": "#241f19",
    "highlight_rating_star": "#d9930d",
    "heading_font": { "stack": "\"Arvo\", serif", "weight": 700 },
    "body_font": { "stack": "\"Public Sans\", sans-serif", "weight": 400 },
    "corner_style": "sharp",
    "spacing_density": "default",
    "button_shape": "sharp"
  }
}
```

- **Arvo 700** (slab serif — verified in arch-fonts-list.csv, weights 400|700): sturdy, squared, structural; reads "built". No other preset direction uses a slab-serif heading paired with a rust accent.
- **Public Sans 400** (verified, 100–900): plain, legible, mildly institutional — the "straight answer" body voice.
- **sharp corners + sharp buttons**: square edges everywhere; the visual analogue of framing lumber. `spacing_density: default`.

### Header

```
logoText: "Bedrock", contact_position: "logo",
contactDetailsLine1: "Call us: (555) 555-0130",
contactDetailsLine2: "Licensed · Bonded · Insured — Lic. #000000",
ctaButtonLink: { href: "contact.html", text: "Request a quote", target: "_self" },
ctaButtonStyle: "primary", full_width: true, sticky: true,
transparent_on_hero: true, color_scheme: "standard-primary"
```

Credentials in the header line — the establishment signal is visible before a single scroll, on every page.

### Footer

`color_scheme: highlight-primary`, `layout: first-featured`, copyright "© 2026 Bedrock Contracting. All rights reserved." Blocks (4):
1. `logo_text` — brand + one-line positioning.
2. `text_block` "Office" — placeholder address + phone + email, one `<p>` per line.
3. `text_block` "Licensing" — Lic. #000000 / bonded + insured / EPA Lead-Safe certified. (Distinct footer move — no other preset uses a licensing column.)
4. `menu_block` "Explore" — footer-menu.

### Menus

- `main-menu`: Home, Services, Projects, Process, About, Contact (flat, 6 items; Contact stays in the nav even though the header CTA also targets it).
- `footer-menu`: same 6 items.

### Page-by-page widget plan

Surface grammar site-wide: `highlight-primary` = conversion moments (hero, closing action-bar); `highlight-secondary` = social-proof bands on inner pages; `standard-secondary` = banding. Max 2 highlight sections per page, never adjacent.

**index** (Home — 9 widgets)
1. `hero` **banner** — height `large`, fullwidth, `alignment: start`, `vertical_alignment: center`, `highlight-primary`, `top_spacing: none` (transparent header). Blocks: text eyebrow (sm, uppercase, "General contractor · Remodels & additions"), heading 7xl "Built right. Built to last.", text lg (one-sentence promise), button primary "Request a quote" → contact.html + secondary "See our work" → projects.html.
2. `credentials` **trust-bar** — `top_spacing: small` / `bottom_spacing: small` (docked under the filled hero — the hero's bottom spacing is internal padding, so the bar brings its own gap; `none` here collides with the image edge), standard-primary, `alignment: start`, dividers on. 4 items (icons verified): `license` "Licensed & bonded", `shield` "Fully insured", `clock` "22 years in business", `tool` "2-year workmanship warranty".
3. `service_categories` **card-grid** — "What we build", 4 columns, `flat`, aspect `"4 / 3"`, heading start-aligned, no card buttons (per insights). Cards: Kitchens & baths / Additions / Whole-home renovations / Light commercial.
4. `recent_projects` **projects-grid** (collection) — "Recent projects", `limit: 3`, 3 columns, `layout: card`, `text_display: always` (contractor insight: informational beats gallery-cool), show client + year, `view_all_link` → projects.html. standard-secondary.
5. `before_after` **comparison-slider** — "From worn out to move-in ready.", `initial_position: 25` (lead with "before"), labels "Day 1" / "Handover", `content_width: wide`, standard-primary.
6. `by_the_numbers` **key-figures** — 4 figures, `flat`, animate: 22+ years · 340+ projects · 96% on-time or early · 24mo warranty. standard-primary.
7. `how_we_work` **steps** — image-free 3-step teaser ("this is easy" pattern): Site visit → Fixed quote → Build & walkthrough; button on step 3 → process.html. standard-secondary.
8. `homeowner_quote` **testimonial-hero** — one strong quote, `image_position: end`, standard-primary.
9. `closing_cta` **action-bar** — highlight-primary, heading 3xl "Tell us about your project.", text muted, button primary "Request a quote" + secondary "Call (555) 555-0130" (`tel:+15555550130`).

**services** (5 widgets)
1. `page_opener` **rich-text** — standard-primary, text_alignment start, content_width wide; eyebrow "Services", heading 6xl "What we build.", text: one accountable team from permits to punch list. (All five inner openers are rich-text, not banner: with `transparent_on_hero` on, any first-widget banner — even imageless — flips the header into its over-image styling and kills contrast on light pages.)
2. `service_list` **numbered-service-list** — 5 services (numbered 01–05, editorial): Kitchen & bath remodels / Home additions / Whole-home renovations / Decks & outdoor structures / Light commercial fit-outs. No per-row links (this page is the destination). standard-primary.
3. `one_team` **image-text** — the signature `content_color_scheme` panel move: color_scheme standard-primary + `content_color_scheme: standard-secondary`, image end. Content: "One team, one contract" — in-house crew + long-term subs, single point of accountability. Features block (+ Dedicated project manager, + Daily site cleanup, + Fixed written quotes).
4. `objections` **accordion** — "Before you hire anyone" (eyebrow), heading start, `style: separated`, `sidebar_position: end` with `info` sidebar block ("Not sure where your project fits?" → email) — satisfies the accordion-sidebar rule. 5 items: permits, living through a remodel, change orders, subcontractors, payment schedule. standard-secondary.
5. `closing_cta` **action-bar** — highlight-primary, same conversion grammar as Home.

**projects** (5 widgets)
1. `page_opener` **rich-text** — standard-primary; eyebrow "Our work", heading 6xl "Proof, not promises."
2. `all_projects` **projects-grid** (collection) — `limit: 12`, 3 columns, `text_display: always`, show summary/client/year. standard-primary.
3. `project_reviews` **testimonials** — 3 quotes tied to named projects, grid, 3 columns, `box`; one 4-star among the 5s (insights: all-5s reads manufactured). **highlight-secondary** (proof band).
4. `before_after` **comparison-slider** — second instance, different labels ("Original kitchen" / "Six weeks later"), `initial_position: 30`. standard-secondary — also separates the two highlight surfaces.
5. `closing_cta` **action-bar** — highlight-primary.

**process** (5 widgets — the differentiator page)
1. `page_opener` **rich-text** — standard-primary; eyebrow "How we work", heading 6xl "No surprises. That's the process." Text: what the deposit protects, when you hear from us.
2. `the_steps` **steps** — 5 steps WITH images (placeholders until production): Site visit & consultation / Design & fixed quote / Permits & scheduling / Build / Final walkthrough & warranty. Button only on step 1 (→ contact.html). standard-primary.
3. `typical_timeline` **timeline** — `layout: horizontal`, 4 items max (insight cap): "Weeks 1–2 Design" / "Weeks 3–4 Permits" / "Weeks 5–10 Build" / "Week 11 Walkthrough", each with `features` checklists (`+` lines). standard-secondary. (Steps = our phases; timeline = your calendar — complementary, not redundant.)
4. `warranty` **image-text** — "If it's not right, we come back." — 2-year workmanship warranty terms; `image_position: start`, features block. standard-primary.
5. `closing_cta` **action-bar** — softened: heading 2xl "Questions about the process?", single primary "Ask us anything" → contact.html. highlight-primary.

**about** (6 widgets)
1. `page_opener` **rich-text** — standard-primary; eyebrow "About us", heading 6xl "Twenty-two years of showing up."
2. `founder_story` **image-text** — origin story, `image_position: start`, heading 3xl, standard-primary.
3. `credentials` **trust-bar** — credentials variant (icons verified): `certificate` "Lic. #000000", `shield` "Bonded & insured", `checklist` "EPA Lead-Safe certified", `helmet` "OSHA-trained crews". `standard-secondary`, spacing small (bridge element).
4. `the_crew` **team-highlight** — sticky-intro split, 2 columns (spacious), `image_ratio: portrait`; 4 members: owner/GC, project manager, site superintendent, office manager — role + specialty lines, no bios, no socials. standard-primary.
5. `client_voices` **testimonial-slider** — 3 quotes, autoplay 6000ms. **highlight-secondary** (proof band).
6. `closing_cta` **action-bar** — softened invitation, highlight-primary. (Slider and bar are both highlight — separated? No: adjacent. Swap order: move slider before the crew? Proof band mid-page: story → trust-bar → slider → crew → action-bar. Final order: 1,2,3,5(slider),4(crew),6. Documented so Phase 3 builds it in this corrected order.)

**contact** (5 widgets)
1. `page_opener` **rich-text** — standard-primary; eyebrow "Contact", heading 6xl "Let's talk about your project." Text: response within one business day, no-obligation site visits.
2. `reach_us` **contact-details** — `first-featured`, 4 blocks: `info` (brand line + who to ask for), `text_block` "Call or write" (phone `<p>`, email `<p>`), `text_block` "Office hours" (Mon–Fri 7am–5pm / Sat by appointment), `text_block` "Service area" (metro + surrounding counties placeholder copy).
3. `next_steps` **steps** — image-free 3 steps, "What happens after you reach out": We call within one business day / Free site visit / Written fixed quote in 5 days. standard-secondary. (Expectation-setting — the anti-ghosting reassurance this industry needs.)
4. `office_map` **map** — height medium, `sidebar_position: end`, `info` sidebar ("Visiting? Call ahead — we're on site most days"), `directions_link` filled, `show_address: true`, placeholder address. standard-primary.
5. `closing_cta` **action-bar** — heading 2xl "Prefer the phone?", primary "Call (555) 555-0130" (tel:) + secondary "Email us" (mailto:hello@example.com). highlight-primary.

### Widget usage summary

banner ×1 (hero) · rich-text ×5 (inner openers) · action-bar ×6 · steps ×3 (5-img / 3-plain ×2) · image-text ×3 · comparison-slider ×2 · trust-bar ×2 · projects-grid ×2 (collection) · accordion ×1 (with sidebar ✓) · card-grid ×1 · numbered-service-list ×1 · key-figures ×1 · timeline ×1 · testimonial-hero ×1 · testimonials ×1 · testimonial-slider ×1 · team-highlight ×1 · contact-details ×1 · map ×1.

Underused-widget quota (≥2): comparison-slider, timeline, team-highlight, projects-grid + seeded projects collection.

### Differentiation notes

- vs **Pipeworks** (plumber): no urgency anywhere — no 24/7, no emergency dispatch; slab-serif + warm umber vs Pipeworks' look; conversion is a considered quote request, closer is calm.
- vs **Torque** (auto repair): project-based case studies vs recurring service; Process page has no equivalent there.
- vs **Greenfield** (landscaping): Bedrock is process/accountability-led, not beauty-led; before/after used as engineering proof, not styling.
- Opener family: cinematic bottom-weighted image hero — but the page's real signature is the docked trust-bar + collection-backed portfolio, which no existing preset has.

### Image-reference convention (0.9.9)

Unlike the placeholder-era rule in theme-preset-generator.md §11 (written for 0.9.8), presets in this release **ship packed media and reference images directly in template JSON** (see greystone et al.). Bedrock templates therefore set image fields to `/uploads/images/bedrock-<name>.webp` — the `.webp` basenames of the Phase 2 images.json entries after `optimize-images.js` conversion. Buttons that shouldn't render use the empty-link convention: `{ "href": "", "text": "", "target": "_self" }`.

### Production notes (for later phases)

- Images JSON must cover: hero, 4 service-category cards, 6 project featured images, comparison before/after ×2 pairs (identical framing per pair!), 5 process step images, founder portrait, 4 crew portraits, warranty/detail shot, testimonial-hero portrait. Avatars 512×512.
- FLUX guardrails apply hard here: no text on vests/vans/signage, no grunge vocabulary (clean-trade brand), job sites shown *ordered* — swept floors, stacked lumber, organized tools.
