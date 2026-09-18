# Project lifecycle

[Map](../README.md) · [Operations](README.md) · [Project entity](../entities/project.md) · [Coverage](../coverage.md#project-lifecycle)

## Plain-language guide

### Starting a website

**You begin with:** a name, a theme, an optional preset and a default language.

**Widgetizer prepares:** the theme's starting pages, shared header/footer, menus and settings. A preset may also supply example collection entries and images.

**You end with:** an editable website you can personalize. If it is your first active project, Widgetizer selects it for you. A new project starts in one language; you can add more afterward. Creating a project does not register a domain or put the website online.

### Opening or changing a project

The project list lets you find and open a website. Opening it changes the workspace you are using; it does not merge it with the previous project.

Editing project details can change its name, shared website information, business details, logo or intended website address. Changing its storage folder moves the local project files while keeping the project as the same website in the app. Changes to shared details apply across languages; they do not translate page text.

### Making an independent copy

Duplicate is useful when trying another design or starting a similar website. The copy includes the source's saved content, language versions, settings and uploaded files. Supported internal selections are adjusted so the copied website can use its own content.

Afterward, changes in the copy are independent of the original. Duplication is a saved action; it does not wait for you to open the page editor and press Save.

### Backing up and importing

| Action | What you begin with | What you get |
| --- | --- | --- |
| Project backup | A saved editable project | A downloadable archive intended for later editing in Widgetizer. |
| Import | A compatible project backup and its required theme installed | A new project restored from the archive. |
| Website export | Saved site content | Visitor-facing website files; see [website output](output.md). |

Import preserves the saved contents rather than translating them again. If a project with the same name already exists, the imported one receives a different name. The existing project remains.

### Deleting a project

Deletion removes the local editable project, all its languages and uploaded media, and its locally managed exports. The separately installed theme remains available. A website already hosted elsewhere is not removed by this local operation.

This is not the same as deleting one page, and the page editor's Undo history does not restore a deleted project.

### If an operation fails

An invalid backup, unavailable required theme or invalid project details can prevent the operation. Some creation, copy or import steps can also finish while a supporting step fails. Do not assume an error always means “nothing changed,” or that a returned project proves every image description was restored. The technical notes below identify the current partial-success cases.

### Example

Back up the café website, import that archive into a second installation with the theme available, and continue editing the imported project there. The original installation's project and the website already online stay unchanged.

## Technical details

## Create a project

**Before:** valid name, folder syntax if supplied, theme, site URL/identity, and a single supported default language. Name/folder collisions are resolved with unique identities.

**Current sequence:**

1. Resolve name/folder and create the project directory.
2. Copy the installed theme source, excluding templates from the raw copy.
3. Resolve the preset; optionally replace starter menus.
4. Turn theme/preset templates into page/global JSON. Stamp ordinary page UUIDs and enrich starter links/menu references.
5. Apply preset theme-setting defaults and optional collection-item seed data.
6. Insert the project row with a fresh project UUID.
7. Seed optional media binaries and database metadata, now that the owning row exists.
8. Refresh media usage. Select the new project if there was no active project.

**Failure:** theme-copy/template-processing failures remove the scaffold directory. Some preset/menu/settings/collection/media errors are warnings. Do not assume every post-scaffold failure has an all-or-nothing rollback.

Evidence: [projectController](../../../packages/builder-server/src/controllers/projectController.js) `createProject`, [projectScaffold](../../../packages/builder-server/src/utils/projectScaffold.js), [projects tests](../../../packages/builder-server/src/tests/projects.test.js), [preset media tests](../../../packages/builder-server/src/tests/presetMediaSeeding.test.js), [preset collections tests](../../../packages/builder-server/src/tests/collectionPresetSeeding.test.js).

## Edit project metadata or folder

Validate fields and conflicts before moving content. Preserve project UUID. If the folder changes, copy to the new folder and remove the old folder, then update the row. When site identity changes, refresh its media usage. Site title/URL/Clean URLs affect rendering rather than rewriting every content document. Shared identity/settings apply across languages.

Changing `defaultLanguage` is allowed only with no additional languages. Adding/removing additional codes through the generic update is rejected; use [language lifecycle](languages.md).

Failure boundary: the folder move and SQLite update are separate operations. Validate recovery from failure after one succeeds; the current handler does not provide a distributed transaction.

## Activate or switch project

The server validates the target and changes the active-project pointer. The shell coordinates query/store reset and workspace remount. Loaded editor identity and the server write guard protect stale tabs. This operation does not copy content. See [session transitions](editing.md#navigation-and-session-changes).

## Duplicate a project

1. Allocate a new project UUID, unique display name and folder.
2. Copy the complete source directory, including all language folders.
3. Regenerate page, menu, and collection-item UUIDs; remap stable links, menu selections, parent pointers, and translation-group references through the new identity maps.
4. Create the new project row with copied project settings.
5. Copy media metadata with regenerated file IDs; copied asset paths still refer inside the new project.
6. Rebuild usage in the new project.

Groups whose original identifying member no longer exists keep their group label so surviving versions stay related inside the new project. The group label is interpreted within a project, not as permission to access another project.

Failure boundary: copy failures attempt directory cleanup; UUID-remapping and media-metadata failures are caught as warnings. A successful response therefore does not by itself prove every internal reference was remapped.

Evidence: [remapDuplicatedProjectUuids](../../../packages/builder-server/src/utils/linkEnrichment.js), [projectController](../../../packages/builder-server/src/controllers/projectController.js), [projects tests](../../../packages/builder-server/src/tests/projects.test.js).

## Export an editable-project backup

Produce a ZIP with `project-export.json`, editable project files, uploads, and media metadata serialized from SQLite as `uploads/media.json`. The manifest includes shared settings, site identity, default/additional language codes, theme/version/preset, and export provenance. This is separate from [rendering a static site](output.md#static-site-export).

The metadata serialization path logs failures, so review completeness before treating every returned backup as a verified restore point. It is not a snapshot of the whole application database or other projects.

## Import an editable-project backup

1. Validate upload size, ZIP paths, nonempty archive, manifest shape, and installed theme availability.
2. Allocate a new project name/folder/UUID and extract into a temporary directory.
3. Recover theme version from the manifest or copied theme metadata; normalize imported language configuration, falling back to a single-language configuration if invalid.
4. Copy source files into the destination, excluding the export manifest; insert the project row after successful copying.
5. Restore media metadata into SQLite with new media file IDs, then remove the intermediate media JSON.
6. Refresh usage and remove temporary extraction/upload files.

Unlike project duplication, this path does **not** run the content-UUID remapper: page/item/menu identities in the backup remain project-scoped. Both paths regenerate media database IDs. Both must preserve translation membership and translated metadata.

Failure: the inner failure handler attempts to delete the new row and directories. Media metadata restoration can fail nonfatally; binaries existing on disk do not prove the library metadata was restored. The test `round-trips media metadata through export and import` verifies filenames, paths, sizes, and new file IDs; it does not prove every multilingual combination.

Evidence: [projectController](../../../packages/builder-server/src/controllers/projectController.js) `exportProject` / `importProject`, [projects tests](../../../packages/builder-server/src/tests/projects.test.js), [media rewrite tests](../../../packages/builder-server/src/tests/media.test.js).

## Delete a project

Under the per-project export lock, attempt generated-export cleanup, delete the project row with cascaded metadata, and reassign the active project in one database transaction. Then remove the project directory. All language content belongs to that directory; shared-within-project media is deleted with the project. The theme library source is not owned by this project.

Export cleanup can warn and proceed. Directory removal occurs after row deletion, so a filesystem failure may leave files without a project row. Review this as a cleanup/recovery case, not as a promise of atomic deletion.

Evidence: [projectService](../../../packages/builder-server/src/services/projectService.js), [projectRepository](../../../packages/builder-server/src/db/repositories/projectRepository.js), [exportController](../../../packages/builder-server/src/controllers/exportController.js), [projects](../../../packages/builder-server/src/tests/projects.test.js) and [export](../../../packages/builder-server/src/tests/export.test.js) tests.
