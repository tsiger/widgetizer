# Project lifecycle

[Map](../README.md) · [Operations](README.md) · [Project entity](../entities/project.md) · [Coverage](../coverage.md#project-lifecycle)

## Plain-language guide

### Starting a website

**You begin with:** a name, a theme, an optional preset and a default language.

**Widgetizer prepares:** the theme's starting pages, shared header/footer, menus and settings. A preset may also supply example collection entries and images.

**You end with:** an editable website you can personalize. If it is your first active project, Widgetizer selects it for you. A new project starts in one language; you can add more afterward. Creating a project does not register a domain or put the website online.

### Opening or changing a project

The project list lets you find and open a website. Opening it changes the workspace you are using; it does not merge it with the previous project.

Project details open for the active project only; the project list does not link to another project's details. Editing them can change its name, shared website information, business details, logo or intended website address. The project form no longer offers changing its storage folder; a direct API request can still move the local files while keeping the project as the same website in the app. Changes to shared details apply across languages; they do not translate page text.

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

An invalid backup, unavailable required theme or invalid project details can prevent the operation. Creating, copying and importing a project each try to remove what they had made when they fail, so you can usually simply try again; if that cleanup also fails, the problem is logged and a partial project or folder can be left behind. Deleting a project, or moving its folder, can succeed while an old folder stays on disk (for example, a file another program holds open); Widgetizer then names that folder in a warning, and never reuses it.

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

**Failure:** a failure at any step — copying the theme, processing templates, reading or applying the preset's menus, settings, collection items or media — attempts to remove the project directory and the row if one was inserted, and reports failure. Cleanup is best-effort: a cleanup failure is logged and can leave a row or directory behind. Creating the project again afterwards works.

**A preset the user chose and did not fully get is a failed creation, not a warning**, because the project would record that preset while missing its content and nothing later would say so. The distinction is between *absent* and *unreadable*: a preset that ships no menus, no collections or no `preset.json` creates normally, while one whose files are present and cannot be read stops the creation.

Evidence: [projectController](../../../packages/builder-server/src/controllers/projectController.js) `createProject`, [projectScaffold](../../../packages/builder-server/src/utils/projectScaffold.js), [projects tests](../../../packages/builder-server/src/tests/projects.test.js), [preset media tests](../../../packages/builder-server/src/tests/presetMediaSeeding.test.js), [preset collections tests](../../../packages/builder-server/src/tests/collectionPresetSeeding.test.js).

## Edit project metadata or folder

Validate fields and conflicts before moving content. Preserve project UUID. If the folder changes (API only; the form hides the field), copy to the new folder, update the row, then remove the old folder. When site identity changes, refresh its media usage. An update that leaves out the notes (`description`) keeps the stored notes; sending an empty value clears them. Site title/URL/Clean URLs affect rendering rather than rewriting every content document. Shared identity/settings apply across languages.

Changing `defaultLanguage` is allowed only with no additional languages. Adding/removing additional codes through the generic update is rejected; use [language lifecycle](languages.md). These language rules are checked again inside the project's content-write section, against the current row, so an update cannot race a language being added.

Failure boundary: a failed copy or row update attempts to remove only the copy (a cleanup failure is logged and can leave it on disk) and leaves the project in its old folder; once the row names the new folder, an old folder that cannot be fully removed is reported as `folderLeftBehind`. There is no distributed transaction.

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

The copy's folder name is free in the database and on disk, so a copy never lands in a folder left behind by a deletion.

Failure boundary: a duplicate is made whole or not at all. Copying, re-pointing the identities and copying the media library are one operation — a failure in any of them removes the unfinished copy and reports failure, because a copy whose links still name the original project's pages renders as a site that has lost its internal navigation. The original is never touched, and the operation can be retried.

Checked against one bilingual fixture carrying every language (including one the [static site export](output.md#multilingual-boundary-at-this-snapshot) would skip), both kinds of translation group, groups whose original member was deleted, out-of-schema item fields, per-language manual order, `siteIdentity`, theme-update provenance, per-language media overrides, and every reference kind in root and language folders. A duplicate whose source directory still holds a stale `uploads/media.json` copies that file along with the rest; harmless, because the backup path below never reads it.

Evidence: [remapDuplicatedProjectUuids](../../../packages/builder-server/src/utils/linkEnrichment.js), [projectController](../../../packages/builder-server/src/controllers/projectController.js), [projects tests](../../../packages/builder-server/src/tests/projects.test.js).

## Export an editable-project backup

Produce a ZIP with `project-export.json`, editable project files, uploads, and media metadata serialized from SQLite as `uploads/media.json`. The manifest includes shared settings, site identity, default/additional language codes, theme/version/preset, optional theme-update provenance, and export provenance. This is separate from [rendering a static site](output.md#static-site-export).

**SQLite is the only source of the exported media library.** Any `uploads/media.json` sitting in the project folder — a project older than the move of media metadata to SQLite, or a restore that failed and left its input behind — is excluded from the file walk, including when the live library is empty. Otherwise the ZIP would carry two entries of one name and an extractor would keep the first, silently making the leftover file the restored library. The serialized entry is written even for a project with no media, so "this project has no media" is stated rather than inferred.

The library is read before the response starts streaming: once the ZIP is being written the only thing left to send is a truncated archive that looks complete, so a metadata read failure answers with an error instead of a backup missing its library. It is not a snapshot of the whole application database or other projects.

## Import an editable-project backup

1. Validate upload size, ZIP safety, nonempty archive, one media-metadata entry, manifest shape, restorable languages, and installed theme availability.
2. Allocate a new project name/folder/UUID and extract into a temporary directory.
3. Recover theme version from the manifest or copied theme metadata.
4. Validate content JSON, media paths and translations, and collection item slugs before creating the destination directory.
5. Copy source files into the destination, excluding the export manifest; insert the project row after successful copying.
6. Restore media metadata into SQLite with new media file IDs, then remove the intermediate media JSON.
7. Refresh usage and remove the temporary extraction directory.

**ZIP safety.** Import and theme upload unpack through [zipSafety](../../../packages/builder-server/src/utils/zipSafety.js): each entry is streamed to disk and the archive is refused (400) once the bytes it actually produces pass 100 times its size, whatever sizes it records; entry names must be plain paths, no file may appear twice (case-insensitively), and entry length/CRC must match. The manifest is read through the same budget, capped at 16 MB. A file that is not a readable ZIP is a 400. Top-level dot entries (a theme update's working folders) are left out of the import.

**Content a backup made by the app never holds** refuses the whole backup with a 400 naming the problem: a media path that is not one file directly in an upload folder, media text for the default language or one the project lacks, a collection item slug that is not a plain slug, a theme or preset that is not a single folder name, or a project detail of the wrong kind. Markup is stripped from the name, title and notes as on the create form. Legacy `audios`/`videos` upload folders and an older unchecked Site Address are still accepted ([backupContentChecks](../../../packages/builder-server/src/utils/backupContentChecks.js)).

**A newer backup format** refuses the import before anything else in the manifest is read: `backupFormatProblem` compares the manifest's `formatVersion` with `BACKUP_FORMAT_VERSION` in `projectController.js`, the same constant export writes. Newer, including a minor step, is refused with "made by a newer version of Widgetizer … Update Widgetizer to import it"; a value that is not a `major.minor` string (an explicit `null` included) is refused as a changed backup; an absent field, as in older exports, is accepted.

**Unreadable content JSON** refuses the whole backup with a 400 naming the damaged file, before creating a project directory or database row. `contentFilesProblem` checks every JSON file under `pages/` (including global widgets), `menus/` and `collections/` (including ordering files), across all language folders, plus root `theme.json`. It uses `JSON.parse` on UTF-8 text, as the app's content readers do: unlike `fs.readJson`, it does not strip a byte-order mark and accept a file that would fail when opened later. Only syntax errors become this refusal; operational I/O errors propagate through the import failure handler. Existing projects, media and the active-project selection stay unchanged on refusal. This is syntax validation, not a complete content-schema or reference check; it does not scan uploaded JSON assets or unrelated theme implementation files.

Unlike project duplication, this path does **not** run the content-UUID remapper: page/item/menu identities in the backup remain project-scoped. Both paths regenerate media database IDs. Both preserve translation membership and translated metadata.

**A backup this version cannot fully restore is refused before anything exists.** Language metadata is validated before a name, folder or row is allocated, and a code this version cannot work with produces a 400 naming it and stating that nothing changed and the backup file is untouched. Importing anyway would put the backup's other-language pages, menus and items on disk with nothing listing them — a restore that silently returns part of a website. A backup naming no languages at all predates them and imports on the single-language defaults.

**Two entries named `uploads/media.json`** — the shape older backups can have — is refused too. They describe different libraries and nothing in the archive says which is current, so neither is chosen.

**A media library that cannot be read, is not a library, or cannot be written fails the import.** A `files` that is absent or not a list is refused rather than read as empty, because a project with no media and a file this version cannot interpret are different claims. An empty list is a supported library and restores as one. The intermediate media JSON is removed only after a successful restore: it is the restore's input, and deleting it after a failure would turn a recoverable state into a silent loss.

Failure: the inner failure handler attempts to delete the new row and directories; cleanup failures are logged and can leave remnants. The server's own copy of the uploaded ZIP is removed on every exit, successful or not; the user's backup file is never touched.

Verified against one bilingual fixture through both workflows, plus the refusal cases above. That fixture is broad rather than exhaustive — it is not an audit of every way a backup can be malformed, and a successful restore of it does not prove every archive shape is handled.

Evidence: [projectController](../../../packages/builder-server/src/controllers/projectController.js) `exportProject` / `importProject`, [projects tests](../../../packages/builder-server/src/tests/projects.test.js), [backupCloneCompleteness](../../../packages/builder-server/src/tests/backupCloneCompleteness.test.js), [backupImportChecks](../../../packages/builder-server/src/tests/backupImportChecks.test.js), [media rewrite tests](../../../packages/builder-server/src/tests/media.test.js).

## Delete a project

Under the per-project export lock, attempt generated-export cleanup, delete the project row with cascaded metadata, and reassign the active project in one database transaction. Then remove the project directory. All language content belongs to that directory; shared-within-project media is deleted with the project. The theme library source is not owned by this project.

Export cleanup can warn and proceed. Directory removal occurs after row deletion, so a filesystem failure (a file locked by another program, on Windows) can leave files without a project row. The deletion still succeeds: the response names the folder as `folderLeftBehind`, and the Projects screen shows a warning with its path that stays until dismissed. Nothing removes the leftover automatically. Create, import, duplicate and folder rename all treat a folder that exists on disk as taken, so a leftover folder is never reused or merged into.

Changing a project's folder name copies the folder, points the project row at the copy, then removes the old folder. A failed copy or row update attempts to remove only the copy and leaves the project in its old folder; an old folder that cannot be fully removed is reported (`folderLeftBehind`) and the project keeps its complete new folder.

Evidence: [projectService](../../../packages/builder-server/src/services/projectService.js), [projectRepository](../../../packages/builder-server/src/db/repositories/projectRepository.js), [exportController](../../../packages/builder-server/src/controllers/exportController.js), [projects](../../../packages/builder-server/src/tests/projects.test.js) and [export](../../../packages/builder-server/src/tests/export.test.js) tests.
