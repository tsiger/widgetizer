import { getDb } from "../index.js";

/**
 * Get all projects.
 * @returns {Array<object>} Array of project objects in the shape controllers expect
 */
export function getAllProjects(userId = "local") {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM projects WHERE user_id = ? ORDER BY created DESC").all(userId);
  return rows.map(rowToProject);
}

/**
 * Get a project by its UUID.
 * @param {string} id - Project UUID
 * @param {string} userId - User ID for scoping
 * @returns {object|null} Project object or null
 */
export function getProjectById(id, userId = "local") {
  const db = getDb();
  const row = db.prepare("SELECT * FROM projects WHERE id = ? AND user_id = ?").get(id, userId);
  return row ? rowToProject(row) : null;
}

/**
 * Get the folder name for a project by its UUID.
 * @param {string} projectId
 * @param {string} userId - User ID for scoping
 * @returns {string|null} Folder name or null if not found
 */
export function getProjectFolderName(projectId, userId = "local") {
  const db = getDb();
  const row = db.prepare("SELECT folder_name FROM projects WHERE id = ? AND user_id = ?").get(projectId, userId);
  return row ? row.folder_name : null;
}

/**
 * Create a new project.
 * @param {object} project - Project data matching the controller shape
 */
export function createProject(project) {
  const db = getDb();
  db.prepare(`
    INSERT INTO projects (id, folder_name, name, description, theme, theme_version, preset, receive_theme_updates, site_url, last_theme_update_at, last_theme_update_version, created, updated, user_id)
    VALUES (@id, @folderName, @name, @description, @theme, @themeVersion, @preset, @receiveThemeUpdates, @siteUrl, @lastThemeUpdateAt, @lastThemeUpdateVersion, @created, @updated, @userId)
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
    userId: project.userId || "local",
  });
}

/**
 * Update an existing project.
 * Only updates fields present in the updates object.
 * @param {string} id - Project UUID
 * @param {object} updates - Fields to update
 * @param {string} userId - User ID for scoping
 */
export function updateProject(id, updates, userId = "local") {
  const db = getDb();
  const current = db.prepare("SELECT * FROM projects WHERE id = ? AND user_id = ?").get(id, userId);
  if (!current) return null;

  const merged = {
    id,
    userId,
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
    WHERE id = @id AND user_id = @userId
  `).run(merged);

  return rowToProject(db.prepare("SELECT * FROM projects WHERE id = ? AND user_id = ?").get(id, userId));
}

/**
 * Delete a project by ID. Media metadata cascades automatically.
 * @param {string} id - Project UUID
 * @param {string} userId - User ID for scoping
 * @returns {boolean} True if a row was deleted
 */
export function deleteProject(id, userId = "local") {
  const db = getDb();
  const result = db.prepare("DELETE FROM projects WHERE id = ? AND user_id = ?").run(id, userId);
  return result.changes > 0;
}

/**
 * Get the active project ID for a user.
 * @param {string} userId
 * @returns {string|null}
 */
export function getActiveProjectId(userId = "local") {
  const db = getDb();
  const key = `activeProjectId:${userId}`;
  const row = db.prepare("SELECT value FROM app_settings WHERE key = ?").get(key);
  if (row && row.value) return JSON.parse(row.value);

  // Backward compatibility: for "local" user, fall back to legacy global key
  if (userId === "local") {
    const legacyRow = db.prepare("SELECT value FROM app_settings WHERE key = 'activeProjectId'").get();
    if (legacyRow && legacyRow.value) return JSON.parse(legacyRow.value);
  }

  return null;
}

/**
 * Set the active project ID for a user.
 * @param {string|null} id
 * @param {string} userId
 */
export function setActiveProjectId(id, userId = "local") {
  const db = getDb();
  const key = `activeProjectId:${userId}`;
  db.prepare(`
    INSERT INTO app_settings (key, value) VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET value = @value
  `).run({ key, value: id !== null ? JSON.stringify(id) : null });
}

/**
 * Read all projects data as a single object.
 * @param {string} userId
 * @returns {{projects: Array<object>, activeProjectId: string|null}}
 */
export function readProjectsData(userId = "local") {
  return {
    projects: getAllProjects(userId),
    activeProjectId: getActiveProjectId(userId),
  };
}

/**
 * Write the full projects data (replaces all projects and updates activeProjectId).
 * @param {{projects: Array<object>, activeProjectId: string|null}} data
 * @param {string} userId
 */
export function writeProjectsData(data, userId = "local") {
  const db = getDb();
  const txn = db.transaction(() => {
    // Get current project IDs in DB scoped to this user
    const currentIds = new Set(
      db.prepare("SELECT id FROM projects WHERE user_id = ?").all(userId).map((r) => r.id),
    );
    const incomingIds = new Set((data.projects || []).map((p) => p.id));

    // Delete projects that are no longer in the list (only this user's)
    for (const id of currentIds) {
      if (!incomingIds.has(id)) {
        db.prepare("DELETE FROM projects WHERE id = ? AND user_id = ?").run(id, userId);
      }
    }

    // Upsert each project
    const upsert = db.prepare(`
      INSERT INTO projects (id, folder_name, name, description, theme, theme_version, preset, receive_theme_updates, site_url, last_theme_update_at, last_theme_update_version, created, updated, user_id)
      VALUES (@id, @folderName, @name, @description, @theme, @themeVersion, @preset, @receiveThemeUpdates, @siteUrl, @lastThemeUpdateAt, @lastThemeUpdateVersion, @created, @updated, @userId)
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
        userId,
      });
    }

    // Update activeProjectId
    setActiveProjectId(data.activeProjectId || null, userId);
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
