# Server Refactoring Plan

This document outlines opportunities for refactoring the `server/` directory to eliminate code duplication, extract shared utilities, and improve maintainability.

## Overview

The server codebase has grown organically with significant duplication across controllers. This refactoring plan identifies ~500-600 lines of duplicated code that can be consolidated into shared utilities.

---

## Current Issues

### 1. Duplicate project metadata reader wrapper

Defined in both `projectController.js` and `pageController.js` as compatibility wrappers:

**pageController.js (lines 9-18):**

```javascript
async function readProjectsFile() {
  return readProjectsData(); // SQLite-backed repository
}
```

**projectController.js:** Similar wrapper exists and is exported.

**Fix:** Remove from `pageController.js` and import from `projectController.js` (as `menuController.js` already does).

---

### 2. "Get Active Project" Boilerplate (Most Severe)

This exact pattern appears **~15+ times** across controllers:

```javascript
const { projects, activeProjectId } = await readProjectsFile();
const activeProject = projects.find((p) => p.id === activeProjectId);

if (!activeProject) {
  return res.status(404).json({ error: "No active project found" });
}
const projectFolderName = activeProject.folderName;
```

**Appears in:**

- `pageController.js`: `getPage`, `updatePage`, `getAllPages`, `deletePage`, `bulkDeletePages`, `createPage`, `savePageContent`, `duplicatePage`
- `menuController.js`: `getAllMenus`, `createMenu`, `deleteMenu`, `getMenu`, `updateMenu`, `duplicateMenu`

---

### 3. Unique ID/Slug Generation (3 near-identical implementations)

| Controller             | Function                    | Lines |
| ---------------------- | --------------------------- | ----- |
| `projectController.js` | `generateUniqueProjectId()` | 59-81 |
| `pageController.js`    | `generateUniqueSlug()`      | 23-40 |
| `pageController.js`    | `ensureUniqueSlug()`        | 45-66 |
| `menuController.js`    | `generateUniqueMenuId()`    | 46-65 |

All follow the same pattern:

1. Slugify a name
2. Check if exists
3. Append counter until unique

---

### 4. "Copy of" Duplicate Naming Logic (3 implementations)

All three controllers implement the same "Copy of X" → "Copy 2 of X" naming:

| Location                                | Lines   |
| --------------------------------------- | ------- |
| `projectController.js` duplicateProject | 724-741 |
| `pageController.js` duplicatePage       | 667-697 |
| `menuController.js` duplicateMenu       | 343-344 |

---

### 5. Link Enrichment Utilities (Major Duplication)

Near-identical helper functions defined inline in both `createProject` and `duplicateProject`:

| Helper                | createProject | duplicateProject |
| --------------------- | ------------- | ---------------- |
| `isLinkObject()`      | 339-342       | 774-776          |
| Link enricher         | 344-359       | 779-783          |
| Widget link processor | 362-390       | 786-812          |
| Menu item processor   | 311-336       | 815-830          |

Both functions also share:

- Iterating pages to build a slug→UUID map
- Enriching widget links across all pages
- Handling global widgets (header/footer)
- Processing menu files

---

### 6. Validation Boilerplate

Every route handler starts with:

```javascript
const errors = validationResult(req);
if (!errors.isEmpty()) {
  return res.status(400).json({ errors: errors.array() });
}
```

**Appears:** 30+ times across all controllers

---

### 7. Media Type Detection (Repeated ~6 times)

In `mediaController.js`, this pattern repeats:

```javascript
if (file.mimetype.startsWith("video/")) {
  targetDir = getProjectVideosDir(projectFolderName);
} else if (file.mimetype.startsWith("audio/")) {
  targetDir = getProjectAudiosDir(projectFolderName);
} else {
  targetDir = getProjectImagesDir(projectFolderName);
}
```

**Appears:** Lines 289-295, 320-326, 438-449, 735-741, 939-945

---

### 8. Recursive Template Processing (2 implementations)

| Location                                         | Purpose |
| ------------------------------------------------ | ------- |
| `projectController.js` processTemplatesRecursive | 241-283 |
| `themeUpdateService.js` addNewTemplatesRecursive | 276-309 |

Both recursively process template directories, creating pages with timestamps and UUIDs.

---

### 9. Inconsistent Error Handling

- `mediaController.js` uses `handleProjectResolutionError()` consistently
- `pageController.js` doesn't use it at all
- `menuController.js` doesn't use it

The `projectErrors.js` utility exists but isn't used uniformly.

---

## Refactoring Plan

### Phase 1: Create Shared Utilities

#### 1.1 Create `utils/slugHelpers.js`

```javascript
import slugify from "slugify";

/**
 * Generate a unique slug by appending counters until no conflict exists.
 * @param {string} baseName - The name to slugify
 * @param {function} existsCheck - Async function that returns true if slug exists
 * @param {object} options - Options: maxAttempts, fallback
 * @returns {Promise<string>} Unique slug
 */
export async function generateUniqueSlug(baseName, existsCheck, options = {}) {
  const { maxAttempts = 1000, fallback = "item" } = options;
  let baseSlug = slugify(baseName, { lower: true, strict: true });
  if (!baseSlug) baseSlug = fallback;

  let uniqueSlug = baseSlug;
  let counter = 1;

  while (await existsCheck(uniqueSlug)) {
    uniqueSlug = `${baseSlug}-${counter}`;
    counter++;
    if (counter > maxAttempts) {
      throw new Error(`Unable to generate unique slug after ${maxAttempts} attempts`);
    }
  }
  return uniqueSlug;
}
```

#### 1.2 Create `utils/namingHelpers.js`

```javascript
/**
 * Escape special regex characters in a string.
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Generate a "Copy of X" or "Copy N of X" name for duplicates.
 * @param {string} originalName - The original item name
 * @param {string[]} existingNames - Array of existing names to check against
 * @returns {string} The new copy name
 */
export function generateCopyName(originalName, existingNames) {
  // Strip existing "Copy of" prefix to get base name
  let baseName = originalName.replace(/^Copy( \d+)? of /, "");
  const copyRegex = new RegExp(`^Copy( (\\d+))? of ${escapeRegex(baseName)}$`);

  let copyNumber = 0;
  existingNames.forEach((name) => {
    const match = name.match(copyRegex);
    if (match) {
      const num = match[2] ? parseInt(match[2]) : 1;
      copyNumber = Math.max(copyNumber, num);
    }
  });

  return copyNumber === 0 ? `Copy of ${baseName}` : `Copy ${copyNumber + 1} of ${baseName}`;
}
```

#### 1.3 Create `utils/linkEnrichment.js`

```javascript
import fs from "fs-extra";
import path from "path";
import { getProjectPagesDir, getProjectMenusDir } from "../config.js";

/**
 * Check if a value is a link object (has href property).
 */
export function isLinkObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) && "href" in value;
}

/**
 * Add pageUuid to a link value based on slug-to-UUID mapping.
 */
export function enrichLinkValue(linkValue, pageSlugToUuid) {
  if (!isLinkObject(linkValue)) return linkValue;

  const { href, pageUuid } = linkValue;

  // Skip if already has pageUuid or not an internal page link
  if (pageUuid) return linkValue;
  if (!href || !href.endsWith(".html") || href.includes("://") || href.startsWith("#")) {
    return linkValue;
  }

  const slug = href.replace(".html", "");
  const uuid = pageSlugToUuid.get(slug);

  return uuid ? { ...linkValue, pageUuid: uuid } : linkValue;
}

/**
 * Enrich all link settings in a widget with pageUuid.
 */
export function enrichWidgetLinks(widgetData, pageSlugToUuid) {
  const enriched = { ...widgetData };

  // Enrich widget-level settings
  if (enriched.settings) {
    enriched.settings = { ...enriched.settings };
    for (const [key, value] of Object.entries(enriched.settings)) {
      enriched.settings[key] = enrichLinkValue(value, pageSlugToUuid);
    }
  }

  // Enrich block-level settings
  if (enriched.blocks) {
    enriched.blocks = { ...enriched.blocks };
    for (const [blockId, block] of Object.entries(enriched.blocks)) {
      if (block && block.settings) {
        enriched.blocks[blockId] = {
          ...block,
          settings: { ...block.settings },
        };
        for (const [key, value] of Object.entries(block.settings)) {
          enriched.blocks[blockId].settings[key] = enrichLinkValue(value, pageSlugToUuid);
        }
      }
    }
  }

  return enriched;
}

/**
 * Recursively add pageUuid to menu items that link to internal pages.
 */
export function enrichMenuItems(items, pageSlugToUuid) {
  if (!Array.isArray(items)) return items;

  return items.map((item) => {
    const updatedItem = { ...item };

    // Check if this is an internal page link
    if (item.link && typeof item.link === "string") {
      const link = item.link;
      if (link.endsWith(".html") && !link.includes("://") && !link.startsWith("#")) {
        const slug = link.replace(".html", "");
        const uuid = pageSlugToUuid.get(slug);
        if (uuid) {
          updatedItem.pageUuid = uuid;
        }
      }
    }

    // Recursively process nested items
    if (item.items && Array.isArray(item.items)) {
      updatedItem.items = enrichMenuItems(item.items, pageSlugToUuid);
    }

    return updatedItem;
  });
}

/**
 * Build a map of page slugs to UUIDs for a project.
 */
export async function buildPageUuidMap(pagesDir) {
  const pageSlugToUuid = new Map();

  try {
    const pageFiles = await fs.readdir(pagesDir);
    for (const pageFile of pageFiles) {
      if (!pageFile.endsWith(".json")) continue;
      try {
        const pageContent = await fs.readFile(path.join(pagesDir, pageFile), "utf8");
        const page = JSON.parse(pageContent);
        if (page.slug && page.uuid) {
          pageSlugToUuid.set(page.slug, page.uuid);
        }
      } catch {
        // Skip pages that can't be read
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return pageSlugToUuid;
}

/**
 * Enrich all project references (pages, menus, global widgets) with pageUuids.
 * Used after project creation or duplication.
 */
export async function enrichProjectReferences(projectFolderName) {
  const pagesDir = getProjectPagesDir(projectFolderName);
  const menusDir = getProjectMenusDir(projectFolderName);

  // Build the slug-to-UUID map
  const pageSlugToUuid = await buildPageUuidMap(pagesDir);

  // Enrich page widgets
  try {
    const pageFiles = await fs.readdir(pagesDir);
    for (const pageFile of pageFiles) {
      if (!pageFile.endsWith(".json")) continue;

      const pagePath = path.join(pagesDir, pageFile);
      const pageContent = await fs.readFile(pagePath, "utf8");
      const page = JSON.parse(pageContent);

      if (page.type === "header" || page.type === "footer") continue;

      let modified = false;
      const enrichedWidgets = {};

      for (const [widgetId, widget] of Object.entries(page.widgets || {})) {
        const enriched = enrichWidgetLinks(widget, pageSlugToUuid);
        enrichedWidgets[widgetId] = enriched;
        if (JSON.stringify(enriched) !== JSON.stringify(widget)) {
          modified = true;
        }
      }

      if (modified) {
        page.widgets = enrichedWidgets;
        await fs.outputFile(pagePath, JSON.stringify(page, null, 2));
      }
    }
  } catch (error) {
    console.warn(`[linkEnrichment] Failed to enrich page widgets: ${error.message}`);
  }

  // Enrich global widgets (header/footer)
  try {
    const globalDir = path.join(pagesDir, "global");
    if (await fs.pathExists(globalDir)) {
      for (const widgetType of ["header", "footer"]) {
        const widgetPath = path.join(globalDir, `${widgetType}.json`);
        if (await fs.pathExists(widgetPath)) {
          const content = await fs.readFile(widgetPath, "utf8");
          const widget = JSON.parse(content);
          const enriched = enrichWidgetLinks(widget, pageSlugToUuid);
          if (JSON.stringify(enriched) !== JSON.stringify(widget)) {
            await fs.outputFile(widgetPath, JSON.stringify(enriched, null, 2));
          }
        }
      }
    }
  } catch (error) {
    console.warn(`[linkEnrichment] Failed to enrich global widgets: ${error.message}`);
  }

  // Enrich menus
  try {
    if (await fs.pathExists(menusDir)) {
      const menuFiles = await fs.readdir(menusDir);
      for (const menuFile of menuFiles) {
        if (!menuFile.endsWith(".json")) continue;

        const menuPath = path.join(menusDir, menuFile);
        const menuContent = await fs.readFile(menuPath, "utf8");
        const menu = JSON.parse(menuContent);

        const enrichedItems = enrichMenuItems(menu.items, pageSlugToUuid);
        if (JSON.stringify(enrichedItems) !== JSON.stringify(menu.items)) {
          menu.items = enrichedItems;
          await fs.outputFile(menuPath, JSON.stringify(menu, null, 2));
        }
      }
    }
  } catch (error) {
    console.warn(`[linkEnrichment] Failed to enrich menus: ${error.message}`);
  }

  return pageSlugToUuid;
}
```

#### 1.4 Extend `utils/projectHelpers.js`

Add to existing file:

```javascript
import { readProjectsFile } from "../controllers/projectController.js";

/**
 * Get the active project or throw an error.
 * @returns {Promise<object>} The active project object
 * @throws {Error} If no active project found (code: ACTIVE_PROJECT_NOT_FOUND)
 */
export async function getActiveProject() {
  const { projects, activeProjectId } = await readProjectsFile();
  const activeProject = projects.find((p) => p.id === activeProjectId);

  if (!activeProject) {
    const error = new Error("No active project found");
    error.code = "ACTIVE_PROJECT_NOT_FOUND";
    error.statusCode = 404;
    throw error;
  }

  return activeProject;
}
```

---

### Phase 2: Create Middleware

#### 2.1 Create `middleware/validateRequest.js`

```javascript
import { validationResult } from "express-validator";

/**
 * Express middleware to validate request using express-validator.
 * Returns 400 with errors if validation fails.
 */
export function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}
```

Apply to routes instead of repeating in each handler:

```javascript
// Example: server/routes/pages.js
import { validateRequest } from "../middleware/validateRequest.js";

router.get("/:id", pageValidation, validateRequest, pageController.getPage);
```

---

### Phase 3: Refactor Controllers

#### 3.1 Refactor `pageController.js`

- Remove duplicate `readProjectsFile()` - import from `projectController.js`
- Replace 8 instances of "get active project" boilerplate with `getActiveProject()` helper
- Replace `generateUniqueSlug()` and `ensureUniqueSlug()` with shared utility
- Replace "Copy of" naming logic in `duplicatePage()` with shared utility

#### 3.2 Refactor `menuController.js`

- Replace 6 instances of "get active project" boilerplate with `getActiveProject()` helper
- Replace `generateUniqueMenuId()` with shared `generateUniqueSlug()` utility
- Replace "Copy of" naming in `duplicateMenu()` with shared utility

#### 3.3 Refactor `projectController.js`

- Replace `generateUniqueProjectId()` with shared `generateUniqueSlug()` utility
- Extract inline link enrichment helpers to `utils/linkEnrichment.js`
- Replace "Copy of" naming in `duplicateProject()` with shared utility
- Use shared `enrichProjectReferences()` in both `createProject()` and `duplicateProject()`

**This will reduce `createProject()` from ~340 lines to ~100-120 lines.**

#### 3.4 Update Route Files

Apply `validateRequest` middleware to routes instead of calling in handlers.

---

### Phase 4: Consistency Updates

#### 4.1 Standardize Error Handling

Ensure all controllers use `handleProjectResolutionError()` from `utils/projectErrors.js`.

#### 4.2 Add Error Codes

Add `ACTIVE_PROJECT_NOT_FOUND` to `utils/projectErrors.js`.

---

## Priority Summary

| Priority   | Issue                          | Files Affected    | Est. Lines Saved |
| ---------- | ------------------------------ | ----------------- | ---------------- |
| **High**   | Get Active Project boilerplate | 2 controllers     | ~120 lines       |
| **High**   | Link enrichment utilities      | projectController | ~150 lines       |
| **Medium** | Unique slug generation         | 3 controllers     | ~80 lines        |
| **Medium** | "Copy of" naming logic         | 3 controllers     | ~60 lines        |
| **Medium** | Validation boilerplate         | All controllers   | ~60 lines        |
| **Medium** | Duplicate readProjectsFile     | pageController    | ~10 lines        |
| **Low**    | Media type detection           | mediaController   | ~40 lines        |
| **Low**    | Recursive template processing  | 2 files           | ~50 lines        |

**Total potential reduction: ~500-600 lines** with improved maintainability and fewer places for bugs to hide.

---

## Dependency Graph

```
Phase 1: Utilities (no dependencies)
├── utils/slugHelpers.js
├── utils/namingHelpers.js
├── utils/linkEnrichment.js
└── utils/projectHelpers.js extension

Phase 2: Middleware (no dependencies)
└── middleware/validateRequest.js

Phase 3: Controllers (depends on Phase 1)
├── pageController.js
├── menuController.js
└── projectController.js

Phase 4: Routes & Cleanup (depends on Phase 2 & 3)
├── Apply middleware to routes
└── Standardize error handling
```

---

## Testing Strategy

After each phase:

1. Run existing tests (if any)
2. Manually test affected functionality:
   - Create/duplicate projects, pages, menus
   - Verify link enrichment works correctly
   - Verify unique naming on duplicates
   - Verify validation errors return properly
