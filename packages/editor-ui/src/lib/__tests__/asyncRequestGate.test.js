import { describe, it, expect } from "vitest";
import { createAsyncRequestGate } from "../asyncRequestGate";

describe("createAsyncRequestGate", () => {
  it("returns a fresh gate with start, isCurrent, and invalidate", () => {
    const gate = createAsyncRequestGate();
    expect(typeof gate.start).toBe("function");
    expect(typeof gate.isCurrent).toBe("function");
    expect(typeof gate.invalidate).toBe("function");
  });

  it("start() returns a token that is current", () => {
    const gate = createAsyncRequestGate();
    const token = gate.start();
    expect(gate.isCurrent(token)).toBe(true);
  });

  it("a new start() invalidates a prior token", () => {
    const gate = createAsyncRequestGate();
    const first = gate.start();
    const second = gate.start();
    expect(gate.isCurrent(first)).toBe(false);
    expect(gate.isCurrent(second)).toBe(true);
  });

  it("invalidate() drops all prior tokens", () => {
    const gate = createAsyncRequestGate();
    const token = gate.start();
    gate.invalidate();
    expect(gate.isCurrent(token)).toBe(false);
  });

  it("start() after invalidate() works normally", () => {
    const gate = createAsyncRequestGate();
    gate.start();
    gate.invalidate();
    const fresh = gate.start();
    expect(gate.isCurrent(fresh)).toBe(true);
  });

  it("tokens from separate gates do not interfere", () => {
    const gateA = createAsyncRequestGate();
    const gateB = createAsyncRequestGate();
    const tokenA = gateA.start();
    const tokenB = gateB.start();

    gateA.start(); // invalidate A's first token

    expect(gateA.isCurrent(tokenA)).toBe(false);
    expect(gateB.isCurrent(tokenB)).toBe(true);
  });

  it("isCurrent returns false for arbitrary numbers that were never issued", () => {
    const gate = createAsyncRequestGate();
    gate.start();
    expect(gate.isCurrent(999)).toBe(false);
    expect(gate.isCurrent(0)).toBe(false);
  });

  it("handles rapid successive starts", () => {
    const gate = createAsyncRequestGate();
    const tokens = [];
    for (let i = 0; i < 100; i++) {
      tokens.push(gate.start());
    }
    // Only the last token should be current
    for (let i = 0; i < 99; i++) {
      expect(gate.isCurrent(tokens[i])).toBe(false);
    }
    expect(gate.isCurrent(tokens[99])).toBe(true);
  });
});
