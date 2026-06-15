# future-copy-paste-widget

Copy/paste for widgets in the page editor — same page and across pages (same
project). Feasibility + implementation plan. **Not built yet.**

## Verdict

**Low difficulty.** The editor already does ~90% of the work via the existing
"duplicate widget" path. No backend or schema changes are needed. The bulk of
the effort is UI (a Copy button + a Paste affordance) plus a small clipboard
store.

## Why it's easy — existing infrastructure

- **`duplicateWidget`** ([widgetStore.js:202](../src/stores/widgetStore.js)) already
  clones a widget's data, regenerates all block IDs, inserts at a position, marks
  the structure changed, and triggers save. **Same-page paste is this function**,
  sourcing from a clipboard instead of an existing widget id.
- **`cloneWidgetWithNewBlockIds`** ([widgetStoreHelpers.js:125](../src/stores/widgetStoreHelpers.js))
  is a **pure function** taking a plain widget object — it does not require the
  widget to already be on the page. Feed it a clipboard payload and it works.
- **IDs are UUIDs**: `generateWidgetId: () => widget_${uuidv4()}` and
  `generateBlockId: () => block_${uuidv4()}` ([widgetStore.js:175-176](../src/stores/widgetStore.js)).
  This is the key reason **cross-page is as easy as same-page** — pasting into
  another page can never collide; no ID remapping required.
- **Save is automatic**: paste goes through `pageStore.setPage(...)` +
  `markStructureChanged()` → the existing save flow ([saveStore.js](../src/stores/saveStore.js))
  persists it. No new endpoints.
- **Media usage self-heals**: usage is *recomputed by scanning page content on
  save* via `extractMediaPathsFromPage` ([mediaUsageService.js:68](../server/services/mediaUsageService.js)),
  so a pasted widget's images register correctly on the destination page with no
  extra work.
- **Links / menus stay valid**: stored as project-scoped UUIDs (pageUuid,
  collectionItemUuid, menu uuid/slug) and resolved at render time, so copying
  within the same project keeps them working across pages.
- **UI hook point exists**: `WidgetItem` already renders a per-widget toolbar
  with a Duplicate button ([WidgetItem.jsx:149](../src/components/pageEditor/widgets/WidgetItem.jsx))
  using `onDuplicateClick`. A Copy button is a symmetric addition.

## What to build (small)

1. **Clipboard store** — one field holding a deep-cloned widget *data* object
   (`{ type, settings, blocks, blocksOrder }`, **no id**). In-memory Zustand
   survives page navigation within a session; `localStorage` keyed by project id
   also survives reloads/tabs. Clear (or scope) on project change — the existing
   `resetForProjectChange` in widgetStore is the precedent. ~30 lines.
2. **`copyWidget(widgetId)`** — `JSON.parse(JSON.stringify(page.widgets[widgetId]))`
   into the clipboard. Guard against global widgets (header/footer are singletons).
3. **`pasteWidget(position)`** — if clipboard set:
   `cloneWidgetWithNewBlockIds(clipboard, () => generateBlockId())` + new widget id
   + `insertIdAtPosition`/`insertIdAfter` + `setPage` + `markStructureChanged`.
   This is essentially a copy of `duplicateWidget` (lines 202-221) sourcing from
   the clipboard.
4. **UI** — a "Copy" button on the widget toolbar (mirror the Duplicate button in
   `WidgetItem.jsx`), and a "Paste" affordance: a paste item in the insert/
   add-widget menu and/or paste-after on a widget's menu. Most of the effort is
   here, and it's modest. Disambiguate icons (Duplicate currently uses the lucide
   `Copy` icon — switch so Copy / Paste / Duplicate read distinctly; lucide has
   `Copy`, `ClipboardPaste`, `CopyPlus`).

## Decisions (not hard, but to be made)

- **Clipboard mechanism**: in-app (Zustand or localStorage) is simple and covers
  same + different page. True OS clipboard via `navigator.clipboard` (paste as
  JSON across app windows) is more work — serialization, permissions, validating
  untrusted JSON — **defer it**. Recommend in-app first.
- **Cross-*project* paste is the real boundary** and is out of scope for the
  initial ask. Across projects, media filenames / icons / page-link UUIDs won't
  exist in the target → broken images and links. Within a project everything
  resolves. If cross-project is ever wanted, it needs media copying + relinking
  (related: the same problem theme/preset portability has).
- **Keyboard shortcuts (Ctrl+C / Ctrl+V)**: nice polish but need focus handling
  so they don't hijack typing in inputs / richtext. Ship button-based first;
  shortcuts as a follow-up.
- **Block-level copy/paste**: out of scope here, but the same pattern extends to
  blocks later — `cloneBlock` ([widgetStoreHelpers.js:118](../src/stores/widgetStoreHelpers.js))
  and `duplicateBlock` ([widgetStore.js:331](../src/stores/widgetStore.js)) already exist.

## Estimate

Roughly **half a day to a day** for a clean, button-based copy + same/cross-page
paste: clipboard store, two store actions, UI wiring, a media-usage sanity check,
and store tests (extend `src/stores/__tests__/widgetStore.test.js`). Keyboard
shortcuts and OS-clipboard support would each add a bit on top.

## Key files

| Concern | File |
|---|---|
| Duplicate / add / insert / id gen | `src/stores/widgetStore.js` (175-221) |
| Pure clone + order helpers | `src/stores/widgetStoreHelpers.js` |
| Page state (setPage) | `src/stores/pageStore.js` |
| Save flow | `src/stores/saveStore.js` |
| Widget toolbar UI (Duplicate button) | `src/components/pageEditor/widgets/WidgetItem.jsx` |
| Widget list / insertion | `src/components/pageEditor/WidgetList.jsx` |
| Media usage (recomputed on save) | `server/services/mediaUsageService.js` |
| Store tests | `src/stores/__tests__/widgetStore.test.js` |
