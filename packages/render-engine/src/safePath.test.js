// The engine opens files at paths built from values it does not control — a
// widget's `type` comes straight out of page JSON. resolveInside is what keeps
// those reads inside the roots the caller supplied, against both `..` and
// symlinks (containment on strings cannot see where a link points).
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { resolveInside } from "./safePath.js";

let root;
let projectDir;
let outsideFile;

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "wz-safepath-"));
  projectDir = path.join(root, "projects", "mine");
  mkdirSync(path.join(projectDir, "widgets", "hero"), { recursive: true });
  writeFileSync(path.join(projectDir, "widgets", "hero", "widget.liquid"), "MINE");

  // A neighbouring project, standing in for another tenant.
  const other = path.join(root, "projects", "theirs", "widgets", "hero");
  mkdirSync(other, { recursive: true });
  writeFileSync(path.join(other, "widget.liquid"), "THEIRS");

  outsideFile = path.join(root, "secret.txt");
  writeFileSync(outsideFile, "SECRET");
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("resolveInside", () => {
  it("resolves an ordinary path under the base", async () => {
    const got = await resolveInside(projectDir, "widgets", "hero", "widget.liquid");
    expect(got).toBe(path.join(projectDir, "widgets", "hero", "widget.liquid"));
  });

  it("returns a contained path for a file that does not exist yet", async () => {
    // Missing widget templates are normal — the caller's own read must be what
    // fails, so the usual "template not found" placeholder still renders.
    const got = await resolveInside(projectDir, "widgets", "nope", "widget.liquid");
    expect(got).toBe(path.join(projectDir, "widgets", "nope", "widget.liquid"));
  });

  it("rejects traversal out of the base — the live widget-type case", async () => {
    expect(await resolveInside(projectDir, "widgets", "../../theirs/widgets/hero", "widget.liquid")).toBeNull();
    expect(await resolveInside(projectDir, "widgets", "..", "..", "secret.txt")).toBeNull();
  });

  it("rejects an absolute segment", async () => {
    expect(await resolveInside(projectDir, "widgets", "/etc", "widget.liquid")).toBeNull();
  });

  it("rejects the base itself (a directory is never a template)", async () => {
    expect(await resolveInside(projectDir, ".")).toBeNull();
  });

  it("rejects a symlinked file pointing out of the base", async () => {
    symlinkSync(outsideFile, path.join(projectDir, "widgets", "hero", "linked.liquid"));
    expect(await resolveInside(projectDir, "widgets", "hero", "linked.liquid")).toBeNull();
  });

  it("rejects a path behind a symlinked directory", async () => {
    symlinkSync(path.join(root, "projects", "theirs", "widgets"), path.join(projectDir, "borrowed"));
    expect(await resolveInside(projectDir, "borrowed", "hero", "widget.liquid")).toBeNull();
  });

  it("allows a symlink that stays inside the base", async () => {
    const alias = path.join(projectDir, "widgets", "hero", "alias.liquid");
    symlinkSync(path.join(projectDir, "widgets", "hero", "widget.liquid"), alias);
    // The path asked for, not the link's target: resolution validates only.
    expect(await resolveInside(projectDir, "widgets", "hero", "alias.liquid")).toBe(alias);
  });

  it("tolerates a symlinked base — data dirs are allowed to be mount points", async () => {
    const linkedRoot = path.join(root, "linked-project");
    symlinkSync(projectDir, linkedRoot);
    const got = await resolveInside(linkedRoot, "widgets", "hero", "widget.liquid");
    expect(got).toBe(path.join(linkedRoot, "widgets", "hero", "widget.liquid"));
  });

  it("returns null for a missing base rather than throwing", async () => {
    expect(await resolveInside(undefined, "x")).toBeNull();
  });
});
