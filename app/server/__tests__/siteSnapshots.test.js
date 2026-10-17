import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const root = await fs.mkdtemp(path.join(os.tmpdir(), "wz snapshots "));
const dataRoot = path.join(root, "data");
const themesRoot = path.join(root, "themes");
process.env.DATA_ROOT = dataRoot;
process.env.THEMES_ROOT = themesRoot;
process.env.PORT = "0";

const THEME = "__snapshot_theme__";
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function write(file, content) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, typeof content === "string" ? content : JSON.stringify(content, null, 2));
}

async function writeTheme() {
  const dir = path.join(themesRoot, THEME);
  await write(path.join(dir, "theme.json"), { name: "Snapshot Theme", version: "1.0.0", settings: { global: {} } });
  await write(path.join(dir, "layout.liquid"), "<html><body>{{ header | raw }}{{ main_content | raw }}{{ footer | raw }}</body></html>");
  await write(path.join(dir, "widgets", "text-block", "schema.json"), {
    type: "text-block",
    displayName: "Text",
    settings: [
      { type: "text", id: "title", label: "Title", default: "" },
      { type: "image", id: "image", label: "Image" },
    ],
  });
  await write(path.join(dir, "widgets", "text-block", "widget.liquid"), "<h2>{{ widget.settings.title }}</h2>");
  for (const part of ["header", "footer"]) {
    await write(path.join(dir, "widgets", "global", part, "schema.json"), { type: part, displayName: part, settings: [] });
    await write(path.join(dir, "widgets", "global", part, "widget.liquid"), `<${part}></${part}>`);
    await write(path.join(dir, "templates", "global", `${part}.json`), { type: part, settings: {} });
  }
  await write(path.join(dir, "templates", "index.json"), {
    name: "Home",
    slug: "index",
    widgets: { hello: { type: "text-block", settings: { title: "Welcome" } } },
    widgetsOrder: ["hello"],
  });
  await write(path.join(dir, "templates", "about.json"), { name: "About", slug: "about", widgets: {}, widgetsOrder: [] });
  await write(path.join(dir, "menus", "main-menu.json"), { id: "main-menu", name: "Main menu", items: [] });
  await fs.cp(path.resolve(import.meta.dirname, "../../../themes/arch/collection-types/news"), path.join(dir, "collection-types", "news"), {
    recursive: true,
  });
}

let server;
let shutdown;
let releaseDataFolder;
let project;
let scope;
let snapshots;
let generations;
let storage;
let builder;

async function api(method, route, body, form) {
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { origin: base, "x-project-id": project?.id ?? "" };
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers["content-type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${base}${route}`, { method, headers, body: payload });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${route}: ${res.status} ${JSON.stringify(data)}`);
  return data;
}

function uploadForm(name) {
  const form = new FormData();
  form.append("files", new Blob([PNG], { type: "image/png" }), name);
  return form;
}

const inSection = (fn) => builder.withContentWriteLock(project.id, fn);

beforeAll(async () => {
  await writeTheme();
  const { startOssServer } = await import("../../server-common.js");
  ({ server, shutdown, releaseDataFolder } = await startOssServer({ defaultPort: 0 }));
  project = await api("POST", "/api/projects", { name: "Snapshot Site", theme: THEME });

  builder = await import("@widgetizer/builder-server");
  const { LocalStorageAdapter, LocalAssetStorageAdapter } = await import("@widgetizer/adapters-local");
  const { createSiteGenerations, holdAssetWrites } = await import("../siteGenerations.js");
  const { createOssSnapshots, createOssAssetLedger } = await import("../snapshots.js");
  const db = builder.getDb();
  generations = createSiteGenerations(db);
  storage = new LocalStorageAdapter({ dataRoot });
  const rawAssets = new LocalAssetStorageAdapter({ dataRoot });
  const ledger = createOssAssetLedger({ assetStorage: rawAssets, dataRoot });
  holdAssetWrites(rawAssets, ledger);
  snapshots = createOssSnapshots({ adapters: { storage }, db, generations, ledger, dataRoot });
  scope = { projectId: project.id, folderName: project.folderName };
  await api("POST", "/api/media", undefined, uploadForm("kept.png"));
}, 60000);

afterAll(async () => {
  await shutdown?.();
  releaseDataFolder?.();
  builder?.closeDb();
  await fs.rm(root, { recursive: true, force: true });
});

const projectDir = () => path.join(dataRoot, "projects", project.folderName);

describe("site snapshots", () => {
  it("puts back every kind of change, including what was added", async () => {
    const { id, manifest } = await inSection(() => snapshots.capture(scope));
    const pageBefore = await fs.readFile(path.join(projectDir(), "pages", "index.json"), "utf8");

    const home = await api("GET", "/api/pages/index");
    await api("POST", "/api/pages/index/content", { ...home, widgets: { hello: { type: "text-block", settings: { title: "Changed" } } } });
    await api("POST", "/api/pages", { name: "Added", slug: "added" });
    await api("DELETE", "/api/pages/about");
    await api("POST", "/api/preview/global-widgets/footer", { type: "footer", settings: { note: "x" } });
    await api("POST", "/api/menus", { name: "Extra" });
    await api("POST", "/api/collections/news", { slug: "story", settings: { title: "Story" } });
    await api("PATCH", `/api/themes/project/${project.id}`, { changes: [] });
    await api("PUT", `/api/projects/${project.id}`, { name: "Snapshot Site", siteTitle: "Changed title" });
    const media = await api("GET", "/api/media");
    await api("PUT", `/api/media/projects/${project.id}/media/${media.files[0].id}/metadata`, { alt: "Changed alt" });
    await api("POST", "/api/languages", { code: "el" });

    expect(await snapshots.fingerprint(scope)).not.toBe(manifest.fingerprint);
    const restored = await inSection(() => snapshots.restore(scope, id));
    expect(restored.usageIncomplete).toBe(false);

    expect(await fs.readFile(path.join(projectDir(), "pages", "index.json"), "utf8")).toBe(pageBefore);
    await expect(fs.access(path.join(projectDir(), "pages", "added.json"))).rejects.toThrow();
    await expect(fs.access(path.join(projectDir(), "pages", "about.json"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(projectDir(), "collections", "news", "story.json"))).rejects.toThrow();
    const after = builder.getProjectById(project.id);
    expect(after.siteTitle).toBe("");
    expect(after.languages).toEqual([]);
    expect((await api("GET", "/api/media")).files[0].metadata.alt).toBe("");
    expect(await snapshots.fingerprint(scope)).toBe(manifest.fingerprint);

    await inSection(() => snapshots.restore(scope, id));
    expect(await snapshots.fingerprint(scope)).toBe(manifest.fingerprint);
  });

  it("changes the fingerprint for asset writes and theme updates, which the content can't show", async () => {
    const start = await snapshots.fingerprint(scope);
    await api("POST", "/api/media", undefined, uploadForm("more.png"));
    const afterUpload = await snapshots.fingerprint(scope);
    expect(afterUpload).not.toBe(start);

    generations.bump(project.id, "theme");
    expect(await snapshots.fingerprint(scope)).not.toBe(afterUpload);
  });

  it("checks everything before changing anything", async () => {
    const { id } = await inSection(() => snapshots.capture(scope));
    const media = await api("GET", "/api/media");
    const file = media.files[0];
    await fs.rename(path.join(projectDir(), "uploads", "images", file.filename), path.join(root, "aside.png"));
    await api("POST", "/api/pages", { name: "Later", slug: "later" });

    await expect(inSection(() => snapshots.restore(scope, id))).rejects.toMatchObject({ code: "ASSETS_MISSING" });
    await expect(fs.access(path.join(projectDir(), "pages", "later.json"))).resolves.toBeUndefined();

    await fs.rename(path.join(root, "aside.png"), path.join(projectDir(), "uploads", "images", file.filename));
    const db = builder.getDb();
    db.prepare("UPDATE projects SET theme_version = '9.9.9' WHERE id = ?").run(project.id);
    await expect(inSection(() => snapshots.restore(scope, id))).rejects.toMatchObject({ code: "THEME_CHANGED" });
    await expect(fs.access(path.join(projectDir(), "pages", "later.json"))).resolves.toBeUndefined();
    db.prepare("UPDATE projects SET theme_version = '1.0.0' WHERE id = ?").run(project.id);

    await inSection(() => snapshots.restore(scope, id));
    await expect(fs.access(path.join(projectDir(), "pages", "later.json"))).rejects.toThrow();
  });

  it("refuses before any change when theme files changed after the copy", async () => {
    const { id } = await inSection(() => snapshots.capture(scope));
    await api("POST", "/api/pages", { name: "After theme", slug: "after-theme" });
    generations.bump(project.id, "theme");
    await expect(inSection(() => snapshots.restore(scope, id))).rejects.toMatchObject({ code: "SITE_CHANGED" });
    await expect(fs.access(path.join(projectDir(), "pages", "after-theme.json"))).resolves.toBeUndefined();
  });

  it("brings back an image deleted after the copy and removes one added", async () => {
    await api("POST", "/api/media", undefined, uploadForm("keep-me.png"));
    const { id, manifest } = await inSection(() => snapshots.capture(scope));
    const files = (await api("GET", "/api/media")).files;
    const kept = files.find((file) => file.originalName === "keep-me.png");
    const keptPath = path.join(projectDir(), "uploads", "images", kept.filename);
    const original = await fs.readFile(keptPath);
    await api("DELETE", `/api/media/${kept.id}`);
    await expect(fs.access(keptPath)).rejects.toThrow();
    const added = (await api("POST", "/api/media", undefined, uploadForm("added.png"))).processedFiles[0];

    await inSection(() => snapshots.restore(scope, id));
    expect(await fs.readFile(keptPath)).toEqual(original);
    expect((await api("GET", "/api/media")).files.some((file) => file.id === kept.id)).toBe(true);
    await expect(fs.access(path.join(projectDir(), "uploads", "images", added.filename))).rejects.toThrow();
    expect(await snapshots.fingerprint(scope)).toBe(manifest.fingerprint);
  });

  it("leaves no partial file behind when saving a copy fails", async () => {
    const { createLocalSnapshotStore } = await import("@widgetizer/assistant/local");
    const store = createLocalSnapshotStore({ dataRoot });
    await expect(store.put(scope, "1700000000000-abcdef01", {})).rejects.toThrow();
    const names = await fs.readdir(path.join(dataRoot, "assistant", "snapshots", project.id));
    expect(names.filter((name) => name.endsWith(".tmp"))).toEqual([]);
    expect(names).not.toContain("1700000000000-abcdef01.snapshot.gz");
  });

  it("records assets already missing at capture and doesn't require them back", async () => {
    const media = await api("GET", "/api/media");
    const file = media.files.at(-1);
    await fs.rm(path.join(projectDir(), "uploads", "images", file.filename));
    const { id, manifest } = await inSection(() => snapshots.capture(scope));
    expect(manifest.missingAssets).toContain(`images/${file.filename}`);
    await api("POST", "/api/pages", { name: "Again", slug: "again" });
    await inSection(() => snapshots.restore(scope, id));
    await expect(fs.access(path.join(projectDir(), "pages", "again.json"))).rejects.toThrow();
  });

  it("refuses a copy of another site or a damaged copy", async () => {
    const { id } = await inSection(() => snapshots.capture(scope));
    await expect(snapshots.restore({ ...scope, projectId: "other" }, id)).rejects.toThrow();
    const file = path.join(dataRoot, "assistant", "snapshots", project.id, `${id}.snapshot.gz`);
    const bytes = await fs.readFile(file);
    await fs.writeFile(file, bytes.subarray(0, bytes.length - 10));
    await expect(snapshots.restore(scope, id)).rejects.toMatchObject({ code: "SNAPSHOT_UNREADABLE" });
  });

  it("keeps the newest copies within the limits and never a protected one", async () => {
    const ids = [];
    for (let i = 0; i < 12; i += 1) ids.push((await inSection(() => snapshots.capture(scope))).id);
    const all = (await fs.readdir(path.join(dataRoot, "assistant", "snapshots", project.id))).length;
    const removed = await snapshots.prune(scope, { protect: [ids[0]] });
    const left = await fs.readdir(path.join(dataRoot, "assistant", "snapshots", project.id));
    expect(left.length).toBe(11);
    expect(removed.length).toBe(all - 11);
    expect(left).toContain(`${ids[0]}.snapshot.gz`);
    expect(left).toContain(`${ids.at(-1)}.snapshot.gz`);
  });
});
