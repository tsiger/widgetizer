import path from "path";
import { EDITOR_LIMITS } from "../limits.js";

/**
 * Check whether a value exceeds a platform limit.
 *
 * In open-source mode (hostedMode=false), limits are bypassed unless
 * `alwaysEnforce` is true (used for safety limits like ZIP bombs and
 * image decompression protection).
 *
 * Two modes:
 *   exclusive (default) — fails when currentValue >= maxValue.
 *     Use for pre-create count checks: "I have N items, can I add one more?"
 *
 *   inclusive (exclusive: false) — fails when currentValue > maxValue.
 *     Use for absolute value validations: "is this value within bounds?"
 *     With this mode, having exactly maxValue is allowed.
 *
 * @param {number} currentValue - Current count / size to check
 * @param {number} maxValue     - The limit from EDITOR_LIMITS
 * @param {string} label        - Human-readable label for error messages (e.g. "pages per project")
 * @param {object} [opts]
 * @param {boolean} [opts.alwaysEnforce=false] - Enforce even in open-source mode
 * @param {boolean} [opts.exclusive=true]      - true: >= fails (pre-create); false: > fails (value check)
 * @param {boolean} [opts.hostedMode=false]    - Whether the platform is running in hosted mode (set via app.locals.hostedMode)
 * @returns {{ ok: boolean, error?: string }}
 */
export function checkLimit(currentValue, maxValue, label, { alwaysEnforce = false, exclusive = true, hostedMode = false } = {}) {
  if (!hostedMode && !alwaysEnforce) {
    return { ok: true };
  }

  if (maxValue == null) {
    return { ok: true };
  }

  const exceeded = exclusive ? currentValue >= maxValue : currentValue > maxValue;

  if (exceeded) {
    return {
      ok: false,
      error: `Limit reached: maximum ${maxValue} ${label} allowed`,
    };
  }

  return { ok: true };
}

/**
 * Check a string field against a max length.
 *
 * @param {string} value    - The string to check
 * @param {number} maxLen   - Maximum allowed length
 * @param {string} fieldName - Human-readable field name for error messages
 * @param {object} [opts]
 * @param {boolean} [opts.alwaysEnforce=false]
 * @param {boolean} [opts.hostedMode=false] - Whether the platform is running in hosted mode (set via app.locals.hostedMode)
 * @returns {{ ok: boolean, error?: string }}
 */
export function checkStringLength(value, maxLen, fieldName, { alwaysEnforce = false, hostedMode = false } = {}) {
  if (!hostedMode && !alwaysEnforce) {
    return { ok: true };
  }

  if (maxLen == null || typeof value !== "string") {
    return { ok: true };
  }

  if (value.length > maxLen) {
    return {
      ok: false,
      error: `${fieldName} is too long (${value.length} characters, maximum ${maxLen})`,
    };
  }

  return { ok: true };
}

/**
 * Validate ZIP entries before extraction.
 * Checks entry count and path traversal attempts.
 * Always enforced regardless of hosted mode.
 *
 * @param {import("adm-zip")} zip - adm-zip instance
 * @param {number} [maxEntries] - Max allowed entries (defaults to EDITOR_LIMITS.maxZipEntries)
 * @returns {{ ok: boolean, error?: string }}
 */
export function validateZipEntries(zip, maxEntries = EDITOR_LIMITS.maxZipEntries) {
  const entries = zip.getEntries();

  if (entries.length > maxEntries) {
    return {
      ok: false,
      error: `ZIP contains too many entries (${entries.length}, maximum ${maxEntries})`,
    };
  }

  for (const entry of entries) {
    const normalized = path.normalize(entry.entryName);
    if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
      return {
        ok: false,
        error: `ZIP contains unsafe path: ${entry.entryName}`,
      };
    }
  }

  return { ok: true };
}

/**
 * Clamp a numeric value to a ceiling. Used for capping user-configurable
 * app settings to platform maximums.
 *
 * @param {number} value   - The user-provided value
 * @param {number} ceiling - The platform maximum
 * @returns {number} The clamped value
 */
export function clampToCeiling(value, ceiling) {
  if (typeof value !== "number" || typeof ceiling !== "number") {
    return value;
  }
  return Math.min(value, ceiling);
}
