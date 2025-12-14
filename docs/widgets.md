# Widget Development Guide

This document outlines the process for converting static HTML widgets from `themes/arch-static` into dynamic Widgetizer widgets.

## Widget Structure

Each widget consists of two files inside a folder:

```
themes/{theme-id}/widgets/{widget-name}/
├── widget.liquid    # Template (HTML, CSS, JS)
└── schema.json      # Configuration schema
```

---

## Conversion Process

### 1. Identify the Source

Static HTML widgets are located in `themes/arch-static/*.html`. Each file may contain multiple widget variations.

### 2. Create the Widget Folder

```bash
mkdir -p themes/arch/widgets/{widget-name}
```

### 3. Create `schema.json`

Define the widget configuration:

```json
{
  "type": "widget-name",
  "displayName": "Widget Display Name",
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
    }
  ],
  "blocks": [
    {
      "type": "item",
      "displayName": "Item",
      "settings": [
        {
          "type": "image",
          "id": "image",
          "label": "Image"
        },
        {
          "type": "text",
          "id": "title",
          "label": "Title",
          "default": "Item Title"
        },
        {
          "type": "textarea",
          "id": "description",
          "label": "Description",
          "default": "Item description text"
        }
      ]
    }
  ],
  "defaultBlocks": [
    {
      "type": "item",
      "settings": {
        "title": "First Item",
        "description": "Description for the first item"
      }
    },
    {
      "type": "item",
      "settings": {
        "title": "Second Item",
        "description": "Description for the second item"
      }
    }
  ]
}
```

### 4. Create `widget.liquid`

Convert the static HTML into a Liquid template:

```liquid
<section
  id="{{ widget.id }}"
  class="widget-{name} widget"
  data-widget-id="{{ widget.id }}"
  data-widget-type="{widget-name}"
>
  <style>
    #{{ widget.id }} {
      /* Scoped CSS using native nesting */
      & .some-class {
        color: var(--text-primary);
      }
    }
  </style>

  <div class="widget-container">
    <!-- Section Header (standard pattern) -->
    {% if widget.settings.title != blank or widget.settings.description != blank or widget.settings.eyebrow != blank %}
      <div class="widget-header">
        {% if widget.settings.eyebrow != blank %}
          <span class="widget-eyebrow" data-setting="eyebrow">{{ widget.settings.eyebrow }}</span>
        {% endif %}
        {% if widget.settings.title != blank %}
          <h2 class="widget-title" data-setting="title">{{ widget.settings.title }}</h2>
        {% endif %}
        {% if widget.settings.description != blank %}
          <p class="widget-description" data-setting="description">{{ widget.settings.description }}</p>
        {% endif %}
      </div>
    {% endif %}

    <!-- Widget Content -->
    <div class="widget-content">
      {% for blockId in widget.blocksOrder %}
        {% assign block = widget.blocks[blockId] %}
        <div class="widget-card" data-block-id="{{ blockId }}">
          <h3 data-setting="title">{{ block.settings.title }}</h3>
          <p data-setting="description">{{ block.settings.description }}</p>
        </div>
      {% endfor %}
    </div>
  </div>

  <script>
    // Optional: Widget-specific JavaScript
  </script>
</section>
```

---

## Standard Section Settings

All widgets should include these three section-level settings for consistency:

| Setting ID    | Type     | Label        |
| ------------- | -------- | ------------ |
| `eyebrow`     | text     | Eyebrow Text |
| `title`       | text     | Heading      |
| `description` | textarea | Description  |

---

## Setting Types

| Type       | Description                      |
| ---------- | -------------------------------- |
| `text`     | Single-line text input           |
| `textarea` | Multi-line text input            |
| `image`    | Image picker                     |
| `link`     | Link with text, href, and target |
| `select`   | Dropdown with options            |
| `checkbox` | Boolean toggle                   |
| `range`    | Numeric slider                   |
| `color`    | Color picker                     |
| `menu`     | Menu selector                    |

---

## Default Blocks

Widgets with blocks should provide `defaultBlocks` to ensure they're not empty when first added to a page:

```json
"defaultBlocks": [
  {
    "type": "item",
    "settings": {
      "title": "Sample Title",
      "description": "Sample description text"
    }
  }
]
```

**Guidelines:**

- Provide 2-6 default blocks depending on the widget type
- Use realistic, meaningful sample content
- Don't leave text fields empty in defaults
- For image fields, omit them (widgets handle empty images gracefully)

---

## Real-time Preview Updates

All widgets should include `data-setting` attributes on text elements for instant preview updates:

```liquid
<h2 class="widget-title" data-setting="title">{{ widget.settings.title }}</h2>
<p data-setting="description">{{ block.settings.description }}</p>
<a href="..." data-setting="button_link">{{ block.settings.button_link.text }}</a>
```

**How it works:**

1. User types in settings panel
2. Text updates instantly via DOM manipulation
3. After 300ms, full reload ensures scripts work correctly
4. Scroll position is preserved across reloads

**Supported setting types:**

- `text` and `textarea` → updates `textContent`
- `image` → updates `src` attribute
- `video` → updates `src` attribute
- `link` → updates `textContent` and `href`

**Usage pattern:**

- Add to ALL text-displaying elements in widget and block content
- Match the `data-setting` value to the setting `id` in schema.json
- Works for both widget-level and block-level settings

---

## CSS Guidelines

1. **Scope all styles** using `#{{ widget.id }}` to prevent conflicts
2. **Use CSS custom properties** from `theme.css` (e.g., `--text-primary`, `--space-lg`)
3. **Use native CSS nesting** with `&` for cleaner code
4. **Follow BEM-like naming** with `widget-` prefix (e.g., `widget-card`, `widget-card-title`)

### Common CSS Classes

| Class                 | Purpose                         |
| --------------------- | ------------------------------- |
| `.widget-container`   | Main content wrapper            |
| `.widget-header`      | Section header wrapper          |
| `.widget-eyebrow`     | Small category/label text       |
| `.widget-title`       | Main heading (h2)               |
| `.widget-description` | Section description             |
| `.widget-content`     | Content area wrapper            |
| `.widget-card`        | Individual block/item container |

---

## Images

Use the `image` filter to render images:

### Render an `<img>` tag

```liquid
{{ block.settings.image | image: 'medium', 'css-class-name' }}
```

**Arguments:**

1. **Size**: `thumb`, `small`, `medium`, `large`, `original`
2. **CSS class**: Class name for the img element
3. **Lazy loading**: `true` (default) or `false`
4. **Alt override**: Override the alt text
5. **Title override**: Override the title attribute

### Get path/URL only (no img tag)

For CSS backgrounds or other uses where you need just the URL:

```liquid
{{ block.settings.image | image: 'path' }}
{{ block.settings.image | image: 'url' }}
{{ block.settings.image | image: 'path', 'large' }}
```

---

## Available Static Templates

Source files in `themes/arch-static/`:

| File | Widgets |
| --- | --- |
| `card-grid.html` | Card Grid, Project Showcase, Masonry Gallery, Gallery, Numbered Cards, Feature Benefit List, Feature Grid |
| `accordion.html` | Accordion/FAQ variants |
| `heroes.html` | Hero section variants |
| `pricing.html` | Pricing tables |
| `stats.html` | Statistics/counters |
| `timeline.html` | Timeline layouts |
| `tabs.html` | Tabbed content |
| `contact.html` | Contact forms |
| `brands.html` | Logo grids |
| And more... |  |

---

## Testing

After creating a widget:

1. Refresh the Widgetizer admin
2. Add the widget to a page
3. Configure settings and add blocks
4. Preview the rendered output
