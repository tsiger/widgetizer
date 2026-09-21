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
3. Resolve the preset; optionally replace starter menus (staged, then moved into place).
4. Turn theme/preset templates into page/global JSON. Stamp ordinary page UUIDs and enrich starter links/menu references.
5. Apply preset theme-setting defaults and optional collection-item seed data.
6. Insert the project row with a fresh project UUID.
7. Seed optional media binaries and database metadata, now that the owning row exists.
8. Refresh media usage. Select the new project if there was no active project.

**Failure:** creation is all-or-nothing. A failure at any step — copying the theme, processing templates, reading or applying the preset's menus, settings, collection items or media — removes the project directory and the row if one was inserted, and reports failure. Creating the project again afterwards works.

**A preset the user chose and did not fully get is a failed creation, not a warning**, because the project would record that preset while missing its content and nothing later would say so. The distinction is between *absent* and *unreadable*: a preset that ships no menus, no collections or no `preset.json` creates normally, while one whose files are present and cannot be read stops the creation.

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

Failure boundary: a duplicate is made whole or not at all. Copying, re-pointing the identities and copying the media library are one operation — a failure in any of them removes the unfinished copy and reports failure, because a copy whose links still name the original project's pages renders as a site that has lost its internal navigation. The original is never touched, and the operation can be retried.

Checked against one bilingual fixture carrying every language (including one the [static site export](output.md#multilingual-boundary-at-this-snapshot) would skip), both kinds of translation group, groups whose original member was deleted, out-of-schema item fields, per-language manual order, `siteIdentity`, theme-update provenance, per-language media overrides, and every reference kind in root and language folders. A duplicate whose source directory still holds a stale `uploads/media.json` copies that file along with the rest; harmless, because the backup path below never reads it.

Evidence: [remapDuplicatedProjectUuids](../../../packages/builder-server/src/utils/linkEnrichment.js), [projectController](../../../packages/builder-server/src/controllers/projectController.js), [projects tests](../../../packages/builder-server/src/tests/projects.test.js).

## Export an editable-project backup

Produce a ZIP with `project-export.json`, editable project files, uploads, and media metadata serialized from SQLite as `uploads/media.json`. The manifest includes shared settings, site identity, default/additional language codes, theme/version/preset, optional theme-update provenance, and export provenance. This is separate from [rendering a static site](output.md#static-site-export).

**SQLite is the only source of the exported media library.** Any `uploads/media.json` sitting in the project folder — a project older than the move of media metadata to SQLite, or a restore that failed and left its input behind — is excluded from the file walk, including when the live library is empty. Otherwise the ZIP would carry two entries of one name and an extractor would keep the first, silently making the leftover file the restored library. The serialized entry is written even for a project with no media, so "this project has no media" is stated rather than inferred.

The library is read before the response starts streaming: once the ZIP is being written the only thing left to send is a truncated archive that looks complete, so a metadata read failure answers with an error instead of a backup missing its library. It is not a snapshot of the whole application database or other projects.

## Import an editable-project backup

1. Validate upload size, ZIP paths, nonempty archive, one media-metadata entry, manifest shape, restorable languages, and installed theme availability.
2. Allocate a new project name/folder/UUID and extract into a temporary directory.
3. Recover theme version from the manifest or copied theme metadata.
4. Copy source files into the destination, excluding the export manifest; insert the project row after successful copying.
5. Restore media metadata into SQLite with new media file IDs, then remove the intermediate media JSON.
6. Refresh usage and remove the temporary extraction directory.

Unlike project duplication, this path does **not** run the content-UUID remapper: page/item/menu identities in the backup remain project-scoped. Both paths regenerate media database IDs. Both preserve translation membership and translated metadata.

**A backup this version cannot fully restore is refused before anything exists.** Language metadata is validated before a name, folder or row is allocated, and a code this version cannot work with produces a 400 naming it and stating that nothing changed and the backup file is untouched. Importing anyway would put the backup's other-language pages, menus and items on disk with nothing listing them — a restore that silently returns part of a website. A backup naming no languages at all predates them and imports on the single-language defaults.

**Two entries named `uploads/media.json`** — the shape older backups can have — is refused too. They describe different libraries and nothing in the archive says which is current, so neither is chosen.

**A media library that cannot be read, is not a library, or cannot be written fails the import.** A `files` that is absent or not a list is refused rather than read as empty, because a project with no media and a file this version cannot interpret are different claims. An empty list is a supported library and restores as one. The intermediate media JSON is removed only after a successful restore: it is the restore's input, and deleting it after a failure would turn a recoverable state into a silent loss.

Failure: the inner failure handler deletes the new row and directories, so a refusal leaves nothing to clean up by hand. The server's own copy of the uploaded ZIP is removed on every exit, successful or not; the user's backup file is never touched.

Verified against one bilingual fixture through both workflows, plus the refusal cases above. That fixture is broad rather than exhaustive — it is not an audit of every way a backup can be malformed, and a successful restore of it does not prove every archive shape is handled.

Evidence: [projectController](../../../packages/builder-server/src/controllers/projectController.js) `exportProject` / `importProject`, [projects tests](../../../packages/builder-server/src/tests/projects.test.js), [media rewrite tests](../../../packages/builder-server/src/tests/media.test.js).

## Delete a project

Under the per-project export lock, attempt generated-export cleanup, delete the project row with cascaded metadata, and reassign the active project in one database transaction. Then remove the project directory. All language content belongs to that directory; shared-within-project media is deleted with the project. The theme library source is not owned by this project.

Export cleanup can warn and proceed. Directory removal occurs after row deletion, so a filesystem failure may leave files without a project row. Review this as a cleanup/recovery case, not as a promise of atomic deletion.

Evidence: [projectService](../../../packages/builder-server/src/services/projectService.js), [projectRepository](../../../packages/builder-server/src/db/repositories/projectRepository.js), [exportController](../../../packages/builder-server/src/controllers/exportController.js), [projects](../../../packages/builder-server/src/tests/projects.test.js) and [export](../../../packages/builder-server/src/tests/export.test.js) tests.
