import { useState, useEffect } from "react";
import { getAllPages } from "../queries/pageManager";
import { getCollectionSchemas, getCollectionItems } from "../queries/collectionManager";
import useProjectStore, { useDefaultLanguage, useExtraLanguages } from "../stores/projectStore";

/**
 * Loads the link-target options for the active project — all pages plus the items
 * of every `hasItemPages` collection — as a flat, grouped option list the shared
 * <Combobox> renders (a "Pages" group + one group per collection). Each option
 * carries a stable `value` (uuid) so a stored reference survives renames (#11);
 * collection-item options also carry `collectionType`/`slugPrefix`/`slug`.
 *
 * Module-cached per project (mirrors useCollections) so the many LinkInputs a page
 * can host don't each refetch. The cache only affects the picker's freshness — the
 * stored ref is a uuid and the rendered href is re-derived at render time, so a
 * briefly-stale label never produces a wrong link.
 *
 * @returns {{ options: Array, loading: boolean }}
 */

const CACHE_DURATION = 60000; // 1 minute
const cache = new Map(); // cacheKey -> { data, time }
const inflight = new Map(); // cacheKey -> Promise

// The languages are part of the identity, not just the project: adding or removing
// one, or changing the default, keeps the same project id while changing every
// answer this hook gives.
const KEY_SEPARATOR = "\n";
const cacheKey = (projectId, languageKey) => `${projectId}${KEY_SEPARATOR}${languageKey}`;

/**
 * Drop cached link targets so the next load refetches. Call after creating,
 * renaming, or deleting a page or collection item, so a new target shows in the
 * picker immediately instead of after the cache TTL.
 * @param {string} [projectId] - Clear only this project, or all when omitted.
 */
export function invalidateLinkTargetsCache(projectId) {
  if (projectId) {
    const prefix = `${projectId}${KEY_SEPARATOR}`;
    for (const map of [cache, inflight]) {
      for (const key of map.keys()) {
        if (key.startsWith(prefix)) map.delete(key);
      }
    }
  } else {
    cache.clear();
    inflight.clear();
  }
}

/** Case-insensitive label sort for a predictable, human-friendly picker. */
const byLabel = (a, b) => String(a.label).localeCompare(String(b.label), undefined, { sensitivity: "base" });

const groupLabel = (schema) => schema.displayNamePlural || schema.displayName || schema.type;

async function loadTargets(languages, defaultLanguage) {
  // Every language, because a page may exist in only one of them (§4a) — grouped
  // language-major so a picker showing them all reads as one block per language.
  const pages = await getAllPages();

  let schemas = [];
  try {
    // Collection groups by display name A–Z, items A–Z within each group.
    schemas = (await getCollectionSchemas()).filter((s) => s.hasItemPages);
    schemas.sort((a, b) => byLabel({ label: groupLabel(a) }, { label: groupLabel(b) }));
  } catch (err) {
    console.error("Failed to load collection schemas for link targets:", err);
  }

  const options = [];
  for (const language of languages) {
    // Pages group, A–Z. The picker order is independent of any collection's own
    // `defaultSort` — link targets read best alphabetically.
    options.push(
      ...pages
        .filter((p) => (p.language || defaultLanguage) === language)
        .map((p) => ({ value: p.uuid, label: p.name, slug: p.slug, isPage: true, group: "Pages", language }))
        .sort(byLabel),
    );

    for (const schema of schemas) {
      try {
        // The listing is per language, so ask once per language rather than
        // changing what every other caller of it receives.
        const items = await getCollectionItems(schema.type, {
          language: language === defaultLanguage ? undefined : language,
        });
        options.push(
          ...items
            .filter((it) => it.uuid)
            .map((it) => ({
              value: it.uuid,
              label: it.title || it.slug,
              isCollectionItem: true,
              collectionType: schema.type,
              slugPrefix: schema.slugPrefix,
              slug: it.slug,
              group: groupLabel(schema),
              language,
            }))
            .sort(byLabel),
        );
      } catch (err) {
        console.error(`Failed to load ${schema.type} items for link targets:`, err);
      }
    }
  }

  return options;
}

export default function useLinkTargets() {
  const activeProjectId = useProjectStore((state) => state.activeProject?.id);
  const defaultLanguage = useDefaultLanguage();
  const extraLanguages = useExtraLanguages();
  // A string, so the effect re-runs on a language change without depending on the
  // identity of the array the store happens to hold.
  const languageKey = [defaultLanguage, ...extraLanguages].join(",");

  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!activeProjectId) {
      setOptions([]);
      setLoading(false);
      return undefined;
    }

    const key = cacheKey(activeProjectId, languageKey);
    const cached = cache.get(key);
    if (cached && Date.now() - cached.time < CACHE_DURATION) {
      setOptions(cached.data);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    let promise = inflight.get(key);
    if (!promise) {
      promise = (async () => {
        try {
          const languages = languageKey.split(",");
          const data = await loadTargets(languages, languages[0]);
          cache.set(key, { data, time: Date.now() });
          return data;
        } finally {
          inflight.delete(key);
        }
      })();
      inflight.set(key, promise);
    }

    promise
      .then((data) => {
        if (!cancelled) setOptions(data);
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeProjectId, languageKey]);

  return { options, loading };
}
