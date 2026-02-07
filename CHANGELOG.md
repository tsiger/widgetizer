# Changelog

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
