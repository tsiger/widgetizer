/**
 * Per-key async serialization.
 *
 * createKeyedSerializer() returns run(key, fn): overlapping calls with the
 * same key execute strictly one after another (each chains behind the
 * in-flight call); different keys run concurrently. A rejection propagates to
 * its own caller but never blocks the calls queued behind it. In-process
 * only — a second server process has its own chains, so cross-process
 * coordination (if ever needed) must come from the database instead.
 *
 * NOT reentrant: run(key, () => run(key, fn)) deadlocks — the inner call
 * queues behind the outer call that is awaiting it. Structure nested work as
 * plain function calls inside one run() section instead.
 *
 * Exported from the package for embedding hosts that need the same per-key
 * ordering around their own long-running operations.
 *
 * @returns {(key: string, fn: () => Promise<any>) => Promise<any>}
 */
export function createKeyedSerializer() {
  const chains = new Map();

  return async function run(key, fn) {
    const prev = chains.get(key) ?? Promise.resolve();
    const next = prev.catch(() => {}).then(() => fn());
    chains.set(key, next);
    try {
      return await next;
    } finally {
      // Only the last call in the chain removes the entry, so an already-queued
      // follower never loses its predecessor.
      if (chains.get(key) === next) chains.delete(key);
    }
  };
}
