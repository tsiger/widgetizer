# Site Exporting

This document explains the process of exporting a project, which generates a complete, static HTML version of the website. This static version can be deployed to any standard web hosting service.

The export system includes automatic version management, with configurable retention policies and comprehensive export history tracking.

## 1. Frontend Implementation (`src/pages/ExportSite.jsx`)

The export interface has been **refactored** into a modular architecture with the main component acting as an orchestrator for specialized components and hooks.

### Architecture Overview

The `ExportSite.jsx` component (reduced from ~300 lines to ~40 lines) now uses a **component-based architecture** that separates concerns:

- **`useExportState`**: Centralized state management and data loading
- **`ExportCreator`**: Export creation interface and workflow
- **`ExportHistoryTable`**: Export history display and management
- **Localization**: Fully integrated with `react-i18next` for all user-facing text

This architecture provides better **maintainability**, **reusability**, and **separation of concerns** while keeping the main component focused on layout orchestration.

### Custom Hook

#### `useExportState` Hook (`src/hooks/useExportState.js`)

Manages all export-related state and data loading:

- **Project State**: Active project information and validation
- **Export History**: Loading and managing export version history
- **State Management**: Last export tracking and history updates
- **Settings Integration**: Max versions configuration from app settings
- **Data Loading**: Centralized data fetching and error handling

### Specialized Components

#### `ExportCreator` Component (`src/components/export/ExportCreator.jsx`)

Handles the export creation workflow:

- **Clean Interface**: Project name display and export button
- **Export Processing**: Handles export API calls with loading states
- **Progress Feedback**: Loading states and success/error notifications
- **Version Management**: Updates export history after successful exports
- **Error Handling**: Comprehensive error reporting and user feedback
- **Localization**: All labels, status messages, and notifications are fully localized

#### `ExportHistoryTable` Component (`src/components/export/ExportHistoryTable.jsx`)

Manages export history display and actions:

- **Dynamic Display**: Shows all available export versions with configurable limits
- **Version Information**: Version numbers, timestamps, and status display
- **Export Actions**: View, download, and delete operations with confirmation dialogs
- **Settings Integration**: Displays current retention settings from app configuration
- **Smart File Detection**: Automatic entry point detection for export viewing

### Export Creation Workflow

- **UI**: Clean interface with project name and "Export Project" button with loading states
- **Export Triggering**:
  1. User clicks export button in `ExportCreator`
  2. Component calls `exportProjectAPI(activeProject.id)` from `exportManager`
  3. Manager sends `POST` request to `/api/export/:projectId` endpoint
- **Feedback**: Success/error notifications with version information and automatic history refresh

### Export History Management

- **Dynamic Display**: Shows export versions up to user-configured limits
- **Version Information**: Version numbers (v1, v2, v3), timestamps, and status
- **Export Actions**:
  - **View**: Opens exported site with smart file detection (index.html → home.html → first HTML file)
  - **Download**: Downloads complete export as ZIP file
  - **Delete**: Removes exports with confirmation dialogs
- **Settings Integration**: Real-time display of retention settings from app configuration

### Benefits of Refactored Architecture

- **Separation of Concerns**: Each component handles a specific aspect of export functionality
- **Reusability**: Components can be easily reused or extended for different export workflows
- **Maintainability**: Smaller, focused components are easier to understand and modify
- **Testability**: Individual components can be unit tested independently
- **Reduced Complexity**: Main component focuses on layout orchestration rather than business logic

## 2. Backend Implementation

The core of the exporting process is a multi-step, server-side operation handled by the `exportProject` function in `server/controllers/exportController.js`.

### Export Workflow

When the `/api/export/:projectId` endpoint is called, the following steps are executed:

1.  **Version Management**:

    - The system determines the next version number by reading the export history for the project.
    - Version numbers auto-increment starting from v1 (v1, v2, v3, etc.).

2.  **Create Output Directory**:

    - A new directory is created inside `/data/publish/`.
    - To prevent overwriting previous exports, the directory is named with the project's **slug** (with ID as fallback) and version number (e.g., `my-project-slug-v1`, `my-project-slug-v2`, etc.).

3.  **Load Project Data**:

    - The controller loads all necessary data for the project, including the theme settings (`theme.json`), a list of all pages, and the global header and footer data.
    - **Homepage Validation**: The system verifies that at least one page has the slug "index" to serve as the homepage. If no homepage exists, the export fails with a clear error message.

4.  **Render Global Widgets**:

    - The header and footer widgets are rendered once into HTML strings using the `renderingService`. This is done in `"publish"` mode, which ensures that asset paths in the final HTML are relative (e.g., `uploads/images/logo.png`) instead of absolute API URLs.

5.  **Iterate and Render Pages**:

    - The controller loops through each page of the project. For each page, it: a. Renders all the widgets assigned to that page into a single HTML string. b. Combines the rendered header, page widgets, and footer into the final page content. c. Passes this combined content to the main `layout.liquid` template via the `renderPageLayout` function. d. The final, complete HTML for the page is generated.

6.  **Generate SEO Files**:

    - If the project has a `siteUrl` defined, the system automatically generates:
      - **`sitemap.xml`**: A complete sitemap of all indexed pages (respecting SEO metadata).
      - **`robots.txt`**: A standard instructions file for search engines, including the sitemap location and disallow rules for pages marked `noindex`.

7.  **Format and Write HTML Files**:

    - The generated HTML for each page is run through **Prettier** to ensure clean, readable formatting.
    - The formatted HTML is saved as a file in the output directory (e.g., `about-us.html`). If a page's slug is "home" or "index", it is saved as `index.html`.

8.  **Copy Static Assets**:

    - The system performs several copy operations to ensure the static site is self-contained:
      - **Theme Assets**: All files from the project's `/assets` directory (e.g., `base.css`, `scripts.js`) are copied to `/assets` in the output directory.
      - **Core Assets**: Placeholder images (SVG) from the core assets are copied to ensure widgets using placeholders work correctly.
      - **Widget Assets**: The controller recursively searches the project's `/widgets` directory for any `.css` or `.js` files and copies them into the output `/assets` directory.
      - **Optimized Image Copying**: Uses media usage tracking to selectively copy only images that are actually used:
        - Reads the project's `media.json` file to identify which images have a non-empty `usedIn` array
        - Only copies images that are referenced in at least one page
        - For each used image, copies the original file plus all generated sizes (thumb, small, medium, large)
        - Images are copied to `assets/images/` (not `uploads/images/`)
        - Falls back to copying all images if media tracking fails
      - **Optimized Video Copying**: Same usage-based approach for videos:
        - Only copies videos that have a non-empty `usedIn` array
        - Videos are copied to `assets/videos/`
      - **Optimized Audio Copying**: Same usage-based approach for audio files:
        - Only copies audio files that have a non-empty `usedIn` array
        - Audio files are copied to `assets/audios/`
      - **Export Optimization**: Logs how many media files were copied vs. skipped, often reducing export size significantly

9.  **Record Export History**:

    - The export metadata is recorded in `/data/publish/export-history.json` with version number, timestamp, output directory, and status.
    - **Automatic Cleanup**: If the number of exports exceeds the user's configured limit (from App Settings), the oldest exports are automatically deleted:
      - Physical export directories are removed from the file system
      - Export history entries are cleaned up
      - The cleanup process respects the `export.maxVersionsToKeep` setting

10. **Send Response**:
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

## Security Considerations

All API endpoints described in this document are protected by the platform's core security layers, including input validation, rate limiting, and CORS policies. For a comprehensive overview of these protections, see the **[Platform Security](core-security.md)** documentation.

---

**See also:**

- [App Settings](core-appSettings.md) - Configure export retention limits
- [Media Library](core-media.md) - Media usage tracking for optimized exports
