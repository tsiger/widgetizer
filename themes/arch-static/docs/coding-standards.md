# Widgetizer Coding Standards

> **Last Updated:** November 2025
> **Status:** ✅ Active - Follow these rules for all widget development

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [HTML Standards](#html-standards)
3. [CSS Standards](#css-standards)
4. [JavaScript Standards](#javascript-standards)
5. [Accessibility Requirements](#accessibility-requirements)
6. [File Organization](#file-organization)

---

## Architecture Overview

### Two-Layer CSS System

Widgetizer uses a strict two-layer CSS architecture:

1. **Global Layer (`theme.css`)** - Defines default visual language
   - CSS reset and base styles
   - Design system variables (spacing, typography, colors)
   - Global utility classes (`.widget`, `.widget-container`, etc.)
   - **Does NOT** contain widget-specific layouts

2. **Widget Layer (local `<style>`)** - Defines component-specific styling
   - All layout properties (flexbox, grid, margin, padding, position)
   - Widget-specific visual opinions
   - Scoped to prevent CSS bleed

### Core Principles

- ✅ **Self-Contained Widgets** - Each widget is fully independent
- ✅ **No Utility Classes** - No `.d-flex`, `.mt-4`, etc. (not Tailwind/Bootstrap)
- ✅ **Semantic HTML** - Structure defined by HTML, styling by CSS
- ✅ **RTL & WCAG First** - Accessible and international by default
- ✅ **First Principles** - Simple, maintainable, no over-engineering

---

## HTML Standards

### Widget Root Structure

Every widget **MUST** follow this structure:

```html
<style>
  /* Widget-specific CSS here */
</style>

<section id="unique-id" class="widget-name widget">
  <div class="widget-container">
    <!-- Widget content here -->
  </div>
</section>

<script>
  /* Widget-specific JavaScript here (if needed) */
</script>
```

### Required Attributes

1. **Root Element:**
   - Must be `<section>` tag
   - Must have unique `id` (e.g., `id="hero-1"`)
   - Must have widget class (e.g., `class="widget-hero widget"`)

2. **Container:**
   - Must include `.widget-container` for max-width constraint
   - Optional: `.widget-header` for centered section headers
   - Optional: `.widget-content` for content area

### Class Naming Conventions

✅ **DO:** Use simple, descriptive names

```html
<ul class="feature-list">
  <li class="feature-item">
    <h3 class="item-title">Feature Name</h3>
    <p class="item-description">Description text</p>
  </li>
</ul>
```

❌ **DON'T:** Use vague tag-only selectors

```html
<ul>
  <li>
    <h3>Feature Name</h3>
    <p>Description text</p>
  </li>
</ul>
```

### Semantic HTML Rules

1. **Class Key Structural Elements** - Wrapper, content, list, item, title, etc.
2. **Don't Over-Class** - A `<span>` inside a `<p>` for emphasis doesn't need a class
3. **Use Proper Tags** - `<button>` for buttons, `<a>` for links, `<nav>` for navigation
4. **No Inline Styles** - Never use `style=""` attribute

---

## CSS Standards

### Location & Scoping

1. **Location:** All widget CSS in `<style>` tag **before** the HTML
2. **Scoping:** Every rule **MUST** be prefixed with widget root class

```css
/* ✅ GOOD - Properly scoped */
.widget-hero .hero-title {
  font-size: var(--font-size-4xl);
}

/* ❌ BAD - Not scoped, will leak */
.hero-title {
  font-size: var(--font-size-4xl);
}
```

### CSS Logical Properties (RTL Support)

**ALWAYS** use logical properties for directional styling:

| ❌ Don't Use     | ✅ Use Instead          |
| ---------------- | ----------------------- |
| `margin-left`    | `margin-inline-start`   |
| `margin-right`   | `margin-inline-end`     |
| `padding-top`    | `padding-block-start`   |
| `padding-bottom` | `padding-block-end`     |
| `left: 0`        | `inset-inline-start: 0` |
| `right: 0`       | `inset-inline-end: 0`   |
| `top: 0`         | `inset-block-start: 0`  |
| `bottom: 0`      | `inset-block-end: 0`    |

### CSS Nesting

Use **native CSS nesting** (web standards, no Sass):

```css
.widget-hero {
  background-color: var(--bg-primary);

  & .hero-title {
    font-size: var(--font-size-4xl);
  }

  & .hero-button {
    padding: var(--space-md) var(--space-xl);

    &:hover {
      background-color: var(--bg-secondary);
    }
  }

  @media (min-width: 750px) {
    & .hero-title {
      font-size: var(--font-size-5xl);
    }
  }
}
```

### Units & Breakpoints

1. **REM for Everything** - Use `rem` units (not `px`, `em`, or `%`)
   - Base: `html { font-size: 62.5%; }` means `0.1rem = 1px`
   - Example: `1.6rem = 16px`, `3.2rem = 32px`, `14.2rem = 142px`

2. **Colors** - **ALWAYS** use CSS variables for colors
   - ❌ `color: #ffffff`
   - ✅ `color: var(--bg-primary)` or `color: var(--color-white)`

3. **Breakpoints** - Use `px` for media queries (clarity)
   - Mobile: `< 750px` (default, mobile-first)
   - Tablet: `@media (min-width: 750px)` and `< 990px`
   - Desktop: `@media (min-width: 990px)` and `< 1200px`
   - Large: `@media (min-width: 1200px)`

### Modifier Classes

Handle variations with modifier classes on the **root element**:

```html
<!-- Default -->
<section class="widget-image-text widget">...</section>

<!-- With modifiers -->
<section class="widget-image-text layout-image-right align-center widget">...</section>
```

```css
/* Default: Image Left */
.widget-image-text .content {
  display: flex;
  flex-direction: row;
}

/* Modifier: Image Right */
.widget-image-text.layout-image-right .content {
  flex-direction: row-reverse;
}

/* Modifier: Center Alignment */
.widget-image-text.align-center {
  text-align: center;
}
```

---

## JavaScript Standards

### Scoping (Critical)

JavaScript **MUST** be scoped to support multiple widget instances:

```javascript
// ✅ GOOD - Supports multiple instances
(function () {
  const allWidgets = document.querySelectorAll(".widget-accordion");

  allWidgets.forEach((widget) => {
    // Prevent duplicate initialization
    if (widget.dataset.initialized) return;
    widget.dataset.initialized = "true";

    // All queries scoped to THIS widget instance
    const triggers = widget.querySelectorAll(".accordion-trigger");

    triggers.forEach((trigger) => {
      trigger.addEventListener("click", function () {
        // Logic for THIS trigger in THIS widget
      });
    });
  });
})();
```

```javascript
// ❌ BAD - Hardcoded ID, won't work with multiple instances
document.addEventListener("DOMContentLoaded", () => {
  const widget = document.getElementById("accordion-1");
  const triggers = widget.querySelectorAll(".accordion-trigger");
  // ...
});
```

### Best Practices

1. **IIFE Wrapper** - Wrap in `(function() { ... })()` to prevent global pollution
2. **Initialization Guard** - Use `dataset.initialized` to prevent duplicate listeners
3. **Proper `this` Context** - Use `function()` instead of arrow functions for event handlers
4. **Scoped Queries** - Always use `widget.querySelector()`, never `document.querySelector()`

---

## Accessibility Requirements

### ARIA Attributes

All interactive widgets **MUST** include proper ARIA:

```html
<!-- Accordion -->
<button class="accordion-trigger" aria-expanded="false">
  <span>Question</span>
</button>
<div class="accordion-content" aria-hidden="true">
  <p>Answer</p>
</div>

<!-- Tabs -->
<button role="tab" aria-selected="true" aria-controls="panel-1">Tab 1</button>
<div role="tabpanel" id="panel-1" aria-labelledby="tab-1">Content</div>

<!-- Modal -->
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <h2 id="modal-title">Modal Title</h2>
</div>
```

### Keyboard Navigation

All interactive widgets **MUST** be keyboard-navigable:

- **Tab** - Navigate between focusable elements
- **Enter/Space** - Activate buttons
- **Escape** - Close modals/dropdowns
- **Arrow Keys** - Navigate tabs, sliders, etc.

### Required Attributes

1. **Images:** Must have `alt` attributes
2. **Icon-Only Buttons:** Must have `aria-label`
3. **Form Inputs:** Must have associated `<label>` or `aria-label`
4. **Interactive Elements:** Must be `<button>` or `<a>` (not `<div>` with click handlers)

---

## File Organization

### Directory Structure

```
widgetizer-arch/
├── src/                    # Source files (EDIT HERE)
│   ├── index.html         # Main template
│   ├── widgets/           # Widget files
│   │   ├── hero.html
│   │   ├── pricing.html
│   │   └── ...
│   └── ...
├── dist/                   # Built files (DON'T TOUCH)
│   └── index.html
├── theme.css              # Global styles
├── build.js               # Build script
└── docs/                  # Documentation
    ├── coding-standards.md
    ├── design-system.md
    └── ...
```

### Widget File Structure

Each widget file contains:

1. **CSS** - `<style>` tag with widget-specific styles
2. **HTML** - `<section>` with widget markup
3. **JavaScript** - `<script>` tag with widget logic (if needed)

### Build Process

- **Source:** Edit files in `/src` folder
- **Build:** Run `node build.js` or `node build.js --watch`
- **Output:** Built files in `/dist` folder
- **Never edit `/dist` directly** - changes will be overwritten

---

## Quick Reference

### CSS Variables (Design System)

```css
/* Spacing */
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

/* Typography */
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

/* Borders */
--border-width-thin: 0.1rem; /* 1px */
--border-width-medium: 0.2rem; /* 2px */
--border-width-thick: 0.3rem; /* 3px */

/* Container */
--container-max-width: 142rem; /* 1420px */
```

### Common Patterns

```html
<!-- Standard Widget Structure -->
<section id="widget-1" class="widget-name widget">
  <div class="widget-container">
    <div class="widget-header">
      <span class="widget-eyebrow">Eyebrow</span>
      <h2 class="widget-title">Title</h2>
      <p class="widget-description">Description</p>
    </div>
    <div class="widget-content">
      <!-- Content here -->
    </div>
  </div>
</section>
```

---

## Common Mistakes to Avoid

❌ **Don't:**

- Use inline styles (`style=""`) - **EXCEPTION:** Only allowed for dynamic background images (e.g., `style="--widget-bg-image: url(...)"`)
- Use utility classes (`.mt-4`, `.flex`, etc.)
- Use non-logical properties (`margin-left`, `padding-right`)
- Hardcode IDs in JavaScript (`getElementById`)
- Use tag-only CSS selectors
- Edit files in `/dist` folder
- Use `px` units (except in media queries)

✅ **Do:**

- Use design system variables
- Scope all CSS to widget root class
- Use logical properties for RTL support
- Use `querySelectorAll` with IIFE for JavaScript
- Use semantic class names
- Edit files in `/src` folder
- Use `rem` units everywhere

---

**Questions?** Review existing widgets in `/src/widgets` for examples, or check the [Design System documentation](design-system.md).
