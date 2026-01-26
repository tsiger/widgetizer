# Page Editor (`PageEditor.jsx`)

## Overview

The `PageEditor` is the primary component for building and editing pages within the application. It serves as a central orchestrator, bringing together various UI panels, modals, and state management stores to provide a comprehensive visual editing experience.

The editor's interface is divided into three main columns: a component list on the left, a live preview in the center, and a settings panel on the right. It supports a real-time preview that updates as you modify widgets and settings.

## Component Structure

The `PageEditor` is composed of several specialized child components, each with a distinct responsibility:

- **`EditorTopBar`**: Located at the top of the page, this component displays the page name and provides global actions. It contains controls for manual saving, opening a live preview in a new tab, changing the preview mode (e.g., desktop, tablet, mobile), and shows the current save status (e.g., "All changes saved", "Saving..."). Fully localized.

- **`WidgetList`**: The left-hand panel that displays the hierarchical structure of all widgets and their inner blocks for the current page. It's the main interface for:
  - Selecting widgets or blocks for editing.
  - Reordering widgets and blocks via drag-and-drop.
  - Adding, duplicating, and deleting widgets.
  - Adding blocks to a widget.

- **`PreviewPanel`**: The central panel that renders a live, interactive preview of the page. It has been refactored to work declaratively. Instead of being told _how_ to change, it simply receives the latest application state from the editor and uses a central `updatePreview` function to synchronize the `<iframe>`'s DOM. In editor mode, link navigation is intercepted to avoid leaving the editor while still allowing widget/block selection. In standalone preview mode, internal `.html` links route to `/preview/:slug`, while external links remain disabled.

- **`SettingsPanel`**: The right-hand panel. When a widget or block is selected, this panel dynamically displays the relevant configuration options based on its schema. All changes made here are immediately applied to the selected component and reflected in the preview.

- **`WidgetSelector`**: A modal dialog that opens when the user wants to add a new widget to the page. It presents a list of available widgets to choose from.

- **`BlockSelector`**: Similar to the `WidgetSelector`, this modal allows the user to add a nested block (e.g., a slide in a carousel, a column in a grid) to a compatible widget.

- **`ConfirmationModal`**: A generic modal used to confirm potentially destructive actions, ensuring the user doesn't accidentally delete content. It is used, for example, when deleting a widget. Localized messages and actions.

## State Management and Data Flow

The `PageEditor` does not manage complex state internally. Instead, it relies on a set of [Zustand](https://github.com/pmndrs/zustand) stores for centralized, modular state management. This keeps the component lean and focused on orchestration.

- **`useProjectStore`**: Manages the currently active project. The editor requires an active project to know which database or context to load the page from.
- **`usePageStore`**: Responsible for fetching and holding the core page data itself, including its name and the top-level list of widgets it contains.
- **`useWidgetStore`**: Manages all state related to widgets. This includes loading the available widget schemas, tracking the currently selected widget/block, and handling all actions for manipulating widgets and blocks (add, delete, update settings, reorder, etc.).
- **`useThemeStore`**: Loads and provides global theme settings (e.g., fonts, colors) that affect the overall appearance of the page in the `PreviewPanel`.
- **`useAutoSave`**: A critical store that manages the saving mechanism. It tracks whether there are unsaved changes and performs automatic background saves, reducing the need for constant manual saving.

## Core Workflows

### Loading a Page

1.  The `PageEditor` mounts and reads the `pageId` from the URL search parameters.
2.  A `useEffect` hook, dependent on the `pageId` and an `activeProject`, triggers the data loading functions from the relevant stores.
3.  It calls `usePageStore.getState().loadPage(pageId)` to fetch the page structure.
4.  Simultaneously, it calls `useWidgetStore.getState().loadSchemas()` and `useThemeStore.getState().loadSettings()` to get required widget definitions and theme data.
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
7.  It triggers a master `updatePreview` function located in `src/utils/previewManager.js`. This function intelligently diffs the new state against the previous state and applies only the necessary changes to the preview `<iframe>`. This ensures the preview is always a perfect, up-to-date reflection of the application state and resolves complex ordering and selection bugs.

### Previewing a Page

The editor provides a way to see a true, live preview of the page, exactly as an end-user would see it, free of any editor UI.

1.  The user clicks the **Preview** button in the `EditorTopBar`.
2.  This opens a new browser tab at the `/preview/:pageId` URL.
3.  This route is handled by the `PagePreview` component, which is separate from the main editor layout.
4.  `PagePreview` fetches the page data and its corresponding server-rendered HTML.
5.  The raw HTML is then displayed within an `<iframe>`, providing an accurate representation of the final published page.
6.  Internal `.html` links in the preview navigate to other `/preview/:slug` pages, while external links remain disabled.

### Saving Changes

The editor is designed to save changes automatically, providing a seamless user experience.

1.  Most actions that alter page data—such as editing a setting, adding a widget, or reordering the list—also call a corresponding function on the `useAutoSave` store (e.g., `markWidgetModified`, `setStructureModified`).
2.  These functions set an internal `hasUnsavedChanges` flag to `true`, which is reflected in the `EditorTopBar` UI (e.g., the "Save" button becomes enabled). The system also performs deep comparison between current and original states to ensure the flag correctly reflects changes after undo/redo operations.
3.  The `useAutoSave` store implements a **debounced auto-save** strategy. Instead of a fixed interval, a 60-second timer is reset on every modification. This ensures that auto-saving only occurs after a period of inactivity, providing a smoother experience.
4.  For immediate persistence, the user can also click the "Save" button in the `EditorTopBar` (or use the `Ctrl+S` / `Cmd+S` shortcut), which directly invokes the `save()` action.

### Undo/Redo System

The Page Editor features a comprehensive undo/redo system powered by `zundo` (Zustand temporal state management).

- **Implementation**: The `usePageStore` is wrapped with `temporal` middleware to track changes to the page content.
- **Tracked Data**:
  - `page`: All widget settings and top-level page metadata.
  - `globalWidgets`: Changes to the header and footer widgets.
  - `themeSettings`: Theme-wide settings (only when edited within the Page Editor).
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

The page editor implements comprehensive navigation protection to prevent users from accidentally losing unsaved changes when attempting to leave the editor.

#### Implementation (`src/hooks/useNavigationGuard.js`)

The `useNavigationGuard` hook provides a two-layer protection system:

**Layer 1: Browser Navigation Protection**

- Listens for the browser's `beforeunload` event
- Prevents tab closing, URL changes, and browser back/forward navigation when there are unsaved changes
- Shows the browser's standard "unsaved changes" warning dialog

**Layer 2: Internal Navigation Protection**

- Provides a `guardedNavigate` function that replaces React Router's standard `navigate`
- Shows a custom confirmation dialog before allowing internal navigation
- Used in components like `EditorTopBar` for page switching and `Layout` for sidebar navigation

#### Usage in Page Editor

The page editor integrates navigation protection in several ways:

1. **Automatic Setup**: The `PageEditor` component calls `useNavigationGuard()` to activate protection
2. **Sidebar Integration**: The main `Layout` component passes `guardedNavigate` to the `Sidebar` when on the page editor route
3. **Page Switching**: The `EditorTopBar` uses `guardedNavigate` for switching between pages in the dropdown

#### Key Features

- **Smart Detection**: Only triggers protection when there are actual unsaved changes
- **User Choice**: Allows users to choose whether to discard changes or stay on the page
- **Seamless Integration**: Works with both browser navigation and React Router navigation

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
- **Storage**: Global widget data is stored in `pageStore.globalWidgets` object with `header` and `footer` properties
- **Updates**: Changes trigger `updateGlobalWidget()` which maintains separation from page widget data

#### Key Differences from Page Widgets

- **Persistence**: Global widget changes affect all pages that use the theme
- **No Reordering**: Global widgets cannot be reordered or moved
- **Fixed Position**: Header always appears first, footer always appears last
- **Theme-wide**: Changes apply to the entire project, not just the current page

---

**See also:**

- [Page Management](core-pages.md) - Page CRUD operations
- [Custom Hooks](core-hooks.md) - `useNavigationGuard` and other hooks
- [Theming Guide](theming.md) - Widget schemas and settings
