# Collections System (Custom Post Types)

> **Status**: Future Feature — 🚫 **BLOCKED**
> **Priority**: TBD
> **Complexity**: High
> **Revision**: 10 (Added a hard implementation gate: this feature MUST NOT be built until every blocker in [future-collections-blockers.md](future-collections-blockers.md) is RESOLVED. Revision 9 reworked Section 14 — forms-inside-collection-templates is an open question with documented interim behavior; that remains true.)
>
> ⛔ **Do not implement this spec yet.** A latent design conflict — preset collection-type overrides
> are destroyed by the wholesale theme-update replace (silent schema revert + user data loss) — is
> tracked in **[future-collections-blockers.md](future-collections-blockers.md)** as `BLOCKER-1`.
> Implementation is gated at **Gate 0** (Section 19) until that document has **zero** unresolved
> blockers, or each blocker has an agreed remediation written back into this spec. Append any newly
> discovered blockers to that document.

A comprehensive plan for implementing a Collections system in Widgetizer that allows users to create structured content types like Portfolios, Team Members, Testimonials, Blog Posts, etc.

## Overview

The Collections system enables:

- **Theme authors** to define collection types with custom fields (using existing setting types)
- **Users** to add/edit/delete collection items through a familiar CMS interface
- **Widgets** to display collection data dynamically via a Liquid filter
- **Export** to generate static HTML pages for individual collection items (optional per type)

---

## Implementation Phases

### Phase 1: Core Collection Definition, Storage, CMS UI, and Liquid Access

- Collection schema definition in themes
- Per-project data storage with manual ordering
- Server-side API implementation (CRUD, bulk delete, duplicate, reorder)
- Frontend navigation, listing UI, add/edit form
- **Liquid filter** (`| collection`) so widgets can render lists immediately
- Media usage tracking for collection media assets
- Link enrichment integration (collection items can reference pages by `pageUuid`)
- Item stable UUIDs (so Phase 3 can wire relationships without a backfill)
- No individual item pages yet

### Phase 2: Individual Item Pages with Templates

- Collection templates in themes (`template.liquid`)
- Export generates individual HTML files for each item (opt-in per collection type via `hasItemPages: true`)
- SEO support for collection items (sitemap, robots, canonical, OG/Twitter)
- Markdown export parity with pages
- Two-pass invalid-item validation gating export
- The full depth-aware path-resolution implementation (Section 6 — Path Resolution Strategy) — Phase 2 cannot ship without it

### Phase 3: Relationships and Advanced Features

- Cross-collection references (e.g., Portfolio item → Category) via stable item UUIDs
- Taxonomies (categories, tags)
- Advanced Liquid filtering and pagination, `{% collection ... as items %}` tag form
- Bulk import/export of collection data
- Optional repeater / gallery setting type to remove the "no multi-image" limitation

> **Why Liquid in Phase 1**: The most common use cases (testimonials carousel, team grid, logo wall) don't need individual pages — they just need widgets to read collection data. Shipping Phase 1 with Liquid access unlocks immediate value; templates can come later for content types that warrant them.

---

## Architecture

### 1. Collection Definition Schema

Collections are defined in the **theme** (not project), similar to how widgets define their settings. This allows themes to ship with pre-defined collection types.

**Authoring source**: `themes/{theme}/collection-types/{collection-name}/schema.json`

**Project runtime copy**: `data/projects/{projectFolderName}/collection-types/{collection-name}/schema.json`

This mirrors the existing `templates/` → `pages/` split: theme-owned definitions live under `collection-types/` and are copied into the project root with the rest of the theme package. Runtime APIs, rendering, and export read the project's copied `collection-types/`, not `data/themes/{theme}/`, so each project stays pinned to its applied theme version. User-owned item data lives separately under `data/projects/{projectFolderName}/collections/` and is protected content.

```
themes/arch/
├── collection-types/
│   ├── portfolio/
│   │   ├── schema.json
│   │   └── template.liquid    (Phase 2, optional)
│   ├── team/
│   │   └── schema.json
│   └── testimonials/
│       └── schema.json
├── widgets/
├── templates/
└── theme.json
```

**Example Schema** (`collection-types/portfolio/schema.json`):

```json
{
  "type": "portfolio",
  "schemaVersion": 1,
  "displayName": "tTheme:collections.portfolio.display_name",
  "displayNamePlural": "tTheme:collections.portfolio.display_name_plural",
  "icon": "Briefcase",
  "description": "tTheme:collections.portfolio.description",
  "slugPrefix": "portfolio",
  "hasItemPages": true,
  "sortable": true,
  "defaultSort": "manual",
  "settings": [
    {
      "type": "header",
      "id": "content_header",
      "label": "tTheme:collections.portfolio.settings.content_header.label"
    },
    {
      "type": "text",
      "id": "title",
      "label": "tTheme:collections.portfolio.settings.title.label",
      "required": true,
      "usedAsTitle": true
    },
    {
      "type": "textarea",
      "id": "description",
      "label": "tTheme:collections.portfolio.settings.description.label"
    },
    {
      "type": "image",
      "id": "featured_image",
      "label": "tTheme:collections.portfolio.settings.featured_image.label",
      "usedAsOgImage": true
    },
    {
      "type": "text",
      "id": "client",
      "label": "tTheme:collections.portfolio.settings.client.label"
    },
    {
      "type": "text",
      "id": "year",
      "label": "tTheme:collections.portfolio.settings.year.label"
    },
    {
      "type": "link",
      "id": "external_url",
      "label": "tTheme:collections.portfolio.settings.external_url.label",
      "hide_text": true
    },
    {
      "type": "header",
      "id": "seo_header",
      "label": "tTheme:collections.portfolio.settings.seo_header.label"
    },
    {
      "type": "text",
      "id": "seo_title",
      "label": "tTheme:collections.portfolio.settings.seo_title.label"
    },
    {
      "type": "textarea",
      "id": "seo_description",
      "label": "tTheme:collections.portfolio.settings.seo_description.label"
    },
    {
      "type": "checkbox",
      "id": "seo_noindex",
      "label": "tTheme:collections.portfolio.settings.seo_noindex.label",
      "default": false
    }
  ]
}
```

> **Note**: A `gallery` field is intentionally omitted from this v1 example. The existing `image` setting type doesn't support multiple values, and no repeater/group field type exists yet. Multi-image fields are deferred to Phase 3 — Phase 3 will introduce either a `gallery` setting type or a generic repeater so collections can have gallery-shaped data.

#### Schema Field Reference

| Field               | Type    | Purpose                                                                 |
| ------------------- | ------- | ----------------------------------------------------------------------- |
| `type`              | string  | Unique collection identifier (lowercase, no spaces)                     |
| `schemaVersion`     | number  | Bumped by theme author when schema changes; drives data migrations      |
| `displayName`       | string  | Singular label shown in UI                                              |
| `displayNamePlural` | string  | Plural label shown in sidebar/listing                                   |
| `description`       | string  | Optional help text for the collection type                              |
| `icon`              | string  | Lucide icon name for sidebar nav (validated against installed Lucide set, falls back to `Database` if unknown) |
| `slugPrefix`        | string  | URL prefix when `hasItemPages` is true (e.g., `portfolio/foo.html`)     |
| `hasItemPages`      | boolean | If true, export generates individual HTML pages (Phase 2)               |
| `sortable`          | boolean | If true, users can manually reorder items via drag handle               |
| `defaultSort`       | string  | `manual` \| `created_desc` \| `created_asc` \| `title_asc` \| `title_desc` |
| `settings`          | array   | Field definitions reusing existing setting types                        |

#### Setting Field Extensions

Existing setting types are reused, with three new optional flags:

- `usedAsTitle: true` — marks the field whose value should be used as the item's display name in listings and as the source for auto-generated slugs. **Exactly one non-header setting per collection must have this**, enforced by schema validation. Must be a `text`-type setting.
- `usedAsOgImage: true` — marks the field whose value should be used as the default `og_image` and Twitter card image for the item's individual page in Phase 2. **At most one per collection**. Must be an `image`-type setting. If omitted, no default `og_image` is emitted (the SeoTag will skip the meta tag).
- `required: true` — already supported in some setting types; collections enforce it on save and on export.

Phase 2 item-page SEO uses a simple field convention: if a schema includes a `checkbox` setting with `id: "seo_noindex"`, export treats `true` as `noindex,follow`, excludes that item from `sitemap.xml`, and adds its output path to `robots.txt` Disallow rules.

#### Schema Validation Rules

When schemas are loaded from the project copy, `collectionService` validates and normalizes them before returning anything to the UI or Liquid. Theme upload (see the "Theme Upload Validation" subsection in Section 5) runs the **same** validation up-front and rejects the upload if any schema fails.

- `type` and folder name must match and use `^[a-z0-9-]+$`.
- `slugPrefix` must use `^[a-z0-9-]+$` when `hasItemPages: true`; if omitted, defaults to `type`.
- **Exactly one non-`header` setting must declare `usedAsTitle: true`** and that setting's `type` must be `text`.
- **At most one setting may declare `usedAsOgImage: true`** and that setting's `type` must be `image`.
- `defaultSort` must be one of `manual`, `created_desc`, `created_asc`, `title_asc`, or `title_desc`; defaults to `manual` when omitted.
- `settings` may only use setting types supported by `SettingsRenderer.jsx` in v1. The list is exported from `src/components/settings/supportedSettingTypes.js` (new) so backend schema validation and the renderer stay in sync. Current supported list: `header`, `text`, `number`, `textarea`, `richtext`, `code`, `color`, `range`, `select`, `checkbox`, `radio`, `font_picker`, `menu`, `image`, `file`, `link`, `youtube`, `icon`.
- `multiple`, `blocks`, `repeater`, relationship fields, and taxonomy fields are invalid in v1, **not silently ignored** — schemas using them are rejected.
- Cross-collection: two collections in the same project cannot share the same `slugPrefix`. Enforced at theme load time and theme upload time.
- Reserved `slugPrefix` values cannot collide with export-owned root directories: `assets`. Enforced at theme load and upload.
- Invalid schemas (failing any rule above) are **skipped from the sidebar/API response and logged with their collection folder path** so theme authors can fix them. Theme upload **rejects** the entire upload if any schema is invalid.

---

### 2. Collection Data Storage

Collection items are stored **per-project** (like pages and menus).

**Location**: `data/projects/{projectFolderName}/collections/{collection-type}/{item-slug}.json`

This folder contains only user-created collection item data, not theme schema/template files.

```
data/projects/my-site/
├── collection-types/                         (copied theme definitions)
│   ├── portfolio/
│   │   ├── schema.json
│   │   └── template.liquid                   (Phase 2, optional)
│   └── team/
│       └── schema.json
├── pages/
├── menus/
├── collections/
│   ├── portfolio/
│   │   ├── _order.json                       (manual ordering, optional)
│   │   ├── project-alpha.json
│   │   ├── website-redesign.json
│   │   └── mobile-app.json
│   └── team/
│       ├── john-doe.json
│       └── jane-smith.json
└── theme.json
```

**Example Item Data** (`collections/portfolio/project-alpha.json`):

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
    "description": "A revolutionary app design...",
    "featured_image": "/uploads/images/alpha-hero.jpg",
    "client": "Acme Corp",
    "year": "2025",
    "external_url": {
      "href": "https://example.com/alpha",
      "target": "_blank"
    },
    "seo_title": "Project Alpha | My Portfolio",
    "seo_description": "Case study of Project Alpha...",
    "seo_noindex": false
  }
}
```

#### Required Item JSON fields

| Field           | Type   | Notes                                                                 |
| --------------- | ------ | --------------------------------------------------------------------- |
| `id`            | string | Equals current `slug`. Updated on rename. Used as filename basename.   |
| `uuid`          | string | Stable UUID v4. Generated on create, **never mutated**. Survives rename. |
| `slug`          | string | Equals `id`. Stored separately so the filesystem name and the in-file slug field are both authoritative. |
| `schemaVersion` | number | Bumped to the current schema version on next save after normalization. |
| `created`       | string | ISO 8601, set on create, never mutated.                                |
| `updated`       | string | ISO 8601, updated on every successful write.                           |
| `settings`      | object | User-entered values keyed by schema field `id`.                        |
| `_archived`     | object | **Optional, in-memory only**. Holds values for fields dropped by the current schema. Never written to disk. Recomputed on each read. |

Item UUIDs are included in v1 even though no v1 feature references items by UUID. This is deliberate: backfilling UUIDs into existing JSON files when Phase 3 lands is operationally painful (must touch every project) and creates two-version migration logic. Adding the field upfront costs nothing and keeps Phase 3 trivial.

**Manual Order File** (`_order.json`):

```json
{
  "order": ["project-alpha", "website-redesign", "mobile-app"]
}
```

The underscore prefix prevents `_order.json` from being mistaken for an item slug. Ordering rules:

- If `defaultSort` is not `manual`, list views and Liquid queries use that sort and `_order.json` is ignored.
- If `defaultSort` is `manual`, slugs listed in `_order.json` appear first in that order.
- Manual-order items missing from `_order.json` are appended after ordered items, sorted by `created_desc`. This covers newly-created items before the user has reordered anything.
- Stale slugs in `_order.json` are ignored on read and pruned the next time order is written, items are deleted, or items are bulk-deleted.
- `_order.json` writes use the `writeJsonAtomic` helper from Section 15 (unique-UUID-suffixed tmp + rename). This prevents both partial-write corruption and the concurrent-write collision a fixed `_order.json.tmp` name would reintroduce.

---

### 3. Slug Rules and Collision Handling

To avoid collisions when `hasItemPages: true`:

1. **Slug prefix isolation**: item pages live under `{slugPrefix}/`, so `portfolio/about.html` is fine even when `about.html` exists at the root.
2. **Cross-collection prefix uniqueness**: two collections cannot share the same `slugPrefix`. Enforced at theme load time **and theme upload time**.
3. **Reserved prefixes**: `slugPrefix` cannot use export-owned directories like `assets`.
4. **Slug generation**: item slugs are auto-generated from the `usedAsTitle` field via `sanitizeSlug()`; user can override. Validated as `^[a-z0-9-]+$` (server-side, in both route validators and the write service — belt and braces against filesystem injection).
5. **Slug uniqueness within a collection**: before create or rename, check whether `data/projects/{folderName}/collections/{type}/{slug}.json` already exists. Updates may keep their current slug, but a new target slug that belongs to another item must return a 409 conflict error with `{ error: "Slug already exists", message, conflictingSlug }` instead of overwriting that file.
6. **Slug edits (rename)**: renaming an item slug:
   - Writes the new file
   - Deletes the old file
   - Rewrites the `_order.json` entry (replacing old slug with new)
   - Removes the old `collection:{type}/{oldSlug}` media-usage source and adds the new one
   - Returns 200 with updated item data
   - The frontend re-routes to the new edit URL with `navigate(newUrl, { replace: true })`
7. **Liquid list queries** pick up the new slug on the next render; hard-coded slug links in templates or content are **not** rewritten in v1. Internal links from collection items to **pages** (stored as `link` objects with `pageUuid`) **are** rewritten automatically at render time — see Section 9 (Link Resolution and Enrichment).

Page slugs and item slugs are **not** in the same namespace — items always export beneath `{slugPrefix}/`, so a page slugged `about` and a portfolio item slugged `about` coexist as `about.html` and `portfolio/about.html`. Collision checks operate on full output paths, not raw item slugs. A page slug can match a collection `slugPrefix` in v1 (`portfolio.html` plus `portfolio/project-alpha.html`) because the static export writes `.html` files; the implementation must still reserve real output directories such as `assets/` and ensure collection prefixes are unique across collection types.

---

### 4. Schema Versioning and Migration

When a theme bumps `schemaVersion`, existing item data may have stale fields or missing required ones.

**Strategy**:

- On read, if `item.schemaVersion < schema.schemaVersion`, `collectionService` returns an **in-memory normalized item**:
  - Drop fields no longer in schema, preserving their values under the in-memory-only `_archived` map
  - Fill missing required fields with empty defaults (`""`, `false`, `0`, `{ href: "", target: "_self" }`, etc. based on field type)
  - Update `item.schemaVersion` to current
  - Set `item.invalid = true` and populate `item.validationErrors = [{ fieldId, reason }]` if any required field has a falsy value
- Migration is **non-destructive on read**: nothing is persisted by GET handlers. The normalized data is persisted on the next successful save, duplicate, or explicit future migration action.
- `_archived` is **in-memory only**, recomputed on each read. It is not written to disk. Reason: persisting it would bloat JSON forever; users can re-add the field via the schema if needed and the data is gone if they don't, which matches the rest of Widgetizer's "no hidden state" rule.
- Theme authors can ship optional `migrations.json` per collection for custom transforms (Phase 3 only — not v1).

If the user switches **themes** (not just upgrades), the new theme may have a completely different schema for the same collection `type`. The same normalization runs: unknown fields go to `_archived`, missing required fields are filled with empties and the item is flagged `invalid: true`. The user is responsible for either filling the new required fields or deleting the collection items.

This avoids the "schema and data drifted" trap that bites WordPress installs.

---

### 5. Theme Updates and Collection Lifecycle

Collections follow the same philosophy as the rest of the [theme update system](theme-updates.md): **user content is never touched; theme-controlled things get replaced; settings merge with user-wins.**

#### Theme Update Allowlist

Add `"collection-types"` to the `UPDATABLE_PATHS` array in [server/services/themeUpdateService.js:21](../server/services/themeUpdateService.js#L21) (currently `["layout.liquid", "assets", "widgets", "snippets", "locales", "screenshot.png"]`). Treat it like `widgets/` — the entire folder is replaced on update.

> ⛔ **BLOCKER-1 ([future-collections-blockers.md](future-collections-blockers.md)).** This
> wholesale replace conflicts with the "Preset Seeding" subsection below, which lets a preset
> *overwrite* the theme's collection-type schema at creation. Because updates read only the theme
> source (never `presets/`), the first theme update silently reverts a preset-derived project to the
> theme's base schema and — via Section 4 normalization — drops user data in preset-only fields.
> **Do not implement this allowlist change until BLOCKER-1 is resolved.**

`collections/` (under `data/projects/{projectFolderName}/`) is **protected user content**, in the same category as `pages/` and `uploads/`. It must never appear in the allowlist.

New project creation already copies the whole theme source into the project and excludes only `templates`, `updates`, `latest`, and `presets` (verified in [server/controllers/themeController.js:977](../server/controllers/themeController.js#L977)), so `collection-types/` is copied automatically once it exists in a theme. Project ZIP export/import and project duplication copy the whole project directory, so they carry both `collection-types/` and `collections/` automatically. `npm run theme:sync` already syncs `collection-types/` into projects because its `PROJECT_EXCLUDES` list ([scripts/theme-sync.js:17](../scripts/theme-sync.js#L17)) does not include it.

#### Theme Upload Validation

When a theme ZIP is uploaded via `POST /api/themes/upload`, the existing validator ([server/controllers/themeController.js:1195-1266](../server/controllers/themeController.js)) must be extended to:

- Walk `collection-types/*/schema.json` if the folder exists
- Run the **same** schema validation rules used at runtime (Section 1)
- Reject the upload with a 400 response if any schema is invalid, listing every offending collection and the rule(s) it violated
- Reject the upload if two collection schemas share the same `slugPrefix`
- Reject the upload if any `slugPrefix` is on the reserved list

This catches problems at upload time instead of at first sidebar render, which is much friendlier for theme authors.

#### Collection Removal

If a theme update drops a collection (or the project later sits on a theme that no longer defines it), the user's item JSON files in `data/projects/{projectFolderName}/collections/{type}/` stay on disk untouched — they're user content, in the same category as `pages/` and `uploads/`. The collection simply disappears from the sidebar because there's no schema to render its UI. If a future theme version restores the collection (same `type`), the data lights back up automatically.

No special UI is needed for orphaned data; it's a consequence of the existing "never destroy user data" rule.

#### `slugPrefix` Changes

`slugPrefix` is theme-controlled — changing it in a theme update is allowed (analogous to a theme author renaming an asset path or changing widget HTML). On the next export, item URLs move to the new prefix. **No redirect machinery is provided**; the change should be noted in the theme's changelog.

#### `hasItemPages` Flip

Flipping `false → true` is harmless (new pages appear on next export). Flipping `true → false` is a breaking change: previously exported `/{slugPrefix}/{slug}.html` files stop being generated, breaking any external links or search-engine results. Theme authors should treat this as a major version change and document it.

A future "Apply Update" preview screen could warn users when a pending update flips this flag, but it's not required for v1.

#### Required-Field Validation (Important)

When a theme update adds a new `required: true` field to an existing collection, items created before the update have no value for it. The system must surface this clearly rather than silently exporting half-broken data.

**On normalization** (schemaVersion bump):

- The new required field is added to existing items with an empty default (`""`, `null`, `0`, `false`, `[]`, or `{ href: "", target: "_self" }` depending on field type).
- The in-memory item's `schemaVersion` is bumped; the file is rewritten only on the next successful save or duplicate.
- The item is flagged as `invalid: true` in memory (not persisted to JSON — recomputed on load) and `validationErrors` is populated.

**In the editor**:

- The collection listing shows a warning badge ("Needs attention") on items with missing required values, with a count in the page header (e.g., "3 items need attention").
- A "Needs attention" filter is available at the top of the table.
- Editing an invalid item shows inline validation errors on the missing fields.
- Save is blocked until required fields have values — the user can't leave an item in an invalid state once they've opened it.

**On export** (Phase 2):

- Export refuses to publish invalid items by default.
- The export result includes a clear error listing each invalid item and which fields are missing.
- No "publish anyway" override — forcing the user to fix the data is the safer default and matches Widgetizer's existing strictness around export.
- Validation runs as a **two-pass** export: validate every item across every collection first, collect all errors, then render only if zero errors. This way the user sees the complete fix-list, not just the first failure.

This validation applies symmetrically: even items created via API or imported from JSON go through the same check.

#### Preset Seeding

> ⛔ **BLOCKER-1 ([future-collections-blockers.md](future-collections-blockers.md)).** Step 1 below
> lets a preset *overwrite* the theme's `collection-types/` at creation. The "Theme Update Allowlist"
> subsection above then replaces that same folder wholesale from the **theme** source on every update
> (presets are creation-time only — [theme-presets.md:142](theme-presets.md)). Net effect: the first
> theme update reverts a preset-derived project to the theme's base schema and silently drops
> preset-only field data. **The preset → collection-types interaction must be resolved before this
> seeding logic is implemented.** Seeding of `collections/` (item *data*) is not affected — that path
> only writes collection items, never pages, and never runs during updates.

Project presets (currently `themes/{theme}/presets/{preset}/`) bundle starter content — menus, templates, and theme.json overrides — that ship with a new project created from that preset. Today's preset structure is resolved by `resolvePresetPaths` in [server/controllers/themeController.js:530-590](../server/controllers/themeController.js), which returns `{ templatesDir, menusDir, settingsOverrides }`.

For collections, **extend `resolvePresetPaths` to also return `collectionTypesDir` and `collectionsDir`** if those folders exist under the preset:

```
themes/arch/presets/blog-starter/
├── preset.json                       (theme.json settings overrides)
├── menus/
├── templates/
├── collection-types/                 (optional — overrides theme's collection-types/)
│   └── posts/
│       ├── schema.json
│       └── template.liquid
└── collections/                      (optional — seeds project's collections/)
    └── posts/
        ├── hello-world.json
        └── why-widgetizer-rocks.json
```

Project creation flow ([server/controllers/projectController.js:154-298](../server/controllers/projectController.js)) updates:

1. After `copyThemeToProject`, if the preset has a `collection-types/` dir, **copy it into the project, overwriting** the theme's defaults. This lets a preset ship a different schema for the same collection type (e.g., a `blog-starter` preset that adds extra fields to `posts`).
2. If the preset has a `collections/` dir, **copy items into `data/projects/{folder}/collections/`**, regenerating UUIDs and timestamps on each item (same logic as project duplication's `remapDuplicatedProjectUuids`).
3. After both copies, the existing `refreshMediaUsageAfterStructuralChange(projectId, "project creation")` call already runs at line 285 — once `refreshAllMediaUsage` scans collections (Section 8 — Media Usage Tracking), seeded items' media is automatically tracked.

If a theme has no presets that seed collections, this is a no-op. If a preset does seed collections, the user gets sample content they can immediately edit or delete.

---

## 6. Path Resolution Strategy

> **This section was a critical gap in Revision 1. It must be implemented before Phase 2 ships.**

Phase 2 emits HTML files at `{slugPrefix}/{slug}.html`, which is one directory deeper than the export root. Every existing tag and helper that emits relative asset URLs assumes the HTML lives at the root and would 404 from a nested page. This section defines the fix.

### The depth problem

When `portfolio/project-alpha.html` is loaded in a browser:
- A stylesheet ref like `<link href="assets/style.css">` resolves to `/portfolio/assets/style.css` — wrong.
- An internal link like `<a href="about.html">` resolves to `/portfolio/about.html` — wrong.
- A favicon ref `<link rel="icon" href="favicon.svg">` resolves to `/portfolio/favicon.svg` — wrong.

These all need to be `../assets/style.css`, `../about.html`, `../favicon.svg`.

### Solution: `outputPathPrefix` global

A new render global, `outputPathPrefix`, holds the relative path prefix the current output file needs to reach the export root.

- Pages at the export root → `outputPathPrefix = ""`
- Collection items at `{slugPrefix}/...html` → `outputPathPrefix = "../"`
- Future nested-nested content → `"../../"`, etc.

The global is **only consulted in publish mode**. Preview mode uses absolute API URLs and is unaffected.

The global is set by the export controller per output file before calling `renderPageLayout`. The default (when nothing sets it) is `""`, so pages continue to behave exactly as today.

### Tag changes

Every publish-mode branch in the following tags prepends `globals.outputPathPrefix` to its asset URL:

| Tag                                              | Current publish output                         | New publish output                                              |
| ------------------------------------------------ | ---------------------------------------------- | --------------------------------------------------------------- |
| `{% asset src: ... %}`                           | `assets/${filepath}`                           | `${outputPathPrefix}assets/${filepath}`                         |
| `{% header_assets %}` / `{% footer_assets %}`    | `assets/${filepath}` per enqueued asset        | `${outputPathPrefix}assets/${filepath}` per enqueued asset      |
| `{% image src: ... %}`                           | uses `imagePath = "assets/images"`             | uses `imagePath = "${outputPathPrefix}assets/images"`            |
| `{% placeholder_image %}`                        | `assets/${file}`                               | `${outputPathPrefix}assets/${file}`                             |
| Preload `<link rel="preload">` `href` and `imagesrcset` | both emitted raw at [renderHeaderAssets.js:33 and :42](../src/core/tags/renderHeaderAssets.js#L33) (the `{% enqueue_preload %}` tag only stores options) | prefix the `href` and **each URL** inside `imagesrcset` via `prefixInternalHref`. `imagesrcset` is a comma-separated list of `url widthDescriptor` pairs; split, prefix each URL independently, rejoin. The fix lives in `renderHeaderAssets.js`'s preload rendering loop, **not** in `enqueuePreload.js`. |
| `renderEnqueuedAssetTags` (used by morph render) | `assets/${filepath}` per enqueued asset        | `${outputPathPrefix}assets/${filepath}` per enqueued asset      |
| `{% seo %}` canonical link                       | `${siteUrl}/${slug}.html` when siteUrl set; empty otherwise | **No change to SeoTag itself.** Collection items always set `seo.canonical_url` explicitly in the page-shaped object so the auto-derive fallback isn't reached for them. Pages continue to use the existing fallback unchanged. |
| `{% seo %}` `og:image` / `twitter:image`         | `/${imagePath}/${filename}` directly (line 110) | **Independent of `outputPathPrefix`.** SeoTag is changed to ignore the depth-aware `imagePath` global for social images and instead build absolute URLs from `siteUrl` + a constant `assets/images` base. When `siteUrl` is unset, social image tags are **omitted** (a relative URL is useless to social platforms). See "SeoTag changes" below. |

`createBaseRenderContext` in [server/services/renderingService.js](../server/services/renderingService.js) sets `imagePath` and `filePath` for publish mode. Both must consult `outputPathPrefix`:

```js
const imageBasePath =
  renderMode === "publish"
    ? `${outputPathPrefix}assets/images`
    : `${apiUrl}/api/media/projects/${projectId}/uploads/images`;
const fileBasePath =
  renderMode === "publish"
    ? `${outputPathPrefix}assets/files`
    : `${apiUrl}/api/media/projects/${projectId}/uploads/files`;
```

### SeoTag changes

`SeoTag`'s `resolveImageUrl` ([src/core/tags/SeoTag.js:98-130](../src/core/tags/SeoTag.js#L98)) currently builds `/${imagePath}/${publicFilename}`. With the depth-aware `imagePath` from this section, that would produce `/../assets/images/foo.jpg` (no siteUrl) or `https://site.com/../assets/images/foo.jpg` (with siteUrl) — both broken.

**Fix**: SeoTag stops consuming the depth-aware `imagePath` global for social images entirely. It uses a constant publish base (`assets/images`) and **only emits `og:image` / `twitter:image` meta tags when `siteUrl` is set**. Without `siteUrl`, social image meta is useless anyway — social platforms cannot fetch a relative URL — so omitting it is correct behavior.

Concretely, `resolveImageUrl` in `SeoTag.js` becomes:

```js
function resolveImageUrl(rawValue, siteUrl, mediaFiles) {
  if (!rawValue) return "";
  if (rawValue.startsWith("http")) return rawValue;
  if (!siteUrl) return ""; // social images require an absolute URL

  const filename = rawValue.split("/").pop();
  const publicFilename = getPublicImageFilename(filename, mediaFiles);
  const cleanSiteUrl = siteUrl.replace(/\/$/, "");
  return `${cleanSiteUrl}/assets/images/${publicFilename}`;
}
```

The `imagePath` argument is dropped from `resolveImageUrl`'s signature. Callers in `SeoTag.render` update accordingly. The two callers at lines 63 and 79 stop passing `imagePath`.

Two SeoTag tag emitters (`og:image` and `twitter:image`) are then **skipped** when `resolveImageUrl` returns `""` — wrap each emit in `if (ogImageUrl) ...`. The existing `hasImage` gate already does this for og_image; do the same gate for the twitter_image emit at line 79.

In-body `{% image %}` and `{% asset %}` continue to use the depth-aware `imagePath` — they're rendered inside the page body and benefit from relative paths so the export remains portable across deploy targets.

This is the **only** SeoTag change. Canonical URLs are not touched; collection items always set `seo.canonical_url` explicitly so the existing fallback path is untouched for them.

### Link resolution changes

Three sources of `href` values flow into rendered HTML, and all of them need depth-aware prefixing in publish mode:

1. **`pageUuid`-resolved links** in widget settings, menu items, and (new) collection item settings — derived from a `pagesByUuid` map at render time.
2. **Custom URLs** typed directly into the link picker or menu editor (e.g., a menu item pointing to an external blog, an internal `about.html` written by hand, a hard-coded link to a collection item like `portfolio/project-alpha.html`).
3. **`href` values inside richtext** — pre-existing limitation; not rewritten by anything today and remains untouched in v1 (user is responsible for their richtext hrefs).

For (1) and (2), introduce a shared helper that uses a **generic URI-scheme check**, not an allowlist of known schemes. Custom URLs in the menu/link picker are free-form, so the helper has to handle any URI scheme a browser would recognize (`ftp:`, `webcal:`, `blob:`, `data:`, `javascript:`, `chrome:`, vendor schemes, etc.) without enumerating them.

```js
// server/utils/linkPrefixer.js (new)

// RFC 3986: scheme = ALPHA *( ALPHA / DIGIT / "+" / "-" / "." )
// Anchored, case-insensitive. Matches any URI with a scheme regardless of
// what the scheme is — we treat them all as opaque external references.
const URI_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

// WHATWG URL spec preprocessing has TWO steps and both must happen
// before any classification. From the URL Standard:
//   1. Strip leading and trailing C0 controls (U+0000 to U+001F) and
//      U+0020 SPACE.
//   2. Then remove ALL embedded ASCII tab (U+0009), LF (U+000A), and
//      CR (U+000D) characters from the remaining input.
// Browsers do both. Without step 2, a string like "java<TAB>script:foo"
// or "about.<LF>html" would fail the scheme regex (the embedded control
// breaks the char-class match) and get treated as an internal path,
// even though a browser would strip the control first and treat it as
// a "javascript:" URL (step-2 collapse) or as "about.html".
const LEADING_TRAILING_C0_OR_SPACE = /^[\x00-\x20]+|[\x00-\x20]+$/g;
const EMBEDDED_TAB_OR_NEWLINE = /[\x09\x0A\x0D]/g;
export function normalize(href) {
  return href
    .replace(LEADING_TRAILING_C0_OR_SPACE, "")
    .replace(EMBEDDED_TAB_OR_NEWLINE, "");
}

export function prefixInternalHref(href, outputPathPrefix) {
  // Type/empty guards. Current stored values come from raw form inputs
  // (LinkInput.jsx:114 stores `selectedValue`, SortableItem.jsx:101 stores
  // `value`, Combobox.jsx:39 does not trim) and may be non-strings, null,
  // or contain leading whitespace / control characters.
  if (typeof href !== "string") return href;
  const normalized = normalize(href);
  if (!normalized || !outputPathPrefix) return href; // preserve original in passthrough

  if (URI_SCHEME.test(normalized)) return normalized;   // any scheme — output is browser-normalized form
  if (normalized.startsWith("//")) return normalized;   // protocol-relative
  if (normalized.startsWith("#")) return normalized;    // same-page anchor
  if (normalized.startsWith("?")) return normalized;    // query-string only (relative to current page)
  if (normalized.startsWith("/")) return normalized;    // root-absolute (user opted in)
  return `${outputPathPrefix}${normalized}`;
}
```

The normalization step matches the WHATWG URL spec's two-stage preprocessing. Browsers first strip leading and trailing U+0000 through U+0020 (all C0 controls plus space), then strip all embedded ASCII tab / LF / CR from what remains. We do both so the helper's classification matches what the browser will actually do with the rendered href. Without step 1, a leading-whitespace URL like `<SPACE>https://example.com` would fail the scheme test and get prefixed. Without step 2, an embedded-control URL like `java<TAB>script:void(0)` would also fail the scheme test and get prefixed, even though the browser strips the tab first and treats it as a `javascript:` URL.

The `resolveMenuItemLinks` `canonicalPath` computation uses the same normalization (see Section 6's link-resolution subsection) so active-state matching stays in sync with whatever the prefixer emits.

Notes on the guards:

- **Non-string input** (`null`, `undefined`, an accidental object) is returned as-is rather than coerced — coercion would produce strings like `"[object Object]"` that we'd then try to rewrite. Returning the value unchanged lets the downstream HTML serializer produce the same broken-but-debuggable output it would today, instead of obscuring the data error.
- **WHATWG normalization** (C0+space trim + embedded tab/LF/CR strip) runs before classification AND before prepending the prefix. Without step 1, a leading-space URL like a `<SPACE>https://example.com` value falls through to the prefix branch and gets corrupted. Without step 2, an embedded-control URL like `java<TAB>script:foo` fails the scheme regex and gets prefixed even though browsers strip the tab first. The normalized form is also what we emit, so the rendered href matches browser parsing.
- **Empty after normalize** falls through to the passthrough case (original `href` returned). An empty href is a no-op visually but preserving the original value avoids surprise edits to user content.
- A future stricter sanitizer could reject non-string hrefs at the controller layer (form validation), but `prefixInternalHref` should not crash if one slips through.

The RFC 3986 scheme regex is strict — it requires a letter then letters/digits/`+`/`-`/`.` then a colon — so it won't false-positive on a path component that happens to contain a colon mid-string (e.g., `foo/bar:baz.html` is treated as a relative path, not a URI).

Apply it at three call sites in [server/services/renderingService.js](../server/services/renderingService.js):

- **`resolveLinkValue` (line 130)** — after the `pageUuid`-driven slug computation, pass the resulting `href` through `prefixInternalHref(href, outputPathPrefix)`. The function must thread `outputPathPrefix` in from `globals`; same plumbing as the asset-tag change.
- **`resolveMenuItemLinks` (line 209)** — for **every** menu item, regardless of whether it had a `pageUuid`. This fixes the gap where custom URLs typed in the menu editor (`SortableItem.jsx:96` explicitly clears `pageUuid` for custom URLs) were passing through unchanged. **Also remove the existing `pagesByUuid.size === 0` early-return short-circuit at line 210** — it was a "nothing to resolve" optimization that's no longer valid: even with an empty page map, custom URLs in menu items still need depth-prefixing. The new function structure:
  ```js
  function resolveMenuItemLinks(menuItems, pagesByUuid, outputPathPrefix) {
    if (!Array.isArray(menuItems)) return menuItems;
    return menuItems.map((item) => {
      const resolved = { ...item };
      let canonicalPath;
      if (item.pageUuid) {
        const page = pagesByUuid.get(item.pageUuid);
        if (page) {
          canonicalPath = `${page.slug}.html`;
          resolved.link = canonicalPath;
        } else {
          // Page deleted — clear the link
          canonicalPath = "";
          resolved.link = "";
          delete resolved.pageUuid;
        }
      } else {
        // Custom URL — normalize the raw stored link the same way the prefixer
        // does (WHATWG C0+space strip, type guard), so canonicalPath matches
        // what the href will resolve to. Use the same `normalize` helper
        // exported from linkPrefixer.js so the rules stay in lockstep.
        // Without this, "  about.html  " renders as ../about.html but
        // active-state compares against "  about.html  " and silently fails
        // to match.
        canonicalPath = typeof item.link === "string" ? normalize(item.link) : "";
      }
      resolved.canonicalPath = canonicalPath;
      resolved.link = prefixInternalHref(resolved.link, outputPathPrefix);
      if (Array.isArray(item.items) && item.items.length) {
        resolved.items = resolveMenuItemLinks(item.items, pagesByUuid, outputPathPrefix);
      }
      return resolved;
    });
  }
  ```
  Note: prefixing runs unconditionally after both the resolved and custom paths. The page map can be empty; menu links still get depth-aware hrefs. `canonicalPath` always reflects the same normalized form `prefixInternalHref` operates on, so menu active-state highlighting works for whitespace-padded custom URLs.
- **`resolveCollectionItemLinks`** (new — defined in Section 9) — runs the same pass over collection item link settings before they reach Liquid.

The wrapper `resolveMenuPageLinks(menuData, pagesByUuid)` at [renderingService.js:245](../server/services/renderingService.js#L245) must accept `outputPathPrefix` and pass it through to `resolveMenuItemLinks`. Its two callers — widget settings ([line 639](../server/services/renderingService.js#L639)) and block settings ([line 659](../server/services/renderingService.js#L659)) — also need to forward `outputPathPrefix` (which they already have access to via `sharedGlobals` / context). New signature:

```js
function resolveMenuPageLinks(menuData, pagesByUuid, outputPathPrefix) {
  if (!menuData || !menuData.items) return menuData;
  return { ...menuData, items: resolveMenuItemLinks(menuData.items, pagesByUuid, outputPathPrefix) };
}
```

Without this wrapper update, menu prefixing silently never happens for menu-typed widget settings — the menu items would be resolved (pageUuid → slug) but never depth-prefixed, breaking nested item pages whose templates render menus inside widgets.

Pages at root pass `outputPathPrefix = ""` which short-circuits the prefixer (`!outputPathPrefix` early return), producing identical output to today.

### Active-state vs href separation for menu items

Because menu items now carry a prefixed `link` (e.g., `../about.html`) for href display, the menu snippet can no longer compare `item.link` to `current_href`. Each resolved menu item carries a separate **un-prefixed canonical path** field for active-state comparison:

```js
// After resolveMenuItemLinks completes, each item has:
{
  ...item,
  link: "../about.html",          // prefixed, used in <a href>
  canonicalPath: "about.html",    // un-prefixed, used for is-active comparison
}
```

`canonicalPath` is set in `resolveMenuItemLinks` before the prefixer runs (capture the un-prefixed form, then prefix `link`). For `pageUuid`-resolved items it's `${page.slug}.html`. For custom URLs it's the user's input passed through the **same `normalize()` helper** the prefixer uses (so `"  about.html  "` and `"about.html"` both produce `canonicalPath: "about.html"`, and a page slug `about` matches the same active state).

The corresponding global `currentCanonicalPath` is set per render:
- For pages: `${pageData.slug}.html` (or `index.html` for the homepage; matches existing page output filenames).
- For collection items: `${slugPrefix}/${itemSlug}.html`.

### Menu active-state snippet update

[src/core/snippets/menu.liquid:18](../src/core/snippets/menu.liquid#L18) compares `current_href = pageSlug | append: '.html'` against each `item.link`. If menu links are now prefixed (`../about.html`) but `current_href` is the un-prefixed page identity (`portfolio/project-alpha.html`), the comparison never matches anywhere — which is the correct behavior for collection items linking to pages (no menu item should highlight).

However, if a menu item targets the same nested page being viewed (collection self-link), the active state would also fail because the prefixed link doesn't equal the canonical path. To handle this correctly:

- Each resolved menu item carries an additional **non-displayed** field, `canonicalPath` (e.g., `"about.html"` for pages, `"portfolio/project-alpha.html"` for collection items).
- A new global `currentCanonicalPath` is set per render (e.g., `"about.html"` or `"portfolio/project-alpha.html"`).
- The snippet compares `item.canonicalPath == currentCanonicalPath` for active state, and uses `item.link` (prefixed) for the `href` attribute.

The snippet update:

```liquid
{%- if menu.items.size > 0 -%}
  {%- unless skip_nav -%}<nav class="{{ class_nav }}"...>{%- endunless -%}
    <ul class="{{ class_list }}">
      {%- for item in menu.items -%}
        <li class="{{ class_item }}{% if item.items.size > 0 %} {{ class_has_submenu }}{% endif %}{% if item.canonicalPath == currentCanonicalPath %} is-active{% endif %}">
          <a href="{{ item.link }}" class="{{ class_link }}"{% if item.canonicalPath == currentCanonicalPath %} aria-current="page"{% endif %}>
            {{ item.label }}
          </a>
          ...
```

Themes that override `menu.liquid` (rare; the snippet is in `src/core/snippets/`) must be updated. This is documented as a Phase 2 breaking change for theme authors who override core snippets.

`pageSlug` is preserved as a global for backwards compatibility but is deprecated for active-state checks in favor of `currentCanonicalPath`.

### Site icons

[server/utils/siteIconHelpers.js:81-145](../server/utils/siteIconHelpers.js#L81) currently writes icon hrefs as bare filenames (`"favicon.svg"`). The layout template uses these via the `site_icons` global passed through `createBaseRenderContext`. Two changes:

1. `generateExportSiteIcons` continues to return un-prefixed filenames (it's called once per export, not per page). The hrefs in `site_icons` are stored as bare names.
2. `createBaseRenderContext` exposes `site_icons` as a getter/object that prepends `outputPathPrefix` to each href when read at render time. Implementation: build a per-render shallow copy of `site_icons` with each href prefixed.

The web manifest's internal `icons[].src` entries stay bare — the manifest is resolved relative to its own URL by the browser, so as long as the `<link rel="manifest" href="${outputPathPrefix}site.webmanifest">` is prefixed, the icons inside resolve correctly.

### Markdown alternate link

[server/controllers/exportController.js:394-402](../server/controllers/exportController.js) injects `<link rel="alternate" type="text/markdown" href="${mdHref}">`. When `siteUrl` is set, `mdHref` is absolute and depth-safe. When `siteUrl` is unset, the fallback uses a bare filename which breaks from nested pages.

Fix: when `siteUrl` is unset, use `${outputPathPrefix}${mdFilename}` for collection items. For pages at root this is unchanged.

### Post-render `/uploads/` rewrite

[server/controllers/exportController.js:362-364](../server/controllers/exportController.js#L362) does:

```js
processedHtml
  .replaceAll("/uploads/images/", "assets/images/")
  .replaceAll("/uploads/files/", "assets/files/");
```

This produces root-relative paths that break from nested pages. Change to:

```js
processedHtml
  .replaceAll("/uploads/images/", `${outputPathPrefix}assets/images/`)
  .replaceAll("/uploads/files/", `${outputPathPrefix}assets/files/`);
```

Pages at root unchanged (prefix is `""`).

### New exported helper: `renderLiquidTemplate`

[server/services/renderingService.js](../server/services/renderingService.js) currently exports `renderWidget`, `renderPageLayout`, `renderEnqueuedAssetTags`, and `widgetSupportsTransparentHeader`. The cached engine helper `getOrCreateEngine` is **private** (line 42).

Phase 2 export needs to render an arbitrary Liquid template (the collection item's `template.liquid`) through the same per-project cached engine that pages and widgets use. Add a new export:

```js
export async function renderLiquidTemplate(
  projectId,
  templateString,
  templateContext,
  sharedGlobals,
) {
  const projectFolderName = await getProjectFolderName(projectId);
  const projectDir = getProjectDir(projectFolderName);
  const themeSnippetsDir = path.join(projectDir, "snippets");
  const engine = getOrCreateEngine(projectDir, themeSnippetsDir);
  return engine.parseAndRender(templateString, templateContext, {
    globals: sharedGlobals,
  });
}
```

Section 13's per-item render loop uses this helper instead of duplicating engine setup. The helper is also useful for any future feature that needs to render an ad-hoc template string against a project's engine cache.

### Why depth-aware relative paths and not root-absolute

- Root-absolute (`/assets/style.css`) breaks deployments under a subpath (`example.com/site/`) and breaks `file://` previewing of the export.
- Depth-aware relative (`../assets/style.css`) works for any deploy target (root, subpath, `file://`) and matches Widgetizer's existing static-export portability promise.
- `<base href>` breaks anchor links and some JS routing.
- A render-time `{% asset_url %}` helper requires every existing theme to be rewritten.

Depth-aware relative is the only option that keeps existing themes working unchanged.

### What to verify by hand

Once implemented, smoke-test by:
1. Building a project with one page and one collection that has `hasItemPages: true` with one item.
2. Opening the exported `index.html` and the exported `{slugPrefix}/{slug}.html` in a browser with `file://`.
3. Confirming the favicon, stylesheets, scripts, images, internal page links, and menu hrefs all resolve from both files.
4. Repeating with `siteUrl` set, confirming canonical URLs and OG images use the absolute form.

---

## 7. Internationalization

`displayName`/`displayNamePlural` and field `label`/`description` values follow the same convention as widget schemas: prefer `tTheme:` locale keys (resolved against the theme's `locales/` files), with direct English strings still supported for small one-off themes. This keeps collection schemas aligned with [Widget Authoring Guide](theming-widgets.md) and avoids inventing a second i18n convention.

`SettingsRenderer` already resolves `tTheme:` keys via `useThemeLocale()` ([src/hooks/useThemeLocale.js](../src/hooks/useThemeLocale.js)). No frontend changes needed for collection schema labels.

---

## 8. Media Usage Tracking

Collection items can reference media through `image`, `file`, `link`, richtext, and nested setting values. Without tracking, export's media copying and unused-media cleanup will ignore those assets.

### Service extensions

Add the following exports to [server/services/mediaUsageService.js](../server/services/mediaUsageService.js):

- `extractMediaPathsFromCollectionItem(itemData)` — recurses through `itemData.settings` using the same upload-path rules as pages/globals (`/uploads/images/` and `/uploads/files/`, including nested link objects and arrays). Reuses the existing `collectMediaPaths` helper.
- `updateCollectionItemMediaUsage(projectId, collectionType, itemSlug, itemData)` — full update pass for one item.
- `removeCollectionItemFromMediaUsage(projectId, collectionType, itemSlug)` — removes one item's source string entirely.
- `syncCollectionItemMediaUsageOnWrite(projectId, collectionType, itemSlug, itemData, previousItemSlug = null)` — handles renames: if `previousItemSlug !== itemSlug`, removes the old source before writing the new one.

### Refresh paths

Extend `refreshAllMediaUsage(projectId)` in [server/services/mediaUsageService.js:318-416](../server/services/mediaUsageService.js#L318) to also scan `data/projects/{folderName}/collections/*/*.json`. The pattern mirrors the existing page scan (lines 352–369): list directories under `collections/`, then list `*.json` files in each (excluding `_order.json`), extract paths via `extractMediaPathsFromCollectionItem`, add to the usage map under the source string `collection:{type}/{itemSlug}`.

`projectController.js` and `themeUpdateService.js` already call `refreshMediaUsageAfterStructuralChange()` after project creation (line 285), project duplication (line 528), project import (line 1029), and applying a theme update (line 305). **Do not** add duplicate refresh calls for collections; make those existing structural refresh paths complete by teaching `refreshAllMediaUsage()` to include collection item files.

### Source string format

Page usage is stored as the bare page slug (`"home"`, `"about"`); global widgets use `global:header`/`global:footer`; theme settings use `global:theme-settings`. Collection items use `collection:{collectionType}/{itemSlug}` (for example, `collection:portfolio/project-alpha`). No new `{ contextType, contextId }` shape — the media repository contract stays as-is.

### Media library UI integration

The media library ([src/pages/Media.jsx:110-141](../src/pages/Media.jsx#L110)) builds a `usageTitleMap` (a **plain object**, keyed by source string) from the page list. Both [src/components/media/MediaGridItem.jsx:21-38](../src/components/media/MediaGridItem.jsx#L21) and [src/components/media/MediaListItem.jsx:40-50](../src/components/media/MediaListItem.jsx#L40) consume it via **bracket lookup** (`usageTitleMap[usageEntry]`) and hardcode `global:*` prefix handling. Without changes, collection source strings render as the raw `collection:portfolio/project-alpha` text in both grid and list views.

Update the media library:

1. **Extend the existing `useEffect` in `Media.jsx`** that builds `usageTitleMap` ([Media.jsx:109-141](../src/pages/Media.jsx#L109)). The current implementation:
   - Seeds three `global:*` entries (`Header (Global)`, `Footer (Global)`, `Theme Settings (Global)`) before any fetch ([Media.jsx:118-122](../src/pages/Media.jsx#L118)).
   - Fetches pages via `getAllPages()` and maps **both** `page.id` and `page.slug` to the page title ([Media.jsx:126-127](../src/pages/Media.jsx#L126)) so source strings keyed by either form resolve.
   - Re-seeds globals on error ([Media.jsx:132-136](../src/pages/Media.jsx#L132)).
   - Depends on `[mediaState.activeProject]` ([Media.jsx:141](../src/pages/Media.jsx#L141)).

   The new logic preserves **every** existing behavior and layers collections on top. The codebase does **not** use React Query (it isn't in `package.json`); the existing pattern is plain `useState` + `useEffect` (see [src/hooks/useAppSettings.js](../src/hooks/useAppSettings.js)).

   The actual file list lives at `mediaState.files` from `useMediaState()` ([Media.jsx:29](../src/pages/Media.jsx#L29), [useMediaState.js:114](../src/hooks/useMediaState.js#L114)). Collection types-in-use are derived from that list, so the effect dependency expands to include it.

   ```jsx
   const { files, activeProject } = mediaState;

   useEffect(() => {
     let cancelled = false;

     // Hoisted so both the success and error paths seed the same global entries.
     function seedGlobals() {
       return {
         "global:header": "Header (Global)",
         "global:footer": "Footer (Global)",
         "global:theme-settings": "Theme Settings (Global)",
       };
     }

     async function loadUsageTitles() {
       if (!activeProject) {
         if (!cancelled) setUsageTitleMap({});
         return;
       }

       const map = seedGlobals();

       try {
         // Pages — preserve the existing dual-key behavior: source strings
         // may key by either page.id or page.slug, so map both.
         const pages = await getAllPages();
         for (const page of pages) {
           const pageTitle = page.name || page.title || page.slug;
           if (page.id) map[page.id] = pageTitle;
           if (page.slug) map[page.slug] = pageTitle;
         }

         // Collection schemas — single fetch.
         const schemas = await collectionManager.getCollectionSchemas();
         const schemasByType = Object.fromEntries(schemas.map((s) => [s.type, s]));

         // Derive the set of collection types that appear in any media
         // usage row. Avoids fetching items for collections the media
         // library doesn't care about right now.
         const typesInUse = new Set();
         for (const file of files) {
           for (const source of file.usedIn ?? []) {
             if (source.startsWith("collection:")) {
               typesInUse.add(source.slice("collection:".length).split("/")[0]);
             }
           }
         }

         // Fetch items in parallel — imperative queries, not a hook loop.
         const itemLists = await Promise.all(
           [...typesInUse].map(async (type) => {
             try {
               return { type, items: await collectionManager.getAllItems(type) };
             } catch {
               return { type, items: [] }; // schema removed by theme switch, etc.
             }
           }),
         );

         for (const { type, items } of itemLists) {
           const schema = schemasByType[type];
           if (!schema) continue;
           const titleFieldId = schema.settings.find((s) => s.usedAsTitle)?.id;
           for (const item of items) {
             map[`collection:${type}/${item.slug}`] =
               `${schema.displayName}: ${item.settings?.[titleFieldId] ?? item.slug}`;
           }
         }

         if (!cancelled) setUsageTitleMap(map);
       } catch (err) {
         console.warn("Could not build media usage title map:", err);
         // Match the existing error fallback — keep globals visible at least.
         if (!cancelled) setUsageTitleMap(seedGlobals());
       }
     }

     loadUsageTitles();
     return () => { cancelled = true; };
   }, [activeProject, files]);
   ```

   The dependency adds `files` because the set of collection types we need item-fetches for derives from `file.usedIn`. `files` identity is stable between explicit state updates in `useMediaState` (load / upload / delete), so this doesn't cause runaway refetches. Collection items created in another tab won't appear in the title map until the user triggers a media refresh (existing "Refresh usage" button) or navigates away and back.

   Falls back to the raw source string when the schema or item can't be resolved (e.g., the schema was removed by a theme switch, or the item file is gone but the usage row is stale).

   The fetch is imperative (`async` inside `useEffect`), parallel via `Promise.all`, and uses the standard `let cancelled = false` cleanup pattern to avoid stale state writes after unmount. No external query-library dependency. If the app ever adopts React Query, this can be migrated; until then it follows the existing project convention.

2. **Update both consumers**. Update `MediaGridItem.resolveUsageTitle` and the matching block in `MediaListItem.jsx` (the list view duplicates the same display logic). Both use **bracket lookup** on the plain-object `usageTitleMap`:

   ```js
   if (usageEntry.startsWith("collection:")) {
     return usageTitleMap[usageEntry] ?? usageEntry;
   }
   ```

   The raw fallback is acceptable for orphaned items (collection removed by theme switch — the user sees the path-like source string and knows where it came from).

3. **Refactor opportunity**: the duplicated `resolveUsageTitle` logic in `MediaGridItem` and `MediaListItem` is the kind of duplication that grows stale. While touching both files, extract the resolver into `src/utils/mediaUsageDisplay.js` (or co-locate next to `MediaGridItem`) and import from both consumers. Pure utility, easy to test.

Existing `global:*` and bare-page-slug behavior is unchanged.

### Known limitations (carried over from pages, documented for transparency)

- `collectMediaPaths` does not parse HTML embedded in `richtext` fields. A richtext value containing `<img src="/uploads/images/x.jpg">` is **not** tracked. This is a pre-existing limitation that affects pages and globals too; collections inherit it. Documented here so themes know to use the `image` setting type for tracked media. Fix is deferred to a separate cleanup task.
- `code` fields with `/uploads/...` references are similarly not tracked.

---

## 9. Link Resolution and Enrichment

Two distinct concerns:

- **Render-time link resolution** — at every render, look up `pageUuid` → current slug, build an `href`, and prefix for depth. This is the primary mechanism that keeps links working when pages are renamed. Today it lives in `resolveLinkValue` / `resolveMenuItemLinks` ([server/services/renderingService.js:130, 217](../server/services/renderingService.js#L130)) and runs for widget settings and menu items. **Collection items need their own render-time resolver** — without it, a collection item's stored `href` goes stale when the page is renamed.
- **Storage cleanup on page delete** — when a page is deleted, strip dead `pageUuid` references from other pages, menus, and (new) collection items so they don't accumulate. Today this is [server/utils/linkEnrichment.js](../server/utils/linkEnrichment.js).

Both paths need extending for collections.

### Render-time link resolution for collection items

Add a helper that walks an item's settings and resolves any link objects in place:

```js
// server/services/collectionService.js (or a shared resolver module)
import { prefixInternalHref } from "../utils/linkPrefixer.js";

export function resolveCollectionItemLinks(item, pagesByUuid, outputPathPrefix) {
  if (!item?.settings) return item;
  const resolved = JSON.parse(JSON.stringify(item));
  for (const [key, value] of Object.entries(resolved.settings)) {
    if (isLinkObject(value)) {
      resolved.settings[key] = resolveLink(value, pagesByUuid, outputPathPrefix);
    }
    // Arrays / nested objects holding link objects: recurse if the schema
    // permits them in v1. v1 schemas don't have repeaters, so a flat walk
    // of top-level settings is sufficient. Phase 3 repeater support
    // requires a recursive walker.
  }
  return resolved;
}

function resolveLink(linkValue, pagesByUuid, outputPathPrefix) {
  const { pageUuid } = linkValue;
  if (!pageUuid) {
    // Custom URL — still apply depth prefixing for internal-looking hrefs
    return { ...linkValue, href: prefixInternalHref(linkValue.href, outputPathPrefix) };
  }
  const page = pagesByUuid.get(pageUuid);
  if (!page) {
    return { href: "", text: "", target: "_self" }; // page deleted
  }
  return {
    ...linkValue,
    href: prefixInternalHref(`${page.slug}.html`, outputPathPrefix),
  };
}
```

Call sites:

1. **Liquid `| collection` filter** (Section 12). Before returning items to Liquid, the loader callback in `renderingService.js` runs each item through `resolveCollectionItemLinks(item, pagesByUuid, outputPathPrefix)`. `pagesByUuid` is the same map already loaded by `loadPagesByUuid` for the render — cached on `sharedGlobals.pagesByUuid` so the filter doesn't reload it per call.
2. **Phase 2 item-page export** (Section 13). In the per-item render loop, run `resolveCollectionItemLinks` before passing `item` into the template context.

The API GET endpoints (read services, controllers) return **raw** item data with un-resolved `pageUuid` — the editor consumes the raw form so the link picker can show the page name and reset `pageUuid` correctly on edit.

### Storage cleanup extensions

[server/utils/linkEnrichment.js](../server/utils/linkEnrichment.js) functions to extend:

- **`cleanupDeletedPageReferences(projectFolderName, deletedPageUuid)`** — already walks all pages and all menus stripping `pageUuid` matches. Add a walk over `data/projects/{folder}/collections/*/*.json`: for each item, find any setting value (or nested value) that is a link object with `pageUuid === deletedPageUuid` and clear it to `{ href: "", text: "", target: "_self" }`. Rewrite the item file using the atomic write pattern from Section 15. After all rewrites, call `syncCollectionItemMediaUsageOnWrite` for each touched item to refresh tracking.

- **`enrichNewProjectReferences(projectFolderName)`** — called after project creation from templates. Walks template-derived pages to wire up internal links. Add a similar pass over seeded collection items (from preset `collections/`): if any item has a link with `slug` (template format) instead of `pageUuid`, look up the matching page and convert. Most presets won't need this; it's a safety net.

- **`remapDuplicatedProjectUuids(newFolderName)`** — called after project duplication. Currently regenerates page UUIDs and remaps `pageUuid` refs in menus and widgets. Add:
  - Walk `data/projects/{newFolderName}/collections/*/*.json`
  - Regenerate each item's `uuid` (the collection-item UUID, not the page UUID)
  - For each link setting with `pageUuid`, look up the old → new page UUID mapping and rewrite. (Reuses the same map already built by the page-UUID regeneration step.)
  - Use atomic writes for each item file (Section 15).

### Why both render-time resolution AND storage cleanup

- Render-time resolution makes link rewrites cheap: page renames touch nothing on disk; the next render picks up the new slug.
- Storage cleanup handles deletes (where there's no slug to resolve to) so dead `pageUuid` refs don't survive forever in JSON.
- Pages already use this split; collections inherit the same pattern.

### Phase 3 forward-compatibility

When Phase 3 adds cross-collection relationships, both `resolveCollectionItemLinks` (render-time) and `cleanupDeletedPageReferences` (storage) will also need to handle collection-item UUID references inside other collection items. Adding `uuid` to items in v1 (Section 2) lets us build the mapping table in `remapDuplicatedProjectUuids` now; Phase 3 adds the consumers without a backfill.

---

## 10. Server-Side Implementation

### Config Paths

**File**: [server/config.js](../server/config.js)

These helpers accept the project **folder name** for filesystem paths, not the project UUID — matching the pattern used by `getProjectDir`, `getProjectPagesDir`, etc. Collection API handlers use `req.activeProject.folderName` from `resolveActiveProject`. If a future utility is called outside an active-project route, resolve the UUID first with `await getProjectFolderName(projectId)`.

```javascript
// Collection paths (NEW)
export const getProjectCollectionsDir = (projectFolderName) =>
  path.join(getProjectDir(projectFolderName), "collections");
export const getProjectCollectionDir = (projectFolderName, collectionType) =>
  path.join(getProjectCollectionsDir(projectFolderName), collectionType);
export const getProjectCollectionItemPath = (projectFolderName, collectionType, itemSlug) =>
  path.join(getProjectCollectionDir(projectFolderName, collectionType), `${itemSlug}.json`);
export const getProjectCollectionOrderPath = (projectFolderName, collectionType) =>
  path.join(getProjectCollectionDir(projectFolderName, collectionType), "_order.json");

// Copied theme collection type/schema paths (runtime source)
export const getProjectCollectionTypesDir = (projectFolderName) =>
  path.join(getProjectDir(projectFolderName), "collection-types");
export const getProjectCollectionSchemaPath = (projectFolderName, collectionType) =>
  path.join(getProjectCollectionTypesDir(projectFolderName), collectionType, "schema.json");
export const getProjectCollectionTemplatePath = (projectFolderName, collectionType) =>
  path.join(getProjectCollectionTypesDir(projectFolderName), collectionType, "template.liquid");
```

Do not name runtime helpers `getThemeCollection...` unless they truly read installed theme sources. Theme upload/update code can inspect `path.join(themeSourceDir, "collection-types")`, but the editor and export path use the project copy.

### Service

Keep most filesystem/schema logic in a service so Liquid, export, and HTTP handlers share one implementation.

**New service**: `server/services/collectionService.js`

| Function | Description |
| --- | --- |
| `listCollectionSchemas(projectFolderName)` | Read `data/projects/{folderName}/collection-types/*/schema.json`, validate schemas, enforce unique `type`/`slugPrefix`, and return UI-safe schema objects with `itemCount` and `invalidCount` computed. |
| `getCollectionSchema(projectFolderName, collectionType)` | Return one validated schema or throw a 404-style error. |
| `listCollectionItems(projectFolderName, collectionType, options)` | Read item JSON files (excluding `_order.json`), apply schema defaults/normalization in memory, compute `title`, `url`, `invalid`, and `validationErrors`, then sort per `options.sort ?? defaultSort` with `options.limit` / `options.offset`. |
| `readCollectionItem(projectFolderName, collectionType, itemSlug)` | Read and normalize one item. |
| `buildCollectionItemData(schema, input, existingItem)` | Apply defaults, preserve `created` and `uuid` (or generate uuid for new items), generate or sanitize slug, sanitize settings, enforce required fields, and return `{ item, previousSlug }`. Sets `updated` to now. |
| `writeCollectionItem(projectId, projectFolderName, collectionType, item, previousSlug)` | Check slug uniqueness, write JSON via the **rename-safe sequence** (Section 15 — Concurrency, Atomicity, and Edge Cases), update `_order.json` atomically, and sync media usage. |
| `deleteCollectionItem(projectId, projectFolderName, collectionType, itemSlug)` | Delete JSON, remove `_order.json` entry, and remove media usage source. |
| `bulkDeleteCollectionItems(projectId, projectFolderName, collectionType, itemSlugs)` | Delete matching JSON files, remove all deleted slugs from `_order.json` in one pass, and remove media usage sources. Returns `{ deleted, notFound, errors }` for partial-failure reporting. |
| `duplicateCollectionItem(...)` | Copy settings, copy-suffix title, generate a unique slug, generate a new uuid, reset timestamps, sync media usage, and insert the duplicate slug immediately after the source slug in `_order.json` when present. If the source slug is not in `_order.json`, append the duplicate under the manual-order fallback rules. |
| `loadCollectionTemplate(projectFolderName, collectionType)` | Phase 2: read `template.liquid` from the project `collection-types/` copy. Returns `null` if missing. |

Use `sanitizeSlug()`/`generateUniqueSlug()` from `server/utils/slugHelpers.js`; do not duplicate slug rules in the controller.

### Controller

**New controller**: `server/controllers/collectionController.js`

| Function                         | Description                                                |
| -------------------------------- | ---------------------------------------------------------- |
| `getCollectionSchemas(req, res)` | Get all collection schemas from the active project's copied `collection-types/`, including `itemCount` and `invalidCount` for sidebar/list badges |
| `getCollectionSchema(req, res)`  | Get single schema by type                                  |
| `getAllItems(req, res)`          | Get all items for a collection type (sorted, may apply query params for limit/offset/filter-by-invalid) |
| `getItem(req, res)`              | Get single collection item by slug                         |
| `createItem(req, res)`           | Create new collection item; updates media usage; returns 201 |
| `updateItem(req, res)`           | Update collection item; diffs media usage; returns 200 (or 409 on slug conflict) |
| `deleteItem(req, res)`           | Delete collection item; removes media usage; returns 200   |
| `bulkDeleteItems(req, res)`      | Bulk delete collection items; returns 200 on full success or 207 with `{ deleted, notFound, errors }` on partial |
| `duplicateItem(req, res)`        | Duplicate a collection item with new slug; returns 201     |
| `reorderItems(req, res)`         | Persist manual order to `_order.json` atomically; returns 200 |

All write handlers return `Cache-Control: no-store` on responses. Frontend cache invalidation is the caller's responsibility — pages calling these endpoints (`CollectionItemAdd`, `CollectionItemEdit`, `CollectionItems`) explicitly `refetch()` the relevant `useCollections` / `useCollectionItems` hooks after a successful write, matching how `pageManager` consumers refetch after page CRUD. No external query library is used.

### Routes

**New routes**: `server/routes/collections.js`

```javascript
import express from "express";
import { body, param } from "express-validator";
import * as collectionController from "../controllers/collectionController.js";
import { resolveActiveProject } from "../middleware/resolveActiveProject.js";
import { standardJsonParser } from "../middleware/jsonParser.js";
import { validateRequest } from "../middleware/validateRequest.js";

const router = express.Router();
router.use(standardJsonParser);
router.use(resolveActiveProject);

const slugParam = (name) =>
  param(name)
    .matches(/^[a-z0-9-]+$/)
    .withMessage(`${name} must contain lowercase letters, numbers, and hyphens only.`);

// Schema endpoints
router.get("/schemas", collectionController.getCollectionSchemas);
router.get(
  "/schema/:collectionType",
  [slugParam("collectionType")],
  validateRequest,
  collectionController.getCollectionSchema,
);

// Item CRUD endpoints
router.get(
  "/:collectionType",
  [slugParam("collectionType")],
  validateRequest,
  collectionController.getAllItems,
);
router.get(
  "/:collectionType/:itemSlug",
  [slugParam("collectionType"), slugParam("itemSlug")],
  validateRequest,
  collectionController.getItem,
);
router.post(
  "/:collectionType",
  [slugParam("collectionType"), body("settings").isObject().withMessage("settings must be an object.")],
  validateRequest,
  collectionController.createItem,
);
router.put(
  "/:collectionType/:itemSlug",
  [
    slugParam("collectionType"),
    slugParam("itemSlug"),
    body("settings").isObject().withMessage("settings must be an object."),
  ],
  validateRequest,
  collectionController.updateItem,
);
router.delete(
  "/:collectionType/:itemSlug",
  [slugParam("collectionType"), slugParam("itemSlug")],
  validateRequest,
  collectionController.deleteItem,
);
router.post(
  "/:collectionType/bulk-delete",
  [slugParam("collectionType"), body("itemSlugs").isArray({ min: 1 })],
  validateRequest,
  collectionController.bulkDeleteItems,
);
router.post(
  "/:collectionType/:itemSlug/duplicate",
  [slugParam("collectionType"), slugParam("itemSlug")],
  validateRequest,
  collectionController.duplicateItem,
);
router.post(
  "/:collectionType/reorder",
  [slugParam("collectionType"), body("order").isArray()],
  validateRequest,
  collectionController.reorderItems,
);

export default router;
```

Collections are site-workspace content like pages and menus, so the v1 routes intentionally do **not** include `:projectId`. `apiFetch` already injects `X-Project-Id`, `resolveActiveProject` attaches `req.activeProject`, and write requests are protected against project switches.

Mount in `server/createApp.js` alongside pages/menus:

```javascript
import collectionsRoutes from "./routes/collections.js";

app.use("/api/collections", collectionsRoutes);
```

---

## 11. Frontend Implementation

### Routes

**File**: [src/App.jsx](../src/App.jsx)

```jsx
{
  path: "collections/:collectionType",
  element: <CollectionItems />,
},
{
  path: "collections/:collectionType/add",
  element: <CollectionItemAdd />,
},
{
  path: "collections/:collectionType/:itemSlug/edit",
  element: <CollectionItemEdit />,
},
```

### Pages

| Page                     | Description                                                       |
| ------------------------ | ----------------------------------------------------------------- |
| `CollectionItems.jsx`    | Lists all items (table like `Pages.jsx`) with search, multi-select bulk delete, row-action menu (Edit / Duplicate / Delete), drag-to-reorder when `sortable: true`, and "Needs attention" filter when any items are invalid |
| `CollectionItemAdd.jsx`  | Form to add new item (renders settings via `SettingsRenderer`)    |
| `CollectionItemEdit.jsx` | Form to edit existing item; navigates to new URL with `navigate(newPath, { replace: true })` on slug change |

Add `src/components/collections/CollectionItemForm.jsx` as the shared add/edit form. It uses `react-hook-form` like `PageForm.jsx`, calls `useGuardedFormPage(isDirty)` for unsaved changes, renders schema fields with `SettingsRenderer`, and passes validation errors into the renderer's `error` prop. It auto-generates the slug from the `usedAsTitle` field value when the user hasn't manually edited the slug (same pattern as `PageForm`'s name → slug auto-generation).

Form layout:
- The slug field is always shown, editable, with auto-generation from `usedAsTitle`.
- `header`-type settings render as section dividers; sections are **not** collapsible in v1 (keeps the form simple; matches widget settings panel pattern).
- Required fields show a `*` next to the label (matching `PageForm`).
- Invalid items load with their `validationErrors` already populated as form errors — the user sees the problems immediately.

Reused components/hooks: `SettingsRenderer`, `Table`, `ConfirmationModal` via `useConfirmationAction`, `PageLayout`, `SortableList`, `useFormNavigationGuard` / `useGuardedFormPage`, `useFormatDate`, `useToastStore`, and `useThemeLocale`.

### Hooks & Queries

| File                               | Purpose                           |
| ---------------------------------- | --------------------------------- |
| `src/queries/collectionManager.js` | API calls for collection CRUD     |
| `src/hooks/useCollections.js`      | Hook returning `{ schemas, loading, error, refetch }` for collection schemas with `itemCount`/`invalidCount`. Plain `useState` + `useEffect` with a small module-level cache, matching the [`useAppSettings`](../src/hooks/useAppSettings.js) pattern. No external query library. |
| `src/hooks/useCollectionItems.js`  | Hook returning `{ items, loading, error, refetch }` for collection items of a single type. Same pattern. |

`collectionManager.js` calls the active-project endpoints above (`/api/collections/...`) and relies on `apiFetch` for the `X-Project-Id` header, matching `pageManager.js` and `menuManager.js`. Functions mirror the controller surface: `getCollectionSchemas`, `getCollectionSchema`, `getAllItems`, `getItem`, `createItem`, `updateItem`, `deleteItem`, `bulkDeleteItems`, `duplicateItem`, `reorderItems`. Errors are wrapped via the same error helper `pageManager.js` uses.

Write mutations invalidate the relevant in-hook caches: after CRUD, the calling page (`CollectionItemAdd`, `CollectionItemEdit`, `CollectionItems`) calls `refetch()` on the affected hook(s). For media-cache invalidation after write, follow the existing page pattern (the media library re-fetches its own data when refocused, or the caller can manually trigger). No global event bus required.

### Sidebar Integration

**File**: [src/components/layout/Sidebar.jsx](../src/components/layout/Sidebar.jsx)

Two adapter changes plus a dynamic data load:

1. **Label adapter**. The current `renderNavItem` calls `t(item.labelKey)`. Update to: `const label = item.label ?? t(item.labelKey)`. Pre-resolved labels (used by collection nav items, which are translated via `useThemeLocale` already) skip the i18n hook.
2. **Badge rendering**. Add an optional `badge` numeric field to nav items. When `typeof item.badge === "number"`, render a compact badge after the label. The badge shows item count for the collection (always shown, including `0` so users discover empty collections).
3. **Icon lookup**. Schema gives an icon name string (e.g., `"Briefcase"`). Build a `lucideIcons` lookup map from the existing Lucide imports plus any icons the static nav uses; if the schema icon isn't in the map, fall back to `Database`.

Dynamic data: call `useCollections()` inside `Sidebar`. Build collection nav items after Pages/Menus in the "Site" section:

```jsx
const collectionsNav = collections.map((col) => ({
  id: `collection-${col.type}`,
  label: col.displayNamePlural,
  path: `/collections/${col.type}`,
  icon: lucideIcons[col.icon] ?? Database,
  requiresProject: true,
  badge: col.itemCount ?? 0,
}));
```

`collections` is loaded via the hook; the sidebar renders the items inline. Loading state shows nothing extra (no flash of empty content). Errors are silently swallowed; collections that fail validation don't appear in the nav (the validation rule from Section 1).

### Out of scope for v1

- **Autosave**. Pages have `saveStore` with 60-second debounced autosave. Collection item forms are simpler and shorter; v1 uses explicit save only. The `useGuardedFormPage` hook prevents accidental loss.
- **Undo/redo**. `pageStore` wraps state with `zundo` temporal middleware. Collection item forms have no undo in v1; pressing Cancel after editing discards changes (with the guard prompt).
- **Live preview**. Pages have a preview iframe. Collection items in v1 are not preview-rendered (Phase 1 has no item pages; Phase 2 could add this but it's not in the v1/v2 plan).

These are documented as deliberate v1 omissions, not gaps. Adding any of them in a later phase is straightforward and doesn't break the v1 data model.

---

## 12. Liquid Integration (Phase 1)

Widgets access collection data via a Liquid filter. This is in Phase 1 because it unlocks the most common use case — rendering a list inside a widget — without requiring the heavier template system.

### Collection Filter

```liquid
{% assign portfolio_items = 'portfolio' | collection %}
{% for item in portfolio_items %}
  <div class="portfolio-card">
    <h3>{{ item.settings.title }}</h3>
    {% image src: item.settings.featured_image, size: 'medium' %}
    {% if item.url %}
      <a href="{{ item.url }}">View case study</a>
    {% endif %}
  </div>
{% endfor %}

{% comment %} With options {% endcomment %}
{% assign recent_work = 'portfolio' | collection: limit: 6, sort: 'created_desc' %}
```

**Supported options**:

- `limit: <n>` — cap the number of items returned
- `sort: 'manual' | 'created_desc' | 'created_asc' | 'title_asc' | 'title_desc'`
- `offset: <n>` — for pagination

**Item shape returned** by the filter:

```js
{
  id: "project-alpha",        // current slug
  uuid: "...",                // stable UUID
  slug: "project-alpha",
  url: "../portfolio/project-alpha.html" | null,  // null when hasItemPages=false; prefixed via outputPathPrefix in publish; absolute API URL in preview
  created: "2026-01-22T10:00:00Z",
  updated: "2026-01-22T14:30:00Z",
  settings: { /* normalized field values */ }
}
```

The `url` field is computed by the loader, not stored in JSON. It is `null` for collections with `hasItemPages: false`. In publish mode it includes `outputPathPrefix`. Themes use `{{ item.url }}` directly in href attributes.

### Implementation target

- Add `src/core/filters/collectionFilter.js` exporting `registerCollectionFilter(engine)`, following the existing `mediaMetaFilter.js` and `handleizeFilter.js` pattern.
- Import and call `registerCollectionFilter(engine)` inside `configureLiquidEngine()` in [server/services/renderingService.js](../server/services/renderingService.js).
- Keep `collectionFilter.js` dependency-light and shared-safe. It lives under `src/core/`, so it must not import `server/services/collectionService.js` or any backend-only module.
- In `renderingService.js`, attach an async loader callback to Liquid globals. The loader is set **once per page render** in `createBaseRenderContext`, not per widget. It must do three things before returning items to the filter:
  1. Call `collectionService.listCollectionItems(projectFolderName, collectionType, options)` to get raw items.
  2. Apply `resolveCollectionItemLinks(item, pagesByUuid, outputPathPrefix)` to each item so link settings reflect current page slugs and depth prefixing (Section 9). `pagesByUuid` is cached on `sharedGlobals.pagesByUuid`; the loader reuses it.
  3. Compute the `item.url` field per the rules below.
  Results are cached per `(collectionType, JSON.stringify(options))` tuple inside `globals.collectionCache = new Map()` so multiple widgets on the same page that read the same collection only hit the filesystem once. The cache must be scoped per-render (not global) because `outputPathPrefix` differs between root pages and nested item pages, which means the same collection rendered from a page vs. from an item page must not share a cached `url` field.
- The filter reads `projectId`, `renderMode`, `outputPathPrefix`, and `getCollectionItems` from `this.context.globals`. It must not accept a project ID from template input.
- The filter calls `globals.getCollectionItems(collectionType, options)` asynchronously. If the callback is missing, return an empty array and log a warning in development rather than importing backend code from `src/core`.
- The loader delegates to `collectionService.listCollectionItems(projectFolderName, collectionType, options)` so Liquid, API, and export sorting/default behavior stays identical.
- LiquidJS named filter arguments arrive as filter args; normalize both named-style calls (`collection: limit: 6, sort: 'created_desc'`) and any positional tuples LiquidJS supplies.
- The filter **excludes `invalid: true` items by default**, matching export's refusal to publish invalid collection items. In developer mode (when `developer.enabled` app setting is true), emit a warning listing skipped collection type/slug values so theme authors can spot missing required data during preview/export testing. No `includeInvalid` option ships in v1.
- The filter **adds `url` to each returned item** based on `hasItemPages` and `outputPathPrefix`. In preview mode, `url` uses the preview API route; in publish mode, it's the relative path with prefix.
- **Async-filter behavior must be verified** in a prototype before locking the API. LiquidJS supports async tags well, but async filters inside `{% for %}` loops can have surprising evaluation orders. Add a test that asserts `{% assign x = 'type' | collection %}{% for item in x %}{{ item.slug }}{% endfor %}` renders correctly.

### Scope and Sandbox

Currently widgets receive only their own settings via Liquid context. The `| collection` filter intentionally bypasses this sandbox — collection data is **global, read-only project data** and any widget can read any collection. This is by design: a "recent posts" widget defined in the theme shouldn't need configuration to know which collection to read.

Phase 1 has no draft or soft-delete state, so the filter returns all valid saved items for the active project. If drafts/soft-delete ship later, the filter must exclude unpublished/deleted items by default and continue to prevent cross-project access.

### Future: Liquid Tag (Phase 3)

```liquid
{% collection 'portfolio' limit: 6 as items %}
  {% for item in items %}
    ...
  {% endfor %}
{% endcollection %}
```

The tag form lets us add per-block scoping and pagination cleanly. Not needed for Phase 1.

---

## 13. Individual Item Pages (Phase 2)

Opt-in via `hasItemPages: true` in the schema. Collections like `testimonials` that only render inside widgets leave this false and skip the template entirely.

**Phase 2 cannot ship until Section 6 (path resolution) is implemented and verified.**

### Collection Templates

**Authoring source**: `themes/{theme}/collection-types/{type}/template.liquid`

**Project runtime copy**: `data/projects/{projectFolderName}/collection-types/{type}/template.liquid`

```liquid
{%- comment -%}
  Template for individual portfolio item pages
  Available globals (in addition to the layout's normal globals):
    item.id              — current slug
    item.uuid            — stable UUID
    item.slug            — current slug (alias of id)
    item.url             — public URL (prefixed for current depth)
    item.created         — ISO timestamp
    item.updated         — ISO timestamp
    item.settings.*      — schema field values
    collection           — the schema object
    page                 — the page-shaped object built by export (see below)
    project, theme       — same as page templates
{%- endcomment -%}

<article class="portfolio-single">
  <h1>{{ item.settings.title }}</h1>
  {% image src: item.settings.featured_image, size: 'large' %}
  <div class="meta">
    <span>{{ item.settings.client }}</span>
    <span>{{ item.settings.year }}</span>
  </div>
  <div class="content">
    {{ item.settings.description }}
  </div>

  {% if item.settings.external_url.href %}
    <a href="{{ item.settings.external_url.href }}" target="{{ item.settings.external_url.target }}">
      View project
    </a>
  {% endif %}
</article>
```

The template renders **inside** the theme's main layout (header/footer/main slots), same as page templates do today.

### Export Pipeline Changes

Update [server/controllers/exportController.js](../server/controllers/exportController.js) to:

1. **Load validated collection schemas** from the project copy via `collectionService.listCollectionSchemas(projectFolderName)`.

2. **Two-pass validation** (Section 5): for every collection where `hasItemPages: true`, load every item and check `invalid`. Collect all validation errors across all collections into a single error report. If any item is invalid, **fail the export with status 400** and include the full error list in the response. Do not render or write any HTML yet. Existing page export still runs first; collection validation gates after pages are listed but before any HTML is written.

3. **Ensure subdirectories exist** before rendering items: for each `hasItemPages` collection, `await fs.ensureDir(path.join(outputDir, schema.slugPrefix))`.

4. **Per-item render loop**. For each valid item in each `hasItemPages` collection:

   a. **Build a page-like object** for the layout and SeoTag (see "SEO field mapping" below).

   b. **Create fresh sharedGlobals** with new `enqueuedStyles: new Map()`, `enqueuedScripts: new Map()`, `enqueuedPreloads: new Map()`, fresh `collectionCache: new Map()`, the existing `siteIcons`, `exportVersion`, `themeSettingsRaw`, and the new globals `outputPathPrefix: "../"`, `currentCanonicalPath: "${slugPrefix}/${itemSlug}.html"`, `pageSlug: "${slugPrefix}/${itemSlug}"` (deprecated but kept for backwards compatibility). Also load and cache `pagesByUuid` onto `sharedGlobals.pagesByUuid` so both the header/footer widget rendering and the per-item link resolver share the same map.

   c. **Render header** (if `headerData` exists) via `renderWidget(projectId, "header", headerData, rawThemeSettings, "publish", sharedGlobals, null)`.

   d. **Resolve item links** via `resolveCollectionItemLinks(item, sharedGlobals.pagesByUuid, "../")` (Section 9). This produces a copy of the item whose `settings` link fields reflect current page slugs with depth-aware prefixing. Templates read `{{ resolvedItem.settings.some_link.href }}` and get a working href.

   e. **Render the item template**. Load via `collectionService.loadCollectionTemplate(projectFolderName, schema.type)`. If `null` (template file missing), fail the export with a clear error: `Collection "${schema.type}" has hasItemPages: true but no template.liquid file at data/projects/{folder}/collection-types/{type}/template.liquid`. Render via the new `renderLiquidTemplate(projectId, templateString, templateContext, sharedGlobals)` helper exported from `renderingService.js` (Section 6). The template context is `{ item: resolvedItem, collection: schema, page, project, theme, mediaFiles, imagePath, filePath, site_icons }` — note `globals` is **not** in the context object; it's passed separately to `renderLiquidTemplate` via the `sharedGlobals` parameter so it merges with the engine's globals option (matching the `renderWidget` / `renderPageLayout` pattern).

   f. **Render footer** (if `footerData` exists) the same way as header.

   g. **Wrap in layout** by calling `renderPageLayout(projectId, contentSections, page, rawThemeSettings, "publish", sharedGlobals)` where `contentSections` is:
      ```js
      {
        headerContent,
        mainContent: itemTemplateHtml,
        footerContent,
        bodyClass: `collection-${schema.type} item-${item.slug}`,
      }
      ```
      The `bodyClass` field is **new** and overrides the default `page-${slug}` class computation in `renderPageLayout`. See "renderPageLayout body class override" below.

   h. **Post-process the HTML**: format via Prettier, run the `/uploads/` → assets/ rewrite (which now uses `outputPathPrefix`), validate HTML in dev mode, prepend the easter-egg comment, inject the markdown alternate link if `exportMarkdown` is set.

   i. **Write** to `{outputDir}/{slugPrefix}/{itemSlug}.html`.

5. **Sitemap and robots.txt** — see "Sitemap and robots" below.

6. **Markdown export** — see "Markdown export" below.

7. **Per-item error handling**: any exception during step 4 fails the whole export (matching current page behavior). Future optimization could continue and report all failures, but two-pass validation already catches the most common class of error before render.

### Page-shaped object for the layout and SeoTag

The export builds this object per item:

```js
const page = {
  id: `${schema.slugPrefix}-${item.slug}`,         // stable identifier for validation reports and the (unused-for-collections) SeoTag fallback
  slug: `${schema.slugPrefix}/${item.slug}`,       // path-shaped, readable by themes via {{ page.slug }} — not used for body class
  uuid: item.uuid,
  name: item.settings[usedAsTitleFieldId] || item.slug,
  created: item.created,
  updated: item.updated,
  seo: {
    title: item.settings.seo_title || "",
    description: item.settings.seo_description || "",
    robots: item.settings.seo_noindex ? "noindex,follow" : "index,follow",
    canonical_url: validSiteUrl
      ? new URL(`${schema.slugPrefix}/${item.slug}.html`, siteUrl).href
      : "",
    og_image: usedAsOgImageFieldId ? item.settings[usedAsOgImageFieldId] || "" : "",
    og_title: item.settings.seo_title || item.settings[usedAsTitleFieldId] || "",
    og_type: "article",
    twitter_card: "summary_large_image",
  },
};
```

Notes:

- `slug` is path-shaped (`portfolio/project-alpha`) so themes that read `{{ page.slug }}` for analytics/identification get a useful value. It is **not** used for body class — that's overridden via `contentSections.bodyClass`.
- `id` keeps the dash-shaped form (`portfolio-project-alpha`) for stable identifiers in validation reports and any consumer that needs a CSS-safe identifier.
- `canonical_url` is **always** set explicitly when `siteUrl` is valid. The SeoTag canonical fallback is therefore not used for collection items.
- `og_image` defaults to the value of the schema field flagged `usedAsOgImage: true`. If no field is flagged, `og_image` is empty and SeoTag skips the `og:image` and `twitter:image` meta tags. With the Section 6 SeoTag change, `og_image` also requires `siteUrl` to be set — otherwise no social image meta tag is emitted regardless.
- `og_type: "article"` is appropriate for individual item pages (versus `"website"` for pages).
- `twitter_card: "summary_large_image"` is the default when an `og_image` is present; SeoTag's existing logic downgrades to `"summary"` when no image.

### renderPageLayout body class override

`renderPageLayout` in [server/services/renderingService.js:773-774](../server/services/renderingService.js#L773) currently does:

```js
const pageSlugClass = pageData?.slug ? `page-${pageData.slug}` : "";
const bodyClasses = [pageSlugClass, contentSections.extraBodyClasses || ""].filter(Boolean).join(" ");
```

`extraBodyClasses` is **appended** to `page-${slug}`, so a collection item would still get `page-portfolio/project-alpha collection-portfolio item-project-alpha` (with a slash that's invalid as a CSS class).

**Change**: `renderPageLayout` accepts a new `contentSections.bodyClass` field. When provided, it **replaces** the default computation. Pages don't set it and behave exactly as today. Collection items set it explicitly.

```js
// In renderPageLayout
const pageSlugClass = pageData?.slug ? `page-${pageData.slug}` : "";
const defaultBodyClasses = [pageSlugClass, contentSections.extraBodyClasses || ""]
  .filter(Boolean)
  .join(" ");
const bodyClasses = contentSections.bodyClass ?? defaultBodyClasses;
```

This keeps the change small (one line of logic), backwards-compatible for every existing page-export caller, and explicit at the collection-item call site.

The class shape `collection-${schema.type} item-${item.slug}` is **deliberately chosen** to:
- Avoid the `page-${slug}` pattern entirely, so a theme rule like `.page-portfolio` written for the index page `portfolio.html` doesn't accidentally also match every portfolio item page.
- Compose well: themes can target `.collection-portfolio` for collection-wide styles and `.collection-portfolio.item-project-alpha` for per-item overrides without inventing a new convention.
- Stay CSS-safe: both `schema.type` and `item.slug` are validated as `^[a-z0-9-]+$`, so no slashes, dots, or other characters that would break selector parsing.

### Sitemap and robots.txt

Existing page logic ([server/controllers/exportController.js:181-241](../server/controllers/exportController.js)) builds URLs from `pagesDataArray` only. Extend it:

1. After collecting page sitemap URLs and disallow paths, walk every `hasItemPages: true` collection and its valid items:
   - For each item where `!item.settings.seo_noindex`, push `{ url: new URL(`${schema.slugPrefix}/${item.slug}.html`, siteUrl).href, lastmod: item.updated }` onto a shared sitemap list.
   - For each item where `item.settings.seo_noindex === true`, push `/${schema.slugPrefix}/${item.slug}.html` onto the disallow list.
2. Use a single `Set` across pages and collections for disallow dedup before writing robots.txt.
3. Sitemap entry order: pages first (in their existing order), then collection items grouped by collection (in the same sorted order the listing uses). Deterministic for diff-friendly exports.

If `siteUrl` is not set, neither sitemap.xml nor robots.txt is generated (existing behavior; logged at line 239).

### Markdown export

When `exportMarkdown` is true, generate `.md` files for collection items at `{outputDir}/{slugPrefix}/{itemSlug}.md`:

1. Render the item template (without the layout wrapper) and run the same Turndown pipeline pages use ([exportController.js:411-444](../server/controllers/exportController.js)), stripping `<style>`, `<script>`, `<form>`, placeholders.
2. YAML frontmatter mirrors pages:
   ```yaml
   ---
   title: {item title}
   description: {seo_description}
   collection: {schema.type}
   slug: {item slug}
   source_url:
     html: '{slugPrefix}/{itemSlug}.html'
     md: '{slugPrefix}/{itemSlug}.md'
   ---
   ```
3. Inject `<link rel="alternate" type="text/markdown" href="...">` into the rendered HTML's `<head>` using the same logic pages use, with `outputPathPrefix` applied to the fallback path.

### Output Structure

```
output/
├── index.html
├── about.html
├── portfolio/
│   ├── project-alpha.html
│   ├── website-redesign.html
│   └── mobile-app.html
├── team/
│   ├── john-doe.html
│   └── jane-smith.html
├── sitemap.xml          # includes pages + all hasItemPages collection items
├── robots.txt           # disallows noindex pages + noindex collection items
├── favicon.svg
├── favicon-32.png
├── apple-touch-icon.png
├── site.webmanifest
├── manifest.json        # includes a collections summary (see below)
└── assets/
```

`manifest.json` gains an optional `collections` field summarizing what was exported:

```json
{
  "generator": "widgetizer",
  "widgetizerVersion": "x.y.z",
  "themeId": "arch",
  "themeVersion": "1.2.0",
  "exportVersion": 5,
  "exportedAt": "...",
  "projectName": "...",
  "collections": [
    { "type": "portfolio", "itemPages": true, "itemCount": 8 },
    { "type": "team", "itemPages": true, "itemCount": 4 },
    { "type": "testimonials", "itemPages": false, "itemCount": 12 }
  ]
}
```

Collections with `hasItemPages: false` contribute no HTML — their data is only reachable via Liquid inside widgets. They appear in the manifest with `itemPages: false` so downstream consumers (e.g., a hosting service) can see what data exists.

---

## 14. Forms Inside Collection Templates

**Status: OPEN QUESTION — decision deferred.** Build Phase 1 and Phase 2 of the spec assuming forms-in-templates is **not** wired up. Revisit before any phase that would need to integrate forms with collection templates.

### The problem

Forms (the `core-form` widget) are tracked by `formsManifestService.buildFormsManifest` which scans `pagesDataArray` widget JSON ([server/services/formsManifestService.js](../server/services/formsManifestService.js)). Collection item templates are Liquid files, not widget JSON, so the manifest builder has no mechanism to register a form embedded inside a template. Without manifest registration, hosted-forms submission rejects with "form not found."

### The options (to be decided later)

**A. Support forms in collection item templates.** Extend `formsManifestService` to also render every collection template and scan the rendered HTML for form markup. Costs:
- Template rendering pulled into manifest building (slower export).
- Fragile parsing (form markup can be split across `{% render %}` snippets).
- Ongoing maintenance whenever the form system changes.
- Probably 1–2 extra implementation phases.

**B. Explicitly don't support forms in templates.** Document the constraint. Themes that need a form on a collection item page link to a real page that has the form. Cheaper, ships sooner; accidental-success edge case (below) exists.

**C. Defer and decide later** — current status.

### Interim behavior (build against this until the decision is made)

- Collection item templates may contain any Liquid, but should not contain `<form>` markup intended for hosted-forms submission.
- Theme authors who need a form on a collection page should place the form on a regular page and link to it from the collection template.
- **Accidental-success caveat:** hosted-forms validates submissions by form key + field set. If a template embeds a form whose key happens to match a form already registered on a real page with an identical field schema, the submission may go through, but is misattributed in analytics and remains officially unregistered. Treat as undefined behavior.

### Scope of the constraint

This is **forms-only**. Other interactive widgets (sliders, accordions, etc.) run on client-side JS bundled into widget assets and have no manifest dependency — they work fine inside collection templates as long as the theme bundles their JS into a widget that's also used on at least one page (so the asset gets copied to `assets/`).

### What to revisit when deciding

- Real-world demand: are theme authors actually asking for forms on collection item pages?
- Engineering cost: has the form system stabilized enough that scanning rendered templates is feasible?
- Alternative: a `{% form %}` Liquid tag that registers with the manifest at render time, instead of scanning HTML?

---

## 15. Concurrency, Atomicity, and Edge Cases

### Atomic writes for all collection item operations

Every collection item write — create, update without rename, update with rename, duplicate, delete — uses an atomic-write helper, not the raw "write then maybe delete" pattern that pages use ([server/controllers/pageController.js:98-110](../server/controllers/pageController.js#L98)). Pages have a pre-existing exposure where a process crash mid-write can leave a partially-written JSON file the parser can't load; collections fix this from day one.

**Helper** (new): `writeJsonAtomic(filepath, data)` in `server/utils/atomicFs.js`:

1. Serialize `data` to a string.
2. Choose a **unique** temp path in the same directory as `filepath`:
   ```js
   import { randomUUID } from "node:crypto";
   const tmpPath = `${filepath}.${randomUUID()}.tmp`;
   ```
   The unique suffix is critical. The naive `${filepath}.tmp` collides when two writes to the same item overlap (two browser tabs, or a save racing a duplicate). A shared tmp path causes either a write to clobber the other's in-flight data or a rename to grab the wrong content. The UUID suffix gives each write its own private staging file.
3. `fs.writeFile(tmpPath, serialized, { flag: "wx" })` — `"wx"` fails if `tmpPath` already exists (defense against an even-more-unlucky UUID collision, which shouldn't happen but is cheap to guard).
4. `fs.rename(tmpPath, filepath)` — atomic on Linux/macOS; on Windows, `fs.rename` is also atomic for files within the same volume.
5. On any error from steps 3–4, `fs.unlink(tmpPath).catch(() => {})` in a `finally` block to avoid leaking orphan tmp files.

`writeJsonAtomic` is also used for `_order.json` updates (same unique-tmp + rename pattern).

The orphan tmp files this protocol can leave are bounded: a UUID-suffixed file only exists if a process died after creating it and before rename. The next time `listCollectionItems` reads a directory, it filters out any file matching `*.tmp` (specifically `*.[0-9a-f-]{36}.tmp`) so orphans are invisible to consumers. A separate periodic cleanup (e.g., on project open, delete `*.tmp` files older than 1 hour) can be added if orphans accumulate, but is not required for v1.

### Three distinct write operations

Collection item writes fall into three operations with **different** semantics. The rename sequence applies only to the first.

#### 1. Slug rename (update with new slug — same UUID preserved)

When an existing item's slug changes:

1. Read the existing item file.
2. Build the new item content via `buildCollectionItemData` with the new slug. **`uuid` and `created` are preserved**; `updated` is set via a **monotonic** rule:
   ```js
   const previousUpdatedMs = existingItem?.updated ? Date.parse(existingItem.updated) : 0;
   const nextUpdatedMs = Math.max(Date.now(), previousUpdatedMs + 1);
   item.updated = new Date(nextUpdatedMs).toISOString();
   ```
   This guarantees the new file's `updated` is strictly greater than the file being replaced, even when the system clock has been adjusted backward (NTP correction, daylight saving) or when an imported item carried a `updated` value in the future. Without this, the rename-recovery "pick newer `updated`" rule could deterministically choose the **older** file as the winner, defeating the purpose. The same monotonic rule is used by **all three write operations** (rename, update without rename, duplicate's new item) so any duplicate-UUID situation always has a clear winner.
3. `writeJsonAtomic({newSlug}.json, item)` — new file appears atomically.
4. `fs.unlink({oldSlug}.json)` — separate atomic step.
5. Update `_order.json` via `writeJsonAtomic` (replace old slug with new slug; prune stale slugs).
6. Sync media usage: remove `collection:{type}/{oldSlug}` source, add `collection:{type}/{newSlug}` source.

**Crash recovery (rename only)**:

- **Die between 2 and 3** — no state change; `{oldSlug}.json` is still the canonical record.
- **Die between 3 and 4** — both `{newSlug}.json` and `{oldSlug}.json` exist with the **same `uuid`** (the rename preserved it). This is the only situation in which two item files legitimately share a uuid. The new file has a newer `updated` timestamp. Recovery on next `listCollectionItems`:
  - Group items by `uuid`. For any group with more than one file, pick the file with the newer `updated` (ISO timestamp comparison; if exactly equal, fall back to lexicographic comparison of filename for a deterministic tie-breaker). The picked file is the winner; emit a warning log identifying the loser path. **Do not delete the loser on read** — a GET handler shouldn't perform destructive cleanup. The loser is excluded from the returned list and the listing UI shows a "Duplicate item file detected — open and save to clean up" banner.
  - On the next save of the winner (any save, by any field), the loser file is deleted as part of the write sequence (an explicit step: after writing, if a sibling file with the same `uuid` exists at a different slug, delete it). This makes recovery user-driven but eventually consistent.
- **Die between 4 and 6** — media usage source `collection:{type}/{oldSlug}` references a file that no longer exists; the new `{newSlug}` source hasn't been added yet, so the new file's media is untracked. **The stale window starts at step 4, not step 5** — once `{oldSlug}.json` is deleted, the corresponding usage source is dangling regardless of whether `_order.json` has been updated. Recovery: the next `refreshMediaUsageAfterStructuralChange` call (project import, project duplication, theme update apply, or the manual admin endpoint) rebuilds usage from filesystem state and fixes both halves. Document this as a known eventually-consistent recovery path; it doesn't break the editor (which displays media usage strings as-is with raw fallback) or the export (which uses media tracking only to decide which images to copy, and a stale `usedIn` source is still non-empty so the image is still copied).
- **Die between 5 and 6** — same media-usage staleness as above; `_order.json` is now consistent but media usage is not.

#### 2. Update without rename (slug preserved)

When an item is updated without changing its slug (the most common write):

1. Read the existing item file (to preserve `created` and `uuid`).
2. Build new content (`updated` incremented).
3. `writeJsonAtomic({slug}.json, item)` — overwrites the existing file atomically via unique tmp + rename.
4. Sync media usage: `updateCollectionItemMediaUsage(projectId, type, slug, item)` recomputes the source's tracked files.

No `_order.json` update needed. No old file to delete. The `writeJsonAtomic` rename replaces the file atomically; readers either see the old version (before rename) or the new version (after), never a partial write.

#### 3. Duplicate (new UUID, new slug)

Duplicate is a **distinct operation**, not a special case of rename. It creates a new item that shares only the source's `settings`:

1. Read the source item file.
2. Build new content:
   - **New `uuid` via `randomUUID()`** — duplicates must have unique UUIDs, just like page duplication ([pageController.js:602](../server/controllers/pageController.js#L602)). Reusing the source's UUID would break the rename-recovery rule (which assumes shared UUIDs mean rename-in-progress) and would later confuse Phase 3 relationship lookups.
   - New slug via `generateUniqueSlug` with copy suffix.
   - New `created` and `updated` (both set to now).
   - Copy of `settings` (and copy-suffix the `usedAsTitle` field's value, matching page-duplicate behavior).
3. `writeJsonAtomic({newSlug}.json, item)` — atomic, no collision possible (slug is unique by construction).
4. Insert the new slug into `_order.json` immediately after the source slug (manual-order rule from Section 2). Write atomically.
5. Sync media usage: add `collection:{type}/{newSlug}` source. The source item's usage is untouched.

There is no "old file" to delete and no UUID collision window. Recovery for duplicate is trivial: if the process dies between any steps, the new file either exists (and the duplicate is effectively complete; user might need to manually trigger a media-usage refresh) or doesn't (and the duplicate didn't happen). The rename-recovery rule grouping by UUID never fires for duplicates because each duplicate has its own UUID.

These three operations are documented in the test plan (Section 17) as separate recovery cases with explicit crash simulation.

### Concurrent edits

Two browser tabs editing the same item: last write wins. No optimistic locking (`If-Match` / `ETag`) in v1. This matches pages (which also have no concurrency control). Risk is low because the editor is single-user per session. Documented as a known limitation.

### `_order.json` updates

Always go through the same `writeJsonAtomic` helper described earlier in this section — **not** a fixed `_order.json.tmp` filename. A single wrapper `writeCollectionOrder` builds the new content and delegates the write:

1. Reads current order.
2. Applies the mutation (add, remove, reorder).
3. Prunes stale slugs (entries whose `.json` file no longer exists).
4. Calls `writeJsonAtomic(orderPath, newOrder)` — the helper allocates a UUID-suffixed tmp file, writes, and renames.

The UUID-suffixed tmp is the same protection used by item writes: two concurrent reorders (or a reorder racing an item create that touches the order file) each use their own private tmp file, so neither can clobber the other mid-write. Whichever rename lands second wins (last-write-wins semantics, matching the rest of the system).

### Missing template file

If a collection has `hasItemPages: true` but `template.liquid` doesn't exist in `data/projects/{folder}/collection-types/{type}/`, the export fails with a clear error before rendering anything:

```
Export failed: collection "portfolio" has hasItemPages: true but no template.liquid file at
  data/projects/my-site/collection-types/portfolio/template.liquid
Either provide a template or set hasItemPages: false in the schema.
```

The error is surfaced to the frontend via the existing export error handling.

### Validation errors during export

The two-pass validation (Section 5) collects all invalid items across all collections. The export error response includes:

```json
{
  "error": "Export failed: invalid collection items",
  "message": "3 collection items have missing required fields. Fix them and re-export.",
  "details": [
    {
      "collection": "portfolio",
      "itemSlug": "project-alpha",
      "missingFields": ["title", "year"]
    },
    {
      "collection": "team",
      "itemSlug": "john-doe",
      "missingFields": ["role"]
    }
  ]
}
```

The frontend surfaces this in the export error modal (existing pattern) with a clickable list that navigates to the invalid item's edit page.

### Path traversal defense

Even though every route validates `slugPrefix` and `itemSlug` as `^[a-z0-9-]+$`, the write services (`writeCollectionItem`, `deleteCollectionItem`) **re-validate** before any filesystem operation. Belt-and-braces against accidental bypass through an unvalidated API path or a future internal caller.

### Empty collection types directory

A theme with no `collection-types/` folder is fine — `listCollectionSchemas` returns `[]`, the sidebar adds no collection items, and export skips the collection loop. No special-case handling needed.

### Project with no items in a hasItemPages collection

The collection's listing page shows the empty state ("No items yet"). Export skips the collection's rendering loop (no items, nothing to render) but still records `itemCount: 0` in the manifest.

---

## 16. File Changes Summary

### New Files

| Path                                                 | Description                   |
| ---------------------------------------------------- | ----------------------------- |
| `server/controllers/collectionController.js`         | Collection CRUD operations    |
| `server/routes/collections.js`                       | API routes for collections    |
| `server/services/collectionService.js`               | Schema load + migration + render-time link resolution |
| `server/utils/atomicFs.js`                           | `writeJsonAtomic` helper (write to tmp, rename) — used by collection writes and `_order.json` writes |
| `server/utils/linkPrefixer.js`                       | `prefixInternalHref(href, outputPathPrefix)` shared by widget link resolver, menu link resolver, and collection item link resolver |
| `src/core/filters/collectionFilter.js`               | Liquid `collection` filter    |
| `src/components/collections/CollectionItemForm.jsx`  | Shared add/edit form          |
| `src/components/settings/supportedSettingTypes.js`   | Single source of truth for the list of supported setting types, imported by both the renderer and the schema validator |
| `src/utils/mediaUsageDisplay.js`                     | Extracted `resolveUsageTitle` helper used by `MediaGridItem` and `MediaListItem` |
| `src/pages/CollectionItems.jsx`                      | Collection items listing page |
| `src/pages/CollectionItemAdd.jsx`                    | Add new collection item       |
| `src/pages/CollectionItemEdit.jsx`                   | Edit collection item          |
| `src/queries/collectionManager.js`                   | API client functions          |
| `src/hooks/useCollections.js`                        | Hook for collection schemas   |
| `src/hooks/useCollectionItems.js`                    | Hook for collection items     |
| `server/tests/collections.test.js`                   | CRUD/schema/slug/UUID coverage; atomic write + crash-recovery cases |
| `server/tests/collectionExport.test.js`              | Phase 2 export coverage (depth-aware paths, SEO mapping, sitemap, two-pass validation) |
| `server/tests/linkPrefixer.test.js`                  | Pure unit tests for `prefixInternalHref` and `normalize` (WHATWG step-1 + step-2 normalization, type guards, every URI-scheme / anchor / query / root-absolute passthrough rule, internal prefixing) |
| `server/tests/seoTag.test.js`                        | Unit tests for the SeoTag changes (Section 13): absolute `og:image` URL only when `siteUrl` set, social tags omitted otherwise, canonical pass-through, page byte-equality regression |
| `themes/arch/collection-types/portfolio/schema.json` | Example portfolio collection (with `template.liquid` for Phase 2) |
| `themes/arch/collection-types/team/schema.json`      | Example team collection       |

### Modified Files

| Path                                          | Changes                                          |
| --------------------------------------------- | ------------------------------------------------ |
| `server/config.js`                            | Add collection path helpers                      |
| `server/createApp.js`                         | Register collections routes                      |
| `server/services/mediaUsageService.js`        | Add collection extract/update/sync/remove fns; extend `refreshAllMediaUsage` to scan `collections/*/*.json` |
| `server/services/themeUpdateService.js`       | Add `collection-types` to `UPDATABLE_PATHS`      |
| `server/services/renderingService.js`         | Register `collection` Liquid filter; thread `outputPathPrefix` and `currentCanonicalPath` into render contexts; in `createBaseRenderContext`, build a per-render shallow copy of `site_icons` with each href prefixed by `outputPathPrefix`; update `resolveLinkValue` and `resolveMenuItemLinks` to use the new `prefixInternalHref` helper (covering both `pageUuid`-resolved and custom URLs) and to attach `canonicalPath` to each resolved menu item (using the shared `normalize` helper for custom URLs); update wrapper `resolveMenuPageLinks` and its two call sites (widget settings ~line 639, block settings ~line 659) to thread `outputPathPrefix`; expose `getCollectionItems` loader on globals (loader applies `resolveCollectionItemLinks` and computes `item.url`); **export a new `renderLiquidTemplate(projectId, templateString, context, sharedGlobals)` helper** that uses the cached per-project engine; `renderPageLayout` honors a new `contentSections.bodyClass` override; `imagePath` and `filePath` globals become depth-prefixed in publish mode |
| `server/controllers/exportController.js`      | Implement collection item rendering loop (Phase 2) using `renderLiquidTemplate` + `resolveCollectionItemLinks`; two-pass validation; subdirectory creation; sitemap/robots extension; manifest.json `collections` field; depth-aware `/uploads/` rewrite; pass `contentSections.bodyClass` for collection items |
| `src/core/tags/SeoTag.js`                     | Drop `imagePath` from `resolveImageUrl` signature; require `siteUrl` for social images; skip `og:image` and `twitter:image` emits when no usable URL is available |
| `server/controllers/themeController.js`       | Theme upload validates `collection-types/*/schema.json`; `resolvePresetPaths` returns `collectionTypesDir` and `collectionsDir` when present |
| `server/controllers/projectController.js`     | After project creation, copy preset `collection-types/` (overwriting theme defaults) and preset `collections/` (regenerating UUIDs/timestamps) when present |
| `server/utils/linkEnrichment.js`              | Extend `cleanupDeletedPageReferences`, `enrichNewProjectReferences`, `remapDuplicatedProjectUuids` to walk collection items |
| `src/core/snippets/menu.liquid`               | Compare `item.canonicalPath` vs new `currentCanonicalPath` global for active state (instead of `pageSlug + ".html"`) |
| `src/core/tags/assetTag.js`                   | Publish-mode URL uses `outputPathPrefix` |
| `src/core/tags/renderHeaderAssets.js`         | Publish-mode asset URLs use `outputPathPrefix`; **also** apply `prefixInternalHref` to preload `href` and to every URL inside `imagesrcset` (the preload HTML is emitted here, not in `enqueuePreload.js`) |
| `src/core/tags/renderFooterAssets.js`         | Publish-mode URLs use `outputPathPrefix` |
| `src/core/tags/placeholderImageTag.js`        | Publish-mode URL uses `outputPathPrefix` |
| `src/App.jsx`                                 | Add collection routes                            |
| `src/components/layout/Sidebar.jsx`           | Dynamic collection nav items, label adapter (`item.label ?? t(item.labelKey)`), numeric badges, Lucide icon string lookup |
| `src/pages/Media.jsx`                         | Build extended `usageTitleMap` (plain object, bracket lookup) covering `collection:type/slug` entries; fetch collection schemas + items lazily for sources present in usage |
| `src/components/media/MediaGridItem.jsx`      | Add `collection:` prefix handling in `resolveUsageTitle` (or import the extracted `mediaUsageDisplay` helper) |
| `src/components/media/MediaListItem.jsx`      | Same `collection:` prefix handling as grid view (or import the extracted helper) |
| `src/locales/en/translation.json`             | Add collection translation keys (sidebar section labels, form action labels, validation messages, export error copy) |
| `server/tests/mediaUsage.test.js`             | Add collection media usage refresh/write/rename cases |
| `server/tests/export.test.js`                 | Add depth-aware path rewriting cases for pages (no behavior change) and a smoke test for collection item export |
| `server/tests/themeUpdateService.test.js`     | Assert `collection-types` is updated and `collections/` is protected; theme upload rejects invalid schemas |
| `server/tests/linkEnrichment.test.js`         | (If exists, else added) assert collection items are walked on page delete and project duplicate |

---

## 17. Test Plan

### Phase 1 backend (`server/tests/collections.test.js`)

- Schema validation: every rule in Section 1 has a failing-and-passing case.
- CRUD: create with auto-slug, create with explicit slug, slug uniqueness 409, update preserving `uuid` and `created`, rename moving file + updating `_order.json` + syncing media usage, delete removing file + `_order.json` entry + media usage, bulk delete partial-failure 207, duplicate inserting after source.
- UUID stability: create then rename then update — `uuid` and `created` survive.
- `_order.json` atomicity: simulate concurrent writes and assert no corruption (tmp + rename).
- Manual ordering: items missing from `_order.json` appear after ordered items sorted by `created_desc`; stale slugs pruned on next write.
- Schema migration on read: drop fields land in `_archived` (in-memory), missing required fields fill with empties and `invalid: true`.

### Phase 1 media (`server/tests/mediaUsage.test.js` extension)

- `extractMediaPathsFromCollectionItem` finds image, file, and link-target paths in nested settings.
- `updateCollectionItemMediaUsage` writes correct source string format.
- `syncCollectionItemMediaUsageOnWrite` on rename: old source removed, new source added.
- `refreshAllMediaUsage` scans `collections/*/*.json` after project import and includes collection sources in the rebuilt usage map.

### Phase 1 link enrichment (`server/tests/linkEnrichment.test.js`)

- Deleting a page that a collection item links to clears the link in the item file.
- Project duplication regenerates collection item `uuid` and remaps `pageUuid` references inside collection items to the new project's page UUIDs.

### Phase 1 Liquid filter (`server/tests/renderingService.test.js` extension)

- `'type' | collection` returns valid items, excludes invalid ones.
- Options `limit`, `offset`, `sort` work and combine.
- `item.url` is `null` when `hasItemPages: false`, prefixed correctly when true.
- Per-page loader cache: same collection requested twice in one render hits the filesystem once.

### Theme update / upload (`server/tests/themeUpdateService.test.js`)

- Applying a theme update replaces `collection-types/` entirely.
- `collections/` is never touched by a theme update.
- Theme upload rejects an invalid schema with a clear 400 response.
- Theme upload rejects duplicate `slugPrefix` across two collections.

### Phase 2 export (`server/tests/collectionExport.test.js`)

- Subdirectory creation: `{outputDir}/{slugPrefix}/` exists before any item file is written.
- Output files are at `{slugPrefix}/{itemSlug}.html`.
- Per-item `sharedGlobals`: enqueued styles from item #1 do not appear in item #2's HTML; `collectionCache` is fresh per item.
- Two-pass validation: one invalid item across two collections fails the whole export with a detailed error list and writes no HTML.
- Missing `template.liquid` fails the export with a clear error.
- Page-shaped object: `seo.canonical_url` is set explicitly, `og_image` falls back from the `usedAsOgImage` field, `og_type` is `"article"`, `slug` is path-shaped (`portfolio/project-alpha`), `id` is dash-shaped (`portfolio-project-alpha`).
- `renderPageLayout` honors `contentSections.bodyClass`: collection item HTML has `<body class="collection-portfolio item-project-alpha">` with **no** `page-...` class.
- Collection item link to a renamed page: rename a page after creating a collection item that links to it, run export, assert the rendered HTML uses the new slug (resolved via `pagesByUuid`).
- Collection item link to a deleted page: link in rendered HTML is empty `href=""` (the dead-link clear-down).
- Sitemap includes collection items, robots.txt disallows noindex collection items, dedup across pages and collections.
- `manifest.json` contains a `collections` summary.
- Markdown export generates `.md` files at `{slugPrefix}/{itemSlug}.md` with correct frontmatter and alternate link.

### Phase 2 depth-aware paths (smoke + unit)

- Render a layout for a page (`outputPathPrefix = ""`) — output HTML unchanged byte-for-byte from current production for an identical input. Locks down "no regression for pages".
- Render a layout for a collection item (`outputPathPrefix = "../"`) — every `assets/...` URL, every internal page link, every menu link, every favicon ref, every markdown alternate link is prefixed with `../`.
- The `/uploads/...` post-rewrite uses the prefix.
- Menu active state: a collection item viewing its own link is highlighted via `currentCanonicalPath` match; a collection item viewing a page is not highlighted unless the menu explicitly links to that collection item.
- Menu with a **custom URL** (no `pageUuid`) typed in the editor: from a nested collection item page, the href is prefixed with `../`; from a root page, the href is unchanged.
- Menu with custom URLs **and an empty `pagesByUuid`** (project with no pages, or page map fails to load): custom URLs are still prefixed. The pre-existing `pagesByUuid.size === 0` short-circuit must not skip prefixing.
- `prefixInternalHref` unit tests (`server/tests/linkPrefixer.test.js`):
  - Passthrough: `http://x`, `https://x`, `//cdn/x`, `mailto:a@b`, `tel:+1`, `sms:+1`, `ftp://x`, `webcal://x`, `blob:https://x`, `data:image/png;base64,...`, `javascript:void(0)`, custom `chrome://settings`, vendor `slack://channel`.
  - Anchor/query/root-absolute passthrough: `#section`, `?ref=x`, `/about.html`.
  - Prefixed: `about.html`, `portfolio/foo.html`, `foo/bar:baz.html` (the colon in a path segment must not be misdetected as a URI scheme — the RFC-3986 regex is anchored).
  - **Whitespace-tolerant** (WHATWG step 1, leading/trailing C0+space): leading-space URL like `" https://example.com"` → `"https://example.com"` (passes through, no prefix); `"  about.html  "` → `"../about.html"` (stripped, then prefixed); leading **C0 control** such as `<U+0000>https://example.com` or `<U+001B>https://example.com` → `https://example.com` (the full U+0000–U+0020 range is stripped, not just U+0020); trailing `<U+0009>` (tab) on `about.html<U+0009>` → `../about.html`. (Examples use `<U+XXXX>` notation here so this markdown file stays pure text — never embed real C0 control bytes in the spec.)
  - **Embedded-control-tolerant** (WHATWG step 2, embedded tab/LF/CR): tab-split `"java\tscript:void(0)"` → `"javascript:void(0)"` (passes through, no prefix); newline-split `"about.\nhtml"` → `"../about.html"` (joins, then prefixes); `"htt\rps://x"` → `"https://x"` (passes through). Note: step 2 strips **only** `\t \n \r` (U+0009 / U+000A / U+000D), not other embedded C0 controls — an embedded `<U+0000>` (NUL) or `<U+0001>` mid-string is left as-is (matches WHATWG; a browser would also leave it embedded and the URL would likely fail parsing).
  - **Type-safe**: `null`, `undefined`, `42`, `{}` → returned unchanged (no crash, no coercion to string).
  - Empty prefix or empty-after-normalize href: returned unchanged.
  - `normalize` helper exported separately: same input/output rules tested in isolation; verifies `resolveMenuItemLinks` produces matching `canonicalPath` values for whitespace/control-padded custom URLs.

### Phase 2 SeoTag (`server/tests/seoTag.test.js`)

- With `siteUrl` set + `og_image` value: emits absolute `https://site.com/assets/images/foo.jpg` (no `..` in the URL, no leading `/../`).
- Without `siteUrl` + `og_image` value: `og:image` and `twitter:image` meta tags are **omitted entirely**.
- With absolute `og_image` URL (`http://...`): URL passes through unchanged.
- Canonical URL: collection item path passed via `seo.canonical_url` is emitted verbatim; the auto-derive fallback is not used for collection items (because `canonical_url` is always set explicitly).
- Pages: existing behavior unchanged byte-for-byte (regression test).

### Phase 1 atomic-write crash recovery (`server/tests/collections.test.js`)

- `writeJsonAtomic` writes then renames; the target file is only visible after the rename. The tmp filename includes a UUID — calling `writeJsonAtomic` from two concurrent paths to the same target file produces two distinct tmp files (no shared `${filepath}.tmp`).
- Concurrent-write torture: two simultaneous saves to the same item complete without ENOENT/EEXIST from a clobbered tmp; whichever rename lands second wins (last-write-wins semantics).
- Orphan tmp file from a simulated crash mid-write is invisible to `listCollectionItems` (the directory scan filters out `*.tmp`).
- Monotonic `updated`: set the system clock back, perform a save, assert the new `updated` is strictly greater than the previous `updated`. Import an item with a future `updated` and save it again — the next `updated` is still strictly greater. The rename-recovery rule then deterministically picks the newer file across all crash windows.
- Simulate crash between "write new file" and "delete old file" during a **slug rename**: assert `listCollectionItems` detects the duplicate-UUID, picks the file with the newer `updated`, excludes the older from the returned list, and logs a warning.
- After a subsequent successful save of the winner, the older file is deleted (the post-save cleanup step).
- **Duplicate** vs rename UUID semantics: duplicating an item produces a new file with a **new `uuid`**; the source's uuid is unchanged. The duplicate-UUID recovery rule does not fire for duplicates because UUIDs differ.
- Simulate crash between "delete old file" and "update `_order.json`": next call to `_order.json` write prunes the stale slug.
- Simulate crash between "delete old file" and "sync media usage" (the **actual** stale-media window — starts at step 4, not step 5): manually invoke `refreshMediaUsageAfterStructuralChange` and assert both the stale `collection:type/oldSlug` source is removed and the new `collection:type/newSlug` source is added.

### Phase 1 frontend (`src/__tests__/` if the repo has Jest/Vitest setup; otherwise manual smoke tests checklist)

- Sidebar renders collection nav items with badges; badges update after create/delete.
- `CollectionItems` table: search, multi-select, bulk delete (with confirmation), row actions.
- `CollectionItemForm`: required-field validation blocks save; slug auto-generates from `usedAsTitle`; navigation guard prompts on dirty unload.
- `CollectionItemEdit` slug rename: URL updates with `replace: true`.
- Media library: `collection:type/slug` source renders as `${displayName}: ${title}` not raw string.

---

## 18. Open Questions / Explicitly Deferred

> ⛔ **Separate from open questions: hard blockers gate the whole feature.** Tracked in
> [future-collections-blockers.md](future-collections-blockers.md). Unlike the deferred items below
> (which can be punted to a later phase), an unresolved blocker means **no code lands at all**. See
> Section 19 Gate 0.

1. **Drafts and publish states** — current plan: items are always "published". A `draft: true` flag could come in Phase 3 if needed.
2. **Cross-collection relationships** — deferred to Phase 3. v1 items have UUIDs ready for this.
3. **Cursor-based pagination and `paginate` tag** — deferred. `limit` + `offset` ship in Phase 1.
4. **Repeater / gallery field type** — deferred to Phase 3. Documented as a known v1 limitation.
5. **Live preview for collection items** — deferred. Items don't have a preview surface in v1/v2.
6. **Per-item undo/redo and autosave** — deferred. Explicit save + navigation guard is sufficient for v1.
7. **Forms inside collection templates** — open question, decision deferred. See Section 14 for the options and interim behavior.
8. **Cross-project collection sharing** — out of scope. Collections are per-project.
9. **Optimistic concurrency on item edits** — last-write-wins in v1. Matches pages.
10. **Richtext HTML `<img>` media tracking** — pre-existing limitation across pages, globals, and collections. Tracked as a separate cleanup task; not blocking collections.
11. **Project-defined collection types** — collections remain theme-defined in v1. A project-only override mechanism could come later but adds upgrade complexity.

---

## 19. Implementation Order (Suggested)

To reduce risk, build this in gated phases:

**Gate 0 — Prerequisites before any code lands:**
- 🚫 **All blockers in [future-collections-blockers.md](future-collections-blockers.md) RESOLVED.** Gate 0 is **not** clear while any blocker is open. Currently **`BLOCKER-1` is UNRESOLVED**, so no Collections code may land.
- ✅ Asset-path strategy decided (Section 6: depth-aware relative paths via `outputPathPrefix`)
- ✅ Item UUID decision (Section 2: yes, in v1)
- ❌ Preset seeding decision (Section 5: extend `resolvePresetPaths`) — **reopened by `BLOCKER-1`**: preset collection-type overrides are destroyed by the wholesale theme-update replace. Must be resolved before this counts as decided.
- ⏸️ Forms-in-templates decision **deferred** (Section 14: open question; build interim behavior — don't wire forms into templates yet)
- ✅ SEO field mapping spelled out (Section 13)

**Gate 1 — Phase 1 backend:**
- `collectionService` with schema validation, item CRUD, normalization, `_order.json`, UUID
- `collectionController` + routes mounted in `createApp`
- `mediaUsageService` extensions (4 new fns + `refreshAllMediaUsage` extension)
- `linkEnrichment` extensions (3 functions extended)
- `themeUpdateService` `UPDATABLE_PATHS` extension
- Theme upload validation extension
- Preset seeding implementation
- `| collection` filter wired into `configureLiquidEngine` with per-render cache
- All tests in `collections.test.js`, `mediaUsage.test.js` extension, `linkEnrichment.test.js`, `themeUpdateService.test.js`

**Gate 2 — Phase 1 frontend:**
- `collectionManager`, `useCollections`, `useCollectionItems`
- `CollectionItems`, `CollectionItemAdd`, `CollectionItemEdit`, `CollectionItemForm`
- Sidebar adapter (badge + pre-resolved label + Lucide string lookup)
- Media library `collection:` source string rendering
- App.jsx routes

**Gate 3 — Phase 2 depth-aware paths (must complete before Phase 2 export):**
- `outputPathPrefix` and `currentCanonicalPath` globals in `createBaseRenderContext`
- All tag updates listed in Section 6
- `resolveLinkValue` / `resolveMenuItemLinks` updates
- `menu.liquid` snippet update
- `/uploads/` post-rewrite update
- Markdown alternate link fallback update
- Pages regression test (byte-for-byte identical output for `outputPathPrefix = ""`)

**Gate 4 — Phase 2 export:**
- Subdirectory creation
- Per-item render loop with fresh sharedGlobals
- Two-pass validation
- Page-shaped object building per Section 13
- Sitemap/robots extension
- Markdown export for items
- `manifest.json` collections field
- All tests in `collectionExport.test.js`

**Gate 5 — Phase 3 (separate doc):**
- Stable item UUID consumers (cross-collection links)
- Repeater / gallery setting types
- `{% collection %}` tag form
- Pagination
- Draft state if needed

---

## See Also

- [Theming Guide](theming.md) — Theme structure and settings
- [Widget Authoring Guide](theming-widgets.md) — Widget development patterns
- [Setting Types Reference](theming-setting-types.md) — Available setting types for collection schemas
- [Export Documentation](core-export.md) — Export process details
- [Theme Updates](theme-updates.md) — Theme update lifecycle
