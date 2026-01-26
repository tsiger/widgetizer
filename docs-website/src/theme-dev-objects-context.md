Theme development relies on a shared set of data objects. Some are available everywhere, while others only exist in `layout.liquid`. This page documents the core objects and their attributes.

# Context Overview

### Available in `layout.liquid`

- `theme`
- `page`
- `project`
- `header`
- `main_content`
- `footer`
- `body_class`

### Available in widget templates

- `theme`
- `widget`
- `block` (inside block loops)

> **Note:** `page` and `project` are only available in `layout.liquid`.

# Theme Object

The `theme` object exposes settings defined in `theme.json`. See [Theme Manifest & Settings](theme-dev-manifest-settings.html) for how groups and IDs map to Liquid:

```
theme.{group}.{setting_id}
```

Example:

```liquid
{{ theme.colors.standard_bg_primary }}
{{ theme.typography.heading_font.stack }}
```

Nested example:

```liquid
{{ theme.typography.heading_font.weight }}
{{ theme.layout.enable_reveal_animations }}
```

# Widget Object

Available in widget templates as `widget`:

- `widget.id`: Unique instance ID
- `widget.type`: Widget type string
- `widget.settings`: Widget-level settings
- `widget.blocks`: Block objects keyed by ID
- `widget.blocksOrder`: Ordered list of block IDs
- `widget.index`: 1-based position on the page (may be `null`)

# Block Object

Within block loops:

- `block.id`: Block ID
- `block.type`: Block type string
- `block.settings`: Block-level settings

Example loop:

```liquid
{% for blockId in widget.blocksOrder %}
  {% assign block = widget.blocks[blockId] %}
  {{ block.type }}
  {{ block.settings.text }}
{% endfor %}
```

For schema structure and block patterns, see [Widgets & Blocks](theme-dev-widgets-blocks.html).

# Page Object

Available in `layout.liquid`:

- `page.id`
- `page.name`
- `page.slug`
- `page.created`
- `page.updated`
- `page.seo.description`
- `page.seo.og_title`
- `page.seo.og_image`
- `page.seo.robots`
- `page.seo.canonical_url`

# Project Object

Available in `layout.liquid`:

- `project.id`
- `project.name`
- `project.description`
- `project.theme`
- `project.siteUrl`
- `project.created`
- `project.updated`

# Layout-Only Variables

The layout has access to rendered content placeholders:

- `{{ header }}`
- `{{ main_content }}`
- `{{ footer }}`
- `{{ body_class }}`

These are not available inside widget templates.

# Practical Guidance

### Use Theme Settings in CSS

Output CSS variables with `{% theme_settings %}` and use them in `base.css` or widget styles.

### Avoid Page/Project in Widgets

Widgets should be reusable across pages, so rely on `theme` and `widget` data inside widget templates.
