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

- [ ] START-001 - Open the app before any projects exist.
  Expected: After loading, the app shows the Projects area with "No projects yet" and a "New project" button.

- [ ] START-002 - With no projects, open the top-bar Manage menu.
  Expected: Projects and General settings are clickable; Themes is disabled or unavailable until a project exists.

- [ ] START-003 - With no projects, type a workspace URL such as `/pages` or `/media` into the browser address bar.
  Expected: The app redirects to the Projects list rather than showing a blank workspace.

- [ ] START-004 - Reload the empty Projects screen.
  Expected: The empty state appears again without errors.

---

## 2. Projects

### Create Projects

- [ ] PROJ-001 - From the empty Projects state, click "New project."
  Expected: The New project form opens with Title and Theme fields.

- [ ] PROJ-002 - Open the Theme dropdown.
  Expected: Installed themes are listed with their versions.

- [ ] PROJ-003 - Confirm the Theme field's initial state and open the Theme selector.
  Expected: The Theme field is preselected by design; clicking it shows where theme selection happens.

- [ ] PROJ-004 - Select a theme that has presets.
  Expected: Preset cards appear with names and screenshots; the default preset is highlighted.

- [ ] PROJ-005 - Click a different preset card.
  Expected: The new preset becomes selected and the previous one is deselected.

- [ ] PROJ-006 - Click the selected preset card again.
  Expected: The card becomes deselected if optional preset selection is allowed.

- [ ] PROJ-007 - Click a preset's "Live demo" link.
  Expected: The demo opens in a new tab/window and the New project form stays open with entered values intact.

- [ ] PROJ-008 - Create a project using the Blank preset.
  Expected: A success toast appears and the new project opens on the Pages screen with no starter pages.

- [ ] PROJ-009 - Create a project using a non-blank preset.
  Expected: A success toast appears and the project opens with starter pages, collections, menus, images, and settings.

- [ ] PROJ-010 - Create a project using a theme with no presets, if available.
  Expected: No preset grid appears and the project can be created from title and theme alone.

### Project Folder and Optional Details

- [ ] PROJ-011 - Type a project title with spaces and capital letters, then expand "More settings."
  Expected: Folder Name is auto-filled with a lowercase hyphenated value.

- [ ] PROJ-012 - Change Folder Name to a valid value using lowercase letters, numbers, and hyphens.
  Expected: No validation error appears.

- [ ] PROJ-013 - Type capital letters, spaces, or symbols into Folder Name and submit.
  Expected: An inline validation error appears and the project is not created.

- [ ] PROJ-014 - Clear the Title and submit.
  Expected: An inline title-required error appears and the project is not created.

- [ ] PROJ-015 - Clear Folder Name and submit.
  Expected: An inline folder-required error appears and the project is not created.

- [ ] PROJ-016 - Set Folder Name to the same folder name as an existing project and submit.
  Expected: The project is created with a collision-free folder name suffix, and a colliding project title is disambiguated with "(Copy)".

- [ ] PROJ-017 - Clear Theme back to "Select a theme" and submit, if the UI allows it.
  Expected: An inline theme-required error appears and the project is not created.

- [ ] PROJ-018 - Fill Notes, Site Title, and Website Address, create the project, then reopen Project details.
  Expected: All entered values are still present.

- [ ] PROJ-019 - Enter an invalid Website Address such as `not a url` and submit.
  Expected: An inline URL validation error appears and the project is not created.

- [ ] PROJ-020 - Enter a very long project title and notes.
  Expected: The form remains readable and long text does not break the layout.

- [ ] PROJ-021 - Enter punctuation-heavy or non-English text in the project title.
  Expected: The display title is preserved and the folder name becomes a safe URL-friendly value.

- [ ] PROJ-022 - Fill part of the New project form, then click Cancel.
  Expected: The form closes without creating a project.

- [ ] PROJ-023 - Make an unsaved change on the New project form, then try to navigate away.
  Expected: A confirmation warns about unsaved changes and allows staying or leaving.

### Project List and Activation

- [ ] PROJ-024 - Open the Projects list with several projects present.
  Expected: Each row shows title, theme name/version, and Updated date.

- [ ] PROJ-025 - Identify the active project row.
  Expected: The active row has an "Active" badge.

- [ ] PROJ-026 - Find a project with a theme update available.
  Expected: An update indicator is shown near the theme/version.

- [ ] PROJ-027 - Hover long project names, theme names, and Updated dates.
  Expected: Long values are truncated cleanly and full values are available via tooltip.

- [ ] PROJ-027A - Display a very long project title in the Projects list table.
  Expected: The long title is truncated or wraps within the table container without pushing the table outside the page/container.

- [ ] PROJ-028 - Click an inactive project's name.
  Expected: It becomes active and opens in the workspace on Pages.

- [ ] PROJ-029 - Click the active project's name.
  Expected: It opens in the workspace without changing active project state unnecessarily.

- [ ] PROJ-030 - Use an inactive project's actions menu to choose "Set as active project."
  Expected: The Active badge moves to that row without leaving the Projects list.

- [ ] PROJ-031 - Open the active project's actions menu.
  Expected: "Set as active project" is not offered for the active project.

- [ ] PROJ-032 - Use a project's actions menu to choose "Open project."
  Expected: That project becomes active and opens in the workspace.

### Edit, Duplicate, Backup, Import, Delete

- [ ] PROJ-033 - Open Project details for a project.
  Expected: The form opens pre-filled with that project's values.

- [ ] PROJ-034 - Look at the Theme field in Project details.
  Expected: Theme is read-only and cannot be changed after creation.

- [ ] PROJ-035 - Change the project Title and save.
  Expected: A success toast appears and the new title is shown.

- [ ] PROJ-036 - Toggle "Receive theme updates" and save.
  Expected: The setting persists after reopening Project details.

- [ ] PROJ-037 - Make an unsaved Project details change, then click Cancel.
  Expected: Cancel returns to Projects and discards unsaved Project details changes.

- [ ] PROJ-038 - Change Folder Name to a new valid value and save.
  Expected: The project is updated and still opens normally.

- [ ] PROJ-039 - Open Project details for a project with an available theme update.
  Expected: A theme-update banner shows current version and available version.

- [ ] PROJ-040 - Apply the available theme update.
  Expected: A progress state appears, then a success message confirms the update.

- [ ] PROJ-041 - After applying a theme update, check pages, collections, menus, media, and settings.
  Expected: Project content is intact.

- [ ] PROJ-042 - Duplicate a project.
  Expected: A new row appears named like the original with "(Copy)".

- [ ] PROJ-043 - Open the duplicated project and inspect pages, collections, menus, media, and site settings.
  Expected: The copy contains the same content and internal links still work.

- [ ] PROJ-044 - Duplicate the same project two more times.
  Expected: Copies are named predictably, such as "(Copy 2)" and "(Copy 3)".

- [ ] PROJ-045 - Download a project backup.
  Expected: An exporting/loading toast appears and then a timestamped ZIP downloads.

- [ ] PROJ-046 - Import a valid Widgetizer project backup ZIP.
  Expected: The import succeeds and the imported project opens as a new separate project.

- [ ] PROJ-047 - Import a file that is not a ZIP.
  Expected: The import is rejected with a clear message and no project is created.

- [ ] PROJ-048 - Import a malformed/corrupt ZIP, if provided.
  Expected: The import is rejected with a clear message and no partial project appears.

- [ ] PROJ-049 - Import an oversized backup ZIP, if provided.
  Expected: The import is rejected with a message naming the maximum size.

- [ ] PROJ-050 - Open the Import Backup modal and close it with Cancel, X, Escape, and outside click where supported.
  Expected: The modal closes and nothing is imported.

- [ ] PROJ-051 - Delete an inactive project and confirm.
  Expected: A confirmation names what will be deleted, then the row disappears after confirmation.

- [ ] PROJ-052 - Open delete confirmation for an inactive project and cancel.
  Expected: The project remains.

- [ ] PROJ-053 - Open the active project's actions menu.
  Expected: Delete is disabled or unavailable for the active project.

- [ ] PROJ-054 - Delete one inactive project, then check other projects.
  Expected: Only the targeted project is removed.

### Project Isolation

- [ ] PROJ-055 - Open Project A's Media page, switch active project to Project B, then open Media again.
  Expected: Only Project B's media appears.

- [ ] PROJ-056 - Switch active project and check the top bar plus collection sidebar entries.
  Expected: The entire workspace reflects the newly active project.

- [ ] PROJ-057 - Make unsaved editor changes, then switch active project.
  Expected: No changes are saved to the wrong project. If no warning appears, record the possible data-loss risk.

---

## 3. App Shell and Navigation

- [ ] SHELL-001 - Open the app when projects exist.
  Expected: The last active project opens on Pages.

- [ ] SHELL-002 - Look at the top bar in the workspace.
  Expected: It shows the current project name.

- [ ] SHELL-003 - Open the Manage menu.
  Expected: Projects, Themes, General settings, and active Project details are available as appropriate.

- [ ] SHELL-004 - Close the Manage menu with Escape.
  Expected: The menu closes.

- [ ] SHELL-005 - Close the Manage menu by clicking outside it.
  Expected: The menu closes.

- [ ] SHELL-006 - Use Manage to open Project details, Projects, Themes, and General settings.
  Expected: Each destination opens correctly.

- [ ] SHELL-007 - Use the workspace sidebar to open Pages, Collections, Menus, Media, Site settings, Site preview, and Export site.
  Expected: Each destination opens correctly.

- [ ] SHELL-008 - Click Site preview for a project with pages.
  Expected: Preview opens in a new tab/window.

- [ ] SHELL-009 - Check Site preview for a project with no pages.
  Expected: It is disabled or shows a sensible unavailable state.

- [ ] SHELL-010 - Reload the browser on Pages, Media, Settings, and Export site.
  Expected: The same screen reloads without a blank page.

- [ ] SHELL-011 - Visit a made-up app URL.
  Expected: A useful 404 screen appears.

- [ ] SHELL-012 - Click the 404 screen's back/dashboard action.
  Expected: The app returns to a valid screen.

- [ ] SHELL-013 - Click Documentation and Changelog links.
  Expected: They open externally in a new tab/window.

---

## 4. Themes

- [ ] THEME-001 - Open Themes from Manage.
  Expected: Installed themes appear with name, author, version, and preview imagery.

- [ ] THEME-002 - Look at a theme used by projects.
  Expected: An "In use" label appears.

- [ ] THEME-003 - Hover the "In use" label.
  Expected: A tooltip lists projects using that theme.

- [ ] THEME-004 - Expand and collapse a preset gallery.
  Expected: Presets hide/show and the toggle changes direction.

- [ ] THEME-005 - Click a preset "Live demo" link.
  Expected: The demo opens in a new tab/window.

- [ ] THEME-006 - Upload a valid new theme ZIP.
  Expected: Upload progress appears and the theme is added.

- [ ] THEME-007 - Drag and drop a valid theme ZIP.
  Expected: The drop zone highlights and upload succeeds.

- [ ] THEME-008 - Upload a newer version of an installed theme.
  Expected: The existing theme updates in place.

- [ ] THEME-009 - Select multiple files in the theme upload picker.
  Expected: The picker only allows one file to be selected.

- [ ] THEME-010 - Upload a non-ZIP file.
  Expected: Upload is rejected with a clear message.

- [ ] THEME-011 - Upload an oversized ZIP.
  Expected: Upload is rejected with a clear size message.

- [ ] THEME-012 - Upload a same-version theme ZIP.
  Expected: Upload is rejected as already installed or no newer version.

- [ ] THEME-013 - Upload a malformed theme ZIP, if provided.
  Expected: Upload is rejected and installed themes remain unchanged.

- [ ] THEME-014 - Upload an unsafe theme ZIP, if provided.
  Expected: Upload is rejected safely.

- [ ] THEME-015 - Check the Manage menu when theme updates are available.
  Expected: A badge shows the number of available updates.

- [ ] THEME-016 - Apply a pending theme update from the Themes page.
  Expected: The update succeeds and the badge count decreases.

- [ ] THEME-017 - Open a project after its theme was updated.
  Expected: Existing content and compatible settings are retained.

- [ ] THEME-018 - Delete an unused theme and confirm.
  Expected: The theme is removed.

- [ ] THEME-019 - Open delete confirmation for an unused theme and cancel.
  Expected: The theme remains.

- [ ] THEME-020 - Attempt to delete a theme used by projects.
  Expected: Delete is disabled and explains which projects use it.

- [ ] THEME-021 - On a fresh install, open the Themes page and look at the bundled theme.
  Expected: No update is offered. The theme that ships with the app is already current.

- [ ] THEME-022 - Create a project on a fresh install and check its theme version on the Projects list.
  Expected: It matches the version shown on the Themes page.

- [ ] THEME-023 - Simulate an upgraded user: set `version` in `data/themes/arch/theme.json` to the previous release (e.g. `0.9.9`), reload the Themes page.
  Expected: An update is offered for that theme.

- [ ] THEME-024 - Continue from THEME-023: click Update on the theme.
  Expected: It completes, and the theme now reports the current version.

- [ ] THEME-025 - Continue from THEME-024: open a project that was on the older version.
  Expected: The project shows an update indicator; applying it succeeds and the project's version advances.

- [ ] THEME-026 - Continue from THEME-025: open the project's Menus and its Header widget's menu setting.
  Expected: Menus are intact and the Header still has its menu selected. A theme update must never blank a nav.

- [ ] THEME-027 - Continue from THEME-025: check a page that uses a widget changed in the update.
  Expected: The widget renders with the new version; the page's own content and settings are unchanged.

- [ ] THEME-028 - Turn off theme updates for one project, then repeat THEME-023 to THEME-025.
  Expected: That project is never offered the update; other projects still are.

- [ ] THEME-029 - Restore the real state after THEME-023: delete `data/themes/arch` and restart the app (or re-run the theme sync).
  Expected: The theme is reinstalled at the current version and no update is offered.

- [ ] THEME-030 - Upload a theme ZIP whose base version differs from the installed one.
  Expected: Rejected, with a message naming both versions and explaining that the base version must stay put.

- [ ] THEME-031 - Upload a theme ZIP that keeps the installed base version and adds a new folder under `updates/`.
  Expected: Accepted; the new version is imported and offered to projects.

- [ ] THEME-032 - Upload the exact same theme ZIP a second time.
  Expected: Rejected as already up to date. Nothing changes.

---

## 5. Pages

- [ ] PAGE-001 - Open Pages.
  Expected: A table or empty state appears.

- [ ] PAGE-002 - On an empty project, click "New page."
  Expected: The page form opens.

- [ ] PAGE-003 - Type a title such as "About Us."
  Expected: Filename auto-fills as `about-us`.

- [ ] PAGE-004 - Create a valid page.
  Expected: A success message appears and the page is listed.

- [ ] PAGE-005 - Create a page with filename `index`.
  Expected: It saves successfully as the homepage.

- [ ] PAGE-006 - Type spaces/capitals in Filename and click away.
  Expected: Filename normalizes to lowercase hyphens.

- [ ] PAGE-007 - Try to create a page without a title.
  Expected: Creation is blocked with a title-required error.

- [ ] PAGE-008 - Try to create a page without a filename.
  Expected: Creation is blocked with a filename-required error.

- [ ] PAGE-009 - Try a filename made only of invalid characters.
  Expected: Creation is blocked or normalizes to an empty value with an error.

- [ ] PAGE-010 - Create a page with a filename that already exists.
  Expected: The new page is created with an automatically adjusted unique filename.

- [ ] PAGE-011 - Edit an existing page and change its filename to another existing page's filename.
  Expected: Save is blocked with a duplicate-filename message.

- [ ] PAGE-012 - Fill SEO fields: meta description, social title, canonical URL, robots option.
  Expected: Values persist after save and reopen.

- [ ] PAGE-013 - Select, upload, replace, remove, and save a social media image.
  Expected: The preview updates and persists correctly.

- [ ] PAGE-014 - Cancel new page creation.
  Expected: No page is created.

- [ ] PAGE-015 - Edit an existing page title and save.
  Expected: The page row updates and page content is preserved.

- [ ] PAGE-016 - Edit a page, make a change, then cancel.
  Expected: Cancel returns to Pages and discards unsaved page settings changes.

- [ ] PAGE-017 - Try to navigate away from unsaved page settings.
  Expected: A warning appears and lets you stay or leave.

- [ ] PAGE-018 - Open a page by clicking its title.
  Expected: The visual editor opens.

- [ ] PAGE-019 - Open a page through the row actions menu.
  Expected: The visual editor opens.

- [ ] PAGE-020 - Search pages by title and filename with different letter case.
  Expected: Matching rows appear.

- [ ] PAGE-021 - Search for something with no match.
  Expected: A clear no-results state appears.

- [ ] PAGE-022 - Select and deselect one page.
  Expected: Row highlight and selected count update.

- [ ] PAGE-023 - Select all currently filtered pages.
  Expected: Only visible matching rows are selected.

- [ ] PAGE-024 - Duplicate a page.
  Expected: A copy appears with widgets, blocks, SEO, and media references intact.

- [ ] PAGE-025 - Delete one page and confirm.
  Expected: The page is removed and page count updates.

- [ ] PAGE-026 - Open page delete confirmation and cancel.
  Expected: The page remains.

- [ ] PAGE-027 - Bulk delete selected pages and confirm.
  Expected: Selected pages are removed and selection clears.

- [ ] PAGE-028 - Bulk delete selected pages and cancel.
  Expected: Pages remain and selection is preserved.

- [ ] PAGE-029 - Duplicate or delete a page that uses media, then check Media usage.
  Expected: Media usage updates correctly.

- [ ] PAGE-030 - Delete the last page in a project, then try Site preview.
  Expected: The app shows a sensible no-page or not-found state.

- [ ] PAGE-031 - Open a page's More settings and look for Page Hierarchy.
  Expected: A Parent page picker is there, set to "None - this is a top-level page".

- [ ] PAGE-032 - Open the Parent page picker on a page that has children.
  Expected: The page itself, its own children, and the homepage are not offered.

- [ ] PAGE-033 - Set a parent page, save, and reopen the page.
  Expected: The choice stuck.

- [ ] PAGE-034 - Clear the parent back to None, save, and reopen.
  Expected: It is None again.

- [ ] PAGE-035 - Set a parent, then delete the parent page, then preview the child.
  Expected: The child still opens and behaves as a top-level page. Nothing errors.

---

## 6. Visual Page Editor

### Loading, Selecting, Adding

- [ ] EDIT-001 - Open a page in the editor.
  Expected: Top bar, structure panel, live preview, and settings panel appear.

- [ ] EDIT-002 - Wait for loading to finish.
  Expected: Page widgets appear in the structure panel.

- [ ] EDIT-003 - Confirm Global Header and Global Footer are shown.
  Expected: They appear as non-draggable global items.

- [ ] EDIT-004 - Click a widget in the structure panel.
  Expected: It is selected in structure, preview, and settings.

- [ ] EDIT-005 - Click a different widget in the preview.
  Expected: Selection changes everywhere.

- [ ] EDIT-006 - Select Global Header and change one setting.
  Expected: Header preview updates.

- [ ] EDIT-007 - Select Global Footer and change one setting.
  Expected: Footer preview updates.

- [ ] EDIT-008 - Add a widget at the start, between widgets, and at the end.
  Expected: The widget inserter opens in the correct position each time.

- [ ] EDIT-009 - Search widget names and aliases in the inserter.
  Expected: Matching widgets are shown.

- [ ] EDIT-010 - Search for a nonexistent widget.
  Expected: A "No widgets found" state appears.

- [ ] EDIT-011 - Add a widget using the mouse.
  Expected: The widget is inserted and selected.

- [ ] EDIT-012 - Add a widget using keyboard arrows and Enter.
  Expected: The highlighted widget is inserted.

- [ ] EDIT-013 - Close the inserter with Escape, Tab, and outside click.
  Expected: It closes without adding a widget.

- [ ] EDIT-014 - Check widgets with and without preview thumbnails.
  Expected: A thumbnail or graceful placeholder is shown.

### Organize, Copy, Delete

- [ ] EDIT-015 - Drag a widget to a new position.
  Expected: Structure order and preview order update.

- [ ] EDIT-016 - Collapse and expand a widget with blocks.
  Expected: Blocks hide and show.

- [ ] EDIT-017 - Rename a widget and press Enter.
  Expected: The new custom name appears.

- [ ] EDIT-018 - Rename a widget and press Escape.
  Expected: The previous name is kept.

- [ ] EDIT-019 - Open a widget action menu with the three-dot button and with right-click.
  Expected: Copy, Paste after, Duplicate, and Delete options appear.

- [ ] EDIT-021 - Open Paste after before copying anything.
  Expected: Paste after is disabled.

- [ ] EDIT-022 - Duplicate a widget with settings and blocks.
  Expected: The duplicate appears after the original and includes the same data.

- [ ] EDIT-023 - Copy a widget and paste it after another widget.
  Expected: A copy is inserted in the chosen place.

- [ ] EDIT-024 - Copy a widget and paste it through an insertion gap.
  Expected: The copied widget is inserted at that position.

- [ ] EDIT-025 - Copy a widget, switch projects, and open the inserter.
  Expected: No cross-project paste option is offered.

- [ ] EDIT-026 - Delete a widget from its action menu.
  Expected: The widget is removed and selection moves to a sensible neighbor.

- [ ] EDIT-027 - Press Delete/Backspace while a widget is selected and focus is not in a field.
  Expected: The selected widget is deleted.

- [ ] EDIT-028 - Press Delete/Backspace while typing in a text or rich-text field.
  Expected: Text editing happens; the widget is not deleted.

### Blocks

- [ ] EDIT-029 - Add each allowed block type to a block-capable widget.
  Expected: Blocks appear and render in preview.

- [ ] EDIT-030 - Add blocks at the start, between blocks, and at the end.
  Expected: Blocks are inserted at the chosen positions.

- [ ] EDIT-031 - Select a block and change a setting.
  Expected: The preview updates.

- [ ] EDIT-032 - Reorder blocks by drag and drop.
  Expected: Block order and preview update.

- [ ] EDIT-033 - Duplicate a block.
  Expected: The copy appears with the same settings.

- [ ] EDIT-034 - Delete a block.
  Expected: The block is removed and the widget still renders.

- [ ] EDIT-035 - Reach the maximum block count.
  Expected: Add/duplicate controls disappear or become disabled.

### Settings, Preview, Undo, Save

- [ ] EDIT-036 - Open the Settings dropdown and choose a theme setting group.
  Expected: Theme-wide settings appear in the right panel.

- [ ] EDIT-037 - Change a theme setting.
  Expected: Preview updates across the page.

- [ ] EDIT-038 - Switch embedded preview between mobile and desktop.
  Expected: The preview resizes accordingly.

- [ ] EDIT-039 - Open standalone Preview from the editor.
  Expected: A clean preview opens without editor controls.

- [ ] EDIT-040 - Click internal page and collection links in standalone preview.
  Expected: Preview navigates to the correct page/item.

- [ ] EDIT-041 - If preview shows a rendering error, click Reload.
  Expected: Preview attempts to render again.

- [ ] EDIT-042 - Undo a widget setting change.
  Expected: The setting and preview revert.

- [ ] EDIT-043 - Redo an undone change.
  Expected: The change returns.

- [ ] EDIT-044 - Use Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z.
  Expected: Undo/redo work without breaking text field editing.

- [ ] EDIT-045 - Make two changes, undo back to the original visible state.
  Expected: Undo becomes disabled and Save becomes disabled with no unsaved dot.

- [ ] EDIT-046 - Save with the button.
  Expected: Save shows a loading state, then becomes disabled and the unsaved dot disappears.

- [ ] EDIT-047 - Save with Ctrl/Cmd+S.
  Expected: Changes save and the unsaved dot disappears.

- [ ] EDIT-048 - Wait for autosave after a change, if autosave is enabled.
  Expected: The change saves automatically and the unsaved dot clears.

- [ ] EDIT-049 - Try to leave the editor with unsaved changes.
  Expected: A confirmation warns about unsaved changes.

- [ ] EDIT-050 - Reload after saving.
  Expected: Widget order, block order, values, custom names, and theme settings persist.

- [ ] EDIT-051 - Start with an empty page, add widgets, configure them, save, preview, and reload.
  Expected: The built page remains intact.

---

## 7. Field Controls

Test each control type wherever it appears: widget settings, collection forms, Site settings, or theme settings.

- [ ] FIELD-001 - View a header-type field.
  Expected: It appears as a non-editable section heading.

- [ ] FIELD-002 - Enter and clear text, number, date, and textarea values.
  Expected: Values update and clear correctly.

- [ ] FIELD-003 - Test number and range min/max/step behavior.
  Expected: Values are clamped or rejected appropriately.

- [ ] FIELD-004 - Use rich text: headings, bold, italic, bullets, numbered lists.
  Expected: Formatting appears and persists.

- [ ] FIELD-005 - Add, edit, and remove rich-text links.
  Expected: Link behavior updates correctly.

- [ ] FIELD-006 - Link rich text to a media file.
  Expected: The selected text links to the file.

- [ ] FIELD-007 - Insert an image into rich text where allowed.
  Expected: The image appears inline and persists.

- [ ] FIELD-008 - Paste formatted content from another website or document into rich text.
  Expected: Safe formatting is preserved and unsafe scripts/styles are removed.

- [ ] FIELD-009 - Use a code field, expand it, close with Done, Escape, and outside click.
  Expected: Code text remains exactly as entered.

- [ ] FIELD-010 - Use color swatches, hex values, and alpha/opacity where available.
  Expected: Color values update and persist.

- [ ] FIELD-011 - Use select, radio, and checkbox controls.
  Expected: Values change visibly and persist.

- [ ] FIELD-012 - Use the font picker search and weight selector.
  Expected: Selected font and weight are shown.

- [ ] FIELD-013 - Choose a menu in a menu field.
  Expected: The chosen menu is shown and persists.

- [ ] FIELD-014 - Upload, choose, replace, remove, and save an image field.
  Expected: Preview updates and saved value persists.

- [ ] FIELD-015 - Add, replace, remove, and reorder gallery images.
  Expected: Gallery rows update and persist.

- [ ] FIELD-016 - Add a blank gallery row and save.
  Expected: Blank row is not saved as real content.

- [ ] FIELD-017 - Add, edit, remove, and reorder table rows.
  Expected: Rows update and columns stay consistent.

- [ ] FIELD-018 - Add a fully blank table row and save.
  Expected: Blank row is not saved as real content.

- [ ] FIELD-019 - Upload, choose, replace, open, and remove a file field.
  Expected: File name/extension display correctly and file link works in preview.

- [ ] FIELD-020 - Select an internal page target in a link field.
  Expected: The page is selected and link works in preview.

- [ ] FIELD-021 - Select a collection item target in a link field.
  Expected: The item is selected and link works in preview.

- [ ] FIELD-022 - Enter an external URL in a link field.
  Expected: The URL is accepted and target behavior works.

- [ ] FIELD-023 - Enter `javascript:alert(1)` in a link field, save, and preview.
  Expected: The dangerous link is removed, blocked, or harmless.

- [ ] FIELD-024 - Enter `data:text/html,test` in a link field, save, and preview.
  Expected: The dangerous link is removed, blocked, or harmless.

- [ ] FIELD-025 - Use YouTube URL, video ID, options, remove, and invalid input.
  Expected: Valid input previews, options update, invalid input is rejected.

- [ ] FIELD-026 - Search, select, clear, and reset an icon.
  Expected: Icon state updates correctly.

- [ ] FIELD-027 - Switch between setting groups/tabs after entering values.
  Expected: Unsaved values remain present when returning.

---

## 8. Core Form Widget

- [ ] FORM-001 - Add the Core Form / Contact Form widget to a page.
  Expected: The form widget is added and selected.

- [ ] FORM-002 - Look at the form in live preview.
  Expected: A visible form appears with fields and a submit button.

- [ ] FORM-003 - Change form name and submit button label.
  Expected: The preview updates and the form still renders.

- [ ] FORM-004 - Add a normal field block and test Text, Email, Telephone, URL, and Textarea types.
  Expected: The preview changes to the matching input style.

- [ ] FORM-005 - Turn Required on for a field and preview the page.
  Expected: Submitting without that field is blocked or clearly marked invalid.

- [ ] FORM-006 - Add a Choice block with several options.
  Expected: A dropdown appears with those options.

- [ ] FORM-007 - Change the Choice block from Select to Radio.
  Expected: Radio options appear.

- [ ] FORM-008 - Add a required Consent block.
  Expected: A checkbox-style consent field appears and is required before submit.

- [ ] FORM-009 - Add Info and Social blocks if available.
  Expected: Supporting content appears without breaking the layout.

- [ ] FORM-010 - Change form style, alignment, sidebar position, color scheme, and spacing.
  Expected: The form remains readable on desktop and mobile widths.

- [ ] FORM-011 - Save, reload, and reopen the form widget.
  Expected: Settings and blocks persist.

- [ ] FORM-012 - Export a project containing one valid Core Form widget.
  Expected: Export succeeds.
  Note: Export view/download routes now pass, but this data set does not currently include the earlier Core Form QA fixture. Retest with a project containing a valid Core Form widget.

- [ ] FORM-013 - Download and unzip the export.
  Expected: `widgetizer.forms.json` exists when the site contains a Core Form widget.
  Note: Export ZIP downloads now pass generally; retest with a project containing a Core Form widget.

- [ ] FORM-014 - Open the exported site page containing the form.
  Expected: The form appears with the same fields and labels.
  Note: Export view now passes generally; retest with a project containing a Core Form widget.

- [ ] FORM-015 - Export a project with no Core Form widgets.
  Expected: Export succeeds and no `widgetizer.forms.json` file is present.

- [ ] FORM-016 - Create two form field blocks with the same label, then export.
  Expected: Export fails with a clear message explaining the duplicate field identifier.
  Note: Export view/download routes now pass; retest with a duplicate-field Core Form fixture.

- [ ] FORM-017 - Create two pages with forms using the same form name but different fields, then export.
  Expected: Export fails with a clear message explaining the form-name conflict.
  Note: Export view/download routes now pass; retest with a conflicting-form-name fixture.

- [ ] FORM-018 - Create more than five different form names across the site, then export.
  Expected: Export fails with a clear form-limit message.
  Note: Export view/download routes now pass; retest with a form-limit fixture.

- [ ] FORM-019 - Create a Choice block with no options or duplicate options, then export.
  Expected: Export fails with a clear invalid-choice message.
  Note: Export view/download routes now pass; retest with an invalid-choice Core Form fixture.

---

## 9. Collections

- [ ] COLL-001 - Open each collection type in an Arch project.
  Expected: News, Projects, and Services appear where the theme defines them.

- [ ] COLL-002 - Open a collection URL for a type not defined by the theme.
  Expected: A useful "Collection not found" message appears.

- [ ] COLL-003 - Open a populated collection list.
  Expected: Items show title, date/updated value, validation status, and actions.

- [ ] COLL-004 - Find an item missing required values.
  Expected: A "Needs attention" badge appears.

- [ ] COLL-005 - Create a first item from an empty collection.
  Expected: The new-item form opens.

- [ ] COLL-006 - Create a News item with title, date, excerpt, image, and body.
  Expected: The item is created and listed.

- [ ] COLL-007 - Create a Services item using every field its form provides.
  Expected: The item is created and listed.

- [ ] COLL-008 - Confirm title-derived filename and default date behavior.
  Expected: Filename and date are filled predictably.

- [ ] COLL-009 - Try saving with missing required fields.
  Expected: Save is blocked with field-level messages.

- [ ] COLL-010 - Try saving with blank, invalid, or duplicate filename.
  Expected: Save is blocked with a clear message.

- [ ] COLL-011 - Cancel item creation after selecting/uploading media.
  Expected: No item is created and media usage is not assigned to a nonexistent item.

- [ ] COLL-012 - Edit an item and save.
  Expected: Changes persist after reload.

- [ ] COLL-013 - Rename an item filename/slug.
  Expected: Its preview URL updates and internal references continue to work.

- [ ] COLL-014 - Add and persist SEO fields for item pages.
  Expected: Values persist after reload.

- [ ] COLL-015 - Preview a saved item with an item page.
  Expected: Preview opens and renders the item.

- [ ] COLL-016 - Check Preview on a new unsaved item.
  Expected: Preview is disabled or explains the item must be saved.

- [ ] COLL-017 - Search collection items by title and filename.
  Expected: Matching rows appear.

- [ ] COLL-018 - Use the "Needs attention" filter and return to all items.
  Expected: Filter toggles correctly.

- [ ] COLL-019 - Open an invalid legacy item.
  Expected: Field-level validation messages are visible on open.

- [ ] COLL-020 - Select/deselect one item and all filtered items.
  Expected: Selected count and row highlights stay accurate.

- [ ] COLL-021 - Duplicate an item.
  Expected: Field values, SEO, and media references are copied.

- [ ] COLL-022 - Delete one item and cancel deletion.
  Expected: Confirm removes it; Cancel keeps it.

- [ ] COLL-023 - Bulk delete items and cancel bulk deletion.
  Expected: Confirm removes selected items; Cancel keeps them selected.

- [ ] COLL-024 - Reorder sortable collection items.
  Expected: New order persists after reload.

- [ ] COLL-025 - Try to reorder while search/filter is active.
  Expected: Reordering is unavailable.

- [ ] COLL-026 - Open an item with leftover schema content.
  Expected: A leftover-content notice appears with unused field names.

- [ ] COLL-027 - Remove leftover content and confirm.
  Expected: Notice disappears.

- [ ] COLL-028 - Remove leftover content and cancel.
  Expected: Notice remains.

- [ ] COLL-029 - Create/edit/delete items using media, then check Media usage.
  Expected: Media usage updates correctly.

- [ ] COLL-030 - Select a collection listing widget (e.g. News Grid) in the page editor.
  Expected: Its settings include a "Main News page" checkbox, named after the collection.

- [ ] COLL-031 - Select a widget that does not list a collection.
  Expected: No such checkbox.

- [ ] COLL-032 - Tick the checkbox on one page and save, then tick it on a second page and save.
  Expected: A message says it moved, naming the first page. Reopening the first page shows it unticked.

- [ ] COLL-033 - Duplicate a page that is a collection's main page.
  Expected: The copy is not marked as the main page; the original still is.

- [ ] COLL-034 - Select a News Grid in the page editor, then a widget that does not list a collection.
  Expected: The grid shows "Split into pages" just above "Main News page"; the other widget shows neither.

- [ ] COLL-035 - On a grid with fewer items than the collection holds, tick "Split into pages".
  Expected: Page links appear under the list in the editor and "Main News page" ticks itself. If items to show was 0, it becomes 12.

- [ ] COLL-036 - With "Split into pages" on, try to set items to show to 0.
  Expected: It becomes 1. With the split off, 0 is allowed again.

- [ ] COLL-037 - Add a second grid to the same page and tick "Split into pages" on it.
  Expected: An error names the grid that is already split; the second grid stays unsplit.

- [ ] COLL-038 - Split a grid on one page and save, then split a grid for the same collection on another page and save.
  Expected: A message says the main page moved. Reopening the first page shows both checkboxes unticked.

- [ ] COLL-039 - Duplicate a split grid, copy and paste it, and duplicate the whole page.
  Expected: Every copy has "Split into pages" and "Main News page" off; the original keeps both.

- [ ] COLL-040 - Open Site preview on the split page and click 2, Next and Previous, then a menu link and back.
  Expected: Each page shows the next items, the active menu item stays on the page, and with breadcrumbs on page 2 shows Home > News > Page 2, where News goes back to page 1.

- [ ] COLL-041 - Export with Clean URLs off and open the files from disk.
  Expected: `news.html`, `news/page/2.html`, … exist, with no `news/page/1.html`. On every page the page links, breadcrumbs, logo, article links and images all work.

- [ ] COLL-042 - Repeat COLL-041 with Clean URLs on, served from a host or local server.
  Expected: Same pages, addresses without .html.

- [ ] COLL-043 - With a Site URL set, export and view the source of page 2.
  Expected: The title reads "News - 2 - Site title", the canonical points at page 2, prev and next links are present, and `sitemap.xml` lists pages 2 onwards.

- [ ] COLL-044 - Set items per page to at least the number of items and export.
  Expected: No page links and no `news/page` folder.

- [ ] COLL-045 - Split a grid on the homepage and export.
  Expected: `page/2.html` sits at the top of the export, and its links back to the homepage work.

- [ ] COLL-046 - Try to name a new page "page", rename a page to "page", and name a News item "page".
  Expected: Each is refused with a "reserved" message.

- [ ] COLL-047 - Name a page "collection", split a grid on it, and open its page 2 in Site preview.
  Expected: Its own page 2 opens, not an error.

- [ ] COLL-048 - Apply the Arch 0.9.10 theme update to a project on 0.9.9, then reload the editor tab.
  Expected: The News, Projects and Services grids offer "Split into pages".

---

## 10. Menus

- [ ] MENU-001 - Open Menus.
  Expected: A table or empty state appears.

- [ ] MENU-002 - Create a menu with title only.
  Expected: It is created and opens in the structure editor.

- [ ] MENU-003 - Create a menu with title and description.
  Expected: Both values persist.

- [ ] MENU-004 - Try to create a menu with blank or spaces-only title.
  Expected: Creation is blocked with an inline error.

- [ ] MENU-005 - Cancel menu creation with unsaved values.
  Expected: Cancel returns to Menus and no menu is created.

- [ ] MENU-006 - Edit menu title and description.
  Expected: Values save and persist.

- [ ] MENU-007 - Try to leave menu settings with unsaved changes.
  Expected: A warning appears.

- [ ] MENU-008 - Open menu structure by clicking menu title and by actions menu.
  Expected: The structure editor opens.

- [ ] MENU-009 - Add top-level, child, and grandchild menu items.
  Expected: Items appear at three supported levels.

- [ ] MENU-010 - Try to create a fourth nesting level.
  Expected: The UI prevents deeper nesting.

- [ ] MENU-011 - Edit a menu item label.
  Expected: Label updates and unsaved state appears.

- [ ] MENU-012 - Link a menu item to a page.
  Expected: The page is selected and link works in preview.

- [ ] MENU-013 - Link a menu item to a collection listing or item page where available.
  Expected: The link works in preview.

- [ ] MENU-014 - Enter an external URL.
  Expected: The custom URL is accepted.

- [ ] MENU-015 - Enter `javascript:alert(1)` as a custom URL, save, and preview.
  Expected: The dangerous link is removed, blocked, or harmless.

- [ ] MENU-016 - Rename or delete a page linked from a menu, then return to the menu.
  Expected: Renamed pages keep working; deleted targets are cleared or explained.

- [ ] MENU-017 - Expand/collapse one branch and all branches.
  Expected: Visibility changes correctly.

- [ ] MENU-018 - Reorder and nest menu items by drag and drop.
  Expected: Items move and nesting changes correctly.

- [ ] MENU-019 - Try to drag a parent onto its own descendant.
  Expected: The invalid drop is rejected.

- [ ] MENU-020 - Delete a menu item with children.
  Expected: The item and descendants are removed after expected feedback.

- [ ] MENU-021 - Save menu structure and preview navigation.
  Expected: Preview reflects saved labels, order, and links.

- [ ] MENU-022 - Cancel unsaved structure changes.
  Expected: Changes are discarded after confirmation.

- [ ] MENU-023 - Duplicate a menu.
  Expected: The full nested structure is copied.

- [ ] MENU-024 - Delete a menu and cancel deletion.
  Expected: Confirm removes it; Cancel keeps it.

- [ ] MENU-025 - Build a menu with very long labels and preview it on mobile width.
  Expected: Labels do not overlap and the menu remains usable.

---

## 11. Media Library

- [ ] MEDIA-001 - Open Media for a project with no files.
  Expected: Empty state and upload box appear.

- [ ] MEDIA-002 - Upload JPG, PNG, GIF, WebP, SVG, PDF, and MP3 through the picker.
  Expected: Each accepted file appears in the library.

- [ ] MEDIA-003 - Drag and drop an image file.
  Expected: Drop zone highlights and upload succeeds.

- [ ] MEDIA-004 - Upload several supported files together.
  Expected: Batch/progress feedback appears.

- [ ] MEDIA-005 - Upload an unsupported `.txt` or `.exe` file.
  Expected: Upload is rejected with a clear reason.

- [ ] MEDIA-006 - Upload a file larger than the configured maximum.
  Expected: Upload is rejected with a clear size message.

- [ ] MEDIA-007 - Upload a mixed batch with valid and invalid files.
  Expected: Valid files are kept and invalid files are reported separately.

- [ ] MEDIA-008 - Upload an unsafe SVG fixture, if provided.
  Expected: Unsafe content is removed and viewing the SVG does not run anything unexpected.

- [ ] MEDIA-009 - Upload two files with the same original filename.
  Expected: Both are kept with unique stored filenames.

- [ ] MEDIA-010 - Switch between grid and list views, then reload.
  Expected: The chosen view is retained.

- [ ] MEDIA-011 - Search by original filename.
  Expected: Matching files appear.

- [ ] MEDIA-012 - Filter All, Images, Audio, and Files.
  Expected: The library shows the correct file types.

- [ ] MEDIA-013 - Select/deselect one file and all filtered files.
  Expected: Selection count and highlights update.

- [ ] MEDIA-014 - Open an image in the lightbox and use next/previous arrows.
  Expected: Image navigation works.

- [ ] MEDIA-015 - Open a PDF or MP3.
  Expected: The file opens in a new tab/window, not the image lightbox.

- [ ] MEDIA-016 - Copy a media URL.
  Expected: A toast confirms the URL was copied.

- [ ] MEDIA-017 - Edit image alt text, title, and caption.
  Expected: Values save and persist.

- [ ] MEDIA-018 - Clear required alt text and save.
  Expected: Save is blocked with an inline required-field error.

- [ ] MEDIA-019 - Close metadata drawer with Cancel, Escape, and outside click.
  Expected: Unsaved changes are discarded.

- [ ] MEDIA-020 - Use an image in page, collection item, Header, Footer, and Site settings.
  Expected: The "Used in" badge lists all locations.

- [ ] MEDIA-021 - Refresh media usage.
  Expected: Usage badges update.

- [ ] MEDIA-022 - Delete an unused file and cancel deletion.
  Expected: Confirm removes it; Cancel keeps it.

- [ ] MEDIA-023 - Try to delete an in-use file.
  Expected: Delete is unavailable or blocked with explanation.

- [ ] MEDIA-024 - Bulk delete unused files.
  Expected: Selected unused files are removed.

- [ ] MEDIA-025 - Bulk delete a mix of unused and in-use files.
  Expected: Unused files are removed; in-use files are kept and explained.

- [ ] MEDIA-026 - Open media selector from image, file, gallery, rich-text, and SEO fields.
  Expected: Selector opens without leaving the form.

- [ ] MEDIA-027 - Upload inside the media selector.
  Expected: The new file appears and can be selected.

- [ ] MEDIA-028 - Switch projects and open Media.
  Expected: Only the new active project's media appears.

- [ ] MEDIA-029 - Upload an MP3, add it to an audio-capable widget or file field if available, preview it, and seek.
  Expected: Audio plays and seeking works.

- [ ] MEDIA-030 - Open a missing/broken media fixture, if provided.
  Expected: The app gives useful recovery information rather than crashing.

---

## 12. Site Settings

- [ ] SITESET-001 - Open Site settings.
  Expected: Setting-group tabs appear on the left and fields on the right.

- [ ] SITESET-002 - Click each setting group.
  Expected: The right panel changes and the active tab is highlighted.

- [ ] SITESET-003 - Change text, color, range, select, checkbox, image, and font settings where available.
  Expected: Values update and unsaved state appears.

- [ ] SITESET-004 - Save Site settings.
  Expected: A success toast appears and unsaved state clears.

- [ ] SITESET-005 - Reload and reopen Site settings.
  Expected: Saved values persist.

- [ ] SITESET-006 - Reset unsaved changes.
  Expected: Values return to the last saved state.

- [ ] SITESET-007 - Try to leave with unsaved Site settings.
  Expected: A warning appears and lets you stay or leave.

- [ ] SITESET-008 - Preview a page affected by a changed Site setting.
  Expected: Preview reflects the saved setting.

- [ ] SITESET-009 - Enter very long text values in Site settings.
  Expected: Layout remains usable and values persist.

- [ ] SITESET-010 - If custom code fields exist, enter harmless visible test code, save, preview, and export.
  Expected: The code appears only where intended by the theme.

- [ ] SITESET-011 - Enter a Site URL with a query string (`https://example.com/?utm_source=x`) and save.
  Expected: Rejected, and the message says to remove the `?` part rather than just "invalid URL".

- [ ] SITESET-012 - Enter a Site URL with a `#` fragment (`https://example.com/#top`) and save.
  Expected: Rejected the same way.

- [ ] SITESET-013 - Enter a Site URL pointing at a subfolder (`https://example.com/blog/`) and save.
  Expected: Accepted. A site published inside a folder is a normal setup.

- [ ] SITESET-014 - Enter the same subfolder address without the trailing slash (`https://example.com/blog`) and save.
  Expected: Accepted, and everything it generates later is identical to SITESET-013.

- [ ] SITESET-015 - Enter clearly wrong values: `mysite.com`, `https://localhost`, `ftp://example.com`.
  Expected: Each is rejected.

- [ ] SITESET-016 - Clear the Site URL entirely and save.
  Expected: Accepted. The field is optional.

---

## 13. General Application Settings

- [ ] APPSET-001 - Open General settings from Manage.
  Expected: General, Media, Export, and Developer tabs appear.

- [ ] APPSET-002 - Change language if options exist.
  Expected: The selected language is saved or clearly unavailable.

- [ ] APPSET-003 - Change date format and save.
  Expected: Dates in multiple lists use the selected format.

- [ ] APPSET-004 - Set maximum upload size to a valid value.
  Expected: Value saves and upload limit text updates where shown.

- [ ] APPSET-005 - Set maximum upload size above and below allowed range.
  Expected: Invalid values are rejected.

- [ ] APPSET-006 - Set image quality to a valid value.
  Expected: Value saves.

- [ ] APPSET-007 - Set image quality above 100 or blank.
  Expected: Invalid values are rejected.

- [ ] APPSET-008 - Edit image size settings when the active theme does not own image sizes.
  Expected: Controls are editable and save.

- [ ] APPSET-009 - Open General settings when the active theme owns image sizes.
  Expected: App image-size controls are hidden or disabled with an explanatory notice.

- [ ] APPSET-010 - Set Export versions to keep to a valid value.
  Expected: Value saves.

- [ ] APPSET-011 - Set Export versions to keep to `0` or above the allowed range.
  Expected: Invalid values are rejected.

- [ ] APPSET-012 - Set Maximum project import size to a valid value.
  Expected: Value saves.

- [ ] APPSET-013 - Set Maximum project import size to a small / out-of-range value.
  Expected: Small whole-MB values are allowed (no artificial floor); only values below 1 or above 2000 are rejected.

- [ ] APPSET-014 - Turn Developer mode on and save.
  Expected: Developer-only export features appear.

- [ ] APPSET-015 - Turn Developer mode off and save.
  Expected: Developer-only export features disappear.

- [ ] APPSET-016 - Reset unsaved General settings.
  Expected: Values return to last saved state.

- [ ] APPSET-017 - Cancel General settings with no unsaved changes.
  Expected: The app returns to the previous screen.

- [ ] APPSET-018 - Change a setting, click Cancel, and choose to leave/discard.
  Expected: The previous saved value is restored when reopened.

- [ ] APPSET-019 - Try to leave General settings with unsaved changes.
  Expected: A warning appears and lets you stay or leave.

---

## 14. Site Preview

- [ ] PREVIEW-001 - Open Site preview for a project with `index`.
  Expected: Homepage opens.

- [ ] PREVIEW-002 - Open Site preview for a project with pages but no `index`.
  Expected: Preview opens an available page.

- [ ] PREVIEW-003 - Check Site preview for a project with no pages.
  Expected: Preview is disabled or shows a sensible unavailable state.

- [ ] PREVIEW-004 - Switch preview between desktop and mobile.
  Expected: Preview width changes and preference is remembered if supported.

- [ ] PREVIEW-005 - Reload the preview tab/window.
  Expected: Preview reloads successfully.

- [ ] PREVIEW-006 - Click page and collection item links.
  Expected: Preview navigates correctly.

- [ ] PREVIEW-007 - Click external links configured for same-window and new-tab behavior.
  Expected: External links are inert in standalone preview for now.

- [ ] PREVIEW-008 - Check header, main content, footer, menus, images, and theme settings.
  Expected: Everything renders correctly.

- [ ] PREVIEW-009 - Change preview address to a missing page.
  Expected: A clear not-found message appears.

- [ ] PREVIEW-010 - Change preview address to a missing collection item.
  Expected: A clear not-found message appears.

---

## 15. Export Site

### Export UI

- [ ] EXPORT-001 - Open Export site.
  Expected: Export creator and export history/empty state appear.

- [ ] EXPORT-002 - Create a static export.
  Expected: Button shows loading, then export succeeds.

- [ ] EXPORT-003 - Try to trigger export again while export is running.
  Expected: Duplicate submission is prevented.

- [ ] EXPORT-004 - Export with "Also export pages as Markdown (.md)" checked.
  Expected: Export succeeds.

- [ ] EXPORT-005 - Export a project with no homepage or no pages.
  Expected: Export fails with a clear explanation.

- [ ] EXPORT-006 - Check export history rows.
  Expected: Version, date/time, size, and status appear.

- [ ] EXPORT-007 - Set versions to keep to a small number and create more exports.
  Expected: Only the configured number remains.

- [ ] EXPORT-008 - View an export.
  Expected: The exported site opens from the backend/export route, not the app 404 page.

- [ ] EXPORT-009 - Download an export ZIP.
  Expected: A ZIP downloads, not an HTML app shell.

- [ ] EXPORT-010 - Delete an export and cancel deletion.
  Expected: Confirm removes it; Cancel keeps it.

- [ ] EXPORT-011 - With Developer mode on, check the Issues column.
  Expected: Issues links appear only where reports exist.

- [ ] EXPORT-012 - Open an issues report.
  Expected: The report opens and lists issues by page with understandable messages.

- [ ] EXPORT-013 - Switch active projects and inspect export history.
  Expected: Only the active project's exports are shown.

### Exported Site and ZIP Contents

- [ ] EXPZIP-001 - Download and unzip a successful export.
  Expected: The ZIP opens normally and contains website files.

- [ ] EXPZIP-002 - Find `index.html`.
  Expected: The homepage file is present.

- [ ] EXPZIP-003 - Check for one exported HTML file per page.
  Expected: Each page is present as an `.html` file.

- [ ] EXPZIP-003A - With the project's Clean URLs setting off (default), open an exported page's source.
  Expected: Menu, button and text links to other pages end in `.html` (`about.html`, `news/alpha.html`, home `index.html`); the canonical tag and `sitemap.xml` use `.html` too.

- [ ] EXPZIP-003B - Turn on Clean URLs (Project settings › More settings), export again, open the same page's source.
  Expected: Those links are extensionless (`about`, `news/alpha`, home `./`; from a collection item page `../about`, `../`); canonical tag and `sitemap.xml` drop `.html`; the exported file names are still `about.html` / `news/alpha.html`. A link you typed by hand (e.g. `contact.html`) is unchanged.

- [ ] EXPZIP-003C - View the Clean URLs export in the built-in export viewer and click an extensionless link.
  Expected: `about` opens `about.html`; the home link opens the index page.

- [ ] EXPZIP-004 - If Markdown export was enabled, check for matching `.md` files.
  Expected: Each page has a readable `.md` file.

- [ ] EXPZIP-005 - Open one `.md` file.
  Expected: It contains readable content and frontmatter.

- [ ] EXPZIP-006 - Check for `manifest.json`.
  Expected: It is present at the export root.

- [ ] EXPZIP-007 - If Website Address is set, check for `sitemap.xml` and `robots.txt`.
  Expected: Files exist and use the configured Website Address.

- [ ] EXPZIP-008 - If any page/item is noindex, inspect robots behavior.
  Expected: Noindex pages/items are reflected in exported SEO output.

- [ ] EXPZIP-009 - If a site icon is set, inspect exported icon files.
  Expected: Icon files and/or `site.webmanifest` are present.

- [ ] EXPZIP-010 - Open the exported site and navigate internal links and menus.
  Expected: Links work inside the exported site.

- [ ] EXPZIP-011 - Open pages using images, PDFs, and MP3s.
  Expected: Used assets load/open correctly.

- [ ] EXPZIP-012 - Confirm active-project isolation.
  Expected: Export contains only the active project's pages and files.

- [ ] EXPZIP-013 - Check for `.DS_Store` or obvious computer metadata files.
  Expected: System metadata files are not included.

- [ ] EXPZIP-014 - With a plain Site URL (`https://example.com`), export and open `sitemap.xml`.
  Expected: The homepage appears as `https://example.com/` and other pages as full addresses under it.

- [ ] EXPZIP-015 - Same export: open `robots.txt`.
  Expected: The `Sitemap:` line points at `https://example.com/sitemap.xml`.

- [ ] EXPZIP-016 - Same export: open a page's HTML and find its canonical link.
  Expected: It is the page's full address under the Site URL.

- [ ] EXPZIP-017 - Set the Site URL to a subfolder (`https://example.com/blog/`), export, and check `sitemap.xml`.
  Expected: Every address keeps `/blog/`, including the homepage. Nothing points at the bare domain.

- [ ] EXPZIP-018 - Repeat EXPZIP-017 with the trailing slash removed from the Site URL.
  Expected: The exported addresses are identical to EXPZIP-017.

- [ ] EXPZIP-019 - With a subfolder Site URL, mark a page as noindex, export, and open `robots.txt`.
  Expected: The Disallow line includes the folder (`/blog/secret.html`), not a bare `/secret.html`.

- [ ] EXPZIP-020 - With a subfolder Site URL, set a page's social sharing image, export, and check that page's HTML.
  Expected: The social image address includes the folder and is a complete web address.

- [ ] EXPZIP-021 - Repeat EXPZIP-017 to EXPZIP-020 with Clean URLs turned on.
  Expected: Same addresses without the `.html` endings.

- [ ] EXPZIP-022 - Export a project with the Site URL left empty.
  Expected: The export succeeds. `sitemap.xml` and `robots.txt` are simply not produced, and pages carry no canonical or social image address.

- [ ] EXPZIP-023 - Set a page's own canonical address by hand, then export.
  Expected: That page keeps exactly what you typed, regardless of the Site URL.

- [ ] EXPZIP-024 - Export with markdown output enabled and open a page's HTML.
  Expected: The markdown alternate link is a full address under the Site URL, folder included.

---

## 16. Cross-Cutting Usability and Safety

- [ ] UX-001 - Trigger destructive actions across Projects, Themes, Pages, Collections, Menus, Media, and Export.
  Expected: Each confirmation names the affected item.

- [ ] UX-002 - Close menus, modals, and drawers with visible controls, Escape, and outside click where supported.
  Expected: They close without making changes.

- [ ] UX-003 - Watch save/upload/update/export buttons during running operations.
  Expected: Duplicate submission is prevented.

- [ ] UX-004 - Trigger success, warning, info, and error toasts.
  Expected: Toasts are clear, dismissible, and do not pile up endlessly.

- [ ] UX-005 - Open action menus near screen edges.
  Expected: Menus stay inside the viewport.

- [ ] UX-006 - Use very long names, Unicode, punctuation-heavy text, and duplicate-like names across forms.
  Expected: The app handles them predictably without layout breakage.

- [ ] UX-007 - Reload, close, use browser Back, and navigate away with unsaved changes.
  Expected: The app warns before data loss where supported.

- [ ] UX-008 - Switch projects while pages, settings, media, or export data are loading.
  Expected: Stale data does not overwrite or appear in the new project.

- [ ] UX-009 - Use the app with a large project containing many pages, items, media files, and long widget lists.
  Expected: The app remains usable.

---

## 17. Stable Links and Reference Integrity

These tests cover stable internal references for structured `link` settings. Richtext links are raw HTML anchors today and are marked where stable-link behavior is not implemented yet.

- [ ] LINK-001 - Link a menu item to a page, rename the page, then preview the menu.
  Expected: The menu link follows the page's new slug.

- [ ] LINK-002 - Link a menu item to a page, delete the page, then reopen the menu.
  Expected: The deleted page target is cleared or clearly explained.

- [ ] LINK-003 - Link a page widget's top-level `link` field to a page, rename the page, then preview.
  Expected: The widget link follows the page's new slug.

- [ ] LINK-004 - Link a page widget's top-level `link` field to a page, delete the page, then preview.
  Expected: The widget link is cleared or rendered harmless.

- [ ] LINK-005 - Link a widget block `link` field to a page, rename the page, then preview.
  Expected: The block link follows the page's new slug.

- [ ] LINK-006 - Link a widget block `link` field to a page, delete the page, then preview.
  Expected: The block link is cleared or rendered harmless.

- [ ] LINK-007 - Link a Header or Footer global widget `link` field to a page, rename the page, then preview.
  Expected: The global link follows the page's new slug.

- [ ] LINK-008 - Link a Header or Footer global widget `link` field to a page, delete the page, then preview.
  Expected: The global link is cleared or rendered harmless.

- [ ] LINK-009 - Link a collection item `link` field to a page, rename the page, then preview the item.
  Expected: The collection item link follows the page's new slug.

- [ ] LINK-010 - Link a collection item `link` field to a page, delete the page, then reopen/preview the item.
  Expected: The collection item link is cleared or rendered harmless.

- [ ] LINK-011 - Link a menu item to a collection item, rename the collection item slug, then preview the menu.
  Expected: The menu link follows the collection item's new slug.

- [ ] LINK-012 - Link a menu item to a collection item, delete the collection item, then reopen the menu.
  Expected: The deleted item target is cleared or clearly explained.

- [ ] LINK-013 - Link a page widget's top-level `link` field to a collection item, rename the item slug, then preview.
  Expected: The widget link follows the collection item's new slug.

- [ ] LINK-014 - Link a page widget's top-level `link` field to a collection item, delete the item, then preview.
  Expected: The widget link is cleared or rendered harmless.

- [ ] LINK-015 - Link a widget block `link` field to a collection item, rename the item slug, then preview.
  Expected: The block link follows the collection item's new slug.

- [ ] LINK-016 - Link a widget block `link` field to a collection item, delete the item, then preview.
  Expected: The block link is cleared or rendered harmless.

- [ ] LINK-017 - Link one collection item's `link` field to another collection item, rename the target item slug, then preview.
  Expected: The source item link follows the target item's new slug.

- [ ] LINK-018 - Link one collection item's `link` field to another collection item, delete the target item, then reopen/preview the source item.
  Expected: The source item link is cleared or rendered harmless.

- [ ] LINK-019 - Duplicate a project containing page and collection-item stable links in menus, widgets, blocks, globals, and collection items.
  Expected: All stable refs are remapped to the duplicated project's own pages/items, with no cross-project references.

- [ ] LINK-020 - Create a project from a preset that ships internal slug links.
  Expected: Page and collection-item links in menus, widgets, blocks, globals, and collection items are enriched into stable refs where supported.

- [ ] LINK-021 - Export or preview content containing stable page and collection-item links from root pages and nested collection item pages.
  Expected: Links render with the current target slug and correct relative path.

- [ ] LINK-022 - Add a page link inside widget, block, or global richtext, then rename/delete the page.
  Expected: The richtext link follows the page's new slug on rename and becomes plain text (unwrapped) on delete; preview and export render the current slug, depth-aware.

- [ ] LINK-023 - Add a page link inside collection item richtext, then rename/delete the page.
  Expected: Same as LINK-022 but for a page link authored inside a collection item's richtext field.

- [ ] LINK-024 - Add a collection item link inside widget, block, or global richtext, then rename/delete the target item.
  Expected: The richtext link follows the item's new slug on rename and becomes plain text on delete; preview and export render the current `slugPrefix/slug`, depth-aware.

- [ ] LINK-025 - Add a collection item link inside collection item richtext, then rename/delete the target item.
  Expected: Same as LINK-024 but for an item link authored inside a collection item's richtext field.

- [ ] LINK-026 - Take an existing richtext internal link and switch it to a different page, then to a collection item, then to an external URL, then to a "Link to file".
  Expected: Each switch keeps exactly one stable ref (page→page-uuid only, item→item-uuid only) or none (external/file); no stale uuid from the previous target lingers, so render always resolves to the current target.

- [ ] LINK-027 - Open a theme-settings richtext field (page-editor theme panel and admin Theme Settings) and try to add a link.
  Expected: Only the URL box is offered (no page/item picker); a stable internal ref cannot be authored there (theme settings are out of scope).

- [ ] LINK-028 - Add a richtext link to a page, rename the page's slug, then REOPEN the editor (not just preview).
  Expected: The editor displays the link with the current slug, not the authoring-time slug; saved output is unchanged until you actually edit.

- [ ] LINK-029 - Create, rename, or delete a page, then immediately open a richtext link picker.
  Expected: The new/renamed/removed page is reflected in the picker right away (no ~60s stale-cache delay).

- [ ] LINK-030 - Open a richtext that already contains a stable internal link (e.g. preset/enriched content), make an unrelated edit, save, and reopen.
  Expected: The link's stable ref survives the edit/save round-trip and still follows a later target rename.

- [ ] LINK-031 - Author a richtext link via HTML source mode, including single-quoted attributes, then rename/delete the target and duplicate the project.
  Expected: The link resolves at render and is cleaned (on delete) / remapped (on duplication) on disk despite single-quoted source HTML.

- [ ] LINK-032 - Turn Clean URLs off, open the homepage in preview, and click the header logo.
  Expected: It returns to the homepage.

- [ ] LINK-033 - Repeat LINK-032 with Clean URLs on.
  Expected: Same result.

- [ ] LINK-034 - Open a collection item page in preview (e.g. a News item) and click the header logo.
  Expected: It returns to the homepage, not a missing page. Item pages sit one level deeper, which is where this usually breaks.

- [ ] LINK-035 - Repeat LINK-034 with Clean URLs on.
  Expected: Same result.

- [ ] LINK-036 - Export the site, open the exported `index.html` from disk, and click the logo.
  Expected: It stays on the homepage.

- [ ] LINK-037 - From the same export, open an item page from disk (e.g. `news/<item>.html`) and click the logo.
  Expected: It reaches the homepage.

- [ ] LINK-038 - Repeat LINK-036 and LINK-037 on an export made with Clean URLs on.
  Expected: Same results.

- [ ] LINK-039 - Turn breadcrumbs on (Site settings > General > Show breadcrumbs) and preview the homepage.
  Expected: No breadcrumb trail at all.

- [ ] LINK-040 - Preview a page with no parent set.
  Expected: Home > Page.

- [ ] LINK-041 - Set a parent (and a parent's parent), then preview the deepest page.
  Expected: The full trail in order, e.g. Home > About Us > Our Team. Every crumb but the last is a link; click them.

- [ ] LINK-042 - Preview a collection item while exactly one page lists that collection.
  Expected: Home > That Page > Item, with no configuration needed.

- [ ] LINK-043 - Add the same listing widget to a second page, then preview the item again.
  Expected: Home > Item. With two candidates it does not guess.

- [ ] LINK-044 - Tick "Main News page" on one of them, save, and preview the item.
  Expected: The trail is back to Home > That Page > Item.

- [ ] LINK-045 - Give the main collection page a parent, then preview an item.
  Expected: The item's trail grows too, e.g. Home > About Us > News > My Article.

- [ ] LINK-046 - Export and open an exported page, then an exported item page, and click every crumb.
  Expected: All land on the right page. From an item page the links reach back up a directory.

- [ ] LINK-047 - Turn Clean URLs on, export again, and repeat LINK-046.
  Expected: Same destinations, addresses without .html.

- [ ] LINK-048 - Rename a page that appears in another page's trail, then preview that page.
  Expected: The crumb shows the new name and still links correctly.

---

## 18. Electron Desktop App

Run the web-app sections above in the desktop app too. This section covers only desktop-specific differences.

- [ ] ELEC-001 - Open the installed desktop app.
  Expected: A native app window opens, not a browser tab.

- [ ] ELEC-002 - Trigger a file upload.
  Expected: The operating system's native file-open dialog appears.

- [ ] ELEC-003 - Download a project backup.
  Expected: The ZIP saves through the desktop app's download/save flow.

- [ ] ELEC-004 - Download an export ZIP.
  Expected: The ZIP saves through the desktop app's download/save flow.

- [ ] ELEC-005 - Open Documentation, Changelog, or a preset live demo.
  Expected: The link opens in the operating system's default browser.

- [ ] ELEC-006 - View an export or export issues report.
  Expected: It opens in the default browser.

- [ ] ELEC-007 - Click an external link inside Site preview.
  Expected: It opens in the default browser, not inside the app preview window.

- [ ] ELEC-008 - Open Site preview from sidebar or editor.
  Expected: Preview opens in a separate native preview window.

- [ ] ELEC-009 - Navigate among pages and collection items in the preview window.
  Expected: Navigation happens inside the same preview window.

- [ ] ELEC-010 - Make unsaved editor changes, then close the app window.
  Expected: The app warns before closing.

- [ ] ELEC-011 - Run an older desktop build and wait for update check, if provided.
  Expected: An update banner appears when a newer release is available.

- [ ] ELEC-012 - Click "View changelog" in the update banner.
  Expected: Changelog opens in the default browser.

- [ ] ELEC-013 - Click "Update" in the update banner.
  Expected: Download progress appears.

- [ ] ELEC-014 - Wait for download to finish.
  Expected: Banner changes to "Update ready" with a restart action.

- [ ] ELEC-015 - Dismiss the update banner.
  Expected: Banner disappears.

- [ ] ELEC-016 - Open a preset live demo from New Project.
  Expected: The demo opens in the operating system's default browser, not inside the Electron app window.

- [ ] ELEC-017 - Open a preset live demo from Themes/Manage themes.
  Expected: The demo opens in the operating system's default browser, not inside the Electron app window.

- [ ] ELEC-018 - Open a PDF or MP3 from the Media Library.
  Expected: The file opens in the operating system's default browser/media handler, not inside the Electron app window or image lightbox.

- [ ] ELEC-019 - Open a file link from Site preview.
  Expected: PDF/MP3/file links from preview open in the operating system's default browser/media handler, not inside the Electron app preview window.

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

_All tracked items addressed._
