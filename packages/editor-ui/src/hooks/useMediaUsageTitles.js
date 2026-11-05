import { useEffect, useRef, useState } from "react";
import { getAllPages } from "../queries/pageManager";
import { getCollectionSchemas, getCollectionItems } from "../queries/collectionManager";
import { buildUsageTitleMap } from "../utils/mediaUsageDisplay";

/**
 * The titles the media library's "Used in" labels show, keyed by usage source
 * (`page:<uuid>`, `collection:<uuid>`, `global:…`).
 *
 * When the page list can't be loaded the map keeps only the global labels, so
 * pages and items show as their bare sources, and `onError` is called so the
 * screen can say why.
 *
 * @param {{ project: object|null, defaultLanguage: string, languages: string[], onError: Function }} options
 * @returns {Record<string, string>}
 */
export default function useMediaUsageTitles({ project, defaultLanguage, languages, onError }) {
  const [usageTitleMap, setUsageTitleMap] = useState({});
  // The latest callback, without making a new one reload the titles.
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  });

  useEffect(() => {
    let cancelled = false;
    async function loadUsageTitles() {
      if (!project) {
        setUsageTitleMap({});
        return;
      }

      try {
        // Pages + collections feed the "Used in" labels. A collections failure
        // must not blank the page titles, so it degrades to [] independently.
        // Pages come back in every language at once; items are listed one
        // language at a time, so each language is asked for.
        const itemsIn = (type, language) =>
          getCollectionItems(type, language ? { language } : undefined)
            .then((items) =>
              Array.isArray(items) ? items.map((item) => ({ ...item, language: item.language || language })) : [],
            )
            .catch(() => []);
        const [pages, schemas] = await Promise.all([getAllPages(), getCollectionSchemas().catch(() => [])]);
        const collections = await Promise.all(
          schemas.map(async (schema) => ({
            schema,
            items: (
              await Promise.all([itemsIn(schema.type), ...languages.map((code) => itemsIn(schema.type, code))])
            ).flat(),
          })),
        );
        if (!cancelled) setUsageTitleMap(buildUsageTitleMap({ pages, collections, defaultLanguage }));
      } catch (error) {
        if (cancelled) return;
        setUsageTitleMap(buildUsageTitleMap());
        onErrorRef.current?.(error);
      }
    }

    loadUsageTitles();
    return () => {
      cancelled = true;
    };
  }, [project, defaultLanguage, languages]);

  return usageTitleMap;
}
