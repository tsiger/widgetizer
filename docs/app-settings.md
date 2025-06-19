# App Settings (`AppSettings.jsx`)

## Overview

The `AppSettings` page is responsible for managing global configurations that apply across the entire application, rather than to a specific project. These are system-level settings that control the application's behavior. Key examples include setting the maximum file upload size for the media manager and configuring image processing settings.

## Current Settings

### Media Settings

#### File Upload Limits

- **Maximum Image File Size**: Controls the size limit for individual image uploads across all projects
- **Maximum Video File Size**: Controls the size limit for individual video uploads across all projects (separate from image limit)

#### Image Processing Configuration

- **Image Quality**: Single quality setting (1-100) that applies to all generated image sizes
  - Higher values = better quality but larger file sizes
  - Lower values = smaller files but reduced quality
- **Image Sizes**: Configure which image sizes are generated and their dimensions:
  - **Thumb** (default: 150px) - Used for preview thumbnails in the media library
  - **Small** (default: 480px) - Optimized for mobile devices
  - **Medium** (default: 1024px) - Standard responsive breakpoint
  - **Large** (default: 1920px) - High-resolution displays
  - Each size can be **enabled/disabled** and have its **width customized**

### Export Management Settings

#### Version Control

- **Maximum Export Versions to Keep**: Controls how many export versions are retained per project (default: 10)
  - When this limit is exceeded, the oldest exports are automatically deleted to save storage space
  - Range: 1-50 versions
  - Applies to all projects globally

## Component Breakdown

- **`PageLayout`**: Provides the standard page structure with a title.
- **`SettingsField`**: A reusable wrapper component that groups a label, a description, and an input field into a single, organized row.
- **`TextInput`**: Input component used for numeric and text settings.
- **Checkbox Inputs**: Used for enabling/disabling image sizes.
- **`LoadingSpinner`**: Displayed while the initial settings are fetched from the server.
- **`Button`**: The "Save Settings" button to persist changes.

## Data Flow and State Management

The `AppSettings` component follows a straightforward pattern for managing its data.

### 1. Fetching Settings

- When the component mounts, a `useEffect` hook calls the `fetchSettings` function.
- `fetchSettings` uses the `getAppSettings` utility from `appSettingsManager.js` to retrieve the current application settings from the backend API.
- The fetched settings object is stored in the component's local state using `useState`.

### 2. Updating Settings

- The component uses a generic `handleInputChange` function to manage state updates for potentially nested setting objects.
- It takes the new `value` and a `name` string (e.g., `"media.maxFileSizeMB"` or `"media.imageProcessing.quality"`), which it splits to traverse the state object and update the correct property without mutating the original state directly.
- **Image Size Configuration**: A specialized `handleSizeToggle` function manages enabling/disabling image sizes while preserving width values.
- This makes it easy to add new, nested settings in the future without needing to write new state update logic.

### 3. Saving Settings

- When the user clicks "Save Settings", the `handleSave` function is triggered.
- Before sending the data, it performs comprehensive data transformation and validation:
  - Ensures both `maxFileSizeMB` and `maxVideoSizeMB` are parsed into integers
  - **Image Processing**: Validates and ensures complete configuration objects:
    - Quality is parsed and validated (1-100 range)
    - All image sizes have both `width` and `enabled` properties
    - Missing configurations are merged with defaults
  - **Export Management**: Validates and ensures `maxVersionsToKeep` is parsed into an integer (1-50 range)
- It then calls `saveAppSettings` from the `appSettingsManager.js` to send the entire updated settings object to the backend for persistence.
- Finally, it uses the global `useToastStore` to provide immediate visual feedback to the user, indicating whether the save was successful or failed.

## How App Settings Are Used

Unlike theme settings, which are primarily consumed by the frontend via a global store, App Settings are mainly used by the **backend** to control system-level behavior.

### File Upload Size Validation

The file size settings demonstrate server-side enforcement:

1.  When a user uploads files through the Media Manager, the files are sent directly to the server.
2.  The backend route (`/api/media/projects/:projectId/media`) receives the files.
3.  Before processing the upload, the server-side controller (`mediaController.js`) reads the appropriate size limit directly from the application's settings file:
    - `maxFileSizeMB` for images
    - `maxVideoSizeMB` for videos
4.  It compares each uploaded file's size against the appropriate limit. If a file is too large, the server rejects it and sends an error message back to the client.

### Image Processing Configuration

The image processing settings directly control how uploaded images are processed:

1.  **Dynamic Loading**: When processing an image upload, the media controller calls `getImageProcessingSettings()` to load current configuration
2.  **Quality Application**: The configured quality setting (1-100) is applied to all generated image sizes during the Sharp.js processing
3.  **Size Generation**: Only enabled image sizes are generated, respecting the configured maximum widths:

- If `thumb` is disabled: system uses first available size for thumbnails
- If `large` is disabled: no large images are generated, saving storage space
- Custom widths are applied: e.g., changing `medium` from 1024px to 800px

4.  **Immediate Effect**: Settings changes apply to all new uploads without requiring application restart

This server-side validation and processing ensures that the constraints are always enforced securely, regardless of any frontend logic, while providing administrators full control over image processing behavior and storage requirements.
