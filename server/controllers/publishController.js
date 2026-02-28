import { exportProjectToDir } from "./exportController.js";
import { getProjectFolderName } from "../utils/projectHelpers.js";
import { handleProjectResolutionError } from "../utils/projectErrors.js";
import * as projectRepo from "../db/repositories/projectRepository.js";
import fs from "fs-extra";

/**
 * Publish a project via the publish adapter.
 * Flow: validate -> export to static files -> deploy via adapter -> update project record.
 *
 * @param {import('express').Request} req - Express request with projectId in params
 * @param {import('express').Response} res - Express response
 */
export async function publishProject(req, res) {
  const { projectId } = req.params;
  const userId = req.userId;
  const publishAdapter = req.app.locals.adapters.publish;

  let exportOutputDir = null;

  try {
    if (!projectId) {
      return res.status(400).json({ error: "Project ID is required" });
    }

    // 1. Validate project ownership
    await getProjectFolderName(projectId, userId);

    // 2. Export to static files (reuses existing pipeline, skip export history)
    const exportResult = await exportProjectToDir(projectId, userId, { skipExportRecord: true });
    exportOutputDir = exportResult.outputDir;

    // 3. Get project data for metadata
    const project = projectRepo.getProjectById(projectId, userId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // 4. Deploy via the publish adapter (adapter reads files from the export directory)
    const publishResult = await publishAdapter.deploy(
      exportOutputDir,
      {
        siteId: project.publishedSiteId || null,
        projectName: project.name,
      },
      userId,
    );

    // 6. Update project record with publish info
    projectRepo.updateProject(
      projectId,
      {
        publishedSiteId: publishResult.siteId,
        publishedUrl: publishResult.url,
        publishedAt: new Date().toISOString(),
      },
      userId,
    );

    // 7. Clean up the temporary export directory
    try {
      await fs.remove(exportOutputDir);
    } catch (cleanupError) {
      console.warn(`Failed to clean up export directory after publish: ${cleanupError.message}`);
    }

    res.json({
      success: true,
      siteId: publishResult.siteId,
      url: publishResult.url,
      subdomain: publishResult.subdomain,
      version: publishResult.version,
    });
  } catch (error) {
    // Clean up export directory on failure
    if (exportOutputDir) {
      try {
        await fs.remove(exportOutputDir);
      } catch {
        // Ignore cleanup errors during error handling
      }
    }

    if (handleProjectResolutionError(res, error)) return;

    console.error("Publish error:", error);
    res.status(500).json({
      error: "Failed to publish project",
      message: error.message,
    });
  }
}

/**
 * Get the current publish status for a project.
 *
 * @param {import('express').Request} req - Express request with projectId in params
 * @param {import('express').Response} res - Express response
 */
export async function getPublishStatus(req, res) {
  const { projectId } = req.params;

  try {
    if (!projectId) {
      return res.status(400).json({ error: "Project ID is required" });
    }

    // Validate project ownership
    await getProjectFolderName(projectId, req.userId);

    const project = projectRepo.getProjectById(projectId, req.userId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json({
      published: !!project.publishedSiteId,
      siteId: project.publishedSiteId || null,
      url: project.publishedUrl || null,
      publishedAt: project.publishedAt || null,
    });
  } catch (error) {
    if (handleProjectResolutionError(res, error)) return;

    console.error("Publish status error:", error);
    res.status(500).json({
      error: "Failed to get publish status",
      message: error.message,
    });
  }
}

/**
 * Sync the published URL for a project.
 * Called by the Publisher API when a subdomain changes so the editor
 * stays in sync without requiring the user to re-publish.
 *
 * Expects body: { siteId: string, url: string }
 */
export async function syncPublishUrl(req, res) {
  const { siteId, url } = req.body;

  try {
    if (!siteId || !url) {
      return res.status(400).json({ error: "siteId and url are required" });
    }

    const project = projectRepo.getProjectByPublishedSiteId(siteId, req.userId);
    if (!project) {
      return res.status(404).json({ error: "No project found for this site" });
    }

    projectRepo.updateProject(project.id, { publishedUrl: url }, req.userId);

    res.json({ success: true });
  } catch (error) {
    console.error("Sync publish URL error:", error);
    res.status(500).json({ error: "Failed to sync publish URL" });
  }
}

