import { describe, it, beforeEach, afterEach } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readdirSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { writeFileAtomic, isAtomicTmpFile } from "../internal/atomic.js";

// writeFileAtomic stages to a UUID-suffixed tmp then renames, so a reader never
// sees a partial write and concurrent writers never collide on a shared tmp name.
// isAtomicTmpFile is the reader-side filter the adapter's list() uses to hide
// orphan tmps left by a process that died between the tmp-write and the rename.
let root;
beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "wz-atomic-"));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

const tmpFilesIn = (dir) => readdirSync(dir).filter((n) => n.endsWith(".tmp"));

describe("writeFileAtomic", () => {
  it("writes the content to the target and leaves no tmp file behind", async () => {
    const target = path.join(root, "basic.json");
    await writeFileAtomic(target, '{"hello":"world"}');
    assert.equal(readFileSync(target, "utf8"), '{"hello":"world"}');
    assert.deepEqual(tmpFilesIn(root), []);
  });

  it("overwrites an existing target (latest content wins)", async () => {
    const target = path.join(root, "overwrite.json");
    await writeFileAtomic(target, "v1");
    await writeFileAtomic(target, "v2-longer");
    assert.equal(readFileSync(target, "utf8"), "v2-longer");
    assert.deepEqual(tmpFilesIn(root), []);
  });

  it("handles concurrent writes to the same target without collision (one full payload wins, no orphan tmp)", async () => {
    const target = path.join(root, "item.json");
    const payloads = Array.from({ length: 12 }, (_, i) => `writer-${i}`);
    await assert.doesNotReject(Promise.all(payloads.map((p) => writeFileAtomic(target, p))));
    assert.ok(payloads.includes(readFileSync(target, "utf8")), "final content is exactly one writer's full payload");
    assert.deepEqual(tmpFilesIn(root), [], "no orphan tmp files after concurrent writes");
  });

  it("rejects when the target directory does not exist and leaves nothing behind", async () => {
    const missingDir = path.join(root, "nope");
    await assert.rejects(writeFileAtomic(path.join(missingDir, "x.json"), "data"));
    assert.equal(existsSync(missingDir), false);
  });
});

describe("isAtomicTmpFile", () => {
  it("matches a UUID-suffixed tmp filename", () => {
    assert.equal(isAtomicTmpFile("item.json.3f2504e0-4f89-41d3-9a0c-0305e82c3301.tmp"), true);
    assert.equal(isAtomicTmpFile("_order.json.3f2504e0-4f89-41d3-9a0c-0305e82c3301.tmp"), true);
  });

  it("does not match normal data files", () => {
    assert.equal(isAtomicTmpFile("item.json"), false);
    assert.equal(isAtomicTmpFile("_order.json"), false);
  });

  it("does not match a non-UUID .tmp file", () => {
    assert.equal(isAtomicTmpFile("item.json.tmp"), false);
    assert.equal(isAtomicTmpFile("random.tmp"), false);
  });
});
