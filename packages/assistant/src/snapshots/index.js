import crypto from "node:crypto";
import zlib from "node:zlib";
import { promisify } from "node:util";
import { contentDigest, readContentFiles, siteFingerprint } from "./siteState.js";
import { libraryKeys } from "./assets.js";

export { contentDigest, siteFingerprint, listContentKeys, canonicalJson } from "./siteState.js";
export { createAssetLedger, libraryKeys } from "./assets.js";

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export const SNAPSHOT_FORMAT = 1;
export const SNAPSHOT_ID = /^[0-9]{13}-[a-f0-9]{8}$/;
const DEFAULT_LIMITS = { count: 10, bytes: 200 * 1024 * 1024 };

export class SnapshotError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.code = code;
    Object.assign(this, details);
  }
}

async function pack({ manifest, files, rows }) {
  const body = { format: SNAPSHOT_FORMAT, manifest, rows, files: {} };
  for (const [key, bytes] of files) body.files[key] = bytes.toString("base64");
  return gzip(Buffer.from(JSON.stringify(body)));
}

async function unpack(bytes) {
  let body;
  try {
    body = JSON.parse((await gunzip(bytes)).toString("utf8"));
  } catch (error) {
    throw new SnapshotError("SNAPSHOT_UNREADABLE", "The saved copy of this site can't be read.", { cause: error });
  }
  if (body?.format !== SNAPSHOT_FORMAT || !body.manifest || !body.rows || typeof body.files !== "object") {
    throw new SnapshotError("SNAPSHOT_UNREADABLE", "The saved copy of this site is in a format this version can't read.");
  }
  const files = new Map(Object.entries(body.files).map(([key, data]) => [key, Buffer.from(data, "base64")]));
  if (contentDigest(files, body.rows) !== body.manifest.contentDigest) {
    throw new SnapshotError("SNAPSHOT_UNREADABLE", "The saved copy of this site is damaged.");
  }
  return { manifest: body.manifest, files, rows: body.rows };
}

/**
 * Saved copies of a site's content files and rows, for undoing an assistant job.
 * Callers hold the site's content-write section around `capture` and `restore`.
 *
 * @param {{
 *   storage: object,
 *   assetStorage: object,
 *   rows: { read: (scope) => object, replace: (scope, rows) => void },
 *   generations: { get: (projectId: string) => object },
 *   assets: ReturnType<typeof import("./assets.js").createAssetLedger>,
 *   store: { put: Function, get: Function, delete: Function, list: Function },
 *   rebuildUsage: (scope) => Promise<{ skipped?: object[] }>,
 *   now?: () => number,
 *   limits?: { count: number, bytes: number },
 * }} deps
 */
export function createSnapshots({ storage, rows, generations, assets, store, rebuildUsage, now = Date.now, limits = DEFAULT_LIMITS }) {
  const neededCache = new Map();

  async function neededHashes(scope) {
    if (neededCache.has(scope.projectId)) return neededCache.get(scope.projectId);
    const needed = new Set();
    for (const entry of await store.list(scope)) {
      const manifest = await load(scope, entry.id).then((snapshot) => snapshot.manifest).catch(() => null);
      for (const sha of Object.values(manifest?.library ?? {})) if (sha) needed.add(sha);
    }
    neededCache.set(scope.projectId, needed);
    return needed;
  }
  assets.setNeeded(neededHashes);

  async function readState(scope) {
    const files = await readContentFiles(storage, scope);
    const siteRows = await rows.read(scope);
    return { files, rows: siteRows, digest: contentDigest(files, siteRows) };
  }

  // What Undo compares: the saved content and rows, the bytes of every library file, and theme updates.
  async function fingerprintOf(scope, state) {
    const library = await assets.describe(scope, state.rows);
    const { theme } = await generations.get(scope.projectId);
    return { library, fingerprint: siteFingerprint(state.digest, { theme, library }) };
  }

  async function load(scope, id) {
    if (!SNAPSHOT_ID.test(String(id))) throw new SnapshotError("SNAPSHOT_UNREADABLE", "That saved copy doesn't exist.");
    const bytes = await store.get(scope, id);
    if (!bytes) throw new SnapshotError("SNAPSHOT_MISSING", "The saved copy of this site is gone.");
    const snapshot = await unpack(bytes);
    if (snapshot.manifest.projectId !== scope.projectId) {
      throw new SnapshotError("SNAPSHOT_WRONG_SITE", "That saved copy belongs to another site.");
    }
    return snapshot;
  }

  return {
    async fingerprint(scope) {
      return (await fingerprintOf(scope, await readState(scope))).fingerprint;
    },

    async capture(scope) {
      const state = await readState(scope);
      const { library, fingerprint } = await fingerprintOf(scope, state);
      const id = `${String(now()).padStart(13, "0")}-${crypto.randomBytes(4).toString("hex")}`;
      const manifest = {
        id,
        projectId: scope.projectId,
        created: new Date(now()).toISOString(),
        theme: state.rows.project?.theme ?? null,
        themeVersion: state.rows.project?.theme_version ?? null,
        contentDigest: state.digest,
        themeGeneration: (await generations.get(scope.projectId)).theme,
        library,
        fingerprint,
        missingAssets: Object.keys(library).filter((key) => !library[key]),
        files: state.files.size,
      };
      const bytes = await pack({ manifest, files: state.files, rows: state.rows });
      await store.put(scope, id, bytes);
      const stored = await store.get(scope, id);
      if (!stored || !stored.equals(bytes)) {
        throw new SnapshotError("SNAPSHOT_UNVERIFIED", "The copy of this site couldn't be saved.");
      }
      await unpack(stored);
      neededCache.delete(scope.projectId);
      return { id, manifest };
    },

    /** Checks everything before the first change, then puts the site back. Safe to run again after a crash. */
    async restore(scope, id) {
      const snapshot = await load(scope, id);
      const current = await rows.read(scope);
      if (!current?.project) throw new SnapshotError("SNAPSHOT_WRONG_SITE", "This site no longer exists.");
      const { theme, theme_version: themeVersion } = snapshot.rows.project;
      if (current.project.theme !== theme || current.project.theme_version !== themeVersion) {
        throw new SnapshotError("THEME_CHANGED", "The site's theme was updated after this copy was saved.");
      }
      if ((await generations.get(scope.projectId)).theme !== snapshot.manifest.themeGeneration) {
        throw new SnapshotError("SITE_CHANGED", "The site's theme files changed after this copy was saved.");
      }
      const library = snapshot.manifest.library ?? {};
      const missing = await assets.unavailable(scope, library);
      if (missing.length) {
        throw new SnapshotError("ASSETS_MISSING", "Some images or files this copy needs are gone.", { missing });
      }
      const libraryNow = libraryKeys(current);

      const present = await readContentFiles(storage, scope);
      for (const [key, bytes] of snapshot.files) {
        if (!present.get(key)?.equals(bytes)) await storage.write(scope, key, bytes);
      }
      for (const key of present.keys()) {
        if (!snapshot.files.has(key)) await storage.delete(scope, key);
      }
      await assets.restore(scope, library, libraryNow);
      await rows.replace(scope, snapshot.rows);
      const usage = await rebuildUsage(scope);

      const after = await readState(scope);
      const { fingerprint } = await fingerprintOf(scope, after);
      if (after.digest !== snapshot.manifest.contentDigest || fingerprint !== snapshot.manifest.fingerprint) {
        throw new SnapshotError("RESTORE_MISMATCH", "The site couldn't be put back exactly as it was.");
      }
      return { manifest: snapshot.manifest, usageIncomplete: Boolean(usage?.skipped?.length) };
    },

    async discard(scope, id) {
      await store.delete(scope, id);
      neededCache.delete(scope.projectId);
    },

    async manifest(scope, id) {
      return (await load(scope, id)).manifest;
    },

    /**
     * Keeps the newest copies within the count and size limits (held media bytes count too), and every
     * id in `protect`; then drops held bytes no kept copy needs.
     */
    async prune(scope, { protect = [] } = {}) {
      const kept = new Set(protect);
      const removed = [];
      const reclaim = async () => {
        neededCache.delete(scope.projectId);
        await assets.purge(scope, await neededHashes(scope));
      };
      const entries = (await store.list(scope)).sort((a, b) => b.id.localeCompare(a.id));
      let count = 0;
      let bytes = 0;
      const keep = [];
      for (const [index, entry] of entries.entries()) {
        const within = count < limits.count && bytes + entry.size <= limits.bytes;
        if (index === 0 || kept.has(entry.id) || within) {
          count += 1;
          bytes += entry.size;
          keep.push(entry);
          continue;
        }
        await store.delete(scope, entry.id);
        removed.push(entry.id);
      }
      await reclaim();
      for (;;) {
        const archives = keep.reduce((sum, entry) => sum + entry.size, 0);
        if (archives + (await assets.heldBytes(scope)) <= limits.bytes) break;
        const oldest = keep.findLast((entry, index) => index > 0 && !kept.has(entry.id));
        if (!oldest) break;
        keep.splice(keep.indexOf(oldest), 1);
        await store.delete(scope, oldest.id);
        removed.push(oldest.id);
        await reclaim();
      }
      return removed;
    },
  };
}
