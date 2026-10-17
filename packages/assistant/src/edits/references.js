import { toolError } from "../errors.js";

const MEDIA_KEYS = new Set(["media", "file", "note"]);
const LINK_KEYS = new Set(["text", "target", "page", "item"]);

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isMediaRef = (value) => isObject(value) && "media" in value && Object.keys(value).every((key) => MEDIA_KEYS.has(key));
const isPageOrItemLink = (value) =>
  isObject(value) && ("page" in value || "item" in value) && Object.keys(value).every((key) => LINK_KEYS.has(key));

/**
 * Turn the references the read tools hand out into stored values: `{ media: id }` into the
 * library file's path, and `{ text, page }` / `{ text, item: { type, slug } }` into the
 * editor's stable link shape. Anything that doesn't resolve on the open site is refused.
 */
export async function resolveReferences(operations, { reader, scope, lang }) {
  let schemas = null;
  const slugPrefix = async (type) => {
    schemas ??= await reader.collectionSchemas(scope);
    const schema = schemas.find((entry) => entry.type === type);
    return schema?.slugPrefix ?? type;
  };

  async function resolve(value) {
    if (Array.isArray(value)) return Promise.all(value.map(resolve));
    if (isMediaRef(value)) {
      if (!value.media) {
        throw toolError("INVALID_EDIT", `"${value.file}" isn't in the media library, so it can't be set again; leave that setting out to keep it.`);
      }
      const file = await reader.mediaFile(scope, String(value.media));
      if (!file?.path) throw toolError("INVALID_EDIT", `There's no media "${value.media}" in this site's library. Use an id from list_media.`);
      return file.path;
    }
    if (isPageOrItemLink(value)) {
      const link = { text: value.text ?? "", target: value.target ?? "_self" };
      if (typeof value.page === "string") {
        const page = await reader.readPage(scope, value.page, lang);
        if (!page?.uuid) throw toolError("INVALID_EDIT", `There's no page "${value.page}" in ${lang.language} to link to.`);
        return { ...link, href: `${value.page}.html`, pageUuid: page.uuid };
      }
      const { type, slug } = isObject(value.item) ? value.item : {};
      const item = type && slug ? await reader.collectionItem(scope, String(type), String(slug), lang).catch(() => null) : null;
      if (!item?.uuid) throw toolError("INVALID_EDIT", `There's no ${type ?? "collection"} item "${slug}" in ${lang.language} to link to.`);
      return { ...link, href: `${await slugPrefix(type)}/${slug}.html`, collectionType: type, collectionItemUuid: item.uuid };
    }
    if (isObject(value)) {
      const out = {};
      for (const [key, entry] of Object.entries(value)) out[key] = await resolve(entry);
      return out;
    }
    return value;
  }

  const resolveSettings = async (settings) => {
    if (!isObject(settings)) return settings;
    const out = {};
    for (const [key, value] of Object.entries(settings)) out[key] = await resolve(value);
    return out;
  };

  const resolved = [];
  for (const operation of operations) {
    const next = { ...operation };
    if (operation.settings) next.settings = await resolveSettings(operation.settings);
    if (operation.blocks) {
      next.blocks = [];
      for (const block of operation.blocks) next.blocks.push({ ...block, settings: await resolveSettings(block.settings) });
    }
    resolved.push(next);
  }
  return resolved;
}
