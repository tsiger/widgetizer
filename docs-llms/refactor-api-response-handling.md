# API Response Handling Refactor — Review & Recommendations

Refactor status: **Complete, pending cleanup before commit.**

Covers architecture doc items: #11 (API Response Handling), plus media usage centralization and theme source caching.

---

## Summary

Three improvements implemented across 22 files (+953 / -737 lines):

1. **API Response Handling** — New `ApiError` class, `apiFetchJson()`, `throwApiError()`, `parseJsonResponse()` in `src/lib/apiFetch.js`. All 8 query managers migrated from manual `response.ok` / `response.json()` boilerplate.
2. **Media Usage Centralization** — New `refreshMediaUsageAfterStructuralChange()` in `mediaUsageService.js` called after project create/duplicate/import and theme updates. Page persistence consolidated into `persistPageWithMediaTracking` / `deletePageWithMediaTracking` helpers in `pageController.js`.
3. **Theme Source Directory Caching** — `getThemeSourceDir()` cached with 5s TTL and promise deduplication. Invalidated at all mutation points (`buildLatestSnapshot`, `deleteTheme`, `uploadTheme`).

---

## Issues to Fix Before Commit

### 1. `rethrowQueryError` duplicated in 8 files (Medium)

The identical 5-line function is copy-pasted into every query manager:

- `appSettingsManager.js`
- `exportManager.js`
- `mediaManager.js`
- `menuManager.js`
- `pageManager.js`
- `previewManager.js`
- `projectManager.js`
- `themeManager.js`

It's tightly coupled to `isApiError` which already lives in `apiFetch.js`. Export it from there and import in each manager.

### 2. Dead catch block in `getThemeSettings` (Low)

In `themeManager.js` (~lines 145-151), both branches of the catch block throw the same error:

```js
} catch (error) {
  console.error("Error fetching theme settings:", error);
  if (isApiError(error)) {
    throw error;
  }
  throw error;
}
```

Either use `rethrowQueryError` like every other function, or remove the try/catch and keep only the `console.error` if logging is desired.

### 3. Fragile string matching in `getProjectWidgets` (Low)

In `previewManager.js`, the catch block uses `error.message === "No active project"` to re-throw before `rethrowQueryError`. The `getThemeSettings` function in the same refactor handles the same pattern by guarding *before* the try block. Align the approach.

### 4. `importProject` still uses old guard pattern (Low)

In `projectManager.js` (~line 224), `importProject` still uses `error.message.includes("Failed to fetch")` — the old pattern that the rest of the file no longer uses. This function uses `uploadFormData` (not `apiFetch`), so it was correctly excluded from the main migration, but the inconsistency stands out.

---

## Test Gaps (Non-blocking)

These are not blocking but would improve confidence:

| Gap | File |
|-----|------|
| `parseJsonResponse` success path and `emptyValue` parameter | `apiFetch.test.js` |
| Non-JSON error bodies (plain text server responses) | `apiFetch.test.js` |
| `readResponseBody` with empty body returning `null` | `apiFetch.test.js` |
| Theme cache TTL expiry and promise deduplication | `themes.test.js` |
| `refreshMediaUsageAfterStructuralChange` error-swallowing path | `themeUpdateService.test.js` or `projects.test.js` |
| Individual query manager error behavior | Relies on centralized `apiFetch.test.js` |

---

## Behavioral Change to Be Aware Of

In `themeController.js`, `uploadTheme` now returns metadata from the resolved (merged `latest/`) theme snapshot rather than from the just-uploaded version file. For new theme uploads these are identical. For update uploads the resolved metadata could differ. This is arguably more correct (respond with resolved state) but is a subtle change.

---

## Architecture Doc Update

After committing, update the improvements section in `core-architecture.md` item #11 to reflect completion status, and add entries for the media usage centralization and theme source caching if not already documented.
