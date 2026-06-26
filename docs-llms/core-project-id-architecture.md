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

- Derived from the project name via the shared slug helpers (`generateUniqueSlug()` / `sanitizeSlug()` in `packages/builder-server/src/utils/slugHelpers.js`).
- Changes when a project is renamed.
- Stored as `project.folderName` in the SQLite `projects` table.
- Used for directory names (`data/projects/{folderName}/`) and the `folderName` field of every `scope`.

## How handlers get identity: scope, not resolution

The backend is **adapter-agnostic and scope-first**. Route handlers no longer resolve a UUID to a folderName and build absolute paths themselves. Instead:

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

Some reads have not yet moved behind the storage adapter and continue to resolve a folderName and join an absolute path through `packages/builder-server/src/config.js` helpers. These are the documented exceptions, not the pattern:

- **Project theme settings** — `themeController.readProjectThemeData()` resolves the folderName via `getProjectFolderName()` and reads `theme.json` through `getProjectThemeJsonPath(projectFolderName)`. The save path (`saveProjectThemeSettings`) does the same.
- **Some legacy page reads** — `pageController.listProjectPagesData()` / `readGlobalWidgetData()` still take a folderName argument and use `getProjectPagesDir()` / `getPagePath()` / `getProjectDir()` directly.
- **Project lifecycle directory ops** — create/rename/duplicate/import in `projectController.js` operate on directories by folderName with `fs-extra` (see Renaming, below). These are inherently filesystem-shaped and run in the OSS shell.

When these migrate behind the adapter, the folderName resolution disappears with them.

## Foldername resolution helper

`getProjectFolderName()` (`packages/builder-server/src/utils/projectHelpers.js`) maps an existing UUID to its folderName, and is used only by the still-path-based call sites above. Authorization is the injected `ScopeResolver`'s responsibility; this helper only validates existence and performs the UUID → folderName lookup:

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

1. The new folderName is validated (`/^[a-z0-9-]+$/`) and checked for uniqueness against other projects (`projectRepo.projectFolderExists`).
2. The directory is moved old → new. For Windows compatibility this is `fs.copy(oldDir, newDir)` then `fs.remove(oldDir)` (with cleanup of `newDir` if the remove fails), not `fs.rename`.
3. `projectRepo.updateProject()` writes the new `folderName` to SQLite.
4. The Project ID stays the same, so API routes, frontend URLs, and metadata references keep working.

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
- **Wrong directory / path errors** — for the still-path-based exceptions, confirm `getProjectFolderName()` resolved the expected folderName; everywhere else, the adapter owns the path, so check `req.scope.folderName`.
- **FolderName conflicts** — `generateUniqueSlug()` appends a numeric suffix to guarantee uniqueness; rename/create both validate the `/^[a-z0-9-]+$/` format and check `projectFolderExists`.

## See also

- [core-projects.md](core-projects.md) — project CRUD operations
- [core-packages.md](core-packages.md) — adapter contracts, DI, `Scope`, `LIMIT_KEYS`
- [core-security.md](core-security.md) — resolver authz and the cross-tenant write-guard
- [core-export.md](core-export.md) — export pipeline and publish naming
- [core-hooks.md](core-hooks.md) — frontend project state
