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
├── core-spacer.liquid   # schema + markup + styles
└── core-divider.liquid
```

Each file **contains everything**:

```liquid
<div class="core-spacer" data-widget-id="{{ widget.id }}" data-widget-type="core-spacer">
  <!-- styles & markup here -->

  <script type="application/json" data-widget-schema>
  {
    "type": "core-spacer",
    "displayName": "Spacer",
    "isCore": true,
    "settings": [ ... ]
  }
  </script>
</div>
```

`isCore: true` is an internal flag – the editor doesn't surface it but the back-end uses it when merging widget lists.

---

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
3. If allowed, it calls `getCoreWidgets()` which: • scans `/src/core/widgets/*.liquid` • extracts each `<script data-widget-schema>` block.
4. Schemas from core widgets and theme widgets are concatenated and returned to the editor.

---

## 6. Rendering Flow

During page rendering the service checks `widget.type`:

- `type.startsWith("core-")` ➜ template is read from `/src/core/widgets/${type}.liquid`.
- otherwise ➜ template is loaded from the project's theme folder.

This keeps theme overrides intact: a theme can still provide its own widget named `core-spacer` and it will shadow the core one.

---

## 7. Adding a New Core Widget

1. Create `core-mywidget.liquid` inside `src/core/widgets/`.
2. Embed schema, markup, and scoped styles in the file.
3. Ensure the schema's `type` matches the filename.
4. Commit – no additional registration is required.

---

Happy widget-building! 🎉
