# Widgetizer MCP server (OSS MVP)

A tiny [Model Context Protocol](https://modelcontextprotocol.io) server that lets an
LLM client (Claude Desktop, etc.) read and edit your Widgetizer site by chatting.

It is a **new shell** next to `app/` and `electron/`: it assembles the same local
adapters as `app/server-common.js` (same SQLite db, same `data/projects/` files), but
exposes **tools over stdio** instead of an HTTP API. It all lives in one file, [server.js](server.js).

Typical chat flow for building: `list_widget_types` → `get_widget_schema <type>` → `add_widget`
(with the settings/blocks the schema showed).

## Tools

| Tool | What it does |
| --- | --- |
| `list_projects` | List all projects, mark which is active |
| `list_pages` | List pages (slug + name) in the active project |
| `get_page` | Read one page's full JSON by slug |
| `create_page` | Create a new empty page in the active project |
| `add_widget` | Add a widget (settings + optional blocks) to a page |
| `list_widget_types` | List widget types available to the active project |
| `get_widget_schema` | Get one widget type's fields (settings + blocks) |
| `create_project` | Create a new project from a theme and switch to it |

The read/edit tools act on the **active project**: the one currently open in the Widgetizer
app (the same single-tenant scope the editor UI uses). `create_project` makes a new project
and switches the active project to it, so follow-up tools target the new one.

## Try it

```bash
npm install            # pulls in @modelcontextprotocol/sdk + zod (added to package.json)
```

You need at least one project to exist. If you have never run the app, start it once
(`npm run dev:all`) and create/select a project so there is an active project in the db.

Then point an MCP client at `mcp/server.js`. For **Claude Desktop**, edit its config
(`%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "widgetizer": {
      "command": "node",
      "args": ["C:\\Users\\g_tsi\\Projects\\widgetizer\\mcp\\server.js"]
    }
  }
}
```

Restart Claude Desktop, then ask it things like *"list my Widgetizer pages"* or
*"create a page called Contact"*. Refresh the app to see the new page.

## Local vs remote

This MVP uses the **stdio** (local) transport: the LLM app launches `server.js` as a
subprocess and talks to it over stdin/stdout. No network, no login. That is the right fit
for the desktop/OSS build, where the site files already live on the same machine.

The **hosted** build would keep the exact same tool definitions but swap the last line
(`StdioServerTransport`) for an HTTP transport plus OAuth, so each user connects over a URL
and only ever touches their own tenant.

## Scope of this MVP

Deliberately minimal, to show the shape. Not included yet: editing/removing existing widgets,
media upload, theme settings, preset seeding, or targeting a project other than the active
one. Each would be another small tool over the same adapters.
