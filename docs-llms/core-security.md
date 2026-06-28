# Platform Security

This document covers all security measures in Widgetizer: input validation/sanitization, HTTP headers/CORS, SVG sanitization, error handling, advanced-theme raw-code injection, upload limits, import/export path-traversal, preview isolation, the cross-tenant contract, and link/URL safety.

> **Refactor note.** The backend is the adapter-agnostic `@widgetizer/builder-server` package; shared primitives (URL safety, path security, the `Scope`/`LIMIT_KEYS` contract) live in `@widgetizer/core`; the React editor is `@widgetizer/editor-ui`. For the adapter / DI / `Scope` / `LIMIT_KEYS` model that §11 builds on, see [Packages & Adapter Architecture](core-packages.md).

---

## Implemented

### 1. Input Validation & Sanitization

All incoming data is validated and sanitized before reaching controllers.

- `express-validator` rules on every API route that accepts input
- `validateRequest` middleware (`packages/builder-server/src/middleware/validateRequest.js`) centralizes the validation-result check (one place, all routes)
- Plain-text fields (project/page/menu names, descriptions) use `stripHtmlTags()` (`packages/builder-server/src/services/sanitizationService.js`) — a DOMPurify-based sanitizer that strips all HTML while preserving `&`, `"`, `'`
- Widget/block settings and collection-item settings use schema-aware sanitization via `sanitizationService.js` (DOMPurify for richtext, protocol blocking for links, allowlists for image/gallery/table) — see §2
- Text/textarea fields rely on LiquidJS autoescape (`outputEscape: "escape"`) at render time

### 2. Schema-Aware Setting Sanitization

`sanitizationService.js` sanitizes each setting value by its declared schema type. The same per-type logic backs widget settings (`sanitizeWidgetData`), collection-item settings (`sanitizeCollectionItemData`), and theme settings (`sanitizeThemeSettings`), so a value is sanitized identically wherever it comes from.

- **`text` / `textarea`** — left untouched; LiquidJS autoescape handles them at render. (Theme settings flagged `outputAsCssVar` additionally run `sanitizeCssValue`, stripping `<`, `>`, `{`, `}` to prevent `<style>` breakout.)
- **`richtext`** — stores Tiptap HTML; the editor controls are not the security boundary. `sanitizeRichText` runs DOMPurify with a fixed base tag allowlist (`p strong em a br span ul ol li`) at the server save/render boundary (theme settings on save; widget/page and collection values before render). Headings (`h2`–`h4`) and `<img>` are **opt-in per field** via `allow_headings` / `allow_images` — the flags are real render-boundary contracts, added to the DOMPurify `ALLOWED_TAGS`/`ALLOWED_ATTR` only when the field declares them. When `<img>` is allowed, an `afterSanitizeAttributes` hook drops any `<img>` whose `src` is not an exact in-project upload path (`/uploads/(images|files)/<safe-filename>`, regex `^\/uploads\/(?:images|files)\/[A-Za-z0-9._-]+$`), rejecting external/tracking-pixel sources and traversal. Output via `| raw`. Anchors may also carry stable internal-link references — `data-page-uuid` / `data-collection-item-uuid` — which are in the base `ALLOWED_ATTR` (only those two `data-*`; any other `data-*` is stripped), so richtext links follow page/item renames and clear on delete at parity with structured `link` fields (resolved at render via `resolveRichtextLinkRefs`, `packages/core/src/utils/richtextLinks.js`).
- **`link`** — `sanitizeLink` runs the href through `sanitizeHref` (§12); `link.text` is left for autoescape.
- **`image`** — `sanitizeImageSettingValue`: keeps any safe in-project absolute path (so a non-upload theme asset like `/default-logo.png` survives), blanks anything else.
- **`file`** — selected upload path string for `/uploads/files/...`; currently not schema-sanitized like `image`, so templates should use controlled upload paths and basename-derived labels. Static export rewrites referenced `/uploads/files/` paths into `assets/files/`.
- **`gallery`** — `sanitizeGalleryValue`: an ordered array; each entry must pass the **strict** `sanitizeImagePath` (`/uploads/images/…` only); non-strings and bad paths are dropped, a fully-invalid gallery collapses to `[]`.
- **`table`** (collection items) — `sanitizeTableValue`: rows are rebuilt **only** from the schema's declared column ids, so stale/unknown keys (e.g. a smuggled `__proto__`) are never read or copied (no prototype pollution). Each cell is normalized by its column type (`text` → string-or-`""` in v1); fully-empty rows are dropped.
- **`date`** — `sanitizeDateValue`: coerces to a valid `YYYY-MM-DD` calendar date or `""` (rejects impossible dates like `2026-02-30`).
- **`code`** — intentionally not sanitized or transformed (embeds, custom CSS/JS). Normal `{{ value }}` Liquid output still autoescapes; code only becomes executable/markup when a template emits it through an explicit raw sink such as `| raw` or the custom CSS/head/footer script tags.
- Theme-setting scalars (`color`, `number`/`range`, `checkbox`, `select`/`radio`, `font_picker`) are type-validated and fall back to the schema default when invalid.

The image-path allowlists are strict allowlists (not blocklists) because the value can reach an unescaped `<img src>` sink — see §12.

### 3. HTTP Security Headers

`helmet` in `applySharedMiddleware` (`packages/builder-server/src/createApp.js`) with intentional relaxations for preview compatibility:

| Directive | Value | Reason |
|-----------|-------|--------|
| `contentSecurityPolicy` | `false` | Preview iframe needs inline styles/scripts from widgets |
| `crossOriginEmbedderPolicy` | `false` | Widgets load cross-origin iframes (YouTube, Maps, etc.) |
| `crossOriginResourcePolicy` | `cross-origin` | Allow SVGs and assets in preview iframe |
| `frameguard` | `false` | Preview renders in iframe via `/render/:token` |
| `referrerPolicy` | `strict-origin-when-cross-origin` | YouTube/Vimeo need Referer to validate embeds |
| `crossOriginOpenerPolicy` | `false` | YouTube player needs cross-origin popup communication |

### 4. Cross-Origin Resource Sharing (CORS)

- Permissive defaults (`app.use(cors())` in `createApp.js`) for local-only usage. Tightening to an environment-based allowlist is tracked under [Pending](#cors--csp-hardening).

### 5. Multi-layered SVG Sanitization

All uploaded SVG files are sanitized twice:

1. Client-side with `DOMPurify` before upload (`packages/editor-ui/src/hooks/useMediaUpload.js`)
2. Server-side with `isomorphic-dompurify` (SVG profile) on receipt (`packages/builder-server/src/controllers/mediaController.js`)

Theme/project **icon** SVG bodies (`assets/icons.json`) get a third sink-side pass in the editor — see §11. For the upload pipeline detail, see [Media Library](core-media.md).

### 6. Two-Tier JSON Body Limits

JSON body parsing is applied **per-router**, not globally, so the page-content save route can carry a larger payload than the rest of the API (`packages/builder-server/src/middleware/jsonParser.js`):

- `standardJsonParser` — `express.json({ limit: "2mb" })`, the default for most routers
- `editorJsonParser` — `express.json({ limit: "10mb" })`, applied to the page-content save route (`routes/pages.js`) and the collections router (`routes/collections.js`)

This bounds request body size to mitigate memory-exhaustion DoS while leaving headroom for large page/collection documents.

### 7. Global Error Handling

Custom error-handling middleware (`packages/builder-server/src/middleware/errorHandler.js`) registered as the final middleware. It:

- Maps multer's `LIMIT_FILE_SIZE` (a streaming per-file cap hit mid-upload) to `413`
- Maps a `WidgetizerError`'s numeric `statusCode` (from `@widgetizer/core`, thrown by adapters/handlers) directly to that status, and surfaces its stable machine-readable `code` (e.g. `PROJECT_MISMATCH`) in the JSON body
- Prevents crashes from unhandled exceptions and **suppresses stack traces in production** (`stack: null` when `NODE_ENV === "production"`)

### 8. Advanced Theme Settings Security

`custom_css`, `custom_head_scripts`, and `custom_footer_scripts` are rendered through custom Liquid tags that output raw content **without sanitization**. This is intentional — it mirrors how CMS platforms like WordPress handle admin-level custom code injection.

**Security model assumptions:**

- Users have full control over their own projects
- Users understand the implications of injecting raw HTML/CSS/JS
- Theme authors control whether to include these tags in `layout.liquid`

**Known risks:** XSS via custom scripts, CSS injection, CSP bypass, third-party script supply-chain risk. These are accepted trade-offs documented for users and theme authors. See the [theming docs](theming.md) for user-facing guidance.

### 9. Upload Safety Limits

File-size and image-dimension safety limits are enforced inline in each upload handler:

- **Image dimensions** — Sharp `limitInputPixels` (100M pixels) in `mediaController` and `themeController`
- **File sizes** — multer size limits derived from app settings in `mediaController`, `themeController`, and `projectController`; the per-tenant `MAX_UPLOAD_SIZE_BYTES` ceiling is the cross-tenant floor (§11)
- **Request body sizes** — the two-tier JSON body parser (§6)

See [Media Library](core-media.md) for the upload pipeline.

### 10. Project Import/Export & Theme Upload Security

Both project import and theme upload accept ZIP files from external sources. Implemented protections:

**Upload handling:**

- `multer` with **disk storage** (`data/temp/`) — no in-memory buffering
- Configurable size limit via `export.maxImportSizeMB` app setting (default 500MB), shared by both flows
- MIME type + extension validation (`.zip` only)

**Path traversal protection:**

- All file/directory access validated with `isWithinDirectory()` (`packages/builder-server/src/utils/pathSecurity.js`, a thin wrapper over the single implementation in `packages/core/src/utils/pathSecurity.js`)
- Uses `path.resolve()` + `path.relative()` boundary checks
- Rejects paths where `relativePath.startsWith("..")` or `path.isAbsolute(relativePath)`
- Replaces the naive `startsWith(basePath)` pattern which could be bypassed by sibling-prefix directories

**Import isolation:**

- Extract to isolated temp directory first, validate before copying
- Generate new UUID and slugified `folderName` on every import
- Validate manifest (`project-export.json`), JSON structure, and theme existence
- Atomic behavior: full success or full cleanup on failure

**Temp file cleanup:**

- Project import: cleanup in both success path and outer catch
- Theme upload: cleanup via `finally` block on all code paths

See [Site Exporting](core-export.md) for the export/import flow detail.

### 11. Cross-Tenant Safety (Multi-Tenant Host Contract)

After the workspaces/adapter refactor, `@widgetizer/builder-server` is adapter-agnostic and can be embedded in a multi-tenant host (Widgetizer Hosted) that injects cloud adapters via `createEditorApp({ adapters })` (`packages/builder-server/src/createApp.js`); the OSS shell builds local adapters in `app/server-common.js`. The `Scope` shape (`{ actor, projectId, folderName }`), the `LimitsAdapter`/`LIMIT_KEYS` model, and the storage/asset adapter contracts are defined in [Packages & Adapter Architecture](core-packages.md) — this section only lists the security controls the OSS code must uphold so one tenant's data, paths, or limits can never reach another.

**Authz happens at the resolver, not bolted onto routes.** Tenant/actor ownership checks live in the injected `ScopeResolver` implementation. `resolveActiveProject` then sets `req.scope` / `req.activeProject`; controllers read those instead of resolving projects themselves. On write requests, the [write-guard](#project-switch-isolation) (`X-Project-Id` header or `:projectId` param vs `scope.projectId`) returns `409 PROJECT_MISMATCH`.

**Path/isolation guards** (each rejects path separators and `..`):

- **`serveAsset`** (`previewController.js`) allow-lists the folder segment to `{ assets, widgets }` — anything else is `400` (SA-01) — then `path.normalize`s the subpath, strips leading `..`, and re-checks `isWithinDirectory(filePath, baseDir)`.
- **Media-metadata route** owner-checks the inner `:projectId` before returning metadata (TI-03).
- **Export serve** binds to `req.scope.folderName` via `exportDirBelongsToScope()` (`exportController.js`): it rejects `/`, `\`, and `..`, then anchors the directory to `<folderName>` or `<folderName>-v<digits>` (an anchored allowlist, not a prefix match) (TI-02/SA-13). See [Site Exporting](core-export.md).

**DoS limit keys** (enforced via the `LimitsAdapter` over `scope`; OSS `LocalLimitsAdapter` returns the App Settings upload cap for `MAX_UPLOAD_SIZE_BYTES` and `Infinity` for the count/quota keys, while hosted `CloudLimitsAdapter` returns finite tenant ceilings — see [Packages & Adapter Architecture](core-packages.md)):

- `MAX_WIDGETS_PER_PAGE` — `savePageContent` returns `422` over-cap.
- `MAX_MENU_ITEMS` + `MAX_MENU_DEPTH` (`= 32`, a hard structural cap exported from `@widgetizer/core/adapters`) — `menuController.validateMenuTree` walks the item tree **iteratively** (explicit stack, O(maxItems)) before any recursive sanitize/label/clone, bailing on either ceiling (`422`); the render engine's `resolveMenuItemLinks` is independently depth-capped at `MAX_MENU_DEPTH`.
- `MAX_UPLOAD_SIZE_BYTES` — `mediaController.uploadWithLimit` applies it as a streaming multer `limits.fileSize`; the `errorHandler` maps `LIMIT_FILE_SIZE` → `413` (§7). See [Media Library](core-media.md).

**Tenant SVG icon sanitization.** `IconInput.jsx`'s `sanitizeIconBody()` (`packages/editor-ui/src/components/settings/inputs/IconInput.jsx`) runs the DOMPurify SVG profile, applied at both `dangerouslySetInnerHTML` sinks. Icon bodies come verbatim from the project's tenant-authored `assets/icons.json` (notably via ZIP import, which copies it unvalidated), so injecting them in the editor origin would be stored XSS. It wraps the body in `<svg>` first so the SVG profile does not blank the bare inner fragment.

**PostMessage origin scoping.** The preview bridge uses `getPreviewTargetOrigin()` (the resolved peer origin) instead of `"*"` (`packages/editor-ui/src/lib/previewBase.js`, consumed by `PreviewPanel.jsx`), so editor↔preview messages cannot leak across origins when isolation is enabled.

**LiquidJS floor.** `liquidjs` is pinned to `^10.26.0` in `@widgetizer/core` + `@widgetizer/render-engine`, which fixes the GHSA RCE/SSTI and the `strip_html` ReDoS.

### 12. Link & URL Safety

Author-entered URLs and image paths are constrained so widget / menu / collection content can't smuggle a dangerous scheme or an out-of-project path into the rendered HTML. The helpers live in `@widgetizer/core` (shared with the render engine's filters) and `@widgetizer/builder-server` (server-side sanitization).

**`sanitizeHref` (core)** — `packages/core/src/utils/urlSafety.js` blocks the `javascript:`, `data:`, and `vbscript:` schemes. It first runs `normalize()`, which reproduces a browser's pre-scheme preprocessing — strips embedded tab/LF/CR and trims leading/trailing C0-control-or-space — so obfuscated schemes (an embedded tab inside `javascript`, a leading control char) cannot bypass the contiguous-scheme test. Returns the href unchanged when safe, `""` when dangerous.

**`safe_url` Liquid filter (core)** — `packages/core/src/filters/safeUrlFilter.js` applies `sanitizeHref` to an author-controlled URL a theme emits directly into an attribute (coercing non-strings to `""`). Use it for plain text/URL values; the `link` setting type and menu links are already sanitized server-side:

```liquid
<a href="{{ social.facebook_url | safe_url }}">…</a>
```

**`rte_text` / `rte_blank` Liquid filters (core)** — `packages/core/src/filters/rteFilter.js`. Richtext fields are never truly empty when "blank" (the editor leaves `<p></p>`, `<p><br></p>`, `<p>&nbsp;</p>`), so the usual `{% if x == blank %}` guard always sees content. `rte_text` collapses an RTE value to its plain text and `rte_blank` reports whether it is visually empty — for presence/visibility tests only. Always render the **raw original** (`| raw`); these filters never replace it.

**Image-path allowlist (builder-server)** — `packages/builder-server/src/services/sanitizationService.js` blanks any image path that isn't a safe in-project path, rejecting schemes, external / protocol-relative (`//…`) URLs, traversal (`..`), and characters that could break out of an unescaped `<img src>` (quotes, `<`, `>`, whitespace):

- `sanitizeImagePath` — strict: requires `/uploads/images/…`. Used for every **gallery** entry and for collection required-field validation.
- `sanitizeImageSettingValue` — broader: allows any safe in-project absolute path, so a non-upload theme asset like `/default-logo.png` survives. Used for plain `image` settings.

Both share one `isSafeImagePath` allowlist so "safe path" means exactly one thing. The strict variant matters because the `{% image %}` tag falls back to a raw `<img src="…">` with the value's basename unescaped, so a value like `/uploads/images/x" onerror="alert(1).jpg` must never survive.

**Stable link references** — `link` settings and menu items may target a page (`pageUuid`) or a collection item (`collectionItemUuid` + `collectionType`) instead of a literal href, so renames follow the reference. The render engine's `resolveLinkValue` (`packages/render-engine/src/renderEngine.js`) resolves these to a depth-correct href at render time and drops dead refs; `linkEnrichment.js` (`packages/builder-server/src/utils`) maintains them on project create/duplicate/delete and preset seeding (regenerating uuids and clearing references to deleted pages/items). Because resolution emits an internal slug-derived href (never raw author input), these references cannot inject a scheme.

**Default button type** — the shared `Button` component (`packages/editor-ui/src/components/ui/Button.jsx`) defaults to `type="button"`, so a button inside a `<form>` never submits it by accident; callers opt into `type="submit"` explicitly.

These complement §1–§2: autoescape on every `{{ }}`, DOMPurify on richtext before `| raw`, and these URL / image guards on the few author-controlled values that reach an attribute.

### 13. Preview Isolation

Optional security boundary that runs the preview iframe on a separate origin from the builder.

**Token-based rendering:** Builder POSTs page data to the preview-token route, which renders HTML server-side and stores it in an in-memory token store (`packages/builder-server/src/services/previewTokenStore.js`). The iframe loads `/render/:token` (on the preview origin when isolation is enabled). Tokens expire after 5 minutes (`TOKEN_TTL_MS`), capped at 1000 concurrent (`MAX_TOKENS`, oldest evicted), with a 1-minute periodic sweep.

**PostMessage origin verification:** All `postMessage` calls use explicit target origins (not `"*"`) when isolation is enabled (`getPreviewTargetOrigin()` in `previewBase.js`). The preview runtime rejects messages from unexpected origins.

**Inline overlay rendering:** Selection/hover overlays are rendered inside the iframe by `previewRuntime.js` (`packages/core/src/runtime/previewRuntime.js`, served raw to the iframe via `express.static(/runtime)`), eliminating cross-origin `contentDocument` access. When the preview loads same-origin, `postMessage` uses `"*"`.

### Project-Switch Isolation

Prevents data from one project being shown, saved, previewed, or exported against another project when the user switches projects. This is the OSS-shell expression of the write-guard referenced in §11.

**Server-side (middleware):**

- `resolveActiveProject` middleware covers all project-scoped routes (pages, menus, media, export, preview globally; theme project endpoints per-route)
- For write requests (POST/PUT/PATCH/DELETE), validates both the `X-Project-Id` header and `req.params.projectId` against the resolved scope — either mismatch returns `409 PROJECT_MISMATCH`
- Controllers use `req.scope` / `req.activeProject` from middleware instead of resolving the project themselves

**Client-side (header injection):**

- `apiFetch` auto-injects `X-Project-Id` from the Zustand project store on every request
- `saveStore` does a proactive check comparing `loadedProjectId` against the active project before initiating any save
- `RequireActiveProject` is the route boundary for site-workspace routes: it redirects without an active project and remounts the workspace subtree with a project-keyed outlet when the active project changes. The OSS shell resets project-scoped singleton stores from `app/src/App.jsx` via `projectSwitchCoordinator`.

**Client-side (stale-response guards):**

- `pageStore` uses an `activeLoadId` counter to discard late async responses from superseded loads
- `themeStore` owns theme-settings load protection via `activeLoadId`; its `resetForProjectChange()` action is triggered centrally by `projectSwitchCoordinator`, while `Settings.jsx` still guards save completion against project switches
- `widgetStore` and `saveStore` are also reset centrally by `projectSwitchCoordinator` so singleton store state cannot leak across project switches
- `useExportState` and `ExportCreator` guard `loadExportHistory` and export completion against project changes mid-flight

---

## Configuration

### Environment Variables (`.env`)

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `development` or `production` |
| `PORT` | Server port (default 3001) |
| `VITE_API_URL` | Backend API base URL for the frontend |
| `SERVER_URL` | Server's own base URL for runtime/preview URLs |

Preview isolation variables are described in §13 above.

### Health Check

`GET /health` returns `{ "status": "ok", "timestamp": "..." }` for monitoring and load balancer checks (`createApp.js`).

### Deployment

> The current project is designed for local-only use by default.

- **Production build**: `npm run build` creates an optimized frontend in `dist/`
- **Static serving**: `express.static` serves `dist/` in production; a catch-all route serves `index.html` for client-side routing (`mountEditorUiRoutes` in `createApp.js`)
- **Trust proxy**: `app.set("trust proxy", 1)` is enabled in production behind reverse proxies

---

**See also:**

- [Packages & Adapter Architecture](core-packages.md) — adapters, `Scope`, `LIMIT_KEYS`, the cross-tenant contract
- [Media Library](core-media.md) — SVG sanitization and upload limits in media uploads
- [Site Exporting](core-export.md) — export/import storage and serve binding
- [Custom Hooks](core-hooks.md) — client-side sanitization in `useMediaUpload`

---

## Pending

### CORS & CSP Hardening

- [ ] Environment-based CORS branching: strict allowlist in production, permissive in local dev
- [ ] Implement Content Security Policy with nonce or hash-based validation for inline scripts
- [ ] Provide a whitelist of allowed external script sources

### Future Security Enhancements

- [ ] Digital signatures for verified project exports
- [ ] Content scanning for known malicious patterns in imported projects/themes
- [ ] Sandboxed import environment for untrusted sources
