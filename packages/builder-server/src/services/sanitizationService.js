import DOMPurify from "isomorphic-dompurify";

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
      sanitized = sanitizeRichText(value);
      break;
    case "link":
      sanitized = sanitizeLink(value);
      break;
    case "code":
      sanitized = value;
      break;
    case "image":
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
