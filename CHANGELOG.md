# Changelog

## [Unreleased]

### Changed

- Responsive image delivery now treats the `large` variant as the public ceiling when available, while still falling back to the original when no `large` variant exists
- Export documentation now reflects usage-aware media copying, `thumb` exclusion, and flattened widget asset behavior
- Arch theme documentation now covers the new `standard-accent` and `highlight-accent` color schemes
- Arch widget documentation now covers per-widget `top_spacing` / `bottom_spacing` controls and the shared spacing override classes

## [0.9.7] - 2026-03-26

### Added

- 6 new widgets for the Arch theme: Action Bar, Contact Details, Checkerboard, Sliding Panels, Steps, and Testimonial Slider

### Changed

- Arch theme translations were consolidated and aligned across all supported languages
- Theme and app locale files were refactored and cleaned up
- Minor theme/editor polish and release housekeeping for `0.9.7`

### Fixed

- Windows media handling for `.webp` uploads
- Windows media handling for `.gif` uploads
- Leftover locale inconsistencies and minor theme metadata issues

## [0.9.6] - 2026-03-24

### Added

- 7 new widgets: Split Content (with sticky option), Video Popup, Gallery variants, Scrolling Text, Numbered Service List, Team Highlight, Key Figures
- Theme localization (i18n) for widget schemas and global settings
- Theme-level modifiers (style modifiers applied across widgets)
- Icon modifiers for widget elements
- Responsive images (`srcset`) rolled out to all applicable widgets
- Carousel/slider layout for card-based widgets
- Improved typography selection in theme settings
- 20+ new theme presets
- Per-page transparent header option
- Asset enqueue system with theme-level resolution

### Changed

- Theme settings panel reorganized
- Header/footer block rendering improved
- Preview updates live on theme settings change
- Theme sync script improved
- Media-by-ID operations no longer scoped to a single project
- Audio/video file uploads no longer allowed
- Contact form widget removed from OSS edition

### Fixed

- Widget display names corrected
- Minor Arch theme styling issues
- Media handling improvements

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
