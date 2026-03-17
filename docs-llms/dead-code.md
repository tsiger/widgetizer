# Dead Code Audit

This file lists code and project items that look unused or left over after refactors.

## High-confidence removal candidates

### `src/components/layout/Toolbar.jsx`
- What it does: Old layout toolbar component with a small profile/settings/logout dropdown.
- Why it looks removable: I could not find any imports or runtime usage for this component anywhere in `src`.

### `src/utils/youtubeHelpers.js`
- What it does: Helper functions for parsing YouTube URLs, building embed URLs, and generating iframe markup.
- Why it looks removable: It appears to be used only by its test file and not by the real app.

### `src/utils/dateFormatter.js`
- What it does: Small date formatting utility with a list of supported date formats.
- Why it looks removable: It appears to be used only by its test file and not by the real app.

### `src/queries/mediaManager.js` -> `getMediaUrl`
- What it does: Builds a media file URL for a project asset.
- Why it looks removable: I could not find any caller for this helper in the app or tests.

### `src/queries/mediaManager.js` -> `updateMediaCache` export
- What it does: Updates the local media query cache after uploads.
- Why it looks removable: The function is used internally in the same file, but the exported API looks unused outside that file.

### `src/queries/previewManager.js` -> `settingsToCssVariables` export
- What it does: Converts theme settings into CSS variables for preview rendering.
- Why it looks removable: The function is used internally in the same file, but the exported API looks unused outside that file.

### `src/components/ui/Table.jsx`
- What it does: Main table component plus lower-level table building blocks like `TableHead`, `TableRow`, and `TableCell`.
- Why it looks removable: The main `Table` is used, but the smaller named exports only appear in this file and the shared UI barrel export.

### `src/components/ui/Card.jsx`
- What it does: Main card component plus extra subcomponents like `StructuredCard`, `CardHeader`, `CardBody`, and `CardFooter`.
- Why it looks removable: The main `Card` is used, but the extra named exports do not appear to have any consumers.

### `src/components/ui/FormField.jsx`
- What it does: Form field primitives and a few helper layout exports like `FormGroup` and `FormActions`.
- Why it looks removable: `FormGroup` and `FormActions` appear to be exported but not actually used anywhere else.

### `server/controllers/coreWidgetsController.js` -> `getCoreWidget`
- What it does: Returns one core widget by widget name.
- Why it looks removable: I found test usage, but no real production code calling it.

### `server/controllers/menuController.js` -> `getMenuById`
- What it does: Reads a single menu by ID and was likely intended as a rendering helper.
- Why it looks removable: It is still covered by tests, but I could not find a current production caller.

### `server/controllers/mediaController.js` -> `writeMediaFile`
- What it does: Writes the full `media.json` file for a project.
- Why it looks removable: It seems to be used by tests, while production flow uses higher-level media operations.

### `server/controllers/mediaController.js` -> `atomicUpdateMediaFile`
- What it does: Applies a transform function to `media.json` and writes the result safely.
- Why it looks removable: I found test usage, but no current production callers.

### `server/controllers/themeController.js` -> `getThemeLatestVersion`
- What it does: Returns the latest version of a theme.
- Why it looks removable: Production code seems to calculate this another way and does not call this helper directly.

### `server/config.js` -> `getProjectThemeTemplatesDir`
- What it does: Builds the path to a project's theme templates directory.
- Why it looks removable: I could not find any usage for this exported helper.

### `server/config.js` -> `getProjectThemeWidgetsDir`
- What it does: Builds the path to a project's theme widgets directory.
- Why it looks removable: I could not find any usage for this exported helper.

### `server/db/index.js` -> `closeDb`
- What it does: Closes the database connection.
- Why it looks removable: It looks like a test teardown helper rather than something used by the real app.

## Review before removing

### `src/pages/Plugins.jsx`
- What it does: Placeholder Plugins page that shows a "coming soon" style empty state.
- Why it might be removable: The feature is not implemented, but this page is still routed and visible in the app, so it is not truly dead yet.

### `server/routes/coreWidgets.js`
- What it does: Exposes `/api/core-widgets` and returns core widget definitions.
- Why it might be removable: I could not find any in-repo frontend caller, but it is still mounted in the server and may exist for future or external use.

### `electron/preload.js`
- What it does: Electron preload file.
- Why it might be removable: It currently only logs a message and does not expose any API bridge, so it looks like a placeholder.

### `src/core/filters/mediaMetaFilter.js`
- What it does: Registers the `media_meta` Liquid filter for templates.
- Why it might be removable: The filter is registered, but I could not find any actual in-repo template usage of `media_meta`.

## Dependency candidates

### `package.json` -> `@floating-ui/dom`
- What it does: Floating UI positioning library.
- Why it looks removable: I could not find any direct import or app usage in the repository.

### `package.json` -> `@types/react`
- What it does: React TypeScript type definitions.
- Why it might be removable: This project currently uses JS/JSX and I did not find TypeScript files.

### `package.json` -> `@types/react-dom`
- What it does: React DOM TypeScript type definitions.
- Why it might be removable: Same reason as `@types/react`; it looks unnecessary unless TypeScript is planned soon.
