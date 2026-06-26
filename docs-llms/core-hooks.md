# Custom Hooks

Index of the custom React hooks in `@widgetizer/editor-ui`. All hook files live under `packages/editor-ui/src/hooks/`. Hooks that are really the surface of a larger subsystem (media, export, app settings) are demoted here to a one-line pointer into the subsystem doc; the editor-only utility hooks are documented in full.

## Confirmation & Modal Hooks

### `useConfirmationModal` (`packages/editor-ui/src/hooks/useConfirmationModal.js`)

A reusable hook for managing confirmation modal state and workflows, commonly used for destructive actions throughout the application.

#### Purpose

Standardizes confirmation dialogs across the application, providing consistent UX for operations like deletion, bulk operations, and other destructive actions.

#### Usage

```javascript
import useConfirmationModal from "../hooks/useConfirmationModal";

// Handler function that receives data from the confirmation
const handleDelete = async (data) => {
  try {
    await deleteItem(data.itemId);
    showToast(`${data.itemName} deleted successfully`, "success");
  } catch (error) {
    showToast("Failed to delete item", "error");
  }
};

// Initialize the hook
const { modalState, openModal, closeModal, handleConfirm } = useConfirmationModal(handleDelete);

// Open confirmation modal
const openDeleteConfirmation = (itemId, itemName) => {
  openModal({
    title: "Delete Item",
    message: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
    confirmText: "Delete",
    cancelText: "Cancel",
    variant: "danger",
    data: { itemId, itemName },
  });
};
```

#### API Reference

**Parameters:**

- `onConfirm` (function): Callback executed when the user confirms the action. Receives the `data` object passed to `openModal`.

**Returns:**

- `modalState` (object): Current modal state including visibility, text, and data
  - `isOpen` (boolean): Whether the modal is currently visible
  - `title` (string): Modal title
  - `message` (string): Modal message/content
  - `confirmText` (string): Text for the confirm button
  - `cancelText` (string): Text for the cancel button
  - `variant` (string): Modal style variant (`"danger"`, `"warning"`, etc.)
  - `data` (any): Custom data passed through to the confirmation handler
- `openModal(options)` (function): Opens the modal with the specified options
- `closeModal()` (function): Closes the modal
- `handleConfirm()` (function): Executes the confirmation action and closes the modal

#### Used In

- Media file deletion (`useMediaSelection`)
- Page deletion and bulk operations (`Pages.jsx`)
- Project deletion (`Projects.jsx`)
- Menu deletion (`Menus.jsx`)
- Export deletion (`ExportHistoryTable.jsx`)
- Widget deletion (`PageEditor.jsx`)

### `useConfirmationAction` (`packages/editor-ui/src/hooks/useConfirmationAction.js`)

Thin wrapper around `useConfirmationModal` that removes the repeated modal-wiring boilerplate from list pages with destructive actions. It owns the `ConfirmationModal` element so the page only has to render it.

#### API Reference

**Parameters:**

- `onConfirm` (function): Callback executed when the user confirms; receives the modal `data` (same contract as `useConfirmationModal`).

**Returns:**

- `confirm(options)` (function): Opens the confirmation dialog — same options object as `openModal`.
- `confirmationModal` (React element): A ready-to-render `<ConfirmationModal />` already wired to the hook's state.

Pages still own their mutation logic and localized copy; this hook only eliminates the `modalState`/`openModal`/`closeModal`/`handleConfirm` plumbing and the manual `<ConfirmationModal />` props.

## Navigation & Protection Hooks

### `useNavigationGuard` (`packages/editor-ui/src/hooks/useNavigationGuard.js`)

Provides comprehensive navigation protection to prevent users from losing unsaved changes when attempting to leave the page editor.

#### Purpose

Implements a two-layer protection system for preventing accidental data loss during navigation:

1. **Browser Navigation Protection**: Prevents tab closing, URL changes, and browser navigation
2. **Internal Navigation Protection**: Provides guarded navigation for React Router

#### Usage

```javascript
import useNavigationGuard from "../hooks/useNavigationGuard";

function PageEditor() {
  // Hook has no return value - it works automatically via side effects
  useNavigationGuard();

  // The hook integrates with the saveStore to check for unsaved changes
  // and blocks navigation automatically when there are pending changes

  return <div>{/* Component content */}</div>;
}
```

#### API Reference

**Parameters:** None

**Returns:** None (void) — manages navigation protection via side effects only

**How It Works:**

- Integrates with `saveStore` to check for unsaved changes
- Uses React Router's `useBlocker` to intercept navigation
- Automatically shows confirmation dialogs when blocking navigation
- Uses the `beforeunload` event for browser navigation protection

#### Integration Points

- **Page Editor**: Primary use case for protecting page editing workflows
- **Layout Component**: Integrates with sidebar navigation when on editor routes
- **Editor Top Bar**: Used for page switching within the editor

This hook is purpose-built for the page editor's `saveStore`. Form pages (Projects, Pages, Menus, Settings) use the form-state variant below instead.

### `useFormNavigationGuard` (`packages/editor-ui/src/hooks/useFormNavigationGuard.js`)

A simplified navigation guard for form pages, driven by a single dirty-state boolean plus an optional bypass ref.

#### Purpose

Provides streamlined navigation protection for form-based pages where the dirty state is tracked by the page (typically `react-hook-form`'s `isDirty`). Unlike `useNavigationGuard`, it does not read `saveStore`.

#### Usage

```javascript
import { useRef } from "react";
import useFormNavigationGuard from "../hooks/useFormNavigationGuard";

function ProjectForm() {
  const {
    formState: { isDirty },
  } = useForm();
  const skipRef = useRef(false);

  // Protect against navigation when the form is dirty.
  useFormNavigationGuard(isDirty, skipRef);

  // Set skipRef.current = true immediately before a programmatic navigate()
  // (e.g. after a successful save) to bypass the guard for that transition.
}
```

#### API Reference

**Parameters:**

- `hasUnsavedChanges` (boolean): Whether the form has unsaved changes.
- `skipRef` (`React.RefObject<boolean>`, optional): A ref that, when `true`, bypasses both layers of the guard. Used to allow programmatic navigation after a save without prompting. Defaults to `null` (no bypass).

**Returns:** Nothing — both protection layers are wired via side effects.

#### Key Features

- **Layer 1 — Browser protection**: `beforeunload` handler blocks tab close / refresh / external URL changes while dirty (and `skipRef` is not set).
- **Layer 2 — Internal protection**: `useBlocker` blocks React Router navigation while dirty and the location is actually changing; shows a `window.confirm` dialog and proceeds or resets accordingly.
- **Bypass**: `skipRef.current === true` short-circuits both layers.

Most pages consume this indirectly through `useGuardedFormPage` rather than calling it directly.

### `useGuardedFormPage` (`packages/editor-ui/src/hooks/useGuardedFormPage.jsx`)

Standardizes the shell around guarded form pages: it owns the `skipRef`, wires `useFormNavigationGuard`, and exposes a guard-bypassing navigate plus a dirty-dot title helper. Pages keep ownership of their dirty state, submission logic, and toast behavior.

#### API Reference

**Parameters:**

- `hasUnsavedChanges` (boolean): Whether the form has unsaved changes.

**Returns:**

- `navigateSafely(to, options?)` (function): Sets the internal `skipRef`, calls React Router `navigate(to, options)`, then resets the ref in a `queueMicrotask` so the guard re-arms even when navigation keeps the component mounted (e.g. a slug-change `replace`). Use after a successful save or on cancel.
- `getDirtyTitle(title)` (function): Wraps a title string/node with the pink dirty-dot indicator when `hasUnsavedChanges` is true.

Stay-in-place pages (`Settings.jsx`, App Settings) that don't navigate after save simply ignore `navigateSafely` — the guard still works from `hasUnsavedChanges` alone.

#### Used In

- `PagesAdd.jsx`, `PagesEdit.jsx`
- `MenusAdd.jsx`, `MenusEdit.jsx`, `MenuStructure.jsx`
- `CollectionItemAdd.jsx`, `CollectionItemEdit.jsx`
- `Settings.jsx`

## Selection & Shortcut Hooks

### `usePageSelection` (`packages/editor-ui/src/hooks/usePageSelection.js`)

Manages multi-item selection state for bulk operations, designed for page management but with reusable patterns.

#### Purpose

Provides selection state management for list interfaces that support bulk operations like deletion, with features like select-all and visual feedback.

#### API Reference

**Returns:**

- `selectedPages` (array): Currently selected page IDs
- `togglePageSelection(pageId)` (function): Toggles selection state for a specific page
- `selectAllPages(pageIds)` (function): Selects all pages from the provided ID array
- `clearSelection()` (function): Clears all selected pages
- `isAllSelected(pages)` (function): Returns true if all provided pages are selected

#### Integration

- **Pages Interface**: Used in `Pages.jsx` for bulk page operations
- **Bulk Operations**: Powers bulk deletion and other multi-page actions

### `useDeleteKeyShortcut` (`packages/editor-ui/src/hooks/useDeleteKeyShortcut.js`)

Editor-wide keyboard shortcut: <kbd>Delete</kbd> / <kbd>Backspace</kbd> removes the currently selected block or widget in the page editor.

#### API Reference

**Parameters:** None

**Returns:** None — registers a single `keydown` listener for the editor's lifetime.

#### Behavior

- Ignores the keystroke when a modifier (`meta`/`ctrl`/`alt`) is held or when the event target is an editable field — `isEditableTarget()` treats `INPUT`/`TEXTAREA`/`SELECT` and any `contentEditable` element as off-limits, so text editing keeps its Backspace.
- `resolveDeleteTarget()` decides what to remove from the current `widgetStore` selection: a selected block wins over its parent widget; `header`/`footer` are singletons and cannot be deleted (only their blocks can).
- Block deletes on a global widget (`header`/`footer`) persist via `saveStore.markWidgetModified`; block deletes on a page widget set `setStructureModified(true)`; widget deletes go through `deleteWidget`, which already signals the structure flag.
- Selection and store actions are read fresh from the stores on every keystroke (`useWidgetStore.getState()`), so the listener is registered once and never goes stale.

Both `isEditableTarget` and `resolveDeleteTarget` are exported for unit testing. Used in `PageEditor.jsx`.

## Layout Hooks

### `useStickyActionBar` (`packages/editor-ui/src/hooks/useStickyActionBar.js`)

Detects when a `position: sticky; bottom: 0` action bar is floating over scrollable content, so the caller can show a drop shadow only while it floats.

#### API Reference

**Parameters:**

- `deps` (array, optional): Re-establish the observer when these change (e.g. a collapsible section that alters the form's scroll height, or async content that loads after mount). Defaults to `[]`.

**Returns:**

- `sentinelRef` (`React.RefObject<HTMLElement>`): Attach to a 1px element placed **immediately after** the sticky bar in the DOM.
- `isStuck` (boolean): True while the bar is covering content (the sentinel is out of view).

#### Behavior

An `IntersectionObserver` watches the sentinel and roots on the actual scrolling ancestor (the app shell's `overflow-y-auto` container), not the window, since the form scrolls inside an inner container. When the sentinel — only visible at the very bottom or when the form is too short to scroll — leaves the viewport, `isStuck` flips true.

Used in `PageForm.jsx` and `CollectionItemForm.jsx`.

## Media Management Hooks

The media library is built from four cooperating hooks. They are documented in full in [Media Library](core-media.md); the one-line roles:

- `useMediaState` (`packages/editor-ui/src/hooks/useMediaState.js`) — core state, data loading, view-mode persistence, and search filtering for the media library.
- `useMediaUpload` (`packages/editor-ui/src/hooks/useMediaUpload.js`) — file upload operations with per-file XHR progress and toast feedback.
- `useMediaSelection` (`packages/editor-ui/src/hooks/useMediaSelection.js`) — file selection and deletion workflows, with usage-protection validation via `useConfirmationModal`.
- `useMediaMetadata` (`packages/editor-ui/src/hooks/useMediaMetadata.js`) — metadata-edit drawer state and saving (alt text, title) plus image viewing.

See [Media Library](core-media.md) for the full architecture, API, and usage-protection rules.

## Export Management Hooks

### `useExportState` (`packages/editor-ui/src/hooks/useExportState.js`)

Centralizes all export-related state for the static-site export system — project validation, export-history loading (with stale-response protection on project switch), max-versions from app settings, and last-export tracking. It is the primary hook for `ExportSite.jsx`.

Full behavior, history shape, and stale-response handling are documented in [Export System](core-export.md).

## App Settings Hooks

### `useAppSettings` (`packages/editor-ui/src/hooks/useAppSettings.js`)

Manages global application settings with schema-driven validation, nested dot-notation paths, change tracking, and save/cancel logic. Used by the App Settings page.

Full behavior is documented in [App Settings](core-appSettings.md).

### `useFormatDate` (`packages/editor-ui/src/hooks/useFormatDate.js`)

Formats dates using the current app-level date format from `useAppSettings()`.

#### Purpose

Removes repeated `useAppSettings()` wiring from list/history surfaces that only need to format timestamps for display. The low-level formatting logic lives in `packages/editor-ui/src/utils/dateFormatter.js`; this hook supplies the app-aware format string and a memoized formatter.

#### API Reference

**Returns:**

- `dateFormat` (string): The active app-level date format (`settings.general.dateFormat`), falling back to `DEFAULT_DATE_FORMAT`.
- `formatDate(date)` (function): Formats a `Date`, ISO string, or timestamp using the current app setting.

#### Used In

- List/history surfaces such as `Projects.jsx`, `Pages.jsx`, `Menus.jsx`, `ExportHistoryTable.jsx`, and media list rows.

## Collection Data Hooks

Two thin data-loading hooks for collections, mirroring the `useAppSettings` per-project pattern. See [Collections](core-collections.md) for the data model.

### `useCollections` (`packages/editor-ui/src/hooks/useCollections.js`)

Loads the active project's collection schemas. Per-project module-level cache (1-minute TTL, in-flight dedup).

**Returns:** `{ schemas, loading, error, refetch }`. `refetch()` forces a fresh fetch, bypassing the cache.

### `useCollectionItems` (`packages/editor-ui/src/hooks/useCollectionItems.js`)

Loads the items of a single collection type. Unlike schemas, item lists are **not** cached across navigations — list pages mutate them frequently, so each mount fetches fresh.

**Parameters:** `type` (collection type slug), `params` (optional query params: sort, invalid, limit, offset).

**Returns:** `{ items, loading, error, refetch }`.

## Link Target Hook

### `useLinkTargets` (`packages/editor-ui/src/hooks/useLinkTargets.js`)

Loads the link-target options for the active project — all pages plus the items of every `hasItemPages` collection — as a flat, grouped option list the shared `<Combobox>` renders (a "Pages" group plus one group per collection).

#### Purpose

Powers the link picker in `LinkInput.jsx` and the menu editor (`MenuEditor`). Each option carries a stable `value` that is a **uuid**, so a stored link reference survives renames; the rendered `href` is re-derived at render time from the uuid, so a briefly-stale picker label can never produce a wrong link. Collection-item options additionally carry `collectionType`, `slugPrefix`, and `slug`.

#### API Reference

**Returns:**

- `options` (array): Grouped option objects. Page options have `{ value: uuid, label, slug, isPage, group: "Pages" }`; collection-item options have `{ value: uuid, label, isCollectionItem, collectionType, slugPrefix, slug, group }`.
- `loading` (boolean): True while the first load is in flight.

**Named export:**

- `invalidateLinkTargetsCache(projectId?)` — drops the cached targets so the next load refetches. Call after creating, renaming, or deleting a page or collection item so a new target appears in the picker immediately instead of after the TTL. Clears one project when given an id, or all projects when omitted.

#### Caching

- Per-project module-level cache (1-minute TTL) shared across all `LinkInput` instances, so the many link inputs a page can host don't each refetch.
- Single in-flight promise per project deduplicates concurrent loads.

#### Used In

- `LinkInput.jsx` (settings link picker)
- `MenuEditor/index.jsx` (menu link picker)
- Cache invalidated from `CollectionItemAdd.jsx`, `CollectionItemEdit.jsx`, and `CollectionItems.jsx` after item writes.

## Theme Locale Hook

### `useThemeLocale` (`packages/editor-ui/src/hooks/useThemeLocale.js`)

Fetches the active project's theme locale JSON for the current language and provides a `tTheme()` resolver for `tTheme:`-prefixed i18n keys used in widget schemas.

#### Purpose

Widget `schema.json` files typically use `tTheme:`-prefixed keys for displayName, label, description, and option labels instead of plain English strings. This hook loads the active project's copied theme locale files and returns a resolver that translates those keys into localized strings at runtime. Non-prefixed strings are returned unchanged, so simpler one-off themes can use direct labels.

#### API Reference

**Returns:**

- `tTheme(str)` (function): If `str` starts with `tTheme:`, strips the prefix and walks the dot-path through the loaded locale object to return the translated string. Non-prefixed strings are returned as-is.

The pure resolver `resolveThemeKey(str, locale)` is exported separately so it can be unit-tested without React.

#### Caching

- Module-level locale cache keyed by `projectId:lang`, shared across all component instances via `useSyncExternalStore`.
- 5-minute staleness window before re-fetching.
- **Stale-while-revalidate**: when the cache expires, stale data keeps being served while the re-fetch runs in the background, preventing a flash of raw keys between expiry and fetch completion.
- Single in-flight promise (tracked at module level) deduplicates concurrent fetches across instances.
- **Developer-mode invalidation**: on first use the hook reads `/api/settings` once; if `developer.enabled` is true the cache is always treated as stale (`isStale()` returns true), so theme/locale edits show up without waiting out the TTL.
- Backend endpoint: `GET /api/themes/project/:projectId/locales/:lang` (served by `themeController.js`).
- Locale source: the project's copied `data/projects/<folder>/locales/`, merged server-side over the core widget locales in `packages/core/src/widgets/locales/` (the `themeController.js` `loadMergedLocale` / `CORE_WIDGET_LOCALES_DIR` path); requests for a missing language fall back to English.

#### Used In

~10 editor components including `SettingsPanel`, `ThemeSelector`, `PreviewPanel`, `BlockList`, `WidgetList`, `WidgetSelector`, `BlockSelector`, `WidgetItem`, `BlockItem`, and `EditorTopBar`.

---

## Hook Design Patterns

### Common Patterns

1. **Separation of Concerns**: Each hook handles a specific aspect of functionality
2. **Reusability**: Hooks are designed to be reusable across different components
3. **State Isolation**: Each hook manages its own state without interfering with others
4. **Error Handling**: Comprehensive error handling with user feedback
5. **Integration Points**: Hooks are designed to work together when needed (e.g. `useConfirmationAction` over `useConfirmationModal`, `useGuardedFormPage` over `useFormNavigationGuard`)

### Best Practices

- **Single Responsibility**: Each hook has a clear, single purpose
- **Predictable APIs**: Consistent naming and return patterns across hooks
- **Performance**: Module-level per-project caches and in-flight dedup where data is project-scoped (`useCollections`, `useLinkTargets`, `useThemeLocale`)
- **Testing**: Pure helpers (`resolveThemeKey`, `resolveDeleteTarget`, `isEditableTarget`) are exported for unit tests

---

**See also:**

- [App Settings](core-appSettings.md) — settings managed by `useAppSettings`
- [Export System](core-export.md) — export functionality using `useExportState`
- [Media Library](core-media.md) — media management using the media hooks
- [Collections](core-collections.md) — data model behind `useCollections` / `useCollectionItems` / `useLinkTargets`
- [Page Editor](core-page-editor.md) — editor functionality using the navigation guards and delete shortcut
- [Themes](core-themes.md) — theme locale files resolved by `useThemeLocale`
