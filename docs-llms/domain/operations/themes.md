# Theme lifecycle and shared settings

[Map](../README.md) · [Theme entities](../entities/theme.md) · [Coverage](../coverage.md#themes-and-output)

## Plain-language guide

### Choosing the starting design

Browse available themes and their presets when creating a project. A theme determines the design tools and kinds of content available; a preset supplies a coordinated starting look and may include example content.

Creating the project gives it an installed copy to work with. Changing your project content does not rewrite the library's starter theme.

Browsing available widgets, starter pages, icons, fonts or translated control labels only shows the choices the theme offers. A choice changes the website when you apply it to content or settings and save.

### Changing shared appearance

Open theme settings to change the controls the theme offers, such as colors, fonts or branding. Save to keep the changes. Only the settings you changed are saved, so two screens changing different settings do not undo each other; if another screen changed the same setting to a different value first, nothing is saved; Widgetizer loads the current values, keeps your edits on top as unsaved changes and tells you. These are website-wide choices, so the Greek and English versions use the same shared settings.

A logo selected in an ordinary widget is that widget's choice. A logo or other image chosen in shared theme settings can have a wider reach. Look at where the setting belongs before deciding which one to change.

### Installing or updating a theme

| Action | What happens |
| --- | --- |
| Install a theme package | Makes its design resources available in the theme library after validation. |
| Refresh the available theme version | Prepares the library's available release; existing project content is a separate copy. |
| Check a project's updates | Compares its installed theme version with the available version. |
| Change update preference | Controls the project's update preference; it does not itself apply an update. |
| Apply an update | Changes the project's theme resources and may add new starter pages or menus. |
| Delete a library theme | Removes it from the library, but is refused while a project uses it. |

Applying a newer version can change how saved content looks or which controls are available. Widgetizer tries to preserve existing user content and matching settings. A new required collection field may need filling in; an old removed field may retain its value until you explicitly discard it.

### What happens to translations and publishing?

The design resources are shared across languages, so an update can affect them all. It does not translate your text or recreate every page in every language.

Save shared-setting edits, or complete the theme update, then inspect the result. Previously exported website files remain unchanged; a new export uses the updated design.

### If an update only partly succeeds

An update prepares its files before replacing anything. If replacing them fails, Widgetizer tries to put the previous theme files back and keeps the version unchanged, so you can try again. If putting them back also fails, it keeps the recovery copy and tries again the next time you update; an update interrupted partway is undone the same way. Recording the new version comes after the files: if only that step fails, the project has the new files but still shows the old version, and updating again re-applies the same files.

### Example

A theme release adds a new article field and adjusts typography. Existing articles stay in your project, but some may need the new field completed before export. Their Greek versions use the updated field definition too.

## Technical details

## Browse and install library themes

The theme API exposes list/details, schemas, templates, versions, presets, update counts and locale resources. Theme provisioning and source caches supply these definitions. Upload installs theme-package data after validation. Deletion refuses a theme used by any project; otherwise it removes the library directory and invalidates its source cache. These operations are distinct from editing a project's installed content.

The library's latest snapshot is assembled from its base and update folders: only update folders whose version is newer than the base are layered, in version order, and when none is newer no snapshot is built and readers use the base. An uploaded theme ZIP for an installed theme must declare the installed base version, and only its new update versions are added. [buildLatestSnapshotAtomicity](../../../packages/builder-server/src/tests/buildLatestSnapshotAtomicity.test.js) covers snapshot construction; it should not be read as proof that applying an update to a project is also atomic.

## Save shared theme settings

Load the project's theme settings, edit through the canonical theme store, validate/persist through the theme controller, and update theme-setting media usage. These settings apply across all languages.

A save sends only the settings that changed, each with the value it started from (`@widgetizer/core/themeSettingChanges`). The server merges them into the file it holds now, sanitizes only those settings, and answers with the saved file. Structure, version and untouched settings always come from the stored file, so a screen holding an older copy — loaded before a theme update, or before another screen saved — cannot put them back. Changes to different settings from different screens all apply. A setting that no longer holds the value a change started from, and does not already hold the requested value, was changed elsewhere: the whole save is refused with `409 THEME_SETTINGS_CHANGED` and nothing is written, and the editor fetches the current settings, keeps the user's edits on top as unsaved, and says so (the page editor's autosave then sends them). A change for a setting the theme no longer has is skipped with a warning, and an edit kept on top of a refetched copy for such a setting is reported (`SETTING_REMOVED` / `SETTING_AMBIGUOUS`) rather than silently dropped.

The theme store runs one save at a time; a save requested meanwhile sends whatever is still unsaved once the first lands, so responses cannot arrive out of order. The editor's undo history follows every server copy the store takes: a correction or another screen's change is rewritten into history, and a different theme version clears it. Applying a theme update drops the settings the editor has loaded, so the next screen loads the updated ones. A discard made while a save is in flight keeps the saved values; only edits made after the discard stay unsaved on top. The whole-file `POST` remains for servers and callers without the change-only route; it refuses a file from an older theme version (`409 THEME_VERSION_CHANGED`), and a stored file that cannot be read or parsed fails the save without writing.

## Check and apply a project update

1. Check installed versus available version and expose the project's update preference.
2. **Prepare the whole update off to the side.** Copy the updatable theme paths — layout, assets, widgets, snippets, locales, screenshot and collection-type definitions — into a staging directory, work out which root menus and template-derived pages are missing, and compute the merged theme settings. Nothing the project uses has been touched yet.
3. **Swap it in.** Move each existing path aside into a backup directory, move the staged copy into place, write the merged settings, then add the new menus and pages.
4. Update project version metadata and refresh media usage.

The whole run holds the project's content-write section (inside the update's own per-project serializer), so a theme-settings save waits for the update and applies on top of what it left rather than being overwritten by the swap or rolled back by a failed one.

Updatable paths are replaced wholesale, which is how a theme deletes a file: it is absent from the new copy. Existing user menus and pages are never overwritten. User collection item data is separate from replaced collection schemas. Removed fields can become archived values; new required fields can make existing items invalid until edited. Shared schema changes affect content in every language, even when starter additions are only at the root.

**Failure boundary: the whole update is rolled back, not the file.** A failure while preparing has changed nothing. A failure during the swap attempts to remove what was placed and move the displaced files back, including anything the update had added. If that undo itself fails, the backup and its plan stay on disk and the next update retries the undo before doing anything else; the error makes no claim about what the project holds. Half an update is its own kind of broken — the new theme's assets beside the old theme's widgets is a project that renders wrongly rather than one that failed to update — so the unit of rollback is the whole update, not the file.

**The new version is recorded only after the update succeeds,** which is what keeps a failed update available to try again instead of reading as one that already happened. That metadata write sits outside the file rollback: if it fails, the project holds the new files while recording the old version, and the next update re-applies the same files over themselves.

**Recovery is attempted automatically.** Before the swap begins, a plan is written into the backup directory naming what the update will add and which paths it will create where the project had none. A run interrupted partway leaves that plan behind, and the next update tries to undo it first — removing the additions and restoring the displaced files; if that undo fails, the update stops and the plan is kept for the next attempt. A backup with no plan belonged to a run that had already finished and is simply discarded. Nothing asks the user to look at or repair files.

One update runs at a time per project. Two at once would each read the other's working directories as their own, and the second would take the first's backup for an abandoned run.

Exercised against a real 0.9.9 → 0.9.10 delta on an imported pre-multilingual project that had since been edited and given a second language: 60 theme files changed and 4 added, none of the author's pages, menus or collection items touched in either language, every preset default preserved, and no working directories left behind. See [the legacy-upgrade check](../coverage.md#the-legacy-upgrade-check).

### Verified limitations

| Limitation | Why it stands |
| --- | --- |
| The version write is not covered by the rollback | If recording the new version fails after the files have been swapped, the project holds the new theme files while still reporting the old version. The next update re-applies the same files over themselves — wasteful, not damaging, since updatable paths are replaced wholesale either way. Holding the backup across a database write is more machinery than that outcome warrants. |
| An interrupted update is undone by the *next* update, not on startup | The recovery runs as part of applying an update, and only when one is available. A project whose update was interrupted and which is never updated again keeps its backup directory. It is inert and excluded from backups. |
| A failure whose rollback also fails reports only that it failed | At that point what the project holds is not known, so the message says the update could not be completed and to try again, rather than claiming anything about the files. The recovery copies are kept for the next attempt. |

## Scope limits

There is no generic “switch this existing project to any other theme and migrate everything” operation in this inventory. Choosing a theme/preset at project creation and applying a version update have specific, different semantics. Theme-authoring and synchronization scripts are documented in the existing [theme documentation](../../theming.md).

Implementation: [themeController](../../../packages/builder-server/src/controllers/themeController.js), [themeUpdateService](../../../packages/builder-server/src/services/themeUpdateService.js), [themeStore](../../../packages/editor-ui/src/stores/themeStore.js).

Tests: [structuralFailureRecovery](../../../packages/builder-server/src/tests/structuralFailureRecovery.test.js), [themes](../../../packages/builder-server/src/tests/themes.test.js), [themeUpdateService](../../../packages/builder-server/src/tests/themeUpdateService.test.js), [themeUpdateApplyToDir](../../../packages/builder-server/src/tests/themeUpdateApplyToDir.test.js), [themeUpdateCopies](../../../packages/builder-server/src/tests/themeUpdateCopies.test.js), [themeSettingChanges](../../../packages/builder-server/src/tests/themeSettingChanges.test.js), [buildLatestSnapshotAtomicity](../../../packages/builder-server/src/tests/buildLatestSnapshotAtomicity.test.js), [themeStore](../../../packages/editor-ui/src/stores/__tests__/themeStore.test.js).
