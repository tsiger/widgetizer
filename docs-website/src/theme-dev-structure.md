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
├── locales/              # Translation files for i18n
│   ├── en.json
│   ├── fr.json
│   └── ...
├── presets/              # Optional preset variants (color schemes + demo content)
│   ├── default/
│   │   ├── preset.json
│   │   ├── screenshot.png
│   │   ├── menus/
│   │   └── templates/
│   └── alt-preset/
│       ├── preset.json
│       ├── screenshot.png
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

**`locales/`** (optional)

A folder containing translation JSON files for theme localization. Each file is named by language code (e.g., `en.json`, `fr.json`). When present, labels in `theme.json` and widget schemas can use translation keys instead of hardcoded strings. See [Theme Manifest & Settings](theme-dev-manifest-settings.html#theme-localization-i18n) for details.

**`presets/`** (optional)

A folder containing preset variants of the theme. Each subfolder is one preset and contains its own `preset.json` (manifest with name, description, and overridden theme settings), `screenshot.png` (preview shown during project creation), and optionally `menus/` and `templates/` to ship preset-specific demo content. Presets are picked at project creation time; see [Themes](themes.html#theme-presets) for the user flow.

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
- `locales/` for translation strings (when present)
- `presets/*/preset.json` for preset variants (when present)

# Arch Theme Example

The default theme lives in `themes/arch/` and includes all required components plus a full widget set. It’s a helpful example, but not a required blueprint; you can diverge in structure, naming, and organization as long as the core contract is met.

### Key Arch Files

- `themes/arch/theme.json`
- `themes/arch/layout.liquid`
- `themes/arch/templates/index.json`
- `themes/arch/widgets/`
- `themes/arch/assets/base.css`
- `themes/arch/menus/main-menu.json`
- `themes/arch/snippets/icon.liquid`

# Theme Copying in Projects

When a new project is created, the selected theme is copied into the project's data directory so it can be customized per project without modifying the original theme:

- Destination: `data/projects/<folderName>/`
- Copied items: every theme file (`theme.json`, `layout.liquid`, `widgets/`, `assets/`, `snippets/`, `menus/`, `locales/`, `screenshot.png`, …) **except** `updates/`, `latest/`, and `presets/`
- `templates/` are resolved separately: from the chosen preset's `templates/` folder if a preset is selected, otherwise from the theme's root `templates/`

This ensures each project has its own theme files and can evolve independently.

# Distributing & Updating Themes

Themes are shared as zip files, and Widgetizer's versioned update system lets you ship improvements to existing projects without touching user content. The `updates/` and `latest/` folders shown in the layout above are part of that system.

See [Distributing & Updating Themes](theme-dev-distribution.html) for the full workflow: packaging, the partial update folders, deleting files, the `latest/` snapshot, and what gets updated vs. protected in projects.
