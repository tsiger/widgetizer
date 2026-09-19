# Behavior and test coverage map

[Map](README.md) · [Operations](operations/README.md) · [Review questions](review-questions.md)

## Plain-language guide

This page answers **“How much evidence do we have that the app behaves this way?”** It does not measure how complete your website is.

Each row names an expectation, points to its explanation, and records the evidence found in the test suite. “Inspected” means relevant checks were actually read. “Located” means a relevant test was found but has not yet been assessed in enough detail. “Recheck” means the behavior is changing or needs another look.

For example, a test may show that duplicating a page makes a separate page you can edit. That does not automatically prove that duplication also handles three languages, a deleted translation, shared images and a failed save correctly. Those combinations need their own evidence where they matter.

The “Next checks” column lists questions for the audit. It is not a list of confirmed bugs. Reading this map can help you ask whether a rule is sensible before anyone changes the code or adds more tests.

## Technical details

This is a **traceability map**, not a numerical coverage report. The entity and operation pages were grounded in source reads. Selected test assertions were inspected; other suites were located by their declarations. The initial documentation passes did not execute tests. The update through `1775a245` ran the focused suites recorded under [Latest validation](#latest-validation); no row claims all cases are covered.

## Evidence levels

| Label | Meaning |
| --- | --- |
| **Inspected** | Relevant test bodies/assertions were read for the specific claims in that row. Execution is recorded separately below; broader combinations remain unverified. |
| **Located** | Relevant suite/case declarations exist; detailed assertion adequacy has not been reviewed for every listed behavior. |
| **Recheck** | Concurrent implementation work or a visible current boundary makes a settled coverage judgment premature. |

The implementation column links to a walkthrough that names the actual handlers/helpers. “Next checks” are audit questions, not claims that tests are absent. Promote a narrow expectation only after reading its assertions and, when validating behavior changes, running the applicable test.

## Project lifecycle

| ID / expectation | Implementation traced | Existing test evidence | Level | Next checks |
| --- | --- | --- | --- | --- |
| P1 Create from theme/preset | [Create](operations/projects.md#create-a-project) | [projects](../../packages/builder-server/src/tests/projects.test.js), [presetMediaSeeding](../../packages/builder-server/src/tests/presetMediaSeeding.test.js), [collectionPresetSeeding](../../packages/builder-server/src/tests/collectionPresetSeeding.test.js) | Located | Partial seed/DB failure, starter references, media usage and custom default language together |
| P2 Edit shared metadata/folder | [Edit](operations/projects.md#edit-project-metadata-or-folder) | [projects](../../packages/builder-server/src/tests/projects.test.js), [siteIdentityForm](../../app/src/components/projects/__tests__/siteIdentityForm.test.js) | Located | Failure between directory move and row write; logo replacement shared across languages |
| P3 Switch/reset/stale writes | [Activate](operations/projects.md#activate-or-switch-project) | [projectSwitchCoordinator](../../app/src/lib/__tests__/projectSwitchCoordinator.test.js), [projectMismatchGuard](../../packages/builder-server/src/tests/projectMismatchGuard.test.js) | Located | In-flight save/load plus language navigation and two tabs |
| P4 Duplicate complete project | [Duplicate](operations/projects.md#duplicate-a-project) | [projects](../../packages/builder-server/src/tests/projects.test.js), [collectionLinkEnrichment](../../packages/builder-server/src/tests/collectionLinkEnrichment.test.js) | Located | Every reference kind in three languages, group whose original member was deleted, failed remap |
| P5 Backup/import identity and media | [Backup/import](operations/projects.md#import-an-editable-project-backup) | [projects](../../packages/builder-server/src/tests/projects.test.js): round-trip bodies assert new project/folder/file IDs and preserved media filenames/paths/sizes | Inspected | Full multilingual archive including missing versions, metadata null/empty, archived fields and links |
| P6 Delete project and exports | [Delete](operations/projects.md#delete-a-project) | [projects](../../packages/builder-server/src/tests/projects.test.js), [export](../../packages/builder-server/src/tests/export.test.js) | Located | Export queued during delete; disk removal failure after row deletion; orphan recovery |

## Language and translation

| ID / expectation | Implementation traced | Existing test evidence | Level | Next checks |
| --- | --- | --- | --- | --- |
| L1 Add seeds menus/globals only | [Add](operations/languages.md#add-a-language) | [languageService](../../packages/builder-server/src/tests/languageService.test.js): seeding, fresh menu UUIDs, menu reference rewriting, usage, retry and concurrency cases | Located | Partial seed failure combined with project-row write failure; no assumptions about auto-retargeting links |
| L2 Version joins group without modifying source | [Create version](operations/languages.md#create-a-language-version) | [translationGroups](../../packages/builder-server/src/tests/translationGroups.test.js): inspected page UUID/group/on-disk-language/source-equality assertions | Inspected | Copied widget/block/reference variety and independently divergent structures |
| L3 One version per target / duplicate starts new group | [Translation rules](entities/language.md#translation-group) | [translationGroups](../../packages/builder-server/src/tests/translationGroups.test.js): conflict/from-translation assertions inspected; concurrency/item-limit/duplicate cases located | Inspected | Distinguish inspected basic conflicts from race and limits assertions still needing detailed review |
| L4 Remove language / survivor usage / retry | [Remove](operations/languages.md#remove-a-language) | [languageService](../../packages/builder-server/src/tests/languageService.test.js): inspected failed-delete, survivor-usage, unreadable-identity and retry assertions | Inspected | Surviving links into deleted language; concurrent content write; shared binaries after every failure point |
| L5 Change sole default / reject unsupported codes | [Rules](multilingual.md) | [projects](../../packages/builder-server/src/tests/projects.test.js), [languages](../../packages/core/src/utils/__tests__/languages.test.js) | Located | Relabel default when imported metadata contains overrides; address collisions and regional-code output |
| L6 UI language selection and version navigation | [Navigation](operations/editing.md#navigation-and-session-changes) | [PagesLanguages](../../packages/editor-ui/src/pages/__tests__/PagesLanguages.test.jsx), [CollectionItemEditLanguages](../../packages/editor-ui/src/pages/__tests__/CollectionItemEditLanguages.test.jsx), [LanguagesSection](../../app/src/components/projects/__tests__/LanguagesSection.test.jsx) | Located | Dirty editor, pending autosave, missing sibling, deleted language; full editor-to-preview journey |

## Content and editing

| ID / expectation | Implementation traced | Existing test evidence | Level | Next checks |
| --- | --- | --- | --- | --- |
| C1 Page CRUD/rename/duplicate/SEO | [Pages](operations/content.md#pages) | [pages](../../packages/builder-server/src/tests/pages.test.js): metadata, UUID, slug, SEO, duplication and language cases | Located | Rule parity between details update and content save; partial old-file deletion |
| C2 Page deletion/reference cleanup | [Pages](operations/content.md#pages) | [pages](../../packages/builder-server/src/tests/pages.test.js), [linkEnrichmentFromDir](../../packages/builder-server/src/tests/linkEnrichmentFromDir.test.js) | Located | Single, bulk, and language deletion should have an explicit consistent reference policy |
| C3 Widget/block lifecycle and limits | [Editing](operations/editing.md#widget-and-block-edits) | [widgetStore](../../packages/editor-ui/src/stores/__tests__/widgetStore.test.js), [widgetStoreHelpers](../../packages/editor-ui/src/stores/__tests__/widgetStoreHelpers.test.js), [maxBlocks](../../packages/builder-server/src/tests/maxBlocks.test.js) | Located | Both global/page ownership; every reference-bearing setting; paste across pages and project reset |
| C4 Save/undo/redo/concurrent edits | [Save](operations/editing.md#save-and-autosave) | [saveStore](../../packages/editor-ui/src/stores/__tests__/saveStore.test.js), [undoThemeCorrection](../../packages/editor-ui/src/stores/__tests__/undoThemeCorrection.test.js), [pageStore](../../packages/editor-ui/src/stores/__tests__/pageStore.test.js) | Located | Combined page/global/theme partial failure, language switch during save, stale response and retry |
| C5 Globals per language | [Globals](entities/global-widget.md) | [preview](../../packages/builder-server/src/tests/preview.test.js), [languageService](../../packages/builder-server/src/tests/languageService.test.js) | Located | Missing/corrupt singleton, global block setting types, changes seen across same-language pages only |
| C6 Menu tree and targets | [Menus](operations/content.md#menus) | [menus](../../packages/builder-server/src/tests/menus.test.js), [menuResolver](../../packages/render-engine/src/menuResolver.test.js), [MenusLanguages](../../packages/editor-ui/src/pages/__tests__/MenusLanguages.test.jsx) | Located | Language seeding versus duplication identity rules; deleted menu selections; cross-language item links |
| C7 Collection CRUD/order/archive | [Collections](operations/content.md#collections) | [collectionApi](../../packages/builder-server/src/tests/collectionApi.test.js), [collectionService](../../packages/builder-server/src/tests/collectionService.test.js) | Located | Rename/order failure, duplicate-UUID recovery, required fields after schema updates, archive-media behavior |
| C8 Listing anchors/pagination | [Page rules](entities/page.md#listing-and-pagination) | [pages](../../packages/builder-server/src/tests/pages.test.js), [paginationExport](../../packages/builder-server/src/tests/paginationExport.test.js), [planPagination](../../packages/render-engine/src/planPagination.test.js) | Located | Anchor uniqueness per language and collection; concurrent claims; generated URL depth |
| C9 Application settings | [Settings](operations/editing.md#application-settings) | [appSettings](../../packages/builder-server/src/tests/appSettings.test.js) | Located | Defaults/merge versus existing uploaded assets and existing exports; UI locale separation |
| C10 Listing language and generated copies | [Collection rendering](entities/collection.md#listings-and-multilingual-output) | [collectionFilter](../../packages/builder-server/src/tests/collectionFilter.test.js): language isolation, empty-language result, translated item URL and menu selection; [paginationExport](../../packages/builder-server/src/tests/paginationExport.test.js): unequal language totals, pager destinations, sitemap and widget update; [previewLanguages](../../packages/builder-server/src/tests/previewLanguages.test.js): item-template listing and translated breadcrumbs during widget update | Inspected | Cache reuse across language renders; manual order, invalid items and partial translations combined; C8's authoring rules need their own assessment |

## Media and references

| ID / expectation | Implementation traced | Existing test evidence | Level | Next checks |
| --- | --- | --- | --- | --- |
| M1 Upload/processing/cleanup | [Upload](operations/media.md#upload-and-process) | [media](../../packages/builder-server/src/tests/media.test.js), [mediaInsertAtomicity](../../packages/builder-server/src/tests/mediaInsertAtomicity.test.js), [mediaUploadFilter](../../packages/builder-server/src/tests/mediaUploadFilter.test.js) | Located | Fail each original/rendition/DB step; generated filename collisions and quotas |
| M2 Translated metadata inheritance | [Metadata](operations/media.md#edit-metadata) | [media](../../packages/builder-server/src/tests/media.test.js): inspected absent/null/empty, base preservation, inherited-row deletion and rewrite assertions | Inspected | Full backup/restore plus rendered output, rather than only repository rewrite |
| M3 Usage across owners and languages | [Usage](entities/media.md#who-can-use-a-file) | [mediaUsage](../../packages/builder-server/src/tests/mediaUsage.test.js), [collectionMediaUsage](../../packages/builder-server/src/tests/collectionMediaUsage.test.js), [richtextMedia](../../packages/builder-server/src/tests/richtextMedia.test.js) | Located | Multiple references to same file in one owner, every owner/type, usage sync failure then delete |
| M4 Refuse in-use deletion / bulk outcomes | [Delete](operations/media.md#delete-or-bulk-delete) | [media](../../packages/builder-server/src/tests/media.test.js); [mediaDeletionSafety](../../packages/builder-server/src/tests/mediaDeletionSafety.test.js): inspected — content-referenced file with no usage row, reference only in another language, unreadable content refusing single and bulk delete, save/delete overlap invariant, save queued behind a completed delete, re-upload clearing the block | Inspected | Partial asset deletion; the non-participating write paths (item duplicate/discard/version, language seeding, link enrichment, structural flows); cross-process deletion safety, which this does **not** establish — blocked on whether a multi-process host is a real deployment |
| M5 Stable links and output addresses | [References](entities/settings.md#reference-rules) | [richtextLinks](../../packages/core/src/utils/__tests__/richtextLinks.test.js), [contentAddress](../../packages/core/src/utils/__tests__/contentAddress.test.js), [collectionLinkResolution](../../packages/builder-server/src/tests/collectionLinkResolution.test.js) | Located | Rename/delete/import/duplicate for menu, richtext, block, table and collection link contexts |
| M6 Sanitization/trust boundaries | [Settings output](entities/settings.md#output-rules) | [sanitization](../../packages/builder-server/src/tests/sanitization.test.js), [safeUrlFilter](../../packages/builder-server/src/tests/safeUrlFilter.test.js), [scopeAndErrors](../../packages/builder-server/src/tests/scopeAndErrors.test.js) | Located | Same rules through alternate write/render paths; explicit raw code versus richtext |

## Themes and output

| ID / expectation | Implementation traced | Existing test evidence | Level | Next checks |
| --- | --- | --- | --- | --- |
| T1 Theme library/snapshot/install | [Themes](operations/themes.md) | [themes](../../packages/builder-server/src/tests/themes.test.js), [themeUpdates](../../packages/builder-server/src/tests/themeUpdates.test.js), [buildLatestSnapshotAtomicity](../../packages/builder-server/src/tests/buildLatestSnapshotAtomicity.test.js) | Located | Library deletion in-use checks, invalid packages, cache refresh and independent project copies |
| T2 Apply theme update / save settings | [Apply](operations/themes.md#check-and-apply-a-project-update) | [themeUpdateService](../../packages/builder-server/src/tests/themeUpdateService.test.js), [themeUpdateApplyToDir](../../packages/builder-server/src/tests/themeUpdateApplyToDir.test.js), [themeStore](../../packages/editor-ui/src/stores/__tests__/themeStore.test.js) | Located | Partial file errors versus recorded version, every language's schema compatibility, new starter UUIDs |
| O1 Preview/token/navigation | [Preview](operations/output.md#preview) | [preview](../../packages/builder-server/src/tests/preview.test.js), [previewLanguages](../../packages/builder-server/src/tests/previewLanguages.test.js), [standalonePreviewTarget](../../packages/core/src/runtime/__tests__/standalonePreviewTarget.test.js), [previewRoutes](../../app/src/__tests__/previewRoutes.test.jsx) | Located | Full navigation assertions beyond C10's inspected additions: same slugs, collection prefixes, clean URLs, pagination and token expiry |
| O2 Export validation/build/history | [Export](operations/output.md#static-site-export) | [export](../../packages/builder-server/src/tests/export.test.js), [exportView](../../packages/builder-server/src/tests/exportView.test.js), [collectionItemExport](../../packages/builder-server/src/tests/collectionItemExport.test.js) | Located | Output/record cleanup for failures; retained-version boundaries and export/delete concurrency |
| O3 Multilingual export eligibility and artifacts | [Export rules](operations/output.md#multilingual-boundary-at-this-snapshot) | [multilangExport](../../packages/builder-server/src/tests/multilangExport.test.js): skipped language, mandatory default home, sitemap/alternates, translated robots path, form key/HTML parity, invalid translated item, empty collection, absent header, page/item canonicals, explicit override and single-language output; [publishedUrls](../../packages/core/src/utils/__tests__/publishedUrls.test.js): item URLs with Site URL subfolder and Clean URLs | Inspected | Translated item alternate/Markdown combinations; noindex sibling policy; explicit links into a skipped language; full legacy upgrade path |
| O4 Skipped-language result in the UI | [Export result](operations/output.md#which-languages-are-included) | [ExportSite](../../packages/editor-ui/src/pages/__tests__/ExportSite.test.jsx): warning survives the first export's empty-to-history layout change | Inspected | Actual language-name text/interpolation, repeated exports and project switching; one layout assertion does not cover all UI states |
| O5 Related SEO, forms and media combinations | [Output](operations/output.md) | [seoArtifacts](../../packages/builder-server/src/tests/seoArtifacts.test.js), [structuredDataExport](../../packages/builder-server/src/tests/structuredDataExport.test.js), [formsManifest](../../packages/builder-server/src/tests/formsManifest.test.js), [imageTagLanguages](../../packages/core/src/tags/__tests__/imageTagLanguages.test.js) | Located | Broader assertions beyond O3: same-language form collisions/limits, translated media, structured data and metadata combinations |
| O6 Remaining phase-5 acceptance | [Pending steps](operations/output.md#remaining-phase-5) | Theme switcher/copy, month localization, upgrade verification and final contract/checklist reconciliation are pending at `1775a245` | Recheck | Record evidence when steps 22–25 land; do not infer completion from the backend export tests |

## Latest validation

On **2026-09-18**, at **`1775a245`**, both commands completed successfully:

```powershell
node --test --test-reporter=dot packages/builder-server/src/tests/multilangExport.test.js packages/builder-server/src/tests/collectionFilter.test.js packages/builder-server/src/tests/paginationExport.test.js packages/builder-server/src/tests/previewLanguages.test.js
npm run test:frontend -- packages/core/src/utils/__tests__/publishedUrls.test.js packages/render-engine/src/planPagination.test.js packages/editor-ui/src/pages/__tests__/ExportSite.test.jsx
```

The backend run passed across four test files. Vitest passed **21 tests across three files**. Its pagination tests logged `deps.getProjectData is not a function` diagnostics from the minimal test dependency setup while passing; this run does not certify that setup as warning-free. This was a focused check of the new export/listing behavior, not a full regression run, browser walkthrough or completed upgrade verification.

## A manageable next audit

Review one journey across domains instead of rerunning unrelated suites and counting green tests:

1. Create a project with a preset, logo, media, menu, ordinary page and collection items.
2. Add Greek and Italian; create selected versions, leaving some untranslated; intentionally use different structures and slugs.
3. Use shared media from page blocks, globals, theme settings, identity, collection fields and SEO; set inherited and deliberately blank translated metadata.
4. Rename, duplicate and delete targets; check references, groups, order and usage after each action.
5. Duplicate the project and perform a backup/import round-trip; inspect every identity/reference and language partition.
6. Fail selected writes, retry, and remove a language while other content still uses its former targets/shared files.
7. Apply a theme update and compare preview/export output across languages, depths and Clean URLs settings.

This journey is a proposed audit fixture, not a newly implemented test or a completed manual test. Turn each discovered gap into a narrow assertion at the layer that owns the rule, then use a small integration test for interactions that unit tests cannot prove.
