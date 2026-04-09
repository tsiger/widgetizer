# Semver Update-Status Helper Plan

This plan covers roadmap item "Add a higher-level semver/update-status helper".

## Goal

Keep low-level semver parsing/comparison in `server/utils/semver.js`, but add one higher-level helper that answers the domain question the app keeps asking:

- is an update available?
- what should the current/latest values be?
- how should missing or unreadable versions be represented?

The main target is to stop repeating "if both versions exist, compare them; otherwise fall back to `unknown` or `false`" in several project/theme update flows.

## Current Duplication

### 1. Project theme-update status

`server/services/themeUpdateService.js`

- `checkForUpdates(projectId)` reads `project.themeVersion`
- reads the current theme source version
- returns `{ hasUpdate, currentVersion, latestVersion }`
- has its own missing-version fallback logic (`"unknown"`)

### 2. Project list enrichment

`server/controllers/projectController.js`

- `getAllProjects()` computes `hasThemeUpdate`
- reimplements the "only if opted in and both versions exist" logic inline
- directly uses `isNewerVersion(project.themeVersion, themeData.version)`

### 3. Theme update/build status

`server/controllers/themeController.js`

- theme listing computes `hasPendingUpdate` from `theme.version` vs `latestVersion`
- `themeHasPendingUpdates(themeId)` repeats the same comparison in a separate path

These flows are not identical, but they are clearly in the same family: "derive an update-status object from current + available versions, with sane missing-value behavior".

## What Should Be Shared

### Keep in `semver.js`

Low-level generic utilities should stay where they are:

- `parseVersion()`
- `isValidVersion()`
- `compareVersions()`
- `isNewerVersion()`
- `sortVersions()`
- `getLatestVersion()`

### Add one higher-level helper layer

Add a domain helper on top of `semver.js`, likely in a new file such as:

- `server/utils/updateStatus.js`

or, if it feels cleaner near the existing utilities:

- `server/utils/semverStatus.js`

This helper should answer higher-level questions without forcing every caller to rebuild the same object shape.

## Proposed Helper Shape

### Core helper

Introduce one small helper such as:

`getUpdateStatus(currentVersion, availableVersion, options?)`

Recommended return shape:

```js
{
  hasUpdate: boolean,
  currentVersion: string | null,
  latestVersion: string | null,
  currentVersionLabel: string,
  latestVersionLabel: string,
}
```

Why this shape:

- `hasUpdate` is the domain answer most callers care about
- raw versions stay available for persistence/logging
- label fields avoid repeating `"unknown"` presentation fallback logic

### Optional second helper

If the theme-controller call sites still feel awkward, add one tiny boolean helper:

`hasAvailableUpdate(currentVersion, availableVersion)`

That can just wrap `getUpdateStatus()` or `isNewerVersion()`, whichever reads better.

Do not add more helpers unless the first migration reveals a real need.

## Recommended Behavior

### Valid versions present

- compare with `isNewerVersion(currentVersion, availableVersion)`
- set `hasUpdate` accordingly
- preserve both raw versions
- labels are the raw version strings

### Missing or unreadable version

- `hasUpdate` should be `false`
- raw version field should stay `null` if genuinely missing
- label field can become `"unknown"` where that is useful for UI/API output

This keeps domain data cleaner than stuffing `"unknown"` directly into raw version fields too early.

## Migration Plan

### Phase 1: Add the helper and tests

Create the new helper file plus focused unit tests.

Test cases:

- newer available version
- equal version
- older available version
- missing current version
- missing available version
- both missing
- invalid version strings

### Phase 2: Migrate `themeUpdateService`

Update `checkForUpdates(projectId)` in `server/services/themeUpdateService.js` to use the new helper.

This is the best first migration because:

- it already returns a richer status object
- it has the clearest repeated fallback logic
- `applyThemeUpdate()` already depends on that result

Keep the external response shape stable unless there is a very strong reason to change it.

### Phase 3: Migrate `projectController`

Update `server/controllers/projectController.js` so project-list enrichment derives `hasThemeUpdate` through the helper instead of manually checking:

- `receiveThemeUpdates`
- `project.themeVersion`
- `themeData.version`
- `isNewerVersion(...)`

Likely approach:

- keep the opt-in gate in the controller
- use the helper only for the version-comparison/status step

That keeps policy (`receiveThemeUpdates`) separate from version semantics.

### Phase 4: Migrate `themeController`

Update the theme-management side to use the same helper for:

- theme list `hasPendingUpdate`
- `themeHasPendingUpdates(themeId)`

These paths are slightly different because they compare the current source version against the newest available version from `updates/`, but the comparison semantics are the same.

### Phase 5: Optional API-shape cleanup

Only do this if it stays low-risk:

- normalize naming like `latestVersion` vs `availableVersion`
- decide whether `"unknown"` belongs in API responses or only in the UI

This should be a follow-up cleanup, not part of the first refactor if it would churn tests or docs too much.

## Non-Goals

- Replacing `semver.js`
- Adding semver comparison logic to the frontend
- Changing project/theme update product behavior
- Changing opt-in policy around `receiveThemeUpdates`
- Changing how theme versions are discovered from `latest/` or `updates/`

## Design Notes

### Backend-first is the right scope

Right now the frontend mostly consumes derived fields like:

- `hasThemeUpdate`
- `hasPendingUpdate`
- `currentVersion`
- `latestVersion`

It is not doing its own meaningful semver math, so this should remain a backend/domain cleanup first.

### Keep policy separate from comparison

The helper should answer "is version B newer than version A?" in a richer, reusable way.

The caller should still own policy questions such as:

- should updates be shown only when `receiveThemeUpdates` is enabled?
- is this a project update flow or a theme-source update flow?

### Prefer raw data + labels over sentinel strings everywhere

Using `null` internally for missing versions is usually cleaner than putting `"unknown"` into raw fields too early.

If existing API responses already expose `"unknown"` and changing that would be noisy, keep the external shape stable for now and let the helper provide both raw values and labels.

## Likely Files

- `server/utils/semver.js`
- new helper file such as `server/utils/updateStatus.js`
- `server/services/themeUpdateService.js`
- `server/controllers/projectController.js`
- `server/controllers/themeController.js`
- `server/tests/semver.test.js`
- likely a new focused test file for the higher-level helper
- any tests covering theme updates / project list enrichment / theme listing

## Verification

### Automated

- add focused tests for the new helper
- run `server/tests/semver.test.js`
- run `server/tests/themeUpdateService.test.js`
- run the relevant theme/project controller tests that cover:
  - project list enrichment
  - theme listing
  - theme update status

### Manual

- check a project with no update available
- check a project with an available theme update
- check a project with updates disabled
- check a theme with pending `updates/` versions not yet built into `latest/`
- check missing-version edge cases if any old project/theme data still exists locally

## Recommendation

Keep this as a small backend-focused refactor.

The best first PR shape is:

1. add `getUpdateStatus()` plus tests
2. migrate `themeUpdateService`
3. migrate `projectController` and `themeController`
4. leave any API shape cleanup for later unless it falls out almost for free
