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
