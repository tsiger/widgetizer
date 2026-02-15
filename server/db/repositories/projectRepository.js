import { getDb } from "../index.js";

/**
 * Get all projects.
 * @returns {Array<object>} Array of project objects in the shape controllers expect
 */
export function getAllProjects() {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM projects ORDER BY created DESC").all();
  return rows.map(rowToProject);
}

/**
 * Get a project by its UUID.
 * @param {string} id - Project UUID
 * @returns {object|null} Project object or null
 */
export function getProjectById(id) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
  return row ? rowToProject(row) : null;
}

/**
 * Get the folder name for a project by its UUID.
 * @param {string} projectId
 * @returns {string|null} Folder name or null if not found
 */
export function getProjectFolderName(projectId) {
  const db = getDb();
  const row = db.prepare("SELECT folder_name FROM projects WHERE id = ?").get(projectId);
  return row ? row.folder_name : null;
}

/**
 * Create a new project.
 * @param {object} project - Project data matching the controller shape
 */
export function createProject(project) {
  const db = getDb();
  db.prepare(`
    INSERT INTO projects (id, folder_name, name, description, theme, theme_version, preset, receive_theme_updates, site_url, last_theme_update_at, last_theme_update_version, created, updated)
    VALUES (@id, @folderName, @name, @description, @theme, @themeVersion, @preset, @receiveThemeUpdates, @siteUrl, @lastThemeUpdateAt, @lastThemeUpdateVersion, @created, @updated)
  `).run({
    id: project.id,
    folderName: project.folderName,
    name: project.name,
    description: project.description || "",
    theme: project.theme || null,
    themeVersion: project.themeVersion || null,
    preset: project.preset || null,
    receiveThemeUpdates: project.receiveThemeUpdates ? 1 : 0,
    siteUrl: project.siteUrl || "",
    lastThemeUpdateAt: project.lastThemeUpdateAt || null,
    lastThemeUpdateVersion: project.lastThemeUpdateVersion || null,
    created: project.created,
    updated: project.updated,
  });
}

/**
 * Update an existing project.
 * Only updates fields present in the updates object.
 * @param {string} id - Project UUID
 * @param {object} updates - Fields to update
 */
export function updateProject(id, updates) {
  const db = getDb();
  const current = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
  if (!current) return null;

  const merged = {
    id,
    folderName: updates.folderName ?? current.folder_name,
    name: updates.name ?? current.name,
    description: updates.description !== undefined ? updates.description : current.description,
    theme: updates.theme !== undefined ? updates.theme : current.theme,
    themeVersion: updates.themeVersion !== undefined ? updates.themeVersion : current.theme_version,
    preset: updates.preset !== undefined ? updates.preset : current.preset,
    receiveThemeUpdates: updates.receiveThemeUpdates !== undefined
      ? (updates.receiveThemeUpdates ? 1 : 0)
      : current.receive_theme_updates,
    siteUrl: updates.siteUrl !== undefined ? (updates.siteUrl || "") : current.site_url,
    lastThemeUpdateAt: updates.lastThemeUpdateAt !== undefined ? updates.lastThemeUpdateAt : current.last_theme_update_at,
    lastThemeUpdateVersion: updates.lastThemeUpdateVersion !== undefined ? updates.lastThemeUpdateVersion : current.last_theme_update_version,
    updated: updates.updated || new Date().toISOString(),
    created: current.created,
  };

  db.prepare(`
    UPDATE projects SET
      folder_name = @folderName,
      name = @name,
      description = @description,
      theme = @theme,
      theme_version = @themeVersion,
      preset = @preset,
      receive_theme_updates = @receiveThemeUpdates,
      site_url = @siteUrl,
      last_theme_update_at = @lastThemeUpdateAt,
      last_theme_update_version = @lastThemeUpdateVersion,
      updated = @updated
    WHERE id = @id
  `).run(merged);

  return rowToProject(db.prepare("SELECT * FROM projects WHERE id = ?").get(id));
}

/**
 * Delete a project by ID. Media metadata cascades automatically.
 * @param {string} id - Project UUID
 * @returns {boolean} True if a row was deleted
 */
export function deleteProject(id) {
  const db = getDb();
  const result = db.prepare("DELETE FROM projects WHERE id = ?").run(id);
  return result.changes > 0;
}

/**
 * Get the active project ID.
 * @returns {string|null}
 */
export function getActiveProjectId() {
  const db = getDb();
  const row = db.prepare("SELECT value FROM app_settings WHERE key = 'activeProjectId'").get();
  if (!row || !row.value) return null;
  return JSON.parse(row.value);
}

/**
 * Set the active project ID.
 * @param {string|null} id
 */
export function setActiveProjectId(id) {
  const db = getDb();
  db.prepare(`
    INSERT INTO app_settings (key, value) VALUES ('activeProjectId', @value)
    ON CONFLICT(key) DO UPDATE SET value = @value
  `).run({ value: id !== null ? JSON.stringify(id) : null });
}

/**
 * Read the projects data in the legacy shape (for backward compatibility).
 * Returns { projects: [...], activeProjectId: "..." }
 * @returns {{projects: Array<object>, activeProjectId: string|null}}
 */
export function readProjectsData() {
  return {
    projects: getAllProjects(),
    activeProjectId: getActiveProjectId(),
  };
}

/**
 * Write the full projects data from the legacy shape (for backward compatibility).
 * Replaces all projects and updates activeProjectId.
 * @param {{projects: Array<object>, activeProjectId: string|null}} data
 */
export function writeProjectsData(data) {
  const db = getDb();
  const txn = db.transaction(() => {
    // Get current project IDs in DB
    const currentIds = new Set(
      db.prepare("SELECT id FROM projects").all().map((r) => r.id),
    );
    const incomingIds = new Set((data.projects || []).map((p) => p.id));

    // Delete projects that are no longer in the list
    for (const id of currentIds) {
      if (!incomingIds.has(id)) {
        db.prepare("DELETE FROM projects WHERE id = ?").run(id);
      }
    }

    // Upsert each project
    const upsert = db.prepare(`
      INSERT INTO projects (id, folder_name, name, description, theme, theme_version, preset, receive_theme_updates, site_url, last_theme_update_at, last_theme_update_version, created, updated)
      VALUES (@id, @folderName, @name, @description, @theme, @themeVersion, @preset, @receiveThemeUpdates, @siteUrl, @lastThemeUpdateAt, @lastThemeUpdateVersion, @created, @updated)
      ON CONFLICT(id) DO UPDATE SET
        folder_name = @folderName,
        name = @name,
        description = @description,
        theme = @theme,
        theme_version = @themeVersion,
        preset = @preset,
        receive_theme_updates = @receiveThemeUpdates,
        site_url = @siteUrl,
        last_theme_update_at = @lastThemeUpdateAt,
        last_theme_update_version = @lastThemeUpdateVersion,
        updated = @updated
    `);

    for (const p of data.projects || []) {
      upsert.run({
        id: p.id,
        folderName: p.folderName,
        name: p.name,
        description: p.description || "",
        theme: p.theme || null,
        themeVersion: p.themeVersion || null,
        preset: p.preset || null,
        receiveThemeUpdates: p.receiveThemeUpdates ? 1 : 0,
        siteUrl: p.siteUrl || "",
        lastThemeUpdateAt: p.lastThemeUpdateAt || null,
        lastThemeUpdateVersion: p.lastThemeUpdateVersion || null,
        created: p.created,
        updated: p.updated || p.created,
      });
    }

    // Update activeProjectId
    setActiveProjectId(data.activeProjectId || null);
  });

  txn();
}

/**
 * Convert a database row to the project shape controllers expect.
 */
function rowToProject(row) {
  const project = {
    id: row.id,
    folderName: row.folder_name,
    name: row.name,
    description: row.description,
    theme: row.theme,
    themeVersion: row.theme_version,
    preset: row.preset,
    receiveThemeUpdates: !!row.receive_theme_updates,
    siteUrl: row.site_url,
    created: row.created,
    updated: row.updated,
  };

  // Only include theme update fields if they have values
  if (row.last_theme_update_at) project.lastThemeUpdateAt = row.last_theme_update_at;
  if (row.last_theme_update_version) project.lastThemeUpdateVersion = row.last_theme_update_version;

  return project;
}
