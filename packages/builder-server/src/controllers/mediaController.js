import fs from "fs-extra";
import { createReadStream } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import { normalizeUploadName } from "../utils/uploadFileName.js";
import { getThemeJsonPath } from "../config.js";
import { ALLOWED_MIME_TYPES, ALLOWED_UPLOAD_EXTENSIONS, getContentType, getMediaCategory } from "../utils/mimeTypes.js";
import { getSetting } from "./appSettingsController.js";
import { parseMediaUpload } from "../middleware/parseMediaUpload.js";
import { getMaxUploadBytes, MAX_SVG_UPLOAD_BYTES } from "../utils/uploadLimits.js";
import { getMediaUsage, refreshAllMediaUsageFromDir, ensureUsageSourceFormat } from "../services/mediaUsageService.js";
import { withContentWriteLock, verifyFileUnused, recordDeletedMediaPaths } from "../services/contentCoordination.js";
import { getProjectFolderName, getProjectDetails } from "../utils/projectHelpers.js";
import { handleProjectResolutionError } from "../utils/projectErrors.js";
import { requestLanguage } from "../utils/contentLanguage.js";
import * as mediaRepo from "../db/repositories/mediaRepository.js";
import { getDb } from "../db/index.js";
import { createKeyedSerializer } from "../utils/serializeByKey.js";

import { stripHtmlToText, sanitizeSvg } from "../services/sanitizationService.js";
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
// Decode filenames supplied by upload clients without failing the whole request.
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
/** Every path this record can be referenced by: its own, plus each generated size. */
function referencePathsOf(file) {
  const paths = [file.path];
  for (const size of Object.values(file.sizes || {})) {
    if (size?.path) paths.push(size.path);
  }
  return paths.filter(Boolean);
}

function deleteMediaAssets(assetStorage, scope, file) {
  const subdir = getMediaCategory(file.type) === "file" ? "files" : "images";
  const keys = [`${subdir}/${file.filename}`];
  if (file.sizes) {
    for (const sizeName in file.sizes) {
      const size = file.sizes[sizeName];
      if (size && size.path) keys.push(`images/${path.basename(size.path)}`);
    }
  }
  // A save that was queued behind this delete must not be allowed to reference
  // what it just removed; only deletion knows which paths those are.
  recordDeletedMediaPaths(scope.projectId, referencePathsOf(file));
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
 * Reads media data, applies a transform function, and writes it back inside a
 * single immediate SQLite transaction, so the read-modify-write is atomic even
 * against a second connection sharing the DB file. transformFn must be
 * synchronous (mutate mediaData in place): the transaction cannot span an
 * await, so a transformFn returning a thenable is rejected rather than
 * silently committing pre-mutation state.
 * @param {string} projectId - The project UUID
 * @param {function(Object): void} transformFn - Synchronous function that receives mediaData and mutates it in place
 * @returns {Promise<Object>} The transformed media data
 */
export async function atomicUpdateMediaFile(projectId, transformFn) {
  await getProjectFolderName(projectId);
  const db = getDb();
  return db.transaction(() => {
    const mediaData = mediaRepo.getMediaFiles(projectId);
    const result = transformFn(mediaData);
    if (result && typeof result.then === "function") {
      throw new Error("atomicUpdateMediaFile requires a synchronous transformFn; async transforms cannot run inside the transaction");
    }
    mediaRepo.writeMediaData(projectId, mediaData);
    return mediaData;
  }).immediate();
}

// Configure the upload file filter. Both signals must pass and agree: the declared
// MIME is client-controlled, while the stored extension determines both the
// response Content-Type and which processing/sanitization path is required.
export const mediaUploadFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const extensionMime = getContentType(ext);
  const mimeMatchesExtension = file.mimetype === extensionMime
    || (ext === ".mp3" && file.mimetype === "audio/mp3");

  if (
    ALLOWED_MIME_TYPES.includes(file.mimetype)
    && ALLOWED_UPLOAD_EXTENSIONS.includes(ext)
    && mimeMatchesExtension
  ) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Supported types: images, audio (MP3), video (MP4), and PDF."), false);
  }
};

/**
 * Multipart parser for the media upload route: streams each file part to a temp
 * file and marks a part over the per-file limit (from the limits adapter) as
 * refused instead of failing the batch. See parseMediaUpload.
 */
export const uploadWithLimit = parseMediaUpload({ fileFilter: mediaUploadFileFilter });

// Files processed at once: each can hold a decoded image in sharp.
const UPLOAD_CONCURRENCY = 2;

function formatMB(bytes) {
  const mb = bytes / 1024 / 1024;
  return Number.isInteger(mb) ? `${mb}MB` : `${mb.toFixed(2)}MB`;
}

function refusal(originalName, code, limitBytes, sizeBytes, reason) {
  return { success: false, file: { originalName, code, limitBytes, sizeBytes, reason } };
}

/** Run `worker` over `items`, at most `limit` at a time; results keep item order. */
async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function lane() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
  return results;
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

    // Validate the project exists + is owned (throws -> mapped below). Media
    // metadata comes from the DB and is keyed by projectId.
    await getProjectFolderName(projectId);

    // Rows written by an older build are keyed by slug; rebuild them once per project,
    // reading content from the adapter's working dir (see refreshMediaUsage below).
    await ensureUsageSourceFormat({ projectId, projectDir: req.adapters.storage.getProjectBase(req.scope) });

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

// Upload names are handed out per project, one request at a time, and stay
// taken in memory until the request that holds them has stored or refused every
// file. A request's own listing of the folder can't see a file another request
// is still processing, so without this two overlapping uploads of `photo.jpg`
// are both given `photo.jpg`: the later write wins and two media records share
// one file. In-process only, like the keyed serializer itself.
const serializeUploadNames = createKeyedSerializer();
/** projectId -> lower-cased `<subdir>/<name>` of every asset an upload in flight will write. */
const uploadNamesInFlight = new Map();

/**
 * Give the names back once a request's files are stored or refused. Inside the
 * serialized section, so it can't land between another request's listing and
 * its choice of names: that request would no longer find the name here and
 * might not have it in its listing yet.
 */
function releaseUploadNames(projectId, names) {
  if (names.length === 0) return Promise.resolve();
  return serializeUploadNames(projectId, async () => {
    const inFlight = uploadNamesInFlight.get(projectId);
    if (!inFlight) return;
    for (const name of names) inFlight.delete(name);
    if (inFlight.size === 0) uploadNamesInFlight.delete(projectId);
  });
}

/**
 * Stores one uploaded file: checks its size, generates its resized copies (and
 * any re-encoded original) into `workDir`, reserves the total through the
 * limits adapter's optional `reserveStorage`, then moves everything into the
 * asset store, writes the media record and commits the bytes actually stored.
 * Nothing reaches the store before the reservation is granted; any failure after
 * it removes what was stored (and the record) and releases the reservation.
 */
async function storeUploadedFile({ file, subdir, filename, originalName }, ctx) {
  const { scope, assetStorage, limits, maxUploadBytes, imageSizes, workDir } = ctx;

  if (file.refused || file.size > maxUploadBytes) {
    return refusal(
      originalName,
      "FILE_TOO_LARGE",
      maxUploadBytes,
      file.size,
      `File size (${formatMB(file.size)}) exceeds limit of ${formatMB(maxUploadBytes)}.`,
    );
  }
  if (file.mimetype === "image/svg+xml" && file.size > MAX_SVG_UPLOAD_BYTES) {
    return refusal(
      originalName,
      "SVG_TOO_LARGE",
      MAX_SVG_UPLOAD_BYTES,
      file.size,
      `SVG files are limited to ${formatMB(MAX_SVG_UPLOAD_BYTES)}; this one is ${formatMB(file.size)}.`,
    );
  }
  if (!file.path) throw new Error("No file content received");

  const fileInfo = {
    id: uuidv4(),
    filename,
    originalName,
    type: file.mimetype,
    size: file.size,
    uploaded: new Date().toISOString(),
    path: `/uploads/${subdir}/${filename}`,
    metadata: { alt: "", title: "", caption: "" },
    sizes: {},
  };

  // Where the stored original's bytes come from: the upload itself, or a
  // re-encoded / sanitized copy of it in workDir.
  let originalSource = file.path;
  const copies = [];

  if (file.mimetype.startsWith("image/") && file.mimetype !== "image/svg+xml") {
    const image = sharp(file.path, { limitInputPixels: 100_000_000 });
    const metadata = await image.metadata();

    // Safety: reject images with extreme dimensions (always enforced)
    if (metadata.width > 10_000 || metadata.height > 10_000) {
      return {
        success: false,
        file: {
          originalName,
          reason: `Image dimensions (${metadata.width}x${metadata.height}) exceed maximum of ${10_000}px.`,
          sizeBytes: file.size,
        },
      };
    }

    fileInfo.width = metadata.width;
    fileInfo.height = metadata.height;

    const ext = path.extname(filename);
    const encode = (op, quality) => {
      if (file.mimetype === "image/jpeg") op.jpeg({ quality });
      else if (file.mimetype === "image/png") op.png({ quality });
      else if (file.mimetype === "image/webp") op.webp({ quality });
      return op;
    };

    // Generate the sizes in parallel; a size that fails to generate is left out.
    const sizeResults = await Promise.allSettled(
      Object.entries(imageSizes).map(async ([sizeName, sizeConfig]) => {
        if (sizeConfig.width >= metadata.width) return null;
        const resizedFilename = `${path.basename(filename, ext)}-${sizeName}${ext}`;
        const tempPath = path.join(workDir, `size-${sizeName}${ext}`);
        const info = await encode(image.clone().resize({ width: sizeConfig.width }), sizeConfig.quality).toFile(tempPath);
        return {
          sizeName,
          key: `images/${resizedFilename}`,
          tempPath,
          size: info.size,
          data: { path: `/uploads/images/${resizedFilename}`, width: info.width, height: info.height },
        };
      }),
    );
    for (const result of sizeResults) {
      if (result.status === "fulfilled" && result.value) copies.push(result.value);
    }

    // Recompress the original when it's no larger than the largest enabled
    // size (it gets served via the imageTag fallback), reducing file size
    // without changing dimensions. GIFs are excluded (animation frames).
    if (file.mimetype !== "image/gif") {
      const largestEnabledWidth = Math.max(...Object.values(imageSizes).map((s) => s.width));
      if (metadata.width <= largestEnabledWidth) {
        const quality = Math.max(...Object.values(imageSizes).map((s) => s.quality));
        originalSource = path.join(workDir, `original${ext}`);
        await encode(sharp(file.path), quality).toFile(originalSource);
      }
    }
  } else if (file.mimetype === "image/svg+xml") {
    // Bounded by MAX_SVG_UPLOAD_BYTES above.
    const sanitizedSvg = sanitizeSvg(await fs.readFile(file.path, "utf-8"));
    originalSource = path.join(workDir, "original.svg");
    await fs.writeFile(originalSource, sanitizedSvg, "utf-8");
  }

  const originalBytes = (await fs.stat(originalSource)).size;
  fileInfo.size = originalBytes;
  const outputs = [{ key: `${subdir}/${filename}`, tempPath: originalSource, size: originalBytes }, ...copies];
  const totalBytes = outputs.reduce((sum, output) => sum + output.size, 0);

  let reservation = null;
  if (typeof limits?.reserveStorage === "function") {
    const answer = await limits.reserveStorage(scope, totalBytes);
    if (!answer?.ok) {
      const availableBytes = Number.isFinite(answer?.availableBytes) ? answer.availableBytes : 0;
      return refusal(
        originalName,
        "STORAGE_FULL",
        availableBytes,
        totalBytes,
        `Not enough storage left: this file needs ${formatMB(totalBytes)}, ${formatMB(availableBytes)} is available.`,
      );
    }
    reservation = answer;
  }

  // A key is listed before its upload starts: an upload that fails partway can
  // still leave bytes at the key (deleting a missing key is a no-op).
  const storedKeys = [];
  let recorded = false;
  let committed = false;
  try {
    let storedBytes = 0;
    for (const output of outputs) {
      storedKeys.push(output.key);
      const result = await assetStorage.upload(scope, output.key, createReadStream(output.tempPath));
      storedBytes += Number.isFinite(result?.sizeBytes) ? result.sizeBytes : output.size;
    }
    for (const copy of copies) fileInfo.sizes[copy.sizeName] = copy.data;
    // The record is written before the bytes are committed, so a record that
    // can't be written leaves nothing stored or counted.
    mediaRepo.addMediaFile(scope.projectId, fileInfo);
    recorded = true;
    if (reservation) {
      committed = true; // a failing commit has settled the reservation too: never release after it
      await reservation.commit(storedBytes);
    }
  } catch (error) {
    if (recorded) {
      try {
        mediaRepo.deleteMediaFile(scope.projectId, fileInfo.id);
      } catch (err) {
        console.warn(`Could not remove the media record ${fileInfo.id} after a failed upload: ${err.message}`);
      }
    }
    await Promise.all(
      storedKeys.map((key) =>
        Promise.resolve(assetStorage.delete(scope, key)).catch((err) =>
          console.warn(`Could not remove media asset ${key} after a failed upload: ${err.message}`),
        ),
      ),
    );
    if (reservation && !committed) {
      await reservation.release().catch((err) => console.warn(`Could not release a storage reservation: ${err.message}`));
    }
    throw error;
  }

  return { success: true, file: fileInfo };
}

/**
 * Uploads media files to a project. `req.files` comes from uploadWithLimit:
 * each entry's bytes are in a temp file at `path` (a part over the per-file
 * limit arrives `refused`). Each file is refused or stored on its own, so one
 * oversized file or one that doesn't fit the remaining storage doesn't fail the
 * rest of the batch. Images get their resized copies, SVGs are sanitized.
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

    const maxUploadBytes = await getMaxUploadBytes(req.adapters, scope);
    // Pass projectId to allow theme overrides
    const imageSizes = await getImageProcessingSettings(projectId);

    // Validate project ownership
    await getProjectFolderName(projectId);

    // Sequential pre-pass: assign a collision-free filename to each file,
    // deduped against the adapter's existing keys and the names uploads in
    // flight hold (this request's included). A raster image also writes
    // `<name>-<size><ext>` copies, so a name is free only when every one of
    // those is free too: a copy written over an existing asset would overwrite
    // it, and a failed upload's cleanup would then delete it while its media
    // record and page references remain.
    // Tests pass file.filename directly, bypassing this.
    const sizeNames = Object.keys(imageSizes);
    const heldNames = [];
    const prepared = [];
    try {
      await serializeUploadNames(projectId, async () => {
        const listedNames = {};
        async function uniqueName(subdir, originalName, variantSizes) {
          if (!listedNames[subdir]) {
            // A listing that fails is not an empty folder: every name would look
            // free, and the upload would overwrite the file that has it.
            const keys = await assetStorage.list(scope, `${subdir}/`);
            listedNames[subdir] = new Set(keys.map((k) => path.basename(k).toLowerCase()));
          }
          const listed = listedNames[subdir];
          if (!uploadNamesInFlight.has(projectId)) uploadNamesInFlight.set(projectId, new Set());
          const inFlight = uploadNamesInFlight.get(projectId);
          const normalized = normalizeUploadName(originalName, { fallback: subdir === "files" ? "file" : "image" });
          const ext = path.extname(normalized);
          const base = path.basename(normalized, ext);
          // Case-insensitively: on Windows/macOS a legacy `photo.JPG` IS `photo.jpg`, so a
          // case-sensitive check would hand out a name that overwrites the existing file.
          const namesFor = (stem) =>
            [`${stem}${ext}`, ...variantSizes.map((size) => `${stem}-${size}${ext}`)].map((name) => name.toLowerCase());
          const isTaken = (name) => listed.has(name) || inFlight.has(`${subdir}/${name}`);
          let stem = base;
          let counter = 1;
          while (namesFor(stem).some(isTaken)) stem = `${base}-${counter++}`;
          for (const name of namesFor(stem)) {
            inFlight.add(`${subdir}/${name}`);
            heldNames.push(`${subdir}/${name}`);
          }
          return `${stem}${ext}`;
        }

        for (const file of files) {
          const subdir = getMediaCategory(file.mimetype) === "file" ? "files" : "images";
          const isRaster = Boolean(file.mimetype?.startsWith("image/")) && file.mimetype !== "image/svg+xml";
          // The multipart name arrives as latin1 bytes; decode once so the stored
          // "original name" is the real one, not mojibake.
          const originalName = decodeFileName(file.originalname);
          const filename = file.refused
            ? null
            : file.filename || (await uniqueName(subdir, originalName, isRaster ? sizeNames : []));
          prepared.push({ file, subdir, filename, originalName });
        }
      });
    } catch (error) {
      await releaseUploadNames(projectId, heldNames);
      throw error;
    }

    const ctx = { scope, assetStorage, limits: req.adapters.limits, maxUploadBytes, imageSizes };
    let results;
    try {
      results = await mapWithConcurrency(prepared, UPLOAD_CONCURRENCY, async (item) => {
        let workDir = null;
        try {
          workDir = await fs.mkdtemp(path.join(os.tmpdir(), "widgetizer-media-"));
          return await storeUploadedFile(item, { ...ctx, workDir });
        } catch (error) {
          console.error(`Failed to process file ${item.originalName}:`, error);
          return {
            success: false,
            file: {
              originalName: item.originalName,
              reason: `Processing failed: ${error.message}`,
            },
          };
        } finally {
          if (workDir) await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
        }
      });
    } finally {
      await releaseUploadNames(projectId, heldNames);
    }

    const processedFiles = [];
    const rejectedFiles = [];
    for (const result of results) {
      if (result.success) processedFiles.push(result.file);
      else rejectedFiles.push(result.file);
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
 * Updates metadata (alt text, title, caption) for a media file of the request's
 * project (`req.scope`), for the default language or `?language=`.
 * @param {import('express').Request} req - Express request object with fileId in params, metadata in body
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function updateMediaMetadata(req, res) {
  try {
    const lang = requestLanguage(req, res);
    if (!lang) return;

    // The project is the one resolveActiveProject resolved (and, in a
    // multi-tenant host, authorized) for this request; the file is looked up
    // within it, so another project's file id is simply not found.
    const { projectId } = req.scope;
    const { fileId } = req.params;
    const alt = stripHtmlToText(req.body.alt);
    const title = stripHtmlToText(req.body.title);
    const caption = stripHtmlToText(req.body.caption);
    // Validate project ownership
    await getProjectFolderName(projectId);

    // Get the specific file (scoped to project)
    const file = mediaRepo.getMediaFileById(projectId, fileId);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    const isImage = file.type?.startsWith("image/");
    // A translated language is edited against the default, so a field left out
    // means "inherit" and is stored as NULL — only "" is a deliberate blank.
    // The default language keeps its own rule: alt is required, and absent is
    // not a thing it can express.
    if (lang.language !== lang.defaultLanguage) {
      const inheritable = (value) => (typeof value === "undefined" || value === null ? null : value);
      mediaRepo.updateFileTranslation(projectId, fileId, lang.language, {
        alt: inheritable(alt),
        title: inheritable(title),
        caption: isImage ? inheritable(caption) : null,
      });
      return res.json({
        message: "Metadata updated successfully",
        file: mediaRepo.getMediaFileById(projectId, fileId),
      });
    }

    // Validate input
    if (typeof alt === "undefined") {
      return res.status(400).json({ error: "Alt text is required for images" });
    }

    // Captions are an image-only concept; a caption sent for a non-image (e.g. a
    // PDF, via direct API) is stored as "" rather than text.
    const captionForType = isImage ? caption || "" : "";

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
    const projectDir = req.adapters.storage.getProjectBase(scope);

    // Validate project ownership
    await getProjectFolderName(projectId);

    // Verify and delete in one section no content write can interleave with: the
    // stored usage rows are best-effort, so they are re-derived here rather than
    // trusted, and a save must not slip a new reference in between the two steps.
    const outcome = await withContentWriteLock(projectId, async () => {
      const fileToDelete = mediaRepo.getMediaFileById(projectId, fileId);
      if (!fileToDelete) return { notFound: true };

      const check = await verifyFileUnused({ projectId, projectDir, fileIds: [fileId] });
      if (!check.verified) return { unverified: check };

      const usedIn = check.usedInByFileId.get(fileId) || [];
      if (usedIn.length > 0) return { inUse: { usedIn, filename: fileToDelete.filename } };

      // Remove the original + every generated size through the storage adapter.
      await deleteMediaAssets(assetStorage, scope, fileToDelete);

      // Remove metadata from DB (cascade deletes sizes + usage, scoped to project)
      mediaRepo.deleteMediaFile(projectId, fileId);
      return { deleted: true };
    });

    if (outcome.notFound) {
      return res.status(404).json({ error: "File not found" });
    }
    if (outcome.unverified) {
      // Not "in use" and not "unused" — we could not tell. Deleting on an
      // unreadable scan is exactly how an image in use gets lost.
      return res.status(409).json({
        error: "Cannot verify whether this file is still in use",
        message: `The file was not deleted because ${outcome.unverified.reason}. Try again once the project content can be read.`,
        code: "MEDIA_USAGE_UNVERIFIED",
        skipped: outcome.unverified.skipped,
      });
    }
    if (outcome.inUse) {
      return res.status(400).json({
        error: "Cannot delete file that is currently in use",
        usedIn: outcome.inUse.usedIn,
        filename: outcome.inUse.filename,
      });
    }

    res.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Error deleting project media:", error);
    if (handleProjectResolutionError(res, error)) return;
    res.status(500).json({ error: "Failed to delete project media" });
  }
}

/**
 * Send a media file stream as the response body.
 *
 * `pipeline`, not `pipe`: when the client goes away (a video player drops its
 * request on every seek) it destroys the file stream, which `pipe` leaves open
 * with its descriptor held until the process runs out of them. When the file
 * fails partway, it destroys the response, so the client sees the transfer cut
 * off instead of waiting on it; the headers are already sent by then, so no
 * error status is possible. Only a failure of the file itself is logged — a
 * client that leaves is routine.
 *
 * Nothing is sent until the file has produced its first bytes (or ended), so a
 * file that can't be read at all — removed or made unreadable after `stat` —
 * still gets a 500 rather than a dropped connection.
 */
function streamToResponse(stream, res) {
  return new Promise((resolve) => {
    // The client left while the file was being opened: nothing to send it.
    if (res.destroyed) {
      stream.destroy();
      resolve();
      return;
    }
    const stopWaiting = () => {
      stream.off("readable", onReadable);
      stream.off("error", onEarlyError);
      res.off("close", onEarlyClose);
    };
    // The pipeline starts inside this callback, so there is no moment between
    // "readable" and the pipeline when an error or a closed response has no
    // listener.
    const onReadable = () => {
      stopWaiting();
      if (res.destroyed) {
        stream.destroy();
        resolve();
        return;
      }
      let sourceFailed = false;
      stream.once("error", () => {
        sourceFailed = true;
      });
      pipeline(stream, res, (err) => {
        if (err && sourceFailed) console.error("Error streaming project media:", err);
      });
      resolve();
    };
    const onEarlyError = (err) => {
      stopWaiting();
      stream.destroy();
      console.error("Error streaming project media:", err);
      if (!res.headersSent && !res.destroyed) {
        // The file's length and range were set for the body that never came.
        res.removeHeader("Content-Length");
        res.removeHeader("Content-Range");
        res.status(500).json({ error: "Failed to serve project media" });
      }
      resolve();
    };
    const onEarlyClose = () => {
      stopWaiting();
      stream.destroy();
      resolve();
    };
    stream.once("readable", onReadable);
    stream.once("error", onEarlyError);
    res.once("close", onEarlyClose);
  });
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
    // X-Project-Id header), so the file's project comes from the path, not from
    // the active project resolveActiveProject found; keep its actor, if any.
    const folderName = await getProjectFolderName(projectId);
    const scope = { ...(req.scope || {}), projectId, folderName };

    const stat = await req.adapters.assetStorage.stat(scope, key);
    if (!stat) {
      return res.status(404).json({ error: "File not found" });
    }
    const fileSize = stat.size;

    res.setHeader("Content-Type", getContentType(path.extname(key).toLowerCase()));
    res.setHeader("Accept-Ranges", "bytes");

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

      // Express runs this GET handler for HEAD as well: answer with the headers
      // alone rather than open (and read through) the file. So a HEAD doesn't
      // notice a file that fails to open after the stat above; a GET would.
      if (req.method === "HEAD") {
        res.status(206);
        res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
        res.setHeader("Content-Length", end - start + 1);
        return res.end();
      }

      const rangeStream = await req.adapters.assetStorage.download(scope, key, { start, end });
      if (!rangeStream) {
        return res.status(404).json({ error: "File not found" });
      }
      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
      res.setHeader("Content-Length", end - start + 1);
      await streamToResponse(rangeStream, res);
      return;
    }

    // No (or malformed) range — stream the full file (HEAD: its headers only).
    if (req.method === "HEAD") {
      res.setHeader("Content-Length", fileSize);
      return res.end();
    }
    const stream = await req.adapters.assetStorage.download(scope, key);
    if (!stream) {
      return res.status(404).json({ error: "File not found" });
    }
    res.setHeader("Content-Length", fileSize);
    await streamToResponse(stream, res);
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

    const projectDir = req.adapters.storage.getProjectBase(scope);

    // One verification scan for the whole batch, then delete — all inside the media
    // section, so no save can introduce a reference to any of these between the
    // scan and the deletes it authorises.
    const outcome = await withContentWriteLock(projectId, async () => {
      const mediaData = mediaRepo.getMediaFiles(projectId);
      const requested = mediaData.files.filter((file) => fileIds.includes(file.id));
      if (requested.length === 0) return { noneFound: true };

      const check = await verifyFileUnused({
        projectId,
        projectDir,
        fileIds: requested.map((file) => file.id),
      });
      if (!check.verified) return { unverified: check };

      const filesToDelete = [];
      const filesInUse = [];
      for (const file of requested) {
        const usedIn = check.usedInByFileId.get(file.id) || [];
        if (usedIn.length > 0) {
          filesInUse.push({ id: file.id, filename: file.filename, usedIn });
        } else {
          filesToDelete.push(file);
        }
      }

      if (filesToDelete.length > 0) {
        // Remove every original + size through the storage adapter.
        await Promise.all(filesToDelete.map((file) => deleteMediaAssets(assetStorage, scope, file)));

        // Batch delete from DB (cascade handles sizes + usage, scoped to project)
        mediaRepo.deleteMediaFiles(projectId, filesToDelete.map((f) => f.id));
      }

      return { deleted: filesToDelete.length, filesInUse };
    });

    // If no files found at all
    if (outcome.noneFound) {
      return res.status(404).json({ error: "No matching files found to delete" });
    }

    if (outcome.unverified) {
      return res.status(409).json({
        error: "Cannot verify whether these files are still in use",
        message: `Nothing was deleted because ${outcome.unverified.reason}. Try again once the project content can be read.`,
        code: "MEDIA_USAGE_UNVERIFIED",
        skipped: outcome.unverified.skipped,
      });
    }

    const { deleted, filesInUse } = outcome;

    // If all files are in use, return success with info (not an error - the request was valid)
    if (deleted === 0 && filesInUse.length > 0) {
      return res.status(200).json({
        message: "No files were deleted because they are all currently in use.",
        deletedCount: 0,
        filesInUse,
      });
    }

    // Build response message
    const response = {
      message: `${deleted} file${deleted !== 1 ? "s" : ""} deleted successfully.`,
      deletedCount: deleted,
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
    // Read content from the per-tenant working dir via the adapter (getProjectBase),
    // not the OSS-global folderName path: under hosted the folderName path is the wrong
    // (empty) dir, so a rescan there would wipe all usage instead of rebuilding it.
    const projectDir = req.adapters.storage.getProjectBase(req.scope);
    const result = await refreshAllMediaUsageFromDir({ projectId, projectDir });
    res.json(result);
  } catch (error) {
    console.error("Error refreshing media usage:", error);
    if (handleProjectResolutionError(res, error)) return;
    res.status(500).json({ error: "Failed to refresh media usage" });
  }
}
