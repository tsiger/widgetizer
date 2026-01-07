# Widgetizer Design System Reference

> **Last Updated:** January 4, 2026 **Status:** ✅ Active - Complete design system implemented in `base.css`

## 📋 Table of Contents

### Foundation

1. [Overview](#overview)
2. [CSS Variables Reference](#css-variables-reference)

### Layout Systems

3. [Spacing System](#spacing-system)
4. [Container System](#container-system)
5. [Grid System](#grid-system)

### Visual Systems

6. [Color Scheme System](#color-scheme-system)
7. [Border System](#border-system)
8. [Background System](#background-system)

### Typography

9. [Typography System](#typography-system)

### Components

10. [Card System](#card-system)
11. [Button System](#button-system)
12. [Actions Container](#actions-container)
13. [Filter / Tab System](#filter--tab-system)
14. [Testimonial System](#testimonial-system)

### Patterns & Reference

15. [Widget Structure Patterns](#widget-structure-patterns)
16. [Quick Reference](#quick-reference)

---

## Overview

The Widgetizer design system provides a complete set of CSS variables, utility classes, and patterns for building consistent, maintainable widgets.

### Design Principles

- **Wireframe Mode** - No decorative colors, backgrounds, or shadows
- **Consistency** - All widgets use the same design tokens
- **Flexibility** - Per-instance customization via CSS custom properties
- **Accessibility** - WCAG-compliant by default
- **RTL Support** - Logical properties throughout

### Technical Constraints

- **Single File** - All utilities in `theme.css`
- **CSS Variables** - All reusable values as custom properties
- **Container Width** - `142rem` (1420px) max-width
- **Unit System** - `rem` exclusively (`html { font-size: 62.5%; }`)
  - `0.1rem = 1px` (e.g., `1.6rem = 16px`, `3.2rem = 32px`)
- **Breakpoints** - Mobile-first: 750px, 990px, 1200px

---

## CSS Variables Reference

All design tokens are defined as CSS custom properties in `:root`. These variables provide the foundation for all styling.

### Spacing Scale

```css
:root {
  /* Spacing (0.1rem = 1px) */
  --space-xs: 0.8rem; /* 8px */
  --space-sm: 1.2rem; /* 12px */
  --space-md: 1.6rem; /* 16px */
  --space-lg: 2.4rem; /* 24px */
  --space-xl: 3.2rem; /* 32px */
  --space-2xl: 4rem; /* 40px */
  --space-3xl: 4.8rem; /* 48px */
  --space-4xl: 6.4rem; /* 64px */
  --space-5xl: 8rem; /* 80px */
  --space-6xl: 9.6rem; /* 96px */

  /* Section Spacing (responsive) */
  --section-padding-block: var(--space-4xl); /* 64px mobile */
  --section-padding-inline: var(--space-lg); /* 24px */
}

@media (min-width: 750px) {
  :root {
    --section-padding-block: var(--space-5xl); /* 80px tablet */
  }
}

@media (min-width: 990px) {
  :root {
    --section-padding-block: var(--space-6xl); /* 96px desktop */
  }
}
```

### Typography Scale

```css
:root {
  /* Font Sizes */
  --font-size-xs: 1.2rem; /* 12px */
  --font-size-sm: 1.4rem; /* 14px */
  --font-size-base: 1.6rem; /* 16px */
  --font-size-lg: 1.8rem; /* 18px */
  --font-size-xl: 2rem; /* 20px */
  --font-size-2xl: 2.4rem; /* 24px */
  --font-size-3xl: 2.8rem; /* 28px */
  --font-size-4xl: 3.2rem; /* 32px */
  --font-size-5xl: 4rem; /* 40px */
  --font-size-6xl: 4.8rem; /* 48px */

  /* Line Heights */
  --line-height-tight: 1.2;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.6;

  /* Font Weights */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Letter Spacing */
  --letter-spacing-tight: -0.02em;
  --letter-spacing-normal: 0;
  --letter-spacing-wide: 0.05em;
}
```

### Container Widths

```css
:root {
  /* Main Container */
  --container-max-width: 142rem; /* 1420px */

  /* Content Width Constraints */
  --content-width-sm: 60rem; /* 600px - Forms, modals, newsletter */
  --content-width-md: 80rem; /* 800px - Text-heavy sections, accordion */
  --content-width-lg: 90rem; /* 900px - Hero, CTA, comparison slider */
}
```

### Border System Variables

```css
:root {
  /* Border Widths */
  --border-width-thin: 0.1rem; /* 1px */
  --border-width-medium: 0.2rem; /* 2px */
  --border-width-thick: 0.3rem; /* 3px */

  /* Border Radius */
  --border-radius-sm: 0.4rem; /* 4px */
  --border-radius-md: 0.8rem; /* 8px */
  --border-radius-lg: 1.2rem; /* 12px */
  --border-radius-full: 9999px;

  /* Border Color (from theme setting) */
  --border-color: var(--colors-border_color, #e0e0e0);
}
```

### Color System

All colors are driven by theme settings with sensible fallbacks:

```css
:root {
  /* Text Colors */
  --text-content: var(--colors-text_content, #333); /* Body text */
  --text-heading: var(--colors-text_heading, #000); /* Headings */
  --text-muted: var(--colors-text_muted, #666); /* Secondary text */

  /* Background Colors */
  --bg-primary: var(--colors-bg_primary, #fff); /* Main background */
  --bg-secondary: var(--colors-bg_secondary, #f9f9f9); /* Alt background */

  /* Accent Colors (for buttons, links, highlights) */
  --accent: var(--colors-accent, #000); /* Primary accent */
  --accent-text: var(--colors-accent_text, #fff); /* Text on accent bg */

  /* Inverse Colors (for dark schemes) */
  --inverse-bg: var(--colors-inverse_bg, #000); /* Dark background */
  --inverse-text: var(--colors-inverse_text, #fff); /* Light text */
}
```

### Widget Background System Variables

```css
:root {
  /* Widget Background Defaults */
  --widget-bg-color: transparent;
  --widget-bg-image: none;
  --widget-bg-size: cover;
  --widget-bg-position: center;
  --widget-bg-repeat: no-repeat;
  --widget-bg-attachment: scroll;

  /* Widget Overlay Defaults */
  --widget-overlay-color: transparent;
  --widget-overlay-opacity: 0.5;
}
```

### Transitions

```css
:root {
  /* Transition Speeds */
  --transition-speed-fast: 0.15s;
  --transition-speed-normal: 0.3s;
  --transition-speed-slow: 0.5s;

  /* Easing Functions */
  --transition-ease: cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## Spacing System

### Smart Spacing System

Automatically switches between margin and padding based on background presence:

```css
.widget {
  /* Default: Margin-based spacing (no background) */
  margin-block: var(--section-padding-block);
  padding-block: 0;
  padding-inline: var(--section-padding-inline);

  /* Background present: Padding-based spacing */
  &.has-bg-color,
  &.has-bg-image {
    margin-block: 0;
    padding-block: var(--section-padding-block);
  }
}
```

**Benefits:**

- Natural margin collapse when no background
- Background fills to edges when present
- Same spacing values, intelligent property selection

---

## Container System

### Widget Container

```css
.widget {
  position: relative;
  /* Spacing handled by smart spacing system */
}

.widget-container {
  position: relative;
  z-index: 2;
  max-width: var(--container-max-width); /* 142rem = 1420px */
  margin-inline: auto;
}
```

### Widget Header (Centered Section Headers)

```css
.widget-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-block-end: var(--space-3xl);

  .widget-description {
    max-width: 70rem; /* 700px */
    margin-inline: auto;
  }
}
```

### Content Width Modifiers

```css
/* Small Content (forms, newsletter) */
.widget-content-sm {
  max-width: var(--content-width-sm); /* 60rem = 600px */
  margin-inline: auto;
}

/* Medium Content (accordion, text-heavy) */
.widget-content-md {
  max-width: var(--content-width-md); /* 80rem = 800px */
  margin-inline: auto;
}

/* Large Content (hero, CTA) */
.widget-content-lg {
  max-width: var(--content-width-lg); /* 90rem = 900px */
  margin-inline: auto;
}
```

### Content Alignment Modifiers

```css
/* Content alignment modifiers */
.widget-content-align-center {
  text-align: center;
}

.widget-content-align-start {
  text-align: start;
}
```

### Widget Height Modifiers

Utilities for controlling widget height, useful for hero sections or full-screen layouts.

```css
/* 50% Viewport Height */
.widget-height-half {
  min-height: 50vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* 66% Viewport Height */
.widget-height-two-thirds {
  min-height: 66vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* 100% Viewport Height */
.widget-height-full {
  min-height: 100vh;
  min-height: 100dvh; /* Mobile viewport fix */
  display: flex;
  flex-direction: column;
  justify-content: center;
}
```

**Usage:**

```html
<!-- Narrow content (forms) -->
<div class="widget-content widget-content-sm">
  <!-- Content -->
</div>

<!-- Centered content (hero, CTA) -->
<div class="widget-content widget-content-lg widget-content-align-center">
  <!-- Content -->
</div>

<!-- Left-aligned content (default, explicit) -->
<div class="widget-content widget-content-align-start">
  <!-- Content -->
</div>
```

**Key Points:**

- Use `.widget-content-align-center` for centered text alignment
- Use `.widget-content-align-start` for left/start alignment (explicit, RTL-aware)
- Default alignment is start (left in LTR, right in RTL)
- Modifiers can be combined with width modifiers

---

## Grid System

### Responsive Grid Utilities

```css
.widget-grid {
  display: grid;
  gap: var(--space-lg); /* 24px - standardized across all grids */
}

/* Column Variations */
.widget-grid-2 {
  grid-template-columns: repeat(2, 1fr);
}
.widget-grid-3 {
  grid-template-columns: repeat(3, 1fr);
}
.widget-grid-4 {
  grid-template-columns: repeat(4, 1fr);
}

/* Responsive Behavior */
@media (max-width: 749px) {
  .widget-grid-2,
  .widget-grid-3,
  .widget-grid-4 {
    grid-template-columns: 1fr; /* Stack on mobile */
  }
}

@media (min-width: 750px) and (max-width: 989px) {
  .widget-grid-3,
  .widget-grid-4 {
    grid-template-columns: repeat(2, 1fr); /* 2 columns on tablet */
  }
}
```

---

## Color Scheme System

The color scheme system provides color variants for widgets with different backgrounds. It uses theme-configurable inverse colors.

### Color Scheme Classes

```css
/* Light-on-dark (uses inverse colors from theme settings) */
.color-scheme-dark {
  --text-heading: var(--inverse-text);
  --text-content: var(--inverse-text);
  --text-muted: var(--inverse-text);
  --border-color: var(--inverse-text);
  --bg-primary: var(--inverse-bg);
  --bg-secondary: rgba(255, 255, 255, 0.1);
}

/* Dark-on-light (resets to main theme defaults) */
.color-scheme-light {
  --text-heading: var(--colors-text_heading, #000);
  --text-content: var(--colors-text_content, #333);
  --text-muted: var(--colors-text_muted, #666);
  --border-color: var(--colors-border_color, #e0e0e0);
  --bg-primary: var(--colors-bg_primary, #fff);
  --bg-secondary: var(--colors-bg_secondary, #f9f9f9);
}
```

### Usage

```html
<!-- Dark background with light text -->
<section class="widget has-bg-color color-scheme-dark" style="--widget-bg-color: var(--inverse-bg);">
  <h1 class="widget-headline">Light text on dark background</h1>
</section>

<!-- Revert to light scheme inside a dark section -->
<div class="widget-card color-scheme-light">
  <p>This card uses the main theme colors</p>
</div>
```

**Key Points:**

- `.color-scheme-dark` uses theme `inverse_bg` and `inverse_text` settings
- `.color-scheme-light` resets all colors to the main theme defaults
- Both classes are customizable via theme settings in the admin

---

## Border System

### Card Base Styles

```css
.widget-card {
  border: var(--border-width-thin) solid var(--border-light);
  padding: var(--space-xl);
  transition: border-color var(--transition-speed-normal);

  &:hover {
    border-color: var(--border-darker);
  }
}

/* Responsive Padding */
@media (min-width: 750px) {
  .widget-card {
    padding: var(--space-2xl);
  }
}

@media (min-width: 990px) {
  .widget-card {
    padding: var(--space-3xl);
  }
}
```

---

## Background System

### Widget Background & Overlay

Per-instance background customization via CSS custom properties:

```css
.widget {
  position: relative;
  background-color: var(--widget-bg-color, transparent);
  background-image: var(--widget-bg-image, none);
  background-size: var(--widget-bg-size, cover);
  background-position: var(--widget-bg-position, center);
  background-repeat: var(--widget-bg-repeat, no-repeat);
  background-attachment: var(--widget-bg-attachment, scroll);

  /* Overlay Layer */
  &.has-overlay::before {
    content: "";
    position: absolute;
    inset: 0;
    background-color: var(--widget-overlay-color, transparent);
    opacity: var(--widget-overlay-opacity, 0.5);
    z-index: 1;
    pointer-events: none;
  }
}
```

### Modifier Classes

```css
/* Background Modifiers */
.has-bg-color {
  /* Enables background color */
}
.has-bg-image {
  /* Enables background image */
}
.has-overlay {
  /* Enables overlay layer */
}
```

### Usage Examples

```html
<!-- Solid Color Background -->
<section class="widget-hero widget has-bg-color" style="--widget-bg-color: #f5f5f5;">...</section>

<!-- Background Image with Overlay (color set via style) -->
<section
  class="widget-hero widget has-bg-image has-overlay"
  style="--widget-bg-image: url('hero.jpg');
         --widget-overlay-color: rgba(0, 0, 0, 0.5);"
>
  ...
</section>

<!-- Gradient Background -->
<section
  class="widget-hero widget has-bg-color"
  style="--widget-bg-image: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"
>
  ...
</section>
```

### Block Item Background & Overlay

For blocks/items within widgets that need background support, use `.block-item`. This provides the same CSS variable-driven background/overlay system as `.widget`:

```css
.block-item {
  position: relative;
  background-color: var(--widget-bg-color, transparent);
  background-size: var(--widget-bg-size, cover);
  background-position: var(--widget-bg-position, center);
  background-repeat: var(--widget-bg-repeat, no-repeat);

  /* Overlay pseudo-element (activated by .has-overlay class) */
  &.has-overlay::before {
    content: "";
    position: absolute;
    inset: 0;
    background-color: var(--widget-overlay-color, transparent);
    z-index: 1;
    pointer-events: none;
  }
}
```

### Block Item Usage Examples

```html
<!-- Block with solid color background -->
<div class="block-item has-bg-color" style="--widget-bg-color: #f5f5f5;">...</div>

<!-- Block with background image and overlay -->
<div
  class="block-item has-bg-image has-overlay"
  style="background-image: url('image.jpg'); --widget-overlay-color: rgba(0, 0, 0, 0.5);"
>
  ...
</div>
```

**Key Points:**

- Use `.block-item` on any block/card that needs the background/overlay system
- Uses the same CSS variables as `.widget`: `--widget-bg-color`, `--widget-overlay-color`
- Combine with `.has-bg-color`, `.has-bg-image`, `.has-overlay` modifier classes
- Background image is set via inline `background-image` style, not a CSS variable

---

## Typography System

### Default Heading Sizes

All headings have default sizes defined. Font family, weight, and color are inherited from theme settings.

```css
/* Base heading styles */
h1,
h2,
h3,
h4,
h5,
h6 {
  font-family: var(--typography-heading_font-family, inherit);
  font-weight: var(--typography-heading_font-weight, 700);
  color: var(--text-heading);
  line-height: var(--line-height-tight);
  margin-block-end: var(--space-sm);
}

/* Default heading sizes */
h1 {
  font-size: var(--font-size-5xl);
} /* 36px */
h2 {
  font-size: var(--font-size-4xl);
} /* 32px */
h3 {
  font-size: var(--font-size-3xl);
} /* 28px */
h4 {
  font-size: var(--font-size-2xl);
} /* 24px */
h5 {
  font-size: var(--font-size-xl);
} /* 20px */
h6 {
  font-size: var(--font-size-lg);
} /* 18px */
```

### Typography Utility Classes

These classes adjust margins for specific contexts. They inherit heading styles.

```css
/* Widget Headlines (larger margin for section titles) */
.widget-headline {
  margin-block-end: var(--space-md);
}

/* Widget Titles (standard margin) */
.widget-title {
  margin-block-end: var(--space-sm);
}

/* Widget Subtitles */
.widget-subtitle {
  margin-block-end: var(--space-sm);
}
```

### Text Classes

```css
/* Body Text */
.widget-text,
.widget-description {
  font-size: var(--font-size-base); /* 16px */
  line-height: var(--line-height-relaxed);
  margin-block-end: var(--space-lg);
}

/* Eyebrow Text (labels) */
.widget-eyebrow {
  display: inline-block;
  font-size: var(--font-size-sm); /* 14px */
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
  margin-block-end: var(--space-sm);
}

/* Meta Text (dates, categories) */
.widget-meta {
  font-size: var(--font-size-sm); /* 14px */
  line-height: var(--line-height-normal);
  color: var(--text-muted);
}

/* Responsive Body Text */
@media (min-width: 990px) {
  .widget-text,
  .widget-description {
    font-size: var(--font-size-lg); /* 18px */
  }
}
```

---

## Card System

### Card Grid Container

For grid-based card layouts, use the `.widget-card-grid` class. This provides a consistent responsive grid structure for card collections:

```html
<ul class="widget-card-grid">
  <li class="widget-card" data-block-id="{{ blockId }}">
    <!-- Optional: Image OR Icon -->
    <img src="..." class="widget-card-image" alt="..." />
    <!-- OR -->
    {% render 'icon', icon: 'star', class: 'widget-card-icon' %}

    <div class="widget-card-content">
      <span class="widget-card-subtitle">Category</span>
      <h3 class="widget-card-title">Card Title</h3>
      <p class="widget-card-description">Description text...</p>

      <!-- Optional Button -->
      <div class="widget-card-footer">
        <a href="#" class="widget-button widget-button-secondary">Action</a>
      </div>
    </div>
  </li>
</ul>
```

**Grid Breakpoints:**

- Mobile (< 750px): 1 column
- Tablet (750px+): 2 columns
- Desktop (990px+): 3 columns
- Large (1200px+): 4 columns

### Standard Card Structure

The card system provides a consistent structure for content containers across widgets.

```html
<div class="widget-card">
  <!-- Optional Header -->
  <div class="widget-card-header">
    <span class="widget-card-subtitle">Eyebrow</span>
    <h3 class="widget-card-title">Card Title</h3>
  </div>

  <!-- Optional Image -->
  <img src="..." class="widget-card-image" alt="..." />

  <!-- Main Content -->
  <div class="widget-card-content">
    <p>Card content goes here...</p>
  </div>

  <!-- Optional Footer -->
  <div class="widget-card-footer">
    <a href="#" class="widget-button">Action</a>
  </div>
</div>
```

### Card Classes

| Class                      | Description                                            |
| -------------------------- | ------------------------------------------------------ |
| `.widget-card-grid`        | Responsive grid container (1-4 columns)                |
| `.widget-card`             | Base container with border, padding, and hover effect  |
| `.widget-card-flat`        | Variant with background color instead of border        |
| `.widget-card-header`      | Container for title and subtitle                       |
| `.widget-card-title`       | Primary heading (XL size)                              |
| `.widget-card-subtitle`    | Secondary text, category, or eyebrow label (uppercase) |
| `.widget-card-description` | Muted body text for card content                       |
| `.widget-card-content`     | Main content area (flex-grow, last-child margin reset) |
| `.widget-card-footer`      | Action area at bottom (margin-block-start: auto)       |
| `.widget-card-image`       | Standard 16:9 cover image                              |
| `.widget-card-icon`        | Standard sized icon wrapper                            |

---

## Button System

Buttons use theme accent colors and have two variants: Primary (filled) and Secondary (outlined).

### Base Button (Secondary Style)

```css
.widget-button {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: var(--space-sm);
  padding: 1.2rem 2.4rem;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-normal);
  font-family: inherit;
  background-color: transparent;
  color: var(--accent);
  border: var(--border-width-medium) solid var(--accent);
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background-color: var(--accent);
    color: var(--accent-text);
  }
}
```

### Button Variants

```css
/* Primary Button - Filled with accent color */
.widget-button-primary {
  background-color: var(--accent);
  color: var(--accent-text);
  border-color: var(--accent);

  &:hover {
    background-color: transparent;
    color: var(--accent);
  }
}

/* Secondary Button - Outlined (same as base) */
.widget-button-secondary {
  background-color: transparent;
  color: var(--accent);
  border-color: var(--accent);

  &:hover {
    background-color: var(--accent);
    color: var(--accent-text);
  }
}

/* Size Variants */
.widget-button-large {
  padding: 1.6rem 4rem;
  font-size: var(--font-size-lg);
}
.widget-button-small {
  padding: 0.8rem 1.6rem;
  font-size: var(--font-size-sm);
}

/* Full-width Button */
.widget-button-full {
  display: flex;
  align-self: stretch;
  width: 100%;
  justify-content: center;
}
```

### Usage Examples

```html
<!-- Primary button (filled) -->
<a href="#" class="widget-button widget-button-primary">Get Started</a>

<!-- Secondary button (outlined) -->
<a href="#" class="widget-button widget-button-secondary">Learn More</a>

<!-- Full-width button -->
<a href="#" class="widget-button widget-button-primary widget-button-full">Subscribe</a>
```

**Key Points:**

- Both button variants use the theme's `accent` and `accent_text` colors
- Primary = filled background, Secondary = outlined
- Normal font weight (not bold)
- Colors are customizable via theme settings

---

## Form System

### Form Elements

Standardized styles for form inputs and labels.

```css
.widget-label {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  margin-block-end: var(--space-xs);
}

.widget-input {
  width: 100%;
  padding: 1.2rem 1.6rem;
  font-size: var(--font-size-base);
  font-family: inherit;
  color: var(--text-primary);
  background-color: var(--bg-primary);
  border: var(--border-width-thin) solid var(--border-light);
  transition: border-color 0.3s;

  &:hover {
    border-color: var(--border-medium);
  }

  &:focus {
    outline: var(--border-width-medium) solid var(--border-darker);
    outline-offset: 0.2rem;
    border-color: var(--border-darker);
  }
}
```

### Usage Example

```html
<div class="form-group">
  <label for="email" class="widget-label">Email Address</label>
  <input type="email" id="email" class="widget-input" placeholder="you@example.com" />
</div>
```

---

## Icon Utilities

Standardized sizing and styling for SVG icons.

```css
.widget-icon {
  width: var(--icon-size-lg); /* 3.2rem */
  height: var(--icon-size-lg);
  stroke: currentColor;
  stroke-width: 0.15rem;
}

.widget-icon-small {
  width: var(--icon-size-sm); /* 2rem */
  height: var(--icon-size-sm);
  stroke-width: 0.2rem;
}

.widget-icon-large {
  width: var(--icon-size-xl); /* 4.8rem */
  height: var(--icon-size-xl);
}
```

---

## Actions Container

### Actions Container

````css
```css .widget-actions {
  display: flex;
  flex-direction: row; /* Always row */
  flex-wrap: wrap; /* Wrap if needed */
  gap: 1rem; /* Tighter gap on mobile */

  @media (min-width: 750px) {
    gap: var(--space-lg);
  }
}

/* Actions alignment inherits from parent content alignment */
.widget-content-align-center .widget-actions {
  align-items: center;
  justify-content: center; /* Center on all screens */
}

.widget-content-align-start .widget-actions {
  align-items: flex-start;
  justify-content: flex-start; /* Start on all screens */
}
````

**Usage:**

```html
<!-- Centered actions (with centered content) -->
<div class="widget-content widget-content-align-center">
  <p>Content here...</p>
  <div class="widget-actions">
    <a href="#" class="widget-button">Primary</a>
    <a href="#" class="widget-button">Secondary</a>
  </div>
</div>

<!-- Left-aligned actions (with left-aligned content) -->
<div class="widget-content widget-content-align-start">
  <p>Content here...</p>
  <div class="widget-actions">
    <a href="#" class="widget-button">Primary</a>
    <a href="#" class="widget-button">Secondary</a>
  </div>
</div>
```

**Key Points:**

- Use `.widget-actions` for button/action containers
- Alignment automatically inherits from parent `.widget-content-align-*` class
- Stacks vertically on mobile, horizontally on tablet+
- Works with all button variants (`.widget-button`, `.widget-button-large`, etc.)

---

## Filter / Tab System

### Filter List Container

```css
.widget-filter-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-md);
  justify-content: center;
  margin-block-end: var(--space-2xl);
  padding: 0;
  list-style: none;
}
```

### Filter Button

```css
.widget-filter-btn {
  padding: var(--space-sm) var(--space-lg);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  font-family: inherit;
  background-color: var(--bg-primary);
  border: var(--border-width-thin) solid var(--border-light);
  color: var(--text-muted);
  cursor: pointer;
  transition:
    background-color 0.3s,
    color 0.3s,
    border-color 0.3s;

  &:hover {
    background-color: var(--text-primary);
    color: var(--bg-primary);
    border-color: var(--text-primary);
  }

  &:focus {
    outline: var(--border-width-medium) solid var(--border-darker);
    outline-offset: 0.2rem;
  }

  &.is-active {
    background-color: var(--text-primary);
    color: var(--bg-primary);
    border-color: var(--text-primary);
  }
}
```

### Hidden State

```css
.is-hidden {
  display: none;
}
```

### Usage Example

```html
<ul class="widget-filter-list" role="tablist">
  <li role="presentation">
    <button type="button" class="widget-filter-btn is-active" data-filter="all" role="tab" aria-selected="true">
      All Items
    </button>
  </li>
  <li role="presentation">
    <button type="button" class="widget-filter-btn" data-filter="category" role="tab" aria-selected="false">
      Category
    </button>
  </li>
</ul>

<div class="widget-content">
  <article class="widget-card" data-category="category">
    <!-- Content -->
  </article>
  <article class="widget-card is-hidden" data-category="other">
    <!-- Hidden content -->
  </article>
</div>
```

### Customization

Override styles in widget-specific CSS:

```css
.widget-name {
  & .widget-filter-list {
    gap: var(--space-sm); /* Custom gap */
    margin-block-end: var(--space-3xl); /* Custom margin */
  }

  & .widget-filter-btn {
    background-color: var(--bg-secondary); /* Custom background */
    color: var(--text-body); /* Custom text color */
    text-transform: uppercase; /* Add uppercase */
    letter-spacing: 0.05em; /* Add letter spacing */
  }
}
```

**Key Points:**

- Use `.widget-filter-list` for the container `<ul>`
- Use `.widget-filter-btn` for filter/tab buttons
- Use `.is-hidden` class for filtered items (via JavaScript)
- Always include proper ARIA attributes (`role="tablist"`, `role="tab"`, `aria-selected`)
- Override styles in widget-specific CSS when needed

---

## Testimonial System

### Testimonial Quote

```css
.testimonial-quote {
  font-size: var(--font-size-base);
  line-height: var(--line-height-relaxed);
  color: var(--text-primary);
  position: relative;
  font-style: italic;

  &::before {
    content: '"';
    font-size: var(--font-size-5xl);
    line-height: 1;
    color: var(--border-light);
    position: absolute;
    inset-block-start: calc(var(--space-sm) * -1);
    inset-inline-start: calc(var(--space-sm) * -1);
  }

  @media (min-width: 750px) {
    font-size: var(--font-size-lg);
  }
}
```

### Testimonial Author

```css
.testimonial-author {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.testimonial-avatar {
  width: 5.6rem;
  height: 5.6rem;
  border-radius: 50%;
  overflow: hidden;
  background-color: var(--border-light);
  border: var(--border-width-thin) solid var(--border-light);
  flex-shrink: 0;
}

.testimonial-author-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.testimonial-author-name {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.testimonial-author-role {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.testimonial-rating {
  display: flex;
  gap: var(--space-xs);
  margin-block-start: var(--space-sm);
}
```

### Usage Example

```html
<div class="widget-card">
  <div class="widget-card-content testimonial-quote">
    This platform completely transformed our workflow. Highly recommended!
  </div>
  <div class="widget-card-footer testimonial-author">
    <div class="testimonial-avatar">
      <img src="avatar.jpg" alt="Jane Doe" />
    </div>
    <div class="testimonial-author-info">
      <cite class="testimonial-author-name">Jane Doe</cite>
      <span class="testimonial-author-role">Director, Tech Co</span>
      <!-- Optional: Rating -->
      <div class="testimonial-rating" aria-label="5 stars">
        <!-- Star SVGs -->
      </div>
    </div>
  </div>
</div>
```

### Customization

Override styles in widget-specific CSS:

```css
.widget-name {
  & .testimonial-avatar {
    width: 6.4rem; /* Larger avatar */
    height: 6.4rem;
  }

  & .testimonial-quote {
    flex: 1; /* For flex layouts */
  }
}
```

**Key Points:**

- Use `.testimonial-quote` for the quote text (includes decorative quote mark)
- Use `.testimonial-author` for the author container
- Use `.testimonial-avatar` for circular avatar images
- Use `.testimonial-author-info` for name/role container
- Use `.testimonial-rating` for optional star ratings
- All classes work within `.widget-card` structure

---

## Widget Structure Patterns

### Standard Widget Structure

```html
<style>
  .widget-name {
    /* Widget-specific CSS */
  }
</style>

<section id="widget-1" class="widget-name widget">
  <div class="widget-container">
    <!-- Optional: Section Header -->
    <div class="widget-header">
      <span class="widget-eyebrow">Label</span>
      <h2 class="widget-title">Section Title</h2>
      <p class="widget-description">Section description</p>
    </div>

    <!-- Main Content -->
    <div class="widget-content">
      <!-- Widget-specific layout -->
    </div>
  </div>
</section>

<script>
  /* Widget-specific JavaScript (if needed) */
</script>
```

### Common Patterns

**Grid Layout:**

```html
<div class="widget-content">
  <div class="widget-grid widget-grid-3">
    <div class="widget-card">...</div>
    <div class="widget-card">...</div>
    <div class="widget-card">...</div>
  </div>
</div>
```

**Narrow Content:**

```html
<div class="widget-content widget-content-sm">
  <!-- Form or narrow content -->
</div>
```

**Two-Column Layout:**

```html
<div class="widget-content">
  <div class="widget-grid widget-grid-2">
    <div>Column 1</div>
    <div>Column 2</div>
  </div>
</div>
```

**Stats / Counters:**

```html
<ul class="stats-grid">
  <li class="stats-item">
    <div class="stats-number" data-count="100" data-suffix="+">0</div>
    <div class="stats-label">Label</div>
    <p class="stats-desc">Description</p>
  </li>
</ul>
```

**Brands / Logo Grid:**

```html
<ul class="logo-cloud-list">
  <li class="logo-cloud-item">
    <img src="logo.svg" alt="Brand" class="logo-cloud-image" />
  </li>
</ul>
```

**Tabs Structure:**

```html
<div class="widget-tabs">
  <div role="tablist" class="tabs-list">
    <button role="tab" aria-selected="true" aria-controls="panel-1" id="tab-1" class="tabs-tab">Tab 1</button>
    <button role="tab" aria-selected="false" aria-controls="panel-2" id="tab-2" class="tabs-tab">Tab 2</button>
  </div>
  <div class="tabs-panels">
    <div role="tabpanel" id="panel-1" aria-labelledby="tab-1" class="tabs-panel">
      <!-- Content -->
    </div>
    <div role="tabpanel" id="panel-2" aria-labelledby="tab-2" class="tabs-panel" hidden>
      <!-- Content -->
    </div>
  </div>
</div>
```

---

## Quick Reference

### Breakpoints

```css
/* Mobile (default) */
/* < 750px */

/* Tablet */
@media (min-width: 750px) {
}

/* Desktop Small */
@media (min-width: 990px) {
}

/* Desktop Large */
@media (min-width: 1200px) {
}
```

### Common Spacing Values

| Variable      | Value  | Pixels | Use Case                  |
| ------------- | ------ | ------ | ------------------------- |
| `--space-xs`  | 0.8rem | 8px    | Tight spacing             |
| `--space-sm`  | 1.2rem | 12px   | Small gaps                |
| `--space-md`  | 1.6rem | 16px   | Default spacing           |
| `--space-lg`  | 2.4rem | 24px   | Grid gaps                 |
| `--space-xl`  | 3.2rem | 32px   | Section spacing           |
| `--space-2xl` | 4rem   | 40px   | Large spacing             |
| `--space-3xl` | 4.8rem | 48px   | Header margins            |
| `--space-4xl` | 6.4rem | 64px   | Section padding (mobile)  |
| `--space-5xl` | 8rem   | 80px   | Section padding (tablet)  |
| `--space-6xl` | 9.6rem | 96px   | Section padding (desktop) |

### Common Font Sizes

| Variable           | Value  | Pixels | Use Case       |
| ------------------ | ------ | ------ | -------------- |
| `--font-size-xs`   | 1.2rem | 12px   | Small labels   |
| `--font-size-sm`   | 1.4rem | 14px   | Eyebrows, meta |
| `--font-size-base` | 1.6rem | 16px   | Body text      |
| `--font-size-lg`   | 1.8rem | 18px   | Large body     |
| `--font-size-xl`   | 2rem   | 20px   | Small headings |
| `--font-size-2xl`  | 2.4rem | 24px   | H3             |
| `--font-size-3xl`  | 2.8rem | 28px   | H2             |
| `--font-size-4xl`  | 3.2rem | 32px   | H1 (mobile)    |
| `--font-size-5xl`  | 4rem   | 40px   | H1 (tablet)    |
| `--font-size-6xl`  | 4.8rem | 48px   | H1 (desktop)   |

---

**For implementation details, see [Coding Standards](coding-standards.md)**
