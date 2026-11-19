// Runner-agnostic conformance suite for the LimitsAdapter contract.
// See storageConformance.js for the calling convention.
//
// Values differ by implementation (OSS is permissive, hosted is tier-based),
// so the suite pins the contract — every LIMIT_KEYS key resolves to a
// number/string/boolean, and unknown keys reject — not specific values.
//
// `reserveStorage` is optional (absent = unlimited storage). An adapter that has
// it must also be given `makeAdapterWithRoom(roomBytes)`, returning an adapter
// whose project has exactly `roomBytes` of storage left, so the suite can check
// grants and refusals. Each reservation is settled before the next is asked for:
// an implementation may hold a non-reentrant lock between the two.

import { LIMIT_KEYS } from "../src/adapters.js";

export function runLimitsAdapterConformance({ describe, it, assert, name, makeAdapter, makeScope, makeAdapterWithRoom }) {
  describe(`LimitsAdapter conformance: ${name}`, () => {
    it("resolves every LIMIT_KEYS key to a primitive", async () => {
      const a = makeAdapter();
      const scope = makeScope("a");
      for (const key of Object.values(LIMIT_KEYS)) {
        const value = await a.getLimit(scope, key);
        assert.ok(
          ["number", "string", "boolean"].includes(typeof value),
          `expected ${key} to be a primitive, got ${typeof value}`,
        );
      }
    });

    it("rejects an unknown limit key", async () => {
      const a = makeAdapter();
      await assert.rejects(() => a.getLimit(makeScope("a"), "NOT_A_REAL_LIMIT"));
    });

    it("reserveStorage, when present, grants within room and refuses beyond it", async () => {
      const plain = makeAdapter();
      if (plain.reserveStorage === undefined) return; // unlimited storage
      assert.equal(typeof plain.reserveStorage, "function");
      assert.equal(typeof makeAdapterWithRoom, "function", "an adapter with reserveStorage needs makeAdapterWithRoom");

      const a = makeAdapterWithRoom(1000);
      const scope = makeScope("a");

      const granted = await a.reserveStorage(scope, 400);
      assert.equal(granted.ok, true);
      assert.equal(typeof granted.commit, "function");
      assert.equal(typeof granted.release, "function");
      await granted.release();

      // A released reservation gives its room back.
      const refused = await a.reserveStorage(scope, 1001);
      assert.equal(refused.ok, false);
      assert.equal(refused.code, "STORAGE_FULL");
      assert.equal(refused.availableBytes, 1000);

      const kept = await a.reserveStorage(scope, 600);
      assert.equal(kept.ok, true);
      await kept.commit(600);

      // Committed bytes are used up.
      const after = await a.reserveStorage(scope, 600);
      assert.equal(after.ok, false);
      assert.equal(after.code, "STORAGE_FULL");
      assert.equal(after.availableBytes, 400);
    });
  });
}
