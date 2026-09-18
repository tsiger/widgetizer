import { getDb } from "../index.js";

/**
 * Get all media files for a project in the shape controllers expect.
 * Assembles the nested sizes/usedIn from normalized tables.
 * @param {string} projectId - Project UUID
 * @returns {{files: Array<object>}} Media data object
 */
export function getMediaFiles(projectId) {
  const db = getDb();
  // Read-only transaction so the three table reads see one consistent
  // snapshot if a second connection ever shares the DB file.
  return db.transaction(() => getMediaFilesStatements(db, projectId))();
}

function getMediaFilesStatements(db, projectId) {
  const files = db.prepare("SELECT * FROM media_files WHERE project_id = ? ORDER BY uploaded DESC").all(projectId);

  if (files.length === 0) return { files: [] };

  // Batch-load sizes and usage for all files in this project
  const fileIds = files.map((f) => f.id);
  const placeholders = fileIds.map(() => "?").join(",");

  const allSizes = db.prepare(`SELECT * FROM media_sizes WHERE media_file_id IN (${placeholders})`).all(...fileIds);
  const allUsage = db.prepare(`SELECT * FROM media_usage WHERE media_file_id IN (${placeholders})`).all(...fileIds);
  const allTranslations = db
    .prepare(`SELECT * FROM media_file_translations WHERE media_file_id IN (${placeholders})`)
    .all(...fileIds);

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

  const translationsByFile = new Map();
  for (const row of allTranslations) {
    if (!translationsByFile.has(row.media_file_id)) translationsByFile.set(row.media_file_id, []);
    translationsByFile.get(row.media_file_id).push(row);
  }

  return {
    files: files.map((row) =>
      rowToMediaFile(
        row,
        sizesByFile.get(row.id) || [],
        usageByFile.get(row.id) || [],
        translationsByFile.get(row.id) || [],
      ),
    ),
  };
}

/**
 * Get a single media file by ID, scoped to a project.
 * @param {string} projectId - Project UUID
 * @param {string} fileId
 * @returns {object|null} Media file object or null
 */
export function getMediaFileById(projectId, fileId) {
  const db = getDb();
  // Read-only transaction so the three table reads see one consistent
  // snapshot if a second connection ever shares the DB file.
  return db.transaction(() => {
    const row = db.prepare("SELECT * FROM media_files WHERE id = ? AND project_id = ?").get(fileId, projectId);
    if (!row) return null;

    const translationRows = db.prepare("SELECT * FROM media_file_translations WHERE media_file_id = ?").all(fileId);
    const sizeRows = db.prepare("SELECT * FROM media_sizes WHERE media_file_id = ?").all(fileId);
    const usageRows = db.prepare("SELECT used_in FROM media_usage WHERE media_file_id = ?").all(fileId);

    return rowToMediaFile(row, sizeRows, usageRows.map((r) => r.used_in), translationRows);
  })();
}

/**
 * Write the full media data for a project (replaces all existing media files).
 * Used for project import and duplication where a full replacement is appropriate.
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
      insertMediaFile(db, projectId, file);

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
 */
export function addMediaFile(projectId, fileData) {
  const db = getDb();
  insertMediaFile(db, projectId, fileData);
}

/**
 * Delete a single media file by ID, scoped to a project. Cascade handles sizes + usage.
 * @param {string} projectId - Project UUID
 * @param {string} fileId
 * @returns {boolean} True if a row was deleted
 */
export function deleteMediaFile(projectId, fileId) {
  const db = getDb();
  const result = db.prepare("DELETE FROM media_files WHERE id = ? AND project_id = ?").run(fileId, projectId);
  return result.changes > 0;
}

/**
 * Delete multiple media files by IDs in a single statement, scoped to a project.
 * @param {string} projectId - Project UUID
 * @param {string[]} fileIds
 * @returns {number} Number of rows deleted
 */
export function deleteMediaFiles(projectId, fileIds) {
  if (fileIds.length === 0) return 0;
  const db = getDb();
  const placeholders = fileIds.map(() => "?").join(",");
  const result = db.prepare(`DELETE FROM media_files WHERE id IN (${placeholders}) AND project_id = ?`).run(...fileIds, projectId);
  return result.changes;
}

/**
 * Update metadata (alt, title, caption) for a single media file, scoped to a project.
 * @param {string} projectId - Project UUID
 * @param {string} fileId
 * @param {{ alt?: string, title?: string, caption?: string }} metadata
 * @returns {boolean} True if a row was updated
 */
export function updateFileMetadata(projectId, fileId, metadata) {
  const db = getDb();
  const result = db.prepare(
    "UPDATE media_files SET alt = @alt, title = @title, caption = @caption WHERE id = @id AND project_id = @projectId"
  ).run({
    id: fileId,
    projectId,
    alt: metadata.alt ?? "",
    title: metadata.title ?? "",
    caption: metadata.caption ?? "",
  });
  return result.changes > 0;
}

/**
 * Write one language's alt/title/caption for a media file. A field given as
 * `null` (or left out) is stored as NULL, which means "inherit the default
 * language"; `""` is stored as-is and means "deliberately blank". Storing all
 * three as NULL removes the row, so an untranslated file carries no row at all.
 *
 * @param {string} projectId - Project UUID (ownership check)
 * @param {string} fileId
 * @param {string} language - a NON-default language; the default lives in media_files
 * @param {{ alt?: string|null, title?: string|null, caption?: string|null }} metadata
 * @returns {boolean} True if the file belongs to the project
 */
export function updateFileTranslation(projectId, fileId, language, metadata) {
  const db = getDb();
  return db.transaction(() => {
    const owned = db
      .prepare("SELECT 1 FROM media_files WHERE id = ? AND project_id = ?")
      .get(fileId, projectId);
    if (!owned) return false;

    const values = {
      alt: metadata.alt ?? null,
      title: metadata.title ?? null,
      caption: metadata.caption ?? null,
    };

    if (values.alt === null && values.title === null && values.caption === null) {
      db.prepare("DELETE FROM media_file_translations WHERE media_file_id = ? AND language = ?").run(fileId, language);
      return true;
    }

    db.prepare(
      `INSERT INTO media_file_translations (media_file_id, language, alt, title, caption)
       VALUES (@fileId, @language, @alt, @title, @caption)
       ON CONFLICT(media_file_id, language)
       DO UPDATE SET alt = @alt, title = @title, caption = @caption`,
    ).run({ fileId, language, ...values });
    return true;
  })();
}

/**
 * Drop every media translation a language holds in a project. Called when the
 * language itself is removed; the binaries and the default language are untouched.
 * @param {string} projectId - Project UUID
 * @param {string} language
 * @returns {number} Rows deleted
 */
export function deleteMediaTranslationsForLanguage(projectId, language) {
  const db = getDb();
  const result = db
    .prepare(
      `DELETE FROM media_file_translations
       WHERE language = ?
         AND media_file_id IN (SELECT id FROM media_files WHERE project_id = ?)`,
    )
    .run(language, projectId);
  return result.changes;
}

/**
 * Replace all media_usage entries for a project in one transaction.
 * Only touches the media_usage table — does NOT delete/reinsert media_files or media_sizes.
 * Used by refreshAllMediaUsage which rebuilds all usage from scratch.
 * @param {string} projectId
 * @param {Map<string, string[]>} usageMap - Map of fileId -> array of usedIn strings
 */
export function replaceMediaUsage(projectId, usageMap) {
  const db = getDb();
  // Write-first transaction: the DELETE subquery replaces a preliminary
  // SELECT-then-DELETE, so a deferred transaction never has to upgrade a read
  // snapshot to a write lock (un-waitable SQLITE_BUSY_SNAPSHOT if a second
  // connection ever shares the DB file). The INSERT … SELECT keeps the insert
  // path scoped to this project's files, which the id-list previously enforced.
  const txn = db.transaction(() => {
    db.prepare(
      "DELETE FROM media_usage WHERE media_file_id IN (SELECT id FROM media_files WHERE project_id = ?)"
    ).run(projectId);

    const insertUsage = db.prepare(`
      INSERT OR IGNORE INTO media_usage (media_file_id, used_in)
      SELECT id, ? FROM media_files WHERE id = ? AND project_id = ?
    `);
    for (const [fileId, usedInList] of usageMap) {
      for (const usedIn of usedInList) {
        insertUsage.run(usedIn, fileId, projectId);
      }
    }
  });
  txn();
}

/**
 * Update media_usage for a single source (page, global widget, theme settings) in one transaction.
 * Removes all usage rows with this sourceId for the project's files, then re-inserts for the given
 * fileIds. Note SQLite serializes ALL writes on one db-level lock (no row-level locking), so calls
 * for different sourceIds commute logically but still execute strictly one at a time.
 * @param {string} projectId
 * @param {string} sourceId - The usage source (page slug, "global:header", "global:theme-settings", etc.)
 * @param {string[]} fileIds - File IDs that should have this sourceId in their usedIn
 */
export function updateMediaUsageForSource(projectId, sourceId, fileIds) {
  const db = getDb();
  // Write-first transaction with a project-scoped insert — same rationale as
  // replaceMediaUsage above.
  const txn = db.transaction(() => {
    db.prepare(
      "DELETE FROM media_usage WHERE used_in = ? AND media_file_id IN (SELECT id FROM media_files WHERE project_id = ?)"
    ).run(sourceId, projectId);

    const insertUsage = db.prepare(`
      INSERT OR IGNORE INTO media_usage (media_file_id, used_in)
      SELECT id, ? FROM media_files WHERE id = ? AND project_id = ?
    `);
    for (const fileId of fileIds) {
      insertUsage.run(sourceId, fileId, projectId);
    }
  });
  txn();
}

// ==========================================
// Internal helpers
// ==========================================

/**
 * Insert a media file row and its sizes, atomically. Used by both addMediaFile
 * and writeMediaData. Self-wrapped in a transaction so a failure among the
 * media_sizes inserts can't commit a media_files row with missing variants
 * (broken thumbnails nothing ever repairs); the wrap nests as a savepoint
 * under writeMediaData's own transaction.
 * @param {import('better-sqlite3').Database} db
 * @param {string} projectId
 * @param {object} fileData
 */
function insertMediaFile(db, projectId, fileData) {
  db.transaction(() => insertMediaFileStatements(db, projectId, fileData))();
}

function insertMediaFileStatements(db, projectId, fileData) {
  db.prepare(`
    INSERT INTO media_files (id, project_id, filename, original_name, type, size, uploaded, path, alt, title, caption, width, height)
    VALUES (@id, @projectId, @filename, @originalName, @type, @size, @uploaded, @path, @alt, @title, @caption, @width, @height)
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
    caption: fileData.metadata?.caption || "",
    width: fileData.width || null,
    height: fileData.height || null,
  });

  // Insert translations. A null field means "inherit", `""` means deliberately
  // blank, and both have to survive a duplication or an import intact.
  if (fileData.translations) {
    const insertTranslation = db.prepare(`
      INSERT INTO media_file_translations (media_file_id, language, alt, title, caption)
      VALUES (@mediaFileId, @language, @alt, @title, @caption)
    `);
    for (const [language, values] of Object.entries(fileData.translations)) {
      if (!values) continue;
      insertTranslation.run({
        mediaFileId: fileData.id,
        language,
        alt: values.alt ?? null,
        title: values.title ?? null,
        caption: values.caption ?? null,
      });
    }
  }

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
function rowToMediaFile(row, sizeRows, usageList, translationRows = []) {
  const translations = {};
  for (const translation of translationRows) {
    translations[translation.language] = {
      alt: translation.alt,
      title: translation.title,
      caption: translation.caption,
    };
  }

  // Build sizes object
  const sizes = {};
  for (const size of sizeRows) {
    sizes[size.size_name] = {
      path: size.path,
      width: size.width,
      height: size.height,
    };
  }

  const file = {
    id: row.id,
    filename: row.filename,
    originalName: row.original_name,
    type: row.type,
    size: row.size,
    uploaded: row.uploaded,
    path: row.path,
    metadata: { alt: row.alt || "", title: row.title || "", caption: row.caption || "" },
    // Only languages someone has actually translated appear here, and a null
    // field inside one means "inherit" — see @widgetizer/core/mediaMetadata.
    translations,
    sizes,
    usedIn: usageList,
    width: row.width,
    height: row.height,
  };

  return file;
}
