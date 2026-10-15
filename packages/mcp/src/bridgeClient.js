import crypto from "node:crypto";
import { BRIDGE_BASE, BRIDGE_PROTOCOL, ERROR_CODES } from "@widgetizer/assistant/protocol";
import { readConnection } from "./discovery.js";

const REQUEST_TIMEOUT_MS = 30000;
const PROBE_TIMEOUT_MS = 2000;

export const RELAY_ERRORS = Object.freeze({
  NOT_RUNNING: "NOT_RUNNING",
  OUTCOME_UNKNOWN: "OUTCOME_UNKNOWN",
});

const MESSAGES = {
  notRunning:
    "Widgetizer isn't reachable. Ask the user to open Widgetizer and turn on AI Assistant access in its settings, then try again.",
  disabled: "AI Assistant access is turned off in Widgetizer. Ask the user to turn it on in Widgetizer's settings.",
  unknown: (requestId) =>
    `The connection to Widgetizer dropped before it answered, so it's unknown whether this happened (request ${requestId}). Check the current state before trying again.`,
};

export class BridgeError extends Error {
  constructor(message, { code }) {
    super(message);
    this.code = code;
  }
}

/** A failure that happened before the app could have run anything. */
class NotSent extends Error {}

async function requestJson(url, { method = "GET", headers = {}, body, timeout = REQUEST_TIMEOUT_MS } = {}) {
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: body === undefined ? headers : { ...headers, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "error",
      signal: AbortSignal.timeout(timeout),
    });
  } catch (error) {
    if (error?.cause?.code === "ECONNREFUSED") throw new NotSent("connection refused");
    throw error;
  }
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = undefined;
  }
  return { status: response.status, data };
}

function isCompleteOutcome(data) {
  if (data.isError === false) {
    return Boolean(data.structuredContent) && typeof data.structuredContent === "object" && !Array.isArray(data.structuredContent);
  }
  return data.isError === true && typeof data.error?.message === "string";
}

function bridgeErrorFrom(data) {
  const code = data?.error?.code;
  if (code === ERROR_CODES.DISABLED) return new BridgeError(MESSAGES.disabled, { code });
  return new BridgeError(data?.error?.message ?? MESSAGES.notRunning, { code: code ?? RELAY_ERRORS.NOT_RUNNING });
}

/**
 * The relay's connection to the running app: finds it through the connection file,
 * holds one session and keeps it alive. A call is sent once; when its answer is
 * lost the outcome is reported as unknown, never replayed.
 */
export class BridgeClient {
  /**
   * @param {{ dataRoot: string, relayVersion: string, client?: () => ({ name: string, version: string }|undefined),
   *   onInstanceChange?: () => void }} options
   */
  constructor({ dataRoot, relayVersion, client = () => undefined, onInstanceChange }) {
    this.dataRoot = dataRoot;
    this.relayVersion = relayVersion;
    this.client = client;
    this.onInstanceChange = onInstanceChange;
    this.session = null;
    this.instanceId = null;
    this.app = null;
    this.connecting = null;
    this.heartbeat = null;
  }

  static headers(session) {
    return { authorization: `Bearer ${session.token}`, "x-widgetizer-session": session.id };
  }

  /** Drop the session, but only if it is still the one the caller saw. */
  forget(session) {
    if (this.session === session) this.session = null;
  }

  connect(options) {
    this.connecting ??= this.openSession(options).finally(() => {
      this.connecting = null;
    });
    return this.connecting;
  }

  async openSession({ timeout = PROBE_TIMEOUT_MS } = {}) {
    const notRunning = () => new BridgeError(MESSAGES.notRunning, { code: RELAY_ERRORS.NOT_RUNNING });
    const connection = await readConnection(this.dataRoot);
    if (!connection) throw notRunning();

    const hello = await requestJson(`${connection.url}${BRIDGE_BASE}/hello`, { timeout }).catch(() => null);
    if (hello?.status !== 200 || hello.data?.instanceId !== connection.instanceId) throw notRunning();

    const opened = await requestJson(`${connection.url}${BRIDGE_BASE}/session`, {
      method: "POST",
      headers: { authorization: `Bearer ${connection.token}` },
      body: {
        bridge: BRIDGE_PROTOCOL,
        relay: { version: this.relayVersion },
        client: this.client() ?? { name: "unknown", version: "" },
      },
      timeout,
    }).catch(() => null);
    if (!opened) throw notRunning();
    if (opened.status !== 200 || typeof opened.data?.sessionId !== "string") throw bridgeErrorFrom(opened.data);

    const previous = this.instanceId;
    const session = { url: connection.url, id: opened.data.sessionId, token: opened.data.sessionToken };
    this.session = session;
    this.instanceId = connection.instanceId;
    this.app = opened.data.app;
    this.startHeartbeat(session, opened.data.heartbeatSeconds);
    if (previous && previous !== this.instanceId) this.onInstanceChange?.();
    return session;
  }

  startHeartbeat(session, seconds) {
    clearInterval(this.heartbeat);
    this.heartbeat = setInterval(() => {
      if (this.session !== session) return;
      requestJson(`${session.url}${BRIDGE_BASE}/heartbeat`, {
        method: "POST",
        headers: BridgeClient.headers(session),
        timeout: PROBE_TIMEOUT_MS,
      })
        .then(({ status }) => {
          if (status !== 200) this.forget(session);
        })
        .catch(() => this.forget(session));
    }, seconds * 1000);
    this.heartbeat.unref?.();
  }

  async ensureSession() {
    return this.session ?? this.connect();
  }

  /**
   * Send on the current session. A request the app refused before running it
   * (expired session, rotated token) is sent again on a fresh session.
   */
  async sessionRequest(path, options = {}) {
    for (let attempt = 0; ; attempt += 1) {
      const session = await this.ensureSession();
      let result;
      try {
        result = await requestJson(`${session.url}${BRIDGE_BASE}${path}`, {
          ...options,
          headers: BridgeClient.headers(session),
        });
      } catch (error) {
        this.forget(session);
        throw error;
      }
      const code = result.data?.error?.code;
      if (result.status === 401 && (code === ERROR_CODES.SESSION_EXPIRED || code === ERROR_CODES.TOKEN_INVALID) && attempt === 0) {
        this.forget(session);
        continue;
      }
      if (result.status === 403 && code === ERROR_CODES.DISABLED) {
        this.forget(session);
        throw bridgeErrorFrom(result.data);
      }
      return result;
    }
  }

  async updateClient() {
    if (!this.session) return;
    await this.sessionRequest("/client", { method: "POST", body: { client: this.client() } }).catch(() => {});
  }

  async catalog() {
    const { status, data } = await this.sessionRequest("/catalog");
    if (status !== 200 || !Array.isArray(data?.tools)) throw bridgeErrorFrom(data);
    return data;
  }

  async call(name, args) {
    const requestId = crypto.randomUUID();
    let result;
    try {
      result = await this.sessionRequest(`/call/${encodeURIComponent(name)}`, {
        method: "POST",
        body: { requestId, arguments: args ?? {} },
      });
    } catch (error) {
      if (error instanceof BridgeError) throw error;
      if (error instanceof NotSent) throw new BridgeError(MESSAGES.notRunning, { code: RELAY_ERRORS.NOT_RUNNING });
      throw new BridgeError(MESSAGES.unknown(requestId), { code: RELAY_ERRORS.OUTCOME_UNKNOWN });
    }

    const { status, data } = result;
    if (status === 200 && data?.requestId === requestId && isCompleteOutcome(data)) return data;
    if (status >= 400 && status < 500 && data?.error?.code) throw bridgeErrorFrom(data);
    throw new BridgeError(MESSAGES.unknown(requestId), { code: RELAY_ERRORS.OUTCOME_UNKNOWN });
  }

  async close() {
    clearInterval(this.heartbeat);
    const session = this.session;
    if (!session) return;
    this.session = null;
    await requestJson(`${session.url}${BRIDGE_BASE}/session`, {
      method: "DELETE",
      headers: BridgeClient.headers(session),
      timeout: PROBE_TIMEOUT_MS,
    }).catch(() => {});
  }
}
