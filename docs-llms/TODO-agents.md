# Tasks — agents

## Working rules

- This file and [the human version](TODO-humans.md) are two views of one task register. Update IDs, status, priority and scope together.
- **GitHub holds the work.** Every bug, improvement and decision we mean to act on is a GitHub issue, scheduled or not; its body carries the technical detail. GitHub issues, milestones included, are tracked on GitHub only and never mirrored here. This register keeps only what is not issue-worthy yet: unconfirmed checks, needs-triggered later work and embedding requirements. A note that proves real becomes a GitHub issue and leaves this file. Change GitHub itself only when asked.
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
Public board: [OSS Roadmap](https://github.com/users/tsiger/projects/7). On 2026-10-22 the register's bugs, improvements and decisions moved to GitHub issues #165–#196 (with the existing #128, #138 and #154); their register bodies are readable at `e92cda65:docs-llms/TODO-agents.md`.

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

The app's own view route (`serveExportFile`, used when the export viewer is off) checks containment lexically, and `statSync` follows symlinks; the export viewer (`services/exportSite.js`) already compares real paths. First establish whether backup import, theme uploads or preset media can introduce links into exports, then reproduce linked-file, directory and export-root escapes with disposable fixtures before changing serving behaviour.

**Done when:** The supported boundary is explicit and demonstrated escapes are refused (compare `realpath` of the publish folder, export folder and file, or refuse link components), with tests for a linked file, folder and export root.

**Start:** [export.js](../packages/builder-server/src/routes/export.js), [exportController.js](../packages/builder-server/src/controllers/exportController.js). **Source:** Original §67; 2026-11-07 review.

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

#### R-NARROW · Make wide screens fit narrow windows

**Deferred · Low · OSS**

Owner's list, 2026-11-07, after the main column learned to shrink (`min-w-0` in `Layout.jsx` and `ProjectPickerLayout.jsx`) and the Media table's Filename column became flexible: the top bar now stays in view, but below it some screens are still wider than their cards and the content pane scrolls sideways. Measured: Media table out of its card by 152 px at 1000 px (owner accepted this for now); News items 79 px at 1000 / 279 at 800; Export history 210 at 800; Pages 67 at 800; the Settings panel ~25 px at 800; a theme card's "By Widgetizer" line at 375. Unverified (review): the page editor's top bar doesn't wrap and an ancestor clips it (`EditorTopBar.jsx`, `PageEditor.jsx`), so a very narrow window or a long page name could put controls out of reach. Turned down: making the page grow to its widest table (the header and uploader widen too). A per-table sideways scroll would clip the row menus, which open inside the cells.

**Done when:** each listed screen fits its card down to 800 px (fewer or stacked columns, or a scroll whose row menus aren't clipped), and the editor top bar keeps every control reachable.

**Start:** [MediaListItem.jsx](../packages/editor-ui/src/components/media/MediaListItem.jsx), [Table.jsx](../packages/editor-ui/src/components/ui/Table.jsx), [Layout.jsx](../packages/editor-ui/src/components/layout/Layout.jsx). **Source:** owner, 2026-11-07.

#### R-ADMZIP · Take adm-zip's fix for its stale duplicate-name message

**Deferred · Low · OSS**

adm-zip 0.6.1 builds its error messages from a template it overwrites on first use, so every later "Duplicate entry name" error in the process quotes the first name it ever reported (upstream [cthackers/adm-zip#578](https://github.com/cthackers/adm-zip/issues/578), fix in PR [#579](https://github.com/cthackers/adm-zip/pull/579); both open on 2026-11-08, 0.6.1 still the latest release). `openZip` therefore ignores the quoted name and throws `DuplicateZipEntryError` with one general message, which covers both a repeated name and an older backup's two media libraries.

**Done when:** a released adm-zip carries the fix; `builder-server` takes it, `openZip` names the repeated entry again, and the backup import tells the two-media-libraries case apart.

**Start:** [zipSafety.js](../packages/builder-server/src/utils/zipSafety.js) (`openZip`), [backupImportChecks.test.js](../packages/builder-server/src/tests/backupImportChecks.test.js). **Source:** dependency upgrade, 2026-11-06.

#### R-PRESETLOAD · Show the preset list loading on New project, and wait for it

**Deferred · Low · OSS**

On New project, choosing a theme fetches its presets. While that runs the form shows nothing: the preset block renders only when the list is non-empty (`ProjectForm.jsx` `presets.presets.length > 0`), and the list is cleared at the start of the fetch, so its "Loading presets…" text never appears and the grid pops in afterwards, pushing the form down. Create Project stays enabled meanwhile, so a project created in that moment gets no preset. Today that is the same Blank result as choosing nothing, since no theme names a default preset; a theme that does would have its default skipped.

**Done when:** the preset block shows its loading text during the fetch, and Create Project waits (disabled) until the presets have arrived.

**Start:** [ProjectForm.jsx](../app/src/components/projects/ProjectForm.jsx) (preset fetch effect, preset block). **Source:** owner, 2026-11-08.

#### R-STALELOAD · A superseded load can still land on the menu, page and media screens

**Deferred · Low · OSS**

`MenusEdit.jsx`, `PagesEdit.jsx`, `MediaSelectorDrawer.jsx` (media list) and `useCollections.js` start a load in an effect with nothing in its cleanup, so a reply for what the screen has left can arrive after the current one's and replace it. Shown in a scratch test on 2026-11-09: the menu editor moved from menu `main` to `footer`, `footer` answered, then `main` answered late, and the screen showed `main` under the footer's address. In the app that needs a slow first load and a quick change, e.g. the language switcher on an edit page. The other loaders already guard with a `cancelled` flag.

**Done when:** each of the four ignores a reply for an id, language or project it has left, with a test per screen.

**Start:** the four files' load effects; `PagesEditLoading.test.jsx` and `MenusEditLoading.test.jsx` have the deferred-reply setup. **Source:** React Compiler lint follow-up, 2026-11-08.

#### R-LINKLOAD · Link pickers say "No matching…" while the link targets load

**Deferred · Low · OSS**

`useLinkTargets` reports `loading`, but `LinkInput.jsx` passes only `failed` to its `Combobox`, and the menu editor (`MenuEditor/index.jsx` → `MenuCombobox.jsx`) takes only `options`. Until the targets arrive the list is empty, so the picker reads "No matching pages found. Type to add a custom link." (menus: "No matching results…"), as if the site had no pages. Seen once on a cold start; the rich-text link button already says "Loading…" (`RichTextInput.jsx`).

**Done when:** both pickers show a loading line until the first read answers, then the list or the empty text.

**Start:** [LinkInput.jsx](../packages/editor-ui/src/components/settings/inputs/LinkInput.jsx), [MenuCombobox.jsx](../packages/editor-ui/src/components/menus/MenuEditor/MenuCombobox.jsx), `ComboboxOptionList.jsx` (`notice` / `emptyText`). **Source:** React Compiler lint follow-up, 2026-11-08.

#### R-ROBOTS · Check robots.txt `Disallow` lines for noindex pages

**Investigate · Low · OSS**

`buildRobotsTxt` (`seoArtifacts.js`) writes a `Disallow` line for every noindex page and collection item. Two questions, unchecked: the lines are prefix matches, so with Clean URLs on `Disallow: /about` also blocks `/about-us` (an ordinary page); and search engines' advice, as remembered, is not to block a noindex page in robots.txt, since a page they can't crawl can't show them its noindex and may stay indexed from links. Possible fixes: end-anchor the paths (`/about$`, supported by Google and Bing), or drop the `Disallow` lines and rely on the robots tag and the sitemap.

**Done when:** the current search-engine guidance is read and recorded, and the lines either match only their own page and are kept for a stated reason, or are removed.

**Start:** [seoArtifacts.js](../packages/builder-server/src/services/seoArtifacts.js) (`buildRobotsTxt`). **Source:** planning for an exported not-found page, 2026-11-15.

#### R-WEBDOCS · Find user-facing changes the docs website doesn't cover yet

**Investigate · Low · Docs**

The public docs (`docs-website/src/`) are usually updated with a feature, with a catch-up pass before each release, but some changes since the 0.9.10 tag have no matching page. Known example: the exported not-found page (`404.html`, a page with slug `404`) isn't mentioned anywhere in `docs-website/src/`. The export viewer is covered (Getting started's Docker section, Export's View bullet).

**Done when:** every user-facing change since `0.9.10` (`git log 0.9.10..HEAD`, plus `CHANGELOG.md`'s Unreleased section) is either documented in `docs-website/src/` or listed as needing no user docs, so the pages can be updated before the next release.

**Start:** `git log --stat 0.9.10..HEAD -- packages themes app electron` against `git log 0.9.10..HEAD -- docs-website/src`; [CHANGELOG.md](../CHANGELOG.md). **Source:** export viewer docs, 2026-11-16.

#### R-LIMITSHOOK · Settle `useProjectLimits`' cache and its unused `loaded`

**Deferred · Low · OSS**

`packages/editor-ui/src/hooks/useProjectLimits.js` caches each project's limit for 60 s (`CACHE_DURATION`), so a limit the server changes shows in the drop zones up to a minute late; the server's answer stays final either way. It also returns `loaded`, and no caller reads it: `FileInput`, `ImageInput`, `MediaSelectorDrawer`, `useMediaUpload` and `Media` take only `maxUploadBytes` or `maxSizeMB`.

**Done when:** the cache lifetime is either explained in a comment or shortened (or cleared when the project changes), and `loaded` is either used or removed.

**Start:** the hook and its callers. **Source:** upload-limit review, 2026-11-19.

#### R-UPLOADNITS · Tidy style in the upload-limit changes

**Deferred · Low · OSS**

Style only, no behaviour: `CollectionItems.jsx` and `Menus.jsx` import `serverErrorMessage` on line 2, above the `react-router-dom` import, out of the file's import order; `Media.jsx` has the `maxSizeText` prop on one very long line; `PluginProvider.jsx` has two blank lines before `NO_FORMATTER` and a long `formatUploadRefusal` line in the props JSDoc. The repo has no formatter, so nothing catches these.

**Done when:** the four files read in the order and line lengths of their neighbours, in a pass that touches them anyway.

**Start:** [CollectionItems.jsx](../packages/editor-ui/src/pages/CollectionItems.jsx), [Menus.jsx](../packages/editor-ui/src/pages/Menus.jsx), [Media.jsx](../packages/editor-ui/src/pages/Media.jsx), [PluginProvider.jsx](../packages/editor-ui/src/extension/PluginProvider.jsx). **Source:** upload-limit review, 2026-11-19.

#### R-DUPTESTS · Test the duplicate-error toast on Collections and Menus

**Deferred · Low · Tests**

A refused duplicate shows the server's message (`serverErrorMessage(error) || t(...)`) on three screens, but only Pages has a test (`PagesDuplicateError.test.jsx`). `handleDuplicate` in `CollectionItems.jsx` and in `Menus.jsx` carries the same line with none.

**Done when:** each of the two has a test that a rejected duplicate shows the server's message, and the translated fallback when the error carries none.

**Start:** `PagesDuplicateError.test.jsx` in `packages/editor-ui/src/pages/__tests__/` as the template. **Source:** upload-limit review, 2026-11-19.

#### R-PORTFLAKE · Server tests can reach another test file's server

**Deferred · Low · Tests**

About one full `npm test` run in five fails one test whose request got another server's answer: "returns 400 with validator errors when validation fails" (`infrastructure.test.js`) once read a plain "Forbidden" body, and "does not grant CORS to a foreign web origin" failed once. Each passes when its file runs alone. Seen 2026-11-19 on `storage-limits` (1 of 8 runs) and on its merge with `1.0.0` (2 of 8); `1.0.0` alone passed 8 of 8. Likely cause, not proven: the test files run in parallel processes, some servers listen on every address (`app.listen(0)`, e.g. `infrastructure.test.js:26`) and others on `127.0.0.1` only (`mediaUploadLimits.test.js:144` and about ten more files), and macOS lets the two kinds share a port number, so a request to `127.0.0.1:<port>` can reach the other process. `mediaUploadLimits.test.js` starts many servers, which would make a clash likelier.

**Done when:** every test server binds `127.0.0.1` (or the real cause is found), and repeated full runs show no such failure.

**Start:** `grep -rn "listen(0" packages app` in the test files. **Source:** `storage-limits` merge, 2026-11-19.

#### R-SPLITFOCUS · Disabled SplitButton menu items can't be focused, so their reason isn't announced

**Deferred · Low · OSS**

`SplitButton` (`packages/editor-ui/src/components/ui/SplitButton.jsx:208-229`) renders a disabled menu item as `<button disabled title=…>`. A disabled button is skipped by keyboard focus, and screen readers don't reach it, so the `title` (often the only explanation of why the action is unavailable) is never read out; arrow-key navigation skips disabled items too (`enabledIndexes`, `:59`).

**Done when:** disabled items stay reachable and announce their reason while a click or Enter still does nothing (for example `aria-disabled="true"` instead of `disabled`, included in arrow-key navigation, the reason tied in with `aria-describedby` or visible text), with a test that a disabled item takes focus and exposes its reason.

**Start:** [SplitButton.jsx](../packages/editor-ui/src/components/ui/SplitButton.jsx). **Source:** upload-limit review, 2026-11-19.

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

#### H-DBFALLBACK · Let an embedding app forbid the fallback database

**Open · Unrated · Embedding**

`getDb()` (`db/index.js` ~45) opens `<DATA_DIR>/widgetizer.db` itself when no connection was injected with `initDb()`. An embedding app that shares its own connection then gets a silent second database whenever builder-server code runs before `initDb()` (seen in an embedder's tests: renders read an empty database and passed). Three related gaps, found 2026-10-26:
- add an opt-in strict mode (e.g. `initDb({ ..., allowFallback: false })` or a separate switch) where `getDb()` throws before `ensureDirSync(DATA_DIR)` if nothing was injected; the OSS shells keep the fallback;
- `closeDb()` (~65) closes an injected connection the embedder owns; it should only drop the reference to an injected one and close only what it opened itself;
- `runMigrations()` (`db/migrations.js` ~224) fails with `no such column: version` when the tracking table exists with another shape; name the table and say its schema is incompatible instead (don't alter it).

**Done when:** strict mode throws without creating a file, `closeDb()` leaves an injected connection open, and the incompatible-table error names the table; OSS shells behave as today.

**Start:** [db/index.js](../packages/builder-server/src/db/index.js), [db/migrations.js](../packages/builder-server/src/db/migrations.js). **Source:** embedder test isolation, 2026-10-26.

#### H-COLLECTION-DEPS · Collection render deps read the global project repository

**Open · Unrated · Embedding**

`buildCollectionRenderDeps()` (`services/renderingService.js` ~168) is documented as pure scope-first, but its first line reads `projectRepo.getProjectById(scope.projectId)` through the global `getDb()`, so every render that wires collection deps needs the database injected even when no widget uses a collection. Take the project's language info (or a `getProjectData` callback) from the caller instead.

**Done when:** the function reads only what its caller passes; OSS and embedded renders produce the same output.

**Start:** [renderingService.js](../packages/builder-server/src/services/renderingService.js). **Source:** embedder test isolation, 2026-10-26.

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
| M1 | Generated filename collisions and quotas. Failing the original/rendition/DB steps proved real (files left behind; half-written files in the local adapter): [GH221](https://github.com/tsiger/widgetizer/issues/221). |
| M2 | Rendered output, rather than repository and round-trip only |
| M3 | Repeated refs/owner variety if relevant. Usage-sync failure → delete is covered by R1; do not repeat as missing. |
| M4 | Partial asset deletion remains a candidate. R3 brought item copy/version/discard and language ops inside coordination. Remaining structural scope is R1-COORD; cross-process scope is H-MULTIPROCESS. |
| M5 | Block reference combinations if relevant; future nested values are R5-NESTED. |
| M6 | Same rules through alternate write/render paths; explicit raw code versus richtext |
| T1 | Library deletion in-use checks, invalid packages, cache refresh and independent project copies |
| T2 | Database-version-write failure is an accepted limitation, not a new fix task. Project deletion reports a folder it could not remove (`folderLeftBehind`). |
| O1 | Full navigation assertions beyond C10's inspected additions: same slugs, collection prefixes, clean URLs, pagination and token expiry |
| O2 | Retained-version boundaries and export/delete concurrency. Output cleanup after a failed export proved real (the partial `v<N>` folder stays): [GH220](https://github.com/tsiger/widgetizer/issues/220). |
| O3 | Both real-project walkthroughs complete; no remaining task from this row. |
| O4 | Actual language-name text/interpolation, repeated exports and project switching; one layout assertion does not cover all UI states |
| O5 | Translated media/structured data combinations if relevant. Form collisions/limits were checked in R7. |
| O6 | Completed switcher, month localization and upgrade checks; broad documentation reconciled 2026-10-14. |
| R3 | Two simultaneous editor windows, only if reported or supported as a workflow. |
| R5 | Site-wide media settings beyond favicon, when a theme introduces them. |

The former seven-step “next audit” is not a launch obligation: choose a relevant journey (setup, translations, references, copy/restore, failure/retry or theme update) only when a concrete change warrants it. Both existing walkthroughs remain completed evidence.

</details>
