# Programmatic Content Rules (Widgets)

This document defines the rules for generating page content programmatically using widgets, templates, and menus.

## File and Structure Rules

In packaged Electron builds, `themes/<theme>/...` resolves to `app.asar.unpacked/themes/<theme>/...`.

- **Page templates** live in `themes/<theme>/templates/*.json`.
- Each template must include:
  - `name` (string)
  - `slug` (string)
  - `widgets` (object keyed by widget instance id)
  - `widgetsOrder` (array matching the widget ids)
- **Global widgets** (header/footer) live in `themes/<theme>/templates/global/*.json`.
- **Menus** live in `themes/<theme>/menus/*.json` and use `items` arrays with `label`, `link`, and optional nested `items`.

## Widget Instance Rules

- A widget instance must include:
  - `type` (matches the widget folder name)
  - `settings` (object; can be empty)
  - `blocks` (object; only for widgets that support blocks)
  - `blocksOrder` (array of block ids; only when `blocks` exist)
- Block ids and widget ids must be unique within the template.
- `blocksOrder` must list every block id defined in `blocks`, in the intended render order.

## Settings and Defaults

- Settings omitted in a template are taken from the widget’s `schema.json` defaults.
- When in doubt, mirror the setting names and value shapes from the widget schema.
- Keep values consistent with expected enums (e.g., `color_scheme`, `alignment`, `size`).

## Link Rules (Critical)

- **All links that point to internal pages must use `.html` filenames.**
  - Use `index.html`, `about.html`, `services.html`, `case-studies.html`, etc.
  - Do **not** use bare slugs like `/about` or `/contact` in JSON content.
- This applies to:
  - `link` fields in menus
  - `href` inside link objects in widget settings and blocks
- External links can use full URLs (e.g., `https://example.com`).

## Examples

### Menu item
```
{
  "label": "Case Studies",
  "link": "case-studies.html",
  "items": []
}
```

### Widget button link
```
{
  "type": "button",
  "settings": {
    "link": { "text": "Contact", "href": "contact.html", "target": "_self" }
  }
}
```
