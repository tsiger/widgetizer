/**
 * collectionService — reads, validates, and normalizes collection-type schemas
 * (Collections spec Sections 1 and 4) and serves collection items.
 *
 * Phase 1 scope: schema validation/normalization and listing.
 */

import fs from "fs-extra";
import path from "path";

import {
  getProjectCollectionTypesDir,
  getProjectCollectionSchemaPath,
  getProjectCollectionDir,
  getProjectCollectionItemPath,
  getProjectCollectionOrderPath,
  getProjectCollectionTemplatePath,
} from "../config.js";
import { randomUUID } from "node:crypto";

import { isSupportedSettingType } from "../../src/components/settings/supportedSettingTypes.js";
import { isAtomicTmpFile, writeJsonAtomic } from "../utils/atomicFs.js";
import { sanitizeSlug, generateUniqueSlug } from "../utils/slugHelpers.js";
import { prefixInternalHref } from "../utils/linkPrefixer.js";
import { sanitizeCollectionItemData, stripHtmlTags } from "./sanitizationService.js";
import { resolveMenuSettings } from "./menuResolver.js";

const SLUG_RE = /^[a-z0-9-]+$/;
const ALLOWED_SORTS = ["manual", "created_desc", "created_asc", "title_asc", "title_desc"];
const RESERVED_SLUG_PREFIXES = new Set(["assets"]);
// v1 constructs that must be rejected, not silently ignored (Section 1).
const DISALLOWED_SETTING_KEYS = ["multiple", "repeater", "blocks"];

/**
 * Validate and normalize a single collection-type schema (Section 1 rules).
 * Pure function — no filesystem.
 *
 * @param {object} schema - parsed schema.json contents
 * @param {string} folderName - the collection-types/<folder> name on disk
 * @returns {{ valid: boolean, errors: string[], normalized: object|null }}
 */
export function validateCollectionSchema(schema, folderName) {
  const errors = [];

  if (!schema || typeof schema !== "object") {
    return { valid: false, errors: ["Schema must be an object."], normalized: null };
  }

  // --- type: pattern + folder-name match ---
  if (typeof schema.type !== "string" || !SLUG_RE.test(schema.type)) {
    errors.push("`type` is required and must match ^[a-z0-9-]+$.");
  } else if (schema.type !== folderName) {
    errors.push(`\`type\` "${schema.type}" must match its folder name "${folderName}".`);
  }

  // --- schema-level `blocks` is not allowed in v1 ---
  if ("blocks" in schema) {
    errors.push("Schema-level `blocks` is not supported in v1.");
  }

  // --- settings array + per-setting checks ---
  let titleSettings = [];
  if (!Array.isArray(schema.settings)) {
    errors.push("`settings` must be an array.");
  } else {
    schema.settings.forEach((setting, index) => {
      const where = `settings[${index}]`;
      if (!setting || typeof setting !== "object") {
        errors.push(`${where} must be an object.`);
        return;
      }
      if (typeof setting.id !== "string" || !setting.id) {
        errors.push(`${where} is missing a string \`id\`.`);
      }
      if (typeof setting.type !== "string" || !isSupportedSettingType(setting.type)) {
        errors.push(`${where} uses unsupported setting type "${setting.type}".`);
      }
      for (const key of DISALLOWED_SETTING_KEYS) {
        if (key in setting) {
          errors.push(`${where} (id "${setting.id}") uses \`${key}\`, which is invalid in v1.`);
        }
      }
      if (setting.usedAsTitle === true && setting.type !== "header") {
        titleSettings.push(setting);
      }
    });
  }

  // --- usedAsTitle: exactly one, must be a text setting ---
  if (titleSettings.length !== 1) {
    errors.push(
      `Exactly one non-header setting must declare \`usedAsTitle: true\` (found ${titleSettings.length}).`,
    );
  } else if (titleSettings[0].type !== "text") {
    errors.push("`usedAsTitle` must be on a `text` setting.");
  }

  // --- defaultSort ---
  if (schema.defaultSort !== undefined && !ALLOWED_SORTS.includes(schema.defaultSort)) {
    errors.push(`\`defaultSort\` must be one of: ${ALLOWED_SORTS.join(", ")}.`);
  }

  // --- slugPrefix (effective = explicit or type) ---
  const slugPrefix = schema.slugPrefix ?? schema.type;
  if (schema.hasItemPages === true) {
    if (typeof slugPrefix !== "string" || !SLUG_RE.test(slugPrefix)) {
      errors.push("`slugPrefix` must match ^[a-z0-9-]+$ when `hasItemPages` is true.");
    } else if (RESERVED_SLUG_PREFIXES.has(slugPrefix)) {
      errors.push(`\`slugPrefix\` "${slugPrefix}" is reserved and cannot be used.`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, normalized: null };
  }

  const normalized = {
    ...schema,
    slugPrefix,
    defaultSort: schema.defaultSort ?? "manual",
  };
  return { valid: true, errors: [], normalized };
}

/**
 * Read, validate, and normalize all collection-type schemas for a project from
 * its copied `collection-types/` directory.
 *
 * Invalid schemas are **skipped** (logged), not thrown — a single broken schema
 * must not break the whole sidebar/API (Section 1). Collections that share a
 * `slugPrefix` are all skipped, since no winner can be picked deterministically.
 *
 * @param {string} projectFolderName
 * @returns {Promise<object[]>} normalized valid schemas
 */
export async function listCollectionSchemas(projectFolderName) {
  const typesDir = getProjectCollectionTypesDir(projectFolderName);

  let entries;
  try {
    entries = await fs.readdir(typesDir, { withFileTypes: true });
  } catch (err) {
    if (err.code === "ENOENT") return []; // no collection-types/ dir — fine
    throw err;
  }

  const folderNames = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  const valid = [];
  for (const folderName of folderNames) {
    const schemaPath = getProjectCollectionSchemaPath(projectFolderName, folderName);
    let raw;
    try {
      raw = await fs.readJSON(schemaPath);
    } catch (err) {
      console.warn(
        `[collections] Skipping "${folderName}": cannot read schema.json (${err.message}).`,
      );
      continue;
    }

    const { valid: ok, errors, normalized } = validateCollectionSchema(raw, folderName);
    if (!ok) {
      console.warn(
        `[collections] Skipping invalid schema "${folderName}": ${errors.join("; ")}`,
      );
      continue;
    }
    valid.push(normalized);
  }

  // Cross-collection slugPrefix uniqueness (Section 1).
  const prefixCounts = new Map();
  for (const schema of valid) {
    prefixCounts.set(schema.slugPrefix, (prefixCounts.get(schema.slugPrefix) ?? 0) + 1);
  }

  const result = [];
  for (const schema of valid) {
    if (prefixCounts.get(schema.slugPrefix) > 1) {
      console.warn(
        `[collections] Skipping "${schema.type}": slugPrefix "${schema.slugPrefix}" is shared by multiple collections.`,
      );
      continue;
    }
    result.push(schema);
  }

  return result;
}

/**
 * Validate every collection-type schema in a theme SOURCE directory, for theme
 * upload (Section 5 "Theme Upload Validation"). Unlike `listCollectionSchemas`,
 * this **rejects** (collects errors) rather than skipping — the upload should
 * fail loudly so the theme author fixes it.
 *
 * Also enforces the `BLOCKER-1` resolution: a preset may not ship a
 * `collection-types/` folder (collection schemas are theme-only).
 *
 * @param {string} themeSourceDir - root of the theme being uploaded
 * @returns {Promise<{ valid: boolean, errors: string[] }>}
 */
export async function validateThemeCollectionSchemas(themeSourceDir) {
  const errors = [];

  const typesDir = path.join(themeSourceDir, "collection-types");
  let entries = [];
  try {
    entries = await fs.readdir(typesDir, { withFileTypes: true });
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
  const folderNames = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  const prefixOwners = new Map(); // effective slugPrefix -> [folderName...]
  for (const folderName of folderNames) {
    const schemaPath = path.join(typesDir, folderName, "schema.json");
    let raw;
    try {
      raw = await fs.readJSON(schemaPath);
    } catch (err) {
      errors.push(`Collection "${folderName}": cannot read schema.json (${err.message}).`);
      continue;
    }

    const { valid, errors: schemaErrors } = validateCollectionSchema(raw, folderName);
    if (!valid) {
      for (const e of schemaErrors) errors.push(`Collection "${folderName}": ${e}`);
    }

    const effectivePrefix = (raw && (raw.slugPrefix ?? raw.type)) || folderName;
    if (!prefixOwners.has(effectivePrefix)) prefixOwners.set(effectivePrefix, []);
    prefixOwners.get(effectivePrefix).push(folderName);
  }

  for (const [prefix, owners] of prefixOwners) {
    if (owners.length > 1) {
      errors.push(`Duplicate slugPrefix "${prefix}" shared by collections: ${owners.join(", ")}.`);
    }
  }

  // BLOCKER-1 resolution: presets are item-data only; reject preset-owned schemas.
  const presetsDir = path.join(themeSourceDir, "presets");
  let presetEntries = [];
  try {
    presetEntries = await fs.readdir(presetsDir, { withFileTypes: true });
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
  for (const preset of presetEntries.filter((e) => e.isDirectory())) {
    const presetCollectionTypes = path.join(presetsDir, preset.name, "collection-types");
    if (await fs.pathExists(presetCollectionTypes)) {
      errors.push(
        `Preset "${preset.name}" contains a collection-types/ folder, which is not allowed — collection schemas are theme-only (presets may seed collections/ item data only).`,
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// Read-side item storage (Phase 3 — spec Sections 2, 4, 15)
// ============================================================================

const HEADER_TYPE = "header";

/** Empty placeholder value for a setting type when no schema default exists. */
function emptyDefaultForType(type) {
  switch (type) {
    case "checkbox":
      return false;
    case "number":
    case "range":
      return 0;
    case "link":
      return { href: "", target: "_self" };
    default:
      return "";
  }
}

/** Whether a required field's value should count as missing (flags invalid). */
function isMissingValue(value, type) {
  if (type === "link") {
    return !value || typeof value.href !== "string" || value.href.trim() === "";
  }
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  return false; // numbers and booleans count as present (0 / false are valid)
}

/**
 * Read and validate a single collection schema from the project copy.
 * @returns {Promise<object|null>} normalized schema, or null if missing/invalid
 */
export async function getCollectionSchema(projectFolderName, collectionType) {
  const schemaPath = getProjectCollectionSchemaPath(projectFolderName, collectionType);
  let raw;
  try {
    raw = await fs.readJSON(schemaPath);
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
  const { valid, normalized } = validateCollectionSchema(raw, collectionType);
  return valid ? normalized : null;
}

/**
 * Normalize a raw item against a schema (Section 4). Pure — does not mutate the
 * input and does not touch disk. Unknown fields are separated into an in-memory
 * `_archived` map (BLOCKER-2: they remain on disk; this only hides them from the
 * form/render). Missing fields are filled; required-but-empty fields flag invalid.
 *
 * @param {object} rawItem - parsed item JSON
 * @param {object} schema - normalized schema
 * @returns {object} normalized item with title/invalid/validationErrors/_archived
 */
/**
 * Shape a raw SEO object (from form input or disk) into the page-shaped `seo`
 * object collection item pages use — the SAME field set as page SEO (Finding
 * #12), so item pages feed the shared `SeoTag` exactly like pages. Only the five
 * user-edited fields are authored (description, og_title, og_image,
 * canonical_url, robots); `og_type`/`twitter_card` are non-UI defaults (items
 * are content, so `og_type` defaults to "article"). With `sanitize`, the
 * author-editable text fields are stripped of HTML — parity with the page SEO
 * save path (pageController runs the same `stripHtmlTags`).
 *
 * @param {object} rawSeo - partial/raw seo object (may be undefined)
 * @param {{ sanitize?: boolean }} [opts]
 * @returns {object} full page-shaped seo object with defaults applied
 */
export function shapeItemSeo(rawSeo, { sanitize = false } = {}) {
  const seo = rawSeo && typeof rawSeo === "object" ? rawSeo : {};
  const text = (v) => {
    const s = typeof v === "string" ? v : "";
    return sanitize ? stripHtmlTags(s) : s;
  };
  const str = (v, fallback) => (typeof v === "string" && v ? v : fallback);
  return {
    description: text(seo.description),
    og_title: text(seo.og_title),
    og_image: typeof seo.og_image === "string" ? seo.og_image : "",
    og_type: str(seo.og_type, "article"),
    twitter_card: str(seo.twitter_card, "summary"),
    canonical_url: text(seo.canonical_url),
    robots: str(seo.robots, "index,follow"),
  };
}

export function normalizeCollectionItem(rawItem, schema) {
  const fieldSettings = (schema.settings || []).filter((s) => s.type !== HEADER_TYPE);
  const knownIds = new Set(fieldSettings.map((s) => s.id));
  const rawSettings = (rawItem && rawItem.settings) || {};

  const settings = {};
  const validationErrors = [];
  for (const setting of fieldSettings) {
    const has = Object.prototype.hasOwnProperty.call(rawSettings, setting.id);
    const value = has
      ? rawSettings[setting.id]
      : setting.default !== undefined
        ? setting.default
        : emptyDefaultForType(setting.type);
    settings[setting.id] = value;
    if (setting.required && isMissingValue(value, setting.type)) {
      validationErrors.push({ fieldId: setting.id, reason: "required field is empty" });
    }
  }

  // BLOCKER-2: keep values for fields no longer in the schema, in memory only.
  const _archived = {};
  for (const [key, value] of Object.entries(rawSettings)) {
    if (!knownIds.has(key)) _archived[key] = value;
  }

  const titleSetting = fieldSettings.find((s) => s.usedAsTitle);
  const title = (titleSetting && settings[titleSetting.id]) || rawItem.slug || rawItem.id || "";

  return {
    id: rawItem.id ?? rawItem.slug,
    uuid: rawItem.uuid,
    slug: rawItem.slug ?? rawItem.id,
    schemaVersion: schema.schemaVersion,
    created: rawItem.created,
    updated: rawItem.updated,
    // Item-page SEO is a page-shaped object (Finding #12), surfaced only for
    // collections that render item pages.
    ...(schema.hasItemPages ? { seo: shapeItemSeo(rawItem?.seo) } : {}),
    settings,
    _archived,
    title,
    invalid: validationErrors.length > 0,
    validationErrors,
  };
}

/** Pick the entry with the newer `updated` (lexical filename tie-break). */
function pickNewerItemFile(a, b) {
  const ta = Date.parse(a.raw?.updated) || 0;
  const tb = Date.parse(b.raw?.updated) || 0;
  if (ta !== tb) return ta > tb ? a : b;
  return a.name > b.name ? a : b;
}

const byCreatedDesc = (a, b) => (Date.parse(b.created) || 0) - (Date.parse(a.created) || 0);

async function applyManualOrder(items, projectFolderName, collectionType) {
  const orderPath = getProjectCollectionOrderPath(projectFolderName, collectionType);
  let order = [];
  try {
    const data = await fs.readJSON(orderPath);
    if (Array.isArray(data?.order)) order = data.order;
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }

  const bySlug = new Map(items.map((i) => [i.slug, i]));
  const used = new Set();
  const ordered = [];
  for (const slug of order) {
    const item = bySlug.get(slug);
    if (item) {
      ordered.push(item); // stale slugs (no matching item) are ignored on read
      used.add(slug);
    }
  }
  const remaining = items.filter((i) => !used.has(i.slug)).sort(byCreatedDesc);
  return [...ordered, ...remaining];
}

async function sortItems(items, sort, projectFolderName, collectionType) {
  switch (sort) {
    case "manual":
      return applyManualOrder(items, projectFolderName, collectionType);
    case "created_asc":
      return items.sort((a, b) => (Date.parse(a.created) || 0) - (Date.parse(b.created) || 0));
    case "title_asc":
      return items.sort((a, b) => String(a.title).localeCompare(String(b.title)));
    case "title_desc":
      return items.sort((a, b) => String(b.title).localeCompare(String(a.title)));
    case "created_desc":
    default:
      return items.sort(byCreatedDesc);
  }
}

/**
 * List normalized items for a collection (Section 2/4). Skips `_order.json` and
 * orphan `*.tmp` files, recovers from duplicate-uuid rename crashes (newer
 * `updated` wins; loser excluded but NOT deleted), then sorts/limits/offsets.
 *
 * @param {string} projectFolderName
 * @param {string} collectionType
 * @param {{ sort?: string, limit?: number, offset?: number }} [options]
 * @returns {Promise<object[]>}
 */
export async function listCollectionItems(projectFolderName, collectionType, options = {}) {
  const schema = await getCollectionSchema(projectFolderName, collectionType);
  if (!schema) return [];

  const dir = getProjectCollectionDir(projectFolderName, collectionType);
  let names;
  try {
    names = await fs.readdir(dir);
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }

  const itemFileNames = names.filter(
    (n) => n.endsWith(".json") && n !== "_order.json" && !isAtomicTmpFile(n),
  );

  const rawEntries = [];
  for (const name of itemFileNames) {
    try {
      const raw = await fs.readJSON(path.join(dir, name));
      rawEntries.push({ name, raw });
    } catch (err) {
      console.warn(
        `[collections] Skipping unreadable item "${collectionType}/${name}": ${err.message}`,
      );
    }
  }

  // Duplicate-uuid recovery (rename crash window) — keep the newer file.
  const byUuid = new Map();
  for (const entry of rawEntries) {
    const uuid = entry.raw?.uuid;
    if (!uuid) {
      byUuid.set(Symbol("no-uuid"), entry); // items without a uuid are always kept
      continue;
    }
    const existing = byUuid.get(uuid);
    if (!existing) {
      byUuid.set(uuid, entry);
      continue;
    }
    const winner = pickNewerItemFile(existing, entry);
    const loser = winner === entry ? existing : entry;
    console.warn(
      `[collections] Duplicate uuid "${uuid}" in "${collectionType}": keeping "${winner.name}", ignoring "${loser.name}" (open and save to clean up).`,
    );
    byUuid.set(uuid, winner);
  }

  let items = [...byUuid.values()].map((e) => normalizeCollectionItem(e.raw, schema));

  const sort = options.sort ?? schema.defaultSort ?? "manual";
  items = await sortItems(items, sort, projectFolderName, collectionType);

  const offset = options.offset ?? 0;
  if (offset) items = items.slice(offset);
  if (options.limit != null) items = items.slice(0, options.limit);
  return items;
}

/**
 * Read the raw on-disk item file (no normalization), preserving any orphaned
 * out-of-schema settings. Used by the update path so BLOCKER-2 orphan
 * preservation works. Returns null if the file does not exist.
 */
export async function readRawCollectionItem(projectFolderName, collectionType, itemSlug) {
  const itemPath = getProjectCollectionItemPath(projectFolderName, collectionType, itemSlug);
  try {
    return await fs.readJSON(itemPath);
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

/**
 * Read and normalize a single item by slug. Returns null if the collection or
 * item file does not exist.
 */
export async function readCollectionItem(projectFolderName, collectionType, itemSlug) {
  const schema = await getCollectionSchema(projectFolderName, collectionType);
  if (!schema) return null;
  const itemPath = getProjectCollectionItemPath(projectFolderName, collectionType, itemSlug);
  let raw;
  try {
    raw = await fs.readJSON(itemPath);
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
  return normalizeCollectionItem(raw, schema);
}

/**
 * Load a collection's `template.liquid` from the project copy (Phase 2 export).
 * @returns {Promise<string|null>} template contents, or null if absent
 */
export async function loadCollectionTemplate(projectFolderName, collectionType) {
  const tplPath = getProjectCollectionTemplatePath(projectFolderName, collectionType);
  try {
    return await fs.readFile(tplPath, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

// ============================================================================
// Write-side item storage (Phase 4 — spec Sections 10, 15)
// ============================================================================

/** Slug already taken by a different item — controller surfaces as 409. */
export class CollectionSlugConflictError extends Error {
  constructor(slug) {
    super(`Slug "${slug}" already exists`);
    this.name = "CollectionSlugConflictError";
    this.code = "SLUG_CONFLICT";
    this.conflictingSlug = slug;
  }
}

/** Required-field (or slug) validation failure — controller surfaces as 400. */
export class CollectionValidationError extends Error {
  constructor(validationErrors) {
    super("Collection item validation failed");
    this.name = "CollectionValidationError";
    this.code = "VALIDATION";
    this.validationErrors = validationErrors;
  }
}

function nowIso() {
  return new Date(Date.now()).toISOString();
}

/** Strictly-monotonic `updated`: greater than the file being replaced even under
 *  backward clock adjustments or future-dated imports (spec Section 15). */
function nextUpdatedIso(previousUpdated) {
  const prevMs = previousUpdated ? Date.parse(previousUpdated) : 0;
  const base = Number.isFinite(prevMs) ? prevMs : 0;
  return new Date(Math.max(Date.now(), base + 1)).toISOString();
}

/**
 * Build a fully-formed item record from caller input (Section 10). Pure (aside
 * from uuid/time generation). Preserves `uuid`/`created` on update, generates
 * them on create, derives/sanitizes the slug, applies a monotonic `updated`,
 * fills schema fields, preserves orphaned settings (BLOCKER-2), and enforces
 * required fields.
 *
 * @returns {{ item: object, previousSlug: string|null }}
 * @throws {CollectionValidationError}
 */
export function buildCollectionItemData(schema, input, existingItem = null) {
  const fieldSettings = (schema.settings || []).filter((s) => s.type !== HEADER_TYPE);
  const knownIds = new Set(fieldSettings.map((s) => s.id));
  const inputSettings = (input && input.settings) || {};

  const titleSetting = fieldSettings.find((s) => s.usedAsTitle);
  const titleValue = titleSetting ? inputSettings[titleSetting.id] : "";
  const rawSlug = input && input.slug != null && input.slug !== "" ? input.slug : titleValue;
  const slug = sanitizeSlug(rawSlug, "item");
  if (!SLUG_RE.test(slug)) {
    throw new CollectionValidationError([{ fieldId: "slug", reason: "invalid slug" }]);
  }

  const settings = {};
  const validationErrors = [];
  for (const s of fieldSettings) {
    let value;
    if (Object.prototype.hasOwnProperty.call(inputSettings, s.id)) {
      value = inputSettings[s.id];
    } else if (
      existingItem &&
      existingItem.settings &&
      Object.prototype.hasOwnProperty.call(existingItem.settings, s.id)
    ) {
      value = existingItem.settings[s.id];
    } else {
      value = s.default !== undefined ? s.default : emptyDefaultForType(s.type);
    }
    settings[s.id] = value;
    if (s.required && isMissingValue(value, s.type)) {
      validationErrors.push({ fieldId: s.id, reason: "required field is empty" });
    }
  }

  // BLOCKER-2: carry forward orphaned on-disk settings the schema dropped and the
  // caller didn't resubmit, so an ordinary save never silently loses them.
  if (existingItem && existingItem.settings) {
    for (const [key, value] of Object.entries(existingItem.settings)) {
      if (!knownIds.has(key) && !Object.prototype.hasOwnProperty.call(inputSettings, key)) {
        settings[key] = value;
      }
    }
  }

  if (validationErrors.length > 0) {
    throw new CollectionValidationError(validationErrors);
  }

  // A page-shaped seo object lives top-level (parity with pages, Finding #12),
  // sanitized like page SEO, and only for collections that render item pages.
  // Carry forward existing seo when an update omits it.
  const rawSeo = input && input.seo !== undefined ? input.seo : existingItem?.seo;
  const item = {
    id: slug,
    uuid: existingItem?.uuid ?? randomUUID(),
    slug,
    schemaVersion: schema.schemaVersion,
    created: existingItem?.created ?? nowIso(),
    updated: nextUpdatedIso(existingItem?.updated),
    ...(schema.hasItemPages ? { seo: shapeItemSeo(rawSeo, { sanitize: true }) } : {}),
    settings,
  };
  return { item, previousSlug: existingItem?.slug ?? null };
}

/** List item filenames in a collection dir (excludes _order.json + orphan tmps). */
async function listItemFileNames(dir) {
  let names;
  try {
    names = await fs.readdir(dir);
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
  return names.filter((n) => n.endsWith(".json") && n !== "_order.json" && !isAtomicTmpFile(n));
}

/**
 * Read `_order.json`, apply `transform(order)`, prune slugs whose item file no
 * longer exists, and write back via the atomic helper (Section 15).
 */
async function rewriteOrder(projectFolderName, collectionType, transform) {
  const orderPath = getProjectCollectionOrderPath(projectFolderName, collectionType);
  let order = [];
  try {
    const data = await fs.readJSON(orderPath);
    if (Array.isArray(data?.order)) order = data.order;
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }

  const next = transform([...order]);
  const pruned = [];
  for (const slug of next) {
    const exists = await fs.pathExists(
      getProjectCollectionItemPath(projectFolderName, collectionType, slug),
    );
    if (exists) pruned.push(slug);
  }
  await writeJsonAtomic(orderPath, { order: pruned });
}

/** Delete any sibling file sharing this item's uuid at a different slug — the
 *  user-driven half of duplicate-uuid rename-crash recovery (Section 15). */
async function cleanupDuplicateUuidSiblings(projectFolderName, collectionType, item) {
  const dir = getProjectCollectionDir(projectFolderName, collectionType);
  const names = await listItemFileNames(dir);
  for (const name of names) {
    const slug = name.replace(/\.json$/, "");
    if (slug === item.slug) continue;
    try {
      const other = await fs.readJSON(path.join(dir, name));
      if (other?.uuid === item.uuid) {
        await fs.remove(path.join(dir, name));
      }
    } catch {
      // ignore unreadable siblings
    }
  }
}

/**
 * Write an item with crash-safe semantics (Section 15). Handles create,
 * update-without-rename, and rename (old `previousSlug`, same uuid). Media-usage
 * sync is intentionally deferred to Phase 6.
 *
 * @throws {CollectionSlugConflictError} on create/rename onto an existing slug
 */
export async function writeCollectionItem(
  projectId,
  projectFolderName,
  collectionType,
  item,
  previousSlug = null,
) {
  if (!SLUG_RE.test(item.slug)) {
    throw new CollectionValidationError([{ fieldId: "slug", reason: "invalid slug" }]);
  }

  const dir = getProjectCollectionDir(projectFolderName, collectionType);
  await fs.ensureDir(dir);

  const targetPath = getProjectCollectionItemPath(projectFolderName, collectionType, item.slug);
  const isRename = Boolean(previousSlug) && previousSlug !== item.slug;
  const isCreate = !previousSlug;

  if ((isCreate || isRename) && (await fs.pathExists(targetPath))) {
    throw new CollectionSlugConflictError(item.slug);
  }

  await writeJsonAtomic(targetPath, item);

  if (isRename) {
    const oldPath = getProjectCollectionItemPath(projectFolderName, collectionType, previousSlug);
    await fs.remove(oldPath).catch(() => {});
    await rewriteOrder(projectFolderName, collectionType, (order) =>
      order.map((slug) => (slug === previousSlug ? item.slug : slug)),
    );
  }

  await cleanupDuplicateUuidSiblings(projectFolderName, collectionType, item);

  // Media-usage sync is performed by callers (collectionController, linkEnrichment)
  // and the refreshAllMediaUsage safety net; the storage layer stays decoupled.
  void projectId;
  return item;
}

/**
 * Explicitly discard an item's archived (out-of-schema) settings — the
 * counterpart to the BLOCKER-2 merge-back in `buildCollectionItemData`. Keeps
 * only current-schema setting keys and rewrites the item in place, preserving
 * `uuid`/`created`/`updated` (this clears hidden data, not visible content).
 * Returns the re-normalized item (now with an empty `_archived`), or null if the
 * collection type or item file is missing.
 */
export async function discardArchivedCollectionItem(projectId, projectFolderName, collectionType, itemSlug) {
  const schema = await getCollectionSchema(projectFolderName, collectionType);
  if (!schema) return null;
  const raw = await readRawCollectionItem(projectFolderName, collectionType, itemSlug);
  if (!raw) return null;

  const knownIds = new Set(
    (schema.settings || []).filter((s) => s.type !== HEADER_TYPE).map((s) => s.id),
  );
  const settings = {};
  for (const [key, value] of Object.entries(raw.settings || {})) {
    if (knownIds.has(key)) settings[key] = value;
  }

  // previousSlug === slug → update in place (not create/rename); timestamps and
  // uuid are carried through untouched, only the orphaned keys disappear.
  const updatedItem = { ...raw, settings };
  await writeCollectionItem(projectId, projectFolderName, collectionType, updatedItem, updatedItem.slug);
  return normalizeCollectionItem(updatedItem, schema);
}

/** Delete one item and prune it (and any stale slugs) from `_order.json`. */
export async function deleteCollectionItem(projectId, projectFolderName, collectionType, itemSlug) {
  const itemPath = getProjectCollectionItemPath(projectFolderName, collectionType, itemSlug);
  const existed = await fs.pathExists(itemPath);
  await fs.remove(itemPath).catch(() => {});
  await rewriteOrder(projectFolderName, collectionType, (order) =>
    order.filter((slug) => slug !== itemSlug),
  );
  // Media-usage sync handled by caller (see writeCollectionItem note).
  void projectId;
  return { deleted: existed };
}

/** Bulk delete with partial-failure reporting; prunes all deleted slugs at once. */
export async function bulkDeleteCollectionItems(
  projectId,
  projectFolderName,
  collectionType,
  itemSlugs,
) {
  const deleted = [];
  const notFound = [];
  const errors = [];

  for (const slug of itemSlugs) {
    // Belt-and-braces against path traversal: never build a path from an
    // unvalidated slug, even though the route validator already rejects them.
    if (typeof slug !== "string" || !SLUG_RE.test(slug)) {
      errors.push({ slug, message: "Invalid slug" });
      continue;
    }
    const itemPath = getProjectCollectionItemPath(projectFolderName, collectionType, slug);
    try {
      if (await fs.pathExists(itemPath)) {
        await fs.remove(itemPath);
        deleted.push(slug);
      } else {
        notFound.push(slug);
      }
    } catch (err) {
      errors.push({ slug, message: err.message });
    }
  }

  if (deleted.length > 0) {
    const removed = new Set(deleted);
    await rewriteOrder(projectFolderName, collectionType, (order) =>
      order.filter((slug) => !removed.has(slug)),
    );
  }

  // Media-usage sync handled by caller (see writeCollectionItem note).
  void projectId;
  return { deleted, notFound, errors };
}

/**
 * Duplicate an item: brand-new uuid, copy-suffixed unique slug and title, fresh
 * timestamps, settings copied, inserted into `_order.json` right after the
 * source (Section 15). Returns null if the source does not exist.
 */
export async function duplicateCollectionItem(
  projectId,
  projectFolderName,
  collectionType,
  sourceSlug,
) {
  const schema = await getCollectionSchema(projectFolderName, collectionType);
  if (!schema) throw new Error(`Unknown collection type "${collectionType}"`);

  const sourcePath = getProjectCollectionItemPath(projectFolderName, collectionType, sourceSlug);
  let source;
  try {
    source = await fs.readJSON(sourcePath);
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }

  const newSlug = await generateUniqueSlug(
    `${sourceSlug}-copy`,
    (candidate) =>
      fs.pathExists(getProjectCollectionItemPath(projectFolderName, collectionType, candidate)),
    { fallback: `${sourceSlug}-copy` },
  );

  const settings = { ...(source.settings || {}) };
  const titleSetting = (schema.settings || []).find((s) => s.usedAsTitle);
  if (titleSetting && settings[titleSetting.id]) {
    settings[titleSetting.id] = `${settings[titleSetting.id]} (copy)`;
  }

  const now = nowIso();
  const item = {
    id: newSlug,
    uuid: randomUUID(),
    slug: newSlug,
    schemaVersion: schema.schemaVersion,
    created: now,
    updated: now,
    // Carry the page-shaped SEO object to the copy (Finding #12); before the
    // SEO object existed these fields lived in settings and copied for free.
    ...(schema.hasItemPages ? { seo: shapeItemSeo(source.seo) } : {}),
    settings,
  };

  await fs.ensureDir(getProjectCollectionDir(projectFolderName, collectionType));
  await writeJsonAtomic(
    getProjectCollectionItemPath(projectFolderName, collectionType, newSlug),
    item,
  );

  await rewriteOrder(projectFolderName, collectionType, (order) => {
    const next = [...order];
    const idx = next.indexOf(sourceSlug);
    if (idx === -1) next.push(newSlug);
    else next.splice(idx + 1, 0, newSlug);
    return next;
  });

  // Media-usage sync handled by caller (see writeCollectionItem note).
  void projectId;
  return item;
}

/**
 * Persist a manual ordering for a collection (the reorder endpoint). The desired
 * order is written verbatim via the atomic helper, with stale slugs (whose item
 * file no longer exists) pruned.
 */
export async function reorderCollectionItems(projectId, projectFolderName, collectionType, order) {
  const desired = Array.isArray(order) ? order : [];
  await rewriteOrder(projectFolderName, collectionType, () => desired);
  void projectId;
  return { order: desired };
}

// ============================================================================
// Render-time link resolution (Phase 7 — spec Section 9)
// ============================================================================

/** A link-type setting value: an object carrying an `href`. */
function isLinkObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) && "href" in value;
}

function resolveLink(linkValue, pagesByUuid, outputPathPrefix, collectionItemsByUuid = null) {
  const { pageUuid, collectionItemUuid } = linkValue;
  // Stable reference to a collection item page (#11 parity): resolve its current
  // slug so renames follow and deletes clear the link.
  if (collectionItemUuid) {
    const entry = collectionItemsByUuid && collectionItemsByUuid.get(collectionItemUuid);
    if (!entry) {
      return { href: "", text: "", target: "_self" }; // item deleted — clear the link
    }
    return { ...linkValue, href: prefixInternalHref(`${entry.slugPrefix}/${entry.slug}.html`, outputPathPrefix) };
  }
  if (!pageUuid) {
    // Custom URL — depth-prefix internal-looking hrefs, leave the rest as-is.
    return { ...linkValue, href: prefixInternalHref(linkValue.href, outputPathPrefix) };
  }
  const page = pagesByUuid?.get(pageUuid);
  if (!page) {
    return { href: "", text: "", target: "_self" }; // page deleted — clear the link
  }
  return { ...linkValue, href: prefixInternalHref(`${page.slug}.html`, outputPathPrefix) };
}

/**
 * Resolve link settings on a collection item at render time (spec Section 9):
 * `pageUuid` → current page slug, custom URLs depth-prefixed, dead refs cleared.
 * Returns a deep clone; the input item is never mutated. v1 schemas are flat, so
 * a single pass over top-level settings suffices (repeaters arrive in Phase 3+).
 *
 * @param {object} item - a collection item ({ settings })
 * @param {Map} pagesByUuid - uuid -> page ({ slug })
 * @param {string} outputPathPrefix - "" at root, "../" for nested item pages
 * @returns {object} resolved clone
 */
export function resolveCollectionItemLinks(item, pagesByUuid, outputPathPrefix, collectionItemsByUuid = null) {
  if (!item?.settings) return item;
  const resolved = JSON.parse(JSON.stringify(item));
  for (const [key, value] of Object.entries(resolved.settings)) {
    if (isLinkObject(value)) {
      resolved.settings[key] = resolveLink(value, pagesByUuid, outputPathPrefix, collectionItemsByUuid);
    }
  }
  return resolved;
}

/**
 * The single gate every collection-item render path must go through. Resolves
 * the item's links to current page slugs, then sanitizes its settings by schema
 * type — the item-level equivalent of the widget render gate (renderWidget →
 * sanitizeWidgetData). Going through one function means a collection item can
 * never reach a template unsanitized, no matter which path renders it (page
 * lists, preview item pages, or export item pages).
 *
 * Sanitization runs AFTER link resolution so resolved hrefs are validated too,
 * mirroring the widget flow (resolveWidgetPageLinks → sanitizeWidgetData).
 * Returns a resolved + sanitized clone; the on-disk item is never mutated.
 *
 * @param {object} item - Raw collection item ({ settings })
 * @param {object} schema - Collection-type schema ({ settings })
 * @param {Map} pagesByUuid - uuid -> page ({ slug })
 * @param {string} outputPathPrefix - "" at root, "../" for nested item pages
 * @param {object} [menuDeps] - { menuMaps, collectionItemsByUuid } to resolve
 *   `menu`-type settings into menu objects (finding #10). When omitted, menu
 *   settings pass through unresolved (back-compat).
 * @returns {object} resolved + sanitized clone
 */
export function prepareCollectionItemForRender(item, schema, pagesByUuid, outputPathPrefix, menuDeps = null) {
  // Forward the collection-item map so `link` settings that target another
  // collection item resolve (and clear on delete), parity with pageUuid (#11).
  const resolved = resolveCollectionItemLinks(item, pagesByUuid, outputPathPrefix, menuDeps?.collectionItemsByUuid || null);
  // Resolve menu-type settings the same way widgets do (shared menuResolver), so
  // an item template gets a full menu object instead of a raw UUID string.
  if (menuDeps && menuDeps.menuMaps && resolved && resolved.settings) {
    resolveMenuSettings(resolved.settings, schema.settings, {
      menuMaps: menuDeps.menuMaps,
      pagesByUuid,
      collectionItemsByUuid: menuDeps.collectionItemsByUuid || new Map(),
      outputPathPrefix,
    });
  }
  sanitizeCollectionItemData(resolved, schema);
  return resolved;
}

/**
 * Load every `hasItemPages` collection item and return a map of
 * item uuid -> { slugPrefix, slug }, for resolving stable collection-item menu
 * references (#11) to their current page URL. Cached per render by the caller.
 * @param {string} projectFolderName - The project folder name
 * @returns {Promise<Map>} Map of uuid -> { slugPrefix, slug }
 */
export async function loadCollectionItemsByUuid(projectFolderName) {
  const map = new Map();
  try {
    const schemas = await listCollectionSchemas(projectFolderName);
    for (const schema of schemas) {
      if (!schema.hasItemPages) continue;
      const items = await listCollectionItems(projectFolderName, schema.type);
      for (const item of items) {
        if (item.uuid) map.set(item.uuid, { slugPrefix: schema.slugPrefix, slug: item.slug });
      }
    }
  } catch (error) {
    console.warn(`Could not load collection items for menu resolution: ${error.message}`);
  }
  return map;
}

/** True when `siteUrl` is a non-empty, parseable absolute URL. */
function isValidSiteUrl(siteUrl) {
  if (!siteUrl || !siteUrl.trim()) return false;
  try {
    new URL(siteUrl);
    return true;
  } catch {
    return false;
  }
}

/**
 * Map a normalized collection item + its schema into the page-shaped object that
 * renderPageLayout and SeoTag consume for an item page (spec Section 13). The
 * title comes from the schema's usedAsTitle field; SEO comes from the item's
 * own page-shaped `seo` object (Finding #12 — at parity with page SEO), so the
 * shared `SeoTag` handles `<title>`, og fallbacks, og:image absolutization, and
 * the twitter card exactly as it does for pages. An explicit `seo.canonical_url`
 * wins; otherwise we precompute the absolute canonical from siteUrl so the
 * returned page object is self-describing.
 *
 * @param {object} schema - normalized collection schema
 * @param {object} item - normalized (and link-resolved) collection item
 * @param {string} siteUrl - project siteUrl ("" when unset)
 * @returns {object} page-shaped object
 */
export function buildCollectionItemPageData(schema, item, siteUrl) {
  const fieldSettings = (schema.settings || []).filter((s) => s.type !== HEADER_TYPE);
  const titleField = fieldSettings.find((s) => s.usedAsTitle);
  const settings = item.settings || {};
  const titleValue = (titleField && settings[titleField.id]) || item.slug;

  const seo = shapeItemSeo(item.seo);
  const validSiteUrl = isValidSiteUrl(siteUrl);
  const canonicalBase = validSiteUrl ? siteUrl.replace(/\/$/, "") : "";
  const canonical_url =
    seo.canonical_url && seo.canonical_url.trim()
      ? seo.canonical_url.trim()
      : validSiteUrl
        ? `${canonicalBase}/${schema.slugPrefix}/${item.slug}.html`
        : "";

  return {
    id: `${schema.slugPrefix}-${item.slug}`,
    slug: `${schema.slugPrefix}/${item.slug}`,
    uuid: item.uuid,
    name: titleValue,
    created: item.created,
    updated: item.updated,
    seo: { ...seo, canonical_url },
  };
}
