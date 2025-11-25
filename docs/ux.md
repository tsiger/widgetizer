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

- **Current State:** A confirmation modal appears. Upon confirmation, the project is deleted and the list is refreshed.
- **Suggestion:**
  1.  Ensure the active project cannot be deleted (or handle it gracefully).
  2.  Continue using the confirmation modal.
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

- **Current State:** A confirmation modal appears. Upon confirmation, the page is deleted and the list is refreshed.
- **Suggestion:** Continue using the confirmation modal.
- **Feedback:** Show a success toast: `Success: Page "[Page Name]" has been deleted.`

---

## 3. Menu Management (`/menus`)

### **3.1. Create a New Menu**

- **Current State:** User creates a menu and is likely returned to the menu list.
- **Suggestion:** Similar to pages, the logical next step after creating a menu is to add items to it. Redirect the user directly to the menu structure editor for that new menu (`/menus/edit/[new_menu_id]`).
- **Feedback:** Show a success toast: `Success: Menu "[Menu Name]" has been created.`

### **3.2. Delete a Menu**

- **Current State:** A confirmation modal appears. Upon confirmation, the menu is deleted and the list is refreshed.
- **Suggestion:** Continue using the confirmation modal.
- **Feedback:** Show a success toast: `Success: Menu "[Menu Name]" has been deleted.`

---

## 4. Media Management (`/media`)

### **4.1. Upload Media**

- **Current State:** Files are uploaded.
- **Suggestion:** No redirection is needed. The newly uploaded files should appear in the media grid (ideally at the top or with a subtle "new" highlight).
- **Feedback:** Show a summary toast: `Success: 3 files uploaded successfully.`

### **4.2. Delete Media**

- **Current State:**
  1.  The system checks if the file is in use.
  2.  If in use, deletion is blocked or a warning is shown.
  3.  If not in use, a confirmation modal appears.
- **Suggestion:** Continue ensuring usage tracking is accurate and visible.
- **Feedback:** Upon successful deletion, show a toast: `Success: "[file-name.jpg]" has been deleted.`

---

## 5. Theme Management (`/themes`)

### **5.1. Activate a Theme**

- **Current State:** A theme is activated.
- **Suggestion:** No redirection needed. The UI should clearly update to show the newly activated theme (e.g., with a green border and an "Active" badge).
- **Feedback:** Show a toast: `Success: Theme "[Theme Name]" has been activated.`

### **5.2. Delete a Theme**

- **Current State:** A confirmation modal appears. Deleting the active theme is prevented/warned against.
- **Suggestion:** Continue using the confirmation modal.
- **Feedback:** Show a toast: `Success: Theme "[Theme Name]" has been deleted.`

---

## 6. Export Management (`/export`)

### **6.1. Create an Export**

- **Current State:**
  1.  User clicks "Create Export".
  2.  A new row appears in the history table with "Processing" status.
  3.  Toasts provide feedback on start and completion.
  4.  History table updates automatically.
- **Suggestion:** Ensure the "Processing" state persists if the user navigates away and back (if supported by backend polling/sockets).
- **Feedback:** Relies on toasts and UI state changes.
