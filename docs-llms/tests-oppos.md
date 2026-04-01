# Test Opportunities

> Notes for later. This file captures omissions, improvement opportunities, and coverage gaps in the current automated test suite. No test changes are being made as part of this note.

## Test Suite Inventory

| Area | Runner | Scope |
| --- | --- | --- |
| Backend | `node --test` + `server/tests/reporter.js` | `server/tests/*.test.js` |
| Frontend | Vitest | `src/**/*.test.js` and `scripts/__tests__/*.test.js` |
| Electron | None | No automated tests found |
| React UI components | None | No component/UI tests found for upload surfaces |

## High-Signal Gaps

### Shared upload refactor

- `src/lib/uploadRequest.js`
  - Add edge-case coverage for:
    - plain-string error bodies
    - `message` vs `error` payload priority
    - empty 2xx response bodies
    - `lengthComputable === false`
    - no active project ID header
    - direct `createUploadError()` assertions
- `src/utils/uploadFeedback.js`
  - Cover missing branches for:
    - all-rejected outcomes
    - empty outcomes with fallback messaging
    - custom `successMessage`, `rejectedMessage`, and `summaryLevel`
    - early-return path when no rejected files exist
- `src/utils/uploadValidation.js`
  - Add a few edge cases for:
    - `maxSizeMB == null`
    - MIME-only ZIP detection without `.zip`
    - fallback error message mapping in `mapDropzoneRejections`

### Important integration gap

- `src/hooks/useMediaUpload.js`
  - This is still the biggest missing frontend test target.
  - It contains real branching around:
    - chunked uploads
    - pre-validation
    - SVG sanitization
    - partial success vs full rejection
    - per-file progress behavior
    - toast summarization
- A focused hook test would likely catch call-site bugs faster than helper-only unit tests.

### Upload surfaces with no UI coverage

- `src/components/ui/FileUploader.jsx`
- `src/pages/Media.jsx`
- `src/pages/Themes.jsx`
- `src/components/projects/ProjectImportModal.jsx`
- `src/components/media/MediaSelectorDrawer.jsx`
- `src/components/settings/inputs/ImageInput.jsx`

These are currently manual-test-only from an automation perspective.

## Frontend Testing Strategy Gaps

- Vitest is configured with `environment: "node"` in `vitest.config.js`.
- There is no `jsdom` setup and no React Testing Library dependency.
- That means current frontend coverage is strong for pure utilities/stores, but weak for actual user interaction flows.

## Shared Client Modules Worth Testing

- `src/lib/apiFetch.js`
  - central network helper, currently untested
- `src/queries/mediaManager.js`
  - especially upload/error normalization and cache updates
- `src/queries/themeManager.js`
  - theme upload normalization paths
- `src/queries/projectManager.js`
  - project import normalization paths

## Backend Gaps

Backend coverage is generally strong, but these areas are still worth reviewing later:

- `server/createApp.js`
  - route wiring / app bootstrap coverage
- `server/middleware/*`
  - error handler
  - request validation plumbing
  - active project resolution
  - JSON parser behavior
- selected `server/utils/*`
  - check whether helpers such as naming/path/template/link helpers are only covered indirectly
- repository-level coverage
  - most behavior is tested through controllers, not isolated repository tests

## Script Coverage Gaps

- `scripts/__tests__/validate-theme-locales.test.js` exists and is useful
- `scripts/validate-locales.js` does not appear to have matching automated coverage

## Organization / Maintenance Opportunities

- `npm test` runs backend tests only
- `npm run test:frontend` runs Vitest separately
- Easy future improvement: ensure both are always run together in CI/release validation

- `server/tests/reporter.js`
  - when adding new backend test files, remember to keep filename grouping in sync

- store tests such as `src/stores/__tests__/saveStore.test.js`
  - fast and useful, but somewhat coupled to mocked module shapes
  - worth watching when query APIs are refactored

## Suggested Next Targets

If we tackle this later, the highest-value next additions are probably:

1. `useMediaUpload` hook tests
2. More edge-case tests for `uploadRequest`, `uploadFeedback`, and `uploadValidation`
3. Lightweight tests for `apiFetch` and upload-related query modules
4. Decide whether the project wants real component tests (`jsdom` + RTL) for critical upload flows
5. Review middleware and app bootstrap coverage on the backend
