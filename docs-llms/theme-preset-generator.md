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

### Action Bar: vary fullwidth

Don't default `action-bar` to `fullwidth: true` everywhere. Mix contained (`false`) and fullwidth across presets and within the same preset.

### Contact page: don't duplicate the footer

The `contact-details` widget serves nearly the same purpose as the global footer. Never place it as the last widget on the Contact page — the footer renders right below it. Instead end with a map, accordion FAQ, image-callout, testimonial, or action-bar.

### Don't use 5 pages for every preset

Some businesses need different page counts. Consider: a restaurant could have a Reservations page, a developer could have a Blog page, a hotel could have individual Room detail pages. The page structure should serve the business, not a template.

### Collapse spacing between header and background heroes

When the first widget on a page has a visible background (image, overlay, or non-standard color scheme like `highlight`), set `top_spacing: "none"` so there's no gap between the header and the hero. When two adjacent widgets both have backgrounds (e.g., hero → scrolling-text marquee), set `bottom_spacing: "none"` on the first and `top_spacing: "none"` on the second so they're seamless.

### Don't use numbered-service-list for opening hours

The `numbered-service-list` widget auto-numbers items (01, 02, 03), implying a ranked or sequential list. Opening hours are categories, not steps. Use `card-grid` instead for a few time blocks (e.g., 3 cards: Weeknight Dinner, Weekend Dinner, Sunday). Use `schedule-table` only for businesses with daily varying schedules (gyms, studios). Reserve `numbered-service-list` for things that genuinely benefit from numbering: service tiers, process steps, capabilities.

### Don't fall into widget sequence patterns

If every Home page follows banner → trust-bar → image-text → cards → testimonials → action-bar, they'll all feel identical regardless of color scheme. Vary the widget selection, order, and density per page.

### Each preset must have a unique color identity

Two restaurants or two professional services presets should NOT look like variations of the same palette. Design each color scheme from scratch, independent of industry category.

---

## 8. Differentiation Checklist

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
- [ ] Hero widget type varies across presets (banner, split-hero, slideshow, video-popup)
- [ ] Action bars mix fullwidth and contained
- [ ] Contact page doesn't duplicate the footer

**Schema Validity:**
- [ ] Every setting key exists in the corresponding widget's `schema.json`
- [ ] Every select value matches a valid `options[].value`
- [ ] Link settings use the correct `{href, text, target}` object format
- [ ] Block types match the schema's block definitions
- [ ] No widget-level settings placed inside blocks (or vice versa)
