# Project

[Map](../README.md) · [Project operations](../operations/projects.md) · [Coverage](../coverage.md)

## Plain-language guide

### What is a project?

A project is one website you are building in Widgetizer. It brings together its pages, language versions, menus, collection entries, images and files, design settings, and website exports.

**Widgetizer → Your business website → Pages, shared content and media**

Two projects are separate websites. Copying one gives you another website to work on independently.

### What information belongs to it?

The project has a name for finding it in the app and website details such as its title, address, business information and logo. It also records the chosen theme and the website's languages.

Website details are shared across its languages. Individual page text, menus and shared headers/footers can differ by language.

### What can you do?

| Action | What happens |
| --- | --- |
| Create | Starts a website from a theme and optional preset, with one default language. |
| Open or switch | Makes it the website you are currently working on. |
| Edit details | Changes project or shared website information; changing the website address does not purchase or configure a domain. |
| Duplicate | Makes an independent editable copy, including its languages and uploaded media. |
| Back up | Downloads the editable project in an archive for later import. |
| Import | Creates a new project from a compatible backup; it does not overwrite the existing project of the same name. |
| Delete | Removes the project's editable content, media and locally managed export history/files. |

A project backup is different from the website files generated for visitors. See [the output guide](output.md) before choosing which one to download.

### When do changes reach visitors?

Saving keeps your work in Widgetizer. Exporting builds website files from saved work. A website already uploaded elsewhere changes when you replace its deployed files; saving, renaming or deleting a local project does not itself manage that external website.

### Example

Create a website for a café, add English and Greek content, and upload its photographs once. Later, duplicate the project to explore a redesign. Editing the redesign does not change the original project.

## Technical details

A project is the ownership boundary for one website. It owns content in every site language, the installed theme copy, shared settings and media, and export history.

## Identity and storage

| Part | Meaning |
| --- | --- |
| `id` | Stable project UUID; database ownership and request scope |
| `folderName` | Filesystem location, separate from display name and UUID; can be changed through project editing |
| `name` | Human-facing project name |
| SQLite project row | Theme/version/preset, site title/URL, Clean URLs, site identity, language configuration, timestamps, update preferences |
| Project content directory | Pages, globals, menus, collection items, installed theme files, uploaded binaries |

`defaultLanguage` names the content at the root of the content directories. `languages` lists additional codes. Changing the sole default language relabels that root content; it does not translate it. Additional languages are managed through dedicated operations that seed or remove their content.

## Relationships and rules

- Pages, menu trees, globals, and collection items belong to this project. Their references must resolve inside its scope.
- `siteIdentity` is shared project metadata, including business/person details and a media-backed logo reference. Its logo participates in media usage tracking.
- Theme settings and the media library are shared across languages.
- The active project is an application-level selection pointing to a project, not another copy of its data.
- A project duplication creates a new ownership boundary. Its content identities are remapped; import uses a different restoration path. See [the comparison](../operations/projects.md#duplicate-a-project).
- Deletion removes the project row and related metadata, attempts export cleanup, reassigns the active project, and removes its directory. These span database and filesystem boundaries.

## Evidence and review

Implementation: [projectController](../../../packages/builder-server/src/controllers/projectController.js) (`createProject`, `updateProject`, `duplicateProject`, `importProject`), [projectRepository](../../../packages/builder-server/src/db/repositories/projectRepository.js), [projectService](../../../packages/builder-server/src/services/projectService.js), [siteIdentity](../../../packages/core/src/utils/siteIdentity.js).

Tests: [projects](../../../packages/builder-server/src/tests/projects.test.js), [media usage](../../../packages/builder-server/src/tests/mediaUsage.test.js), [project switch coordinator](../../../app/src/lib/__tests__/projectSwitchCoordinator.test.js).

Review: creation, duplication, import, rename, and deletion have different compensation and warning behavior. Do not infer transaction-wide rollback from an individual atomic file write or SQLite transaction.
