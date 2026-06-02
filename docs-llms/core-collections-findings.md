# Collections Implementation Review Findings

Review date: 2026-06-02  
Branch reviewed: `collections`

This review treats `docs-llms/core-collections.md` as the feature contract and
cross-checks the implementation across collection storage, API, rendering,
Liquid filters/tags, export, menus, preview, media usage, presets, and theme
updates.

## Findings

### 1. Bulk delete can delete files outside the collection

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

### 2. Collection richtext and link fields bypass sanitization

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

### 3. Invalid collection export errors lose useful details

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

### 4. Failed collection exports can still leave files behind

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

### 5. Item templates do not receive the documented context

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

### 6. Collection item preview resolves page links against the wrong path

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

### 7. Standalone site preview cannot navigate to collection item pages

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
