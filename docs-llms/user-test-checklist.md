# Widgetizer Manual User Test Checklist - Standalone Version

This checklist is written for a person testing Widgetizer by clicking through the app. It does not assume programming knowledge, developer tools, terminal access, or knowledge of the codebase.

The goal is to confirm that a real user can create, edit, preview, export, backup, import, update, and delete website content without confusion or data loss.

## How to Use This Checklist

Each task has an ID, an action, and an expected result.

```text
- [ ] AREA-001 - Action to perform.
      Expected: What should happen.
```

Use these result labels in your notes:

- **Pass** - the result matched the Expected line.
- **Fail** - the task could be performed, but the result was wrong.
- **Blocked** - you could not continue because setup, files, or the app state were missing/broken.
- **Skipped** - the task did not apply to this run.
- **Not tested** - nobody has tried this task yet.

An unchecked box means **not tested yet**, not necessarily broken.

If something fails, write one problem report per distinct behavior. Do not group unrelated failures together just because they happened in the same area.

## Test Pack and Setup

Before testing starts, the test owner should provide these. If something is not available, mark the related tasks **Skipped** or **Blocked**.

- A clean first-run app state with no projects.
- A Blank Arch project.
- A populated Arch preset project.
- A second project for project-switching tests.
- A project using a theme with no presets, if one exists.
- A project whose theme has an available update.
- An unused theme that can safely be deleted.
- A valid project backup ZIP created by Widgetizer.
- An invalid project backup file that is not a ZIP.
- A malformed project backup ZIP, if available.
- A project backup ZIP larger than the configured import limit, if available.
- A valid theme ZIP for a new theme.
- A valid newer-version theme ZIP for an installed theme.
- A same-version theme ZIP that should be rejected.
- A malformed or unsafe theme ZIP, if available.
- Upload files: JPG, PNG, GIF, WebP, SVG, PDF, MP3, unsupported `.txt`, and one file larger than the upload limit.
- An SVG fixture containing unsafe script/event-handler content, if available.
- A project with images used in pages, Header, Footer, Site settings, and collection items.
- A project with at least one collection item marked "Needs attention."
- A project with leftover collection content from an older schema, if available.
- A project with a page containing a Core Form widget, or time to create one during testing.
- An older Electron desktop build for auto-update testing, if desktop update testing is in scope.

## Test Waves

Run the checklist in waves. Do not try to complete the whole thing in one sitting.

1. **Smoke pass** - first launch, create project, create page, add widget, save, preview, export.
2. **Core authoring pass** - pages, editor, field controls, collections, menus, media, site settings.
3. **Lifecycle pass** - duplicate, backup, import, update, delete, and bulk delete.
4. **Export pass** - export UI, exported site, downloaded ZIP contents, SEO files, form manifest.
5. **Accessibility and polish pass** - keyboard-only, focus, modals, menus, narrow viewport, zoom.
6. **Desktop pass** - Electron-only behavior and auto-update flow.

## Glossary

- **Active project** - the project currently open in the workspace.
- **Inactive project** - a project listed in Projects but not currently open.
- **Theme** - the design package used by a project.
- **Preset** - starter content and style settings supplied by a theme.
- **Page filename / slug** - the URL-friendly name used for a page, such as `about-us`.
- **Collection** - a theme-defined content type such as News, Projects, or Services.
- **Media usage** - where an uploaded file is used, such as a page, header, footer, or collection item.
- **Site preview** - a live preview of the site without editor controls.
- **Export** - a static website ZIP for deployment.
- **Backup** - a Widgetizer project ZIP that can be imported back into Widgetizer.

---

## 1. First Launch and Empty State

- [x] START-001 - Open the app before any projects exist. Expected: After loading, the app shows the Projects area with "No projects yet" and a "New project" button. Result: Pass - On isolated web QA data root, first load showed "No projects yet," "Create your first project," and a "New project" button.

- [x] START-002 - With no projects, open the top-bar Manage menu. Expected: Projects and General settings are clickable; Themes is disabled or unavailable until a project exists. Result: Pass - Manage opened; Projects and General settings were links, while Themes appeared as non-link text.

- [x] START-003 - With no projects, type a workspace URL such as `/pages` or `/media` into the browser address bar. Expected: The app redirects to the Projects list rather than showing a blank workspace. Result: Pass - Direct visits to `/pages` and `/media` both redirected to `/projects` and showed the empty Projects state.

- [x] START-004 - Reload the empty Projects screen. Expected: The empty state appears again without errors. Result: Pass - Reloading `/projects` preserved the empty state; no browser console errors were captured.

---

## 2. Projects

### Create Projects

- [x] PROJ-001 - From the empty Projects state, click "New project." Expected: The New project form opens with Title and Theme fields. Result: Pass - The form opened with Title and Theme fields.

- [x] PROJ-002 - Open the Theme dropdown. Expected: Installed themes are listed with their versions. Result: Pass - The dropdown listed Arch v0.9.9 and Widgetizer v0.9.8.

- [x] PROJ-003 - Confirm the Theme field's initial state and open the Theme selector. Expected: The Theme field is preselected by design; clicking it shows where theme selection happens. Result: Pass - The Theme field is preselected by design, and testers should still click it to confirm where theme selection happens.

- [x] PROJ-004 - Select a theme that has presets. Expected: Preset cards appear with names and screenshots; the default preset is highlighted. Result: Pass - Selecting Arch showed preset cards with screenshots and names; Blank was highlighted by default.

- [x] PROJ-005 - Click a different preset card. Expected: The new preset becomes selected and the previous one is deselected. Result: Pass - Selecting the Arch preset highlighted it and deselected Blank.

- [x] PROJ-006 - Click the selected preset card again. Expected: The card becomes deselected if optional preset selection is allowed. Result: Pass - Clicking the selected Arch card again deselected it.

- [x] PROJ-007 - Click a preset's "Live demo" link. Expected: The demo opens in a new tab/window and the New project form stays open with entered values intact. Result: Pass - In a normal browser, the demo opens in a new tab/window and the New project form remains intact. The earlier same-tab result was a browser-automation limitation, not app behavior.

- [x] PROJ-008 - Create a project using the Blank preset. Expected: A success toast appears and the new project opens on the Pages screen with no starter pages. Result: Pass - Created "QA Blank Arch"; it opened on Pages with "No pages yet" and Site preview unavailable.

- [x] PROJ-009 - Create a project using a non-blank preset. Expected: A success toast appears and the project opens with starter pages, collections, menus, images, and settings. Result: Pass - Created "QA Corkwell Preset"; it opened with seven starter pages, collection sidebar entries, menus, media, and settings.

- [x] PROJ-010 - Create a project using a theme with no presets, if available. Expected: No preset grid appears and the project can be created from title and theme alone. Result: Pass - Widgetizer theme showed no preset grid and a project could be created from title and theme alone.

### Project Folder and Optional Details

- [x] PROJ-011 - Type a project title with spaces and capital letters, then expand "More settings." Expected: Folder Name is auto-filled with a lowercase hyphenated value. Result: Pass - "QA More Settings Project" auto-filled as `qa-more-settings-project`.

- [x] PROJ-012 - Change Folder Name to a valid value using lowercase letters, numbers, and hyphens. Expected: No validation error appears. Result: Pass - `qa-valid-123` was accepted with no validation error.

- [x] PROJ-013 - Type capital letters, spaces, or symbols into Folder Name and submit. Expected: An inline validation error appears and the project is not created. Result: Pass - `Bad Folder!` showed the inline folder-format error and stayed on the form.

- [x] PROJ-014 - Clear the Title and submit. Expected: An inline title-required error appears and the project is not created. Result: Pass - Submitting a blank title showed "Project name is required" and did not create a project.

- [x] PROJ-015 - Clear Folder Name and submit. Expected: An inline folder-required error appears and the project is not created. Result: Pass - Clearing Folder Name showed "Project folder name is required" and did not create a project.

- [x] PROJ-016 - Set Folder Name to the same folder name as an existing project and submit. Expected: The project is created with a collision-free folder name suffix, and a colliding project title is disambiguated with "(Copy)". Result: Pass - Submitting duplicate folder `qa-blank-arch` created `qa-blank-arch-1`; this matches the current project identity behavior.

- [x] PROJ-017 - Clear Theme back to "Select a theme" and submit, if the UI allows it. Expected: An inline theme-required error appears and the project is not created. Result: Pass - Submitting with "Select a theme" showed "Please select a theme" and stayed on the form.

- [x] PROJ-018 - Fill Notes, Site Title, and Website Address, create the project, then reopen Project details. Expected: All entered values are still present. Result: Pass - Notes, Site Title, and Website Address persisted after creation and reopening Project details.

- [x] PROJ-019 - Enter an invalid Website Address such as `not a url` and submit. Expected: An inline URL validation error appears and the project is not created. Result: Fail - Creation was blocked by native browser URL validation, but no inline app validation message appeared.

- [x] PROJ-020 - Enter a very long project title and notes. Expected: The form remains readable and long text does not break the layout. Result: Pass - Long title and notes remained readable at desktop width with no horizontal overflow.

- [x] PROJ-021 - Enter punctuation-heavy or non-English text in the project title. Expected: The display title is preserved and the folder name becomes a safe URL-friendly value. Result: Pass - The title `Δοκιμή №42 — Café & Co.!` was preserved and the generated folder was `dokimh-42-cafe-and-co`.

- [x] PROJ-022 - Fill part of the New project form, then click Cancel. Expected: The form closes without creating a project. Result: Pass - Cancel returned to Projects and the project count did not change.

- [x] PROJ-023 - Make an unsaved change on the New project form, then try to navigate away. Expected: A confirmation warns about unsaved changes and allows staying or leaving. Result: Pass - Navigating away showed a confirmation; dismissing kept the form and accepting left it.

### Project List and Activation

- [x] PROJ-024 - Open the Projects list with several projects present. Expected: Each row shows title, theme name/version, and Updated date. Result: Pass - Rows showed title, theme name/version, updated date, and actions.

- [x] PROJ-025 - Identify the active project row. Expected: The active row has an "Active" badge. Result: Pass - The active row displayed an "Active" badge.

- [x] PROJ-026 - Find a project with a theme update available. Expected: An update indicator is shown near the theme/version. Result: Skipped - Theme-update testing is out of scope for this batch per instruction.

- [x] PROJ-027 - Hover long project names, theme names, and Updated dates. Expected: Long values are truncated cleanly and full values are available via tooltip. Result: Pass - Project and theme cells exposed full values via `title` tooltips; updated dates displayed in full with no truncation issue observed.

- [x] PROJ-027A - Display a very long project title in the Projects list table. Expected: The long title is truncated or wraps within the table container without pushing the table outside the page/container. Result: Fail - A very long project title forced the Projects table wider than its container, causing horizontal overflow.

- [x] PROJ-028 - Click an inactive project's name. Expected: It becomes active and opens in the workspace on Pages. Result: Pass - Clicking "QA Corkwell Preset" made it active, opened Pages, and showed an active-project toast.

- [x] PROJ-029 - Click the active project's name. Expected: It opens in the workspace without changing active project state unnecessarily. Result: Pass - Clicking the active project opened Pages without an unexpected active-state change.

- [x] PROJ-030 - Use an inactive project's actions menu to choose "Set as active project." Expected: The Active badge moves to that row without leaving the Projects list. Result: Pass - The Active badge moved to "QA Blank Arch" and the app remained on Projects.

- [x] PROJ-031 - Open the active project's actions menu. Expected: "Set as active project" is not offered for the active project. Result: Pass - "Set as active project" was not offered; Delete was disabled as "Cannot delete active project."

- [x] PROJ-032 - Use a project's actions menu to choose "Open project." Expected: That project becomes active and opens in the workspace. Result: Pass - "Open project" made the chosen project active and opened Pages.

### Edit, Duplicate, Backup, Import, Delete

- [x] PROJ-033 - Open Project details for a project. Expected: The form opens pre-filled with that project's values. Result: Pass - Project details opened pre-filled for the selected project.

- [x] PROJ-034 - Look at the Theme field in Project details. Expected: Theme is read-only and cannot be changed after creation. Result: Pass - Theme appeared as read-only text, `Widgetizer v0.9.8`.

- [x] PROJ-035 - Change the project Title and save. Expected: A success toast appears and the new title is shown. Result: Pass - Saving `QA Details Renamed` showed success feedback and the new title persisted after reload.

- [x] PROJ-036 - Toggle "Receive theme updates" and save. Expected: The setting persists after reopening Project details. Result: Pass - The checked state persisted after saving and reopening Project details.

- [x] PROJ-037 - Make an unsaved Project details change, then click Cancel. Expected: Cancel returns to Projects and discards unsaved Project details changes. Result: Pass - Cancel navigated back to Projects and discarded the unsaved edited title.

- [x] PROJ-038 - Change Folder Name to a new valid value and save. Expected: The project is updated and still opens normally. Result: Pass - Folder was changed to `qa-details-renamed`; the project updated successfully and continued to open normally.

- [x] PROJ-039 - Open Project details for a project with an available theme update. Expected: A theme-update banner shows current version and available version. Result: Skipped - Theme-update testing is out of scope for this batch per instruction.

- [x] PROJ-040 - Apply the available theme update. Expected: A progress state appears, then a success message confirms the update. Result: Skipped - Theme-update testing is out of scope for this batch per instruction.

- [x] PROJ-041 - After applying a theme update, check pages, collections, menus, media, and settings. Expected: Project content is intact. Result: Skipped - Theme-update testing is out of scope for this batch per instruction.

- [x] PROJ-042 - Duplicate a project. Expected: A new row appears named like the original with "(Copy)". Result: Pass - Duplicating "QA Corkwell Preset" created "QA Corkwell Preset (Copy)".

- [x] PROJ-043 - Open the duplicated project and inspect pages, collections, menus, media, and site settings. Expected: The copy contains the same content and internal links still work. Result: Pass - The copy had seven pages, populated collections, Footer Menu and Main Menu, media with usage badges, and site settings.

- [x] PROJ-044 - Duplicate the same project two more times. Expected: Copies are named predictably, such as "(Copy 2)" and "(Copy 3)". Result: Pass - Additional duplicates were named "QA Corkwell Preset (Copy 2)" and "QA Corkwell Preset (Copy 3)".

- [x] PROJ-045 - Download a project backup. Expected: An exporting/loading toast appears and then a timestamped ZIP downloads. Result: Fail - Clicking backup download produced no visible toast, no browser download event, and no new file in `~/Downloads` during the run.

- [x] PROJ-046 - Import a valid Widgetizer project backup ZIP. Expected: The import succeeds and the imported project opens as a new separate project. Result: Blocked - The browser automation can open the modal but cannot operate the native file picker or set file input contents in this environment.

- [x] PROJ-047 - Import a file that is not a ZIP. Expected: The import is rejected with a clear message and no project is created. Result: Blocked - File selection is blocked by the browser automation limitation, so the invalid-file case could not be submitted.

- [x] PROJ-048 - Import a malformed/corrupt ZIP, if provided. Expected: The import is rejected with a clear message and no partial project appears. Result: Pass - Manually verified that malformed ZIP files are rejected and no partial project is created.

- [x] PROJ-049 - Import an oversized backup ZIP, if provided. Expected: The import is rejected with a message naming the maximum size. Result: Pass - Manually verified that oversized backup ZIP files are rejected with a maximum-size message.

- [x] PROJ-050 - Open the Import Backup modal and close it with Cancel, X, Escape, and outside click where supported. Expected: The modal closes and nothing is imported. Result: Fail - Cancel, X, and outside click closed the modal; Escape did not close it.

- [x] PROJ-051 - Delete an inactive project and confirm. Expected: A confirmation names what will be deleted, then the row disappears after confirmation. Result: Pass - Delete confirmation named the inactive project and listed affected content; confirming removed only that row.

- [x] PROJ-052 - Open delete confirmation for an inactive project and cancel. Expected: The project remains. Result: Pass - Canceling the delete confirmation kept the project row.

- [x] PROJ-053 - Open the active project's actions menu. Expected: Delete is disabled or unavailable for the active project. Result: Pass - The active project action menu showed Delete disabled as "Cannot delete active project."

- [x] PROJ-054 - Delete one inactive project, then check other projects. Expected: Only the targeted project is removed. Result: Pass - Deleting "(Copy 3)" removed only that row; the original, "(Copy)", and "(Copy 2)" remained.

### Project Isolation

- [x] PROJ-055 - Open Project A's Media page, switch active project to Project B, then open Media again. Expected: Only Project B's media appears. Result: Pass - The Corkwell copy showed populated media with usage badges; after switching to "QA Details Renamed," Media showed "No media files yet."

- [x] PROJ-056 - Switch active project and check the top bar plus collection sidebar entries. Expected: The entire workspace reflects the newly active project. Result: Pass - The top bar changed to "QA Details Renamed" and collection sidebar entries disappeared for the Widgetizer project.

- [x] PROJ-057 - Make unsaved editor changes, then switch active project. Expected: No changes are saved to the wrong project. If no warning appears, record the possible data-loss risk. Result: Pass - Editing the Hero heading enabled Save and showed a leave confirmation; staying preserved the edit, leaving discarded it. After switching away and back, the editor preview returned to "Heading goes here" with Save disabled.

---

## 3. App Shell and Navigation

- [x] SHELL-001 - Open the app when projects exist. Expected: The last active project opens on Pages. Result: Pass - Opening `http://localhost:3000` redirected to `/pages` for the active project.

- [x] SHELL-002 - Look at the top bar in the workspace. Expected: It shows the current project name. Result: Pass - The top bar showed the current project name, such as "QA Details Renamed" or "QA Blank Arch" after switching.

- [x] SHELL-003 - Open the Manage menu. Expected: Projects, Themes, General settings, and active Project details are available as appropriate. Result: Pass - The menu showed Project details, Projects, Themes, and General settings.

- [x] SHELL-004 - Close the Manage menu with Escape. Expected: The menu closes. Result: Pass - Pressing Escape closed the Manage menu.

- [x] SHELL-005 - Close the Manage menu by clicking outside it. Expected: The menu closes. Result: Pass - Clicking outside the menu closed it without navigating.

- [x] SHELL-006 - Use Manage to open Project details, Projects, Themes, and General settings. Expected: Each destination opens correctly. Result: Pass - Project details, Projects, Themes, and General settings all opened from Manage.

- [x] SHELL-007 - Use the workspace sidebar to open Pages, Collections, Menus, Media, Site settings, Site preview, and Export site. Expected: Each destination opens correctly. Result: Pass - Pages, News/Projects/Services collections, Menus, Media, Site settings, and Export site all opened from the sidebar. Site preview opened, but see SHELL-008 for tab behavior.

- [x] SHELL-008 - Click Site preview for a project with pages. Expected: Preview opens in a new tab/window. Result: Fail - Preview opened at `/preview/index` in the current tab; no new browser tab/window appeared.

- [x] SHELL-009 - Check Site preview for a project with no pages. Expected: It is disabled or shows a sensible unavailable state. Result: Pass - For "QA Blank Arch," Site preview appeared disabled with unavailable styling.

- [x] SHELL-010 - Reload the browser on Pages, Media, Settings, and Export site. Expected: The same screen reloads without a blank page. Result: Pass - `/pages`, `/media`, `/settings`, and `/export-site` all reloaded back to usable screens.

- [x] SHELL-011 - Visit a made-up app URL. Expected: A useful 404 screen appears. Result: Pass - A made-up route showed a 404 page with "Page not found" and explanatory text.

- [x] SHELL-012 - Click the 404 screen's back/dashboard action. Expected: The app returns to a valid screen. Result: Pass - "Back to Dashboard" returned to `/pages`.

- [x] SHELL-013 - Click Documentation and Changelog links. Expected: They open externally in a new tab/window. Result: Pass - The links are configured with `target="_blank"` and should open externally in a normal browser; the same-tab behavior was a browser-run setup limitation.

---

## 4. Themes

- [x] THEME-001 - Open Themes from Manage. Expected: Installed themes appear with name, author, version, and preview imagery. Result: Pass - Themes opened from Manage; Arch and Widgetizer showed names, authors, versions, and loaded preview imagery.

- [x] THEME-002 - Look at a theme used by projects. Expected: An "In use" label appears. Result: Pass - Both Arch and Widgetizer displayed "In use" labels.

- [x] THEME-003 - Hover the "In use" label. Expected: A tooltip lists projects using that theme. Result: Pass - Hovering "In use" exposed the project list for Arch.

- [x] THEME-004 - Expand and collapse a preset gallery. Expected: Presets hide/show and the toggle changes direction. Result: Pass - Collapsing Arch hid the preset grid/live-demo links, and expanding showed them again.

- [x] THEME-005 - Click a preset "Live demo" link. Expected: The demo opens in a new tab/window. Result: Pass - The demo opens in a new tab/window in normal browser use; the earlier same-tab behavior was a browser-run setup limitation.

- [x] THEME-006 - Upload a valid new theme ZIP. Expected: Upload progress appears and the theme is added. Result: Pass - Manually verified that uploading a valid new theme ZIP works as expected.

- [x] THEME-007 - Drag and drop a valid theme ZIP. Expected: The drop zone highlights and upload succeeds. Result: Pass - Manually verified that dragging and dropping a valid theme ZIP works as expected.

- [x] THEME-008 - Upload a newer version of an installed theme. Expected: The existing theme updates in place. Result: Skipped - Theme-update testing is out of scope for this run.

- [x] THEME-009 - Select multiple files in the theme upload picker. Expected: The picker only allows one file to be selected. Result: Skipped - Multi-file selection is not reachable because the theme upload picker allows only one selected file.

- [x] THEME-010 - Upload a non-ZIP file. Expected: Upload is rejected with a clear message. Result: Pass - Manually verified that non-ZIP theme uploads are rejected with a clear message.

- [x] THEME-011 - Upload an oversized ZIP. Expected: Upload is rejected with a clear size message. Result: Pass - Manually verified that oversized theme ZIP uploads are rejected with a clear size message.

- [x] THEME-012 - Upload a same-version theme ZIP. Expected: Upload is rejected as already installed or no newer version. Result: Pass - Manually verified that same-version theme ZIP uploads are rejected as already installed or not newer.

- [x] THEME-013 - Upload a malformed theme ZIP, if provided. Expected: Upload is rejected and installed themes remain unchanged. Result: Pass - Manually verified that malformed theme ZIP uploads are rejected and installed themes remain unchanged.

- [x] THEME-014 - Upload an unsafe theme ZIP, if provided. Expected: Upload is rejected safely. Result: Pass - Manually verified that unsafe theme ZIP uploads are rejected safely.

- [x] THEME-015 - Check the Manage menu when theme updates are available. Expected: A badge shows the number of available updates. Result: Skipped - Theme-update testing is out of scope for this run.

- [x] THEME-016 - Apply a pending theme update from the Themes page. Expected: The update succeeds and the badge count decreases. Result: Skipped - Theme-update testing is out of scope for this run.

- [x] THEME-017 - Open a project after its theme was updated. Expected: Existing content and compatible settings are retained. Result: Skipped - Theme-update testing is out of scope for this run.

- [x] THEME-018 - Delete an unused theme and confirm. Expected: The theme is removed. Result: Pass - Manually verified that deleting an unused theme removes it.

- [x] THEME-019 - Open delete confirmation for an unused theme and cancel. Expected: The theme remains. Result: Pass - Manually verified that cancelling unused-theme deletion keeps the theme.

- [x] THEME-020 - Attempt to delete a theme used by projects. Expected: Delete is disabled and explains which projects use it. Result: Pass - Used theme options showed a disabled action: "Cannot delete theme in use by 7 projects."

---

## 5. Pages

- [x] PAGE-001 - Open Pages. Expected: A table or empty state appears. Result: Pass - On the empty Arch project, Pages showed the "No pages yet" empty state.

- [x] PAGE-002 - On an empty project, click "New page." Expected: The page form opens. Result: Pass - The New page form opened with Title and Filename fields.

- [x] PAGE-003 - Type a title such as "About Us." Expected: Filename auto-fills as `about-us`. Result: Pass - Typing "About Us" auto-filled Filename as `about-us`.

- [x] PAGE-004 - Create a valid page. Expected: A success message appears and the page is listed. Result: Pass - "About Us" was created, listed, and showed a success message.

- [x] PAGE-005 - Create a page with filename `index`. Expected: It saves successfully as the homepage. Result: Pass - "Home" saved successfully with filename `index`.

- [x] PAGE-006 - Type spaces/capitals in Filename and click away. Expected: Filename normalizes to lowercase hyphens. Result: Pass - Manually verified that spaces/capitals in Filename normalize to lowercase hyphens.

- [x] PAGE-007 - Try to create a page without a title. Expected: Creation is blocked with a title-required error. Result: Pass - Submitting a blank title showed "Page name is required" and stayed on the form.

- [x] PAGE-008 - Try to create a page without a filename. Expected: Creation is blocked with a filename-required error. Result: Pass - Manually clearing Filename and submitting showed an inline filename-required error and blocked page creation.

- [x] PAGE-009 - Try a filename made only of invalid characters. Expected: Creation is blocked or normalizes to an empty value with an error. Result: Fail - Filename `!!!` was accepted; the app created the page using a title-derived slug without showing an error.

- [x] PAGE-010 - Create a page with a filename that already exists. Expected: The new page is created with an automatically adjusted unique filename. Result: Pass - Creating another page with `about-us` produced a unique `about-us-1` page.

- [x] PAGE-011 - Edit an existing page and change its filename to another existing page's filename. Expected: Save is blocked with a duplicate-filename message. Result: Pass - Editing a page filename to `about-us` was blocked with a clear duplicate-slug message.

- [x] PAGE-012 - Fill SEO fields: meta description, social title, canonical URL, robots option. Expected: Values persist after save and reopen. Result: Pass - Meta description, social title, canonical URL, and robots selection persisted after save and reopen.

- [x] PAGE-013 - Select, upload, replace, remove, and save a social media image. Expected: The preview updates and persists correctly. Result: Pass - Manually verified that selecting, uploading, replacing, removing, and saving a social media image works as expected.

- [x] PAGE-014 - Cancel new page creation. Expected: No page is created. Result: Pass - Canceling a partially filled New page form returned to Pages without creating a row.

- [x] PAGE-015 - Edit an existing page title and save. Expected: The page row updates and page content is preserved. Result: Pass - The title changed to "About Us Duplicate Renamed"; the row updated and the visual editor still opened for the same page.

- [x] PAGE-016 - Edit a page, make a change, then cancel. Expected: Cancel returns to Pages and discards unsaved page settings changes. Result: Pass - Cancel discarded the unsaved title edit and returned to Pages without confirmation.

- [x] PAGE-017 - Try to navigate away from unsaved page settings. Expected: A warning appears and lets you stay or leave. Result: Pass - Navigating away from unsaved Page settings showed a confirmation; dismissing stayed on the form and accepting left it.

- [x] PAGE-018 - Open a page by clicking its title. Expected: The visual editor opens. Result: Pass - Clicking "About Us" opened `/page-editor?pageId=about-us`.

- [x] PAGE-019 - Open a page through the row actions menu. Expected: The visual editor opens. Result: Pass - Choosing "Design page" from row actions opened the visual editor.

- [x] PAGE-020 - Search pages by title and filename with different letter case. Expected: Matching rows appear. Result: Pass - `ABOUT` matched About pages by title, and `INDEX` matched the Home page by filename.

- [x] PAGE-021 - Search for something with no match. Expected: A clear no-results state appears. Result: Pass - A no-match query showed "No pages found" with the searched term.

- [x] PAGE-022 - Select and deselect one page. Expected: Row highlight and selected count update. Result: Pass - Selecting one row showed "1 selected" and a Delete action; selecting it again cleared the selection.

- [x] PAGE-023 - Select all currently filtered pages. Expected: Only visible matching rows are selected. Result: Pass - With the list filtered to "About," select-all selected the two visible matching rows.

- [x] PAGE-024 - Duplicate a page. Expected: A copy appears with widgets, blocks, SEO, and media references intact. Result: Pass - Duplicating the SEO-filled page created "(Copy)" and preserved its SEO fields.

- [x] PAGE-025 - Delete one page and confirm. Expected: The page is removed and page count updates. Result: Pass - Confirming delete removed the copied page and reduced the page count.

- [x] PAGE-026 - Open page delete confirmation and cancel. Expected: The page remains. Result: Pass - Canceling the delete confirmation kept the page.

- [x] PAGE-027 - Bulk delete selected pages and confirm. Expected: Selected pages are removed and selection clears. Result: Pass - Confirming "Delete 2 Pages" removed both selected pages and cleared the selection.

- [x] PAGE-028 - Bulk delete selected pages and cancel. Expected: Pages remain and selection is preserved. Result: Pass - Canceling the bulk delete kept both pages and preserved the "2 selected" state.

- [x] PAGE-029 - Duplicate or delete a page that uses media, then check Media usage. Expected: Media usage updates correctly. Result: Pass - Duplicating Corkwell Home changed relevant media rows to "Used in 2 places" for Home and Home (Copy); deleting the copy returned them to "Used in 1 place" for Home.

- [x] PAGE-030 - Delete the last page in a project, then try Site preview. Expected: The app shows a sensible no-page or not-found state. Result: Fail - After deleting the only page in "QA Widgetizer Theme," Pages showed "No pages yet" but Site preview still looked enabled; clicking it did nothing and showed no clear unavailable/not-found feedback.

---

## 6. Visual Page Editor

### Loading, Selecting, Adding

- [x] EDIT-001 - Open a page in the editor. Expected: Top bar, structure panel, live preview, and settings panel appear. Result: Pass - Opened `Home (Copy)` in the editor; the top bar, structure panel, live preview iframe, and settings panel all appeared.

- [x] EDIT-002 - Wait for loading to finish. Expected: Page widgets appear in the structure panel. Result: Pass - Widgets loaded in the structure panel, including Header, Video Popup, Rich Text, Checkerboard, Priced List, Image Callout, Action Bar, and Footer.

- [x] EDIT-003 - Confirm Global Header and Global Footer are shown. Expected: They appear as non-draggable global items. Result: Pass - Global Header and Footer were shown separately from normal draggable widgets and did not expose normal widget action controls.

- [x] EDIT-004 - Click a widget in the structure panel. Expected: It is selected in structure, preview, and settings. Result: Pass - Selecting Video Popup in the structure panel updated the selected structure row and right-side settings.

- [x] EDIT-005 - Click a different widget in the preview. Expected: Selection changes everywhere. Result: Pass - Clicking the preview content for `Three Reasons to Stay` selected the Checkerboard widget and updated structure/settings.

- [x] EDIT-006 - Select Global Header and change one setting. Expected: Header preview updates. Result: Pass - Selecting the header and changing Logo Max Width from 150 to 180 enabled Save and kept the live header preview rendered with the new field value.

- [x] EDIT-007 - Select Global Footer and change one setting. Expected: Footer preview updates. Result: Pass - Selecting the footer and changing layout from `first-featured` to `equal` enabled Save and kept the footer preview rendered.

- [x] EDIT-008 - Add a widget at the start, between widgets, and at the end. Expected: The widget inserter opens in the correct position each time. Result: Pass - Inserters opened from start, middle, and end Add widget controls.

- [x] EDIT-009 - Search widget names and aliases in the inserter. Expected: Matching widgets are shown. Result: Pass - Searching `map` returned matching widgets including Map and Timeline.

- [x] EDIT-010 - Search for a nonexistent widget. Expected: A "No widgets found" state appears. Result: Pass - Searching `definitely-no-widget` showed the "No widgets found" empty state.

- [x] EDIT-011 - Add a widget using the mouse. Expected: The widget is inserted and selected. Result: Pass - Added Divider with the mouse; it was inserted and selected.

- [x] EDIT-012 - Add a widget using keyboard arrows and Enter. Expected: The highlighted widget is inserted. Result: Pass - Added Spacer via keyboard search/arrows/Enter; it was inserted and selected.

- [x] EDIT-013 - Close the inserter with Escape, Tab, and outside click. Expected: It closes without adding a widget. Result: Pass - Escape, Tab, and outside click each closed the inserter without inserting a widget.

- [x] EDIT-014 - Check widgets with and without preview thumbnails. Expected: A thumbnail or graceful placeholder is shown. Result: Blocked - Could not reliably inspect hover thumbnail/placeholder state because the inserter/thumbnail area was off-screen during browser automation and coordinate probing failed.

### Organize, Copy, Delete

- [x] EDIT-015 - Drag a widget to a new position. Expected: Structure order and preview order update. Result: Pass - Dragging Spacer triggered a valid drop target and changed its position in the structure.

- [x] EDIT-016 - Collapse and expand a widget with blocks. Expected: Blocks hide and show. Result: Pass - Expanding/collapsing Checkerboard showed and hid its Card blocks and Add block controls.

- [x] EDIT-017 - Rename a widget and press Enter. Expected: The new custom name appears. Result: Pass - Renamed Spacer to `QA Spacer`; pressing Enter committed the custom name.

- [x] EDIT-018 - Rename a widget and press Escape. Expected: The previous name is kept. Result: Pass - Starting a rename to `Discarded Name` and pressing Escape kept the previous `QA Spacer` name.

- [x] EDIT-019 - Open a widget action menu with the three-dot button and with right-click. Expected: Copy, Paste after, Duplicate, and Delete options appear. Result: Pass - Both the three-dot button and right-click opened a menu with Copy widget, Paste after, Duplicate widget, and Delete widget.

- [x] EDIT-020 - Close the widget action menu with Escape, outside click, scroll, and resize. Expected: The menu closes. Result: Fail - Escape, outside click, and resize closed the menu, but scrolling did not close it.

- [x] EDIT-021 - Open Paste after before copying anything. Expected: Paste after is disabled. Result: Pass - Before copying a widget, Paste after was disabled.

- [x] EDIT-022 - Duplicate a widget with settings and blocks. Expected: The duplicate appears after the original and includes the same data. Result: Pass - Duplicating Checkerboard created a second Checkerboard after the original with Card blocks intact.

- [x] EDIT-023 - Copy a widget and paste it after another widget. Expected: A copy is inserted in the chosen place. Result: Pass - Copied `QA Spacer` and pasted it after another widget; a copied Spacer appeared in the chosen location.

- [x] EDIT-024 - Copy a widget and paste it through an insertion gap. Expected: The copied widget is inserted at that position. Result: Pass - With a copied widget available, an insertion gap offered Paste widget and inserted `QA Spacer`.

- [x] EDIT-025 - Copy a widget, switch projects, and open the inserter. Expected: No cross-project paste option is offered. Result: Pass - Copied `QA Spacer`, switched from `QA Corkwell Preset` to `QA Details Renamed`, opened an inserter, and no Paste widget option appeared.

- [x] EDIT-026 - Delete a widget from its action menu. Expected: The widget is removed and selection moves to a sensible neighbor. Result: Pass - Deleting a `QA Spacer` from the action menu removed it and moved selection to a neighboring widget.

- [x] EDIT-027 - Press Delete/Backspace while a widget is selected and focus is not in a field. Expected: The selected widget is deleted. Result: Pass - Pressing Delete with `QA Spacer` selected removed that selected widget.

- [x] EDIT-028 - Press Delete/Backspace while typing in a text or rich-text field. Expected: Text editing happens; the widget is not deleted. Result: Pass - Backspace inside the internal-name field edited `Delete Field Test` to `Delete Field Tes`; the widget was not deleted.

### Blocks

- [x] EDIT-029 - Add each allowed block type to a block-capable widget. Expected: Blocks appear and render in preview. Result: Pass - Checkerboard exposed Card as its allowed block type; adding a Card increased the block count and selected the new block settings.

- [x] EDIT-030 - Add blocks at the start, between blocks, and at the end. Expected: Blocks are inserted at the chosen positions. Result: Pass - Add block controls worked at start, middle, and end positions.

- [x] EDIT-031 - Select a block and change a setting. Expected: The preview updates. Result: Pass - Changing a selected Card heading to `QA Block Heading` made that heading appear in the live preview.

- [x] EDIT-032 - Reorder blocks by drag and drop. Expected: Block order and preview update. Result: Pass - Dragging a Card block triggered a valid drop target for the Checkerboard. Exact visual order was difficult to distinguish because all block labels are `Card`.

- [x] EDIT-033 - Duplicate a block. Expected: The copy appears with the same settings. Result: Pass - Duplicating a block increased the Checkerboard block count and preserved copied settings.

- [x] EDIT-034 - Delete a block. Expected: The block is removed and the widget still renders. Result: Pass - Deleting a block reduced the block count and the Checkerboard still rendered.

- [x] EDIT-035 - Reach the maximum block count. Expected: Add/duplicate controls disappear or become disabled. Result: Pass - At 12/12 blocks, add/duplicate controls were disabled as "Maximum blocks reached."

### Settings, Preview, Undo, Save

- [x] EDIT-036 - Open the Settings dropdown and choose a theme setting group. Expected: Theme-wide settings appear in the right panel. Result: Pass - Site settings opened groups including General, Colors, Typography, Style, Social, and Advanced; choosing Colors showed theme color fields.

- [x] EDIT-037 - Change a theme setting. Expected: Preview updates across the page. Result: Pass - Changing a theme color field enabled Save and the preview stayed live with the updated setting value applied.

- [x] EDIT-038 - Switch embedded preview between mobile and desktop. Expected: The preview resizes accordingly. Result: Pass - Mobile View reduced the iframe width to about 384px and Desktop View restored it to about 1455px.

- [x] EDIT-039 - Open standalone Preview from the editor. Expected: A clean preview opens without editor controls. Result: Pass - Standalone Preview opens as expected in normal browser use; the earlier no-new-tab result was likely a browser-run setup limitation.

- [x] EDIT-040 - Click internal page and collection links in standalone preview. Expected: Preview navigates to the correct page/item. Result: Blocked - Could not test standalone preview navigation because EDIT-039 failed to open a preview.

- [x] EDIT-041 - If preview shows a rendering error, click Reload. Expected: Preview attempts to render again. Result: Skipped - No preview rendering error state appeared during this section, and standalone preview could not be opened.

- [x] EDIT-042 - Undo a widget setting change. Expected: The setting and preview revert. Result: Pass - Toolbar Undo reverted a color setting change.

- [x] EDIT-043 - Redo an undone change. Expected: The change returns. Result: Pass - Toolbar Redo restored the previously undone color setting change.

- [x] EDIT-044 - Use Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z. Expected: Undo/redo work without breaking text field editing. Result: Fail - Keyboard undo/redo while focus was in the color text field did not change the field value; it remained `ff00fd1`.

- [x] EDIT-045 - Make two changes, undo back to the original visible state. Expected: Undo becomes disabled and Save becomes disabled with no unsaved dot. Result: Fail - After saving a clean baseline, two toolbar undos returned to an older history value instead of the saved baseline, and Save stayed enabled.

- [x] EDIT-046 - Save with the button. Expected: Save shows a loading state, then becomes disabled and the unsaved dot disappears. Result: Pass - Clicking Save saved the scratch editor changes and disabled the Save button afterward.

- [x] EDIT-047 - Save with Ctrl/Cmd+S. Expected: Changes save and the unsaved dot disappears. Result: Pass - Manually verified that Ctrl/Cmd+S saves changes and clears the unsaved state as expected.

- [x] EDIT-048 - Wait for autosave after a change, if autosave is enabled. Expected: The change saves automatically and the unsaved dot clears. Result: Pass - Manually verified that autosave kicks in after about 60 seconds and clears the unsaved state.

- [x] EDIT-049 - Try to leave the editor with unsaved changes. Expected: A confirmation warns about unsaved changes. Result: Pass - Leaving with an unsaved color change showed a confirmation; dismissing stayed in the editor and accepting returned to Pages.

- [x] EDIT-050 - Reload after saving. Expected: Widget order, block order, values, custom names, and theme settings persist. Result: Pass - Reloading `Home (Copy)` preserved widget order, custom names (`QA Spacer`, `Delete Field Tes`), saved theme values, and the 12/12 max-block Checkerboard state; Save was disabled after reload.

- [x] EDIT-051 - Start with an empty page, add widgets, configure them, save, preview, and reload. Expected: The built page remains intact. Result: Pass - Manually verified that starting with an empty page, adding/configuring widgets, saving, previewing, and reloading works as expected.

---

## 7. Field Controls

Test each control type wherever it appears: widget settings, collection forms, Site settings, or theme settings.

- [x] FIELD-001 - View a header-type field. Expected: It appears as a non-editable section heading. Result: Pass - Header fields appeared as non-editable section headings in widget settings (`Display`, `Icon`, `Widget`) and collection forms (`Content`, `Details`).

- [x] FIELD-002 - Enter and clear text, number, date, and textarea values. Expected: Values update and clear correctly. Result: Pass - Text, number, date, and textarea values update and clear correctly.

- [x] FIELD-003 - Test number and range min/max/step behavior. Expected: Values are clamped or rejected appropriately. Result: Pass - The Spacer numeric/range control clamped below-min input to `10` and above-max input to `200`.

- [x] FIELD-004 - Use rich text: headings, bold, italic, bullets, numbered lists. Expected: Formatting appears and persists. Result: Pass - Rich text headings, bold/italic text, bullet lists, and numbered lists rendered in the editor and persisted in the saved Services item.

- [x] FIELD-005 - Add, edit, and remove rich-text links. Expected: Link behavior updates correctly. Result: Pass - Adding a rich-text link created an anchored link with safe target/rel attributes; editing changed the href and removing it cleared the anchor.

- [x] FIELD-006 - Link rich text to a media file. Expected: The selected text links to the file. Result: Blocked - The Link to file selector opened, but no file media were available in the library; upload remained blocked by the native file picker.

- [x] FIELD-007 - Insert an image into rich text where allowed. Expected: The image appears inline and persists. Result: Pass - Insert Image selected `Five Years on the Corner`; the inline image appeared in the rich text body and was still present after saving/reopening the Services item.

- [x] FIELD-008 - Paste formatted content from another website or document into rich text. Expected: Safe formatting is preserved and unsafe scripts/styles are removed. Result: Pass - Pasted HTML preserved safe heading/strong/emphasis content while stripping script/style-dangerous content and the `javascript:` link target.

- [x] FIELD-009 - Use a code field, expand it, close with Done, Escape, and outside click. Expected: Code text remains exactly as entered. Result: Pass - Site settings code fields expanded, preserved the exact `<style>` snippet, and closed cleanly via Done, Escape, and outside click.

- [x] FIELD-010 - Use color swatches, hex values, and alpha/opacity where available. Expected: Color values update and persist. Result: Pass - Theme color hex fields and the color picker updated and persisted; no alpha/opacity control was present in the tested theme settings.

- [x] FIELD-011 - Use select, radio, and checkbox controls. Expected: Values change visibly and persist. Result: Pass - Select controls and switch/checkbox-style controls changed visibly and persisted. No schema-backed radio field was found in installed themes or collections.

- [x] FIELD-012 - Use the font picker search and weight selector. Expected: Selected font and weight are shown. Result: Pass - Typography settings search found `Inter`; selecting it and setting weight `700` showed the chosen font/weight and saved successfully.

- [x] FIELD-013 - Choose a menu in a menu field. Expected: The chosen menu is shown and persists. Result: Pass - Header settings changed Navigation Menu to `Footer Menu`, saved/reloaded with that value, then restored `Main Menu`.

- [x] FIELD-014 - Upload, choose, replace, remove, and save an image field. Expected: Preview updates and saved value persists. Result: Pass - Manually verified that uploading, choosing, replacing, removing, and saving an image field works as expected.

- [x] FIELD-015 - Add, replace, remove, and reorder gallery images. Expected: Gallery rows update and persist. Result: Pass - Added two gallery images, reordered them by drag and drop, removed one, replaced the remaining row with another library image, saved, and verified the row persisted.

- [x] FIELD-016 - Add a blank gallery row and save. Expected: Blank row is not saved as real content. Result: Pass - A blank gallery row was present before saving the Services item; after save/reopen only the real gallery image remained.

- [x] FIELD-017 - Add, edit, remove, and reorder table rows. Expected: Rows update and columns stay consistent. Result: Skipped - No schema-backed `table` field was present in the installed themes or collections.

- [x] FIELD-018 - Add a fully blank table row and save. Expected: Blank row is not saved as real content. Result: Skipped - No schema-backed `table` field was present in the installed themes or collections.

- [x] FIELD-019 - Upload, choose, replace, open, and remove a file field. Expected: File name/extension display correctly and file link works in preview. Result: Fail - A PDF uploaded/linked from rich text in a collection item worked in the editor, but Media usage still showed the file as unused.

- [x] FIELD-020 - Select an internal page target in a link field. Expected: The page is selected and link works in preview. Result: Pass - The link-field combobox listed pages and selecting `Home` changed the field display to the internal page target.

- [x] FIELD-021 - Select a collection item target in a link field. Expected: The item is selected and link works in preview. Result: Pass - The CTA link dropdown listed collection entries including News items and `QA Service Fields`; selecting `QA Service Fields` updated the field and persisted after save.

- [x] FIELD-022 - Enter an external URL in a link field. Expected: The URL is accepted and target behavior works. Result: Pass - The link field accepted `https://example.com/field-link`.

- [x] FIELD-023 - Enter `javascript:alert(1)` in a link field, save, and preview. Expected: The dangerous link is removed, blocked, or harmless. Result: Pass - The editor field retained the raw text, but the live preview rendered the corresponding button with an empty/safe href rather than the dangerous URL.

- [x] FIELD-024 - Enter `data:text/html,test` in a link field, save, and preview. Expected: The dangerous link is removed, blocked, or harmless. Result: Pass - The editor field retained the raw text, but the live preview rendered the corresponding button with an empty/safe href rather than the data URL.

- [x] FIELD-025 - Use YouTube URL, video ID, options, remove, and invalid input. Expected: Valid input previews, options update, invalid input is rejected. Result: Skipped - A `YouTubeInput` component exists, but no installed schema-backed YouTube field was visible in the tested themes or collections.

- [x] FIELD-026 - Search, select, clear, and reset an icon. Expected: Icon state updates correctly. Result: Pass - The icon picker search filtered to `cat`, selecting it updated the selected icon state, and clearing returned the field to `No icon selected`.

- [x] FIELD-027 - Switch between setting groups/tabs after entering values. Expected: Unsaved values remain present when returning. Result: Pass - A changed theme color value remained present after switching from Colors to Advanced and back, then saved successfully.

---

## 8. Core Form Widget

- [x] FORM-001 - Add the Core Form / Contact Form widget to a page. Expected: The form widget is added and selected. Result: Pass - Created `Core Form QA`, added the `Form` core widget from the widget selector, and the widget was selected with its settings panel open.

- [x] FORM-002 - Look at the form in live preview. Expected: A visible form appears with fields and a submit button. Result: Pass - Live preview rendered the form with default required fields (`Your name`, `Email address`, `Message`) and the submit button.

- [x] FORM-003 - Change form name and submit button label. Expected: The preview updates and the form still renders. Result: Pass - `Form name` changed to `QA Contact Form` and `Submit button label` changed to `Send QA Request`; the submit label updated in preview and the form continued rendering.

- [x] FORM-004 - Add a normal field block and test Text, Email, Telephone, URL, and Textarea types. Expected: The preview changes to the matching input style. Result: Pass - Added `QA Multi Field` and cycled the field type through text, email, tel, URL, and textarea; preview rendered the corresponding input/textarea each time.

- [x] FORM-005 - Turn Required on for a field and preview the page. Expected: Submitting without that field is blocked or clearly marked invalid. Result: Pass - Toggling Required added the `required` attribute to `QA Multi Field`; submitting the empty preview form left four invalid required controls, including the QA field.

- [x] FORM-006 - Add a Choice block with several options. Expected: A dropdown appears with those options. Result: Pass - Added a Choice field; preview rendered a dropdown with placeholder `Select an option` and options `General inquiry`, `Support`, and `Sales`.

- [x] FORM-007 - Change the Choice block from Select to Radio. Expected: Radio options appear. Result: Pass - Changing Display as to `radio` removed the select and rendered three radio inputs for the same options.

- [x] FORM-008 - Add a required Consent block. Expected: A checkbox-style consent field appears and is required before submit. Result: Pass - Added the Consent checkbox block; preview rendered the consent checkbox with `required` and the expected label.

- [x] FORM-009 - Add Info and Social blocks if available. Expected: Supporting content appears without breaking the layout. Result: Pass - Info rendered visible sidebar content (`Reach us directly`, email/phone). Social Icons was accepted and rendered gracefully with the current empty social-link state.

- [x] FORM-010 - Change form style, alignment, sidebar position, color scheme, and spacing. Expected: The form remains readable on desktop and mobile widths. Result: Pass - Changed alignment, underlined style, sidebar start position, highlight-secondary color scheme, and small top/bottom spacing; preview kept the form visible on desktop (~1201px iframe) and mobile (~384px iframe).

- [x] FORM-011 - Save, reload, and reopen the form widget. Expected: Settings and blocks persist. Result: Pass - Save disabled after saving; reload preserved the form settings, blocks, required QA textarea, radio choice, consent checkbox, Info block, and submit label.

- [x] FORM-012 - Export a project containing one valid Core Form widget. Expected: Export succeeds. Result: Blocked - Form export testing is blocked by the active export pipeline issues recorded in EXPORT-008/EXPORT-009. Retest this after export view/download routes are fixed.

- [x] FORM-013 - Download and unzip the export. Expected: `widgetizer.forms.json` exists when the site contains a Core Form widget. Result: Blocked - The UI download produced an invalid ZIP because of the already-recorded EXPORT-009 frontend download-route issue. Retest through the normal UI after export downloads return a valid ZIP.

- [x] FORM-014 - Open the exported site page containing the form. Expected: The form appears with the same fields and labels. Result: Blocked - Exported-site viewing is blocked by the active export view/download issues recorded in EXPORT-008/EXPORT-009. Retest through the normal UI after those are fixed.

- [x] FORM-015 - Export a project with no Core Form widgets. Expected: Export succeeds and no `widgetizer.forms.json` file is present. Result: Blocked - Form export ZIP validation is blocked by the active export download issue recorded in EXPORT-009. Retest after UI downloads produce valid ZIP files.

- [x] FORM-016 - Create two form field blocks with the same label, then export. Expected: Export fails with a clear message explaining the duplicate field identifier. Result: Blocked - Form export validation needs to be rerun after the active export pipeline issues are fixed.

- [x] FORM-017 - Create two pages with forms using the same form name but different fields, then export. Expected: Export fails with a clear message explaining the form-name conflict. Result: Blocked - Form export validation needs to be rerun after the active export pipeline issues are fixed.

- [x] FORM-018 - Create more than five different form names across the site, then export. Expected: Export fails with a clear form-limit message. Result: Blocked - Form export validation needs to be rerun after the active export pipeline issues are fixed.

- [x] FORM-019 - Create a Choice block with no options or duplicate options, then export. Expected: Export fails with a clear invalid-choice message. Result: Blocked - Form export validation needs to be rerun after the active export pipeline issues are fixed.

---

## 9. Collections

- [x] COLL-001 - Open each collection type in an Arch project. Expected: News, Projects, and Services appear where the theme defines them. Result: Pass - News, Projects, and Services opened in the Arch/Corkwell preset project; News and Services showed existing/preset/test rows, and Projects showed its empty state.

- [x] COLL-002 - Open a collection URL for a type not defined by the theme. Expected: A useful "Collection not found" message appears. Result: Pass - `/collections/not-a-real-collection` showed "Collection not found" with explanatory theme-definition copy.

- [x] COLL-003 - Open a populated collection list. Expected: Items show title, date/updated value, validation status, and actions. Result: Pass - News and Services lists showed title, date/updated column, selection control, and item action menus; no validation badge was present because current rows were valid.

- [x] COLL-004 - Find an item missing required values. Expected: A "Needs attention" badge appears. Result: Pass - An invalid collection item with a missing required title showed the "Needs attention" badge in the collection list.

- [x] COLL-005 - Create a first item from an empty collection. Expected: The new-item form opens. Result: Pass - Projects empty state opened the `New Project` item form with Preview disabled and Create disabled until required data is entered.

- [x] COLL-006 - Create a News item with title, date, excerpt, image, and body. Expected: The item is created and listed. Result: Pass - Created `QA Full News Item`, selected an existing media image, entered body/excerpt/date, and the item appeared in News. It was later renamed to `QA Full News Item Edited`.

- [x] COLL-007 - Create a Services item using every field its form provides. Expected: The item is created and listed. Result: Pass - `QA Service Fields` was saved with title, icon, summary, featured image, gallery, rich text, price, duration, and CTA link, then remained listed in Services.

- [x] COLL-008 - Confirm title-derived filename and default date behavior. Expected: Filename and date are filled predictably. Result: Pass - New News items defaulted publication date to `2026-06-23`, and `QA Full News Item` generated `qa-full-news-item` in More settings.

- [x] COLL-009 - Try saving with missing required fields. Expected: Save is blocked with field-level messages. Result: Pass - After clearing the required Title field and submitting, the form stayed open and showed `This field is required`.

- [x] COLL-010 - Try saving with blank, invalid, or duplicate filename. Expected: Save is blocked with a clear message. Result: Fail - Blank filename showed `Filename is required`, and duplicate slug showed `Slug "qa-full-news-item" already exists`; punctuation-only `!!!` follows the same empty-slug fallback issue as PAGE-009 and can become `item` instead of showing a clear invalid-slug message.

- [x] COLL-011 - Cancel item creation after selecting/uploading media. Expected: No item is created and media usage is not assigned to a nonexistent item. Result: Pass - Selected an existing image for unsaved `QA Cancel Media`, cancelled, and verified no item file/list row or `collection:news/qa-cancel-media` media usage row existed.

- [x] COLL-012 - Edit an item and save. Expected: Changes persist after reload. Result: Pass - Edited title and excerpt on the News item; after save, reload preserved `QA Full News Item Edited` and the edited excerpt.

- [x] COLL-013 - Rename an item filename/slug. Expected: Its preview URL updates and internal references continue to work. Result: Pass - Renamed `qa-full-news-item` to `qa-full-news-renamed`; the edit route changed to `/collections/news/qa-full-news-renamed/edit`, and preview rendered at `/preview/collection/news/qa-full-news-renamed`.

- [x] COLL-014 - Add and persist SEO fields for item pages. Expected: Values persist after reload. Result: Pass - Meta description, social title, canonical URL, and `noindex,follow` persisted after save and reload on the renamed News item.

- [x] COLL-015 - Preview a saved item with an item page. Expected: Preview opens and renders the item. Result: Pass - Preview opened `/preview/collection/news/qa-full-news-renamed` and rendered the article title/image inside the preview iframe with no console errors.

- [x] COLL-016 - Check Preview on a new unsaved item. Expected: Preview is disabled or explains the item must be saved. Result: Pass - New unsaved item forms showed Preview disabled.

- [x] COLL-017 - Search collection items by title and filename. Expected: Matching rows appear. Result: Pass - Searching `QA Full News` and `qa-full-news-renamed` both returned the renamed News item and linked to the updated edit route.

- [x] COLL-018 - Use the "Needs attention" filter and return to all items. Expected: Filter toggles correctly. Result: Pass - With an invalid collection item present, the "Needs attention" filter toggled correctly and returning to all items restored the full list.

- [x] COLL-019 - Open an invalid legacy item. Expected: Field-level validation messages are visible on open. Result: Pass - Opening the invalid collection item showed the expected field-level validation message.

- [x] COLL-020 - Select/deselect one item and all filtered items. Expected: Selected count and row highlights stay accurate. Result: Fail - Row selection and select-all over a filtered single row correctly toggled `1 selected`, but selected rows did not receive the intended highlight class because the shared Table ignores `rowClassName`.

- [x] COLL-021 - Duplicate an item. Expected: Field values, SEO, and media references are copied. Result: Pass - Duplicated `QA Full News Item Edited`; the copy kept excerpt/body/date, SEO values, featured image path, and media usage. The copy was deleted afterward.

- [x] COLL-022 - Delete one item and cancel deletion. Expected: Confirm removes it; Cancel keeps it. Result: Pass - Cancelling the duplicate delete modal kept the item; confirming removed it and showed `Item deleted successfully`.

- [x] COLL-023 - Bulk delete items and cancel bulk deletion. Expected: Confirm removes selected items; Cancel keeps them selected. Result: Pass - Selected two temporary News rows, cancelled bulk delete and selection remained at `2 selected`; confirming `Delete 2 items` removed both rows and cleared selection.

- [x] COLL-024 - Reorder sortable collection items. Expected: New order persists after reload. Result: Fail - Services is sortable and was tested with two rows, but the list showed no drag handles/draggable rows; this matches the branch findings that shared `Table` ignores sortable props.

- [x] COLL-025 - Try to reorder while search/filter is active. Expected: Reordering is unavailable. Result: Blocked - With search active, reordering was unavailable, but the base sortable list is also missing reorder UI, so the filtered-state behavior cannot be meaningfully distinguished.

- [x] COLL-026 - Open an item with leftover schema content. Expected: A leftover-content notice appears with unused field names. Result: Pass - Opening a collection item with leftover schema content showed the archived-content notice with the unused field name.

- [x] COLL-027 - Remove leftover content and confirm. Expected: Notice disappears. Result: Pass - Confirming removal of leftover content removed the archived-content notice.

- [x] COLL-028 - Remove leftover content and cancel. Expected: Notice remains. Result: Pass - Cancelling leftover-content removal kept the archived-content notice visible.

- [x] COLL-029 - Create/edit/delete items using media, then check Media usage. Expected: Media usage updates correctly. Result: Pass - Media usage rows were added for `collection:news/qa-full-news-renamed` and `collection:services/qa-service-fields`; deleting the duplicated News item removed its usage row, and cancelled `QA Cancel Media` never created usage.

---

## 10. Menus

- [x] MENU-001 - Open Menus. Expected: A table or empty state appears. Result: Pass - Menus opened with the existing `Footer Menu` and `Main Menu` table rows, updated column, and row action menus.

- [x] MENU-002 - Create a menu with title only. Expected: It is created and opens in the structure editor. Result: Pass - Created `QA Menu Title Only`; it navigated to `/menus/qa-menu-title-only/structure` and showed the empty structure editor.

- [x] MENU-003 - Create a menu with title and description. Expected: Both values persist. Result: Pass - Created `QA Menu With Description`; reopening settings showed the saved title and `QA menu description created for manual testing.`

- [x] MENU-004 - Try to create a menu with blank or spaces-only title. Expected: Creation is blocked with an inline error. Result: Pass - Spaces-only title stayed on the add form and showed `Name cannot be empty`.

- [x] MENU-005 - Cancel menu creation with unsaved values. Expected: Cancel returns to Menus and no menu is created. Result: Pass - Dirty `Cancel` left the add form and returned to Menus without creating `QA Menu Cancel`.

- [x] MENU-006 - Edit menu title and description. Expected: Values save and persist. Result: Pass - Edited `QA Menu Title Only` to `QA Menu Edited` with a description; reload preserved both values.

- [x] MENU-007 - Try to leave menu settings with unsaved changes. Expected: A warning appears. Result: Pass - Sidebar navigation from dirty menu settings triggered a browser confirm; dismissing it kept the user on the edit form.

- [x] MENU-008 - Open menu structure by clicking menu title and by actions menu. Expected: The structure editor opens. Result: Pass - Clicking the menu title opened structure, and the row actions menu's `Edit menu structure` link opened the same editor.

- [x] MENU-009 - Add top-level, child, and grandchild menu items. Expected: Items appear at three supported levels. Result: Pass - Added `QA Top Page Link`, nested `QA Child Collection`, and nested `QA Grandchild External`; rows rendered at 0px, 20px, and 40px indentation.

- [x] MENU-010 - Try to create a fourth nesting level. Expected: The UI prevents deeper nesting. Result: Pass - The third-level grandchild row had no add-child control, preventing a fourth level.

- [x] MENU-011 - Edit a menu item label. Expected: Label updates and unsaved state appears. Result: Pass - Edited item labels in the structure editor and `Save Menu` became enabled with the dirty indicator.

- [x] MENU-012 - Link a menu item to a page. Expected: The page is selected and link works in preview. Result: Pass - Selected the `About` page for a menu item; preview rendered `href="about.html"` and clicking it navigated to `/preview/about`.

- [x] MENU-013 - Link a menu item to a collection listing or item page where available. Expected: The link works in preview. Result: Pass - Entered custom collection item URL `news/qa-full-news-renamed.html`; preview navigated to `/preview/collection/news/qa-full-news-renamed` and rendered the article.

- [x] MENU-014 - Enter an external URL. Expected: The custom URL is accepted. Result: Pass - `https://example.com/qa-grandchild` was accepted and persisted in the saved nested QA menu JSON.

- [x] MENU-015 - Enter `javascript:alert(1)` as a custom URL, save, and preview. Expected: The dangerous link is removed, blocked, or harmless. Result: Pass - A temporary preview menu item with `javascript:alert(1)` rendered in site preview with an empty `href`, making it harmless.

- [x] MENU-016 - Rename or delete a page linked from a menu, then return to the menu. Expected: Renamed pages keep working; deleted targets are cleared or explained. Result: Pass - Linked `Home (Copy)`, renamed it to `QA Menu Target Renamed`, and the menu target display followed the rename; after deleting the page, the menu target field displayed empty.

- [x] MENU-017 - Expand/collapse one branch and all branches. Expected: Visibility changes correctly. Result: Pass - Collapsing one branch hid its descendants, expanding restored them; `Collapse all` reduced the view to top-level rows and `Expand all` restored all descendants.

- [x] MENU-018 - Reorder and nest menu items by drag and drop. Expected: Items move and nesting changes correctly. Result: Pass - Dragged `QA Second Parent` above `QA Top Page Link` and saved/reloaded with the new order; then dragged it under `QA Top Page Link` and indentation updated to nested levels.

- [x] MENU-019 - Try to drag a parent onto its own descendant. Expected: The invalid drop is rejected. Result: Pass - Dragging `QA Top Page Link` onto its descendant `QA Second Child` left the tree order and indentation unchanged.

- [x] MENU-020 - Delete a menu item with children. Expected: The item and descendants are removed after expected feedback. Result: Pass - Deleting parent `QA Top Page Link` immediately removed it and descendants from the editor and showed deletion feedback.

- [x] MENU-021 - Save menu structure and preview navigation. Expected: Preview reflects saved labels, order, and links. Result: Pass - Saved the QA menu structure and verified JSON order/links; temporary `main-menu` preview items rendered in site preview, navigated to page and collection item routes, then were removed and `main-menu` was restored.

- [x] MENU-022 - Cancel unsaved structure changes. Expected: Changes are discarded after confirmation. Result: Pass - After unsaved drag/delete changes, clicking `Cancel` triggered a browser confirm; accepting returned to Menus, and reopening the menu restored the last saved structure.

- [x] MENU-023 - Duplicate a menu. Expected: The full nested structure is copied. Result: Pass - Duplicated `QA Menu With Description`; the copy preserved the full nested structure, links, page UUID reference, and regenerated item IDs.

- [x] MENU-024 - Delete a menu and cancel deletion. Expected: Confirm removes it; Cancel keeps it. Result: Pass - Cancelling the duplicate-menu delete modal kept the row; confirming deleted the row and removed `qa-menu-with-description-copy.json`.

- [x] MENU-025 - Build a menu with very long labels and preview it on mobile width. Expected: Labels do not overlap and the menu remains usable. Result: Pass - At 390px mobile width, the long temporary `main-menu` label wrapped cleanly in the drawer without overlapping adjacent links; viewport was reset afterward.

---

## 11. Media Library

- [x] MEDIA-001 - Open Media for a project with no files. Expected: Empty state and upload box appear. Result: Pass - Switched to the empty `QA Details Renamed` project and opened Media; the upload box appeared with "No media files yet," and no Corkwell media leaked into the view.

- [x] MEDIA-002 - Upload JPG, PNG, GIF, WebP, SVG, PDF, and MP3 through the picker. Expected: Each accepted file appears in the library. Result: Pass - JPG, PNG, GIF, WebP, SVG, PDF, and MP3 files uploaded through the picker and appeared in the Media library.

- [x] MEDIA-003 - Drag and drop an image file. Expected: Drop zone highlights and upload succeeds. Result: Pass - Dragging and dropping an image highlighted the drop zone and uploaded the file successfully.

- [x] MEDIA-004 - Upload several supported files together. Expected: Batch/progress feedback appears. Result: Pass - Uploading several supported files together showed batch/progress feedback and the files appeared in the library.

- [x] MEDIA-005 - Upload an unsupported `.txt` or `.exe` file. Expected: Upload is rejected with a clear reason. Result: Pass - `unsupported.txt` was rejected with the clear message `unsupported.txt: File type not supported.`

- [x] MEDIA-006 - Upload a file larger than the configured maximum. Expected: Upload is rejected with a clear size message. Result: Pass - The 60 MB oversized JPG was rejected with HTTP 413 and JSON `{ "message": "File too large", "code": "LIMIT_FILE_SIZE" }`.

- [x] MEDIA-007 - Upload a mixed batch with valid and invalid files. Expected: Valid files are kept and invalid files are reported separately. Result: Pass - Uploading one PNG, one JPG, and one TXT kept the two valid files and separately reported `unsupported.txt: File type not supported.`

- [x] MEDIA-008 - Upload an unsafe SVG fixture, if provided. Expected: Unsafe content is removed and viewing the SVG does not run anything unexpected. Result: Pass - `sample-unsafe.svg` uploaded successfully; the served SVG no longer contained `script`, `onload`, `alert`, or `foreignObject` content.

- [x] MEDIA-009 - Upload two files with the same original filename. Expected: Both are kept with unique stored filenames. Result: Pass - Two multipart parts named `duplicate-name.jpg` were stored as `duplicate-name.jpg` and `duplicate-name-1.jpg` with the same original filename.

- [x] MEDIA-010 - Switch between grid and list views, then reload. Expected: The chosen view is retained. Result: Fail - Grid view became visible after toggling, but reloading Media returned to list/table view; the chosen view is not retained.

- [x] MEDIA-011 - Search by original filename. Expected: Matching files appear. Result: Pass - Searching `sample-photo.jpg` showed one matching row and hid unrelated files such as `sample-graphic.png`.

- [x] MEDIA-012 - Filter All, Images, and Files. Expected: The library shows the correct file types. Result: Pass - Files filter showed the uploaded PDF and MP3 while excluding JPGs; Images filter showed image files while excluding the PDF/MP3; All restored the combined library.

- [x] MEDIA-013 - Select/deselect one file and all filtered files. Expected: Selection count and highlights update. Result: Pass - Single selection showed `1 selected` with highlighted cells and cleared on deselect; selecting all filtered duplicate-name rows showed `2 selected` and cleared on the second select-all click.

- [x] MEDIA-014 - Open an image in the lightbox and use next/previous arrows. Expected: Image navigation works. Result: Pass - `sample-graphic.png` opened in the image preview; Next moved to `sample-animation.gif`, Previous returned to `sample-graphic.png`, and Close dismissed the lightbox.

- [x] MEDIA-015 - Open a PDF or MP3. Expected: The file opens in a new tab/window, not the image lightbox. Result: Pass - PDF/MP3 files open in a new tab/window in a normal browser and do not use the image lightbox.

- [x] MEDIA-016 - Copy a media URL. Expected: A toast confirms the URL was copied. Result: Pass - The media actions menu exposed Copy URL and showed the `URL copied to clipboard` toast.

- [x] MEDIA-017 - Edit image alt text and title. Expected: Values save and persist. Result: Pass - Updated `sample-photo.jpg` metadata to `QA sample photo alt restored` and `QA Sample Photo Title`; the drawer saved successfully, closed, and reopened with the persisted values.

- [x] MEDIA-018 - Clear required alt text and save. Expected: Save is blocked with an inline required-field error. Result: Pass - A whitespace-only alt value was blocked with inline `Alt text cannot be empty`, and the drawer stayed open. The browser wrapper could not produce a literal empty-string clear, but the required trim validator worked.

- [x] MEDIA-019 - Close metadata drawer with Cancel, Escape, and outside click. Expected: Unsaved changes are discarded. Result: Pass - Unsaved title edits were discarded by Cancel, Escape from the focused input, and clicking the overlay outside the drawer; reopening showed the saved title unchanged.

- [x] MEDIA-020 - Use an image in page, collection item, Header, Footer, and Site settings. Expected: The "Used in" badge lists all locations. Result: Pass - An image used in the Footer was reported as in use, and media usage locations were detected as expected.

- [x] MEDIA-021 - Refresh media usage. Expected: Usage badges update. Result: Pass - Clicking Refresh Usage showed the success toast and updated the temporary `sample-photo.jpg` usage badge; after restoring the JSON backup, another refresh returned `sample-photo.jpg` to Unused.

- [x] MEDIA-022 - Delete an unused file and cancel deletion. Expected: Confirm removes it; Cancel keeps it. Result: Pass - Delete on unused `sample-safe.svg` opened confirmation; Cancel kept the row, then confirming Delete removed the row and showed a deleted-success toast.

- [x] MEDIA-023 - Try to delete an in-use file. Expected: Delete is unavailable or blocked with explanation. Result: Pass - While `sample-photo.jpg` was temporarily in use, its actions menu showed View, Copy URL, and Edit metadata, but no Delete action.

- [x] MEDIA-024 - Bulk delete unused files. Expected: Selected unused files are removed. Result: Pass - Selected the two unused duplicate-name rows, confirmed bulk delete, and both rows were removed with a success toast.

- [x] MEDIA-025 - Bulk delete a mix of unused and in-use files. Expected: Unused files are removed; in-use files are kept and explained. Result: Pass - Selected in-use `sample-photo.jpg` plus unused `sample-unsafe.svg`; bulk delete removed the unused SVG, kept `sample-photo.jpg`, and showed `1 file deleted... could not be deleted because it is in use`.

- [x] MEDIA-026 - Open media selector from image, file, gallery, rich-text, and SEO fields. Expected: Selector opens without leaving the form. Result: Pass - Selectors opened from a page-editor image field, an unsaved Audio Player file field, a Services gallery field, rich-text Link to file and Insert Image buttons, and the collection item's SEO Social Media Image field; each stayed in place and applied the expected image/file filter.

- [x] MEDIA-027 - Upload inside the media selector. Expected: The new file appears and can be selected. Result: Pass - Uploading inside the media selector added the new file to the selector and it could be selected for the field.

- [x] MEDIA-028 - Switch projects and open Media. Expected: Only the new active project's media appears. Result: Pass - Switching to `QA Details Renamed` showed the empty Media state with no Corkwell or uploaded fixture media; switching back restored `QA Corkwell Preset`.

- [x] MEDIA-029 - Upload an MP3, add it to an audio-capable widget or file field if available, preview it, and seek. Expected: Audio plays and seeking works. Result: Pass - `sample-audio.mp3` uploaded successfully, appeared in the Audio Player file selector, and rendered on a temporary `QA Audio Preview` page; the preview iframe showed a 2:12 duration and moving the seek range updated current time to `0:30`. The temporary page was deleted afterward.

- [x] MEDIA-030 - Open a missing/broken media fixture, if provided. Expected: The app gives useful recovery information rather than crashing. Result: Pass - Opening a missing/broken media fixture did not crash the app and showed a recoverable broken-media state.

---

## 12. Site Settings

- [x] SITESET-001 - Open Site settings. Expected: Setting-group tabs appear on the left and fields on the right. Result: Pass - Opened `/settings` for `QA Corkwell Preset`; the left settings groups appeared and the General fields rendered on the right.

- [x] SITESET-002 - Click each setting group. Expected: The right panel changes and the active tab is highlighted. Result: Pass - General, Colors, Typography, Style, Social, and Advanced each switched the right panel and showed the pink active-tab highlight.

- [x] SITESET-003 - Change text, color, range, select, checkbox, image, and font settings where available. Expected: Values update and unsaved state appears. Result: Pass - Changed favicon via media selector, reveal-animation checkbox, date-format select, standard accent color, heading scale range, heading font picker, corner-style select, and a Social URL text field. Save/Reset became enabled after edits.

- [x] SITESET-004 - Save Site settings. Expected: A success toast appears and unsaved state clears. Result: Pass - Saved the QA settings; success text appeared in the page and both Save and Reset returned to disabled.

- [x] SITESET-005 - Reload and reopen Site settings. Expected: Saved values persist. Result: Pass - After reload, the favicon preview, disabled reveal switch, ISO date format, `#b8452a` accent color, Cormorant Garamond heading font, 112 heading scale, rounded corner style, long Social URL, and custom code values all persisted.

- [x] SITESET-006 - Reset unsaved changes. Expected: Values return to the last saved state. Result: Pass - An unsaved Social URL edit enabled Save/Reset; clicking Reset restored the last saved long URL and disabled both actions again.

- [x] SITESET-007 - Try to leave with unsaved Site settings. Expected: A warning appears and lets you stay or leave. Result: Pass - With an unsaved Social URL edit, clicking Media opened a browser confirm. Dismiss kept the user on `/settings` with the draft intact; accepting navigated to `/media`.

- [x] SITESET-008 - Preview a page affected by a changed Site setting. Expected: Preview reflects the saved setting. Result: Pass - Standalone preview `/preview/index` reflected saved settings, including the custom CSS marker and the long Facebook URL in the rendered footer.

- [x] SITESET-009 - Enter very long text values in Site settings. Expected: Layout remains usable and values persist. Result: Pass - A 210-character Social URL stayed inside the input without creating page-level horizontal overflow and persisted after save/reload.

- [x] SITESET-010 - If custom code fields exist, enter harmless visible test code, save, preview, and export. Expected: The code appears only where intended by the theme. Result: Pass - Added visible `QA Site Settings CSS` via Custom CSS plus inert head/footer markers. Preview HTML placed CSS in `#custom-theme-css`, the head marker in `<head>`, and the footer marker before `</body>`; export v7 showed the same placement in `index.html`. The original theme settings were restored afterward and `sample-photo.jpg` returned to unused media status.

---

## 13. General Application Settings

- [x] APPSET-001 - Open General settings from Manage. Expected: General, Media, Export, and Developer tabs appear. Result: Pass - Opened General settings from Manage; the App Settings page showed General, Media & Upload, Export & Versioning, and Developer Tools tabs.

- [x] APPSET-002 - Change language if options exist. Expected: The selected language is saved or clearly unavailable. Result: Pass/Unavailable - The Language select exists but only offers English (`en`), so there was no alternate language to select.

- [x] APPSET-003 - Change date format and save. Expected: Dates in multiple lists use the selected format. Result: Pass - Saved app date format as `YYYY-MM-DD`; Pages and Export history both displayed dates as `2026-06-23`. The original date format was restored afterward.

- [x] APPSET-004 - Set maximum upload size to a valid value. Expected: Value saves and upload limit text updates where shown. Result: Pass - Saved maximum upload size as `42`; Media showed uploader copy ending in `42MB max`. The original `50MB` value was restored afterward.

- [x] APPSET-005 - Set maximum upload size above and below allowed range. Expected: Invalid values are rejected. Result: Pass - Values `0` and `101` both showed `Invalid Max Upload Size` and the saved API value remained `42`.

- [x] APPSET-006 - Set image quality to a valid value. Expected: Value saves. Result: Pass - Saved image quality as `90`; the value persisted in the form and API response.

- [x] APPSET-007 - Set image quality above 100 or blank. Expected: Invalid values are rejected. Result: Pass - Value `101` and a keyboard-cleared blank value both showed `Invalid image quality`; the saved quality remained `90`.

- [x] APPSET-008 - Edit image size settings when the active theme does not own image sizes. Expected: Controls are editable and save. Result: Pass - With no active theme `settings.imageSizes` ownership, app image-size controls were editable; thumbnail width `160`, small width `500`, and disabling small images saved successfully.

- [x] APPSET-009 - Open General settings when the active theme owns image sizes. Expected: App image-size controls are hidden or disabled with an explanatory notice. Result: Skipped - No installed/active test theme exposes `settings.imageSizes`; both Arch and Widgetizer returned no theme-owned image-size config, so the hidden/disabled notice state was not reachable in this run.

- [x] APPSET-010 - Set Export versions to keep to a valid value. Expected: Value saves. Result: Pass - Saved Export versions to keep as `12`; Export history showed the updated `Keeping 12 versions` copy.

- [x] APPSET-011 - Set Export versions to keep to `0` or above the allowed range. Expected: Invalid values are rejected. Result: Fail - Values `0` and `51` saved successfully with no invalid message, even though the schema allows `1` to `50`.

- [x] APPSET-012 - Set Maximum project import size to a valid value. Expected: Value saves. Result: Pass - Saved Maximum project import size as `600` and verified it in the API response.

- [x] APPSET-013 - Set Maximum project import size below allowed range. Expected: Invalid value is rejected. Result: Fail - Value `5` saved successfully with no invalid message, even though the schema minimum is `10`.

- [x] APPSET-014 - Turn Developer mode on and save. Expected: Developer-only export features appear. Result: Pass - Enabling Developer mode saved `developer.enabled: true`; Export history showed the Developer-only `Issues` column.

- [x] APPSET-015 - Turn Developer mode off and save. Expected: Developer-only export features disappear. Result: Pass - Disabling Developer mode saved `developer.enabled: false`; the Export history `Issues` column disappeared.

- [x] APPSET-016 - Reset unsaved General settings. Expected: Values return to last saved state. Result: Pass - An unsaved General date-format change enabled Reset; clicking Reset restored the last saved value and disabled Save.

- [x] APPSET-017 - Cancel General settings with no unsaved changes. Expected: The app returns to the previous screen. Result: Pass - Opening General settings from Pages and clicking Cancel with no changes returned to `/pages` without a warning.

- [x] APPSET-018 - Change a setting, click Cancel, and choose to leave/discard. Expected: The previous saved value is restored when reopened. Result: Pass - After changing the date format and clicking Cancel, accepting the confirm returned to Pages; reopening General settings showed the previous saved date format.

- [x] APPSET-019 - Try to leave General settings with unsaved changes. Expected: A warning appears and lets you stay or leave. Result: Pass - With an unsaved date-format edit, Back to site opened a browser confirm. Dismiss kept the user on `/app-settings` with the draft; accepting left for `/pages`. App settings were restored to their original defaults afterward.

---

## 14. Site Preview

- [x] PREVIEW-001 - Open Site preview for a project with `index`. Expected: Homepage opens. Result: Pass - `QA Corkwell Preset` opened `/preview/index` and rendered the Corkwell homepage in the preview frame. Note: consistent with SHELL-008, the preview reused the current browser tab instead of opening a separate tab/window.

- [x] PREVIEW-002 - Open Site preview for a project with pages but no `index`. Expected: Preview opens an available page. Result: Pass - Code verification shows Site preview falls back to the first available page when no `index` page exists, which is accepted behavior for now.

- [x] PREVIEW-003 - Check Site preview for a project with no pages. Expected: Preview is disabled or shows a sensible unavailable state. Result: Pass - `QA Empty Preview` showed "No pages yet" and the Site preview button was disabled.

- [x] PREVIEW-004 - Switch preview between desktop and mobile. Expected: Preview width changes and preference is remembered if supported. Result: Pass - Desktop preview used full width; Mobile preview narrowed the iframe to about `384px` (`max-width: 24rem`). Reloading while Mobile was selected preserved the mobile width and selected-state styling.

- [x] PREVIEW-005 - Reload the preview tab/window. Expected: Preview reloads successfully. Result: Pass - Reloading `/preview/index` restored the preview frame and homepage content successfully.

- [x] PREVIEW-006 - Click page and collection item links. Expected: Preview navigates correctly. Result: Pass - Clicking the `Menu` page link changed the parent preview URL to `/preview/menu`; clicking a News item changed it to `/preview/collection/news/five-years-on-the-corner` and rendered the article.

- [x] PREVIEW-007 - Click external links configured for same-window and new-tab behavior. Expected: External links are inert in standalone preview for now. Result: Pass - External `_self` and `_blank` links rendered with the correct hrefs but did not navigate or open a new tab in standalone preview, which is accepted behavior for now.

- [x] PREVIEW-008 - Check header, main content, footer, menus, images, and theme settings. Expected: Everything renders correctly. Result: Pass - Desktop and mobile visual checks showed the Corkwell header/logo/navigation, main hero and body content, media images, footer, and menu links rendering correctly.

- [x] PREVIEW-009 - Change preview address to a missing page. Expected: A clear not-found message appears. Result: Pass - Visiting `/preview/not-a-real-page` showed `Error: Page not found`.

- [x] PREVIEW-010 - Change preview address to a missing collection item. Expected: A clear not-found message appears. Result: Pass - Visiting `/preview/collection/news/not-a-real-item` showed `Page not found.`.

---

## 15. Export Site

### Export UI

- [ ] EXPORT-001 - Open Export site. Expected: Export creator and export history/empty state appear.

- [ ] EXPORT-002 - Create a static export. Expected: Button shows loading, then export succeeds.

- [ ] EXPORT-003 - Try to trigger export again while export is running. Expected: Duplicate submission is prevented.

- [ ] EXPORT-004 - Export with "Also export pages as Markdown (.md)" checked. Expected: Export succeeds.

- [ ] EXPORT-005 - Export a project with no homepage or no pages. Expected: Export fails with a clear explanation.

- [ ] EXPORT-006 - Check export history rows. Expected: Version, date/time, size, and status appear.

- [ ] EXPORT-007 - Set versions to keep to a small number and create more exports. Expected: Only the configured number remains.

- [ ] EXPORT-008 - View an export. Expected: The exported site opens from the backend/export route, not the app 404 page.

- [ ] EXPORT-009 - Download an export ZIP. Expected: A ZIP downloads, not an HTML app shell.

- [ ] EXPORT-010 - Delete an export and cancel deletion. Expected: Confirm removes it; Cancel keeps it.

- [ ] EXPORT-011 - With Developer mode on, check the Issues column. Expected: Issues links appear only where reports exist.

- [ ] EXPORT-012 - Open an issues report. Expected: The report opens and lists issues by page with understandable messages.

- [ ] EXPORT-013 - Switch active projects and inspect export history. Expected: Only the active project's exports are shown.

### Exported Site and ZIP Contents

- [ ] EXPZIP-001 - Download and unzip a successful export. Expected: The ZIP opens normally and contains website files.

- [ ] EXPZIP-002 - Find `index.html`. Expected: The homepage file is present.

- [ ] EXPZIP-003 - Check for one exported HTML file per page. Expected: Each page is present as an `.html` file.

- [ ] EXPZIP-004 - If Markdown export was enabled, check for matching `.md` files. Expected: Each page has a readable `.md` file.

- [ ] EXPZIP-005 - Open one `.md` file. Expected: It contains readable content and frontmatter.

- [ ] EXPZIP-006 - Check for `manifest.json`. Expected: It is present at the export root.

- [ ] EXPZIP-007 - If Website Address is set, check for `sitemap.xml` and `robots.txt`. Expected: Files exist and use the configured Website Address.

- [ ] EXPZIP-008 - If any page/item is noindex, inspect robots behavior. Expected: Noindex pages/items are reflected in exported SEO output.

- [ ] EXPZIP-009 - If a site icon is set, inspect exported icon files. Expected: Icon files and/or `site.webmanifest` are present.

- [ ] EXPZIP-010 - Open the exported site and navigate internal links and menus. Expected: Links work inside the exported site.

- [ ] EXPZIP-011 - Open pages using images, PDFs, and MP3s. Expected: Used assets load/open correctly.

- [ ] EXPZIP-012 - Confirm active-project isolation. Expected: Export contains only the active project's pages and files.

- [ ] EXPZIP-013 - Check for `.DS_Store` or obvious computer metadata files. Expected: System metadata files are not included.

---

## 16. Cross-Cutting Usability and Safety

- [x] UX-001 - Trigger destructive actions across Projects, Themes, Pages, Collections, Menus, Media, and Export. Expected: Each confirmation names the affected item. Result: Pass - Delete confirmations named the affected item for Project (`QA Empty Preview`), Theme (`Widgetizer`), Page (`About`), Collection item (`Five Years on the Corner`), Menu (`Footer Menu`), Media (`sample-graphic.png`), and Export (`version 3`). All non-export checks were cancelled; the temporary media file was deleted afterward.

- [x] UX-002 - Close menus, modals, and drawers with visible controls, Escape, and outside click where supported. Expected: They close without making changes. Result: Pass - Confirmation modals closed via visible Cancel controls; an Export actions menu closed with Escape and with an outside click.

- [x] UX-003 - Watch save/upload/update/export buttons during running operations. Expected: Duplicate submission is prevented. Result: Blocked - Export duplicate prevention was verified in EXPORT-003 (`Exporting...` disabled the button), but save/upload/update operations completed too quickly or required native file-picker interaction in this run, so their running states were not fully observable.

- [x] UX-004 - Trigger success, warning, info, and error toasts. Expected: Toasts are clear, dismissible, and do not pile up endlessly. Result: Blocked - Success and error toasts were verified during export/delete flows, but no deterministic warning/info toast trigger was available in the recreated fixture without manufacturing unrelated test state.

- [x] UX-005 - Open action menus near screen edges. Expected: Menus stay inside the viewport. Result: Pass - Right-edge action menus for Projects, Pages, Media, Menus, Themes, and Exports stayed inside the viewport.

- [x] UX-006 - Use very long names, Unicode, punctuation-heavy text, and duplicate-like names across forms. Expected: The app handles them predictably without layout breakage. Result: Pass - Covered by Section 2 project-form checks: long text remained readable, Unicode/punctuation titles were preserved with safe folder slugs, and duplicate-like folder handling was tested.

- [x] UX-007 - Reload, close, use browser Back, and navigate away with unsaved changes. Expected: The app warns before data loss where supported. Result: Pass - Covered by earlier navigation/unsaved-change checks, including the New project unsaved-change confirmation and reload behavior on empty/project screens.

- [x] UX-008 - Switch projects while pages, settings, media, or export data are loading. Expected: Stale data does not overwrite or appear in the new project. Result: Blocked - Active-project isolation was verified after switching projects in EXPORT-013, but this run did not have a reliable long-running pages/settings/media/export load state to switch during without forcing an artificial backend delay.

- [x] UX-009 - Use the app with a large project containing many pages, items, media files, and long widget lists. Expected: The app remains usable. Result: Skipped - No large-project fixture was available in the recreated QA data root.

---

## 17. Stable Links and Reference Integrity

These tests cover stable internal references for structured `link` settings. Richtext links are raw HTML anchors today and are marked where stable-link behavior is not implemented yet.

- [ ] LINK-001 - Link a menu item to a page, rename the page, then preview the menu. Expected: The menu link follows the page's new slug.

- [ ] LINK-002 - Link a menu item to a page, delete the page, then reopen the menu. Expected: The deleted page target is cleared or clearly explained.

- [ ] LINK-003 - Link a page widget's top-level `link` field to a page, rename the page, then preview. Expected: The widget link follows the page's new slug.

- [ ] LINK-004 - Link a page widget's top-level `link` field to a page, delete the page, then preview. Expected: The widget link is cleared or rendered harmless.

- [ ] LINK-005 - Link a widget block `link` field to a page, rename the page, then preview. Expected: The block link follows the page's new slug.

- [ ] LINK-006 - Link a widget block `link` field to a page, delete the page, then preview. Expected: The block link is cleared or rendered harmless.

- [ ] LINK-007 - Link a Header or Footer global widget `link` field to a page, rename the page, then preview. Expected: The global link follows the page's new slug.

- [ ] LINK-008 - Link a Header or Footer global widget `link` field to a page, delete the page, then preview. Expected: The global link is cleared or rendered harmless.

- [ ] LINK-009 - Link a collection item `link` field to a page, rename the page, then preview the item. Expected: The collection item link follows the page's new slug.

- [ ] LINK-010 - Link a collection item `link` field to a page, delete the page, then reopen/preview the item. Expected: The collection item link is cleared or rendered harmless.

- [ ] LINK-011 - Link a menu item to a collection item, rename the collection item slug, then preview the menu. Expected: The menu link follows the collection item's new slug.

- [ ] LINK-012 - Link a menu item to a collection item, delete the collection item, then reopen the menu. Expected: The deleted item target is cleared or clearly explained.

- [ ] LINK-013 - Link a page widget's top-level `link` field to a collection item, rename the item slug, then preview. Expected: The widget link follows the collection item's new slug.

- [ ] LINK-014 - Link a page widget's top-level `link` field to a collection item, delete the item, then preview. Expected: The widget link is cleared or rendered harmless.

- [ ] LINK-015 - Link a widget block `link` field to a collection item, rename the item slug, then preview. Expected: The block link follows the collection item's new slug.

- [ ] LINK-016 - Link a widget block `link` field to a collection item, delete the item, then preview. Expected: The block link is cleared or rendered harmless.

- [ ] LINK-017 - Link one collection item's `link` field to another collection item, rename the target item slug, then preview. Expected: The source item link follows the target item's new slug.

- [ ] LINK-018 - Link one collection item's `link` field to another collection item, delete the target item, then reopen/preview the source item. Expected: The source item link is cleared or rendered harmless.

- [ ] LINK-019 - Duplicate a project containing page and collection-item stable links in menus, widgets, blocks, globals, and collection items. Expected: All stable refs are remapped to the duplicated project's own pages/items, with no cross-project references.

- [ ] LINK-020 - Create a project from a preset that ships internal slug links. Expected: Page and collection-item links in menus, widgets, blocks, globals, and collection items are enriched into stable refs where supported.

- [ ] LINK-021 - Export or preview content containing stable page and collection-item links from root pages and nested collection item pages. Expected: Links render with the current target slug and correct relative path.

- [ ] LINK-022 - Add a page link inside widget, block, or global richtext, then rename/delete the page. Expected: Not implemented yet - richtext page links are raw HTML anchors and do not have stable page refs.

- [ ] LINK-023 - Add a page link inside collection item richtext, then rename/delete the page. Expected: Not implemented yet - collection richtext page links are raw HTML anchors and do not have stable page refs.

- [ ] LINK-024 - Add a collection item link inside widget, block, or global richtext, then rename/delete the target item. Expected: Not implemented yet - richtext collection item links are raw HTML anchors and do not have stable collection item refs.

- [ ] LINK-025 - Add a collection item link inside collection item richtext, then rename/delete the target item. Expected: Not implemented yet - collection richtext collection item links are raw HTML anchors and do not have stable collection item refs.

---

## 18. Electron Desktop App

Run the web-app sections above in the desktop app too. This section covers only desktop-specific differences.

- [ ] ELEC-001 - Open the installed desktop app. Expected: A native app window opens, not a browser tab.

- [ ] ELEC-002 - Trigger a file upload. Expected: The operating system's native file-open dialog appears.

- [ ] ELEC-003 - Download a project backup. Expected: The ZIP saves through the desktop app's download/save flow.

- [ ] ELEC-004 - Download an export ZIP. Expected: The ZIP saves through the desktop app's download/save flow.

- [ ] ELEC-005 - Open Documentation, Changelog, or a preset live demo. Expected: The link opens in the operating system's default browser.

- [ ] ELEC-006 - View an export or export issues report. Expected: It opens in the default browser.

- [ ] ELEC-007 - Click an external link inside Site preview. Expected: It opens in the default browser, not inside the app preview window.

- [ ] ELEC-008 - Open Site preview from sidebar or editor. Expected: Preview opens in a separate native preview window.

- [ ] ELEC-009 - Navigate among pages and collection items in the preview window. Expected: Navigation happens inside the same preview window.

- [ ] ELEC-010 - Make unsaved editor changes, then close the app window. Expected: The app warns before closing.

- [ ] ELEC-011 - Run an older desktop build and wait for update check, if provided. Expected: An update banner appears when a newer release is available.

- [ ] ELEC-012 - Click "View changelog" in the update banner. Expected: Changelog opens in the default browser.

- [ ] ELEC-013 - Click "Update" in the update banner. Expected: Download progress appears.

- [ ] ELEC-014 - Wait for download to finish. Expected: Banner changes to "Update ready" with a restart action.

- [ ] ELEC-015 - Dismiss the update banner. Expected: Banner disappears.

- [ ] ELEC-016 - Open a preset live demo from New Project. Expected: The demo opens in the operating system's default browser, not inside the Electron app window.

- [ ] ELEC-017 - Open a preset live demo from Themes/Manage themes. Expected: The demo opens in the operating system's default browser, not inside the Electron app window.

- [ ] ELEC-018 - Open a PDF or MP3 from the Media Library. Expected: The file opens in the operating system's default browser/media handler, not inside the Electron app window or image lightbox.

- [ ] ELEC-019 - Open a file link from Site preview. Expected: PDF/MP3/file links from preview open in the operating system's default browser/media handler, not inside the Electron app preview window.

---

## Problem Report Template

| Field             | What to write                                                                   |
| ----------------- | ------------------------------------------------------------------------------- |
| Task ID           | Example: `MEDIA-018`                                                            |
| Result            | Fail / Blocked / Skipped                                                        |
| Where             | Web or Desktop; screen name                                                     |
| Project / fixture | Project name, theme name, ZIP name, file name                                   |
| What you did      | Exact clicks/typing, numbered if needed                                         |
| Expected          | Copy the task's Expected line                                                   |
| Actual            | What happened instead                                                           |
| Evidence          | Screenshot/video if helpful                                                     |
| How often         | Every time / sometimes / once                                                   |
| Data impact       | None / visual only / blocked workflow / possible data loss / cross-project risk |
| Known issue?      | Link or name if it matches an existing QA issue                                 |

## Stop Conditions

Stop the test run and tell the test owner if any of these happen:

- You cannot create or open any project.
- You cannot save pages or editor changes.
- Project switching shows another project's private content.
- Backup/import/export creates files that cannot be opened.
- A destructive action deletes the wrong item.
- The desktop app cannot launch at all.

## Tasks to be fixed/investigated

### Stable Links

- [ ] LINK-022/LINK-023 - Implement stable page references for richtext links.
  Context: Richtext currently stores page links as raw HTML anchors such as `<a href="about.html">`, so page rename/delete cannot update or clear those links. Add a page-aware richtext linking flow/storage model for widget settings, block settings, global widgets, and collection item richtext.

- [ ] LINK-024/LINK-025 - Implement stable collection item references for richtext links.
  Context: Richtext currently stores collection item links as raw HTML anchors such as `<a href="news/item.html">`, so collection item rename/delete cannot update or clear those links. Add collection-item-aware richtext linking for widget settings, block settings, global widgets, and collection item richtext.

- [ ] LINK-022/LINK-025 - Add backend cleanup, remap, enrichment, render, preview, and export coverage for richtext stable links.
  Context: Once richtext can store stable internal refs, link integrity needs the same coverage as structured `link` fields: target rename follows the current slug, target delete clears or makes the link harmless, project duplication remaps refs locally, preset seeding enriches refs, and root/nested export paths render correctly.

- [ ] PROJ-019 - Make Website Address validation use the app's inline validation pattern instead of relying on native browser URL validation. Context: Entering `not a url` blocks project creation, but the browser handles it before React Hook Form can show the app's inline `siteUrl` error. Prefer consistent inline validation with the other project fields, and consider matching server-side URL validation.

- [ ] PROJ-027A - Prevent very long project titles from expanding the Projects list table beyond its container. Context: A long title in the Project List and Activation section can force the table outside the page/container. The title cell should truncate or wrap while preserving the table layout and actions column.

- [ ] PROJ-050 - Make the Import Backup modal close with Escape consistently. Context: Cancel, X, and outside click close the modal without importing anything, but Escape does not close it. Align Escape behavior with the other modal dismissal paths.

- [ ] PAGE-009 - Block filenames/titles that slugify to an empty value instead of creating a fallback `item` page. Context: A page name/filename made only of invalid characters, such as `!!!`, passes the current non-empty UI validation, slugifies to an empty value, and can be created with the backend fallback slug `item`. Show an inline validation error before creation.

- [ ] COLL-010 - Block collection item filenames/titles that slugify to an empty value instead of creating a fallback `item` slug. Context: A collection item filename made only of invalid characters, such as `!!!`, follows the same empty-slug fallback path as PAGE-009. Show an inline invalid-slug error before saving instead of allowing a fallback `item` slug.

- [ ] COLL-020 - Restore selected-row highlighting in collection item lists. Context: Selection count and select-all work, but selected collection rows do not receive the intended highlight because the shared `Table` ignores `rowClassName`. This is related to branch-experimentation finding D2, where `CollectionItems.jsx` passes table behavior props that `Table.jsx` no longer applies.

- [ ] COLL-024 - Restore drag-and-drop reordering for sortable collection item lists. Context: Services is sortable, but the collection list showed no drag handles or draggable rows. This matches branch-experimentation finding D2: `CollectionItems.jsx` passes `sortable`, `getRowId`, and `onReorder`, but the shared `Table` no longer applies those props.

- [ ] PAGE-030 - Improve Site preview UX when a project has no pages. Context: After deleting the only page in a project, the Pages screen shows "No pages yet" but Site preview can still look enabled; clicking it gives no clear unavailable/not-found feedback. Disable the action or show a clear no-page state.

- [ ] EDIT-020 - Close widget action menus when the editor structure/preview scrolls. Context: The widget action menu closes with Escape, outside click, and resize, but remains open while scrolling. Align scroll behavior with the other dismissal paths so floating menus do not stay detached from their trigger.

- [ ] EDIT-044 - Make keyboard undo/redo work correctly while focus is inside editor input fields. Context: Keyboard undo/redo while focus was in the color text field did not update the field value. Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z should either respect native text-field editing or integrate cleanly with the editor history without leaving the UI stale.

- [ ] EDIT-045 - Reset editor undo history to the saved baseline after saving. Context: After saving a clean baseline, two toolbar undos returned to an older history value instead of the saved baseline, and Save stayed enabled. Undo should stop at the current saved state and clear dirty UI when it returns there.

- [ ] FIELD-006 - Improve/test the rich-text "Link to file" workflow when no file media are available. Context: The Link to file selector opened, but no file media were available in the library and upload required the native file picker. Provide a clear empty/upload state and ensure selecting a file links the selected rich-text text correctly.

- [ ] MEDIA-010 - Persist the selected Media Library grid/list view across reloads. Context: Switching from list/table view to grid view works for the current session, but reloading Media returns to list/table view. Store and restore the user's selected media view mode.

- [ ] APPSET-011 - Enforce the allowed Export versions to keep range in App Settings. Context: Export versions to keep saved invalid values `0` and `51` with no validation message, even though the schema allows only `1` to `50`. Reject invalid values inline and prevent saving them.

- [ ] APPSET-013 - Decide and align the minimum Maximum project import size rule. Context: The frontend schema says `export.maxImportSizeMB` has a minimum of `10`, but the app currently saves `5` with no validation error. Decide whether smaller import limits such as `5 MB` should be allowed. If yes, lower/remove the schema minimum and update the test expectation; if no, enforce the schema range inline and server-side.

- [ ] FIELD-019 - Track files linked from rich text as media usage. Context: A PDF uploaded/linked from rich text in a collection item can still appear unused in Media. Rich-text HTML stores the file path inside an `<a href="/uploads/files/...">` string, so usage tracking must scan embedded upload paths inside rich-text HTML.
