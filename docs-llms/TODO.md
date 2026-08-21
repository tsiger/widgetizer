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
- [⬜ 39. SQLite transaction-boundary audit — media/project repositories (`builder-server`) — 39a moderate (data-integrity), 39b/39c low (concurrency)](#-39-sqlite-transaction-boundary-audit--mediaproject-repositories-builder-server--39a-moderate-data-integrity-39b39c-low-concurrency)
- [⬜ 41. Richtext sanitize CPU degrades over process lifetime — DOMPurify + jsdom accumulation (`builder-server`) — low (OSS-standalone) / moderate (hosted, long-lived process) — investigate (perf)](#-41-richtext-sanitize-cpu-degrades-over-process-lifetime--dompurify--jsdom-accumulation-builder-server--low-oss-standalone--moderate-hosted-long-lived-process--investigate-perf)
- [⬜ 42. Media upload allowlist trusts the client-declared MIME while serve derives Content-Type from the stored extension (`builder-server`) — low (OSS-standalone) / moderate (hosted — stored XSS, needs confirmation)](#-42-media-upload-allowlist-trusts-the-client-declared-mime-while-serve-derives-content-type-from-the-stored-extension-builder-server--low-oss-standalone--moderate-hosted--stored-xss-needs-confirmation)
- [⬜ 44. Extract the published-media selection rules into `@widgetizer/core` + finish `seedPresetMedia`'s scope-first conversion (`builder-server` / `core`) — not started](#-44-extract-the-published-media-selection-rules-into-widgetizercore--finish-seedpresetmedias-scope-first-conversion-builder-server--core--not-started)
- [⬜ 46. `buildLatestSnapshot` rebuilds `latest/` non-atomically (`builder-server`)](#-46-buildlatestsnapshot-rebuilds-latest-non-atomically-builder-server)
- [⬜ 48. Unmerged `list-button` branch — SplitButton feature + independent `saveStore` fixes (`editor-ui`) — medium (fix half is data-integrity) — decide rebase vs fresh-branch port](#-48-unmerged-list-button-branch--splitbutton-feature--independent-savestore-fixes-editor-ui--medium-fix-half-is-data-integrity--decide-rebase-vs-fresh-branch-port)

### Low priority

- [⏸️ 4. Playwright E2E smoke (OSS)](#-4-playwright-e2e-smoke-oss)
- [⏸️ 17. Test-strictness audit — ported tests may have dropped master's *exclusion* assertions (cross-cutting) — low (process) — deferred 2026-06-26](#-17-test-strictness-audit--ported-tests-may-have-dropped-masters-exclusion-assertions-cross-cutting--low-process--deferred-2026-06-26)
- [⬜ 32. Theme-upload update-import validation smells (`builder-server`) — low — investigate](#-32-theme-upload-update-import-validation-smells-builder-server--low--investigate)
- [⬜ 33. Editor-ui duplication smells (`editor-ui`) — low (maintainability) — investigate](#-33-editor-ui-duplication-smells-editor-ui--low-maintainability--investigate)
- [⬜ 37. `EmptyState.jsx` renders unstyled — `empty-state*` classes have no matching CSS (`editor-ui`) — low (cosmetic)](#-37-emptystatejsx-renders-unstyled--empty-state-classes-have-no-matching-css-editor-ui--low-cosmetic)
- [⬜ 38. Mutation-on-GET — `getActiveProject` writes the active id on a read (`builder-server`) — low — investigate](#-38-mutation-on-get--getactiveproject-writes-the-active-id-on-a-read-builder-server--low--investigate)
- [⬜ 40. OSS mounts allow-all `cors()` on the unauthenticated localhost API (`builder-server`) — low (security; OSS-standalone only)](#-40-oss-mounts-allow-all-cors-on-the-unauthenticated-localhost-api-builder-server--low-security-oss-standalone-only)
- [⬜ 43. Render-engine containment — two edges left open (`render-engine` / `core`) — low](#-43-render-engine-containment--two-edges-left-open-render-engine--core--low)
- [⬜ 45. Dead code — empty branch in `mergeSettingsArray` (`builder-server`)](#-45-dead-code--empty-branch-in-mergesettingsarray-builder-server)

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

## ⬜ 37. `EmptyState.jsx` renders unstyled — `empty-state*` classes have no matching CSS (`editor-ui`) — low (cosmetic)

**Priority:** Low

**Status:** ⬜ open — surfaced 2026-07-07 while reviewing error/empty-state components as a model for §36's
`WorkspaceLoadFailed` (`EmptyState` was rejected as the model *because* it's unstyled). A concrete,
low-severity defect.

**What.** `packages/editor-ui/src/components/ui/EmptyState.jsx` emits semantic class names — `empty-state`,
`empty-state-icon`, `empty-state-title`, `empty-state-description` — but **no CSS in the repo matches them.**
The only `empty-state` rules that exist are `preview-empty-state*` (a *different* prefix, defined inline in the
preview iframe by `builder-server/src/controllers/previewController.js`). So the component renders as a bare
`<div><h3><p>` with only whatever `className` the caller passes.

**Live surface.** Used by the Themes page (`app/src/pages/Themes.jsx:414`) as the "no themes" state (no
`icon` / `action` / extra `className`), so it currently shows an unstyled title + description. It's also
re-exported from `components/ui/index.js`, so any future consumer inherits the dead styling.

**Fix options.** Add the missing `empty-state*` CSS, or (preferred, to match the rest of `ui/`) restyle with
Tailwind utilities like the sibling components — e.g. `ExportCreator`'s `variant="empty"` branch already does a
centered empty-state layout inline. Then re-check the call site.

**Scope.** Pure `@widgetizer/editor-ui`; a fix flows to web / Electron / hosted via the vendored package. No
server/contract change.

**Effect:** low (cosmetic) — a low-traffic empty state renders unstyled; no data or correctness impact.

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

**Scope.** OSS `builder-server`. **Hosted impact:** none — hosted resolves scope per-request via
`CloudScopeResolver` and doesn't use the OSS singleton active-project model, so it never reaches this handler.

**Effect:** low — no known break; GET-idempotency / robustness hygiene, and probably a master-parity keep.

---

---

## ⬜ 39. SQLite transaction-boundary audit — media/project repositories (`builder-server`) — 39a moderate (data-integrity), 39b/39c low (concurrency)

**Priority:** Medium

**Status:** ⬜ open — surfaced 2026-07-08 auditing every `db.transaction(...)` site across the repositories.

**39a — Atomicity gap: `addMediaFile` isn't transactional (moderate, data-integrity).**
`insertMediaFile` (`packages/builder-server/src/db/repositories/mediaRepository.js:216`) writes a
`media_files` row **plus** N `media_sizes` rows across separate statements. `writeMediaData` wraps this helper
in a `db.transaction(...)`, but `addMediaFile` (`mediaRepository.js:95`) calls it **bare**, and its callers
don't wrap it either (`controllers/mediaController.js:443`, the upload path; `controllers/projectController.js:145`).
So a failure *after* the `media_files` insert but *among* the size inserts commits a media file with
partial/missing size variants → broken/missing thumbnails on render. **Fix:** wrap `insertMediaFile`'s
two-table write in a transaction (self-wrap the helper so both `addMediaFile` and `writeMediaData` are covered
— better-sqlite3 nests via savepoints, so `writeMediaData` calling a now-transactional helper is fine).

**39b — Read-then-write transactions are concurrency-fragile (low, latent correctness).**
`replaceMediaUsage` (`mediaRepository.js:156`), `updateMediaUsageForSource` (`:186`), and `writeProjectsData`
(`repositories/projectRepository.js:204`) each `SELECT id FROM …` and then `DELETE`/`INSERT` **inside one
`db.transaction()`**. better-sqlite3's default `BEGIN DEFERRED` takes the write lock lazily, so a
read-then-write can fail with an **un-waitable `SQLITE_BUSY_SNAPSHOT`** if another connection commits between
the read and the write. Harmless on a single connection today, but a latent hazard the moment the DB file is
shared by multiple processes/workers. **Fix (preferred):** fold the `SELECT id FROM media_files WHERE
project_id = ?` into the `DELETE` as a correlated subquery (`… WHERE media_file_id IN (SELECT id FROM
media_files WHERE project_id = ?)`), making the txn **write-only** — no snapshot hazard and one fewer round
trip. **Or:** run these write txns via better-sqlite3's `.immediate()` variant. Also fix the misleading
"safe for parallel calls" comment on `updateMediaUsageForSource`: SQLite serializes **all** writes on one
db-level lock (no row-level locking), so parallel calls touching disjoint rows still contend.

**39c — Multi-read getter without a read transaction (low, robustness).**
`getMediaFileById` (`mediaRepository.js:47`) does 3 reads across `media_files` / `media_sizes` / `media_usage`
with no wrapping transaction, so under concurrent connections it can observe a **torn snapshot**. Harmless on
a single connection; wrap the reads in a `DEFERRED` read-only transaction for snapshot consistency if the DB
is ever shared.

**Scope.** OSS `builder-server`. **Hosted impact:** hosted shares this connection and drives all of the above
through the mounted routes, so **39a** also affects the hosted media-upload path.

**Effect:** 39a moderate (data-integrity — real, low-probability); 39b/39c low (latent under concurrency).

---

---

## ⬜ 40. OSS mounts allow-all `cors()` on the unauthenticated localhost API (`builder-server`) — low (security; OSS-standalone only)

**Priority:** Low

**Status:** ⬜ open — carried in from a 2026-06-19 security audit (its finding id was **SA-21**). The reproduction is restated in full below, so this item stands alone.

`applySharedMiddleware` (`packages/builder-server/src/createApp.js:11`) mounts a bare `app.use(cors())` — `Access-Control-Allow-Origin: *`, no origin allowlist — on the unauthenticated, single-tenant localhost API. The server binds **127.0.0.1** only (`app/server-common.js:67`, so not network-reachable), but any other origin open in the same browser can `fetch('http://localhost:3001/api/projects')` cross-origin (ACAO `*`, no creds needed), and a JSON `POST`/`DELETE` to a project route passes the preflight → cross-origin **read + state-change** of the user's local projects. (Electron uses an ephemeral port, making targeting harder.)

**Exposure is OSS-standalone only.** `applySharedMiddleware` runs when the OSS shells assemble the app; an embedding host supplies its own middleware stack and never executes this `cors()` call, so the issue does not travel with `builder-server` when it is embedded.

**Fix.** Replace bare `cors()` with an origin allowlist (the configured frontend origin), or enable permissive CORS **only in dev** — production/Electron serve the SPA same-origin from the same Express, so CORS is unneeded there. Keep byte-neutral for the legit dev split-origin (:3000 → :3001) flow.

**Test.** Integration: a request with a disallowed `Origin` does **not** receive `Access-Control-Allow-Origin: *` (restricted to the allowlisted/dev origin); the legit dev origin still works.

**Effect:** low — OSS-standalone only; the browser-mediated exposure is bounded to the user's own machine + local content.

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

## ⬜ 42. Media upload allowlist trusts the client-declared MIME while serve derives Content-Type from the stored extension (`builder-server`) — low (OSS-standalone) / moderate (hosted — stored XSS, needs confirmation)

**Priority:** Medium

**Status:** ⬜ open — surfaced 2026-07-09 while scoping ZIP media-upload support. **Pre-existing** (affects PDF/audio uploads today, independent of ZIP); newly written up, not carried from the SA register.

**What.** Three points key off *different* signals that don't have to agree:

- **Acceptance keys on the client-declared MIME.** The media `fileFilter` (`packages/builder-server/src/controllers/mediaController.js:142`) admits a file solely because `file.mimetype` is in `ALLOWED_MIME_TYPES` (`utils/mimeTypes.js:16`). That mimetype is the multipart-declared `Content-Type` — attacker-controlled.
- **Storage keeps the original extension verbatim.** `uniqueName` slugifies only the basename and re-appends `path.extname(originalname)` (`mediaController.js:254-257`), so a `.html` extension survives into `uploads/files/`.
- **Serve keys on the stored extension.** `serveProjectMedia` sets the response `Content-Type` from `getContentType(path.extname(key))` (`mediaController.js:612`), not from the declared or sniffed type.

**The vector.** A hand-crafted multipart `POST /api/media` pairing `filename="x.html"` with an allowed `Content-Type` (`application/pdf` today, `application/zip` once ZIP lands) passes the filter, is stored as `x.html`, and is later served as `Content-Type: text/html` from the API origin → the browser renders and executes it. `helmet`'s `nosniff` does **not** help: the server *itself* declares `text/html`, so there is nothing to sniff. The normal UI can't reach this (the dropzone `accept` gates on extension) — it takes a crafted request.

**Why low for OSS / why flagged for hosted.** On the OSS desktop app the only actor who can craft that upload is the sole local user, hitting a 127.0.0.1-bound API — self-XSS on your own machine, negligible (same local single-user trust model as `core-security.md` §8's advanced-theme raw-code and this file's §40 local-CORS). It matters for **Widgetizer Hosted**: uploads are served from the authenticated app origin and can be opened/shared across actors, so a stored `text/html` masquerading as an allowed upload is a genuine stored-XSS on the app origin. **Hosted impact needs confirmation** — depends on whether hosted serves uploads through this same controller (extension-derived Content-Type) or via signed object-storage URLs with a forced/stored content-type; if the former, the vector applies.

**ZIP note.** Adding `.zip` to the allowlist does **not** worsen this — a genuine ZIP serves as `application/zip`/`octet-stream` (download, inert). ZIP just makes it timely to close the underlying gap while in this code.

**Fix (root cause).** Add an **extension allowlist** to `fileFilter`: reject unless `path.extname(file.originalname).toLowerCase()` is in an allowed-extension set mirroring `ALLOWED_MIME_TYPES` (`.jpg/.jpeg/.png/.gif/.webp/.svg/.pdf/.mp3` [+`.zip`]). This rejects `x.html` regardless of the declared MIME and is byte-neutral for legitimate uploads. **Defense-in-depth (optional):** send `Content-Disposition: attachment` for the non-image (`files/`) serve category so even a mismatched stored file downloads instead of executing — but keep PDFs inline (their inline view is desirable UX), so gate the disposition on category/extension rather than applying it blanket.

**Scope.** `@widgetizer/builder-server` (`mediaController` `fileFilter` + optionally the serve headers). The theme-upload/import filters have the same MIME-only shape — fold in a shared extension-allowlist helper only if convenient. Docs: `core-media.md` (§ "Media Type Configuration" / "Upload Flow") and `core-security.md` §1/§9 describe the fileFilter as MIME-allowlist-enforced without noting the extension/served-type mismatch — update when fixed.

**Test.** A crafted upload with `filename="x.html"` + an allowed MIME is **rejected** by the filter; legit `.pdf`/`.mp3`/image uploads still pass and PDFs still serve inline. If the serve-side mitigation lands: a stored non-image asset serves with `Content-Disposition: attachment`.

**Effect:** low for OSS-standalone (self-XSS, local-only, crafted-request-only); moderate for hosted **if** uploads are served via this controller (stored XSS on the app origin) — confirm the hosted asset-serving path.

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

## ⬜ 45. Dead code — empty branch in `mergeSettingsArray` (`builder-server`)

**Priority:** Low

`packages/builder-server/src/services/themeUpdateService.js:162-163`, inside `mergeSettingsArray`:

```js
if (userItem.default !== undefined && newItem.default === undefined) {
  // Don't preserve default if new schema removed it
}
```

The branch body is empty — just the comment, no statement. Since `merged` already starts as a spread of
`newItem` (which has no `default` key in this case), the condition is a no-op either way. Remove the dead
branch, or implement whatever it was meant to guard (unclear from the comment alone — re-derive intent
from `mergeSettingsArray`'s callers before deciding).

---

## ⬜ 46. `buildLatestSnapshot` rebuilds `latest/` non-atomically (`builder-server`)

**Priority:** Medium

`packages/builder-server/src/controllers/themeController.js`, `buildLatestSnapshot`: the rebuild removes
the existing `latest/` directory (`fs.remove(latestDir)`) and then re-layers base + updates into a fresh
`latest/` via `layerThemeSnapshot`. Between the removal and the last file being copied back in, any
concurrent reader of `latest/` (e.g. project scaffold copying a theme mid-rebuild) can observe a missing
or half-built directory. Consider building into a temp sibling directory and atomically renaming it onto
`latestDir` once complete, so readers only ever see the old complete tree or the new complete tree, never
an in-between state.

---

## ⬜ 48. Unmerged `list-button` branch — SplitButton feature + independent `saveStore` fixes (`editor-ui`) — medium (fix half is data-integrity) — decide rebase vs fresh-branch port

**Priority:** Medium

The pushed `list-button` branch (forked from master 2026-07-13, 19 commits, `065d5360`..`f03c2f60`)
carries two distinct halves. *(This item is numbered §48, skipping §47: the branch's own TODO edits
claim §45–§47 for different items, and its commit messages cite those numbers — reusing §47 on
master would silently repoint them.)*

**(a) Feature:** the page-editor topbar primary-action SplitButton (`065d5360`, `ae05f192`,
`cbfff4cb`) and the shared Ctrl+S/click dispatch seam `useDispatchCommand` (`4582a315`). Whether
this ships is a product/UX call still to be made.

**(b) Independent fixes to bugs still live on master** — `saveStore.js`/`pageStore.js` are untouched
on master since the fork, so all of these defects exist today:

- autosave/manual-save overlap race, both directions (`a92cbdb3`) — no in-flight tracking at all;
- a header/footer edit made while its own save is in flight is missed or flagged-but-never-resent —
  silent loss of the second edit (`0e7ab252`, `c4c9cb6a`);
- autosave timer goes permanently silent on a skipped tick / gets clobbered (`6b6a456a`, `d4eb5b03`);
- the structural fix under all of the above: single-flight save queue, generation-gated `reset()`,
  retry backoff (`99d0d584`, `c28cc5ef`; design doc in `b019dcd3`);
- key-order-sensitive `JSON.stringify` dirty-diffing → `lodash isEqual` (`cd35c26d`);
- undo/redo not integrated with dirty tracking (`2419335a`);
- review-round hardening: another autosave race, silent extension collisions, error-toast
  crash/leak (`f94da15d`, `0f5f622e`). Plus ~500 lines of new saveStore/dispatch tests (`77fde401`).

**The (b) half is worth landing regardless of (a)'s fate.** Caveat: some (b) commits sit textually
on top of (a)'s refactors, so extraction is a small rebase exercise, not clean cherry-picks.

**Weigh rebasing the branch against a fresh branch that ports the pieces.** Master has moved ~129
commits past the fork, and the branch's TODO §-numbering collides with master's — with that much
divergence, porting (b) first (and (a) later if wanted) onto a fresh branch may be cheaper and
safer than rebasing all 19 commits. Close whichever path loses.

---

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
