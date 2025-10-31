# Project Management Workflow

This document provides a detailed overview of how projects are created, managed, and updated within the application.

## Core Components & Pages

The project management UI is primarily handled by three pages:

1.  **`Projects.jsx`**: The main project listing page.
2.  **`ProjectsAdd.jsx`**: The page for creating a new project.
3.  **`ProjectsEdit.jsx`**: The page for modifying an existing project.

These pages rely on a central form component for handling user input:

- **`ProjectForm.jsx`**: A reusable form for both creating and editing project details (name, description, theme).

## Client-Side Routing

The application uses `react-router-dom` to handle navigation between these pages:

- `/projects`: Renders the `Projects.jsx` page, showing the list of all projects.
- `/projects/add`: Renders the `ProjectsAdd.jsx` page.
- `/projects/edit/:id`: Renders the `ProjectsEdit.jsx` page, where `:id` is the unique ID of the project being edited.

---

## Data Flow & State Management

Project state is managed by a central **Zustand store** defined in `src/stores/projectStore.js`. This store is the single source of truth for the currently active project and provides actions to interact with it.

Data fetching and backend communication are handled by utility functions in `src/utils/projectManager.js`.

### The `projectManager.js` Utility

This file contains functions that make API calls to the backend:

- `getAllProjects()`: Fetches a list of all projects.
- `createProject(formData)`: Creates a new project.
- `updateProject(id, formData)`: Updates an existing project.
- `deleteProject(id)`: Deletes a project.
- `duplicateProject(id)`: Creates a copy of a project.
- `getActiveProject()`: Retrieves the currently active project.
- `setActiveProject(id)`: Sets a project as the active one.

---

## Detailed Workflows

### 1. Creating a New Project

1.  **Navigation**: The user clicks the "New project" button on the `Projects.jsx` page, which navigates them to `/projects/add`.
2.  **Rendering**: The `ProjectsAdd.jsx` page is rendered. It contains the `ProjectForm.jsx` component.
3.  **Theme Loading**: `ProjectForm.jsx` makes an API call via `/api/themes` to fetch the list of available themes and populates the "Theme" dropdown.
4.  **User Input**: The user fills in the project name, description, and selects a theme. The "Theme" dropdown is only enabled during project creation.
5.  **Submission**: The user clicks the "Create Project" button. `ProjectForm` formats the project name into a URL-friendly `slug` and calls the `onSubmit` handler provided by `ProjectsAdd.jsx`.
6.  **API Call**: `ProjectsAdd.jsx`'s `handleSubmit` function calls `createProject(formData)` from `projectManager.js`, which sends a `POST` request to the backend API to create the new project.
7.  **Theme Copy to Project Data**: On successful creation, the selected theme's files are copied into the new project's data directory at `/data/projects/<projectId>/`, including `layout.liquid`, `templates/`, `widgets/`, `assets/`, and `menus/`. These become the project's working theme files.
8.  **Setting Active Project**: If this is the very first project being created (i.e., there was no active project before), it is automatically set as the active project by calling `setActiveProject(newProject.id)`. The global state is updated via the `projectStore`.
9.  **Feedback**: A success toast notification is shown, and the user is presented with buttons to either navigate to the project list or edit the newly created project.

### 2. Listing and Managing Projects

1.  **Data Fetching**: When `Projects.jsx` loads, it calls `getAllProjects()` to fetch and display a list of all projects in a table.
2.  **Actions**: For each project in the list, a set of actions are available on hover:
    - **Set Active (`Star` icon)**: Calls `handleSetActive`, which uses `setActiveProjectInBackend(id)` to update the backend. It then re-fetches the active project information to update the global store and UI. You cannot deactivate the active project; you must set another as active.
    - **Edit (`Pencil` icon)**: Navigates the user to `/projects/edit/:id`.
    - **Duplicate (`Copy` icon)**: Calls `handleDuplicate`, which uses `duplicateProject(id)` to make an API call. The project list is then reloaded.
    - **Delete (`Trash2` icon)**: Calls `openDeleteConfirmation`, which opens a confirmation modal. You cannot delete the currently active project. If confirmed, the `deleteProject(id)` function is called, and the list is reloaded.

### 3. Editing a Project

1.  **Navigation**: From the project list, clicking the "Edit" icon navigates the user to `/projects/edit/:id`.
2.  **Data Fetching**: `ProjectsEdit.jsx` loads. In its `useEffect` hook, it calls `getAllProjects()` and finds the specific project matching the `id` from the URL parameters to populate the form.
3.  **Rendering**: The `ProjectForm.jsx` component is rendered with the `initialData` of the project being edited with several key features:
    - **Theme Restriction**: The "Theme" dropdown is disabled, as themes cannot be changed after creation to maintain consistency
    - **Project Folder Display**: Shows the current project folder name (based on the project title) with a note that it updates when the title changes
    - **Site URL Field**: Allows setting the base URL for the project, used for generating absolute URLs in social media meta tags and SEO
4.  **Form Features**:
    - **Live Folder Preview**: The project folder name updates in real-time as the user types the project title
    - **URL Validation**: The site URL field includes validation to ensure proper URL format
    - **Conditional Fields**: Theme selection only appears when creating new projects, not when editing existing ones
5.  **Submission & URL Management**: The user modifies the form and clicks "Save Changes":
    - **Project Renaming**: If the project title changes, the system automatically generates a new project ID and renames the project directory
    - **URL Redirection**: When a project is renamed (causing an ID change), the user is automatically redirected to the new URL (`/projects/edit/{newId}`)
    - **State Synchronization**: Active project state is properly maintained even when project IDs change due to renaming
6.  **API Call**: The `handleSubmit` function calls `updateProject(id, formData)` using the `projectManager.js` utility functions for consistent API handling.
7.  **State Updates**:
    - **Active Project Sync**: If the edited project is currently active, the global store is updated using `getActiveProject()` and `setActiveProject()` to maintain proper state
    - **Windows Compatibility**: Project directory renaming uses a copy + remove approach for better Windows file system compatibility
8.  **Feedback**: Success toast notifications show the completion status, and navigation buttons allow returning to the project list.

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
| `GET` | `/api/projects/:projectId/widgets` | `getProjectWidgets` | Retrieves all widget schemas for a project. |

### Security Considerations

All API endpoints described in this document are protected by the platform's core security layers, including input validation, rate limiting, and CORS policies. For a comprehensive overview of these protections, see the **[Platform Security](security.md)** documentation.
