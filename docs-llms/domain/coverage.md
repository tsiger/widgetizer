# Behavior and test coverage map

[Map](README.md) · [Operations](operations/README.md)

## Plain-language guide

This page answers **“How much evidence do we have that the app behaves this way?”** It does not measure how complete your website is.

Each row names an expectation, points to its explanation, and records the evidence found in the test suite. “Inspected” means relevant checks were actually read. “Located” means a relevant test was found but has not yet been assessed in enough detail. Source inspection and test execution are recorded separately; neither implies exhaustive coverage.

For example, a test may show that duplicating a page makes a separate page you can edit. That does not automatically prove that duplication also handles three languages, a deleted translation, shared images and a failed save correctly. Those combinations need their own evidence where they matter.

This map records evidence and its limits. It does not assign work or turn an unexamined combination into a defect.

## Technical details

This is a **traceability map**, not a numerical coverage report. The entity and operation pages were grounded in source reads. Selected test assertions were inspected; other suites were located by their declarations. The initial documentation passes did not execute tests. The update through `1775a245` ran the focused suites recorded under [Latest validation](#latest-validation); no row claims all cases are covered.

## Evidence levels

| Label | Meaning |
| --- | --- |
| **Inspected** | Relevant test bodies/assertions were read for the specific claims in that row. Execution is recorded separately below; broader combinations remain unverified. |
| **Located** | Relevant suite/case declarations exist; detailed assertion adequacy has not been reviewed for every listed behavior. |

The implementation column links to the relevant walkthrough. Evidence levels describe the scope actually inspected, not an assurance about every combination.

## Project lifecycle

| ID / expectation | Implementation traced | Existing test evidence | Level |
| --- | --- | --- | --- |
| P1 Create from theme/preset | [Create](operations/projects.md#create-a-project) | [structuralFailureRecovery](../../packages/builder-server/src/tests/structuralFailureRecovery.test.js): a preset whose menus, collection items or settings file cannot be read fails the creation, leaves no row or directory, and can be retried; a preset with no optional components still creates; [projects](../../packages/builder-server/src/tests/projects.test.js), [presetMediaSeeding](../../packages/builder-server/src/tests/presetMediaSeeding.test.js), [collectionPresetSeeding](../../packages/builder-server/src/tests/collectionPresetSeeding.test.js) | Inspected |
| P2 Edit shared metadata/folder | [Edit](operations/projects.md#edit-project-metadata-or-folder) | [projects](../../packages/builder-server/src/tests/projects.test.js), [siteIdentityForm](../../app/src/components/projects/__tests__/siteIdentityForm.test.js) | Located |
| P3 Switch/reset/stale writes | [Activate](operations/projects.md#activate-or-switch-project) | [projectSwitchCoordinator](../../app/src/lib/__tests__/projectSwitchCoordinator.test.js), [projectMismatchGuard](../../packages/builder-server/src/tests/projectMismatchGuard.test.js) | Located |
| P4 Duplicate complete project | [Duplicate](operations/projects.md#duplicate-a-project) | [backupCloneCompleteness](../../packages/builder-server/src/tests/backupCloneCompleteness.test.js): one bilingual fixture asserted whole — every reference kind in root, language folders and per-language globals, page and item groups including ones whose original member was deleted, out-of-schema item fields, per-language manual order, siteIdentity, theme-update provenance, media overrides, and a language the export would skip; [projects](../../packages/builder-server/src/tests/projects.test.js), [collectionLinkEnrichment](../../packages/builder-server/src/tests/collectionLinkEnrichment.test.js), [themeSettingReferences](../../packages/builder-server/src/tests/themeSettingReferences.test.js) | Inspected |
| P5 Backup/import identity and media | [Backup/import](operations/projects.md#import-an-editable-project-backup) | [backupCloneCompleteness](../../packages/builder-server/src/tests/backupCloneCompleteness.test.js): the same bilingual fixture restored under the backup's own identities, plus the refusals — two media libraries in one archive, a library that is absent/not a list/unwritable, a language this version cannot work with, and the server's temporary upload removed on every exit; [projects](../../packages/builder-server/src/tests/projects.test.js): round-trip metadata and media IDs | Inspected |
| P6 Delete project and exports | [Delete](operations/projects.md#delete-a-project) | [projects](../../packages/builder-server/src/tests/projects.test.js), [export](../../packages/builder-server/src/tests/export.test.js) | Located |

## Language and translation

| ID / expectation | Implementation traced | Existing test evidence | Level |
| --- | --- | --- | --- |
| L1 Add seeds menus/globals only | [Add](operations/languages.md#add-a-language) | [languageService](../../packages/builder-server/src/tests/languageService.test.js): seeding, menu UUIDs, menu reference rewriting, usage, concurrency, and the non-destructive contract — a finished seed re-run changing nothing, a half-finished one completing and connecting to what survived, translated content left alone, and unreadable source or destination content stopping before any write | Inspected |
| L2 Version joins group without modifying source | [Create version](operations/languages.md#create-a-language-version) | [translationGroups](../../packages/builder-server/src/tests/translationGroups.test.js): inspected page UUID/group/on-disk-language/source-equality assertions | Inspected |
| L3 One version per target / duplicate starts new group | [Translation rules](entities/language.md#translation-group) | [translationGroups](../../packages/builder-server/src/tests/translationGroups.test.js): conflict and from-translation assertions inspected, concurrency and item-limit cases located; [collectionApi](../../packages/builder-server/src/tests/collectionApi.test.js): a version and a duplicate counted against one cap | Inspected |
| L4 Remove language / survivor usage / retry | [Remove](operations/languages.md#remove-a-language) | [languageService](../../packages/builder-server/src/tests/languageService.test.js): inspected failed-delete, survivor-usage, unreadable-identity and retry assertions; [languageLifecycle](../../packages/builder-server/src/tests/languageLifecycle.test.js): inspected — both orderings (save before removal, removal before save) across pages, page versions, globals, menus, collection writes, reorder and item versions; the queued-save case; the listing-anchor sweep; the menu uuid backfill; collection delete's order-file prune; fresh-row vs stale-row refusals | Inspected |
| L5 Change sole default / reject unsupported codes | [Rules](multilingual.md) | [projects](../../packages/builder-server/src/tests/projects.test.js), [languages](../../packages/core/src/utils/__tests__/languages.test.js) | Located |
| L6 UI language selection and version navigation | [Navigation](operations/editing.md#navigation-and-session-changes) | [PagesLanguages](../../packages/editor-ui/src/pages/__tests__/PagesLanguages.test.jsx), [CollectionItemEditLanguages](../../packages/editor-ui/src/pages/__tests__/CollectionItemEditLanguages.test.jsx), [LanguagesSection](../../app/src/components/projects/__tests__/LanguagesSection.test.jsx) | Located |

| L7 Editing a language that was removed | [Recovery](operations/languages.md#both-orderings-and-what-the-editor-does-about-them) | [saveStore](../../packages/editor-ui/src/stores/__tests__/saveStore.test.js): inspected — refusal keeps edits and dirty state, autosave stays stopped across further edits and further save calls, resumes on a new session, banner cleared with it, project-mismatch warning preserved, and the full refusal → discard → valid page → save lifecycle; [StaleProjectCurtain](../../packages/editor-ui/src/components/ui/__tests__/StaleProjectCurtain.test.jsx): non-blocking banner, language named not coded, exit label, no undeliverable advice; [useStaleActiveProjectDetection](../../packages/editor-ui/src/hooks/__tests__/useStaleActiveProjectDetection.test.js): focus revalidation preserves a language warning but still curtains a genuine project switch | Inspected |

## Content and editing

| ID / expectation | Implementation traced | Existing test evidence | Level |
| --- | --- | --- | --- |
| C1 Page CRUD/rename/duplicate/SEO | [Pages](operations/content.md#pages) | [pages](../../packages/builder-server/src/tests/pages.test.js): metadata, UUID, slug, SEO, duplication and language cases | Located |
| C2 Page deletion/reference cleanup | [Deletion policy](operations/content.md#one-policy-for-references-to-deleted-content) | [pages](../../packages/builder-server/src/tests/pages.test.js), [linkEnrichmentFromDir](../../packages/builder-server/src/tests/linkEnrichmentFromDir.test.js), [deletedReferenceCleanup](../../packages/builder-server/src/tests/deletedReferenceCleanup.test.js): inspected — one policy across single, bulk and language deletion; labels and typed URLs preserved; confirmed-only sweeps including partial failure and retry; a renamed page's links kept; cleanup surviving an order-file failure; incomplete sweeps reported rather than silently skipped; batching | Inspected |
| C3 Widget/block lifecycle and limits | [Editing](operations/editing.md#widget-and-block-edits) | [widgetStore](../../packages/editor-ui/src/stores/__tests__/widgetStore.test.js), [widgetStoreHelpers](../../packages/editor-ui/src/stores/__tests__/widgetStoreHelpers.test.js), [maxBlocks](../../packages/builder-server/src/tests/maxBlocks.test.js) | Located |
| C4 Save/undo/redo/concurrent edits | [Save](operations/editing.md#save-and-autosave) | [saveStore](../../packages/editor-ui/src/stores/__tests__/saveStore.test.js), [undoThemeCorrection](../../packages/editor-ui/src/stores/__tests__/undoThemeCorrection.test.js), [pageStore](../../packages/editor-ui/src/stores/__tests__/pageStore.test.js) | Located |
| C5 Globals per language | [Globals](entities/global-widget.md) | [preview](../../packages/builder-server/src/tests/preview.test.js), [languageService](../../packages/builder-server/src/tests/languageService.test.js) | Located |
| C6 Menu tree and targets | [Menus](operations/content.md#menus) | [menus](../../packages/builder-server/src/tests/menus.test.js), [menuResolver](../../packages/render-engine/src/menuResolver.test.js), [MenusLanguages](../../packages/editor-ui/src/pages/__tests__/MenusLanguages.test.jsx), [deletedReferenceCleanup](../../packages/builder-server/src/tests/deletedReferenceCleanup.test.js): deleted-menu selections cleared, another menu's selection untouched | Located |
| C7 Collection CRUD/order/archive | [Collections](operations/content.md#collections) | [collectionApi](../../packages/builder-server/src/tests/collectionApi.test.js): the item cap applied identically by New item, Create version and Duplicate — refused at the cap writing nothing, allowed below it, and another language's items counted in; [collectionService](../../packages/builder-server/src/tests/collectionService.test.js) | Inspected |
| C8 Listing anchors/pagination | [Page rules](entities/page.md#listing-and-pagination) | [pages](../../packages/builder-server/src/tests/pages.test.js), [paginationExport](../../packages/builder-server/src/tests/paginationExport.test.js), [planPagination](../../packages/render-engine/src/planPagination.test.js) | Located |
| C9 Application settings | [Settings](operations/editing.md#application-settings) | [appSettings](../../packages/builder-server/src/tests/appSettings.test.js) | Located |
| C10 Listing language and generated copies | [Collection rendering](entities/collection.md#listings-and-multilingual-output) | [collectionFilter](../../packages/builder-server/src/tests/collectionFilter.test.js): language isolation, empty-language result, translated item URL and menu selection; [paginationExport](../../packages/builder-server/src/tests/paginationExport.test.js): unequal language totals, pager destinations, sitemap and widget update; [previewLanguages](../../packages/builder-server/src/tests/previewLanguages.test.js): item-template listing and translated breadcrumbs during widget update | Inspected |

## Media and references

| ID / expectation | Implementation traced | Existing test evidence | Level |
| --- | --- | --- | --- |
| M1 Upload/processing/cleanup | [Upload](operations/media.md#upload-and-process) | [media](../../packages/builder-server/src/tests/media.test.js), [mediaInsertAtomicity](../../packages/builder-server/src/tests/mediaInsertAtomicity.test.js), [mediaUploadFilter](../../packages/builder-server/src/tests/mediaUploadFilter.test.js) | Located |
| M2 Translated metadata inheritance | [Metadata](operations/media.md#edit-metadata) | [media](../../packages/builder-server/src/tests/media.test.js): inspected absent/null/empty, base preservation, inherited-row deletion and rewrite assertions; [backupCloneCompleteness](../../packages/builder-server/src/tests/backupCloneCompleteness.test.js): overrides survive duplication and backup/restore with "inherit" and "deliberately blank" kept distinct | Inspected |
| M3 Usage across owners and languages | [Usage](entities/media.md#who-can-use-a-file) | [mediaUsage](../../packages/builder-server/src/tests/mediaUsage.test.js), [collectionMediaUsage](../../packages/builder-server/src/tests/collectionMediaUsage.test.js), [richtextMedia](../../packages/builder-server/src/tests/richtextMedia.test.js) | Located |
| M4 Refuse in-use deletion / bulk outcomes | [Delete](operations/media.md#delete-or-bulk-delete) | [media](../../packages/builder-server/src/tests/media.test.js); [mediaDeletionSafety](../../packages/builder-server/src/tests/mediaDeletionSafety.test.js): inspected — content-referenced file with no usage row, reference only in another language, unreadable content refusing single and bulk delete, save/delete overlap invariant, save queued behind a completed delete, re-upload clearing the block | Inspected |
| M5 Stable links and output addresses | [References](entities/settings.md#reference-rules) | [richtextLinks](../../packages/core/src/utils/__tests__/richtextLinks.test.js), [contentAddress](../../packages/core/src/utils/__tests__/contentAddress.test.js), [collectionLinkResolution](../../packages/builder-server/src/tests/collectionLinkResolution.test.js), [themeSettingReferences](../../packages/builder-server/src/tests/themeSettingReferences.test.js): inspected — site-wide link/menu/richtext across render, seeding, preset item seeding, duplication and deletion; href shape under Clean URLs and a non-English default language; non-reference settings left alone | Inspected |
| M6 Sanitization/trust boundaries | [Settings output](entities/settings.md#output-rules) | [sanitization](../../packages/builder-server/src/tests/sanitization.test.js), [safeUrlFilter](../../packages/builder-server/src/tests/safeUrlFilter.test.js), [scopeAndErrors](../../packages/builder-server/src/tests/scopeAndErrors.test.js) | Located |

## Themes and output

| ID / expectation | Implementation traced | Existing test evidence | Level |
| --- | --- | --- | --- |
| T1 Theme library/snapshot/install | [Themes](operations/themes.md) | [themes](../../packages/builder-server/src/tests/themes.test.js), [themeUpdates](../../packages/builder-server/src/tests/themeUpdates.test.js), [buildLatestSnapshotAtomicity](../../packages/builder-server/src/tests/buildLatestSnapshotAtomicity.test.js) | Located |
| T2 Apply theme update / save settings | [Apply](operations/themes.md#check-and-apply-a-project-update) | [structuralFailureRecovery](../../packages/builder-server/src/tests/structuralFailureRecovery.test.js): no mixture of old and new files, the version not recorded on failure, a successful retry, interrupted runs undone including their additions, recovery files kept when the undo fails, two overlapping updates, and messages carrying no paths or instructions; [themeUpdateService](../../packages/builder-server/src/tests/themeUpdateService.test.js), [themeUpdateApplyToDir](../../packages/builder-server/src/tests/themeUpdateApplyToDir.test.js), [themeUpdateCopies](../../packages/builder-server/src/tests/themeUpdateCopies.test.js) | Inspected |
| O1 Preview/token/navigation | [Preview](operations/output.md#preview) | [preview](../../packages/builder-server/src/tests/preview.test.js), [previewLanguages](../../packages/builder-server/src/tests/previewLanguages.test.js), [standalonePreviewTarget](../../packages/core/src/runtime/__tests__/standalonePreviewTarget.test.js), [previewRoutes](../../app/src/__tests__/previewRoutes.test.jsx) | Located |
| O2 Export validation/build/history | [Export](operations/output.md#static-site-export) | [export](../../packages/builder-server/src/tests/export.test.js), [exportView](../../packages/builder-server/src/tests/exportView.test.js), [collectionItemExport](../../packages/builder-server/src/tests/collectionItemExport.test.js) | Located |
| O3 Multilingual export eligibility and artifacts | [Export rules](operations/output.md#multilingual-boundary-at-this-snapshot) | [multilangExport](../../packages/builder-server/src/tests/multilangExport.test.js): skipped language, mandatory default home, sitemap/alternates, translated robots path, form key/HTML parity, invalid translated item, empty collection, absent header, page/item canonicals, explicit override, single-language output, links into a skipped language cleared in widgets/richtext, per-language manifest counts, and noindex siblings excluded from HTML and sitemap alternates for pages, items and homepage fallbacks; [translations](../../packages/core/src/utils/__tests__/translations.test.js): the `noindex` flag's source and one answer from both sibling input shapes; [publishedUrls](../../packages/core/src/utils/__tests__/publishedUrls.test.js): item URLs with Site URL subfolder and Clean URLs | Inspected |
| O4 Skipped-language result in the UI | [Export result](operations/output.md#which-languages-are-included) | [ExportSite](../../packages/editor-ui/src/pages/__tests__/ExportSite.test.jsx): warning survives the first export's empty-to-history layout change | Inspected |
| O5 Related SEO, forms and media combinations | [Output](operations/output.md) | [seoArtifacts](../../packages/builder-server/src/tests/seoArtifacts.test.js), [structuredDataExport](../../packages/builder-server/src/tests/structuredDataExport.test.js), [formsManifest](../../packages/builder-server/src/tests/formsManifest.test.js), [imageTagLanguages](../../packages/core/src/tags/__tests__/imageTagLanguages.test.js) | Located |
| O6 Theme language controls and date formatting | [Output](operations/output.md#theme-controls-and-dates) | Arch header schema/template and language-switcher snippet; [dateFormat](../../packages/core/src/utils/__tests__/dateFormat.test.js) suite located; two-language selector exercised in the recorded walkthrough | Source inspected; test suite located |

## Latest validation

On **2026-09-18**, at **`1775a245`**, both commands completed successfully:

```powershell
node --test --test-reporter=dot packages/builder-server/src/tests/multilangExport.test.js packages/builder-server/src/tests/collectionFilter.test.js packages/builder-server/src/tests/paginationExport.test.js packages/builder-server/src/tests/previewLanguages.test.js
npm run test:frontend -- packages/core/src/utils/__tests__/publishedUrls.test.js packages/render-engine/src/planPagination.test.js packages/editor-ui/src/pages/__tests__/ExportSite.test.jsx
```

The backend run passed across four test files. Vitest passed **21 tests across three files**. Its pagination tests logged `deps.getProjectData is not a function` diagnostics from the minimal test dependency setup while passing; this run does not certify that setup as warning-free. This was a focused check of the new export/listing behavior, not a full regression run, browser walkthrough or completed upgrade verification.

On **2026-09-20**, during the R4, R6, R7 and R8 reviews, the full suites were run: **1,932 backend tests** and **1,565 frontend tests** passed at the end of R4. Full lint still reports the pre-existing parse errors in the theme's deletion markers. The R7 export cases were driven through real exports rather than the artifact builders alone, and the R8 cases through the real project controllers; each new regression was verified to fail against its reintroduced defect. Neither review is an exhaustive audit of its area — R8 in particular did not examine every way an archive can be malformed. Both hands-on checks below were completed: the two-language walkthrough and the legacy-upgrade check, including a real theme update. These results are historical reports; the documentation cleanup did not rerun those suites.


## Completed review record

All eight bounded reviews completed. Commits and regression suites retain the detailed evidence; this is not a claim that every failure mode was audited.

| Review | Settled behaviour | Fix |
| --- | --- | --- |
| R1 | Verified media deletion and distinct save/usage outcomes | `ae8102a3` |
| R2 | Batched confirmed-deletion cleanup, preserved labels and surfaced partial cleanup | `1845945b` |
| R3 | Participating writes cannot recreate removed languages; stale-session handling | `92eb3481` |
| R4 | Duplicate obeys the collection cap; identity/address/group rules agree | `0c730731` |
| R5 | Theme link/menu/richtext lifecycle and internal-link picker | `6e9170c2`, `7952bf63` |
| R6 | Prepared theme updates, retryable failed creation/duplication | `1bc5ab27` |
| R7 | Export-scoped maps/counts and consistent noindex alternates | `ef3b96ae` |
| R8 | Backup media source, complete restore and non-destructive language seeding | `57a57bfd` |

The full historical review reasoning is recoverable from Git at `f10e20ce`. Current limitations are stated in the relevant operation pages.

## The bilingual walkthrough

Completed 2026-09-20. A real two-language project (Arch theme, `olympic` preset, default `en` plus `el`, two collections) was taken through the editor: Greek homepage and About created, headings translated, all six Greek main-menu labels translated and two items re-pointed at the new Greek pages, a news article translated, a deliberate cross-language link picked (Greek page → English page), site title and address set, then export, duplicate, and backup/restore.

**Verified in the generated site:** the Greek navigation renders the Greek menu at root, `el/` and `el/news/` depth with the right relative prefixes; the cross-language link resolved correctly; hreflang is symmetric on pages and on the translated article; the language switcher is right at every depth, including the homepage fallback for a page with no sibling; and **419 anchors across 19 pages had no broken or empty links**, with the sitemap matching the shipped files exactly in both directions. The manifest reported the collection counts R7 introduced, matching what shipped. The backup carried exactly one media-metadata entry and the restore left none behind, as R8 requires. Duplicate and restore each returned the whole project under their own identity rules, and the source was unchanged after both.

**Method:** the editor work was manual. Backup and restore went through the same endpoints the UI calls, because the file picker could not be driven from the test browser — the controller path is identical, the picker interaction is not covered. Everything after the export was checked by scripts written for the occasion; they verify those artifacts and are not part of the test suite.

The walkthrough did not certify every aspect of editor usability; separate design observations were outside its functional scope.

The legacy single-language upgrade path, which this walkthrough left open, was completed the same day — see [the legacy-upgrade check](#the-legacy-upgrade-check).

## The legacy-upgrade check

Completed 2026-09-20 against a **real backup taken before multilingual support existed**. The project — an Arch/`bedrock` site with six pages, two menus, six collection items and 37 media originals — was imported by its owner; the reviewer checked rendering, 23 stored references and recognition as English-only. The checks below ran on a **disposable duplicate**; the owner's project was fingerprinted before and after and is byte-for-byte unchanged.

| Check | Result |
| --- | --- |
| Edit, save, reopen | Persisted. Only the edited page's timestamp moved; the saved page still stores no `language` field, as the flat legacy shape requires. |
| Export | **Original addresses preserved** — every page at the root, no `en/` folder. 96 distinct image references, none missing. The old-theme logo-link defect is described below. |
| Back up and restore | 402 files in, 402 out, **zero content differences**; identities kept, the edit survived, 37 media rows restored, no leftover metadata file. |
| Add a language | Writes only the new language's menus and header/footer — **four files added, nothing in the existing English content changed**. |
| Translate a page | The translated page takes its own identity, joins the source's group, stores no language field; the English original is untouched. |
| Theme update 0.9.9 → 0.9.10 | 60 theme files changed, 4 added, none removed. **Nothing of the author's touched** in either language. All 58 preset defaults preserved, one new setting added. No working directories left behind. |

**The one defect found was the theme, not the upgrade.** The first export had six broken links: the header logo on each collection item page pointed at `index.html`, which one level down resolves to a page that does not exist. Arch 0.9.9 hardcodes that href; 0.9.10 uses the depth-aware `page_url` filter. Applying the theme update fixed it — the re-export went from six broken links to **237 anchors with none broken and no missing images**. A legacy project therefore arrives carrying whatever its theme version carried, and the update is the remedy the product already offers.

**Method.** The editor work was manual through the UI. Backup and restore went through the same endpoints the UI calls, because the import file picker cannot be driven from the test browser — the controller path is identical, the picker interaction is not covered. The export checks (link sweep, image resolution, address comparison, before/after fingerprints) were scripts written for the occasion; they verify those artifacts and are not part of the test suite.

**What this establishes, and what it does not.** One real backup, one theme, one preset, taken end to end: import, edit, export, back up, restore, add a language, translate, theme update, export. It is evidence from a real project rather than a fixture, and it is not a survey of every legacy project shape.
