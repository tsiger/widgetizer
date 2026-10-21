import { toolError } from "../errors.js";
import { clip, firstParagraph, parseWidgetGuide } from "@widgetizer/core/guidance";
import { listingSettingsFor } from "@widgetizer/core/listingSettings";
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
  textPart,
  withMediaRefs,
} from "./shared.js";

const PURPOSE_CHARS = 300;

// Limits a theme's guidance can't be trusted to state prominently, for sections
// the app itself ships.
const CORE_CAVEATS = {
  "core-form":
    "Forms only receive submissions when the site is published on Widgetizer Hosting. On any other host, submissions fail. Tell the user this whenever you add a form.",
};

export function settingDto(setting, locale) {
  const options = Array.isArray(setting.options)
    ? setting.options.map((option) =>
        option && typeof option === "object" ? { value: option.value, label: label(option.label, locale) } : { value: option },
      )
    : undefined;
  return {
    id: setting.id,
    type: setting.type,
    label: label(setting.label, locale) ?? null,
    ...(setting.description ? { description: label(setting.description, locale) } : {}),
    ...(setting.default !== undefined ? { default: setting.default } : {}),
    ...(setting.resolvedDefault !== undefined ? { defaultText: setting.resolvedDefault } : {}),
    ...(options ? { options } : {}),
    ...(setting.min !== undefined ? { min: setting.min } : {}),
    ...(setting.max !== undefined ? { max: setting.max } : {}),
    ...(setting.step !== undefined ? { step: setting.step } : {}),
  };
}

export const isEditable = (setting) => setting?.id && setting.type !== "header";

/** What the section is for, in a line: the first paragraph of its guidance's Purpose (or of an older free-form file). */
function purposeOf(guidance) {
  if (!guidance) return null;
  const guide = parseWidgetGuide(guidance);
  return clip(guide.structured ? firstParagraph(guide.purpose) : guide.purpose, PURPOSE_CHARS);
}

/**
 * A widget's guidance as served: the fixed sections and the recipe names (an
 * assistant asks for one recipe at a time), or an older free-form file in parts.
 */
// How to apply a recipe. A page section is added whole; the header and footer
// already exist once per site, so their recipes are applied as changes to them.
const RECIPE_USE = {
  page:
    "The example is a section without ids: add it with edit_sections (op add, with its type, settings and blocks). Then replace the placeholder text, point links at pages the site has, and add the images the notes name.",
  global:
    "The site already has exactly one of these, so it can't be added. Read it with read_site_part, then call edit_sections with part and that version: op update with the example's settings, and addBlock / updateBlock / removeBlock / moveBlock until its blocks match the example's. Then replace the placeholder text, point links at pages the site has, and add the images the notes name.",
};

function guidanceDto(guidance, { source, part, recipe: recipeName, type, global = false }) {
  if (!guidance) return null;
  const guide = parseWidgetGuide(guidance);
  if (recipeName) {
    const recipe = guide.structured ? guide.recipes.find((candidate) => candidate.name === recipeName) : null;
    if (!recipe) {
      const names = guide.structured ? guide.recipes.map((r) => r.name) : [];
      throw toolError("RECIPE_NOT_FOUND", `There's no recipe "${recipeName}". Recipes: ${listAvailable(names)}.`);
    }
    return {
      source,
      advisory: true,
      recipe: {
        name: recipe.name,
        notes: recipe.intro,
        // The format lets an example leave its type out; the edit needs it.
        example: recipe.example ? { type, ...recipe.example } : null,
        ...(recipe.error ? { problem: recipe.error } : {}),
        howToUse: global ? RECIPE_USE.global : RECIPE_USE.page,
      },
    };
  }
  if (!guide.structured) return { source, advisory: true, ...textPart(guide.text, part) };
  return {
    source,
    advisory: true,
    purpose: guide.purpose,
    whenToUse: guide.whenToUse,
    pitfalls: guide.pitfalls,
    recipes: guide.recipes.map((entry) => ({ name: entry.name, notes: clip(entry.intro, 200) })),
    ...(guide.recipes.length ? { note: "Ask again with recipe: <name> for a recipe's example." } : {}),
  };
}

export const readLookTool = {
  name: "read_look",
  title: "Read the look",
  description:
    "The site's theme settings (colours, fonts, style options), grouped by category, with each setting's current value, default and allowed options. If there are very many, it lists the categories; then ask for one.",
  inputSchema: {
    type: "object",
    properties: { category: { type: "string", minLength: 1, maxLength: 100, description: "Only this category." } },
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  async run(ctx) {
    const { scope, project } = await ctx.openSite();
    const [theme, locale] = await Promise.all([ctx.reader.readThemeJson(scope), ctx.reader.labelLocale(scope)]);
    const allGroups = theme?.settings?.global ?? {};
    const { category: only } = ctx.args;
    if (only && !allGroups[only]) {
      throw toolError("CATEGORY_NOT_FOUND", `There's no category "${only}". Categories: ${listAvailable(Object.keys(allGroups))}.`);
    }
    const groups = only ? { [only]: allGroups[only] } : allGroups;
    const mediaIds = await ctx.reader.mediaIds(scope, [...collectUploadPaths(groups)]);
    const categories = Object.entries(groups).map(([category, settings]) => ({
      category,
      settings: (Array.isArray(settings) ? settings : []).filter(isEditable).map((setting) => ({
        ...settingDto(setting, locale),
        value: withMediaRefs(setting.value ?? null, mediaIds),
      })),
    }));
    const themeInfo = { id: project.theme, name: theme?.name ?? project.theme, version: theme?.version ?? project.themeVersion ?? null };
    if (!only && JSON.stringify(categories).length > RESULT_BUDGET_CHARS) {
      return {
        data: {
          ...ctx.about(),
          theme: themeInfo,
          categories: categories.map(({ category, settings }) => ({ category, settings: settings.length, readWith: { category } })),
          note: "There are many settings. Ask for one category at a time.",
        },
      };
    }
    return {
      data: { ...ctx.about(), theme: themeInfo, categories, note: "A value of null means the setting uses its default." },
    };
  },
};

export const themeCatalogTool = {
  name: "theme_catalog",
  title: "What the theme offers",
  description:
    "The section types the open site's theme offers (with what each is for and its block types), and the theme's starting presets. Use section_details for one section's settings and guidance.",
  inputSchema: {
    type: "object",
    properties: { offset: offsetArg, limit: limitArg(100) },
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  async run(ctx) {
    const { offset = 0, limit = 60 } = ctx.args;
    const { scope, project } = await ctx.openSite();
    const lang = ctx.language();
    const [schemas, locale] = await Promise.all([ctx.reader.widgetSchemas(scope, lang), ctx.reader.labelLocale(scope)]);
    const slice = schemas.slice(offset, offset + limit);
    const sections = [];
    for (const schema of slice) {
      const guidance = await ctx.reader.widgetGuidance(scope, schema).catch(() => null);
      sections.push({
        type: schema.type,
        name: label(schema.displayName, locale) ?? schema.type,
        ...(schema.description ? { description: label(schema.description, locale) } : {}),
        placement: schema.source?.kind === "global" ? "header/footer" : "page",
        purpose: purposeOf(guidance),
        blockTypes: (Array.isArray(schema.blocks) ? schema.blocks : []).map((block) => block.type),
        ...(schema.maxBlocks !== undefined ? { maxBlocks: schema.maxBlocks } : {}),
        ...(CORE_CAVEATS[schema.type] ? { caveat: CORE_CAVEATS[schema.type] } : {}),
      });
    }
    let presets = [];
    try {
      const registry = await ctx.reader.presets(project.theme);
      presets = (registry?.presets ?? []).map((preset) => ({
        id: preset.id,
        name: preset.name ?? preset.id,
        ...(preset.description ? { description: preset.description } : {}),
        ...(preset.niche ? { niche: preset.niche } : {}),
      }));
    } catch {
      presets = [];
    }
    return {
      data: {
        ...ctx.about(),
        theme: project.theme,
        sections,
        ...page({ offset, limit, total: schemas.length }),
        presets,
      },
    };
  },
};

export const sectionDetailsTool = {
  name: "section_details",
  title: "Section details",
  description:
    "One section type's settings (types, options, ranges, defaults in the given language), its blocks and limits, and the theme's guidance for using it: purpose, when to use, pitfalls and the names of ready-made recipes. Ask with recipe for one recipe's example. Guidance is advisory; the user's request comes first. A very large section lists its blocks for you to read one at a time with block.",
  inputSchema: {
    type: "object",
    properties: {
      type: { type: "string", minLength: 1, maxLength: 100, description: "A section type from theme_catalog." },
      language: { ...languageArg, description: "Which language's default texts to show (defaults to the main language)." },
      block: { type: "string", minLength: 1, maxLength: 100, description: "Only this block type's settings." },
      recipe: { type: "string", minLength: 1, maxLength: 200, description: "A recipe name from this section's guidance: returns its example." },
      part: { ...partArg, description: "For a theme whose guidance is one long text: which part to return." },
    },
    required: ["type"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  async run(ctx) {
    const { type, language, block: onlyBlock, recipe, part = 1 } = ctx.args;
    const { scope, project } = await ctx.openSite();
    const lang = ctx.language(language);
    const [schemas, locale] = await Promise.all([ctx.reader.widgetSchemas(scope, lang), ctx.reader.labelLocale(scope)]);
    const schema = schemas.find((candidate) => candidate.type === type);
    if (!schema) {
      throw toolError("SECTION_TYPE_NOT_FOUND", `The theme has no section type "${type}". Types: ${listAvailable(schemas.map((s) => s.type))}.`);
    }
    const blockDto = (block) => ({
      type: block.type,
      name: label(block.displayName, locale) ?? block.type,
      settings: (block.settings ?? []).filter(isEditable).map((setting) => settingDto(setting, locale)),
    });
    if (onlyBlock) {
      const block = (schema.blocks ?? []).find((candidate) => candidate.type === onlyBlock);
      if (!block) {
        throw toolError("BLOCK_TYPE_NOT_FOUND", `${type} has no block type "${onlyBlock}". Block types: ${listAvailable((schema.blocks ?? []).map((b) => b.type))}.`);
      }
      return { data: { ...ctx.about(lang), type, block: blockDto(block) } };
    }

    const guidance = await ctx.reader.widgetGuidance(scope, schema).catch(() => null);
    const source = schema.source?.kind === "core" ? `Widgetizer ${ctx.appInfo.version}` : `${project.theme} ${project.themeVersion ?? ""}`.trim();
    if (recipe && !guidance) throw toolError("RECIPE_NOT_FOUND", `${type} has no guidance, so no recipes.`);
    if (recipe) return { data: { ...ctx.about(lang), type, guidance: guidanceDto(guidance, { source, part, recipe, type, global: schema.source?.kind === "global" }) } };
    const result = {
      ...ctx.about(lang),
      type,
      name: label(schema.displayName, locale) ?? type,
      placement: schema.source?.kind === "global" ? "header/footer" : "page",
      settings: [...(schema.settings ?? []), ...listingSettingsFor(schema)].filter(isEditable).map((setting) => settingDto(setting, locale)),
      blocks: (schema.blocks ?? []).map(blockDto),
      ...(schema.maxBlocks !== undefined ? { maxBlocks: schema.maxBlocks } : {}),
      ...(CORE_CAVEATS[type] ? { caveat: CORE_CAVEATS[type] } : {}),
      guidance: guidanceDto(guidance, { source, part }),
    };
    if (JSON.stringify(result).length > RESULT_BUDGET_CHARS) {
      result.blocks = result.blocks.map(({ type: blockType, name, settings }) => ({
        type: blockType,
        name,
        settings: settings.length,
        readWith: { block: blockType },
      }));
    }
    return { data: result };
  },
};

export const themeGuideTool = {
  name: "theme_guide",
  title: "Theme guide",
  description:
    "How the open site's theme composes pages, written by the theme's author: what its colour schemes mean, spacing, which sections open a page, header and footer, collections, dos and don'ts. Read it before building or restructuring pages. Advisory; the user's request comes first. Long guides come in parts.",
  inputSchema: {
    type: "object",
    properties: { part: partArg },
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  async run(ctx) {
    const { part = 1 } = ctx.args;
    const { scope, project } = await ctx.openSite();
    const guidance = typeof ctx.reader.themeGuidance === "function" ? await ctx.reader.themeGuidance(scope).catch(() => null) : null;
    const theme = { id: project.theme, version: project.themeVersion ?? null };
    if (!guidance?.trim()) {
      return {
        data: {
          ...ctx.about(),
          theme,
          guidance: null,
          note: "This theme ships no composition guide. Go by section_details and the section purposes in theme_catalog.",
        },
      };
    }
    return {
      data: {
        ...ctx.about(),
        theme,
        guidance: { source: `${project.theme} ${project.themeVersion ?? ""}`.trim(), advisory: true, ...textPart(guidance, part) },
      },
    };
  },
};
