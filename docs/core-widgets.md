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

| Widget  | `type` value   | Purpose                                                        |
| ------- | -------------- | -------------------------------------------------------------- |
| Spacer  | `core-spacer`  | Adds vertical whitespace that can respond to break-points      |
| Divider | `core-divider` | Renders a horizontal line with configurable colour / thickness |

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

- `type.startsWith("core-")` ➜ template is read from `/src/core/widgets/${type}/widget.liquid`.
- otherwise ➜ template is loaded from the project's theme folder.

This keeps theme overrides intact: a theme can still provide its own widget named `core-spacer` and it will shadow the core one.

---

## 7. Adding a New Core Widget

1. Create a new folder `core-mywidget` inside `src/core/widgets/`.
2. Add `schema.json` and `widget.liquid` to the folder.
3. Ensure the schema's `type` matches the folder name.
4. Commit – no additional registration is required.

---

Happy widget-building! 🎉
