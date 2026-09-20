# Preview, export, and generated output

[Map](../README.md) · [Output operations](../operations/output.md)

## Plain-language guide

### What are previews and exports?

A preview lets you inspect your work. An export creates a set of website files from saved content. A backup keeps the editable project so you can import it into Widgetizer later.

These represent different moments and different uses of the same project.

| Thing you open or create | What it contains |
| --- | --- |
| Preview inside the editor | Your current editing view, which can include changes you have not saved yet. |
| Separate site preview | A view built from saved content; save first to see the latest edits. |
| Temporary preview link | A short-lived view of a particular rendering; opening it does not save or publish anything. |
| Website export | Pages and supporting files prepared for visitors, recorded as an export version. |
| Generated article page | A page built from a collection entry and its theme design. |
| Extra listing pages | Additional pages generated when a list is split into smaller groups. |
| Project backup | An archive of the editable website, its settings and uploaded content. |
| Search and form information | Supporting files that describe the exported site to search engines or systems that handle its forms. |

### What can you do?

Inspect a preview, create a website export, browse previous exports, view their files, download them, or remove an export you no longer need. You can also make an editable-project backup from project management.

Deleting a generated export does not delete the editable project. Editing the project does not rewrite old exports: each represents a saved build from that time.

### Languages and saving

A preview must open the intended language version. English About and Greek About may be different pages even when their addresses have the same final word.

The default language needs a homepage for export to succeed. An additional language needs its own homepage to be included; otherwise the build skips that language and reports it. Its editable content remains. Included languages get their own pages, collection entries and shared header/footer. This checks whether the language has a starting destination, not whether you have finished translating its words.

Listings contain only entries in their own language. English can have three news-list pages while Greek has one. Search-engine information describes the included output, and translated forms receive separate identities. See the [output walkthrough](../operations/output.md#multilingual-boundary-at-this-snapshot) for the current rules.

### Example

You change a testimonial and see it in the editor. Save, then open the separate preview to check it. Create a new export when ready. The files you previously uploaded to your web host remain unchanged until you replace them.

## Technical details

| Artifact | Source / lifetime |
| --- | --- |
| Editor preview | Rendered page/widget HTML, potentially using unsaved editor content |
| Standalone preview | Page/item rendering reached through language-qualified preview routes |
| Preview token | Temporary in-memory UUID pointing to rendered HTML; currently five-minute TTL with bounded capacity |
| Static export | Versioned generated site directory plus SQLite export history |
| Exported page | Derived HTML, optional Markdown, assets and SEO output; not the editable source document |
| Paginated page | Generated extra output for one listing page; no extra stored page entity |
| Collection item page | Derived from item data and collection template |
| Project backup ZIP | Manifest plus editable project files and serialized media metadata; used by import |
| Forms manifest / SEO artifacts | Derived metadata describing rendered output, not separately editable collections |

Previewing does not save the source. A token is an HTML snapshot, not a live database pointer that always reflects later edits. Rebuilding an export does not replace the editable source project. Downloading a static-site ZIP and exporting an editable-project backup serve different purposes.

Export history owns version/status/file information. Removing an export removes generated output/history, not the project. Project deletion attempts to remove its exports before deleting the row so cascading metadata deletion does not hide their locations.

Implementation: [previewController](../../../packages/builder-server/src/controllers/previewController.js), [previewTokenStore](../../../packages/builder-server/src/services/previewTokenStore.js), [exportController](../../../packages/builder-server/src/controllers/exportController.js), [exportRepository](../../../packages/builder-server/src/db/repositories/exportRepository.js), [project backup handler](../../../packages/builder-server/src/controllers/projectController.js).

Tests: [preview](../../../packages/builder-server/src/tests/preview.test.js), [export](../../../packages/builder-server/src/tests/export.test.js), [pagination export](../../../packages/builder-server/src/tests/paginationExport.test.js), [collection item export](../../../packages/builder-server/src/tests/collectionItemExport.test.js), [forms manifest](../../../packages/builder-server/src/tests/formsManifest.test.js).

Multilingual export and listings have focused regression evidence and two real-project walkthroughs recorded in [coverage](../coverage.md#latest-validation). The [output rules](../operations/output.md#multilingual-boundary-at-this-snapshot) describe the current contract; the walkthroughs do not certify every possible project.
