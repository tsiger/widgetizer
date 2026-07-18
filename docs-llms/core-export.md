# Site Exporting

This document explains **site exporting**, which generates a complete, static HTML version of a project's website that can be deployed to any standard web host. The export system includes automatic version management, configurable retention, and comprehensive export-history tracking.

> **Note**: Site exporting is different from **project exporting**. Site export generates a deployable static HTML website; project export creates a ZIP archive of a project's source files for backup or transfer to another Widgetizer installation. See [Project Management](core-projects.md) for project import/export.

Site export lives in the **site workspace** (`/export-site`), not the admin area. The editor UI is in `@widgetizer/editor-ui`; the server-side generation, history API, and scope-bound serving are in `@widgetizer/builder-server`; the rendering primitives are split between `@widgetizer/builder-server` (capability/path wiring) and the scope-free `@widgetizer/render-engine`.

## 1. Frontend Implementation (`@widgetizer/editor-ui`)

The export interface is a small orchestrator (`packages/editor-ui/src/pages/ExportSite.jsx`) that composes specialized components and a state hook. All user-facing text is localized via `react-i18next`.

### Route Context

- `/export-site` renders inside the site workspace shell.
- `RequireActiveProject` redirects to `/projects` if accessed without an active project.
- Two display modes: a history view when exports exist, and an empty-state `ExportCreator` (`variant="empty"`) when none do.

### State Hook — `useExportState` (`packages/editor-ui/src/hooks/useExportState.js`)

Centralizes export state and data loading:

- **Active project** (from `projectStore`) and validation
- **Export history** loading, with a stale-response gate (`createAsyncRequestGate`) so a project switch mid-fetch is dropped safely
- **`maxVersionsToKeep`** and **`developerMode`** read from the history response (the latter gates the Issues column in the history table)
- `loadExportHistory(projectId)` for refreshing after an export completes

### Components

#### `ExportCreator` (`packages/editor-ui/src/components/export/ExportCreator.jsx`)

Handles the creation workflow:

- Project-name display and an "Export Project" button with loading state
- A **Markdown checkbox** ("Also export pages as Markdown (.md)") whose state is passed as `{ exportMarkdown }` to `exportProjectAPI`
- Success/error toasts with version info, and a history refresh on success

#### `ExportHistoryTable` (`packages/editor-ui/src/components/export/ExportHistoryTable.jsx`)

Displays history and per-version actions:

- Version numbers (v1, v2, …), timestamps, status, and on-disk size
- **View** (smart entry-point detection), **Download** (ZIP), **Delete** (with confirmation)
- An **Issues** column (only when `developerMode` is on) surfacing the dev-mode HTML-validation report when present
- Current retention setting from app config

### Export Manager (`packages/editor-ui/src/queries/exportManager.js`)

Thin API client over `editorFetchJson`:

- `exportProjectAPI(projectId, { exportMarkdown })` — `POST /export` with `{ exportMarkdown }` in the body
- `getExportHistory`, `deleteExportAPI`, `getExportEntryFile`
- `getExportViewUrl` / `getExportDownloadUrl` — build **absolute** URLs (`API_URL(getApiBase() + …)`) because View/Download are real browser navigations (`window.open` / `<a download>`), not `editorFetch` calls, and a relative `/api` base would resolve against the Vite dev origin and return the SPA shell.

The active project is carried as the `X-Project-Id` header by `editorFetch`; it is **not** in the URL path (see the endpoint table below).

## 2. Backend Implementation (`@widgetizer/builder-server`)

The core of the pipeline is `exportProjectToDir(projectId, options, collectionDeps)` in `packages/builder-server/src/controllers/exportController.js`. The Express handler `exportProject` is a thin wrapper: it pulls `projectId` from `req.scope`, builds a scope-aware `collectionDeps` from `req.adapters.storage` + `req.scope`, and calls `exportProjectToDir`.

Rendering is delegated through `renderingService.js`, which wires capability (collection loaders, schemas, theme settings, link prefixing) and filesystem roots into a `deps` bag and calls the scope-free renderers in `@widgetizer/render-engine` (`renderWidget`, `renderPageLayout`, `renderCollectionItemPage`, `widgetSupportsTransparentHeader`). The render engine imports no backend services and receives no `scope`; it reads templates/schemas from the paths supplied in `deps`.

### Fail-Fast Ordering: Validation Before Any Write

`exportProjectToDir` is structured so **all read-only setup and validation happen before the first disk write**. A blocked export (missing homepage, invalid collection items, missing collection template) therefore leaves **no** output directory, favicon, manifest, or partial HTML behind. Nothing touches disk until the "validation passed" marker.

Read-only setup + validation phase:

1. **Resolve project** — `projectRepo.getProjectById(projectId)` yields `folderName`, `siteUrl`, theme, etc. Missing project throws.
2. **Compute version + output path** — `exportRepo.getNextVersion(projectId)` (auto-incrementing v1, v2, …); the output dir is `<publishDir>/<folderName>-v<version>`.
3. **Load theme + pages** — `readProjectThemeData` (then `preprocessThemeSettings`), `listProjectPagesData`.
4. **Homepage validation** — at least one page must have the slug `index` (page `id` is derived from filename). Otherwise throws `statusCode 400` / "Export failed: No homepage found".
5. **Two-pass collection validation** (only when `collectionDeps` supplies storage + scope) — see [§3](#3-collection-item-page-export).

Once validation passes, the writes begin (`fs.ensureDir(outputDir)` onward).

### Generation phase

6. **Site icons** — `generateExportSiteIcons(...)` writes favicon/app-icon assets at the export root when `general.favicon` is set (`favicon.svg` for SVG sources, `favicon.ico`, `favicon-32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, and `site.webmanifest`). `favicon.ico` (a single-entry ICO wrapping the 32px PNG) exists for agents that request `/favicon.ico` directly and is intentionally never linked in the HTML; `icon-192.png` is linked via `site_icons.serpIconHref` (export-only — runtime renders leave it blank). See [Media Library](core-media.md) and [App Settings](core-appSettings.md).
7. **SEO files** (conditional on `siteUrl`) — `buildSitemap` and `buildRobotsTxt` (`services/seoArtifacts.js`) write `sitemap.xml` and `robots.txt` with absolute URLs. Collection item pages are included via `itemPagesForSeo` (valid items of `hasItemPages` collections, in listing order). When the project's **Clean URLs** setting (`projects.clean_urls`) is on, sitemap/robots URLs and the auto-generated canonicals (SeoTag + collection item pages) drop the `.html` extension to match hosts that publish extensionless paths; exported filenames and internal links are unaffected.
8. **Render global widgets** — header and footer are rendered per page (so each page captures its own enqueued styles/scripts) in `"publish"` render mode, which keeps asset paths relative (`assets/images/logo.png`) instead of absolute API URLs.
   - **Transparent header**: when the header has `transparent_on_hero`, the first widget of each page is checked; if its `schema.json` declares `"supportsTransparentHeader": true` (`widgetSupportsTransparentHeader`), a `transparent-header` class is added to that page's `<body>`.
9. **Render pages** — for each page: render its widgets in order (skipping `header`/`footer`), wrap via `renderPageLayout` (which applies `layout.liquid`), then post-process (steps 10–13). The page `sharedGlobals` carry `renderMode: "publish"`, `exportVersion` (cache busting), `siteIcons`, and `currentCanonicalPath`.
10. **Format** — each page's HTML is run through **Prettier** (`formatHtml`). On failure the unformatted HTML is written with a warning.
11. **Storage-path rewrite** — after formatting, any remaining raw `/uploads/` paths are rewritten to published locations: `/uploads/images/` → `assets/images/`, `/uploads/files/` → `assets/files/`. Dedicated tags (`{% image %}`) already resolve via context variables in publish mode; this is the safety net for paths pasted into generic link fields (e.g. a button `href` of `/uploads/files/brochure.pdf`).
12. **HTML validation** (developer mode only) — see [§5](#5-developer-mode-html-validation).
13. **Easter-egg comment + write** — an ASCII comment is prepended at the very top of every page before the doctype:

    ```html
    <!--
    Made with Widgetizer v<appVersion>
    Per aspera ad astra
    -->
    ```

    The file is written as `index.html` when the page slug is `index` or `home`, otherwise `<slug>.html`.
14. **Markdown alternate + `.md`** (when `exportMarkdown` is true) — a `<link rel="alternate" type="text/markdown" href="…">` is injected into `<head>` (absolute href when `siteUrl` is a valid URL, otherwise the relative `.md` filename). The page content (widget HTML only, no layout) is then converted to Markdown via `TurndownService` (ATX headings, fenced code blocks, `-` bullets). Non-content elements (`style`, `script`, `noscript`, `form`, `input`, `button`, `select`, `textarea`) are removed and inline style/script/form blocks plus placeholder images are stripped before conversion. Each `.md` is written with YAML frontmatter (`title`, `description`, `source_url.html`, `source_url.md`). Markdown errors are logged and do **not** fail the export.

After pages: collection item pages ([§3](#3-collection-item-page-export)), the validation report ([§5](#5-developer-mode-html-validation)), asset copying ([§4](#4-asset-copying)), and metadata files ([§6](#6-export-metadata-files)).

## 3. Collection Item-Page Export

Collections participate in export only when the request supplies a scope-aware capability: the handler builds `collectionDeps = { storage: req.adapters.storage, scope: req.scope }` and threads it through `exportProjectToDir` into every `renderWidget` / `renderPageLayout` / `renderCollectionItemPage` call (so `| collection` filters in exported pages read items through the same storage adapter as the API). Callers that don't supply `collectionDeps` (e.g. tests) skip collections entirely.

### Two-Pass Collection Validation (fail-fast)

Before any HTML is written, `exportProjectToDir` enumerates `listCollectionSchemas(storage, scope)` and, for each schema, `listCollectionItems(...)`:

- **Pass 1 — gather.** Every collection contributes to `manifestCollections` (`{ type, itemPages, itemCount }`, feeds `manifest.json`). Invalid items (`item.invalid`) are accumulated into `invalidCollectionItems` with their per-field `validationErrors`. For `hasItemPages` collections, valid items (in listing order) are pushed into `itemPagesForSeo` (feeds sitemap/robots) and the item render loop.
- **Pass 1 — template preflight.** A `hasItemPages` collection that has renderable (valid) items but **no** `template.liquid` (`loadCollectionTemplate` returns `null`) is recorded in `missingTemplates`.
- **Pass 2 — refuse.** If any invalid items exist, the export throws `statusCode 400` / "Export failed: invalid collection items" with the full per-item-per-field error list. If any templates are missing, it throws `statusCode 400` / "Export failed: missing collection template". Either way **no HTML is written**.

### Item-page render loop

After the page loop, for each `hasItemPages` collection with valid items, every item is rendered to `<slugPrefix>/<itemSlug>.html`:

- Fresh per-item `sharedGlobals` (new enqueue Maps) so enqueued assets never bleed between items, plus `outputPathPrefix: "../"` (items live one directory deep) and `currentCanonicalPath`.
- A `pagesByUuid` map and `loadCollectionItemsByUuid(...)` map are built once and shared, so `menu`/`link`-type item settings that target a page or another item resolve correctly.
- `renderCollectionItemPage(projectId, { schema, item, template, …, headerData, footerData, projectData, siteUrl }, collectionDeps)` returns the full layout-wrapped HTML plus the content-only `mainContentHtml` (for markdown).
- The same post-processing as pages applies, at item depth: Prettier, storage-path rewrite to `../assets/images/` and `../assets/files/`, dev-mode validation (issues join the same report), the easter-egg comment, and — when `exportMarkdown` — a markdown alternate link and a content-only `.md` (frontmatter adds `collection` and `slug`).
- The template's existence is re-checked defensively inside the loop so a race can never produce partial output.

See [Collections](core-collections.md) for the collection model and item-template semantics.

## 4. Asset Copying

All copying happens **after** HTML generation, into the export's `assets/` tree:

- **Theme assets** — everything under the project's `assets/` directory (e.g. `base.css`, `scripts.js`) is copied to `assets/`.
- **Core placeholder assets** — `placeholder.svg`, `placeholder-portrait.svg`, `placeholder-square.svg` from `STATIC_CORE_ASSETS_DIR` are copied to `assets/` so placeholder-using widgets work.
- **Widget assets** — the project's `widgets/` tree is searched recursively for `.css`/`.js` files, which are copied (flattened) into `assets/`. Filenames are flattened, so collisions are possible — the later copy overwrites the earlier one. Theme authors should use unique, widget-prefixed names (`slideshow.css`, `comparison-slider.js`).
- **Used images only** — media metadata is read (`readMediaFile` from `mediaService.js`) and only images with a non-empty `usedIn` whose `path` starts with `/uploads/images/` are copied to `assets/images/`. For each, all generated public sizes except `thumb` are copied; raster originals are copied only when there is no public `large` variant; SVG originals are always copied. The count copied vs. skipped is logged. If media tracking fails, it falls back to copying the entire `uploads/images/` tree.
- **Used file assets only** — the same usage-based approach copies non-image file assets (PDFs): media files with non-empty `usedIn` whose `path` starts with `/uploads/files/` are copied to `assets/files/`. Files have no size variants. If tracking fails, it falls back to copying the entire `uploads/files/` tree.

The file-asset path (copy to `assets/files/`, `/uploads/files/` → `assets/files/` rewrite, and the `filePath` render variable supplied to widget templates) is what makes referenced PDFs downloadable from the exported static site. See [Media Library](core-media.md) for the shared image/file media model and usage tracking, and [Setting Types](theming-setting-types.md) for the `file` setting type that themes use to reference a file asset.

## 5. Developer Mode (HTML Validation)

When **Developer Mode** is enabled in App Settings (`developer.enabled`), each exported page and item page is validated after formatting via `validateHtml` (`utils/htmlProcessor.js`, built on `html-validate`) with a relaxed ruleset suited to widget-based HTML — it allows inline styles, dynamic widget patterns, style tags inside sections/headers, and Prettier formatting (lowercase doctype, self-closing tags).

Issues are collected across all pages and item pages with severity, line/column, message, rule ID, and a source snippet. If any are found, `generateIssuesReport` writes a `__export__issues.html` report at the export root — a dark-themed, developer-friendly view grouping issues per page with highlighted source context and rule links. When dev mode is off, validation does not run, so production exports carry zero validation overhead.

## 6. Export Metadata Files

Written after asset copying:

- **`manifest.json`** (always) — `{ generator: "widgetizer", widgetizerVersion, themeId, themeVersion, exportVersion, exportedAt, projectName, collections }`. `collections` is `manifestCollections` from the two-pass validation: one entry per collection with `{ type, itemPages, itemCount }`.
- **`widgetizer.forms.json`** (only when the project contains `core-form` widgets) — `buildFormsManifest(pages, appVersion)` (`services/formsManifestService.js`) produces a forms manifest describing each form's fields. Manifest validation errors throw `statusCode 400` and are surfaced to the client; non-fatal warnings are logged. See [Form Widget](core-form-widget.md).
- **`site.webmanifest`** (when site icons were generated) — references `icon-192.png` and `icon-512.png`.

Finally `recordExport(projectId, version, "<folderName>-v<version>", "success")` records the export in SQLite and trims old versions ([§7](#7-export-management)).

## 7. Export Management

### Versioning & History

Each export gets an auto-incrementing version. Records live in the SQLite `exports` table (via `exportRepository.js`) and store the **relative** directory name only (e.g. `my-project-slug-v1`); `resolveOutputDir()` prepends the publish path at runtime. Retention is user-configurable (1–50) via `export.maxVersionsToKeep` in [App Settings](core-appSettings.md). See [Database](core-database.md) for the `exports` schema.

### History response enrichment

`getExportHistory` augments each record on read (no stored columns):

- **`sizeBytes`** — total on-disk size via `getDirectorySize` (recursive sum); `null` when the directory is gone (failed export or trimmed by retention).
- **`hasIssuesReport`** — whether `__export__issues.html` exists in the directory. Because that report is written only when dev mode was on **and** issues were found, its presence reliably means "issues found"; its absence can't distinguish "clean" from "not validated".

The response also returns `maxVersionsToKeep` and `developerMode` (the latter gates the Issues column in the history table).

### Automatic cleanup (retention)

`recordExport` calls `exportRepo.trimExports(projectId, max)`; for each trimmed record it removes the physical directory (`resolveOutputDir` + `fs.remove`) and the history entry.

### Project deletion — `cleanupProjectExports(projectId)`

Exported as a standalone function: removes **all** export directories and history records for a project. Used when a project is deleted so its publish artifacts don't outlive it.

### Failed-export recording

If `exportProjectToDir` throws, the `exportProject` handler records a `"failed"` row (`recordExport(projectId, nextVersion, null, "failed")`) before responding. Errors carrying an explicit `statusCode` (e.g. homepage/collection validation) return that code with `errorTitle`/`message`; theme- and page-read failures map to 404/500; anything else is a generic 500 (with `stack` outside production).

### API Endpoints

All export actions mount under `/api/export` (the `export` router is attached to the **project-scoped** router). The mutating/listing routes are **scope-resolved**: the active project comes from `req.scope` (set by `resolveActiveProject` from the `X-Project-Id` header) — there is **no** `:projectId` in the path. The browser-native serve/download routes stay keyed by `exportDir`.

| Method & Path | Scoping | Purpose |
| --- | --- | --- |
| `POST /api/export` | `X-Project-Id` → `req.scope` | Create a new export (`{ exportMarkdown }` optional in body) |
| `GET /api/export/history` | `X-Project-Id` → `req.scope` | Export history (with `sizeBytes`, `hasIssuesReport`, `maxVersionsToKeep`, `developerMode`) |
| `DELETE /api/export/:version` | `X-Project-Id` → `req.scope` | Delete a specific export version |
| `GET /api/export/files/:exportDir` | `exportDir` (scope-bound) | Entry-file info for an export |
| `GET /api/export/download/:exportDir` | `exportDir` (scope-bound) | Download an export as a ZIP |
| `GET /api/export/view/:exportDir` | `exportDir` (scope-bound) | Serve the export entry file (`index.html`) for preview |
| `GET /api/export/view/:exportDir/*filePath` | `exportDir` (scope-bound) | Serve a specific exported file for preview |

### Smart entry-file detection

When viewing/serving an export, `findEntryFile` prefers `index.html`, then `home.html`, then the first HTML file — so exports still open even if the main file was renamed.

### Downloads

ZIPs (`archiver`, level 9) bundle all generated HTML, the full `assets/` tree, root metadata (`manifest.json`, and when present `widgetizer.forms.json` / `site.webmanifest` / site icons), and the preserved directory structure — ready to deploy to any static host.

## 8. Storage & Cross-Tenant Safety

Export directories live under `data/publish/` via `getPublishDir()` (from `packages/builder-server/src/config.js`). The current export route is **scope-bound but filesystem-backed**: it resolves through `req.scope`, then `exportDirBelongsToScope()` rejects any path separator or `..` token first, anchors the directory name to exactly `<folderName>` or `<folderName>-v<digits>` (an anchored allowlist, not a prefix match), and finally `isWithinDirectory()` confirms it stays inside the publish dir. The `PublishAdapter` exists as an adapter contract/local implementation, but this static export route writes and serves local files directly today. This prevents one tenant from serving another tenant's export. Byte-neutral for OSS standalone: the single active project's own request always matches.

See [Packages & Adapter Architecture](core-packages.md) and [Platform Security](core-security.md#11-cross-tenant-safety-multi-tenant-host-contract) for the isolation contract, and [core-architecture.md](core-architecture.md) for the package map.

---

**See also:**

- [App Settings](core-appSettings.md) — Export retention limit and developer mode
- [Media Library](core-media.md) — Image/file media model and usage tracking that drive selective copying
- [Setting Types](theming-setting-types.md) — The `file` setting type for referencing file assets
- [Collections](core-collections.md) — Collection model and item-template rendering
- [Form Widget](core-form-widget.md) — The `core-form` widget and the forms manifest
- [Platform Security](core-security.md) — Path-traversal and cross-tenant export-serving safeguards
