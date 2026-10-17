import { languageArg, nameArg } from "./shared.js";
import { toolError } from "../errors.js";
import { applySectionOperations, describeOperations, documentVersion, measuredIds } from "../edits/sections.js";
import { resolveReferences } from "../edits/references.js";
import { APPROVAL_ID } from "./shared.js";

const ID = { type: "string", minLength: 1, maxLength: 120, pattern: "^[A-Za-z0-9_-]+$" };

const OPERATION = {
  type: "object",
  properties: {
    op: {
      type: "string",
      enum: ["add", "update", "remove", "move", "addBlock", "updateBlock", "removeBlock", "moveBlock"],
      description: "What to do.",
    },
    type: { type: "string", minLength: 1, maxLength: 100, description: "add/addBlock: the section or block type (from theme_catalog / section_details)." },
    section: { ...ID, description: "The section's id from read_page. Leave out for the header or footer." },
    block: { ...ID, description: "updateBlock/removeBlock/moveBlock: the block's id." },
    settings: { type: "object", description: "Setting values to set, keyed by setting id. null puts a setting back to its default." },
    blocks: {
      type: "array",
      maxItems: 50,
      items: {
        type: "object",
        properties: { type: { type: "string", minLength: 1, maxLength: 100 }, settings: { type: "object" } },
        required: ["type"],
        additionalProperties: false,
      },
      description: "add: the new section's blocks, in order (replaces its starting blocks).",
    },
    after: { ...ID, description: "add/move/addBlock/moveBlock: place it after this section or block." },
    at: { type: "string", enum: ["start", "end"], description: "Without after: place it at the start or the end (default end)." },
  },
  required: ["op"],
  additionalProperties: false,
};

export const editSectionsTool = {
  name: "edit_sections",
  title: "Edit sections",
  description:
    "Changes the sections of one page, or the blocks and settings of the header or footer, inside a running job. " +
    "Pass basedOn = the version read_page or read_site_part returned; re-read if the page changed since. " +
    "Operations apply in order and all-or-nothing. Setting values use the shapes read_page shows; an image is { media: id } from list_media, " +
    "a link to a page { text, page: slug }, to a collection item { text, item: { type, slug } }. " +
    "Changing a fourth page, header or footer in one job, or removing more than half of what one held, needs the user's OK: the call answers NEEDS_APPROVAL with an approvalId.",
  inputSchema: {
    type: "object",
    properties: {
      jobId: { type: "string", pattern: "^[a-f0-9-]{36}$", description: "The running job, from start_job." },
      page: nameArg("The page's slug. Give page or part, not both."),
      part: { type: "string", enum: ["header", "footer"], description: "The site's header or footer." },
      language: languageArg,
      basedOn: { type: "string", pattern: "^[a-f0-9]{16}$", description: "The version from the read this edit is based on." },
      operations: { type: "array", minItems: 1, maxItems: 50, items: OPERATION },
      approvalId: APPROVAL_ID,
    },
    required: ["jobId", "basedOn", "operations"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  recordsOutcome: true,
  async run(ctx) {
    const { jobId, page, part, language, basedOn, operations, approvalId } = ctx.args;
    if (!ctx.jobs) throw toolError("JOBS_UNAVAILABLE", "Changing sites isn't available in this Widgetizer.");
    if (Boolean(page) === Boolean(part)) throw toolError("ASSISTANT_INVALID_ARGUMENTS", "Give either page or part.");
    const { scope } = await ctx.openSite();
    const lang = ctx.language(language);
    const schemas = new Map((await ctx.reader.widgetSchemas(scope, lang)).map((schema) => [schema.type, schema]));
    const kind = page ? "page" : "global";
    const target = page ? { kind, slug: page } : { kind, type: part };
    const resolved = await resolveReferences(operations, { reader: ctx.reader, scope, lang });

    let key = `${kind}:${page ?? part}:${lang.language}`;
    const label = page ? `the page "${page}"` : `the ${part}`;
    const { result, receipt } = await ctx.jobs.runEdit({
      jobId,
      session: ctx.session,
      languages: [lang.language],
      tool: "edit_sections",
      args: { page, part, language: lang.language, basedOn, operations },
      approvalId,
      sideEffects: (saved) =>
        saved?.listingMovedFrom?.length
          ? [{ key, label, notes: [`Moved the collection listing here from: ${saved.listingMovedFrom.join(", ")}`] }]
          : [],
      perform: ({ writer, scope: jobScope, inspect, beforeWrite }) =>
        ctx.jobs.saves.editDocument(writer, {
          scope: jobScope,
          lang,
          target,
          beforeWrite,
          update: async (current) => {
            if (documentVersion(current) !== basedOn) {
              throw toolError("STALE_READ", "This changed since you read it. Read it again, then retry with the new version.");
            }
            const { next, changes } = applySectionOperations({
              doc: current,
              kind,
              operations: resolved,
              schemas,
              sanitizeRichText: ctx.reader.sanitizeRichText,
            });
            if (page && current.uuid) key = `page:${current.uuid}:${lang.language}`;
            await inspect([
              {
                key,
                label,
                unit: kind === "page" ? "sections" : "blocks",
                before: measuredIds(current, kind),
                after: measuredIds(next, kind),
                changes,
                summary: describeOperations(`${label} (${lang.language})`, operations),
                ...(page ? { link: { page, language: lang.language, pageUuid: current.uuid ?? null } } : {}),
              },
            ]);
            return next;
          },
        }),
    });

    const saved = page ? await ctx.reader.readPage(scope, page, lang) : await ctx.reader.readGlobal(scope, part, lang);
    return {
      data: {
        ...ctx.about(lang),
        jobId,
        ...(page ? { page } : { part }),
        version: documentVersion(saved),
        changedSoFar: receipt[key],
        ...(result?.listingMovedFrom?.length ? { alsoChanged: { listingAnchorRemovedFrom: result.listingMovedFrom } } : {}),
        ...(result?.usageStale ? { warnings: ["Image usage tracking is behind; the change is saved."] } : {}),
      },
    };
  },
};
