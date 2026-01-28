# Widget Creation Prompt

> **For LLMs**: This document contains all rules, conventions, and patterns required to create a widget for the Widgetizer theming system. Parse this entire document before generating any widget code.

---

## 1. File Structure

Each widget consists of exactly **two files** in a dedicated folder:

```
widgets/{widget-name}/
├── schema.json     # Widget configuration and settings
└── widget.liquid   # Template (HTML, CSS, JS)
```

**Naming rules:**
- Folder name: lowercase, hyphenated (e.g., `card-grid`, `image-text`)
- The `type` in `schema.json` MUST match the folder name exactly

---

## 2. Schema Structure (`schema.json`)

### 2.1 Root Properties

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

| Property | Required | Description |
|----------|----------|-------------|
| `type` | Yes | Must match folder name exactly |
| `displayName` | Yes | Human-readable name shown in UI |
| `aliases` | No | Alternative names for search |
| `settings` | Yes | Array of widget-level settings |
| `blocks` | No | Array of block type definitions |
| `defaultBlocks` | No | Array of default block instances |

### 2.2 Settings Order Convention

Settings MUST be organized with `header` types in this order:

1. **Content** (first) - eyebrow, title, description, image, etc.
2. **Display** (second) - layout, alignment, columns, color_scheme, playback options
3. Background setting (always LAST in Display section)

### 2.3 Standard Widget Settings Pattern

Most widgets should include these standard content settings:

```json
{
  "settings": [
    {
      "type": "text",
      "id": "eyebrow",
      "label": "Eyebrow Text"
    },
    {
      "type": "text",
      "id": "title",
      "label": "Heading",
      "default": "Section Title"
    },
    {
      "type": "textarea",
      "id": "description",
      "label": "Description"
    },
    {
      "type": "header",
      "id": "display_header",
      "label": "Display"
    },
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

### 2.4 Block Definition Pattern

```json
{
  "blocks": [
    {
      "type": "item",
      "displayName": "Item",
      "settings": [
        {
          "type": "header",
          "id": "content_header",
          "label": "Content"
        },
        {
          "type": "text",
          "id": "title",
          "label": "Title",
          "default": "Item Title"
        }
      ]
    }
  ],
  "defaultBlocks": [
    {
      "type": "item",
      "settings": {
        "title": "First Item"
      }
    },
    {
      "type": "item",
      "settings": {
        "title": "Second Item"
      }
    }
  ]
}
```

**Rules for defaultBlocks:**
- Provide 3-8 blocks with realistic sample content
- Never leave text fields empty
- Omit image fields (they're handled gracefully when blank)
- Use meaningful, varied content

---

## 3. Setting Types Reference

### 3.1 Visual Grouping

```json
{ "type": "header", "id": "content_header", "label": "Content" }
```

### 3.2 Text Inputs

```json
{ "type": "text", "id": "title", "label": "Title", "default": "Default" }
{ "type": "textarea", "id": "description", "label": "Description" }
{ "type": "number", "id": "count", "label": "Count", "min": 1, "max": 10 }
```

### 3.3 Selection

```json
{
  "type": "select",
  "id": "layout",
  "label": "Layout",
  "default": "grid",
  "options": [
    { "value": "grid", "label": "Grid" },
    { "value": "list", "label": "List" }
  ]
}
```

```json
{
  "type": "radio",
  "id": "alignment",
  "label": "Alignment",
  "default": "center",
  "options": [
    { "value": "start", "label": "Left" },
    { "value": "center", "label": "Center" }
  ]
}
```

### 3.4 Boolean

```json
{ "type": "checkbox", "id": "autoplay", "label": "Autoplay", "default": false }
```

### 3.5 Range

```json
{
  "type": "range",
  "id": "columns_desktop",
  "label": "Desktop columns",
  "default": 4,
  "min": 2,
  "max": 6,
  "step": 1
}
```

### 3.6 Color

```json
{
  "type": "color",
  "id": "overlay_color",
  "label": "Overlay color",
  "default": "#00000080",
  "allow_alpha": true
}
```

### 3.7 Media

```json
{ "type": "image", "id": "image", "label": "Image" }
{ "type": "video", "id": "video", "label": "Video" }
{ "type": "icon", "id": "icon", "label": "Icon" }
{ "type": "youtube", "id": "youtube_video", "label": "YouTube Video" }
```

### 3.8 Link

```json
{
  "type": "link",
  "id": "button_link",
  "label": "Button Link",
  "default": {
    "text": "Learn More",
    "href": "#",
    "target": "_self"
  }
}
```

Use `"hide_text": true` for links that wrap entire elements (no visible label).

### 3.9 Menu

```json
{ "type": "menu", "id": "navigation", "label": "Navigation Menu" }
```

---

## 4. Widget Template Structure (`widget.liquid`)

### 4.1 Required HTML Structure

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
      /* Widget-specific CSS only */
    }
  </style>

  <div class="widget-container {% if widget.settings.color_scheme == 'highlight' %}widget-container-padded{% endif %}">
    <!-- Optional: Widget Header -->
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
      <!-- Widget-specific content here -->
    </div>
  </div>

  <script>
    /* JavaScript (if needed) */
  </script>
</section>
```

### 4.2 Required Attributes

| Attribute | Purpose | Example |
|-----------|---------|---------|
| `id="{{ widget.id }}"` | Unique ID for CSS scoping | `id="w_abc123"` |
| `class="widget widget-{name} widget-{{ widget.id }}"` | Base + semantic + scoped | `class="widget widget-banner widget-w_abc123"` |
| `data-widget-id="{{ widget.id }}"` | JavaScript targeting | `data-widget-id="w_abc123"` |
| `data-widget-type="{name}"` | Widget type identifier | `data-widget-type="banner"` |
| `data-widget-index="{{ widget.index }}"` | Position on page | `data-widget-index="1"` |

---

## 5. CSS Rules

### 5.1 Scoping (CRITICAL)

**ALL widget CSS MUST be scoped** using `.widget-{{ widget.id }}`:

```css
.widget-{{ widget.id }} {
  /* Styles here */

  & .inner-element {
    /* Nested styles using CSS nesting */
  }
}
```

### 5.2 Design Tokens (USE THESE - NEVER HARDCODE)

**Spacing:**
```css
--space-xs: 0.8rem;   /* 8px */
--space-sm: 1.2rem;   /* 12px */
--space-md: 1.6rem;   /* 16px */
--space-lg: 2.4rem;   /* 24px */
--space-xl: 3.2rem;   /* 32px */
--space-2xl: 4rem;    /* 40px */
--space-3xl: 4.8rem;  /* 48px */
--space-4xl: 6.4rem;  /* 64px */
```

**Typography:**
```css
--font-size-xs: 1.2rem;   /* 12px */
--font-size-sm: 1.4rem;   /* 14px */
--font-size-base: 1.6rem; /* 16px */
--font-size-lg: 1.8rem;   /* 18px */
--font-size-xl: 2rem;     /* 20px */
--font-size-2xl: 2.4rem;  /* 24px */
--font-size-3xl: 2.8rem;  /* 28px */
--font-size-4xl: 3.2rem;  /* 32px */
--font-size-5xl: 3.6rem;  /* 36px */
```

**Colors (automatically switch with color scheme):**
```css
--text-content: /* Body text */
--text-heading: /* Headings */
--text-muted: /* Secondary text */
--bg-primary: /* Main background */
--bg-secondary: /* Alt background */
--accent: /* Accent/brand color */
--accent-text: /* Text on accent */
--border-color: /* Borders */
```

**Borders:**
```css
--border-width-thin: 0.1rem;   /* 1px */
--border-width-medium: 0.2rem; /* 2px */
```

**Content Widths:**
```css
--content-width-xs: 40rem;  /* 400px */
--content-width-sm: 60rem;  /* 600px */
--content-width-md: 80rem;  /* 800px */
--content-width-lg: 90rem;  /* 900px */
--container-max-width: 142rem; /* 1420px */
```

### 5.3 Logical Properties (MANDATORY)

**ALWAYS use logical properties for RTL support:**

| ❌ Don't Use | ✅ Use Instead |
|-------------|----------------|
| `margin-left` | `margin-inline-start` |
| `margin-right` | `margin-inline-end` |
| `padding-top` | `padding-block-start` |
| `padding-bottom` | `padding-block-end` |
| `left: 0` | `inset-inline-start: 0` |
| `top: 0` | `inset-block-start: 0` |
| `text-align: left` | `text-align: start` |

### 5.4 Responsive Breakpoints

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

---

## 6. Typography System

### 6.1 Block Text Utilities (USE THESE - NEVER HARDCODE FONT PROPERTIES)

**NEVER** write `font-size`, `font-weight`, `line-height`, or `color` directly in CSS. Use utility classes:

**Sizes:**
```html
<span class="block-text block-text-sm">Small</span>
<span class="block-text block-text-base">Base</span>
<span class="block-text block-text-lg">Large</span>
<span class="block-text block-text-xl">XL</span>
<span class="block-text block-text-2xl">2XL</span>
<span class="block-text block-text-3xl">3XL</span>
<span class="block-text block-text-4xl">4XL</span>
<span class="block-text block-text-5xl">5XL</span>
```

**Weights:**
```html
<span class="block-text block-text-normal">Normal (400)</span>
<span class="block-text block-text-medium">Medium (500)</span>
<span class="block-text block-text-semibold">Semibold (600)</span>
<span class="block-text block-text-heading-weight">Heading weight (700)</span>
```

**Colors:**
```html
<span class="block-text block-text-muted">Muted</span>
<span class="block-text block-text-heading">Heading color</span>
<span class="block-text block-text-accent">Accent color</span>
```

**Styles:**
```html
<span class="block-text block-text-uppercase">UPPERCASE</span>
```

### 6.2 Dynamic Size from Settings

```liquid
{% assign size_class = 'block-text-' | append: block.settings.size %}
<h2 class="widget-headline block-text {{ size_class }} block-text-heading-weight block-text-heading">
  {{ block.settings.text }}
</h2>
```

---

## 7. Layout Utilities

### 7.1 Container Classes

```liquid
<div class="widget-container">
  <!-- Default: margin-based spacing -->
</div>

<div class="widget-container widget-container-padded">
  <!-- For widgets with different background: padding-based -->
</div>
```

**CRITICAL: Never override `.widget-container` spacing in widget CSS.**

The base styles handle section margins automatically via `--section-padding-block`. This ensures consistent vertical rhythm across all sections.

- **Standard widgets**: Let base CSS handle all `.widget-container` spacing
- **Full-bleed widgets only** (banner, slideshow, image): Override spacing on the **widget section element itself** with `margin-block: 0; padding-inline: 0;` — never on `.widget-container`

```css
/* ❌ WRONG - Don't do this */
.widget-{{ widget.id }} {
  & .widget-container {
    margin-block: var(--space-xl); /* Never override container spacing */
  }
}

/* ✅ CORRECT - For full-bleed widgets only, reset on section element */
.widget-{{ widget.id }} {
  /* Reset default widget spacing for full-bleed layouts */
  margin-block: 0;
  padding-inline: 0;
}
```

### 7.2 Content Width

```liquid
<div class="widget-content widget-content-sm">  <!-- 600px max -->
<div class="widget-content widget-content-md">  <!-- 800px max -->
<div class="widget-content widget-content-lg">  <!-- 900px max -->
```

### 7.3 Content Alignment

```liquid
<div class="widget-content widget-content-align-center">
<div class="widget-content widget-content-align-start">
```

### 7.4 Content Flow (Auto Spacing)

For blocks with dynamic order, use `content-flow`:

```liquid
<div class="widget-content content-flow widget-content-lg">
  {% for blockId in widget.blocksOrder %}
    <!-- Each element gets automatic spacing via * + * selector -->
  {% endfor %}
</div>
```

### 7.5 Grid System

```liquid
<div class="widget-grid widget-grid-3">  <!-- 3 columns desktop -->
<div class="widget-grid widget-grid-4">  <!-- 4 columns desktop -->

<!-- Or with CSS variable -->
<div class="widget-grid" style="--grid-cols-desktop: {{ widget.settings.columns_desktop }};">
```

**Responsive behavior:**
- Mobile: 1 column
- Tablet (750px+): 2 columns
- Desktop (990px+): `--grid-cols-desktop` value

### 7.6 Height Modifiers (for hero/banner widgets)

```liquid
<section class="widget widget-height-half">      <!-- 50vh -->
<section class="widget widget-height-two-thirds"> <!-- 66vh -->
<section class="widget widget-height-full">      <!-- 100vh -->
```

---

## 8. Component Patterns

### 8.1 Widget Header (Centered Section Header)

Use the `.widget-header` class for centered section headers. It provides:
- `gap: var(--space-sm)` for consistent spacing between eyebrow, title, description
- `& > * { margin-block: 0; }` to reset default margins (spacing comes from gap only)
- Centered text alignment

```liquid
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
```

### 8.1.1 Non-Centered Header Content

When eyebrow/title/description appear in a **non-centered** layout (e.g., side-by-side with other content), you cannot use `.widget-header` since it centers everything. Instead, create a custom container that replicates the same spacing pattern:

```css
& .my-content-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);  /* Same as widget-header */

  & > * {
    margin-block: 0;  /* Reset margins, let gap handle spacing */
  }
}
```

This ensures consistent spacing between eyebrow, headline, and description regardless of alignment.

### 8.1.2 Choosing Between Gap Pattern vs content-flow

| Use Case | Pattern | Why |
|----------|---------|-----|
| Fixed structure (eyebrow, title, description) | `gap` + margin reset | Predictable, clean, modern |
| Dynamic blocks (user-ordered content) | `.content-flow` | Handles varying element order gracefully |

**content-flow** uses `> * + * { margin-block-start: var(--space-sm); }` and is ideal for widgets like `rich-text` or `split-hero` where users add/remove/reorder blocks freely.

### 8.2 Cards

```liquid
<div class="widget-card">
  <div class="widget-card-header">
    <span class="widget-card-subtitle block-text block-text-xs block-text-uppercase block-text-muted">{{ block.settings.subtitle }}</span>
    <h3 class="widget-card-title block-text block-text-xl block-text-heading-weight block-text-heading">{{ block.settings.title }}</h3>
  </div>
  <div class="widget-card-content">
    <p class="widget-card-description block-text block-text-sm">{{ block.settings.description }}</p>
  </div>
  <div class="widget-card-footer">
    <a href="#" class="widget-button widget-button-secondary">Action</a>
  </div>
</div>
```

### 8.3 Buttons

```liquid
<!-- Primary (filled) -->
<a href="#" class="widget-button widget-button-primary">Primary</a>

<!-- Secondary (outlined) -->
<a href="#" class="widget-button widget-button-secondary">Secondary</a>

<!-- Sizes -->
<a href="#" class="widget-button widget-button-medium">Medium</a>
<a href="#" class="widget-button widget-button-large">Large</a>
<a href="#" class="widget-button widget-button-xlarge">XLarge</a>
```

### 8.4 Button Actions Container

```liquid
<div class="widget-actions">
  {% if block.settings.link.text != blank %}
    <a
      href="{{ block.settings.link.href }}"
      class="widget-button {% if block.settings.style == 'primary' %}widget-button-primary{% else %}widget-button-secondary{% endif %}"
      data-setting="link"
      {% if block.settings.link.target == '_blank' %}target="_blank" rel="noopener"{% endif %}
    >
      {{ block.settings.link.text }}
    </a>
  {% endif %}
</div>
```

### 8.5 Images

```liquid
<!-- Render <img> tag -->
{{ block.settings.image | image: 'medium', 'widget-card-image' }}

<!-- Get URL only (for CSS backgrounds) -->
{{ block.settings.image | image: 'path', 'large' }}
```

**Sizes:** `thumb`, `small`, `medium`, `large`

### 8.6 Icons

```liquid
{% if block.settings.icon != blank %}
  {% render 'icon', icon: block.settings.icon, class: 'widget-card-icon' %}
{% endif %}
```

---

## 9. Rendering Blocks

### 9.1 Standard Block Loop

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

### 9.2 Multi-Type Blocks

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
      <p class="widget-description block-text reveal reveal-up" style="--reveal-delay: {{ forloop.index0 }}" data-block-id="{{ blockId }}" data-setting="text">
        {{ block.settings.text }}
      </p>
    {% when 'button' %}
      <div class="widget-actions reveal reveal-up" style="--reveal-delay: {{ forloop.index0 }}" data-block-id="{{ blockId }}">
        <!-- Button rendering -->
      </div>
  {% endcase %}
{% endfor %}
```

---

## 10. Real-Time Preview (CRITICAL)

### 10.1 data-setting Attribute

Add `data-setting` to ANY element displaying text that should update in real-time:

```liquid
<h2 data-setting="title">{{ widget.settings.title }}</h2>
<p data-setting="description">{{ widget.settings.description }}</p>
<a href="#" data-setting="button_link">{{ widget.settings.button_link.text }}</a>
```

The `data-setting` value MUST match the setting `id` in the schema.

### 10.2 Block Settings

For block elements, add `data-block-id` to the container, and `data-setting` to editable elements:

```liquid
<div data-block-id="{{ blockId }}">
  <h3 data-setting="title">{{ block.settings.title }}</h3>
  <p data-setting="description">{{ block.settings.description }}</p>
</div>
```

**IMPORTANT:** Do NOT put both `data-block-id` and `data-setting` on the same element for blocks. Put `data-block-id` on the block container and `data-setting` on the child editable elements.

---

## 11. Scroll Reveal Animations

### 11.1 Animation Classes

| Class | Effect |
|-------|--------|
| `.reveal` | Base class (required) - fades in |
| `.reveal-up` | Slides up while fading |
| `.reveal-down` | Slides down while fading |
| `.reveal-left` | Slides from right |
| `.reveal-right` | Slides from left |
| `.reveal-scale` | Scales up from 95% |
| `.reveal-fade` | Simple fade only |

### 11.2 Staggered Animations

Use `--reveal-delay` CSS variable for staggered effects:

```liquid
{% for blockId in widget.blocksOrder %}
  <div class="item reveal reveal-up" style="--reveal-delay: {{ forloop.index0 }}">
    <!-- Content -->
  </div>
{% endfor %}
```

Each increment adds 0.1s delay.

---

## 12. JavaScript Pattern

### 12.1 Standard IIFE Pattern (MANDATORY)

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
5. Use `function()` for event handlers (not arrow functions) when you need `this`

### 12.2 External Assets (for complex widgets)

Place in widget folder and enqueue:

```liquid
{% enqueue_style "widget-name.css", { "priority": 30 } %}
{% enqueue_script "widget-name.js", { "priority": 30 } %}
```

**CRITICAL:** Use unique, widget-prefixed filenames to avoid collisions during export.

---

## 13. Heading Hierarchy (SEO/Accessibility)

### 13.1 Widget Title

```liquid
{% if widget.settings.title != blank %}
  {% if widget.index == 1 %}
    <h1 class="widget-headline">{{ widget.settings.title }}</h1>
  {% else %}
    <h2 class="widget-headline">{{ widget.settings.title }}</h2>
  {% endif %}
{% endif %}
```

### 13.2 Item Headings

```liquid
{% assign item_heading_level = 'h3' %}
{% if widget.settings.title == blank %}
  {% assign item_heading_level = 'h2' %}
{% endif %}

{% for item in items %}
  <{{ item_heading_level }} class="item-title">{{ item.title }}</{{ item_heading_level }}>
{% endfor %}
```

---

## 14. Color Scheme System

### 14.1 Standard Pattern

```liquid
<section
  class="widget widget-{name} widget-{{ widget.id }} color-scheme-{{ widget.settings.color_scheme }}"
  {% if widget.settings.color_scheme == 'highlight' %}
    style="--widget-bg-color: var(--bg-primary);"
  {% endif %}
>
  <div class="widget-container {% if widget.settings.color_scheme == 'highlight' %}widget-container-padded{% endif %}">
```

### 14.2 Background Image with Overlay

```liquid
<section
  class="widget widget-{name} widget-{{ widget.id }} color-scheme-{{ widget.settings.color_scheme }} {% if widget.settings.image != blank %}has-bg-image has-overlay{% endif %}"
  {% if widget.settings.image != blank %}
    style="background-image: url('{{ widget.settings.image | image: 'path', 'large' }}'); --widget-overlay-color: {{ widget.settings.overlay_color | default: 'rgba(0,0,0,0.5)' }}; --widget-overlay-opacity: 1;"
  {% endif %}
>
```

---

## 15. Standardized Block Types

### 15.1 Heading Block

**Schema:**
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

### 15.2 Text Block

**Schema:**
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

### 15.3 Button Group Block

**Schema:**
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

---

## 16. Forms

```liquid
<form class="contact-form">
  <div class="form-group">
    <label for="name-{{ widget.id }}" class="form-label">Name</label>
    <input type="text" id="name-{{ widget.id }}" class="form-input" required />
  </div>
  <div class="form-group">
    <label for="email-{{ widget.id }}" class="form-label">Email</label>
    <input type="email" id="email-{{ widget.id }}" class="form-input" required />
  </div>
  <div class="form-group">
    <label for="message-{{ widget.id }}" class="form-label">Message</label>
    <textarea id="message-{{ widget.id }}" class="form-textarea" rows="5"></textarea>
  </div>
  <div class="form-checkbox-group">
    <input type="checkbox" id="agree-{{ widget.id }}" class="form-checkbox" />
    <label for="agree-{{ widget.id }}" class="form-checkbox-label">I agree to terms</label>
  </div>
  <button type="submit" class="widget-button widget-button-primary widget-button-full">Submit</button>
</form>
```

---

## 17. Accessibility Requirements

1. **Alt text**: All images must have descriptive alt text
2. **ARIA attributes**: Interactive elements need proper ARIA
3. **Keyboard navigation**: All interactions must work with Tab, Enter, Space, Escape, Arrow keys
4. **Semantic HTML**: Use `<nav>`, `<main>`, `<article>`, `<section>`, `<button>`, `<a>` appropriately
5. **Focus styles**: Never remove focus outlines without replacement
6. **Color contrast**: Ensure sufficient contrast ratios

---

## 18. Pre-Submission Checklist

Before finalizing a widget, verify:

- [ ] `schema.json` and `widget.liquid` in `widgets/{name}/` folder
- [ ] `type` in schema matches folder name exactly
- [ ] Standard settings (eyebrow, title, description) included if appropriate
- [ ] Settings organized with headers (Content, Display)
- [ ] Color scheme setting present if widget has visible background
- [ ] Default blocks provided with meaningful content (3-8 items)
- [ ] All CSS scoped with `.widget-{{ widget.id }}`
- [ ] Logical properties used (no `left`, `right`, `top`, `bottom`)
- [ ] Design tokens used (no hardcoded spacing, colors, fonts)
- [ ] No `.widget-container` spacing overrides (let base CSS handle section margins)
- [ ] `block-text` utilities used (no hardcoded typography)
- [ ] All text has `data-setting` attributes for live preview
- [ ] `data-block-id` on block containers (not on editable elements)
- [ ] JavaScript uses IIFE + getElementById + initialization guard
- [ ] ARIA attributes on interactive elements
- [ ] Keyboard navigation works
- [ ] Scroll reveal animations on content (`.reveal .reveal-up` with `--reveal-delay`)
- [ ] Heading hierarchy correct (h1 for widget.index==1, h2 otherwise)
- [ ] Responsive design works on mobile, tablet, desktop

---

## 19. Example: Complete Simple Widget

### `widgets/feature-list/schema.json`

```json
{
  "type": "feature-list",
  "displayName": "Feature List",
  "aliases": ["features", "benefits", "highlights"],
  "settings": [
    {
      "type": "text",
      "id": "eyebrow",
      "label": "Eyebrow Text"
    },
    {
      "type": "text",
      "id": "title",
      "label": "Heading",
      "default": "Why Choose Us"
    },
    {
      "type": "textarea",
      "id": "description",
      "label": "Description"
    },
    {
      "type": "header",
      "id": "display_header",
      "label": "Display"
    },
    {
      "type": "range",
      "id": "columns_desktop",
      "label": "Desktop columns",
      "default": 3,
      "min": 2,
      "max": 4,
      "step": 1
    },
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
  ],
  "blocks": [
    {
      "type": "feature",
      "displayName": "Feature",
      "settings": [
        {
          "type": "header",
          "id": "content_header",
          "label": "Content"
        },
        {
          "type": "icon",
          "id": "icon",
          "label": "Icon"
        },
        {
          "type": "text",
          "id": "title",
          "label": "Title",
          "default": "Feature Title"
        },
        {
          "type": "textarea",
          "id": "description",
          "label": "Description",
          "default": "Feature description goes here."
        }
      ]
    }
  ],
  "defaultBlocks": [
    {
      "type": "feature",
      "settings": {
        "title": "Fast Performance",
        "description": "Lightning-fast load times and smooth interactions."
      }
    },
    {
      "type": "feature",
      "settings": {
        "title": "Easy to Use",
        "description": "Intuitive interface designed for everyone."
      }
    },
    {
      "type": "feature",
      "settings": {
        "title": "Secure",
        "description": "Enterprise-grade security for your peace of mind."
      }
    }
  ]
}
```

### `widgets/feature-list/widget.liquid`

```liquid
<section
  id="{{ widget.id }}"
  class="widget widget-feature-list widget-{{ widget.id }} color-scheme-{{ widget.settings.color_scheme }}"
  {% if widget.settings.color_scheme == 'highlight' %}
    style="--widget-bg-color: var(--bg-primary);"
  {% endif %}
  data-widget-id="{{ widget.id }}"
  data-widget-type="feature-list"
  {% if widget.index != null %}data-widget-index="{{ widget.index }}"{% endif %}
>
  <div class="widget-container {% if widget.settings.color_scheme == 'highlight' %}widget-container-padded{% endif %}">
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

    {% assign item_heading_level = 'h3' %}
    {% if widget.settings.title == blank %}
      {% assign item_heading_level = 'h2' %}
    {% endif %}

    <ul class="widget-grid" style="--grid-cols-desktop: {{ widget.settings.columns_desktop }}; list-style: none; padding: 0; margin: 0;">
      {% for blockId in widget.blocksOrder %}
        {% assign block = widget.blocks[blockId] %}
        <li class="widget-card reveal reveal-up" style="--reveal-delay: {{ forloop.index0 }}" data-block-id="{{ blockId }}">
          {% if block.settings.icon != blank %}
            {% render 'icon', icon: block.settings.icon, class: 'widget-card-icon' %}
          {% endif %}
          <{{ item_heading_level }} class="widget-card-title block-text block-text-xl block-text-heading-weight block-text-heading" data-setting="title">
            {{ block.settings.title }}
          </{{ item_heading_level }}>
          <p class="widget-card-description block-text block-text-sm" data-setting="description">
            {{ block.settings.description }}
          </p>
        </li>
      {% endfor %}
    </ul>
  </div>
</section>
```

---

**End of Widget Creation Prompt**
