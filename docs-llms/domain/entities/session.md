# Application settings and editor session

[Map](../README.md) · [Editing operations](../operations/editing.md)

## Plain-language guide

### What are application settings and an editing session?

Application settings describe how Widgetizer works for you, such as the interface language, image-processing preferences and how many website exports to keep.

An editing session is the work you currently have open: selected project and page, selected widget, unsaved changes, undo history, copied widget and preview.

### Which parts belong to the website?

| Thing | What it affects |
| --- | --- |
| Active project | Which website the workspace is showing. Switching does not copy content between sites. |
| Selected page or block | Which controls you are looking at; selecting alone does not change content. |
| Unsaved edits | Your current work, which may be visible in the editor before it is stored. |
| Undo / redo | Supported recent editor changes; it is not a backup of deleted projects or a history of every app operation. |
| Copied widget | A temporary copy you can paste in the current project. |
| Save status | Whether the editor still has changes to keep. |
| Application language | The words on Widgetizer's controls, not the authored website text. |

### What can you do?

Choose a project, open a page or language version, select content, undo or redo an edit, save, or leave the current editing view. If you try to leave with unsaved changes, the app can ask whether to leave or stay. To keep the changes, stay and save before leaving.

Switching projects resets project-specific editing state, including the widget clipboard. Do not use that clipboard as a lasting content backup.

### What if another window changes the active project?

Widgetizer checks that a save still belongs to the project you loaded. If another window makes the workspace stale, saving can stop rather than send your changes to the wrong website. Follow the app's recovery prompt to return to the intended project.

### Example

You edit a Greek page while using an English-language interface. The page is Greek content; the editor's buttons remain English. Switching the interface language changes those buttons, not the page's words.

## Technical details

Some important state belongs to the application or browser rather than the website's content.

| Object/state | Scope and effect |
| --- | --- |
| Application settings | SQLite settings merged with defaults; editor preferences, media processing and export limits |
| Active-project pointer | Application selection used by the local shell; switching it changes the workspace |
| Request scope | Resolved actor/project/folder boundary; mismatching write requests are rejected |
| Loaded page/global snapshots | Editor content and last-saved baselines used to determine dirty state |
| Theme store | Canonical editor owner for shared theme settings; page history holds a synchronized snapshot |
| Undo/redo history | In-memory editing history, not a persistent audit log or database rollback |
| Widget clipboard | In-memory copy for pasting; cleared on project reset |
| Save queue/generation | Coordinates in-flight saves, follow-up saves and discarded sessions |
| Selection/hover | Editor navigation only; does not create site content |
| Preview state/token | Temporary rendering/navigation state |
| Query caches | Derived data which must be invalidated/reset as content or project changes |
| UI locale | Language of the application interface; independent of page-editing language |

Application settings updates merge and validate the submitted fields before storing them. Project switches remount the workspace and reset project-scoped stores. Stale project detection prevents an older tab from treating another tab's active-project selection as permission to save into it.

Extension registries, route contributions, commands, and slots are integration definitions, not project content entities; their contracts remain in [package architecture](../../core-packages.md). Electron installer/update state is outside this web-app domain map; see [Electron](../../core-electron.md).

Implementation: [appSettingsController](../../../packages/builder-server/src/controllers/appSettingsController.js), [settingsRepository](../../../packages/builder-server/src/db/repositories/settingsRepository.js), [projectSwitchCoordinator](../../../app/src/lib/projectSwitchCoordinator.js), [saveStore](../../../packages/editor-ui/src/stores/saveStore.js), [resolveActiveProject](../../../packages/builder-server/src/middleware/resolveActiveProject.js).

Tests: [appSettings](../../../packages/builder-server/src/tests/appSettings.test.js), [saveStore](../../../packages/editor-ui/src/stores/__tests__/saveStore.test.js), [project mismatch](../../../packages/builder-server/src/tests/projectMismatchGuard.test.js), [staleProjectStore](../../../packages/editor-ui/src/stores/__tests__/staleProjectStore.test.js).
