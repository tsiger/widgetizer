# Packages & Adapter Architecture

This document is the home for the workspace/package layout, the adapter contracts, the dependency-injection assembly, and the editor-ui library seams introduced by the workspaces refactor. Other `core-*` docs cross-reference this file rather than duplicating adapter detail.

The repo is an npm workspace (`"workspaces": ["packages/*"]` in the root `package.json`). The OSS app and the Electron app are thin **shells** that wire concrete adapters into a runner-agnostic backend and a mountable React editor. The hosted product reuses the same packages and swaps in its own cloud adapters.

---

## The five packages

| Package | Role | Key exports | Depends on |
| --- | --- | --- | --- |
| `@widgetizer/core` | Shared FE/BE primitives: Liquid tags/filters/snippets, fonts config, 3 core widgets, browser helpers, **plus the adapter contracts, error types, `LIMIT_KEYS`, and runner-agnostic conformance suites** | `adapters.js`, `errors.js`, `test-helpers/*`, Liquid tags/filters, `config/fonts.json` | `liquidjs ^10.26.0` |
| `@widgetizer/render-engine` | Scope-free LiquidJS rendering — functions take a per-project `deps` bag; never resolves projects or touches SQLite, and reads templates/schemas from paths supplied by `deps` | `renderWidget`, `renderPageLayout`, `renderEnqueuedAssetTags`, `widgetSupportsTransparentHeader` | `@widgetizer/core`, `liquidjs` |
| `@widgetizer/builder-server` | Express 5 backend: routes/controllers/services/SQLite db layer | `setupBuilderServer`, `createEditorApp`, `initDb` | `@widgetizer/core`, `@widgetizer/render-engine` (**not** `@widgetizer/adapters-local`) |
| `@widgetizer/editor-ui` | Mountable React editor library | Root exports: extension API plus `EditorShell`, `EditorProvider`, `createEditorRoutes`; host-facing stores/hooks/queries/API clients are exposed through explicit subpath exports | `@widgetizer/core`; peers: `react`/`react-dom` >=19, `react-router-dom` >=7 |
| `@widgetizer/adapters-local` | OSS (local FS + SQLite) implementations of the adapter contracts | `LocalScopeResolver`, `LocalPreviewScopeResolver`, `LocalStorageAdapter`, `LocalAssetStorageAdapter`, `LocalPublishAdapter`, `LocalLimitsAdapter` | `@widgetizer/core` |

### Shell directories (not packages)

- `app/` — OSS frontend + server assembly. `app/server-common.js` exports `buildOssApp()` / `startOssServer()`: it constructs the six local adapters and calls `createEditorApp({ adapters })`. `app/src/main.jsx` is the FE entry; `app/src/App.jsx` composes routes via `createEditorRoutes`.
- `electron/` — Electron shell. `electron/main.js` forks `electron/server-bootstrap.js`, which calls `startOssServer`.
- `server.js` (repo root) — web entry; calls `startOssServer`.
- `src/` — a handful of residual pre-refactor runtime assets that legitimately still live here: `src/utils/previewRuntime.js`, `src/utils/standalonePreviewTarget.js` (+ its `__tests__/standalonePreviewTarget.test.js`), and `src/core/assets/placeholder.svg`.

---

## The OSS/hosted boundary

The most important architectural invariant of the refactor:

- **`@widgetizer/adapters-local` is consumed ONLY by the OSS shells (`app/`, `electron/`), never by `@widgetizer/builder-server`.** builder-server is adapter-agnostic: it receives adapters via dependency injection and never imports a concrete implementation.
- This protects the OSS/hosted boundary. The hosted product mounts the same builder-server routers but injects its own **cloud adapters** (cloud storage, asset CDN, publish pipeline, finite limits, multi-tenant scope resolution).
- The shells own the adapter wiring; the backend owns the behavior. Swapping local FS/SQLite for cloud infrastructure is a wiring change in the shell, not a fork of the server.

---

## Adapter contracts

Defined as JSDoc typedefs in `packages/core/src/adapters.js`. Every storage/asset method takes `scope` as its first argument (enforced by lint — see below).

| Contract | Methods |
| --- | --- |
| `ScopeResolver` | `resolveActor(req)`, `resolveScope(req)` |
| `StorageAdapter` | `read`, `write`, `delete`, `list`, `exists`, `stat` — all `(scope, relativePath, …)` |
| `AssetStorageAdapter` | `upload`, `download(scope, key, range?)`, `stat`, `delete`, `list`, `getUrl` — all `(scope, key, …)`. `download` accepts an optional inclusive `{ start, end }` byte range (powers HTTP 206 media seeking); `stat` returns `{ size }` for `Content-Length` / `Content-Range`; `getUrl` takes `{ context: 'editor' \| 'published' }` |
| `PublishAdapter` | `publish(scope, renderStream, options)` |
| `LimitsAdapter` | `getLimit(scope, key)` |

A separate **`previewScopeResolver`** adapter key is also required as a reserved seam. Current preview API routes use the normal `scopeResolver` through `resolveActiveProject`, and `GET /render/:token` dereferences only the preview token store; hosts can wire a distinct preview resolver without changing the required adapter shape.

### The `Scope` shape

```js
Scope = {
  actor: { id, kind: 'local' | 'cloud' },
  projectId,    // UUID — used for DB lookups + authz
  folderName    // fs-friendly id — used to build paths
}

LOCAL_ACTOR = { id: 'default', kind: 'local' }
```

The dual `projectId` (UUID, authz) / `folderName` (path-safe) split matches the existing project-identity model — see [Project Identity](core-project-id-architecture.md).

### Limit keys & constants

`LIMIT_KEYS` (the keys passed to `getLimit`): `MAX_UPLOAD_SIZE_BYTES`, `MAX_PAGES_PER_PROJECT`, `MAX_PROJECTS_PER_USER`, `MAX_MEDIA_BYTES`, `CUSTOM_DOMAIN_ALLOWED`, `ANALYTICS_TIER`, `FORM_SUBMISSIONS_PER_MONTH`, `MAX_WIDGETS_PER_PAGE`, `MAX_MENU_ITEMS`, `MAX_COLLECTION_ITEMS`, `MAX_COLLECTIONS`.

Exported constants: `MAX_WIDGETS_PER_PAGE = 5000`, `MAX_MENU_ITEMS = 1000`, `MAX_MENU_DEPTH = 32` (`MAX_MENU_DEPTH` is a hard structural cap, not a per-tenant limit key).

`MAX_COLLECTION_ITEMS` (per-collection item count) and `MAX_COLLECTIONS` (collection-type count per project) guard the collection write path and the export-time per-collection enumeration against unbounded growth.

OSS's `LocalLimitsAdapter` returns the App Settings upload cap for `MAX_UPLOAD_SIZE_BYTES` and `Infinity` for the count/quota DoS keys so OSS stays otherwise unbounded/byte-neutral; the hosted `CloudLimitsAdapter` returns finite tenant ceilings. See [Platform Security](core-security.md) for how these enforce cross-tenant safety.

### Error types (`packages/core/src/errors.js`)

`WidgetizerError` is the base. Subclasses carry HTTP status codes consumed by the builder-server `errorHandler`:

| Error | Status |
| --- | --- |
| `AuthenticationError` | 401 |
| `AuthorizationError` | 403 |
| `LimitExceededError` | 402 |
| `NotFoundError` | 404 |
| `ConflictError` | 409 |
| `UpstreamError` | 503 |

### Conformance suites

`packages/core/test-helpers/` ships runner-agnostic conformance suites — `storageConformance.js`, `assetStorageConformance.js`, `publishConformance.js`, `limitsConformance.js`, `scopeResolverConformance.js`. Any adapter implementation (local or cloud) runs the matching suite to prove it satisfies the contract. The `adapters-local` tests invoke them against the local adapters.

---

## Dependency injection

### `setupBuilderServer({ adapters, plugins })`

Returns three Express routers:

```js
const { actorScopedRouter, projectScopedRouter, previewRouter } = setupBuilderServer({ adapters, plugins });
```

**Required adapter keys:** `scopeResolver`, `previewScopeResolver`, `storage`, `assetStorage`, `publish`, `limits`.

| Router | Mounts |
| --- | --- |
| `actorScopedRouter` | `/projects`, `/themes`, `/settings`, `/core` |
| `projectScopedRouter` | `/pages`, `/menus`, `/media`, `/preview`, `/export`, `/widgets`, `/icons`, `/collections` |
| `previewRouter` | `GET /render/:token` |

`req.adapters` is attached **per-router** (not app-wide), so each router is self-sufficient wherever it is mounted.

### `createEditorApp({ adapters, plugins })`

Wires both scoped routers under `/api` and the `previewRouter` at `/`, plus helmet, cors, per-route JSON body limits, static UI serving, and the error handler. This is what the OSS shell calls.

**OSS vs hosted mounting:** OSS mounts the actor and project routers both under `/api`. Hosted mounts the project router under `/api/projects/:projectId` (the project id is in the URL for the multi-tenant host).

### `initDb({ getConnection })`

Injects the SQLite connection factory. Throws if a different connection has already been opened, so a single shared connection is guaranteed across the process.

### `resolveActiveProject` middleware + the write-guard

Lives in builder-server. It delegates to `req.adapters.scopeResolver.resolveScope(req)`, then sets:

- `req.scope` — the resolved `{ actor, projectId, folderName }`
- `req.activeProject` — the loaded project row

**Write-guard:** on `POST`/`PUT`/`PATCH`/`DELETE`, a mismatching `X-Project-Id` header **or** `:projectId` param vs `scope.projectId` returns `409 PROJECT_MISMATCH`. This is the cross-project-write safety boundary; controllers read `req.scope`/`req.activeProject` instead of resolving projects themselves.

---

## The editor-ui library seams

`@widgetizer/editor-ui` is a mountable library: the same editor runs in the OSS SPA and embedded in the hosted app. Three seams keep it host-agnostic.

### API base & fetch

- `lib/apiBase.js` — module singleton `_apiBase` (default `/api`), with `setApiBase` / `getApiBase`.
- `lib/apiFetch.js` — `editorFetch(path, opts)` calls `apiFetch(getApiBase() + path)` and injects the `X-Project-Id` header. Query managers pass project-relative paths; the base is resolved at call time.

### Route base

- `lib/routeBase.jsx` — `RouteBaseProvider` + `useEditorPath()` (React context) builds hrefs from a configurable base: `""` in OSS, `/sites/:siteId/edit` in hosted. Internal links go through `useEditorPath()` so they resolve correctly under either host.

### Provider / shell / routes

- `EditorProvider({ apiBase, previewRenderBase, standalonePreviewPath, standaloneCollectionPreviewPath, routeBase, project, scope, plugins, slots })` — binds the singletons, seeds the project store, composes `[builtinNavPlugin, ...plugins]`, and wraps children in `PluginProvider` + `RouteBaseProvider`.
- `EditorShell` — adds the editor's own `Layout` on top of `EditorProvider`.
- `createEditorRoutes({ … })` — returns a react-router route object. `EditorShell` deliberately owns **no** router, so the host supplies a single data-router context (needed for `useBlocker`).

### Extension system (`packages/editor-ui/src/extension/`)

- `buildRegistry(plugins)` — merges declarative `navItems` / `routes` / `commands` from all plugins.
- `createHookRunner(plugins)` — runs the lifecycle `HOOK_EVENTS` defined in `packages/editor-ui/src/extension/hooks.js` (`before*` run sequentially and halt on the first `{ proceed: false }`; `after*` are fire-and-forget).
- `SLOT_NAMES`: `sidebarHeader`, `sidebarFooter`, `topbarLeft`, `topbarRight`, `topbarBanner`, `overlay`, `publishConfirmation`.
- `builtinNavPlugin` — supplies the default nav with `NAV_GROUPS` `site` and `tools`.

### Tailwind v4 preset

Exported as `@widgetizer/editor-ui/tailwind-preset` → `packages/editor-ui/src/styles/preset.css` (the package.json export maps `./tailwind-preset` → `./src/styles/preset.css`; CSS-first). A consumer does `@import "tailwindcss"` then `@import "@widgetizer/editor-ui/tailwind-preset"`. The preset uses `@source ".."` so it scans across the workspace symlink.

---

## Render-engine Scope-Free Boundary

`@widgetizer/render-engine` never resolves projects or touches SQLite. Its functions take a `RenderDeps` bag that supplies both capabilities and filesystem roots; the engine reads templates, schemas, snippets, menus, and icons from those supplied paths rather than importing builder-server services or concrete storage adapters. The bag has these keys:

`projectId`, `projectDir` (absolute), `coreWidgetsDir`, `coreSnippetsDir`, `getProjectData()`, `getMediaFiles()`, `listPages()`, `sanitizeWidgetData()`, `preprocessThemeSettings()`, `buildRuntimeSiteIcons()`.

builder-server's `services/renderingService.js` is a **thin wrapper**: `buildRenderDeps(projectId)` resolves `folderName` (the project-resolution error boundary lives here), assembles the bag, and preserves the historical `(projectId, …)` call signatures so existing controllers are unchanged. Hosted assembles its own (cloud) deps bag and reuses the shared helpers re-exported from builder-server's index.

---

## The `require-scope-arg` lint rule

Custom ESLint rule `local/require-scope-arg` (`eslint-rules/require-scope-arg.js`) errors when a `storage.*` / `assetStorage.*` adapter call's first argument is not the `scope` identifier. It matches both direct calls (`storage.read(scope, …)`) and namespaced calls (`req.adapters.storage.read(scope, …)`). Wired at **error** level for builder-server, adapters-local, and the OSS shell so adapter calls cannot silently lose tenant scoping.

---

**See also:**

- [App Architecture](core-architecture.md) — how the packages assemble into the running app
- [Platform Security](core-security.md) — the cross-tenant-safety contract these adapters uphold
- `packages/editor-ui/src/extension/hooks.js` — the lifecycle hook events the extension system runs
- [Electron App](core-electron.md) — how the workspace packages get bundled into the asar
- [Project Identity](core-project-id-architecture.md) — the `projectId` (UUID) vs `folderName` split mirrored in `Scope`
