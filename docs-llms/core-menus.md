# Menu Management

This document provides a comprehensive overview of the menu management system, from data storage to the frontend and backend implementations. The system allows for creating multiple menus, managing their basic settings, and editing their hierarchical structure.

## 1. Data Structure & Storage

Each menu is stored as an individual JSON file within the active project's directory. This isolates menu data and keeps it organized per-project.

- **Location**: `/data/projects/<folderName>/menus/`
- **Filename**: The filename is a "slugified" version of the menu's name (e.g., `main-menu.json`).

A typical menu JSON file (`main-menu.json`) has the following structure:

```json
{
  "id": "main-menu",
  "name": "Main Menu",
  "description": "The primary navigation menu for the site header.",
  "items": [
    {
      "id": "1",
      "label": "Home",
      "link": "index.html",
      "pageUuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    },
    {
      "id": "2",
      "label": "About Us",
      "link": "about.html",
      "pageUuid": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "items": [
        {
          "id": "3",
          "label": "Our Team",
          "link": "team.html",
          "pageUuid": "c3d4e5f6-a7b8-9012-cdef-123456789012"
        }
      ]
    },
    {
      "id": "4",
      "label": "External Link",
      "link": "https://example.com"
    }
  ],
  "created": "2023-10-28T10:00:00.000Z",
  "updated": "2023-10-28T12:30:00.000Z"
}
```

**Menu Item Fields:**

- `items`: An array of menu item objects. Each item can contain a nested `items` array, allowing for up to 3 levels of hierarchy.
- `id`: A unique identifier for the menu item within the menu.
- `label`: The display text shown in the navigation.
- `link`: The URL or page filename (e.g., `about.html` for internal pages, or a full URL for external links).
- `pageUuid` (optional): For internal page links, stores the page's stable UUID. This ensures the link remains valid even if the page is renamed.

**Link Resolution & pageUuid Lifecycle:**

1. **Project Creation**: When a project is created from a theme, all menu items linking to internal pages are automatically enriched with `pageUuid` based on matching page slugs.

2. **User Selection**: When users select an internal page in the menu editor, both `link` and `pageUuid` are stored.

3. **Rendering/Export**: The rendering service resolves each item's `pageUuid` to the current page slug, ensuring links stay up-to-date even after page renames. If a referenced page was deleted, the link is cleared during rendering.

4. **Editor Display**: When editing a menu with items linking to deleted pages, those items display with empty link fields. The menu is not automatically saved—changes only persist when the user explicitly saves.

5. **Project Cloning**: When a project is cloned, all page UUIDs are regenerated, and all menu item `pageUuid` references are updated to point to the new UUIDs.

## 2. Frontend Implementation

The frontend for menu management is split across several React components, providing a clear separation between listing, editing settings, and managing the menu structure.

### Key Components

- **`src/pages/Menus.jsx`**: Displays a list of all created menus for the active project. From here, a user can navigate to add, edit, duplicate, or delete a menu. The duplicate feature creates a complete copy of the menu with all nested items. Fully localized.
- `src/pages/MenusAdd.jsx`: A page containing a form (`MenuForm.jsx`) to create a new menu by providing a name and description.
- **`src/pages/MenusEdit.jsx`**: A page containing a form (`MenuForm.jsx`) to update an existing menu's name and description. Integrates `useFormNavigationGuard`.
- **`src/pages/MenuStructure.jsx`**: The core of the menu editing experience. It uses the `MenuEditor.jsx` component to provide a drag-and-drop interface for adding, editing, reordering, and nesting menu items. Fully localized interface.

### Client-Side API (`src/utils/menuManager.js`)

This utility file handles all communication with the backend API endpoints for menus.

- `getAllMenus()`: Fetches all menus for the active project.
- `getMenu(id)`: Fetches a single menu by its ID.
- `createMenu(menuData)`: Creates a new menu file.
- `updateMenu(id, menuData)`: Updates an entire menu object. This is used for both saving settings and the complex nested structure from the `MenuStructure` page.
- `duplicateMenu(id)`: Creates a copy of an existing menu with a new unique ID and name.
- `deleteMenu(id)`: Deletes a menu file.

## 3. Backend Implementation

The backend consists of an Express router and a controller that performs the file system operations.

### API Routes (`server/routes/menus.js`)

This router maps HTTP requests to the appropriate controller functions.

| Method   | Endpoint                   | Controller Function | Description                          |
| -------- | -------------------------- | ------------------- | ------------------------------------ |
| `GET`    | `/api/menus`               | `getAllMenus`       | Get all menus for the active project |
| `GET`    | `/api/menus/:id`           | `getMenu`           | Get a single menu by ID              |
| `POST`   | `/api/menus`               | `createMenu`        | Create a new menu                    |
| `PUT`    | `/api/menus/:id`           | `updateMenu`        | Update an existing menu              |
| `POST`   | `/api/menus/:id/duplicate` | `duplicateMenu`     | Create a copy of an existing menu    |
| `DELETE` | `/api/menus/:id`           | `deleteMenu`        | Delete a menu                        |

### Controller Logic (`server/controllers/menuController.js`)

The controller handles the logic for interacting with the menu JSON files on the server's filesystem.

- **File Operations**: Uses `fs-extra` to read the list of files in the `menus` directory, read individual menu files, write new ones, and delete them.
- **ID Generation**: When a new menu is created, a unique, URL-friendly ID is generated from its name using `slugify`. This ID is used as the filename (e.g., "Header Menu" becomes `header-menu.json`).
- **CRUD Logic**:
  - `createMenu`: Creates a new JSON file with a basic menu structure.
  - `updateMenu`: Overwrites an existing menu file with the new data. If the menu name is changed, the system automatically renames the underlying JSON file to match the new slugified name, while ensuring no conflicts with existing menus.
  - `duplicateMenu`: Creates a complete copy of an existing menu with:
    - **New unique ID**: Generated using the existing `generateUniqueMenuId()` helper
    - **New name**: Follows the pattern "Copy of {original-name}"
    - **Deep cloning**: All menu data is completely duplicated
    - **Unique item IDs**: All nested menu items get new unique IDs to prevent conflicts
    - **Fresh timestamps**: New `created` and `updated` timestamps
  - `deleteMenu`: Removes the corresponding menu file from the `menus` directory.

## Security Considerations

All API endpoints described in this document are protected by the platform's core security layers, including input validation, rate limiting, and CORS policies. For a comprehensive overview of these protections, see the **[Platform Security](core-security.md)** documentation.

---

**See also:**

- [Theming Guide](theming.md) - How menus are rendered in theme templates using the `{% render 'menu' %}` snippet
- [Page Editor](core-page-editor.md) - How menus integrate with header/footer widgets
