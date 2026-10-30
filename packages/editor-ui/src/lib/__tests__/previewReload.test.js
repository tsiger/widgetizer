// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { createPreviewReloadCoordinator } from "../previewReload";

// The coordinator behind every new preview document. The keep-alive is a fake
// that records what it was started with and hands the test its onEnded, so the
// races between a morph's 410, a touch's 410 and a reload can be played out in order.

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const mintAnswer = (n) =>
  JSON.parse(JSON.stringify({ token: `t${n}`, session: `s${n}`, absoluteExpiresAt: 1767283200000, idleExpiresAt: 1767270600000 }));

function setup({ mint } = {}) {
  let minted = 0;
  const keepAlives = [];
  const shown = [];
  let seq = 0;
  const options = {
    mint: vi.fn(mint ?? (async () => mintAnswer(++minted))),
    show: vi.fn((answer) => shown.push(answer.token)),
    beginReload: vi.fn(() => {
      const mine = ++seq;
      return () => seq === mine;
    }),
    onReloadError: vi.fn(),
    keepAlive: vi.fn((args) => {
      const entry = { ...args, stop: vi.fn() };
      keepAlives.push(entry);
      return entry.stop;
    }),
  };
  const coordinator = createPreviewReloadCoordinator(options);
  return { coordinator, options, keepAlives, shown, bumpSeq: () => ++seq };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("createPreviewReloadCoordinator", () => {
  it("names the frame's session as the one each new document replaces, and keeps the new one alive", async () => {
    const { coordinator, options, keepAlives, shown } = setup();
    expect(await coordinator.load()).toBe(true);
    expect(await coordinator.load()).toBe(true);
    expect(options.mint.mock.calls.map(([arg]) => arg)).toEqual([{ replaces: null }, { replaces: "s1" }]);
    expect(shown).toEqual(["t1", "t2"]);
    expect(coordinator.session).toBe("s2");
    expect(keepAlives.map((k) => [k.session, k.absoluteExpiresAt, k.idleExpiresAt])).toEqual([
      ["s1", 1767283200000, 1767270600000],
      ["s2", 1767283200000, 1767270600000],
    ]);
    expect(keepAlives[0].stop).toHaveBeenCalled();
    expect(keepAlives[1].stop).not.toHaveBeenCalled();
  });

  it("sends no replaces and has no session when the host gives none", async () => {
    const { coordinator, options, keepAlives } = setup({ mint: async () => ({ token: "t" }) });
    await coordinator.load();
    await coordinator.load();
    expect(options.mint.mock.calls.map(([arg]) => arg)).toEqual([{ replaces: null }, { replaces: null }]);
    expect(coordinator.session).toBeNull();
    expect(keepAlives.every((k) => k.session === null)).toBe(true);
  });

  it("reloads once when the session ends, keeping the view as a structural reload does", async () => {
    const { coordinator, options, keepAlives, shown } = setup();
    await coordinator.load();
    keepAlives[0].onEnded();
    await flush();
    expect(options.beginReload).toHaveBeenCalledTimes(1);
    expect(options.mint).toHaveBeenCalledTimes(2);
    expect(shown).toEqual(["t1", "t2"]);
  });

  it("a morph's 410 and a touch's 410 for the same document cause one reload", async () => {
    let minted = 0;
    const pending = [];
    const { coordinator, options, keepAlives, shown } = setup({
      mint: () => {
        minted += 1;
        if (minted === 1) return Promise.resolve(mintAnswer(1));
        const next = deferred();
        pending.push(next);
        return next.promise;
      },
    });
    await coordinator.load();
    // The morph saw 410: the editor reloads.
    const reloading = coordinator.load();
    // The keep-alive's touch also saw 410 while that mint is under way.
    keepAlives[0].onEnded();
    coordinator.requestReload();
    pending[0].resolve(mintAnswer(2));
    await reloading;
    await flush();
    expect(options.mint).toHaveBeenCalledTimes(2);
    expect(options.beginReload).not.toHaveBeenCalled();
    expect(shown).toEqual(["t1", "t2"]);
  });

  it("never lets a replaced document's session reload the document that replaced it", async () => {
    const { coordinator, options, keepAlives } = setup();
    await coordinator.load();
    await coordinator.load();
    keepAlives[0].onEnded();
    await flush();
    expect(options.mint).toHaveBeenCalledTimes(2);
    expect(options.beginReload).not.toHaveBeenCalled();
  });

  it("keeps an overtaken mint's session for the next one to replace, without showing it", async () => {
    const { coordinator, options, shown } = setup();
    await coordinator.load();
    expect(await coordinator.load(() => false)).toBe(false);
    expect(shown).toEqual(["t1"]);
    expect(coordinator.session).toBe("s2");
    await coordinator.load();
    expect(options.mint.mock.calls.at(-1)[0]).toEqual({ replaces: "s2" });
  });

  it("does not let an older mint that answers last replace a newer one's session", async () => {
    const answers = [deferred(), deferred()];
    let call = 0;
    const { coordinator, keepAlives, shown } = setup({ mint: () => answers[call++].promise });
    const older = coordinator.load(() => false);
    const newer = coordinator.load();
    answers[1].resolve(mintAnswer(2));
    await newer;
    answers[0].resolve(mintAnswer(1));
    await older;
    expect(shown).toEqual(["t2"]);
    expect(coordinator.session).toBe("s2");
    expect(keepAlives.map((k) => k.session)).toEqual(["s2"]);
  });

  it("keeps the document on show alive again when a mint fails", async () => {
    let minted = 0;
    const { coordinator, keepAlives } = setup({
      mint: async () => {
        minted += 1;
        if (minted === 2) throw new Error("offline");
        return mintAnswer(minted);
      },
    });
    await coordinator.load();
    await expect(coordinator.load()).rejects.toThrow("offline");
    expect(keepAlives.map((k) => k.session)).toEqual(["s1", "s1"]);
    expect(keepAlives[0].stop).toHaveBeenCalled();
    expect(coordinator.session).toBe("s1");
  });

  it("reports a failed session reload", async () => {
    let minted = 0;
    const { coordinator, options, keepAlives } = setup({
      mint: async () => {
        minted += 1;
        if (minted === 2) throw new Error("offline");
        return mintAnswer(minted);
      },
    });
    await coordinator.load();
    keepAlives[0].onEnded();
    await flush();
    expect(options.onReloadError).toHaveBeenCalledWith(expect.objectContaining({ message: "offline" }));
  });

  it("release() stops the keep-alive but keeps the session for the next page's mint", async () => {
    const { coordinator, options, keepAlives } = setup();
    await coordinator.load();
    coordinator.release();
    expect(keepAlives[0].stop).toHaveBeenCalled();
    keepAlives[0].onEnded();
    await coordinator.load();
    expect(options.mint.mock.calls.map(([arg]) => arg)).toEqual([{ replaces: null }, { replaces: "s1" }]);
  });

  it("after dispose() ignores the answer still on its way and starts nothing", async () => {
    const answer = deferred();
    const { coordinator, options, keepAlives } = setup({ mint: () => answer.promise });
    const loading = coordinator.load();
    coordinator.dispose();
    answer.resolve(mintAnswer(1));
    expect(await loading).toBe(false);
    expect(options.show).not.toHaveBeenCalled();
    expect(keepAlives).toHaveLength(0);
    coordinator.requestReload();
    expect(options.mint).toHaveBeenCalledTimes(1);
  });
});
