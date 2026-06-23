# Web App QA Run — experimentation — 2026-06-22

## Run metadata

| Field | Value |
| --- | --- |
| Charter | `docs-llms/user-stories-and-qa-charter.md` |
| Branch | `experimentation` |
| Starting commit | `c7dff686` |
| Surface | Web app |
| Browser target | In-app browser at `http://localhost:3000` |
| Test data policy | Use only disposable `QA-*` projects and explicitly identified existing QA fixtures |
| Status | Full charter in progress — live browser execution active |

## Scope for this pass

Smoke wave: application launch and shell, isolated blank-project creation, first-page creation, first-widget authoring, save/reload, and preview.

## Results

| Story ID | Status | Observation / evidence |
| --- | --- | --- |
| SHELL-001 | Pass | Loaded the web app at `/pages`; the Widgetizer shell rendered successfully. |
| SHELL-003 | Pass | The active project was visible in the top bar before and after project creation. |
| SHELL-004 | Pass | Opened the Manage menu and closed it again. |
| SHELL-005 | Pass | Escape closed the open Manage menu. |
| SHELL-006 | Partial | The Manage destinations were present and Projects opened correctly; the other three destinations remain to be exercised. |
| SHELL-007 | Partial | Primary navigation was visible; the full route-by-route navigation matrix remains to be exercised. |
| PROJ-005 | Pass | Created a project from a populated Projects screen without changing existing project data. |
| PROJ-007 | Pass | Created `QA Web Smoke 2026-06-22` with Arch v0.9.9 and the Blank preset. |
| PROJ-011 | Pass | The project folder was generated as `qa-web-smoke-2026-06-22`. |
| PAGE-002 | Pass | The new project showed the empty state and allowed creation of its first page. |
| PAGE-003 | Pass | Entering `Home` generated `home`; the filename could then be edited. |
| PAGE-005 | Pass | Created the first page with filename `index`; it became the project's homepage. |
| PAGE-013 | Pass | Opened the page directly in the visual editor at `/page-editor?pageId=index`. |
| EDIT-001 | Partial | Page, Header, Footer, widget canvas, and live preview loaded; deeper theme-setting coverage remains. |
| EDIT-008 | Pass | Added a Rich Text widget to the empty page from the available insertion point. |
| EDIT-034 | Partial | Text and select controls were edited successfully; the complete field-control matrix remains. |
| EDIT-038 | Pass | Opened the standalone preview at `/preview/index`. |
| EDIT-044 | Pass | Saved the Rich Text widget manually with the Save button. |
| EDIT-045 | Pass | Save became actionable after edits and returned to disabled after a successful save. |
| EDIT-049 | Partial | Reload preserved widget order, block order, `QA Intro`, centered alignment, and rendered values; explicit theme-setting mutation remains. |
| EDIT-050 | Pass | Built an empty page, saved it, previewed it, reloaded it, and saw the same content. |
| PREVIEW-003 | Pass | Switched standalone preview to mobile (`24rem`), reloaded with the width retained, then restored desktop (`100%`). |
| PREVIEW-006 | Partial | Header, main content, Footer, and theme styling rendered; menus and uploaded media remain to be tested. |

## Confirmed findings

- [QA-001 — Unnamed controls and keyboard-inaccessible options](../qa-issues/QA-001-unnamed-controls-and-keyboard-inaccessible-options.md) — High.
- [QA-002 — `.DS_Store` is treated as a widget directory](../qa-issues/QA-002-ds-store-treated-as-widget-directory.md) — Low.
- [QA-003 — Collection table ignores sorting and row-state props](../qa-issues/QA-003-collection-table-ignores-sort-and-row-props.md) — Medium.
- [QA-004 — Media view preference is not retained](../qa-issues/QA-004-media-view-preference-is-not-retained.md) — Low.
- [QA-005 — Blank required media alt text is saved](../qa-issues/QA-005-blank-required-media-alt-text-is-saved.md) — High.
- [QA-006 — Mixed media upload rejects the entire batch](../qa-issues/QA-006-mixed-media-upload-rejects-the-entire-batch.md) — Medium.
- [QA-007 — Invalid export settings are accepted](../qa-issues/QA-007-invalid-export-settings-are-accepted.md) — Medium.
- [QA-008 — `.DS_Store` files are copied into static exports](../qa-issues/QA-008-ds-store-files-are-copied-into-static-exports.md) — Low.
- [QA-009 — Export View and Download actions use the frontend SPA route](../qa-issues/QA-009-export-view-and-download-use-frontend-spa-route.md) — High.
- [QA-010 — Duplicate project folder is silently renamed during creation](../qa-issues/QA-010-duplicate-project-folder-is-silently-renamed.md) — Medium.
- [QA-011 — Editor Save remains enabled after Undo restores visible widget state](../qa-issues/QA-011-editor-save-remains-enabled-after-undo-restores-visible-widget-state.md) — Low.

## Automated baseline

| Check | Result | Evidence |
| --- | --- | --- |
| Backend test suite | Pass | 1,225 tests passed across 222 suites. |
| Frontend test suite | Pass | 548 tests passed across 51 files. |
| ESLint | Pass | `npm run lint` exited successfully. |
| Production build | Pass with warning | Build completed; Vite reported a 2,000.72 kB JavaScript chunk exceeding its 500 kB warning threshold. |

## Core-authoring wave progress

- Page search by title/filename, case-insensitive search, no-results feedback, individual selection, filtered select-all, selection persistence, repeatable duplication naming, single-delete cancel/confirm, and bulk-delete cancel/confirm passed.
- Page title/slug normalization, SEO metadata, canonical URL, robots behavior, reload persistence, and cancel-without-save passed.
- Editor page picker, cross-page switching, create-page entry, widget collapse/expand, rename cancel/accept, copy/paste, duplicate, delete shortcut, input-safe Backspace, block add/duplicate/delete, undo/redo, autosave, global Header/Footer editing, embedded responsive preview, and reload persistence passed.
- Rich-text bold, italic, bullet list, numbered list, link cancel/apply/remove, expanded mode, Escape, and Done passed.
- Theme group browsing, color, font search/selection, supported font weights, range control, custom CSS/head/footer code, save, live preview, and reload persistence passed.
- Menu empty state, create cancel/confirm, nested three-level structure, maximum-depth prevention, label/custom/internal-link entry, expand/collapse, structure save/reload, unsaved descendant deletion, duplicate-with-descendants, delete cancel/confirm, Header assignment, preview rendering, and title-change reference stability passed.
- News collection empty state, create cancel/confirm, title/date defaults, rich text, SEO, duplicate-slug rejection, search/no-results, selection, duplicate-with-content-and-SEO, slug change, and reload persistence passed. Collection preview and destructive list actions remain in progress.
- News collection preview plus single-delete and bulk-delete cancellation/confirmation passed.
- Duplicated the populated Shearline project into disposable `QA Media Regression 2026-06-22`; page, collection, menu, theme, and 54 media records copied without mutating the source project. Project detail editing, folder rename, site metadata, theme-update opt-in, and activation passed.
- Media list/grid switching, filename search, images/files filters, lightbox next/previous/Escape, URL copying, usage display, metadata cancel, metadata save, and title/alt rendering were exercised. View persistence and required-alt validation failed as QA-004 and QA-005.
- Uploaded and verified disposable PNG, JPG, GIF, WebP, SVG, PDF, and MP3 fixtures through the same multipart endpoint used by the web UI. Raster dimensions and configured thumbnails/sizes were generated. An SVG containing `<script>` and `onload` was stored with both removed. Mixed valid/invalid batch behavior failed as QA-006.
- Media usage refresh, unused-file single-delete cancel/confirm, used-file deletion protection, unused-file bulk-delete cancel/confirm, mixed used/unused bulk deletion, and cross-project media isolation passed. Mixed deletion removed only the unused file and reported the protected filename.
- Projects collection item creation, field persistence, featured-image selection, gallery image selection/removal, custom external link fields, `_blank` link behavior, reload, and collection-item preview passed in disposable item `QA Collection Project`.
- Site settings General coverage passed for image choose/remove, reveal-animation checkbox, date-format select, save, reset, reload persistence, and unsaved-state behavior.
- Site settings Colors coverage passed for text color input, reset, save, reload persistence, and restoration to the original accent color.
- Site settings Typography coverage passed for font-picker search/selection, font-weight select, range/number input, save, reload persistence, and restoration to original typography.
- Site settings Style coverage passed for select controls, save, reload persistence, and restoration to original style values.
- Site settings Social coverage passed for URL text input, reset, save, reload persistence, keyboard clearing, and restoration to blank.
- Site settings Advanced coverage passed for the privacy-font switch plus Custom CSS, Head Scripts, and Footer Scripts code fields, including save, reload persistence, and restoration to blank/disabled.
- Site settings unsaved-change guard passed: navigating to Pages with a dirty Social field triggered a native confirm; dismissing it kept the user on `/settings` with the unsaved value intact.
- Manage menu navigation to Project details, Projects, Themes, and General settings was present; General settings opened at `/app-settings`.
- App General settings date-format save/reload passed. Saving ISO `YYYY-MM-DD` updated Project-list dates to ISO, and the original `MMMM D, YYYY h:mm A` format was restored.
- App Media & Upload settings passed for max upload size, image quality, thumbnail width, thumbnail enable switch, save, reload persistence, and exact restoration. Theme-owned image-size replacement could not be exercised because neither installed theme currently defines `settings.imageSizes`.
- App Export & Versioning settings passed for Cancel discarding invalid unsaved values, valid save/reload persistence, and exact restoration. The invalid min/max UI still leaves Save enabled; tracked as QA-007 evidence.
- App Developer Tools passed for enabling Developer Mode, save, reload persistence, and restoration to disabled.
- App language change was not exercised because only English is available in the language selector.
- Export Site passed for empty state, first export without Markdown, second export with Markdown, success feedback, version history, version metadata, version sizes/statuses, history persistence, and configured retention label.
- Static export content checks passed for generated pages, collection item pages, manifest, sitemap, robots.txt, canonical/social metadata, sanitized SVG output, no obvious cross-project text leakage, and image asset loading.
- Markdown export passed: v1 contained 0 Markdown files, v2 contained 18 `.md` files plus HTML alternate links for pages and collection item pages.
- Direct backend export viewing passed: the v2 site loaded from `localhost:3001`, header internal navigation reached `services.html`, and the exported `projects/qa-collection-project.html` page retained QA text, images, and the `_blank` external link.
- Export ZIP generation passed at the backend endpoint; the downloaded ZIP contained the expected v2 static site and Markdown files. The UI download route itself failed and is tracked as QA-009.
- Export history deletion passed for v1: delete cancel preserved row/directory; delete confirm removed the row, SQLite export record, and `data/publish/qa-media-regression-2026-06-22-v1` while leaving v2 intact.
- Developer Mode export-history behavior passed for the no-issues case: enabling Developer Mode showed the Issues column with `—`; no `__export__issues.html` report existed to open. Developer Mode was restored to disabled.
- Projects lifecycle coverage passed for active-project delete protection (`Cannot delete active project` disabled), project-backup backend ZIP generation, import-modal open/cancel, valid backup import through the same multipart API used by the UI, imported project visibility with a new identity, and inactive imported-project delete cancel/confirm.
- Imported project cleanup passed: `QA Media Regression 2026-06-22 (Copy)` was removed from the UI, SQLite, and `data/projects/qa-media-regression-2026-06-22-copy`; the active project remained `QA Media Regression 2026-06-22`.
- Project backup ZIP included all expected content and metadata, but also included `.DS_Store` files; tracked under QA-008.
- Themes coverage passed for installed-theme list, name/version/author/usage display, preset screenshots/descriptions, preset gallery collapse/expand, Arch preset live-demo navigation, and delete protection for an in-use theme. Theme upload/update/delete of an unused theme was not mutated in this pass.
- Project import rejection passed for a non-ZIP upload through `/api/projects/import`: HTTP 400 `Only ZIP files are allowed` and no imported QA copy remained.
- Theme upload rejection passed for a non-ZIP upload through `/api/themes/upload`: HTTP 400 `Only ZIP files are allowed`. A multi-file non-ZIP upload also rejected with the same 400 response before mutating themes.
- Route and responsive safety checks passed: unknown route rendered the app 404 with Back to Dashboard, sidebar Site preview opened `/preview/index`, mobile viewport `390×844` rendered `/pages` without horizontal overflow, and the viewport was reset.
- Recent browser console check after the route/responsive sweep had no warnings or errors.
- An isolated settings-controller check confirmed out-of-range export retention/import limits are persisted; tracked as QA-007. The real application settings were not modified by this test.
- Project creation validation continued on 2026-06-23: blank title submission was blocked with `Project name is required`; invalid folder characters were blocked with `Folder name can only contain lowercase letters, numbers, and hyphens`; invalid website URLs were blocked with `Please enter a valid URL (e.g., https://mysite.com)`.
- Duplicate project-folder submission created and activated a disposable project with a suffixed folder instead of blocking or warning; tracked as QA-010. The disposable project `QA Project Validation 2026-06-23` and folder `qa-web-smoke-2026-06-22-1` were then deleted, and `QA Media Regression 2026-06-22` was restored as the active project.
- Project activation from the Projects action menu passed: `QA Media Regression 2026-06-22` was set active from an inactive state, and the Projects list updated the active badge correctly.
- Non-blank Arch preset creation passed for disposable project `QA Arch Seeded 2026-06-23`: creation from `/projects/add` activated the project, seeded 8 pages, seeded Main/Footer menus, exposed the expected collection types, enabled Site preview, and rendered the Arch homepage in `/preview/index`. Arch preset collection items and uploads were empty by design in this preset. The disposable project and `data/projects/qa-arch-seeded-2026-06-23` were deleted afterward, and `QA Media Regression 2026-06-22` was restored as active.
- Page-settings validation continued on `News`: blank title disabled Save; normalized filename input converted `Bad Slug!` to `bad-slug` and saved successfully, then was restored to `news`; duplicate slug `services` was blocked with `A page with the slug "services" already exists. Please choose a different slug.` without mutating the page.
- Page social-image workflow passed on `News`: selecting `qa-gallery.webp` from the media library enabled Save, persisted after reload, then **Remove image** saved and reloaded back to the original blank social-image state. The picker cards remain non-semantic clickable `div`s and are covered by QA-001.
- Widget field undo coverage on `New Clients` / **Image + Text** passed for visible restoration of image removal and `Image position` select changes, but Save remained enabled after Undo returned the visible controls to their original state; tracked as QA-011. Saving the restored state and reloading confirmed the original image and `Image position: End` remained intact.
- Widget field undo coverage on `Services` / **Icon Card Grid** reproduced QA-011 with a different control set: `Desktop columns` spinbutton/range and `Uppercase` switch visibly restored after Undo, but Save remained enabled with Undo disabled. The restored state was saved and reloaded, confirming `Desktop columns: 4`, `Uppercase` checked, and Save disabled.
- Services collection item field coverage passed for `Men's Cut`: icon picker open/search/select/cancel restored the original `user` icon; CTA Link URL autocomplete filtered to `Contact`, selecting the suggestion populated the link field; Open in new tab switch toggled; Cancel discarded the unsaved link/new-tab edits. The autocomplete suggestion is non-semantic and was added to QA-001.
- Rich-text media insertion controls on `Men's Cut` passed for picker routing: **Insert Image** opened an image-only media selector with JPG/PNG/GIF/WebP/SVG text and image fixtures; **Link to file** opened a file-only selector showing PDF/MP3 fixtures (`qa-document.pdf`, `qa-audio.mp3`) without marking the form dirty after close.

## Blocked or not run

- The raw minimal-PDF viewer interrupted browser control once. After the in-app browser was restarted, the session reconnected at `/media` and testing resumed without application or data loss.
- Stories outside the completed smoke/core-authoring slices remain not run.

## Run notes

- Existing non-QA projects will not be edited or deleted.
- A failure is logged only after the expected behavior is checked against the story and reproduced when safe.
- Disposable test data: project `QA Web Smoke 2026-06-22`, page `Home` (`index`), Rich Text widget `QA Intro`.
- The Rich Text widget used its default heading, paragraph, and button-group blocks; text alignment was changed to Center.
- Collection-list rendering emits React errors for unsupported table props; tracked as QA-003.
- Run continued on 2026-06-23 after restarting `npm run dev:all`; the active project was confirmed as `QA Media Regression 2026-06-22` before mutating settings.
- Smoke result count: 17 Pass, 6 Partial, 0 Fail.
- Full-charter execution remains in progress; the two confirmed findings above are tracked separately from the smoke result count.
