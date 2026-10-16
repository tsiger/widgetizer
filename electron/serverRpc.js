import crypto from "crypto";

export const RPC_DEADLINE_MS = 5000;

/**
 * Request/reply calls to one server child process over its private message
 * channel. Every call settles: with the reply, at the deadline, or when that
 * child exits or the channel is closed.
 *
 * @param {{ on: Function, once: Function, postMessage: Function }} child
 * @param {{ deadlineMs?: number }} [options]
 */
export function createServerRpc(child, { deadlineMs = RPC_DEADLINE_MS } = {}) {
  const pending = new Map();
  let closed = false;

  const settle = (id, outcome) => {
    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);
    clearTimeout(entry.timer);
    outcome(entry);
  };

  const close = () => {
    closed = true;
    for (const id of [...pending.keys()]) settle(id, (entry) => entry.reject(new Error("The server stopped.")));
  };

  child.on("message", (message) => {
    if (message?.type !== "rpc-result" || typeof message.id !== "string") return;
    settle(message.id, (entry) =>
      message.ok ? entry.resolve(message.value) : entry.reject(new Error(message.error || "The server call failed.")),
    );
  });
  child.once("exit", close);

  return {
    call(method) {
      if (closed) return Promise.reject(new Error("The server stopped."));
      const id = crypto.randomUUID();
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => settle(id, (entry) => entry.reject(new Error("The server didn't answer."))), deadlineMs);
        pending.set(id, { resolve, reject, timer });
        try {
          child.postMessage({ type: "rpc", id, method });
        } catch (error) {
          settle(id, (entry) => entry.reject(error));
        }
      });
    },
    close,
  };
}
