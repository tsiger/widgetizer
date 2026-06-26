# Arch Theme Design System

> **Complete reference for the Arch theme's visual design language, CSS custom properties, layout system, component patterns, and modifiers**

The Arch theme is the default Widgetizer theme. It provides a comprehensive, token-driven design system built entirely on CSS custom properties. Every visual decision — colors, spacing, typography, sizing — flows through a centralized set of design tokens defined in `themes/arch/assets/base.css`, with user-customizable values injected at runtime from `themes/arch/theme.json` via the `{% theme_settings %}` Liquid tag.

This doc covers the **theme-side** design system (what a themer / theme-aware LLM reads). For the editor UI's own React/Tailwind style guide, see [core-editor-ui-style-guide.md](core-editor-ui-style-guide.md). For widget authoring patterns, see [theming-widgets.md](theming-widgets.md). For setting-type reference, see [theming-setting-types.md](theming-setting-types.md). For theme structure and global settings, see [theming.md](theming.md).

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
12. [Style Classes (Body Class Pattern)](#style-classes-body-class-pattern)
13. [Scroll Reveal Animations](#scroll-reveal-animations)
14. [Responsive Breakpoints](#responsive-breakpoints)
15. [CSS Variable Pipeline](#css-variable-pipeline)
16. [Widget Template Conventions](#widget-template-conventions)
17. [Available Widgets](#available-widgets-arch-theme)

---

## Architecture Overview

### File Structure

```
themes/arch/
├── theme.json          # Theme manifest: metadata + global settings schema
├── layout.liquid       # Master HTML template (loads all assets)
├── assets/
│   ├── base.css        # Design system: tokens, resets, components, utilities
│   ├── scripts.js      # Core JS (header, navigation, sticky header scroll behavior)
│   ├── reveal.js       # Scroll reveal animation engine
│   ├── carousel.js     # Carousel initialization and navigation
│   ├── lightbox.js     # Lightbox for gallery image viewing
│   ├── masonry.js      # Masonry layout for gallery widgets
│   ├── video-modal.js  # Video popup modal (YouTube/Vimeo)
│   ├── countdown.js    # Countdown widget timer
│   └── icons.json      # SVG icon registry (consumed by icon.liquid)
├── widgets/            # 56 page widget components + 2 global
│   ├── accordion/
│   ├── banner/
│   ├── card-grid/
│   ├── ...
│   └── global/         # Header + Footer (appear on every page)
│       ├── header/
│       └── footer/
├── snippets/           # Reusable Liquid partials
│   ├── icon.liquid          # SVG icon rendering from icons.json
│   ├── social-icons.liquid  # Social media link icons (16 platforms)
│   ├── site-icons.liquid    # Favicon / apple-touch-icon / manifest <link> tags
│   └── cs-class-row.liquid   # Single class row partial for the class-schedule widget
├── locales/            # Theme locale files (nested JSON per language)
│   ├── en.json
│   └── ...
├── templates/          # Page template definitions
└── menus/              # Navigation menu JSON files
```

### Asset Loading Order

Defined in `layout.liquid`, head/body assets load in this sequence:

1. `{% seo %}` — Meta tags
2. `{% fonts %}` — Google/Bunny font stylesheets
3. `{% render 'site-icons', site_icons: site_icons %}` — Favicon, apple-touch-icon, and web-manifest `<link>` tags
4. `{% theme_settings %}` — Generates `<style id="theme-settings-styles">` with `:root` CSS variables from `theme.json` user values
5. `{% asset src: "base.css" %}` — The design system stylesheet
6. Reveal animation override (when animations disabled): `<style>.reveal { opacity: 1 !important; transform: none !important; }</style>`
7. `{% custom_css %}` — User's custom CSS
8. `{% custom_head_scripts %}` — User's head scripts
9. `{% header_assets %}` — Widget-enqueued CSS/JS (head)
10. Body: skip link, `{{ header | raw }}`, `<main id="main-content">{{ main_content | raw }}</main>`, `{{ footer | raw }}`
11. `{% asset src: "scripts.js", defer: true %}` — Core JS (header, navigation, sticky header scroll behavior, `--header-sticky-offset` CSS variable)
12. `{% asset src: "reveal.js", defer: true %}` — Reveal animations (only rendered when `enable_reveal_animations` is on)
13. `{% footer_assets %}` — Widget-enqueued footer assets (e.g., `carousel.js` when carousel widgets are present)
14. `{% custom_footer_scripts %}` — User's footer scripts

This order ensures theme-settings CSS variables are available before `base.css` reads them, and that user customizations cascade last. The reveal override and `reveal.js` are gated on the `enable_reveal_animations` setting (default **off**), and `site-icons` is rendered before `theme_settings` so the favicon links appear early in `<head>`.

### Unit System

The theme uses a `62.5%` base font size on `<html>`, making `1rem = 10px`. This means `0.1rem = 1px`, enabling clean rem values throughout:

```css
html {
  font-size: 62.5%;
}
/* Now: 1.6rem = 16px, 2.4rem = 24px, etc. */
```

---

## CSS Custom Properties (Design Tokens)

All tokens are defined on `:root` in `base.css`. They fall into two categories:

1. **Static tokens** — Fixed values defined directly in `base.css`
2. **Dynamic tokens** — Values that reference `--colors-*` or `--typography-*` variables injected by `{% theme_settings %}` from user configuration, with hardcoded fallbacks

### Complete Token Reference

#### Typography Scale

| Token              | Value    | Pixels |
| ------------------ | -------- | ------ |
| `--font-size-xs`   | `1.2rem` | 12px   |
| `--font-size-sm`   | `1.4rem` | 14px   |
| `--font-size-base` | `1.6rem` | 16px   |
| `--font-size-lg`   | `1.8rem` | 18px   |
| `--font-size-xl`   | `2rem`   | 20px   |
| `--font-size-2xl`  | `2.4rem` | 24px   |
| `--font-size-3xl`  | `2.8rem` | 28px   |
| `--font-size-4xl`  | `3.2rem` | 32px   |
| `--font-size-5xl`  | `3.6rem` | 36px   |
| `--font-size-6xl`  | `4.4rem` | 44px   |
| `--font-size-7xl`  | `5.4rem` | 54px   |
| `--font-size-8xl`  | `6.8rem` | 68px   |
| `--font-size-9xl`  | `8.4rem` | 84px   |

This single table is the source of truth for the type scale — widget-authoring docs point here rather than re-listing it.

#### Line Heights

| Token                   | Value |
| ----------------------- | ----- |
| `--line-height-tight`   | `1.2` |
| `--line-height-normal`  | `1.5` |
| `--line-height-relaxed` | `1.6` |

#### Font Weights

| Token                    | Value |
| ------------------------ | ----- |
| `--font-weight-medium`   | `500` |
| `--font-weight-semibold` | `600` |

These are static utilities. Actual heading/body weights come from the dynamic typography variables (see [Typography System](#typography-system)).

#### Spacing Scale

| Token         | Value    | Pixels |
| ------------- | -------- | ------ |
| `--space-xs`  | `0.8rem` | 8px    |
| `--space-sm`  | `1.2rem` | 12px   |
| `--space-md`  | `1.6rem` | 16px   |
| `--space-lg`  | `2.4rem` | 24px   |
| `--space-xl`  | `3.2rem` | 32px   |
| `--space-2xl` | `4rem`   | 40px   |
| `--space-3xl` | `4.8rem` | 48px   |
| `--space-4xl` | `6.4rem` | 64px   |
| `--space-5xl` | `8rem`   | 80px   |
| `--space-6xl` | `9.6rem` | 96px   |

This single table is the source of truth for the spacing scale. (Note: `carousel.js`-driven carousel tracks reference a `--space-2xs` token for inline padding; it has no `:root` default and resolves to nothing when unset — treat the scale above as the defined set.)

#### Section Spacing

| Token                      | Default                   | @750px                    | @990px                    |
| -------------------------- | ------------------------- | ------------------------- | ------------------------- |
| `--section-padding-block`  | `var(--space-4xl)` (64px) | `var(--space-4xl)` (64px) | `var(--space-5xl)` (80px) |
| `--section-padding-inline` | `var(--space-lg)` (24px)  | —                         | —                         |

`--section-padding-block` scales automatically via nested media queries inside `:root`. The widget container then applies it as `margin-block: calc(var(--section-padding-block) * var(--spacing-scale))`, so the **spacing-density** body class (compact / default / airy) multiplies section spacing as well as card padding.

#### Container & Content Widths

| Token                   | Value    | Pixels | Purpose                 |
| ----------------------- | -------- | ------ | ----------------------- |
| `--container-max-width` | `142rem` | 1420px | Outer container limit   |
| `--content-width-xs`    | `40rem`  | 400px  | Schedules, narrow forms |
| `--content-width-sm`    | `60rem`  | 600px  | Forms, modals           |
| `--content-width-md`    | `80rem`  | 800px  | Text-heavy sections     |
| `--content-width-lg`    | `90rem`  | 900px  | Comfortable reading     |

#### Border Tokens

| Token                   | Value    | Pixels |
| ----------------------- | -------- | ------ |
| `--border-width-thin`   | `0.1rem` | 1px    |
| `--border-width-medium` | `0.2rem` | 2px    |
| `--border-width-thick`  | `0.3rem` | 3px    |

#### Style Tokens (Class-Driven)

These tokens control shapes, card appearance, and spacing density. Unlike other tokens, they are seeded with default values in `:root` and then **overridden by body classes** applied from the `style` category in `theme.json`. See [Style Classes (Body Class Pattern)](#style-classes-body-class-pattern) below for details.

| Token | Default (`:root`) | Purpose |
| --- | --- | --- |
| `--radius-sm` | `0` | Small radius (form inputs, tags, small cards) |
| `--radius-md` | `0` | Medium radius (cards, images, video embeds) |
| `--radius-lg` | `0` | Large radius (hero images, bento grids, callouts) |
| `--radius-button` | `0` | Button border-radius (separate for pill override) |
| `--radius-marker` | `0` | Numbered badge / marker radius — becomes `50%` (circle) on `corner-rounded` |
| `--card-border` | `var(--border-width-thin) solid var(--border-color)` | Card border style |
| `--spacing-scale` | `1` | Multiplier applied to section spacing, card padding, and widget header margin |

> The Arch base card is **borderless-shadow-free by design**: `.widget-card` sets a border and a `border-color` transition only — there is no `--card-shadow` token and no `box-shadow` on the base card. Depth comes from the border plus the active color scheme's background.

#### Color Tokens (Dynamic)

These reference the runtime-injected `--colors-standard_*` variables from theme settings, with hardcoded fallbacks. They are the base-`:root` defaults; the `.color-scheme-*` classes (see [Color System](#color-system)) re-point them per widget.

| Token                 | Source                                | Fallback  |
| --------------------- | ------------------------------------- | --------- |
| `--text-content`      | `var(--colors-standard_text_content)` | `#333`    |
| `--text-heading`      | `var(--colors-standard_text_heading)` | `#000`    |
| `--text-muted`        | `var(--colors-standard_text_muted)`   | `#666`    |
| `--bg-primary`        | `var(--colors-standard_bg_primary)`   | `#fff`    |
| `--bg-secondary`      | `var(--colors-standard_bg_secondary)` | `#f9f9f9` |
| `--accent`            | `var(--colors-standard_accent)`       | `#0d47b7` |
| `--accent-text`       | `var(--colors-standard_accent_text)`  | `#fff`    |
| `--rating-star-color` | `var(--colors-standard_rating_star)`  | `#fbbf24` |
| `--border-color`      | `var(--colors-standard_border_color)` | `#e0e0e0` |
| `--color-white`       | `#ffffff`                             | (static)  |
| `--color-black`       | `#000000`                             | (static)  |

> The fallback hex values above are the base-`:root` fallbacks in `base.css`; they are intentionally *not* the same as the `theme.json` defaults (which are what users actually get — see the [Color System](#color-system) defaults tables). Fallbacks only apply when no `--colors-*` variable was injected at all.

#### Icon Sizes

| Token            | Value    | Pixels |
| ---------------- | -------- | ------ |
| `--icon-size-xs` | `1.6rem` | 16px   |
| `--icon-size-sm` | `2rem`   | 20px   |
| `--icon-size-md` | `2.4rem` | 24px   |
| `--icon-size-lg` | `3.2rem` | 32px   |
| `--icon-size-xl` | `4.8rem` | 48px   |

#### Transition Speeds

| Token                       | Value   |
| --------------------------- | ------- |
| `--transition-speed-fast`   | `0.15s` |
| `--transition-speed-normal` | `0.3s`  |
| `--transition-speed-slow`   | `0.5s`  |

#### Computed Scales

| Token             | Value                                              |
| ----------------- | -------------------------------------------------- |
| `--heading-scale` | `calc(var(--typography-heading_scale, 100) / 100)` |
| `--body-scale`    | `calc(var(--typography-body_scale, 100) / 100)`    |

`heading_scale` and `body_scale` are `range` settings (80–120, default 100) with `outputAsCssVar: true`. Body-size classes (`t-xs`–`t-xl`, `.w-eyebrow`, `.w-meta`, etc.) multiply by `--body-scale`; heading-size classes (`t-2xl`+, headings) multiply by `--heading-scale`.

#### Widget Background System

Default values for widget background control (overridden inline per-widget):

| Token                      | Default       |
| -------------------------- | ------------- |
| `--widget-bg-color`        | `transparent` |
| `--widget-bg-size`         | `cover`       |
| `--widget-bg-position`     | `center`      |
| `--widget-bg-repeat`       | `no-repeat`   |
| `--widget-bg-attachment`   | `scroll`      |
| `--widget-overlay-color`   | `transparent` |
| `--widget-overlay-opacity` | `0.5`         |

> Background **images** are set inline on the element (with a `.has-bg-image` class), not via a CSS variable.

---

## Color System

### Four Color Schemes

The Arch theme exposes two palettes — **standard** (light) and **highlight** (dark/emphasis) — each with a **primary** and a **secondary** surface variant, for four schemes total. Widgets select one via a `color_scheme` setting whose values are:

- `standard-primary` (**default**) — light surface, `bg_primary`
- `standard-secondary` — light surface with `bg_primary` ↔ `bg_secondary` swapped
- `highlight-primary` — dark/emphasis surface, `bg_primary`
- `highlight-secondary` — dark surface with the background pair swapped

Each value maps directly to a CSS class: `.color-scheme-{value}`. The class remaps the shorthand color tokens (`--text-content`, `--bg-primary`, `--accent`, …) to point at the corresponding `--colors-{palette}_*` variables, so every descendant resolves to the active palette automatically.

#### Standard Primary (`.color-scheme-standard-primary`)

```css
.color-scheme-standard-primary {
  --text-heading: var(--colors-standard_text_heading, #0f172a);
  --text-content: var(--colors-standard_text_content, #1f2937);
  --text-muted: var(--colors-standard_text_muted, #6b7280);
  --border-color: var(--colors-standard_border_color, #e2e8f0);
  --bg-primary: var(--colors-standard_bg_primary, #ffffff);
  --bg-secondary: var(--colors-standard_bg_secondary, #f1f5f9);
  --accent: var(--colors-standard_accent, #1e3a8a);
  --accent-text: var(--colors-standard_accent_text, #ffffff);
  --rating-star-color: var(--colors-standard_rating_star, #fbbf24);
}
```

#### Highlight Primary (`.color-scheme-highlight-primary`)

```css
.color-scheme-highlight-primary {
  --text-heading: var(--colors-highlight_text_heading, #ffffff);
  --text-content: var(--colors-highlight_text_content, #eaf3fc);
  --text-muted: var(--colors-highlight_text_muted, #64748b);
  --border-color: var(--colors-highlight_border_color, #526884);
  --bg-primary: var(--colors-highlight_bg_primary, #233c54);
  --bg-secondary: var(--colors-highlight_bg_secondary, #152a3e);
  --accent: var(--colors-highlight_accent, #de1877);
  --accent-text: var(--colors-highlight_accent_text, #ffffff);
  --rating-star-color: var(--colors-highlight_rating_star, #fbbf24);
}
```

#### Secondary Variants

The `-secondary` variants keep the same text/border/accent palette as their `-primary` sibling but swap `--bg-primary` and `--bg-secondary`, so a widget can get a filled alternate surface without introducing a second palette:

```css
.color-scheme-standard-secondary {
  /* same text/border/accent as standard-primary, but: */
  --bg-primary: var(--colors-standard_bg_secondary, #f1f5f9);
  --bg-secondary: var(--colors-standard_bg_primary, #ffffff);
}

.color-scheme-highlight-secondary {
  /* same text/border/accent as highlight-primary, but: */
  --bg-primary: var(--colors-highlight_bg_secondary, #152a3e);
  --bg-secondary: var(--colors-highlight_bg_primary, #233c54);
}
```

#### How Color Schemes Work

Every widget applies a color-scheme class on its root element and renders all children using the shorthand tokens, which resolve to whichever palette the class selected:

```liquid
<section class="widget color-scheme-{{ widget.settings.color_scheme }}">
  <!-- All children inherit the remapped tokens -->
</section>
```

When a widget uses any non-default scheme, it fills its own background (and adds `widget-container-padded` so the fill covers the padded area). Branch on the **default value** (`standard-primary`), not a bare `'standard'`:

```liquid
{% unless widget.settings.color_scheme == 'standard-primary' %}
  style="--widget-bg-color: var(--bg-primary);"
{% endunless %}
```

```liquid
<div class="widget-container {% unless widget.settings.color_scheme == 'standard-primary' %}widget-container-padded{% endunless %}">
```

#### Default Color Palette (theme.json)

These are the values users actually start with (from `theme.json` `defaults`), and they differ from the base-`:root` fallbacks.

**Standard scheme defaults:**

| Setting ID              | Label                | Default   |
| ----------------------- | -------------------- | --------- |
| `standard_bg_primary`   | Primary Background   | `#ffffff` |
| `standard_bg_secondary` | Secondary Background | `#f8fafc` |
| `standard_text_content` | Content Text         | `#334155` |
| `standard_text_heading` | Heading Text         | `#0f172a` |
| `standard_text_muted`   | Muted Text           | `#6b7280` |
| `standard_border_color` | Border Color         | `#e2e8f0` |
| `standard_accent`       | Accent Color         | `#0f172a` |
| `standard_accent_text`  | Accent Text Color    | `#ffffff` |
| `standard_rating_star`  | Rating Star Color    | `#fbbf24` |

**Highlight scheme defaults:**

| Setting ID               | Label                | Default   |
| ------------------------ | -------------------- | --------- |
| `highlight_bg_primary`   | Primary Background   | `#0f172a` |
| `highlight_bg_secondary` | Secondary Background | `#020617` |
| `highlight_text_content` | Content Text         | `#cbd5e1` |
| `highlight_text_heading` | Heading Text         | `#ffffff` |
| `highlight_text_muted`   | Muted Text           | `#94a3b8` |
| `highlight_border_color` | Border Color         | `#334155` |
| `highlight_accent`       | Accent Color         | `#ffffff` |
| `highlight_accent_text`  | Accent Text Color    | `#0f172a` |
| `highlight_rating_star`  | Rating Star Color    | `#fbbf24` |

All 18 color settings have `"outputAsCssVar": true`, so `{% theme_settings %}` emits a `--colors-{id}` CSS variable on `:root` for each. Together with the two `range` scale settings (`heading_scale`, `body_scale`), that is **20 settings** marked `outputAsCssVar: true` in `theme.json`.

---

## Typography System

### Font Configuration

Fonts are configured in `theme.json` via `font_picker` settings. Both default to **Inter**:

| Setting ID     | Label        | Default Stack         | Default Weight |
| -------------- | ------------ | --------------------- | -------------- |
| `heading_font` | Heading Font | `"Inter", sans-serif` | 600            |
| `body_font`    | Body Font    | `"Inter", sans-serif` | 400            |

The `{% theme_settings %}` tag generates these CSS variables:

```css
:root {
  --typography-heading_font-family: "Inter", sans-serif;
  --typography-heading_font-weight: 600;
  --typography-body_font-family: "Inter", sans-serif;
  --typography-body_font-weight: 400;
  --typography-body_font_bold-weight: 700; /* Smart bold calculation */
}
```

#### Smart Bold Weight

For `body_font` when the base weight is **400**, `themeSettings.js` looks up the font in `fonts.json` (Google fonts only) and finds the best available bold weight (preferring 700 > 600 > 500). That value becomes `--typography-body_font_bold-weight`, used by `<strong>`/`<b>` and `.t-body-bold`. When the body weight is not 400, the selected weight is reused as the bold weight.

### Base Typography Styles

```css
body {
  font-family: var(--typography-body_font-family, ...system-stack...);
  font-weight: var(--typography-body_font-weight, 400);
  font-size: calc(var(--font-size-base) * var(--body-scale)); /* 16px × body-scale */
  line-height: var(--line-height-normal); /* 1.5 */
  color: var(--text-content);
  background-color: var(--bg-primary);
}

strong,
b {
  font-weight: var(--typography-body_font_bold-weight, 700);
}

h1-h6 {
  font-family: var(--typography-heading_font-family, inherit);
  font-weight: var(--typography-heading_font-weight, 700);
  color: var(--text-heading);
  line-height: var(--line-height-tight); /* 1.2 */
}
```

`body` uses a sticky-footer flex column (`display: flex; flex-direction: column; min-height: 100dvh`), and `.main-content` gets `flex: 1` so the footer is pushed to the bottom.

#### Heading Size Scale

Heading sizes multiply by `--heading-scale`:

| Element | Token             | Size |
| ------- | ----------------- | ---- |
| `h1`    | `--font-size-5xl` | 36px |
| `h2`    | `--font-size-4xl` | 32px |
| `h3`    | `--font-size-3xl` | 28px |
| `h4`    | `--font-size-2xl` | 24px |
| `h5`    | `--font-size-xl`  | 20px |
| `h6`    | `--font-size-lg`  | 18px |

### Semantic Base Classes (`w-` prefix)

Each class is a complete, self-contained text style. All set `margin: 0`. Modifiers (`t-*`) can always override.

| Class | Role | Key Properties |
| --- | --- | --- |
| `.w-eyebrow` | Small label above headline | `font-size-sm × body-scale`, `letter-spacing: 0.05em`, `line-height-relaxed`, `color: --text-muted` |
| `.w-headline` | Section-level heading (h1/h2) | `font-size-4xl × heading-scale`, `heading font-weight`, `color: --text-heading`, `line-height-tight` |
| `.w-title` | Item-level heading (card title, list item name) | `heading font-weight`, `color: --text-heading`, `line-height-tight` |
| `.w-description` | Subtext in header trio ONLY | `line-height-relaxed`, `color: --text-content` |
| `.w-body` | All other body-level text | `line-height-relaxed`, `color: --text-content` |
| `.w-meta` | Small secondary text (dates, roles, captions) | `font-size-sm × body-scale`, `color: --text-muted` |
| `.w-label` | Small bold text (badges, tags, filters) | `font-size-sm × body-scale`, `font-weight-semibold`, `color: --text-content` |

Notes:
- `w-headline` vs `w-title`: headline = section-level (h1/h2 in widget header), title = item-level (card title, list item name).
- `w-description` is **only** for the header trio (eyebrow + headline + description). Inside `.widget-header` it is capped at `max-width: 70rem` and centered.
- `w-body` is for all other body-level text.
- `w-eyebrow` does NOT include `text-transform: uppercase` — add `t-uppercase` explicitly when needed.

### Text Modifier Classes (`t-` prefix)

Short, composable modifiers. Declared after base classes in CSS so they always win.

#### Size Modifiers

Body-scale sizes (xs–xl) use `--body-scale`; heading-scale sizes (2xl–9xl) use `--heading-scale` plus `line-height-tight`:

| Class | Font Size | Scale |
| --- | --- | --- |
| `.t-xs` | `--font-size-xs` (12px) | body-scale |
| `.t-sm` | `--font-size-sm` (14px) | body-scale |
| `.t-base` | `--font-size-base` (16px) | body-scale |
| `.t-lg` | `--font-size-lg` (18px) | body-scale |
| `.t-xl` | `--font-size-xl` (20px) | body-scale |
| `.t-2xl` | `--font-size-2xl` (24px) | heading-scale + line-height-tight |
| `.t-3xl` | `--font-size-3xl` (28px) | heading-scale + line-height-tight |
| `.t-4xl` | `--font-size-4xl` (32px) | heading-scale + line-height-tight |
| `.t-5xl` | `--font-size-5xl` (36px) | heading-scale + line-height-tight |
| `.t-6xl` | `--font-size-6xl` (44px) | heading-scale + line-height-tight |
| `.t-7xl` | `--font-size-7xl` (54px) | heading-scale + line-height-tight |
| `.t-8xl` | `--font-size-8xl` (68px) | heading-scale + `line-height: 1.1` |
| `.t-9xl` | `--font-size-9xl` (84px) | heading-scale + `line-height: 1.1` |

Below 750px the largest sizes step down: `.t-6xl`/`.t-7xl` clamp to `--font-size-4xl`, and `.t-8xl`/`.t-9xl` clamp to `--font-size-5xl`.

#### Weight Modifiers

| Class | Weight Source |
| --- | --- |
| `.t-normal` | `var(--typography-body_font-weight, 400)` |
| `.t-medium` | `var(--font-weight-medium)` (500) |
| `.t-semibold` | `var(--font-weight-semibold)` (600) |
| `.t-heading-weight` | `var(--typography-heading_font-weight, 700)` |
| `.t-body-bold` | `var(--typography-body_font_bold-weight, 700)` |

#### Color Modifiers

| Class | Effect |
| --- | --- |
| `.t-muted` | `color: var(--text-muted)` |
| `.t-heading` | `color: var(--text-heading)` |
| `.t-accent` | `color: var(--accent)` |

#### Style & Font Modifiers

| Class | Effect |
| --- | --- |
| `.t-uppercase` | `text-transform: uppercase; letter-spacing: 0.05em` |
| `.t-heading-font` | `font-family: var(--typography-heading_font-family, inherit)` |
| `.t-body-font` | `font-family: var(--typography-body_font-family, inherit)` |

### Rich Text Container

`.w-rte` — styles rich-text editor output. Adds bottom margin to `<p>` (except last child), spaces `<h2>`–`<h4>`, styles links with accent color + hover underline, formats `<ul>`/`<ol>`/`<li>`, and rounds embedded `<img>` to `--radius-md`. Use it alongside `.w-body`:

```html
<div class="w-body w-rte t-sm">{{ block.settings.text | raw }}</div>
```

### Dynamic Size/Style Classes in Liquid

Templates build dynamic classes using the `t-` prefix:

```liquid
{% assign size_class = 't-' | append: block.settings.size %}
{% assign style_class = '' %}
{% if block.settings.uppercase %}{% assign style_class = style_class | append: ' t-uppercase' %}{% endif %}
{% if block.settings.muted %}{% assign style_class = style_class | append: ' t-muted' %}{% endif %}
```

---

## Spacing System

The spacing scale is based on a 4px/8px rhythm. All values use rem with the 62.5% base (so `0.8rem = 8px`). See the [Spacing Scale](#spacing-scale) token table above for the authoritative list.

### Usage Patterns

| Context                            | Typical Tokens       |
| ---------------------------------- | -------------------- |
| Tight gaps (inline items)          | `--space-xs` (8px)   |
| Form label-to-input gaps           | `--space-xs` (8px)   |
| General gaps                       | `--space-md` (16px)  |
| Card padding (mobile)              | `--space-lg` (24px)  |
| Card padding (tablet)              | `--space-xl` (32px)  |
| Card padding (desktop, dense-aware)| `max(--space-md, --space-xl − …)` |
| Section header bottom margin       | `--space-2xl × --spacing-scale` (40px base) |
| Section vertical spacing (mobile)  | `--space-4xl × --spacing-scale` (64px base) |
| Section vertical spacing (desktop) | `--space-5xl × --spacing-scale` (80px base) |

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
- Background properties from `--widget-bg-*` tokens; `overflow-x: clip`
- Overlay via `&.has-overlay::before` pseudo-element (`opacity: var(--widget-overlay-opacity)`)

#### `.widget-container`

The inner container that constrains width and adds vertical spacing.

- `max-width: var(--container-max-width)` (1420px)
- `margin-inline: auto` — Centers content
- `margin-block: calc(var(--section-padding-block) * var(--spacing-scale))` — Vertical spacing (collapses between adjacent widgets, density-aware)
- `z-index: 2` — Sits above overlays

#### `.widget-container-padded`

Alternative for widgets with non-default backgrounds. Uses `padding-block` (same `calc(... × --spacing-scale)`) instead of `margin-block` so the background fills the padded area.

```liquid
<div class="widget-container {% unless widget.settings.color_scheme == 'standard-primary' %}widget-container-padded{% endunless %}">
```

#### Per-Widget Spacing Overrides

Many widgets expose `top_spacing` / `bottom_spacing` settings that emit `spacing-top-*` / `spacing-bottom-*` classes on `.widget`. The base rules use **descendant** selectors (`.widget.spacing-top-none .widget-container`) so they keep working even when a widget injects a `<style>` block before `.widget-container`:

| Class | Effect |
| --- | --- |
| `spacing-top-small` / `spacing-bottom-small` | Halves the section spacing on that edge |
| `spacing-top-none` / `spacing-bottom-none` | Removes the section spacing on that edge |

#### `.widget-header`

Centered section header with flex column layout:

- `text-align: center`, `align-items: center`
- `margin-block-end: calc(var(--space-2xl) * var(--spacing-scale))` — Gap before content
- `gap: var(--space-sm)` — Between header children
- `.w-description` inside is capped at `max-width: 70rem` and centered
- Add `.widget-header--align-start` to left-align the trio

### Content Width Modifiers

| Class                | Max Width                         | Use Case                  |
| -------------------- | --------------------------------- | ------------------------- |
| `.widget-content-xs` | `var(--content-width-xs)` (400px) | Schedules, narrow content |
| `.widget-content-sm` | `var(--content-width-sm)` (600px) | Forms, modals             |
| `.widget-content-md` | `var(--content-width-md)` (800px) | Text-heavy sections       |
| `.widget-content-lg` | `var(--content-width-lg)` (900px) | Comfortable reading       |

All apply `margin-inline: auto` for centering.

### Content Alignment Modifiers

| Class                          | Effect                                            |
| ------------------------------ | ------------------------------------------------- |
| `.widget-content-align-center` | Centers text, centers `.widget-actions` / rating / features |
| `.widget-content-align-start`  | Left-aligns text, left-aligns `.widget-actions`   |
| `.widget-content-align-end`    | Right-aligns text, right-aligns `.widget-actions` |

### Height Modifiers

For full- or partial-viewport hero sections. All three also set `display: flex; flex-direction: column; justify-content: center;` to vertically center content.

| Class                       | Min Height         |
| --------------------------- | ------------------ |
| `.widget-height-small`      | `50vh`             |
| `.widget-height-medium`     | `75vh`             |
| `.widget-height-large`      | `100vh` / `100dvh` |

---

## Grid System

### Base Grid (`.widget-grid`)

```
Mobile (<750px):   1 column
Tablet (750px+):   2 columns
Desktop (990px+):  var(--grid-cols-desktop, 3) columns
```

Gap is auto-calculated from the column count, then clamped:

```css
--grid-gap-auto: max(var(--space-xs), calc(var(--space-xl) - (var(--grid-cols-desktop, 3) - 2) * var(--space-xs)));
gap: clamp(var(--space-xs), var(--grid-gap, var(--grid-gap-auto)), var(--space-xl));
```

### Column Count Modifiers

| Class            | `--grid-cols-desktop` |
| ---------------- | --------------------- |
| `.widget-grid-2` | 2                     |
| `.widget-grid-3` | 3                     |
| `.widget-grid-4` | 4                     |
| `.widget-grid-5` | 5                     |
| `.widget-grid-6` | 6                     |
| `.widget-grid-7` | 7                     |
| `.widget-grid-8` | 8                     |

Or set the desktop column count inline:

```liquid
<ul class="widget-card-grid widget-grid" style="--grid-cols-desktop: {{ widget.settings.columns_desktop }};">
```

### Card Grid (`.widget-card-grid`)

A list-reset container (`list-style: none; padding: 0; margin: 0`) designed to pair with `.widget-grid` for card lists. `.widget-card` itself uses a density-aware padding that tracks the column count:

```css
--card-padding-auto: var(--space-lg);              /* mobile */
@media (min-width: 750px) { --card-padding-auto: var(--space-xl); }
@media (min-width: 990px) {
  --card-padding-auto: max(var(--space-md), calc(var(--space-xl) - (var(--grid-cols-desktop, 2) - 2) * var(--space-xs)));
}
padding: calc(var(--card-padding, var(--card-padding-auto)) * var(--spacing-scale));
```

Set `--card-padding` on a widget's `.widget-card` to opt out of the auto value. The `card-layout-flat` modifier strips the border/background/padding for a flat presentation.

### Carousel Layout

Card-based widgets support a `layout` setting with `grid` and `carousel` options. When `carousel` is selected, the grid is replaced by a horizontal scrolling carousel.

**Widgets supporting the grid↔carousel pattern (use `.carousel-track`):** card-grid, gallery, icon-card-grid, icon-list, key-figures, logo-cloud, numbered-cards, pricing, profile-grid, project-showcase, testimonials. *(The slideshow widget is a hero carousel of its own and does not use this `.carousel-track` pattern.)*

#### CSS Classes

| Class | Purpose |
| --- | --- |
| `.carousel-container` | Wrapper with `position: relative` for button positioning |
| `.carousel-track` | Scrollable flex container with `scroll-snap-type: x mandatory` |
| `.carousel-item` | Individual item with `scroll-snap-align: start` |
| `.carousel-btn` | Prev/next button (hidden by default; revealed on container hover/focus at 990px+) |
| `.carousel-btn-prev` | Positioned at left edge (`inset-inline-start: -2.2rem` at desktop) |
| `.carousel-btn-next` | Positioned at right edge (`inset-inline-end: -2.2rem` at desktop) |
| `.carousel-btn-icon` | SVG chevron icon inside buttons |

#### Responsive Behavior

```
Mobile (<750px):   ~85% width per item, buttons hidden, swipe to scroll
Tablet (750px+):   ~50% width per item, buttons hidden
Desktop (990px+):  var(--carousel-cols, 4) columns; prev/next buttons appear on hover/focus
```

#### Column Control

The visible column count at desktop is set inline via `--carousel-cols`:

```liquid
<ul class="widget-card-grid carousel-track" style="--carousel-cols: {{ widget.settings.columns_desktop }}">
```

#### JavaScript (`carousel.js`)

Enqueued (with `theme: true`, deduped) by carousel-capable widgets and rendered via `{% footer_assets %}`. It auto-initializes all `.carousel-container` elements:

- Prev/next buttons scroll by one item width + gap
- Buttons auto-disable at scroll boundaries
- `ResizeObserver` updates button state on container resize
- `MutationObserver` on `#main-content` picks up dynamically added carousels

No per-widget JavaScript is needed for carousel layouts. See [theming-widgets.md](theming-widgets.md) for the full grid↔carousel template pattern.

---

## Component Patterns

### Cards

#### Base Card (`.widget-card`)

```css
.widget-card {
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
  border: var(--card-border);
  border-radius: var(--radius-md);
  /* density-aware padding (see Card Grid above) */
  padding: calc(var(--card-padding, var(--card-padding-auto)) * var(--spacing-scale));
  transition: border-color var(--transition-speed-normal);
}
```

Card appearance is driven by the [style tokens](#style-tokens-class-driven) (`--card-border`, `--radius-md`, `--spacing-scale`), set by body classes from theme style settings. There is no `--card-shadow` / `box-shadow` on the base card. On `corner-rounded`, `.widget-card-image` gets `border-radius: calc(var(--radius-md) / 2)` for a concentric-corners look.

#### Card Sub-Components

| Class                      | Purpose           | Key Styles                                                   |
| -------------------------- | ----------------- | ------------------------------------------------------------ |
| `.widget-card-flat`        | No-border variant | `background: var(--bg-secondary)`, no border/shadow          |
| `.widget-card-header`      | Header section    | `margin-block-end: var(--space-lg)`                          |
| `.widget-card-content`     | Main body         | `flex: 1` (fills remaining space)                            |
| `.widget-card-footer`      | Bottom section    | `margin-block-start: auto` (pushes to bottom)                |
| `.widget-card-image`       | Cover image       | `aspect-ratio: var(--card-image-ratio, 16/9)`, `object-fit: cover` |
| `.widget-card-icon`        | Accent icon       | `--icon-size-lg`, `color: --accent`                          |

Card typography uses `w-*` + `t-*` classes: `w-title` for titles, `w-eyebrow`/`w-meta` for subtitles, `w-body w-rte` for descriptions.

### Buttons

#### Base Button (`.widget-button`)

The default button is a **secondary** (outlined) style:

```css
.widget-button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 0.8rem 1.6rem;
  font-size: calc(var(--font-size-sm) * var(--body-scale));
  background-color: transparent;
  color: var(--text-content);
  border: var(--border-width-medium) solid var(--accent);
  border-radius: var(--radius-button);
  transition: all 0.3s;
}
.widget-button:hover {
  background-color: var(--accent);
  color: var(--accent-text);
}
```

Button border-radius is driven by `--radius-button`, which responds to the `corner-*` and `buttons-*` body classes.

#### Button Variants

| Class                      | Effect                                                   |
| -------------------------- | -------------------------------------------------------- |
| `.widget-button-primary`   | Filled with `--accent` background, `--accent-text` color |
| `.widget-button-secondary` | Outlined with `--accent` border (default style)          |

#### Button Sizes

| Class                   | Padding         | Font Size                 |
| ----------------------- | --------------- | ------------------------- |
| (default)               | `0.8rem 1.6rem` | `--font-size-sm` (14px)   |
| `.widget-button-medium` | `1.2rem 2.4rem` | `--font-size-base` (16px) |
| `.widget-button-large`  | `1.6rem 3.2rem` | `--font-size-lg` (18px)   |
| `.widget-button-xlarge` | `2rem 4.8rem`   | `--font-size-xl` (20px)   |

#### Button Modifiers & Container

- `.widget-button-full` — Full-width (`width: 100%`, centered text)
- `.widget-button-icon` — Icon inside button (`1.6rem` square, `stroke: currentColor`)
- `.widget-actions` — Flex container for buttons: `gap: var(--space-md)`, `flex-wrap: wrap`, centered by default

### Forms

| Class | Purpose | Key Styles |
| --- | --- | --- |
| `.form-group` | Vertical field container | `flex column`, `gap: --space-xs` |
| `.form-label` | Field label | `font-size: sm × body-scale`, `color: --text-content` |
| `.form-input` | Text input | Full width, `padding: sm md`, `border: thin`, `radius: --radius-sm`, focus: `border-color: --text-heading` |
| `.form-textarea` | Multi-line input | Same as input + `min-height: 15rem`, `resize: vertical` |
| `.form-select` | Dropdown select | Custom chevron via SVG background-image |
| `.form-checkbox-group` | Checkbox + label row | `flex`, `gap: --space-sm` |
| `.form-checkbox` | Checkbox input | `2rem` square, `accent-color: --text-heading` |
| `.form-checkbox-label` | Checkbox label | `font-size: base`, `cursor: pointer` |

Legacy aliases `.widget-label` and `.widget-input` also exist for backwards compatibility.

### Icons

Two icon systems coexist:

| Class                | Size Token       | Dimensions |
| -------------------- | ---------------- | ---------- |
| `.widget-icon`       | `--icon-size-lg` | 32px       |
| `.widget-icon-small` | `--icon-size-sm` | 20px       |
| `.widget-icon-large` | `--icon-size-xl` | 48px       |

A newer **icon design system** (`.w-icon` + style/size/shape modifiers) supports plain / outline / filled treatments: `.w-icon-plain | .w-icon-outline | .w-icon-filled`, sizes `.w-icon-sm | -md | -lg | -xl`, and shapes `.w-icon-sharp | -rounded | -circle`. Icons use `stroke: currentColor` (or `--accent` for `.w-icon`) for color inheritance.

---

## Block System

### Block Item Background/Overlay (`.block-item`)

The block system mirrors the widget background/overlay system for individual blocks within a widget, reusing the same `--widget-bg-*` variables:

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

When used, the `--widget-bg-*` / `--widget-overlay-*` variables are set inline on the block element so they scope to that specific block rather than inheriting widget-level values.

---

## Global Components

### Site Header (`.widget-site-header`)

The header is a global widget with responsive behavior:

**Mobile (< 990px):**

- Slide-out navigation panel from the right (`.header-nav`, fixed, `32rem` wide / `85vw` max)
- Hamburger toggle button (`.menu-toggle`)
- Mobile CTA button visible inside the panel; contact info shown via `.header-contact-mobile`

**Desktop (990px+):**

- Horizontal inline navigation, hover dropdown submenus
- Desktop CTA (`.desktop-cta`) visible; mobile CTA hidden
- Contact info (`.header-contact-right` / `.header-end`) visible
- Optional centered layout via `.header-inner.header-center-nav` (3-column grid)

Modifiers: `.header-sticky`, `.header-scrolled`.

#### Transparent Header

The header supports a transparent overlay mode for hero-type widgets. When enabled, the header sits on top of the first widget rather than above it.

**How it works:**

1. The header schema has a `transparent_on_hero` checkbox setting.
2. Widgets declare support via `"supportsTransparentHeader": true` in their `schema.json`.
3. The backend checks the first widget on each page — if it supports the transparent header and the setting is enabled, a `transparent-header` class is added to `<body>`.
4. CSS rules in `base.css` handle the visual states.

**Supporting widgets (Arch theme):** banner, slideshow, video-popup.

**CSS states:**

| Selector | Behavior |
|----------|----------|
| `.transparent-header .widget-site-header:not(.header-sticky)` | Absolute positioning, scrolls away with page |
| `.transparent-header .widget-site-header.header-sticky:not(.header-scrolled)` | Fixed, transparent background |
| `.transparent-header .widget-site-header.header-sticky.header-scrolled` | Fixed, solid background (normal header appearance) |

**Colors:** the transparent state uses the **highlight** palette variables (`--colors-highlight_text_heading`, `--colors-highlight_accent`, etc.) without a background, keeping it consistent with the theme's color configuration.

**Transparent logo:** an optional `transparent_logo` image setting shows a light logo variant when the header is transparent. CSS toggles `.header-logo-default` / `.header-logo-transparent` visibility based on header state.

**First widget padding:** `.transparent-header .main-content > :first-child` receives `padding-block-start: var(--header-sticky-offset, 4.5rem)` to compensate for the overlapping header.

#### Navigation Structure

```
.widget-site-header
  .header-inner (flex, space-between; or .header-center-nav 3-col grid)
    .header-branding
      .header-logo (text or image link)
      .header-contact (desktop contact info)
    .header-actions
      .menu-toggle (hamburger, hidden at 990px+)
      .desktop-cta (button, hidden below 990px)
    .header-nav (slide-out panel on mobile, inline on desktop)
      .nav-close (close button, hidden at 990px+)
      .nav-list
        .nav-item
          a (nav link)
          .submenu-toggle (chevron button, mobile only)
          .nav-submenu (dropdown / accordion; supports 3 levels)
      .mobile-cta (button, hidden at 990px+)
      .header-contact-mobile (contact info, mobile only)
```

#### Submenu Behavior

| Viewport | Behavior |
| --- | --- |
| Mobile | Accordion-style expand/collapse via `.submenu-open` (`max-height` transition). |
| Desktop | Hover/focus-triggered dropdown via `opacity`/`visibility`/`transform`. Third-level menus open to the side; `.submenu-flip` flips direction (and the chevron) when they would overflow the viewport. |

### Site Footer (`.widget-footer`)

Vertically stacked layout (`padding-block: 8rem 2rem`, top border):

```
.widget-footer
  .footer-content (flex column)
    .footer-column / .footer-logo
    .footer-menu (link list)
      .footer-menu-link
    .footer-social (social-link icons)
    .footer-badges (.footer-badge → .footer-badge-image)
    .footer-copyright (xs, muted, centered, top border)
```

---

## Utility Classes

### Content Flow (`.content-flow`)

Adds vertical spacing between adjacent siblings (owl selector):

```css
.content-flow > * + * {
  margin-block-start: var(--space-md); /* 16px */
}
.content-flow > .widget-actions:last-child {
  margin-block-start: var(--space-xl); /* 32px - extra space before buttons */
}
```

### Feature Lists

| Class               | Purpose                                                        |
| ------------------- | -------------------------------------------------------------- |
| `.features-list`    | Container — flex column, `gap: --space-xs`, resets list styles |
| `.feature-item`     | Row — flex, `gap: --space-xs` (add `w-body` for text styling)  |
| `.feature-icon`     | Icon wrapper — `flex-shrink: 0`, `color: --text-content`       |
| `.feature-icon-svg` | Icon SVG — `1em` square                                        |

### Accessibility Helpers

| Class              | Purpose                                                                             |
| ------------------ | ----------------------------------------------------------------------------------- |
| `.visually-hidden` | Hides element visually but keeps it accessible to screen readers (clip rect)        |
| `.skip-link`       | Hidden by default; becomes visible on focus — positioned absolute with z-index 9999 |

---

## Style Classes (Body Class Pattern)

The Arch theme uses **body classes** to implement global style settings that affect shapes, spacing density, and button shape. These classes are applied to `<body>` in `layout.liquid` from the `style` category in `theme.json`.

### How It Works

1. **`theme.json`** defines select settings in the `style` category (`corner_style`, `spacing_density`, `button_shape`).
2. **`layout.liquid`** renders body classes from setting values: `corner-{{ theme.style.corner_style | default: 'sharp' }} spacing-{{ theme.style.spacing_density | default: 'default' }} buttons-{{ theme.style.button_shape | default: 'auto' }}`.
3. **`base.css`** defines class-based rulesets that override the default `:root` tokens.
4. **Live preview**: the `UPDATE_STYLE_CLASSES` message swaps body classes without a full page reload (see [core-page-editor.md](core-page-editor.md)).

### Setting-to-Class Mapping

| Setting ID (`theme.json`) | Body Class Prefix | Default Value | Options |
| --- | --- | --- | --- |
| `corner_style` | `corner-` | `sharp` | `sharp`, `slightly-rounded`, `rounded` |
| `spacing_density` | `spacing-` | `default` | `compact`, `default`, `airy` |
| `button_shape` | `buttons-` | `auto` | `auto`, `pill`, `sharp` |

### Class Rulesets

#### Shapes (`corner-*`)

| Class | Effect |
| --- | --- |
| `corner-sharp` (default) | All radii `0` — square corners everywhere (set via `:root` defaults; no `corner-sharp` rule needed) |
| `corner-slightly-rounded` | `--radius-sm: 0.4rem`, `--radius-md: 0.6rem`, `--radius-lg: 0.8rem`, `--radius-button: 0.4rem`, `--radius-marker: 0.8rem` |
| `corner-rounded` | `--radius-sm: 0.6rem`, `--radius-md: 1.2rem`, `--radius-lg: 1.6rem`, `--radius-button: 0.8rem`, `--radius-marker: 50%` |

#### Layout Density (`spacing-*`)

| Class | Effect |
| --- | --- |
| `spacing-compact` | `--spacing-scale: 0.8` — tighter section spacing and card padding |
| `spacing-default` | `--spacing-scale: 1` — standard spacing (the `:root` default; no class rule needed) |
| `spacing-airy` | `--spacing-scale: 1.2` — more generous breathing room |

#### Button Shape (`buttons-*`)

| Class | Effect |
| --- | --- |
| `buttons-auto` (default) | Buttons use `--radius-button` from the active `corner-*` class |
| `buttons-pill` | `--radius-button: 99rem` — fully rounded pill buttons regardless of corner setting |
| `buttons-sharp` | `--radius-button: 0` — square buttons regardless of corner setting |

### Consuming Style Tokens in Widgets

Widgets should reference the style tokens rather than hardcoding values:

```css
/* Correct — responds to style settings */
.my-card {
  border: var(--card-border);
  border-radius: var(--radius-md);
  padding: calc(var(--space-lg) * var(--spacing-scale));
}
.my-button { border-radius: var(--radius-button); }
.my-image { border-radius: var(--radius-lg); }

/* Wrong — hardcoded, ignores user's style choices */
.my-card { border: 1px solid #e0e0e0; border-radius: 8px; }
```

### Per-Widget Token Usage

Widgets that already inherit via `.widget-card` need no extra work (card-grid, icon-card-grid, pricing, testimonials, numbered-cards, key-figures, event-list, job-listing, content-switcher, project-showcase, gallery, masonry-gallery).

Widgets with custom token usage (selected):

| Widget | Element | Token |
|---|---|---|
| image | `.image-wrapper`, `.image-link` (when not fullwidth) | `--radius-lg` |
| slideshow | `.slideshow-constrained` | `--radius-lg` |
| banner | section (when not fullwidth) | `--radius-lg` |
| accordion | `.accordion-item`, `.accordion-list` (bordered) | `--radius-sm` |
| content-switcher | `.switcher-btn` | `--radius-button` |
| image-tabs | `.image-tabs-image-area` | `--radius-md` |
| image-hotspots | `.image-hotspots-wrapper` / `.image-hotspot-tooltip` | `--radius-md` / `--radius-sm` |
| testimonial-hero | `.testimonial-image-wrapper` | `--radius-lg` |
| timeline | `.timeline-content` / `.timeline-marker` | `--radius-sm` / `--radius-marker` |
| steps | `.steps-badge` | `--radius-marker` |
| video-embed | iframe | `--radius-md` |
| map | `.map-container` | `--radius-md` |

Widgets intentionally **not** affected by shapes include fullwidth banner/slideshow/split-hero (edge-to-edge backgrounds), profile-grid/testimonials avatars and hotspot dots (`border-radius: 50%`), and gallery/masonry/project-showcase card images (`border-radius: 0` — the image fills the card while the card carries the radius).

---

## Scroll Reveal Animations

### Overview

The reveal system animates elements into view as the user scrolls. It is **opt-in** via the `enable_reveal_animations` setting in `theme.json` (default **off**). When disabled, `layout.liquid` injects an inline `<style>` forcing all `.reveal` elements visible, and `reveal.js` is not loaded.

### Usage

Add `.reveal` and (optionally) a direction class to any element:

```html
<div class="reveal reveal-up" style="--reveal-delay: 2">Content appears from below with a 0.2s delay</div>
```

### Direction Variants

| Class           | Starting Transform                           |
| --------------- | -------------------------------------------- |
| `.reveal-up`    | `translateY(2rem)` — slides up from below    |
| `.reveal-down`  | `translateY(-2rem)` — slides down from above |
| `.reveal-left`  | `translateX(2rem)` — slides in from right    |
| `.reveal-right` | `translateX(-2rem)` — slides in from left    |
| `.reveal-scale` | `scale(0.95)` — scales up                    |

A bare `.reveal` with no direction class is a plain fade (opacity only — no transform).

### Hidden State (`.reveal`)

```css
.reveal {
  opacity: 0;
  transition: opacity 0.6s ease-out, transform 0.6s ease-out;
  transition-delay: calc(var(--reveal-delay, 0) * 0.1s);
}
```

### Revealed State (`.reveal.revealed`)

Applied by `reveal.js` when the element enters the viewport:

```css
.reveal.revealed { opacity: 1; transform: none; }
```

### Staggered Delays

Use `--reveal-delay` (inline style) to stagger. Each increment adds `0.1s`:

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

| Breakpoint | Width     | Purpose                                            |
| ---------- | --------- | -------------------------------------------------- |
| Mobile     | `< 750px` | Single column, mobile navigation                   |
| Tablet     | `750px+`  | Two-column grids, increased spacing                |
| Desktop    | `990px+`  | Full grid columns, desktop navigation, max spacing |

Widget-authoring docs sometimes reference a `1200px` "desktop large" tier for completeness, but Arch's `base.css` does not use it.

### Key Responsive Behaviors

| Element         | Mobile          | Tablet (750px+) | Desktop (990px+)              |
| --------------- | --------------- | --------------- | ----------------------------- |
| Grid columns    | 1               | 2               | `var(--grid-cols-desktop, 3)` |
| Section spacing | 64px            | 64px            | 80px                          |
| Card padding    | 24px            | 32px            | dense-aware (≤32px)           |
| Card title size | 18px            | 18px            | 20px                          |
| Navigation      | Slide-out panel | Slide-out panel | Horizontal dropdown           |
| Header contact  | In panel        | In panel        | Visible                       |
| Header CTA      | Mobile CTA      | Mobile CTA      | Desktop CTA                   |

---

## CSS Variable Pipeline

How user-configured theme values flow from `theme.json` settings to rendered CSS:

### 1. Configuration (theme.json)

Settings with `"outputAsCssVar": true` (the 18 colors + `heading_scale` + `body_scale`) and `font_picker` types are candidates for CSS variable generation:

```json
{
  "type": "color",
  "id": "standard_accent",
  "label": "tTheme:global.colors.settings.standard_accent.label",
  "default": "#0f172a",
  "outputAsCssVar": true
}
```

Labels, displayNames, descriptions, and option labels in `theme.json` and widget `schema.json` use `tTheme:`-prefixed keys, resolved at runtime by the `useThemeLocale` hook's `tTheme()` function (strips the prefix, walks dot-paths through the theme locale JSON).

### 2. Processing (themeSettings.js)

The `{% theme_settings %}` tag (`packages/core/src/tags/themeSettings.js`) reads every global setting and:

- **`outputAsCssVar` settings** (colors, ranges): emits `--{category}-{id}: {value};` (appending a unit for `range` settings that define one).
- **`font_picker` settings**: emits `--{category}-{id}-family`, `--{category}-{id}-weight`, and (for `body_font`) `--{category}-{id}_bold-weight` via smart-bold lookup.

CSS values are passed through a `<>{}`-stripping escape as defense-in-depth against `<style>` breakout.

### 3. Output (injected `<style>`)

```html
<style id="theme-settings-styles">
:root {
  --colors-standard_bg_primary: #ffffff;
  --colors-standard_accent: #0f172a;
  --colors-highlight_bg_primary: #0f172a;
  --typography-heading_font-family: "Inter", sans-serif;
  --typography-heading_font-weight: 600;
  --typography-body_font-family: "Inter", sans-serif;
  --typography-body_font-weight: 400;
  --typography-body_font_bold-weight: 700;
  /* ... all 18 colors + 2 scale ranges + typography variables */
}
</style>
```

### 4. Consumption (base.css)

The design system reads the injected variables via `var()` with fallbacks:

```css
:root {
  --accent: var(--colors-standard_accent, #0d47b7);
}
.color-scheme-highlight-primary {
  --accent: var(--colors-highlight_accent, #de1877);
}
body {
  font-family: var(--typography-body_font-family, ...fallback...);
}
```

### Variable Naming Convention

| Layer                     | Pattern               | Example                      |
| ------------------------- | --------------------- | ---------------------------- |
| Theme settings (injected) | `--{category}-{id}`   | `--colors-standard_accent`   |
| Design tokens (base.css)  | `--{semantic-name}`   | `--accent`, `--text-heading` |
| Component tokens          | `--widget-{property}` | `--widget-bg-color`          |
| Grid tokens               | `--grid-{property}`   | `--grid-cols-desktop`        |

---

## Widget Template Conventions

This is the design-system-level summary. For the complete widget-authoring reference (schema conventions, JS lifecycle, asset enqueueing, block types, accessibility checklist), see [theming-widgets.md](theming-widgets.md). For per-setting-type details, see [theming-setting-types.md](theming-setting-types.md).

### Standard Widget Root Element

```liquid
<section
  id="{{ widget.id }}"
  class="widget widget-type-{name} widget-{{ widget.id }} color-scheme-{{ widget.settings.color_scheme }} {modifiers}"
  {% unless widget.settings.color_scheme == 'standard-primary' %}
    style="--widget-bg-color: var(--bg-primary);"
  {% endunless %}
  data-widget-id="{{ widget.id }}"
  data-widget-type="{name}"
  {% if widget.index != null %}data-widget-index="{{ widget.index }}"{% endif %}
>
```

Key attributes: `id` (anchor), `widget` (base styles), `widget-type-{name}` (type scoping), `widget-{{ widget.id }}` (instance-scoped `<style>` boundary), `color-scheme-{value}` (palette remap), and `data-widget-id`/`-type`/`-index` (editor integration).

### Scoped Widget Styles

Widgets that need custom CSS use instance-scoped `<style>` blocks with native nesting (`&`) under the unique `.widget-{{ widget.id }}` class:

```liquid
<style>
  .widget-{{ widget.id }} {
    & .my-custom-element { /* scoped to this instance */ }
    @media (min-width: 990px) {
      & .my-custom-element { /* desktop overrides */ }
    }
  }
</style>
```

### Container Pattern

```liquid
<div class="widget-container {% unless widget.settings.color_scheme == 'standard-primary' %}widget-container-padded{% endunless %}">
  <!-- Widget content -->
</div>
```

### Heading Level Logic

Widgets use `widget.index` to choose heading levels for semantic hierarchy (`widget.index == 1` → `<h1>`, otherwise `<h2>`). See [theming-widgets.md](theming-widgets.md) for the full heading-hierarchy rules including item-level headings.

### Block Rendering Pattern

Widgets with blocks iterate `widget.blocksOrder` and `{% case block.type %}` to render each type:

```liquid
{% for blockId in widget.blocksOrder %}
  {% assign block = widget.blocks[blockId] %}
  {% case block.type %}
    {% when 'heading' %}<!-- ... -->
    {% when 'text' %}<!-- ... -->
    {% when 'button' %}<!-- ... -->
  {% endcase %}
{% endfor %}
```

---

## Available Widgets (Arch Theme)

The Arch theme ships **58 widgets — 56 page widgets + 2 global** (header, footer). Page widgets:

accordion, action-bar, audio-player, banner, bento-grid, card-grid, checkerboard, class-schedule, comparison-slider, comparison-table, contact-details, content-switcher, countdown, embed, event-list, features-split, gallery, icon-card-grid, icon-list, image, image-callout, image-hotspots, image-tabs, image-text, job-listing, key-figures, logo-cloud, map, masonry-gallery, news-grid, numbered-cards, numbered-service-list, priced-list, pricing, profile-grid, project-showcase, projects-grid, resource-list, rich-text, schedule-table, scrolling-text, services-grid, slideshow, sliding-panels, social-icons, split-content, split-hero, steps, team-highlight, testimonial-hero, testimonial-slider, testimonials, timeline, trust-bar, video-embed, video-popup.

Global widgets: **header**, **footer** (rendered on every page via `{{ header | raw }}` / `{{ footer | raw }}`).

Card-based widgets that support a `layout` setting to switch between grid and carousel display: **card-grid, gallery, icon-card-grid, icon-list, key-figures, logo-cloud, numbered-cards, pricing, profile-grid, project-showcase, testimonials**. See [Carousel Layout](#carousel-layout) for details.

---

**See also:**

- [theming.md](theming.md) — Theme structure, global settings, layout templates
- [theming-widgets.md](theming-widgets.md) — Widget authoring guide
- [theming-setting-types.md](theming-setting-types.md) — All available setting types
- [core-editor-ui-style-guide.md](core-editor-ui-style-guide.md) — Editor UI (React/Tailwind) style guide
