import crypto from "node:crypto";

async function readAll(source) {
  if (source == null) return null;
  if (Buffer.isBuffer(source)) return source;
  const chunks = [];
  for await (const chunk of source) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const assetKeyOf = (mediaPath) => String(mediaPath).replace(/^\/uploads\//, "");

/** Every file a site's media rows point to: originals and their generated sizes. */
export function libraryKeys(rows) {
  const keys = new Set();
  for (const file of rows.media ?? []) {
    if (file.path) keys.add(assetKeyOf(file.path));
    for (const size of file.sizes ?? []) if (size.path) keys.add(assetKeyOf(size.path));
  }
  return [...keys].sort();
}

/**
 * Which bytes a site's media files hold, and a place to keep old bytes when a file is
 * deleted or replaced, so a restore can put the library back exactly. Storage-neutral:
 * the held bytes live wherever the injected hold store keeps them.
 *
 * @param {{ assetStorage: object, holdStore: { put: Function, get: Function, has: Function, list: Function, delete: Function, size: Function } }} deps
 *   `assetStorage` is the undecorated adapter.
 */
export function createAssetLedger({ assetStorage, holdStore }) {
  const hashes = new Map();
  const cacheKey = (scope, key) => `${scope.projectId}\0${key}`;
  let neededBy = async () => new Set();

  async function verifiedHeld(scope, sha) {
    const bytes = await holdStore.get(scope, sha);
    return bytes && sha256(bytes) === sha ? bytes : null;
  }

  async function hash(scope, key) {
    const stat = await Promise.resolve(assetStorage.stat(scope, key)).catch(() => null);
    if (!stat) return null;
    const cached = hashes.get(cacheKey(scope, key));
    if (cached && cached.size === stat.size) return cached.sha;
    const bytes = await readAll(await assetStorage.download(scope, key));
    if (!bytes) return null;
    const sha = sha256(bytes);
    hashes.set(cacheKey(scope, key), { size: bytes.length, sha });
    return sha;
  }

  return {
    hash,

    forget(scope, key) {
      hashes.delete(cacheKey(scope, key));
    },

    /** Which held bytes still matter: the snapshots module answers with the hashes its kept copies record. */
    setNeeded(fn) {
      neededBy = fn;
    },

    /** Keep the file's current bytes before it is deleted or replaced, when a kept copy of the site needs them. */
    async hold(scope, key) {
      const bytes = await readAll(await Promise.resolve(assetStorage.download(scope, key)).catch(() => null));
      if (!bytes) return;
      const sha = sha256(bytes);
      if (!(await neededBy(scope)).has(sha)) return;
      if (!(await verifiedHeld(scope, sha))) await holdStore.put(scope, sha, bytes);
    },

    async heldBytes(scope) {
      let total = 0;
      for (const sha of await holdStore.list(scope)) total += await holdStore.size(scope, sha);
      return total;
    },

    /** The library as it is: every recorded file with the hash of its bytes (null when missing). */
    async describe(scope, rows) {
      const assets = {};
      for (const key of libraryKeys(rows)) assets[key] = await hash(scope, key);
      return assets;
    },

    /** Files whose recorded bytes are neither live nor held. */
    async unavailable(scope, assets) {
      const missing = [];
      for (const [key, sha] of Object.entries(assets)) {
        if (!sha || (await hash(scope, key)) === sha) continue;
        if (!(await verifiedHeld(scope, sha))) missing.push(key);
      }
      return missing;
    },

    /** Put recorded files back, and remove library files the snapshot didn't have. */
    async restore(scope, assets, currentKeys) {
      for (const [key, sha] of Object.entries(assets)) {
        if (!sha || (await hash(scope, key)) === sha) continue;
        const bytes = await verifiedHeld(scope, sha);
        if (!bytes) throw Object.assign(new Error(`The held copy of ${key} is gone or damaged.`), { code: "ASSETS_MISSING" });
        await assetStorage.upload(scope, key, bytes);
        hashes.delete(cacheKey(scope, key));
      }
      for (const key of currentKeys) {
        if (Object.hasOwn(assets, key)) continue;
        await assetStorage.delete(scope, key);
        hashes.delete(cacheKey(scope, key));
      }
    },

    /** Drop held bytes no kept snapshot needs. */
    async purge(scope, needed) {
      for (const sha of await holdStore.list(scope)) {
        if (!needed.has(sha)) await holdStore.delete(scope, sha);
      }
    },
  };
}
