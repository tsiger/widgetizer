# Future: Data-Source Plugins

> **Status: Proposal** — Design notes for a plugin system that pulls content from external sources (WordPress first) into Widgetizer collections. Covers the contract, the trust boundary, the WordPress specifics, and what Astro's Content Layer already proves about the shape.

---

## 0. TL;DR

The spine already exists. `setupBuilderServer({ adapters, plugins })` accepts backend plugins, `EditorProvider({ plugins })` merges frontend ones, and **collections** are already fed by an *injected loader* rather than a hard-wired service. A data-source plugin system is a third contract alongside `adapters` — not a new subsystem.

The three decisions that actually matter:

1. **Sync into collections; do not fetch at render.** Export must stay reproducible and offline-capable.
2. **Plugins never receive `storage` / `assetStorage`.** They receive scope-bound capability closures. This is what keeps a third-party plugin inside the tenant boundary and preserves the `require-scope-arg` invariant.
3. **Ownership must be explicit per source** (`mirror` / `seed` / `merge`). Astro never has to answer this because its store is a build cache. Widgetizer's collections are *authored*, so "who wins on conflict" is the central product question.

---

## 1. What already exists

| Seam | Where | Today |
| --- | --- | --- |
| Backend plugin routes | `setupBuilderServer.js:97` | `plugin.projectScopedRoutes[]` — mounted with `standardJsonParser` + `resolveActiveProject`, so a plugin route already gets a parsed body and a resolved `req.scope` |
| Frontend registry | `extension/registry.js` | Merges `navItems` / `routes` / `commands`; reserves `widgetTypes`, `inspectorPanels`, `pageTypes` |
| Lifecycle hooks | `extension/hooks.js` | `beforePublish`, `afterPublish`, `beforeProjectDelete`, `afterProjectDelete`, `beforePageDelete`, `afterPageDelete`. `before*` halt on the first `{ proceed: false }` |
| Chrome slots | `extension/slots.js` | 7 named single-node regions |
| Injected data loader | `renderingService.js:60` | `makeCollectionItemsLoaderFactory({ storage, scope })` → `deps.buildCollectionItemsLoader` → `globals.getCollectionItems` |
| DI + conformance precedent | `core/src/adapters.js`, `core/test-helpers/` | Contracts as JSDoc typedefs + runner-agnostic conformance suites per adapter |

**The loader injection is the important one.** `packages/core/src/filters/collectionFilter.js` reads items through `globals.getCollectionItems` and never imports the backend. That is structurally identical to how Astro hands a `store` to a loader — the pattern is already in the codebase, just not yet exposed to third parties.

### Facts that constrain the design

- **`builder-server` makes zero outbound HTTP requests today.** A grep across `packages/`, `app/`, `electron/`, `server.js` finds `fetch` only in the editor's own `apiFetch.js` and a build script. Data-source plugins introduce **egress as an entirely new risk surface** — there is no existing allowlist, timeout policy, or SSRF guard to inherit. (`UpstreamError` → 503 already exists in `core/errors.js`, so the error vocabulary anticipated this.)
- **There is no scheduler.** The only recurring timer is `previewTokenStore.js:52`. Sync must be trigger-driven in v1 (button, webhook, `beforePublish`); a real queue is a hosted concern.
- **`MAX_COLLECTION_ITEMS` is enforced in the controller, not the service** (`collectionController.js:119`). Any sync path that calls `writeCollectionItem` directly **bypasses the cap**. The item-count DoS ceiling has to move into — or be re-asserted by — the sync capability layer.
- **Items are flat records.** No `multiple` / `repeater` / `blocks` in a collection schema. Per-field merge is therefore trivial; modelling WP's many-to-many taxonomies is not (§6).

---

## 2. Common ground with Astro's Content Layer

Astro 5's Content Layer solved the same problem — arbitrary remote content into a typed, incrementally-cached collection. The API is small and worth copying almost verbatim.

```ts
type Loader = {
  name: string;
  load: (context: LoaderContext) => Promise<void>;
} & ({ schema?: z.$ZodType } | { createSchema?: () => Promise<{ schema; types }> });

interface LoaderContext {
  collection: string;
  store: DataStore;   // get/set/entries/keys/values/delete/clear/has
  meta: MetaStore;    // per-loader KV — the cursor/etag home
  logger; config; entryTypes;
  parseData<T>(props: { id; data; filePath? }): Promise<T>;
  renderMarkdown(content, options?): Promise<RenderedContent>;
  generateDigest(data: Record<string, unknown> | string): string;
  watcher?: FSWatcher;
  refreshContextData?: Record<string, unknown>;
}
```

A `DataEntry` is `{ id, data, body?, filePath?, digest?, rendered?, deferredRender?, assetImports? }`. Two mechanics carry the whole design:

- **`meta` → conditional fetch.** Loaders stash an ETag / `lastModified` and return early when the upstream says "not modified". `@ascorbic/feed-loader` does exactly this: `if (!wasModified) return;`
- **`digest` → write elision.** `store.set()` compares the incoming `digest` against the stored one and returns `false` without writing when they match. Unchanged items cost nothing.

### The mapping is unusually direct

| Astro | Widgetizer equivalent | Status |
| --- | --- | --- |
| `defineCollection({ loader })` | `collection-types/{type}/schema.json` + a `source` block | new field |
| `store` (collection-scoped) | `storage` adapter + `scope` → `collections/{type}/{slug}.json` | **exists** |
| `parseData` (zod validation) | `buildCollectionItemData(schema, input, existing)` — throws `CollectionValidationError` / `CollectionSlugConflictError` | **exists** |
| `renderMarkdown` → `rendered` | DOMPurify richtext + `prepareCollectionItemForRender` | **exists** |
| `id` | `slug` (+ stable `uuid` across renames) | **exists** |
| `generateDigest` | — | new (trivial) |
| `meta` | per-(source) KV | new SQLite table |
| `logger` | a sync-run log surfaced in the editor | new |
| `refreshContextData` | webhook payload from WP | new |
| `watcher` | n/a | skip |

**Where it diverges, and why it matters.** Astro loaders are build-time TypeScript writing to a cache that no human edits. Widgetizer collections are edited by a non-developer in a form. That produces two requirements Astro simply doesn't have: an **ownership model** (§4) and a **field-mapping UI** (§6) — because the user is not going to write a loader in TS.

### Three ways to actually exploit the overlap

1. **Borrow the API shape and the naming.** `load(ctx)` with `store` / `meta` / `digest` is proven, and porting a community loader becomes mostly mechanical rather than a rewrite.
2. **A `fromAstroLoader(loader)` shim is plausible but not v1.** The `LoaderContext` surface is small enough to emulate, so simple loaders (feed, Airtable, JSON APIs) could run nearly unmodified. The blocker is schemas: a zod schema cannot be auto-translated into Widgetizer setting types, so a mapping layer is still required. Worth a spike as a route into the community-loader ecosystem — not a dependency to design around.
3. **Consider the reverse direction — it may be the bigger win.** A `@widgetizer/astro-loader` that reads `data/projects/<folder>/collections/` would let Astro developers use Widgetizer as the *visual CMS* for an Astro site. It needs no new Widgetizer concepts (the on-disk format is already stable and documented), and it inverts the relationship: Widgetizer becomes the editing UI, Astro the framework.

---

## 3. The contract

A third contract alongside `adapters`, declared in `packages/core/src/sources.js` as JSDoc typedefs with a conformance suite in `core/test-helpers/sourceConformance.js` — matching the existing adapter precedent exactly.

```js
/**
 * @typedef {Object} SourcePlugin
 * @property {string}   name            // "wordpress"
 * @property {string}   displayName
 * @property {object}   configSchema    // settings[] in the standard setting-type vocabulary,
 *                                      // so the editor renders it with SettingsRenderer for free
 * @property {(ctx: SyncContext) => Promise<SyncResult>} sync
 * @property {(ctx: SyncContext) => Promise<{ ok: boolean, message: string }>} [testConnection]
 * @property {(ctx: SyncContext, payload: unknown) => Promise<SyncResult>}     [onWebhook]
 * @property {(ctx: SyncContext) => Promise<Array<object>>}                    [previewItems]
 */
```

### `SyncContext` — capabilities, not handles

The plugin gets **no `storage`, no `assetStorage`, no `db`, no bare `fetch`**. Every capability is a closure already bound to `scope`:

```js
{
  collectionType,          // which collection this source feeds
  schema,                  // the collection-type schema (the target field vocabulary)
  config,                  // decrypted per-project source config
  mode,                    // 'mirror' | 'seed' | 'merge'

  meta:    { get(key), set(key, value) },        // cursor / etag / lastModified
  logger:  { info, warn, error },                // → source_runs, shown in the editor
  http:    guardedFetch,                         // the ONLY egress path (§5)

  upsert(externalId, { settings, seo?, slug?, digest? }),  // → buildCollectionItemData → writeCollectionItem
  remove(externalId),
  listExisting(),                                // ledger rows: { externalId, uuid, slug, digest }
  ingestMedia(url, { filename? }),               // → assetStorage + mediaRepository → "/uploads/images/…"
  digest(objOrString),

  limits:  { getLimit(key) },                    // scope pre-bound
  signal,                                        // AbortSignal — cancel / timeout
}
```

This is the load-bearing decision. Because `upsert` funnels through `buildCollectionItemData`, a plugin **cannot** skip slug validation, required-field checks, DOMPurify richtext sanitization, `sanitizeHref`, `sanitizeImagePath`, or the `YYYY-MM-DD` date coercion. Untrusted WordPress HTML lands on the same sanitization path as editor-authored content, and the `require-scope-arg` lint invariant holds because the plugin never names an adapter.

`upsert` is also where `MAX_COLLECTION_ITEMS` gets re-asserted — closing the controller-only gap noted in §1.

### Persistence

Metadata to SQLite, content to the filesystem — the existing split.

```sql
CREATE TABLE collection_sources (      -- one source per collection
  id, project_id, collection_type, plugin_name,
  config_json,                         -- secrets encrypted at rest
  mode, synced_fields_json, enabled, created, updated,
  UNIQUE(project_id, collection_type)
);
CREATE TABLE source_sync_state (       -- Astro's `meta`
  source_id, key, value, PRIMARY KEY (source_id, key)
);
CREATE TABLE source_items (            -- the ledger: externalId ↔ item identity
  source_id, external_id, item_uuid, item_slug, digest, last_synced,
  PRIMARY KEY (source_id, external_id)
);
CREATE TABLE source_runs (             -- run log for the editor
  id, source_id, started, finished, status,
  created_count, updated_count, deleted_count, skipped_count, error_json
);
```

Additionally, stamp a top-level `_source: { plugin, externalId, digest, syncedAt }` onto the item JSON. It sits beside `seo` rather than inside `settings`, so `normalizeCollectionItem` will not archive it. This keeps items self-describing if the DB is reseeded and makes `source_items` a **rebuildable index** rather than the sole record.

---

## 4. Ownership — the question Astro doesn't have to answer

Declared per source; the editor UI keys off it.

| Mode | Remote authority | Editor behaviour | Deletions |
| --- | --- | --- | --- |
| `mirror` | total | items read-only, "Managed by WordPress" badge | propagate |
| `seed` | one-time import | fully editable afterwards; no further sync | ignored |
| `merge` | only `syncedFields[]` | synced fields locked, the rest editable | configurable |

`merge` is what people actually want — *pull the post body from WordPress, but let me set the hero layout locally* — and flat item records make it cheap: overwrite the declared keys, leave the rest untouched.

The digest is computed over the **remote projection only** (the synced fields), not the whole item. Otherwise a local edit to an unsynced field changes the digest and forces a pointless rewrite every run.

```
remote item → project to syncedFields → digest
  digest == ledger.digest → skip entirely          (Astro's store.set() elision)
  digest != ledger.digest → merge synced fields, bump ledger
  externalId not in ledger → create
  ledger row with no remote match → delete / orphan / ignore, per mode
```

---

## 5. Security — this is the part that is genuinely new

The server has never made an outbound request. Everything here is greenfield risk.

**SSRF.** A user-supplied WordPress URL is the textbook vector, and in a multi-tenant host it is a cross-tenant and cloud-metadata exposure. `ctx.http` must: allow `https` only (relax to `http` for OSS/local only); resolve DNS and reject loopback, RFC1918, link-local (incl. `169.254.169.254`), CGNAT, and IPv6 ULA/mapped equivalents; **re-check after every redirect** (or refuse redirects outright); cap redirects, response bytes, and wall-clock time; forbid plugin-controlled request headers beyond an allowlist.

Make this an **`EgressAdapter`** rather than a helper. Hosted then swaps in an egress proxy with per-tenant quotas, exactly as it swaps storage — and the guard is testable via a conformance suite like every other adapter.

**Code trust.** OSS runs plugins in-process: they are npm dependencies the user chose, at the same trust level as any other dep. **Hosted cannot do this.** Either only first-party source plugins are enabled there, or plugins run out-of-process (worker/isolate) with `SyncContext` marshalled over a message port. Deciding this early matters — it is the difference between a design that survives contact with hosted and one that has to be rebuilt for it.

**Credentials.** WP Application Passwords / JWT: encrypted at rest, write-only over the API (return `••••`, never the value), redacted from `logger` output and from `source_runs.error_json`.

**Limits.** Re-assert `MAX_COLLECTION_ITEMS` in `upsert` and `MAX_MEDIA_BYTES` in `ingestMedia`. Likely new `LIMIT_KEYS`: `MAX_SOURCES_PER_PROJECT`, `SOURCE_SYNC_RUNS_PER_MONTH`, `EGRESS_BYTES_PER_MONTH`.

**Content.** Already handled *provided* the plugin cannot bypass `upsert` — which is the entire argument for capability closures over raw handles.

---

## 6. The WordPress plugin

**Endpoint.** `/wp-json/wp/v2/posts?per_page=100&page=N&_embed&orderby=modified&order=asc&modified_after=<ISO>`

- `_embed` returns featured media, terms, and author inline — one request instead of an N+1 storm. This single flag is most of the performance story.
- `X-WP-Total` / `X-WP-TotalPages` headers drive pagination.
- ACF: add `acf_format=standard` when ACF-to-REST is present.
- Auth: anonymous for public posts; Application Passwords (Basic) for drafts/private.

**Incremental cursor.** Store the high-water mark in `meta`. **Gotcha:** `modified_after` compares against site-local time while `modified_gmt` is the UTC field — mixing them silently drops or re-fetches items around the offset. Normalize on GMT.

**Deletions are invisible to `modified_after`.** This is the classic incremental-sync trap. Mitigate with a periodic full reconcile — `?_fields=id&per_page=100` over all pages, diff the id set against the ledger — plus an optional WP webhook (`rest_after_insert_post`, `before_delete_post`) posting to a `projectScopedRoutes` endpoint for near-real-time updates.

**Field mapping.**

| WordPress | Collection field | Note |
| --- | --- | --- |
| `title.rendered` | the `usedAsTitle` `text` field | also seeds the slug |
| `content.rendered` | `richtext` | untrusted HTML → DOMPurify via `upsert` |
| `excerpt.rendered` | `textarea` | strip tags |
| `date_gmt` / `modified_gmt` | the `usedAsDate` `date` field | coerced to `YYYY-MM-DD` already |
| `slug` | item slug | **re-slugify** — WP slugs may be percent-encoded or non-ASCII, but the collection rule is `^[a-z0-9-]+$`; handle collisions |
| `_embedded['wp:featuredmedia'][0].source_url` | `image` | via `ingestMedia` → `/uploads/images/…` |
| `_embedded['wp:term']` | `text` (comma-joined) or `table` | **see the gap below** |
| `yoast_head_json` / RankMath | item `seo` block | maps cleanly to the 5 editable SEO fields |

**A real vocabulary gap.** There is no `relation` / `reference` setting type and no multi-select. WP categories and tags are many-to-many. v1 has to flatten them to comma-joined text or a `table`, which loses the ability to render a real tag archive. Worth naming explicitly — either accept the flattening for v1 or treat a `relation` setting type as a prerequisite.

**The mapping UI is the product.** Astro doesn't need one because a developer writes the loader. Widgetizer's user won't. So: a mapping editor (remote field → collection field, with a dot-path escape hatch), a **dry-run preview of 3 items** before the first write, and a defaults file shipped by the theme at `sources/wordpress.map.json` alongside `collection-types/news/schema.json` — consistent with "the theme owns the schema".

**Once the pipe exists, these are near-free:** RSS/Atom, Airtable, Notion, Google Sheets, Shopify, Contentful, CSV/JSON upload, a Markdown-folder importer, and a generic `json-api` source whose entire configuration is a URL plus dot-path mappings — which covers a long tail with no new code.

---

## 7. Triggering sync

No scheduler exists, so v1 is trigger-driven:

1. **"Sync now"** in the editor — a built-in route, not a plugin route, so the run/lock/log logic is shared.
2. **`beforePublish`** — already a hook; an opt-in "refresh sources before export" checkbox.
3. **Webhook** — via `projectScopedRoutes`, which already gets scope resolution.
4. **Electron interval** — in the shell only, never in `builder-server`.
5. **Hosted** — a real queue behind the same `sync(ctx)` contract.

The plugin exposes `sync(ctx)`; the **shell decides when**. Same division as adapters.

### Why not fetch at render time

A `{{ 'news' | source: 'wordpress' }}` live-fetch is tempting and wrong as a default: exports would stop being reproducible, Electron users would break offline, and render is the hot path. Sync-to-collections keeps `| collection` working unchanged — synced items are ordinary items. Leave the door open for a source-contributed render-deps loader in a hosted SSR context later; don't walk through it in v1.

---

## 8. Phasing

| Phase | Scope |
| --- | --- |
| **1 — Spine** | `SourcePlugin` contract + conformance suite in core; the four SQLite tables; `sourceService` building `SyncContext`; `EgressAdapter` with the SSRF guard; sync route + editor panel; **one first-party plugin: RSS/JSON feed** (no auth, no media, proves the pipe end to end) |
| **2 — WordPress** | `_embed` fetch, `modified_gmt` cursor, media ingestion, mapping UI, dry-run preview |
| **3 — Ownership** | `merge` mode + `syncedFields`, digest elision, reconcile pass for deletions, webhooks, `beforePublish` refresh |
| **4 — Hardening** | Hosted: out-of-process execution, egress quotas, new `LIMIT_KEYS`; `fromAstroLoader` spike; consider `@widgetizer/astro-loader` (the reverse direction) |

### Small changes to existing code this implies

- `extension/registry.js` — add `sources` to `KNOWN_KEYS` (it would warn today).
- `extension/hooks.js` — add `beforeSync` / `afterSync` to `HOOK_EVENTS`.
- `collectionController.js:119` — move (or mirror) the `MAX_COLLECTION_ITEMS` check so the sync path cannot bypass it.
- `core/adapters.js` — `EgressAdapter` in the contract table; new `LIMIT_KEYS`.
- Collection schema validation — accept an optional `source` block.

---

## 9. Open questions

1. **Hosted third-party plugins — in-process, sandboxed, or first-party only?** Decide before phase 1; it shapes `SyncContext` marshalling.
2. **Is a `relation` setting type a prerequisite for WordPress,** or is flattening taxonomies acceptable for v1?
3. **Should a source be able to create the collection type,** or only fill a theme-seeded one? Types are theme-owned today (`MAX_COLLECTIONS` exists but has no creation endpoint to gate) — a WP importer wanting a "Posts" collection pushes directly on that invariant.
4. **Do synced items participate in export fail-fast?** Export is fail-fast on a bad item; a source that syncs one malformed record would break the whole publish. Warn-and-skip is probably right for synced items.
5. **Media dedupe on re-sync** — hash-based, or keyed on the remote URL in the ledger?

---

**See also:**

- [Collections](core-collections.md) — the target data model, `| collection` filter, item-page rendering
- [Packages & Adapter Architecture](core-packages.md) — the adapter/DI/`Scope`/conformance precedent this contract mirrors
- [Platform Security](core-security.md) — sanitization pipeline and the cross-tenant isolation contract
- [Site Exporting](core-export.md) — fail-fast ordering that synced items must not break
- [Future: MCP Server](future-mcp.md) — the other "external system drives Widgetizer" proposal
