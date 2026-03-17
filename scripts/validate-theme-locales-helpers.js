/** Flatten a nested object into dot-path keys. */
export function flattenKeys(obj, prefix = "") {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

/** Extract every tTheme: key from an object tree (schemas, theme.json). */
export function extractThemeKeys(obj) {
  const keys = [];
  if (typeof obj === "string" && obj.startsWith("tTheme:")) {
    keys.push(obj.slice(7)); // strip "tTheme:"
  } else if (Array.isArray(obj)) {
    for (const item of obj) keys.push(...extractThemeKeys(item));
  } else if (obj && typeof obj === "object") {
    for (const val of Object.values(obj)) keys.push(...extractThemeKeys(val));
  }
  return keys;
}
