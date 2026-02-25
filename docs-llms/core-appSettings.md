# App Settings (`AppSettings.jsx`)

## Overview

The `AppSettings` page is responsible for managing global configurations that apply across the entire application, rather than to a specific project. These are system-level settings that control the application's behavior. Key examples include setting the maximum file upload size for the media manager and configuring image processing settings.

The App Settings system has been **refactored** to use a clean, modular architecture with dedicated components that are completely isolated from the theme settings system.

## Current Settings

### General Settings

- **Default Language**: Sets the application's user interface language (English, French, German, Greek, Italian, Spanish).
- **Date Format**: Configures how dates are displayed throughout the platform (e.g., MM/DD/YYYY, YYYY-MM-DD, etc.).

### Media Settings

#### File Upload Limits

- **Maximum Image File Size**: Controls the size limit for individual image uploads across all projects
- **Maximum Video File Size**: Controls the size limit for individual video uploads across all projects (separate from image limit)
- **Maximum Audio File Size**: Controls the size limit for individual audio uploads across all projects (separate from image and video limits)

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

**Theme Override Behavior:** When the active project's theme defines its own `imageSizes` in `theme.json`, the Image Sizes settings are hidden in the App Settings UI. A notice is displayed explaining that image sizes are managed by the theme. This ensures users understand that changing app settings won't affect projects using themes with custom image sizes. See [Media Library - Theme-Defined Image Sizes](core-media.md#theme-defined-image-sizes) for details.

### Export Management Settings

#### Version Control

- **Maximum Export Versions to Keep**: Controls how many export versions are retained per project (default: 10)
  - When this limit is exceeded, the oldest exports are automatically deleted to save storage space
  - Range: 1-50 versions
  - Applies to all projects globally

#### Project Import

- **Maximum Project Import Size (MB)**: Controls the maximum file size for project import ZIP files (default: 500MB)
  - Range: 10-2000 MB
  - Increase this if you need to import large projects with many media files
  - Enforced on both client and server side for security

### Developer Tools

These settings are intended for theme developers and advanced users.

- **Enable Developer Mode**: When enabled, shows additional developer tools throughout the application
  - Reserved for future developer-focused features
  - Enables advanced debugging and development workflows

## Architecture Overview

The App Settings system uses a **schema-driven architecture** that is completely isolated from theme settings, providing better maintainability and extensibility.

### Core Components

#### `AppSettings.jsx` (Main Page)

The main page component (reduced to ~61 lines) acts as an orchestrator:

- **Layout Management**: Uses `PageLayout` for consistent page structure
- **Loading States**: Displays loading spinners and error states
- **Hook Integration**: Uses `useAppSettings` hook for all data management
- **Save/Cancel Actions**: Provides save and cancel buttons with change tracking
- **Navigation Guard**: Integrated `useFormNavigationGuard` prevents accidental navigation with unsaved changes
- **Localization**: Fully localized using `react-i18next` for all user-facing text

#### `AppSettingsPanel.jsx` (`src/components/settings/AppSettingsPanel.jsx`)

A dedicated component for rendering app settings:

- **Schema-Driven Rendering**: Works directly with JSON schema format
- **Tab Management**: Automatic tab generation from schema configuration
- **Group Organization**: Supports setting groups with visual separators
- **Vertical Tabs**: Consistent UI with theme settings but isolated architecture
- **Native Schema Support**: No conversion logic - works directly with app settings format
- **Localization**: Tab labels, section titles, and all text fully localized via translation keys

#### `useAppSettings.js` Hook (`src/hooks/useAppSettings.js`)

Centralized state management for app settings:

- **State Management**: Settings data, loading states, and change tracking
- **Schema Integration**: Loads and merges with JSON schema defaults
- **Nested Object Support**: Handles dot-notation paths (e.g., `"media.maxFileSizeMB"`)
- **Data Validation**: Type conversion and validation before saving
- **Save/Cancel Logic**: Complete workflow management with undo functionality

### Schema-Driven Configuration

The system uses **JSON Schema** files (`src/config/appSettings.schema.json`) to define:

- **Setting Structure**: Types, labels, descriptions, and validation rules
- **Tab Organization**: Automatic grouping into tabs (media, export, etc.)
- **Group Headers**: Visual organization within tabs
- **Default Values**: Fallback values for new installations
- **Input Types**: Supports text, number, checkbox, range, select, and more

### Data Flow and State Management

#### 1. Schema Loading and Defaults

- `useAppSettings` loads the JSON schema on component mount
- Merges loaded settings with schema defaults using dot-notation paths
- Provides fallback values for missing or undefined settings

#### 2. Settings Rendering

- `AppSettingsPanel` processes the schema to organize settings by tabs
- Automatically generates group headers and setting inputs
- Uses `SettingsRenderer` for consistent input rendering across the application

#### 3. Change Management

- All changes are tracked in state with automatic change detection
- Supports nested object updates using dot-notation (e.g., `"media.imageProcessing.quality"`)
- Provides real-time feedback on unsaved changes

#### 4. Save Validation and Processing

- Pre-save validation ensures data types match schema requirements
- Automatic type conversion (strings to numbers, etc.)
- Comprehensive error handling with user feedback via toast notifications

### Benefits of Refactored Architecture

- **Complete Isolation**: No coupling with theme settings system
- **Schema-Driven**: Easy to add new settings by updating JSON schema
- **Maintainability**: Clean separation of concerns across components
- **Extensibility**: New setting types can be added without architecture changes
- **Consistency**: Same UI components as theme settings but isolated implementation
- **Type Safety**: Schema validation prevents configuration errors

## How App Settings Are Used

Unlike theme settings, which are primarily consumed by the frontend via a global store, App Settings are mainly used by the **backend** to control system-level behavior.

### File Upload Size Validation

The file size settings demonstrate server-side enforcement:

1.  When a user uploads files through the Media Manager, the files are sent directly to the server.
2.  The backend route (`/api/media/projects/:projectId/media`) receives the files.
3.  Before processing the upload, the server-side controller (`mediaController.js`) reads the appropriate size limit directly from the application's settings file:
    - `maxFileSizeMB` for images
    - `maxVideoSizeMB` for videos
    - `maxAudioSizeMB` for audios
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

## Server-Side Enforcement Ceilings (`EDITOR_LIMITS`)

When running in hosted mode (`HOSTED_MODE=true`), all user-configurable app settings are clamped to server-enforced ceilings defined in `server/limits.js`. This prevents users from setting values that exceed safe platform limits.

| User Setting | Ceiling Constant | Max Value |
|-------------|-----------------|-----------|
| `maxFileSizeMB` | `media.maxFileSizeMBCeiling` | 50 MB |
| `maxVideoSizeMB` | `media.maxVideoSizeMBCeiling` | 200 MB |
| `maxAudioSizeMB` | `media.maxAudioSizeMBCeiling` | 100 MB |
| `maxImportSizeMB` | `maxImportSizeMBCeiling` | 2,000 MB |
| `maxVersionsToKeep` | `maxExportVersionsCeiling` | 50 |

Clamping is applied in `appSettingsController.js` using the `clampToCeiling()` utility from `server/utils/limitChecks.js`. If a user saves `maxFileSizeMB: 999`, it is silently clamped to 50 before persisting.

**Safety limits (always enforced, regardless of mode):**

| Limit | Value | Purpose |
|-------|-------|---------|
| `maxImageDimension` | 10,000 px | Prevents image decompression bombs |
| `maxImagePixels` | 100,000,000 | Sharp `limitInputPixels` protection |
| `maxZipEntries` | 10,000 | Prevents ZIP bombs on import/upload |
| `jsonBodyLimit` | 2 MB | Express JSON body limit |
| `editorJsonBodyLimit` | 10 MB | Page content save routes |

For the full list of all platform limits, see `server/limits.js` and **[Platform Security](core-security.md)**.

## Security Considerations

All API endpoints described in this document are protected by the platform's core security layers, including input validation, rate limiting, and CORS policies. For a comprehensive overview of these protections, see the **[Platform Security](core-security.md)** documentation.
