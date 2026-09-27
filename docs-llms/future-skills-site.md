# Future: Widgetizer Site Skill

> **Status: Proposal.** Recorded on 2026-09-27. Early notes, nothing built. A skill that lets a desktop-app user's AI agent build a website: pick a theme/preset, then fill in pages, header/footer, menus, collection items and images. Skill basics, distribution (Claude + OpenAI), desktop data paths and tool-neutral writing rules are shared with the theme skill and live in [future-skills-theme.md](future-skills-theme.md). This file covers only what is different.

---

## 1. Goal

"Make me a website for my bakery." The agent chooses a suitable theme/preset, writes the pages and content, and the user opens the result in Widgetizer to review and publish.

The theme skill is for people who **design** themes. This one is for people who **use** a theme to build a site.

---

## 2. The main difference: a site isn't just files

A theme is plain files. A site project is files **plus rows in the SQLite database**. That decides what an agent can do on its own.

| Task | Files alone? | Why |
|---|---|---|
| Create a project | ❌ | The project list comes only from the `projects` table. A hand-made folder never shows up. |
| Add / edit pages | ✅ | The page list is read from `pages/*.json` on every request. |
| Header / footer | ✅ | `pages/global/header.json`, `footer.json`. |
| Menus | ✅ | `menus/<id>.json`. |
| Collection items | ✅ | `collections/<type>/<slug>.json` (+ `_order.json`). |
| Theme settings (colors, fonts) | ✅ | The project's `theme.json`. |
| Add images | ⚠️ | A file dropped into `uploads/images/` renders in preview, but it's missing from the media library, gets no responsive sizes, and is **left out of the export**. |

Two more catches:

- **The open editor wins.** The editor keeps the loaded page in memory and saves the whole page back (autosave after 60 s). An agent's edit to a page that is open in the editor gets overwritten. The user should close the page, or the app, while the agent works.
- **No validator.** Nothing checks page JSON against widget schemas. Bad values are silently cleaned at render time instead of reported. The agent has to read each widget's `schema.json` and get it right.

---

## 3. Three ways to build it

### A. Files only (simplest)

1. The user creates the project in the app, choosing theme + preset.
2. The agent edits content files in `<userData>/data/projects/<folder>/`.
3. The user refreshes the app.

**Good:** no moving parts, works like the theme skill.

**Bad:** images can't be added properly, so the user uploads them. There's also the risk of the editor overwriting edits.

### B. Through the app's local API

The running app has a local API the agent can call directly (e.g. with `curl`):

- It listens on `127.0.0.1` only and has no authentication.
- Requests with no browser origin are allowed.
- The port changes every launch, but it's logged in `<userData>/logs/widgetizer.log`. Take the last "Server is running on http://127.0.0.1:N" line.

This covers what files can't:

- `POST /api/media` uploads images properly (database row + resized variants).
- Project ZIP import registers a project from files (`importProject` needs a `project-export.json` manifest).
- Page saves go through the same code path as the editor.

**Good:** everything works, including images.

**Bad:**
- Relies on reading a log file to find the port, which is fragile.
- The API isn't a documented public contract, so it can change between versions.
- Browser sandboxes (chat-only agents) can't reach it.

### C. Wait for / pair with the MCP server

`future-mcp.md` proposes a local MCP server that wraps the same API with proper tools (`add_widget`, validation against schemas, media upload). That is the clean long-term answer. The site skill would then mostly be a **workflow** on top of those tools: interview the user → pick preset → plan pages → write content → review.

### Leaning

The goal is building a whole site **from a single prompt**, project creation included. That points to **B**, made reliable by the small app change in §4. **A** stays the fallback when the app isn't running. **C** is the long-term upgrade if the MCP server gets built. A pure chat agent (no local files) can only produce a project ZIP for import.

Not decided yet.

---

## 4. Creating the project from a prompt (route B in detail)

### What already exists

- `POST /api/projects` with `{ name, theme, preset }` (optional: `description`, `siteUrl`, `receiveThemeUpdates`, languages, site identity). This is the same endpoint the app's "New project" button uses; see `routes/projects.js` and `createProject` in `projectController.js`.
- The new project only becomes active automatically if no project is active. Otherwise the agent must switch it with `PUT /api/projects/active/:id`, because every content write goes to the **active** project.

### Proposed app change: `server.json`

Today the port is only discoverable from the log file. Proposal: on startup, the app writes the port to a known file, e.g. `<userData>/server.json` (`{ "port": 51234, "pid": … }`), and removes it on exit.

The skill then:

1. Reads `server.json`. If it's missing, the app isn't running, and the skill asks the user to open Widgetizer.
2. Calls `http://127.0.0.1:<port>/api/...`.

Small change, in `electron/main.js` where the `server-ready` message already arrives.

### What the user sees when the agent switches the active project

- **The app doesn't poll.** An open window doesn't notice the switch immediately.
- **It checks on focus.** When the user returns to the Widgetizer window, the editor asks the server which project is active (`useStaleActiveProjectDetection`). If it changed, a blocking notice appears (`StaleProjectCurtain`) saying the active project has changed, with a Reload button that opens the new project.
- **Saving is blocked in the meantime.** Saves from the old project get a `409 PROJECT_MISMATCH` and trigger the same notice. Unsaved changes in the old project are lost on reload.
- **Admin screens show no notice.** The notice only appears inside the editor; the Projects list shows the new project on its next reload.

Safe (nothing is written to the wrong project), but abrupt. The skill should set expectations:

1. Before starting: "I'll create and switch to a new project — save your work in Widgetizer first."
2. Create the project, make it active, fill it in.
3. At the end: "Done. Switch to Widgetizer and click Reload to see your new site."

### Possible later improvement: work on a project without activating it

Let API requests target a named project explicitly, without making it active. The agent could then build the new site in the background while the user keeps working in their open project, with no notice and no lost work.

This changes how the local scope resolver (`LocalScopeResolver`) picks the project and relaxes the write-guard in `resolveActiveProject.js`. Both are deliberate safety mechanisms, so it needs care. Not required to get started.

---

## 5. Facts the skill must encode

- **Page shape** (check a real file, e.g. any preset page):
  - Top level: `name`, `slug`, `uuid`, `created`, `updated`, `widgetsOrder[]`, `widgets{}`, optional `seo` and `parentPageUuid`.
  - Each widget: `{ type, settings, blocks{}, blocksOrder[] }`.
  - The agent must create a new `uuid` for new pages; menus and links point to pages by `pageUuid`.
  - Note: `core-pages.md`'s example (`widgets.main[]`) is outdated.
- **Menus:** `{ id, uuid, name, items[{ label, link, pageUuid, items }] }`. Widget `menu` settings reference a menu by `uuid`.
- **Images** in settings are path strings (`"/uploads/images/x.jpg"`); galleries are arrays of them.
- **Languages:** another language's content lives in its own folder (`pages/el/`, `menus/el/`, `collections/<type>/el/`).
- **Content rules from the presets work apply here too:**
  - clearly fake contacts (`hello@example.com`, `(555) xxx-xxxx`)
  - header contact lines are phone/email/address only
  - lively image prompts
- **Knowledge sources:**
  - `theme-preset-generator.md` — the closest existing thing to a "build a site" workflow: industry brief, page purposes, widget selection
  - `core-pages.md`, `core-menus.md`, `core-collections.md`, `core-media.md`
  - each widget's `schema.json`
  - `arch-design-system.md` for Arch's available widgets

---

## 6. Open questions

1. Which route to start with: B (with `server.json`), A as a fallback, or wait for C?
2. Accept the active-project switch (with the notice), or build "target a project without activating it" first (§4)?
3. Should the agent also choose theme settings (colors, fonts), or only content?
4. Images: does the user supply photos, or does the agent use preset media / generated images?
5. Is a validation script (page JSON vs widget schemas) worth building first? It would help this skill, the MCP server and preset authoring alike.
6. One skill that does the whole flow, or small ones: "plan a site", "write a page", "add a collection item"?
