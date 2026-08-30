# TODO — OSS builder (web + Electron)

## How this file works

**This file is ephemeral. Nothing outside it may point at it.**

- **Outbound references are fine.** An item may cite code, docs, specs and commits — that is what keeps it actionable.
- **Inbound references are banned.** No code comment, doc, README or spec may cite this file — no path reference, no `§`-section citation. Items get rewritten, closed and deleted; a pointer to one rots silently and there is no build step that catches it. Put the reason inline at the destination instead.
- **Reference scope —** this repo only. **Never cite `widgetizer-hosted/` or the umbrella repo** — the OSS builder ships standalone and must not document, or depend on, anything downstream of it.
- **Section numbers are stable.** Never renumber: historical commit messages cite these numbers (`... (TODO §12)`), and renumbering would silently repoint them. A closed item's number is retired, not reused.
- **Lifecycle.** One commit adds an item. A later commit fixes it and marks it done. A third commit deletes the body and adds a row to the reference table at the bottom. **The body is not preserved in this file** — the table's two hashes are how you recover it: the *Fix* commit shows what changed, and the *Body at* commit is the last one where the full write-up is still readable (`git show <hash>:docs-llms/TODO.md`).
- **Every open item must carry a priority.** Tag each item **High**, **Medium**, or **Low** with a `**Priority:**` line right under its heading, and list it in the matching Contents section. New items need a priority assigned when they're added; re-file the item (heading tag + Contents section) if its priority changes later.
- **Heading format.** `## [status icon] N. Title (optional `package`/area) — optional priority detail — optional other markers`. Status icon: ⬜ open, ⏸️ deferred (✅ done / ❌ wontfix are for the completed reference table only). Priority detail is optional extra nuance beyond the bare High/Medium/Low bucket (e.g. differing severity across surfaces); omit it if the bucket alone says everything. Other markers are optional notes like `investigate`, `not started`, `blocked on X`, or a `deferred yyyy-mm-dd` date. The Contents entry for an item must always match its heading text verbatim.
- **Layout:** these instructions → contents → open items → completed reference table.

Open work for the OSS builder.

> **⚠️ Vocabulary in the port findings.** Items numbered from §5 up came out of the 2026-06 port
> review, which compared two branches that no longer exist side by side: **`experimentation`** — the
> npm-workspace refactor, then off-trunk — and **`master`** as it stood *before* the merge, i.e. the
> old `src/` + `server/` monolith. The refactor merged into `master` on **2026-07-13** (`af65a190`,
> `7e0c9677`), so today's `master` **is** the former `experimentation` code. Where an item says
> "master had X", it means *the pre-merge monolith* had X — do not expect to find it on `master`
> today; that is usually the whole point of the finding.

Conventions still in force: work on the `master` trunk; never commit, switch branch, or push without
explicit per-action permission.

## Contents

### High priority

_None open._

### Medium priority

- [⏸️ 30. Extract project lifecycle duplicate/import into dir-explicit cores — moderate (architectural / hosted-readiness) — blocked on hosted duplicate/import](#-30-extract-project-lifecycle-duplicateimport-into-dir-explicit-cores--moderate-architectural--hosted-readiness--blocked-on-hosted-duplicateimport)
- [⬜ 39. SQLite transaction-boundary audit — repositories, services, controllers (`builder-server`) — 39a moderate (data-integrity), rest low (concurrency)](#-39-sqlite-transaction-boundary-audit--repositories-services-controllers-builder-server--39a-moderate-data-integrity-rest-low-concurrency)
- [⬜ 41. Richtext sanitize CPU degrades over process lifetime — DOMPurify + jsdom accumulation (`builder-server`) — low (OSS-standalone) / moderate (hosted, long-lived process) — investigate (perf)](#-41-richtext-sanitize-cpu-degrades-over-process-lifetime--dompurify--jsdom-accumulation-builder-server--low-oss-standalone--moderate-hosted-long-lived-process--investigate-perf)
- [⬜ 44. Extract the published-media selection rules into `@widgetizer/core` + finish `seedPresetMedia`'s scope-first conversion (`builder-server` / `core`) — not started](#-44-extract-the-published-media-selection-rules-into-widgetizercore--finish-seedpresetmedias-scope-first-conversion-builder-server--core--not-started)
- [✅ 62. Export lifecycle races — version reservation and fs/DB cleanup aren't coordinated (`builder-server`) — fixed, pending reference-table move](#-62-export-lifecycle-races--version-reservation-and-fsdb-cleanup-arent-coordinated-builder-server--fixed-pending-reference-table-move)
- [⬜ 66. Editor surfaces raw server error strings — `Slug "suite" already exists`, `Validation failed` — instead of field-anchored, localized messages (`editor-ui` / `builder-server`) — medium (UX) — sweep all error paths](#-66-editor-surfaces-raw-server-error-strings--slug-suite-already-exists-validation-failed--instead-of-field-anchored-localized-messages-editor-ui--builder-server--medium-ux--sweep-all-error-paths)

### Low priority

- [⏸️ 4. Playwright E2E smoke (OSS)](#-4-playwright-e2e-smoke-oss)
- [⏸️ 17. Test-strictness audit — ported tests may have dropped master's *exclusion* assertions (cross-cutting) — low (process) — deferred 2026-06-26](#-17-test-strictness-audit--ported-tests-may-have-dropped-masters-exclusion-assertions-cross-cutting--low-process--deferred-2026-06-26)
- [⬜ 32. Theme-upload update-import validation smells (`builder-server`) — low — investigate](#-32-theme-upload-update-import-validation-smells-builder-server--low--investigate)
- [⬜ 33. Editor-ui duplication smells (`editor-ui`) — low (maintainability) — investigate](#-33-editor-ui-duplication-smells-editor-ui--low-maintainability--investigate)
- [⬜ 38. Mutation-on-GET — `getActiveProject` writes the active id on a read (`builder-server`) — low — investigate](#-38-mutation-on-get--getactiveproject-writes-the-active-id-on-a-read-builder-server--low--investigate)
- [⬜ 43. Render-engine containment — two edges left open (`render-engine` / `core`) — low](#-43-render-engine-containment--two-edges-left-open-render-engine--core--low)
- [⬜ 49. `linkEnrichment.js` bypasses the storage adapter — raw `fs` writes to project content (`builder-server`) — low (architectural hygiene)](#-49-linkenrichmentjs-bypasses-the-storage-adapter--raw-fs-writes-to-project-content-builder-server--low-architectural-hygiene)
- [✅ 51. Queued-save flavor inheritance across a third overlapping `save()` call (`editor-ui`) — fixed, pending reference-table move](#-51-queued-save-flavor-inheritance-across-a-third-overlapping-save-call-editor-ui--fixed-pending-reference-table-move)
- [✅ 52. Synchronous-subscriber re-entry window in `saveStore.save()` (`editor-ui`) — fixed, pending reference-table move](#-52-synchronous-subscriber-re-entry-window-in-savestoresave-editor-ui--fixed-pending-reference-table-move)
- [⬜ 53. Kebab action-menus lack full WAI-ARIA menu a11y + copy-pasted open/close logic (`editor-ui`) — low (a11y / DRY)](#-53-kebab-action-menus-lack-full-wai-aria-menu-a11y--copy-pasted-openclose-logic-editor-ui--low-a11y--dry)
- [⬜ 54. Full accessibility / WAI-ARIA APG conformance review (`editor-ui` + all shells) — low — investigate (a11y)](#-54-full-accessibility--wai-aria-apg-conformance-review-editor-ui--all-shells--low--investigate-a11y)
- [⬜ 57. `core-editor-ui-style-guide.md` has no Split Button component pattern (`docs-llms`) — low (optional)](#-57-core-editor-ui-style-guidemd-has-no-split-button-component-pattern-docs-llms--low-optional)
- [⬜ 58. Flaky `infrastructure.test.js` test in the full backend suite (`builder-server` tests) — low — investigate](#-58-flaky-infrastructuretestjs-test-in-the-full-backend-suite-builder-server-tests--low--investigate)
- [⬜ 61. Editor→preview postMessages fired before the iframe's document loads are dropped with a console warning (`editor-ui`) — low (cosmetic / log noise)](#-61-editorpreview-postmessages-fired-before-the-iframes-document-loads-are-dropped-with-a-console-warning-editor-ui--low-cosmetic--log-noise)
- [⬜ 63. `LocalPublishAdapter.publish` shares the exports version counter without the export lock (`adapters-local`) — low — latent (no production caller)](#-63-localpublishadapterpublish-shares-the-exports-version-counter-without-the-export-lock-adapters-local--low--latent-no-production-caller)
- [⬜ 67. Export viewer confinement is lexical — a symlink inside an export dir escapes it (`builder-server`) — low](#-67-export-viewer-confinement-is-lexical--a-symlink-inside-an-export-dir-escapes-it-builder-server--low)
- [⬜ 68. A Website Address with a path or query produces inconsistent sitemap, robots and canonical URLs (`builder-server` / `core`) — low](#-68-a-website-address-with-a-path-or-query-produces-inconsistent-sitemap-robots-and-canonical-urls-builder-server--core--low)
- [⬜ 70. Widget assets enqueued with a sub-path (`vendor/lib.js`) render a nested URL but are flattened to `assets/<basename>` on export (`builder-server` / `core`) — low](#-70-widget-assets-enqueued-with-a-sub-path-vendorlibjs-render-a-nested-url-but-are-flattened-to-assetsbasename-on-export-builder-server--core--low)
- [⬜ 64. Editor error feedback is toast-only, and several failure states render actively misleading UI (`editor-ui`) — low (UX robustness) — investigate](#-64-editor-error-feedback-is-toast-only-and-several-failure-states-render-actively-misleading-ui-editor-ui--low-ux-robustness--investigate)
- [⬜ 65. Raw `.html` internal hrefs under Clean URLs — user-typed links, theme Liquid, schema defaults (`core` / `render-engine` / themes) — low](#-65-raw-html-internal-hrefs-under-clean-urls--user-typed-links-theme-liquid-schema-defaults-core--render-engine--themes--low)

---

## ⏸️ 4. Playwright E2E smoke (OSS)

**Priority:** Low

No end-to-end browser tests exist yet (only `node:test` server + Vitest client/component
suites). Planned "later" for OSS: a **Web smoke** (create → edit → export). **Electron E2E is
deferred** (playwright-electron setup is its own task). Not blocking; the standing test-coverage
audit tracks coverage gaps meanwhile.

---

---

## ⏸️ 17. Test-strictness audit — ported tests may have dropped master's *exclusion* assertions (cross-cutting) — low (process) — deferred 2026-06-26

**Priority:** Low

**Deferred (2026-06-26):** The one *proven* escape (the item-page body-class assertion) was already
fixed as part of §15 (exact match + `!includes("page-news")`). The broader sweep is defensive-only with
**no known active bug**: the mechanical grep yields ~375 `assert.ok(...includes(...))` hits, the vast
majority legitimate presence checks. Decided to defer the discretionary render/sanitize-output hardening
pass and instead tighten opportunistically when touching a suite. Revisit only if another weak-assertion
escape surfaces.

Surfaced 2026-06-25 from a colleague's port-gap report, generalising the **§15** root cause. Not a
single bug — a **methodology gap** in the monolith→packages test port worth one focused pass.

**The concrete instance (already actionable in §15):** the collection item-page body-class test
(`packages/builder-server/src/tests/collectionItemExport.test.js:221`) asserts only
`html.includes("collection-news") && html.includes("item-alpha")` — it checks the **right** classes
are *present* but never checks the **wrong** one (`page-{slug}`) is *absent*. Master's equivalent
(`server/tests/renderCollectionItemPage.test.js:191,226`) used an **exact-class** match
(`/<body class="collection-portfolio item-alpha">/`), which *excludes* anything extra. The port
relaxed exact-match → loose substring and **dropped the exclusion**, so the test stayed green the
entire time §15's `page-{slug}` leak was live. **We caught §15 by reading code, not from a red test.**
Fix is in §15's TDD note: restore exact-class + add `assert.doesNotMatch(html, /\bpage-/)` (or
equivalent) for the item-page body.

**The broader point (this item):** a loose `includes` proves *presence*, never *absence* — it can't
catch a regression that **adds** something wrong (an extra class, a leaked attribute, an
un-suppressed default). Where master asserted with `assert.match` / `assert.doesNotMatch` / exact
equality and the port substituted `assert.ok(x.includes(...))`, that **specific protection was lost**
even though coverage *looks* intact. §15 is proof this already happened at least once.

**Counter-evidence it's not everywhere (for calibration):** the *page* body-class case is still
strict on exp — `rendering.test.js:689` asserts the exact `class="page-about-us"`. So this is a
spot-check pass, not a rewrite-everything: the page path kept its rigor, the item path didn't.

**Recommended pass (the "quick look" the colleague asked for):** for the ported features, diff exp's
test assertions against master's and flag every place a master `match`/`doesNotMatch`/exact-equality
check became a substring `includes`/`ok` — prioritising rendered-HTML / class / attribute / sanitizer
output, where an *extra* wrong token is the realistic failure mode. Mechanical seed:
`grep -rn "assert.ok(.*\.includes(" packages/*/src/tests` then, for each on render/sanitize output,
check whether master's counterpart was stricter. Tighten in place (exact match, or add the paired
`doesNotMatch` exclusion). This dovetails with the standing test-coverage audit — fold the findings
there, or track them as discrete test-only items here.

**Scope/priority:** low, process-only — no production code changes, purely hardening
regression-protection. But cheap and high-leverage: the §15 escape shows a weak assertion is
*indistinguishable from real coverage* until something breaks. Do the body-class one with §15; batch
the rest as a single test-hardening pass.

**Hosted impact:** none directly (OSS `builder-server`/`editor-ui`/`render-engine` tests). The same
discipline applies to hosted's own ported suites if/when audited, but that's separate.

---

---

## ⏸️ 30. Extract project lifecycle duplicate/import into dir-explicit cores — moderate (architectural / hosted-readiness) — blocked on hosted duplicate/import

**Priority:** Medium

**Status:** ⏸️ deferred — scoped under §28 (2026-06-29), promoted to its own item 2026-06-29. The OSS
reads/theme-CRUD half of §28 is done; this is the **lifecycle (exception 4) tail**. Blocked on hosted
building duplicate/import (no consumer yet) and on the asset-plane copy primitive below.

**What.** Pull the bulk-filesystem bodies of `projectController.duplicateProject` / `importProject` into
directory-explicit cores — `duplicateProjectContent({srcDir,destDir})`,
`importProjectContent({bundleDir,destDir})` — next to `scaffoldProjectContent` (`index.js:53`),
barrel-export them, and leave the OSS controllers as thin wrappers (resolve dirs → call core → DB metadata).
Refactor `remapDuplicatedProjectUuids` (`utils/linkEnrichment.js:330`) to take an explicit `destDir` instead
of resolving `getProjectDir(folderName)` internally (the C2 reach-through). Behavior-preserving for OSS:
existing duplicate/import tests stay green, plus unit tests for each core on scratch `srcDir`/`destDir`.

**Why deferred — the media / asset-plane crux.** OSS `duplicateProject` does one
`fs.copy(originalDir, newDir)` that copies content **and** `uploads/` media together (OSS media lives under
the project dir). Hosted media is in **R2**, so a hosted duplicate must copy content via the core **and**
copy media separately on the asset plane — but `AssetStorageAdapter` has **no `copy`**. So a clean extraction
has to first decide (a) the asset primitive (a `download→upload` loop — no contract change — or add
`copy(scope, srcKey, destKey)`), and (b) whether the content core includes `uploads/` (OSS-convenient but
hosted-unusable) or excludes it (uniform asset-plane handling, but adds an OSS step for no current benefit).
That decision only pays off once hosted needs duplicate/import, so the extraction waits rather than baking in
a speculative shape. Import needs no new primitive (`AssetStorageAdapter.upload` already exists).

**Design contract it must honor:** the C1/C2 working-directory contract + the three-planes boundary
principle — see §28 and `core-project-id-architecture.md` § Still-path-based exceptions.

**Not in scope:** rename (4a) stays **OSS-only by design** (immutable hosted `folderName`) — a resolved
decision documented under §28, no code change.

**Effect:** moderate (architectural / hosted-readiness) — not user-visible; makes duplicate/import a
shell-wrapper job rather than a re-fork if/when hosted wants them.

---

---

## ⬜ 32. Theme-upload update-import validation smells (`builder-server`) — low — investigate

**Priority:** Low

**Status:** ⬜ open (investigate) — surfaced 2026-07-01 reviewing OSS `1c831b4b` (§22: gate collection
schemas on the theme **update-import** path). Two minor smells in the new validation path; neither is a
confirmed bug, both worth a look.

**What.** `1c831b4b` added a pre-commit validation branch to `uploadTheme` (`themeController.js`) that
merges installed base + installed updates + incoming deltas into a throwaway dir via the extracted
`layerThemeSnapshot`, runs `validateThemeCollectionSchemas`, and cleans up in `finally`. Two things to
investigate:
- **Temp-dir name.** The throwaway merge dir is `_validate_${Date.now()}`. Two update-imports for the *same*
  installed theme landing in the same millisecond would collide on that name. Investigate whether concurrent
  uploads to one theme dir are reachable (route / serialization); if so, switch to a collision-proof name
  (`fs.mkdtemp`).
- **Log volume.** `layerThemeSnapshot` logs one line per applied version and now runs **twice** per
  update-import (build `latest` + `_validate_` merge), so the per-version `console.log` fires twice per
  upload. Investigate quieting it (log once, or gate behind a debug flag).

**Scope.** OSS-only surface — `uploadTheme` has no caller outside this repo (verified 2026-07-01),
so nothing downstream of the builder is affected.

**Effect:** low — a same-ms collision would corrupt only one concurrent *validation* run (not the install),
and the double log is cosmetic. Confirm reachability before deciding to fix.

---

---

## ⬜ 33. Editor-ui duplication smells (`editor-ui`) — low (maintainability) — investigate

**Priority:** Low

**Status:** ⬜ open (investigate) — surfaced 2026-07-01 reviewing OSS `331ccf8b` (user-test-checklist batch).
Two DRY / maintainability smells to weigh; refactor-only, no behavior change intended.

**What.**
- **Slug-validation ternary duplicated.** The same `formatSlug(value).length > 0 ? … : …` validation is
  inlined in both `PageForm` and `CollectionItemForm`. Investigate extracting a shared rule/helper (a
  `validateSlug` next to the existing `formatSlug`, or a shared form rule) so the two forms can't drift.
- **`useMediaState` localStorage pattern.** `useMediaState` reads `localStorage` in a `useState` initializer
  **and** persists via an effect. Investigate a small reusable `usePersistentState` / `useLocalStorage` hook
  before this read-init + persist-effect shape is copy-pasted as more editor prefs are added.

**Scope.** Pure `@widgetizer/editor-ui`; a fix flows to web / Electron / hosted via the vendored package.

**Effect:** low (maintainability). Not user-visible; investigate whether the extraction is worth it now or
when a third consumer appears.

---

---

## ⬜ 38. Mutation-on-GET — `getActiveProject` writes the active id on a read (`builder-server`) — low — investigate

**Priority:** Low

**Status:** ⬜ open (investigate) — surfaced 2026-07-07 during §36 (cold-boot race). Likely an intentional
master-parity fallback; flag-don't-fix unless there's appetite to change it.

**What.** `getActiveProject` (`packages/builder-server/src/controllers/projectController.js:252-272`), the
handler for `GET /api/projects/active`, auto-activates the first project when none is active —
`projectRepo.setActiveProjectId(projects[0].id)` **inside a GET**. A read with a write side-effect
(non-idempotent GET).

**Why it's on the radar.** §36 confirmed React StrictMode double-invokes the cold-boot bootstrap, firing two
concurrent `GET /api/projects/active` — so this write runs twice concurrently. Benign today (both write the
same `projects[0].id`, and §36's client single-flight collapses the common path to one fetch), but it's a
write-on-read under concurrency and breaks GET idempotency.

**Investigate.** Whether to move auto-activation off the read path (a dedicated activate call, or
resolve-without-persist and let an explicit action set it), weighed against master-parity — this fallback
mirrors master and covers deleted-active / missing-record / migrated-data edge cases (per its own comment).

**Two more active-project wrinkles for the same investigation** (from the 2026-08-23 transaction-boundary
re-audit; both live here because any fix reshapes the same auto-activation design):
- `getActiveProject`'s multi-read (active id → project row → project list at
  `projectController.js:254-263`) has no wrapping transaction, so under a second DB connection it can mix
  snapshots; because of the optional fallback write, a wrap would need `.immediate()`, not a read txn.
- Project creation reads the current active id (`projectController.js:359`), inserts (`:362`), then
  **awaits** media seeding/usage refresh before conditionally setting active (`:377`) — two overlapping
  first-project creations can both decide they're "first" and race the active-project choice (in-process,
  across the await gap).

**Scope.** OSS `builder-server`. **Hosted impact:** none — hosted resolves scope per-request via
`CloudScopeResolver` and doesn't use the OSS singleton active-project model, so it never reaches this handler.

**Effect:** low — no known break; GET-idempotency / robustness hygiene, and probably a master-parity keep.

---

---

## ⬜ 39. SQLite transaction-boundary audit — repositories, services, controllers (`builder-server`) — 39a moderate (data-integrity), rest low (concurrency)

**Priority:** Medium

**Status:** ⬜ open — surfaced 2026-07-08 auditing every `db.transaction(...)` site across the repositories.
**Re-audited 2026-08-23** against current code (the original findings had aged): 39b/39c confirmed
unchanged; scope extended with same-class findings 39d–39i below. The re-audit and the fix designs
were independently verified by a second-model review, which also contributed the design corrections
baked in below (write-lock-first rule, scoped inserts, `RETURNING`) and findings 39h and the two
active-project races (the latter noted under §38, not here). The export-lifecycle races found in the
same re-audit are **§62** (different subsystem, needs a design decision).

**39b–39g + 39i: ✅ DONE 2026-08-23** — implemented exactly as specified in the sub-items below.
Pinned by `tests/transactionBoundaries.test.js` (cross-project usage scoping for both rewritten
writers, thenable rejection + sync-transform success for `atomicUpdateMediaFile`, three
delete-and-reassign cases for the new repository helper — all watched red pre-fix). The
second-model review of the finished implementation passed every prescription and contributed three
accuracy corrections, folded in: better-sqlite3 itself rolls back and throws on a thenable returned
by the transaction callback (the doc now points at the *nested discarded* thenable as the real
hazard), the migrations-race loser can fail on non-idempotent DDL before the tracking-table PK, and
the test file's header now states plainly that the transaction *shapes* (`.immediate()`, read-only
wraps) are doc-pinned rather than test-pinned. **Accepted residuals:** no worker-thread
second-connection reproduction test (judged not worth the complexity for a latent hazard — a second
connection would be needed to observe any of 39b–39f misbehaving); **39h stays open (deferred)** as
the one remaining sub-item. Suites: full backend green, lint clean, embedding-host suites verified
against the change.

**The governing rule (applies to every sub-item):** with better-sqlite3's default `BEGIN DEFERRED`,
a transaction whose first statement is a read takes a read snapshot; upgrading to a write later can
fail with an **un-waitable `SQLITE_BUSY_SNAPSHOT`** if another connection committed in between
(`busy_timeout` does not cover it). So: **acquire the write lock before taking a read snapshot** —
make the transaction's first statement a write, or use `db.transaction(...).immediate()`. Harmless
on today's single connection; latent the moment a second process/worker shares the DB file.

**39a — Atomicity gap: `addMediaFile` isn't transactional (moderate, data-integrity). ✅ DONE
2026-08-23** — `insertMediaFile` is now self-wrapped in `db.transaction(...)` (nests as a savepoint
under `writeMediaData`'s existing transaction), so a failure among the size inserts rolls back the
`media_files` row too. Pinned by `tests/mediaInsertAtomicity.test.js` (failure leaves no row;
success and the nested `writeMediaData` caller unchanged). 39b/39c below remain open. Original
finding:
`insertMediaFile` (`packages/builder-server/src/db/repositories/mediaRepository.js:216`) writes a
`media_files` row **plus** N `media_sizes` rows across separate statements. `writeMediaData` wraps this helper
in a `db.transaction(...)`, but `addMediaFile` (`mediaRepository.js:95`) calls it **bare**, and its callers
don't wrap it either (`controllers/mediaController.js:443`, the upload path; `controllers/projectController.js:145`).
So a failure *after* the `media_files` insert but *among* the size inserts commits a media file with
partial/missing size variants → broken/missing thumbnails on render. **Fix:** wrap `insertMediaFile`'s
two-table write in a transaction (self-wrap the helper so both `addMediaFile` and `writeMediaData` are covered
— better-sqlite3 nests via savepoints, so `writeMediaData` calling a now-transactional helper is fine).

**39b — Read-then-write transactions violate the write-lock-first rule (low, latent correctness).**
`replaceMediaUsage` (`mediaRepository.js:154`), `updateMediaUsageForSource` (`:184`), and `writeProjectsData`
(`repositories/projectRepository.js:205`) each `SELECT id FROM …` and then `DELETE`/`INSERT` inside one
default `db.transaction()`. **Fix (media pair):** fold the SELECT into the DELETE as a correlated subquery
(`… WHERE media_file_id IN (SELECT id FROM media_files WHERE project_id = ?)`) so the first statement is a
write, **and** scope the re-inserts to the project (`INSERT … SELECT id, ? FROM media_files WHERE id = ?
AND project_id = ?`) — dropping the preliminary id-list must not widen the insert path to accept another
project's fileIds. **Fix (`writeProjectsData`, tests-only caller):** just `.immediate()` — a `NOT IN`
rewrite is delicate (empty-list SQL, parameter limits) for no production benefit. Also fix the misleading
"safe for parallel calls" comment at `mediaRepository.js:179`: SQLite serializes **all** writes on one
db-level lock (no row-level locking), so parallel calls touching disjoint rows still contend.

**39c — Multi-read getters without a read transaction (low, robustness).**
`getMediaFileById` (`mediaRepository.js:47`, 3 reads), `getMediaFiles` (`:9`, 3 reads), and
`readProjectsData` (`projectRepository.js:194`, 2 reads; tests-only caller) can each observe a **torn
snapshot** under a second connection. Wrap each in a default (deferred, read-only) `db.transaction` —
correct here because they never write.

**39d — exportRepository SELECT-then-DELETE pairs return rows they may not have deleted (low, latent).**
`deleteExportRecord` (`exportRepository.js:67`), `deleteAllExports` (`:87`), `trimExports` (`:105`) each
SELECT rows/output dirs, then DELETE in a separate autocommit statement — under a concurrent writer the
returned list can diverge from what was actually deleted. **Fix:** collapse each to a single
`DELETE … RETURNING` statement (trim via a subquery-driven delete + `RETURNING`) — one statement, no
transaction needed, list provably matches. (Filesystem cleanup driven by the returned dirs stays
non-atomic by nature; the coordination gaps around it are §62.)

**39e — `updateProject` read-modify-write is unwrapped (low, latent).**
`projectRepository.js:69`: SELECT current row → merge in JS → UPDATE, as separate autocommit statements.
Fully synchronous, so in-process safe; cross-process it's a lost update. **Fix:** wrap in
`db.transaction(...).immediate()` — a default wrap would *introduce* the snapshot-upgrade hazard the
governing rule describes.

**39f — `deleteProjectById`'s DB portion is unwrapped (low, latent).**
`projectService.js:39-46`: delete project → read active id → maybe reassign, contiguous and synchronous
(the awaits sit before/after). **Fix:** extract into a repository helper wrapped in `db.transaction`
(first statement is the DELETE, so default deferred is fine) — keeps the transaction boundary in the DB
layer and excludes the filesystem awaits.

**39g — `atomicUpdateMediaFile` isn't the single transaction its name/comment claim (low).**
`mediaController.js:118-131`: one `await getProjectFolderName()` *precedes* the read, then read →
`transformFn` → write run synchronously — so there is **no** in-process window (an earlier version of
this finding overclaimed one; refuted in review), but read and write are still two separate transactions,
and the "SQLite transactions handle atomicity natively" comment oversells that. Decided (2026-08-23):
keep the function and make it genuinely atomic. **Fix:** after the folder-name await, run read +
transform + write inside one `db.transaction(...).immediate()` (first operation is a read; nested
`writeMediaData` becomes a savepoint), **throw if `transformFn` returns a thenable** (an async transform
would otherwise be silently ignored and commit pre-mutation state), and rewrite the comment. No
production callers today (tests only) — this hardens the exported API for future callers.

**39h — `refreshAllMediaUsage` full-rebuild can overwrite fresher per-source updates (low, live but
self-healing).** `mediaUsageService.js:~425-539`: reads media, then a long **awaited filesystem scan**
of pages/globals/theme/collections, then `replaceMediaUsage` writes the whole usage map. A per-source
usage update (e.g. a page save) landing mid-scan is overwritten by the stale rebuild. This is an
in-process race across await gaps — a transaction can't fix it; it needs serialization against the
per-source updates or a generation check. Usage tracking self-heals on the next save/refresh, so:
**deferred** — fix if/when usage staleness is ever observed in practice; not part of the current pass.

**39i — Document the concurrency model (docs, do with the fixes).** `docs-llms/core-database.md` never
states the model, which is how this class keeps being reintroduced. Add a **"Transactions &
concurrency"** subsection to §2: one synchronous better-sqlite3 connection **per process** (not
exclusive ownership of the DB file); statements never interleave in-process *except across `await`
gaps* — never split a read-modify-write across an await; multi-statement writes are self-wrapped in
`db.transaction` (savepoint nesting is safe — the `insertMediaFile` precedent); the write-lock-first
rule above; multi-statement reads needing a consistent snapshot get a read transaction; migrations'
applied-versions list is read outside the per-migration transactions, so concurrent first-runs race
benignly (loud primary-key failure + rollback). Qualify §1's "atomic updates and concurrency safety"
as holding only where operations use correct transaction boundaries. Fix the two wrong comments
(39b, 39g) in the same pass.

**Verified non-findings (2026-08-23, for future re-auditors):** migrations each run in their own
transaction including the tracking insert; all six production `db.transaction()` callbacks are
synchronous; `insertMediaFile`'s self-wrap correctly nests as a savepoint under `writeMediaData`;
`updateAppSettings` (`appSettingsController.js:36`) is read-merge-write but fully synchronous —
in-process safe, cross-process lost-update accepted (no fix planned).

**Scope.** OSS `builder-server`. Embedding hosts share this connection through the mounted routes, so
the fixes travel with the package.

**Effect:** 39a moderate (done); 39b–39g low (latent under a second connection; 39g also API-hardening);
39h low (live but self-healing, deferred); 39i docs.

---

---

## ⬜ 41. Richtext sanitize CPU degrades over process lifetime — DOMPurify + jsdom accumulation (`builder-server`) — low (OSS-standalone) / moderate (hosted, long-lived process) — investigate (perf)

**Priority:** Medium

**Status:** ⬜ open — surfaced 2026-07-09 during a read-only render/sanitize CPU benchmark (scratchpad only; no repo changes). Reproducible; root cause uncharacterized.

`sanitizeRichText` (`packages/builder-server/src/services/sanitizationService.js`) runs DOMPurify over `isomorphic-dompurify@2.35.0` → `jsdom@27.4.0`. It is called **per widget, on every render** — `packages/render-engine/src/renderEngine.js:701` for widgets, `packages/builder-server/src/services/collectionService.js:1110` for collection items — i.e. once per richtext field of every page/preview/publish render. A whole-widget LiquidJS `parseAndRender` is only ~0.3–0.6 ms warm; a single richtext sanitize dominates it, so **sanitize is ~80% of per-widget render CPU**.

**The finding.** Within a single long-lived process, the **CPU cost of each sanitize call climbs steadily with cumulative call count — while memory stays bounded.** Measured (Apple M1 Pro, node 24, ~466-byte richtext field, event loop yielding between calls):

| cumulative sanitizes | 1.5k | 3k | 4.5k | 6k | 7.5k | 9k | 10.5k |
|---|---|---|---|---|---|---|---|
| pure sanitize ms/call | 0.47 | 1.12 | 2.58 | 4.92 | 7.89 | 10.53 | 13.60 |
| RSS (MB) | 315 | 358 | 384 | 409 | 409 | 409 | 409 |

Controls rule out the obvious explanations:
- **Not a memory leak.** RSS plateaus (~330–420 MB) and is GC-stable; an earlier "unbounded RSS → 1 GB" reading was a tight-loop artifact of starving jsdom's deferred cleanup — once the event loop turns between calls (as a real server does), memory bounds.
- **Not event-loop starvation.** The `setImmediate` drain time between calls stays flat (~0.05 ms).
- **Not thermal throttling.** Every *fresh* process restarts at ~0.5 ms/call; only the *within-process* cost climbs (confirmed with back-to-back fresh processes).

So DOMPurify+jsdom accumulates state that is cheap in memory but makes each subsequent parse/sanitize progressively more expensive. This is a *distinct* mechanism from unbounded render-cache **memory** growth — here memory is bounded and it's **CPU** that degrades. In a long-lived multi-tenant process this means render/preview/publish latency **creeps upward over the process's life until a restart resets it**. OSS standalone (desktop, one user, few renders, frequent restarts) accumulates far slower — low impact there; this is primarily a hosted-facing property of shared OSS code, so any fix must stay **byte-neutral for the standalone path**.

**Fix — root cause first (follow-up A).** Before mitigating, characterize *what* accumulates:
- Does periodically **recreating/resetting the jsdom window** DOMPurify binds to (e.g. a fresh `createDOMPurify(new JSDOM('').window)` every N calls) flatten the curve? A quick scratchpad A/B answers this.
- Is it a **version regression** in `jsdom@27` or `isomorphic-dompurify@2.35`? Reproduce against an older jsdom to bisect.
- Candidate accumulation sites: jsdom `Window`/`Document` internal registries, listeners, or custom-element state; a growing DOMPurify-internal collection traversed per call.
If the root cause is a cheap reset/config, prefer that over process-level band-aids. Gate any window-reset behind the render `deps`/config so the OSS desktop path is unchanged.

**Mitigations if the root cause is intractable:** a `worker_threads` render pool with **worker recycling** (respawn a worker after N tasks) resets the accumulation automatically; or a scheduled host restart. Both are containment, not cures.

**Measure real-world impact before investing (follow-up B).** The curve above is from a synthetic loop; the real degradation *slope vs wall-clock* depends on actual render cadence. Run a soak on the real deployment host at realistic renders/day, tracking sanitize/render duration + RSS over hours, to decide whether this needs a fix now or just monitoring.

**Test.** Once the mechanism is known: a regression guard asserting per-call sanitize time (or a proxy — e.g. jsdom node/handle count) stays within a bound across a fixed number of calls; and, if a window-reset fix lands, that the reset actually flattens the curve.

**Effect:** low for OSS-standalone (short-lived, low render volume); moderate for a long-lived host process (render-latency creep + a restart-treadmill contribution). No correctness impact — sanitized output is unchanged.

---

---

## ⬜ 43. Render-engine containment — two edges left open (`render-engine` / `core`) — low

**Priority:** Low

Residue from the path-containment + escaping work (see commits touching `safePath.js` /
`escapeHtml.js`); both are open, neither is reachable today.

- **LiquidJS resolves `{% render %}` / `{% include %}` partials itself**, under
  `root: [themeSnippetsDir, coreSnippetsDir]` set in `getOrCreateEngine`. `resolveInside` guards the
  files the engine opens directly, but not that resolution. Snippet names come from theme templates,
  which no tenant can author, so they are not attacker-controlled today — the exposure appears only
  if templates ever become user-supplied (a theme marketplace, a custom-template feature).
- **Three escape helpers in `core`.** `@widgetizer/core/escapeHtml` is now the shared one, but
  `SeoTag.js` still has a private string-based copy and `previewRuntime.js` a DOM-based one. Point
  `SeoTag.js` at the shared helper; `previewRuntime.js` can move too, though being browser-only its
  DOM version is defensible.

---

## ⬜ 44. Extract the published-media selection rules into `@widgetizer/core` + finish `seedPresetMedia`'s scope-first conversion (`builder-server` / `core`) — not started

**Priority:** Medium

**Status:** ⬜ open, not started. Analysis verified against code **2026-08-04**; re-check the file:line
references before acting. Migrated here 2026-08-06 from a standalone planning doc.

Two independently-sized pieces. Both are the same theme as §28: the last two places in `builder-server`
that resolve paths through `DATA_DIR`-rooted globals instead of the storage adapter — `exportController`
(`getProjectDir` `:167`, `getPublishDir` `:171`, `:1038`) and `projectController.seedPresetMedia`
(`getProjectImagesDir` `:135`). Everything else was converted by the packages refactor.

### 44.1 Convert `seedPresetMedia` to scope-first (small)

~25 lines: take `{ scope, assetStorage }` instead of `folderName`, and replace `fs.copy` with a recursive
upload through the asset adapter. This *removes* an exception rather than adding an abstraction, and it is
the same conversion already applied everywhere else. `local/require-scope-arg` will keep it converted.

It also lets the flattening fix in §44.3 land in one place instead of being re-implemented by every
embedding host.

### 44.2 Extract `selectPublishMedia` into `@widgetizer/core` (medium)

`core` already hosts exactly this kind of shared pure helper (`richtextMedia`, `richtextLinks`,
`linkPrefixer`, `mimeTypes`, `pathSecurity`) and depends only on `liquidjs` + `slugify`.

Replace two blocks in `exportController.js` — images `:733-812` (~80 lines) and files `:814-858` (~45
lines), both the same shape — with one call plus one copy loop; the function distinguishes images from
files via `outPath`. Net ~125 lines → ~40.

**Signature.** `selectPublishMedia(payload, referencedBasenames) → [{ storagePath, outPath, fallbackStoragePath? }]`.
Semantics it must pin:

1. **Flat keys.** Output is `assets/{images,files}/<basename>`; assumes §44.3's source-flattening.
2. **Fallback.** There are currently two copy-the-whole-directory fallbacks for a media-metadata read
   failure (`exportController.js:799-811` and `:845-857`). Unify into one covering both, behavior preserved.
3. **Reconciliation input is a parameter** — the caller accumulates referenced basenames as it emits, and
   the selected set is unioned with them. Page writes (`:458`, `:619`) precede the media copy (`:733+`), so
   the ordering this relies on already holds here.
4. **The existence fallback stays OUT of the pure module** — entries carry `fallbackStoragePath`; the
   caller does the ENOENT check and the aliasing.
5. **Warn on duplicate `outPath`** (§44.3).

**Why this is safer than it sounds:** reconciliation is **monotonic** — it only ever *adds* files back,
never removes any — so it cannot break an export that works today; worst case is a slightly larger export.
The aliasing fallback is likewise additive. Used-only selection and skip-originals-when-`large`-exists are
*already* this exporter's behavior, so neither is new here.

Converting `exportController` wholesale is **not** proposed: ~1000 lines, disk-writing throughout, with its
own history/manifest/validation concerns.

### 44.3 Flatten preset media keys at the source (latent bug, both halves here)

This exporter is not internally coherent about nested media paths: `{% image %}` references a **basename**,
the generic-link rewrite **preserves subdirectories**, and published output is **flattened** via `basename`.
The link half therefore breaks on any nested media.

Fix at the source rather than in the emitters: `seedPresetMedia` walks preset image dirs *recursively*
(`fs.copy`s the tree at `projectController.js:135`), so flatten via `basename` on seed and warn on collision.
There is a third wrinkle: the manifest loop defaults `path` to `/uploads/images/${entry.filename}` — flat —
while the binary it copied may be nested (`projectController.js:152`).

**Basename uniqueness is not enforced anywhere.** No `UNIQUE(project_id, filename)` (`migrations.js:43-57`);
editor uploads dedupe only the **original's** name against existing keys (`mediaController.js:250-260`) — a
generated *variant* name never is. So uploading `photo.jpg` into a project already containing an unrelated
`photo-large.jpg` silently overwrites it when the `large` variant is written.

**Latent, not live:** every current arch preset is flat with no duplicate basenames (verified
programmatically). These are traps waiting on a preset author who nests a directory or reuses a name.

### 44.4 Open questions

- Confirm nothing in the `__export__issues.html` path or the export manifest depends on the two media
  blocks' side effects (counters are logged, not returned, so it looks clean — **unverified**).
- Decide whether this ships tests in `packages/builder-server/src/tests/` or relies on `core` unit tests.
  Prefer `core` unit tests plus one export integration test.

### 44.5 Definition of done

- [ ] `seedPresetMedia` scope-first; source-flattening + duplicate-basename warning in place.
- [ ] `selectPublishMedia` in `@widgetizer/core` with full unit tests; `exportController` delegates to it.
- [ ] An export of a fixture project containing a richtext *image link* includes the linked file.

---

## ⬜ 49. `linkEnrichment.js` bypasses the storage adapter — raw `fs` writes to project content (`builder-server`) — low (architectural hygiene)

**Priority:** Low

`builder-server` is adapter-agnostic by contract: project content persists through
`storage.write/.delete` so an embedding shell can supply any storage backend. But
`src/utils/linkEnrichment.js` (~48 raw `fs` calls) rewrites project content files directly —
pages, menus, collection items — via `fs.outputFile` against a resolved directory. Any shell whose
storage adapter is not "the same local filesystem the dir path points at" silently loses these
writes, and adapter-level hooks (e.g. write observation/accounting an adapter may implement) never
see them.

The two delete-time reference scrubbers now write through the storage adapter
(`cleanupDeletedPageReferences`, `cleanupDeletedCollectionItemReferences`; scope-first, all IO via
`storage.list/read/write`) — this item tracks the **remaining** functions: the create/duplicate/import-time enrichment and uuid-remap
helpers (`enrichNewProjectReferences`, `remapDuplicatedProjectUuids`,
`remapCollectionItemMenuRefs`, `remapCollectionItemLinkRefs`, `enrichSeededRichtextLinks*`, and
the internal `updatePageWidgets`/`updateGlobalWidgets`/`updateCollectionItems` walkers). They run
during project scaffolding/lifecycle (some callsites, e.g. `projectScaffold.js`, don't currently
hold a `scope`), so the conversion involves threading scope/adapter through those paths — a
contained refactor, but not free. Until then, the constraint stands that these helpers only work
where project storage is the local filesystem.

---

## ✅ 51. Queued-save flavor inheritance across a third overlapping `save()` call (`editor-ui`) — fixed, pending reference-table move

**Priority:** Low

**Fixed 2026-08-23** (the commit adding this note is the fix commit for the reference-table row). Three-part
fix in `saveStore.js`: (1) `queuedFollowUp` is now `{ isAuto, promise }`, and a manual caller
joining an already-queued autosave-flavored follow-up upgrades its flavor to manual (the follow-up
reads `.isAuto` at execution time), so the manual failure contract (rejection) is preserved;
(2) `resetAutoSaveTimer`'s tick wraps its `await get().save(true)` in a try/catch mapping a throw
(an inherited manual flavor) to `{ status: "failed" }`, so the backoff still advances and no
unhandled rejection escapes; (3) the fold-in below: `reconcileModifiedWidgets` now builds one Set
in a single pass with one `set()` and one timer arm. Covered by three new tests in
`saveStore.test.js`.

`saveStore.js`'s coalescing branch has a third-caller-in queues onto the *second* caller's follow-up
promise (`get().save(isAuto)`), which was itself built with the *second* caller's `isAuto` flavor —
not necessarily the third caller's own. Concretely:

- a manual save arriving while an autosave's follow-up is queued inherits the follow-up's `isAuto:
  true` flavor: on failure this resolves `{ status: "failed" }` (autosave's silent-retry contract)
  rather than rejecting, so the caller relying on the rejection (its `.catch`/`console.error`, see
  the comment at `saveStore.js`'s manual-save catch branch) never fires;
- the reverse — an autosave tick's own `save(true)` call inheriting a queued manual save's `isAuto:
  false` flavor — throws on failure instead of resolving `{ status: "failed" }`; `resetAutoSaveTimer`'s
  tick callback doesn't catch around `get().save(true)`, so that throw becomes an unhandled rejection
  and the timer's own failure-count backoff never increments.

Needs a 3-caller overlap plus a failure on the queued run to hit either branch — narrow window,
hasn't been observed outside code inspection. Cheap hardening regardless of the flavor-inheritance
question: wrap the autosave tick's `await get().save(true)` (in `resetAutoSaveTimer`) in a
try/catch that maps a throw to `{ status: "failed" }`, so a mis-flavored inherited save can't produce
an unhandled rejection there even if the inheritance itself isn't changed.

May be worth folding in while touching this area: `reconcileModifiedWidgets` rebuilds a `Set` copy
per widget id via `markWidgetModified`/`markWidgetUnmodified` and re-triggers
`resetAutoSaveTimer()` per call — harmless churn at realistic widget counts, not worth its own item.

---

## ✅ 52. Synchronous-subscriber re-entry window in `saveStore.save()` (`editor-ui`) — fixed, pending reference-table move

**Priority:** Low

**Fixed 2026-08-23** (the commit adding this note is the fix commit for the reference-table row). The
`isSaving`/`isAutoSaving` `set()` moved to after `set({ runningSave: run })`, so by the time any
subscriber is notified the single-flight guard is already installed and a re-entrant `save()` hits
the coalescing branch. On the `settledBeforeInstall` path the flag set is skipped entirely (the
run's finally has already executed; setting it afterward would wedge it true). Covered by a new
re-entrant-subscriber test in `saveStore.test.js`.

`save()` calls `set({ isSaving: true })` (or `isAutoSaving: true`) before `runningSave` is installed
a few lines later. Zustand's vanilla store notifies `.subscribe()` listeners synchronously on `set`,
so if any subscriber's callback itself called `save()` during that window, it would run before
`runningSave` is populated, miss the single-flight coalescing branch entirely, and start an
independent, overlapping save.

No such subscriber exists today — the only `.subscribe()` caller on this store is a dev-only debug
panel, and it doesn't call `save()`. This is a latent hazard rather than an active bug: `editor-ui`
ships as a library other consumers can build on, and a future subscriber that reacts to `isSaving`
by triggering its own save would hit this window with no defense.

Candidate fix: move the `isSaving`/`isAutoSaving` `set()` to after `runningSave` is installed (or
install a non-null sentinel in `runningSave` before the first `set()` in `save()`), so no
subscriber notification can escape while the single-flight guard is still unset.

---

## ⬜ 53. Kebab action-menus lack full WAI-ARIA menu a11y + copy-pasted open/close logic (`editor-ui`) — low (a11y / DRY)

**Priority:** Low

Surfaced 2026-07-09 while speccing the page-editor SplitButton, which audited the existing
kebab/action menus as the house pattern to match — and found they stop short of full menu-button
accessibility.

The row action-menus — `pages/Pages.jsx`, `pages/CollectionItems.jsx`,
`components/media/MediaListItem.jsx`, `components/export/ExportHistoryTable.jsx` (plus the
`aria-haspopup` picker in `components/settings/inputs/FontPickerInput.jsx`) — share a consistent
**visual** pattern (an `IconButton` + `MoreVertical` trigger with translated `aria-label`,
`aria-haspopup="menu"`, `aria-expanded`; an absolutely-positioned white rounded-border shadow menu;
a shared `menuButtonClass` for items; close-on-select). But the a11y stops at the trigger
attributes:

- the dropdown container has **no `role="menu"`** and items have **no `role="menuitem"`**;
- **no roving focus / Arrow-key (Home/End) navigation** — items rely on plain tab order;
- **no focus management** — opening doesn't move focus into the menu, and Escape/close doesn't
  return focus to the trigger;
- **no `aria-controls`** linking trigger↔menu;
- the **click-outside + Escape `useEffect`s are copy-pasted per component** (a `document`
  `mousedown` + `keydown` listener in each) — a DRY smell as much as an a11y one.

**Effect (low):** keyboard/AT users can open these menus but can't operate them as a proper menu
(no arrow-key navigation, focus neither moved in nor returned on close). Purely an accessibility +
maintainability gap — mouse users are unaffected and no data/behaviour is wrong.

**Fix:** the primitive now exists — `components/ui/SplitButton.jsx` implements the full WAI-ARIA
menu-button pattern (`role="menu"`/`menuitem`, roving `tabindex`, Arrow/Home/End,
focus-in-on-open + focus-return-on-close, click-outside/Escape). Extract its **menu half into a
reusable `useMenu` hook** (or shared menu component) and retrofit these kebab menus onto it —
closing the a11y gaps and deleting the per-component `document` listeners in one pass. The
SplitButton differs structurally (primary button **+** caret vs. a single kebab), so the reusable
unit is the **menu + `useMenu`**, not the whole control.

---

## ⬜ 54. Full accessibility / WAI-ARIA APG conformance review (`editor-ui` + all shells) — low — investigate (a11y)

**Priority:** Low

Surfaced 2026-07-10 while building the page-editor SplitButton. That control implements the full
WAI-ARIA menu-button pattern, which raised a broader question the project has never answered
deliberately: **what accessibility bar do we hold, and do we want WAI-ARIA APG conformance as a
standard?**

Two concrete inputs motivated this:

- **SplitButton disabled menu items** use native `disabled` (announced + non-focusable), *not* the
  APG "disabled-but-focusable via `aria-disabled` only" pattern (which lets keyboard/AT users
  arrow onto a disabled item to learn *why* it's unavailable). That was a deliberate minimal
  choice for one small menu, not a project-wide stance — the convention should be decided once,
  globally, and applied consistently.
- The kebab/action menus (§53) already stop short of full menu-button a11y.

**Scope:** a project-wide audit — semantic roles, focus management, keyboard operability, `aria-*`
correctness, contrast, tap-target sizes — across `editor-ui` and the OSS shells (`app/`,
`electron/`), deciding whether to adopt APG conformance. If adopted, apply the disabled-item
convention (and the rest) consistently, including retrofitting §53's kebab menus.

**Effect:** current keyboard/AT support is partial-but-usable; this is about raising and
standardizing the bar, not fixing a break. Because `editor-ui` is vendored into embedding hosts,
whatever convention is adopted propagates to them automatically.

---

## ⬜ 57. `core-editor-ui-style-guide.md` has no Split Button component pattern (`docs-llms`) — low (optional)

**Priority:** Low

Surfaced 2026-07-13 auditing docs-llms for staleness after the SplitButton work. The style guide
reads as a Tailwind class/token reference rather than a component-API catalogue, and it has no
precedent for documenting other composite interactive controls (menus, comboboxes) either — so
`components/ui/SplitButton.jsx` not appearing there isn't a factual error, just a possible gap if
the guide is ever meant to grow into a component catalogue.

**Fix (if wanted):** add a Split Button entry alongside the other button patterns, or explicitly
scope the doc's intro to "tokens/classes only, not component APIs" so its silence reads as
deliberate.

---

## ⬜ 58. Flaky `infrastructure.test.js` test in the full backend suite (`builder-server` tests) — low — investigate

**Priority:** Low

Surfaced 2026-07-13 running the full backend suite (`npm test`): `passes through when validation
succeeds` (`packages/builder-server/src/tests/infrastructure.test.js`) failed once with
`Unexpected token '<', "<!doctype "... is not valid JSON` — but passed cleanly running that file
alone (`node --test packages/builder-server/src/tests/infrastructure.test.js`, 10/10). The working
tree at the time touched only `packages/editor-ui`, so the failure isn't tied to any backend
change; the error text (an HTML response where JSON was expected) suggests a port collision or a
stray server under test-parallelism, not a logic bug in `validateRequest` itself.

**Fix:** investigate under the full-suite runner (not standalone) to reproduce — likely something
about port/state sharing across `createEditorApp` instances spun up by parallel test files.

---

## ⬜ 61. Editor→preview postMessages fired before the iframe's document loads are dropped with a console warning (`editor-ui`) — low (cosmetic / log noise)

**Priority:** Low

Surfaced 2026-08-23 during a manual Electron smoke pass (dev split-origin setup). Editor→preview
messages deliberately target the preview's concrete origin (`getPreviewTargetOrigin()` in
`lib/previewBase.js`) instead of `"*"`, so a message can never be delivered to an unexpected
document. The flip side: while the preview iframe is mounting or reloading, its document is still
the initial `about:blank`, which **inherits the parent (editor) origin** — a message fired during
that gap (e.g. an early `UPDATE_CSS_VARIABLES` / `LOAD_FONTS` push from `previewManager.js`) is
aimed at the API origin but arrives at an editor-origin window, so the browser drops it and logs
`Failed to execute 'postMessage' on 'DOMWindow': The target origin provided (…) does not match
the recipient window's origin (…)`.

**Effect (low, cosmetic):** console noise only. Nothing is lost — the preview runtime announces
`PREVIEW_READY` once its real document is up and the editor re-syncs then
(`PreviewPanel.jsx`); the drop is the origin-scoping safety mechanism working as designed. In
same-origin production the mismatch can't occur (parent and preview share an origin), so this is
a dev/split-origin-only warning.

**Fix (if wanted):** gate the editor→preview sends on the iframe's loaded/ready state — either
queue messages until `PREVIEW_READY` arrives for the current document generation, or simply skip
sends while the iframe is known to be loading (the post-`PREVIEW_READY` re-sync already covers
them). Keep the concrete-origin targeting; the point is only to stop firing into the gap.

---

---

## ✅ 62. Export lifecycle races — version reservation and fs/DB cleanup aren't coordinated (`builder-server`) — fixed, pending reference-table move

**Priority:** Medium

**Status:** ✅ **DONE 2026-08-23** — design **(a)** implemented: export operations are serialized
per project through a new shared primitive, `createKeyedSerializer()`
(`utils/serializeByKey.js`, exported from the package barrel so embedding hosts can wrap their own
per-site operations with it). `exportProject`, `deleteExport`, and `cleanupProjectExports` all run
their allocation/DB/fs work inside the per-project chain; failure recording happens **inside** the
serialized section (releasing the chain before the failure row is written would let the next
export race that row's version allocation — a review-contributed requirement); and
`cleanupProjectExports` and `deleteExport` both run under the lock with directories removed
**before** rows (see the review paragraph below for the ordering rationale on each). Pinned by `tests/serializeByKey.test.js` (same-key ordering, cross-key
concurrency, value/rejection propagation, chain survives a failure) and two `export.test.js`
cases (overlapping same-project exports get distinct versions/dirs, both success, no bogus extra
history row — red pre-fix on the unique-index collision; a failed export doesn't block the next).
**Multi-process upgrade path, on file:** the chain is in-process only; if the server ever runs
multiple processes, keep it and add a cross-process reservation — at export start, an immediate
transaction inserts a "pending" history row, whose unique `(project_id, version)` index makes
version allocation a cross-process lock; completion updates that row. The pending-row costs
(crash ghosts, trim interaction, history-UI noise) are deliberately not paid until that topology
exists.

**Second-model review of the implementation (same day) — adopted:** project deletion now holds the
export lock across cleanup AND the project-row removal (`withExportOpLock` exported;
`cleanupProjectExports` gained a `withinLock` escape hatch since the lock is not reentrant) — the
pre-fix window was a microtask-ordering accident, closed contractually and pinned by an
invariant-end-state test (no orphan bundle survives a deletion overlapping an export);
`cleanupProjectExports` reverted to directories-first so a crash mid-removal stays retryable (rows
still point at leftover dirs); `deleteExport` likewise removes the directory before the row, so a
failed removal keeps the version reserved (pinned: chmod-000 dir → 500 and the row survives);
`exportProjectToDir` now `emptyDir`s its output path so crash leftovers or a freed version number
can't leak stale files into a new bundle (pinned); the same-key failure test and a
queued-follower-behind-live-rejection helper test tightened per review; `exportProjectToDir`'s doc
states callers must hold the lock; the serializer documents its non-reentrancy. **Declined /
residual:** export *readers* (`getExportFiles`, `downloadExport`, `getExportHistory`, serve) stay
unserialized — racing a delete yields a 404/failed download, and queueing downloads behind
multi-second exports would be worse; the review's `LocalPublishAdapter` finding is **§63**.
A re-check round settled the last open policy: cleanup's swallowed removal failures (pre-existing
behavior) stay **accept-and-warn** — keeping rows for retry is futile since project deletion's
cascade wipes them regardless, and aborting deletion would make a project undeletable over one
stuck directory — but orphans are now loud (per-path warning + `orphanedDirs` in the return
value). The chmod-based test is skipped on win32/root where permissions can't block removal; the
deletion-overlap test pins the invariant end-state rather than a deterministic interleave
(accepted — the pre-fix window was a microtask-ordering accident). Original finding below.

**Original status:** ⬜ open — surfaced 2026-08-23 in the §39 re-audit (second-model review contributed the two
cleanup-path findings). Three symptoms of one root cause: **export version allocation and the
filesystem/DB lifecycle around it aren't coordinated**, so overlapping export operations on the same
project interfere. Unlike §39's latents these are **live in-process races** (the gaps are `await` spans,
not second connections) — but they need two overlapping exports of the same project, which a single
local user rarely produces (double-clicking a slow export is the realistic path).

- **Version reservation gap.** `exportProjectToDir` calls `exportRepo.getNextVersion` at
  `exportController.js:173`, then awaits validation/rendering/extensive fs work, creates the shared
  output dir `${folder}-v${version}` (`:260`), and only inserts the history row at `:916`. Two
  overlapping same-project exports get the same version → both write into the **same output dir**
  (interleaved/mixed files), and the loser's insert fails on the unique `idx_exports_project_version`
  (`migrations.js:93`) **after** its fs work completed — a completed export reported as failed, plus the
  route's catch allocating a *separate* "failed" history row (`:954-960`).
- **`cleanupProjectExports` (`exportController.js:111-134`)** reads the records, awaits directory
  removals, then calls `deleteAllExports` while **ignoring its returned list** — an export that
  completes mid-cleanup gets its DB row deleted without its directory being removed (orphan dir).
- **`deleteExport` (`exportController.js:1287-1296`)** deletes the DB row **before** awaiting the
  directory removal. Deleting the highest version lets a concurrent export's `MAX(version)+1` reuse
  that version/directory — which the still-running removal then deletes from under it.

**Fix (decide first).** Two candidate designs, evaluated in review:
- **(a) Serialize export operations per project** via an in-process promise chain — the pattern
  `themeController.js:451-466` already uses for snapshot builds (map keyed by project,
  `prev.catch(() => {}).then(...)`, identity-checked cleanup). The chain must cover **allocation
  through success/failure recording** (not just `exportProjectToDir` — a rejection must not release
  the chain before the route records the failure), and should also cover deletion/cleanup so the
  version-reuse and orphan-dir races close for free. Preferred under the current single-process model.
- **(b) Reserve the version up front** (insert a pending row atomically via `.immediate()`, update it
  on completion). Stronger cross-process, but leaves pending rows on crash, surfaces "pending" in the
  export-history UI, and interacts badly with retention/trim of in-flight rows — needs recovery rules.
  Not worth it unless multi-process export ever becomes real.

**Test.** Two concurrent exports of one project: distinct versions, distinct output dirs, both recorded
as success. Cleanup/delete during an in-flight export: no orphan dir, no version reuse.

**Scope.** OSS `builder-server` export subsystem. §39d's `DELETE … RETURNING` gives the repository
truthful return values; this item is about the controller-level coordination *around* them.

**Effect:** medium (low end) — mixed/corrupt export output and misreported failures, but only under
overlapping same-project exports; no editor-content data loss.

---

---

## ⬜ 63. `LocalPublishAdapter.publish` shares the exports version counter without the export lock (`adapters-local`) — low — latent (no production caller)

**Priority:** Low

Surfaced 2026-08-23 by the §62 implementation review. `LocalPublishAdapter.publish()`
(`packages/adapters-local/src/LocalPublishAdapter.js`) has the same allocation gap §62 closed in
the export controller: it reads `MAX(version)+1` from the shared `exports` table, streams the
render output across a long await span, then inserts the history row — with no serialization at
all, and no way to share the controller's per-project lock (different package; it receives a bare
db handle). Two overlapping `publish()` calls would collide on the unique
`(project_id, version)` index; a `publish()` overlapping a controller export shares the version
counter without sharing its lock. Its output layout also differs
(`publish/<folder>/v<N>/` vs the controller's `<folder>-v<N>`), so the shared counter is the only
contended resource today.

**Latent, not live:** the adapter is constructed by the OSS shell (`app/server-common.js`) for
PublishAdapter contract conformance, but nothing in `builder-server` invokes `adapters.publish`
— only tests exercise it. **Fix when a real caller appears (decide then):** route calls through
the export lock (`withExportOpLock`), or give the PublishAdapter contract an explicit
serialization/allocation story (e.g. the pending-row reservation §62's done-note sketches for
multi-process) rather than bolting the controller's in-process lock onto an adapter boundary.

---

## ⬜ 64. Editor error feedback is toast-only, and several failure states render actively misleading UI (`editor-ui`) — low (UX robustness) — investigate

**Priority:** Low

Surfaced 2026-08-24 by a full audit of every `showToast` call site and its surrounding UI.
Success feedback is generally fine without toasts (navigation, list mutation, dirty-dot
clearing, drawers closing). The problem is the *failure* side: the toast is the **only**
server-error channel in the editor — there is no banner/alert component, no page renders an
`error` state (`ErrorBoundary` is mounted only at the OSS shell root, `app/src/App.jsx`, and
only catches render crashes, not these handled errors), and no form ever feeds a server
rejection back through `setError`
(messages like a duplicate-slug conflict reach the toast and nowhere else). A toast is
transient; several of the states it papers over affirmatively claim the *wrong* outcome even
with toasts working:

- **Load failures render as empty states.** `pages/Pages.jsx` and `pages/Menus.jsx` list-load
  catches leave the array empty and clear `loading`, so a fetch failure renders "No pages/menus
  yet — create your first…". Same shape in `hooks/useMediaState.js` (media grid) and
  `hooks/useExportState.js` (export history; its message is also hardcoded English, not
  translated). `components/media/MediaSelectorDrawer.jsx`'s load catch is `console.error` only —
  no toast at all — so the drawer shows "no files" with zero signal anywhere.
- **Item-load failures render blank bodies.** `pages/PagesEdit.jsx`, `pages/CollectionItemAdd.jsx`
  and `pages/CollectionItemEdit.jsx` gate the form on the fetched object and render an empty page
  under the title when it stays null. (`pages/MenusEdit.jsx` at least shows a "not found" body.)
- **Confirm dialogs close on failure exactly as on success.** `hooks/useConfirmationModal.js`
  calls `onConfirm(...)` without awaiting it, then `closeModal()` unconditionally — a failed
  delete (media in use, export-history delete) dismisses the dialog as if it worked, leaving a
  row that "mysteriously" survives.
- **Rejected uploads erase their own evidence.** `hooks/useMediaUpload.js` *deletes* a rejected
  file's progress row instead of marking it errored, and the progress panel unmounts when
  `uploading` clears — a fully-rejected batch ends with the UI back at idle. In
  `settings/inputs/ImageInput.jsx` / `FileInput.jsx`, the oversize pre-check returns *before*
  `setUploading(true)`, so picking a too-big file doesn't even flick the spinner.
- **Export failure destroys prior evidence.** `components/export/ExportCreator.jsx` clears
  `lastExport` (the green success panel) at submit start and has no error counterpart, so a
  failed export looks like a reset. Also `useExportState.loadExportHistory`'s catch is
  console-only: after a successful export whose refresh fails, the new export never appears with
  no feedback of any kind.
- **Theme-settings warnings change values under the user.** `pages/Settings.jsx` puts server
  warnings (values silently corrected) in a toast while `themeStore.saveSettings` reloads
  canonical settings and rebaselines — inputs visibly change with the explanation living only in
  a transient toast. Settings also has no in-flight save state (buttons stay double-clickable).
- **Slug validation errors can be invisible.** `components/collections/CollectionItemForm.jsx`
  renders the slug field and its error inside the collapsed "More settings" block (`showMore`
  defaults false) — a slug failure blocks submit with nothing visible until expanded.
- **Side effect in render:** `pages/MenuStructure.jsx` calls `showToast` in the render body of
  its not-found branch.

**Fix (investigate — a pattern decision, not one change):** distinguish load-failure from empty
(an error state with retry vs. the empty-state CTA), await `onConfirm` in the confirmation modal
and surface its failure, keep/mark failed upload rows, give export a persistent error surface,
route server rejections into forms via `setError`, and hoist or duplicate the slug error outside
the collapsed section. Individually small; worth one sweep so the pieces land consistently.

---

## ⬜ 65. Raw `.html` internal hrefs under Clean URLs — user-typed links, theme Liquid, schema defaults (`core` / `render-engine` / themes) — low

**Priority:** Low

Clean URLs only reshapes hrefs the engine itself resolved from a stable uuid
(`pageHref` / `itemHref` in `packages/core/src/utils/internalHref.js`, consumed by
`packages/render-engine/src/menuResolver.js` and `collectionService.js`'s richtext/link
resolution). Three sources never go through that resolution and so keep emitting a raw
`.html` (or whatever string was authored) even when a project's Clean URLs setting is on:

- **Custom menu/link strings** — an author-typed `link` (no `pageUuid` /
  `collectionItemUuid`) is passed through `prefixInternalHref` / `sanitizeHref` only, and
  is emitted exactly as authored (`resolveMenuItemLinks`'s `else if (typeof item.link ===
  "string" ...)` branch).
- **Theme Liquid** — the arch header logo (`themes/arch/widgets/global/header/widget.liquid`)
  is a hand-written home href. Since 2026-08-28 it picks its own shape from
  `globals.cleanUrls` (`./` / `../` when on, `{{ globals.outputPathPrefix }}index.html`
  otherwise) — a theme-side workaround that re-encodes the `pageHref` home rule in Liquid.
  **Still open:** the engine should expose the home link once (e.g. a `globals.homeHref`
  computed via `pageHref("index", …)`, or a `home_url` filter) so themes never carry that
  rule themselves; then the arch template can go back to one expression.
- **Schema defaults** — `themes/arch/widgets/global/header/schema.json:89-97` ships the
  header CTA's default `link` setting as `{ "href": "contact.html", ... }`.

**Decision (2026-08-27):** left as authored. None of these three sources carry a stable
uuid to resolve from, so there is no render-time signal that distinguishes "this string is
an internal page path" from an arbitrary author-typed href; rewriting them would mean
guessing at authorial intent from string shape alone.

**Questions to revisit:**

- Should the renderer normalise a relative `.html` href it did not resolve (i.e. one with
  no scheme, not root-absolute, not anchor/query-only) when the project's Clean URLs flag
  is on, rather than leaving raw `.html` strings mixed into an otherwise extensionless
  site?
- Which paths still produce a raw string given presets are uuid-enriched at project
  creation (`enrichNewProjectReferences` in
  `packages/builder-server/src/utils/linkEnrichment.js`) — is the arch header logo/CTA the
  only theme-authored gap, or do other themes/widgets ship similar hardcoded `.html`
  hrefs?

---

## ⬜ 66. Editor surfaces raw server error strings — `Slug "suite" already exists`, `Validation failed` — instead of field-anchored, localized messages (`editor-ui` / `builder-server`) — medium (UX) — sweep all error paths

**Priority:** Medium

**Symptom (2026-08-28, collection item form).** Typing a filename that another item already
uses shows the toast `Slug "suite" already exists`; typing the reserved `index` shows
`Validation failed`. The first uses the word "slug" while the field is labelled **Filename**
(`packages/core/src/locales/en.json` → `collectionsForm.slugLabel`); the second says nothing
about *what* failed. Neither is localized, and neither is attached to the field.

**Root cause.** `CollectionItemForm.jsx`'s submit handler
(`packages/editor-ui/src/components/collections/CollectionItemForm.jsx`, `onSubmitHandler`
catch) does `showToast(err.message || …)`, i.e. it echoes whatever the server wrote:

- `SLUG_CONFLICT` → `collectionController.js` `respondError` sends
  `{ error: "Slug already exists", message: err.message, conflictingSlug }`, and `err.message`
  is `CollectionSlugConflictError`'s server-authored string (`collectionService.js`).
- `VALIDATION` → it sends `{ error: "Validation failed", validationErrors: [{ fieldId, reason }] }`
  with no `message`, so `apiFetch.js`'s `getErrorMessage` falls back to `data.error`. The
  `validationErrors` array — the only part that says *which field* and *why* (e.g.
  `{ fieldId: "slug", reason: "reserved slug" }`) — is dropped on the floor. The form reads
  `validationErrors` only when seeding a loaded-invalid item, and even there skips
  `fieldId === "slug"`.

So every server-side validation failure on that form reads "Validation failed"; the reserved
`index` filename rule only made it visible.

**Fix for these two.** Client-side, localized, anchored to the field; leave the server strings as
the API's contract (they are what logs and non-editor callers see):

- In the submit catch, read `err.data` (`ApiError` already carries the JSON body):
  `conflictingSlug` → set the slug field error from a new `collectionsForm.slugTaken`
  (*"Filename "{slug}" is already in use"*); `validationErrors` → map per entry
  (`slug` + `"reserved slug"` → new `collectionsForm.slugReserved`: *""index" can't be used as
  a filename — it would name the collection's own page"*; other ids →
  `collectionsForm.fieldRequired`). Toast only when nothing could be mapped.
- Drop the `fieldId !== "slug"` skip in the seeding effect so a loaded-invalid item shows its
  filename problem too.
- Pages have the identical mismatch: `pageController.js` sends *"A page with the slug "x"
  already exists…"* while `PageForm.jsx` labels the field "Filename" (`pages.filenameLabel`).
  Give `PageForm` the same `slugTaken` treatment.

**When picking this up, sweep — don't fix just these two.** The pattern is systemic: the editor
has ~24 `showToast(err.message || t(...))` sites and builder-server has ~100
`res.status(4xx).json({ error: … })` responses, most with hand-written English `message`s. Do
one pass and file/fix what it finds:

1. `grep -rn "showToast(err.message\|showToast(error.message\|err?.message ||" packages/editor-ui/src`
   — every hit echoes a server string to the user. For each, decide: field-anchored error
   (validation, conflicts, limits), localized toast, or silent + logged.
2. `grep -rn "\.status(4[0-9][0-9]).json({ error:" packages/builder-server/src` — list the
   `error` / `message` strings. Any that a user can trigger from the editor needs either a
   stable `code` the client can map to a locale key, or structured data (`validationErrors`,
   `conflictingSlug`, limits) the client can render — not prose.
3. Compare every user-visible string against the field labels in
   `packages/core/src/locales/en.json`: "slug" vs "Filename", "page"/"item" vs the
   collection's display name, internal names (`settings`, `uuid`, `scope`) leaking through.
4. Check the generic fallbacks: `apiFetch.js` `getErrorMessage` (uses `data.message`, then
   `data.error`, then the caller's fallback) — if a response carries only structured fields,
   the caller's fallback must be a real localized sentence, never `Request failed`.
5. Forms to walk with a deliberately wrong input: page create/rename, collection item
   create/rename/duplicate, menu item link, media upload (size/type limits), theme install /
   update, project create/duplicate/import, form submissions settings, SEO fields.

Overlaps with §64 (error feedback is toast-only / misleading failure states): §64 is about
*where* errors show; this item is about *what they say*. Fix them together if the same files are
open.

---

## ⬜ 67. Export viewer confinement is lexical — a symlink inside an export dir escapes it (`builder-server`) — low

**Priority:** Low

`resolveExportFile` (`packages/builder-server/src/routes/export.js`) confines every candidate
to the selected export directory with `isWithinDirectory` (`packages/core/src/utils/pathSecurity.js`),
which is a `path.relative` check on the *lexical* path. `fs.statSync` and `res.sendFile` both
follow symlinks, and neither the export root nor the candidate is `realpath`ed first. So an
export dir containing `about.html -> ../other-export/secret.html` (or an absolute target) passes
the containment check — the symlink's own path is inside the export — and the viewer serves the
target. Pre-existing: the pre-rewrite viewer had the same lexical check and the same follow.

How a symlink gets into an export: the asset copy (`exportController.js`, `fs.copy(projectAssetsDir,
outputAssetsDir, { filter })`) runs fs-extra's copy without `dereference`, and fs-extra recreates a
symlink it meets as a symlink (`fs-extra/lib/copy/copy.js`, `onLink`). So a symlink placed under a
project's `assets/` — by hand, or by any future importer that preserves links — is carried into
every export verbatim. No builder code path creates one today (multer uploads and the theme
installer's zip extraction write regular files), which is why this is low: the attacker needs write
access to the project's asset dir, and in the OSS shell that is the same user the viewer serves.
Worth closing anyway — the viewer is the one place that serves files out of a directory the
render pipeline populates.

Fix: realpath in two steps, because realpathing the export root alone still accepts an export root
that is itself a symlink out of the publish dir — `fs.realpathSync` the publish dir and the export
root and check the root is within the publish dir, then realpath each existing candidate and check
it is within the real root (or `lstat` and refuse symlinks outright at the viewer, and/or pass
`dereference: true` to the export's asset copy so a symlink is materialised as a file). Add two
`exportView.test.js` cases — a symlinked candidate and a symlinked export root — alongside the
existing traversal tests.

---

## ⬜ 68. A Website Address with a path or query produces inconsistent sitemap, robots and canonical URLs (`builder-server` / `core`) — low

**Priority:** Low

`isValidSiteUrl` (`packages/core/src/utils/urlSafety.js`) accepts any http(s) URL with a dotted
host, path and query included (`safeUrlFilter.test.js` pins `https://www.example.co.uk/path?q=1`
as valid). The SEO builders then disagree on how to join a page onto it:

- `buildSitemap` (`packages/builder-server/src/services/seoArtifacts.js`) uses
  `new URL("/", siteUrl)` for the home page and *relative* `new URL(`${slug}${ext}`, siteUrl)`
  for pages and items — relative resolution replaces the last path segment.
- `buildRobotsTxt` uses `new URL("sitemap.xml", siteUrl)` — same replacement.
- `resolveCanonicalUrl` (`packages/core/src/tags/SeoTag.js`) and `buildItemPageData`'s canonical
  (`packages/builder-server/src/services/collectionService.js`) concatenate strings onto the
  normalised `siteUrl`.

For `siteUrl = https://example.com/sites/foo`: About's canonical is
`https://example.com/sites/foo/about`, its sitemap entry `https://example.com/sites/about`, the
home entry `https://example.com/`, and robots points at `https://example.com/sites/sitemap.xml`.
With a query, a canonical becomes `https://example.com/sites/foo?q=1/about`. Independent of the
Clean URLs setting (both shapes are affected the same way) and pre-existing — `seoArtifacts.test.js`
only ever uses an origin-root fixture.

Fix options: (a) reject a path/query/hash in the Website Address at validation time and say so in
the settings form (simplest — the builder's output layout is flat, a sub-path deployment is
already unsupported elsewhere); or (b) normalise `siteUrl` once to a directory base (strip query
and hash, force a trailing slash) and route every SEO URL — pages, items, home, sitemap, robots,
canonicals — through one helper. Either way, test a path base with and without a trailing slash
under both Clean URLs values.

---

## ⬜ 70. Widget assets enqueued with a sub-path (`vendor/lib.js`) render a nested URL but are flattened to `assets/<basename>` on export (`builder-server` / `core`) — low

**Priority:** Low

`enqueue_script` / `enqueue_style` (and, since they resolve the same way, script/style `enqueue_preload`s) accept any path relative to the asset folder, and `buildAssetUrl` (`packages/core/src/utils/assetUrl.js`) keeps it: a widget that enqueues `vendor/lib.js` gets `/api/preview/assets/<id>/widgets/<type>/vendor/lib.js` in preview — which the preview route serves, nested paths included — and `assets/vendor/lib.js?v=…` in an export. The export, however, ships widget files by **basename only**: `exportProjectToDir` (`packages/builder-server/src/controllers/exportController.js`, the "Copy Widget Assets" step) walks `widgets/**` for CSS/JS, keeps the ones whose basename was enqueued, and copies each to `assets/<basename>`. So the published page requests `assets/vendor/lib.js` while the file landed at `assets/lib.js` — a 404 in production that preview never shows. Theme-level `assets/` is copied as a tree, so sub-paths there are fine; the gap is widget folders only. Nothing shipped is affected (Arch's widget assets are all flat, one file per widget dir). Two consistent fixes: preserve the relative sub-path when flattening (`assets/vendor/lib.js`) and match enqueued *paths* rather than basenames — or reject sub-paths in widget-origin enqueues with a render-time warning and document "widget assets must sit directly in the widget folder" in `docs-llms/theming.md`. The `theming.md` note that same-named widget files overwrite each other on export applies to whichever is chosen.

## Completed — reference table

Bodies live in git, not here. `Fix` is the first commit that implemented the item; `Body at` is the last commit whose `docs-llms/TODO.md` still carries the full write-up — read it with `git show <hash>:docs-llms/TODO.md`.

| # | Item | Closed | Fix | Body at |
|---|------|--------|-----|---------|
| 1 | Relative preview asset URLs (robustness) | ✅ DONE 2026-07-01 | `8ca0d79f` | `efc6e957` |
| 2 | Bundled theme updates on the OSS desktop app (product/design decision) | ❌ WONTFIX 2026-06-27 | `87d2246e` | `efc6e957` |
| 3 | Modernize pre-refactor `src/...` / `server/...` paths in `docs-llms/*` (docs hygiene) | ✅ DONE 2026-06-26 | `2ddc2ef6` | `efc6e957` |
| 5 | Consolidate preview-dispatch logic (route-mapping half) | ✅ DONE 2026-06-25 | `10e33449` | `efc6e957` |
| 6 | Narrow-sidebar icon-grid + color-picker visual review | ✅ DONE 2026-06-26 | `3028aae3` | `efc6e957` |
| 7 | Missed port — theme-upload collection-schema gate not wired (`builder-server`) | ✅ DONE 2026-06-25 | `2ff036d7` | `efc6e957` |
| 8 | Missed port — `pageController` doesn't thread `projectId` into `cleanupDeletedPageReferences` (`builder-server`) | ✅ DONE 2026-06-25 | `618e4458` | `efc6e957` |
| 9 | Missed port — `Media.jsx` doesn't seed collection-item usage titles (`editor-ui`) | ✅ DONE 2026-06-25 | `8d1e22a4` | `efc6e957` |
| 10 | Missed port (tests only) — `createCollectionPreviewToken` guard tests (`builder-server`) | ✅ DONE 2026-06-26 | `ff0d0186` | `efc6e957` |
| 11 | Missed port — link-picker Combobox group headers not rendered (`editor-ui`) | ✅ DONE 2026-06-26 | `52c07216` | `efc6e957` |
| 12 | Missed port — richtext-embedded media not tracked as used (`builder-server`) | ✅ DONE 2026-06-26 | `0059c214` | `efc6e957` |
| 13 | Missed port — `theme:update-delta` release tool not ported (OSS dev tooling) | ✅ DONE 2026-06-26 | `4e129603` | `efc6e957` |
| 14 | Documentation port audit — content gaps from the master-commit doc changes | ✅ DONE 2026-06-27 | `87d2246e` | `efc6e957` |
| 15 | Missed port — collection item pages leak the `page-{slug}` body class (`render-engine`) | ✅ DONE 2026-06-26 | `4da0d2c0` | `efc6e957` |
| 16 | Missed port — `refreshAllMediaUsage` aborts early on a project with no pages dir (`builder-server`) | ✅ DONE 2026-06-26 | `9092e617` | `efc6e957` |
| 18 | Missed port (tests only) — depth-1 render smoke + depth-0 no-leak guard not ported (`builder-server`) | ✅ DONE 2026-06-26 | `01c9c393` | `efc6e957` |
| 19 | Missed port (tests only) — `renderCollectionItemPage` contract test not ported (`builder-server`) | ✅ DONE 2026-06-26 | `bfde3b9e` | `efc6e957` |
| 20 | Stale test comment — claims `remapCollectionItem{Link,Menu}Refs` "NOT ported" when they are (`builder-server`) | ✅ DONE 2026-06-26 | `cfd8678b` | `efc6e957` |
| 21 | Dedup the cross-bundle `getStandalonePreviewTarget` copy + drop its dead `editor-ui` export (`editor-ui` + OSS preview runtime) | ✅ DONE 2026-06-26 | `b73d237e` | `efc6e957` |
| 22 | Gate collection schemas on the theme **update-import** path too (`builder-server`) | ✅ DONE 2026-06-27 | `1c831b4b` | `efc6e957` |
| 23 | Widget-catalog enumeration logs spurious "Failed to parse schema" warnings (`builder-server`) | ✅ DONE 2026-06-26 | `1fdc361c` | `efc6e957` |
| 24 | Missed port (defensive) — `updatePageWidgets` lacks the `pagesDir` existence guard (`builder-server`) | ✅ DONE 2026-06-26 | `1fdc361c` | `efc6e957` |
| 25 | Decide whether to anchor `EMBEDDED_MEDIA_PATH_RE` so foreign URLs don't mark local assets "used" (`builder-server`) | ✅ RESOLVED 2026-06-26 | `6038ffff` | `efc6e957` |
| 26 | Extract the shared dropdown `<ul>` from `ui/Combobox` + `MenuCombobox` instead of the copy-pasted group header (`editor-ui`) | ✅ DONE 2026-06-26 | `8d3ba978` | `efc6e957` |
| 27 | Harden the `theme:update-delta` dev tool — version-tag parsing, quoted diff paths, util reuse (OSS dev tooling) | ✅ DONE 2026-06-27 | `e05d9c58` | `efc6e957` |
| 28 | Close the path-based storage exceptions for the hosted boundary (adapter discipline) | ✅ DONE 2026-07-02 | `e52dfe06` | `efc6e957` |
| 29 | Loud stale-active-project detection in the OSS editor | ✅ DONE 2026-07-07 | `5a792416` | `efc6e957` |
| 31 | Theme save doesn't track theme media usage (embedding-host-facing; fixed in `builder-server`) | ✅ DONE 2026-07-02 | `5996a17b` | `efc6e957` |
| 34 | `copyThemeToProject` exclude-filter widened from dirs to entries (`builder-server`) | ✅ DONE 2026-07-07 | `36d081d7` | `efc6e957` |
| 35 | Create-from-preset + Refresh Usage don't track media usage (embedding-host-facing; fixed in `builder-server`) | ✅ DONE 2026-07-02 | `cae73b17` | `efc6e957` |
| 36 | Cold-boot race bounces the editor to the picker on an aborted active-project fetch (`editor-ui`) | ✅ DONE 2026-07-07 | `2e0dc1c9` | `efc6e957` |
| 37 | `EmptyState.jsx` renders unstyled — `empty-state*` classes have no matching CSS (`editor-ui`) | ✅ DONE 2026-08-23 | `9279c720` | `9279c720` |
| 40 | OSS mounts allow-all `cors()` on the unauthenticated localhost API (`builder-server`) | ✅ DONE 2026-08-23 | `9279c720` | `9279c720` |
| 42 | Media upload allowlist trusts the client-declared MIME while serve derives Content-Type from the stored extension (`builder-server`) | ✅ DONE 2026-08-23 | `bef9e9ec` | `9279c720` |
| 45 | Dead code — empty branch in `mergeSettingsArray` (`builder-server`) | ✅ DONE 2026-08-23 | `9279c720` | `9279c720` |
| 46 | `buildLatestSnapshot` rebuilds `latest/` non-atomically (`builder-server`) | ✅ DONE 2026-08-23 | `d9c9a8bb` | `9279c720` |
| 48 | Unmerged `list-button` branch — SplitButton feature + independent `saveStore` fixes (`editor-ui`) | ✅ RESOLVED 2026-08-22 | `4bd1509a`, `d2a50a85` | `d2a50a85` |
| 50 | Structure-only undo/redo doesn't re-arm the autosave timer (`editor-ui`) | ✅ DONE 2026-08-23 | `d61ab806` | `9279c720` |
| 55 | Vitest setup lacks an i18n instance so provider-less component tests warn (`editor-ui` tests) | ✅ DONE 2026-08-23 | `9279c720` | `9279c720` |
| 56 | `EditorShell`/`PluginProvider` default-param object/array literals defeat memoization for a non-memoizing caller (`editor-ui`) | ✅ DONE 2026-08-23 | `9279c720` | `9279c720` |
| 59 | `getCachedThemeValue` — an in-flight loader can repopulate an invalidated cache entry (`builder-server`) | ✅ DONE 2026-08-23 | `d9c9a8bb` | `9279c720` |
| 60 | `layerThemeSnapshot` swallows per-update apply errors, so a partial snapshot can be promoted (`builder-server`) | ✅ DONE 2026-08-23 | `d9c9a8bb` | `9279c720` |
