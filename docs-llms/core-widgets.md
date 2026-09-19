# Core Widgets

This document describes Widgetizer's Core Widgets system – a small, built-in library of universally-available widgets that ship with the editor.

Unlike theme widgets (which live inside each theme's `widgets/` folder), core widgets live in the `@widgetizer/core` package at `packages/core/src/widgets/` and are loaded for every project **unless a theme opts out**.

---

## 1. Why Core Widgets?

1. Provide a consistent baseline of essential building-blocks (spacer, divider, form, …).
2. Avoid forcing theme authors to reinvent the wheel for every theme.
3. Keep these essential definitions available independently of a project's theme files. This does not provide an automatic migration between unrelated themes.

---

## 2. Current Core Widgets

| Widget  | `type` value   | `category` | Purpose                                                                       |
| ------- | -------------- | ---------- | ----------------------------------------------------------------------------- |
| Spacer  | `core-spacer`  | Layout     | Adds vertical whitespace with separate desktop/mobile heights and visibility  |
| Divider | `core-divider` | Layout     | Renders a horizontal line with configurable color, thickness, width & padding |
| Form    | `core-form`    | Forms      | A submittable contact/lead form — documented separately, see below            |

All core widget **type** strings are prefixed with `core-` to avoid collisions with theme widgets.

`core-form` has its own dedicated reference: see [Core Form Widget](core-form-widget.md). This document covers the shared core-widgets **machinery** (file layout, schema metadata, the opt-out, and the load/render flow), which applies equally to all three.

---

## 3. File Structure

Core widgets are resolved through the `@widgetizer/core` package, not from a hard-coded source path. `CORE_WIDGETS_DIR` (`packages/builder-server/src/config.js`) resolves the package root via `require.resolve("@widgetizer/core/package.json")` and appends `src/widgets`:

```js
const CORE_PKG_DIR = path.dirname(require.resolve("@widgetizer/core/package.json"));

export const CORE_WIDGETS_DIR = process.env.CORE_WIDGETS_DIR
  ? path.resolve(process.env.CORE_WIDGETS_DIR)
  : path.join(CORE_PKG_DIR, "src", "widgets");
```

Resolving through the package's own exports works in both web/dev (the workspace symlink) and packaged Electron (bundled under `node_modules/@widgetizer/core`) without guessing an `APP_ROOT` path. `CORE_WIDGETS_DIR` is overridable via the `CORE_WIDGETS_DIR` env var, which the backend tests use to point at an isolated fixture directory.

The directory layout:

```
packages/core/src/widgets/
├── core-spacer/
│   ├── schema.json
│   ├── widget.liquid
│   └── preview.png
├── core-divider/
│   ├── schema.json
│   ├── widget.liquid
│   └── preview.png
├── core-form/
│   ├── schema.json
│   ├── widget.liquid
│   └── preview.png
└── locales/
    └── en.json
```

Each widget has its own folder containing:

- **`schema.json`**: The widget's configuration and setting definitions.
- **`widget.liquid`**: The markup and logic (Liquid) for the widget.
- **`preview.png`** (optional): A thumbnail for the widget picker. When present, the loader sets `hasPreview: true` on the returned schema (see §5).

The sibling `locales/` directory is **not** a widget — the loader skips any entry that does not start with `core-` or lacks a `schema.json`.

### Schema Properties

Core widget schemas use the same format as theme widgets, plus additional metadata:

```json
{
  "type": "core-spacer",
  "displayName": "tTheme:core_spacer.name",
  "description": "tTheme:core_spacer.description",
  "category": "tTheme:core_spacer.category",
  "isCore": true,
  "settings": [...]
}
```

- **`isCore`**: Boolean flag identifying this as a core widget (used by the editor).
- **`category`**: Grouping category for the widget picker. The shipped widgets resolve to `Layout` (`core-spacer`, `core-divider`) and `Forms` (`core-form`).
- **`hasPreview`**: Added at load time (not stored in `schema.json`) when a sibling `preview.png` exists.

**Note:** Core widgets use `tTheme:`-prefixed keys in their schemas, but those translations are owned by the shared core locale files in `packages/core/src/widgets/locales/`, not by any theme. At runtime the server merges core widget locales with the active project's copied theme locales before returning them to the editor (`themeController` merges `CORE_WIDGET_LOCALES_DIR` with the project's theme locale via `deepMerge`). See [Widget Authoring Guide](theming-widgets.md) for theme-side locale details.

**The same files carry the words a visitor reads**, under a `site` root, exactly as a theme's `locales/<lang>.json` does. `siteStringsService` merges the two the same way round — a theme's word wins over core's, key by key and language by language, and whatever a theme says nothing about falls back to core. That is what lets `core-form` read in the page's language inside a theme that ships no `locales/` directory at all. `packages/core/src/widgets/locales/el.json` carries the `site` block only: the editor half stays English.

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

The editor fetches the active project's full widget catalog (core **and** theme widgets) from a single endpoint:

1. The editor calls `GET /api/widgets` (project-scoped), passing `?language=<code>` for the language being edited. In the OSS shell this maps to the `widgets` router → `projectController.getProjectWidgets`. The editor-ui client function is `getProjectWidgets()` in `packages/editor-ui/src/queries/previewManager.js`.
2. The request is scope-resolved: `getProjectWidgets` reads `req.scope` and `req.adapters.storage`. It reads `theme.json` **through the storage adapter** (`storage.read(scope, "theme.json")`) so it resolves the correct project dir under any backend (OSS global dir or hosted per-user dir) — never a global `DATA_DIR` path. If `useCoreWidgets === false`, core widgets are skipped.
3. If core widgets are included, `getProjectWidgets` calls `getCoreWidgets()` (`packages/builder-server/src/controllers/coreWidgetsController.js`). That helper reads `CORE_WIDGETS_DIR` directly via `fs-extra` — core widgets ship with the app and are **not** scoped or routed through the storage adapter.
4. `getCoreWidgets` enumerates `CORE_WIDGETS_DIR`, keeping only directory entries that both start with `core-` and contain a `schema.json`. For each, it parses `schema.json` and sets `hasPreview: true` when a sibling `preview.png` exists. Malformed schemas are logged and skipped (returned as `null`, then filtered out).
5. Theme widget folders are then listed via the storage adapter (`widgets/<name>/schema.json`, plus the global widgets under `widgets/global/<name>/schema.json`), each probed for a `schema.json` and flagged with `hasPreview` the same way.
6. Core and theme schemas are concatenated and nulls filtered. Settings with `defaultKey` receive a language-resolved `resolvedDefault` suggestion from the merged core + theme dictionaries before the combined array is returned, as do `defaultBlocks` entries naming words through `defaultKeys` (each starting block needs its own, since one block schema cannot hold several labels). A suggestion is displayed, not copied into authored content — **unless the setting also carries a literal `default`**, which marks a value content must hold: a form field's label is its submitted name, so the resolved word is stored there and the owner edits it from there.

**Asar / read-only note:** in packaged Electron builds `CORE_WIDGETS_DIR` lives inside `app.asar` (read-only). If the directory does not exist, `getCoreWidgets` checks `isAsarPath(CORE_WIDGETS_DIR)` and returns `[]` rather than attempting `fs.ensureDir` (which would throw on the read-only archive). In normal builds the directory always exists, so this is a safety fallback.

**Standalone helpers:** `coreWidgetsController.js` also exports `getCoreWidget(widgetName)` (single schema by folder name) and `getAllCoreWidgets(req, res)` (an Express handler that returns the core list alone). These exist and are tested, but the live editor path is `GET /api/widgets` via `getProjectWidgets`, which calls `getCoreWidgets()` internally and merges in the theme widgets.

---

## 6. Rendering Flow

The renderer is `@widgetizer/render-engine`, which is scope-free and owns no `CORE_WIDGETS_DIR` constant. The shell supplies the core widgets directory in the per-project `deps` bag: `renderingService.buildRenderDeps` sets `deps.coreWidgetsDir = CORE_WIDGETS_DIR` (`packages/builder-server/src/services/renderingService.js`). The engine then reads widget templates/schemas from that supplied path.

When rendering a widget the engine checks `widget.type`:

- `type.startsWith("core-")` → template path is `path.join(deps.coreWidgetsDir, type, "widget.liquid")`, schema path `path.join(deps.coreWidgetsDir, type, "schema.json")`.
- `type === "header"` / `"footer"` → loaded from `projectDir/widgets/global/<type>/`.
- otherwise → loaded from the project's theme folder `projectDir/widgets/<type>/`.

**Note:** Core widgets cannot be overridden by themes because the `core-` prefix check runs first. If a theme needs different behavior, it should not use core widgets and instead provide its own `spacer` or `divider` widget.

Core widget **assets** (referenced by a widget's Liquid) are served separately: `previewController` resolves assets whose widget type starts with `core-` against `CORE_WIDGETS_DIR` rather than the project directory, with no project-assets fallback.

---

## 7. Adding a New Core Widget

1. Create a new folder `core-mywidget` inside `packages/core/src/widgets/`.
2. Add `schema.json` and `widget.liquid` (and optionally `preview.png`) to the folder.
3. Ensure the schema's `type` matches the folder name and uses the `core-` prefix.
4. Include `"isCore": true` and a `"category"` in the schema.
5. Add any `tTheme:`-prefixed locale keys to `packages/core/src/widgets/locales/en.json`, and any words a visitor will read under that file's `site` root, reached from the template with `| t` or from a schema with `defaultKey`. `npm run validate:theme-locales` fails on a key nothing wrote.
6. Commit – no additional registration is required.

---

The domain handbook covers [all three built-ins](domain/entities/core-widget.md) and [form ownership, identity and lifecycle](domain/entities/form.md). `core-spacer` and `core-divider` emit no words at all, so nothing localizes them; `core-form`'s visitor text comes from the `site` root described above.

**See also:**

- [Core Form Widget](core-form-widget.md) - The `core-form` widget reference
- [Packages, Adapters & Scope](core-packages.md) - Adapter contracts, DI, `Scope`, and the scope-first call shape
- [Widget Authoring Guide](theming-widgets.md) - Complete (theme) widget development reference
- [Setting Types Reference](theming-setting-types.md) - All available setting types for schemas
