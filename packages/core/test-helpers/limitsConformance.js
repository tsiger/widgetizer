// Runner-agnostic conformance suite for the LimitsAdapter contract.
// See storageConformance.js for the calling convention.
//
// Values differ by implementation (OSS is permissive, hosted is tier-based),
// so the suite pins the contract — every LIMIT_KEYS key resolves to a
// number/string/boolean, and unknown keys reject — not specific values.

import { LIMIT_KEYS } from "../src/adapters.js";

export function runLimitsAdapterConformance({ describe, it, assert, name, makeAdapter, makeScope }) {
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
  });
}
