import { describe, it, expect, afterAll } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const root = await fs.mkdtemp(path.join(os.tmpdir(), "wz restart "));
const dataRoot = path.join(root, "data");
const themesRoot = path.join(root, "themes");
process.env.DATA_ROOT = dataRoot;
process.env.THEMES_ROOT = themesRoot;
process.env.PORT = "0";

const THEME = "__restart_theme__";
const builder = await import("@widgetizer/builder-server");
const { startOssServer } = await import("../../server-common.js");

async function write(file, content) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, typeof content === "string" ? content : JSON.stringify(content, null, 2));
}

const themeDir = path.join(themesRoot, THEME);
await write(path.join(themeDir, "theme.json"), { name: "Restart", version: "1.0.0", settings: { global: {} } });
await write(path.join(themeDir, "layout.liquid"), "<html><body>{{ main_content | raw }}</body></html>");
await write(path.join(themeDir, "templates", "index.json"), { name: "Home", slug: "index", widgets: {}, widgetsOrder: [] });

let started;

afterAll(async () => {
  await started?.shutdown();
  started?.releaseDataFolder();
  builder.closeDb();
  await fs.rm(root, { recursive: true, force: true });
});

async function boot() {
  started = await startOssServer({ defaultPort: 0 });
  return `http://127.0.0.1:${started.server.address().port}`;
}

async function restart() {
  await started.shutdown();
  started.releaseDataFolder();
  return boot();
}

describe("a job interrupted by a restart", () => {
  it("is put back before the server takes requests", async () => {
    let base = await boot();
    const post = (route, body) =>
      fetch(`${base}${route}`, { method: "POST", headers: { origin: base, "content-type": "application/json" }, body: JSON.stringify(body) }).then((res) => res.json());
    const project = await post("/api/projects", { name: "Restart Site", theme: THEME });
    const scope = { projectId: project.id, folderName: project.folderName };
    const pageFile = path.join(dataRoot, "projects", project.folderName, "pages", "index.json");
    const original = await fs.readFile(pageFile, "utf8");

    expect(started.assistant.jobs.openJob()).toBeNull();
    const db = builder.getDb();
    const { createJobStore } = await import("../jobStore.js");
    const { createOssSnapshots, createOssAssetLedger } = await import("../snapshots.js");
    const { createSiteGenerations } = await import("../siteGenerations.js");
    const { LocalStorageAdapter, LocalAssetStorageAdapter } = await import("@widgetizer/adapters-local");
    const snapshots = createOssSnapshots({
      adapters: { storage: new LocalStorageAdapter({ dataRoot }) },
      db,
      generations: createSiteGenerations(db),
      ledger: createOssAssetLedger({ assetStorage: new LocalAssetStorageAdapter({ dataRoot }), dataRoot }),
      dataRoot,
    });
    const { id: snapshotId } = await snapshots.capture(scope);
    const jobStore = createJobStore(db);
    const job = jobStore.insert({ id: crypto.randomUUID(), projectId: project.id, summary: "Interrupted", state: "preparing" });
    jobStore.transition(job.id, job.gen, { state: "active", snapshotId, dirty: true });
    await fs.writeFile(pageFile, JSON.stringify({ ...JSON.parse(original), name: "Half written" }, null, 2));
    const generation = jobStore.generation();

    base = await restart();
    expect(await fs.readFile(pageFile, "utf8")).toBe(original);
    const recovered = jobStore.get(job.id);
    expect(recovered.state).toBe("stopped");
    expect(recovered.reason).toBe("restart");
    expect(jobStore.generation()).toBeGreaterThan(generation);
    expect(started.assistant.jobs.isBusy()).toBe(false);
  });

  it("stays closed across restarts when it needs the user's decision", async () => {
    const db = builder.getDb();
    const { createJobStore } = await import("../jobStore.js");
    const jobStore = createJobStore(db);
    const projectId = builder.getActiveProjectId();
    const job = jobStore.insert({ id: crypto.randomUUID(), projectId, summary: "Broken", state: "preparing" });
    jobStore.transition(job.id, job.gen, { state: "recovery_needed", snapshotId: "1700000000000-dddddddd", error: "gone" });

    const base = await restart();
    expect(jobStore.get(job.id).state).toBe("recovery_needed");
    const blocked = await fetch(`${base}/api/pages`, {
      method: "POST",
      headers: { origin: base, "content-type": "application/json" },
      body: JSON.stringify({ name: "New", slug: "new" }),
    });
    expect(blocked.status).toBe(423);
    const state = await fetch(`${base}/api/assistant/jobs/state`).then((res) => res.json());
    expect(state.job.job.state).toBe("recovery_needed");

    await restart();
    expect(jobStore.get(job.id).state).toBe("recovery_needed");
  });
});
