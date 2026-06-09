import { describe, it, expect, afterEach } from "vitest";
import assert from "node:assert/strict";
import { rmSync, readFileSync } from "node:fs";
import path from "node:path";
import { runPublishAdapterConformance } from "@widgetizer/core/test-helpers/publish";
import { LocalPublishAdapter } from "../LocalPublishAdapter.js";
import { makeDb, tmpDataRoot } from "./helpers.js";

let roots = [];

function makeAdapter() {
  const dataRoot = tmpDataRoot();
  roots.push(dataRoot);
  return new LocalPublishAdapter({ dataRoot, db: makeDb() });
}

function makeScope(id) {
  return {
    actor: { id: "default", kind: "local" },
    projectId: `project-${id}`,
    folderName: `folder-${id}`,
  };
}

afterEach(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
  roots = [];
});

runPublishAdapterConformance({
  describe,
  it,
  assert,
  name: "LocalPublishAdapter",
  makeAdapter,
  makeScope,
});

describe("LocalPublishAdapter (impl-specific)", () => {
  async function* stream(files) {
    for (const f of files) yield f;
  }

  it("writes files to disk and records an exports row", async () => {
    const dataRoot = tmpDataRoot();
    roots.push(dataRoot);
    const db = makeDb();
    const adapter = new LocalPublishAdapter({ dataRoot, db });
    const scope = makeScope("a");

    const result = await adapter.publish(
      scope,
      stream([{ path: "index.html", content: "<h1>hi</h1>" }]),
    );

    const written = readFileSync(path.join(result.meta.outputDir, "index.html"), "utf8");
    expect(written).toBe("<h1>hi</h1>");

    const row = db
      .prepare("SELECT * FROM exports WHERE project_id = ? AND version = ?")
      .get(scope.projectId, result.version);
    expect(row.status).toBe("success");
    expect(row.output_dir).toBe(result.meta.outputDir);
  });
});
