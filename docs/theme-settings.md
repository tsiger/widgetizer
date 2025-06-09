# Theme & Widget Setting Types

This document outlines the available setting types that can be used in `theme.json` or in a widget's schema definition.

## Common Properties

All setting types share the following common properties:

- `id` (string, required): A unique, machine-readable identifier for the setting.
- `label` (string, required): A human-readable label displayed in the UI. While the renderer can fall back to the `id`, it's strongly recommended to always provide a clean label.
- `description` (string, optional): Help text displayed below the input to guide the user.
- `default` (any, optional): The default value for the setting if none is provided.

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

### Color

A color picker with a hex input field and a pop-over color swatch.

```json
{
  "id": "accent_color",
  "type": "color",
  "label": "Accent Color",
  "default": "#ec4899",
  "description": "The primary color for buttons and links."
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
  "description": "The default font size for body text."
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

A specialized input with two dropdowns for selecting a font family and its corresponding weight. The value is an object containing `stack` and `weight`.

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

### Image

An image uploader that includes a preview, the ability to replace the image, and a button to browse the media library. The value is the URL path to the image.

```json
{
  "id": "logo_image",
  "type": "image",
  "label": "Logo",
  "default": "/default-logo.png",
  "description": "Upload a logo for the site header."
}
```

### Menu

A dropdown that is automatically populated with all available menus created in the system. The value is the ID of the selected menu.

```json
{
  "id": "header_navigation_menu",
  "type": "menu",
  "label": "Header Navigation",
  "description": "Select the menu to display in the header."
}
```
