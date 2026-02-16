> **For beta testers.** Follow every step. Mark each one PASS or FAIL. If something breaks, write down exactly what you did, what you expected, and what happened instead. Screenshot everything that looks wrong.

## SECTION 1: PROJECTS

### 1.1 Create Your First Project

1. Click **Projects** in the sidebar.
2. Click **"New Project"** button.
3. Fill in the form:
   - **Title**: "My Test Site"
   - Leave everything else default.
4. Pick any available theme from the theme dropdown.
5. If the theme has presets, you should see preset cards appear below the theme dropdown. Click one.
6. Click **"Create Project"**.
7. **Expected**: Success toast appears. You're back on the project list. "My Test Site" shows with a filled star (it's the active project since it's your first).

### 1.2 Create a Second Project

1. Click **"New Project"** again.
2. **Title**: "Second Site"
3. Pick the same or different theme.
4. Click **"Create Project"**.
5. **Expected**: Success toast. "Second Site" appears in the list. It should NOT have a filled star (the first project is still active).

### 1.3 Switch Active Project

1. On "Second Site" row, click the **star icon**.
2. **Expected**: Toast says it's now active. Star fills in. First project's star unfills.

### 1.4 Edit a Project

1. On "My Test Site" row, click the **pencil icon** (edit).
2. Themes cannot be changed after creation.
3. Change the title to "My Renamed Site".
4. Click on "More settings"
5. Check that the **folder name** field did NOT change — folder name only changes if you edit it manually.
6. Add a website URL like `https://example.com`.
7. Add something to the **Notes** field (e.g., "Testing project").
8. Click **"Save Changes"**.
9. **Expected**: Success toast. Back on list, name shows "My Renamed Site".
10. Click edit again. **Expected**: Notes and URL are still there.

### 1.5 Edit a Project's Folder Name

1. Click the **pencil icon** on "My Renamed Site".
2. Manually change the **folder name** to a new value (e.g., "renamed-site").
3. Click **"Save Changes"**.
4. **Expected**: Success toast. The project's folder is renamed behind the scenes.
5. Click edit again. **Expected**: Folder name shows "renamed-site".

### 1.6 Upload Media to a Project

1. Make sure "My Renamed Site" is the active project (click the star icon if it isn't already).
2. Click **Media** in the sidebar.
3. Upload 2-3 test images — drag-and-drop onto the upload area or click to browse.
4. **Expected**: Images appear in the media library with thumbnails. File names, sizes, and types are shown.
5. Go to **Pages**, open any page in the editor (e.g., "index"), and add or edit a widget that uses one of the uploaded images. Save the page.
6. **Expected**: The image displays correctly in the widget preview.

> This step ensures media exists for the duplicate, export, and import tests that follow.

### 1.7 Duplicate a Project

1. On "My Renamed Site" row, click the **Duplicate project** icon.
2. **Expected**: Toast says project duplicated. A new project appears in the list with the title "Copy of My Renamed Site".
3. Click edit on the duplicate. Verify the folder name has a "copy-of-" prefix (e.g., "copy-of-renamed-site"). Verify it has the same theme, notes, and URL as the original.
4. Go to **Media** for the duplicate. **Expected**: Same media files as the original — all images you uploaded in step 1.6 should appear in the media library, not be missing.

### 1.8 Try to Deactivate the Active Project

1. The active project should have a filled star.
2. Click the **star icon** on the active project.
3. **Expected**: Nothing happens (or a message explaining you can't deactivate). You can only switch active to a different project.

### 1.9 Try to Delete the Active Project

1. The active project should have a filled star.
2. Click the **trash icon** on the active project.
3. **Expected**: You should NOT be able to delete it. Error message or disabled button. You should see something telling you it can't be deleted because it's active.

### 1.10 Delete a Non-Active Project

1. Click the trash icon on a non-active project (like the duplicate you made).
2. **Expected**: Confirmation dialog appears asking "Are you sure?"
3. Click **"Delete"**.
4. **Expected**: Toast confirms deletion. Project disappears from list.

### 1.11 Export a Project

1. On "My Renamed Site" row (which already has media from step 1.6), click the **download/export icon**.
2. **Expected**: Toast says "Exporting project..." then a ZIP file downloads to your computer.
3. Open the ZIP. It should contain:
   - `project-export.json` manifest file
   - `pages/` folder with page JSON files
   - `menus/` folder (if menus exist)
   - `uploads/media.json` with media metadata
   - `uploads/images/` (or videos/audios) with the actual media files
   - Theme files (`theme.json`, `layout.liquid`, etc.)

### 1.12 Import a Project

1. Click **"Import Project"** button (should be in the page header area).
2. An import modal should open.
3. Drag the ZIP you just exported into the drop zone (or click to browse).
4. **Expected**: Project imports successfully. Toast confirms. New project appears in the list with the original name.
5. Open the imported project and verify:
   - [ ] Pages list matches the original
   - [ ] **Media library shows all uploaded images** (not empty!)
   - [ ] Open a page in the editor — images used in widgets should display correctly
   - [ ] Menus match the original structure

### 1.13 Navigation Guard on Edit

1. Click **edit** on any project.
2. Change the title but do **NOT** save.
3. Try to navigate away (click Pages or Projects in the sidebar).
4. **Expected**: Warning dialog about unsaved changes.
5. Click Cancel/Stay. You should remain on the edit form.
6. Save, then navigate away. No warning.

### 1.14 Edge Cases to Try

- [ ] Create a project with a very long name (100+ characters). **Expected**: It should handle it without errors.
- [ ] Create a project with special characters in the name (`Test & Site #1 — "Quotes"`). **Expected**: It works and the name is stored exactly as you typed it — no weird characters like `&amp;` appearing instead.
- [ ] Create a project with code in the name (`My Site <script>alert('xss')</script>`). **Expected**: The code part is removed — the stored name should be just "My Site".
- [ ] Create a project with ONLY `<script>alert(1)</script>` as the name (no other text). **Expected**: Rejected — error toast says the name is required (since the code gets stripped, nothing is left).
- [ ] Enter `<script>alert(1)</script>` in the **Notes/Description** field. Save, edit again. **Expected**: The code is removed — the field should be empty or contain only plain text.
- [ ] Enter `<script>alert(1)</script>` in the **Website URL** field. **Expected**: Rejected — it's not a valid URL.
- [ ] Enter `<script>alert(1)</script>` in the **Folder Name** field. **Expected**: Rejected — folder names only allow lowercase letters, numbers, and hyphens.
- [ ] Create two projects with the same name. **Expected**: The second project gets a slightly different folder name (e.g., with a number added) to avoid conflict.
- [ ] Edit a project's folder name to match an existing project's folder. **Expected**: It should prevent the conflict.
- [ ] Enter an invalid website URL (e.g., "not a url"). **Expected**: Validation catches it and shows an error.
- [ ] Try importing a random ZIP file that isn't a Widgetizer export. **Expected**: A clear error message appears.
- [ ] Try importing a ZIP that's too large (if you can). **Expected**: It respects the size limit set in Settings and shows an error.
- [ ] Import a project whose theme doesn't exist in this installation. **Expected**: A clear error message appears.
- [ ] Export a project with media, then import it twice (while the original still exists). **Expected**: Both imports should succeed — no file conflicts.
- [ ] Duplicate a project with media. **Expected**: The duplicate's media library shows all files and images in widgets still display correctly.
- [ ] Delete a project that has media. **Expected**: Everything is cleaned up properly — no leftover files or data.

---

## SECTION 2: PAGES

> The Arch theme ships with 8 pre-made pages: Home (index), About, Services, Case Studies, Case Study: Atlas Group, Contact, Privacy Policy, and Terms of Service. These tests work with those existing pages.

### 2.1 Verify Theme Pages Loaded

1. Make sure you have an active project (created with the Arch theme). Click **Pages** in the sidebar.
2. **Expected**: 8 pages are listed:
   - Home (`index`)
   - About (`about`)
   - Services (`services`)
   - Case Studies (`case-studies`)
   - Case Study: Atlas Group (`case-study-atlas-growth`)
   - Contact (`contact`)
   - Privacy Policy (`privacy`)
   - Terms of Service (`terms`)
3. Verify each page has the correct slug shown above.

### 2.2 Create a New Page with Full SEO

1. Click **"New Page"** button.
2. Fill in:
   - **Name**: "Blog"
   - The **slug** should auto-generate as "blog".
3. Click **"More Settings"** to expand the SEO section.
4. Fill in **every** SEO field:
   - **Meta description**: "Our latest articles and insights"
   - **Social media title**: "Blog — My Renamed Site"
   - **Social media image**: Click **Browse**, pick one of the images you uploaded in step 1.6
   - **Canonical URL**: `https://example.com/blog`
   - **Search engine indexing**: Change the dropdown to **"noindex, follow"**
5. Click **"Create Page"**.
6. **Expected**: Success toast. "Blog" appears in the page list alongside the 8 theme pages.
7. Click the **pencil icon** on "Blog" to edit it again.
8. **Expected**: All SEO fields you just set are still there — description, social media title, social media image, canonical URL, and indexing set to "noindex, follow".
9. Go to **Media**. Find the image you selected as the social media image.
10. **Expected**: That image shows as **"in use"** by the Blog page.

### 2.3 Edit an Existing Page

1. Click the **pencil icon** on "About".
2. Change the name to "About Our Company".
3. Change the slug to "about-us".
4. Click **"More Settings"** and update SEO fields:
   - **Meta description**: "Learn about our team and mission"
   - **Social media title**: "About Us — My Renamed Site"
   - **Social media image**: Click Browse and pick a **different** image than the one you used for Blog
   - **Search engine indexing**: Set to **"index, follow"** (default)
5. Click **"Save"**.
6. **Expected**: Toast confirms. Page list shows "About Our Company" with slug "about-us".
7. Go to **Media**. Check the image you just set as the social media image.
8. **Expected**: It shows as "in use" by the About page.

### 2.4 Duplicate a Page

1. Click the **copy icon** on "Contact".
2. **Expected**: New page appears with "Copy of Contact" as the name and "contact-copy" (or similar "-copy" suffix) as the slug.
3. Click the **pencil icon** on the duplicate.
4. **Expected**: SEO fields are copied from the original Contact page (if it had any set).

### 2.5 Delete a Single Page

1. Click the **trash icon** on the "Copy of Contact" duplicate you just made.
2. **Expected**: Confirmation modal. Confirm. Page gone. Toast confirms.

### 2.6 Bulk Delete Pages

1. Create 3 throwaway pages ("Delete Me 1", "Delete Me 2", "Delete Me 3").
2. Check the **checkboxes** on all three rows.
3. A "Delete Selected" button should appear (with a count like "3 selected").
4. Click **"Delete Selected"**.
5. **Expected**: Confirmation modal showing the count. Confirm. All three gone. The theme pages should still be there.

### 2.7 Edge Cases to Try

- [ ] Create a page with the same slug as an existing theme page (e.g., name it "About" — slug would be `about`). **Expected**: It auto-adds a number to the slug (e.g., `about-1`) to avoid a conflict.
- [ ] Create a page with special characters in the name (e.g., `About & "FAQ" — Info`). **Expected**: The slug is cleaned up to only use simple characters. The name is stored exactly as typed — no weird characters like `&amp;` appearing instead.
- [ ] Create a page with code in the name (`My Page <img src=x onerror=alert(1)>`). **Expected**: The code part is removed — name should be just "My Page".
- [ ] Create a page with ONLY `<script>alert(1)</script>` as the name (no other text). **Expected**: Rejected — error toast says the name is required (since the code gets stripped, nothing is left).
- [ ] Enter `<script>alert(1)</script>` in the **slug** field. **Expected**: Rejected or cleaned up to empty — slugs only allow lowercase letters, numbers, and hyphens.
- [ ] Edit a page slug to match another existing page's slug. **Expected**: It prevents the conflict.
- [ ] Try to navigate away from the page form with unsaved changes. **Expected**: A warning dialog appears.
- [ ] Enter `<script>alert(1)</script>` in the **meta description** field. Save. Edit again. **Expected**: The code is removed, only plain text remains.
- [ ] Enter `<script>alert(1)</script>` in the **social media title** field. Save. Edit again. **Expected**: The code is removed, only plain text remains.
- [ ] Enter `<script>alert(1)</script>` in the **canonical URL** field. **Expected**: Rejected — it's not a valid URL.
- [ ] Set a social media image on a page, then go to **Media** and try to delete that image. **Expected**: Deletion is blocked — you should see an error saying the image is in use by that page.
- [ ] Enter an invalid **canonical URL** (e.g., "not a url"). **Expected**: Validation catches it and shows an error.
- [ ] Export the site. Open the exported page in a browser and view the page source. **Expected**: No raw code appears in the page metadata — everything should look clean and properly formatted.

---

## SECTION 3: PAGE EDITOR (This is the big one)

### 3.1 Open the Editor

1. Go to **Pages**.
2. Click the **"Design"** button on any page.
3. **Expected**: Page editor loads with three panels:
   - **Left**: Widget list
   - **Center**: Live preview
   - **Right**: Settings panel (might be empty until you select a widget)

### 3.2 Add a Widget

1. Click the **"+" button** in the left panel (or "Add Widget").
2. A widget selector should appear showing available widgets.
3. Click any widget (e.g., a text section, hero banner, or whatever's available).
4. **Expected**: Widget appears in the left panel list AND in the center preview.

### 3.3 Add Multiple Widgets

1. Add 3-4 more widgets of different types.
2. **Expected**: Each appears in the left list in order and renders in the preview.

### 3.4 Select a Widget

1. Click a widget in the **left panel list**.
2. **Expected**: Widget highlighted in the list. Right panel shows its settings. Preview may scroll to show it.
3. Click a widget directly in the **center preview**.
4. **Expected**: Same behavior — selected in left list, settings appear on right.

### 3.5 Edit Widget Settings

1. Select a widget that has text settings (title, description, etc.).
2. Change the title text in the right panel.
3. **Expected**: Preview updates in REAL TIME as you type. No need to save.
4. Try changing other settings: colors, alignment, checkboxes, dropdowns.
5. **Expected**: Each change reflects immediately in the preview.

### 3.6 Reorder Widgets

1. In the left panel, **drag** a widget to a different position.
2. **Expected**: Widget moves in both the list AND the preview. The page layout changes accordingly.

### 3.7 Duplicate a Widget

1. Hover over a widget in the left panel — action icons appear.
2. Click the **copy icon** (blue on hover).
3. **Expected**: A copy of the widget appears below it with identical settings.

### 3.8 Delete a Widget

1. Hover over a widget in the left panel — action icons appear.
2. Click the **trash icon** (red on hover).
3. **Expected**: Confirmation dialog. Confirm. Widget gone from list and preview.

### 3.9 Work with Blocks

1. Find a widget that supports blocks (e.g., a features widget, card grid, or FAQ). Look for widgets that have nested items in the left panel.
2. **Select a block** by clicking it in the left list.
3. **Expected**: Right panel shows the block's settings (not the parent widget's).
4. **Edit block settings** — change text, images, etc.
5. **Expected**: Preview updates in real time.
6. **Add a new block**: Click the "+" button on the widget or "Add Block".
7. **Expected**: New block appears. Might show block type selection if multiple types available.
8. **Reorder blocks** by dragging within the widget.
9. **Duplicate a block**: Hover over a block, click the **copy icon** (blue on hover).
10. **Delete a block**: Hover over a block, click the **trash icon** (red on hover). Confirm.

### 3.10 Block Limits

1. If a widget has a block limit, like the Slideshow (check if a counter like "3/5" appears):
   - Add blocks until you hit the limit.
   - **Expected**: "Add Block" button disappears or disables. Duplicate option also disabled.
   - Try to add one more anyway if possible. Should be prevented.

### 3.11 Image Settings

1. Find a widget with an image setting.
2. Click **"Browse"** next to the image field.
3. **Expected**: Media selector drawer opens showing your media library.
4. If empty, click **"Upload"** in the drawer and upload an image.
5. Select an image.
6. **Expected**: Drawer closes. Image appears in settings. Preview shows the image.
7. Click the **remove/clear button** on the image.
8. **Expected**: Image removed from settings and preview.

### 3.12 Link Settings

1. Find a widget with a link/button setting.
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

### 3.13 Menu Settings

1. Find a widget (likely the header) that has a menu selector.
2. Click the menu dropdown.
3. **Expected**: Shows all menus you've created for this project.
4. Select a menu.
5. **Expected**: Preview updates to show the menu's items.

### 3.14 Rich Text Settings

1. Find a widget with a rich text editor setting.
2. Type formatted text. Try bold, italic, links, bullet lists, numbered lists.
3. **Expected**: Formatting toolbar works. Preview shows formatted text.

### 3.15 Global Header & Footer

1. In the left panel, scroll to find **"Global Header"** and **"Global Footer"**.
2. They should be visually distinct (grey background, can't be dragged).
3. Click on the header.
4. **Expected**: Settings panel shows header widget settings.
5. Make a change (e.g., change a logo, site title, or navigation menu).
6. **Expected**: Preview updates. This change should affect ALL pages.
7. Navigate to a different page in the editor.
8. **Expected**: The header change persists across pages.

### 3.16 Save and Auto-Save

1. Make some changes to widgets.
2. Look at the top bar — it should show something like "X unsaved changes".
3. Wait 60 seconds without making changes.
4. **Expected**: Auto-save triggers. Status changes to "All changes saved".
5. Make another change.
6. Click the **Save button** (or press **Ctrl+S** / **Cmd+S**).
7. **Expected**: Saves immediately. Status shows saved.

### 3.17 Undo / Redo

1. Make a change (e.g., edit a title).
2. Press **Ctrl+Z** (or **Cmd+Z** on Mac).
3. **Expected**: Change reverts. Preview updates.
4. Press **Ctrl+Shift+Z** (or **Ctrl+Y**).
5. **Expected**: Change reapplied.
6. Try undo/redo with the **toolbar buttons** too.
7. Try undoing multiple steps in a row.

### 3.18 Preview Modes

1. In the top bar, find the **preview mode toggle** (Desktop / Mobile).
2. Switch to **Mobile**.
3. **Expected**: Preview area narrows to mobile width. Content reflows.
4. Switch to **Desktop**.
5. **Expected**: Full width restored.

### 3.19 Standalone Preview

1. Click the **Preview button** (new tab icon) in the top bar.
2. **Expected**: A new browser tab opens with the full page preview — no editor UI.
3. Click internal links in the preview.
4. **Expected**: They navigate to other preview pages correctly.
5. External links should be disabled or handled safely.

### 3.20 Navigation Protection

1. Make a change in the editor (don't save).
2. Try to click **Pages** in the sidebar.
3. **Expected**: Warning dialog appears: "You have unsaved changes. Leave anyway?"
4. Click **Cancel/Stay**. You should stay in the editor.
5. Click the browser **back button**.
6. **Expected**: Same warning.
7. Try to **close the browser tab**.
8. **Expected**: Browser's built-in "Leave site?" warning appears.
9. Now click **Save**, then navigate away.
10. **Expected**: No warning. Clean navigation.

### 3.21 Image Upload & Media Tracking in the Editor

These tests verify that images uploaded and used through the editor are properly tracked in the Media library.

1. Open a page in the editor. Find a widget with an image setting.
2. Click **"Browse"**, then click **"Upload"** in the media drawer. Upload a new image.
3. Select the image you just uploaded for the widget. Save the page.
4. Go to **Media** in the sidebar. Find the image you just uploaded.
5. **Expected**: The image shows as **"in use"** by the page you edited.
6. Go back to the editor. Change the widget's image to a **different** image (or remove it). Save the page.
7. Go to **Media** again. Check the first image.
8. **Expected**: The first image should NO LONGER show as "in use" by that page (unless another widget on the same page still uses it).
9. Now set images on **two different widgets** on the same page — use the same image for both. Save.
10. Go to **Media**. **Expected**: The image shows as "in use" by that page.
11. Remove the image from one of the two widgets. Save.
12. Go to **Media**. **Expected**: The image STILL shows as "in use" (because the other widget still uses it).
13. Remove the image from the second widget too. Save.
14. Go to **Media**. **Expected**: The image now shows as NOT in use.

### 3.22 Edge Cases to Try

- [ ] Add 20+ widgets to a single page. **Expected**: The editor should still feel fast and responsive.
- [ ] Paste very long text (5000+ characters) into a text field. **Expected**: It handles it without crashing or freezing.
- [ ] Paste code into a plain text field. **Expected**: The code should show as plain text in the preview, not actually run.
- [ ] Enter `<script>alert(1)</script>` in a widget **title** field. **Expected**: The preview should show the text literally or strip it — no popup box should appear.
- [ ] Enter `<script>alert(1)</script>` in a widget **description/text** field. **Expected**: Same as above — shown as text or stripped, no popup.
- [ ] Enter `<script>alert(1)</script>` in a **link text** field. **Expected**: Shown as text or stripped in the preview — no popup.
- [ ] Enter `<script>alert(1)</script>` in a **link URL** field (external URL). **Expected**: Rejected or cleaned up — the link should not run any code when clicked.
- [ ] Paste `<script>alert(1)</script>` into a **rich text editor** field. **Expected**: The code part is automatically removed. Only normal formatting (bold, links, etc.) is kept.
- [ ] Enter `<script>alert(1)</script>` in the **code editor** (CSS/HTML field). **Expected**: Code editors allow raw code, but verify it does NOT cause any popups or run in the preview — the preview should remain safe.
- [ ] Upload a very large image through the widget image browser. **Expected**: It either uploads successfully or shows a clear error about file size.
- [ ] Rapidly click undo 50 times. **Expected**: It handles it without crashing.
- [ ] Open the same page in two browser tabs. Edit in both. Save both. **Expected**: The last save wins. No crashes or corrupted data.
- [ ] Upload an image through the widget browser, use it in a widget, save the page, then go to **Media** and try to delete that image. **Expected**: Deletion is blocked — error says the image is in use.
- [ ] Use the same image in widgets on **two different pages**. Go to **Media**. **Expected**: The image shows as "in use" by both pages. Deleting it should be blocked.

---

## SECTION 4: MEDIA LIBRARY

### 4.1 Upload Images

1. Click **Media** in the sidebar.
2. Click **"Upload"** or drag files into the upload area.
3. Upload 3-4 images (JPG, PNG, WebP).
4. **Expected**: Progress bars shown. Files appear in the grid. Success toast with count.

### 4.2 Upload Different File Types

1. Upload an **SVG** file.
2. Upload an **MP4 video**.
3. Upload an **MP3 audio** file.
4. **Expected**: All accepted. Each shows with appropriate icon/thumbnail.

### 4.3 Upload Validation

1. Try uploading a **.txt** file.
2. **Expected**: Rejected. Error toast saying invalid file type.
3. Try uploading an image larger than the max file size (check Settings for the limit).
4. **Expected**: Rejected with clear error message about file size.

### 4.4 Batch Upload

1. Select 10+ files at once and upload.
2. **Expected**: Files upload in batches (should see progress). Success/warning toast shows count of uploaded and rejected files.

### 4.5 View Modes

1. Toggle between **Grid view** and **List view** (icons in the toolbar).
2. **Expected**: Same files, different layout. Grid shows thumbnails. List shows details.

### 4.6 Search Media

1. Type a filename in the **search bar**.
2. **Expected**: List filters in real time to show matching files.
3. Clear the search.
4. **Expected**: All files shown again.

### 4.7 Filter by Type

1. Use the **type filter** dropdown.
2. Select **Images**.
3. **Expected**: Only images shown.
4. Select **Videos**.
5. **Expected**: Only videos shown.
6. Select **All**.
7. **Expected**: Everything shown.

### 4.8 Edit Media Metadata

1. Click on a file (or hover and click the edit icon).
2. A drawer or panel should open.
3. Edit the **alt text** and **title**.
4. Save.
5. **Expected**: Metadata saved. Toast confirms.

### 4.9 Delete Unused Media

1. Find a file that is NOT used in any page.
2. Click the **delete/trash icon**.
3. **Expected**: Confirmation dialog. Confirm. File deleted. Toast confirms.

### 4.10 Try Deleting Media That's In Use

1. Go to the page editor. Add a widget with an image. Set it to one of your uploaded images. Save.
2. Go back to Media.
3. Try to delete that image.
4. **Expected**: Error! The file is in use. You should see a message telling you which pages use it. Deletion should be blocked.

### 4.11 Bulk Delete

1. Select multiple files using checkboxes.
2. Click **"Delete Selected"**.
3. **Expected**: Confirmation with count. Files in use should be skipped. Others deleted.

### 4.12 Refresh Usage

1. Click **"Refresh Usage"** button in the toolbar.
2. **Expected**: Toast confirms. Usage badges update on files.

### 4.13 Image Size Variants

1. Upload a large image (at least 2000px wide).
2. Check the file details (click on it).
3. **Expected**: Multiple size variants should have been generated (thumb, small, medium, large — depending on settings). Check that the original dimensions are shown.

### 4.14 Edge Cases to Try

- [ ] Upload a file with a very long filename. Does it get truncated/sanitized?
- [ ] Upload a file with spaces and special characters in the name. Does it sanitize?
- [ ] Upload the same filename twice. Does it handle the conflict (e.g., append `-1`)?
- [ ] Upload a potentially malicious SVG (one with JavaScript inside). Is it sanitized?
- [ ] Enter `<script>alert(1)</script>` in the **alt text** field of a media file. Save. Edit again — should be escaped or stripped. Check the exported HTML — alt attribute must not contain executable script.
- [ ] Enter `<script>alert(1)</script>` in the **title** field of a media file. Save. Edit again — should be escaped or stripped.

---

## SECTION 5: MENUS

### 5.1 Create a Menu

1. Click **Menus** in the sidebar.
2. Click **"New Menu"**.
3. **Name**: "Main Navigation"
4. Click **"Create Menu"**.
5. **Expected**: Success toast. You may be redirected to the structure editor.

### 5.2 Add Menu Items

1. If not already there, click the **structure/grid icon** on your menu to open the structure editor.
2. Click **"Add Item"**.
3. Set:
   - **Label**: "Home"
   - **Link**: Select your homepage from the page dropdown (internal link)
4. Add more items:
   - "About" → linked to your about page
   - "Services" → linked to services page
   - "Contact" → linked to contact page
5. **Expected**: Items appear in a list/tree view.

### 5.3 Add External Links

1. Add a menu item:
   - **Label**: "Twitter"
   - **Link**: Type `https://twitter.com` (external URL instead of selecting a page)
2. **Expected**: Item added with the external URL.

### 5.4 Nest Menu Items (Submenus)

1. Add items: "Service A", "Service B", "Service C".
2. **Drag** "Service A" to become a child of "Services" (drag it slightly to the right under Services).
3. Do the same for B and C.
4. **Expected**: Three-level hierarchy. Services → Service A, Service B, Service C.
5. Try nesting 3 levels deep (e.g., Service A → Sub-item).

### 5.5 Reorder Menu Items

1. Drag "Contact" above "About".
2. **Expected**: Order changes.
3. Drag a nested item out to the top level.
4. **Expected**: Item un-nests.

### 5.6 Save Menu Structure

1. Click **"Save Menu"**.
2. **Expected**: Toast confirms save.
3. Refresh the page.
4. **Expected**: Structure preserved exactly as you left it.

### 5.7 Edit Menu Settings

1. Go back to the menu list.
2. Click the **pencil icon** on your menu.
3. Change the name to "Primary Navigation".
4. Save.
5. **Expected**: Name updated in the list.

### 5.8 Duplicate a Menu

1. Click the **copy icon** on a menu.
2. **Expected**: New menu appears (e.g., "Copy of Primary Navigation"). All items duplicated.
3. Open the duplicate's structure. Verify all items and nesting preserved.

### 5.9 Delete a Menu

1. Click the **trash icon** on the duplicate.
2. **Expected**: Confirmation dialog. Confirm. Menu gone.

### 5.10 Menu + Page Rename Integration

1. Open a menu that links to "About" page.
2. Go to **Pages** and rename the about page's slug (e.g., change "about" to "about-us").
3. Go back to the menu structure editor.
4. **Expected**: The link should still work because it uses the page's UUID internally. The display might show the old slug until you save, but rendering should resolve to the new slug.

### 5.11 Menu + Page Deletion

1. Create a throwaway page ("Temp Page").
2. Add it to a menu.
3. Delete the page from the Pages list.
4. Open the menu structure.
5. **Expected**: The menu item for "Temp Page" should show an empty or broken link. It shouldn't crash.

### 5.12 Edge Cases to Try

- [ ] Create a menu with 50+ items. Performance?
- [ ] Create deeply nested items (3+ levels). Does the UI handle it?
- [ ] Create a menu with special characters in the name (e.g., `Nav & "Links"`). Is the name stored without HTML-encoding?
- [ ] Create a menu with HTML in the name (`Menu <script>alert(1)</script>`). HTML tags should be stripped — name should be just `Menu`.
- [ ] Create a menu with ONLY `<script>alert(1)</script>` as the name (no other text). Should be **rejected** — error toast says name is required.
- [ ] Enter `<script>alert(1)</script>` as a **menu item label**. Save. Edit again — should be escaped or stripped. Check the preview and exported HTML — no script execution.
- [ ] Enter `<script>alert(1)</script>` as a **menu item external URL**. Save. Check the preview — the link should not execute scripts. Exported HTML href should be escaped or removed.
- [ ] Add a menu item with no label. What happens?
- [ ] Add a menu item with no link. What happens?
- [ ] Save menu, delete it, try to use it in a header widget. What shows?

---

## SECTION 6: THEMES

### 6.1 View Installed Themes

1. Click **Themes** in the sidebar.
2. **Expected**: Grid of theme cards showing name, version, screenshot, description.

### 6.2 Upload a Theme

1. If you have a theme ZIP file, click **"Upload Theme"** or drag it to the upload area.
2. **Expected**: Theme validates (checks for required files like `theme.json`, `layout.liquid`). Appears in the grid on success.
3. Try uploading an invalid ZIP (random files). **Expected**: Error with clear message.

### 6.3 Delete a Theme

1. Find a theme that is NOT used by any project.
2. Click the **three-dot menu** on the theme card → **"Delete"**.
3. **Expected**: Confirmation dialog. Confirm. Theme removed.

### 6.4 Try Deleting a Theme In Use

1. Try to delete the theme your active project uses.
2. **Expected**: Error! Message says the theme is used by project(s). Deletion blocked.

### 6.5 Theme Updates

1. If a theme has an update available, you should see an **"Update available: vX.Y.Z"** label on its card.
2. The sidebar should show a **badge** next to Themes with the count.
3. Click **"Update"** on the theme card.
4. **Expected**: Theme builds its latest snapshot. Version updates. Badge count decrements.

### 6.6 Apply Theme Update to Project

1. After updating a theme, go to **Projects**.
2. If a project uses that theme, there should be an update indicator (arrow icon or similar).
3. Edit the project → look for **"Apply Theme Update"** button.
4. Click it.
5. **Expected**: Theme files updated. Settings merged (your customizations preserved). Toast confirms.

### 6.7 Theme Presets

1. Create a new project.
2. Select a theme that has presets.
3. **Expected**: Preset cards appear below the theme dropdown. One is pre-selected (default).
4. Click a different preset.
5. **Expected**: Pink border on selected. Previous deselected.
6. Create the project.
7. **Expected**: Project uses the selected preset's settings, templates, and menus.

### 6.8 Edge Cases to Try

- [ ] Upload a theme ZIP without `theme.json`. Does it reject with a clear error?
- [ ] Upload a theme with the same name as an existing one. What happens?
- [ ] Update a theme, then check that projects NOT using it are unaffected.

---

## SECTION 7: THEME SETTINGS (in Page Editor)

### 7.1 Access Theme Settings

1. Open the page editor on any page.
2. Look for a theme settings button/section (might be in the top bar or sidebar).
3. **Expected**: Opens theme settings panel with groups (colors, typography, layout, etc.).

### 7.2 Test Every Setting Type

Go through each setting type you find and test it:

- [ ] **Text input**: Type text. Preview updates.
- [ ] **Textarea**: Type multi-line text. Preview updates.
- [ ] **Number input**: Enter a number. Try negative. Try letters (should reject).
- [ ] **Color picker**: Click to open picker. Choose a color. Try typing a hex value. Preview updates.
- [ ] **Checkbox**: Toggle on/off. Preview updates.
- [ ] **Select dropdown**: Choose different options. Preview updates.
- [ ] **Range slider**: Drag the slider. Preview updates.
- [ ] **Font picker**: Select different fonts. Preview updates. Check that font loads.
- [ ] **Image input**: Browse and select an image. Preview shows it.
- [ ] **Code editor**: Type CSS or HTML. Preview updates.
- [ ] **Link input**: Set internal page and external URL. Test both.
- [ ] **Menu selector**: Pick a menu. Preview shows menu items.
- [ ] **Rich text editor**: Type formatted text with bold, links, lists. Preview renders it.
- [ ] **Icon picker**: Select an icon (if available). Preview shows it.
- [ ] **YouTube input**: Paste a YouTube URL. Preview shows embed.

### 7.3 Theme Settings Persist

1. Change a theme color (e.g., background color).
2. Save the page.
3. Navigate to a DIFFERENT page in the editor.
4. **Expected**: Same theme color applies (theme settings are global).
5. Close the editor. Reopen. **Expected**: Setting still there.

### 7.4 Edge Cases to Try

- [ ] Enter `<script>alert(1)</script>` in a theme **text input** setting. Save. Preview should escape it — no alert box. Exported HTML should have it escaped in the output.
- [ ] Enter `<script>alert(1)</script>` in a theme **textarea** setting. Save. Same behavior — escaped in preview, no execution.
- [ ] Enter `<script>alert(1)</script>` in a theme **color picker** (typed as hex value). Should be rejected or ignored — not a valid color.
- [ ] Paste `<script>alert(1)</script>` into a theme **rich text editor** setting. DOMPurify should strip the script tags. Only safe formatting tags remain.
- [ ] Enter `<script>alert(1)</script>` in a theme **code editor** (CSS/HTML) setting. Code fields allow raw code — verify it renders correctly without breaking the page layout (CSS context) or that it's properly sandboxed.
- [ ] Enter `<script>alert(1)</script>` as a **YouTube URL** in a YouTube input. Should not execute — should be rejected or show an error/empty embed.
- [ ] Enter `<script>alert(1)</script>` in a theme **link URL** field. Should be rejected or sanitized.

---

## SECTION 8: EXPORT & PUBLISH

### 8.1 Create a Basic Export

1. Click **Export** in the sidebar (or find the export section).
2. Click **"Create Export"** (or "Export Site").
3. **Expected**: Export starts. Loading indicator. Success toast when done.
4. Export history should show a new entry (v1).

### 8.2 View the Exported Site

1. In the export history, click **"View"** on the latest export.
2. **Expected**: Opens the exported site in a new tab. Should show your homepage with all widgets rendered.
3. Click through internal links. Each page should work.
4. Check that images load correctly.
5. Check that CSS/styles are applied (fonts, colors, layout).

### 8.3 Download Export as ZIP

1. Click **"Download"** on an export version.
2. **Expected**: ZIP file downloads.
3. Extract the ZIP. Check contents:
   - HTML files for each page (e.g., `index.html`, `about.html`)
   - `assets/` folder with CSS, JS, images, videos, audios
   - `manifest.json` with export metadata
   - `sitemap.xml` (only if project has a site URL set)
   - `robots.txt` (only if project has a site URL set)

### 8.4 Export with Markdown

1. Create another export with the **"Also export as Markdown"** checkbox checked (if available).
2. Download the ZIP.
3. **Expected**: `.md` files alongside `.html` files. Each markdown file should have YAML frontmatter with title and description.

### 8.5 Multiple Export Versions

1. Make a change to a page (edit text, add widget).
2. Export again.
3. **Expected**: New version (v2) appears in history. v1 still there.
4. Both should be viewable and downloadable independently.

### 8.6 Delete an Export

1. Click **"Delete"** on an old export version.
2. **Expected**: Confirmation dialog. Confirm. Version removed from history.

### 8.7 Export Version Limit

1. Check App Settings → Export for the "Max versions to keep" setting. Note the number.
2. Create exports until you exceed the limit.
3. **Expected**: Oldest versions automatically cleaned up. Only the most recent N versions remain.

### 8.8 Export Verification Checklist

Open an exported site and check:

- [ ] Homepage loads as `index.html`
- [ ] All page links work
- [ ] Images display correctly (not broken)
- [ ] Videos play (if you have any)
- [ ] CSS styles applied (correct fonts, colors, spacing)
- [ ] Responsive design works (resize the browser)
- [ ] Menu navigation works
- [ ] Custom code (head/footer scripts) present in source
- [ ] No 404 errors in browser console
- [ ] The "Made with Widgetizer" comment is in the HTML source (before doctype)

### 8.9 Edge Cases to Try

- [ ] Export a project with no pages. What happens?
- [ ] Export a project with no homepage (no "index" or "home" slug page). Does it warn you?
- [ ] Export a project with a page that has no widgets. Does it produce a valid HTML file?
- [ ] Create 50+ exports rapidly. Performance? Cleanup working?

---

## SECTION 9: APP SETTINGS

### 9.1 Open Settings

1. Click **Settings** in the sidebar.
2. **Expected**: Settings page with tabs (General, Media, Export, Developer — or similar sections).

### 9.2 General Settings

1. Change the **language** to a different option.
2. Save.
3. **Expected**: UI language changes throughout the app.
4. Change **date format**.
5. Save.
6. **Expected**: Dates displayed in the new format.

### 9.3 Media Settings

1. Change **Max Image File Size** (e.g., set to 1 MB).
2. Save.
3. Go to Media and try uploading an image larger than 1 MB.
4. **Expected**: Upload rejected with clear error about file size.
5. Set it back to something reasonable (e.g., 5 MB).

### 9.4 Image Processing Settings

1. Change **Image Quality** (e.g., set to 50).
2. Save.
3. Upload a new image.
4. **Expected**: Generated size variants should be smaller/lower quality.
5. Toggle image sizes on/off (e.g., disable "small" size).
6. Save.
7. Upload another image.
8. **Expected**: The disabled size is not generated.

### 9.5 Export Settings

1. Change **Max Versions to Keep** (e.g., set to 3).
2. Save.
3. Create 4 exports.
4. **Expected**: Only the 3 most recent remain. Oldest auto-deleted.

### 9.6 Import Size Setting

1. Note the **Max Import Size** setting.
2. Try importing a project ZIP larger than this limit.
3. **Expected**: Rejected with clear error about file size.

### 9.7 Developer Mode

1. Toggle **Developer Mode** on.
2. Save.
3. Export a site.
4. **Expected**: Export should include HTML validation (check for `__export__issues.html` in the output if there are validation issues).
5. Toggle it back off.

### 9.8 Navigation Guard

1. Change a setting but DON'T save.
2. Try to navigate away (click Pages in sidebar).
3. **Expected**: Warning dialog about unsaved changes.
4. Click Cancel/Stay. You should remain on Settings.
5. Save. Then navigate away. No warning.

### 9.9 Edge Cases to Try

- [ ] Set image quality to 0. What happens?
- [ ] Set image quality to 101. Does it validate?
- [ ] Set max file size to a negative number. Does it validate?
- [ ] Set max versions to keep to 0. Does it validate?
- [ ] Set all image sizes to disabled. Upload an image. Does thumb still get generated?
- [ ] Enter `<script>alert(1)</script>` in the **image quality** field (numeric input). Should be rejected — not a valid number.
- [ ] Enter `<script>alert(1)</script>` in the **max file size** field. Should be rejected — not a valid number.
- [ ] Enter `<script>alert(1)</script>` in the **max versions to keep** field. Should be rejected — not a valid number.
- [ ] Enter `<script>alert(1)</script>` in the **max import size** field. Should be rejected — not a valid number.

---

## SECTION 10: CROSS-FEATURE INTEGRATION TESTS

These tests verify that different features work together correctly.

### 10.1 Full Project Lifecycle

1. Create a new project with a theme and preset.
2. Create 5 pages with different names.
3. Open each page in the editor. Add 2-3 widgets to each. Save.
4. Upload 5-10 images to the media library.
5. Use some images in widget settings.
6. Create 2 menus. Build their structure with links to your pages.
7. In the header widget, select one of your menus.
8. Export the site.
9. View the export. Navigate all pages. Verify everything works.
10. Download the ZIP. Extract and open `index.html` in a browser.
11. **Expected**: Everything works — pages, images, menus, styles, links.

### 10.2 Project Clone Integrity

1. Create a project with pages, menus, media, and widgets configured.
2. Duplicate the project.
3. Open the duplicate. Check:
   - [ ] Pages list matches original
   - [ ] Page editor widgets and settings match
   - [ ] Menus match (with all items and nesting)
   - [ ] **Media library shows all files from the original** (not empty!)
   - [ ] Media links in widgets still work (images display correctly)
   - [ ] Menu links in header/footer still work
   - [ ] Internal page links in widgets still work
4. Edit something in the duplicate.
5. Go back to the original. **Expected**: Original unchanged.
6. Delete media from the duplicate. **Expected**: Original's media is NOT affected.

### 10.3 Page Rename Ripple Effect

1. Have a project with:
   - Pages that link to each other (via link settings in widgets)
   - Menus that link to pages
2. Rename a page's slug (e.g., "services" → "our-services").
3. Check:
   - [ ] Widget links to that page still work (resolved via UUID)
   - [ ] Menu items pointing to that page still work
   - [ ] Export the site — links in HTML should use the new slug
   - [ ] Media usage tracking updated (old slug removed, new slug added)

### 10.4 Page Delete Ripple Effect

1. Have widgets and menus that link to a specific page.
2. Delete that page.
3. Check:
   - [ ] Menu item still exists but link should be empty/broken
   - [ ] Widget link settings should be cleared
   - [ ] Media files that were ONLY used by that page should now show as "unused"
   - [ ] App doesn't crash anywhere

### 10.5 Theme Settings Across Pages

1. In the page editor, change a theme color.
2. Save.
3. Open every other page.
4. **Expected**: Same theme color on all pages.
5. Export the site. Check all pages in the export.
6. **Expected**: Consistent colors across all exported pages.

### 10.6 Import → Export Round-Trip

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

### 10.7 Concurrent Editing Stress Test

1. Open the page editor in Tab A.
2. Open the SAME page editor in Tab B (same page).
3. Make changes in Tab A. Save.
4. Make different changes in Tab B. Save.
5. Refresh both tabs.
6. **Expected**: Last save wins. No data corruption. No crashes.

### 10.8 Active Project Switch During Editing

1. Open the page editor for a page in Project A.
2. In another tab, switch the active project to Project B.
3. Go back to the editor tab.
4. Try to save.
5. **Expected**: Should either save correctly to the original project or warn you that the context changed. Should NOT save Project A's page data into Project B.

---

## SECTION 11: KEYBOARD SHORTCUTS

Test each keyboard shortcut:

- [ ] **Ctrl+S / Cmd+S** in editor — Saves immediately
- [ ] **Ctrl+Z / Cmd+Z** in editor — Undoes last change
- [ ] **Ctrl+Shift+Z / Cmd+Shift+Z** in editor — Redoes
- [ ] **Ctrl+Y** in editor — Also redoes
- [ ] **Escape** — Closes open drawers/modals

---

## SECTION 12: RESPONSIVE & BROWSER TESTING

### 12.1 Browser Compatibility

Test the entire app in:

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest, if on Mac)
- [ ] Edge (latest)

Note any visual differences or broken functionality.

### 12.2 Window Sizes

1. Resize the browser to very narrow (< 800px). Does the sidebar collapse?
2. Resize to very wide (4K). Does the layout stretch reasonably?
3. Test the page editor at different window sizes. Does it remain usable?

---

## SECTION 13: ERROR RECOVERY

### 13.1 Network Interruption

1. Open the page editor and make changes.
2. Disconnect from the network (airplane mode or disconnect Wi-Fi).
3. Try to save.
4. **Expected**: Error toast. Changes not lost (still in memory).
5. Reconnect. Try saving again.
6. **Expected**: Save succeeds.

### 13.2 Refresh During Editing

1. Make changes in the editor (don't save).
2. Refresh the browser (F5).
3. **Expected**: Browser warns you about unsaved changes. If you proceed, changes are lost.
4. After refresh, the page should load the last saved state.

### 13.3 Back Button

1. Navigate: Projects → Pages → Edit Page → Design.
2. Press the browser back button at each step.
3. **Expected**: Navigates back through each page cleanly. No blank screens or errors.

---

## SECTION 14: FINAL SMOKE TEST

Do this at the very end after all other testing:

1. Create a brand new project from scratch.
2. Create 3 pages: Home (index), About, Contact.
3. Upload 3 images.
4. Create a menu with all 3 pages.
5. Design the Home page: Add a hero with image, text section, and a features widget with 3 blocks.
6. Design the About page: Add text widgets.
7. Design the Contact page: Add whatever widgets are available.
8. Set the header menu to your navigation menu.
9. Add content to the footer.
10. Change theme colors and fonts.
11. Export the site.
12. Download and open the exported site in a browser.
13. Navigate every page. Click every link. Check every image.
14. **Expected**: A complete, working static website.

---

## Bug Report Template

When you find an issue, report it with:

```
SECTION: [e.g., 3.5 Edit Widget Settings]
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
