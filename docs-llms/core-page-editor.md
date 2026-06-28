# Page Editor (`PageEditor.jsx`)

## Overview

The `PageEditor` is the primary component for building and editing pages within the application. It serves as a central orchestrator, bringing together various UI panels, modals, and state management stores to provide a comprehensive visual editing experience.

The editor's interface is divided into three main columns: a component list on the left, a live preview in the center, and a settings panel on the right. It supports a real-time preview that updates as you modify widgets and settings.

> **Library note.** The page editor now ships inside the `@widgetizer/editor-ui` package (`packages/editor-ui/src/`), mounted by the OSS shell and embeddable in a host. Its API calls route through the `apiBase` singleton via `editorFetch` (auto-injecting `X-Project-Id`) and its internal links resolve through `useEditorPath`, so the editor is host-agnostic. See [Packages & Adapter Architecture](core-packages.md#the-editor-ui-library-seams).

## Component Structure

The `PageEditor` is composed of several specialized child components, each with a distinct responsibility:

- **`EditorTopBar`**: Located at the top of the page, this component displays the page name and provides global actions. It contains controls for manual saving, opening a live preview in a reusable browser tab (web) or dedicated preview window (Electron), changing the preview mode (e.g., desktop, tablet, mobile), and shows the current save status (e.g., "All changes saved", "Saving..."). Fully localized.

- **`WidgetList`**: The left-hand panel that displays the hierarchical structure of all widgets and their inner blocks for the current page. It's the main interface for:
  - Selecting widgets or blocks for editing.
  - Reordering widgets and blocks via drag-and-drop.
  - Adding, duplicating, and deleting widgets.
  - Adding blocks to a widget.

- **`PreviewPanel`**: The central panel that renders a live, interactive preview of the page. It works declaratively. Instead of being told _how_ to change, it simply receives the latest application state from the editor and uses a central `updatePreview` function to synchronize the `<iframe>`'s DOM. Link navigation is intercepted to avoid leaving the editor while still allowing widget/block selection. `PreviewPanel` is mounted **only** in the in-editor live preview; the standalone site preview uses a separate headless flow (`SitePreviewLayout` + `PagePreview` + `PreviewStage`, see "Previewing a Page" below).

- **`SettingsPanel`**: The right-hand panel. When a widget or block is selected, this panel dynamically displays the relevant configuration options based on its schema. All changes made here are immediately applied to the selected component and reflected in the preview. Schema labels that use `tTheme:` prefixed keys are resolved at render time through the `useThemeLocale` hook's `tTheme()` function.

- **`WidgetSelector`**: A modal dialog that opens when the user wants to add a new widget to the page. It presents a list of available widgets to choose from.

- **`BlockSelector`**: Similar to the `WidgetSelector`, this modal allows the user to add a nested block (e.g., a slide in a carousel, a column in a grid) to a compatible widget.

- **`ConfirmationModal`**: A generic modal used to confirm potentially destructive actions, ensuring the user doesn't accidentally delete content. It is used, for example, when deleting a widget. Localized messages and actions.

## State Management and Data Flow

The `PageEditor` does not manage complex state internally. Instead, it relies on a set of [Zustand](https://github.com/pmndrs/zustand) stores for centralized, modular state management. This keeps the component lean and focused on orchestration.

- **`useProjectStore`**: Manages the currently active project. The editor requires an active project to know which database or context to load the page from.
- **`usePageStore`**: Responsible for fetching and holding the core page data itself, including its name and the top-level list of widgets it contains.
- **`useWidgetStore`**: Manages all state related to widgets. This includes loading the available widget schemas, tracking the currently selected widget/block, and handling all actions for manipulating widgets and blocks (add, delete, update settings, reorder, etc.).
- **`useThemeStore`**: Canonical owner of theme settings for the active project. Both the Settings page and the editor read/write through this store.
- **`usePageStore`**: Also holds `globalWidgets` plus a thin `themeSettingsSnapshot` used only so theme edits participate in the editor's unified undo/redo history.
- **`saveStore.js`** (exported as `useAutoSave`): A critical store that manages the saving mechanism. It tracks whether there are unsaved changes and performs automatic background saves, reducing the need for constant manual saving.

## Core Workflows

### Loading a Page

1.  The `PageEditor` mounts and reads the `pageId` from the URL search parameters.
2.  A `useEffect` hook, dependent on the `pageId` and the current active-project identity, triggers the data loading functions from the relevant stores. Project switches are also handled one level higher: `RequireActiveProject` remounts the workspace subtree by project ID, and the OSS shell resets project-scoped singleton stores via `projectSwitchCoordinator`.
3.  It calls `usePageStore.getState().loadPage(pageId)` to fetch the page structure.
4. Simultaneously, it calls `useWidgetStore.getState().loadSchemas()`. `pageStore.loadPage()` fetches page data and global widgets, then ensures `themeStore` has theme settings for the same project before capturing a history snapshot for undo/redo. Project-switch store reset is coordinated by the OSS shell's `projectSwitchCoordinator`.
5.  While data is being fetched, `LoadingSpinner` components are displayed to inform the user.

### Editing a Widget

1.  A user clicks on a widget in the `WidgetList` or `PreviewPanel`.
2.  The `handleWidgetSelect` callback is invoked, which updates the `selectedWidgetId` in the `useWidgetStore`.
3.  The `SettingsPanel` listens for changes to `selectedWidgetId` and re-renders to show the settings for the newly selected widget.
4.  The user modifies a setting in the `SettingsPanel`. The `handleSettingChange` function is called.
5.  This function executes two key actions:
    - It calls `updateWidgetSettings()` from the `useWidgetStore` to update the data.
    - It calls `useAutoSave.getState().markWidgetModified()` to notify the save store that a change has occurred.
6.  The `PreviewPanel`, subscribed to all relevant stores, detects the state change.
7.  It triggers a master `updatePreview` function located in `packages/editor-ui/src/queries/previewManager.js`. This function intelligently diffs the new state against the previous state and applies only the necessary changes to the preview `<iframe>`. This ensures the preview is always a perfect, up-to-date reflection of the application state and resolves complex ordering and selection bugs.

#### Preview Update Messages

The preview iframe communicates via `postMessage`. For non-structural changes, `updatePreview` sends targeted messages instead of reloading:

| Message | When | What it does |
|---------|------|-------------|
| `MORPH_WIDGET` | Widget settings/blocks change | Fetches re-rendered widget HTML and replaces the DOM node |
| `UPDATE_CSS_VARIABLES` | Theme colors/fonts/scales change | Updates `<style id="theme-settings-styles">` with new CSS variable values |
| `LOAD_FONTS` | Font picker changes | Injects/updates Google Fonts `<link>` tag |
| `UPDATE_STYLE_CLASSES` | Theme style settings change (shapes, card style, spacing, etc.) | Swaps body classes (e.g., `corner-sharp` → `corner-rounded`) to activate different CSS rulesets |
| `UPDATE_BODY_CLASS` | Header transparent setting changes | Toggles a CSS class on `<body>` (e.g., `transparent-header`) |
| `UPDATE_WIDGET_SETTINGS` | Simple text/image changes | Optimistic instant feedback before morph completes |

Handlers live in `packages/core/src/runtime/previewRuntime.js` (injected into the iframe).

**Transparent header sync:** When the header's `transparent_on_hero` setting is toggled, the editor sends an `UPDATE_BODY_CLASS` message to add/remove the `transparent-header` class from the iframe's `<body>`. The preview runtime also manages `header-scrolled` state on the header element after morphs, since the theme's scroll listener (`scripts.js`) references the pre-morph element. A persistent scroll listener in the runtime re-queries the current header element from the DOM to keep the transparent/solid transition working correctly.

### Previewing a Page

The editor provides a way to see a true, live preview of the page, exactly as an end-user would see it, free of any editor UI.

1.  The user clicks the **Preview** button in the `EditorTopBar`.
2.  In the web app, this opens or reuses a named browser tab at the `/preview/:pageId` URL.
3.  In Electron, the toolbar uses IPC to open or reuse a dedicated `BrowserWindow` for preview. New windows match the editor bounds with an offset; subsequent opens restore the window if minimized, then show and focus it.
4.  The `/preview` route is a persistent `SitePreviewLayout` (separate from the main editor layout) that owns the toolbar + iframe stage; its children resolve a render for it. `PagePreview` handles `:pageId`; `CollectionItemPagePreview` handles `collection/:prefix/:slug`.
5. These children are **headless one-shot resolvers** (they render `null`): `PagePreview` fetches the page data, mints a render token, and reports the resulting render src up to the layout via outlet context. `PagePreview` uses the headless preview flow instead of the live-edit `PreviewPanel`.
6.  `SitePreviewLayout` displays that src in a shared `PreviewStage` `<iframe>`, providing an accurate representation of the final published page. Because the layout is persistent, navigating page↔item never remounts the toolbar/iframe.
7.  Internal `.html` links in the preview post `NAVIGATE_PREVIEW` up to `SitePreviewLayout`, which routes to other `/preview/:slug` pages, while external links remain disabled.

### Saving Changes

The editor is designed to save changes automatically, providing a seamless user experience.

1.  Most actions that alter page data—such as editing a setting, adding a widget, or reordering the list—also call a corresponding function on the `useAutoSave` store (e.g., `markWidgetModified`, `setStructureModified`).
2.  These functions set internal dirty flags and also rely on deep comparison between current and original page/theme state so the `EditorTopBar` reflects the real save state after undo/redo operations.
3.  The `useAutoSave` store implements a **debounced auto-save** strategy. Instead of a fixed interval, a 60-second timer is reset on every modification. This ensures that auto-saving only occurs after a period of inactivity, providing a smoother experience.
4.  For immediate persistence, the user can also click the "Save" button in the `EditorTopBar` (or use the `Ctrl+S` / `Cmd+S` shortcut), which directly invokes the `save()` action.

### Undo/Redo System

The Page Editor features a comprehensive undo/redo system powered by `zundo` (Zustand temporal state management).

- **Implementation**: The `usePageStore` is wrapped with `temporal` middleware to track page content, global widgets, and a theme snapshot.
- **Tracked Data**:
  - `page`: All widget settings and top-level page metadata.
  - `globalWidgets`: Changes to the header and footer widgets.
  - `themeSettingsSnapshot`: Theme-wide settings snapshot stored only for editor history; undo/redo pushes the restored snapshot back into `themeStore`.
- **UI Controls**: The `EditorTopBar` includes Undo and Redo buttons that reflect the current history state.
- **Keyboard Shortcuts**:
  - `Ctrl+Z` (or `Cmd+Z`): Undo
  - `Ctrl+Shift+Z` (or `Cmd+Shift+Z`) / `Ctrl+Y`: Redo
  - `Ctrl+S` (or `Cmd+S`): Save Changes
- **History Management**:
  - The history is cleared whenever a new page is loaded to prevent cross-page undoing.
  - The system tracks up to 50 states by default.
  - It intelligently handles state snapshots to ensure that only relevant data changes (and not loading/error states) are recorded.

### Navigation Protection (`useNavigationGuard`)

The page editor protects against accidental loss of unsaved changes when the user tries to leave the editor. The `PageEditor` activates this by calling `useNavigationGuard()` (in `packages/editor-ui/src/hooks/useNavigationGuard.js`); the hook operates entirely through side effects and returns nothing.

It layers a `beforeunload` listener (tab close, URL change, browser back/forward) over React Router's `useBlocker` (in-app navigation), and only engages when the save store reports actual unsaved changes. On confirm-to-leave it resets the unsaved-changes state. For the full hook contract — both protection layers, the confirmation flow, and integration notes — see [Custom Hooks](core-hooks.md).

### Editing Global Widgets

The page editor supports editing global widgets (header and footer) alongside regular page widgets, providing a unified editing experience.

#### Global Widget Selection

Global widgets appear in the `WidgetList` component as fixed, non-draggable items:

- **Header Widget**: Displayed at the top of the widget list with a "Global Header" label
- **Footer Widget**: Displayed at the bottom of the widget list with a "Global Footer" label
- **Visual Distinction**: Global widgets use a different visual styling (grey background) to distinguish them from page widgets

#### Global Widget Settings

When a global widget is selected:

1. **Selection State**: Tracked separately from page widgets using `selectedGlobalWidgetId` in the widget store
2. **Settings Panel**: The `SettingsPanel` component detects global widget selection and loads the appropriate schema
3. **Settings Persistence**: Changes to global widget settings are saved using `updateGlobalWidgetSettings()` which updates the global widget data
4. **Real-time Updates**: Changes are immediately reflected in the preview panel

#### State Management

Global widgets are managed through the `usePageStore`:

- **Loading**: Global widgets are loaded separately from page data using `loadGlobalWidgets()`
- **Storage**: Global widget data is stored in `pageStore.globalWidgets` object with `header` and `footer` properties (including `blocks` and `blocksOrder` when the widget schema defines block types)
- **Updates**: Changes trigger `updateGlobalWidget()` which maintains separation from page widget data

#### Block Support

Global widgets support blocks with the same `blocks`/`blocksOrder` data model as page widgets. When a global widget's schema defines block types (via the `blocks` array in `schema.json`), the editor displays full block management UI:

- **Rendering**: The `FixedWidgetItem` component renders blocks (add, reorder via drag-and-drop, delete, duplicate) when the widget schema has block definitions
- **Settings**: The `SettingsPanel` shows block-specific settings when a block within a global widget is selected
- **Store Operations**: All block operations (`addBlock`, `deleteBlock`, `reorderBlocks`, `updateBlockSettings`, `duplicateBlock`) in `widgetStore.js` work for both page widgets and global widgets via internal helpers (`isGlobalWidgetId()`, `getWidgetData()`, `setWidgetData()`)
- **Save**: Block changes to global widgets are tracked via `markWidgetModified("header"/"footer")` and saved through the existing global widget save path
- **Preview**: Block changes are reflected in the live preview immediately, same as page widget blocks

#### Key Differences from Page Widgets

- **Persistence**: Global widget changes affect all pages that use the theme
- **No Reordering**: Global widgets cannot be reordered or moved
- **Fixed Position**: Header always appears first, footer always appears last
- **Theme-wide**: Changes apply to the entire project, not just the current page
- **Blocks**: Fully supported — same block add/edit/reorder/delete/duplicate capabilities as page widgets

---

**See also:**

- [Page Management](core-pages.md) - Page CRUD operations
- [Custom Hooks](core-hooks.md) - `useNavigationGuard` and other hooks
- [Theming Guide](theming.md) - Widget schemas and settings
