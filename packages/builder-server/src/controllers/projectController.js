import fs from "fs-extra";
import path from "path";
import * as themeController from "./themeController.js";
import archiver from "archiver";
import {
  DATA_DIR,
  APP_ROOT,
  getProjectDir,
  getProjectImagesDir,
  getThemeDir,
} from "../config.js";
import { randomUUID } from "crypto";
import { ZIP_MIME_TYPES } from "../utils/mimeTypes.js";
import { hasAvailableUpdate } from "../utils/updateStatus.js";
import * as projectRepo from "../db/repositories/projectRepository.js";
import * as mediaRepo from "../db/repositories/mediaRepository.js";
import { stripHtmlTags } from "../services/sanitizationService.js";
import { isValidSiteUrl } from "@widgetizer/core/urlSafety";
import { refreshMediaUsageAfterStructuralChange } from "../services/mediaUsageService.js";
import { generateUniqueSlug } from "../utils/slugHelpers.js";

import { generateCopyName } from "../utils/namingHelpers.js";
import {
  remapDuplicatedProjectUuids,
  remapCollectionItemMenuRefs,
  remapCollectionItemLinkRefs,
  enrichSeededRichtextLinks,
} from "../utils/linkEnrichment.js";
import { scaffoldProjectContent } from "../utils/projectScaffold.js";

import multer from "multer";
import { readAppSettingsFile } from "./appSettingsController.js";

// Make sure the projects directory exists
async function ensureDirectories() {
  await fs.ensureDir(path.join(DATA_DIR, "projects"));
}

function isOptionalBoolean(value) {
  return value === undefined || typeof value === "boolean";
}

/**
 * Seed preset collection ITEM data into a freshly created project. Each item gets
 * a fresh uuid + created/updated timestamps. Items whose type is not defined by
 * the (theme-owned) collection-types schemas are skipped with a warning — preset
 * collection-type SCHEMAS are never honored; the schemas
 * come from the theme via copyThemeToProject. fs-based against the project dir
 * (mirrors projectScaffold), so it stays adapter-agnostic.
 *
 * @param {string} folderName - project folder name
 * @param {string} presetCollectionsDir - absolute path to the preset's collections/
 */
export async function seedPresetCollections(folderName, presetCollectionsDir) {
  // Known collection types = the theme's collection-types/ dirs that ship a
  // schema.json (copied into the project on create). Never the preset's.
  const projectDir = getProjectDir(folderName);
  const collectionTypesDir = path.join(projectDir, "collection-types");
  const knownTypes = new Set();
  try {
    const typeDirs = await fs.readdir(collectionTypesDir, { withFileTypes: true });
    for (const dirent of typeDirs) {
      if (dirent.isDirectory() && (await fs.pathExists(path.join(collectionTypesDir, dirent.name, "schema.json")))) {
        knownTypes.add(dirent.name);
      }
    }
  } catch {
    // No collection-types in the theme — nothing to seed against.
  }

  // Source preset uuid -> freshly seeded uuid, so preset menu/link refs remap (#11).
  const oldToNewItemUuid = new Map();
  const typeEntries = await fs.readdir(presetCollectionsDir, { withFileTypes: true });

  for (const typeEntry of typeEntries) {
    if (!typeEntry.isDirectory()) continue;
    const type = typeEntry.name;
    if (!knownTypes.has(type)) {
      console.warn(
        `[ProjectController] Skipping preset collection "${type}": the theme defines no such collection type.`,
      );
      continue;
    }

    const srcTypeDir = path.join(presetCollectionsDir, type);
    const destTypeDir = path.join(projectDir, "collections", type);
    await fs.ensureDir(destTypeDir);
    const names = (await fs.readdir(srcTypeDir)).filter((n) => n.endsWith(".json") && n !== "_order.json");

    for (const name of names) {
      const slug = name.replace(/\.json$/, "");
      const raw = await fs.readJSON(path.join(srcTypeDir, name));
      const now = new Date().toISOString();
      const newUuid = randomUUID();
      if (raw.uuid) oldToNewItemUuid.set(raw.uuid, newUuid);
      const seeded = { ...raw, id: slug, slug, uuid: newUuid, created: now, updated: now };
      await fs.outputFile(path.join(destTypeDir, `${slug}.json`), JSON.stringify(seeded, null, 2));
    }

    // Carry over a manual order file verbatim if the preset shipped one.
    const orderSrc = path.join(srcTypeDir, "_order.json");
    if (await fs.pathExists(orderSrc)) {
      await fs.copy(orderSrc, path.join(destTypeDir, "_order.json"));
    }
  }

  // Preset menus + widget/item `link` settings may ship stable collection-item
  // references against the preset's source uuids; remap them to the freshly
  // seeded uuids so the links resolve (#11).
  await remapCollectionItemMenuRefs(folderName, oldToNewItemUuid);
  await remapCollectionItemLinkRefs(folderName, oldToNewItemUuid);

  // Richtext stable links: presets ship richtext with the uuid attrs
  // stripped, and the seeded item uuids only exist now — so stamp data-page-uuid /
  // data-collection-item-uuid on all richtext (pages, globals, items) from their hrefs.
  await enrichSeededRichtextLinks(folderName);
}

/**
 * Seed preset starter media into a freshly created project. A preset may ship
 * starter images under `presets/<id>/media/`: `images/` holds the binaries
 * (originals + pre-generated variants) and `manifest.json` describes them. The
 * binaries are copied into the project's uploads/images/ verbatim (their
 * /uploads/images/... paths are identical across projects, so image-field values
 * shipped in preset templates/collections resolve as-is); each manifest entry is
 * registered in the media DB with a fresh, project-scoped UUID.
 *
 * @param {string} folderName - project folder name (filesystem)
 * @param {string} projectId  - project UUID (DB key for media_files.project_id)
 * @param {string} presetMediaDir - absolute path to the preset's media/ dir
 */
export async function seedPresetMedia(folderName, projectId, presetMediaDir) {
  const srcImagesDir = path.join(presetMediaDir, "images");
  if (await fs.pathExists(srcImagesDir)) {
    await fs.copy(srcImagesDir, getProjectImagesDir(folderName));
  }

  const manifestPath = path.join(presetMediaDir, "manifest.json");
  if (!(await fs.pathExists(manifestPath))) return;

  const manifest = await fs.readJSON(manifestPath);
  const now = new Date().toISOString();
  for (const entry of manifest.files || []) {
    if (!entry.filename) continue;
    mediaRepo.addMediaFile(projectId, {
      id: randomUUID(),
      filename: entry.filename,
      originalName: entry.originalName || entry.filename,
      type: entry.type || "",
      size: entry.size || 0,
      uploaded: now,
      path: entry.path || `/uploads/images/${entry.filename}`,
      width: entry.width || null,
      height: entry.height || null,
      metadata: { alt: entry.alt || "", title: entry.title || "", caption: entry.caption || "" },
      sizes: entry.sizes || {},
    });
  }
}

/**
 * Resolve a desired project name and folder against existing projects, returning
 * collision-free values. Used by both create and import to share identical
 * disambiguation behavior:
 *   - If the name doesn't collide (case-insensitive), it's kept as-is.
 *   - Otherwise we append "(Copy)" / "(Copy N)" using the same scheme as duplicate.
 *   - The folder is always passed through generateUniqueSlug, which sanitizes
 *     the input and appends -1, -2, ... until both the DB and filesystem are clear.
 *
 * @param {string} desiredName - The user-typed or imported project name
 * @param {string} [desiredFolder] - Optional folder slug; if absent, derived from name
 * @returns {Promise<{ name: string, folder: string }>}
 */
async function resolveProjectIdentity(desiredName, desiredFolder) {
  const existingNames = projectRepo.getAllProjects().map((p) => p.name);
  const collides = existingNames.some((existing) => existing.toLowerCase() === desiredName.toLowerCase());
  const resolvedName = collides
    ? generateCopyName(desiredName, existingNames, { caseInsensitive: true })
    : desiredName;

  const folderSeed = desiredFolder && desiredFolder.trim() ? desiredFolder : resolvedName;
  const resolvedFolder = await generateUniqueSlug(
    folderSeed,
    async (slug) => projectRepo.projectFolderExists(slug, null) || (await fs.pathExists(getProjectDir(slug))),
    { fallback: "project" },
  );

  return { name: resolvedName, folder: resolvedFolder };
}

/**
 * Retrieves all projects with enriched metadata including theme update status.
 * @param {import('express').Request} _ - Express request object (unused)
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function getAllProjects(req, res) {
  try {
    await ensureDirectories();
    const projects = projectRepo.getAllProjects();
    const themeMetadataById = new Map();

    const getThemeMetadata = (themeId) => {
      if (!themeMetadataById.has(themeId)) {
        themeMetadataById.set(themeId, themeController.readThemeSourceMetadata(themeId));
      }

      return themeMetadataById.get(themeId);
    };

    // Enrich projects with hasThemeUpdate flag and theme display name
    const enrichedProjects = await Promise.all(
      projects.map(async (project) => {
        let hasThemeUpdate = false;
        let themeName = project.theme; // Fallback to folder ID

        if (project.theme) {
          try {
            const { theme: themeData } = await getThemeMetadata(project.theme);
            themeName = themeData.name || project.theme;

            // Only flag updates if the project has opted in via receiveThemeUpdates
            if (project.receiveThemeUpdates) {
              hasThemeUpdate = hasAvailableUpdate(project.themeVersion, themeData.version);
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
    const activeProjectId = projectRepo.getActiveProjectId();
    let activeProject = activeProjectId ? projectRepo.getProjectById(activeProjectId) : null;

    // Fallback: if no active project but user has projects, auto-activate the first one.
    // This handles edge cases like deleted active projects, missing DB records, or migrated data.
    if (!activeProject) {
      const projects = projectRepo.getAllProjects();
      if (projects.length > 0) {
        projectRepo.setActiveProjectId(projects[0].id);
        activeProject = projects[0];
      }
    }

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
    const { name, folderName: providedFolderName, description, theme, siteTitle, siteUrl, receiveThemeUpdates, preset } = req.body;

    // Defensive check: ensure name is not empty after sanitization
    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ error: "Project name is required." });
    }

    if (!isValidSiteUrl(siteUrl)) {
      return res.status(400).json({ error: "Invalid Website Address. Please enter a valid URL (e.g., https://mysite.com)." });
    }

    if (!isOptionalBoolean(receiveThemeUpdates)) {
      return res.status(400).json({ error: "receiveThemeUpdates must be a boolean." });
    }

    // If a folder name is explicitly provided, validate its format. Collisions on
    // either name or folder are no longer hard errors — resolveProjectIdentity
    // disambiguates them with suffixes, matching the import flow.
    if (providedFolderName && providedFolderName.trim()) {
      const folderNamePattern = /^[a-z0-9-]+$/;
      if (!folderNamePattern.test(providedFolderName.trim())) {
        return res.status(400).json({ error: "Folder Name can only contain lowercase letters, numbers, and hyphens" });
      }
    }

    const { name: resolvedName, folder: folderName } = await resolveProjectIdentity(
      name.trim(),
      providedFolderName,
    );

    if (!theme) {
      throw new Error("Theme is required");
    }

    // Use the permanent folderName for directory creation, then scaffold the
    // project content (theme copy + templates → pages + link enrichment). The
    // dir-explicit scaffold lives in utils/projectScaffold so other shells can
    // reuse it against a per-user dir.
    const projectDir = getProjectDir(folderName);
    const themeVersion = await scaffoldProjectContent({ projectDir, theme, preset });

    // Seed preset collection ITEM data + starter media (schemas always come from
    // the theme via copyThemeToProject — never the preset).
    // Collection items are fs-only so they seed before the DB row; media files
    // register against the project_id, so that runs after createProject below.
    const { collectionsDir: presetCollectionsDir, mediaDir: presetMediaDir } =
      await themeController.resolvePresetPaths(theme, preset);
    if (presetCollectionsDir) {
      try {
        await seedPresetCollections(folderName, presetCollectionsDir);
      } catch (error) {
        console.warn(`[ProjectController] Failed to seed preset collections: ${error.message}`);
      }
    }

    const newProject = {
      id: randomUUID(), // ✅ Generate stable UUID
      folderName, // Folder identifier
      name: resolvedName,
      description,
      siteTitle: siteTitle && siteTitle.trim() !== "" ? stripHtmlTags(siteTitle.trim()) : "",
      theme,
      themeVersion, // Version that was installed
      preset: preset || null, // Track which preset was used
      receiveThemeUpdates: receiveThemeUpdates ?? false, // Opt-in flag (default: off)
      siteUrl: siteUrl && siteUrl.trim() !== "" ? stripHtmlTags(siteUrl.trim()) : "",
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    // Track if we're setting this as active (only happens if no active project exists)
    const currentActiveId = projectRepo.getActiveProjectId();
    const wasFirstProject = !currentActiveId;

    projectRepo.createProject(newProject);

    // Seed preset starter media (binaries + DB records) now that the project row
    // exists for the media_files foreign key — before the usage rescan below so
    // the seeded files are picked up.
    if (presetMediaDir) {
      try {
        await seedPresetMedia(folderName, newProject.id, presetMediaDir);
      } catch (error) {
        console.warn(`[ProjectController] Failed to seed preset media: ${error.message}`);
      }
    }

    await refreshMediaUsageAfterStructuralChange(newProject.id, "project creation");
    if (!currentActiveId) {
      projectRepo.setActiveProjectId(newProject.id);
    }

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
    const project = projectRepo.getProjectById(id);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    projectRepo.setActiveProjectId(id);

    // Clear the rendering service's icons cache so the new project
    // loads its own icons.json on next render
    if (global.iconsCache) {
      global.iconsCache.delete(id);
    }

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

    const currentProject = projectRepo.getProjectById(id);
    if (!currentProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    const currentFolderName = currentProject.folderName;

    // Check for duplicate project names (excluding current project)
    if (updates.name && updates.name.trim() !== currentProject.name) {
      if (projectRepo.projectNameExists(updates.name.trim(), id)) {
        return res
          .status(400)
          .json({ error: `A project named "${updates.name}" already exists. Please choose a different name.` });
      }
    }

    // Check if folderName is being updated and if it would be different
    if (updates.folderName && updates.folderName.trim() !== currentFolderName) {
      const newFolderName = updates.folderName.trim();

      // Validate folderName format (must match create validation)
      const folderNamePattern = /^[a-z0-9-]+$/;
      if (!folderNamePattern.test(newFolderName)) {
        return res.status(400).json({ error: "Folder Name can only contain lowercase letters, numbers, and hyphens" });
      }

      // Check for duplicate folderNames (excluding current project)
      if (projectRepo.projectFolderExists(newFolderName, id)) {
        return res.status(400).json({
          error: `A project with folder name "${newFolderName}" already exists. Please choose a different folder name.`,
        });
      }

      // Rename the project directory
      const oldDir = getProjectDir(currentFolderName);
      const newDir = getProjectDir(newFolderName);

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

    if (updates.siteUrl !== undefined && !isValidSiteUrl(updates.siteUrl)) {
      return res.status(400).json({ error: "Invalid Website Address. Please enter a valid URL (e.g., https://mysite.com)." });
    }

    if (!isOptionalBoolean(updates.receiveThemeUpdates)) {
      return res.status(400).json({ error: "receiveThemeUpdates must be a boolean." });
    }

    // Sanitize site title and siteUrl if provided
    const sanitizedSiteTitle = updates.siteTitle !== undefined
      ? (updates.siteTitle && updates.siteTitle.trim() !== "" ? stripHtmlTags(updates.siteTitle.trim()) : "")
      : undefined;
    const sanitizedSiteUrl = updates.siteUrl !== undefined
      ? (updates.siteUrl && updates.siteUrl.trim() !== "" ? stripHtmlTags(updates.siteUrl.trim()) : "")
      : undefined;

    const updatedProject = projectRepo.updateProject(id, {
      folderName: updates.folderName || currentFolderName,
      name: updates.name,
      description: updates.description,
      siteTitle: sanitizedSiteTitle,
      siteUrl: sanitizedSiteUrl,
      receiveThemeUpdates: updates.receiveThemeUpdates,
    });

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
    const project = projectRepo.getProjectById(id);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const { deleteProjectById } = await import("../services/projectService.js");
    const result = await deleteProjectById(id);

    res.json({
      success: true,
      message: `Project "${result.projectName}" and all associated files have been deleted successfully`,
      activeProjectId: result.newActiveProjectId,
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
    const originalProject = projectRepo.getProjectById(originalProjectId);

    if (!originalProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    const allProjects = projectRepo.getAllProjects();
    const newName = generateCopyName(originalProject.name, allProjects.map((p) => p.name));
    const newFolderName = await generateUniqueSlug(newName, (slug) => projectRepo.projectFolderExists(slug, null), { fallback: "project" });

    // Create the new project metadata
    const newProject = {
      ...originalProject,
      id: randomUUID(),
      folderName: newFolderName,
      slug: undefined,
      name: newName,
      theme: originalProject.theme,
      themeVersion: originalProject.themeVersion,
      receiveThemeUpdates: originalProject.receiveThemeUpdates || false,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    // Copy the entire project directory
    const originalFolderName = originalProject.folderName;
    const originalDir = getProjectDir(originalFolderName);
    const newDir = getProjectDir(newFolderName);

    try {
      await fs.copy(originalDir, newDir);

      try {
        await remapDuplicatedProjectUuids(newFolderName);
      } catch (uuidUpdateError) {
        console.warn(`[ProjectController] Failed to update UUIDs in cloned project: ${uuidUpdateError.message}`);
      }
    } catch (copyError) {
      try {
        await fs.remove(newDir);
      } catch (cleanupError) {
        console.warn(
          `[ProjectController] Failed to clean up new directory after copy failure: ${cleanupError.message}`,
        );
      }
      throw new Error(`Failed to copy project files: ${copyError.message}`);
    }

    // Save new project to DB
    projectRepo.createProject(newProject);

    // Copy media metadata from original project to the duplicate in SQLite
    try {
      const originalMedia = mediaRepo.getMediaFiles(originalProjectId);
      if (originalMedia.files && originalMedia.files.length > 0) {
        // Regenerate media file IDs to avoid UNIQUE constraint conflicts
        for (const file of originalMedia.files) {
          file.id = randomUUID();
        }
        mediaRepo.writeMediaData(newProject.id, originalMedia);
      }
    } catch (mediaError) {
      console.warn("Could not duplicate media metadata:", mediaError.message);
    }

    await refreshMediaUsageAfterStructuralChange(newProject.id, "project duplication");

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
    const { scope } = req;
    const { storage } = req.adapters;

    // Import core widgets controller
    const { getCoreWidgets } = await import("./coreWidgetsController.js");

    // Check if the theme opts out of core widgets. Read theme.json through the
    // storage adapter so this resolves the right project dir under any backend
    // (the OSS global dir, or hosted's per-user dir) — not a global DATA_DIR path.
    let includeCoreWidgets = true;
    try {
      const themeBuf = await storage.read(scope, "theme.json");
      if (themeBuf != null) {
        const themeJson = JSON.parse(themeBuf.toString("utf8"));
        if (themeJson.useCoreWidgets === false) {
          includeCoreWidgets = false;
        }
      }
    } catch (error) {
      console.warn(
        `[ProjectController] Failed to read theme.json, defaulting to core widgets=true. Error: ${error.message}`,
      );
      // If there's an error reading theme.json, default to including core widgets
    }

    // The storage adapter lists plain names (files, dirs, dotfiles alike) with
    // no type info, so probe each candidate for its schema.json before treating
    // it as a widget folder — mirroring listCollectionSchemas. This skips stray
    // entries (e.g. a macOS .DS_Store, which on some platforms throws ENOTDIR on
    // read) instead of letting processWidgetFolder log a spurious "Failed to
    // parse schema" warning, keeping that warning honest: it now fires only on a
    // genuinely malformed schema.json.
    async function widgetFoldersWithSchema(folderRelPaths) {
      const present = await Promise.all(
        folderRelPaths.map((relPath) => storage.exists(scope, `${relPath}/schema.json`)),
      );
      return folderRelPaths.filter((_, idx) => present[idx]);
    }

    // Helper: read one widget folder's schema.json (flagging a sibling
    // preview.png) via the storage adapter. Only ever called on entries that
    // passed the schema.json existence probe above, so a thrown error here means
    // a real malformed schema.json.
    async function processWidgetFolder(folderRelPath) {
      try {
        const buf = await storage.read(scope, `${folderRelPath}/schema.json`);
        if (buf == null) return null;
        const schema = JSON.parse(buf.toString("utf8"));
        if (await storage.exists(scope, `${folderRelPath}/preview.png`)) {
          schema.hasPreview = true;
        }
        return schema;
      } catch (error) {
        console.warn(`[ProjectController] Failed to parse schema for widget at ${folderRelPath}: ${error.message}`);
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

    // Theme widget folders (new structure: widgets/<name>/schema.json),
    // excluding the global/ subdir which is handled separately below.
    const widgetEntries = await storage.list(scope, "widgets");
    const widgetFolders = await widgetFoldersWithSchema(
      widgetEntries.filter((name) => name !== "global").map((name) => `widgets/${name}`),
    );
    allSchemas = allSchemas.concat(await Promise.all(widgetFolders.map(processWidgetFolder)));

    // Global widget folders (widgets/global/<name>/schema.json)
    const globalEntries = await storage.list(scope, "widgets/global");
    const globalFolders = await widgetFoldersWithSchema(
      globalEntries.map((name) => `widgets/global/${name}`),
    );
    allSchemas = allSchemas.concat(await Promise.all(globalFolders.map(processWidgetFolder)));

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
    const { scope } = req;
    const { storage } = req.adapters;

    // Read the icon set through the storage adapter so the project directory is
    // resolved scope-aware: OSS reads DATA_DIR/projects/<folder>/assets/icons.json
    // (unchanged), while hosted reads the per-user project dir. The previous
    // getProjectDir() built the OSS global path, which doesn't exist under
    // hosted's per-user storage — so the icon picker came up empty there.
    const content = await storage.read(scope, "assets/icons.json");
    if (content == null) {
      // No icon set for this project — return the empty structure.
      return res.json({ icons: {} });
    }
    // Full icons object (prefix + icons map).
    res.json(JSON.parse(content.toString("utf8")));
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
    const project = projectRepo.getProjectById(projectId);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const projectFolderName = project.folderName;
    const projectDir = getProjectDir(projectFolderName);

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
        siteTitle: project.siteTitle || "",
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

    // Safety: validate ZIP paths (prevent path traversal)
    for (const entry of zip.getEntries()) {
      const normalized = path.normalize(entry.entryName);
      if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
        return res.status(400).json({ error: `ZIP contains unsafe path: ${entry.entryName}` });
      }
    }

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
    const themeDir = getThemeDir(manifest.project.theme);
    if (!(await fs.pathExists(themeDir))) {
      return res.status(400).json({
        error: `Theme "${manifest.project.theme}" not found in this installation. Please install the theme first.`,
      });
    }

    // Resolve a unique name + folder pair using the same scheme as createProject.
    // If a project with the same name already exists, the imported one becomes
    // "X (Copy)" / "X (Copy N)" so the project switcher stays unambiguous.
    const { name: resolvedName, folder: folderName } = await resolveProjectIdentity(manifest.project.name);
    const projectDir = getProjectDir(folderName);

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

      // Create new project object (DB insert happens later, after directory setup)
      newProject = {
        id: randomUUID(),
        folderName,
        name: resolvedName,
        description: manifest.project.description || "",
        siteTitle: manifest.project.siteTitle || "",
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

      // Only add project to DB AFTER successful file copy
      projectRepo.createProject(newProject);

      // Restore media metadata from the exported media.json into SQLite
      const mediaJsonPath = path.join(projectDir, "uploads", "media.json");
      try {
        if (await fs.pathExists(mediaJsonPath)) {
          const mediaData = await fs.readJson(mediaJsonPath);
          if (mediaData.files && mediaData.files.length > 0) {
            // Regenerate media file IDs to avoid UNIQUE constraint conflicts
            // (the original project may still exist in the database)
            for (const file of mediaData.files) {
              file.id = randomUUID();
            }
            mediaRepo.writeMediaData(newProject.id, mediaData);
          }
          // Remove the media.json file after importing its metadata into SQLite.
          await fs.remove(mediaJsonPath);
        }
      } catch (mediaError) {
        console.warn("Could not restore media metadata from export:", mediaError.message);
        // Non-fatal: project is still usable, media files exist on disk
      }

      await refreshMediaUsageAfterStructuralChange(newProject.id, "project import");

      // Clean up temporary files (extraction dir + uploaded ZIP)
      await fs.remove(tempDir);
      if (uploadedFilePath) await fs.remove(uploadedFilePath).catch(() => {});

      res.status(201).json({
        ...newProject,
        importedFrom: manifest.exportedAt,
        widgetizerVersion: manifest.widgetizerVersion,
      });
    } catch (error) {
      // Clean up on error - remove project from DB if it was added
      if (newProject) {
        try {
          projectRepo.deleteProject(newProject.id);
        } catch (cleanupError) {
          console.warn("Failed to remove project from DB after error:", cleanupError);
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
    const status = await checkForUpdates(id);
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
      return res.status(400).json({ error: "enabled must be a boolean." });
    }

    const { toggleThemeUpdates } = await import("../services/themeUpdateService.js");
    const result = await toggleThemeUpdates(id, enabled);
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
    const result = await applyThemeUpdate(id);
    res.json(result);
  } catch (error) {
    console.error("Error applying theme update:", error);
    if (error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || "Failed to apply theme update" });
  }
}
