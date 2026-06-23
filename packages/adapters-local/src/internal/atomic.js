// Atomic local-FS writes (Collections spec §15), kept as a local-adapter detail.
//
// Write to a UUID-suffixed tmp file in the same directory, then rename onto the
// target. Rename is atomic on Linux/macOS and (same-volume) Windows, so a reader
// sees either the old file or the complete new one — never a half-written file.
// The unique tmp suffix means concurrent writes to the same target each get a
// private staging file instead of colliding on a shared `${target}.tmp`.

import fs from "fs/promises";
import { randomUUID } from "node:crypto";

// Matches a tmp file produced by writeFileAtomic: "<name>.<uuid-v4>.tmp".
// LocalStorageAdapter.list() uses this to hide orphan tmps left by a process
// that died after creating the tmp but before the rename.
const ATOMIC_TMP_RE = /\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.tmp$/i;

/**
 * @param {string} filename - a bare filename or path
 * @returns {boolean} true if it is an atomic-write tmp file
 */
export function isAtomicTmpFile(filename) {
  return ATOMIC_TMP_RE.test(filename);
}

/**
 * Atomically write `content` to `targetPath`. The target directory must already
 * exist (the caller mkdir's it). Leaves no staging file behind, even on error.
 *
 * @param {string} targetPath - destination file path
 * @param {string|Buffer} content
 * @returns {Promise<void>}
 */
export async function writeFileAtomic(targetPath, content) {
  const tmpPath = `${targetPath}.${randomUUID()}.tmp`;
  try {
    // "wx" fails if tmpPath somehow already exists (guards an unlucky UUID clash).
    await fs.writeFile(tmpPath, content, { flag: "wx" });
    await fs.rename(tmpPath, targetPath);
  } finally {
    // After a successful rename the tmp is gone (no-op); on any error this
    // removes the orphan staging file so tmps never leak.
    await fs.rm(tmpPath, { force: true }).catch(() => {});
  }
}
