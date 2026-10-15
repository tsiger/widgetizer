import { toolError } from "../errors.js";
import {
  RESULT_BUDGET_CHARS,
  collectUploadPaths,
  label,
  languageArg,
  limitArg,
  listAvailable,
  offsetArg,
  page,
  partArg,
  valuePart,
  embeddedMedia,
  fitSettings,
  withMediaRefs,
} from "./shared.js";
import { settingDto, isEditable } from "./theme.js";

const slugArg = (description) => ({ type: "string", pattern: "^[a-z0-9-]+$", maxLength: 200, description });

function itemSummary(item, schema) {
  const titleField = schema.settings?.find((setting) => setting.usedAsTitle)?.id;
  const dateField = schema.settings?.find((setting) => setting.usedAsDate)?.id;
  return {
    slug: item.slug,
    ...(titleField ? { title: item.settings?.[titleField] ?? null } : {}),
    ...(dateField ? { date: item.settings?.[dateField] ?? null } : {}),
    translationGroup: item.translationGroupId || item.uuid || null,
  };
}

export const readCollectionsTool = {
  name: "read_collections",
  title: "Read collections",
  description:
    "Collections hold repeating content such as news posts or projects. Without a type, lists the collection types. With a type, lists its fields and items in order. With a type and item, reads that item in full (long texts can be read with field + part).",
  inputSchema: {
    type: "object",
    properties: {
      type: slugArg("A collection type from the list."),
      item: slugArg("An item's slug from the item list."),
      language: languageArg,
      offset: offsetArg,
      limit: limitArg(50),
      field: { type: "string", maxLength: 100, description: 'A long text to read in full ("readWith.field").' },
      part: partArg,
    },
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  async run(ctx) {
    const { type, item: slug, language, offset = 0, limit = 20, field, part } = ctx.args;
    if (slug && !type) throw toolError("ASSISTANT_INVALID_ARGUMENTS", "item needs a type.");
    const { scope } = await ctx.openSite();
    const lang = ctx.language(language);
    const schemas = await ctx.reader.collectionSchemas(scope);

    if (!type) {
      const types = [];
      for (const schema of schemas) {
        const items = await ctx.reader.collectionItems(scope, schema.type, {}, lang);
        types.push({
          type: schema.type,
          name: schema.displayNamePlural ?? schema.displayName ?? schema.type,
          ...(schema.description ? { description: schema.description } : {}),
          hasItemPages: Boolean(schema.hasItemPages),
          items: items.length,
        });
      }
      return { data: { ...ctx.about(lang), collections: types, note: "Collection types come from the theme; new types can't be added." } };
    }

    const schema = schemas.find((candidate) => candidate.type === type);
    if (!schema) {
      throw toolError("COLLECTION_NOT_FOUND", `There's no collection "${type}". Collections: ${listAvailable(schemas.map((s) => s.type))}.`);
    }
    const locale = await ctx.reader.labelLocale(scope);

    if (!slug) {
      const all = await ctx.reader.collectionItems(scope, type, {}, lang);
      return {
        data: {
          ...ctx.about(lang),
          collection: {
            type,
            name: schema.displayNamePlural ?? schema.displayName ?? type,
            hasItemPages: Boolean(schema.hasItemPages),
            fields: (schema.settings ?? []).filter(isEditable).map((setting) => ({
              ...settingDto(setting, locale),
              ...(setting.required ? { required: true } : {}),
            })),
          },
          items: all.slice(offset, offset + limit).map((entry) => itemSummary(entry, schema)),
          ...page({ offset, limit, total: all.length }),
        },
      };
    }

    const item = await ctx.reader.collectionItem(scope, type, slug, lang);
    if (!item) {
      const all = await ctx.reader.collectionItems(scope, type, {}, lang);
      throw toolError("ITEM_NOT_FOUND", `There's no ${type} item "${slug}" in ${lang.language}. Items: ${listAvailable(all.map((i) => i.slug))}.`);
    }
    if (field) {
      const value = item.settings?.[field];
      if (value === undefined) throw toolError("FIELD_NOT_FOUND", `This item has no field "${field}".`);
      return { data: { ...ctx.about(lang), item: slug, field, ...valuePart(value, part) } };
    }
    const mediaIds = await ctx.reader.mediaIds(scope, [...collectUploadPaths(item.settings)]);
    const media = embeddedMedia(item.settings, mediaIds);
    let settings = withMediaRefs(item.settings ?? {}, mediaIds);
    if (JSON.stringify(settings).length > RESULT_BUDGET_CHARS - 2000) {
      settings = fitSettings(settings, "", RESULT_BUDGET_CHARS - 2000).settings;
    }
    return {
      data: {
        ...ctx.about(lang),
        collection: type,
        item: {
          ...itemSummary(item, schema),
          uuid: item.uuid ?? null,
          seo: item.seo ?? {},
          settings,
          ...(media.length ? { mediaInText: media } : {}),
        },
        fieldNames: Object.fromEntries((schema.settings ?? []).filter(isEditable).map((s) => [s.id, label(s.label, locale)])),
      },
    };
  },
};
