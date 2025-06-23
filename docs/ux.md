# UX Audit & Recommendations

This document provides a user experience (UX) audit of the application's core workflows. The goal is to refine user interactions, ensuring they are intuitive, consistent, and provide clear feedback.

---

## Guiding Principles

1.  **Never Leave the User Guessing:** After any action (save, delete, etc.), the user should receive immediate and clear feedback (e.g., a "toast" notification).
2.  **Go with the Flow:** Redirect users to the logical next step in their workflow. For example, after creating an item, take them to where they can use it or see it.
3.  **Consistency is Key:** The pattern for creating, editing, and deleting different types of content (pages, menus, etc.) should be as similar as possible.
4.  **Prevent Destructive Actions:** Use confirmation modals for deletions, and disable actions that would break things (e.g., deleting an active theme or project).

---

## 1. Project Management (`/projects`)

### **1.1. Create a New Project**

- **Current State:** After creating a project, the user is likely returned to the list of all projects.
- **Suggestion:** This is a major workflow pivot. After creating a new project, it should automatically become the **active project**, and the user should be redirected to the main application dashboard (`/`). This immediately immerses them in their new project environment.
- **Feedback:** Show a success toast: `Success: Project "[Project Name]" has been created and set as active.`

### **1.2. Edit a Project**

- **Current State:** Likely returns the user to the project list.
- **Suggestion:** This is correct. After editing a project's details, the user should be redirected back to the projects list (`/projects`) to see their changes reflected.
- **Feedback:** Show a success toast: `Success: Project "[Project Name]" has been updated.`

### **1.3. Delete a Project**

- **Current State:** Deletes the project and refreshes the list.
- **Suggestion:**
  1.  Use a confirmation modal with a stern warning, as this is a highly destructive action.
  2.  If the user deletes the **active project**, the application must gracefully handle this by clearing the active project state in the store and redirecting to the project selection/creation page (`/projects`).
  3.  If they delete an _inactive_ project, refreshing the list is the correct behavior.
- **Feedback:** Show a success toast: `Success: Project "[Project Name]" has been deleted.`

---

## 2. Page Management (`/pages`)

_(Excluding the Page Editor itself)_

### **2.1. Create a New Page**

- **Current State:** The user fills out a form (name, slug, etc.) and is likely returned to the pages list after saving.
- **Suggestion:** This is the most important workflow to optimize. After creating a page, the user's immediate next step is to add content to it. Therefore, they should be redirected **directly into the Page Editor** for that newly created page (`/pages/editor?pageId=[new_page_id]`).
- **Feedback:** Show a success toast upon entering the editor: `Success: Page "[Page Name]" has been created.`

### **2.2. Edit Page Settings**

- **Current State:** User edits metadata (name, slug) from a form.
- **Suggestion:** After saving, redirecting back to the page list (`/pages`) is correct. It allows them to see the updated information in the context of other pages.
- **Feedback:** Show a success toast: `Success: Page "[Page Name]" has been updated.`

### **2.3. Delete a Page**

- **Current State:** A page is deleted from the list.
- **Suggestion:** Use a confirmation modal. After successful deletion, refresh the list. This is a standard and correct flow.
- **Feedback:** Show a success toast: `Success: Page "[Page Name]" has been deleted.`

---

## 3. Menu Management (`/menus`)

### **3.1. Create a New Menu**

- **Current State:** User creates a menu and is likely returned to the menu list.
- **Suggestion:** Similar to pages, the logical next step after creating a menu is to add items to it. Redirect the user directly to the menu structure editor for that new menu (`/menus/edit/[new_menu_id]`).
- **Feedback:** Show a success toast: `Success: Menu "[Menu Name]" has been created.`

### **3.2. Delete a Menu**

- **Current State:** Deletes from the list.
- **Suggestion:** Standard flow: use a confirmation modal, then refresh the list.
- **Feedback:** Show a success toast: `Success: Menu "[Menu Name]" has been deleted.`

---

## 4. Media Management (`/media`)

### **4.1. Upload Media**

- **Current State:** Files are uploaded.
- **Suggestion:** No redirection is needed. The newly uploaded files should appear in the media grid (ideally at the top or with a subtle "new" highlight).
- **Feedback:** Show a summary toast: `Success: 3 files uploaded successfully.`

### **4.2. Delete Media**

- **Current State:** A file is deleted.
- **Suggestion:**
  1.  **Deletion Protection is Critical:** The documentation mentions usage tracking. This should be exposed in the UI. If a file is in use, the "Delete" button should either be disabled with a tooltip (`This image is used on 3 pages.`) or clicking it should open a modal that says, "Cannot delete. This file is in use on the following pages: [List of pages]".
  2.  If the file is **not** in use, a standard confirmation modal should appear.
- **Feedback:** Upon successful deletion, show a toast: `Success: "[file-name.jpg]" has been deleted.`

---

## 5. Theme Management (`/themes`)

### **5.1. Activate a Theme**

- **Current State:** A theme is activated.
- **Suggestion:** No redirection needed. The UI should clearly update to show the newly activated theme (e.g., with a green border and an "Active" badge).
- **Feedback:** Show a toast: `Success: Theme "[Theme Name]" has been activated.`

### **5.2. Delete a Theme**

- **Current State:** A theme is deleted.
- **Suggestion:**
  1.  **Disable Deleting the Active Theme.** The "Delete" button for the currently active theme should be disabled to prevent breaking the site.
  2.  For other themes, use a standard confirmation modal.
- **Feedback:** Show a toast: `Success: Theme "[Theme Name]" has been deleted.`

---

## 6. Export Management (`/export`)

### **6.1. Create an Export**

- **Current State:** An export is initiated.
- **Suggestion:** This is an asynchronous process. No redirection is needed. The UX should be:
  1.  User clicks "Create Export".
  2.  A new row immediately appears in the history table with a "Processing..." or "In Progress" status.
  3.  A toast appears: `Info: Export started. You can leave this page.`
  4.  When the export is complete, the status in the table row updates to "Success", and the download/preview buttons become active.
  5.  A final toast appears: `Success: Your site export is complete and ready to download.`
- **Feedback:** Relies on toasts and UI state changes, not redirection.
