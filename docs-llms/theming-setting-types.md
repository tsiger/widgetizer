# Theme & Widget Setting Types

This document outlines the available setting types that can be used in `theme.json` or in a widget's schema definition.

## Common Properties

All setting types share the following common properties:

- `id` (string, required): A unique, machine-readable identifier for the setting.
- `label` (string, required): A `tTheme:` prefixed key that references a translation in the theme's locale files (e.g., `"tTheme:carousel.settings.title.label"`). The frontend resolves this to a human-readable string at runtime. While the renderer can fall back to the `id`, it's strongly recommended to always provide a clean label.
- `description` (string, optional): A `tTheme:` prefixed key for help text displayed below the input (e.g., `"tTheme:carousel.settings.title.description"`).
- `default` (any, optional): The default value for the setting if none is provided.
- `outputAsCssVar` (boolean, optional): If set to `true`, the setting's value will be output as a CSS custom property (variable) in the page's `<head>`. This is the primary way to link theme settings to your theme's CSS.

---

## Setting Types

### Header

A visual divider to group related settings into sections. It does not store a value.

```json
{
  "id": "section_header_unique_id",
  "type": "header",
  "label": "tTheme:my_widget.settings.section_header_unique_id.label",
  "description": "tTheme:my_widget.settings.section_header_unique_id.description"
}
```

### Text

A standard single-line text input.

```json
{
  "id": "site_title",
  "type": "text",
  "label": "tTheme:global.general.settings.site_title.label",
  "default": "My Awesome Site",
  "description": "tTheme:global.general.settings.site_title.description"
}
```

### Number

A numeric input field.

**Additional Properties:**

- **`min`** (number, optional): The minimum allowed value.
- **`max`** (number, optional): The maximum allowed value.

```json
{
  "id": "max_items",
  "type": "number",
  "label": "tTheme:my_widget.settings.max_items.label",
  "default": 10,
  "min": 1,
  "max": 50
}
```

### Textarea

A multi-line text input field.

```json
{
  "id": "footer_text",
  "type": "textarea",
  "label": "tTheme:global.general.settings.footer_text.label",
  "default": "Copyright 2024",
  "description": "tTheme:global.general.settings.footer_text.description"
}
```

### Rich Text

A rich text editor with basic formatting (bold, italic, link, lists). The value is stored as HTML.

**Additional Properties:**

- **`placeholder`** (string, optional): Placeholder text shown when the editor is empty.
- **`allow_source`** (boolean, optional): If `true`, shows an HTML source toggle button for advanced editing. Defaults to `false`.

```json
{
  "id": "description",
  "type": "richtext",
  "label": "tTheme:my_widget.settings.description.label",
  "placeholder": "Enter formatted text...",
  "default": "<p>Welcome to our <strong>platform</strong>.</p>",
  "description": "tTheme:my_widget.settings.description.description"
}
```

**With HTML Source Toggle:**

```json
{
  "id": "content",
  "type": "richtext",
  "label": "tTheme:my_widget.settings.content.label",
  "allow_source": true,
  "description": "tTheme:my_widget.settings.content.description"
}
```

**Features:**

- Formatting toolbar with Bold, Italic, Link, Bullet List, and Numbered List buttons
- Link editor with URL input (auto-prefixes `https://` if missing)
- Expand button opens a larger modal for comfortable editing
- Toolbar buttons highlight based on formatting at cursor position
- Optional HTML source view for debugging or advanced editing
- Keyboard shortcuts for quick formatting:
  - Type `-` followed by space to start a bullet list
  - Type `1.` followed by space to start a numbered list
  - Press Enter on an empty list item to exit the list

**Usage in Templates:**

Output directly in Liquid templates—the value is already HTML:

```liquid
<div class="content">
  {{ widget.settings.description }}
</div>
```

**List Output Example:**

Lists are rendered as standard HTML elements:

```html
<ul>
  <li>First item</li>
  <li>Second item</li>
  <li>Third item</li>
</ul>

<ol>
  <li>First step</li>
  <li>Second step</li>
  <li>Third step</li>
</ol>
```

**When to use Rich Text vs Textarea:**

- Use `richtext` when users need basic formatting (bold, italic, links)
- Use `textarea` for plain text content without formatting needs
- Use `code` for HTML/CSS/JS that requires syntax highlighting

### Code

A code editor with syntax highlighting and line numbers. Ideal for editing CSS, JavaScript, HTML, or other code snippets.

**Additional Properties:**

- **`language`** (string, optional): The programming language for syntax highlighting. Supported values: `"css"`, `"html"`, `"javascript"` (or `"js"`). Defaults to `"html"`.
- **`rows`** (number, optional): The number of visible rows in the editor. Defaults to `10`.

```json
{
  "id": "custom_css",
  "type": "code",
  "label": "tTheme:global.advanced.settings.custom_css.label",
  "description": "tTheme:global.advanced.settings.custom_css.description",
  "language": "css",
  "rows": 12,
  "default": ""
}
```

**Example with HTML/JavaScript:**

```json
{
  "id": "custom_head_scripts",
  "type": "code",
  "label": "tTheme:global.advanced.settings.custom_head_scripts.label",
  "description": "tTheme:global.advanced.settings.custom_head_scripts.description",
  "language": "html",
  "rows": 12,
  "default": ""
}
```

**Features:**

- Line numbers displayed on the left side
- Syntax highlighting with color-coded tokens
- Monospace font for better code readability
- Scrollable editor with synchronized line number scrolling
- Shared inner padding keeps code aligned with the line-number gutter
- Minimal design that matches other form inputs

**When to use Code vs Textarea:**

- Use `code` for CSS, JavaScript, HTML, or any code that benefits from syntax highlighting
- Use `textarea` for plain text content, descriptions, or content that doesn't need code formatting

### Color

A color picker with a hex input field and a pop-over color swatch.

**Additional Properties:**

- **`allow_alpha`** (boolean, optional): If `true`, enables an alpha/opacity slider alongside the color picker. The value will include alpha (e.g., `#00000080` for 50% black). Defaults to `false`.

```json
{
  "id": "accent_color",
  "type": "color",
  "label": "tTheme:global.colors.settings.accent_color.label",
  "default": "#ec4899",
  "description": "tTheme:global.colors.settings.accent_color.description",
  "outputAsCssVar": true
}
```

**With Alpha Channel:**

```json
{
  "id": "overlay_color",
  "type": "color",
  "label": "tTheme:my_widget.settings.overlay_color.label",
  "default": "#00000080",
  "allow_alpha": true,
  "description": "tTheme:my_widget.settings.overlay_color.description"
}
```

### Checkbox

A boolean toggle switch, representing `true` or `false`.

```json
{
  "id": "show_breadcrumbs",
  "type": "checkbox",
  "label": "tTheme:global.layout.settings.show_breadcrumbs.label",
  "default": true,
  "description": "tTheme:global.layout.settings.show_breadcrumbs.description"
}
```

### Range

A slider for selecting a number within a defined range.

- **`min`** (number, optional): The minimum value. Defaults to `0`.
- **`max`** (number, optional): The maximum value. Defaults to `100`.
- **`step`** (number, optional): The increment value. Defaults to `1`.
- **`unit`** (string, optional): A unit to display next to the number input (e.g., "px", "%").

```json
{
  "id": "base_font_size",
  "type": "range",
  "label": "tTheme:global.typography.settings.base_font_size.label",
  "default": 16,
  "min": 12,
  "max": 24,
  "step": 1,
  "unit": "px",
  "description": "tTheme:global.typography.settings.base_font_size.description",
  "outputAsCssVar": true
}
```

### Select

A dropdown menu for selecting a single option from a list. The `options` array should contain objects with `label` and `value` properties.

```json
{
  "id": "font_weight",
  "type": "select",
  "label": "tTheme:my_widget.settings.font_weight.label",
  "default": "400",
  "options": [
    { "label": "tTheme:my_widget.settings.font_weight.options.300", "value": "300" },
    { "label": "tTheme:my_widget.settings.font_weight.options.400", "value": "400" },
    { "label": "tTheme:my_widget.settings.font_weight.options.700", "value": "700" }
  ]
}
```

### Radio

A set of radio buttons for selecting a single option from a list. The `options` array should contain objects with `label` and `value` properties.

```json
{
  "id": "text_align",
  "type": "radio",
  "label": "tTheme:my_widget.settings.text_align.label",
  "default": "left",
  "options": [
    { "label": "tTheme:my_widget.settings.text_align.options.left", "value": "left" },
    { "label": "tTheme:my_widget.settings.text_align.options.center", "value": "center" },
    { "label": "tTheme:my_widget.settings.text_align.options.right", "value": "right" }
  ]
}
```

### Font Picker

A specialized input with two dropdowns for selecting a font family and its corresponding weight. The value is an object containing `stack` and `weight`. **Note:** This type automatically outputs CSS variables for `-family` and `-weight` and does not require the `outputAsCssVar` flag.

```json
{
  "id": "heading_font",
  "type": "font_picker",
  "label": "tTheme:global.typography.settings.heading_font.label",
  "default": {
    "stack": "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif",
    "weight": 700
  }
}
```

**Privacy Option**: When users select Google Fonts, they can optionally enable the "Use Privacy-Friendly Font CDN" setting (checkbox type, `use_bunny_fonts`) to serve fonts via Bunny Fonts instead of Google Fonts CDN. This provides GDPR compliance without tracking or data sharing with Google, while maintaining the same font selection and appearance.

**Smart Bold Loading**: For `body_font` font pickers, when the selected weight is 400 (normal), the system automatically loads an appropriate bold weight (700, or 600, or 500 if 700 is unavailable) to prevent browser faux-bold rendering. This ensures `<strong>`, `<b>`, and bold UI elements render with proper typography. For other selected weights (500, 600, 700, etc.), only the selected weight is loaded. The auto-loaded bold weight is available via the `--typography-body_font_bold-weight` CSS variable.

### Icon

An icon picker that allows users to select from a library of available icons. The value is the icon name/identifier.

```json
{
  "id": "card_icon",
  "type": "icon",
  "label": "tTheme:my_widget.settings.card_icon.label",
  "description": "tTheme:my_widget.settings.card_icon.description"
}
```

**Usage in Templates:**

```liquid
{% if block.settings.icon != blank %}
  {% render 'icon', icon: block.settings.icon, class: 'widget-card-icon' %}
{% endif %}
```

### Image

An image uploader that includes a preview, the ability to replace the image, and a button to browse the media library. The value is the URL path to the image.

**Additional Properties:**

- **`compact`** (boolean, optional): If `true`, renders a compact square preview with Upload/Browse buttons stacked beside it. Useful for small image settings like favicons. Defaults to `false`.

**Features:**

- **Upload**: Direct file upload from the OS file picker
- **Preview**: Shows thumbnail preview with hover controls
- **Browse**: Opens `MediaSelectorDrawer` to select from existing images
- **Metadata Editing**: Edit button opens `MediaDrawer` for alt text and title editing
- **Replace**: Easy replacement of existing images
- **File Validation**: Automatic validation of image file types

> [!NOTE] All theme settings modified within the Page Editor are tracked by the unified **Undo/Redo system**. Changes can be reversed using the editor's undo controls or standard keyboard shortcuts (`Ctrl+Z`).

```json
{
  "id": "logo_image",
  "type": "image",
  "label": "tTheme:global.branding.settings.logo_image.label",
  "default": "/default-logo.png",
  "description": "tTheme:global.branding.settings.logo_image.description"
}
```

**Compact Example:**

```json
{
  "id": "favicon",
  "type": "image",
  "label": "tTheme:global.branding.settings.favicon.label",
  "compact": true,
  "description": "tTheme:global.branding.settings.favicon.description"
}
```

### YouTube

A specialized input for YouTube videos. It allows users to paste a YouTube URL or Video ID and configure embed options.

**Features:**

- **Preview**: Shows the video thumbnail and title once a valid URL/ID is entered
- **Embed Options**: Toggle common YouTube embed parameters (controls, autoplay, loop, etc.)
- **Validation**: Real-time validation of YouTube links and IDs

```json
{
  "id": "hero_youtube_video",
  "type": "youtube",
  "label": "tTheme:hero_banner.settings.hero_youtube_video.label",
  "description": "tTheme:hero_banner.settings.hero_youtube_video.description",
  "embedOptions": {
    "autoplay": false,
    "controls": true,
    "mute": false
  }
}
```

### Menu

A dropdown that is automatically populated with all available menus created in the system. The stored value is the menu's stable UUID, which ensures references remain valid even when menus are renamed.

**ID Flexibility**: The `id` field can be any valid identifier (e.g., `headerNavigation`, `footerNavigation`, `main_menu`). The system will correctly handle menu selection regardless of the ID name used.

```json
{
  "id": "headerNavigation",
  "type": "menu",
  "label": "tTheme:header.settings.headerNavigation.label",
  "description": "tTheme:header.settings.headerNavigation.description"
}
```

**With Default Menu:**

```json
{
  "id": "footerNavigation",
  "type": "menu",
  "label": "tTheme:footer.settings.footerNavigation.label",
  "description": "tTheme:footer.settings.footerNavigation.description",
  "default": "footer-menu"
}
```

The `default` value should match a menu's filename (without the `.json` extension) from the theme's `menus/` directory. When a project is created from a theme, slug-based defaults are automatically converted to the menu's UUID.

**How Menu References Work:**

Each menu has a stable `uuid` that never changes, even when the menu is renamed. This works similarly to how `pageUuid` stabilizes internal page links:

1. **Menu Creation**: Each menu is assigned a stable UUID on creation.
2. **User Selection**: When a user selects a menu from the dropdown, the menu's UUID is stored as the setting value.
3. **Rendering/Export**: The system resolves the UUID to the current menu data. If a menu was renamed, the reference still works because the UUID is unchanged.
4. **Project Cloning**: When a project is cloned, all menu UUIDs are regenerated and widget references are updated to point to the new UUIDs.
5. **Backward Compatibility**: Legacy slug-based references (e.g., `"main-menu"`) are resolved via slug fallback at render time and converted to UUIDs on first interaction in the editor.

### Link

A compound control for creating links. This is useful for buttons, banners, or any call-to-action element. It allows the user to select an internal page or specify a custom URL. The value is an object containing the link's `href`, `text`, `target`, and optionally `pageUuid`.

- **`href`** (string): The URL for the link. This can be a relative path to an internal page (e.g., `about.html`) or an absolute URL.
- **`text`** (string): The display text for the link (e.g., "Learn More").
- **`target`** (string): The link target, either `_self` to open in the same tab or `_blank` to open in a new tab.
- **`pageUuid`** (string, optional): For internal page links, stores the page's stable UUID. This ensures links remain valid even when pages are renamed—the system automatically resolves the UUID to the current page slug at render time.

**Schema Properties:**

- **`hide_text`** (boolean, optional): If `true`, hides the link text field in the editor UI. Useful for links that wrap entire cards or icons where no visible label is rendered.

**How Internal Page Links Work:**

The `pageUuid` system ensures links remain valid even when pages are renamed or deleted:

1. **Project Creation**: When a project is created from a theme, all internal page links in widget settings and menus are automatically enriched with `pageUuid`. This includes links defined in theme templates and schema defaults.

2. **User Selection**: When a user selects an internal page from the dropdown, the system stores both:
   - The `pageUuid` - the stable identifier that never changes
   - The `href` - the current slug-based filename (e.g., `services.html`)

3. **Rendering/Export**: The system resolves `pageUuid` to the current page slug. If a page was renamed, links automatically point to the new filename.

4. **Page Deletion Cleanup**: When a page is deleted, all widget link settings referencing its `pageUuid` are automatically cleaned up — the link is cleared (`href: ""`) and `pageUuid` is removed from the JSON file. This applies to page widgets, global widgets (header/footer), and menu items.

5. **Project Cloning**: When a project is cloned, all page UUIDs are regenerated, and all widget/menu `pageUuid` references are updated to point to the new UUIDs.

The UI for this setting type provides a choice between selecting from a list of existing pages or entering a custom URL, along with inputs for the link text and a toggle for the target.

```json
{
  "id": "hero_button_link",
  "type": "link",
  "label": "tTheme:hero_banner.settings.hero_button_link.label",
  "default": {
    "href": "#",
    "text": "Click Here",
    "target": "_self"
  },
  "description": "tTheme:hero_banner.settings.hero_button_link.description"
}
```

**Example stored value (internal page link):**

```json
{
  "href": "about.html",
  "text": "Learn More",
  "target": "_self",
  "pageUuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Example stored value (custom URL):**

```json
{
  "href": "https://example.com",
  "text": "Visit Site",
  "target": "_blank"
}
```

**Example schema (link without text):**

```json
{
  "id": "card_link",
  "type": "link",
  "label": "tTheme:my_widget.settings.card_link.label",
  "hide_text": true
}
```

---

**See also:**

- [Theming Guide](theming.md) - Theme structure, global settings, layout templates
- [Widget Authoring Guide](theming-widgets.md) - Complete widget development reference
