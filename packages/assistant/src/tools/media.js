import { toolError } from "../errors.js";
import { limitArg, offsetArg, page } from "./shared.js";

const MAX_THUMBNAILS = 12;
const MAX_USAGE = 20;
const THUMBNAIL_BYTES = 40 * 1024;
const VIEW_BYTES = 1024 * 1024;
const SIZE_ORDER = ["large", "medium", "small", "thumb"];

const IMAGE_TYPES = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };

function rasterType(path) {
  const extension = String(path).split(".").pop()?.toLowerCase();
  return IMAGE_TYPES[extension] ?? null;
}

function mediaDto(file, { allUsage = false } = {}) {
  return {
    id: file.id,
    file: file.filename,
    originalName: file.originalName,
    type: file.type,
    ...(file.width ? { width: file.width, height: file.height } : {}),
    description: file.metadata,
    // Per language: a field that is null inherits the main language's text; ""
    // was deliberately left blank.
    ...(Object.keys(file.translations ?? {}).length ? { translations: file.translations } : {}),
    usedIn: allUsage ? file.usedIn : file.usedIn.slice(0, MAX_USAGE),
    ...(!allUsage && file.usedIn.length > MAX_USAGE ? { usedInTotal: file.usedIn.length, allUsageWith: { tool: "view_image", id: file.id } } : {}),
  };
}

async function imageFrom(ctx, scope, path, maxBytes, labelText) {
  const mimeType = rasterType(path);
  if (!mimeType) return { unavailable: "unsupported" };
  const read = await ctx.reader.uploadBytes(scope, path, maxBytes);
  if (read.unavailable) return read;
  return { image: { data: read.bytes.toString("base64"), mimeType, label: labelText } };
}

export const listMediaTool = {
  name: "list_media",
  title: "Browse media",
  description:
    "Pages through the open site's media library, newest first: each file's ID, size, descriptions (alt, title, caption, per language) and where it's used. Set thumbnails to see small previews. File names and descriptions are hints, not proof of what an image shows.",
  inputSchema: {
    type: "object",
    properties: {
      offset: offsetArg,
      limit: limitArg(50),
      search: { type: "string", maxLength: 100, description: "Match file names and descriptions." },
      thumbnails: { type: "boolean", description: `Include small previews of up to ${MAX_THUMBNAILS} images.` },
    },
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  async run(ctx) {
    const { offset = 0, limit = 20, search = "", thumbnails = false } = ctx.args;
    const { scope } = await ctx.openSite();
    const { files, total } = await ctx.reader.mediaPage(scope, { offset, limit, search });
    const items = files.map(mediaDto);
    const images = [];
    if (thumbnails) {
      for (const [index, file] of files.entries()) {
        if (images.length >= MAX_THUMBNAILS) {
          items[index].thumbnail = "limit";
          continue;
        }
        const source = file.sizes?.thumb?.path ?? file.sizes?.small?.path ?? file.path;
        const result = await imageFrom(ctx, scope, source, THUMBNAIL_BYTES, `Thumbnail of ${file.id} (${file.filename})`);
        if (result.image) {
          images.push({ ...result.image, mediaId: file.id });
          items[index].thumbnail = "attached";
        } else {
          items[index].thumbnail = result.unavailable;
        }
      }
    }
    return {
      data: {
        ...ctx.about(),
        media: items,
        ...page({ offset, limit, total }),
        usageNote: "usedIn comes from the usage index; older content may not be fully indexed.",
      },
      images,
    };
  },
};

export const viewImageTool = {
  name: "view_image",
  title: "View an image",
  description: "Shows one image from the media library at a larger size, so you can judge what it shows and whether it suits a place.",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", minLength: 1, maxLength: 100, description: "A media ID from list_media." },
      size: { type: "string", enum: ["small", "medium", "large"], description: "Preferred size (default medium)." },
    },
    required: ["id"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  async run(ctx) {
    const { id, size = "medium" } = ctx.args;
    const { scope } = await ctx.openSite();
    const file = await ctx.reader.mediaFile(scope, id);
    if (!file) throw toolError("MEDIA_NOT_FOUND", `There's no media file "${id}" in this site's library.`);
    if (!rasterType(file.path)) {
      return { data: { ...ctx.about(), media: mediaDto(file, { allUsage: true }), image: "unsupported", note: "Only JPEG, PNG, WebP and GIF images can be shown." } };
    }

    const candidates = SIZE_ORDER.slice(SIZE_ORDER.indexOf(size))
      .map((name) => file.sizes?.[name]?.path)
      .filter(Boolean);
    candidates.push(file.path);
    let reason = "missing";
    for (const path of candidates) {
      const result = await imageFrom(ctx, scope, path, VIEW_BYTES, `${file.id} (${file.filename})`);
      if (result.image) return { data: { ...ctx.about(), media: mediaDto(file, { allUsage: true }), image: "attached" }, images: [{ ...result.image, mediaId: file.id }] };
      reason = result.unavailable;
    }
    return { data: { ...ctx.about(), media: mediaDto(file, { allUsage: true }), image: reason === "too-large" ? "too-large" : "missing" } };
  },
};
