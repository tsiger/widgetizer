# Inkwell — Arch Preset Plan

**ID:** `inkwell`
**Display name:** Inkwell
**Industry:** Tattoo studio / boutique custom-tattoo practice

---

## Phase 0 — Industry Strategy Brief

- **Business archetype:** Boutique custom-tattoo studio — 6 resident artists plus occasional guests, appointment-only, commissioned work. Not a walk-in street shop, not a chain. Brooklyn-based. The kind of studio that gets written up in *Inked* or *Tattoo Life* and where artists keep a waiting list.

- **Primary conversion:** Inquiry for a **specific artist** (selected after browsing portfolios). Secondary: general inquiry for a custom piece where the studio routes to the right artist. Phone inquiries are not a thing — all inquiries go through email / the form.

- **Trust mechanism:** In descending order:
  1. **The artists** themselves — named, each with a distinct style and a deep personal portfolio. This is the single most important thing on the site.
  2. **The work** — a studio-wide gallery that shows range and consistency.
  3. **Hygiene, licensing, professionalism** — tattoo clients actively worry about this, and saying it outright without being defensive is a real trust lever.
  4. **Studio atmosphere** — clients want to see they'd feel comfortable walking in.
  5. **Process clarity** — how a commission moves from inquiry to ink.

- **Decision mode:** Deeply considered, emotional (it's permanent), often researched over weeks. Clients hunt for a specific artist whose style matches their vision. Price rarely decides once the artist is chosen — availability and vibe do.

- **Brand personality:** **Editorial-dark, subcultural, confident.** Think Sang Bleu, Bang Bang NYC, or a high-end Berlin/Tokyo studio — not a street shop, not a tourist-strip parlor. The visual target: a well-made magazine about tattooing rather than a tattoo-parlor website. Restrained dark palette. Single saturated accent. Bold editorial type. No Old-English lettering, no skulls, no barbed wire, no "ink your legacy" marketing copy.

- **Content posture:** **Image-led** first (work speaks first), **artist-led** second (the people speak second), text third. Copy is confident, understated, slightly dry — closer to gallery wall labels than marketing copy.

- **Audience model:** Primary — people researching a custom tattoo, comparing artists. Secondary — walk-bys who want to know if the studio does what they're looking for. Single audience really; artist-shoppers.

- **Required page jobs:**
  - **Home** — cinematic opener, voice, artist tease, work tease, route to inquiry.
  - **Artists** — the studio's load-bearing page. Each resident artist with a bio, style, and a way to see their personal portfolio (via IG link or artist name lookup).
  - **Work** — studio-wide gallery of recent pieces. Heavy masonry layout.
  - **Visit** — the physical space, how appointments work, hygiene / licensing, aftercare, policies. A "walk-in FAQ" for people who want to know what to expect.
  - **Contact** — structured inquiry with fields that route to the right artist.

- **No-go patterns:**
  - Beige / cream / sugar / orange palettes. (Explicit: user-flagged.)
  - Old-English / Gothic blackletter display type.
  - Tribal / Celtic-knot / skull-and-barbed-wire imagery.
  - Neon or cyberpunk / gamer / RGB aesthetic.
  - "Unleash your inner art" / "your story, your ink" marketing copy.
  - Faux-distressed grunge textures used as atmosphere.
  - Rotating carousels of "Best of Pinterest" tattoo stock images.

- **Opener candidates:**
  - **Fullwidth `banner` with transparent header on a dramatic close-up** (selected) — cinematic-image-first is the category posture; this is one of the few industries where "hero image" genuinely earns its keep.
  - `slideshow` of rotating work (considered — risks feeling like a parlor carousel).
  - `split-hero` text-first (rejected — this audience looks first).

- **Closing pattern:** Confident invitation — "Start an inquiry." Not urgent, not cute. Treat the ask like a gallery submission: respectful, clear, one button.

### Phase 0 completion test

- Why would someone trust this studio? Because the artists are visibly world-class, the portfolio speaks, the hygiene and process are clear, and the voice isn't trying too hard.
- First-fold prove? That this studio does serious custom tattoo work by named artists — not a walk-in strip.
- Feel like / not like? Editorial-dark, confident. Not Gothic, not neon-cyberpunk, not suburban, and very not warm-beige.
- Pages necessary? 5: Home, Artists, Work, Visit, Contact.
- Opener? Cinematic banner with transparent header.
- Strongest? Artists + Work. Everything else supports those two pages.

---

## 1. Identity

Inkwell is a **boutique custom-tattoo studio in Brooklyn**, positioned as an artist-led, gallery-adjacent practice. The name is deliberately literary (an inkwell, the vessel) rather than tough-guy (no "Ironblood Tattoo Co."). Reads as refined without being precious.

Brand expression: **ink black, steel, crimson.** Near-black highlight surfaces. Cool off-white standard surfaces (cold bone / paper-white, but **not beige** — deliberately neutral-cool). One saturated deep-crimson accent used sparingly on buttons and key signals. Sharp corners. Bold editorial sans heading (Syne 700) + disciplined reading sans body (IBM Plex Sans). No decorative flourishes. Layout dense but breathable.

## 2. Industry Translation

Compared to the 17 completed presets:

- **Every completed preset is warm** (beige/cream/ivory + warm browns, greens, roses, oranges). Inkwell is deliberately **cool** — cold off-white + ink black + crimson. First cool-toned preset in the catalog.
- **No completed preset is image-led-subcultural**. Everafter is image-led but editorial-romantic; inkwell is image-led + sharper-edged + darker-toned. A different kind of image-led.
- **Every completed heading font is serif or warm grotesque** (Fraunces, Literata, Libre Baskerville, Bodoni Moda, Space Grotesk, Outfit). Syne is grotesque with distinct flared terminals — personality without nostalgia.
- **Highlight surface meaning shifts** — in most presets, `highlight-primary` is "the one emotional moment per page." In inkwell, the banner opener AND mid-page proof AND closing CTA all lean on dark surfaces, so the site feels moodier overall while still respecting the 1–2-body-highlight rule.

This becomes the catalog's anchor for "cool-toned editorial" and for "subcultural boutique" simultaneously.

## 3. Sitemap Rationale

Five pages. Deliberately **no separate Services page** (styles and pricing live on Artists + Visit). Deliberately **no About page** (Visit carries the studio story; the people are on Artists).

| Page | Job | Why it earns its place |
|------|-----|------------------------|
| `index` | Cinematic voice + artist/work tease + route to inquiry | Establishes tone, previews the two load-bearing pages, drives to contact |
| `artists` | The people — each resident with bio, style, portfolio link | *The* trust page; clients shop by artist |
| `work` | Studio-wide gallery | Range and consistency proof; feeds the artist shortlisting |
| `visit` | Studio info + hygiene + aftercare + policies + FAQ | Dissolves the anxiety that blocks a first-time tattoo client |
| `contact` | Routed inquiry | Conversion + routing the inquiry to the right artist |

## 4. `preset.json` Settings

### Color palette — "ink, steel, crimson"

| Token | Hex | Role |
|-------|-----|------|
| `standard_bg_primary` | `#f1f1f3` | Cool bone — off-white with slight blue-grey tint (deliberately **not** beige) |
| `standard_bg_secondary` | `#e3e3e7` | Cool steel-grey for banding |
| `standard_text_heading` | `#0a0a0c` | Cool near-black |
| `standard_text_content` | `#1f1f22` | Cool charcoal body |
| `standard_text_muted` | `#6e6e76` | Cool slate-grey |
| `standard_border_color` | `#c8c8cf` | Cool pale-grey border |
| `standard_accent` | `#a01824` | Deep oxblood / crimson — primary accent |
| `standard_accent_text` | `#f1f1f3` | Cool bone on accent |
| `standard_rating_star` | `#a01824` | Same crimson — consistent signal color |
| `highlight_bg_primary` | `#0a0a0c` | Cool ink black |
| `highlight_bg_secondary` | `#000000` | Pure black |
| `highlight_text_heading` | `#f1f1f3` | Cool bone on dark |
| `highlight_text_content` | `#c4c4cc` | Pale steel-grey on dark |
| `highlight_text_muted` | `#6e6e76` | Same muted slate |
| `highlight_border_color` | `#2a2a2e` | Dim ink border |
| `highlight_accent` | `#e3354a` | Brighter crimson for dark-surface visibility |
| `highlight_accent_text` | `#0a0a0c` | Ink on accent |
| `highlight_rating_star` | `#e3354a` | Same bright crimson |

Contrast checks: body `#1f1f22` on `#f1f1f3` ≈ 14:1; crimson accent `#a01824` on `#f1f1f3` ≈ 7.4:1 (passes AA for all text but deliberately reserved for buttons/links); highlight body `#c4c4cc` on `#0a0a0c` ≈ 13:1. Pass everywhere.

### Typography

| Setting | Value | Notes |
|---------|-------|-------|
| `heading_font` | `{ "stack": "\"Syne\", sans-serif", "weight": 700 }` | Bold editorial grotesque with flared terminals — distinctive personality without old-tattoo-cliché. First use in the catalog. |
| `body_font` | `{ "stack": "\"IBM Plex Sans\", sans-serif", "weight": 400 }` | Disciplined, technical reading sans — feels like a publication, not a blog. First use in the catalog. |
| `heading_scale` | 100 | Default — Syne 700 already reads confident at baseline. |
| `body_scale` | 100 | Default. |

Verified in `arch-fonts-list.csv`: Syne (400–800), IBM Plex Sans (100–700).

### Style settings

| Setting | Value | Rationale |
|---------|-------|-----------|
| `corner_style` | `sharp` | Needles, line-work, clinical precision. Not rounded. |
| `spacing_density` | `default` | Airy would feel too luxurious (this isn't a spa); compact too cramped. |
| `button_shape` | `sharp` | Explicit, not auto — rectangular crimson buttons read as "button" in the editorial way, not "pill in a consumer app." |

## 5. Header Configuration

```json
{
  "type": "header",
  "settings": {
    "logoText": "Inkwell",
    "contact_position": "menu",
    "ctaButtonLink": {
      "href": "contact.html",
      "text": "Book a consult",
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

- No `contactDetailsLine1/2` — tattoo inquiries don't happen by phone; form + IG only.
- `transparent_on_hero: true` — homepage opens with `banner` (which supports transparency).
- Primary crimson CTA — direct, in-character.

## 6. Footer Configuration

```json
{
  "type": "footer",
  "settings": {
    "copyright": "© 2026 Inkwell Studio. All rights reserved.",
    "layout": "first-featured",
    "color_scheme": "highlight-primary"
  },
  "blocks": {
    "logo_text_1": {
      "type": "logo_text",
      "settings": {
        "text": "<p>A custom tattoo studio in Brooklyn. Six resident artists, by appointment. Licensed by the NYC Department of Health.</p>"
      }
    },
    "text_block_1": {
      "type": "text_block",
      "settings": {
        "title": "Visit",
        "text": "<p>184 Graham Avenue</p><p>Brooklyn, NY 11206</p><p>Tuesday – Saturday, 12–8pm</p>"
      }
    },
    "menu_block_1": {
      "type": "menu_block",
      "settings": {
        "title": "Pages",
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

Ink-black footer. Licensing line in the brand paragraph is a deliberate trust lever.

## 7. Page Strategy

The first build of this plan reused the same home flow I'd used for four previous presets (hero → strip → image-text → profile-grid → gallery → testimonial-hero → steps → action-bar). **Rewritten to actually lean on widget insights.** Core compositional moves that drive this preset:

- **`split-content` used as editorial composition tool, not as a CTA** — specifically the *large-heading opener* (recipe §5) and *zigzag image sequence* (recipe §4) recipes from its insights. Used as page openers and as the Artists-page backbone.
- **`sliding-panels` as Artist showcase** (insights recipe §4 Team/Expertise Spotlight) — signature home moment, click-to-expand panels, first panel pre-opened with the flagship artist.
- **`image-callout`** (insights recipe §5 Credibility Builder) — overlapping content card with features list for the hygiene/licensing trust lever and the "what happens next" moment on Contact.
- **`bento-grid`** (insights recipe §5 Asymmetric Storytelling) — 3×2 hero image tile + two stat tiles for the studio section on Home and on Visit.
- **`checkerboard`** (insights recipe §3 Portfolio Mosaic) — 3-column alternating image/text mosaic on the Work page, distinct from the masonry grid below it.
- **`masonry-gallery`** used in two different modes: the Tight Portfolio Wall (insights recipe §1) on Home — dense, 4 columns, `gap: small`, image-only cards — and a browsable captioned archive on Work.
- **`scrolling-text`** angled crimson marquee (signature retained).

Highlight discipline: banner opener (highlight-primary, transparent header) is still the special-case opener. Body highlights per page = 1–2, never adjacent.

**Widgets deliberately retired from this preset:** `image-text`, `profile-grid`, `steps`, `testimonial-hero`, `icon-card-grid`, `features-split`, `numbered-service-list`. Those are the "default template" widgets I kept reaching for; leaving them off forces the preset into a genuinely different shape.

## 8. Page-by-Page Widget Plan

### 8.1 `index.json` — Home

| # | Widget | Color scheme | Spacing | Role |
|---|--------|--------------|---------|------|
| 1 | `banner` | `highlight-primary` | `none` / `auto` | Cinematic fullwidth opener with `transparent_on_hero: true`. Large height. Dramatic overlay. Eyebrow "Custom tattoo · Brooklyn · since 2014", headline "Ink that lasts, made by hand.", supporting line, primary crimson button "Book a consult". Image omitted — placeholder. |
| 2 | `scrolling-text` | *direct colors* | `small` / `small` | **Signature retained.** Crimson bg `#a01824`, bone text. Style names separated by `·` dots: `Fine line · Blackwork · Japanese · Neotraditional · Realism · Dotwork · Illustrative · Flash`. Rotated `-4°`, size `lg`. |
| 3 | `split-content` | `standard-primary` | `auto` / `auto` | **Editorial opener — insights recipe §5 (Large heading + body text).** `balance: left-heavy`. Left: small-uppercase-muted eyebrow "The studio" + heading at `7xl` "Six artists. One studio." Right: body text (lg) — the firm's voice on craft, slowness, custom-only work, why no walk-ins. No buttons — let the content breathe. |
| 4 | `sliding-panels` | `standard-secondary` | `auto` / `auto` | **Signature artist showcase — insights recipe §4 (Team/Expertise Spotlight).** `heading_alignment: start`, eyebrow "The artists", title "Six residents." 6 panels, one per artist; first panel is Rafael (the signature Japanese artist) pre-expanded. Panel blocks: image, title (artist name), subtitle (specialty), button linking to artists.html. |
| 5 | `masonry-gallery` | `standard-primary` | `auto` / `auto` | **Tight Portfolio Wall — insights recipe §1.** `columns_desktop: 4`, `gap: small`, `heading_alignment: start`. Eyebrow "Recent work", title "A decade of permanent ink." **12 image-only items — no titles, no categories**. Maximum visual density. |
| 6 | `image-callout` | `highlight-primary` | `auto` / `auto` | **Credibility Builder — insights recipe §5.** `image_position: end`. Overlapping content card with: text kicker (sm, muted) "Why trust us" + heading (3xl) "Permanent work, taken seriously." + features list (5 items with `+` prefix: NYC DOH licensed, autoclave-sterilised, single-use needles & ink, written aftercare + balm, free first-year touch-ups) + button (secondary, medium) "More on the Visit page". |
| 7 | `bento-grid` | `standard-primary` | `auto` / `auto` | **Asymmetric Storytelling — insights recipe §5.** `gap: md`, heading_alignment start. Eyebrow "The studio", title "184 Graham Avenue." 3 tiles: (a) big 3×2 image tile of the studio interior with light-text overlay "A quiet room in East Williamsburg.", (b) 1×1 flat crimson-accent tile "12 years in practice", (c) 1×1 flat tile with dark text "6 resident artists, by appointment only." |
| 8 | `action-bar` | `highlight-secondary` | `auto` / `auto` | Closing CTA — "Something in mind?" primary button "Start an inquiry". |

Body highlights: #6 + #8, separated by standard-primary #7. ✓ Banner opener counted as special-case. Scrolling-text uses direct colors and doesn't count toward the highlight budget.

### 8.2 `artists.json` — Artists (load-bearing page)

**Structure:** editorial opener → 6 zigzag mini-spreads (one per artist, alternating balance, flush-stacked with `spacing: none`) → testimonials → CTA. This is insights recipe §4 (Zigzag image sequence) applied as the backbone of a page — "one of the widget's most powerful and unique uses."

| # | Widget | Color scheme | Spacing | Role |
|---|--------|--------------|---------|------|
| 1 | `split-content` | `standard-primary` | `auto` / `auto` | **Editorial opener — insights recipe §5.** Left-heavy. Left: eyebrow "The artists" + heading `7xl` "Six artists. Six hands. Six practices." Right: body paragraph on roster philosophy. |
| 2 | `split-content` | `standard-primary` | `none` / `none` | **Artist 1 — Saoirse (fine line).** `balance: left-heavy`. Left: full-width image (artist portrait or signature work) + small-uppercase muted label "Fine line · 8 years". Right: heading (3xl) "Saoirse Doyle" + body text (bio) + secondary button "See work". |
| 3 | `split-content` | `standard-primary` | `none` / `none` | **Artist 2 — Rafael (Japanese).** `balance: right-heavy`. Right: full-width image. Left: heading + body + button. (Mirrored from #2.) |
| 4 | `split-content` | `standard-primary` | `none` / `none` | **Artist 3 — Kiko (neotraditional).** `left-heavy`, same pattern as #2. |
| 5 | `split-content` | `standard-primary` | `none` / `none` | **Artist 4 — Elena (realism).** `right-heavy`. |
| 6 | `split-content` | `standard-primary` | `none` / `none` | **Artist 5 — Jules (blackwork).** `left-heavy`. |
| 7 | `split-content` | `standard-primary` | `none` / `auto` | **Artist 6 — Indra (dotwork).** `right-heavy`. Restores auto bottom spacing to transition to the next widget. |
| 8 | `testimonials` | `standard-secondary` | `auto` / `auto` | Carousel of 4 client quotes, each tagged with the artist. `layout: carousel`, 2 columns desktop, `card_layout: flat`. |
| 9 | `action-bar` | `highlight-primary` | `auto` / `auto` | Closing CTA. |

Body highlights: 1 (action-bar). ✓

### 8.3 `work.json` — Work

| # | Widget | Color scheme | Spacing | Role |
|---|--------|--------------|---------|------|
| 1 | `split-content` | `standard-primary` | `auto` / `auto` | **Editorial opener — insights recipe §5.** Left-heavy. Left: eyebrow "Work" + heading `7xl` "Selected pieces, in no particular order." Right: body text — short framing. |
| 2 | `checkerboard` | `standard-primary` | `auto` / `auto` | **Portfolio Mosaic — insights recipe §3.** `columns_desktop: 3`, `heading_alignment: start`. Eyebrow "Featured", title "Pieces we come back to." 6 cards: positions 1, 3, 4, 6 are image-only tiles (featured pieces); positions 2, 5 are text cards (one per style category with a short descriptor) that break the visual rhythm. |
| 3 | `masonry-gallery` | `standard-secondary` | `auto` / `auto` | **Browsable archive.** `columns_desktop: 3`, `gap: medium`. Eyebrow "The archive", title "A decade of permanent ink." 20 items, each with title (piece name) + category (style · artist). Different from the home masonry (which was dense image-only). |
| 4 | `action-bar` | `highlight-primary` | `auto` / `auto` | Closing CTA. |

Body highlights: 1. ✓

### 8.4 `visit.json` — Visit

| # | Widget | Color scheme | Spacing | Role |
|---|--------|--------------|---------|------|
| 1 | `split-content` | `standard-primary` | `auto` / `auto` | **Editorial opener — insights recipe §5.** Left-heavy. Left: eyebrow "Visit" + heading `7xl` "A quiet room on Graham Avenue." Right: body paragraph on the physical studio — 6 stations, daylight, framed sketchbook prints, licensed. |
| 2 | `image-callout` | `standard-secondary` | `auto` / `auto` | **Credibility Builder — insights recipe §5.** Different content from home's callout. `image_position: start`. Image of studio detail (sterilisation, organised station). Content card: kicker "Session day" + heading "What to bring, what to know" + features list (6 items with `+`: arrive 15 min early, eat beforehand, hydrate, no alcohol 24h, comfortable clothes, bring ID). |
| 3 | `bento-grid` | `standard-primary` | `auto` / `auto` | **Asymmetric Storytelling — insights recipe §5.** Eyebrow "The space", title "Inside the studio." 3 tiles: (a) 3×2 image tile of main room, (b) 1×1 flat crimson tile with "Licensed by NYC DOH" text, (c) 1×1 image tile of a workstation detail. |
| 4 | `accordion` | `standard-primary` | `auto` / `auto` | Studio FAQ — 8 items with sidebar info block. Licensed?, pricing, deposits, aftercare, touch-ups, cover-ups, minors, walk-ins. |
| 5 | `map` | `standard-secondary` | `auto` / `auto` | Map with address, hours, transit/parking info blocks. |
| 6 | `action-bar` | `highlight-primary` | `auto` / `auto` | Closing CTA. |

Body highlights: 1 (action-bar). ✓ Two standard-secondary bands (#2, #5) separated by standard-primary #3, #4 — no adjacent-same-surface issue.

### 8.5 `contact.json` — Contact

| # | Widget | Color scheme | Spacing | Role |
|---|--------|--------------|---------|------|
| 1 | `split-content` | `standard-primary` | `auto` / `auto` | **Editorial opener + inquiry layout — insights recipe §5 combined with checklist.** `balance: equal`. Left: eyebrow "Inquire" + heading `5xl` "Tell us what you're thinking." + body paragraph on how inquiries are read and routed + email button. Right: sub-heading (2xl) "What to include." + 5 numbered-item blocks (which artist, size & placement, references, date window, anything else). |
| 2 | `image-callout` | `standard-secondary` | `auto` / `auto` | **"What happens next" — insights recipe §5 Credibility Builder variation.** `image_position: end`. Image of an inbox/desk detail. Content card: kicker "After you write" + heading "What happens next" + features list (3 items with `+`: a human reads every inquiry, we route it to the right artist, the artist replies with a plan and timeline). |
| 3 | `accordion` | `standard-primary` | `auto` / `auto` | 4 pre-inquiry FAQ items with sidebar info block. |

No closing CTA on Contact. Body highlights: 0. ✓

## 9. Menus

### `main-menu.json`

```json
{
  "id": "main-menu",
  "name": "Main Menu",
  "items": [
    { "label": "Home", "link": "index.html", "items": [] },
    { "label": "Artists", "link": "artists.html", "items": [] },
    { "label": "Work", "link": "work.html", "items": [] },
    { "label": "Visit", "link": "visit.html", "items": [] },
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
| `scrolling-text` | index | 1 |
| `split-content` | index (opener), artists (opener + 6 zigzag), work (opener), visit (opener), contact (opener) | 11 |
| `sliding-panels` | index | 1 |
| `masonry-gallery` | index (tight image-only), work (captioned archive) | 2 |
| `image-callout` | index (credibility), visit (session-day), contact (what-happens-next) | 3 |
| `bento-grid` | index (studio intro), visit (the space) | 2 |
| `checkerboard` | work | 1 |
| `testimonials` | artists | 1 |
| `accordion` | visit, contact | 2 |
| `map` | visit | 1 |
| `action-bar` | index, artists, work, visit | 4 |

12 widget types. **Underused widgets pulled in per generator §16 guidance for tattoo studio:** `masonry-gallery` (twice), `scrolling-text` (marquee), `sliding-panels` (artist showcase). **Widgets intentionally left out** (the "default-template" roster I kept reaching for): `image-text`, `profile-grid`, `steps`, `testimonial-hero`, `icon-card-grid`, `features-split`, `numbered-service-list`. **`split-content` used 11 times** but exclusively as insights intends — as a compositional tool (editorial openers, zigzag sequences), never as a heading-text-button CTA.

## 11. Differentiation Notes

| Axis | Inkwell | All 17 Completed Presets |
|------|---------|--------------------------|
| Palette temperature | **Cool** — bone white + ink black + crimson | All warm (beige/cream/ivory) |
| Accent hue | Deep crimson `#a01824` | Various warm hues |
| Heading font | Syne 700 (flared grotesque) | Serifs or warm grotesques |
| Body font | IBM Plex Sans | Mostly Inter / Inter Tight / Outfit / Work Sans |
| Corner style | sharp | Mostly sharp or slightly-rounded |
| Mood | Editorial-dark, subcultural | Warm, welcoming, considered, clinical |
| Opener type | Banner + transparent + dark overlay | Various |
| Signature home moves | `sliding-panels` artist showcase + `scrolling-text` crimson marquee + `bento-grid` studio intro + `image-callout` credibility | Mostly default hero/strip/image-text/profile-grid/gallery flow |
| Page composition | **Editorial/compositional** — split-content zigzag spine on Artists, checkerboard mosaic on Work, bento tiles, image-callout overlaps | Standard card-grid + image-text + steps templates |
| Content posture | Image-led + artist-led + confident-understated voice | Various |
| Page count | 5 | 5–6 |

## 12. Validation Pre-Build Check

- [x] Sitemap for industry (5 pages; no services/about separate pages).
- [x] Every page job clear (§3).
- [x] First widget on every page is standard-primary OR a fullwidth hero (banner on home).
- [x] Highlight count ≤ 2 per page body, never adjacent.
- [x] No `<br>` planned; multi-line address uses separate `<p>`.
- [x] No phone in header — IG + email + form only.
- [x] `transparent_on_hero: true` matched to banner opener (which supports transparency).
- [x] Fonts verified: Syne 700 ✓, IBM Plex Sans 400 ✓.
- [x] No image references in any template.
- [x] CTAs use `action-bar` — `split-content` used only as layout composition tool per its insights (editorial openers, zigzag sequences), never as heading + text + button CTA.
- [x] Block field types (text vs richtext vs textarea) to be checked against each schema at build.
- [x] Palette contains zero beige, sugar, or orange tones (user constraint satisfied).
- [x] Default-template widget roster (image-text, profile-grid, steps, testimonial-hero, icon-card-grid, features-split, numbered-service-list) **deliberately not used** to prevent structural reskinning of prior presets.
- [x] Widget insights consulted before planning for: `sliding-panels`, `masonry-gallery`, `scrolling-text`, `bento-grid`, `checkerboard`, `image-callout`, `image-tabs`, `video-embed`, `video-popup`, `split-content`.

---

## Next Steps

- **Review this plan.** On approval, tear down existing inkwell build and rebuild from this plan. Phase 2 (images JSON) deferred.
- Before build, verify schemas for: `sliding-panels`, `bento-grid`, `checkerboard`, `image-callout` (first use in the catalog for all four).
