import fs from "fs-extra";
import { createReadStream } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import sharp from "sharp";
import slugify from "slugify";
import DOMPurify from "isomorphic-dompurify";
import { validationResult } from "express-validator";
import {
  getProjectDir,
  getProjectImagesDir,
  getProjectVideosDir,
  getProjectAudiosDir,
  getProjectMediaJsonPath,
  getImagePath,
  getVideoPath,
  getAudioPath,
} from "../config.js";
import { getSetting } from "./appSettingsController.js";
import { getMediaUsage, refreshAllMediaUsage } from "../services/mediaUsageService.js";
import { getProjectFolderName } from "../utils/projectHelpers.js";

// Get image processing settings from app settings
async function getImageProcessingSettings() {
  const quality = (await getSetting("media.imageProcessing.quality")) || 85;
  const sizesConfig = (await getSetting("media.imageProcessing.sizes")) || {
    thumb: { width: 150, enabled: true },
    small: { width: 480, enabled: true },
    medium: { width: 1024, enabled: true },
    large: { width: 1920, enabled: true },
  };

  // Filter out disabled sizes and format for processing
  const enabledSizes = {};
  for (const [name, config] of Object.entries(sizesConfig)) {
    if (config.enabled !== false) {
      // enabled by default if not specified
      enabledSizes[name] = { width: config.width, quality };
    }
  }

  return enabledSizes;
}

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/avi",
  "video/mov",
  "audio/mpeg", // MP3 audio files
];

// Decode the filename TODO: Where should things like this live?
function decodeFileName(filename) {
  try {
    return decodeURIComponent(escape(filename));
  } catch {
    return filename;
  }
}

// Read media.json metadata file
export async function readMediaFile(projectId) {
  const projectFolderName = await getProjectFolderName(projectId);
  const mediaFilePath = getProjectMediaJsonPath(projectFolderName);

  try {
    await fs.access(mediaFilePath);
    const data = await fs.readFile(mediaFilePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, create a new one
    if (error.code === "ENOENT") {
      const initialData = { files: [] };
      // Use outputFile which creates directories if needed
      await fs.outputFile(mediaFilePath, JSON.stringify(initialData, null, 2));
      return initialData;
    }
    throw error;
  }
}

// Write media metadata file
async function writeMediaFile(projectId, data) {
  const projectFolderName = await getProjectFolderName(projectId);
  const mediaFilePath = getProjectMediaJsonPath(projectFolderName);
  await fs.outputFile(mediaFilePath, JSON.stringify(data, null, 2));
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    try {
      const { projectId } = req.params;
      const projectFolderName = await getProjectFolderName(projectId);
      let targetDir;

      if (file.mimetype.startsWith("video/")) {
        targetDir = getProjectVideosDir(projectFolderName);
      } else if (file.mimetype.startsWith("audio/")) {
        targetDir = getProjectAudiosDir(projectFolderName);
      } else {
        targetDir = getProjectImagesDir(projectFolderName);
      }

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
      const projectFolderName = await getProjectFolderName(projectId);

      let targetDir;
      if (file.mimetype.startsWith("video/")) {
        targetDir = getProjectVideosDir(projectFolderName);
      } else if (file.mimetype.startsWith("audio/")) {
        targetDir = getProjectAudiosDir(projectFolderName);
      } else {
        targetDir = getProjectImagesDir(projectFolderName);
      }

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

// Get all media files for a project
export async function getProjectMedia(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { projectId } = req.params;
    const projectFolderName = await getProjectFolderName(projectId);

    // Ensure project exists
    const projectDir = getProjectDir(projectFolderName);
    if (!(await fs.pathExists(projectDir))) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Read media metadata
    const mediaData = await readMediaFile(projectId);

    res.json(mediaData);
  } catch (error) {
    console.error("Error getting project media:", error);
    res.status(500).json({
      error: "Failed to get project media",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
}

// Upload media files to a project (with dynamic size check inside)
export async function uploadProjectMedia(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { projectId } = req.params;
    const files = req.files;

    if (!Array.isArray(files) || files.length === 0) {
      // This might happen if fileFilter rejected all files
      return res.status(400).json({ error: "No valid files uploaded or received." });
    }

    // Get the dynamic file size limits
    const maxImageSizeMB = await getSetting("media.maxFileSizeMB");
    const maxVideoSizeMB = await getSetting("media.maxVideoSizeMB");
    const maxAudioSizeMB = await getSetting("media.maxAudioSizeMB");
    const imageSizes = await getImageProcessingSettings();

    const mediaData = await readMediaFile(projectId);

    // Process files in parallel instead of sequentially
    const filePromises = files.map(async (file) => {
      try {
        // Check file size against the appropriate limit
        const isVideo = file.mimetype.startsWith("video/");
        const isAudio = file.mimetype.startsWith("audio/");
        let maxSizeMB, fileType;
        if (isVideo) {
          maxSizeMB = maxVideoSizeMB || 50;
          fileType = "video";
        } else if (isAudio) {
          maxSizeMB = maxAudioSizeMB || 25;
          fileType = "audio";
        } else {
          maxSizeMB = maxImageSizeMB || 5;
          fileType = "image";
        }
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
        let uploadPath;
        if (isVideo) {
          uploadPath = `/uploads/videos/${file.filename}`;
        } else if (isAudio) {
          uploadPath = `/uploads/audios/${file.filename}`;
        } else {
          uploadPath = `/uploads/images/${file.filename}`;
        }

        const fileInfo = {
          id: fileId,
          filename: file.filename,
          originalName: file.originalname,
          type: file.mimetype,
          size: file.size,
          uploaded: new Date().toISOString(),
          path: uploadPath,
          metadata: isVideo || isAudio ? { title: "", description: "" } : { alt: "", title: "" },
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
      await writeMediaFile(projectId, mediaData);
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
    res.status(500).json({
      error: error.message || "Failed to process file upload.",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
}

// Update media metadata
export async function updateMediaMetadata(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { projectId, fileId } = req.params;
    const { alt, title, description } = req.body;

    // Read media metadata
    const mediaData = await readMediaFile(projectId);

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
    await writeMediaFile(projectId, mediaData);

    res.json({
      message: "Metadata updated successfully",
      file: mediaData.files[fileIndex],
    });
  } catch (error) {
    console.error("Error updating media metadata:", error);
    res.status(500).json({ error: "Failed to update media metadata" });
  }
}

// Delete a media file
export async function deleteProjectMedia(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { projectId, fileId } = req.params;

    // Read media metadata
    const mediaData = await readMediaFile(projectId);

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
    let fileDir;
    const projectFolderName = await getProjectFolderName(projectId);
    if (fileToDelete.type && fileToDelete.type.startsWith("video/")) {
      fileDir = getProjectVideosDir(projectFolderName);
    } else if (fileToDelete.type && fileToDelete.type.startsWith("audio/")) {
      fileDir = getProjectAudiosDir(projectFolderName);
    } else {
      fileDir = getProjectImagesDir(projectFolderName);
    }

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
          const sizeFilePath = path.join(getProjectImagesDir(projectFolderName), sizeFilename);
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
    await writeMediaFile(projectId, mediaData);

    res.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Error deleting project media:", error);
    res.status(500).json({ error: "Failed to delete project media" });
  }
}

// Serve a media file
export async function serveProjectMedia(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { projectId, fileId, filename } = req.params;

    let filePath;

    // If we have a filename directly, use it
    if (filename) {
      // Determine file type by extension to choose correct directory
      const ext = path.extname(filename).toLowerCase();
      const videoExtensions = [".mp4", ".webm", ".ogg", ".avi", ".mov"];
      const audioExtensions = [".mp3"];

      const projectFolderName = await getProjectFolderName(projectId);
      if (videoExtensions.includes(ext)) {
        filePath = getVideoPath(projectFolderName, filename);
      } else if (audioExtensions.includes(ext)) {
        filePath = getAudioPath(projectFolderName, filename);
      } else {
        filePath = getImagePath(projectFolderName, filename);
      }
    }
    // Otherwise, look up the file by ID
    else if (fileId) {
      // Read media metadata
      const mediaData = await readMediaFile(projectId);

      // Find the file
      const fileInfo = mediaData.files.find((file) => file.id === fileId);
      if (!fileInfo) {
        return res.status(404).json({ error: "File not found" });
      }

      const projectFolderName = await getProjectFolderName(projectId);
      filePath = path.join(getProjectDir(projectFolderName), fileInfo.path);
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
    const contentTypes = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".ogg": "video/ogg",
      ".avi": "video/avi",
      ".mov": "video/mov",
      ".mp3": "audio/mpeg",
    };

    const contentType = contentTypes[ext] || "application/octet-stream";
    res.setHeader("Content-Type", contentType);

    // Stream the file
    const fileStream = createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error("Error serving project media:", error);
    res.status(500).json({ error: "Failed to serve project media" });
  }
}

// Bulk delete multiple media files from a project
export async function bulkDeleteProjectMedia(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { projectId } = req.params;
    const { fileIds } = req.body; // Expect an array of file IDs

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ error: "fileIds must be a non-empty array" });
    }

    const mediaData = await readMediaFile(projectId);
    const filesToDelete = [];
    const remainingFiles = [];

    // Separate files to delete from files to keep
    const filesInUse = [];
    mediaData.files.forEach((file) => {
      if (fileIds.includes(file.id)) {
        // Check if file is in use before adding to delete list
        if (file.usedIn && file.usedIn.length > 0) {
          filesInUse.push({
            id: file.id,
            filename: file.filename,
            usedIn: file.usedIn,
          });
        } else {
          filesToDelete.push(file);
        }
      } else {
        remainingFiles.push(file);
      }
    });

    // If any files are in use, return error
    if (filesInUse.length > 0) {
      return res.status(400).json({
        error: "Cannot delete files that are currently in use",
        filesInUse: filesInUse,
      });
    }

    if (filesToDelete.length === 0) {
      return res.status(404).json({ error: "No matching files found to delete" });
    }

    // Asynchronously delete all associated physical files
    const deletePromises = filesToDelete.map(async (file) => {
      // 1. Delete the original file
      let fileDir;
      const projectFolderName = await getProjectFolderName(projectId);
      if (file.type && file.type.startsWith("video/")) {
        fileDir = getProjectVideosDir(projectFolderName);
      } else if (file.type && file.type.startsWith("audio/")) {
        fileDir = getProjectAudiosDir(projectFolderName);
      } else {
        fileDir = getProjectImagesDir(projectFolderName);
      }

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
            const sizeFilePath = path.join(getProjectImagesDir(projectFolderName), sizeFilename);
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
    await writeMediaFile(projectId, mediaData);

    res.status(200).json({
      message: `${filesToDelete.length} files have been deleted.`,
    });
  } catch (error) {
    console.error("Error during bulk media deletion:", error);
    res.status(500).json({
      error: "Failed to delete files.",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
}

// Get usage information for a specific media file
export async function getMediaFileUsage(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { projectId, fileId } = req.params;
    const usage = await getMediaUsage(projectId, fileId);
    res.json(usage);
  } catch (error) {
    console.error("Error getting media usage:", error);
    if (error.message === "File not found") {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Failed to get media usage" });
    }
  }
}

// Refresh media usage tracking for all pages in a project
export async function refreshMediaUsage(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { projectId } = req.params;
    const result = await refreshAllMediaUsage(projectId);
    res.json(result);
  } catch (error) {
    console.error("Error refreshing media usage:", error);
    res.status(500).json({ error: "Failed to refresh media usage" });
  }
}
