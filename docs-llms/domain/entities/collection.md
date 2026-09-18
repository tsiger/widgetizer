# Collection type and collection item

[Map](../README.md) · [Collection operations](../operations/content.md#collections) · [Output](output.md)

## Plain-language guide

### What is a collection?

A collection is a group of entries with the same kinds of information, such as news articles, team members or services. A collection item is one entry: one article, one person or one service.

The theme defines the collection type: the fields an entry offers, which are required, how entries can be ordered, and whether each entry has its own web page.

**Website → News collection → One news article**

### How does it appear on the website?

A widget can display entries from a collection, such as a list of recent articles. If the theme supports individual article pages, Widgetizer also builds each article's page using a common design.

You edit the article's information once. You do not need to rebuild its card and its full page separately. Some collections are only used inside widgets and have no individual pages.

### What can you do?

| Action | What happens |
| --- | --- |
| Create or edit an entry | Fills or changes its fields, such as title, text, date and photograph. |
| Change its address | Gives its individual page a different address where that feature is supported. |
| Duplicate | Creates a separate entry with copied information. |
| Create a language version | Starts a related entry that you can translate independently. |
| Reorder | Changes the sequence where manual ordering is used; date-sorted lists follow their date rules. |
| Delete | Removes the entry from the collection and future generated output, while shared images remain. |
| Discard old fields | Permanently removes retained values for fields that the theme no longer uses. |

### What are old or archived fields?

A theme update may remove a field. Widgetizer can keep its previous value behind the scenes instead of throwing it away during an ordinary edit. “Discard archived settings” removes those retained values; it does not archive or unpublish the entire entry.

### Languages and saving

All languages use the same field definitions, but each has its own entries and manual order. An English article and its Greek version can have different text, photographs and addresses.

A listing shows entries in the language of the page containing it. If there are no Greek news entries, a Greek news list is empty; English articles do not fill the gap automatically. Page counts also come from that language's entries, and the Next and Previous links stay in that language.

Save entry edits through the item form. Missing required information can prevent saving or block website export. A generated article page changes when you build a new export from the saved entry.

### Example

Change a staff member's photograph in their saved entry. Places that display that entry can use the updated photograph when rendered again. The previous uploaded photograph stays in the library.

## Technical details

## Collection type

A collection type is a theme-provided schema, such as news or team members. It defines fields, title selection, ordering, and optionally a public item-page template and URL prefix. The type definition is shared across project languages; items are not.

The type is identified by its folder name under `collection-types/`. A project author creates and edits items through the UI; collection-type authoring belongs to theme development. A collection may feed widgets without generating standalone item pages.

## Collection item

An item owns schema-defined `settings`, timestamps, a stable UUID, a mutable slug, a translation-group ID, and SEO when its type has item pages. Default items live at `collections/<type>/<slug>.json`; other languages use `collections/<type>/<code>/<slug>.json`.

- Slugs are unique per type and language. New items cannot take reserved `index`/`page` slugs.
- Manual order lives in that language's `_order.json`; it is not a second collection.
- A rename preserves UUID, updates ordering, and cleans duplicate-UUID sibling files left by interrupted renames.
- A duplicate creates its own translation group; a language version joins the original group.
- The schema supplies defaults for missing fields. Missing required values make an item invalid.
- Removed schema fields are exposed as `_archived` data in normalized models while their original values remain on disk. Ordinary updates preserve them; explicit discard removes them.
- Deleting an item prunes ordering, clears usage, and attempts stable-reference cleanup; it leaves translations and shared binaries intact.

## Generated item page

The output page is derived from the item and the collection's Liquid template, composed with the project's layout/globals. It is not a `pages/*.json` entity with separately editable widgets. Collection listing anchors and pagination connect ordinary pages to collection output; see [Page](page.md#listing-and-pagination).

Implementation: [collectionService](../../../packages/builder-server/src/services/collectionService.js), [collectionController](../../../packages/builder-server/src/controllers/collectionController.js), [collection routes](../../../packages/builder-server/src/routes/collections.js).

Tests: [collectionService](../../../packages/builder-server/src/tests/collectionService.test.js), [collection API](../../../packages/builder-server/src/tests/collectionApi.test.js), [media usage](../../../packages/builder-server/src/tests/collectionMediaUsage.test.js), [item export](../../../packages/builder-server/src/tests/collectionItemExport.test.js), [translation groups](../../../packages/builder-server/src/tests/translationGroups.test.js).

## Listings and multilingual output

The collection loader reads and sorts items using the rendered page/item language, includes language in its cache key, and resolves bare menu slugs in that context. Pagination counts valid items from the same language. Explicit UUID references retain their chosen targets; listing isolation does not rewrite cross-language links.

Export enumerates items in every included language and validates them before writing output. Generated item pages use that language's globals and published addresses. A language without a homepage is skipped as a whole; its items do not block the export of included languages. See [export rules](../operations/output.md#multilingual-boundary-at-this-snapshot).

Source and focused evidence: [collection rendering](../../../packages/builder-server/src/services/renderingService.js), [collectionFilter](../../../packages/builder-server/src/tests/collectionFilter.test.js), [paginationExport](../../../packages/builder-server/src/tests/paginationExport.test.js), [multilangExport](../../../packages/builder-server/src/tests/multilangExport.test.js).
