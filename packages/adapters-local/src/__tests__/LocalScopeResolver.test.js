import { describe, it, expect } from "vitest";
import assert from "node:assert/strict";
import { runScopeResolverConformance } from "@widgetizer/core/test-helpers/scope-resolver";
import { NotFoundError } from "@widgetizer/core/errors";
import { LocalScopeResolver, LocalPreviewScopeResolver } from "../LocalScopeResolver.js";
import { makeDb, seedProject, setActiveProject } from "./helpers.js";

function makeResolver() {
  const db = makeDb();
  seedProject(db, { id: "proj-1", folderName: "my-site" });
  setActiveProject(db, "proj-1");
  return { resolver: new LocalScopeResolver(db), req: {} };
}

runScopeResolverConformance({
  describe,
  it,
  assert,
  name: "LocalScopeResolver",
  makeResolver,
});

describe("LocalScopeResolver (impl-specific)", () => {
  it("resolves the singleton active project", async () => {
    const { resolver } = makeResolver();
    const scope = await resolver.resolveScope({});
    expect(scope.projectId).toBe("proj-1");
    expect(scope.folderName).toBe("my-site");
    expect(scope.actor).toEqual({ id: "default", kind: "local" });
  });

  it("throws NotFoundError when no project is active", async () => {
    const db = makeDb();
    const resolver = new LocalScopeResolver(db);
    await expect(resolver.resolveScope({})).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError when the active project row is missing", async () => {
    const db = makeDb();
    setActiveProject(db, "ghost");
    const resolver = new LocalScopeResolver(db);
    await expect(resolver.resolveScope({})).rejects.toBeInstanceOf(NotFoundError);
  });

  it("LocalPreviewScopeResolver behaves as the singleton resolver in OSS", async () => {
    const db = makeDb();
    seedProject(db, { id: "proj-1", folderName: "my-site" });
    setActiveProject(db, "proj-1");
    const resolver = new LocalPreviewScopeResolver(db);
    const scope = await resolver.resolveScope({});
    expect(scope.projectId).toBe("proj-1");
  });
});
