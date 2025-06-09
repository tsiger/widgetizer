# Menu Management

This document provides a comprehensive overview of the menu management system, from data storage to the frontend and backend implementations. The system allows for creating multiple menus, managing their basic settings, and editing their hierarchical structure.

## 1. Data Structure & Storage

Each menu is stored as an individual JSON file within the active project's directory. This isolates menu data and keeps it organized per-project.

- **Location**: `/data/projects/<projectId>/menus/`
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
      "type": "page",
      "value": "home"
    },
    {
      "id": "2",
      "label": "About Us",
      "type": "page",
      "value": "about",
      "items": [
        {
          "id": "3",
          "label": "Our Team",
          "type": "page",
          "value": "team"
        }
      ]
    },
    {
      "id": "4",
      "label": "External Link",
      "type": "url",
      "value": "https://example.com"
    }
  ],
  "created": "2023-10-28T10:00:00.000Z",
  "updated": "2023-10-28T12:30:00.000Z"
}
```

- `items`: An array of menu item objects. Each item can contain a nested `items` array, allowing for up to 3 levels of hierarchy.

## 2. Frontend Implementation

The frontend for menu management is split across several React components, providing a clear separation between listing, editing settings, and managing the menu structure.

### Key Components

- `src/pages/Menus.jsx`: Displays a list of all created menus for the active project. From here, a user can navigate to add, edit, or delete a menu.
- `src/pages/MenusAdd.jsx`: A page containing a form (`MenuForm.jsx`) to create a new menu by providing a name and description.
- `src/pages/MenusEdit.jsx`: A page containing a form (`MenuForm.jsx`) to update an existing menu's name and description.
- `src/pages/MenuStructure.jsx`: The core of the menu editing experience. It uses the `MenuEditor.jsx` component to provide a drag-and-drop interface for adding, editing, reordering, and nesting menu items.

### Client-Side API (`src/utils/menuManager.js`)

This utility file handles all communication with the backend API endpoints for menus.

- `getAllMenus()`: Fetches all menus for the active project.
- `getMenu(id)`: Fetches a single menu by its ID.
- `createMenu(menuData)`: Creates a new menu file.
- `updateMenu(id, menuData)`: Updates an entire menu object. This is used for both saving settings and the complex nested structure from the `MenuStructure` page.
- `deleteMenu(id)`: Deletes a menu file.

## 3. Backend Implementation

The backend consists of an Express router and a controller that performs the file system operations.

### API Routes (`server/routes/menus.js`)

This router maps HTTP requests to the appropriate controller functions.

| Method   | Endpoint         | Controller Function | Description                          |
| -------- | ---------------- | ------------------- | ------------------------------------ |
| `GET`    | `/api/menus`     | `getAllMenus`       | Get all menus for the active project |
| `GET`    | `/api/menus/:id` | `getMenu`           | Get a single menu by ID              |
| `POST`   | `/api/menus`     | `createMenu`        | Create a new menu                    |
| `PUT`    | `/api/menus/:id` | `updateMenu`        | Update an existing menu              |
| `DELETE` | `/api/menus/:id` | `deleteMenu`        | Delete a menu                        |

### Controller Logic (`server/controllers/menuController.js`)

The controller handles the logic for interacting with the menu JSON files on the server's filesystem.

- **File Operations**: Uses `fs-extra` to read the list of files in the `menus` directory, read individual menu files, write new ones, and delete them.
- **ID Generation**: When a new menu is created, a unique, URL-friendly ID is generated from its name using `slugify`. This ID is used as the filename (e.g., "Header Menu" becomes `header-menu.json`).
- **CRUD Logic**:
  - `createMenu`: Creates a new JSON file with a basic menu structure.
  - `updateMenu`: Overwrites an existing menu file with the new data sent from the client. This is used to save both simple changes (like the name) and complex structural changes to the `items` array.
  - `deleteMenu`: Removes the corresponding menu file from the `menus` directory.
