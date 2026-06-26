# Page Management

This document outlines the complete workflow for creating, viewing, editing, and deleting pages within the application. The system spans React components in the `@widgetizer/editor-ui` package (frontend) and the Express controller/routes in `@widgetizer/builder-server` (backend), which persists page content through the request's storage adapter.

## 1. Data Structure & Storage

Unlike project metadata (which is stored in SQLite), each page is stored as an individual JSON file within its project's directory. This hybrid approach keeps page content modular while allowing fast metadata lookups and relationships for projects/media/exports/settings.

- **Location**: `data/projects/<folderName>/pages/` (resolved by the storage adapter from the project-relative path `pages/`).
- **Filename**: The filename is derived from the page's "slug" (e.g., `about-us.json`).

> **Adapter note.** After the workspaces refactor, page JSON I/O routes through the `StorageAdapter` over the request's `scope` rather than direct `fs` calls. The OSS adapter reads/writes the project-relative paths described here; a host swaps in cloud storage. `savePageContent` is also capped by `MAX_WIDGETS_PER_PAGE` from the limits adapter (over-cap → `422`; OSS = unbounded, hosted = finite). See [Packages & Adapter Architecture](core-packages.md) and [Platform Security](core-security.md#11-cross-tenant-safety-multi-tenant-host-contract).

A typical page JSON file (`about-us.json`) looks like this:

```json
{
  "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "About Us",
  "slug": "about-us",
  "created": "2023-10-27T10:00:00.000Z",
  "updated": "2023-10-27T12:30:00.000Z",
  "seo": {
    "title": "About Us",
    "description": "Learn more about our company and team",
    "og_title": "About Us - Company Name",
    "og_image": "uploads/images/about-social.jpg",
    "robots": "index,follow",
    "canonical_url": ""
  },
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

**Key Fields:**

- **`uuid`**: A stable, randomly-generated identifier (UUID v4) that never changes, even when the page is renamed or its slug changes. This identifier is used by [Link settings](theming-setting-types.md#link) and [menu items](core-menus.md) to reference pages resiliently. When a page is renamed, all links pointing to it via `uuid` automatically resolve to the new slug.
- **`slug`**: The URL-friendly identifier derived from the page name, also used as the filename. This can change when the page is renamed.

## 2. Frontend Implementation

The frontend logic for page management lives in `@widgetizer/editor-ui`, handled by three page components, a reusable form, a client API wrapper, and a selection hook.

### Key Components

- `packages/editor-ui/src/pages/Pages.jsx`: The main dashboard for viewing all pages associated with the currently active project. It lives at `/pages` inside the site workspace shell and is only reachable when an active project exists. It displays pages in a table and provides the primary UI for initiating actions like editing, deleting, duplicating, or opening a page in the visual editor. Fully localized with `react-i18next`.
- `packages/editor-ui/src/pages/PagesAdd.jsx`: Contains the form for creating a new page. Integrates `useGuardedFormPage` to prevent accidental navigation with unsaved changes.
- `packages/editor-ui/src/pages/PagesEdit.jsx`: Contains the form for modifying an existing page's details. Includes navigation guards and automatic redirection when page slugs change.
- `packages/editor-ui/src/components/pages/PageForm.jsx`: A reusable form component used by both `PagesAdd` and `PagesEdit` to capture page details:
  - **Main Fields**: `name` (Title), `slug` (Filename)
  - **SEO Settings** (collapsible section): Meta Description, Social Media Title, Social Media Image, Canonical URL, Search Engine Indexing (robots)
  - Built on **react-hook-form** for validation and state management
  - Fully **localized** using `react-i18next` for all labels, errors, and help text
  - Reports its `isDirty` state to the parent via `onDirtyChange` for navigation-guard integration
  - Automatic slug generation from page name

### Route Context

- `/pages`, `/pages/add`, `/pages/:id/edit`, and `/page-editor` are all part of the site workspace shell.
- `RequireActiveProject` (`packages/editor-ui/src/components/layout/RequireActiveProject.jsx`) redirects users to `/projects` if they try to access these routes without an active project.
- In the list view, clicking the page title opens `/page-editor?pageId=<slug>` (built via `editorPath`), while metadata editing uses `/pages/:id/edit`.

### Enhanced Form Features

The `PageForm.jsx` component includes several advanced features for comprehensive page management:

#### Social Media Integration

- **Visual Media Selection**: The social-image field is rendered by `ImageInput`, which wraps `MediaSelectorDrawer` for selecting social media images through a visual interface instead of text input
- **Image Preview**: Shows a thumbnail preview of the selected social media image with hover controls for changing or removing the image
- **SEO Optimization**: Selected social media images are automatically used in Open Graph and Twitter Card meta tags with proper absolute URLs

#### SEO & Meta Tags

- **Conditional Meta Tags**: The system generates different meta tag configurations based on whether a social media image is selected:
  - **With Image**: Uses `summary_large_image` Twitter card type and includes Open Graph image tags
  - **Without Image**: Uses basic `summary` Twitter card type without image tags
- **Absolute URL Generation**: Social media image URLs are automatically converted to absolute URLs using the project's configured site URL for proper social sharing
- **Fallback Handling**: Gracefully handles cases where no site URL is configured, preventing broken meta tags
- **Browser title composition**: The final HTML `<title>` uses `page.seo.title` when present, otherwise the page name. If the current project defines a `siteTitle`, the browser title becomes `{page title} - {siteTitle}`.

### Client-Side API (`packages/editor-ui/src/queries/pageManager.js`)

This file acts as the bridge between the React components and the backend API. It abstracts the `fetch` calls (through the shared `editorFetchJson` helper) into a set of clean, async functions.

- `getAllPages()`: Fetches all page JSON files for the active project.
- `getPage(id)`: Fetches the data for a single page by its slug (ID).
- `createPage(pageData)`: Sends a `POST` request to create a new page file.
- `updatePage(id, pageData)`: Sends a `PUT` request to update an existing page file. Handles slug changes by renaming the file on the backend.
- `deletePage(id)`: Sends a `DELETE` request to remove a page file.
- `duplicatePage(id)`: Sends a `POST` request to a special endpoint to create a copy of a page.
- `bulkDeletePages(pageIds)`: Sends a `POST` request to delete multiple pages at once.
- `savePageContent(pageId, pageData)`: Sends a `POST` request to persist widget/SEO content from the page editor; re-throws `PROJECT_MISMATCH` errors unwrapped so the editor can react to a stale active-project context.

### Bulk Operations (`usePageSelection`)

The page list supports multi-select bulk deletion via the `usePageSelection` hook (`packages/editor-ui/src/hooks/usePageSelection.js`), which exposes `selectedPages`, `togglePageSelection`, `selectAllPages`, `clearSelection`, and `isAllSelected`. See [Custom Hooks](core-hooks.md) for the full hook contract.

In `Pages.jsx`, each row carries a checkbox bound to the selection state, a header checkbox toggles select-all over the visible rows, selected rows are highlighted, and a bulk-delete action appears with the selected count. Deletion is confirmed through a confirmation modal, selection is cleared on success, and selection survives search/filter operations.

## 3. Backend Implementation

The backend persists page content through the request's storage adapter (`req.adapters.storage`) over the request `scope` (`{ actor, projectId, folderName }`), keeping it adapter-agnostic and tenant-safe. The `resolveActiveProject` middleware resolves `req.scope` and `req.adapters` before any handler runs.

> **Legacy `fs-extra` survivors.** Two exported helpers in the controller still read directly from disk via `fs-extra`: `listProjectPagesData(projectId)` and `readGlobalWidgetData(projectId, widgetType)`. These run in contexts without `req.adapters` — the OSS render/export path (`renderingService`, `exportController`, `previewController`). The request handlers (`getAllPages`, `getPage`, create/update/delete/duplicate/`savePageContent`) all go through the storage adapter and `scope`.

### API Routes (`packages/builder-server/src/routes/pages.js`)

This Express router maps the HTTP requests from `pageManager.js` to the appropriate controller functions. The router applies `resolveActiveProject` and per-route body parsers — `standardJsonParser` for metadata writes, `editorJsonParser` (10 MB limit) for the content save route — plus `express-validator` chains via `validateRequest`.

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

### Controller Logic (`packages/builder-server/src/controllers/pageController.js`)

This is the core of the backend logic. Every handler resolves `const { scope } = req;` and `const { storage } = req.adapters;`, then reads/writes project-relative paths like `pages/<slug>.json` through the adapter. Page writes are funneled through a shared `persistPageWithMediaTracking` helper that writes the JSON, deletes the previous file on a slug change, and syncs media usage; deletes go through `deletePageWithMediaTracking`.

- **Create (`createPage`)**:
  1. Resolves `scope`/`storage` from the request.
  2. Defensively strips HTML from SEO fields and rejects an empty `name` with `400`.
  3. Derives a slug: if the request supplies a slug it is fed through `generateUniqueSlug` (with a `page` fallback); otherwise the slug is generated from `name`. `generateUniqueSlug` (`utils/slugHelpers.js`) slugifies via `sanitizeSlug` and appends `-1`, `-2`, … until `storage.exists(scope, \`pages/${slug}.json\`)` is false.
  4. **UUID Handling**: A fresh UUID v4 is generated for the new page.
  5. Writes the page (with an empty `widgets: {}`, `created`/`updated` timestamps) and returns `201`.
- **Update (`updatePage`)**:
  1. Sanitizes SEO fields. If the submitted `slug` is empty, it falls back to generating a unique slug from `name`; otherwise the provided slug is run through `sanitizeSlug` (empty → `400`).
  2. **Explicit slug conflict**: when the user explicitly supplied a non-empty slug that differs from the old one and a file already exists at the new slug, the handler returns **`409`** (`"Slug already exists"`) rather than silently appending a counter. (The empty-slug fallback path is already unique because it came from `generateUniqueSlug`.)
  3. **UUID Handling**: Reads the old file to preserve the existing `uuid` and original `created` date; if the request omits `widgets`, the existing widgets are preserved.
  4. Writes the page under the final slug and, on a slug change, deletes the old file (via the shared persist helper).
- **Save content (`savePageContent`)**: Persists widgets/SEO from the visual editor. Validates that `slug`, `name`, and `widgets` are present (`400` otherwise), then enforces the **per-page widget cap**: it counts `max(widgetsOrder.length, Object.keys(widgets).length)` and compares it against `LIMIT_KEYS.MAX_WIDGETS_PER_PAGE` from the limits adapter (falling back to the `MAX_WIDGETS_PER_PAGE` constant in `@widgetizer/core/adapters`, currently `5000`). Over the cap → **`422`**. OSS limits are effectively unbounded (`Infinity`), so the cap only bites on a finite hosted limit. Existing timestamps and `uuid` are preserved.
- **Read (`getPage` / `getAllPages`)**: `getPage` reads `pages/<id>.json` (missing → `404`). `getAllPages` lists the `pages` directory through the adapter, filters to `.json` entries (the `global/` subdir is naturally skipped), and reads each one. The adapter list is used here instead of the disk-based `listProjectPagesData` so it resolves the same tenant-namespaced scope as every other handler.
- **Delete (`deletePage`)**: Reads the page first to capture its `uuid` (missing → `404`), deletes the file, removes it from media usage tracking, then runs **automatic reference cleanup**: `cleanupDeletedPageReferences` clears every menu item and widget link setting across the project that referenced the deleted page's `uuid` (link emptied, `pageUuid` removed) — covering page widgets, global widgets (header/footer), and all menus.
- **Bulk delete (`bulkDeletePages`)**: Iterates the `pageIds` array, accumulating `deleted`, `notFound`, and `errors` buckets, deleting each existing page (with media-usage sync) and collecting UUIDs for cleanup, then runs reference cleanup for all deleted UUIDs. Response status is result-driven:
  - all requested pages deleted, no misses/errors → **`200`** (`success: true`).
  - some deleted **and** some not-found/errored → **`207`** (partial success, `success: false`).
  - nothing deleted → **`400`** (`"Failed to delete any pages"`).
- **Duplicate (`duplicatePage`)**: Reads the source page, lists existing page names, and derives the copy name with `generateCopyName` (`utils/namingHelpers.js`) — `Page Name (Copy)`, then `Page Name (Copy 2)`, `(Copy 3)`, … as collisions accumulate. The **new slug is derived from that copy name** via `generateUniqueSlug` (e.g. `about-us` → `about-us-copy` for `"About Us (Copy)"`), **a new UUID is generated** so the duplicate is a distinct entity, and the new file is written and returned `201`. Media usage is tracked for the copy.

### Security Considerations

All endpoints run behind `resolveActiveProject` and `express-validator` input validation (name length/required checks, SEO HTML stripping, `pageIds` array presence), and are scope-first — no path is built from raw user input outside the storage adapter. For the cross-tenant write-guard, resolver authz, and `LIMIT_KEYS` contract, see the **[Platform Security](core-security.md)** documentation.

---

**See also:**

- [Page Editor](core-page-editor.md) - Visual editor for page content
- [Media Library](core-media.md) - Media usage tracking integration
- [Custom Hooks](core-hooks.md) - `usePageSelection` hook documentation
- [Packages & Adapter Architecture](core-packages.md) - Adapters, DI, `Scope`, and `LIMIT_KEYS`
