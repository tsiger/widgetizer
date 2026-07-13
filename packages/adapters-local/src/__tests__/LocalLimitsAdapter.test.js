import { describe, it, expect } from "vitest";
import assert from "node:assert/strict";
import { runLimitsAdapterConformance } from "@widgetizer/core/test-helpers/limits";
import { LIMIT_KEYS } from "@widgetizer/core/adapters";
import { LocalLimitsAdapter } from "../LocalLimitsAdapter.js";
import { makeDb } from "./helpers.js";

function makeScope(id) {
  return {
    actor: { id: "default", kind: "local" },
    projectId: `project-${id}`,
    folderName: `folder-${id}`,
  };
}

runLimitsAdapterConformance({
  describe,
  it,
  assert,
  name: "LocalLimitsAdapter",
  makeAdapter: () => new LocalLimitsAdapter(makeDb()),
  makeScope,
});

describe("LocalLimitsAdapter (impl-specific)", () => {
  it("defaults the upload size limit to 50 MB", async () => {
    const a = new LocalLimitsAdapter(makeDb());
    const bytes = await a.getLimit(makeScope("a"), LIMIT_KEYS.MAX_UPLOAD_SIZE_BYTES);
    expect(bytes).toBe(50 * 1024 * 1024);
  });

  it("reads a configured maxFileSizeMB from app_settings", async () => {
    const db = makeDb();
    db.prepare("INSERT INTO app_settings (key, value) VALUES ('config:local', ?)").run(
      JSON.stringify({ media: { maxFileSizeMB: 20 } }),
    );
    const a = new LocalLimitsAdapter(db);
    const bytes = await a.getLimit(makeScope("a"), LIMIT_KEYS.MAX_UPLOAD_SIZE_BYTES);
    expect(bytes).toBe(20 * 1024 * 1024);
  });

  it("treats single-user limits as unbounded and allows custom domains", async () => {
    const a = new LocalLimitsAdapter(makeDb());
    const scope = makeScope("a");
    expect(await a.getLimit(scope, LIMIT_KEYS.MAX_PAGES_PER_PROJECT)).toBe(Infinity);
    expect(await a.getLimit(scope, LIMIT_KEYS.CUSTOM_DOMAIN_ALLOWED)).toBe(true);
    expect(await a.getLimit(scope, LIMIT_KEYS.ANALYTICS_TIER)).toBe("none");
  });
});
