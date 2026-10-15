import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

const root = await fs.mkdtemp(path.join(os.tmpdir(), "wz assistant tools "));
const dataRoot = path.join(root, "data");
const themesRoot = path.join(root, "themes");
process.env.DATA_ROOT = dataRoot;
process.env.THEMES_ROOT = themesRoot;
process.env.PORT = "0";

const THEME = "__assistant_theme__";
const LONG_TEXT = "Long story. ".repeat(5000);

async function write(file, content) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, typeof content === "string" ? content : JSON.stringify(content, null, 2));
}

async function writeTheme() {
  const dir = path.join(themesRoot, THEME);
  await write(path.join(dir, "theme.json"), {
    name: "Assistant Theme",
    version: "1.2.3",
    useCoreWidgets: true,
    settings: { global: { colors: [{ type: "color", id: "accent", label: "tTheme:settings.accent", default: "#ff0066" }] } },
  });
  await write(
    path.join(dir, "layout.liquid"),
    "<!doctype html><html><head><title>{{ page.name }}</title></head><body>{{ header | raw }}<main>{{ main_content | raw }}</main>{{ footer | raw }}</body></html>",
  );
  await write(path.join(dir, "locales", "en.json"), {
    settings: { accent: "Accent colour" },
    widgets: { text_block: { name: "Text block", title: "Title" } },
  });
  await write(path.join(dir, "widgets", "text-block", "schema.json"), {
    type: "text-block",
    displayName: "tTheme:widgets.text_block.name",
    settings: [
      { type: "text", id: "title", label: "tTheme:widgets.text_block.title", default: "" },
      { type: "richtext", id: "body", label: "Body" },
    ],
  });
  await write(
    path.join(dir, "widgets", "text-block", "widget.liquid"),
    "<section><h2>{{ widget.settings.title }}</h2>{{ widget.settings.body | raw }}</section>",
  );
  await write(
    path.join(dir, "widgets", "text-block", "insights.md"),
    "# Text block\n\nA plain section for a heading and some text.\n\n## Pitfalls\n\nKeep it short.\n",
  );
  await write(path.join(dir, "widgets", "broken", "schema.json"), { type: "broken", displayName: "Broken", settings: [] });
  await write(path.join(dir, "widgets", "broken", "widget.liquid"), "{% if %}");
  for (const part of ["header", "footer"]) {
    await write(path.join(dir, "widgets", "global", part, "schema.json"), { type: part, displayName: part, settings: [] });
    await write(path.join(dir, "widgets", "global", part, "widget.liquid"), `<${part}>Site ${part}</${part}>`);
    await write(path.join(dir, "templates", "global", `${part}.json`), {
      type: part,
      settings: {},
      ...(part === "footer"
        ? {
            blocks: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`f${i}`, { type: "note", settings: { text: "w".repeat(3000) } }])),
            blocksOrder: Array.from({ length: 30 }, (_, i) => `f${i}`),
          }
        : {}),
    });
  }
  await write(path.join(dir, "templates", "index.json"), {
    name: "Home",
    slug: "index",
    widgets: {
      hello: { type: "text-block", settings: { title: "Welcome", body: "<p>Hello <a href=\"about.html\">there</a></p>" } },
      oops: { type: "broken", settings: {} },
    },
    widgetsOrder: ["hello", "oops"],
  });
  await write(path.join(dir, "templates", "about.json"), {
    name: "About",
    slug: "about",
    widgets: { story: { type: "text-block", settings: { title: "Our story", body: LONG_TEXT } } },
    widgetsOrder: ["story"],
  });
  await write(path.join(dir, "templates", "big.json"), {
    name: "Big",
    slug: "big",
    widgets: {
      list: {
        type: "text-block",
        settings: { title: "Many" },
        blocks: Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`b${i}`, { type: "item", settings: { text: "y".repeat(3000) } }])),
        blocksOrder: Array.from({ length: 40 }, (_, i) => `b${i}`),
      },
    },
    widgetsOrder: ["list"],
  });
  await write(path.join(dir, "menus", "main-menu.json"), {
    id: "main-menu",
    name: "Main menu",
    items: [
      { id: "home", label: "Home", link: "index.html", items: [{ label: "About", link: "about.html", items: [] }] },
      { label: "Launch post", link: "news/launch.html", collectionItemUuid: "item-uuid-1", collectionType: "news", items: [] },
    ],
  });
}

let server;
let shutdown;
let client;
let relayBridge;
let project;

async function api(method, route, body) {
  const base = `http://127.0.0.1:${server.address().port}`;
  const res = await fetch(`${base}${route}`, {
    method,
    headers: { origin: base, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return res.json();
}

async function call(name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  const text = result.content.find((entry) => entry.type === "text")?.text;
  return { isError: Boolean(result.isError), data: result.structuredContent, text };
}

beforeAll(async () => {
  await writeTheme();
  const { startOssServer } = await import("../../server-common.js");
  ({ server, shutdown } = await startOssServer({ defaultPort: 0 }));
  await api("PUT", "/api/settings", { assistant: { enabled: true } });
  project = await api("POST", "/api/projects", { name: "Assistant Test", theme: THEME });

  const { createRelay } = await import("../../../packages/mcp/src/index.js");
  const relay = await createRelay({ dataRoot, version: "0.0.0" });
  relayBridge = relay.bridge;
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await relay.server.connect(serverSide);
  client = new Client({ name: "tools-test", version: "1" });
  await client.connect(clientSide);
}, 60000);

afterAll(async () => {
  await client?.close();
  await relayBridge?.close();
  await shutdown?.();
  const { closeDb } = await import("@widgetizer/builder-server");
  closeDb();
  await fs.rm(root, { recursive: true, force: true });
});

describe("assistant read tools against a real site", () => {
  it("gives an overview of the saved site", async () => {
    const { data } = await call("site_overview");
    expect(data.site).toEqual({ id: project.id, name: "Assistant Test" });
    expect(data.pages.map((entry) => entry.en.slug).sort()).toEqual(["about", "big", "index"]);
    expect(data.pagesPaging).toMatchObject({ total: 3, hasMore: false });
    expect(data.menus).toEqual([{ id: "main-menu", name: "Main menu" }]);
    expect(data.unsavedState).toBe("unknown");
  });

  it("refuses a page name that is a path", async () => {
    const result = await call("read_page", { page: "../theme" });
    expect(result.isError).toBe(true);
    expect(result.text).toMatch(/page isn't valid/);
  });

  it("outlines a page too large to return whole, and reads a long text in parts", async () => {
    const outline = await call("read_page", { page: "about" });
    expect(outline.data.outline).toBe(true);
    expect(outline.data.sections).toEqual([{ id: "story", type: "text-block", name: "Text block", blocks: 0 }]);

    const section = await call("read_page", { page: "about", sections: ["story"] });
    const body = section.data.sections[0].settings.body;
    expect(body).toMatchObject({ longValue: true, length: LONG_TEXT.length, readWith: { field: "story/body" } });

    const first = await call("read_page", { page: "about", field: "story/body" });
    expect(first.data.parts).toBeGreaterThan(1);
    const last = await call("read_page", { page: "about", field: "story/body", part: first.data.parts });
    expect(first.data.text.length + last.data.text.length).toBeGreaterThan(0);
    expect(LONG_TEXT.endsWith(last.data.text)).toBe(true);
  });

  it("pages through the blocks of one section too large to return whole", async () => {
    const seen = [];
    let args = { page: "big", sections: ["list"] };
    for (let guard = 0; guard < 20; guard += 1) {
      const { data, text } = await call("read_page", args);
      expect(text.length).toBeLessThan(45000);
      const section = data.sections[0];
      seen.push(...section.blocks.map((block) => block.id));
      if (!section.continueWith) break;
      args = { page: "big", ...section.continueWith };
    }
    expect(seen).toEqual(Array.from({ length: 40 }, (_, i) => `b${i}`));
  });

  it("continues a large footer with arguments read_site_part accepts", async () => {
    const seen = [];
    let args = { which: "footer" };
    for (let guard = 0; guard < 20; guard += 1) {
      const { data, isError, text } = await call("read_site_part", args);
      expect(isError, text).toBe(false);
      seen.push(...data.section.blocks.map((block) => block.id));
      if (!data.section.continueWith) break;
      args = data.section.continueWith;
    }
    expect(seen).toEqual(Array.from({ length: 30 }, (_, i) => `f${i}`));
  });

  it("reads menus without writing to them", async () => {
    const file = path.join(dataRoot, "projects", project.folderName, "menus", "main-menu.json");
    const stored = JSON.parse(await fs.readFile(file, "utf8"));
    delete stored.uuid;
    await fs.writeFile(file, JSON.stringify(stored));
    const before = await fs.readFile(file, "utf8");

    const { data } = await call("read_menus", { menu: "main-menu" });
    expect(data.menu.items[0]).toMatchObject({ id: "home", position: "1", label: "Home" });
    expect(data.menu.items[1]).toMatchObject({ position: "2", collectionItem: "item-uuid-1", collection: "news" });
    expect(data.menu.items[0].items[0]).toMatchObject({ position: "1.1", label: "About" });
    expect(await fs.readFile(file, "utf8")).toBe(before);
  });

  it("describes the look with readable labels", async () => {
    const { data } = await call("read_look");
    expect(data.categories[0].settings[0]).toMatchObject({ id: "accent", label: "Accent colour", default: "#ff0066" });
  });

  it("lists what the theme offers, with each section's purpose and the form caveat", async () => {
    const { data } = await call("theme_catalog");
    const textBlock = data.sections.find((section) => section.type === "text-block");
    expect(textBlock).toMatchObject({ name: "Text block", purpose: "A plain section for a heading and some text." });
    expect(data.sections.find((section) => section.type === "core-form")?.caveat).toMatch(/Widgetizer Hosting/);
  });

  it("previews a saved page as text and reports a section that failed without leaking paths", async () => {
    const { data } = await call("preview_page", { page: "index" });
    expect(data.content.text).toMatch(/## Welcome/);
    expect(data.content.text).toMatch(/Site header/);
    expect(data.links).toContainEqual({ text: "there", href: "about.html" });
    expect(data.problems).toHaveLength(1);
    expect(data.problems[0]).toMatchObject({ section: "oops", type: "broken" });
    expect(data.problems[0].message).not.toMatch(/[A-Za-z]:\\|\/Users\/|\/home\//);
    expect(data.coverage).toMatch(/Text only/);
  });

  it("names the site's languages when asked for one it doesn't have", async () => {
    const result = await call("read_page", { page: "index", language: "el" });
    expect(result.isError).toBe(true);
    expect(result.text).toMatch(/isn't on this site\. Its languages are: en/);
  });

  it("serves the core guidance", async () => {
    const { data } = await call("get_guidance", { topic: "core" });
    expect(data.text).toMatch(/Never invent business facts/);
  });
});
