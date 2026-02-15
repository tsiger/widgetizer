---
description: Create widgets and blocks for Widgetizer themes. Define schemas for the editor UI and Liquid templates for rendering.
---

Widgets are the building blocks of every page. Each widget has its own schema (for the editor UI) and template (for rendering). This page walks you through creating a widget from scratch, including blocks for repeatable content.

# Creating a Widget

Every widget needs two files in a folder under `widgets/`:

```
widgets/my-widget/
├── schema.json    <- defines settings and blocks for the editor
└── widget.liquid  <- renders the HTML output
```

The folder name becomes the widget type. For a widget called `testimonial`, create `widgets/testimonial/`.

# Step 1: The Schema (schema.json)

The schema tells Widgetizer what settings to show in the editor and what block types the widget supports.

## Minimal Schema

```json
{
  "type": "testimonial",
  "displayName": "Testimonial",
  "settings": [],
  "blocks": [],
  "defaultBlocks": []
}
```

**Required fields:**

- `type`: Must match the folder name exactly (`testimonial`)
- `displayName`: What users see in the widget picker ("Testimonial")

**Optional fields:**

- `settings`: Array of widget-level settings (background color, layout options, etc.)
- `blocks`: Array of block type definitions (for repeatable content)
- `defaultBlocks`: Array of block instances to pre-populate when the widget is added
- `maxBlocks`: Maximum number of blocks allowed (integer). When omitted or `0`, blocks are unlimited
- `aliases`: Array of alternative names for AI/search ("quote", "review", "feedback")

## Adding Widget Settings

Widget settings appear in the editor sidebar when the widget is selected. Use them for options that apply to the whole widget.

```json
{
  "type": "testimonial",
  "displayName": "Testimonial",
  "settings": [
    {
      "type": "header",
      "id": "display_header",
      "label": "Display"
    },
    {
      "type": "select",
      "id": "layout",
      "label": "Layout",
      "default": "centered",
      "options": [
        { "value": "centered", "label": "Centered" },
        { "value": "side-by-side", "label": "Side by Side" }
      ]
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
  "blocks": [],
  "defaultBlocks": []
}
```

Use `header` settings to group related fields visually. For all available setting types, see [Setting Types](theme-dev-setting-types.html).

## Adding Blocks

Blocks are repeatable items inside a widget. Use them when users need to add multiple items of the same type (quotes, cards, slides, etc.).

Each block type definition has:

- `type`: Machine name for this block type
- `displayName`: What users see when adding blocks
- `settings`: Array of settings for this block type

```json
{
  "type": "testimonial",
  "displayName": "Testimonial",
  "settings": [
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
      "type": "quote",
      "displayName": "Quote",
      "settings": [
        {
          "type": "textarea",
          "id": "text",
          "label": "Quote text",
          "default": "This product changed everything for us."
        },
        {
          "type": "text",
          "id": "author",
          "label": "Author name",
          "default": "Jane Smith"
        },
        {
          "type": "text",
          "id": "role",
          "label": "Role / Company"
        },
        {
          "type": "image",
          "id": "avatar",
          "label": "Photo"
        }
      ]
    }
  ],
  "defaultBlocks": [
    {
      "type": "quote",
      "settings": {
        "text": "This product changed everything for us.",
        "author": "Jane Smith",
        "role": "CEO, Acme Inc"
      }
    },
    {
      "type": "quote",
      "settings": {
        "text": "Best decision we ever made.",
        "author": "John Doe",
        "role": "CTO, Example Corp"
      }
    }
  ]
}
```

`defaultBlocks` pre-populates the widget with content when first added. Always include defaults so the widget looks complete out of the box.

## Limiting the Number of Blocks (maxBlocks)

Use `maxBlocks` to cap how many blocks a widget can contain. This is useful for slideshows, navigation bars, or any widget where too many items would break the design.

```json
{
  "type": "slideshow",
  "displayName": "Slideshow",
  "maxBlocks": 10,
  "blocks": [ ... ],
  "defaultBlocks": [ ... ]
}
```

**Behavior:**

- When the limit is reached, the "Add block" button and insertion zones are hidden
- A counter (e.g., "5/5") appears in the editor
- Existing blocks are never removed — if a widget already has more blocks than the limit (e.g., the limit was added later), they are preserved but no new blocks can be added
- Works for both page widgets and global widgets (header/footer)

# Step 2: The Template (widget.liquid)

The template renders the widget's HTML. It has access to `widget.settings`, `widget.blocks`, and `widget.blocksOrder`.

## Required Structure

Every widget template must include these attributes on the wrapper element:

```liquid
<section
  id="{{ widget.id }}"
  class="widget widget-testimonial widget-{{ widget.id }}"
  data-widget-id="{{ widget.id }}"
  data-widget-type="testimonial"
>
  <!-- content here -->
</section>
```

**Why these attributes?**

- `id="{{ widget.id }}"`: Unique ID for scoped styles and JS
- `class="widget widget-{name} widget-{{ widget.id }}"`: Base classes for styling
- `data-widget-id` / `data-widget-type`: Used by the editor for live updates

## Accessing Widget Settings

Use `widget.settings.{id}` to access values:

```liquid
<section
  id="{{ widget.id }}"
  class="widget widget-testimonial widget-{{ widget.id }} color-scheme-{{ widget.settings.color_scheme }}"
  data-widget-id="{{ widget.id }}"
  data-widget-type="testimonial"
>
  <div class="widget-container layout-{{ widget.settings.layout }}">
    <!-- blocks will go here -->
  </div>
</section>
```

## Rendering Blocks

Loop through `widget.blocksOrder` and look up each block in `widget.blocks`:

```liquid
<section
  id="{{ widget.id }}"
  class="widget widget-testimonial widget-{{ widget.id }} color-scheme-{{ widget.settings.color_scheme }}"
  data-widget-id="{{ widget.id }}"
  data-widget-type="testimonial"
>
  <div class="widget-container layout-{{ widget.settings.layout }}">
    {% for blockId in widget.blocksOrder %}
      {% assign block = widget.blocks[blockId] %}

      {% case block.type %}
        {% when 'quote' %}
          <blockquote class="testimonial-quote" data-block-id="{{ blockId }}">
            <p class="quote-text" data-setting="text">{{ block.settings.text }}</p>
            <footer class="quote-attribution">
              {% if block.settings.avatar != blank %}
                <img src="{% image src: block.settings.avatar, size: 'thumbnail', output: 'path' %}" alt="{{ block.settings.author }}" class="quote-avatar">
              {% endif %}
              <cite>
                <span class="quote-author" data-setting="author">{{ block.settings.author }}</span>
                {% if block.settings.role != blank %}
                  <span class="quote-role" data-setting="role">{{ block.settings.role }}</span>
                {% endif %}
              </cite>
            </footer>
          </blockquote>
      {% endcase %}

    {% endfor %}
  </div>
</section>
```

**Key points:**

- `data-block-id="{{ blockId }}"`: Required for the editor to identify blocks
- `data-setting="text"`: Enables live preview updates when editing
- Use `{% case block.type %}` to handle multiple block types

## Adding Scoped Styles

Include a `<style>` block inside the widget to scope CSS to this instance:

```liquid
<section
  id="{{ widget.id }}"
  class="widget widget-testimonial widget-{{ widget.id }} color-scheme-{{ widget.settings.color_scheme }}"
  data-widget-id="{{ widget.id }}"
  data-widget-type="testimonial"
>
  <style>
    .widget-{{ widget.id }} {
      padding-block: var(--space-2xl);
    }

    .widget-{{ widget.id }} .testimonial-quote {
      max-width: var(--content-width-md);
      margin-inline: auto;
      text-align: center;
    }

    .widget-{{ widget.id }} .quote-text {
      font-size: var(--font-size-xl);
      font-style: italic;
      margin-block-end: var(--space-lg);
    }

    .widget-{{ widget.id }} .quote-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      object-fit: cover;
    }

    .widget-{{ widget.id }} .quote-author {
      display: block;
      font-weight: var(--font-weight-bold);
    }

    .widget-{{ widget.id }} .quote-role {
      display: block;
      color: var(--text-muted);
      font-size: var(--font-size-sm);
    }
  </style>

  <div class="widget-container layout-{{ widget.settings.layout }}">
    {% for blockId in widget.blocksOrder %}
      <!-- block rendering -->
    {% endfor %}
  </div>
</section>
```

Using `.widget-{{ widget.id }}` ensures styles don't leak to other instances.

# Multiple Block Types

Widgets can support multiple block types. For example, a banner might have heading, text, and button blocks:

```json
{
  "blocks": [
    {
      "type": "heading",
      "displayName": "Heading",
      "settings": [{ "type": "text", "id": "text", "label": "Text", "default": "Welcome" }]
    },
    {
      "type": "text",
      "displayName": "Text",
      "settings": [{ "type": "textarea", "id": "text", "label": "Text", "default": "Description here" }]
    },
    {
      "type": "button",
      "displayName": "Button",
      "settings": [{ "type": "link", "id": "link", "label": "Link" }]
    }
  ]
}
```

In the template, handle each type:

```liquid
{% for blockId in widget.blocksOrder %}
  {% assign block = widget.blocks[blockId] %}

  {% case block.type %}
    {% when 'heading' %}
      <h2 data-block-id="{{ blockId }}" data-setting="text">{{ block.settings.text }}</h2>

    {% when 'text' %}
      <p data-block-id="{{ blockId }}" data-setting="text">{{ block.settings.text }}</p>

    {% when 'button' %}
      {% if block.settings.link.text != blank %}
        <a href="{{ block.settings.link.href }}" class="widget-button" data-block-id="{{ blockId }}">
          {{ block.settings.link.text }}
        </a>
      {% endif %}
  {% endcase %}
{% endfor %}
```

# Heading Hierarchy

Use `widget.index` to determine if this is the first widget on the page. The first widget should use `<h1>`, others use `<h2>`:

```liquid
{% if widget.index == 1 %}
  <h1 data-block-id="{{ blockId }}">{{ block.settings.text }}</h1>
{% else %}
  <h2 data-block-id="{{ blockId }}">{{ block.settings.text }}</h2>
{% endif %}
```

`widget.index` is `null` for global widgets (header/footer).

# Global Widgets

Global widgets appear on every page. Only two are supported:

- Header: `widgets/global/header/` with template at `templates/global/header.json`
- Footer: `widgets/global/footer/` with template at `templates/global/footer.json`

They work exactly like regular widgets but are rendered via `{{ header }}` and `{{ footer }}` in `layout.liquid`.

Global widgets support the full blocks system — block types, `maxBlocks`, `defaultBlocks`, and `blocksOrder`/`blocks` data — identical to page widgets. This means your header can have repeatable blocks (e.g., announcement bars, top-bar buttons) and your footer can have repeatable blocks (e.g., link columns, text rows).

**Example: header with announcement block**

```json
{
  "type": "header",
  "displayName": "Header",
  "maxBlocks": 3,
  "settings": [ ... ],
  "blocks": [
    {
      "type": "announcement",
      "displayName": "Announcement",
      "settings": [
        { "type": "text", "id": "text", "label": "Text", "default": "Free shipping on orders over $50" }
      ]
    }
  ],
  "defaultBlocks": [
    { "type": "announcement", "settings": { "text": "Free shipping on orders over $50" } }
  ]
}
```

# Complete Example

Here's a minimal but complete testimonial widget:

**widgets/testimonial/schema.json:**

```json
{
  "type": "testimonial",
  "displayName": "Testimonial",
  "aliases": ["quote", "review"],
  "settings": [
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
      "type": "quote",
      "displayName": "Quote",
      "settings": [
        { "type": "textarea", "id": "text", "label": "Quote", "default": "Amazing product!" },
        { "type": "text", "id": "author", "label": "Author", "default": "Jane Smith" },
        { "type": "text", "id": "role", "label": "Role" }
      ]
    }
  ],
  "defaultBlocks": [
    {
      "type": "quote",
      "settings": {
        "text": "This changed everything for our team.",
        "author": "Jane Smith",
        "role": "CEO, Acme Inc"
      }
    }
  ]
}
```

**widgets/testimonial/widget.liquid:**

```liquid
<section
  id="{{ widget.id }}"
  class="widget widget-testimonial widget-{{ widget.id }} color-scheme-{{ widget.settings.color_scheme }}"
  data-widget-id="{{ widget.id }}"
  data-widget-type="testimonial"
>
  <style>
    .widget-{{ widget.id }} {
      padding-block: var(--space-2xl);
    }
    .widget-{{ widget.id }} .quote-text {
      font-size: var(--font-size-xl);
      font-style: italic;
      max-width: var(--content-width-md);
      margin-inline: auto;
      text-align: center;
    }
    .widget-{{ widget.id }} .quote-author {
      font-weight: bold;
    }
  </style>

  <div class="widget-container">
    {% for blockId in widget.blocksOrder %}
      {% assign block = widget.blocks[blockId] %}
      {% case block.type %}
        {% when 'quote' %}
          <blockquote data-block-id="{{ blockId }}">
            <p class="quote-text" data-setting="text">{{ block.settings.text }}</p>
            <footer>
              <span class="quote-author" data-setting="author">{{ block.settings.author }}</span>
              {% if block.settings.role != blank %}
                <span class="quote-role" data-setting="role">— {{ block.settings.role }}</span>
              {% endif %}
            </footer>
          </blockquote>
      {% endcase %}
    {% endfor %}
  </div>
</section>
```

# Editor Lifecycle Events

When your widget has blocks that aren't all visible at once — slides in a slideshow, panels in an accordion, tabs in a switcher — the editor needs a way to reveal the right block when a user selects it in the sidebar. Widgetizer dispatches custom DOM events on widget elements to make this possible.

## Design Mode Detection

The editor sets a global flag before any widget scripts run. Use it to guard editor-only code:

```javascript
if (window.Widgetizer?.designMode) {
  // Only runs inside the editor preview
}
```

In production and standalone preview, `window.Widgetizer` is `undefined`.

## Available Events

All events are dispatched on the widget element (`[data-widget-id]`) and bubble through the DOM.

| Event | Fires When | `e.detail` |
| --- | --- | --- |
| `widget:select` | This widget becomes selected | `{}` |
| `widget:deselect` | This widget is deselected | `{}` |
| `widget:block-select` | A block within this widget is selected | `{ blockId }` |
| `widget:block-deselect` | A block within this widget is deselected | `{ blockId }` |
| `widget:updated` | Widget DOM was replaced (morph/re-render) | `{ widgetId }` |

When selection changes, events fire in this order: `block-deselect` (old) → `deselect` (old) → `select` (new) → `block-select` (new). Events only fire when the state actually changes — selecting the same block twice does not re-fire.

## Example: Slideshow

Navigate to the selected slide and pause autoplay while editing:

```javascript
if (window.Widgetizer?.designMode) {
  widget.addEventListener("widget:block-select", (e) => {
    const { blockId } = e.detail;
    widget.querySelectorAll(".slideshow-slide[data-block-id]").forEach((slide, idx) => {
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

## Example: Accordion

Expand the selected panel so its content is visible:

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

## Tips

- **Guard with `designMode`**: Always wrap listeners in `if (window.Widgetizer?.designMode)` so they don't execute in production
- **Events fire on the widget element**: Use `widget.addEventListener()`, not `document.addEventListener()`
- **Re-initialization safe**: Inline scripts re-execute after DOM morphs, so listeners are re-attached automatically
- **Use existing functions**: If your widget already has a `goToSlide()` or `activateTab()` function, just call it from the event handler

# Related Pages

- [Setting Types](theme-dev-setting-types.html) — all available field types for settings
- [Theme Objects & Context](theme-dev-objects-context.html) — what data is available in templates
- [Liquid Tags & Assets](theme-dev-liquid-assets.html) — media tags, asset loading, and custom tags
- [Design System & Utilities](theme-dev-design-system.html) — CSS tokens and utility classes
