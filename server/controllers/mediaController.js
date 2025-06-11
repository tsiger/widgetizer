import fs from "fs-extra";
import { createReadStream } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import sharp from "sharp";
import slugify from "slugify";
import { getProjectDir, getProjectImagesDir, getProjectMediaJsonPath, getImagePath } from "../config.js";
import { getSetting } from "./appSettingsController.js";

const IMAGE_SIZES = {
  thumb: { width: 150, quality: 90 },
  small: { width: 480, quality: 85 },
  medium: { width: 1024, quality: 85 },
  large: { width: 1920, quality: 85 },
};

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];

// Decode the filename TODO: Where should things like this live?
function decodeFileName(filename) {
  try {
    return decodeURIComponent(escape(filename));
  } catch (e) {
    return filename;
  }
}

// Read media.json metadata file
export async function readMediaFile(projectId) {
  const mediaFilePath = getProjectMediaJsonPath(projectId);

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
  const mediaFilePath = getProjectMediaJsonPath(projectId);
  await fs.outputFile(mediaFilePath, JSON.stringify(data, null, 2));
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    try {
      const { projectId } = req.params;
      const imagesDir = getProjectImagesDir(projectId);
      await fs.ensureDir(imagesDir);
      cb(null, imagesDir);
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
      const imagesDir = getProjectImagesDir(projectId);
      let finalName = `${cleanName}${extension}`;
      let counter = 1;
      while (await fs.pathExists(path.join(imagesDir, finalName))) {
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
    cb(new Error("Invalid file type. Only images are allowed."), false);
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
  try {
    const { projectId } = req.params;

    // Ensure project exists
    const projectDir = getProjectDir(projectId);
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
  try {
    const { projectId } = req.params;
    const files = req.files;

    if (!Array.isArray(files) || files.length === 0) {
      // This might happen if fileFilter rejected all files
      return res.status(400).json({ error: "No valid files uploaded or received." });
    }

    // Get the dynamic file size limit *now*
    const maxFileSizeMB = await getSetting("media.maxFileSizeMB");
    const maxSizeBytes = (maxFileSizeMB || 1) * 1024 * 1024; // Default 1MB

    const mediaData = await readMediaFile(projectId);
    const processedFiles = [];
    const rejectedFiles = [];

    // Process each uploaded file
    for (const file of files) {
      // Check file size against the dynamic limit
      if (file.size > maxSizeBytes) {
        // File exceeds limit, reject it and delete temp file
        rejectedFiles.push({
          originalName: file.originalname,
          reason: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds limit of ${maxFileSizeMB}MB.`,
          sizeBytes: file.size,
        });
        // Attempt to delete the oversized file multer saved
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.warn(`Could not delete oversized temp file ${file.path}: ${unlinkError.message}`);
        }
        continue; // Skip processing this file further
      }

      // --- File is within size limit, proceed with processing ---
      const fileId = uuidv4();
      const fileInfo = {
        id: fileId,
        filename: file.filename,
        originalName: file.originalname,
        type: file.mimetype,
        size: file.size,
        uploaded: new Date().toISOString(),
        path: `/uploads/images/${file.filename}`,
        metadata: { alt: "", title: "" },
        sizes: {}, // Initialize sizes object
        // usedIn: [] // If using the previous usedIn tracking
      };

      // Process image files (thumbnails, dimensions etc.)
      if (file.mimetype !== "image/svg+xml") {
        try {
          const image = sharp(file.path);
          const imgMetadata = await image.metadata();
          fileInfo.width = imgMetadata.width;
          fileInfo.height = imgMetadata.height;

          // Generate different sizes
          for (const [name, config] of Object.entries(IMAGE_SIZES)) {
            const sizeFilename = `${name}_${file.filename}`;
            const sizeFilePath = path.join(path.dirname(file.path), sizeFilename);
            const resized = await image
              .clone() // Clone from the original sharp instance
              .resize(config.width, null, { fit: "inside", withoutEnlargement: true })
              .jpeg({ quality: config.quality })
              .toFile(sizeFilePath);

            fileInfo.sizes[name] = {
              path: `/uploads/images/${sizeFilename}`,
              width: resized.width,
              height: resized.height,
            };
          }

          // For consistency, alias the 'thumb' size to the top-level 'thumbnail' property
          if (fileInfo.sizes.thumb) {
            fileInfo.thumbnail = fileInfo.sizes.thumb.path;
          }
        } catch (err) {
          console.error(`Error processing image ${file.filename}:`, err);
          fileInfo.processingError = err.message;
          // Consider if processing error should reject the file
        }
      }

      mediaData.files.push(fileInfo);
      processedFiles.push(fileInfo);
    } // End loop through files

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
  try {
    const { projectId, fileId } = req.params;
    const { alt, title } = req.body;

    // Validate input
    if (typeof alt === "undefined" || typeof title === "undefined") {
      return res.status(400).json({ error: "Missing alt or title in request body" });
    }

    // Read media metadata
    const mediaData = await readMediaFile(projectId);

    // Find the file to update
    const fileIndex = mediaData.files.findIndex((file) => file.id === fileId);
    if (fileIndex === -1) {
      return res.status(404).json({ error: "File not found" });
    }

    // Update metadata - ensure metadata object exists
    mediaData.files[fileIndex].metadata = {
      ...mediaData.files[fileIndex].metadata,
      alt: alt || "",
      title: title || "",
    };

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

    // Remove the physical files from storage
    const imagesDir = getProjectImagesDir(projectId);

    // 1. Delete the original file
    const originalFilePath = path.join(imagesDir, fileToDelete.filename);
    try {
      if (await fs.pathExists(originalFilePath)) {
        await fs.unlink(originalFilePath);
      }
    } catch (err) {
      console.warn(`Could not delete original file ${originalFilePath}: ${err.message}`);
    }

    // 2. Delete all generated sizes
    if (fileToDelete.sizes) {
      for (const sizeName in fileToDelete.sizes) {
        const size = fileToDelete.sizes[sizeName];
        if (size && size.path) {
          const sizeFilename = path.basename(size.path);
          const sizeFilePath = path.join(imagesDir, sizeFilename);
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
  try {
    const { projectId, fileId, filename } = req.params;

    let filePath;

    // If we have a filename directly, use it
    if (filename) {
      filePath = getImagePath(projectId, filename);
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

      filePath = path.join(getProjectDir(projectId), fileInfo.path);
    }

    if (!filePath) {
      return res.status(400).json({ error: "Invalid request" });
    }

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
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
  try {
    const { projectId } = req.params;
    const { fileIds } = req.body; // Expect an array of file IDs

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ error: "fileIds must be a non-empty array" });
    }

    const mediaData = await readMediaFile(projectId);
    const imagesDir = getProjectImagesDir(projectId);
    const filesToDelete = [];
    const remainingFiles = [];

    // Separate files to delete from files to keep
    mediaData.files.forEach((file) => {
      if (fileIds.includes(file.id)) {
        filesToDelete.push(file);
      } else {
        remainingFiles.push(file);
      }
    });

    if (filesToDelete.length === 0) {
      return res.status(404).json({ error: "No matching files found to delete" });
    }

    // Asynchronously delete all associated physical files
    const deletePromises = filesToDelete.map(async (file) => {
      // 1. Delete the original file
      const originalFilePath = path.join(imagesDir, file.filename);
      try {
        if (await fs.pathExists(originalFilePath)) await fs.unlink(originalFilePath);
      } catch (err) {
        console.warn(`Could not delete original file ${originalFilePath}: ${err.message}`);
      }
      // 2. Delete all generated sizes
      if (file.sizes) {
        for (const sizeName in file.sizes) {
          const size = file.sizes[sizeName];
          if (size && size.path) {
            const sizeFilename = path.basename(size.path);
            const sizeFilePath = path.join(imagesDir, sizeFilename);
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
