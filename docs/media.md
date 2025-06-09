# Media Library

This document provides an exhaustive explanation of the Media Library system, covering its architecture, data storage, and the full range of frontend and backend functionalities.

## 1. Architecture & Data Storage

The Media Library is designed to handle file uploads, storage, and metadata management on a per-project basis.

### Physical File Storage

- **Location**: Uploaded files are physically stored on the server's filesystem at `/data/projects/<projectId>/uploads/images/`.
- **File Naming**: To avoid conflicts, uploaded files are renamed. The original filename is "slugified" (e.g., "My Awesome Picture.jpg" becomes `my-awesome-picture.jpg`). If a file with that name already exists, a counter is appended (e.g., `my-awesome-picture-1.jpg`).
- **Thumbnails**: For image files (excluding SVGs), the system automatically generates a small thumbnail to ensure fast previews in the UI. These are stored alongside the originals with a `thumb_` prefix (e.g., `thumb_my-awesome-picture.jpg`).

### Metadata Storage

All metadata for the files in a project's media library is stored in a single JSON file.

- **Location**: `/data/projects/<projectId>/uploads/media.json`
- **Structure**: This file contains a single object with a `files` array. Each object in the array represents one file and stores critical information.

```json
{
  "files": [
    {
      "id": "c1b2a3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      "filename": "my-awesome-picture.jpg",
      "originalName": "My Awesome Picture.jpg",
      "type": "image/jpeg",
      "size": 123456,
      "uploaded": "2023-10-29T10:00:00.000Z",
      "path": "/uploads/images/my-awesome-picture.jpg",
      "metadata": {
        "alt": "An awesome picture of a sunset",
        "title": "Sunset Over Mountains"
      },
      "width": 1920,
      "height": 1080,
      "thumbnail": "/uploads/images/thumb_my-awesome-picture.jpg"
    }
  ]
}
```

## 2. Frontend Implementation (`src/pages/Media.jsx`)

The frontend is a single, powerful component that provides a complete interface for all media operations.

### Core UI Components

- `MediaUploader`: A drag-and-drop zone for uploading files. It displays a progress bar for each file during the upload process.
- `MediaToolbar`: Appears once files are present. It contains:
  - **View Toggle**: Buttons to switch between `MediaGrid` and `MediaList` views. The user's preference is saved in `localStorage`.
  - **Search Bar**: Filters the displayed files by their original filename in real-time.
  - **Bulk Actions**: A "Delete Selected" button that becomes active when one or more files are selected.
- `MediaGrid`: The default view, showing files as a responsive grid of thumbnail cards.
- `MediaList`: An alternative table-based view showing more file details at a glance. It includes a "Select All" checkbox.
- `MediaDrawer`: A slide-out panel that appears when a user clicks the "Edit" icon on a file. It contains a form to update the file's `alt` text and `title`.
- `ConfirmationModal`: A dialog that prompts the user for confirmation before deleting a single file or a selection of multiple files.

### Key Workflows & Logic

- **Loading**: When the component mounts, it calls `getProjectMedia` from the `mediaManager` to fetch the `media.json` for the active project and populates the `files` state.
- **Uploading (`handleUpload`)**:
  1.  Files dropped onto the uploader are passed to `uploadProjectMedia`. This function uses `XMLHttpRequest` instead of `fetch` to get access to the `onprogress` event, allowing it to update the UI with the upload progress in real time.
  2.  The backend processes the files (see backend section).
  3.  The frontend receives a response containing `processedFiles` and `rejectedFiles` arrays.
  4.  It shows detailed toast notifications: a success message for good uploads, a warning for partial uploads, and detailed error messages for each rejected file.
  5.  The local `files` state is updated with the `processedFiles` returned from the server.
- **File Selection**: A `selectedFiles` state array tracks the IDs of selected files. Clicking a file toggles its ID in the array. The "Select All" function either populates this array with all currently filtered file IDs or clears it.
- **Deletion (`handleDelete`)**:
  - When a user confirms deletion, the `handleDelete` function is called.
  - It checks if it's a bulk delete or single file delete.
  - It calls either `deleteMultipleMedia` or `deleteProjectMedia` from the `mediaManager`.
  - On a successful response from the server, it removes the corresponding file(s) from the local `files` state to instantly update the UI.
- **Metadata Editing (`handleSaveMetadata`)**:
  1.  The user edits the `alt` text or `title` in the `MediaDrawer` and clicks "Save".
  2.  The `handleSaveMetadata` function sends a `PUT` request to the `/api/media/projects/:projectId/media/:fileId/metadata` endpoint with the new data.
  3.  On success, it updates the metadata for the specific file in the local `files` state and closes the drawer.

## 3. Backend Implementation

The backend uses Express.js with `multer` for file handling and `sharp` for image processing.

### API Routes (`server/routes/media.js`)

| Method | Endpoint | Middleware | Controller Function | Description |
| --- | --- | --- | --- | --- |
| `GET` | `/api/media/projects/:projectId/media` |  | `getProjectMedia` | Reads and returns the `media.json`. |
| `POST` | `/api/media/projects/:projectId/media` | `upload.array("files")` | `uploadProjectMedia` | Handles file uploads. |
| `DELETE` | `/api/media/projects/:projectId/media/:fileId` |  | `deleteProjectMedia` | Deletes a single file and its metadata. |
| `POST` | `/api/media/projects/:projectId/media/bulk-delete` |  | `bulkDeleteProjectMedia` | Deletes multiple files and their metadata. |
| `PUT` | `/api/media/projects/:projectId/media/:fileId/metadata` |  | `updateMediaMetadata` | Updates the metadata for a single file. |
| `GET` | `/api/media/projects/:projectId/uploads/images/:filename` |  | `serveProjectMedia` | Serves a physical file for viewing. |

### Controller Logic (`server/controllers/mediaController.js`)

- **File Upload (`multer` + `uploadProjectMedia`)**:
  1.  The `multer` middleware is configured first. It intercepts the request, saves the uploaded files to the correct project directory (`/data/projects/<projectId>/uploads/images/`) with a unique, slugified name. It also filters files to ensure they have an allowed MIME type (e.g., `image/jpeg`).
  2.  The `uploadProjectMedia` function then runs. It dynamically checks each uploaded file against the `media.maxFileSizeMB` setting.
  3.  For each valid file, it generates a unique ID (`uuidv4`).
  4.  If the file is an image, it uses the `sharp` library to read its dimensions (`width`, `height`) and generate a thumbnail.
  5.  It creates a new metadata object for the file and adds it to the `files` array in `media.json`.
  6.  Files that are too large or have the wrong type are rejected and immediately deleted from the server.
  7.  It returns a JSON response to the client with arrays of successfully processed and rejected files.
- **Deletion Logic (`deleteProjectMedia`, `bulkDeleteProjectMedia`)**:
  1.  The controller reads `media.json`.
  2.  It finds the file entry (or entries) by ID.
  3.  It uses `fs.remove` to delete the physical file(s) and their corresponding thumbnail(s) from the filesystem.
  4.  It removes the metadata object(s) from the `files` array.
  5.  It overwrites `media.json` with the updated data.
- **Metadata Update (`updateMediaMetadata`)**:
  1.  The controller reads `media.json`.
  2.  It finds the file to update in the `files` array by its `fileId`.
  3.  It updates the `alt` and `title` properties within the `metadata` object for that file.
  4.  It overwrites `media.json` with the updated data and returns the updated file object.
