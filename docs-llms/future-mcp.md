# Future: Widgetizer MCP Server

> **Status: Proposal** — Refined notes and rationale for building a local MCP (Model Context Protocol) server that lets MCP-compatible LLM clients drive Widgetizer through its existing local API and documented schema rules.

---

## Why This Makes Sense

### 1. The `docs-llms/` directory is the proof of concept

The project already has 60+ files whose primary audience is LLMs. The preset generator guide is essentially a prompt engineering document — it tells an AI exactly how to read schemas, validate settings, pick fonts, design palettes, and generate valid JSON. That workflow currently requires the LLM to have the entire codebase context loaded and to write raw files to disk. An MCP would turn that implicit contract into an explicit, validated API.

### 2. The REST API is already the right shape

The Express API is almost a 1:1 map to what MCP tools would look like:

| MCP Tool | Existing API |
|----------|-------------|
| `create_project` | `POST /api/projects` |
| `create_page` | `POST /api/pages` |
| `save_page_content` | `POST /api/pages/:id/content` |
| `create_menu` | `POST /api/menus` |
| `update_menu` | `PUT /api/menus/:id` |
| `update_theme_settings` | `POST /api/themes/project/:projectId` |
| `export_site` | `POST /api/export/:projectId` |
| `list_widgets` | `GET /api/projects/:projectId/widgets` |

The MCP server should be a thin translation layer over the existing API, not a parallel implementation. The main value is not "new backend logic" but:

- exposing the right context as MCP resources
- providing safer, higher-level convenience tools for LLMs
- validating schema-driven writes before they hit the API

### 3. Widget schemas are self-describing

Every widget has a `schema.json` with typed settings, valid select options, block definitions, and range constraints. An MCP can expose these as **resources** that any LLM can introspect before generating content. Instead of the LLM reading raw files and parsing schemas itself, a resource like `widgetizer://widgets/banner/schema` hands it structured metadata directly.

This applies to:

- page widgets
- global widgets (`header`, `footer`)
- theme settings schemas
- preset rules and generation guides in `docs-llms/`

### 4. Local-first architecture is ideal for MCP

Widgetizer runs locally (Electron or localhost:3001). The MCP server just talks to `http://localhost:3001/api/*`. No auth tokens, no rate limits, no remote API complexity. It could ship as a built-in feature that starts alongside the Express server.

### 5. Tool-agnostic reach

With an MCP, someone could use Claude Desktop, Cursor, Windsurf, Cline, or any MCP-compatible client to build Widgetizer sites. This turns Widgetizer into a platform that *any* AI tool can drive — not just whichever IDE happens to have the codebase loaded.

---

## Use Cases

### Site scaffolding from a prompt

"Create a portfolio site for a photographer with a gallery page, about page, and contact page using the Arch theme."

The LLM calls `create_project`, then `create_page` 3 times with appropriate widgets, then `create_menu` to wire up navigation, then `update_theme_settings` for a dark, minimal palette. All validated against real schemas.

### Content population

"Fill this About page with content for a bakery called Crumbly."

The LLM reads the page structure, sees the widget types, and calls `save_page_content` with valid widget settings.

### Global widget editing

"Update the header CTA, swap the navigation menu, and add an announcement block."

The LLM reads the current `header` global widget config, validates edits against the header schema, and saves the updated global widget without needing to manually edit project JSON files.

### Preset generation (current workflow, streamlined)

Instead of the LLM needing to know the entire file system layout, `preset.json` format, template directory structure, and menu enrichment logic, it would call tools like `create_preset`, `add_preset_page`, `set_preset_settings` — each validating inputs against the theme's actual schemas.

### Theme customization

"Make the accent color warmer and switch to a serif heading font."

The LLM reads current settings via a resource, calls `update_theme_settings` with valid font stacks from `fonts.json`.

### Full theme authoring (later phase)

"Scaffold a new theme with a layout, locales, screenshot placeholder, and three starter widgets."

This is also possible, but it should be treated as a later phase because it is file/package authoring rather than project-content CRUD.

---

## MCP Surface Design

### Resources (read-only context for the LLM)

| Resource URI | Source | Purpose |
|-------------|--------|---------|
| `widgetizer://themes` | `GET /api/themes` | List available themes |
| `widgetizer://themes/{id}` | `GET /api/themes/:id` | Theme metadata |
| `widgetizer://themes/{id}/widgets` | `GET /api/themes/:id/widgets` | All page widget schemas for a theme |
| `widgetizer://themes/{id}/templates` | `GET /api/themes/:id/templates` | Theme template JSON files |
| `widgetizer://themes/{id}/presets` | `GET /api/themes/:id/presets` | Theme preset registry |
| `widgetizer://themes/{id}/widget/{name}/schema` | Filesystem read | Individual widget schema |
| `widgetizer://themes/{id}/widget/{name}/insights` | Filesystem read | Widget-specific authoring notes |
| `widgetizer://fonts` | `src/core/config/fonts.json` | Available fonts with stacks and weights |
| `widgetizer://projects` | `GET /api/projects` | List all projects |
| `widgetizer://projects/active` | `GET /api/projects/active` | Current active project |
| `widgetizer://projects/{id}/widgets` | `GET /api/projects/:projectId/widgets` | All widget schemas available in a project, including globals/core/theme widgets |
| `widgetizer://projects/{id}/icons` | `GET /api/projects/:projectId/icons` | Available icon names |
| `widgetizer://projects/{id}/pages` | `GET /api/pages` | List pages in the active project |
| `widgetizer://projects/{id}/pages/{slug}` | `GET /api/pages/:id` | Full page JSON with widgets |
| `widgetizer://projects/{id}/menus` | `GET /api/menus` | List menus in the active project |
| `widgetizer://projects/{id}/menus/{id}` | `GET /api/menus/:id` | Full menu JSON with items |
| `widgetizer://projects/{id}/theme-settings` | `GET /api/themes/project/:projectId` | Project theme settings schema + current values |
| `widgetizer://projects/{id}/global-widgets` | `GET /api/preview/global-widgets` | Header/footer config for the active project |
| `widgetizer://docs/index` | `docs-llms/documentation-index.md` | Entry point for LLM-oriented docs |
| `widgetizer://docs/theming` | `docs-llms/theming.md` | Theme structure and packaging rules |
| `widgetizer://docs/theming-widgets` | `docs-llms/theming-widgets.md` | Widget authoring rules |
| `widgetizer://docs/preset-generator` | `docs-llms/theme-preset-generator.md` | Preset generation workflow and constraints |

### Tools (actions the LLM can take)

**Project management:**
- `create_project(name, theme, preset?)` — Create a new project
- `list_projects()` — List all projects
- `set_active_project(id)` — Switch active project
- `export_site(projectId)` — Trigger static site export

**Page management:**
- `create_page(name, seo?)` — Create a new page
- `list_pages()` — List pages in active project
- `get_page(slug)` — Get full page JSON
- `save_page_content(slug, widgets)` — Save page with widget content
- `delete_page(slug)` — Delete a page
- `duplicate_page(slug)` — Clone a page

**Widget operations (convenience layer):**
- `add_widget(pageSlug, widgetType, settings, position?)` — Add a widget to a page (read-modify-write internally)
- `update_widget(pageSlug, widgetId, settings)` — Update widget settings on a page
- `remove_widget(pageSlug, widgetId)` — Remove a widget from a page
- `add_block(pageSlug, widgetId, blockType, settings, position?)` — Add a block to a widget
- `update_block(pageSlug, widgetId, blockId, settings)` — Update a block inside a widget
- `remove_block(pageSlug, widgetId, blockId)` — Remove a block from a widget
- `list_widget_schemas()` — Get all available widget types and their schemas

**Global widgets:**
- `get_global_widget(type)` — Get `header` or `footer` JSON
- `save_global_widget(type, settings, blocks?, blocksOrder?)` — Save a global widget
- `add_global_block(type, blockType, settings, position?)` — Add a block to a global widget

**Menu management:**
- `create_menu(name, items?)` — Create a navigation menu
- `update_menu(id, items)` — Update menu structure
- `list_menus()` — List menus in active project

**Theme settings:**
- `get_theme_settings()` — Get current theme settings
- `update_theme_settings(settings)` — Update colors, fonts, styles

**Media:**
- `upload_media(filePath)` — Upload an image
- `list_media()` — List media files in project

**Preview:**
- `get_preview(pageSlug)` — Get rendered HTML for a page

**Preset authoring (later phase):**
- `create_preset(themeId, presetId, metadata)` — Create preset directory + registry entry
- `set_preset_settings(themeId, presetId, settings)` — Write validated `preset.json` overrides
- `write_preset_page(themeId, presetId, slug, pageJson)` — Write a preset page template
- `write_preset_menu(themeId, presetId, menuId, menuJson)` — Write a preset menu
- `validate_preset(themeId, presetId)` — Validate structure, schemas, and required assets

**Full theme authoring (later phase / possibly separate package):**
- `scaffold_theme(themeId, metadata)` — Create minimal valid theme structure
- `write_theme_widget(themeId, widgetName, schema, template)` — Create or update widget files
- `validate_theme(themeId)` — Validate package structure before install/import

---

## Implementation Notes

### Architecture

A Node.js MCP server package (fits naturally since everything is already Node/ES modules) that makes HTTP calls to the running Widgetizer instance. Could live at `server/mcp/` inside the repo or as a separate `@widgetizer/mcp` package.

The HTTP approach (calling `localhost:3001/api/*`) is preferred over importing controllers directly — it keeps clean separation and works whether Widgetizer is running as Electron or web app.

The first implementation should probably live inside the repo at `server/mcp/`. A separate `@widgetizer/mcp` package can come later if/when the surface stabilizes.

### Widget convenience layer

The page content save endpoint (`POST /api/pages/:id/content`) expects the full page JSON with all widgets. For effective LLM use, the MCP should provide higher-level tools like `add_widget(pageSlug, widgetType, settings, position)` that handle the read-modify-write cycle internally. This prevents the LLM from having to hold full page state, merge changes, and POST the whole thing — which is error-prone and token-heavy.

The same applies to:

- block operations inside widgets
- global widget edits (`header`, `footer`)
- preset page/menu writes

### Validation

The MCP server is the right place to add schema validation before writes. When an LLM calls `add_widget`, the MCP can check that every setting key exists in the widget's `schema.json`, every select value is valid, link objects have the right shape, and range values are within bounds. This catches errors before they reach the API, with clear error messages the LLM can act on.

Important nuance: Widgetizer already sanitizes some data server-side, especially theme settings and rendered widget content. But page content saves still largely persist full page JSON as submitted. MCP-side strict validation is therefore still valuable and should be considered part of the product, not just a convenience.

Validation should cover:

- widget setting keys and types
- block type names and block setting keys
- `maxBlocks` constraints
- menu IDs and menu setting references where applicable
- font stacks and weights from `fonts.json`
- link object shape
- global widget schemas
- preset structure and required files

### Active project context

Most Widgetizer API calls are scoped to the active project (via `X-Project-Id` header). The MCP should not maintain a separate private "active project" that can drift from Widgetizer itself. Instead:

- `set_active_project(id)` should call Widgetizer's real active-project API
- the MCP should read the current active project from Widgetizer when needed
- write calls should include `X-Project-Id` so Widgetizer's mismatch guard can protect against stale context

This keeps the MCP aligned with the real application state instead of creating a second source of truth.

### Docs as MCP resources

`docs-llms/` should be treated as first-class MCP context, not just implementation notes sitting on disk. Those docs already encode a large amount of domain knowledge that an LLM needs in order to:

- pick valid widgets
- configure settings correctly
- design distinct presets
- author themes without breaking packaging rules

The docs index should act as the MCP entry point for longer-form guidance, while schema/resources provide structured machine-friendly data.

### Scope boundary

There are really three different opportunity areas here:

1. **Project/content authoring** — Create projects, pages, menus, theme settings, and content inside an existing theme
2. **Preset authoring** — Create preset variants within an existing theme using documented rules
3. **Full theme authoring** — Create or modify the actual theme package (`theme.json`, `layout.liquid`, widgets, assets, locales, screenshots)

The first two are a very natural fit for the initial MCP. The third is still promising, but it is a bigger leap because it crosses from API orchestration into code/file/package generation.

---

## Phased Rollout

### Phase 1: Read-only resources + project-aware basics

Expose themes, projects, fonts, widget schemas, theme settings, docs, pages, menus, and global widgets as resources. Implement:

- `list_projects`
- `set_active_project`
- `create_project`
- `list_pages`
- `get_page`
- `create_page`
- `list_menus`
- `create_menu`
- `get_theme_settings`
- `update_theme_settings`
- `get_global_widget`
- `save_global_widget`

This covers the core "build and tune a site from a prompt" workflow while staying close to existing API behavior.

### Phase 2: Widget/global-widget convenience layer + validation

Add:

- `add_widget`
- `update_widget`
- `remove_widget`
- `add_block`
- `update_block`
- `remove_block`
- `add_global_block`

Also add schema-aware validation here. This is likely the highest-leverage phase because it removes the need for LLMs to manually juggle full page JSON and block IDs.

### Phase 3: Preset authoring tools

Add:

- `create_preset`
- `set_preset_settings`
- `write_preset_page`
- `write_preset_menu`
- `validate_preset`

This should use the existing preset docs and theme schema rules as first-class guidance. It is the cleanest extension from project-content authoring into theme-adjacent generation.

### Phase 4: Media + preview

Add media upload tools and preview rendering so the LLM can verify its work visually through rendered HTML and optional preview-token workflows.

### Phase 5: Full theme authoring (optional / separate track)

Only after the earlier phases are working well, consider adding theme-package authoring tools such as `scaffold_theme`, `write_theme_widget`, and `validate_theme`.

This phase may eventually deserve its own package or namespace because it is meaningfully different from editing content inside an already-installed theme.
