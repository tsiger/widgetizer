// Shared by the app and the relay. Must stay dependency-free: the relay bundles it.

export const BRIDGE_PROTOCOL = Object.freeze({ min: 1, max: 1 });

export const CONNECTION_FILE_FORMAT = 1;
export const CONNECTION_DIR = "assistant";
export const CONNECTION_FILE = "connection.json";

export const BRIDGE_BASE = "/api/assistant/bridge";
export const EDITOR_CREDENTIAL_HEADER = "x-widgetizer-editor";

export const HEARTBEAT_SECONDS = 15;
export const MISSED_HEARTBEATS = 3;

export const ERROR_CODES = Object.freeze({
  DISABLED: "ASSISTANT_DISABLED",
  TOKEN_INVALID: "ASSISTANT_TOKEN_INVALID",
  SESSION_EXPIRED: "ASSISTANT_SESSION_EXPIRED",
  PROTOCOL: "ASSISTANT_PROTOCOL",
  UNKNOWN_TOOL: "ASSISTANT_UNKNOWN_TOOL",
  INVALID_ARGUMENTS: "ASSISTANT_INVALID_ARGUMENTS",
  TOOL_FAILED: "ASSISTANT_TOOL_FAILED",
});

/**
 * Highest bridge version both sides support, or null when the ranges don't overlap.
 * @param {{ min: number, max: number }} a
 * @param {{ min: number, max: number }} b
 * @returns {number|null}
 */
export function selectBridgeVersion(a, b) {
  const max = Math.min(a.max, b.max);
  return max >= Math.max(a.min, b.min) ? max : null;
}
