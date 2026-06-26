# App Architecture

This document is the authoritative **orientation map** for the Widgetizer codebase: it shows how the refactored npm-workspace packages and shells fit together and where each subsystem lives. It deliberately stays thin — every per-subsystem detail (endpoints, controllers, stores, hooks) lives in its dedicated `core-<x>.md` doc, linked from the index below.

> **Companion map.** The deep adapter / DI / `Scope` / `LIMIT_KEYS` detail lives in **[Packages & Adapter Architecture](core-packages.md)**. These two docs (`core-architecture.md` + `core-packages.md`) are the two maps to keep; everything else defers to a subsystem doc.

---

## Packages & Shells

The repo is an npm workspace (`"workspaces": ["packages/*"]`). Five packages plus three thin shells:

- **Packages:**
  - `@widgetizer/core` (`packages/core/src/`) — shared FE/BE primitives + adapter **contracts** + error types + conformance suites. Also the single source of truth for the server-side Liquid filters/tags (`packages/core/src/filters/`, `packages/core/src/tags/`), `pathSecurity`, `mimeTypes`, and the adapter contract surface (`packages/core/src/adapters.js`).
  - `@widgetizer/render-engine` (`packages/render-engine/src/`) — scope-free LiquidJS rendering over a `deps` bag; no project resolution or SQLite access. It reads Liquid templates, schemas, menus, and icons from filesystem paths supplied in `deps`.
  - `@widgetizer/builder-server` (`packages/builder-server/src/`) — Express 5 backend (controllers/services/routes/db/SQLite/tests); **adapter-agnostic** and scope-first.
  - `@widgetizer/editor-ui` (`packages/editor-ui/src/`) — mountable React editor (the **site-workspace** FE: page editor, media, menus, pages, collections, export, settings).
  - `@widgetizer/adapters-local` (`packages/adapters-local/src/`) — OSS local-FS + SQLite adapter implementations.
- **Shells:**
  - `app/` — OSS frontend + server assembly. `app/server-common.js` builds the local adapters and calls `createEditorApp({ adapters })` / exposes `startOssServer`. `app/src/main.jsx` is the FE entry; `app/src/App.jsx` composes routes, contributing the **admin-shell** pages (`app/src/pages/` — Projects/Themes/AppSettings/Dashboard/previews) and splicing in the site-workspace routes via editor-ui's `createEditorRoutes`.
  - `electron/` — desktop wrapper. `electron/main.js` forks `electron/server-bootstrap.js` (via `utilityProcess.fork`) → `startOssServer`. Build config lives in `electron/builder.config.mjs` (package.json has no `build` key).
  - `server.js` — repo-root web entry → `startOssServer`.
- **Residual `src/`:** a few pre-refactor runtime assets that legitimately still live at repo-root `src/`: `src/utils/previewRuntime.js` (injected into the preview iframe), `src/utils/standalonePreviewTarget.js` (standalone-preview href mapper), and `src/core/assets/placeholder.svg`.

### Where the FE/BE code actually lives

The old monolith split (root `src/` frontend + `server/` backend) is gone. The current split is:

| Concern | Home |
| ------- | ---- |
| Admin-shell FE (Projects, Themes, App Settings, previews, dashboard) | `app/src/` |
| Site-workspace FE (Page Editor, Pages, Menus, Media, Collections, Export, Settings) | `packages/editor-ui/src/` |
| Backend (controllers, services, routes, db, SQLite, tests) | `packages/builder-server/src/` |
| Shared primitives, Liquid filters/tags, `pathSecurity`, `mimeTypes`, adapter contracts | `packages/core/src/` |
| Scope-free LiquidJS rendering | `packages/render-engine/src/` |
| OSS local-FS + SQLite adapters | `packages/adapters-local/src/` |
| Residual runtime assets | repo-root `src/` |

**Key invariant:** `adapters-local` is consumed only by the OSS shells, never by `builder-server`. The backend is adapter-agnostic and receives adapters by injection; hosted swaps in cloud adapters without forking the server. Full detail in [Packages & Adapter Architecture](core-packages.md).

### DI assembly & scoped routers

`setupBuilderServer({ adapters, plugins })` (`packages/builder-server/src/setupBuilderServer.js`) returns three routers:

- `actorScopedRouter` — `/projects`, `/themes`, `/settings`, `/core`
- `projectScopedRouter` — `/pages`, `/menus`, `/media`, `/preview`, `/export`, `/widgets`, `/icons`, `/collections`
- `previewRouter` — `GET /render/:token`

`createEditorApp({ adapters, plugins })` (`packages/builder-server/src/createApp.js`) is the **single** editor app factory. It wires both scoped routers under `/api` and the preview router at `/`, plus helmet/cors/JSON-limits/error-handler. `initDb({ getConnection })` injects the SQLite connection. Required adapter keys: `scopeResolver`, `previewScopeResolver`, `storage`, `assetStorage`, `publish`, `limits`.

The `resolveActiveProject` middleware (in builder-server) delegates to `req.adapters.scopeResolver.resolveScope(req)`, sets `req.scope` (`{ actor, projectId, folderName }`) and `req.activeProject`, and enforces a write-guard: on POST/PUT/PATCH/DELETE a mismatching `X-Project-Id` header or `:projectId` param vs `scope.projectId` → `409 PROJECT_MISMATCH`. `req.adapters` is attached per-router. OSS mounts the actor + project routers both under `/api`; hosted mounts the project router under `/api/projects/:projectId`. See [Packages & Adapter Architecture](core-packages.md) for the adapter contracts, `Scope` shape, and `LIMIT_KEYS`.

---

## Routing & Shell Structure

The frontend has two shells plus a root redirect. The root composition lives in `app/src/App.jsx`; the site-workspace routes are contributed by editor-ui's `createEditorRoutes` and spliced in.

- `/` is handled by `app/src/pages/HomeRedirect.jsx`. It redirects to `/pages` when an active project exists, otherwise to `/projects`.
- The **admin shell** uses `app/src/components/layout/ProjectPickerLayout.jsx` for `/projects`, `/themes`, and `/app-settings`. It can be used without an active project.
- The **site-workspace shell** uses `packages/editor-ui/src/components/layout/Layout.jsx` for `/pages`, `/menus`, `/media`, `/settings`, `/export-site`, and the collections routes.
- All site-workspace routes are wrapped by `packages/editor-ui/src/components/layout/RequireActiveProject.jsx`. If no active project exists, the user is redirected to `/projects`. When the active project changes, that boundary keys the workspace outlet by project ID so the route subtree remounts cleanly; the OSS shell observes the same active-project change in `app/src/App.jsx` and resets project-scoped singleton stores through `app/src/lib/projectSwitchCoordinator.js`.

This admin-vs-site split is the main architectural consequence of the workspaces refactor.

| Route | Shell | Notes |
| ----- | ----- | ----- |
| `/` | none | Redirects through `HomeRedirect` |
| `/projects`, `/projects/add`, `/projects/edit/:id` | `ProjectPickerLayout` (admin, `app/src/`) | Project administration |
| `/themes`, `/app-settings` | `ProjectPickerLayout` (admin, `app/src/`) | Admin utilities |
| `/pages`, `/menus`, `/media`, `/settings`, `/export-site`, collections | `Layout` + `RequireActiveProject` (site, `packages/editor-ui/src/`) | Active-project site workspace |

`registerProjectStore(useProjectStore)` in `app/src/App.jsx` connects the active-project store to API header injection. `ProjectPickerLayout` is for choosing/managing projects, themes, and app-level settings; `Layout` is project-scoped (active project name, site sidebar, and the `AdminMenu` escape hatch back to the admin area).

---

## Subsystem Index

Each subsystem has a dedicated doc. This map records only each subsystem's package home; go to the linked doc for endpoints, controllers, stores, hooks, and data flow.

| Subsystem | Backend home | Frontend home | Detail doc |
| --------- | ------------ | ------------- | ---------- |
| Projects | `packages/builder-server/src/controllers/projectController.js`, `services/projectService.js` | `app/src/pages/` (admin shell), `app/src/components/projects/` | [core-projects.md](core-projects.md) |
| Pages | `packages/builder-server/src/controllers/pageController.js` | `packages/editor-ui/src/pages/Pages*.jsx`, `components/pages/` | [core-pages.md](core-pages.md) |
| Menus | `packages/builder-server/src/controllers/menuController.js` | `packages/editor-ui/src/pages/Menus*.jsx`, `components/menus/` | [core-menus.md](core-menus.md) |
| Media | `packages/builder-server/src/controllers/mediaController.js`, `services/mediaService.js`, `services/mediaUsageService.js` | `packages/editor-ui/src/pages/Media.jsx`, `components/media/` | [core-media.md](core-media.md) |
| Collections | `packages/builder-server/src/controllers/collectionController.js`, `services/collectionService.js`, route `routes/collections.js` | `packages/editor-ui/src/pages/CollectionItem*.jsx`, `CollectionItems.jsx`, `components/collections/` | [core-collections.md](core-collections.md) |
| Themes | `packages/builder-server/src/controllers/themeController.js`, `services/themeUpdateService.js` | `app/src/pages/Themes.jsx` (admin shell) | [core-themes.md](core-themes.md) |
| Export | `packages/builder-server/src/controllers/exportController.js`, `services/renderingService.js` | `packages/editor-ui/src/pages/ExportSite.jsx`, `components/export/` | [core-export.md](core-export.md) |
| App Settings | `packages/builder-server/src/controllers/appSettingsController.js` | `app/src/pages/AppSettings.jsx` (admin shell), `app/src/components/settings/` | [core-appSettings.md](core-appSettings.md) |
| Preview | `packages/builder-server/src/controllers/previewController.js`, `services/previewTokenStore.js`; runtime at `src/utils/previewRuntime.js` | `packages/editor-ui/src/components/preview/`, `app/src/pages/SitePreviewLayout.jsx`, `PagePreview.jsx`, `CollectionItemPagePreview.jsx` | (see [core-page-editor.md](core-page-editor.md) / [core-security.md](core-security.md)) |
| Page Editor | — | `packages/editor-ui/src/pages/PageEditor.jsx`, `components/pageEditor/`, `stores/` | [core-page-editor.md](core-page-editor.md) |
| Widgets (theme + core) | `packages/builder-server/src/controllers/projectController.js` (`/widgets`), core widget schemas under `packages/core/src/widgets/` | — | [core-widgets.md](core-widgets.md) |
| Database / repositories | `packages/builder-server/src/db/` (repositories: project, media, settings, export) | — | [core-database.md](core-database.md) |

---

## Rendering Pipeline

The actual LiquidJS rendering lives in the scope-free `@widgetizer/render-engine` package (`packages/render-engine/src/`), which takes a per-project `deps` bag and never resolves projects or touches SQLite. It reads Liquid templates, schemas, menus, and icons from filesystem paths supplied by that bag. `packages/builder-server/src/services/renderingService.js` is the thin shell wrapper: `buildRenderDeps(projectId)` resolves `folderName` (the project-resolution error boundary) and assembles the bag. In OSS the bag is assembled here; hosted assembles its own via `buildCloudRenderDeps`. The server-side Liquid filters/tags themselves live in `@widgetizer/core` (`packages/core/src/filters/`, `packages/core/src/tags/`). See [Packages & Adapter Architecture](core-packages.md#render-engine-scope-free-boundary) and [core-security.md](core-security.md) for autoescape/sanitization.

---

## Shared Utilities

### Backend (`packages/builder-server/src/`)

| File | Role |
| ---- | ---- |
| `config.js` | Roots + path helpers (`DATA_DIR`, `APP_ROOT`, theme/locale/core-widget dirs, static dist) |
| `utils/mimeTypes.js` | Thin wrapper over `@widgetizer/core/mimeTypes` (`ALLOWED_MIME_TYPES`, `getContentType()`, `getMediaCategory()`) |
| `utils/pathSecurity.js` | Thin wrapper over `@widgetizer/core/pathSecurity` (`isWithinDirectory()`) |
| `utils/semver.js` | `parseVersion()`, `compareVersions()`, `isNewerVersion()`, `sortVersions()`, `getLatestVersion()` |
| `utils/updateStatus.js` | `getUpdateStatus()`, `hasAvailableUpdate()` for theme/project update checks |
| `utils/themeHelpers.js` | `preprocessThemeSettings()` |
| `utils/projectHelpers.js` | `getProjectFolderName(projectId)`, `getProjectDetails()` |
| `utils/projectErrors.js` | `PROJECT_ERROR_CODES`, `handleProjectResolutionError()`, `isProjectResolutionError()` |

The canonical source for `mimeTypes` and `pathSecurity` is `@widgetizer/core` (`packages/core/src/utils/`), shared with the local adapters; builder-server re-exports thin wrappers.

### Shared FE hooks & stores

The site-workspace FE hooks/stores (`useAppSettings`, `useConfirmationModal`, `useFormatDate`, `useFormNavigationGuard`, `useThemeLocale`, `useToastStore`; `projectStore`, `toastStore`, `themeUpdateStore`, `iconsStore`, `themeStore`) live under `packages/editor-ui/src/hooks/` and `packages/editor-ui/src/stores/`. The canonical `themeStore` owns per-project theme settings for both the Settings page and the Page Editor save flow; `pageStore` keeps only a thin snapshot proxy for undo/redo. Project switches are coordinated from `RequireActiveProject`. See [core-hooks.md](core-hooks.md) and [core-page-editor.md](core-page-editor.md) for the per-store/per-hook tables.

---

## See Also

- [Packages & Adapter Architecture](core-packages.md) — adapters, DI, `Scope`, `LIMIT_KEYS`, render-engine scope-free boundary.
- [core-database.md](core-database.md) — SQLite schema and repositories.
- [core-security.md](core-security.md) — sanitization, autoescape, URL/image hardening, isolation contract.
- [core-electron.md](core-electron.md) — desktop wrapper, ephemeral port, auto-updates.
- [documentation-index.md](documentation-index.md) — full doc index.
