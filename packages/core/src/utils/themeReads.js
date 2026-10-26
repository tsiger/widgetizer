/**
 * Which site settings a render actually read, so the editor can re-render only
 * what a setting change can affect. A read is recorded as "group.id"; enumerating
 * a group records "group.*" and enumerating the whole `theme` object records "*".
 *
 * A setting a render did not read cannot change its output: a branch not taken
 * this time only becomes reachable when a condition it did read changes, and that
 * change re-renders it.
 */

// Keys the template engine and JavaScript probe on any value; they are not settings.
const IGNORED_KEYS = new Set(["toLiquid", "liquidMethodMissing", "next", "then", "toJSON", "constructor", "valueOf", "toString"]);

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function trackGroup(values, group, reads) {
  const record = (key) => {
    if (typeof key !== "string") return;
    if (IGNORED_KEYS.has(key) && !Object.hasOwn(values, key)) return;
    reads.add(`${group}.${key}`);
  };
  return new Proxy(values, {
    get(target, key, receiver) {
      record(key);
      return Reflect.get(target, key, receiver);
    },
    has(target, key) {
      record(key);
      return Reflect.has(target, key);
    },
    getOwnPropertyDescriptor(target, key) {
      record(key);
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
    ownKeys(target) {
      reads.add(`${group}.*`);
      return Reflect.ownKeys(target);
    },
  });
}

/**
 * Wrap preprocessed theme settings (`{ group: { id: value } }`) so every read lands
 * in `reads`. The settings object itself is left untouched.
 * @param {object} theme
 * @param {Set<string>} reads
 * @returns {object}
 */
export function trackThemeReads(theme, reads) {
  if (!isPlainObject(theme)) return theme;
  const groups = new Map();
  const groupProxy = (key, value) => {
    if (!groups.has(key)) groups.set(key, trackGroup(value, key, reads));
    return groups.get(key);
  };
  return new Proxy(theme, {
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver);
      if (typeof key !== "string" || IGNORED_KEYS.has(key)) return value;
      if (isPlainObject(value)) return groupProxy(key, value);
      reads.add(`${key}.*`);
      return value;
    },
    has(target, key) {
      if (typeof key === "string" && !IGNORED_KEYS.has(key) && !Reflect.has(target, key)) reads.add(`${key}.*`);
      return Reflect.has(target, key);
    },
    getOwnPropertyDescriptor(target, key) {
      const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
      if (!descriptor && typeof key === "string" && !IGNORED_KEYS.has(key)) reads.add(`${key}.*`);
      return descriptor;
    },
    ownKeys(target) {
      reads.add("*");
      return Reflect.ownKeys(target);
    },
  });
}

const effectiveValue = (item) => (item.value !== undefined ? item.value : item.default);

function settingsByPath(theme) {
  const paths = new Map();
  const global = theme?.settings?.global;
  if (!isPlainObject(global)) return paths;
  for (const [group, items] of Object.entries(global)) {
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (isPlainObject(item) && typeof item.id === "string" && item.id && item.type !== "header") {
        paths.set(`${group}\u0000${item.id}`, { group, id: item.id, value: effectiveValue(item) });
      }
    }
  }
  return paths;
}

/**
 * The settings whose rendered value differs between two `theme.json` snapshots:
 * value or default changed, or the setting added or removed.
 * @returns {{ group: string, id: string }[]}
 */
export function changedThemeSettingPaths(before, after) {
  const old = settingsByPath(before);
  const next = settingsByPath(after);
  const changes = [];
  for (const key of new Set([...old.keys(), ...next.keys()])) {
    const a = old.get(key);
    const b = next.get(key);
    if (!a || !b || JSON.stringify(a.value) !== JSON.stringify(b.value)) {
      const { group, id } = a || b;
      changes.push({ group, id });
    }
  }
  return changes;
}

/**
 * Whether recorded reads depend on any changed setting. `reads` missing (a render
 * that was not tracked) depends on everything.
 * @param {string[]|Set<string>|null|undefined} reads
 * @param {{ group: string, id: string }[]} changes
 */
export function readsDependOn(reads, changes) {
  if (!reads) return true;
  const set = reads instanceof Set ? reads : new Set(reads);
  if (set.has("*")) return true;
  return changes.some(({ group, id }) => set.has(`${group}.${id}`) || set.has(`${group}.*`));
}
