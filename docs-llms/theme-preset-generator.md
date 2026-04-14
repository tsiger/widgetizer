# Arch Theme Preset Generator Guide

Working guide for building high-quality presets for the Arch theme.

This document exists to help generate presets that:

- feel native to Arch
- are structurally valid
- use the real widget/icon/font systems
- translate each industry into a distinct site strategy
- avoid becoming photocopies with different photos

Use this guide together with:

- [theme-preset-file-format.md](theme-preset-file-format.md) — JSON file structures for all preset files (pages, header, footer, menus, preset.json)
- [theme-design-system.md](theme-design-system.md)
- [theme-presets-tracker.md](theme-presets-tracker.md) for preset ids and status only
- `themes/arch/theme.json`
- widget `schema.json` files
- widget `insights.md` files
- [arch-icons-list.txt](arch-icons-list.txt)
- [arch-fonts-list.csv](arch-fonts-list.csv)

---

## 1. What A Preset Is

A preset is not just:

- a color palette
- a set of placeholder images
- a different sequence of widgets

A preset is an **industry translation of Arch**.

That means each preset should answer:

- What does this business need to communicate first?
- What kind of trust does this industry need?
- What should feel premium, calm, energetic, clinical, playful, or direct?
- What page types actually matter?
- What should be image-led, text-led, process-led, or conversion-led?

The goal is not "use different widgets." The goal is "make the preset feel like the right website for that industry, using Arch's system."

### 1.1 Tracker order is not design input

The preset tracker is a workflow tool.

Use it only for:

- preset id
- title
- industry label
- completion status

Do not use:

- the previous preset
- the next preset
- list position
- "neighboring" presets
- tracker order

as reasons to choose:

- opener type
- header style
- page structure
- widget sequence
- palette
- typography

Each preset must be generated from:

- this document
- Arch's design system
- widget schemas and widget insights
- the target industry's strategy and content needs

If two presets later feel too close, that is a catalog review issue to fix afterward. It is not a reason to derive one preset from another during generation.

---

## 2. Arch Mental Model

Before choosing widgets, understand the 3 systems that define Arch.

### 2.1 Surface hierarchy

Arch has 4 color schemes:

- `standard-primary`
- `standard-secondary`
- `highlight-primary`
- `highlight-secondary`

These are not just "light" and "dark."

They define **section priority** and **surface emphasis**:

- `standard-primary`: default page flow
- `standard-secondary`: softer alternate surface for banding
- `highlight-primary`: strongest emphasis surface
- `highlight-secondary`: alternate emphasis surface

Pick color schemes based on section priority, not as decoration.

### 2.2 Vertical rhythm

Every section widget supports:

- `auto`
- `small`
- `none`

These are relational spacing controls:

- `auto`: use the theme rhythm defined by Arch
- `small`: use a reduced version of that rhythm
- `none`: intentionally fuse this widget with the section above or below

Do not think in raw CSS values. Presets should think in **section relationships**, not `padding: 147px`.

### 2.3 Container behavior

This is critical.

Arch does not space every widget the same way internally.

- Standard widgets typically use margin-based vertical spacing
- Filled-background widgets use padded containers so the background fills the vertical rhythm

This means spacing overrides on a filled section do not behave the same way visually as spacing overrides on a plain section.

**Important consequence:**

- `top_spacing: "none"` on a filled widget removes top padding inside the colored band
- `bottom_spacing: "none"` on a filled widget removes bottom padding inside the colored band

So spacing choices must be made with the widget's surface behavior in mind.

### 2.4 Transparent header is a separate system

Header transparency is not part of the spacing system.

- `transparent_on_hero` is a header overlay behavior
- it only works with supported opener widgets
- it should not be used as the reason for unrelated spacing decisions

Treat:

- section rhythm
- section fusion
- header transparency

as 3 separate decisions.

---

## 3. Phase 0: Industry Strategy Brief

Do this before choosing:

- colors
- typography
- sitemap
- header pattern
- widgets
- page sequences

The goal of Phase 0 is to define the **site logic** before defining the **site expression**.

A preset should not begin with:

- "what hero should I use?"
- "what palette would look good?"
- "what pages do we usually include?"

It should begin with:

- what this business needs to communicate first
- what makes a visitor trust this business
- how the visitor is likely to decide
- what the site must prove to feel complete for this industry

If this is not clear yet, do not move on to planning.

### 3.1 Required brief

At the top of `docs-llms/preset-plans/{preset-id}.md`, write a Phase 0 brief with all of the following:

- **Business archetype**
  What kind of small business site is this structurally?
  Examples: local lead-gen service, booking-based service, portfolio-led studio, menu/catalog business, class/program business, event/venue business, listing/property business.

- **Primary conversion**
  What is the main action the site should drive?
  Examples: call, booking request, reservation, quote request, consultation, visit, signup.

- **Trust mechanism**
  What will make this business believable?
  Examples: reviews, credentials, process clarity, craftsmanship, before/after proof, atmosphere, pricing clarity, location legitimacy, portfolio quality.

- **Decision mode**
  How do customers usually choose this business?
  Examples: urgent, considered, emotional, practical, high-ticket, repeat-visit.

- **Brand personality**
  What should the site feel like?
  Examples: warm and approachable, clinical and precise, bold and edgy, refined and quiet, playful and energetic, rugged and honest.

- **Content posture**
  What should carry the site most strongly?
  Examples: image-led, text-led, process-led, offer-led, listing-led.

- **Audience model**
  Is there one audience or multiple?
  Examples: retail only, diners + event bookings, homeowners + property managers, consumers + fleet managers.

- **Required page jobs**
  What page types are necessary for this industry to feel complete and trustworthy?

- **No-go patterns**
  What should feel wrong for this industry?
  Examples: overly salesy CTA stacking, playful rounded styling, dark cinematic tone, overly corporate minimalism, too much text before proof.

- **Opener candidates**
  What kinds of page-opening moments fit this industry?
  Describe them by role first, not by widget name.
  Examples: cinematic image opener, editorial text opener, proof-first opener, offer-first opener, process-first opener.

- **Closing pattern**
  How should pages usually end?
  Examples: strong CTA, soft invitation, booking nudge, contact handoff, proof + CTA, resources.

### 3.2 Gate rules

Do not choose the sitemap until:

- business archetype
- audience model
- required page jobs

are clear.

Do not choose colors or typography until:

- brand personality
- decision mode

are clear.

Do not choose widgets until:

- trust mechanism
- content posture
- opener candidates
- closing pattern

are clear.

Do not default to a familiar 5-page structure before proving that those page jobs are right for the industry.

### 3.3 Phase 0 output format

Use this exact starter template in the plan:

```md
## Phase 0 — Industry Strategy Brief

- **Business archetype:**
- **Primary conversion:**
- **Trust mechanism:**
- **Decision mode:**
- **Brand personality:**
- **Content posture:**
- **Audience model:**
- **Required page jobs:**
- **No-go patterns:**
- **Opener candidates:**
- **Closing pattern:**
```

### 3.4 Completion test

Phase 0 is complete only if you can answer:

- Why would a customer trust this business?
- What does this site need to prove in the first fold?
- What should this site feel like — and what should it not feel like?
- What pages are actually necessary?
- What kind of opener fits this industry's decision mode?
- What should feel strongest: offer, proof, imagery, process, or atmosphere?

If those answers are still vague, do not proceed to Phase 1.

---

## 4. Preset Workflow

Each preset is built in four phases. Phase 0 is the industry strategy brief above. All planning files live in `docs-llms/preset-plans/`.

### Phase 1: Plan

Create `docs-llms/preset-plans/{preset-id}.md`

This plan is the single source of truth. It must begin with the Phase 0 brief and include:

- Identity
- Industry translation
- Sitemap rationale
- `preset.json` settings
- Header configuration
- Footer configuration
- Page strategy
- Page-by-page widget plan
- Menus
- Widget usage summary
- Differentiation notes

### Phase 2: Images

Create `docs-llms/preset-plans/{preset-id}-images.json`

Every referenced image in the plan must appear here with:

- file name
- width
- height
- prompt

### Phase 3: Build

Use [theme-preset-file-format.md](theme-preset-file-format.md) as the structural reference for all JSON files below.

Create:

```text
themes/arch/presets/{preset-id}/
  preset.json
  screenshot.png
  templates/
    index.json
    about.json
    contact.json
    ...
    global/
      header.json
      footer.json
  menus/
    main-menu.json
    footer-menu.json
```

Then update:

- `themes/arch/presets/presets.json`
- `docs-llms/theme-presets-tracker.md`

---

## 5. Required Reading

Reading is split into two stages that align with the workflow phases.

### 5.1 Before Phase 0 (system awareness)

Read these to understand what Arch offers before writing the industry strategy brief:

- `themes/arch/theme.json` — 18 color tokens, typography settings, style settings
- `themes/arch/widgets/global/header/schema.json` — header layout options
- `themes/arch/widgets/global/footer/schema.json` — footer layout options
- [arch-fonts-list.csv](arch-fonts-list.csv) — exact font stacks and available weights
- [arch-icons-list.txt](arch-icons-list.txt) — exact icon ids (exported from `themes/arch/assets/icons.json`)

This gives you the palette of tools available. You do not need to read individual widget schemas yet — Phase 0 is about site logic, not widget selection.

### 5.2 Before Phase 1 (per-widget validation)

After Phase 0 is complete and you know which widgets the preset will use, read each chosen widget's files:

1. `schema.json` — source of truth for setting ids, valid values, block types, block setting ids
2. `insights.md` — guides role on page, spacing behavior, opener suitability, natural adjacent widgets, failure modes

Do this for every widget in the plan. If an insight file is weak, the schema still governs validity.

### 5.3 Before Phase 3 (file structure)

Read [theme-preset-file-format.md](theme-preset-file-format.md) before writing any JSON files. It documents:

- page template format (widgets object, blocks object, ordering arrays)
- header and footer template format
- menu file format
- link object format
- what fields to include and what to omit (no UUIDs, no pageUuid)

### 5.4 Non-negotiable rules

Never guess:

- icon names — verify every icon against [arch-icons-list.txt](arch-icons-list.txt)
- font stacks or weights — use exact values from [arch-fonts-list.csv](arch-fonts-list.csv)

Never use `<br>` in widget text — anywhere. Not in `heading` block text, not in richtext bodies, not in footer text blocks, not in accordion answers, not in map info blocks, not in any text-bearing field. This rule is absolute.

- **Headings:** write a single line. Let the renderer wrap. If a heading is too long, rewrite it shorter — never insert `<br>` to control where it breaks.
- **Richtext:** for hours, addresses, phone + email, multi-line lists, anything that needs distinct lines — use separate `<p>` paragraphs. One line per `<p>`. Never `<br>` inside a `<p>`.
- Before finalizing any preset, grep the preset directory for `<br>` and remove every instance.

Hard-coded line breaks override the type system, look broken on different viewports, and substitute manual typesetting for a job the renderer should do.

---

## 6. Industry Translation Before Widget Selection

Do not start by picking widgets. The Phase 0 brief must be complete first.

Widget selection flows from the brief — not from habit, variety seeking, or what the previous preset used.

### Why this matters

Many industries share widgets but not **site logic**. Three examples:

Photographer:

- conversion: inquiry / availability check
- trust: portfolio quality, client voice, consistency of style
- personality: cinematic, personal, editorial
- content posture: image-led

Tattoo studio:

- conversion: booking consult
- trust: artist style clarity, hygiene confidence, work examples
- personality: identity-driven, bold, subcultural
- content posture: image-led, but more aggressive than photography

Architecture firm:

- conversion: consultation
- trust: process rigor, built work, expertise
- personality: refined, structural, intentional
- content posture: process-led (images support, but process rigor carries the site)

All three are visual businesses. All three could use galleries, image-text sections, and testimonials. But their site logic — what goes first, what earns emphasis, what the visitor needs to believe — is completely different. The Phase 0 brief is what prevents them from collapsing into the same preset with different photos.

---

## 7. Page Purpose System

Do not force every preset into the same generic 5-page site.

Each page must have a job.

### 7.1 Sitemap rule

The sitemap must be chosen to represent the industry as clearly and convincingly as possible.

The goal is to prove that Arch can serve this niche well, using the smallest set of pages that fully supports the business.

That means:

- do not default to the same 5 pages out of habit
- do not create extra pages just to appear different
- do not rename pages cosmetically without changing their job

Instead, compose the sitemap around what the business actually needs to show:

- offers
- proof
- process
- booking flow
- categories
- collections
- programs
- areas served
- FAQs
- policies
- reservations
- rooms
- artists
- property types
- case studies

Every page should earn its place.

If a page does not strengthen the industry's story, trust, or conversion flow, do not include it.

If the niche genuinely needs a specific page type to feel complete, include it even if that means not using the familiar default set.

### Common page jobs

- **Home**: establish voice, trust, and conversion direction
- **Services**: explain the offer and structure it clearly
- **Portfolio / Work**: show evidence and category breadth
- **About**: explain point of view, process, team, or story
- **Contact**: reduce friction and answer final booking questions

### Rule

Page structure should follow the industry, not a template habit.

When deciding the sitemap, ask:

- What would a real customer expect to find on this type of business site?
- What pages are necessary to prove credibility in this niche?
- What pages help the conversion path feel complete and natural?
- What page set best demonstrates Arch's range for this industry without padding the site?

If a business needs:

- rooms
- classes
- programs
- menu
- reservations
- properties
- neighborhoods
- work categories

then build those pages.

If a business does not need:

- Services
- Work
- About
- Contact

as separate pages, do not force them in just because they are common.

---

## 8. Color, Typography, And Style Rules

### 8.1 Colors

Every preset must override all 18 color tokens.

Rules:

- accent hue must feel intentional for the brand world
- highlight palette must feel intentional, not generic dark navy
- standard and highlight palettes should belong to the same brand world
- contrast must remain usable

### 8.2 Typography

Rules:

- use exact stacks from [arch-fonts-list.csv](arch-fonts-list.csv)
- use only available weights
- heading/body pairings should reinforce the industry
- do not reuse the same pairings by habit; choose them from the preset's own strategy

### 8.3 Style settings

These are part of the preset's identity:

- `corner_style`
- `spacing_density`
- `button_shape`

Do not treat them as defaults. They help separate presets even before content loads.

---

## 9. Color Scheme Composition

This section governs how the 4 color schemes are distributed across a page.

### 9.1 Surface roles

All Arch presets are light themes. The 4 surfaces have fixed roles:

- `standard-primary`: Default page surface. Most sections use this.
- `standard-secondary`: Soft alternate surface. Creates visual banding between consecutive `standard-primary` sections.
- `highlight-primary`: Dark/colored surface. Reserved for high-value content — closing CTAs, key social proof, pricing decisions.
- `highlight-secondary`: Alternate dark/colored surface. Used when a second highlight section is needed on the same page without repeating the same surface.

### 9.2 Assignment rules

1. **Default is `standard-primary`.** If there is no reason to change the surface, do not change it.

2. **`standard-secondary` is for banding.** Use it to separate long runs of `standard-primary` sections. Do not place two `standard-secondary` sections adjacent to each other. On a typical 6-8 widget page, 1-3 `standard-secondary` sections is enough.

3. **Limit highlight sections to 1-2 per page.** More than that removes their meaning. If every section is dark, none of them stand out.

4. **Never place two highlight sections adjacent to each other.** Always separate them with at least one standard surface.

5. **Assign highlight based on content value, not visual variety.** A section gets a highlight surface because its content is high-value — a testimonial that builds trust, a CTA that drives the primary conversion, a pricing table that needs to feel decisive. Do not assign highlight just to "break up the page" or "add contrast."

6. **Some widget types rarely justify highlight treatment.** Utility and support widgets — accordion, map, schedule-table, contact-details, embed, social-icons — carry functional content, not persuasion content. They almost always belong on standard surfaces.

### 9.3 `highlight-primary` vs `highlight-secondary`

If a page has one highlight section, use `highlight-primary`. If it has two, use both variants. `highlight-primary` typically carries the higher-value content.

### 9.4 Cross-page consistency

The highlight surfaces should mean the same thing across the site. If `highlight-primary` is the CTA surface on the homepage, use it for the same role on inner pages. Do not reuse it for unrelated purposes — the visitor should develop an intuitive sense of what each surface signals.

### 9.5 Planning sequence

Assign color schemes after the widget sequence is decided:

1. Choose widgets and order based on page purpose
2. Identify which 1-2 sections carry the highest-value content
3. Assign highlight surfaces to those
4. Identify where `standard-secondary` banding would prevent long monotone runs
5. Everything else stays `standard-primary`

---

## 10. Spacing Overrides

Widget spacing is not a per-widget design decision. It is a global system with rare per-widget exceptions.

### 10.1 The global system

The `spacing_density` setting in `theme.json` controls the vertical rhythm for the entire site:

- `compact`: Tighter overall spacing
- `default`: Standard Arch rhythm
- `airy`: More generous spacing

This is a Tier 1 preset identity decision. Choose it once and let it govern the whole site.

### 10.2 Individual widget spacing is an override, not a choice

Every widget's `top_spacing` and `bottom_spacing` should be `auto` unless there is a specific reason to override.

`auto` means: "use whatever the global `spacing_density` dictates." This is correct for the vast majority of widgets.

### 10.3 When to use `small`

Use `small` on widgets that are lightweight bridge elements — they carry less content and feel better with reduced gaps above and below. This is a **widget-type decision**, not a per-instance decision. If a trust-bar should use `small` spacing, it should use `small` spacing in every preset, not just when someone feels like the page is too spread out.

Common `small` candidates:
- `trust-bar`
- `scrolling-text`
- `logo-cloud`
- `key-figures` (when used as a compact stat strip)

### 10.4 When to use `none`

Use `none` only when two adjacent widgets are meant to read as a single fused composition. Common cases:
- A full-width image fused to the section below it
- Two filled sections that share the same visual band
- A split-content zigzag sequence where multiple instances chain together

`none` on a filled/highlighted widget removes its internal padding, not just external whitespace. This is a stronger visual move — use it deliberately.

### 10.5 What not to do

- Do not vary spacing widget-by-widget to "fine-tune" a page. That produces inconsistent rhythm across pages.
- Do not use `small` or `none` on the first widget of a page just because it is the opener.
- Do not use spacing overrides as a substitute for choosing the right `spacing_density` globally.
- Transparent header logic is separate from spacing logic.

---

## 11. Image Strategy

Images are not decoration. They are the single strongest signal of whether a preset feels like a real business or a template.

### 11.1 Relationship to Phase 0

Image decisions flow directly from the industry strategy brief:

- **Brand personality** governs mood, lighting, and color temperature. A warm and approachable bakery needs soft natural light. A bold tattoo studio needs high-contrast, moody shots. A clinical dental practice needs bright, clean, professional imagery.
- **Content posture** governs image density. An image-led preset (photographer, interior designer) needs more images and higher visual quality than a process-led preset (accountant, cleaning company) where text and structure carry the site.
- **No-go patterns** apply to images too. If the brief says "not overly corporate," the images should not look like stock photos of people in suits shaking hands.

### 11.2 Style consistency

Every image in a preset must feel like it belongs to the same business. Establish a dominant visual family and stay within it:

- **Color temperature.** Choose a dominant temperature — warm, cool, or neutral — and keep most images there. Controlled variation is fine (a cool-toned exterior among warm interiors), but the overall set should read as one palette, not a random mix.
- **Lighting style.** Pick a primary lighting approach — natural light, studio-lit, or moody ambient — and use it for the majority of images. An occasional shift (e.g., one evening exterior in a mostly daylit set) is acceptable if it serves the content.
- **Subject treatment.** If food shots are overhead flat-lays, keep them all overhead. If portraits are environmental, keep them all environmental. This consistency matters more than lighting or temperature because it is the most visible to visitors.
- **Environment.** If the space looks modern, every interior shot should feel modern. One rustic image in an otherwise contemporary set breaks the illusion.

The goal is a coherent visual identity, not literal sameness. A restaurant preset might use warm daylight for food shots and warm evening light for ambiance shots — that is controlled variation within a family. What breaks coherence is mixing unrelated styles without reason.

### 11.3 What different widgets expect

Not every widget uses images the same way. This table covers the most common cases — for any widget not listed, check its `insights.md` for image guidance.

| Widget type | Image role | Guidance |
|---|---|---|
| Hero widgets (banner, split-hero, slideshow, video-popup) | Full-bleed or half-screen, first impression | Highest quality. Must set the mood immediately. Landscape orientation, generous resolution. |
| Image-text, image-callout, image-tabs | Supporting visual paired with text | Should illustrate the adjacent content specifically, not just look nice. Landscape or slightly wide. |
| Image widget (standalone) | Full-width editorial or atmospheric image | High quality, cinematic. Treated as a visual break or statement moment on the page. Not the same as inline image blocks inside other widgets. |
| Gallery, masonry-gallery, project-showcase | Portfolio / collection display | Need variety within consistency — different subjects but same photographic style. Mix of landscape and portrait is fine for masonry. |
| Profile-grid, team-highlight | Headshots or environmental portraits | Consistent framing, consistent background treatment. All studio or all on-location — not mixed. |
| Card-grid, bento-grid, sliding-panels | Card-level imagery | Smaller display size, so subjects should be simple and readable at thumbnail scale. Avoid busy compositions. |
| Checkerboard, content-switcher | Alternating image/content cards | Similar to card-level imagery but displayed larger. Subjects should be distinct per card while sharing the same photographic style. |
| Steps, resource-list | Optional per-item images | Not every item needs an image. When used, keep them simple and consistent — icons or small photos, not hero-quality shots. |
| Image-hotspots | Base photo with overlay pins | One high-quality image that is clear enough to read with pins on top. Avoid busy or dark images that compete with the hotspot markers. |
| Comparison-slider | Matched before/after pair | Two images with identical framing, angle, and lighting conditions. The only difference should be the subject matter (before vs after). |
| Split-content | Inline column images | Smaller, intentional placements. Accent images (details, textures, close-ups) work better than full scenes. |
| Icon-card-grid, features-split, trust-bar | No images (icons instead) | Do not generate images for these widgets. |

### 11.4 Dimensions

Use dimensions that match how the widget renders:

- **Hero / full-bleed (banner, slideshow, video-popup)**: 1920×1080 or 1920×960 (16:9 or wider)
- **Standalone image widget**: 1920×1080 (16:9) for full-width; 1200×800 (3:2) if contained
- **Split-hero / image-text (half-width)**: 960×1080 or 960×720 (portrait or 4:3)
- **Gallery / portfolio items**: 1200×800 (3:2 landscape) or 800×1200 (2:3 portrait for masonry)
- **Card images (card-grid, checkerboard, content-switcher)**: 800×600 (4:3)
- **Headshots**: 800×800 (square) or 800×1000 (slight portrait)
- **Slideshow slides**: 1920×1080 (16:9)
- **Image-hotspots base image**: 1920×1080 (16:9 landscape, needs room for pins)
- **Comparison-slider pair**: 1200×800 each (identical dimensions, 3:2)
- **Inline column images (split-content image block)**: 600×400 or smaller

These are starting points. The exact crop depends on the widget's aspect ratio settings if available.

### 11.5 Image count

A typical 4-6 page preset needs roughly:

- 2-4 hero/opener images
- 4-8 section-level images (image-text, callouts, tabs)
- 6-12 gallery/portfolio images (if applicable)
- 3-6 headshots (if team/profile widgets are used)
- 2-4 accent/detail images

Total range: **15-30 images** for a full preset. Image-led presets (photographer, restaurant, interior designer) will be at the high end. Text/process-led presets (accountant, lawyer, cleaning company) will be at the low end.

### 11.6 Prompt writing

Every image prompt in `{preset-id}-images.json` should specify:

1. **Subject** — what is in the image
2. **Setting** — where it is (environment, location type)
3. **Mood/lighting** — consistent with the preset's brand personality
4. **Composition** — framing, angle, depth of field
5. **What to avoid** — anything that contradicts the preset's no-go patterns

Bad prompt: "restaurant interior"

Good prompt: "Modern Mediterranean restaurant interior, warm evening lighting, marble-topped tables with linen napkins, olive branch centerpieces, shot from a low angle across the dining room showing depth, soft bokeh on background diners, warm color temperature, no visible logos or text"

---

## 12. Widget Selection Rules

Widgets should be chosen for page purpose and industry fit, not just variety.

### 12.1 Every chosen widget must answer:

- Why is this widget right for this page?
- Why is it right for this industry?
- What content does it unlock that another widget would not?
- What adjacent widgets does it naturally pair with?

### 12.2 Avoid defaulting to the same sequence

If multiple presets keep falling into:

- opener
- services grid
- about image-text
- testimonials
- CTA strip

then the presets are not differentiated enough.

### 12.3 Use composition patterns, not isolated widgets

Think in combinations like:

- editorial intro + fullwidth image
- proof section + gallery
- process section + pricing
- portfolio wall + soft CTA
- map + FAQ sidebar
- media section + client quote

Presets are built from section relationships, not widget inventory alone.

---

## 13. Widget Insights: What They Must Contain

Each widget `insights.md` should eventually answer these questions clearly:

- **Role on page**
- **Best used for**
- **Usually bad for**
- **Opener suitability**
- **Spacing behavior**
- **Natural adjacent widgets**
- **Industry fits**
- **Common failure modes**
- **Replacement patterns**

For preset generation, prioritize widgets whose insights explain:

- what kind of opener they make
- how they interact with adjacent sections
- what content burden they require

If a widget insight file does not explain this well, improve the insight file.

---

## 14. Icons And Fonts: Non-Negotiable Rules

### Icons

Use only icon ids listed in:

- [arch-icons-list.txt](arch-icons-list.txt)

Rules:

- never guess icon names
- never assume common names like `quote`, `rocket`, `briefcase`, etc. exist
- verify every icon before writing JSON

### Fonts

Use only font stacks and weights listed in:

- [arch-fonts-list.csv](arch-fonts-list.csv)

Rules:

- never guess stack strings
- never guess weights
- use exact values from the CSV

---

## 15. Preset Differentiation Rules

Each preset must be distinct in more than color.

Track and vary:

- homepage opener type
- homepage composition pattern
- services-section pattern
- proof pattern
- closing pattern
- header pattern
- accent family
- font pairing family

Choose these from the preset's own identity and industry strategy.

Do not choose them by reacting to:

- the previous preset
- the next preset
- nearby tracker entries
- what was just generated in the last run

### Anti-photocopy rule

Different photos alone do not make a different preset.

Use the design axes above to make the preset internally specific and intentional.

If a later catalog review finds two presets converging too much, revise the weaker one after that review. Do not use list order or "neighboring preset" logic during initial generation.

---

## 16. Arch-Specific Industry Mapping

Use underused widgets where they naturally fit the industry.

Examples:

- **Photographer**: `masonry-gallery`, `video-embed`, `testimonial-hero`, `image`
- **Tattoo Studio**: `masonry-gallery`, `scrolling-text`, `video-embed`, `sliding-panels`
- **Graphic Designer**: `bento-grid`, `logo-cloud`, `sliding-panels`, `numbered-service-list`
- **Architecture Firm**: `sliding-panels`, `timeline`, `bento-grid`, `comparison-slider`
- **Flower Shop**: `priced-list`, `countdown`, `event-list`, `gallery`

Do not use an underused widget as filler. It still has to fit the page's job.

---

## 17. Validation Rules

Before finalizing any preset, verify all of the following.

### Design validation

- [ ] The preset feels like the target industry, not a generic business site
- [ ] The sitemap fits the industry instead of defaulting to a habitual page set
- [ ] Every page has a clear job and earns its place
- [ ] The homepage communicates the business clearly in the first fold
- [ ] Trust is built using the right mechanism for the industry
- [ ] The preset uses Arch's surface hierarchy intentionally
- [ ] The preset uses Arch's spacing system relationally, not mechanically

### Differentiation validation

- [ ] The preset is not a generic reuse pattern with different images
- [ ] The opener type follows the industry strategy and page purpose
- [ ] The section flow is meaningfully distinct within the preset's own logic
- [ ] Header strategy is chosen intentionally for this preset
- [ ] Typography and palette feel distinct and industry-appropriate

### Spacing validation

- [ ] `auto` is used by default
- [ ] Every `small` is justified by section compactness
- [ ] Every `none` is justified by intentional widget fusion
- [ ] Filled/background sections using `none` still look balanced
- [ ] Transparent header decisions are not being confused with spacing decisions

### Widget validation

- [ ] Every widget fits the page purpose
- [ ] At least 2 underused widgets are used naturally when appropriate
- [ ] At least one accordion uses sidebar blocks when accordion appears
- [ ] Card grids only use per-card buttons when cards truly need unique destinations

### Schema validation

- [ ] Every setting key exists in the widget schema
- [ ] Every select value is valid
- [ ] Every link uses `{ href, text, target }`
- [ ] Every block type name is valid
- [ ] Icons are verified against [arch-icons-list.txt](arch-icons-list.txt)
- [ ] Fonts are verified against [arch-fonts-list.csv](arch-fonts-list.csv)

---

## 18. Deliverables Checklist

For every preset, deliver:

- `docs-llms/preset-plans/{preset-id}.md`
- `docs-llms/preset-plans/{preset-id}-images.json`
- `themes/arch/presets/{preset-id}/preset.json`
- `themes/arch/presets/{preset-id}/screenshot.png`
- `themes/arch/presets/{preset-id}/templates/...`
- `themes/arch/presets/{preset-id}/menus/...`
- registry update in `themes/arch/presets/presets.json`
- status update in `docs-llms/theme-presets-tracker.md`

---

## 19. Final Principle

Arch presets should feel like:

- one coherent visual system
- translated into different industries
- with different trust patterns, page structures, rhythms, and proof strategies

They should not feel like:

- one template with swapped images
- one widget sequence in different colors
- one business site wearing different costumes

When in doubt:

- return to industry translation
- return to Arch's surface and rhythm systems
- verify against real icons and real fonts
- choose composition deliberately
