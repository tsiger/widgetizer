import { languageArg } from "./shared.js";
import { toolError } from "../errors.js";

const JOB_ID = { type: "string", pattern: "^[a-f0-9-]{36}$", description: "The job's id, from start_job." };

function requireJobs(ctx) {
  if (!ctx.jobs) throw toolError("JOBS_UNAVAILABLE", "Changing sites isn't available in this Widgetizer.");
  return ctx.jobs;
}

export const startJobTool = {
  name: "start_job",
  title: "Start a job",
  description:
    "Starts a job on the open site before any change. Widgetizer saves a copy of the site, locks its windows and shows the user a Stop button. One job per request from the user; finish it with finish_job. Fails if the user has unsaved changes or no Widgetizer window shows the site.",
  inputSchema: {
    type: "object",
    properties: {
      summary: { type: "string", minLength: 3, maxLength: 200, description: "What the job will do, in a few words the user will see." },
      languages: { type: "array", items: languageArg, maxItems: 20, description: "Languages the job may change. Defaults to the site's main language." },
      addLanguages: {
        type: "array",
        items: languageArg,
        maxItems: 5,
        description: "Languages the site doesn't have yet that this job will add (with add_language) and write in.",
      },
    },
    required: ["summary"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  recordsOutcome: true,
  async run(ctx) {
    const jobs = requireJobs(ctx);
    const { project } = await ctx.openSite();
    const existing = new Set([project.defaultLanguage, ...(project.languages ?? [])].filter(Boolean));
    const added = (ctx.args.addLanguages ?? []).filter((code) => !existing.has(code));
    const languages = [...new Set([...(ctx.args.languages ?? [undefined]).map((code) => ctx.language(code).language), ...added])];
    const job = await jobs.start({
      session: ctx.session,
      requestId: ctx.requestId,
      summary: ctx.args.summary,
      languages,
      siteId: project.id,
    });
    return { data: { job, note: "The site is locked for the user until you call finish_job or the job is stopped." } };
  },
};

export const jobStatusTool = {
  name: "job_status",
  title: "Job status",
  description:
    "Shows the job running on the app, or the last finished one. With requestId, also says what became of a job call whose reply was lost (committed, failed or unknown).",
  inputSchema: {
    type: "object",
    properties: { requestId: { type: "string", pattern: "^[A-Za-z0-9_-]{8,64}$", description: "The requestId of an earlier job call." } },
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  async run(ctx) {
    return { data: await requireJobs(ctx).status({ requestId: ctx.args.requestId }) };
  },
};

export const finishJobTool = {
  name: "finish_job",
  title: "Finish the job",
  description: "Finishes the running job: the user sees what changed and can undo it. Call it when the requested changes are done.",
  inputSchema: { type: "object", properties: { jobId: JOB_ID }, required: ["jobId"], additionalProperties: false },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  recordsOutcome: true,
  async run(ctx) {
    return { data: { job: await requireJobs(ctx).finish({ jobId: ctx.args.jobId, session: ctx.session }) } };
  },
};

export const stopJobTool = {
  name: "stop_job",
  title: "Stop the job",
  description: "Stops the running job and puts the site back exactly as it was before the job started.",
  inputSchema: { type: "object", properties: { jobId: JOB_ID }, required: ["jobId"], additionalProperties: false },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  recordsOutcome: true,
  async run(ctx) {
    const job = await requireJobs(ctx).stop({ jobId: ctx.args.jobId, reason: "assistant" });
    return { data: { job } };
  },
};

export const undoLastJobTool = {
  name: "undo_last_job",
  title: "Undo the last job",
  description:
    "Puts the open site back as it was before its most recent finished job. Only while nothing changed after that job; the user must have no unsaved changes.",
  inputSchema: { type: "object", properties: { jobId: JOB_ID }, required: ["jobId"], additionalProperties: false },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  recordsOutcome: true,
  async run(ctx) {
    return { data: { job: await requireJobs(ctx).undo({ jobId: ctx.args.jobId }) } };
  },
};

export const waitForApprovalTool = {
  name: "wait_for_approval",
  title: "Wait for the user's answer",
  description:
    "After NEEDS_APPROVAL: waits up to 20 seconds for the user to answer in Widgetizer. Returns pending (call again), allowed (repeat the request with its approvalId), cancelled (don't do it) or gone (the job ended).",
  inputSchema: {
    type: "object",
    properties: { approvalId: { type: "string", pattern: "^[a-f0-9-]{36}$", description: "From NEEDS_APPROVAL." } },
    required: ["approvalId"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  async run(ctx) {
    return { data: { approvalId: ctx.args.approvalId, status: await requireJobs(ctx).waitForApproval(ctx.args.approvalId) } };
  },
};

export const jobTools = [startJobTool, jobStatusTool, finishJobTool, stopJobTool, undoLastJobTool, waitForApprovalTool];
