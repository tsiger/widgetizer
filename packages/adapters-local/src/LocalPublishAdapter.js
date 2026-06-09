import fs from "fs/promises";
import path from "path";
import { assertWithin } from "./internal/paths.js";

/**
 * OSS PublishAdapter — writes the rendered site to
 * `${dataRoot}/publish/${folderName}/v${N}/` and records the export in the
 * `exports` table via the injected db handle. Implements the PublishAdapter
 * contract from @widgetizer/core/adapters.
 */
export class LocalPublishAdapter {
  /** @param {{ dataRoot: string, db: import('better-sqlite3').Database }} opts */
  constructor({ dataRoot, db }) {
    if (!dataRoot) throw new Error("LocalPublishAdapter requires a dataRoot");
    if (!db) throw new Error("LocalPublishAdapter requires a db handle");
    this.dataRoot = dataRoot;
    this.db = db;
  }

  #nextVersion(projectId) {
    const row = this.db
      .prepare("SELECT MAX(version) AS maxVersion FROM exports WHERE project_id = ?")
      .get(projectId);
    return (row?.maxVersion ?? 0) + 1;
  }

  /**
   * @param {{ projectId: string, folderName: string }} scope
   * @param {AsyncIterable<{ path: string, content: Buffer | string }>} renderStream
   */
  async publish(scope, renderStream) {
    const version = this.#nextVersion(scope.projectId);
    const outputDir = path.resolve(this.dataRoot, "publish", scope.folderName, `v${version}`);
    await fs.mkdir(outputDir, { recursive: true });

    let fileCount = 0;
    let sizeBytes = 0;
    for await (const file of renderStream) {
      const target = path.resolve(outputDir, file.path);
      assertWithin(outputDir, target);
      await fs.mkdir(path.dirname(target), { recursive: true });
      const content = Buffer.isBuffer(file.content)
        ? file.content
        : Buffer.from(file.content, "utf8");
      await fs.writeFile(target, content);
      fileCount += 1;
      sizeBytes += content.byteLength;
    }

    this.db
      .prepare(
        "INSERT INTO exports (project_id, version, timestamp, output_dir, status) VALUES (?, ?, ?, ?, 'success')",
      )
      .run(scope.projectId, version, new Date().toISOString(), outputDir);

    return { version, fileCount, sizeBytes, meta: { outputDir } };
  }
}
