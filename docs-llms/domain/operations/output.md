# Preview and static-site output

[Map](../README.md) · [Output entities](../entities/output.md) · [Coverage](../coverage.md#themes-and-output)

## Plain-language guide

### Checking your work in preview

The preview inside the editor shows the work you are editing, including unsaved changes. You can inspect different screen-size views without publishing anything.

The separate site preview opens saved content. Save first if you want it to include the latest changes. Follow page or article links there to inspect navigation in the intended language.

Previews are temporary views. A preview may need reopening or reloading after it expires or after you save newer content. A preview link is not a permanent public website address.

### Building website files

**You begin with:** saved pages, collection entries, shared content and settings.

**Widgetizer checks:** whether the required homepage and other necessary content/design pieces are available. Missing required collection information can stop the build.

**Widgetizer produces:** website pages, images and supporting files, recorded as a new export version. It can generate full article pages and additional pages for long listings, rather than asking you to create each generated page manually. An optional choice also produces Markdown copies of pages.

**You end with:** files that you can view or download and deploy to your web host. Creating a local export does not by itself replace a website already hosted elsewhere.

### Managing exports

| Action | What happens |
| --- | --- |
| View history | Shows previous builds and their recorded results. |
| Inspect or view an export | Opens the files from that particular build, not your latest unsaved editor work. |
| Download | Packages that build's website files into an archive. |
| Delete an export | Removes that local build and its history entry; your editable project remains. |
| Keep a limited number | Lets retention settings remove older locally managed builds. |
| Back up the project | Creates a different archive meant for restoring editable content in Widgetizer. |

A website export is not a substitute for an editable-project backup.

### Which languages are included?

Open the right language when previewing; two languages can have pages with the same address name but different content.

The default language must have a homepage or the whole export stops. Each additional enabled language is included only if it has its own homepage. Otherwise, its pages and collection entries are left out of that build, and the export result names the skipped language. Its editable content stays in the project.

Included languages use their own pages, entries, header and footer. A Greek news list shows Greek entries only; if there are none, it does not borrow English articles. A long list is split according to that language's own entries, so English and Greek can have different numbers of listing pages.

A translated contact form also has a separate exported identity, even when it keeps the same form name. Translating its labels does not merge it with the original form. The actual handling of submissions depends on the system serving the exported website.

A homepage is the inclusion rule, not a translation-quality check: copied English text inside a Greek page can still be exported. Check the content and copied navigation destinations before publishing. The Arch theme's visitor language selector and localized month names remain pending; see the status below.

### If a build fails

Some missing-content checks stop the export before files are generated. A later failure can happen after work has started. Check the recorded result and reported problems, fix the relevant content or settings, and build again. The presence of a folder or an old successful export does not establish that the new build succeeded.

### Example

Save a changed article, open its standalone preview, then build and download a new export. The old export stays a snapshot of the earlier article until retention or deletion removes it.

## Technical details

## Preview

| Action | Inputs and result |
| --- | --- |
| Render editor page | Submitted page/global/theme state and project context produce preview HTML |
| Render one widget | Widget data/schema and context produce an incremental preview fragment |
| Create page token | Resolve/render the requested page/language; store temporary HTML by token |
| Create item token | Resolve collection type/item/language and compose its item page |
| Fetch token | Serve the saved HTML snapshot; missing/expired token cannot retrieve a live page |
| Navigate standalone preview | Translate internal output targets to explicit page/item preview routes, including language and pagination |
| Serve assets | Resolve permitted project asset paths; does not save page content |

Preview and export share rendering primitives but differ in runtime injection, navigation and asset URLs. A passing preview test does not by itself verify published URLs, SEO artifacts, or exported assets.

Implementation: [previewController](../../../packages/builder-server/src/controllers/previewController.js), [previewTokenStore](../../../packages/builder-server/src/services/previewTokenStore.js), [renderEngine](../../../packages/render-engine/src/renderEngine.js), [standalonePreviewTarget](../../../packages/core/src/runtime/standalonePreviewTarget.js), [app preview routes](../../../app/src/previewRoutes.jsx).

## Static-site export

**Before output writes:** resolve the project and theme settings, enumerate pages, require the root `index` homepage, select enabled languages with homepages, and validate collection items and required templates across all included languages. An invalid translated item can stop the entire build. A collection with no renderable items in any included language needs no item-page template. Fail-fast validation is intended to prevent half-built output for these known invalid inputs; forms validation occurs later in the build.

Under the project's export-operation lock, allocate the next version, render pages and pagination output, render enumerated item pages, process assets and media, produce configured Markdown and SEO/forms/manifest artifacts, and record the result. Asset URLs and internal hrefs depend on depth and Clean URLs. Export history and retention are managed separately from editable content.

| Follow-up action | Effect |
| --- | --- |
| List history / inspect files | Read generated-version metadata and contents |
| View export | Serve confined bundle paths, with extensionless/index fallbacks |
| Download | ZIP the generated bundle |
| Delete version | Remove generated directory and history entry |
| Retention cleanup | Remove older generated versions according to settings |
| Delete project | Coordinate export cleanup with project deletion under the same lock |

Preflight failure, rendering failure, asset-copy fallback, failure recording, and cleanup failure are distinct outcomes. See existing [export details](../../core-export.md) and the relevant suites rather than assuming one transaction covers the entire filesystem build.

## Multilingual boundary at this snapshot

Reviewed through `1775a245`: step 20 (`0d4815ba`) completes multilingual export selection/artifacts; step 21 (`1775a245`) makes collection listings and pagination use the rendered language. These replace the earlier provisional export notes.

| Area | Current behavior |
| --- | --- |
| Export eligibility | Root `index` is mandatory. Additional enabled languages without a homepage are omitted as a whole and returned as `LANGUAGE_SKIPPED` warnings; the export UI displays them, including after the first export changes the screen layout. |
| Pages and item pages | Default output stays at the root; other languages use `<language>/`. An item uses `<language>/<collection-prefix>/<slug>.html`. Optional Markdown sits beside the corresponding HTML. |
| Shared sections | Each page/item uses its language's header/footer. A missing section renders nothing; it does not inherit the previous rendered page's section. |
| Listings | Items, ordering, valid-item counts and pagination belong to the current language. No default-language item fallback. Item URLs and bare menu-slug selections also resolve with language context. |
| Pagination | Counts and generated destinations remain in the listing's language in full preview, individual widget updates and export. Different languages can produce different page counts. |
| Canonicals | Automatic page/item addresses include the language folder and respect Site URL/Clean URLs. An explicit canonical wins on the first page; generated pagination copies use their own addresses. |
| Sitemap and robots | Describe included languages and their generated listing pages, respecting existing `noindex` rules. Language folders and any Site URL subfolder are retained. A usable Site URL is required for these artifacts. |
| Alternates | Page/item translation groups supply ordinary hreflang alternates for actual siblings, excluding homepage fallbacks. `x-default` points to the default-language destination and may use its homepage fallback. Sitemap pagination copies have their own entries without translation alternates. |
| Forms | Default form keys stay unchanged; additional languages use `<language>:<form-key>`. The rendered form and manifest agree, and the manifest records the language-qualified page path. Identical names across languages therefore stay separate. |
| Collection summary | `manifest.collections[].itemCount` still counts default-language items. It is not an all-language total even though export renders other languages' items. |

### Remaining phase 5

These steps are pending at this baseline; they are not export implementation gaps from steps 20–21.

| Step | Remaining work and handbook follow-up |
| --- | --- |
| 22 — Arch | Build the visible header language selector from `page.translations` and extract remaining hardcoded visitor-facing text. Recheck theme controls and language navigation after it lands. |
| 23 — localized months | Replace the English month lookup tables with locale-aware formatting and pass the page language to the date filter. Until then, changing content language does not localize month names. |
| 24 — upgrade verification | Verify existing projects keep their default-language content and output without manual migration. Focused single-language assertions exist; they do not replace the upgrade check. |
| 25 — documentation | Reconcile architecture/packages references, the theme-facing translation contract and the user-test checklist with the completed implementation. |

Source: [exportProjectToDir](../../../packages/builder-server/src/controllers/exportController.js), [collection rendering](../../../packages/builder-server/src/services/renderingService.js), [pagination/rendering](../../../packages/render-engine/src/renderEngine.js), [SEO artifacts](../../../packages/builder-server/src/services/seoArtifacts.js), [forms manifest](../../../packages/builder-server/src/services/formsManifestService.js), [published URLs](../../../packages/core/src/utils/publishedUrls.js), [date formatting](../../../packages/core/src/utils/dateFormat.js).

Focused assertions inspected and tests passed: [multilangExport](../../../packages/builder-server/src/tests/multilangExport.test.js), [collectionFilter](../../../packages/builder-server/src/tests/collectionFilter.test.js), [paginationExport](../../../packages/builder-server/src/tests/paginationExport.test.js), [previewLanguages](../../../packages/builder-server/src/tests/previewLanguages.test.js), and the three package/UI suites listed in [validation details](../coverage.md#latest-validation). This is focused evidence, not full multilingual sign-off.

Tests located: [export](../../../packages/builder-server/src/tests/export.test.js), [collectionItemExport](../../../packages/builder-server/src/tests/collectionItemExport.test.js), [paginationExport](../../../packages/builder-server/src/tests/paginationExport.test.js), [cleanUrlsExport](../../../packages/builder-server/src/tests/cleanUrlsExport.test.js), [seoArtifacts](../../../packages/builder-server/src/tests/seoArtifacts.test.js), [structuredDataExport](../../../packages/builder-server/src/tests/structuredDataExport.test.js), [formsManifest](../../../packages/builder-server/src/tests/formsManifest.test.js), [preview](../../../packages/builder-server/src/tests/preview.test.js).
