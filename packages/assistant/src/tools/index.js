const MAX_SITES = 200;

function siteSummary(project, openSiteId) {
  return {
    id: project.id,
    name: project.name,
    theme: project.theme ?? null,
    isOpen: project.id === openSiteId,
  };
}

export const statusTool = {
  name: "widgetizer_status",
  title: "Widgetizer status",
  description:
    "Shows which site is open in Widgetizer and the app version. Call this first: you can only work on the open site.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  outputSchema: {
    type: "object",
    properties: {
      appVersion: { type: "string" },
      openSite: {
        type: ["object", "null"],
        properties: { id: { type: "string" }, name: { type: "string" }, theme: { type: ["string", "null"] } },
      },
    },
    required: ["appVersion", "openSite"],
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  async run({ sites, appInfo, actor }) {
    const openSiteId = await sites.openSiteId(actor);
    const open = openSiteId ? await sites.get(actor, openSiteId) : null;
    return {
      appVersion: appInfo.version,
      openSite: open ? { id: open.id, name: open.name, theme: open.theme ?? null } : null,
    };
  },
};

export const listSitesTool = {
  name: "list_sites",
  title: "List sites",
  description:
    "Lists the user's Widgetizer sites and marks the one that is open. Listing never switches sites; only the user opens a different site.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  outputSchema: {
    type: "object",
    properties: {
      sites: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            theme: { type: ["string", "null"] },
            isOpen: { type: "boolean" },
          },
        },
      },
      truncated: { type: "boolean" },
    },
    required: ["sites", "truncated"],
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  async run({ sites, actor }) {
    const [all, openSiteId] = await Promise.all([sites.list(actor), sites.openSiteId(actor)]);
    return {
      sites: all.slice(0, MAX_SITES).map((project) => siteSummary(project, openSiteId)),
      truncated: all.length > MAX_SITES,
    };
  },
};

export const builtinTools = [statusTool, listSitesTool];
