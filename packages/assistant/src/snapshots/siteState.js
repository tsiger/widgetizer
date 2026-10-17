import crypto from "node:crypto";

const CONTENT_ROOTS = ["pages", "menus", "collections"];
const THEME_SETTINGS_KEY = "theme.json";

const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");

// Content folders hold language and type folders (no dot) and files (with an extension).
async function collectKeys(storage, scope, dir, keys) {
  for (const name of await storage.list(scope, dir)) {
    const key = `${dir}/${name}`;
    if (name.includes(".")) keys.push(key);
    else await collectKeys(storage, scope, key, keys);
  }
}

export async function listContentKeys(storage, scope) {
  const keys = [];
  for (const root of CONTENT_ROOTS) await collectKeys(storage, scope, root, keys);
  if (await storage.exists(scope, THEME_SETTINGS_KEY)) keys.push(THEME_SETTINGS_KEY);
  return keys.sort();
}

export async function readContentFiles(storage, scope) {
  const files = new Map();
  for (const key of await listContentKeys(storage, scope)) {
    const bytes = await storage.read(scope, key);
    if (bytes != null) files.set(key, Buffer.from(bytes));
  }
  return files;
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

/** Hash of a site's content files and rows: equal digests mean the same saved site. */
export function contentDigest(files, rows) {
  const hash = crypto.createHash("sha256");
  for (const key of [...files.keys()].sort()) hash.update(`${key}\0${sha256(files.get(key))}\n`);
  hash.update(canonicalJson(rows));
  return hash.digest("hex");
}

/** The content digest plus the changes it can't see (asset bytes, theme files). */
export function siteFingerprint(digest, generations) {
  return sha256(`${digest}\n${canonicalJson(generations)}`);
}
