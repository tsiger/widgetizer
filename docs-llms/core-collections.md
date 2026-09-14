# Collections

Collections are theme-defined content types — News, Projects, Services, Team, FAQ, etc. — that let an end user manage many uniform records ("items") and, optionally, render one page per item. A theme ships the **collection-type** definitions (the schema + an optional page template); the project owner authors **items** against them in the editor.

This document describes the shipped subsystem on the workspace-package architecture: every stateful operation is **scope-first** and routes through the storage adapter, the `| collection` Liquid filter reads from the render context (never by importing the backend), and item pages render at `slugPrefix/itemSlug/` depth through the pure render engine. For the adapter/`Scope`/`LIMIT_KEYS` contract see [Packages & Adapter Architecture](core-packages.md); for the field setting types see [Setting Types](theming-setting-types.md).

---

## 1. Collection types (theme-owned schemas)

A collection type is defined by `collection-types/{type}/schema.json` in the theme (copied into the project on creation/seed). Types are **theme-owned**: there is no "create a collection type" API — the set of types a project has is whatever its theme seeded.

**Top-level schema keys** (validated by `validateCollectionSchema`):

| Key | Notes |
|---|---|
| `type` (required) | Machine id; must match `^[a-z0-9-]+$` and the folder name. |
| `settings` (required) | Array of field definitions (the item's editable fields). |
| `displayName` / `displayNamePlural` | Human labels (singular / plural). |
| `icon` | Icon identifier for the sidebar nav. |
| `slugPrefix` | URL/output prefix; defaults to `type`; must match `^[a-z0-9-]+$`; `assets` is reserved. |
| `hasItemPages` | `true` → each item renders a standalone page (requires a `template.liquid`). |
| `defaultSort` | One of `manual`, `created_desc`, `created_asc`, `title_asc`, `title_desc`, `date_desc`, `date_asc`. |
| `schemaVersion` | Carried onto items as-is (used for migration bookkeeping). |

**Field rules:**

- **Allowed field types** are the standard editor setting types — validated via `isSupportedSettingType` against `SUPPORTED_SETTING_TYPES` (`packages/core/src/config/settingTypes.js`), the single source of truth shared with the editor's `SettingsRenderer`. An item is a **flat record**, so the repeater-style keys `multiple`, `repeater`, and `blocks` are **disallowed** (use a `table` or `gallery` for repetition within a field). For the per-type authoring shapes — including the `richtext` toolbar options — see [Setting Types](theming-setting-types.md).
- **`usedAsTitle: true`** — exactly one field, which must be `text`. It supplies the item's title and the auto-generated slug.
- **`usedAsDate: true`** — at most one field, which must be `date`. It becomes the sort key for `date_desc` / `date_asc` (items with a blank date sort last).
- **`required: true`** — the item fails validation until the field has a non-empty value.
- **`table`** columns are `text`-only in v1; each column id must match `^[a-zA-Z][a-zA-Z0-9_]*$` and must not be `__proto__` / `constructor` / `prototype`.

---

## 2. Storage layout (relative keys via the adapter)

The service never builds absolute paths. It computes **relative keys** and hands them to the storage adapter with `scope`, which confines them under the per-tenant project root (OSS: `data/projects/<folderName>/`; hosted: the tenant's storage prefix) and runs the traversal guard:

```js
collection-types/{type}/schema.json      // type definition (theme-seeded)
collection-types/{type}/template.liquid  // item-page template (when hasItemPages)
collections/{type}/{slug}.json           // one file per item
collections/{type}/_order.json           // manual ordering (defaultSort: "manual")
```

Schemas and templates live on the **collection-type** path (seeded from the theme); authored item data lives on the **collections** path.

**Item record shape** (`collections/{type}/{slug}.json`):

```json
{
  "id": "…",
  "uuid": "stable-uuid",
  "slug": "my-first-post",
  "schemaVersion": 1,
  "created": "2026-06-18T10:00:00.000Z",
  "updated": "2026-06-18T10:05:00.000Z",
  "settings": { "title": "My First Post", "body": "<p>…</p>" },
  "seo": { "description": "…" }
}
```

`uuid` is stable across renames (internal links target it). `created` is never mutated; `updated` is monotonic. `seo` is present only for `hasItemPages` types. Out-of-schema keys left by a schema change are retained on disk and surfaced as **archived** data until explicitly discarded (no silent data loss on read).

---

## 3. Service API (`collectionService.js`, scope-first)

`packages/builder-server/src/services/collectionService.js`. Every stateful function takes `(storage, scope, …)`; the pure helpers take plain data.

**Schema reads** — `listCollectionSchemas(storage, scope)`, `getCollectionSchema(storage, scope, type)`, `loadCollectionTemplate(storage, scope, type)`. Pure validation: `validateCollectionSchema(schema, folderName)`, `validateThemeCollectionSchemas(themeSourceDir)` (theme-upload gate).

**Item CRUD** — `listCollectionItems(storage, scope, type, { sort, limit, offset })`, `readCollectionItem(…)`, `readRawCollectionItem(…)` (preserves archived settings), `writeCollectionItem(storage, scope, type, item, previousSlug)` (create / update / rename), `deleteCollectionItem(…)`, `bulkDeleteCollectionItems(…)`, `duplicateCollectionItem(…)` (fresh uuid + timestamps), `discardArchivedCollectionItem(…)`.

**Validation / normalization (pure)** — `normalizeCollectionItem(rawItem, schema)` (adds `title`, `invalid`, `validationErrors`, `_archived`), `buildCollectionItemData(schema, input, existingItem)` (throws `CollectionValidationError` / `CollectionSlugConflictError`).

**Render prep / links / order** — `prepareCollectionItemForRender(item, schema, pagesByUuid, outputPathPrefix, menuDeps, mediaBasePaths)` (resolve links/menus, sanitize, resolve richtext media), `resolveCollectionItemLinks(…)`, `loadCollectionItemsByUuid(storage, scope)` (uuid → `{ slugPrefix, slug }`), `reorderCollectionItems(storage, scope, type, order)`, `buildCollectionItemPageData(schema, item, siteUrl)`. `menuDeps.cleanUrls` selects the emitted shape (`pageHref` / `itemHref` in `@widgetizer/core/internalHref`); custom hrefs are emitted as authored.

`normalizeCollectionItem` separates any out-of-schema key into an in-memory `_archived` map and re-checks every `required` field, setting `invalid: true` plus a per-field `validationErrors` list — so the editor can surface stale data and missing values on read without rewriting the file. `listCollectionItems` additionally **recovers from duplicate-uuid rename crashes**: if two files share a `uuid` (the gap between writing the new slug and deleting the old one), the one with the newer `updated` wins and the loser is excluded from the listing but never deleted (a save cleans it up via `cleanupDuplicateUuidSiblings`).

The `slug` rule (`^[a-z0-9-]+$`) is enforced in `buildCollectionItemData` as defense-in-depth, independent of the route-layer validation below.

---

## 4. Routes & tenant isolation

Mounted in `setupBuilderServer.js` as `projectScopedRouter.use("/collections", collectionsRoutes)`, so collections inherit the same isolation as pages/menus/media — including in hosted, which mounts the same `projectScopedRouter` (no hosted-specific collection route). `resolveActiveProject` runs first and supplies `req.scope` + `req.adapters`; the write-guard rejects a `:projectId` / `X-Project-Id` ≠ `scope.projectId` with `409 PROJECT_MISMATCH`. The `:collectionType` and `:itemSlug` params are validated against `^[a-z0-9-]+$` at the route layer.

| Method | Path (under `/collections`) | Controller |
|---|---|---|
| GET | `/schemas` | list all type schemas |
| GET | `/schema/:collectionType` | one type schema |
| GET | `/:collectionType` | list items (`?sort=&limit=&offset=`) |
| GET | `/:collectionType/:itemSlug` | one item |
| POST | `/:collectionType` | create item |
| PUT | `/:collectionType/:itemSlug` | update / rename item |
| DELETE | `/:collectionType/:itemSlug` | delete item |
| POST | `/:collectionType/bulk-delete` | `{ itemSlugs: [] }` |
| POST | `/:collectionType/:itemSlug/duplicate` | duplicate item |
| POST | `/:collectionType/:itemSlug/discard-archived` | drop archived out-of-schema settings |
| POST | `/:collectionType/reorder` | `{ order: [] }` (manual ordering) |

**Status codes:** validation failure → `400` (`{ error, validationErrors }`); slug conflict on create/rename → `409` (`{ error, conflictingSlug }`); per-collection item cap exceeded → `422` (see §7). Writes set `Cache-Control: no-store`.

---

## 5. The `| collection` Liquid filter

`packages/core/src/filters/collectionFilter.js` lets a theme template pull items:

```liquid
{% assign posts = 'news' | collection: limit: 6, sort: 'date_desc' %}
{% for post in posts %}
  <a href="{{ post.url }}">{{ post.settings.title }}</a>
{% endfor %}
```

- **Options:** `limit`, `offset`, `sort` (one of the `defaultSort` values).
- **Returned item shape:** `{ id, uuid, slug, url, created, updated, settings }`. `settings` is already link-resolved and sanitized.
- **`url`** is computed, not stored: `null` when `hasItemPages` is `false`; otherwise `itemHref(slugPrefix, slug, { cleanUrls, outputPathPrefix })` — `` `${outputPathPrefix}${slugPrefix}/${slug}.html` ``, or the extensionless `` `${outputPathPrefix}${slugPrefix}/${slug}` `` when the project's Clean URLs setting is on — so it is correct at whatever depth the current page renders.
- **Purity:** the filter reads items via a `getCollectionItems(type, args)` loader injected on the render `globals`. Core/render-engine never import builder-server — the shell supplies the loader (`buildRenderDeps` in OSS, `buildCloudRenderDeps` in hosted), and the loader is the only thing bound to `{ storage, scope }`.
- **Pagination slice:** while the page's paginating widget renders, `globals.collectionSlice` (`{ collectionType, offset, limit }`) overrides those two options for that collection only — see §5b.

---

## 5a. Listing pages and the anchor

A widget that lists a collection declares it at the top of its `schema.json`:

```json
"collection": { "type": "news" }
```

The template already names the collection (`'news' | collection`), but only at
render time — the declaration is what lets code outside the render know which
pages list what. `indexListingPages` (`packages/core/src/utils/breadcrumbs.js`)
walks every page's widgets against the widget schemas and returns, per collection,
the pages that list it and which one is its **anchor**.

The anchor is the `listing_anchor` boolean on the listing widget's settings,
surfaced by the editor as *"Main {displayNamePlural} page"* on any widget whose
schema declares a collection (the setting is injected by `SettingsPanel.jsx`, not
declared per widget). It marks that page as the collection's home: breadcrumbs
hang the collection's items under it. With no anchor and exactly one page listing
the collection, that page is used; with two and no anchor the relationship is
ambiguous and items sit directly under Home.

**One anchor per collection.** Enforced server-side when a page is saved
(`clearListingAnchorsElsewhere` in `pageController.js`), not when the checkbox is
ticked: the editor holds the change until save, so clearing another page earlier
would strip its anchor for an edit the user might discard. The save response
carries `listingAnchorMovedFrom` with the names of the pages it cleared, which
the editor announces. A duplicated page starts unclaimed — it is written directly
and the sweep never sees it (duplicating or pasting a widget in the editor clears the flag too). A duplicated *project* keeps its anchors, since the
whole hierarchy is copied and stays internally consistent. If data ever holds two
anchors anyway, the first page by slug wins so every render agrees.

Pagination leans on the anchor: a paginating widget always holds it, and when the
sweep takes the anchor from a page it also turns that page's `paginate` off (§5b).

---

## 5b. Pagination

A listing widget can split its page into numbered copies. The schema names the setting that holds items per page:

```json
"collection": { "type": "news", "perPageSetting": "limit" }
```

`SettingsPanel.jsx` then injects a **"Split into pages"** checkbox (`paginate`) beside the anchor checkbox. Turning it on also ticks the anchor, sets items per page to 12 when it was below 1, and refuses (a toast naming the holder) when another widget on the page already paginates. While it is on, items per page cannot drop below 1, and unticking the anchor turns it off.

**Server rules** — `enforcePaginationRules` in `pageController.js`, run by `savePageContent` and by `updatePage` whenever widgets are sent. Items per page (the widget's value, else the schema default) must be a whole number ≥ 1, else `422`. A widget whose schema lacks `collection.type`, a string `perPageSetting` or an array `settings` has `paginate` switched off. Two paginating widgets on one page → `422`. A paginating widget gets `listing_anchor: true`; the anchor sweep then clears the anchor and `paginate` on other pages.

**Planning** — `planPagination(deps, widgets, widgetsOrder, { pageSlug, currentPage })` in `render-engine` picks the first widget that can paginate, counts valid items through `deps.countCollectionItems`, and returns `{ widgetId, collectionType, perPage, totalItems, total, current, pageSlug }` — or `null` when nothing paginates or everything fits on one page, in which case output is unchanged. Callers put the plan on `sharedGlobals.paginationPlan`. Never name it `sharedGlobals.pagination`: render globals are visible to Liquid, so that name would hand a pager object to every widget.

**What the theme gets.** Only the paginating widget's render context carries `pagination`; the layout gets the same object as `page.pagination`.

| field | meaning |
|---|---|
| `current` | page being rendered, from 1 |
| `total` | number of pages (≥ 2 whenever present) |
| `perPage` | items per page |
| `totalItems` | valid items in the collection |
| `prevHref` / `nextHref` | links to the neighbouring pages, `null` at the ends — depth- and Clean-URLs-aware |
| `pages` | `{ number, href, current }` for every page |

The widget keeps calling `'news' | collection: limit: …`; the engine sets `globals.collectionSlice` around that one widget's render, and the filter applies the offset and limit (§5).

**Addresses** — `packages/core/src/utils/contentAddress.js`. Page 1 is the page itself; copies are `<slug>/page/<n>.html`, or `page/<n>.html` for the homepage (`pageOutputPath`), linked with `pagedHref`. `page` is a reserved page and item slug (`isReservedPageSlug`, `isReservedItemSlug`). A collection `slugPrefix` of `page` stays allowed, but export refuses when the homepage paginates and a collection with item pages (`hasItemPages: true`) uses that prefix; a list-only collection never writes there.

**SEO** — `SeoTag.js` gives page 2+ a `Blog - 2 - Site` title, its own absolute canonical (a custom `canonical_url` applies to page 1 only) and `rel="prev"` / `rel="next"` when a Site URL is set. Copies join the sitemap, and robots.txt when the page is noindex. Breadcrumbs on page 2+ end with a numbered crumb (`pageNumber`).

**Preview** — page 2+ opens at `/preview/paged/:pageId/:pageNumber` (`app/src/previewRoutes.jsx`), and the page number travels to `/preview/token` as `pageNumber`. `getStandalonePreviewTarget` maps `…/page/<n>` links there, except a root `page/<n>` when a collection publishes under `page/`; the preview runtime receives those prefixes as `data-collection-prefixes`.

**Consistent reads** — `createCollectionReader({ storage, scope, snapshot })` memoises each collection's read and sorted lists on a `snapshot` Map. One snapshot spans a whole export (validation, sitemap inputs, item links, item pages, listings, page counts) or one page or widget preview request, so an item edited mid-render can neither land on two copies nor be linked without its page being written. Sorts are total: ties fall back to newest `created`, then `uuid`. The collection item preview (`createCollectionPreviewToken`) does not use a snapshot yet: two differently sorted lists in an item preview can read the collection twice.

---

## 6. Item pages & depth prefixing

When `hasItemPages: true` and the type ships a `template.liquid`, each item renders a standalone page one directory deep, so `news/my-post.html` coexists with a root `about.html`.

**Depth model.** On export/publish, the prefix comes from each file's output path (`outputPathPrefixFor` in `linkPrefixer.js`): `""` for root pages, `../` for item pages and homepage copies (`page/2.html`), `../../` for other paginated copies (`blog/page/2.html`); in-editor previews render every page — item pages included — at the preview root with `outputPathPrefix: ""`. The pure helper `prefixInternalHref(href, outputPathPrefix)` (`packages/core/src/utils/linkPrefixer.js`) prepends the prefix to **relative** internal hrefs only — it leaves any URI scheme, protocol-relative (`//…`), anchor (`#…`), query-only (`?…`), and root-absolute (`/…`) href untouched. Menu links resolve through the render-engine `menuResolver.js` with the same depth awareness. Theme Liquid that hand-writes an internal href goes through the `page_url` / `item_url` filters (`packages/core/src/filters/pageUrlFilter.js`), which read `globals.outputPathPrefix` and `globals.cleanUrls` (the project's Clean URLs setting, stamped on the shared globals before any widget template renders) and emit the right shape at the current depth — `{{ 'index' | page_url }}` is `./` / `../` when the setting is on and `index.html` / `../index.html` otherwise. Both globals stay readable for a link neither filter can build. Stored `/uploads/` paths are rewritten on export with the same prefix (`rewriteStoragePaths` in `exportController.js`), e.g. `/uploads/images/ → ../assets/images/` on an item page.

**Link shape.** `packages/core/src/utils/internalHref.js` owns the two shapes: `rooms/suite.html`, or `rooms/suite` when Clean URLs is on; the clean home link is `./` at the root and `../` one level deep. Output file names are always `.html`.

**Page-shaped object** (`buildCollectionItemPageData`): `id = "{slugPrefix}-{slug}"`, `slug = "{slugPrefix}/{slug}"`, `name` from the `usedAsTitle` field, plus a per-item `seo` object at parity with page SEO. The five author-editable SEO fields are `description`, `og_title`, `og_image`, `canonical_url`, and `robots` (defaulting to `index,follow`); `shapeItemSeo` also fills the non-UI defaults `og_type: "article"` and `twitter_card: "summary"`. This lets item pages flow through the same layout, SEO, sitemap, and markdown-export paths as regular pages.

**Render helpers** (`renderingService.js`): `buildCollectionRenderDeps({ storage, scope })` assembles the lazy collection capability (`buildCollectionItemsLoader`, `getCollectionSchemas`, `loadCollectionItemsByUuid`); `renderCollectionItemPageWithDeps(deps, args)` renders one item page (injecting `prepareItem: prepareCollectionItemForRender`, `buildItemPageData: buildCollectionItemPageData`). Export is fail-fast on a bad item; a multi-tenant host that streams publishes may instead warn-and-skip an invalid item (or a `hasItemPages` type with no template) so one bad record can't fail the whole publish.

**Export output:** `{outputDir}/{slugPrefix}/{slug}.html` (+ an optional `{slug}.md` markdown alternate), included in the sitemap.

---

## 7. Limits & sanitization

**Limits** (via the `LimitsAdapter` over `scope`; OSS `LocalLimitsAdapter` returns `Infinity`, hosted `CloudLimitsAdapter` returns finite tier ceilings — see [Cross-Tenant Safety](core-security.md#11-cross-tenant-safety-multi-tenant-host-contract)):

- **`MAX_COLLECTION_ITEMS`** — enforced in `createItem`: at or over the cap returns `422`. This is the per-collection DoS ceiling that bounds export-time enumeration.
- **`MAX_COLLECTIONS`** — a reserved per-project collection-type ceiling. Because types are theme-seeded (no create-type API), there is no creation endpoint to gate; the key exists for hosts that bound seeding/import.

The item slug `index` is reserved (`rooms/index.html` would answer as the collection directory itself, `/rooms/`, as well as `/rooms/index`), and so is `page` (it would sit at `rooms/page` beside a paginated copy `rooms/page/2`); an existing item with either slug keeps saving in place. `home` is special only for pages (a site root) and is an ordinary item slug.

**Sanitization** runs on every item write and again at render (`prepareCollectionItemForRender`), reusing the page pipeline: DOMPurify for `richtext`, `sanitizeImagePath` (strict `/uploads/images/…`) for each `gallery` entry and required-field image validation, `sanitizeImageSettingValue` for plain `image` fields, `sanitizeHref` for `link` fields, per-column sanitization for `table` (blank rows + undeclared keys dropped), and `YYYY-MM-DD` coercion for `date`. After sanitizing, `prepareCollectionItemForRender` calls `resolveRichtextMediaInSettings` (`packages/core/src/utils/richtextMedia.js`) with the render mode's `mediaBasePaths` so embedded `<img>`/file references in `richtext` fields resolve to the served base (preview → live media URL, publish → `assets/`) without the theme author wiring anything in the template. It then calls `resolveRichtextLinksInSettings` (`packages/core/src/utils/richtextLinks.js`) to resolve stable internal-link refs embedded in richtext anchors (`data-page-uuid` / `data-collection-item-uuid`) to their current slugs — depth-aware, clearing dangling refs — the richtext analogue of the structured `link` resolution above. See [Link & URL Safety](core-security.md#12-link--url-safety).

---

## 8. Preview

The editor's item-edit form has a **Preview** button (enabled once the item is saved) that opens the standalone item route (`/preview/collection/:prefix/:slug`). That route loads the saved item and calls `previewCollectionItem()` against `/preview/collection`, which renders through the same item-page pipeline and returns a one-time render token; in-preview link clicks bubble up and navigate within the site's preview space. A multi-tenant host swaps in its own scope-bound `/preview/collection` renderer over the same pipeline.

---

**See also:**

- [Setting Types](theming-setting-types.md) — the field types a collection schema may use (incl. `date`, `gallery`, `table`)
- [Theming Guide](theming.md) — theme structure, where `collection-types/` lives
- [Site Exporting](core-export.md) — how item pages join the export
- [Platform Security](core-security.md) — sanitization, URL safety, cross-tenant isolation
- [Packages & Adapter Architecture](core-packages.md) — the `Scope` / storage-adapter / `LIMIT_KEYS` contract
