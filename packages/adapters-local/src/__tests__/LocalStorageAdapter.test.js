import { describe, it, beforeEach, afterEach } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
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

// C1: atomic writes are a local-FS detail of this adapter (see internal/atomic.js).
// These pin the adapter-level integration: writes round-trip with no leftover
// staging file, and list() hides orphan atomic tmps from a crashed write so the
// adapter-agnostic services upstream never see them.
describe("LocalStorageAdapter atomic writes (C1)", () => {
  function makeAdapterWithRoot() {
    const dataRoot = mkdtempSync(path.join(tmpdir(), "wz-storage-"));
    roots.push(dataRoot);
    return { adapter: new LocalStorageAdapter({ dataRoot }), dataRoot };
  }

  const scope = makeScope("atomic");

  it("write() persists content with no leftover staging tmp", async () => {
    const { adapter } = makeAdapterWithRoot();
    await adapter.write(scope, "collections/rooms/deluxe.json", '{"x":1}');
    assert.equal((await adapter.read(scope, "collections/rooms/deluxe.json")).toString(), '{"x":1}');
    assert.deepEqual(await adapter.list(scope, "collections/rooms"), ["deluxe.json"]);
  });

  it("list() hides an orphan atomic tmp left by a crashed write", async () => {
    const { adapter, dataRoot } = makeAdapterWithRoot();
    await adapter.write(scope, "collections/rooms/standard.json", "{}");
    // Simulate a crash between tmp-write and rename: an orphan staging file.
    const dir = path.join(dataRoot, "projects", scope.folderName, "collections", "rooms");
    writeFileSync(path.join(dir, "deluxe.3f2504e0-4f89-41d3-9a0c-0305e82c3301.tmp"), "partial");
    assert.deepEqual((await adapter.list(scope, "collections/rooms")).sort(), ["standard.json"]);
  });
});

describe("LocalStorageAdapter getProjectBase", () => {
  it("returns the root that write() resolves against", async () => {
    const dataRoot = mkdtempSync(path.join(tmpdir(), "wz-storage-"));
    roots.push(dataRoot);
    const adapter = new LocalStorageAdapter({ dataRoot });
    const scope = makeScope("base");
    await adapter.write(scope, "pages/home.json", "{}");
    assert.equal(existsSync(path.join(adapter.getProjectBase(scope), "pages", "home.json")), true);
  });
});
