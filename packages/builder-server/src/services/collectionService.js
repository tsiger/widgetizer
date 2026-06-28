/**
 * collectionService — reads, validates, normalizes, and persists collection-type
 * schemas (Collections spec Sections 1 and 4) and collection items.
 *
 * Scope-first rewrite for the package split: every stateful function takes the
 * injected `(storage, scope)` pair and addresses tenant content through the
 * StorageAdapter with RELATIVE keys (`collections/…`, `collection-types/…`) —
 * never an absolute path built from user input. The adapter confines every key
 * under the per-tenant root and runs the traversal guard, and the route + this
 * service validate `collectionType`/`itemSlug` against SLUG_RE as defense in
 * depth. This is what lets hosted inherit the routes unchanged (its cloud
 * storage adapter round-trips the same keys) and satisfies `local/require-scope-arg`.
 *
 * The pure validation/normalization/build helpers are filesystem-agnostic and
 * carry over verbatim. `validateThemeCollectionSchemas` is the one exception that
 * keeps direct `fs` access: it inspects a theme UPLOAD source directory (a temp
 * dir during theme validation), not per-tenant storage.
 */

import fs from "fs-extra";
import path from "path";
import { randomUUID } from "node:crypto";

import { isSupportedSettingType } from "@widgetizer/core/config/settingTypes";
import { prefixInternalHref } from "@widgetizer/core/linkPrefixer";
import { resolveRichtextMediaInSettings } from "@widgetizer/core/richtextMedia";
import { resolveRichtextLinksInSettings } from "@widgetizer/core/richtextLinks";
import { resolveMenuSettings } from "@widgetizer/render-engine";
import { sanitizeSlug, generateUniqueSlug } from "../utils/slugHelpers.js";
import {
  sanitizeCollectionItemData,
  sanitizeDateValue,
  sanitizeImagePath,
  stripHtmlTags,
} from "./sanitizationService.js";

const SLUG_RE = /^[a-z0-9-]+$/;
const ALLOWED_SORTS = ["manual", "created_desc", "created_asc", "title_asc", "title_desc", "date_desc", "date_asc"];
const RESERVED_SLUG_PREFIXES = new Set(["assets"]);
// v1 constructs that must be rejected, not silently ignored (Section 1).
const DISALLOWED_SETTING_KEYS = ["multiple", "repeater", "blocks"];

// `table` column types allowed in v1 (text-only; grows incrementally). A Set, not a
// hard-coded check, so adding a type later is one entry here + its cell wiring.
const ALLOWED_TABLE_COLUMN_TYPES = new Set(["text"]);
// Column ids become row-object keys AND Liquid accessors, so they must be simple and safe.
const TABLE_COLUMN_ID_RE = /^[a-zA-Z][a-zA-Z0-9_]*$/;
const RESERVED_COLUMN_IDS = new Set(["__proto__", "constructor", "prototype"]);

// ============================================================================
// Relative storage-key builders.
// Every key is relative to the per-tenant project root the StorageAdapter owns.
// ============================================================================

const collectionTypesRoot = () => "collection-types";
const schemaKey = (collectionType) => `collection-types/${collectionType}/schema.json`;
const templateKey = (collectionType) => `collection-types/${collectionType}/template.liquid`;
const collectionDirKey = (collectionType) => `collections/${collectionType}`;
const itemKey = (collectionType, slug) => `collections/${collectionType}/${slug}.json`;
const orderKey = (collectionType) => `collections/${collectionType}/_order.json`;

/**
 * Read + parse a JSON file through the storage adapter. Returns null when the
 * file is absent; lets a parse error (SyntaxError) propagate so callers can
 * decide whether to skip-and-warn or rethrow.
 */
async function readJson(storage, scope, relPath) {
  const buf = await storage.read(scope, relPath);
  if (buf == null) return null;
  return JSON.parse(buf.toString("utf8"));
}

/**
 * Validate a `table` setting's `columns` (shape only; cell-value integrity is the sanitizer's
 * job). Pushes errors into `errors`. v1: non-empty columns array, each with a unique safe `id`
 * and a `type` in ALLOWED_TABLE_COLUMN_TYPES.
 */
function validateTableColumns(setting, where, errors) {
  if (!Array.isArray(setting.columns) || setting.columns.length === 0) {
    errors.push(`${where} (id "${setting.id}") table requires a non-empty \`columns\` array.`);
    return;
  }
  const seen = new Set();
  setting.columns.forEach((col, ci) => {
    const cw = `${where}.columns[${ci}]`;
    if (!col || typeof col !== "object") {
      errors.push(`${cw} must be an object.`);
      return;
    }
    if (typeof col.id !== "string" || !TABLE_COLUMN_ID_RE.test(col.id) || RESERVED_COLUMN_IDS.has(col.id)) {
      errors.push(`${cw} has an invalid \`id\` (must match ${TABLE_COLUMN_ID_RE} and not be a reserved key).`);
    } else if (seen.has(col.id)) {
      errors.push(`${cw} has a duplicate column id "${col.id}".`);
    } else {
      seen.add(col.id);
    }
    if (typeof col.type !== "string" || !ALLOWED_TABLE_COLUMN_TYPES.has(col.type)) {
      errors.push(
        `${cw} uses unsupported column type "${col.type}" (allowed: ${[...ALLOWED_TABLE_COLUMN_TYPES].join(", ")}).`,
      );
    }
  });
}

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
  let dateSettings = [];
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
      if (setting.type === "table") {
        validateTableColumns(setting, where, errors);
      }
      if (setting.usedAsTitle === true && setting.type !== "header") {
        titleSettings.push(setting);
      }
      if (setting.usedAsDate === true && setting.type !== "header") {
        dateSettings.push(setting);
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

  // --- usedAsDate: at most one, must be a date setting ---
  if (dateSettings.length > 1) {
    errors.push(
      `At most one non-header setting may declare \`usedAsDate: true\` (found ${dateSettings.length}).`,
    );
  } else if (dateSettings.length === 1 && dateSettings[0].type !== "date") {
    errors.push("`usedAsDate` must be on a `date` setting.");
  }

  // --- defaultSort ---
  if (schema.defaultSort !== undefined && !ALLOWED_SORTS.includes(schema.defaultSort)) {
    errors.push(`\`defaultSort\` must be one of: ${ALLOWED_SORTS.join(", ")}.`);
  }
  if ((schema.defaultSort === "date_desc" || schema.defaultSort === "date_asc") && dateSettings.length === 0) {
    errors.push("`defaultSort: date_desc|date_asc` requires a `usedAsDate` field.");
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
 * @param {import('@widgetizer/core/adapters').StorageAdapter} storage
 * @param {import('@widgetizer/core/adapters').Scope} scope
 * @returns {Promise<object[]>} normalized valid schemas
 */
export async function listCollectionSchemas(storage, scope) {
  // The adapter has no readdir-with-filetypes, so list the names and probe each
  // for a schema.json to identify collection-type folders (SLUG_RE filters out
  // any stray non-conforming entry before it is ever used to build a key).
  const entries = await storage.list(scope, collectionTypesRoot());
  const folderNames = [];
  for (const name of entries) {
    if (!SLUG_RE.test(name)) continue;
    if (await storage.exists(scope, schemaKey(name))) folderNames.push(name);
  }

  const valid = [];
  for (const folderName of folderNames) {
    let raw;
    try {
      raw = await readJson(storage, scope, schemaKey(folderName));
    } catch (err) {
      console.warn(
        `[collections] Skipping "${folderName}": cannot read schema.json (${err.message}).`,
      );
      continue;
    }
    if (raw == null) continue; // disappeared between list and read

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
 * Also enforces that a preset may not ship a `collection-types/` folder
 * (collection schemas are theme-only).
 *
 * Stays on direct `fs` because it inspects a theme-upload SOURCE directory (a
 * temp dir during validation), not per-tenant storage.
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

  // Presets are item-data only; reject preset-owned schemas.
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
    case "gallery":
    case "table":
      return [];
    default:
      return "";
  }
}

/** Whether a required field's value should count as missing (flags invalid). */
function isMissingValue(value, type, columns) {
  if (type === "table") {
    // Column-aware: missing unless some row has a non-blank string in a DECLARED column.
    // Runs on raw (un-sanitized) data, so inspect only declared column ids — stale/unknown
    // keys (which the sanitizer drops) must not satisfy required. "Present" must match the
    // sanitizer: a v1 cell survives only if it's a non-blank STRING (non-strings → ""), so a
    // number-only row like [{ price: 99 }] renders empty and must NOT satisfy required.
    if (!Array.isArray(value) || !Array.isArray(columns)) return true;
    return !value.some(
      (row) =>
        row &&
        typeof row === "object" &&
        columns.some((col) => typeof row[col.id] === "string" && row[col.id].trim() !== ""),
    );
  }
  if (type === "gallery") {
    // gallery is a string[] of upload paths. Missing unless at least one entry is a
    // valid upload path. Reuses sanitizeImagePath so "valid path" is consistent across
    // validation and sanitization: a blank or non-upload string (javascript:, ../) — or
    // a non-string entry — does not count as present. Runs on raw data (never sanitizes).
    return !Array.isArray(value) || !value.some((s) => sanitizeImagePath(s) !== "");
  }
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
export async function getCollectionSchema(storage, scope, collectionType) {
  if (!SLUG_RE.test(collectionType)) return null;
  const raw = await readJson(storage, scope, schemaKey(collectionType));
  if (raw == null) return null;
  const { valid, normalized } = validateCollectionSchema(raw, collectionType);
  return valid ? normalized : null;
}

/**
 * Shape a raw SEO object (from form input or disk) into the page-shaped `seo`
 * object collection item pages use — the SAME field set as page SEO, so item
 * pages feed the shared `SeoTag` exactly like pages. Only the five
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

/**
 * Normalize a raw item against a schema (Section 4). Pure — does not mutate the
 * input and does not touch disk. Unknown fields are separated into an in-memory
 * `_archived` map (they remain on disk; this only hides them from the
 * form/render). Missing fields are filled; required-but-empty fields flag invalid.
 *
 * @param {object} rawItem - parsed item JSON
 * @param {object} schema - normalized schema
 * @returns {object} normalized item with title/invalid/validationErrors/_archived
 */
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
    if (setting.required && isMissingValue(value, setting.type, setting.columns)) {
      validationErrors.push({ fieldId: setting.id, reason: "required field is empty" });
    }
  }

  // Keep values for fields no longer in the schema, in memory only.
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
    // Item-page SEO is a page-shaped object, surfaced only for
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

async function applyManualOrder(items, storage, scope, collectionType) {
  let order = [];
  const data = await readJson(storage, scope, orderKey(collectionType));
  if (Array.isArray(data?.order)) order = data.order;

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

/**
 * Compare two items by their `usedAsDate` field for date_asc / date_desc sorting.
 * Items with a missing, blank, or **malformed** date always sort to the END
 * (independent of direction); exact ties and the all-missing case fall back to
 * newest-created-first. `YYYY-MM-DD` strings compare lexicographically == chronologically.
 */
function compareByDate(a, b, dateField, dir) {
  // Validate, don't just check non-empty: a malformed value (e.g. "2026-13-40" from a
  // hand-edited or unchecked file) must be treated as undated and sort to the END rather
  // than as a huge date. New writes are already coerced in buildCollectionItemData.
  const av = dateField ? sanitizeDateValue(a.settings?.[dateField]) : "";
  const bv = dateField ? sanitizeDateValue(b.settings?.[dateField]) : "";
  const aHas = av !== "";
  const bHas = bv !== "";
  if (aHas && bHas) {
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return byCreatedDesc(a, b);
  }
  if (aHas) return -1; // dated items precede undated ones
  if (bHas) return 1;
  return byCreatedDesc(a, b);
}

async function sortItems(items, sort, storage, scope, collectionType, schema) {
  switch (sort) {
    case "manual":
      return applyManualOrder(items, storage, scope, collectionType);
    case "created_asc":
      return items.sort((a, b) => (Date.parse(a.created) || 0) - (Date.parse(b.created) || 0));
    case "title_asc":
      return items.sort((a, b) => String(a.title).localeCompare(String(b.title)));
    case "title_desc":
      return items.sort((a, b) => String(b.title).localeCompare(String(a.title)));
    case "date_asc":
    case "date_desc": {
      const dateField = (schema?.settings || []).find((s) => s.usedAsDate)?.id;
      const dir = sort === "date_asc" ? 1 : -1;
      return items.sort((a, b) => compareByDate(a, b, dateField, dir));
    }
    case "created_desc":
    default:
      return items.sort(byCreatedDesc);
  }
}

/** List item filenames in a collection dir (excludes _order.json). */
async function listItemFileNames(storage, scope, collectionType) {
  const names = await storage.list(scope, collectionDirKey(collectionType));
  return names.filter((n) => n.endsWith(".json") && n !== "_order.json");
}

/**
 * List normalized items for a collection (Section 2/4). Skips `_order.json`,
 * recovers from duplicate-uuid rename crashes (newer `updated` wins; loser
 * excluded but NOT deleted), then sorts/limits/offsets.
 *
 * @param {{ sort?: string, limit?: number, offset?: number }} [options]
 * @returns {Promise<object[]>}
 */
export async function listCollectionItems(storage, scope, collectionType, options = {}) {
  const schema = await getCollectionSchema(storage, scope, collectionType);
  if (!schema) return [];

  const itemFileNames = await listItemFileNames(storage, scope, collectionType);

  const rawEntries = [];
  for (const name of itemFileNames) {
    try {
      const raw = await readJson(storage, scope, `${collectionDirKey(collectionType)}/${name}`);
      if (raw != null) rawEntries.push({ name, raw });
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
  items = await sortItems(items, sort, storage, scope, collectionType, schema);

  const offset = options.offset ?? 0;
  if (offset) items = items.slice(offset);
  if (options.limit != null) items = items.slice(0, options.limit);
  return items;
}

/**
 * Read the raw on-disk item file (no normalization), preserving any orphaned
 * out-of-schema settings. Used by the update path so orphaned
 * preservation works. Returns null if the file does not exist.
 */
export async function readRawCollectionItem(storage, scope, collectionType, itemSlug) {
  if (!SLUG_RE.test(collectionType) || !SLUG_RE.test(itemSlug)) return null;
  return readJson(storage, scope, itemKey(collectionType, itemSlug));
}

/**
 * Read and normalize a single item by slug. Returns null if the collection or
 * item file does not exist.
 */
export async function readCollectionItem(storage, scope, collectionType, itemSlug) {
  if (!SLUG_RE.test(itemSlug)) return null;
  const schema = await getCollectionSchema(storage, scope, collectionType);
  if (!schema) return null;
  const raw = await readJson(storage, scope, itemKey(collectionType, itemSlug));
  if (raw == null) return null;
  return normalizeCollectionItem(raw, schema);
}

/**
 * Load a collection's `template.liquid` from the project copy (Phase 2 export).
 * @returns {Promise<string|null>} template contents, or null if absent
 */
export async function loadCollectionTemplate(storage, scope, collectionType) {
  if (!SLUG_RE.test(collectionType)) return null;
  const buf = await storage.read(scope, templateKey(collectionType));
  return buf == null ? null : buf.toString("utf8");
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
 * fills schema fields, preserves orphaned settings, and enforces
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
    // Date is a sort key, so it must be valid at the data layer — not just at render
    // like other types. Coerce a malformed value to "" here so garbage is never
    // persisted and never sorts as if it were a real date. A bad value on a *required*
    // date field then correctly fails the emptiness check below.
    if (s.type === "date") value = sanitizeDateValue(value);
    settings[s.id] = value;
    if (s.required && isMissingValue(value, s.type, s.columns)) {
      validationErrors.push({ fieldId: s.id, reason: "required field is empty" });
    }
  }

  // Carry forward orphaned on-disk settings the schema dropped and the
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

  // A page-shaped seo object lives top-level at parity with pages,
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

/**
 * Read `_order.json`, apply `transform(order)`, prune slugs whose item file no
 * longer exists, and write back (Section 15). Crash-safety is the adapter's job:
 * LocalStorageAdapter.write is atomic (temp-file + rename), so this service stays
 * adapter-agnostic and never does the temp-file dance itself.
 */
async function rewriteOrder(storage, scope, collectionType, transform) {
  let order = [];
  const data = await readJson(storage, scope, orderKey(collectionType));
  if (Array.isArray(data?.order)) order = data.order;

  const next = transform([...order]);
  const pruned = [];
  for (const slug of next) {
    if (await storage.exists(scope, itemKey(collectionType, slug))) pruned.push(slug);
  }
  await storage.write(scope, orderKey(collectionType), JSON.stringify({ order: pruned }, null, 2));
}

/** Delete any sibling file sharing this item's uuid at a different slug — the
 *  user-driven half of duplicate-uuid rename-crash recovery (Section 15). */
async function cleanupDuplicateUuidSiblings(storage, scope, collectionType, item) {
  const names = await listItemFileNames(storage, scope, collectionType);
  for (const name of names) {
    const slug = name.replace(/\.json$/, "");
    if (slug === item.slug) continue;
    try {
      const other = await readJson(storage, scope, `${collectionDirKey(collectionType)}/${name}`);
      if (other?.uuid === item.uuid) {
        await storage.delete(scope, itemKey(collectionType, slug));
      }
    } catch {
      // ignore unreadable siblings
    }
  }
}

/**
 * Write an item with create / update-without-rename / rename (old `previousSlug`,
 * same uuid) semantics (Section 15). Media-usage sync is performed by callers.
 *
 * @throws {CollectionSlugConflictError} on create/rename onto an existing slug
 */
export async function writeCollectionItem(storage, scope, collectionType, item, previousSlug = null) {
  if (!SLUG_RE.test(collectionType)) {
    throw new CollectionValidationError([{ fieldId: "collectionType", reason: "invalid collection type" }]);
  }
  if (!SLUG_RE.test(item.slug)) {
    throw new CollectionValidationError([{ fieldId: "slug", reason: "invalid slug" }]);
  }

  const targetKey = itemKey(collectionType, item.slug);
  const isRename = Boolean(previousSlug) && previousSlug !== item.slug;
  const isCreate = !previousSlug;

  if ((isCreate || isRename) && (await storage.exists(scope, targetKey))) {
    throw new CollectionSlugConflictError(item.slug);
  }

  // storage.write creates parent directories as needed (no ensureDir).
  await storage.write(scope, targetKey, JSON.stringify(item, null, 2));

  if (isRename) {
    await storage.delete(scope, itemKey(collectionType, previousSlug));
    await rewriteOrder(storage, scope, collectionType, (order) =>
      order.map((slug) => (slug === previousSlug ? item.slug : slug)),
    );
  }

  await cleanupDuplicateUuidSiblings(storage, scope, collectionType, item);

  return item;
}

/**
 * Explicitly discard an item's archived (out-of-schema) settings — the
 * counterpart to the orphaned-setting merge-back in `buildCollectionItemData`. Keeps
 * only current-schema setting keys and rewrites the item in place, preserving
 * `uuid`/`created`/`updated` (this clears hidden data, not visible content).
 * Returns the re-normalized item (now with an empty `_archived`), or null if the
 * collection type or item file is missing.
 */
export async function discardArchivedCollectionItem(storage, scope, collectionType, itemSlug) {
  const schema = await getCollectionSchema(storage, scope, collectionType);
  if (!schema) return null;
  const raw = await readRawCollectionItem(storage, scope, collectionType, itemSlug);
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
  await writeCollectionItem(storage, scope, collectionType, updatedItem, updatedItem.slug);
  return normalizeCollectionItem(updatedItem, schema);
}

/** Delete one item and prune it (and any stale slugs) from `_order.json`. */
export async function deleteCollectionItem(storage, scope, collectionType, itemSlug) {
  if (!SLUG_RE.test(collectionType) || !SLUG_RE.test(itemSlug)) {
    return { deleted: false };
  }
  const itemPathKey = itemKey(collectionType, itemSlug);
  const existed = await storage.exists(scope, itemPathKey);
  await storage.delete(scope, itemPathKey);
  await rewriteOrder(storage, scope, collectionType, (order) =>
    order.filter((slug) => slug !== itemSlug),
  );
  return { deleted: existed };
}

/** Bulk delete with partial-failure reporting; prunes all deleted slugs at once. */
export async function bulkDeleteCollectionItems(storage, scope, collectionType, itemSlugs) {
  const deleted = [];
  const notFound = [];
  const errors = [];

  for (const slug of itemSlugs) {
    // Belt-and-braces against path traversal: never build a key from an
    // unvalidated slug, even though the route validator already rejects them.
    if (typeof slug !== "string" || !SLUG_RE.test(slug)) {
      errors.push({ slug, message: "Invalid slug" });
      continue;
    }
    const itemPathKey = itemKey(collectionType, slug);
    try {
      if (await storage.exists(scope, itemPathKey)) {
        await storage.delete(scope, itemPathKey);
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
    await rewriteOrder(storage, scope, collectionType, (order) =>
      order.filter((slug) => !removed.has(slug)),
    );
  }

  return { deleted, notFound, errors };
}

/**
 * Duplicate an item: brand-new uuid, copy-suffixed unique slug and title, fresh
 * timestamps, settings copied, inserted into `_order.json` right after the
 * source (Section 15). Returns null if the source does not exist.
 */
export async function duplicateCollectionItem(storage, scope, collectionType, sourceSlug) {
  const schema = await getCollectionSchema(storage, scope, collectionType);
  if (!schema) throw new Error(`Unknown collection type "${collectionType}"`);
  if (!SLUG_RE.test(sourceSlug)) return null;

  const source = await readJson(storage, scope, itemKey(collectionType, sourceSlug));
  if (source == null) return null;

  const newSlug = await generateUniqueSlug(
    `${sourceSlug}-copy`,
    (candidate) => storage.exists(scope, itemKey(collectionType, candidate)),
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
    // Carry the page-shaped SEO object to the copy. Before the
    // SEO object existed these fields lived in settings and copied for free.
    ...(schema.hasItemPages ? { seo: shapeItemSeo(source.seo) } : {}),
    settings,
  };

  await storage.write(scope, itemKey(collectionType, newSlug), JSON.stringify(item, null, 2));

  await rewriteOrder(storage, scope, collectionType, (order) => {
    const next = [...order];
    const idx = next.indexOf(sourceSlug);
    if (idx === -1) next.push(newSlug);
    else next.splice(idx + 1, 0, newSlug);
    return next;
  });

  return item;
}

/**
 * Persist a manual ordering for a collection (the reorder endpoint). The desired
 * order is written verbatim, with stale slugs (whose item file no longer exists)
 * pruned.
 */
export async function reorderCollectionItems(storage, scope, collectionType, order) {
  const desired = Array.isArray(order) ? order : [];
  await rewriteOrder(storage, scope, collectionType, () => desired);
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
 *   `menu`-type settings into menu objects. When omitted, menu
 *   settings pass through unresolved (back-compat).
 * @returns {object} resolved + sanitized clone
 */
export function prepareCollectionItemForRender(
  item,
  schema,
  pagesByUuid,
  outputPathPrefix,
  menuDeps = null,
  mediaBasePaths = null,
) {
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
  // Resolve embedded media paths in richtext fields to the render mode's served base
  // (preview → live media URL, publish → assets/), so an inserted <img> loads without
  // the theme author wiring anything in the template. Runs after sanitize, on the clone.
  if (mediaBasePaths && resolved && resolved.settings) {
    resolveRichtextMediaInSettings(resolved.settings, schema.settings, mediaBasePaths.imagePath, mediaBasePaths.filePath);
  }
  // Resolve stable internal-link refs in richtext anchors (data-page-uuid /
  // data-collection-item-uuid) to current slugs, depth-aware — parity with the
  // structured `link` resolution above. Runs on the sanitized clone.
  if (resolved && resolved.settings) {
    resolveRichtextLinksInSettings(resolved.settings, schema.settings, {
      pagesByUuid,
      collectionItemsByUuid: menuDeps?.collectionItemsByUuid || null,
      outputPathPrefix,
    });
  }
  return resolved;
}

/**
 * Load every `hasItemPages` collection item and return a map of
 * item uuid -> { slugPrefix, slug }, for resolving stable collection-item menu
 * references (#11) to their current page URL. Cached per render by the caller.
 * @returns {Promise<Map>} Map of uuid -> { slugPrefix, slug }
 */
export async function loadCollectionItemsByUuid(storage, scope) {
  const map = new Map();
  try {
    const schemas = await listCollectionSchemas(storage, scope);
    for (const schema of schemas) {
      if (!schema.hasItemPages) continue;
      const items = await listCollectionItems(storage, scope, schema.type);
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
 * own page-shaped `seo` object at parity with page SEO, so the
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
