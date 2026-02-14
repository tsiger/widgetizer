# Platform Security

This document outlines the key security measures implemented in the Widgetizer backend to protect the application, its data, and its users.

## 🛡️ Core Security Layers

These layers are applied automatically to API endpoints and provide a robust baseline of protection.

### 1. Input Validation & Sanitization

- **What it is:** All incoming data from the client (e.g., in `req.body` or `req.params`) is rigorously validated and sanitized before being processed by the controllers.
- **Why it's important:** This is the primary defense against common web vulnerabilities like Cross-Site Scripting (XSS) and data integrity issues. It ensures that only well-formed data is accepted by the application.
- **Implementation:** Achieved using the `express-validator` library on all API routes that accept input.

### 2. API Rate Limiting

- **What it is:** Limits the number of requests an IP address can make to the API within a specific timeframe.
- **Why it's important:** Prevents abuse and Denial-of-Service (DoS) attacks where a single actor could overwhelm the server, making it unavailable for legitimate users.
- **Implementation:** Uses the `express-rate-limit` package. Two policies are in place:
  - **Editor routes** (`/api/projects`, `/api/themes`, `/api/pages`, `/api/preview`): 1500 requests per 15 minutes
  - **Other API routes** (`/api/menus`, `/api/media`, `/api/export`, `/api/settings`): 5000 requests per 15 minutes

### 3. HTTP Security Headers

- **What it is:** A collection of defensive HTTP headers sent with every response from the server.
- **Why it's important:** Helps reduce browser-side attack surface (clickjacking, MIME sniffing, unsafe cross-origin defaults).
- **Implementation:** Implemented globally with `helmet` in `server/index.js`. Current configuration intentionally relaxes some protections for preview/runtime compatibility:
  - `contentSecurityPolicy: false` — Preview iframe needs inline styles/scripts from widgets
  - `crossOriginEmbedderPolicy: false` — Widgets load cross-origin iframes (YouTube, Maps, etc.)
  - `crossOriginResourcePolicy: { policy: "cross-origin" }` — Allow SVGs and assets in preview iframe
  - `frameguard: false` — Preview renders in iframe via `/render/:token`
  - `referrerPolicy: { policy: "strict-origin-when-cross-origin" }` — YouTube/Vimeo need the Referer header to validate embeds (helmet default `no-referrer` breaks them)
  - `crossOriginOpenerPolicy: false` — YouTube player needs cross-origin popup communication

### 4. Cross-Origin Resource Sharing (CORS)

- **What it is:** The server controls which domains are allowed to access the API.
- **Why it's important:** Prevents unauthorized websites from making requests to your API.
- **Implementation:** The `cors` package is enabled globally (`app.use(cors())`) with permissive defaults for local-only usage. When `PREVIEW_ISOLATION=true`, CORS switches to an allowlist-based origin policy using the `ALLOWED_ORIGINS` environment variable. If deployed remotely, replace with an allowlist-based origin policy.

### 5. Multi-layered SVG Sanitization

- **What it is:** All uploaded SVG files are sanitized twice: first on the client using `DOMPurify` before upload, and then again on the server using `isomorphic-dompurify`.
- **Why it's important:** SVGs are XML files that can contain JavaScript (XSS vectors). Defense-in-depth ensures that even if client-side sanitization is bypassed, the server protects the filesystem.
- **Implementation:** Integrated into `useMediaUpload.js` (client) and `mediaController.js` (server).

### 6. Global Error Handling

- **What it is:** A catch-all "safety net" middleware that handles any unexpected errors that occur within the application.
- **Why it's important:** Prevents the server from crashing due to unhandled exceptions. It also ensures that sensitive error details (like stack traces) are not leaked to the client in a production environment.
- **Implementation:** A custom error-handling middleware (`server/middleware/errorHandler.js`) is registered as the final middleware in `server/index.js`.

### 7. Advanced Theme Settings Security

- **What it is:** Advanced theme settings allow users to inject custom CSS and JavaScript directly into their theme templates through the `custom_css`, `custom_head_scripts`, and `custom_footer_scripts` settings.
- **Why it's important:** These settings provide powerful customization capabilities but introduce significant security risks if not properly understood and managed.
- **Implementation:** These settings are rendered through custom Liquid tags (`{% custom_css %}`, `{% custom_head_scripts %}`, `{% custom_footer_scripts %}`) that output raw HTML/CSS content without sanitization.

#### Security Risks

**1. Cross-Site Scripting (XSS) Vulnerabilities**

- The `custom_head_scripts` and `custom_footer_scripts` settings accept raw HTML/JavaScript that is rendered directly into the page without any sanitization or Content Security Policy (CSP) restrictions.
- Malicious JavaScript injected through these settings can:
  - Steal user session cookies and authentication tokens
  - Perform unauthorized actions on behalf of users
  - Redirect users to malicious websites
  - Access and exfiltrate sensitive user data
  - Modify page content to display phishing content

**2. CSS Injection Attacks**

- The `custom_css` setting allows arbitrary CSS to be injected into the page.
- While CSS cannot directly execute JavaScript, it can be used for:
  - UI redressing attacks (making malicious elements appear legitimate)
  - Data exfiltration through CSS attribute selectors and `@import` directives
  - Privacy violations by detecting visited links
  - Clickjacking attacks by overlaying transparent elements

**3. Content Security Policy (CSP) Bypass**

- If a CSP is implemented, inline scripts and styles injected through these settings may bypass CSP restrictions, depending on the policy configuration.
- This can undermine other security measures put in place.

**4. Third-Party Script Risks**

- Users may paste third-party scripts (e.g., Google Analytics, advertising scripts) that:
  - Load additional scripts from external domains
  - Track user behavior across sites
  - May be compromised or replaced with malicious versions
  - Can introduce supply chain vulnerabilities

#### Mitigation Strategies

**For Theme Authors:**

1. **Documentation and Warnings**: Clearly document that these are advanced settings intended for trusted users only.
2. **Placement Control**: Theme authors control where these tags are placed in `layout.liquid`, allowing them to position them appropriately (e.g., after other critical assets).
3. **Optional Implementation**: Theme authors can choose not to include these tags in their themes if they don't want to expose this functionality.

**For End Users:**

1. **Trust and Verification**: Only paste code from trusted sources. Verify the integrity of third-party scripts before adding them.
2. **Minimal Code**: Only include the minimum necessary code. Avoid pasting entire HTML documents or unnecessary scripts.
3. **Regular Audits**: Periodically review and audit custom code to ensure it hasn't been modified or compromised.
4. **Testing**: Test custom code in a development environment before deploying to production.

**For Administrators:**

1. **Access Control**: Consider restricting access to theme settings based on user roles or permissions if implementing a multi-user system.
2. **Monitoring**: Implement logging and monitoring for changes to theme settings to detect unauthorized modifications.
3. **Backup and Version Control**: Maintain backups and version history of theme settings to enable rollback if malicious code is detected.
4. **Content Security Policy**: Consider implementing a strict CSP, but be aware that it may conflict with user-provided scripts. If CSP is implemented, users must ensure their custom scripts comply with the policy.

#### Design Rationale

These settings are intentionally unsanitized to provide maximum flexibility for advanced users who need to:

- Integrate third-party analytics and tracking services
- Add custom styling that cannot be achieved through standard theme settings
- Implement custom functionality through JavaScript
- Integrate with external services and APIs

The security model assumes that:

- Users have full control over their projects and are responsible for the content they add
- The application is primarily used in a single-user or trusted multi-user environment
- Users understand the security implications of injecting raw HTML/CSS/JavaScript

This is similar to how content management systems like WordPress allow administrators to add custom CSS and JavaScript through theme customization panels, with the understanding that administrators are trusted users.

#### Best Practices

1. **Validate Input on Save**: While not sanitizing content, validate that the input is valid text and handle encoding issues appropriately.
2. **Error Handling**: The tag implementations include error handling to prevent template rendering failures if settings are malformed.
3. **Empty Value Handling**: Tags return empty strings when settings are not configured, preventing unnecessary empty tags in the output.
4. **Documentation**: Comprehensive documentation in `docs/theming.md` and `docs/core-security.md` helps users understand the risks and proper usage.

#### Future Considerations

If the application evolves to support untrusted multi-user environments or public-facing theme marketplaces, consider:

- Implementing optional sanitization modes (strict vs. permissive)
- Adding CSP headers with nonce or hash-based validation
- Providing a whitelist of allowed script sources
- Implementing code review workflows for theme settings changes
- Adding audit logging for all theme setting modifications

### 9. Preview Isolation

- **What it is:** An optional security boundary that runs the preview iframe on a separate origin from the builder app. When `PREVIEW_ISOLATION=true`, the preview loads via `<iframe src="https://preview.domain/render/:token">` instead of same-origin, preventing preview-injected scripts from accessing the builder's cookies, localStorage, or session tokens.
- **Why it's important:** In multi-user or SaaS deployments, user-authored widget templates may contain arbitrary scripts (custom JavaScript, third-party integrations). Without origin isolation, these scripts run in the builder's origin and can access sensitive data. Isolation ensures the preview is sandboxed in a separate security context.

#### Architecture

**Token-based rendering:** The builder POSTs page data to `/api/preview/token`, which renders the full HTML server-side and stores it in an in-memory token store (`server/services/previewTokenStore.js`). The builder sets the iframe's `src` to `/render/:token` (on the preview origin when isolation is enabled). Tokens expire after 5 minutes and are limited to 1000 concurrent entries.

**PostMessage origin verification:** All `postMessage` calls between the builder and preview use explicit target origins instead of `"*"`:
- Builder → Preview: uses `VITE_PREVIEW_ORIGIN` (or `"*"` when isolation is off)
- Preview → Builder: reads `data-builder-origin` attribute from the runtime script tag (or `"*"` when isolation is off)
- The preview runtime (`previewRuntime.js`) rejects messages from unexpected origins when isolation is enabled.

**Inline overlay rendering:** The selection/hover overlay (selection boxes, widget labels, reorder buttons) is rendered inside the iframe by `previewRuntime.js` using vanilla JS. This eliminates the need for cross-origin `contentDocument` access and removes scroll lag that occurred with the previous parent-side overlay approach. The parent sends widget metadata (display names, widget order) via `SET_WIDGET_METADATA` postMessage.

#### Environment Variables

| Variable | Side | Required | Description |
|----------|------|----------|-------------|
| `PREVIEW_ISOLATION` | Server | No | Set to `true` to enable preview isolation |
| `BUILDER_ORIGIN` | Server | When isolation=true | Builder app origin (e.g., `https://builder.example.com`) |
| `ALLOWED_ORIGINS` | Server | When isolation=true | Comma-separated CORS allowlist |
| `VITE_PREVIEW_ISOLATION` | Client | No | Mirrors `PREVIEW_ISOLATION` |
| `VITE_PREVIEW_ORIGIN` | Client | When isolation=true | Preview origin (e.g., `https://preview.example.com`) |

#### Local Development

When `PREVIEW_ISOLATION` is not set (default), the preview loads from the same origin as the builder using `src`-based rendering. PostMessage uses `"*"` as the target origin. This is the standard mode for single-user local development.

## ⚙️ Configuration

### Environment Variables (`.env`)

Sensitive configuration and environment-specific settings are stored in a `.env` file, which is kept out of version control. Key variables include:

- `NODE_ENV`: Controls whether the application runs in `development` or `production` mode.
- `PRODUCTION_URL`: The whitelisted domain for CORS in production.
- `VITE_API_URL`: The URL for the backend API, used by the frontend.
- `PORT`: The port number for the server (defaults to 3001).

### Health Check Endpoint

- **What it is:** A simple endpoint (`/health`) that returns the server status and current timestamp.
- **Purpose:** Used for monitoring and load balancer health checks in production environments.
- **Response:** `{ "status": "ok", "timestamp": "..." }`

## ⚙️ Deployment Security

### Production Build

- **Frontend**: The `npm run build` command creates an optimized, minified production build of the React application in the `dist` folder.
- **Backend**: The Express server is configured to serve these static assets efficiently in production mode.

### Static File Serving

- **Configuration**: In production (`NODE_ENV=production`), the server uses `express.static` to serve files from the `dist` directory.
- **Fallback**: A catch-all route (`*`) ensures that React Router handles client-side routing correctly by serving `index.html` for unknown routes.
- **Trust Proxy**: The `trust proxy` setting is enabled in production to ensure rate limiting works correctly behind reverse proxies (like Nginx or Heroku).

### 8. Project Import/Export Security

- **What it is:** Users can export projects as ZIP files containing all project source files and metadata, and import them into different installations.
- **Why it's important:** Import functionality accepts ZIP files from external sources, which introduces security risks if not properly validated and isolated.

#### Security Risks

**1. File Upload Validation**

- Malicious ZIP files could contain:
  - Path traversal attacks (`../` sequences) to write files outside the project directory
  - Extremely large files causing disk space exhaustion
  - Malformed ZIP structures causing denial of service
  - Executable files that could be executed if extracted incorrectly

**2. Content Validation**

- Imported projects may contain:
  - Malicious Liquid template code in widget files
  - Malicious JavaScript in custom theme settings
  - Corrupted JSON files causing application errors
  - Invalid file names with special characters

**3. Resource Exhaustion**

- Large ZIP files or many files could:
  - Exhaust available disk space
  - Cause memory issues during extraction
  - Take excessive time to process, blocking other requests

#### Mitigation Strategies

**1. File Upload Validation**

- **MIME Type Validation**: Validate ZIP file type using both MIME type (`application/zip`, `application/x-zip-compressed`) and file extension (`.zip`)
- **File Size Limits**: Enforce maximum ZIP file size (500MB) using multer limits
- **Path Traversal Protection**:
  - Extract to temporary directory first
  - Validate all file paths before copying to project directory
  - Use `path.resolve()` and check that resolved paths stay within allowed directories
  - Reject any paths containing `..` sequences or absolute paths
- **File Name Sanitization**:
  - Validate file names to prevent special characters that could cause issues
  - Reject file names with null bytes, control characters, or reserved names

**2. Import Isolation**

- **Temporary Extraction**: Extract ZIP to isolated temporary directory first
- **Validation Before Copy**: Validate all files and structure before copying to project directory
- **FolderName Sanitization**: Generate new folderName from project name using `slugify()` to prevent directory traversal
- **New UUID Generation**: Always generate new project UUID on import to prevent ID conflicts and ensure isolation

**3. Content Validation**

- **Manifest Validation**: Require and validate `project-export.json` manifest file
- **JSON Structure Validation**: Validate JSON structure of all JSON files during import
- **Theme Verification**: Verify that the project's theme exists in the target installation before import
- **File Type Validation**: Only allow expected file types (JSON, Liquid, CSS, JS, images, videos, audio)

**4. Resource Limits**

- **ZIP Size Limits**: Maximum 500MB per ZIP file
- **File Count Limits**: Consider limiting the number of files in a ZIP (currently unlimited, but monitored)
- **Timeout Protection**: Set reasonable timeouts for import operations
- **Disk Space Checks**: Verify sufficient disk space before starting import

**5. Error Handling**

- **Cleanup on Failure**: Always clean up temporary files and partial project directories on import failure
- **Graceful Degradation**: Return clear error messages without exposing internal paths or system details
- **Transaction-like Behavior**: Import should be atomic - either fully succeeds or fully fails with cleanup

#### Implementation Details

**Backend (`server/controllers/projectController.js`):**

- Uses `multer` with memory storage and 500MB file size limit
- Validates ZIP structure and manifest before extraction
- Extracts to temporary directory (`data/temp/import-{timestamp}/`)
- Validates all file paths using `path.resolve()` and directory checks
- Generates new UUID and folderName for imported project
- Cleans up temporary files on both success and failure

**Frontend (`src/components/projects/ProjectImportModal.jsx`):**

- Validates file type before upload (ZIP extension and MIME type)
- Shows clear error messages for validation failures
- Provides upload progress feedback

#### Best Practices for Users

1. **Source Verification**: Only import projects from trusted sources
2. **Backup Before Import**: Maintain backups before importing projects
3. **Review Imported Content**: Review imported project files, especially custom widgets and theme settings
4. **Theme Compatibility**: Ensure required themes are installed before importing projects

#### Future Considerations

If the application evolves to support public project sharing or marketplaces:

- Implement digital signatures for verified project exports
- Add project export format versioning with migration paths
- Implement content scanning for known malicious patterns
- Add project reputation/rating system
- Implement sandboxed import environment for untrusted sources

---

**See also:**

- [Media Library](core-media.md) - SVG sanitization in media uploads
- [Custom Hooks](core-hooks.md) - Client-side sanitization in `useMediaUpload`

---

## Security Review Addendum (2026-02-12)

This section was added after an additional codebase security review, and is intentionally separated from the original document.

### Recommended Changes (Prioritized)

1. **Fix path boundary checks for export file access**
   - Current checks in `server/routes/export.js` and `server/controllers/exportController.js` use `startsWith` on resolved paths.
   - This pattern can be bypassed in edge cases where sibling directories share the same prefix.
   - Recommendation: use `path.relative(allowedBase, target)` and reject when the result starts with `..` or is absolute.

2. **Avoid in-memory ZIP buffering for imports/uploads**
   - `multer.memoryStorage()` is currently used for large ZIP payloads in project/theme upload flows.
   - Even for local use, large imports can cause high memory spikes and unstable behavior.
   - Recommendation: switch ZIP handling to disk-backed temp storage plus strict size limits and cleanup.

3. **Keep current permissive CORS/CSP for local-only mode, but document production defaults**
   - Current settings are acceptable for local development workflows.
   - Recommendation: add environment-based branching so production defaults are strict (CORS allowlist, stronger Helmet/CSP policy), while local mode remains flexible.

### Scope Note (Current Project Context)

- Because this app is currently local-only, the highest-value immediate work is correctness and resilience:
  - Path validation hardening
  - Upload memory safety
- Internet-facing controls (auth model, strict CORS/CSP policy, multi-tenant hardening) can be deferred until remote hosting is introduced.

### Accuracy Pass (2026-02-12)

The items below map specific existing text to recommended replacements so the document stays aligned with the current codebase.

1. Section: HTTP Security Headers — **DONE** (updated to reflect helmet implementation with full config details including referrerPolicy and crossOriginOpenerPolicy)

2. Section: CORS implementation wording — **DONE** (updated to mention PREVIEW_ISOLATION allowlist mode)

3. Section: Environment variables
   - Current text location: `docs-llms/core-security.md:149` to `docs-llms/core-security.md:152`
   - Status: Update needed (variable mismatch)
   - Recommended replacement text:
     - `- \`NODE_ENV\`: Controls whether the application runs in \`development\` or \`production\` mode.`
     - `- \`PORT\`: The port number for the server (defaults to 3001).`
     - `- \`VITE_API_URL\`: The backend API base URL used by the frontend.`
     - `- \`SERVER_URL\`: The server's own base URL used when generating runtime/preview URLs.`
     - `- Note: \`PRODUCTION_URL\` is not currently used by the active server CORS configuration.`

4. Section: Path traversal protection wording in import/export
   - Current text location: `docs-llms/core-security.md:212` to `docs-llms/core-security.md:213`
   - Status: Update needed (implementation detail too generic)
   - Recommended replacement text:
     - `- Use \`path.resolve()\` + \`path.relative()\` boundary checks for all file/directory access validation.`
     - `- Reject when \`relativePath.startsWith("..")\` or \`path.isAbsolute(relativePath)\`.`
     - `- Avoid prefix-only checks such as \`startsWith(basePath)\`, which can be bypassed by similarly-prefixed sibling paths.`

5. Section: Import backend implementation details
   - Current text location: `docs-llms/core-security.md:249`
   - Status: Accurate but risk should be explicit
   - Recommended replacement text:
     - `- Uses \`multer\` with memory storage and a configurable size limit (default 500MB).`
     - `- Note: memory storage is acceptable for local workflows but can cause high RAM usage for large ZIP imports; disk-backed temp storage is recommended for robustness.`

6. Section: Deployment assumptions
   - Current text location: `docs-llms/core-security.md:160` onward
   - Status: Mostly accurate, but assumption should be explicit
   - Recommended replacement text:
     - `- This deployment section describes production behavior, but the current project is intended for local-only use by default.`
     - `- If remote/public deployment is introduced, tighten CORS policy, revisit CSP strategy for preview/runtime, and add authentication and role-based authorization before exposure.`
