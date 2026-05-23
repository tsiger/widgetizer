# Collections Implementation Plan

> Companion to [future-collections.md](future-collections.md). That doc is the *specification* (what to build, in detail). This doc is the *execution plan* (what order to build it in, and how to know each phase is done).

The work is split into 21 phases. Each phase is small enough to complete and verify in one or two work sessions. **Don't start a phase until every dependency listed is merged and tested.** When you finish a phase, run its acceptance checks before opening the next one.

The spec document has a higher-level "Gate 1 / Gate 2 / ..." view in Section 19; this plan is the fine-grained breakdown of those gates.

---

## Phase 0 — Lock the design decisions

Nothing to build. Confirm the team is aligned on what's already settled in the spec.

- Asset paths use depth-aware relative URLs (`outputPathPrefix`).
- Items get stable UUIDs in v1.
- Presets can seed `collection-types/` and `collections/`.
- Forms inside collection item templates: **open question, deferred** (see spec Section 14). Build Phases 1 and 2 with the interim behavior — no forms wiring in templates. Revisit before any phase that would need them.
- SEO field mapping: `usedAsOgImage` flag, `og_type: "article"`, canonical always explicit when `siteUrl` is set.

If anything here is in dispute, resolve it before Phase 1.

---

## Phase 1 — Schema definition and validation

**What you'll have:** Theme authors can write `collection-types/{type}/schema.json` and the server validates them. Nothing user-visible yet.

**Goal:** Lock down the schema contract. Make sure a theme upload with bad schemas is rejected with clear errors, and runtime loading silently skips invalid schemas without crashing.

**Acceptance:**
- New `src/components/settings/supportedSettingTypes.js` exports the canonical list of setting types.
- `collectionService.listCollectionSchemas(projectFolderName)` reads, validates, and returns schemas.
- Every validation rule from Section 1 of the spec has both a passing and a failing test case.
- Invalid schemas are skipped at runtime (with a console warning) — they don't crash the server.
- Theme upload validator rejects (with 400 + per-collection error list) any theme whose schemas fail validation, contain duplicate `slugPrefix`, or use a reserved prefix.
- Example `themes/arch/collection-types/portfolio/schema.json` and `team/schema.json` exist and validate.

**Dependencies:** none.

---

## Phase 2 — Atomic write helper

**What you'll have:** A single `writeJsonAtomic(filepath, data)` helper that any future code can rely on.

**Goal:** Build the storage primitive once, correctly. Concurrent writes don't corrupt; crashes don't leave half-written files; tmp file collisions are impossible.

**Acceptance:**
- New `server/utils/atomicFs.js` exports `writeJsonAtomic`.
- Tmp filename uses `${filepath}.${randomUUID()}.tmp` (unique per call).
- `fs.writeFile(tmpPath, ..., { flag: "wx" })` + `fs.rename` + `finally`-block cleanup of orphan tmps.
- Test: two concurrent writes to the same target produce two distinct tmp files; last write wins on the final file, no ENOENT/EEXIST surface.
- Test: simulated mid-write crash leaves a tmp file that is never seen by readers (directory scans filter `*.tmp`).

**Dependencies:** none.

---

## Phase 3 — Read-side storage service

**What you'll have:** A backend service that can list and read collection items off disk, applying schema-driven normalization on the fly. No writes yet.

**Goal:** Make sure reads return the right shape and migration semantics work correctly before any code tries to mutate items. This phase produces the data Phase 4 and the Liquid filter will both build on.

**Acceptance:**
- `collectionService` exports `listCollectionItems(projectFolderName, collectionType, options)`, `readCollectionItem(projectFolderName, collectionType, itemSlug)`, and `loadCollectionTemplate(projectFolderName, collectionType)`.
- `listCollectionItems` reads JSON files (excluding `_order.json` and any `*.tmp`), applies schema defaults, computes `title` from the `usedAsTitle` field, applies sort (`options.sort ?? defaultSort`), `options.limit`, `options.offset`.
- Schema migration on read returns an in-memory normalized item:
  - Drop fields no longer in schema; preserve values under in-memory `_archived` (never written).
  - Fill missing required fields with empty defaults; flag `invalid: true` + `validationErrors`.
  - Bump in-memory `schemaVersion`.
- Manual ordering: if `defaultSort === "manual"`, slugs from `_order.json` appear first in that order; items missing from `_order.json` appear after, sorted by `created_desc`; stale slugs in `_order.json` are ignored (not pruned on read).
- Duplicate-UUID recovery on read: when two files in the same collection share a `uuid`, pick the file with the newer `updated` (lexicographic filename tie-break if equal); exclude the loser; log a warning. Do NOT delete the loser on read.
- Tests cover: listing with each sort mode, options combinations, schema migration (drop + fill + invalid flagging), `_order.json` precedence, duplicate-UUID handling, `*.tmp` filtering.

**Dependencies:** Phase 1.

---

## Phase 4 — Write-side storage service

**What you'll have:** The service can now create, update, rename, delete, bulk-delete, duplicate, and reorder items, with crash-safe semantics and full slug uniqueness enforcement.

**Goal:** Make sure every disk mutation preserves invariants — `uuid` never mutates on update, `created` never changes, `updated` is strictly monotonic, slugs are unique within a collection, `_order.json` stays consistent — and rename crashes recover deterministically. Media-usage sync is **not** wired here yet; it lands in Phase 6.

**Acceptance:**
- `collectionService` exports `buildCollectionItemData`, `writeCollectionItem`, `deleteCollectionItem`, `bulkDeleteCollectionItems`, `duplicateCollectionItem`.
- Items always written with `id`, `uuid`, `slug`, `schemaVersion`, `created`, `updated`, `settings`.
- `updated` uses `Math.max(Date.now(), prev + 1)` — strictly greater than the file it replaces, even under clock skew or future-dated imports.
- Slug validation `^[a-z0-9-]+$` enforced in the service (belt-and-braces against an unvalidated caller).
- **Slug rename** (update with new slug, same UUID preserved):
  1. Read existing.
  2. Build new content (new monotonic `updated`).
  3. `writeJsonAtomic({newSlug}.json, item)`.
  4. `fs.unlink({oldSlug}.json)`.
  5. Update `_order.json` via `writeJsonAtomic`.
  6. (Media sync placeholder — wired in Phase 6.)
- **Update without rename:** single `writeJsonAtomic({slug}.json, item)` overwrites atomically.
- **Duplicate:** new `uuid` via `randomUUID()`, new slug via `generateUniqueSlug` with copy suffix, new timestamps, settings copied with `usedAsTitle` value copy-suffixed, inserted into `_order.json` immediately after source slug. Never reuses the source UUID.
- **Slug uniqueness:** create or rename to an existing slug returns a typed error the controller can surface as 409 with `{ error, message, conflictingSlug }`.
- **Bulk delete:** returns `{ deleted, notFound, errors }` for partial-failure reporting; all deleted slugs pruned from `_order.json` in one pass.
- `_order.json` writes always go through `writeJsonAtomic`; stale slugs (whose `.json` file no longer exists) are pruned on every write.
- Tests cover: every CRUD path, rename atomicity, duplicate-UUID crash recovery across all rename crash windows, post-save cleanup of duplicate-UUID losers, monotonic `updated` under clock-skew simulation, `_order.json` concurrent-write safety.

**Dependencies:** Phase 1, Phase 2, Phase 3.

---

## Phase 5 — HTTP API

**What you'll have:** REST endpoints under `/api/collections/...` exposing the read and write services.

**Goal:** Make sure the API contract is correct — every endpoint validates input, returns the right status codes, and is properly scoped to the active project.

**Acceptance:**
- New `server/controllers/collectionController.js` and `server/routes/collections.js`; mounted in `server/createApp.js` at `/api/collections`.
- All ten routes from Section 10 implemented (`GET /schemas`, `GET /schema/:type`, `GET /:type`, `GET /:type/:slug`, `POST /:type`, `PUT /:type/:slug`, `DELETE /:type/:slug`, `POST /:type/bulk-delete`, `POST /:type/:slug/duplicate`, `POST /:type/reorder`).
- Every route uses `express-validator` and the `resolveActiveProject` middleware.
- Bulk delete returns 200 on full success, 207 with `{ deleted, notFound, errors }` on partial.
- Slug collision returns 409 with `{ error, message, conflictingSlug }`.
- All write responses include `Cache-Control: no-store`.
- Integration tests hit every endpoint and assert response shape + status code.

**Dependencies:** Phase 4.

---

## Phase 6 — Media usage tracking

**What you'll have:** The `media_usage` SQLite table now knows which collection items reference which uploads. Collection controller CRUD calls the right sync functions; project import / duplication / theme update keep usage consistent.

**Goal:** Make sure media tracking is wired end-to-end so Phase 19's export will know which images to copy and the Phase 14 media library can later show "Used in: Portfolio: Project Alpha."

**Acceptance:**
- `mediaUsageService.js` exports `extractMediaPathsFromCollectionItem`, `updateCollectionItemMediaUsage`, `removeCollectionItemFromMediaUsage`, `syncCollectionItemMediaUsageOnWrite`.
- Source string format `collection:{type}/{slug}` used consistently.
- `refreshAllMediaUsage` extended to scan `data/projects/{folder}/collections/*/*.json`.
- Collection controller CRUD handlers (from Phase 5) wire the sync calls:
  - Create / update → `syncCollectionItemMediaUsageOnWrite(projectId, type, slug, item, previousSlug)`.
  - Delete / bulk-delete → `removeCollectionItemFromMediaUsage`.
  - Duplicate → `syncCollectionItemMediaUsageOnWrite` for the new slug.
- The rename sequence in Phase 4 now executes its step-6 media sync call.
- No new call sites for `refreshMediaUsageAfterStructuralChange` — the existing project-creation / duplication / import / theme-update hooks already cover collections once `refreshAllMediaUsage` is extended.
- Tests: extraction finds image/file/link paths in nested settings; rename removes old source + adds new; `refreshAllMediaUsage` rebuilds collection sources correctly after a simulated import.

**Dependencies:** Phase 4, Phase 5.

---

## Phase 7 — Link integrity (prefixer + item-link resolver + storage cleanup)

**What you'll have:** The shared `linkPrefixer` helper, render-time link resolution for collection items, and storage cleanup of `pageUuid` references when pages are deleted or projects duplicated.

**Goal:** Make sure collection-item links to pages survive page renames (via render-time resolution) and page deletes (via storage cleanup), and that custom URLs are correctly normalized everywhere.

**Acceptance:**
- New `server/utils/linkPrefixer.js` exports `prefixInternalHref` and `normalize`.
- `normalize` does WHATWG step 1 (strip leading/trailing C0+space) **and** step 2 (strip embedded tab/LF/CR).
- `prefixInternalHref` detects any URI scheme via the anchored RFC-3986 regex, plus protocol-relative / anchor / query / root-absolute passthroughs. Type-safe against non-strings.
- `resolveCollectionItemLinks(item, pagesByUuid, outputPathPrefix)` exists and returns a deep clone with resolved hrefs (resolves `pageUuid` via the map, prefixes any custom URL via `prefixInternalHref`, clears dead `pageUuid` refs to `{ href: "", text: "", target: "_self" }`).
- `linkEnrichment.js` extensions: `cleanupDeletedPageReferences`, `enrichNewProjectReferences`, `remapDuplicatedProjectUuids` all walk `data/projects/{folder}/collections/*/*.json`.
- After `cleanupDeletedPageReferences` rewrites a touched item, it calls `syncCollectionItemMediaUsageOnWrite` (from Phase 6) so usage tracking stays current.
- `remapDuplicatedProjectUuids` also regenerates each collection item's own `uuid` (the item UUID, not the page UUID) so a duplicated project has its own item identity space.
- All item rewrites in `linkEnrichment.js` use the atomic write helper.
- Tests cover every linkPrefixer rule (whitespace, embedded control, every URI scheme, type-safe, empty), page-delete cleanup of `pageUuid` refs in collection items, project-duplicate UUID remapping.

**Dependencies:** Phase 4, Phase 6.

*Note: `resolveMenuItemLinks` / `resolveLinkValue` updates land in Phase 16 — they require `outputPathPrefix`, which doesn't exist yet.*

---

## Phase 8 — Liquid filter (`| collection`)

**What you'll have:** Themes can write `{% assign items = 'portfolio' | collection %}` and get back a list of items rendered inside any widget.

**Goal:** Make sure the most common end-user use case (a "recent posts" or "team grid" widget) works end-to-end without needing individual item pages.

**Acceptance:**
- New `src/core/filters/collectionFilter.js` exports `registerCollectionFilter(engine)`.
- `configureLiquidEngine()` in `renderingService.js` registers the filter.
- `createBaseRenderContext` attaches a `getCollectionItems` loader to globals, set once per page render.
- Loader: calls `collectionService.listCollectionItems`, applies `resolveCollectionItemLinks` per item, computes `item.url`, caches per-render in `globals.collectionCache`.
- Item shape returned: `{ id, uuid, slug, url, created, updated, settings }`. `url` is `null` when `hasItemPages: false`.
- Filter excludes `invalid: true` items by default. Dev-mode warning lists excluded items.
- Supported options: `limit`, `sort`, `offset`.
- Tests in preview rendering: options work and combine; invalid items excluded; per-render cache deduplicates filesystem reads; async-filter behavior verified inside `{% for %}` loops.

**Dependencies:** Phase 3, Phase 7.

---

## Phase 9 — Theme update, upload, and preset integration

**What you'll have:** The full theme lifecycle now knows about collections. Updates copy `collection-types/`; uploads validate it; presets can ship starter collections.

**Goal:** Make sure collections behave correctly across every theme-lifecycle event a user can trigger — update apply, theme switch, fresh upload, project-from-preset.

**Acceptance:**
- `themeUpdateService.UPDATABLE_PATHS` includes `"collection-types"`.
- Applying a theme update replaces `collection-types/` entirely; `collections/` (user data) is never touched.
- `resolvePresetPaths` in `themeController` returns `collectionTypesDir` and `collectionsDir` when present in a preset.
- `projectController` creation flow copies preset `collection-types/` (overwriting theme default) and preset `collections/` (regenerating uuids + timestamps per item, reusing the regeneration logic from `remapDuplicatedProjectUuids`).
- Tests: applying a theme update preserves `collections/` and replaces `collection-types/`; project created from a preset with seeded items shows those items immediately and their uuids are freshly generated; duplication carries both directories with new item uuids; media-usage refresh after each event picks up collection sources.

**Dependencies:** Phase 6, Phase 7.

---

> **Milestone:** After Phase 9, the backend is feature-complete for the spec's Phase 1. A theme author can declare collections and use `| collection` in templates. Items can be created/edited via the API. The UI is still missing — that's Phases 10–14.

---

## Phase 10 — Frontend data layer

**What you'll have:** A `collectionManager.js` query client and `useCollections` / `useCollectionItems` hooks that future UI pages will share.

**Goal:** Make sure all frontend data fetching for collections goes through one place with consistent error handling and a `refetch` mechanism. No UI yet.

**Acceptance:**
- New `src/queries/collectionManager.js` exports a function per controller endpoint, using `apiFetch` (which injects `X-Project-Id`) and the same error helper `pageManager.js` uses.
- New `src/hooks/useCollections.js` returns `{ schemas, loading, error, refetch }`. Plain `useState` + `useEffect` with a module-level cache, matching `useAppSettings.js`.
- New `src/hooks/useCollectionItems.js` returns `{ items, loading, error, refetch }` for a single type.
- No external query library (React Query is not in `package.json` — confirm).

**Dependencies:** Phase 5.

---

## Phase 11 — Sidebar integration

**What you'll have:** The sidebar shows one nav entry per collection type, with an item-count badge.

**Goal:** Make sure users can discover collections from anywhere in the app. Clicking still 404s until Phase 12 ships — that's intentional.

**Acceptance:**
- `Sidebar.jsx` adapter: nav items accept either `labelKey` (existing) or pre-resolved `label` (new).
- Numeric `badge` field renders as a compact badge next to the label.
- Lucide icon string-to-component lookup with `Database` fallback.
- Sidebar calls `useCollections()` and renders nav items in the "Site" section after Pages/Menus.
- Empty collections still appear with a `0` badge.
- Active-state highlighting works for `/collections/:type` routes.

**Dependencies:** Phase 10.

---

## Phase 12 — Frontend listing page

**What you'll have:** `/collections/:type` renders a table of items with search, multi-select bulk delete, row actions, drag-to-reorder when `sortable: true`, and a "Needs attention" filter + count for invalid items.

**Goal:** Make sure users can see and manage items at the collection level. This page should feel exactly like `Pages.jsx`.

**Acceptance:**
- New `src/pages/CollectionItems.jsx` reuses `Table`, `useConfirmationAction`, `useToastStore`, `SortableList`.
- Search filters by title (the `usedAsTitle` field value).
- Multi-select + "Delete X selected" with confirmation.
- Per-row actions: Edit / Duplicate / Delete (with confirmation).
- Drag handle on rows when `schema.sortable: true`; drop calls the reorder API.
- **Needs-attention surfacing**: a count in the page header (e.g., "3 items need attention") when any items are invalid, plus a filter chip to show only those items, plus a per-row warning badge on invalid rows.
- Empty state with "Create your first {displayName}" CTA.
- Route added to `App.jsx`.

**Dependencies:** Phase 10, Phase 11.

---

## Phase 13 — Frontend add/edit form

**What you'll have:** `/collections/:type/add` and `/collections/:type/:slug/edit` render a schema-driven form for creating and editing items.

**Goal:** Make sure users can author items end-to-end. Same UX patterns as `PageForm` — auto-slug from title, required-field validation, unsaved-changes guard.

**Acceptance:**
- New `src/components/collections/CollectionItemForm.jsx` uses `react-hook-form`, renders schema fields via `SettingsRenderer`, calls `useGuardedFormPage(isDirty)`.
- Slug field auto-generates from the `usedAsTitle` value when the user hasn't manually edited it.
- Required fields show a `*` next to the label. Inline validation errors. Save blocked while invalid.
- Invalid items load with their `validationErrors` already populated as form errors (so the user sees the problems immediately on open).
- `header`-type settings render as section dividers (non-collapsible in v1).
- New `src/pages/CollectionItemAdd.jsx` and `CollectionItemEdit.jsx`.
- Slug rename in edit page calls `navigate(newUrl, { replace: true })`.
- After successful save, `refetch()` the affected hook so listing/sidebar update.
- Routes added to `App.jsx`.

**Dependencies:** Phase 10, Phase 12.

---

## Phase 14 — Media library awareness of collections

**What you'll have:** The media library's "Used in" column now renders `Portfolio: Project Alpha` instead of the raw `collection:portfolio/project-alpha` string.

**Goal:** Make sure media usage is transparent across the system. Orphaned references (collection removed by theme switch) fall back gracefully to the raw string.

**Acceptance:**
- Extract `resolveUsageTitle` into `src/utils/mediaUsageDisplay.js`; both `MediaGridItem` and `MediaListItem` import from it.
- Both consumers handle the `collection:` prefix and look up the friendly title in `usageTitleMap`.
- `Media.jsx` useEffect extended to fetch collection schemas + items in parallel via `Promise.all`, preserving the existing `global:*` seed and `page.id`/`page.slug` dual-key mapping.
- Falls back to the raw source string when the schema or item can't be resolved.
- Manually verified with at least one project that has a real `collection:type/slug` usage row — requires items created via Phase 13 (the add/edit form) so the end-to-end user-visible attribution path is exercised, not just synthetic seeded data.

**Dependencies:** Phase 6, Phase 10, Phase 13.

---

> **Milestone:** After Phase 14, ship the spec's Phase 1 end-to-end. Theme authors declare collections, users author items in a CMS, widgets render lists via `| collection`, the media library shows correct attribution. **No individual item pages yet.**

---

## Phase 15 — Path resolution: asset/tag prefixing

**What you'll have:** Every asset-emitting tag in publish mode now consults `outputPathPrefix`. Pages still render byte-identical to today because they pass `outputPathPrefix = ""`. Menu links and post-render rewrites still need updates (those land in Phases 16–17).

**Goal:** Lock in the asset-side path infrastructure on its own so reviewers and tests can validate it in isolation before the bigger link/post-processing changes follow.

**Acceptance:**
- `createBaseRenderContext` accepts and exposes `outputPathPrefix` (defaults to `""`) and `currentCanonicalPath` globals.
- `imagePath` / `filePath` globals in publish mode use `${outputPathPrefix}assets/...`.
- `site_icons` is shallow-copied per render with each href prefixed.
- Tag updates: `assetTag`, `renderHeaderAssets` (asset URLs AND preload `href` AND each URL in `imagesrcset`), `renderFooterAssets`, `placeholderImageTag`, `renderEnqueuedAssetTags`. (`imageTag` needs no edit — it picks up the prefixed `imagePath` from context.)
- Unit tests at depth 0 (`""`) and depth 1 (`"../"`) for each updated tag.
- Pages render byte-identical to current output (regression test deferred to Phase 17 where the full pipeline is exercised).

**Dependencies:** Phase 7 (for `prefixInternalHref` used by the preload `imagesrcset` rewrite).

---

## Phase 16 — Path resolution: menu/link prefixing

**What you'll have:** Page links and menu items now use `prefixInternalHref` everywhere; menu items carry a separate `canonicalPath` so active-state matching survives prefixing.

**Goal:** Make sure every link emitted in publish mode is depth-aware, including custom URLs that bypass `pageUuid` resolution, and that menu active-state highlighting still works correctly at depth.

**Acceptance:**
- `resolveLinkValue` uses `prefixInternalHref` after `pageUuid` → slug computation.
- `resolveMenuItemLinks` uses `prefixInternalHref` for **every** menu item (pageUuid-resolved AND custom URLs). The empty-`pagesByUuid` short-circuit is removed.
- `resolveMenuItemLinks` populates `canonicalPath` (un-prefixed, normalized via the shared `normalize` helper) on each menu item.
- `resolveMenuPageLinks` wrapper + its widget/block call sites in `renderingService.js` thread `outputPathPrefix`.
- `menu.liquid` snippet compares `item.canonicalPath` vs new `currentCanonicalPath` global (instead of `pageSlug + ".html"`).
- Tests cover: page link from root and from depth, menu link with pageUuid from root and from depth, menu link with custom URL from root and from depth, menu link with empty `pagesByUuid`, menu active-state at depth (item's own canonical path matches), padded custom URL (e.g., `"  about.html  "`) renders prefixed and active-matches correctly.

**Dependencies:** Phase 15.

---

## Phase 17 — Path resolution: export post-processing + page byte-equality regression

**What you'll have:** The export's post-render rewrites and markdown alternate-link fallback are depth-aware. A regression test guarantees pages still produce byte-identical output.

**Goal:** Make sure the whole publish pipeline is depth-aware end-to-end, with a regression guardrail so future edits to the prefixer chain can't silently break pages.

**Acceptance:**
- Post-render `/uploads/images/` → `${outputPathPrefix}assets/images/` (same for `/uploads/files/`).
- Markdown alternate-link fallback uses `${outputPathPrefix}${mdFilename}` when `siteUrl` is unset.
- **Page regression test:** run export on a representative test project, capture the rendered HTML of every page, assert byte-for-byte equality with a stored snapshot. This guards the entire chain — tag changes (Phase 15), link changes (Phase 16), and post-processing (Phase 17) — against silent regressions on pages.
- **Depth-1 smoke test:** synthesize a single-item render at `outputPathPrefix = "../"` and confirm every asset URL, internal link, menu href, favicon ref, preload, `/uploads/` rewrite, and markdown alternate link is correctly prefixed.

**Dependencies:** Phase 15, Phase 16.

---

## Phase 18 — Render helpers (renderLiquidTemplate, bodyClass override, SeoTag)

**What you'll have:** Three small but load-bearing helpers Phase 19 export will compose.

**Goal:** Each helper works correctly in isolation before they're stitched into the per-item render loop.

**Acceptance:**
- `renderingService.js` exports `renderLiquidTemplate(projectId, templateString, context, sharedGlobals)` using the cached per-project engine.
- `renderPageLayout` accepts `contentSections.bodyClass`; when provided, it replaces the default `page-${slug}` computation. Pages don't set it.
- `SeoTag.resolveImageUrl` drops the `imagePath` parameter, requires `siteUrl`, returns `""` when `siteUrl` is unset.
- SeoTag skips `og:image` and `twitter:image` emits when the resolver returns `""`.
- Tests: SeoTag emits absolute `og:image` when `siteUrl` set; omits social tags when unset; absolute-URL `og_image` passes through unchanged; the `renderLiquidTemplate` helper successfully renders a trivial template through the cached engine.
- **Page byte-equality regression rerun (this phase's responsibility, not Phase 17's):** because this phase modifies `renderPageLayout` and `SeoTag.render` — code paths every page export touches — the page byte-equality snapshot test from Phase 17 must be re-executed against the new code and pass. If the snapshot needs to be regenerated (it shouldn't, given the changes are guarded by the absence of `contentSections.bodyClass` and the presence/absence of `siteUrl` for social tags), that is itself a finding worth investigating before merging.

**Dependencies:** Phase 17.

---

## Phase 19 — Phase 2 export: item-page rendering

**What you'll have:** Export creates `{outputDir}/{slugPrefix}/{itemSlug}.html` for every valid item in every `hasItemPages: true` collection, with the full HTML post-processing pipeline (formatter, validation, easter egg, /uploads/ rewrite, markdown alternate link).

**Goal:** Make sure individual item pages render correctly with the right header/footer/layout, no asset bleed between items, complete fail-fast validation on invalid items, and the same post-processing pages get.

**Acceptance:**
- `exportController` loads valid schemas via `collectionService.listCollectionSchemas`.
- **Two-pass validation**: gather all invalid items across all collections; if any exist, fail export with 400 + full per-item-per-field error list. Write no HTML.
- Subdirectory creation: `await fs.ensureDir(path.join(outputDir, schema.slugPrefix))` per `hasItemPages` collection.
- Per-item render loop creates **fresh** `sharedGlobals` (new Maps for `enqueuedStyles`, `enqueuedScripts`, `enqueuedPreloads`, `collectionCache`; cached `pagesByUuid`; `outputPathPrefix: "../"`; `currentCanonicalPath: "{slugPrefix}/{itemSlug}.html"`).
- Per-item link resolution via `resolveCollectionItemLinks` before template render.
- Template rendered via `renderLiquidTemplate`. Missing template file → clear error (`Collection "{type}" has hasItemPages: true but no template.liquid file at ...`).
- Layout wrap via `renderPageLayout` with `contentSections.bodyClass = "collection-${type} item-${slug}"`.
- **Page-shaped object built exactly per Section 13 of the spec**, with explicit acceptance for each field:
  - `id` = `"{slugPrefix}-{slug}"` (dash-shaped, CSS-safe)
  - `slug` = `"{slugPrefix}/{slug}"` (path-shaped, readable by themes)
  - `uuid` = `item.uuid`
  - `name` = `item.settings[usedAsTitleFieldId] || item.slug`
  - `created` / `updated` = pass-through from item
  - `seo.title` = `item.settings.seo_title || ""`
  - `seo.description` = `item.settings.seo_description || ""`
  - `seo.robots` = `item.settings.seo_noindex ? "noindex,follow" : "index,follow"`
  - `seo.canonical_url` = explicit `${siteUrl}/{slugPrefix}/{slug}.html` when `siteUrl` is valid, else `""`
  - `seo.og_image` = `item.settings[usedAsOgImageFieldId] || ""` (or `""` when no field flagged)
  - `seo.og_title` = `seo_title || usedAsTitle value`
  - `seo.og_type` = `"article"`
  - `seo.twitter_card` = `"summary_large_image"`
- **Full HTML post-processing** runs on each item's rendered HTML, same as pages:
  - Prettier format
  - HTML validation in dev mode (issues appended to the same export-wide `__export__issues.html` report)
  - `/uploads/` → `${outputPathPrefix}assets/` rewrite
  - Widgetizer easter-egg comment prepended
  - Markdown alternate link injected (the full markdown body itself lands in Phase 21)
- Output written to `{outputDir}/{slugPrefix}/{itemSlug}.html`.
- Tests cover: subdir creation; per-item globals isolation (style enqueued in item #1 doesn't appear in item #2); body class correct (no `page-...`); missing-template error; two-pass-validation failure with full error list; every page-shaped-object field populated correctly; HTML formatter ran; `/uploads/` rewrite uses depth prefix; easter-egg present; link resolution to a renamed page produces the new slug; link to a deleted page produces empty href.

**Dependencies:** Phase 4, Phase 6, Phase 7, Phase 8, Phase 17, Phase 18.

---

## Phase 20 — Phase 2 export: SEO outputs

**What you'll have:** Sitemap.xml and robots.txt now include collection items; manifest.json reports per-collection counts.

**Goal:** Make sure search engines discover item pages and noindex items are excluded everywhere they should be.

**Acceptance:**
- Sitemap entries appended for every valid item where `!seo_noindex`, with `lastmod: item.updated`.
- Robots.txt Disallow lines for every item where `seo_noindex === true`, deduplicated with page disallows across a **single** Set.
- Sitemap entry order is deterministic (pages first in existing order, then collection items grouped by type in listing order).
- `manifest.json` gains a `collections` array summarizing every collection (`type`, `itemPages`, `itemCount`), including those with `hasItemPages: false`.
- When `siteUrl` is unset: no sitemap or robots is generated (existing behavior preserved).
- Tests: sitemap contains item URLs; robots disallows noindex items; cross-page-and-collection dedup; manifest contains the new field with the right counts.

**Dependencies:** Phase 19.

---

## Phase 21 — Phase 2 export: markdown parity

**What you'll have:** When markdown export is enabled, collection items also get `.md` files at `{slugPrefix}/{itemSlug}.md`.

**Goal:** Markdown export reaches feature parity between pages and collection items.

**Acceptance:**
- For each item rendered in Phase 19, when `exportMarkdown === true`: render the item template (no layout wrap), pipe through Turndown, write to the matching `.md` path.
- YAML frontmatter contains `title`, `description`, `collection`, `slug`, `source_url.html`, `source_url.md`.
- HTML alternate-link href in the item's rendered HTML uses the depth-prefixed fallback when `siteUrl` is unset.
- Tests: `.md` exists at the right path; frontmatter populated; alternate link works at depth.

**Dependencies:** Phase 19.

---

> **Milestone:** After Phase 21, ship the spec's Phase 2. Themes can opt collections into individual item pages, export wires them up, SEO indexes them, markdown export covers them.

---

## Out of scope (tracked separately for a future Phase 3 plan)

- Cross-collection relationships (e.g., Portfolio item → Category) via item UUIDs
- Repeater / gallery setting types
- `{% collection ... as items %}` tag form
- Cursor-based pagination
- Draft / publish states
- Live preview for collection items
- Autosave + undo/redo on the item form
- Forms inside collection item templates — **open question** (see spec Section 14 for options A/B/C). Currently building under the interim "not wired" behavior; revisit before any phase that would integrate them.

These are documented in the spec's Section 18 ("Open Questions / Explicitly Deferred") and a future Phase 3 plan document will scope them when prioritised.
