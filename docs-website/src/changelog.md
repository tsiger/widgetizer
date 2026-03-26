---
description: Release notes and version history for Widgetizer. See what's new in each release.
---

# Changelog

All notable changes to Widgetizer are documented here.

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
