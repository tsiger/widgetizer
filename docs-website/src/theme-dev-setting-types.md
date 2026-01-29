---
description: Reference for all setting field types in Widgetizer themes and widgets. Text, color, image, select, range, and more.
---

Theme and widget settings share the same field types. Use these types in `theme.json` (global settings) and in widget `schema.json`. This page summarizes the core types and their most useful properties.

# Common Properties

All setting types share these properties:

- `id` (string, required): Machine-readable key used in Liquid.
- `label` (string, required): Human-readable label shown in the UI.
- `description` (string, optional): Help text below the field.
- `default` (any, optional): Default value used when no value is provided.
- `outputAsCssVar` (boolean, optional): When `true`, outputs a CSS variable via `{% theme_settings %}`.

For how settings map into templates and CSS variables, see [Theme Manifest & Settings](theme-dev-manifest-settings.html).

# Content Types

**`header`** — Visual divider to group fields. No value stored.

```json
{
  "id": "content_header",
  "type": "header",
  "label": "Content"
}
```

**`text`** — Single-line input.

```json
{
  "id": "site_title",
  "type": "text",
  "label": "Site Title",
  "default": "My Site"
}
```

**`textarea`** — Multi-line input for longer text.

```json
{
  "id": "footer_note",
  "type": "textarea",
  "label": "Footer Note"
}
```

**`richtext`** — Rich text editor with bold, italic, and link formatting. Outputs HTML.

```json
{
  "id": "description",
  "type": "richtext",
  "label": "Description",
  "placeholder": "Enter formatted text...",
  "default": "<p>Welcome to our <strong>platform</strong>.</p>"
}
```

Features:

- **Formatting toolbar** with Bold, Italic, and Link buttons
- **Link editor** with URL input (auto-prefixes `https://` if missing)
- **Expand button** opens a larger modal for comfortable editing
- Active formatting is highlighted in the toolbar based on cursor position

Optional properties:

- `placeholder` (string): Placeholder text when empty
- `allow_source` (boolean): Show HTML source toggle for advanced editing

```json
{
  "id": "content",
  "type": "richtext",
  "label": "Content",
  "allow_source": true
}
```

In Liquid templates, output directly (it's already HTML):

```liquid
{{ widget.settings.description }}
```

**`code`** — Code editor with syntax highlighting.

```json
{
  "id": "custom_css",
  "type": "code",
  "label": "Custom CSS",
  "language": "css",
  "rows": 10
}
```

# Design Types

**`color`** — Color picker with optional alpha channel (`allow_alpha: true`).

```json
{
  "id": "overlay_color",
  "type": "color",
  "label": "Overlay Color",
  "default": "#00000080",
  "allow_alpha": true,
  "outputAsCssVar": true
}
```

**`range`** — Slider for numeric values.

```json
{
  "id": "base_font_size",
  "type": "range",
  "label": "Base Font Size",
  "min": 12,
  "max": 24,
  "step": 1,
  "unit": "px",
  "outputAsCssVar": true
}
```

**`select`** / **`radio`** — Choose from a list of options.

```json
{
  "id": "text_align",
  "type": "select",
  "label": "Text Alignment",
  "options": [
    { "label": "Left", "value": "left" },
    { "label": "Center", "value": "center" },
    { "label": "Right", "value": "right" }
  ]
}
```

**`checkbox`** — Boolean toggle.

```json
{
  "id": "show_breadcrumbs",
  "type": "checkbox",
  "label": "Show Breadcrumbs",
  "default": true
}
```

# Media Types

**`image`** — Image picker with preview and media library access.

```json
{
  "id": "hero_image",
  "type": "image",
  "label": "Hero Image"
}
```

**`video`** — Video picker for MP4 format.

```json
{
  "id": "background_video",
  "type": "video",
  "label": "Background Video"
}
```

**`audio`** — Audio file picker (MP3 recommended).

```json
{
  "id": "background_music",
  "type": "audio",
  "label": "Background Music"
}
```

**`youtube`** — YouTube embed with URL/ID input and embed options.

```json
{
  "id": "hero_video",
  "type": "youtube",
  "label": "Hero Video"
}
```

# UI-Specific Types

**`font_picker`** — Font family + weight selector. This always outputs CSS variables for `-family` and `-weight`.

```json
{
  "id": "heading_font",
  "type": "font_picker",
  "label": "Heading Font",
  "default": {
    "stack": "Inter, system-ui, sans-serif",
    "weight": 700
  }
}
```

**`menu`** — Dropdown populated with theme menus.

```json
{
  "id": "header_navigation",
  "type": "menu",
  "label": "Header Navigation"
}
```

**`link`** — Structured link object with `href`, `text`, and `target`.

```json
{
  "id": "cta_link",
  "type": "link",
  "label": "CTA Link",
  "default": {
    "href": "#",
    "text": "Learn More",
    "target": "_self"
  }
}
```

**`icon`** — Icon picker tied to your theme icon set.

```json
{
  "id": "card_icon",
  "type": "icon",
  "label": "Card Icon"
}
```

# Where Settings Are Used

- **Theme settings** live in `theme.json` and render via `{% theme_settings %}`.
- **Widget settings** live in `widgets/*/schema.json` and are accessed via `widget.settings.*`.

See [Widgets & Blocks](theme-dev-widgets-blocks.html) for widget schema patterns, and [Liquid Tags & Assets](theme-dev-liquid-assets.html) for rendering tips.
