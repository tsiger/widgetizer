# Widgetizer User Stories and QA Charter

## Purpose

This is the canonical, source-derived checklist of user-visible Widgetizer behavior. It is intentionally written as small actions rather than large feature descriptions so each item can be executed, passed, failed, or linked to an issue.

Every checklist item completes the sentence: **As a user, I can...**

This inventory was created from the `experimentation` branch UI, routes, stores, and server endpoints. A checked box means the story has been manually verified in the current test run; an unchecked box means it is untested, not necessarily broken.

## Test rule for every story

Unless a story says otherwise, verify all of the following:

1. The action is discoverable and understandable.
2. The successful result is correct and persists after reload.
3. Cancel or Escape leaves data unchanged.
4. Invalid input produces a useful message and does not corrupt data.
5. Loading, disabled, empty, and error states are sensible.
6. Switching project or navigating away does not apply stale results to another project.
7. Keyboard focus and accessible names remain usable.

## 1. Application shell and navigation

- [ ] **SHELL-001** — Launch the web app and reach the correct initial screen.
- [ ] **SHELL-003** — See the active project in the top bar.
- [ ] **SHELL-004** — Open and close the Manage menu.
- [ ] **SHELL-005** — Close the Manage menu with Escape or an outside click.
- [ ] **SHELL-006** — Navigate to project details, Projects, Themes, and General settings from Manage.
- [ ] **SHELL-007** — Navigate among Pages, each theme collection, Menus, Media, Site settings, Site preview, and Export site.
- [ ] **SHELL-008** — See project-scoped navigation disabled when no project is active.
- [ ] **SHELL-009** — Be redirected to Projects when a project-scoped URL has no active project.
- [ ] **SHELL-010** — Open Documentation and Changelog in an external tab/window.
- [ ] **SHELL-011** — See a useful not-found screen for an unknown route.
- [ ] **SHELL-012** — See a useful error screen when route loading fails.
- [ ] **SHELL-013** — Use the interface at narrow/mobile and wide desktop window sizes without losing actions.
- [ ] **SHELL-014** — Reload any supported route without losing the active project or receiving a blank screen.

## 2. Projects

- [ ] **PROJ-001** — See all projects with name, theme/version, updated date, and active state.
- [ ] **PROJ-002** — Open a project by clicking its name.
- [ ] **PROJ-003** — Set an inactive project as active from its actions menu.
- [ ] **PROJ-004** — Create a project from the empty Projects state.
- [ ] **PROJ-005** — Create a project from the populated Projects state.
- [ ] **PROJ-006** — Create a project with a selected theme and its default preset.
- [ ] **PROJ-007** — Create a project with the Blank preset.
- [ ] **PROJ-008** — Create a project with any non-blank preset and receive its seeded content/media.
- [ ] **PROJ-009** — Open a preset live demo without losing the project form.
- [ ] **PROJ-010** — Create a project without selecting an optional preset.
- [ ] **PROJ-011** — Have a folder name generated from a new project title.
- [ ] **PROJ-012** — Edit the generated folder name using only valid lowercase letters, numbers, and hyphens.
- [ ] **PROJ-013** — Be prevented from creating a project with a blank title, blank folder, invalid folder, duplicate folder, or missing theme.
- [ ] **PROJ-014** — Add and persist project notes, site title, and website address.
- [ ] **PROJ-015** — Be prevented from saving an invalid website address.
- [ ] **PROJ-016** — Cancel new-project creation without creating files or metadata.
- [ ] **PROJ-017** — Edit an existing project's title and optional details.
- [ ] **PROJ-018** — See the assigned theme as read-only when editing a project.
- [ ] **PROJ-019** — Enable or disable theme-update notifications for a project.
- [ ] **PROJ-020** — Cancel or reset project edits without persisting them.
- [ ] **PROJ-021** — Receive a warning before leaving project details with unsaved changes.
- [ ] **PROJ-022** — Duplicate a project with pages, collections, menus, media, settings, and references intact.
- [ ] **PROJ-023** — See copied projects named and sorted predictably across repeated duplication.
- [ ] **PROJ-024** — Download a complete project backup ZIP.
- [ ] **PROJ-025** — See progress and recover cleanly if backup creation fails.
- [ ] **PROJ-026** — Import a valid Widgetizer project backup.
- [ ] **PROJ-027** — Have an imported project receive a new identity and become usable immediately.
- [ ] **PROJ-028** — Reject a non-ZIP, malformed ZIP, unsafe ZIP, or oversized backup with a useful message.
- [ ] **PROJ-029** — Cancel the import modal without changing projects.
- [ ] **PROJ-030** — Delete an inactive project after explicit confirmation.
- [ ] **PROJ-031** — Cancel project deletion without changing data.
- [ ] **PROJ-032** — Be prevented from deleting the active project.
- [ ] **PROJ-033** — Have deletion remove the project's content, media, settings, and export history without affecting other projects.
- [ ] **PROJ-034** — Switch projects while on a shared route and see only the newly active project's data.
- [ ] **PROJ-035** — See the current and available theme versions in project details when that project accepts theme updates.
- [ ] **PROJ-036** — Apply an available theme version to the project and retain pages, menus, uploads, compatible settings, and preset-independent content.
- [ ] **PROJ-037** — See an accurate no-update or failed-update state without partially changing the project's recorded theme version.

## 3. Themes and presets

- [ ] **THEME-001** — See installed themes with name, author, version, usage, presets, and preview imagery.
- [ ] **THEME-002** — Expand and collapse a theme's preset gallery.
- [ ] **THEME-003** — Open a preset live demo.
- [ ] **THEME-004** — Upload and install a valid theme ZIP.
- [ ] **THEME-005** — Update an installed theme by uploading a newer valid version.
- [ ] **THEME-006** — Reject multiple files, non-ZIP files, oversized ZIPs, malformed themes, unsafe paths, or invalid versions.
- [ ] **THEME-007** — See upload progress and a clear success, partial, or failure result.
- [ ] **THEME-008** — See when an installed theme update is available.
- [ ] **THEME-009** — Apply a pending theme update and retain compatible project content/settings.
- [ ] **THEME-010** — See warnings for removed or incompatible theme content after an update.
- [ ] **THEME-011** — Delete an unused theme after confirmation.
- [ ] **THEME-012** — Cancel theme deletion.
- [ ] **THEME-013** — Be prevented from deleting a theme used by one or more projects and see which projects use it.
- [ ] **THEME-014** — Recover without corrupting the installed theme if upload or update fails midway.

## 4. Pages and page settings

- [ ] **PAGE-001** — See all pages with title and updated date.
- [ ] **PAGE-002** — See the empty state and create the first page.
- [ ] **PAGE-003** — Create a page with a title and auto-generated filename/slug.
- [ ] **PAGE-004** — Edit and normalize a page filename/slug.
- [ ] **PAGE-005** — Use `index` as the homepage filename.
- [ ] **PAGE-006** — Be prevented from saving a blank title, blank filename, invalid filename, or duplicate filename.
- [ ] **PAGE-007** — Add and persist meta description, social title, social image, canonical URL, and robots behavior.
- [ ] **PAGE-008** — Select, upload, replace, and remove a social image from page settings.
- [ ] **PAGE-009** — Cancel page creation without creating a page.
- [ ] **PAGE-010** — Edit existing page settings and preserve page content.
- [ ] **PAGE-011** — Cancel or reset page-setting edits.
- [ ] **PAGE-012** — Receive a warning before leaving page settings with unsaved changes.
- [ ] **PAGE-013** — Open a page directly in the visual editor.
- [ ] **PAGE-014** — Search pages by title or filename, case-insensitively.
- [ ] **PAGE-015** — See a useful no-results state and clear the search.
- [ ] **PAGE-016** — Select and deselect one page.
- [ ] **PAGE-017** — Select or deselect all currently filtered pages.
- [ ] **PAGE-018** — Duplicate a page with widgets, blocks, settings, SEO, and media references intact.
- [ ] **PAGE-019** — See copied pages named and sorted predictably across repeated duplication.
- [ ] **PAGE-020** — Delete one page after confirmation.
- [ ] **PAGE-021** — Cancel single-page deletion.
- [ ] **PAGE-022** — Bulk-delete selected pages after confirmation.
- [ ] **PAGE-023** — Cancel bulk deletion and retain the selection.
- [ ] **PAGE-024** — See page count, selection count, and row highlights stay accurate after search or mutation.
- [ ] **PAGE-025** — See media usage update after page duplicate, edit, or deletion.
- [ ] **PAGE-026** — See a sensible site-preview state when the last page is deleted.

## 5. Visual page editor

- [ ] **EDIT-001** — Load the chosen page, its widgets, global widgets, theme settings, and live preview.
- [ ] **EDIT-002** — Switch pages from the editor page picker.
- [ ] **EDIT-003** — Create a new page from the editor page picker.
- [ ] **EDIT-004** — Return to the Pages list.
- [ ] **EDIT-005** — Select a widget from the structure panel or preview.
- [ ] **EDIT-006** — Select Header or Footer global widgets and edit their settings.
- [ ] **EDIT-007** — See the selected widget/block reflected consistently in structure, settings, and preview.
- [ ] **EDIT-008** — Add any available widget at the start, between widgets, or at the end of a page.
- [ ] **EDIT-009** — Search widgets by display name or alias.
- [ ] **EDIT-010** — Choose a widget with mouse or keyboard and close the selector with Escape, Tab, or outside click.
- [ ] **EDIT-011** — See widget preview images or a graceful fallback when an image is unavailable.
- [ ] **EDIT-012** — Reorder widgets by drag and drop.
- [ ] **EDIT-013** — Move a widget with any available keyboard/up/down controls.
- [ ] **EDIT-014** — Collapse and expand an individual widget in the structure panel.
- [ ] **EDIT-015** — Rename a widget instance and cancel or accept the rename with keyboard controls.
- [ ] **EDIT-016** — Open the widget context menu by its action button or right-click.
- [ ] **EDIT-017** — Close the widget context menu with Escape, outside click, scroll, or resize.
- [ ] **EDIT-018** — Duplicate a widget with all settings and blocks intact.
- [ ] **EDIT-019** — Copy a widget to the in-memory clipboard.
- [ ] **EDIT-020** — Paste a copied widget after a chosen widget.
- [ ] **EDIT-021** — Paste a copied widget into any insertion zone.
- [ ] **EDIT-022** — Preserve clipboard behavior while moving between pages where supported, without leaking between projects.
- [ ] **EDIT-023** — Delete a widget and update selection to a sensible neighbor.
- [ ] **EDIT-024** — Delete the selected widget with Delete/Backspace when focus is not in an editable control.
- [ ] **EDIT-025** — Avoid deleting a widget when Delete/Backspace is used inside an input, editor, or modal.
- [ ] **EDIT-026** — Add each allowed block type to a block-capable widget.
- [ ] **EDIT-027** — Add a block at the start, between blocks, or at the end.
- [ ] **EDIT-028** — Select a block and edit its settings.
- [ ] **EDIT-029** — Reorder blocks by drag and drop.
- [ ] **EDIT-030** — Duplicate a block with its settings intact.
- [ ] **EDIT-031** — Delete a block with its widget remaining valid.
- [ ] **EDIT-032** — Delete the selected block with Delete/Backspace when safe.
- [ ] **EDIT-033** — Enforce a widget's maximum block count for add and duplicate actions.
- [ ] **EDIT-034** — Edit every setting type listed in the Field controls section.
- [ ] **EDIT-035** — Edit project-wide theme settings from the editor and see the preview update.
- [ ] **EDIT-036** — Navigate back from block settings to its parent widget settings.
- [ ] **EDIT-037** — Switch the embedded preview between desktop and mobile widths.
- [ ] **EDIT-038** — Open the standalone site preview.
- [ ] **EDIT-039** — Follow valid internal page and collection links in standalone preview.
- [ ] **EDIT-040** — Reload the preview after a rendering error.
- [ ] **EDIT-041** — Undo a widget, block, structure, or theme-setting change.
- [ ] **EDIT-042** — Redo an undone change.
- [ ] **EDIT-043** — Use Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z without affecting focused text-editing controls incorrectly.
- [ ] **EDIT-044** — Save manually with the button or Ctrl/Cmd+S.
- [ ] **EDIT-045** — See unsaved and saving indicators accurately.
- [ ] **EDIT-046** — Have autosave persist widget, structure, global-widget, and theme-setting changes.
- [ ] **EDIT-047** — Recover gracefully from a failed save without falsely marking changes saved.
- [ ] **EDIT-048** — Avoid saving edits to the wrong project if the active project changes during a save.
- [ ] **EDIT-049** — Reload after save and see the same widget order, block order, values, names, and theme settings.
- [ ] **EDIT-050** — Start from an empty page and build, save, preview, and reload it successfully.

## 6. Field controls used by widgets, collections, and settings

- [ ] **FIELD-001** — Enter and clear text, number, date, and multiline text values.
- [ ] **FIELD-002** — Respect required, minimum, maximum, step, and empty-value rules.
- [ ] **FIELD-003** — Change a range by slider and number input, including boundary values.
- [ ] **FIELD-004** — Choose and clear select and radio options.
- [ ] **FIELD-005** — Toggle checkbox values.
- [ ] **FIELD-006** — Choose a color by swatch/picker or hex value, including alpha where allowed.
- [ ] **FIELD-007** — Choose a font, search/filter fonts, and choose a supported weight.
- [ ] **FIELD-008** — Select a menu and preserve legacy menu references where supported.
- [ ] **FIELD-009** — Enter code, use syntax mode, expand it, and close with Done, Escape, or outside click.
- [ ] **FIELD-010** — Format rich text as headings, bold, italic, bullet lists, and numbered lists.
- [ ] **FIELD-011** — Add, edit, and remove rich-text links.
- [ ] **FIELD-012** — Link rich text to a media file.
- [ ] **FIELD-013** — Insert an image into rich text where allowed.
- [ ] **FIELD-014** — Switch rich text to HTML source and back without losing valid content.
- [ ] **FIELD-015** — Expand and close the rich-text editor without losing edits.
- [ ] **FIELD-016** — Have unsafe rich text, SVG, URLs, and code handled according to the product's sanitization rules.
- [ ] **FIELD-017** — Upload, choose from the library, replace, and remove an image.
- [ ] **FIELD-018** — Display missing or broken images with a usable fallback.
- [ ] **FIELD-019** — Upload, choose, replace, open, and remove a generic file.
- [ ] **FIELD-020** — Add, replace, remove, and reorder gallery images.
- [ ] **FIELD-021** — Add, edit, remove, and reorder table rows while preserving declared columns.
- [ ] **FIELD-022** — Keep blank gallery/table rows editor-local instead of saving meaningless data.
- [ ] **FIELD-023** — Select an internal page/collection target or enter an external/custom URL in a link field.
- [ ] **FIELD-024** — Set link text and same-window/new-window behavior.
- [ ] **FIELD-025** — Preserve internal links across page, collection-item, and project duplication where intended.
- [ ] **FIELD-026** — Paste a YouTube URL or video ID and see a valid preview.
- [ ] **FIELD-027** — Change supported YouTube embed options and remove the video.
- [ ] **FIELD-028** — Reject invalid YouTube input without saving stale embed data.
- [ ] **FIELD-029** — Search, select, clear, and reset an icon.
- [ ] **FIELD-030** — Restrict icons to a schema's allowed options/patterns.
- [ ] **FIELD-031** — Retain valid field values after switching tabs/groups and returning.

## 7. Collections and collection items

- [ ] **COLL-001** — See one navigation entry per collection type defined by the active theme.
- [ ] **COLL-002** — See a useful message for a collection type not defined by the current theme.
- [ ] **COLL-003** — See collection items with title, date/updated value, validation status, and actions.
- [ ] **COLL-004** — Create the first item from an empty collection.
- [ ] **COLL-005** — Create an item using every field type its schema provides.
- [ ] **COLL-006** — Have title-derived slug and date defaults behave predictably.
- [ ] **COLL-007** — Be prevented from saving missing required fields, invalid values, blank slug, or duplicate slug.
- [ ] **COLL-008** — Cancel item creation without creating content or media usage.
- [ ] **COLL-009** — Edit an item and persist its schema fields.
- [ ] **COLL-010** — Change an item's slug and have its generated URL and internal references behave correctly.
- [ ] **COLL-011** — Add and persist SEO metadata for collection types that generate item pages.
- [ ] **COLL-012** — Preview a saved collection item page.
- [ ] **COLL-013** — Disable or explain preview for a new unsaved item or a collection without item pages.
- [ ] **COLL-014** — Search items by title or slug.
- [ ] **COLL-015** — Filter to items that need attention and return to all items.
- [ ] **COLL-016** — See useful field-level validation messages on invalid legacy items.
- [ ] **COLL-017** — Select/deselect one item or all filtered items.
- [ ] **COLL-018** — Duplicate an item with settings, SEO, and media references intact.
- [ ] **COLL-019** — Delete one item after confirmation or cancel deletion.
- [ ] **COLL-020** — Bulk-delete selected items after confirmation or cancel deletion.
- [ ] **COLL-021** — Reorder sortable items by drag and drop and persist the order.
- [ ] **COLL-022** — Disable reordering while search or attention filters are active.
- [ ] **COLL-023** — Preserve values removed from a newer schema as clearly labeled leftover content.
- [ ] **COLL-024** — Permanently remove leftover content only after confirmation.
- [ ] **COLL-025** — Keep leftover content when removal is canceled.
- [ ] **COLL-026** — Update media usage and link targets after create, duplicate, slug change, edit, or deletion.
- [ ] **COLL-027** — Handle a theme update that adds, removes, or changes collection fields without corrupting items.

## 8. Menus

- [ ] **MENU-001** — See all menus with title and updated date.
- [ ] **MENU-002** — Create the first menu from the empty state.
- [ ] **MENU-003** — Create a menu with required title and optional description.
- [ ] **MENU-004** — Be prevented from saving a blank menu title.
- [ ] **MENU-005** — Cancel menu creation without creating a menu.
- [ ] **MENU-006** — Edit menu title and description.
- [ ] **MENU-007** — Cancel/reset menu-setting edits and receive an unsaved-changes warning when appropriate.
- [ ] **MENU-008** — Open a menu's structure editor.
- [ ] **MENU-009** — Add a top-level menu item.
- [ ] **MENU-010** — Add child and grandchild items up to the supported three levels.
- [ ] **MENU-011** — Be prevented from nesting deeper than the supported level.
- [ ] **MENU-012** — Edit an item's label.
- [ ] **MENU-013** — Link an item to a page, collection listing, collection item, or custom URL.
- [ ] **MENU-014** — Handle a linked target that was renamed, moved, or deleted.
- [ ] **MENU-015** — Expand/collapse one branch or all branches.
- [ ] **MENU-016** — Reorder items and change nesting by drag and drop.
- [ ] **MENU-017** — Remove a menu item and its descendants with the expected confirmation/feedback.
- [ ] **MENU-018** — Save menu structure and see it reflected in preview/export.
- [ ] **MENU-019** — Cancel structure changes without persisting them.
- [ ] **MENU-020** — Duplicate a menu with its full nested structure intact.
- [ ] **MENU-021** — Delete a menu after confirmation or cancel deletion.
- [ ] **MENU-022** — Preserve widget menu references by stable identity when menu titles/settings change.

## 9. Media library

- [ ] **MEDIA-001** — See an empty media state and upload the first file.
- [ ] **MEDIA-002** — Upload supported JPG, PNG, GIF, WebP, SVG, PDF, and MP3 files by picker.
- [ ] **MEDIA-003** — Upload supported files by drag and drop.
- [ ] **MEDIA-004** — Upload multiple files and see per-file/batch progress.
- [ ] **MEDIA-005** — Sanitize SVG content before it is stored or rendered.
- [ ] **MEDIA-006** — Generate and use configured image sizes/thumbnails for raster images.
- [ ] **MEDIA-007** — Reject unsupported, oversized, malformed, unsafe, or failed files with per-file reasons.
- [ ] **MEDIA-008** — Keep successful files when a multi-file upload is only partially successful.
- [ ] **MEDIA-009** — Switch between grid and list views and retain the preference.
- [ ] **MEDIA-010** — Search media by original filename.
- [ ] **MEDIA-011** — Filter by all media, images, or non-image files.
- [ ] **MEDIA-012** — Select/deselect one file or all currently filtered files.
- [ ] **MEDIA-013** — Open an image in the lightbox and navigate previous/next.
- [ ] **MEDIA-014** — Open a generic media file in a new tab/window.
- [ ] **MEDIA-015** — Copy a media URL to the clipboard.
- [ ] **MEDIA-016** — Edit image alt text and optional title.
- [ ] **MEDIA-017** — Be prevented from saving blank required alt text.
- [ ] **MEDIA-018** — Cancel metadata edits or close the drawer with Escape/outside click without saving.
- [ ] **MEDIA-019** — See where a media item is used, including pages, collection items, Header, and Footer.
- [ ] **MEDIA-020** — Refresh media usage tracking and receive updated results.
- [ ] **MEDIA-021** — Delete one unused file after confirmation.
- [ ] **MEDIA-022** — Cancel single-file deletion.
- [ ] **MEDIA-023** — Be prevented from deleting a file currently in use.
- [ ] **MEDIA-024** — Bulk-delete unused selected files after confirmation.
- [ ] **MEDIA-025** — Partially complete bulk deletion while retaining and explaining files that are in use.
- [ ] **MEDIA-026** — Cancel bulk deletion and retain selection.
- [ ] **MEDIA-027** — See useful recovery guidance if media metadata and disk files are out of sync.
- [ ] **MEDIA-028** — Select or upload media from an image, file, gallery, rich-text, or SEO field without leaving the form.
- [ ] **MEDIA-029** — Avoid exposing media from another project after switching projects.

## 10. Site and application settings

- [ ] **SET-001** — Browse theme-defined Site settings by group/tab.
- [ ] **SET-002** — Edit every setting type exposed by the active theme.
- [ ] **SET-003** — Preview site-setting changes in the editor where supported.
- [ ] **SET-004** — Save Site settings and retain them after reload.
- [ ] **SET-005** — Reset unsaved Site settings.
- [ ] **SET-006** — Receive an unsaved-changes warning when leaving Site settings.
- [ ] **SET-007** — See clear warnings when a theme setting cannot be retained after a theme update.
- [ ] **APPSET-001** — Change and save the application language.
- [ ] **APPSET-002** — Change the date format and see dates update consistently across lists.
- [ ] **APPSET-003** — Configure the maximum media upload size within allowed limits.
- [ ] **APPSET-004** — Configure image quality and generated sizes when the active theme does not own those sizes.
- [ ] **APPSET-005** — See theme-owned image-size settings clearly replace/disable app-owned size controls.
- [ ] **APPSET-006** — Configure the number of export versions to retain.
- [ ] **APPSET-007** — Configure the maximum project-import size.
- [ ] **APPSET-008** — Enable/disable Developer mode and see developer-only features update.
- [ ] **APPSET-009** — Reset unsaved General settings.
- [ ] **APPSET-010** — Cancel General-settings editing or receive an unsaved-changes warning.
- [ ] **APPSET-011** — Be prevented from saving out-of-range or invalid numeric settings.

## 11. Preview and exported site behavior

- [ ] **PREVIEW-001** — Open Site preview at the homepage (`index`) or first available page.
- [ ] **PREVIEW-002** — See Site preview disabled when the project has no pages.
- [ ] **PREVIEW-003** — Switch standalone preview between desktop and mobile widths and retain the preference.
- [ ] **PREVIEW-004** — Navigate among pages and collection item pages using site links.
- [ ] **PREVIEW-005** — Open valid external links with the intended target behavior.
- [ ] **PREVIEW-006** — See Header, main content, Footer, menus, media, and theme settings rendered correctly.
- [ ] **PREVIEW-007** — Submit forms or use embeds only within the intended preview security boundary.
- [ ] **PREVIEW-008** — See a useful not-found/error state for missing pages, items, tokens, or assets.
- [ ] **EXPORT-001** — Create a static export for the active project.
- [ ] **EXPORT-002** — Optionally include Markdown versions of pages.
- [ ] **EXPORT-003** — See export progress, success/failure feedback, version, timestamp, size, and status.
- [ ] **EXPORT-004** — Keep only the configured number of export versions and remove oldest versions predictably.
- [ ] **EXPORT-005** — View a successful exported site.
- [ ] **EXPORT-006** — Navigate internal page, collection, media, and menu links in the exported site.
- [ ] **EXPORT-007** — Download an export ZIP.
- [ ] **EXPORT-008** — Delete an export after confirmation or cancel deletion.
- [ ] **EXPORT-009** — Open the HTML/accessibility issues report in Developer mode when one exists.
- [ ] **EXPORT-010** — Produce SEO artifacts such as canonical metadata, robots directives, sitemap, and social metadata correctly.
- [ ] **EXPORT-011** — Include only the active project's files and never leak another project's data.
- [ ] **EXPORT-012** — Recover cleanly from a failed or interrupted export without a false successful history entry.

## 12. Cross-cutting integrity, usability, and failure stories

- [ ] **SAFE-001** — Confirm every destructive action with the affected object clearly named.
- [ ] **SAFE-002** — Close every dismissible menu/modal/drawer with its visible control, Escape, and appropriate outside click.
- [ ] **SAFE-003** — Prevent duplicate submissions while create/save/upload/update/export operations are running.
- [ ] **SAFE-004** — Show accurate success, warning, error, loading, and progress feedback without duplicate/stuck toasts.
- [ ] **SAFE-005** — Preserve user data after API, filesystem, SQLite, preview, or network failures.
- [ ] **SAFE-006** — Prevent stale async responses from one project/page/item from overwriting another.
- [ ] **SAFE-007** — Maintain consistent IDs and references through rename, slug change, duplicate, import, theme update, and export.
- [ ] **SAFE-008** — Prevent path traversal, unsafe ZIP extraction, unsafe filenames, script injection, and unsafe URL protocols.
- [ ] **SAFE-009** — Sanitize rich text and SVG while preserving expected safe formatting.
- [ ] **SAFE-010** — Keep intentionally raw code/embed fields functional without weakening other fields.
- [ ] **SAFE-011** — Handle empty, very long, Unicode, punctuation-heavy, and duplicate names predictably.
- [ ] **SAFE-012** — Handle large projects, many pages/items/media files, deep menus, and long widget lists without unusable slowdown.
- [ ] **SAFE-013** — Keep list selection coherent after filtering, deleting, duplicating, reordering, or changing project.
- [ ] **SAFE-014** — Keep all menus and action popovers inside the viewport near page edges.
- [ ] **SAFE-015** — Provide keyboard access and visible focus for all interactive controls.
- [ ] **SAFE-016** — Give controls useful accessible names and associate errors/help with their fields.
- [ ] **SAFE-017** — Preserve readable contrast, zoom behavior, and screen-reader structure in core workflows.
- [ ] **SAFE-018** — Avoid data loss when reloading, closing the window, using browser Back, or navigating with unsaved changes.
- [ ] **SAFE-019** — Show useful recovery states when database rows and filesystem content disagree.

## Execution order

Run the checklist in waves so failures do not contaminate later results:

1. **Smoke:** SHELL, project open/create, first page, first widget, save/reload, preview.
2. **Core authoring:** PAGE, EDIT, FIELD, COLL, MENU, MEDIA, SET.
3. **Lifecycle/destructive:** duplicate, import/export, bulk delete, project/theme deletion.
4. **Failure and integrity:** SAFE stories with forced API failures, stale data, invalid uploads, and project switches.
5. **Web polish:** responsive layout, browser behavior, and accessibility stories.

Use at least these fixtures:

- A Blank Arch project with no content.
- A populated Arch preset project.
- A second active/inactive project pair for isolation tests.
- Used and unused media of every supported type.
- Valid and intentionally invalid collection items.
- A theme ZIP and project-backup ZIP in valid, invalid, oversized, and unsafe variants.

## Issue record template

Create one issue per distinct behavior. Do not combine unrelated failures simply because they occurred in the same flow.

| Field | Value |
| --- | --- |
| Story ID | `EDIT-020` |
| Severity | Blocker / High / Medium / Low |
| Environment | Browser/version; OS; branch/commit |
| Preconditions | Project, page, fixture, and relevant settings |
| Steps | Minimal numbered reproduction steps |
| Expected | Observable result from the story |
| Actual | What happened instead |
| Evidence | Screenshot/video plus console/server error where useful |
| Reproducibility | Always / intermittent / once |
| Data impact | None / recoverable / data loss / cross-project risk |
| Status | New / confirmed / fixed / verified / deferred |
