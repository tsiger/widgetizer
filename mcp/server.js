// Widgetizer MCP server (OSS) — a minimal Model Context Protocol shell.
//
// A new shell alongside app/ and electron/: instead of an Express/HTTP surface it
// exposes MCP "tools" over stdio, so an LLM client (Claude, etc.) can read and
// edit a Widgetizer site by chatting. It assembles the SAME local adapters as
// app/server-common.js (same SQLite db, same data/projects/<folder>/ files).
//
// Scope model: single-tenant, like the OSS editor. The read/edit tools act on the
// active project; create_project makes a new project and switches to it.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

// stdio rule: stdout is the JSON-RPC channel. Any stray stdout (a library log, a
// migration notice) corrupts the protocol framing. console.info/debug default to
// stdout too, so route them all to stderr.
console.log = console.info = console.debug = (...args) => console.error(...args);

// Resolve roots from THIS file, not the launcher's cwd (Claude Desktop starts us
// from an arbitrary directory). Defaulting APP_ROOT/DATA_ROOT makes the backend's
// config.js read the repo's themes/ and data/ regardless of cwd. `??=` leaves an
// explicitly-set value (e.g. Electron's) untouched.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.env.APP_ROOT ??= REPO_ROOT;
process.env.DATA_ROOT ??= path.join(REPO_ROOT, "data");

// Dynamic imports so the env defaults above are set BEFORE config.js evaluates
// (it reads process.env at module load).
const { getDb, DATA_DIR, CORE_WIDGETS_DIR, scaffoldProjectContent, listThemes } = await import("@widgetizer/builder-server");
const { LocalScopeResolver, LocalStorageAdapter } = await import("@widgetizer/adapters-local");
const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = await import("zod");
const slugify = (await import("slugify")).default;

// --- Backend assembly (the "shell" bit) -----------------------------------
const db = getDb();
const scopeResolver = new LocalScopeResolver(db);
const storage = new LocalStorageAdapter({ dataRoot: DATA_DIR });

// Every storage call is scope-first. In OSS the scope is always the singleton
// "active project"; resolveScope() throws NO_ACTIVE_PROJECT if none is selected.
const activeScope = () => scopeResolver.resolveScope();

const ok = (data) => ({
  content: [{ type: "text", text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }],
});
const fail = (message) => ({ content: [{ type: "text", text: message }], isError: true });

// --- Widget discovery helpers ---------------------------------------------
// A project's available widgets = core widgets (global, under CORE_WIDGETS_DIR)
// plus the theme widgets copied into the project (widgets/<type>/schema.json).
// `schema.type` is the string used in a page's widget entry. Mirrors
// projectController.getProjectWidgets.

async function coreWidgetSchemas() {
  let entries;
  try {
    entries = await fs.readdir(CORE_WIDGETS_DIR, { withFileTypes: true });
  } catch {
    return [];
  }
  const schemas = [];
  for (const e of entries) {
    if (!e.isDirectory() || !e.name.startsWith("core-")) continue;
    try {
      schemas.push(JSON.parse(await fs.readFile(path.join(CORE_WIDGETS_DIR, e.name, "schema.json"), "utf8")));
    } catch {
      // skip a malformed / missing schema.json
    }
  }
  return schemas;
}

async function themeWidgetSchemas(scope) {
  const schemas = [];
  for (const name of await storage.list(scope, "widgets")) {
    try {
      const buf = await storage.read(scope, `widgets/${name}/schema.json`);
      if (buf != null) schemas.push(JSON.parse(buf.toString("utf8")));
    } catch {
      // not a widget folder (e.g. widgets/global), so skip
    }
  }
  return schemas;
}

async function coreWidgetsEnabled(scope) {
  try {
    const buf = await storage.read(scope, "theme.json");
    if (buf != null) return JSON.parse(buf.toString("utf8")).useCoreWidgets !== false;
  } catch {
    // fall through to the default
  }
  return true;
}

// Full schema for one type: a theme widget wins over a core widget of the same id.
async function schemaForType(scope, type) {
  try {
    const buf = await storage.read(scope, `widgets/${type}/schema.json`);
    if (buf != null) return JSON.parse(buf.toString("utf8"));
  } catch {
    // not a theme widget, so try core
  }
  try {
    return JSON.parse(await fs.readFile(path.join(CORE_WIDGETS_DIR, type, "schema.json"), "utf8"));
  } catch {
    return null;
  }
}

// --- MCP server + tools ----------------------------------------------------
const server = new McpServer({ name: "widgetizer-oss", version: "0.3.0" });

// 1) List projects — context: what exists, which is active.
server.tool(
  "list_projects",
  "List all Widgetizer projects and show which one is currently active.",
  async () => {
    const rows = db.prepare("SELECT id, name FROM projects ORDER BY created DESC").all();
    const activeRow = db.prepare("SELECT value FROM app_settings WHERE key = 'activeProjectId'").get();
    const activeId = activeRow?.value ? JSON.parse(activeRow.value) : null;
    return ok(rows.map((r) => ({ id: r.id, name: r.name, active: r.id === activeId })));
  },
);

// 2) List the pages in the active project.
server.tool(
  "list_pages",
  "List all pages (slug + name) in the currently active project.",
  async () => {
    try {
      const scope = await activeScope();
      const files = (await storage.list(scope, "pages")).filter((n) => n.endsWith(".json"));
      const pages = await Promise.all(
        files.map(async (name) => {
          const data = JSON.parse((await storage.read(scope, `pages/${name}`)).toString("utf8"));
          return { slug: data.slug ?? name.replace(/\.json$/, ""), name: data.name };
        }),
      );
      return ok(pages);
    } catch (err) {
      return fail(`Could not list pages: ${err.message}`);
    }
  },
);

// 3) Read one page's full content JSON (widgets included).
server.tool(
  "get_page",
  "Read a single page's full content JSON by its slug. Useful to see how real widgets are shaped on an existing page.",
  { slug: z.string().describe("The page slug, e.g. 'about' or 'home'") },
  async ({ slug }) => {
    try {
      const scope = await activeScope();
      const buf = await storage.read(scope, `pages/${slug}.json`);
      if (buf == null) return fail(`No page with slug "${slug}".`);
      return ok(JSON.parse(buf.toString("utf8")));
    } catch (err) {
      return fail(`Could not read page: ${err.message}`);
    }
  },
);

// 4) Create a new empty page in the active project.
server.tool(
  "create_page",
  "Create a new empty page in the active project. Returns the created page.",
  { name: z.string().describe("Human-readable page name, e.g. 'Contact'") },
  async ({ name }) => {
    try {
      const scope = await activeScope();
      const base = slugify(name, { lower: true, strict: true }) || "page";
      let slug = base;
      for (let i = 2; await storage.exists(scope, `pages/${slug}.json`); i++) slug = `${base}-${i}`;
      const now = new Date().toISOString();
      const page = { uuid: randomUUID(), id: slug, slug, name, widgets: {}, created: now, updated: now };
      await storage.write(scope, `pages/${slug}.json`, JSON.stringify(page, null, 2));
      return ok(page);
    } catch (err) {
      return fail(`Could not create page: ${err.message}`);
    }
  },
);

// 5) Add a widget to a page in the active project.
//
// A page stores widgets as a map (widgets[id] = { type, settings }) plus a
// widgetsOrder array that drives render order, so we write BOTH. Widgets that hold
// repeatable child items store them the same way under blocks + blocksOrder.
server.tool(
  "add_widget",
  "Add a widget to the end of a page in the active project. `type` must be a valid widget type (see list_widget_types); `settings` and `blocks` are its field values (see get_widget_schema). Blocks are for widgets that hold repeatable child items (e.g. rich-text content, slides, cards).",
  {
    page: z.string().describe("The page slug to add the widget to, e.g. 'index'"),
    type: z.string().describe("Widget type, e.g. 'rich-text', 'banner', 'core-divider'"),
    settings: z.record(z.any()).optional().describe("Top-level field values as a JSON object"),
    blocks: z
      .array(z.object({ type: z.string(), settings: z.record(z.any()).optional() }))
      .optional()
      .describe("Ordered child blocks for widgets that use them; each is { type, settings }"),
  },
  async ({ page, type, settings, blocks }) => {
    try {
      const scope = await activeScope();
      const buf = await storage.read(scope, `pages/${page}.json`);
      if (buf == null) return fail(`No page with slug "${page}". Use list_pages to see options.`);
      const data = JSON.parse(buf.toString("utf8"));

      data.widgets ??= {};
      const order = Array.isArray(data.widgetsOrder) ? data.widgetsOrder : Object.keys(data.widgets);
      const id = `${slugify(type, { lower: true, strict: true }) || "widget"}-${randomUUID().slice(0, 8)}`;

      const entry = { type, settings: settings ?? {} };
      if (Array.isArray(blocks) && blocks.length) {
        entry.blocks = {};
        entry.blocksOrder = [];
        for (const b of blocks) {
          const bid = `${slugify(b.type, { lower: true, strict: true }) || "block"}-${randomUUID().slice(0, 8)}`;
          entry.blocks[bid] = { type: b.type, settings: b.settings ?? {} };
          entry.blocksOrder.push(bid);
        }
      }

      data.widgets[id] = entry;
      order.push(id);
      data.widgetsOrder = order;
      data.updated = new Date().toISOString();

      await storage.write(scope, `pages/${page}.json`, JSON.stringify(data, null, 2));
      return ok({ page, widgetId: id, type, blocks: blocks?.length ?? 0, widgetCount: order.length });
    } catch (err) {
      return fail(`Could not add widget: ${err.message}`);
    }
  },
);

// 6) List the widget types available to the active project (compact).
server.tool(
  "list_widget_types",
  "List the widget types available to the active project (theme widgets + core widgets). Returns compact entries; call get_widget_schema for one type's fields.",
  async () => {
    try {
      const scope = await activeScope();
      const byType = new Map();
      if (await coreWidgetsEnabled(scope)) {
        for (const s of await coreWidgetSchemas()) byType.set(s.type, { type: s.type, core: true });
      }
      for (const s of await themeWidgetSchemas(scope)) {
        byType.set(s.type, {
          type: s.type,
          ...(s.aliases?.length ? { aliases: s.aliases } : {}),
          ...(s.blocks?.length ? { hasBlocks: true } : {}),
        });
      }
      return ok([...byType.values()]);
    } catch (err) {
      return fail(`Could not list widget types: ${err.message}`);
    }
  },
);

// 7) Full schema (settings + blocks + defaults) for one widget type.
server.tool(
  "get_widget_schema",
  "Get the full schema for one widget type: its settings (id, field type, default, options) and any repeatable blocks. Use it to build valid settings/blocks for add_widget.",
  { type: z.string().describe("Widget type, e.g. 'rich-text' or 'core-divider'") },
  async ({ type }) => {
    try {
      const scope = await activeScope();
      const schema = await schemaForType(scope, type);
      if (!schema) return fail(`Unknown widget type "${type}". Use list_widget_types to see options.`);
      return ok(schema);
    } catch (err) {
      return fail(`Could not read widget schema: ${err.message}`);
    }
  },
);

// 8) Create a new project (theme-only, no preset) and switch to it.
//
// Creating a project is more than a DB row: scaffoldProjectContent copies the
// theme and turns its templates into pages. We then insert the projects row
// (mirroring projectRepository.createProject) and set it active so the read/edit
// tools above target it next.
server.tool(
  "create_project",
  "Create a new Widgetizer project from a theme and switch to it (make it active). It starts with the theme's header/footer plus one blank Home page; preset starter content is not seeded.",
  {
    name: z.string().describe("Project name, e.g. 'My Cafe'"),
    theme: z.string().optional().describe("Theme id to use; defaults to the first installed theme"),
  },
  async ({ name, theme }) => {
    try {
      const projectName = name.trim();
      const themes = await listThemes();
      if (!themes.length) return fail("No themes are installed. Open the Widgetizer app once to provision themes.");
      const themeId = theme ?? themes[0].id;
      if (!themes.some((t) => t.id === themeId)) {
        return fail(`Theme "${themeId}" not found. Available: ${themes.map((t) => t.id).join(", ")}`);
      }

      // Unique folder name (folder_name is UNIQUE in SQLite).
      const base = slugify(projectName, { lower: true, strict: true }) || "project";
      const folderTaken = (f) => !!db.prepare("SELECT 1 FROM projects WHERE folder_name = ? LIMIT 1").get(f);
      let folderName = base;
      for (let i = 2; folderTaken(folderName); i++) folderName = `${base}-${i}`;

      // Filesystem scaffold (theme copy + templates -> pages + link enrichment).
      const projectDir = path.join(DATA_DIR, "projects", folderName);
      const themeVersion = await scaffoldProjectContent({ projectDir, theme: themeId });

      // Insert the projects row (mirrors projectRepository.createProject).
      const id = randomUUID();
      const now = new Date().toISOString();
      db.prepare(
        `INSERT INTO projects (id, folder_name, name, description, site_title, theme, theme_version, preset, receive_theme_updates, site_url, last_theme_update_at, last_theme_update_version, created, updated)
         VALUES (@id, @folderName, @name, '', '', @theme, @themeVersion, NULL, 0, '', NULL, NULL, @now, @now)`,
      ).run({ id, folderName, name: projectName, theme: themeId, themeVersion, now });

      // Switch the active project to the new one so follow-up tools target it.
      db.prepare(
        `INSERT INTO app_settings (key, value) VALUES ('activeProjectId', @value)
         ON CONFLICT(key) DO UPDATE SET value = @value`,
      ).run({ value: JSON.stringify(id) });

      // A theme's bare templates only define header/footer (real starter pages
      // come from presets, which we don't seed here), so drop in one blank Home
      // page. The project is now active, so activeScope() resolves to it.
      const scope = await activeScope();
      const pageNow = new Date().toISOString();
      const home = { uuid: randomUUID(), id: "index", slug: "index", name: "Home", widgets: {}, created: pageNow, updated: pageNow };
      await storage.write(scope, "pages/index.json", JSON.stringify(home, null, 2));

      return ok({ id, name: projectName, folder: folderName, theme: themeId, themeVersion, active: true, pages: ["index"] });
    } catch (err) {
      return fail(`Could not create project: ${err.message}`);
    }
  },
);

// --- Connect over stdio ----------------------------------------------------
// stdio = the "local" transport: the client launches this file as a subprocess
// and speaks JSON-RPC over stdin/stdout. A hosted build would swap this line for
// an HTTP transport + OAuth instead.
await server.connect(new StdioServerTransport());
