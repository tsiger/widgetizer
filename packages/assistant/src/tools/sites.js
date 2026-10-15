import { limitArg, offsetArg, page } from "./shared.js";
import { PLATFORM_INSTRUCTIONS } from "../instructions.js";

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
