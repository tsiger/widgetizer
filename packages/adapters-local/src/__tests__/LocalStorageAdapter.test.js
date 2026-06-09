import { describe, it, beforeEach, afterEach } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { runStorageAdapterConformance } from "@widgetizer/core/test-helpers/storage";
import { LocalStorageAdapter } from "../LocalStorageAdapter.js";

// Each makeAdapter() call gets a fresh tmp dataRoot; scopes map to distinct
// folderNames so the isolation tests are meaningful.
let roots = [];

function makeAdapter() {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "wz-storage-"));
  roots.push(dataRoot);
  return new LocalStorageAdapter({ dataRoot });
}

function makeScope(id) {
  return {
    actor: { id: "default", kind: "local" },
    projectId: `project-${id}`,
    folderName: `folder-${id}`,
  };
}

beforeEach(() => {
  roots = [];
});

afterEach(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});

runStorageAdapterConformance({
  describe,
  it,
  assert,
  name: "LocalStorageAdapter",
  makeAdapter,
  makeScope,
});
