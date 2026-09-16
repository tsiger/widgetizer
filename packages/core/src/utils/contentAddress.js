/**
 * Every storage key, output path, public URL, usage id and preview route is
 * built here, so no caller assembles `pages/<lang>/...` itself. Builders take
 * `{ language, defaultLanguage }`: the default language owns the root and the
 * others get a folder named by their code. Storage nests that folder under a
 * collection type (`collections/news/el/story.json`) while output puts it first
 * (`el/news/story.html`).
 */
import { prefixInternalHref } from "./linkPrefixer.js";
import { DEFAULT_LANGUAGE, LANGUAGE_CODE_RE, normalizeLanguageCode } from "./languages.js";

const RESERVED_PAGE_SLUGS = new Set(["page"]);
const RESERVED_ITEM_SLUGS = new Set(["index", "page"]);
const RESERVED_SLUG_PREFIXES = new Set(["assets"]);

export function isHomeSlug(slug) {
  return slug === "index" || slug === "home";
}

/** Persisted default-language content carries no language; a loaded model always does. */
export function resolveLanguage(persisted, defaultLanguage) {
  return normalizeLanguageCode(persisted) || normalizeLanguageCode(defaultLanguage) || DEFAULT_LANGUAGE;
}

/** "" for the default language. A missing `defaultLanguage` reads as `DEFAULT_LANGUAGE`, like a fresh project row. */
export function languageFolder({ language, defaultLanguage } = {}) {
  const code = normalizeLanguageCode(language);
  if (!code || code === resolveLanguage("", defaultLanguage)) return "";
  if (!LANGUAGE_CODE_RE.test(code)) throw new TypeError(`Invalid language code: ${language}`);
  return code;
}

const join = (...segments) => segments.filter(Boolean).join("/");

/** `languages` is the project's additional codes. They are reserved at the root only: `pages/el/it.json` is the Greek page named "it". */
export function isReservedPageSlug(slug, { languages = [], language, defaultLanguage } = {}) {
  if (RESERVED_PAGE_SLUGS.has(slug)) return true;
  return !languageFolder({ language, defaultLanguage }) && languages.includes(slug);
}

export function isReservedItemSlug(slug) {
  return RESERVED_ITEM_SLUGS.has(slug);
}

export function isReservedSlugPrefix(prefix, { languages = [] } = {}) {
  return RESERVED_SLUG_PREFIXES.has(prefix) || languages.includes(prefix);
}

export function pagesDir(lang) {
  return join("pages", languageFolder(lang));
}

export function pageKey(slug, lang) {
  return `${pagesDir(lang)}/${slug}.json`;
}

export function globalsDir(lang) {
  return `${pagesDir(lang)}/global`;
}

export function globalKey(type, lang) {
  return `${globalsDir(lang)}/${type}.json`;
}

export function menusDir(lang) {
  return join("menus", languageFolder(lang));
}

export function menuKey(id, lang) {
  return `${menusDir(lang)}/${id}.json`;
}

export function itemsDir(type, lang) {
  return join("collections", type, languageFolder(lang));
}

export function itemKey(type, slug, lang) {
  return `${itemsDir(type, lang)}/${slug}.json`;
}

const KEY_SHAPES = [
  ["global", /^pages\/(?:(?<lang>[^/]+)\/)?global\/(?<type>[^/]+)\.json$/],
  ["page", /^pages\/(?:(?<lang>[^/]+)\/)?(?<slug>[^/]+)\.json$/],
  ["menu", /^menus\/(?:(?<lang>[^/]+)\/)?(?<id>[^/]+)\.json$/],
  ["item", /^collections\/(?<type>[^/]+)\/(?:(?<lang>[^/]+)\/)?(?<slug>[^/]+)\.json$/],
];

/** Inverse of the key builders. `language` is the folder as persisted ("" at the root); null for a key no builder produces. */
export function parseContentKey(key) {
  if (typeof key !== "string") return null;
  for (const [kind, re] of KEY_SHAPES) {
    const match = re.exec(key);
    if (!match) continue;
    const { lang = "", ...fields } = match.groups;
    if (lang && !LANGUAGE_CODE_RE.test(lang)) return null;
    return { kind, language: lang, ...fields };
  }
  return null;
}

export function languageFromKey(key) {
  return parseContentKey(key)?.language ?? null;
}

export function pageOutputPath(slug, pageNumber = 1, lang) {
  let file;
  if (pageNumber > 1) file = isHomeSlug(slug) ? `page/${pageNumber}.html` : `${slug}/page/${pageNumber}.html`;
  else file = isHomeSlug(slug) ? "index.html" : `${slug}.html`;
  return join(languageFolder(lang), file);
}

export function itemOutputPath(slugPrefix, slug, lang) {
  return join(languageFolder(lang), slugPrefix, `${slug}.html`);
}

/** Only the root `index.html` is a directory here: `news/index.html` may be a legacy item, so a language homepage is collapsed by `homeHref`, which knows it is one. */
export function publicPath(outputPath, { cleanUrls = false } = {}) {
  if (!cleanUrls) return outputPath;
  if (outputPath === "index.html") return "";
  return outputPath.replace(/\.html$/, "");
}

export function outputHref(outputPath, { cleanUrls = false, outputPathPrefix = "" } = {}) {
  const path = publicPath(outputPath, { cleanUrls });
  if (!path) return outputPathPrefix || "./";
  return prefixInternalHref(path, outputPathPrefix);
}

/** A homepage under Clean URLs is its directory: `./` (or the depth alone) at the root, `el/` for a language. */
export function homeHref({ cleanUrls = false, outputPathPrefix = "", language, defaultLanguage } = {}) {
  const folder = languageFolder({ language, defaultLanguage });
  if (!cleanUrls) return prefixInternalHref(join(folder, "index.html"), outputPathPrefix);
  return folder ? prefixInternalHref(`${folder}/`, outputPathPrefix) : outputPathPrefix || "./";
}

export function pagedHref(slug, pageNumber, opts = {}) {
  if (!(pageNumber > 1) && isHomeSlug(slug)) return homeHref(opts);
  return outputHref(pageOutputPath(slug, pageNumber, opts), opts);
}

/** `el/page/2` is the Greek homepage's copy only when `el` is in `languages`; otherwise it is a root page slugged `el`. */
export function parsePagedPath(path, { languages = [] } = {}) {
  const match = /^(?:([a-z0-9-]+)\/)?(?:([a-z0-9-]+)\/)?page\/([1-9]\d*)(?:\.html)?$/.exec(path || "");
  if (!match) return null;
  const segments = [match[1], match[2]].filter(Boolean);
  const pageNumber = Number(match[3]);
  if (segments.length === 2) return { language: segments[0], slug: segments[1], pageNumber };
  if (segments.length === 1 && languages.includes(segments[0])) {
    return { language: segments[0], slug: "index", pageNumber };
  }
  return { language: "", slug: segments[0] || "index", pageNumber };
}

export const usageId = {
  page: (uuid) => `page:${uuid}`,
  item: (uuid) => `collection:${uuid}`,
  global: (type, lang) => `global:${languageFolder(lang) || "root"}:${type}`,
};

// Always namespaced and always a resolved language: `/preview/el/contact` could be a language or a collection prefix.
export const previewRoute = {
  page: (slug, { pageNumber = 1, language, defaultLanguage } = {}) => {
    const base = `/preview/page/${resolveLanguage(language, defaultLanguage)}/${slug}`;
    return pageNumber > 1 ? `${base}/page/${pageNumber}` : base;
  },
  item: (slugPrefix, slug, { language, defaultLanguage } = {}) =>
    `/preview/collection/${resolveLanguage(language, defaultLanguage)}/${slugPrefix}/${slug}`,
};

export function parsePreviewRoute(path) {
  const value = typeof path === "string" ? path : "";
  let match = /^\/preview\/page\/([^/]+)\/([^/]+)(?:\/page\/([1-9]\d*))?$/.exec(value);
  if (match && LANGUAGE_CODE_RE.test(match[1])) {
    return { kind: "page", language: match[1], slug: match[2], pageNumber: match[3] ? Number(match[3]) : 1 };
  }
  match = /^\/preview\/collection\/([^/]+)\/([^/]+)\/([^/]+)$/.exec(value);
  if (match && LANGUAGE_CODE_RE.test(match[1])) {
    return { kind: "item", language: match[1], slugPrefix: match[2], slug: match[3] };
  }
  return null;
}

export function pagedPreviewPath(slug, pageNumber) {
  return pageNumber > 1 ? `/preview/paged/${slug}/${pageNumber}` : `/preview/${slug}`;
}
