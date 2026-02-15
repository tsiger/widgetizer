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
 * @param {string} projectId
 * @param {string} fileId
 * @returns {object|null}
 */
export function getMediaFileById(projectId, fileId) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM media_files WHERE id = ? AND project_id = ?").get(fileId, projectId);
  if (!row) return null;

  const sizes = db.prepare("SELECT * FROM media_sizes WHERE media_file_id = ?").all(fileId);
  const usage = db.prepare("SELECT used_in FROM media_usage WHERE media_file_id = ?").all(fileId).map((r) => r.used_in);

  return rowToMediaFile(row, sizes, usage);
}

/**
 * Add a new media file with its sizes.
 * @param {string} projectId
 * @param {object} fileData - File info from controller (same shape as the old JSON entry)
 */
export function addMediaFile(projectId, fileData) {
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
 * Add multiple media files in a single transaction.
 * @param {string} projectId
 * @param {Array<object>} filesData
 */
export function addMediaFiles(projectId, filesData) {
  const db = getDb();
  const txn = db.transaction(() => {
    for (const fileData of filesData) {
      addMediaFile(projectId, fileData);
    }
  });
  txn();
}

/**
 * Update media file metadata (alt, title, description).
 * @param {string} fileId
 * @param {object} metadata - { alt, title, description }
 */
export function updateMediaMetadata(fileId, metadata) {
  const db = getDb();
  const setClauses = [];
  const params = { fileId };

  if (metadata.alt !== undefined) {
    setClauses.push("alt = @alt");
    params.alt = metadata.alt || "";
  }
  if (metadata.title !== undefined) {
    setClauses.push("title = @title");
    params.title = metadata.title || "";
  }

  if (setClauses.length === 0) return;

  db.prepare(`UPDATE media_files SET ${setClauses.join(", ")} WHERE id = @fileId`).run(params);
}

/**
 * Delete a media file. Cascades to sizes and usage.
 * @param {string} fileId
 * @returns {boolean} True if deleted
 */
export function deleteMediaFile(fileId) {
  const db = getDb();
  const result = db.prepare("DELETE FROM media_files WHERE id = ?").run(fileId);
  return result.changes > 0;
}

/**
 * Delete multiple media files in a single transaction.
 * @param {Array<string>} fileIds
 * @returns {number} Number of deleted files
 */
export function bulkDeleteMediaFiles(fileIds) {
  const db = getDb();
  let deleted = 0;
  const txn = db.transaction(() => {
    const stmt = db.prepare("DELETE FROM media_files WHERE id = ?");
    for (const id of fileIds) {
      deleted += stmt.run(id).changes;
    }
  });
  txn();
  return deleted;
}

// ==========================================
// Media Usage Tracking
// ==========================================

/**
 * Set the media usage for a page/global widget.
 * Removes old usage for this usageId and adds new entries.
 * @param {string} projectId
 * @param {string} usageId - Page slug or 'global:header' etc.
 * @param {Array<string>} mediaPaths - Array of media paths used
 */
export function setUsage(projectId, usageId, mediaPaths) {
  const db = getDb();
  const txn = db.transaction(() => {
    // Remove old usage for this usageId within this project
    db.prepare(`
      DELETE FROM media_usage
      WHERE used_in = ?
        AND media_file_id IN (SELECT id FROM media_files WHERE project_id = ?)
    `).run(usageId, projectId);

    // Add new usage
    if (mediaPaths.length > 0) {
      const insert = db.prepare("INSERT OR IGNORE INTO media_usage (media_file_id, used_in) VALUES (?, ?)");
      const findFile = db.prepare("SELECT id FROM media_files WHERE project_id = ? AND path = ?");

      for (const mediaPath of mediaPaths) {
        const file = findFile.get(projectId, mediaPath);
        if (file) {
          insert.run(file.id, usageId);
        }
      }
    }
  });
  txn();
}

/**
 * Remove all usage entries for a page/global widget.
 * @param {string} projectId
 * @param {string} usageId
 */
export function removeUsage(projectId, usageId) {
  const db = getDb();
  db.prepare(`
    DELETE FROM media_usage
    WHERE used_in = ?
      AND media_file_id IN (SELECT id FROM media_files WHERE project_id = ?)
  `).run(usageId, projectId);
}

/**
 * Get usage info for a specific media file.
 * @param {string} fileId
 * @returns {Array<string>} Array of usageIds
 */
export function getUsage(fileId) {
  const db = getDb();
  return db.prepare("SELECT used_in FROM media_usage WHERE media_file_id = ?").all(fileId).map((r) => r.used_in);
}

/**
 * Clear all usage for a project and rebuild from scratch.
 * @param {string} projectId
 */
export function clearAllUsage(projectId) {
  const db = getDb();
  db.prepare(`
    DELETE FROM media_usage
    WHERE media_file_id IN (SELECT id FROM media_files WHERE project_id = ?)
  `).run(projectId);
}

/**
 * Bulk-set usage for all pages at once (used during refresh).
 * Clears existing usage first, then inserts all new entries.
 * @param {string} projectId
 * @param {Array<{usageId: string, mediaPaths: string[]}>} usageEntries
 */
export function rebuildAllUsage(projectId, usageEntries) {
  const db = getDb();
  const txn = db.transaction(() => {
    // Clear all existing usage for this project
    clearAllUsage(projectId);

    // Insert all new usage
    const insert = db.prepare("INSERT OR IGNORE INTO media_usage (media_file_id, used_in) VALUES (?, ?)");
    const findFile = db.prepare("SELECT id FROM media_files WHERE project_id = ? AND path = ?");

    for (const entry of usageEntries) {
      for (const mediaPath of entry.mediaPaths) {
        const file = findFile.get(projectId, mediaPath);
        if (file) {
          insert.run(file.id, entry.usageId);
        }
      }
    }
  });
  txn();
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
