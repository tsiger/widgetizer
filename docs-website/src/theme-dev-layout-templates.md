The layout and templates system defines how pages are assembled. `layout.liquid` wraps every page, and `templates/*.json` files declare which widgets appear on each page. This page explains the layout contract and how template JSON is structured.

# Layout Template (layout.liquid)

`layout.liquid` is the global wrapper for every page. It contains the document structure, loads assets, and inserts the rendered header, page content, and footer.

### Example (Arch)

`themes/arch/layout.liquid` includes:

- `{% seo %}` and `{% fonts %}` for meta and fonts
- `{% theme_settings %}` to output CSS variables
- `{% asset "base.css" %}` and `{% asset "scripts.js" %}` for theme assets
- `{% header_assets %}` and `{% footer_assets %}` for enqueued assets
- `{{ header }}`, `{{ main_content }}`, and `{{ footer }}`
- Optional `{% custom_css %}`, `{% custom_head_scripts %}`, `{% custom_footer_scripts %}`

These tags are part of the standard Liquid surface area; see [Liquid Tags & Assets](theme-dev-liquid-assets.html) for a full list and usage rules.

### Required Placeholders

Your layout must include:

- `{{ header }}` (global header widget)
- `{{ main_content }}` (page widgets)
- `{{ footer }}` (global footer widget)

### Body Class

`{{ body_class }}` provides contextual classes (page type, template, settings) and should be applied to `<body>`.

# Page Templates (templates/*.json)

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

# Global Templates (templates/global/*.json)

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
