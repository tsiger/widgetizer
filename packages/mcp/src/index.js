import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { BridgeClient, BridgeError } from "./bridgeClient.js";

export { resolveDataRoot, defaultDataRoot } from "./discovery.js";

const STARTUP_TIMEOUT_MS = 2000;

const FALLBACK_INSTRUCTIONS = [
  "Widgetizer is a website builder running on the user's computer. You work through it, never on files directly.",
  "It wasn't reachable when this connection started. Call widgetizer_connect to check again; if it fails, ask the user to open Widgetizer and turn on AI Assistant access in its settings.",
].join("\n");

const CONNECT_TOOL = {
  name: "widgetizer_connect",
  title: "Connect to Widgetizer",
  description:
    "Checks the connection to the Widgetizer app. Use it when Widgetizer's tools are missing or the app wasn't reachable.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  annotations: { readOnlyHint: true, openWorldHint: false },
};

function textResult(text, isError = false) {
  return { content: [{ type: "text", text }], isError };
}

function toToolResult(outcome) {
  if (outcome?.isError) return textResult(outcome.error?.message ?? "Widgetizer couldn't complete this request.", true);
  const structured = outcome?.structuredContent;
  return {
    content: [{ type: "text", text: JSON.stringify(structured ?? null, null, 2) }],
    ...(structured && typeof structured === "object" ? { structuredContent: structured } : {}),
    isError: false,
  };
}

/**
 * Build the relay: an MCP server whose tools are whatever the running Widgetizer
 * offers. It never touches Widgetizer's files; it only talks to the app.
 *
 * @param {{ dataRoot: string, version: string }} options
 */
export async function createRelay({ dataRoot, version }) {
  let server;
  let catalog = null;

  const bridge = new BridgeClient({
    dataRoot,
    relayVersion: version,
    client: () => server?.getClientVersion(),
    onInstanceChange: () => {
      catalog = null;
      server?.sendToolListChanged().catch(() => {});
    },
  });

  // Listing re-establishes a lost session first, so a restarted app (new
  // instance) replaces the cached tools instead of the relay serving old ones.
  async function loadCatalog() {
    await bridge.ensureSession();
    catalog ??= await bridge.catalog();
    return catalog;
  }

  let instructions = FALLBACK_INSTRUCTIONS;
  try {
    await bridge.connect({ timeout: STARTUP_TIMEOUT_MS });
    instructions = (await loadCatalog()).instructions;
  } catch {
    catalog = null;
  }

  server = new Server(
    { name: "widgetizer", title: "Widgetizer", version },
    { capabilities: { tools: { listChanged: true } }, instructions },
  );

  server.oninitialized = () => {
    bridge.updateClient();
  };

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    try {
      const { tools } = await loadCatalog();
      return { tools: [...tools, CONNECT_TOOL] };
    } catch {
      return { tools: [CONNECT_TOOL] };
    }
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    if (name === CONNECT_TOOL.name) {
      const hadTools = Boolean(catalog);
      try {
        bridge.session = null;
        await bridge.connect();
        catalog = null;
        await loadCatalog();
        if (!hadTools) server.sendToolListChanged().catch(() => {});
        return textResult(`Connected to Widgetizer ${bridge.app?.version ?? ""}.`.trim());
      } catch (error) {
        return textResult(error instanceof BridgeError ? error.message : "Widgetizer isn't reachable.", true);
      }
    }
    try {
      return toToolResult(await bridge.call(name, args));
    } catch (error) {
      return textResult(error instanceof BridgeError ? error.message : "Widgetizer isn't reachable.", true);
    }
  });

  return { server, bridge };
}
