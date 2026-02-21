import fs from "fs-extra";
import { createReadStream } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import sharp from "sharp";
import slugify from "slugify";
import DOMPurify from "isomorphic-dompurify";
import {
  getProjectDir,
  getProjectImagesDir,
  getImagePath,
  getVideoPath,
  getAudioPath,
  getThemeJsonPath,
  getMediaDir,
} from "../config.js";
import { ALLOWED_MIME_TYPES, getContentType, getMediaCategory } from "../utils/mimeTypes.js";
import { getSetting } from "./appSettingsController.js";
import { getMediaUsage, refreshAllMediaUsage } from "../services/mediaUsageService.js";
import { getProjectFolderName, getProjectDetails } from "../utils/projectHelpers.js";
import { handleProjectResolutionError, PROJECT_ERROR_CODES } from "../utils/projectErrors.js";
import * as mediaRepo from "../db/repositories/mediaRepository.js";
import { stripHtmlTags } from "../services/sanitizationService.js";

// Get image processing settings from app settings
async function getImageProcessingSettings(projectId, userId = "local") {
  const quality = (await getSetting("media.imageProcessing.quality", userId)) || 85;
  const defaultSizesConfig = (await getSetting("media.imageProcessing.sizes", userId)) || {
    thumb: { width: 150, enabled: true },
    small: { width: 480, enabled: true },
    medium: { width: 1024, enabled: true },
    large: { width: 1920, enabled: true },
  };
  let sizesConfig = defaultSizesConfig;

  // If projectId is provided, try to load theme-specific overrides
  if (projectId) {
    try {
      const project = await getProjectDetails(projectId, userId);
      if (project && project.theme) {
        const themeJsonPath = getThemeJsonPath(project.theme, userId);
        if (await fs.pathExists(themeJsonPath)) {
          const themeConfig = await fs.readJson(themeJsonPath);
          if (themeConfig.settings?.imageSizes) {
            console.log(
              `[getImageProcessingSettings] Using theme image sizes for project ${projectId} (theme: ${project.theme})`,
            );
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

/**
 * Reads media metadata from SQLite for a project.
 * @param {string} projectId - The project UUID
 * @returns {Promise<{files: Array<object>}>} The media metadata object
 */
export async function readMediaFile(projectId, userId = "local") {
  // Validate project exists (throws if not found)
  await getProjectFolderName(projectId, userId);
  return mediaRepo.getMediaFiles(projectId);
}

/**
 * Writes media metadata to SQLite for a project (full replacement).
 * @param {string} projectId - The project UUID
 * @param {{files: Array<object>}} data - The media metadata to save
 * @param {string} userId - The user ID (validates project ownership)
 */
export async function writeMediaFile(projectId, data, userId = "local") {
  await getProjectFolderName(projectId, userId);
  mediaRepo.writeMediaData(projectId, data);
}

/**
 * Atomically reads media data, applies a transform function, and writes it back.
 * SQLite transactions handle atomicity natively — no write locks needed.
 * @param {string} projectId - The project UUID
 * @param {function(Object): void} transformFn - Function that receives mediaData and mutates it in place
 * @param {string} userId - The user ID (validates project ownership)
 * @returns {Promise<Object>} The transformed media data
 */
export async function atomicUpdateMediaFile(projectId, transformFn, userId = "local") {
  await getProjectFolderName(projectId, userId);
  const mediaData = mediaRepo.getMediaFiles(projectId);
  transformFn(mediaData);
  mediaRepo.writeMediaData(projectId, mediaData);
  return mediaData;
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    try {
      const { projectId } = req.params;
      const projectFolderName = await getProjectFolderName(projectId, req.userId);
      const projectDir = getProjectDir(projectFolderName, req.userId);

      if (!(await fs.pathExists(projectDir))) {
        const error = new Error(`Project directory not found for ${projectId}`);
        error.code = PROJECT_ERROR_CODES.PROJECT_DIR_MISSING;
        throw error;
      }
      const targetDir = getMediaDir(projectFolderName, file.mimetype, req.userId);

      await fs.ensureDir(targetDir);
      cb(null, targetDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: async function (req, file, cb) {
    try {
      const decodedName = decodeFileName(file.originalname);
      const extension = path.extname(decodedName);
      const nameWithoutExt = path.basename(decodedName, extension);
      let cleanName = slugify(nameWithoutExt, { lower: true, strict: true, trim: true });
      const { projectId } = req.params;
      const projectFolderName = await getProjectFolderName(projectId, req.userId);
      const projectDir = getProjectDir(projectFolderName, req.userId);

      if (!(await fs.pathExists(projectDir))) {
        const error = new Error(`Project directory not found for ${projectId}`);
        error.code = PROJECT_ERROR_CODES.PROJECT_DIR_MISSING;
        throw error;
      }

      const targetDir = getMediaDir(projectFolderName, file.mimetype, req.userId);

      let finalName = `${cleanName}${extension}`;
      let counter = 1;
      while (await fs.pathExists(path.join(targetDir, finalName))) {
        finalName = `${cleanName}-${counter}${extension}`;
        counter++;
      }
      cb(null, finalName);
    } catch (error) {
      cb(error);
    }
  },
});

// Configure multer file filter
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only images and videos are allowed."), false);
  }
};

// Initialize multer WITHOUT static limits
export const upload = multer({
  storage,
  fileFilter,
  // No 'limits' object here anymore
});

/**
 * Retrieves all media files metadata for a project.
 * @param {import('express').Request} req - Express request object with projectId in params
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function getProjectMedia(req, res) {
  try {
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({ error: "Project ID is required" });
    }

    const projectFolderName = await getProjectFolderName(projectId, req.userId);

    // Ensure project exists
    const projectDir = getProjectDir(projectFolderName, req.userId);
    if (!(await fs.pathExists(projectDir))) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Read media metadata
    const mediaData = await readMediaFile(projectId, req.userId);

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
    const { projectId } = req.params;
    const files = req.files;

    if (!Array.isArray(files) || files.length === 0) {
      // This might happen if fileFilter rejected all files
      return res.status(400).json({ error: "No valid files uploaded or received." });
    }

    // Get the dynamic file size limits
    const maxImageSizeMB = await getSetting("media.maxFileSizeMB", req.userId);
    const maxVideoSizeMB = await getSetting("media.maxVideoSizeMB", req.userId);
    const maxAudioSizeMB = await getSetting("media.maxAudioSizeMB", req.userId);
    // Pass projectId to allow theme overrides
    const imageSizes = await getImageProcessingSettings(projectId, req.userId);

    const mediaData = await readMediaFile(projectId, req.userId);

    // Process files in parallel instead of sequentially
    const filePromises = files.map(async (file) => {
      try {
        // Check file size against the appropriate limit
        const fileType = getMediaCategory(file.mimetype);
        const maxSizeMB =
          fileType === "video" ? (maxVideoSizeMB || 50) :
          fileType === "audio" ? (maxAudioSizeMB || 25) :
          (maxImageSizeMB || 5);
        const maxSizeBytes = maxSizeMB * 1024 * 1024;

        if (file.size > maxSizeBytes) {
          // File exceeds limit, reject it and delete temp file
          try {
            await fs.unlink(file.path);
          } catch (unlinkError) {
            console.warn(`Could not delete oversized temp file ${file.path}: ${unlinkError.message}`);
          }
          return {
            success: false,
            file: {
              originalName: file.originalname,
              reason: `${fileType} size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds limit of ${maxSizeMB}MB.`,
              sizeBytes: file.size,
            },
          };
        }

        // --- File is within size limit, proceed with processing ---
        const fileId = uuidv4();
        const uploadSubdir = fileType === "video" ? "videos" : fileType === "audio" ? "audios" : "images";
        const uploadPath = `/uploads/${uploadSubdir}/${file.filename}`;

        const fileInfo = {
          id: fileId,
          filename: file.filename,
          originalName: file.originalname,
          type: file.mimetype,
          size: file.size,
          uploaded: new Date().toISOString(),
          path: uploadPath,
          metadata: fileType === "image" ? { alt: "", title: "" } : { title: "", description: "" },
          sizes: {}, // Initialize sizes object
        };

        // Process image files (thumbnails, dimensions etc.)
        if (file.mimetype.startsWith("image/") && file.mimetype !== "image/svg+xml") {
          const image = sharp(file.path);
          const metadata = await image.metadata();
          fileInfo.width = metadata.width;
          fileInfo.height = metadata.height;

          // Generate image sizes in parallel
          const sizePromises = Object.entries(imageSizes).map(async ([sizeName, sizeConfig]) => {
            if (sizeConfig.width >= metadata.width) return null;

            const resizedFilename = `${path.basename(
              file.filename,
              path.extname(file.filename),
            )}-${sizeName}${path.extname(file.filename)}`;
            const resizedPath = path.join(path.dirname(file.path), resizedFilename);

            // Preserve original format while applying quality settings
            const resizeOp = image.clone().resize({ width: sizeConfig.width });

            // Apply quality based on original format
            if (file.mimetype === "image/jpeg") {
              resizeOp.jpeg({ quality: sizeConfig.quality });
            } else if (file.mimetype === "image/png") {
              resizeOp.png({ quality: sizeConfig.quality });
            } else if (file.mimetype === "image/webp") {
              resizeOp.webp({ quality: sizeConfig.quality });
            }

            await resizeOp.toFile(resizedPath);

            const resizedImageMetadata = await sharp(resizedPath).metadata();

            return {
              sizeName,
              data: {
                path: `/uploads/images/${resizedFilename}`,
                width: resizedImageMetadata.width,
                height: resizedImageMetadata.height,
              },
            };
          });

          const sizeResults = await Promise.allSettled(sizePromises);
          sizeResults.forEach((result) => {
            if (result.status === "fulfilled" && result.value) {
              fileInfo.sizes[result.value.sizeName] = result.value.data;
            }
          });
        } else if (file.mimetype === "image/svg+xml") {
          const svgContent = await fs.readFile(file.path, "utf-8");
          const sanitizedSvg = DOMPurify.sanitize(svgContent, { USE_PROFILES: { svg: true } });
          await fs.writeFile(file.path, sanitizedSvg);
        }

        // Process video files (basic metadata only)
        if (file.mimetype.startsWith("video/")) {
          fileInfo.thumbnail = null; // No thumbnail for videos
        }

        return {
          success: true,
          file: fileInfo,
        };
      } catch (error) {
        console.error(`Failed to process file ${file.originalname}:`, error);
        // Clean up the file on error
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.warn(`Could not delete failed temp file ${file.path}: ${unlinkError.message}`);
        }
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
          mediaData.files.push(result.value.file);
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

    // Save updated metadata if any files were successfully processed
    if (processedFiles.length > 0) {
      await writeMediaFile(projectId, mediaData, req.userId);
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
    const alt = stripHtmlTags(req.body.alt);
    const title = stripHtmlTags(req.body.title);
    const description = stripHtmlTags(req.body.description);

    // Read media metadata
    const mediaData = await readMediaFile(projectId, req.userId);

    // Find the file to update
    const fileIndex = mediaData.files.findIndex((file) => file.id === fileId);
    if (fileIndex === -1) {
      return res.status(404).json({ error: "File not found" });
    }

    const file = mediaData.files[fileIndex];
    const isImage = file.type && file.type.startsWith("image/");
    const isVideoOrAudio = file.type && (file.type.startsWith("video/") || file.type.startsWith("audio/"));

    // Validate input based on media type
    // Images require alt text; video/audio only need title and description (both optional)
    if (isImage && typeof alt === "undefined") {
      return res.status(400).json({ error: "Alt text is required for images" });
    }

    // Update metadata - ensure metadata object exists
    if (isImage) {
      mediaData.files[fileIndex].metadata = {
        ...mediaData.files[fileIndex].metadata,
        alt: alt || "",
        title: title || "",
      };
    } else if (isVideoOrAudio) {
      // Create new metadata object, preserving other fields but explicitly removing alt
      const newMetadata = {
        ...mediaData.files[fileIndex].metadata,
        title: title || "",
        description: description || "",
      };
      delete newMetadata.alt;

      mediaData.files[fileIndex].metadata = newMetadata;
    } else {
      // Fallback for unknown types
      mediaData.files[fileIndex].metadata = {
        ...mediaData.files[fileIndex].metadata,
        alt: alt || "",
        title: title || "",
        description: description || "",
      };
    }

    // Save updated metadata
    await writeMediaFile(projectId, mediaData, req.userId);

    res.json({
      message: "Metadata updated successfully",
      file: mediaData.files[fileIndex],
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
    const { projectId, fileId } = req.params;

    // Read media metadata
    const mediaData = await readMediaFile(projectId, req.userId);

    // Find the file to delete
    const fileIndex = mediaData.files.findIndex((file) => file.id === fileId);
    if (fileIndex === -1) {
      return res.status(404).json({ error: "File not found" });
    }

    const fileToDelete = mediaData.files[fileIndex];

    // Check if file is currently in use
    if (fileToDelete.usedIn && fileToDelete.usedIn.length > 0) {
      return res.status(400).json({
        error: "Cannot delete file that is currently in use",
        usedIn: fileToDelete.usedIn,
        filename: fileToDelete.filename,
      });
    }

    // Remove the physical files from storage
    const projectFolderName = await getProjectFolderName(projectId, req.userId);
    const fileDir = getMediaDir(projectFolderName, fileToDelete.type, req.userId);

    // 1. Delete the original file
    const originalFilePath = path.join(fileDir, fileToDelete.filename);
    try {
      if (await fs.pathExists(originalFilePath)) {
        await fs.unlink(originalFilePath);
      }
    } catch (err) {
      console.warn(`Could not delete original file ${originalFilePath}: ${err.message}`);
    }

    // 2. Delete all generated sizes (for images)
    if (fileToDelete.sizes) {
      for (const sizeName in fileToDelete.sizes) {
        const size = fileToDelete.sizes[sizeName];
        if (size && size.path) {
          const sizeFilename = path.basename(size.path);
          const sizeFilePath = path.join(getProjectImagesDir(projectFolderName, req.userId), sizeFilename);
          try {
            if (await fs.pathExists(sizeFilePath)) {
              await fs.unlink(sizeFilePath);
            }
          } catch (err) {
            console.warn(`Could not delete sized file ${sizeFilePath}: ${err.message}`);
          }
        }
      }
    }

    // Remove metadata entry
    mediaData.files.splice(fileIndex, 1);
    await writeMediaFile(projectId, mediaData, req.userId);

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

    let filePath;

    // If we have a filename directly, use it
    if (filename) {
      // Determine file type by extension to choose correct directory
      const ext = path.extname(filename).toLowerCase();
      const videoExtensions = [".mp4"];
      const audioExtensions = [".mp3"];

      const projectFolderName = await getProjectFolderName(projectId, req.userId);
      if (videoExtensions.includes(ext)) {
        filePath = getVideoPath(projectFolderName, filename, req.userId);
      } else if (audioExtensions.includes(ext)) {
        filePath = getAudioPath(projectFolderName, filename, req.userId);
      } else {
        filePath = getImagePath(projectFolderName, filename, req.userId);
      }
    }
    // Otherwise, look up the file by ID
    else if (fileId) {
      // Read media metadata
      const mediaData = await readMediaFile(projectId, req.userId);

      // Find the file
      const fileInfo = mediaData.files.find((file) => file.id === fileId);
      if (!fileInfo) {
        return res.status(404).json({ error: "File not found" });
      }

      const projectFolderName = await getProjectFolderName(projectId, req.userId);
      filePath = path.join(getProjectDir(projectFolderName, req.userId), fileInfo.path);
    }

    if (!filePath) {
      return res.status(400).json({ error: "Invalid request" });
    }

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: "File not found" });
    }

    // Determine content type
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader("Content-Type", getContentType(ext));

    // Stream the file
    const fileStream = createReadStream(filePath);
    fileStream.pipe(res);
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
    const { projectId } = req.params;
    const { fileIds } = req.body; // Expect an array of file IDs

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ error: "fileIds must be a non-empty array" });
    }

    const mediaData = await readMediaFile(projectId, req.userId);

    const filesToDelete = [];
    const remainingFiles = [];

    // Separate files to delete from files to keep
    const filesInUse = [];
    mediaData.files.forEach((file) => {
      if (fileIds.includes(file.id)) {
        // Check if file is in use before adding to delete list
        if (file.usedIn && file.usedIn.length > 0) {
          // File is in use - add to filesInUse for the response AND keep it in remainingFiles
          filesInUse.push({
            id: file.id,
            filename: file.filename,
            usedIn: file.usedIn,
          });
          remainingFiles.push(file); // ← IMPORTANT: Keep in-use files in the library!
        } else {
          filesToDelete.push(file);
        }
      } else {
        remainingFiles.push(file);
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

    // If some files are in use but some can be deleted, proceed with partial deletion
    // We'll delete what we can and return info about files that couldn't be deleted

    // Asynchronously delete all associated physical files
    const deletePromises = filesToDelete.map(async (file) => {
      // 1. Delete the original file
      const projectFolderName = await getProjectFolderName(projectId, req.userId);
      const fileDir = getMediaDir(projectFolderName, file.type, req.userId);

      const originalFilePath = path.join(fileDir, file.filename);
      try {
        if (await fs.pathExists(originalFilePath)) await fs.unlink(originalFilePath);
      } catch (err) {
        console.warn(`Could not delete original file ${originalFilePath}: ${err.message}`);
      }
      // 2. Delete all generated sizes (for images)
      if (file.sizes) {
        for (const sizeName in file.sizes) {
          const size = file.sizes[sizeName];
          if (size && size.path) {
            const sizeFilename = path.basename(size.path);
            const sizeFilePath = path.join(getProjectImagesDir(projectFolderName, req.userId), sizeFilename);
            try {
              if (await fs.pathExists(sizeFilePath)) await fs.unlink(sizeFilePath);
            } catch (err) {
              console.warn(`Could not delete sized file ${sizeFilePath}: ${err.message}`);
            }
          }
        }
      }
    });

    await Promise.all(deletePromises);

    // Update the media.json with the remaining files
    mediaData.files = remainingFiles;
    await writeMediaFile(projectId, mediaData, req.userId);

    // Build response message
    const response = {
      message: `${filesToDelete.length} file${filesToDelete.length !== 1 ? "s" : ""} deleted successfully.`,
      deletedCount: filesToDelete.length,
    };

    // If some files were in use, include that info
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
    const { projectId, fileId } = req.params;
    const usage = await getMediaUsage(projectId, fileId, req.userId);
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
    const { projectId } = req.params;
    const result = await refreshAllMediaUsage(projectId, req.userId);
    res.json(result);
  } catch (error) {
    console.error("Error refreshing media usage:", error);
    if (handleProjectResolutionError(res, error)) return;
    res.status(500).json({ error: "Failed to refresh media usage" });
  }
}
