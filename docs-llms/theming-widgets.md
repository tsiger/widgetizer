# Widget Authoring Guide

> **Complete reference for creating widgets in Widgetizer themes**

This document is the canonical reference for creating widgets: the `widget.liquid` skeleton, JavaScript isolation and editor lifecycle events, the enqueue asset system, schema conventions, standardized block types, accessibility, and an authoring checklist.

For the foundational concepts of theming (theme structure, global settings, layout templates), see the main [Theming Guide](theming.md). Design tokens (spacing, typography, color, width, and border scales) live in [Design System](arch-design-system.md). Every setting-type's JSON shape (`background`, `color`, `link`, `richtext`, `gallery`, `table`, …) lives in [Setting Types Reference](theming-setting-types.md).

---

## Table of Contents

1. [Widget Structure](#widget-structure)
2. [Layout & Spacing](#layout--spacing)
3. [Typography System](#typography-system)
4. [Color System](#color-system)
5. [Component Patterns](#component-patterns)
6. [JavaScript Patterns](#javascript-patterns)
7. [Editor Lifecycle Events](#editor-lifecycle-events)
8. [Scroll Reveal Animations](#scroll-reveal-animations)
9. [Schema Conventions](#schema-conventions)
10. [Standardized Block Types](#standardized-block-types)
11. [Accessibility](#accessibility)
12. [Common Patterns](#common-patterns)
13. [Checklist](#checklist)

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

  <div class="widget-container">
    <!-- Optional: Widget Header -->
    {% if widget.settings.title != blank or widget.settings.description != blank or widget.settings.eyebrow != blank %}
      <div class="widget-header">
        {% if widget.settings.eyebrow != blank %}
          <span class="w-eyebrow t-uppercase" data-setting="eyebrow">{{ widget.settings.eyebrow }}</span>
        {% endif %}
        {% if widget.settings.title != blank %}
          <h2 class="w-headline" data-setting="title">{{ widget.settings.title }}</h2>
        {% endif %}
        {% if widget.settings.description != blank %}
          <p class="w-description" data-setting="description">{{ widget.settings.description }}</p>
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

> The background/scheme treatment (the inline `--widget-bg-color` and `widget-container-padded`) is added by the [Color System](#color-system) — see that section for the full pattern.

### Required Attributes

| Attribute                                             | Purpose                                                    |
| ----------------------------------------------------- | ---------------------------------------------------------- |
| `id="{{ widget.id }}"`                                | Unique widget instance ID for CSS scoping and JS targeting |
| `class="widget widget-{name} widget-{{ widget.id }}"` | Base class + semantic name + scoped class                  |
| `data-widget-id="{{ widget.id }}"`                    | For JavaScript targeting                                   |
| `data-widget-type="{widget-name}"`                    | For debugging/identification                               |

### CSS Scoping & Nesting

Wrap all widget-specific CSS in a `.widget-{{ widget.id }}` block so it never leaks to other widgets, and use **native CSS nesting** with `&`:

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

Reference all spacing, font-size, color, width, and border values through design-token variables (`var(--space-*)`, `var(--font-size-*)`, `var(--text-*)`, …) — never hardcode pixel values. The full token tables live in [Design System](arch-design-system.md).

**Always use logical properties** for directional styles so widgets work in right-to-left languages:

| ❌ Don't Use     | ✅ Use Instead          |
| ---------------- | ----------------------- |
| `margin-left`    | `margin-inline-start`   |
| `margin-right`   | `margin-inline-end`     |
| `padding-top`    | `padding-block-start`   |
| `padding-bottom` | `padding-block-end`     |
| `left: 0`        | `inset-inline-start: 0` |
| `top: 0`         | `inset-block-start: 0`  |

### Scoped CSS Role

Scoped CSS (`& .element { ... }`) should ONLY handle:

- **Layout** (flex, grid, width, gap, position, text-align)
- **Spacing** (padding, margin-block-end)
- **Font-size** (with scale multipliers — keep in scoped CSS for now)
- **Widget-specific visual** (transitions, animations, borders, border-radius)

It should **NOT** set `color`, `font-weight`, or `line-height` — these belong in the `w-*` and `t-*` typography classes (see [Typography System](#typography-system)).

Exception: Elements with hardcoded colors (e.g. a project overlay with `color: #fff`) can set color in scoped CSS.

### Content Flow Spacing

For widgets with dynamic block ordering (text, headings, buttons), use the **content-flow** pattern for automatic, order-agnostic spacing:

```liquid
<div class="widget-content content-flow widget-content-lg {% if widget.settings.alignment == 'center' %}widget-content-align-center{% else %}widget-content-align-start{% endif %}">
  {% for blockId in widget.blocksOrder %}
    {% assign block = widget.blocks[blockId] %}
    {% case block.type %}
      {% when 'heading' %}
        {% assign size_class = 't-' | append: block.settings.size %}
        {% if widget.index == 1 %}
          <h1 class="w-headline {{ size_class }} reveal reveal-up" style="--reveal-delay: {{ forloop.index0 }}">
            {{ block.settings.text }}
          </h1>
        {% else %}
          <h2 class="w-headline {{ size_class }} reveal reveal-up" style="--reveal-delay: {{ forloop.index0 }}">
            {{ block.settings.text }}
          </h2>
        {% endif %}
      {% when 'text' %}
        {%- assign size_class = 't-' | append: block.settings.size -%}
        {%- assign style_class = '' -%}
        {%- if block.settings.uppercase -%}{%- assign style_class = style_class | append: ' t-uppercase' -%}{%- endif -%}
        {%- if block.settings.muted -%}{%- assign style_class = style_class | append: ' t-muted' -%}{%- endif -%}
        <div class="w-body w-rte {{ size_class }}{{ style_class }} reveal reveal-up" style="--reveal-delay: {{ forloop.index0 }}">
          {{ block.settings.text | raw }}
        </div>
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

For widgets that need custom spacing for specific elements (e.g., extra spacing before buttons), add a widget-specific override in your `<style>` block:

```css
.widget-{{ widget.id }} {
  & .content-flow > .widget-actions:last-child {
    margin-block-start: var(--space-xl); /* 32px */
  }
}
```

**Benefits:** order-agnostic, no manual spacing, flexible for any combination of blocks, and consistent across widgets.

---

## Layout & Spacing

### Widget Container System

```liquid
<div class="widget-container">
  <!-- Content -->
</div>
```

- **Default**: Margin-based spacing (collapses naturally between adjacent widgets)
- **With background**: Add `widget-container-padded` class for padding-based spacing (the [Color System](#color-system) adds this automatically for non-default schemes)

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
<section class="widget widget-height-small">   <!-- 50vh -->
<section class="widget widget-height-medium"> <!-- 75vh -->
<section class="widget widget-height-large">   <!-- 100vh -->
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

**Responsive behavior:** mobile 1 column, tablet (750px+) 2 columns, desktop (990px+) `--grid-cols-desktop`.

### Spacing Guidelines

- **Use `gap`** for flex/grid containers
- **Use individual margins** for hero/banner elements (precise control)
- **Never hardcode** spacing values — always use the `--space-*` tokens from [Design System](arch-design-system.md)

---

## Typography System

The typography system uses two class layers: **semantic base classes** (`w-` prefix) that define the role and default styles of text, and **text modifiers** (`t-` prefix) that override individual properties. The underlying font-size/weight/line-height scales are documented in [Design System](arch-design-system.md).

### Semantic Base Classes (`w-` prefix)

Each class is a complete, self-contained text style with `margin: 0`. Always start with one `w-*` class per element.

```html
<span class="w-eyebrow t-uppercase">Label</span>      <!-- Small muted label -->
<h2 class="w-headline">Section Heading</h2>             <!-- Section-level heading -->
<h3 class="w-title">Card Title</h3>                     <!-- Item-level heading -->
<p class="w-description">Subtext below headline</p>     <!-- Header trio only -->
<p class="w-body">Body content text</p>                  <!-- All other body text -->
<span class="w-meta t-sm">Jan 2025</span>               <!-- Small muted metadata -->
<span class="w-label t-xs t-uppercase">Badge</span>     <!-- Small bold label -->
```

Key distinctions:
- `w-headline` = section-level (h1/h2 in widget header). `w-title` = item-level (card title, list item).
- `w-description` = header trio subtext ONLY. `w-body` = all other body text.
- `w-eyebrow` does NOT include uppercase — add `t-uppercase` explicitly when needed.

### Text Modifier Classes (`t-` prefix)

Composable modifiers layered on top of any `w-*` base class:

```html
<h3 class="w-title t-2xl">Large title</h3>
<p class="w-body t-sm t-muted">Small muted text</p>
<span class="w-meta t-sm t-uppercase t-accent">Styled meta</span>
```

**Size** (`t-xs` through `t-xl` use body-scale; `t-2xl` through `t-9xl` use heading-scale):
```html
<span class="w-body t-sm">Small body</span>
<h2 class="w-headline t-5xl">Large heading</h2>
```

**Weight**: `t-normal`, `t-medium`, `t-semibold`, `t-heading-weight`, `t-body-bold`

**Color**: `t-muted`, `t-heading`, `t-accent`

**Style**: `t-uppercase` (adds `text-transform: uppercase` + `letter-spacing: 0.05em`)

### Rich Text Container

Use `w-rte` alongside `w-body` for richtext field output:

```html
<div class="w-body w-rte t-sm">{{ block.settings.text | raw }}</div>
```

`w-rte` styles nested `<p>`, `<a>`, `<ul>`, `<ol>`, and `<li>` elements.

### Dynamic Size/Style Classes in Liquid

For widgets with configurable text size and style:

```liquid
{%- assign size_class = 't-' | append: block.settings.size -%}
{%- assign style_class = '' -%}
{%- if block.settings.uppercase -%}{%- assign style_class = style_class | append: ' t-uppercase' -%}{%- endif -%}
{%- if block.settings.muted -%}{%- assign style_class = style_class | append: ' t-muted' -%}{%- endif -%}

<div class="w-body w-rte {{ size_class }}{{ style_class }}">{{ block.settings.text | raw }}</div>
```

---

## Color System

### Color Scheme Classes

Arch widgets support four color schemes. Each scheme is a class on the `<section>` that redefines the theme color tokens (`--text-heading`, `--bg-primary`, `--accent`, …) for its subtree:

```liquid
<!-- Standard light scheme (default) -->
<section class="widget color-scheme-standard-primary">…</section>

<!-- Standard scheme with bg_primary ↔ bg_secondary swapped -->
<section class="widget color-scheme-standard-secondary">…</section>

<!-- Highlight (dark/emphasis) scheme -->
<section class="widget color-scheme-highlight-primary">…</section>

<!-- Highlight scheme with bg_primary ↔ bg_secondary swapped -->
<section class="widget color-scheme-highlight-secondary">…</section>
```

`standard-primary` is the page default (no padded container, no filled background). The other three are "emphasis" schemes that paint a solid section background and add padding.

**Widget-level color-scheme setting.** Add a `select` whose options use the shared `tTheme:global.widgets.settings.color_scheme.*` keys and default to `standard-primary`:

```json
{
  "type": "select",
  "id": "color_scheme",
  "label": "tTheme:global.widgets.settings.color_scheme.label",
  "default": "standard-primary",
  "options": [
    { "value": "standard-primary", "label": "tTheme:global.widgets.settings.color_scheme.options.standard_primary" },
    { "value": "standard-secondary", "label": "tTheme:global.widgets.settings.color_scheme.options.standard_secondary" },
    { "value": "highlight-primary", "label": "tTheme:global.widgets.settings.color_scheme.options.highlight_primary" },
    { "value": "highlight-secondary", "label": "tTheme:global.widgets.settings.color_scheme.options.highlight_secondary" }
  ]
}
```

**Widget template.** Apply the scheme class, and for any non-default scheme set `--widget-bg-color` to the scheme's own `--bg-primary` and add `widget-container-padded`:

```liquid
<section
  class="widget widget-{name} widget-{{ widget.id }} color-scheme-{{ widget.settings.color_scheme }}"
  {% unless widget.settings.color_scheme == 'standard-primary' %}
    style="--widget-bg-color: var(--bg-primary);"
  {% endunless %}
>
  <div class="widget-container {% unless widget.settings.color_scheme == 'standard-primary' %}widget-container-padded{% endunless %}">
    <!-- Content -->
  </div>
</section>
```

**How it works:**

1. `color-scheme-{{ widget.settings.color_scheme }}` selects the scheme class, which **redefines** `--bg-primary`, `--text-heading`, `--accent`, and the other color tokens for everything inside the section.
2. For non-default schemes, the inline `--widget-bg-color: var(--bg-primary)` paints the section background using *that scheme's* resolved `--bg-primary` — so `highlight-primary` paints dark, `standard-secondary` paints the swapped light tone, and so on. (It is guarded against `standard-primary` because the page default stays transparent and unpadded.)
3. `widget-container-padded` adds vertical padding so the filled background has breathing room.
4. All text, borders, and accent colors switch automatically because they all read scheme-scoped tokens.

> Note: `--widget-bg-color` is correct as `var(--bg-primary)` precisely because each scheme class redefines `--bg-primary` — it is not a hardcoded color. If you instead want a single fixed background regardless of scheme, set `--widget-bg-color` to a literal value or a custom setting (see below).

### Per-Widget Spacing Overrides

Many Arch widgets also expose `top_spacing` and `bottom_spacing` settings so authors can suppress section spacing without writing widget-specific CSS.

```liquid
<section
  class="widget widget-{name} widget-{{ widget.id }}{% if widget.settings.top_spacing == 'none' %} spacing-top-none{% endif %}{% if widget.settings.bottom_spacing == 'none' %} spacing-bottom-none{% endif %}"
>
  …
</section>
```

Global rules in `base.css` target descendants (`.widget.spacing-top-none .widget-container`) rather than direct children, which keeps spacing overrides working even when a widget injects a `<style>` block before `.widget-container`.

### Custom Background Override

Color schemes handle the section background, but you can still override it with a custom value (e.g. a `color` setting). A custom `--widget-bg-color` overrides the scheme background completely:

```liquid
<section
  class="widget widget-{name} widget-{{ widget.id }} color-scheme-{{ widget.settings.color_scheme }}"
  style="--widget-bg-color: {{ widget.settings.background_color }};"
>
  <!-- Content -->
</section>
```

For the JSON shape of the underlying `color` / `background` / overlay settings, see [Setting Types Reference](theming-setting-types.md).

---

## Component Patterns

### Buttons

```liquid
<!-- Primary / Secondary -->
<a href="#" class="widget-button widget-button-primary">Primary</a>
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
  <div class="widget-card-header">
    <span class="w-eyebrow t-xs">Category</span>
    <h3 class="w-title">Card Title</h3>
  </div>
  <img src="..." class="widget-card-image" alt="..." />
  <div class="widget-card-content">
    <p class="w-body t-sm">Description</p>
  </div>
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

<div class="form-checkbox-group">
  <input type="checkbox" id="agree" class="form-checkbox" />
  <label for="agree" class="form-checkbox-label">I agree</label>
</div>
```

For the editor-driven contact form widget, see [Form Widget](core-form-widget.md).

### Icons

```liquid
{% render 'icon', icon: 'star', class: 'widget-card-icon' %}
```

Available icon classes:

- `.widget-icon` — Default size (32px)
- `.widget-icon-small` — Small (20px)
- `.widget-icon-large` — Large (48px)

The full icon set is listed in [arch-icons-list.txt](arch-icons-list.txt).

---

## JavaScript Patterns

### Standard Initialization Pattern (inline scripts)

**CRITICAL**: Each widget instance must be isolated. Use this pattern for inline `<script>` blocks:

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
        panels[index].classList.toggle('active');
      });
    });
  })();
</script>
```

**Key points:**

1. **IIFE wrapper** — prevents global scope pollution.
2. **Get by ID** — `getElementById('{{ widget.id }}')` targets only this instance.
3. **Initialization guard** — checking `dataset.initialized` prevents duplicate listeners.
4. **Scoped queries** — use `widget.querySelector()`, never `document.querySelector()`.
5. **Proper `this`** — use `function()` for event handlers, not arrow functions.

### Enqueuing External CSS & JS

For complex widgets, place external files directly in the widget folder and enqueue them:

```
widgets/
└── slideshow/
    ├── schema.json
    ├── widget.liquid
    ├── slideshow.css
    └── slideshow.js
```

```liquid
{% enqueue_style src: "slideshow.css", priority: 30 %}
{% enqueue_script src: "slideshow.js", priority: 30 %}
```

Enqueued assets are rendered by `{% header_assets %}` (styles) and `{% footer_assets %}` (scripts) in the layout template, sorted by `priority`. During editor partial updates (widget morphing), newly enqueued assets are appended to the single-widget render response and loaded by the preview runtime, so a script like `carousel.js` becomes available immediately when a setting change triggers its enqueue.

**Asset resolution:**

- **Inside widget templates** — assets load from that widget's folder (`widgets/{widget-name}/`). If a file is not found there during preview, it falls back to the theme `assets/` folder.
- **Inside `layout.liquid` or snippets** — assets load from the theme `assets/` folder.
- **`theme: true` option** — forces resolution from the theme `assets/` folder even when called from a widget template. Use this for shared theme-level assets (e.g. `carousel.js`) enqueued by multiple widgets:

```liquid
{% enqueue_script src: "carousel.js", defer: true, location: "footer", priority: 40, theme: true %}
```

**Deduplication:** the enqueue system keys on the filename, so multiple widgets can safely enqueue the same asset and it is output only once.

> [!IMPORTANT] **Asset Filename Collisions**
>
> During export, all widget CSS/JS files are flattened into a single `assets/` folder. If two widgets ship files with the same name (e.g. both have `styles.css`), **the last one copied wins** and the other widget breaks in the exported site.
>
> **Best practice:** use unique, widget-prefixed filenames (`slideshow.css`, `accordion-scripts.js`) instead of generic ones (`styles.css`, `scripts.js`). In preview mode each widget's assets are served from separate paths, so the collision only occurs during export. See [Export](core-export.md).

### Re-initialization on Partial Updates (external scripts)

External `.js` files loaded via `{% enqueue_script %}` run **once** at page load. During editor partial updates the widget's HTML is replaced but external scripts do not re-run, so event listeners are lost. (Inline scripts inside `widget.liquid` are automatically re-executed and do not need this.)

External scripts must listen for the `widget:updated` event, dispatched by the preview runtime after morphing a widget:

```javascript
/**
 * Widget JavaScript with partial update support
 */
(function () {
  "use strict";

  function initMyWidget(widget) {
    if (widget.dataset.initialized) return;
    widget.dataset.initialized = "true";

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
      widget.removeAttribute("data-initialized"); // allow re-init
      initMyWidget(widget);
    }
  });
})();
```

**Key points:**

1. **Extract init into a function** so it is callable on both page load and update.
2. **Listen for `widget:updated`** — it bubbles from the morphed widget element.
3. **Remove `data-initialized`** so the init function can run again.
4. **Use `e.target.closest()`** — the event target is the widget element itself.

**Use this pattern for:** external `.js` files, and any widget that attaches event listeners (sliders, accordions, tabs, …). **Not needed for:** inline scripts, CSS-only widgets, or declarative-only widgets.

---

## Editor Lifecycle Events

When a widget renders inside the Widgetizer editor, the preview runtime dispatches custom DOM events on widget elements as the user interacts with the sidebar. Theme JavaScript can listen for these to sync visual state with the editor selection — e.g. navigating a slideshow to the selected slide or opening an accordion panel.

### Design Mode Detection

```javascript
if (window.Widgetizer?.designMode) {
  // Running inside the editor preview
}
```

The editor preview controller injects `<script>window.Widgetizer={designMode:true};</script>` into `<head>`. In production and standalone preview, `window.Widgetizer` is `undefined`.

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
2. `widget:deselect` (on previous widget, if the widget changed)
3. `widget:select` (on new widget, if the widget changed)
4. `widget:block-select` (on new widget, if a block is selected)

### Examples

#### Slideshow — navigate to selected slide

```javascript
if (window.Widgetizer?.designMode) {
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

  widget.addEventListener("widget:select", () => stopAutoplay());
  widget.addEventListener("widget:deselect", () => startAutoplay());
}
```

#### Accordion — expand the selected panel

```javascript
if (window.Widgetizer?.designMode) {
  widget.addEventListener('widget:block-select', (e) => {
    const { blockId } = e.detail;
    const item = widget.querySelector(`.accordion-item[data-block-id="${blockId}"]`);
    if (!item) return;
    const trigger = item.querySelector('.accordion-trigger');
    const content = item.querySelector('.accordion-content');
    if (!trigger || !content) return;
    if (trigger.getAttribute('aria-expanded') === 'true') return;
    trigger.setAttribute('aria-expanded', 'true');
    content.setAttribute('aria-hidden', 'false');
  });
}
```

### Important Notes

1. **Guard with `designMode`** so listeners never run in production.
2. **Events fire on the widget element** — use `widget.addEventListener()`, not `document.addEventListener()`.
3. **Re-initialization safe** — because these listeners are added inside the init function, they re-attach after `widget:updated`.
4. **Events fire only on state change** — selecting the same block twice does not re-fire `widget:block-select`.

---

## Scroll Reveal Animations

The theme includes a scroll-reveal animation system. Add animation classes to elements to animate them as they enter the viewport.

| Class           | Effect                           |
| :-------------- | :------------------------------- |
| `.reveal`       | Base class (required) — fades in |
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

Use the `--reveal-delay` CSS variable to stagger animations in loops. Each increment adds 0.1s of delay (`0` = no delay, `1` = 0.1s, `2` = 0.2s …):

```liquid
{% for blockId in widget.blocksOrder %}
  {% assign block = widget.blocks[blockId] %}
  <div class="item reveal reveal-up" style="--reveal-delay: {{ forloop.index0 }}" data-block-id="{{ blockId }}">
    <h3>{{ block.settings.title }}</h3>
  </div>
{% endfor %}
```

### Important Notes

1. **Graceful degradation** — when animations are disabled in theme settings, elements remain visible via a CSS override.
2. **Reduced motion** — the system respects `prefers-reduced-motion` and skips animations automatically.
3. **One-time** — elements animate once on entering the viewport and don't re-animate on scroll-up.

---

## Schema Conventions

### Schema File (`schema.json`)

User-facing strings in the schema (`displayName`, `label`, `description`, and option labels) should use `tTheme:`-prefixed keys that reference entries in the theme's locale files (`locales/*.json`). This keeps schemas language-independent and enables translation.

For small one-off themes, direct strings also work at runtime (e.g. `"displayName": "Hero"`), but the theme should still ship a minimal `locales/en.json` because projects copy `locales/` as part of the theme package.

```json
{
  "type": "my-widget",
  "displayName": "tTheme:my_widget.name",
  "maxBlocks": 10,
  "aliases": ["alternative name", "keyword"],
  "supportsTransparentHeader": false,
  "settings": [ /* Widget settings */ ],
  "blocks": [ /* Block definitions (optional) */ ],
  "defaultBlocks": [ /* Default block instances */ ]
}
```

**Key naming convention.** The `tTheme:` key path follows `{widget_type}.{path}`, where the widget type has hyphens converted to underscores (e.g. `bento-grid` → `bento_grid`):

- `{widget_type}.name` — widget `displayName`
- `{widget_type}.settings.{setting_id}.label` — setting label
- `{widget_type}.settings.{setting_id}.description` — setting help text
- `{widget_type}.settings.{setting_id}.options.{value}` — select/radio option label
- `{widget_type}.blocks.{block_type}.name` — block `displayName`
- `{widget_type}.blocks.{block_type}.settings.{setting_id}.label` — block setting label

For the full catalogue of setting types and their JSON shapes, see [Setting Types Reference](theming-setting-types.md).

### Transparent Header Support

Add `"supportsTransparentHeader": true` to a widget's `schema.json` to make it a candidate for the transparent-header feature.

- **Location**: top level of `schema.json`, same level as `type` and `displayName`.
- **Default**: `false` (omitting is equivalent to `false`).
- **Effect**: when `true` and the widget is first on a page, the backend adds a `transparent-header` class to `<body>` so the header overlays the widget (if the header's "Transparent on hero" setting is enabled).
- **Typical use**: full-bleed hero widgets with background images (banners, slideshows, video popups).

### Block Limits

Use `maxBlocks` to limit how many blocks a widget can contain (works for page and global widgets).

- **Location**: top level of `schema.json`.
- **Behavior**: omitted or `0` means unlimited (backward compatible).
- **UI effect**: when the limit is reached, "Add block" buttons and insertion zones hide, "Duplicate" is disabled, and a counter (e.g. "5/5") appears.
- **Existing content**: if a widget already has more blocks than the limit, existing blocks are preserved but no new ones can be added.

### Settings Order & Headers

Use `header` setting types to visually group related settings in the editor. Standard order:

1. **Content** (`content_header`) — text, images, links, buttons. First section.
2. **Display** (`display_header`) — visual appearance and behavior. Consolidates Layout, Style, Playback, and Options.
3. **Background / color scheme** — usually part of the Display section, placed last.

```json
{
  "settings": [
    { "type": "header", "id": "content_header", "label": "tTheme:my_widget.settings.content_header.label" },
    { "type": "text",   "id": "title",          "label": "tTheme:my_widget.settings.title.label" },
    { "type": "image",  "id": "image",          "label": "tTheme:my_widget.settings.image.label" },
    { "type": "header", "id": "display_header",  "label": "tTheme:my_widget.settings.display_header.label" },
    { "type": "select", "id": "layout",         "label": "tTheme:my_widget.settings.layout.label", "default": "cards" },
    { "type": "checkbox", "id": "animate",       "label": "tTheme:my_widget.settings.animate.label", "default": true },
    { "type": "select", "id": "color_scheme",   "label": "tTheme:global.widgets.settings.color_scheme.label", "default": "standard-primary" }
  ]
}
```

**Other header types:** `layout_header` (only when layout is distinct from display), `options_header` (feature flags/toggles), `form_header`, `social_header`, and for blocks `style_header`. Consolidate Layout/Playback/Options into Display unless a setting group is a primary widget feature; always keep Content first.

**Block settings order** (for items with backgrounds): Content (`content_header`) → Layout (`layout_header`) → Style (`style_header`) → Options (`options_header`). The background pattern is image → overlay color → background color.

### Setting-Type Cross-References

The JSON for individual setting types is documented in [Setting Types Reference](theming-setting-types.md) — don't duplicate it in widget docs. Highlights worth knowing as a widget author:

- **`background` / `color` / overlay** — the `select` background pattern, the `color` type with `allow_alpha`, and overlay-color conventions all live there.
- **`link` and button links** — a compound `{ href, text, target, pageUuid }` value. The picker also offers **collection-item targets**: selecting a collection item stores `collectionType` + `collectionItemUuid` (instead of `pageUuid`), and the renderer resolves it to the item's URL at render/export time. So a single `link` setting can point at a page *or* a collection item. See [Collections](core-collections.md).
- **`richtext`** — beyond `placeholder` / `allow_source`, the field accepts `allow_headings` (enables H2–H4 in the toolbar), `allow_images` (enables inline image insertion), and `min_height` (minimum editor height in px). Use these to scope the editor to what the widget actually renders.
- **`gallery`** — an ordered list of images for slideshow/gallery/logo-cloud-style widgets.
- **`table`** — a row/column grid (v1 is `text`-celled, aimed at collection-type schemas).

### Richtext Emptiness Guard (`rte_text` / `rte_blank`)

Richtext values are **never truly `blank` when "empty"** — the editor leaves behind markup like `<p></p>`, `<p><br></p>`, or `<p>&nbsp;</p>`. So the usual `{% if x != blank %}` guard (correct for `text`/`textarea`) always thinks a richtext field has content. Two `@widgetizer/core` filters fix this:

- `rte_text` — collapses an RTE value to its plain text (strips tags, `&nbsp;`, whitespace).
- `rte_blank` — boolean: is the value *visually* empty?

```liquid
{%- comment -%} Correct emptiness test for a richtext field {%- endcomment -%}
{% unless block.settings.description | rte_blank %}
  <div class="w-body w-rte">{{ block.settings.description | raw }}</div>
{% endunless %}

{%- comment -%} Equivalent via rte_text {%- endcomment -%}
{% assign desc = widget.settings.copyright | rte_text %}
{% if desc != blank %}
  <div class="w-rte">{{ widget.settings.copyright | raw }}</div>
{% endif %}
```

> Always output the **raw original** (`| raw`) for display — `rte_text` / `rte_blank` are for the emptiness test only, never for rendering.

### Default Blocks

Always provide default blocks with realistic, meaningful sample content:

```json
"defaultBlocks": [
  { "type": "item", "settings": { "title": "Feature Title", "description": "Feature description text" } },
  { "type": "item", "settings": { "title": "Another Feature", "description": "More description text" } }
]
```

**Guidelines:** use meaningful sample content, don't leave text fields empty, omit image fields (handled gracefully when empty), and provide enough blocks (3–4) to show the layout.

---

## Standardized Block Types

To keep shared block types consistent across widgets, use these standardized definitions. The `text`, `heading`, and `button` blocks must use identical settings everywhere they appear.

### Heading Block

**Standard sizes**: Large, XL, 2XL, 3XL, 4XL, 5XL

```json
{
  "type": "heading",
  "displayName": "tTheme:my_widget.blocks.heading.name",
  "settings": [
    { "type": "text", "id": "text", "label": "tTheme:my_widget.blocks.heading.settings.text.label", "default": "Section Heading" },
    {
      "type": "select",
      "id": "size",
      "label": "tTheme:my_widget.blocks.heading.settings.size.label",
      "default": "2xl",
      "options": [
        { "value": "lg",  "label": "tTheme:my_widget.blocks.heading.settings.size.options.lg" },
        { "value": "xl",  "label": "tTheme:my_widget.blocks.heading.settings.size.options.xl" },
        { "value": "2xl", "label": "tTheme:my_widget.blocks.heading.settings.size.options.2xl" },
        { "value": "3xl", "label": "tTheme:my_widget.blocks.heading.settings.size.options.3xl" },
        { "value": "4xl", "label": "tTheme:my_widget.blocks.heading.settings.size.options.4xl" },
        { "value": "5xl", "label": "tTheme:my_widget.blocks.heading.settings.size.options.5xl" }
      ]
    }
  ]
}
```

**Template usage:**

```liquid
{% assign size_class = 't-' | append: block.settings.size %}
{% if widget.index == 1 %}
  <h1 class="w-headline {{ size_class }}">{{ block.settings.text }}</h1>
{% else %}
  <h2 class="w-headline {{ size_class }}">{{ block.settings.text }}</h2>
{% endif %}
```

### Text Block

**Standard sizes**: Small, Base, Large. **Standard options**: Uppercase, Muted.

```json
{
  "type": "text",
  "displayName": "tTheme:my_widget.blocks.text.name",
  "settings": [
    { "type": "textarea", "id": "text", "label": "tTheme:my_widget.blocks.text.settings.text.label", "default": "Add your text content here." },
    {
      "type": "select",
      "id": "size",
      "label": "tTheme:my_widget.blocks.text.settings.size.label",
      "default": "base",
      "options": [
        { "value": "sm",   "label": "tTheme:my_widget.blocks.text.settings.size.options.sm" },
        { "value": "base", "label": "tTheme:my_widget.blocks.text.settings.size.options.base" },
        { "value": "lg",   "label": "tTheme:my_widget.blocks.text.settings.size.options.lg" }
      ]
    },
    { "type": "checkbox", "id": "uppercase", "label": "tTheme:my_widget.blocks.text.settings.uppercase.label", "default": false },
    { "type": "checkbox", "id": "muted",     "label": "tTheme:my_widget.blocks.text.settings.muted.label", "default": false }
  ]
}
```

**Template usage:**

```liquid
{%- assign size_class = 't-' | append: block.settings.size -%}
{%- assign style_class = '' -%}
{%- if block.settings.uppercase -%}{%- assign style_class = style_class | append: ' t-uppercase' -%}{%- endif -%}
{%- if block.settings.muted -%}{%- assign style_class = style_class | append: ' t-muted' -%}{%- endif -%}
<div class="w-body w-rte {{ size_class }}{{ style_class }}">
  {{ block.settings.text | raw }}
</div>
```

### Button Block

**Display name**: "Button Group" (2 buttons) or "Button" (1 button). **Standard sizes**: Small, Medium, Large, Extra Large.

```json
{
  "type": "button",
  "displayName": "tTheme:my_widget.blocks.button.name",
  "settings": [
    { "type": "link", "id": "link", "label": "tTheme:my_widget.blocks.button.settings.link.label", "default": { "text": "Learn More", "href": "#", "target": "_self" } },
    {
      "type": "select", "id": "style", "label": "tTheme:my_widget.blocks.button.settings.style.label", "default": "secondary",
      "options": [
        { "value": "primary",   "label": "tTheme:my_widget.blocks.button.settings.style.options.primary" },
        { "value": "secondary", "label": "tTheme:my_widget.blocks.button.settings.style.options.secondary" }
      ]
    },
    { "type": "link", "id": "link_2", "label": "tTheme:my_widget.blocks.button.settings.link_2.label" },
    {
      "type": "select", "id": "style_2", "label": "tTheme:my_widget.blocks.button.settings.style_2.label", "default": "secondary",
      "options": [
        { "value": "primary",   "label": "tTheme:my_widget.blocks.button.settings.style_2.options.primary" },
        { "value": "secondary", "label": "tTheme:my_widget.blocks.button.settings.style_2.options.secondary" }
      ]
    },
    {
      "type": "select", "id": "size", "label": "tTheme:my_widget.blocks.button.settings.size.label", "default": "medium",
      "options": [
        { "value": "small",  "label": "tTheme:my_widget.blocks.button.settings.size.options.small" },
        { "value": "medium", "label": "tTheme:my_widget.blocks.button.settings.size.options.medium" },
        { "value": "large",  "label": "tTheme:my_widget.blocks.button.settings.size.options.large" },
        { "value": "xlarge", "label": "tTheme:my_widget.blocks.button.settings.size.options.xlarge" }
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
    <a href="{{ block.settings.link.href }}"
       class="widget-button {{ size_class }} {% if block.settings.style == 'primary' %}widget-button-primary{% else %}widget-button-secondary{% endif %}">
      {{ block.settings.link.text }}
    </a>
  {% endif %}
  {% if block.settings.link_2.text != blank %}
    <a href="{{ block.settings.link_2.href }}"
       class="widget-button {{ size_class }} {% if block.settings.style_2 == 'primary' %}widget-button-primary{% else %}widget-button-secondary{% endif %}">
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
<button aria-label="Close menu"><svg>...</svg></button>

<!-- Interactive accordion -->
<button aria-expanded="false" aria-controls="panel-1">Question</button>
<div id="panel-1" aria-labelledby="button-1" role="region">Answer</div>

<!-- Tabs -->
<button role="tab" aria-selected="true" aria-controls="panel-1">Tab 1</button>
<div role="tabpanel" id="panel-1" aria-labelledby="tab-1">Content</div>
```

### Keyboard Navigation

Ensure all interactive elements work with **Tab** (navigate), **Enter/Space** (activate), **Escape** (close modals/dropdowns), and **Arrow Keys** (navigate tabs/sliders).

### Semantic HTML & Heading Hierarchy

All widgets must follow a strict heading hierarchy for SEO and accessibility:

1. **Widget title** (if `widget.settings.title` exists):
   - `widget.index == 1` → `<h1>`
   - `widget.index != 1` → `<h2>`

2. **Block/item headings**:
   - **If the widget has a title**: `widget.index == 1` → items `<h2>`; otherwise items `<h3>`.
   - **If the widget has NO title**: `widget.index == 1` → first item `<h1>`, others `<h2>`; otherwise all items `<h2>`.

```liquid
{%- comment -%} Widget header {%- endcomment -%}
{% if widget.settings.title != blank %}
  {% if widget.index == 1 %}
    <h1 class="w-headline">{{ widget.settings.title }}</h1>
  {% else %}
    <h2 class="w-headline">{{ widget.settings.title }}</h2>
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

Also use semantic elements (`<nav>`, `<main>`, `<article>`, `<section>`); `<button>` for actions and `<a>` for navigation.

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

<!-- Responsive image with srcset (browser picks optimal size for viewport + retina) -->
{% image src: block.settings.image, size: 'medium', srcset: true, sizes: '(max-width: 768px) 100vw, 400px', class: 'widget-card-image' %}

<!-- Get image path only (for CSS backgrounds — srcset not applicable) -->
{% image src: block.settings.image, size: 'large', output: 'path' %}
```

**Image sizes**: `thumb`, `small`, `medium`, `large`. See [Media](core-media.md) for the pipeline.

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
  <a href="{{ block.settings.button_link.href }}"
     class="widget-button"
     data-setting="button_link"
     {% if block.settings.button_link.target == '_blank' %}target="_blank" rel="noopener"{% endif %}>
    {{ block.settings.button_link.text }}
  </a>
{% endif %}
```

### Real-time Preview Updates

Add `data-setting` attributes to enable instant text updates in the editor. Match each `data-setting` value to the setting `id` in the schema:

```liquid
<h2 class="w-headline" data-setting="title">{{ widget.settings.title }}</h2>
<p data-setting="description">{{ widget.settings.description }}</p>
<a href="..." data-setting="button_link">{{ widget.settings.button_link.text }}</a>
```

### Placeholder Images

```liquid
{% placeholder_image aspect: 'landscape', class: 'widget-card-image' %}
```

**Aspect ratios**: `square`, `portrait`, `landscape`.

### Carousel Layout

Many card-based widgets support switching between grid and carousel layout via a `layout` select. Branch on `widget.settings.layout` to render either a `.widget-grid` or a `.carousel-container` with `.carousel-track`:

```liquid
{% if widget.settings.layout == 'carousel' %}
  <div class="carousel-container">
    <button type="button" class="carousel-btn carousel-btn-prev" aria-label="Previous">
      <svg class="carousel-btn-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <button type="button" class="carousel-btn carousel-btn-next" aria-label="Next">
      <svg class="carousel-btn-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <ul class="widget-card-grid carousel-track" style="--carousel-cols: {{ widget.settings.columns_desktop }}">
      {% for blockId in widget.blocksOrder %}
        <li class="carousel-item" data-block-id="{{ blockId }}"><!-- card content --></li>
      {% endfor %}
    </ul>
  </div>
{% else %}
  <ul class="widget-card-grid widget-grid" style="--grid-cols-desktop: {{ widget.settings.columns_desktop }};">
    {% for blockId in widget.blocksOrder %}
      <li data-block-id="{{ blockId }}"><!-- card content --></li>
    {% endfor %}
  </ul>
{% endif %}
```

No per-widget JavaScript is needed — `carousel.js` (loaded globally via `layout.liquid`) auto-initializes all `.carousel-container` elements. Remember to enqueue it conditionally with `theme: true` when `layout == 'carousel'`.

### Social Icons Snippet

The `social-icons.liquid` snippet renders social-media link icons from theme-level social settings (16 platforms: Facebook, Instagram, Twitter, LinkedIn, YouTube, TikTok, Pinterest, GitHub, Mastodon, Bluesky, Discord, Reddit, Telegram, Threads, WhatsApp, Email):

```liquid
{% render 'social-icons', social: theme.social %}
```

Each link renders as `<a class="social-link">` with the platform icon via `{% render 'icon', icon: 'platform-name' %}`; links with blank URLs are hidden. Some widgets (accordion, contact-form) include a `social` block type that renders these inline.

---

## Checklist

Before submitting a widget:

- [ ] Both `schema.json` and `widget.liquid` created in `widgets/{name}/`
- [ ] Standard section settings (eyebrow, title, description) included
- [ ] Settings organized with `header` types (Content, Display, …)
- [ ] Layout/Playback/Options consolidated under Display header when appropriate
- [ ] Block settings organized with appropriate headers (Content, Layout, Style, Options)
- [ ] Default blocks provided with meaningful content
- [ ] All CSS scoped with `.widget-{{ widget.id }}`
- [ ] Logical properties used (not `left`, `right`, etc.)
- [ ] Design-system token variables used (not hardcoded values) — see [Design System](arch-design-system.md)
- [ ] All text has `data-setting` attributes for live preview
- [ ] Richtext fields guarded with `rte_blank` / `rte_text`, not `!= blank`
- [ ] JavaScript supports multiple instances (IIFE + `getElementById`); external scripts re-init on `widget:updated`
- [ ] Editor lifecycle listeners guarded with `window.Widgetizer?.designMode`
- [ ] ARIA attributes for interactive elements; keyboard navigation works
- [ ] Responsive on mobile, tablet, desktop
- [ ] Uses `w-*` base classes and `t-*` modifiers (no hardcoded typography CSS)
- [ ] Carousel layout option added for card-based grid widgets (if applicable)
- [ ] Color-scheme setting + inline `--widget-bg-color` pattern wired up (if applicable)
- [ ] Unique, widget-prefixed asset filenames to avoid export collisions
- [ ] Scroll-reveal animations added to content elements (`.reveal .reveal-up` with `--reveal-delay`)
- [ ] `maxBlocks` set where block count should be limited
- [ ] All `tTheme:` keys in schema have matching entries in `locales/*.json`, and no orphaned keys exist (run `npm run validate:theme-locales`)

---

**See also:**

- [Theming Guide](theming.md) — theme structure, global settings, layout templates
- [Design System](arch-design-system.md) — spacing, typography, color, width, and border token scales
- [Setting Types Reference](theming-setting-types.md) — every setting type and its JSON shape
- [Collections](core-collections.md) — collection types and collection-item link targets
- [Form Widget](core-form-widget.md) — the contact-form widget
- [Export](core-export.md) — how widget assets are flattened at export time
