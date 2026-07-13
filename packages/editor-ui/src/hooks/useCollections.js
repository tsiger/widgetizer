import { useState, useEffect, useCallback } from "react";
import { getCollectionSchemas } from "../queries/collectionManager";
import useProjectStore from "../stores/projectStore";

/**
 * Loads the active project's collection schemas. Plain useState + useEffect with
 * a per-project module-level cache, matching useAppSettings.js. Schemas are
 * project-scoped, so the cache is keyed by project id and a project switch
 * transparently fetches fresh data.
 *
 * @returns {{ schemas: Array|null, loading: boolean, error: Error|null, refetch: () => Promise<void> }}
 */

const CACHE_DURATION = 60000; // 1 minute
const schemasCache = new Map(); // projectId -> { data, time }
const inflight = new Map(); // projectId -> Promise

export default function useCollections() {
  const activeProjectId = useProjectStore((state) => state.activeProject?.id);
  const [schemas, setSchemas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSchemas = useCallback(
    async ({ force = false } = {}) => {
      if (!activeProjectId) {
        setSchemas([]);
        setLoading(false);
        setError(null);
        return;
      }

      const cached = schemasCache.get(activeProjectId);
      if (!force && cached && Date.now() - cached.time < CACHE_DURATION) {
        setSchemas(cached.data);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      let promise = force ? null : inflight.get(activeProjectId);
      if (!promise) {
        promise = (async () => {
          try {
            const data = await getCollectionSchemas();
            schemasCache.set(activeProjectId, { data, time: Date.now() });
            return data;
          } finally {
            inflight.delete(activeProjectId);
          }
        })();
        inflight.set(activeProjectId, promise);
      }

      try {
        const data = await promise;
        setSchemas(data);
      } catch (err) {
        setError(err);
        setSchemas([]);
      } finally {
        setLoading(false);
      }
    },
    [activeProjectId],
  );

  useEffect(() => {
    fetchSchemas();
  }, [fetchSchemas]);

  const refetch = useCallback(() => fetchSchemas({ force: true }), [fetchSchemas]);

  return { schemas, loading, error, refetch };
}
