---
description: Learn the folder structure for Widgetizer themes. Required files, directory layout, and how themes are discovered by the system.
---

A theme in Widgetizer is a complete package with a predictable folder structure. This page documents the default theme layout, the minimum required files, and how the system discovers theme content. Theme authoring is meant to be as expressive as it can be; you can build minimal themes or highly opinionated systems.

# Technologies Used in Themes

Themes are built with familiar web technologies:

- **HTML** for overall document structure (in `layout.liquid`)
- **LiquidJS** for templating, data access, and reusable snippets (see [Liquid Tags & Filters](theme-dev-liquid-assets.html))
- **CSS** for base styles, tokens, and widget-level styling
- **JavaScript** for widget behavior and advanced interactions

You can combine these however you need. For example, Arch uses a utility-driven CSS layer, but your theme can use BEM, utility-first styles, or component-scoped CSS.

# Default Theme Structure

Every theme lives under `themes/{theme-name}/` and follows the same layout. The Arch theme at `themes/arch/` is a complete, production-ready example you can copy or reference, but you can organize and name things to fit your style as long as the required files are present.

### Recommended Folder Layout

```
themes/my-theme/
├── theme.json
├── layout.liquid
├── screenshot.png
├── widgets/
│   ├── my-widget/
│   │   ├── schema.json
│   │   └── widget.liquid
│   └── global/
│       ├── header/
│       │   ├── schema.json
│       │   └── widget.liquid
│       └── footer/
│           ├── schema.json
│           └── widget.liquid
├── templates/
│   ├── index.json
│   ├── about.json
│   └── global/
│       ├── header.json
│       └── footer.json
├── assets/
│   ├── base.css
│   ├── scripts.js
│   └── icons.json
├── menus/
│   └── main-menu.json
├── snippets/
│   └── icon.liquid
├── collection-types/     # Optional: theme-defined content types (CMS)
│   └── news/
│       ├── schema.json
│       └── template.liquid
├── locales/              # Editor labels + visitor-facing words
│   ├── en.json
│   ├── el.json           # visitor words only (the "site" block)
│   └── ...
├── presets/              # Optional preset variants (color schemes + demo content)
│   ├── presets.json      # registry: default preset + list of presets
│   ├── default/
│   │   ├── preset.json
│   │   ├── screenshot.png  # 1024×1024
│   │   ├── menus/
│   │   └── templates/
│   └── alt-preset/
│       ├── preset.json
│       ├── screenshot.png
│       ├── collections/  # starter collection items
│       ├── media/        # starter images + manifest.json
│       ├── menus/
│       └── templates/
├── updates/              # Version update folders (for distributing updates)
│   ├── 1.1.0/
│   │   ├── theme.json    # Required, version must match folder name
│   │   └── widgets/      # Only changed files
│   └── 1.2.0/
│       ├── theme.json
│       └── assets/
└── latest/               # Auto-built snapshot (do not edit manually)
```

# Required Files (Minimum Viable Theme)

To be recognized and functional, a theme must include these items:

**`theme.json`**

The theme manifest. It must include `name`, `version`, and `author` at minimum. See [Theme Manifest & Settings](theme-dev-manifest-settings.html) for schema details and global settings.

**`layout.liquid`**

The main HTML wrapper for every page. This is where global assets are loaded and where page content is inserted. See [Layout & Templates](theme-dev-layout-templates.html) and [Liquid Tags & Filters](theme-dev-liquid-assets.html) for required placeholders and asset loading.

**`screenshot.png`**

A 1280x720 preview image shown in the theme picker.

**`widgets/`**

A folder containing at least one widget. Each widget must have:

- `schema.json` (the widget’s settings schema)
- `widget.liquid` (the widget’s template)

See [Widgets & Blocks](theme-dev-widgets-blocks.html) for schema and rendering patterns.

**`templates/`**

A folder containing page template JSON files. At least one page template is required (for example, `index.json`). See [Layout & Templates](theme-dev-layout-templates.html) for structure and examples.

**`assets/`**

A folder for theme-wide CSS, JavaScript, and shared assets (for example, `base.css` and `scripts.js`).

Menu and snippet structures are covered in [Menus & Snippets](theme-dev-menus-snippets.html).

**`locales/`** (optional, recommended)

JSON files named by language code (`en.json`, `el.json`). Each has two halves. Keys outside `site` are editor labels that `theme.json` and widget schemas reference with `tTheme:` keys; the editor is English, so only `en.json` needs them, including a `global.<group>.name` for each settings group. The `site` block holds the words visitors read, resolved in the language of the page being rendered, so each language you support gets a file with its own `site` block. See [Localization](theme-dev-localization.html) and [Theme Manifest & Settings](theme-dev-manifest-settings.html#theme-locales).

**`presets/`** (optional)

A folder containing preset variants of the theme, listed in `presets/presets.json`. Each subfolder is one preset and contains its own `preset.json` (overridden theme settings), a square 1024×1024 `screenshot.png` (preview card shown during project creation; the theme's own screenshot is 1280×720), and optionally `menus/`, `templates/`, `collections/` and `media/` to ship preset-specific demo content. Presets are picked at project creation time; see [Themes](themes.html#theme-presets) for the user flow.

# What Widgetizer Loads

When a theme is selected for a project, the system loads:

- `theme.json` for metadata and global settings
- `layout.liquid` for the layout wrapper
- `templates/*.json` for page structures
- `widgets/**/schema.json` and `widgets/**/widget.liquid` for widget definitions
- `assets/` for theme-level assets
- `menus/` for navigation menus
- `snippets/` for reusable Liquid partials
- `collection-types/*/` for collection schemas and item-page templates (when present)
- `locales/` for editor labels and visitor-facing words (when present)
- `presets/*/preset.json` for preset variants (when present)

# Arch Theme Example

The default theme lives in `themes/arch/`. Arch is Widgetizer's bundled production theme: a real design system, widget library, preset family, and reference implementation. It is useful because it shows how a single theme can support many site types through presets, without duplicating the underlying widget and layout code.

Arch is not a required blueprint. You can build a much smaller theme, organize CSS differently, skip presets, or omit collections entirely as long as the core contract is met.

At the current version, Arch includes 57 widget folders and 31 preset folders. Treat those numbers as scale, not a requirement.

### Read Arch in This Order

If you want to understand a real theme, open these files in order:

1. `themes/arch/theme.json`: metadata, global settings, image-size rules, and theme setting groups.
2. `themes/arch/layout.liquid`: the document wrapper, global tags, content placeholders, and asset output.
3. `themes/arch/assets/base.css`: shared tokens, utility classes, color schemes, spacing, buttons, forms, and layout primitives.
4. `themes/arch/widgets/`: the widget library. Each widget has a `schema.json` for the editor and a `widget.liquid` template for rendering.
5. `themes/arch/templates/`: default page structures and global header/footer widget instances.
6. `themes/arch/presets/`: starter sites built from the same theme. A preset can override settings, templates, menus, collection items, and starter media. For your own theme, ship a preset's starter images inside the preset folder (`presets/<id>/media/` with `images/` and a `manifest.json`). Arch itself keeps its images in a theme-root `preset-media/<id>/` pool instead — same inner layout, used for themes with many media-heavy presets so the images stay out of theme updates. If you use the pool: never rename or delete a file in a later version, only add.
7. `themes/arch/collection-types/`: theme-owned CMS types such as News, Projects, Services, and development/demo types.
8. `themes/arch/snippets/` and `themes/arch/assets/icons.json`: shared Liquid helpers and icon data.
9. `themes/arch/locales/`: `en.json` holds the editor labels for theme settings and widget schemas plus the English visitor words; `el.json` holds the Greek visitor words only.

### What Arch Demonstrates

- A broad widget library with consistent schema patterns
- A shared design system in `base.css`
- Global settings that feed CSS variables and Liquid
- Full presets for different business types
- Collection types with optional item pages
- Global widgets for header and footer
- Editor labels using `tTheme:` keys, and visitor words in English and Greek with a header language switcher (see [Localization](theme-dev-localization.html))

### What Arch Is Not

Arch is not a separate theme for every preset. Brewline, Brightside, Shearline, and the other starter cards are Arch presets. They may ship different starter content, but they share the same underlying theme contract.

# Theme Copying in Projects

When a new project is created, the newest installed version of the theme (its `latest/` snapshot when there is one, otherwise the base) is copied into the project so it can be customized per project without modifying the original theme:

- Destination: the project's own folder (`data/projects/<folderName>/` in a source install)
- Copied items: every theme file (`theme.json`, `layout.liquid`, `widgets/`, `assets/`, `snippets/`, `menus/`, `locales/`, `collection-types/`, `screenshot.png`, …) **except** `updates/`, `latest/`, `presets/` and `preset-media/`
- `templates/` aren't copied as files: each template becomes a page, from the chosen preset's `templates/` when it has them, otherwise from the theme's root `templates/`. Menus follow the same rule.
- Starter images come only from the chosen preset and are added to the project's media library; the rest of a `preset-media/` pool stays behind.

This ensures each project has its own theme files and can evolve independently. Changing the installed theme later affects new projects only; existing projects change when their owner applies a [theme update](theme-dev-distribution.html).

# Distributing & Updating Themes

Themes are shared as zip files, and Widgetizer's versioned update system lets you ship improvements to existing projects without touching user content. The `updates/` and `latest/` folders shown in the layout above are part of that system.

See [Distributing & Updating Themes](theme-dev-distribution.html) for the full workflow: packaging, the partial update folders, deleting files, the `latest/` snapshot, and what gets updated vs. protected in projects.
