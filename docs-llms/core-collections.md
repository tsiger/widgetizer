# Collections System (Custom Post Types)

This document describes the **Collections** system: structured, repeatable content types — Portfolios, Team Members, Testimonials, Blog Posts, etc. — defined by themes and authored by users through a CMS interface. Collection data is readable from any widget via a Liquid filter, and collection types can optionally export individual static HTML pages per item.

> **Status: ✅ Implemented.** This document reflects the working implementation on the `collections` branch. It supersedes the earlier planning docs (spec/plan/blockers), whose decision rationale is folded into the "Design Rationale" section below.

## Overview

The system has three layers:

- **Theme authors** define collection *types* (schemas, and optionally an item-page template) inside the theme.
- **Users** add/edit/delete collection *items* through a familiar CMS interface (sidebar nav, listing table, schema-driven add/edit form).
- **Widgets** read collection data dynamically via the `| collection` Liquid filter.
- **Export** optionally generates an individual static HTML page per item (opt-in per type via `hasItemPages: true`).

Collections are **per-project content** like pages and menus. Schemas are **theme-owned** (replaced on theme update); item data is **protected user content** (never touched by updates).

The shipped Arch theme includes two example collection types: `portfolio` (`hasItemPages: true`) and `team` (`hasItemPages: false`).

---

## 1. Architecture & Storage Layout

Collections mirror the existing `templates/` → `pages/` split: theme-owned *definitions* live under `collection-types/` and are copied into the project with the rest of the theme package; user-owned *item data* lives separately under `collections/`.

```
data/projects/{folderName}/
├── collection-types/                 # theme-owned definitions (copied from theme; replaced on update)
│   ├── portfolio/
│   │   ├── schema.json
│   │   └── template.liquid           # optional, only when hasItemPages: true
│   └── team/
│       └── schema.json
├── collections/                      # protected user item data (never touched by theme updates)
│   ├── portfolio/
│   │   ├── _order.json               # manual ordering (optional)
│   │   ├── project-alpha.json
│   │   └── website-redesign.json
│   └── team/
│       └── john-doe.json
├── pages/
├── menus/
└── theme.json
```

**Authoring source** (theme): `themes/{theme}/collection-types/{type}/schema.json` (and optional `template.liquid`).

Runtime APIs, rendering, and export read the **project copy** under `collection-types/`, never `data/themes/{theme}/`, so each project stays pinned to its applied theme version. Path helpers live in `server/config.js` (`getProjectCollectionsDir`, `getProjectCollectionDir`, `getProjectCollectionItemPath`, `getProjectCollectionOrderPath`, `getProjectCollectionTypesDir`, `getProjectCollectionSchemaPath`, `getProjectCollectionTemplatePath`).

Because new-project creation, theme-sync, project ZIP import/export, and project duplication all copy the whole project/theme tree, both `collection-types/` and `collections/` are carried automatically.

---

## 2. Collection Type Schema (`schema.json`)

A collection type reuses existing setting types (the same ones widgets and `theme.json` use), with a few collection-specific top-level fields and three field-level flags.

**Example** (`themes/arch/collection-types/portfolio/schema.json`):

```json
{
  "type": "portfolio",
  "schemaVersion": 1,
  "displayName": "Portfolio Item",
  "displayNamePlural": "Portfolio",
  "icon": "Briefcase",
  "description": "Case studies and project showcases.",
  "slugPrefix": "portfolio",
  "hasItemPages": true,
  "sortable": true,
  "defaultSort": "manual",
  "settings": [
    { "type": "header", "id": "content_header", "label": "Content" },
    { "type": "text", "id": "title", "label": "Title", "required": true, "usedAsTitle": true },
    { "type": "textarea", "id": "description", "label": "Description" },
    { "type": "image", "id": "featured_image", "label": "Featured image" },
    { "type": "text", "id": "client", "label": "Client" },
    { "type": "text", "id": "year", "label": "Year" },
    { "type": "link", "id": "external_url", "label": "Project link", "hide_text": true }
  ]
}
```

### Schema field reference

| Field               | Type    | Purpose                                                                          |
| ------------------- | ------- | -------------------------------------------------------------------------------- |
| `type`              | string  | Unique collection identifier (`^[a-z0-9-]+$`, must match the folder name)         |
| `schemaVersion`     | number  | Bumped by the theme author when the schema changes; drives data migration        |
| `displayName`       | string  | Singular label shown in the UI                                                   |
| `displayNamePlural` | string  | Plural label shown in the sidebar/listing                                        |
| `description`       | string  | Optional help text                                                               |
| `icon`              | string  | Lucide icon name for the sidebar (falls back to `Database` if unknown)           |
| `slugPrefix`        | string  | URL prefix when `hasItemPages: true` (e.g. `portfolio/foo.html`); defaults to `type` |
| `hasItemPages`      | boolean | If true, export generates an individual HTML page per item (see §8)              |
| `sortable`          | boolean | If true, users can manually reorder items via a drag handle                      |
| `defaultSort`       | string  | `manual` \| `created_desc` \| `created_asc` \| `title_asc` \| `title_desc`        |
| `settings`          | array   | Field definitions reusing existing setting types                                 |

### Field-level flags

- **`usedAsTitle: true`** — marks the field used as the item's display name in listings and as the source for auto-generated slugs. **Exactly one non-`header` setting must declare this**, and it must be a `text` field.
- **`required: true`** — enforced on save and on export.

A `gallery`/multi-image field type does not exist yet (the `image` type holds a single value); multi-image data is a deferred item — see "Out of Scope" below.

### SEO (item pages)

Item-page SEO is **at parity with page SEO** (Finding #12), not a schema-field convention. Every `hasItemPages` item carries its own page-shaped `seo` object — `{ description, og_title, og_image, og_type, twitter_card, canonical_url, robots }` — edited through the **same** SEO editor pages use (`src/components/settings/SeoFields.jsx`, surfaced in `CollectionItemForm` when `hasItemPages`). Schemas declare **no** `seo_*` fields. The object lives top-level on the item JSON (alongside `settings`) and is sanitized on save exactly like page SEO. Defaults: `og_type: "article"` (items are content), `robots: "index,follow"`; an empty `canonical_url` auto-resolves from `siteUrl + slugPrefix/slug`. The shared `SeoTag` renders the tags (title/og/twitter/canonical) with the same fallbacks as pages, and `robots` containing `noindex` excludes the item from `sitemap.xml` and adds its path to `robots.txt`.

### Validation (`validateCollectionSchema`)

`collectionService` validates and normalizes schemas before returning anything to the UI or Liquid. Theme **upload** runs the same validation up front (`validateThemeCollectionSchemas`) and rejects the upload if any schema fails. Rules:

- `type` and folder name must match and use `^[a-z0-9-]+$`.
- `slugPrefix` must be `^[a-z0-9-]+$`; defaults to `type` when omitted.
- Exactly one non-`header` setting must declare `usedAsTitle: true`, and it must be `type: "text"`.
- `defaultSort` must be one of the five allowed values (defaults to `manual`).
- `settings` may only use setting types in `src/components/settings/supportedSettingTypes.js` (`SUPPORTED_SETTING_TYPES`) — the single source of truth shared by the renderer and the backend validator: `header`, `text`, `number`, `textarea`, `richtext`, `code`, `color`, `range`, `select`, `checkbox`, `radio`, `font_picker`, `menu`, `image`, `file`, `link`, `youtube`, `icon`.
- `multiple`, `blocks`, repeater, relationship, and taxonomy fields are **rejected**, not silently ignored.
- Two collections in the same project cannot share a `slugPrefix`; a `slugPrefix` cannot collide with an export-owned root directory (`assets`).
- At runtime, invalid schemas are **skipped** from the sidebar/API and logged with their folder path. Theme upload **rejects** the whole upload if any schema is invalid.

Labels (`displayName`, `displayNamePlural`, field `label`/`description`) follow the same i18n convention as widget schemas: prefer `tTheme:` locale keys, with direct English strings also supported. `SettingsRenderer` resolves `tTheme:` keys via `useThemeLocale()` — no frontend change needed.

---

## 3. Item Data Model

Items are stored as one JSON file per item: `collections/{type}/{item-slug}.json`.

```json
{
  "id": "project-alpha",
  "uuid": "8a4c9b2e-9b6f-4c2c-9b6f-4c2c8a4c9b2e",
  "slug": "project-alpha",
  "schemaVersion": 1,
  "created": "2026-01-22T10:00:00Z",
  "updated": "2026-01-22T14:30:00Z",
  "settings": {
    "title": "Project Alpha",
    "featured_image": "/uploads/images/alpha-hero.jpg",
    "external_url": { "href": "https://example.com/alpha", "target": "_blank" }
  },
  "seo": {
    "description": "A short summary for search and social.",
    "og_title": "",
    "og_image": "/uploads/images/alpha-social.jpg",
    "og_type": "article",
    "twitter_card": "summary",
    "canonical_url": "",
    "robots": "index,follow"
  }
}
```

| Field           | Notes                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------- |
| `id`            | Equals current `slug`; updated on rename; used as the filename basename                         |
| `uuid`          | Stable UUID v4, generated on create, **never mutated**, survives rename                         |
| `slug`          | Equals `id` (both the filesystem name and the in-file slug are authoritative)                   |
| `schemaVersion` | Bumped to the current schema version on the next save after normalization                       |
| `created`       | ISO 8601, set on create, never mutated                                                          |
| `updated`       | ISO 8601, **strictly monotonic** on every write (see §7)                                         |
| `settings`      | User-entered values keyed by schema field `id`                                                  |
| `seo`           | Page-shaped SEO object (`description`/`og_title`/`og_image`/`og_type`/`twitter_card`/`canonical_url`/`robots`) for `hasItemPages` items — parity with page SEO (Finding #12, see §8); omitted for list-only collections |
| `_archived`     | **In-memory only**, never written. Holds values for fields the current schema no longer defines (see §4) |

Item `uuid`s exist in v1 even though no v1 feature references items by UUID — they let Phase 3 relationships land without a backfill across every project.

### Manual ordering (`_order.json`)

```json
{ "order": ["project-alpha", "website-redesign", "mobile-app"] }
```

- Ignored unless `defaultSort` is `manual`.
- Listed slugs appear first in that order; items missing from `_order.json` are appended, sorted `created_desc`.
- Stale slugs (whose `.json` no longer exists) are ignored on read and pruned on the next order/delete write.
- The underscore prefix keeps it from being read as an item; writes go through the atomic helper (§7).

---

## 4. Slug Rules & Schema Migration

### Slug rules and collision handling

- Item slugs are auto-generated from the `usedAsTitle` field via `sanitizeSlug()`; the user can override. Validated `^[a-z0-9-]+$` server-side in both the route validators and the write service (belt-and-braces against path traversal).
- **Slug isolation**: item pages live under `{slugPrefix}/`, so `portfolio/about.html` coexists with a root `about.html`. Page slugs and item slugs are not in the same namespace; collision checks operate on full output paths, reserving real output directories (`assets/`) and requiring unique `slugPrefix` across collection types.
- **Uniqueness within a collection**: create/rename to an existing slug returns a 409 with `{ error, message, conflictingSlug }` rather than overwriting.
- **Rename** writes the new file, deletes the old, rewrites the `_order.json` entry, and swaps the `collection:{type}/{slug}` media-usage source. The edit page re-routes with `navigate(newUrl, { replace: true })`.
- Hard-coded slug links in templates/content are not rewritten on rename. Internal links from items to **pages** (stored as `link` objects with `pageUuid`) **are** resolved at render time (§6).

### Schema versioning & migration (warn before drop)

When a theme bumps `schemaVersion`, existing items may have stale or missing fields. On read, `normalizeCollectionItem` returns an **in-memory normalized item**:

- Fields no longer in the schema are **separated** into the in-memory `_archived` map (so the form and render only deal with current-schema fields), but the **on-disk `settings` object retains them** — a read never erases data.
- Missing required fields are filled with type-appropriate empty defaults; the item is flagged `invalid: true` with `validationErrors`.
- `schemaVersion` is bumped in memory; nothing is persisted by GET handlers.

**Orphaned values are never dropped silently.** The write path (`buildCollectionItemData` / `writeCollectionItem`) **merges back** on-disk settings keys that are absent from both the current schema and the incoming payload, so an ordinary save cannot lose data in a dropped field. Discarding archived data is **explicit**: the editor shows a plain-language "Leftover content" notice listing each orphaned field by a friendly name, behind a confirmed **Remove this content** action — only that removes the keys. This is strictly safer than pages/globals, which keep orphaned settings on disk indefinitely with no cleanup affordance.

Switching **themes** runs the same normalization: unknown fields go to `_archived` (kept on disk), missing required fields are filled and the item is flagged `invalid`. No field data is lost without an explicit confirmed discard.

---

## 5. Backend: Service, Controller, Routes

### Service (`server/services/collectionService.js`)

The service owns all filesystem/schema logic so Liquid, export, and HTTP handlers share one implementation. Key exports:

| Function | Responsibility |
| --- | --- |
| `validateCollectionSchema` / `listCollectionSchemas` / `validateThemeCollectionSchemas` / `getCollectionSchema` | Schema validation + load (runtime and theme-upload paths); `listCollectionSchemas` returns UI-safe schemas |
| `normalizeCollectionItem` | In-memory schema migration (archive unknown fields, fill required, flag invalid) |
| `listCollectionItems` / `readCollectionItem` / `readRawCollectionItem` | Read + normalize items; apply sort/`limit`/`offset`; `readRaw` returns un-normalized data for the editor |
| `loadCollectionTemplate` | Read `template.liquid` from the project copy (returns `null` if missing) |
| `buildCollectionItemData` | Apply defaults, preserve `created`/`uuid`, generate/sanitize slug, enforce required, set monotonic `updated`, merge back archived keys |
| `writeCollectionItem` / `deleteCollectionItem` / `bulkDeleteCollectionItems` / `duplicateCollectionItem` / `reorderCollectionItems` | Atomic, slug-safe writes with `_order.json` + media-usage sync |
| `resolveCollectionItemLinks` | Link resolution (`pageUuid` → slug + depth prefixing) — see §6 |
| `prepareCollectionItemForRender` | Render gate: clone, resolve links, resolve `menu`-type settings (when given `menuDeps`, §6/Finding #10), then sanitize item settings (richtext/link). **Every** item render path goes through this, not bare `resolveCollectionItemLinks` |
| `buildCollectionItemPageData` | Build the page-shaped object for the layout/SeoTag during export — see §8 |
| `shapeItemSeo` | Build the page-shaped item `seo` object (defaults + optional HTML-strip), shared by the save/normalize/render paths (Finding #12) |
| `loadCollectionItemsByUuid` | Map every `hasItemPages` item `uuid → { slugPrefix, slug }`, for resolving collection-item menu targets (Finding #11) |
| `discardArchivedCollectionItem` | Explicitly remove on-disk orphaned (out-of-schema) setting keys on a confirmed user action (Finding #8) |
| `CollectionSlugConflictError` / `CollectionValidationError` | Typed errors the controller maps to 409/400 |

Slug helpers come from `server/utils/slugHelpers.js`; the service does not duplicate slug rules.

### Controller & routes

`server/controllers/collectionController.js` exposes ten handlers; `server/routes/collections.js` mounts them at `/api/collections` in `server/createApp.js`. Routes use `express-validator` + `resolveActiveProject` (no `:projectId` segment — collections are site-workspace content, and `apiFetch` injects `X-Project-Id`).

| Method & path | Handler |
| --- | --- |
| `GET /schemas` | `getCollectionSchemas` |
| `GET /schema/:collectionType` | `getCollectionSchema` |
| `GET /:collectionType` | `getAllItems` (sorted; supports limit/offset/filter) |
| `GET /:collectionType/:itemSlug` | `getItem` |
| `POST /:collectionType` | `createItem` (201) |
| `PUT /:collectionType/:itemSlug` | `updateItem` (200, or 409 on slug conflict) |
| `DELETE /:collectionType/:itemSlug` | `deleteItem` |
| `POST /:collectionType/bulk-delete` | `bulkDeleteItems` (200, or 207 with `{ deleted, notFound, errors }`) |
| `POST /:collectionType/:itemSlug/duplicate` | `duplicateItem` (201) |
| `POST /:collectionType/reorder` | `reorderItems` |

All write responses set `Cache-Control: no-store`. The controllers wire media-usage sync (§ [Media](core-media.md)) on every create/update/delete/duplicate.

---

## 6. Render-Time Link Resolution

Two distinct concerns keep item links correct:

- **Render-time resolution** (`resolveCollectionItemLinks(item, pagesByUuid, outputPathPrefix)`): walks an item's `settings`, resolves any link object's `pageUuid` to the current page slug, prefixes internal hrefs for depth (publish mode), and clears dead `pageUuid` refs to `{ href: "", text: "", target: "_self" }`. Applied by the `| collection` filter loader (§7-Liquid) and the per-item export loop (§8). API GET endpoints return **raw** items (un-resolved `pageUuid`) so the editor's link picker can show the page name.
- **Storage cleanup** (`server/utils/linkEnrichment.js`): `cleanupDeletedPageReferences`, `enrichNewProjectReferences`, and `remapDuplicatedProjectUuids` all walk `collections/*/*.json` so dead `pageUuid` refs are stripped on page delete, seeded preset items are wired up, and duplicated projects get fresh item `uuid`s plus remapped page references. Touched items are rewritten atomically and re-synced into media usage.

### Depth-aware prefixing (`server/utils/linkPrefixer.js`)

Item pages export one directory deep (`{slugPrefix}/{slug}.html`), so every internal URL needs a relative prefix to reach the export root. A render global, `outputPathPrefix`, holds that prefix (`""` for root pages, `"../"` for item pages) and is consulted **only in publish mode**.

`linkPrefixer.js` exports:

- `normalize(href)` — WHATWG URL preprocessing: strip leading/trailing C0 controls + space (step 1), then strip embedded tab/LF/CR (step 2), so classification matches what a browser actually does.
- `prefixInternalHref(href, outputPathPrefix)` — type-safe; passes through any URI scheme (anchored RFC-3986 regex, no allowlist), protocol-relative `//`, `#`, `?`, and root-absolute `/`; prefixes everything else. A no-op when `outputPathPrefix` is `""`, so root pages render byte-identical to before.

The same helper is shared by the widget link resolver (`resolveLinkValue` / `resolveWidgetPageLinks`) in `server/services/renderingService.js`, the menu resolver (`resolveMenuItemLinks` / `resolveMenuPageLinks`) in `server/services/menuResolver.js` (finding #10), and the collection-item resolver (`resolveCollectionItemLinks` / `prepareCollectionItemForRender`) in `server/services/collectionService.js`. Every asset-emitting tag (`assetTag`, `renderHeaderAssets` including preload `href`/`imagesrcset`, `renderFooterAssets`, `placeholderImageTag`, `renderEnqueuedAssetTags`) and the `imagePath`/`filePath`/`site_icons` globals also consult `outputPathPrefix` in publish mode. See [Export](core-export.md) for the export-side wiring.

### Menu active-state (`currentCanonicalPath`)

Because menu hrefs are now depth-prefixed (`../about.html`), `src/core/snippets/menu.liquid` can no longer compare the href to identify the active item. Each resolved menu item carries a separate un-prefixed `canonicalPath`; the snippet compares it against a per-render `currentCanonicalPath` global for `is-active`/`aria-current`. `currentCanonicalPath` is set on **every** render path — `previewController.js`, the page-export loop, the `renderSingleWidget` morph path, and the collection-item loop — not only for item pages (the deprecated `pageSlug` global is kept for backwards compatibility). Themes that override the core `menu.liquid` snippet must adopt the `canonicalPath`/`currentCanonicalPath` comparison.

---

## 7. Concurrency & Atomic Writes

Every collection item write — create, update, rename, duplicate, delete, and `_order.json` — uses `writeJsonAtomic(filepath, data)` from `server/utils/atomicFs.js`, not the raw "write then maybe delete" pattern pages use:

1. Serialize the data.
2. Write to a **UUID-suffixed** temp path (`${filepath}.${randomUUID()}.tmp`) with the `wx` flag. The unique suffix is critical — a shared `${filepath}.tmp` would collide when two writes to the same item overlap (two tabs, or a save racing a duplicate).
3. `fs.rename` (atomic within a volume on Linux/macOS/Windows).
4. `finally`-block cleanup of orphan temp files. `listCollectionItems` filters `*.tmp` so orphans are invisible to readers (`isAtomicTmpFile`).

### Three write operations + crash recovery

- **Update without rename** (most common): single atomic overwrite, then media-usage refresh. No `_order.json` change.
- **Rename** (same `uuid` preserved): write new file → unlink old → update `_order.json` → swap media-usage source. A crash between "write new" and "delete old" leaves two files sharing a `uuid` (the only legitimate case). Recovery on read: group by `uuid`, keep the file with the newer `updated` (lexicographic filename tie-break), exclude the loser, and log a warning — **never delete on read**. The loser is removed on the winner's next save.
- **Duplicate** (new `uuid`, new slug): atomic write of a fresh item; insert after the source in `_order.json`. Never reuses the source `uuid`, so the rename-recovery grouping never fires for duplicates.

`updated` is set via `Math.max(Date.now(), prev + 1)` for **all three** operations, so it's strictly monotonic even under backward clock skew or future-dated imports — which keeps the "pick newer `updated`" recovery rule deterministic.

Concurrency control is last-write-wins (no `ETag`/`If-Match`), matching pages. Media-usage staleness after a mid-rename crash is repaired by the next `refreshMediaUsageAfterStructuralChange` (project import/duplication/theme-update apply, or the manual refresh endpoint).

---

## Liquid Filter (`| collection`)

Widgets read collection data via a Liquid filter — the most common use case (a "recent work" grid, team list, logo wall, testimonials carousel) needs no individual item pages.

```liquid
{% assign portfolio_items = 'portfolio' | collection %}
{% for item in portfolio_items %}
  <h3>{{ item.settings.title }}</h3>
  {% image src: item.settings.featured_image, size: 'medium' %}
  {% if item.url %}<a href="{{ item.url }}">View case study</a>{% endif %}
{% endfor %}

{% assign recent = 'portfolio' | collection: limit: 6, sort: 'created_desc' %}
```

Item shape: `{ id, uuid, slug, url, created, updated, settings }`. `url` is computed by the loader (not stored): `null` when `hasItemPages: false`; the depth-prefixed relative path in publish mode; the preview API route in preview mode.

Implementation:

- `src/core/filters/collectionFilter.js` exports `registerCollectionFilter(engine)` (and `normalizeCollectionFilterArgs`), registered in `configureLiquidEngine()`. It lives under `src/core/`, so it imports **no** backend module — it reads `projectId`, `renderMode`, `outputPathPrefix`, and a `getCollectionItems` loader off `this.context.globals`.
- `createBaseRenderContext` attaches the `getCollectionItems` loader once per render. The loader calls `collectionService.listCollectionItems`, applies `prepareCollectionItemForRender` per item (resolves `pageUuid` links, resolves any schema-declared `menu` settings to full menu objects when the collection declares one — lazily loading `menuDeps`, #10 — **and** sanitizes richtext/link settings — sanitize-after-resolve), computes `item.url`, and caches results per `(type, options)` in a per-render `globals.collectionCache` Map. The cache is **per-render** (not global) because `outputPathPrefix` differs between root pages and item pages.
- Supported options: `limit`, `sort`, `offset`.
- **`invalid: true` items are excluded by default** (matching export's refusal to publish them); developer mode logs the skipped type/slug values. There is no `includeInvalid` option in v1.

The filter intentionally bypasses the per-widget settings sandbox — collection data is global, read-only project data, scoped to the active project; any widget may read any collection.

---

## 8. Individual Item Pages (Export)

Opt-in via `hasItemPages: true`. The theme must ship `template.liquid` for that type; collections that only render inside widgets (e.g. Arch's `team`) leave `hasItemPages: false` and need no template.

> **Theme content note:** Arch's `portfolio` schema sets `hasItemPages: true` but does not yet ship a `template.liquid`. Until a theme adds one, exporting a project with `portfolio` items fails fast with a clear "no template.liquid" error (see below). The export *code path* is complete; the theme template is the remaining authoring step.

The template renders **inside** the theme's main layout (header/footer/main slots), exactly like page templates. Available context: `item` (`id`, `uuid`, `slug`, `url`, `created`, `updated`, `settings.*`), `collection` (the schema), `page` (the page-shaped object below), plus the usual `project`/`theme`/`mediaFiles`/`imagePath`/`filePath`/`site_icons`. It is rendered through `renderLiquidTemplate(projectId, templateString, context, sharedGlobals)` — a helper exported from `renderingService.js` that runs an ad-hoc template string through the cached per-project engine. Both item-page render paths — the export loop and the in-app preview — build the finished page through **one** shared `renderCollectionItemPage()` in `renderingService.js` (resolve item → header/footer → page-shaped data → template → layout), so the two can never drift (the page-render analogue of how every widget goes through `renderWidget`); each caller supplies only its mode-specific `sharedGlobals` and post-processing (export: format/storage-rewrite/markdown/write; preview: token injection). Schema-declared `menu` settings resolve to a full menu object (`items[]` with depth-aware `link` + `canonicalPath`), the same shape widgets receive (finding #10), so an item template can `{% render 'menu', menu: item.settings.<id> %}`.

The full export wiring (two-pass validation, subdirectory creation, per-item `sharedGlobals` isolation, page-shaped object, SEO mapping, body-class override, sitemap/robots/manifest, markdown parity) lives in [Site Exporting → Collection item pages](core-export.md#collection-item-pages-export). The essentials:

- **Page-shaped object** (`buildCollectionItemPageData`): `id` = `{slugPrefix}-{slug}` (CSS-safe), `slug` = `{slugPrefix}/{slug}` (path-shaped), plus the item's own page-shaped `seo` object (Finding #12 — parity with page SEO): `robots`, `description`, `og_title`, manual `og_image`, `og_type: "article"`, and `canonical_url` (explicit author value, else auto-built from `siteUrl + slugPrefix/slug`).
- **Body class**: `renderPageLayout` honors a `contentSections.bodyClass` override; items get `collection-{type} item-{slug}` instead of `page-{slug}`, so a `.page-portfolio` rule for the index page never leaks onto item pages.
- **SeoTag** (`src/core/tags/SeoTag.js`): social images resolve from a constant `assets/images` base (not the depth-aware `imagePath`), preserving the existing two output forms — absolute `${siteUrl}/assets/images/...` when `siteUrl` is set, root-absolute `/assets/images/...` when not — so existing page output is byte-for-byte unchanged. Canonical URLs for items are always explicit, so the SeoTag auto-derive fallback isn't reached for them.

---

## 9. Frontend

| File | Purpose |
| --- | --- |
| `src/queries/collectionManager.js` | API client mirroring the controller surface; uses `apiFetch` (injects `X-Project-Id`) |
| `src/hooks/useCollections.js` | `{ schemas, loading, error, refetch }` with a module-level cache (matches `useAppSettings`) |
| `src/hooks/useCollectionItems.js` | `{ items, loading, error, refetch }` for one type |
| `src/pages/CollectionItems.jsx` | Listing table (search, multi-select bulk delete, row actions, drag-reorder when `sortable`, "Needs attention" filter for invalid items) |
| `src/pages/CollectionItemAdd.jsx` / `CollectionItemEdit.jsx` | Add/edit routes; edit re-routes with `navigate(newPath, { replace: true })` on slug change |
| `src/components/collections/CollectionItemForm.jsx` | Shared schema-driven form: `react-hook-form`, renders fields via `SettingsRenderer`, `useGuardedFormPage(isDirty)`, slug auto-generated from the `usedAsTitle` field, inline required-field validation, invalid items load with `validationErrors` pre-populated; the `usedAsTitle` field renders with an inline icon-only **Preview** (eye) button when the type has item pages; a collapsible **SEO** section (shared `SeoFields`, parity with `PageForm`) shows for `hasItemPages` types (Finding #12); a **"Leftover content"** notice with a confirmed discard surfaces any archived fields (Finding #8) |
| `src/components/collections/CollectionItemPreview.jsx` | Full-screen, page-editor-style item preview overlay (back button, item dropdown, desktop/mobile toggle); renders the selected item — including the live unsaved draft — through the theme template in an iframe |

Routes are registered in `src/App.jsx` (`collections/:collectionType`, `.../add`, `.../:itemSlug/edit`). The sidebar (`src/components/layout/Sidebar.jsx`) calls `useCollections()` and renders one nav entry per type after Pages/Menus, with a Lucide icon resolved from the schema `icon` string (fallback `Database`); the label adapter accepts a pre-resolved `label` alongside the existing `labelKey`.

There is no autosave or undo/redo for collection items in v1 — explicit save plus the navigation guard is sufficient. These are deliberate omissions, not gaps.

### Item preview

Item pages can be previewed without exporting, through the same token flow as page/standalone previews:

- **Entry points** — the edit form's always-visible eye button (previews the current unsaved draft first), and a **Preview** action in each listing row's `…` menu (gated on `hasItemPages`).
- **Endpoint** — `POST /api/preview/collection` (`createCollectionPreviewToken` in `previewController.js`) renders a draft item (`{ collectionType, slug, settings }`) against the active project's theme: it loads the schema + `template.liquid`, assembles a draft item, renders header/footer/template through `renderPageLayout` in `"preview"` mode, injects the base tag + standalone runtime + a link-click guard, and returns `{ token }`. The client points an iframe at `/render/:token`. Guards: `400` when `collectionType` is missing, and `400` "Preview unavailable" when the collection has no `template.liquid` (or the type is unknown). The dropdown lists saved items so authors can flip between them; selecting one re-renders via the same endpoint.

---

## 10. Design Rationale

Three high-severity design conflicts were resolved before implementation; the reasons (not the full history) are kept here because they constrain how the feature must evolve.

- **Collection-type schemas are theme-only; presets seed item data only.** An earlier design let presets override a collection-type schema, but theme updates replace `collection-types/` wholesale from the theme source (never a preset), so the first update would silently revert the schema and then drop user data in the now-orphaned fields. Resolution: presets may seed **only** `collections/` item data, never `collection-types/`; a preset shipping a `collection-types/` folder is rejected at theme upload. A theme that wants a richer collection for a preset must define that as the theme's own base schema (or a distinct `type`). This makes the "replace on update" model safe and is why `resolvePresetPaths` returns `collectionsDir` but never a `collectionTypesDir`. See [Theme Presets](theme-presets.md) and [Theme Updates](theme-updates.md).
- **Schema migration warns before dropping data.** Moving removed-field values to an in-memory-only `_archived` map would permanently lose them on the next save. The earlier justification ("matches the rest of Widgetizer") was false — pages/globals keep orphaned settings on disk indefinitely. Resolution: on-disk `settings` keep orphaned keys, the write path merges them back, and removal requires an explicit confirmed "Discard archived data" action (§4).
- **`currentCanonicalPath` is wired into every render path.** Rewriting `menu.liquid` to compare a new `currentCanonicalPath` global, while only setting that global in the item-page loop, would have silently broken `is-active`/`aria-current` on every normal page (the byte-equality test wouldn't catch active-state). Resolution: set it in preview, the page-export loop, the morph path, and the item loop (§6).

Two lower-severity decisions worth keeping: SeoTag **preserves** current social-image output (no `og:image` regression for pages without `siteUrl`); and `resolveWidgetPageLinks`/`resolveMenuItemLinks` dropped their empty-`pagesByUuid` short-circuit so hand-typed custom URLs still get depth-prefixed on item pages.

---

## 11. Out of Scope (Future Phase 3)

Deferred, with the v1 data model already forward-compatible:

- Cross-collection relationships (Portfolio item → Category) — v1 items already carry stable `uuid`s.
- Taxonomies (categories, tags).
- Repeater / gallery setting type (removes the single-image limitation).
- `{% collection ... as items %}` tag form (per-block scoping, cursor pagination).
- Draft/publish states, per-item undo/redo and autosave. (Live item preview shipped — see §9 "Item preview".)
- **Forms inside collection templates** — open question, deferred. Interim behavior: item templates should not contain hosted `<form>` markup (the forms manifest scans page widget JSON, not Liquid templates). Authors who need a form on an item page link to a real page that hosts it. Other interactive widgets (sliders, accordions) work fine inside item templates as long as their JS ships via a widget used on at least one page.
- Project-defined collection types (collections stay theme-defined in v1).
- Richtext HTML `<img>` media tracking — a pre-existing limitation shared by pages/globals; use the `image` setting type for tracked media.

---

## Tests

Backend coverage lives in `server/tests/`: `collections.test.js`, `collectionApi.test.js`, `collectionItems.test.js`, `collectionFilter.test.js`, `collectionItemExport.test.js`, `collectionItemPageData.test.js`, `collectionLinkEnrichment.test.js`, `collectionMediaUsage.test.js`, `collectionPresetSeeding.test.js`, `menuResolver.test.js` — covering schema validation, CRUD + slug/UUID invariants, atomic-write crash recovery, the Liquid filter, depth-aware export, the page-shaped object, link enrichment, media usage, and preset seeding. Item-preview guard paths (missing `collectionType`, template-less collection) are covered in `preview.test.js`.

---

## See Also

- [Theming Guide](theming.md) — authoring collection types and using `| collection` in templates
- [Setting Types Reference](theming-setting-types.md) — setting types available in collection schemas
- [Site Exporting](core-export.md) — collection item-page export, depth-aware paths, sitemap/robots/manifest
- [Media Library](core-media.md) — collection media usage tracking and "Used in" display
- [Theme Updates](theme-updates.md) — `collection-types/` updatable, `collections/` protected
- [Theme Presets](theme-presets.md) — seeding `collections/` item data
- [Database & Storage](core-database.md) — filesystem vs SQLite boundaries
