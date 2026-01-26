The `theme.json` file is the manifest for a Widgetizer theme. It defines theme metadata and the global settings users can edit in the Theme Settings panel. This page explains the schema, grouping, and how settings flow into CSS and Liquid.

# Theme Manifest Overview

The manifest lives at the root of your theme and contains metadata and a `settings.global` schema.

### Example (Arch)

The default Arch theme uses:

- `themes/arch/theme.json`
- Groups: `layout`, `colors`, `typography`, `privacy`, `advanced`

You can add any groups you want. Groups are just sections in the Theme Settings UI, so name them to match your design system or product goals. Example group ideas:

- `branding` (logos, site name, tagline)
- `buttons` (radius, padding, hover styles)
- `motion` (animation timing and toggles)
- `navigation` (menu variants, sticky header)
- `commerce` (currency format, pricing labels)

For group item structure and field options, see [Setting Types](theme-dev-setting-types.html).

# Required Metadata

These fields are required for a theme to be valid:

**`name`** — Human-friendly theme name shown in the UI.

**`version`** — Semantic version string for the theme.

**`author`** — Theme author or organization name.

# Optional Metadata

**`description`** — A short description shown in the theme picker.

**`useCoreWidgets`** — When `true` (or absent), core widgets are included alongside theme widgets. If `false`, core widgets are not exposed in the editor.

# Global Settings Schema

Global settings are defined in `settings.global`. Each key is a group that becomes a section in the Theme Settings UI.

### Group Structure

```json
{
  "settings": {
    "global": {
      "colors": [
        {
          "type": "color",
          "id": "standard_bg_primary",
          "label": "Primary Background",
          "default": "#ffffff",
          "outputAsCssVar": true
        }
      ]
    }
  }
}
```

### Example Groups (Arch)

Arch defines:

- `layout` (animations)
- `colors` (standard and highlight color sets)
- `typography` (heading and body font pickers)
- `privacy` (Bunny Fonts toggle)
- `advanced` (custom CSS and script injection)

# Setting Types

Theme settings use the same types as widgets. Common types include:

- `header`
- `text`
- `textarea`
- `code`
- `color`
- `checkbox`
- `range`
- `select`
- `radio`
- `font_picker`
- `image`
- `video`
- `audio`
- `youtube`
- `menu`
- `link`
- `icon`

For a complete list and properties, see [Setting Types](theme-dev-setting-types.html).

# CSS Variables Output

When `outputAsCssVar: true` is set, the `{% theme_settings %}` tag outputs a CSS variable in the `<head>`. See [Liquid Tags & Assets](theme-dev-liquid-assets.html) for tag details and [Design System & Utilities](theme-dev-design-system.html) for how tokens map to CSS variables.

### Naming Convention

Variables are generated as:

```
--{group}-{settingId}
```

Example:

```
--colors-standard_bg_primary
```

### Font Picker Special Case

`font_picker` always generates CSS variables (no `outputAsCssVar` needed). It produces:

```
--{group}-{settingId}-family
--{group}-{settingId}-weight
```

For body fonts, a `--{group}-body_font_bold-weight` variable is also generated to avoid faux bold rendering.

# Accessing Theme Settings in Liquid

All settings are available in templates through the `theme` object using the same group and ID structure.

### Example

```liquid
{{ theme.colors.standard_bg_primary }}
{{ theme.typography.heading_font.stack }}
{% if theme.layout.enable_reveal_animations %}
  <!-- Animation logic -->
{% endif %}
```

# Advanced Settings (Custom Code)

If you include the `advanced` group, users can inject:

- Custom CSS via `{% custom_css %}`
- Custom scripts in `<head>` via `{% custom_head_scripts %}`
- Custom scripts before `</body>` via `{% custom_footer_scripts %}`

These tags must be present in `layout.liquid` for the settings to take effect. See [Layout & Templates](theme-dev-layout-templates.html) for required placeholders and tag placement.

# Practical Guidance

### Organize by Groups

Use clear group names and include a `header` item at the top of each group for readability.

### Use CSS Variables

Prefer `outputAsCssVar` for visual settings so widgets and base styles can read values from CSS.

### Keep Defaults Sensible

Defaults should render a complete, attractive site without any configuration.
