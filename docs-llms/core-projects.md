# Project Management Workflow

This document provides a detailed overview of how projects are created, managed, and updated within the application. Projects live in a separate admin area and act as the entry point into the site workspace.

> **Path note.** The Projects pages, `ProjectForm.jsx`, and `ProjectImportModal` live in the **OSS shell** under `app/src/`, while the project store and query manager they call live in the **`@widgetizer/editor-ui`** package under `packages/editor-ui/src/`. The backend routes live in **`@widgetizer/builder-server`** under `packages/builder-server/src/`. See [Packages & Adapter Architecture](core-packages.md).

## Core Components & Pages

The project management UI is primarily handled by three OSS-shell pages (`app/src/pages/`):

1.  **`Projects.jsx`**: The main project listing page.
2.  **`ProjectsAdd.jsx`**: The page for creating a new project.
3.  **`ProjectsEdit.jsx`**: The page for modifying an existing project.

These pages rely on shared components in `app/src/components/projects/`:

- **`ProjectForm.jsx`**: A reusable form for both creating and editing project details (title, theme, folder name, description, site title, site address, Clean URLs). Both pages use the same General, Site, Identity and Business Details tabs; creating adds the theme picker and presets to General — see [Site Identity](#6-site-identity-and-business-details))
  - Built on **react-hook-form** for validation and state management
  - Fully **localized** using `react-i18next` for all labels, errors, and help text
  - Exposes `isDirty` state to parent components for navigation guard integration
  - Automatic slug generation from project name for new projects
  - **Preset selection**: When a theme with presets is selected, fetches presets via `GET /api/themes/{themeId}/presets` and displays a visual card grid with preset screenshots, names, and descriptions. The default preset is pre-selected. The selected preset ID is included in the form data as `preset`.
- **`ProjectImportModal`**: The drag-and-drop ZIP import dialog used from the Projects page header (see [Importing a Project](#4-importing-a-project)).

## Client-Side Routing

The application uses `react-router-dom` to handle navigation between these pages:

- `/`: Redirects to `/pages` when an active project exists, otherwise `/projects`
- `/projects`: Renders the `Projects.jsx` page, showing the list of all projects.
- `/projects/add`: Renders the `ProjectsAdd.jsx` page.
- `/projects/edit/:id`: Renders the `ProjectsEdit.jsx` page, where `:id` is the unique ID of the project being edited. Only the active project's details open: any other id redirects to `/projects`, and the Projects list has no link to this page (it opens from the admin menu).

### Admin vs Workspace Flow

- `/projects`, `/themes`, and `/app-settings` live inside `ProjectPickerLayout`, the admin shell.
- `/pages`, `/menus`, `/media`, `/settings`, and `/export-site` live inside the site workspace shell and require an active project.
- Project-selection routes can preserve a `next` query param. `resolveWorkspaceDestination()` normalizes that value so project creation/opening can return the user to the intended workspace tool (default: `/pages`).

---

## Data Flow & State Management

Project state is managed by a central **Zustand store** defined in `packages/editor-ui/src/stores/projectStore.js`. This store is the single source of truth for the currently active project and provides actions to interact with it.

Data fetching and backend communication are handled by utility functions in `packages/editor-ui/src/queries/projectManager.js`. These project-admin calls use `apiFetch`/`apiFetchJson` with **absolute** `/api/projects/...` paths (not the project-relative `editorFetch` helper used by the in-workspace editor queries). `apiFetch` injects the `X-Project-Id` header from `getActiveProjectId()` (`packages/editor-ui/src/lib/activeProjectId.js`), so the same code runs unchanged in the OSS SPA and embedded in a host. See [Packages & Adapter Architecture](core-packages.md#the-editor-ui-library-seams).

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
5.  **User Input**: The user fills in the title and selects a theme. The other tabs (Site, Identity, Business Details) are optional; folder name follows the title and may be left empty, in which case the server picks one. The "Theme" dropdown is only offered during project creation, and a logo chosen here is uploaded right after the project is created (see Site Identity).
5b. **Preset Selection**: If the selected theme has presets, a visual card grid appears below the theme dropdown showing available presets (screenshot, name, description). The default preset is pre-selected. The user can click a different preset card to switch. Presets are fetched from `GET /api/themes/{themeId}/presets` via `getThemePresets()` in `themeManager.js`.
6.  **Form Validation**: react-hook-form provides real-time validation with localized error messages.
7.  **Submission**: The user clicks the "Create Project" button. `ProjectForm` automatically generates a URL-friendly folder name (slug) from the title and calls the `onSubmit` handler provided by `ProjectsAdd.jsx`.
8.  **API Call**: `ProjectsAdd.jsx`'s `handleSubmit` function calls `createProject(formData)` from `projectManager.js`, which sends a `POST` request to the backend API to create the new project.
9.  **Theme Copy to Project Data**: On successful creation, the selected theme's files are copied into the new project's data directory at `/data/projects/<folderName>/`, including `layout.liquid`, `templates/`, `widgets/`, `assets/`, `menus/`, `snippets/`, `theme.json`, and `locales/`. In packaged Electron builds, base themes are seeded from `app.asar.unpacked/themes/` into the installed themes directory (`data/themes/`) on first access. The `presets/` directory is excluded from the project copy. These become the project's working theme files. The dir-explicit core of this step (theme copy + preset application + template/menu processing) is extracted into `scaffoldProjectContent({ projectDir, theme, preset })` (`packages/builder-server/src/utils/projectScaffold.js`, re-exported from the package index) so a host can scaffold project content without going through the OSS controller. See [Packages & Adapter Architecture](core-packages.md).
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

If a user navigates to any site-workspace route without an active project selected, `RequireActiveProject` redirects the user back to `/projects`. There is no separate "No Active Project" empty-state screen in the route guard. The same component keys the workspace outlet by project ID so site-workspace routes remount on project switch; the OSS shell observes active-project changes in `app/src/App.jsx` and resets `themeStore`, `widgetStore`, `saveStore`, and `pageStore` through `app/src/lib/projectSwitchCoordinator.js`.

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
    - **`project-export.json`**: A manifest file with `formatVersion: "1.1"`, `exportedAt`, `widgetizerVersion`, and a nested `project` object. That nested object includes project metadata such as `name`, `description`, `siteTitle`, `theme`, `themeVersion`, `receiveThemeUpdates`, `preset`, `siteUrl`, `cleanUrls`, `siteIdentity`, `created`, and `updated`.
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
    - The imported manifest restores `siteTitle`, `receiveThemeUpdates`, `preset`, `siteUrl`, `cleanUrls` and `siteIdentity` in addition to the core project fields. An imported identity is never refused: only its valid part is kept.
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
    - **Site Address Field**: Optional field for setting the base URL for the project, used for generating absolute URLs in social media meta tags, SEO, and exported site metadata
    - **Clean URLs Checkbox**: Off by default. When on, rendered internal links, canonical tags, the sitemap and robots.txt address pages without the `.html` extension (`about`, `rooms/suite`, home `./`); exported file names are unchanged, so the host must serve `about.html` at `/about`
    - **Theme Update Banner**: If `checkThemeUpdates(id)` reports an available update, `ProjectsEdit.jsx` shows an inline banner with an "Apply Update" action
5.  **Form Features**:
    - **Independent Fields**: Project title and folder name can be edited independently
    - **URL Validation**: The site address field is optional, but if provided, includes validation to ensure proper URL format (via react-hook-form)
    - **Conditional Fields**: Theme selection only appears when creating new projects, not when editing existing ones
    - **Localized Validation**: All error messages and help text are fully localized
6.  **Submission**: The user modifies the form and clicks "Save Changes":
    - **Folder Renaming**: If the folder name changes, the system renames the project directory accordingly. Every check that can reject the request (string types, Site Address, site identity, booleans) runs first, because the directory moves before the row is written and a failure after the move would strand the project.
    - **URL Persistence**: Since the project ID is stable, the user is **not** redirected; the API and frontend routes remain valid.
    - **State Synchronization**: Active project state is properly maintained as the ID remains constant.
7.  **API Call**: The `handleSubmit` function calls `updateProject(id, formData)` using the `projectManager.js` utility functions for consistent API handling.
8.  **State Updates**:
    - **Active Project Sync**: If the edited project is currently active, the global store is updated using `getActiveProject()` and `setActiveProject()` to maintain proper state
    - **Windows Compatibility**: Project directory renaming uses a copy + remove approach for better Windows file system compatibility
9.  **Theme Update Apply Sync**: When the user applies a theme update from this screen, `applyThemeUpdate(id)` invalidates the cached projects list before `loadProject()` re-reads it. That keeps `themeVersion` and update-status metadata in sync immediately after the update.
10. **Feedback**: Localized success toast notifications show the completion status, and navigation buttons allow returning to the project list.

### 6. Site Identity and Business Details

A project stores who is behind the site — the facts core publishes as structured data ([Site Exporting](core-export.md#structured-data-json-ld)) and themes read as `project.identity` ([Theming](theming.md)). It lives in the `site_identity` JSON column (migration v6, [Database](core-database.md)) and reaches controllers as `project.siteIdentity`.

**Shape.** Owned, validated and resolved by `packages/core/src/utils/siteIdentity.js`. Values that will need translation sit under a `text` key; everything else never will.

```json
{
  "category": "restaurant",
  "logo": "/uploads/images/logo.png",
  "email": "hello@example.com",
  "telephone": "+30 210 123 4567",
  "priceRange": "€€",
  "profiles": { "instagram": "https://instagram.com/example" },
  "locations": [
    {
      "streetAddress": "1 Main St", "addressLocality": "Athens", "addressRegion": "Attica",
      "postalCode": "10558", "addressCountry": "GR",
      "openingHours": { "monday": [{ "opens": "09:00", "closes": "17:00" }], "sunday": [] },
      "text": { "label": "Plaka branch" }
    }
  ],
  "text": { "publicName": "Example Taverna", "description": "Home cooking since 1980." }
}
```

- **`category`** — an id from `SITE_IDENTITY_CATEGORIES`. Each row declares its schema.org type and its kind (`organization`, `person`, `localBusiness`); the kind is derived, never stored, and no category means organization. The list is Arch's preset business types plus Organization, Person and a generic local business. ProfessionalService is deliberately unused (deprecated) — businesses with no exact type map to `LocalBusiness`. Add a row when a new theme or preset brings a business type.
- **`logo`** — an `/uploads/images/…` path, not a media id: duplicate and import give media files new ids.
- **`profiles`** — one http(s) URL per network in `PROFILE_NETWORKS` (facebook, instagram, twitter, linkedin, youtube, tiktok, pinterest, github, mastodon, bluesky, discord, reddit, telegram, threads, whatsapp).
- **`locations[]`** — up to 20; the first is the primary and the only one the UI edits. `addressCountry` is two letters, stored upper-case. `openingHours` is keyed by weekday: `[]` = closed, a list of `{ opens, closes }` (`HH:MM`, opens ≠ closes, at most 4, a range may cross midnight) = open, a missing day = not stated.
- Text limits: 200 for names and street, 500 for the description (the rest are in `LIMITS`).

**Validation.** `normalizeSiteIdentity(input)` returns `{ value, errors }`. `value` keeps only valid, non-empty fields; `errors` is one `{ field, code }` per rejected field, with dotted paths (`locations.0.openingHours.monday.1`) and code `invalid`, `tooLong`, `tooMany` or `unknown`. The form (`siteIdentityForm.js`) and the controller run the same function.

**Controller** (`projectController.js`):

- `createProject` accepts `siteIdentity` (the form sends it on create too, without the logo, which follows once the project exists), and `updateProject` validates it whenever it is sent. Any error → `400 { error: "Invalid business details.", fields }`, and nothing is written.
- Before validation, `readSiteIdentity` tag-strips only human-readable text (public name, description, price range, street, locality, region, postcode, location label) with `stripHtmlToText`, which returns plain text with `&` kept as typed. URLs, email, telephone and the logo path are validated exactly as sent — a re-serialising sanitizer would rewrite a query string.
- A save that sends the identity refreshes its media usage (`updateSiteIdentityMediaUsage`, source `global:site-identity`), so the library won't delete the logo and exports copy it. The full rescan includes it too.
- Project ZIP export writes `siteIdentity` into the manifest; import keeps only the valid part (`normalizeSiteIdentity(...).value`) and never refuses a project for it; duplicate copies it with the rest of the row.

**UI** (create and edit; `app/src/components/projects/SiteIdentityFields.jsx`, `OpeningHoursEditor.jsx`, `siteIdentityForm.js`, strings under `forms.project.identity` / `forms.project.business` in `packages/core/src/locales/en.json`):

- **Tabs.** General (title, theme, folder name, notes, theme updates), Site (Site Title, Site Address, Clean URLs), Identity, Business details. One Save covers all tabs; a blocked save opens the first tab with a problem, and tabs with errors carry a dot.
- **Readiness line** at the top of *Identity*, only while something is missing — `identityReadiness` over the unsaved form values: site address, name, logo (not for a person), address (local business: street, city, country). Each missing item is a button that opens its tab and focuses the field.
- **Identity** — category (grouped General / Local business), public name (Site Title as placeholder), logo, email, short description, profiles (only filled ones, plus an "Add a profile…" picker over the 15 networks).
- **Business details** — a tab shown for a local-business category, or whenever one of its fields has an error so a switched category can't hide one: phone, price range, location name, address, and the opening-hours editor (per day Not stated / Closed / Open, up to four ranges, "Add hours" for split shifts).
- **Logo.** Media and theme requests are scoped to the active project on the server. Editing is always the active project, so the field is the usual image picker plus "Use the Site Icon" (offered when a Site Icon exists and no logo is set). A new project has no media library yet, so the field (`LogoFileInput.jsx`) holds a local image file with a preview, checked against the image types and the media size limit. `ProjectsAdd` creates the project, makes it active, uploads the file with `uploadProjectMedia`, then saves the returned path with `updateProject(id, { name, siteIdentity: { …, logo } })`. If the upload or that save fails, the project is kept and a warning says the logo can be added in Project details.
- Submit runs `formToIdentity`, which also refuses emptying the primary location while other locations exist (`primaryRequired`): the pruned primary would otherwise be replaced by the next, uneditable location. Any error blocks the save with a toast and per-field messages. The form is `noValidate` so core's rules own the errors, and `MediaDrawer` stops its own submit event, which React would otherwise bubble through the portal into the project form.

---

## Project-Switch Isolation

When the user switches projects, the app must ensure no data from the previous project leaks into the new context (stale reads, cross-project writes, wrong-project previews).

### How switching works

`openProjectWorkspace()` in `Projects.jsx` calls `PUT /api/projects/active/:id` to set the new active project in SQLite, refreshes the Zustand store via `fetchActiveProject()`, then navigates to `/pages`. `RequireActiveProject` remounts the site-workspace subtree with a project-keyed outlet, while `app/src/App.jsx` observes the active-project change and resets the project-scoped frontend stores via `projectSwitchCoordinator`.

### Server-side protection

`resolveActiveProject` middleware is applied to all project-scoped routes. Scope resolution is delegated to the injected adapter: the middleware calls `req.adapters.scopeResolver.resolveScope(req)` and attaches the resulting `req.scope` (`{ actor, projectId, folderName }`), so swapping adapters swaps tenancy behaviour with no route changes. For write requests, it validates both the `X-Project-Id` header (injected by `apiFetch` from the Zustand store) and `req.params.projectId` against the server's active project. Either mismatch returns 409 `PROJECT_MISMATCH`. Controllers read the resolved scope (and `req.activeProject`) from the middleware. See [Packages & Adapter Architecture](core-packages.md).

### Client-side protection

- **RequireActiveProject** is the central project-switch boundary for site-workspace routes. It clears singleton frontend stores on active-project changes and keys the route outlet by project ID so project-owned components remount cleanly.
- **pageStore** uses an `activeLoadId` counter to discard stale async loads. Tracks `loadedProjectId` so `saveStore` can compare before saving.
- **themeStore** is the canonical owner of theme settings across Settings and the editor. It uses `activeLoadId` to drop stale loads, and its `resetForProjectChange()` action is invoked by the shared route boundary on real project switches.
- **widgetStore** resets schemas and selection via `resetForProjectChange()`, reads the project ID internally via `getActiveProjectId()`, and now relies on the shared route boundary rather than page-local reset calls.
- **saveStore** preserves edits when a stale save is rejected with `PROJECT_MISMATCH`, stops auto-save retries, and is reset centrally on project switches by the shared route boundary.
- **Settings.jsx** reads/writes through `themeStore`; it still guards save completion against mid-flight project changes, but project-switch reset ownership now lives in the route boundary rather than the page component.
- **useExportState / ExportCreator** guard history loads and export completion against project changes mid-flight

### Known limitation

`useNavigationGuard` and `useFormNavigationGuard` only watch route changes, not project changes. If the user has unsaved edits and switches projects via the sidebar, they won't see an "unsaved changes" prompt. The server will reject any stale write (409), so no data corruption occurs — but the user loses their edits silently. Acceptable for v1.0 single-user desktop use.

---

## Backend API Endpoints

The frontend `projectManager.js` communicates with a set of backend API endpoints defined in `packages/builder-server/src/routes/projects.js`. The OSS shell mounts the actor-scoped router (which carries `projectRoutes`) under `/api`, yielding the `/api/projects/...` URLs below. These routes handle the core logic of project management.

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
| `GET` | `/api/projects/:id/theme-updates/status` | `getThemeUpdateStatus` | Checks whether a newer theme version is available for the project. |
| `PUT` | `/api/projects/:id/theme-updates` | `toggleProjectThemeUpdates` | Toggles the project's `receiveThemeUpdates` preference (`enabled: boolean`). |
| `POST` | `/api/projects/:id/theme-updates/apply` | `applyProjectThemeUpdate` | Applies the currently available theme update to the project. |

> **Note.** The active project's widget schemas and icon set are served by `projectController.getProjectWidgets` / `getProjectIcons`, but those routes live on the **project-scoped** router (`packages/builder-server/src/routes/widgets.js` and `icons.js`), mounted at `/api/widgets` and `/api/icons` — not under `/api/projects/...`. They are documented with the widget and theme tooling, not in the project route table above.

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
- [Packages & Adapter Architecture](core-packages.md) - Adapters, DI, `Scope`, and `LIMIT_KEYS`
