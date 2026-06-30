---
description: The Widgetizer theme contract at a glance. Required files, layout placeholders, widget wrapper attributes, and the rules every theme must follow.
---

This page is a one-stop reference for the **contract** every theme must satisfy: the files Widgetizer expects, the placeholders your layout must render, and the attributes the editor needs on your markup. Keep it open while you build. Each item links to the page with the full explanation.

# Required Files

A theme must include these to be recognized and functional:

| Path | Purpose |
| :-- | :-- |
| `theme.json` | Manifest — must define `name`, `version`, `author` |
| `layout.liquid` | The HTML wrapper for every page |
| `screenshot.png` | 1280×720 preview for the theme picker |
| `widgets/` | At least one widget (`schema.json` + `widget.liquid`) |
| `templates/` | At least one page template (e.g. `index.json`) |
| `assets/` | Theme CSS/JS (e.g. `base.css`) |

Optional but recommended: `locales/` — ship at least `en.json` (required if your schemas use `tTheme:` keys, since projects copy and expect a `locales/` directory). Also optional: `snippets/`, `menus/`, `collection-types/`, `presets/`, `updates/`. See [Theme Structure](theme-dev-structure.html).

# Required Layout Placeholders

Your `layout.liquid` must render the three content placeholders. They are **pre-rendered HTML**, so each requires `| raw` (autoescaping is global):

```liquid
{{ header | raw }}
<main id="main-content">{{ main_content | raw }}</main>
{{ footer | raw }}
```

Apply `{{ body_class }}` to the `<body>` element. See [Layout & Templates](theme-dev-layout-templates.html).

### Recommended `<head>` Tags

Not strictly required, but expected for a complete theme:

| Tag | Why |
| :-- | :-- |
| `{% seo %}` | Title, description, Open Graph, canonical |
| `{% fonts %}` | Font preconnect + stylesheet |
| `{% theme_settings %}` | CSS variables from global settings (place before `base.css`) |
| `{% header_assets %}` / `{% footer_assets %}` | Output enqueued widget assets |

# Required Widget Attributes

Every widget's root element must carry these so the editor can identify and live-update it:

```liquid
<section
  id="{{ widget.id }}"
  class="widget widget-{type} widget-{{ widget.id }}"
  data-widget-id="{{ widget.id }}"
  data-widget-type="{type}"
>
```

| Attribute | Purpose |
| :-- | :-- |
| `id="{{ widget.id }}"` | Unique id for scoped styles and JS |
| `class="widget ..."` | The base `widget` class plus your own |
| `data-widget-id` | Editor selection / live updates |
| `data-widget-type` | Must match the widget folder name |

# Required Block Attributes

When rendering blocks, each block element needs `data-block-id`. Add `data-setting` to any element whose text should update live as the user types:

```liquid
{% for blockId in widget.blocksOrder %}
  {% assign block = widget.blocks[blockId] %}
  <div data-block-id="{{ blockId }}">
    <h3 data-setting="heading">{{ block.settings.heading }}</h3>
  </div>
{% endfor %}
```

See [Widgets & Blocks](theme-dev-widgets-blocks.html).

# Naming & Output Rules

- **Widget type = folder name.** `widgets/hero/` defines the `hero` type, and `schema.json`'s `type` must match.
- **Collection type = folder name.** Same rule for `collection-types/{type}/`.
- **Unique asset filenames.** Widget `.css`/`.js` files are flattened into one `assets/` folder on export — name them uniquely (e.g. `slideshow.css`, not `styles.css`) to avoid collisions. See [Export](export.html).
- **Scope widget CSS** with `.widget-{{ widget.id }}` so styles don't leak between instances.

# The `raw` Rule

Autoescaping is on globally, so `{{ ... }}` is HTML-escaped by default. Add `| raw` only for trusted HTML:

- Layout placeholders — `{{ header | raw }}`, `{{ main_content | raw }}`, `{{ footer | raw }}`
- `richtext` settings — `{{ widget.settings.body | raw }}` (gate emptiness with `| rte_blank`)
- SVG icon markup and embed codes

See [Autoescaping & the `raw` filter](theme-dev-liquid-assets.html#autoescaping-the-raw-filter).

# Accessibility Baseline

- First widget title on a page is `<h1>`; later titles are `<h2>`, then `<h3>`. Use `widget.index` to decide.
- Provide `alt` text on images.
- Interactive controls need keyboard support and appropriate `aria-*`.

See [Advanced & Accessibility](theme-dev-advanced-accessibility.html).
