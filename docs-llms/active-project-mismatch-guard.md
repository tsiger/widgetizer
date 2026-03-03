# Plan: Active Project Mismatch Guard

## Context

When a user switches the active project (e.g., in another browser tab), any write operations from a page/menu editor in the original tab silently write to the **wrong project**. The backend resolves the active project from SQLite at request time via `resolveActiveProject` middleware, not from the request itself. This affects **10 write endpoints** across Pages (6) and Menus (4). Media, Export, and Themes are already safe (they use explicit `:projectId` in their URL). The `saveGlobalWidget` endpoint in the preview controller also has this issue — it calls `getActiveProjectId()` directly without middleware.

## Approach: `X-Project-Id` Header + 409 Conflict

### 1. Frontend: Send project context with every request

**File:** `src/lib/apiFetch.js`

Import `useProjectStore` and inject `X-Project-Id` header from the store's `activeProject.id` when available. This is a single chokepoint — all query managers go through `apiFetch`.

### 2. Backend: Validate project context on writes

**File:** `server/middleware/resolveActiveProject.js`

After resolving the active project, for write methods (`POST`, `PUT`, `PATCH`, `DELETE`), check if `x-project-id` header is present. If present and doesn't match the resolved active project ID → return **409** with `{ error, message, code: "PROJECT_MISMATCH" }`. Missing header is allowed (backward compat).

### 3. Backend: Same guard in `saveGlobalWidget`

**File:** `server/controllers/previewController.js` (line ~367)

`saveGlobalWidget` bypasses middleware and calls `getActiveProjectId()` directly. Add the same header check inline after resolving the project ID.

### 4. Frontend: Propagate 409 errors from query managers

**Files:** `src/queries/pageManager.js` (`savePageContent`), `src/queries/previewManager.js` (`saveGlobalWidget`)

When response is 409 with `code: "PROJECT_MISMATCH"`, throw an error with `error.code = "PROJECT_MISMATCH"` so the save store can identify it.

### 5. Frontend: Catch mismatch in save flow, show toast, stop auto-save

**File:** `src/stores/saveStore.js`

In the `catch` block of `save()`, check `err.code === "PROJECT_MISMATCH"`. If so:
- Show persistent error toast (duration: 0) via `useToastStore`
- Call `stopAutoSave()` to prevent repeated failures
- Do NOT clear modification flags (user's edits stay in memory)

### 6. Update beta testing script

**File:** `docs-llms/beta-testing-script.md`

- **Section 12.5**: Change from "known limitation" to a real test — save should show error toast, changes preserved in memory, auto-save stops
- **Remove Sections 14, 15, 17** and the dividers between them. Keep Section 13 (Keyboard Shortcuts) and the Bug Report Template at the end

### 7. Backend tests

**File:** `server/tests/pages.test.js`

Add tests for the middleware guard:
- Write with matching `X-Project-Id` → passes through
- Write with mismatched `X-Project-Id` → 409 with `PROJECT_MISMATCH`
- Write without header → passes through (backward compat)
- GET with mismatched header → passes through (reads are harmless)

## Vulnerability Audit Results

### Vulnerable (uses `resolveActiveProject` middleware — no explicit project in request)

| Category | Endpoints | Route File |
|----------|-----------|------------|
| Pages | `createPage`, `updatePage`, `deletePage`, `bulkDeletePages`, `duplicatePage`, `savePageContent` | `server/routes/pages.js` |
| Menus | `createMenu`, `updateMenu`, `deleteMenu`, `duplicateMenu` | `server/routes/menus.js` |
| Global Widgets | `saveGlobalWidget` (bypasses middleware, calls `getActiveProjectId()` directly) | `server/controllers/previewController.js` |

### Safe (uses explicit `:projectId` in URL params)

| Category | Example Endpoint | Why Safe |
|----------|-----------------|----------|
| Media | `POST /api/projects/:projectId/media` | `projectId` from URL, not middleware |
| Export | `POST /api/export/:projectId` | `projectId` from URL |
| Themes | `POST /api/themes/project/:projectId` | `projectId` from URL |
| App Settings | `PUT /api/settings` | Global, not project-specific |
| Projects | `PUT /api/projects/:id` | Operates on project by ID |

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/apiFetch.js` | Add `X-Project-Id` header |
| `server/middleware/resolveActiveProject.js` | Add 409 guard for writes |
| `server/controllers/previewController.js` | Inline guard in `saveGlobalWidget` |
| `src/queries/pageManager.js` | Propagate `PROJECT_MISMATCH` in `savePageContent` |
| `src/queries/previewManager.js` | Propagate `PROJECT_MISMATCH` in `saveGlobalWidget` |
| `src/stores/saveStore.js` | Catch mismatch, toast, stop auto-save |
| `server/tests/pages.test.js` | Add middleware guard tests |
| `docs-llms/beta-testing-script.md` | Update 12.5, remove sections 14/15/17 |

## Verification

1. Run `npm test` — all existing + new tests pass
2. Manual test: open editor in Tab A, switch project in Tab B, try save in Tab A → error toast appears, changes preserved, no data written to wrong project
