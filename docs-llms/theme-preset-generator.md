# Theme Preset Generator Guide

Complete reference for building Arch theme presets. Every preset must showcase the theme's features through diverse, schema-valid configurations. This document defines the process, rules, and reference material for generating presets.

---

## 0. Generation Workflow

Each preset is built in three phases. All plan and image files live in `docs-llms/preset-plans/`.

### Phase 1: Plan (`{preset-id}.md`)

Write a detailed plan document covering:

- **Identity** — Name, industry, personality description (2-3 sentences establishing the brand voice)
- **preset.json settings** — Full color palette (all 18 tokens with rationale), typography (heading + body font with exact stacks/weights from `fonts.json`), style settings (`corner_style`, `spacing_density`, `button_shape`)
- **Header config** — Complete header JSON with all settings. Note what makes it distinct from other presets
- **Footer config** — Footer settings and block plan
- **Pages** — Table per page listing every widget in order: widget name, type, color scheme, and key configuration details (content, layout choices, block count, etc.)
- **Menus** — Which pages appear in `main-menu.json` and `footer-menu.json`
- **Widget usage summary** — Count of unique widget types and how many times each is used
- **Header differentiation notes** — What combination of header settings makes this preset unique

The plan file is the single source of truth — Phase 3 builds directly from it.

### Phase 2: Images (`{preset-id}-images.json`)

Write a JSON array listing every image the preset needs. Each entry:

```json
{
  "file": "home-hero.jpg",
  "width": 1920,
  "height": 1080,
  "prompt": "Description for image generation — scene, lighting, angle, mood, style direction."
}
```

Guidelines:
- Hero images are typically `1920×1080` (large) or `1920×600` (small banner heroes)
- Content images (image-text, image-callout, etc.) are typically `800×600`
- Portrait/team photos are typically `400×400`
- Gallery/masonry images vary — use aspect ratios that suit the layout (square, portrait, landscape mix)
- Prompts should be specific about scene, lighting, angle, mood, and styling. End with a photography style note (e.g., "Editorial food photography, warm tones")
- Include "No people" when appropriate, or describe people generically without names/identities
- Every image referenced in the plan must have a corresponding entry

### Phase 3: Build

Create the actual preset files from the plan:

```
themes/arch/presets/{preset-id}/
  preset.json           # Settings overrides from plan
  templates/            # Page JSON files
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

Follow the plan exactly. Validate every setting key and value against widget schemas (see Section 6).

### Progress tracking

Track preset status in `docs-llms/theme-presets-tracker.md`. Update the Status column as presets move through the phases.

---

## 1. Pre-Generation Process

Before writing any preset files, complete these steps in order:

### Step 1: Read the global settings schema

Read `themes/arch/theme.json` to know every setting that can be overridden in `preset.json`. The overridable categories are:

- **Colors** (18 tokens) — 9 standard + 9 highlight
- **Typography** — `heading_font`, `body_font` (font_picker), `heading_scale`, `body_scale` (range 80-120)
- **Style** — `corner_style`, `spacing_density`, `button_shape`

### Step 2: Read the header and footer schemas

Read `themes/arch/widgets/global/header/schema.json` and `themes/arch/widgets/global/footer/schema.json`. Plan a **unique header configuration** for each preset. The header has 15 settings — use them. See Section 4 for the full header reference.

### Step 3: Read the widget index

Consult the widget index (Section 5) to select widgets for each page. Read the `insights.md` for every widget you plan to use to pick distinct layout recipes. Read the `schema.json` for every widget you plan to use to ensure you use correct setting keys and valid values.

### Step 4: Plan page structure

Decide which pages this business needs. The standard set is 5 pages but presets can have more or fewer depending on the industry. A restaurant might need a Reservations page. A developer might have a Blog page. A hotel might have individual room pages.

### Step 5: Design the color palette from scratch

Do not start from a category template. Each preset gets a unique palette. Two restaurants can have completely different color identities — one could be deep navy + gold, another could be terracotta + cream. See Section 2.

### Step 6: Validate every setting against the schema

Before finalizing any JSON file, verify:
- Every setting key exists in the widget's `schema.json`
- Every setting value is valid for its type (select options, range bounds, correct object shapes for `link` and `font_picker` types)
- Block type names match the schema's block definitions
- Block setting keys match the block's settings in the schema

---

## 2. Color System

### Architecture

Two palettes (Standard and Highlight), each with 9 tokens. Four color schemes available to widgets:

| Scheme | Surface | Purpose |
|--------|---------|---------|
| `standard` | Light | Default — white/light background, dark text |
| `standard-accent` | Light alt | Swaps bg_primary ↔ bg_secondary for banding |
| `highlight` | Dark | Emphasis — dark background, light text |
| `highlight-accent` | Dark alt | Swaps highlight backgrounds |

### Token Reference

**Standard palette** (base defaults from `theme.json`):

| Token | Role | Default |
|-------|------|---------|
| `standard_bg_primary` | Page background | `#ffffff` |
| `standard_bg_secondary` | Alt background | `#f8fafc` |
| `standard_text_heading` | Headings | `#0f172a` |
| `standard_text_content` | Body text | `#334155` |
| `standard_text_muted` | Secondary text | `#6b7280` |
| `standard_border_color` | Borders/dividers | `#e2e8f0` |
| `standard_accent` | Buttons, links | `#0f172a` |
| `standard_accent_text` | Text on accent bg | `#ffffff` |
| `standard_rating_star` | Star fill | `#fbbf24` |

**Highlight palette** (base defaults from `theme.json`):

| Token | Role | Default |
|-------|------|---------|
| `highlight_bg_primary` | Dark background | `#0f172a` |
| `highlight_bg_secondary` | Darker alt bg | `#020617` |
| `highlight_text_heading` | Headings on dark | `#ffffff` |
| `highlight_text_content` | Body on dark | `#cbd5e1` |
| `highlight_text_muted` | Secondary on dark | `#94a3b8` |
| `highlight_border_color` | Borders on dark | `#334155` |
| `highlight_accent` | Buttons on dark | `#ffffff` |
| `highlight_accent_text` | Text on dark accent | `#0f172a` |
| `highlight_rating_star` | Stars on dark | `#fbbf24` |

### Palette Design Rules

- Every preset overrides **all 18 color tokens** for maximum distinctiveness
- No two presets share the same accent hue — even within the same industry category
- Highlight palettes should have personality — not just "generic dark navy"
- Validate WCAG AA contrast: 4.5:1 for body text, 3:1 for large text, 4.5:1 for accent_text on accent

---

## 3. Typography & Style

### Font Settings

```json
"heading_font": { "stack": "\"Playfair Display\", serif", "weight": 700 },
"body_font": { "stack": "\"Inter\", sans-serif", "weight": 400 }
```

The `stack` must exactly match a font's stack string from `src/core/config/fonts.json`. The `weight` must be one of that font's `availableWeights`.

Additional typography settings available:
- `heading_scale` — range 80-120, default 100. Scales heading sizes up or down.
- `body_scale` — range 80-120, default 100. Scales body text sizes up or down.

### Style Settings

| Setting | Values | Default | Visual effect |
|---------|--------|---------|---------------|
| `corner_style` | `sharp`, `slightly-rounded`, `rounded` | `sharp` | Border-radius on cards, images, inputs |
| `spacing_density` | `compact`, `default`, `airy` | `default` | Section padding and card spacing multiplier |
| `button_shape` | `auto`, `pill`, `sharp` | `auto` | `auto` follows corner_style; `pill` = fully rounded; `sharp` = square |

### Font Pairing Strategies

**Serif heading + Sans body** — Creates hierarchy through contrast. Most versatile.
**Sans heading + Sans body** — Modern/clean. Use different families or weight contrast.
**Display heading + Sans body** — High personality. Keep body very neutral.
**Same family, different weights** — Harmonious, minimalist.

### Font Library

250 Google Fonts + 3 system stacks available in `src/core/config/fonts.json`. Organized by category:
- **Serif** (39 fonts) — Playfair Display, Fraunces, Cormorant Garamond, Lora, Merriweather, etc.
- **Sans-serif** (171 fonts) — Inter, DM Sans, Montserrat, Poppins, Oswald, Work Sans, etc.
- **Display** (27 fonts) — Abril Fatface, Alfa Slab One, Comfortaa, Righteous, etc.
- **Monospace** (13 fonts) — Fira Code, JetBrains Mono, IBM Plex Mono, etc.

Read `fonts.json` to verify exact stack strings and available weights before using any font.

---

## 4. Header Configuration

The header is one of the most visible differentiators between presets. **Every preset must configure a distinct header.** Do not use the same header settings across presets.

### Header Settings Reference (from schema.json)

| Setting ID | Type | Default | Description |
|-----------|------|---------|-------------|
| `logoText` | text | `"Arch"` | Business name displayed as text logo. **Always set this to the preset's business name.** |
| `logoMaxWidth` | range | `150` | Logo image max width (50-300px) |
| `contactDetailsLine1` | text | `"Call us: (555) 203-9844"` | First contact line (phone, email, etc.) |
| `contactDetailsLine2` | text | `"1450 Market St, Suite 200"` | Second contact line (address, hours, etc.) |
| `contact_position` | select | `"logo"` | **Values: `"logo"` or `"menu"`**. `logo` = next to logo area, `menu` = in the navigation bar area |
| `headerNavigation` | menu | `"main-menu"` | Which menu to use for navigation |
| `center_nav` | checkbox | `false` | Centers the navigation links |
| `ctaButtonLink` | link | `{"href":"contact.html","text":"Get in touch","target":"_self"}` | CTA button — must be a link object with `href`, `text`, `target` |
| `ctaButtonStyle` | select | `"secondary"` | **Values: `"primary"` or `"secondary"`** |
| `full_width` | checkbox | `true` | Edge-to-edge header vs contained |
| `sticky` | checkbox | `false` | Header sticks on scroll |
| `transparent_on_hero` | checkbox | `false` | Header overlays the hero widget (requires hero with `supportsTransparentHeader`) |
| `color_scheme` | select | `"standard"` | **Values: `"standard"`, `"standard-accent"`, `"highlight"`, `"highlight-accent"`** |

### Header Variation Ideas

Mix these across presets:
- **Contact bar + logo**: `contact_position: "logo"`, both contact lines filled — professional services
- **Contact in nav**: `contact_position: "menu"` — puts contact info in the navigation area
- **No contact details**: Leave `contactDetailsLine1` and `contactDetailsLine2` empty — clean minimal look
- **Centered nav**: `center_nav: true` — editorial, fashion, creative feel
- **Sticky**: `sticky: true` — always-visible navigation for long pages
- **Transparent on hero**: `transparent_on_hero: true` — header overlays the hero image for immersive effect
- **Dark header**: `color_scheme: "highlight"` — bar/restaurant moody vibe
- **Primary CTA**: `ctaButtonStyle: "primary"` — bold button that stands out
- **Contained header**: `full_width: false` — header content doesn't stretch edge to edge

---

## 5. Widget Index

50 page widgets + 2 global widgets. Each has `schema.json` (exact settings/blocks reference) and `insights.md` (creative recipes) in `themes/arch/widgets/{name}/`.

**CRITICAL: Before using any widget, read its `schema.json` to get the exact setting IDs, value types, and block definitions. The `insights.md` provides creative direction but the schema is the source of truth for valid JSON.**

### Heroes & Banners
| Widget | Type | Key differentiator |
|--------|------|--------------------|
| Banner | `banner` | Full-width bg image, overlay, stacked blocks. Heights: auto/small/medium/large |
| Split Hero | `split-hero` | 50/50 image + content. Image position: left/right |
| Slideshow | `slideshow` | Rotating slides (max 5), autoplay. Per-slide color schemes |
| Video Popup | `video-popup` | Background image + play button → lightbox modal |
| Testimonial Hero | `testimonial-hero` | Split layout with portrait + quote + optional logo |

### Content & Text
| Widget | Type | Key differentiator |
|--------|------|--------------------|
| Rich Text | `rich-text` | Stacked heading/text/button. Alignment + width control |
| Split Content | `split-content` | Two-column freeform. Balance: left-heavy/equal/right-heavy. Sticky column option |
| Image | `image` | Single image, fullwidth toggle, optional link |
| Embed | `embed` | Raw HTML/iframe. Max width control |
| Scrolling Text | `scrolling-text` | Infinite marquee strip. Speed, rotation, custom colors |

### Image & Media
| Widget | Type | Key differentiator |
|--------|------|--------------------|
| Image Text | `image-text` | Side-by-side image + content blocks. Image position, text position, content_color_scheme |
| Image Callout | `image-callout` | Image with overlapping content card |
| Gallery | `gallery` | Grid or carousel. Staggered option, aspect ratio, lightbox |
| Masonry Gallery | `masonry-gallery` | Pinterest-style stagger. Titles + categories + lightbox |
| Image Tabs | `image-tabs` | Tabbed image switcher with descriptions |
| Image Hotspots | `image-hotspots` | Interactive pins on an image with tooltips |
| Video Embed | `video-embed` | YouTube/Vimeo embed. Aspect ratio options |

### Cards & Grids
| Widget | Type | Key differentiator |
|--------|------|--------------------|
| Card Grid | `card-grid` | Image cards. Grid/carousel, box/flat, columns 2-4 |
| Icon Card Grid | `icon-card-grid` | Icon-led cards. Grid/carousel, featured image mode |
| Bento Grid | `bento-grid` | Asymmetric grid with col_span/row_span per item |
| Numbered Cards | `numbered-cards` | Auto-numbered step cards. Grid/carousel |
| Checkerboard | `checkerboard` | Alternating image + text tiles in a grid |

### Lists & Data
| Widget | Type | Key differentiator |
|--------|------|--------------------|
| Priced List | `priced-list` | Name + description + price. Single/two-column. Optional thumbnails |
| Numbered Service List | `numbered-service-list` | Zero-padded numbered list with optional dividers + links |
| Icon List | `icon-list` | Icon + title + description grid. 2-8 columns |
| Logo Cloud | `logo-cloud` | Client/partner logos. Grid/carousel, grayscale hover |
| Contact Details | `contact-details` | Multi-column contact info, hours, links, social. Max 4 blocks |
| Social Icons | `social-icons` | Social media icon row from global settings |

### People
| Widget | Type | Key differentiator |
|--------|------|--------------------|
| Profile Grid | `profile-grid` | Circular photos + bio + social links. Grid/carousel |
| Team Highlight | `team-highlight` | Sticky intro sidebar + member grid. Portrait/square/auto ratio |
| Job Listing | `job-listing` | Filterable job cards with department/location/type |

### Testimonials & Trust
| Widget | Type | Key differentiator |
|--------|------|--------------------|
| Testimonials | `testimonials` | Quote cards. Grid/carousel, box/flat, star ratings |
| Testimonial Slider | `testimonial-slider` | Single-quote carousel. Autoplay, star ratings |
| Trust Bar | `trust-bar` | Horizontal icon + text strip. Dividers, icon styling |

### Process & Timeline
| Widget | Type | Key differentiator |
|--------|------|--------------------|
| Steps | `steps` | Zigzag timeline with images. Max 8 steps |
| Timeline | `timeline` | Vertical/horizontal/centered. Date + duration + features |
| Numbered Cards | `numbered-cards` | (also works as process widget) |

### Features & Showcase
| Widget | Type | Key differentiator |
|--------|------|--------------------|
| Features Split | `features-split` | Two-column: heading area + icon feature list. Optional divider |
| Sliding Panels | `sliding-panels` | Expandable panels with images. Max 6 |
| Project Showcase | `project-showcase` | Image grid with hover overlay. Aspect ratio control |

### Comparison & Pricing
| Widget | Type | Key differentiator |
|--------|------|--------------------|
| Pricing | `pricing` | Plan cards with features, price, CTA. Featured flag |
| Comparison Table | `comparison-table` | Column-based feature comparison. Yes/no → icons |
| Content Switcher | `content-switcher` | Toggle/tabs switching between card groups |
| Comparison Slider | `comparison-slider` | Before/after image slider. Horizontal/vertical |

### Interactive
| Widget | Type | Key differentiator |
|--------|------|--------------------|
| Accordion | `accordion` | Expandable items. Sidebar option for info/social blocks |
| Map | `map` | Google Maps embed + address sidebar with info blocks |
| Schedule Table | `schedule-table` | Weekly hours table. Today highlighting. Sidebar option |
| Countdown | `countdown` | Date countdown. Cards/minimal style |
| Action Bar | `action-bar` | Horizontal CTA strip. Heading + text + buttons. Max 4 blocks |
| Event List | `event-list` | Date-badge event cards with location + CTA |

### Global
| Widget | Type | Key differentiator |
|--------|------|--------------------|
| Header | `header` | See Section 4 for full reference |
| Footer | `footer` | 4-block grid: logo_text, text_block, menu_block, social_block |

---

## 6. JSON Schema Validation Rules

### Setting Types

| Schema type | JSON value format | Example |
|-------------|-------------------|---------|
| `text` | string | `"Saffron Restaurant"` |
| `textarea` | string (newlines with `\n`) | `"+ Feature 1\n+ Feature 2"` |
| `richtext` | HTML string | `"<p>Paragraph text</p>"` |
| `select` | string (must match an `options[].value`) | `"left"`, `"highlight"` |
| `checkbox` | boolean | `true`, `false` |
| `range` | number (within min/max, respecting step) | `150` |
| `color` | hex string | `"#c4540a"` |
| `image` | string (path or empty) | `""` |
| `link` | object with `href`, `text`, `target` | `{"href":"contact.html","text":"Book Now","target":"_self"}` |
| `font_picker` | object with `stack`, `weight` | `{"stack":"\"Inter\", sans-serif","weight":400}` |
| `icon` | string (icon name) | `"star"`, `"heart"`, `"calendar"` |
| `menu` | string (menu ID) | `"main-menu"` |
| `code` | string | `""` |

### Common Validation Errors to Avoid

- **Inventing setting keys.** Every key must exist as an `id` in the widget's schema.json settings or block settings. Never guess — read the schema.
- **Wrong select values.** Select fields have a fixed list of valid `options[].value` entries. E.g., `contact_position` only accepts `"logo"` or `"menu"` — not `"top"`, `"none"`, `"bottom"`.
- **Wrong link format.** Link settings require `{"href": "...", "text": "...", "target": "_self"}`, not flat strings like `"cta_link": "contact.html"`.
- **Wrong block type names.** Block types must match the `type` field in the schema's blocks array. E.g., `"plan"` not `"pricing-plan"`.
- **Block settings that belong to the widget.** Some settings exist at widget level, not block level. Check where each setting is defined in the schema.

---

## 7. Common Mistakes

### Headers must be unique per preset

The header is the first thing users see. Every preset should configure a distinct header using the full range of available settings — logo text, contact details, contact position, centered nav, CTA style, sticky behavior, transparency, color scheme, and full-width toggle. See Section 4.

### Action Bar: never use fullwidth

Always set `action-bar` to `fullwidth: false`. Never use `fullwidth: true` — it doesn't look good.

### Contact page: don't duplicate the footer

The `contact-details` widget serves nearly the same purpose as the global footer. Never place it as the last widget on the Contact page — the footer renders right below it. Instead end with a map, accordion FAQ, image-callout, testimonial, or action-bar.

### Page openers: use the right widget for the job

The first widget on a page sets the tone. Not every widget works as a page opener. Choose based on what the widget was designed to do:

**Good page openers (designed to introduce a page):**

| Widget | When to use as opener |
|--------|-----------------------|
| `banner` | Full-width hero with background image/overlay. Best with `highlight` scheme for seamless header fusion. Use `height: "small"` for inner pages, `"medium"` or `"large"` for homepages |
| `split-hero` | Image + text side by side. Strong for About/story pages with a founder photo |
| `slideshow` | Rotating hero slides. Homepage only |
| `video-popup` | Video-centric hero. Homepage or portfolio page |
| `rich-text` | Clean title + subtitle intro. Use with `highlight` scheme + `top_spacing: "none"` for a colored header band, or with `standard-secondary` for a subtle intro. Good for variety when you want to break the "every page starts with banner" pattern |

**Bad page openers (mid-page widgets, not designed to lead):**

| Widget | Why it fails as opener |
|--------|----------------------|
| `image-callout` | Overlapping card design — looks lost floating at the top with no content above it to contrast against |
| `image-text` | Side-by-side layout needs context first; works as a second or third widget |
| `features-split` | A detail widget, not an intro |
| `icon-card-grid` | A content grid, not a page header |
| `checkerboard` | Content layout, needs an intro above it |
| `contact-details` | Information widget, not a page intro |

**Critical rule for `top_spacing: "none"` on openers:** Only use `top_spacing: "none"` when the opener has a **visible contrasting background** — a `highlight` color scheme, a background image, or an overlay. Setting `top_spacing: "none"` on a `standard-primary` (white) widget does nothing visually because the header background and the widget background are the same color. It just removes padding for no reason.

### Don't use 5 pages for every preset

Some businesses need different page counts. Consider: a restaurant could have a Reservations page, a developer could have a Blog page, a hotel could have individual Room detail pages. The page structure should serve the business, not a template.

### Widget spacing: `auto`, `small`, and `none`

Every section widget supports `top_spacing` and `bottom_spacing` with three values:

| Value | Effect | When to use |
|-------|--------|-------------|
| `auto` | Full section padding (default) | Most widgets — normal content separation |
| `small` | Reduced padding, still visible | Widgets that should feel **connected** to the previous/next section but still have breathing room |
| `none` | Zero padding | Widgets that should be **fused** to an adjacent section with no gap at all |

**Rules:**

1. **Hero `top_spacing: "none"` — always.** When the first widget on a page has a visible background (image, overlay, or highlight color scheme), set `top_spacing: "none"` so there's no gap between the header and the hero.

2. **Lightweight bars after heroes → `top_spacing: "small"`.** When a compact widget like `trust-bar`, `scrolling-text`, `logo-cloud`, or `key-figures` immediately follows a hero, use `top_spacing: "small"` (not `"none"`). This keeps them visually connected to the hero without feeling crammed against it. `"none"` fuses them completely, which only looks right when both sections share the same background color.

3. **Fusing same-background sections → `"none"`.** When two adjacent widgets share the same color scheme (e.g., both `highlight-primary`), use `bottom_spacing: "none"` on the first and `top_spacing: "none"` on the second for a seamless block.

4. **Inner page banners → `bottom_spacing: "none"` or `"small"`.** Small banners on inner pages (Services, About, Contact) often look better with `bottom_spacing: "none"` or `"small"` to tighten the transition into the first content section.

5. **Don't overuse `"none"`.** If every widget has `top_spacing: "none"`, the page loses visual rhythm. Reserve `"none"` for intentional fusions. Use `"small"` when you want closeness without collision.

### Accordion: use the sidebar

The accordion widget supports `info` and `social` sidebar blocks that turn it from a single FAQ column into a 70/30 layout with contextual information beside the questions. **This feature is dramatically underused** — most presets create bare FAQ lists with no sidebar.

**When to add sidebar blocks:**
- **Contact page FAQ** — Add an `info` block with "Still Have Questions?" + phone/email/hours, and a `social` block. This is the most natural fit: users scanning FAQs who don't find their answer get an immediate escalation path right there.
- **Services page FAQ** — Add an `info` block with a booking nudge: "Ready to Book?" + phone/email. Turns a passive FAQ into a conversion opportunity.
- **About page FAQ** — Can use a lighter sidebar: a single `info` block with founding date, location, or a company fact.

**When sidebar is unnecessary:**
- Very short accordions (2-3 items) where the sidebar would dwarf the content
- Situations where a `contact-details` widget or `map` widget already sits directly above or below

**Sidebar positioning:**
- `sidebar_position: "right"` (default) — FAQ on left, info on right. Most common layout.
- `sidebar_position: "left"` — Info on left, FAQ on right. Good when the sidebar content is the primary reference (e.g., business hours/address on a contact page).

**Heading alignment:** When using a sidebar, `heading_alignment: "left"` usually looks better than `"center"` because the layout is already asymmetric.

At least **one accordion per preset** should use sidebar blocks to showcase this feature.

### Don't use numbered-service-list for opening hours

The `numbered-service-list` widget auto-numbers items (01, 02, 03), implying a ranked or sequential list. Opening hours are categories, not steps. Use `card-grid` instead for a few time blocks (e.g., 3 cards: Weeknight Dinner, Weekend Dinner, Sunday). Use `schedule-table` only for businesses with daily varying schedules (gyms, studios). Reserve `numbered-service-list` for things that genuinely benefit from numbering: service tiers, process steps, capabilities.

### Card grids: don't put buttons on every card

`icon-card-grid` and `card-grid` both support an optional `button_link` on each card block. The `button_link` field should be **omitted entirely** when cards don't need individual CTAs — not set to empty strings or placeholder hrefs.

**When to include buttons:**
- The card links to a **dedicated page** unique to that card (e.g., a property listing, a specific program page, a case study)
- There's a clear **action** tied to each card individually (e.g., "Book This Class", "Get a Quote" per service with distinct quote flows)

**When to omit buttons:**
- The cards are a **preview of a Services page** that's already in the main navigation — adding "Learn More" to each card is redundant since the whole section already communicates "here are our services" and the user can navigate via the nav bar
- The cards display **values, features, or USPs** — informational content with no individual destination
- The cards are **non-linkable content** like hours, industries served, or stats
- All buttons would point to the **same page** (e.g., 4 cards all linking to `services.html`) — a single CTA below the section is cleaner

A homepage services preview with 4 icon-card-grid cards all pointing to `services.html` with "Learn More" is noise. Either omit the buttons entirely and let the section heading/nav do the work, or add a single button on just one card or use a separate CTA section below.

### Use settings for formatting, not inline HTML

When a text block has `uppercase`, `muted`, or `size` settings, use them — don't bake the formatting into the HTML string. Write `"text": "<p>Our Process</p>"` with `"uppercase": true`, not `"text": "<p>OUR PROCESS</p>"`. The setting applies CSS text-transform; hardcoding uppercase in the content means the user can't toggle it off in the editor.

### Don't fall into widget sequence patterns

If every Home page follows banner → trust-bar → image-text → cards → testimonials → action-bar, they'll all feel identical regardless of color scheme. Vary the widget selection, order, and density per page.

### Each preset must have a unique color identity

Two restaurants or two professional services presets should NOT look like variations of the same palette. Design each color scheme from scratch, independent of industry category.

---

## 8. Widget Diversity

The Arch theme has **50 section widgets**. The point of presets is to show what the theme can do across industries. If every preset uses the same 10 widgets, the other 40 might as well not exist. This section exists to fix that.

### Current usage tiers (after 16 built presets)

**Overused — use sparingly, find alternatives:**

| Widget | Uses | Problem |
|--------|------|---------|
| `banner` | 67 | Every page starts with one. Use `split-hero`, `rich-text`, `video-popup`, `slideshow`, or `testimonial-hero` as alternatives |
| `action-bar` | 57 | Ends almost every page. Skip it sometimes — not every page needs a CTA strip. A strong final content section can close a page |
| `image-text` | 50 | Default "about" / "story" / "why us" widget. Use `split-content`, `image-callout`, `checkerboard`, or `bento-grid` instead |
| `accordion` | 22 | Every preset has 2-3. Consider whether FAQs are really needed on every page, or if a `split-content` or `features-split` could serve the same purpose |
| `testimonials` | 16 | Use `testimonial-slider` or `testimonial-hero` for variety |

**Underused — actively seek opportunities to use:**

| Widget | Uses | Natural fits |
|--------|------|-------------|
| `sliding-panels` | 2 | Room types (hotel), service categories, project details, location spotlights |
| `bento-grid` | 1 | Portfolios, feature showcases, asymmetric content layouts, agency/creative homepages |
| `content-switcher` | 2 | Residential/Commercial toggle, Individual/Business tabs, Before/After portfolio, pricing toggle |
| `checkerboard` | 2 | Service breakdowns, alternating image+text grids, magazine-style layouts |
| `image-tabs` | 2 | Multi-room/multi-service exploration, product categories, package details |
| `icon-list` | 2 | Hotel amenities, facility features, service includes, tech specs |
| `scrolling-text` | 3 | Brand energy strip, tagline marquee, announcement band — works between sections as a visual break |
| `masonry-gallery` | 2 | Photo portfolios, mixed-media galleries, tattoo work, interior design projects |
| `schedule-table` | 2 | Business hours with sidebar, clinic schedules, class timetables |
| `team-highlight` | 1 | Founder spotlight, small teams (2-4 people), leadership with sticky intro |
| `testimonial-hero` | 1 | Flagship client spotlight, founder endorsement, single powerful quote with portrait |
| `video-popup` | 1 | Hero with play button, behind-the-scenes, brand story, facility tour |
| `video-embed` | 1 | Showreel, tutorial, testimonial video, process walkthrough |
| `countdown` | 1 | Grand opening, seasonal promotion, event registration deadline |
| `event-list` | 1 | Workshops, classes, seasonal events, open houses |
| `comparison-table` | 1 | Plan comparison, service tier features, product specs |
| `pricing` | 1 | Service packages, membership tiers, lesson rates |
| `logo-cloud` | 3 | Client logos, partner badges, certifications, "as seen in" press |
| `contact-details` | 1 | Contact pages (but not as last widget — see footer duplication rule) |
| `split-content` | 5 | Two-column freeform, sticky sidebar, stats + narrative, dual features |
| `timeline` | 5 | Company history, project process, onboarding flow, event schedule |
| `split-hero` | 4 | Alternative to banner for About pages, story-driven heroes, founder intros |

**Never used — find a home for each:**

| Widget | Uses | Where it should appear |
|--------|------|----------------------|
| `image-hotspots` | 0 | Hotel room features, restaurant floor plan, product details, campus tour, salon stations |
| `numbered-service-list` | 0 | Ranked service list, capability showcase, process overview — use for services that benefit from visual numbering |
| `social-icons` | 0 | Standalone social strip on About or Contact pages, community callout section |
| `image` | 0 | Full-bleed section divider, standalone hero photo, promo banner |
| `embed` | 0 | Booking calendar embed, social feed, review widget, payment form |
| `job-listing` | 0 | Careers page for larger businesses (agency, dental practice, hotel) |
| `resource-list` | 0 | Downloads page, resource library, document center |

### Widget-to-industry mapping for remaining presets

Each remaining preset must introduce underused widgets that fit its industry. Do not default to banner + image-text + card-grid + testimonials + accordion + action-bar. Read the `insights.md` for each widget below before planning.

| Preset | Industry | Must-use underused widgets | Why |
|--------|----------|---------------------------|-----|
| **hue-and-co** | Interior Designer | `sliding-panels` (room showcases), `bento-grid` (portfolio), `image-hotspots` (design details), `masonry-gallery` (project photos) | Visual portfolio industry — needs asymmetric, image-heavy layouts |
| **framelight** | Photographer | `masonry-gallery` (portfolio — the obvious choice), `video-embed` (behind-the-scenes reel), `testimonial-hero` (client spotlight), `image` (full-bleed hero photo) | Photography demands gallery-forward design, not card grids |
| **inkwell** | Tattoo Studio | `masonry-gallery` (tattoo portfolio), `scrolling-text` (brand energy), `video-embed` (artist at work), `sliding-panels` (tattoo styles) | Edgy, visual-first — needs energy widgets, not corporate layouts |
| **pixelcraft** | Graphic Designer | `bento-grid` (portfolio showcase), `logo-cloud` (client logos), `sliding-panels` (case studies), `numbered-service-list` (capabilities) | Creative agency needs to demonstrate layout sophistication |
| **formline** | Architecture Firm | `sliding-panels` (project deep-dives), `timeline` (project phases), `bento-grid` (portfolio), `comparison-slider` (before/after) | Architecture = process + visual showcase |
| **petalry** | Flower Shop | `priced-list` (bouquet menu), `countdown` (Valentine's/Mother's Day), `event-list` (workshops), `gallery` (arrangements) | Seasonal business with priced items and events |
| **pawlish** | Pet Grooming | `priced-list` (grooming rates), `comparison-table` (grooming packages), `schedule-table` (hours), `icon-list` (services included) | Service business with clear pricing tiers and schedules |
| **torque** | Auto Repair | `numbered-service-list` (services), `pricing` (maintenance packages), `schedule-table` (shop hours), `icon-list` (specialties) | Trades business with structured service lists and pricing |
| **noteworthy** | Tutoring / Music Lessons | `pricing` (lesson packages), `schedule-table` (availability), `event-list` (recitals/exams), `content-switcher` (kids/adults) | Education with pricing tiers, schedules, and audience segments |
| **little-oaks** | Daycare / Preschool | `schedule-table` (daily routine), `event-list` (school events), `team-highlight` (teachers with sticky intro), `image-hotspots` (campus tour), `icon-list` (facilities) | Parent-facing — trust through transparency (team, schedule, facilities) |
| **tailside** | Veterinarian | `team-highlight` (vets with credentials), `schedule-table` (clinic hours), `pricing` (checkup packages), `icon-list` (services) | Medical practice with structured hours, team credibility, and service packages |
| **codebase** | Developer / Agency | `bento-grid` (portfolio), `logo-cloud` (clients), `comparison-table` (pricing tiers), `timeline` (process), `numbered-service-list` (capabilities), `embed` (GitHub/calendar) | Tech-forward — should look like it was built by developers |
| **uplink** | IT Support | `pricing` (support plans), `comparison-table` (plan comparison), `icon-list` (services), `content-switcher` (business/residential) | Service tiers and plan comparisons are the core differentiator |
| **everafter** | Wedding Planner | `timeline` (planning milestones), `masonry-gallery` (wedding photos), `testimonial-hero` (couple spotlight), `countdown` (wedding day), `event-list` (upcoming weddings/open houses) | Emotional, milestone-driven — timeline and gallery are essential |
| **hearthstone** | Hotel / B&B | `image-hotspots` (room features), `sliding-panels` (room types), `icon-list` (amenities), `schedule-table` (check-in/breakfast hours), `event-list` (local attractions) | Hospitality = rooms + amenities + local info |

### Diversity rules

1. **Each preset must use at least 2 widgets from the "underused" or "never used" lists.** Not as filler — they must serve the content naturally.

2. **No two consecutive presets should share the same homepage hero widget.** Alternate between `banner`, `split-hero`, `slideshow`, `video-popup`, `testimonial-hero`, and `rich-text` (with highlight scheme).

3. **Not every page needs an `action-bar` at the bottom.** Some pages can end with a `testimonial-slider`, `comparison-slider`, `map`, or `accordion` (with sidebar). Ending with a CTA strip is fine but shouldn't be automatic.

4. **Replace `image-text` with alternatives** at least half the time. `split-content`, `checkerboard`, `image-callout`, and `bento-grid` all serve similar purposes with different visual signatures.

5. **Use `testimonial-slider` or `testimonial-hero` instead of `testimonials`** in at least half of remaining presets. The grid testimonials widget is overrepresented.

6. **Homepage service previews don't need to be `icon-card-grid`.** Consider `sliding-panels`, `checkerboard`, `bento-grid`, `numbered-service-list`, or `image-tabs` as alternatives depending on the business type.

7. **Read the `insights.md` for every underused widget you plan to use.** The recipes there are specific and field-tested. Don't invent a layout when a proven recipe exists.

---

## 9. Differentiation Checklist

Before finalizing any preset, verify:

**Colors & Style:**
- [ ] All 18 color tokens are overridden
- [ ] Accent color is unique across all presets (no shared hue)
- [ ] Highlight palette has a distinct mood (not generic dark navy)
- [ ] Style settings (`corner_style`, `spacing_density`, `button_shape`) vary from neighboring presets
- [ ] Contrast ratios pass WCAG AA

**Typography:**
- [ ] Heading font differs from other presets in the same category
- [ ] Body font is genuinely readable at 16px
- [ ] Font stacks and weights match `fonts.json` exactly

**Header:**
- [ ] `logoText` is set to the business name
- [ ] Header configuration is distinct (contact position, CTA, sticky, transparent, color scheme, centered nav, full width)

**Pages & Widgets:**
- [ ] Page count and names fit the business (not forced into exactly 5)
- [ ] Widget selection varies — not the same sequence as other presets
- [ ] Hero widget type varies across presets (banner, split-hero, slideshow, video-popup, testimonial-hero, rich-text)
- [ ] Contact page doesn't duplicate the footer
- [ ] At least 2 widgets from the "underused" or "never used" tiers in Section 8
- [ ] Not every page ends with `action-bar` — at least one page ends differently
- [ ] At least one `accordion` uses sidebar blocks (info/social)
- [ ] Homepage services section uses something other than `icon-card-grid` if the previous preset already used it
- [ ] Card grids only have `button_link` when cards link to unique individual destinations
- [ ] Page openers match the "good openers" list — no mid-page widgets used as first section
- [ ] `top_spacing: "none"` only used on widgets with visible contrasting backgrounds
- [ ] Spacing uses all three values (`auto`, `small`, `none`) appropriately — not just `none` everywhere

**Schema Validity:**
- [ ] Every setting key exists in the corresponding widget's `schema.json`
- [ ] Every select value matches a valid `options[].value`
- [ ] Link settings use the correct `{href, text, target}` object format
- [ ] Block types match the schema's block definitions
- [ ] No widget-level settings placed inside blocks (or vice versa)
