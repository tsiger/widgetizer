# UX Audit & Current Implementation

This document provides a user experience (UX) audit of the application's core workflows, documenting what has been implemented and identifying areas for future improvement.

---

## Guiding Principles

1.  **Never Leave the User Guessing:** After any action (save, delete, etc.), the user should receive immediate and clear feedback (e.g., a "toast" notification).
2.  **Go with the Flow:** Redirect users to the logical next step in their workflow. For example, after creating an item, take them to where they can use it or see it.
3.  **Consistency is Key:** The pattern for creating, editing, and deleting different types of content (pages, menus, etc.) should be as similar as possible.
4.  **Prevent Destructive Actions:** Use confirmation modals for deletions, and block or warn on actions that would break things (e.g., deleting a theme that is in use returns 409 and shows an error toast).
5.  **Efficiency Through Shortcuts:** Provide standard keyboard shortcuts (Undo, Redo, Save) to speed up common workflows.
6.  **Intelligent Auto-Save:** Auto-save should be "invisible" and respectful of user activity, triggering only after a period of inactivity (debounce) rather than at fixed intervals.

---

## 1. Project Management (`/projects`)

### **1.1. Create a New Project**

- **Current State:**
  - After creating a project, the user is redirected to `/projects` (project list).
  - If this is the first project created, it is automatically set as the active project by the backend.
  - Success toast is shown: `Project "[Project Name]" has been created and set as active.` (if activated) or `Project "[Project Name]" has been created.` (if not activated).
  - Navigation guard prevents accidental navigation with unsaved changes.
  - **Deep-link creation (platform-injected):** When the platform wraps the editor, marketing site deep-links create projects via `POST /api/projects/deep-link`, which auto-suffixes duplicate names and always activates the new project. Users land directly on `/pages`. This flow is not part of the open-source editor's default behavior.
- **Status:** ✅ Implemented

### **1.2. Edit a Project**

- **Current State:**
  - After saving changes, the user remains on the edit page with a "Back to List" button shown.
  - Success toast is shown: `Project "[Project Name]" has been updated.` (or `...has been updated and renamed.` if folderName changed).
  - If the edited project is the active project, the active project state is refreshed.
  - Navigation guard prevents accidental navigation with unsaved changes.
- **Status:** ✅ Implemented correctly

### **1.3. Delete a Project**

- **Current State:**
  - The active project **cannot be deleted** - the delete button is disabled and shows a tooltip explaining why.
  - Attempting to delete the active project shows an error toast: `Cannot delete active project.`
  - For non-active projects, a confirmation modal appears before deletion.
  - Upon confirmation, the project is deleted, the list is refreshed, and a success toast is shown: `Project "[Project Name]" has been deleted.`
- **Status:** ✅ Fully implemented with proper safeguards

### **1.4. Set Active Project**

- **Current State:**
  - Users can set any project as active via a star icon button.
  - The active project is visually indicated with a pink "Active" badge and a filled star icon.
  - Success toast: `Project "[Project Name]" has been set as active.`
- **Status:** ✅ Implemented

### **1.5. Duplicate Project**

- **Current State:**
  - Users can duplicate a project via a copy icon button.
  - Success toast: `Project duplicated successfully.`
  - The list refreshes to show the new project.
- **Status:** ✅ Implemented

---

## 2. Page Management (`/pages`)

_(Excluding the Page Editor itself)_

### **2.1. Create a New Page**

- **Current State:**
  - After creating a page, the user is redirected to `/pages` (pages list).
  - Success toast: `Page "[Page Name]" has been created.`
  - Navigation guard prevents accidental navigation with unsaved changes.
- **Future Improvement:** Redirect directly to the Page Editor (`/page-editor?pageId=[new_page_id]`) since the immediate next step is adding content.

### **2.2. Edit Page Settings**

- **Current State:**
  - After saving, the user remains on the edit page with a "Back to List" button shown.
  - Success toast: `Page "[Page Name]" has been updated.` (or `...has been updated. URL changed.` if slug changed).
  - If the slug changes, the URL is updated automatically and navigation guard is bypassed.
  - Navigation guard prevents accidental navigation with unsaved changes.
- **Status:** ✅ Implemented correctly

### **2.3. Delete a Page**

- **Current State:**
  - A confirmation modal appears before deletion.
  - Supports both single and bulk deletion (with selection checkboxes).
  - Upon confirmation, the page(s) are deleted, the list is refreshed, and a success toast is shown: `Page deleted successfully.` (or `[count] pages deleted successfully.` for bulk).
  - Error toast shown if deletion fails.
- **Status:** ✅ Fully implemented with bulk delete support

### **2.4. Duplicate Page**

- **Current State:**
  - Users can duplicate a page via a copy icon button.
  - Success toast: `Page duplicated successfully.`
  - The list refreshes to show the new page.
- **Status:** ✅ Implemented

---

## 3. Menu Management (`/menus`)

### **3.1. Create a New Menu**

- **Current State:**
  - After creating a menu, the user is redirected to `/menus/[new_menu_id]/structure` (menu structure editor).
  - Success toast: `Menu "[Menu Name]" has been created.`
  - Navigation guard prevents accidental navigation with unsaved changes.
- **Status:** ✅ Implemented correctly - follows the "go with the flow" principle

### **3.2. Delete a Menu**

- **Current State:**
  - A confirmation modal appears before deletion.
  - Upon confirmation, the menu is deleted, the list is updated, and a success toast is shown: `Menu "[Menu Name]" has been deleted.`
  - Error toast shown if deletion fails.
- **Status:** ✅ Fully implemented

### **3.3. Duplicate Menu**

- **Current State:**
  - Users can duplicate a menu via a copy icon button.
  - Success toast: `Menu duplicated successfully.`
  - The new menu appears in the list.
- **Status:** ✅ Implemented

---

## 4. Media Management (`/media`)

### **4.1. Upload Media**

- **Current State:**
  - Files are uploaded via drag-and-drop or file picker.
  - Supports batch uploads (processed in chunks of 5 files).
  - Upload progress is shown for each file.
  - Success toast: `Successfully uploaded [count] file(s).` (or `Uploaded [count] file(s). [count] file(s) rejected.` for partial success).
  - Individual error toasts shown for rejected files (limited to first 5 to avoid spam).
  - Newly uploaded files appear in the media grid.
  - No redirection needed.
- **Status:** ✅ Fully implemented with comprehensive feedback

### **4.2. Delete Media**

- **Current State:**
  1.  The system checks if the file is in use (via `usedIn` tracking).
  2.  If in use, deletion is blocked with an error toast: `Cannot delete file - currently in use by pages.`
  3.  If not in use, a confirmation modal appears.
  4.  Supports both single and bulk deletion.
  5.  Upon successful deletion, a toast is shown: `File "[file-name]" deleted successfully.` (or `Successfully deleted [count] files` for bulk).
- **Status:** ✅ Fully implemented with usage tracking and bulk delete support

---

## 5. Theme Management (`/themes`)

### **5.1. Upload Theme**

- **Current State:**
  - Themes are uploaded via drag-and-drop or file picker (ZIP files only).
  - Upload progress is simulated and displayed.
  - Success toast: `Theme uploaded successfully!`
  - Error toast shown if upload fails or if multiple files are selected.
  - New theme appears in the theme grid.
- **Status:** ✅ Implemented

### **5.2. Activate a Theme**

- **Current State:**
  - Themes are selected during project creation (theme changes are not supported in project edit).
  - The active theme is visually indicated with a pink "Active" badge on the theme card.
  - No direct activation UI exists on the themes page itself.
- **Future Improvement:** Add an "Activate" button on theme cards to allow switching themes without editing the project. Show success toast: `Theme "[Theme Name]" has been activated.`

### **5.3. Delete a Theme**

- **Current State:**
  1. User opens the three-dot menu (⋮) on a theme card on the Themes page.
  2. User clicks "Delete".
  3. Browser confirmation dialog: "Are you sure you want to delete \"[Theme Name]\"? This action cannot be undone."
  4. On confirm, `DELETE /api/themes/:id` is called. Backend removes the theme directory.
  5. If the theme is used by one or more projects, server returns 409; UI shows error toast: "Cannot delete \"[Theme Name]\" - it is currently used by one or more projects".
  6. On success: success toast, theme list refreshes.
- **Status:** ✅ Fully implemented

### **5.4. Update a Theme**

- **Current State:**
  1. Sidebar displays a badge with count of themes having pending updates.
  2. User visits Themes page and sees "Update available: vX.Y.Z" on theme cards.
  3. User clicks "Update" button on the theme card.
  4. System builds the `latest/` snapshot by composing base + version folders.
  5. Success toast: `Theme "[Theme Name]" updated to version X.Y.Z.`
  6. Sidebar badge decrements automatically.
  7. If validation fails (missing `theme.json`, version mismatch), error toast with details is shown.
- **Status:** ✅ Fully implemented

### **5.5. Apply Theme Update to Project**

- **Current State:**
  1. After a theme is updated (5.4), projects using that theme show an update indicator (arrow icon) on the Projects page.
  2. User edits the project.
  3. User clicks "Apply Theme Update" action.
  4. System copies updated theme files to project, merges settings, adds new menus/templates.
  5. Success toast confirms update applied.
  6. Project's `themeVersion` is updated to match the theme's current version.
- **Status:** ✅ Fully implemented
- **Note:** Project update indicators only appear _after_ the theme author has updated the theme (built `latest/`), not merely when new version folders exist.

---

## 6. Export Management (`/export`)

### **6.1. Create an Export**

- **Current State:**
  1.  User clicks "Create Export".
  2.  A new row appears in the history table with "Processing" status.
  3.  Toasts provide feedback on start and completion.
  4.  History table updates automatically.
  5.  Export history persists and shows download links when complete.
- **Status:** ✅ Implemented with comprehensive feedback
- **Future Improvement:** Ensure the "Processing" state persists if the user navigates away and back (if supported by backend polling/sockets).

---

## Summary of Implementation Status

### ✅ Fully Implemented

- Project deletion (with active project protection)
- Project editing (with state refresh)
- Project duplication
- Page deletion (single and bulk)
- Page editing (with URL update handling)
- Page duplication
- Menu creation (redirects to structure editor)
- Menu deletion
- Menu duplication
- Media upload (with progress and error handling)
- Media deletion (with usage tracking, single and bulk)
- Export creation (with processing state)
- Theme upload (with validation and feedback)
- Theme updates (sidebar badge, per-theme update buttons, validation)
- Project theme updates (apply theme updates to projects)
- Theme deletion (three-dot menu, confirmation, 409 when theme in use)

### ⚠️ Partially Implemented / Needs Improvement

- **Project creation:** Redirects to list instead of dashboard when auto-activated
- **Page creation:** Redirects to list instead of page editor
- **Theme activation:** Only available via project edit, not directly from themes page

### 📝 Notes

- All implemented workflows include proper toast notifications for user feedback.
- Navigation guards prevent accidental data loss on forms.
- Confirmation modals protect against destructive actions.
- Bulk operations are supported for pages and media.
- Active project protection prevents breaking the application state.
- Theme update system includes sidebar badge for pending updates and detailed error feedback.
