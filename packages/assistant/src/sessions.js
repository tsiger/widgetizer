import crypto from "node:crypto";
import { randomSecret, secretsMatch } from "./access.js";
import { HEARTBEAT_SECONDS, MISSED_HEARTBEATS } from "./protocol.js";

/**
 * Live relay connections. A session proves a relay held the current installation
 * token; it is not the key future jobs are stored under.
 */
export function createSessionStore({ now = () => Date.now(), heartbeatSeconds = HEARTBEAT_SECONDS, onEnd } = {}) {
  const sessions = new Map();
  const ttl = heartbeatSeconds * MISSED_HEARTBEATS * 1000;
  let sweeper = null;

  function remove(id) {
    if (sessions.delete(id)) onEnd?.(id);
  }

  function sweep() {
    const cutoff = now() - ttl;
    for (const [id, session] of sessions) {
      if (session.lastSeen < cutoff) remove(id);
    }
  }

  return {
    heartbeatSeconds,
    create({ client, relay, bridgeVersion }) {
      sweep();
      const id = crypto.randomUUID();
      const token = randomSecret();
      sessions.set(id, {
        id,
        token,
        client,
        relay,
        bridgeVersion,
        connectedAt: now(),
        lastSeen: now(),
      });
      return { id, token };
    },
    authenticate(id, token) {
      sweep();
      const session = sessions.get(id);
      if (!session || !secretsMatch(token, session.token)) return null;
      session.lastSeen = now();
      return session;
    },
    end(id) {
      remove(id);
    },
    clear() {
      for (const id of [...sessions.keys()]) remove(id);
    },
    isAlive(id) {
      sweep();
      return sessions.has(id);
    },
    /** Ends sessions that stopped sending heartbeats even when nothing else calls in. */
    startSweeping() {
      if (sweeper) return;
      sweeper = setInterval(sweep, heartbeatSeconds * 1000);
      sweeper.unref?.();
    },
    stopSweeping() {
      clearInterval(sweeper);
      sweeper = null;
    },
    list() {
      sweep();
      return [...sessions.values()].map(({ client, relay, connectedAt, lastSeen }) => ({
        client,
        relay,
        connectedAt: new Date(connectedAt).toISOString(),
        lastSeen: new Date(lastSeen).toISOString(),
      }));
    },
  };
}
