# Page Management

This document outlines the complete workflow for creating, viewing, editing, and deleting pages within the application. The system is designed around a full-stack architecture, with React components on the frontend and a Node.js/Express backend that interacts directly with the filesystem.

## 1. Data Structure & Storage

Unlike projects, which are managed in a central `projects.json` file, each page is stored as an individual JSON file within its project's directory. This approach keeps page data modular and directly tied to its parent project.

- **Location**: `/data/projects/<projectId>/pages/`
- **Filename**: The filename is derived from the page's "slug" (e.g., `about-us.json`).

A typical page JSON file (`about-us.json`) looks like this:

```json
{
  "name": "About Us",
  "slug": "about-us",
  "title": "About Us | My Awesome Site",
  "created": "2023-10-27T10:00:00.000Z",
  "updated": "2023-10-27T12:30:00.000Z",
  "widgets": {
    "main": [
      {
        "id": "hero-123",
        "type": "Hero",
        "settings": {
          "title": "Welcome to Our Team"
        }
      }
    ]
  }
}
```

## 2. Frontend Implementation

The frontend logic for page management is handled by three main React components and a utility manager.

### Key Components

- `src/pages/Pages.jsx`: The main dashboard for viewing all pages associated with the currently active project. It displays pages in a table and provides the primary UI for initiating actions like editing, deleting, or duplicating a page. Fully localized with `react-i18next`.
- `src/pages/PagesAdd.jsx`: Contains the form for creating a new page. Integrates `useFormNavigationGuard` to prevent accidental navigation with unsaved changes.
- `src/pages/PagesEdit.jsx`: Contains the form for modifying an existing page's details. Includes navigation guards and automatic redirection when page slugs change.
- `src/components/pages/PageForm.jsx`: A reusable form component used by both `PagesAdd` and `PagesEdit` to capture page details like `Name`, `Slug`, and `Meta Title`.
  - Migrated to **react-hook-form** for improved validation and state management
  - Fully **localized** using `react-i18next` for all labels, errors, and help text
  - Exposes `isDirty` state to parent components for navigation guard integration
  - Automatic slug generation from page name

### Enhanced Form Features

The `PageForm.jsx` component includes several advanced features for comprehensive page management:

#### Social Media Integration

- **Visual Media Selection**: Integrates with `MediaSelectorDrawer` for selecting social media images through a visual interface instead of text input
- **Image Preview**: Shows a thumbnail preview of the selected social media image with hover controls for changing or removing the image
- **SEO Optimization**: Selected social media images are automatically used in Open Graph and Twitter Card meta tags with proper absolute URLs

#### SEO & Meta Tags

- **Conditional Meta Tags**: The system generates different meta tag configurations based on whether a social media image is selected:
  - **With Image**: Uses `summary_large_image` Twitter card type and includes Open Graph image tags
  - **Without Image**: Uses basic `summary` Twitter card type without image tags
- **Absolute URL Generation**: Social media image URLs are automatically converted to absolute URLs using the project's configured site URL for proper social sharing
- **Fallback Handling**: Gracefully handles cases where no site URL is configured, preventing broken meta tags

### Client-Side API (`src/utils/pageManager.js`)

This file acts as the bridge between the React components and the backend API. It abstracts away the `fetch` calls into a set of clean, async functions.

- `getAllPages()`: Fetches all page JSON files for the active project.
- `getPage(id)`: Fetches the data for a single page by its slug (ID).
- `createPage(pageData)`: Sends a `POST` request to create a new page file.
- `updatePage(id, pageData)`: Sends a `PUT` request to update an existing page file. Handles slug changes by renaming the file on the backend.
- `deletePage(id)`: Sends a `DELETE` request to remove a page file.
- `duplicatePage(id)`: Sends a `POST` request to a special endpoint to create a copy of a page.
- `bulkDeletePages(pageIds)`: Sends a `POST` request to delete multiple pages at once.

### Bulk Operations (`usePageSelection`)

The page management interface supports bulk operations through the `usePageSelection` hook (`src/hooks/usePageSelection.js`), which provides comprehensive multi-page selection functionality.

#### Page Selection State Management

The hook manages selection state for multiple pages:

- **`selectedPages`**: Array of currently selected page IDs
- **`togglePageSelection(pageId)`**: Adds or removes a page from the selection
- **`selectAllPages(pageIds)`**: Selects all pages from the provided array
- **`clearSelection()`**: Clears all selected pages
- **`isAllSelected(pages)`**: Checks if all visible pages are currently selected

#### Bulk Delete Operations

The page interface supports bulk deletion with comprehensive safety features:

1. **Multi-Selection**: Users can select multiple pages using checkboxes in the page list
2. **Select All**: Header checkbox allows selecting/deselecting all visible pages at once
3. **Visual Feedback**: Selected pages are highlighted with a pink background
4. **Bulk Delete Button**: Appears only when pages are selected, showing the count of selected items
5. **Confirmation Dialog**: Uses `useConfirmationModal` to confirm bulk deletion with count information
6. **Automatic Cleanup**: Clears selection after successful bulk deletion

#### Integration with Pages Interface

The `Pages.jsx` component integrates bulk operations seamlessly:

- **Selection UI**: Each row includes a checkbox that integrates with the selection state
- **Toolbar**: Shows bulk action buttons when items are selected
- **State Synchronization**: Selection state is preserved during search/filter operations
- **Error Handling**: Provides user feedback for both successful and failed bulk operations

## 3. Backend Implementation

The backend is responsible for all filesystem operations, ensuring that page data is correctly created, read, updated, and deleted.

### API Routes (`server/routes/pages.js`)

This Express router maps the HTTP requests from `pageManager.js` to the appropriate controller functions.

| Method   | Endpoint                   | Controller Function | Description                   |
| -------- | -------------------------- | ------------------- | ----------------------------- |
| `GET`    | `/api/pages`               | `getAllPages`       | Get all pages for a project   |
| `GET`    | `/api/pages/:id`           | `getPage`           | Get a single page by slug     |
| `POST`   | `/api/pages`               | `createPage`        | Create a new page             |
| `PUT`    | `/api/pages/:id`           | `updatePage`        | Update an existing page       |
| `DELETE` | `/api/pages/:id`           | `deletePage`        | Delete a page                 |
| `POST`   | `/api/pages/:id/duplicate` | `duplicatePage`     | Duplicate an existing page    |
| `POST`   | `/api/pages/:id/content`   | `savePageContent`   | Save content from page editor |
| `POST`   | `/api/pages/bulk-delete`   | `bulkDeletePages`   | Delete multiple pages at once |

### Controller Logic (`server/controllers/pageController.js`)

This is the core of the backend logic. The controller functions interact with the filesystem using the `fs-extra` library.

- **Create/Update Operations**: When creating or updating a page, the controller performs several key steps:
  1.  It identifies the active project.
  2.  It sanitizes the incoming page `name` to generate a URL-friendly `slug` (e.g., "My New Page" becomes "my-new-page").
  3.  It checks for slug uniqueness within the project's `pages` directory to prevent filename collisions. If a slug already exists, it appends a number (e.g., `my-new-page-1`).
  4.  It writes the complete page data to the corresponding `.json` file.
  5.  **Media Usage Tracking**: Updates media file usage tracking to reflect which images are used by this page.
- **Delete Operation**: The controller finds the correct file by its slug and deletes it from the filesystem. Also removes the page from all media usage tracking.
- **Duplicate Operation**: The controller reads the source page's data, generates a new unique slug (e.g., by appending `-copy`), updates the `name` and `slug` fields in the data, and writes it to a new file. Updates media usage tracking for the duplicated page.

### Security Considerations

All API endpoints described in this document are protected by the platform's core security layers, including input validation, rate limiting, and CORS policies. For a comprehensive overview of these protections, see the **[Platform Security](core-security.md)** documentation.

---

**See also:**

- [Page Editor](core-page-editor.md) - Visual editor for page content
- [Media Library](core-media.md) - Media usage tracking integration
- [Custom Hooks](core-hooks.md) - `usePageSelection` hook documentation
