import crypto from "node:crypto";
import express from "express";
import { createAccessController } from "./access.js";
import { createSessionStore } from "./sessions.js";
import { builtinTools } from "./tools/index.js";
import { PLATFORM_INSTRUCTIONS } from "./instructions.js";
import { BRIDGE_PROTOCOL, ERROR_CODES, selectBridgeVersion } from "./protocol.js";

export { BRIDGE_PROTOCOL, BRIDGE_BASE, EDITOR_CREDENTIAL_HEADER } from "./protocol.js";
export { secretsMatch } from "./access.js";

const REQUEST_ID = /^[A-Za-z0-9_-]{8,64}$/;

function fail(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

function bearer(req) {
  const header = req.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

function validateArguments(tool, args) {
  if (args === undefined) return {};
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    throw Object.assign(new Error("Arguments must be an object."), { code: ERROR_CODES.INVALID_ARGUMENTS });
  }
  const allowed = Object.keys(tool.inputSchema.properties ?? {});
  if (tool.inputSchema.additionalProperties === false) {
    const unknown = Object.keys(args).filter((key) => !allowed.includes(key));
    if (unknown.length) {
      throw Object.assign(new Error(`Unknown argument(s): ${unknown.join(", ")}. Allowed: ${allowed.join(", ") || "none"}.`), {
        code: ERROR_CODES.INVALID_ARGUMENTS,
      });
    }
  }
  return args;
}

function clientInfo(client) {
  return { name: String(client?.name ?? "unknown").slice(0, 100), version: String(client?.version ?? "").slice(0, 50) };
}

function describeTool({ name, title, description, inputSchema, outputSchema, annotations }) {
  return { name, title, description, inputSchema, outputSchema, annotations };
}

/**
 * The app side of the AI assistant bridge. The shell mounts `bridgeRouter` (relay
 * credentials) and `controlRouter` (editor credentials) and calls `start` once the
 * server's real address is known.
 *
 * @param {{
 *   access: { isEnabled: () => boolean, subscribe: (fn: () => void) => () => void },
 *   sites: { list: (actor) => Promise<object[]>, get: (actor, id) => Promise<object|null>, openSiteId: (actor) => Promise<string|null> },
 *   resolveActor: (req) => Promise<object>,
 *   appInfo: { version: string },
 *   publisher?: { publish: (record: object) => Promise<void>, unpublish: (instanceId: string) => Promise<void> },
 *   tools?: object[],
 *   editorProtected?: boolean,
 *   now?: () => number,
 *   heartbeatSeconds?: number,
 * }} options
 */
export function setupAssistantServer({
  access: source,
  sites,
  resolveActor,
  appInfo,
  publisher,
  tools = builtinTools,
  editorProtected = false,
  now,
  heartbeatSeconds,
}) {
  const instanceId = crypto.randomUUID();
  const sessions = createSessionStore({ now, heartbeatSeconds });
  const access = createAccessController({
    source,
    publisher,
    instanceId,
    onRevoke: () => sessions.clear(),
  });
  const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));

  const bridgeRouter = express.Router();
  bridgeRouter.use(express.json({ limit: "1mb" }));

  bridgeRouter.get("/hello", (_req, res) => {
    res.json({ app: "widgetizer", instanceId, bridge: BRIDGE_PROTOCOL });
  });

  bridgeRouter.post("/session", (req, res) => {
    if (!access.isEnabled()) return fail(res, 403, ERROR_CODES.DISABLED, "Assistant access is turned off in Widgetizer.");
    if (!access.checkToken(bearer(req))) {
      return fail(res, 401, ERROR_CODES.TOKEN_INVALID, "The connection token is no longer valid. Rediscover the app.");
    }
    const { bridge, relay, client, mcpProtocolVersion } = req.body ?? {};
    const range = bridge && Number.isInteger(bridge.min) && Number.isInteger(bridge.max) ? bridge : null;
    const bridgeVersion = range ? selectBridgeVersion(range, BRIDGE_PROTOCOL) : null;
    if (!bridgeVersion) {
      const relayTooOld = range && range.max < BRIDGE_PROTOCOL.min;
      return fail(
        res,
        409,
        ERROR_CODES.PROTOCOL,
        relayTooOld
          ? "This assistant connection is too old for this Widgetizer. Please update the connection."
          : "This Widgetizer is too old for this assistant connection. Please update Widgetizer.",
      );
    }
    const session = sessions.create({
      client: clientInfo(client),
      relay: { version: String(relay?.version ?? "").slice(0, 50) },
      bridgeVersion,
    });
    res.json({
      sessionId: session.id,
      sessionToken: session.token,
      bridgeVersion,
      heartbeatSeconds: sessions.heartbeatSeconds,
      instanceId,
      app: { version: appInfo.version },
      mcpProtocolVersion: typeof mcpProtocolVersion === "string" ? mcpProtocolVersion : null,
    });
  });

  bridgeRouter.use((req, res, next) => {
    if (!access.isEnabled()) return fail(res, 403, ERROR_CODES.DISABLED, "Assistant access is turned off in Widgetizer.");
    const session = sessions.authenticate(req.get("x-widgetizer-session") ?? "", bearer(req) ?? "");
    if (!session) return fail(res, 401, ERROR_CODES.SESSION_EXPIRED, "The session has ended. Start a new one.");
    req.assistantSession = session;
    next();
  });

  bridgeRouter.post("/heartbeat", (_req, res) => res.json({ ok: true }));

  bridgeRouter.post("/client", (req, res) => {
    req.assistantSession.client = clientInfo(req.body?.client);
    res.json({ ok: true });
  });

  bridgeRouter.delete("/session", (req, res) => {
    sessions.end(req.assistantSession.id);
    res.json({ ok: true });
  });

  bridgeRouter.get("/catalog", (_req, res) => {
    res.json({ instructions: PLATFORM_INSTRUCTIONS, tools: tools.map(describeTool) });
  });

  bridgeRouter.post("/call/:tool", async (req, res) => {
    const tool = toolsByName.get(req.params.tool);
    if (!tool) return fail(res, 404, ERROR_CODES.UNKNOWN_TOOL, `Unknown tool: ${req.params.tool}`);
    const { requestId, arguments: args } = req.body ?? {};
    if (typeof requestId !== "string" || !REQUEST_ID.test(requestId)) {
      return fail(res, 400, ERROR_CODES.INVALID_ARGUMENTS, "Every call needs a requestId.");
    }

    let outcome;
    try {
      const actor = await resolveActor(req);
      const result = await tool.run({ args: validateArguments(tool, args), sites, appInfo, actor });
      outcome = { isError: false, structuredContent: result };
    } catch (error) {
      if (error.code === ERROR_CODES.INVALID_ARGUMENTS) {
        outcome = { isError: true, error: { code: error.code, message: error.message } };
      } else {
        console.error(`Assistant tool ${tool.name} failed:`, error);
        outcome = { isError: true, error: { code: ERROR_CODES.TOOL_FAILED, message: "Widgetizer couldn't complete this request." } };
      }
    }
    res.json({ requestId, ...outcome });
  });

  const controlRouter = express.Router();
  controlRouter.get("/status", (_req, res) => {
    res.json({ ...access.status(), editorProtected, sessions: access.isEnabled() ? sessions.list() : [] });
  });

  return {
    bridgeRouter,
    controlRouter,
    instanceId,
    start: (url) => access.start(url),
    stop: () => access.stop(),
    settled: () => access.settled(),
  };
}
