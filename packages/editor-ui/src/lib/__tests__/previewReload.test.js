// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { createPreviewReloadCoordinator } from "../previewReload";

// The coordinator behind every new preview document. The "server" is a fake
// session store: each mint ends the session it names as `replaces` and creates
// one, and the test answers each mint when it chooses, so races play out in a
// fixed order. The keep-alive is a fake that records what it was started with and
// hands the test its onEnded. Every race test ends by checking the invariant: the
// document in the frame is the one whose session the coordinator holds.

const DEADLINES = { absoluteExpiresAt: 1767283200000, idleExpiresAt: 1767270600000 };

function setup({ fail = () => null, sessions = true } = {}) {
  const live = new Set();
  const calls = [];
  let created = 0;
  const keepAlives = [];
  const shown = [];
  let seq = 0;

  const options = {
    mint: vi.fn(({ replaces }) => {
      const n = ++created;
      let resolve;
      let reject;
      const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
      const error = fail(n);
      if (!error) {
        // The server ends the replaced session and creates the new one when the mint arrives.
        if (replaces) live.delete(replaces);
        if (sessions) live.add(`s${n}`);
      }
      // Serialized as a host sends it: epoch-millisecond numbers.
      const answer = sessions ? JSON.parse(JSON.stringify({ token: `t${n}`, session: `s${n}`, ...DEADLINES })) : { token: `t${n}` };
      calls.push({ n, replaces, answer: () => (error ? reject(error) : resolve(answer)) });
      return promise;
    }),
    show: vi.fn((answer) => shown.push(answer)),
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
  const answer = async (n) => {
    calls.find((c) => c.n === n).answer();
    await flush();
  };
  const holdsShown = () => {
    const inFrame = shown.at(-1);
    expect(coordinator.session).toBe(inFrame?.session ?? null);
  };
  return { coordinator, options, keepAlives, shown, live, calls, answer, holdsShown, bumpSeq: () => ++seq };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("createPreviewReloadCoordinator", () => {
  it("names the newest session as the one each new document replaces, and keeps the shown one alive", async () => {
    const { coordinator, options, keepAlives, shown, live, answer, holdsShown } = setup();
    const first = coordinator.load();
    await answer(1);
    expect(await first).toBe(true);
    const second = coordinator.load();
    await answer(2);
    expect(await second).toBe(true);
    expect(options.mint.mock.calls.map(([arg]) => arg)).toEqual([{ replaces: null }, { replaces: "s1" }]);
    expect(shown.map((a) => a.token)).toEqual(["t1", "t2"]);
    expect(keepAlives.map((k) => [k.session, k.absoluteExpiresAt, k.idleExpiresAt])).toEqual([
      ["s1", DEADLINES.absoluteExpiresAt, DEADLINES.idleExpiresAt],
      ["s2", DEADLINES.absoluteExpiresAt, DEADLINES.idleExpiresAt],
    ]);
    expect(keepAlives[0].stop).toHaveBeenCalled();
    expect([...live]).toEqual(["s2"]);
    holdsShown();
  });

  it("sends no replaces and holds no session when the host gives none", async () => {
    const { coordinator, options, keepAlives, answer } = setup({ sessions: false });
    const first = coordinator.load();
    await answer(1);
    await first;
    const second = coordinator.load();
    await answer(2);
    await second;
    expect(options.mint.mock.calls.map(([arg]) => arg)).toEqual([{ replaces: null }, { replaces: null }]);
    expect(coordinator.session).toBeNull();
    expect(keepAlives.every((k) => k.session === null)).toBe(true);
  });

  it("runs one follow-up mint for any number of loads asked for while one is under way", async () => {
    const { coordinator, options, shown, live, answer, holdsShown } = setup();
    const loads = [coordinator.load(), coordinator.load(), coordinator.load(), coordinator.load(), coordinator.load()];
    expect(options.mint).toHaveBeenCalledTimes(1);
    await answer(1);
    expect(options.mint).toHaveBeenCalledTimes(2);
    expect(options.mint.mock.calls[1][0]).toEqual({ replaces: "s1" });
    await answer(2);
    expect(await Promise.all(loads)).toEqual([false, false, false, false, true]);
    expect(shown.map((a) => a.token)).toEqual(["t2"]);
    expect([...live]).toEqual(["s2"]);
    holdsShown();
  });

  it("leaves one live session after rapid overlapping loads", async () => {
    const { coordinator, live, calls, answer, holdsShown } = setup();
    const first = coordinator.load();
    await answer(1);
    await first;
    for (let round = 0; round < 4; round++) {
      coordinator.load();
      coordinator.load();
      await answer(calls.at(-1).n);
    }
    await answer(calls.at(-1).n);
    expect(live.size).toBe(1);
    expect([...live]).toEqual([coordinator.session]);
    holdsShown();
  });

  it("an undo while a replacement mint is under way shows nothing new and keeps holding the shown document's session", async () => {
    const { coordinator, options, keepAlives, shown, live, answer, holdsShown } = setup();
    const first = coordinator.load();
    await answer(1);
    await first;
    // The structural change is undone before the mint answers: isCurrent() says no.
    const replacement = coordinator.load(() => false);
    await answer(2);
    expect(await replacement).toBe(false);
    expect(shown.map((a) => a.token)).toEqual(["t1"]);
    holdsShown();
    // The shown session was ended by that mint; its keep-alive is back and its
    // first touch will say so. The next mint replaces the newest session, s2.
    expect(keepAlives.at(-1).session).toBe("s1");
    expect([...live]).toEqual(["s2"]);
    const next = coordinator.load();
    await answer(3);
    expect(await next).toBe(true);
    expect(options.mint.mock.calls.at(-1)[0]).toEqual({ replaces: "s2" });
    expect([...live]).toEqual(["s3"]);
    holdsShown();
  });

  it("a page switch while the old page's mint is under way shows only the new page", async () => {
    const { coordinator, shown, live, answer, holdsShown, bumpSeq } = setup();
    let page = 1;
    const oldPage = coordinator.load(() => page === 1);
    // The editor opens another page before the old page's mint answers.
    page = 2;
    bumpSeq();
    coordinator.release();
    const newPage = coordinator.load(() => page === 2);
    await answer(1);
    await answer(2);
    expect(await oldPage).toBe(false);
    expect(await newPage).toBe(true);
    expect(shown.map((a) => a.token)).toEqual(["t2"]);
    expect([...live]).toEqual(["s2"]);
    holdsShown();
  });

  it("an older initial load that answers last never lands", async () => {
    const { coordinator, options, shown, answer, holdsShown } = setup();
    let current = "a";
    const loadA = coordinator.load(() => current === "a");
    current = "b";
    const loadB = coordinator.load(() => current === "b");
    // The second mint runs only once the first answers, so the first can never answer after it.
    expect(options.mint).toHaveBeenCalledTimes(1);
    await answer(1);
    expect(await loadA).toBe(false);
    await answer(2);
    expect(await loadB).toBe(true);
    expect(shown.map((a) => a.token)).toEqual(["t2"]);
    holdsShown();
  });

  it("reloads once when the session ends, keeping the view as a structural reload does", async () => {
    const { coordinator, options, keepAlives, shown, answer, holdsShown } = setup();
    const first = coordinator.load();
    await answer(1);
    await first;
    keepAlives[0].onEnded();
    expect(options.beginReload).toHaveBeenCalledTimes(1);
    await answer(2);
    expect(shown.map((a) => a.token)).toEqual(["t1", "t2"]);
    holdsShown();
  });

  it("a morph's 410 and a touch's 410 for the same document cause one reload", async () => {
    const { coordinator, options, keepAlives, shown, answer, holdsShown } = setup();
    const first = coordinator.load();
    await answer(1);
    await first;
    // The morph saw 410: the editor reloads.
    const reloading = coordinator.load();
    // The keep-alive's touch also saw 410 while that mint is under way.
    keepAlives[0].onEnded();
    coordinator.requestReload();
    await answer(2);
    expect(await reloading).toBe(true);
    expect(options.mint).toHaveBeenCalledTimes(2);
    expect(options.beginReload).not.toHaveBeenCalled();
    expect(shown.map((a) => a.token)).toEqual(["t1", "t2"]);
    holdsShown();
  });

  it("never lets a replaced document's session reload the document that replaced it", async () => {
    const { coordinator, options, keepAlives, answer, holdsShown } = setup();
    const first = coordinator.load();
    await answer(1);
    await first;
    const second = coordinator.load();
    await answer(2);
    await second;
    keepAlives[0].onEnded();
    await flush();
    expect(options.mint).toHaveBeenCalledTimes(2);
    expect(options.beginReload).not.toHaveBeenCalled();
    holdsShown();
  });

  it("keeps the shown document alive again when a mint fails, and rejects that load", async () => {
    const { coordinator, keepAlives, answer, holdsShown } = setup({ fail: (n) => (n === 2 ? new Error("offline") : null) });
    const first = coordinator.load();
    await answer(1);
    await first;
    const failing = coordinator.load();
    await answer(2);
    await expect(failing).rejects.toThrow("offline");
    expect(keepAlives.map((k) => k.session)).toEqual(["s1", "s1"]);
    expect(keepAlives[0].stop).toHaveBeenCalled();
    holdsShown();
  });

  it("runs the follow-up when a superseded mint fails", async () => {
    const { coordinator, shown, answer, holdsShown } = setup({ fail: (n) => (n === 1 ? new Error("offline") : null) });
    const older = coordinator.load();
    const newer = coordinator.load();
    await answer(1);
    expect(await older).toBe(false);
    await answer(2);
    expect(await newer).toBe(true);
    expect(shown.map((a) => a.token)).toEqual(["t2"]);
    holdsShown();
  });

  it("reports a failed session reload and does not try again", async () => {
    const { coordinator, options, keepAlives, answer } = setup({ fail: (n) => (n === 2 ? new Error("offline") : null) });
    const first = coordinator.load();
    await answer(1);
    await first;
    keepAlives[0].onEnded();
    await answer(2);
    expect(options.onReloadError).toHaveBeenCalledWith(expect.objectContaining({ message: "offline" }));
    expect(options.mint).toHaveBeenCalledTimes(2);
  });

  it("release() stops the keep-alive and drops the shown session, keeping the newest one for replaces", async () => {
    const { coordinator, options, keepAlives, answer } = setup();
    const first = coordinator.load();
    await answer(1);
    await first;
    coordinator.release();
    expect(keepAlives[0].stop).toHaveBeenCalled();
    expect(coordinator.session).toBeNull();
    keepAlives[0].onEnded();
    expect(options.beginReload).not.toHaveBeenCalled();
    coordinator.load();
    expect(options.mint.mock.calls.at(-1)[0]).toEqual({ replaces: "s1" });
  });

  it("after dispose() ignores the answer still on its way and starts nothing", async () => {
    const { coordinator, options, keepAlives, answer } = setup();
    const loading = coordinator.load();
    const waiting = coordinator.load();
    coordinator.dispose();
    await answer(1);
    expect(await loading).toBe(false);
    expect(await waiting).toBe(false);
    expect(options.show).not.toHaveBeenCalled();
    expect(keepAlives).toHaveLength(0);
    coordinator.requestReload();
    expect(await coordinator.load()).toBe(false);
    expect(options.mint).toHaveBeenCalledTimes(1);
  });
});
