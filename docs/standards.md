# Widget Standardization Guidelines

## CRITICAL PROTOCOL (READ THIS FIRST)

**IF YOU DO NOT UNDERSTAND SOMETHING, NEED TO INTRODUCE NEW STYLES, OR CHANGE ANYTHING SIGNIFICANT, YOU WILL STOP AND ASK.**

**YOU WILL NEVER PROCEED WITHOUT EXPLICIT PERMISSION FROM THE USER.**

This document outlines the strict standards for all Arch theme widgets.

## Current Initiative: Comprehensive Widget Audit

We are currently performing a systematic, one-by-one verification of every single widget in `themes/arch/widgets/` against the standards below.

**Process:**

1. Open the widget folder.
2. Verified `schema.json` and `widget.liquid` against ALL critical rules (Structure, Typography, Semantic HTML, Layout, Backgrounds, etc.).
3. Update `docs/task.md` or `docs/widget-audit.md` with findings.
4. Fix non-compliant items immediately.

---

## 1. Widget Structure

Every widget follows this standard structure:

```liquid
<section
  id="{{ widget.id }}"
  class="widget widget-type-name widget-{{ widget.id }}"
  {% if widget.settings.background == 'secondary' %}
    style="--widget-bg-color: var(--bg-secondary);"
  {% endif %}
  data-widget-id="{{ widget.id }}"
  data-widget-type="widget-type-name"
>
  <style>
    .widget-{{ widget.id }} {
      /* Widget-specific styles only - use design system classes where possible */
    }
  </style>

  <div class="widget-container {% if widget.settings.background == 'secondary' %}widget-container-padded{% endif %}">
    <!-- Optional: Widget Header -->
    <div class="widget-header">
      <span class="widget-eyebrow">...</span>
      <h2 class="widget-headline">...</h2>
      <p class="widget-description">...</p>
    </div>

    <!-- Main Content -->
    <div class="widget-content">
      <!-- Widget-specific layout -->
    </div>
  </div>
</section>
```

---

## 2. Class Naming & Structure

- **Widget Header**:
  - Eyebrow: `.widget-eyebrow`
  - Headline: `.widget-headline` (usually `<h2>`)
  - Description: `.widget-description` (usually `<p>`)
- **Block Content**:
  - Titles/Headings: `<h3>` tags. Styling via `block-text` utilities.
  - Body Text: `<p>` tags. Styling via `block-text` utilities.
- **Buttons**:
  - Base: `.widget-button` (Do not use `.widget-button-small` anymore)
  - Modifiers: `.widget-button-primary`, `.widget-button-secondary`
  - Sizes: `.widget-button-medium`, `.widget-button-large`, `.widget-button-xlarge` (Use sparingly)

---

## 3. Typography & Utilities

- **NO Custom CSS** for basic text styling in widget liquid files.
- **DELETE** redundant `font-size`, `font-weight`, `line-height`, `color` in `<style>` blocks if a utility class exists.
- **USE** `block-text` modifiers:
  - Sizes: `block-text-sm`, `block-text-lg`, `block-text-xl`, `block-text-2xl`
  - Weights: `block-text-medium`, `block-text-bold`
  - Colors: `block-text-muted`, `block-text-heading`
  - Styles: `block-text-uppercase`

---

## 4. Semantic HTML & Accessibility

- **Headings**: Ensure logical hierarchy (`h2` for widget title, `h3` for items).
- **ARIA**: Mandatory for interactive elements (Accordions: `aria-expanded`, `aria-controls`, `role="region"`).
- **Images**: Ensure `alt` text is supported and rendered.

---

## 5. Layout & Spacing

- **Container-Based Spacing**:
  - Semantic classes (`.widget-title`, `.widget-description`) **DO NOT** carry default margins.
  - **USE** local style blocks with `display: flex; flex-direction: column; gap: var(--space-md);` (or consistent spacing variable) on the content container to manage vertical rhythm.
  - This allows semantic classes to be used purely as hooks without layout side effects.

---

## 6. Widget Background Setting

Every widget that supports background switching uses this pattern:

### Schema (place at END of settings array):

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

### Liquid Implementation:

```liquid
<!-- On <section> tag -->
<section
  ...
  {% if widget.settings.background == 'secondary' %}
    style="--widget-bg-color: var(--bg-secondary);"
  {% endif %}
>

<!-- On .widget-container -->
<div class="widget-container {% if widget.settings.background == 'secondary' %}widget-container-padded{% endif %}">
```

**Key Points:**

- `--widget-bg-color` sets the background color CSS variable
- `.widget-container-padded` switches from margin-based to padding-based spacing when there's a background

---

## 7. Block Backgrounds (for items within widgets)

For blocks/items that need individual background/overlay support (e.g., bento-grid items, cards with images):

### Use the `.block-item` class from base.css:

```liquid
{% assign item_classes = 'your-item-class block-item' %}

{% if block.settings.image != blank %}
  {% assign item_classes = item_classes | append: ' has-bg-image has-overlay' %}
  {% assign item_style = '--widget-overlay-color: ' | append: block.settings.overlay_color | append: '; background-image: url(' | append: block.settings.image | image: 'path', 'large' | append: ');' %}
{% elsif block.settings.background_color != blank %}
  {% assign item_classes = item_classes | append: ' has-bg-color' %}
  {% assign item_style = '--widget-bg-color: ' | append: block.settings.background_color | append: ';' %}
{% endif %}

<div class="{{ item_classes }}" style="{{ item_style }}">
  ...
</div>
```

### Schema for block background settings (order matters):

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

---

## 8. Color Schemes

- **USE** `.color-scheme-light` or `.color-scheme-dark` classes to toggle text/border colors locally.
- Logic: `{% if block.settings.text_color == 'light' %}color-scheme-dark{% elsif block.settings.text_color == 'dark' %}color-scheme-light{% endif %}`.

---

## 9. Block Architecture

- **Flexible Content**:
  - Move away from fixed top-level settings (`eyebrow`, `headline`, `button`) where possible.
  - **USE** a `blocks` array with `heading`, `text`, `button` block types.
  - This allows users to reorder elements freely.
- **Loop Rendering**: Render blocks via `{% for blockId in widget.blocksOrder %}` using `widget.blocks[blockId]`.

---

## 10. Schema Conventions

### Settings Order:

1. Content settings (image, title, description, etc.)
2. Layout settings (columns, alignment, position, etc.)
3. Style settings (gap, size, etc.)
4. **Background setting (LAST)**

### Block Settings Order (for items with backgrounds):

1. Content (title, text, link)
2. Background: image → overlay_color (with description) → background_color
3. Layout (col_span, row_span, etc.)
4. Style (text_color, alignment)

### Defaults:

- **Header**: Eyebrow, Title, and Description defaults SHOULD be present and engaging.
- **Blocks**: `defaultBlocks` must contain 3-4 realistic, varied items.
- **Widgets without blocks**: MUST provide functional default values for all key settings (e.g., specific dates, messages, or configurations) so the widget works immediately when added.

### Naming:

- Consistent naming (`title`, `description`, `text`, `image`).
- **Overlay**: Use `"type": "color"` with `"allow_alpha": true` for overlay settings.
- **Background**: Use `"id": "background"` with `primary`/`secondary` options for widget-level background.

---

## 11. Local Styles

- **ONLY** add local `<style>` blocks for widget-specific layout that cannot be achieved with design system classes.
- **DO NOT** duplicate styles that exist in `base.css`.
- **DELETE** unused CSS rules (e.g., styles for elements that don't exist in the HTML).
- **USE** design system variables (`--space-md`, `--border-radius-lg`, etc.) in local styles.
