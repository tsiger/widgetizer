import fs from "fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import path from "path";
import { getContentType } from "@widgetizer/core/mimeTypes";
import { assertWithin } from "./internal/paths.js";

function contentTypeFor(key) {
  return getContentType(path.extname(key).toLowerCase());
}

/**
 * OSS AssetStorageAdapter — media binaries under
 * `${dataRoot}/projects/${folderName}/uploads/`, served via the same URL in
 * both the editor and published contexts. Implements the AssetStorageAdapter
 * contract from @widgetizer/core/adapters.
 */
export class LocalAssetStorageAdapter {
  /** @param {{ dataRoot: string, urlBase?: string }} opts */
  constructor({ dataRoot, urlBase = "/uploads" }) {
    if (!dataRoot) throw new Error("LocalAssetStorageAdapter requires a dataRoot");
    this.dataRoot = dataRoot;
    this.urlBase = urlBase.replace(/\/$/, "");
  }

  #base(scope) {
    return path.resolve(this.dataRoot, "projects", scope.folderName, "uploads");
  }

  #resolve(scope, key) {
    const base = this.#base(scope);
    const resolved = path.resolve(base, key);
    assertWithin(base, resolved);
    return resolved;
  }

  async upload(scope, key, source) {
    const target = this.#resolve(scope, key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    if (Buffer.isBuffer(source) || typeof source === "string") {
      await fs.writeFile(target, source);
    } else {
      // Readable / async iterable
      await pipeline(source, createWriteStream(target));
    }
    const { size } = await fs.stat(target);
    return { key, sizeBytes: size, contentType: contentTypeFor(key) };
  }

  async download(scope, key, { start, end } = {}) {
    const target = this.#resolve(scope, key);
    try {
      await fs.access(target);
    } catch {
      return null;
    }
    // Optional byte range (audio/video seek → HTTP 206); full stream otherwise.
    if (Number.isInteger(start) && Number.isInteger(end)) {
      return createReadStream(target, { start, end });
    }
    return createReadStream(target);
  }

  async stat(scope, key) {
    const target = this.#resolve(scope, key);
    try {
      const { size } = await fs.stat(target);
      return { size };
    } catch {
      return null;
    }
  }

  async delete(scope, key) {
    await fs.rm(this.#resolve(scope, key), { force: true });
  }

  async list(scope, prefix = "") {
    const base = this.#base(scope);
    const keys = [];
    async function walk(dir) {
      let entries;
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch (err) {
        if (err.code === "ENOENT") return;
        throw err;
      }
      for (const entry of entries) {
        const abs = path.join(dir, entry.name);
        if (entry.isDirectory()) await walk(abs);
        else keys.push(path.relative(base, abs).split(path.sep).join("/"));
      }
    }
    await walk(base);
    return keys.filter((k) => k.startsWith(prefix)).sort();
  }

  // OSS serves media at the same URL in both contexts.
  getUrl(scope, key /* , { context } */) {
    return `${this.urlBase}/${key.split(path.sep).join("/")}`;
  }
}
