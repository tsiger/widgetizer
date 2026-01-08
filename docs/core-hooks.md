# Custom Hooks

This document provides documentation for the custom React hooks used throughout the Widgetizer application. These hooks encapsulate common functionality and provide reusable state management patterns.

## Confirmation & Modal Hooks

### `useConfirmationModal` Hook (`src/hooks/useConfirmationModal.js`)

A reusable hook for managing confirmation modal state and workflows, commonly used for destructive actions throughout the application.

#### Purpose

This hook standardizes confirmation dialogs across the application, providing consistent UX for operations like deletion, bulk operations, and other destructive actions.

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

- `onConfirm` (function): Callback function executed when user confirms the action. Receives the `data` object passed to `openModal`.

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

## Navigation & Protection Hooks

### `useNavigationGuard` Hook (`src/hooks/useNavigationGuard.js`)

Provides comprehensive navigation protection to prevent users from losing unsaved changes when attempting to leave pages.

#### Purpose

This hook implements a two-layer protection system for preventing accidental data loss during navigation:

1. **Browser Navigation Protection**: Prevents tab closing, URL changes, and browser navigation
2. **Internal Navigation Protection**: Provides guarded navigation for React Router

#### Usage

```javascript
import useNavigationGuard from "../hooks/useNavigationGuard";

function PageEditor() {
  const { guardedNavigate, hasUnsavedChanges } = useNavigationGuard();

  const handlePageSwitch = (pageId) => {
    // This will show confirmation if there are unsaved changes
    guardedNavigate(`/page-editor?pageId=${pageId}`);
  };

  return (
    <div>
      {hasUnsavedChanges && <span>You have unsaved changes</span>}
      {/* Component content */}
    </div>
  );
}
```

#### API Reference

**Returns:**

- `guardedNavigate(to, options)` (function): Protected navigation function
  - Returns `true` if navigation proceeded, `false` if cancelled
  - Shows confirmation dialog if there are unsaved changes
- `hasUnsavedChanges` (boolean): Current unsaved changes state
- `checkUnsavedChanges()` (function): Function to check current unsaved state

#### Integration Points

- **Page Editor**: Primary use case for protecting page editing workflows
- **Layout Component**: Integrates with sidebar navigation when on editor routes
- **Editor Top Bar**: Used for page switching within the editor

#### Key Features

- **Smart Detection**: Only triggers when there are actual unsaved changes
- **Browser Integration**: Uses `beforeunload` event for browser navigation protection
- **Custom Dialogs**: Shows user-friendly confirmation dialogs for internal navigation
- **Automatic Cleanup**: Properly removes event listeners on component unmount

### `useFormNavigationGuard` Hook (`src/hooks/useFormNavigationGuard.js`)

A simplified navigation guard hook specifically designed for form pages with a single bool boolean parameter.

#### Purpose

Provides streamlined navigation protection for form-based pages (Projects, Pages, App Settings, etc.) where the dirty state is tracked by form libraries like react-hook-form.

#### Usage

```javascript
import useFormNavigationGuard from "../hooks/useFormNavigationGuard";

function ProjectForm() {
  const {
    formState: { isDirty },
  } = useForm();

  // Protect against navigation when form is dirty
  useFormNavigationGuard(isDirty);

  return <form>...</form>;
}
```

#### API Reference

**Parameters:**

- `hasUnsavedChanges` (boolean): Whether the form has unsaved changes

**Returns:**

- Nothing (hook handles protection automatically)

#### Key Features

- **Simplified API**: Single boolean parameter instead of complex state management
- **Browser Protection**: Prevents tab closing and URL changes when form is dirty
- **React Router Integration**: Works seamlessly with react-router-dom navigation
- **Automatic Cleanup**: Removes event listeners on unmount

#### Used In

- Form pages throughout the application:
  - `AppSettings.jsx`
  - `ProjectsAdd.jsx`, `ProjectsEdit.jsx`
  - `PagesAdd.jsx`, `PagesEdit.jsx`
  - Theme settings forms
  - Menu editing forms

## Selection & State Management Hooks

### `usePageSelection` Hook (`src/hooks/usePageSelection.js`)

Manages multi-item selection state for bulk operations, specifically designed for page management but with reusable patterns.

#### Purpose

Provides comprehensive selection state management for list interfaces that support bulk operations like deletion, with features like select-all and visual feedback.

#### Usage

```javascript
import { usePageSelection } from "../hooks/usePageSelection";

function PagesList() {
  const { selectedPages, togglePageSelection, selectAllPages, clearSelection, isAllSelected } = usePageSelection();

  const handleSelectAll = () => {
    if (isAllSelected(pages)) {
      clearSelection();
    } else {
      selectAllPages(pages.map((page) => page.id));
    }
  };

  return (
    <div>
      <input type="checkbox" checked={isAllSelected(pages)} onChange={handleSelectAll} />
      {pages.map((page) => (
        <PageItem
          key={page.id}
          page={page}
          selected={selectedPages.includes(page.id)}
          onSelect={() => togglePageSelection(page.id)}
        />
      ))}
    </div>
  );
}
```

#### API Reference

**Returns:**

- `selectedPages` (array): Array of currently selected page IDs
- `togglePageSelection(pageId)` (function): Toggles selection state for a specific page
- `selectAllPages(pageIds)` (function): Selects all pages from the provided ID array
- `clearSelection()` (function): Clears all selected pages
- `isAllSelected(pages)` (function): Returns true if all provided pages are selected

#### Integration

- **Pages Interface**: Used in `Pages.jsx` for bulk page operations
- **Visual Feedback**: Integrates with UI to show selected states
- **Bulk Operations**: Powers bulk deletion and other multi-page actions

## Media Management Hooks

### Media Hook Architecture

The media system uses a modular hook architecture that separates different aspects of media functionality:

#### `useMediaState` Hook (`src/hooks/useMediaState.js`)

**Purpose**: Core state management and data loading for the media library.

**Key Features:**

- Files list management and loading states
- View mode persistence (grid/list) in localStorage
- Real-time search filtering by filename
- Integration with project store for active project
- Manual usage tracking refresh functionality

#### `useMediaUpload` Hook (`src/hooks/useMediaUpload.js`)

**Purpose**: Handles all file upload operations with progress tracking.

**Key Features:**

- Real-time progress tracking using XMLHttpRequest
- Multi-file processing with individual progress indicators
- Comprehensive error handling and user feedback
- Toast notifications for success, warning, and error states
- Integration with parent component state updates

#### `useMediaSelection` Hook (`src/hooks/useMediaSelection.js`)

**Purpose**: Manages file selection and deletion workflows for the media library.

**Key Features:**

- Multi-file selection state management
- Bulk operations (select all/none) with filtering support
- Deletion logic with usage protection validation
- Integration with `useConfirmationModal` for safe deletion
- Prevents deletion of files currently in use by pages

#### `useMediaMetadata` Hook (`src/hooks/useMediaMetadata.js`)

**Purpose**: Handles metadata editing workflows and drawer management.

**Key Features:**

- Drawer visibility and state management
- File metadata editing (alt text, title)
- API integration for saving metadata changes
- Loading states for save operations
- File viewing functionality for both images and videos

## Export Management Hooks

### `useExportState` Hook (`src/hooks/useExportState.js`)

Manages all export-related state and data loading for the static site export system.

#### Purpose

Centralizes export functionality including project validation, export history management, and settings integration.

#### Key Features

- **Project State**: Active project information and validation
- **Export History**: Loading and managing export version history with automatic refresh
- **Settings Integration**: Max versions configuration from app settings
- **Data Loading**: Centralized data fetching with error handling
- **Version Management**: Last export tracking and history updates

#### Usage Context

Primary hook for the `ExportSite.jsx` page, providing all necessary state and data for both export creation and history management components.

## App Settings Hooks

### `useAppSettings` Hook (`src/hooks/useAppSettings.js`)

Manages global application settings with schema-driven validation and nested object support.

#### Purpose

Provides comprehensive state management for application-wide settings including media processing, export configuration, and other system-level options.

#### Key Features

- **Schema Integration**: Loads and merges with JSON schema defaults
- **Nested Object Support**: Handles dot-notation paths for complex settings structures
- **Change Tracking**: Automatic detection of unsaved changes
- **Data Validation**: Type conversion and validation before saving
- **Save/Cancel Logic**: Complete workflow management with undo functionality

#### Usage

Used by `AppSettings.jsx` page for managing system-wide configuration that affects all projects and users.

## Hook Design Patterns

### Common Patterns

1. **Separation of Concerns**: Each hook handles a specific aspect of functionality
2. **Reusability**: Hooks are designed to be reusable across different components
3. **State Isolation**: Each hook manages its own state without interfering with others
4. **Error Handling**: Comprehensive error handling with user feedback
5. **Integration Points**: Hooks are designed to work together when needed

### Best Practices

- **Single Responsibility**: Each hook has a clear, single purpose
- **Predictable APIs**: Consistent naming and return patterns across hooks
- **Error Boundaries**: Proper error handling and user feedback
- **Performance**: Efficient state updates and re-render optimization
- **Testing**: Hooks are designed to be easily unit tested

### Usage Guidelines

- Use hooks to encapsulate complex state logic
- Combine multiple hooks for comprehensive functionality
- Always handle loading and error states
- Provide user feedback for async operations
- Follow the established patterns for consistency

---

**See also:**

- [App Settings](core-app-settings.md) - Settings managed by `useAppSettings` hook
- [Export System](core-export.md) - Export functionality using `useExportState` hook
- [Media Library](core-media.md) - Media management using media hooks
- [Page Editor](core-page-editor.md) - Editor functionality using navigation guards
