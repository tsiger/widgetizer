import { getDb } from "../index.js";

/**
 * Get the next export version number for a project.
 * @param {string} projectId
 * @returns {number}
 */
export function getNextVersion(projectId) {
  const db = getDb();
  const row = db.prepare(
    "SELECT MAX(version) as maxVersion FROM exports WHERE project_id = ?"
  ).get(projectId);
  return (row?.maxVersion || 0) + 1;
}

/**
 * Record an export in the database.
 * @param {string} projectId
 * @param {number} version
 * @param {string|null} outputDir
 * @param {string} status - "success" or "failed"
 * @returns {{ version: number, timestamp: string, outputDir: string|null, status: string }}
 */
export function recordExport(projectId, version, outputDir, status = "success") {
  const db = getDb();
  const timestamp = new Date().toISOString();

  db.prepare(`
    INSERT INTO exports (project_id, version, timestamp, output_dir, status)
    VALUES (@projectId, @version, @timestamp, @outputDir, @status)
  `).run({
    projectId,
    version,
    timestamp,
    outputDir: outputDir || null,
    status,
  });

  return { version, timestamp, outputDir, status };
}

/**
 * Get all exports for a project, newest first.
 * @param {string} projectId
 * @returns {Array<{ version: number, timestamp: string, outputDir: string|null, status: string }>}
 */
export function getExports(projectId) {
  const db = getDb();
  const rows = db.prepare(
    "SELECT version, timestamp, output_dir, status FROM exports WHERE project_id = ? ORDER BY version DESC"
  ).all(projectId);

  return rows.map((row) => ({
    version: row.version,
    timestamp: row.timestamp,
    outputDir: row.output_dir,
    status: row.status,
  }));
}

/**
 * Delete a specific export version for a project.
 * @param {string} projectId
 * @param {number} version
 * @returns {{ outputDir: string|null } | null} The deleted export record, or null if not found
 */
export function deleteExportRecord(projectId, version) {
  const db = getDb();
  // Single DELETE … RETURNING statement: the returned record provably matches
  // the row that was deleted (a separate SELECT could diverge under a
  // concurrent writer on a second connection).
  const row = db.prepare(
    "DELETE FROM exports WHERE project_id = ? AND version = ? RETURNING output_dir"
  ).get(projectId, version);

  return row ? { outputDir: row.output_dir } : null;
}

/**
 * Delete all export records for a project.
 * @param {string} projectId
 * @returns {Array<{ outputDir: string|null }>} List of deleted export records with their output dirs
 */
export function deleteAllExports(projectId) {
  const db = getDb();
  // Single DELETE … RETURNING statement — see deleteExportRecord.
  const rows = db.prepare(
    "DELETE FROM exports WHERE project_id = ? RETURNING output_dir"
  ).all(projectId);

  return rows.map((row) => ({ outputDir: row.output_dir }));
}

/**
 * Trim exports for a project to keep only the most recent N versions.
 * Returns the trimmed records (so callers can clean up directories).
 * @param {string} projectId
 * @param {number} maxToKeep
 * @returns {Array<{ version: number, outputDir: string|null }>}
 */
export function trimExports(projectId, maxToKeep) {
  const db = getDb();
  // Single DELETE … RETURNING statement driven by a subquery (newest first,
  // skip the first maxToKeep) — see deleteExportRecord for why.
  const deleted = db.prepare(`
    DELETE FROM exports
    WHERE project_id = ? AND version IN (
      SELECT version FROM exports WHERE project_id = ? ORDER BY version DESC LIMIT -1 OFFSET ?
    )
    RETURNING version, output_dir
  `).all(projectId, projectId, maxToKeep);

  return deleted.map((row) => ({
    version: row.version,
    outputDir: row.output_dir,
  }));
}
