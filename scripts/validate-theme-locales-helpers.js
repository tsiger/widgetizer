import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

/** Recursively find all schema.json files under a directory. */
export function findSchemaFiles(dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findSchemaFiles(fullPath));
    } else if (entry.name === "schema.json") {
      results.push(fullPath);
    }
  }
  return results;
}

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
