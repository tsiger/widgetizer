/**
 * Theme Update Service
 * Handles applying theme updates to projects safely.
 */

import fs from "fs-extra";
import path from "path";
import { randomUUID } from "crypto";
import { getProjectDir } from "../config.js";
import { getProjectFolderName } from "../utils/projectHelpers.js";
import * as projectRepo from "../db/repositories/projectRepository.js";
import { getThemeSourceDir, readThemeSourceMetadata } from "../controllers/themeController.js";
import { createKeyedSerializer } from "../utils/serializeByKey.js";
import { refreshMediaUsageAfterStructuralChange } from "./mediaUsageService.js";
import { getUpdateStatus } from "../utils/updateStatus.js";
import { processTemplatesRecursive } from "../utils/templateHelpers.js";

/**
 * Updatable paths - these are copied from theme to project during updates.
 * Everything else is protected (pages/, menus/, uploads/).
 */
const UPDATABLE_PATHS = [
  "layout.liquid",
  "assets",
  "widgets",
  "snippets",
  "locales",
  "screenshot.png",
  // collection-types are theme-owned: replaced wholesale
  // from the theme source on update. collections/ (user item data) is protected
  // and never appears here.
  "collection-types",
];

/**
 * Check if a theme update is available for a project.
 * Compares the project's current theme version against the theme source version.
 * @param {string} projectId - The project's UUID
 * @returns {Promise<{hasUpdate: boolean, currentVersion: string, latestVersion: string}>} Update availability status
 * @throws {Error} If project not found
 */
export async function checkForUpdates(projectId) {
  const project = projectRepo.getProjectById(projectId);

  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  const themeName = project.theme;

  // Get the theme's current source version (from latest/ or base theme.json)
  // This is the version that was last built/published, NOT all available versions
  let sourceVersion = null;
  try {
    const { theme } = await readThemeSourceMetadata(themeName);
    sourceVersion = theme.version;
  } catch {
    // Theme doesn't exist or can't be read
  }

  const status = getUpdateStatus(project.themeVersion, sourceVersion);

  return {
    hasUpdate: status.hasUpdate && project.receiveThemeUpdates,
    currentVersion: status.currentVersionLabel,
    latestVersion: status.latestVersionLabel,
  };
}

/**
 * Merge theme.json settings preserving user customizations.
 * Uses the new schema as source of truth for structure while preserving
 * user values for settings that exist in both versions.
 * Settings removed by theme author are dropped; new settings use defaults.
 * @param {object} userThemeJson - User's current theme.json with customized values
 * @param {object} newThemeJson - New theme.json from the theme update
 * @returns {object} Merged theme.json with new structure and preserved user values
 */
export function mergeThemeSettings(userThemeJson, newThemeJson) {
  // Start with the new schema as the base
  const merged = JSON.parse(JSON.stringify(newThemeJson));

  // Merge settings values
  if (userThemeJson.settings && newThemeJson.settings) {
    merged.settings = mergeSettingsObject(userThemeJson.settings, newThemeJson.settings);
  }

  return merged;
}

/**
 * Recursively merge settings objects.
 * Preserves user values for keys that exist in the new schema.
 * @param {object} userSettings - User's settings
 * @param {object} newSettings - New settings from theme
 * @returns {object} - Merged settings
 */
function mergeSettingsObject(userSettings, newSettings) {
  const merged = JSON.parse(JSON.stringify(newSettings));

  // For each key in new settings, check if user has a value
  for (const key of Object.keys(newSettings)) {
    const newValue = newSettings[key];
    const userValue = userSettings[key];

    if (userValue === undefined) {
      // User doesn't have this setting, use new default
      continue;
    }

    if (Array.isArray(newValue)) {
      // This is a settings group (array of setting definitions)
      // Merge individual setting values
      merged[key] = mergeSettingsArray(userValue, newValue);
    } else if (typeof newValue === "object" && newValue !== null) {
      // Nested object, recurse
      merged[key] = mergeSettingsObject(userValue, newValue);
    } else {
      // Primitive value - keep user's value
      merged[key] = userValue;
    }
  }

  return merged;
}

/**
 * Merge settings arrays (preserving user values for matching setting IDs).
 * @param {Array} userArray - User's settings array
 * @param {Array} newArray - New settings array from theme
 * @returns {Array} - Merged array
 */
function mergeSettingsArray(userArray, newArray) {
  if (!Array.isArray(userArray)) {
    return newArray;
  }

  // Create a map of user values by setting ID
  const userValuesById = {};
  for (const item of userArray) {
    if (item && item.id) {
      userValuesById[item.id] = item;
    }
  }

  // Merge each item in the new array
  return newArray.map((newItem) => {
    if (!newItem || !newItem.id) {
      return newItem;
    }

    const userItem = userValuesById[newItem.id];
    if (!userItem) {
      // No user value, use new default
      return newItem;
    }

    // Preserve user's value if they have one. Everything else — including a
    // `default` the new schema removed — comes from the new item alone.
    const merged = { ...newItem };
    if (userItem.value !== undefined) {
      merged.value = userItem.value;
    }

    return merged;
  });
}

// Transient working directories for an update, inside the project so every move
// stays on one filesystem. Both start with a dot, which keeps them out of the
// backup export's file walk.
const STAGE_DIR = ".theme-update-stage";
const BACKUP_DIR = ".theme-update-backup";
// Written before the swap begins and removed once it finishes. It holds the
// plan, because putting the previous state back needs more than the files moved
// aside: an update also ADDS things, and a run that stops halfway has to have
// those removed too. Its presence is what distinguishes a run killed mid-swap
// from one killed just after finishing.
const PLAN_FILE = ".in-progress";

/** Move a path, creating the destination's parent first. */
async function movePath(from, to) {
  await fs.ensureDir(path.dirname(to));
  await fs.move(from, to, { overwrite: true });
}

/**
 * Put the project back the way it was before a swap: remove everything the
 * update introduced, then move back everything it displaced.
 *
 * One function for both callers — the rollback inside a failed run and the
 * recovery of a run that was killed — so the two cannot drift apart.
 * Returns true when the previous state was fully restored.
 */
async function undoSwap({ projectDir, backupDir, plan }) {
  try {
    for (const rel of plan.added ?? []) {
      await fs.remove(path.join(projectDir, rel));
    }
    // A path the update created where the project had none: putting the
    // previous state back means it should not be there at all.
    for (const rel of plan.placedWhereAbsent ?? []) {
      await fs.remove(path.join(projectDir, rel));
    }
    for (const entry of await fs.readdir(backupDir)) {
      if (entry === PLAN_FILE) continue;
      await movePath(path.join(backupDir, entry), path.join(projectDir, entry));
    }
    return true;
  } catch (error) {
    console.error(`[applyThemeUpdate] Could not put the previous theme files back: ${error.message}`);
    return false;
  }
}

/**
 * Finish an update that was interrupted, before starting a new one.
 *
 * A backup with no plan belonged to a run that had already completed its swap,
 * so it is only cleaned up — restoring it would undo a good update.
 */
async function recoverInterruptedUpdate(projectDir) {
  const backupDir = path.join(projectDir, BACKUP_DIR);
  await fs.remove(path.join(projectDir, STAGE_DIR)).catch(() => {});
  if (!(await fs.pathExists(backupDir))) return;

  const planPath = path.join(backupDir, PLAN_FILE);
  if (!(await fs.pathExists(planPath))) {
    // The swap removes the plan as its last act, so a backup without one
    // belonged to a run that finished. Restoring it would undo a good update.
    await fs.remove(backupDir);
    return;
  }

  // The plan is written atomically, so a present one is complete. A present but
  // unreadable one is treated as interrupted anyway: the displaced files are
  // put back, and the run is stopped rather than assumed finished.
  let plan;
  try {
    plan = await fs.readJson(planPath);
  } catch (error) {
    console.error(`[applyThemeUpdate] The interrupted update's plan could not be read: ${error.message}`);
    await undoSwap({ projectDir, backupDir, plan: {} });
    // No claim about what the project now holds: this branch is exactly the one
    // where that is not known. And nothing for the reader to go and inspect —
    // the details are in the log, and the person seeing this is not reading it.
    throw new Error("The theme update could not be completed. Please try again.");
  }

  const restored = await undoSwap({ projectDir, backupDir, plan });
  if (!restored) {
    // Left in place deliberately: the next attempt tries again, and deleting
    // it would throw away the only copy of the files still missing.
    // The undo did not finish, so what the project holds is not known — the one
    // thing this must not do is claim it was left alone.
    throw new Error("The theme update could not be completed. Please try again.");
  }
  await fs.remove(backupDir);
  console.warn("[applyThemeUpdate] Undid an update that was interrupted partway through");
}

/**
 * Apply a theme update to a project directory — the file-level core of an update.
 *
 * All of it, or none of it. The update is built off to the side first, and only
 * once every piece is ready does anything in the project change; a failure
 * during the swap puts back what was displaced and removes what was added.
 * Replacing each path as it is read would be no better than the per-file catch
 * it replaced: `assets` from the new theme beside `widgets` from the old one is
 * a project that renders wrongly rather than one that failed to update.
 *
 * The updatable paths are replaced wholesale, which is how a theme deletes a
 * file — it is absent from the new copy. New menus and new templates are added
 * without overwriting the author's, and theme.json is merged.
 *
 * Callers must hold this project's update lock: the working directories are
 * per project, so two overlapping runs would read each other's as their own.
 *
 * @param {object} params
 * @param {string} params.themeSourceDir - Directory holding the theme source to apply
 * @param {string} params.projectDir - The project's content directory
 * @returns {Promise<{newVersion: string|null}>} The version from the theme source's theme.json, or null if unreadable
 * @throws {Error} When the update could not be applied; the project is unchanged
 */
export async function applyThemeUpdateToDir({ themeSourceDir, projectDir }) {
  const stageDir = path.join(projectDir, STAGE_DIR);
  const backupDir = path.join(projectDir, BACKUP_DIR);

  await recoverInterruptedUpdate(projectDir);

  // ---- Prepare. Reads the theme, writes only into the staging directory. A
  // failure here has touched nothing the project uses. ----
  const staged = [];
  const additions = [];
  let mergedThemeJson = null;
  const newThemeJsonPath = path.join(themeSourceDir, "theme.json");

  try {
    await fs.ensureDir(stageDir);

    for (const itemPath of UPDATABLE_PATHS) {
      const sourcePath = path.join(themeSourceDir, itemPath);
      if (!(await fs.pathExists(sourcePath))) continue; // not in this theme
      await fs.copy(sourcePath, path.join(stageDir, itemPath));
      staged.push(itemPath);
    }

    const themeMenusDir = path.join(themeSourceDir, "menus");
    if (await fs.pathExists(themeMenusDir)) {
      for (const menuFile of await fs.readdir(themeMenusDir)) {
        if (!menuFile.endsWith(".json")) continue;
        const rel = path.join("menus", menuFile);
        if (await fs.pathExists(path.join(projectDir, rel))) continue; // the author's, left alone
        const menuContent = await fs.readJson(path.join(themeMenusDir, menuFile));
        const now = new Date().toISOString();
        additions.push({
          rel,
          content: {
            ...menuContent,
            id: path.parse(menuFile).name,
            uuid: menuContent.uuid || randomUUID(),
            created: now,
            updated: now,
          },
        });
      }
    }

    await processTemplatesRecursive(
      path.join(themeSourceDir, "templates"),
      path.join(projectDir, "pages"),
      async (template, slug, targetPath) => {
        if (await fs.pathExists(targetPath)) return; // the author's page
        const now = new Date().toISOString();
        additions.push({
          rel: path.relative(projectDir, targetPath),
          content: { ...template, id: slug, slug, created: now, updated: now },
        });
      },
    );

    mergedThemeJson = mergeThemeSettings(
      await fs.readJson(path.join(projectDir, "theme.json")),
      await fs.readJson(newThemeJsonPath),
    );
  } catch (error) {
    await fs.remove(stageDir).catch(() => {});
    console.error(`[applyThemeUpdate] Could not prepare the update: ${error.message}`);
    throw new Error("The update could not be prepared, so nothing in the project was changed.");
  }

  // ---- Swap. The plan is written first and in full, so a run that dies at any
  // point after this leaves behind everything needed to undo it. ----
  const plan = {
    added: additions.map((addition) => addition.rel),
    placedWhereAbsent: [],
  };
  for (const itemPath of staged) {
    if (!(await fs.pathExists(path.join(projectDir, itemPath)))) plan.placedWhereAbsent.push(itemPath);
  }

  let swapped = false;
  try {
    await fs.ensureDir(backupDir);
    // Written aside and renamed into place: a plan truncated by a crash would
    // be a recovery that cannot tell what it is recovering.
    const planTmp = path.join(backupDir, `${PLAN_FILE}.tmp`);
    await fs.writeJson(planTmp, plan);
    await fs.move(planTmp, path.join(backupDir, PLAN_FILE), { overwrite: true });

    for (const itemPath of staged) {
      const target = path.join(projectDir, itemPath);
      if (await fs.pathExists(target)) {
        await movePath(target, path.join(backupDir, itemPath));
      }
      await movePath(path.join(stageDir, itemPath), target);
    }

    const projectThemeJsonPath = path.join(projectDir, "theme.json");
    await movePath(projectThemeJsonPath, path.join(backupDir, "theme.json"));
    await fs.writeJson(projectThemeJsonPath, mergedThemeJson, { spaces: 2 });

    for (const { rel, content } of additions) {
      await fs.outputJson(path.join(projectDir, rel), content, { spaces: 2 });
    }

    // Last: from here on the backup is spare, and a crash must not undo this.
    await fs.remove(path.join(backupDir, PLAN_FILE));
    swapped = true;
  } catch (error) {
    console.error(`[applyThemeUpdate] Could not apply the update: ${error.message}`);
    const restored = await undoSwap({ projectDir, backupDir, plan });
    await fs.remove(stageDir).catch(() => {});
    if (!restored) {
      // The backup and its plan stay on disk: they are the only copy of what is
      // now missing, and the next attempt starts by trying the undo again.
      throw new Error("The theme update could not be completed. Please try again.");
    }
    await fs.remove(backupDir).catch(() => {});
    throw new Error("The update could not be applied, so the project was left as it was.");
  }

  if (swapped) {
    await fs.remove(stageDir).catch(() => {});
    await fs.remove(backupDir).catch(() => {});
  }

  let newVersion = null;
  try {
    newVersion = (await fs.readJson(newThemeJsonPath)).version ?? null;
  } catch {
    // Theme source theme.json missing or unreadable — caller decides what to do
  }

  return { newVersion };
}

/**
 * Apply a theme update to a project.
 * Copies updatable theme files (layout, assets, widgets, snippets), adds new menus
 * and templates without overwriting existing ones, merges theme.json settings,
 * and updates project metadata.
 * @param {string} projectId - The project's UUID
 * @returns {Promise<{success: boolean, previousVersion: string, newVersion: string, message?: string}>} Update result
 * @throws {Error} If project not found
 */
// One update at a time per project. The staging and backup directories are
// named per project, so two overlapping runs would each read the other's as
// their own — the second would take the first's backup for an interrupted
// update and undo work that had just succeeded. Recovery, the swap and the
// version write all have to be inside this.
const serializeThemeUpdates = createKeyedSerializer();

export async function applyThemeUpdate(projectId) {
  return serializeThemeUpdates(projectId, () => applyThemeUpdateExclusively(projectId));
}

async function applyThemeUpdateExclusively(projectId) {
  const project = projectRepo.getProjectById(projectId);

  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  const themeName = project.theme;
  const previousVersion = project.themeVersion;

  // Check if update is available
  const updateStatus = await checkForUpdates(projectId);
  if (!updateStatus.hasUpdate) {
    return {
      success: false,
      message: "No update available",
      previousVersion,
      newVersion: previousVersion,
    };
  }

  const projectFolderName = await getProjectFolderName(projectId);
  const projectDir = getProjectDir(projectFolderName);

  // Get theme source directory (latest/ if exists, otherwise root)
  const themeSourceDir = await getThemeSourceDir(themeName);

  console.log(
    `[applyThemeUpdate] Updating project ${projectId} from ${previousVersion} to ${updateStatus.latestVersion}`,
  );

  // The file-level update is all-or-nothing and throws when it could not be
  // applied, having left the project as it was. The version is recorded only
  // after it returns, so a failed update stays available to retry rather than
  // reading as one that already happened.
  //
  // Deferred: the row write below is not covered by that rollback. If it fails,
  // the project holds the new theme files while still recording the old
  // version, and the next update re-applies the same files over themselves —
  // wasteful but not damaging, because the updatable paths are replaced
  // wholesale from the theme either way. Rolling the files back for it would
  // mean holding the backup across a database write, which is more machinery
  // than the outcome warrants.
  await applyThemeUpdateToDir({ themeSourceDir, projectDir });

  // 4. Update project metadata
  projectRepo.updateProject(projectId, {
    themeVersion: updateStatus.latestVersion,
    lastThemeUpdateAt: new Date().toISOString(),
    lastThemeUpdateVersion: updateStatus.latestVersion,
    updated: new Date().toISOString(),
  });

  await refreshMediaUsageAfterStructuralChange(projectId, "theme update apply");

  console.log(`[applyThemeUpdate] Successfully updated project ${projectId} to version ${updateStatus.latestVersion}`);

  return {
    success: true,
    previousVersion,
    newVersion: updateStatus.latestVersion,
  };
}

/**
 * Toggle the receiveThemeUpdates flag for a project.
 * When disabled, the project won't show update notifications.
 * @param {string} projectId - The project's UUID
 * @param {boolean} enabled - Whether to enable theme update notifications
 * @returns {Promise<{success: boolean, receiveThemeUpdates: boolean}>} Result with new flag value
 * @throws {Error} If project not found
 */
export async function toggleThemeUpdates(projectId, enabled) {
  const project = projectRepo.getProjectById(projectId);

  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  projectRepo.updateProject(projectId, {
    receiveThemeUpdates: enabled,
    updated: new Date().toISOString(),
  });

  return {
    success: true,
    receiveThemeUpdates: enabled,
  };
}
