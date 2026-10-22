---
description: Configure theme.json manifest for Widgetizer themes. Define metadata, global settings, and how settings flow into CSS and Liquid.
---

The `theme.json` file is the manifest for a Widgetizer theme. It defines theme metadata and the global settings users can edit in the Theme Settings panel. This page explains the schema, grouping, and how settings flow into CSS and Liquid.

# Theme Manifest Overview

The manifest lives at the root of your theme and contains metadata and a `settings.global` schema.

### Example (Arch)

The default Arch theme uses:

- `themes/arch/theme.json`
- Groups: `general`, `colors`, `typography`, `style`, `social`, `advanced`

You can add any groups you want. Groups are just sections in the Theme Settings UI, so name them to match your design system or product goals. Example group ideas:

- `branding` (logos, site name, tagline)
- `buttons` (radius, padding, hover styles)
- `motion` (animation timing and toggles)
- `navigation` (menu variants, sticky header)
- `commerce` (currency format, pricing labels)

For group item structure and field options, see [Setting Types](theme-dev-setting-types.html).

# Required Metadata

These fields are required for a theme to be valid:

**`name`:** Human-friendly theme name shown in the UI.

**`version`:** Semantic version string for the theme (e.g., `1.0.0`). This version is used by the [theme update system](theme-dev-distribution.html) to track which version users have installed and to determine when updates are available.

**`author`:** Theme author or organization name.

# Optional Metadata

**`description`:** A short description shown in the theme picker.

**`useCoreWidgets`:** When `true` (or absent), core widgets are included alongside theme widgets. If `false`, core widgets are not exposed in the editor.

# Theme-Defined Image Sizes (Optional)

Themes can override the app-level image size configuration by defining `settings.imageSizes` in `theme.json`. This is useful when your theme needs specific dimensions (e.g. a `hero` size at 1600px for hero banners).

When present, theme image sizes **replace** the app settings entirely for projects using that theme. The App Settings UI hides the Image Sizes controls and shows a notice that sizes are managed by the theme. The `thumb` size is always generated for the media library, even if not listed.

**Example:**

```json
{
  "settings": {
    "imageSizes": {
      "thumb": { "width": 150, "enabled": true },
      "small": { "width": 480, "enabled": true },
      "medium": { "width": 1024, "enabled": true },
      "hero": { "width": 1600, "enabled": true, "quality": 90 },
      "large": { "enabled": false }
    }
  }
}
```

**Per-size properties:**

- **`width`** (number): Maximum width in pixels
- **`enabled`** (boolean): Whether to generate this size (default: `true`)
- **`quality`** (number, optional): JPEG/WebP quality 1-100; falls back to app setting if omitted

Templates can reference these sizes with the `{% image %}` tag, e.g. `{% image src: image, size: 'hero' %}`.

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

- `general` (favicon, reveal animations, date format, breadcrumbs)
- `colors` (standard and highlight color sets)
- `typography` (heading and body font pickers)
- `style` (corner style, spacing density, button shape)
- `social` (social profile URLs)
- `advanced` (Bunny Fonts toggle, custom CSS, and script injection)

# Setting Types

Theme settings use the same types as widgets. Common types include:

- `header`
- `text`
- `number`
- `textarea`
- `richtext`
- `code`
- `color`
- `checkbox`
- `range`
- `select`
- `radio`
- `font_picker`
- `image`
- `youtube`
- `file`
- `video`
- `menu`
- `link`
- `icon`

For a complete list and properties, see [Setting Types](theme-dev-setting-types.html).

# CSS Variables Output

When `outputAsCssVar: true` is set, the `{% theme_settings %}` tag outputs a CSS variable in the `<head>`. See [Liquid Tags & Filters](theme-dev-liquid-assets.html) for tag details and [Design System & Utilities](theme-dev-design-system.html) for how tokens map to CSS variables.

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

The `{% fonts %}` tag also reads every `font_picker` setting, in whichever group it sits. It loads external stylesheets only for Widgetizer's known web fonts; system font stacks intentionally produce no external request. Use the id `body_font` when you want the automatic bold-weight loading Arch uses.

# Accessing Theme Settings in Liquid

All settings are available in templates through the `theme` object using the same group and ID structure.

### Example

```liquid
{{ theme.colors.standard_bg_primary }}
{{ theme.typography.heading_font.stack }}
{% if theme.general.enable_reveal_animations %}
  <!-- Animation logic -->
{% endif %}
```

# Settings the App Reads by Id

A few settings mean something to Widgetizer itself. The app finds them **by id, in whichever group you put them**, using the saved value and then the schema default. Arch's placement is shown, but any group works:

| Setting id | Suggested type | Used by | Arch group |
| :-- | :-- | :-- | :-- |
| `favicon` | `image` | Site icons (`site_icons`) | `general` |
| `date_format` | `select` | The `format_date` filter | `general` |
| `use_bunny_fonts` | `checkbox` | `{% fonts %}`: load from Bunny Fonts instead of Google Fonts | `advanced` |
| `custom_css` | `code` with `language: "css"` | `{% custom_css %}` | `advanced` |
| `custom_head_scripts` | `code` with `language: "html"` | `{% custom_head_scripts %}` | `advanced` |
| `custom_footer_scripts` | `code` with `language: "html"` | `{% custom_footer_scripts %}` | `advanced` |

Declare each of these ids only once across `settings.global`. If the same id appears in two groups other than the one the app looks in first, the app can't tell which one you meant and ignores it; the theme checker flags duplicates.

# Advanced Settings (Custom Code)

With the three custom-code settings above, users can inject:

- Custom CSS via `{% custom_css %}`
- Custom scripts in `<head>` via `{% custom_head_scripts %}`
- Custom scripts before `</body>` via `{% custom_footer_scripts %}`

These tags must be present in `layout.liquid` for the settings to take effect. See [Layout & Templates](theme-dev-layout-templates.html) for required placeholders and tag placement.

Custom CSS and scripts are deliberate raw output surfaces. They should be presented as advanced controls and documented for trusted site administrators, not casual content editors. For the detailed output contract, see [Liquid Tags & Filters](theme-dev-liquid-assets.html#seo-fonts-and-theme-settings).

# Links, Menus and Rich Text in Theme Settings

`link`, `menu` and `richtext` settings in `theme.json` behave exactly like the same settings in a widget. A page or item picked in a site-wide setting is stored as a stable reference: it follows renames, is cleared when its target is deleted, carries over when a project is duplicated, and resolves for the page being rendered (its depth, the Clean URLs setting, and the target's language). The rich text editor's internal-link picker works there too. Read the resolved value as usual:

```liquid
{% assign cta = theme.footer.cta_link %}
{% if cta.href != blank %}
  <a href="{{ cta.href }}"{% if cta.target == '_blank' %} target="_blank" rel="noopener"{% endif %}>{{ cta.text }}</a>
{% endif %}
```

A slug link you ship as a `theme.json` default (`"href": "contact.html"`) is connected to the matching page when a project is created. See [Starter Links and Updates](theme-dev-distribution.html#starter-links-and-updates).

Theme settings are shared by every language of a site, so don't use them for words visitors read. Put those in the `site` dictionary or in a header/footer setting, which is stored per language.

# Theme Locales

A theme's `locales/` folder serves two audiences:

- **Editor labels** (keys outside `site`) name settings, widgets and options in the editor. The editor interface is English, so these live in `locales/en.json` only.
- **Visitor words** (the `site` block) are what the published site says. They resolve in the language of each rendered page and work today, in every language a site publishes. They're covered on the [Localization](theme-dev-localization.html) page.

### Editor Label Keys

Each locale file contains nested keys matching your settings structure:

```json
{
  "global": {
    "colors": {
      "name": "Colors",
      "settings": {
        "standard_bg_primary": {
          "label": "Primary Background"
        }
      }
    }
  },
  "hero": {
    "displayName": "Hero Banner",
    "settings": {
      "layout": {
        "label": "Layout"
      }
    }
  }
}
```

`global.<group>.name` titles each settings group in the editor, so include one for every group even if your labels are plain strings.

### Using Translation Keys

In `theme.json` and widget `schema.json` files, use the `tTheme:` prefix followed by a dot-notation path instead of a hardcoded string:

```json
{
  "type": "color",
  "id": "standard_bg_primary",
  "label": "tTheme:global.colors.settings.standard_bg_primary.label",
  "default": "#ffffff"
}
```

The system resolves `tTheme:global.colors.settings.standard_bg_primary.label` by looking up `global.colors.settings.standard_bg_primary.label` in `en.json`. If the key is not found, the raw key string is displayed, which makes a missing label easy to spot. Values without the `tTheme:` prefix are shown as written, so a small theme can use plain strings.

### Widget Schema Localization

Widget `displayName` and setting `label` fields support the same `tTheme:` prefix:

```json
{
  "type": "hero",
  "displayName": "tTheme:hero.displayName",
  "settings": [
    {
      "type": "select",
      "id": "layout",
      "label": "tTheme:hero.settings.layout.label",
      "options": [
        { "value": "centered", "label": "tTheme:hero.settings.layout.options.centered" }
      ]
    }
  ]
}
```

### Checking Your Locales

`npm run validate:theme -- themes/my-theme` checks that every `tTheme:` key, group name, `t` key and `defaultKey` your theme uses exists in `en.json`. For themes in the `themes/` folder, `npm run validate:theme-locales` also reports unused keys and compares each language's `site` block with English. See [Checking and Shipping Translations](theme-dev-localization.html#checking-and-shipping-translations).

Locale files are part of each project's copy of the theme. Changes reach existing projects only through a [theme update](theme-dev-distribution.html).

# Practical Guidance

### Organize by Groups

Use clear group names and include a `header` item at the top of each group for readability.

### Use CSS Variables

Prefer `outputAsCssVar` for visual settings so widgets and base styles can read values from CSS.

### Keep Defaults Sensible

Defaults should render a complete, attractive site without any configuration.
