# Project ID and Slug Architecture

## Overview

Widgetizer uses a dual-identifier system for projects:

- **Project ID**: A stable UUID that never changes
- **Project Slug**: A mutable, filesystem-friendly identifier used for directory names

This architecture decouples the project's identity from its filesystem representation, allowing users to rename projects without breaking references or requiring complex migrations.

## Core Principles

### 1. Stable Identity (Project ID)

- Generated once using `uuid.v4()` during project creation
- Never changes throughout the project's lifetime
- Used for:
  - API endpoints (`/api/projects/:projectId`)
  - Frontend routing (`/projects/edit/:id`)
  - Database/JSON references
  - Cross-referencing between entities

### 2. Mutable Filesystem Path (Project Slug)

- Generated from the project name using `slugify()`
- Can change when the project is renamed
- Used for:
  - Directory names (`data/projects/{slug}/`)
  - File path construction
  - All filesystem operations

## Implementation by Controller

### Project Controller (`projectController.js`)

**Key Functions:**

- `createProject()`: Generates both UUID and slug
- `updateProject()`: Handles slug changes and directory renaming
- `duplicateProject()`: Creates new UUID but derives slug from name

**Pattern:**

```javascript
const newProject = {
  id: uuidv4(), // Stable UUID
  slug: slugify(name), // Filesystem identifier
  name,
  // ...
};
```

**Directory Operations:**

- Uses `project.slug` for `getProjectDir(slug)`
- Renames directories when slug changes
- Preserves UUID in project metadata

---

### Page Controller (`pageController.js`)

**Rationale:** Pages are stored as JSON files within a project's directory. The controller must resolve the project UUID to its slug to access the correct filesystem path.

**Pattern:**

```javascript
const { projects, activeProjectId } = await readProjectsFile();
const activeProject = projects.find((p) => p.id === activeProjectId);
const projectSlug = activeProject.slug || activeProject.id;

// Use slug for all file operations
const pagePath = getPagePath(projectSlug, pageSlug);
```

**Key Functions:**

- `getAllPages()`: Lists pages from `data/projects/{slug}/pages/`
- `createPage()`: Creates page file in correct project directory
- `updatePage()`: Handles page slug changes within project directory
- `duplicatePage()`: Copies page files using project slug

**Why This Matters:**

- API receives project UUID in routes
- Filesystem requires project slug for paths
- Controller bridges this gap by resolving UUID → slug

---

### Menu Controller (`menuController.js`)

**Rationale:** Menus are stored as JSON files in `data/projects/{slug}/menus/`. Like pages, menu operations require slug resolution.

**Pattern:**

```javascript
const { projects, activeProjectId } = await readProjectsFile();
const activeProject = projects.find((p) => p.id === activeProjectId);
const projectSlug = activeProject.slug || activeProject.id;

const menusDir = getProjectMenusDir(projectSlug);
const menuPath = getMenuPath(projectSlug, menuId);
```

**Key Functions:**

- `getAllMenus()`: Reads from `{slug}/menus/`
- `createMenu()`: Writes to `{slug}/menus/{menuId}.json`
- `updateMenu()`: Updates menu file in correct directory
- `duplicateMenu()`: Copies menu using project slug

**Special Consideration:** The `getMenuById()` function (used by rendering service) receives a project directory path directly, so it doesn't need slug resolution.

---

### Media Controller (`mediaController.js`)

**Rationale:** Media files (images, videos) are stored in `data/projects/{slug}/uploads/`. The controller handles file uploads and must ensure files are stored in the correct project directory.

**Pattern:**

```javascript
const projectSlug = await getProjectSlug(projectId);
const imagesDir = getProjectImagesDir(projectSlug);
const imagePath = getImagePath(projectSlug, filename);
```

**Key Functions:**

- `uploadProjectMedia()`: Stores files in `{slug}/uploads/images/` or `{slug}/uploads/videos/`
- `getProjectMedia()`: Reads media metadata from `{slug}/uploads/media.json`
- `deleteProjectMedia()`: Removes files from correct project directory
- `serveProjectMedia()`: Serves files from `{slug}/uploads/`

**Multer Integration:** The multer storage configuration uses `getProjectSlug()` to determine the upload destination dynamically.

---

### Theme Controller (`themeController.js`)

**Rationale:** Theme settings are stored per-project in `data/projects/{slug}/theme.json`. Theme operations must use the project slug to access these files.

**Pattern:**

```javascript
const projectSlug = await getProjectSlug(projectId);
const themeJsonPath = getProjectThemeJsonPath(projectSlug);
```

**Key Functions:**

- `getProjectThemeSettings()`: Reads from `{slug}/theme.json`
- `saveProjectThemeSettings()`: Writes to `{slug}/theme.json`
- `copyThemeToProject()`: Copies theme files to `{slug}/` directory

**Why Slug Resolution:**

- API endpoints use project UUID
- Theme files are stored in project directory
- Controller resolves UUID to slug for file access

---

### Export Controller (`exportController.js`)

**Rationale:** Exports generate static HTML from project data. The controller must read from the correct project directory using the slug.

**Pattern:**

```javascript
const project = projects.find((p) => p.id === projectId);
const projectSlug = project.slug || project.id;
const projectDir = getProjectDir(projectSlug);
```

**Key Functions:**

- `exportProject()`: Reads project files from `{slug}/` directory
- Generates static site in `data/publish/{slug}/`
- Uses slug for all file path construction

**Export Directory:** Exports are also stored using the project slug for consistency and human-readability.

---

### Preview Controller (`previewController.js`)

**Rationale:** Preview generation requires reading project files and rendering them. The controller must resolve the project UUID to access the correct directory.

**Pattern:**

```javascript
const projectSlug = await getProjectSlug(activeProjectId);
const projectDir = getProjectDir(projectSlug);
```

**Key Functions:**

- `generatePreview()`: Renders page preview from project files
- `getGlobalWidgets()`: Reads global widgets from `{slug}/pages/global/`
- `saveGlobalWidget()`: Saves global widgets to correct directory
- `serveAsset()`: Serves static assets from project directory

**Rendering Service Integration:** The preview controller passes the project UUID to the rendering service, which internally resolves it to the slug.

---

### Rendering Service (`renderingService.js`)

**Rationale:** The rendering service needs to load templates and data from project directories. It uses slug resolution to access the correct filesystem paths.

**Pattern:**

```javascript
const projectSlug = await getProjectSlug(projectId);
const projectDir = getProjectDir(projectSlug);
```

**Key Functions:**

- `renderWidget()`: Loads widget templates from `{slug}/widgets/`
- `renderPageLayout()`: Loads page templates from `{slug}/templates/`
- Uses slug for all file system access

**Template Resolution:** Templates are stored in the project directory, requiring slug-based path resolution.

---

## Helper Utility

### `getProjectSlug()` (`utils/projectHelpers.js`)

**Purpose:** Centralized function to resolve a project UUID to its slug.

**Implementation:**

```javascript
export async function getProjectSlug(projectId) {
  const projectsPath = getProjectsFilePath();
  try {
    if (await fs.pathExists(projectsPath)) {
      const data = JSON.parse(await fs.readFile(projectsPath, "utf8"));
      const project = data.projects.find((p) => p.id === projectId);
      if (project) return project.slug || project.id;
    }
  } catch (error) {
    console.error(`Error resolving project slug for ID ${projectId}:`, error);
  }
  return projectId; // Fallback to ID if resolution fails
}
```

**Usage:**

- Imported by controllers that need slug resolution
- Provides consistent error handling
- Falls back to using the ID if slug cannot be resolved (for backward compatibility)

---

## Benefits of This Architecture

### 1. **Stable References**

- API endpoints and routes never break when projects are renamed
- Frontend can bookmark/share project URLs that remain valid
- No need to update references when slug changes

### 2. **User-Friendly Filesystem**

- Project directories have readable, meaningful names
- Easy to locate and manage projects in the filesystem
- Slug changes are transparent to the user

### 3. **Flexibility**

- Projects can be renamed without data migration
- Slug conflicts are handled gracefully
- System can evolve without breaking existing projects

### 4. **Separation of Concerns**

- Identity (UUID) is separate from representation (slug)
- Each serves its specific purpose
- Clear boundaries between API and filesystem layers

---

## Migration Considerations

### Existing Projects

Projects created before this system may have:

- ID and slug being the same value
- Slugs that are not UUIDs

**Handling:**

- `project.slug || project.id` pattern ensures backward compatibility
- Existing projects continue to work without migration
- New projects automatically use the UUID/slug system

### Slug Changes

When a project's name (and thus slug) changes:

1. New slug is generated from the new name
2. Project directory is renamed from old slug to new slug
3. All file references use the new slug
4. Project ID remains unchanged
5. API endpoints continue to work with the same UUID

---

## Best Practices

### For Controllers

1. **Always resolve UUID to slug** before filesystem operations
2. **Use `getProjectSlug()` helper** for consistency
3. **Handle slug changes** by renaming directories
4. **Preserve UUID** in all project metadata

### For Frontend

1. **Use project UUID** in routes and API calls
2. **Display project name** to users, not slug or UUID
3. **Handle slug changes** transparently (no UI impact)

### For File Operations

1. **Use slug** for all `getProjectDir()`, `getPagePath()`, etc.
2. **Never use UUID** for filesystem paths
3. **Validate slug** before directory operations
4. **Handle missing directories** gracefully

---

## Common Patterns

### Reading Project Data

```javascript
// 1. Get project by UUID
const { projects, activeProjectId } = await readProjectsFile();
const project = projects.find((p) => p.id === activeProjectId);

// 2. Resolve slug
const projectSlug = project.slug || project.id;

// 3. Use slug for file operations
const filePath = getProjectDir(projectSlug);
```

### Creating Project Resources

```javascript
// 1. Resolve slug from project UUID
const projectSlug = await getProjectSlug(projectId);

// 2. Construct file path
const resourcePath = path.join(getProjectDir(projectSlug), "resource.json");

// 3. Perform file operation
await fs.outputFile(resourcePath, data);
```

### Handling Slug Changes

```javascript
// 1. Detect slug change
if (updatedProject.slug !== originalProject.slug) {
  // 2. Rename directory
  const oldDir = getProjectDir(originalProject.slug);
  const newDir = getProjectDir(updatedProject.slug);
  await fs.rename(oldDir, newDir);
}
```

---

## Troubleshooting

### "Project not found" errors

- Verify project UUID exists in `projects.json`
- Check if slug resolution is working
- Ensure directory exists with correct slug name

### File path errors

- Confirm you're using slug, not UUID, for paths
- Check `getProjectSlug()` is being called
- Verify fallback to `project.id` is working

### Slug conflicts

- System automatically appends numbers to ensure uniqueness
- Check slug generation logic in `projectController.js`
- Verify `ensureUniqueSlug()` is being used

---

## Summary

The Project ID/Slug architecture provides a robust foundation for managing projects in Widgetizer. By separating identity (UUID) from filesystem representation (slug), the system achieves both stability and flexibility. Controllers consistently resolve UUIDs to slugs for file operations, ensuring that projects can be renamed without breaking functionality or requiring complex migrations.

---

## Architectural Comparison: UUID+Slug vs UUID-Only

### Alternative Approach: UUID-Only Filesystem

An alternative architecture would use **UUIDs exclusively** for all filesystem operations, with human-readable slugs **only** for exports:

- Project directories: `data/projects/a7f3c2b1-4d5e-6789-0abc-def123456789/`
- Exports: `data/publish/my-awesome-project/` (slug-based)

### Advantages of UUID-Only Approach

#### 1. Architectural Simplicity

- No slug resolution needed in controllers
- Single identifier for all operations
- Eliminate `getProjectSlug()` helper
- No directory renaming logic
- Cleaner, more straightforward code

#### 2. Zero Naming Conflicts

- Guaranteed uniqueness (mathematical certainty)
- No slug sanitization or conflict detection
- Simpler project creation flow
- No "Copy of Copy 2" scenarios

#### 3. Trivial Rename Operations

- Name changes only update metadata
- No filesystem operations during renames
- Instant, atomic updates
- Zero risk of failed directory renames

#### 4. Performance Benefits

- No slug lookup overhead
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

- **Single point of failure**: `projects.json` becomes critical
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

### Why UUID+Slug is the Right Choice

The current architecture was chosen because:

1. **Developer experience matters**: Humans work with this system daily
2. **Debugging is critical**: Readable directories save hours of troubleshooting
3. **Collaboration is key**: Team members need to communicate about projects
4. **Operational simplicity**: Standard tools work without custom wrappers
5. **Self-documenting**: Filesystem structure tells the story

### The Cost-Benefit Analysis

**Cost of slug resolution**: A few extra lines of code per controller, minimal performance overhead

**Benefit of readable directories**: Massive improvement in developer productivity, debugging efficiency, operational clarity, and team collaboration

**Verdict**: The cost of slug resolution is **far outweighed** by the benefits of human-readable directories.

### When UUID-Only Makes Sense

UUID-only architecture is appropriate for:

- **Database-backed systems**: Where filesystem is cache, not source of truth
- **Microservices**: Where each service has isolated UUID namespace
- **Temporary storage**: Where directories are ephemeral
- **Fully automated systems**: Where humans never inspect filesystem

### When UUID+Slug Makes Sense (Widgetizer)

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

The UUID+Slug architecture strikes the perfect balance between **stable identity** (UUID) and **human usability** (slug). While UUID-only would simplify the code, it would create massive usability problems that far outweigh the minor complexity of slug resolution. The current architecture is not premature optimization—it's a pragmatic choice that prioritizes developer productivity and operational clarity.
