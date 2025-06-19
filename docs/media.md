# Media Library

This document provides an exhaustive explanation of the Media Library system, covering its architecture, data storage, and the full range of frontend and backend functionalities.

## 1. Architecture & Data Storage

The Media Library is designed to handle file uploads, storage, and metadata management on a per-project basis.

### Physical File Storage

- **Location**: Uploaded files are physically stored on the server's filesystem:
  - **Images**: `/data/projects/<projectId>/uploads/images/`
  - **Videos**: `/data/projects/<projectId>/uploads/videos/`
- **File Naming**: To avoid conflicts, uploaded files are renamed. The original filename is "slugified" (e.g., "My Awesome Picture.jpg" becomes `my-awesome-picture.jpg`). If a file with that name already exists, a counter is appended (e.g., `my-awesome-picture-1.jpg`).
- **Automatic Resizing**: To improve site performance, the system automatically creates multiple sizes for each uploaded image (excluding SVGs). The generated sizes and quality settings are **fully configurable** through the App Settings interface. Generated sizes are stored alongside the original with prefixes (e.g., `thumb_`, `small_`, `medium_`, `large_`).
- **Video Processing**: Videos are stored without any processing - no thumbnail generation or metadata extraction. This keeps the upload process simple and fast.

### Image Processing Configuration

The system's image processing behavior is controlled through **App Settings**, making it fully customizable:

- **Quality Setting**: A single quality value (1-100) applies to all generated image sizes, allowing administrators to balance file size vs. image quality.
- **Size Configuration**: Each image size can be individually:
  - **Enabled/Disabled**: Toggle specific sizes on or off
  - **Width Customized**: Set custom maximum widths for each size
- **Default Sizes**:
  - `thumb`: 150px width (for previews)
  - `small`: 480px width
  - `medium`: 1024px width
  - `large`: 1920px width
- **Fallback Behavior**: If the `thumb` size is disabled, the system automatically uses the first available enabled size (or original image) for thumbnail previews.

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
      "thumbnail": "/uploads/images/thumb_my-awesome-picture.jpg",
      "sizes": {
        "thumb": { "path": "/uploads/images/thumb_my-awesome-picture.jpg", "width": 150, "height": 113 },
        "small": { "path": "/uploads/images/small_my-awesome-picture.jpg", "width": 480, "height": 360 },
        "medium": { "path": "/uploads/images/medium_my-awesome-picture.jpg", "width": 1024, "height": 768 }
        // Note: "large" size omitted if disabled in settings
      }
    },
    {
      "id": "v4e3b2c1-f6a5-4b9e-8d7c-6f5e4d3c2b1a",
      "filename": "hero-video.mp4",
      "originalName": "Hero Video.mp4",
      "type": "video/mp4",
      "size": 15728640,
      "uploaded": "2023-10-29T11:00:00.000Z",
      "path": "/uploads/videos/hero-video.mp4",
      "metadata": {
        "alt": "Hero background video showing product in action",
        "title": "Product Demo Video"
      },
      "thumbnail": null
    }
    }
  ]
}
```

_Note: The `sizes` object only contains entries for enabled image sizes. Disabled sizes are not generated or stored._

### Video Support

The media library supports video uploads alongside images with the following features:

**Supported Video Formats:**

- MP4 (recommended for best browser compatibility)
- WebM
- OGG
- AVI
- MOV

**Video Processing:**

- **No Processing**: Videos are uploaded and stored as-is without any processing
- **No Thumbnails**: Videos do not generate thumbnail images
- **No Metadata Extraction**: Video dimensions and duration are not extracted
- **Simple Storage**: Videos maintain their original quality and file size
- **Separate Directory**: Videos are stored in `/uploads/videos/` directory
- **Size Limits**: Videos have separate size limits from images (configurable in App Settings)

**Video-Specific Metadata:**

- `thumbnail`: Always `null` for videos (no thumbnails generated)
- No additional metadata is extracted or stored for videos

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

- **Dynamic Image Processing Settings**: The system loads image processing configuration dynamically from App Settings:
  ```javascript
  // Loads quality and enabled sizes from app settings
  const imageProcessingSettings = await getImageProcessingSettings();
  // Returns only enabled sizes with their width and quality settings
  ```
- **File Upload (`multer` + `uploadProjectMedia`)**:
  1.  The `multer` middleware is configured first. It intercepts the request, saves the uploaded files to the correct project directory (images: `/data/projects/<projectId>/uploads/images/`, videos: `/data/projects/<projectId>/uploads/videos/`) with a unique, slugified name. It also filters files to ensure they have an allowed MIME type.
  2.  The `uploadProjectMedia` function then runs. It dynamically checks each uploaded file against the appropriate size limit (`media.maxFileSizeMB` for images, `media.maxVideoSizeMB` for videos).
  3.  For each valid file, it generates a unique ID (`uuidv4`).
  4.  If the file is an image (not an SVG), it uses the `sharp` library to:
      - Read the original `width` and `height`.
      - **Dynamically load** the current image processing settings from App Settings
      - Generate **only the enabled** image sizes with the configured quality setting
      - Apply the configured maximum widths for each enabled size
  5.  If the file is a video, no processing is performed - it's simply stored as-is.
  6.  It creates a new metadata object for the file—including a `sizes` object containing the paths and dimensions for generated variants (images only)—and adds it to the `files` array in `media.json`.
  7.  **Thumbnail Assignment**: The system ensures there's always a thumbnail for previews:
      - If `thumb` size is enabled: uses the thumb image
      - If `thumb` is disabled: uses the first available enabled size
      - If no sizes are enabled: uses the original image
  8.  Files that are too large or have the wrong type are rejected and immediately deleted from the server.
  9.  It returns a JSON response to the client with arrays of successfully processed and rejected files.
- **Deletion Logic (`deleteProjectMedia`, `bulkDeleteProjectMedia`)**:
  1.  The controller reads `media.json`.
  2.  It finds the file entry (or entries) by ID.
  3.  It uses `fs.remove` to delete the original physical file and **all** of its generated sizes from the filesystem.
  4.  It removes the metadata object(s) from the `files` array.
  5.  It overwrites `media.json` with the updated data.
- **Metadata Update (`updateMediaMetadata`)**:
  1.  The controller reads `media.json`.
  2.  It finds the file to update in the `files` array by its `fileId`.
  3.  It updates the `alt` and `title` properties within the `metadata` object for that file.
  4.  It overwrites `media.json` with the updated data and returns the updated file object.
