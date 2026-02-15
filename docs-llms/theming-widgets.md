# Widget Authoring Guide

> **Complete reference for creating widgets in Widgetizer themes**

This document provides everything you need to know when creating widgets for your theme. Follow these patterns and conventions to ensure consistency, maintainability, and a great user experience.

For the foundational concepts of theming (theme structure, global settings, layout templates), see the main [Theming Guide](theming.md).

---

## Table of Contents

1. [Widget Structure](#widget-structure)
2. [CSS Design Tokens](#css-design-tokens)
3. [Typography System](#typography-system)
4. [Layout & Spacing](#layout--spacing)
5. [Color System](#color-system)
6. [Component Patterns](#component-patterns)
7. [JavaScript Patterns](#javascript-patterns)
8. [Schema Conventions](#schema-conventions)
9. [Accessibility](#accessibility)
10. [Common Patterns](#common-patterns)
11. [Checklist](#checklist)

---

## Widget Structure

### File Organization

Each widget lives in its own subdirectory within `widgets/`:

```
widgets/
├── my-widget/
│   ├── schema.json     # Widget configuration schema
│   └── widget.liquid   # Widget template (HTML, CSS, JS)
├── another-widget/
│   ├── schema.json
│   └── widget.liquid
└── global/             # Global widgets (header, footer)
    ├── header/
    │   ├── schema.json
    │   └── widget.liquid
    └── footer/
        ├── schema.json
        └── widget.liquid
```

### Standard Widget Template

Every widget follows this structure:

```liquid
<section
  id="{{ widget.id }}"
  class="widget widget-{name} widget-{{ widget.id }}"
  {% if widget.settings.background == 'secondary' %}
    style="--widget-bg-color: var(--bg-secondary);"
  {% endif %}
  data-widget-id="{{ widget.id }}"
  data-widget-type="{widget-name}"
>
  <style>
    .widget-{{ widget.id }} {
      /* Widget-specific styles only */
      /* Use design system variables */
      /* Use CSS nesting with & */
    }
  </style>

  <div class="widget-container {% if widget.settings.background == 'secondary' %}widget-container-padded{% endif %}">
    <!-- Optional: Widget Header -->
    {% if widget.settings.title != blank or widget.settings.description != blank or widget.settings.eyebrow != blank %}
      <div class="widget-header">
        {% if widget.settings.eyebrow != blank %}
          <span class="widget-eyebrow" data-setting="eyebrow">{{ widget.settings.eyebrow }}</span>
        {% endif %}
        {% if widget.settings.title != blank %}
          <h2 class="widget-headline" data-setting="title">{{ widget.settings.title }}</h2>
        {% endif %}
        {% if widget.settings.description != blank %}
          <p class="widget-description" data-setting="description">{{ widget.settings.description }}</p>
        {% endif %}
      </div>
    {% endif %}

    <!-- Main Content -->
    <div class="widget-content">
      <!-- Widget-specific layout -->
    </div>
  </div>

  <script>
    /* Widget JavaScript (if needed) */
  </script>
</section>
```

### Required Attributes

| Attribute                                             | Purpose                                                    |
| ----------------------------------------------------- | ---------------------------------------------------------- |
| `id="{{ widget.id }}"`                                | Unique widget instance ID for CSS scoping and JS targeting |
| `class="widget widget-{name} widget-{{ widget.id }}"` | Base class + semantic name + scoped class                  |
| `data-widget-id="{{ widget.id }}"`                    | For JavaScript targeting                                   |
| `data-widget-type="{widget-name}"`                    | For debugging/identification                               |

### Content Flow Spacing

For widgets with dynamic block ordering (text, headings, buttons), use the **content-flow** pattern for automatic, order-agnostic spacing:

```liquid
<div class="widget-content content-flow widget-content-lg {% if widget.settings.alignment == 'center' %}widget-content-align-center{% else %}widget-content-align-start{% endif %}">
  {% for blockId in widget.blocksOrder %}
    {% assign block = widget.blocks[blockId] %}
    {% case block.type %}
      {% when 'heading' %}
        {% assign size_class = 'block-text-' | append: block.settings.size %}
        {% if widget.index == 1 %}
          <h1 class="widget-headline block-text {{ size_class }} block-text-bold block-text-heading reveal reveal-up" style="--reveal-delay: {{ forloop.index0 }}">
            {{ block.settings.text }}
          </h1>
        {% else %}
          <h2 class="widget-headline block-text {{ size_class }} block-text-bold block-text-heading reveal reveal-up" style="--reveal-delay: {{ forloop.index0 }}">
            {{ block.settings.text }}
          </h2>
        {% endif %}
      {% when 'text' %}
        <p class="widget-description block-text block-text-{{ block.settings.size }} reveal reveal-up" style="--reveal-delay: {{ forloop.index0 }}">
          {{ block.settings.text }}
        </p>
      {% when 'button' %}
        <div class="widget-actions reveal reveal-up" style="--reveal-delay: {{ forloop.index0 }}">
          <a href="#" class="widget-button widget-button-{{ block.settings.size }} widget-button-primary">
            Button Text
          </a>
        </div>
    {% endcase %}
  {% endfor %}
</div>
```

**How it works:**

The `.content-flow` utility class (defined in `base.css`) applies automatic spacing between elements using the **owl selector** (`* + *`):

```css
/* Defined in base.css */
.content-flow > * + * {
  margin-block-start: var(--space-md); /* 16px default */
}
```

For widgets that need custom spacing for specific elements (e.g., extra spacing before buttons), you can add widget-specific overrides in your `<style>` block:

```css
.widget-{{ widget.id }} {
  /* Custom override for this widget */
  & .content-flow > .widget-actions:last-child {
    margin-block-start: var(--space-xl); /* 32px */
  }
}
```

**Benefits:**

- **Order-agnostic**: Works regardless of block order
- **No manual spacing**: Spacing is automatic based on adjacency
- **Flexible**: Handles any combination of blocks
- **Consistent**: Same spacing rules across all widgets

---

## CSS Design Tokens

Your theme should define a consistent set of CSS custom properties (design tokens) that widgets can reference. This ensures visual consistency across all widgets.

### Unit System

- **Base font size**: Set to `62.5%` (10px) so `1rem = 10px`
- **All measurements**: Use `rem` exclusively
- **Example**: `1.6rem = 16px`, `3.2rem = 32px`

### Spacing Scale

```css
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
```

### Typography Scale

```css
--font-size-xs: 1.2rem; /* 12px */
--font-size-sm: 1.4rem; /* 14px */
--font-size-base: 1.6rem; /* 16px */
--font-size-lg: 1.8rem; /* 18px */
--font-size-xl: 2rem; /* 20px */
--font-size-2xl: 2.4rem; /* 24px */
--font-size-3xl: 2.8rem; /* 28px */
--font-size-4xl: 3.2rem; /* 32px */
--font-size-5xl: 3.6rem; /* 36px */
--font-size-6xl: 4rem; /* 40px */
```

### Line Heights & Font Weights

```css
--line-height-tight: 1.2;
--line-height-normal: 1.5;
--line-height-relaxed: 1.6;

--typography-heading_font-weight: 700;
--typography-body_font-weight: 400;
--typography-body_font_bold-weight: 700;
```

### Color Tokens

Define semantic color variables that map to your theme's global settings:

```css
/* Text Colors */
--text-content: var(--colors-text_content, #333);
--text-heading: var(--colors-text_heading, #000);
--text-muted: var(--colors-text_muted, #666);

/* Background Colors */
--bg-primary: var(--colors-bg_primary, #fff);
--bg-secondary: var(--colors-bg_secondary, #f9f9f9);

/* Accent Colors */
--accent: var(--colors-accent, #000);
--accent-text: var(--colors-accent_text, #fff);

/* Inverse Colors (for dark schemes) */
--inverse-bg: var(--colors-inverse_bg, #000);
--inverse-text: var(--colors-inverse_text, #fff);

/* Border */
--border-color: var(--colors-border_color, #e0e0e0);
```

### Container & Content Widths

```css
--container-max-width: 142rem; /* 1420px */
--content-width-xs: 40rem; /* 400px */
--content-width-sm: 60rem; /* 600px */
--content-width-md: 80rem; /* 800px */
--content-width-lg: 90rem; /* 900px */
```

### Border System

```css
--border-width-thin: 0.1rem; /* 1px */
--border-width-medium: 0.2rem; /* 2px */
--border-width-thick: 0.3rem; /* 3px */
```

### CSS Nesting

Use **native CSS nesting** with `&`:

```css
.widget-{{ widget.id }} {
  & .card {
    padding: var(--space-xl);

    & .card-title {
      font-size: var(--font-size-2xl);
    }

    &:hover {
      border-color: var(--border-color);
    }
  }
}
```

### Logical Properties (RTL Support)

**Always use logical properties** for directional styles to support right-to-left languages:

| ❌ Don't Use     | ✅ Use Instead          |
| ---------------- | ----------------------- |
| `margin-left`    | `margin-inline-start`   |
| `margin-right`   | `margin-inline-end`     |
| `padding-top`    | `padding-block-start`   |
| `padding-bottom` | `padding-block-end`     |
| `left: 0`        | `inset-inline-start: 0` |
| `top: 0`         | `inset-block-start: 0`  |

### Responsive Breakpoints

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

---

## Typography System

### Block Text Utilities

**Never hardcode `font-size`, `font-weight`, `line-height`, or `color` in CSS.** Use `block-text` utility classes instead:

#### Size Modifiers

```html
<span class="block-text block-text-xs">Extra small</span>
<span class="block-text block-text-sm">Small</span>
<span class="block-text block-text-base">Base</span>
<span class="block-text block-text-lg">Large</span>
<span class="block-text block-text-xl">Extra large</span>
<span class="block-text block-text-2xl">2X Large</span>
<span class="block-text block-text-3xl">3X Large</span>
<span class="block-text block-text-4xl">4X Large</span>
<span class="block-text block-text-5xl">5X Large</span>
```

#### Weight Modifiers

```html
<span class="block-text block-text-normal">Normal (400)</span>
<span class="block-text block-text-medium">Medium (500)</span>
<span class="block-text block-text-semibold">Semibold (600)</span>
<span class="block-text block-text-bold">Bold (700)</span>
```

#### Color Modifiers

```html
<span class="block-text block-text-muted">Muted text</span>
<span class="block-text block-text-heading">Heading color</span>
<span class="block-text block-text-accent">Accent color</span>
```

#### Style Modifiers

```html
<span class="block-text block-text-uppercase">UPPERCASE</span>
```

#### Combined Example

```html
<h3 class="widget-card-title block-text block-text-xl block-text-bold block-text-heading">Card Title</h3>
<p class="widget-card-description block-text block-text-sm block-text-muted">Description text</p>
```

### Semantic Classes

These classes are semantic hooks (no default styling) for targeting in CSS:

- `.widget-headline` - Section titles (usually `<h2>`)
- `.widget-title` - Card/item titles (usually `<h3>`)
- `.widget-subtitle` - Secondary headings
- `.widget-description` - Body text
- `.widget-eyebrow` - Small label above headline
- `.widget-meta` - Meta information (dates, categories)

---

## Layout & Spacing

### Widget Container System

```liquid
<div class="widget-container">
  <!-- Content -->
</div>
```

- **Default**: Margin-based spacing (collapses naturally)
- **With background**: Add `widget-container-padded` class for padding-based spacing

### Content Width Modifiers

```liquid
<div class="widget-content widget-content-sm">  <!-- 600px -->
<div class="widget-content widget-content-md">  <!-- 800px -->
<div class="widget-content widget-content-lg">  <!-- 900px -->
```

### Content Alignment Modifiers

```liquid
<div class="widget-content widget-content-align-center">  <!-- Centered -->
<div class="widget-content widget-content-align-start">   <!-- Left/Start -->
```

### Widget Height Modifiers

```liquid
<section class="widget widget-height-half">      <!-- 50vh -->
<section class="widget widget-height-two-thirds"> <!-- 66vh -->
<section class="widget widget-height-full">      <!-- 100vh -->
```

### Grid System

The grid utilities are CSS-variable driven for flexible column counts and consistent responsive behavior.

```liquid
<div class="widget-grid widget-grid-2">  <!-- 2 columns -->
<div class="widget-grid widget-grid-3">  <!-- 3 columns -->
<div class="widget-grid widget-grid-4">  <!-- 4 columns -->
<div class="widget-grid widget-grid-5">  <!-- 5 columns -->
```

Or set the desktop column count directly:

```liquid
<div class="widget-grid" style="--grid-cols-desktop: 4;">
```

**Responsive behavior:**

- Mobile (< 750px): 1 column
- Tablet (750px+): 2 columns
- Desktop (990px+): `--grid-cols-desktop`
- Large (1200px+): same as desktop

**Gap behavior:**

- `gap` automatically tightens as `--grid-cols-desktop` increases.
- Override with `--grid-gap` if needed:

```liquid
<div class="widget-grid" style="--grid-cols-desktop: 4; --grid-gap: var(--space-md);">
```

### Card Grid

```liquid
<ul class="widget-card-grid widget-grid" style="--grid-cols-desktop: 4;">
  <li class="widget-card">
    <!-- Card content -->
  </li>
</ul>
```

**Responsive behavior:**

- Mobile: 1 column
- Tablet (750px+): 2 columns
- Desktop (990px+): `--grid-cols-desktop`

### Spacing Guidelines

- **Use `gap`** for flex/grid containers
- **Use individual margins** for hero/banner elements (precise control)
- **Never hardcode** spacing values - always use CSS variables

---

## Color System

### Color Scheme Classes

Widgets support two color schemes defined in theme settings:

```liquid
<!-- Light color scheme (default) -->
<section class="widget color-scheme-light">
  <!-- Content -->
</section>

<!-- Dark color scheme -->
<section class="widget color-scheme-dark">
  <!-- Content -->
</section>
```

**Widget-Level Color Scheme Setting:**

Add a color scheme setting to your widget schema:

```json
{
  "type": "select",
  "id": "color_scheme",
  "label": "Color Scheme",
  "default": "light",
  "options": [
    { "value": "light", "label": "Light" },
    { "value": "dark", "label": "Dark" }
  ]
}
```

**Widget Template:**

```liquid
<section
  class="widget widget-{name} widget-{{ widget.id }} color-scheme-{{ widget.settings.color_scheme }}"
  {% if widget.settings.color_scheme == 'dark' %}
    style="--widget-bg-color: var(--bg-primary);"
  {% endif %}
>
  <div class="widget-container {% if widget.settings.color_scheme == 'dark' %}widget-container-padded{% endif %}">
    <!-- Content -->
  </div>
</section>
```

**How it works:**

1. `color-scheme-{{ widget.settings.color_scheme }}` adds the appropriate class
2. Dark scheme automatically sets dark background via inline style
3. `widget-container-padded` adds padding for dark scheme widgets
4. All text, borders, and accent colors automatically switch based on scheme

### Background System

#### Widget-Level Background

Color schemes handle the main background, but you can still override with custom backgrounds:

```liquid
<section
  class="widget widget-{name} widget-{{ widget.id }} color-scheme-{{ widget.settings.color_scheme }}"
  style="--widget-bg-color: {{ widget.settings.background_color }};"
>
  <!-- Content -->
</section>
```

Note: Custom backgrounds override the color scheme background completely.

---

## Component Patterns

### Buttons

```liquid
<!-- Primary Button -->
<a href="#" class="widget-button widget-button-primary">Primary</a>

<!-- Secondary Button -->
<a href="#" class="widget-button widget-button-secondary">Secondary</a>

<!-- Size Variants -->
<a href="#" class="widget-button widget-button-medium">Medium</a>
<a href="#" class="widget-button widget-button-large">Large</a>
<a href="#" class="widget-button widget-button-xlarge">XLarge</a>

<!-- Full Width -->
<a href="#" class="widget-button widget-button-full">Full Width</a>
```

### Button Actions Container

```liquid
<div class="widget-actions">
  <a href="#" class="widget-button widget-button-primary">Button 1</a>
  <a href="#" class="widget-button widget-button-secondary">Button 2</a>
</div>
```

**Single button centering** (for hero/banner):

```liquid
{% assign hasSingleButton = false %}
{% if block.settings.button_link.text != blank and block.settings.button_link_2.text == blank %}
  {% assign hasSingleButton = true %}
{% elsif block.settings.button_link.text == blank and block.settings.button_link_2.text != blank %}
  {% assign hasSingleButton = true %}
{% endif %}
<div class="widget-actions{% if hasSingleButton %} widget-actions-single{% endif %}">
```

### Cards

```liquid
<div class="widget-card">
  <!-- Optional Header -->
  <div class="widget-card-header">
    <span class="widget-card-subtitle">Category</span>
    <h3 class="widget-card-title">Card Title</h3>
  </div>

  <!-- Optional Image -->
  <img src="..." class="widget-card-image" alt="..." />

  <!-- Main Content -->
  <div class="widget-card-content">
    <p class="widget-card-description">Description</p>
  </div>

  <!-- Optional Footer -->
  <div class="widget-card-footer">
    <a href="#" class="widget-button">Action</a>
  </div>
</div>
```

### Forms

```liquid
<div class="form-group">
  <label for="email" class="form-label">Email</label>
  <input type="email" id="email" class="form-input" placeholder="you@example.com" />
</div>

<div class="form-group">
  <label for="message" class="form-label">Message</label>
  <textarea id="message" class="form-textarea" rows="5"></textarea>
</div>

<div class="form-group">
  <label for="select" class="form-label">Select</label>
  <select id="select" class="form-select">
    <option>Option 1</option>
  </select>
</div>

<div class="form-checkbox-group">
  <input type="checkbox" id="agree" class="form-checkbox" />
  <label for="agree" class="form-checkbox-label">I agree</label>
</div>
```

### Icons

```liquid
{% render 'icon', icon: 'star', class: 'widget-card-icon' %}
```

Available icon classes:

- `.widget-icon` - Default size (32px)
- `.widget-icon-small` - Small (20px)
- `.widget-icon-large` - Large (48px)

---

## JavaScript Patterns

### Standard Initialization Pattern

**CRITICAL**: Each widget instance must be isolated. Use this pattern:

```javascript
<script>
  (function () {
    const widget = document.getElementById('{{ widget.id }}');
    if (!widget || widget.dataset.initialized) return;
    widget.dataset.initialized = 'true';

    // All queries scoped to THIS widget instance
    const triggers = widget.querySelectorAll('.trigger');
    const panels = widget.querySelectorAll('.panel');

    triggers.forEach((trigger, index) => {
      trigger.addEventListener('click', function () {
        // Logic for THIS trigger in THIS widget
        panels[index].classList.toggle('active');
      });
    });
  })();
</script>
```

### Key Points

1. **IIFE Wrapper**: `(function() { ... })()` - Prevents global scope pollution
2. **Get By ID**: `getElementById('{{ widget.id }}')` - Each widget has unique ID
3. **Initialization Guard**: Check `dataset.initialized` - Prevents duplicate listeners
4. **Scoped Queries**: Use `widget.querySelector()` - Never `document.querySelector()`
5. **Proper `this`**: Use `function()` for event handlers, not arrow functions

### External JavaScript and CSS Files

For complex widgets, use external files placed directly in the widget folder:

```
widgets/
└── slideshow/
    ├── schema.json
    ├── widget.liquid
    ├── slideshow.css      # Widget styles
    └── slideshow.js       # Widget scripts
```

Enqueue them in your widget template:

```liquid
{% enqueue_style src: "slideshow.css", priority: 30 %}
{% enqueue_script src: "slideshow.js", priority: 30 %}
```

These will be automatically rendered by `{% header_assets %}` (for styles) and `{% footer_assets %}` (for scripts) in your layout template, sorted by priority.

**Asset Resolution:**

- **Inside widget templates**: Assets are loaded from that widget's folder (`widgets/{widget-name}/`)
- **Inside `layout.liquid` or snippets**: Assets are loaded from the theme `assets/` folder

**Deduplication:**

Multiple widgets can safely enqueue the same asset file. The enqueue system uses the filename as a unique key, so if two widgets both call `{% enqueue_script src: "shared-lib.js" %}`, the script is only output once. This is useful when multiple widgets share a common library.

> [!IMPORTANT] **Asset Filename Collisions**
>
> During export, all widget CSS and JS files are flattened into a single `assets/` folder. If two different widgets have files with the same name (e.g., both have `styles.css`), **the last one copied will overwrite the first**, and one widget's styles/scripts will be broken in the exported site.
>
> **Best practice:** Use unique, widget-prefixed filenames for your assets:
>
> - `slideshow.css` instead of `styles.css`
> - `accordion-scripts.js` instead of `scripts.js`
>
> In preview mode, there is no collision—each widget's assets are served from separate paths. The collision only occurs during export.

### Re-initialization on Partial Updates (External Scripts)

When using **external JavaScript files** (via `{% enqueue_script %}`), the script only runs once at page load. During partial DOM updates in the editor (when users edit widget settings), the widget's HTML is replaced but external scripts don't re-run—causing event listeners to be lost.

**The Problem:**

- Inline scripts (inside `widget.liquid`) are automatically re-executed after DOM updates
- External scripts (loaded via `{% enqueue_script %}`) are NOT re-executed
- After partial update, the widget appears but interactive features (buttons, sliders, etc.) stop working

**The Solution:**

External scripts must listen for the `widget:updated` custom event, which is dispatched by the preview runtime after morphing a widget. Use this pattern:

```javascript
/**
 * Widget JavaScript with partial update support
 */
(function () {
  "use strict";

  /**
   * Initialize a widget instance
   * @param {HTMLElement} widget - The widget element
   */
  function initMyWidget(widget) {
    if (widget.dataset.initialized) return;
    widget.dataset.initialized = "true";

    // Setup event listeners, state, etc.
    const buttons = widget.querySelectorAll(".my-button");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        // Handle click
      });
    });
  }

  // Initialize all widgets on page load
  document.querySelectorAll('[data-widget-type="my-widget"]').forEach(initMyWidget);

  // Re-initialize on partial DOM updates (editor morphing)
  document.addEventListener("widget:updated", (e) => {
    const widget = e.target.closest('[data-widget-type="my-widget"]');
    if (widget) {
      // Remove flag to allow re-initialization
      widget.removeAttribute("data-initialized");
      initMyWidget(widget);
    }
  });
})();
```

**Key Points:**

1. **Extract initialization into a function** - Makes it callable both on page load and after updates
2. **Listen for `widget:updated`** - This event bubbles from the morphed widget element
3. **Remove `data-initialized`** - Allows the init function to run again
4. **Use `e.target.closest()`** - The event target is the widget element itself

**When to use this pattern:**

- External `.js` files loaded via `{% enqueue_script %}`
- Widgets with interactive JavaScript (sliders, accordions, tabs, etc.)
- Any widget that attaches event listeners

**When NOT needed:**

- Inline scripts (inside `<script>` tags in `widget.liquid`) - These are automatically re-executed
- CSS-only widgets with no JavaScript
- Widgets that only use declarative behavior (no event listeners)

---

## Editor Lifecycle Events

When a widget is displayed inside the Widgetizer editor, the preview runtime dispatches custom DOM events on widget elements as the user interacts with the sidebar. Theme JavaScript can listen for these events to synchronize visual state with the editor selection — for example, navigating a slideshow to the selected slide or opening an accordion panel.

### Design Mode Detection

Check whether the widget is running inside the editor:

```javascript
if (window.Widgetizer?.designMode) {
  // Running inside the editor preview
}
```

In production and standalone preview, `window.Widgetizer` is `undefined`.

### Available Events

All events are dispatched on the widget element (`[data-widget-id]`) and bubble up through the DOM.

| Event                   | Fires When                                | `e.detail`     |
| ----------------------- | ----------------------------------------- | -------------- |
| `widget:select`         | This widget becomes selected              | `{}`           |
| `widget:deselect`       | This widget is deselected                 | `{}`           |
| `widget:block-select`   | A block within this widget is selected    | `{ blockId }`  |
| `widget:block-deselect` | A block within this widget is deselected  | `{ blockId }`  |
| `widget:updated`        | Widget DOM was replaced (morph/re-render) | `{ widgetId }` |

### Event Order

When selection changes, events fire in this order:

1. `widget:block-deselect` (on previous widget, if a block was selected)
2. `widget:deselect` (on previous widget, if widget changed)
3. `widget:select` (on new widget, if widget changed)
4. `widget:block-select` (on new widget, if a block is selected)

### Example: Slideshow

A slideshow with overlapping slides should show the correct slide when the user selects it in the sidebar:

```javascript
if (window.Widgetizer?.designMode) {
  // Navigate to the selected slide
  widget.addEventListener("widget:block-select", (e) => {
    const { blockId } = e.detail;
    const slides = widget.querySelectorAll(".slideshow-slide[data-block-id]");
    slides.forEach((slide, idx) => {
      if (slide.getAttribute("data-block-id") === blockId) {
        stopAutoplay();
        goToSlide(idx);
      }
    });
  });

  // Pause autoplay while the widget is selected
  widget.addEventListener("widget:select", () => stopAutoplay());
  widget.addEventListener("widget:deselect", () => startAutoplay());
}
```

### When to Use

- **Slideshows/Carousels**: Navigate to the selected slide, pause autoplay
- **Tabs/Content Switchers**: Show the selected tab panel
- **Accordions**: Open the selected accordion panel
- **Any widget with hidden blocks**: Reveal the block the user is editing

### Important Notes

1. **Guard with `designMode`**: Always wrap event listeners in `if (window.Widgetizer?.designMode)` so they don't run in production
2. **Events fire on the widget element**: Use `widget.addEventListener()`, not `document.addEventListener()`
3. **Re-initialization safe**: Since these listeners are added inside the init function, they are re-attached after `widget:updated` re-initialization
4. **Events only fire on state change**: Selecting the same block twice does not re-fire `widget:block-select`

---

## Scroll Reveal Animations

The theme includes a scroll reveal animation system. Add animation classes to elements to animate them as they enter the viewport.

### Animation Classes

| Class           | Effect                           |
| :-------------- | :------------------------------- |
| `.reveal`       | Base class (required) - fades in |
| `.reveal-up`    | Slides up while fading in        |
| `.reveal-down`  | Slides down while fading in      |
| `.reveal-left`  | Slides from right to left        |
| `.reveal-right` | Slides from left to right        |
| `.reveal-scale` | Scales up from 95%               |
| `.reveal-fade`  | Simple fade (no transform)       |

### Basic Usage

```liquid
<div class="widget-card reveal reveal-up">
  <!-- Card content -->
</div>
```

### Staggered Animations

Use the `--reveal-delay` CSS variable to stagger animations in loops:

```liquid
{% for blockId in widget.blocksOrder %}
  {% assign block = widget.blocks[blockId] %}
  <div class="item reveal reveal-up" style="--reveal-delay: {{ forloop.index0 }}" data-block-id="{{ blockId }}">
    <h3>{{ block.settings.title }}</h3>
  </div>
{% endfor %}
```

Each increment adds 0.1s delay. So `--reveal-delay: 0` has no delay, `--reveal-delay: 1` has 0.1s delay, `--reveal-delay: 2` has 0.2s delay, etc.

### Grid Items Example

```liquid
<div class="widget-grid widget-grid-3">
  {% for blockId in widget.blocksOrder %}
    {% assign block = widget.blocks[blockId] %}
    <div class="widget-card reveal reveal-up" style="--reveal-delay: {{ forloop.index0 }}" data-block-id="{{ blockId }}">
      {% image src: block.settings.image, size: 'medium', class: 'widget-card-image' %}
      <h3 class="widget-card-title">{{ block.settings.title }}</h3>
      <p class="widget-card-description">{{ block.settings.description }}</p>
    </div>
  {% endfor %}
</div>
```

### Important Notes

1. **Graceful Degradation**: When animations are disabled in theme settings, elements remain visible via CSS override
2. **Reduced Motion**: The system respects `prefers-reduced-motion` - animations are skipped automatically
3. **One-Time Animation**: Elements animate once when entering viewport and don't re-animate on scroll up

---

## Schema Conventions

### Schema File (`schema.json`)

```json
{
  "type": "my-widget",
  "displayName": "My Widget",
  "maxBlocks": 10,
  "aliases": ["alternative name", "keyword"],
  "settings": [
    // Widget settings here
  ],
  "blocks": [
    // Block definitions (optional)
  ],
  "defaultBlocks": [
    // Default block instances (if blocks are used)
  ]
}
```

### Block Limits

Use the `maxBlocks` property to limit how many blocks a widget can contain. This works for both page widgets and global widgets (header/footer).

- **Property**: `maxBlocks` (integer, optional)
- **Location**: Top level of `schema.json`, same level as `type` and `displayName`
- **Behavior**: When omitted or set to `0`, blocks are unlimited (backward compatible)
- **UI effect**: When the limit is reached, the "Add block" buttons and insertion zones are hidden, the "Duplicate" button on existing blocks is disabled, and a counter (e.g., "5/5") appears
- **Existing content**: If a widget already has more blocks than the limit (e.g., limit was added after content was created), existing blocks are preserved but no new blocks can be added

**Example**: Limiting a slideshow to 10 slides:

```json
{
  "type": "slideshow",
  "maxBlocks": 10,
  "displayName": "Slideshow",
  ...
}
```

### Settings Order

Use `header` setting types to group related settings. Standard order:

1. **Content settings** (image, title, description, etc.) - Use `content_header`
2. **Display settings** (layout, alignment, color scheme, playback, options) - Use `display_header`
3. **Background setting** (LAST) - Usually part of Display section

**Note:** Layout, Style, Playback, and Options settings are typically consolidated under the Display header for consistency.

### Header Setting Types

Use `header` setting types to visually group related settings in the editor UI. Headers improve organization and make settings easier to navigate.

#### Widget-Level Headers

**Standard Header Structure:**

```json
{
  "type": "header",
  "id": "content_header",
  "label": "Content"
}
```

**Common Header Types:**

1. **Content** (`content_header`)
   - Use for: Text content, images, links, buttons, and other content-related settings
   - Place at the beginning of content settings
   - Example: eyebrow, title, description, image, link

2. **Display** (`display_header`)
   - Use for: Visual appearance and behavior settings
   - Consolidates: Layout, Style, Playback, Options, and Color Scheme settings
   - Example: layout, alignment, color_scheme, autoplay, show_volume, show_speed

3. **Layout** (`layout_header`)
   - Use sparingly: Only when layout settings are distinct from display
   - Often consolidated into Display section
   - Example: image_position, week_start_day, layout (cards/bar)

4. **Options** (`options_header`)
   - Use for: Feature flags, toggles, and option checkboxes
   - Can be consolidated into Display if appropriate
   - Example: featured, show_seconds, animate, dietary options (vegetarian, vegan, etc.)

5. **Form** (`form_header`)
   - Use for: Form-specific settings
   - Example: form fields, validation settings

6. **Social Media** (`social_header`)
   - Use for: Social media link settings
   - Example: linkedin, twitter, instagram, etc.

#### Block-Level Headers

Blocks should also use headers to organize their settings:

**Common Block Header Types:**

1. **Content** (`content_header`)
   - All content-related block settings (text, images, links)

2. **Layout** (`layout_header`)
   - Block-specific layout settings (position, span, etc.)

3. **Style** (`style_header`)
   - Block-specific style settings (color, size, etc.)

4. **Options** (`options_header`)
   - Block-specific options (featured, closed, etc.)

#### Header Consolidation Rules

**Consolidate into Display:**

- Layout settings → Display (unless layout is a primary widget feature)
- Playback settings → Display (autoplay, loop, muted, controls)
- Options settings → Display (show_volume, show_speed, animate, etc.)

**Keep Separate:**

- Content → Always separate (first section)
- Social Media → Separate if there are many social links
- Form → Separate if form has many settings

#### Example: Proper Header Organization

```json
{
  "settings": [
    {
      "type": "header",
      "id": "content_header",
      "label": "Content"
    },
    {
      "type": "text",
      "id": "title",
      "label": "Heading"
    },
    {
      "type": "image",
      "id": "image",
      "label": "Image"
    },
    {
      "type": "header",
      "id": "display_header",
      "label": "Display"
    },
    {
      "type": "select",
      "id": "layout",
      "label": "Layout",
      "default": "cards"
    },
    {
      "type": "checkbox",
      "id": "animate",
      "label": "Animate numbers",
      "default": true
    },
    {
      "type": "select",
      "id": "color_scheme",
      "label": "Color Scheme",
      "default": "light"
    }
  ]
}
```

### Block Settings Order (for items with backgrounds)

Use `header` setting types to organize block settings:

1. **Content** (`content_header`) - title, text, link, image
2. **Layout** (`layout_header`) - col_span, row_span, position, etc.
3. **Style** (`style_header`) - text_color, alignment, rating, etc.
4. **Options** (`options_header`) - featured, closed, dietary options, etc.

**Background settings pattern:**

- Background image → overlay_color (with description) → background_color
- Usually part of Content or Style section depending on context

### Background Setting Pattern

```json
{
  "type": "select",
  "id": "background",
  "label": "Background",
  "default": "primary",
  "options": [
    { "value": "primary", "label": "Primary" },
    { "value": "secondary", "label": "Secondary" }
  ]
}
```

### Block Background Settings Pattern

```json
{
  "type": "image",
  "id": "image",
  "label": "Background image"
},
{
  "type": "color",
  "id": "overlay_color",
  "label": "Overlay color",
  "default": "#00000080",
  "allow_alpha": true,
  "description": "Applies only if there is a background image."
},
{
  "type": "color",
  "id": "background_color",
  "label": "Background color",
  "default": "#f9f9f9"
}
```

### Default Blocks

**Always provide default blocks** with meaningful content:

```json
"defaultBlocks": [
  {
    "type": "item",
    "settings": {
      "title": "Feature Title",
      "description": "Feature description text"
    }
  },
  {
    "type": "item",
    "settings": {
      "title": "Another Feature",
      "description": "More description text"
    }
  }
]
```

**Guidelines:**

- Use realistic, meaningful sample content
- Don't leave text fields empty
- Omit image fields (handled gracefully when empty)
- Provide enough blocks to show the layout (3-4 items)

---

## Standardized Block Types

To ensure consistency across widgets, use these standardized block definitions:

### Heading Block

**Standard sizes**: Large, XL, 2XL, 3XL, 4XL, 5XL

```json
{
  "type": "heading",
  "displayName": "Heading",
  "settings": [
    {
      "type": "text",
      "id": "text",
      "label": "Text",
      "default": "Section Heading"
    },
    {
      "type": "select",
      "id": "size",
      "label": "Size",
      "default": "2xl",
      "options": [
        { "value": "lg", "label": "Large" },
        { "value": "xl", "label": "Extra Large" },
        { "value": "2xl", "label": "2X Large" },
        { "value": "3xl", "label": "3X Large" },
        { "value": "4xl", "label": "4X Large" },
        { "value": "5xl", "label": "5X Large" }
      ]
    }
  ]
}
```

**Template usage:**

```liquid
{% assign size_class = 'block-text-' | append: block.settings.size %}
{% if widget.index == 1 %}
  <h1 class="widget-headline block-text {{ size_class }} block-text-bold block-text-heading">
    {{ block.settings.text }}
  </h1>
{% else %}
  <h2 class="widget-headline block-text {{ size_class }} block-text-bold block-text-heading">
    {{ block.settings.text }}
  </h2>
{% endif %}
```

---

### Text Block

**Standard sizes**: Small, Base, Large **Standard options**: Uppercase, Muted color

```json
{
  "type": "text",
  "displayName": "Text",
  "settings": [
    {
      "type": "textarea",
      "id": "text",
      "label": "Text",
      "default": "Add your text content here."
    },
    {
      "type": "select",
      "id": "size",
      "label": "Size",
      "default": "base",
      "options": [
        { "value": "sm", "label": "Small" },
        { "value": "base", "label": "Base" },
        { "value": "lg", "label": "Large" }
      ]
    },
    {
      "type": "checkbox",
      "id": "uppercase",
      "label": "Uppercase",
      "default": false
    },
    {
      "type": "checkbox",
      "id": "muted",
      "label": "Muted color",
      "default": false
    }
  ]
}
```

**Template usage:**

```liquid
{% assign size_class = 'block-text-' | append: block.settings.size %}
{% assign style_class = '' %}
{% if block.settings.uppercase %}{% assign style_class = style_class | append: ' block-text-uppercase' %}{% endif %}
{% if block.settings.muted %}{% assign style_class = style_class | append: ' block-text-muted' %}{% endif %}
<p class="widget-description block-text {{ size_class }}{{ style_class }}">
  {{ block.settings.text }}
</p>
```

---

### Button Block

**Display name**: "Button Group" (for 2 buttons) or "Button" (for 1 button) **Standard sizes**: Small, Medium, Large, Extra Large

```json
{
  "type": "button",
  "displayName": "Button Group",
  "settings": [
    {
      "type": "link",
      "id": "link",
      "label": "Button 1",
      "default": {
        "text": "Learn More",
        "href": "#",
        "target": "_self"
      }
    },
    {
      "type": "select",
      "id": "style",
      "label": "Button 1 style",
      "default": "secondary",
      "options": [
        { "value": "primary", "label": "Primary" },
        { "value": "secondary", "label": "Secondary" }
      ]
    },
    {
      "type": "link",
      "id": "link_2",
      "label": "Button 2"
    },
    {
      "type": "select",
      "id": "style_2",
      "label": "Button 2 style",
      "default": "secondary",
      "options": [
        { "value": "primary", "label": "Primary" },
        { "value": "secondary", "label": "Secondary" }
      ]
    },
    {
      "type": "select",
      "id": "size",
      "label": "Button size",
      "default": "medium",
      "options": [
        { "value": "small", "label": "Small" },
        { "value": "medium", "label": "Medium" },
        { "value": "large", "label": "Large" },
        { "value": "xlarge", "label": "Extra Large" }
      ]
    }
  ]
}
```

**Template usage:**

```liquid
{% assign size_class = '' %}
{% if block.settings.size == 'medium' %}{% assign size_class = 'widget-button-medium' %}
{% elsif block.settings.size == 'large' %}{% assign size_class = 'widget-button-large' %}
{% elsif block.settings.size == 'xlarge' %}{% assign size_class = 'widget-button-xlarge' %}
{% endif %}

<div class="widget-actions">
  {% if block.settings.link.text != blank %}
    <a
      href="{{ block.settings.link.href }}"
      class="widget-button {{ size_class }} {% if block.settings.style == 'primary' %}widget-button-primary{% else %}widget-button-secondary{% endif %}"
    >
      {{ block.settings.link.text }}
    </a>
  {% endif %}
  {% if block.settings.link_2.text != blank %}
    <a
      href="{{ block.settings.link_2.href }}"
      class="widget-button {{ size_class }} {% if block.settings.style_2 == 'primary' %}widget-button-primary{% else %}widget-button-secondary{% endif %}"
    >
      {{ block.settings.link_2.text }}
    </a>
  {% endif %}
</div>
```

**Button size reference:**

- **Small** (default): `padding: 0.8rem 1.6rem; font-size: sm`
- **Medium**: `padding: 1.2rem 2.4rem; font-size: base`
- **Large**: `padding: 1.6rem 3.2rem; font-size: lg`
- **Extra Large**: `padding: 2rem 4.8rem; font-size: xl`

---

## Accessibility

### Required Attributes

```html
<!-- Images -->
<img src="..." alt="Descriptive text" />

<!-- Icon-only buttons -->
<button aria-label="Close menu">
  <svg>...</svg>
</button>

<!-- Interactive accordion -->
<button aria-expanded="false" aria-controls="panel-1">Question</button>
<div id="panel-1" aria-labelledby="button-1" role="region">Answer</div>

<!-- Tabs -->
<button role="tab" aria-selected="true" aria-controls="panel-1">Tab 1</button>
<div role="tabpanel" id="panel-1" aria-labelledby="tab-1">Content</div>
```

### Keyboard Navigation

Ensure all interactive elements work with:

- **Tab**: Navigate between elements
- **Enter/Space**: Activate buttons
- **Escape**: Close modals/dropdowns
- **Arrow Keys**: Navigate tabs/sliders

### Semantic HTML

**Heading Hierarchy Rules:**

All widgets must follow this strict heading hierarchy for SEO and accessibility:

1. **Widget Title (if `widget.settings.title` exists)**:
   - `widget.index == 1` → `<h1>`
   - `widget.index != 1` → `<h2>`

2. **Block/Item Headings**:
   - **If widget has a title**:
     - `widget.index == 1` → Items use `<h2>`
     - `widget.index != 1` → Items use `<h3>`
   - **If widget has NO title**:
     - `widget.index == 1` → First item `<h1>`, others `<h2>`
     - `widget.index != 1` → All items `<h2>`

Example implementation:

```liquid
{%- comment -%} Widget header {%- endcomment -%}
{% if widget.settings.title != blank %}
  {% if widget.index == 1 %}
    <h1 class="widget-headline">{{ widget.settings.title }}</h1>
  {% else %}
    <h2 class="widget-headline">{{ widget.settings.title }}</h2>
  {% endif %}
{% endif %}

{%- comment -%} Item headings {%- endcomment -%}
{% assign item_heading_level = 'h3' %}
{% if widget.settings.title == blank %}
  {% assign item_heading_level = 'h2' %}
{% endif %}

{% for item in items %}
  <{{ item_heading_level }} class="item-title">{{ item.title }}</{{ item_heading_level }}>
{% endfor %}
```

**Other Semantic Requirements:**

- Use semantic elements (`<nav>`, `<main>`, `<article>`, `<section>`)
- Use `<button>` for actions, `<a>` for navigation

---

## Common Patterns

### Rendering Blocks

```liquid
<div class="widget-content">
  {% for blockId in widget.blocksOrder %}
    {% assign block = widget.blocks[blockId] %}
    <div class="item" data-block-id="{{ blockId }}">
      <h3 data-setting="title">{{ block.settings.title }}</h3>
      <p data-setting="description">{{ block.settings.description }}</p>
    </div>
  {% endfor %}
</div>
```

### Images

```liquid
<!-- Render image tag -->
{% image src: block.settings.image, size: 'medium', class: 'widget-card-image' %}

<!-- Get image path only (for CSS backgrounds) -->
{% image src: block.settings.image, size: 'large', output: 'path' %}
```

**Image sizes**: `thumb`, `small`, `medium`, `large`

### Videos

```liquid
<!-- Render video tag -->
{% video src: block.settings.video, controls: true, class: 'widget-video' %}

<!-- Get video path only -->
{% video src: block.settings.video, output: 'path' %}
```

### YouTube

```liquid
<!-- Render responsive YouTube embed -->
{% youtube src: block.settings.youtube_video, class: 'widget-youtube-embed' %}

<!-- Get embed URL only -->
{% youtube src: block.settings.youtube_video, output: 'path' %}
```

### Links

```liquid
{% if block.settings.button_link.text != blank %}
  <a
    href="{{ block.settings.button_link.href }}"
    class="widget-button"
    data-setting="button_link"
    {% if block.settings.button_link.target == '_blank' %}
      target="_blank" rel="noopener"
    {% endif %}
  >
    {{ block.settings.button_link.text }}
  </a>
{% endif %}
```

### Real-time Preview Updates

Add `data-setting` attributes to enable instant text updates in the editor:

```liquid
<h2 class="widget-headline" data-setting="title">{{ widget.settings.title }}</h2>
<p data-setting="description">{{ widget.settings.description }}</p>
<a href="..." data-setting="button_link">{{ widget.settings.button_link.text }}</a>
```

Match `data-setting` value to setting `id` in schema.

### Placeholder Images

```liquid
{% placeholder_image aspect: 'landscape', class: 'widget-card-image' %}
```

**Aspect ratios**: `square`, `portrait`, `landscape`

---

## Checklist

Before submitting a widget:

- [ ] Both `schema.json` and `widget.liquid` created in `widgets/{name}/`
- [ ] Standard section settings (eyebrow, title, description) included
- [ ] Settings organized with `header` types (Content, Display, etc.)
- [ ] Layout/Playback/Options consolidated under Display header when appropriate
- [ ] Block settings organized with appropriate headers (Content, Layout, Style, Options)
- [ ] Default blocks provided with meaningful content
- [ ] All CSS scoped with `.widget-{{ widget.id }}`
- [ ] Logical properties used (not `left`, `right`, etc.)
- [ ] Design system variables used (not hardcoded values)
- [ ] All text has `data-setting` attributes for live preview
- [ ] JavaScript supports multiple instances (IIFE + `getElementById`)
- [ ] ARIA attributes for interactive elements
- [ ] Keyboard navigation works
- [ ] Responsive on mobile, tablet, desktop
- [ ] Uses `block-text` utilities (no hardcoded typography CSS)
- [ ] Background setting at END of settings array (if applicable)
- [ ] No duplicate CSS properties from `base.css`
- [ ] Scroll reveal animations added to content elements (`.reveal .reveal-up` with `--reveal-delay`)
- [ ] `maxBlocks` set for widgets where block count should be limited

---

## Quick Reference

### Common Spacing Values

| Variable      | Value  | Pixels | Use Case        |
| ------------- | ------ | ------ | --------------- |
| `--space-xs`  | 0.8rem | 8px    | Tight spacing   |
| `--space-sm`  | 1.2rem | 12px   | Small gaps      |
| `--space-md`  | 1.6rem | 16px   | Default spacing |
| `--space-lg`  | 2.4rem | 24px   | Grid gaps       |
| `--space-xl`  | 3.2rem | 32px   | Section spacing |
| `--space-2xl` | 4rem   | 40px   | Large spacing   |
| `--space-3xl` | 4.8rem | 48px   | Header margins  |

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
| `--font-size-5xl`  | 3.6rem | 36px   | H1 (tablet)    |
| `--font-size-6xl`  | 4rem   | 40px   | H1 (desktop)   |

---

**See also:**

- [Theming Guide](theming.md) - Theme structure, global settings, layout templates
- [Setting Types Reference](theming-setting-types.md) - All available setting types
