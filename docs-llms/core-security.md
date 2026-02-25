# Platform Security

This document covers all security measures in Widgetizer. Everything in the **Implemented** sections is active in both the open-source and hosted versions of the app. The **Pending** sections at the end list work that hasn't been done yet.

---

## Implemented (both versions)

### 1. Input Validation & Sanitization

All incoming data is validated and sanitized before reaching controllers.

- `express-validator` rules on every API route that accepts input
- `validateRequest` middleware centralizes the validation-result check (one place, all routes)
- Plain-text fields (project/page/menu names, descriptions) use `stripHtmlTags()` — a DOMPurify-based sanitizer that strips all HTML while preserving `&`, `"`, `'`
- Widget/block settings use schema-aware sanitization via `sanitizationService.js` (DOMPurify for richtext, protocol blocking for links)
- Text/textarea fields rely on LiquidJS autoescape (`outputEscape: "escape"`) at render time

### 2. API Rate Limiting

IP-based request throttling via `express-rate-limit`:

- **Editor routes** (`/api/projects`, `/api/themes`, `/api/pages`, `/api/preview`): 1500 req / 15 min
- **Other API routes** (`/api/menus`, `/api/media`, `/api/export`, `/api/settings`, `/api/core-widgets`, `/api/core`, `/api/publish` in hosted mode): 5000 req / 15 min

### 3. HTTP Security Headers

`helmet` in `server/index.js` with intentional relaxations for preview compatibility:

| Directive | Value | Reason |
|-----------|-------|--------|
| `contentSecurityPolicy` | `false` | Preview iframe needs inline styles/scripts from widgets |
| `crossOriginEmbedderPolicy` | `false` | Widgets load cross-origin iframes (YouTube, Maps, etc.) |
| `crossOriginResourcePolicy` | `cross-origin` | Allow SVGs and assets in preview iframe |
| `frameguard` | `false` | Preview renders in iframe via `/render/:token` |
| `referrerPolicy` | `strict-origin-when-cross-origin` | YouTube/Vimeo need Referer to validate embeds |
| `crossOriginOpenerPolicy` | `false` | YouTube player needs cross-origin popup communication |

### 4. Cross-Origin Resource Sharing (CORS)

- Permissive defaults (`app.use(cors())`) for local-only usage
- When `PREVIEW_ISOLATION=true`, switches to an allowlist-based origin policy using `ALLOWED_ORIGINS`

### 5. Multi-layered SVG Sanitization

All uploaded SVG files are sanitized twice:

1. Client-side with `DOMPurify` before upload (`useMediaUpload.js`)
2. Server-side with `isomorphic-dompurify` on receipt (`mediaController.js`)

### 6. Global Error Handling

Custom error-handling middleware (`server/middleware/errorHandler.js`) registered as the final middleware. Prevents crashes from unhandled exceptions and ensures stack traces are not leaked in production.

### 7. Advanced Theme Settings Security

`custom_css`, `custom_head_scripts`, and `custom_footer_scripts` are rendered through custom Liquid tags that output raw content **without sanitization**. This is intentional — it mirrors how CMS platforms like WordPress handle admin-level custom code injection.

**Security model assumptions:**

- Users have full control over their own projects
- Users understand the implications of injecting raw HTML/CSS/JS
- Theme authors control whether to include these tags in `layout.liquid`

**Known risks:** XSS via custom scripts, CSS injection, CSP bypass, third-party script supply-chain risk. These are accepted trade-offs documented for users and theme authors. See the [theming docs](theming.md) for user-facing guidance.

### 8. Platform Limits (`server/limits.js`)

All server-enforced resource limits are centralized in `server/limits.js` as `EDITOR_LIMITS`. These limits have two enforcement modes:

**Always enforced (both open-source and hosted):**
- ZIP entry count (`maxZipEntries`: 10,000) — prevents ZIP bombs
- Image dimensions (`maxImageDimension`: 10,000px, `maxImagePixels`: 100M) — prevents decompression bombs
- Request body sizes (`jsonBodyLimit`: 2MB, `editorJsonBodyLimit`: 10MB)

**Hosted-mode only (`HOSTED_MODE=true`):**
- Project counts (`maxProjectsPerUser`: 25)
- Page counts (`maxPagesPerProject`: 100)
- Widget counts (`maxWidgetsPerPage`: 50, `maxBlocksPerWidget`: 200)
- Media limits (`maxFilesPerProject`: 1,000, `maxTotalStoragePerUserMB`: 5,000)
- Menu limits (`maxMenusPerProject`: 20, `maxMenuItemsPerMenu`: 200)
- Theme limits (`maxThemesPerUser`: 20)
- Upload ceilings (`maxFileSizeMBCeiling`: 50, `maxVideoSizeMBCeiling`: 200, `maxAudioSizeMBCeiling`: 100)
- Export ceilings (`maxImportSizeMBCeiling`: 2,000MB, `maxExportVersionsCeiling`: 50)

User-configurable app settings (e.g., `maxFileSizeMB`) are clamped to these ceilings in `appSettingsController.js` before saving. Enforcement utility functions (`checkLimit`, `checkStringLength`, `validateZipEntries`, `clampToCeiling`) are in `server/utils/limitChecks.js`.

### 9. Project Import/Export & Theme Upload Security

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

### 10. Preview Isolation

Optional security boundary that runs the preview iframe on a separate origin from the builder.

**Token-based rendering:** Builder POSTs page data to `/api/preview/token`, which renders HTML server-side and stores it in an in-memory token store. The iframe loads `/render/:token` (on the preview origin when isolation is enabled). Tokens expire after 5 minutes, capped at 1000 concurrent.

**PostMessage origin verification:** All `postMessage` calls use explicit target origins (not `"*"`) when isolation is enabled. The preview runtime rejects messages from unexpected origins.

**Inline overlay rendering:** Selection/hover overlays are rendered inside the iframe by `previewRuntime.js`, eliminating cross-origin `contentDocument` access.

| Variable | Side | Required | Description |
|----------|------|----------|-------------|
| `PREVIEW_ISOLATION` | Server | No | Set to `true` to enable |
| `EDITOR_ORIGIN` | Server | When isolation=true | Editor origin (e.g., `https://editor.example.com`) |
| `ALLOWED_ORIGINS` | Server | When isolation=true | Comma-separated CORS allowlist |
| `VITE_PREVIEW_ISOLATION` | Client | No | Mirrors `PREVIEW_ISOLATION` |
| `VITE_PREVIEW_ORIGIN` | Client | When isolation=true | Preview origin (e.g., `https://preview.example.com`) |

When isolation is off (default), the preview loads same-origin and `postMessage` uses `"*"`.

---

## Configuration

### Environment Variables (`.env`)

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `development` or `production` |
| `PORT` | Server port (default 3001) |
| `VITE_API_URL` | Backend API base URL for the frontend |
| `SERVER_URL` | Server's own base URL for runtime/preview URLs |

Preview isolation variables are listed in section 10 above.

### Health Check

`GET /health` returns `{ "status": "ok", "timestamp": "..." }` for monitoring and load balancer checks.

### Deployment

> The current project is designed for local-only use by default.

- **Production build**: `npm run build` creates an optimized frontend in `dist/`
- **Static serving**: `express.static` serves `dist/` in production; catch-all route serves `index.html` for client-side routing
- **Trust proxy**: Enabled in production for correct rate limiting behind reverse proxies

---

**See also:**

- [Media Library](core-media.md) — SVG sanitization in media uploads
- [Custom Hooks](core-hooks.md) — Client-side sanitization in `useMediaUpload`

---

## Pending: Open Source

No outstanding security tasks. All protections listed above are active.

---

## Implemented: Hosted / Multi-user (Phase 2)

### Authentication

- [x] Auth middleware (`server/middleware/auth.js`) — unconditionally sets `req.userId`. Open-source mode: `"local"`. Hosted mode: verifies Clerk JWT and extracts user ID; returns 401 on failure.
- [x] `apiFetch` wrapper (`src/lib/apiFetch.js`) — attaches Clerk Bearer token when `window.Clerk?.session` exists. No-op in open-source mode.
- [x] Feature flag: `HOSTED_MODE` from `server/hostedMode.js` controls whether auth is enforced.

### Multi-tenant Data Isolation

- [x] All data is scoped per user: `data/users/{userId}/projects/`, `data/users/{userId}/themes/`, `data/users/{userId}/publish/`
- [x] All path helpers in `server/config.js` take a `userId` parameter (default `"local"`)
- [x] All controller functions thread `req.userId` through to path helpers and repository calls
- [x] SQLite `projects` table has a `user_id` column; all queries are filtered by `user_id`
- [x] `getProjectFolderName(projectId, userId)` validates project ownership (throws if the project doesn't belong to the user)
- [x] Theme operations are per-user — each user has their own installed themes in `data/users/{userId}/themes/`
- [x] Default themes are provisioned from a read-only seed directory (`THEMES_SEED_DIR`) on first access

### Pending: Authorization & Hardening

- [ ] Add role-based access control (admin, editor, viewer)
- [ ] Restrict theme settings (custom CSS/JS) to admin role only

### Pending: CORS & CSP Hardening

- [ ] Environment-based CORS branching: strict allowlist in production, permissive in local dev
- [ ] Implement Content Security Policy with nonce or hash-based validation for inline scripts
- [ ] Provide a whitelist of allowed external script sources

### Theme Settings Security (multi-user context)

- [ ] Optional sanitization modes (strict vs. permissive) for `custom_css`/`custom_scripts`
- [ ] Code review / approval workflows for theme settings changes
- [ ] Audit logging for all theme setting modifications

### Project Sharing / Marketplace (future)

- [ ] Digital signatures for verified project exports
- [ ] Content scanning for known malicious patterns in imported projects/themes
- [ ] Sandboxed import environment for untrusted sources
- [ ] Project reputation/rating system
