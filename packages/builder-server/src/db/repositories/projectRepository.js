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
    INSERT INTO projects (id, folder_name, name, description, site_title, theme, theme_version, preset, receive_theme_updates, site_url, clean_urls, last_theme_update_at, last_theme_update_version, created, updated)
    VALUES (@id, @folderName, @name, @description, @siteTitle, @theme, @themeVersion, @preset, @receiveThemeUpdates, @siteUrl, @cleanUrls, @lastThemeUpdateAt, @lastThemeUpdateVersion, @created, @updated)
  `).run({
    id: project.id,
    folderName: project.folderName,
    name: project.name,
    description: project.description || "",
    siteTitle: project.siteTitle || "",
    theme: project.theme || null,
    themeVersion: project.themeVersion || null,
    preset: project.preset || null,
    receiveThemeUpdates: project.receiveThemeUpdates ? 1 : 0,
    siteUrl: project.siteUrl || "",
    cleanUrls: project.cleanUrls ? 1 : 0,
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
  // Immediate transaction: the read-merge-write must hold the write lock from
  // the start — a deferred wrap would take a read snapshot first and could die
  // with un-waitable SQLITE_BUSY_SNAPSHOT on the upgrade if a second connection
  // ever shares the DB file, and no wrap at all makes the merge a lost-update
  // window for such a connection.
  return db.transaction(() => updateProjectStatements(db, id, updates)).immediate();
}

function updateProjectStatements(db, id, updates) {
  const current = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
  if (!current) return null;

  const merged = {
    id,
    folderName: updates.folderName ?? current.folder_name,
    name: updates.name ?? current.name,
    description: updates.description !== undefined ? updates.description : current.description,
    siteTitle: updates.siteTitle !== undefined ? (updates.siteTitle || "") : current.site_title,
    theme: updates.theme !== undefined ? updates.theme : current.theme,
    themeVersion: updates.themeVersion !== undefined ? updates.themeVersion : current.theme_version,
    preset: updates.preset !== undefined ? updates.preset : current.preset,
    receiveThemeUpdates: updates.receiveThemeUpdates !== undefined
      ? (updates.receiveThemeUpdates ? 1 : 0)
      : current.receive_theme_updates,
    siteUrl: updates.siteUrl !== undefined ? (updates.siteUrl || "") : current.site_url,
    cleanUrls: updates.cleanUrls !== undefined ? (updates.cleanUrls ? 1 : 0) : current.clean_urls,
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
      site_title = @siteTitle,
      theme = @theme,
      theme_version = @themeVersion,
      preset = @preset,
      receive_theme_updates = @receiveThemeUpdates,
      site_url = @siteUrl,
      clean_urls = @cleanUrls,
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
 * Check if a project with the given name already exists.
 * @param {string} name - Project name (case-insensitive comparison)
 * @param {string|null} excludeId - Project ID to exclude (for update validation)
 * @returns {boolean}
 */
export function projectNameExists(name, excludeId = null) {
  const db = getDb();
  if (excludeId) {
    const row = db.prepare(
      "SELECT 1 FROM projects WHERE LOWER(name) = LOWER(?) AND id != ? LIMIT 1"
    ).get(name, excludeId);
    return !!row;
  }
  const row = db.prepare(
    "SELECT 1 FROM projects WHERE LOWER(name) = LOWER(?) LIMIT 1"
  ).get(name);
  return !!row;
}

/**
 * Check if a project with the given folder name already exists.
 * @param {string} folderName
 * @param {string|null} excludeId - Project ID to exclude (for update validation)
 * @returns {boolean}
 */
export function projectFolderExists(folderName, excludeId = null) {
  const db = getDb();
  if (excludeId) {
    const row = db.prepare(
      "SELECT 1 FROM projects WHERE folder_name = ? AND id != ? LIMIT 1"
    ).get(folderName, excludeId);
    return !!row;
  }
  const row = db.prepare(
    "SELECT 1 FROM projects WHERE folder_name = ? LIMIT 1"
  ).get(folderName);
  return !!row;
}

/**
 * Get the active project ID.
 * @returns {string|null}
 */
export function getActiveProjectId() {
  const db = getDb();
  const row = db.prepare("SELECT value FROM app_settings WHERE key = 'activeProjectId'").get();
  if (row && row.value) return JSON.parse(row.value);
  return null;
}

/**
 * Set the active project ID.
 * @param {string|null} id
 */
export function setActiveProjectId(id) {
  const db = getDb();
  const key = "activeProjectId";
  db.prepare(`
    INSERT INTO app_settings (key, value) VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET value = @value
  `).run({ key, value: id !== null ? JSON.stringify(id) : null });
}

/**
 * Read all projects data as a single object.
 * @returns {{projects: Array<object>, activeProjectId: string|null}}
 */
export function readProjectsData() {
  const db = getDb();
  // Read-only transaction so both reads see one consistent snapshot if a
  // second connection ever shares the DB file.
  return db.transaction(() => ({
    projects: getAllProjects(),
    activeProjectId: getActiveProjectId(),
  }))();
}

/**
 * Write the full projects data (replaces all projects and updates activeProjectId).
 * @param {{projects: Array<object>, activeProjectId: string|null}} data
 */
export function writeProjectsData(data) {
  const db = getDb();
  // Immediate transaction: the id-list read precedes the writes, so the write
  // lock must be taken up front (see updateProject for the rationale).
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
      INSERT INTO projects (id, folder_name, name, description, site_title, theme, theme_version, preset, receive_theme_updates, site_url, clean_urls, last_theme_update_at, last_theme_update_version, created, updated)
      VALUES (@id, @folderName, @name, @description, @siteTitle, @theme, @themeVersion, @preset, @receiveThemeUpdates, @siteUrl, @cleanUrls, @lastThemeUpdateAt, @lastThemeUpdateVersion, @created, @updated)
      ON CONFLICT(id) DO UPDATE SET
        folder_name = @folderName,
        name = @name,
        description = @description,
        site_title = @siteTitle,
        theme = @theme,
        theme_version = @themeVersion,
        preset = @preset,
        receive_theme_updates = @receiveThemeUpdates,
        site_url = @siteUrl,
        clean_urls = @cleanUrls,
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
        siteTitle: p.siteTitle || "",
        theme: p.theme || null,
        themeVersion: p.themeVersion || null,
        preset: p.preset || null,
        receiveThemeUpdates: p.receiveThemeUpdates ? 1 : 0,
        siteUrl: p.siteUrl || "",
        cleanUrls: p.cleanUrls ? 1 : 0,
        lastThemeUpdateAt: p.lastThemeUpdateAt || null,
        lastThemeUpdateVersion: p.lastThemeUpdateVersion || null,
        created: p.created,
        updated: p.updated || p.created,
      });
    }

    // Update activeProjectId
    setActiveProjectId(data.activeProjectId || null);
  });

  txn.immediate();
}

/**
 * Delete a project and, when it was the active one (or none was active),
 * reassign the active id to the first remaining project — in one transaction,
 * so no observer of a second connection can see the deleted project still
 * active. The transaction's first statement is the DELETE, so a default
 * deferred transaction already takes the write lock up front.
 * @param {string} id - Project UUID
 * @returns {string|null} The active project id after the deletion
 */
export function deleteProjectAndReassignActive(id) {
  const db = getDb();
  return db.transaction(() => {
    db.prepare("DELETE FROM projects WHERE id = ?").run(id);

    let activeId = getActiveProjectId();
    if (activeId === id || !activeId) {
      const remaining = getAllProjects();
      activeId = remaining[0]?.id || null;
      setActiveProjectId(activeId);
    }
    return activeId;
  })();
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
    siteTitle: row.site_title,
    theme: row.theme,
    themeVersion: row.theme_version,
    preset: row.preset,
    receiveThemeUpdates: !!row.receive_theme_updates,
    siteUrl: row.site_url,
    cleanUrls: !!row.clean_urls,
    created: row.created,
    updated: row.updated,
  };

  // Only include theme update fields if they have values
  if (row.last_theme_update_at) project.lastThemeUpdateAt = row.last_theme_update_at;
  if (row.last_theme_update_version) project.lastThemeUpdateVersion = row.last_theme_update_version;

  return project;
}
