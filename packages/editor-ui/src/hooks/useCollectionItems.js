import { useState, useEffect, useCallback } from "react";
import { getCollectionItems } from "../queries/collectionManager";
import useProjectStore, { useDefaultLanguage, useExtraLanguages } from "../stores/projectStore";

/**
 * Loads the items of a single collection type for the active project. Plain
 * useState + useEffect, mirroring useCollections. Unlike schemas, item lists are
 * not cached across navigations — list pages mutate them frequently, so each
 * mount fetches fresh and exposes refetch() for after-write refreshes.
 *
 * The listing is per language, so on a multilingual site every language is asked
 * for and the results merged — the tabs, the count and the translation chips all
 * come from that one list, the way `getAllPages` already answers for pages. Each
 * language keeps its own order, which is what its `_order.json` records.
 *
 * @param {string} type - Collection type slug
 * @param {Object} [params] - Optional query params (sort, invalid, limit, offset)
 * @returns {{ items: Array, loading: boolean, error: Error|null, refetch: () => Promise<void> }}
 */
export default function useCollectionItems(type, params) {
  const activeProjectId = useProjectStore((state) => state.activeProject?.id);
  const defaultLanguage = useDefaultLanguage();
  const extraLanguages = useExtraLanguages();
  const languageKey = [defaultLanguage, ...extraLanguages].join(",");
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
      const base = paramsKey ? JSON.parse(paramsKey) : undefined;
      const languages = languageKey.split(",");
      const merged = [];
      for (const language of languages) {
        const data = await getCollectionItems(type, {
          ...base,
          ...(language === languages[0] ? {} : { language }),
        });
        if (Array.isArray(data)) merged.push(...data);
      }
      setItems(merged);
    } catch (err) {
      setError(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeProjectId, type, paramsKey, languageKey]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { items, loading, error, refetch: fetchItems };
}
