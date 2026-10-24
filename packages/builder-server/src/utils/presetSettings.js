import fs from "fs-extra";
import path from "path";

/**
 * The settings a preset gives a project: its preset.json `settings`, or null
 * when it has none. A preset without a preset.json simply has no settings; one
 * that HAS it and cannot be read throws, because reading both as "no settings"
 * gives the project the preset's name and the theme's appearance.
 * @param {string} presetDir - The preset's folder inside a theme source
 * @param {string} presetId - The preset's name, for the error message
 * @returns {Promise<object|null>} Setting values keyed by setting id
 */
export async function readPresetSettings(presetDir, presetId) {
  const presetJsonPath = path.join(presetDir, "preset.json");
  if (!(await fs.pathExists(presetJsonPath))) return null;

  let presetData;
  try {
    presetData = JSON.parse(await fs.readFile(presetJsonPath, "utf8"));
  } catch (error) {
    console.error(`[presetSettings] Could not read ${presetJsonPath}: ${error.message}`);
    throw new Error(`The "${presetId}" preset's settings file could not be read.`);
  }
  if (presetData.settings && Object.keys(presetData.settings).length > 0) {
    return presetData.settings;
  }
  return null;
}

/**
 * Write a preset's settings into a theme.json as those settings' defaults, in
 * place. The preset's look lives in `default`, apart from the owner's own
 * choices in `value` — so a theme update, which takes every default from the
 * new theme, has to apply the preset again to keep that look.
 * @param {object} themeJson - A theme.json; its global settings are changed in place
 * @param {object|null} settings - Setting values keyed by setting id
 */
export function applyPresetSettings(themeJson, settings) {
  if (!settings || !themeJson?.settings?.global) return;
  for (const group of Object.values(themeJson.settings.global)) {
    if (!Array.isArray(group)) continue;
    for (const item of group) {
      if (item.id && settings[item.id] !== undefined) {
        item.default = settings[item.id];
      }
    }
  }
}
