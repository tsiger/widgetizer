# Beta Testing Script — Widgetizer (Local / Open-Source)

> **For beta testers.** Follow every step. Mark each one PASS or FAIL. If something breaks, write down exactly what you did, what you expected, and what happened instead. Screenshot everything that looks wrong.

---

## TEST KIT

You should have received a `beta-test-kit/` folder alongside this script. Verify it contains these files before starting.

### Images (8 files)

| File                  | Size / Notes                   | Used In                               |
| --------------------- | ------------------------------ | ------------------------------------- |
| `photo-small.jpg`     | ~200 KB, any dimensions        | General testing (2.6, 5.1)            |
| `photo-medium.png`    | ~800 KB, at least 2000 px wide | Size variant testing (5.1, 5.13)      |
| `photo-large.jpg`     | ~3 MB                          | Normal large upload (5.1)             |
| `photo-oversized.jpg` | **> 5 MB**                     | Rejection at default 5 MB limit (5.3) |
| `photo-1.5mb.jpg`     | ~1.5 MB                        | Rejection at custom 1 MB limit (10.3) |
| `image.webp`          | Any size                       | Format variety (5.1, 5.2)             |
| `image.gif`           | Any size, animated preferred   | Format variety (5.1)                  |
| `logo.svg`            | Clean SVG, no scripts          | SVG upload (5.2)                      |

### Security Test Files (1 file)

| File                | Notes                            | Used In                 |
| ------------------- | -------------------------------- | ----------------------- |
| `svg-malicious.svg` | SVG with embedded `<script>` tag | SVG sanitization (5.14) |

### Video & Audio (2 files)

| File         | Size / Notes       | Used In            |
| ------------ | ------------------ | ------------------ |
| `clip.mp4`   | ~2 MB, short clip  | Video upload (5.2) |
| `sample.mp3` | ~1 MB, short audio | Audio upload (5.2) |

### Theme Files (3 files)

| File                | Notes                                                                                | Used In                          |
| ------------------- | ------------------------------------------------------------------------------------ | -------------------------------- |
| `valid-theme.zip`   | Working theme (has `theme.json`, `layout.liquid`, etc.)                              | Theme upload (7.2)               |
| `theme-update.zip`  | Same theme as `valid-theme.zip` but with a newer version in its `updates/` folder    | Theme update (7.3, 7.6–7.8)     |
| `invalid-theme.zip` | Random files, NOT a theme                                                            | Theme upload rejection (7.4, 7.5)|

### Rejected File Types (1 file)

| File               | Notes                                     | Used In                         |
| ------------------ | ----------------------------------------- | ------------------------------- |
| `random-files.zip` | ZIP of random files, NOT a project export | Project import rejection (2.14) |

> **Total: 15 files.** If anything is missing, ask the person who sent you this script. You will also create test files during testing (project exports, additional uploads) — the kit covers what you can't easily make yourself.

---

## SECTION 1: DASHBOARD

### 1.1 Dashboard — First-Time User

1. Start the app with a clean data directory (no existing projects).
2. **Expected**: The Dashboard loads showing three cards:
   - **Project Count** card: Shows `0` with a message like "Ready to create".
   - **Get Started** card: Shows a "Create your first project" heading with a pink **"Create Project"** button.
   - A third card with a teaser about AI site generation (coming soon).
3. Click the **"Create Project"** button.
4. **Expected**: Navigates to the New Project page (`/projects/add`).

### 1.2 Dashboard — With Active Project

1. Create a project (follow Section 2 steps) and ensure it's the active project.
2. Navigate to the Dashboard (click the home icon or navigate to `/`).
3. **Expected**:
   - **Project Count** card shows the correct count (e.g., `1`).
   - **Active Project** card shows the active project's name and a link (e.g., "Let's get at it").
4. Click the link.
5. **Expected**: Navigates to the Pages list.

---

## SECTION 2: PROJECTS

### 2.1 Create Your First Project

1. Click **Projects** in the sidebar.
2. Click the **"New project"** button.
3. Fill in the form:
   - **Title**: "My Test Site"
   - Leave everything else default.
4. Select the **Arch** theme from the theme dropdown.
5. You should see preset cards appear below the theme dropdown. Click "Consulting firm".
6. Click **"Create Project"**.
7. **Expected**: Success toast appears. You're redirected back to the Projects list. "My Test Site" appears with a pink **Active** badge and a filled yellow star (it's the active project since it's your first).

### 2.2 Create a Second Project

1. You should be on the Projects list. Click the **"New project"** button.
2. **Title**: "Second Site"
3. Pick the same or different theme.
4. Click **"Create Project"**.
5. **Expected**: Success toast. You're redirected back to the Projects list. "Second Site" appears in the list. It should NOT have a pink Active badge or filled yellow star (the first project is still active).

### 2.3 Switch Active Project

1. You should be on the Projects list. On the "Second Site" row, hover to reveal the action icons on the right and click the **star icon**.
2. **Expected**: Toast says it's now active. "Second Site" now shows the pink **Active** badge and filled yellow star. "My Test Site" no longer has them.

### 2.4 Edit a Project

1. You should be on the Projects list. On the "My Test Site" row, hover to reveal the action icons and click the **pencil icon** (edit).
2. You're now on the Edit Project page. Verify the **Theme** field is read-only — themes cannot be changed after creation.
3. Change the title to "My Renamed Site".
4. Click **"More settings"** to expand the additional fields.
5. Check that the **Folder name** field did NOT change — folder name only changes if you edit it manually.
6. Add `https://example.com` in the **Website Address** field.
7. Add something to the **Notes** field (e.g., "Testing project").
8. Click **"Save Changes"**.
9. **Expected**: Success toast appears. You remain on the Edit Project page — the form shows the updated values. A **"Back to Projects List"** button appears at the top.
10. Click **"Back to Projects List"** (or click **Projects** in the sidebar).
11. **Expected**: The Projects list now shows "My Renamed Site" instead of "My Test Site".
12. Click the **pencil icon** on "My Renamed Site" to re-open the edit form.
13. Click **"More settings"** to expand the additional fields.
14. **Expected**: Notes and Website Address still contain the values you entered.

### 2.5 Edit a Project's Folder Name

1. You should be on the Edit Project page for "My Renamed Site" (from step 2.4.12). If not, go to **Projects** in the sidebar and click the **pencil icon** on "My Renamed Site".
2. Click **"More settings"** if the additional fields are not already visible.
3. Manually change the **Folder name** field to a new value (e.g., "renamed-site").
4. Click **"Save Changes"**.
5. **Expected**: Success toast mentions the folder was renamed. You remain on the Edit Project page.
6. The **Folder name** field should still show "renamed-site".
7. Click **"Back to Projects List"** or **Projects** in the sidebar. Then click the **pencil icon** on "My Renamed Site" again and expand **"More settings"**.
8. **Expected**: Folder name still shows "renamed-site".

### 2.6 Upload Media to a Project

1. Click **Projects** in the sidebar to go to the Projects list.
2. "Second Site" is currently the active project (from step 2.3). Click the **star icon** on "My Renamed Site" to make it active instead.
3. **Expected**: Toast confirms. "My Renamed Site" now shows the pink **Active** badge.
4. Click **Media** in the sidebar.
5. Upload 2–3 test images — drag-and-drop onto the upload area or click to browse.
6. **Expected**: Images appear in the media library with thumbnails. File names, sizes, and types are shown.
7. Click **Pages** in the sidebar. Open any page in the editor (click the **"Design"** button on a page row) and add or edit a widget that uses one of the uploaded images. Save the page.
8. **Expected**: The image displays correctly in the widget preview.

> This step ensures media exists for the duplicate, export, and import tests that follow.

### 2.7 Duplicate a Project

1. Click **Projects** in the sidebar to go to the Projects list.
2. On the "My Renamed Site" row, hover to reveal the action icons and click the **copy icon** (duplicate).
3. **Expected**: Toast says project duplicated. A new project appears in the list with the title "Copy of My Renamed Site".
4. Click the **pencil icon** on the duplicate to open the edit form. Click **"More settings"**. Verify the folder name has a "copy-of-" prefix (e.g., "copy-of-renamed-site"). Verify it has the same theme, notes, and website address as the original.
5. Click **"Cancel"** or **Projects** in the sidebar to return to the Projects list.
6. Click the **star icon** on "Copy of My Renamed Site" to mark it as active.
7. **Expected**: Toast confirms. "Copy of My Renamed Site" now shows the pink **Active** badge.
8. Click **Media** in the sidebar.
9. **Expected**: Same media files as the original — all images you uploaded in step 2.6 should appear in the media library, not be missing.

### 2.8 Try to Deactivate the Active Project

1. Click **Projects** in the sidebar to go to the Projects list.
2. The active project ("Copy of My Renamed Site") should show a pink **Active** badge and filled yellow star.
3. Try to click the **star icon** on the active project.
4. **Expected**: Nothing happens — the star stays yellow but clicking it has no effect. You can only switch active to a different project, not deactivate the current one.

### 2.9 Try to Delete the Active Project

1. You should be on the Projects list (from step 2.8).
2. Try to click the **trash icon** on the active project ("Copy of My Renamed Site").
3. **Expected**: Clicking the trash icon does nothing. Hovering over it shows a tooltip saying you cannot delete the active project. Deletion is blocked.

### 2.10 Delete a Non-Active Project

1. You should be on the Projects list. Identify a non-active project (e.g., "Second Site" — it should NOT have a pink Active badge).
2. Click the **trash icon** on that non-active project.
3. **Expected**: Confirmation dialog appears explaining what will be permanently deleted.
4. Click the **"Delete Project"** button in the dialog.
5. **Expected**: Toast confirms deletion. The project disappears from the list.

### 2.11 Export a Project

1. You should be on the Projects list. On the "My Renamed Site" row (which already has media from step 2.6), hover to reveal the action icons and click the **export icon** (upward arrow icon — tooltip says "Export project").
2. **Expected**: Toast says "Exporting project…" then a ZIP file downloads to your computer.
3. Open the ZIP. It should contain:
   - `project-export.json` manifest file
   - `pages/` folder with page JSON files
   - `menus/` folder (if menus exist)
   - `uploads/media.json` with media metadata (compatibility artifact in export ZIP; runtime source of truth is SQLite)
   - `uploads/images/` (or videos/audios) with the actual media files
   - Theme files (`theme.json`, `layout.liquid`, etc.)

### 2.12 Import a Project

1. You should be on the Projects list. Click the **"Import Project"** button (in the page header area, next to the "New project" button).
2. An import modal should open.
3. Drag the ZIP you just exported into the drop zone (or click to browse and select it).
4. Click the **"Import Project"** button inside the modal to start the import.
5. **Expected**: Project imports successfully. Toast confirms. New project appears in the list with the original name.
6. To inspect the imported project, click the **star icon** on it to make it active. Then verify:
   - [ ] Click **Pages** in the sidebar — page list matches the original
   - [ ] Click **Media** in the sidebar — **media library shows all uploaded images** (not empty!)
   - [ ] Go back to **Pages**, open a page in the editor — images used in widgets should display correctly
   - [ ] Click **Menus** in the sidebar — menus match the original structure

### 2.13 Navigation Guard on Edit

1. Click **Projects** in the sidebar to go to the Projects list.
2. Click the **pencil icon** on any project.
3. Change the title but do **NOT** save.
4. Try to navigate away (click **Pages** or **Projects** in the sidebar).
5. **Expected**: Warning dialog about unsaved changes.
6. Click Cancel/Stay. You should remain on the edit form.
7. Click **"Save Changes"**, then navigate away. **Expected**: No warning.

### 2.14 Edge Cases to Try

For all items below, start from the **Projects** list (click **Projects** in the sidebar).

- [ ] Create a project with a very long name (100+ characters). **Expected**: It should handle it without errors.
- [ ] Create a project with special characters in the name (`Test & Site #1 — "Quotes"`). **Expected**: It works and the name is stored exactly as you typed it — no weird characters like `&amp;` appearing instead.
- [ ] **Code safety** — Create a project with code in the name: type `My Site <script>alert(1)</script>`. **Expected**: Name saved as just "My Site" — the code part is removed.
- [ ] **Code safety** — Create a project with ONLY `<script>alert(1)</script>` as the name. **Expected**: Rejected — name is required (the code gets removed, so nothing is left).
- [ ] **Code safety** — Type `<script>alert(1)</script>` in the **Notes** field. Save. Navigate away, then re-open the edit form and expand **"More settings"**. **Expected**: The code is gone — field is empty or plain text only.
- [ ] **Code safety** — Type `<script>alert(1)</script>` in the **Website Address** field. **Expected**: Rejected — not a valid URL.
- [ ] **Code safety** — Type `<script>alert(1)</script>` in the **Folder name** field. **Expected**: Rejected — not a valid folder name.
- [ ] Create two projects with the same name. **Expected**: Rejected — an error message says a project with that name already exists.
- [ ] Edit a project's folder name to match an existing project's folder. **Expected**: It should prevent the conflict.
- [ ] Enter an invalid website address (e.g., "not a url") in the **Website Address** field. **Expected**: Validation catches it and shows an error.
- [ ] Try importing a random ZIP file that isn't a Widgetizer export. **Expected**: A clear error message appears.
- [ ] Try importing a ZIP that's too large. To test this: go to **App Settings** in the sidebar, find the **Max Import Size** setting, lower it to **1 MB**, and save. Then go back to **Projects** and try importing a valid project ZIP that exceeds 1 MB. **Expected**: Rejected with a clear error about file size. After testing, go back to **App Settings** and restore the original import size limit.
- [ ] Import a project whose theme doesn't exist in this installation. **Expected**: A clear error message appears.
- [ ] Export a project with media, then import it twice (while the original still exists). **Expected**: Both imports should succeed — no file conflicts.
- [ ] Duplicate a project with media. **Expected**: The duplicate's media library shows all files and images in widgets still display correctly.
- [ ] Delete a project that has media. **Expected**: Everything is cleaned up properly — no leftover files or data.

---

## SECTION 3: PAGES

### 3.1 Verify Theme Pages Loaded

1. You should have an active project from Section 2. Click **Pages** in the sidebar.
2. **Expected**: The theme's pre-made pages are listed. The number and names depend on the theme and preset you chose when creating the project. Each page row shows a title and a filename.
3. Verify each page has a reasonable filename (lowercase, hyphenated, ending in `.html`).

### 3.2 Create a New Page with Full SEO

1. You should be on the Pages list. Click the **"New page"** button.
2. Fill in:
   - **Title**: "Testimonials"
   - The **Filename** field should auto-generate as "testimonials" (displayed as `/testimonials.html`).
3. Click **"More settings"** to expand the SEO section.
4. Fill in **every** SEO field:
   - **Meta Description**: "See what our clients have to say about working with us"
   - **Social Media Title**: "Testimonials — My Renamed Site"
   - **Social Media Image**: Click **Browse**, pick one of the images you uploaded in step 2.6
   - **Canonical URL**: `https://example.com/testimonials`
   - **Search Engine Indexing**: Change the dropdown to **"Don't Index, but Follow Links"**
5. Click **"Create Page"**.
6. **Expected**: Success toast. You're redirected to the Pages list. "Testimonials" appears alongside the theme pages.
7. Click the **pencil icon** on "Testimonials" to open the edit form.
8. Click **"More settings"** to expand the SEO section.
9. **Expected**: All SEO fields you just set are still there — Meta Description, Social Media Title, Social Media Image, Canonical URL, and Search Engine Indexing set to "Don't Index, but Follow Links".
10. Click **Media** in the sidebar. Find the image you selected as the social media image.
11. **Expected**: That image shows as **"in use"** by the Testimonials page.

### 3.3 Edit an Existing Page

1. Click **Pages** in the sidebar to go to the Pages list.
2. Click the **pencil icon** on any page (e.g., the first theme page).
3. Change the title to something different.
4. Change the filename.
5. Click **"More settings"** and update SEO fields:
   - **Meta Description**: "Learn about our team and mission"
   - **Social Media Title**: "About Us — My Renamed Site"
   - **Social Media Image**: Click Browse and pick a **different** image than the one you used for Testimonials
   - **Search Engine Indexing**: Set to **"Index and Follow (Default)"**
6. Click **"Save Changes"**.
7. **Expected**: Success toast appears. You remain on the Edit Page form. A **"Back to pages list"** button appears at the top.
8. Click **"Back to pages list"** or **Pages** in the sidebar.
9. **Expected**: The Pages list shows the updated name and filename.
10. Click **Media** in the sidebar. Check the image you just set as the social media image.
11. **Expected**: It shows as "in use" by the page you edited.

### 3.4 Duplicate a Page

1. Click **Pages** in the sidebar to go to the Pages list.
2. Click the **copy icon** on any page (e.g., a Contact page).
3. **Expected**: Toast confirms. New page appears with "Copy of [Page Name]" as the name and a "-copy" suffix in the filename.
4. Click the **pencil icon** on the duplicate. Click **"More settings"** to expand the SEO section.
5. **Expected**: SEO fields are copied from the original page (if it had any set).
6. If the original page had a **Social Media Image** set, click **Media** in the sidebar.
7. **Expected**: The image should show as "in use" by **both** the original page and the duplicate — without needing to click "Refresh usage".

### 3.5 Delete a Single Page

1. Click **Pages** in the sidebar to go to the Pages list (or click **"Back to pages list"** if you're on the edit form from 3.4).
2. Click the **trash icon** on the duplicate you just made.
3. **Expected**: Confirmation modal appears. Click **"Delete"** to confirm. Page disappears from the list. Toast confirms.

### 3.6 Bulk Delete Pages

1. You should be on the Pages list. Create 3 throwaway pages: click **"New page"**, set the title to "Delete Me 1", click **"Create Page"**. Repeat for "Delete Me 2" and "Delete Me 3".
2. Back on the Pages list, click the **checkboxes** on all three "Delete Me" rows.
3. A **"Delete"** button should appear in the toolbar, along with a count (e.g., "3 selected").
4. Click the **"Delete"** button.
5. **Expected**: Confirmation modal showing the count (e.g., "Delete 3 Pages"). Confirm. All three gone. The theme pages and Testimonials page should still be there.

### 3.7 Edge Cases to Try

For all items below, start from the **Pages** list (click **Pages** in the sidebar).

- [ ] Create a page with the same filename as an existing theme page. **Expected**: It auto-adds a number to the filename (e.g., `about-1`) to avoid a conflict.
- [ ] Create a page with special characters in the name (e.g., `About & "FAQ" — Info`). **Expected**: The filename is cleaned up to only use simple characters. The name is stored exactly as typed — no weird characters like `&amp;` appearing instead.
- [ ] **Code safety** — Create a page named `My Page <img src=x onerror=alert(1)>`. **Expected**: Name saved as just "My Page" — code removed.
- [ ] **Code safety** — Create a page with ONLY `<script>alert(1)</script>` as the name. **Expected**: Rejected — name is required.
- [ ] **Code safety** — Type `<script>alert(1)</script>` in the **Filename** field. **Expected**: The code is stripped and the filename is cleaned up (e.g., "alert1"). The page is created with the sanitized filename.
- [ ] Edit a page's filename to match another existing page's filename. **Expected**: It prevents the conflict.
- [ ] Try to navigate away from the page form with unsaved changes. **Expected**: A warning dialog appears.
- [ ] **Code safety** — Type `<script>alert(1)</script>` in the **Meta Description** field. Click **"Save Changes"**. **Expected**: The code is stripped immediately on save — the field shows plain text or is empty.
- [ ] **Code safety** — Type `<script>alert(1)</script>` in the **Social Media Title** field. Click **"Save Changes"**. **Expected**: The code is stripped immediately on save — the field shows plain text or is empty.
- [ ] **Code safety** — Type `<script>alert(1)</script>` in the **Canonical URL** field. **Expected**: Rejected — not a valid URL.
- [ ] Set a social media image on a page, then go to **Media** in the sidebar and try to delete that image. **Expected**: Deletion is blocked — you should see an error saying the image is in use by that page.
- [ ] Enter an invalid **Canonical URL** (e.g., "not a url"). **Expected**: Validation catches it and shows an error.

---

## SECTION 4: PAGE EDITOR (This is the big one)

### 4.1 Open the Editor

1. Click **Pages** in the sidebar.
2. On any page row, hover to reveal the action icons and click the **palette icon** (tooltip: "Design page") — it's separated from the other icons by a divider.
3. **Expected**: Page editor loads with three panels:
   - **Left**: Widget list (showing the page's widgets and the global header/footer)
   - **Center**: Live preview (iframe)
   - **Right**: Settings panel (shows "Select a widget to edit its settings" until you select one)

### 4.2 Add a Widget

1. Click the **"Add widget"** button at the bottom of the left panel (or in the center if no widgets exist yet).
2. A widget selector popup appears with a search field and a list of available widgets sorted alphabetically.
3. Click any widget (e.g., **Banner**, **Rich Text**, or whatever you like).
4. **Expected**: Widget appears in the left panel list AND in the center preview.

### 4.3 Add Multiple Widgets

1. Add these specific widgets to stress-test the editor:
   - [ ] Add a **Slideshow** widget (tests block limits)
   - [ ] Add a **Pricing** widget (tests complex nested blocks & layout)
   - [ ] Add a **Video** widget (tests media playback)
   - [ ] Add a **Card Grid** widget (tests image and text combinations)
2. **Expected**: Each appears in the left list in order and renders in the preview.

### 4.4 Select a Widget

1. Click a widget in the **left panel list**.
2. **Expected**: Widget gets a pink border in the list. Right panel shows its settings. Preview may scroll to show it.
3. Click a widget directly in the **center preview**.
4. **Expected**: Same behavior — selected in left list (pink border), settings appear on right.

### 4.5 Edit Widget Settings

1. Select a widget that has text settings (e.g., the **Banner** — it has title, eyebrow, description fields).
2. Change the title text in the right panel.
3. **Expected**: Preview updates in REAL TIME as you type. No need to save.
4. Try changing other settings: alignment dropdowns, checkboxes, etc.
5. **Expected**: Each change reflects immediately in the preview.

### 4.6 Reorder Widgets

1. In the left panel, grab the **grip handle** (dotted icon on the left of a widget) and **drag** it to a different position.
2. **Expected**: Widget moves in both the list AND the preview. The page layout changes accordingly.

### 4.7 Duplicate a Widget

1. Hover over a widget in the left panel — action icons appear on the right.
2. Click the **copy icon** (turns blue on hover).
3. **Expected**: A copy of the widget appears below it with identical settings.

### 4.8 Delete a Widget

1. Hover over a widget in the left panel — action icons appear on the right.
2. Click the **trash icon** (turns red on hover).
3. **Expected**: Widget is immediately removed from the list and preview — there is no confirmation dialog.

### 4.9 Work with Blocks

1. Find a widget that supports blocks (e.g., **Card Grid**, **Pricing**, or **Slideshow**). These widgets show nested items (blocks) indented under the parent widget in the left panel.
2. **Select a block** by clicking it in the left list.
3. **Expected**: Block gets a blue border. Right panel shows the block's settings (not the parent widget's).
4. **Edit block settings** — change text, images, etc.
5. **Expected**: Preview updates in real time.
6. **Add a new block**: Click the **"Add block"** button below the existing blocks.
7. **Expected**: New block appears. If the widget supports multiple block types, a type selector may appear.
8. **Reorder blocks** by dragging their grip handles within the widget.
9. **Duplicate a block**: Hover over a block, click the **copy icon** (turns blue on hover).
10. **Delete a block**: Hover over a block, click the **trash icon** (turns red on hover). **Expected**: Block is immediately removed — there is no confirmation dialog.

### 4.10 Block Limits

1. Select the **Slideshow** widget (or another widget with a block limit). Look for a counter below the block list (e.g., "3/5"):
   - Add blocks until you hit the limit.
   - **Expected**: The counter text turns amber. The **"Add block"** button disappears. The copy icon on blocks is disabled.
   - You should not be able to add any more blocks.

### 4.11 Image Settings

1. Find a widget with an image setting (e.g., the **Banner** or **Card Grid** blocks).
2. Click **"Browse"** next to the image field.
3. **Expected**: Media selector drawer opens showing your media library.
4. If empty, click **"Upload"** in the drawer and upload an image.
5. Select an image.
6. **Expected**: Drawer closes. Image appears in settings. Preview shows the image.
7. Click the **remove/clear button** on the image.
8. **Expected**: Image removed from settings and preview.

### 4.12 Link Settings

1. Find a widget with a link/button setting (e.g., the **Banner** widget has a "Button Link" field).
2. Click the link field.
3. **Expected**: You should see options for:
   - Selecting an internal page (dropdown of your pages)
   - Entering an external URL
   - Setting link text
   - Setting target (same tab / new tab)
4. Select an internal page.
5. **Expected**: Link is filled in with the page you selected.
6. Switch to an external URL. Type `https://google.com`.
7. **Expected**: Link updates to the external URL.

### 4.13 Menu Settings

1. Click on the **Global Header** widget in the left panel (at the top, with grey background).
2. In the right settings panel, find the menu selector dropdown.
3. **Expected**: Shows all menus you've created for this project.
4. Select a menu.
5. **Expected**: Preview updates to show the menu's items in the header navigation.

### 4.14 Rich Text Settings

1. Add a **Rich Text** widget (or find one already on the page).
2. Select it and find the rich text editor in the right settings panel.
3. Type formatted text. Try bold, italic, links, bullet lists, numbered lists.
4. **Expected**: Formatting toolbar works. Preview shows formatted text.

### 4.15 Global Header & Footer

1. In the left panel, look at the top and bottom — the **Global Header** and **Global Footer** widgets are visually separated from the page widgets by divider lines.
2. They have a grey background and **cannot be dragged** (no grip handle). They also have **no copy or delete icons** — they're fixed to every page.
3. Click on the **Global Header**.
4. **Expected**: Settings panel shows header widget settings (navigation menu, logo, etc.).
5. Make a change (e.g., change the navigation menu or site title).
6. **Expected**: Preview updates. This change affects ALL pages.
7. Use the **page name dropdown** in the top bar to navigate to a different page.
8. **Expected**: The header change persists across pages.

### 4.16 Save and Auto-Save

1. Make some changes to widgets.
2. Look at the top bar — a **pink dot** should appear next to the page name, indicating unsaved changes. The **"Save"** button should turn pink.
3. Wait 60 seconds without making any changes.
4. **Expected**: Auto-save triggers. The pink dot disappears. The **"Save"** button turns grey (disabled).
5. Make another change.
6. Click the **"Save"** button (or press **Ctrl+S** / **Cmd+S**).
7. **Expected**: Saves immediately. Button text briefly shows "Saving..." then returns to "Save" (grey/disabled).

### 4.17 Undo / Redo

1. Make a change (e.g., edit a title).
2. Press **Ctrl+Z** (or **Cmd+Z** on Mac).
3. **Expected**: Change reverts. Preview updates.
4. Press **Ctrl+Shift+Z** (or **Cmd+Shift+Z** on Mac).
5. **Expected**: Change reapplied.
6. Try undo/redo with the **toolbar buttons** too (the Undo and Redo arrow icons in the top bar, next to the Save button).
7. Try undoing multiple steps in a row.

### 4.18 Preview Modes

1. In the top bar, find the **preview mode toggle** — two icons: a **monitor** (Desktop) and a **smartphone** (Mobile). The active one has a white background with pink icon.
2. Click the **smartphone icon** to switch to Mobile.
3. **Expected**: Preview area narrows to mobile width. Content reflows.
4. Click the **monitor icon** to switch back to Desktop.
5. **Expected**: Full width restored.

### 4.19 Standalone Preview

1. Click the **"Preview"** button (with an eye icon) in the top bar.
2. **Expected**: A new browser tab opens with the full page preview — no editor UI.
3. Click internal links in the preview.
4. **Expected**: They navigate to other preview pages correctly.
5. External links should be disabled or handled safely.

### 4.20 Navigation Protection

1. Make a change in the editor (don't save).
2. Click the **"Back"** button (arrow icon, top-left of the editor) or try to click a sidebar link.
3. **Expected**: Browser confirm dialog appears asking if you want to leave with unsaved changes.
4. Click **Cancel**. You should stay in the editor.
5. Click the browser **back button**.
6. **Expected**: Same warning.
7. Try to **close the browser tab**.
8. **Expected**: Browser's built-in "Leave site?" warning appears.
9. Now click **"Save"**, then navigate away.
10. **Expected**: No warning. Clean navigation.

### 4.21 Image Upload & Media Tracking in the Editor

These tests verify that images uploaded and used through the editor are properly tracked in the Media library.

1. Open a page in the editor. Find a widget with an image setting.
2. Click **"Browse"**, then click **"Upload"** in the media drawer. Upload a new image.
3. Select the image you just uploaded for the widget. Save the page.
4. Click **Media** in the sidebar. Find the image you just uploaded.
5. **Expected**: The image shows as **"in use"** by the page you edited.
6. Go back to the editor (click **Pages** in the sidebar, then click the **palette icon** on the same page). Change the widget's image to a **different** image (or remove it). Save the page.
7. Click **Media** in the sidebar again. Check the first image.
8. **Expected**: The first image should NO LONGER show as "in use" by that page (unless another widget on the same page still uses it).
9. Go back to the editor. Set images on **two different widgets** on the same page — use the same image for both. Save.
10. Click **Media** in the sidebar. **Expected**: The image shows as "in use" by that page.
11. Go back to the editor. Remove the image from one of the two widgets. Save.
12. Click **Media** in the sidebar. **Expected**: The image STILL shows as "in use" (because the other widget still uses it).
13. Go back to the editor. Remove the image from the second widget too. Save.
14. Click **Media** in the sidebar. **Expected**: The image now shows as NOT in use.

### 4.22 Edge Cases to Try

- [ ] Add 20+ widgets to a single page. **Expected**: The editor should still feel fast and responsive.
- [ ] Paste very long text (5000+ characters) into a text field. **Expected**: It handles it without crashing or freezing.
- [ ] Paste this code into a plain **text** field (e.g., a Heading block's **Text** field): `<div onmouseover="alert('XSS')"><h1>Hello</h1><script>document.title='hacked'</script></div>`. **Expected**: The preview shows the raw code as plain text — it does not render as HTML or run any scripts. Hover over the text in the preview — no popup box.
- [ ] **Code safety** — In the **Banner** widget, click the **Heading** block. Type `<script>alert(1)</script>` in the **Text** field (plain text input). **Expected**: Preview shows it as plain text — no popup box.
- [ ] **Code safety** — In the **Banner** widget, click the **Button Group** block. Type `<script>alert(1)</script>` as the **Button 1** link text. **Expected**: Preview shows it as plain button text — no popup box.
- [ ] **Code safety** — In the **Banner** widget, click the **Button Group** block. Type `<script>alert(1)</script>` as the **Button 1** URL. **Expected**: Rejected — not a valid URL.
- [ ] **Code safety** — In the **Banner** widget, click the **Text** block. Paste `<script>alert(1)</script>` into the **Text** rich text editor. **Expected**: The text is shown as-is — the angle brackets are visible as plain characters, not interpreted as HTML. No popup box. The preview displays `<script>alert(1)</script>` as literal text.
- [ ] **Code safety** — Add an **Embed** widget. Paste `<script>alert(1)</script>` into the **Code** field. **Expected**: The code executes in both the editor and the preview (a popup box appears). This is expected — the Embed widget is designed to run arbitrary embed code (YouTube iframes, forms, third-party widgets). This is not a security concern because the app runs locally and the user is entering their own code.
- [ ] Upload a very large image through the widget image browser. **Expected**: It either uploads successfully or shows a clear error about file size.
- [ ] Rapidly click undo 50 times. **Expected**: It handles it without crashing.
- [ ] Open the same page in two browser tabs. Edit in both. Save both. **Expected**: The last save wins. No crashes or corrupted data.
- [ ] Upload an image through the widget browser, use it in a widget, save the page, then click **Media** in the sidebar and try to delete that image. **Expected**: Deletion is blocked — error says the image is in use.
- [ ] Use the same image in widgets on **two different pages**. Click **Media** in the sidebar. **Expected**: The image shows as "in use" by both pages. Deleting it should be blocked.

---

## SECTION 5: MEDIA LIBRARY

### 5.1 Upload Images

1. Click **Media** in the sidebar.
2. Click **"Upload"** or drag files into the upload area.
3. Upload 3-4 images (JPG, PNG, WebP).
4. **Expected**: Progress bars shown. Files appear in the grid. Success toast with count.

### 5.2 Upload Different File Types

1. Upload an **SVG** file.
2. Upload an **MP4 video**.
3. Upload an **MP3 audio** file.
4. **Expected**: All accepted. Each shows with appropriate icon/thumbnail.
5. Go to the Page Editor. Add a **Logo Cloud** widget and select your SVG file. **Expected**: It displays properly.
6. Add a **Video** widget (not Video Embed) and select your MP4 file. **Expected**: The video plays.

### 5.3 Upload Validation

1. Try uploading a **.txt** file.
2. **Expected**: The file dialog doesn't even show `.txt` files — the browser filters to only images, videos, and audio. You can't select it.
3. Try uploading an image larger than the max file size (check App Settings for the limit — default 5 MB).
4. **Expected**: Rejected with clear error message about file size.

### 5.4 Batch Upload

1. Select 10+ files at once and upload.
2. **Expected**: Files upload in batches (should see progress). Success/warning toast shows count of uploaded and rejected files.

### 5.5 View Modes

1. Toggle between **Grid view** and **List view** (icons in the toolbar).
2. **Expected**: Same files, different layout. Grid shows thumbnails. List shows details (file name, dimensions, size, type, usage).

### 5.6 Search Media

1. Type a filename in the **search bar**.
2. **Expected**: List filters in real time to show matching files.
3. Clear the search.
4. **Expected**: All files shown again.

### 5.7 Filter by Type

1. Use the **type filter** dropdown.
2. Select **Images**.
3. **Expected**: Only images shown.
4. Select **Videos**.
5. **Expected**: Only videos shown.
6. Select **All**.
7. **Expected**: Everything shown.

### 5.8 Edit Media Metadata

1. Click on an image (or hover and click the edit icon).
2. **Expected**: A drawer opens on the right showing:
   - A preview of the image
   - **Alt text** field (required)
   - **Title** field (optional)
3. Edit the **alt text** and **title**. Save.
4. **Expected**: Metadata saved. Toast confirms.
5. Now open a video or audio file.
6. **Expected**: The drawer shows:
   - A preview (video player or audio player with music icon)
   - **Title** field (optional)
   - **Description** field (optional)

### 5.9 Delete Unused Media

1. Find a file that is NOT used in any page.
2. Click the **delete/trash icon**.
3. **Expected**: Confirmation dialog. Confirm. File deleted. Toast confirms.

### 5.10 Try Deleting Media That's In Use

1. Go to the page editor. Add a widget with an image. Set it to one of your uploaded images. Save.
2. Go back to Media.
3. Try to delete that image.
4. **Expected**: Error! The file is in use. You should see a message telling you which pages use it. Deletion should be blocked.

### 5.11 Bulk Delete

1. Select multiple files using checkboxes.
2. Click **"Delete Selected"**.
3. **Expected**: Confirmation with count. Files in use should be skipped. Others deleted.

### 5.12 Refresh Usage

1. Click **"Refresh Usage"** button in the toolbar.
2. **Expected**: Toast confirms. Usage badges update on files.

### 5.13 Image Size Variants

1. Upload a large image (at least 2000px wide).
2. Switch to **list view** (the list icon in the toolbar).
3. **Expected**: The image's original dimensions are shown in the list (e.g., `4000×2667`).
4. **Expected**: The thumbnail loads correctly in both grid and list views — this confirms the backend generated size variants (thumb, small, medium, large depending on App Settings).

### 5.14 Edge Cases to Try

- [ ] Upload a file with a very long filename (100+ characters). **Expected**: The filename is truncated to a reasonable length. The upload succeeds without errors.
- [ ] Upload a file with spaces and special characters in the name (e.g., `My Photo (2024) #1.jpg`). **Expected**: The filename is sanitized — spaces become dashes, special characters are removed, letters are lowercased (e.g., `my-photo-2024-1.jpg`).
- [ ] Upload the same filename twice. Does it handle the conflict (e.g., append `-1`)?
- [ ] **Code safety** — Upload `svg-malicious.svg` from the test kit (SVG with code inside). **Expected**: The code is removed from the SVG — it should display as a normal image.
- [ ] **Code safety** — Type `<script>alert(1)</script>` in the **alt text** field of a media file. Save, edit again. **Expected**: The code is gone — field shows plain text or is empty. Also export the site and check the HTML source — no code in the alt attribute.
- [ ] **Code safety** — Type `<script>alert(1)</script>` in the **title** field of a media file. Save, edit again. **Expected**: The code is gone.

---

## SECTION 6: MENUS

### 6.1 Create a Menu

1. Click **Menus** in the sidebar.
2. Click **"New menu"**.
3. Fill in:
   - **Title**: "Main Navigation"
   - **Description** (optional): "Primary site navigation"
4. Click **"Create Menu"**.
5. **Expected**: Success toast. You are redirected to the **structure editor** for this menu.

### 6.2 Add Menu Items

You should be on the structure editor after creating the menu. If not, click **Menus** in the sidebar and click the **menu icon** (tooltip: "Edit menu structure") on your menu.

1. Click **"Add Item"**.
2. Set:
   - **Label**: "Home"
   - **Link**: Click the link dropdown and select your homepage from the page list (internal link)
3. Click **"Add Item"** again. Add more items the same way:
   - "About" → linked to your about page
   - "Testimonials" → linked to your testimonials page
   - "Contact" → linked to your contact page
4. **Expected**: Items appear in a draggable list.

### 6.3 Add External Links

You should still be on the structure editor.

1. Click **"Add Item"**.
2. Set:
   - **Label**: "Twitter"
   - **Link**: Instead of selecting a page from the dropdown, type `https://twitter.com` directly into the link field
3. **Expected**: Item added with the external URL.

### 6.4 Nest Menu Items (Submenus)

1. Add three more items: "Service A", "Service B", "Service C" (no links needed for now).
2. **Drag** "Service A" to become a child of "Testimonials" — drag it slightly to the right under Testimonials to indent it.
3. Do the same for "Service B" and "Service C".
4. **Expected**: Two-level hierarchy. Testimonials has an expand/collapse arrow, and the three services are indented beneath it.
5. Try nesting a third level (e.g., add "Sub-item" and drag it under "Service A").
6. **Expected**: Three levels work. The editor says "You can add up to 3 levels of menu items." — you should not be able to nest a fourth level.

### 6.5 Reorder Menu Items

1. Drag "Contact" above "About".
2. **Expected**: Order changes immediately.

> **Known limitation**: Drag-and-drop currently only reorders items within the same level. Dragging items between levels (e.g., un-nesting a sub-item to the top level, or nesting a top-level item under another) is not yet supported.

### 6.6 Save Menu Structure

1. Click **"Save Menu"**.
2. **Expected**: Toast says "Menu saved successfully".
3. Refresh the page (F5).
4. **Expected**: Structure preserved exactly as you left it — same order, same nesting.

### 6.7 Edit Menu Settings

1. Click **Menus** in the sidebar to go back to the menu list.
2. Click the **pencil icon** (tooltip: "Edit menu settings") on "Main Navigation".
3. Change the **Title** to "Primary Navigation".
4. Click **"Save Changes"**.
5. **Expected**: Toast confirms. You stay on the edit page. Click **"Back to menus list"** — the updated name shows in the list.

### 6.8 Duplicate a Menu

1. On the menu list, click the **copy icon** (tooltip: "Duplicate menu") on "Primary Navigation".
2. **Expected**: A new menu appears in the list. Toast says "Menu duplicated successfully".
3. Click the **menu icon** on the duplicate to open its structure. Verify all items and nesting are preserved.

### 6.9 Delete a Menu

1. On the menu list, click the **trash icon** (tooltip: "Delete menu") on the duplicate.
2. **Expected**: A confirmation dialog appears: "Are you sure you want to delete ...? This action cannot be undone."
3. Click **"Delete"**.
4. **Expected**: Menu removed from the list. Toast confirms.

### 6.10 Menu + Page Rename Integration

1. Click the **menu icon** on "Main menu" to open the structure editor. Note which items link to pages.
2. Click **Pages** in the sidebar. Rename a linked page's **Filename** (e.g., change "about" to "about-us"). Click **"Save Changes"**.
3. Click **Menus** in the sidebar. Open the structure editor for "Main menu".
4. **Expected**: The menu item still shows the correct link — it uses the page's internal ID, not the filename. The link dropdown should show the page by its current name.

### 6.11 Menu + Page Deletion

1. Click **Pages** in the sidebar. Create a throwaway page: **Title** "Temp Page". Click **"Create page"**.
2. Click **Menus** in the sidebar. Open the structure editor for "Primary Navigation".
3. Click **"Add Item"**. Set **Label**: "Temp" and **Link**: select "Temp Page" from the dropdown. Click **"Save Menu"**.
4. Click **Pages** in the sidebar. Delete "Temp Page".
5. Click **Menus** in the sidebar. Open the structure editor for "Primary Navigation".
6. **Expected**: The "Temp" menu item should show an empty or broken link. The editor should not crash.

### 6.12 Edge Cases to Try

- [ ] Create a menu with 50+ items. Performance?
- [ ] Create deeply nested items (3 levels). **Expected**: Works. A fourth level should not be possible.
- [ ] Create a menu with special characters in the title (e.g., `Nav & "Links"`). **Expected**: The title is stored exactly as typed — no weird characters like `&amp;` appearing instead.
- [ ] **Code safety** — Create a menu with the title `Menu <script>alert(1)</script>`. **Expected**: Title saved as just "Menu" — code removed.
- [ ] **Code safety** — Create a menu with ONLY `<script>alert(1)</script>` as the title. **Expected**: Rejected — error says "Menu title is required. HTML tags are not allowed."
- [ ] **Code safety** — Type `<script>alert(1)</script>` as a **menu item label**. Click **"Save Menu"**. Re-open the structure editor. **Expected**: The code is gone. Check the preview and export — no popup box.
- [ ] **Code safety** — Type `<script>alert(1)</script>` as a **menu item external URL**. Click **"Save Menu"**. **Expected**: Preview link does nothing dangerous. Export the site and check the HTML — no code in the link.
- [ ] Add a menu item, clear its label, and click **"Save Menu"**. **Expected**: Rejected — error says "Every menu item must have a label."
- [ ] Add a menu item with no link. Click **"Save Menu"**. **Expected**: It saves successfully — links are optional (items can be placeholders or parent-only dropdowns).
- [ ] Save a menu, delete it, then try to use it in a header widget. What shows?

---

## SECTION 7: THEMES

### 7.1 View Installed Themes

1. Click **Themes** in the sidebar.
2. **Expected**: Grid of theme cards. Each card shows:
   - Theme screenshot
   - Theme name and current version number
   - Author name
   - Brief description
   - Widget count
   - A pink **"Active"** badge on the theme used by the current active project
3. Verify the version number matches what you expect (e.g., `v1.0.0` for a freshly installed theme).

### 7.2 Upload a New Theme

1. Click **"Upload Theme"** (or drag a valid theme ZIP onto the upload area).
2. **Expected**: Upload progress indicator appears. On success: toast confirms, new theme card appears in the grid.
3. Verify the new theme's card shows the correct name, version, author, and screenshot from the ZIP.

### 7.3 Upload a Theme Update (New Version)

1. Upload `theme-update.zip` from the test kit. Its base version matches `valid-theme.zip` (installed in 7.2), but it includes a newer version in its `updates/` folder.
2. **Expected**: Toast confirms the update was imported. The toast or response should mention which version(s) were added.
3. Go to the Themes list. The theme card should now show an **"Update available: vX.Y.Z"** label.
4. The sidebar **Themes** link should show a **pink badge** with a count of `1` (or incremented if other themes also have pending updates).

### 7.4 Upload Validation — Invalid ZIP

1. Try uploading `invalid-theme.zip` from the test kit (random files, not a theme).
2. **Expected**: Rejected with a clear error explaining what's wrong (e.g., missing required files).

### 7.5 Upload Validation — Missing Required Files

If you can create test ZIPs, try each of these. Otherwise, verify the error messages make sense when uploading `invalid-theme.zip`.

- [ ] ZIP missing `theme.json`. **Expected**: Error says `theme.json` is required.
- [ ] ZIP missing `screenshot.png`. **Expected**: Error says screenshot is required.
- [ ] ZIP missing `layout.liquid`. **Expected**: Error says layout template is required.
- [ ] ZIP with empty `assets/` folder (no files inside). **Expected**: Error says assets directory must contain files.
- [ ] ZIP with empty `templates/` folder. **Expected**: Error says templates directory must contain files.
- [ ] ZIP with empty `widgets/` folder. **Expected**: Error says widgets directory must contain widget folders.

### 7.6 Apply Theme Update (Build Snapshot)

> Requires a theme with a pending update from step 7.3.

1. On the Themes list, find the theme with the **"Update available"** label.
2. Click the **"Update"** button on that theme card.
3. **Expected**: Theme builds its latest snapshot. Toast confirms. The version number on the card updates to the latest. The "Update available" label disappears.
4. Check the sidebar badge. **Expected**: The pink badge count decrements (or disappears if this was the only theme with an update).

### 7.7 Apply Theme Update to a Project

> Requires a theme that was updated in step 7.6 and a project using that theme.

1. Go to **Projects** in the sidebar.
2. Find a project that uses the updated theme. It should show an update indicator (arrow icon or similar) on its row.
3. Click the **pencil icon** to edit the project.
4. Look for an **"Apply Theme Update"** button or section.
5. **Before clicking**, note the project's current theme version.
6. Click **"Apply Theme Update"**.
7. **Expected**: Toast confirms the update was applied. The project's theme version should now match the latest theme version.

### 7.8 Verify Theme Update Preserves User Work

After applying a theme update to a project (step 7.7), verify that user customizations were preserved:

1. Click **Pages** in the sidebar. **Expected**: All your pages are still there — the update did not delete or overwrite any pages you created.
2. Open a page in the editor. **Expected**: Your widgets and content are unchanged.
3. Click **Menus** in the sidebar. **Expected**: All your menus are still there — the update did not overwrite menus you created or edited.
4. Click **Settings** in the sidebar (Theme Settings). **Expected**: Your customizations (colors, fonts, etc.) are preserved. If the theme update added new settings, they should appear with their default values.

### 7.9 Delete an Unused Theme

1. Go to the Themes list. Find a theme that is NOT used by any project (no pink "Active" badge, and not selected by any other project).
2. Click the **three-dot menu** on the theme card → **"Delete"**.
3. **Expected**: Confirmation dialog appears warning that this cannot be undone.
4. Click **"Delete"** to confirm.
5. **Expected**: Theme removed from the grid. Toast confirms deletion.

### 7.10 Try Deleting a Theme In Use

1. Find the theme your active project uses (it has a pink **"Active"** badge).
2. Click the **three-dot menu** → **"Delete"**.
3. **Expected**: Error toast appears listing which project(s) are using this theme. Deletion is blocked. The theme remains in the grid.

### 7.11 Theme Presets

1. Go to **Projects** → click **"New project"**.
2. Select a theme that has presets (e.g., Arch).
3. **Expected**: Preset cards appear below the theme dropdown. One is pre-selected (default) with a pink border.
4. Click a different preset card.
5. **Expected**: Pink border moves to the selected preset. Previous one deselected.
6. Create the project.
7. **Expected**: The project uses the selected preset's pages, menus, and theme settings — not the default preset's.
8. Verify by checking **Pages**, **Menus**, and **Settings** — they should match what the preset provides.

### 7.12 Theme Versions List

1. On the Themes list, click the **three-dot menu** on a theme → look for a **"Versions"** or version info option (if available in the UI).
2. **Expected**: You can see all installed versions for this theme (base version plus any updates).

### 7.13 Edge Cases to Try

#### Upload Edge Cases

- [ ] Upload a non-ZIP file (e.g., rename a `.jpg` to `.zip`). **Expected**: Rejected — not a valid ZIP file.
- [ ] Upload the same theme ZIP again (exact same version already installed). **Expected**: Rejected with a message saying the theme is already up-to-date (409 error).
- [ ] Upload a theme update ZIP whose base version doesn't match the installed theme's base version. **Expected**: Rejected with a clear error about version mismatch.
- [ ] Upload a theme ZIP with an invalid version in `theme.json` (e.g., `"version": "not-a-version"`). **Expected**: Rejected — version must be valid semver format.
- [ ] Upload multiple files at once. **Expected**: Only one file accepted — multiple file upload should be rejected or only the first processed.

#### Deletion Edge Cases

- [ ] Create two projects using the same theme. Try to delete the theme. **Expected**: Rejected — error message should list BOTH projects.
- [ ] Delete one of the two projects. Try deleting the theme again. **Expected**: Still rejected — the remaining project blocks deletion.
- [ ] Delete the last project using the theme. Try deleting the theme again. **Expected**: Now succeeds.

#### Update Edge Cases

- [ ] Apply a theme update to a project, then check other projects using the same theme. **Expected**: Other projects are unaffected — they still show the old version and their own "Apply Update" option. Each project updates independently.
- [ ] Apply a theme update to a project that has customized theme settings (changed colors, fonts). After the update, check that your color and font choices are preserved.
- [ ] Apply a theme update to a project where you've manually created menus. **Expected**: Your menus are preserved. If the theme update includes new menus, they should be added alongside yours — not replacing them.
- [ ] Apply a theme update to a project where you've created new pages beyond the theme's defaults. **Expected**: Your pages are preserved. If the theme update includes new templates/pages, they should be added alongside yours.

#### General Edge Cases

- [ ] Upload a new theme, create a project with it, then re-upload the same theme (same version). **Expected**: Rejected — already up-to-date.
- [ ] Check that the sidebar **Themes** badge count is accurate: upload a theme with updates (count should increment), apply the update (count should decrement), upload another update (count should increment again).

---

## SECTION 8: THEME SETTINGS

> **Important**: "Settings" in the sidebar refers to **Theme Settings** — colors, fonts, and other visual options for the active project's theme. This is NOT the same as "App Settings" (covered in Section 10).

### 8.1 Access Theme Settings (Standalone Page)

1. Click **Settings** in the sidebar.
2. **Expected**: The Settings page loads showing the theme's settings organized by groups as vertical tabs on the left (e.g., Colors, Typography, Layout, Branding, Advanced). The groups and settings depend on the theme.
3. Click through each group tab.
4. **Expected**: Each tab shows its settings. No errors. All inputs render correctly.

### 8.2 Unsaved Changes Indicator

1. Change a setting (e.g., a color).
2. **Expected**: A pink dot appears next to the page title and on the Save button, telling you there are unsaved changes.
3. Click **"Save"**.
4. **Expected**: Success toast. Pink dot disappears. Save button goes grey/disabled.
5. Change the same setting again.
6. **Expected**: Pink dot comes back.
7. Click the **"Reset"** button (if available).
8. **Expected**: Setting goes back to the last saved value. Pink dot disappears.

### 8.3 Settings Page Navigation Guard

1. Change a setting but do NOT save.
2. Click a sidebar link (e.g., Pages).
3. **Expected**: Warning dialog about unsaved changes.
4. Click Cancel/Stay. You should remain on the Settings page.
5. Save, then navigate away. **Expected**: No warning.

### 8.4 Access Theme Settings (In Page Editor)

1. Open the page editor on any page.
2. Look for a theme settings button/section (might be in the top bar or sidebar).
3. **Expected**: Opens theme settings panel with groups (colors, typography, layout, etc.).
4. Change a theme setting (e.g., a color). **Expected**: Preview updates immediately.
5. Save the page. Navigate to a different page in the editor.
6. **Expected**: The theme setting change persists — it's global across all pages.

### 8.5 Test Every Setting Type (Using the Arch Theme)

To thoroughly test all setting types, you will need to check both **Theme Settings** (global) and **Widget Settings** (local to specific widgets). Using the Arch theme, follow this exact checklist:

#### Part A: Theme Settings (Global)

Navigate to **Settings** in the sidebar and test these specific global inputs:

- [ ] **Checkbox**: In _Layout_ -> toggle "Enable scroll reveal animations". Save. Open a page in the editor. **Expected**: Preview reflects the change.
- [ ] **Image input**: In _Branding_ -> upload a "Favicon". Save. **Expected**: The favicon is tracked as in-use in the Media library.
- [ ] **Color picker**: In _Colors_ -> change "Primary Background". Try typing a hex value directly (e.g., `#FF5500`). **Expected**: Preview updates with the new color.
- [ ] **Font picker**: In _Typography_ -> change "Heading Font". Pick a different font and weight. **Expected**: Preview updates. The font loads correctly (no missing characters or fallback font showing).
- [ ] **Code editor**: In _Advanced_ -> type CSS in "Custom CSS" (e.g., `body { border: 5px solid red; }`). Save. **Expected**: Preview shows the custom CSS applied.

#### Part B: Widget Settings (Local)

Go to the **Page Editor**, and add or edit these specific widgets to test the remaining input types:

- [ ] **Text input**: Add a **Banner** widget. Type text in the "Eyebrow" or "Title" field. **Expected**: Preview updates in real time as you type.
- [ ] **Textarea**: Add a **Video** widget. Type text in the "Description" field. **Expected**: Preview updates in real time as you type.
- [ ] **Select dropdown**: Add a **Banner** widget. Change the "Alignment" or "Size" dropdown. **Expected**: Preview updates immediately on selection.
- [ ] **Range slider**: Add a **Pricing** widget. Drag the "Border Radius" slider. **Expected**: Preview updates in real time as you drag.
- [ ] **Link input**: Add a **Banner** widget. Set an internal page link in the "Button Link" field. Then switch to an external URL. **Expected**: Both link types work. The internal page resolves to the correct href.
- [ ] **Menu selector**: Edit the **Global Header** widget. Pick a menu in the "Navigation Menu" field. **Expected**: Preview shows the menu's items in the header navigation.
- [ ] **Rich text editor**: Add a **Rich Text** widget. Type formatted text with bold, italic, links, bullet lists, numbered lists. **Expected**: Formatting toolbar works. Preview renders all formatting correctly.
- [ ] **Icon picker**: Add a **Trust Bar** widget. Click the icon selector. Pick an icon. **Expected**: Preview shows the selected icon.
- [ ] **YouTube input**: Add a **Youtube/Vimeo** widget. Paste a YouTube URL (e.g., `https://www.youtube.com/watch?v=dQw4w9WgXcQ`). **Expected**: Preview shows the embedded video.

### 8.6 Theme Settings Persist

1. Click **Settings** in the sidebar. Change a theme color (e.g., background color). Save.
2. Open the page editor on any page.
3. **Expected**: The page uses the new color.
4. Navigate to a DIFFERENT page in the editor.
5. **Expected**: Same color — theme settings are global across all pages.
6. Close the editor entirely. Reopen the Settings page.
7. **Expected**: The color value is still what you set.

### 8.7 Theme Settings in Export

1. Change a visible theme setting (e.g., background color to something distinctive).
2. Save. Export the site.
3. Open the exported site in a browser.
4. **Expected**: The exported pages use the color you set — theme settings carry through to the export.

### 8.8 Favicon Media Tracking

1. Click **Settings** in the sidebar. In the _Branding_ group, set a **Favicon** image (browse and select one from the media library). Save.
2. Click **Media** in the sidebar. Find the image you used as the favicon.
3. **Expected**: The image shows as **"in use"** (by theme settings).
4. Go back to Settings. Remove the favicon (clear the image). Save.
5. Click **Media** again.
6. **Expected**: The image is no longer marked as "in use" (unless something else still uses it).

### 8.9 Edge Cases to Try

#### Code Safety — Input Types

- [ ] **Code safety** — Type `<script>alert(1)</script>` in a theme **text input** setting. Save. **Expected**: Preview shows it as plain text — no popup box. Export the site and check the HTML — the text is escaped, no code running.
- [ ] **Code safety** — Type `<script>alert(1)</script>` in a theme **textarea** setting. Save. **Expected**: Same as text input — plain text, no code execution.
- [ ] **Code safety** — Type `<script>alert(1)</script>` in a theme **color picker** (as the hex value). Save. **Expected**: The value is rejected or reverted to the default — it's not a valid hex color. If the backend corrects it, you may see a warning toast and the field will show the corrected value.
- [ ] **Code safety** — Paste `<script>alert(1)</script>` into a theme **rich text editor** setting (e.g., "Site Notice" in Branding). Save. **Expected**: The text is escaped and shown as plain text — no popup box, no code execution.
- [ ] **Code safety** — Type `<script>alert(1)</script>` in a theme **code editor** (CSS/HTML) setting. **Expected**: The code executes in the preview (a popup box may appear). This is expected and by design — code fields are intended for arbitrary embed code (YouTube iframes, custom CSS/JS, third-party widgets). This is not a security concern because the app runs locally and the user is entering their own code.
- [ ] **Code safety** — Type `<script>alert(1)</script>` in a **video URL** field (e.g., YouTube/Vimeo widget). **Expected**: The video area shows the placeholder message ("Enter a YouTube or Vimeo URL...") — no popup box, no preview crash.
- [ ] **Code safety** — Type `<script>alert(1)</script>` in a **link URL** field (e.g., Button Link in a Banner widget). **Expected**: The value is escaped in the HTML output — the href shows `&lt;script&gt;` instead of actual code. No popup box, no code execution.

#### Code Safety — Advanced Injection Vectors

- [ ] **Code safety** — In a **color picker**, type `red` (a CSS color name, not a hex value). Save. **Expected**: Rejected or reverted — only hex values (e.g., `#FF0000`) are accepted.
- [ ] **Code safety** — In a **rich text editor**, insert a link with `javascript:alert(1)` as the URL. Save, then check the preview and export. **Expected**: The app prepends `https://` turning it into `https://javascript:alert(1)` — a broken link that does nothing. No code execution.

#### Functional Edge Cases

- [ ] Change a theme setting in the **standalone Settings page**, then open the **page editor**. Do you see the updated value? **Expected**: Yes — both access the same theme data.
- [ ] In the Settings page, set an image as the favicon. Then go to **Media** and try to delete that image. **Expected**: Deletion is blocked — the image is in use by theme settings.

---

## SECTION 9: EXPORT

### 9.1 Create a Basic Export

1. Click **Export** in the sidebar.
2. Leave the "Also export pages as Markdown" checkbox **unchecked** for now.
3. Click **"Export Site"**.
4. **Expected**: The button shows a spinner while exporting. Success toast when done. A green success box appears with the version number and timestamp.
5. The export history table below should show a new entry — **v1**, with a green "success" badge and today's date.

### 9.2 View the Exported Site

1. In the export history table, click the **View** icon (external link) on v1.
2. **Expected**: Opens the exported site in a new browser tab, starting at `index.html`.
3. Click through internal links (menu items, buttons). Every page should load.
4. Check that images display correctly (not broken).
5. Check that fonts, colors, and layout match what you see in the editor preview.

### 9.3 Download Export as ZIP

1. Click the **Download** icon on an export version.
2. **Expected**: ZIP file downloads.
3. Extract the ZIP and check it contains:
   - HTML files for each page (e.g., `index.html`, `about.html`)
   - `assets/` folder with CSS, JS, and your uploaded media (images, videos, audios)
   - `manifest.json` — open it and verify it has: `generator`, `widgetizerVersion`, `themeId`, `themeVersion`, `exportVersion`, `exportedAt`, `projectName`
4. Check that **only images you actually use** are in `assets/images/`. Unused uploads should NOT be included.
5. If your project has a **Site URL** set (edit the project to check): the ZIP should also contain `sitemap.xml` and `robots.txt`. If there's no Site URL, these files should NOT be in the ZIP. (More on this in 9.4.)

### 9.4 Sitemap & Robots.txt

1. Make sure your project has a **Site URL** set (e.g., `https://example.com`). Edit the project if needed.
2. Set one of your pages to **"noindex"** in its SEO settings.
3. Export the site. Download the ZIP.
4. Open `sitemap.xml`. **Expected**: It lists URLs for all pages EXCEPT the one you set to "noindex".
5. Open `robots.txt`. **Expected**: It has a `Disallow` line for the noindex page (e.g., `Disallow: /that-page.html`) and a `Sitemap:` line pointing to your sitemap URL.
6. Now remove the Site URL from the project settings (clear the field). Save.
7. Export again. Download the ZIP.
8. **Expected**: Neither `sitemap.xml` nor `robots.txt` should be in the ZIP.

### 9.5 Export with Markdown

1. Check the **"Also export pages as Markdown (.md)"** checkbox.
2. Click **"Export Site"**. Download the ZIP.
3. **Expected**: `.md` files alongside the `.html` files (e.g., `index.md`, `about.md`).
4. Open a markdown file. It should have YAML frontmatter at the top:
   ```
   ---
   title: "Page Title"
   description: "Page description"
   source_url:
     html: 'page-slug.html'
     md: 'page-slug.md'
   ---
   ```
   Followed by the page content converted to Markdown (no header/footer, just the page widgets).
5. Open the markdown file for a page with complex widgets (e.g., **Pricing** or **Slideshow**). It should be readable text — not crash or produce garbage.

### 9.6 Multiple Export Versions

1. Make a visible change to a page (edit some text, change a color).
2. Export again.
3. **Expected**: New version (v2) appears in the history table. v1 is still there.
4. View v1 — it should show the OLD content. View v2 — it should show the NEW content.
5. Both should be downloadable independently.

### 9.7 Delete an Export

1. Click the **Delete** icon (trash) on an old export version.
2. **Expected**: Confirmation dialog appears. Confirm the deletion.
3. **Expected**: The version is removed from the history table.

### 9.8 Export Version Limit

1. Go to **App Settings → Export**. Note the "Max versions to keep" number (default is 10).
2. Set it to a low number (e.g., 3) so you can test this quickly.
3. Create exports until you have more than 3.
4. **Expected**: Oldest versions are automatically removed after each new export. Only the most recent 3 remain.
5. The history table should also show "Keeping 3 versions" (or whatever number you set).

### 9.9 Export Verification Checklist

Open an exported site (via View) and check all of these:

- [ ] Homepage loads as `index.html`
- [ ] All internal page links work (click through the menu)
- [ ] Images display correctly (not broken)
- [ ] Videos play (if you have any)
- [ ] Fonts, colors, and spacing match the editor preview
- [ ] Responsive design works (resize the browser window)
- [ ] Menu navigation works
- [ ] Custom CSS you added in Settings → Advanced is applied
- [ ] No errors in the browser console (press F12 → Console tab)
- [ ] View the HTML source (right-click → View Page Source). The very first thing should be a comment: `Made with Widgetizer v...` followed by `Per aspera ad astra` — before the `<!doctype>` tag
- [ ] SEO `<meta>` tags are in the `<head>` (description, og:title, og:image) and match what you entered in the page's SEO settings

### 9.10 Edge Cases to Try

- [ ] Export a project that has **no page with the slug "index"**. **Expected**: Export fails with a clear error telling you a homepage is required.
- [ ] Export a project with a page that has **no widgets**. **Expected**: Produces a valid HTML file with just the header and footer — no crash.
- [ ] Upload an image but don't use it on any page. Export. **Expected**: The unused image should NOT be in the exported `assets/images/` folder.
- [ ] Export quickly several times in a row. **Expected**: Each export gets its own version number. No errors or duplicates.

---

## SECTION 10: APP SETTINGS

> Do not confuse this with "Settings" (Theme Settings) — see Section 8. App Settings control how the app itself works. Theme Settings control how your site looks.

### 10.1 Open App Settings

1. Click **App Settings** in the sidebar (at the bottom).
2. **Expected**: Settings page with four tabs on the left: **General**, **Media**, **Export**, **Developer**.

### 10.2 General Settings

1. Switch to the **General** tab.
2. Change the **Language** to a different option (e.g., French, German, Greek).
3. Save.
4. **Expected**: The entire UI switches to the selected language immediately.
5. Change the **Date Format** to a different option.
6. Save.
7. **Expected**: Dates throughout the app (export history, media dates, etc.) use the new format.
8. Switch the language back to English when done.

### 10.3 Media Settings — File Size Limits

1. Switch to the **Media** tab.
2. Note the three file size limits: **Max Image Size** (default 5 MB), **Max Video Size** (default 50 MB), **Max Audio Size** (default 25 MB).
3. Set **Max Image Size** to **1 MB**. Save.
4. Go to **Media** and try uploading the `photo-1.5mb.jpg` test file (~1.5 MB).
5. **Expected**: Upload rejected with a clear error about file size.
6. Set it back to 5 MB when done.

### 10.4 Media Settings — Image Processing

1. Still in the **Media** tab, find the **Image Quality** setting (default 85, range 1–100).
2. Set it to **50**. Save.
3. Upload a new image.
4. **Expected**: The generated size variants (thumb, small, medium, large) should be visually lower quality / smaller file size than before.
5. Find the **Image Sizes** section. It shows four sizes: **Thumb** (150px), **Small** (480px), **Medium** (1024px), **Large** (1920px). Each has a width and an on/off toggle.
6. Disable the **Small** size (uncheck it). Save.
7. Upload another image.
8. **Expected**: Only thumb, medium, and large variants are generated — no "small" variant.
9. Re-enable the small size and reset quality to 85 when done.

> **Note**: If the active theme defines its own image sizes, this section may be hidden with a message explaining that the theme manages image sizes.

### 10.5 Export Settings

1. Switch to the **Export** tab.
2. Change **Max Versions to Keep** (default 10, range 1–50). Set it to **3**.
3. Save.
4. **Expected**: Already tested in Section 9.8 — oldest exports are cleaned up when you exceed the limit.
5. Note the **Max Import Size** setting (default 500 MB, range 10–2000 MB). This controls the maximum size of project ZIP files you can import.
6. Set it back to 10 when done.

### 10.6 Developer Mode

1. Switch to the **Developer** tab.
2. Toggle **Developer Mode** on. Save.
3. Export a site (Section 9).
4. **Expected**: If the exported HTML has any validation issues, the export folder will contain an extra file: `__export__issues.html` — a report listing the problems with line numbers and code snippets.
5. Toggle Developer Mode back off when done.

### 10.7 Unsaved Changes Warning

1. Change any setting but do NOT save.
2. **Expected**: A pink dot appears next to the page title, same as Theme Settings.
3. Try to navigate away (click Pages in the sidebar).
4. **Expected**: Warning dialog about unsaved changes.
5. Click Cancel/Stay. You should remain on App Settings.
6. Click the **Reset** button. **Expected**: Settings go back to last saved values. Pink dot disappears.
7. Save, then navigate away. **Expected**: No warning.

### 10.8 Edge Cases to Try

#### Validation

- [ ] Set **Image Quality** to **0**. Save. **Expected**: Rejected — must be between 1 and 100.
- [ ] Set **Image Quality** to **101**. Save. **Expected**: Rejected — must be between 1 and 100.
- [ ] Set **Max Image Upload Size** to **-1**. Save. **Expected**: Rejected — must be between 1 and 100.
- [ ] Set **Max Versions to Keep** to **0**. Save. **Expected**: Rejected — minimum is 1.
- [ ] Set all four image sizes to **disabled**. Upload an image. **Expected**: No size variants are generated — only the original file is kept.

#### Code Safety

- [ ] **Code safety** — Type `<script>alert(1)</script>` in the **Image Quality** field. **Expected**: Rejected — not a valid number. The input should only accept numbers.
- [ ] **Code safety** — Type `<script>alert(1)</script>` in the **Max Image Size** field. **Expected**: Same — rejected, not a valid number.
- [ ] **Code safety** — Type `<script>alert(1)</script>` in the **Max Versions to Keep** field. **Expected**: Same — rejected, not a valid number.

---

## SECTION 11: SIDEBAR & NAVIGATION

### 11.1 Items Disabled Without Active Project

1. Start with no active project (delete all projects or start fresh).
2. Look at the sidebar. **Expected**: Pages, Menus, Media, Settings, Themes, Plugins, and Export links are all disabled (grayed out, not clickable).
3. Click a disabled item. **Expected**: Nothing happens. No navigation occurs.
4. Create a project and set it as active.
5. **Expected**: All sidebar items become enabled and clickable.

### 11.2 Theme Update Badge

1. If a theme has pending updates, look at the sidebar.
2. **Expected**: The "Themes" link shows a pink badge (small circle) with the number of themes that have updates available.
3. Update all themes (apply updates).
4. **Expected**: Badge disappears (or count decrements to 0).

### 11.3 Sidebar Navigation

1. Click through each sidebar item in order: Dashboard, Projects, Pages, Menus, Media, Settings, Themes, Plugins, Export.
2. **Expected**: Each navigates to the correct page without errors. The active item is highlighted in the sidebar.

---

## SECTION 12: CROSS-FEATURE INTEGRATION TESTS

These tests verify that different features work together correctly.

### 12.1 Page Rename Ripple Effect

1. Have a project with:
   - Pages that link to each other (via link settings in widgets)
   - Menus that link to pages
2. Rename a page's slug (e.g., "services" → "our-services").
3. Check:
   - [ ] Widget links to that page still work (resolved via UUID)
   - [ ] Menu items pointing to that page still work
   - [ ] Export the site — links in HTML should use the new slug
   - [ ] Media usage tracking updated (old slug removed, new slug added)

### 12.2 Page Delete Ripple Effect

1. Have widgets and menus that link to a specific page.
2. Delete that page.
3. Check:
   - [ ] Menu item still exists but link should be empty/broken
   - [ ] Widget link settings should be cleared
   - [ ] Media files that were ONLY used by that page should now show as "unused"
   - [ ] App doesn't crash anywhere

### 12.3 Import → Export Round-Trip

1. Create a fully-built project (pages, widgets, media, menus, settings).
2. **Upload several images** and use them in widget settings on different pages.
3. Export the project as a ZIP (project export, not site export).
4. Delete the project.
5. Import the ZIP.
6. Compare: Does the imported project match the original?
   - [ ] Same pages with same content
   - [ ] Same menus with same structure
   - [ ] **Media library shows all uploaded files** (not empty!)
   - [ ] **Images in widgets display correctly** (not broken)
   - [ ] Same theme settings
   - [ ] Same widget configurations
7. Export the imported project as a site. View it. Does it match what the original would have produced?
8. **Bonus**: Import the same ZIP again (without deleting the first import). Both imported projects should work independently with their own media.

### 12.4 Concurrent Editing Stress Test

1. Open the page editor in Tab A.
2. Open the SAME page editor in Tab B (same page).
3. Make changes in Tab A. Save.
4. Make different changes in Tab B. Save.
5. Refresh both tabs.
6. **Expected**: Last save wins. No data corruption. No crashes.

### 12.5 Active Project Mismatch Guard

1. Open the page editor for a page in Project A. Make a small change (don't save yet).
2. In another tab, switch the active project to Project B.
3. Go back to the editor tab and save (Ctrl+S).
4. **Expected**: Error toast appears: "The active project has changed." Auto-save stops. Your edits are still visible in the editor (not lost).
5. No data should have been written to Project B.
6. Reload the editor tab.
7. **Expected**: The editor loads Project B (the now-active project). Your unsaved edits to Project A are gone (expected — they were in-memory only).

---

## SECTION 13: KEYBOARD SHORTCUTS

Test each keyboard shortcut:

- [ ] **Ctrl+S / Cmd+S** in editor — Saves immediately
- [ ] **Ctrl+Z / Cmd+Z** in editor — Undoes last change
- [ ] **Ctrl+Shift+Z / Cmd+Shift+Z** in editor — Redoes
- [ ] **Ctrl+Y** in editor — Also redoes
- [ ] **Escape** — Closes open drawers/modals

---

## Bug Report Template

When you find an issue, report it with:

```
SECTION: [e.g., 4.5 Edit Widget Settings]
SEVERITY: [Critical / Major / Minor / Cosmetic]
STEPS TO REPRODUCE:
  1. ...
  2. ...
  3. ...
EXPECTED: What should happen
ACTUAL: What actually happened
SCREENSHOT: [attach if possible]
BROWSER: [Chrome 120 / Firefox 115 / etc.]
NOTES: [anything extra]
```

**Severity guide:**

- **Critical**: App crashes, data loss, can't complete a core task
- **Major**: Feature broken, ugly workaround needed
- **Minor**: Feature works but something is off (wrong message, slow, weird behavior)
- **Cosmetic**: Visual issue (alignment, spacing, typo)
