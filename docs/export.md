# Site Exporting

This document explains the process of exporting a project, which generates a complete, static HTML version of the website. This static version can be deployed to any standard web hosting service.

The export system includes automatic version management, with configurable retention policies and comprehensive export history tracking.

## 1. Frontend Implementation (`src/pages/ExportSite.jsx`)

The export interface provides comprehensive export management with version control and history tracking.

### Export Creation Section

- **UI**: Clean interface with project name and "Export Project" button. During export, the button shows a loading state.
- **Triggering the Export**:
  1.  When the user clicks the button, the `handleExport` function is called.
  2.  This function calls `exportProjectAPI(activeProject.id)` from `src/utils/exportManager.js`.
  3.  This manager sends a `POST` request to the `/api/export/:projectId` endpoint.
- **Feedback**: After the backend process completes, the frontend receives a response.
  - On success, a toast notification shows the version number, and the new export appears in the export history table.
  - On failure, an error toast is displayed with a message from the server.
  - Success notification includes creation timestamp and version number.

### Export History Section

- **Dynamic Display**: Shows all available export versions (up to the user's configured limit from App Settings).
- **Version Information**: Each export displays:
  - Version number (v1, v2, v3, etc.)
  - Creation date and time
  - Export status (success/failed)
  - Available actions
- **Export Actions**:
  - **View**: Opens the exported site in a new browser tab with smart file detection (prefers `index.html`, falls back to first available HTML file)
  - **Download**: Downloads the complete export as a ZIP file
  - **Delete**: Removes the export with confirmation dialog
- **Settings Integration**: Header displays current retention setting ("Keeping latest N versions") from App Settings.

## 2. Backend Implementation

The core of the exporting process is a multi-step, server-side operation handled by the `exportProject` function in `server/controllers/exportController.js`.

### Export Workflow

When the `/api/export/:projectId` endpoint is called, the following steps are executed:

1.  **Version Management**:

    - The system determines the next version number by reading the export history for the project.
    - Version numbers auto-increment starting from v1 (v1, v2, v3, etc.).

2.  **Create Output Directory**:

    - A new directory is created inside `/data/publish/`.
    - To prevent overwriting previous exports, the directory is named with the project's ID and version number (e.g., `my-project-id-v1`, `my-project-id-v2`, etc.).

3.  **Load Project Data**:

    - The controller loads all necessary data for the project, including the theme settings (`theme.json`), a list of all pages, and the global header and footer data.

4.  **Render Global Widgets**:

    - The header and footer widgets are rendered once into HTML strings using the `renderingService`. This is done in `"publish"` mode, which ensures that asset paths in the final HTML are relative (e.g., `uploads/images/logo.png`) instead of absolute API URLs.

5.  **Iterate and Render Pages**:

    - The controller loops through each page of the project. For each page, it: a. Renders all the widgets assigned to that page into a single HTML string. b. Combines the rendered header, page widgets, and footer into the final page content. c. Passes this combined content to the main `layout.liquid` template via the `renderPageLayout` function. d. The final, complete HTML for the page is generated.

6.  **Format and Write HTML Files**:

    - The generated HTML for each page is run through **Prettier** to ensure clean, readable formatting.
    - The formatted HTML is saved as a file in the output directory (e.g., `about-us.html`). If a page's slug is "home" or "index", it is saved as `index.html`.

7.  **Copy Static Assets**:

    - The system performs several copy operations to ensure the static site is self-contained:
      - **Theme Assets**: All files from the project's `/assets` directory (e.g., `style.css`, `main.js`) are copied to `/assets` in the output directory.
      - **Widget Assets**: The controller recursively searches the project's `/widgets` directory for any `.css` or `.js` files and copies them into the output `/assets` directory. This ensures that widget-specific styles and scripts are included.
      - **Uploaded Images**: All images from the project's `/uploads/images` directory are copied to `/uploads/images` in the output directory.

8.  **Record Export History**:

    - The export metadata is recorded in `/data/publish/export-history.json` with version number, timestamp, output directory, and status.
    - **Automatic Cleanup**: If the number of exports exceeds the user's configured limit (from App Settings), the oldest exports are automatically deleted:
      - Physical export directories are removed from the file system
      - Export history entries are cleaned up
      - The cleanup process respects the `export.maxVersionsToKeep` setting

9.  **Send Response**:
    - Once all steps are complete, the server sends a success response to the client, including the export record with version information.

## 3. Export Management Features

### Version Control System

- **Automatic Versioning**: Each export is assigned an incrementing version number (v1, v2, v3, etc.)
- **History Tracking**: All exports are tracked in `/data/publish/export-history.json` with metadata:
  - Project ID
  - Version number
  - Creation timestamp
  - Output directory path
  - Export status
- **Configurable Retention**: Users can set the maximum number of versions to keep in App Settings (1-50 versions)

### API Endpoints

The export system provides several API endpoints for comprehensive export management:

- **`POST /api/export/:projectId`**: Create a new export
- **`GET /api/export/history/:projectId`**: Get export history for a project
- **`DELETE /api/export/:projectId/:version`**: Delete a specific export version
- **`GET /api/export/files/:exportDir`**: Get entry file information for an export
- **`GET /api/export/download/:exportDir`**: Download export as ZIP file
- **`GET /api/export/view/:exportDir/*`**: Serve exported files for preview

### Smart File Detection

When viewing exports, the system automatically detects the best entry point:

1. **Primary**: Looks for `index.html`
2. **Secondary**: Looks for `home.html`
3. **Fallback**: Uses the first available HTML file in the export directory

This ensures exports work correctly even if users rename their main page file.

### Export Downloads

Exports can be downloaded as ZIP files containing:

- All generated HTML files
- Complete asset directories (CSS, JS, images)
- Preserved directory structure
- Ready for deployment to any static hosting service

### Automatic Cleanup

The system automatically manages storage by:

- Monitoring the number of exports per project
- Removing the oldest exports when limits are exceeded
- Cleaning up both file system directories and history records
- Respecting user-configured retention policies
