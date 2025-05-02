import fs from "fs-extra";
import slugify from "slugify";
import { getProjectsFilePath, getProjectPagesDir, getPagePath, getProjectDir } from "../config.js";
import path from "path";

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
 * Get a page by slug
 */
export async function getPage(req, res) {
  try {
    const { id } = req.params; // This is the slug
    const { projects, activeProjectId } = await readProjectsFile();
    const activeProject = projects.find((p) => p.id === activeProjectId);

    if (!activeProject) {
      return res.status(404).json({ error: "No active project found" });
    }

    // Try to find the page in the project's pages directory
    const pagePath = getPagePath(activeProject.id, id);
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
 * Update a page
 */
export async function updatePage(req, res) {
  try {
    const oldSlug = req.params.id; // The slug used to identify the file to update
    const pageData = req.body; // Contains potentially new name and slug
    let desiredNewSlug = pageData.slug; // The slug the user wants

    // Fallback: If slug is missing/empty, generate from name
    if (!desiredNewSlug || typeof desiredNewSlug !== "string" || desiredNewSlug.trim() === "") {
      if (!pageData.name || typeof pageData.name !== "string" || pageData.name.trim() === "") {
        return res.status(400).json({ error: "Page name or slug is required for update" });
      }
      // Generate slug from name ONLY if slug is not provided
      console.warn(
        `Missing/empty slug in update request for oldSlug '${oldSlug}', generating from name: '${pageData.name}'`,
      );
      desiredNewSlug = await generateUniqueSlug(pageData.name, activeProject.id);
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

    const { projects, activeProjectId } = await readProjectsFile();
    const activeProject = projects.find((p) => p.id === activeProjectId);

    if (!activeProject) {
      return res.status(404).json({ error: "No active project found" });
    }

    const oldPath = getPagePath(activeProject.id, oldSlug);
    let finalNewSlug = oldSlug; // Assume slug doesn't change initially

    // Check if the desired slug (after potential generation/sanitization) is different from the old one
    if (oldSlug !== desiredNewSlug) {
      // Ensure the desired slug is unique, appending -n if needed
      // We only need ensureUniqueSlug if the slug came directly from input, not if generated from name
      if (pageData.slug && typeof pageData.slug === "string" && pageData.slug.trim() !== "") {
        finalNewSlug = await ensureUniqueSlug(desiredNewSlug, activeProject.id);
      } else {
        finalNewSlug = desiredNewSlug; // Already unique from generateUniqueSlug fallback
      }
    } else {
      // Slug hasn't changed, keep it as is
      finalNewSlug = oldSlug;
    }

    const newPath = getPagePath(activeProject.id, finalNewSlug);

    // Read old file first to preserve original creation date
    let originalCreationDate = new Date().toISOString();
    let existingWidgets = {};
    try {
      const oldData = JSON.parse(await fs.readFile(oldPath, "utf8"));
      originalCreationDate = oldData.created || originalCreationDate;
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
 * Get all pages
 */
export async function getAllPages(req, res) {
  try {
    const { projects, activeProjectId } = await readProjectsFile();
    const activeProject = projects.find((p) => p.id === activeProjectId);

    if (!activeProject) {
      return res.status(404).json({ error: "No active project found" });
    }

    // Use the helper function to get page data
    const pages = await listProjectPagesData(activeProject.id);

    res.json(pages);
  } catch (error) {
    // Keep existing error handling for the route
    console.error("Error in getAllPages route:", error);
    res.status(500).json({ error: "Failed to get pages" });
  }
}

/**
 * Delete a page
 */
export async function deletePage(req, res) {
  try {
    const { projects, activeProjectId } = await readProjectsFile();
    const activeProject = projects.find((p) => p.id === activeProjectId);

    if (!activeProject) {
      return res.status(404).json({ error: "No active project found" });
    }

    const pageId = req.params.id;
    const pagePath = getPagePath(activeProject.id, pageId);

    // Check if file exists before deleting
    if (!(await fs.pathExists(pagePath))) {
      return res.status(404).json({ error: "Page not found" });
    }

    // Delete the page file
    await fs.remove(pagePath);

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting page:", error);
    res.status(500).json({ error: "Failed to delete page" });
  }
}

/**
 * Create a page
 */
export async function createPage(req, res) {
  try {
    const { name } = req.body;
    const { projects, activeProjectId } = await readProjectsFile();
    const activeProject = projects.find((p) => p.id === activeProjectId);

    if (!activeProject) {
      return res.status(404).json({ error: "No active project found" });
    }

    const slug = await generateUniqueSlug(name, activeProject.id);

    const newPage = {
      id: slug,
      name,
      slug,
      widgets: {},
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    const pagesDir = getProjectPagesDir(activeProject.id);
    await fs.ensureDir(pagesDir);

    const pagePath = getPagePath(activeProject.id, slug);
    await fs.outputFile(pagePath, JSON.stringify(newPage, null, 2));

    res.status(201).json(newPage);
  } catch (error) {
    console.error("Error creating page:", error);
    res.status(500).json({ error: "Failed to create page" });
  }
}

/**
 * Save page content from the page editor
 */
export async function savePageContent(req, res) {
  const { id } = req.params;
  // Extract widgetsOrder as well
  const { name, slug, widgets, widgetsOrder } = req.body;
  const { projects, activeProjectId } = await readProjectsFile();

  if (!activeProjectId) {
    return res.status(400).json({ error: "No active project found" });
  }

  try {
    // Validate essential data
    if (!slug || !name || !widgets) {
      return res.status(400).json({ error: "Missing required page data (slug, name, widgets)." });
    }

    // Read existing data to preserve timestamps etc.
    let existingData = {};
    try {
      const pagePath = getPagePath(activeProjectId, id);
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

    // Combine existing data with new content
    const updatedPageData = {
      ...existingData,
      id: slug, // Use slug from request body as the ID
      name,
      slug,
      widgets,
      widgetsOrder: widgetsOrder || [],
      created: existingData.created,
      updated: new Date().toISOString(),
    };

    // Write file
    const newPagePath = getPagePath(activeProjectId, slug);
    await fs.outputFile(newPagePath, JSON.stringify(updatedPageData, null, 2));

    // If the original slug (id) is different from the new slug, delete the old file
    if (id !== slug) {
      try {
        const oldPath = getPagePath(activeProjectId, id);
        if (await fs.pathExists(oldPath)) {
          await fs.remove(oldPath);
        }
      } catch (unlinkError) {
        console.warn(`Failed to delete old page file ${id} after slug change:`, unlinkError);
      }
    }

    res.json({ success: true, message: "Page saved successfully" });
  } catch (error) {
    console.error(`Error saving page content for ${id}:`, error);
    res.status(500).json({ error: "Failed to save page content" });
  }
}

/**
 * Duplicate an existing page
 * Creates a copy of the page with a new unique slug and "Copy of" prefix
 */
export async function duplicatePage(req, res) {
  try {
    const originalPageId = req.params.id;
    const { projects, activeProjectId } = await readProjectsFile();
    const activeProject = projects.find((p) => p.id === activeProjectId);

    if (!activeProject) {
      return res.status(404).json({ error: "No active project found" });
    }

    // Read the original page data
    const originalPagePath = getPagePath(activeProject.id, originalPageId);
    const originalPageData = JSON.parse(await fs.readFile(originalPagePath, "utf8"));

    // Determine base name for copying
    let baseName = originalPageData.name;
    if (baseName.match(/^Copy( \d+)? of /)) {
      baseName = baseName.replace(/^Copy( \d+)? of /, "");
    }

    // Read all existing page *files* to find existing copies
    const pagesDir = getProjectPagesDir(activeProject.id);
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
    const newSlug = await generateUniqueSlug(newName, activeProject.id);

    // Create the new page data
    const newPage = {
      ...originalPageData,
      id: newSlug,
      name: newName,
      slug: newSlug,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    // Save the new page
    const newPagePath = getPagePath(activeProject.id, newSlug);
    await fs.outputFile(newPagePath, JSON.stringify(newPage, null, 2));

    res.status(201).json(newPage);
  } catch (error) {
    console.error("Error duplicating page:", error);
    res.status(500).json({ error: "Failed to duplicate page" });
  }
}
