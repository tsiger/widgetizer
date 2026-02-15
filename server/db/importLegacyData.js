import fs from "fs-extra";
import path from "path";
import { getProjectsFilePath, getAppSettingsPath, DATA_DIR, PUBLISH_DIR, getProjectMediaJsonPath } from "../config.js";

/**
 * Import data from legacy JSON files into SQLite on first run.
 * Only runs if the projects table is empty and legacy files exist.
 * @param {import('better-sqlite3').Database} db
 */
export function importLegacyDataIfNeeded(db) {
  const count = db.prepare("SELECT COUNT(*) as count FROM projects").get().count;

  // Also check if app_settings has data (covers case where there are no projects but settings exist)
  const settingsCount = db.prepare("SELECT COUNT(*) as count FROM app_settings").get().count;

  const projectsJsonPath = getProjectsFilePath();
  const appSettingsPath = getAppSettingsPath();

  const hasProjectsJson = fs.pathExistsSync(projectsJsonPath);
  const hasAppSettingsJson = fs.pathExistsSync(appSettingsPath);

  // Nothing to import
  if (!hasProjectsJson && !hasAppSettingsJson) return;
  // Already migrated
  if (count > 0 || settingsCount > 0) return;

  const importAll = db.transaction(() => {
    // Import projects.json
    if (hasProjectsJson) {
      try {
        const raw = fs.readFileSync(projectsJsonPath, "utf8");
        const data = JSON.parse(raw);

        const insertProject = db.prepare(`
          INSERT INTO projects (id, folder_name, name, description, theme, theme_version, preset, receive_theme_updates, site_url, last_theme_update_at, last_theme_update_version, created, updated)
          VALUES (@id, @folderName, @name, @description, @theme, @themeVersion, @preset, @receiveThemeUpdates, @siteUrl, @lastThemeUpdateAt, @lastThemeUpdateVersion, @created, @updated)
        `);

        for (const p of data.projects || []) {
          insertProject.run({
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
            updated: p.updated,
          });
        }

        // Import activeProjectId
        if (data.activeProjectId) {
          db.prepare("INSERT INTO app_settings (key, value) VALUES (?, ?)").run(
            "activeProjectId",
            JSON.stringify(data.activeProjectId),
          );
        }

        // Import media.json for each project
        const insertFile = db.prepare(`
          INSERT INTO media_files (id, project_id, filename, original_name, type, size, uploaded, path, alt, title, width, height)
          VALUES (@id, @projectId, @filename, @originalName, @type, @size, @uploaded, @path, @alt, @title, @width, @height)
        `);
        const insertSize = db.prepare(`
          INSERT INTO media_sizes (media_file_id, size_name, path, width, height)
          VALUES (@mediaFileId, @sizeName, @path, @width, @height)
        `);
        const insertUsage = db.prepare(`
          INSERT OR IGNORE INTO media_usage (media_file_id, used_in)
          VALUES (@mediaFileId, @usedIn)
        `);

        for (const p of data.projects || []) {
          const mediaJsonPath = getProjectMediaJsonPath(p.folderName);
          if (!fs.pathExistsSync(mediaJsonPath)) continue;

          try {
            const mediaRaw = fs.readFileSync(mediaJsonPath, "utf8");
            const mediaData = JSON.parse(mediaRaw);

            for (const file of mediaData.files || []) {
              insertFile.run({
                id: file.id,
                projectId: p.id,
                filename: file.filename,
                originalName: file.originalName,
                type: file.type,
                size: file.size,
                uploaded: file.uploaded,
                path: file.path,
                alt: file.metadata?.alt || "",
                title: file.metadata?.title || "",
                width: file.width || null,
                height: file.height || null,
              });

              // Import sizes
              if (file.sizes) {
                for (const [sizeName, sizeData] of Object.entries(file.sizes)) {
                  if (sizeData && sizeData.path) {
                    insertSize.run({
                      mediaFileId: file.id,
                      sizeName,
                      path: sizeData.path,
                      width: sizeData.width,
                      height: sizeData.height,
                    });
                  }
                }
              }

              // Import usedIn
              if (file.usedIn) {
                for (const usedIn of file.usedIn) {
                  insertUsage.run({ mediaFileId: file.id, usedIn });
                }
              }
            }
          } catch (mediaError) {
            console.warn(`[DB Import] Failed to import media for project ${p.folderName}: ${mediaError.message}`);
          }
        }
      } catch (error) {
        console.error("[DB Import] Failed to import projects.json:", error.message);
        throw error;
      }
    }

    // Import appSettings.json
    if (hasAppSettingsJson) {
      try {
        const raw = fs.readFileSync(appSettingsPath, "utf8");
        const settings = JSON.parse(raw);
        db.prepare("INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)").run(
          "config",
          JSON.stringify(settings),
        );
      } catch (error) {
        console.warn("[DB Import] Failed to import appSettings.json:", error.message);
      }
    }

    // Import export-history.json
    const exportHistoryPath = path.join(PUBLISH_DIR, "export-history.json");
    if (fs.pathExistsSync(exportHistoryPath)) {
      try {
        const raw = fs.readFileSync(exportHistoryPath, "utf8");
        const history = JSON.parse(raw);

        const insertExport = db.prepare(`
          INSERT INTO exports (project_id, version, timestamp, output_dir, status)
          VALUES (@projectId, @version, @timestamp, @outputDir, @status)
        `);

        for (const [projectId, projectHistory] of Object.entries(history)) {
          for (const exp of projectHistory.exports || []) {
            insertExport.run({
              projectId,
              version: exp.version,
              timestamp: exp.timestamp,
              outputDir: exp.outputDir || null,
              status: exp.status || "success",
            });
          }
        }
      } catch (error) {
        console.warn("[DB Import] Failed to import export-history.json:", error.message);
      }
    }
  });

  importAll();

  // Rename legacy files as backups
  const backupSuffix = ".pre-sqlite-backup";
  if (hasProjectsJson) {
    try {
      fs.renameSync(projectsJsonPath, projectsJsonPath + backupSuffix);
    } catch {
      // If rename fails, leave the file — not critical
    }
  }
  if (hasAppSettingsJson) {
    try {
      fs.renameSync(appSettingsPath, appSettingsPath + backupSuffix);
    } catch {
      // If rename fails, leave the file — not critical
    }
  }

  // Rename export-history.json
  const exportHistoryPath = path.join(PUBLISH_DIR, "export-history.json");
  if (fs.pathExistsSync(exportHistoryPath)) {
    try {
      fs.renameSync(exportHistoryPath, exportHistoryPath + backupSuffix);
    } catch {
      // Not critical
    }
  }

  // Rename per-project media.json files
  try {
    const projectsDir = path.join(DATA_DIR, "projects");
    if (fs.pathExistsSync(projectsDir)) {
      const entries = fs.readdirSync(projectsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const mediaJsonPath = getProjectMediaJsonPath(entry.name);
        if (fs.pathExistsSync(mediaJsonPath)) {
          try {
            fs.renameSync(mediaJsonPath, mediaJsonPath + backupSuffix);
          } catch {
            // Not critical
          }
        }
      }
    }
  } catch {
    // Not critical
  }

  if (process.env.NODE_ENV !== "test") {
    console.log("[DB] Legacy JSON data imported to SQLite. Backup files preserved with .pre-sqlite-backup suffix.");
  }
}
