import { getDb } from "../index.js";

/**
 * Get all media files for a project in the shape controllers expect.
 * Assembles the nested sizes/usedIn from normalized tables.
 * @param {string} projectId - Project UUID
 * @returns {{files: Array<object>}} Media data object
 */
export function getMediaFiles(projectId) {
  const db = getDb();

  const files = db.prepare("SELECT * FROM media_files WHERE project_id = ? ORDER BY uploaded DESC").all(projectId);

  if (files.length === 0) return { files: [] };

  // Batch-load sizes and usage for all files in this project
  const fileIds = files.map((f) => f.id);
  const placeholders = fileIds.map(() => "?").join(",");

  const allSizes = db.prepare(`SELECT * FROM media_sizes WHERE media_file_id IN (${placeholders})`).all(...fileIds);
  const allUsage = db.prepare(`SELECT * FROM media_usage WHERE media_file_id IN (${placeholders})`).all(...fileIds);

  // Group by file ID
  const sizesByFile = new Map();
  for (const size of allSizes) {
    if (!sizesByFile.has(size.media_file_id)) sizesByFile.set(size.media_file_id, []);
    sizesByFile.get(size.media_file_id).push(size);
  }

  const usageByFile = new Map();
  for (const usage of allUsage) {
    if (!usageByFile.has(usage.media_file_id)) usageByFile.set(usage.media_file_id, []);
    usageByFile.get(usage.media_file_id).push(usage.used_in);
  }

  return {
    files: files.map((row) => rowToMediaFile(row, sizesByFile.get(row.id) || [], usageByFile.get(row.id) || [])),
  };
}

/**
 * Write the full media data from the legacy shape (for backward compatibility).
 * Replaces all media files for a project.
 * @param {string} projectId
 * @param {{files: Array<object>}} mediaData
 */
export function writeMediaData(projectId, mediaData) {
  const db = getDb();
  const txn = db.transaction(() => {
    // Delete all existing media for this project (cascades to sizes + usage)
    db.prepare("DELETE FROM media_files WHERE project_id = ?").run(projectId);

    // Re-insert all files
    for (const file of mediaData.files || []) {
      addMediaFile(projectId, file);

      // Re-insert usage
      if (file.usedIn) {
        const insertUsage = db.prepare("INSERT OR IGNORE INTO media_usage (media_file_id, used_in) VALUES (?, ?)");
        for (const usedIn of file.usedIn) {
          insertUsage.run(file.id, usedIn);
        }
      }
    }
  });
  txn();
}

// ==========================================
// Internal helpers
// ==========================================

/**
 * Add a new media file with its sizes.
 * @param {string} projectId
 * @param {object} fileData - File info from controller (same shape as the old JSON entry)
 */
function addMediaFile(projectId, fileData) {
  const db = getDb();
  const txn = db.transaction(() => {
    db.prepare(`
      INSERT INTO media_files (id, project_id, filename, original_name, type, size, uploaded, path, alt, title, width, height)
      VALUES (@id, @projectId, @filename, @originalName, @type, @size, @uploaded, @path, @alt, @title, @width, @height)
    `).run({
      id: fileData.id,
      projectId,
      filename: fileData.filename || "",
      originalName: fileData.originalName || fileData.filename || "",
      type: fileData.type || "",
      size: fileData.size || 0,
      uploaded: fileData.uploaded || new Date().toISOString(),
      path: fileData.path || "",
      alt: fileData.metadata?.alt || "",
      title: fileData.metadata?.title || "",
      width: fileData.width || null,
      height: fileData.height || null,
    });

    // Insert sizes
    if (fileData.sizes) {
      const insertSize = db.prepare(`
        INSERT INTO media_sizes (media_file_id, size_name, path, width, height)
        VALUES (@mediaFileId, @sizeName, @path, @width, @height)
      `);
      for (const [sizeName, sizeData] of Object.entries(fileData.sizes)) {
        if (sizeData && sizeData.path) {
          insertSize.run({
            mediaFileId: fileData.id,
            sizeName,
            path: sizeData.path,
            width: sizeData.width,
            height: sizeData.height,
          });
        }
      }
    }
  });

  txn();
}

/**
 * Convert a database row + related data to the media file shape controllers expect.
 */
function rowToMediaFile(row, sizeRows, usageList) {
  const isImage = row.type && row.type.startsWith("image/");
  const isVideoOrAudio = row.type && (row.type.startsWith("video/") || row.type.startsWith("audio/"));

  // Build sizes object
  const sizes = {};
  for (const size of sizeRows) {
    sizes[size.size_name] = {
      path: size.path,
      width: size.width,
      height: size.height,
    };
  }

  // Build metadata object matching the controller's expected shape
  let metadata;
  if (isVideoOrAudio) {
    metadata = { title: row.title || "", description: "" };
  } else {
    metadata = { alt: row.alt || "", title: row.title || "" };
  }

  const file = {
    id: row.id,
    filename: row.filename,
    originalName: row.original_name,
    type: row.type,
    size: row.size,
    uploaded: row.uploaded,
    path: row.path,
    metadata,
    sizes,
    usedIn: usageList,
  };

  if (isImage) {
    file.width = row.width;
    file.height = row.height;
  }

  if (row.type && row.type.startsWith("video/")) {
    file.thumbnail = null;
  }

  return file;
}
