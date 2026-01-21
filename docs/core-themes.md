# Themes

This document explains the "Themes" management page, which is the user interface for viewing and uploading themes. In the application's architecture, a "Theme" is the core concept for styling and layout.

## 1. Overview

Themes are structured directories that define the layout, styles, and functionality of the application. In packaged Electron builds, the themes directory is bundled under `app.asar.unpacked/themes/`. Each theme contains:

- `theme.json`: Theme metadata and configuration.
- `screenshot.png`: A 1280x720 preview image of the theme, displayed on the card in the Themes UI.

## 2. Frontend Implementation (`src/pages/Themes.jsx`)

The frontend component provides a clean interface for theme management.

### Key Features

- **Theme Grid**: Displays all available themes in a responsive grid layout.
- **Upload Functionality**: Drag-and-drop interface for uploading new theme ZIP files.
- **Active Theme Indicator**: Visual indication of which theme is currently active for the project.
- **Localization**: Fully integrated with `react-i18next` for all user-facing text.

### Displaying Themes

The component fetches themes on mount and displays them as cards. Each card shows:

- Theme screenshot
- Theme name and version
- Author information
- Widget count
- Active status (if applicable)

### Upload Process

When a user uploads a ZIP file:

1. The file is validated on the client side
2. Uploaded via `uploadThemeZip()` utility function
3. Server processes and extracts the theme
4. Local state updates to show the new theme immediately
5. Success/error feedback via toast notifications

The upload uses `react-dropzone` for a modern drag-and-drop experience with visual feedback during the upload process.

### State Management

The component manages local state for:

- `themes`: Array of available themes
- `loading`: Loading state for initial theme fetch
- Upload status and progress

The `handleUploadSuccess` callback allows the uploader component to update the themes list without requiring a full page refresh. This function, located in the parent `Themes` component, adds the new theme to the `themes` array in the state. This allows the UI to update instantly without needing to re-fetch the entire list.

## 3. Backend Implementation

The backend handles the logic for listing the themes and processing uploads.

### API Routes (`server/routes/themes.js`)

| Method | Endpoint | Middleware | Controller Function | Description |
| --- | --- | --- | --- | --- |
| `GET` | `/api/themes` |  | `getAllThemes` | Gets metadata for all installed themes. |
| `POST` | `/api/themes/upload` | `upload.single("themeZip")` | `uploadTheme` | Handles the upload and extraction of a new theme zip. |

### Controller Logic (`server/controllers/themeController.js`)

- `getAllThemes`: This function reads the names of all the directories inside the main `/themes/` folder. It then reads the `theme.json` file from each directory, extracts the necessary metadata, and returns an array of theme objects.
- `uploadTheme`: This function performs the complex process of installing a new theme:
  1.  **Reception**: The `multer` middleware first receives the uploaded file and holds it in memory as a buffer.
  2.  **Validation**: The controller uses the `adm-zip` library to inspect the zip file _without_ extracting it to disk first. It performs several critical checks:
      - It rejects empty zip files.
      - It ensures the zip file contains a single root directory.
      - **Structural Validation**: It verifies the presence of mandatory files: `theme.json`, `layout.liquid`, and `screenshot.png`.
      - **Directory Validation**: It ensures the `assets/`, `templates/`, and `widgets/` directories exist and are not empty.
      - **Metadata Validation**: It parses `theme.json` and ensures `name`, `version`, and `author` fields are present.
      - It checks if a theme directory with the same name already exists in `/themes/` to prevent overwriting an existing theme.
  3.  **Extraction**: If all validation checks pass, the controller extracts the contents of the zip file's root folder into a new directory within `/themes/`.
  4.  **Response**: It sends a success response to the client, including the programmatically calculated widget count.

## Security Considerations

All API endpoints described in this document are protected by the platform's core security layers, including input validation, rate limiting, and CORS policies. For a comprehensive overview of these protections, see the **[Platform Security](core-security.md)** documentation.

---

**See also:**

- [Theming Guide](theming.md) - How to author themes (structure, settings, widgets)
- [Widget Authoring Guide](theming-widgets.md) - Creating widgets for themes
- [Project Management](core-projects.md) - How themes are copied to projects on creation
