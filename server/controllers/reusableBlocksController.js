import fs from "fs-extra";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { validationResult } from "express-validator";
import { getProjectsFilePath, getProjectDir, getProjectPagesDir } from "../config.js";

// Helper to read projects file
async function readProjectsFile() {
  const projectsPath = getProjectsFilePath();
  if (!(await fs.pathExists(projectsPath))) {
    return { projects: [], activeProjectId: null };
  }
  const data = await fs.readFile(projectsPath, "utf8");
  return JSON.parse(data);
}

// Get reusable blocks directory for a project
function getReusableBlocksDir(projectSlug) {
  return path.join(getProjectDir(projectSlug), "reusable-blocks");
}

// Get path for a specific block
function getBlockPath(projectSlug, blockId) {
  return path.join(getReusableBlocksDir(projectSlug), `${blockId}.json`);
}

/**
 * Get all reusable blocks for the active project
 */
export async function getAllBlocks(req, res) {
  try {
    const { projects, activeProjectId } = await readProjectsFile();
    const activeProject = projects.find((p) => p.id === activeProjectId);

    if (!activeProject) {
      return res.status(404).json({ error: "No active project found" });
    }

    const projectSlug = activeProject.slug || activeProject.id;
    const blocksDir = getReusableBlocksDir(projectSlug);

    // Ensure directory exists
    if (!(await fs.pathExists(blocksDir))) {
      return res.json([]);
    }

    const files = await fs.readdir(blocksDir);
    const blocks = await Promise.all(
      files
        .filter((f) => f.endsWith(".json"))
        .map(async (file) => {
          const content = await fs.readFile(path.join(blocksDir, file), "utf8");
          return JSON.parse(content);
        })
    );

    res.json(blocks);
  } catch (error) {
    console.error("Error getting reusable blocks:", error);
    res.status(500).json({ error: "Failed to get reusable blocks" });
  }
}

/**
 * Get a specific reusable block
 */
export async function getBlock(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { projects, activeProjectId } = await readProjectsFile();
    const activeProject = projects.find((p) => p.id === activeProjectId);

    if (!activeProject) {
      return res.status(404).json({ error: "No active project found" });
    }

    const projectSlug = activeProject.slug || activeProject.id;
    const blockPath = getBlockPath(projectSlug, id);

    if (!(await fs.pathExists(blockPath))) {
      return res.status(404).json({ error: "Reusable block not found" });
    }

    const content = await fs.readFile(blockPath, "utf8");
    res.json(JSON.parse(content));
  } catch (error) {
    console.error("Error getting reusable block:", error);
    res.status(500).json({ error: "Failed to get reusable block" });
  }
}

/**
 * Create a new reusable block from a widget
 */
export async function createBlock(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, widgetData } = req.body;
    const { projects, activeProjectId } = await readProjectsFile();
    const activeProject = projects.find((p) => p.id === activeProjectId);

    if (!activeProject) {
      return res.status(404).json({ error: "No active project found" });
    }

    const projectSlug = activeProject.slug || activeProject.id;
    const blocksDir = getReusableBlocksDir(projectSlug);

    // Ensure directory exists
    await fs.ensureDir(blocksDir);

    // Create the block
    const blockId = `block_${uuidv4().slice(0, 8)}`;
    const block = {
      id: blockId,
      name: name.trim(),
      widgetType: widgetData.type,
      widgetData: {
        ...widgetData,
        // Remove the original widget ID - will get new IDs when inserted
        id: undefined,
      },
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    const blockPath = getBlockPath(projectSlug, blockId);
    await fs.outputFile(blockPath, JSON.stringify(block, null, 2));

    res.status(201).json(block);
  } catch (error) {
    console.error("Error creating reusable block:", error);
    res.status(500).json({ error: "Failed to create reusable block" });
  }
}

/**
 * Update a reusable block
 */
export async function updateBlock(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { widgetData, name } = req.body;
    const { projects, activeProjectId } = await readProjectsFile();
    const activeProject = projects.find((p) => p.id === activeProjectId);

    if (!activeProject) {
      return res.status(404).json({ error: "No active project found" });
    }

    const projectSlug = activeProject.slug || activeProject.id;
    const blockPath = getBlockPath(projectSlug, id);

    if (!(await fs.pathExists(blockPath))) {
      return res.status(404).json({ error: "Reusable block not found" });
    }

    // Read existing block
    const existingBlock = JSON.parse(await fs.readFile(blockPath, "utf8"));

    // Update the block
    const updatedBlock = {
      ...existingBlock,
      name: name?.trim() || existingBlock.name,
      widgetData: {
        ...widgetData,
        id: undefined,
      },
      widgetType: widgetData.type,
      updated: new Date().toISOString(),
    };

    await fs.outputFile(blockPath, JSON.stringify(updatedBlock, null, 2));

    res.json(updatedBlock);
  } catch (error) {
    console.error("Error updating reusable block:", error);
    res.status(500).json({ error: "Failed to update reusable block" });
  }
}

/**
 * Delete a reusable block (also removes all references from pages)
 */
export async function deleteBlock(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { projects, activeProjectId } = await readProjectsFile();
    const activeProject = projects.find((p) => p.id === activeProjectId);

    if (!activeProject) {
      return res.status(404).json({ error: "No active project found" });
    }

    const projectSlug = activeProject.slug || activeProject.id;
    const blockPath = getBlockPath(projectSlug, id);

    if (!(await fs.pathExists(blockPath))) {
      return res.status(404).json({ error: "Reusable block not found" });
    }

    // Find and remove all references from pages
    const pagesDir = getProjectPagesDir(projectSlug);
    if (await fs.pathExists(pagesDir)) {
      const pageFiles = (await fs.readdir(pagesDir, { withFileTypes: true }))
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json"));

      for (const pageFile of pageFiles) {
        const pagePath = path.join(pagesDir, pageFile.name);
        const pageData = JSON.parse(await fs.readFile(pagePath, "utf8"));

        // Check if page has any references to this block
        let modified = false;
        const newWidgets = {};

        for (const [widgetId, widget] of Object.entries(pageData.widgets || {})) {
          if (widget.type === "__reusable_ref__" && widget.reusableId === id) {
            // Skip this widget (remove the reference)
            modified = true;
          } else {
            newWidgets[widgetId] = widget;
          }
        }

        // Also update widgetsOrder if it exists
        if (modified) {
          pageData.widgets = newWidgets;
          if (pageData.widgetsOrder) {
            pageData.widgetsOrder = pageData.widgetsOrder.filter(
              (wid) => newWidgets[wid]
            );
          }
          await fs.outputFile(pagePath, JSON.stringify(pageData, null, 2));
        }
      }
    }

    // Delete the block file
    await fs.remove(blockPath);

    res.json({ success: true, message: "Reusable block deleted" });
  } catch (error) {
    console.error("Error deleting reusable block:", error);
    res.status(500).json({ error: "Failed to delete reusable block" });
  }
}

/**
 * Get usage count for a reusable block (which pages use it)
 */
export async function getBlockUsage(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { projects, activeProjectId } = await readProjectsFile();
    const activeProject = projects.find((p) => p.id === activeProjectId);

    if (!activeProject) {
      return res.status(404).json({ error: "No active project found" });
    }

    const projectSlug = activeProject.slug || activeProject.id;
    const pagesDir = getProjectPagesDir(projectSlug);

    const usage = [];

    if (await fs.pathExists(pagesDir)) {
      const pageFiles = (await fs.readdir(pagesDir, { withFileTypes: true }))
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json"));

      for (const pageFile of pageFiles) {
        const pagePath = path.join(pagesDir, pageFile.name);
        const pageData = JSON.parse(await fs.readFile(pagePath, "utf8"));

        // Count references to this block
        const refCount = Object.values(pageData.widgets || {}).filter(
          (widget) => widget.type === "__reusable_ref__" && widget.reusableId === id
        ).length;

        if (refCount > 0) {
          usage.push({
            pageId: pageData.id,
            pageName: pageData.name,
            count: refCount,
          });
        }
      }
    }

    res.json({
      blockId: id,
      totalUsage: usage.reduce((sum, u) => sum + u.count, 0),
      pages: usage,
    });
  } catch (error) {
    console.error("Error getting block usage:", error);
    res.status(500).json({ error: "Failed to get block usage" });
  }
}

/**
 * Resolve a reusable block reference to actual widget data
 * (Used internally by preview/render)
 */
export async function resolveBlockReference(projectSlug, reusableId) {
  try {
    const blockPath = getBlockPath(projectSlug, reusableId);
    
    if (!(await fs.pathExists(blockPath))) {
      console.warn(`Reusable block not found: ${reusableId}`);
      return null;
    }

    const block = JSON.parse(await fs.readFile(blockPath, "utf8"));
    return block.widgetData;
  } catch (error) {
    console.error(`Error resolving block reference ${reusableId}:`, error);
    return null;
  }
}
