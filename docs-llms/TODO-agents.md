# Tasks — agents

## Working rules

- This file and [the human version](TODO-humans.md) are two views of one task register. Update IDs, status, priority and scope together; local status is authoritative. GitHub changes require a user request.
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
Public board: [OSS Roadmap](https://github.com/users/tsiger/projects/7), milestone OSS - 0.9.10. All 18 issue bodies were read; #126's comment was read. #121 and #132 are closed/completed and appear only in completed records. No GitHub state was changed.

## Ready to review

### GH115 · Finish multilingual documentation and close the feature

**Review · Unrated · Docs · tsiger**

Steps 0–24 and R1–R8 implemented; domain cleanup is part of this task. Check step 25 architecture/packages, theme contract and user checklist; old richtext and phase-status claims exist outside domain. Do not rebuild multilang.

**Done when:** Current contracts/checklist agree and remaining issues, if any, have their own task.

**Start:** [future-multilang-design.md](future-multilang-design.md). **Source:** GitHub #115. [GitHub #115](https://github.com/tsiger/widgetizer/issues/115)

### GH118 · Review export asset naming

**Review · Unrated · OSS · anastis**

Board says To Be Reviewed; issue has no acceptance detail. Inspect existing export naming/versioning before implementing anything.

**Done when:** Agreed naming appears in a real export without broken references.

**Start:** [exportController.js](../packages/builder-server/src/controllers/exportController.js). **Source:** GitHub #118. [GitHub #118](https://github.com/tsiger/widgetizer/issues/118)

### GH122 · Review automatic search-engine information

**Review · Unrated · OSS · tsiger**

Structured-data commits e3ae2f424/e48731228 and docs d065e7ae9 exist. Review the current contract and recorded evidence; do not build a second SEO pipeline.

**Done when:** Existing implementation satisfies the agreed feature, or concrete gaps get separate tasks.

**Start:** [future-structured-data-design.md](future-structured-data-design.md). **Source:** GitHub #122. [GitHub #122](https://github.com/tsiger/widgetizer/issues/122)

### GH126 · Review the Windows leave-page prompt fix

**Review · Unrated · OSS · anastis**

Both navigation guards use useConfirm; issue comment records the fix. Verify cancel/leave and typing afterwards. T71 covers deeper router tests separately.

**Done when:** Windows workflow passes and local review is recorded.

**Start:** [useNavigationGuard.js](../packages/editor-ui/src/hooks/useNavigationGuard.js). **Source:** GitHub #126. [GitHub #126](https://github.com/tsiger/widgetizer/issues/126)

### GH127 · Review the code-field spacing fix

**Review · Unrated · OSS · tsiger**

Board says To Be Reviewed; issue is title-only. Establish the affected input/state before assuming the fix is absent.

**Done when:** The reported gap is gone in the relevant editor layout.

**Start:** [inputs](../packages/editor-ui/src/components/settings/inputs). **Source:** GitHub #127. [GitHub #127](https://github.com/tsiger/widgetizer/issues/127)

### GH134 · Review Undo after autosave

**Review · Unrated · OSS · tsiger**

Implemented in e4379a50: history survives save, 150 steps, 500 ms same-setting grouping. Verify manual/autosave, in-flight save and theme correction; do not add a toggle without a decision.

**Done when:** Normal editing/undo workflow matches the agreed behaviour.

**Start:** [core-page-editor.md](core-page-editor.md). **Source:** GitHub #134. [GitHub #134](https://github.com/tsiger/widgetizer/issues/134)

### GH135 · Review the Widgetizer Desktop name

**Review · Unrated · OSS · tsiger**

Implemented in 8fae65c5. Product IDs, installer/data paths and update identity deliberately stay unchanged; review display names only.

**Done when:** Agreed UI names are correct with existing installs unaffected.

**Start:** [future-roadmap.md](future-roadmap.md). **Source:** GitHub #135. [GitHub #135](https://github.com/tsiger/widgetizer/issues/135)

## Decisions to make

### T54 · Choose an accessibility standard

**Decision needed · Low · Shared**

Decide keyboard/focus, semantics, contrast, target sizes and disabled-item convention. T53 is the concrete menu work; avoid duplicating it in a second audit.

**Done when:** Agreed standard and separately scoped findings; not a claim of blanket conformance.

**Start:** [core-editor-ui-style-guide.md](core-editor-ui-style-guide.md). **Source:** Original §54.

### T57 · Decide what the editor style guide covers

**Decision needed · Low · Docs**

Either document SplitButton alongside composite controls or state that the guide covers tokens/classes only.

**Done when:** The guide scope is clear.

**Start:** [core-editor-ui-style-guide.md](core-editor-ui-style-guide.md). **Source:** Original §57.

### T72 · Decide how theme authors package a new base version

**Decision needed · Low · OSS**

Decide replacement vs delta-only handling of a bumped base; validation and buildLatestSnapshot must compose the same tree. Do not loosen the version check alone; require update data existing installs need.

**Done when:** Documented package rules match install/update behaviour and useful refusal messages.

**Start:** [theme-dev-distribution.md](../docs-website/src/theme-dev-distribution.md). **Source:** Original §72.

### T76 · Changing the main language

**Decision needed · Medium · OSS**

Default owns root URLs. Decide UX first; any switch affects folders, links, SEO and usage. Recheck whether the disabled selector explains the rule.

**Done when:** Product rule, UI explanation and implementation agree without advising users to delete translations.

**Start:** [multilingual.md](domain/multilingual.md). **Source:** Original §76.

### GH120 · Decide anonymous usage and bug reporting

**Decision needed · Unrated · OSS · tsiger**

Issue is title-only. Define telemetry scope, destination, opt-in/out, retention and user wording before selecting infrastructure.

**Done when:** Approved product/privacy requirements and a bounded implementation task.

**Start:** [core-security.md](core-security.md). **Source:** GitHub #120. [GitHub #120](https://github.com/tsiger/widgetizer/issues/120)

### GH128 · Choose additional image optimisation tools

**Decision needed · Unrated · OSS · Unassigned**

Use the existing image-optimization proposal rather than inventing requirements from the title. Preserve originals/variants and image quality expectations.

**Done when:** Selected features have concrete acceptance criteria.

**Start:** [future-image-optimization.md](future-image-optimization.md). **Source:** GitHub #128. [GitHub #128](https://github.com/tsiger/widgetizer/issues/128)

### GH129 · Decide where Arch should display image captions

**Decision needed · Unrated · OSS · tsiger**

Gallery already has a caption setting/rendering. Confirm whether this means media-library captions, image widgets or other placements before implementation.

**Done when:** Requested placements and caption source are specified, then verified.

**Start:** [schema.json](../themes/arch/widgets/gallery/schema.json). **Source:** GitHub #129. [GitHub #129](https://github.com/tsiger/widgetizer/issues/129)

### GH130 · Decide the layout for downloadable files

**Decision needed · Unrated · OSS · tsiger**

Issue is title-only; compare files and icon-grid behaviour. Define download links, labels and layout before adding a widget.

**Done when:** Agreed design works with actual downloadable files.

**Start:** [widgets](../themes/arch/widgets). **Source:** GitHub #130. [GitHub #130](https://github.com/tsiger/widgetizer/issues/130)

### GH138 · Edit project details directly from the project list

**Decision needed · Unrated · OSS · Unassigned**

Issue is title-only. Establish whether editing inactive projects should change active-project state; preserve project selection.

**Done when:** Approved interaction edits the intended project without switching unexpectedly.

**Start:** [projects](../app/src/components/projects). **Source:** GitHub #138. [GitHub #138](https://github.com/tsiger/widgetizer/issues/138)

### GH139 · Decide whether to hide the project folder name

**Decision needed · Unrated · OSS · Unassigned**

Distinguish display name from storage folder. Preserve existing project paths and rename rules; do not migrate folders merely to hide a field.

**Done when:** Agreed form design is clear and existing projects remain accessible.

**Start:** [projects](../app/src/components/projects). **Source:** GitHub #139. [GitHub #139](https://github.com/tsiger/widgetizer/issues/139)

## Fixes and investigations

### T32 · Check theme-upload validation cleanup

**Investigate · Low · OSS**

Recheck timestamp-based validation temp-dir naming and error log ownership in uploadTheme. Neither was a confirmed install failure.

**Done when:** Any reproduced collision has isolated temporary work and one clear failure.

**Start:** [themeController.js](../packages/builder-server/src/controllers/themeController.js). **Source:** Original §32.

### T38 · Check how the app chooses its first project

**Investigate · Low · OSS**

getActiveProject writes the fallback active ID on GET. Preserve missing/deleted-active recovery; inspect first-project activation across awaited seeding if relevant.

**Done when:** Selection semantics are explicit and the reproduced problem is covered.

**Start:** [projectController.js](../packages/builder-server/src/controllers/projectController.js). **Source:** Original §38.

### T41 · Investigate previews slowing down over long sessions

**Investigate · Medium · Shared**

Historical yielding-loop benchmark: ~0.47→13.60 ms/sanitize over 1.5k→10.5k calls, bounded RSS. Characterize DOMPurify/jsdom state before mitigations; do not weaken sanitization. OSS impact was low; long-lived hosts higher.

**Done when:** Current evidence establishes impact; any fix preserves sanitized output and flattens the measured degradation.

**Start:** [sanitizationService.js](../packages/builder-server/src/services/sanitizationService.js). **Source:** Original §41.

### T44 · Keep published images complete and filenames distinct

**Investigate · Medium · Shared**

Recheck seedPresetMedia scope-first conversion, nested source/manifest paths, flat export output and original-versus-rendition collisions (photo.jpg vs photo-large.jpg). A pure selection helper must preserve used-only selection, rendition fallback and referenced-file reconciliation.

**Done when:** No silent overwrite or missing linked media in reproduced cases; adapter boundaries and copy fallbacks remain correct.

**Start:** [exportController.js](../packages/builder-server/src/controllers/exportController.js). **Source:** Original §44.

### T53 · Make action menus easier to use with a keyboard

**Open · Low · Shared**

Compare row menus with SplitButton: roles, Arrow/Home/End, Escape, focus-in/return and trigger controls. Decide where focus goes after deleting the trigger row; remove duplicated listeners only as useful.

**Done when:** Keyboard and assistive-technology checks cover open, choose, cancel and row deletion.

**Start:** [SplitButton.jsx](../packages/editor-ui/src/components/ui/SplitButton.jsx). **Source:** Original §53.

### T58 · Investigate an occasional test-suite failure

**Investigate · Low · Tests**

Historical infrastructure.test.js failure: Unexpected token < parsing JSON. Check parallel server/port/state interference; no confirmed validateRequest defect.

**Done when:** Cause reproduced and isolated, or the stale report retired with evidence.

**Start:** [infrastructure.test.js](../packages/builder-server/src/tests/infrastructure.test.js). **Source:** Original §58.

### T64 · Show lasting, accurate error messages

**Investigate · Low · Shared**

Revalidate load-vs-empty states, blank edit forms, failed delete dialogs/uploads/exports, theme corrections and hidden filename errors. R1–R3 already improved some signals. T66 covers wording/field mapping.

**Done when:** Each confirmed case shows the actual outcome and a useful next action.

**Start:** [Pages.jsx](../packages/editor-ui/src/pages/Pages.jsx). **Source:** Original §64.

### T66 · Explain form errors beside the right field

**Open · Medium · Shared**

Map ApiError.data conflicts/validationErrors to localized form errors using visible field labels. Show collapsed filename errors; preserve structured server data. Review other reachable messages in bounded batches with T64.

**Done when:** Users see which field failed, why, and how to correct it in their interface language.

**Start:** [CollectionItemForm.jsx](../packages/editor-ui/src/components/collections/CollectionItemForm.jsx). **Source:** Original §66.

### T73 · Let themes choose the page-title separator

**Open · Low · Shared**

Keep SeoTag and renderEngine buildPageTitle aligned, including pagination; escape the custom separator.

**Done when:** Title output and page_title agree for default/custom separators.

**Start:** [SeoTag.js](../packages/core/src/tags/SeoTag.js). **Source:** Original §73.

### GH136 · Investigate the missing-icons preview warning

**Investigate · Unrated · OSS · Unassigned**

Issue reports ENOENT while checking assets/icons.json mtime. Check current icon-cache/preview path; absent optional assets should not masquerade as a project failure.

**Done when:** Impact is established and the warning or rendering defect is handled appropriately.

**Start:** [services](../packages/builder-server/src/services). **Source:** GitHub #136. [GitHub #136](https://github.com/tsiger/widgetizer/issues/136)

### GH137 · Check whether theme sync changes menus

**Investigate · Unrated · OSS · Unassigned**

Distinguish theme:sync/preset:sync developer scripts from a project theme update. Preserve authored menus; R6 already covers update copy failures.

**Done when:** Expected sync behaviour is documented and any proven overwrite fixed.

**Start:** [scripts](../scripts). **Source:** GitHub #137. [GitHub #137](https://github.com/tsiger/widgetizer/issues/137)

## Later — only when the stated need arises

### T4 · Automate a basic website-building check

**Deferred · Low · OSS**

Add one web smoke journey; Electron automation is separate. Existing unit/component tests are not browser coverage.

**Done when:** Create → edit → export runs against an isolated project.

**Start:** [user-test-checklist.md](user-test-checklist.md). **Source:** Original §4.

### T17 · Make tests catch unwanted output too

**Deferred · Low · Shared**

The known item body-class defect is fixed. Review exclusions/exact matches opportunistically, not a blanket rewrite. Prove concurrency regressions fail with the defect restored; bind adapter methods in test proxies.

**Done when:** Touched tests catch the specific extra output or race they claim to prevent.

**Start:** [collectionItemExport.test.js](../packages/builder-server/src/tests/collectionItemExport.test.js). **Source:** Original §17; R3 test-method note.

### T33 · Reduce repeated editor code where useful

**Deferred · Low · Shared**

Compare PageForm/CollectionItemForm slug validation and useMediaState localStorage lifecycle. Extract only when the shared rule is justified.

**Done when:** Affected callers agree without an unnecessary new abstraction.

**Start:** [CollectionItemForm.jsx](../packages/editor-ui/src/components/collections/CollectionItemForm.jsx). **Source:** Original §33.

### T39 · Keep image-usage labels fresh during a refresh

**Deferred · Low · Shared**

Only original §39h remains. A full async scan followed by replaceMediaUsage can supersede per-source updates. R1 deletion verification is separate; do not reopen completed transaction fixes.

**Done when:** A reproduced refresh/save overlap keeps the latest usage without weakening deletion checks.

**Start:** [mediaUsageService.js](../packages/builder-server/src/services/mediaUsageService.js). **Source:** Original §39.

### T43 · Review template file boundaries and escaping

**Deferred · Low · Shared**

Direct reads use resolveInside; verify Liquid include/render containment separately. Review private SeoTag/previewRuntime escaping copies without assuming browser and server helpers are identical.

**Done when:** Supported template trust is explicit and relevant paths/escaping have focused checks.

**Start:** [renderEngine.js](../packages/render-engine/src/renderEngine.js). **Source:** Original §43.

### T61 · Reduce harmless preview startup warnings

**Deferred · Low · Shared**

Gate sends on the current document generation and PREVIEW_READY. Keep exact-origin targeting; never use wildcard origins to silence the warning.

**Done when:** Startup warnings disappear and ready-time resync still delivers the current state.

**Start:** [previewManager.js](../packages/editor-ui/src/queries/previewManager.js). **Source:** Original §61.

### T63 · Coordinate an unused publishing route before adopting it

**Deferred · Low · OSS**

LocalPublishAdapter.publish does not use withExportOpLock. Choose shared allocation/serialization at the adapter boundary when adopted; packaged export controllers are already serialized.

**Done when:** A production caller cannot reuse an export version.

**Start:** [LocalPublishAdapter.js](../packages/adapters-local/src/LocalPublishAdapter.js). **Source:** Original §63.

### T67 · Check export viewing through linked folders

**Deferred · Low · OSS**

Export confinement is lexical; realpath/symlink containment was not established. Reproduce via a disposable symlink fixture before changing serving behaviour.

**Done when:** The supported boundary is explicit and demonstrated escapes are refused.

**Start:** [exportController.js](../packages/builder-server/src/controllers/exportController.js). **Source:** Original §67.

### T71 · Test leave-page prompts with real navigation

**Deferred · Low · Tests**

Use createMemoryRouter for Back, blocked→proceeding→unblocked and a new destination while blocked. Existing stub tests remain useful for side-effect ordering.

**Done when:** Tests exercise real transitions and fail against the relevant old dependency race.

**Start:** [useNavigationGuard.test.jsx](../packages/editor-ui/src/hooks/__tests__/useNavigationGuard.test.jsx). **Source:** Original §71.

### R1-COORD · Coordinate structural changes only where workflows overlap

**Deferred · Medium · Shared**

Consolidates R1/R2/R6/R8. Link enrichment/create/duplicate/import/theme update stay outside content coordination; R3 added item copy/version/discard and language ops. Establish reachable overlap before extending locks.

**Done when:** A demonstrated overlapping workflow is safe; no desktop-only speculative concurrency expansion.

**Start:** [languages.md](domain/operations/languages.md). **Source:** R1/R2/R6/R8 structural boundary.

### R1-RESTART · Decide recovery for edits held across a server restart

**Deferred · Low · Shared**

Deleted-path Set lasts for the process. Persisted content is reverified for deletes, but pending edits can reintroduce missing refs after restart. Any future bound must fail closed.

**Done when:** Chosen recovery/retention policy is tested without rejecting tolerated imported missing assets.

**Start:** [media.md](domain/operations/media.md). **Source:** Domain review R1.

### R1-CONTRACT · Share save-result rules when another caller needs them

**Deferred · Low · Shared**

Consider one write/result contract for warnings and refusals; no broad save-path refactor is currently required.

**Done when:** New caller preserves saved/usage-stale/rejected outcomes and dirty-state semantics.

**Start:** [editing.md](domain/operations/editing.md). **Source:** Domain review R1.

### R2-REPAIR · Automatically repair links left by incomplete cleanup

**Deferred · Low · Shared**

Re-derive dead managed targets before repair; preserve surviving refs, labels, manual URLs and partial-delete retry semantics.

**Done when:** A demonstrated incomplete sweep can recover without removing valid links.

**Start:** [content.md](domain/operations/content.md). **Source:** Domain review R2.

### R2-MENU · Check menu matching when new setting types appear

**Deferred · Low · Shared**

Widget menu cleanup uses UUID equality; theme settings dispatch by declared type. Do not add a schema walk until ambiguity is demonstrated.

**Done when:** New type cannot have its ordinary data cleared as a menu reference.

**Start:** [linkEnrichment.js](../packages/builder-server/src/utils/linkEnrichment.js). **Source:** Domain review R2.

### R3-DRAFT · Recover unsaved work after a language is removed

**Deferred · Medium · Shared**

Choose local persistence or export before implementation. Keep LANGUAGE_REMOVED refusal, dirty state and autosave suspension; never imply reload rescues a draft.

**Done when:** Recovery is actually available and the user-facing wording matches it.

**Start:** [editing.md](domain/operations/editing.md). **Source:** Domain review R3.

### R3-FOLDERS · Remove empty language folders if they become a problem

**Deferred · Low · OSS**

Directory existence is not content existence. Preserve current scanning semantics if removing empty directories.

**Done when:** Cleanup adds no data loss and readers do not mistake empty folders for content.

**Start:** [languages.md](domain/operations/languages.md). **Source:** Domain review R3.

### R5-NESTED · Support links inside future structured settings

**Deferred · Medium · Shared**

Media traversal recurses; reference transformers visit settings/block values. Unify traversal then, with per-type handlers; table v1 cells are text only. Covers R5 catalog/traversal follow-up.

**Done when:** New nested links survive seed/copy/render/delete consistently with images.

**Start:** [settings.md](domain/entities/settings.md). **Source:** Domain review R5.

### R8-ARCHIVE · Test additional damaged or newer backup formats

**Deferred · Medium · OSS**

Candidates: truncated ZIP, future formatVersion, valid JSON with invalid content shape. Existing media-library and language refusals are already covered. No instructions to edit archive files.

**Done when:** Chosen case either restores completely or refuses clearly with cleanup.

**Start:** [projects.md](domain/operations/projects.md). **Source:** Domain review R8.

### R6-DELETE · Clean up after a project deletion partly fails

**Deferred · Medium · OSS**

Project row deletion precedes directory removal. Establish retry/orphan policy before new recovery machinery; theme-update rollback is a separate completed change.

**Done when:** Reported partial deletion has an honest outcome and bounded cleanup.

**Start:** [projects.md](domain/operations/projects.md). **Source:** Domain review R6.

### QA-EXTRA · Choose extra checks when changing an area

**Deferred · Low · Tests**

Historical coverage suggestions are retained by row ID below. Recheck current assertions first: several candidates are already covered by R1–R8 or walkthroughs. No full audit is authorized by this entry.

**Done when:** Any selected investigation ends in evidence or a separately scoped confirmed task.

**Start:** [coverage.md](domain/coverage.md). **Source:** Old coverage Next checks; R3 multi-window; R5 media.

## Embedding apps

### T30 · Make project copying easier to embed

**Deferred · Medium · Embedding**

Extract directory-explicit duplicate/import cores only for a concrete consumer. Decide asset-plane copy semantics and whether uploads are excluded; preserve R8 identities and R6 rollback.

**Done when:** Shared cores serve a real consumer and OSS round trips remain correct.

**Start:** [core-project-id-architecture.md](core-project-id-architecture.md). **Source:** Original §30.

### T49 · Make content-rewriting helpers work through storage adapters

**Deferred · Low · Embedding**

Delete sweeps already use storage. Remaining FS enrichment/remap helpers require a local directory; thread scope/adapters through lifecycle callers without changing identity rules. Coordinate with T30.

**Done when:** A real non-local adapter observes the required writes; OSS copies still work.

**Start:** [linkEnrichment.js](../packages/builder-server/src/utils/linkEnrichment.js). **Source:** Original §49.

### T74 · Provide a complete page-render entry point for embedding apps

**Open · High · Embedding**

Evaluate one exported preparation helper for pagination/currentPageData and language context. Migrate packaged callers only within that scope; H-RENDER records existing integration obligations.

**Done when:** An integration fixture includes numbered copies, page-dependent SEO and language-correct references.

**Start:** [exportController.js](../packages/builder-server/src/controllers/exportController.js). **Source:** Original §74.

### GH133 · Review form limits for embedding apps

**Review · Unrated · Embedding · anastis**

MAX_FORMS_PER_SITE is read by export and LocalLimitsAdapter returns Infinity. Preserve fallback semantics. Host must answer the key; decide language-stream counting and item physical/group counts without documenting private tiers.

**Done when:** Integration answers the key and tests its chosen limits, including translations.

**Start:** [core-packages.md](core-packages.md). **Source:** GitHub #133. [GitHub #133](https://github.com/tsiger/widgetizer/issues/133)

### H-WRITES · Keep custom host saves and deletes consistent

**Review · High · Embedding**

Use shared coordination, deleted-reference validation and in-lock language re-read. Sweep only confirmed deletions; propagate MEDIA_USAGE_STALE, LANGUAGE_REMOVED and REFERENCE_CLEANUP_INCOMPLETE into usable UI.

**Done when:** Custom-handler tests cover refusal, warning, dirty state and confirmed cleanup.

**Start:** [core-packages.md](core-packages.md). **Source:** R1/R2/R3 integration.

### H-ADAPTERS · Verify an embedding app’s adapters

**Review · High · Embedding**

Record exact OSS revision. Cover unreadable content, failed usage sync, waiting saves/deletes, user feedback and tenant isolation against actual adapters.

**Done when:** Integration results and deployment assumptions are recorded in that app’s own docs.

**Start:** [core-packages.md](core-packages.md). **Source:** R1 integration.

### H-MULTIPROCESS · Coordinate multiple servers editing the same project

**Deferred · Unrated · Embedding**

Choose cross-process coordination for writes/deletes/languages/structural updates. Assess restart retention and fail-closed bounds. No claim that shared storage scans provide exclusion.

**Done when:** Deployment tests establish same-project ordering across its actual writers.

**Start:** [media.md](domain/operations/media.md). **Source:** R1/R3/R6 integration.

### H-RENDER · Check a custom publishing pipeline

**Review · High · Embedding**

Seed page/item maps from exportable languages; resolve theme refs; honor fallback/noindex in SEO while keeping visitor navigation. T74 concerns a helper, this task verifies consumers.

**Done when:** Custom output agrees on links, theme refs, language selection and SEO.

**Start:** [output.md](domain/operations/output.md). **Source:** R5/R7 integration.

### H-BACKUP · Check custom backup and language setup flows

**Review · High · Embedding**

Back up database media metadata; refuse incomplete/unreadable restore. Seed only missing content and preflight all required source/schema/destination reads.

**Done when:** Custom round trips preserve content/identity and seeding preserves existing translations.

**Start:** [projects.md](domain/operations/projects.md). **Source:** R8 integration.

### H-THEMES · Check a custom theme-update flow

**Review · High · Embedding**

Prepare whole update, record version after success, preserve recovery data when undo fails; coordinate concurrent updates according to actual deployment.

**Done when:** Failed updates have verified retry/recovery behaviour and plain user messages.

**Start:** [themes.md](domain/operations/themes.md). **Source:** R6 integration.

### H-PAGES · Enforce a configured page allowance

**Open · High · Embedding**

MAX_PAGES_PER_PROJECT is declared/answered but unread by page create/duplicate/version. Decide counting policy and enforce every creation path consistently.

**Done when:** Configured caps refuse excess creation without writes; OSS remains unbounded.

**Start:** [pageController.js](../packages/builder-server/src/controllers/pageController.js). **Source:** R4 integration.

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
| T2 | Database-version-write failure is an accepted limitation, not a new fix task. Project deletion recovery is R6-DELETE. |
| O1 | Full navigation assertions beyond C10's inspected additions: same slugs, collection prefixes, clean URLs, pagination and token expiry |
| O2 | Output/record cleanup for failures; retained-version boundaries and export/delete concurrency |
| O3 | Both real-project walkthroughs complete; no remaining task from this row. |
| O4 | Actual language-name text/interpolation, repeated exports and project switching; one layout assertion does not cover all UI states |
| O5 | Translated media/structured data combinations if relevant. Form collisions/limits were checked in R7. |
| O6 | Completed switcher, month localization and upgrade checks; broad documentation reconciliation belongs to GH115. |
| R3 | Two simultaneous editor windows, only if reported or supported as a workflow. |
| R5 | Site-wide media settings beyond favicon, when a theme introduces them. |

The former seven-step “next audit” is not a launch obligation: choose a relevant journey (setup, translations, references, copy/restore, failure/retry or theme update) only when a concrete change warrants it. Both existing walkthroughs remain completed evidence.

</details>
