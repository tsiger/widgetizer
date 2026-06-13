# Platform Security

This document covers all security measures in Widgetizer.

---

## Implemented

### 1. Input Validation & Sanitization

All incoming data is validated and sanitized before reaching controllers.

- `express-validator` rules on the content CRUD routes (projects, pages, menus, media, collections, app settings); preview/export/theme routes rely on controller-level checks instead
- `validateRequest` middleware centralizes the validation-result check (one place, all routes)
- Collection route slugs (`collectionType`, `itemSlug`, slug arrays in request bodies) must match `^[a-z0-9-]+$`, so a crafted value like `../../pages/index` can never reach a path helper
- Plain-text fields (project/page/menu names, descriptions) use `stripHtmlTags()` — a DOMPurify-based sanitizer that strips all HTML while preserving `&`, `"`, `'`
- Widget/block settings (and collection items) use schema-aware sanitization via `sanitizationService.js` (DOMPurify for richtext, dangerous-protocol blocking for `link`-type hrefs). Collection items pass through `prepareCollectionItemForRender` (`collectionService.js`), which resolves page links first and then applies `sanitizeCollectionItemData` — sanitize-after-resolve. Menu custom links are blocked the same way at render time. The href check is the shared `sanitizeHref` in `src/core/utils/urlSafety.js`, which tests the browser-preprocessed URL (WHATWG: trim leading/trailing C0-control-or-space, remove embedded tab/LF/CR) so obfuscated schemes (a tab inside "javascript", or a leading control byte) cannot bypass it
- Text/textarea fields rely on LiquidJS autoescape (`outputEscape: "escape"`) at render time. Autoescape stops attribute breakout but does **not** neutralize a dangerous URL *scheme* — so a theme that emits an author-entered URL into an `href` must pass it through the `| safe_url` Liquid filter (backed by the same `sanitizeHref`). Shipped themes apply it to social/profile/team URL fields

### 2. HTTP Security Headers

`helmet` in `server/createApp.js` with intentional relaxations for preview compatibility:

| Directive | Value | Reason |
|-----------|-------|--------|
| `contentSecurityPolicy` | `false` | Preview iframe needs inline styles/scripts from widgets |
| `crossOriginEmbedderPolicy` | `false` | Widgets load cross-origin iframes (YouTube, Maps, etc.) |
| `crossOriginResourcePolicy` | `cross-origin` | Allow SVGs and assets in preview iframe |
| `frameguard` | `false` | Preview renders in iframe via `/render/:token` |
| `referrerPolicy` | `strict-origin-when-cross-origin` | YouTube/Vimeo need Referer to validate embeds |
| `crossOriginOpenerPolicy` | `false` | YouTube player needs cross-origin popup communication |

### 3. Cross-Origin Resource Sharing (CORS)

- Permissive defaults (`app.use(cors())`) for local-only usage

### 4. Multi-layered SVG Sanitization

All uploaded SVG files are sanitized twice:

1. Client-side with `DOMPurify` before upload (`useMediaUpload.js`)
2. Server-side with `isomorphic-dompurify` on receipt (`mediaController.js`)

### 5. Global Error Handling

Custom error-handling middleware (`server/middleware/errorHandler.js`) registered as the final middleware. Prevents crashes from unhandled exceptions and ensures stack traces are not leaked in production.

### 6. Advanced Theme Settings Security

`custom_css`, `custom_head_scripts`, and `custom_footer_scripts` are rendered through custom Liquid tags that output raw content **without sanitization**. This is intentional — it mirrors how CMS platforms like WordPress handle admin-level custom code injection.

**Security model assumptions:**

- Users have full control over their own projects
- Users understand the implications of injecting raw HTML/CSS/JS
- Theme authors control whether to include these tags in `layout.liquid`

**Known risks:** XSS via custom scripts, CSS injection, CSP bypass, third-party script supply-chain risk. These are accepted trade-offs documented for users and theme authors. See the [theming docs](theming.md) for user-facing guidance.

### 7. Upload Safety Limits

File-size and image-dimension safety limits are enforced inline in each upload handler:

- **Image dimensions**: Sharp `limitInputPixels` (100M pixels) in mediaController and `siteIconHelpers.js` (site-icon generation during render/export)
- **File sizes**: Media uploads are checked per-file against the `media.maxFileSizeMB` app setting in mediaController (after multer receives the file; default 50MB); ZIP uploads use multer `fileSize` limits derived from `export.maxImportSizeMB` in projectController and themeController
- **Request body sizes**: Express JSON body limits applied per-router via `server/middleware/jsonParser.js` (2 MB standard, 10 MB for page-content saves)

### 8. Project Import/Export & Theme Upload Security

Both project import and theme upload accept ZIP files from external sources. Implemented protections:

**Upload handling:**

- `multer` with **disk storage** (`data/temp/`) — no in-memory buffering
- Configurable size limit via `export.maxImportSizeMB` app setting (default 500MB), shared by both flows
- MIME type + extension validation (`.zip` only)

**Path traversal protection:**

- All file/directory access validated with `isWithinDirectory()` (`server/utils/pathSecurity.js`)
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

### 9. Token-Based Preview Rendering

The preview iframe never receives raw HTML from the builder; it renders through a short-lived server-side token.

**Token-based rendering:** Builder POSTs page data to `/api/preview/token` (collection items use `/api/preview/collection`), which renders HTML server-side and stores it in an in-memory token store (`server/services/previewTokenStore.js`). The iframe loads `/render/:token`. Tokens are random UUIDs that expire after 5 minutes, capped at 1000 concurrent (oldest evicted).

**Inline overlay rendering:** Selection/hover overlays are rendered inside the iframe by `previewRuntime.js`, eliminating cross-origin `contentDocument` access. The preview loads same-origin and `postMessage` uses `"*"`.

---

## Configuration

### Environment Variables (`.env`)

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `development` or `production` |
| `PORT` | Server port (default 3001) |
| `VITE_API_URL` | Backend API base URL for the frontend |
| `SERVER_URL` | Server's own base URL for runtime/preview URLs |

### Health Check

`GET /health` returns `{ "status": "ok", "timestamp": "..." }` for monitoring and load balancer checks.

### Deployment

> The current project is designed for local-only use by default.

- **Production build**: `npm run build` creates an optimized frontend in `dist/`
- **Static serving**: `express.static` serves `dist/` in production; catch-all route serves `index.html` for client-side routing
- **Trust proxy**: Enabled in production behind reverse proxies

### 10. Project-Switch Isolation

Prevents data from one project being shown, saved, previewed, or exported against another project when the user switches projects.

**Server-side (middleware):**

- `resolveActiveProject` middleware covers all project-scoped routes (pages, menus, media, collections, export, preview globally; theme project endpoints per-route)
- For write requests (POST/PUT/PATCH/DELETE), validates both the `X-Project-Id` header and `req.params.projectId` against the server's active project — either mismatch returns 409 `PROJECT_MISMATCH`
- Controllers use `req.activeProject` from middleware instead of resolving the project themselves

**Client-side (header injection):**

- `apiFetch` auto-injects `X-Project-Id` from the Zustand project store on every request
- `saveStore` does a proactive check comparing `loadedProjectId` against the active project before initiating any save
- `RequireActiveProject` is the frontend project-switch boundary for site-workspace routes: it remounts the workspace subtree with a project-keyed outlet. Singleton-store resets are coordinated higher up, in an `App.jsx` effect that calls `handleActiveProjectChange` (`src/lib/projectSwitchCoordinator.js`), so they also run when the project changes from the admin shell

**Client-side (stale-response guards):**

- `pageStore` uses an `activeLoadId` counter to discard late async responses from superseded loads
- `themeStore` owns theme-settings load protection via `activeLoadId`; its `resetForProjectChange()` action is triggered centrally by the `App.jsx` project-switch effect, while `Settings.jsx` still guards save completion against project switches
- `widgetStore`, `saveStore`, and `pageStore` are also reset centrally by the same `App.jsx` effect so singleton store state cannot leak across project switches
- `useExportState` and `ExportCreator` guard `loadExportHistory` and export completion against project changes mid-flight

---

**See also:**

- [Media Library](core-media.md) — SVG sanitization in media uploads
- [Custom Hooks](core-hooks.md) — Client-side sanitization in `useMediaUpload`

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
