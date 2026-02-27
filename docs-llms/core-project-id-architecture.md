# Project ID and FolderName Architecture

## Overview

Widgetizer uses a dual-identifier system for projects:

- **Project ID**: A stable UUID that never changes
- **Project FolderName**: A mutable, filesystem-friendly identifier used for directory names

This architecture decouples the project's identity from its filesystem representation, allowing users to rename projects without breaking references or requiring complex migrations.

## Core Principles

### 1. Stable Identity (Project ID)

- Generated once using `uuid.v4()` during project creation
- Never changes throughout the project's lifetime
- Used for:
  - API endpoints (`/api/projects/:projectId`)
  - Frontend routing (`/projects/edit/:id`)
  - SQLite-backed metadata references
  - Cross-referencing between entities

### 2. Mutable Filesystem Path (Project FolderName)

- Generated from the project name using `slugify()`
- Can change when the project is renamed
- Stored as `project.folderName` in the SQLite `projects` table
- Used for:
  - Directory names (`data/users/{userId}/projects/{folderName}/`)
  - File path construction
  - All filesystem operations

### 3. User Scoping (userId)

All filesystem paths are scoped per user. Every path helper in `server/config.js` accepts a `userId` parameter (default `"local"`). In open-source mode, `userId` is always `"local"` (set by the default auth adapter), so paths resolve to `data/users/local/projects/{folderName}/`. In hosted mode, the platform's auth adapter sets `userId` to the authenticated user's ID.

The `projects` table includes a `user_id` column, and all queries are filtered by `user_id`. The `getProjectFolderName(projectId, userId)` helper validates project ownership — it throws if the project doesn't belong to the requesting user.

## Implementation by Controller

### Project Controller (`projectController.js`)

**Key Functions:**

- `createProject()`: Generates both UUID and folderName
- `updateProject()`: Handles folderName changes and directory renaming
- `duplicateProject()`: Creates new UUID but derives folderName from name

**Pattern:**

```javascript
const newProject = {
  id: uuidv4(), // Stable UUID
  folderName: slugify(name), // Filesystem identifier
  name,
  userId: req.userId, // User scope
  // ...
};
```

**Directory Operations:**

- Uses `project.folderName` and `req.userId` for `getProjectDir(folderName, userId)`
- Renames directories when folderName changes
- Preserves UUID in project metadata

---

### Page Controller (`pageController.js`)

**Rationale:** Pages are stored as JSON files within a project's directory. The controller must resolve the project UUID to its folderName to access the correct filesystem path.

**Pattern:**

```javascript
const activeProjectId = projectRepo.getActiveProjectId(req.userId);
const activeProject = projectRepo.getProjectById(activeProjectId, req.userId);
const projectFolderName = activeProject.folderName;

// Use folderName + userId for all file operations
const pagePath = getPagePath(projectFolderName, pageSlug, req.userId);
```

**Key Functions:**

- `getAllPages()`: Lists pages from `data/users/{userId}/projects/{folderName}/pages/`
- `createPage()`: Creates page file in correct project directory
- `updatePage()`: Handles page slug changes within project directory
- `duplicatePage()`: Copies page files using project folderName

**Why This Matters:**

- API receives project UUID in routes
- Filesystem requires project folderName for paths
- Controller bridges this gap by resolving UUID → folderName

---

### Menu Controller (`menuController.js`)

**Rationale:** Menus are stored as JSON files in `data/users/{userId}/projects/{folderName}/menus/`. Like pages, menu operations require folderName resolution.

**Pattern:**

```javascript
const activeProjectId = projectRepo.getActiveProjectId(req.userId);
const activeProject = projectRepo.getProjectById(activeProjectId, req.userId);
const projectFolderName = activeProject.folderName;

const menusDir = getProjectMenusDir(projectFolderName, req.userId);
const menuPath = getMenuPath(projectFolderName, menuId, req.userId);
```

**Key Functions:**

- `getAllMenus()`: Reads from `{folderName}/menus/`
- `createMenu()`: Writes to `{folderName}/menus/{menuId}.json`
- `updateMenu()`: Updates menu file in correct directory
- `duplicateMenu()`: Copies menu using project folderName

**Special Consideration:** The `getMenuById()` function (used by rendering service) receives a project directory path directly, so it doesn't need folderName resolution.

---

### Media Controller (`mediaController.js`)

**Rationale:** Media files (images, videos, audio) are stored in `data/users/{userId}/projects/{folderName}/uploads/`. The controller handles file uploads and must ensure files are stored in the correct project directory.

**Pattern:**

```javascript
const projectFolderName = await getProjectFolderName(projectId, req.userId);
const imagesDir = getProjectImagesDir(projectFolderName, req.userId);
const imagePath = getImagePath(projectFolderName, filename, req.userId);
```

**Key Functions:**

- `uploadProjectMedia()`: Stores files in user-scoped `{folderName}/uploads/images/`, `uploads/videos/`, or `uploads/audios/`
- `getProjectMedia()`: Reads media metadata from SQLite; media binaries still come from `{folderName}/uploads/*`
- `deleteProjectMedia()`: Removes files from correct project directory
- `serveProjectMedia()`: Serves files from `{folderName}/uploads/`, sets `Content-Type` via `getContentType()` from `server/utils/mimeTypes.js`

**Multer Integration:** The multer storage configuration uses `getProjectFolderName()` to determine the upload destination dynamically.

---

### Theme Controller (`themeController.js`)

**Rationale:** Theme settings are stored per-project in `data/users/{userId}/projects/{folderName}/theme.json`. Theme operations must use the project folderName to access these files.

**Pattern:**

```javascript
const projectFolderName = await getProjectFolderName(projectId, req.userId);
const themeJsonPath = getProjectThemeJsonPath(projectFolderName, req.userId);
```

**Key Functions:**

- `getProjectThemeSettings()`: Reads from `{folderName}/theme.json`
- `saveProjectThemeSettings()`: Writes to `{folderName}/theme.json`
- `copyThemeToProject()`: Copies theme files to `{folderName}/` directory

**Why FolderName Resolution:**

- API endpoints use project UUID
- Theme files are stored in project directory
- Controller resolves UUID to folderName for file access

---

### Export Controller (`exportController.js`)

**Rationale:** Exports generate static HTML from project data. The controller must read from the correct project directory using the folderName.

**Pattern:**

```javascript
const project = projectRepo.getProjectById(projectId, req.userId);
const projectFolderName = project.folderName;
const projectDir = getProjectDir(projectFolderName, req.userId);
```

**Key Functions:**

- `exportProject()`: Reads project files from `{folderName}/` directory
- Generates static site in `data/users/{userId}/publish/{folderName}-v{version}/`
- Uses folderName for all file path construction

**Export Directory:** Exports are stored in the user-scoped publish directory using the project folderName and version for consistency and human-readability.

---

### Preview Controller (`previewController.js`)

**Rationale:** Preview generation requires reading project files and rendering them. The controller must resolve the project UUID to access the correct directory.

**Pattern:**

```javascript
const projectFolderName = await getProjectFolderName(activeProjectId, req.userId);
const projectDir = getProjectDir(projectFolderName, req.userId);
```

**Key Functions:**

- `generatePreview()`: Renders page preview from project files
- `getGlobalWidgets()`: Reads global widgets from `{folderName}/pages/global/`
- `saveGlobalWidget()`: Saves global widgets to correct directory
- `serveAsset()`: Serves static assets from project directory

**Rendering Service Integration:** The preview controller passes the project UUID to the rendering service, which internally resolves it to the folderName.

---

### Rendering Service (`renderingService.js`)

**Rationale:** The rendering service needs to load templates and data from project directories. It uses folderName resolution to access the correct filesystem paths.

**Pattern:**

```javascript
const projectFolderName = await getProjectFolderName(projectId, userId);
const projectDir = getProjectDir(projectFolderName, userId);
```

**Key Functions:**

- `renderWidget()`: Loads widget templates from `{folderName}/widgets/`
- `renderPageLayout()`: Loads page templates from `{folderName}/templates/`
- Uses folderName for all file system access

**Template Resolution:** Templates are stored in the project directory, requiring folderName-based path resolution.

---

## Helper Utility

### `getProjectFolderName()` (`server/utils/projectHelpers.js`)

**Purpose:** Centralized function to resolve a project UUID to its folderName, with ownership validation.

**Implementation:**

```javascript
export async function getProjectFolderName(projectId, userId = "local") {
  const folderName = repoGetFolderName(projectId, userId); // from projectRepository, filtered by user_id
  if (!folderName) {
    const error = new Error(`Project not found for ID ${projectId}`);
    error.code = PROJECT_ERROR_CODES.PROJECT_NOT_FOUND;
    throw error;
  }
  return folderName;
}
```

**Usage:**

- Imported by controllers that need folderName resolution
- Validates that the project belongs to the requesting user (defense-in-depth)
- Provides consistent error handling
- Throws if the project cannot be resolved so callers can respond with 404/500

### Project Error Helpers (`server/utils/projectErrors.js`)

Centralized error codes and helpers used by controllers/services to detect and respond to project resolution failures.

```javascript
export const PROJECT_ERROR_CODES = {
  PROJECT_NOT_FOUND: "PROJECT_NOT_FOUND",
  PROJECT_DIR_MISSING: "PROJECT_DIR_MISSING",
};

export function isProjectResolutionError(error) {
  if (!error || !error.code) return false;
  return Object.values(PROJECT_ERROR_CODES).includes(error.code);
}
```

**Usage:**

- Controllers use `handleProjectResolutionError(res, error)` to return consistent 404/500 responses.
- Services use `isProjectResolutionError(error)` to propagate resolution failures without masking them.

---

## Benefits of This Architecture

### 1. **Stable References**

- API endpoints and routes never break when projects are renamed
- Frontend can bookmark/share project URLs that remain valid
- No need to update references when slug changes

### 2. **User-Friendly Filesystem**

- Project directories have readable, meaningful names
- Easy to locate and manage projects in the filesystem
- FolderName changes are transparent to the user

### 3. **Flexibility**

- Projects can be renamed without data migration
- FolderName conflicts are handled gracefully
- System can evolve without breaking existing projects

### 4. **Separation of Concerns**

- Identity (UUID) is separate from representation (folderName)
- Each serves its specific purpose
- Clear boundaries between API and filesystem layers

---

## Renaming Projects

When a project's name (and thus folderName) changes:

1. New folderName is generated from the new name
2. Project directory is renamed from old folderName to new folderName
3. All file references use the new folderName
4. Project ID remains unchanged
5. API endpoints continue to work with the same UUID

---

## Best Practices

### For Controllers

1. **Always resolve UUID to folderName** before filesystem operations
2. **Use `getProjectFolderName()` helper** for consistency
3. **Handle folderName changes** by renaming directories
4. **Preserve UUID** in all project metadata

### For Frontend

1. **Use project UUID** in routes and API calls
2. **Display project name** to users, not folderName or UUID
3. **Handle folderName changes** transparently (no UI impact)

### For File Operations

1. **Use folderName + userId** for all `getProjectDir()`, `getPagePath()`, etc.
2. **Never use UUID** for filesystem paths
3. **Always pass `req.userId`** to path helpers and `getProjectFolderName()`
4. **Validate folderName** before directory operations
5. **Handle missing directories** gracefully

---

## Common Patterns

### Reading Project Data

```javascript
// 1. Get project by UUID (scoped to userId)
const activeProjectId = projectRepo.getActiveProjectId(req.userId);
const project = projectRepo.getProjectById(activeProjectId, req.userId);

// 2. Get folderName
const projectFolderName = project.folderName;

// 3. Use folderName + userId for file operations
const filePath = getProjectDir(projectFolderName, req.userId);
```

### Creating Project Resources

```javascript
// 1. Resolve folderName from project UUID (validates ownership)
const projectFolderName = await getProjectFolderName(projectId, req.userId);

// 2. Construct file path
const resourcePath = path.join(getProjectDir(projectFolderName, req.userId), "resource.json");

// 3. Perform file operation
await fs.outputFile(resourcePath, data);
```

### Handling FolderName Changes

```javascript
// 1. Detect folderName change
if (updatedProject.folderName !== originalProject.folderName) {
  // 2. Rename directory
  const oldDir = getProjectDir(originalProject.folderName, req.userId);
  const newDir = getProjectDir(updatedProject.folderName, req.userId);
  await fs.copy(oldDir, newDir);
  await fs.remove(oldDir);
}
```

---

## Troubleshooting

### "Project not found" errors

- Verify project UUID exists in SQLite (`projects` table)
- Check if folderName resolution is working
- Ensure directory exists with correct folderName

### File path errors

- Confirm you're using folderName, not UUID, for paths
- Check `getProjectFolderName()` is being called
- If resolution fails, expect a 404/500 instead of a fallback

### FolderName conflicts

- System automatically appends numbers to ensure uniqueness
- Check folderName generation logic in `projectController.js`
- Verify `generateUniqueSlug()` is being used

---

## Summary

The Project ID/FolderName architecture provides a robust foundation for managing projects in Widgetizer. By separating identity (UUID) from filesystem representation (folderName), the system achieves both stability and flexibility. Controllers consistently resolve UUIDs to folderNames for file operations, ensuring that projects can be renamed without breaking functionality or requiring complex migrations.

---

## Architectural Comparison: UUID+FolderName vs UUID-Only

### Alternative Approach: UUID-Only Filesystem

An alternative architecture would use **UUIDs exclusively** for all filesystem operations, with human-readable folderNames **only** for exports:

- Project directories: `data/users/{userId}/projects/a7f3c2b1-4d5e-6789-0abc-def123456789/`
- Exports: `data/users/{userId}/publish/my-awesome-project/` (folderName-based)

### Advantages of UUID-Only Approach

#### 1. Architectural Simplicity

- No folderName resolution needed in controllers
- Single identifier for all operations
- Eliminate `getProjectFolderName()` helper
- No directory renaming logic
- Cleaner, more straightforward code

#### 2. Zero Naming Conflicts

- Guaranteed uniqueness (mathematical certainty)
- No folderName sanitization or conflict detection
- Simpler project creation flow
- No "Copy of Copy 2" scenarios

#### 3. Trivial Rename Operations

- Name changes only update metadata
- No filesystem operations during renames
- Instant, atomic updates
- Zero risk of failed directory renames

#### 4. Performance Benefits

- No folderName lookup overhead
- Direct UUID → path conversion
- Reduced I/O operations
- Faster project operations

### Disadvantages of UUID-Only Approach

#### 1. Developer Experience Nightmare

- **Unreadable filesystem**: Wall of meaningless UUIDs in file explorer
- **Manual inspection required**: Can't identify projects without opening files
- **Debugging hell**: Error messages with UUIDs are useless without context
- **No visual scanning**: Impossible to locate projects by name

#### 2. Operations and Maintenance Pain

- **Backup/restore complexity**: Can't identify what you're backing up
- **Manual operations**: Must look up UUIDs for any file operation
- **Support nightmares**: "Which project?" requires UUID cross-referencing
- **Log analysis**: Logs full of UUIDs are nearly impossible to parse

#### 3. Version Control Challenges

- **Meaningless diffs**: Git shows UUID changes, not project names
- **Code review difficulty**: Reviewers need context for every change
- **Merge conflicts**: Harder to resolve without project identification
- **History tracking**: Git log shows UUIDs instead of readable names

#### 4. External Tool Integration

- **File browsers**: Users see UUIDs, not project names
- **Search tools**: Can't grep for project names
- **Backup software**: Can't create meaningful backup names
- **CI/CD pipelines**: Scripts need UUID lookup for everything

#### 5. Data Portability Issues

- **Manual exports**: Requires UUID mapping between systems
- **Sharing projects**: "Send me the portfolio" → "Which UUID?"
- **Import/export**: Need metadata file to make sense of directories
- **Migration complexity**: Moving systems requires translation layer

### Technical Pitfalls of UUID-Only

#### 1. Metadata Dependency

- **Single point of failure**: project metadata store (SQLite) must remain healthy
- **Orphaned directories**: Lost metadata makes UUIDs meaningless
- **Recovery difficulty**: Disaster recovery requires metadata reconstruction
- **Backup strategy**: Must always backup metadata with projects

#### 2. Human Error Amplification

- **Accidental deletions**: Can't visually verify correct project
- **Wrong project operations**: Easy to operate on wrong UUID
- **Configuration mistakes**: Harder to catch errors with UUIDs
- **Testing confusion**: Test data indistinguishable from production

#### 3. Tooling Requirements

- **Admin tools needed**: UI required to map UUIDs to names
- **CLI tools required**: Standard Unix tools become ineffective
- **Custom scripts**: Every operation needs UUID lookup
- **Increased complexity**: More code to maintain

### Why UUID+FolderName is the Right Choice

The current architecture was chosen because:

1. **Developer experience matters**: Humans work with this system daily
2. **Debugging is critical**: Readable directories save hours of troubleshooting
3. **Collaboration is key**: Team members need to communicate about projects
4. **Operational simplicity**: Standard tools work without custom wrappers
5. **Self-documenting**: Filesystem structure tells the story

### The Cost-Benefit Analysis

**Cost of folderName resolution**: A few extra lines of code per controller, minimal performance overhead

**Benefit of readable directories**: Massive improvement in developer productivity, debugging efficiency, operational clarity, and team collaboration

**Verdict**: The cost of folderName resolution is **far outweighed** by the benefits of human-readable directories.

### When UUID-Only Makes Sense

UUID-only architecture is appropriate for:

- **Database-backed systems**: Where filesystem is cache, not source of truth
- **Microservices**: Where each service has isolated UUID namespace
- **Temporary storage**: Where directories are ephemeral
- **Fully automated systems**: Where humans never inspect filesystem

### When UUID+FolderName Makes Sense (Widgetizer)

The current architecture is ideal for:

- **Developer-facing tools**: Where humans inspect/debug filesystem
- **Small to medium scale**: Where manual operations are common
- **Collaborative environments**: Where teams reference projects by name
- **Self-documenting systems**: Where filesystem tells the story

### Real-World Impact

**Scenario: Production Debugging**

- **Current**: "Error in project 'client-portfolio'" → immediately actionable
- **UUID-only**: "Error in a7f3c2b1-4d5e-6789" → must look up UUID first

**Scenario: Team Collaboration**

- **Current**: "Check the portfolio project changes"
- **UUID-only**: "Check a7f3c2b1... wait, which one is that?"

**Scenario: Server Migration**

- **Current**: Copy directories, names are self-explanatory
- **UUID-only**: Copy UUIDs, need metadata to understand them

### Conclusion

The UUID+FolderName architecture strikes the perfect balance between **stable identity** (UUID) and **human usability** (folderName). While UUID-only would simplify the code, it would create massive usability problems that far outweigh the minor complexity of folderName resolution. The current architecture is not premature optimization—it's a pragmatic choice that prioritizes developer productivity and operational clarity.

---

**See also:**

- [Project Management](core-projects.md) - Project CRUD operations using this architecture
- [Custom Hooks](core-hooks.md) - Frontend state management for projects
