# Review status and follow-ups

[Review questions](review-questions.md) · [Map](README.md) · [Coverage](coverage.md)

Updated 2026-09-19. This is the handoff summary; the review questions retain the reasoning and evidence. Update an item's status when it is reviewed, and replace an uncommitted status with the fix commit when available.

**Priority describes the next action, not proof of a bug.** High means check before the stated release or deployment milestone; Medium means planned follow-up; Low means revisit when its trigger occurs. “Before launch” below applies when that feature is included in the launch. Future scaling work does not block a single-process MVP.

## R1 — Image usage and safe deletion

**OSS status:** Implemented and reviewed for participating operations within one backend process. The reported review defects are fixed. Fixed in `ae8102a3`.

Deletion checks saved content, refuses incomplete verification, and coordinates with participating writes. Saves distinguish saved content with stale usage tracking from a rejected missing-image reference. The usage label can remain stale until refreshed.

**Verification:** independent review ran 16 backend review cases and 102 save-store tests successfully. The implementation agent reported 1,809 backend and 1,539 frontend tests passing, plus targeted lint. Full lint still has the pre-existing theme-deletion-marker parsing errors. Regression tests live in [mediaDeletionSafety.test.js](../../packages/builder-server/src/tests/mediaDeletionSafety.test.js) and [saveStore.test.js](../../packages/editor-ui/src/stores/__tests__/saveStore.test.js).

### OSS follow-ups

| Point | Priority | When to check | Next action |
| --- | --- | --- | --- |
| Copy and structural operations outside media coordination | Medium | During R3/R4/R6 reviews, before claiming protection for every write path | Check overlapping copy, removal and deletion; coordinate any demonstrated gaps. |
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

**Closure:** the reviewed OSS change is implemented; follow-ups above remain separate. Multi-process support is not a blocker for a single-process MVP. The complete participation boundary is in [media operations](operations/media.md#delete-or-bulk-delete).

## R2–R8 — Review queue

These priorities are initial triage, not completed investigations. None of these items has been reviewed in this pass. Hosted follow-ups should be added after the corresponding shared behavior is assessed, rather than guessed in advance.

| Item | OSS status | Review priority | When to check | Hosted follow-up |
| --- | --- | --- | --- | --- |
| [R2 — Deletion consequences](review-questions.md#r2-one-deletion-policy-for-references) | Not reviewed | Medium | Next review in the series; settle policy before changing deletion behavior | To assess |
| [R3 — Removing a language during editing](review-questions.md#r3-language-lifecycle-and-content-writes) | Not reviewed | High | Before releasing language removal with concurrent editing | To assess |
| [R4 — Rules across create, duplicate and translate](review-questions.md#r4-shared-write-rules-without-forcing-one-workflow) | Not reviewed | Medium | Before releasing these workflows under enforced quotas; include R1's copy-path checks | To assess |
| [R5 — Finding every image and link reference](review-questions.md#r5-one-description-of-reference-bearing-values) | Not reviewed | Medium | During the reference-safety review, and whenever a new reference-bearing setting type is added | To assess |
| [R6 — Operations that partly finish](review-questions.md#r6-structural-operations-and-partial-success) | Not reviewed | Medium | Before the next release changing import, clone, theme update or project deletion | To assess |
| [R7 — Multilingual website output](review-questions.md#r7-multilingual-output-completion) | Not reviewed | High | Before declaring multilingual export release-ready | To assess |
| [R8 — Backup and clone completeness](review-questions.md#r8-backup-and-clone-completeness) | Not reviewed | High | Before releasing multilingual backup/restore as a supported recovery path | To assess |
