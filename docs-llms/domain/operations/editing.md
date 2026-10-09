# Editor changes, saving, and navigation

[Map](../README.md) · [Session state](../entities/session.md) · [Coverage](../coverage.md#content-and-editing)

## Plain-language guide

### Editing a page

Open a page and select a widget or block to reveal its controls. Selection changes what you are editing, not the content itself. Add, change, duplicate, move or remove content to shape the page; the editor preview reflects your working version.

Duplicating a widget copies its blocks too. Copy and paste keeps a temporary widget copy for reuse in the current project. Removing a section removes its contained blocks, but not the images, pages or menus they selected.

Changes to a normal widget belong to the current page version. Changes to the shared header/footer can affect every page using that language's header/footer. Shared theme settings, such as fonts, can affect all languages.

### Save, autosave, undo and redo

| Action | What it means |
| --- | --- |
| Save | Keeps the current page-editor changes, including changed shared sections and theme settings involved in that edit. |
| Autosave | Attempts to keep pending page-editor changes after roughly a minute without a new edit; failures can delay retries. |
| Undo | Moves back through supported editor changes. |
| Redo | Reapplies a change you just undid. |
| Open separate preview | Shows saved work, so save first to include the latest edits. |
| Export | Builds website files from saved work; it is a separate operation. |

Undo and redo also produce changes that need saving if you want the restored result to become the saved version. They are not recovery tools for every action elsewhere in the app, such as project deletion.

If you continue typing while a save is underway, those newer edits still need to be kept by a subsequent save. A page can show current text in its editor while the saved version is a little older.

### Leaving a page or switching language

If there are unsaved changes, the navigation prompt offers leaving or staying. To keep them, stay, save and then navigate. Leaving discards pending editing state, including the shared theme-settings draft; it cannot take back changes that autosave or an earlier save already stored. If an already-sent theme save lands afterward, the editor rereads the server while preserving any newer work.

Opening another language version opens a different page or entry. It does not translate the content you are currently looking at. Switching projects also clears project-specific editing state, including the widget clipboard.

### If saving fails

A save can involve the page, header/footer and shared settings. Some of them may have been saved before another part failed. Do not interpret a failed overall save as proof that every part stayed unchanged.

If another window switches the active project, Widgetizer can stop a stale workspace from saving into the wrong website. Return to the intended project using the recovery offered by the app.

### Changing app preferences

The application settings screen changes Widgetizer's preferences and processing choices. Its language option affects interface labels, not your website's authored text. These controls have their own save flow; page-editor autosave does not apply to every form.

### Example

Edit a Greek testimonial and the Greek footer, then save. Both changes are kept, but the footer change can appear on other Greek pages too. English content stays separate.

## Technical details

## Widget and block edits

| Action | What changes before save |
| --- | --- |
| Add widget | Build schema defaults/default blocks; allocate IDs; insert into page order |
| Edit widget setting | Replace value in the owning widget; mark dirty and schedule autosave |
| Duplicate widget | Deep-copy with new widget/block IDs; insert after source; clear listing/pagination flags |
| Copy/paste widget | Copy snapshot to session clipboard; paste with new IDs and cleared listing/pagination flags |
| Reorder/remove widget | Update map/order and selection; mark structure dirty |
| Add/duplicate block | Enforce schema block limits, create new ID/defaults or cloned values |
| Edit/reorder/remove block | Update the owning page/global widget and dirty state |
| Edit global | Change that language's header/footer data, separate from the page document |
| Edit theme setting | Change canonical theme store; affects every language after save |
| Undo/redo | Restore editor snapshots and reconcile dirty state, including theme/global changes |

These are in-memory changes until the corresponding save succeeds. A block or widget removal does not issue a media-file deletion. Its owner's next successful usage sync determines whether references remain.

## Save and autosave

1. Compare current content with saved baselines and explicit dirty flags. A clean save returns without writing.
2. If a save is running, coalesce callers into a queued follow-up; a manual caller can upgrade that follow-up's failure behavior.
3. Capture the session generation and content snapshots; verify loaded and active project identity.
4. Save dirty header/footer and page content concurrently, carrying the page language for globals.
5. After those guarded writes succeed, save shared theme settings through the canonical theme store.
6. Invalidate media cache and rebaseline against the content sent, leaving newer edits detectable as dirty. A reset suppresses ordinary old-session write-back. If a theme save finishes after discard, reread the server and reconcile the theme baseline/draft and undo snapshots only within the guarded project/load context; preserve a newer draft.

Autosave uses a 60-second base delay and increases delay after failures, capped at ten minutes. Manual ordinary failures reject; autosave failures return a failure result and can retry. A project mismatch marks the workspace stale and stops autosave. A reset increments the generation so an older response cannot overwrite the new session's baselines.

`hasUnsavedPageChanges` drives the page-name marker and includes page/global edits; `hasUnsavedChanges` additionally includes theme settings and drives Save, autosave and navigation. Reset restores the theme draft, not just modification flags. The discard/reconciliation regression cases are in [saveStore](../../../packages/editor-ui/src/stores/__tests__/saveStore.test.js) and [themeStore](../../../packages/editor-ui/src/stores/__tests__/themeStore.test.js).

**Boundary:** this is coordinated saving, not a transaction across page, globals, theme settings and media usage. Some requests may have persisted even when the overall save fails. Discard/reset cannot undo a request already committed on the server.

Implementation: [saveStore](../../../packages/editor-ui/src/stores/saveStore.js), [pageStore](../../../packages/editor-ui/src/stores/pageStore.js), [themeStore](../../../packages/editor-ui/src/stores/themeStore.js). Tests: [saveStore](../../../packages/editor-ui/src/stores/__tests__/saveStore.test.js), [undo/theme correction](../../../packages/editor-ui/src/stores/__tests__/undoThemeCorrection.test.js).

## Navigation and session changes

Navigation guards mediate leaving dirty forms/editor state with a leave/stay confirmation. Saving is a separate action: cancel navigation, save, then navigate again to preserve the changes. A language-version switch navigates to a different page/item document and must respect the same boundary. Changing list tabs/filter selection is not a translation write.

Project activation changes the server pointer; shell coordination resets project-scoped stores/caches and remounts the workspace. Requests include project identity, and mismatched writes are refused. Cross-tab stale detection and load-response guards prevent old work from silently appearing in a newly selected project.

Implementation: [widgetStore](../../../packages/editor-ui/src/stores/widgetStore.js), [useNavigationGuard](../../../packages/editor-ui/src/hooks/useNavigationGuard.js), [useFormNavigationGuard](../../../packages/editor-ui/src/hooks/useFormNavigationGuard.js), [projectSwitchCoordinator](../../../app/src/lib/projectSwitchCoordinator.js).

Tests: [navigation guard](../../../packages/editor-ui/src/hooks/__tests__/useNavigationGuard.test.jsx), [form guard](../../../packages/editor-ui/src/hooks/__tests__/useFormNavigationGuard.test.jsx), [project switch](../../../app/src/lib/__tests__/projectSwitchCoordinator.test.js), [pageStore](../../../packages/editor-ui/src/stores/__tests__/pageStore.test.js). Language navigation is changing concurrently; inspect the current UI tests before assigning complete coverage.

## Application settings

Read settings merged with defaults; merge incoming changes; validate media upload/image-processing and export limits; persist to SQLite. These settings affect the application rather than one language's content. Changing UI locale changes application labels, not authored website text.

Implementation: [appSettingsController](../../../packages/builder-server/src/controllers/appSettingsController.js), [LanguageInitializer](../../../app/src/components/layout/LanguageInitializer.jsx). Tests: [appSettings](../../../packages/builder-server/src/tests/appSettings.test.js).
