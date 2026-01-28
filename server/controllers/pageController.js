import fs from "fs-extra";
import slugify from "slugify";
import { randomUUID } from "crypto";
import { validationResult } from "express-validator";
import { getProjectsFilePath, getProjectPagesDir, getPagePath, getProjectDir } from "../config.js";
import path from "path";
import { updatePageMediaUsage, removePageFromMediaUsage } from "../services/mediaUsageService.js";

async function readProjectsFile() {
  const projectsPath = getProjectsFilePath();
  if (!(await fs.pathExists(projectsPath))) {
    const initialData = { projects: [], activeProjectId: null };
    await fs.outputFile(projectsPath, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  const data = await fs.readFile(projectsPath, "utf8");
  return JSON.parse(data);
}

/**
 * Generate a unique slug
 */
async function generateUniqueSlug(name, projectId) {
  let baseSlug = slugify(name, { lower: true, strict: true });
  let uniqueSlug = baseSlug;
  let counter = 1;

  // Check if slug exists by filename using fs.pathExists
  while (true) {
    const filePath = getPagePath(projectId, uniqueSlug);
    if (!(await fs.pathExists(filePath))) {
      // File does not exist, this slug is unique
      break;
    }
    // File exists, increment counter and try again
    uniqueSlug = `${baseSlug}-${counter}`;
    counter++;
  }
  return uniqueSlug;
}

/**
 * Ensure a slug is unique
 */
async function ensureUniqueSlug(desiredSlug, projectId) {
  let slug = slugify(desiredSlug, { lower: true, strict: true }); // Sanitize the desired slug
  if (!slug) {
    // Handle empty slug after sanitization
    slug = "page"; // Default slug base
  }
  let uniqueSlug = slug;
  let counter = 1;

  // Check if the desired slug (or variations) exists by filename
  while (true) {
    const filePath = getPagePath(projectId, uniqueSlug);
    if (!(await fs.pathExists(filePath))) {
      // File does not exist, this slug is unique
      break;
    }
    // File exists, increment counter and try again
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }
  return uniqueSlug;
}

/**
 * Lists and reads data for all publishable pages in a project's pages directory.
 * @param {string} projectId - The project folder name
 * @returns {Promise<Array<object>>} Array of page data objects
 * @throws {Error} If the pages directory cannot be read
 */
export async function listProjectPagesData(projectId) {
  const pagesDir = getProjectPagesDir(projectId);
  try {
    // Check if pages directory exists
    if (!(await fs.pathExists(pagesDir))) {
      console.warn(`Pages directory not found for project ${projectId} at ${pagesDir}`);
      return []; // Return empty array if directory doesn't exist
    }
    // Use withFileTypes to distinguish files from directories
    const allEntries = await fs.readdir(pagesDir, { withFileTypes: true });

    // Filter out the 'global' directory and any non-JSON files
    const pageFiles = allEntries.filter(
      (entry) => entry.isFile() && entry.name.endsWith(".json"),
      // We don't need to explicitly filter out 'global' if it's a directory,
      // as entry.isFile() will handle it. If 'global.json' could exist and
      // should be excluded, add: && entry.name !== 'global.json'
    );

    const pagesData = await Promise.all(
      pageFiles.map(async (fileEntry) => {
        const pageId = fileEntry.name.replace(".json", "");
        const pagePath = getPagePath(projectId, pageId);
        try {
          const pageContent = await fs.readFile(pagePath, "utf8");
          const parsedData = JSON.parse(pageContent);
          // Ensure the object has the id matching the filename
          return {
            ...parsedData,
            id: pageId,
          };
        } catch (readError) {
          console.error(`Error reading or parsing page file ${pagePath}:`, readError);
          // Return null or throw, depending on how failures should be handled
          return null;
        }
      }),
    );

    // Filter out any null results from read/parse errors
    return pagesData.filter((page) => page !== null);
  } catch (error) {
    // Error handling, pathExists check above handles ENOENT specifically
    console.error(`Error listing pages data for project ${projectId}:`, error);
    throw new Error(`Failed to list pages data for project ${projectId}: ${error.message}`);
  }
}

/**
 * Reads the JSON data for a global widget (header or footer).
 * @param {string} projectId - The project folder name
 * @param {'header'|'footer'} widgetType - The type of global widget to read
 * @returns {Promise<object|null>} The widget data or null if not found
 */
export async function readGlobalWidgetData(projectId, widgetType) {
  if (widgetType !== "header" && widgetType !== "footer") {
    console.error(`Invalid global widget type requested: ${widgetType}`);
    return null;
  }
  const projectDir = getProjectDir(projectId);
  // Ensure path uses projectDir consistently
  const globalWidgetPath = path.join(projectDir, "pages", "global", `${widgetType}.json`);

  try {
    // pathExists check is cleaner than try/catch for ENOENT
    if (!(await fs.pathExists(globalWidgetPath))) {
      console.log(`Global widget data file not found for type ${widgetType}, project ${projectId}.`);
      return null;
    }
    const widgetContent = await fs.readFile(globalWidgetPath, "utf-8");
    const widgetData = JSON.parse(widgetContent);
    // Add the type explicitly if not present in the file
    widgetData.type = widgetType;
    return widgetData;
  } catch (error) {
    // Catch other errors (parsing, reading)
    console.error(`Error reading global widget data (${widgetType}, project ${projectId}):`, error);
    return null; // Return null on error
  }
}

/**
 * Retrieves a single page by its slug from the active project.
 * @param {import('express').Request} req - Express request object with page slug in params.id
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function getPage(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params; // This is the slug
    const { projects, activeProjectId } = await readProjectsFile();
    const activeProject = projects.find((p) => p.id === activeProjectId);

    if (!activeProject) {
      return res.status(404).json({ error: "No active project found" });
    }
    const projectFolderName = activeProject.folderName;

    // Try to find the page in the project's pages directory
    const pagePath = getPagePath(projectFolderName, id);
    // Check if page exists
    if (!(await fs.pathExists(pagePath))) {
      return res.status(404).json({ error: "Page not found" });
    }
    const pageData = await fs.readFile(pagePath, "utf8");
    return res.json(JSON.parse(pageData));
  } catch (error) {
    console.error("Error getting page:", error);
    res.status(500).json({ error: "Failed to get page" });
  }
}

/**
 * Updates an existing page's metadata and content, handling slug changes and file renaming.
 * @param {import('express').Request} req - Express request object with page slug in params.id and page data in body
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function updatePage(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const oldSlug = req.params.id; // The slug used to identify the file to update
    const pageData = req.body; // Contains potentially new name and slug
    let desiredNewSlug = pageData.slug; // The slug the user wants

    const { projects, activeProjectId } = await readProjectsFile();
    const activeProject = projects.find((p) => p.id === activeProjectId);

    if (!activeProject) {
      return res.status(404).json({ error: "No active project found" });
    }
    const projectFolderName = activeProject.folderName;

    // Fallback: If slug is missing/empty, generate from name
    if (!desiredNewSlug || typeof desiredNewSlug !== "string" || desiredNewSlug.trim() === "") {
      if (!pageData.name || typeof pageData.name !== "string" || pageData.name.trim() === "") {
        return res.status(400).json({ error: "Page name or slug is required for update" });
      }
      // Generate slug from name ONLY if slug is not provided
      console.warn(
        `Missing/empty slug in update request for oldSlug '${oldSlug}', generating from name: '${pageData.name}'`,
      );
      desiredNewSlug = await generateUniqueSlug(pageData.name, projectFolderName);
      // Since generateUniqueSlug already ensures uniqueness, we can use its result directly
    } else {
      // Sanitize the provided slug if it exists
      desiredNewSlug = slugify(desiredNewSlug, { lower: true, strict: true });
      if (!desiredNewSlug) {
        // Handle case where slug becomes empty after slugify
        return res
          .status(400)
          .json({ error: "Invalid slug provided. Slug cannot be empty or contain only invalid characters." });
      }
    }

    const oldPath = getPagePath(projectFolderName, oldSlug);
    let finalNewSlug = oldSlug; // Assume slug doesn't change initially

    // Check if the desired slug (after potential generation/sanitization) is different from the old one
    if (oldSlug !== desiredNewSlug) {
      // For explicit slug changes, check if the new slug already exists (conflict)
      if (pageData.slug && typeof pageData.slug === "string" && pageData.slug.trim() !== "") {
        const existingPath = getPagePath(projectFolderName, desiredNewSlug);
        if (await fs.pathExists(existingPath)) {
          return res.status(409).json({
            error: "Slug already exists",
            message: `A page with the slug "${desiredNewSlug}" already exists. Please choose a different slug.`,
          });
        }
        finalNewSlug = desiredNewSlug;
      } else {
        finalNewSlug = desiredNewSlug; // Already unique from generateUniqueSlug fallback
      }
    } else {
      // Slug hasn't changed, keep it as is
      finalNewSlug = oldSlug;
    }

    const newPath = getPagePath(projectFolderName, finalNewSlug);

    // Read old file first to preserve original creation date and uuid
    let originalCreationDate = new Date().toISOString();
    let existingUuid = null;
    let existingWidgets = {};
    try {
      const oldData = JSON.parse(await fs.readFile(oldPath, "utf8"));
      originalCreationDate = oldData.created || originalCreationDate;
      existingUuid = oldData.uuid || null; // Preserve stable uuid across renames
      existingWidgets = oldData.widgets || {}; // Preserve widgets if not included in request
    } catch (readError) {
      if (readError.code !== "ENOENT") {
        // Only warn if it's not a 'file not found' error
        console.warn(`Could not read old page file ${oldPath} during update: ${readError.message}`);
      }
      // If old file doesn't exist (e.g. first save after create error, or manual rename), allow creation
    }

    // Construct the final page data for saving
    const finalUpdatedPageData = {
      ...pageData, // Start with submitted data
      uuid: existingUuid || randomUUID(), // Preserve existing uuid or generate new one if missing
      id: finalNewSlug, // Use the final unique slug as ID
      slug: finalNewSlug, // Use the final unique slug
      name: pageData.name || `Page ${finalNewSlug}`, // Ensure name exists
      widgets: pageData.widgets || existingWidgets, // Use submitted widgets or keep existing
      created: originalCreationDate, // Preserve original creation date
      updated: new Date().toISOString(), // Set new update timestamp
    };

    // Write the updated content to the new/correct file path
    await fs.outputFile(newPath, JSON.stringify(finalUpdatedPageData, null, 2));

    // If the slug actually changed, remove the old file
    if (oldSlug !== finalNewSlug && oldPath !== newPath) {
      try {
        // Only remove if it exists
        if (await fs.pathExists(oldPath)) {
          await fs.remove(oldPath);
        }
      } catch (unlinkError) {
        // fs.remove shouldn't error on non-existent, log other errors
        console.warn(`Failed to delete old page file ${oldPath} after slug change: ${unlinkError.message}`);
      }
    }

    // Update media usage tracking
    try {
      // If slug changed, remove the old slug first
      if (oldSlug !== finalNewSlug) {
        await removePageFromMediaUsage(activeProjectId, oldSlug);
      }
      // Then update with the new slug (or refresh if slug didn't change)
      await updatePageMediaUsage(activeProjectId, finalNewSlug, finalUpdatedPageData);
    } catch (usageError) {
      console.warn(`Failed to update media usage tracking for page ${finalNewSlug}:`, usageError);
      // Don't fail the request if usage tracking fails
    }

    res.json({ success: true, data: finalUpdatedPageData });
  } catch (error) {
    console.error("Error updating page:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update page",
      message: error.message,
    });
  }
}

/**
 * Retrieves all pages for the active project.
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function getAllPages(req, res) {
  // No validation needed for this route
  try {
    const { projects, activeProjectId } = await readProjectsFile();
    const activeProject = projects.find((p) => p.id === activeProjectId);

    if (!activeProject) {
      return res.status(404).json({ error: "No active project found" });
    }
    const projectFolderName = activeProject.folderName;

    // Use the helper function to get page data
    const pages = await listProjectPagesData(projectFolderName);

    res.json(pages);
  } catch (error) {
    // Keep existing error handling for the route
    console.error("Error in getAllPages route:", error);
    res.status(500).json({ error: "Failed to get pages" });
  }
}

/**
 * Deletes a page from the active project and updates media usage tracking.
 * @param {import('express').Request} req - Express request object with page ID in params
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function deletePage(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { projects, activeProjectId } = await readProjectsFile();
    const activeProject = projects.find((p) => p.id === activeProjectId);

    if (!activeProject) {
      return res.status(404).json({ error: "No active project found" });
    }
    const projectFolderName = activeProject.folderName;

    const pageId = req.params.id;
    const pagePath = getPagePath(projectFolderName, pageId);

    // Check if file exists before deleting
    if (!(await fs.pathExists(pagePath))) {
      return res.status(404).json({ error: "Page not found" });
    }

    // Delete the page file
    await fs.remove(pagePath);

    // Remove the page from media usage tracking
    try {
      await removePageFromMediaUsage(activeProject.id, pageId);
    } catch (usageError) {
      console.warn(`Failed to update media usage tracking for deleted page ${pageId}:`, usageError);
      // Don't fail the request if usage tracking fails
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting page:", error);
    res.status(500).json({ error: "Failed to delete page" });
  }
}

/**
 * Deletes multiple pages from the active project in a single operation.
 * Returns detailed results including deleted, not found, and errored pages.
 * @param {import('express').Request} req - Express request object with pageIds array in body
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function bulkDeletePages(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { pageIds } = req.body;
  const { projects, activeProjectId } = await readProjectsFile();
  const activeProject = projects.find((p) => p.id === activeProjectId);

  if (!activeProject) {
    return res.status(404).json({ error: "No active project found" });
  }
  const projectFolderName = activeProject.folderName;

  const results = {
    deleted: [],
    notFound: [],
    errors: [],
  };

  // Process each page deletion
  for (const pageId of pageIds) {
    try {
      const pagePath = getPagePath(projectFolderName, pageId);

      // Check if file exists before deleting
      if (!(await fs.pathExists(pagePath))) {
        results.notFound.push(pageId);
        continue;
      }

      // Delete the page file
      await fs.remove(pagePath);

      // Remove the page from media usage tracking
      try {
        await removePageFromMediaUsage(activeProjectId, pageId);
      } catch (usageError) {
        console.warn(`Failed to update media usage tracking for deleted page ${pageId}:`, usageError);
        // Don't fail the deletion if usage tracking fails
      }

      results.deleted.push(pageId);
    } catch (error) {
      console.error(`Error deleting page ${pageId}:`, error);
      results.errors.push({ pageId, error: error.message });
    }
  }

  // Determine response status based on results
  const hasErrors = results.errors.length > 0 || results.notFound.length > 0;
  const hasSuccesses = results.deleted.length > 0;

  if (hasSuccesses && !hasErrors) {
    // All deletions successful
    res.json({
      success: true,
      message: `Successfully deleted ${results.deleted.length} page(s)`,
      results,
    });
  } else if (hasSuccesses && hasErrors) {
    // Partial success
    res.status(207).json({
      success: false,
      message: `Deleted ${results.deleted.length} page(s), but encountered ${results.errors.length + results.notFound.length} error(s)`,
      results,
    });
  } else {
    // No successes
    res.status(400).json({
      success: false,
      message: "Failed to delete any pages",
      results,
    });
  }
}

/**
 * Creates a new page in the active project with an auto-generated or provided slug.
 * @param {import('express').Request} req - Express request object with page data in body
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function createPage(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const pageData = req.body; // Get all data including SEO
    const { projects, activeProjectId } = await readProjectsFile();
    const activeProject = projects.find((p) => p.id === activeProjectId);

    if (!activeProject) {
      return res.status(404).json({ error: "No active project found" });
    }
    const projectFolderName = activeProject.folderName;

    // Use submitted slug if provided, otherwise generate from name
    let slug;
    if (pageData.slug && pageData.slug.trim()) {
      // User provided a slug, ensure it's unique
      slug = await ensureUniqueSlug(pageData.slug, projectFolderName);
    } else {
      // No slug provided, generate from name
      slug = await generateUniqueSlug(pageData.name, projectFolderName);
    }

    const newPage = {
      ...pageData, // Include all submitted data (name, seo, etc.)
      uuid: randomUUID(), // Stable identifier that persists across renames
      id: slug,
      slug,
      widgets: {},
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    const pagesDir = getProjectPagesDir(projectFolderName);
    await fs.ensureDir(pagesDir);

    const pagePath = getPagePath(projectFolderName, slug);
    await fs.outputFile(pagePath, JSON.stringify(newPage, null, 2));

    res.status(201).json(newPage);
  } catch (error) {
    console.error("Error creating page:", error);
    res.status(500).json({ error: "Failed to create page" });
  }
}

/**
 * Saves page content from the page editor, including widgets and SEO data.
 * Handles slug changes and updates media usage tracking.
 * @param {import('express').Request} req - Express request object with page ID in params and page data in body
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function savePageContent(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  try {
    const pageData = req.body; // Get all data including SEO
    const { projects, activeProjectId } = await readProjectsFile();
    const activeProject = projects.find((p) => p.id === activeProjectId);

    if (!activeProject) {
      return res.status(400).json({ error: "No active project found" });
    }
    const projectFolderName = activeProject.folderName;

    // Validate essential data
    if (!pageData.slug || !pageData.name || !pageData.widgets) {
      return res.status(400).json({ error: "Missing required page data (slug, name, widgets)." });
    }

    // Read existing data to preserve timestamps etc.
    let existingData = {};
    try {
      const pagePath = getPagePath(projectFolderName, id);
      const data = await fs.readFile(pagePath, "utf8");
      existingData = JSON.parse(data);
    } catch (err) {
      if (err.code !== "ENOENT") {
        console.warn(`Error reading existing page data for ${id}:`, err);
        // Decide if this should be a fatal error
      }
      // If file doesn't exist, set default created timestamp
      if (!existingData.created) {
        existingData.created = new Date().toISOString();
      }
    }

    // Combine existing data with new content, preserving all fields including SEO
    const updatedPageData = {
      ...existingData, // Start with existing data
      ...pageData, // Override with new data (including SEO)
      uuid: existingData.uuid || randomUUID(), // Preserve existing uuid or generate if missing
      id: pageData.slug, // Use slug from request body as the ID
      created: existingData.created, // Always preserve original creation date
      updated: new Date().toISOString(), // Set new update timestamp
    };

    // Write file
    const newPagePath = getPagePath(projectFolderName, pageData.slug);
    await fs.outputFile(newPagePath, JSON.stringify(updatedPageData, null, 2));

    // If the original slug (id) is different from the new slug, delete the old file
    if (id !== pageData.slug) {
      try {
        const oldPath = getPagePath(projectFolderName, id);
        if (await fs.pathExists(oldPath)) {
          await fs.remove(oldPath);
        }
      } catch (unlinkError) {
        console.warn(`Failed to delete old page file ${id} after slug change:`, unlinkError);
      }
    }

    // Update media usage tracking
    try {
      // If slug changed, remove the old slug first
      if (id !== pageData.slug) {
        await removePageFromMediaUsage(activeProjectId, id);
      }
      // Then update with the new slug
      await updatePageMediaUsage(activeProjectId, pageData.slug, updatedPageData);
    } catch (usageError) {
      console.warn(`Failed to update media usage tracking for page ${pageData.slug}:`, usageError);
      // Don't fail the request if usage tracking fails
    }

    res.json({ success: true, message: "Page saved successfully" });
  } catch (error) {
    console.error(`Error saving page content for ${id}:`, error);
    res.status(500).json({ error: "Failed to save page content" });
  }
}

/**
 * Duplicates an existing page with a new unique slug and "Copy of" prefix.
 * Preserves all page content including widgets and SEO settings.
 * @param {import('express').Request} req - Express request object with page ID in params
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function duplicatePage(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const originalPageId = req.params.id;
    const { projects, activeProjectId } = await readProjectsFile();
    const activeProject = projects.find((p) => p.id === activeProjectId);

    if (!activeProject) {
      return res.status(404).json({ error: "No active project found" });
    }
    const projectFolderName = activeProject.folderName;

    // Read the original page data
    const originalPagePath = getPagePath(projectFolderName, originalPageId);
    const originalPageData = JSON.parse(await fs.readFile(originalPagePath, "utf8"));

    // Determine base name for copying
    let baseName = originalPageData.name;
    if (baseName.match(/^Copy( \d+)? of /)) {
      baseName = baseName.replace(/^Copy( \d+)? of /, "");
    }

    // Read all existing page *files* to find existing copies
    const pagesDir = getProjectPagesDir(projectFolderName);
    const allEntries = await fs.readdir(pagesDir, { withFileTypes: true });
    const pageJsonFiles = allEntries.filter((entry) => entry.isFile() && entry.name.endsWith(".json"));

    const pages = await Promise.all(
      pageJsonFiles.map(async (fileEntry) => {
        // Read only the confirmed JSON files
        const data = await fs.readFile(path.join(pagesDir, fileEntry.name), "utf8");
        return JSON.parse(data);
      }),
    );

    // Find the highest copy number for this base name
    let copyNumber = 0;
    const copyRegex = new RegExp(`^Copy( (\\d+))? of ${baseName}$`);
    pages.forEach((page) => {
      const match = page.name.match(copyRegex);
      if (match) {
        const num = match[2] ? parseInt(match[2]) : 1;
        copyNumber = Math.max(copyNumber, num);
      }
    });

    // Generate the new name
    const newName = copyNumber === 0 ? `Copy of ${baseName}` : `Copy ${copyNumber + 1} of ${baseName}`;
    const newSlug = await generateUniqueSlug(newName, projectFolderName);

    // Create the new page data
    const newPage = {
      ...originalPageData,
      uuid: randomUUID(), // Generate new uuid for the copy (don't inherit from original)
      id: newSlug,
      name: newName,
      slug: newSlug,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    // Save the new page
    const newPagePath = getPagePath(projectFolderName, newSlug);
    await fs.outputFile(newPagePath, JSON.stringify(newPage, null, 2));

    // Update media usage tracking for the new page
    try {
      await updatePageMediaUsage(activeProjectId, newSlug, newPage);
    } catch (usageError) {
      console.warn(`Failed to update media usage tracking for duplicated page ${newSlug}:`, usageError);
      // Don't fail the request if usage tracking fails
    }

    res.status(201).json(newPage);
  } catch (error) {
    console.error("Error duplicating page:", error);
    res.status(500).json({ error: "Failed to duplicate page" });
  }
}
