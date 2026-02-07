import DOMPurify from "isomorphic-dompurify";

/**
 * DOMPurify configuration for richtext fields.
 * Allows only the safe inline formatting tags produced by the Tiptap editor.
 * Text and textarea fields are handled by LiquidJS autoescape (outputEscape: "escape").
 */
const RICHTEXT_CONFIG = {
  ALLOWED_TAGS: ["p", "strong", "em", "a", "br", "span", "ul", "ol", "li"],
  ALLOWED_ATTR: ["href", "target", "rel", "class"],
  ALLOW_DATA_ATTR: false,
};

/**
 * Dangerous URL protocols that should be blocked in href attributes.
 */
const DANGEROUS_PROTOCOLS = /^\s*(javascript|data|vbscript)\s*:/i;

/**
 * Sanitize richtext HTML, allowing only safe formatting tags.
 * Used for richtext fields before they are output with | raw in templates.
 * @param {string} value - The raw HTML from the richtext editor
 * @returns {string} Sanitized HTML with only allowed tags
 */
export function sanitizeRichText(value) {
  if (typeof value !== "string") return value;
  return DOMPurify.sanitize(value, RICHTEXT_CONFIG);
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

  if (typeof sanitized.href === "string" && DANGEROUS_PROTOCOLS.test(sanitized.href)) {
    sanitized.href = "";
  }

  return sanitized;
}

/**
 * Sanitize a single setting value based on its schema-declared type.
 * Only richtext and link types need active sanitization:
 * - richtext: DOMPurify strips dangerous HTML (output via | raw in templates)
 * - link: blocks javascript: protocol in hrefs
 * - text/textarea: handled by LiquidJS autoescape (no action needed here)
 * - code: intentionally raw (embeds, custom CSS/JS)
 * @param {*} value - The setting value
 * @param {string} type - The schema type
 * @returns {*} Sanitized value
 */
function sanitizeSettingValue(value, type) {
  if (value == null) return value;

  switch (type) {
    case "richtext":
      return sanitizeRichText(value);
    case "link":
      return sanitizeLink(value);
    default:
      return value;
  }
}

/**
 * Build a lookup map from setting ID to schema type for fast access.
 * @param {Array} schemaSettings - Array of schema setting definitions
 * @returns {Map<string, string>} Map of setting ID → type
 */
function buildTypeMap(schemaSettings) {
  const map = new Map();
  if (!Array.isArray(schemaSettings)) return map;
  for (const setting of schemaSettings) {
    if (setting.id && setting.type) {
      map.set(setting.id, setting.type);
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
export function sanitizeWidgetData(resolvedWidgetData, schema) {
  // Sanitize top-level widget settings
  const settingsTypeMap = buildTypeMap(schema.settings);

  if (resolvedWidgetData.settings) {
    for (const [key, value] of Object.entries(resolvedWidgetData.settings)) {
      const type = settingsTypeMap.get(key);
      if (type) {
        resolvedWidgetData.settings[key] = sanitizeSettingValue(value, type);
      }
    }
  }

  // Sanitize block settings
  if (resolvedWidgetData.blocks && Array.isArray(schema.blocks)) {
    const blockTypeMaps = new Map();
    for (const blockSchema of schema.blocks) {
      if (blockSchema.type) {
        blockTypeMaps.set(blockSchema.type, buildTypeMap(blockSchema.settings));
      }
    }

    for (const block of Object.values(resolvedWidgetData.blocks)) {
      if (!block || !block.settings || !block.type) continue;
      const typeMap = blockTypeMaps.get(block.type);
      if (!typeMap) continue;

      for (const [key, value] of Object.entries(block.settings)) {
        const type = typeMap.get(key);
        if (type) {
          block.settings[key] = sanitizeSettingValue(value, type);
        }
      }
    }
  }
}
