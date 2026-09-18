# Theme lifecycle and shared settings

[Map](../README.md) · [Theme entities](../entities/theme.md) · [Coverage](../coverage.md#themes-and-output)

## Plain-language guide

### Choosing the starting design

Browse available themes and their presets when creating a project. A theme determines the design tools and kinds of content available; a preset supplies a coordinated starting look and may include example content.

Creating the project gives it an installed copy to work with. Changing your project content does not rewrite the library's starter theme.

Browsing available widgets, starter pages, icons, fonts or translated control labels only shows the choices the theme offers. A choice changes the website when you apply it to content or settings and save.

### Changing shared appearance

Open theme settings to change the controls the theme offers, such as colors, fonts or branding. Save to keep the changes. These are website-wide choices, so the Greek and English versions use the same shared settings.

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

Current update steps can continue after some failures. A reported version change therefore needs to be read alongside any warnings and the actual result. The technical notes below explain the parts that are not an all-or-nothing replacement.

### Example

A theme release adds a new article field and adjusts typography. Existing articles stay in your project, but some may need the new field completed before export. Their Greek versions use the updated field definition too.

## Technical details

## Browse and install library themes

The theme API exposes list/details, schemas, templates, versions, presets, update counts and locale resources. Theme provisioning and source caches supply these definitions. Upload installs theme-package data after validation. Deletion refuses a theme used by any project; otherwise it removes the library directory and invalidates its source cache. These operations are distinct from editing a project's installed content.

The library's latest snapshot is assembled from its base and update folders. [buildLatestSnapshotAtomicity](../../../packages/builder-server/src/tests/buildLatestSnapshotAtomicity.test.js) covers snapshot construction; it should not be read as proof that applying an update to a project is also atomic.

## Save shared theme settings

Load the project's theme settings, edit through the canonical theme store, validate/persist through the theme controller, and update theme-setting media usage. Server corrections/warnings can cause a settings reload; editor undo snapshots must not reintroduce rejected values. These settings apply across all languages.

## Check and apply a project update

1. Check installed versus available version and expose the project's update preference.
2. Apply updatable theme paths: layout, assets, widgets, snippets, locales, screenshot and collection-type definitions.
3. Add missing root menus and template-derived pages while preserving existing user files.
4. Merge new theme schema/settings structure while preserving matching customized values.
5. Update project version metadata and refresh media usage.

User collection item data is separate from replaced collection schemas. Removed fields can become archived values; new required fields can make existing items invalid until edited. Shared schema changes affect content in every language, even when starter additions are only at the root.

**Failure boundary:** file-copy/menu/template/settings-merge errors can be logged and processing can continue. Project version metadata is subsequently updated. Review whether a structured partial-update result would be clearer than relying on logs; no rollback guarantee is implied here.

## Scope limits

There is no generic “switch this existing project to any other theme and migrate everything” operation in this inventory. Choosing a theme/preset at project creation and applying a version update have specific, different semantics. Theme-authoring and synchronization scripts are documented in the existing [theme documentation](../../theming.md).

Implementation: [themeController](../../../packages/builder-server/src/controllers/themeController.js), [themeUpdateService](../../../packages/builder-server/src/services/themeUpdateService.js), [themeStore](../../../packages/editor-ui/src/stores/themeStore.js).

Tests: [themes](../../../packages/builder-server/src/tests/themes.test.js), [themeUpdateService](../../../packages/builder-server/src/tests/themeUpdateService.test.js), [themeUpdateApplyToDir](../../../packages/builder-server/src/tests/themeUpdateApplyToDir.test.js), [themeUpdateCopies](../../../packages/builder-server/src/tests/themeUpdateCopies.test.js), [themeStore](../../../packages/editor-ui/src/stores/__tests__/themeStore.test.js).
