# Collections System (Custom Post Types)

> **Status**: Future Feature  
> **Priority**: TBD  
> **Complexity**: High

A comprehensive plan for implementing a Collections system in Widgetizer that allows users to create structured content types like Portfolios, Team Members, Testimonials, Blog Posts, etc.

## Overview

The Collections system enables:

- **Theme authors** to define collection types with custom fields (using existing setting types)
- **Users** to add/edit/delete collection items through a familiar CMS interface
- **Widgets** to display collection data dynamically
- **Export** to generate static HTML pages for individual collection items

---

## Implementation Phases

### Phase 1: Core Collection Definition, Storage, and CMS UI

- Collection schema definition in themes
- Per-project data storage
- Server-side API implementation
- Frontend navigation and listing/add/edit UI
- No individual item pages

### Phase 2: Individual Item Pages with Templates

- Collection templates in themes (`template.liquid`)
- Export generates individual HTML files for each item
- SEO support for collection items

### Phase 3: Widget Integrations and Liquid Filters

- `collection` Liquid filter for accessing collection data in widgets
- Sorting, filtering, and limiting options

---

## Architecture

### 1. Collection Definition Schema

Collections are defined in the **theme** (not project), similar to how widgets define their settings. This allows themes to ship with pre-defined collection types.

**Location**: `themes/{theme}/collections/{collection-name}/schema.json`

```
themes/arch/
├── collections/
│   ├── portfolio/
│   │   └── schema.json
│   ├── team/
│   │   └── schema.json
│   └── testimonials/
│       └── schema.json
├── widgets/
├── templates/
└── theme.json
```

**Example Schema** (`collections/portfolio/schema.json`):

```json
{
  "type": "portfolio",
  "displayName": "Portfolio",
  "displayNamePlural": "Portfolios",
  "icon": "Briefcase",
  "description": "Showcase your work and projects",
  "slugPrefix": "portfolio",
  "settings": [
    {
      "type": "header",
      "id": "content_header",
      "label": "Content"
    },
    {
      "type": "text",
      "id": "title",
      "label": "Project Title",
      "required": true
    },
    {
      "type": "textarea",
      "id": "description",
      "label": "Description"
    },
    {
      "type": "image",
      "id": "featured_image",
      "label": "Featured Image"
    },
    {
      "type": "image",
      "id": "gallery",
      "label": "Gallery Images",
      "multiple": true
    },
    {
      "type": "text",
      "id": "client",
      "label": "Client Name"
    },
    {
      "type": "text",
      "id": "year",
      "label": "Year"
    },
    {
      "type": "link",
      "id": "external_url",
      "label": "External Link",
      "hide_text": true
    },
    {
      "type": "header",
      "id": "seo_header",
      "label": "SEO"
    },
    {
      "type": "text",
      "id": "seo_title",
      "label": "SEO Title"
    },
    {
      "type": "textarea",
      "id": "seo_description",
      "label": "SEO Description"
    }
  ]
}
```

---

### 2. Collection Data Storage

Collection items are stored **per-project** (like pages and menus).

**Location**: `data/users/{userId}/projects/{project}/collections/{collection-type}/{item-slug}.json`

```
data/users/local/projects/my-site/
├── pages/
├── menus/
├── collections/
│   ├── portfolio/
│   │   ├── project-alpha.json
│   │   ├── website-redesign.json
│   │   └── mobile-app.json
│   └── team/
│       ├── john-doe.json
│       └── jane-smith.json
└── theme.json
```

**Example Item Data** (`collections/portfolio/project-alpha.json`):

```json
{
  "id": "project-alpha",
  "slug": "project-alpha",
  "created": "2026-01-22T10:00:00Z",
  "updated": "2026-01-22T14:30:00Z",
  "settings": {
    "title": "Project Alpha",
    "description": "A revolutionary app design...",
    "featured_image": "/uploads/images/alpha-hero.jpg",
    "gallery": ["/uploads/images/alpha-1.jpg", "/uploads/images/alpha-2.jpg"],
    "client": "Acme Corp",
    "year": "2025",
    "external_url": {
      "href": "https://example.com/alpha",
      "target": "_blank"
    },
    "seo_title": "Project Alpha | My Portfolio",
    "seo_description": "Case study of Project Alpha..."
  }
}
```

---

### 3. Server-Side Implementation

#### New Config Paths

**File**: `server/config.js`

```javascript
// Collection paths (NEW)
export const getProjectCollectionsDir = (projectId, userId) =>
  path.join(getProjectDir(projectId, userId), "collections");
export const getCollectionDir = (projectId, collectionType, userId) =>
  path.join(getProjectCollectionsDir(projectId, userId), collectionType);
export const getCollectionItemPath = (projectId, collectionType, itemSlug, userId) =>
  path.join(getCollectionDir(projectId, collectionType, userId), `${itemSlug}.json`);

// Theme collection schema paths
export const getThemeCollectionsDir = (themeId, userId = "local") =>
  path.join(getThemeDir(themeId, userId), "collections");
export const getCollectionSchemaPath = (themeId, collectionType, userId = "local") =>
  path.join(getThemeCollectionsDir(themeId, userId), collectionType, "schema.json");
```

---

#### New Controller: `collectionController.js`

| Function                         | Description                                  |
| -------------------------------- | -------------------------------------------- |
| `getCollectionSchemas(req, res)` | Get all collection schemas from active theme |
| `getAllItems(req, res)`          | Get all items for a collection type          |
| `getItem(req, res)`              | Get single collection item by slug           |
| `createItem(req, res)`           | Create new collection item                   |
| `updateItem(req, res)`           | Update collection item                       |
| `deleteItem(req, res)`           | Delete collection item                       |
| `bulkDeleteItems(req, res)`      | Bulk delete collection items                 |
| `duplicateItem(req, res)`        | Duplicate a collection item                  |

---

#### New Routes: `server/routes/collections.js`

```javascript
import express from "express";
import { body } from "express-validator";
import * as collectionController from "../controllers/collectionController.js";

const router = express.Router();

// Schema endpoints
router.get("/schemas/:projectId", collectionController.getCollectionSchemas);
router.get("/schema/:projectId/:collectionType", collectionController.getCollectionSchema);

// Item CRUD endpoints
router.get("/:projectId/:collectionType", collectionController.getAllItems);
router.get("/:projectId/:collectionType/:itemSlug", collectionController.getItem);
router.post("/:projectId/:collectionType", collectionController.createItem);
router.put("/:projectId/:collectionType/:itemSlug", collectionController.updateItem);
router.delete("/:projectId/:collectionType/:itemSlug", collectionController.deleteItem);
router.post("/:projectId/:collectionType/bulk-delete", collectionController.bulkDeleteItems);
router.post("/:projectId/:collectionType/:itemSlug/duplicate", collectionController.duplicateItem);

export default router;
```

---

### 4. Frontend Implementation

#### Navigation Updates

The sidebar needs to dynamically show collection types defined in the active theme.

**File**: `src/config/navigation.js`

Add a `dynamicSection` concept where the "Site" section can include collection links loaded from the API.

**File**: `src/components/layout/Sidebar.jsx`

Update to fetch collection schemas and render nav items dynamically:

```jsx
// Pseudo-code structure
const collectionsNav = collections.map((col) => ({
  id: `collection-${col.type}`,
  labelKey: col.displayNamePlural, // "Portfolios", "Team Members"
  path: `/collections/${col.type}`,
  icon: lucideIcons[col.icon] || Database, // Dynamic icon from schema
  requiresProject: true,
}));
```

---

#### New Routes

**File**: `src/App.jsx`

```jsx
// Add to router children (under RequireActiveProject)
{
  path: "collections/:collectionType",
  element: <CollectionItems />,
},
{
  path: "collections/:collectionType/add",
  element: <CollectionItemAdd />,
},
{
  path: "collections/:collectionType/:itemSlug/edit",
  element: <CollectionItemEdit />,
},
```

---

#### New Pages

| Page                     | Description                                                  |
| ------------------------ | ------------------------------------------------------------ |
| `CollectionItems.jsx`    | Lists all items in a collection (table like Pages.jsx)       |
| `CollectionItemAdd.jsx`  | Form to add new item (renders settings like widget settings) |
| `CollectionItemEdit.jsx` | Form to edit existing item                                   |

These pages will reuse existing components:

- `SettingRenderer` for rendering form fields
- `Table` for listing
- `ConfirmationModal` for delete confirmations
- `PageLayout` for consistent structure

---

#### New Hooks & Queries

| File                               | Purpose                           |
| ---------------------------------- | --------------------------------- |
| `src/queries/collectionManager.js` | API calls for collection CRUD     |
| `src/hooks/useCollections.js`      | React hook for collection schemas |
| `src/hooks/useCollectionItems.js`  | React hook for collection items   |

---

### 5. Liquid Integration (Phase 3)

Enable widgets to access collection data.

#### New Liquid Filter

```liquid
{% assign portfolio_items = 'portfolio' | collection %}
{% for item in portfolio_items %}
  <div class="portfolio-card">
    <h3>{{ item.title }}</h3>
    {% image src: item.featured_image, size: 'medium' %}
  </div>
{% endfor %}

{% comment %} Or with limit/sort {% endcomment %}
{% assign recent_work = 'portfolio' | collection: limit: 6, sort: 'created_desc' %}
```

#### New Liquid Tag

```liquid
{% collection 'portfolio' as items %}
  {% for item in items %}
    ...
  {% endfor %}
{% endcollection %}
```

---

### 6. Individual Item Pages (Phase 2)

If we want each collection item to have its own page (e.g., `/portfolio/project-alpha.html`):

#### Collection Templates

**Location**: `themes/{theme}/collections/{type}/template.liquid`

```liquid
{%- comment -%}
  Template for individual portfolio item pages
  Available: {{ item.settings.* }}
{%- endcomment -%}

<article class="portfolio-single">
  <h1>{{ item.settings.title }}</h1>
  {% image src: item.settings.featured_image, size: 'large' %}
  <div class="content">
    {{ item.settings.description }}
  </div>

  {% if item.settings.gallery.size > 0 %}
    <div class="gallery">
      {% for img in item.settings.gallery %}
        {% image src: img, size: 'medium' %}
      {% endfor %}
    </div>
  {% endif %}
</article>
```

#### Export Changes

Update `exportController.js` to:

1. Loop through each collection type
2. For each item, render `template.liquid` with item data
3. Output to `{slugPrefix}/{item-slug}.html`

---

### 7. Export Considerations

```
output/
├── index.html
├── about.html
├── portfolio/
│   ├── project-alpha.html
│   ├── website-redesign.html
│   └── mobile-app.html
├── team/
│   ├── john-doe.html
│   └── jane-smith.html
└── assets/
```

---

## File Changes Summary

### New Files

| Path                                            | Description                   |
| ----------------------------------------------- | ----------------------------- |
| `server/controllers/collectionController.js`    | Collection CRUD operations    |
| `server/routes/collections.js`                  | API routes for collections    |
| `src/pages/CollectionItems.jsx`                 | Collection items listing page |
| `src/pages/CollectionItemAdd.jsx`               | Add new collection item       |
| `src/pages/CollectionItemEdit.jsx`              | Edit collection item          |
| `src/queries/collectionManager.js`              | API client functions          |
| `src/hooks/useCollections.js`                   | Hook for collection schemas   |
| `src/hooks/useCollectionItems.js`               | Hook for collection items     |
| `themes/arch/collections/portfolio/schema.json` | Example portfolio collection  |
| `themes/arch/collections/team/schema.json`      | Example team collection       |

### Modified Files

| Path                                     | Changes                                |
| ---------------------------------------- | -------------------------------------- |
| `server/config.js`                       | Add collection path helpers            |
| `server/index.js`                        | Register collections routes            |
| `src/App.jsx`                            | Add collection routes                  |
| `src/components/layout/Sidebar.jsx`      | Dynamic collection nav items           |
| `src/locales/en/translation.json`        | Add collection translation keys        |
| `server/controllers/exportController.js` | Export collection item pages (Phase 2) |
| `server/services/renderingService.js`    | Add collection Liquid filter (Phase 3) |

---

## Open Questions

1. **Should collections be defined in themes or projects?**
   - Theme = consistent across projects using same theme (recommended)
   - Project = each project can define custom collections

2. **Should individual item pages be required or optional?**
   - Some collections (portfolio) benefit from individual pages
   - Others (testimonials) might only be used in widgets

3. **Media tracking for collection items?**
   - Should collection images be tracked in SQLite media usage like page images?
   - Required for optimized export

4. **Phase priority?**
   - Start with Phase 1 only, or implement all phases together?

---

## See Also

- [Theming Guide](theming.md) - Theme structure and settings
- [Widget Authoring Guide](theming-widgets.md) - Widget development patterns
- [Setting Types Reference](theming-setting-types.md) - Available setting types for collection schemas
- [Export Documentation](core-export.md) - Export process details
