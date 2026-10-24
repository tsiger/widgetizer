# Tasks — agents

## Working rules

- This file and [the human version](TODO-humans.md) are two views of one task register. Update IDs, status, priority and scope together.
- **GitHub holds the work.** Every bug, improvement and decision we mean to act on is a GitHub issue, scheduled or not; its body carries the technical detail. This register keeps two things only: the open issues of the current milestone, mirrored with their board status (GitHub owns status and assignee; an entry retires to the completed records when its issue closes), and internal notes that are not tasks yet: unconfirmed checks, needs-triggered later work and embedding requirements. A note that proves real becomes a GitHub issue and leaves this file. Change GitHub itself only when asked.
- Keep entries short: scope, constraints, done-when, starting points. Human entries explain the consequence and next action. Add detail only when it prevents a mistake.
- `Tn` preserves original TODO section n; `GHn` is GitHub issue n; `R…` identifies a consolidated review follow-up; `H…` is a generic embedding requirement. Never renumber or reuse retired IDs.
- Review is not Done; Investigate is not a confirmed bug; Deferred is not release work. Unrated priorities are intentional. Check old reports against current code before implementation.
- One bounded task at a time. No broad refactor, synthetic-concurrency expansion or recovery machinery without a demonstrated need. Never tell users to inspect or repair theme/backup files.
- This pair is ephemeral: code and permanent docs must not link to task entries. The two task files may link to each other. Put stable behaviour and limitations in domain docs, not work queues.
- Sources stay within this public repo and public issues. Describe embedding requirements generically; do not copy private deployments, tiers, architecture or downstream paths.
- Retire completed bodies into [completed records](history/completed-tasks.md), retaining the fix and a retrievable body revision. No commit, branch switch or push without explicit permission.

## Evidence and history

Snapshot: 2026-09-20, source revision `f10e20ce`. Linked-issue assignees are preserved from GitHub; local-only tasks have no assigned owner. Historical reports are evidence, not fresh reproductions.
Original local details: `git show f10e20ce:docs-llms/TODO.md` (original numbered sections).
Original review reasoning: `git show f10e20ce:docs-llms/domain/review-status.md` and `git show f10e20ce:docs-llms/domain/review-questions.md`.
Public board: [OSS Roadmap](https://github.com/users/tsiger/projects/7); current milestone [OSS - 0.9.10](https://github.com/tsiger/widgetizer/milestone/2). Milestone section reconciled with GitHub on 2026-10-22. On 2026-10-22 the register's bugs, improvements and decisions moved to GitHub issues #165–#196 (with the existing #128, #138 and #154); their register bodies are readable at `e92cda65:docs-llms/TODO-agents.md`.

## OSS 0.9.10 milestone (mirrors GitHub)

Open issues in the milestone, with their GitHub board status. Closed in this milestone: #118, #120, #121, #122, #127, #129, #130, #132, #133, #134, #135, #136, #137, #139, #142, #143, #144, #145, #155, #156, #126, #117, #157, #158, #153, #160 (see the milestone's Closed tab).

#### GH115 · Multilingual support

**GitHub: To Be Reviewed · anastis, tsiger**

Steps 0–24 and R1–R8 are built and both real-project walkthroughs passed. The 2026-10-14 docs-llms pass reconciled the multilingual rules, theme switcher, architecture/package maps and domain model with the code, and added the checklist's Multilingual section (LANG-001 to LANG-042) — docs `202e9dfa`. The leftover English on translated pages was fixed under #156. A 2026-10-18 Fable/Codex gap review extended §18 to LANG-074 (refusals, cross-language links and menus, removal cleanup, editor guards, export combinations, preview paths, shared settings) and found the desktop app refusing language preview paths, fixed in `electron/previewPath.js`. Awaiting the partner's review.

**Start:** [Multilingual rules](domain/multilingual.md), [user checklist](user-test-checklist.md). [GitHub #115](https://github.com/tsiger/widgetizer/issues/115)

#### GH162 · Links that open a new window go to the browser in the desktop app

**GitHub: To Be Reviewed · tsiger**

Was DESKTOP-WINDOW-OPEN. `electron/main.js` set no `setWindowOpenHandler`, so any `window.open` or `target="_blank"` from a page (preview, exported site, theme script, pasted embed) created a new `BrowserWindow` that loaded whatever it was given. Fixed by porting the `mcp` branch's policy: `windowOpenTarget` (`electron/windowOpenPolicy.js`) sends the app server's own pages (exports, media files) to a plain sandboxed window without the preload, other `http(s)` addresses to `shell.openExternal`, and denies the rest (`file:`, `data:`, `javascript:`, `about:blank`); the handler is on the main, preview and every content window. Unit test of the decisions in `windowOpenPolicy.test.js`.

**Done when:** in the desktop app, View site, the issues report and Media's file view open in an app window, an outside link in the preview opens the system browser, and nothing else opens a window.

**Start:** [main.js](../electron/main.js), [windowOpenPolicy.js](../electron/windowOpenPolicy.js). [GitHub #162](https://github.com/tsiger/widgetizer/issues/162)

## Internal notes (not on GitHub)

Not tasks yet. Checks need confirming first; later items wait for their stated need; embedding requirements are not OSS release work. Promote a note to a GitHub issue when it becomes real work.

### Later — only when the stated need arises

#### T4 · Automate a basic website-building check

**Deferred · Low · OSS**

Add one web smoke journey; Electron automation is separate. Existing unit/component tests are not browser coverage.

**Done when:** Create → edit → export runs against an isolated project.

**Start:** [user-test-checklist.md](user-test-checklist.md). **Source:** Original §4.

#### T17 · Make tests catch unwanted output too

**Deferred · Low · Shared**

The known item body-class defect is fixed. Review exclusions/exact matches opportunistically, not a blanket rewrite. Prove concurrency regressions fail with the defect restored; bind adapter methods in test proxies.

**Done when:** Touched tests catch the specific extra output or race they claim to prevent.

**Start:** [collectionItemExport.test.js](../packages/builder-server/src/tests/collectionItemExport.test.js). **Source:** Original §17; R3 test-method note.

#### T33 · Reduce repeated editor code where useful

**Deferred · Low · Shared**

Compare PageForm/CollectionItemForm slug validation and useMediaState localStorage lifecycle. Extract only when the shared rule is justified.

**Done when:** Affected callers agree without an unnecessary new abstraction.

**Start:** [CollectionItemForm.jsx](../packages/editor-ui/src/components/collections/CollectionItemForm.jsx). **Source:** Original §33.

#### T39 · Keep image-usage labels fresh during a refresh

**Deferred · Low · Shared**

Only original §39h remains. A full async scan followed by replaceMediaUsage can supersede per-source updates. R1 deletion verification is separate; do not reopen completed transaction fixes.

**Done when:** A reproduced refresh/save overlap keeps the latest usage without weakening deletion checks.

**Start:** [mediaUsageService.js](../packages/builder-server/src/services/mediaUsageService.js). **Source:** Original §39.

#### T43 · Review template file boundaries and escaping

**Deferred · Low · Shared**

Direct reads use resolveInside; verify Liquid include/render containment separately. Review private SeoTag/previewRuntime escaping copies without assuming browser and server helpers are identical.

**Done when:** Supported template trust is explicit and relevant paths/escaping have focused checks.

**Start:** [renderEngine.js](../packages/render-engine/src/renderEngine.js). **Source:** Original §43.

#### T61 · Reduce harmless preview startup warnings

**Deferred · Low · Shared**

Gate sends on the current document generation and PREVIEW_READY. Keep exact-origin targeting; never use wildcard origins to silence the warning.

**Done when:** Startup warnings disappear and ready-time resync still delivers the current state.

**Start:** [previewManager.js](../packages/editor-ui/src/queries/previewManager.js). **Source:** Original §61.

#### T63 · Coordinate an unused publishing route before adopting it

**Deferred · Low · OSS**

LocalPublishAdapter.publish does not use withExportOpLock. Choose shared allocation/serialization at the adapter boundary when adopted; packaged export controllers are already serialized.

**Done when:** A production caller cannot reuse an export version.

**Start:** [LocalPublishAdapter.js](../packages/adapters-local/src/LocalPublishAdapter.js). **Source:** Original §63.

#### T67 · Check export viewing through linked folders

**Deferred · Low · OSS**

Export confinement is lexical; realpath/symlink containment was not established. Reproduce via a disposable symlink fixture before changing serving behaviour.

**Done when:** The supported boundary is explicit and demonstrated escapes are refused.

**Start:** [exportController.js](../packages/builder-server/src/controllers/exportController.js). **Source:** Original §67.

#### T71 · Test leave-page prompts with real navigation

**Deferred · Low · Tests**

Use createMemoryRouter for Back, blocked→proceeding→unblocked and a new destination while blocked. Existing stub tests remain useful for side-effect ordering.

**Done when:** Tests exercise real transitions and fail against the relevant old dependency race.

**Start:** [useNavigationGuard.test.jsx](../packages/editor-ui/src/hooks/__tests__/useNavigationGuard.test.jsx). **Source:** Original §71.

#### R1-COORD · Coordinate structural changes only where workflows overlap

**Deferred · Medium · Shared**

Consolidates R1/R2/R6/R8. Link enrichment/create/duplicate/import/theme update stay outside content coordination; R3 added item copy/version/discard and language ops. Establish reachable overlap before extending locks.

**Done when:** A demonstrated overlapping workflow is safe; no desktop-only speculative concurrency expansion.

**Start:** [languages.md](domain/operations/languages.md). **Source:** R1/R2/R6/R8 structural boundary.

#### R1-RESTART · Decide recovery for edits held across a server restart

**Deferred · Low · Shared**

Deleted-path Set lasts for the process. Persisted content is reverified for deletes, but pending edits can reintroduce missing refs after restart. Any future bound must fail closed.

**Done when:** Chosen recovery/retention policy is tested without rejecting tolerated imported missing assets.

**Start:** [media.md](domain/operations/media.md). **Source:** Domain review R1.

#### R1-CONTRACT · Share save-result rules when another caller needs them

**Deferred · Low · Shared**

Consider one write/result contract for warnings and refusals; no broad save-path refactor is currently required.

**Done when:** New caller preserves saved/usage-stale/rejected outcomes and dirty-state semantics.

**Start:** [editing.md](domain/operations/editing.md). **Source:** Domain review R1.

#### R2-REPAIR · Automatically repair links left by incomplete cleanup

**Deferred · Low · Shared**

Re-derive dead managed targets before repair; preserve surviving refs, labels, manual URLs and partial-delete retry semantics.

**Done when:** A demonstrated incomplete sweep can recover without removing valid links.

**Start:** [content.md](domain/operations/content.md). **Source:** Domain review R2.

#### R2-MENU · Check menu matching when new setting types appear

**Deferred · Low · Shared**

Widget menu cleanup uses UUID equality; theme settings dispatch by declared type. Do not add a schema walk until ambiguity is demonstrated.

**Done when:** New type cannot have its ordinary data cleared as a menu reference.

**Start:** [linkEnrichment.js](../packages/builder-server/src/utils/linkEnrichment.js). **Source:** Domain review R2.

#### R3-DRAFT · Recover unsaved work after a language is removed

**Deferred · Medium · Shared**

Choose local persistence or export before implementation. Keep LANGUAGE_REMOVED refusal, dirty state and autosave suspension; never imply reload rescues a draft.

**Done when:** Recovery is actually available and the user-facing wording matches it.

**Start:** [editing.md](domain/operations/editing.md). **Source:** Domain review R3.

#### R3-FOLDERS · Remove empty language folders if they become a problem

**Deferred · Low · OSS**

Directory existence is not content existence. Preserve current scanning semantics if removing empty directories.

**Done when:** Cleanup adds no data loss and readers do not mistake empty folders for content.

**Start:** [languages.md](domain/operations/languages.md). **Source:** Domain review R3.

#### R5-NESTED · Support links inside future structured settings

**Deferred · Medium · Shared**

Media traversal recurses; reference transformers visit settings/block values. Unify traversal then, with per-type handlers; table v1 cells are text only. Covers R5 catalog/traversal follow-up.

**Done when:** New nested links survive seed/copy/render/delete consistently with images.

**Start:** [settings.md](domain/entities/settings.md). **Source:** Domain review R5.

#### R8-ARCHIVE · Test additional damaged or newer backup formats

**Deferred · Medium · OSS**

Candidates: truncated ZIP, future formatVersion, valid JSON with invalid content shape. Existing media-library and language refusals are already covered. No instructions to edit archive files. Crafted (malicious) content in an otherwise valid backup is refused since `46119daa` (BACKUP-TRUST, completed); a truncated or damaged ZIP is now a 400 from `utils/zipSafety.js`.

**Done when:** Chosen case either restores completely or refuses clearly with cleanup.

**Start:** [projects.md](domain/operations/projects.md). **Source:** Domain review R8.

#### QA-EXTRA · Choose extra checks when changing an area

**Deferred · Low · Tests**

Historical coverage suggestions are retained by row ID below. Recheck current assertions first: several candidates are already covered by R1–R8 or walkthroughs. No full audit is authorized by this entry.

**Done when:** Any selected investigation ends in evidence or a separately scoped confirmed task.

**Start:** [coverage.md](domain/coverage.md). **Source:** Old coverage Next checks; R3 multi-window; R5 media.

### Embedding apps

Requirements for an app that embeds Widgetizer; not OSS release work.

#### T74 · Provide a complete page-render entry point for embedding apps

**Open · High · Embedding**

Evaluate one exported preparation helper for pagination/currentPageData and language context. Migrate packaged callers only within that scope; H-RENDER records existing integration obligations.

**Done when:** An integration fixture includes numbered copies, page-dependent SEO and language-correct references.

**Start:** [exportController.js](../packages/builder-server/src/controllers/exportController.js). **Source:** Original §74.

#### H-PAGES · Enforce a configured page allowance

**Open · High · Embedding**

MAX_PAGES_PER_PROJECT is declared/answered but unread by page create/duplicate/version. Decide counting policy and enforce every creation path consistently. The collection-item allowance has a related gap (2026-10-05): `createCollectionItem` counts items before the content-write lock (`collectionController.js` ~246-260), so concurrent creates at 99/100 both pass. Count inside the lock for both.

**Done when:** Configured caps refuse excess creation without writes; OSS remains unbounded.

**Start:** [pageController.js](../packages/builder-server/src/controllers/pageController.js). **Source:** R4 integration.

#### H-WRITES · Keep custom host saves and deletes consistent

**Review · High · Embedding**

Use shared coordination, deleted-reference validation and in-lock language re-read. Sweep only confirmed deletions; propagate MEDIA_USAGE_STALE, LANGUAGE_REMOVED and REFERENCE_CLEANUP_INCOMPLETE into usable UI.

**Done when:** Custom-handler tests cover refusal, warning, dirty state and confirmed cleanup.

**Start:** [core-packages.md](core-packages.md). **Source:** R1/R2/R3 integration.

#### H-ADAPTERS · Verify an embedding app’s adapters

**Review · High · Embedding**

Record exact OSS revision. Cover unreadable content, failed usage sync, waiting saves/deletes, user feedback and tenant isolation against actual adapters.

**Done when:** Integration results and deployment assumptions are recorded in that app’s own docs.

**Start:** [core-packages.md](core-packages.md). **Source:** R1 integration.

#### H-RENDER · Check a custom publishing pipeline

**Review · High · Embedding**

Seed page/item maps from exportable languages; resolve theme refs; honor fallback/noindex in SEO while keeping visitor navigation. T74 concerns a helper, this task verifies consumers.

**Done when:** Custom output agrees on links, theme refs, language selection and SEO.

**Start:** [output.md](domain/operations/output.md). **Source:** R5/R7 integration.

#### H-BACKUP · Check custom backup and language setup flows

**Review · High · Embedding**

Back up database media metadata; refuse incomplete/unreadable restore. Seed only missing content and preflight all required source/schema/destination reads.

**Done when:** Custom round trips preserve content/identity and seeding preserves existing translations.

**Start:** [projects.md](domain/operations/projects.md). **Source:** R8 integration.

#### H-THEMES · Check a custom theme-update flow

**Review · High · Embedding**

Prepare whole update, record version after success, preserve recovery data when undo fails; coordinate concurrent updates according to actual deployment.

**Done when:** Failed updates have verified retry/recovery behaviour and plain user messages.

**Start:** [themes.md](domain/operations/themes.md). **Source:** R6 integration.

#### T30 · Make project copying easier to embed

**Deferred · Medium · Embedding**

Extract directory-explicit duplicate/import cores only for a concrete consumer. Decide asset-plane copy semantics and whether uploads are excluded; preserve R8 identities and R6 rollback.

**Done when:** Shared cores serve a real consumer and OSS round trips remain correct.

**Start:** [core-project-id-architecture.md](core-project-id-architecture.md). **Source:** Original §30.

#### T49 · Make content-rewriting helpers work through storage adapters

**Deferred · Low · Embedding**

Delete sweeps already use storage. Remaining FS enrichment/remap helpers require a local directory; thread scope/adapters through lifecycle callers without changing identity rules. Coordinate with T30.

**Done when:** A real non-local adapter observes the required writes; OSS copies still work.

**Start:** [linkEnrichment.js](../packages/builder-server/src/utils/linkEnrichment.js). **Source:** Original §49.

#### H-MULTIPROCESS · Coordinate multiple servers editing the same project

**Deferred · Unrated · Embedding**

Choose cross-process coordination for writes/deletes/languages/structural updates. Assess restart retention and fail-closed bounds. No claim that shared storage scans provide exclusion.

**Done when:** Deployment tests establish same-project ordering across its actual writers.

**Start:** [media.md](domain/operations/media.md). **Source:** R1/R3/R6 integration.

## QA-EXTRA candidate notes

<details>
<summary>Optional checks from the old coverage map — consult only for the area being changed</summary>

These are historical suggestions, not an active audit plan or proof that tests are absent. Completed/overlapping suggestions are reconciled below.

| Area | Optional check / disposition |
| --- | --- |
| P1 | Partial seed failure combined with a DB write failure; starter references and custom default language together |
| P2 | Failure between directory move and row write; logo replacement shared across languages |
| P3 | In-flight save/load plus language navigation and two tabs |
| P4 | Three-language combinations if relevant; failed remap rollback covered by R6. |
| P5 | Other archive shapes: truncated ZIP, future formatVersion, content files that parse but are not content |
| P6 | Export queued during delete; disk removal failure after row deletion; orphan recovery |
| L1 | Partial seed failure combined with project-row write failure; no assumptions about auto-retargeting links |
| L2 | Copied widget/block/reference variety and independently divergent structures |
| L3 | Race assertions still needing detailed review |
| L4 | Cross-language deletion cleanup covered by R2. Additional failure-point/shared-binary combinations only when relevant. |
| L5 | Relabel default when imported metadata contains overrides; address collisions and regional-code output |
| L6 | Dirty editor, missing sibling, full editor-to-preview journey. Deleted-language recovery is covered separately in L7 |
| L7 | Two editor windows on the same language; a removal during an in-flight manual save |
| C1 | Rule parity between details update and content save; partial old-file deletion |
| C2 | Reference kinds a future setting type may add |
| C3 | Both global/page ownership; every reference-bearing setting; paste across pages and project reset |
| C4 | Combined page/global/theme partial failure, language switch during save, stale response and retry |
| C5 | Missing/corrupt singleton, global block setting types, changes seen across same-language pages only |
| C6 | Language seeding versus duplication identity rules; cross-language item links |
| C7 | Rename/order failure, duplicate-UUID recovery, required fields after schema updates, archived-field flows |
| C8 | Anchor uniqueness per language and collection; concurrent claims; generated URL depth |
| C9 | Defaults/merge versus existing uploaded assets and existing exports; UI locale separation |
| C10 | Cache reuse across language renders; manual order, invalid items and partial translations combined; C8's authoring rules need their own assessment |
| M1 | Fail each original/rendition/DB step; generated filename collisions and quotas |
| M2 | Rendered output, rather than repository and round-trip only |
| M3 | Repeated refs/owner variety if relevant. Usage-sync failure → delete is covered by R1; do not repeat as missing. |
| M4 | Partial asset deletion remains a candidate. R3 brought item copy/version/discard and language ops inside coordination. Remaining structural scope is R1-COORD; cross-process scope is H-MULTIPROCESS. |
| M5 | Block reference combinations if relevant; future nested values are R5-NESTED. |
| M6 | Same rules through alternate write/render paths; explicit raw code versus richtext |
| T1 | Library deletion in-use checks, invalid packages, cache refresh and independent project copies |
| T2 | Database-version-write failure is an accepted limitation, not a new fix task. Project deletion reports a folder it could not remove (`folderLeftBehind`). |
| O1 | Full navigation assertions beyond C10's inspected additions: same slugs, collection prefixes, clean URLs, pagination and token expiry |
| O2 | Output/record cleanup for failures; retained-version boundaries and export/delete concurrency |
| O3 | Both real-project walkthroughs complete; no remaining task from this row. |
| O4 | Actual language-name text/interpolation, repeated exports and project switching; one layout assertion does not cover all UI states |
| O5 | Translated media/structured data combinations if relevant. Form collisions/limits were checked in R7. |
| O6 | Completed switcher, month localization and upgrade checks; broad documentation reconciled 2026-10-14. |
| R3 | Two simultaneous editor windows, only if reported or supported as a workflow. |
| R5 | Site-wide media settings beyond favicon, when a theme introduces them. |

The former seven-step “next audit” is not a launch obligation: choose a relevant journey (setup, translations, references, copy/restore, failure/retry or theme update) only when a concrete change warrants it. Both existing walkthroughs remain completed evidence.

</details>
