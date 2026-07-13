---
description: Reference for theme objects and context in Widgetizer. Available data objects, attributes, and where they can be accessed.
---

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

### Available in collection item templates

- `theme`
- `item`
- `collection`

> **Note:** `page` and `project` are only available in `layout.liquid`. The `item` and `collection` objects exist only in a collection type's `template.liquid`; see [Collections](theme-dev-collections.html).

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
{{ theme.general.enable_reveal_animations }}
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
- `page.uuid`
- `page.name`
- `page.slug`
- `page.created`
- `page.updated`
- `page.seo.description`
- `page.seo.og_title`
- `page.seo.og_image`
- `page.seo.og_type`
- `page.seo.twitter_card`
- `page.seo.robots`
- `page.seo.canonical_url`

> **Note:** A collection item page exposes a `page` object too, built from the item (`page.slug` is `"{slugPrefix}/{slug}"`, `page.name` is the item title). This lets item pages flow through the same layout and SEO as regular pages. See [Collections](theme-dev-collections.html).

# Project Object

Available in `layout.liquid`:

- `project.id`
- `project.name`
- `project.siteTitle`
- `project.description`
- `project.theme`
- `project.siteUrl`
- `project.created`
- `project.updated`

# Item and Collection Objects

Available only inside a collection type's `template.liquid` (item pages). Full details on the [Collections](theme-dev-collections.html) page.

`item`, the current collection item:

- `item.id`
- `item.uuid`
- `item.slug`
- `item.url` (relative URL to the item page, depth-aware)
- `item.created`
- `item.updated`
- `item.settings.*` (the item's fields, per the collection schema)

`collection`, the collection type's schema:

- `collection.type`
- `collection.slugPrefix`
- `collection.hasItemPages`
- `collection.defaultSort`
- `collection.settings` (the field definitions)

# Layout-Only Variables

The layout has access to rendered content placeholders. The three content placeholders are pre-rendered HTML and require the `raw` filter (see [Autoescaping & the `raw` filter](theme-dev-liquid-assets.html#autoescaping-the-raw-filter)):

- `{{ header | raw }}`
- `{{ main_content | raw }}`
- `{{ footer | raw }}`
- `{{ body_class }}` (page slugs are prefixed with `page-`, e.g., `page-about`)
- `{{ site_icons }}`: precomputed favicon / apple-touch-icon paths, typically consumed by a `site-icons` snippet

These are not available inside widget templates.

### Global Variables (Available Everywhere)

The following globals are available in all templates, including inside `{% render %}` snippets:

- `currentCanonicalPath`: The un-prefixed path of the page being rendered (e.g., `about.html`, or `portfolio/project-alpha.html` for a collection item page). The core `menu.liquid` snippet compares it against each menu item's `canonicalPath` to mark active items with the `is-active` class, matching on the canonical path (rather than the displayed `href`) so active state still works when item links are depth-prefixed with `../`.
- `filePath`: Base path for resolving file assets (PDFs uploaded via the `file` setting type). Use it as `{{ filePath | append: '/' | append: filename }}` so links work in both preview and exported output. See [Setting Types](theme-dev-setting-types.html#media-types) for the `file` setting and its template usage.

# Practical Guidance

### Use Theme Settings in CSS

Output CSS variables with `{% theme_settings %}` and use them in `base.css` or widget styles.

### Avoid Page/Project in Widgets

Widgets should be reusable across pages, so rely on `theme` and `widget` data inside widget templates.
