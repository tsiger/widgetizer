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
 * Get a single media file by ID.
 * @param {string} fileId
 * @returns {object|null} Media file object or null
 */
export function getMediaFileById(fileId) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM media_files WHERE id = ?").get(fileId);
  if (!row) return null;

  const sizeRows = db.prepare("SELECT * FROM media_sizes WHERE media_file_id = ?").all(fileId);
  const usageRows = db.prepare("SELECT used_in FROM media_usage WHERE media_file_id = ?").all(fileId);

  return rowToMediaFile(row, sizeRows, usageRows.map((r) => r.used_in));
}

/**
 * Write the full media data for a project (replaces all existing media files).
 * Used for project import and duplication where a full replacement is appropriate.
 * @param {string} projectId
 * @param {{files: Array<object>}} mediaData
 * @param {string} userId
 */
export function writeMediaData(projectId, mediaData, userId = "local") {
  const db = getDb();
  const txn = db.transaction(() => {
    // Delete all existing media for this project (cascades to sizes + usage)
    db.prepare("DELETE FROM media_files WHERE project_id = ?").run(projectId);

    // Re-insert all files
    for (const file of mediaData.files || []) {
      insertMediaFile(db, projectId, file, userId);

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
// Granular operations
// ==========================================

/**
 * Add a single media file with its sizes to a project.
 * @param {string} projectId
 * @param {object} fileData - File info from controller
 * @param {string} userId
 */
export function addMediaFile(projectId, fileData, userId = "local") {
  const db = getDb();
  insertMediaFile(db, projectId, fileData, userId);
}

/**
 * Delete a single media file by ID. Cascade handles sizes + usage.
 * @param {string} fileId
 * @returns {boolean} True if a row was deleted
 */
export function deleteMediaFile(fileId) {
  const db = getDb();
  const result = db.prepare("DELETE FROM media_files WHERE id = ?").run(fileId);
  return result.changes > 0;
}

/**
 * Delete multiple media files by IDs in a single statement.
 * @param {string[]} fileIds
 * @returns {number} Number of rows deleted
 */
export function deleteMediaFiles(fileIds) {
  if (fileIds.length === 0) return 0;
  const db = getDb();
  const placeholders = fileIds.map(() => "?").join(",");
  const result = db.prepare(`DELETE FROM media_files WHERE id IN (${placeholders})`).run(...fileIds);
  return result.changes;
}

/**
 * Update metadata (alt, title) for a single media file.
 * @param {string} fileId
 * @param {{ alt?: string, title?: string, description?: string }} metadata
 * @returns {boolean} True if a row was updated
 */
export function updateFileMetadata(fileId, metadata) {
  const db = getDb();
  const result = db.prepare(
    "UPDATE media_files SET alt = @alt, title = @title WHERE id = @id"
  ).run({
    id: fileId,
    alt: metadata.alt ?? "",
    title: metadata.title ?? "",
  });
  return result.changes > 0;
}

/**
 * Replace all media_usage entries for a project in one transaction.
 * Only touches the media_usage table — does NOT delete/reinsert media_files or media_sizes.
 * Used by refreshAllMediaUsage which rebuilds all usage from scratch.
 * @param {string} projectId
 * @param {Map<string, string[]>} usageMap - Map of fileId → array of usedIn strings
 */
export function replaceMediaUsage(projectId, usageMap) {
  const db = getDb();
  const txn = db.transaction(() => {
    // Get all file IDs for this project
    const fileIds = db.prepare("SELECT id FROM media_files WHERE project_id = ?").all(projectId).map((r) => r.id);
    if (fileIds.length === 0) return;

    // Delete all usage for this project's files
    const placeholders = fileIds.map(() => "?").join(",");
    db.prepare(`DELETE FROM media_usage WHERE media_file_id IN (${placeholders})`).run(...fileIds);

    // Re-insert from the usage map
    const insertUsage = db.prepare("INSERT OR IGNORE INTO media_usage (media_file_id, used_in) VALUES (?, ?)");
    for (const [fileId, usedInList] of usageMap) {
      for (const usedIn of usedInList) {
        insertUsage.run(fileId, usedIn);
      }
    }
  });
  txn();
}

/**
 * Update media_usage for a single source (page, global widget, theme settings) in one transaction.
 * Removes all usage rows with this sourceId for the project's files, then re-inserts for the given fileIds.
 * Safe for parallel calls with different sourceIds since each only touches its own rows.
 * @param {string} projectId
 * @param {string} sourceId - The usage source (page slug, "global:header", "global:theme-settings", etc.)
 * @param {string[]} fileIds - File IDs that should have this sourceId in their usedIn
 */
export function updateMediaUsageForSource(projectId, sourceId, fileIds) {
  const db = getDb();
  const txn = db.transaction(() => {
    // Get all file IDs for this project
    const allFileIds = db.prepare("SELECT id FROM media_files WHERE project_id = ?").all(projectId).map((r) => r.id);
    if (allFileIds.length === 0) return;

    // Delete only usage rows matching this sourceId for this project's files
    const placeholders = allFileIds.map(() => "?").join(",");
    db.prepare(
      `DELETE FROM media_usage WHERE used_in = ? AND media_file_id IN (${placeholders})`
    ).run(sourceId, ...allFileIds);

    // Re-insert for the specific files that reference this source
    const insertUsage = db.prepare("INSERT OR IGNORE INTO media_usage (media_file_id, used_in) VALUES (?, ?)");
    for (const fileId of fileIds) {
      insertUsage.run(fileId, sourceId);
    }
  });
  txn();
}

// ==========================================
// Internal helpers
// ==========================================

/**
 * Insert a media file row and its sizes. Used by both addMediaFile and writeMediaData.
 * @param {import('better-sqlite3').Database} db
 * @param {string} projectId
 * @param {object} fileData
 * @param {string} userId
 */
function insertMediaFile(db, projectId, fileData, userId = "local") {
  db.prepare(`
    INSERT INTO media_files (id, project_id, user_id, filename, original_name, type, size, uploaded, path, alt, title, width, height)
    VALUES (@id, @projectId, @userId, @filename, @originalName, @type, @size, @uploaded, @path, @alt, @title, @width, @height)
  `).run({
    id: fileData.id,
    projectId,
    userId,
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
