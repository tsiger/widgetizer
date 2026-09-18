# Operation directory

[Domain map](../README.md) · [Coverage](../coverage.md) · [API inventory](api-index.md)

Choose the user action, then follow its effects on content, references, media usage, language, and derived output. Read/list operations are included so implicit writes and fallback behavior remain visible.

## Read a workflow without code

Each walkthrough begins with a plain-language guide. It tells you what you start with, what the app does, what you end up with, and what can happen if the operation does not finish. The implementation notes are below **Technical details** on the same page.

| Your question | Guide |
| --- | --- |
| What happens when I start, copy, back up, import or delete a website? | [Project lifecycle](projects.md#plain-language-guide) |
| How do I add a language, create translations or remove one? | [Language lifecycle](languages.md#plain-language-guide) |
| What happens when I create, rename or delete a page, menu or article? | [Content operations](content.md#plain-language-guide) |
| What do editing, autosave, undo and leaving the page actually do? | [Editing and saving](editing.md#plain-language-guide) |
| When is a file used, and when can I delete it? | [Media lifecycle](media.md#plain-language-guide) |
| What changes when I alter the design or update a theme? | [Theme lifecycle](themes.md#plain-language-guide) |
| What is the difference between previewing, exporting and backing up? | [Website output](output.md#plain-language-guide) |

## Detailed operation directory

| Area | Operations | Walkthrough |
| --- | --- | --- |
| Projects | List/get active, create from theme/preset, edit identity/settings/folder, activate/switch, duplicate, backup ZIP, import ZIP, delete | [Projects](projects.md) |
| Languages | Add, summarize removal, remove, change sole default code, create page/item version, inspect translation group, navigate versions | [Languages](languages.md) |
| Pages | List/read, create, edit metadata/slug/SEO/parent, save content, duplicate, delete/bulk delete, assign listing anchor/pagination | [Content](content.md#pages) |
| Widgets | Add, select, edit, reorder, duplicate, copy/paste, remove | [Editing](editing.md#widget-and-block-edits) |
| Blocks | Add, select, edit, reorder, duplicate, remove; enforce schema limits | [Editing](editing.md#widget-and-block-edits) |
| Globals | Load/edit/save header or footer in a language | [Editing](editing.md#save-and-autosave) |
| Settings | Edit values, choose media/menu/link targets, save shared theme settings | [Editing](editing.md), [media](media.md), [themes](themes.md) |
| Menus | List/read, create, rename/edit tree, reorder/nest nodes, duplicate, delete | [Content](content.md#menus) |
| Collections | Read schemas, list/read items, create, edit/rename, duplicate, delete/bulk delete, reorder, discard archived values | [Content](content.md#collections) |
| Media | List/filter/select, upload/process, edit base/translated metadata, inspect usage, refresh usage, delete/bulk delete, serve/download/range reads | [Media](media.md) |
| Themes | Browse/read versions/widgets/templates/presets, upload/delete library theme, rebuild latest snapshot, check/apply project update, toggle updates, load locales/icons | [Themes](themes.md) |
| Preview | Render page, render widget, create page/item token, open/navigate standalone preview, serve token/assets | [Output](output.md#preview) |
| Static export | Validate/build, inspect history/files, view, download ZIP, delete version, prune retained versions | [Output](output.md#static-site-export) |
| Editor session | Undo/redo, autosave/manual save, leave/stay prompt for unsaved changes, project reset, stale-project recovery, language navigation | [Editing](editing.md#navigation-and-session-changes) |
| Application | Read/update app settings, change UI locale | [Editing](editing.md#application-settings) |

Not separate content operations: filtering a list, hovering a widget, and opening a drawer only change session state. Form widgets are widget/block content; generated forms metadata is part of export. This repository's listed built-in routes do not define a persistent form-submission domain. Extension-provided operations must be mapped when such an extension is in scope.

## A consistent review checklist

For each action, check:

1. **Before:** valid project/scope, language enabled, source/definition exists, identity and limits valid.
2. **Change:** which documents/rows/assets change; which UUIDs, slugs, groups and order entries are retained or replaced.
3. **Relationships:** references, media usage, translation siblings, menu targets, parent links and listing anchors.
4. **After:** response, cache/dirty-state changes, preview/export consequences.
5. **Failure:** rejection before mutation, partial writes, retry/compensation, concurrent calls, stale project or language.

This directory inventories the supported workflow families. [API inventory](api-index.md) enumerates the current literal built-in routes as a cross-check; it is not a claim that every error combination has been audited.
