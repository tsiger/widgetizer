# Testing

> **Status**: In Progress (Tier 1 + Tier 2 complete, Tier 3–4 future)

## Overview

Testing is split into two worlds:

- **Backend tests** — Node's built-in test runner (`node:test` + `node:assert/strict`), no external libraries
- **Frontend tests** — Vitest, configured to only pick up files in `src/`

```bash
npm test               # Backend (Node test runner) — 777 tests
npm run test:frontend  # Frontend (Vitest) — 248 tests
```

---

## Infrastructure

### Backend

Tests live in `server/tests/*.test.js`. Each test creates an isolated temp directory, runs assertions, and cleans up. The custom reporter at `server/tests/reporter.js` provides grouped output.

### Frontend

Vitest was added as a devDependency with a dedicated config file:

**`vitest.config.js`**
```js
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.js"],
  },
});
```

The `include` pattern is important — without it Vitest picks up `server/tests/*.test.js` and fails because those use `node:test`, not Vitest.

The `test:frontend` script in `package.json` runs `vitest run` (single pass, no watch mode). For watch mode during development, run `npx vitest`.

---

## What's Been Done

### Tier 1 — Pure Utility Functions (130 tests)

Straightforward input-output tests with no mocking or setup.

| File | Tests | What it covers |
|---|---|---|
| `src/utils/__tests__/slugUtils.test.js` | 7 | `formatSlug()` — lowercase, special chars, ampersands, trimming, empty input |
| `src/utils/__tests__/youtubeHelpers.test.js` | 45 | `extractVideoId` (5 URL formats + bare IDs + invalid input), `validateYouTubeUrl`, `getThumbnailUrl` (quality fallback), `buildEmbedUrl` (boolean conversion, null stripping), `createYouTubeEmbed` (option defaults), `generateIframeHtml` (dimensions, attributes) |
| `src/utils/__tests__/dateFormatter.test.js` | 38 | All 13 date formats, midnight/noon 12-hour edge cases, single-digit padding, all 12 month names, invalid input (null, undefined, bad strings), timestamp and ISO string inputs, `formatCurrentDate`, `isValidDateFormat` |
| `src/utils/__tests__/blockLimits.test.js` | 14 | `hasReachedMaxBlocks()` — null/undefined/0/negative maxBlocks, below/at/above limit, missing blocksOrder, null widget, null schema |
| `src/components/menus/MenuEditor/utils/__tests__/menuUtils.test.js` | 26 | `generateId` (uniqueness), `ensureIds` (recursive ID assignment, immutability, null/non-array input), `getItemAtPath` (all depth levels), `findItemById` (root/child/grandchild, parentItems, cache) |

### Tier 2 — Zustand Store Logic (118 tests)

Tests call store actions directly via `getState()` / `setState()` — no React rendering needed. External query modules are mocked with `vi.mock()`.

| File | Tests | What it covers |
|---|---|---|
| `src/stores/__tests__/widgetStore.test.js` | 50 | Selection state (widget/block/global/theme group, reset, hover), ID generation (uniqueness), `addWidget` (schema defaults, default blocks, position insertion, auto-select), `duplicateWidget` (deep copy, block ID regeneration, placement), `deleteWidget` (removes from data/order, selects neighbor), `updateWidgetSettings`, `updateGlobalWidgetSettings`, `reorderWidgets` (ghost filtering), `addBlock` (schema defaults, position, maxBlocks limit, global widgets), `deleteBlock` (selects neighbor), `duplicateBlock` (deep copy, maxBlocks), `reorderBlocks`, `updateBlockSettings` |
| `src/stores/__tests__/pageStore.test.js` | 27 | `setPage`, `updateThemeSetting` (group/setting targeting, non-existent group/setting, null safety, immutability), `hasUnsavedThemeChanges` (match/mismatch/null), `markThemeSettingsSaved` (sync + deep copy), `updateGlobalWidget` (header/footer merge, invalid type, null widget), `resetPage` (revert + deep copy), `clearPage`, `setOriginalPage` (deep copy independence) |
| `src/stores/__tests__/saveStore.test.js` | 41 | Initial state, `markWidgetModified`/`markWidgetUnmodified` (Set accumulation, dedup, timer trigger), `setStructureModified`/`setThemeSettingsModified` (flags + timer behavior), `hasUnsavedChanges` deep equality fallback (undo/redo page drift, theme settings drift), `resetAutoSaveTimer`/`stopAutoSave`, `reset` (clears everything), `save` (isSaving/isAutoSaving flags, clears modifications, updates lastSaved, syncs originalPage, no-op when clean) |

### Theme Widget Rendering Tests (26 tests, backend)

Added `server/tests/themeWidgets.test.js` — tests 4 Arch theme widgets using the existing `renderWidget()` function. Copies actual widget files from `themes/arch/widgets/` into a temp project directory during setup.

| Widget | Tests | What it covers |
|---|---|---|
| Slideshow | 7 | `data-block-id` attributes, first slide active class, nav arrows for multi-slide, no nav for single slide, h1/h2 heading levels by widget index, XSS escaping |
| Accordion | 7 | `data-block-id`, richtext `| raw` rendering, connected vs separated style classes, widget header text, `data-multi-open` attribute, all items start collapsed |
| Rich Text | 6 | `data-block-id`, richtext `| raw`, content width/alignment classes, button rendering, h1/h2 heading levels |
| Image Tabs | 6 | `data-block-id`, first tab active, ARIA roles (`tablist`, `tab`, `tabpanel`), layout position classes, richtext descriptions |

Helper functions in that test file:
- `getRootClasses(html)` — extracts the `class` attribute from the root `<section>` element (avoids false positives from CSS selectors in `<style>` blocks)
- `stripStyleAndScript(html)` — removes `<style>` and `<script>` blocks before assertions (avoids false positives from JS string literals)

---

## What's Left To Do

### Tier 3 — React Hooks (needs `@testing-library/react`)

Custom hooks contain complex logic but need a React render context to test. Requires adding `@testing-library/react` as a devDependency and switching the Vitest environment to `jsdom` for hook test files.

**Hooks worth testing (by complexity):**

| Hook | Why |
|---|---|
| `useMediaUpload` | Chunk calculation, upload progress tracking, retry logic |
| `useMediaState` | Media library state management, filtering, sorting |
| `useMediaSelection` | Multi-select, shift-click range selection, select-all |
| `useNavigationGuard` | Unsaved changes detection, browser beforeunload |
| `useFormNavigationGuard` | Form-specific dirty state tracking |
| `useExportState` | Export progress polling, status transitions |
| `usePageSelection` | Page list selection state |
| `useMediaMetadata` | Metadata editing state |

**Setup required:**
1. `npm install -D @testing-library/react @testing-library/jest-dom`
2. Hook tests would use `renderHook()` from `@testing-library/react`
3. May need `environment: "jsdom"` in Vitest config (or per-file `// @vitest-environment jsdom` comments)

### Tier 4 — Preview Runtime (needs browser environment)

`src/core/previewRuntime.js` runs inside an iframe and manages editor lifecycle events (`widget:select`, `widget:deselect`, `widget:block-select`, `widget:block-deselect`), `window.Widgetizer.designMode`, and widget initialization. Testing this properly would require Playwright or a similar browser automation tool — not worth the infrastructure cost right now.

### Additional Theme Widget Tests

The theme widget rendering tests currently cover 4 Arch widgets. As new widgets are added to the Arch theme, corresponding tests should be added to `server/tests/themeWidgets.test.js` following the same pattern:

1. Add widget files to the `WIDGETS_TO_COPY` array in the `before()` setup
2. Write tests that call `renderWidget()` with representative data
3. Assert on `data-block-id` attributes, conditional classes, ARIA attributes, and XSS safety

---

## Conventions

### Test file location

Tests go in a `__tests__/` directory next to the source file:

```
src/utils/dateFormatter.js
src/utils/__tests__/dateFormatter.test.js

src/stores/pageStore.js
src/stores/__tests__/pageStore.test.js
```

Backend tests stay in `server/tests/`.

### Test structure

```js
import { describe, it, expect } from "vitest";

describe("functionName", () => {
  it("describes the expected behavior", () => {
    expect(functionName(input)).toBe(expected);
  });
});
```

### Store tests pattern

For Zustand stores, call actions directly — no React needed:

```js
import { beforeEach, vi } from "vitest";

// Mock external dependencies before import
vi.mock("../../queries/someModule", () => ({
  someFunction: vi.fn(),
}));

const { default: useMyStore } = await import("../myStore");

beforeEach(() => {
  useMyStore.setState({ /* initial state */ });
});

it("does the thing", () => {
  useMyStore.getState().someAction("arg");
  expect(useMyStore.getState().someValue).toBe("expected");
});
```

### Theme widget test pattern

```js
const html = await renderWidget(PROJECT_ID, "widget-id", {
  type: "widget-type",
  settings: { /* ... */ },
  blocks: { "b-1": { type: "block-type", settings: { /* ... */ } } },
  blocksOrder: ["b-1"],
}, RAW_THEME_SETTINGS);

assert.match(html, /data-block-id="b-1"/);
```
