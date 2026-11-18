import { useEffect, useState } from "react";
import { getProjectLimits } from "../queries/limitsManager";
import useProjectStore from "../stores/projectStore";

const BYTES_PER_MB = 1024 * 1024;
const CACHE_DURATION = 60000;
const cache = new Map(); // projectId -> { limits, at }
const inFlight = new Map(); // projectId -> promise

function loadLimits(projectId) {
  const hit = cache.get(projectId);
  if (hit && Date.now() - hit.at < CACHE_DURATION) return Promise.resolve(hit.limits);
  if (!inFlight.has(projectId)) {
    inFlight.set(
      projectId,
      getProjectLimits().then(
        (limits) => {
          inFlight.delete(projectId);
          const normalized = { maxUploadBytes: Number.isFinite(limits?.maxUploadBytes) ? limits.maxUploadBytes : null };
          cache.set(projectId, { limits: normalized, at: Date.now() });
          return normalized;
        },
        (error) => {
          inFlight.delete(projectId);
          throw error;
        },
      ),
    );
  }
  return inFlight.get(projectId);
}

/** The limit as the drop zones word it: "50MB", "0.5MB". */
export function formatLimitMB(bytes) {
  return `${Number((bytes / BYTES_PER_MB).toFixed(1))}MB`;
}

/**
 * The active project's upload limit, from `GET /limits`.
 *
 * `maxUploadBytes` is the largest single file, null when there is no limit.
 * It is also null until the limit has loaded (or when it cannot be loaded):
 * the browser then checks nothing and the server's answer is the final word.
 * `maxSizeMB` is the same limit for the size checks that take megabytes.
 *
 * @returns {{ maxUploadBytes: number|null, maxSizeMB: number|null, loaded: boolean }}
 */
export default function useProjectLimits() {
  const projectId = useProjectStore((state) => state.activeProject?.id ?? null);
  const [state, setState] = useState({ projectId: null, limits: null });

  useEffect(() => {
    if (!projectId) return undefined;
    let current = true;
    loadLimits(projectId)
      .then((limits) => current && setState({ projectId, limits }))
      .catch((error) => {
        console.error("Could not load the project's limits:", error);
      });
    return () => {
      current = false;
    };
  }, [projectId]);

  const limits = state.projectId === projectId ? state.limits : null;
  const maxUploadBytes = limits?.maxUploadBytes ?? null;
  return {
    maxUploadBytes,
    maxSizeMB: maxUploadBytes == null ? null : maxUploadBytes / BYTES_PER_MB,
    loaded: limits != null,
  };
}
