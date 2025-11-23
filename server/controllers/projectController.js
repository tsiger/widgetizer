import fs from "fs-extra";
import path from "path";
import { validationResult } from "express-validator";
import * as themeController from "./themeController.js";
import slugify from "slugify";
import {
  DATA_DIR,
  getProjectsFilePath,
  getProjectDir,
  getProjectPagesDir,
  getThemeTemplatesDir,
  getThemeDir,
  getProjectMenusDir,
} from "../config.js";
import { extractWidgetSchema } from "../utils/widgetSchemaExtractor.js";
import { v4 as uuidv4 } from "uuid";

// Make sure the projects directory exists
async function ensureDirectories() {
  await fs.ensureDir(path.join(DATA_DIR, "projects"));
}

// Read the projects file
export async function readProjectsFile() {
  const projectsFilePath = getProjectsFilePath();
  try {
    // Check existence first
    if (!(await fs.pathExists(projectsFilePath))) {
      const initialData = { projects: [], activeProjectId: null };
      await writeProjectsFile(initialData);
      return initialData;
    }
    const data = await fs.readFile(projectsFilePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading projects file:", error);
    throw error;
  }
}

// Write the projects file
async function writeProjectsFile(data) {
  const projectsFilePath = getProjectsFilePath();
  await fs.outputFile(projectsFilePath, JSON.stringify(data, null, 2));
}

// Helper function to generate a unique project ID based on name
async function generateUniqueProjectId(name, projects) {
  let baseId = slugify(name, { lower: true, strict: true });
  if (!baseId) baseId = "project";
  let uniqueId = baseId;
  let counter = 1;

  // Add safety counter to prevent infinite loops
  let safetyCounter = 0;
  const maxAttempts = 1000;

  while (projects.some((p) => p.id === uniqueId)) {
    uniqueId = `${baseId}-${counter}`;
    counter++;
    safetyCounter++;

    if (safetyCounter >= maxAttempts) {
      console.error(`generateUniqueProjectId: Hit safety limit after ${maxAttempts} attempts for name "${name}"`);
      throw new Error(`Unable to generate unique project ID after ${maxAttempts} attempts`);
    }
  }

  return uniqueId;
}

// Get all projects
export async function getAllProjects(_, res) {
  try {
    await ensureDirectories();
    const data = await readProjectsFile();
    res.json(data.projects);
  } catch (error) {
    res.status(500).json({ error: "Failed to get projects" });
  }
}

// Get the active project
export async function getActiveProject(_, res) {
  try {
    // Read the projects file
    const data = await readProjectsFile();

    // Find the active project
    const activeProject = data.projects.find((p) => p.id === data.activeProjectId);

    // Return the active project or null if no active project
    res.json(activeProject || null);
  } catch (error) {
    res.status(500).json({ error: "Failed to get active project" });
  }
}

// Create a new project
export async function createProject(req, res) {
  // Validate incoming data
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, slug: providedSlug, description, theme, siteUrl } = req.body;
    const data = await readProjectsFile();

    // Check for duplicate project names
    const duplicateName = data.projects.find((p) => p.name.toLowerCase() === name.trim().toLowerCase());
    if (duplicateName) {
      return res
        .status(400)
        .json({ error: `A project named "${name}" already exists. Please choose a different name.` });
    }

    // Use provided slug or generate one from name
    let slug;
    if (providedSlug && providedSlug.trim()) {
      slug = providedSlug.trim();
      // Validate slug format
      const slugPattern = /^[a-z0-9-]+$/;
      if (!slugPattern.test(slug)) {
        return res.status(400).json({ error: "Slug can only contain lowercase letters, numbers, and hyphens" });
      }
      // Check for duplicate slugs
      const duplicateSlug = data.projects.find((p) => p.slug === slug); // ID check removed
      if (duplicateSlug) {
        return res
          .status(400)
          .json({ error: `A project with slug "${slug}" already exists. Please choose a different slug.` });
      }
    } else {
      // Generate slug from name if not provided
      slug = await generateUniqueProjectId(name, data.projects);
    }

    const newProject = {
      id: uuidv4(), // ✅ Generate stable UUID
      slug, // Folder identifier
      name,
      description,
      theme,
      siteUrl: siteUrl || "",
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    // Use the permanent slug for directory creation
    const projectDir = getProjectDir(slug);
    await fs.ensureDir(projectDir);

    if (!theme) {
      throw new Error("Theme is required");
    }

    try {
      // First copy theme assets (excluding templates)
      await themeController.copyThemeToProject(theme, projectDir, ["templates"]);

      // Then handle templates separately, recursively
      const pagesDir = getProjectPagesDir(slug);
      const themeTemplatesDir = getThemeTemplatesDir(theme);

      // Helper function to recursively find and process templates
      async function processTemplatesRecursive(sourceDir, targetDir) {
        await fs.ensureDir(targetDir);
        const entries = await fs.readdir(sourceDir, { withFileTypes: true });

        for (const entry of entries) {
          const sourcePath = path.join(sourceDir, entry.name);
          const targetPath = path.join(targetDir, entry.name);

          if (entry.isDirectory()) {
            // If it's a directory, recurse
            await processTemplatesRecursive(sourcePath, targetPath);
          } else if (entry.isFile() && entry.name.endsWith(".json")) {
            // If it's a JSON file, process it
            const templateContent = await fs.readFile(sourcePath, "utf8");
            const templatePage = JSON.parse(templateContent);

            // Use the template's slug or fallback to filename
            const templateSlug = templatePage.slug || path.basename(entry.name, ".json");

            // Create initialized page
            const initializedPage = {
              ...templatePage,
              // Only add metadata for non-global widgets (pages become editable templates)
              ...(templatePage.type !== "header" && templatePage.type !== "footer"
                ? {
                    id: path.relative(themeTemplatesDir, sourcePath).replace(/\\/g, "/").replace(".json", ""),
                    slug: templateSlug,
                    created: new Date().toISOString(),
                    updated: new Date().toISOString(),
                  }
                : {}),
            };

            // Save with the same relative structure
            await fs.outputFile(targetPath, JSON.stringify(initializedPage, null, 2));
          }
        }
      }

      // Start the recursive processing for templates
      await processTemplatesRecursive(themeTemplatesDir, pagesDir);

      const themeMenusDir = path.join(getThemeDir(theme), "menus");
      const projectMenusDir = getProjectMenusDir(slug);
      try {
        // Check if theme has menus directory
        if (await fs.pathExists(themeMenusDir)) {
          // Ensure project menus directory exists
          await fs.ensureDir(projectMenusDir);

          // Process and enrich menu files already copied
          const menuFiles = await fs.readdir(themeMenusDir); // Read from theme to know which files to process
          for (const menuFile of menuFiles) {
            if (!menuFile.endsWith(".json")) continue;

            const projectMenuPath = path.join(projectMenusDir, menuFile);
            try {
              // Read the already copied menu file from the project dir
              const menuContent = await fs.readFile(projectMenuPath, "utf8");
              const menu = JSON.parse(menuContent);
              const menuSlug = path.parse(menuFile).name;

              const enrichedMenu = {
                ...menu,
                id: menuSlug,
                created: new Date().toISOString(),
                updated: new Date().toISOString(),
              };
              // Overwrite the copied file with the enriched version
              await fs.outputFile(projectMenuPath, JSON.stringify(enrichedMenu, null, 2));
            } catch (menuReadError) {
              // Silently skip menu enrichment errors
            }
          }
        }
      } catch (themeMenuAccessError) {
        // If theme menus directory doesn't exist, do nothing (no menus to enrich)
        if (themeMenuAccessError.code !== "ENOENT") {
          // Silently handle theme menus directory access errors
        }
      }
    } catch (error) {
      await fs.remove(projectDir);
      throw new Error(`Failed to copy theme: ${error.message}`);
    }

    // Track if we're setting this as active (only happens if no active project exists)
    const wasFirstProject = data.projects.length === 0;

    data.projects.push(newProject);
    if (!data.activeProjectId) {
      data.activeProjectId = newProject.id;
    }
    await writeProjectsFile(data);

    res.status(201).json({
      ...newProject,
      wasSetAsActive: wasFirstProject,
    });
  } catch (error) {
    console.error("Project creation error:", error);
    res.status(500).json({ error: error.message || "Failed to create project" });
  }
}

// Set the active project
export async function setActiveProject(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const data = await readProjectsFile();

    if (!data.projects.some((p) => p.id === id)) {
      return res.status(404).json({ error: "Project not found" });
    }

    data.activeProjectId = id;
    await writeProjectsFile(data);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to set active project" });
  }
}

// Update a project
export async function updateProject(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const updates = req.body;
    const data = await readProjectsFile();

    const projectIndex = data.projects.findIndex((p) => p.id === id);
    if (projectIndex === -1) {
      return res.status(404).json({ error: "Project not found" });
    }

    const currentProject = data.projects[projectIndex];

    // Ensure backward compatibility - if project doesn't have slug, use its id
    const currentSlug = currentProject.slug || currentProject.id;

    // Check for duplicate project names (excluding current project)
    if (updates.name && updates.name.trim() !== currentProject.name) {
      const duplicateName = data.projects.find(
        (p) => p.id !== id && p.name.toLowerCase() === updates.name.trim().toLowerCase(),
      );
      if (duplicateName) {
        return res
          .status(400)
          .json({ error: `A project named "${updates.name}" already exists. Please choose a different name.` });
      }
    }

    let updatedProject = { ...currentProject };
    let newProjectId = id;

    // Check if slug is being updated and if it would be different
    if (updates.slug && updates.slug.trim() !== currentSlug) {
      const newSlug = updates.slug.trim();

      // Check for duplicate slugs (excluding current project)
      const duplicateSlug = data.projects.find((p) => p.id !== id && p.slug === newSlug);
      if (duplicateSlug) {
        return res
          .status(400)
          .json({ error: `A project with slug "${newSlug}" already exists. Please choose a different slug.` });
      }

      // Rename the project directory
      const oldDir = getProjectDir(currentSlug);
      const newDir = getProjectDir(newSlug);

      try {
        // Use copy + remove instead of rename for better Windows compatibility
        await fs.copy(oldDir, newDir);
        await new Promise((resolve) => setTimeout(resolve, 100));
        await fs.remove(oldDir);

        // ID remains the same! We only updated the slug/folder.
      } catch (renameError) {
        // If copy succeeded but remove failed, try to clean up the new directory
        try {
          if (await fs.pathExists(newDir)) {
            await fs.remove(newDir);
          }
        } catch (cleanupError) {
          console.warn(`Failed to cleanup new directory after error: ${cleanupError.message}`);
        }
        throw new Error(`Failed to rename project directory: ${renameError.message}`);
      }
    }

    // Update the project data
    updatedProject = {
      ...updatedProject,
      id: id, // ID never changes
      slug: updates.slug || currentSlug, // Ensure slug is always set
      name: updates.name || updatedProject.name,
      description: updates.description !== undefined ? updates.description : updatedProject.description,
      siteUrl: updates.siteUrl !== undefined ? updates.siteUrl : updatedProject.siteUrl,
      updated: new Date().toISOString(),
    };

    // Replace the project in the array
    data.projects[projectIndex] = updatedProject;

    await writeProjectsFile(data);
    res.json(updatedProject);
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ error: error.message || "Failed to update project" });
  }
}

// Delete a project
export async function deleteProject(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const data = await readProjectsFile();

    const projectIndex = data.projects.findIndex((p) => p.id === id);
    if (projectIndex === -1) {
      return res.status(404).json({ error: "Project not found" });
    }

    const project = data.projects[projectIndex];
    const projectName = project.name;
    const projectSlug = project.slug || project.id;

    // Remove from array AFTER we've captured the data we need
    data.projects.splice(projectIndex, 1);
    if (data.activeProjectId === id) {
      data.activeProjectId = data.projects[0]?.id || null;
    }

    await writeProjectsFile(data);

    // Delete project directory using the slug we captured earlier
    const projectDir = getProjectDir(projectSlug);
    await fs.remove(projectDir);

    // Clean up all exports for this project
    try {
      const { cleanupProjectExports } = await import("./exportController.js");
      await cleanupProjectExports(id);
    } catch (exportCleanupError) {
      console.warn(`Failed to clean up exports for project ${id}:`, exportCleanupError);
      // Don't fail the project deletion if export cleanup fails
    }

    res.json({
      success: true,
      message: `Project "${projectName}" and all associated files have been deleted successfully`,
      activeProjectId: data.activeProjectId,
    });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ error: "Failed to delete project" });
  }
}

// Duplicate a project
export async function duplicateProject(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const originalProjectId = req.params.id;
    const data = await readProjectsFile();

    // Find the original project
    const originalProject = data.projects.find((p) => p.id === originalProjectId);
    if (!originalProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Determine base name for copying (similar to page duplication logic)
    let baseName = originalProject.name;
    if (baseName.match(/^Copy( \d+)? of /)) {
      baseName = baseName.replace(/^Copy( \d+)? of /, "");
    }

    // Find the highest copy number for this base name
    let copyNumber = 0;
    const copyRegex = new RegExp(`^Copy( (\\d+))? of ${baseName}$`);
    data.projects.forEach((project) => {
      const match = project.name.match(copyRegex);
      if (match) {
        const num = match[2] ? parseInt(match[2]) : 1;
        copyNumber = Math.max(copyNumber, num);
      }
    });

    // Generate the new name and slug
    const newName = copyNumber === 0 ? `Copy of ${baseName}` : `Copy ${copyNumber + 1} of ${baseName}`;
    const newSlug = await generateUniqueProjectId(newName, data.projects);

    // Create the new project metadata
    const newProject = {
      ...originalProject,
      id: uuidv4(), // ✅ Generate new stable UUID
      slug: newSlug, // Permanent folder identifier
      name: newName,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    // Copy the entire project directory
    // Use slug for directory path, not ID
    const originalSlug = originalProject.slug || originalProject.id;
    const originalDir = getProjectDir(originalSlug);
    const newDir = getProjectDir(newSlug);

    try {
      await fs.copy(originalDir, newDir);

      // Update any internal references that might contain the old project ID
      // For now, most references are relative, so this might not be needed
      // But we could add logic here to update media.json paths if needed
    } catch (copyError) {
      // If copy fails, clean up and throw error
      try {
        await fs.remove(newDir);
      } catch (cleanupError) {
        // Silently handle cleanup errors
      }
      throw new Error(`Failed to copy project files: ${copyError.message}`);
    }

    // Add the new project to the list
    data.projects.push(newProject);
    await writeProjectsFile(data);

    res.status(201).json(newProject);
  } catch (error) {
    console.error("Error duplicating project:", error);
    res.status(500).json({ error: error.message || "Failed to duplicate project" });
  }
}

// Get project widgets
export async function getProjectWidgets(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { projectId } = req.params;
    
    // Need to look up project to get the slug/folder name
    const data = await readProjectsFile();
    const project = data.projects.find(p => p.id === projectId);
    
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const projectSlug = project.slug || project.id;
    const projectRootDir = getProjectDir(projectSlug);
    const widgetsBaseDir = path.join(projectRootDir, "widgets");
    const globalWidgetsDir = path.join(widgetsBaseDir, "global");

    // Import core widgets controller
    const { getCoreWidgets } = await import("./coreWidgetsController.js");

    // Check if theme opts out of core widgets
    let includeCoreWidgets = true;
    try {
      const themeJsonPath = path.join(projectRootDir, "theme.json");
      const themeJson = JSON.parse(await fs.readFile(themeJsonPath, "utf8"));
      if (themeJson.useCoreWidgets === false) {
        includeCoreWidgets = false;
      }
    } catch (err) {
      // If there's an error reading theme.json, default to including core widgets
    }

    // Helper function to process a single widget file
    async function processWidgetFile(filePath) {
      try {
        // Ensure it's a liquid file
        if (!filePath.endsWith(".liquid")) {
          return null;
        }
        const content = await fs.readFile(filePath, "utf8");

        // Extract widget schema using HTML parser
        return extractWidgetSchema(content);
      } catch (parseError) {
        // Silently handle widget schema parsing errors
      }
      return null;
    }

    let allSchemas = [];

    // First, get core widgets if not opted out
    if (includeCoreWidgets) {
      try {
        const coreWidgets = await getCoreWidgets();
        allSchemas = allSchemas.concat(coreWidgets);
      } catch (err) {
        // Silently handle core widgets loading errors
      }
    }

    // Process top-level widgets
    try {
      const topLevelEntries = await fs.readdir(widgetsBaseDir, { withFileTypes: true });
      const topLevelFiles = topLevelEntries
        .filter((entry) => entry.isFile())
        .map((entry) => path.join(widgetsBaseDir, entry.name));

      const topLevelSchemas = await Promise.all(topLevelFiles.map(processWidgetFile));
      allSchemas = allSchemas.concat(topLevelSchemas);
    } catch (err) {
      // Ignore if widgetsBaseDir doesn't exist
      if (err.code !== "ENOENT") {
        // Silently handle other directory reading errors
      }
    }

    // Process global widgets
    try {
      const globalEntries = await fs.readdir(globalWidgetsDir, { withFileTypes: true });
      const globalFiles = globalEntries
        .filter((entry) => entry.isFile())
        .map((entry) => path.join(globalWidgetsDir, entry.name));

      const globalSchemas = await Promise.all(globalFiles.map(processWidgetFile));
      allSchemas = allSchemas.concat(globalSchemas);
    } catch (err) {
      // Ignore if globalWidgetsDir doesn't exist
      if (err.code !== "ENOENT") {
        // Silently handle other directory reading errors
      }
    }

    // Filter out nulls (files without schemas or errors)
    const validSchemas = allSchemas.filter((schema) => schema !== null);

    res.json(validSchemas);
  } catch (error) {
    // Broader catch for unexpected errors
    res.status(500).json({ error: `Failed to get project widgets: ${error.message}` });
  }
}
