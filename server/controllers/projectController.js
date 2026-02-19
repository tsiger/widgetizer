import fs from "fs-extra";
import path from "path";
import * as themeController from "./themeController.js";
import archiver from "archiver";
import {
  DATA_DIR,
  APP_ROOT,
  getUserDataDir,
  getProjectDir,
  getProjectPagesDir,
  getProjectMenusDir,
  getThemeDir,
} from "../config.js";
import { v4 as uuidv4 } from "uuid";
import { ZIP_MIME_TYPES } from "../utils/mimeTypes.js";
import { isNewerVersion } from "../utils/semver.js";
import {
  readProjectsData,
  writeProjectsData,
} from "../db/repositories/projectRepository.js";
import * as mediaRepo from "../db/repositories/mediaRepository.js";
import { stripHtmlTags } from "../services/sanitizationService.js";
import { generateUniqueSlug } from "../utils/slugHelpers.js";
import { generateCopyName } from "../utils/namingHelpers.js";
import { enrichNewProjectReferences, remapDuplicatedProjectUuids } from "../utils/linkEnrichment.js";
import { processTemplatesRecursive } from "../utils/templateHelpers.js";
import multer from "multer";
import { readAppSettingsFile } from "./appSettingsController.js";

// Make sure the user-scoped projects directory exists
async function ensureDirectories(userId = "local") {
  await fs.ensureDir(path.join(getUserDataDir(userId), "projects"));
}

/**
 * Reads the projects metadata from SQLite.
 * @param {string} userId
 * @returns {Promise<{projects: Array<object>, activeProjectId: string|null}>}
 */
export async function readProjectsFile(userId = "local") {
  return readProjectsData(userId);
}

/**
 * Writes the projects metadata to SQLite.
 * @param {{projects: Array<object>, activeProjectId: string|null}} data
 * @param {string} userId
 */
export async function writeProjectsFile(data, userId = "local") {
  writeProjectsData(data, userId);
}

/**
 * Retrieves all projects with enriched metadata including theme update status.
 * @param {import('express').Request} _ - Express request object (unused)
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function getAllProjects(req, res) {
  try {
    await ensureDirectories(req.userId);
    const data = await readProjectsFile(req.userId);

    // Enrich projects with hasThemeUpdate flag and theme display name
    const enrichedProjects = await Promise.all(
      data.projects.map(async (project) => {
        let hasThemeUpdate = false;
        let themeName = project.theme; // Fallback to folder ID

        if (project.theme) {
          try {
            // Get theme display name from theme.json
            const themeSourceDir = await themeController.getThemeSourceDir(project.theme);
            const themeJsonPath = path.join(themeSourceDir, "theme.json");
            const themeData = await fs.readJson(themeJsonPath);
            themeName = themeData.name || project.theme;

            // Check for updates - compare project version against theme's current source version
            // (from latest/ snapshot or base), NOT against all available versions
            if (project.themeVersion && themeData.version) {
              if (isNewerVersion(project.themeVersion, themeData.version)) {
                hasThemeUpdate = true;
              }
            }
          } catch {
            // If theme doesn't exist or can't be read, use folder ID as fallback
          }
        }

        return {
          ...project,
          themeName,
          hasThemeUpdate,
        };
      }),
    );

    res.json(enrichedProjects);
  } catch (error) {
    console.error("Error getting projects:", error);
    res.status(500).json({ error: "Failed to get projects" });
  }
}

/**
 * Retrieves the currently active project.
 * @param {import('express').Request} _ - Express request object (unused)
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function getActiveProject(req, res) {
  try {
    // Read the projects file
    const data = await readProjectsFile(req.userId);

    // Find the active project
    const activeProject = data.projects.find((p) => p.id === data.activeProjectId);

    // Return the active project or null if no active project
    res.json(activeProject || null);
  } catch (error) {
    console.error("Error getting active project:", error);
    res.status(500).json({ error: "Failed to get active project" });
  }
}

/**
 * Creates a new project with the specified theme and configuration.
 * Copies theme assets and initializes project structure including pages and menus.
 * @param {import('express').Request} req - Express request object with project data in body
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function createProject(req, res) {
  try {
    const { name, folderName: providedFolderName, description, theme, siteUrl, receiveThemeUpdates, preset } = req.body;

    // Defensive check: ensure name is not empty after sanitization
    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ error: "Project name is required." });
    }

    const data = await readProjectsFile(req.userId);

    // Check for duplicate project names
    const duplicateName = data.projects.find((p) => p.name.toLowerCase() === name.trim().toLowerCase());
    if (duplicateName) {
      return res
        .status(400)
        .json({ error: `A project named "${name}" already exists. Please choose a different name.` });
    }

    // Use provided folderName or generate one from name
    let folderName;
    if (providedFolderName && providedFolderName.trim()) {
      folderName = providedFolderName.trim();
      // Validate folderName format
      const folderNamePattern = /^[a-z0-9-]+$/;
      if (!folderNamePattern.test(folderName)) {
        return res.status(400).json({ error: "Folder Name can only contain lowercase letters, numbers, and hyphens" });
      }
      // Check for duplicate folderNames
      const duplicateFolderName = data.projects.find((p) => p.folderName === folderName);
      if (duplicateFolderName) {
        return res.status(400).json({
          error: `A project with folder name "${folderName}" already exists. Please choose a different folder name.`,
        });
      }
    } else {
      // Generate folderName from name if not provided
      folderName = await generateUniqueSlug(name, (slug) => data.projects.some((p) => p.id === slug), { fallback: "project" });
    }

    // Use the permanent folderName for directory creation
    const projectDir = getProjectDir(folderName, req.userId);
    await fs.ensureDir(projectDir);

    if (!theme) {
      throw new Error("Theme is required");
    }

    // Copy theme and get the version that was copied
    let themeVersion;
    try {
      // First copy theme assets (excluding templates)
      themeVersion = await themeController.copyThemeToProject(theme, projectDir, ["templates"], req.userId);
    } catch (error) {
      await fs.remove(projectDir);
      throw new Error(`Failed to copy theme: ${error.message}`);
    }

    // Resolve preset paths (templates, menus, settings overrides)
    const { templatesDir: resolvedTemplatesDir, menusDir: presetMenusDir, settingsOverrides } =
      await themeController.resolvePresetPaths(theme, preset, req.userId);

    // If preset has custom menus, replace root menus with preset menus
    if (presetMenusDir) {
      const projectMenusDir = getProjectMenusDir(folderName, req.userId);
      try {
        await fs.remove(projectMenusDir);
        await fs.copy(presetMenusDir, projectMenusDir);
      } catch (error) {
        console.warn(`[ProjectController] Failed to apply preset menus: ${error.message}`);
      }
    }

    const newProject = {
      id: uuidv4(), // ✅ Generate stable UUID
      folderName, // Folder identifier
      name,
      description,
      theme,
      themeVersion, // Version that was installed
      preset: preset || null, // Track which preset was used
      receiveThemeUpdates: receiveThemeUpdates || false, // Opt-in flag (default: off)
      siteUrl: siteUrl && siteUrl.trim() !== "" ? stripHtmlTags(siteUrl.trim()) : "",
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    try {
      // Then handle templates separately, recursively
      const pagesDir = getProjectPagesDir(folderName, req.userId);
      const themeTemplatesDir = resolvedTemplatesDir;

      await processTemplatesRecursive(themeTemplatesDir, pagesDir, async (template, slug, targetPath) => {
        const initializedPage = {
          ...template,
          ...(template.type !== "header" && template.type !== "footer"
            ? {
                uuid: uuidv4(),
                id: slug,
                slug,
                created: new Date().toISOString(),
                updated: new Date().toISOString(),
              }
            : {}),
        };
        await fs.outputFile(targetPath, JSON.stringify(initializedPage, null, 2));
      });

      await enrichNewProjectReferences(folderName, req.userId);
    } catch (error) {
      await fs.remove(projectDir);
      throw new Error(`Failed to process templates: ${error.message}`);
    }

    // Apply preset settings overrides to project's theme.json
    if (settingsOverrides) {
      try {
        const projectThemeJsonPath = path.join(projectDir, "theme.json");
        const themeJsonStr = await fs.readFile(projectThemeJsonPath, "utf8");
        const themeJson = JSON.parse(themeJsonStr);

        if (themeJson.settings && themeJson.settings.global) {
          for (const group of Object.values(themeJson.settings.global)) {
            if (!Array.isArray(group)) continue;
            for (const item of group) {
              if (item.id && settingsOverrides[item.id] !== undefined) {
                item.default = settingsOverrides[item.id];
              }
            }
          }
        }

        await fs.writeFile(projectThemeJsonPath, JSON.stringify(themeJson, null, 2));
      } catch (error) {
        console.warn(`[ProjectController] Failed to apply preset settings overrides: ${error.message}`);
      }
    }

    // Track if we're setting this as active (only happens if no active project exists)
    const wasFirstProject = data.projects.length === 0;

    data.projects.push(newProject);
    if (!data.activeProjectId) {
      data.activeProjectId = newProject.id;
    }
    await writeProjectsFile(data, req.userId);

    res.status(201).json({
      ...newProject,
      wasSetAsActive: wasFirstProject,
    });
  } catch (error) {
    console.error("Project creation error:", error);
    res.status(500).json({ error: error.message || "Failed to create project" });
  }
}

/**
 * Sets a project as the active project.
 * @param {import('express').Request} req - Express request object with project ID in params
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function setActiveProject(req, res) {
  try {
    const { id } = req.params;
    const data = await readProjectsFile(req.userId);

    if (!data.projects.some((p) => p.id === id)) {
      return res.status(404).json({ error: "Project not found" });
    }

    data.activeProjectId = id;
    await writeProjectsFile(data, req.userId);

    res.json({ success: true });
  } catch (error) {
    console.error("Error setting active project:", error);
    res.status(500).json({ error: "Failed to set active project" });
  }
}

/**
 * Updates an existing project's metadata and optionally renames its folder.
 * @param {import('express').Request} req - Express request object with project ID in params and updates in body
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function updateProject(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Defensive check: ensure name is not empty after sanitization
    if (!updates.name || typeof updates.name !== "string" || updates.name.trim() === "") {
      return res.status(400).json({ error: "Project name is required." });
    }

    const data = await readProjectsFile(req.userId);

    const projectIndex = data.projects.findIndex((p) => p.id === id);
    if (projectIndex === -1) {
      return res.status(404).json({ error: "Project not found" });
    }

    const currentProject = data.projects[projectIndex];

    const currentFolderName = currentProject.folderName;

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

    // Check if folderName is being updated and if it would be different
    if (updates.folderName && updates.folderName.trim() !== currentFolderName) {
      const newFolderName = updates.folderName.trim();

      // Validate folderName format (must match create validation)
      const folderNamePattern = /^[a-z0-9-]+$/;
      if (!folderNamePattern.test(newFolderName)) {
        return res.status(400).json({ error: "Folder Name can only contain lowercase letters, numbers, and hyphens" });
      }

      // Check for duplicate folderNames (excluding current project)
      const duplicateFolderName = data.projects.find(
        (p) => p.id !== id && p.folderName === newFolderName,
      );
      if (duplicateFolderName) {
        return res.status(400).json({
          error: `A project with folder name "${newFolderName}" already exists. Please choose a different folder name.`,
        });
      }

      // Rename the project directory
      const oldDir = getProjectDir(currentFolderName, req.userId);
      const newDir = getProjectDir(newFolderName, req.userId);

      try {
        // Use copy + remove instead of rename for better Windows compatibility
        await fs.copy(oldDir, newDir);
        await new Promise((resolve) => setTimeout(resolve, 100));
        await fs.remove(oldDir);
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
      folderName: updates.folderName || currentFolderName, // Ensure folderName is always set
      name: updates.name || updatedProject.name,
      description: updates.description !== undefined ? updates.description : updatedProject.description,
      siteUrl:
        updates.siteUrl !== undefined
          ? updates.siteUrl && updates.siteUrl.trim() !== ""
            ? stripHtmlTags(updates.siteUrl.trim())
            : ""
          : updatedProject.siteUrl,
      // Theme update preferences
      receiveThemeUpdates:
        updates.receiveThemeUpdates !== undefined ? updates.receiveThemeUpdates : updatedProject.receiveThemeUpdates,
      updated: new Date().toISOString(),
    };

    // Replace the project in the array
    data.projects[projectIndex] = updatedProject;

    await writeProjectsFile(data, req.userId);
    res.json(updatedProject);
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ error: error.message || "Failed to update project" });
  }
}

/**
 * Deletes a project and all its associated files including exports.
 * @param {import('express').Request} req - Express request object with project ID in params
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function deleteProject(req, res) {
  try {
    const { id } = req.params;
    const data = await readProjectsFile(req.userId);

    const projectIndex = data.projects.findIndex((p) => p.id === id);
    if (projectIndex === -1) {
      return res.status(404).json({ error: "Project not found" });
    }

    const project = data.projects[projectIndex];
    const projectName = project.name;
    const projectFolderName = project.folderName;

    // Clean up all exports for this project BEFORE removing from DB
    // (writeProjectsFile triggers ON DELETE CASCADE which would delete export records first)
    try {
      const { cleanupProjectExports } = await import("./exportController.js");
      await cleanupProjectExports(id, req.userId);
    } catch (exportCleanupError) {
      console.warn(`Failed to clean up exports for project ${id}:`, exportCleanupError);
      // Don't fail the project deletion if export cleanup fails
    }

    // Remove from array AFTER we've captured the data we need
    data.projects.splice(projectIndex, 1);
    if (data.activeProjectId === id) {
      data.activeProjectId = data.projects[0]?.id || null;
    }

    await writeProjectsFile(data, req.userId);

    // Delete project directory using the folderName we captured earlier
    const projectDir = getProjectDir(projectFolderName, req.userId);
    await fs.remove(projectDir);

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

/**
 * Creates a duplicate of an existing project with a new unique name and folder.
 * @param {import('express').Request} req - Express request object with project ID in params
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function duplicateProject(req, res) {
  try {
    const originalProjectId = req.params.id;
    const data = await readProjectsFile(req.userId);

    // Find the original project
    const originalProject = data.projects.find((p) => p.id === originalProjectId);
    if (!originalProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    const newName = generateCopyName(originalProject.name, data.projects.map((p) => p.name));
    const newFolderName = await generateUniqueSlug(newName, (slug) => data.projects.some((p) => p.id === slug), { fallback: "project" });

    // Create the new project metadata
    const newProject = {
      ...originalProject,
      id: uuidv4(), // ✅ Generate new stable UUID
      folderName: newFolderName, // Permanent folder identifier
      slug: undefined, // Clear legacy slug
      name: newName,
      // Preserve theme info from original
      theme: originalProject.theme,
      themeVersion: originalProject.themeVersion,
      receiveThemeUpdates: originalProject.receiveThemeUpdates || false,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    // Copy the entire project directory
    // Use folderName for directory path, not ID
    const originalFolderName = originalProject.folderName;
    const originalDir = getProjectDir(originalFolderName, req.userId);
    const newDir = getProjectDir(newFolderName, req.userId);

    try {
      await fs.copy(originalDir, newDir);

      try {
        await remapDuplicatedProjectUuids(newFolderName, req.userId);
      } catch (uuidUpdateError) {
        console.warn(`[ProjectController] Failed to update UUIDs in cloned project: ${uuidUpdateError.message}`);
      }
    } catch (copyError) {
      // If copy fails, clean up and throw error
      try {
        await fs.remove(newDir);
      } catch (cleanupError) {
        console.warn(
          `[ProjectController] Failed to clean up new directory after copy failure: ${cleanupError.message}`,
        );
        // Silently handle cleanup errors
      }
      throw new Error(`Failed to copy project files: ${copyError.message}`);
    }

    // Add the new project to the list
    data.projects.push(newProject);
    await writeProjectsFile(data, req.userId);

    // Copy media metadata from original project to the duplicate in SQLite
    try {
      const originalMedia = mediaRepo.getMediaFiles(originalProjectId);
      if (originalMedia.files && originalMedia.files.length > 0) {
        // Regenerate media file IDs to avoid UNIQUE constraint conflicts
        for (const file of originalMedia.files) {
          file.id = uuidv4();
        }
        mediaRepo.writeMediaData(newProject.id, originalMedia);
      }
    } catch (mediaError) {
      console.warn("Could not duplicate media metadata:", mediaError.message);
      // Non-fatal: duplicated project files exist on disk
    }

    res.status(201).json(newProject);
  } catch (error) {
    console.error("Error duplicating project:", error);
    res.status(500).json({ error: error.message || "Failed to duplicate project" });
  }
}

/**
 * Retrieves all available widget schemas for a project, including core and theme widgets.
 * @param {import('express').Request} req - Express request object with project ID in params
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function getProjectWidgets(req, res) {
  try {
    const { projectId } = req.params;

    // Need to look up project to get the slug/folder name
    const data = await readProjectsFile(req.userId);
    const project = data.projects.find((p) => p.id === projectId);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const projectFolderName = project.folderName;
    const projectRootDir = getProjectDir(projectFolderName, req.userId);
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
    } catch (error) {
      console.warn(
        `[ProjectController] Failed to read theme.json, defaulting to core widgets=true. Error: ${error.message}`,
      );
      // If there's an error reading theme.json, default to including core widgets
    }

    // Helper function to process a widget folder (reads schema.json)
    async function processWidgetFolder(folderPath) {
      try {
        const schemaPath = path.join(folderPath, "schema.json");
        const content = await fs.readFile(schemaPath, "utf8");
        return JSON.parse(content);
      } catch (error) {
        console.warn(`[ProjectController] Failed to parse schema for widget at ${folderPath}: ${error.message}`);
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
      } catch (error) {
        console.warn(`[ProjectController] Failed to load core widgets: ${error.message}`);
        // Silently handle core widgets loading errors
      }
    }

    // Process widget folders (new structure: widgets/widget-name/schema.json)
    try {
      const topLevelEntries = await fs.readdir(widgetsBaseDir, { withFileTypes: true });
      const widgetFolders = topLevelEntries
        .filter((entry) => entry.isDirectory() && entry.name !== "global")
        .map((entry) => path.join(widgetsBaseDir, entry.name));

      const folderSchemas = await Promise.all(widgetFolders.map(processWidgetFolder));
      allSchemas = allSchemas.concat(folderSchemas);
    } catch (err) {
      // Ignore if widgetsBaseDir doesn't exist
      if (err.code !== "ENOENT") {
        console.warn(`[ProjectController] Failed to read widget directory: ${err.message}`);
        // Silently handle other directory reading errors
      }
    }

    // Process global widget folders (widgets/global/widget-name/schema.json)
    try {
      const globalEntries = await fs.readdir(globalWidgetsDir, { withFileTypes: true });
      const globalFolders = globalEntries
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.join(globalWidgetsDir, entry.name));

      const globalSchemas = await Promise.all(globalFolders.map(processWidgetFolder));
      allSchemas = allSchemas.concat(globalSchemas);
    } catch (err) {
      // Ignore if globalWidgetsDir doesn't exist
      if (err.code !== "ENOENT") {
        console.warn(`[ProjectController] Failed to read global widget directory: ${err.message}`);
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

/**
 * Retrieves the icon set available for a project from its theme.
 * @param {import('express').Request} req - Express request object with project ID in params
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function getProjectIcons(req, res) {
  try {
    const { projectId } = req.params;

    // Need to look up project to get the folderName/folder name
    const data = await readProjectsFile(req.userId);
    const project = data.projects.find((p) => p.id === projectId);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const projectFolderName = project.folderName;
    const projectRootDir = getProjectDir(projectFolderName, req.userId);
    const iconsPath = path.join(projectRootDir, "assets", "icons.json");

    if (await fs.pathExists(iconsPath)) {
      const content = await fs.readFile(iconsPath, "utf8");
      const iconsData = JSON.parse(content);
      // Return the full icons object (including prefix and icons map)
      res.json(iconsData);
    } else {
      // Return empty structure if no icons file exists
      res.json({ icons: {} });
    }
  } catch (error) {
    console.error("Error getting project icons:", error);
    res.status(500).json({ error: "Failed to get project icons" });
  }
}

/**
 * Exports a project as a downloadable ZIP archive including all files and metadata.
 * @param {import('express').Request} req - Express request object with project ID in params
 * @param {import('express').Response} res - Express response object (streams ZIP)
 * @returns {Promise<void>}
 */
export async function exportProject(req, res) {
  try {
    const { projectId } = req.params;
    const data = await readProjectsFile(req.userId);
    const project = data.projects.find((p) => p.id === projectId);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const projectFolderName = project.folderName;
    const projectDir = getProjectDir(projectFolderName, req.userId);

    if (!(await fs.pathExists(projectDir))) {
      return res.status(404).json({ error: "Project directory not found" });
    }

    // Get app version for manifest
    const PACKAGE_JSON_PATH = path.join(APP_ROOT, "package.json");
    let appVersion = "unknown";
    try {
      const packageJson = await fs.readJson(PACKAGE_JSON_PATH);
      appVersion = packageJson?.version || "unknown";
    } catch (error) {
      console.warn("Could not read package.json version:", error.message);
    }

    // Create export manifest
    const manifest = {
      formatVersion: "1.1",
      exportedAt: new Date().toISOString(),
      widgetizerVersion: appVersion,
      project: {
        name: project.name,
        description: project.description || "",
        theme: project.theme,
        themeVersion: project.themeVersion || null,
        receiveThemeUpdates: project.receiveThemeUpdates || false,
        preset: project.preset || null,
        siteUrl: project.siteUrl || "",
        created: project.created,
        updated: project.updated,
      },
    };

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
    const safeName = project.name.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
    const zipFilename = `${safeName}-export-${timestamp}.zip`;

    // Set response headers
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipFilename}"`);

    // Create ZIP archive
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Maximum compression
    });

    // Handle archiver errors
    archive.on("error", (err) => {
      console.error("Archive error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to create ZIP archive" });
      }
    });

    // Pipe archive data to response
    archive.pipe(res);

    // Add manifest
    archive.append(JSON.stringify(manifest, null, 2), { name: "project-export.json" });

    // Add all project files recursively
    // Exclude system files and directories
    const excludePatterns = [/^\./, /node_modules/, /\.git/];
    const shouldExclude = (filePath) => {
      const relativePath = path.relative(projectDir, filePath);
      return excludePatterns.some((pattern) => pattern.test(relativePath));
    };

    async function addDirectory(dir, baseDir = projectDir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (shouldExclude(fullPath)) continue;

        if (entry.isDirectory()) {
          await addDirectory(fullPath, baseDir);
        } else if (entry.isFile()) {
          const relativePath = path.relative(baseDir, fullPath);
          archive.file(fullPath, { name: relativePath });
        }
      }
    }

    await addDirectory(projectDir);

    // Serialize media metadata from SQLite into the ZIP
    // (media metadata moved from uploads/media.json to SQLite, so it must be explicitly included)
    try {
      const mediaData = mediaRepo.getMediaFiles(project.id);
      if (mediaData.files && mediaData.files.length > 0) {
        archive.append(JSON.stringify(mediaData, null, 2), { name: "uploads/media.json" });
      }
    } catch (mediaError) {
      console.warn("Could not export media metadata:", mediaError.message);
    }

    // Finalize the archive
    await archive.finalize();
  } catch (error) {
    console.error("Error exporting project:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || "Failed to export project" });
    }
  }
}

function isZipFile(file) {
  return ZIP_MIME_TYPES.includes(file.mimetype) || file.originalname.endsWith(".zip");
}

const UPLOAD_TEMP_DIR = path.join(DATA_DIR, "temp");

/**
 * Read the max upload size from app settings (shared by project import + theme upload).
 * Falls back to 500 MB when the setting is unavailable.
 * @returns {Promise<number>} size limit in megabytes
 */
export async function getMaxUploadSizeMB() {
  try {
    const settings = await readAppSettingsFile();
    return settings.export?.maxImportSizeMB || 500;
  } catch {
    return 500;
  }
}

/**
 * Express middleware that configures multer for project ZIP import,
 * reading the max size from app settings. Files are written to disk
 * (data/temp/) instead of buffered in memory.
 */
export async function handleImportUpload(req, res, next) {
  try {
    const maxSizeMB = await getMaxUploadSizeMB();
    await fs.ensureDir(UPLOAD_TEMP_DIR);

    const upload = multer({
      dest: UPLOAD_TEMP_DIR,
      limits: { fileSize: maxSizeMB * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (isZipFile(file)) {
          cb(null, true);
        } else {
          cb(new Error("Only ZIP files are allowed"), false);
        }
      },
    });

    upload.single("projectZip")(req, res, async (err) => {
      if (!err) return next();

      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          error: `File size exceeds the maximum allowed size of ${maxSizeMB}MB. Please reduce the project size or increase the limit in Settings.`,
        });
      }
      return res.status(400).json({ error: err.message || "File upload error" });
    });
  } catch {
    return res.status(500).json({ error: "Failed to configure file upload" });
  }
}

/**
 * Imports a project from an uploaded ZIP archive.
 * Validates the archive structure and theme compatibility before import.
 * @param {import('express').Request} req - Express request object with ZIP file in req.file
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function importProject(req, res) {
  const uploadedFilePath = req.file?.path;
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No ZIP file uploaded" });
    }

    // Check file size against app settings (backup check)
    const maxSizeMB = await getMaxUploadSizeMB();
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    if (req.file.size > maxSizeBytes) {
      return res.status(400).json({
        error: `File size (${(req.file.size / 1024 / 1024).toFixed(2)}MB) exceeds the maximum allowed size of ${maxSizeMB}MB. Please reduce the project size or increase the limit in Settings.`,
      });
    }

    const AdmZip = await import("adm-zip");
    const zip = new AdmZip.default(uploadedFilePath);
    const zipEntries = zip.getEntries();

    if (zipEntries.length === 0) {
      return res.status(400).json({ error: "Uploaded ZIP file is empty" });
    }

    // Find and validate manifest
    const manifestEntry = zipEntries.find((entry) => entry.entryName === "project-export.json");
    if (!manifestEntry) {
      return res.status(400).json({ error: "Invalid project export: missing project-export.json manifest" });
    }

    let manifest;
    try {
      const manifestContent = manifestEntry.getData().toString("utf8");
      manifest = JSON.parse(manifestContent);
    } catch {
      return res.status(400).json({ error: "Invalid project export: corrupted manifest file" });
    }

    // Validate manifest structure
    if (!manifest.project || !manifest.project.name || !manifest.project.theme) {
      return res.status(400).json({ error: "Invalid project export: incomplete manifest" });
    }

    // Check if theme exists
    const themeDir = getThemeDir(manifest.project.theme, req.userId);
    if (!(await fs.pathExists(themeDir))) {
      return res.status(400).json({
        error: `Theme "${manifest.project.theme}" not found in this installation. Please install the theme first.`,
      });
    }

    // Read projects file
    const data = await readProjectsFile(req.userId);

    // Generate unique folderName (checking both projects.json and existing directories)
    let folderName = await generateUniqueSlug(manifest.project.name, (slug) => data.projects.some((p) => p.id === slug), { fallback: "project" });

    // Also check if directory already exists and generate unique name if needed
    let projectDir = getProjectDir(folderName, req.userId);
    let counter = 1;
    while (await fs.pathExists(projectDir)) {
      const baseFolderName = folderName;
      folderName = `${baseFolderName}-${counter}`;
      projectDir = getProjectDir(folderName, req.userId);
      counter++;
      if (counter > 1000) {
        throw new Error("Unable to generate unique folder name after 1000 attempts");
      }
    }

    // Create temporary extraction directory
    const tempDir = path.join(DATA_DIR, "temp", `import-${Date.now()}`);
    await fs.ensureDir(tempDir);

    let newProject = null;
    try {
      // Extract ZIP to temporary directory
      zip.extractAllTo(tempDir, true);

      // Validate extracted structure
      const extractedManifestPath = path.join(tempDir, "project-export.json");
      if (!(await fs.pathExists(extractedManifestPath))) {
        throw new Error("Manifest not found in extracted files");
      }

      // Determine themeVersion: prefer manifest, fallback to project's theme.json
      let themeVersion = manifest.project.themeVersion || null;
      if (!themeVersion) {
        // Fallback for older exports: read from project's theme.json
        const projectThemeJsonPath = path.join(tempDir, "theme.json");
        try {
          if (await fs.pathExists(projectThemeJsonPath)) {
            const projectThemeJson = await fs.readJson(projectThemeJsonPath);
            themeVersion = projectThemeJson.version || null;
          }
        } catch (err) {
          console.warn("Could not read theme.json for version fallback:", err.message);
        }
      }

      // Create new project object (but don't add to projects.json yet)
      newProject = {
        id: uuidv4(),
        folderName,
        name: manifest.project.name,
        description: manifest.project.description || "",
        theme: manifest.project.theme,
        themeVersion,
        receiveThemeUpdates: manifest.project.receiveThemeUpdates || false,
        preset: manifest.project.preset || null,
        siteUrl: manifest.project.siteUrl || "",
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      };

      // Create project directory
      await fs.ensureDir(projectDir);

      // Copy all files from temp directory to project directory (excluding manifest)
      const entries = await fs.readdir(tempDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === "project-export.json") continue; // Skip manifest

        const sourcePath = path.join(tempDir, entry.name);
        const targetPath = path.join(projectDir, entry.name);

        if (entry.isDirectory()) {
          await fs.copy(sourcePath, targetPath);
        } else {
          await fs.copy(sourcePath, targetPath);
        }
      }

      // Verify that files were actually copied
      const copiedEntries = await fs.readdir(projectDir);
      if (copiedEntries.length === 0) {
        throw new Error("No files were copied to project directory");
      }

      // Only add project to projects.json AFTER successful file copy
      data.projects.push(newProject);
      await writeProjectsFile(data, req.userId);

      // Restore media metadata from the exported media.json into SQLite
      const mediaJsonPath = path.join(projectDir, "uploads", "media.json");
      try {
        if (await fs.pathExists(mediaJsonPath)) {
          const mediaData = await fs.readJson(mediaJsonPath);
          if (mediaData.files && mediaData.files.length > 0) {
            // Regenerate media file IDs to avoid UNIQUE constraint conflicts
            // (the original project may still exist in the database)
            for (const file of mediaData.files) {
              file.id = uuidv4();
            }
            mediaRepo.writeMediaData(newProject.id, mediaData);
          }
          // Remove the media.json file — metadata now lives in SQLite
          await fs.remove(mediaJsonPath);
        }
      } catch (mediaError) {
        console.warn("Could not restore media metadata from export:", mediaError.message);
        // Non-fatal: project is still usable, media files exist on disk
      }

      // Clean up temporary files (extraction dir + uploaded ZIP)
      await fs.remove(tempDir);
      if (uploadedFilePath) await fs.remove(uploadedFilePath).catch(() => {});

      res.status(201).json({
        ...newProject,
        importedFrom: manifest.exportedAt,
        widgetizerVersion: manifest.widgetizerVersion,
      });
    } catch (error) {
      // Clean up on error - remove project from projects.json if it was added
      if (newProject) {
        try {
          const currentData = await readProjectsFile(req.userId);
          const projectIndex = currentData.projects.findIndex((p) => p.id === newProject.id);
          if (projectIndex !== -1) {
            currentData.projects.splice(projectIndex, 1);
            await writeProjectsFile(currentData, req.userId);
          }
        } catch (cleanupError) {
          console.warn("Failed to remove project from projects.json after error:", cleanupError);
        }
      }

      // Clean up directories
      try {
        if (await fs.pathExists(tempDir)) {
          await fs.remove(tempDir);
        }
        if (projectDir && (await fs.pathExists(projectDir))) {
          await fs.remove(projectDir);
        }
      } catch (cleanupError) {
        console.warn("Failed to clean up directories after import error:", cleanupError);
      }
      throw error;
    }
  } catch (error) {
    // Always clean up the uploaded temp file
    if (uploadedFilePath) await fs.remove(uploadedFilePath).catch(() => {});
    console.error("Error importing project:", error);
    res.status(500).json({ error: error.message || "Failed to import project" });
  }
}

// ============================================================================
// Theme Update API Handlers
// ============================================================================

/**
 * Checks if a theme update is available for a project.
 * @param {import('express').Request} req - Express request object with project ID in params
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function getThemeUpdateStatus(req, res) {
  try {
    const { id } = req.params;
    const { checkForUpdates } = await import("../services/themeUpdateService.js");
    const status = await checkForUpdates(id, req.userId);
    res.json(status);
  } catch (error) {
    console.error("Error checking theme update status:", error);
    if (error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || "Failed to check theme update status" });
  }
}

/**
 * Toggles the theme update preference for a project.
 * @param {import('express').Request} req - Express request object with project ID in params and enabled flag in body
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function toggleProjectThemeUpdates(req, res) {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== "boolean") {
      return res.status(400).json({ error: "'enabled' must be a boolean" });
    }

    const { toggleThemeUpdates } = await import("../services/themeUpdateService.js");
    const result = await toggleThemeUpdates(id, enabled, req.userId);
    res.json(result);
  } catch (error) {
    console.error("Error toggling theme updates:", error);
    if (error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || "Failed to toggle theme updates" });
  }
}

/**
 * Applies available theme updates to a project.
 * @param {import('express').Request} req - Express request object with project ID in params
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function applyProjectThemeUpdate(req, res) {
  try {
    const { id } = req.params;
    const { applyThemeUpdate } = await import("../services/themeUpdateService.js");
    const result = await applyThemeUpdate(id, req.userId);
    res.json(result);
  } catch (error) {
    console.error("Error applying theme update:", error);
    if (error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || "Failed to apply theme update" });
  }
}
