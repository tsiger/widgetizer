# Widgetizer

Visual website builder with theme support. Runs as an Electron desktop app or as a web app (Express backend + React frontend).

> **Architecture note.** The codebase has been refactored from the old monolith (`src/` frontend + `server/` backend) into **npm-workspace packages behind adapter contracts**, so the backend can be embedded in a multi-tenant host (Widgetizer Hosted) without forking. The authoritative maps are `docs-llms/core-architecture.md` (orientation) and `docs-llms/core-packages.md` (adapters / DI / `Scope` / `LIMIT_KEYS`).

## Quick Reference

```bash
npm run dev:all                    # Start backend + frontend together
npm run server                     # Backend only (port 3001, nodemon server.js)
npm run dev                        # Frontend only (port 3000, Vite)
npm run build                      # Production frontend build
npm test                           # Backend tests — builder-server (Node test runner)
npm run test:frontend              # Frontend/package tests (Vitest)
npm run lint:all                   # Lint everything (eslint .)
npm run electron:dev               # Full Electron dev mode
npm run electron:build:mac         # Build Mac installer (signed)
npm run electron:build:win         # Build Windows installer (signed, run on Windows)
npm run theme:sync                 # Sync themes/ → project data
npm run preset:sync                # Sync theme presets
```

## Architecture

- **Workspace packages** (`"workspaces": ["packages/*"]`): `@widgetizer/core` (shared FE/BE primitives + adapter contracts + error types + conformance suites), `@widgetizer/render-engine` (scope-free LiquidJS rendering over a `deps` bag — no project resolution/SQLite; reads templates/schemas from paths supplied in `deps`), `@widgetizer/builder-server` (Express 5 backend — routes/controllers/services/SQLite, **adapter-agnostic**), `@widgetizer/editor-ui` (mountable React editor), `@widgetizer/adapters-local` (OSS local-FS + SQLite adapter implementations).
- **Shells**: `app/` (OSS frontend + server assembly — `app/server-common.js` builds the local adapters and calls `createEditorApp({ adapters })`; `app/src/` is the FE entry/composition), `server.js` (repo-root web entry → `startOssServer`), `electron/` (desktop wrapper → `electron/main.js`).
- **Adapter contract**: the backend receives adapters by injection and is scope-first — every storage/asset/limits call takes a `scope` (`{ actor, projectId, folderName }`). `adapters-local` is consumed **only** by the OSS shells, never by `builder-server`; hosted swaps in cloud adapters. The `local/require-scope-arg` ESLint rule (in `eslint-rules/`) enforces the scope-first call shape.
- **Hybrid storage** — SQLite (`data/widgetizer.db`) for metadata (projects, media metadata/usage, app settings, export history); filesystem content is split between the `StorageAdapter` (page/menu/global JSON, theme files) and `AssetStorageAdapter` (uploaded binaries).
- **Frontend**: React 19, Zustand (state), Tailwind CSS 4, Vite 7.
- **Backend**: Express 5 (ES modules), LiquidJS templates, Sharp for images.
- **Node**: Requires >=20.19.5.

### Directory Layout

```
packages/               # npm-workspace packages (the app's code)
  core/                 # @widgetizer/core — shared primitives, adapter contracts, errors, conformance suites
  render-engine/        # @widgetizer/render-engine — scope-free LiquidJS render over a deps bag
  builder-server/       # @widgetizer/builder-server — Express backend (controllers/services/routes/db/tests)
    src/tests/          # Node test runner test files (*.test.js)
  editor-ui/            # @widgetizer/editor-ui — mountable React editor (components/pages/stores/hooks/queries)
  adapters-local/       # @widgetizer/adapters-local — OSS local-FS + SQLite adapters
app/                    # OSS shell: server-common.js (adapter assembly) + app/src/ (FE entry & route composition)
server.js               # Repo-root web-mode entry → startOssServer
src/                    # Residual pre-refactor assets still consumed at runtime (e.g. src/utils/previewRuntime.js)
electron/               # Electron main process + preload
themes/                 # Theme definitions (templates, widgets, assets, collection-types, presets, preset media)
scripts/                # theme/preset sync, preset-media packing, locale validation, electron build
eslint-rules/           # local ESLint rules (e.g. require-scope-arg)
data/                   # Runtime data (gitignored)
  widgetizer.db         # SQLite database (metadata)
  projects/<folder>/    # Per-project content
    pages/*.json        # Page content
    pages/global/       # header.json, footer.json (global widgets)
    collections/<type>/ # Collection item data (one JSON per item)
    uploads/            # Media binaries (images/, files/)
```

For the detailed file-by-file map (and the admin-shell vs site-workspace routing split), see `docs-llms/core-architecture.md`.

## Key Concepts

### Content Model

- **SQLite metadata**: projects, media metadata/usage, app settings, export history (`data/widgetizer.db`).
- **Filesystem content**: pages (`data/projects/<folder>/pages/<slug>.json`), global widgets (`pages/global/header.json`, `footer.json`), menus, collection items (`collections/<type>/<slug>.json`), and theme files through the storage adapter; uploaded binaries through the asset storage adapter.
- Repository layer in `packages/builder-server/src/db/repositories/` (project, media, settings, export).

### Rendering Pipeline

- `@widgetizer/render-engine` is a scope-free LiquidJS renderer: it imports no backend services and receives capability (collection loaders, schemas, link prefixing, filesystem paths for templates/schemas) through a `deps` bag supplied by the shell (`renderingService.buildRenderDeps` in OSS, `buildCloudRenderDeps` in hosted).
- LiquidJS runs with `outputEscape: "escape"` (autoescape enabled globally). `| raw` is required for richtext output, SVG icons, embed code, and layout variables (`{{ header | raw }}`, `{{ main_content | raw }}`, `{{ footer | raw }}`).
- Widget/field types: `text`/`textarea` (auto-escaped), `richtext` (DOMPurify + `| raw`), `code` (not sanitized; ordinary `{{ }}` output still autoescapes, so emit only through explicit raw/custom CSS/script sinks when intended). Item pages render at `slugPrefix/itemSlug/` depth via `outputPathPrefix` + `prefixInternalHref`.

### Sanitization & Safety

1. LiquidJS autoescape on all `{{ }}` output by default.
2. DOMPurify sanitizes richtext before `| raw` rendering.
3. URL/image hardening: `sanitizeHref` / `safe_url` filter + the `/uploads/images/…` image-path allowlist (see `docs-llms/core-security.md`).
4. Helmet security headers; the multi-tenant isolation contract (resolver authz, write-guard, `LIMIT_KEYS`) is the cross-tenant floor.

### Save Flow

- `saveStore` (editor-ui) orchestrates parallel saves of page content, global widgets, and theme settings.
- Media metadata updates go through SQLite transactions (via `mediaRepository`); `mediaUsageService` updates usage tracking.

## Testing

Backend tests use Node's built-in test runner with a custom reporter (`packages/builder-server/src/tests/reporter.js`); test files live at `packages/builder-server/src/tests/*.test.js`. Frontend/package tests use Vitest.

```bash
npm test                # Backend (builder-server) tests
npm run test:verbose    # Backend tests, full output
npm run test:frontend   # Vitest (editor-ui / core / render-engine)
```

## Linting

ESLint 9 flat config covering the packages, the shells, and electron, plus the local `require-scope-arg` rule.

```bash
npm run lint            # eslint src packages app server.js
npm run lint:electron   # electron/ only
npm run lint:all        # Everything (eslint .)
```

## Environment

Copy `.env.example` to `.env`. Key variables:

- `PORT` — Backend port (default 3001)
- `VITE_API_URL` — Frontend API base URL
- `SERVER_URL` — Server's self-referencing URL
- `NODE_ENV` — development/production

## Electron Desktop App

### Development

```bash
npm run electron:dev   # Starts Vite + Express + Electron together
```

Note: the `preelectron:dev` npm lifecycle hook runs automatically before `electron:dev`, rebuilding `better-sqlite3` for the local Node dev server and validating locales. Electron ABI rebuilds run during packaged builds in `scripts/build-electron.mjs`. No need to run those by hand.

### Server port (production)

The packaged app's bundled Express server asks the OS for an ephemeral port at bind time (`PORT=0`) and reports the actual port back to the Electron main process via a `{ type: "server-ready", port }` message on the `utilityProcess` IPC channel. The renderer URL is built from that reported port, so two packaged apps (or a packaged app alongside a dev server) never collide. Set the `PORT` env var to force a specific port when needed.

### Building Installers

Mac (run on Mac):
```bash
npm run electron:build:mac            # Signed + notarized (requires certs)
npm run electron:build:mac:unsigned   # Unsigned (local testing only)
```

Windows (run on Windows):
```bash
npm run electron:build:win            # Signed
npm run electron:build:win:unsigned   # Unsigned (local testing only)
```

Output goes to `dist-electron/`.

### Releasing a New Version

1. Bump `version` in `package.json`
2. Commit, tag, and push
3. Build Mac artifacts on Mac (`npm run electron:build:mac`)
4. Build Windows artifacts on Windows (`npm run electron:build:win`)
5. Create a GitHub release manually at `github.com/tsiger/widgetizer/releases`
6. Attach **all** of these files from `dist-electron/`:
   - Mac: `.dmg`, `.dmg.blockmap`, `.zip`, `.zip.blockmap`, `latest-mac.yml`
   - Windows: `.exe`, `.exe.blockmap`, `latest.yml`
7. The `latest-mac.yml` and `latest.yml` files are critical — electron-updater reads them to detect new versions. The `.blockmap` files enable delta updates.

### Auto-Updates

- electron-updater checks GitHub releases 10 seconds after app start
- Compares the running app version against `latest-mac.yml` / `latest.yml`
- If a newer version exists, the in-app update banner appears
- Update flow: detect → user clicks Update → download with progress → user clicks Restart Now → install
- Config in `electron/builder.config.mjs` under `publish` (provider: github, owner: tsiger, repo: widgetizer)

## Important Patterns

- ES modules throughout (`"type": "module"` in package.json)
- The backend is adapter-agnostic and scope-first — never build absolute paths from user input; go through the storage adapter with `scope`
- Vite dev server on port 3000, Express API on port 3001
- `data/` directory is gitignored except for the `projects/` directory structure
- Theme widgets define their schema in `schema.json` and template in `widget.liquid`; collection types in `themes/<theme>/collection-types/<type>/`
