import DOMPurify from "isomorphic-dompurify";
import { sanitizeHref } from "@widgetizer/core/urlSafety";

/**
 * Strip all HTML tags from a string, keeping only the text content.
 * Used for plain-text fields (names, descriptions) to prevent stored XSS
 * without encoding special characters like & or ".
 * @param {string} value - The input string
 * @returns {string} Text with all HTML tags removed
 */
export function stripHtmlTags(value) {
  if (typeof value !== "string") return value;
  return DOMPurify.sanitize(value, { ALLOWED_TAGS: [] });
}

// Safe inline formatting tags/attrs produced by the Tiptap editor. Headings and `<img>`
// are NOT here: both are opt-in per field (`allow_headings` / `allow_images`) and added
// to the allowlist only for fields that declare them (see sanitizeRichText), so the flags
// are real contracts, not just editor-UI toggles. Text/textarea are handled by LiquidJS
// autoescape (outputEscape: "escape").
const RICHTEXT_BASE_TAGS = ["p", "strong", "em", "a", "br", "span", "ul", "ol", "li"];
const RICHTEXT_HEADING_TAGS = ["h2", "h3", "h4"];
const RICHTEXT_BASE_ATTR = ["href", "target", "rel", "class"];

// A richtext <img> src must be exactly an in-project upload path with a single safe
// filename segment — the same charset the media scanner tracks. This rejects external /
// tracking-pixel sources AND malformed paths that aren't real uploads: directory
// traversal (`/uploads/images/../secret.png`), spaces, and `?query` strings, none of
// which would track or export reliably. DOMPurify already empties javascript:/data: srcs.
const UPLOAD_SRC_RE = /^\/uploads\/(?:images|files)\/[A-Za-z0-9._-]+$/;

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.nodeName !== "IMG") return;
  if (!UPLOAD_SRC_RE.test(node.getAttribute("src") || "")) {
    node.parentNode?.removeChild(node);
  }
});

/**
 * Sanitize richtext HTML, allowing only safe formatting tags. Headings (`h2`–`h4`) and
 * `<img>` are included only when the field opts in via `allow_headings` / `allow_images`,
 * so those capabilities are real per-field contracts enforced here (the render security
 * boundary) — not just hidden in the editor UI. Used for richtext fields before they are
 * output with | raw in templates.
 * @param {string} value - The raw HTML from the richtext editor.
 * @param {{allowImages?: boolean, allowHeadings?: boolean}} [options] - Field capabilities
 *   (default: neither headings nor images).
 * @returns {string} Sanitized HTML with only allowed tags.
 */
export function sanitizeRichText(value, { allowImages = false, allowHeadings = false } = {}) {
  if (typeof value !== "string") return value;
  const tags = [...RICHTEXT_BASE_TAGS];
  if (allowHeadings) tags.push(...RICHTEXT_HEADING_TAGS);
  if (allowImages) tags.push("img");
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS: tags,
    ALLOWED_ATTR: allowImages ? [...RICHTEXT_BASE_ATTR, "src", "alt"] : RICHTEXT_BASE_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Sanitize a link object: block dangerous protocols in href.
 * The link.text field is left for LiquidJS autoescape to handle.
 * @param {object} linkObj - Link object with text, href, target properties
 * @returns {object} Sanitized link object
 */
function sanitizeLink(linkObj) {
  if (!linkObj || typeof linkObj !== "object") return linkObj;

  const sanitized = { ...linkObj };

  if (typeof sanitized.href === "string") {
    sanitized.href = sanitizeHref(sanitized.href);
  }

  return sanitized;
}

// Characters legal in an in-project image path. This is a strict ALLOWLIST, not a blocklist,
// because the value reaches an HTML sink: the {% image %} tag falls back to a RAW
// `<img src="...">` with the value's basename UNescaped (src/core/tags/imageTag.js), so any
// quote, `<`, `>`, whitespace, backslash, `:` or control char must never survive — otherwise a
// value like `/uploads/images/x" onerror="alert(1).jpg` breaks out of the src attribute (XSS).
// Upload filenames are `slugify(strict)` → `[a-z0-9-]` + extension, so this never blanks a real
// upload; it also covers theme asset paths like `/assets/logo.svg`.
const SAFE_IMAGE_PATH_RE = /^\/[A-Za-z0-9._/-]+$/;

/**
 * Whether a trimmed string is a safe in-project image path: a single leading slash, only
 * allowlisted path characters, no protocol-relative `//host`, and no parent traversal `..`.
 * Shared by both image-path guards so "safe path" means exactly one thing.
 * @param {string} v - already-trimmed candidate
 * @returns {boolean}
 */
function isSafeImagePath(v) {
  return SAFE_IMAGE_PATH_RE.test(v) && !v.startsWith("//") && !v.includes("..");
}

/**
 * Keep only safe in-project UPLOAD image paths (`/uploads/images/...`); blank anything else.
 * Strict by design: every gallery entry is a library upload, so gallery srcs run through this,
 * and collection required-field validation imports it. For a plain `image` setting (which may
 * legitimately point at a non-upload theme asset), use the broader `sanitizeImageSettingValue`.
 * @param {*} value - candidate image path
 * @returns {string} the path if it is a safe /uploads/images/ path, else ""
 */
export function sanitizeImagePath(value) {
  if (typeof value !== "string") return "";
  const v = value.trim();
  return isSafeImagePath(v) && v.startsWith("/uploads/images/") ? v : "";
}

/**
 * Sanitize a plain `image` setting value (widget, collection-item, or theme setting).
 * Broader than `sanitizeImagePath`: allows any safe in-project absolute path, so a non-upload
 * theme asset like `/default-logo.png` survives — while the shared `isSafeImagePath` allowlist
 * blanks anything dangerous: schemes, external / protocol-relative URLs, traversal, and any
 * character that could break out of the unescaped `<img src>` fallback (quotes, `<`, `>`,
 * whitespace, …). Non-strings and empty/cleared values → "".
 * @param {*} value
 * @returns {string} the path if safe, else ""
 */
export function sanitizeImageSettingValue(value) {
  if (typeof value !== "string") return "";
  const v = value.trim();
  return isSafeImagePath(v) ? v : "";
}

/**
 * Sanitize a `gallery` value: an ordered array of upload-path strings. Each entry is
 * kept only if it is a safe upload image path; anything else (a non-string, a bad path)
 * yields "" and is dropped — so a non-string entry is removed, NOT coerced, and a gallery
 * of only invalid entries collapses to []. Non-array / malformed input normalizes to [].
 * Shared by the widget/collection sanitizer and the theme-settings sanitizer so all three
 * behave identically. (Image alt/title/caption live on the media record, not the gallery.)
 * @param {*} value
 * @returns {string[]}
 */
function sanitizeGalleryValue(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => sanitizeImagePath(entry)).filter((src) => src !== "");
}

/** Normalize one table cell by its column type. v1: `text` only (string-or-""). Future column
 *  types delegate to their existing sanitizer here; `text` needs explicit handling because
 *  `sanitizeSettingValue` does not coerce text (it's autoescape-safe and returned untouched). */
function sanitizeTableCell(cell, type) {
  switch (type) {
    case "text":
    default:
      return typeof cell === "string" ? cell : "";
  }
}

/**
 * Sanitize a `table` value: an ordered array of row objects keyed by declared column id.
 * Each row is rebuilt from the schema's columns only — unknown/stale keys are dropped, so a
 * `__proto__`/`constructor` key smuggled into stored row data is never read or copied (no
 * prototype pollution; declared column ids are validated safe at schema time). Each cell is
 * normalized by its column type, and fully-empty rows (every declared cell blank after trim)
 * are dropped, like the gallery's blank-entry filter. Non-array (or missing columns) → [].
 * @param {*} value
 * @param {Array<{id: string, type: string}>} columns
 * @returns {Array<object>}
 */
function sanitizeTableValue(value, columns) {
  if (!Array.isArray(value) || !Array.isArray(columns)) return [];
  const rows = [];
  for (const row of value) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const cleanRow = {};
    let hasContent = false;
    for (const col of columns) {
      const cell = sanitizeTableCell(row[col.id], col.type);
      cleanRow[col.id] = cell;
      if (String(cell).trim() !== "") hasContent = true;
    }
    if (hasContent) rows.push(cleanRow);
  }
  return rows;
}

const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Coerce a value to a valid "YYYY-MM-DD" calendar date string, or "" otherwise.
 * Rejects bad format and impossible dates (2026-13-40, 2026-02-30). Date-only and
 * timezone-agnostic — never constructs a Date from the raw string for the value
 * itself (Date.UTC is used only to count days in the month).
 */
export function sanitizeDateValue(value) {
  if (typeof value !== "string") return "";
  const m = DATE_ONLY_REGEX.exec(value);
  if (!m) return "";
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1) return "";
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > daysInMonth) return "";
  return value;
}

/**
 * Sanitize a single setting value based on its schema definition.
 * Only richtext and link types need active sanitization:
 * - richtext: DOMPurify strips dangerous HTML; `<img>` is kept only when the field's
 *   `allow_images` is set (output via | raw in templates)
 * - link: blocks javascript: protocol in hrefs
 * - text/textarea: handled by LiquidJS autoescape (no action needed here)
 * - code: intentionally raw (embeds, custom CSS/JS)
 * @param {*} value - The setting value
 * @param {object} setting - The schema setting (its `type` plus options like `allow_images`)
 * @returns {*} Sanitized value
 */
function sanitizeSettingValue(value, setting) {
  const type = setting?.type;
  // gallery and image are handled before the null guard so a null/undefined value still
  // normalizes (gallery → [], image → "") — the same invariant the theme sanitizer upholds,
  // so an image setting is always a safe string ("" or a valid path) everywhere.
  if (type === "gallery") return sanitizeGalleryValue(value);
  if (type === "image") return sanitizeImageSettingValue(value);
  if (type === "date") return sanitizeDateValue(value);
  if (value == null) return value;

  switch (type) {
    case "richtext":
      return sanitizeRichText(value, {
        allowImages: setting.allow_images === true,
        allowHeadings: setting.allow_headings === true,
      });
    case "link":
      return sanitizeLink(value);
    default:
      return value;
  }
}

/**
 * Build a lookup map from setting ID to its schema definition for fast access.
 * @param {Array} schemaSettings - Array of schema setting definitions
 * @returns {Map<string, object>} Map of setting ID → setting
 */
function buildSettingMap(schemaSettings) {
  const map = new Map();
  if (!Array.isArray(schemaSettings)) return map;
  for (const setting of schemaSettings) {
    if (setting.id && setting.type) {
      map.set(setting.id, setting);
    }
  }
  return map;
}

/**
 * Sanitize all widget settings and block settings based on their schema types.
 * Mutates resolvedWidgetData in place (it is already a deep clone at this point).
 *
 * This works in conjunction with LiquidJS autoescape:
 * - text/textarea fields: escaped by the Liquid engine automatically
 * - richtext fields: sanitized here with DOMPurify, then output with | raw in templates
 * - link fields: href validated here against dangerous protocols
 * - code fields: left untouched (intentionally raw)
 *
 * @param {object} resolvedWidgetData - Object with .settings and .blocks properties
 * @param {object} schema - Widget schema with .settings array and .blocks array
 */
// ============================================================================
// Theme Settings Validation
// ============================================================================

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;

/**
 * Sanitize a value for safe interpolation into a CSS <style> tag.
 * Strips <, >, {, } — these never appear in legitimate CSS values
 * (hex colors, font stacks, pixel values) but can cause style tag
 * breakout or CSS injection.
 * @param {*} value - The value to sanitize
 * @returns {*} Sanitized value (strings cleaned, non-strings returned as-is)
 */
export function sanitizeCssValue(value) {
  if (typeof value !== "string") return value;
  return value.replace(/[<>{}]/g, "");
}

function validateColor(value) {
  if (typeof value !== "string") return undefined;
  return HEX_COLOR_REGEX.test(value) ? value : undefined;
}

function validateNumber(value, schema) {
  const num = typeof value === "number" ? value : Number(value);
  if (isNaN(num)) return undefined;
  if (schema.min !== undefined && num < schema.min) return schema.min;
  if (schema.max !== undefined && num > schema.max) return schema.max;
  return num;
}

function validateCheckbox(value) {
  if (typeof value === "boolean") return value;
  return undefined;
}

function validateSelect(value, schema) {
  if (!Array.isArray(schema.options)) return value;
  const validValues = schema.options.map((opt) => opt.value);
  return validValues.includes(value) ? value : undefined;
}

function validateFontPicker(value) {
  if (!value || typeof value !== "object") return undefined;
  if (typeof value.stack !== "string") return undefined;
  const weight = typeof value.weight === "number" ? value.weight : Number(value.weight);
  if (isNaN(weight)) return undefined;
  return { stack: sanitizeCssValue(value.stack), weight };
}

/**
 * Validate and sanitize a single theme setting value based on its schema.
 * Invalid values fall back to the schema's default.
 * @param {*} value - The setting value
 * @param {object} schema - The full schema item (type, default, min, max, options, etc.)
 * @returns {{ value: *, corrected: boolean }} Validated/sanitized value and whether it was corrected
 */
function sanitizeThemeSettingValue(value, schema) {
  // gallery is handled before the null guard so a null/undefined value still
  // normalizes to [] (parity with the widget/collection sanitizer).
  if (schema.type === "gallery") {
    const sanitized = sanitizeGalleryValue(value);
    return { value: sanitized, corrected: JSON.stringify(sanitized) !== JSON.stringify(value) };
  }
  // image is handled BEFORE the null guard so a null/undefined value falls back to the sanitized
  // default rather than being preserved as `null` — which themeHelpers treats as a present value
  // and would let win over the default, erasing a good default like /default-logo.png. A valid
  // path is kept; an explicit "" clear is preserved; anything else reverts to the default.
  if (schema.type === "image") {
    const cleaned = sanitizeImageSettingValue(value);
    let img;
    if (cleaned !== "") img = cleaned;
    else if (typeof value === "string" && value.trim() === "") img = "";
    else img = sanitizeImageSettingValue(schema.default);
    return { value: img, corrected: JSON.stringify(img) !== JSON.stringify(value) };
  }
  if (value === undefined || value === null) return { value, corrected: false };

  let sanitized;
  switch (schema.type) {
    case "color":
      sanitized = validateColor(value) ?? schema.default;
      break;
    case "number":
    case "range":
      sanitized = validateNumber(value, schema) ?? schema.default;
      break;
    case "checkbox":
      sanitized = validateCheckbox(value) ?? schema.default;
      break;
    case "select":
    case "radio":
      sanitized = validateSelect(value, schema) ?? schema.default;
      break;
    case "font_picker":
      sanitized = validateFontPicker(value) ?? schema.default;
      break;
    case "text":
    case "textarea":
      if (typeof value !== "string") {
        sanitized = schema.default;
      } else {
        sanitized = schema.outputAsCssVar ? sanitizeCssValue(value) : value;
      }
      break;
    case "richtext":
      sanitized = sanitizeRichText(value, {
        allowImages: schema.allow_images === true,
        allowHeadings: schema.allow_headings === true,
      });
      break;
    case "link":
      sanitized = sanitizeLink(value);
      break;
    case "code":
      sanitized = value;
      break;
    case "date":
      sanitized = sanitizeDateValue(value);
      break;
    case "video":
    case "audio":
    case "icon":
    case "menu":
      sanitized = typeof value === "string" ? value : schema.default;
      break;
    case "youtube":
      sanitized = value && typeof value === "object" ? value : schema.default;
      break;
    default:
      sanitized = value;
      break;
  }

  // Check if the value was changed by sanitization
  const corrected = JSON.stringify(sanitized) !== JSON.stringify(value);
  return { value: sanitized, corrected };
}

/**
 * Sanitize all theme settings values based on their declared types.
 * Walks themeData.settings.global and validates each setting's value.
 * Returns a new object (does not mutate the input).
 * @param {object} themeData - The full theme.json data
 * @returns {{ data: object, warnings: string[] }} Sanitized theme data and any validation warnings
 */
export function sanitizeThemeSettings(themeData) {
  if (!themeData?.settings?.global) return { data: themeData, warnings: [] };

  const sanitized = JSON.parse(JSON.stringify(themeData));
  const warnings = [];

  for (const [, items] of Object.entries(sanitized.settings.global)) {
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (!item.id || !item.type || item.type === "header") continue;
      if (item.value !== undefined) {
        const result = sanitizeThemeSettingValue(item.value, item);
        if (result.corrected) {
          warnings.push(`"${item.label || item.id}" contained an invalid value and was reset.`);
        }
        item.value = result.value;
      }
    }
  }

  return { data: sanitized, warnings };
}

// ============================================================================
// Widget Data Sanitization
// ============================================================================

export function sanitizeWidgetData(resolvedWidgetData, schema) {
  // Sanitize top-level widget settings
  const settingsMap = buildSettingMap(schema.settings);

  if (resolvedWidgetData.settings) {
    for (const [key, value] of Object.entries(resolvedWidgetData.settings)) {
      const setting = settingsMap.get(key);
      if (setting) {
        resolvedWidgetData.settings[key] = sanitizeSettingValue(value, setting);
      }
    }
  }

  // Sanitize block settings
  if (resolvedWidgetData.blocks && Array.isArray(schema.blocks)) {
    const blockSettingMaps = new Map();
    for (const blockSchema of schema.blocks) {
      if (blockSchema.type) {
        blockSettingMaps.set(blockSchema.type, buildSettingMap(blockSchema.settings));
      }
    }

    for (const block of Object.values(resolvedWidgetData.blocks)) {
      if (!block || !block.settings || !block.type) continue;
      const settingMap = blockSettingMaps.get(block.type);
      if (!settingMap) continue;

      for (const [key, value] of Object.entries(block.settings)) {
        const setting = settingMap.get(key);
        if (setting) {
          block.settings[key] = sanitizeSettingValue(value, setting);
        }
      }
    }
  }
}

// ============================================================================
// Collection Item Data Sanitization
// ============================================================================

/**
 * Sanitize a collection item's settings in place, driven by the collection
 * schema's field types. This is the item-level equivalent of sanitizeWidgetData:
 * collection items carry the same field types as widgets (richtext, link, text,
 * code, …) and their templates render richtext with | raw and emit link hrefs,
 * so they need the same protection.
 *
 * Same rules as widget settings:
 * - richtext: DOMPurify strips dangerous HTML (output via | raw in templates)
 * - link: href validated against dangerous protocols
 * - text/textarea: left for LiquidJS autoescape
 * - code: left untouched (intentionally raw)
 *
 * Collection items have flat settings (no blocks in v1 schemas), so a single
 * pass over top-level settings suffices. Callers pass a clone (items are
 * rendered from a resolved clone), so mutating in place never touches disk.
 *
 * @param {object} item - Collection item with a .settings object
 * @param {object} schema - Collection-type schema with a .settings array
 */
export function sanitizeCollectionItemData(item, schema) {
  if (!item || !item.settings || !schema) return;

  // id -> setting (not just type): a `table` needs its column defs to sanitize cells per column.
  const settingMap = new Map();
  if (Array.isArray(schema.settings)) {
    for (const s of schema.settings) {
      if (s.id && s.type) settingMap.set(s.id, s);
    }
  }
  for (const [key, value] of Object.entries(item.settings)) {
    const setting = settingMap.get(key);
    if (!setting) continue;
    if (setting.type === "table") {
      item.settings[key] = sanitizeTableValue(value, setting.columns);
    } else {
      item.settings[key] = sanitizeSettingValue(value, setting);
    }
  }
}
