import { LIMIT_KEYS } from "@widgetizer/core/adapters";

/** Per-file upload limit when no limits adapter is wired. */
export const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * SVGs are sanitized as one string in memory, so they get a ceiling of their own
 * whatever the per-file limit is.
 */
export const MAX_SVG_UPLOAD_BYTES = 5 * 1024 * 1024;

/** File parts one media upload request may carry. */
export const MAX_UPLOAD_FILES = 10;

/**
 * The per-file media upload limit in bytes, from the limits adapter's
 * MAX_UPLOAD_SIZE_BYTES. `Infinity` means no per-file limit. Without a limits
 * adapter (or one that answers with something that is not a number) the
 * DEFAULT_MAX_UPLOAD_BYTES applies.
 * @param {object | undefined} adapters - req.adapters
 * @param {object} scope - req.scope
 * @returns {Promise<number>}
 */
export async function getMaxUploadBytes(adapters, scope) {
  const limits = adapters?.limits;
  if (typeof limits?.getLimit !== "function") return DEFAULT_MAX_UPLOAD_BYTES;
  const value = await limits.getLimit(scope, LIMIT_KEYS.MAX_UPLOAD_SIZE_BYTES);
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) return DEFAULT_MAX_UPLOAD_BYTES;
  return value;
}
