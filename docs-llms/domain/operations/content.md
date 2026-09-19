# Pages, menus, and collection items

[Map](../README.md) · [Operations](README.md) · [Coverage](../coverage.md#content-and-editing)

## Plain-language guide

### Working with pages

The page list shows the pages you can open, with language information where relevant. Filtering the list or choosing a language tab only changes what you are looking at.

| Action | What changes |
| --- | --- |
| Create | Adds a saved page ready to build with widgets. |
| Edit page details | Changes its name, address or search/sharing information when you save the form. |
| Build the page | Add, edit and arrange widgets in the page editor, then save or let autosave keep the changes. |
| Rename its address | Changes where the next generated website will place it. Supported app-selected links can follow the change; manually typed addresses and external bookmarks may need attention. |
| Duplicate | Makes an independent copy. A copied collection listing does not automatically take over as the main listing. |
| Delete | Removes this page version, leaving its shared resources and other-language versions. |
| Delete several | Attempts each selected deletion; the result can include both removed pages and failures. |

Choosing a breadcrumb parent describes a navigation relationship. It does not make the parent own the child page. A listing that is split into multiple pages generates those extra pages during export.

### Working with menus

Create a menu, add choices, write their labels and choose their destinations. Reorder or nest choices to change the navigation arrangement. Save the menu to keep that tree.

Renaming the menu changes its editor name; it does not rename all of its destination pages. Duplicate makes an independent navigation tree. Delete removes the menu, while its destination pages remain.

Editing one menu changes every place using that particular menu. A language's copied menu is independent of the original, so labels and destinations must be maintained separately.

### Working with collection entries

Choose a collection, then create or open an entry. Fill in the theme's fields and save. Required fields need values. Change an entry's address where individual entry pages are supported.

Duplicate starts an unrelated entry from the current saved content; Create language version starts a related translation. Reordering matters for manually ordered lists; automatically sorted lists follow their own ordering rule.

Delete removes entries from the collection, while their uploaded images remain in the library. “Discard archived settings” removes values for old fields no longer offered by the theme. It does not archive the article or make it temporarily invisible.

### When are changes kept?

Page-editor changes use Save/autosave. Menu, page-details and collection-entry forms have their own save flow. Create, duplicate, delete, reorder requests and explicit old-field removal are saved when their operation succeeds.

None of these actions rewrites an old website export or directly changes files already hosted elsewhere. Build and deploy a new export when the saved content is ready.

### If something cannot be completed

A conflicting address, missing required value, unavailable language or deleted target can prevent a change. Operations touching several pieces of content can partially finish. Read the result before retrying, particularly after deleting several items.

### Example

Rename a Greek article, then edit the Greek menu to feature it. The related English article remains independently editable, and an old downloaded website archive still contains the earlier saved version.

## Technical details

## Pages

All single-document operations resolve the requested language, defaulting to the project default. Listing enumerates configured languages and attaches language context; a slug alone is not a globally unique page key.

| Action | Content/identity effects | Relationship and failure effects |
| --- | --- | --- |
| Create | New UUID/group; unique slug; starts with empty widgets | Store version-specific SEO and initialize usage |
| Read/list | Read page JSON and expose language | Missing single page is 404; globals are not ordinary pages |
| Edit details | Preserve UUID, creation date, group; sanitize SEO; optional rename | Preserve widgets when omitted; validate slug conflict; reject direct self-parent |
| Save editor content | Persist widget map/order/settings and page metadata | Enforce widget count and pagination; update usage; may move another page's listing anchor |
| Rename | Write new filename, preserve stable identity, then remove old file | UUID-backed links follow current slug; old-file removal is best effort |
| Duplicate | New UUID/group and unique copy name/slug; copy content | Clear listing/pagination flags; retain referenced shared media and add usage |
| Delete | Remove this version | Clear usage and attempt reference cleanup; leave siblings/assets intact |
| Bulk delete | Process IDs in selected language and collect outcomes | Supports partial success; inspect actual successful deletions and cleanup behavior |
| Claim listing/pagination | Validate widget schema/page size; save claim | Clear competing anchors/pagination within the same language; report moved anchors |

The metadata update and editor-content save are distinct handlers with overlapping rules. Do not assume validation equivalence: [R4](../review-questions.md#r4-shared-write-rules-without-forcing-one-workflow).

Implementation: [pageController](../../../packages/builder-server/src/controllers/pageController.js), [linkEnrichment](../../../packages/builder-server/src/utils/linkEnrichment.js). Tests: [pages](../../../packages/builder-server/src/tests/pages.test.js), [paginationExport](../../../packages/builder-server/src/tests/paginationExport.test.js).

## Menus

| Action | Current behavior |
| --- | --- |
| List/read | Enumerate language menus; list may backfill a missing legacy UUID, so it is not strictly write-free |
| Create | Unique ID from name, fresh UUID, empty tree in selected language |
| Rename/edit | Keep ID/UUID; validate/sanitize name, labels, links; write tree |
| Add/remove/reorder/nest item | Edit nested `items` and save the menu; bounds apply to the full tree |
| Duplicate | New menu ID/UUID and item IDs; copy name and nested content in the same language |
| Delete | Delete selected-language menu file; linked pages/items remain |

Menu render resolution handles absent targets separately from persisted cleanup, and still does: a selection that has not been cleared yet renders as an empty menu rather than the wrong one. Deleting a menu now also clears the selections that pointed at it — see the policy below.

Implementation: [menuController](../../../packages/builder-server/src/controllers/menuController.js), [menuResolver](../../../packages/render-engine/src/menuResolver.js). Tests: [menus](../../../packages/builder-server/src/tests/menus.test.js), [MenusLanguages](../../../packages/editor-ui/src/pages/__tests__/MenusLanguages.test.jsx).

## Collections

**Before writes:** collection schema must exist; route identifiers must be safe; requested language must be enabled. Required field validation and reserved slug rules apply when building item data. Limits must be assessed per relevant creation path, not inferred from ordinary create alone.

| Action | Current behavior |
| --- | --- |
| Read schemas | Load/validate theme-provided definitions; not user item creation |
| List/read | Normalize data with schema defaults, validation status and archived values; sort per schema/manual order |
| Create | New UUID/group; validate fields; write item; update media usage |
| Update/rename | Preserve identity/group/creation date; keep omitted existing and archived values; update order on rename |
| Duplicate | Fresh UUID/group, unique copy slug/title; place after source in manual order when source is listed |
| Reorder | Write that type/language's `_order.json`, pruning nonexistent slugs |
| Discard archived settings | Remove only fields no longer in current schema; keep identity/timestamps; resync usage |
| Delete | Remove file, prune ordering, remove usage, clear references to the deleted item |
| Bulk delete | Report deleted/not-found/errors; update order and cleanup for deleted targets |
| Create version | Copy into another language, same group, new UUID, separate order; see [language operations](languages.md) |

Storage writes, order changes, usage changes, and reference cleanup are separate steps. A later failure can follow a successful content write. Item rename recovery deduplicates same-UUID siblings; page rename has a different recovery path.

Saved changes feed listings in the item's own language, including that language's ordering and pagination count. Missing versions are not filled from default-language entries. Export includes the items only when their language is included and validates all included languages before writing output. See [collection rendering](../entities/collection.md#listings-and-multilingual-output).

Implementation: [collectionController](../../../packages/builder-server/src/controllers/collectionController.js), [collectionService](../../../packages/builder-server/src/services/collectionService.js). Tests: [collectionApi](../../../packages/builder-server/src/tests/collectionApi.test.js), [collectionService](../../../packages/builder-server/src/tests/collectionService.test.js), [collectionMediaUsage](../../../packages/builder-server/src/tests/collectionMediaUsage.test.js).

## One policy for references to deleted content

Deleting a page, a collection item, a menu, or a whole language all follow the same rule, because the loss is the same either way and the route to it should not change the outcome.

**What is cleared.** Explicit references to Widgetizer-managed content: `pageUuid` and `collectionItemUuid` on link settings and menu items, the matching `data-…-uuid` attributes inside richtext, `parentPageUuid`, and a `menu` setting holding a deleted menu's uuid. Across every surviving language, the default one included.

**What is kept.** The destination goes; the content around it does not. A link keeps its text and target and loses only its href and reference, a menu item keeps its label, and richtext keeps the words while losing the anchor around them. Nothing is substituted — no nearest page, no other menu, no guessing at what was meant.

**Hand-typed URLs are never rewritten.** They are not references to managed content, so they are left exactly as written even when they happen to point at the address of a page that was just deleted. The author wrote it and it is theirs to change.

**Only confirmed deletions.** References are cleared against what the operation actually deleted, never what it set out to delete. A partial bulk delete, or a language removal that failed partway, clears only the targets that went. This is the one case where keeping a reference is right: the target may still be there and the operation is retryable.

Why clear at all, rather than leave the reference in case the target returns? Because it cannot. Re-adding a language does not restore its pages, and new content gets new uuids — a reference to deleted content is permanently dead rather than temporarily unresolvable. Rendering already degrades gracefully (a missing target resolves to no link), so this is about the editor, where a stored reference would otherwise keep showing a selection that can never work again.

### When the sweep cannot finish

The content is deleted either way, so an incomplete sweep is reported as a **warning on a successful deletion**, never as a failure. Calling a completed deletion a failure would push someone to retry something already done.

The sweep continues past a file it cannot write or a folder it cannot list, cleans everything else it can reach, and returns what it missed. Each delete endpoint turns that into a `REFERENCE_CLEANUP_INCOMPLETE` warning carrying a count and the storage keys. The keys are for logs: the message a person reads names pages and menus, never a path.

A collection folder that cannot be listed is reported the same way. Skipping it silently made an unreadable collection indistinguishable from a project that has none.

Nothing repairs this automatically. The remaining references render as dead destinations and are fixed by editing the content that holds them; automatic repair is not part of this behaviour.

Implementation: [linkEnrichment](../../../packages/builder-server/src/utils/linkEnrichment.js). Tests: [deletedReferenceCleanup](../../../packages/builder-server/src/tests/deletedReferenceCleanup.test.js).
