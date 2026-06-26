# Menu Management

This document covers the menu-management subsystem end to end: per-project menu JSON storage, the `pageUuid` / `collectionItemUuid` link-resolution lifecycle, the React menu-editor pages and components, the client API helper, and the Express routes/controller (CRUD + duplicate). The system lets a project define multiple menus, edit each menu's basic settings, and build its hierarchical item structure with drag-and-drop.

> **Refactor note.** Paths below are post-workspaces-refactor. Menu I/O on the CRUD path goes through the injected `StorageAdapter` over the request's `scope`; menu link-resolution at render time lives in the pure `@widgetizer/render-engine`; the disk-walking enrichment/cleanup helpers live in `@widgetizer/builder-server`. See [Packages & Adapter Architecture](core-packages.md) for the adapter/DI/`Scope`/`LIMIT_KEYS` model.

## 1. Data Structure & Storage

Each menu is stored as an individual JSON file under the active project's `menus/` directory. This isolates menu data and keeps it organized per-project.

- **Location**: `data/projects/<folderName>/menus/`
- **Filename**: the slugified menu name (e.g. `main-menu.json`). The slug is also the menu's stable `id`.

> **Adapter note.** All CRUD-path menu I/O routes through the `StorageAdapter` (`storage.list/read/write/delete/exists`) over the request's `scope` (`{ actor, projectId, folderName }`) — the controller never builds absolute paths from request input. `menuController` also depth/count-caps menu trees before any recursive walk: a hard `MAX_MENU_DEPTH = 32` and a `MAX_MENU_ITEMS` ceiling from the `LimitsAdapter` (over-cap → `422`; OSS = unbounded, hosted = finite). Both caps are defined in `packages/core/src/adapters.js`. See [Platform Security](core-security.md#11-cross-tenant-safety-multi-tenant-host-contract).

A typical menu JSON file (`main-menu.json`) has the following structure:

```json
{
  "id": "main-menu",
  "uuid": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "name": "Main Menu",
  "description": "The primary navigation menu for the site header.",
  "items": [
    {
      "id": "item_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "label": "Home",
      "link": "index.html",
      "pageUuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    },
    {
      "id": "item_b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "label": "About Us",
      "link": "about.html",
      "pageUuid": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "items": [
        {
          "id": "item_c3d4e5f6-a7b8-9012-cdef-123456789012",
          "label": "Our Team",
          "link": "team.html",
          "pageUuid": "c3d4e5f6-a7b8-9012-cdef-123456789012"
        }
      ]
    },
    {
      "id": "item_d4e5f6a7-b8c9-0123-defa-234567890123",
      "label": "Project Alpha",
      "link": "work/project-alpha.html",
      "collectionItemUuid": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "collectionType": "projects"
    },
    {
      "id": "item_e5f6a7b8-c9d0-1234-efab-345678901234",
      "label": "External Link",
      "link": "https://example.com"
    }
  ],
  "created": "2023-10-28T10:00:00.000Z",
  "updated": "2023-10-28T12:30:00.000Z"
}
```

**Top-level fields:**

- `id`: the slugified, URL-friendly identifier; also the filename stem. Stable across name edits — widgets reference a menu by `uuid` (preferred) or this slug.
- `uuid`: stable identity used by `menu`-type widget settings to reference this menu. Backfilled lazily for legacy menus that predate it (see below).
- `name` / `description`: HTML-stripped on every write.
- `items`: the menu item tree (see below).
- `created` / `updated`: ISO timestamps.

**Menu item fields:**

- `items`: nested array of child items. Nesting is capped at `MAX_MENU_DEPTH = 32` (a DoS guard, not a UI convention — the Arch nav template only renders a few levels).
- `id`: a unique per-item identifier. New items minted on the duplicate path use the form `item_<uuid>` (e.g. `item_9b1deb4d-...`); regenerated on duplicate to avoid collisions.
- `label`: display text shown in the navigation (required — empty labels are rejected with `400`).
- `link`: the URL or page filename (e.g. `about.html` for internal pages, `work/project-alpha.html` for a collection item page, or a full URL for external links). For internal targets this is a denormalized convenience value; the authoritative target is the stable UUID below.
- `pageUuid` (optional): for links to a regular page, the page's stable UUID, so the link survives renames.
- `collectionItemUuid` + `collectionType` (optional): for links to a collection item's detail page, the item's stable UUID plus its collection type. A first-class link target alongside `pageUuid`. Deep detail on collection item identity lives in [Collections](core-collections.md).

### Link Resolution & UUID Lifecycle

Internal links carry a stable UUID (`pageUuid` for pages, `collectionItemUuid` for collection items) so they follow renames and self-clean on deletes. The `link` string is recomputed from that UUID at render time.

1. **Project creation** — when a project is scaffolded from a theme, menu items linking to internal pages are enriched with `pageUuid` by matching the `link` slug against the page slug→UUID map (`enrichNewProjectReferences` in `packages/builder-server/src/utils/linkEnrichment.js`).
2. **User selection** — when an author picks an internal target in the menu editor, both the `link` and the stable UUID (`pageUuid` or `collectionItemUuid` + `collectionType`) are stored.
3. **Rendering / export** — the render engine resolves each item's stable UUID to the current page/item slug, so emitted links stay correct after renames (Section 5).
4. **Page deletion cleanup** — deleting a page clears every menu item referencing its `pageUuid` (the `link` is emptied and `pageUuid` removed) via `cleanupDeletedPageReferences`.
5. **Collection-item deletion cleanup** — deleting a collection item clears every menu item referencing its `collectionItemUuid` (the `link` is emptied and `collectionItemUuid` / `collectionType` removed) via `cleanupDeletedCollectionItemReferences`.
6. **Project cloning** — duplicating a project regenerates all page, menu, and collection-item UUIDs, then remaps every `pageUuid` / `collectionItemUuid` reference (in menu items, widget link settings, and collection-item settings) to the new values via `remapDuplicatedProjectUuids`.

All of the above enrichment/cleanup/remap helpers live in `packages/builder-server/src/utils/linkEnrichment.js`. They are OSS-internal, fs-based walks over the per-tenant project root (never request input). Preset seeding additionally remaps menu/link collection-item refs from preset-source UUIDs to freshly seeded ones (`remapCollectionItemMenuRefs` / `remapCollectionItemLinkRefs`).

## 2. Frontend Implementation

The frontend is split across React pages under `packages/editor-ui/src/pages/` and components under `packages/editor-ui/src/components/menus/`, separating listing, settings editing, and structure editing.

### Pages

- **`packages/editor-ui/src/pages/Menus.jsx`** — lists all menus for the active project at `/menus`. From here a user can add, edit settings, edit structure, duplicate, or delete a menu. Duplicate creates a complete copy with all nested items. Fully localized.
- **`packages/editor-ui/src/pages/MenusAdd.jsx`** — a page wrapping `MenuForm` to create a menu from a name and description; on success it navigates to the new menu's structure editor.
- **`packages/editor-ui/src/pages/MenusEdit.jsx`** — a page wrapping `MenuForm` to update an existing menu's name and description. Uses `useGuardedFormPage` for the unsaved-changes navigation guard.
- **`packages/editor-ui/src/pages/MenuStructure.jsx`** — the core editing experience. It renders the `MenuEditor` component for drag-and-drop add/edit/reorder/nest of menu items, and saves the whole tree via `updateMenu`. Also guarded by `useGuardedFormPage`. Fully localized.

### Components

- **`packages/editor-ui/src/components/menus/MenuForm.jsx`** — the shared name/description form used by both add and edit pages.
- **`packages/editor-ui/src/components/menus/MenuEditor/`** — the structure editor (`index.jsx` plus `SortableList.jsx`, `SortableItem.jsx`, `DragOverlay.jsx`, the `MenuCombobox.jsx` link-target picker, and `utils/` tree helpers). The combobox lets the author pick an internal page or collection item as the link target, which writes back the corresponding stable UUID.

### Route Context

Routes are registered in `packages/editor-ui/src/EditorShell.jsx`:

- `menus`, `menus/add`, `menus/edit/:id`, and `menus/:id/structure` live in the site-workspace shell.
- `RequireActiveProject` redirects to `/projects` if these routes are reached without an active project.
- The primary click target in the list opens `/menus/:id/structure`; settings edits (`/menus/edit/:id`) are a separate action.

### Client-Side API (`packages/editor-ui/src/queries/menuManager.js`)

This module wraps all menu API calls (via `editorFetchJson`):

- `getAllMenus()` — fetch all menus for the active project.
- `getMenu(id)` — fetch a single menu by ID.
- `createMenu(menuData)` — create a new menu file.
- `updateMenu(id, menuData)` — overwrite an entire menu object. Used for both settings saves and the full nested structure from `MenuStructure`.
- `duplicateMenu(id)` — create a copy with a new ID and copy-suffixed name.
- `deleteMenu(id)` — delete a menu file.

## 3. Backend Implementation

The backend is an Express 5 router plus a controller that performs scope-first storage operations through the injected `StorageAdapter`.

### API Routes (`packages/builder-server/src/routes/menus.js`)

The router applies `resolveActiveProject` (which populates `req.scope`) and a JSON body parser, then maps requests to the controller. `name` / `description` are HTML-stripped and length-validated by `express-validator` before the controller runs.

| Method   | Endpoint                   | Controller Function | Description                          |
| -------- | -------------------------- | ------------------- | ------------------------------------ |
| `GET`    | `/api/menus`               | `getAllMenus`       | Get all menus for the active project |
| `GET`    | `/api/menus/:id`           | `getMenu`           | Get a single menu by ID              |
| `POST`   | `/api/menus`               | `createMenu`        | Create a new menu                    |
| `PUT`    | `/api/menus/:id`           | `updateMenu`        | Update an existing menu              |
| `POST`   | `/api/menus/:id/duplicate` | `duplicateMenu`     | Create a copy of an existing menu    |
| `DELETE` | `/api/menus/:id`           | `deleteMenu`        | Delete a menu                        |

### Controller Logic (`packages/builder-server/src/controllers/menuController.js`)

The controller is adapter-agnostic and scope-first — every storage call takes `req.scope` and a project-relative path under `menus/`.

- **Storage operations**: `storage.list(scope, "menus")` to enumerate, `storage.read` / `storage.write` / `storage.delete` for individual files, and `storage.exists` for uniqueness checks. No `fs` and no absolute paths on this path.
- **ID generation**: a new menu's `id` is a unique, URL-friendly slug from its name (`generateUniqueSlug`, checking `storage.exists`); this slug is the filename. A `uuid` (`crypto.randomUUID()`) is minted at creation.
- **Defensive sanitization**: even though the route validator strips HTML, the controller re-strips `name` / `description` and rejects empty names with `400`.
- **Lazy uuid backfill**: `getAllMenus` adds a `uuid` to any legacy menu that lacks one and writes it back, so older projects converge to the current shape.

**CRUD behavior:**

- `createMenu` — writes a new file `{ id, uuid, name, description, items: [], created, updated }`.
- `getMenu` — reads one menu; `404` when the file is absent.
- `updateMenu` — overwrites the file in place; `id` / filename stay stable even if `name` changes, and the existing `uuid` is preserved (minted if missing). Reads the existing file first as the existence check (`404` if absent). Before persisting an `items` tree it runs `validateMenuTree` (see Section 4), then `sanitizeMenuItems` (strips HTML from labels/links) and rejects any item with an empty label (`400`).
- `duplicateMenu` — deep-clones the source menu with a fresh `uuid`, a copy-suffixed `name` (`{name} (Copy)`, `(Copy 2)`, … via `generateCopyName`), a new unique slug `id`, regenerated per-item IDs (`item_<uuid>` via `generateNewMenuItemIds`), and fresh timestamps. Returns `201`. It also runs `validateMenuTree` against the loaded tree first, to defend against duplicating a menu that was persisted oversized before the save-time guard existed.
- `deleteMenu` — `storage.delete(scope, "menus/<id>.json")`.

## 4. Tree Caps (MAX_MENU_DEPTH / MAX_MENU_ITEMS)

`updateMenu` and `duplicateMenu` bound the item tree before any recursive walk (sanitize, label-check, clone, render). The guard is `validateMenuTree`, which walks iteratively (explicit stack, so the measurement itself can't blow the call stack) and bails as soon as either ceiling is crossed:

- **Depth** — `MAX_MENU_DEPTH = 32` (hard, tier-independent).
- **Item count** — resolved from the `LimitsAdapter` (`LIMIT_KEYS.MAX_MENU_ITEMS`), defaulting to `MAX_MENU_ITEMS = 1000` when no adapter is wired. OSS is effectively unbounded; hosted is finite.

When a tree exceeds either ceiling, the controller responds `422` with a message indicating which cap was hit (`Menu nesting is too deep (maximum 32 levels).` or `Menu has too many items (maximum N).`). Both constants are defined in `packages/core/src/adapters.js`. This is the SA-20 DoS guard described in [Platform Security](core-security.md).

## 5. Render-Time Link Resolution

Menu link resolution at render time is pure and lives in `packages/render-engine/src/menuResolver.js`. It operates only on passed-in maps and string helpers from `@widgetizer/core` (it touches neither `fs` nor `scope`); the shell loads the menu maps (OSS via the storage adapter, hosted via cloud storage) and passes them in.

- `resolveMenuItemLinks(menuItems, pagesByUuid, outputPathPrefix, collectionItemsByUuid, depth)` recursively rewrites each item's emitted `link` (depth-aware, prefixed via `prefixInternalHref`) plus an un-prefixed `canonicalPath` for active-state matching. A `collectionItemUuid` resolves to the item's current `slugPrefix/slug.html`; a `pageUuid` resolves to the page's current `slug.html`; a missing target clears the link (and drops the dead ref in the resolved copy); a custom `link` is passed through `sanitizeHref`. Recursion stops at `MAX_MENU_DEPTH` so a hostile/legacy tree can't blow the stack.
- `resolveMenuPageLinks(menuData, …)` wraps the above over `menuData.items`.
- `resolveMenuSettings(settings, schemaSettings, deps)` is the single source of truth for resolving every `menu`-type widget/block setting into a full menu object the menu snippet can render. It looks the stored menu value up in `menuMaps.byUuid` / `menuMaps.bySlug` and resolves its items; a missing/empty value or unknown menu yields `{ items: [] }`. It is consumed by widget rendering (`renderEngine.js`) and collection-item rendering (`collectionService.js`).

> **fs-extra holdover.** `getMenuById(projectIdOrDir, menuId)` in `menuController.js` is the one render-path menu reader still using `fs-extra` / `path` directly against a project directory rather than the scope-first `StorageAdapter`. It reads a single menu (returning `{ items: [] }` for a missing file and lazily backfilling `uuid`). Migrating it onto the storage adapter is pending.

## Security Considerations

All endpoints are protected by input validation, HTML stripping, and the tree caps above. For the cross-tenant isolation contract, see [Platform Security](core-security.md).

---

**See also:**

- [Theming Guide](theming.md) — how menus render in theme templates via the `{% render 'menu' %}` snippet
- [Page Editor](core-page-editor.md) — how menus integrate with header/footer widgets
- [Collections](core-collections.md) — collection item identity and the `collectionItemUuid` link target
- [Packages & Adapter Architecture](core-packages.md) — adapters, DI, `Scope`, `LIMIT_KEYS`
