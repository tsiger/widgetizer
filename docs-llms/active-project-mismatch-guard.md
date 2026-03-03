# Implementation Plan: Active Project Mismatch Guard

## Problem

When a user switches the active project (e.g., in another browser tab), write operations from a page/menu editor in the original tab silently write to the **wrong project**. The backend resolves the active project from SQLite at request time via `resolveActiveProject` middleware, not from the request itself. This affects **10 write endpoints** across Pages (6) and Menus (4). The `saveGlobalWidget` endpoint in the preview controller has the same issue — it calls `getActiveProjectId()` directly, bypassing middleware entirely.

## Approach: `X-Project-Id` Header + 409 Conflict

The frontend stamps every API request with the project ID it believes is active. The backend compares that stamp against the actual active project on write requests. If they don't match, it returns 409 instead of silently writing to the wrong project.

## Vulnerability Audit

### Vulnerable (uses `resolveActiveProject` middleware — no explicit project in request)

| Category | Endpoints | Route File |
|----------|-----------|------------|
| Pages | `createPage`, `updatePage`, `deletePage`, `bulkDeletePages`, `duplicatePage`, `savePageContent` | `server/routes/pages.js` |
| Menus | `createMenu`, `updateMenu`, `deleteMenu`, `duplicateMenu` | `server/routes/menus.js` |
| Global Widgets | `saveGlobalWidget` (bypasses middleware, calls `getActiveProjectId()` directly) | `server/controllers/previewController.js` |

### Vulnerable (frontend-side — fetches stale project ID from backend before writing)

| Category | Function | Why Vulnerable |
|----------|----------|----------------|
| Theme Settings | `saveThemeSettings` in `src/queries/themeManager.js` | Calls `getActiveProject()` (API fetch) to get project ID, then posts to `/api/themes/project/:projectId`. Backend endpoint is safe (explicit `:projectId`), but the frontend picks the wrong ID after a cross-tab switch. Fixed in Step 7. |

### Safe (uses explicit `:projectId` in URL params)

| Category | Example Endpoint | Why Safe |
|----------|-----------------|----------|
| Media | `POST /api/projects/:projectId/media` | `projectId` from URL, not middleware |
| Export | `POST /api/export/:projectId` | `projectId` from URL |
| Themes | `POST /api/themes/project/:projectId` | Backend endpoint safe; frontend caller fixed in Step 7 |
| App Settings | `PUT /api/settings` | Global, not project-specific |
| Projects | `PUT /api/projects/:id` | Operates on project by ID |

## Implementation Steps

### Step 1: Create `activeProjectId` helper module (break import cycle)

**New file:** `src/lib/activeProjectId.js`

**Why:** Importing `useProjectStore` directly in `apiFetch.js` creates an ESM circular dependency: `apiFetch` → `projectStore` → `projectManager` → `apiFetch`. Even though ESM live bindings resolve at call time, this is fragile and can cause initialization-edge issues.

**What:** A small module that holds a lazy reference to the project store. It exposes `getActiveProjectId()` for apiFetch to call, and `registerProjectStore()` for the app to call once on init.

```js
// src/lib/activeProjectId.js
let _store = null;

export function registerProjectStore(store) {
  _store = store;
}

export function getActiveProjectId() {
  return _store?.getState()?.activeProject?.id ?? null;
}
```

No imports from projectStore, no cycle.

### Step 2: Register the project store on app init

**File:** `src/App.jsx`

Import `registerProjectStore` from `src/lib/activeProjectId.js` and `useProjectStore`. Call `registerProjectStore(useProjectStore)` once at module level (outside the component), since the Zustand store is a singleton that exists immediately.

```js
import { registerProjectStore } from "./lib/activeProjectId";
import useProjectStore from "./stores/projectStore";

registerProjectStore(useProjectStore);
```

### Step 3: Inject `X-Project-Id` header in `apiFetch`

**File:** `src/lib/apiFetch.js`

Import `getActiveProjectId` from `./activeProjectId`. Inside the function, read the project ID and add the header when available.

```js
import { API_URL } from "../config";
import { getActiveProjectId } from "./activeProjectId";

export async function apiFetch(path, options = {}) {
  const url = API_URL(path);
  const headers = { ...options.headers };

  const projectId = getActiveProjectId();
  if (projectId) {
    headers["X-Project-Id"] = projectId;
  }

  const response = await fetch(url, { ...options, headers });
  return response;
}
```

### Step 4: Add 409 guard to `resolveActiveProject` middleware

**File:** `server/middleware/resolveActiveProject.js`

After resolving the active project (existing logic), add a write-method guard:

- Only check on `POST`, `PUT`, `PATCH`, `DELETE`
- Read `x-project-id` from request headers
- If present and doesn't match `activeProject.id` → return 409 with `{ error: "Project mismatch", message, code: "PROJECT_MISMATCH" }`
- **Missing header = allow through** (transitional — see Step 13)
- `GET` requests always pass through (reads are harmless for now — see Known Gaps)

```js
export async function resolveActiveProject(req, res, next) {
  try {
    const activeProjectId = projectRepo.getActiveProjectId();
    if (!activeProjectId) {
      return res.status(404).json({ error: "No active project found" });
    }

    const activeProject = projectRepo.getProjectById(activeProjectId);
    if (!activeProject) {
      return res.status(404).json({ error: "No active project found" });
    }

    // Guard: reject writes if the frontend's project doesn't match
    const writeMethods = ["POST", "PUT", "PATCH", "DELETE"];
    const clientProjectId = req.headers["x-project-id"];
    if (writeMethods.includes(req.method) && clientProjectId && clientProjectId !== activeProject.id) {
      return res.status(409).json({
        error: "Project mismatch",
        message: "The active project has changed. Please reload the page.",
        code: "PROJECT_MISMATCH",
      });
    }

    req.activeProject = activeProject;
    next();
  } catch (error) {
    next(error);
  }
}
```

### Step 5: Add inline guard to `saveGlobalWidget`

**File:** `server/controllers/previewController.js` (in `saveGlobalWidget`, after resolving `activeProjectId`)

`saveGlobalWidget` bypasses the router middleware — it calls `projectRepo.getActiveProjectId()` directly. Add the same header check inline:

```js
// After: const activeProjectId = projectRepo.getActiveProjectId();
const clientProjectId = req.headers["x-project-id"];
if (clientProjectId && clientProjectId !== activeProjectId) {
  return res.status(409).json({
    error: "Project mismatch",
    message: "The active project has changed. Please reload the page.",
    code: "PROJECT_MISMATCH",
  });
}
```

### Step 6: Propagate `PROJECT_MISMATCH` in query managers

**Files:** `src/queries/pageManager.js` (`savePageContent`), `src/queries/previewManager.js` (`saveGlobalWidget`)

When the response is 409, parse the JSON body and check for `code: "PROJECT_MISMATCH"`. If found, throw an error with that code attached so the save store can identify it.

```js
// In savePageContent (pageManager.js) and saveGlobalWidget (previewManager.js):
if (!response.ok) {
  const errorData = await response.json();
  if (response.status === 409 && errorData.code === "PROJECT_MISMATCH") {
    const err = new Error(errorData.message || "Project mismatch");
    err.code = "PROJECT_MISMATCH";
    throw err;
  }
  throw new Error(errorData.error || "Failed to save ...");
}
```

### Step 7: Fix `saveThemeSettings` to use cached project ID

**Files:** `src/queries/themeManager.js` (`saveThemeSettings`), `src/stores/saveStore.js` (call site)

`saveThemeSettings` currently calls `getActiveProject()` — a fresh API fetch — to get the project ID before posting to `/api/themes/project/:projectId`. After a cross-tab project switch, this fetches the *new* active project and writes theme settings to the wrong project. The backend endpoint is safe (explicit `:projectId` in URL), but the frontend picks the wrong ID.

**Fix:** Change `saveThemeSettings(data)` to `saveThemeSettings(projectId, data)`. The caller in `saveStore.js` passes the store-cached project ID.

In `themeManager.js`:
```js
// Before:
export async function saveThemeSettings(data) {
  const activeProject = await getActiveProject();
  if (!activeProject) { throw new Error("No active project"); }
  const response = await apiFetch(`/api/themes/project/${activeProject.id}`, { ... });

// After:
export async function saveThemeSettings(projectId, data) {
  const response = await apiFetch(`/api/themes/project/${projectId}`, { ... });
```

In `saveStore.js`, the call site is updated in Step 8a as part of the two-phase save restructure — `saveThemeSettings(activeProject.id, themeSettings)` runs in phase 2 after guarded writes succeed.

The `activeProject` is already read from the store at line 145 for cache invalidation. Move that read earlier (to the top of `save()` alongside the other store reads) and reuse it for both the theme save and the cache invalidation.

This also lets `themeManager.js` drop the `getActiveProject` import if no other function in the file uses it.

### Step 8: Restructure save flow and catch mismatch

**File:** `src/stores/saveStore.js`

**Two changes in this step:**

#### 8a. Two-phase save to prevent partial writes

The current `save()` fires page content, global widgets, and theme settings in a single `Promise.all`. With the mismatch guard, page/global writes can 409 while the theme save (using explicit `projectId`) succeeds. This creates a partial save: theme settings land, but the catch path shows "unsaved edits preserved" and keeps all modification flags — even though some edits were actually saved.

Fix: save mismatch-prone writes first, then theme settings only if those succeed. Page content and global widgets can still run in parallel (they're all guarded the same way).

```js
try {
  const activeProject = useProjectStore.getState().activeProject;

  // Phase 1: mismatch-guarded writes (page content + global widgets)
  const guardedPromises = [];

  if (globalWidgets.header && modifiedWidgets.has("header")) {
    guardedPromises.push(saveGlobalWidget("header", globalWidgets.header));
  }
  if (globalWidgets.footer && modifiedWidgets.has("footer")) {
    guardedPromises.push(saveGlobalWidget("footer", globalWidgets.footer));
  }

  const hasPageWidgetChanges = [...modifiedWidgets].some((id) => id !== "header" && id !== "footer");
  const hasPageDiff = page && pageStore.originalPage
    ? JSON.stringify(page) !== JSON.stringify(pageStore.originalPage)
    : false;
  if (page && (hasPageWidgetChanges || structureModified || hasPageDiff)) {
    guardedPromises.push(savePageContent(page.id, page));
  }

  await Promise.all(guardedPromises);

  // Phase 2: theme settings (uses explicit projectId, no mismatch guard)
  // Only runs if phase 1 succeeded — prevents partial save
  if (themeSettingsModified && themeSettings && activeProject) {
    await saveThemeSettings(activeProject.id, themeSettings);
  }

  // ... rest of success path (cache invalidation, clear flags, etc.)
}
```

#### 8b. Catch `PROJECT_MISMATCH` in the error path

In the `catch` block of `save()`, before the generic `console.error`:

```js
} catch (err) {
  if (err.code === "PROJECT_MISMATCH") {
    const { showToast } = useToastStore.getState();
    showToast(
      "The active project has changed. Your unsaved edits are preserved — reload to continue editing.",
      "error",
      { duration: 0 }
    );
    get().stopAutoSave();
    return; // Don't clear modification flags — edits stay in memory
  }
  console.error("Failed to save:", err);
}
```

Import `useToastStore` at the top of the file. No cycle risk — toastStore has no upstream imports.

Note: `return` exits the `try` block but `finally` still runs and resets `isSaving`/`isAutoSaving`, which is correct — the save attempt is over regardless.

### Step 9: Create middleware-focused tests

**New file:** `server/tests/projectMismatchGuard.test.js`

Tests the `resolveActiveProject` middleware function directly (not through the router). This avoids the issue where `pages.test.js` calls controllers directly and bypasses router middleware.

Test cases:
1. `POST` with matching `X-Project-Id` → calls `next()`, `req.activeProject` set
2. `POST` with mismatched `X-Project-Id` → 409 with `code: "PROJECT_MISMATCH"`
3. `POST` without header → calls `next()` (transitional backward compat)
4. `GET` with mismatched `X-Project-Id` → calls `next()` (reads pass through)
5. `DELETE` with mismatched header → 409
6. No active project in DB → 404 (existing behavior preserved)

### Step 10: Add `saveGlobalWidget` guard tests to preview.test.js

**File:** `server/tests/preview.test.js`

Add a new `describe` block for the inline mismatch guard in `saveGlobalWidget`:

1. Save with matching `X-Project-Id` header → succeeds (200)
2. Save with mismatched `X-Project-Id` header → 409 with `PROJECT_MISMATCH`
3. Save without header → succeeds (backward compat)

The existing `preview.test.js` already has the test infrastructure (mock req/res, project setup). Add `headers` to the `mockReq` helper.

### Step 11: Add `saveThemeSettings` call-site test

**File:** `src/stores/__tests__/saveStore.test.js`

`saveThemeSettings` is a frontend query function (`src/queries/themeManager.js`), not a server controller — a server test can't validate the signature change. The existing `saveStore.test.js` already mocks `saveThemeSettings` via Vitest and has the infrastructure to verify call arguments.

Add a test to the existing `save` describe block:

1. Seed page store with theme settings, mark `themeSettingsModified`
2. Call `save()`
3. Assert `saveThemeSettings` was called with `(activeProject.id, themeSettings)` — i.e., the store-cached project ID is passed as the first argument, not fetched fresh from the backend
4. The mock for `useProjectStore` already returns `{ activeProject: { id: "test-project" } }` (line 28), so the assertion checks that `"test-project"` is the first arg

### Step 12: Update beta testing script

**File:** `docs-llms/beta-testing-script.md`

**Section 12.5** — change from "known limitation" to a real test:

```markdown
### 12.5 Active Project Mismatch Guard

1. Open the page editor for a page in Project A. Make a small change (don't save yet).
2. In another tab, switch the active project to Project B.
3. Go back to the editor tab and save (Ctrl+S).
4. **Expected**: Error toast appears: "The active project has changed." Auto-save stops. Your edits are still visible in the editor (not lost).
5. No data should have been written to Project B.
6. Reload the editor tab.
7. **Expected**: The editor loads Project B (the now-active project). Your unsaved edits to Project A are gone (expected — they were in-memory only).
```

**Remove Sections 14, 15, 17** and the `---` dividers between them. Keep Section 13 (Keyboard Shortcuts) and the Bug Report Template at the end.

### Step 13: Future tightening (not in this PR)

The missing-header-allowed rule is transitional. Since this app ships frontend and backend together, after the frontend changes are confirmed working:

- Change the middleware to **require** the `X-Project-Id` header on write routes
- Change the `saveGlobalWidget` inline guard to also require it
- This is a one-line change in each location: remove the `&& clientProjectId` check (treat missing header as mismatch)

## Known Gaps

### Preview reads still use global active project

`generatePreviewHtml` (`previewController.js:50`), `renderSingleWidget` (`:256`), and `getGlobalWidgets` (`:291`) all resolve the active project from `getActiveProjectId()`. After switching projects in Tab B, the old tab's preview renders may show content/assets from the wrong project.

**Scope decision:** This plan stops wrong *writes* only. If stale preview reads need pinning to the original project, extend the same `X-Project-Id` header to preview read endpoints and use it to resolve context (but do NOT 409 those routes — just use the header as the project source).

## Files to Modify

| File | Change | New? |
|------|--------|------|
| `src/lib/activeProjectId.js` | Project ID getter to break import cycle | Yes |
| `src/App.jsx` | Register project store on init | No |
| `src/lib/apiFetch.js` | Inject `X-Project-Id` header | No |
| `server/middleware/resolveActiveProject.js` | 409 guard for write methods | No |
| `server/controllers/previewController.js` | Inline guard in `saveGlobalWidget` | No |
| `src/queries/pageManager.js` | Propagate `PROJECT_MISMATCH` in `savePageContent` | No |
| `src/queries/previewManager.js` | Propagate `PROJECT_MISMATCH` in `saveGlobalWidget` | No |
| `src/queries/themeManager.js` | Change `saveThemeSettings(data)` → `saveThemeSettings(projectId, data)` | No |
| `src/stores/saveStore.js` | Two-phase save (guarded writes first, then theme); catch mismatch, toast, stop auto-save | No |
| `server/tests/projectMismatchGuard.test.js` | Middleware guard tests | Yes |
| `server/tests/preview.test.js` | `saveGlobalWidget` guard tests | No |
| `src/stores/__tests__/saveStore.test.js` | `saveThemeSettings(projectId, data)` call-site test | No |
| `docs-llms/beta-testing-script.md` | Update 12.5, remove sections 14/15/17 | No |

## Verification

1. `npm test` — all existing + new tests pass
2. `npm run lint` — no lint errors
3. Manual test: open editor in Tab A, switch project in Tab B, try save in Tab A → error toast, changes preserved, no wrong-project writes
