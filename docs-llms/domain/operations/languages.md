# Language lifecycle and versions

[Map](../README.md) · [Rules](../multilingual.md) · [Coverage](../coverage.md#language-and-translation)

## Plain-language guide

### Adding a language

**You begin with:** an existing project, perhaps written in English.

**You choose:** another supported website language, such as Greek.

**Widgetizer prepares:** Greek copies of the starting menus, header and footer. Their contents initially match the default language. It does not create Greek copies of every page or collection entry.

**You end with:** a place to author Greek content. Copied menu labels still need translation, and their destinations still need checking because they initially refer to the original pages.

### Creating or opening a version

On a page or collection entry, choose the target language. If its related version already exists, open that version. Otherwise create one from the saved source content.

The new version begins as a copy, not machine-translated text. Translate it, adjust the layout or fields, choose its address, then save. Later changes in English do not automatically alter Greek, and vice versa.

A normal Duplicate action makes a separate page or entry. Use Create language version when the two should be recognized as versions of the same thing. Save source edits first so that the new version starts from the content you intend to copy.

### Removing a language

Before removal, the app can tell you how many pages, collection entries and menus it contains. Removing it deletes that language's authored content, header/footer, menus and translated image descriptions.

Other languages remain. Shared uploaded photographs and documents remain too, even when the removed language used them. Re-adding the language starts its setup again; it does not recover its deleted translations.

If removal stops partway through, some content may already be gone. The language remains listed so cleanup can be retried. This is different from hiding a language tab.

If someone is editing that language in another window when you remove it, their unsaved work is neither lost nor silently saved. Their editor stops trying to save, keeps everything on screen, and shows a notice naming the language — it does not cover the page, so they can still read and copy what they want to keep. Leaving the page discards those unsaved changes; nothing keeps them automatically. Adding the language back does not restore the pages that were deleted with it.

### Changing the default language

While the project has only one language, you can change its default language designation. This says which language the existing content is written in; it does not translate the words. Once other languages have been added, that change is restricted.

### What about visitors switching languages?

Editor language controls select content for you to edit. A visitor-facing language selector is supplied by the theme. The current rendering support can point to a related version, or to that language's homepage when the specific version is missing. A language without a homepage is left out of that selector's available destinations.

That fallback does not create or translate a missing page, and it does not silently retarget every ordinary link on the site. The Arch header's visible selector is still pending at this baseline; the rendering support alone does not add a control to the theme.

### Including the language in an export

Create and save its homepage. An additional enabled language without one is skipped entirely, and the export result names it. The default language's missing homepage stops the export. Once included, the language contributes its own pages, collection entries and shared sections. A Greek news list with no Greek entries stays empty even when English has articles. See [output rules](output.md#which-languages-are-included).

### Example

Add Greek, create Greek Home and About, and translate the Greek menu. Leave your news articles English-only for now. The project can contain that uneven mix without forcing you to translate every entry immediately.

## Technical details

## Add a language

**Before:** supported normalized code, not the default or already enabled, no clash with a root page slug or public collection URL prefix.

Inside a per-project language-operation queue, read fresh project metadata; copy default-language menus with new menu UUIDs; copy globals and rewrite schema-declared menu selections to those copies; create global media-usage rows; finally record the new additional language in the project row. Copied menu items retain their original page/item targets. No pages or collection items are copied.

If seeding fails, the language is not recorded as enabled. Files may already have been written; retry behavior matters. Tests include a half-finished seed converging on retry and concurrent add requests retaining both languages.

## Create a language version

**Before:** enabled target language different from the source; source exists with a stable identity; group has no member in the target language. Collection-item version creation also checks the collection's item limit across languages.

Within the translation-operation queue: read the source, check group occupancy, allocate a unique target slug, copy content with a new UUID and the same effective group ID, write into the target folder, then update usage. Item versions also enter the target language's manual ordering. The source document is not rewritten. Page listing/pagination flags are kept when copying to another language.

The content is copied as a starting point; no automatic text translation or ongoing synchronization occurs. Inherited explicit references remain references to the copied targets. Editing sibling pages can change their structures independently.

Repeated or concurrent attempts to create the same group's target version produce a conflict rather than two members. Missing/unknown/same-language requests are rejected. Unreadable possible group members prevent a safe occupancy decision and cause failure.

## Read a group and navigate versions

Group lookup scans configured language contexts and returns matching page/item members with language, UUID, slug and display name. UI chips and language menus use this relationship. Opening a sibling does not mean “change this page's language”; it navigates to a different document. Unsaved changes must go through the editor's navigation guard.

## Remove a language

The summary counts pages, items and menus first so the UI can describe the deletion. Default and unknown languages cannot be removed through this path.

1. Queue against other language add/remove operations and reread the project.
2. Enumerate collection items, order files, pages, globals, and menus in the language. Read page/item identities before deletion; unreadable identities abort before changes.
3. Clear each item/page/global usage source and delete its content; remove collection order files and menus.
4. Delete that language's media metadata overrides. Leave shared binaries and base metadata intact.
5. Record the remaining language list only after removal succeeds.

On partial failure, the service attempts to rebuild usage for surviving files, keeps the language listed, and allows retry. Already deleted content is not restored: this is retryable cleanup, not rollback. Sibling translation-group membership survives.

### Coordination with content writes

Removal deletes content and then rewrites the project row, while an ordinary write validates its language against the row the middleware loaded when its request arrived. A request that validated first and wrote second therefore used to recreate a page, menu or item in a language the site no longer had — invisible to the editor and to export, which read the row, but visible to the media usage rebuild, which scans the folders on disk, where it could hold an image hostage: undeletable, blamed on content nobody could reach.

Two mechanisms close this, and both are needed:

- Removal, addition and every language-addressed write take the same per-project [content-write section](media.md#delete-or-bulk-delete), so they cannot interleave. Language operations take it *inside* their own serializer — the content section is always innermost, which is what keeps four per-project locks from deadlocking.
- Inside that section, each write re-reads the project row and refuses with `LANGUAGE_REMOVED` if its language has gone. Ordering alone is not enough: a write that *waited* for the section validated against the world as it was before waiting.

**A section has to span every write the request makes, not just its main one.** A page save also sweeps the listing anchor off other pages; while that sweep sat outside the section, a removal could land between the two and the sweep wrote a page straight back into the deleted language. The lock is therefore taken at the controller edge and the write helpers below it run unlocked (`persistPageInSection`), rather than each helper taking it for itself.

**Check and write must be the same section, not two steps.** The menu listing lazily back-fills a missing uuid, which is a write on a read path. Checking the language and then writing is not a check: a removal landing in the gap deleted the menu and the write restored it. That backfill now does both inside one section, and its check is the non-throwing `isLanguageStillEnabled` — an obsolete backfill is skipped, and the listing still answers rather than failing over content the reader did not ask about.

Covered writes: page content and details save, page create/duplicate/delete, page language version, global widget save, menu create/update/duplicate, collection item create/update/duplicate/discard-archived/delete/bulk-delete/reorder, and collection item language version. Deletes are included because pruning a collection's order file is itself a write. The refusal writes nothing.

Not covered: link enrichment and the structural flows (project create, duplicate, import, theme update), which copy content that already exists.

### Both orderings, and what the editor does about them

A request can be refused at either of two points, and both answer with the same `LANGUAGE_REMOVED` code so the editor behaves identically:

| Ordering | Where it is caught | Status |
| --- | --- | --- |
| The request arrived **before** the removal and writes after it | the re-read inside the content-write section | `409` |
| The request arrived **after** the removal, so its project row is already correct | `requestLanguage`, at the request boundary | `400` |

The second is the common one. It used to answer a bare 400 with no machine-readable code, so the editor could not tell it from an ordinary failure: no explanation, and autosave kept retrying. A *malformed* language code still answers a plain 400 with no code — a typo is a client error, not a language that went away.

On either, the editor:

- **keeps every edit.** Nothing was written, and no dirty state is cleared. The work is still on screen.
- **stops saving, and stays stopped.** Stopping the timer once is not enough, because the autosave tick reschedules itself and every edit re-arms it. Saving is suspended for the rest of the editing session, and lifts when the editor loads a page or the session is discarded.
- **explains, without blocking.** A banner, not an overlay: the draft cannot be saved anywhere and reloading discards it, so the editor underneath is the only place it still exists and covering it would make the one available recovery impossible. The banner names the language the way a person would ("Greek", not `el`) and labels its exit for what it does — *Discard changes and return to Pages*.
- **clears the banner when that session ends**, together with the suspension, so a page that saves perfectly well never inherits the warning. A project-mismatch warning is deliberately left alone: that one is about the tab, not the session.

**What recovery does and does not mean.** The draft is reachable, not rescued: someone who wants to keep it copies it out before leaving. Nothing preserves it automatically, and the banner does not pretend otherwise — earlier wording suggested re-adding the language and reloading, which is wrong twice over, since reloading discards the draft and re-adding a language does not bring back the pages deleted with it. Automatic draft recovery (stashing it locally and offering it back, or exporting it) is a possible future improvement, not part of this behaviour.

### Reference cleanup

The language-removal service is distinct from individual page/item deletion and does not call their reference-scrubbing helpers. Whether surviving content should be rewritten or rely on missing-target rendering needs an explicit [review](../review-questions.md#r2-one-deletion-policy-for-references).

## Change the sole default language

Use project editing while `languages` is empty. Root paths stay the same and their interpreted language changes. This does not translate authored text. Review metadata-override behavior if an imported project carries overrides for codes outside its enabled list.

Implementation: [languageController](../../../packages/builder-server/src/controllers/languageController.js), [languageService](../../../packages/builder-server/src/services/languageService.js), [translationService](../../../packages/builder-server/src/services/translationService.js), [pageController](../../../packages/builder-server/src/controllers/pageController.js), [collectionController](../../../packages/builder-server/src/controllers/collectionController.js), [projectController](../../../packages/builder-server/src/controllers/projectController.js).

Test evidence: [languageService](../../../packages/builder-server/src/tests/languageService.test.js) and [translationGroups](../../../packages/builder-server/src/tests/translationGroups.test.js). Inspected assertions include untouched source files, new target identities, per-language conflicts, deleting a group member, survivor usage after failed removal, and shared binaries remaining. UI suites are listed in [coverage](../coverage.md).
