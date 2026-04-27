---
description: Release notes and version history for Widgetizer. See what's new in each release.
---

# Changelog

All notable changes to Widgetizer are documented here.

## 0.9.8 - 2026-04-26

### New Theme Presets

29 new Arch presets, each with full template content, menus, and curated screenshots. Pick a preset on theme install to scaffold a complete site:

- **Brewline** — Coffee shop / cafe
- **Brightside** — Dental practice
- **Clearpath** — Consulting / professional services
- **Codebase** — Software agency / dev studio
- **Corkwell** — Wine bar / restaurant
- **Crumbly** — Bakery
- **Everafter** — Wedding photographer / event services
- **Framelight** — Photography portfolio
- **Greenfield** — Landscaping / outdoor services
- **Greystone** — Architecture / construction
- **Hearthstone** — Boutique inn / hospitality
- **Inkwell** — Tattoo studio
- **Ironform** — Fitness / gym
- **Keystoned** — Real estate / property
- **Ledgerworks** — Accounting / financial services
- **Little Oaks** — School / childcare
- **Olympic** — Sports club
- **Pawlish** — Pet grooming / vet
- **Petalry** — Florist
- **Pipeworks** — Trades / plumbing
- **Pixelcraft** — Creative / digital agency
- **Saffron** — Restaurant
- **Shearline** — Barber / salon
- **Sparkhaus** — Electrician / home services
- **Stillpoint** — Yoga / wellness studio
- **Tailside** — Pet services
- **Torque** — Auto shop / mechanics
- **Uplink** — SaaS / tech startup
- **Velvet Touch** — Beauty / spa

Plus a refreshed default **Arch** preset.

### New Widgets

- **PDF Viewer** — Embed a PDF document inline
- **Class Schedule** — Weekly class / session timetable

### Added

- **Embed widget background & overlay** — Add a background image and overlay to embed widgets for richer hero/section embeds
- **Footer Badges block** — Display certification, payment, and trust badges in the footer
- **Footer copyright is now richtext** — Inline links and basic formatting in the footer copyright line
- **Footer layout variations** — Multiple footer arrangements
- **Per-widget spacing controls** — `top_spacing` / `bottom_spacing` per widget with intermediate values, plus shared `spacing-top-none` / `spacing-bottom-none` overrides
- **Heading alignment** — New alignment setting available across widgets
- **Two new color schemes** — `standard-accent` and `highlight-accent`, complementing the existing `standard` and `highlight`
- **Eyebrow uppercase setting** — Toggle uppercase styling on widget eyebrows
- **Active menu item styles** — Visual treatment for the current page in navigation
- **Carousel arrows on hover** — Slider arrows reveal on hover for cleaner card layouts
- **File input setting type** — A dedicated setting type for file uploads in theme schemas (documented in Setting Types)
- **Project-specific theme locales** — Themes (and presets) can now ship locale data scoped per project, with locale resolution honoring preset overrides
- **Markdown alternate output during export** — When `.md` generation is enabled, exports include Markdown alternates alongside HTML
- **Site title in project export** — Exported project archives include site title metadata
- **Theme update badge** — Surfaces theme update availability in the editor
- **Debug state panel** — Development-only panel for inspecting frontend stores

### Changed

- **Responsive image delivery refined** — `srcset` and export behavior now treat the `large` variant as the public delivery ceiling when it exists, while still falling back to the original when no `large` variant is available
- **Image rendering overhaul** — Image rendering and responsive image sizes reworked across widgets; ImageInput component standardized for aspect ratio and styling
- **Slideshow improvements** — Cleaner slideshow rendering and behavior
- **Mobile menu rework** — Mobile menu and toggle button polished
- **Lightbox mobile fix** — Lightbox now renders correctly on mobile
- **Steps widget mobile alignment** — Fixed layout on small screens
- **Timeline widget shapes** — Number markers now follow the theme `shapes` setting
- **Scheduled Table** — Optional setting to disable highlighting of the current day
- **Transparent header** — Improved behavior and presentation
- **Map widget** — Polish and broader common-locale coverage
- **Email setting** — Renders as an email link rather than a generic URL
- **Color scheme renames** — Schemes renamed for consistency across themes
- **Date/time formatting** — Default date/time format updated; formatting unified through a shared hook
- **Project import flow** — Reworked import UI and flow for clearer step-by-step setup
- **Media management** — Improved media selector drawer, media management UI, and uploads
- **Widget settings panel** — Reorganized for better discoverability
- **Widget drag-and-drop** — Refined drag/drop interactions
- **Custom CSS / JS editor** — CodeInput overhaul with better syntax handling
- **Themes & preview UI** — Polished themes page, preview button, and live preview reliability
- **Toolbar & toasts** — Streamlined toolbar buttons; improved toast position and styling
- **Item duplication & sorting** — Better behavior across Projects, Menus, and Pages
- **Action sets streamlined** — Consistent action menus across Projects, Menus, and Pages
- **Favicon & list UI polish**
- **Project backup vs site export terminology** — Clearer naming across the UI
- **Translations** — Consolidated translations and filled in missing keys; locale files cleaned up
- **Live demo URLs** — Updated to reflect current hosted demos

### Fixed

- Lightbox mobile rendering issue
- Steps widget alignment on mobile
- Missing translation keys
- Various minor widget and editor fixes

### Documentation

- **Color schemes** — Widget docs now cover `standard-accent` and `highlight-accent` alongside the existing `standard` and `highlight`
- **Spacing controls** — Theme dev docs now cover `top_spacing` / `bottom_spacing` and the shared `spacing-top-none` / `spacing-bottom-none` class overrides
- **Export** — Docs reflect usage-aware media copying, `thumb` exclusion, flattened widget assets, and Markdown alternate output
- **File input type** — Setting Types docs now document the file input
- **Themes** — Themes page lists the expanded preset library

## 0.9.7 - 2026-03-26

### New Widgets

- **Action Bar** — Compact CTA strip for announcements, offers, and quick actions
- **Contact Details** — Structured business contact information with icons and links
- **Checkerboard** — Alternating content layout for visual variety across sections
- **Sliding Panels** — Panel-based layout with interactive transitions
- **Steps** — Sequential process/timeline presentation with stronger visual hierarchy
- **Testimonial Slider** — Rotating testimonial carousel with dedicated slider behavior

### Changed

- **Translation consolidation** — Arch theme translations were reorganized and aligned across all supported languages
- **Locale cleanup** — App and theme locale files were refactored and cleaned up for consistency
- **Minor polish** — Small theme/editor refinements and release housekeeping for `0.9.7`

### Fixed

- **Windows media uploads** — `.webp` files now handle correctly on Windows
- **Windows media uploads** — `.gif` files now handle correctly on Windows
- **Locale/theme cleanup** — Leftover locale inconsistencies and minor theme metadata issues resolved

## 0.9.6 - 2026-03-24

### New Widgets

- **Split Content** — Side-by-side layout with optional sticky content
- **Video Popup** — Inline video trigger with lightbox playback
- **Gallery** — New gallery widget variants
- **Scrolling Text** — Horizontal scrolling text/marquee
- **Numbered Service List** — Services displayed with step numbers
- **Team Highlight** — Showcase team members
- **Key Figures** — Animated statistics and counters

### Added

- **Theme localization** — Full i18n support for widget schemas and global settings, with translation files
- **Theme-level modifiers** — Define style modifiers (e.g. rounded corners, shadows) at the theme level and apply them across widgets
- **Icon modifiers** — Attach icon styles to widget elements
- **Responsive images everywhere** — Rolled out `srcset` support to all applicable widgets via the image tag
- **Carousel layout** — Card-based widgets can now use a carousel/slider layout
- **Typography selection** — Improved font and typography picker in theme settings
- **20+ theme presets** — Large expansion of ready-made theme configurations
- **Transparent header** — Per-page option for transparent/overlay navigation headers
- **Asset enqueue system** — Theme-level asset resolution for JS dependencies (e.g. carousel scripts)

### Changed

- Theme settings panel reorganized and improved
- Header/footer block rendering improved
- Preview now updates live when theme settings change
- Theme sync script improved
- Media-by-ID operations no longer scoped to a single project
- Audio and video file uploads are no longer allowed
- Contact form widget removed from OSS edition

### Fixed

- Widget display names corrected across the board
- Minor Arch theme styling issues resolved
- Media handling improvements


## 0.9.4 - 2026-02-25

### Added

- Hosted publish flow with publisher client integration
- Multi-user scoping for projects, themes, exports, and settings
- Global hosted limits with route-level enforcement
- Client-side media upload size validation
- Widget editor lifecycle events for theme authors
- Automated test infrastructure with broad coverage

### Changed

- **Breaking:** Storage layer migrated to SQLite-only; legacy JSON persistence removed
- Page editor and selection overlay behavior improved
- Form UX improvements across page, menu, project, and settings
- Publish flow hardened (publish actions no longer create export entries)

### Fixed

- Publish error reporting improved
- Request sanitization strengthened across all endpoints


## 0.9.3 - 2026-02-14

### Added

- Global widgets (header/footer) can now host blocks
- `maxBlocks` property to limit blocks per widget
- Theme presets system
- Responsive image support
- Media usage tracking in theme settings
- Richtext list (UL/OL) support
- Comprehensive backend test suite

### Changed

- Electron server refactored to use `utilityProcess`

### Fixed

- ESLint generator function errors in core tag
- SEO tag image path handling


## 0.9.2 - 2026-02-07

### Added

- Helmet security middleware for HTTP headers
- HTML sanitization (DOMPurify + LiquidJS auto-escape)

### Fixed

- Media usage tracking for SEO images
- Media library refresh after saving pages with SEO images


## 0.9.1 - 2026-02-06

### Added

- Theme deletion
- Theme-defined image sizes
- Markdown export for pages

### Changed

- Theme asset handling refactored with Liquid tags


## 0.9.0 - 2026-02-02

### Changed

- Widget textareas converted to richtext where appropriate
- Selection overlay logic improved
- Arch theme: feature list formatting with icons
- Arch theme: comparison table widget
