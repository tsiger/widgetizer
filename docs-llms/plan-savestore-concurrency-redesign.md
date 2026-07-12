# saveStore.js Concurrency Model Redesign — Design

**Status:** design approved 2026-07-12, awaiting implementation plan.

## Why

`saveStore.js`'s `save()`/`resetAutoSaveTimer()` concurrency logic was patched three times in a row in one session (commits `a92cbdb3`, `6b6a456a`, `d4eb5b03` on the OSS `list-button` branch): a guard for overlapping saves wiping undo history, then a fix because the guard only worked in one direction, then a fix because the reschedule it added orphaned timers / defeated an intentional `stopAutoSave()`. Each fix for the previous round's bug introduced a new, narrower bug of the same kind.

A whole-file, non-diff-scoped audit (xhigh review, 25 candidates → 24 verified, 12 reported after dedup) found the pattern wasn't a string of isolated bugs — it's the design. Findings:

1. **Save failures are invisible.** `save()`'s catch block only `console.error`s on any non-`PROJECT_MISMATCH` error and never rethrows; the promise always resolves as if it succeeded. The toolbar's error toast is wired to fire on rejection, which never happens.
2. **`reset()` defeats the single-flight guard.** It unconditionally zeroes `isSaving`/`isAutoSaving` with no check for an in-flight save. Called from `useNavigationGuard`'s discard-confirm flow — exactly when a save is likely mid-flight.
3. **Theme settings bypass the guard entirely.** `Settings.jsx` calls `themeStore.saveSettings()` directly; `themeStore` has no in-flight guard of its own. **Out of scope for this redesign** (see Scope below) — logged as a follow-up.
4. **Undo/redo never integrates with dirty-tracking or the timer.** Two distinct problems: a redo that reintroduces dirtiness arms no timer (silent data-loss window — only a fresh edit or manual save would catch it); an undo back to the exact saved state never clears `modifiedWidgets`, so `hasUnsavedChanges()` stays falsely `true` forever (spurious nav-guard warnings, and a spurious autosave that wipes the redo stack via `temporal.clear()`).
5. **Design smells:** `JSON.stringify`-based diffing (key-order sensitive, and silently drops `undefined`-valued keys — the latter is a real silent-data-loss path, not just a false positive); `save()` returns `undefined` identically for "busy, skipped," "nothing to save," and "succeeded"; the timer is a debounce, not an interval — continuous editing can push it out indefinitely; unbounded 60s-interval retry with no backoff hammers a broken backend forever.

## Scope

**In scope:** the core concurrency primitive in `saveStore.js` (items 1, 2, 5 above) and undo/redo integration (item 4). These are tightly coupled — undo/redo dirtiness is exactly the kind of state the primitive needs to track correctly, and leaving it unfixed means the new primitive still has a known silent-data-loss gap.

**Out of scope, logged as a follow-up:** theme-settings save unification (item 3) — a genuinely separate page/subsystem (`Settings.jsx` + `themeStore.js`) that can be tackled independently once this primitive exists to unify onto.

## Decisions made during design

- **Discard semantics:** when `useNavigationGuard`'s "discard changes" is confirmed while a save is in flight, that save is **abandoned** — its eventual result must not apply. The dialog says "discard changes"; letting an in-flight request silently land anyway would violate that.
- **Failure surfacing:** a **manual** save's promise **rejects** on failure (existing toolbar toast fires unchanged). An **autosave** failure does **not** reject — it resolves `{status:'failed'}`, is logged, and retried with backoff. A background autosave failing shouldn't interrupt the user mid-typing every 60s; a user-initiated click failing should tell them so.
- **`modifiedWidgets` stays.** It's not just an internal signal — `WidgetList.jsx` reads it directly for a per-widget "modified" indicator dot, which a whole-page value-diff can't replace. The fix is keeping the Set and the value-diff correctly synchronized (via the undo/redo integration below), not eliminating one in favor of the other.

## Architecture

Two files change: `packages/editor-ui/src/stores/saveStore.js` (the rewrite) and `packages/editor-ui/src/components/pageEditor/EditorTopBar.jsx` (undo/redo integration — small, additive).

Core idea: replace the ad-hoc booleans + timer-identity-comparison guard with **one single-flight primitive** (`runningSave` + `queuedFollowUp`, both promises) as the sole source of truth for "is a save executing," plus **one generation counter** (`saveGeneration`) as the sole mechanism for "was this abandoned." `isSaving`/`isAutoSaving` remain as booleans (tests and `busyWhen` read them) but become pure bookkeeping *derived from* the single-flight state, not an independent guard something else can defeat.

### `save(isAuto)` — the single-flight queue

Calling `save()` while one is already running no longer overlaps *or* silently no-ops — it **coalesces**: at most one follow-up run is queued, and every caller who arrives during that window awaits the same follow-up and gets its real eventual outcome. This is what lets `resetAutoSaveTimer`'s tick call `save(true)` unconditionally without needing to know whether something else is already in flight.

`save()` returns `{ status: 'clean' | 'success' | 'mismatch' | 'failed' | 'abandoned' }` instead of `undefined`, so callers can finally distinguish a busy no-op from a genuine success. A manual save's promise *rejects* on `'failed'` (not resolves) so `PrimaryActionControl`'s existing catch-and-toast logic fires with zero changes there; an autosave's promise resolves with `{status:'failed', error}`. `'abandoned'` always *resolves* (never rejects), for both manual and auto — by the time a generation mismatch is detected the caller's own context (the component that triggered it) is generally already gone, per the discard/navigation flow that triggers it; there is nothing left to usefully show a rejection to.

### Abandoning on discard

`reset()` no longer force-clears `isSaving`/`isAutoSaving` — that was the actual bug (flipping flags while the real network request was still pending). Instead it bumps `saveGeneration`. A save captures its own generation at entry; before applying **any** success-path write-back (clearing `modifiedWidgets`, rebaselining `originalPage`/`originalGlobalWidgets`, `temporal.clear()`, etc.) it checks the generation still matches, and returns `{status:'abandoned'}` if not. Each save's own `finally` block *always* clears its own `isSaving`/`isAutoSaving`/`runningSave` bookkeeping regardless of generation — that part is "this execution finished," decoupled from "should its results apply."

### The timer

Simpler now that `save()` is overlap-safe. The tick nulls `autoSaveInterval` **immediately** on firing (nothing further to cancel for a timer that already fired), calls `save(true)` unconditionally if dirty, and reschedules only if: nothing else already re-armed a timer during that await (`autoSaveInterval == null`), **and** the result wasn't `'mismatch'`/`'abandoned'` (both mean an intentional stop happened mid-flight — rescheduling would defeat it), **and** content is still dirty. No timer-identity comparison needed anywhere.

**Backoff:** new `autoSaveFailureCount`, incremented on `'failed'`, reset to 0 on `'success'` or on any fresh edit (`markWidgetModified`/`setStructureModified`/`setThemeSettingsModified` reset it too — an active user deserves the normal cadence, not a stale backoff from an earlier, unrelated outage). Delay = `min(60s * 2^failureCount, 10min)`.

### Undo/redo integration

`EditorTopBar.jsx`'s `safeUndo`/`safeRedo` gain one new step after the temporal jump: diff every widget id (page widgets + header + footer) between the new current content and the saved baseline (`originalPage`/`originalGlobalWidgets`), and call the *existing* `markWidgetModified`/`markWidgetUnmodified` for whichever ids actually differ. This fixes both undo/redo findings at once — `markWidgetModified`'s existing side effect re-arms the timer when redo reintroduces real dirtiness, and `markWidgetUnmodified` clears the Set when undo reverts a widget back to exactly its saved state.

### Diffing correctness

All `JSON.stringify(a) !== JSON.stringify(b)` comparisons (in `hasUnsavedChanges()`, inside `save()`, and the new undo/redo sync helper) switch to `lodash/isEqual` (`lodash` is already a dependency of `@widgetizer/editor-ui`, confirmed in `packages/editor-ui/package.json`). This fixes both the key-order false-positive and the more serious one the audit found: `JSON.stringify` silently drops `undefined`-valued keys, which `isEqual` does not — so a real edit can no longer vanish from the diff undetected.

### Error handling summary

| Trigger | Behavior |
|---|---|
| Manual save fails | Promise rejects → toolbar's existing toast fires |
| Autosave fails | Resolves `{status:'failed'}`, logged, retried with backoff |
| PROJECT_MISMATCH | Unchanged: stale curtain, `stopAutoSave()`, tick does not reschedule |
| Discard mid-flight | Generation mismatch → write-back skipped, `{status:'abandoned'}` |

## Testing strategy

Every scenario the review surfaced becomes a test, mirroring the pattern already used successfully in this file this session: write the test, temporarily revert the relevant piece of the fix, confirm it fails, restore. Specifically:

- Coalescing: repeated `save()` calls during one run all resolve to the same real outcome (not each firing separately, not silently no-op-ing).
- Abandonment: a `reset()` mid-flight prevents write-back from a subsequently-resolving save.
- Backoff: failure count increments on failure, resets on success and on a fresh edit; delay grows and caps at 10 minutes.
- Timer reschedule gating: does not reschedule after `'mismatch'` or `'abandoned'`; does reschedule (once, not doubled) when something else already re-armed during the await.
- Manual-vs-auto failure surfacing: manual rejects, autosave resolves with `'failed'` and does not throw.
- Undo/redo sync, both directions: revert-to-clean clears the relevant `modifiedWidgets` entries; redo-reintroduces-dirt calls `markWidgetModified` and re-arms the timer.
- Diffing: `isEqual` replacing `JSON.stringify` doesn't regress any existing passing test, and a new test asserts an `undefined`-valued-key edit is now detected (previously silently dropped).

## Follow-ups (not in this redesign)

- Theme-settings save unification (`Settings.jsx` bypassing `saveStore`'s guard) — needs its own design once this primitive exists to unify onto.
- `markWidgetUnmodified` was dead code before this redesign (no callers outside its own tests) — the undo/redo integration above gives it its first real caller.

---

# Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `saveStore.js`'s ad-hoc boolean-flag + timer-identity-comparison concurrency guards with a single-flight queue + generation counter, and integrate undo/redo with dirty-tracking, per the Design above.

**Architecture:** See Design section above — one file rewrite (`saveStore.js`) in three sequential layers (diffing → single-flight `save()`/`reset()` → timer/backoff), plus one small additive integration (`EditorTopBar.jsx`).

**Tech Stack:** React 19, Zustand, `lodash` (already a dependency), Vitest with fake timers.

## Global Constraints

- All four tasks touch only `packages/editor-ui/src/stores/saveStore.js`, `packages/editor-ui/src/stores/__tests__/saveStore.test.js`, `packages/editor-ui/src/components/pageEditor/EditorTopBar.jsx`, and `packages/editor-ui/src/components/pageEditor/__tests__/EditorTopBar.test.jsx`. No other files change. OSS repo only — do not touch `widgetizer-hosted`.
- `save()`'s new return contract: `{ status: 'clean' | 'success' | 'mismatch' | 'failed' | 'abandoned', error? }`. A **manual** (`isAuto=false`) failure **rejects** the promise (throws the original error); every other outcome, for both manual and auto, **resolves**.
- No new production dependencies. Import `isEqual` as `import { isEqual } from "lodash";` (matches the existing convention in `MenuEditor/index.jsx`), not `lodash/isEqual`.
- Comments: document non-obvious invariants (the generation check, the reschedule gating), never restate what the code does, never cite this plan file or its task numbers from code comments — inline the reasoning instead (per this repo's `CLAUDE.md`).
- The full frontend suite (`npm run test:frontend`) must stay green after every task, not just the touched test file.
- Where a step says "verify it fails first" but the assertion may also hold under the current (pre-task) code because an earlier task already fixed the underlying mechanism, that's noted explicitly in the step — proceed to implementation regardless; the test still stands as regression coverage going forward.

---

### Task 1: Replace `JSON.stringify` diffing with `lodash.isEqual`

**Files:**
- Modify: `packages/editor-ui/src/stores/saveStore.js`
- Test: `packages/editor-ui/src/stores/__tests__/saveStore.test.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: no signature changes — `hasUnsavedChanges()` and `save()`'s internal diff checks now use `isEqual` instead of `JSON.stringify(a) !== JSON.stringify(b)`. Later tasks build on this file state.

- [ ] **Step 1: Write the failing tests**

Add to the `describe("hasUnsavedChanges — deep equality fallback", ...)` block in `saveStore.test.js`:

```js
    it("detects a page diff even when the only change is an undefined-valued key (JSON.stringify would silently drop it)", () => {
      const page = seedPageStore();
      usePageStore.setState({
        page: { ...page, widgets: { ...page.widgets, "w-1": { ...page.widgets["w-1"], extra: undefined } } },
      });
      expect(useAutoSave.getState().hasUnsavedChanges()).toBe(true);
    });

    it("does not report a diff when header/footer are rebuilt with the same values in a different key order", () => {
      usePageStore.setState({
        globalWidgets: { header: { type: "header", settings: { a: 1, b: 2 } }, footer: null },
        originalGlobalWidgets: { header: { settings: { b: 2, a: 1 }, type: "header" }, footer: null },
      });
      expect(useAutoSave.getState().hasUnsavedChanges()).toBe(false);
    });
```

- [ ] **Step 2: Run and verify both fail**

Run: `npx vitest run packages/editor-ui/src/stores/__tests__/saveStore.test.js -t "undefined-valued key|different key order"`
Expected: both FAIL against the current `JSON.stringify`-based code — the first because `JSON.stringify` silently drops the `undefined`-valued key (no diff seen, so `hasUnsavedChanges()` wrongly returns `false`); the second because `JSON.stringify`'s key-order sensitivity makes semantically-identical objects compare as different (wrongly returns `true`). These failures are the proof both bugs are real.

- [ ] **Step 3: Implement**

In `saveStore.js`, add the import:

```js
import { isEqual } from "lodash";
```

Replace all six `JSON.stringify(a) !== JSON.stringify(b)` comparisons with `!isEqual(a, b)`:
- In `hasUnsavedChanges()`: `page`/`originalPage`, `globalWidgets.header`/`originalGlobalWidgets.header`, `globalWidgets.footer`/`originalGlobalWidgets.footer`.
- Inside `save()`: `hasHeaderDiff`, `hasFooterDiff`, `hasPageDiff`.

- [ ] **Step 4: Run and verify all pass**

Run: `npx vitest run packages/editor-ui/src/stores/__tests__/saveStore.test.js`
Expected: all tests pass (existing + the 2 new ones).

- [ ] **Step 5: Commit**

```bash
git add packages/editor-ui/src/stores/saveStore.js packages/editor-ui/src/stores/__tests__/saveStore.test.js
git commit -m "fix: replace JSON.stringify diffing with lodash isEqual in saveStore"
```

---

### Task 2: Single-flight `save()` + generation-gated `reset()`

> **Post-execution note (2026-07-12):** three things surfaced during real TDD that this written plan missed — recorded here for anyone reading this later, and because they change Task 3's starting state:
> 1. **A genuine TDZ bug** in the plan's `save:` code: `const run = (async () => { ... finally { if (get().runningSave === run) ... } })();` throws `ReferenceError: Cannot access 'run' before initialization` whenever the async body resolves fully synchronously (the PROJECT_MISMATCH throw happens before any `await`). Fixed by removing the self-reference entirely — the identity check was redundant anyway: nothing but this run's own finally block can ever write `runningSave` while it's active (anything else coalesces instead of creating a competing run), so the clear can just be unconditional. The `save:` code below reflects the fix; the version earlier in this section (written during planning) does not.
> 2. **Cross-test pollution via dangling promise chains.** `reset()` deliberately no longer clears `isSaving`/`isAutoSaving`/`runningSave`/`queuedFollowUp` (that's the whole point of the fix) — but the *test* helper `resetStores()` relied on `reset()` alone for a clean slate between tests. A test whose own coalesced follow-up chain wasn't explicitly awaited to completion (using the default mock, which resolves on its own schedule) left that chain running in the background past the test's end, mutating the *next* test's state mid-execution. Fixed by having `resetStores()` hard-clear those four fields directly via `setState`, independent of `reset()`'s own (intentionally softer) semantics.
> 3. **Two of the plan's own tests turned out to be the source of that pollution** — `"reschedules instead of going silent..."` and `"does not orphan a newer timer..."`, both originally scheduled for deletion in Task 3 Step 1. Since they broke *during* Task 2 (their behavior depends on `save()`, not on `resetAutoSaveTimer`, which Task 3 hasn't touched yet), their deletion was pulled forward into this task instead of waiting for Task 3. Task 3 Step 1 below is adjusted accordingly.
> 4. **One pre-existing test the plan didn't audit**: `reset > "clears saving flags"` asserted the *old* forced-clear behavior that `reset()` no longer has. Updated in place to assert the new (intentional) behavior instead.

**Files:**
- Modify: `packages/editor-ui/src/stores/saveStore.js`
- Test: `packages/editor-ui/src/stores/__tests__/saveStore.test.js`

**Interfaces:**
- Consumes: `isEqual` from Task 1.
- Produces: `save(isAuto)` returns `Promise<{status, error?}>` (see Global Constraints); new state fields `runningSave`, `queuedFollowUp`, `saveGeneration`; `reset()` no longer force-clears `isSaving`/`isAutoSaving`. `resetAutoSaveTimer`/`stopAutoSave` are untouched in this task (Task 3 rewrites the timer) — `resetAutoSaveTimer`'s existing timer-identity guard keeps working correctly against the new `save()` (it just won't get the backoff/simplification benefits until Task 3).

- [ ] **Step 1: Delete the four now-incompatible overlap tests**

Delete these four tests from the `describe("save", ...)` block (their exact call-then-await-immediately structure assumes the old silent-no-op behavior; Step 2 replaces them):
- `"does not start a second save while a manual save is already in flight"`
- `"does not let the 60s autosave timer's own save(true) call start while a manual save is in flight (the timer bypasses the \`save\` command entirely, so the guard must live here, not just at the command layer)"`
- `"does not let a manual save start while the 60s autosave timer's own save is already in flight (the reverse firing order)"`
- `"does not start an autosave while one is already in flight"`

- [ ] **Step 2: Write the new failing tests**

Add in their place (same `describe("save", ...)` block):

```js
    it("coalesces a repeated manual save call into one follow-up instead of overlapping", async () => {
      seedPageStore();
      useAutoSave.getState().markWidgetModified("w-1");

      let resolveFirst;
      savePageContent.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }));
      const first = useAutoSave.getState().save(false);

      const second = useAutoSave.getState().save(false); // a repeated trigger (held Ctrl+S) while isSaving is already true
      resolveFirst({});
      const [firstResult, secondResult] = await Promise.all([first, second]);

      expect(firstResult).toEqual({ status: "success" });
      expect(secondResult).toEqual({ status: "clean" }); // the coalesced follow-up found nothing left to do, not a silent drop
      expect(savePageContent).toHaveBeenCalledTimes(1);
    });

    it("coalesces a repeated autosave call into one follow-up instead of overlapping", async () => {
      seedPageStore();
      useAutoSave.getState().markWidgetModified("w-1");

      let resolveFirst;
      savePageContent.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }));
      const first = useAutoSave.getState().save(true);

      const second = useAutoSave.getState().save(true);
      resolveFirst({});
      const [firstResult, secondResult] = await Promise.all([first, second]);

      expect(firstResult).toEqual({ status: "success" });
      expect(secondResult).toEqual({ status: "clean" });
      expect(savePageContent).toHaveBeenCalledTimes(1);
    });

    it("coalesces a fresh edit that lands mid-flight into a follow-up that actually sends it, not a silent no-op", async () => {
      seedPageStore();
      useAutoSave.getState().markWidgetModified("w-1");

      let resolveFirst;
      savePageContent.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }));
      const first = useAutoSave.getState().save(false);
      expect(useAutoSave.getState().isSaving).toBe(true);

      useAutoSave.getState().markWidgetModified("w-2"); // not part of the first save's entry-time snapshot
      savePageContent.mockResolvedValueOnce({}); // the coalesced follow-up's own request

      const second = useAutoSave.getState().save(false);
      resolveFirst({});
      const [firstResult, secondResult] = await Promise.all([first, second]);

      expect(firstResult).toEqual({ status: "success" });
      expect(secondResult).toEqual({ status: "success" });
      expect(savePageContent).toHaveBeenCalledTimes(2); // the first save's own request, then the follow-up's
      expect(useAutoSave.getState().hasUnsavedChanges()).toBe(false);
    });

    it("does not let the 60s autosave timer's own save(true) call start while a manual save is in flight — coalesces into one follow-up instead", async () => {
      seedPageStore();
      useAutoSave.getState().markWidgetModified("w-1");
      usePageStore.temporal.setState({ pastStates: [{}, {}], futureStates: [{}] });
      const clearSpy = vi.spyOn(usePageStore.temporal.getState(), "clear");

      try {
        let resolveManual;
        savePageContent.mockImplementationOnce(() => new Promise((resolve) => { resolveManual = resolve; }));
        const manualSave = useAutoSave.getState().save(false);
        expect(useAutoSave.getState().isSaving).toBe(true);

        const autoAttempt = useAutoSave.getState().save(true); // simulates resetAutoSaveTimer's tick calling get().save(true) directly

        resolveManual({});
        const [manualResult, autoResult] = await Promise.all([manualSave, autoAttempt]);

        expect(manualResult).toEqual({ status: "success" });
        expect(autoResult).toEqual({ status: "clean" });
        expect(savePageContent).toHaveBeenCalledTimes(1);
        expect(clearSpy).toHaveBeenCalledTimes(1);
      } finally {
        clearSpy.mockRestore();
      }
    });

    it("does not let a manual save start while the 60s autosave timer's own save is already in flight (the reverse firing order) — coalesces into one follow-up instead", async () => {
      seedPageStore();
      useAutoSave.getState().markWidgetModified("w-1");
      usePageStore.temporal.setState({ pastStates: [{}, {}], futureStates: [{}] });
      const clearSpy = vi.spyOn(usePageStore.temporal.getState(), "clear");

      try {
        let resolveAuto;
        savePageContent.mockImplementationOnce(() => new Promise((resolve) => { resolveAuto = resolve; }));
        const autoSave = useAutoSave.getState().save(true);
        expect(useAutoSave.getState().isAutoSaving).toBe(true);

        const manualAttempt = useAutoSave.getState().save(false);

        resolveAuto({});
        const [autoResult, manualResult] = await Promise.all([autoSave, manualAttempt]);

        expect(autoResult).toEqual({ status: "success" });
        expect(manualResult).toEqual({ status: "clean" });
        expect(savePageContent).toHaveBeenCalledTimes(1);
        expect(clearSpy).toHaveBeenCalledTimes(1);
      } finally {
        clearSpy.mockRestore();
      }
    });

    it("abandons its write-back if reset() fires while the save is still in flight (discard-and-leave)", async () => {
      seedPageStore();
      useAutoSave.getState().markWidgetModified("w-1");
      const setOriginalPageSpy = vi.spyOn(usePageStore.getState(), "setOriginalPage");
      const clearSpy = vi.spyOn(usePageStore.temporal.getState(), "clear");

      try {
        let resolveSave;
        savePageContent.mockImplementationOnce(() => new Promise((resolve) => { resolveSave = resolve; }));
        const savePromise = useAutoSave.getState().save(false);

        useAutoSave.getState().reset(); // user confirms "discard changes" mid-flight

        resolveSave({});
        const result = await savePromise;

        expect(result).toEqual({ status: "abandoned" });
        expect(setOriginalPageSpy).not.toHaveBeenCalled();
        expect(clearSpy).not.toHaveBeenCalled();
      } finally {
        setOriginalPageSpy.mockRestore();
        clearSpy.mockRestore();
      }
    });

    it("rejects on a manual save failure so the caller's error handling (the toolbar's toast) fires", async () => {
      seedPageStore();
      useAutoSave.getState().markWidgetModified("w-1");
      savePageContent.mockRejectedValueOnce(new Error("network down"));

      await expect(useAutoSave.getState().save(false)).rejects.toThrow("network down");
      expect(useAutoSave.getState().isSaving).toBe(false);
      expect(useAutoSave.getState().hasUnsavedChanges()).toBe(true); // nothing cleared — safe to retry
    });

    it("does not reject on an autosave failure — resolves failed and stays retriable, logged not thrown", async () => {
      seedPageStore();
      useAutoSave.getState().markWidgetModified("w-1");
      savePageContent.mockRejectedValueOnce(new Error("network down"));
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      try {
        const result = await useAutoSave.getState().save(true);
        expect(result.status).toBe("failed");
        expect(result.error.message).toBe("network down");
        expect(useAutoSave.getState().isAutoSaving).toBe(false);
        expect(useAutoSave.getState().hasUnsavedChanges()).toBe(true);
      } finally {
        warnSpy.mockRestore();
      }
    });
```

Also update these three existing tests (add a `result`/status assertion; everything else in each test is unchanged):

In `"is a no-op when there are no unsaved changes"`:
```js
    it("is a no-op when there are no unsaved changes", async () => {
      seedPageStore();
      const result = await useAutoSave.getState().save();
      expect(result).toEqual({ status: "clean" });
      expect(useAutoSave.getState().lastSaved).toBeNull();
    });
```

In `"clears all modification flags after saving"`:
```js
    it("clears all modification flags after saving", async () => {
      seedPageStore();
      useAutoSave.getState().markWidgetModified("w-1");
      useAutoSave.getState().setStructureModified(true);
      useAutoSave.getState().setThemeSettingsModified(true);

      const result = await useAutoSave.getState().save();

      expect(result).toEqual({ status: "success" });
      expect(useAutoSave.getState().modifiedWidgets.size).toBe(0);
      expect(useAutoSave.getState().structureModified).toBe(false);
      expect(useAutoSave.getState().themeSettingsModified).toBe(false);
    });
```

In the `describe("project mismatch (PROJECT_MISMATCH)", ...)` block, `"marks the project stale and stops auto-save, without throwing"`:
```js
    it("marks the project stale and stops auto-save, without throwing", async () => {
      usePageStore.setState({ loadedProjectId: "other-project" });
      useAutoSave.getState().markWidgetModified("w-1");
      expect(useAutoSave.getState().autoSaveInterval).not.toBe(null);

      const result = await useAutoSave.getState().save(false);
      expect(result).toEqual({ status: "mismatch" });

      expect(useStaleProjectStore.getState().isStale).toBe(true);
      expect(useAutoSave.getState().autoSaveInterval).toBe(null);
    });
```

- [ ] **Step 3: Run and verify the new/changed tests fail**

Run: `npx vitest run packages/editor-ui/src/stores/__tests__/saveStore.test.js`
Expected: the new coalescing/abandonment/reject-vs-resolve tests fail (current `save()` still uses the old `isSaving||isAutoSaving` boolean guard, has no `saveGeneration`, and never rethrows). The three modified existing tests fail on their new `result`/status assertions (current `save()` returns `undefined`).

- [ ] **Step 4: Implement**

Replace `save`'s and `reset`'s definitions in `saveStore.js`, and add the new state fields, exactly as follows (this replaces from the `// State` block's `autoSaveInterval: null,` line through the end of the `save:` method, and separately the `reset:` method):

State additions (add after `autoSaveInterval: null,`):

```js
  runningSave: null,
  queuedFollowUp: null,
  saveGeneration: 0,
```

Replace the entire `save:` method:

```js
  save: async (isAuto = false) => {
    const { runningSave, queuedFollowUp } = get();

    // A save is already executing: coalesce into a single queued follow-up
    // instead of overlapping OR silently no-oping — every caller who arrives
    // during this window awaits the SAME next run and gets its real outcome,
    // rather than a repeated click racing the in-flight request or being
    // dropped on the floor with no signal either way.
    if (runningSave) {
      if (queuedFollowUp) return queuedFollowUp;
      const followUp = runningSave.then(
        () => get().save(isAuto),
        () => get().save(isAuto),
      );
      set({ queuedFollowUp: followUp });
      return followUp;
    }

    if (!get().hasUnsavedChanges()) return { status: "clean" };

    // Captured now so a reset() that fires while this save is in flight can
    // be detected before any write-back below applies — see reset()'s comment.
    const myGeneration = get().saveGeneration;

    if (isAuto) {
      set({ isAutoSaving: true });
    } else {
      set({ isSaving: true });
    }

    const run = (async () => {
      const { modifiedWidgets, structureModified, themeSettingsModified } = get();
      const pageStore = usePageStore.getState();
      const { page, globalWidgets } = pageStore;
      const themeStore = useThemeStore.getState();
      const themeSettings = themeStore.settings;

      try {
        const activeProject = useProjectStore.getState().activeProject;
        const loadedProjectId = pageStore.loadedProjectId;

        if (activeProject && loadedProjectId && activeProject.id !== loadedProjectId) {
          const mismatchError = new Error("Project mismatch");
          mismatchError.code = "PROJECT_MISMATCH";
          throw mismatchError;
        }

        // Phase 1: mismatch-guarded writes (page content + global widgets)
        const guardedPromises = [];

        const hasHeaderDiff =
          globalWidgets.header && pageStore.originalGlobalWidgets.header
            ? !isEqual(globalWidgets.header, pageStore.originalGlobalWidgets.header)
            : false;
        const hasFooterDiff =
          globalWidgets.footer && pageStore.originalGlobalWidgets.footer
            ? !isEqual(globalWidgets.footer, pageStore.originalGlobalWidgets.footer)
            : false;

        if (globalWidgets.header && (modifiedWidgets.has("header") || hasHeaderDiff)) {
          guardedPromises.push(saveGlobalWidget("header", globalWidgets.header));
        }
        if (globalWidgets.footer && (modifiedWidgets.has("footer") || hasFooterDiff)) {
          guardedPromises.push(saveGlobalWidget("footer", globalWidgets.footer));
        }

        const hasPageWidgetChanges = [...modifiedWidgets].some((id) => id !== "header" && id !== "footer");
        const hasPageDiff = page && pageStore.originalPage ? !isEqual(page, pageStore.originalPage) : false;
        if (page && (hasPageWidgetChanges || structureModified || hasPageDiff)) {
          guardedPromises.push(savePageContent(page.id, page));
        }

        await Promise.all(guardedPromises);

        // Phase 2: theme settings via themeStore's canonical save path.
        const hasThemeDrift = themeStore.hasUnsavedThemeChanges();
        if ((themeSettingsModified || hasThemeDrift) && themeSettings && activeProject) {
          await useThemeStore.getState().saveSettings(activeProject.id);
        }

        if (activeProject) {
          invalidateMediaCache(activeProject.id);
        }

        // A reset() (discard-and-leave) fired while the above was in flight —
        // the content just sent is exactly what the user chose to discard.
        // Skip every write-back below; nothing here should apply.
        if (get().saveGeneration !== myGeneration) {
          return { status: "abandoned" };
        }

        set((state) => {
          const remaining = new Set(state.modifiedWidgets);
          for (const id of modifiedWidgets) remaining.delete(id);
          return {
            modifiedWidgets: remaining,
            structureModified: false,
            themeSettingsModified: false,
            lastSaved: new Date(),
          };
        });

        if (page) {
          pageStore.setOriginalPage(page);
        }
        pageStore.setOriginalGlobalWidgets(globalWidgets);
        usePageStore.temporal.getState().clear();

        return { status: "success" };
      } catch (err) {
        if (err.code === "PROJECT_MISMATCH") {
          useStaleProjectStore.getState().markStale();
          get().stopAutoSave();
          return { status: "mismatch" };
        }
        // Manual saves rethrow so the caller (the toolbar's dispatch) can
        // show its existing error toast; autosave failures stay silent —
        // interrupting the user mid-edit for a background retry would be
        // worse than the failure itself — and are retried with backoff by
        // resetAutoSaveTimer's tick instead.
        if (!isAuto) throw err;
        console.warn("[autosave] save failed, will retry:", err);
        return { status: "failed", error: err };
      } finally {
        if (isAuto) {
          set({ isAutoSaving: false });
        } else {
          set({ isSaving: false });
        }
        // Unconditional, not identity-checked against `run` (see this
        // task's post-execution note above — the identity check caused a
        // real TDZ ReferenceError, and turned out to be unnecessary):
        // nothing else can ever install a competing value here while this
        // run is active — any other save() call during this window hits the
        // coalescing branch above instead of creating an independent run —
        // so `runningSave` can only ever be referring to this run by the
        // time its own finally executes.
        set({ runningSave: null, queuedFollowUp: null });
      }
    })();

    set({ runningSave: run });
    return run;
  },
```

Replace the entire `reset:` method:

```js
  reset: () => {
    const { stopAutoSave, saveGeneration } = get();
    stopAutoSave();
    // isSaving/isAutoSaving/runningSave/queuedFollowUp are deliberately NOT
    // force-cleared here. An in-flight save (if any) owns its own bookkeeping
    // cleanup in its finally block regardless of generation — forcing them
    // false while the real network request is still pending is what let a
    // stale save race a fresh one. Bumping saveGeneration is what makes that
    // in-flight save's eventual write-back a no-op; its own execution still
    // runs to completion.
    set({
      saveGeneration: saveGeneration + 1,
      lastSaved: null,
      modifiedWidgets: new Set(),
      structureModified: false,
      themeSettingsModified: false,
    });
  },
```

- [ ] **Step 5: Run and verify all pass**

Run: `npx vitest run packages/editor-ui/src/stores/__tests__/saveStore.test.js`
Expected: all pass.

- [ ] **Step 6: Run the full frontend suite**

Run: `npm run test:frontend`
Expected: all pass (checks nothing outside this file broke — e.g. `EditorTopBar.test.jsx`, `PrimaryActionControl.test.jsx`, `toolbar.test.js` all call `save()`/read `isSaving` and must still behave correctly).

- [ ] **Step 7: Commit**

```bash
git add packages/editor-ui/src/stores/saveStore.js packages/editor-ui/src/stores/__tests__/saveStore.test.js
git commit -m "fix: single-flight save() queue + generation-gated reset() in saveStore"
```

---

### Task 3: `resetAutoSaveTimer` simplification + backoff

**Files:**
- Modify: `packages/editor-ui/src/stores/saveStore.js`
- Test: `packages/editor-ui/src/stores/__tests__/saveStore.test.js`

**Interfaces:**
- Consumes: `save()`'s new status-returning contract from Task 2.
- Produces: new `autoSaveFailureCount` state field; `resetAutoSaveTimer`'s tick no longer captures/compares a timer-identity token.

- [ ] **Step 1: (already done, during Task 2 — see its post-execution note) Confirm the two obsolete tests are gone**

`"does not orphan a newer timer..."` and `"reschedules instead of going silent..."` were deleted during Task 2, not here — real execution showed they were the source of cross-test pollution against the new `save()`, one task earlier than this plan originally assumed. Nothing to do in this step; just confirm via `grep` that neither name appears in `saveStore.test.js` before proceeding to Step 2.

`"does not defeat save()'s own stopAutoSave() (PROJECT_MISMATCH) by rescheduling anyway once the tick's save resolves"` is unchanged and still present — its assertions (`autoSaveInterval` stays `null`, no reschedule) hold under the new implementation too; kept as regression coverage.

- [ ] **Step 2: Write the new/updated failing tests**

Add a new `describe("resetAutoSaveTimer — backoff", ...)` block:

```js
  describe("resetAutoSaveTimer — backoff", () => {
    it("increases the delay after a failed autosave attempt and resets it after a success", async () => {
      seedPageStore();
      useAutoSave.getState().markWidgetModified("w-1");

      savePageContent.mockRejectedValueOnce(new Error("down"));
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      try {
        await vi.advanceTimersByTimeAsync(60000); // base delay
        expect(useAutoSave.getState().autoSaveFailureCount).toBe(1);

        savePageContent.mockRejectedValueOnce(new Error("still down"));
        await vi.advanceTimersByTimeAsync(120000); // backed off for failureCount=1
        expect(useAutoSave.getState().autoSaveFailureCount).toBe(2);

        savePageContent.mockResolvedValueOnce({});
        await vi.advanceTimersByTimeAsync(240000); // backed off for failureCount=2
        expect(useAutoSave.getState().autoSaveFailureCount).toBe(0);
      } finally {
        warnSpy.mockRestore();
      }
    });

    it("resets the failure count on a fresh edit, not just on success", () => {
      useAutoSave.setState({ autoSaveFailureCount: 3 });
      useAutoSave.getState().markWidgetModified("w-1");
      expect(useAutoSave.getState().autoSaveFailureCount).toBe(0);
    });
  });
```

Add one new test to `describe("resetAutoSaveTimer", ...)`:

```js
    it("does not double-schedule when a fresh edit already re-armed the timer while the tick's own save was in flight", async () => {
      seedPageStore();
      useAutoSave.getState().markWidgetModified("w-1");

      let resolveSave;
      savePageContent.mockImplementationOnce(() => new Promise((resolve) => { resolveSave = resolve; }));

      await vi.advanceTimersByTimeAsync(60000); // tick fires, its own save(true) hangs mid-flight
      expect(useAutoSave.getState().isAutoSaving).toBe(true);

      useAutoSave.getState().markWidgetModified("w-2"); // re-arms its own timer while the tick's save is still in flight
      const rearmedTimer = useAutoSave.getState().autoSaveInterval;

      resolveSave({});
      await vi.advanceTimersByTimeAsync(0); // let the tick's save() resolve and its reschedule-check run

      expect(useAutoSave.getState().autoSaveInterval).toBe(rearmedTimer); // untouched — not clobbered, not doubled
      expect(vi.getTimerCount()).toBe(1);
    });
```

- [ ] **Step 3: Run and verify**

Run: `npx vitest run packages/editor-ui/src/stores/__tests__/saveStore.test.js -t "backoff|double-schedule"`
Expected: the backoff tests fail (`autoSaveFailureCount` doesn't exist yet, delay is always 60000). The double-schedule test **may already pass** against the current (Task-2-only) code — Task 2 didn't touch `resetAutoSaveTimer`, so its existing timer-identity guard (from the prior session's round-8 fix) already handles this specific scenario correctly. That's expected; it stands as regression coverage for Task 3's refactor. Confirm it either fails or passes for the right reason (read the assertion, don't just trust green) before proceeding.

- [ ] **Step 4: Implement**

Add the two constants near the top of the file (after the imports):

```js
const BASE_AUTOSAVE_DELAY_MS = 60000;
const MAX_AUTOSAVE_DELAY_MS = 600000;

function autosaveDelay(failureCount) {
  return Math.min(BASE_AUTOSAVE_DELAY_MS * 2 ** failureCount, MAX_AUTOSAVE_DELAY_MS);
}
```

Add `autoSaveFailureCount: 0,` to the state block (after `saveGeneration: 0,`).

In `markWidgetModified`, `setStructureModified`, and `setThemeSettingsModified`, reset the failure count alongside the existing `resetAutoSaveTimer()` call. E.g. `markWidgetModified` becomes:

```js
  markWidgetModified: (widgetId) => {
    const { modifiedWidgets, resetAutoSaveTimer } = get();
    const newSet = new Set(modifiedWidgets);
    newSet.add(widgetId);
    set({ modifiedWidgets: newSet, autoSaveFailureCount: 0 });
    resetAutoSaveTimer();
  },
```

`setStructureModified`/`setThemeSettingsModified` each add `set({ autoSaveFailureCount: 0 });` right before their existing `get().resetAutoSaveTimer();` call, inside the `if (modified) { ... }` block.

Replace the entire `resetAutoSaveTimer:` method:

```js
  resetAutoSaveTimer: () => {
    const { autoSaveInterval, autoSaveFailureCount } = get();

    if (autoSaveInterval) {
      clearTimeout(autoSaveInterval);
    }

    const timeout = setTimeout(async () => {
      // This timer already fired — nothing left to cancel for it
      // specifically. Clear the tracked id immediately so a fresh edit's own
      // resetAutoSaveTimer() call (which may run synchronously, or during
      // the save() await below) can freely arm its own timer without any
      // risk of this tick clobbering it afterward.
      set({ autoSaveInterval: null });

      if (get().hasUnsavedChanges()) {
        const result = await get().save(true);
        if (result.status === "failed") {
          set((s) => ({ autoSaveFailureCount: s.autoSaveFailureCount + 1 }));
        } else if (result.status === "success") {
          set({ autoSaveFailureCount: 0 });
        } else if (result.status === "mismatch" || result.status === "abandoned") {
          // An intentional stop happened during this attempt (PROJECT_MISMATCH's
          // own stopAutoSave(), or a reset() from discard-and-leave) — do not
          // reschedule, that would defeat it.
          return;
        }
      }

      // Reschedule only if nothing else already armed a timer while the
      // above was in flight (a fresh edit's own resetAutoSaveTimer() call).
      if (get().autoSaveInterval == null && get().hasUnsavedChanges()) {
        get().resetAutoSaveTimer();
      }
    }, autosaveDelay(autoSaveFailureCount));

    set({ autoSaveInterval: timeout });
  },
```

- [ ] **Step 5: Run and verify all pass**

Run: `npx vitest run packages/editor-ui/src/stores/__tests__/saveStore.test.js`
Expected: all pass.

- [ ] **Step 6: Run the full frontend suite**

Run: `npm run test:frontend`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add packages/editor-ui/src/stores/saveStore.js packages/editor-ui/src/stores/__tests__/saveStore.test.js
git commit -m "fix: simplify resetAutoSaveTimer and add retry backoff in saveStore"
```

---

### Task 4: Undo/redo integration

**Files:**
- Modify: `packages/editor-ui/src/stores/saveStore.js`, `packages/editor-ui/src/components/pageEditor/EditorTopBar.jsx`
- Test: `packages/editor-ui/src/stores/__tests__/saveStore.test.js`, `packages/editor-ui/src/components/pageEditor/__tests__/EditorTopBar.test.jsx`

**Interfaces:**
- Consumes: `markWidgetModified`/`markWidgetUnmodified` (existing), `isEqual` (Task 1).
- Produces: new store action `reconcileModifiedWidgets()`; `EditorTopBar.jsx`'s `safeUndo`/`safeRedo` call it after every temporal jump.

- [ ] **Step 1: Write the failing tests (store level)**

Add a new `describe("reconcileModifiedWidgets", ...)` block to `saveStore.test.js`:

```js
  describe("reconcileModifiedWidgets", () => {
    it("marks a widget modified when its content differs from the saved baseline", () => {
      const page = seedPageStore();
      usePageStore.setState({
        page: { ...page, widgets: { ...page.widgets, "w-1": { ...page.widgets["w-1"], settings: { text: "changed" } } } },
      });
      useAutoSave.getState().reconcileModifiedWidgets();
      expect(useAutoSave.getState().modifiedWidgets.has("w-1")).toBe(true);
    });

    it("clears a widget's modified flag when its content matches the saved baseline again (undo reverted it)", () => {
      seedPageStore();
      useAutoSave.getState().markWidgetModified("w-1"); // simulate a prior edit; content itself is unchanged from the seed baseline
      useAutoSave.getState().reconcileModifiedWidgets();
      expect(useAutoSave.getState().modifiedWidgets.has("w-1")).toBe(false);
    });

    it("re-arms the autosave timer when it marks a widget modified", () => {
      const page = seedPageStore();
      usePageStore.setState({
        page: { ...page, widgets: { ...page.widgets, "w-1": { ...page.widgets["w-1"], settings: { text: "changed" } } } },
      });
      expect(useAutoSave.getState().autoSaveInterval).toBeNull();
      useAutoSave.getState().reconcileModifiedWidgets();
      expect(useAutoSave.getState().autoSaveInterval).not.toBeNull();
    });

    it("reconciles header/footer against originalGlobalWidgets", () => {
      const header = { type: "header", settings: { text: "v1" }, blocks: {}, blocksOrder: [] };
      usePageStore.setState({
        globalWidgets: { header: { ...header, settings: { text: "v2" } }, footer: null },
        originalGlobalWidgets: { header, footer: null },
      });
      useAutoSave.getState().reconcileModifiedWidgets();
      expect(useAutoSave.getState().modifiedWidgets.has("header")).toBe(true);
    });
  });
```

- [ ] **Step 2: Verify these fail**

Run: `npx vitest run packages/editor-ui/src/stores/__tests__/saveStore.test.js -t "reconcileModifiedWidgets"`
Expected: FAIL — `reconcileModifiedWidgets` is not a function yet.

- [ ] **Step 3: Implement `reconcileModifiedWidgets` in `saveStore.js`**

Add as a new action (near `markWidgetUnmodified`):

```js
  // Diffs the current page/global-widget content against the last-saved
  // baseline and reconciles modifiedWidgets to match — the one place that
  // handles dirtiness NOT introduced through markWidgetModified (undo/redo,
  // called by EditorTopBar's safeUndo/safeRedo after the temporal jump).
  // Unlike markWidgetModified, this can also CLEAR a widget's dirty flag
  // (when undo reverts it back to exactly its saved state).
  reconcileModifiedWidgets: () => {
    const { markWidgetModified, markWidgetUnmodified } = get();
    const { page, originalPage, globalWidgets, originalGlobalWidgets } = usePageStore.getState();

    if (page && originalPage) {
      const ids = new Set([...Object.keys(page.widgets ?? {}), ...Object.keys(originalPage.widgets ?? {})]);
      for (const id of ids) {
        if (!isEqual(page.widgets?.[id], originalPage.widgets?.[id])) {
          markWidgetModified(id);
        } else {
          markWidgetUnmodified(id);
        }
      }
    }

    for (const key of ["header", "footer"]) {
      if (!isEqual(globalWidgets[key], originalGlobalWidgets[key])) {
        markWidgetModified(key);
      } else {
        markWidgetUnmodified(key);
      }
    }
  },
```

- [ ] **Step 4: Run and verify the store-level tests pass**

Run: `npx vitest run packages/editor-ui/src/stores/__tests__/saveStore.test.js`
Expected: all pass.

- [ ] **Step 5: Write the failing tests (EditorTopBar wiring)**

Add to `EditorTopBar.test.jsx`:

```js
  it("reconciles modifiedWidgets after Ctrl+Z (undo) so a revert-to-clean isn't left falsely dirty", () => {
    const reconcileModifiedWidgets = vi.fn();
    useAutoSave.setState({ reconcileModifiedWidgets });
    usePageStore.temporal.setState({
      pastStates: [{ page: { id: "home", widgets: {} } }],
      futureStates: [],
    });
    renderTopBar();
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(reconcileModifiedWidgets).toHaveBeenCalled();
  });

  it("reconciles modifiedWidgets after Ctrl+Shift+Z (redo)", () => {
    const reconcileModifiedWidgets = vi.fn();
    useAutoSave.setState({ reconcileModifiedWidgets });
    usePageStore.temporal.setState({
      pastStates: [],
      futureStates: [{ page: { id: "home", widgets: {} } }],
    });
    renderTopBar();
    fireEvent.keyDown(window, { key: "z", ctrlKey: true, shiftKey: true });
    expect(reconcileModifiedWidgets).toHaveBeenCalled();
  });
```

Need `usePageStore` imported in this test file — add `import usePageStore from "../../../stores/pageStore.js";` alongside the existing `useAutoSave`/`useProjectStore` imports if not already present.

- [ ] **Step 6: Verify these fail**

Run: `npx vitest run packages/editor-ui/src/components/pageEditor/__tests__/EditorTopBar.test.jsx -t "reconciles modifiedWidgets"`
Expected: FAIL — `safeUndo`/`safeRedo` don't call it yet.

- [ ] **Step 7: Implement in `EditorTopBar.jsx`**

```jsx
  const safeUndo = useCallback(() => {
    const { pastStates, undo } = usePageStore.temporal.getState();
    if (pastStates.length > 0 && pastStates[pastStates.length - 1]?.page) {
      undo();
      // Push the restored theme snapshot back to themeStore (canonical owner)
      usePageStore.getState().syncThemeStoreFromSnapshot();
      useAutoSave.getState().reconcileModifiedWidgets();
    }
  }, []);

  const safeRedo = useCallback(() => {
    const { redo } = usePageStore.temporal.getState();
    redo();
    // Push the restored theme snapshot back to themeStore (canonical owner)
    usePageStore.getState().syncThemeStoreFromSnapshot();
    useAutoSave.getState().reconcileModifiedWidgets();
  }, []);
```

- [ ] **Step 8: Run and verify all pass**

Run: `npx vitest run packages/editor-ui/src/components/pageEditor/__tests__/EditorTopBar.test.jsx`
Expected: all pass.

- [ ] **Step 9: Run the full frontend suite**

Run: `npm run test:frontend`
Expected: all pass.

- [ ] **Step 10: Commit**

```bash
git add packages/editor-ui/src/stores/saveStore.js packages/editor-ui/src/stores/__tests__/saveStore.test.js packages/editor-ui/src/components/pageEditor/EditorTopBar.jsx packages/editor-ui/src/components/pageEditor/__tests__/EditorTopBar.test.jsx
git commit -m "fix: integrate undo/redo with saveStore's dirty-tracking"
```
