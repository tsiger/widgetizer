---
description: Build layouts and page templates for Widgetizer themes. Learn how layout.liquid wraps pages and how template JSON structures widget placement.
---

The layout and templates system defines how pages are assembled. `layout.liquid` wraps every page, and `templates/*.json` files declare which widgets appear on each page. This page explains the layout contract and how template JSON is structured.

# Layout Template (layout.liquid)

`layout.liquid` is the global wrapper for every page. It contains the document structure, loads global assets, and inserts the rendered header, page content, and footer.

### A Minimal Layout

```liquid
<!DOCTYPE html>
<html lang="{{ page.language | default: project.defaultLanguage | default: 'en' }}" dir="{{ page.dir | default: 'ltr' }}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  {% seo %}
  {% fonts %}
  {% render 'site-icons', site_icons: site_icons %}
  {% theme_settings %}
  {% asset src: "base.css" %}
  {% custom_css %}
  {% custom_head_scripts %}
  {% header_assets %}
</head>
<body class="{{ body_class }}">
  {{ header | raw }}

  <main id="main-content">
    {{ main_content | raw }}
  </main>

  {{ footer | raw }}

  {% asset src: "scripts.js", defer: true %}
  {% footer_assets %}
  {% custom_footer_scripts %}
</body>
</html>
```

`themes/arch/layout.liquid` is a complete, production-ready version you can reference. For the full tag reference and ordering rules, see [Liquid Tags & Filters](theme-dev-liquid-assets.html).

`page.language` and `page.dir` give the document the language and direction of the page being rendered, so a site that publishes in several languages gets the right `lang` on every page. Don't hardcode `lang="en"`. See [Localization](theme-dev-localization.html#the-document-language).

### Recommended Head Order

Keep global head tags in this order unless your theme has a specific reason to move them:

1. Native document metadata: charset, viewport, format detection, and other static `<meta>` tags.
2. `{% seo %}` so page SEO, canonical, language alternates, Open Graph, Twitter tags and structured data are present on every page.
3. `{% fonts %}` so web font preconnects and stylesheets load before CSS uses those families.
4. `{% render 'site-icons', site_icons: site_icons %}` so favicon, search-result icon, Apple touch icon, and manifest links are emitted when configured.
5. `{% theme_settings %}` before your CSS so generated CSS variables exist.
6. Global CSS with `{% asset src: "base.css" %}`.
7. `{% custom_css %}` after theme CSS so user CSS can override it.
8. `{% custom_head_scripts %}` and `{% header_assets %}` near the end of `<head>`.

Footer scripts should follow the same pattern: theme scripts first, then `{% footer_assets %}`, then `{% custom_footer_scripts %}` as the final user-injected output before `</body>`.

### Required Placeholders

Your layout must render the three content placeholders. They contain **pre-rendered HTML**, so each requires the `raw` filter (autoescaping is enabled globally; see [Autoescaping & the `raw` filter](theme-dev-liquid-assets.html#escaping-model)):

- `{{ header | raw }}`: global header widget
- `{{ main_content | raw }}`: the page's widgets
- `{{ footer | raw }}`: global footer widget

> **Warning:** Without `| raw`, the rendered HTML is escaped and the page displays raw markup as text.

### Body Class

`{{ body_class }}` provides contextual classes and should be applied to `<body>`. Page slugs are prefixed with `page-` to avoid collisions with theme class names (e.g., `page-about`, `page-services`).

### Site Icons

If your theme exposes an image setting with id `favicon` (in any group; Arch keeps it in `general`), render the provided `site_icons` object through a snippet:

```liquid
{% render 'site-icons', site_icons: site_icons %}
```

`site-icons` is a theme snippet, not a built-in one, so ship your own in `snippets/` (Arch's `snippets/site-icons.liquid` is a good copy). The object contains precomputed favicon, search-result icon (`serpIconHref`), Apple touch icon, and manifest paths. Export generates those files, plus an unlinked `favicon.ico` at the site root, and rewrites the paths for nested pages, so render the provided values instead of hardcoding favicon filenames. See [Layout Values](theme-dev-liquid-assets.html#layout-values) for every field.

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

### Starter Content Becomes the Owner's

When a project is created, each template becomes an ordinary page the owner edits, in the site's default language. Templates are never re-applied: a theme update adds templates that are new, as new pages, and leaves existing pages alone. If the owner adds another language later, they create those pages themselves (the menus, header and footer are copied for them).

Links in templates can name pages by slug (`"href": "contact.html"`). Widgetizer connects them to the matching page when the project is created, so they keep working after a rename and on pages inside folders. A link that comes only from a `schema.json` default is never connected to a page: put starter links in the template or preset instead. See [Starter Links and Updates](theme-dev-distribution.html#starter-links-and-updates).

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
