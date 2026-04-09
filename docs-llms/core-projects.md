# Project Management Workflow

This document provides a detailed overview of how projects are created, managed, and updated within the application. After the workspace merge, projects now live in a separate admin area and act as the entry point into the site workspace.

## Core Components & Pages

The project management UI is primarily handled by three pages:

1.  **`Projects.jsx`**: The main project listing page.
2.  **`ProjectsAdd.jsx`**: The page for creating a new project.
3.  **`ProjectsEdit.jsx`**: The page for modifying an existing project.

These pages rely on a central form component for handling user input:

- **`ProjectForm.jsx`**: A reusable form for both creating and editing project details (title, theme, folder name, description, site title, website address)
  - Migrated to **react-hook-form** for improved validation and state management
  - Fully **localized** using `react-i18next` for all labels, errors, and help text
  - Exposes `isDirty` state to parent components for navigation guard integration
  - Automatic slug generation from project name for new projects
  - **Preset selection**: When a theme with presets is selected, fetches presets via `GET /api/themes/{themeId}/presets` and displays a visual card grid with preset screenshots, names, and descriptions. The default preset is pre-selected. The selected preset ID is included in the form data as `preset`.

## Client-Side Routing

The application uses `react-router-dom` to handle navigation between these pages:

- `/`: Redirects to `/pages` when an active project exists, otherwise `/projects`
- `/projects`: Renders the `Projects.jsx` page, showing the list of all projects.
- `/projects/add`: Renders the `ProjectsAdd.jsx` page.
- `/projects/edit/:id`: Renders the `ProjectsEdit.jsx` page, where `:id` is the unique ID of the project being edited.

### Admin vs Workspace Flow

- `/projects`, `/themes`, and `/app-settings` live inside `ProjectPickerLayout`, the admin shell.
- `/pages`, `/menus`, `/media`, `/settings`, and `/export-site` live inside the site workspace shell and require an active project.
- Project-selection routes can preserve a `next` query param. `resolveWorkspaceDestination()` normalizes that value so project creation/opening can return the user to the intended workspace tool (default: `/pages`).

---

## Data Flow & State Management

Project state is managed by a central **Zustand store** defined in `src/stores/projectStore.js`. This store is the single source of truth for the currently active project and provides actions to interact with it.

Data fetching and backend communication are handled by utility functions in `src/queries/projectManager.js`.

### The `projectManager.js` Utility

This file contains functions that make API calls to the backend:

- `getAllProjects()`: Fetches a list of all projects via a lightweight cached wrapper with request deduplication and mutation-driven invalidation.
- `createProject(formData)`: Creates a new project.
- `updateProject(id, formData)`: Updates an existing project.
- `deleteProject(id)`: Deletes a project.
- `duplicateProject(id)`: Creates a copy of a project.
- `getActiveProject()`: Retrieves the currently active project.
- `setActiveProject(id)`: Sets a project as the active one.
- `exportProject(id)`: Exports a project as a downloadable ZIP file.
- `importProject(file)`: Imports a project from a ZIP file.

---

## Detailed Workflows

### 1. Creating a New Project

1.  **Navigation**: The user clicks the "New project" button on the `Projects.jsx` page, which navigates them to `/projects/add`.
2.  **Rendering**: The `ProjectsAdd.jsx` page is rendered. It contains the `ProjectForm.jsx` component.
3.  **Navigation Guard**: The page integrates `useFormNavigationGuard` to prevent accidental navigation with unsaved changes.
4.  **Theme Loading**: `ProjectForm.jsx` makes an API call via `/api/themes` to fetch the list of available themes and populates the "Theme" dropdown.
5.  **User Input**: The user fills in the title and selects a theme. Additional fields (folder name, description, site title, website address) are available under "More settings". The "Theme" dropdown is only enabled during project creation.
5b. **Preset Selection**: If the selected theme has presets, a visual card grid appears below the theme dropdown showing available presets (screenshot, name, description). The default preset is pre-selected. The user can click a different preset card to switch. Presets are fetched from `GET /api/themes/{themeId}/presets` via `getThemePresets()` in `themeManager.js`.
6.  **Form Validation**: react-hook-form provides real-time validation with localized error messages.
7.  **Submission**: The user clicks the "Create Project" button. `ProjectForm` automatically generates a URL-friendly folder name (slug) from the title and calls the `onSubmit` handler provided by `ProjectsAdd.jsx`.
8.  **API Call**: `ProjectsAdd.jsx`'s `handleSubmit` function calls `createProject(formData)` from `projectManager.js`, which sends a `POST` request to the backend API to create the new project.
9.  **Theme Copy to Project Data**: On successful creation, the selected theme's files are copied into the new project's data directory at `/data/projects/<folderName>/`, including `layout.liquid`, `templates/`, `widgets/`, `assets/`, `menus/`, `snippets/`, `theme.json`, and `locales/`. In packaged Electron builds, base themes are seeded from `app.asar.unpacked/themes/` into the installed themes directory (`data/themes/`) on first access. The `presets/` directory is excluded from the project copy. These become the project's working theme files.
9b. **Preset Application**: If a preset was selected during creation, the system applies preset overrides after the theme copy:
    - **Templates**: If the preset has its own `templates/` directory, those templates are used instead of the root theme templates for the `processTemplatesRecursive` step.
    - **Menus**: If the preset has its own `menus/` directory, the root menus already copied into the project are removed and replaced with the preset's menus. This happens before menu enrichment (step 10).
    - **Settings Overrides**: The preset's `preset.json` contains a flat map of `{ setting_id: value }` overrides. The system walks the project's `theme.json > settings.global` groups and updates the `default` field for any setting whose `id` matches a key in the overrides map. This applies colors, fonts, animations, and any other theme settings defined by the preset.
    - The selected preset ID is stored in the project metadata as `preset`.
9c. **Theme Locale Ownership**: The editor locale API reads the project's copied `locales/` files, not the shared installed theme copy under `data/themes/`. This means locale changes follow the same per-project update boundary as other theme files.
10. **Link Enrichment**: After copying theme files, the system enriches all internal page links with `pageUuid`:
    - **Menus**: All menu items that link to internal pages (e.g., `index.html`, `about.html`) are enriched with the corresponding page's `pageUuid`. This ensures menu links remain valid even if pages are renamed.
    - **Widgets**: All widget settings with link-type values (objects containing `href` pointing to internal `.html` pages) are enriched with `pageUuid`. This includes links in header, footer, and all page widgets.
11. **Setting Active Project**: The frontend immediately sets the new project as active (`setActiveProject(newProject.id)`) and refreshes `projectStore`, regardless of whether it is the first project.
12. **Feedback + Navigation**: A success toast notification is shown (localized), and the user is redirected into the site workspace. By default this is `/pages`, but if the user came from a guarded workspace route, the preserved `next` value is resolved and used instead.

### 1b. Access Without an Active Project

If a user navigates to any site-workspace route without an active project selected, `RequireActiveProject` redirects the user back to `/projects`. There is no longer a separate "No Active Project" empty-state screen in the route guard.

### 2. Listing and Managing Projects

1.  **Data Fetching**: When `Projects.jsx` loads, it calls `getAllProjects()` to fetch and display a list of all projects in a table. The query uses a short-lived global cache so repeat visits can reuse recent results, while successful project mutations invalidate the cache.
2.  **Localization**: The page is fully localized with translated headers, action labels, toast messages, and empty states.
3.  **Open Project / Set Active**: Clicking the project name opens that project. If it is not already active, `Projects.jsx` first calls `setActiveProject(id)`, refreshes `projectStore`, shows a success toast, and then navigates into the workspace destination (`/pages` by default, or preserved `next`).
4.  **Visual Status**: The active project shows an "Active" badge. The theme column can also show a theme-update indicator when `hasThemeUpdate` is true.
5.  **Actions Menu**: Each row exposes an overflow menu with:
    - **Edit**: Navigates to `/projects/edit/:id`.
    - **Duplicate**: Calls `duplicateProject(id)`. The duplication process includes UUID regeneration for all pages and automatic updating of all `pageUuid` references in widgets and menus to point to the new UUIDs. Duplicates are named with the suffix pattern `Project Name (Copy)`, `Project Name (Copy 2)`, etc., and the list sorting groups them after the original project.
    - **Export**: Triggers project ZIP export.
    - **Delete**: Opens a localized confirmation modal. The currently active project cannot be deleted.

### 3. Exporting a Project

Projects can be exported as ZIP files for backup or transfer to another installation.

1.  **Action**: The user clicks the "Export" icon on a project row in the `Projects.jsx` page.
2.  **Loading Feedback**: A persistent toast notification immediately appears showing "Exporting project..." and remains visible throughout the export process.
3.  **Backend Processing**: The `exportProject(id)` function sends a `POST` request to `/api/projects/:projectId/export`.
4.  **ZIP Creation**: The backend creates a ZIP archive containing:
    - **`project-export.json`**: A manifest file with `formatVersion: "1.1"`, `exportedAt`, `widgetizerVersion`, and a nested `project` object. That nested object includes project metadata such as `name`, `description`, `siteTitle`, `theme`, `themeVersion`, `receiveThemeUpdates`, `preset`, `siteUrl`, `created`, and `updated`.
    - **All project files**: Pages, menus, widgets, uploads, theme.json, collections, and other project assets.
5.  **Download**: The ZIP file is streamed to the browser and automatically downloaded with a timestamped filename (e.g., `my-project-export-2024-01-15T10-30-00.zip`).
6.  **Completion**: The loading toast is dismissed and replaced with a success toast.

### 4. Importing a Project

Projects can be imported from ZIP files previously exported from Widgetizer.

1.  **Action**: The user clicks the "Import Project" button in the page header, which opens the `ProjectImportModal`.
2.  **File Selection**: The user selects or drag-and-drops a ZIP file. Client-side validation checks:
    - File type (must be `.zip` with proper MIME type)
    - File size (must not exceed the configurable `maxImportSizeMB` limit from App Settings)
3.  **Upload**: The user clicks "Import Project" to upload the ZIP file via `POST /api/projects/import`.
4.  **Server-Side Validation**: The backend validates:
    - ZIP structure contains `project-export.json` manifest
    - Manifest contains required fields (name, theme)
    - Referenced theme exists in the installation
5.  **Isolation**: Files are extracted to a temporary directory first for validation before any permanent changes.
6.  **Project Creation**:
    - A new UUID is generated for the imported project
    - A unique `folderName` is generated (checking existing project metadata in SQLite and existing directories)
    - Files are copied from the temp directory to the new project directory
    - Project metadata is written to SQLite only after successful file copy
    - The imported manifest restores `siteTitle`, `receiveThemeUpdates`, `preset`, and `siteUrl` in addition to the core project fields
7.  **Cleanup**: Temporary files are removed on both success and failure.
8.  **Feedback + Navigation**: A success toast is shown, the modal closes, and the imported project is immediately opened as the active project inside the site workspace.

**Note**: Imported projects receive new IDs and folder names to prevent conflicts. The original project's ID and folder structure are not preserved.

### 5. Editing a Project

1.  **Navigation**: From the project list, clicking the "Edit" icon navigates the user to `/projects/edit/:id`.
2.  **Data Fetching**: `ProjectsEdit.jsx` loads. In its `useEffect` hook, it calls `getAllProjects()` and finds the specific project matching the `id` from the URL parameters to populate the form. Because that list query is cached, successful project mutations invalidate it so the editor reload path sees fresh project metadata instead of stale list data.
3.  **Navigation Guard**: `useFormNavigationGuard` is integrated to prevent accidental navigation with unsaved changes.
4.  **Rendering**: The `ProjectForm.jsx` component is rendered with the `initialData` of the project being edited with several key features:
    - **Theme Restriction**: The "Theme" dropdown is disabled, as themes cannot be changed after creation to maintain consistency
    - **Project Folder Name**: Editable field for the project's folder name, independent of the project title
    - **Description Field**: Optional field for project description
    - **Site Title Field**: Optional field used for exported browser-tab titles and related site-level metadata
    - **Website Address Field**: Optional field for setting the base URL for the project, used for generating absolute URLs in social media meta tags, SEO, and exported site metadata
    - **Theme Update Banner**: If `checkThemeUpdates(id)` reports an available update, `ProjectsEdit.jsx` shows an inline banner with an "Apply Update" action
5.  **Form Features**:
    - **Independent Fields**: Project title and folder name can be edited independently
    - **URL Validation**: The website address field is optional, but if provided, includes validation to ensure proper URL format (via react-hook-form)
    - **Conditional Fields**: Theme selection only appears when creating new projects, not when editing existing ones
    - **Localized Validation**: All error messages and help text are fully localized
6.  **Submission**: The user modifies the form and clicks "Save Changes":
    - **Folder Renaming**: If the folder name changes, the system renames the project directory accordingly.
    - **URL Persistence**: Since the project ID is stable, the user is **not** redirected; the API and frontend routes remain valid.
    - **State Synchronization**: Active project state is properly maintained as the ID remains constant.
7.  **API Call**: The `handleSubmit` function calls `updateProject(id, formData)` using the `projectManager.js` utility functions for consistent API handling.
8.  **State Updates**:
    - **Active Project Sync**: If the edited project is currently active, the global store is updated using `getActiveProject()` and `setActiveProject()` to maintain proper state
    - **Windows Compatibility**: Project directory renaming uses a copy + remove approach for better Windows file system compatibility
9.  **Theme Update Apply Sync**: When the user applies a theme update from this screen, `applyThemeUpdate(id)` invalidates the cached projects list before `loadProject()` re-reads it. That keeps `themeVersion` and update-status metadata in sync immediately after the update.
10. **Feedback**: Localized success toast notifications show the completion status, and navigation buttons allow returning to the project list.

---

## Project-Switch Isolation

When the user switches projects, the app must ensure no data from the previous project leaks into the new context (stale reads, cross-project writes, wrong-project previews).

### How switching works

`openProjectWorkspace()` in `Projects.jsx` calls `PUT /api/projects/active/:id` to set the new active project in SQLite, refreshes the Zustand store via `fetchActiveProject()`, then navigates to `/pages`. This causes route-level components to remount.

### Server-side protection

`resolveActiveProject` middleware is applied to all project-scoped routes. For write requests, it validates both the `X-Project-Id` header (injected by `apiFetch` from the Zustand store) and `req.params.projectId` against the server's active project. Either mismatch returns 409 `PROJECT_MISMATCH`. Controllers use `req.activeProject` from the middleware.

### Client-side protection

- **All project-scoped screens** (Pages, Settings, PageEditor, PagePreview, PagesEdit, MenusEdit, MenuStructure, Export) include `activeProject?.id` in their effect dependency arrays so they reload on project change
- **pageStore** uses an `activeLoadId` counter to discard stale async loads. Tracks `loadedProjectId` so `saveStore` can compare before saving.
- **themeStore** is the canonical owner of theme settings across Settings and the editor. It uses `activeLoadId` plus `resetForProjectChange()` to drop stale loads and clear project-specific state on switches.
- **widgetStore** resets schemas and selection via `resetForProjectChange()` and reads the project ID internally via `getActiveProjectId()`
- **Settings.jsx** now reads/writes through `themeStore`; it still guards save completion against mid-flight project changes, but load ownership lives in the store
- **useExportState / ExportCreator** guard history loads and export completion against project changes mid-flight

### Known limitation

`useNavigationGuard` and `useFormNavigationGuard` only watch route changes, not project changes. If the user has unsaved edits and switches projects via the sidebar, they won't see an "unsaved changes" prompt. The server will reject any stale write (409), so no data corruption occurs — but the user loses their edits silently. Acceptable for v1.0 single-user desktop use.

---

## Backend API Endpoints

The frontend `projectManager.js` communicates with a set of backend API endpoints defined in `server/routes/projects.js`. These routes handle the core logic of project management.

| Method | Route | Controller Action | Description |
| :-- | :-- | :-- | :-- |
| `GET` | `/api/projects` | `getAllProjects` | Retrieves a list of all projects. |
| `GET` | `/api/projects/active` | `getActiveProject` | Gets the currently active project's data. |
| `POST` | `/api/projects` | `createProject` | Creates a new project. Accepts optional `preset` field (string) to apply a theme preset. |
| `PUT` | `/api/projects/active/:id` | `setActiveProject` | Sets the project with the given `id` as active. |
| `PUT` | `/api/projects/:id` | `updateProject` | Updates a specific project. |
| `DELETE` | `/api/projects/:id` | `deleteProject` | Deletes a specific project. |
| `POST` | `/api/projects/:id/duplicate` | `duplicateProject` | Creates a complete copy of a project. |
| `POST` | `/api/projects/:projectId/export` | `exportProject` | Exports project as a downloadable ZIP file. |
| `POST` | `/api/projects/import` | `importProject` | Imports a project from a ZIP file upload. |
| `GET` | `/api/projects/:projectId/widgets` | `getProjectWidgets` | Retrieves all widget schemas for a project. |
| `GET` | `/api/projects/:projectId/icons` | `getProjectIcons` | Retrieves all available icons for a project. |
| `GET` | `/api/projects/:id/theme-updates/status` | `getThemeUpdateStatus` | Checks whether a newer theme version is available for the project. |
| `PUT` | `/api/projects/:id/theme-updates` | `toggleProjectThemeUpdates` | Toggles the project's `receiveThemeUpdates` preference (`enabled: boolean`). |
| `POST` | `/api/projects/:id/theme-updates/apply` | `applyProjectThemeUpdate` | Applies the currently available theme update to the project. |

### Security Considerations

All API endpoints described in this document are protected by input validation and CORS policies. For details, see the **[Platform Security](core-security.md)** documentation.

---

**See also:**

- [Page Management](core-pages.md) - Managing pages within projects
- [Site Export System](core-export.md) - Exporting projects as static HTML sites
- [Media Library](core-media.md) - Managing project media files
- [Theming Guide](theming.md) - Theme structure copied during project creation
- [App Settings](core-appSettings.md) - Configure project import size limits
- [Platform Security](core-security.md) - Security considerations for project import/export
- [Theme Presets](theme-presets.md) - Preset variants applied during project creation
