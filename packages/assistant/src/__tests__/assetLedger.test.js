import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { createAssetLedger } from "../snapshots/assets.js";

function memoryStores(files) {
  const held = new Map();
  const assetStorage = {
    stat: async (scope, key) => (files.has(key) ? { size: files.get(key).length } : null),
    download: async (scope, key) => files.get(key) ?? null,
    upload: async (scope, key, bytes) => void files.set(key, Buffer.from(bytes)),
    delete: async (scope, key) => void files.delete(key),
  };
  const holdStore = {
    put: async (scope, sha, bytes) => void held.set(sha, Buffer.from(bytes)),
    get: async (scope, sha) => held.get(sha) ?? null,
    has: async (scope, sha) => held.has(sha),
    list: async () => [...held.keys()],
    delete: async (scope, sha) => void held.delete(sha),
    size: async (scope, sha) => held.get(sha)?.length ?? 0,
  };
  return { assetStorage, holdStore, held };
}

const scope = { projectId: "site" };
const sha = (text) => crypto.createHash("sha256").update(text).digest("hex");

describe("asset ledger", () => {
  it("holds nothing that no kept copy of the site needs", async () => {
    const { assetStorage, holdStore, held } = memoryStores(new Map([["images/a.png", Buffer.from("a")]]));
    const ledger = createAssetLedger({ assetStorage, holdStore });
    await ledger.hold(scope, "images/a.png");
    expect(held.size).toBe(0);
    ledger.setNeeded(async () => new Set([sha("a")]));
    await ledger.hold(scope, "images/a.png");
    expect(held.size).toBe(1);
  });

  it("won't restore from a damaged held copy", async () => {
    const files = new Map([["images/a.png", Buffer.from("a")]]);
    const { assetStorage, holdStore, held } = memoryStores(files);
    const ledger = createAssetLedger({ assetStorage, holdStore });
    ledger.setNeeded(async () => new Set([sha("a")]));
    const library = await ledger.describe(scope, { media: [{ path: "/uploads/images/a.png" }] });
    await ledger.hold(scope, "images/a.png");
    files.delete("images/a.png");
    ledger.forget(scope, "images/a.png");
    held.set(sha("a"), Buffer.from("tampered"));
    expect(await ledger.unavailable(scope, library)).toEqual(["images/a.png"]);
    await expect(ledger.restore(scope, library, [])).rejects.toMatchObject({ code: "ASSETS_MISSING" });
  });
});
