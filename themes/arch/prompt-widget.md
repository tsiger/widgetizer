# Widget Creation Prompt

> **For LLMs**: This document contains all rules, conventions, and patterns required to create a widget for the Widgetizer theming system. Parse this entire document before generating any widget code.

## Table of Contents

1. [Design Philosophy](#design-philosophy) — How to think about widget creation
2. [Strict Rules](#strict-rules) — NON-NEGOTIABLE patterns
3. [File Structure](#file-structure) — Widget folder organization
4. [Schema Reference](#schema-reference) — Settings and blocks
5. [Template Structure](#template-structure) — Required HTML pattern
6. [Rendering Patterns](#rendering-patterns) — Blocks, images, videos, links
7. [JavaScript](#javascript) — IIFE pattern and external scripts
8. [Accessibility](#accessibility) — ARIA, keyboard, semantic HTML
9. [Checklist](#checklist) — Pre-submission verification

---

## Design Philosophy

**You are a web designer adding a new widget to an existing, cohesive collection.** Your job is not to copy a screenshot pixel-for-pixel. Your job is to interpret the design and adapt it to fit seamlessly into this theme.

### Think Before You Build

When given a screenshot or design reference:

1. **Identify the core purpose** — What problem does this widget solve? What content does it display?
2. **Find similar widgets** — Does the theme already have something close? Can you extend or combine existing patterns?
3. **Adapt, don't replicate** — The source design may have different typography, colors, spacing. Translate the intent into this theme's design language.

### Consistency Over Accuracy

A widget that follows theme conventions but differs slightly from the reference is better than a pixel-perfect copy that breaks visual harmony.

**Standard patterns to follow:**

| Pattern | Convention |
| --- | --- |
| **Section headers** | If a widget has eyebrow + title + description at the top, use `.widget-header` — it's always centered. |
| **Card layouts** | Use `.widget-card` classes. Cards have consistent padding, borders, and hover states. |
| **Grid layouts** | Use `.widget-grid` for multi-column content. Don't reinvent column systems. |
| **Buttons** | Always use `.widget-button` variants. Never create custom button styles. |
| **Spacing rhythm** | Follow the existing vertical rhythm. Standard widgets use consistent section padding. |
| **Color schemes** | Support both `standard` and `highlight` color schemes unless there's a good reason not to. |

### Questions to Ask Yourself

Before writing code, answer these:

- Does this widget feel like it belongs with the others in the theme?
- Am I using existing utility classes or creating unnecessary custom CSS?
- Would a user recognize this as part of the same design system?
- If there's a similar widget, am I being consistent with its patterns?

### When to Deviate

Sometimes the reference design has a genuinely unique layout that doesn't fit existing patterns. That's fine — but:

1. Only write custom CSS inside the scoped `.widget-{{ widget.id }}` block
2. Still use design tokens (spacing, colors, typography classes)
3. Ensure it doesn't clash visually with adjacent widgets

**The goal: A user browsing the widget library should see a unified collection, not a patchwork of different design styles.**

---

## Strict Rules

**These rules are NON-NEGOTIABLE.** Violating them will break theme consistency. Do NOT improvise or create custom alternatives.

### Quick Reference

| Category                          | Rule                                                                             |
| --------------------------------- | -------------------------------------------------------------------------------- |
| [Colors](#colors)                 | ONLY CSS variables. Never hardcode hex/rgb.                                      |
| [Typography](#typography)         | ONLY `block-text` classes. Never write font CSS.                                 |
| [Buttons](#buttons)               | ONLY `widget-button` classes. Never custom styles.                               |
| [Spacing](#spacing)               | ONLY `--space-*` variables. Never hardcode values.                               |
| [Layout](#layout)                 | ONLY `widget-container`, `widget-grid`, `widget-content`.                        |
| [Widget Header](#widget-header)   | ONLY `widget-header`, `widget-eyebrow`, `widget-headline`, `widget-description`. |
| [Cards](#cards)                   | ONLY `widget-card` classes.                                                      |
| [Icons](#icons)                   | ONLY `{% render 'icon' %}`. Never inline SVGs.                                   |
| [Images](#images)                 | ONLY `\| image` filter. Never hardcode paths.                                    |
| [Videos](#videos)                 | ONLY `\| video` filter.                                                          |
| [YouTube](#youtube)               | ONLY `\| youtube` filter.                                                        |
| [Forms](#forms)                   | ONLY `form-*` classes.                                                           |
| [Animations](#animations)         | ONLY `reveal` classes. Never custom keyframes.                                   |
| [CSS Properties](#css-properties) | ONLY logical properties. Never left/right/top/bottom.                            |

---

### Colors

**ONLY these CSS variables. NEVER hardcode colors.**

```css
/* Text */
var(--text-content)    /* Body text */
var(--text-heading)    /* Headings */
var(--text-muted)      /* Secondary text */

/* Backgrounds */
var(--bg-primary)      /* Main background */
var(--bg-secondary)    /* Alternate background */

/* Accent */
var(--accent)          /* Brand color */
var(--accent-text)     /* Text on accent */

/* Border */
var(--border-color)    /* Standard borders */
```

**❌ FORBIDDEN:** `color: #333;` `background: rgb(0,0,0);`

**✅ CORRECT:** `color: var(--text-content);`

---

### Typography

**ONLY `block-text` utility classes. NEVER write font properties in CSS.**

```html
<!-- Sizes -->
<span class="block-text block-text-xs">12px</span>
<span class="block-text block-text-sm">14px</span>
<span class="block-text block-text-base">16px</span>
<span class="block-text block-text-lg">18px</span>
<span class="block-text block-text-xl">20px</span>
<span class="block-text block-text-2xl">24px</span>
<span class="block-text block-text-3xl">28px</span>
<span class="block-text block-text-4xl">32px</span>
<span class="block-text block-text-5xl">36px</span>

<!-- Weights -->
<span class="block-text block-text-normal">400</span>
<span class="block-text block-text-medium">500</span>
<span class="block-text block-text-semibold">600</span>
<span class="block-text block-text-heading-weight">700</span>

<!-- Colors -->
<span class="block-text block-text-muted">Muted</span>
<span class="block-text block-text-heading">Heading color</span>
<span class="block-text block-text-accent">Accent color</span>

<!-- Transforms -->
<span class="block-text block-text-uppercase">UPPERCASE</span>
```

**❌ FORBIDDEN:** `font-size: 14px;` `font-weight: 600;`

**✅ CORRECT:** `<p class="block-text block-text-sm block-text-semibold">`

**Dynamic size from settings:**

```liquid
{% assign size_class = 'block-text-' | append: block.settings.size %}
<h2 class="block-text {{ size_class }} block-text-heading-weight block-text-heading">{{ block.settings.text }}</h2>
```

---

### Buttons

**ONLY `widget-button` classes. NEVER write custom button CSS.**

```html
<!-- Style variants -->
<a class="widget-button widget-button-primary">Filled</a>
<a class="widget-button widget-button-secondary">Outlined</a>

<!-- Size modifiers -->
<a class="widget-button widget-button-small">Small</a>
<a class="widget-button widget-button-medium">Medium</a>
<a class="widget-button widget-button-large">Large</a>
<a class="widget-button widget-button-xlarge">XLarge</a>

<!-- Width modifier -->
<a class="widget-button widget-button-full">Full Width</a>
```

**Button container:**

```html
<div class="widget-actions">
  <a href="#" class="widget-button widget-button-primary">Button 1</a>
  <a href="#" class="widget-button widget-button-secondary">Button 2</a>
</div>
```

---

### Spacing

**ONLY `--space-*` variables. NEVER hardcode spacing.**

```css
--space-xs    /* 0.8rem / 8px */
--space-sm    /* 1.2rem / 12px */
--space-md    /* 1.6rem / 16px */
--space-lg    /* 2.4rem / 24px */
--space-xl    /* 3.2rem / 32px */
--space-2xl   /* 4rem / 40px */
--space-3xl   /* 4.8rem / 48px */
--space-4xl   /* 6.4rem / 64px */
--space-5xl   /* 8rem / 80px */
```

**❌ FORBIDDEN:** `padding: 16px;` `gap: 24px;`

**✅ CORRECT:** `padding: var(--space-md);` `gap: var(--space-lg);`

---

### Layout

**ONLY these layout classes.**

```html
<!-- Container -->
<div class="widget-container">...</div>
<div class="widget-container widget-container-padded">...</div>

<!-- Content width -->
<div class="widget-content widget-content-sm">600px max</div>
<div class="widget-content widget-content-md">800px max</div>
<div class="widget-content widget-content-lg">900px max</div>

<!-- Content alignment -->
<div class="widget-content widget-content-align-center">...</div>
<div class="widget-content widget-content-align-start">...</div>

<!-- Grid -->
<div class="widget-grid widget-grid-2">2 cols</div>
<div class="widget-grid widget-grid-3">3 cols</div>
<div class="widget-grid widget-grid-4">4 cols</div>
<div class="widget-grid" style="--grid-cols-desktop: 5;">Dynamic</div>

<!-- Auto-spacing for dynamic content -->
<div class="content-flow">...</div>

<!-- Height modifiers (hero/banner) -->
<section class="widget widget-height-half">50vh</section>
<section class="widget widget-height-two-thirds">66vh</section>
<section class="widget widget-height-full">100vh</section>
```

**Grid responsive behavior:** Mobile: 1 col → Tablet (750px+): 2 cols → Desktop (990px+): `--grid-cols-desktop`

**CRITICAL:** Never override `.widget-container` spacing. Let base CSS handle section margins.

---

### Widget Header

**ONLY these classes for section headers.**

```html
<div class="widget-header">
  <span class="widget-eyebrow">Eyebrow</span>
  <h2 class="widget-headline">Heading</h2>
  <p class="widget-description">Description</p>
</div>
```

---

### Cards

**ONLY `widget-card` classes.**

```html
<div class="widget-card">
  <div class="widget-card-header">
    <span class="widget-card-subtitle block-text block-text-xs block-text-uppercase block-text-muted">Subtitle</span>
    <h3 class="widget-card-title block-text block-text-xl block-text-heading-weight block-text-heading">Title</h3>
  </div>
  <div class="widget-card-content">
    <p class="widget-card-description block-text block-text-sm">Description</p>
  </div>
  <div class="widget-card-footer">
    <a href="#" class="widget-button widget-button-secondary">Action</a>
  </div>
</div>
```

---

### Icons

**ONLY the `icon` snippet. NEVER inline SVGs.**

```liquid
{% render 'icon', icon: 'check', class: 'my-icon-class' %}
{% render 'icon', icon: block.settings.icon, class: 'widget-card-icon' %}
```

---

### Images

**ONLY the `image` filter. NEVER hardcode paths.**

```liquid
<!-- Render <img> tag -->
{{ block.settings.image | image: 'medium', 'my-image-class' }}

<!-- Get URL only (for backgrounds) -->
{{ widget.settings.image | image: 'path', 'large' }}

<!-- Placeholder image -->
{% placeholder_image 'landscape', { "class": "widget-card-image" } %}
```

**Sizes:** `thumb`, `small`, `medium`, `large`

**Placeholder aspects:** `square`, `portrait`, `landscape`

---

### Videos

**ONLY the `video` filter.**

```liquid
<!-- Render video tag (autoplay, loop, muted, controls, class) -->
{{ block.settings.video | video: true, false, false, false, 'widget-video' }}

<!-- Get video path only -->
{{ block.settings.video | video: 'path' }}
```

---

### YouTube

**ONLY the `youtube` filter.**

```liquid
<!-- Render responsive embed -->
{{ block.settings.youtube_video | youtube: 'widget-youtube-embed' }}

<!-- Get embed URL only -->
{{ block.settings.youtube_video | youtube: 'path' }}
```

---

### Forms

**ONLY `form-*` classes.**

```html
<form class="contact-form">
  <div class="form-group">
    <label class="form-label">Name</label>
    <input type="text" class="form-input" />
  </div>
  <div class="form-group">
    <label class="form-label">Message</label>
    <textarea class="form-textarea"></textarea>
  </div>
  <div class="form-checkbox-group">
    <input type="checkbox" class="form-checkbox" />
    <label class="form-checkbox-label">I agree</label>
  </div>
  <button type="submit" class="widget-button widget-button-primary">Submit</button>
</form>
```

---

### Animations

**ONLY `reveal` classes. NEVER custom keyframes.**

```html
<!-- Direction variants -->
<div class="reveal reveal-up">Slides up</div>
<div class="reveal reveal-down">Slides down</div>
<div class="reveal reveal-left">From right</div>
<div class="reveal reveal-right">From left</div>
<div class="reveal reveal-scale">Scales up</div>
<div class="reveal reveal-fade">Fades in</div>

<!-- Staggered delay (each increment = 0.1s) -->
<div class="reveal reveal-up" style="--reveal-delay: 0">First</div>
<div class="reveal reveal-up" style="--reveal-delay: 1">Second</div>
<div class="reveal reveal-up" style="--reveal-delay: 2">Third</div>
```

---

### CSS Properties

**ONLY logical properties. NEVER physical directional properties.**

| ❌ FORBIDDEN        | ✅ USE INSTEAD          |
| ------------------- | ----------------------- |
| `margin-left`       | `margin-inline-start`   |
| `margin-right`      | `margin-inline-end`     |
| `padding-left`      | `padding-inline-start`  |
| `padding-right`     | `padding-inline-end`    |
| `padding-top`       | `padding-block-start`   |
| `padding-bottom`    | `padding-block-end`     |
| `left: 0`           | `inset-inline-start: 0` |
| `right: 0`          | `inset-inline-end: 0`   |
| `top: 0`            | `inset-block-start: 0`  |
| `bottom: 0`         | `inset-block-end: 0`    |
| `text-align: left`  | `text-align: start`     |
| `text-align: right` | `text-align: end`       |
| `border-left`       | `border-inline-start`   |
| `border-right`      | `border-inline-end`     |

### Responsive Breakpoints

```css
/* Mobile (default) - < 750px */

@media (min-width: 750px) {
  /* Tablet */
}
@media (min-width: 990px) {
  /* Desktop */
}
@media (min-width: 1200px) {
  /* Large desktop */
}
```

### Border & Width Variables

```css
--border-width-thin: 0.1rem; /* 1px */
--border-width-medium: 0.2rem; /* 2px */

--content-width-xs: 40rem; /* 400px */
--content-width-sm: 60rem; /* 600px */
--content-width-md: 80rem; /* 800px */
--content-width-lg: 90rem; /* 900px */
--container-max-width: 142rem; /* 1420px */
```

---

## File Structure

Each widget consists of **two files** in a dedicated folder:

```
widgets/{widget-name}/
├── schema.json     # Widget configuration
└── widget.liquid   # Template (HTML, CSS, JS)
```

**Naming:** Folder name must be lowercase, hyphenated. The `type` in schema.json **MUST match** folder name exactly.

**Optional external assets** (for complex widgets):

```
widgets/slideshow/
├── schema.json
├── widget.liquid
├── slideshow.css   # External styles
└── slideshow.js    # External scripts
```

**CRITICAL:** Use unique, widget-prefixed filenames (`slideshow.css` not `styles.css`) to avoid collisions during export.

---

## Schema Reference

### Root Properties

```json
{
  "type": "widget-name",
  "displayName": "Widget Display Name",
  "aliases": ["alternative", "search", "keywords"],
  "settings": [],
  "blocks": [],
  "defaultBlocks": []
}
```

| Property        | Required | Description             |
| --------------- | -------- | ----------------------- |
| `type`          | Yes      | Must match folder name  |
| `displayName`   | Yes      | Human-readable name     |
| `aliases`       | No       | Search keywords         |
| `settings`      | Yes      | Widget-level settings   |
| `blocks`        | No       | Block type definitions  |
| `defaultBlocks` | No       | Default block instances |

### Settings Order

Organize with `header` types:

1. **Content** (first) — eyebrow, title, description, image
2. **Display** (second) — layout, alignment, columns, color_scheme, playback options

### Setting Types

```json
// Header (visual grouping)
{ "type": "header", "id": "content_header", "label": "Content" }

// Text inputs
{ "type": "text", "id": "title", "label": "Title", "default": "Default" }
{ "type": "textarea", "id": "description", "label": "Description" }
{ "type": "number", "id": "count", "label": "Count", "min": 1, "max": 10 }

// Selection
{ "type": "select", "id": "layout", "label": "Layout", "default": "grid",
  "options": [{ "value": "grid", "label": "Grid" }, { "value": "list", "label": "List" }] }
{ "type": "radio", "id": "alignment", "label": "Alignment", "default": "center",
  "options": [{ "value": "start", "label": "Left" }, { "value": "center", "label": "Center" }] }

// Boolean
{ "type": "checkbox", "id": "autoplay", "label": "Autoplay", "default": false }

// Range
{ "type": "range", "id": "columns_desktop", "label": "Columns", "default": 4, "min": 2, "max": 6, "step": 1 }

// Color
{ "type": "color", "id": "overlay_color", "label": "Overlay", "default": "#00000080", "allow_alpha": true }

// Media
{ "type": "image", "id": "image", "label": "Image" }
{ "type": "video", "id": "video", "label": "Video" }
{ "type": "icon", "id": "icon", "label": "Icon" }
{ "type": "youtube", "id": "youtube_video", "label": "YouTube" }

// Link
{ "type": "link", "id": "button_link", "label": "Button",
  "default": { "text": "Learn More", "href": "#", "target": "_self" } }
// Use "hide_text": true for links wrapping entire elements

// Menu
{ "type": "menu", "id": "navigation", "label": "Menu" }
```

### Standard Widget Settings

```json
{
  "settings": [
    { "type": "text", "id": "eyebrow", "label": "Eyebrow Text" },
    { "type": "text", "id": "title", "label": "Heading", "default": "Section Title" },
    { "type": "textarea", "id": "description", "label": "Description" },
    { "type": "header", "id": "display_header", "label": "Display" },
    {
      "type": "select",
      "id": "color_scheme",
      "label": "Color Scheme",
      "default": "standard",
      "options": [
        { "value": "standard", "label": "Standard" },
        { "value": "highlight", "label": "Highlight" }
      ]
    }
  ]
}
```

### Standardized Block Types

**Heading Block:**

```json
{
  "type": "heading",
  "displayName": "Heading",
  "settings": [
    { "type": "text", "id": "text", "label": "Text", "default": "Section Heading" },
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

**Text Block:**

```json
{
  "type": "text",
  "displayName": "Text",
  "settings": [
    { "type": "textarea", "id": "text", "label": "Text", "default": "Add your text here." },
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
    { "type": "checkbox", "id": "uppercase", "label": "Uppercase", "default": false },
    { "type": "checkbox", "id": "muted", "label": "Muted color", "default": false }
  ]
}
```

**Button Group Block:**

```json
{
  "type": "button",
  "displayName": "Button Group",
  "settings": [
    {
      "type": "link",
      "id": "link",
      "label": "Button 1",
      "default": { "text": "Learn More", "href": "#", "target": "_self" }
    },
    {
      "type": "select",
      "id": "style",
      "label": "Button 1 style",
      "default": "primary",
      "options": [
        { "value": "primary", "label": "Primary" },
        { "value": "secondary", "label": "Secondary" }
      ]
    },
    { "type": "link", "id": "link_2", "label": "Button 2" },
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

### Default Blocks

Provide 3-8 blocks with realistic content. Never leave text empty. Omit image fields.

```json
"defaultBlocks": [
  { "type": "item", "settings": { "title": "First Feature", "description": "Description text" } },
  { "type": "item", "settings": { "title": "Second Feature", "description": "More description" } },
  { "type": "item", "settings": { "title": "Third Feature", "description": "Another description" } }
]
```

---

## Template Structure

### Required HTML Structure

```liquid
<section
  id="{{ widget.id }}"
  class="widget widget-{name} widget-{{ widget.id }} color-scheme-{{ widget.settings.color_scheme }}"
  {% if widget.settings.color_scheme == 'highlight' %}
    style="--widget-bg-color: var(--bg-primary);"
  {% endif %}
  data-widget-id="{{ widget.id }}"
  data-widget-type="{widget-name}"
  {% if widget.index != null %}data-widget-index="{{ widget.index }}"{% endif %}
>
  <style>
    .widget-{{ widget.id }} {
      /* Widget-specific CSS only - use CSS nesting with & */
    }
  </style>

  <div class="widget-container {% if widget.settings.color_scheme == 'highlight' %}widget-container-padded{% endif %}">
    <!-- Widget Header -->
    {% if widget.settings.title != blank or widget.settings.description != blank or widget.settings.eyebrow != blank %}
      <div class="widget-header">
        {% assign header_delay = 0 %}
        {% if widget.settings.eyebrow != blank %}
          <span class="widget-eyebrow reveal reveal-up" style="--reveal-delay: {{ header_delay }}" data-setting="eyebrow">{{ widget.settings.eyebrow }}</span>
          {% assign header_delay = header_delay | plus: 1 %}
        {% endif %}
        {% if widget.settings.title != blank %}
          {% if widget.index == 1 %}
            <h1 class="widget-headline reveal reveal-up" style="--reveal-delay: {{ header_delay }}" data-setting="title">{{ widget.settings.title }}</h1>
          {% else %}
            <h2 class="widget-headline reveal reveal-up" style="--reveal-delay: {{ header_delay }}" data-setting="title">{{ widget.settings.title }}</h2>
          {% endif %}
          {% assign header_delay = header_delay | plus: 1 %}
        {% endif %}
        {% if widget.settings.description != blank %}
          <p class="widget-description reveal reveal-up" style="--reveal-delay: {{ header_delay }}" data-setting="description">{{ widget.settings.description }}</p>
        {% endif %}
      </div>
    {% endif %}

    <!-- Main Content -->
    <div class="widget-content">
      <!-- Widget-specific content -->
    </div>
  </div>

  <script>
    /* JavaScript (if needed) */
  </script>
</section>
```

### Required Attributes

| Attribute                                             | Purpose                  |
| ----------------------------------------------------- | ------------------------ |
| `id="{{ widget.id }}"`                                | CSS scoping              |
| `class="widget widget-{name} widget-{{ widget.id }}"` | Base + semantic + scoped |
| `data-widget-id="{{ widget.id }}"`                    | JS targeting             |
| `data-widget-type="{name}"`                           | Type identifier          |
| `data-widget-index="{{ widget.index }}"`              | Position on page         |

### CSS Scoping (CRITICAL)

**ALL CSS MUST be scoped** with `.widget-{{ widget.id }}`:

```css
.widget-{{ widget.id }} {
  & .inner-element {
    padding: var(--space-lg);
  }

  & .card:hover {
    border-color: var(--accent);
  }
}
```

### Background Image with Overlay

```liquid
<section
  class="widget widget-{name} widget-{{ widget.id }} color-scheme-{{ widget.settings.color_scheme }} {% if widget.settings.image != blank %}has-bg-image has-overlay{% endif %}"
  {% if widget.settings.image != blank %}
    style="background-image: url('{{ widget.settings.image | image: 'path', 'large' }}'); --widget-overlay-color: {{ widget.settings.overlay_color | default: 'rgba(0,0,0,0.5)' }}; --widget-overlay-opacity: 1;"
  {% endif %}
>
```

---

## Rendering Patterns

### Block Loop

```liquid
{% for blockId in widget.blocksOrder %}
  {% assign block = widget.blocks[blockId] %}
  <div class="item reveal reveal-up" style="--reveal-delay: {{ forloop.index0 }}" data-block-id="{{ blockId }}">
    <h3 class="block-text block-text-xl block-text-heading-weight block-text-heading" data-setting="title">
      {{ block.settings.title }}
    </h3>
    <p class="block-text" data-setting="description">
      {{ block.settings.description }}
    </p>
  </div>
{% endfor %}
```

### Multi-Type Blocks

```liquid
{% for blockId in widget.blocksOrder %}
  {% assign block = widget.blocks[blockId] %}
  {% case block.type %}
    {% when 'heading' %}
      {% assign size_class = 'block-text-' | append: block.settings.size %}
      <h2 class="widget-headline block-text {{ size_class }} block-text-heading-weight block-text-heading reveal reveal-up" style="--reveal-delay: {{ forloop.index0 }}" data-block-id="{{ blockId }}" data-setting="text">
        {{ block.settings.text }}
      </h2>
    {% when 'text' %}
      {% assign size_class = 'block-text-' | append: block.settings.size %}
      {% assign style_class = '' %}
      {% if block.settings.uppercase %}{% assign style_class = style_class | append: ' block-text-uppercase' %}{% endif %}
      {% if block.settings.muted %}{% assign style_class = style_class | append: ' block-text-muted' %}{% endif %}
      <p class="widget-description block-text {{ size_class }}{{ style_class }} reveal reveal-up" style="--reveal-delay: {{ forloop.index0 }}" data-block-id="{{ blockId }}" data-setting="text">
        {{ block.settings.text }}
      </p>
    {% when 'button' %}
      <div class="widget-actions reveal reveal-up" style="--reveal-delay: {{ forloop.index0 }}" data-block-id="{{ blockId }}">
        {% if block.settings.link.text != blank %}
          <a href="{{ block.settings.link.href }}" class="widget-button {% if block.settings.style == 'primary' %}widget-button-primary{% else %}widget-button-secondary{% endif %}" data-setting="link"
            {% if block.settings.link.target == '_blank' %}target="_blank" rel="noopener"{% endif %}>
            {{ block.settings.link.text }}
          </a>
        {% endif %}
      </div>
  {% endcase %}
{% endfor %}
```

### Heading Hierarchy (SEO/Accessibility)

```liquid
{%- comment -%} Widget title {%- endcomment -%}
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

### Real-Time Preview (data-setting)

Add `data-setting` to text elements for live preview updates:

```liquid
<h2 data-setting="title">{{ widget.settings.title }}</h2>
<p data-setting="description">{{ widget.settings.description }}</p>
<a href="#" data-setting="button_link">{{ widget.settings.button_link.text }}</a>
```

For blocks, add `data-block-id` to container and `data-setting` to editable children:

```liquid
<div data-block-id="{{ blockId }}">
  <h3 data-setting="title">{{ block.settings.title }}</h3>
  <p data-setting="description">{{ block.settings.description }}</p>
</div>
```

**IMPORTANT:** Never put both `data-block-id` and `data-setting` on the same element.

---

## JavaScript

### Standard IIFE Pattern (MANDATORY)

```liquid
<script>
  (function () {
    const widget = document.getElementById('{{ widget.id }}');
    if (!widget || widget.dataset.initialized) return;
    widget.dataset.initialized = 'true';

    // All queries MUST be scoped to this widget
    const items = widget.querySelectorAll('.item');

    items.forEach((item) => {
      item.addEventListener('click', function () {
        // Handle interaction
      });
    });
  })();
</script>
```

**Rules:**

1. ALWAYS wrap in IIFE: `(function() { ... })()`
2. ALWAYS get widget by ID: `document.getElementById('{{ widget.id }}')`
3. ALWAYS check initialization: `if (widget.dataset.initialized) return`
4. ALWAYS scope queries: `widget.querySelector()` NOT `document.querySelector()`
5. Use `function()` for event handlers when you need `this`

### External Assets

For complex widgets with external JS/CSS files:

```liquid
{% enqueue_style "slideshow.css", { "priority": 30 } %}
{% enqueue_script "slideshow.js", { "priority": 30 } %}
```

### Re-initialization for External Scripts

External scripts don't re-run after editor DOM updates. Listen for `widget:updated`:

```javascript
(function () {
  "use strict";

  function initMyWidget(widget) {
    if (widget.dataset.initialized) return;
    widget.dataset.initialized = "true";

    // Setup event listeners, state, etc.
    const buttons = widget.querySelectorAll(".my-button");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        /* Handle click */
      });
    });
  }

  // Initialize on page load
  document.querySelectorAll('[data-widget-type="my-widget"]').forEach(initMyWidget);

  // Re-initialize after editor DOM updates
  document.addEventListener("widget:updated", (e) => {
    const widget = e.target.closest('[data-widget-type="my-widget"]');
    if (widget) {
      widget.removeAttribute("data-initialized");
      initMyWidget(widget);
    }
  });
})();
```

---

## Accessibility

### Required Attributes

```html
<!-- Images: always have alt -->
<img src="..." alt="Descriptive text" />

<!-- Icon-only buttons -->
<button aria-label="Close menu"><svg>...</svg></button>

<!-- Accordion -->
<button aria-expanded="false" aria-controls="panel-1">Question</button>
<div id="panel-1" role="region">Answer</div>

<!-- Tabs -->
<button role="tab" aria-selected="true" aria-controls="panel-1">Tab 1</button>
<div role="tabpanel" id="panel-1">Content</div>
```

### Keyboard Navigation

All interactive elements must work with:

- **Tab** — Navigate between elements
- **Enter/Space** — Activate buttons
- **Escape** — Close modals/dropdowns
- **Arrow Keys** — Navigate tabs/sliders

### Semantic HTML

- Use semantic elements: `<nav>`, `<main>`, `<article>`, `<section>`
- Use `<button>` for actions, `<a>` for navigation
- Never remove focus outlines without replacement

---

## Checklist

Before submitting a widget:

- [ ] `schema.json` and `widget.liquid` in `widgets/{name}/` folder
- [ ] `type` in schema matches folder name exactly
- [ ] Standard settings (eyebrow, title, description) included
- [ ] Settings organized with headers (Content, Display)
- [ ] Color scheme setting present
- [ ] Default blocks with meaningful content (3-8 items)
- [ ] All CSS scoped with `.widget-{{ widget.id }}`
- [ ] Logical properties used (no left/right/top/bottom)
- [ ] Design tokens used (no hardcoded spacing, colors, fonts)
- [ ] `block-text` utilities used (no hardcoded typography)
- [ ] All text has `data-setting` attributes
- [ ] `data-block-id` on block containers
- [ ] JavaScript uses IIFE + getElementById + initialization guard
- [ ] ARIA attributes on interactive elements
- [ ] Keyboard navigation works
- [ ] Scroll reveal animations (`.reveal .reveal-up` with `--reveal-delay`)
- [ ] Heading hierarchy correct (h1 for widget.index==1, h2 otherwise)
- [ ] Responsive on mobile, tablet, desktop

---

**End of Widget Creation Prompt**
