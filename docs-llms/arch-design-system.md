# Arch Theme Design System

> **Complete reference for the Arch theme's visual design language, CSS custom properties, layout system, component patterns, and modifiers**

The Arch theme is the default Widgetizer theme. It provides a comprehensive, token-driven design system built entirely on CSS custom properties. Every visual decision — colors, spacing, typography, sizing — flows through a centralized set of design tokens defined in `base.css`, with user-customizable values injected at runtime from `theme.json` via the `{% theme_settings %}` Liquid tag.

For widget authoring patterns, see [theming-widgets.md](theming-widgets.md). For setting types reference, see [theming-setting-types.md](theming-setting-types.md).

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [CSS Custom Properties (Design Tokens)](#css-custom-properties-design-tokens)
3. [Color System](#color-system)
4. [Typography System](#typography-system)
5. [Spacing System](#spacing-system)
6. [Layout System](#layout-system)
7. [Grid System](#grid-system)
8. [Component Patterns](#component-patterns)
9. [Block System](#block-system)
10. [Global Components](#global-components)
11. [Utility Classes](#utility-classes)
12. [Scroll Reveal Animations](#scroll-reveal-animations)
13. [Responsive Breakpoints](#responsive-breakpoints)
14. [CSS Variable Pipeline](#css-variable-pipeline)
15. [Widget Template Conventions](#widget-template-conventions)

---

## Architecture Overview

### File Structure

```
themes/arch/
├── theme.json          # Theme manifest: metadata + global settings schema
├── layout.liquid       # Master HTML template (loads all assets)
├── assets/
│   ├── base.css        # Design system: tokens, resets, components, utilities
│   ├── scripts.js      # Core JS (header, navigation)
│   └── reveal.js       # Scroll reveal animation engine
├── widgets/            # 43 widget components
│   ├── accordion/
│   ├── banner/
│   ├── card-grid/
│   ├── ...
│   └── global/         # Header + Footer (appear on every page)
│       ├── header/
│       └── footer/
├── snippets/           # Reusable Liquid partials (e.g., icon rendering)
├── templates/          # Page template definitions
└── menus/              # Navigation menu JSON files
```

### Asset Loading Order

Defined in `layout.liquid`, assets load in this sequence:

1. `{% seo %}` — Meta tags
2. `{% fonts %}` — Google/Bunny font stylesheets
3. `{% theme_settings %}` — Generates `<style id="theme-settings-styles">` with `:root` CSS variables from `theme.json` user values
4. `{% asset src: "base.css" %}` — The design system stylesheet
5. Reveal animation override (if animations disabled): `.reveal { opacity: 1 !important; transform: none !important; }`
6. `{% custom_css %}` — User's custom CSS
7. `{% custom_head_scripts %}` — User's head scripts
8. `{% header_assets %}` — Widget-enqueued CSS/JS
9. Page content (header, main, footer)
10. `{% asset src: "scripts.js", defer: true %}` — Core JS
11. `{% asset src: "reveal.js", defer: true %}` — Reveal animations (conditional)
12. `{% footer_assets %}` — Widget-enqueued footer assets
13. `{% custom_footer_scripts %}` — User's footer scripts

This order ensures that theme settings CSS variables are available before `base.css` reads them, and that user customizations cascade last.

### Unit System

The theme uses a `62.5%` base font size on `<html>`, making `1rem = 10px`. This means `0.1rem = 1px`, enabling clean rem values throughout:

```css
html { font-size: 62.5%; }
/* Now: 1.6rem = 16px, 2.4rem = 24px, etc. */
```

---

## CSS Custom Properties (Design Tokens)

All tokens are defined on `:root` in `base.css`. They fall into two categories:

1. **Static tokens** — Fixed values defined directly in `base.css`
2. **Dynamic tokens** — Values that reference `--colors-*` or `--typography-*` variables injected by `{% theme_settings %}` from user configuration, with hardcoded fallbacks

### Complete Token Reference

#### Typography Scale

| Token | Value | Pixels |
|---|---|---|
| `--font-size-xs` | `1.2rem` | 12px |
| `--font-size-sm` | `1.4rem` | 14px |
| `--font-size-base` | `1.6rem` | 16px |
| `--font-size-lg` | `1.8rem` | 18px |
| `--font-size-xl` | `2rem` | 20px |
| `--font-size-2xl` | `2.4rem` | 24px |
| `--font-size-3xl` | `2.8rem` | 28px |
| `--font-size-4xl` | `3.2rem` | 32px |
| `--font-size-5xl` | `3.6rem` | 36px |
| `--font-size-6xl` | `4rem` | 40px |

#### Line Heights

| Token | Value |
|---|---|
| `--line-height-tight` | `1.2` |
| `--line-height-normal` | `1.5` |
| `--line-height-relaxed` | `1.6` |

#### Font Weights

| Token | Value |
|---|---|
| `--font-weight-medium` | `500` |
| `--font-weight-semibold` | `600` |

These are static utilities. Actual heading/body weights come from the dynamic typography variables (see [Typography System](#typography-system)).

#### Spacing Scale

| Token | Value | Pixels |
|---|---|---|
| `--space-xs` | `0.8rem` | 8px |
| `--space-sm` | `1.2rem` | 12px |
| `--space-md` | `1.6rem` | 16px |
| `--space-lg` | `2.4rem` | 24px |
| `--space-xl` | `3.2rem` | 32px |
| `--space-2xl` | `4rem` | 40px |
| `--space-3xl` | `4.8rem` | 48px |
| `--space-4xl` | `6.4rem` | 64px |
| `--space-5xl` | `8rem` | 80px |
| `--space-6xl` | `9.6rem` | 96px |

#### Section Spacing

| Token | Default | @750px | @990px |
|---|---|---|---|
| `--section-padding-block` | `var(--space-4xl)` (64px) | `var(--space-5xl)` (80px) | `var(--space-6xl)` (96px) |
| `--section-padding-inline` | `var(--space-lg)` (24px) | — | — |

Section spacing scales automatically via nested media queries inside `:root`.

#### Container & Content Widths

| Token | Value | Pixels | Purpose |
|---|---|---|---|
| `--container-max-width` | `142rem` | 1420px | Outer container limit |
| `--content-width-xs` | `40rem` | 400px | Schedules, narrow forms |
| `--content-width-sm` | `60rem` | 600px | Forms, modals |
| `--content-width-md` | `80rem` | 800px | Text-heavy sections |
| `--content-width-lg` | `90rem` | 900px | Comfortable reading |

#### Border Tokens

| Token | Value | Pixels |
|---|---|---|
| `--border-width-thin` | `0.1rem` | 1px |
| `--border-width-medium` | `0.2rem` | 2px |
| `--border-width-thick` | `0.3rem` | 3px |

#### Color Tokens (Dynamic)

These reference the runtime-injected `--colors-*` variables from theme settings, with fallbacks:

| Token | Source | Fallback |
|---|---|---|
| `--text-content` | `var(--colors-standard_text_content)` | `#333` |
| `--text-heading` | `var(--colors-standard_text_heading)` | `#000` |
| `--text-muted` | `var(--colors-standard_text_muted)` | `#666` |
| `--bg-primary` | `var(--colors-standard_bg_primary)` | `#fff` |
| `--bg-secondary` | `var(--colors-standard_bg_secondary)` | `#f9f9f9` |
| `--accent` | `var(--colors-standard_accent)` | `#0d47b7` |
| `--accent-text` | `var(--colors-standard_accent_text)` | `#fff` |
| `--rating-star-color` | `var(--colors-standard_rating_star)` | `#fbbf24` |
| `--border-color` | `var(--colors-standard_border_color)` | `#e0e0e0` |
| `--color-white` | `#ffffff` | (static) |
| `--color-black` | `#000000` | (static) |

#### Icon Sizes

| Token | Value | Pixels |
|---|---|---|
| `--icon-size-xs` | `1.6rem` | 16px |
| `--icon-size-sm` | `2rem` | 20px |
| `--icon-size-md` | `2.4rem` | 24px |
| `--icon-size-lg` | `3.2rem` | 32px |
| `--icon-size-xl` | `4.8rem` | 48px |

#### Transition Speeds

| Token | Value |
|---|---|
| `--transition-speed-fast` | `0.15s` |
| `--transition-speed-normal` | `0.3s` |
| `--transition-speed-slow` | `0.5s` |

#### Widget Background System

Default values for widget background control (overridden inline per-widget):

| Token | Default |
|---|---|
| `--widget-bg-color` | `transparent` |
| `--widget-bg-size` | `cover` |
| `--widget-bg-position` | `center` |
| `--widget-bg-repeat` | `no-repeat` |
| `--widget-bg-attachment` | `scroll` |
| `--widget-overlay-color` | `transparent` |
| `--widget-overlay-opacity` | `0.5` |

---

## Color System

### Two Color Schemes

The Arch theme ships with two color schemes: **Standard** (light) and **Highlight** (dark/emphasis). These are activated by CSS classes that remap the shorthand color tokens to point at different source variables.

#### Standard Color Scheme (`.color-scheme-standard`)

Remaps all shorthand tokens to `--colors-standard_*` variables:

```css
.color-scheme-standard {
  --text-heading: var(--colors-standard_text_heading, #0f172a);
  --text-content: var(--colors-standard_text_content, #1f2937);
  --text-muted:   var(--colors-standard_text_muted, #6b7280);
  --border-color: var(--colors-standard_border_color, #e2e8f0);
  --bg-primary:   var(--colors-standard_bg_primary, #ffffff);
  --bg-secondary: var(--colors-standard_bg_secondary, #f1f5f9);
  --accent:       var(--colors-standard_accent, #1e3a8a);
  --accent-text:  var(--colors-standard_accent_text, #ffffff);
  --rating-star-color: var(--colors-standard_rating_star, #fbbf24);
}
```

#### Highlight Color Scheme (`.color-scheme-highlight`)

Remaps all shorthand tokens to `--colors-highlight_*` variables:

```css
.color-scheme-highlight {
  --text-heading: var(--colors-highlight_text_heading, #ffffff);
  --text-content: var(--colors-highlight_text_content, #eaf3fc);
  --text-muted:   var(--colors-highlight_text_muted, #64748b);
  --border-color: var(--colors-highlight_border_color, #526884);
  --bg-primary:   var(--colors-highlight_bg_primary, #233c54);
  --bg-secondary: var(--colors-highlight_bg_secondary, #152a3e);
  --accent:       var(--colors-highlight_accent, #de1877);
  --accent-text:  var(--colors-highlight_accent_text, #ffffff);
  --rating-star-color: var(--colors-highlight_rating_star, #fbbf24);
}
```

#### How Color Schemes Work

Every widget applies a color scheme class on its root element. All child elements use the shorthand tokens (`--text-content`, `--bg-primary`, etc.) which resolve to different values depending on which scheme class is active:

```liquid
<section class="widget color-scheme-{{ widget.settings.color_scheme }}">
  <!-- All children inherit the remapped tokens -->
</section>
```

When a widget uses the `highlight` scheme, it also sets its background:

```liquid
{% if widget.settings.color_scheme == 'highlight' %}
  style="--widget-bg-color: var(--bg-primary);"
{% endif %}
```

#### Default Color Palette (theme.json)

**Standard scheme defaults:**

| Setting ID | Label | Default |
|---|---|---|
| `standard_bg_primary` | Primary Background | `#ffffff` |
| `standard_bg_secondary` | Secondary Background | `#f1f5f9` |
| `standard_text_content` | Content Text | `#1f2937` |
| `standard_text_heading` | Heading Text | `#0f172a` |
| `standard_text_muted` | Muted Text | `#6b7280` |
| `standard_border_color` | Border Color | `#e2e8f0` |
| `standard_accent` | Accent Color | `#DE1877` |
| `standard_accent_text` | Accent Text Color | `#ffffff` |
| `standard_rating_star` | Rating Star Color | `#fbbf24` |

**Highlight scheme defaults:**

| Setting ID | Label | Default |
|---|---|---|
| `highlight_bg_primary` | Primary Background | `#233c54` |
| `highlight_bg_secondary` | Secondary Background | `#152a3e` |
| `highlight_text_content` | Content Text | `#eaf3fc` |
| `highlight_text_heading` | Heading Text | `#ffffff` |
| `highlight_text_muted` | Muted Text | `#64748b` |
| `highlight_border_color` | Border Color | `#526884` |
| `highlight_accent` | Accent Color | `#DE1877` |
| `highlight_accent_text` | Accent Text Color | `#ffffff` |
| `highlight_rating_star` | Rating Star Color | `#fbbf24` |

All 18 color settings have `"outputAsCssVar": true`, which causes the `{% theme_settings %}` tag to generate `--colors-{id}` CSS variables on `:root`.

---

## Typography System

### Font Configuration

Fonts are configured in `theme.json` via `font_picker` settings:

| Setting ID | Label | Default Stack | Default Weight |
|---|---|---|---|
| `heading_font` | Heading Font | `"Fraunces", serif` | 600 |
| `body_font` | Body Font | `"Inter", sans-serif` | 400 |

The `{% theme_settings %}` tag generates these CSS variables:

```css
:root {
  --typography-heading_font-family: "Fraunces", serif;
  --typography-heading_font-weight: 600;
  --typography-body_font-family: "Inter", sans-serif;
  --typography-body_font-weight: 400;
  --typography-body_font_bold-weight: 700; /* Smart bold calculation */
}
```

#### Smart Bold Weight

For `body_font` when the base weight is 400, the system looks up the font in `fonts.json` and finds the best available bold weight (preferring 700 > 600 > 500). This value becomes `--typography-body_font_bold-weight` and is used by `<strong>` and `<b>` elements.

### Base Typography Styles

```css
body {
  font-family: var(--typography-body_font-family, ...system-stack...);
  font-weight: var(--typography-body_font-weight, 400);
  font-size: var(--font-size-base);     /* 16px */
  line-height: var(--line-height-normal); /* 1.5 */
  color: var(--text-content);
}

strong, b {
  font-weight: var(--typography-body_font_bold-weight, 700);
}

h1-h6 {
  font-family: var(--typography-heading_font-family, inherit);
  font-weight: var(--typography-heading_font-weight, 700);
  color: var(--text-heading);
  line-height: var(--line-height-tight); /* 1.2 */
}
```

#### Heading Size Scale

| Element | Token | Size |
|---|---|---|
| `h1` | `--font-size-5xl` | 36px |
| `h2` | `--font-size-4xl` | 32px |
| `h3` | `--font-size-3xl` | 28px |
| `h4` | `--font-size-2xl` | 24px |
| `h5` | `--font-size-xl` | 20px |
| `h6` | `--font-size-lg` | 18px |

### Widget Text Classes

Semantic text classes for use in widget templates:

| Class | Purpose | Styles |
|---|---|---|
| `.widget-headline` | Section titles | Semantic hook, no default styles |
| `.widget-title` | Card/item titles | Semantic hook, no default styles |
| `.widget-subtitle` | Subtitles | Semantic hook, no default styles |
| `.widget-text` / `.widget-description` | Body text | `color: var(--text-content)` |
| `.widget-text-large` | Large text | `font-size: var(--font-size-lg)` |
| `.widget-text-small` | Small text | `font-size: var(--font-size-sm)` |
| `.widget-meta` | Metadata text | `font-size: sm`, `color: --text-muted` |
| `.widget-eyebrow` | Labels above headlines | `sm`, `bold`, `uppercase`, `0.05em tracking`, `--text-muted` |

### Block Text Classes

Composable text utility classes used within widget blocks:

#### Base

| Class | Effect |
|---|---|
| `.block-text` | Reset margins, set `line-height: relaxed`, `color: --text-content` |

#### Size Modifiers

| Class | Font Size Token |
|---|---|
| `.block-text-xs` | `--font-size-xs` (12px) |
| `.block-text-sm` | `--font-size-sm` (14px) |
| `.block-text-base` | `--font-size-base` (16px) |
| `.block-text-lg` | `--font-size-lg` (18px) |
| `.block-text-xl` | `--font-size-xl` (20px) |
| `.block-text-2xl` | `--font-size-2xl` (24px) |
| `.block-text-3xl` | `--font-size-3xl` (28px) |
| `.block-text-4xl` | `--font-size-4xl` (32px) |
| `.block-text-5xl` | `--font-size-5xl` (36px) |

Sizes 2xl and above also set `line-height: var(--line-height-tight)`.

#### Weight Modifiers

| Class | Weight Source |
|---|---|
| `.block-text-normal` | `var(--typography-body_font-weight, 400)` |
| `.block-text-medium` | `var(--font-weight-medium)` (500) |
| `.block-text-semibold` | `var(--font-weight-semibold)` (600) |
| `.block-text-heading-weight` | `var(--typography-heading_font-weight, 700)` |
| `.block-text-body-weight` | `var(--typography-body_font_weight, 400)` |
| `.block-text-body-bold` | `var(--typography-body_font_bold-weight, 700)` |

#### Style Modifiers

| Class | Effect |
|---|---|
| `.block-text-uppercase` | `text-transform: uppercase`, `letter-spacing: 0.05em` |
| `.block-text-muted` | `color: var(--text-muted)` |
| `.block-text-heading` | `color: var(--text-heading)` |
| `.block-text-accent` | `color: var(--accent)` |

#### Rich Text Content

`.block-rte` — Styles rich text editor output. Adds bottom margin to `<p>` tags (except last child) and styles links with accent color and hover underline.

---

## Spacing System

The spacing scale is based on a 4px/8px rhythm. All spacing values use rem with the 62.5% base (so `0.8rem = 8px`).

### Usage Patterns

| Context | Typical Tokens |
|---|---|
| Tight gaps (inline items) | `--space-xs` (8px) |
| Form label-to-input gaps | `--space-xs` (8px) |
| General gaps | `--space-md` (16px) |
| Card padding (mobile) | `--space-lg` (24px) |
| Card padding (tablet) | `--space-xl` (32px) |
| Card padding (desktop) | `--space-2xl` (40px) |
| Section header bottom margin | `--space-2xl` (40px) |
| Section vertical padding (mobile) | `--space-4xl` (64px) |
| Section vertical padding (tablet) | `--space-5xl` (80px) |
| Section vertical padding (desktop) | `--space-6xl` (96px) |

---

## Layout System

### Widget Container Architecture

Every widget follows a two-layer container pattern:

```
.widget                          — Outer wrapper (background, overlay, inline padding)
  └── .widget-container          — Inner container (max-width, vertical spacing)
       └── .widget-header        — Optional centered section header
       └── .widget-content       — Main content area
```

#### `.widget`

The outer wrapper. Handles backgrounds, background images, and overlays.

- `position: relative`
- `padding-inline: var(--section-padding-inline)` — Horizontal page gutters
- Background properties from `--widget-bg-*` tokens
- Overlay via `&.has-overlay::before` pseudo-element

#### `.widget-container`

The inner container that constrains width and adds vertical rhythm.

- `max-width: var(--container-max-width)` (1420px)
- `margin-inline: auto` — Centers content
- `margin-block: var(--section-padding-block)` — Vertical spacing (collapses between adjacent widgets)
- `z-index: 2` — Sits above overlays

#### `.widget-container-padded`

Alternative to `.widget-container` for widgets with non-default backgrounds. Uses `padding-block` instead of `margin-block` so the background fills the padded area:

```css
.widget-container-padded {
  margin-block: 0;
  padding-block: var(--section-padding-block);
}
```

Usage pattern in templates:

```liquid
<div class="widget-container {% if widget.settings.color_scheme == 'highlight' %}widget-container-padded{% endif %}">
```

#### `.widget-header`

Centered section header with flex column layout:

- `text-align: center`, `align-items: center`
- `margin-block-end: var(--space-2xl)` — Gap before content
- `gap: var(--space-sm)` — Between header children
- `.widget-description` inside is capped at `max-width: 70rem` (700px)

### Content Width Modifiers

Constrain content to narrower widths for readability:

| Class | Max Width | Use Case |
|---|---|---|
| `.widget-content-xs` | `var(--content-width-xs)` (400px) | Schedules, narrow content |
| `.widget-content-sm` | `var(--content-width-sm)` (600px) | Forms, modals |
| `.widget-content-md` | `var(--content-width-md)` (800px) | Text-heavy sections |
| `.widget-content-lg` | `var(--content-width-lg)` (900px) | Comfortable reading |

All apply `margin-inline: auto` for centering.

### Content Alignment Modifiers

| Class | Effect |
|---|---|
| `.widget-content-align-center` | Centers text, centers `.widget-actions` |
| `.widget-content-align-start` | Left-aligns text, left-aligns `.widget-actions` |
| `.widget-content-align-end` | Right-aligns text, right-aligns `.widget-actions` |

### Height Modifiers

For full-viewport or partial-viewport hero sections:

| Class | Min Height |
|---|---|
| `.widget-height-half` | `50vh` |
| `.widget-height-two-thirds` | `66vh` |
| `.widget-height-full` | `100vh` / `100dvh` |

All three also set `display: flex; flex-direction: column; justify-content: center;` to vertically center content.

### Layout Direction Modifiers

| Class | Effect |
|---|---|
| `.layout-image-right` | Reverses flex direction at desktop to move image to the right |
| `.layout-reverse` | General flex direction reversal |

---

## Grid System

The grid system uses CSS Grid with responsive breakpoints:

### Base Grid (`.widget-grid`)

```
Mobile (<750px):   1 column
Tablet (750px+):   2 columns
Desktop (990px+):  var(--grid-cols-desktop, 3) columns
```

Gap is automatically calculated based on column count:

```css
--grid-gap-auto: max(var(--space-xs), calc(var(--space-xl) - (var(--grid-cols-desktop, 3) - 2) * var(--space-xs)));
gap: clamp(var(--space-xs), var(--grid-gap, var(--grid-gap-auto)), var(--space-xl));
```

### Column Count Modifiers

| Class | `--grid-cols-desktop` |
|---|---|
| `.widget-grid-2` | 2 |
| `.widget-grid-3` | 3 |
| `.widget-grid-4` | 4 |
| `.widget-grid-5` | 5 |
| `.widget-grid-6` | 6 |
| `.widget-grid-7` | 7 |
| `.widget-grid-8` | 8 |

The column count can also be set inline from widget settings:

```liquid
<ul class="widget-card-grid widget-grid" style="--grid-cols-desktop: {{ widget.settings.columns_desktop }};">
```

### Card Grid (`.widget-card-grid`)

An alternative grid container with the same breakpoint behavior as `.widget-grid`, designed for card lists (resets `list-style`, `padding`, `margin`).

---

## Component Patterns

### Cards

#### Base Card (`.widget-card`)

```css
.widget-card {
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
  border: var(--border-width-thin) solid var(--border-color);
  padding: var(--space-lg);          /* 24px mobile */
  /* Responsive: --space-xl @750px, --space-2xl @990px */
  transition: border-color var(--transition-speed-normal);
}
```

#### Card Sub-Components

| Class | Purpose | Key Styles |
|---|---|---|
| `.widget-card-flat` | No-border variant | `background: var(--bg-secondary)` |
| `.widget-card-header` | Header section | `margin-block-end: var(--space-lg)` |
| `.widget-card-title` | Title | `font-size: lg` (xl @990px), `color: --text-heading` |
| `.widget-card-subtitle` | Uppercase eyebrow | `xs`, `bold`, `uppercase`, `0.05em tracking`, `--text-muted` |
| `.widget-card-description` | Body text | `sm`, `relaxed line-height`, `--text-content` |
| `.widget-card-content` | Main body | `flex: 1` (fills remaining space) |
| `.widget-card-footer` | Bottom section | `margin-block-start: auto` (pushes to bottom) |
| `.widget-card-image` | Cover image | `aspect-ratio: 16/9`, `object-fit: cover` |
| `.widget-card-icon` | Accent icon | `--icon-size-lg`, `color: --accent` |

### Buttons

#### Base Button (`.widget-button`)

The default button is a **secondary** (outlined) style:

```css
.widget-button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 0.8rem 1.6rem;
  font-size: var(--font-size-sm);
  background-color: transparent;
  color: var(--text-content);
  border: var(--border-width-medium) solid var(--accent);
  transition: all 0.3s;
}
.widget-button:hover {
  background-color: var(--accent);
  color: var(--accent-text);
}
```

#### Button Variants

| Class | Effect |
|---|---|
| `.widget-button-primary` | Filled with `--accent` background, `--accent-text` color |
| `.widget-button-secondary` | Outlined with `--accent` border (default style) |

#### Button Sizes

| Class | Padding | Font Size |
|---|---|---|
| (default) | `0.8rem 1.6rem` | `--font-size-sm` (14px) |
| `.widget-button-medium` | `1.2rem 2.4rem` | `--font-size-base` (16px) |
| `.widget-button-large` | `1.6rem 3.2rem` | `--font-size-lg` (18px) |
| `.widget-button-xlarge` | `2rem 4.8rem` | `--font-size-xl` (20px) |

#### Button Modifiers

| Class | Effect |
|---|---|
| `.widget-button-full` | Full-width (`width: 100%`, centered text) |
| `.widget-button-icon` | Icon inside button (`1.6rem` square, `stroke: currentColor`) |

#### Button Container

`.widget-actions` — Flex container for buttons with `gap: var(--space-md)`, `flex-wrap: wrap`, centered by default.

### Forms

| Class | Purpose | Key Styles |
|---|---|---|
| `.form-group` | Vertical field container | `flex column`, `gap: --space-xs` |
| `.form-label` | Field label | `font-size: sm`, `color: --text-content` |
| `.form-input` | Text input | Full width, `padding: sm md`, `border: thin`, focus: `border-color: --text-heading` |
| `.form-textarea` | Multi-line input | Same as input + `min-height: 15rem`, `resize: vertical` |
| `.form-select` | Dropdown select | Custom chevron via SVG background-image |
| `.form-checkbox-group` | Checkbox + label row | `flex`, `gap: --space-sm` |
| `.form-checkbox` | Checkbox input | `2rem` square, `accent-color: --text-heading` |
| `.form-checkbox-label` | Checkbox label | `font-size: base`, `cursor: pointer` |

Legacy aliases `.widget-label` and `.widget-input` also exist for backwards compatibility.

### Icons

| Class | Size Token | Dimensions |
|---|---|---|
| `.widget-icon` | `--icon-size-lg` | 32px |
| `.widget-icon-small` | `--icon-size-sm` | 20px |
| `.widget-icon-large` | `--icon-size-xl` | 48px |

All icons use `stroke: currentColor` for color inheritance.

---

## Block System

### Block Item Background/Overlay (`.block-item`)

The block system mirrors the widget background/overlay system for individual blocks within a widget. It reuses the same `--widget-bg-*` CSS variables:

```css
.block-item {
  position: relative;
  background-color: var(--widget-bg-color, transparent);
  background-size: var(--widget-bg-size, cover);
  background-position: var(--widget-bg-position, center);
  background-repeat: var(--widget-bg-repeat, no-repeat);
}

.block-item.has-overlay::before {
  content: "";
  position: absolute;
  inset: 0;
  background-color: var(--widget-overlay-color, transparent);
  z-index: 1;
  pointer-events: none;
}
```

When used, the `--widget-bg-*` and `--widget-overlay-*` variables are set inline on the block element so they scope to that specific block rather than inheriting the widget-level values.

---

## Global Components

### Site Header (`.widget-site-header`)

The header is a global widget with responsive behavior:

**Mobile (< 990px):**
- Slide-out navigation panel from the right (`.header-nav`)
- Hamburger toggle button (`.menu-toggle`)
- Mobile CTA button visible
- Contact info hidden (shown inside slide-out panel via `.header-contact-mobile`)

**Desktop (990px+):**
- Horizontal inline navigation
- Dropdown submenus on hover
- Desktop CTA button visible
- Contact info visible in header bar

#### Header Modifiers

| Class | Effect |
|---|---|
| `.header-sticky` | `position: sticky; top: 0; z-index: 999;` with `--bg-primary` background |
| `.header-scrolled` | Adds `box-shadow: 0 2px 8px rgba(0,0,0,0.1)` — applied via JS on scroll |

#### Navigation Structure

```
.widget-site-header
  .header-inner (flex, space-between)
    .header-branding
      .header-logo (text or image link)
      .header-contact (desktop contact info)
    .header-actions
      .menu-toggle (hamburger button, hidden at 990px+)
      .desktop-cta (button, hidden below 990px)
    .header-nav (slide-out panel on mobile, inline on desktop)
      .nav-close (close button, hidden at 990px+)
      .nav-list
        .nav-item
          a (nav link)
          .submenu-toggle (chevron button, mobile only)
          .nav-submenu (dropdown/accordion)
            .nav-item (nested, supports 3 levels)
      .mobile-cta (button, hidden at 990px+)
      .header-contact-mobile (contact info, mobile only)
```

#### Submenu Behavior

| Viewport | Behavior |
|---|---|
| Mobile | Accordion-style expand/collapse via `.submenu-open` class on `.nav-item` and `.nav-submenu`. Uses `max-height` transition. |
| Desktop | Hover-triggered dropdown via `opacity`/`visibility`/`transform` transition. Submenus positioned absolutely. Third-level menus open to the side. `.submenu-flip` class flips direction when menus would overflow the viewport. |

### Site Footer (`.widget-footer`)

Centered layout with vertical stack:

```
.widget-footer
  .footer-content (flex column, centered)
    .footer-logo
    .footer-menu (horizontal, wrapping link list)
      .footer-menu-link
    .footer-social (horizontal icon links)
      .social-link (2.4rem square, hover: --accent color)
    .footer-copyright (xs, muted)
```

---

## Utility Classes

### Content Flow (`.content-flow`)

Adds vertical spacing between adjacent sibling elements within a container:

```css
.content-flow > * + * {
  margin-block-start: var(--space-md); /* 16px */
}
.content-flow > .widget-actions:last-child {
  margin-block-start: var(--space-xl); /* 32px - extra space before buttons */
}
```

### Feature Lists

For displaying lists of features or benefits:

| Class | Purpose |
|---|---|
| `.features-list` | Container — flex column, `gap: --space-xs`, resets list styles |
| `.feature-item` | Row — flex, `gap: --space-xs`, `color: --text-content` |
| `.feature-icon` | Icon wrapper — `flex-shrink: 0`, `color: --text-content` |
| `.feature-icon-svg` | Icon SVG — `1em` square |

### Accessibility Helpers

| Class | Purpose |
|---|---|
| `.visually-hidden` | Hides element visually but keeps it accessible to screen readers (1px clip rect) |
| `.skip-link` | Hidden by default, becomes visible on focus — positioned absolute with z-index 9999 |

---

## Scroll Reveal Animations

### Overview

The reveal system animates elements into view as the user scrolls. It is **opt-in** via the `enable_reveal_animations` setting in `theme.json`. When disabled, all `.reveal` elements are forced visible via an inline `<style>` override in `layout.liquid`.

### Usage

Add `.reveal` and a direction class to any element:

```html
<div class="reveal reveal-up" style="--reveal-delay: 2">
  Content appears from below with a 0.2s delay
</div>
```

### Direction Variants

| Class | Starting Transform |
|---|---|
| `.reveal-up` | `translateY(2rem)` — slides up from below |
| `.reveal-down` | `translateY(-2rem)` — slides down from above |
| `.reveal-left` | `translateX(2rem)` — slides in from right |
| `.reveal-right` | `translateX(-2rem)` — slides in from left |
| `.reveal-scale` | `scale(0.95)` — scales up |
| `.reveal-fade` | (no transform) — fade only |

### Hidden State (`.reveal`)

```css
.reveal {
  opacity: 0;
  transition: opacity 0.6s ease-out, transform 0.6s ease-out;
  transition-delay: calc(var(--reveal-delay, 0) * 0.1s);
}
```

### Revealed State (`.reveal.revealed`)

Applied by JavaScript (`reveal.js`) when the element enters the viewport:

```css
.reveal.revealed {
  opacity: 1;
  transform: none;
}
```

### Staggered Delays

Use `--reveal-delay` (set as inline style) to stagger animations. Each increment adds `0.1s` delay:

```liquid
{% for blockId in widget.blocksOrder %}
  <div class="reveal reveal-up" style="--reveal-delay: {{ forloop.index0 }}">
    <!-- Delay: 0s, 0.1s, 0.2s, 0.3s... -->
  </div>
{% endfor %}
```

### Reduced Motion

Respects `prefers-reduced-motion: reduce` — all reveal elements become immediately visible with no transitions.

---

## Responsive Breakpoints

The theme uses three breakpoints:

| Breakpoint | Width | Purpose |
|---|---|---|
| Mobile | `< 750px` | Single column, mobile navigation |
| Tablet | `750px+` | Two-column grids, increased spacing |
| Desktop | `990px+` | Full grid columns, desktop navigation, max spacing |

An additional breakpoint at `1200px` exists in the documentation but is not used in Arch's `base.css`.

### Key Responsive Behaviors

| Element | Mobile | Tablet (750px+) | Desktop (990px+) |
|---|---|---|---|
| Grid columns | 1 | 2 | `var(--grid-cols-desktop, 3)` |
| Section padding | 64px | 80px | 96px |
| Card padding | 24px | 32px | 40px |
| Card title size | 18px | 18px | 20px |
| Navigation | Slide-out panel | Slide-out panel | Horizontal dropdown |
| Header contact | Hidden | Hidden | Visible |
| Header CTA | Mobile CTA | Mobile CTA | Desktop CTA |

---

## CSS Variable Pipeline

This describes how user-configured theme values flow from `theme.json` settings to rendered CSS:

### 1. Configuration (theme.json)

Settings with `"outputAsCssVar": true` (colors) and `font_picker` types are candidates for CSS variable generation:

```json
{
  "type": "color",
  "id": "standard_accent",
  "label": "Accent Color",
  "default": "#DE1877",
  "outputAsCssVar": true
}
```

### 2. Processing (themeSettings.js)

The `{% theme_settings %}` Liquid tag reads all global settings, and for each one:

- **Color/range settings** with `outputAsCssVar: true`: generates `--{category}-{id}: {value};`
- **Font pickers**: generates `--{category}-{id}-family`, `--{category}-{id}-weight`, and (for body) `--{category}-{id}_bold-weight`

### 3. Output (injected `<style>`)

```html
<style id="theme-settings-styles">
:root {
  --colors-standard_bg_primary: #ffffff;
  --colors-standard_accent: #DE1877;
  --colors-highlight_bg_primary: #233c54;
  --typography-heading_font-family: "Fraunces", serif;
  --typography-heading_font-weight: 600;
  --typography-body_font-family: "Inter", sans-serif;
  --typography-body_font-weight: 400;
  --typography-body_font_bold-weight: 700;
  /* ... all 18 colors + typography variables */
}
</style>
```

### 4. Consumption (base.css)

The design system reads the injected variables via `var()` with fallbacks:

```css
:root {
  --accent: var(--colors-standard_accent, #0d47b7);
}
.color-scheme-highlight {
  --accent: var(--colors-highlight_accent, #de1877);
}
body {
  font-family: var(--typography-body_font-family, ...fallback...);
}
```

### Variable Naming Convention

| Layer | Pattern | Example |
|---|---|---|
| Theme settings (injected) | `--{category}-{id}` | `--colors-standard_accent` |
| Design tokens (base.css) | `--{semantic-name}` | `--accent`, `--text-heading` |
| Component tokens | `--widget-{property}` | `--widget-bg-color` |
| Grid tokens | `--grid-{property}` | `--grid-cols-desktop` |

---

## Widget Template Conventions

### Standard Widget Root Element

Every widget follows this pattern:

```liquid
<section
  id="{{ widget.id }}"
  class="widget widget-type-{name} widget-{{ widget.id }} color-scheme-{{ widget.settings.color_scheme }} {modifiers}"
  {% if widget.settings.color_scheme == 'highlight' %}
    style="--widget-bg-color: var(--bg-primary);"
  {% endif %}
  data-widget-id="{{ widget.id }}"
  data-widget-type="{name}"
  {% if widget.index != null %}data-widget-index="{{ widget.index }}"{% endif %}
>
```

Key attributes:

- `id="{{ widget.id }}"` — Unique anchor
- `class="widget"` — Base styles (background, padding)
- `class="widget-type-{name}"` — Type-specific CSS scoping
- `class="widget-{{ widget.id }}"` — Instance-specific scoped styles (used with `<style>` blocks inside the widget)
- `class="color-scheme-{{ widget.settings.color_scheme }}"` — Activates color scheme remapping
- `data-widget-id` / `data-widget-type` / `data-widget-index` — Editor integration

### Scoped Widget Styles

Widgets that need custom CSS use instance-scoped `<style>` blocks:

```liquid
<style>
  .widget-{{ widget.id }} {
    & .my-custom-element {
      /* Styles scoped to this widget instance */
    }

    @media (min-width: 990px) {
      & .my-custom-element {
        /* Desktop overrides */
      }
    }
  }
</style>
```

This uses CSS nesting (`&`) with the unique `.widget-{{ widget.id }}` class as the scope boundary.

### Container Pattern

```liquid
<div class="widget-container {% if widget.settings.color_scheme == 'highlight' %}widget-container-padded{% endif %}">
  <!-- Widget content here -->
</div>
```

### Heading Level Logic

Widgets use `widget.index` to determine heading levels (h1 vs h2) for proper semantic hierarchy:

```liquid
{% if widget.index == 1 %}
  <h1 class="widget-headline">{{ widget.settings.title }}</h1>
{% else %}
  <h2 class="widget-headline">{{ widget.settings.title }}</h2>
{% endif %}
```

### Block Rendering Pattern

Widgets with blocks iterate over `widget.blocksOrder` and use `{% case %}` to render each block type:

```liquid
{% for blockId in widget.blocksOrder %}
  {% assign block = widget.blocks[blockId] %}
  {% case block.type %}
    {% when 'heading' %}
      <!-- Heading block -->
    {% when 'text' %}
      <!-- Text block -->
    {% when 'button' %}
      <!-- Button block -->
  {% endcase %}
{% endfor %}
```

### Reveal Animation Integration

Apply `.reveal` + direction class to elements, with staggered delays using `--reveal-delay`:

```liquid
<div class="reveal reveal-up" style="--reveal-delay: {{ forloop.index0 }}">
```

---

## Available Widgets (Arch Theme)

The Arch theme ships with 43 widgets organized by purpose:

**Heroes & Banners**: banner, slideshow, split-hero, image-callout
**Content**: rich-text, image-text, features-split, content-switcher
**Cards & Grids**: card-grid, icon-card-grid, numbered-cards, bento-grid, profile-grid, project-showcase
**Data & Lists**: accordion, comparison-table, icon-list, key-figures, pricing, priced-list, schedule-table, job-listing, event-list
**Media**: image, gallery, masonry-gallery, video, video-embed, comparison-slider, image-hotspots, image-tabs
**Social & Trust**: testimonials, testimonial-hero, logo-cloud, trust-bar, social-icons
**Interactive**: countdown, map, embed, podcast-player
**Forms**: contact-form, newsletter
**Timeline**: timeline
**Global**: header (global), footer (global)
