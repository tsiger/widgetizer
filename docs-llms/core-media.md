# Media Library

This document provides an exhaustive explanation of the Media Library system, covering its architecture, data storage, and the full range of frontend and backend functionalities.

## 1. Architecture & Data Storage

The Media Library is designed to handle file uploads, storage, and metadata management on a per-project basis.

### Physical File Storage

- **Location**: Uploaded files are physically stored on the server's filesystem:
- **Images**: `/data/projects/<folderName>/uploads/images/`
- **Videos**: `/data/projects/<folderName>/uploads/videos/`
- **File Naming**: To avoid conflicts, uploaded files are renamed. The original filename is "slugified" (e.g., "My Awesome Picture.jpg" becomes `my-awesome-picture.jpg`). If a file with that name already exists, a counter is appended (e.g., `my-awesome-picture-1.jpg`).
- **Automatic Resizing**: To improve site performance, the system automatically creates multiple sizes for each uploaded image (excluding SVGs). The generated sizes and quality settings are **fully configurable** through the App Settings interface. Generated sizes are stored alongside the original with prefixes (e.g., `thumb_`, `small_`, `medium_`, `large_`).
- **Smart Size Generation**: The system only creates image sizes that are meaningfully smaller than the original. If an image is 800px wide and the "large" size is configured for 1920px, no "large" size will be generated since it would be identical to a smaller size. The image filter automatically falls back to the best available size or original image.
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

- **Location**: `/data/projects/<folderName>/uploads/media.json`
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
      "usedIn": ["about-us", "home"],
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
      "thumbnail": null,
      "usedIn": []
    }
    }
  ]
}
```

_Note: The `sizes` object only contains entries for enabled image sizes. Disabled sizes are not generated or stored._

### Usage Tracking

The media library automatically tracks which pages and global widgets are using each media file to prevent accidental deletion of images that are currently in use.

- **`usedIn` Array**: Each file object contains a `usedIn` array with the slugs of pages and IDs of global widgets that reference this file
- **Automatic Updates**: Usage tracking is updated automatically when:
  - Pages are saved or updated (scans widget and block settings for media paths)
  - Pages are deleted (removes the page slug from all media files)
  - Page slugs are changed (removes old slug, adds new slug to relevant files)
  - **Global widgets** (header/footer) are saved or updated (scans settings for media paths)
- **Delete Protection**: Files with a non-empty `usedIn` array cannot be deleted
- **Manual Refresh**: Users can manually refresh usage tracking to recalculate all relationships
- **Media Types Tracked**: Images, videos, and audio files are all tracked

### Video Support

The media library supports video uploads alongside images with the following features:

**Supported Video Formats:**

- MP4

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

### Audio Support

The media library supports audio uploads alongside images and videos with the following features:

**Supported Audio Formats:**

- MP3 (audio/mpeg)

**Audio Processing:**

- **No Processing**: Audio files are uploaded and stored as-is without any processing
- **No Thumbnails**: Audio files do not generate thumbnail images
- **Simple Storage**: Audio files maintain their original quality and file size
- **Separate Directory**: Audio files are stored in `/uploads/audios/` directory
- **Size Limits**: Audio files have separate size limits from images and videos (configurable in App Settings)

**Audio-Specific Metadata:**

- `thumbnail`: Always `null` for audio files
- Metadata includes `title` and `description` (both optional)
- No additional metadata is extracted or stored for audio files

### Media Type Configuration

The system uses a centralized configuration for media types and allowed extensions.

- **Location**: `src/config.js`
- **Definition**: The `MEDIA_TYPES` constant defines the allowed file extensions for different categories:
  - `image`: `.jpeg`, `.jpg`, `.png`, `.gif`, `.webp`, `.svg`
  - `video`: `.mp4`
  - `audio`: `.mp3`

This central definition ensures consistency across the application, from file upload validation to browser filtering.

## 2. Frontend Implementation (`src/pages/Media.jsx`)

The Media page has been **refactored** into a clean, modular architecture with the main component acting as an orchestrator for several specialized hooks and UI components.

### Architecture Overview

The `Media.jsx` component (reduced from ~410 lines to ~126 lines) now uses a **hook-based architecture** that separates concerns:

- **`useMediaState`**: Core state management and data loading
- **`useMediaUpload`**: File upload logic with progress tracking
- **`useMediaSelection`**: File selection and deletion workflows
- **`useMediaMetadata`**: Metadata editing and drawer management
- **Localization**: Fully integrated with `react-i18next` for all user-facing text

This architecture provides better **maintainability**, **testability**, and **code reuse** while keeping the main component focused on UI orchestration.

### Custom Hooks

#### `useMediaState` Hook (`src/hooks/useMediaState.js`)

Manages core media state and data loading:

- **State Management**: Files list, loading states, view mode, search filtering
- **Data Loading**: Fetches project media on mount using `getProjectMedia`
- **View Persistence**: Saves view mode preference to localStorage
- **Type Filtering**: Supports filtering the media list by type (`all`, `image`, `video`, `audio`)
- **Search Filtering**: Real-time filename filtering
- **Usage Refresh**: Manual usage tracking refresh functionality

#### `useMediaUpload` Hook (`src/hooks/useMediaUpload.js`)

Handles all file upload operations:

- **Upload Progress**: Real-time progress tracking using XMLHttpRequest
- **Chunked Processing**: Processes files in batches of 5 to avoid overwhelming the server
- **Multi-file Support**: Handles multiple file uploads with sequential chunk processing
- **Multi-layered SVG Sanitization**: For defense-in-depth, SVG files are sanitized twice:
  - **Client-side**: Sanitized in the browser using `DOMPurify` before the upload starts.
  - **Server-side**: Re-sanitized on the server using `isomorphic-dompurify` before being saved to the filesystem.
- **Error Handling**: Detailed error reporting for rejected files with unique toast IDs
- **State Updates**: Updates parent files state with successful uploads
- **Toast Notifications**: Success, warning, and error feedback with batch progress indicators

#### `useMediaSelection` Hook (`src/hooks/useMediaSelection.js`)

Manages file selection and deletion workflows:

- **Selection State**: Tracks selected files array
- **Bulk Operations**: Select all/none functionality with filtering support
- **Deletion Logic**: Single and bulk file deletion with usage protection
- **Modal Management**: Confirmation dialog state and messaging
- **Usage Validation**: Prevents deletion of files currently in use

#### `useMediaMetadata` Hook (`src/hooks/useMediaMetadata.js`)

Handles metadata editing and drawer functionality:

- **Drawer Management**: Controls metadata editing drawer visibility
- **File Selection**: Manages which file is being edited
- **Metadata Updates**: Saves alt text and title changes via API
- **Loading States**: Tracks save operations in progress
- **State Synchronization**: Updates parent files state after successful saves

### Core UI Components

- `MediaUploader`: Drag-and-drop zone with real-time upload progress display (localized)
- `MediaToolbar`: Contains view toggle, search bar, media type filter dropdown, bulk actions, and usage refresh (localized)
- `MediaGrid`: Responsive grid view with thumbnail cards and usage badges
- `MediaList`: Table view with detailed file information and select-all functionality (localized)
- `MediaDrawer`: Slide-out panel for editing file metadata (alt text and title, localized)
- `MediaSelectorDrawer`: Media browser drawer for selecting existing files in setting inputs (localized)
- `ConfirmationModal`: Deletion confirmation dialog with usage warnings (localized)

#### `MediaSelectorDrawer` Component (`src/components/media/MediaSelectorDrawer.jsx`)

A specialized drawer component that allows users to browse and select existing media files from the project library. This component is primarily used within setting input components (like `ImageInput` and `VideoInput`) to provide a "Browse" functionality.

**Key Features:**

- **Direct Upload**: Includes an "Upload" button that triggers the OS file dialog, allowing users to add new files directly while browsing.
- **Search Bar**: Integrated search functionality to quickly find files by name.
- **File Type Filtering**: Supports filtering by file type (`image`, `video`, `audio`, or `all`). The filter can be pre-set via props.
- **Visual Indicators**:
  - **Images**: Displays the actual image thumbnail.
  - **Videos**: Displays a play icon with a "Video" label.
  - **Audio**: Displays a music icon with an "Audio" label.
- **Keyboard Navigation**: Escape key support for closing the drawer
- **Background Scroll Prevention**: Prevents body scrolling when drawer is open

**Usage Context:**

The `MediaSelectorDrawer` is integrated into:

- **`ImageInput`**: Browse for existing images when setting image widget properties
- **`VideoInput`**: Browse for existing videos when setting video widget properties
- **`PageForm`**: Select featured images for pages

**Props Interface:**

- `visible`: Boolean to control drawer visibility
- `onClose`: Function called when drawer should be closed
- `onSelect`: Function called with selected file object
- `activeProject`: Current project object for loading media
- `filterType`: String to filter files (`'image'`, `'video'`, or `'all'`)

### UI Improvements

#### Enhanced Empty State

- **Custom Styling**: Replaced generic `EmptyState` component with custom-designed empty state
- **Visual Icon**: Features an `Image` icon from lucide-react for better visual appeal
- **Consistent Design**: Matches the styling and layout of other empty states throughout the application
- **Improved Centering**: Better visual hierarchy and spacing for a more polished appearance

### Key Workflows & Logic

- **Loading**: `useMediaState` loads project media on mount and manages loading states
- **Uploading**: `useMediaUpload` handles file processing with progress tracking and detailed error reporting
- **File Selection**: `useMediaSelection` manages multi-file selection with bulk operations support
- **Deletion**: `useMediaSelection` provides usage-aware deletion with confirmation dialogs
- **Metadata Editing**: `useMediaMetadata` handles the complete edit workflow from drawer opening to saving changes

### Benefits of Refactored Architecture

- **Separation of Concerns**: Each hook handles a specific aspect of media functionality
- **Reusability**: Hooks can be easily tested and potentially reused in other components
- **Maintainability**: Smaller, focused code units are easier to understand and modify
- **Testability**: Individual hooks can be unit tested independently
- **Reduced Complexity**: Main component focuses on UI orchestration rather than business logic

## 3. Backend Implementation

The backend uses Express.js with `multer` for file handling and `sharp` for image processing.

### API Routes (`server/routes/media.js`)

| Method | Endpoint | Middleware | Controller Function | Description |
| --- | --- | --- | --- | --- |
| `GET` | `/api/media/projects/:projectId/media` |  | `getProjectMedia` | Reads and returns the `media.json`. |
| `POST` | `/api/media/projects/:projectId/media` | `upload.array("files")` | `uploadProjectMedia` | Handles file uploads. |
| `DELETE` | `/api/media/projects/:projectId/media/:fileId` |  | `deleteProjectMedia` | Deletes a single file and its metadata. Prevents deletion if file is in use. |
| `POST` | `/api/media/projects/:projectId/media/bulk-delete` |  | `bulkDeleteProjectMedia` | Deletes multiple files and their metadata. Prevents deletion if any files are in use. |
| `PUT` | `/api/media/projects/:projectId/media/:fileId/metadata` |  | `updateMediaMetadata` | Updates the metadata for a single file. |
| `GET` | `/api/media/projects/:projectId/media/:fileId/usage` |  | `getMediaFileUsage` | Returns usage information for a specific media file. |
| `POST` | `/api/media/projects/:projectId/refresh-usage` |  | `refreshMediaUsage` | Manually refreshes usage tracking for all media files in the project. |
| `GET` | `/api/media/projects/:projectId/uploads/images/:filename` |  | `serveProjectMedia` | Serves a physical file for viewing. |

**Identifier contract:** `:projectId` is always the project UUID in API routes. The backend resolves it to `folderName` for filesystem paths. If the UUID cannot be resolved, the request fails (no fallback directories are created). Errors use standardized codes (for example `PROJECT_NOT_FOUND`, `PROJECT_DIR_MISSING`) to keep responses consistent.

### Controller Logic (`server/controllers/mediaController.js`)

- **Dynamic Image Processing Settings**: The system loads image processing configuration dynamically from App Settings:
  ```javascript
  // Loads quality and enabled sizes from app settings
  const imageProcessingSettings = await getImageProcessingSettings();
  // Returns only enabled sizes with their width and quality settings
  ```
- **File Upload (`multer` + `uploadProjectMedia`)**:
  1.  The `multer` middleware is configured first. It intercepts the request, saves the uploaded files to the correct project directory (images: `/data/projects/<folderName>/uploads/images/`, videos: `/data/projects/<folderName>/uploads/videos/`) with a unique, slugified name. It also filters files to ensure they have an allowed MIME type.
  2.  The `uploadProjectMedia` function then runs. It dynamically checks each uploaded file against the appropriate size limit (`media.maxFileSizeMB` for images, `media.maxVideoSizeMB` for videos).
  3.  For each valid file, it generates a unique ID (`uuidv4`).
  4.  **SVG Sanitization**: If the file is an SVG, it's sanitized using `DOMPurify` with SVG profile to prevent XSS attacks before being saved.
  5.  If the file is an image (not an SVG), it uses the `sharp` library to:
      - Read the original `width` and `height`.
      - **Dynamically load** the current image processing settings from App Settings
      - Generate **only the enabled** image sizes with the configured quality setting
      - Apply the configured maximum widths for each enabled size
      - **Skip sizes larger than original**: Only creates sizes that are smaller than the original image dimensions to avoid storage waste
  6.  If the file is a video, no processing is performed - it's simply stored as-is.
  7.  It creates a new metadata object for the file—including a `sizes` object containing the paths and dimensions for generated variants (images only)—and adds it to the `files` array in `media.json`.
  8.  **Thumbnail Assignment**: The system ensures there's always a thumbnail for previews:
      - If `thumb` size is enabled: uses the thumb image
      - If `thumb` is disabled: uses the first available enabled size
      - If no sizes are enabled: uses the original image
  9.  Files that are too large or have the wrong type are rejected and immediately deleted from the server.
  10. **Parallel Processing**: All files are processed in parallel using `Promise.allSettled` for optimal performance.
  11. It returns a JSON response to the client with arrays of successfully processed and rejected files.
- **Deletion Logic (`deleteProjectMedia`, `bulkDeleteProjectMedia`)**:
  1.  The controller reads `media.json`.
  2.  It finds the file entry (or entries) by ID.
  3.  **Usage Check**: It verifies that the file(s) are not currently in use by checking the `usedIn` array. If any files are in use, deletion is prevented with an error response.
  4.  It uses `fs.remove` to delete the original physical file and **all** of its generated sizes from the filesystem.
  5.  It removes the metadata object(s) from the `files` array.
  6.  It overwrites `media.json` with the updated data.
- **Metadata Update (`updateMediaMetadata`)**:
  1.  The controller reads `media.json`.
  2.  It finds the file to update in the `files` array by its `fileId`.
  3.  It updates the `alt` and `title` properties within the `metadata` object for that file.
  4.  It overwrites `media.json` with the updated data and returns the updated file object.

### Usage Tracking Service (`server/services/mediaUsageService.js`)

The media usage tracking is handled by a dedicated service that provides automated tracking of which pages and global widgets use which media files:

- **`updatePageMediaUsage(projectId, pageId, pageData)`**: Scans a page's content for media references and updates the `usedIn` arrays in `media.json`. First removes the page from all existing `usedIn` arrays, then adds it to files that are actually referenced.
- **`updateGlobalWidgetMediaUsage(projectId, globalId, widgetData)`**: Scans a global widget (header/footer) for media references and updates the `usedIn` arrays. Works the same way as page tracking but for global widgets.
- **`removePageFromMediaUsage(projectId, pageId)`**: Removes a page from all media files' `usedIn` arrays when the page is deleted.
- **`getMediaUsage(projectId, fileId)`**: Returns usage information for a specific media file, including which pages and global widgets use it.
- **`refreshAllMediaUsage(projectId)`**: Scans all pages and global widgets in a project and rebuilds the complete usage tracking data.

**Integration with Page Operations:**

- **Page Save/Update**: Automatically triggers usage tracking updates
- **Page Delete**: Automatically removes page from all media usage arrays
- **Slug Changes**: Removes old slug and adds new slug to relevant media files

**Integration with Global Widget Operations:**

- **Header/Footer Save**: Automatically triggers usage tracking updates for images used in global widgets
- This ensures images used in the header logo, footer, etc. are protected from deletion

## Security Considerations

All API endpoints described in this document are protected by the platform's core security layers, including input validation, rate limiting, and CORS policies. For a comprehensive overview of these protections, see the **[Platform Security](core-security.md)** documentation.

---

**See also:**

- [App Settings](core-appSettings.md) - Configure image processing and upload limits
- [Export System](core-export.md) - How media usage tracking optimizes exports
- [Custom Hooks](core-hooks.md) - Media management hooks documentation
