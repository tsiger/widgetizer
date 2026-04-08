# App Architecture

This document maps the architecture of the Widgetizer app, showing how frontend components connect to queries, routes, controllers, and utilities.

---

## Routing & Shell Structure

The app now has two main shells plus a root redirect:

- `/` is handled by `src/pages/HomeRedirect.jsx`. It redirects to `/pages` when an active project exists, otherwise to `/projects`.
- The **admin shell** uses `src/components/layout/ProjectPickerLayout.jsx` for `/projects`, `/themes`, and `/app-settings`. It can be used without an active project.
- The **site workspace shell** uses `src/components/layout/Layout.jsx` for `/pages`, `/menus`, `/media`, `/settings`, and `/export-site`.
- All site workspace routes are wrapped by `src/components/layout/RequireActiveProject.jsx`. If no active project exists, the user is redirected to `/projects`.

This admin-vs-site split is the main architectural consequence of the recent workspaces merge.

---

## Projects

### Frontend Files

- `src/pages/Projects.jsx` - List view with CRUD operations
- `src/pages/ProjectsAdd.jsx` - Create project form
- `src/pages/ProjectsEdit.jsx` - Edit project with theme update UI
- `src/components/projects/ProjectForm.jsx` - Reusable form component (includes `siteTitle`, `siteUrl`, description, preset/theme selection)
- `src/components/projects/ProjectImportModal.jsx` - ZIP import modal
- `src/components/layout/ProjectPickerLayout.jsx` - Admin-area shell for project-management routes
- `src/components/layout/AdminMenu.jsx` - Dropdown entrypoint for project/theme/app-settings navigation
- `src/pages/HomeRedirect.jsx` - Chooses `/projects` vs `/pages` at app root
- `src/utils/projectNavigation.js` - Resolves preserved `next` query params back into workspace destinations
- `src/components/layout/RequireActiveProject.jsx` - Route guard for site-workspace routes; redirects to `/projects` when no active project exists

### Route Structure

| Route | Shell | Notes |
| ----- | ----- | ----- |
| `/` | none | Redirects through `HomeRedirect` |
| `/projects`, `/projects/add`, `/projects/edit/:id` | `ProjectPickerLayout` | Project administration |
| `/themes`, `/app-settings` | `ProjectPickerLayout` | Admin utilities |
| `/pages`, `/menus`, `/media`, `/settings`, `/export-site` | `Layout` + `RequireActiveProject` | Active-project site workspace |

### Query Layer (`src/queries/projectManager.js`)

| Function                  | Method | Endpoint                                 |
| ------------------------- | ------ | ---------------------------------------- |
| `getAllProjects()`        | GET    | `/api/projects`                          |
| `getActiveProject()`      | GET    | `/api/projects/active`                   |
| `createProject(data)`     | POST   | `/api/projects`                          |
| `setActiveProject(id)`    | PUT    | `/api/projects/active/:id`               |
| `updateProject(id, data)` | PUT    | `/api/projects/:id`                      |
| `deleteProject(id)`       | DELETE | `/api/projects/:id`                      |
| `duplicateProject(id)`    | POST   | `/api/projects/:id/duplicate`            |
| `exportProject(id)`       | POST   | `/api/projects/:id/export`               |
| `importProject(file)`     | POST   | `/api/projects/import`                   |
| `checkThemeUpdates(id)`   | GET    | `/api/projects/:id/theme-updates/status` |
| `toggleThemeUpdates(id, enabled)` | PUT | `/api/projects/:id/theme-updates` |
| `applyThemeUpdate(id)`    | POST   | `/api/projects/:id/theme-updates/apply`  |

### Server Controller (`server/controllers/projectController.js`)

| Function                    | Purpose                                                    |
| --------------------------- | ---------------------------------------------------------- |
| `getAllProjects()`          | Get all projects (enriched with themeName, hasThemeUpdate) |
| `getActiveProject()`        | Get active project                                         |
| `createProject()`           | Create project (copies theme, applies preset, processes templates/menus) |
| `setActiveProject()`        | Set active project ID                                      |
| `updateProject()`           | Update project (handles folderName rename)                 |
| `deleteProject()`           | Delete project and cleanup exports                         |
| `duplicateProject()`        | Clone project with new ID                                  |
| `getProjectWidgets()`       | Get widgets (theme + core)                                 |
| `getProjectIcons()`         | Get icons from assets/icons.json                           |
| `exportProject()`           | Export as ZIP with manifest                                |
| `importProject()`           | Import from ZIP                                            |
| `getThemeUpdateStatus()`    | Check theme update availability                            |
| `toggleProjectThemeUpdates()` | Toggle per-project theme update preference                 |
| `applyProjectThemeUpdate()` | Apply theme update                                         |

### Store (`src/stores/projectStore.js`)

| State/Action                | Purpose                         |
| --------------------------- | ------------------------------- |
| `activeProject`             | Current active project object   |
| `loading`                   | Loading state                   |
| `setActiveProject(project)` | Set active project              |
| `fetchActiveProject()`      | Fetch and update active project |
| `clearActiveProject()`      | Clear active project            |

### Service (`server/services/projectService.js`)

| Function               | Purpose                                               |
| ---------------------- | ----------------------------------------------------- |
| `deleteProjectById()` | Reusable project deletion: exports, SQLite, files, active project reassignment. |

### Utils Used

- `server/utils/semver.js` - `isNewerVersion()` for theme update checks
- `src/utils/slugUtils.js` - `formatSlug()` for folder name generation
- `src/utils/dateFormatter.js` - `formatDate()` for display

---

## Core Widgets

### Server Controller (`server/controllers/coreWidgetsController.js`)

| Function                    | Purpose                                   |
| --------------------------- | ----------------------------------------- |
| `getCoreWidgets()`          | Get all core widget schemas               |
| `getCoreWidget(widgetName)` | Get specific core widget schema           |
| `getAllCoreWidgets()`       | API endpoint to retrieve all core widgets |

### Server Route (`server/routes/coreWidgets.js`)

| Method | Endpoint            | Handler               |
| ------ | ------------------- | --------------------- |
| GET    | `/api/core-widgets` | `getAllCoreWidgets()` |

### Description

Core widgets are reusable, theme-independent widgets stored in the core widgets directory. They can be used across all projects and themes. The controller reads schema.json files from each core widget folder and returns them to the frontend.

---

## Pages

### Frontend Files

- `src/pages/Pages.jsx` - List view with bulk operations
- `src/pages/PagesAdd.jsx` - Create page form
- `src/pages/PagesEdit.jsx` - Edit page metadata
- `src/components/pages/PageForm.jsx` - Reusable form with SEO fields

### Query Layer (`src/queries/pageManager.js`)

| Function                    | Method | Endpoint                   |
| --------------------------- | ------ | -------------------------- |
| `getAllPages()`             | GET    | `/api/pages`               |
| `getPage(id)`               | GET    | `/api/pages/:id`           |
| `createPage(data)`          | POST   | `/api/pages`               |
| `updatePage(id, data)`      | PUT    | `/api/pages/:id`           |
| `deletePage(id)`            | DELETE | `/api/pages/:id`           |
| `bulkDeletePages(ids)`      | POST   | `/api/pages/bulk-delete`   |
| `duplicatePage(id)`         | POST   | `/api/pages/:id/duplicate` |
| `savePageContent(id, data)` | POST   | `/api/pages/:id/content`   |

### Server Controller (`server/controllers/pageController.js`)

| Function            | Purpose                            |
| ------------------- | ---------------------------------- |
| `getAllPages()`     | List all pages for active project  |
| `getPage()`         | Get page by slug                   |
| `createPage()`      | Create page with unique slug       |
| `updatePage()`      | Update page, handle slug changes   |
| `deletePage()`      | Delete page, update media usage, clean up references |
| `bulkDeletePages()` | Delete multiple pages, clean up references            |
| `duplicatePage()`   | Clone page with `Name (Copy)` naming   |
| `savePageContent()` | Save page content from editor      |

### Internal Helpers

- `generateUniqueSlug(baseName, existsCheck, options)` - Generate unique slug
- `listProjectPagesData(projectFolderName)` - List and read all page files

### Services Used

- `server/services/mediaUsageService.js`:
  - `updatePageMediaUsage()` - Track media usage in pages
  - `removePageFromMediaUsage()` - Remove page from tracking

### Hooks Used

- `src/hooks/usePageSelection.js` - Multi-page selection for bulk ops

---

## Menus

### Frontend Files

- `src/pages/Menus.jsx` - List view
- `src/pages/MenusAdd.jsx` - Create menu
- `src/pages/MenusEdit.jsx` - Edit menu settings
- `src/components/menus/MenuForm.jsx` - Name/description form

### Query Layer (`src/queries/menuManager.js`)

| Function               | Method | Endpoint                   |
| ---------------------- | ------ | -------------------------- |
| `getAllMenus()`        | GET    | `/api/menus`               |
| `getMenu(id)`          | GET    | `/api/menus/:id`           |
| `createMenu(data)`     | POST   | `/api/menus`               |
| `updateMenu(id, data)` | PUT    | `/api/menus/:id`           |
| `deleteMenu(id)`       | DELETE | `/api/menus/:id`           |
| `duplicateMenu(id)`    | POST   | `/api/menus/:id/duplicate` |

### Server Controller (`server/controllers/menuController.js`)

| Function          | Purpose                           |
| ----------------- | --------------------------------- |
| `getAllMenus()`   | List all menus for active project |
| `getMenu()`       | Get menu by ID                    |
| `createMenu()`    | Create menu with unique ID        |
| `updateMenu()`    | Update menu in place (stable ID)  |
| `deleteMenu()`    | Delete menu file                  |
| `duplicateMenu()` | Clone with regenerated item IDs   |
| `getMenuById()`   | Helper for rendering service      |

### Internal Helpers

- `generateUniqueSlug()` - Generate unique menu ID from name
- `generateNewMenuItemIds()` - Recursively regenerate item IDs

---

## Media

### Frontend Files

- `src/pages/Media.jsx` - Main media browser
- `src/components/media/MediaToolbar.jsx` - View toggle, search, filter
- `src/components/media/MediaGrid.jsx` - Grid view
- `src/components/media/MediaList.jsx` - List view
- `src/components/media/MediaGridItem.jsx` - Grid item
- `src/components/media/MediaListItem.jsx` - List item
- `src/components/media/MediaDrawer.jsx` - Metadata editor
- `src/components/media/MediaSelectorDrawer.jsx` - Media picker for inputs

### Query Layer (`src/queries/mediaManager.js`)

| Function                                           | Method | Endpoint                                             |
| -------------------------------------------------- | ------ | ---------------------------------------------------- |
| `getProjectMedia(projectId)`                       | GET    | `/api/media/projects/:projectId/media`               |
| `uploadProjectMedia(projectId, files, onProgress)` | POST   | `/api/media/projects/:projectId/media`               |
| `deleteProjectMedia(projectId, fileId)`            | DELETE | `/api/media/projects/:projectId/media/:fileId`       |
| `deleteMultipleMedia(projectId, fileIds)`          | POST   | `/api/media/projects/:projectId/media/bulk-delete`   |
| `getMediaFileUsage(projectId, fileId)`             | GET    | `/api/media/projects/:projectId/media/:fileId/usage` |
| `refreshMediaUsage(projectId)`                     | POST   | `/api/media/projects/:projectId/refresh-usage`       |
| `getMediaUrl(projectId, fileId, type)`             | -      | URL construction                                     |

### Media Service (`server/services/mediaService.js`)

| Function                          | Purpose                                    |
| --------------------------------- | ------------------------------------------ |
| `readMediaFile(projectId)`        | Read media metadata from SQLite            |

### Server Controller (`server/controllers/mediaController.js`)

| Function                          | Purpose                                    |
| --------------------------------- | ------------------------------------------ |
| `writeMediaFile(projectId, data)` | Write media metadata to SQLite                        |
| `getProjectMedia()`               | Get all media files                        |
| `uploadProjectMedia()`            | Upload and process files                   |
| `updateMediaMetadata()`           | Update alt/title/description               |
| `deleteProjectMedia()`            | Delete file (checks usage)                 |
| `bulkDeleteProjectMedia()`        | Delete multiple (skips in-use)             |
| `serveProjectMedia()`             | Serve media files by ID                    |
| `getMediaFileUsage()`             | Get usage info for file                    |
| `refreshMediaUsage()`             | Rebuild usage tracking                     |

### Service (`server/services/mediaUsageService.js`)

| Function                              | Purpose                            |
| ------------------------------------- | ---------------------------------- |
| `extractMediaPathsFromPage()`         | Extract media paths from page data |
| `extractMediaPathsFromGlobalWidget()` | Extract from global widgets        |
| `updatePageMediaUsage()`              | Update tracking for a page         |
| `updateGlobalWidgetMediaUsage()`      | Update tracking for globals        |
| `removePageFromMediaUsage()`          | Remove page from tracking          |
| `getMediaUsage()`                     | Get pages/widgets using file       |
| `refreshAllMediaUsage()`              | Scan all and rebuild tracking      |

### Hooks Used

- `src/hooks/useMediaState.js` - Media state management
- `src/hooks/useMediaUpload.js` - Upload handling
- `src/hooks/useMediaSelection.js` - Selection and bulk ops
- `src/hooks/useMediaMetadata.js` - Metadata editing

### Features

- 30-second cache with request deduplication
- SQLite transactions provide atomic media metadata updates
- Usage tracking prevents deletion of in-use files
- Image processing (multiple sizes, quality)
- SVG sanitization with DOMPurify

---

## Themes

### Frontend Files

- `src/pages/Themes.jsx` - Theme list with upload and update UI

### Query Layer (`src/queries/themeManager.js`)

| Function                  | Method | Endpoint                         |
| ------------------------- | ------ | -------------------------------- |
| `getAllThemes()`          | GET    | `/api/themes`                    |
| `getThemePresets(id)`     | GET    | `/api/themes/:id/presets`        |
| `getPresetScreenshotUrl(themeId, presetId)` | -  | URL construction             |
| `getTheme(id)`            | GET    | `/api/themes/:id`                |
| `getThemeWidgets(id)`     | GET    | `/api/themes/:id/widgets`        |
| `getThemeTemplates(id)`   | GET    | `/api/themes/:id/templates`      |
| `getThemeSettings()`      | GET    | `/api/themes/project/:projectId` |
| `saveThemeSettings(data)` | POST   | `/api/themes/project/:projectId` |
| `uploadThemeZip(file)`    | POST   | `/api/themes/upload`             |
| `getThemeVersions(id)`    | GET    | `/api/themes/:id/versions`       |
| `getThemeUpdateCount()`   | GET    | `/api/themes/update-count`       |
| `updateTheme(id)`         | POST   | `/api/themes/:id/update`         |

### Server Controller (`server/controllers/themeController.js`)

| Function                     | Purpose                           |
| ---------------------------- | --------------------------------- |
| `getThemeVersions(id)`       | Get all versions for theme        |
| `getThemeSourceDir(id)`      | Get source dir (latest/ or root)  |
| `getThemeLatestVersion(id)`  | Get latest version string         |
| `buildLatestSnapshot(id)`    | Build latest/ from base + updates |
| `themeHasPendingUpdates(id)` | Check if pending updates exist    |
| `getAllThemes()`             | Get all themes with metadata      |
| `getTheme()`                 | Get specific theme                |
| `getThemeWidgets()`          | Get theme widgets                 |
| `getThemeTemplates()`        | Get theme templates               |
| `uploadTheme()`              | Upload theme zip                  |
| `handleThemeUpload()`        | Configure theme ZIP upload middleware |
| `getThemeUpdateCount()`      | Count themes with pending updates |
| `updateTheme()`              | Build latest/ for single theme    |
| `getThemePresets()`          | Get presets for a theme            |
| `resolvePresetPaths()`       | Resolve preset templates/menus/settings with fallback |
| `getProjectThemeSettings()`  | Get project theme settings        |
| `saveProjectThemeSettings()` | Save project theme settings       |
| `copyThemeToProject()`       | Copy theme to project directory   |
| `readProjectThemeData()`     | Read project theme.json           |

### Service (`server/services/themeUpdateService.js`)

| Function                      | Purpose                               |
| ----------------------------- | ------------------------------------- |
| `checkForUpdates(projectId)`  | Check if update available for project |
| `toggleThemeUpdates(projectId)` | Toggle project `receiveThemeUpdates` |
| `mergeThemeSettings()`        | Merge user + new theme.json settings  |
| `applyThemeUpdate(projectId)` | Apply update to project               |

### Store (`src/stores/themeUpdateStore.js`)

| State/Action         | Purpose                               |
| -------------------- | ------------------------------------- |
| `updateCount`        | Number of themes with pending updates |
| `isLoading`          | Loading state                         |
| `fetchUpdateCount()` | Fetch count from API                  |

### Utils

- `server/utils/semver.js`:
  - `parseVersion()` - Parse semver string
  - `isValidVersion()` - Validate format
  - `compareVersions()` - Compare two versions
  - `isNewerVersion()` - Check if newer
  - `sortVersions()` - Sort ascending
  - `getLatestVersion()` - Get latest from array
- `server/utils/themeHelpers.js`:
  - `preprocessThemeSettings()` - Transform settings for access
- `scripts/validate-theme-locales.js` + `validate-theme-locales-helpers.js`:
  - Validates all `tTheme:` keys in widget schemas resolve to entries in theme locale files
  - Detects orphaned keys in `en.json` not referenced by any schema
  - Checks non-English locales match `en.json` (missing and extra keys) when additional locales are present
  - Recursively scans widget directories (including `widgets/global/header/`, `widgets/global/footer/`)
  - Run via `npm run validate:theme-locales`; also runs as part of `predev:all` hook

---

## Export

### Frontend Files

- `src/pages/ExportSite.jsx` - Export page
- `src/components/export/ExportCreator.jsx` - Trigger export
- `src/components/export/ExportHistoryTable.jsx` - History with actions

### Query Layer (`src/queries/exportManager.js`)

| Function                              | Method | Endpoint                          |
| ------------------------------------- | ------ | --------------------------------- |
| `exportProjectAPI(projectId)`         | POST   | `/api/export/:projectId`          |
| `getExportHistory(projectId)`         | GET    | `/api/export/history/:projectId`  |
| `deleteExportAPI(projectId, version)` | DELETE | `/api/export/:projectId/:version` |
| `getExportEntryFile(exportDir)`       | GET    | `/api/export/files/:exportDir`    |
| `downloadExportZip(exportDir)`        | GET    | `/api/export/download/:exportDir` |

### Server Controller (`server/controllers/exportController.js`)

| Function                  | Purpose                     |
| ------------------------- | --------------------------- |
| `exportProject()`         | Main export handler         |
| `getExportHistory()`      | Get export history          |
| `deleteExport()`          | Delete export version       |
| `getExportFiles()`        | Get entry file info         |
| `downloadExport()`        | Stream ZIP download         |
| `cleanupProjectExports()` | Cleanup for deleted project |

### Internal Helpers

- `resolveOutputDir()` - Resolve publish output path from relative `outputDir`
- `findEntryFile()` - Find `index.html`, fallback to first HTML
- `findFilesRecursive()` - Find files by patterns
- `exportRepo.getNextVersion()` - Auto-increment export version
- `exportRepo.recordExport()` - Persist export history row in SQLite

### Service (`server/services/renderingService.js`)

| Function                    | Purpose                                 |
| --------------------------- | --------------------------------------- |
| `renderWidget()`            | Render widget using Liquid              |
| `renderPageLayout()`        | Render full page layout                 |
| `createBaseRenderContext()` | Create context with theme, media, icons |
| `getOrCreateEngine()`       | Get cached Liquid engine                |

### Hook Used

- `src/hooks/useExportState.js` - Export state management

---

## App Settings

### Frontend Files

- `src/pages/AppSettings.jsx` - Settings page
- `src/components/settings/AppSettingsPanel.jsx` - Settings renderer

### Route Context

- App Settings lives in the admin shell at `/app-settings`.
- It does not require an active project.
- When an active project exists, `AppSettings.jsx` also loads that project's theme metadata via `getTheme(activeProject.theme)` so it can hide app-level image-size controls when the theme defines its own `imageSizes`.

### Query Layer (`src/queries/appSettingsManager.js`)

| Function                | Method | Endpoint        |
| ----------------------- | ------ | --------------- |
| `getAppSettings()`      | GET    | `/api/settings` |
| `saveAppSettings(data)` | PUT    | `/api/settings` |

### Server Controller (`server/controllers/appSettingsController.js`)

| Function                | Purpose                                 |
| ----------------------- | --------------------------------------- |
| `getAppSettings()`      | Return current settings                 |
| `updateAppSettings()`   | Update with validation                  |
| `readAppSettingsFile()` | Read from SQLite-backed settings store (with defaults merge) |
| `getSetting(key)`       | Get setting by dot-notation key         |

### Hook (`src/hooks/useAppSettings.js`)

| Export                | Purpose                |
| --------------------- | ---------------------- |
| `settings`            | Current settings state |
| `loading`             | Loading state          |
| `isSaving`            | Saving state           |
| `hasChanges`          | Dirty state check      |
| `schema`              | Settings schema        |
| `handleInputChange()` | Update setting value   |
| `handleSave()`        | Save to server         |
| `handleCancel()`      | Reset to original      |

### Schema (`src/config/appSettings.schema.json`)

**Tabs:** general, media, export, developer

**Settings:**

- `general.language` - Language selection
- `general.dateFormat` - Date format
- `media.maxFileSizeMB` - Max file size
- `media.imageProcessing.quality` - Image quality
- `media.imageProcessing.sizes.*` - Size configurations
- `export.maxVersionsToKeep` - Max export versions
- `export.maxImportSizeMB` - Max import size
- `developer.enabled` - Developer mode toggle

**Current shipped defaults:** the UI currently exposes English only for `general.language`, and `general.dateFormat` defaults to `MMMM D, YYYY h:mm A`.

---

## Preview

### Frontend Files

- `src/components/pageEditor/PreviewPanel.jsx` - Preview iframe
- `src/pages/PagePreview.jsx` - Standalone preview page

### Query Layer (`src/queries/previewManager.js`)

| Function                   | Purpose                      |
| -------------------------- | ---------------------------- |
| `fetchPreview()`           | Get full page HTML           |
| `fetchRenderedWidget()`    | Render single widget         |
| `updatePreview()`          | Morph changed widgets        |
| `settingsToCssVariables()` | Convert settings to CSS vars |
| `updateWidgetSetting()`    | Update widget in preview     |
| `getGlobalWidgets()`       | Fetch header/footer          |
| `saveGlobalWidget()`       | Save global widget           |
| `getProjectWidgets()`      | Fetch widget schemas         |
| `scrollWidgetIntoView()`   | Scroll to widget             |

### Server Controller (`server/controllers/previewController.js`)

| Function               | Purpose                 |
| ---------------------- | ----------------------- |
| `generatePreview()`    | Generate full page HTML |
| `renderSingleWidget()` | Render single widget    |
| `getGlobalWidgets()`   | Get header/footer data  |
| `saveGlobalWidget()`   | Save global widget      |
| `serveAsset()`         | Serve asset files       |

### Preview Runtime (`src/utils/previewRuntime.js`)

Injected into preview iframe, handles:

- CSS variable updates
- Font loading
- Widget morphing (including loading newly enqueued styles/scripts from morph response)
- Selection detection and editor lifecycle events (`widget:select`, `widget:deselect`, `widget:block-select`, `widget:block-deselect`)
- Scroll to widget
- Real-time settings updates
- Element bounds reporting

Design mode detection is injected by `previewController.js` as an inline `<script>` in the `<head>` (`window.Widgetizer = { designMode: true }`) so it's available before deferred widget scripts run. Theme JS checks `window.Widgetizer?.designMode` to conditionally attach editor event listeners.

---

## Page Editor

### Main Page (`src/pages/PageEditor.jsx`)

**Imports:**

- Components: `WidgetList`, `PreviewPanel`, `SettingsPanel`, `EditorTopBar`, `ThemeSelector`
- Stores: `usePageStore`, `useWidgetStore`
- Hooks: `useNavigationGuard`

**State:**

- `previewMode` - desktop/mobile/tablet
- `previewIframeRef` - iframe reference

### Components (`src/components/pageEditor/`)

| Component                 | Purpose                          |
| ------------------------- | -------------------------------- |
| `WidgetList.jsx`          | Left sidebar with drag-and-drop  |
| `PreviewPanel.jsx`        | Preview iframe with update logic |
| `SettingsPanel.jsx`       | Right panel for settings         |
| `EditorTopBar.jsx`        | Top toolbar with save/undo/redo  |
| `ThemeSelector.jsx`       | Theme settings dropdown          |
| `WidgetSelector.jsx`      | Widget picker modal              |
| `WidgetInsertionZone.jsx` | Insert widget UI                 |
| `SelectionOverlay.jsx`    | Preview selection overlay        |
| `WidgetItem.jsx`          | Widget item in sidebar           |
| `SortableWidgetItem.jsx`  | Draggable widget wrapper         |
| `FixedWidgetItem.jsx`     | Non-draggable header/footer      |
| `BlockItem.jsx`           | Block item in widget             |
| `SortableBlockItem.jsx`   | Draggable block wrapper          |
| `BlockSelector.jsx`       | Block picker modal               |
| `BlockInsertionZone.jsx`  | Insert block UI                  |

### Store (`src/stores/pageStore.js`)

| State                   | Purpose                    |
| ----------------------- | -------------------------- |
| `page`                  | Current page data          |
| `originalPage`          | Saved state for comparison |
| `globalWidgets`         | Header/footer widgets      |
| `themeSettings`         | Theme settings             |
| `originalThemeSettings` | Saved theme settings       |

| Action                     | Purpose                     |
| -------------------------- | --------------------------- |
| `loadPage(id)`             | Load page, globals, theme   |
| `loadGlobalWidgets()`      | Fetch header/footer         |
| `loadThemeSettings()`      | Fetch theme settings        |
| `setPage(page)`            | Update page state           |
| `updateGlobalWidget()`     | Update header/footer        |
| `updateThemeSetting()`     | Update single theme setting |
| `resetPage()`              | Reset to original           |
| `hasUnsavedThemeChanges()` | Check for changes           |

**Undo/Redo:** Uses `zundo` temporal middleware (50 state limit)

### Store (`src/stores/widgetStore.js`)

Manages widget operations:

- `addWidget()`, `removeWidget()`, `duplicateWidget()`
- `reorderWidgets()`, `updateWidgetSettings()`
- `addBlock()`, `deleteBlock()`, `reorderBlocks()`, `updateBlockSettings()`, `duplicateBlock()`
- Block operations work on both page widgets and global widgets (header/footer) via internal helpers: `isGlobalWidgetId()`, `getWidgetData()`, `setWidgetData()`
- Selection state: `selectedWidgetId`, `selectedBlockId`, `selectedGlobalWidgetId`
- Hover state: `hoveredWidgetId`, `hoveredBlockId`
- Modification tracking: `modifiedWidgets`, `structureModified`

### Store (`src/stores/saveStore.js`)

Auto-save and save state:

- `save()` - Save all changes
- `hasUnsavedChanges()` - Check dirty state
- `resetAutoSaveTimer()` - Reset 60-second timer

### Data Flow

**Page Load:**

```
PageEditor → pageStore.loadPage(id)
  ├→ getPage(id) → page data
  ├→ loadGlobalWidgets() → header/footer
  └→ loadThemeSettings() → theme settings
→ widgetStore.loadSchemas()
→ PreviewPanel.fetchPreview() → initial HTML
```

**Widget Update:**

```
SettingsPanel change
→ widgetStore.updateWidgetSettings()
→ markWidgetModified()
→ PreviewPanel detects change
  ├→ Immediate: UPDATE_WIDGET_SETTINGS postMessage
  └→ Debounced: updatePreview() → morph widget
```

**Save:**

```
Save button / Auto-save timer
→ saveStore.save()
  ├→ savePageContent()
  ├→ saveGlobalWidget("header")
  ├→ saveGlobalWidget("footer")
  └→ saveThemeSettings()
→ Update original states
→ Clear modification flags
```

---

## Shared Utilities

### Frontend

| File                         | Functions                  |
| ---------------------------- | -------------------------- |
| `src/utils/slugUtils.js`     | `formatSlug()`             |
| `src/utils/dateFormatter.js` | `formatDate()`             |
| `src/config.js`              | `API_URL()`, `MEDIA_TYPES` (image extensions) |

### Backend

| File | Functions |
| --- | --- |
| `server/config.js` | Path helpers (`getProjectDir()`, `getPublishDir()`, `getThemeDir()`, `getThemesDir()`, etc.), `getMediaDir()` |
| `server/utils/mimeTypes.js` | `ALLOWED_MIME_TYPES`, `ZIP_MIME_TYPES`, `getContentType()`, `getMediaCategory()` |
| `server/utils/semver.js` | `parseVersion()`, `compareVersions()`, `isNewerVersion()`, `sortVersions()`, `getLatestVersion()` |
| `server/utils/themeHelpers.js` | `preprocessThemeSettings()` |
| `server/utils/projectHelpers.js` | `getProjectFolderName(projectId)`, `getProjectDetails()` |
| `server/utils/pathSecurity.js` | `isWithinDirectory()` |
| `server/utils/projectErrors.js` | `PROJECT_ERROR_CODES`, `handleProjectResolutionError()`, `isProjectResolutionError()` |
| `server/createApp.js` | Editor app factory — exports `createEditorApiApp()` (API routes + middleware) and `createEditorUiApp()` (static files + SPA catch-all) |

### Shared Hooks

| Hook                     | Purpose                                 | Used By                               |
| ------------------------ | --------------------------------------- | ------------------------------------- |
| `useAppSettings`         | App settings with caching               | Media, Pages, Projects, Export        |
| `useConfirmationModal`   | Confirmation modal state                | Pages, Menus, Media, Projects, Export |
| `useFormNavigationGuard` | Prevent navigation with unsaved changes | All forms                             |
| `useThemeLocale`         | Fetches the active project's theme locale JSON, provides `tTheme()` resolver for `tTheme:`-prefixed i18n keys | Editor components (SettingsPanel, ThemeSelector, PreviewPanel, BlockList, etc.) |
| `useToastStore`          | Toast notifications                     | All pages                             |

### Shared Stores

| Store              | Purpose                              |
| ------------------ | ------------------------------------ |
| `projectStore`     | Active project state                 |
| `toastStore`       | Toast notification state             |
| `themeUpdateStore` | Theme update count                   |
| `iconsStore`       | Per-project icon set caching         |
| `themeStore`       | Theme settings state (Settings page) |

### Shared Navigation Behavior

- `registerProjectStore(useProjectStore)` in `src/App.jsx` connects the active-project store to API header injection.
- `ProjectPickerLayout` is intentionally separate from the workspace sidebar. It is for choosing/managing projects, themes, and app-level settings.
- `Layout` is intentionally project-scoped. It shows the active project name, the site sidebar, and the `AdminMenu` escape hatch back to the admin area.

#### Icons Store (`src/stores/iconsStore.js`)

| State/Action                          | Purpose                          |
| ------------------------------------- | -------------------------------- |
| `iconsCache`                          | Cached icons by project ID       |
| `loading`                             | Loading state by project ID      |
| `error`                               | Error messages by project ID     |
| `fetchIcons(projectId, forceRefresh)` | Fetch icons for a project        |
| `getIcons(projectId)`                 | Get cached icons synchronously   |
| `clearCache(projectId)`               | Clear cache for specific project |
| `clearAllCache()`                     | Clear all cached icons           |

**Features:** Prevents refetching icons on every IconInput mount by maintaining a per-project cache.

#### Theme Store (`src/stores/themeStore.js`)

| State/Action                                     | Purpose                                    |
| ------------------------------------------------ | ------------------------------------------ |
| `settings`                                       | Current theme settings object              |
| `originalSettings`                               | Settings at load time for change detection |
| `loading`                                        | Loading state                              |
| `error`                                          | Error message if loading failed            |
| `loadSettings()`                                 | Fetch theme settings from server           |
| `setSettings(settings)`                          | Update settings object                     |
| `updateThemeSetting(groupKey, settingId, value)` | Update single setting                      |
| `resetThemeSettings()`                           | Revert to original state                   |
| `hasUnsavedThemeChanges()`                       | Check if settings differ from original     |
| `markThemeSettingsSaved()`                       | Update original after save                 |
| `reset()`                                        | Clear all state                            |

**Used by:** Settings page for global theme configuration management.