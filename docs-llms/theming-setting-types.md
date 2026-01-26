# Theme & Widget Setting Types

This document outlines the available setting types that can be used in `theme.json` or in a widget's schema definition.

## Common Properties

All setting types share the following common properties:

- `id` (string, required): A unique, machine-readable identifier for the setting.
- `label` (string, required): A human-readable label displayed in the UI. While the renderer can fall back to the `id`, it's strongly recommended to always provide a clean label.
- `description` (string, optional): Help text displayed below the input to guide the user.
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
  "label": "My Section Title",
  "description": "Optional text to describe the section."
}
```

### Text

A standard single-line text input.

```json
{
  "id": "site_title",
  "type": "text",
  "label": "Site Title",
  "default": "My Awesome Site",
  "description": "The title of your website."
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
  "label": "Max Items",
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
  "label": "Footer Text",
  "default": "Copyright 2024",
  "description": "Text that appears in the site footer."
}
```

### Code

A code editor with syntax highlighting and line numbers. Ideal for editing CSS, JavaScript, HTML, or other code snippets.

**Additional Properties:**

- **`language`** (string, optional): The programming language for syntax highlighting. Supported values: `"css"`, `"html"`, `"javascript"` (or `"js"`). Defaults to `"html"`.
- **`rows`** (number, optional): The number of visible rows in the editor. Defaults to `10`.

```json
{
  "id": "custom_css",
  "type": "code",
  "label": "Custom CSS",
  "description": "Add custom CSS that will be injected in the <head> section.",
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
  "label": "Custom Head Scripts",
  "description": "Add custom scripts (e.g., Google Analytics) that will be injected in the <head> section.",
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
  "label": "Accent Color",
  "default": "#ec4899",
  "description": "The primary color for buttons and links.",
  "outputAsCssVar": true
}
```

**With Alpha Channel:**

```json
{
  "id": "overlay_color",
  "type": "color",
  "label": "Overlay Color",
  "default": "#00000080",
  "allow_alpha": true,
  "description": "Semi-transparent overlay for background images."
}
```

### Checkbox

A boolean toggle switch, representing `true` or `false`.

```json
{
  "id": "show_breadcrumbs",
  "type": "checkbox",
  "label": "Show Breadcrumbs",
  "default": true,
  "description": "Display navigation breadcrumbs at the top of pages."
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
  "label": "Base Font Size",
  "default": 16,
  "min": 12,
  "max": 24,
  "step": 1,
  "unit": "px",
  "description": "The default font size for body text.",
  "outputAsCssVar": true
}
```

### Select

A dropdown menu for selecting a single option from a list. The `options` array should contain objects with `label` and `value` properties.

```json
{
  "id": "font_weight",
  "type": "select",
  "label": "Font Weight",
  "default": "400",
  "options": [
    { "label": "Light", "value": "300" },
    { "label": "Normal", "value": "400" },
    { "label": "Bold", "value": "700" }
  ]
}
```

### Radio

A set of radio buttons for selecting a single option from a list. The `options` array should contain objects with `label` and `value` properties.

```json
{
  "id": "text_align",
  "type": "radio",
  "label": "Text Alignment",
  "default": "left",
  "options": [
    { "label": "Left", "value": "left" },
    { "label": "Center", "value": "center" },
    { "label": "Right", "value": "right" }
  ]
}
```

### Font Picker

A specialized input with two dropdowns for selecting a font family and its corresponding weight. The value is an object containing `stack` and `weight`. **Note:** This type automatically outputs CSS variables for `-family` and `-weight` and does not require the `outputAsCssVar` flag.

```json
{
  "id": "heading_font",
  "type": "font_picker",
  "label": "Heading Font",
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
  "label": "Icon",
  "description": "Select an icon to display on the card."
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

**Features:**

- **Upload**: Direct file upload with drag-and-drop support
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
  "label": "Logo",
  "default": "/default-logo.png",
  "description": "Upload a logo for the site header."
}
```

### Video

A video uploader that includes a preview with placeholder icon, the ability to replace the video, and a button to browse the media library. The value is the URL path to the video file.

**Features:**

- **Upload**: Direct file upload with support for MP4 video format
- **Preview**: Shows video icon placeholder with filename and file size
- **Browse**: Opens `MediaSelectorDrawer` to select from existing videos
- **Metadata Editing**: Edit button opens `MediaDrawer` for alt text and title editing
- **Replace**: Easy replacement of existing videos
- **File Validation**: Automatic validation of video file types and size limits

```json
{
  "id": "hero_video",
  "type": "video",
  "label": "Hero Background Video",
  "default": "/default-video.mp4",
  "description": "Upload a background video for the hero section."
}
```

### Audio

An audio uploader for selecting or uploading sound files. The value is the URL path to the audio file.

**Features:**

- **Upload**: Direct file upload (MP3 recommended)
- **Preview**: Shows audio icon placeholder with filename and file size
- **Browse**: Opens `MediaSelectorDrawer` to select from existing audio files
- **Metadata Editing**: Edit button opens `MediaDrawer` for title and description editing

```json
{
  "id": "background_music",
  "type": "audio",
  "label": "Background Music",
  "description": "Select an audio file for the page background."
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
  "label": "Hero Video (YouTube)",
  "description": "Enter a YouTube URL or Video ID.",
  "embedOptions": {
    "autoplay": false,
    "controls": true,
    "mute": false
  }
}
```

### Menu

A dropdown that is automatically populated with all available menus created in the system. The value is the ID (filename without `.json`) of the selected menu.

**ID Flexibility**: The `id` field can be any valid identifier (e.g., `headerNavigation`, `footerNavigation`, `main_menu`). The system will correctly handle menu selection regardless of the ID name used.

```json
{
  "id": "headerNavigation",
  "type": "menu",
  "label": "Header Navigation",
  "description": "Select the menu to display in the header."
}
```

**With Default Menu:**

```json
{
  "id": "footerNavigation",
  "type": "menu",
  "label": "Footer Navigation",
  "description": "Select the menu to display in the footer",
  "default": "footer-menu"
}
```

The `default` value should match a menu's filename (without the `.json` extension) from the theme's `menus/` directory.

### Link

A compound control for creating links. This is useful for buttons, banners, or any call-to-action element. It allows the user to select an internal page or specify a custom URL. The value is an object containing the link's `href`, `text`, and `target`.

- **`href`** (string): The URL for the link. This can be a relative path to an internal page or an absolute URL.
- **`text`** (string): The display text for the link (e.g., "Learn More").
- **`target`** (string): The link target, either `_self` to open in the same tab or `_blank` to open in a new tab.

**Optional Properties:**

- **`hide_text`** (boolean, optional): If `true`, hides the link text field in the editor UI. Useful for links that wrap entire cards or icons where no visible label is rendered.

The UI for this setting type provides a choice between selecting from a list of existing pages or entering a custom URL, along with inputs for the link text and a toggle for the target.

```json
{
  "id": "hero_button_link",
  "type": "link",
  "label": "Hero Button Link",
  "default": {
    "href": "#",
    "text": "Click Here",
    "target": "_self"
  },
  "description": "The primary call-to-action link in the hero section."
}
```

**Example (link without text):**

```json
{
  "id": "card_link",
  "type": "link",
  "label": "Card Link",
  "hide_text": true
}
```

---

**See also:**

- [Theming Guide](theming.md) - Theme structure, global settings, layout templates
- [Widget Authoring Guide](theming-widgets.md) - Complete widget development reference
