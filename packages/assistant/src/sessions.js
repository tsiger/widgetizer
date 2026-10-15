import crypto from "node:crypto";
import { randomSecret, secretsMatch } from "./access.js";
import { HEARTBEAT_SECONDS, MISSED_HEARTBEATS } from "./protocol.js";

/**
 * Live relay connections. A session proves a relay held the current installation
 * token; it is not the key future jobs are stored under.
 */
export function createSessionStore({ now = () => Date.now(), heartbeatSeconds = HEARTBEAT_SECONDS } = {}) {
  const sessions = new Map();
  const ttl = heartbeatSeconds * MISSED_HEARTBEATS * 1000;

  function sweep() {
    const cutoff = now() - ttl;
    for (const [id, session] of sessions) {
      if (session.lastSeen < cutoff) sessions.delete(id);
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
      sessions.delete(id);
    },
    clear() {
      sessions.clear();
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
