import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { Readable } from "node:stream";
import { runAssetStorageAdapterConformance } from "@widgetizer/core/test-helpers/asset-storage";
import { LocalAssetStorageAdapter } from "../LocalAssetStorageAdapter.js";
import { tmpDataRoot } from "./helpers.js";

let roots = [];

function makeAdapter() {
  const dataRoot = tmpDataRoot();
  roots.push(dataRoot);
  return new LocalAssetStorageAdapter({ dataRoot });
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

runAssetStorageAdapterConformance({
  describe,
  it,
  assert,
  name: "LocalAssetStorageAdapter",
  makeAdapter,
  makeScope,
  makeStream: (buffer) => Readable.from(buffer),
});
