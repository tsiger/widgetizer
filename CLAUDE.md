# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Widgetizer

Visual website builder with theme support. Runs as an Electron desktop app or as a web app (Express backend + React frontend).

## Deep-dive docs

Before tackling non-trivial work in an unfamiliar area, skim the relevant file under `docs-llms/` — it contains LLM-targeted reference docs maintained alongside the code. Start at `docs-llms/documentation-index.md`. Notable entries: `core-architecture.md`, `core-security.md`, `core-pages.md`, `core-page-editor.md`, `core-widgets.md`, `core-collections.md`, `core-themes.md`, `core-media.md`, `core-export.md`, `core-database.md`, `core-design-system.md`, `core-project-id-architecture.md`, `theming.md`, `theming-widgets.md`, `theming-setting-types.md`.

## Quick Reference

```bash
npm run dev:all                    # Start backend + frontend together
npm run server                     # Backend only (port 3001, nodemon)
npm run dev                        # Frontend only (port 3000, Vite)
npm run build                      # Production frontend build
npm test                           # Run backend tests (Node test runner)
npm run test:verbose               # Tests with full output
npm run test:frontend              # Run frontend tests (Vitest, one-shot)
npm run lint                       # Lint src/ and server/
npm run electron:dev               # Full Electron dev mode
npm run electron:build:mac         # Build Mac installer (signed)
npm run electron:build:win         # Build Windows installer (signed, run on Windows)
npm run theme:sync -- --project <name>   # Watch themes/ → data/projects/<name>
npm run preset:sync -- --project <name>  # Watch theme presets → project data
npm run validate:all-locales       # Validate frontend + theme locale files
```

### Running a single test

```bash
# Backend (Node test runner): pass a single file or glob
node --test --test-reporter ./server/tests/reporter.js server/tests/<file>.test.js
# Filter by test name pattern (Node test runner)
node --test --test-name-pattern "<substring>" server/tests/<file>.test.js
# Frontend (Vitest): filter by test name or pass a file
npx vitest run -t "<name>" [path/to/file.test.js]
```

## Architecture

- **Hybrid storage** — SQLite (`data/widgetizer.db`) for metadata (projects, media metadata/usage, app settings, export history); filesystem for content (page/menu/global JSON, theme files, uploaded binaries)
- **Frontend**: React 19, Zustand (state), React Query, Tailwind CSS 4, Vite 7
- **Backend**: Express 5 (ES modules), LiquidJS templates, Sharp for images
- **Electron**: Optional desktop wrapper (`electron/main.js`)
- **Node**: Requires >=20.19.5

### Directory Layout

```
src/                    # React frontend
  components/           # UI components (JSX)
  stores/               # Zustand stores (saveStore, pageStore, widgetStore, etc.)
  pages/                # Route-level page components
  hooks/                # Custom React hooks
  core/                 # Core widgets and filters shared with backend
  config/               # Frontend config
server/                 # Express backend
  controllers/          # Route handlers
  services/             # Business logic (rendering, sanitization, media usage)
  routes/               # Express route definitions
  middleware/            # Error handler, JSON body parsers
  db/                   # SQLite init, migrations, repositories
  tests/                # Node test runner test files (*.test.js)
  utils/                # Helpers (HTML processing, semver, etc.)
themes/                 # Theme definitions (templates, widgets, assets)
electron/               # Electron main process + preload
data/                   # Runtime data (gitignored)
  widgetizer.db         # SQLite database (metadata)
  projects/<folder>/    # Per-project content
    pages/*.json        # Page content
    uploads/            # Media binaries (images/)
    pages/global/       # header.json, footer.json (global widgets)
```

## Key Concepts

### Content Model

- **SQLite metadata**: projects, media metadata/usage, app settings, export history (`data/widgetizer.db`)
- **Filesystem content**: pages (`data/projects/<folder>/pages/<slug>.json`), global widgets (`pages/global/header.json`, `footer.json`), menus, theme files, uploaded binaries
- Repository layer in `server/db/repositories/` (project, media, settings, export)
- Controllers use granular repository functions directly (e.g., `projectRepo.getProjectById()`, `mediaRepo.getMediaFiles()`)

### Rendering Pipeline

- LiquidJS with `outputEscape: "escape"` (autoescape enabled globally)
- `| raw` filter required for: richtext output, SVG icons, embed code, layout variables (`{{ header | raw }}`, `{{ main_content | raw }}`, `{{ footer | raw }}`)
- Widget schema field types: `text`/`textarea` (auto-escaped), `richtext` (DOMPurify + `| raw`), `code` (intentionally unescaped)

### Sanitization (3-layer defense)

1. LiquidJS autoescape on all `{{ }}` output by default
2. DOMPurify sanitizes richtext before `| raw` rendering
3. Helmet security headers

### Save Flow

- `saveStore.js` orchestrates parallel saves of page content, global widgets, and theme settings
- Media metadata updates go through SQLite transactions (via `mediaRepository`)
- `mediaUsageService.js` handles media usage tracking updates in SQLite

## Testing

Tests use Node's built-in test runner with a custom reporter (`server/tests/reporter.js`).

```bash
npm test                # All backend tests
npm run test:verbose    # Full output
```

Test files are at `server/tests/*.test.js`.

## Linting

ESLint 9 flat config with separate rule sets for `src/` (React), `server/` (Node), and `electron/`.

```bash
npm run lint            # src/ + server/
npm run lint:electron   # electron/ only
npm run lint:all        # Everything
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

Note: the `preelectron:dev` npm lifecycle hook runs automatically before `electron:dev`, rebuilding `better-sqlite3` for the installed Electron runtime and validating locales. No need to run those by hand.

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
- Config in `package.json` under `build.publish` (provider: github, owner: tsiger, repo: widgetizer)

## Important Patterns

- ES modules throughout (`"type": "module"` in package.json)
- Vite dev server on port 3000, Express API on port 3001; `npm run dev:all` starts the backend, then `dev:frontend` waits on `http://localhost:3001/health` before launching Vite — if Vite never starts, the API isn't up yet
- `data/` directory is gitignored except for the `projects/` directory structure
- Theme widgets define their schema in `schema.json` and template in `widget.liquid`
- The `predev:all` and `preelectron:dev` lifecycle hooks rebuild `better-sqlite3` and run locale validation; do not bypass them by invoking `vite`/`electron` directly
- `AGENTS.md` mirrors this file for non-Claude agents — keep edits in sync when changing project-wide guidance
