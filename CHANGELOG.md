# Changelog

## [0.9.10] - 2026-10-22

### Multilingual Sites

A site can now be written in several languages. Each language has its own pages, collection items, menus, header, and footer, while media, theme, and business details are shared. Nothing is translated automatically. See [Languages](https://docs.widgetizer.org/languages.html).

- Over 70 site languages to choose from, including Brazilian Portuguese and Traditional Chinese
- Add and remove a site's languages in Project details; a new language starts with copies of the menus, header, and footer to translate
- Create a page's or item's version in another language from the editor, with language tabs and translation chips in the Pages and collection lists
- Link pickers reach every language and show the target's language
- Image alt text, title, and caption per language, chosen from a **Language** list in the media drawer
- Each language exports to its own folder (main language at the root), with hreflang links and sitemap alternates; a language without a homepage is left out and named
- Arch adds a header **language switcher**, and its own words, dates, breadcrumbs, opening hours, and the built-in form read in the page's language

### Breadcrumbs and Pagination

- **Breadcrumbs:** give a page a parent page and Arch draws the trail above its content (turn on **Show breadcrumbs** in the theme settings). Collection items show the page that lists them, set with the new **Main page** checkbox on a listing widget
- **Split into pages:** a News, Projects, or Services grid can show a set number of items per page, with page links below. Each page is exported as a numbered copy (`news/page/2.html`) and added to the sitemap. Splitting into pages and marking the main page are independent

### Search Engines and Site Identity

- **Site identity and Business details:** tell search engines who runs the site (organization, person, or local business), with logo, contact details, social profiles, address, and opening hours
- **Structured data:** every page describes itself to search engines automatically, with site and business details on the homepage, breadcrumb trails, and article details for News items
- **Search engine checklist:** a note beside the Project details form shows which details search engines can read, with a check for each one and **Add** to jump to a missing field
- **Export notes:** after an export, the Export page says which details search engines look for are still missing
- **Business details on the site:** Arch adds a Business details block to the footer and Contact Details, with an Additional details field for your own text, and social icons use the project's profiles when set
- **Clean URLs:** a project setting for hosts that serve pages without `.html`; generated links, canonicals, and the sitemap drop the extension while the files stay `.html`
- **Site Address in a subfolder:** a Site Address such as `https://example.com/site` now keeps its subfolder in every generated address
- **Featured image as share image:** Arch News, Projects, and Services items use their featured image for social sharing when no social media image is set
- **favicon.ico:** exports include a `favicon.ico` and a 192px icon for search results

### Projects

- **Tabbed project form:** New project and Project details share one form with General, Site, Identity, and Business Details tabs, and you can pick a logo while creating a project
- **Simpler folder names:** the project folder name is generated for you and no longer shown
- **Project details for the active project:** open a project to edit its details; other actions are in each row's menu in the projects list
- **Safer deletion:** if a locked file stops a project folder from being removed, the app tells you where it is and never reuses it

### Editor

- **Undo survives saves:** undo history is kept after saving and autosaving, quick edits to one field are grouped into a single step, and history holds up to 150 steps
- **Undo back to saved:** undoing back to exactly what was saved leaves nothing to save
- **Shortcut hints:** the widget menu shows the Delete shortcut
- **Icon search:** the icon picker finds icons by synonyms (search "photo" to find camera) and ranks the best matches first
- **Number limits:** number settings keep to the minimum and maximum the theme sets
- **Safer Site settings:** theme settings save only what you changed, one save at a time, and never overwrite a theme update made in another tab; **Discard changes** discards the theme draft too

### Media

- **MP4 video:** upload MP4 files and play them in Arch's Video widget; used videos are included in exports
- **Captions in Arch:** the media library caption appears under the Image widget, item featured images, and project and service galleries, and fills in for Gallery blocks without their own and in the Masonry Gallery lightbox when a block has no title
- **Readable file names:** uploaded file names keep their words (`logo (final)_v2.svg` becomes `logo-final-v2.svg`), and accented letters and other alphabets are converted to plain letters
- **New uploads first:** freshly uploaded files appear at the top of the library
- **Wider delete protection:** files used in collection items, social images, theme settings, the business logo, or any language can't be deleted, and deletion re-checks saved content first

### Desktop App

- **Widgetizer Desktop:** the desktop app is now called Widgetizer Desktop
- **Desktop shortcut:** reinstalling on Windows brings back a deleted desktop shortcut
- **Links open in your browser:** links that open a new window, and outside links inside an export or media window, open in your browser; exports and media files open in their own window
- **Confirm dialogs:** on Windows, text fields accept typing again right after a confirmation dialog closes

### Added

- **New fonts:** Instrument Sans and STIX Two Text
- **No limit on forms:** a site can now have more than five different forms
- **Button text for grids:** the News, Projects, and Services grids let you change the card button label
- **Theme update links:** pages and menus added by a theme update are linked the same way as in a new project, and the Arch header button links to Contact from every page

### For Theme Authors

- **`validate:theme`:** `npm run validate:theme -- themes/my-theme` checks a theme's schemas, Liquid, assets, and locales before you ship it
- **Visitor-facing translations:** a `site` locale dictionary and the `t` filter let a theme speak each page's language; `page.language`, `page.dir`, and `page.translations` (for language switchers) are available in templates
- **`page_url` and `item_url` filters:** link to a page or item in the current language, following Clean URLs
- **Pagination:** declare `perPageSetting` on a collection listing and render the shared pagination snippet
- **Breadcrumbs:** a core breadcrumb trail and snippet; declare a widget's `collection` so items find their listing page
- **Structured data and identity:** collection types can map fields to article data, and `project.identity` exposes the business details
- **Share-image fallback:** mark one collection image field `usedAsImage` to use it as the item's social image
- **`video` setting type:** pick an uploaded MP4
- **Localized dates:** `format_date` writes month names in the page's language
- **Snippets:** `{% image %}`, `media_meta`, and the `collection` filter work inside rendered snippets
- **Theme settings from any group:** fonts, Bunny Fonts, custom CSS and scripts, and the site icon are found by setting id in any group

### Security

- Project backups and theme ZIPs are checked for ZIP bombs and for contents a real backup never holds
- Exported sites, media files, and the site preview can no longer control the editor window
- Video embeds build the player address from the video ID only
- Request slugs, theme names, and file paths are kept inside their project folders

### Fixed

- Bunny Fonts now serves every font weight, not just regular
- Translated pages no longer show English in breadcrumbs and opening hours
- Theme labels no longer show internal codes after a theme update
- Choosing a page in a link field no longer leaves the page "unsaved"
- Saving the project or page form no longer drops a field (such as a page's parent)
- Deleting content clears the links that pointed at it the same way, whether you delete one page or a whole language
- Deleting a parent page moves its children to a surviving translation of that parent when there is one
- An edited widget keeps its heading level in the preview
- Arch heroes make room for the breadcrumb trail under a transparent header
- Project backup downloads no longer arrive as `.zip_` on Windows
- A backup with damaged content, or one in a newer backup format, is refused instead of creating a half-imported project
- **Ctrl+Shift+Z** (Cmd+Shift+Z) redoes in the page editor, and shortcuts work with Caps Lock on
- **Cancel** in a menu's structure asks before discarding a change made just before it, and a quick **Save** keeps the latest text
- Submitting a form in the preview no longer shows a server error page
- The code editor's line numbers stay inside the box
- Renaming a project folder can no longer lose the only complete copy

## [0.9.9] - 2026-07-16

### Added

- Theme-defined collections for lightweight CMS content types such as News, Projects, and Services, including optional per-item pages, SEO output, sitemap inclusion, collection item menu links, depth-aware export links, and in-editor item management
- New Arch collection widgets: News Grid, Projects Grid, and Services Grid
- New Arch Audio Player widget with MP3 playlist support
- New Arch Table widget for rate sheets, tuition tables, size charts, and spec lists
- New Bedrock preset (general contractor / construction) with full template content, menus, and starter media
- Core Contact Form widget with a forms manifest written into exports (submissions are handled by Widgetizer Hosting; other static hosts need their own handler)
- Docker support for self-hosting the web app (Dockerfile + docker-compose.yml)
- Desktop app: automatic port selection at launch, and the window no longer auto-maximizes
- Copy and paste for widgets within a page or across pages, including right-click context menu support and keyboard delete
- Sticky action bars for long page, collection, and project forms
- Rich-text links can now target any Media Library file, including images, with an All / Images / Audio / Files type filter in the media picker
- Grouped, sorted link picker for pages and collection items
- Taller widget inserter with smarter positioning, keyboard scrolling, and per-widget preview images (Arch ships previews for its full widget set)
- Denser page-editor settings sidebar
- "+ New page" quick action in the editor topbar
- Menu item labels autofill from the target page and follow page changes
- Canonical URLs derive from the project site URL when not set per page
- Set active project from the projects list, with improved preset selection during project creation
- Theme font picker language filter, with the current font scrolled into view
- Vertically resizable Custom CSS / JS editor in Theme Settings
- Export history now shows the total size of each export
- Arch presets can seed starter media into new projects
- Internal rich-text links now follow page and collection-item renames and clear automatically when the target is deleted
- MP3 and audio uploads are supported
- Gallery images can carry per-image captions
- New theme setting types: `date`, `gallery`, and `table`
- Opt-in rich-text images and headings for theme authors, with automatic media resolution
- Theme-author filters and helpers for collections and rich text: `collection`, `rte_blank`, and `rte_text`
- Mastodon icon in the Arch icon set
- Dev-mode export HTML validation with an export issues report

### Changed

- Backend and editor code reorganized into modular npm packages behind adapter contracts for future hosted deployments
- Theme update indicators and banners improved, including clearer global update messaging and opt-in project update behavior
- Project creation avoids copying excluded theme directories for faster setup
- Local content saves now use temp-file-and-rename writes to avoid half-written files
- Card and collection grid widgets now scale image sizes, padding, and corner radius by column count
- Image Callout widget gained the Content color scheme
- Exports copy only the widget assets pages actually use
- Images embedded in rich text now count toward media usage tracking
- Theme uploads validate collection-type schemas before install
- The editor detects when the active project changes elsewhere and blocks editing with a notice
- LiquidJS updated to 10.26+

### Fixed

- Windows export junk-file filtering now handles Windows paths correctly
- YouTube settings no longer trigger a re-save loop
- Header dropdown readability under highlight color schemes
- Collection-item save button no longer remains disabled after re-editing
- Buttons default to `type="button"` to avoid accidental form submits
- Rich-text link UI no longer crashes under React StrictMode
- Non-Latin text in form field keys, export filenames, and doc anchors is transliterated to ASCII (e.g. Greek, Cyrillic) instead of being dropped
- Media picker file tooltips no longer clip on the first row of results
- Media Library filename column always shows the filename instead of the image title
- Theme card action popovers no longer clip, and long "in use" labels no longer overflow
- A failed project load no longer bounces the editor to the project picker
- Media "Used in" labels show collection item titles
- Media usage refresh rescans correctly
- Icon grid and color picker render correctly in the narrow settings sidebar

### Security

- Media uploads are size-capped at the upload stream
- Per-page widget count, menu-item tree depth, and menu-item count are bounded
- Image setting paths are allowlisted to block image-based XSS
- URL sanitization hardened across links, menus, and theme output
- Theme-authored SVG icons are sanitized before injection
- `og:image` is always emitted as an absolute URL
- Desktop preview windows are restricted to safe internal paths, and the editor-preview bridge accepts messages only from the resolved peer origin
- Additional Liquid rendering isolation hardening for hosted deployments

### Documentation

- Theme-author docs expanded with a build-your-first-theme quickstart, Liquid filters reference, Collections authoring guide, and one-page theme contract
- New end-user guides for Collections and Forms
- Themes documentation now explains Arch, presets, and the Theme -> Preset -> Project -> Content model
- Corrected rich-text rendering guidance for global autoescaping

## [0.9.8] - 2026-04-26

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
