# Starter Kits (Themes)

This document explains the "Starter Kits" management page, which is the user interface for viewing and uploading themes. In the application's architecture, a "Starter Kit" is synonymous with a "Theme".

## 1. Theme Structure & Storage

A theme is a self-contained directory that includes all the necessary files to define a website's structure, styling, and default content.

- **Location**: All installed themes are located in the `/themes/` directory at the root of the project. Each theme has its own sub-directory (e.g., `/themes/default/`).
- **Required Files**:
  - `theme.json`: The manifest file containing metadata like the theme's name, version, author, and the schema for its global settings.
  - `screenshot.png`: A preview image of the theme, displayed on the card in the Starter Kits UI.
- **Standard Directories**:
  - `widgets/`: Contains Liquid templates for all widgets specific to this theme.
  - `templates/`: Contains JSON files defining page templates.
  - `assets/`: Contains static assets like CSS, JavaScript, and font files.

## 2. Frontend Implementation (`src/pages/StarterKits.jsx`)

The frontend consists of the main page component for displaying the themes and a specialized uploader component.

### Displaying Starter Kits

- **Fetching Data**: On page load, the `useEffect` hook calls `getAllThemes()` from `src/utils/themeManager.js`. This function makes a `GET` request to `/api/themes` to get a list of all installed themes.
- **Rendering Cards**: The component maps over the list of themes and renders a card for each one.
  - The card displays the `name`, `version`, `author`, and number of `widgets` from the theme's `theme.json` data.
  - The preview image is loaded using `getThemeScreenshotUrl(theme.id)`, which constructs a direct URL to the theme's `screenshot.png` file.
- **Active Theme**: The component checks if a theme's ID matches the `theme` property of the `activeProject` (from the global store). If it matches, an "Active" badge is displayed on the card.

### Uploading a New Theme (`ThemeUploader` component)

This self-contained component handles the theme upload process.

- **UI**: It uses the `react-dropzone` library to create a drag-and-drop area for a single `.zip` file. The UI provides visual feedback for different states like idle, active drag, successful drop, and upload in progress.
- **Upload Logic**:
  1.  When a user drops a file, the `onDrop` callback is triggered.
  2.  It calls `uploadThemeZip(file)` from the `themeManager`. This function sends the zip file in a `FormData` object via a `POST` request to `/api/themes/upload`.
  3.  **Local State Update**: On a successful upload, the `onUploadSuccess` callback is invoked with the newly uploaded theme's data. This function, located in the parent `StarterKits` component, adds the new theme to the `themes` array in the state. This allows the UI to update instantly without needing to re-fetch the entire list.
  4.  **User Feedback**: The `ThemeUploader` uses its own `useEffect` hook to watch for status changes and displays success or error toast notifications accordingly.

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
      - It ensures the zip file contains a single root directory (e.g., `my-cool-theme/`). It will reject zips that have files like `theme.json` at the top level instead of inside a folder.
      - It checks if a theme directory with the same name already exists in `/themes/` to prevent overwriting an existing theme.
  3.  **Extraction**: If all validation checks pass, the controller extracts the contents of the zip file's root folder into a new directory within `/themes/`.
  4.  **Response**: It sends a success response to the client, including the `theme.json` data of the newly installed theme so the frontend can update its state.
