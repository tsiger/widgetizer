# Site Exporting

This document explains the process of exporting a project, which generates a complete, static HTML version of the website. This static version can be deployed to any standard web hosting service.

## 1. Frontend Implementation (`src/pages/ExportSite.jsx`)

The user interface for triggering the export process is straightforward.

- **UI**: The page displays the name of the active project and a "Export Project" button. During the exporting process, the button enters a disabled "Exporting..." state.
- **Triggering the Export**:
  1.  When the user clicks the button, the `handleExport` function is called.
  2.  This function calls `exportProjectAPI(activeProject.id)` from `src/utils/exportManager.js`.
  3.  This manager sends a `POST` request to the `/api/export/:projectId` endpoint.
- **Feedback**: After the backend process completes, the frontend receives a response.
  - On success, a toast notification is shown, and the path to the newly created static site directory is displayed on the page.
  - On failure, an error toast is displayed with a message from the server.

## 2. Backend Implementation

The core of the exporting process is a multi-step, server-side operation handled by the `exportProject` function in `server/controllers/exportController.js`.

### Export Workflow

When the `/api/export/:projectId` endpoint is called, the following steps are executed:

1.  **Create Output Directory**:

    - A new directory is created inside `/data/publish/`.
    - To prevent overwriting previous exports, the directory is named with the project's ID and a unique timestamp (e.g., `my-project-id-2023-10-30T12-00-00-000Z`).

2.  **Load Project Data**:

    - The controller loads all necessary data for the project, including the theme settings (`theme.json`), a list of all pages, and the global header and footer data.

3.  **Render Global Widgets**:

    - The header and footer widgets are rendered once into HTML strings using the `renderingService`. This is done in `"publish"` mode, which ensures that asset paths in the final HTML are relative (e.g., `uploads/images/logo.png`) instead of absolute API URLs.

4.  **Iterate and Render Pages**:

    - The controller loops through each page of the project. For each page, it: a. Renders all the widgets assigned to that page into a single HTML string. b. Combines the rendered header, page widgets, and footer into the final page content. c. Passes this combined content to the main `layout.liquid` template via the `renderPageLayout` function. d. The final, complete HTML for the page is generated.

5.  **Format and Write HTML Files**:

    - The generated HTML for each page is run through **Prettier** to ensure clean, readable formatting.
    - The formatted HTML is saved as a file in the output directory (e.g., `about-us.html`). If a page's slug is "home" or "index", it is saved as `index.html`.

6.  **Copy Static Assets**:

    - The system performs several copy operations to ensure the static site is self-contained:
      - **Theme Assets**: All files from the project's `/assets` directory (e.g., `style.css`, `main.js`) are copied to `/assets` in the output directory.
      - **Widget Assets**: The controller recursively searches the project's `/widgets` directory for any `.css` or `.js` files and copies them into the output `/assets` directory. This ensures that widget-specific styles and scripts are included.
      - **Uploaded Images**: All images from the project's `/uploads/images` directory are copied to `/uploads/images` in the output directory.

7.  **Send Response**:
    - Once all steps are complete, the server sends a success response to the client, including the path to the final output directory.
