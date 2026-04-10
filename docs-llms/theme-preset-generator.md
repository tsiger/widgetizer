# Arch Theme Preset Generator Guide

Working guide for building high-quality presets for the Arch theme.

This document exists to help generate presets that:

- feel native to Arch
- are structurally valid
- use the real widget/icon/font systems
- translate each industry into a distinct site strategy
- avoid becoming photocopies with different photos

Use this guide together with:

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

## 3. Preset Workflow

Each preset is built in three phases. All planning files live in `docs-llms/preset-plans/`.

### Phase 1: Plan

Create `docs-llms/preset-plans/{preset-id}.md`

This plan is the single source of truth. It must include:

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

## 4. Required Pre-Generation Reading

Before planning any preset, read these in order:

### 4.1 Global settings schema

Read:

- `themes/arch/theme.json`

This defines:

- 18 color tokens
- typography settings
- style settings

### 4.2 Header and footer schemas

Read:

- `themes/arch/widgets/global/header/schema.json`
- `themes/arch/widgets/global/footer/schema.json`

Every preset needs a distinct header strategy, not just different copy.

### 4.3 Exact icon list

Before choosing any icon, read:

- [arch-icons-list.txt](arch-icons-list.txt)

This file is exported from:

- `themes/arch/assets/icons.json`

Never guess icon names. If the icon is not in the list, do not use it.

### 4.4 Exact font list

Before choosing any font, read:

- [arch-fonts-list.csv](arch-fonts-list.csv)

This file is exported from:

- `src/core/config/fonts.json`

Never guess:

- font names
- stack strings
- available weights

Use exact values from the CSV.

### 4.5 Widget schemas and insights

For every widget you plan to use:

1. read its `schema.json`
2. read its `insights.md`

Schema is the source of truth for:

- setting ids
- valid values
- block types
- block setting ids

Insights should guide:

- role on page
- spacing behavior
- opener suitability
- natural adjacent widgets
- failure modes

If an insight file is weak, the schema still governs validity.

---

## 5. Industry Translation Before Widget Selection

Do not start by picking widgets.

Start by filling out this strategy frame in the plan:

### Identity frame

- **Business name**
- **Industry**
- **Brand personality**
- **Primary conversion**
- **Trust mechanism**
- **Emotional tone**
- **Image style**
- **Content density**
- **What should feel strongest on the homepage**

### Examples

Photographer:

- conversion: inquiry / availability check
- trust: portfolio quality, emotional tone, client voice
- tone: cinematic, personal, editorial
- image style: dominant

Tattoo studio:

- conversion: booking consult
- trust: artist style clarity, hygiene confidence, work examples
- tone: identity-driven, bold, subcultural
- image style: dominant but more aggressive than photography

Architecture firm:

- conversion: consultation
- trust: process rigor, built work, expertise
- tone: refined, structural, intentional
- image style: important, but process matters more than for a photographer

This step is mandatory because many industries share widgets but not **site logic**.

---

## 6. Page Purpose System

Do not force every preset into the same generic 5-page site.

Each page must have a job.

### 6.1 Sitemap rule

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

## 7. Color, Typography, And Style Rules

### 7.1 Colors

Every preset must override all 18 color tokens.

Rules:

- accent hue must feel intentional for the brand world
- highlight palette must feel intentional, not generic dark navy
- standard and highlight palettes should belong to the same brand world
- contrast must remain usable

### 7.2 Typography

Rules:

- use exact stacks from [arch-fonts-list.csv](arch-fonts-list.csv)
- use only available weights
- heading/body pairings should reinforce the industry
- do not reuse the same pairings by habit; choose them from the preset's own strategy

### 7.3 Style settings

These are part of the preset's identity:

- `corner_style`
- `spacing_density`
- `button_shape`

Do not treat them as defaults. They help separate presets even before content loads.

---

## 8. Spacing Rules

This section replaces hero-based shorthand thinking.

### 8.1 Meaning of each value

| Value | Meaning |
|-------|---------|
| `auto` | Use Arch's default vertical rhythm |
| `small` | Use reduced rhythm for tighter but still separate sections |
| `none` | Remove separation to intentionally combine adjacent widgets |

### 8.2 Core rules

1. `auto` is the default.

2. Use `small` for compact sections that do not need full spacing.
   Common fits:
   - `trust-bar`
   - `scrolling-text`
   - `logo-cloud`
   - `key-figures`
   - other lightweight bridge sections

3. Use `none` only when adjacent widgets are meant to read as one composition.
   Common fits:
   - text intro + fullwidth image
   - filled band + continuation section
   - image/media section intentionally fused to the next/previous section

4. Do not use `none` just because:
   - the widget is first on the page
   - the widget uses a highlight scheme
   - the section is a "hero"

5. On filled widgets, `none` removes internal padding from the colored band.
   This is a stronger move than simply removing external whitespace.

6. Transparent header logic is separate from spacing logic.

### 8.3 Practical test

Before using `small` or `none`, ask:

- What is this widget trying to relate to?
- Should it feel separate, close, or fused?
- Is this a plain section or a padded filled-background section?

If you cannot answer that, use `auto`.

---

## 9. Widget Selection Rules

Widgets should be chosen for page purpose and industry fit, not just variety.

### 9.1 Every chosen widget must answer:

- Why is this widget right for this page?
- Why is it right for this industry?
- What content does it unlock that another widget would not?
- What adjacent widgets does it naturally pair with?

### 9.2 Avoid defaulting to the same sequence

If multiple presets keep falling into:

- opener
- services grid
- about image-text
- testimonials
- CTA strip

then the presets are not differentiated enough.

### 9.3 Use composition patterns, not isolated widgets

Think in combinations like:

- editorial intro + fullwidth image
- proof section + gallery
- process section + pricing
- portfolio wall + soft CTA
- map + FAQ sidebar
- media section + client quote

Presets are built from section relationships, not widget inventory alone.

---

## 10. Widget Insights: What They Must Contain

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

## 11. Icons And Fonts: Non-Negotiable Rules

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

## 12. Preset Differentiation Rules

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

## 13. Arch-Specific Industry Mapping

Use underused widgets where they naturally fit the industry.

Examples:

- **Photographer**: `masonry-gallery`, `video-embed`, `testimonial-hero`, `image`
- **Tattoo Studio**: `masonry-gallery`, `scrolling-text`, `video-embed`, `sliding-panels`
- **Graphic Designer**: `bento-grid`, `logo-cloud`, `sliding-panels`, `numbered-service-list`
- **Architecture Firm**: `sliding-panels`, `timeline`, `bento-grid`, `comparison-slider`
- **Flower Shop**: `priced-list`, `countdown`, `event-list`, `gallery`

Do not use an underused widget as filler. It still has to fit the page's job.

---

## 14. Validation Rules

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

## 15. Deliverables Checklist

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

## 16. Final Principle

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
