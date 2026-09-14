import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { planPagination } from "./renderEngine.js";

let projectDir;
let count;
const deps = () => ({ projectDir, countCollectionItems: async () => count });

const writeSchema = (type, schema) => {
  mkdirSync(path.join(projectDir, "widgets", type), { recursive: true });
  writeFileSync(path.join(projectDir, "widgets", type, "schema.json"), JSON.stringify(schema));
};

const paginating = (settings = {}, type = "news-grid") => ({ type, settings: { paginate: true, ...settings } });

beforeEach(() => {
  projectDir = mkdtempSync(path.join(tmpdir(), "wz-plan-pagination-"));
  writeSchema("news-grid", {
    collection: { type: "news", perPageSetting: "limit" },
    settings: [{ id: "limit", type: "number", default: 3 }],
  });
  writeSchema("plain-grid", { settings: [] });
  count = 7;
});

afterEach(() => rmSync(projectDir, { recursive: true, force: true }));

describe("planPagination", () => {
  it("plans the copies and keeps the current page in range", async () => {
    const widgets = { w1: paginating({ limit: 3 }) };
    const plan = await planPagination(deps(), widgets, ["w1"], { pageSlug: "blog", currentPage: 2 });
    expect(plan).toEqual({ widgetId: "w1", collectionType: "news", perPage: 3, totalItems: 7, total: 3, current: 2, pageSlug: "blog" });

    expect((await planPagination(deps(), widgets, ["w1"], { pageSlug: "blog", currentPage: 9 })).current).toBe(3);
    expect((await planPagination(deps(), widgets, ["w1"], { pageSlug: "blog", currentPage: "x" })).current).toBe(1);
  });

  it("makes exactly as many pages as an exact multiple needs", async () => {
    count = 6;
    expect((await planPagination(deps(), { w1: paginating({ limit: 3 }) }, ["w1"], { pageSlug: "blog" })).total).toBe(2);
  });

  it("plans nothing when the collection is empty or fits on one page", async () => {
    count = 0;
    expect(await planPagination(deps(), { w1: paginating({ limit: 3 }) }, ["w1"], { pageSlug: "blog" })).toBeNull();
    count = 3;
    expect(await planPagination(deps(), { w1: paginating({ limit: 3 }) }, ["w1"], { pageSlug: "blog" })).toBeNull();
  });

  it("uses the schema default when the widget has no per-page value", async () => {
    expect((await planPagination(deps(), { w1: paginating() }, ["w1"], { pageSlug: "blog" })).perPage).toBe(3);
  });

  it("skips widgets that cannot paginate and uses the next one that can", async () => {
    const widgets = {
      missing: paginating({ limit: 2 }, "ghost-grid"),
      plain: paginating({ limit: 2 }, "plain-grid"),
      zero: paginating({ limit: 0 }),
      fraction: paginating({ limit: 2.5 }),
      valid: paginating({ limit: 2 }),
    };
    const plan = await planPagination(deps(), widgets, Object.keys(widgets), { pageSlug: "blog" });
    expect(plan.widgetId).toBe("valid");
    expect(plan.total).toBe(4);
  });

  it("skips widgets with malformed schema settings without throwing", async () => {
    writeSchema("object-settings", { collection: { type: "news", perPageSetting: "limit" }, settings: {} });
    writeSchema("junk-entries", { collection: { type: "news", perPageSetting: "limit" }, settings: [null, "x", 5] });
    writeSchema("bad-setting-name", { collection: { type: "news", perPageSetting: 7 }, settings: [] });
    const widgets = {
      objectSettings: paginating({ limit: 2 }, "object-settings"),
      junkEntries: paginating({}, "junk-entries"),
      badName: paginating({ limit: 2 }, "bad-setting-name"),
      valid: paginating({ limit: 2 }),
    };
    const plan = await planPagination(deps(), widgets, Object.keys(widgets), { pageSlug: "blog" });
    expect(plan.widgetId).toBe("valid");
  });

  it("plans nothing without a way to count items", async () => {
    const plan = await planPagination({ projectDir }, { w1: paginating({ limit: 2 }) }, ["w1"], { pageSlug: "blog" });
    expect(plan).toBeNull();
  });
});
