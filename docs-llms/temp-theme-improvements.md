# Arch Theme Flexibility Improvements

Goal: Make the arch theme flexible enough that presets can look genuinely different — not just recolored versions of the same design.

## Current Preset Levers

Presets can currently only override:
- 18 colors (9 standard + 9 highlight)
- 2 fonts (heading + body)

All presets share identical structure, spacing, border radius, button style, card style, and layout.

## Proposed Global Settings (theme.json)

These are added to `theme.json` so presets can override them via `preset.json`.

### 1. Border Radius (range)

- **Setting**: `border_radius` in a new `style` group
- **Type**: range, 0–24px, step 2, unit px, `outputAsCssVar: true`
- **Default**: 8px (current hardcoded ~0.5rem equivalent)
- **Impact**: Cards, buttons, inputs, modals, images in cards, accordions, tabs — almost every component uses hardcoded `0.5rem` border-radius in base.css
- **CSS**: Replace all hardcoded `border-radius: 0.5rem` with `var(--style-border_radius)` in base.css
- **Preset examples**: 0px (sharp/corporate), 8px (default), 16px (soft/friendly), 24px (pill-like)

### 2. Button Style (select)

- **Setting**: `button_style` in `style` group
- **Type**: select
- **Options**: `filled` (solid bg, no border), `outlined` (transparent bg, border), `pill` (filled + large border-radius)
- **Default**: `outlined` (current arch default)
- **Impact**: `.widget-button` and `.widget-button-primary` in base.css
- **CSS**: Add modifier classes or conditional styles based on `var(--style-button_style)` or class-based approach via layout.liquid body class
- **Preset examples**: Law firm = outlined, coaching = filled, creative = pill

### 3. Card Style (select)

- **Setting**: `card_style` in `style` group
- **Type**: select
- **Options**: `bordered` (border, no shadow), `shadow` (no border, box-shadow), `flat` (no border, secondary bg only)
- **Default**: `bordered` (current arch default)
- **Impact**: `.widget-card` in base.css — used by card-grid, icon-card-grid, pricing, testimonials, profile-grid, etc.
- **CSS**: Conditional styles on `.widget-card` based on body class or CSS variable
- **Preset examples**: Professional = bordered, modern = shadow, minimal = flat

### 4. Container Max Width (range)

- **Setting**: `container_max_width` in `layout` group (existing group)
- **Type**: range, 1000–1600px, step 20, unit px, `outputAsCssVar: true`
- **Default**: 1420 (current hardcoded value)
- **Impact**: `--container-max-width` in base.css
- **CSS**: Already uses `--container-max-width`, just needs to be connected to the theme setting instead of hardcoded
- **Preset examples**: 1200px (compact/editorial), 1420px (default), 1600px (wide/dashboard)

### 5. Section Spacing (select)

- **Setting**: `section_spacing` in `layout` group
- **Type**: select
- **Options**: `compact`, `default`, `spacious`
- **Default**: `default`
- **Impact**: `--section-padding-block` responsive values in base.css (currently 64px → 80px → 96px)
- **CSS**: Override `--section-padding-block` based on selection: compact (48→56→64), default (64→80→96), spacious (80→96→128)
- **Preset examples**: Dashboard/corporate = compact, default, creative/luxury = spacious

### 6. Heading Style (select)

- **Setting**: `heading_style` in `typography` group (existing group)
- **Type**: select
- **Options**: `normal`, `uppercase`
- **Default**: `normal`
- **Impact**: All headings (h1–h6) and `.block-text-heading` in base.css
- **CSS**: Add `text-transform: uppercase; letter-spacing: 0.05em` to headings when selected
- **Preset examples**: Law firm/financial = uppercase, coaching/restaurant = normal

## Proposed Widget-Level Settings

These are per-widget settings that can be varied through preset template overrides.

### 7. Header: Center Navigation (DONE)

- Already implemented as `center_nav` checkbox in header schema.json
- CSS grid approach with `display: contents` on `.header-actions`

### 8. Header: Additional Layout Options (Future)

- Hide contact details toggle
- Logo position variants
- CTA button style override

## Implementation Order

Recommended sequence (highest visual impact first):
1. Border radius — single setting, massive visual impact across all widgets
2. Button style — changes CTA feel across the entire site
3. Card style — affects many content widgets
4. Heading style — simple CSS, big typographic impact
5. Section spacing — affects page rhythm
6. Container max width — subtle but important for preset identity

## Preset Update Plan

After adding these settings, update existing presets to use them:

- **Accounting**: border_radius 4px, button_style outlined, card_style bordered, heading_style uppercase, section_spacing default
- **Financial**: border_radius 2px, button_style filled, card_style shadow, heading_style uppercase, section_spacing compact
- **Coaching**: border_radius 16px, button_style filled, card_style flat, heading_style normal, section_spacing spacious
- **Legal**: border_radius 0px, button_style outlined, card_style bordered, heading_style uppercase, section_spacing compact

## CSS Variable Strategy

All new settings use `outputAsCssVar: true` where possible so base.css can consume them directly. For select-based settings (button_style, card_style, section_spacing, heading_style), the approach is:

1. Output the value as a CSS variable via `outputAsCssVar`
2. In `layout.liquid`, add a body class: `style-buttons-{{ theme.style.button_style }}` etc.
3. In base.css, use body-level class selectors to apply style variations

This avoids per-widget template changes — the styling is purely CSS-driven from the body class.
