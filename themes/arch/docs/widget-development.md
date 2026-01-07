# Widget Development Guide

Complete guide for building new widgets in the Widgetizer Arch theme.

## Quick Start

1. Create widget folder: `themes/arch/widgets/{widget-name}/`
2. Create `schema.json` with settings and blocks
3. Create `widget.liquid` with HTML, CSS, and JavaScript
4. Test in Widgetizer preview

---

## File Structure

Every widget consists of two files:

```
themes/arch/widgets/{widget-name}/
├── schema.json      # Configuration & settings
└── widget.liquid    # Template with HTML, CSS, JS
```

---

## Schema.json

### Basic Structure

```json
{
  "type": "widget-name",
  "displayName": "Widget Display Name",
  "settings": [
    // Widget-level settings
  ],
  "blocks": [
    // Repeatable content blocks (optional)
  ],
  "defaultBlocks": [
    // Default block instances (optional)
  ]
}
```

### Available Setting Types

| Type       | Use For                    | Example                       |
| ---------- | -------------------------- | ----------------------------- |
| `text`     | Single line text           | Heading, name, label          |
| `textarea` | Multi-line text            | Description, quote, paragraph |
| `image`    | Image picker               | Hero image, avatar, logo      |
| `video`    | Video picker               | Background video, testimonial |
| `link`     | Link with text/href/target | Button link, CTA, read more   |
| `select`   | Dropdown menu              | Layout options, column count  |
| `checkbox` | Boolean toggle             | Enable/disable autoplay       |
| `range`    | Numeric slider             | Autoplay speed, rating        |
| `color`    | Color picker               | Background color, text color  |
| `menu`     | Navigation menu            | Header menu, footer menu      |

### Blocks System

Blocks create repeatable content within a widget:

```json
"blocks": [
  {
    "type": "item",
    "displayName": "Feature Item",
    "settings": [
      {
        "type": "image",
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
        "default": "Feature description text"
      }
    ]
  }
]
```

### Default Blocks

**Always provide default blocks** with meaningful content:

```json
"defaultBlocks": [
  {
    "type": "item",
    "settings": {
      "title": "Fast Performance",
      "description": "Lightning-fast load times for better user experience."
    }
  },
  {
    "type": "item",
    "settings": {
      "title": "Mobile First",
      "description": "Responsive design that works on all devices."
    }
  }
]
```

**Guidelines:**

- Use realistic, meaningful sample content
- Don't leave text fields empty
- Omit image fields (handled gracefully when empty)
- Provide enough blocks to show the layout

---

## Widget.liquid Template

### Complete Structure

```liquid
<section
  id="{{ widget.id }}"
  class="widget widget-{name}"
  data-widget-id="{{ widget.id }}"
  data-widget-type="{widget-name}"
>
  <style>
    /* Scoped CSS here */
  </style>

  <div class="widget-container">
    <!-- Standard widget header -->
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

    <!-- Widget content -->
    <div class="widget-content">
      <!-- Your widget markup here -->
    </div>
  </div>

  <script>
    /* Widget JavaScript (if needed) */
  </script>
</section>
```

### Required Root Attributes

```liquid
<section
  id="{{ widget.id }}"                    <!-- Unique ID for scoping -->
  class="widget widget-{name}"           <!-- Base classes -->
  data-widget-id="{{ widget.id }}"       <!-- For JavaScript -->
  data-widget-type="{widget-name}"       <!-- For debugging -->
>
```

---

## CSS Standards

### Scoping Rules

**All CSS MUST be scoped** using `#{{ widget.id }}`:

```css
<style>
  #{{ widget.id }} {
    /* All styles nested here */
    & .feature-list {
      display: grid;
      gap: var(--space-lg);
    }

    & .feature-item {
      padding: var(--space-xl);
    }

    @media (min-width: 750px) {
      & .feature-list {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  }
</style>
```

### CSS Nesting

Use **native CSS nesting** with `&`:

```css
#{{ widget.id }} {
  & .card {
    padding: var(--space-xl);

    & .card-title {
      font-size: var(--font-size-2xl);
    }

    &:hover {
      border-color: var(--border-darker);
    }
  }
}
```

### Logical Properties (RTL Support)

**Always use logical properties** for directional styles:

| ❌ Don't Use     | ✅ Use Instead          |
| ---------------- | ----------------------- |
| `margin-left`    | `margin-inline-start`   |
| `margin-right`   | `margin-inline-end`     |
| `padding-top`    | `padding-block-start`   |
| `padding-bottom` | `padding-block-end`     |
| `left: 0`        | `inset-inline-start: 0` |
| `top: 0`         | `inset-block-start: 0`  |

### Design System Variables

**Always use CSS variables** from the design system:

```css
/* ✅ GOOD */
.feature-item {
  padding: var(--space-xl);
  font-size: var(--font-size-lg);
  color: var(--text-primary);
  border: var(--border-width-thin) solid var(--border-light);
}

/* ❌ BAD */
.feature-item {
  padding: 32px;
  font-size: 18px;
  color: #333;
  border: 1px solid #e0e0e0;
}
```

### Responsive Breakpoints

```css
/* Mobile-first approach */
#{{ widget.id }} {
  & .grid {
    grid-template-columns: 1fr;
  }

  /* Tablet: 750px+ */
  @media (min-width: 750px) {
    & .grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  /* Desktop: 990px+ */
  @media (min-width: 990px) {
    & .grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  /* Large: 1200px+ */
  @media (min-width: 1200px) {
    & .grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }
}
```

### Common Utility Classes

Use built-in utility classes from `base.css`:

| Class                          | Purpose                      |
| ------------------------------ | ---------------------------- |
| `.widget-container`            | Max-width container (1420px) |
| `.widget-header`               | Centered section header      |
| `.widget-content`              | Content wrapper              |
| `.widget-content-sm`           | Narrow content (600px)       |
| `.widget-content-md`           | Medium content (800px)       |
| `.widget-content-lg`           | Large content (900px)        |
| `.widget-content-align-center` | Center-aligned text          |
| `.widget-headline`             | Main heading (responsive)    |
| `.widget-title`                | Card/item title              |
| `.widget-description`          | Body text                    |
| `.widget-eyebrow`              | Small label text             |
| `.widget-button`               | Base button style            |
| `.widget-card`                 | Card container               |
| `.widget-grid`                 | Base grid                    |
| `.widget-grid-2`               | 2-column grid                |
| `.widget-grid-3`               | 3-column grid                |
| `.widget-grid-4`               | 4-column grid                |

---

## Rendering Blocks

### Basic Block Loop

```liquid
<div class="widget-content">
  <div class="items-grid">
    {% for blockId in widget.blocksOrder %}
      {% assign block = widget.blocks[blockId] %}
      <div class="item" data-block-id="{{ blockId }}">
        <h3 data-setting="title">{{ block.settings.title }}</h3>
        <p data-setting="description">{{ block.settings.description }}</p>
      </div>
    {% endfor %}
  </div>
</div>
```

### Block with Images

```liquid
{% for blockId in widget.blocksOrder %}
  {% assign block = widget.blocks[blockId] %}
  <article class="widget-card" data-block-id="{{ blockId }}">
    {% if block.settings.image != blank %}
      {{ block.settings.image | image: 'medium', 'widget-card-image' }}
    {% endif %}
    <h3 data-setting="title">{{ block.settings.title }}</h3>
    <p data-setting="description">{{ block.settings.description }}</p>
  </article>
{% endfor %}
```

### Block with Links

```liquid
{% if block.settings.button_link.text != blank %}
  <a
    href="{{ block.settings.button_link.href }}"
    class="widget-button"
    data-setting="button_link"
    target="{{ block.settings.button_link.target | default: '_self' }}"
  >
    {{ block.settings.button_link.text }}
  </a>
{% endif %}
```

---

## Images

### Render Image Tag

```liquid
{{ block.settings.image | image: 'medium', 'css-class-name' }}
```

**Parameters:**

1. **Size**: `thumb`, `small`, `medium`, `large`
2. **CSS class**: Class for `<img>` tag
3. **Lazy loading**: `true` (default) or `false`
4. **Alt override**: Custom alt text
5. **Title override**: Custom title

### Get Image Path Only

For CSS backgrounds:

```liquid
{{ block.settings.image | image: 'path' }}
{{ block.settings.image | image: 'path', 'large' }}
```

**Usage in CSS:**

```liquid
<div
  class="hero"
  {% if widget.settings.bg_image != blank %}
    style="--widget-bg-image: url('{{ widget.settings.bg_image | image: 'path', 'large' }}');"
  {% endif %}
>
```

---

## JavaScript Standards

### Template with IIFE

**Use `getElementById` for single widget instance:**

```javascript
<script>
  (function() {
    // Get THIS widget instance by its unique ID
    const widgetElement = document.getElementById('{{ widget.id }}');
    if (!widgetElement || widgetElement.dataset.initialized) return;
    widgetElement.dataset.initialized = 'true';

    // All queries scoped to THIS widget instance
    const triggers = widgetElement.querySelectorAll('.trigger');
    const panels = widgetElement.querySelectorAll('.panel');

    triggers.forEach((trigger, index) => {
      trigger.addEventListener('click', function() {
        // Logic for THIS trigger in THIS widget
        panels[index].classList.toggle('active');
      });
    });
  })();
</script>
```

### Key Patterns

1. **IIFE Wrapper**: `(function() { ... })()` - Prevents global scope pollution
2. **Get By ID**: `getElementById('{{ widget.id }}')` - Each widget has unique ID
3. **Initialization Guard**: Check `dataset.initialized` - Prevents duplicate listeners
4. **Scoped Queries**: Use `widgetElement.querySelector()` - Never `document.querySelector()`
5. **Proper `this`**: Use `function()` for event handlers, not arrow functions

### Example: Accordion

```javascript
<script>
  (function() {
    const widgetElement = document.getElementById('{{ widget.id }}');
    if (!widgetElement || widgetElement.dataset.initialized) return;
    widgetElement.dataset.initialized = 'true';

    const triggers = widgetElement.querySelectorAll('.accordion-trigger');

    triggers.forEach((trigger) => {
      trigger.addEventListener('click', function() {
        const isExpanded = this.getAttribute('aria-expanded') === 'true';
        const content = this.nextElementSibling;

        if (isExpanded) {
          this.setAttribute('aria-expanded', 'false');
          content.classList.remove('open');
        } else {
          this.setAttribute('aria-expanded', 'true');
          content.classList.add('open');
        }
      });
    });
  })();
</script>
```

### External CSS and JavaScript Files

For complex widgets, you can use external files from the theme's assets folder:

```liquid
<section id="{{ widget.id }}" class="widget widget-complex">
  <!-- Load external CSS -->
  {% asset "complex-widget.css" %}

  <div class="widget-container">
    <!-- Widget HTML -->
  </div>

  <!-- Load external JavaScript -->
  {% asset "complex-widget.js" %}
</section>
```

**File locations:**

- CSS: `themes/arch/assets/complex-widget.css`
- JS: `themes/arch/assets/complex-widget.js`

**When to use external files:**

- ✅ Complex widgets with 200+ lines of CSS/JS
- ✅ Shared code used by multiple widgets
- ✅ Third-party libraries (sliders, charts, etc.)

**When to use inline:**

- ✅ Most widgets (keeps everything self-contained)
- ✅ Widget-specific styles that won't be reused
- ✅ Simple JavaScript interactions

**Note:** External files are automatically copied to the published site during export.

---

## Real-time Preview Updates

Add `data-setting` attributes to enable instant text updates:

```liquid
<h2 class="widget-headline" data-setting="title">{{ widget.settings.title }}</h2>
<p data-setting="description">{{ widget.settings.description }}</p>
<a href="..." data-setting="button_link">{{ widget.settings.button_link.text }}</a>

<!-- Block-level settings -->
<h3 data-setting="title">{{ block.settings.title }}</h3>
<p data-setting="description">{{ block.settings.description }}</p>
```

**How it works:**

- Match `data-setting` value to setting `id` in schema
- Works for both widget and block settings
- Updates text instantly as user types
- Full reload after 300ms ensures scripts work

---

## Accessibility Requirements

### Required Attributes

```html
<!-- Images -->
<img src="..." alt="Descriptive text" />

<!-- Icon-only buttons -->
<button aria-label="Close menu">
  <svg>...</svg>
</button>

<!-- Interactive accordion -->
<button aria-expanded="false">Question</button>
<div aria-hidden="true">Answer</div>

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

---

## Icons

**Use Lucide icons only** for consistency:

```html
<!-- Chevron Down (accordion, dropdown) -->
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
</svg>

<!-- Arrow Right (buttons, links) -->
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" />
</svg>

<!-- X (close button) -->
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" />
</svg>
```

---

## Common Patterns

### Card Grid Widget

```liquid
<div class="widget-grid widget-grid-3">
  {% for blockId in widget.blocksOrder %}
    {% assign block = widget.blocks[blockId] %}
    <article class="widget-card" data-block-id="{{ blockId }}">
      {% if block.settings.image != blank %}
        {{ block.settings.image | image: 'medium', 'widget-card-image' }}
      {% endif %}
      <h3 class="widget-card-title" data-setting="title">{{ block.settings.title }}</h3>
      <p class="widget-card-description" data-setting="description">{{ block.settings.description }}</p>
    </article>
  {% endfor %}
</div>
```

### Background Image Widget

```liquid
<section
  id="{{ widget.id }}"
  class="widget widget-hero {% if widget.settings.image != blank %}has-bg-image has-overlay overlay-dark{% endif %} color-scheme-dark"
  {% if widget.settings.image != blank %}
    style="--widget-bg-image: url('{{ widget.settings.image | image: 'path', 'large' }}');"
  {% endif %}
>
  <div class="widget-container">
    <div class="widget-content widget-content-lg widget-content-align-center">
      <h1 class="widget-headline" data-setting="title">{{ widget.settings.title }}</h1>
    </div>
  </div>
</section>
```

### Layout Variations

```liquid
<section
  id="{{ widget.id }}"
  class="widget widget-image-text {% if widget.settings.layout == 'image-right' %}layout-image-right{% endif %}"
>
```

```css
#{{ widget.id }} {
  & .content {
    display: flex;
    flex-direction: column;
    gap: var(--space-xl);

    @media (min-width: 990px) {
      flex-direction: row;
    }
  }

  &.layout-image-right .content {
    @media (min-width: 990px) {
      flex-direction: row-reverse;
    }
  }
}
```

---

## Checklist

Before submitting a widget:

- [ ] Both `schema.json` and `widget.liquid` created
- [ ] Standard section settings (eyebrow, title, description) included
- [ ] Default blocks provided with meaningful content
- [ ] All CSS scoped with `#{{ widget.id }}`
- [ ] Logical properties used (not `left`, `right`, etc.)
- [ ] Design system variables used (not hardcoded values)
- [ ] All text has `data-setting` attributes
- [ ] JavaScript supports multiple instances (IIFE + `querySelectorAll`)
- [ ] ARIA attributes for interactive elements
- [ ] Keyboard navigation works
- [ ] Icons use Lucide SVG paths
- [ ] Responsive on mobile, tablet, desktop

---

## Reference

- **Design System**: `themes/arch/docs/design-system.md`
- **Coding Standards**: `themes/arch/docs/coding-standards.md`
- **Example Widgets**: `themes/arch/widgets/*`
