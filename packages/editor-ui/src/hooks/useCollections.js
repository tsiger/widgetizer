import { useState, useEffect, useCallback } from "react";
import { getCollectionSchemas } from "../queries/collectionManager";
import useProjectStore from "../stores/projectStore";

/**
 * Loads the active project's collection schemas. Plain useState + useEffect with
 * a per-project module-level cache (readSchemas), the project-keyed counterpart
 * of useAppSettings.js. Schemas are
 * project-scoped, so the cache is keyed by project id and a project switch
 * transparently fetches fresh data.
 *
 * @returns {{ schemas: Array|null, loading: boolean, error: Error|null, refetch: () => Promise<void> }}
 */

const CACHE_DURATION = 60000; // 1 minute
const schemasCache = new Map(); // projectId -> { data, time }
const inflight = new Map(); // projectId -> Promise

/** A project's schemas, from the cache or the server (shared with any request already running). Sets no state. */
function readSchemas(projectId, force) {
  const cached = schemasCache.get(projectId);
  if (!force && cached && Date.now() - cached.time < CACHE_DURATION) return Promise.resolve(cached.data);
  let promise = force ? null : inflight.get(projectId);
  if (!promise) {
    promise = (async () => {
      try {
        const data = await getCollectionSchemas();
        schemasCache.set(projectId, { data, time: Date.now() });
        return data;
      } finally {
        inflight.delete(projectId);
      }
    })();
    inflight.set(projectId, promise);
  }
  return promise;
}

export default function useCollections() {
  const activeProjectId = useProjectStore((state) => state.activeProject?.id);
  const [schemas, setSchemas] = useState(() => (activeProjectId ? null : []));
  const [loading, setLoading] = useState(Boolean(activeProjectId));
  const [error, setError] = useState(null);

  // Without a project there are no schemas. When the project changes, the
  // loading and error state are reset while rendering, so nothing reads the
  // previous project's state as current while the new schemas load.
  const [loadedFor, setLoadedFor] = useState(activeProjectId);
  if (loadedFor !== activeProjectId) {
    setLoadedFor(activeProjectId);
    setError(null);
    if (activeProjectId) {
      setLoading(true);
    } else {
      setSchemas([]);
      setLoading(false);
    }
  }

  // The load runs inline: an effect may not call a function of this hook that
  // sets state (react-hooks/set-state-in-effect).
  useEffect(() => {
    if (!activeProjectId) return;
    const promise = readSchemas(activeProjectId, false);
    (async () => {
      try {
        setSchemas(await promise);
        setError(null);
      } catch (err) {
        setError(err);
        setSchemas([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [activeProjectId]);

  const refetch = useCallback(async () => {
    if (!activeProjectId) return;
    setLoading(true);
    setError(null);
    try {
      setSchemas(await readSchemas(activeProjectId, true));
    } catch (err) {
      setError(err);
      setSchemas([]);
    } finally {
      setLoading(false);
    }
  }, [activeProjectId]);

  return { schemas, loading, error, refetch };
}
