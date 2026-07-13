---
description: Build your first Widgetizer theme from scratch. A step-by-step quickstart that takes you from an empty folder to a rendered page.
---

This quickstart walks you from an empty folder to a working theme that renders a real page. It's the fastest way to understand how the pieces fit together. Once it clicks, the rest of the Theme Development section is reference material you can dip into as needed.

By the end you'll have a minimal theme with a layout, one widget, and a homepage template, the smallest thing Widgetizer will recognize and render.

> **Tip:** Keep the [Arch theme](https://github.com/tsiger/widgetizer/tree/master/themes/arch) open in another window. It's a complete, production-ready theme and the best reference while you build.

# What You'll Build

```
themes/hello-theme/
├── theme.json            # manifest + global settings
├── layout.liquid         # the HTML wrapper for every page
├── screenshot.png        # 1280×720 preview for the theme picker
├── assets/
│   └── base.css          # theme styles
├── widgets/
│   └── hello/
│       ├── schema.json   # the widget's editable settings
│       └── widget.liquid # the widget's HTML
└── templates/
    └── index.json        # the homepage layout
```

Create the `themes/hello-theme/` folder, then add the files below.

# Step 1: The Manifest (theme.json)

`theme.json` identifies your theme and declares the global settings users can edit. Start small:

```json
{
  "name": "Hello Theme",
  "version": "1.0.0",
  "author": "Your Name",
  "settings": {
    "global": {
      "colors": [
        { "type": "color", "id": "accent", "label": "Accent", "default": "#0d47b7", "outputAsCssVar": true },
        { "type": "color", "id": "text", "label": "Text", "default": "#222222", "outputAsCssVar": true }
      ]
    }
  }
}
```

`name`, `version`, and `author` are required. Each `outputAsCssVar` setting becomes a CSS variable named `--{group}-{id}` (here, `--colors-accent` and `--colors-text`). See [Theme Manifest & Settings](theme-dev-manifest-settings.html).

# Step 2: The Layout (layout.liquid)

`layout.liquid` wraps every page. It owns the `<head>`, loads assets, and drops in the rendered content. The three content placeholders need the `raw` filter because they're already-rendered HTML:

```liquid
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  {% seo %}
  {% fonts %}
  {% theme_settings %}
  {% asset src: "base.css" %}
  {% header_assets %}
</head>
<body class="{{ body_class }}">
  {{ header | raw }}

  <main id="main-content">
    {{ main_content | raw }}
  </main>

  {{ footer | raw }}

  {% footer_assets %}
</body>
</html>
```

`{{ header }}` and `{{ footer }}` render your global header/footer widgets. We're skipping those for now, so they'll simply be empty; the page still renders. See [Layout & Templates](theme-dev-layout-templates.html) and [Liquid Tags & Filters](theme-dev-liquid-assets.html).

# Step 3: A Widget

A widget is two files in `widgets/{name}/`. The folder name is the widget's type.

**`widgets/hello/schema.json`:** the editable settings:

```json
{
  "type": "hello",
  "displayName": "Hello",
  "settings": [
    { "type": "text", "id": "heading", "label": "Heading", "default": "Hello, world" },
    { "type": "richtext", "id": "body", "label": "Body", "default": "<p>My first Widgetizer theme.</p>" }
  ]
}
```

**`widgets/hello/widget.liquid`:** the HTML. The wrapper attributes are required so the editor can target the widget; richtext is rendered with `| raw`:

```liquid
<section
  id="{{ widget.id }}"
  class="widget widget-hello widget-{{ widget.id }}"
  data-widget-id="{{ widget.id }}"
  data-widget-type="hello"
>
  <div class="widget-container">
    {% if widget.index == 1 %}
      <h1 data-setting="heading">{{ widget.settings.heading }}</h1>
    {% else %}
      <h2 data-setting="heading">{{ widget.settings.heading }}</h2>
    {% endif %}

    {% unless widget.settings.body | rte_blank %}
      <div class="rte" data-setting="body">{{ widget.settings.body | raw }}</div>
    {% endunless %}
  </div>
</section>
```

See [Widgets & Blocks](theme-dev-widgets-blocks.html) for the full widget model, and the [Theme Contract](theme-dev-contract.html) for the required attributes at a glance.

# Step 4: The Homepage Template

A page template lists which widgets appear on a page and their default content. The homepage uses the slug `index`:

**`templates/index.json`:**

```json
{
  "name": "Home",
  "slug": "index",
  "widgets": {
    "intro": {
      "type": "hello",
      "settings": { "heading": "Hello, world", "body": "<p>My first Widgetizer theme.</p>" },
      "blocks": {},
      "blocksOrder": []
    }
  },
  "widgetsOrder": ["intro"]
}
```

`widgetsOrder` is the source of truth for order; `widgets` is keyed by an id you choose. See [Layout & Templates](theme-dev-layout-templates.html).

# Step 5: Styles and Screenshot

**`assets/base.css`:** read your theme settings via the CSS variables from Step 1:

```css
:root { --content-width: 48rem; }

body {
  margin: 0;
  color: var(--colors-text);
  font-family: system-ui, sans-serif;
  line-height: 1.6;
}

.widget-container {
  max-width: var(--content-width);
  margin-inline: auto;
  padding: 4rem 1.5rem;
}

h1, h2 { color: var(--colors-accent); }
```

Finally, add a **`screenshot.png`** (1280×720); it's required and shows in the theme picker.

# Step 6: Load Your Theme

1. Zip the `hello-theme/` folder.
2. In Widgetizer, go to the **Themes** page and upload the zip (or, if running from source, drop the folder into `themes/` and run `npm run theme:sync`).
3. Create a new [project](projects.html) and choose **Hello Theme**.
4. Open the page editor, and your homepage renders with the `hello` widget. Edit the heading and watch it update live.

That's a complete theme. From here, grow it.

# Where to Go Next

- [Theme Structure](theme-dev-structure.html): the full folder layout and what's required
- [Setting Types](theme-dev-setting-types.html): every field type for settings
- [Liquid Tags & Filters](theme-dev-liquid-assets.html): media, assets, SEO, and the filter reference
- [Widgets & Blocks](theme-dev-widgets-blocks.html): repeatable blocks, multiple block types, editor events
- [Collections](theme-dev-collections.html): theme-defined content types with their own pages
- [Theme Contract](theme-dev-contract.html): the required files, placeholders, and attributes on one page
- [Distributing & Updating Themes](theme-dev-distribution.html): versioned updates and presets
