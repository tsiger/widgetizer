import { toolError } from "../errors.js";
import {
  RESULT_BUDGET_CHARS,
  collectUploadPaths,
  embeddedMedia,
  fitSettings,
  label,
  languageArg,
  limitArg,
  listAvailable,
  nameArg,
  offsetArg,
  page,
  partArg,
  valuePart,
  withMediaRefs,
} from "./shared.js";

const fieldArg = {
  type: "string",
  maxLength: 500,
  description: 'A long value to read in full: the "readWith.field" a previous result gave.',
};

/** Pages of every language with their translation groups. */
async function pagesByLanguage(ctx, scope) {
  const main = ctx.language();
  const result = new Map();
  for (const code of [main.defaultLanguage, ...main.languages]) {
    const lang = ctx.language(code);
    const pages = [];
    for (const slug of await ctx.reader.listPageSlugs(scope, lang)) {
      try {
        const doc = await ctx.reader.readPage(scope, slug, lang);
        if (doc) pages.push({ slug, name: doc.name ?? slug, group: doc.translationGroupId || doc.uuid || null });
      } catch {
        pages.push({ slug, name: slug, group: null, unreadable: true });
      }
    }
    result.set(code, pages);
  }
  return result;
}

async function sectionContext(ctx, scope, lang, doc) {
  const [schemas, locale] = await Promise.all([ctx.reader.widgetSchemas(scope, lang), ctx.reader.labelLocale(scope)]);
  const mediaIds = await ctx.reader.mediaIds(scope, [...collectUploadPaths(doc)]);
  return { schemasByType: new Map(schemas.map((schema) => [schema.type, schema])), locale, mediaIds };
}

function settingsDto(settings, mediaIds) {
  const media = embeddedMedia(settings, mediaIds);
  return { settings: withMediaRefs(settings ?? {}, mediaIds), ...(media.length ? { mediaInText: media } : {}) };
}

function sectionDto(id, widget, { schemasByType, locale, mediaIds }) {
  const schema = schemasByType.get(widget?.type);
  const blocks = widget?.blocks ?? {};
  const blocksOrder = Array.isArray(widget?.blocksOrder) ? widget.blocksOrder : Object.keys(blocks);
  return {
    id,
    type: widget?.type ?? null,
    name: schema ? label(schema.displayName, locale) : null,
    ...(schema ? {} : { note: "This section type isn't available in the theme, so it won't render." }),
    ...settingsDto(widget?.settings, mediaIds),
    blocks: blocksOrder
      .filter((blockId) => blocks[blockId])
      .map((blockId) => ({ id: blockId, type: blocks[blockId].type, ...settingsDto(blocks[blockId].settings, mediaIds) })),
  };
}

const size = (value) => JSON.stringify(value).length;

/** Shorten every setting of a section (and its blocks) so the section fits `budget`. */
function fitSection(section, budget) {
  const perBlock = Math.max(1000, Math.floor(budget / (section.blocks.length + 1)));
  const own = fitSettings(section.settings, `${section.id}/`, perBlock).settings;
  const blocks = section.blocks.map((block) => ({
    ...block,
    settings: fitSettings(block.settings, `${section.id}/${block.id}/`, perBlock).settings,
  }));
  return { ...section, settings: own, blocks };
}

/**
 * One section too big to return whole: its blocks in pages that fit, from
 * `blockOffset`, with where to continue.
 */
function sectionBlocksPage(section, blockOffset, budget, continueArgs) {
  const shortHead = { ...section, blocks: [], settings: fitSettings(section.settings, `${section.id}/`, budget / 4).settings };
  const blocks = [];
  let used = size(shortHead);
  for (let index = blockOffset; index < section.blocks.length; index += 1) {
    const block = section.blocks[index];
    const fitted = { ...block, settings: fitSettings(block.settings, `${section.id}/${block.id}/`, budget / 4).settings };
    if (blocks.length > 0 && used + size(fitted) > budget) break;
    blocks.push(fitted);
    used += size(fitted);
  }
  const next = blockOffset + blocks.length;
  return {
    ...shortHead,
    blocks,
    blockRange: { from: blockOffset, to: next, total: section.blocks.length },
    ...(next < section.blocks.length ? { continueWith: { ...continueArgs, blockOffset: next } } : {}),
  };
}

function fieldValue(doc, field) {
  const segments = field.split("/");
  if (segments.length < 2 || segments.length > 3) return undefined;
  const widget = doc.widgets?.[segments[0]];
  if (!widget) return undefined;
  if (segments.length === 2) return widget.settings?.[segments[1]];
  return widget.blocks?.[segments[1]]?.settings?.[segments[2]];
}

function readField(doc, field, part) {
  const value = fieldValue(doc, field);
  if (value === undefined) {
    throw toolError("FIELD_NOT_FOUND", `There's nothing at "${field}". Use the readWith.field value a result gave you.`);
  }
  return { field, ...valuePart(value, part) };
}

export const siteOverviewTool = {
  name: "site_overview",
  title: "Site overview",
  description:
    "The open site at a glance: its details and business information, languages, pages (grouped across languages, paged), menus and collections. Shows saved content only; it can't see unsaved edits in the editor.",
  inputSchema: {
    type: "object",
    properties: { offset: { ...offsetArg, description: "How many page groups to skip." }, limit: limitArg(200) },
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  async run(ctx) {
    const { offset = 0, limit = 100 } = ctx.args;
    const { scope, project } = await ctx.openSite();
    const main = ctx.language();
    const byLanguage = await pagesByLanguage(ctx, scope);

    const groups = new Map();
    for (const [code, pages] of byLanguage) {
      for (const entry of pages) {
        const key = entry.group ?? `${code}:${entry.slug}`;
        if (!groups.has(key)) groups.set(key, {});
        groups.get(key)[code] = { slug: entry.slug, name: entry.name };
      }
    }
    const pages = [...groups.values()];

    const menus = [];
    for (const id of await ctx.reader.listMenuIds(scope, main)) {
      const menu = await ctx.reader.readMenu(scope, id, main).catch(() => null);
      menus.push({ id, name: menu?.name ?? id });
    }

    const collections = [];
    for (const schema of await ctx.reader.collectionSchemas(scope)) {
      const items = await ctx.reader.collectionItems(scope, schema.type, {}, main);
      collections.push({ type: schema.type, name: schema.displayNamePlural ?? schema.displayName ?? schema.type, items: items.length });
    }

    return {
      data: {
        ...ctx.about(),
        details: {
          name: project.name,
          siteTitle: project.siteTitle || null,
          siteUrl: project.siteUrl || null,
          theme: project.theme,
          themeVersion: project.themeVersion ?? null,
          preset: project.preset ?? null,
          business: project.siteIdentity ?? {},
        },
        languages: { main: main.defaultLanguage, others: main.languages },
        pages: pages.slice(offset, offset + limit),
        pagesPaging: page({ offset, limit, total: pages.length }),
        menus,
        collections,
        unsavedState: "unknown",
        note: "This is the saved site. Edits the user hasn't saved in Widgetizer aren't visible here.",
      },
    };
  },
};

export const readPageTool = {
  name: "read_page",
  title: "Read a page",
  description:
    "Reads one saved page: its SEO details and its sections in order, each with blocks and current values (stored values only; unset settings use the defaults shown by section_details). Images appear as media references, and media inside rich text is listed as mediaInText. Large pages return an outline first; ask for sections, then follow continueWith or readWith to get the rest.",
  inputSchema: {
    type: "object",
    properties: {
      page: nameArg("The page's slug, as site_overview lists it."),
      language: languageArg,
      sections: {
        type: "array",
        items: nameArg("A section id"),
        minItems: 1,
        maxItems: 50,
        description: "Only these sections (ids from the outline).",
      },
      blockOffset: {
        type: "integer",
        minimum: 0,
        maximum: 10000,
        description: "With a single section: continue its blocks from here (from continueWith).",
      },
      field: fieldArg,
      part: partArg,
    },
    required: ["page"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  async run(ctx) {
    const { page: slug, language, sections: only, blockOffset, field, part } = ctx.args;
    const { scope } = await ctx.openSite();
    const lang = ctx.language(language);
    const doc = await ctx.reader.readPage(scope, slug, lang);
    if (!doc) {
      const available = await ctx.reader.listPageSlugs(scope, lang);
      throw toolError("PAGE_NOT_FOUND", `There's no page "${slug}" in ${lang.language}. Pages: ${listAvailable(available)}.`);
    }
    if (field) return { data: { ...ctx.about(lang), page: slug, ...readField(doc, field, part) } };
    if (blockOffset !== undefined && only?.length !== 1) {
      throw toolError("ASSISTANT_INVALID_ARGUMENTS", "blockOffset needs exactly one section in sections.");
    }

    const context = await sectionContext(ctx, scope, lang, doc);
    const order = Array.isArray(doc.widgetsOrder) ? doc.widgetsOrder : Object.keys(doc.widgets ?? {});
    const ids = only ?? order;
    const unknown = ids.filter((id) => !doc.widgets?.[id]);
    if (unknown.length) {
      throw toolError("SECTION_NOT_FOUND", `This page has no section ${unknown.join(", ")}. Sections: ${listAvailable(order)}.`);
    }
    const header = {
      ...ctx.about(lang),
      page: {
        slug,
        name: doc.name ?? slug,
        uuid: doc.uuid ?? null,
        translationGroup: doc.translationGroupId || doc.uuid || null,
        seo: doc.seo ?? {},
      },
    };
    const sections = order.filter((id) => ids.includes(id)).map((id) => sectionDto(id, doc.widgets[id], context));
    const budget = RESULT_BUDGET_CHARS - size(header);
    const outline = (note) => ({
      data: {
        ...header,
        outline: true,
        sections: sections.map(({ id, type, name, blocks }) => ({ id, type, name, blocks: blocks.length })),
        note,
      },
    });

    if (size(sections) <= budget && blockOffset === undefined) return { data: { ...header, sections } };
    if (!only) return outline("This page is large. Ask again with sections: [ids] to read some sections in full.");
    if (sections.length === 1) {
      const fitted = fitSection(sections[0], budget);
      if (size(fitted) <= budget && blockOffset === undefined) return { data: { ...header, sections: [fitted] } };
      const pageOfBlocks = sectionBlocksPage(sections[0], blockOffset ?? 0, budget, { sections: [sections[0].id] });
      return { data: { ...header, sections: [pageOfBlocks] } };
    }
    const fitted = sections.map((section) => fitSection(section, budget / sections.length));
    if (size(fitted) <= budget) return { data: { ...header, sections: fitted } };
    return outline("These sections are too large together. Ask for them one at a time.");
  },
};

export const readSitePartTool = {
  name: "read_site_part",
  title: "Read the header or footer",
  description:
    "Reads the saved site header or footer, with its blocks and current values. Long values come with readWith; follow continueWith for more blocks.",
  inputSchema: {
    type: "object",
    properties: {
      which: { type: "string", enum: ["header", "footer"], description: "header or footer" },
      language: languageArg,
      blockOffset: { type: "integer", minimum: 0, maximum: 10000, description: "Continue the blocks from here." },
      field: fieldArg,
      part: partArg,
    },
    required: ["which"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  async run(ctx) {
    const { which, language, blockOffset, field, part } = ctx.args;
    const { scope } = await ctx.openSite();
    const lang = ctx.language(language);
    const doc = await ctx.reader.readGlobal(scope, which, lang);
    if (!doc) return { data: { ...ctx.about(lang), which, missing: true } };
    if (field) return { data: { ...ctx.about(lang), ...readField({ widgets: { [which]: doc } }, field, part) } };
    const section = sectionDto(which, doc, await sectionContext(ctx, scope, lang, doc));
    const budget = RESULT_BUDGET_CHARS - 500;
    if (size(section) <= budget && blockOffset === undefined) return { data: { ...ctx.about(lang), which, section } };
    const fitted = fitSection(section, budget);
    if (size(fitted) <= budget && blockOffset === undefined) return { data: { ...ctx.about(lang), which, section: fitted } };
    return { data: { ...ctx.about(lang), which, section: sectionBlocksPage(section, blockOffset ?? 0, budget, { which }) } };
  },
};

function menuItems(items, prefix = "") {
  return (Array.isArray(items) ? items : []).map((item, index) => {
    const position = prefix ? `${prefix}.${index + 1}` : String(index + 1);
    return {
      ...(item.id ? { id: item.id } : {}),
      position,
      label: item.label ?? "",
      link: item.link ?? null,
      ...(item.pageUuid ? { page: item.pageUuid } : {}),
      ...(item.collectionItemUuid ? { collectionItem: item.collectionItemUuid, collection: item.collectionType ?? null } : {}),
      items: menuItems(item.items, position),
    };
  });
}

export const readMenusTool = {
  name: "read_menus",
  title: "Read menus",
  description:
    "Lists the site's menus, or reads one menu's items as a tree. Items linked to a page or collection item keep that reference (it follows renames); position (\"2.1\" = first item under the second) gives the order. Long menus come in pages of top-level items.",
  inputSchema: {
    type: "object",
    properties: {
      menu: nameArg("A menu id from the list. Omit to list menus."),
      language: languageArg,
      offset: { ...offsetArg, description: "Skip this many top-level items." },
    },
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  async run(ctx) {
    const { menu: id, language, offset = 0 } = ctx.args;
    const { scope } = await ctx.openSite();
    const lang = ctx.language(language);
    const ids = await ctx.reader.listMenuIds(scope, lang);
    if (!id) {
      const menus = [];
      for (const menuId of ids) {
        const menu = await ctx.reader.readMenu(scope, menuId, lang).catch(() => null);
        menus.push({ id: menuId, name: menu?.name ?? menuId, topItems: Array.isArray(menu?.items) ? menu.items.length : 0 });
      }
      return { data: { ...ctx.about(lang), menus } };
    }
    const menu = await ctx.reader.readMenu(scope, id, lang);
    if (!menu) throw toolError("MENU_NOT_FOUND", `There's no menu "${id}" in ${lang.language}. Menus: ${listAvailable(ids)}.`);
    const all = menuItems(menu.items);
    const items = [];
    let used = 0;
    for (const item of all.slice(offset)) {
      if (items.length > 0 && used + size(item) > RESULT_BUDGET_CHARS - 1000) break;
      items.push(item);
      used += size(item);
    }
    const next = offset + items.length;
    return {
      data: {
        ...ctx.about(lang),
        menu: { id, name: menu.name ?? id, uuid: menu.uuid ?? null, items },
        topItems: { from: offset, to: next, total: all.length },
        ...(next < all.length ? { continueWith: { menu: id, offset: next } } : {}),
      },
    };
  },
};
