import fs from "fs/promises";
import path from "path";
import { assertWithin } from "./internal/paths.js";
import { writeFileAtomic, isAtomicTmpFile } from "./internal/atomic.js";

/**
 * OSS StorageAdapter — project content as whole files under
 * `${dataRoot}/projects/${folderName}/`. Implements the StorageAdapter
 * contract from @widgetizer/core/adapters.
 */
export class LocalStorageAdapter {
  /** @param {{ dataRoot: string }} opts */
  constructor({ dataRoot }) {
    if (!dataRoot) throw new Error("LocalStorageAdapter requires a dataRoot");
    this.dataRoot = dataRoot;
  }

  #projectBase(scope) {
    return path.resolve(this.dataRoot, "projects", scope.folderName);
  }

  /**
   * Absolute path to the project's working directory — the root read/write/list
   * resolve against. Part of the StorageAdapter contract (see @widgetizer/core/adapters;
   * mirrors hosted's CloudStorageAdapter.getProjectBase).
   * @param {{ folderName: string }} scope
   * @returns {string}
   */
  getProjectBase(scope) {
    return this.#projectBase(scope);
  }

  #resolve(scope, relativePath) {
    const base = this.#projectBase(scope);
    const resolved = path.resolve(base, relativePath);
    assertWithin(base, resolved);
    return resolved;
  }

  async read(scope, relativePath) {
    try {
      return await fs.readFile(this.#resolve(scope, relativePath));
    } catch (err) {
      if (err.code === "ENOENT") return null;
      throw err;
    }
  }

  async write(scope, relativePath, content) {
    const target = this.#resolve(scope, relativePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    // Atomic write (temp-file + rename) so a crash can't truncate a half-written
    // item/_order.json. The contract doesn't require atomicity; it's a local-FS
    // robustness detail confined to this adapter (cloud PUTs are already atomic).
    await writeFileAtomic(target, content);
  }

  async delete(scope, relativePath) {
    await fs.rm(this.#resolve(scope, relativePath), { force: true });
  }

  async list(scope, relativeDir) {
    try {
      const names = await fs.readdir(this.#resolve(scope, relativeDir));
      // Hide orphan atomic staging files (a crashed write between tmp-write and
      // rename) so upstream readers never see them as spurious entries.
      return names.filter((name) => !isAtomicTmpFile(name));
    } catch (err) {
      if (err.code === "ENOENT") return [];
      throw err;
    }
  }

  async exists(scope, relativePath) {
    try {
      await fs.access(this.#resolve(scope, relativePath));
      return true;
    } catch {
      return false;
    }
  }

  async stat(scope, relativePath) {
    try {
      const s = await fs.stat(this.#resolve(scope, relativePath));
      return { size: s.size, mtime: s.mtime };
    } catch (err) {
      if (err.code === "ENOENT") return null;
      throw err;
    }
  }
}
