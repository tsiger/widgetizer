# Widgetizer

Visual website builder with theme support. Runs as an Electron desktop app or as a web app (Express backend + React frontend).

## Quick Reference

```bash
npm run dev:all        # Start backend + frontend together
npm run server         # Backend only (port 3001, nodemon)
npm run dev            # Frontend only (port 3000, Vite)
npm run build          # Production frontend build
npm test               # Run backend tests (Node test runner)
npm run test:verbose   # Tests with full output
npm run lint           # Lint src/ and server/
npm run electron:dev   # Full Electron dev mode
```

## Architecture

- **No database** — all content stored as JSON files under `data/`
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
  middleware/            # Error handler, rate limiters
  tests/                # Node test runner test files (*.test.js)
  utils/                # Helpers (HTML processing, semver, etc.)
themes/                 # Theme definitions (templates, widgets, assets)
electron/               # Electron main process + preload
data/                   # Runtime data (gitignored)
  projects/<folder>/    # Per-project content
    pages/*.json        # Page content
    uploads/media.json  # Media metadata with usage tracking
    pages/global/       # header.json, footer.json (global widgets)
```

## Key Concepts

### Content Model
- Pages are JSON files at `data/projects/<folder>/pages/<slug>.json`
- Global widgets (header/footer) live at `pages/global/header.json` and `footer.json`
- Media metadata in `data/projects/<folder>/uploads/media.json` with `usedIn` arrays tracking which pages reference each file

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
- `mediaController.js` uses write locks (Map-based) for serializing writes to `media.json`
- `mediaUsageService.js` handles atomic read-modify-write for media usage tracking

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

## Important Patterns

- ES modules throughout (`"type": "module"` in package.json)
- Vite dev server on port 3000, Express API on port 3001
- `data/` directory is gitignored except for the `projects/` directory structure
- Theme widgets define their schema in `schema.json` and template in `widget.liquid`
