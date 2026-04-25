# Changelog

## [0.9.8] - 2026-04-25 (Pending release)

### Added

- 29 new Arch theme presets, each shipping with full template content, menus, and curated screenshots: Brewline, Brightside, Clearpath, Codebase, Corkwell, Crumbly, Everafter, Framelight, Greenfield, Greystone, Hearthstone, Inkwell, Ironform, Keystoned, Ledgerworks, Little Oaks, Olympic, Pawlish, Petalry, Pipeworks, Pixelcraft, Saffron, Shearline, Sparkhaus, Stillpoint, Tailside, Torque, Uplink, and Velvet Touch (plus a refreshed default Arch preset)
- New Arch widgets: PDF Viewer and Class Schedule
- Embed widget gained background image and overlay settings
- Footer widget gained a Badges block and a richtext copyright field
- Per-widget `top_spacing` / `bottom_spacing` controls with intermediate spacing values across all widgets
- Two new color schemes: `standard-accent` and `highlight-accent`
- Heading alignment setting available across widgets
- Eyebrow uppercase setting
- Footer layout variations
- Active menu item styles in navigation
- Carousel arrows now reveal on hover
- File input setting type and updated documentation for it
- Project-specific theme locale resolution (presets can ship their own locale data)
- Markdown alternate output during site export when `.md` generation is enabled
- Site title is now included in project export metadata
- Update badge surfacing theme update availability
- Debug state panel (development environment) for inspecting frontend stores
- Test coverage expansion: API fetch, async request gating, project switch coordinator, upload request, widget store helpers, theme store, project/media/theme query managers, copy-name sort, upload feedback/validation, update status helpers, infrastructure, and media usage tests
- Image generation and optimization scripts, hero mosaic renderer, and a preset-sync workflow with its own test suite

### Changed

- Responsive image delivery now treats the `large` variant as the public ceiling when available, while still falling back to the original when no `large` variant exists
- Image rendering and responsive image sizes overhauled across widgets; ImageInput component standardized for aspect ratio and styling
- Slideshow rendering improved
- Mobile menu and mobile menu button reworked
- Lightbox mobile rendering corrected
- Steps widget alignment on mobile fixed
- Timeline widget numbers now follow the theme `shapes` setting
- Scheduled Table widget can now disable highlighting of the current day
- Transparent header behavior improved
- Map widget polish and broader common-locale coverage
- Email setting now renders as an email link rather than a generic URL
- Color schemes refined and renamed for consistency
- Theme settings management unified into a central `themeStore`
- Date formatting unified through a shared `useFormatDate()` hook; default date/time format updated
- API response handling refactored and media usage tracking centralized
- Theme metadata source normalized
- Project-switch orchestration centralized with immediate state clearing and store resets
- Identifier generation and slug sanitization standardized via shared helpers
- Semver update-status logic moved into a shared utility
- Widget store split into testable pure helpers
- Form and list page patterns standardized via shared hooks (`useGuardedFormPage`, `useConfirmationAction`)
- Query caching and standardized async request protection rolled out across managers
- Project import flow and UI reworked
- Media selector drawer, media management UI, and media uploads improved
- Widget settings panel reorganized
- Widget drag-and-drop refined
- Custom CSS / JS fields in the editor improved (CodeInput overhaul)
- Themes and preview UI polished; preview button reworked; preview updates more reliable
- Toolbar buttons streamlined; toast position and styling improved
- Item duplication and sorting improved across Projects, Menus, and Pages
- Action sets streamlined for Projects, Menus, and Pages
- Favicon and list UI polish
- Project backup and site export terminology standardized
- Translations consolidated; locale files cleaned up; missing translation keys filled in
- Documentation refreshed across architecture, export, media, theming, preset format, preset generator/process, and editor docs
- Export documentation now reflects usage-aware media copying, `thumb` exclusion, and flattened widget asset behavior
- Arch theme documentation now covers the new `standard-accent` and `highlight-accent` color schemes
- Arch widget documentation now covers per-widget `top_spacing` / `bottom_spacing` controls and the shared spacing override classes
- Live demo URLs updated
- README, logos, and brand assets refreshed
- Electron build pipeline cleaned up (consolidated under `electron/`, dedicated builder config, prepare-mac-sharp script renamed)
- Dependencies upgraded

### Fixed

- Lightbox mobile rendering issue
- Steps widget alignment issues on mobile
- Missing translation keys
- Minor linting issues
- Various smaller widget and editor fixes

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
