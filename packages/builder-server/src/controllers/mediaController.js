import fs from "fs-extra";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import sharp from "sharp";
import slugify from "slugify";
import DOMPurify from "isomorphic-dompurify";
import { getThemeJsonPath } from "../config.js";
import { LIMIT_KEYS } from "@widgetizer/core/adapters";
import { ALLOWED_MIME_TYPES, getContentType, getMediaCategory } from "../utils/mimeTypes.js";
import { getSetting } from "./appSettingsController.js";
import { getMediaUsage, refreshAllMediaUsage } from "../services/mediaUsageService.js";
import { getProjectFolderName, getProjectDetails } from "../utils/projectHelpers.js";
import { handleProjectResolutionError } from "../utils/projectErrors.js";
import * as mediaRepo from "../db/repositories/mediaRepository.js";

import { stripHtmlTags } from "../services/sanitizationService.js";
import { readMediaFile } from "../services/mediaService.js";


// Get image processing settings from app settings
async function getImageProcessingSettings(projectId) {
  const quality = (await getSetting("media.imageProcessing.quality")) || 85;
  const defaultSizesConfig = (await getSetting("media.imageProcessing.sizes")) || {
    thumb: { width: 150, enabled: true },
    small: { width: 480, enabled: true },
    medium: { width: 1024, enabled: true },
    large: { width: 1920, enabled: true },
  };
  let sizesConfig = defaultSizesConfig;

  // If projectId is provided, try to load theme-specific overrides
  if (projectId) {
    try {
      const project = await getProjectDetails(projectId);
      if (project && project.theme) {
        const themeJsonPath = getThemeJsonPath(project.theme);
        if (await fs.pathExists(themeJsonPath)) {
          const themeConfig = await fs.readJson(themeJsonPath);
          if (themeConfig.settings?.imageSizes) {
            // When a theme defines image sizes, use them instead of app settings.
            // Always ensure thumbnails are generated for the media library.
            sizesConfig = {
              ...themeConfig.settings.imageSizes,
            };

            const defaultThumb = defaultSizesConfig.thumb || { width: 150, enabled: true };
            sizesConfig.thumb = {
              ...defaultThumb,
              ...(themeConfig.settings.imageSizes.thumb || {}),
              enabled: true,
            };
          }
        }
      }
    } catch (error) {
      console.warn(
        `[getImageProcessingSettings] Failed to load theme settings for project ${projectId}:`,
        error.message,
      );
      // Fallback to global settings on error
    }
  }

  // Filter out disabled sizes and format for processing
  const enabledSizes = {};
  for (const [name, config] of Object.entries(sizesConfig)) {
    if (config.enabled !== false) {
      // enabled by default if not specified
      enabledSizes[name] = { width: config.width, quality: config.quality || quality };
    }
  }

  return enabledSizes;
}




// Decode the filename TODO: Where should things like this live?
function decodeFileName(filename) {
  try {
    return decodeURIComponent(escape(filename));
  } catch {
    return filename;
  }
}

// The adapter key for a media file (the original) and its sizes. The original
// lives under its category subdir; generated sizes are always images. Mirrors
// the historical disk layout, minus the `/uploads/` URL prefix.
function deleteMediaAssets(assetStorage, scope, file) {
  const subdir = getMediaCategory(file.type) === "file" ? "files" : "images";
  const keys = [`${subdir}/${file.filename}`];
  if (file.sizes) {
    for (const sizeName in file.sizes) {
      const size = file.sizes[sizeName];
      if (size && size.path) keys.push(`images/${path.basename(size.path)}`);
    }
  }
  return Promise.all(
    keys.map((key) =>
      Promise.resolve(assetStorage.delete(scope, key)).catch((err) =>
        console.warn(`Could not delete media asset ${key}: ${err.message}`),
      ),
    ),
  );
}


/**
 * Writes media metadata to SQLite for a project (full replacement).
 * @param {string} projectId - The project UUID
 * @param {{files: Array<object>}} data - The media metadata to save

 */
export async function writeMediaFile(projectId, data) {
  await getProjectFolderName(projectId);
  mediaRepo.writeMediaData(projectId, data);
}

/**
 * Atomically reads media data, applies a transform function, and writes it back.
 * SQLite transactions handle atomicity natively — no write locks needed.
 * @param {string} projectId - The project UUID
 * @param {function(Object): void} transformFn - Function that receives mediaData and mutates it in place

 * @returns {Promise<Object>} The transformed media data
 */
export async function atomicUpdateMediaFile(projectId, transformFn) {
  await getProjectFolderName(projectId);
  const mediaData = mediaRepo.getMediaFiles(projectId);
  transformFn(mediaData);
  mediaRepo.writeMediaData(projectId, mediaData);
  return mediaData;
}

// Files are buffered in memory (file.buffer); their bytes are persisted through
// the injected assetStorage adapter (local FS in OSS, R2 in hosted) rather than
// written straight to a hard-coded data dir. This keeps media tenant-isolated
// and cloud-portable. The final filename + collision handling moved into
// uploadProjectMedia (it needs the adapter to dedup against the store).
const storage = multer.memoryStorage();

// Configure multer file filter
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Supported types: images, audio (MP3), and PDF."), false);
  }
};

// Base multer config (shared by uploadWithLimit). The per-file size cap is NOT
// set here — it is applied per-request by uploadWithLimit from the limits adapter.
export const upload = multer({
  storage,
  fileFilter,
});

// Platform fallback when no limits adapter is wired (kept in sync with hosted's
// CloudLimitsAdapter MAX_UPLOAD_SIZE_BYTES).
const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Per-request multer for the media upload route. Sources the per-file size cap
 * from the injected limits adapter and enforces it as a streaming multer limit,
 * so an oversize part is rejected BEFORE the whole file is buffered into memory
 * (SA-02 — the old module-level upload had no fileSize limit and the size check
 * ran only after buffering, enabling a heap-exhaustion DoS). resolveActiveProject
 * runs first (router-level), so req.scope + req.adapters are present here.
 * Byte-neutral for OSS: LocalLimitsAdapter returns the same configured max the
 * post-buffer check already enforced — over-size files now fail fast (413).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function uploadWithLimit(req, res, next) {
  try {
    const cap = await req.adapters?.limits?.getLimit?.(req.scope, LIMIT_KEYS.MAX_UPLOAD_SIZE_BYTES);
    const fileSize = Number.isFinite(cap) ? cap : DEFAULT_MAX_UPLOAD_BYTES;
    multer({ storage, fileFilter, limits: { fileSize, files: 10 } }).array("files", 10)(req, res, next);
  } catch (err) {
    next(err);
  }
}

/**
 * Retrieves all media files metadata for a project.
 * @param {import('express').Request} req - Express request object with projectId in params
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function getProjectMedia(req, res) {
  try {

    const { projectId } = req.scope;

    if (!projectId) {
      return res.status(400).json({ error: "Project ID is required" });
    }

    // Validate the project exists + is owned (throws → mapped below). This
    // replaces a former on-disk projectDir existence check, which assumed the
    // global DATA_DIR and so 404'd under hosted's per-user storage; media
    // metadata comes from the DB, not that dir.
    await getProjectFolderName(projectId);

    const mediaData = await readMediaFile(projectId);
    res.json(mediaData);
  } catch (error) {
    console.error(`Error getting project media for project ${req.params.projectId}:`, error);
    if (handleProjectResolutionError(res, error)) return;
    res.status(500).json({
      error: "Failed to get project media",
      message: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
}

/**
 * Uploads media files to a project with dynamic size validation.
 * Processes images (generates thumbnails), sanitizes SVGs, and validates file types.
 * @param {import('express').Request} req - Express request object with projectId in params and files in req.files
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function uploadProjectMedia(req, res) {
  try {

    const scope = req.scope;
    const { projectId } = scope;
    const assetStorage = req.adapters.assetStorage;
    const files = req.files;

    if (!Array.isArray(files) || files.length === 0) {
      // This might happen if fileFilter rejected all files
      return res.status(400).json({ error: "No valid files uploaded or received." });
    }

    // Get the dynamic file size limit
    const maxImageSizeMB = await getSetting("media.maxFileSizeMB");
    // Pass projectId to allow theme overrides
    const imageSizes = await getImageProcessingSettings(projectId);

    // Validate project ownership
    await getProjectFolderName(projectId);

    // Sequential pre-pass: assign a collision-free filename to each file. The
    // old multer disk-filename callback deduped against the upload dir; now we
    // dedup against the adapter's existing keys (+ names assigned this request).
    // Tests pass file.filename directly, bypassing this.
    const listedNames = {};
    async function uniqueName(subdir, originalname) {
      if (!listedNames[subdir]) {
        const keys = await Promise.resolve(assetStorage.list(scope, `${subdir}/`)).catch(() => []);
        listedNames[subdir] = new Set(keys.map((k) => path.basename(k)));
      }
      const taken = listedNames[subdir];
      const decoded = decodeFileName(originalname);
      const ext = path.extname(decoded);
      let base = slugify(path.basename(decoded, ext), { lower: true, strict: true, trim: true }) || "file";
      if (base.length > 100) base = base.slice(0, 100);
      let name = `${base}${ext}`;
      let counter = 1;
      while (taken.has(name)) name = `${base}-${counter++}${ext}`;
      taken.add(name);
      return name;
    }

    const prepared = [];
    for (const file of files) {
      const subdir = getMediaCategory(file.mimetype) === "file" ? "files" : "images";
      const filename = file.filename || (await uniqueName(subdir, file.originalname));
      prepared.push({ file, subdir, filename });
    }

    // Process files in parallel instead of sequentially
    const filePromises = prepared.map(async ({ file, subdir, filename }) => {
      try {
        // Check file size against limit
        const maxSizeMB = maxImageSizeMB || 5;
        const maxSizeBytes = maxSizeMB * 1024 * 1024;

        if (file.size > maxSizeBytes) {
          return {
            success: false,
            file: {
              originalName: file.originalname,
              reason: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds limit of ${maxSizeMB}MB.`,
              sizeBytes: file.size,
            },
          };
        }

        // --- File is within size limit, proceed with processing ---
        // memoryStorage gives file.buffer; direct-controller tests pass file.path.
        let sourceBuffer = file.buffer;
        if (!sourceBuffer && file.path) sourceBuffer = await fs.readFile(file.path);
        if (!sourceBuffer) throw new Error("No file content received");

        const fileId = uuidv4();
        const uploadPath = `/uploads/${subdir}/${filename}`;

        const fileInfo = {
          id: fileId,
          filename,
          originalName: file.originalname,
          type: file.mimetype,
          size: file.size,
          uploaded: new Date().toISOString(),
          path: uploadPath,
          metadata: { alt: "", title: "", caption: "" },
          sizes: {}, // Initialize sizes object
        };

        // The bytes that get stored as the "original" (possibly recompressed /
        // sanitized below).
        let originalBuffer = sourceBuffer;

        // Process image files (thumbnails, dimensions etc.)
        if (file.mimetype.startsWith("image/") && file.mimetype !== "image/svg+xml") {
          const image = sharp(sourceBuffer, { limitInputPixels: 100_000_000 });
          const metadata = await image.metadata();

          // Safety: reject images with extreme dimensions (always enforced)
          if (metadata.width > 10_000 || metadata.height > 10_000) {
            return {
              success: false,
              file: {
                originalName: file.originalname,
                reason: `Image dimensions (${metadata.width}x${metadata.height}) exceed maximum of ${10_000}px.`,
                sizeBytes: file.size,
              },
            };
          }

          fileInfo.width = metadata.width;
          fileInfo.height = metadata.height;

          // Generate image sizes in parallel, each uploaded through the adapter.
          const sizePromises = Object.entries(imageSizes).map(async ([sizeName, sizeConfig]) => {
            if (sizeConfig.width >= metadata.width) return null;

            const ext = path.extname(filename);
            const resizedFilename = `${path.basename(filename, ext)}-${sizeName}${ext}`;

            // Preserve original format while applying quality settings
            const resizeOp = image.clone().resize({ width: sizeConfig.width });
            if (file.mimetype === "image/jpeg") {
              resizeOp.jpeg({ quality: sizeConfig.quality });
            } else if (file.mimetype === "image/png") {
              resizeOp.png({ quality: sizeConfig.quality });
            } else if (file.mimetype === "image/webp") {
              resizeOp.webp({ quality: sizeConfig.quality });
            }

            const { data, info } = await resizeOp.toBuffer({ resolveWithObject: true });
            await assetStorage.upload(scope, `images/${resizedFilename}`, data);

            return {
              sizeName,
              data: {
                path: `/uploads/images/${resizedFilename}`,
                width: info.width,
                height: info.height,
              },
            };
          });

          const sizeResults = await Promise.allSettled(sizePromises);
          sizeResults.forEach((result) => {
            if (result.status === "fulfilled" && result.value) {
              fileInfo.sizes[result.value.sizeName] = result.value.data;
            }
          });

          // Recompress the original when it's no larger than the largest enabled
          // size (it gets served via the imageTag fallback), reducing file size
          // without changing dimensions. GIFs are excluded (animation frames).
          if (file.mimetype !== "image/gif") {
            const largestEnabledWidth = Math.max(...Object.values(imageSizes).map((s) => s.width));

            if (metadata.width <= largestEnabledWidth) {
              const quality = Math.max(...Object.values(imageSizes).map((s) => s.quality));
              const compressOp = sharp(sourceBuffer);

              if (file.mimetype === "image/jpeg") {
                compressOp.jpeg({ quality });
              } else if (file.mimetype === "image/png") {
                compressOp.png({ quality });
              } else if (file.mimetype === "image/webp") {
                compressOp.webp({ quality });
              }

              originalBuffer = await compressOp.toBuffer();
              fileInfo.size = originalBuffer.length;
            }
          }
        } else if (file.mimetype === "image/svg+xml") {
          const sanitizedSvg = DOMPurify.sanitize(sourceBuffer.toString("utf-8"), {
            USE_PROFILES: { svg: true },
          });
          originalBuffer = Buffer.from(sanitizedSvg, "utf-8");
          fileInfo.size = originalBuffer.length;
        }

        // Persist the original bytes through the adapter.
        await assetStorage.upload(scope, `${subdir}/${filename}`, originalBuffer);

        return {
          success: true,
          file: fileInfo,
        };
      } catch (error) {
        console.error(`Failed to process file ${file.originalname}:`, error);
        return {
          success: false,
          file: {
            originalName: file.originalname,
            reason: `Processing failed: ${error.message}`,
          },
        };
      }
    });

    // Wait for all files to be processed
    const results = await Promise.allSettled(filePromises);

    const processedFiles = [];
    const rejectedFiles = [];

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        if (result.value.success) {
          processedFiles.push(result.value.file);
        } else {
          rejectedFiles.push(result.value.file);
        }
      } else {
        rejectedFiles.push({
          originalName: "Unknown file",
          reason: `Unexpected error: ${result.reason}`,
        });
      }
    });

    // Insert each processed file individually (no full read/write cycle)
    for (const file of processedFiles) {
      mediaRepo.addMediaFile(projectId, file);
    }

    // Determine response status based on results
    const status = rejectedFiles.length > 0 && processedFiles.length === 0 ? 400 : 201; // Bad request if all failed, else Created

    res.status(status).json({
      message: `Upload complete. Processed: ${processedFiles.length}, Rejected: ${rejectedFiles.length}.`,
      processedFiles: processedFiles,
      rejectedFiles: rejectedFiles,
    });
  } catch (error) {
    // Handle errors like reading settings file, reading/writing media.json etc.
    console.error("Error during project media upload process:", error);
    if (handleProjectResolutionError(res, error)) return;
    res.status(500).json({
      error: error.message || "Failed to process file upload.",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
}

/**
 * Updates metadata (alt text, title, description) for a media file.
 * @param {import('express').Request} req - Express request object with projectId and fileId in params, metadata in body
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function updateMediaMetadata(req, res) {
  try {

    const { projectId, fileId } = req.params;
    // TI-03: bind the inner :projectId to the owner-resolved scope. This route is
    // path-in-path (.../media/projects/:projectId/media/:fileId/metadata); the
    // router-level resolveActiveProject owner-checks the OUTER/stashed id before
    // the inner :projectId binds, so without this a caller could target another
    // tenant's project id in the leaf and overwrite their media metadata. OSS
    // standalone is byte-neutral: its single active project's id always equals
    // req.params.projectId, so the guard never fires for legitimate edits.
    if (req.scope && projectId !== req.scope.projectId) {
      return res.status(403).json({ error: "Project mismatch" });
    }
    const alt = stripHtmlTags(req.body.alt);
    const title = stripHtmlTags(req.body.title);
    const caption = stripHtmlTags(req.body.caption);
    // Validate project ownership
    await getProjectFolderName(projectId);

    // Get the specific file (scoped to project)
    const file = mediaRepo.getMediaFileById(projectId, fileId);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    // Validate input
    if (typeof alt === "undefined") {
      return res.status(400).json({ error: "Alt text is required for images" });
    }

    // Captions are an image-only concept; a caption sent for a non-image (e.g. a
    // PDF, via direct API) is stored as "" rather than text.
    const captionForType = file.type?.startsWith("image/") ? caption || "" : "";

    // Update metadata in DB (alt, title, caption columns, scoped to project)
    mediaRepo.updateFileMetadata(projectId, fileId, { alt: alt || "", title: title || "", caption: captionForType });

    // Build response metadata in the shape the frontend expects
    const metadata = { alt: alt || "", title: title || "", caption: captionForType };

    res.json({
      message: "Metadata updated successfully",
      file: { ...file, metadata },
    });
  } catch (error) {
    console.error("Error updating media metadata:", error);
    if (handleProjectResolutionError(res, error)) return;
    res.status(500).json({ error: "Failed to update media metadata" });
  }
}

/**
 * Deletes a media file and all its generated sizes from a project.
 * Prevents deletion if the file is currently in use.
 * @param {import('express').Request} req - Express request object with projectId and fileId in params
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function deleteProjectMedia(req, res) {
  try {

    const { fileId } = req.params;
    const scope = req.scope;
    const { projectId } = scope;
    const assetStorage = req.adapters.assetStorage;

    // Validate project ownership
    await getProjectFolderName(projectId);

    // Get the specific file from DB (scoped to project)
    const fileToDelete = mediaRepo.getMediaFileById(projectId, fileId);
    if (!fileToDelete) {
      return res.status(404).json({ error: "File not found" });
    }

    // Check if file is currently in use
    if (fileToDelete.usedIn && fileToDelete.usedIn.length > 0) {
      return res.status(400).json({
        error: "Cannot delete file that is currently in use",
        usedIn: fileToDelete.usedIn,
        filename: fileToDelete.filename,
      });
    }

    // Remove the original + every generated size through the storage adapter.
    await deleteMediaAssets(assetStorage, scope, fileToDelete);

    // Remove metadata from DB (cascade deletes sizes + usage, scoped to project)
    mediaRepo.deleteMediaFile(projectId, fileId);

    res.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Error deleting project media:", error);
    if (handleProjectResolutionError(res, error)) return;
    res.status(500).json({ error: "Failed to delete project media" });
  }
}

/**
 * Serves a media file from a project's uploads directory.
 * Supports lookup by file ID or filename, handles images, videos, and audio.
 * @param {import('express').Request} req - Express request object with projectId and fileId/filename in params
 * @param {import('express').Response} res - Express response object (streams file)
 * @returns {Promise<void>}
 */
export async function serveProjectMedia(req, res) {
  try {
    const { projectId, fileId, filename } = req.params;

    // Resolve the adapter key (path under uploads/, e.g. images/foo.jpg).
    let key;
    if (filename) {
      // Determine subdirectory from the request path (uploads/images/ or uploads/files/)
      const isFilesRoute = req.path && req.path.includes("/uploads/files/");
      key = `${isFilesRoute ? "files" : "images"}/${filename}`;
    } else if (fileId) {
      const mediaData = await readMediaFile(projectId);
      const fileInfo = mediaData.files.find((file) => file.id === fileId);
      if (!fileInfo) {
        return res.status(404).json({ error: "File not found" });
      }
      key = fileInfo.path.replace(/^\/uploads\//, "");
    }

    if (!key) {
      return res.status(400).json({ error: "Invalid request" });
    }

    // This route is project-id-in-path (browser-native loads can't carry the
    // X-Project-Id header), so resolveActiveProject may not have run — build the
    // scope from the project, preserving any actor already resolved.
    const folderName = await getProjectFolderName(projectId);
    const scope = { ...(req.scope || {}), projectId, folderName };

    const stat = await req.adapters.assetStorage.stat(scope, key);
    if (!stat) {
      return res.status(404).json({ error: "File not found" });
    }
    const fileSize = stat.size;

    res.setHeader("Content-Type", getContentType(path.extname(key).toLowerCase()));
    res.setHeader("Accept-Ranges", "bytes");

    const onStreamError = (err) => {
      console.error("Error streaming project media:", err);
      if (!res.headersSent) res.status(500).json({ error: "Failed to serve project media" });
    };

    // Honor byte-range requests so audio/video can seek (HTTP 206). Without this,
    // media plays from the start (off a 200) but seeking snaps back to 0.
    const rangeHeader = req.headers.range;
    const match = rangeHeader ? /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim()) : null;
    if (match && (match[1] !== "" || match[2] !== "")) {
      let start;
      let end;
      if (match[1] === "") {
        // Suffix range: final N bytes.
        start = Math.max(0, fileSize - parseInt(match[2], 10));
        end = fileSize - 1;
      } else {
        start = parseInt(match[1], 10);
        end = match[2] === "" ? fileSize - 1 : Math.min(parseInt(match[2], 10), fileSize - 1);
      }

      if (start > end || start >= fileSize) {
        return res.status(416).setHeader("Content-Range", `bytes */${fileSize}`).end();
      }

      const rangeStream = await req.adapters.assetStorage.download(scope, key, { start, end });
      if (!rangeStream) {
        return res.status(404).json({ error: "File not found" });
      }
      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
      res.setHeader("Content-Length", end - start + 1);
      rangeStream.on("error", onStreamError);
      rangeStream.pipe(res);
      return;
    }

    // No (or malformed) range — stream the full file.
    const stream = await req.adapters.assetStorage.download(scope, key);
    if (!stream) {
      return res.status(404).json({ error: "File not found" });
    }
    res.setHeader("Content-Length", fileSize);
    stream.on("error", onStreamError);
    stream.pipe(res);
  } catch (error) {
    console.error("Error serving project media:", error);
    if (handleProjectResolutionError(res, error)) return;
    res.status(500).json({ error: "Failed to serve project media" });
  }
}

/**
 * Deletes multiple media files from a project in a single operation.
 * Skips files that are currently in use and reports them in the response.
 * @param {import('express').Request} req - Express request object with projectId in params and fileIds array in body
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function bulkDeleteProjectMedia(req, res) {
  try {

    const scope = req.scope;
    const { projectId } = scope;
    const assetStorage = req.adapters.assetStorage;
    const { fileIds } = req.body; // Expect an array of file IDs

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ error: "fileIds must be a non-empty array" });
    }

    // Validate project ownership
    await getProjectFolderName(projectId);

    // Read all media to check usage (needed for in-use validation)
    const mediaData = mediaRepo.getMediaFiles(projectId);

    const filesToDelete = [];
    const filesInUse = [];

    // Separate files to delete from files in use
    mediaData.files.forEach((file) => {
      if (fileIds.includes(file.id)) {
        if (file.usedIn && file.usedIn.length > 0) {
          filesInUse.push({
            id: file.id,
            filename: file.filename,
            usedIn: file.usedIn,
          });
        } else {
          filesToDelete.push(file);
        }
      }
    });

    // If all files are in use, return success with info (not an error - the request was valid)
    if (filesToDelete.length === 0 && filesInUse.length > 0) {
      return res.status(200).json({
        message: "No files were deleted because they are all currently in use.",
        deletedCount: 0,
        filesInUse: filesInUse,
      });
    }

    // If no files found at all
    if (filesToDelete.length === 0 && filesInUse.length === 0) {
      return res.status(404).json({ error: "No matching files found to delete" });
    }

    // Remove every original + size through the storage adapter.
    await Promise.all(filesToDelete.map((file) => deleteMediaAssets(assetStorage, scope, file)));

    // Batch delete from DB (cascade handles sizes + usage, scoped to project)
    mediaRepo.deleteMediaFiles(projectId, filesToDelete.map((f) => f.id));

    // Build response message
    const response = {
      message: `${filesToDelete.length} file${filesToDelete.length !== 1 ? "s" : ""} deleted successfully.`,
      deletedCount: filesToDelete.length,
    };

    if (filesInUse.length > 0) {
      response.filesInUse = filesInUse;
      response.warning = `${filesInUse.length} file${filesInUse.length !== 1 ? "s" : ""} could not be deleted because ${filesInUse.length !== 1 ? "they are" : "it is"} currently in use.`;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Error during bulk media deletion:", error);
    if (handleProjectResolutionError(res, error)) return;
    res.status(500).json({
      error: "Failed to delete files.",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
}

/**
 * Retrieves usage information showing which pages use a specific media file.
 * @param {import('express').Request} req - Express request object with projectId and fileId in params
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function getMediaFileUsage(req, res) {
  try {

    const { fileId } = req.params;
    const { projectId } = req.scope;
    const usage = await getMediaUsage(projectId, fileId);
    res.json(usage);
  } catch (error) {
    console.error("Error getting media usage:", error);
    if (handleProjectResolutionError(res, error)) return;
    if (error.message === "File not found") {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Failed to get media usage" });
    }
  }
}

/**
 * Refreshes media usage tracking by scanning all pages in a project.
 * Updates the usedIn field for all media files based on current page content.
 * @param {import('express').Request} req - Express request object with projectId in params
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function refreshMediaUsage(req, res) {
  try {

    const { projectId } = req.scope;
    const result = await refreshAllMediaUsage(projectId);
    res.json(result);
  } catch (error) {
    console.error("Error refreshing media usage:", error);
    if (handleProjectResolutionError(res, error)) return;
    res.status(500).json({ error: "Failed to refresh media usage" });
  }
}
