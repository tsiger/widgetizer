---
description: Release notes and version history for Widgetizer. See what's new in each release.
---

# Changelog

All notable changes to Widgetizer are documented here.

## 0.9.10 - 2026-10-22

### Multilingual Sites

A site can now be written in several languages. Each language has its own pages, collection items, menus, header, and footer, while media, theme, and business details are shared. Nothing is translated automatically. See [Languages](languages.html).

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

## 0.9.9 - 2026-07-16

### Collections

Collections bring a lightweight CMS to themes. A theme can define **collection types** (content types like News, Projects, or Services), and site owners manage many items of each type right from the editor.

- Theme-defined collection schemas (`collection-types/`) with typed fields, titles, and dates
- Optional per-item pages, rendered through the theme layout with automatic SEO and `sitemap.xml` inclusion
- The `collection` Liquid filter for listing items inside widgets
- Menu links can target collection items, and stay valid across renames
- Depth-aware links and assets, so item pages (one directory deep) export correctly
- In-editor management: schema-driven add and edit forms, a sortable listing table, and a live in-panel preview of each item on your site
- Arch ships three ready-made collections (News, Projects, and Services), each with a matching grid widget, plus a News archive page and starter content

### New Widgets in Arch

- **Audio Player:** an MP3 player with an optional playlist
- **News Grid:** a collection grid for news and blog items, with an optional single-column blog layout and overlay style
- **Projects Grid:** a collection grid for projects and portfolio items, with an overlay layout
- **Services Grid:** a collection grid for services, with icon style, size, and shape controls
- **Table:** a generic rows-and-columns table (2 to 4 columns) for rate sheets, tuition, size charts, and spec lists, with lines, striped, or plain styles and optional right-aligned last column

### New Preset

- **Bedrock:** a general-contractor / construction preset, with full template content, menus, and starter media

### Desktop App

- **Automatic port selection:** the packaged app binds to the first available port and reports it back to the window, instead of failing to start when port 3000 is already in use
- **No auto-maximize on launch:** the app opens at a normal window size instead of maximizing

### Added

- **Copy and paste widgets:** copy widgets within a page or across pages, with a right-click context menu and keyboard delete
- **Sticky action bars:** save and action buttons stay pinned while you scroll long page, collection, and project forms
- **Link to files from rich text:** rich-text links can now point at any file in your Media Library, including images, with a type filter (All / Images / Audio / Files) to narrow the picker
- **Grouped, sorted link picker:** the link picker separates pages from collections and sorts entries alphabetically
- **Widget inserter improvements:** a taller list, smarter positioning, and keyboard scrolling
- **Compact settings sidebar:** a denser, easier-to-scan settings panel in the page editor
- **Export file sizes:** the export history now shows the total size of each export
- **Starter media:** new projects created from an Arch preset are seeded with matching starter images
- **Stable rich-text links:** internal links inside rich-text fields follow page and collection-item renames, and clear automatically when the target is deleted
- **MP3 and audio uploads:** audio files are now a supported media type
- **Per-image captions:** gallery images can each carry their own caption
- **Widget previews in the inserter:** the widget picker shows a preview image for each widget, and Arch ships previews for its full widget set
- **Add a page from the topbar:** a quick "+ New page" action in the editor topbar
- **Autofill menu labels:** a menu item's label fills in from its target page, and follows the page when it changes
- **Automatic canonical URLs:** pages without an explicit canonical derive one from the project's site URL
- **Set active project:** switch which project is active from the projects list, with a cleaner single-project view and improved preset selection at creation time
- **Font picker language filter:** the theme font picker can filter fonts by language and scrolls the current font into view
- **Resizable code editor:** the Custom CSS / JS editor in Theme Settings can be dragged to resize vertically
- **Docker support:** a `Dockerfile` and `docker-compose.yml` for self-hosting the web app (Express backend plus frontend)
- **Contact Form widget:** a configurable core Form widget, with a forms manifest written into the export. Submissions are handled by Widgetizer Hosting; on other static hosts the form renders but submissions need your own handler

### For Theme Authors

- **New setting types:** `date`, `gallery` (with per-image captions), and `table` (repeating text-column rows), joining the existing `file` input
- **Rich-text images and headings:** opt-in image and heading support inside rich-text fields, with automatic media resolution
- **`collection` filter:** list collection items from inside a widget template
- **`rte_blank` and `rte_text` filters:** reliably check whether a rich-text value is truly empty
- **Column-aware grids:** card and collection grid widgets scale image sizes, padding, and corner radius to their column count
- **image-callout Content scheme:** the Content color scheme is now available on the image-callout widget
- **Mastodon icon:** added to the Arch icon set
- **Dev-mode HTML validation:** development builds surface an export-issues column with WCAG checks
- **Widget preview images:** ship a `preview.png` next to a widget's `schema.json` and it appears in the widget inserter
- **Collection schema validation:** theme uploads are checked for broken collection-type schemas and rejected with a clear error

### Changed

- **Theme update indicators:** clearer in-editor signals when a theme has an update, a fixed global update banner, and the option to opt in to updates at project creation
- **Faster project creation:** new projects no longer copy excluded theme directories
- **Safer saves:** local content is written with a temp-file-and-rename, so a save can't leave a half-written file
- **Leaner exports:** exports include only the widget assets your pages actually use
- **Rich-text media usage:** images embedded in rich-text fields now count as "in use" in the Media Library
- **Wrong-project protection:** if the active project changes in another window, the editor shows a notice instead of letting you keep editing the wrong project

### Security

- Media uploads are size-capped at the upload stream
- Per-page widget count and menu-item tree depth and count are now bounded
- Image setting paths are allowlisted, blocking image-based XSS
- URL sanitization hardened across links, menus, and theme output
- Theme-authored SVG icons are sanitized before they are injected
- `og:image` is always emitted as an absolute URL
- LiquidJS updated to 10.26+, plus additional isolation hardening for hosted deployments
- Desktop preview windows are restricted to safe internal paths, and the editor-to-preview message bridge only accepts messages from the resolved peer origin

### Fixed

- Windows: the export junk-file filter now handles Windows paths correctly
- The YouTube setting no longer triggers a re-save loop
- The header dropdown is now readable under highlight color schemes
- The collection-item save button no longer stays disabled after re-editing
- Buttons default to `type="button"`, preventing accidental form submits
- Fixed a React StrictMode crash in the rich-text link UI
- The Media Library's Filename column now always shows the filename, rather than showing the image title when one was set
- Form field names written in non-Latin scripts (Greek, Cyrillic, etc.) now transliterate to valid keys in the exported forms manifest, instead of coming out empty or broken; the same transliteration applies to export filenames and docs-site anchors
- The file picker's filename tooltips no longer get cut off on the first row of results
- Theme cards: the actions popover no longer gets clipped, and long "in use" labels no longer overflow
- A failed project load no longer bounces the editor back to the project picker
- The Media Library's "Used in" labels now show collection item titles
- Refreshing media usage now rescans reliably
- The icon grid and color picker render correctly in the narrow settings sidebar

### Under the Hood

- The backend and editor were reorganized into modular npm packages behind adapter contracts. There is no user-facing change, but it lets the same code power future hosted deployments.

### Documentation

- Theme-author docs expanded: a build-your-first-theme quickstart, a Liquid **filters** reference, a Collections authoring guide, and a one-page theme contract
- New end-user guides for **Collections** and **Forms**
- Corrected rich-text rendering guidance (richtext requires the `raw` filter under global autoescaping)
- Docs site: full-text search (Pagefind), a Core Widgets reference, and UI screenshots throughout the guides

## 0.9.8 - 2026-04-26

### New Theme Presets

29 new Arch presets, each with full template content, menus, and curated screenshots. Pick a preset on theme install to scaffold a complete site:

- **Brewline:** Coffee shop / cafe
- **Brightside:** Dental practice
- **Clearpath:** Consulting / professional services
- **Codebase:** Software agency / dev studio
- **Corkwell:** Wine bar / restaurant
- **Crumbly:** Bakery
- **Everafter:** Wedding photographer / event services
- **Framelight:** Photography portfolio
- **Greenfield:** Landscaping / outdoor services
- **Greystone:** Architecture / construction
- **Hearthstone:** Boutique inn / hospitality
- **Inkwell:** Tattoo studio
- **Ironform:** Fitness / gym
- **Keystoned:** Real estate / property
- **Ledgerworks:** Accounting / financial services
- **Little Oaks:** School / childcare
- **Olympic:** Sports club
- **Pawlish:** Pet grooming / vet
- **Petalry:** Florist
- **Pipeworks:** Trades / plumbing
- **Pixelcraft:** Creative / digital agency
- **Saffron:** Restaurant
- **Shearline:** Barber / salon
- **Sparkhaus:** Electrician / home services
- **Stillpoint:** Yoga / wellness studio
- **Tailside:** Pet services
- **Torque:** Auto shop / mechanics
- **Uplink:** SaaS / tech startup
- **Velvet Touch:** Beauty / spa

Plus a refreshed default **Arch** preset.

### New Widgets

- **Resource List:** Downloadable documents and files (PDFs, brochures, price lists)
- **Class Schedule:** Weekly class / session timetable

### Added

- **Embed widget background & overlay:** Add a background image and overlay to embed widgets for richer hero/section embeds
- **Footer Badges block:** Display certification, payment, and trust badges in the footer
- **Footer copyright is now richtext:** Inline links and basic formatting in the footer copyright line
- **Footer layout variations:** Multiple footer arrangements
- **Per-widget spacing controls:** `top_spacing` / `bottom_spacing` per widget with intermediate values, plus shared `spacing-top-none` / `spacing-bottom-none` overrides
- **Heading alignment:** New alignment setting available across widgets
- **Two new color schemes:** `standard-accent` and `highlight-accent`, complementing the existing `standard` and `highlight`
- **Eyebrow uppercase setting:** Toggle uppercase styling on widget eyebrows
- **Active menu item styles:** Visual treatment for the current page in navigation
- **Carousel arrows on hover:** Slider arrows reveal on hover for cleaner card layouts
- **File input setting type:** A dedicated setting type for file uploads in theme schemas (documented in Setting Types)
- **Project-specific theme locales:** Themes (and presets) can now ship locale data scoped per project, with locale resolution honoring preset overrides
- **Markdown alternate output during export:** When `.md` generation is enabled, exports include Markdown alternates alongside HTML
- **Site title in project export:** Exported project archives include site title metadata
- **Theme update badge:** Surfaces theme update availability in the editor
- **Debug state panel:** Development-only panel for inspecting frontend stores

### Changed

- **Responsive image delivery refined:** `srcset` and export behavior now treat the `large` variant as the public delivery ceiling when it exists, while still falling back to the original when no `large` variant is available
- **Image rendering overhaul:** Image rendering and responsive image sizes reworked across widgets; ImageInput component standardized for aspect ratio and styling
- **Slideshow improvements:** Cleaner slideshow rendering and behavior
- **Mobile menu rework:** Mobile menu and toggle button polished
- **Lightbox mobile fix:** Lightbox now renders correctly on mobile
- **Steps widget mobile alignment:** Fixed layout on small screens
- **Timeline widget shapes:** Number markers now follow the theme `shapes` setting
- **Scheduled Table:** Optional setting to disable highlighting of the current day
- **Transparent header:** Improved behavior and presentation
- **Map widget:** Polish and broader common-locale coverage
- **Email setting:** Renders as an email link rather than a generic URL
- **Color scheme renames:** Schemes renamed for consistency across themes
- **Date/time formatting:** Default date/time format updated; formatting unified through a shared hook
- **Project import flow:** Reworked import UI and flow for clearer step-by-step setup
- **Media management:** Improved media selector drawer, media management UI, and uploads
- **Widget settings panel:** Reorganized for better discoverability
- **Widget drag-and-drop:** Refined drag/drop interactions
- **Custom CSS / JS editor:** CodeInput overhaul with better syntax handling
- **Themes & preview UI:** Polished themes page, preview button, and live preview reliability
- **Toolbar & toasts:** Streamlined toolbar buttons; improved toast position and styling
- **Item duplication & sorting:** Better behavior across Projects, Menus, and Pages
- **Action sets streamlined:** Consistent action menus across Projects, Menus, and Pages
- **Favicon & list UI polish**
- **Project backup vs site export terminology:** Clearer naming across the UI
- **Translations:** Consolidated translations and filled in missing keys; locale files cleaned up
- **Live demo URLs:** Updated to reflect current hosted demos

### Fixed

- Lightbox mobile rendering issue
- Steps widget alignment on mobile
- Missing translation keys
- Various minor widget and editor fixes

### Documentation

- **Color schemes:** Widget docs now cover `standard-accent` and `highlight-accent` alongside the existing `standard` and `highlight`
- **Spacing controls:** Theme dev docs now cover `top_spacing` / `bottom_spacing` and the shared `spacing-top-none` / `spacing-bottom-none` class overrides
- **Export:** Docs reflect usage-aware media copying, `thumb` exclusion, flattened widget assets, and Markdown alternate output
- **File input type:** Setting Types docs now document the file input
- **Themes:** Themes page lists the expanded preset library

## 0.9.7 - 2026-03-26

### New Widgets

- **Action Bar:** Compact CTA strip for announcements, offers, and quick actions
- **Contact Details:** Structured business contact information with icons and links
- **Checkerboard:** Alternating content layout for visual variety across sections
- **Sliding Panels:** Panel-based layout with interactive transitions
- **Steps:** Sequential process/timeline presentation with stronger visual hierarchy
- **Testimonial Slider:** Rotating testimonial carousel with dedicated slider behavior

### Changed

- **Translation consolidation:** Arch theme translations were reorganized and aligned across all supported languages
- **Locale cleanup:** App and theme locale files were refactored and cleaned up for consistency
- **Minor polish:** Small theme/editor refinements and release housekeeping for `0.9.7`

### Fixed

- **Windows media uploads:** `.webp` files now handle correctly on Windows
- **Windows media uploads:** `.gif` files now handle correctly on Windows
- **Locale/theme cleanup:** Leftover locale inconsistencies and minor theme metadata issues resolved

## 0.9.6 - 2026-03-24

### New Widgets

- **Split Content:** Side-by-side layout with optional sticky content
- **Video Popup:** Inline video trigger with lightbox playback
- **Gallery:** New gallery widget variants
- **Scrolling Text:** Horizontal scrolling text/marquee
- **Numbered Service List:** Services displayed with step numbers
- **Team Highlight:** Showcase team members
- **Key Figures:** Animated statistics and counters

### Added

- **Theme localization:** Full i18n support for widget schemas and global settings, with translation files
- **Theme-level modifiers:** Define style modifiers (e.g. rounded corners, shadows) at the theme level and apply them across widgets
- **Icon modifiers:** Attach icon styles to widget elements
- **Responsive images everywhere:** Rolled out `srcset` support to all applicable widgets via the image tag
- **Carousel layout:** Card-based widgets can now use a carousel/slider layout
- **Typography selection:** Improved font and typography picker in theme settings
- **20+ theme presets:** Large expansion of ready-made theme configurations
- **Transparent header:** Per-page option for transparent/overlay navigation headers
- **Asset enqueue system:** Theme-level asset resolution for JS dependencies (e.g. carousel scripts)

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
