# Tasks — agents

## Working rules

- This file and [the human version](TODO-humans.md) are two views of one task register. Update IDs, status, priority and scope together.
- **Milestone items mirror GitHub.** The "OSS 0.9.10 milestone" section lists the open issues in the current GitHub milestone; GitHub owns their status (board column) and assignee, and an entry retires to the completed records when its issue closes. Everything else is a **finding**: unscheduled, with no GitHub status. Scheduling a finding means opening an issue in a milestone and moving the entry up. Change GitHub itself only when asked.
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
Public board: [OSS Roadmap](https://github.com/users/tsiger/projects/7); current milestone [OSS - 0.9.10](https://github.com/tsiger/widgetizer/milestone/2). Milestone section reconciled with GitHub on 2026-10-19.

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

## Findings (not scheduled)

Found in reviews and testing, not yet assigned to a milestone. Priorities are from the notes; Unrated means not chosen.

### Bugs

#### UI-LIST-REPLY · A bad list reply crashes or silently empties editor screens

**Open · Low · Shared**

Seen on 2026-10-02 at `9e98dad7`, after upgrading a pre-0.9.10 data folder, in one Firefox session. Some editor requests made during a screen load intermittently resolved to an empty 2xx body, which `parseJsonResponse` (`apiFetch.js`) turns into `null`. The server was not the source: the same requests sent directly (curl, and four concurrent `fetch` calls from the console) always returned full bodies, and `getAllPages` responds with an array or a 500. It happened only with the HTTP cache enabled, never in a private window or Firefox Troubleshoot Mode, and stopped after a browser restart, so the trigger is unconfirmed (an extension or the session's cache state). The four affected reads and what each did with `null`:

- `GET /pages` on Pages: `loadPages` stores it unchecked (`Pages.jsx:152`); `useTranslationVersions` runs for every project, single-language too, and `entries.map` threw, so the error boundary replaced the screen.
- `GET /widgets` in the page editor: `loadSchemas` (`widgetStore.js`) catches the failure and keeps `schemas: {}` with `error` set, but nothing shows the error. Widgets displayed their raw type names, had no settings and the inserter was empty.
- `GET /pages` and `GET /collections/:type` feeding Media's usage labels (`Media.jsx` `loadUsageTitles`): `buildUsageTitleMap` threw on `null` (its defaults only cover `undefined`), the bare `catch` fell back to the global titles, and "Used in" showed raw `page:<uuid>` / `collection:<uuid>` sources.
- `GET /themes/update-count` (`themeUpdateStore.js`): `result.count` threw and was logged; the badge silently stayed at its previous value.

Any non-array or non-object 2xx body (e.g. an HTML string) fails the same way. Other callers to check: `CollectionItems.jsx` (`items`) and `EditorTopBar.jsx` (`allPages`) feed `useTranslationVersions` from server lists, and `CollectionItemForm.jsx` builds its entries from the item's translation group. Other editor list screens (menus, media, collections and similar) have not been swept. Embedding apps mount these screens and inherit the behaviour.

Treat a reply of the wrong shape as a load failure, and show it: the existing load-error toast for lists, and a visible "couldn't load widgets" state in the editor. Not an empty list, which would read as deleted content. Then sweep the remaining list screens once: fix crashes and silent failures here, and hand cases that show an empty list instead of an error to T64. Separately consider `Cache-Control: no-store` on editor API JSON replies: they are per-request data, and Express currently sends ETags with no cache directive, so browsers revalidate and reuse stored copies.

**Done when:** Each read above, and each list query feeding `useTranslationVersions`, shows a visible load error on a bad reply, the screen stays usable, and tests cover it. The sweep of other list screens is done, with any empty-instead-of-error cases recorded under T64. The API caching decision is made.

**Start:** [Pages.jsx](../packages/editor-ui/src/pages/Pages.jsx), [useTranslationVersions.js](../packages/editor-ui/src/hooks/useTranslationVersions.js), [widgetStore.js](../packages/editor-ui/src/stores/widgetStore.js), [Media.jsx](../packages/editor-ui/src/pages/Media.jsx), [mediaUsageDisplay.js](../packages/editor-ui/src/utils/mediaUsageDisplay.js), [themeUpdateStore.js](../packages/editor-ui/src/stores/themeUpdateStore.js), [apiFetch.js](../packages/editor-ui/src/lib/apiFetch.js). **Source:** 2026-10-02 upgrade walkthrough.

#### SKIPPED-ITEM-NOTICE · Say when a collection item is skipped for a bad slug

**Open · Low · Shared**

Since `0fd5005a`, `readCollectionItems` (`collectionService.js`) skips an item whose stored slug (`raw.slug ?? raw.id`) is missing or not `^[a-z0-9-]+$`, with a server-side `console.warn` only. The editor list, link pickers and export then simply lack the item, with nothing on screen to explain it. Such files come only from a hand-edited project or a crafted backup (writes always produce plain slugs), so this is about not losing content silently, not about frequency. Likely shapes: report skipped items on the collection screen (as the invalid-item notice does), or repair the slug from the file name.

**Done when:** A skipped item is visible to the user (or repaired), with a test.

**Start:** [collectionService.js](../packages/builder-server/src/services/collectionService.js), [CollectionItems.jsx](../packages/editor-ui/src/pages/CollectionItems.jsx). **Source:** 2026-10-06 review of the containment fix.

#### THEME-UPLOAD-CLEANUP · A failed theme update upload can leave its new versions installed

**Open · Low · OSS**

When an upload adds update versions to an installed theme, `uploadTheme` (`themeController.js`) copies each new `updates/<version>/` folder into the theme and then rebuilds `latest/`. If a step after the copy fails (the rebuild, or reading the final theme data), the catch removes `themeDir` only for a new theme, so the copied version folders stay while the response reports a failure. Predates the 2026-10-06 ZIP changes.

**Done when:** A failed update upload leaves the installed theme as it was, with a test.

**Start:** [themeController.js](../packages/builder-server/src/controllers/themeController.js). **Source:** 2026-10-06 review of the import checks.

#### THEME-UPDATE-RESUME · Undo an interrupted theme update at startup instead of waiting for the next update

**Open · Low · Shared**

Recovery (`recoverInterruptedUpdate`, `themeUpdateService.js`) runs only at the start of the next `applyThemeUpdateToDir`. Checked 2026-10-06 at `46119daa`: after a crash mid-swap the update is still offered, because `checkForUpdates` compares the project row's `themeVersion` with the theme source, and the row is written only after `applyThemeUpdateToDir` returns. With notifications on (they must be, for the update to have been started), pressing "Apply update" again undoes the half-finished swap and applies the update cleanly. A crash after the plan file is removed but before the row write leaves new files under the old version; re-applying is harmless (noted in `applyThemeUpdateExclusively`). The remaining gap is the time until the user presses update again: folders such as `assets`/`widgets` sit inside `.theme-update-backup`, so pages render without them, a site export or backup made meanwhile omits them (dot-folders are excluded), and nothing tells the user the broken site and the update notice are connected. The same state follows an undo that itself failed ("The theme update could not be completed. Please try again."). Only a theme removed or downgraded meanwhile would leave nothing to trigger recovery.

Recommended: on server start, check each project for a leftover `.theme-update-backup/` and run the recovery under the per-project update lock (a crash always means a restart), and export that as a function embedding apps can call per project. Optional: before a site export or backup, refuse with a clear message if an interrupted update could not be undone. Owner's alternative: close as covered by retrying the update.

**Done when:** A leftover interrupted update is undone at startup (or the task is closed with that reasoning), with a test.

**Start:** [themeUpdateService.js](../packages/builder-server/src/services/themeUpdateService.js), [server-common.js](../app/server-common.js). **Source:** 2026-10-05 code review of `48eef6f4..9e98dad7`; narrowed 2026-10-06.

#### THEME-UPDATE-REMOVED-FOLDER · A theme version that drops a whole updatable folder leaves it in projects

**Open · Medium · Shared**

`applyThemeUpdateToDir` stages each of `UPDATABLE_PATHS` only when the theme source has it (`themeUpdateService.js` ~386, `continue; // not in this theme`), so a path absent from the source is never swapped: the project keeps its old copy. An update that empties a folder with a `deleted/` marker (`layerThemeSnapshot`, `themeController.js` ~399, drops it from `latest/`) therefore leaves e.g. the old `collection-types/` (or `assets/`, `widgets/`, `snippets/`, `locales/`) in every project while the version advances. That contradicts [theme-updates.md](theme-updates.md)'s "Entire folder replaced", and a kept collection is invisible to the update's language-folder check, which reads only the staged copy. Pre-existing; found by reading the code, not reproduced.

Suggested: record a path absent from the source as a planned removal: move the project's copy into the backup during the swap (so rollback and recovery put it back) without placing a replacement. Check what a theme with no `collection-types/` at all means first (never had one vs. removed it); both look the same to the apply.

**Done when:** An update whose snapshot lacks an updatable path removes the project's copy, rolls back with the rest, and is tested (project has a collection, source has no `collection-types/`).

**Start:** [themeUpdateService.js](../packages/builder-server/src/services/themeUpdateService.js), [themeController.js](../packages/builder-server/src/controllers/themeController.js). **Source:** 2026-10-18 Codex review of `29289f67..6344ab5c`.

#### THEME-UPDATE-STAGE-CLEANUP · A staging folder that fails to delete is reused by the next update

**Open · Low · Shared**

Every removal of `.theme-update-stage/` swallows its error (`themeUpdateService.js` ~263 in `recoverInterruptedUpdate`, ~436/~442 in the prepare failure and the language-folder refusal, ~491/~502 after the swap). If one fails, the next run's `ensureDir` reuses the folder and `fs.copy` merges into it, so leftover staged files (an old collection folder, a stale asset) can be swapped into the project or cause a false refusal; the refusal also returns its 409 as if the stage were gone. Pre-existing pattern; found by reading the code, not reproduced.

Suggested: at the start of a run, remove the stage without swallowing the error and refuse with the usual "could not be prepared" message if it is still there; on the refusal path, report a cleanup failure instead of the clean 409.

**Done when:** A run never prepares into a stage it did not create, with a test that makes the stage removal fail.

**Start:** [themeUpdateService.js](../packages/builder-server/src/services/themeUpdateService.js). **Source:** 2026-10-18 Codex review of `29289f67..6344ab5c`.

#### THEME-UPDATE-PREPARE-DIRS · Preparing a theme update creates folders in the live project

**Open · Low · Shared**

`applyThemeUpdateToDir` documents its prepare phase as touching nothing the project uses, but it walks the theme's templates with `processTemplatesRecursive` (`templateHelpers.js`), which calls `fs.ensureDir` on each target under the project's `pages/` (including subfolders such as `pages/el/`). A prepare that then fails leaves those empty folders behind, and the update plan does not name them. Found by Codex while reviewing GH153; not reproduced.

**Done when:** Preparing an update computes the target paths without creating live folders, with a test that a failed prepare leaves `pages/` as it was.

**Start:** [templateHelpers.js](../packages/builder-server/src/utils/templateHelpers.js), [themeUpdateService.js](../packages/builder-server/src/services/themeUpdateService.js).

#### PREVIEW-SCRIPT-URL · A malformed theme script address stops a widget's live preview

**Open · Low · Shared**

`morphWidget` in `previewRuntime.js` (~1042) resolves each enqueued stylesheet/script address with `new URL(url, document.baseURI)` to de-duplicate it. A syntactically invalid address (e.g. `http://[cdn.example/x.js`, not merely a 404) throws there, the surrounding `try` (~1012-1069) returns false, and the widget's new markup is never applied: the editor posts `WIDGET_MORPH_FAILED`, which nothing handles, so that widget stops updating until the preview reloads. A full page load only loses the one script. Not reproduced; only a broken theme triggers it.

**Done when:** An address that can't be resolved is skipped (or left to the browser) and the rest of the morph still applies, with a runtime test.

**Start:** [previewRuntime.js](../packages/core/src/runtime/previewRuntime.js), [previewRuntimeMedia.test.js](../packages/core/src/runtime/__tests__/previewRuntimeMedia.test.js). **Source:** 2026-10-07 review of `b9c9fc13`.

#### EDITOR-THEME-USAGE-NOTICE · The editor's image-tracking notice says "this page" for theme saves

**Open · Low · Shared**

`saveStore` folds a theme save's `MEDIA_USAGE_STALE` into the same `mediaUsageStale` flag as page and header/footer saves, and `PageEditor.jsx` (~85-90) announces it with `pageEditor.mediaUsage.stale` ("Your page is saved… which images this page uses…"). For a theme-only save that names the wrong thing; Site settings has its own wording (`themeSettings.toasts.mediaUsageStale`).

**Done when:** A theme-only save in the editor announces it with wording about the site settings, with a test.

**Start:** [saveStore.js](../packages/editor-ui/src/stores/saveStore.js), [PageEditor.jsx](../packages/editor-ui/src/pages/PageEditor.jsx), [en.json](../packages/core/src/locales/en.json). **Source:** 2026-10-07 browser regression pass on `theme-save-concurrency`.

#### SETTINGS-LOAD-RETRY · Site settings does not retry a failed load

**Open · Low · Shared**

If the theme-settings load fails (API down), Site settings shows "No theme settings available" with no error message, and keeps showing it after the API is back until the editor is opened or the project changes. A failed `loadSettings` records `loadedProjectId` with `settings: null` (`themeStore.js` load catch), and Settings reloads only when `loadedProjectId` differs (~44-50). `pageStore.loadPage` already retries on `settings === null`.

**Done when:** Site settings shows the load error and retries on return (or offers a retry), with a test.

**Start:** [Settings.jsx](../packages/editor-ui/src/pages/Settings.jsx), [themeStore.js](../packages/editor-ui/src/stores/themeStore.js). **Source:** 2026-10-07 browser regression pass on `theme-save-concurrency`.

#### MISSING-IMAGE-MESSAGE · Say why a theme save with a deleted image failed

**Open · Low · Shared**

Choosing a library image in a theme setting and saving after that image was deleted is refused with `MEDIA_REFERENCE_MISSING`, but Site settings shows the generic "Failed to save theme settings. Please try again." (`Settings.jsx` ~107-111), which retrying cannot fix. The page editor has a specific message (`pageEditor.mediaUsage.missing`).

**Done when:** Site settings says the chosen image is no longer in the media library and what to do, with a test.

**Start:** [Settings.jsx](../packages/editor-ui/src/pages/Settings.jsx), [en.json](../packages/core/src/locales/en.json). **Source:** 2026-10-07 browser regression pass on `theme-save-concurrency`.

#### THEME-CHECKER · Close gaps in the theme checker

**Open · Low · OSS**

`scripts/validate-theme.js` (and the catalog from `scripts/build-theme-skill-contract.js`):

- **Accepts `size: 'thumb'`.** `thumb` is added to the known sizes (~1085) and the catalog takes it from the default sizes (~67), but export skips thumb renditions, so `{% image size: 'thumb' %}` passes and the exported image is missing.
- **Crashes on a bare `{% echo %}`.** `checkOutput` (~960) reads `output.node.value.initial`; an argument-less echo (valid Liquid) has no `value`, and `main()` replaces the whole report with one `[validation-failed]` TypeError. Reproduced on a scratch copy of the starter theme.
- **Trusts preset IDs and skips symlinks.** IDs from `presets.json` go straight into `path.join` (~1739-1803): `../templates` re-validates the root templates (duplicate findings), `../../x` reads JSON outside the theme. `listDirs`/`listFiles` (~194-207) use `Dirent.isFile`/`isDirectory`, so symlinked widgets, templates and snippets are skipped and produce false `unknown-widget-type` / `missing-snippet` errors. Reproduced. Read-only CLI, not a security issue.
- **Doesn't check widget-local non-CSS/JS assets.** A widget's `{% asset %}` for e.g. `badge.svg` (~854) is neither checked for existence nor flagged as non-exported, though it works in preview. Likely, not reproduced.
- **Accepts `imageSizes` entries without `width`.** Any key under `settings.imageSizes` becomes a known size (~1084) without checking `width`/`enabled`/`quality`; a widthless size can't be generated and rendering falls back to the original. Likely, not reproduced.

**Done when:** Each case gives a correct finding (or none) instead of a false pass, false error or crash, with a test per case in the theme-skill tests.

**Start:** [validate-theme.js](../scripts/validate-theme.js), [build-theme-skill-contract.js](../scripts/build-theme-skill-contract.js), [themeSkill.test.js](../packages/builder-server/src/tests/themeSkill.test.js). **Source:** 2026-10-05 code review of `9e98dad7..e2f61b21`.

#### LANG-PREFIX-WARNING · The theme checker's language-code prefix warning is a heuristic

**Open · Low · OSS**

`looksLikeLanguageCode` (`scripts/validate-theme.js` ~35) warns on an item-page prefix that `isValidLanguageCode` accepts and that is a bare code or carries a two-letter region or four-letter script `Intl.DisplayNames` names. The app accepts more: `de-1996` (a variant) and even `my-work` pass `isValidLanguageCode` and could be added as a language, yet the checker stays quiet (adding the language, theme updates and export still refuse the actual clash, so only the author's early warning is missed). `Intl.DisplayNames` is also not a registry: `zz` ("Unknown Region"), `zzzz` and retired regions (`bu`, `an`, `su`) have names, so `en-zz` warns. [core-collections.md](core-collections.md) and the skill's `templates-collections-and-presets.md` say "real region or script", which overclaims.

Options: keep the heuristic and reword the two docs ("a region or script code Node recognises", named as a heuristic); or warn on everything `isValidLanguageCode` accepts (brings back warnings on `my-work`, `hr-jobs`); or ship a region/script/variant registry.

**Done when:** The docs describe what the checker actually does, and the chosen rule is tested with `de-1996`, `en-zz` and a retired region.

**Start:** [validate-theme.js](../scripts/validate-theme.js), [themeSkill.test.js](../packages/builder-server/src/tests/themeSkill.test.js), [languages.js](../packages/core/src/utils/languages.js). **Source:** 2026-10-18 Codex review of `29289f67..6344ab5c`.

#### GH148 · The testimonial carousel shows part of the next card on phones

**Open · Unrated · OSS**

User report on 0.9.9: on small screens Arch's testimonial slider shows a slice of the second card (the reporter patched CSS locally). Reproduce in Arch's `testimonial-slider` at phone width before changing its CSS; ship any fix in the matching `updates/<version>/` copy.

**Done when:** One card shows fully at phone widths, checked in preview and export.

**Start:** [testimonial-slider](../themes/arch/widgets/testimonial-slider). [GitHub #148](https://github.com/tsiger/widgetizer/issues/148)

#### GH154 · Linux desktop "View site" fails under ~/.config

**Open · Unrated · OSS**

The export viewer (`routes/export.js`) calls `res.sendFile` with an absolute path and no `root`; Express's hidden-path filter refuses anything under the `.config` data folder. Reproduced fix: pass the path relative to the export directory with `root` set to it (still refuses hidden files inside the export). 0.9.10 is the first release with Linux packages.

**Done when:** View site serves the export on Linux, with a test using a dot-folder ancestor.

**Start:** [export.js](../packages/builder-server/src/routes/export.js), [core-electron.md](core-electron.md). [GitHub #154](https://github.com/tsiger/widgetizer/issues/154)

#### GH159 · Links whose target is gone still publish as working links

**Open · Unrated · OSS · For: tsiger**

Deleting a page or removing a language keeps a pointing link's label and empties its address (`clearDeletedReferencesInSection` in `linkEnrichment.js` ~907 returns `{ ...rest, href: "" }`; menus clear `link` in `menuResolver.js`). The label stays on purpose so the editor shows what to re-point, but the published site writes it as a link: the core menu snippet emits `<a href="">Greek About</a>`, and Arch's button templates show a button whenever its text is set (e.g. `image-text` `link.text != blank`), emitting `<a href="" class="widget-button">View services</a>`. An empty `href` reloads the current page. Seen in the 2026-10-18 #115 export review after removing Greek (LANG-043 says "no destination"). The behaviour is not decided; tsiger owns it, since most of the work is in Arch's button templates. The issue proposes: a menu item with no address renders as plain text (keeping its sub-items); a button with no address is left out; the editor keeps showing both.

**Done when:** The behaviour is decided, and preview and export then write no `href=""` for cleared menu items or buttons, the editor still lists them, with tests for the menu snippet and at least one Arch button template.

**Start:** [menu.liquid](../packages/core/src/snippets/menu.liquid), [linkEnrichment.js](../packages/builder-server/src/utils/linkEnrichment.js), [image-text](../themes/arch/widgets/image-text/widget.liquid). [GitHub #159](https://github.com/tsiger/widgetizer/issues/159)

### Improvements

#### PROJECT-DETAILS-STALE · An old Project details save can reset the active project or toast on another project

**Open · Low · OSS**

`ProjectsEdit.jsx` starts a fresh page per project (`key={id}`), so a load, save or Apply Update still running for a project the user has left only touches its own, unmounted page. Two writes still reach outside it. A save's follow-up `getActiveProject()` → `setActiveProject(...)` (the folder-rename and the plain branch of `handleSubmit`) writes the shared project store: save p1, activate p2 and open its details before that request returns, and p1 becomes active again, so p2's page redirects to the Projects list. And toasts from the old page (a failed load, a save or update finishing) still show on the new one. Needs the user to leave, activate another project and reopen details within the save's round trip. Pre-existing; found by Codex reviewing the update-banner refresh, 2026-10-19; not reproduced.

**Done when:** a save whose page has unmounted no longer writes the active project (a mounted ref, or a store write that checks the active id is still the saved project's), and its toasts are skipped or name the project, with a test that moves to p2 while a p1 save is pending.

**Start:** [ProjectsEdit.jsx](../app/src/pages/ProjectsEdit.jsx), [projectStore.js](../packages/editor-ui/src/stores/projectStore.js).

#### BACKUP-ZIP-NAME · Backups download as `project-export.zip` in the dev setup

**Open · Low · OSS**

`exportProject` in `projectController.js` (~1260) sends `Content-Disposition: attachment; filename="<project>-export-<timestamp>.zip"`, but `projectManager.js` (~240) can only read that header if the response exposes it; across origins (dev: editor on :3000, API on :3001, including the dev Electron app) it can't, so it falls back to `project-export.zip` and repeat backups become `project-export (3).zip`. Same-origin builds (packaged app, built web app) should get the real name — unconfirmed. Seen 2026-10-18 in the browser and the dev desktop app.

**Done when:** The downloaded backup carries the project name in dev and packaged/same-origin setups (e.g. expose `Content-Disposition`, or let the server name it via a plain navigation), checked in both.

**Start:** [projectController.js](../packages/builder-server/src/controllers/projectController.js), [projectManager.js](../packages/editor-ui/src/queries/projectManager.js).

#### PREVIEW-FORM-SUBMIT · Submitting a form in the preview shows a raw server error

**Open · Low · OSS**

The Core Form posts to `/__widgetizer/forms/<key>`, which only a publishing host provides; OSS has no such route by design (`docs-llms/domain/entities/form.md`). In the editor preview and the desktop preview window a submit therefore navigates the frame to Express's "Cannot POST /__widgetizer/forms/el:contact". Seen 2026-10-18 (LANG-059, web and desktop).

**Done when:** A submit in the preview stays on the page and says forms work once the site is published, with a test.

**Start:** [core-form widget](../packages/core/src/widgets/core-form/widget.liquid), [previewRuntime.js](../packages/core/src/runtime/previewRuntime.js).

#### MULTILANG-ONLY-SETTINGS · Hide language-only settings on single-language sites

**Open · Low · OSS**

Arch's header shows "Languages", "Show language switcher" and "Language switcher name" (`languages_header`, `show_language_switcher`, `language_switcher_label`) even when the site has one language, where they do nothing. Schemas have no conditional-visibility property and the platform doesn't know these ids (only Arch and `archLanguageSwitcher.test.js` reference them). Proposed design: a generic setting property `"multilingualOnly": true` the editor honours by hiding the row when `useIsMultilang()` is false; Arch flags its three rows (base and `updates/<version>/`). It is a theme-contract addition: document it with the setting types, add it to the theme skill reference and regenerate the catalog (`scripts/build-theme-skill-contract.js`), and let `validate-theme.js` accept it. Seen 2026-10-18 (#115 review, LANG-074).

**Done when:** Flagged settings are hidden on single-language sites and shown once a second language is added, with editor tests, docs and the skill catalog updated.

**Start:** [header schema](../themes/arch/widgets/global/header/schema.json), [SettingsPanel.jsx](../packages/editor-ui/src/components/pageEditor/SettingsPanel.jsx), [validate-theme.js](../scripts/validate-theme.js).

#### LANG-NAME-IN-SENTENCES · Name languages in the interface language inside messages

**Open · Low · Shared**

`languageLabel.js` documents the rule: inside an English sentence a language is named in the interface language ("Greek"), while pickers, tabs and the public switcher use its own name ("Ελληνικά"). Server errors follow it (`languageNameForMessage` in `contentLanguage.js`) and so does the removed-language banner, but several editor messages put the native name in an English sentence: "Ελληνικά added." / "… removed." (`nameOf` in `app/src/components/projects/LanguagesSection.jsx` ~42), "Ελληνικά version created." (`useTranslationVersions.js` ~81), the export's "Français has no homepage…" (`ExportCreator.jsx`, skipped languages), and the Media "Used in" tags "About (Ελληνικά)" / "Header (Global, Ελληνικά)" (`mediaUsageDisplay.js` ~74, ~110 — a list, so possibly fine). Owner, 2026-10-19: "we probably shouldn't mix languages like 'Ελληνικά added.'" — revisit later.

**Done when:** Every sentence-style message uses `languageLabel`, the labelled lists are decided either way, and tests assert the names.

**Start:** [languageLabel.js](../packages/editor-ui/src/lib/languageLabel.js), [LanguagesSection.jsx](../app/src/components/projects/LanguagesSection.jsx), [useTranslationVersions.js](../packages/editor-ui/src/hooks/useTranslationVersions.js).

#### ITEM-COPY-NUMBERING · Number duplicated collection items like pages and menus

**Open · Low · OSS**

`duplicateItem` in `collectionService.js` (~1063) appends a fixed " (Copy)" to the title field, so duplicating a copy gives "X (Copy) (Copy)"; pages, menus and projects use `generateCopyName` (`utils/namingHelpers.js`) for "X (Copy)", "X (Copy 2)", …, checked against the existing names. Items need the existing titles of the same collection and language to do the same. The slug already numbers itself (`x-copy`, `x-copy-1` via `generateUniqueSlug`). Noted 2026-10-19 while fixing the copy casing.

**Done when:** Duplicating an item, then its copy, gives "X (Copy)" and "X (Copy 2)" per language, with a test.

**Start:** [collectionService.js](../packages/builder-server/src/services/collectionService.js), [namingHelpers.js](../packages/builder-server/src/utils/namingHelpers.js).

#### T66 · Explain form errors beside the right field

**Open · Medium · Shared**

Map ApiError.data conflicts/validationErrors to localized form errors using visible field labels. Show collapsed filename errors; preserve structured server data. Review other reachable messages in bounded batches with T64.

**Done when:** Users see which field failed, why, and how to correct it in their interface language.

**Start:** [CollectionItemForm.jsx](../packages/editor-ui/src/components/collections/CollectionItemForm.jsx). **Source:** Original §66.

#### T53 · Make action menus easier to use with a keyboard

**Open · Low · Shared**

Compare row menus with SplitButton: roles, Arrow/Home/End, Escape, focus-in/return and trigger controls. Decide where focus goes after deleting the trigger row; remove duplicated listeners only as useful.

**Done when:** Keyboard and assistive-technology checks cover open, choose, cancel and row deletion.

**Start:** [SplitButton.jsx](../packages/editor-ui/src/components/ui/SplitButton.jsx). **Source:** Original §53.

#### VIDEO-EMBED-FILTER · Turn YouTube/Vimeo links into embed addresses in one core filter

**Open · Low · Shared**

Arch recognises video links in Liquid by substring (`contains 'youtube.com/watch'`, `'vimeo.com/'`…) and splits out the ID. Every branch now rebuilds the address on `youtube.com/embed/` or `player.vimeo.com/video/` and refuses an ID containing `.`, `%` or `:`, so a frame stays on the provider's embed path, but the ID's shape isn't checked (a wrong-length or misspelled ID gives a broken player, not none), the same ~40 lines are duplicated, `youtube.com/shorts/ID` and `vimeo.com/ID/<hash>` (unlisted share links) aren't recognised, and `youtu.be`/watch links drop options like `t=`. Core already parses YouTube links in `extractVideoId` (`youtubeHelpers.js`, used by the `youtube` setting type and `{% youtube %}`).

Add a filter, e.g. `{{ url | video_embed_url }}`: parse with `URL`, accept exact hosts (`youtube.com`, `www.`/`m.youtube.com`, `youtu.be`, `youtube-nocookie.com`, `vimeo.com`, `www.vimeo.com`, `player.vimeo.com`), check the ID shape (YouTube 11 of `[A-Za-z0-9_-]`, Vimeo digits), keep only allowed options (start time, Vimeo `h`), return `https://www.youtube.com/embed/ID` / `https://player.vimeo.com/video/ID` or "". Use it in Arch at the URL-parsing block of `widgets/video-embed/widget.liquid` (feeds the iframe `src`) and `widgets/video-popup/widget.liquid` (feeds `data-video-url`, which `video-modal.js` opens with `autoplay=1`), and in their `updates/<version>/` copies. No other Arch template parses video links (profile-grid/team-highlight/social-icons only link to YouTube channels through `safe_url`).

**Done when:** Both widgets use the filter; filter tests cover each accepted form, a look-alike host, a bad ID and kept/dropped options; the existing `videoEmbedWidget.test.js` address cases still pass; theming docs, `docs-website` theme-dev pages and the theme-skill references list it, and the skill contract is regenerated.

**Start:** [youtubeHelpers.js](../packages/core/src/utils/youtubeHelpers.js), [safeUrlFilter.js](../packages/core/src/filters/safeUrlFilter.js) (registration pattern), [renderEngine.js](../packages/render-engine/src/renderEngine.js), [video-embed](../themes/arch/widgets/video-embed/widget.liquid), [video-popup](../themes/arch/widgets/video-popup/widget.liquid), [videoEmbedWidget.test.js](../packages/builder-server/src/tests/videoEmbedWidget.test.js), [build-theme-skill-contract.js](../scripts/build-theme-skill-contract.js). **Source:** 2026-10-07 review of `b9c9fc13`.

#### T73 · Let themes choose the page-title separator

**Open · Low · Shared**

Keep SeoTag and renderEngine buildPageTitle aligned, including pagination; escape the custom separator.

**Done when:** Title output and page_title agree for default/custom separators.

**Start:** [SeoTag.js](../packages/core/src/tags/SeoTag.js). **Source:** Original §73.

#### SEO-DATA-EXTRAS · Optional structured-data properties Google recommends

**Open · Low · Shared**

Possible future improvements found reviewing #122 with Google's Rich Results Test (2026-10-17); every item validated, these were optional warnings or omissions:
- **Article author.** `BlogPosting` has no `author` (Google: "Missing field author (optional)"); `ARTICLE_PROPERTIES` in `articleNode.js` maps only headline, datePublished, description, image and articleBody. A cheap default is the identity node (`#identity`) as author; a mapped author field could come later.
- **Publication date without time.** A `date` field yields `datePublished: "2026-05-30"`, valid schema.org but flagged twice by Google (invalid datetime, missing timezone). `dateModified` (a full timestamp) passes. Decide whether to emit a full datetime, and with which timezone.
- **Language.** No node carries `inLanguage`; pages state it only through `<html lang>` and hreflang. Adding the rendering language to `WebPage`/`BlogPosting` makes translated pages explicit.

**Done when:** Each item is either emitted (with tests) or deliberately declined in the structured-data docs.

**Start:** [articleNode.js](../packages/core/src/structuredData/articleNode.js), [siteNodes.js](../packages/core/src/structuredData/siteNodes.js), [Structured data](core-export.md#structured-data-json-ld). **Source:** 2026-10-17 browser review of #122.

#### MEDIA-USAGE-TITLES · Let the server name the Media screen's "Used in" sources

**Open · Low · Shared**

To label its "Used in" lists, `Media.jsx` (`loadUsageTitles`) fetches every page, the collection schemas, and each collection's items once per language: 2 + schemas × languages requests on every visit, all concurrent, and a fetch that fails just leaves raw ids. Fine for current themes; on a large site with many collections and languages it grows. The server already resolves these ids (`mediaUsageService.js`, `usageId` in `contentAddress.js`), so one endpoint returning `{ usageId: { kind, title, language } }` for the project's media would replace the fan-out, and the client would keep only the formatting (`mediaUsageDisplay.js`).

**Done when:** The Media screen labels its usage from one request, with the same labels as today, or the task is closed as not needed.

**Start:** [Media.jsx](../packages/editor-ui/src/pages/Media.jsx), [mediaUsageDisplay.js](../packages/editor-ui/src/utils/mediaUsageDisplay.js), [mediaUsageService.js](../packages/builder-server/src/services/mediaUsageService.js). **Source:** 2026-10-18 Codex review of the media usage label fix.

### Decisions

Agree what we want before building it.

#### T76 · Changing the main language

**Decision needed · Medium · OSS**

Default owns root URLs. Decide UX first; any switch affects folders, links, SEO and usage. Recheck whether the disabled selector explains the rule.

**Done when:** Product rule, UI explanation and implementation agree without advising users to delete translations.

**Start:** [multilingual.md](domain/multilingual.md). **Source:** Original §76.

#### MEDIA-BLANK-ALT · Decide whether translated media text can be deliberately blank

**Decision needed · Low · Shared**

The data model treats `""` in `media_file_translations` as "deliberately blank" (e.g. a decorative image in one language) and NULL as "inherit", but `MediaDrawer.jsx` (~91-96) sends only non-empty fields, so the UI can't set a blank, and saving any other field turns an imported or API-set `""` back into NULL (the default-language text reappears). The tests ("clearing restores inheritance") show the UI behaviour is intended; the control was removed in 66ae2e20. Decide: restore a control, or drop the `""` meaning from backend/docs so the two agree.

**Done when:** UI, server and multilingual docs describe and implement the same rule, with a test.

**Start:** [MediaDrawer.jsx](../packages/editor-ui/src/components/media/MediaDrawer.jsx), [mediaController.js](../packages/builder-server/src/controllers/mediaController.js), [mediaRepository.js](../packages/builder-server/src/db/repositories/mediaRepository.js). **Source:** 2026-10-05 code review of `48eef6f4..9e98dad7`.

#### MENU-LANG-FALLBACK · Decide whether a translated header falls back to the default language's menu

**Decision needed · Unrated · OSS**

A header `menu` setting holds either a menu uuid (picked in the dropdown) or a slug (the theme default, e.g. `main-menu`, until someone picks). `resolveMenuSettings` (`menuResolver.js` ~185-200) resolves a slug in the rendering language's folder and, failing that, in the default language's — documented in `core-menus.md`. So deleting the Greek Main menu makes a Greek header still on the default show the **English** main menu (English labels, English targets), while a header whose Greek menu was picked shows no menu. The editor's dropdown then reads "Main menu (en)", but nothing else says so, and the Delete Menu dialog doesn't mention the header uses it. Seen in the 2026-10-18 #115 review (LANG-057). Options: (A) no slug fallback for non-default languages — a missing language menu shows no menu, as with a picked one; (B) keep the fallback and reword LANG-057, optionally warning in the delete dialog; (C) keep it but block or warn on deleting a menu a header uses. Proposed: A plus a "used by the Greek header" warning when deleting.

**Done when:** The chosen rule is implemented in `menuResolver.js` with tests, `core-menus.md` and LANG-057 describe it, and the delete dialog warning (if chosen) names where the menu is used.

**Start:** [menuResolver.js](../packages/render-engine/src/menuResolver.js), [core-menus.md](core-menus.md), [Menus.jsx](../packages/editor-ui/src/pages/Menus.jsx).

#### ARCH-DEFAULT-WORDS · Decide whether Arch's editable defaults follow the page language

**Decision needed · Unrated · OSS**

Arch text settings start from literal English `default`s and template fallbacks (`| default: '…'`), so an untouched translated page shows English: header skip link "Skip to main content", "Primary", "Menu", "Close menu"; News/Projects/Services Grid "Read more" / "View project" / "View service" / "View all"; widget headings ("Latest News", …); fallbacks such as "Learn More", "Download", "Before"/"After", "Play video", "Features". Settings with `defaultKey` (Core Form, `services_grid.empty`, …) already follow the page language, and every non-editable theme and core word is translated (Arch `site.*` 59/59 in `el`, core 15/15). Seen in the 2026-10-18 #115 review (LANG-034; LANG-044 makes the same claim). Options: (A) give Arch's editable defaults `defaultKey`s with locale entries in every language Arch ships; (B) only the always-present chrome (skip link, nav label, menu title/close, "Read more", "View all"), leaving headings; (C) leave it and reword LANG-034 to mean non-editable words only. Proposed: B now, A over time.

**Done when:** The chosen set resolves per page language in preview and export (new Arch version under `updates/<version>/`), or LANG-034 and LANG-044 say defaults are the owner's to translate.

**Start:** [header widget](../themes/arch/widgets/global/header/widget.liquid), [news-grid](../themes/arch/widgets/news-grid/widget.liquid), [Arch locales](../themes/arch/locales/), `settingDefault` in [renderEngine.js](../packages/render-engine/src/renderEngine.js).

#### DATE-ORDER-LANG · Decide whether date order follows the page language

**Decision needed · Low · Shared**

The site has one `date_format` theme setting; `formatDateOnly` (`packages/core/src/utils/dateFormat.js`) localizes month names via `Intl` but keeps the chosen order, so with the default "December 31, 2026" a Greek page reads "Μαρτίου 15, 2026" where Greek usage is "15 Μαρτίου 2026". Options: a per-language date format, a "follow the language's usual order" format, or leave it to the owner's choice. Seen 2026-10-18 (#115 review, LANG-034).

**Done when:** The chosen rule is implemented with tests, or documented as the owner's choice.

**Start:** [dateFormat.js](../packages/core/src/utils/dateFormat.js), [dateFilter.js](../packages/core/src/filters/dateFilter.js).

#### GH138 · Edit project details directly from the project list

**Decision needed · Unrated · OSS · Unassigned**

Issue is title-only. Establish whether editing inactive projects should change active-project state; preserve project selection.

**Done when:** Approved interaction edits the intended project without switching unexpectedly.

**Start:** [projects](../app/src/components/projects). **Source:** GitHub #138. [GitHub #138](https://github.com/tsiger/widgetizer/issues/138)

#### GH128 · Choose additional image optimisation tools

**Decision needed · Unrated · OSS · Unassigned**

Use the existing image-optimization proposal rather than inventing requirements from the title. Preserve originals/variants and image quality expectations.

**Done when:** Selected features have concrete acceptance criteria.

**Start:** [future-image-optimization.md](future-image-optimization.md). **Source:** GitHub #128. [GitHub #128](https://github.com/tsiger/widgetizer/issues/128)

#### T54 · Choose an accessibility standard

**Decision needed · Low · Shared**

Decide keyboard/focus, semantics, contrast, target sizes and disabled-item convention. T53 is the concrete menu work; avoid duplicating it in a second audit.

**Done when:** Agreed standard and separately scoped findings; not a claim of blanket conformance.

**Start:** [core-editor-ui-style-guide.md](core-editor-ui-style-guide.md). **Source:** Original §54.

#### T57 · Decide what the editor style guide covers

**Decision needed · Low · Docs**

Either document SplitButton alongside composite controls or state that the guide covers tokens/classes only.

**Done when:** The guide scope is clear.

**Start:** [core-editor-ui-style-guide.md](core-editor-ui-style-guide.md). **Source:** Original §57.

#### T72 · Decide how theme authors package a new base version

**Decision needed · Low · OSS**

Decide replacement vs delta-only handling of a bumped base; validation and buildLatestSnapshot must compose the same tree. Do not loosen the version check alone; require update data existing installs need.

**Done when:** Documented package rules match install/update behaviour and useful refusal messages.

**Start:** [theme-dev-distribution.md](../docs-website/src/theme-dev-distribution.md). **Source:** Original §72.

#### SYMLINK-PATHS · Decide whether path checks should follow symlinks

**Decision · Low · Shared**

The containment checks that keep file-sourced paths inside their folder compare resolved path strings and do not follow symlinks: the theme-update recovery plan (`themeUpdateService.js` `removeInsideProject`) and export's media copy (`exportController.js` `uploadSourcePath`). A symlink already inside `uploads/images` that points outside would still be copied on export, and a plan entry through a symlinked folder would still be removed. Neither import nor theme upload can create one (`utils/zipSafety.js` writes every entry as a plain file), so this needs a local actor or an embedding app whose storage preserves symlinks. Options: `lstat`/`realpath` these paths and refuse symlinks, or document the assumption that project folders hold no symlinks.

**Done when:** The decision is made and either implemented with a test or documented.

**Start:** [themeUpdateService.js](../packages/builder-server/src/services/themeUpdateService.js), [exportController.js](../packages/builder-server/src/controllers/exportController.js), [pathSecurity.js](../packages/builder-server/src/utils/pathSecurity.js). **Source:** 2026-10-06 reviews of the BACKUP-TRUST fixes.

### Checks

Confirm the problem first; not confirmed bugs.

#### RENDER-LANG · Make site-wide links in theme settings follow the page language

**Investigate · Low · Shared**

`resolveThemeSettingReferences` (`renderEngine.js` ~760-860): a theme-setting `link` resolves to the target's own language and a uuid menu to that exact menu; `theme.json` is one file for all languages, so Greek pages show English targets (the leak d0442659 fixed for `page_url`). On item pages theme settings resolve before `currentPageData` is set, so a slug menu resolves to the root-language menu. Arch declares no such settings, so third-party themes only. (The single-widget item lookup this entry also covered reads the language folder since `bcb7fab6`.)

**Done when:** Theme-setting references resolve per rendering language, or the limitation is documented in the theme contract.

**Start:** [renderEngine.js](../packages/render-engine/src/renderEngine.js). **Source:** 2026-10-05 code review of `48eef6f4..9e98dad7`.

#### MENU-MEDIA-USAGE · Count upload links in menus as media usage

**Investigate · Low · Shared**

`mediaUsageService.js` (~536-732) scans pages, globals, theme settings, site identity and collection items in every language, but not `menus/**`, and there is no per-menu sync. A menu link typed as `/uploads/files/brochure.pdf` doesn't block deletion, while the same link in a widget does. Predates 0.9.10. First confirm the menu link UI accepts typed upload paths.

**Done when:** Either menus are scanned (full and targeted) with a test, or menu links are shown not to carry upload paths.

**Start:** [mediaUsageService.js](../packages/builder-server/src/services/mediaUsageService.js), [menuController.js](../packages/builder-server/src/controllers/menuController.js). **Source:** 2026-10-05 code review of `48eef6f4..9e98dad7`.

#### T41 · Investigate previews slowing down over long sessions

**Investigate · Medium · Shared**

Historical yielding-loop benchmark: ~0.47→13.60 ms/sanitize over 1.5k→10.5k calls, bounded RSS. Characterize DOMPurify/jsdom state before mitigations; do not weaken sanitization. OSS impact was low; long-lived hosts higher.

**Done when:** Current evidence establishes impact; any fix preserves sanitized output and flattens the measured degradation.

**Start:** [sanitizationService.js](../packages/builder-server/src/services/sanitizationService.js). **Source:** Original §41.

#### T44 · Keep published images complete and filenames distinct

**Investigate · Medium · Shared**

Recheck seedPresetMedia scope-first conversion, nested source/manifest paths, flat export output and original-versus-rendition collisions (photo.jpg vs photo-large.jpg). A pure selection helper must preserve used-only selection, rendition fallback and referenced-file reconciliation.

**Done when:** No silent overwrite or missing linked media in reproduced cases; adapter boundaries and copy fallbacks remain correct.

**Start:** [exportController.js](../packages/builder-server/src/controllers/exportController.js). **Source:** Original §44.

#### T64 · Show lasting, accurate error messages

**Investigate · Low · Shared**

Revalidate load-vs-empty states, blank edit forms, failed delete dialogs/uploads/exports, theme corrections and hidden filename errors. R1–R3 already improved some signals. T66 covers wording/field mapping.

**Done when:** Each confirmed case shows the actual outcome and a useful next action.

**Start:** [Pages.jsx](../packages/editor-ui/src/pages/Pages.jsx). **Source:** Original §64.

#### T32 · Check theme-upload validation cleanup

**Investigate · Low · OSS**

Recheck timestamp-based validation temp-dir naming and error log ownership in uploadTheme. Neither was a confirmed install failure.

**Done when:** Any reproduced collision has isolated temporary work and one clear failure.

**Start:** [themeController.js](../packages/builder-server/src/controllers/themeController.js). **Source:** Original §32.

#### T38 · Check how the app chooses its first project

**Investigate · Low · OSS**

getActiveProject writes the fallback active ID on GET. Preserve missing/deleted-active recovery; inspect first-project activation across awaited seeding if relevant.

**Done when:** Selection semantics are explicit and the reproduced problem is covered.

**Start:** [projectController.js](../packages/builder-server/src/controllers/projectController.js). **Source:** Original §38.

#### T58 · Investigate an occasional test-suite failure

**Investigate · Low · Tests**

Historical infrastructure.test.js failure: Unexpected token < parsing JSON. Check parallel server/port/state interference; no confirmed validateRequest defect.

**Done when:** Cause reproduced and isolated, or the stale report retired with evidence.

**Start:** [infrastructure.test.js](../packages/builder-server/src/tests/infrastructure.test.js). **Source:** Original §58.

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
