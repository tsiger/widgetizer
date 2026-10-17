import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

const root = await fs.mkdtemp(path.join(os.tmpdir(), "wz jobs "));
const dataRoot = path.join(root, "data");
const themesRoot = path.join(root, "themes");
process.env.DATA_ROOT = dataRoot;
process.env.THEMES_ROOT = themesRoot;
process.env.PORT = "0";

const THEME = "__jobs_theme__";

async function write(file, content) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, typeof content === "string" ? content : JSON.stringify(content, null, 2));
}

async function writeTheme() {
  const dir = path.join(themesRoot, THEME);
  await write(path.join(dir, "theme.json"), {
    name: "Jobs Theme",
    version: "1.0.0",
    settings: { global: { colors: [{ type: "color", id: "accent", label: "Accent", default: "#ff0066" }] } },
  });
  await write(path.join(dir, "menus", "main-menu.json"), { id: "main-menu", name: "Main menu", items: [{ label: "Home", link: "index.html", items: [] }] });
  await fs.cp(path.resolve(import.meta.dirname, "../../../themes/arch/collection-types/news"), path.join(dir, "collection-types", "news"), {
    recursive: true,
  });
  await write(path.join(dir, "layout.liquid"), "<html><body>{{ main_content | raw }}</body></html>");
  await write(path.join(dir, "widgets", "text-block", "schema.json"), {
    type: "text-block",
    displayName: "Text",
    settings: [
      { type: "text", id: "title", label: "Title", default: "" },
      { type: "richtext", id: "body", label: "Body", default: "" },
      { type: "range", id: "size", label: "Size", min: 1, max: 5, default: 3 },
      { type: "image", id: "image", label: "Image" },
      { type: "link", id: "cta", label: "Button" },
    ],
  });
  await write(path.join(dir, "widgets", "list", "schema.json"), {
    type: "list",
    displayName: "List",
    maxBlocks: 3,
    settings: [{ type: "text", id: "title", label: "Title" }],
    blocks: [{ type: "item", displayName: "Item", settings: [{ type: "text", id: "text", label: "Text", default: "Item" }] }],
  });
  await write(path.join(dir, "widgets", "list", "widget.liquid"), "<ul>{% for block in widget.blocks %}<li>{{ block.settings.text }}</li>{% endfor %}</ul>");
  await write(path.join(dir, "widgets", "text-block", "widget.liquid"), "<h2>{{ widget.settings.title }}</h2>");
  for (const part of ["header", "footer"]) {
    await write(path.join(dir, "widgets", "global", part, "schema.json"), {
      type: part,
      displayName: part,
      settings: [{ type: "text", id: "tagline", label: "Tagline", default: "" }],
    });
    await write(path.join(dir, "widgets", "global", part, "widget.liquid"), `<${part}></${part}>`);
    await write(path.join(dir, "templates", "global", `${part}.json`), { type: part, settings: {} });
  }
  await write(path.join(dir, "templates", "index.json"), {
    name: "Home",
    slug: "index",
    widgets: { hello: { type: "text-block", settings: { title: "Welcome" } } },
    widgetsOrder: ["hello"],
  });
}

let started;
let base;
let project;
let other;
let builder;

async function api(method, route, body, headers = {}) {
  const res = await fetch(`${base}${route}`, {
    method,
    headers: { origin: base, "x-project-id": project?.id ?? "", ...(body === undefined ? {} : { "content-type": "application/json" }), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

const bridge = {
  session: null,
  async open() {
    const connection = JSON.parse(await fs.readFile(path.join(dataRoot, "assistant", "connection.json"), "utf8"));
    const res = await fetch(`${base}/api/assistant/bridge/session`, {
      method: "POST",
      headers: { authorization: `Bearer ${connection.token}`, "content-type": "application/json" },
      body: JSON.stringify({ bridge: { min: 1, max: 1 }, relay: { version: "test" }, client: { name: "jobs-test" } }),
    });
    const data = await res.json();
    this.session = { id: data.sessionId, token: data.sessionToken };
  },
  headers() {
    return { authorization: `Bearer ${this.session.token}`, "x-widgetizer-session": this.session.id, "content-type": "application/json" };
  },
  async call(name, args = {}, requestId = crypto.randomUUID()) {
    const res = await fetch(`${base}/api/assistant/bridge/call/${name}`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ requestId, arguments: args }),
    });
    const data = await res.json();
    return { ...data, requestId };
  },
  async close() {
    if (!this.session) return;
    await fetch(`${base}/api/assistant/bridge/session`, { method: "DELETE", headers: this.headers() });
    this.session = null;
  },
};

/** A pretend editor window: answers every prepare with `clean()`. */
function openWindow({ clean = () => true, answer = true, beforeAnswer = async () => {} } = {}) {
  const doc = crypto.randomBytes(12).toString("hex");
  const controller = new AbortController();
  const window = { doc, events: [], generation: null, closed: false };
  let resolveHello;
  window.hello = new Promise((resolve) => (resolveHello = resolve));
  (async () => {
    const res = await fetch(`${base}/api/assistant/events?doc=${doc}`, { headers: { origin: base }, signal: controller.signal });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let index;
      while ((index = buffer.indexOf("\n\n")) >= 0) {
        const chunk = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        const event = /^event: (.+)$/m.exec(chunk)?.[1];
        const data = /^data: (.+)$/m.exec(chunk)?.[1];
        if (!event || !data) continue;
        const payload = JSON.parse(data);
        window.events.push({ event, payload });
        if (event === "hello") {
          window.generation = payload.generation;
          resolveHello(payload);
        }
        if (event === "prepare" && answer) {
          await beforeAnswer();
          await api("POST", "/api/assistant/editor/ready", { doc, operation: payload.operation, clean: clean() });
        }
      }
    }
  })().catch(() => {});
  window.close = () => {
    window.closed = true;
    controller.abort();
  };
  return window;
}

const windows = [];
function editorWindow(options) {
  const window = openWindow(options);
  windows.push(window);
  return window;
}

const pageFile = () => path.join(dataRoot, "projects", project.folderName, "pages", "index.json");
const readTitle = async () => JSON.parse(await fs.readFile(pageFile(), "utf8")).widgets.hello.settings.title;

/** What edit_sections will do: a job's own write, inside the section. */
async function jobWrite(jobId, title) {
  const { jobs } = started.assistant;
  await builder.runAsWriter({ kind: "job", jobId }, () =>
    builder.withContentWriteLock(project.id, async () => {
      jobs.beginJobWrite(jobId);
      const page = JSON.parse(await fs.readFile(pageFile(), "utf8"));
      page.widgets.hello.settings.title = title;
      await fs.writeFile(pageFile(), JSON.stringify(page, null, 2));
    }),
  );
}

async function editorSave(title, generation) {
  const page = (await api("GET", "/api/pages/index")).data;
  page.widgets.hello.settings.title = title;
  return api("POST", "/api/pages/index/content", page, generation == null ? {} : { "x-site-generation": String(generation) });
}

async function until(check, ms = 8000) {
  const end = Date.now() + ms;
  for (;;) {
    const value = await check();
    if (value) return value;
    if (Date.now() > end) throw new Error("timed out");
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

const jobState = async () => (await api("GET", "/api/assistant/jobs/state")).data.job.job;

beforeAll(async () => {
  await writeTheme();
  builder = await import("@widgetizer/builder-server");
  const { startOssServer } = await import("../../server-common.js");
  started = await startOssServer({ defaultPort: 0 });
  base = `http://127.0.0.1:${started.server.address().port}`;
  await api("PUT", "/api/settings", { assistant: { enabled: true } });
  await started.enableAssistant();
  project = (await api("POST", "/api/projects", { name: "Jobs Site", theme: THEME })).data;
  other = (await api("POST", "/api/projects", { name: "Other Site", theme: THEME })).data;
  await api("PUT", `/api/projects/active/${project.id}`);
}, 60000);

afterAll(async () => {
  await started?.shutdown();
  started?.releaseDataFolder();
  builder?.closeDb();
  await fs.rm(root, { recursive: true, force: true });
});

beforeEach(async () => {
  await bridge.open();
});

afterEach(async () => {
  for (const window of windows.splice(0)) window.close();
  await bridge.close();
  const job = started.assistant.jobs.openJob();
  if (job?.state === "active") await started.assistant.jobs.stop({ reason: "test" });
  if (job?.state === "recovery_needed") await started.assistant.jobs.keep();
  await api("PUT", `/api/projects/active/${project.id}`);
});

const read = async (page = "index") => (await bridge.call("read_page", { page })).structuredContent;
const edit = (args) => bridge.call("edit_sections", args);

async function startJob(summary = "Change the welcome title") {
  const window = editorWindow();
  await window.hello;
  const result = await bridge.call("start_job", { summary });
  return { window, result, jobId: result.structuredContent?.job?.id };
}

describe("starting a job", () => {
  it("needs a Widgetizer window showing the site", async () => {
    const result = await bridge.call("start_job", { summary: "Anything" });
    expect(result.error.code).toBe("EDITOR_NOT_OPEN");
  });

  it("locks every editor write while the job runs", async () => {
    const { result, jobId } = await startJob();
    expect(result.isError).toBe(false);
    expect(result.structuredContent.job.state).toBe("active");
    const refused = await editorSave("Mine");
    expect(refused.status).toBe(423);
    expect(refused.data.code).toBe("SITE_LOCKED");
    expect((await api("PUT", `/api/projects/${other.id}`, { name: "Renamed" })).status).toBe(423);
    expect((await api("POST", "/api/preview/token", { pageId: "index" })).status).not.toBe(423);
    await bridge.call("stop_job", { jobId });
  });

  it("doesn't start while a window has unsaved changes, and lifts the lock", async () => {
    editorWindow();
    const dirty = editorWindow({ clean: () => false });
    await dirty.hello;
    const result = await bridge.call("start_job", { summary: "Anything" });
    expect(result.error.code).toBe("UNSAVED_CHANGES");
    expect(started.assistant.jobs.isBusy()).toBe(false);
    expect((await editorSave("Still mine")).status).toBe(200);
  });

  it("doesn't start when a window doesn't answer", async () => {
    const silent = editorWindow({ answer: false });
    await silent.hello;
    const result = await bridge.call("start_job", { summary: "Anything" });
    expect(result.error.code).toBe("EDITOR_UNREACHABLE");
    expect(started.assistant.jobs.isBusy()).toBe(false);
  }, 15000);

  it("asks a window that opens while the job is being prepared", async () => {
    let late;
    const first = editorWindow({
      beforeAnswer: async () => {
        late = editorWindow({ clean: () => false });
        await late.hello;
      },
    });
    await first.hello;
    const result = await bridge.call("start_job", { summary: "Anything" });
    expect(late.events.some((entry) => entry.event === "prepare")).toBe(true);
    expect(result.error.code).toBe("UNSAVED_CHANGES");
  });
});

describe("finishing, stopping and undoing", () => {
  it("finishes, then refuses a save based on content from before the job", async () => {
    const { window, jobId } = await startJob();
    const before = window.generation;
    await jobWrite(jobId, "By the assistant");
    const finished = await bridge.call("finish_job", { jobId });
    expect(finished.structuredContent.job.state).toBe("finished");
    expect(await readTitle()).toBe("By the assistant");

    const stale = await editorSave("Old window", before);
    expect(stale.status).toBe(423);
    expect(stale.data.code).toBe("STALE_AFTER_ASSISTANT");
    const fresh = editorWindow();
    expect((await editorSave("New window", (await fresh.hello).generation)).status).toBe(200);
  });

  it("Stop puts the site back as it was", async () => {
    const original = await readTitle();
    const { jobId } = await startJob();
    await jobWrite(jobId, "Half done");
    const stopped = await api("POST", "/api/assistant/jobs/stop", { jobId });
    expect(stopped.data.job.state).toBe("stopped");
    expect(await readTitle()).toBe(original);
    expect(started.assistant.jobs.isBusy()).toBe(false);
  });

  it("undoes the last job, but not after the user changed the site", async () => {
    const original = await readTitle();
    let { window, jobId } = await startJob();
    await jobWrite(jobId, "Assistant title");
    await bridge.call("finish_job", { jobId });
    window.close();

    ({ window, jobId } = await startJob("Second job"));
    await jobWrite(jobId, "Second title");
    await bridge.call("finish_job", { jobId });
    const fresh = editorWindow();
    expect((await editorSave("Hand edit", (await fresh.hello).generation)).status).toBe(200);
    const refused = await bridge.call("undo_last_job", { jobId });
    expect(refused.error.code).toBe("SITE_CHANGED_SINCE");
    expect(await readTitle()).toBe("Hand edit");

    ({ jobId } = await startJob("Third job"));
    await jobWrite(jobId, "Third title");
    await bridge.call("finish_job", { jobId });
    const undone = await bridge.call("undo_last_job", { jobId });
    expect(undone.structuredContent.job.state).toBe("undone");
    expect(await readTitle()).toBe("Hand edit");
    expect(original).not.toBe("Hand edit");
  });

  it("stops and restores when the assistant disconnects", async () => {
    const original = await readTitle();
    const { jobId } = await startJob();
    await jobWrite(jobId, "Abandoned");
    await bridge.close();
    await until(async () => (await jobState()) === null);
    expect(await readTitle()).toBe(original);
  });

  it("stops and restores when assistant access is turned off, and allows only that setting", async () => {
    const original = await readTitle();
    const { jobId } = await startJob();
    await jobWrite(jobId, "Abandoned");
    expect((await api("PUT", "/api/settings", { general: { language: "el" } })).status).toBe(423);
    expect((await api("PUT", "/api/settings", { assistant: { enabled: false } })).status).toBe(200);
    await until(async () => (await jobState()) === null);
    expect(await readTitle()).toBe(original);
    await api("PUT", "/api/settings", { assistant: { enabled: true } });
    await started.enableAssistant();
  });

  it("needs a window open to undo", async () => {
    const { window, jobId } = await startJob();
    await jobWrite(jobId, "Undo me");
    await bridge.call("finish_job", { jobId });
    window.close();
    for (const open of windows) open.close();
    await until(async () => !started.assistant.jobs.isBusy());
    await new Promise((resolve) => setTimeout(resolve, 100));
    const refused = await bridge.call("undo_last_job", { jobId });
    expect(refused.error.code).toBe("EDITOR_NOT_OPEN");
    expect(await readTitle()).toBe("Undo me");
  });

  it("no request changes the open site underneath a job, however it spells the site", async () => {
    const original = await readTitle();
    const { jobId } = await startJob();
    await jobWrite(jobId, "Abandoned");
    expect(() => builder.setActiveProjectId(other.id)).toThrow(expect.objectContaining({ code: "SITE_LOCKED" }));
    const encoded = other.id.replaceAll("-", "%2D");
    expect((await api("PUT", `/api/projects/active/${encoded}`)).status).toBe(200);
    expect(builder.getActiveProjectId()).toBe(other.id);
    expect(await readTitle()).toBe(original);
  });

  it("keeps the number of saved copies within the limit however often jobs are stopped", async () => {
    for (let round = 0; round < 12; round += 1) {
      const { jobId } = await startJob(`Round ${round}`);
      await api("POST", "/api/assistant/jobs/stop", { jobId });
    }
    const copies = await fs.readdir(path.join(dataRoot, "assistant", "snapshots", project.id));
    expect(copies.length).toBeLessThanOrEqual(11);
  }, 30000);

  it("switching sites stops the job, restores, then switches", async () => {
    const original = await readTitle();
    const { jobId } = await startJob();
    await jobWrite(jobId, "Abandoned");
    const switched = await api("PUT", `/api/projects/active/${other.id}`);
    expect(switched.status).toBe(200);
    expect(builder.getActiveProjectId()).toBe(other.id);
    expect(await readTitle()).toBe(original);
    expect(started.assistant.jobs.isBusy()).toBe(false);
  });
});

describe("when restoring fails", () => {
  it("keeps the site closed until the user chooses Try again or Keep", async () => {
    const { jobId } = await startJob();
    await jobWrite(jobId, "Kept title");
    const job = started.assistant.jobs.openJob();
    const snapshot = path.join(dataRoot, "assistant", "snapshots", project.id, `${job.snapshotId}.snapshot.gz`);
    const saved = await fs.readFile(snapshot);
    await fs.rm(snapshot);
    const stopped = await api("POST", "/api/assistant/jobs/stop", { jobId });
    expect(stopped.data.job.state).toBe("recovery_needed");
    expect(stopped.data.job.error).not.toMatch(/[\\/]/);
    const status = await bridge.call("job_status");
    expect(JSON.stringify(status.structuredContent)).not.toContain(dataRoot.replaceAll("\\", "\\\\"));
    expect((await editorSave("Blocked")).status).toBe(423);

    await fs.writeFile(snapshot, saved);
    const retried = await api("POST", "/api/assistant/recovery/retry");
    expect(retried.data.job.state).toBe("stopped");
    expect(await readTitle()).not.toBe("Kept title");
  });

  it("Keep leaves the site as it is and opens it again", async () => {
    const { jobId } = await startJob();
    await jobWrite(jobId, "Kept title");
    const job = started.assistant.jobs.openJob();
    await fs.rm(path.join(dataRoot, "assistant", "snapshots", project.id, `${job.snapshotId}.snapshot.gz`));
    await api("POST", "/api/assistant/jobs/stop", { jobId });
    const kept = await api("POST", "/api/assistant/recovery/keep");
    expect(kept.data.job.state).toBe("kept");
    expect(await readTitle()).toBe("Kept title");
    const fresh = editorWindow();
    expect((await editorSave("Editable again", (await fresh.hello).generation)).status).toBe(200);
  });
});

describe("a lost reply", () => {
  it("job_status tells what became of the call", async () => {
    const { result } = await startJob();
    const status = await bridge.call("job_status", { requestId: result.requestId });
    expect(status.structuredContent.request.outcome.committed).toBe(true);
    expect(status.structuredContent.job.startedBy).toBe(result.requestId);
    const unknown = await bridge.call("job_status", { requestId: "never-sent-1234" });
    expect(unknown.structuredContent.request.outcome).toBe("unknown");
  });
});

describe("editing sections", () => {
  const edit = (args) => bridge.call("edit_sections", args);
  const saved = async (slug = "index") => JSON.parse(await fs.readFile(path.join(dataRoot, "projects", project.folderName, "pages", `${slug}.json`), "utf8"));

  it("changes a page inside a job, and Undo puts it back", async () => {
    const before = await saved();
    const { jobId } = await startJob("Edit the home page");
    const { version } = await read();
    const result = await edit({
      jobId,
      page: "index",
      basedOn: version,
      operations: [
        { op: "update", section: "hello", settings: { title: "Edited", body: "<p>Hi</p><script>bad()</script>" } },
        { op: "add", type: "list", settings: { title: "Things" }, blocks: [{ type: "item", settings: { text: "One" } }], at: "start" },
      ],
    });
    expect(result.isError).toBe(false);
    const after = await saved();
    expect(after.widgets.hello.settings.title).toBe("Edited");
    expect(after.widgets.hello.settings.body).not.toContain("script");
    expect(after.widgetsOrder).toHaveLength(2);
    expect(result.structuredContent.version).toBe((await read()).version);

    await bridge.call("finish_job", { jobId });
    expect((await bridge.call("undo_last_job", { jobId })).structuredContent.job.state).toBe("undone");
    expect(await saved()).toEqual(before);
  });

  it("refuses an edit based on an old read, or with a value the setting can't take, and writes nothing", async () => {
    const { jobId } = await startJob("Bad edits");
    const { version } = await read();
    const stale = await edit({ jobId, page: "index", basedOn: "0000000000000000", operations: [{ op: "remove", section: "hello" }] });
    expect(stale.error.code).toBe("STALE_READ");
    const bad = await edit({ jobId, page: "index", basedOn: version, operations: [{ op: "update", section: "hello", settings: { size: 99 } }] });
    expect(bad.error.code).toBe("INVALID_EDIT");
    expect(started.assistant.jobs.openJob().dirty).toBe(false);
    await bridge.call("stop_job", { jobId });
  });

  it("uses an image from the library and links to a page by its name", async () => {
    const form = new FormData();
    form.append("files", new Blob([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64")], { type: "image/png" }), "cake.png");
    const upload = await fetch(`${base}/api/media`, { method: "POST", headers: { origin: base, "x-project-id": project.id }, body: form }).then((res) => res.json());
    const mediaId = upload.processedFiles[0].id;
    const { jobId } = await startJob("Image and button");
    const { version } = await read();
    const result = await edit({
      jobId,
      page: "index",
      basedOn: version,
      operations: [{ op: "update", section: "hello", settings: { image: { media: mediaId }, cta: { text: "Contact", page: "index" } } }],
    });
    expect(result.isError).toBe(false);
    const settings = (await saved()).widgets.hello.settings;
    expect(settings.image).toBe(upload.processedFiles[0].path);
    expect(settings.cta).toMatchObject({ text: "Contact", href: "index.html", pageUuid: (await saved()).uuid });
    await bridge.call("stop_job", { jobId });
  });

  it("relabels a download link exactly as read_page returned it", async () => {
    const form = new FormData();
    form.append("files", new Blob([Buffer.from("%PDF-1.4\n%%EOF\n")], { type: "application/pdf" }), "brochure.pdf");
    const upload = await fetch(`${base}/api/media`, { method: "POST", headers: { origin: base, "x-project-id": project.id }, body: form }).then((res) => res.json());
    const pdfPath = upload.processedFiles[0].path;
    const fresh = editorWindow();
    const home = (await api("GET", "/api/pages/index")).data;
    home.widgets.hello.settings.cta = { text: "Brochure", href: pdfPath, target: "_blank" };
    expect((await api("POST", "/api/pages/index/content", home, { "x-site-generation": String((await fresh.hello).generation) })).status).toBe(200);

    const { jobId } = await startJob("Relabel the download");
    const page = await read();
    const cta = page.sections.find((section) => section.id === "hello").settings.cta;
    const result = await edit({ jobId, page: "index", basedOn: page.version, operations: [{ op: "update", section: "hello", settings: { cta: { ...cta, text: "Download brochure" } } }] });
    expect(result.isError).toBe(false);
    expect((await saved()).widgets.hello.settings.cta).toEqual({ text: "Download brochure", href: pdfPath, target: "_blank" });
    await bridge.call("stop_job", { jobId });
  });

  it("can't change anything outside a running job", async () => {
    const { version } = await read();
    const result = await edit({ jobId: crypto.randomUUID(), page: "index", basedOn: version, operations: [{ op: "remove", section: "hello" }] });
    expect(result.error.code).toBe("JOB_NOT_ACTIVE");
  });

  it("edits the header's settings and blocks", async () => {
    const { jobId } = await startJob("Header tagline");
    const part = (await bridge.call("read_site_part", { which: "header" })).structuredContent;
    const result = await edit({ jobId, part: "header", basedOn: part.version, operations: [{ op: "update", settings: { tagline: "Fresh bread daily" } }] });
    expect(result.isError).toBe(false);
    const header = JSON.parse(await fs.readFile(path.join(dataRoot, "projects", project.folderName, "pages", "global", "header.json"), "utf8"));
    expect(header.settings.tagline).toBe("Fresh bread daily");
    await bridge.call("stop_job", { jobId });
  });

  it("asks the user before a fourth page, and does it once they allow it", async () => {
    for (const slug of ["p1", "p2", "p3"]) await api("POST", "/api/pages", { name: slug, slug });
    const { jobId } = await startJob("Many pages");
    for (const slug of ["p1", "p2", "p3"]) {
      const { version } = await read(slug);
      expect((await edit({ jobId, page: slug, basedOn: version, operations: [{ op: "add", type: "text-block" }] })).isError).toBe(false);
    }
    const fourth = await read("index");
    const args = { jobId, page: "index", basedOn: fourth.version, operations: [{ op: "update", section: "hello", settings: { title: "Four" } }] };
    const asked = await edit(args);
    expect(asked.error.code).toBe("NEEDS_APPROVAL");
    const approvalId = /"([a-f0-9-]{36})"/.exec(asked.error.message)[1];
    expect((await editorSave("Blocked")).status).toBe(423);
    expect((await api("POST", `/api/assistant/approvals/${approvalId}`, { allow: true })).status).toBe(200);
    expect((await bridge.call("wait_for_approval", { approvalId })).structuredContent.status).toBe("allowed");
    expect((await edit({ ...args, approvalId })).isError).toBe(false);
    expect((await saved()).widgets.hello.settings.title).toBe("Four");
    await bridge.call("stop_job", { jobId });
  });

  it("asks before removing more than half of a page, and Cancel leaves it", async () => {
    const { jobId } = await startJob("Remove a lot");
    const home = await read("index");
    const asked = await edit({ jobId, page: "index", basedOn: home.version, operations: [{ op: "remove", section: "hello" }] });
    expect(asked.error.code).toBe("NEEDS_APPROVAL");
    const approvalId = /"([a-f0-9-]{36})"/.exec(asked.error.message)[1];
    await api("POST", `/api/assistant/approvals/${approvalId}`, { allow: false });
    expect((await bridge.call("wait_for_approval", { approvalId })).structuredContent.status).toBe("cancelled");
    const again = await edit({ jobId, page: "index", basedOn: home.version, operations: [{ op: "remove", section: "hello" }], approvalId });
    expect(again.error.code).toBe("APPROVAL_INVALID");
    expect((await saved()).widgets.hello).toBeDefined();
    await bridge.call("stop_job", { jobId });
  });
});

describe("the other edit families", () => {
  const call = (name, args) => bridge.call(name, args);
  const approve = async (result) => {
    expect(result.error.code).toBe("NEEDS_APPROVAL");
    const approvalId = /"([a-f0-9-]{36})"/.exec(result.error.message)[1];
    await api("POST", `/api/assistant/approvals/${approvalId}`, { allow: true });
    return approvalId;
  };
  const projectFile = (...parts) => path.join(dataRoot, "projects", project.folderName, ...parts);

  it("creates, renames, copies and (with the user's OK) deletes pages", async () => {
    const { jobId } = await startJob("Pages");
    const created = await call("create_page", { jobId, name: "Our team", slug: "team" });
    expect(created.isError).toBe(false);
    const before = JSON.parse(await fs.readFile(projectFile("pages", "team.json"), "utf8"));
    const renamed = await call("update_page", { jobId, page: "team", slug: "people", seo: { description: "Who we are" } });
    expect(renamed.isError).toBe(false);
    const after = JSON.parse(await fs.readFile(projectFile("pages", "people.json"), "utf8"));
    expect(after.uuid).toBe(before.uuid);
    expect(after.seo.description).toBe("Who we are");
    expect((await call("duplicate_page", { jobId, page: "people" })).isError).toBe(false);
    const args = { jobId, page: "people" };
    const approvalId = await approve(await call("delete_page", args));
    expect((await call("delete_page", { ...args, approvalId })).isError).toBe(false);
    await expect(fs.access(projectFile("pages", "people.json"))).rejects.toThrow();
    await call("stop_job", { jobId });
    await expect(fs.access(projectFile("pages", "team.json"))).rejects.toThrow();
  });

  it("edits a menu, the look, the site details and a collection item, keeping what it wasn't asked to change", async () => {
    const { jobId } = await startJob("Many families");
    const menu = await call("update_menu", { jobId, menu: "main-menu", items: [{ label: "Home", page: "index" }, { label: "Blog", link: "https://example.com" }] });
    expect(menu.isError).toBe(false);
    const savedMenu = JSON.parse(await fs.readFile(projectFile("menus", "main-menu.json"), "utf8"));
    expect(savedMenu.items[0]).toMatchObject({ label: "Home", link: "index.html" });
    expect(savedMenu.items[0].pageUuid).toBeTruthy();
    expect(savedMenu.name).toBe("Main menu");

    expect((await call("update_look", { jobId, changes: [{ id: "accent", value: "#123456" }] })).error ?? null).toBeNull();
    const theme = JSON.parse(await fs.readFile(projectFile("theme.json"), "utf8"));
    expect(theme.settings.global.colors[0].value).toBe("#123456");

    expect((await call("update_site_details", { jobId, identity: { phone: "555-1234" } })).error.code).toBe("INVALID_EDIT");
    await call("update_site_details", { jobId, identity: { telephone: "555-1234" } });
    await call("update_site_details", { jobId, siteTitle: "Bakery", identity: { email: "hi@example.com" } });
    const site = builder.getProjectById(project.id);
    expect(site.siteTitle).toBe("Bakery");
    expect(site.siteIdentity).toMatchObject({ telephone: "555-1234", email: "hi@example.com" });

    const created = await call("create_item", { jobId, type: "news", slug: "launch", settings: { title: "Launch", date: "2026-10-01", excerpt: "First" } });
    expect(created.error ?? null).toBeNull();
    expect((await call("update_item", { jobId, type: "news", item: "launch", settings: { title: "Launch day" } })).isError).toBe(false);
    const item = JSON.parse(await fs.readFile(projectFile("collections", "news", "launch.json"), "utf8"));
    expect(item.settings).toMatchObject({ title: "Launch day", excerpt: "First" });
    expect(item.slug).toBe("launch");
    await call("stop_job", { jobId });
  });

  it("adds a language the job declared and starts a page's translation in it", async () => {
    const window = editorWindow();
    await window.hello;
    const started = await bridge.call("start_job", { summary: "Greek", addLanguages: ["el"] });
    const jobId = started.structuredContent.job.id;
    expect((await call("add_language", { jobId, code: "el" })).isError).toBe(false);
    expect((await call("translate_page", { jobId, page: "index", to: "el" })).isError).toBe(false);
    await expect(fs.access(projectFile("pages", "el", "index.json"))).resolves.toBeUndefined();
    const refused = await call("add_language", { jobId, code: "fr" });
    expect(refused.error.code).toBe("LANGUAGE_NOT_IN_JOB");
    await call("stop_job", { jobId });
    expect(builder.getProjectById(project.id).languages).toEqual([]);
  });

  it("finishes with Widgetizer's own account of what changed, and where to look", async () => {
    const { jobId } = await startJob("Account");
    const { version } = await read("index");
    await edit({ jobId, page: "index", basedOn: version, operations: [{ op: "update", section: "hello", settings: { title: "Told" } }] });
    const finished = await call("finish_job", { jobId });
    const completion = finished.structuredContent.job.completion;
    expect(completion.changes[0]).toMatchObject({ changed: 1, link: { page: "index" } });
    expect(completion.navigate).toMatchObject({ page: "index", section: "hello" });
  });

  it("opens another site only after every window says it has nothing unsaved", async () => {
    const window = editorWindow();
    await window.hello;
    const opened = await call("open_site", { siteId: other.id });
    expect(opened.error ?? null).toBeNull();
    expect(builder.getActiveProjectId()).toBe(other.id);
    await until(() => window.events.some((entry) => entry.event === "site" && entry.payload.path === "/pages"));
    await api("PUT", `/api/projects/active/${project.id}`);
  });

  it("keeps both of two edits sent at once to the same page", async () => {
    const { jobId } = await startJob("Parallel");
    const [a, b] = await Promise.all([
      call("update_page", { jobId, page: "index", name: "Welcome home" }),
      call("update_page", { jobId, page: "index", seo: { description: "All about us" } }),
    ]);
    expect(a.error ?? null).toBeNull();
    expect(b.error ?? null).toBeNull();
    const page = JSON.parse(await fs.readFile(projectFile("pages", "index.json"), "utf8"));
    expect(page.name).toBe("Welcome home");
    expect(page.seo.description).toBe("All about us");
    await call("stop_job", { jobId });
  });

  it("still asks before removing most of a page whose details changed first", async () => {
    const { jobId } = await startJob("Details then removal");
    await call("update_page", { jobId, page: "index", name: "Home" });
    const { version } = await read("index");
    const removal = await edit({ jobId, page: "index", basedOn: version, operations: [{ op: "remove", section: "hello" }] });
    expect(removal.error.code).toBe("NEEDS_APPROVAL");
    await call("stop_job", { jobId });
  });

  it("changes one business detail inside a group without losing the others", async () => {
    const { jobId } = await startJob("Identity");
    await call("update_site_details", { jobId, identity: { text: { publicName: "Crumbly", description: "Bread" } } });
    await call("update_site_details", { jobId, identity: { text: { description: "Fresh bread" } } });
    expect(builder.getProjectById(project.id).siteIdentity.text).toMatchObject({ publicName: "Crumbly", description: "Fresh bread" });
    await call("stop_job", { jobId });
  });

  it("keeps both of two business-detail edits sent at once", async () => {
    const { jobId } = await startJob("Parallel details");
    await Promise.all([
      call("update_site_details", { jobId, identity: { email: "a@example.com" } }),
      call("update_site_details", { jobId, identity: { telephone: "555-0000" } }),
    ]);
    expect(builder.getProjectById(project.id).siteIdentity).toMatchObject({ email: "a@example.com", telephone: "555-0000" });
    await call("stop_job", { jobId });
  });

  it("Stop during opening a site leaves the open site as it was", async () => {
    let releaseAnswer;
    const window = editorWindow({ beforeAnswer: () => new Promise((resolve) => (releaseAnswer = resolve)) });
    await window.hello;
    const opening = call("open_site", { siteId: other.id });
    await until(() => typeof releaseAnswer === "function");
    await api("POST", "/api/assistant/jobs/stop", {});
    releaseAnswer();
    expect((await opening).error.code).toBe("JOB_STOPPED");
    expect(builder.getActiveProjectId()).toBe(project.id);
  });

  it("creates a menu with the items it was given", async () => {
    const { jobId } = await startJob("Menu");
    const created = await call("create_menu", { jobId, name: "Footer links", items: [{ label: "Home", page: "index" }, { label: "News", link: "news.html" }] });
    expect(created.error ?? null).toBeNull();
    const menu = JSON.parse(await fs.readFile(projectFile("menus", `${created.structuredContent.menu}.json`), "utf8"));
    expect(menu.items.map((item) => item.label)).toEqual(["Home", "News"]);
    await call("stop_job", { jobId });
  });

  it("points the finish note at the page as it is after a rename, and not at a deleted one", async () => {
    await api("POST", "/api/pages", { name: "Team", slug: "team" });
    const { jobId } = await startJob("Rename");
    const team = await read("team");
    await edit({ jobId, page: "team", basedOn: team.version, operations: [{ op: "add", type: "text-block" }] });
    await call("update_page", { jobId, page: "team", slug: "people" });
    const finished = await call("finish_job", { jobId });
    expect(finished.structuredContent.job.completion.navigate).toMatchObject({ page: "people" });
    await api("DELETE", "/api/pages/people");
  });
});

