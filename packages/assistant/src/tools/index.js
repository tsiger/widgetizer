import { GUIDANCE } from "../guidance.js";
import { statusTool, listSitesTool, openSiteTool, createSiteTool } from "./sites.js";
import { siteOverviewTool, readPageTool, readSitePartTool, readMenusTool } from "./content.js";
import { readLookTool, themeCatalogTool, sectionDetailsTool } from "./theme.js";
import { listMediaTool, viewImageTool } from "./media.js";
import { readCollectionsTool } from "./collections.js";
import { previewPageTool } from "./preview.js";
import { jobTools } from "./jobs.js";
import { editSectionsTool } from "./edit.js";
import { familyTools } from "./families.js";

export const guidanceTool = {
  name: "get_guidance",
  title: "Guidance",
  description:
    "Short Widgetizer guidance for a kind of task: core (the working rules; read once per conversation), writing, seo, translation, images or accessibility. Advisory: the user's wishes come first.",
  inputSchema: {
    type: "object",
    properties: { topic: { type: "string", enum: Object.keys(GUIDANCE), description: "Which guidance to read." } },
    required: ["topic"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  async run(ctx) {
    return { data: { topic: ctx.args.topic, source: `Widgetizer ${ctx.appInfo.version}`, advisory: true, text: GUIDANCE[ctx.args.topic] } };
  },
};

export const builtinTools = [
  statusTool,
  listSitesTool,
  siteOverviewTool,
  readPageTool,
  readSitePartTool,
  readMenusTool,
  readLookTool,
  themeCatalogTool,
  sectionDetailsTool,
  listMediaTool,
  viewImageTool,
  readCollectionsTool,
  previewPageTool,
  guidanceTool,
  ...jobTools,
  editSectionsTool,
  ...familyTools,
  openSiteTool,
  createSiteTool,
];
