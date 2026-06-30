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

**`number`** — Single-line input restricted to numeric values.

```json
{
  "id": "items_per_row",
  "type": "number",
  "label": "Items Per Row",
  "default": 3
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

- **Formatting toolbar** with Bold, Italic, Link, Bullet List, and Numbered List buttons
- **Link editor** with URL input (auto-prefixes `https://` if missing)
- **Expand button** opens a larger modal for comfortable editing
- Active formatting is highlighted in the toolbar based on cursor position
- **Keyboard shortcuts**: Type `-` + space for bullet list, `1.` + space for numbered list, Enter on empty item to exit list

Optional properties:

- `placeholder` (string): Placeholder text when empty
- `allow_source` (boolean): Show an HTML source toggle for advanced editing
- `allow_headings` (boolean): Enable heading levels in the toolbar
- `allow_images` (boolean): Allow inline images (inserted from the media library)
- `min_height` (number): Minimum editor height, in pixels

```json
{
  "id": "content",
  "type": "richtext",
  "label": "Content",
  "allow_headings": true,
  "allow_images": true,
  "allow_source": true
}
```

Because autoescaping is on globally, richtext **must** be rendered with the `raw` filter — without it the HTML tags show up as visible text. And since the editor leaves markup like `<p></p>` behind even when a field looks empty, gate visibility with the `rte_blank` filter rather than `== blank`:

```liquid
{% unless widget.settings.description | rte_blank %}
  <div class="rte">{{ widget.settings.description | raw }}</div>
{% endunless %}
```

See [Autoescaping & the `raw` filter](theme-dev-liquid-assets.html#autoescaping-the-raw-filter) for the full rules and the `rte_text` / `rte_blank` helpers.

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

**`date`** — Date picker. The stored value is an ISO `YYYY-MM-DD` string. Render it with the [`format_date`](theme-dev-liquid-assets.html#liquid-filters) filter to honor the project's date format.

```json
{
  "id": "published",
  "type": "date",
  "label": "Publication Date"
}
```

```liquid
<time datetime="{{ widget.settings.published }}">{{ widget.settings.published | format_date }}</time>
```

In [collection](theme-dev-collections.html) schemas, a `date` field can be marked `usedAsDate: true` to drive date-based sorting.

# Media Types

**`image`** — Image picker with preview and media library access.

```json
{
  "id": "hero_image",
  "type": "image",
  "label": "Hero Image"
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

**`file`** — File asset selector for downloadable documents (currently PDF). The value is the storage path to the uploaded file (e.g. `/uploads/files/brochure.pdf`). Unlike the image input, this input is filename-oriented with no visual preview.

```json
{
  "id": "download_file",
  "type": "file",
  "label": "Download File"
}
```

Features:

- **Upload**: Direct file upload from the OS file picker (accepts PDF)
- **Browse**: Opens the media selector drawer filtered to file assets
- **Selected state**: Displays filename and extension badge with a clear button
- **No metadata editing**: File assets do not have alt text or title metadata

In Liquid, resolve the file path using the `filePath` context variable (set by the rendering service), which points to the correct base in both preview and publish:

```liquid
{% assign file_filename = block.settings.file | split: '/' | last %}
{% assign file_url = filePath | append: '/' | append: file_filename %}
<a href="{{ file_url }}" target="_blank" rel="noopener">Download</a>
```

The export pipeline rewrites `/uploads/files/` paths to `assets/files/` in exported HTML automatically.

**`gallery`** — Ordered set of images managed through the media library (add, remove, drag-reorder). The value is an **array of upload-path strings** (e.g. `["/uploads/images/a.jpg", "/uploads/images/b.jpg"]`); an empty gallery is `[]`. Image alt/title/caption live on the media record, not in the gallery value.

```json
{
  "id": "photos",
  "type": "gallery",
  "label": "Photos"
}
```

In Liquid, loop the array and resolve each path with the `{% image %}` tag, guarding blank entries:

```liquid
{% for src in widget.settings.photos %}
  {% if src != blank %}
    {% image src: src, size: 'large' %}
  {% endif %}
{% endfor %}
```

Render sanitization drops blank entries and any path that fails the image-path allowlist, so the stored value keeps what the editor wrote while the renderer emits only safe `/uploads/images/…` paths.

# Structured Types

**`table`** — Editable grid of repeating rows with author-defined columns. Declare the columns in the schema (in v1 every column is `text`); the stored value is an **array of row objects** keyed by each column's `id` (e.g. `[{ "label": "Basic", "price": "$10" }]`). An empty table is `[]`.

```json
{
  "id": "rates",
  "type": "table",
  "label": "Rates",
  "columns": [
    { "id": "label", "type": "text", "label": "Label" },
    { "id": "price", "type": "text", "label": "Price" }
  ]
}
```

The `columns` array is required and must be non-empty; each column `id` must match `^[a-zA-Z][a-zA-Z0-9_]*$` and cannot be a reserved name (`__proto__`, `constructor`, `prototype`).

In Liquid, loop the rows and read each cell by its column `id` (cells are autoescaped strings):

```liquid
<table>
  {% for row in widget.settings.rates %}
    <tr><td>{{ row.label }}</td><td>{{ row.price }}</td></tr>
  {% endfor %}
</table>
```

Render sanitization rebuilds each row from the declared columns only (dropping unknown keys) and removes fully-blank rows.

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

Optional properties:

- `hide_text` (boolean): When `true`, hides the link text input and only shows the URL and target fields. Useful when the link wraps an image, icon, or other element that doesn't need separate link text.

```json
{
  "id": "link",
  "type": "link",
  "label": "Link",
  "hide_text": true
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
- **Block settings** live in the widget schema's `blocks` array and are accessed via `block.settings.*`.
- **Collection fields** live in `collection-types/*/schema.json` and are accessed via `item.settings.*`. They use these same types, plus a few collection-only flags (`usedAsTitle`, `usedAsDate`, `required`) — see [Collections](theme-dev-collections.html).

See [Widgets & Blocks](theme-dev-widgets-blocks.html) for widget schema patterns, and [Liquid Tags & Filters](theme-dev-liquid-assets.html) for rendering tips.
