import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { migrateAssistantTables } from "../assistantDb.js";
import { createJobStore } from "../jobStore.js";
import { createJobManager } from "../../../packages/assistant/src/jobs/manager.js";

const SITE = { scope: { projectId: "site-1", folderName: "site-1" }, project: { id: "site-1", name: "Site" } };
const session = { id: "session-1", client: { name: "test" } };

function setup({ idleMs = 60000, capture, switchSite = async () => {}, editDocument, restore } = {}) {
  const db = new Database(":memory:");
  migrateAssistantTables(db);
  const store = createJobStore(db);
  const calls = { restored: [], discarded: [], normalized: 0 };
  const snapshots = {
    capture: capture ?? (async () => ({ id: "1700000000000-aaaaaaaa" })),
    restore: restore ?? (async (scope, id) => void calls.restored.push(id)),
    fingerprint: async () => "fp",
    prune: async () => [],
    discard: async (scope, id) => void calls.discarded.push(id),
  };
  const events = {
    openCohort: () => ({ settled: async () => ({ ok: true }), close: async () => ({ ok: true }), cancel() {} }),
    broadcast() {},
    hasDocuments: () => true,
  };
  const deps = {
    store,
    snapshots,
    sections: { run: (projectId, writer, fn) => fn() },
    siteScope: () => SITE.scope,
    openSite: async () => SITE,
    normalize: async () => {
      calls.normalized += 1;
      return true;
    },
    switchSite,
    editDocument,
    isAccessEnabled: () => true,
    isSessionAlive: () => true,
    events,
    idleMs,
  };
  const jobs = createJobManager(deps);
  return { db, store, jobs, calls, deps };
}

const until = async (check, ms = 2000) => {
  const end = Date.now() + ms;
  while (!(await check())) {
    if (Date.now() > end) throw new Error("timed out");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

describe("job manager", () => {
  let env;
  beforeEach(() => {
    env = setup();
  });

  it("stops and restores a job left idle", async () => {
    env = setup({ idleMs: 50 });
    const job = await env.jobs.start({ session, requestId: "req-00000001", summary: "Idle", siteId: "site-1" });
    env.jobs.beginJobWrite(job.id);
    await until(() => env.store.get(job.id).state === "stopped");
    expect(env.store.get(job.id).reason).toBe("idle");
    expect(env.calls.restored).toEqual(["1700000000000-aaaaaaaa"]);
  });

  it("Stop during preparation waits for the copy being made, then cancels and discards it", async () => {
    let release;
    let capturing;
    const captureStarted = new Promise((resolve) => (capturing = resolve));
    env = setup({
      capture: async () => {
        capturing();
        await new Promise((resolve) => (release = resolve));
        return { id: "1700000000000-bbbbbbbb" };
      },
    });
    const generation = env.store.generation();
    const starting = env.jobs.start({ session, requestId: "req-00000002", summary: "Stopped early", siteId: "site-1" });
    await captureStarted;
    const stopping = env.jobs.stop({ reason: "user" });
    let stopSettled = false;
    stopping.then(() => (stopSettled = true));
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(stopSettled).toBe(false);
    release();
    await expect(starting).rejects.toMatchObject({ code: "JOB_STOPPED" });
    const stopped = await stopping;
    expect(stopped.state).toBe("cancelled");
    expect(env.calls.discarded).toEqual(["1700000000000-bbbbbbbb"]);
    expect(env.store.generation()).toBeGreaterThan(generation);
    expect(env.jobs.isBusy()).toBe(false);
  });

  it("a Stop sent while the job finishes finds it finished", async () => {
    const job = await env.jobs.start({ session, requestId: "req-00000003", summary: "Race", siteId: "site-1" });
    const finishing = env.jobs.finish({ jobId: job.id, session });
    const stopping = env.jobs.stop({ jobId: job.id, reason: "user" });
    await finishing;
    expect((await stopping).state).toBe("finished");
  });

  it("Stop leaves the active state even while the job keeps writing", async () => {
    const job = await env.jobs.start({ session, requestId: "req-00000004", summary: "Busy", siteId: "site-1" });
    env.jobs.beginJobWrite(job.id);
    const stopping = env.jobs.stop({ jobId: job.id, reason: "user" });
    env.jobs.beginJobWrite(job.id);
    expect((await stopping).state).toBe("stopped");
  });

  it("refuses a job's writes once it has stopped, and editor writes while any job is open", async () => {
    const job = await env.jobs.start({ session, requestId: "req-00000005", summary: "Gate", siteId: "site-1" });
    expect(() => env.jobs.check("site-1", { kind: "job", jobId: job.id })).not.toThrow();
    expect(() => env.jobs.check("site-1", { kind: "editor", baseline: null })).toThrow(expect.objectContaining({ code: "SITE_LOCKED" }));
    expect(() => env.jobs.check("site-2", { kind: "job", jobId: job.id })).toThrow(expect.objectContaining({ code: "JOB_NOT_ACTIVE" }));
    await env.jobs.stop({ jobId: job.id, reason: "user" });
    expect(() => env.jobs.check("site-1", { kind: "job", jobId: job.id })).toThrow(expect.objectContaining({ code: "JOB_NOT_ACTIVE" }));
    expect(() => env.jobs.check("site-1", { kind: "editor", baseline: String(env.store.generation()) })).not.toThrow();
    expect(() => env.jobs.check("site-1", { kind: "editor", baseline: "-1" })).toThrow(expect.objectContaining({ code: "STALE_AFTER_ASSISTANT" }));
  });

  it("a switch that fails still leaves the job settled and the app open", async () => {
    env = setup({
      switchSite: async () => {
        throw new Error("gone");
      },
    });
    const clean = await env.jobs.start({ session, requestId: "req-00000006", summary: "Clean", siteId: "site-1" });
    await expect(env.jobs.stop({ reason: "switch", switchTo: "site-2" })).rejects.toThrow("gone");
    expect(env.store.get(clean.id).state).toBe("stopped");
    const dirty = await env.jobs.start({ session, requestId: "req-00000007", summary: "Dirty", siteId: "site-1" });
    env.jobs.beginJobWrite(dirty.id);
    await expect(env.jobs.stop({ reason: "switch", switchTo: "site-2" })).rejects.toThrow("gone");
    expect(env.store.get(dirty.id).state).toBe("stopped");
    expect(env.calls.restored).toHaveLength(1);
    expect(env.jobs.isBusy()).toBe(false);
  });

  describe("a job's edits", () => {
    const entry = { key: "page:index:en", label: "the page \"index\"", before: ["a"], after: ["a", "s1"], changes: { added: ["s1"] } };
    const edit = (jobId, perform, extra = {}) =>
      env.jobs.runEdit({ jobId, session, languages: ["en"], tool: "edit_sections", args: { n: 1 }, perform, ...extra });

    it("records nothing for an edit refused before its write", async () => {
      const job = await env.jobs.start({ session, requestId: "req-00000008", summary: "Refused", siteId: "site-1", languages: ["en"] });
      const refused = edit(job.id, async ({ inspect }) => {
        await inspect([entry]);
        throw Object.assign(new Error("Too many sections"), { statusCode: 402, code: "TOO_MANY_SECTIONS" });
      });
      await expect(refused).rejects.toMatchObject({ code: "TOO_MANY_SECTIONS" });
      const after = env.store.get(job.id);
      expect(after.dirty).toBe(false);
      expect(after.impact).toBeNull();
      expect(after.receipt).toBeNull();
    });

    it("says so when a failed write could not be undone either", async () => {
      env = setup({
        restore: async () => {
          throw new Error("ENOSPC");
        },
      });
      const job = await env.jobs.start({ session, requestId: "req-00000009", summary: "Disk full", siteId: "site-1", languages: ["en"] });
      const failing = edit(job.id, async ({ inspect, beforeWrite }) => {
        await inspect([entry]);
        beforeWrite();
        throw new Error("ENOSPC");
      });
      await expect(failing).rejects.toMatchObject({ code: "RECOVERY_NEEDED" });
      expect(env.store.get(job.id).state).toBe("recovery_needed");
    });

    it("asks the user past the limits, and only an Allow for exactly that request lets it through", async () => {
      const job = await env.jobs.start({ session, requestId: "req-00000010", summary: "Big", siteId: "site-1", languages: ["en"] });
      for (const key of ["a", "b", "c"]) await edit(job.id, async ({ inspect, beforeWrite }) => (await inspect([{ ...entry, key }]), beforeWrite()));
      const fourth = { ...entry, key: "d", label: "the page \"d\"" };
      const perform = async ({ inspect, beforeWrite }) => (await inspect([fourth]), beforeWrite());
      const asked = await edit(job.id, perform).catch((error) => error);
      expect(asked.code).toBe("NEEDS_APPROVAL");
      const approvalId = env.store.get(job.id).approval.id;
      expect(env.store.get(job.id).state).toBe("awaiting_approval");
      expect(env.jobs.currentPrompt()).toMatchObject({ kind: "approval", id: approvalId });

      const waiting = env.jobs.waitForApproval(approvalId, 1000);
      await env.jobs.answerApproval(approvalId, true);
      expect(await waiting).toBe("allowed");
      await expect(edit(job.id, perform, { args: { n: 2 }, approvalId })).rejects.toMatchObject({ code: "APPROVAL_INVALID" });
      await edit(job.id, perform, { approvalId });
      expect(env.store.get(job.id).approval.status).toBe("used");
      const fifth = async ({ inspect }) => inspect([{ ...entry, key: "e", label: "the page \"e\"" }]);
      await expect(edit(job.id, fifth, { approvalId })).rejects.toMatchObject({ code: "APPROVAL_INVALID" });
    });

    it("an Allow covers only what it was asked for", async () => {
      const job = await env.jobs.start({ session, requestId: "req-00000012", summary: "Scope", siteId: "site-1", languages: ["en"] });
      const page = { key: "p", label: "the page \"p\"", before: ["a", "b", "c", "d"] };
      const run = (after, extra) => edit(job.id, async ({ inspect, beforeWrite }) => (await inspect([{ ...page, after }]), beforeWrite()), extra);
      await run(["a", "b", "c", "d"]);
      const askFirst = await run(["d"]).catch((error) => error);
      expect(askFirst.code).toBe("NEEDS_APPROVAL");
      const firstId = env.store.get(job.id).approval.id;
      expect(env.store.get(job.id).approval.plan.join(" ")).toContain("remove 3 of the 4");
      await env.jobs.answerApproval(firstId, true);
      await run(["d"], { approvalId: firstId });
      const askAgain = await run([]).catch((error) => error);
      expect(askAgain.code).toBe("NEEDS_APPROVAL");
    });

    it("tells the prompt when a keep-or-undo choice is settled by turning access off", async () => {
      const seen = [];
      env.jobs.onPrompt((prompt) => seen.push(prompt?.kind ?? null));
      const job = await env.jobs.start({ session, requestId: "req-00000013", summary: "Off", siteId: "site-1", languages: ["en"] });
      await edit(job.id, async ({ inspect }) => inspect([{ ...entry, confirm: "delete the page \"index\"" }])).catch(() => {});
      env.jobs.sessionEnded(session.id);
      await until(() => env.store.get(job.id).state === "decision_needed");
      await env.jobs.stop({ reason: "access_off" });
      expect(seen).toEqual([null, "approval", "decision", null]);
    });

    it("Stop waits for a save already sent, and that save doesn't count as done", async () => {
      const job = await env.jobs.start({ session, requestId: "req-00000015", summary: "Slow", siteId: "site-1", languages: ["en"] });
      let release;
      const saving = env.jobs.runRoute({
        jobId: job.id,
        session,
        languages: ["en"],
        tool: "update_page",
        args: {},
        build: async () => ({
          entries: [{ key: "page:x:en", label: "the page \"x\"", changes: { updated: ["details"] } }],
          request: () => new Promise((resolve) => (release = () => resolve({ status: 200, data: {} }))),
        }),
      });
      await until(() => typeof release === "function");
      const stopping = env.jobs.stop({ reason: "user" });
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(env.store.get(job.id).state).toBe("stopping");
      release();
      await expect(saving).rejects.toMatchObject({ code: "JOB_STOPPED" });
      expect((await stopping).state).toBe("stopped");
      expect(env.store.get(job.id).receipt).toBeNull();
    });

    it("finishing waits for a save already sent and counts it", async () => {
      const job = await env.jobs.start({ session, requestId: "req-00000016", summary: "Slow finish", siteId: "site-1", languages: ["en"] });
      let release;
      const saving = env.jobs.runRoute({
        jobId: job.id,
        session,
        languages: ["en"],
        tool: "update_page",
        args: {},
        build: async () => ({
          entries: [{ key: "page:x:en", label: "the page \"x\"", changes: { updated: ["details"] } }],
          request: () => new Promise((resolve) => (release = () => resolve({ status: 200, data: {} }))),
        }),
      });
      await until(() => typeof release === "function");
      const finishing = env.jobs.finish({ jobId: job.id, session });
      await new Promise((resolve) => setTimeout(resolve, 20));
      release();
      await saving;
      const finished = await finishing;
      expect(finished.state).toBe("finished");
      expect(env.store.get(job.id).receipt.targets["page:x:en"].updated).toEqual(["details"]);
    });

    it("finishing waits for every step of a change already sent", async () => {
      const job = await env.jobs.start({ session, requestId: "req-00000017", summary: "Two steps", siteId: "site-1", languages: ["en"] });
      let release;
      const steps = [];
      const saving = env.jobs.runRoute({
        jobId: job.id,
        session,
        languages: ["en"],
        tool: "create_menu",
        args: {},
        build: async () => ({
          entries: [{ key: "menu:x", label: "the menu \"x\"", changes: { added: ["menu"] } }],
          request: async () => {
            steps.push(env.store.get(job.id).state);
            await new Promise((resolve) => (release = resolve));
            steps.push(env.store.get(job.id).state);
            return { status: 200, data: {} };
          },
        }),
      });
      await until(() => typeof release === "function");
      const finishing = env.jobs.finish({ jobId: job.id, session });
      await new Promise((resolve) => setTimeout(resolve, 20));
      release();
      await saving;
      expect(steps).toEqual(["active", "active"]);
      expect((await finishing).state).toBe("finished");
      expect(env.store.get(job.id).receipt.targets["menu:x"].added).toEqual(["menu"]);
    });

    it("a change that fails while finishing puts the site back instead of finishing", async () => {
      const job = await env.jobs.start({ session, requestId: "req-00000018", summary: "Fails", siteId: "site-1", languages: ["en"] });
      let fail;
      const saving = env.jobs.runRoute({
        jobId: job.id,
        session,
        languages: ["en"],
        tool: "update_page",
        args: {},
        build: async () => ({
          entries: [{ key: "page:x:en", label: "the page \"x\"", changes: { updated: ["details"] } }],
          request: () => new Promise((_, reject) => (fail = () => reject(new Error("disk full")))),
        }),
      });
      await until(() => typeof fail === "function");
      const finishing = env.jobs.finish({ jobId: job.id, session });
      await new Promise((resolve) => setTimeout(resolve, 20));
      fail();
      await expect(saving).rejects.toMatchObject({ code: "JOB_FAILED" });
      await expect(finishing).rejects.toMatchObject({ code: "JOB_NOT_ACTIVE" });
      expect(env.store.get(job.id).state).toBe("stopped");
    });

    it("closes a keep-or-undo prompt that came back after a restart once it is answered", async () => {
      const job = await env.jobs.start({ session, requestId: "req-00000014", summary: "Restart", siteId: "site-1", languages: ["en"] });
      await edit(job.id, async ({ inspect }) => inspect([{ ...entry, confirm: "delete the page \"index\"" }])).catch(() => {});
      env.jobs.close();
      const { createJobManager: create } = await import("../../../packages/assistant/src/jobs/manager.js");
      const restarted = create({ ...env.deps });
      await restarted.recover();
      const seen = [];
      restarted.onPrompt((prompt) => seen.push(prompt?.kind ?? null));
      await restarted.decide(false);
      expect(seen).toEqual(["decision", null]);
    });

    it("turns an open question into a keep-or-undo choice when the assistant disconnects", async () => {
      const job = await env.jobs.start({ session, requestId: "req-00000011", summary: "Ask", siteId: "site-1", languages: ["en"] });
      await edit(job.id, async ({ inspect, beforeWrite }) => (await inspect([entry]), beforeWrite()));
      await edit(job.id, async ({ inspect }) => inspect([{ ...entry, confirm: "delete the page \"index\"" }])).catch(() => {});
      env.jobs.sessionEnded(session.id);
      await until(() => env.store.get(job.id).state === "decision_needed");
      expect(env.jobs.currentPrompt()).toMatchObject({ kind: "decision" });
      await env.jobs.decide(true);
      expect(env.store.get(job.id).state).toBe("finished");
    });
  });

  describe("recovery after a crash", () => {
    const crashed = (state, patch = {}) => {
      const job = env.store.insert({ id: crypto.randomUUID(), projectId: "site-1", summary: "Crashed", state: "preparing" });
      return env.store.transition(job.id, job.gen, { state, snapshotId: "1700000000000-cccccccc", ...patch });
    };

    it("cancels a job that was still preparing, and moves the generation if it had normalised", async () => {
      const generation = env.store.generation();
      const job = crashed("preparing", { normalised: true });
      await env.jobs.recover();
      expect(env.store.get(job.id).state).toBe("cancelled");
      expect(env.store.generation()).toBe(generation + 1);
    });

    it("restores a job that had written, and settles one that hadn't", async () => {
      const dirty = crashed("active", { dirty: true });
      await env.jobs.recover();
      expect(env.store.get(dirty.id).state).toBe("stopped");
      expect(env.calls.restored).toEqual(["1700000000000-cccccccc"]);
      const clean = crashed("finishing");
      await env.jobs.recover();
      expect(env.store.get(clean.id).state).toBe("stopped");
      expect(env.calls.restored).toHaveLength(1);
    });

    it("finishes an interrupted undo as undone", async () => {
      const job = crashed("restoring", { intent: { terminal: "undone" } });
      await env.jobs.recover();
      expect(env.store.get(job.id).state).toBe("undone");
    });

    it("puts an undo that hadn't started restoring back to finished", async () => {
      const job = crashed("undoing");
      await env.jobs.recover();
      expect(env.store.get(job.id).state).toBe("finished");
    });

    it("leaves a job that needs the user's decision closed", async () => {
      const job = crashed("recovery_needed");
      await env.jobs.recover();
      expect(env.store.get(job.id).state).toBe("recovery_needed");
      expect(env.jobs.isBusy()).toBe(true);
    });
  });
});
