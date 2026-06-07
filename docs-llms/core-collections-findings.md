# Collections Implementation Review Findings

Review date: 2026-06-02  
Branch reviewed: `collections`

This review treats `docs-llms/core-collections.md` as the feature contract and
cross-checks the implementation across collection storage, API, rendering,
Liquid filters/tags, export, menus, preview, media usage, presets, and theme
updates.

## Findings

### 1. Bulk delete can delete files outside the collection — ✅ Resolved (2026-06-05)

Simple: the bulk-delete endpoint trusts body values as filenames.

`itemSlugs` is validated only as an array, not as safe slugs. The service then
passes each value into `getProjectCollectionItemPath()` and calls `fs.remove()`.
A malicious or malformed body such as `["../../pages/index"]` can escape
`collections/<type>/` and remove another project file.

Evidence:

- `server/routes/collections.js:62` validates only `body("itemSlugs").isArray({ min: 1 })`.
- `server/services/collectionService.js:777` iterates raw body values.
- `server/services/collectionService.js:778-781` builds the path and removes it.

Impact: high. This is a destructive path traversal/data-loss bug.

Suggested fix: validate every `itemSlugs.*` with the same slug regex as route
params, and defensively re-check inside `bulkDeleteCollectionItems()` before
path construction.

**Resolution:** Added a `slugBody` validator in `server/routes/collections.js`
that applies `^[a-z0-9-]+$` to each `itemSlugs.*` element (and `order.*` on the
reorder route, which had the same untrusted-array gap). Added a belt-and-braces
re-check inside `bulkDeleteCollectionItems()` that pushes invalid slugs to the
partial-failure `errors` array instead of building a path. Regression test
`bulk-delete cannot escape the collection dir via a traversal slug` in
`server/tests/collectionApi.test.js` confirms a `../../pages/victim` slug is
rejected and the out-of-collection file survives.

### 2. Collection richtext and link fields bypass sanitization — ✅ Resolved (2026-06-06)

Simple: collection item values are rendered like widget values, but are not
sanitized like widget values.

`buildCollectionItemData()` copies schema field values directly into item
settings. Widget rendering uses `sanitizeWidgetData()` to sanitize `richtext`
and `link` fields before templates render `richtext | raw` or link `href`s.
Collection rendering currently skips that equivalent step. The shipped Aegean
item templates render richtext descriptions with `| raw` and output link hrefs.

Evidence:

- `server/services/collectionService.js:603-618` copies incoming values into
  `settings` without type-based sanitization.
- `server/services/sanitizationService.js:61-78` documents and implements the
  existing richtext/link protection model for widget data.
- `themes/aegean/collection-types/accommodation/template.liquid:123` renders
  `item.settings.book_link.href`.
- `themes/aegean/collection-types/accommodation/template.liquid:162` renders
  `item.settings.description | raw`.
- `themes/aegean/collection-types/excursion/template.liquid:184` does the same
  for excursion descriptions.

Impact: high. This can become XSS in preview and exported static sites.

Suggested fix: add a collection-item sanitizer that walks schema fields and
applies the same rules as widget settings: sanitize `richtext`, block dangerous
link protocols, leave `code` intentionally raw, and rely on Liquid autoescape
for text/textarea.

**Resolution:** Added `sanitizeCollectionItemData(item, schema)` in
`server/services/sanitizationService.js`, reusing the same per-type rules as
`sanitizeWidgetData` (richtext → DOMPurify, link → block `javascript:`/`data:`/
`vbscript:`, text/textarea → Liquid autoescape, code → raw). Introduced a single
render gate, `prepareCollectionItemForRender(item, schema, pagesByUuid, prefix)`
in `server/services/collectionService.js`, that resolves links and then
sanitizes (sanitize-after-resolve, so resolved hrefs are validated too — the
widget order). All three collection-item render paths now go through it instead
of the bare `resolveCollectionItemLinks`: the page-list path
(`renderingService.js`), the preview item page (`previewController.js`), and the
export item page (`exportController.js`) — so an item can never reach a template
unsanitized. Tests: `sanitizeCollectionItemData` (10 cases) in
`server/tests/sanitization.test.js` and `prepareCollectionItemForRender` (3
cases, including one asserting the on-disk item is never mutated) in
`server/tests/collectionItems.test.js`. Follow-up (separate ticket): unify the
preview and export item-page render sequences into one shared pipeline, the way
pages share `renderWidget` — these three call sites duplicate that sequence
today.

**Follow-up (review hardening, 2026-06-07):** `sanitizeLink` originally blocked
only a *contiguous* `javascript:`/`data:`/`vbscript:` scheme, so obfuscated hrefs
slipped through — both an embedded control char (a tab inside `javascript`) and a
leading C0 control (e.g. 0x01 or a null byte), since browsers preprocess URLs
(strip leading/trailing C0-or-space, then remove embedded tab/LF/CR) before
resolving the scheme. Extracted a shared `sanitizeHref(href)` in
`sanitizationService.js` that tests the browser-preprocessed form via
`linkPrefixer.normalize` (the WHATWG two-step), returning `""` for a dangerous
scheme. `sanitizeLink` now delegates to it, covering every setting-type `link`
field (widget, theme, collection item). The same `sanitizeHref` is also applied
in `resolveMenuItemLinks` (`renderingService.js`), closing a parallel hole: menu
**custom** links only ran through `stripHtmlTags`, which leaves a bare
`javascript:` string intact — that resolver is shared by standalone nav and
widget/block `menu` settings, so one gate covers all menu render paths. Tests:
embedded + leading-C0 cases at widget and collection level in
`sanitization.test.js`, plus a dangerous/obfuscated custom-link case in
`linkMenuPrefixing.test.js`.

### 3. Invalid collection export errors lose useful details — ✅ Resolved (2026-06-06)

Simple: export detects exactly which collection fields are invalid, then the
HTTP response drops that information.

The export controller builds `err.validationErrors` with collection type, slug,
and field errors, but `exportProject()` returns only `{ error, message }` for
status-coded errors. A UI or API client cannot tell the author which item needs
fixing.

Evidence:

- `server/controllers/exportController.js:214-218` collects per-item errors.
- `server/controllers/exportController.js:234` attaches them to the thrown
  error.
- `server/controllers/exportController.js:938-942` omits them from the JSON
  response.

Impact: medium-high. Export correctly blocks, but the user-facing workflow is
poor and likely forces manual inspection.

Suggested fix: include `validationErrors` in the response for this error, and
teach the export UI to display collection/type/slug/field.

**Resolution:** The HTTP wrapper `exportProject()` now spreads `validationErrors`
into the status-coded JSON response (`server/controllers/exportController.js`),
so the per-item collection/slug/field detail that `exportProjectToDir()` builds
reaches the client instead of being dropped. `ExportCreator.jsx` captures
`err.data.validationErrors` and renders a persistent red panel listing each
offending item (`collection / slug` + `fieldId: reason`); new i18n key
`exportSite.creator.validationTitle`. Test: `collectionItemExport.test.js`
"surfaces per-item validationErrors in the HTTP 400 response" drives the wrapper
and asserts the response body carries the detail. (The frontend panel has no
component test — covered by lint + locale validation.)

### 4. Failed collection exports can still leave files behind — ✅ Resolved (2026-06-06)

Simple: the docs promise validation before disk writes, but the code writes
export directories and site icons first.

`core-export.md` says collection validation happens before any disk write.
Current export code creates output directories and may generate favicon/site
manifest files before it loads and validates collection items.

Evidence:

- `server/controllers/exportController.js:168-171` ensures output directories.
- `server/controllers/exportController.js:174-179` generates site icons.
- `server/controllers/exportController.js:195-235` validates collection items
  after those writes.
- `server/utils/siteIconHelpers.js:117-155` writes favicon and manifest files.
- `docs-llms/core-export.md:189` says validation happens before any disk write.

Impact: medium. Failed exports can leave partial artifacts/directories and make
export history/state confusing, even if no page HTML is emitted.

Suggested fix: move collection validation before `ensureDir()` and
`generateExportSiteIcons()`, or update the docs/tests if partial export
directories are intentional.

**Resolution:** Reordered `exportProjectToDir()` so all read-only setup and both
fail-fast validations (the homepage-`index` check and the two-pass collection
validation) run before the first disk write; `ensureDir()` and
`generateExportSiteIcons()` now sit below a "validation passed" marker. A blocked
export leaves no output directory, favicon, or manifest behind. No doc change —
`core-export.md` already promised validation before any disk write; the code now
matches it. Test: `collectionItemExport.test.js` strengthened to assert a blocked
export leaves no output directory at all (not merely no HTML).

**Follow-up (review hardening, 2026-06-07):** The missing-`template.liquid` check
for `hasItemPages` collections still ran inside the render loop — after the
output dir, favicons, sitemap, and page HTML were written — so a collection with
renderable items but no template left partial artifacts behind. That check now
runs in the pre-write validation pass (fails 400 before any disk write), with a
defensive re-check kept in the render loop; the missing-template test now also
asserts no output directory remains.

### 5. Item templates do not receive the documented context — ✅ Resolved (2026-06-06)

Simple: item templates are documented as receiving `collection`, `page`, and
`project`, but the collection template render only receives `item`.

`renderLiquidTemplate()` is called for the collection type template before the
page-shaped object is built and before layout render context adds `page` and
`project`. The template context is `...baseContext, item`, so theme authors
cannot use the documented `collection` schema object or the page-shaped SEO
object inside `template.liquid`.

Evidence:

- `docs-llms/core-collections.md:325` documents `item`, `collection`, `page`,
  `project`, and the usual context for item templates.
- `server/controllers/exportController.js:581-584` renders the item template
  with `item` only.
- `server/controllers/exportController.js:587` builds `itemPageData` after the
  template has already rendered.
- `server/controllers/previewController.js:382-385` has the same ordering in
  item preview.

Impact: medium. Theme authoring contract is broken; templates that rely on
`collection.displayName`, `page.seo`, or `project.siteTitle` silently render
blank values.

Suggested fix: build `itemPageData` before rendering the item template and pass
`{ ...baseContext, item: resolvedItem, collection: schema, page: itemPageData,
project: projectData }` in both export and preview.

**Resolution:** `buildCollectionItemPageData()` is now built before the item
template render at both sites, and the template context passes
`{ ...baseContext, item, collection: schema, page: itemPageData, project: projectData }`
(export: `exportController.js`; preview: `previewController.js`, which also loads
`projectData` via `projectRepo.getProjectById`, matching the object page
templates receive). No doc change — `core-collections.md` already documents this
context. Tests: `collectionItemExport.test.js` asserts
`collection.displayName`/`project.siteTitle`/`page.slug` render in the export
item template; `preview.test.js` render test covers the preview path.

### 6. Collection item preview resolves page links against the wrong path — ✅ Resolved (2026-06-06)

Simple: item preview asks for project pages using the project UUID where the
page reader expects the project folder name.

`createCollectionPreviewToken()` resolves the active project folder, then calls
`listProjectPagesData(activeProjectId)`. `listProjectPagesData()` expects a
project folder name and reads `data/projects/<arg>/pages`. Export uses the
folder-name path and resolves links correctly, but preview may fail to resolve
`pageUuid` links in collection item settings.

Evidence:

- `server/controllers/previewController.js:314` resolves `folder`.
- `server/controllers/previewController.js:331` calls
  `listProjectPagesData(activeProjectId)`.
- `server/controllers/pageController.js:21-27` treats its argument as the
  project folder/path segment.

Impact: medium. Collection item preview can render dead/blank links while export
renders them correctly.

Suggested fix: call `listProjectPagesData(folder)`.

**Resolution:** `createCollectionPreviewToken()` now calls
`listProjectPagesData(folder)` instead of `listProjectPagesData(activeProjectId)`
(`server/controllers/previewController.js`). The helper reads
`data/projects/<folder>/pages`, so passing the UUID pointed at a missing
directory, returned no pages, and blanked every `pageUuid` link in preview;
export already used the folder name. Test: `preview.test.js` render test asserts
a `pageUuid` link resolves to the page slug (`about.html`) — confirmed it renders
`href=""` with the fix reverted, so the test genuinely guards the regression.

### 7. Standalone site preview cannot navigate to collection item pages — ✅ Resolved (2026-06-07)

Simple: collection item URLs are nested, but preview navigation only understands
root-level `.html` links.

The `| collection` filter emits URLs such as `rooms/suite-caldera.html` for
item pages. The standalone preview link helper only converts `about.html` or
`/about.html` into `/preview/about`; nested `rooms/foo.html` links return
`null`, so clicking collection cards in standalone site preview does nothing.

Evidence:

- `server/services/renderingService.js:538-542` computes nested item URLs.
- `src/utils/previewLinkUtils.js:24-27` only matches one path segment before
  `.html`.
- `src/utils/__tests__/previewLinkUtils.test.js` covers root HTML links but not
  nested item links.

Impact: medium. The site preview cannot follow the collection item links it now
generates.

Suggested fix: extend preview link routing to support nested item paths, e.g.
`/preview/collection/:type/:slug` or another route that can render item preview
from a URL path.

**Resolution:** Frontend-only; no server changes were needed. The link router was
widened in both copies — the testable mirror `src/utils/previewLinkUtils.js` and the
iframe-served twin `src/utils/previewRuntime.js` (served raw from `STATIC_UTILS_DIR`,
so it cannot import the bundle) — so a nested `slugPrefix/slug.html` link resolves to
a new `/preview/collection/:prefix/:slug` route, and `isStandalonePreviewNavigationUrl`
now accepts that shape (still rejecting query/hash). New route component
`src/pages/CollectionItemPagePreview.jsx` (registered in `src/App.jsx`) resolves the
URL `slugPrefix` → collection type via the existing `useCollections()` hook (only
`hasItemPages` collections qualify), loads the saved item with `getCollectionItem`,
and renders it through the existing `previewCollectionItem` → `/render/:token` flow —
the same path the editor "eye" preview uses. No backend change was required because
that token HTML already injects the standalone navigation runtime
(`previewController.js` `injectRuntimeScript(html, "standalone")`), and the injected
link guard calls `preventDefault()` without `stopPropagation()`, so the runtime's
capture-phase handler still posts `NAVIGATE_PREVIEW`. A shared `NAVIGATE_PREVIEW`
listener drives navigation, so item→item and item→page both work; an unknown prefix, a
non-`hasItemPages` collection, or a missing item shows a clean not-found state. Tests:
`previewLinkUtils.test.js` gained nested-item cases for both helpers (the finding
flagged these as absent) — 8 cases pass. Routing the live runtime and the tested mirror
through one shared module remains a deliberate non-goal (the runtime is served raw to
the iframe); the two `getStandalonePreviewTarget` copies now carry cross-reference
comments to keep them in sync.

**Follow-up (unified preview shell, 2026-06-07):** The two standalone preview routes
were unified under a shared parent layout `src/pages/SitePreviewLayout.jsx` (route
`/preview`) that owns the toolbar, device toggle, the single iframe stage (loader +
sandbox + responsive sizing), and the `NAVIGATE_PREVIEW` listener. `PagePreview.jsx`
and `CollectionItemPagePreview.jsx` are now thin child routes (`:pageId` and
`collection/:prefix/:slug`) that only resolve a render token and report it up via the
outlet context. Because the toolbar and stage persist across navigation, page↔item no
longer remounts the chrome (no flash, one consistent loader, identical full-bleed look,
and the item iframe now gets the same `sandbox` as pages). The standalone page preview
no longer renders through `PreviewPanel` — it fetches a standalone token via
`fetchPreviewToken(..., "standalone")` and feeds the shared stage; `PreviewPanel`
remains the page **editor**'s live preview, and the item-editor "eye" modal
(`CollectionItemPreview`) is unchanged.

### 8. Archived schema fields are preserved but not exposed to users

Simple: dropped schema fields are kept in memory and on disk, but the editor
does not show them or provide the documented discard action.

The service returns `_archived` values for settings no longer in the schema, and
the docs promise an "Archived data" notice plus a confirmed "Discard archived
data" action. The form initializes only `slug` and current `settings`, and then
renders only current schema settings.

Evidence:

- `server/services/collectionService.js:352-369` builds and returns
  `_archived`.
- `src/components/collections/CollectionItemForm.jsx:64-68` initializes form
  state without `_archived`.
- `src/components/collections/CollectionItemForm.jsx:260-271` renders only
  `allSettings`.
- `docs-llms/core-collections.md:199` documents the notice and discard action.

Impact: medium-low. Data is preserved, but the migration UX promised by the
docs is missing; users cannot inspect or explicitly discard orphaned data.

Suggested fix: add archived-data UI to `CollectionItemForm` and a server-side
discard path that intentionally removes archived keys.

### 9. Live widget morphs do not get the documented menu active-state context

Simple: full preview/export set `currentCanonicalPath`, but single-widget live
updates do not.

The docs say `currentCanonicalPath` is wired into every render path, including
the morph path. `/api/preview/widget` creates globals with only render mode and
asset maps. If a menu-bearing widget is re-rendered by live morph, menu active
state falls back to an empty canonical path.

Evidence:

- `docs-llms/core-collections.md:266` documents `currentCanonicalPath` on every
  render path.
- `server/controllers/previewController.js:424-432` creates single-widget
  globals without `projectId`, `apiUrl`, `pageSlug`, or `currentCanonicalPath`.
- `server/services/renderingService.js:498-499` defaults missing
  `currentCanonicalPath` to `""`.
- `src/core/snippets/menu.liquid:21-28` compares menu `canonicalPath` to
  `currentCanonicalPath`.

Impact: low-medium. Full reloads are correct, but live preview morphs can show
wrong menu active state until the preview reloads.

Suggested fix: include the current page slug/canonical path in the
`/api/preview/widget` request body, or force full reloads for widgets that render
menu settings.

### 10. Collection `menu` fields store a menu UUID but do not render as menu data

Simple: collections say they support the `menu` setting type, but item templates
only receive the raw stored menu value.

Collection schemas are allowed to use every setting type in
`supportedSettingTypes.js`, including `menu`. The collection form can render a
menu picker and store the selected menu's UUID. Widget rendering has special
schema-aware logic that turns menu setting values into resolved menu objects
with `items`, depth-aware links, and active-state data. Collection item rendering
only resolves `link` objects, so a collection template that tries to render a
menu setting gets a UUID string instead of the menu object expected by the menu
snippet.

Evidence:

- `docs-llms/core-collections.md:125` lists `menu` as a supported collection
  setting type.
- `src/components/settings/inputs/MenuSelectInput.jsx:7` documents that the
  menu input stores the menu's stable UUID.
- `server/services/renderingService.js:698-767` resolves `menu` settings for
  widgets and blocks.
- `server/services/collectionService.js:914-923` resolves collection item
  settings only when they are link objects.
- `src/core/snippets/menu.liquid:20-28` expects a menu object with `items`, not
  a raw UUID string.

Impact: low. No shipped collection schema appears to use `menu`, but the
documented "all setting types" contract is incomplete for collection templates.

Suggested fix: either document/reject `menu` fields for collection schemas in v1,
or resolve schema-declared `menu` settings before item template render using the
same menu-map/page-link/depth-prefix logic as widget rendering.

### 11. Menu editor cannot select collection item pages as stable targets

Simple: collection item pages can exist, but menu authors cannot pick them from
the menu editor's page selector.

The menu structure editor loads only normal pages from `/api/pages` and turns
those into `pageUuid`-backed options. A user can manually type a collection item
URL such as `portfolio/project-alpha.html`, and depth-aware export can prefix it
as a custom URL, but it remains a plain string. It will not update if the
collection item slug changes, and it will not be cleaned up if the collection
item is deleted.

Evidence:

- `src/components/menus/MenuEditor/index.jsx:78-90` fetches only `getAllPages()`
  and builds page options from page UUIDs.
- `src/components/menus/MenuEditor/SortableItem.jsx:79-103` stores `pageUuid`
  only when the selected value matches one of those page options; otherwise it
  treats the value as a custom URL.
- `src/components/menus/MenuEditor/MenuCombobox.jsx:88-90` tells users "No
  matching pages found" and falls back to typed custom links.
- `server/services/renderingService.js:217-250` can depth-prefix custom menu
  links, but there is no collection-item stable reference equivalent to
  `pageUuid`.

Impact: medium-low. Collection item pages remain linkable by hand, but they are
not first-class navigation targets and can drift when item slugs change.

Suggested fix: extend the menu target picker to include `hasItemPages`
collection items, and decide whether to add stable item references
(`collectionType` + item `uuid`) that resolve to the current item slug at render
time.

### 12. Collection item SEO is not at parity with page SEO

Simple: pages and collection item pages both produce SEO tags, but users edit
different SEO controls for each one.

Normal pages have a dedicated `seo` object and a page form section for meta
description, social title, social image, canonical URL, and the full robots
choice. Collection item pages currently get SEO through collection schema
conventions: `seo_title`, `seo_description`, `seo_noindex`, and one image field
marked with `usedAsOgImage`. The render/export layer then maps those fields into
a page-shaped SEO object. That means collection items do not expose the same
canonical, robots, social-image, Open Graph, and Twitter-card controls that page
authors already know.

Evidence:

- `src/components/pages/PageForm.jsx:36-43` initializes the page `seo` object
  with `description`, `og_title`, `og_image`, `og_type`, `twitter_card`,
  `canonical_url`, and `robots`.
- `src/components/pages/PageForm.jsx:170-224` renders the existing page SEO
  editor controls.
- `docs-llms/core-collections.md:112-114` documents collection item SEO as a
  field-id convention rather than a dedicated SEO model.
- `server/services/collectionService.js:939-973` maps collection item convention
  fields into SEO output, with `og_type` and `twitter_card` fixed and canonical
  generated from `siteUrl`.
- `themes/arch/collection-types/portfolio/schema.json:20-23` and
  `themes/aegean/collection-types/accommodation/schema.json:72-75` expose only
  the reduced convention fields in shipped collection schemas.

Impact: medium. The generated tags are mostly present, but the authoring model
is inconsistent. Users who understand page SEO will reasonably expect collection
item pages to offer the same controls, especially because those items export as
real pages and can appear in sitemap/robots output.

Suggested fix: streamline collection item SEO around the existing page SEO
functionality. Reuse the same SEO field shape, validation rules, media picker,
robots options, canonical handling, translations, and render/export mapping
wherever possible, while keeping sensible defaults for collection schemas and
presets.

## Checks Performed

- `git diff --check master...HEAD` passed.
- Targeted backend subset passed: 263 tests across collections, collection API,
  filters, export, preview, media usage, presets, theme updates, and theme
  upload validation.
- Targeted frontend subset passed: 25 tests across preview link utilities,
  collection query manager, and media usage display.
- `npm run lint` passed.

## Notes

- Theme update ownership looks directionally correct: `collection-types/` is
  treated as theme-owned and replaced on update, while `collections/` is
  protected user content.
- Link enrichment for project creation, project duplication, and deleted page
  cleanup does include collection items.
- The `| collection` filter, depth-aware export paths, sitemap/robots/manifest
  integration, media usage source strings, and Aegean theme consumer are broadly
  implemented, but the findings above should be addressed before considering
  the feature contract complete.
