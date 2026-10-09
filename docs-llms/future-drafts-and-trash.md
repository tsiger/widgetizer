# Drafts and trash — early concept

**Notes started 21 September 2026. Direction agreed for discussion: not implemented, scheduled, or a finished design.** Requirements below describe intended behaviour, not capabilities the app already has.

## The idea

Let owners keep unfinished content, temporarily remove content from their website, and recover pages or collection items deleted by mistake.

These are two related features: a simple publishing choice and a separate place for content awaiting deletion.

## Direction agreed so far

Pages and collection items have exactly two publishing states:

- **Draft:** kept in the project for editing and preview, excluded from the exported website. This covers both content that has never been published and content temporarily taken off the website.
- **Published:** included in the exported website, subject to the normal requirements for a valid export.

There is no separate “unpublished” state. To temporarily remove a published page or item, move it to drafts. Publish it again when it is ready to return.

**Trash is a separate place, not a third publishing state.** Moving something to trash removes it from normal editing and publishing while keeping it recoverable until permanently deleted.

For OSS, the publishing choice controls export inclusion. Delivering changes to an online website belongs to the hosting application and is outside this concept.

## Drafts and everyday editing

An owner can save an unfinished page, return to it later, and preview how it looks without including it in the website. The same applies to an article or any other collection item.

Moving between Draft and Published preserves the content, settings, images, chosen address and relationships with other content. Temporarily hiding a page should not mean rebuilding it later.

The page and collection lists should make the state easy to see and let owners find their drafts. The exact controls and screen layout remain open.

This first concept does not include separate draft revisions of published content. There is one editable version. Editing a published page and saving it changes what the next export will contain. To keep the whole page out of that export, move it to drafts.

## What appears on the website

Drafts and trashed content must be excluded consistently, not just omitted as individual pages.

- Collection lists must show only published items, including collections whose items appear in widgets without having their own pages.
- Item counts and numbered listing pages must reflect the published items.
- Menus, buttons, breadcrumbs and language switches must not send visitors to excluded pages or items.
- Information generated for search engines must describe only the included content.
- Forms found only on excluded pages must not become part of the exported website.

Editing previews should still let owners inspect drafts. A preview must not quietly change something to Published.

## Links and relationships

Temporary removal must be different from permanent deletion. Moving a page to drafts should not erase all the saved links pointing to it, since the owner may publish it again later.

The project should preserve those choices while the exported website avoids broken destinations. We still need to decide how each affected part appears: a menu entry might be hidden, while a button or a link inside a paragraph may need different treatment. Owners should be able to understand what is affected.

This includes links from other pages, shared headers and footers, collection items and every language. Future shared widget areas must follow the same rules.

Page parents and collection listing relationships also need attention. Removing a parent or a collection's main listing page must not produce broken navigation or silently delete the relationship needed when it returns.

## Move to trash

Trash is for content the owner intends to remove, with a chance to recover from mistakes. It is not the place for unfinished work or seasonal pages; drafts serve those purposes.

The intended actions are simple:

- **Move to trash:** set a page or collection item aside without permanently deleting it.
- **Restore:** bring it back with its content and settings intact.
- **Delete permanently:** remove it for good, with a clear confirmation.

Trashed content stays out of exports and normal content lists. The trash view should make it easy to identify what was removed and recover the right item.

We have not decided whether restoration returns content to its previous publishing state or always restores it as a draft. We also need a clear rule for restoring something whose old address is now used by another page or item. Restoration must never overwrite newer content.

Automatic emptying of trash is not agreed. Any retention period or “Empty trash” action needs a separate decision.

## Languages

Each language version should have its own publishing choice. An English page can be Published while its Greek version is still a Draft.

Moving one version to drafts or trash should not remove the other versions. Preserve their relationship so a restored or republished translation can rejoin the website's language navigation.

Homepages need special rules: a website requires a homepage, and an additional language may have no publishable homepage after one is moved to drafts or trash. The effect on that language and the export must be settled before implementation, with a clear explanation to the owner.

## Storage and project operations

Drafts and trash still occupy project space. Excluding content from an export does not free the space it uses inside the project.

The OSS version is reused intact by the online version, where storage allowances vary by plan. Trash must not be presented as a way to reclaim space; permanent deletion and deliberate media cleanup are separate actions.

Images needed by drafts or trashed content must remain available for editing and restoration. They cannot be treated as disposable merely because no published page uses them. Permanently deleting a page must not remove an image still needed elsewhere.

Project copies and backups should preserve publishing choices, drafts, trash and the content needed to restore it. Theme updates must not reset those choices or empty the trash.

Moving content, restoring it or deleting it must not lose unsaved edits or allow another open editor to accidentally recreate permanently deleted content. Detailed behaviour remains part of the later design.

## Decisions still open

- Should newly created pages and items start as Draft? What about duplicates and new translations?
- Existing projects should keep their current export behaviour when this feature arrives. How should that transition be presented?
- Should restoring from trash preserve the previous publishing state or return everything as Draft?
- Should drafts and trashed content reserve their addresses, and how should restoration handle conflicts?
- How should each kind of link behave when its destination is temporarily excluded?
- What restrictions or explanations are needed for homepages and main collection listing pages?
- Should trash ever empty automatically, or remain entirely under the owner's control?

## Outside this first concept

Separate draft revisions of live pages, scheduled publishing, review and approval workflows, and a history of every revision are not part of this proposal. Trash initially covers pages and collection items, not whole projects or a general media recycle bin.

The aim is straightforward: keep unfinished work safely, take content off the website without losing it, and make accidental deletion recoverable.
