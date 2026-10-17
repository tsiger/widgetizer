import { limitArg, offsetArg, page } from "./shared.js";
import { PLATFORM_INSTRUCTIONS } from "../instructions.js";
import { toolError } from "../errors.js";

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
    "Creates a new site from a theme (and one of its presets) and opens it in Widgetizer, when the user asked for a new site. Then start a job to fill it in. See theme_catalog for themes and presets.",
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
