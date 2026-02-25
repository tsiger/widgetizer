# Changelog

## [0.9.4] - 2026-02-25

### Added

- Hosted publish flow, including publisher client integration and UI actions in Export
- Multi-user hosted scoping for projects, themes, exports, and app settings
- Global hosted limits with route-level enforcement and dedicated limit/clamping tests
- Client-side media upload size validation for image/audio/video inputs
- Widget editor lifecycle events exposed in preview runtime for theme authors
- Initial automated test infrastructure with broad unit/server coverage expansions
- `sqlite3` rebuild support on development machines

### Changed

- BREAKING: storage layer migrated to SQLite-only; legacy JSON-backed persistence removed
- Project/media data handling and repository behavior improved for hosted mode consistency
- Page editor and selection overlay behavior improved in preview/edit flows
- Form UX improvements across page, menu, project, and settings forms
- Publish flow hardened so publish actions do not create export entries
- Active project resolution/checking improved in hosted mode
- Beta testing tooling and documentation significantly expanded/updated
- Documentation refreshed across architecture, database, media, security, presets, and editor lifecycle areas

### Fixed

- Publish error reporting/messages improved in backend and UI
- Request sanitization strengthened across media, menu, page, project, and theme endpoints

### Security

- Bumped `minimatch` dependency (Dependabot)

## [0.9.3] - 2026-02-14

### Added

- Global widgets (header/footer) can now host blocks
- `maxBlocks` property to limit the number of blocks a widget can contain
- Theme presets system for quick theme configuration
- Responsive image support
- Media usage tracking in theme settings (e.g. favicon)
- Richtext UL and OL (list) support
- Comprehensive backend test suite (page CRUD, project, and tag tests)

### Changed

- Electron server process refactored to use `utilityProcess`
- Tests reorganized into logical groups

### Fixed

- ESLint generator function errors in core tag
- SEO tag now handles image paths correctly

### Security

- Bumped `qs` and `markdown-it` dependencies

## [0.9.2] - 2026-02-07

### Added

- Helmet security middleware for HTTP headers
- HTML sanitization for widget content (DOMPurify + LiquidJS auto-escape)

### Fixed

- Media usage now tracked correctly for SEO images (og_image) on page create/update
- Media library UI now refreshes after saving pages with SEO images

## [0.9.1] - 2026-2-06

## Added

- Theme deletion functionality
- Theme-defined image sizes
- Enable Markdown export for pages

## Changed

- Refactor theme asset handling with Liquid tags

## [0.9.0] - 2026-02-02

### Changed

- Arch's widgets: Convert textareas to richtext setting type where appropriate.

### Improved

- SelectionOverlay: Improved some selection logic.
- Arch theme: Feature list formatting with icons
- Arch theme: Comparison table widget
