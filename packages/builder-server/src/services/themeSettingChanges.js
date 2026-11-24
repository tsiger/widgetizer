import { findThemeSetting, themeSettingValuesEqual } from "@widgetizer/core/themeSettingChanges";
import { sanitizeThemeSettingValue } from "./sanitizationService.js";

/**
 * Merge setting changes into the theme the project holds now. Pure: no IO and no
 * lock, so any route that saves theme settings can call it inside its own write
 * section — read the file, merge, write.
 *
 * Each change is `{ group, id, baseValue?, value? }`; an absent `value` means
 * "use the default" and removes the key. A change whose setting no longer holds
 * the value it started from was overtaken by another save and is a CONFLICT
 * (unless that save already set the value this one wants), and the caller then
 * refuses the whole save, so nothing half-applies. A change for
 * a setting that is gone (or ambiguous) is skipped with a warning and the rest
 * apply. Only the changed settings are sanitized, so a save never reports or
 * rewrites a setting it did not touch. Structure, version and every other key
 * come from `currentTheme`.
 *
 * @param {object} currentTheme - The parsed `theme.json` as stored now.
 * @param {Array<object>} changes - Validated change entries.
 * @returns {{ theme: object, warnings: Array<object>, conflicts: string[] }}
 */
export function mergeThemeSettingChanges(currentTheme, changes) {
  const theme = JSON.parse(JSON.stringify(currentTheme));
  const warnings = [];
  const conflicts = [];

  for (const change of changes) {
    const found = findThemeSetting(theme, change);
    if (!found?.item) {
      warnings.push({ code: found?.ambiguous ? "SETTING_AMBIGUOUS" : "SETTING_REMOVED", id: change.id });
      continue;
    }
    const { item } = found;
    if (!themeSettingValuesEqual(item.value, change.baseValue)) {
      // Changed elsewhere to exactly what this save wants: nothing to settle.
      if (!themeSettingValuesEqual(item.value, change.value)) conflicts.push(change.id);
      continue;
    }
    // The default is used only while the key is absent; sanitizing `undefined`
    // would turn an image or gallery into a concrete value instead.
    if (change.value === undefined) {
      delete item.value;
      continue;
    }
    const result = sanitizeThemeSettingValue(change.value, item);
    item.value = result.value;
    if (result.corrected) warnings.push({ code: "VALUE_CORRECTED", id: item.id, label: item.label || item.id });
  }

  return { theme, warnings, conflicts };
}

/**
 * The theme settings a preview renders: the STORED theme with the editor's
 * unsaved values laid over it. A preview is sent the editor's whole draft, and
 * rendering that as sent would trust everything in it: the setting types (which
 * pick the check a value gets), the group and id that become a CSS variable's
 * name, and settings the theme never had. So the structure always comes from
 * the stored file, and the draft supplies values only.
 *
 * For each stored setting, the draft's setting is found the way a save finds it
 * (`findThemeSetting`):
 * - none (or ambiguous): the stored setting is rendered as it is;
 * - one with no `value`: the value is dropped, so "reset to default" previews
 *   the default;
 * - one whose value equals the stored one, or the stored default when no value
 *   is stored: kept as it is. Like a save, a preview cleans only what changed,
 *   so it shows an untouched value the way the published site does;
 * - any other value: checked against the STORED setting, as a save would.
 * Draft settings the stored file lacks are ignored. Pure: no IO.
 *
 * @param {object} storedTheme - The parsed `theme.json` as stored now.
 * @param {*} draftTheme - The theme settings the editor sent; anything else is no draft.
 * @returns {object} A new theme object to render.
 */
export function previewThemeSettings(storedTheme, draftTheme) {
  const theme = JSON.parse(JSON.stringify(storedTheme));
  const global = theme?.settings?.global;
  if (!global || typeof global !== "object" || Array.isArray(global)) return theme;

  for (const [group, items] of Object.entries(global)) {
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (!item || typeof item !== "object" || typeof item.id !== "string" || !item.id || item.type === "header") continue;
      const drafted = findThemeSetting(draftTheme, { group, id: item.id })?.item;
      if (!drafted) continue;
      if (drafted.value === undefined) {
        delete item.value;
      } else if (item.value === undefined && themeSettingValuesEqual(item.default, drafted.value)) {
        item.value = JSON.parse(JSON.stringify(item.default));
      } else if (!themeSettingValuesEqual(item.value, drafted.value)) {
        item.value = sanitizeThemeSettingValue(drafted.value, item).value;
      }
    }
  }
  return theme;
}

/**
 * Check a PATCH body's shape. Returns the change list, or null when the body is
 * not `{ changes: [...] }` of plain entries with a string `id` and `group`, each
 * `(group, id)` at most once. The same id in two groups is legal.
 */
export function readThemeSettingChanges(body) {
  if (!body || typeof body !== "object" || !Array.isArray(body.changes)) return null;
  const seen = new Set();
  for (const change of body.changes) {
    if (!change || typeof change !== "object" || Array.isArray(change)) return null;
    if (typeof change.id !== "string" || !change.id || typeof change.group !== "string") return null;
    const key = `${change.group}\u0000${change.id}`;
    if (seen.has(key)) return null;
    seen.add(key);
  }
  return body.changes;
}
