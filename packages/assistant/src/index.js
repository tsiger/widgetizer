import crypto from "node:crypto";
import express from "express";
import { createAccessController } from "./access.js";
import { createSessionStore } from "./sessions.js";
import { builtinTools } from "./tools/index.js";
import { PLATFORM_INSTRUCTIONS } from "./instructions.js";
import { BRIDGE_PROTOCOL, ERROR_CODES, selectBridgeVersion } from "./protocol.js";
import { validateArguments } from "./validate.js";
import { asToolError, toolError } from "./errors.js";
import { createToolContext } from "./tools/context.js";

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

// Images travel base64-encoded beside the result, never inside it, so the relay
// can hand them to the client as images rather than print them as text.
const MAX_IMAGE_BASE64 = Math.ceil((1024 * 1024 * 4) / 3) + 4;
const MAX_IMAGES_BASE64_TOTAL = 3 * 1024 * 1024;

function boundedImages(images) {
  const kept = [];
  let total = 0;
  for (const image of Array.isArray(images) ? images : []) {
    if (typeof image?.data !== "string" || image.data.length > MAX_IMAGE_BASE64) continue;
    if (total + image.data.length > MAX_IMAGES_BASE64_TOTAL) break;
    total += image.data.length;
    kept.push({ data: image.data, mimeType: image.mimeType, mediaId: image.mediaId ?? null, label: image.label ?? null });
  }
  return kept;
}

function clientInfo(client) {
  return { name: String(client?.name ?? "unknown").slice(0, 100), version: String(client?.version ?? "").slice(0, 50) };
}

// Tools shorten their own results; this is the guarantee behind them. Whatever is
// still too large is kept once and handed out in numbered parts of its JSON, so
// nothing is cut and every part comes from the same result.
const MAX_RESULT_CHARS = 48000;
const SPLIT_TTL_MS = 10 * 60 * 1000;
const MAX_SPLIT_RESULTS = 20;
const RESULT_PART = {
  type: "integer",
  minimum: 2,
  maximum: 1000,
  description: "Only when a result was split: which further part to return.",
};
const RESULT_ID = {
  type: "string",
  pattern: "^[a-f0-9-]{36}$",
  description: "Only when a result was split: its resultId.",
};

function withResultPart(inputSchema) {
  return {
    ...inputSchema,
    properties: { ...(inputSchema.properties ?? {}), resultId: RESULT_ID, resultPart: RESULT_PART },
  };
}

function createSplitStore(now = () => Date.now()) {
  const results = new Map();
  const sweep = () => {
    for (const [id, entry] of results) if (entry.expires < now()) results.delete(id);
  };
  const partOf = (id, entry, part) => ({
    split: true,
    resultId: id,
    resultPart: part,
    resultParts: Math.ceil(entry.text.length / MAX_RESULT_CHARS),
    json: entry.text.slice((part - 1) * MAX_RESULT_CHARS, part * MAX_RESULT_CHARS),
    note: "This result was too large for one reply. Call the same tool with resultId and resultPart 2, 3, … and join the json pieces in order.",
  });
  return {
    first(tool, data) {
      const text = JSON.stringify(data);
      if (text.length <= MAX_RESULT_CHARS) return data;
      sweep();
      const id = crypto.randomUUID();
      results.set(id, { tool, text, expires: now() + SPLIT_TTL_MS });
      if (results.size > MAX_SPLIT_RESULTS) results.delete(results.keys().next().value);
      return partOf(id, results.get(id), 1);
    },
    later(tool, id, part) {
      sweep();
      const entry = results.get(id);
      if (!entry || entry.tool !== tool) {
        throw toolError(ERROR_CODES.INVALID_ARGUMENTS, "That split result is no longer available. Call the tool again without resultId.");
      }
      const parts = Math.ceil(entry.text.length / MAX_RESULT_CHARS);
      if (part > parts) throw toolError(ERROR_CODES.INVALID_ARGUMENTS, `resultPart must be at most ${parts}.`);
      return partOf(id, entry, part);
    },
  };
}

function describeTool({ name, title, description, inputSchema, outputSchema, annotations }) {
  return { name, title, description, inputSchema: withResultPart(inputSchema), outputSchema, annotations };
}

/**
 * The app side of the AI assistant bridge. The shell mounts `bridgeRouter` (relay
 * credentials) and `controlRouter` (editor credentials) and calls `start` once the
 * server's real address is known.
 *
 * @param {{
 *   access: { isEnabled: () => boolean, subscribe: (fn: () => void) => () => void },
 *   site: {
 *     listSites: (actor) => Promise<{ sites: object[], openSiteId: string|null }>,
 *     openSite: (actor) => Promise<{ scope: object, project: object } | null>,
 *     reader: object,
 *   },
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
  site,
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
  const splitResults = createSplitStore(now);

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
      const plain = args === undefined || (args !== null && typeof args === "object" && !Array.isArray(args));
      const { resultId, resultPart, ...toolArgs } = plain ? (args ?? {}) : {};
      const split = validateArguments(
        { type: "object", properties: { resultId: RESULT_ID, resultPart: RESULT_PART } },
        { resultId, resultPart },
      );
      if (Boolean(split.resultId) !== Boolean(split.resultPart)) {
        throw toolError(ERROR_CODES.INVALID_ARGUMENTS, "resultId and resultPart go together.");
      }
      if (split.resultId) {
        outcome = { isError: false, structuredContent: splitResults.later(tool.name, split.resultId, split.resultPart) };
      } else {
        const checked = validateArguments(tool.inputSchema, plain ? toolArgs : args);
        const ctx = createToolContext({ args: checked, actor, appInfo, site });
        const result = await tool.run(ctx);
        await ctx.finish();
        const images = boundedImages(result.images);
        outcome = {
          isError: false,
          structuredContent: splitResults.first(tool.name, result.data),
          ...(images.length ? { images } : {}),
        };
      }
    } catch (error) {
      const expected = asToolError(error);
      if (expected) {
        outcome = { isError: true, error: { code: expected.code, message: expected.message } };
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
