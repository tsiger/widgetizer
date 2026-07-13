import { useState, useEffect, useCallback } from "react";
import { getCollectionItems } from "../queries/collectionManager";
import useProjectStore from "../stores/projectStore";

/**
 * Loads the items of a single collection type for the active project. Plain
 * useState + useEffect, mirroring useCollections. Unlike schemas, item lists are
 * not cached across navigations — list pages mutate them frequently, so each
 * mount fetches fresh and exposes refetch() for after-write refreshes.
 *
 * @param {string} type - Collection type slug
 * @param {Object} [params] - Optional query params (sort, invalid, limit, offset)
 * @returns {{ items: Array, loading: boolean, error: Error|null, refetch: () => Promise<void> }}
 */
export default function useCollectionItems(type, params) {
  const activeProjectId = useProjectStore((state) => state.activeProject?.id);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Serialize params so the callback identity only changes on real param changes.
  const paramsKey = params ? JSON.stringify(params) : "";

  const fetchItems = useCallback(async () => {
    if (!activeProjectId || !type) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getCollectionItems(type, paramsKey ? JSON.parse(paramsKey) : undefined);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeProjectId, type, paramsKey]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { items, loading, error, refetch: fetchItems };
}
