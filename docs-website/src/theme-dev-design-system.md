---
description: Build a design system for Widgetizer themes with CSS tokens and utilities. Typography, spacing, colors, and responsive layout patterns.
---

Many themes include a design system in `assets/base.css`. This page summarizes the tokens and utilities that keep theme styles consistent and reusable. The Arch theme ships with a full design system, but you can build a lighter or more opinionated system depending on your goals.

# Design Tokens (base.css)

Arch defines tokens for typography, spacing, colors, layout, and borders in `themes/arch/assets/base.css`. You can also organize tokens by component family (buttons, cards) or by functional scale (space, type, elevation).

### Typography Scale

Common tokens:

- `--font-size-xs`
- `--font-size-base`
- `--font-size-2xl`
- `--font-size-4xl`

### Spacing Scale

Common tokens:

- `--space-xs`
- `--space-md`
- `--space-xl`
- `--space-4xl`

### Container Widths

- `--container-max-width`
- `--content-width-sm`
- `--content-width-md`
- `--content-width-lg`

### Borders and Colors

Tokens often map to theme settings:

- `--border-color`
- `--text-content`
- `--text-heading`
- `--bg-primary`
- `--accent`

# Color Scheme System

Widgets switch between schemes using:

- `color-scheme-standard`
- `color-scheme-highlight`

These classes update semantic variables such as `--text-content`, `--bg-primary`, and `--accent`.

# Typography Utilities

Arch provides utility classes so widgets avoid hardcoded typography, but you can choose any naming scheme or skip utilities entirely and rely on component styles.

### Block Text Utilities

Use:

- `block-text-{size}` (size scale)
- `block-text-{weight}` (weight scale)
- `block-text-{color}` (semantic colors)

### Semantic Hooks

These classes provide consistent targeting across widgets:

- `.widget-headline`
- `.widget-title`
- `.widget-description`
- `.widget-eyebrow`

# Layout Utilities

### Container System

Use `widget-container` and `widget-container-padded` for consistent spacing.

### Content Width

Use:

- `widget-content-sm`
- `widget-content-md`
- `widget-content-lg`

### Grid Utilities

Use `widget-grid` with modifiers:

- `widget-grid-2`
- `widget-grid-3`
- `widget-grid-4`

Or set `--grid-cols-desktop` inline for custom layouts.

### Content Flow

The `content-flow` utility uses the `* + *` pattern to add consistent vertical spacing between adjacent elements without manual margins.

# CSS Conventions

### CSS Nesting

Arch uses native CSS nesting with `&` in widget styles and utilities, but you can also write flat selectors if you prefer.

### Logical Properties

Use logical properties (`margin-inline-start`, `padding-block-end`) to support RTL languages.

### Breakpoints

Arch expresses breakpoints in `rem` and aligns them with the widget grid system:

- `< 750px` (mobile)
- `>= 750px` (tablet)
- `>= 990px` (desktop)
- `>= 1200px` (large desktop)

# Practical Guidance

### Use Tokens First

Avoid hardcoded values. Use the token scale so widgets stay consistent across themes.

### Keep Utilities Central

Shared patterns (grids, buttons, forms) should live in `base.css`, not individual widgets.

For how theme settings emit CSS variables, see [Theme Manifest & Settings](theme-dev-manifest-settings.html).
