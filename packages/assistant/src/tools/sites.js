import { limitArg, offsetArg, page, partArg, textPart } from "./shared.js";
import { PLATFORM_INSTRUCTIONS } from "../instructions.js";
import { toolError } from "../errors.js";
import { PRESET_GUIDE_HEADINGS, parsePresetGuide } from "@widgetizer/core/guidance";

const NO_ARGS = { type: "object", properties: {}, additionalProperties: false };

export const statusTool = {
  name: "widgetizer_status",
  title: "Widgetizer status",
  description:
    "Shows which site is open in Widgetizer, the app version and the working rules. Call this first: you can only work on the open site.",
  inputSchema: NO_ARGS,
  annotations: { readOnlyHint: true, openWorldHint: false },
  async run(ctx) {
    let open = null;
    try {
      const site = await ctx.openSite();
      open = { id: site.project.id, name: site.project.name, theme: site.project.theme ?? null };
    } catch (error) {
      if (error.code !== "NO_OPEN_SITE") throw error;
    }
    return { data: { appVersion: ctx.appInfo.version, openSite: open, rules: PLATFORM_INSTRUCTIONS } };
  },
};

export const openSiteTool = {
  name: "open_site",
  title: "Open another site",
  description:
    "Opens another of the user's sites in Widgetizer. Only when the user asked to work on that site; no job may be running, and the user must have nothing unsaved.",
  inputSchema: { type: "object", properties: { siteId: { type: "string", minLength: 1, maxLength: 100 } }, required: ["siteId"], additionalProperties: false },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  async run(ctx) {
    if (!ctx.jobs) throw toolError("JOBS_UNAVAILABLE", "Changing sites isn't available in this Widgetizer.");
    const { sites } = await ctx.listSites();
    if (!sites.some((site) => site.id === ctx.args.siteId)) throw toolError("SITE_NOT_FOUND", "There's no site with that id. See list_sites.");
    return { data: await ctx.jobs.changeSite({ session: ctx.session, siteId: ctx.args.siteId }) };
  },
};

export const createSiteTool = {
  name: "create_site",
  title: "Create a site",
  description:
    "Creates a new site from a theme (and one of its presets) and opens it in Widgetizer, when the user asked for a new site. Then start a job to fill it in. Choose with list_themes and preset_details (read get_guidance new_site first).",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string", minLength: 1, maxLength: 200 },
      theme: { type: "string", minLength: 1, maxLength: 100, pattern: "^[A-Za-z0-9_-]+$" },
      preset: { type: "string", minLength: 1, maxLength: 100, pattern: "^[A-Za-z0-9_-]+$" },
    },
    required: ["name", "theme"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  async run(ctx) {
    if (!ctx.jobs) throw toolError("JOBS_UNAVAILABLE", "Changing sites isn't available in this Widgetizer.");
    const { name, theme, preset } = ctx.args;
    return { data: await ctx.jobs.changeSite({ session: ctx.session, create: { name, theme, ...(preset ? { preset } : {}) } }) };
  },
};

export const listSitesTool = {
  name: "list_sites",
  title: "List sites",
  description:
    "Lists the user's Widgetizer sites and marks the one that is open. Listing never switches sites; only the user opens a different site.",
  inputSchema: {
    type: "object",
    properties: { offset: offsetArg, limit: limitArg(100) },
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  async run(ctx) {
    const { offset = 0, limit = 50 } = ctx.args;
    const { sites, openSiteId } = await ctx.listSites();
    return {
      data: {
        sites: sites.slice(offset, offset + limit).map((project) => ({
          id: project.id,
          name: project.name,
          theme: project.theme ?? null,
          isOpen: project.id === openSiteId,
        })),
        ...page({ offset, limit, total: sites.length }),
      },
    };
  },
};

const presetDto = (preset) => ({
  id: preset.id,
  name: preset.name ?? preset.id,
  ...(preset.description ? { description: preset.description } : {}),
  ...(preset.liveDemo ? { liveDemo: preset.liveDemo } : {}),
  ...(preset.isDefault ? { isDefault: true } : {}),
});

export const listThemesTool = {
  name: "list_themes",
  title: "List themes",
  description:
    "The themes installed in Widgetizer and each theme's starting presets (id, name, the kind of business it was made for, live demo), for creating a new site. Read preset_details before recommending one.",
  inputSchema: NO_ARGS,
  annotations: { readOnlyHint: true, openWorldHint: false },
  async run(ctx) {
    if (typeof ctx.reader.themes !== "function") throw toolError("THEMES_UNAVAILABLE", "Listing themes isn't available in this Widgetizer.");
    const themes = [];
    for (const theme of await ctx.reader.themes()) {
      let presets = [];
      try {
        presets = ((await ctx.reader.presets(theme.id))?.presets ?? []).map(presetDto);
      } catch {
        presets = [];
      }
      themes.push({
        id: theme.id,
        name: theme.name ?? theme.id,
        ...(theme.description ? { description: theme.description } : {}),
        ...(theme.version ? { version: theme.version } : {}),
        presets,
      });
    }
    return { data: { themes, note: "A preset is a complete starting site with demo text and photos; the user's content replaces them." } };
  },
};

export const presetDetailsTool = {
  name: "preset_details",
  title: "Preset details",
  description:
    "One preset of an installed theme: its pages, menus and seeded collection items, and the theme author's guidance on who it suits, how it looks and how to adapt it to a similar business. Guidance is advisory.",
  inputSchema: {
    type: "object",
    properties: {
      theme: { type: "string", minLength: 1, maxLength: 100, pattern: "^[A-Za-z0-9_-]+$", description: "A theme id from list_themes." },
      preset: { type: "string", minLength: 1, maxLength: 100, pattern: "^[A-Za-z0-9_-]+$", description: "One of that theme's preset ids." },
      part: { ...partArg, description: "For a preset whose guidance is one long text without its three sections: which part to return." },
    },
    required: ["theme", "preset"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  async run(ctx) {
    if (typeof ctx.reader.presetDetails !== "function") throw toolError("THEMES_UNAVAILABLE", "Reading presets isn't available in this Widgetizer.");
    const { theme, preset, part = 1 } = ctx.args;
    let details;
    try {
      details = await ctx.reader.presetDetails(theme, preset);
    } catch (error) {
      if (error?.code === "THEME_NOT_FOUND") throw toolError("THEME_NOT_FOUND", `There's no theme "${theme}". See list_themes.`);
      throw error;
    }
    if (!details) throw toolError("PRESET_NOT_FOUND", `Theme "${theme}" has no preset "${preset}". See list_themes.`);
    const guide = details.guidance ? parsePresetGuide(details.guidance) : null;
    return {
      data: {
        theme,
        preset: presetDto(details),
        pages: details.pages,
        menus: details.menus,
        collections: details.collections,
        guidance: guide
          ? {
              source: `${theme} preset ${preset}`,
              advisory: true,
              ...(guide.missing.length === PRESET_GUIDE_HEADINGS.length
                ? textPart(guide.text, part)
                : { suits: guide.suits, look: guide.look, adapting: guide.adapting }),
            }
          : null,
        note: "Pages hold the preset's demo text and photos until a job replaces them.",
      },
    };
  },
};
