import crypto from "node:crypto";

export function randomSecret() {
  return crypto.randomBytes(32).toString("base64url");
}

export function secretsMatch(given, expected) {
  if (typeof given !== "string" || typeof expected !== "string") return false;
  const a = crypto.createHash("sha256").update(given).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

/**
 * Owns the installation token and its publication. Turning access off invalidates
 * the token synchronously; publication runs on a serial queue, and a publish that
 * finishes after access was turned off again is withdrawn.
 *
 * @param {{
 *   source: { isEnabled: () => boolean, subscribe: (fn: () => void) => () => void },
 *   publisher?: { publish: (record: object) => Promise<void>, unpublish: (instanceId: string) => Promise<void>, close?: () => Promise<void> },
 *   instanceId: string,
 *   onRevoke?: (reason: string) => void,
 * }} options
 */
export function createAccessController({ source, publisher, instanceId, onRevoke }) {
  let url = null;
  let token = null;
  let generation = 0;
  let published = false;
  let lastError = null;
  let queue = Promise.resolve();
  let unsubscribe = null;
  let stopped = false;

  const enqueue = (task) => {
    queue = queue.then(task).catch((error) => {
      lastError = error;
    });
    return queue;
  };

  function revoke(reason) {
    generation += 1;
    token = null;
    onRevoke?.(reason);
  }

  function apply() {
    if (stopped || !url) return queue;
    const wanted = source.isEnabled();
    if (wanted && token) return queue;
    if (!wanted && !token && !published) return queue;

    if (!wanted) {
      revoke("disabled");
      return enqueue(async () => {
        if (publisher && published) await publisher.unpublish(instanceId);
        published = false;
        lastError = null;
      });
    }

    revoke("reissued");
    token = randomSecret();
    lastError = null;
    const myGeneration = generation;
    const record = { url, token, instanceId };
    return enqueue(async () => {
      if (myGeneration !== generation) return;
      if (publisher) {
        await publisher.publish(record);
        published = true;
        if (myGeneration !== generation && !token) {
          await publisher.unpublish(instanceId);
          published = false;
        }
      }
    });
  }

  return {
    /** Begin serving once the real address is known. */
    start(boundUrl) {
      url = boundUrl;
      unsubscribe = source.subscribe(() => apply());
      return apply();
    },
    async stop() {
      stopped = true;
      unsubscribe?.();
      if (token) revoke("shutdown");
      await queue;
      if (publisher && published) {
        await publisher.unpublish(instanceId).catch(() => {});
        published = false;
      }
      await publisher?.close?.().catch(() => {});
    },
    isEnabled: () => Boolean(token),
    checkToken: (given) => Boolean(token) && secretsMatch(given, token),
    generation: () => generation,
    status() {
      return {
        enabled: source.isEnabled(),
        ready: Boolean(token) && (!publisher || published) && !lastError,
        error: lastError ? lastError.message : null,
      };
    },
    settled: () => queue,
  };
}
