---
description: Build your first Widgetizer theme from scratch. A step-by-step quickstart that takes you from an empty folder to a rendered page.
---

This quickstart walks you from an empty folder to a working theme that renders a real page. It's the fastest way to understand how the pieces fit together. Once it clicks, the rest of the Theme Development section is reference material you can dip into as needed.

By the end you'll have a minimal theme with a layout, one widget, and a homepage template, the smallest thing Widgetizer will recognize and render.

> **Tip:** Keep the [Arch theme](https://github.com/tsiger/widgetizer/tree/master/themes/arch) open in another window. It's a complete, production-ready theme and the best reference while you build.

### Optional Shortcuts

You don't need any of these to follow the quickstart, but they can save time once you build a real theme:

- **Starter theme.** `skills/widgetizer-theme/assets/starter-theme/` in the Widgetizer repository is a minimal theme that already passes the checker: layout, header with menu and language switcher, footer, two sample widgets, a home page, a menu and an English locale file. Copy it as a starting point and replace the design.
- **Authoring skills.** `skills/widgetizer-theme/` is an Agent Skill that teaches an AI coding agent the theme rules, with one reference file per topic and a generated catalog (`references/contract.json`) of the tags, filters, setting types and fonts the app supports. `skills/widgetizer-theme-design/` covers the design side: the brief, visual previews and the editing model. Both are useful to read even without an agent.
- **Theme checker.** `npm run validate:theme` checks a theme folder against what the app supports (see [Step 7](#step-7-check-your-theme)).

# What You'll Build

```
themes/hello-theme/
├── theme.json            # manifest + global settings
├── layout.liquid         # the HTML wrapper for every page
├── screenshot.png        # 1280×720 preview for the theme picker
├── assets/
│   └── base.css          # theme styles
├── locales/
│   └── en.json           # editor group names (and, later, visitor words)
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
<html lang="{{ page.language | default: 'en' }}" dir="{{ page.dir | default: 'ltr' }}">
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

`{{ header }}` and `{{ footer }}` render your global header/footer widgets. We're skipping those for now, so they'll simply be empty; the page still renders. `page.language` and `page.dir` give the document the language of the page being rendered, which matters once a site publishes in more than one language (see [Localization](theme-dev-localization.html)). See [Layout & Templates](theme-dev-layout-templates.html) and [Liquid Tags & Filters](theme-dev-liquid-assets.html).

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

**`locales/en.json`:** the editor titles each settings group from this file:

```json
{
  "global": {
    "colors": { "name": "Colors" }
  }
}
```

The same file later holds your visitor-facing words; see [Localization](theme-dev-localization.html).

Finally, add a **`screenshot.png`** (1280×720); it's required and shows in the theme picker.

# Step 6: Load Your Theme

1. Zip the `hello-theme/` folder.
2. In Widgetizer, go to the **Themes** page and upload the zip. If you run Widgetizer from source, you can instead keep the folder in `themes/` and copy it into the app's theme library with `npm run theme:sync -- --theme hello-theme`.
3. Create a new [project](projects.html) and choose **Hello Theme**.
4. Open the page editor, and your homepage renders with the `hello` widget. Edit the heading and watch it update live.

That's a complete theme. From here, grow it.

### Seeing Changes While You Work

A project keeps its own copy of the theme, so editing `themes/hello-theme/` doesn't change a project you already created. From source, keep a test project in sync while you edit:

```bash
npm run theme:sync -- --theme hello-theme --project <project-folder>
```

`<project-folder>` is the project's folder under `data/projects/`. The command copies the theme into the library and the project, then watches for changes. It never copies `templates/` or `menus/`, so the project's pages and menus stay as they are, but it **does** copy `theme.json` over the project's, which resets that project's saved Site settings to your defaults. Use a throwaway project. To see how a real site receives a new version, ship it as a [theme update](theme-dev-distribution.html) instead.

# Step 7: Check Your Theme

From a Widgetizer source checkout, run the app's theme checker on your folder:

```bash
npm run validate:theme -- themes/hello-theme
```

It parses every template with the same Liquid engine the app uses and checks the theme against what the app supports: required files, screenshot sizes, setting types and defaults, unknown tags and filters, editor attributes, starter pages and menus, locale keys, asset names, collections, presets and update folders. It needs no running app and changes nothing. Add `--strict` to fail on warnings too, or `--json` for machine-readable output.

A clean run is a static check only. It doesn't render, open the editor or export, so still try the theme in the editor, preview it, and inspect an export.

# Where to Go Next

- [Theme Structure](theme-dev-structure.html): the full folder layout and what's required
- [Setting Types](theme-dev-setting-types.html): every field type for settings
- [Liquid Tags & Filters](theme-dev-liquid-assets.html): media, assets, SEO, and the filter reference
- [Widgets & Blocks](theme-dev-widgets-blocks.html): repeatable blocks, multiple block types, editor events
- [Collections](theme-dev-collections.html): theme-defined content types with their own pages
- [Localization](theme-dev-localization.html): visitor-facing words in every language a site publishes
- [Theme Contract](theme-dev-contract.html): the required files, placeholders, and attributes on one page
- [Distributing & Updating Themes](theme-dev-distribution.html): versioned updates and presets
