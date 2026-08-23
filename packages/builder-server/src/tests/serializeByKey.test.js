/**
 * createKeyedSerializer — the shared per-key serialization primitive.
 *
 * Overlapping calls with the same key run strictly one after another;
 * different keys run concurrently; a rejection reaches its own caller but
 * never blocks the calls queued behind it.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { createKeyedSerializer } = await import("../utils/serializeByKey.js");

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("createKeyedSerializer", () => {
  it("serializes overlapping calls with the same key", async () => {
    const run = createKeyedSerializer();
    const gate = deferred();
    const order = [];

    const first = run("k", async () => {
      order.push("first-start");
      await gate.promise;
      order.push("first-end");
    });
    const second = run("k", async () => {
      order.push("second-start");
    });

    // Give the second call every chance to start early if serialization is broken.
    await new Promise((r) => setImmediate(r));
    assert.deepEqual(order, ["first-start"], "second must not start while first is in flight");

    gate.resolve();
    await Promise.all([first, second]);
    assert.deepEqual(order, ["first-start", "first-end", "second-start"]);
  });

  it("runs different keys concurrently", async () => {
    const run = createKeyedSerializer();
    const gate = deferred();
    const order = [];

    const slow = run("a", async () => {
      await gate.promise;
      order.push("a");
    });
    const fast = run("b", async () => {
      order.push("b");
    });

    await fast;
    assert.deepEqual(order, ["b"], "key b must not wait behind key a");
    gate.resolve();
    await slow;
    assert.deepEqual(order, ["b", "a"]);
  });

  it("propagates the return value", async () => {
    const run = createKeyedSerializer();
    assert.equal(await run("k", async () => 42), 42);
  });

  it("propagates a rejection to its caller and keeps the chain alive", async () => {
    const run = createKeyedSerializer();

    await assert.rejects(
      run("k", async () => {
        throw new Error("boom");
      }),
      /boom/,
    );

    // The next call behind the failure still runs.
    assert.equal(await run("k", async () => "survived"), "survived");
  });

  it("a follower queued behind an in-flight rejection still runs", async () => {
    const run = createKeyedSerializer();
    const gate = deferred();

    const failing = run("k", async () => {
      await gate.promise;
      throw new Error("mid-flight");
    });
    // Queued while the failing call is still in flight — exercises the
    // predecessor-rejection swallow on a live chain, not a drained one.
    const follower = run("k", async () => "after-failure");

    gate.resolve();
    await assert.rejects(failing, /mid-flight/);
    assert.equal(await follower, "after-failure");
  });
});
