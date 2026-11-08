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
 * A load that couldn't read everything (the page list, or some collection's
 * items) reports `failed`, keeps what it did read, and isn't cached, so the next
 * picker asks again; `retry` asks again now.
 *
 * @returns {{ options: Array, loading: boolean, failed: boolean, retry: () => void }}
 */

const CACHE_DURATION = 60000; // 1 minute
const cache = new Map(); // cacheKey -> { data, time }
const inflight = new Map(); // cacheKey -> Promise
// Bumped by every invalidation. A load started before one may have read the old
// pages and items, so it must not refill the cache, or the change it missed stays
// out of the pickers until the TTL runs out.
let generation = 0;

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
  generation += 1;
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

// Every mounted picker, so Try again in one refreshes them all: they share one
// load, and a failed load isn't cached for the others to pick up.
const retryListeners = new Set();
function retryAll() {
  for (const listener of retryListeners) listener();
}

/** Case-insensitive label sort for a predictable, human-friendly picker. */
const byLabel = (a, b) => String(a.label).localeCompare(String(b.label), undefined, { sensitivity: "base" });

const groupLabel = (schema) => schema.displayNamePlural || schema.displayName || schema.type;

/** @returns {Promise<{ options: Array, complete: boolean }>} rejects when the page list can't be read */
async function loadTargets(languages, defaultLanguage) {
  // Every language, because a page may exist in only one of them (§4a) — grouped
  // language-major so a picker showing them all reads as one block per language.
  const pages = await getAllPages();

  let complete = true;
  let schemas = [];
  try {
    // Collection groups by display name A–Z, items A–Z within each group.
    schemas = (await getCollectionSchemas()).filter((s) => s.hasItemPages);
    schemas.sort((a, b) => byLabel({ label: groupLabel(a) }, { label: groupLabel(b) }));
  } catch (err) {
    console.error("Failed to load collection schemas for link targets:", err);
    complete = false;
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
        complete = false;
      }
    }
  }

  return { options, complete };
}

/**
 * One project's targets in these languages, from the cache or a load (shared
 * with any load already running for them). Sets no state, so the load effect
 * can call it.
 */
function readTargets(projectId, languageKey) {
  const key = cacheKey(projectId, languageKey);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < CACHE_DURATION) {
    return Promise.resolve({ options: cached.data, complete: true });
  }
  let promise = inflight.get(key);
  if (!promise) {
    const startedIn = generation;
    const load = (async () => {
      try {
        const languages = languageKey.split(",");
        const result = await loadTargets(languages, languages[0]);
        if (result.complete && generation === startedIn) cache.set(key, { data: result.options, time: Date.now() });
        return result;
      } finally {
        // An invalidation may have dropped this load and a newer one taken its key.
        if (inflight.get(key) === load) inflight.delete(key);
      }
    })();
    inflight.set(key, load);
    promise = load;
  }
  return promise;
}

export default function useLinkTargets() {
  const activeProjectId = useProjectStore((state) => state.activeProject?.id);
  const defaultLanguage = useDefaultLanguage();
  const extraLanguages = useExtraLanguages();
  // A string, so the effect re-runs on a language change without depending on the
  // identity of the array the store happens to hold.
  const languageKey = [defaultLanguage, ...extraLanguages].join(",");

  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(Boolean(activeProjectId));
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Another project, language set or Try again loads anew; without a project
  // there is nothing to offer. Reset while rendering, so loading shows as soon
  // as one of them changes.
  const loadKey = JSON.stringify([activeProjectId, languageKey, attempt]);
  const [loadedFor, setLoadedFor] = useState(loadKey);
  if (loadedFor !== loadKey) {
    setLoadedFor(loadKey);
    if (activeProjectId) {
      setLoading(true);
    } else {
      setOptions([]);
      setFailed(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    const listener = () => setAttempt((n) => n + 1);
    retryListeners.add(listener);
    return () => retryListeners.delete(listener);
  }, []);

  useEffect(() => {
    if (!activeProjectId) return undefined;
    let cancelled = false;

    readTargets(activeProjectId, languageKey)
      .then((result) => {
        if (cancelled) return;
        setOptions(result.options);
        setFailed(!result.complete);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load link targets:", err);
        setOptions([]);
        setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeProjectId, languageKey, attempt]);

  return { options, loading, failed, retry: retryAll };
}
