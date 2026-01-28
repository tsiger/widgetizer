---
description: Learn the folder structure for Widgetizer themes. Required files, directory layout, and how themes are discovered by the system.
---

A theme in Widgetizer is a complete package with a predictable folder structure. This page documents the default theme layout, the minimum required files, and how the system discovers theme content. Theme authoring is meant to be as expressive as it can be — you can build minimal themes or highly opinionated systems.

# Technologies Used in Themes

Themes are built with familiar web technologies:

- **HTML** for overall document structure (in `layout.liquid`)
- **LiquidJS** for templating, data access, and reusable snippets (see [Liquid Tags & Assets](theme-dev-liquid-assets.html))
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

The main HTML wrapper for every page. This is where global assets are loaded and where page content is inserted. See [Layout & Templates](theme-dev-layout-templates.html) and [Liquid Tags & Assets](theme-dev-liquid-assets.html) for required placeholders and asset loading.

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

# What Widgetizer Loads

When a theme is selected for a project, the system loads:

- `theme.json` for metadata and global settings
- `layout.liquid` for the layout wrapper
- `templates/*.json` for page structures
- `widgets/**/schema.json` and `widgets/**/widget.liquid` for widget definitions
- `assets/` for theme-level assets
- `menus/` for navigation menus
- `snippets/` for reusable Liquid partials

# Arch Theme Example

The default theme lives in `themes/arch/` and includes all required components plus a full widget set. It’s a helpful example, but not a required blueprint — you can diverge in structure, naming, and organization as long as the core contract is met.

### Key Arch Files

- `themes/arch/theme.json`
- `themes/arch/layout.liquid`
- `themes/arch/templates/index.json`
- `themes/arch/widgets/`
- `themes/arch/assets/base.css`
- `themes/arch/menus/main-menu.json`
- `themes/arch/snippets/icon.liquid`

# Theme Copying in Projects

When a new project is created, the selected theme is copied into the project’s data directory so it can be customized per project without modifying the original theme:

- Destination: `data/projects/<folderName>/`
- Copied items: `layout.liquid`, `templates/`, `widgets/`, `assets/`, and `menus/`

This ensures each project has its own theme files and can evolve independently.


# Publishing Theme Updates

Widgetizer supports a versioned update system that lets you distribute improvements to users of your theme.

### Update Folder Structure

Theme updates use a **partial update** (delta) approach. Each version folder in `updates/` contains only the files that changed:

```
themes/my-theme/
├── theme.json              # Base version (e.g., 1.0.0)
├── layout.liquid
├── widgets/
├── updates/
│   ├── 1.1.0/
│   │   ├── theme.json      # Required, version must be "1.1.0"
│   │   └── widgets/
│   │       └── new-widget/ # Only new/changed widgets
│   └── 1.2.0/
│       ├── theme.json      # Required, version must be "1.2.0"
│       └── assets/
│           └── base.css    # Only changed assets
└── latest/                 # Auto-generated snapshot
```

### Creating an Update

1. Create a version folder (e.g., `updates/1.1.0/`)
2. Add a `theme.json` with the matching version number
3. Add only the files that changed (new widgets, updated CSS, etc.)
4. Go to the Themes page in Widgetizer and click "Update" on your theme
5. The system builds the `latest/` snapshot by layering all versions

### The `latest/` Folder

The `latest/` folder is automatically generated—**do not edit it manually**. It's built by:

1. Starting from the base theme files (root level)
2. Applying each version folder in semver order
3. For overlapping files, the latest version wins

Projects read from `latest/` when it exists, ensuring they always get the most up-to-date theme.

### Version Validation

The system enforces:

- Every version folder must contain a `theme.json`
- The version in `theme.json` must match the folder name
- Versions must be valid semver format (x.y.z)

If validation fails, the build is aborted with an error message.

### Distributing Updates

To distribute your theme with updates:

1. Zip the entire theme folder (including `updates/`)
2. Share the zip file with users
3. When users upload the zip, new versions are imported automatically
4. The `latest/` folder in the zip is ignored—it's always rebuilt locally

### What Gets Updated in Projects

When users apply your theme update to their projects:

| Path | Behavior |
|------|----------|
| `layout.liquid` | Replaced |
| `widgets/` | Replaced |
| `assets/` | Replaced |
| `snippets/` | Replaced |
| `theme.json` | Settings merged (user values preserved) |
| `menus/` | New menus added, existing preserved |
| `templates/` | New templates added, existing preserved |

User content (`pages/`, `uploads/`) is never modified.
