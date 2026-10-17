import crypto from "node:crypto";
import { SiteLockedError } from "@widgetizer/core/errors";
import { asToolError, toolError } from "../errors.js";
import { SnapshotError, canonicalJson } from "../snapshots/index.js";

const IDLE_MS = 10 * 60 * 1000;
const MAX_TARGETS = 3;
const APPROVAL_WAIT_MS = 20000;
const JOB_HEADER = "x-widgetizer-job";

const MESSAGES = {
  locked: "The assistant is working on this site. Wait for it to finish, or press Stop.",
  recovery: "Widgetizer couldn't undo the assistant's changes. Choose Try again, or keep the site as it is now.",
  stale: "The assistant changed this site after this window loaded it, so this change can't be saved. Reload to see the current site.",
  notActive: "This assistant job is not running.",
  busy: "Another assistant job or undo is in progress. Wait for it to end (see job_status).",
  restoreFailed: "Widgetizer couldn't put the site back.",
};

const HANDSHAKE_FAILURES = {
  unsaved: ["UNSAVED_CHANGES", "The user has unsaved changes in Widgetizer. Ask them to save or discard them, then try again."],
  unreachable: ["EDITOR_UNREACHABLE", "A Widgetizer window didn't respond. Ask the user to check Widgetizer, then try again."],
  no_editor: ["EDITOR_NOT_OPEN", "Widgetizer isn't showing this site. Ask the user to open it, so they can follow and stop the changes."],
  access_off: ["ASSISTANT_DISABLED", "Assistant access was turned off in Widgetizer."],
  disconnected: ["SESSION_ENDED", "This assistant connection ended before the job started."],
  cancelled: ["JOB_STOPPED", "The job was stopped before it started."],
};

const operationId = () => crypto.randomUUID();
const hashOf = (value) => crypto.createHash("sha256").update(canonicalJson(value)).digest("hex");

// Messages written for people only; anything else could carry a file path.
function publicError(error) {
  return error instanceof SnapshotError ? error.message : MESSAGES.restoreFailed;
}

function handshakeError(reason) {
  const [code, message] = HANDSHAKE_FAILURES[reason] ?? HANDSHAKE_FAILURES.cancelled;
  return toolError(code, message);
}

/**
 * Assistant jobs: start (with every window's agreement), finish, stop, undo, and
 * recovery after a crash. Every operation takes its turn in one queue and settles in
 * a durable state. While a job or operation is open the gate refuses every editor
 * write, and a job's own writes only while it is active.
 *
 * @param {{
 *   store: object,
 *   snapshots: object,
 *   sections: { run: (projectId: string, writer: object, fn: () => Promise<any>) => Promise<any> },
 *   siteScope: (projectId: string) => object|null,
 *   openSite: () => Promise<{ scope: object, project: object }|null>,
 *   normalize: (scope: object) => Promise<boolean>,
 *   switchSite: (projectId: string) => Promise<void>,
 *   saves?: Record<string, (writer: object, args: object) => Promise<any>>,
 *   internalHeaders?: () => Record<string, string>,
 *   reader?: object,
 *   isAccessEnabled: () => boolean,
 *   isSessionAlive: (sessionId: string) => boolean,
 *   events: object,
 *   now?: () => number,
 *   idleMs?: number,
 * }} deps
 */
export function createJobManager({
  store,
  snapshots,
  sections,
  siteScope,
  openSite,
  normalize,
  switchSite,
  saves = {},
  internalHeaders = () => ({}),
  reader = null,
  isAccessEnabled,
  isSessionAlive,
  events,
  now = Date.now,
  idleMs = IDLE_MS,
}) {
  let queue = Promise.resolve();
  let preparation = null;
  let idleTimer = null;
  let closed = false;
  const approvalWaiters = new Set();
  const approvalListeners = new Set();
  const routeTokens = new Map();
  let siteHandoff = null;
  const routeFlights = new Set();
  const routesSettled = () => Promise.allSettled([...routeFlights]);
  let baseUrl = null;
  let edits = Promise.resolve();
  let editsWaiting = 0;

  // A job's edits run one after another, so each reads what the one before it saved.
  const oneEditAtATime = (fn) => {
    editsWaiting += 1;
    const run = edits.then(fn).finally(() => {
      editsWaiting -= 1;
    });
    edits = run.catch(() => {});
    return run;
  };
  const editsSettled = async () => {
    while (editsWaiting) await edits;
  };

  function promptNow() {
    const open = store.open();
    if (open?.state === "awaiting_approval") {
      return { kind: "approval", id: open.approval.id, plan: open.approval.plan, jobId: open.id, summary: open.summary };
    }
    if (open?.state === "decision_needed") return { kind: "decision", jobId: open.id, summary: open.summary };
    return null;
  }

  let lastPrompt = "null";
  function wakeApprovals() {
    for (const waiter of [...approvalWaiters]) waiter();
    const prompt = promptNow();
    const shown = JSON.stringify(prompt);
    if (shown === lastPrompt) return;
    lastPrompt = shown;
    for (const listener of approvalListeners) listener(prompt);
  }

  // Inside the edit's section: either the user's fresh Allow for exactly this request, or a new request to ask.
  async function requireApproval(latest, { tool, argsHash, approvalId, reasons, actions }) {
    const fingerprint = await snapshots.fingerprint(scopeOf(latest));
    const asked = latest.approval;
    if (approvalId) {
      const valid =
        asked?.id === approvalId && asked.status === "allowed" && asked.tool === tool && asked.argsHash === argsHash && asked.fingerprint === fingerprint;
      if (valid) return asked;
      throw toolError(
        "APPROVAL_INVALID",
        "That approval doesn't match this request, was already used, or the site changed since. Repeat the request without approvalId to ask again.",
      );
    }
    const plan = [...actions, ...reasons.map((reason) => `This needs your OK because it would ${reason}.`)];
    const approval = { id: crypto.randomUUID(), tool, argsHash, plan, fingerprint, status: "pending", created: stamp() };
    transitionOrThrow(latest, { state: "awaiting_approval", approval });
    armIdle(null);
    await announce();
    wakeApprovals();
    throw toolError(
      "NEEDS_APPROVAL",
      `This needs the user's OK in Widgetizer, which is asking them now: ${reasons.join("; ")}. ` +
        `Call wait_for_approval with approvalId "${approval.id}"; once it says allowed, repeat this exact call with that approvalId.`,
    );
  }

  const serial = (fn) => {
    const run = queue.then(fn);
    queue = run.catch(() => {});
    return run;
  };
  const stamp = () => new Date(now()).toISOString();
  const lifecycle = (job) => ({ kind: "lifecycle", jobId: job.id, operation: job.operation });

  function scopeOf(job) {
    const scope = siteScope(job.projectId);
    if (!scope) throw new Error(`The site of job ${job.id} no longer exists.`);
    return scope;
  }

  function publicJob(job) {
    if (!job) return null;
    return {
      id: job.id,
      siteId: job.projectId,
      state: job.state,
      summary: job.summary,
      languages: job.languages,
      startedBy: job.requestId,
      approval: job.approval ? { id: job.approval.id, plan: job.approval.plan, status: job.approval.status } : null,
      completion: job.receipt?.completion ?? null,
      reason: job.reason,
      error: job.error,
      created: job.created,
      ended: job.ended,
    };
  }

  async function state() {
    const site = await openSite().catch(() => null);
    const latest = site ? store.latestFinished(site.project.id) : null;
    return { generation: store.generation(), job: publicJob(store.open()), lastFinished: publicJob(latest) };
  }

  async function announce() {
    events.broadcast("state", await state());
    wakeApprovals();
  }

  function armIdle(job) {
    clearTimeout(idleTimer);
    idleTimer = null;
    if (closed || !job || job.state !== "active") return;
    idleTimer = setTimeout(() => {
      stop({ jobId: job.id, reason: "idle" }).catch((error) => console.error("Stopping an idle assistant job failed:", error));
    }, idleMs);
    idleTimer.unref?.();
  }

  function transitionOrThrow(job, patch, options) {
    const next = store.transition(job.id, job.gen, patch, options);
    if (!next) throw new Error(`Assistant job ${job.id} changed while it was being updated.`);
    return next;
  }

  // A job's own write can advance its gen at any moment while it is active.
  function leaveActive(job, patch) {
    for (;;) {
      const latest = store.get(job.id);
      if (latest.state !== "active" && latest.state !== "awaiting_approval") return null;
      const next = store.transition(latest.id, latest.gen, patch);
      if (next) return next;
    }
  }

  // Keeps the newest copies within the limits, and always the latest undo point and any open job's copy.
  async function retain(projectId) {
    const scope = siteScope(projectId);
    if (!scope) return;
    const protect = [store.latestFinished(projectId)?.snapshotId, store.open()?.snapshotId].filter(Boolean);
    await snapshots.prune(scope, { protect }).catch((error) => console.error("Pruning assistant snapshots failed:", error));
  }

  async function settle(job, patch, options) {
    const settled = transitionOrThrow(job, { operation: null, ended: stamp(), ...patch }, options);
    routeTokens.delete(settled.id);
    await announce();
    await retain(settled.projectId);
    return settled;
  }

  async function restoreJob(job, intent) {
    let current = transitionOrThrow(job, { state: "restoring", intent, operation: operationId(), error: null }, { bump: true });
    await announce();
    try {
      await sections.run(current.projectId, lifecycle(current), () => snapshots.restore(scopeOf(current), current.snapshotId));
    } catch (error) {
      console.error(`Restoring after assistant job ${job.id} failed:`, error);
      current = transitionOrThrow(current, { state: "recovery_needed", error: publicError(error), operation: operationId() });
      await announce();
      return current;
    }
    let switchFailed = null;
    if (intent.switchTo) {
      try {
        await sections.run(current.projectId, lifecycle(current), () => switchSite(intent.switchTo));
      } catch (error) {
        switchFailed = error;
      }
    }
    const settled = await settle(current, { state: intent.terminal, intent: null });
    if (switchFailed) throw switchFailed;
    return settled;
  }

  // A job write marks the job dirty inside the section before it writes, so this check, made inside the section, can't miss one.
  async function stopActive(job, { reason, switchTo }) {
    let current = leaveActive(job, { state: "stopping", reason, operation: operationId() });
    if (!current) return store.get(job.id);
    armIdle(null);
    await announce();
    await routesSettled();
    let clean;
    try {
      clean = await sections.run(current.projectId, lifecycle(current), async () => !store.get(job.id).dirty);
    } catch (error) {
      console.error(`Checking assistant job ${job.id} before stopping failed:`, error);
      clean = false;
    }
    current = store.get(job.id);
    if (!clean) return restoreJob(current, { terminal: "stopped", ...(switchTo ? { switchTo } : {}) });
    let switchFailed = null;
    if (switchTo) {
      try {
        await sections.run(current.projectId, lifecycle(current), () => switchSite(switchTo));
      } catch (error) {
        switchFailed = error;
      }
    }
    const stopped = await settle(store.get(job.id), { state: "stopped" });
    if (switchFailed) throw switchFailed;
    return stopped;
  }

  async function prepare(job, prep) {
    let snapshotId = null;
    let failure = null;
    let current = job;
    const cohort = events.openCohort({ operation: job.operation, jobId: job.id });
    prep.cohort = cohort;
    const interrupted = () => {
      if (prep.aborted) return prep.reason ?? "cancelled";
      if (!isAccessEnabled()) return "access_off";
      if (!isSessionAlive(job.sessionId)) return "disconnected";
      return null;
    };
    try {
      const first = await cohort.settled();
      failure = first.ok ? interrupted() : first.reason;
      if (!failure) {
        current = transitionOrThrow(current, { normalised: true });
        const scope = scopeOf(current);
        await sections.run(current.projectId, lifecycle(current), async () => {
          if (await normalize(scope)) store.bumpGeneration();
        });
        failure = interrupted();
      }
      if (!failure) {
        ({ id: snapshotId } = await sections.run(current.projectId, lifecycle(current), () => snapshots.capture(scopeOf(current))));
        failure = interrupted();
      }
      if (!failure) {
        const last = await cohort.close();
        // Nothing may await between this verdict and activation: a window connecting in between would go unasked.
        failure = last.ok ? interrupted() : last.reason;
        if (!failure) {
          current = transitionOrThrow(store.get(job.id), { state: "active", snapshotId, operation: null });
        }
      }
    } catch (error) {
      console.error(`Preparing assistant job ${job.id} failed:`, error);
      failure = "error";
    } finally {
      cohort.cancel();
    }

    if (failure) {
      const latest = store.get(job.id);
      const terminal = failure === "error" ? "failed" : "cancelled";
      store.transition(latest.id, latest.gen, { state: terminal, reason: failure, operation: null, ended: stamp() }, { bump: latest.normalised });
      if (snapshotId) await snapshots.discard(scopeOf(latest), snapshotId).catch(() => {});
      await announce();
      if (failure === "error") throw toolError("JOB_FAILED", "Widgetizer couldn't prepare this site for changes. Nothing was changed.");
      throw handshakeError(failure);
    }

    routeTokens.set(current.id, crypto.randomBytes(24).toString("base64url"));
    armIdle(current);
    await announce();
    return current;
  }

  async function stop({ jobId = null, reason, switchTo = null } = {}) {
    if (siteHandoff && !jobId) {
      siteHandoff.cancelled = true;
      siteHandoff.cohort?.cancel();
    }
    return serial(async () => {
      let job = store.open();
      const target = jobId ?? job?.id ?? null;
      if (job?.state === "preparing" && preparation?.jobId === job.id && (!jobId || jobId === job.id)) {
        const prep = preparation;
        prep.aborted = true;
        prep.reason = reason;
        prep.cohort?.cancel();
        await prep.promise.catch(() => {});
        job = store.open();
      }
      if (!job) {
        if (switchTo) await switchSite(switchTo);
        return target ? publicJob(store.get(target)) : null;
      }
      if (jobId && job.id !== jobId) throw toolError("JOB_NOT_ACTIVE", MESSAGES.notActive);
      if (job.state === "active" || job.state === "awaiting_approval") {
        const stopped = await stopActive(job, { reason, switchTo });
        wakeApprovals();
        return publicJob(stopped);
      }
      if (job.state === "decision_needed") {
        return publicJob(await restoreJob(job, { terminal: "stopped", ...(switchTo ? { switchTo } : {}) }));
      }
      if (job.state === "recovery_needed") throw toolError("RECOVERY_NEEDED", MESSAGES.recovery);
      return publicJob(job);
    });
  }

  async function undoInQueue(jobId) {
    const site = await openSite();
    if (!site) throw toolError("NO_OPEN_SITE", "No site is open in Widgetizer. Ask the user to open one.");
    const latest = store.latestFinished(site.project.id);
    if (!latest || latest.id !== jobId) {
      throw toolError("UNDO_UNAVAILABLE", "Only the most recent finished job on the open site can be undone.");
    }
    let current = store.transition(latest.id, latest.gen, { state: "undoing", operation: operationId() });
    if (!current) throw toolError("BUSY", MESSAGES.busy);
    await announce();
    const backToFinished = async (error) => {
      transitionOrThrow(store.get(current.id), { state: "finished", operation: null });
      await announce();
      throw error;
    };
    const cohort = events.openCohort({ operation: current.operation, jobId: current.id });
    let verdict;
    let unchanged = false;
    try {
      verdict = await cohort.settled();
      if (verdict.ok) {
        const fingerprint = await sections.run(current.projectId, lifecycle(current), () => snapshots.fingerprint(scopeOf(current)));
        unchanged = fingerprint === current.endFingerprint;
        verdict = await cohort.close();
      }
    } catch (error) {
      console.error(`Checking whether assistant job ${jobId} can be undone failed:`, error);
      verdict = { ok: false, reason: "error" };
    } finally {
      cohort.cancel();
    }
    if (verdict.reason === "error") return backToFinished(toolError("UNDO_FAILED", "Widgetizer couldn't check the site, so nothing was undone."));
    if (!verdict.ok) return backToFinished(handshakeError(verdict.reason));
    if (!unchanged) {
      return backToFinished(
        toolError("SITE_CHANGED_SINCE", "The site changed after this job finished, so undoing it would also remove those changes."),
      );
    }
    return restoreJob(store.get(current.id), { terminal: "undone" });
  }

  function jobForEdit({ jobId, session, languages }) {
    const job = store.open();
    if (!job || job.id !== jobId || job.state !== "active") throw toolError("JOB_NOT_ACTIVE", MESSAGES.notActive);
    if (job.sessionId !== session.id) throw toolError("JOB_NOT_YOURS", "This job was started by another assistant connection.");
    const outside = languages.filter((code) => !job.languages.includes(code));
    if (outside.length) {
      throw toolError("LANGUAGE_NOT_IN_JOB", `This job may change ${job.languages.join(", ")} only. Start another job for ${outside.join(", ")}.`);
    }
    return job;
  }

  // The job's limits against what it has done so far; past them, the user's Allow for exactly this request.
  async function weigh(latest, entries, { tool, argsHash, approvalId }) {
    const targets = { ...(latest.impact?.targets ?? {}) };
    const receipts = { ...(latest.receipt?.targets ?? {}) };
    const reasons = [];
    const removalAsked = new Set();
    const counted = () => Object.values(targets).filter((target) => target.counts !== false).length;
    for (const entry of entries) {
      const known = targets[entry.key];
      const seen = { original: null, removed: [], label: entry.label, ...known };
      if (seen.original == null && entry.before) seen.original = entry.before;
      if (!known && entry.counts !== false && counted() >= MAX_TARGETS) {
        reasons.push(`change ${entry.label}, more than ${MAX_TARGETS} pages or parts of the site in one job`);
      }
      const original = seen.original ?? [];
      const kept = new Set(entry.after ?? []);
      const removed = entry.after ? [...new Set([...seen.removed, ...original.filter((id) => !kept.has(id))])] : seen.removed;
      const approved = new Set(seen.approvedRemoved ?? []);
      if (original.length && removed.length > original.length / 2 && removed.some((id) => !approved.has(id))) {
        reasons.push(`remove ${removed.length} of the ${original.length} ${entry.unit ?? "sections"} ${entry.label} had`);
        removalAsked.add(entry.key);
      }
      if (entry.confirm) reasons.push(entry.confirm);
      targets[entry.key] = { ...seen, removed, ...(entry.counts === false ? { counts: false } : {}) };
      const receipt = receipts[entry.key] ?? { label: entry.label, added: [], updated: [], removed: [], moved: [], notes: [] };
      for (const kind of ["added", "updated", "removed", "moved", "notes"]) {
        receipt[kind] = [...new Set([...(receipt[kind] ?? []), ...(entry.changes?.[kind] ?? [])])];
      }
      receipts[entry.key] = { ...receipt, label: entry.label, ...(entry.link ? { link: entry.link } : {}) };
    }
    let approval = latest.approval;
    if (reasons.length) {
      const actions = entries.map((entry) => entry.summary ?? `change ${entry.label}`);
      approval = await requireApproval(latest, { tool, argsHash, approvalId, reasons, actions });
      for (const key of removalAsked) targets[key] = { ...targets[key], approvedRemoved: targets[key].removed };
    }
    return {
      impact: { targets },
      receipt: { targets: receipts },
      ...(reasons.length ? { approval: { ...approval, status: "used" } } : {}),
    };
  }

  // Only while the job still runs: once Stop or finish has taken over, a late receipt must not move it.
  function commitTo(jobId, patch) {
    for (;;) {
      const latest = store.get(jobId);
      if (latest.state !== "active") return false;
      if (store.transition(latest.id, latest.gen, patch)) return true;
    }
  }

  async function failedAfterWriting(jobId, error) {
    console.error(`An edit in assistant job ${jobId} failed:`, error);
    const settled = await stop({ jobId, reason: "failed" }).catch(() => null);
    if (settled?.state === "stopped") {
      throw toolError("JOB_FAILED", "Widgetizer couldn't save that change, so it stopped the job and put the site back.");
    }
    throw toolError("RECOVERY_NEEDED", "Widgetizer couldn't save that change or put the site back. Ask the user to choose Try again or Keep in Widgetizer.");
  }

  async function runEditNow({ jobId, session, languages = [], tool, args, approvalId = null, perform, sideEffects }) {
    const job = jobForEdit({ jobId, session, languages });
    const argsHash = hashOf({ tool, args });
    let wrote = false;
    let pending = null;
    const inspect = async (entries) => {
      pending = await weigh(store.get(jobId), entries, { tool, argsHash, approvalId });
    };
    // Recorded only once every check has passed, so a refused edit leaves the job as it was.
    const beforeWrite = () => {
      manager.beginJobWrite(jobId, pending);
      wrote = true;
    };
    let result;
    try {
      result = await perform({ writer: { kind: "job", jobId }, scope: scopeOf(job), inspect, beforeWrite });
    } catch (error) {
      if (error?.code === "JOB_NOT_ACTIVE") throw toolError("JOB_NOT_ACTIVE", MESSAGES.notActive);
      if (asToolError(error)) throw error;
      if (error?.statusCode && error.statusCode < 500) throw toolError(error.code ?? "EDIT_REFUSED", error.message);
      if (!wrote) {
        console.error(`An edit in assistant job ${jobId} failed:`, error);
        throw toolError("EDIT_FAILED", "Widgetizer couldn't make that change. Nothing was changed.");
      }
      return failedAfterWriting(jobId, error);
    }
    const notes = sideEffects?.(result);
    if (notes?.length) manager.noteSideEffects(jobId, notes);
    armIdle(store.get(jobId));
    return { result, receipt: store.get(jobId).receipt?.targets ?? {} };
  }

  // Widgetizer's own account of a finished job, from what was actually saved: what changed, where to look,
  // and next steps it can verify (demo photos still in the sections the job changed).
  async function completionOf(job) {
    const targets = Object.values(job.receipt?.targets ?? {}).map((target) => ({ ...target }));
    const nextSteps = [];
    const site = reader ? await openSite() : null;
    const pages = [];
    if (site && site.project.id === job.projectId) {
      const slugsByLanguage = new Map();
      const pageNow = async (link) => {
        const lang = reader.contentLanguage(site.project, link.language);
        if (!link.pageUuid) {
          const doc = await reader.readPage(site.scope, link.page, lang).catch(() => null);
          return doc ? { doc, slug: link.page, lang } : null;
        }
        if (!slugsByLanguage.has(lang.language)) {
          const found = new Map();
          for (const slug of await reader.listPageSlugs(site.scope, lang)) {
            const doc = await reader.readPage(site.scope, slug, lang).catch(() => null);
            if (doc?.uuid) found.set(doc.uuid, { doc, slug, lang });
          }
          slugsByLanguage.set(lang.language, found);
        }
        return slugsByLanguage.get(lang.language).get(link.pageUuid) ?? null;
      };
      for (const target of targets) {
        if (!target.link) continue;
        const now = await pageNow(target.link).catch(() => null);
        target.link = now ? { page: now.slug, language: now.lang.language } : null;
        if (!now) continue;
        pages.push(target);
        const doc = now.doc;
        const sections = new Set([...(target.added ?? []), ...(target.updated ?? [])].map((id) => id.split("/")[0]));
        const paths = new Set();
        const collect = (value) => {
          if (typeof value === "string" && value.startsWith("/uploads/images/")) paths.add(value);
          else if (Array.isArray(value)) value.forEach(collect);
          else if (value && typeof value === "object") Object.values(value).forEach(collect);
        };
        for (const id of sections) collect(doc.widgets?.[id]);
        target.section = [...sections].find((id) => doc.widgets?.[id]) ?? null;
        const ids = paths.size ? await reader.mediaIds(site.scope, [...paths]) : new Map();
        let demo = 0;
        for (const id of new Set(ids.values())) if ((await reader.mediaFile(site.scope, id))?.source === "preset") demo += 1;
        if (demo) nextSteps.push(`Replace the ${demo} demo photo${demo === 1 ? "" : "s"} on ${target.label} with your own.`);
      }
    }
    const changes = targets.map((target) => ({
      label: target.label,
      added: target.added?.length ?? 0,
      changed: target.updated?.length ?? 0,
      removed: target.removed?.length ?? 0,
      moved: target.moved?.length ?? 0,
      ...(target.link ? { link: target.link } : {}),
      ...(target.notes?.length ? { notes: target.notes } : {}),
    }));
    const first = pages[0];
    const section = first?.section ?? null;
    return {
      changes,
      nextSteps,
      navigate: first ? { page: first.link.page, language: first.link.language, ...(section ? { section } : {}) } : null,
    };
  }

  /** A request the app makes as the editor would, outside any job. */
  async function requestAsEditor({ method, path, body }) {
    if (!baseUrl) throw new Error("The server address isn't known yet.");
    const response = await fetch(new URL(path, baseUrl), {
      method,
      headers: { origin: new URL(baseUrl).origin, ...internalHeaders(), "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { status: response.status, data };
  }

  /** A request to one of the editor's own routes, made as the job. */
  async function callRoute(jobId, { method = "GET", path, body, query }) {
    if (!baseUrl) throw new Error("The server address isn't known yet.");
    const url = new URL(path, baseUrl);
    for (const [key, value] of Object.entries(query ?? {})) if (value != null) url.searchParams.set(key, value);
    const job = store.get(jobId);
    const response = await fetch(url, {
      method,
      headers: {
        origin: new URL(baseUrl).origin,
        "x-project-id": job.projectId,
        [JOB_HEADER]: `${jobId}.${routeTokens.get(jobId) ?? ""}`,
        ...internalHeaders(),
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { status: response.status, data };
  }

  /**
   * One job edit through an editor route. `entries` say what it will change and are checked against the
   * job's limits first; the job counts as changed before the request is sent, and what it changed is
   * recorded once the route says it saved. An unclear failure puts the site back.
   */
  async function runRouteNow({ jobId, session, languages = [], tool, args, approvalId = null, build }) {
    jobForEdit({ jobId, session, languages });
    const { entries, request, linkFrom } = await build((options) => callRoute(jobId, options));
    const pending = await weigh(store.get(jobId), entries, { tool, argsHash: hashOf({ tool, args }), approvalId });
    manager.beginJobWrite(jobId, {});
    const flight = request((options) => callRoute(jobId, options));
    routeFlights.add(flight);
    let response;
    try {
      response = await flight;
    } catch (error) {
      if (asToolError(error)) throw error;
      return failedAfterWriting(jobId, error);
    } finally {
      routeFlights.delete(flight);
    }
    if (response.status >= 200 && response.status < 300) {
      const link = linkFrom?.(response.data);
      if (link && entries[0]) pending.receipt.targets[entries[0].key] = { ...pending.receipt.targets[entries[0].key], link };
      if (!commitTo(jobId, pending)) {
        throw toolError("JOB_STOPPED", "The job was stopped while this was being saved, so Widgetizer puts the site back.");
      }
      armIdle(store.get(jobId));
      return { data: response.data, receipt: store.get(jobId).receipt?.targets ?? {} };
    }
    if (response.status >= 400 && response.status < 500) {
      const data = response.data && typeof response.data === "object" ? response.data : {};
      const listed = Array.isArray(data.errors) ? data.errors.map((entry) => entry.msg).join("; ") : null;
      throw toolError(data.code ?? "EDIT_REFUSED", data.message ?? data.error ?? listed ?? "Widgetizer refused that change.");
    }
    return failedAfterWriting(jobId, new Error(`The editor answered ${response.status}.`));
  }

  async function finishNow({ jobId, session }) {
    const job = store.open();
    if (!job || job.id !== jobId || job.state !== "active") throw toolError("JOB_NOT_ACTIVE", MESSAGES.notActive);
    if (job.sessionId !== session.id) throw toolError("JOB_NOT_YOURS", "This job was started by another assistant connection.");
    let current = leaveActive(job, { state: "finishing", operation: operationId() });
    if (!current) throw toolError("JOB_NOT_ACTIVE", MESSAGES.notActive);
    armIdle(null);
    await announce();
    let fingerprint;
    try {
      fingerprint = await sections.run(current.projectId, lifecycle(current), () => snapshots.fingerprint(scopeOf(current)));
    } catch (error) {
      console.error(`Finishing assistant job ${jobId} failed:`, error);
      current = transitionOrThrow(store.get(current.id), { state: "active", operation: null });
      armIdle(current);
      await announce();
      throw toolError("FINISH_FAILED", "Widgetizer couldn't finish the job. Call finish_job again, or stop_job to put the site back.");
    }
    const completion = await completionOf(current).catch((error) => {
      console.error(`Describing assistant job ${jobId} failed:`, error);
      return null;
    });
    return publicJob(
      await settle(current, { state: "finished", endFingerprint: fingerprint, receipt: { ...(current.receipt ?? {}), completion } }),
    );
  }

  const manager = {
    state,
    publicJob,
    saves,

    isBusy: () => Boolean(store.open()),
    openJob: () => store.open(),

    /** The write gate: called inside the content-write section with the writer of the call. */
    check(projectId, writer) {
      if (writer?.kind === "invalid") throw new SiteLockedError(MESSAGES.notActive, { code: "JOB_NOT_ACTIVE" });
      const open = store.open();
      if (writer?.kind === "lifecycle") {
        if (open && open.id === writer.jobId && open.operation === writer.operation && open.projectId === projectId) return;
        throw new SiteLockedError(MESSAGES.notActive, { code: "JOB_NOT_ACTIVE" });
      }
      if (writer?.kind === "job") {
        const allowed =
          open?.id === writer.jobId &&
          open.state === "active" &&
          open.projectId === projectId &&
          isAccessEnabled() &&
          isSessionAlive(open.sessionId) &&
          events.hasDocuments();
        if (allowed) return;
        throw new SiteLockedError(MESSAGES.notActive, { code: "JOB_NOT_ACTIVE" });
      }
      if (open) {
        throw new SiteLockedError(open.state === "recovery_needed" ? MESSAGES.recovery : MESSAGES.locked, { code: "SITE_LOCKED" });
      }
      if (writer?.kind !== "maintenance" && writer?.baseline != null && String(writer.baseline) !== String(store.generation())) {
        throw new SiteLockedError(MESSAGES.stale, { code: "STALE_AFTER_ASSISTANT" });
      }
    },

    /** Which site is open changes only while nothing is open, or as part of the open operation. */
    checkActiveSite(writer) {
      const open = store.open();
      if (!open) return;
      if (writer?.kind === "lifecycle" && open.id === writer.jobId && open.operation === writer.operation) return;
      throw new SiteLockedError(open.state === "recovery_needed" ? MESSAGES.recovery : MESSAGES.locked, { code: "SITE_LOCKED" });
    },

    /** `siteId` is the site the caller read; the job starts only if it is still the open one. */
    async start({ session, requestId, summary, languages = [], siteId }) {
      const prep = await serial(async () => {
        if (!isAccessEnabled()) throw handshakeError("access_off");
        if (!isSessionAlive(session.id)) throw handshakeError("disconnected");
        const site = await openSite();
        if (!site) throw toolError("NO_OPEN_SITE", "No site is open in Widgetizer. Ask the user to open one.");
        if (site.project.id !== siteId) {
          throw toolError("SITE_CHANGED", "The user switched to another site in Widgetizer. Check which site is open and ask again.");
        }
        if (!events.hasDocuments()) throw handshakeError("no_editor");
        const job = store.insert({
          id: crypto.randomUUID(),
          projectId: site.project.id,
          sessionId: session.id,
          client: session.client,
          summary,
          languages,
          requestId,
          state: "preparing",
          operation: operationId(),
        });
        if (!job) throw toolError("BUSY", store.open()?.state === "recovery_needed" ? MESSAGES.recovery : MESSAGES.busy);
        const next = { jobId: job.id, aborted: false, reason: null, cohort: null };
        next.promise = (async () => {
          await announce();
          return prepare(job, next);
        })();
        next.promise.catch(() => {});
        preparation = next;
        return next;
      });
      try {
        return publicJob(await prep.promise);
      } finally {
        if (preparation === prep) preparation = null;
      }
    },

    // Every edit sent before finish settles first, failures and their put-back included; a failed edit
    // runs Stop through the same queue finish holds, so finish waits outside it and only then takes it.
    async finish({ jobId, session }) {
      for (;;) {
        if (editsWaiting) await editsSettled();
        const finished = await serial(async () => {
          if (editsWaiting) return null;
          return finishNow({ jobId, session });
        });
        if (finished) return finished;
      }
    },

    stop,

    undo: ({ jobId }) => serial(async () => publicJob(await undoInQueue(jobId))),

    async status({ requestId } = {}) {
      const open = store.open();
      const result = { job: publicJob(open), ...(open ? {} : { lastFinished: (await state()).lastFinished }) };
      if (requestId) {
        const recorded = store.outcome(requestId);
        result.request = recorded ? { requestId, ...recorded } : { requestId, outcome: "unknown" };
      }
      return result;
    },

    recordOutcome: (requestId, tool, jobId, outcome) => store.recordOutcome(requestId, tool, jobId, outcome),

    /** Inside the section, before a job's write: from here on, stopping the job restores the site. */
    beginJobWrite(jobId, patch = {}) {
      const open = store.open();
      if (open?.id !== jobId || open.state !== "active") throw new SiteLockedError(MESSAGES.notActive, { code: "JOB_NOT_ACTIVE" });
      transitionOrThrow(open, { ...patch, dirty: true }, { bump: true });
    },

    /**
     * One job edit through a save service. `perform({ writer, scope, inspect, beforeWrite })` runs the
     * save in one content-write section: it calls `inspect(entries)` with what it would change once its
     * own checks pass, and `beforeWrite()` right before writing. Past the job's limits the edit waits
     * for the user's Allow, bound to these arguments and the site as it is now.
     */
    runEdit: (options) => oneEditAtATime(() => runEditNow(options)),

    /** One job edit through one of the editor's own routes; see runRouteNow. */
    runRoute: (options) => oneEditAtATime(() => runRouteNow(options)),

    /** The writer a request made by `callRoute` carries; anything else claiming to be a job is refused. */
    writerForRequest(req) {
      const claim = req.get?.(JOB_HEADER);
      if (!claim) return null;
      const [jobId, token] = String(claim).split(".");
      return jobId && token && routeTokens.get(jobId) === token ? { kind: "job", jobId } : { kind: "invalid" };
    },

    isJobRequest: (req) => manager.writerForRequest(req)?.kind === "job",

    /** Where the server listens, for the job's own requests. */
    setBaseUrl(url) {
      baseUrl = url;
    },

    /** Changes an edit made beyond its own target (a listing anchor moved off other pages), for the record. */
    noteSideEffects(jobId, entries) {
      const latest = store.get(jobId);
      const receipts = { ...(latest.receipt?.targets ?? {}) };
      for (const entry of entries) {
        const receipt = receipts[entry.key] ?? { label: entry.label, added: [], updated: [], removed: [], moved: [], notes: [] };
        receipts[entry.key] = { ...receipt, notes: [...new Set([...(receipt.notes ?? []), ...entry.notes])] };
      }
      commitTo(jobId, { receipt: { ...(latest.receipt ?? {}), targets: receipts } });
    },

    /** A plain read of an editor route, for tools that need the editor's view of something. */
    readRoute: (jobId, options) => callRoute(jobId, options),

    /**
     * Open another site, or create one from a theme and open it, when the user asked. Every window
     * must have nothing unsaved; then every window moves to the site.
     */
    async changeSite({ session, siteId = null, create = null }) {
      const handoff = { cancelled: false, cohort: null };
      return serial(async () => {
        siteHandoff = handoff;
        if (!isAccessEnabled()) throw handshakeError("access_off");
        if (!isSessionAlive(session.id)) throw handshakeError("disconnected");
        if (store.open()) throw toolError("BUSY", MESSAGES.busy);
        if (!events.hasDocuments()) throw handshakeError("no_editor");
        const cohort = events.openCohort({ operation: operationId(), jobId: null });
        handoff.cohort = cohort;
        let verdict;
        try {
          verdict = await cohort.close();
        } finally {
          cohort.cancel();
        }
        if (!verdict.ok) {
          await announce();
          throw handshakeError(verdict.reason);
        }
        let target = siteId;
        const stillAllowed = () => {
          if (handoff.cancelled) throw handshakeError("cancelled");
          if (!isAccessEnabled()) throw handshakeError("access_off");
          if (!isSessionAlive(session.id)) throw handshakeError("disconnected");
        };
        try {
          stillAllowed();
          if (create) {
            const created = await requestAsEditor({ method: "POST", path: "/api/projects", body: create });
            if (created.status >= 400) {
              throw toolError(created.data?.code ?? "CREATE_FAILED", created.data?.message ?? created.data?.error ?? "Widgetizer couldn't create the site.");
            }
            target = created.data.id;
            stillAllowed();
          }
          await switchSite(target);
        } catch (error) {
          await announce();
          if (asToolError(error)) throw error;
          console.error("Changing the open site failed:", error);
          throw toolError("SITE_CHANGE_FAILED", "Widgetizer couldn't open that site.");
        }
        events.broadcast("site", { siteId: target, path: create ? "/page-editor?pageId=index" : "/pages" });
        await announce();
        return { siteId: target };
      }).finally(() => {
        if (siteHandoff === handoff) siteHandoff = null;
      });
    },

    /** The user's answer to the open Allow/Cancel request. */
    async answerApproval(approvalId, allow) {
      return serial(async () => {
        const job = store.open();
        if (job?.state !== "awaiting_approval" || job.approval?.id !== approvalId) return publicJob(job);
        const next = transitionOrThrow(job, {
          state: "active",
          approval: { ...job.approval, status: allow ? "allowed" : "cancelled", answered: stamp() },
        });
        armIdle(next);
        await announce();
        wakeApprovals();
        return publicJob(next);
      });
    },

    /** Waits a little for the user's answer; call again while it is still pending. */
    async waitForApproval(approvalId, ms = APPROVAL_WAIT_MS) {
      const status = () => {
        const job = store.open();
        return job?.approval?.id === approvalId ? job.approval.status : "gone";
      };
      if (status() !== "pending") return status();
      await new Promise((resolve) => {
        const done = () => {
          clearTimeout(timer);
          approvalWaiters.delete(done);
          resolve();
        };
        const timer = setTimeout(done, ms);
        timer.unref?.();
        approvalWaiters.add(done);
      });
      return status();
    },

    /** After a disconnect or restart while the user was being asked: keep the job's changes, or undo them. */
    async decide(keep) {
      return serial(async () => {
        const job = store.open();
        if (job?.state !== "decision_needed") return publicJob(job);
        if (!keep) {
          const restored = await restoreJob(job, { terminal: "stopped" });
          wakeApprovals();
          return publicJob(restored);
        }
        let current = transitionOrThrow(job, { state: "finishing", operation: operationId() });
        try {
          const fingerprint = await sections.run(current.projectId, lifecycle(current), () => snapshots.fingerprint(scopeOf(current)));
          const finished = await settle(current, { state: "finished", endFingerprint: fingerprint, reason: "kept" });
          wakeApprovals();
          return publicJob(finished);
        } catch (error) {
          console.error(`Keeping assistant job ${job.id} failed:`, error);
          current = transitionOrThrow(store.get(job.id), { state: "decision_needed", operation: null });
          await announce();
          throw toolError("KEEP_FAILED", "Widgetizer couldn't finish the job. Try again.");
        }
      });
    },

    /** Any call from the session running the job counts as activity. */
    touch(sessionId) {
      const open = store.open();
      if (open?.state === "active" && open.sessionId === sessionId) armIdle(open);
    },

    sessionEnded(sessionId) {
      if (closed) return;
      const open = store.open();
      if (open?.state === "awaiting_approval" && open.sessionId === sessionId) {
        serial(async () => {
          const latest = store.get(open.id);
          if (latest.state !== "awaiting_approval") return;
          transitionOrThrow(latest, { state: "decision_needed", approval: { ...latest.approval, status: "cancelled" } });
          await announce();
          wakeApprovals();
        }).catch((error) => console.error("Asking the user about an interrupted job failed:", error));
        return;
      }
      if (open && open.sessionId === sessionId && (open.state === "active" || open.state === "preparing")) {
        stop({ jobId: open.id, reason: "disconnected" }).catch((error) => console.error("Stopping after a disconnect failed:", error));
      }
    },

    accessTurnedOff() {
      if (closed) return;
      const open = store.open();
      if (open && ["active", "preparing", "awaiting_approval", "decision_needed"].includes(open.state)) {
        stop({ jobId: open.id, reason: "access_off" }).catch((error) => console.error("Stopping after access was turned off failed:", error));
      }
    },

    /** Before the server takes requests: put every interrupted job back in a settled state. */
    async recover() {
      return serial(async () => {
        const job = store.open();
        if (!job) return null;
        const reason = "restart";
        switch (job.state) {
          case "preparing":
            return settle(job, { state: "cancelled", reason }, { bump: job.normalised });
          case "undoing":
            return settle(job, { state: "finished", ended: job.ended });
          case "active":
          case "finishing":
          case "stopping":
            if (!job.dirty) return settle(job, { state: "stopped", reason });
            return restoreJob(transitionOrThrow(job, { reason }), { terminal: "stopped" });
          case "restoring":
            return restoreJob(job, job.intent ?? { terminal: "stopped" });
          case "awaiting_approval":
            return transitionOrThrow(job, { state: "decision_needed", approval: { ...job.approval, status: "cancelled" } });
          default:
            return job;
        }
      });
    },

    async retry() {
      return serial(async () => {
        const job = store.open();
        if (job?.state !== "recovery_needed") return publicJob(job);
        return publicJob(await restoreJob(job, job.intent ?? { terminal: "stopped" }));
      });
    },

    async keep() {
      return serial(async () => {
        const job = store.open();
        if (job?.state !== "recovery_needed") return publicJob(job);
        return publicJob(await settle(job, { state: "kept", intent: null }, { bump: true }));
      });
    },

    /** Called now and on every change with what the user must answer (an Allow/Cancel request or a keep/undo choice), or null. */
    onPrompt(listener) {
      approvalListeners.add(listener);
      const prompt = promptNow();
      lastPrompt = JSON.stringify(prompt);
      listener(prompt);
      return () => approvalListeners.delete(listener);
    },

    currentPrompt: promptNow,

    // On shutdown an open job stays as it is; the next start recovers it.
    close() {
      closed = true;
      clearTimeout(idleTimer);
    },
  };
  return manager;
}
