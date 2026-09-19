# Review status and follow-ups

[Review questions](review-questions.md) · [Map](README.md) · [Coverage](coverage.md)

Updated 2026-09-19 (R1 and R3 reviewed). This is the handoff summary; the review questions retain the reasoning and evidence. Update an item's status when it is reviewed, and replace an uncommitted status with the fix commit when available.

**Priority describes the next action, not proof of a bug.** High means check before the stated release or deployment milestone; Medium means planned follow-up; Low means revisit when its trigger occurs. “Before launch” below applies when that feature is included in the launch. Future scaling work does not block a single-process MVP.

## R1 — Image usage and safe deletion

**OSS status:** Implemented and reviewed for participating operations within one backend process. The reported review defects are fixed. Fixed in `ae8102a3`.

Deletion checks saved content, refuses incomplete verification, and coordinates with participating writes. Saves distinguish saved content with stale usage tracking from a rejected missing-image reference. The usage label can remain stale until refreshed.

**Verification:** independent review ran 16 backend review cases and 102 save-store tests successfully. The implementation agent reported 1,809 backend and 1,539 frontend tests passing, plus targeted lint. Full lint still has the pre-existing theme-deletion-marker parsing errors. Regression tests live in [mediaDeletionSafety.test.js](../../packages/builder-server/src/tests/mediaDeletionSafety.test.js) and [saveStore.test.js](../../packages/editor-ui/src/stores/__tests__/saveStore.test.js).

### OSS follow-ups

| Point | Priority | When to check | Next action |
| --- | --- | --- | --- |
| Copy and structural operations outside content coordination | Medium | During R4/R6 reviews, before claiming protection for every write path | Narrowed during R3: collection duplicate/discard/version and language add/remove now participate. Still outside: link enrichment and the structural flows (project create, duplicate, import, theme update). Check overlapping copy, removal and deletion; coordinate any demonstrated gaps. |
| Pending edits saved after a backend restart | Low | Before release acceptance for save recovery; revisit sooner if reproduced in ordinary use | Record the accepted limitation or design recovery: deleted-path memory ends on restart, while an editor's pending work may survive. |
| One common save-result/write contract | Low | When a concrete change would otherwise duplicate these rules again | Evaluate then; no broad refactor is required to finish the current fix. |

### Hosted follow-ups — generic integration checklist

These are requirements for any application embedding the public packages, not a description of a private deployment.

| Point | Priority | When to check | Next action |
| --- | --- | --- | --- |
| Custom save handlers that can write media references | High | Before launching with the media-safety change | Ensure they use the same coordination and deleted-reference validation as shared deletion, and return usage warnings. An independent lock does not coordinate them. |
| Integration tests with the host's adapters | High | Before deploying the package update | Test failed usage sync, unreadable content, overlapping saves/deletes and waiting saves; verify user feedback and tenant isolation. Record the exact OSS revision tested. |
| More than one backend process writing the same project | Deferred | Before enabling multiple writers, including overlapping deployment instances | Establish coordination across processes. No work is needed for this point while all relevant writes remain in one process. |
| Restart behavior and deleted-path memory | Low | Before launch operations review; revisit with uptime/deletion-volume evidence | Make the restart limitation explicit and assess process-lifetime retention. Any future memory bound must refuse unverifiable writes rather than silently discard protection. |

**Closure:** the reviewed OSS change is implemented; follow-ups above remain separate. Multi-process support is not a blocker for a single-process MVP. The complete participation boundary is in [media operations](operations/media.md#delete-or-bulk-delete). R3 generalised this fix's per-project media section into the shared content-write section, so the two items share one mechanism (`contentCoordination`).

## R3 — Removing a language while someone is editing it

**OSS status:** Implemented and reviewed. A content write addressed to a removed language is refused rather than recreating it, and the editor keeps the work, stops retrying and explains. Fixed in `92eb3481`.

Confirmed defects, all reproduced before fixing and each covered by a regression that was verified to fail without its fix: a page content save and a page language version wrote into a removed language; the listing-anchor sweep and the menu uuid backfill wrote outside the section that checked; collection delete recreated an order file; the common "request arrived after removal" ordering answered a bare 400 that the editor could not act on; autosave restarted itself after being stopped; project revalidation cleared the language warning; and the first recovery wording offered steps that could not preserve the draft.

**Verification:** 1,826 backend and 1,557 frontend tests pass, plus targeted lint. Full lint still has the pre-existing theme-deletion-marker parsing errors. Regression tests live in [languageLifecycle.test.js](../../packages/builder-server/src/tests/languageLifecycle.test.js), [saveStore.test.js](../../packages/editor-ui/src/stores/__tests__/saveStore.test.js), [StaleProjectCurtain.test.jsx](../../packages/editor-ui/src/components/ui/__tests__/StaleProjectCurtain.test.jsx) and [useStaleActiveProjectDetection.test.js](../../packages/editor-ui/src/hooks/__tests__/useStaleActiveProjectDetection.test.js).

### OSS follow-ups

| Point | Priority | When to check | Next action |
| --- | --- | --- | --- |
| Automatic draft recovery | Medium | When deciding how much unsaved work the editor should survive losing | Today the draft is reachable, not rescued: the banner leaves the editor readable so it can be copied out, and nothing preserves it automatically. A real fix is its own feature — stash the draft locally and offer it back, or let it be exported. Not a requirement for closing this fix. |
| Two editor windows on the same removed language | Low | If reported, or before supporting multi-window editing as a workflow | Only one window is covered by tests. The refusal is per request so both should behave the same, but that is reasoning, not evidence. |
| Empty language folders survive removal | Low | During a tidy-up pass, or if a folder scan is ever given meaning | Removal empties `pages/<lang>/`, its `global/` and collection folders but leaves the directories. Harmless to every current reader, and noted so a future scan does not mistake one for content. |
| Concurrency tests must be proven to fail without their fix | High | Every time a concurrency test is added | Three tests in this review passed against the reintroduced bug, for three different staging mistakes. Sabotage the fix and watch the test fail before trusting it. `Object.create(adapter)` is not a usable test proxy here — the local adapters use private class fields, so inherited methods throw and callers that swallow read errors take a silent early exit; use a `Proxy` with bound methods. |

### Hosted follow-ups — generic integration checklist

These are requirements for any application embedding the public packages, not a description of a private deployment.

| Point | Priority | When to check | Next action |
| --- | --- | --- | --- |
| Custom writes addressed to a language | High | Before launching with the language-removal change | Any handler that writes language-addressed content must take the shared content-write section and re-read the project row inside it, as the packaged handlers do. A check made before the section is not a check. |
| Surfacing the refusal to the user | Medium | Before launch, if the host renders its own editor chrome | `LANGUAGE_REMOVED` arrives on both the in-section refusal and the request-boundary one. A host that does not handle it will retry a save that cannot succeed and show nothing useful. |
| More than one backend process writing the same project | Deferred | Before enabling multiple writers | Shares R1's deferral: the section is in-process, so language coordination does not hold across processes either. |

**Closure:** the reviewed OSS change is implemented; follow-ups above remain separate. Automatic draft recovery is a future improvement, not part of this fix.

## R2–R8 — Review queue

These priorities are initial triage, not completed investigations. None of these items has been reviewed in this pass. Hosted follow-ups should be added after the corresponding shared behavior is assessed, rather than guessed in advance.

| Item | OSS status | Review priority | When to check | Hosted follow-up |
| --- | --- | --- | --- | --- |
| [R2 — Deletion consequences](review-questions.md#r2-one-deletion-policy-for-references) | Not reviewed | Medium | Next review in the series; settle policy before changing deletion behavior | To assess |
| [R3 — Removing a language during editing](review-questions.md#r3-language-lifecycle-and-content-writes) | Reviewed and implemented — see [above](#r3--removing-a-language-while-someone-is-editing-it) | — | — | Listed above |
| [R4 — Rules across create, duplicate and translate](review-questions.md#r4-shared-write-rules-without-forcing-one-workflow) | Not reviewed | Medium | Before releasing these workflows under enforced quotas; include R1's copy-path checks | To assess |
| [R5 — Finding every image and link reference](review-questions.md#r5-one-description-of-reference-bearing-values) | Not reviewed | Medium | During the reference-safety review, and whenever a new reference-bearing setting type is added | To assess |
| [R6 — Operations that partly finish](review-questions.md#r6-structural-operations-and-partial-success) | Not reviewed | Medium | Before the next release changing import, clone, theme update or project deletion | To assess |
| [R7 — Multilingual website output](review-questions.md#r7-multilingual-output-completion) | Not reviewed | High | Before declaring multilingual export release-ready | To assess |
| [R8 — Backup and clone completeness](review-questions.md#r8-backup-and-clone-completeness) | Not reviewed | High | Before releasing multilingual backup/restore as a supported recovery path | To assess |
