# Core Widgets

This document describes Widgetizer's Core Widgets system – a small, built-in library of universally-available widgets that ship with the editor.

Unlike theme widgets (which live inside each theme's `/widgets` folder), core widgets live in the application source at `/src/core/widgets/` and are loaded for every project **unless a theme opts-out**.

---

## 1. Why Core Widgets?

1. Provide a consistent baseline of essential building-blocks (spacer, divider, …).
2. Avoid forcing theme authors to reinvent the wheel for every theme.
3. Guarantee that a page created in one theme can still render when the user switches to another theme.

---

## 2. Current Core Widgets

| Widget  | `type` value   | Purpose                                                                       |
| ------- | -------------- | ----------------------------------------------------------------------------- |
| Spacer  | `core-spacer`  | Adds vertical whitespace with separate desktop/mobile heights and visibility  |
| Divider | `core-divider` | Renders a horizontal line with configurable color, thickness, width & padding |

All core widget **type** strings are prefixed with `core-` to avoid collisions with theme widgets.

---

## 3. File Structure

```
src/core/widgets/
├── core-spacer/
│   ├── schema.json
│   └── widget.liquid
└── core-divider/
    ├── schema.json
    └── widget.liquid
```

Each widget has its own folder containing:

- **`schema.json`**: The widget's configuration and setting definitions.
- **`widget.liquid`**: The markup and logic (Liquid) for the widget.

### Schema Properties

Core widget schemas use the same format as theme widgets, plus additional metadata:

```json
{
  "type": "core-spacer",
  "displayName": "Spacer",
  "description": "Add vertical spacing between content sections",
  "category": "Layout",
  "isCore": true,
  "settings": [...]
}
```

- **`isCore`**: Boolean flag identifying this as a core widget (used by the editor)
- **`category`**: Grouping category for the widget picker (e.g., "Layout")

## 4. Theme Opt-Out

Theme authors can disable core widgets by adding the following flag to **theme.json**:

```json
{
  "name": "My Theme",
  "useCoreWidgets": false
}
```

If the flag is **absent or `true`**, core widgets are included.

---

## 5. Loading Flow (Server-side)

1. `GET /api/projects/:id/widgets` is called from the editor.
2. The server reads **theme.json** for `useCoreWidgets`.
3. If allowed, it scans `/src/core/widgets/` for subdirectories.
4. For each subdirectory, it reads `schema.json` to load the widget definition.
5. Schemas from core widgets and theme widgets are concatenated and returned to the editor.

---

## 6. Rendering Flow

During page rendering the service checks `widget.type`:

- `type.startsWith("core-")` → template is read from `CORE_WIDGETS_DIR/${type}/widget.liquid`
- otherwise → template is loaded from the project's theme folder

**Note:** Core widgets cannot be overridden by themes because the `core-` prefix check runs first. If a theme needs different behavior, it should not use core widgets and instead provide its own `spacer` or `divider` widget.

---

## 7. Adding a New Core Widget

1. Create a new folder `core-mywidget` inside `src/core/widgets/`.
2. Add `schema.json` and `widget.liquid` to the folder.
3. Ensure the schema's `type` matches the folder name and uses the `core-` prefix.
4. Include `"isCore": true` and a `"category"` in the schema.
5. Commit – no additional registration is required.

---

**See also:**

- [Widget Authoring Guide](theming-widgets.md) - Complete widget development reference
- [Setting Types Reference](theming-setting-types.md) - All available setting types for schemas
