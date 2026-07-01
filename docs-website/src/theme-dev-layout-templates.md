---
description: Build layouts and page templates for Widgetizer themes. Learn how layout.liquid wraps pages and how template JSON structures widget placement.
---

The layout and templates system defines how pages are assembled. `layout.liquid` wraps every page, and `templates/*.json` files declare which widgets appear on each page. This page explains the layout contract and how template JSON is structured.

# Layout Template (layout.liquid)

`layout.liquid` is the global wrapper for every page. It contains the document structure, loads global assets, and inserts the rendered header, page content, and footer.

### A Minimal Layout

```liquid
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  {% seo %}                     {# title, description, Open Graph, canonical #}
  {% fonts %}                   {# font preconnect + stylesheet #}
  {% render 'site-icons', site_icons: site_icons %}
  {% theme_settings %}          {# CSS variables from global settings #}
  {% asset src: "base.css" %}   {# theme base styles (after theme_settings) #}
  {% custom_css %}              {# optional: user custom CSS #}
  {% custom_head_scripts %}     {# optional: analytics, etc. #}
  {% header_assets %}           {# enqueued header styles/scripts #}
</head>
<body class="{{ body_class }}">
  {{ header | raw }}

  <main id="main-content">
    {{ main_content | raw }}
  </main>

  {{ footer | raw }}

  {% asset src: "scripts.js", defer: true %}
  {% footer_assets %}           {# enqueued footer styles/scripts #}
  {% custom_footer_scripts %}   {# optional: pre-</body> scripts #}
</body>
</html>
```

`themes/arch/layout.liquid` is a complete, production-ready version you can reference. For the full tag reference and ordering rules, see [Liquid Tags & Filters](theme-dev-liquid-assets.html).

### Recommended Head Order

Keep global head tags in this order unless your theme has a specific reason to move them:

1. Native document metadata: charset, viewport, format detection, and other static `<meta>` tags.
2. `{% seo %}` so page SEO, canonical, Open Graph, and Twitter tags are present on every page.
3. `{% fonts %}` so web font preconnects and stylesheets load before CSS uses those families.
4. `{% render 'site-icons', site_icons: site_icons %}` so favicon, Apple touch icon, and manifest links are emitted when configured.
5. `{% theme_settings %}` before your CSS so generated CSS variables exist.
6. Global CSS with `{% asset src: "base.css" %}`.
7. `{% custom_css %}` after theme CSS so user CSS can override it.
8. `{% custom_head_scripts %}` and `{% header_assets %}` near the end of `<head>`.

Footer scripts should follow the same pattern: theme scripts first, then `{% footer_assets %}`, then `{% custom_footer_scripts %}` as the final user-injected output before `</body>`.

### Required Placeholders

Your layout must render the three content placeholders. They contain **pre-rendered HTML**, so each requires the `raw` filter (autoescaping is enabled globally; see [Autoescaping & the `raw` filter](theme-dev-liquid-assets.html#autoescaping-the-raw-filter)):

- `{{ header | raw }}`: global header widget
- `{{ main_content | raw }}`: the page's widgets
- `{{ footer | raw }}`: global footer widget

> **Warning:** Without `| raw`, the rendered HTML is escaped and the page displays raw markup as text.

### Body Class

`{{ body_class }}` provides contextual classes and should be applied to `<body>`. Page slugs are prefixed with `page-` to avoid collisions with theme class names (e.g., `page-about`, `page-services`).

### Site Icons

If your theme exposes a favicon image setting (Arch uses `theme.general.favicon`), render the provided `site_icons` object through a snippet:

```liquid
{% render 'site-icons', site_icons: site_icons %}
```

The object contains precomputed favicon, Apple touch icon, and manifest paths. Export rewrites those paths for nested pages, so theme authors should render the provided values instead of hardcoding favicon filenames.

# Page Templates (templates/\*.json)

Page templates define a page's widget instances, their settings, and block content. Each file represents a template you can assign to pages. See [Widgets & Blocks](theme-dev-widgets-blocks.html) for widget schema and block patterns.

### Structure

```json
{
  "name": "Home",
  "slug": "index",
  "widgets": {
    "hero": {
      "type": "banner",
      "settings": {},
      "blocks": {},
      "blocksOrder": []
    }
  },
  "widgetsOrder": ["hero"]
}
```

### Widget Ordering

`widgetsOrder` is the source of truth for page layout order. The `widgets` object is a map keyed by widget ID.

### Blocks

Blocks live inside a widget definition:

- `blocks`: object keyed by block ID
- `blocksOrder`: array of block IDs in order

# Global Templates (templates/global/\*.json)

Global templates define default instances of global widgets like header and footer.

### Example

`themes/arch/templates/global/header.json` and `themes/arch/templates/global/footer.json` provide defaults for the header and footer widgets, but you can name and organize your global widget defaults however you like.

# Practical Guidance

### Keep Layout Thin

The layout should focus on document structure and global assets, not page-specific design.

### Use Templates for Defaults

Templates are where default widget configurations live. Avoid hardcoding content into `layout.liquid`.

### Example Template Patterns

The Arch `templates/index.json` file is a complete, widget-rich page you can use as a starting point.
