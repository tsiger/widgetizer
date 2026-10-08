/**
 * Theme settings travel as CHANGES, not as the whole `theme.json`: the editor
 * sends only the settings it changed, each with the value it started from, and
 * the server applies them onto the file it holds now. A screen holding an older
 * copy of the theme (loaded before a theme update, or before another screen
 * saved) can then never put back structure, a version or values it did not
 * change. The client and the server share these rules so they cannot disagree
 * about which setting a change addresses or whether two values are the same.
 *
 * A setting "using its default" has no `value` key at all — rendering falls back
 * to the default only when `value` is undefined — so an absent value is a state
 * of its own here, never coerced to null.
 */

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// Order-insensitive for object keys, ordered for arrays: two link or image
// objects built in a different key order are the same value.
function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  if (!isPlainObject(a) || !isPlainObject(b)) return false;
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((key) => Object.prototype.hasOwnProperty.call(b, key) && deepEqual(a[key], b[key]));
}

/**
 * Whether two setting values are the same, as they would be once stored.
 * `undefined` means "no value key" and equals only itself.
 */
export function themeSettingValuesEqual(a, b) {
  if (a === undefined || b === undefined) return a === b;
  return deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
}

const isSetting = (item) => isPlainObject(item) && typeof item.id === "string" && item.id && item.type !== "header";

/**
 * Find the setting a change addresses: the item with this id in `group` first,
 * otherwise the ONLY item with this id anywhere (a theme update may move a
 * setting to another group). The same id in several other groups is ambiguous
 * — the theme validator only warns about duplicates, so it can happen.
 *
 * @returns {{ item: object, group: string } | { ambiguous: true } | null}
 */
export function findThemeSetting(theme, { group, id }) {
  const global = theme?.settings?.global;
  if (!isPlainObject(global)) return null;

  if (typeof group === "string" && Array.isArray(global[group])) {
    const item = global[group].find((entry) => isSetting(entry) && entry.id === id);
    if (item) return { item, group };
  }

  const matches = [];
  for (const [groupKey, items] of Object.entries(global)) {
    if (!Array.isArray(items)) continue;
    for (const entry of items) {
      if (isSetting(entry) && entry.id === id) matches.push({ item: entry, group: groupKey });
    }
  }
  if (matches.length === 1) return matches[0];
  return matches.length > 1 ? { ambiguous: true } : null;
}

/**
 * The settings whose value differs between `base` and `draft`, as changes
 * `{ group, id, baseValue, value }`. An absent value stays `undefined`, which
 * JSON drops on the wire — the receiver reads a missing key the same way.
 * A draft setting the base does not have is not a change: there is no value
 * it started from.
 */
export function diffThemeSettings(base, draft) {
  const changes = [];
  const global = draft?.settings?.global;
  if (!isPlainObject(global)) return changes;

  for (const [group, items] of Object.entries(global)) {
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (!isSetting(item)) continue;
      const found = findThemeSetting(base, { group, id: item.id });
      if (!found?.item) continue;
      if (!themeSettingValuesEqual(found.item.value, item.value)) {
        changes.push({ group, id: item.id, baseValue: found.item.value, value: item.value });
      }
    }
  }
  return changes;
}

/**
 * Apply changes onto a copy of `theme`: set each value, or remove the key when
 * the change carries none. Changes that address no setting, or an ambiguous one,
 * are skipped and reported. Does not compare starting values or sanitize; the
 * server does both before it writes.
 *
 * @returns {{ theme: object, skipped: Array<{ id: string, code: string }> }}
 */
export function applyThemeSettingChanges(theme, changes) {
  const next = JSON.parse(JSON.stringify(theme));
  const skipped = [];
  for (const change of changes) {
    const found = findThemeSetting(next, change);
    if (!found?.item) {
      skipped.push({ id: change.id, code: found?.ambiguous ? "SETTING_AMBIGUOUS" : "SETTING_REMOVED" });
      continue;
    }
    if (change.value === undefined) delete found.item.value;
    else found.item.value = JSON.parse(JSON.stringify(change.value));
  }
  return { theme: next, skipped };
}
