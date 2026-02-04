# Project Management Workflow

This document provides a detailed overview of how projects are created, managed, and updated within the application.

## Core Components & Pages

The project management UI is primarily handled by three pages:

1.  **`Projects.jsx`**: The main project listing page.
2.  **`ProjectsAdd.jsx`**: The page for creating a new project.
3.  **`ProjectsEdit.jsx`**: The page for modifying an existing project.

These pages rely on a central form component for handling user input:

- **`ProjectForm.jsx`**: A reusable form for both creating and editing project details (title, theme, folder name, notes, website address)
  - Migrated to **react-hook-form** for improved validation and state management
  - Fully **localized** using `react-i18next` for all labels, errors, and help text
  - Exposes `isDirty` state to parent components for navigation guard integration
  - Automatic slug generation from project name for new projects

## Client-Side Routing

The application uses `react-router-dom` to handle navigation between these pages:

- `/projects`: Renders the `Projects.jsx` page, showing the list of all projects.
- `/projects/add`: Renders the `ProjectsAdd.jsx` page.
- `/projects/edit/:id`: Renders the `ProjectsEdit.jsx` page, where `:id` is the unique ID of the project being edited.

---

## Data Flow & State Management

Project state is managed by a central **Zustand store** defined in `src/stores/projectStore.js`. This store is the single source of truth for the currently active project and provides actions to interact with it.

Data fetching and backend communication are handled by utility functions in `src/queries/projectManager.js`.

### The `projectManager.js` Utility

This file contains functions that make API calls to the backend:

- `getAllProjects()`: Fetches a list of all projects.
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
5.  **User Input**: The user fills in the title and selects a theme. Additional fields (folder name, notes, website address) are available under "More settings". The "Theme" dropdown is only enabled during project creation.
6.  **Form Validation**: react-hook-form provides real-time validation with localized error messages.
7.  **Submission**: The user clicks the "Create Project" button. `ProjectForm` automatically generates a URL-friendly folder name (slug) from the title and calls the `onSubmit` handler provided by `ProjectsAdd.jsx`.
8.  **API Call**: `ProjectsAdd.jsx`'s `handleSubmit` function calls `createProject(formData)` from `projectManager.js`, which sends a `POST` request to the backend API to create the new project.
9.  **Theme Copy to Project Data**: On successful creation, the selected theme's files are copied into the new project's data directory at `/data/projects/<folderName>/`, including `layout.liquid`, `templates/`, `widgets/`, `assets/`, and `menus/`. In packaged Electron builds, the source theme files live in `app.asar.unpacked/themes/`. These become the project's working theme files.
10. **Link Enrichment**: After copying theme files, the system enriches all internal page links with `pageUuid`:
    - **Menus**: All menu items that link to internal pages (e.g., `index.html`, `about.html`) are enriched with the corresponding page's `pageUuid`. This ensures menu links remain valid even if pages are renamed.
    - **Widgets**: All widget settings with link-type values (objects containing `href` pointing to internal `.html` pages) are enriched with `pageUuid`. This includes links in header, footer, and all page widgets.
11. **Setting Active Project**: If this is the very first project being created (i.e., there was no active project before), it is automatically set as the active project by calling `setActiveProject(newProject.id)`. The global state is updated via the `projectStore`.
12. **Feedback**: A success toast notification is shown (localized), and the user is presented with buttons to either navigate to the project list or edit the newly created project.

### 2. Listing and Managing Projects

1.  **Data Fetching**: When `Projects.jsx` loads, it calls `getAllProjects()` to fetch and display a list of all projects in a table.
2.  **Localization**: The page is fully localized with translated headers, action labels, toast messages, and empty states.
3.  **Actions**: For each project in the list, a set of actions are available on hover:
    - **Set Active (`Star` icon)**: Calls `handleSetActive`, which uses `setActiveProjectInBackend(id)` to update the backend. It then re-fetches the active project information to update the global store and UI. You cannot deactivate the active project; you must set another as active.
    - **Edit (`Pencil` icon)**: Navigates the user to `/projects/edit/:id`.
    - **Duplicate (`Copy` icon)**: Calls `handleDuplicate`, which uses `duplicateProject(id)` to make an API call. The duplication process includes UUID regeneration for all pages and automatic updating of all `pageUuid` references in widgets and menus to point to the new UUIDs. The project list is then reloaded.
    - **Delete (`Trash2` icon)**: Calls `openDeleteConfirmation`, which opens a localized confirmation modal. You cannot delete the currently active project. If confirmed, the `deleteProject(id)` function is called, and the list is reloaded.

### 3. Exporting a Project

Projects can be exported as ZIP files for backup or transfer to another installation.

1.  **Action**: The user clicks the "Export" icon on a project row in the `Projects.jsx` page.
2.  **Loading Feedback**: A persistent toast notification immediately appears showing "Exporting project..." and remains visible throughout the export process.
3.  **Backend Processing**: The `exportProject(id)` function sends a `POST` request to `/api/projects/:projectId/export`.
4.  **ZIP Creation**: The backend creates a ZIP archive containing:
    - **`project-export.json`**: A manifest file with project metadata (name, description, theme, siteUrl, timestamps).
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
    - A unique `folderName` is generated (checking both `projects.json` and existing directories)
    - Files are copied from the temp directory to the new project directory
    - Project metadata is added to `projects.json` only after successful file copy
7.  **Cleanup**: Temporary files are removed on both success and failure.
8.  **Feedback**: Success modal shows the imported project name, then auto-closes after 2 seconds.

**Note**: Imported projects receive new IDs and folder names to prevent conflicts. The original project's ID and folder structure are not preserved.

### 5. Editing a Project

1.  **Navigation**: From the project list, clicking the "Edit" icon navigates the user to `/projects/edit/:id`.
2.  **Data Fetching**: `ProjectsEdit.jsx` loads. In its `useEffect` hook, it calls `getAllProjects()` and finds the specific project matching the `id` from the URL parameters to populate the form.
3.  **Navigation Guard**: `useFormNavigationGuard` is integrated to prevent accidental navigation with unsaved changes.
4.  **Rendering**: The `ProjectForm.jsx` component is rendered with the `initialData` of the project being edited with several key features:
    - **Theme Restriction**: The "Theme" dropdown is disabled, as themes cannot be changed after creation to maintain consistency
    - **Project Folder Name**: Editable field for the project's folder name, independent of the project title
    - **Notes Field**: Optional field for personal notes about the project
    - **Website Address Field**: Optional field for setting the base URL for the project, used for generating absolute URLs in social media meta tags and SEO
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
9.  **Feedback**: Localized success toast notifications show the completion status, and navigation buttons allow returning to the project list.

---

## Backend API Endpoints

The frontend `projectManager.js` communicates with a set of backend API endpoints defined in `server/routes/projects.js`. These routes handle the core logic of project management.

| Method | Route | Controller Action | Description |
| :-- | :-- | :-- | :-- |
| `GET` | `/api/projects` | `getAllProjects` | Retrieves a list of all projects. |
| `GET` | `/api/projects/active` | `getActiveProject` | Gets the currently active project's data. |
| `POST` | `/api/projects` | `createProject` | Creates a new project. |
| `PUT` | `/api/projects/active/:id` | `setActiveProject` | Sets the project with the given `id` as active. |
| `PUT` | `/api/projects/:id` | `updateProject` | Updates a specific project. |
| `DELETE` | `/api/projects/:id` | `deleteProject` | Deletes a specific project. |
| `POST` | `/api/projects/:id/duplicate` | `duplicateProject` | Creates a complete copy of a project. |
| `POST` | `/api/projects/:projectId/export` | `exportProject` | Exports project as a downloadable ZIP file. |
| `POST` | `/api/projects/import` | `importProject` | Imports a project from a ZIP file upload. |
| `GET` | `/api/projects/:projectId/widgets` | `getProjectWidgets` | Retrieves all widget schemas for a project. |
| `GET` | `/api/projects/:projectId/icons` | `getProjectIcons` | Retrieves all available icons for a project. |

### Security Considerations

All API endpoints described in this document are protected by the platform's core security layers, including input validation, rate limiting, and CORS policies. For a comprehensive overview of these protections, see the **[Platform Security](core-security.md)** documentation.

---

**See also:**

- [Page Management](core-pages.md) - Managing pages within projects
- [Site Export System](core-export.md) - Exporting projects as static HTML sites
- [Media Library](core-media.md) - Managing project media files
- [Theming Guide](theming.md) - Theme structure copied during project creation
- [App Settings](core-appSettings.md) - Configure project import size limits
- [Platform Security](core-security.md) - Security considerations for project import/export
