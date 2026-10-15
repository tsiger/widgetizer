import { toolError } from "../errors.js";

export const TEXT_PART_CHARS = 12000;
export const RESULT_BUDGET_CHARS = 40000;

export const languageArg = {
  type: "string",
  pattern: "^[a-z]{2}(-[a-z0-9]{2,8})?$",
  description: "A language code of this site, e.g. en or el. Defaults to the site's main language.",
};

// Page slugs and menu ids are single names: whatever a theme shipped, but never
// a path. The same rule the editor's routes enforce.
export const nameArg = (description) => ({
  type: "string",
  minLength: 1,
  maxLength: 200,
  pattern: "^(?!\\.{1,2}$)[^/\\\\\\u0000]+$",
  description,
});

export const partArg = {
  type: "integer",
  minimum: 1,
  maximum: 1000,
  description: "Which part of a long text to return (1 = the start). Results say how many parts there are.",
};

export const offsetArg = { type: "integer", minimum: 0, maximum: 100000, description: "How many entries to skip." };
export const limitArg = (max, description = `How many entries to return (at most ${max}).`) => ({
  type: "integer",
  minimum: 1,
  maximum: max,
  description,
});

/** One part of a long text, with how many parts there are in all. */
export function textPart(text, part = 1, size = TEXT_PART_CHARS) {
  const value = text ?? "";
  const parts = Math.max(1, Math.ceil(value.length / size));
  if (part > parts) throw toolError("ASSISTANT_INVALID_ARGUMENTS", `part must be at most ${parts}.`);
  return { text: value.slice((part - 1) * size, part * size), part, parts };
}

export function page({ offset = 0, limit, total }) {
  return { offset, limit, total, hasMore: offset + limit < total };
}

/** Resolve a `tTheme:` label key against the label locale; anything else is returned as-is. */
export function label(value, locale) {
  if (typeof value !== "string" || !value.startsWith("tTheme:")) return value;
  const key = value.slice("tTheme:".length);
  let node = locale;
  for (const segment of key.split(".")) {
    if (node == null || typeof node !== "object") return key;
    node = node[segment];
  }
  return typeof node === "string" ? node : key;
}

const UPLOAD_PREFIX = "/uploads/";
// Upload references inside HTML (rich text): image sources and file links.
const EMBEDDED_UPLOAD = /\b(?:src|href)\s*=\s*["'](\/uploads\/[^"'?#]+)/g;

export const isUploadPath = (value) => typeof value === "string" && value.startsWith(UPLOAD_PREFIX);

export function embeddedUploads(text) {
  return typeof text === "string" ? [...text.matchAll(EMBEDDED_UPLOAD)].map((match) => match[1]) : [];
}

/** Every uploaded-file path referenced anywhere in a value, rich text included. */
export function collectUploadPaths(value, into = new Set()) {
  if (isUploadPath(value)) into.add(value);
  else if (typeof value === "string") embeddedUploads(value).forEach((path) => into.add(path));
  else if (Array.isArray(value)) value.forEach((item) => collectUploadPaths(item, into));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => collectUploadPaths(item, into));
  return into;
}

const mediaRef = (path, mediaIds) => {
  const id = mediaIds.get(path) ?? null;
  return { media: id, file: path.split("/").pop(), ...(id ? {} : { note: "Not in the media library." }) };
};

/**
 * Replace stored upload paths with media references the assistant can use; the
 * storage path itself never leaves the app. Rich text keeps its HTML, and the
 * files it embeds are listed beside it.
 */
export function withMediaRefs(value, mediaIds) {
  if (isUploadPath(value)) return mediaRef(value, mediaIds);
  if (Array.isArray(value)) return value.map((item) => withMediaRefs(item, mediaIds));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, withMediaRefs(item, mediaIds)]));
  }
  return value;
}

/** The media embedded in a settings object's rich text, by setting. */
export function embeddedMedia(settings, mediaIds) {
  const found = [];
  for (const [key, value] of Object.entries(settings ?? {})) {
    for (const path of new Set(embeddedUploads(value))) found.push({ setting: key, ...mediaRef(path, mediaIds) });
  }
  return found;
}

const SHORTEN_STEPS = [4000, 1500, 500];
const PREVIEW_CHARS = 300;

/**
 * Shorten an object's values until it fits the budget: any value whose text is
 * longer than the current step becomes a stub naming the field that reads it in
 * full. Returns whether it fits at the last step.
 */
export function fitSettings(settings, fieldPrefix, budget) {
  let current = settings;
  for (const step of SHORTEN_STEPS) {
    current = Object.fromEntries(
      Object.entries(settings).map(([key, value]) => {
        const text = typeof value === "string" ? value : JSON.stringify(value);
        if (!text || text.length <= step) return [key, value];
        return [
          key,
          { longValue: true, length: text.length, start: text.slice(0, PREVIEW_CHARS), readWith: { field: `${fieldPrefix}${key}` } },
        ];
      }),
    );
    if (JSON.stringify(current).length <= budget) return { settings: current, fits: true };
  }
  return { settings: current, fits: false };
}

/** A value read in full, in parts: text as it is, anything else as JSON. */
export function valuePart(value, part) {
  return textPart(typeof value === "string" ? value : JSON.stringify(value, null, 2), part ?? 1);
}

export function listAvailable(names, max = 30) {
  const shown = names.slice(0, max).join(", ");
  return names.length > max ? `${shown}, … (${names.length} in all)` : shown || "none";
}
