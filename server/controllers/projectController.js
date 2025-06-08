import fs from "fs-extra";
import path from "path";
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
  while (projects.some((p) => p.id === uniqueId)) {
    uniqueId = `${baseId}-${counter}`;
    counter++;
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
  try {
    const { name, description, theme } = req.body;
    const data = await readProjectsFile();

    // Check for duplicate project names
    const duplicateName = data.projects.find((p) => p.name.toLowerCase() === name.trim().toLowerCase());
    if (duplicateName) {
      return res
        .status(400)
        .json({ error: `A project named "${name}" already exists. Please choose a different name.` });
    }

    const id = await generateUniqueProjectId(name, data.projects);

    const newProject = {
      id,
      name,
      description,
      theme,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    const projectDir = getProjectDir(id);
    await fs.ensureDir(projectDir);

    if (!theme) {
      throw new Error("Theme is required");
    }

    try {
      // First copy theme assets (excluding templates)
      await themeController.copyThemeToProject(theme, projectDir, ["templates"]);

      // Then handle templates separately, recursively
      const pagesDir = getProjectPagesDir(id);
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

            // Use the filename (without extension) as the base for the slug
            // For nested files, the slug might need adjustment depending on desired URL structure,
            // but for now, we'll use the simple filename. Consider adjusting if needed.
            const baseSlug = path.basename(entry.name, ".json");

            // Create initialized page
            const initializedPage = {
              ...templatePage,
              // Only add metadata for non-global widgets
              ...(templatePage.type !== "header" && templatePage.type !== "footer"
                ? {
                    id: path.relative(themeTemplatesDir, sourcePath).replace(/\\/g, "/").replace(".json", ""),
                    slug: baseSlug,
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
      const projectMenusDir = getProjectMenusDir(id);
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
                slug: menuSlug,
                created: new Date().toISOString(),
                updated: new Date().toISOString(),
              };
              // Overwrite the copied file with the enriched version
              await fs.outputFile(projectMenuPath, JSON.stringify(enrichedMenu, null, 2));
            } catch (menuReadError) {
              console.warn(`Skipping menu enrichment for ${menuFile}: ${menuReadError.message}`);
            }
          }
        }
      } catch (themeMenuAccessError) {
        // If theme menus directory doesn't exist, do nothing (no menus to enrich)
        if (themeMenuAccessError.code !== "ENOENT") {
          console.warn(`Error checking theme menus directory ${themeMenusDir}: ${themeMenuAccessError.message}`);
        }
      }
    } catch (error) {
      await fs.remove(projectDir);
      throw new Error(`Failed to copy theme: ${error.message}`);
    }

    data.projects.push(newProject);
    if (!data.activeProjectId) {
      data.activeProjectId = newProject.id;
    }
    await writeProjectsFile(data);

    res.status(201).json(newProject);
  } catch (error) {
    console.error("Project creation error:", error);
    res.status(500).json({ error: error.message || "Failed to create project" });
  }
}

// Set the active project
export async function setActiveProject(req, res) {
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
  try {
    const { id } = req.params;
    const updates = req.body;
    const data = await readProjectsFile();

    const projectIndex = data.projects.findIndex((p) => p.id === id);
    if (projectIndex === -1) {
      return res.status(404).json({ error: "Project not found" });
    }

    const currentProject = data.projects[projectIndex];

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
    let newProjectId = id; // Default to keeping the same ID

    // Check if the name is being updated and if it's different
    if (updates.name && updates.name.trim() !== currentProject.name) {
      // Generate a new ID based on the new name
      const potentialNewId = await generateUniqueProjectId(
        updates.name,
        data.projects.filter((p) => p.id !== id),
      );

      // Only rename if the new ID would be different from current ID
      if (potentialNewId !== id) {
        const oldDir = getProjectDir(id);
        const newDir = getProjectDir(potentialNewId);

        try {
          // Rename the project directory
          await fs.rename(oldDir, newDir);
          newProjectId = potentialNewId;

          // Update activeProjectId if this project is currently active
          if (data.activeProjectId === id) {
            data.activeProjectId = newProjectId;
          }

          console.log(`Project directory renamed: ${id} → ${newProjectId}`);
        } catch (renameError) {
          console.error(`Failed to rename project directory from ${id} to ${potentialNewId}:`, renameError);
          throw new Error(`Failed to rename project directory: ${renameError.message}`);
        }
      }
    }

    // Update the project data
    updatedProject = {
      ...updatedProject,
      id: newProjectId,
      name: updates.name || updatedProject.name,
      description: updates.description !== undefined ? updates.description : updatedProject.description,
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
  try {
    const { id } = req.params;
    const data = await readProjectsFile();

    const projectIndex = data.projects.findIndex((p) => p.id === id);
    if (projectIndex === -1) {
      return res.status(404).json({ error: "Project not found" });
    }

    data.projects.splice(projectIndex, 1);
    if (data.activeProjectId === id) {
      data.activeProjectId = data.projects[0]?.id || null;
    }

    await writeProjectsFile(data);

    // Delete project directory using slug
    const projectDir = getProjectDir(id);
    await fs.remove(projectDir);

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ error: "Failed to delete project" });
  }
}

// Duplicate a project
export async function duplicateProject(req, res) {
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
    const newId = await generateUniqueProjectId(newName, data.projects);

    // Create the new project metadata
    const newProject = {
      ...originalProject,
      id: newId,
      name: newName,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    // Copy the entire project directory
    const originalDir = getProjectDir(originalProjectId);
    const newDir = getProjectDir(newId);

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
        console.warn(`Failed to cleanup after copy error: ${cleanupError.message}`);
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
  try {
    const { projectId } = req.params;
    const projectRootDir = getProjectDir(projectId);
    const widgetsBaseDir = path.join(projectRootDir, "widgets");
    const globalWidgetsDir = path.join(widgetsBaseDir, "global");

    // Helper function to process a single widget file
    async function processWidgetFile(filePath) {
      try {
        // Ensure it's a liquid file
        if (!filePath.endsWith(".liquid")) {
          return null;
        }
        const content = await fs.readFile(filePath, "utf8");

        // Extract widget schema from HTML content
        const scriptTagStart = '<script type="application/json" data-widget-schema>';
        const scriptTagEnd = "</script>";
        const startIndex = content.indexOf(scriptTagStart);
        const endIndex = content.indexOf(scriptTagEnd, startIndex);

        if (startIndex !== -1 && endIndex !== -1) {
          const jsonStr = content.substring(startIndex + scriptTagStart.length, endIndex).trim();
          const schema = JSON.parse(jsonStr);
          return schema;
        }
      } catch (parseError) {
        console.warn(`Failed to process widget schema from ${filePath}: ${parseError.message}`);
      }
      return null;
    }

    let allSchemas = [];

    // Process top-level widgets
    try {
      const topLevelEntries = await fs.readdir(widgetsBaseDir, { withFileTypes: true });
      const topLevelFiles = topLevelEntries
        .filter((entry) => entry.isFile())
        .map((entry) => path.join(widgetsBaseDir, entry.name));

      const topLevelSchemas = await Promise.all(topLevelFiles.map(processWidgetFile));
      allSchemas = allSchemas.concat(topLevelSchemas);
    } catch (err) {
      // Ignore if widgetsBaseDir doesn't exist, but log other errors
      if (err.code !== "ENOENT") {
        console.error(`Error reading top-level widgets directory ${widgetsBaseDir}:`, err);
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
      // Ignore if globalWidgetsDir doesn't exist, but log other errors
      if (err.code !== "ENOENT") {
        console.error(`Error reading global widgets directory ${globalWidgetsDir}:`, err);
      }
    }

    // Filter out nulls (files without schemas or errors)
    const validSchemas = allSchemas.filter((schema) => schema !== null);

    res.json(validSchemas);
  } catch (error) {
    // Broader catch for unexpected errors
    console.error(`Unexpected error in getProjectWidgets for project ${req.params.projectId}:`, error);
    res.status(500).json({ error: `Failed to get project widgets: ${error.message}` });
  }
}
