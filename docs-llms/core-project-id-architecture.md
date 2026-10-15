# Project ID and FolderName Architecture

## Overview

Widgetizer uses a dual-identifier system for projects:

- **Project ID** — a stable UUID that never changes.
- **Project FolderName** — a mutable, filesystem-friendly identifier used for directory names.

This decouples a project's identity from its filesystem representation, so users can rename projects without breaking API references or running migrations.

The identity model is the foundation for the **scope-first** backend: every storage/asset/limits call carries a `scope` (`{ actor, projectId, folderName }`) that pairs the stable UUID with the current folderName. The `Scope` shape, the adapter contracts, and `LIMIT_KEYS` are owned by [core-packages.md](core-packages.md) — this doc covers only how UUID and folderName relate and where each is used.

## Core Principles

### 1. Stable identity (Project ID)

- Generated once with `randomUUID()` during project creation (`packages/builder-server/src/controllers/projectController.js`).
- Never changes for the project's lifetime.
- Used for:
  - API routes (`/api/projects/:projectId`)
  - Host/embedded frontend routing when the host mounts `createEditorRoutes` at a project-id path (e.g. `/projects/:projectId/editor`); the OSS app instead uses active-project routes like `/pages` and `/page-editor`
  - SQLite metadata (the `projects` table and all cross-references)
  - The `projectId` field of every `scope`

### 2. Mutable filesystem path (Project FolderName)

- Derived from the project name at creation via the shared slug helpers (`generateUniqueSlug()` / `sanitizeSlug()` in `packages/builder-server/src/utils/slugHelpers.js`).
- Independent of the title afterwards: renaming the project never moves it. It changes only when an update sends a new `folderName` (the form's folder name field is currently hidden, see [core-projects.md](core-projects.md)).
- Stored as `project.folderName` in the SQLite `projects` table.
- Used for directory names (`data/projects/{folderName}/`) and the `folderName` field of every `scope`.

## How handlers get identity: scope, not resolution

Route handlers get identity from `req.scope`; adapter-backed handlers do not resolve UUIDs to folderNames or build absolute paths themselves. Instead:

1. The `resolveActiveProject` middleware (`packages/builder-server/src/middleware/resolveActiveProject.js`) delegates to the injected `req.adapters.scopeResolver` to produce a `scope`. In OSS this is the local resolver (singleton active project); hosted swaps in its own.
2. The middleware attaches `req.scope` (the resolved `{ actor, projectId, folderName }`) and `req.activeProject` (the full project row, for handlers that still read it).
3. It also enforces the HTTP-layer write-guard: writes whose `x-project-id` header or `:projectId` route param disagree with the resolved scope are rejected with `409 PROJECT_MISMATCH`.

Handlers then pass `req.scope` straight to the injected adapters:

```javascript
// mediaController.uploadProjectMedia — no path building, no folderName lookup
const scope = req.scope;
const assetStorage = req.adapters.assetStorage;
const keys = await assetStorage.list(scope, `${subdir}/`);

// pageController — limit checks read through the limits adapter
const widgetCap = await req.adapters?.limits?.getLimit?.(req.scope, LIMIT_KEYS.MAX_WIDGETS_PER_PAGE);
```

The adapter owns the mapping from `scope.folderName` (and `scope.projectId`) to physical storage. The controller never builds an absolute path from user input. See [core-packages.md](core-packages.md) for the adapter contracts and DI seam, and [core-security.md](core-security.md) for the cross-tenant write-guard / resolver authz floor.

## Still-path-based exceptions

A project's data lives in **three planes**, and one boundary principle governs access to each:

- **Metadata** → the shared **SQLite** DB (projects, media rows, settings, exports). Adapter-agnostic.
- **Content files** (pages, menus, `theme.json`, collection items, theme templates) → the project
  **working directory** at the scope's project base. Two access disciplines over the *same* directory:
  - **Request/API boundary → the scope-aware `StorageAdapter`** (`storage.op(scope, rel)`): scope
    namespacing + `assertWithin` + atomic write. The default for per-key, tenant-isolated access
    (collection CRUD, theme CRUD, `getAllPages`).
  - **Whole-directory, FS-bound operations → the `projectDir` working directory** (raw `fs` over
    `getProjectDir(folderName)` via dir-explicit helpers): the deliberately scope-free render engine (it
    opens `layout.liquid` / `widget.liquid` / snippets / `schema.json` / menus / icons from
    `deps.projectDir`), the render-path content readers (`utils/projectContentFs.js`), and the project
    lifecycle dir ops.
- **Media binaries** → the **asset plane** — the scope-first `AssetStorageAdapter`. In OSS they physically
  live under `getProjectDir(folderName)/uploads/`; in hosted they live in R2 via `CloudAssetStorageAdapter`.

**Boundary principle:** request-scoped per-key access → `StorageAdapter`; whole-directory FS-bound ops
(render + lifecycle) → `projectDir` working directory; media → `AssetStorageAdapter`; metadata → SQLite.

The former adapter-*bypass* read exceptions have been closed against this principle:

- **Project theme settings → adapter.** `getProjectThemeSettings` / `saveProjectThemeSettings` now read/write
  `storage.{read,write}(req.scope, 'theme.json')` (the old `readProjectThemeData` helper is gone).
- **Render-path page/global/theme reads → dir-explicit readers.** `pageController.listProjectPagesData` /
  `readGlobalWidgetData` were replaced by `utils/projectContentFs.js`'s `listPagesFromDir` /
  `readGlobalWidgetFromDir` / `readThemeDataFromDir(projectDir)` — pure FS transforms over a caller-supplied
  working dir, consumed by `renderingService.buildRenderDeps` + the preview/export controllers.
- **Dead `menuController.getMenuById` deleted** (no production callers).

**What remains genuinely path-based (by design):** the **project lifecycle directory ops** in
`projectController.js` — create / rename / duplicate / import — operate on whole directories by folderName
with `fs-extra` (see Renaming, below). They're inherently filesystem-shaped (bulk copy / move). **Rename is
OSS-only by design** (a hosted `folderName` is an immutable storage key).

### The working-directory contract (C1/C2)

The `projectDir`-based operations above depend on a small contract, which is what keeps them
backend-swappable rather than an OSS-only leak:

- **C1 — working-directory guarantee.** The shell resolves a real filesystem path for the scope's content
  for the *duration of an operation* (OSS: `getProjectDir(folderName)` for content, `getPublishDir()` for
  export staging; hosted: the storage adapter's per-tenant project base). Dependents are the scope-free
  render engine, the render-path content readers (`projectContentFs.js`), and the project lifecycle dir ops.
  This is a **per-operation** guarantee, **not** a permanent-home assumption: if hosted ever moves content to R2, the
  `StorageAdapter` becomes R2-backed (the API boundary is already ready) and the working-directory resolver
  returns a per-operation hydrated temp dir — the dependents don't change.
- **C2 — pure dir-explicit transforms.** The dir-explicit helpers take a caller-supplied dir and do
  pure FS work over it — no `config.getProjectDir` reach-through, no permanence assumption. Persistence /
  hydrate is the shell's job.

## Foldername resolution helper

`getProjectFolderName()` (`packages/builder-server/src/utils/projectHelpers.js`) maps an existing UUID to its folderName. It is the shared projectId → folderName resolver and the project-resolution error boundary, used wherever a controller/service needs a real folderName: `buildRenderDeps` (to build `projectDir`), media/asset paths, export bundle naming, theme updates, and the lifecycle dir ops. Authorization is the injected `ScopeResolver`'s responsibility; this helper only validates existence and performs the UUID → folderName lookup:

```javascript
export async function getProjectFolderName(projectId) {
  const folderName = repoGetFolderName(projectId);
  if (!folderName) {
    const error = new Error(`Project not found for ID ${projectId}`);
    error.code = PROJECT_ERROR_CODES.PROJECT_NOT_FOUND;
    throw error;
  }
  return folderName;
}
```

Project resolution errors are centralized in `packages/builder-server/src/utils/projectErrors.js` (`PROJECT_ERROR_CODES`, `isProjectResolutionError()`, `handleProjectResolutionError()`), so controllers return consistent 404/500 responses and services propagate failures without masking them.

## Renaming projects

Renaming is a directory move plus a metadata update — the UUID is untouched. In `projectController.updateProject()`:

1. The new folderName is validated (`/^[a-z0-9-]+$/`) and must be free both in SQLite (`projectRepo.projectFolderExists`) and on disk, so a folder a failed deletion left behind is never reused. Every other check that can refuse the request runs before anything moves.
2. `fs.copy(oldDir, newDir)` (copy + remove rather than `fs.rename`, for Windows). A failed copy attempts to remove only the copy; a cleanup failure is logged and can leave it on disk.
3. `projectRepo.updateProject()` points the row at the new `folderName`. If that write fails, the same best-effort removal of the copy runs and the old folder stays the project.
4. `fs.remove(oldDir)`. Once the row names the copy, the copy is never removed; an old folder that cannot be fully removed (a locked file) is returned as `folderLeftBehind` and the UI warns.
5. The Project ID stays the same, so API routes, frontend URLs, and metadata references keep working.

`duplicateProject()` and `importProject()` follow the same shape but generate a **new** UUID and a fresh unique folderName.

## Export naming

Exports use the folderName for human-readable bundle directories under the publish dir (`exportController.js`):

```javascript
const outputDir = path.join(getPublishDir(), `${projectFolderName}-v${version}`);
```

Bundles land at `data/publish/{folderName}-v{version}/`. The export read-back guard (`exportDirBelongsToScope`) anchors ownership to the active scope's `folderName` and the `<folderName>-v<digits>` shape, rejecting any separator or parent-segment token first. See [core-export.md](core-export.md) for the full export pipeline.

## Why this split

- **Stable references** — API routes and frontend URLs never break on rename; no reference rewrites when the slug changes.
- **Human-readable filesystem** — project directories carry meaningful names, so backups, debugging, and support stay legible.
- **No migrations on rename** — a name change is a directory move plus one metadata write.
- **Clean tenant seam** — pairing a stable `projectId` with a current `folderName` inside `scope` lets hosted reuse the same handlers with a different resolver and storage backend.

## Troubleshooting

- **"Project not found"** — confirm the UUID exists in the SQLite `projects` table and the directory exists under the resolved folderName. Resolution failures surface as 404/500 (via `projectErrors.js`), never a silent fallback.
- **Wrong directory / path errors** — for `projectDir`-based operations (render readers, lifecycle dir ops), confirm `getProjectFolderName()` resolved the expected folderName; everywhere else, the adapter owns the path, so check `req.scope.folderName`.
- **FolderName conflicts** — `generateUniqueSlug()` appends a numeric suffix to guarantee uniqueness; create, import, duplicate and rename all treat a folder name as taken if SQLite (`projectFolderExists`) or the disk has it, and rename validates the `/^[a-z0-9-]+$/` format.

## See also

- [core-projects.md](core-projects.md) — project CRUD operations
- [core-packages.md](core-packages.md) — adapter contracts, DI, `Scope`, `LIMIT_KEYS`
- [core-security.md](core-security.md) — resolver authz and the cross-tenant write-guard
- [core-export.md](core-export.md) — export pipeline and publish naming
- [core-hooks.md](core-hooks.md) — frontend project state
