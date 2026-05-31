# Collections — Implementation Blockers

> **Status: 🚫 BLOCKED.** Do **not** start implementing the Collections feature
> ([future-collections.md](future-collections.md) spec /
> [future-collections-plan.md](future-collections-plan.md) execution plan) until **every**
> blocker in this document is marked **RESOLVED**. A blocker is only RESOLVED once the chosen
> remediation has been written back into the spec — not merely decided in conversation. This is
> the hard prerequisite for **Gate 0** (spec Section 19) and **Phase 0** of the plan.

This document is a companion to the Collections spec and plan. The spec describes *what to build*;
this document tracks *what must be settled before any of it is built*. It exists because the spec
contains at least one latent design conflict that would cause **silent data loss** if implemented
as currently written.

---

## How to use this document

- Each blocker has a stable ID (`BLOCKER-N`), a severity, a status, and a **What a fix must address**
  section.
- A blocker moves to **RESOLVED** only when the agreed remediation is folded into
  [future-collections.md](future-collections.md) (and the plan, where relevant). A verbal "we'll
  handle it" is not enough — the gate is cleared by written spec changes.
- **Append new blockers here as they are discovered.** Implementation stays gated until the whole
  list is RESOLVED.
- "BLOCKED" does not mean the feature is cancelled. It means the design is not yet safe to build.

## Blocker registry

| ID          | Title                                                                 | Severity                         | Status         |
| ----------- | --------------------------------------------------------------------- | -------------------------------- | -------------- |
| BLOCKER-1   | Preset collection-type overrides are destroyed by theme updates       | High — silent schema revert + data loss | ❌ UNRESOLVED  |

---

## BLOCKER-1 — Preset collection-type overrides are destroyed by theme updates

- **Severity:** High — silent schema reversion and user data loss, no warning to the user.
- **Status:** ❌ UNRESOLVED
- **Discovered:** 2026-05-29
- **Affects:** Spec Section 5 (Theme Updates and Collection Lifecycle → Preset Seeding) and
  Section 4 (Schema Versioning and Migration).

### Summary

The spec gives presets the power to override a collection type's schema at project-creation time
(spec Section 5, "Preset Seeding": *"copy it into the project, **overwriting** the theme's
defaults"*). It separately puts `collection-types/` in the theme-update allowlist, to be replaced
**wholesale from the theme source** like `widgets/` (spec Section 5, "Theme Update Allowlist":
*"Treat it like `widgets/` — the entire folder is replaced on update"*).

These two decisions conflict. Theme updates never read from `presets/` — they read only the theme
source dir (`getThemeSourceDir`, [server/services/themeUpdateService.js:193](../server/services/themeUpdateService.js#L193)).
So the **first** theme update applied to a preset-derived project will:

1. **Not** propagate any change made to the *preset's* collection-type definition, and
2. Worse — **overwrite the project's preset-derived schema with the theme's base schema**, discarding
   the preset's overrides entirely.

Combined with the schema-migration rules in Section 4, this then **silently drops user data** that
was entered into preset-specific fields.

### Why it happens (mechanism)

The destructive copy is already in the existing update code and is what the spec says to reuse:

```js
// server/services/themeUpdateService.js:212-214 — runs per entry in UPDATABLE_PATHS
await fs.remove(targetPath);            // wipe the project's copy
await fs.copy(sourcePath, targetPath);  // replace with the THEME source copy
```

- `UPDATABLE_PATHS` today is `["layout.liquid", "assets", "widgets", "snippets", "locales", "screenshot.png"]`
  ([themeUpdateService.js:21](../server/services/themeUpdateService.js#L21)). The spec adds
  `collection-types` to this list (Section 5).
- The source is always the theme (`latest/` or root), never a preset
  ([themeUpdateService.js:193](../server/services/themeUpdateService.js#L193)). Presets are
  consulted **only** at project creation, via `resolvePresetPaths` — confirmed by the implemented
  presets feature: *"Presets are only used at project creation time. Once a project is created, it's
  independent."* ([theme-presets.md:142](theme-presets.md)).

So at creation the project's `collection-types/` is the **preset's** version (with its extra
fields); at first update that folder is removed and replaced by the **theme's base** version.

### Failure scenario (concrete)

Both the theme and a preset define a collection type `posts`. The preset's `posts` schema adds an
extra `subtitle` field on top of the theme's base `posts` schema. A theme update later adds another
field, `reading_time`, to the **preset's** `posts` definition.

1. A user creates a project from this preset. The project's `collection-types/posts/schema.json` is
   the preset version (has `subtitle`). The user authors several posts and fills in `subtitle`.
2. The user applies a theme update.
3. `applyThemeUpdate` removes `collection-types/` and copies the **theme's** `posts` schema (which
   has neither `subtitle` nor `reading_time`).
4. Result: the project now tracks the theme's base `posts` schema. The new `reading_time` field
   **never appears** (it lived only in the preset). The preset's original `subtitle` field is **gone**.
5. On next read, Section 4 normalization sees `subtitle` is no longer in the schema, moves its value
   to the **in-memory-only `_archived` map**, and flags nothing to the user. On the next save of each
   item, the archived data is **dropped permanently** (the spec is explicit that `_archived` is never
   written to disk).

The user loses authored content and gets a silently downgraded schema, with no warning.

### Impact

- **Silent schema reversion**: preset-specific collection types/fields disappear on the first update.
- **Silent data loss**: values entered into preset-only fields are archived in memory and then
  discarded on the next save (spec Section 4).
- **Confusing author experience**: theme authors who add fields to a *preset's* collection type will
  see those fields never reach existing projects, with no error explaining why.
- **No mitigation in the current spec**: Section 5 does not acknowledge this interaction at all.

### What a fix must address

Any accepted remediation must answer all of the following, in writing, in the spec:

1. **Source of truth on update.** When a preset-derived project updates, which `collection-types/`
   wins — the theme's, the preset's, or a merge? Define it precisely.
2. **Where the preset version comes from at update time.** Updates currently never touch `presets/`.
   The project *does* persist its preset id (`projects.preset` column, written at
   [server/controllers/projectController.js:222](../server/controllers/projectController.js#L222)),
   so re-resolving the preset is feasible (preset persisted at
   [server/db/migrations.js:15](../server/db/migrations.js#L15)) — but the fallback rules must be specified (what if the
   preset was renamed or removed in the newer theme version? what if `presets/` is absent from the
   update source?).
3. **Interaction with Section 4 migration.** Whatever survives the update must not trip the
   `_archived` silent-drop path for fields the user legitimately still has. If data could still be
   dropped, the user must be warned (the spec currently drops silently).
4. **Consistency with the rest of the update model.** `theme.json` is *merged* (user-wins); widgets
   are *replaced*. Decide which model collection-type schemas follow and justify it.

### Candidate approaches (none chosen — a decision is required)

These are options to evaluate, not a recommendation:

- **A — Re-resolve the preset on update.** Teach `applyThemeUpdate` to read the project's stored
  `preset` and prefer the preset's `collection-types/` over the theme's during the replace. Pulls
  presets into the update path for the first time; needs explicit fallback rules.
- **B — Merge instead of replace.** Treat collection-type schemas like `theme.json` (additive,
  id-keyed, preset/user-wins) rather than a wholesale folder replace. Needs defined array-merge
  semantics and must dovetail with Section 4.
- **C — Forbid preset overrides of collection-types.** Collection *types* become theme-only; presets
  may seed only `collections/` (item data), never `collection-types/`. Removes the conflict by
  removing the capability. Simplest; document as a hard limitation and update Section 5 accordingly.
- **D — Snapshot preset schemas as protected project content.** Copy preset `collection-types/` into
  a project-owned, update-protected location and treat them like user content. Heaviest; changes the
  protected/updatable boundary.

### Acceptance / how to clear this blocker

- One approach (or another) is chosen and written into spec Section 5 (and Section 4 where the
  migration interaction is touched).
- Spec Section 19 Gate 0 and plan Phase 0 are updated to reference the resolution.
- Status here is flipped to ✅ RESOLVED with a one-line pointer to the spec section that now covers it.

---

## Adding a new blocker

Copy the `BLOCKER-1` structure, give it the next ID, add a row to the registry table, and keep its
status ❌ UNRESOLVED until the remediation is written into the spec. The feature stays gated while
**any** row is unresolved.