import { useState, useEffect } from "react";
import { getAllPages } from "../queries/pageManager";
import { getCollectionSchemas, getCollectionItems } from "../queries/collectionManager";
import useProjectStore from "../stores/projectStore";

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
const cache = new Map(); // projectId -> { data, time }
const inflight = new Map(); // projectId -> Promise

/**
 * Drop cached link targets so the next load refetches. Call after creating,
 * renaming, or deleting a page or collection item, so a new target shows in the
 * picker immediately instead of after the cache TTL.
 * @param {string} [projectId] - Clear only this project, or all when omitted.
 */
export function invalidateLinkTargetsCache(projectId) {
  if (projectId) {
    cache.delete(projectId);
    inflight.delete(projectId);
  } else {
    cache.clear();
    inflight.clear();
  }
}

/** Case-insensitive label sort for a predictable, human-friendly picker. */
const byLabel = (a, b) => String(a.label).localeCompare(String(b.label), undefined, { sensitivity: "base" });

const groupLabel = (schema) => schema.displayNamePlural || schema.displayName || schema.type;

async function loadTargets() {
  // Pages group, A–Z. The picker order is independent of any collection's own
  // `defaultSort` — link targets read best alphabetically.
  const pages = await getAllPages();
  const options = pages
    .map((p) => ({ value: p.uuid, label: p.name, slug: p.slug, isPage: true, group: "Pages" }))
    .sort(byLabel);

  try {
    // Collection groups by display name A–Z, items A–Z within each group.
    const schemas = (await getCollectionSchemas()).filter((s) => s.hasItemPages);
    schemas.sort((a, b) => byLabel({ label: groupLabel(a) }, { label: groupLabel(b) }));

    for (const schema of schemas) {
      const items = await getCollectionItems(schema.type);
      const itemOptions = items
        .filter((it) => it.uuid)
        .map((it) => ({
          value: it.uuid,
          label: it.title || it.slug,
          isCollectionItem: true,
          collectionType: schema.type,
          slugPrefix: schema.slugPrefix,
          slug: it.slug,
          group: groupLabel(schema),
        }))
        .sort(byLabel);
      options.push(...itemOptions);
    }
  } catch (err) {
    console.error("Failed to load collection items for link targets:", err);
  }

  return options;
}

export default function useLinkTargets() {
  const activeProjectId = useProjectStore((state) => state.activeProject?.id);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!activeProjectId) {
      setOptions([]);
      setLoading(false);
      return undefined;
    }

    const cached = cache.get(activeProjectId);
    if (cached && Date.now() - cached.time < CACHE_DURATION) {
      setOptions(cached.data);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    let promise = inflight.get(activeProjectId);
    if (!promise) {
      promise = (async () => {
        try {
          const data = await loadTargets();
          cache.set(activeProjectId, { data, time: Date.now() });
          return data;
        } finally {
          inflight.delete(activeProjectId);
        }
      })();
      inflight.set(activeProjectId, promise);
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
  }, [activeProjectId]);

  return { options, loading };
}
