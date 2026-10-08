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

**Start:** [Multilingual rules](domain/multilingual.md), [theme language switcher](theming.md#the-language-switcher-pagetranslations) and [user checklist](user-test-checklist.md). **Source:** GitHub #115. [GitHub #115](https://github.com/tsiger/widgetizer/issues/115)

### GH118 · Review export asset naming

**Review · Unrated · OSS · anastis**

Board says To Be Reviewed; issue has no acceptance detail. Inspect existing export naming/versioning before implementing anything.

**Done when:** Agreed naming appears in a real export without broken references.

**Start:** [exportController.js](../packages/builder-server/src/controllers/exportController.js). **Source:** GitHub #118. [GitHub #118](https://github.com/tsiger/widgetizer/issues/118)

### GH122 · Review automatic search-engine information

**Review · Unrated · OSS · tsiger**

Structured-data commits e3ae2f424/e48731228 and docs d065e7ae9 exist. Review the current contract and recorded evidence; do not build a second SEO pipeline.

**Done when:** Existing implementation satisfies the agreed feature, or concrete gaps get separate tasks.

**Start:** [Structured data](core-export.md#structured-data-json-ld), [site identity](core-projects.md#6-site-identity-and-business-details) and [collection mappings](core-collections.md#5c-structured-data-structureddata-block). **Source:** GitHub #122. [GitHub #122](https://github.com/tsiger/widgetizer/issues/122)

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

Implemented in e4379a50: history survives save, 150 steps, 500 ms same-setting grouping. Verify manual/autosave, in-flight save and theme correction; do not add a toggle without a decision. Found 2026-10-05: turning on "paginate" makes up to three `updateWidgetSettings` calls (`listing_anchor`, per-page count, `paginate`; `SettingsPanel.jsx` ~86-108) that are different settings and so not grouped; one Ctrl+Z turns paginate off but leaves the other two.

**Done when:** Normal editing/undo workflow matches the agreed behaviour.

**Start:** [core-page-editor.md](core-page-editor.md). **Source:** GitHub #134. [GitHub #134](https://github.com/tsiger/widgetizer/issues/134)

### GH135 · Review the Widgetizer Desktop name

**Review · Unrated · OSS · tsiger**

Implemented in 8fae65c5. Product IDs, installer/data paths and update identity deliberately stay unchanged; review display names only.

**Done when:** Agreed UI names are correct with existing installs unaffected.

**Start:** [Display name and installation identity](core-electron.md#display-name-and-installation-identity). **Source:** GitHub #135. [GitHub #135](https://github.com/tsiger/widgetizer/issues/135)

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

### MEDIA-BLANK-ALT · Decide whether translated media text can be deliberately blank

**Decision needed · Low · Shared**

The data model treats `""` in `media_file_translations` as "deliberately blank" (e.g. a decorative image in one language) and NULL as "inherit", but `MediaDrawer.jsx` (~91-96) sends only non-empty fields, so the UI can't set a blank, and saving any other field turns an imported or API-set `""` back into NULL (the default-language text reappears). The tests ("clearing restores inheritance") show the UI behaviour is intended; the control was removed in 66ae2e20. Decide: restore a control, or drop the `""` meaning from backend/docs so the two agree.

**Done when:** UI, server and multilingual docs describe and implement the same rule, with a test.

**Start:** [MediaDrawer.jsx](../packages/editor-ui/src/components/media/MediaDrawer.jsx), [mediaController.js](../packages/builder-server/src/controllers/mediaController.js), [mediaRepository.js](../packages/builder-server/src/db/repositories/mediaRepository.js). **Source:** 2026-10-05 code review of `48eef6f4..9e98dad7`.

## Planned features

### SYMLINK-PATHS · Decide whether path checks should follow symlinks

**Decision · Low · Shared**

The containment checks that keep file-sourced paths inside their folder compare resolved path strings and do not follow symlinks: the theme-update recovery plan (`themeUpdateService.js` `removeInsideProject`) and export's media copy (`exportController.js` `uploadSourcePath`). A symlink already inside `uploads/images` that points outside would still be copied on export, and a plan entry through a symlinked folder would still be removed. Neither import nor theme upload can create one (`utils/zipSafety.js` writes every entry as a plain file), so this needs a local actor or an embedding app whose storage preserves symlinks. Options: `lstat`/`realpath` these paths and refuse symlinks, or document the assumption that project folders hold no symlinks.

**Done when:** The decision is made and either implemented with a test or documented.

**Start:** [themeUpdateService.js](../packages/builder-server/src/services/themeUpdateService.js), [exportController.js](../packages/builder-server/src/controllers/exportController.js), [pathSecurity.js](../packages/builder-server/src/utils/pathSecurity.js). **Source:** 2026-10-06 reviews of the BACKUP-TRUST fixes.

## Fixes and investigations

### SKIPPED-ITEM-NOTICE · Say when a collection item is skipped for a bad slug

**Open · Low · Shared**

Since `0fd5005a`, `readCollectionItems` (`collectionService.js`) skips an item whose stored slug (`raw.slug ?? raw.id`) is missing or not `^[a-z0-9-]+$`, with a server-side `console.warn` only. The editor list, link pickers and export then simply lack the item, with nothing on screen to explain it. Such files come only from a hand-edited project or a crafted backup (writes always produce plain slugs), so this is about not losing content silently, not about frequency. Likely shapes: report skipped items on the collection screen (as the invalid-item notice does), or repair the slug from the file name.

**Done when:** A skipped item is visible to the user (or repaired), with a test.

**Start:** [collectionService.js](../packages/builder-server/src/services/collectionService.js), [CollectionItems.jsx](../packages/editor-ui/src/pages/CollectionItems.jsx). **Source:** 2026-10-06 review of the containment fix.

### TRANSLATION-CREATE-NAV · A translation created just before leaving a list pulls the user back

**Open · Low · Shared**

`useTranslationVersions.createIn` awaits the create request, then calls `setCreated`, shows a toast and calls the screen's `onCreated`, which navigates to the new version's editor (`CollectionItems.jsx` `navigate(itemEditPath(created))`, built from the type of the render that started it; `Pages.jsx` `navigate(pageEditorPath(created))`). Nothing checks that the user is still on that screen: start creating a missing translation, switch to another collection or section before the request returns, and the user is pulled into the created item's (or page's) editor. The version is created correctly; only the navigation is unwanted. Found by reading the code in the 2026-10-06 review of `87e96448`.

**Done when:** A creation that finishes after its screen has gone still creates the version but neither navigates nor updates the departed screen (a toast may remain), with a test for both callers.

**Start:** [useTranslationVersions.js](../packages/editor-ui/src/hooks/useTranslationVersions.js), [CollectionItems.jsx](../packages/editor-ui/src/pages/CollectionItems.jsx), [Pages.jsx](../packages/editor-ui/src/pages/Pages.jsx). **Source:** 2026-10-06 review of the collection list fix.

### THEME-UPLOAD-CLEANUP · A failed theme update upload can leave its new versions installed

**Open · Low · OSS**

When an upload adds update versions to an installed theme, `uploadTheme` (`themeController.js`) copies each new `updates/<version>/` folder into the theme and then rebuilds `latest/`. If a step after the copy fails (the rebuild, or reading the final theme data), the catch removes `themeDir` only for a new theme, so the copied version folders stay while the response reports a failure. Predates the 2026-10-06 ZIP changes.

**Done when:** A failed update upload leaves the installed theme as it was, with a test.

**Start:** [themeController.js](../packages/builder-server/src/controllers/themeController.js). **Source:** 2026-10-06 review of the import checks.

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

### UI-LIST-REPLY · A bad list reply crashes or silently empties editor screens

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

### EXPORT-CLASH-LANG · Catch output-path clashes inside language folders

**Open · Low · Shared**

- A theme update can add a collection whose `slugPrefix` equals an enabled language code: `isReservedSlugPrefix(slugPrefix)` is called without `languages` (`collectionService.js` ~214) and theme updates do no check, while adding a language does (`assertCodeIsFree`). Items then publish over that language's pages (`it/foo.html`).
- The paginated-homepage vs `page`-prefix clash check uses `rootPages` only (`exportController.js` ~457): a Greek paginated homepage writes `el/page/2.html`, which a Greek item slugged `2` silently overwrites.

**Done when:** Export (and ideally theme update) refuses both clashes in every language with a clear message, with tests.

**Start:** [exportController.js](../packages/builder-server/src/controllers/exportController.js), [collectionService.js](../packages/builder-server/src/services/collectionService.js), [contentAddress.js](../packages/core/src/utils/contentAddress.js). **Source:** 2026-10-05 code review of `48eef6f4..9e98dad7`.

### THEME-STRINGS · Translate the remaining built-in breadcrumb and business-details text

**Open · Low · Shared**

`core/src/snippets/breadcrumbs.liquid` defaults `aria_label` to "Breadcrumb" and `page_label` to "Page"; Arch's `layout.liquid` passes neither and Arch locales have no breadcrumb keys (Greek page 2 shows "Page 2"). `themes/arch/snippets/business-details.liquid` shows weekdays sliced from English day ids ("Mon"–"Sun") and a literal "Closed". Breadcrumb JSON-LD also names numbered crumbs `Page N` (`breadcrumbNode.js`).

**Done when:** These strings come from theme locales or site strings in each language.

**Start:** [breadcrumbs.liquid](../packages/core/src/snippets/breadcrumbs.liquid), [business-details.liquid](../themes/arch/snippets/business-details.liquid). **Source:** 2026-10-05 code review of `48eef6f4..9e98dad7`.

### RENDER-LANG · Make site-wide links and single-widget re-renders follow the page language

**Investigate · Low · Shared**

- `resolveThemeSettingReferences` (`renderEngine.js` ~760-860): a theme-setting `link` resolves to the target's own language and a uuid menu to that exact menu; `theme.json` is one file for all languages, so Greek pages show English targets (the leak d0442659 fixed for `page_url`). On item pages theme settings resolve before `currentPageData` is set, so a slug menu resolves to the root-language menu. Arch declares no such settings, so third-party themes only.
- `resolveItemFromPath` (`renderEngine.js` ~561-598) strips the language folder but reads `collections/<type>/<slug>.json` without it, so a header re-rendered alone for a Greek item page shows an empty or English breadcrumb. Preview only; reachability unconfirmed.

**Done when:** Theme-setting references resolve per rendering language (or the limitation is documented in the theme contract), and the single-widget item lookup uses the language folder.

**Start:** [renderEngine.js](../packages/render-engine/src/renderEngine.js). **Source:** 2026-10-05 code review of `48eef6f4..9e98dad7`.

### THEME-UPDATE-RESUME · Undo an interrupted theme update at startup instead of waiting for the next update

**Open · Low · Shared**

Recovery (`recoverInterruptedUpdate`, `themeUpdateService.js`) runs only at the start of the next `applyThemeUpdateToDir`. Checked 2026-10-06 at `46119daa`: after a crash mid-swap the update is still offered, because `checkForUpdates` compares the project row's `themeVersion` with the theme source, and the row is written only after `applyThemeUpdateToDir` returns. With notifications on (they must be, for the update to have been started), pressing "Apply update" again undoes the half-finished swap and applies the update cleanly. A crash after the plan file is removed but before the row write leaves new files under the old version; re-applying is harmless (noted in `applyThemeUpdateExclusively`). The remaining gap is the time until the user presses update again: folders such as `assets`/`widgets` sit inside `.theme-update-backup`, so pages render without them, a site export or backup made meanwhile omits them (dot-folders are excluded), and nothing tells the user the broken site and the update notice are connected. The same state follows an undo that itself failed ("The theme update could not be completed. Please try again."). Only a theme removed or downgraded meanwhile would leave nothing to trigger recovery.

Recommended: on server start, check each project for a leftover `.theme-update-backup/` and run the recovery under the per-project update lock (a crash always means a restart), and export that as a function embedding apps can call per project. Optional: before a site export or backup, refuse with a clear message if an interrupted update could not be undone. Owner's alternative: close as covered by retrying the update.

**Done when:** A leftover interrupted update is undone at startup (or the task is closed with that reasoning), with a test.

**Start:** [themeUpdateService.js](../packages/builder-server/src/services/themeUpdateService.js), [server-common.js](../app/server-common.js). **Source:** 2026-10-05 code review of `48eef6f4..9e98dad7`; narrowed 2026-10-06.

### DUPLICATE-FOLDER · Duplicating into an existing folder can merge into it and later delete it

**Open · Low · Shared**

Duplicate checks the new folder name against the database only (`projectController.js` ~851), unlike `resolveProjectIdentity`. A leftover folder with that name (e.g. from R6-DELETE) gets merged into by `fs.copy`, and if the duplicate then fails, the cleanup (`fs.remove(newDir)` / `discardHalfMadeProject`, ~879-893) deletes that pre-existing folder. Read only.

**Done when:** Duplicate picks a folder name free on disk and in the DB, and cleanup only removes what it created.

**Start:** [projectController.js](../packages/builder-server/src/controllers/projectController.js). **Source:** 2026-10-05 code review of `48eef6f4..9e98dad7`.

### MENU-MEDIA-USAGE · Count upload links in menus as media usage

**Investigate · Low · Shared**

`mediaUsageService.js` (~536-732) scans pages, globals, theme settings, site identity and collection items in every language, but not `menus/**`, and there is no per-menu sync. A menu link typed as `/uploads/files/brochure.pdf` doesn't block deletion, while the same link in a widget does. Predates 0.9.10. First confirm the menu link UI accepts typed upload paths.

**Done when:** Either menus are scanned (full and targeted) with a test, or menu links are shown not to carry upload paths.

**Start:** [mediaUsageService.js](../packages/builder-server/src/services/mediaUsageService.js), [menuController.js](../packages/builder-server/src/controllers/menuController.js). **Source:** 2026-10-05 code review of `48eef6f4..9e98dad7`.

### MEDIA-USAGE-LABELS · Show readable "Used in" labels for other-language content

**Open · Low · Shared**

`resolveUsageTitle` (`mediaUsageDisplay.js` ~79) strips only `global:` / `global:root:`, so `global:el:header` shows "El:header (Global)". `Media.jsx` (~121-123) fetches only the default language's collection items, so other-language items show raw `collection:<uuid>`. Distinct from UI-LIST-REPLY (null replies).

**Done when:** Every language's globals, pages and items show a readable, language-tagged label, with a test.

**Start:** [mediaUsageDisplay.js](../packages/editor-ui/src/utils/mediaUsageDisplay.js), [Media.jsx](../packages/editor-ui/src/pages/Media.jsx). **Source:** 2026-10-05 code review of `48eef6f4..9e98dad7`.

### THEME-CHECKER · Close gaps in the theme checker

**Open · Low · OSS**

`scripts/validate-theme.js` (and the catalog from `scripts/build-theme-skill-contract.js`):

- **Accepts `size: 'thumb'`.** `thumb` is added to the known sizes (~1085) and the catalog takes it from the default sizes (~67), but export skips thumb renditions, so `{% image size: 'thumb' %}` passes and the exported image is missing.
- **Crashes on a bare `{% echo %}`.** `checkOutput` (~960) reads `output.node.value.initial`; an argument-less echo (valid Liquid) has no `value`, and `main()` replaces the whole report with one `[validation-failed]` TypeError. Reproduced on a scratch copy of the starter theme.
- **Trusts preset IDs and skips symlinks.** IDs from `presets.json` go straight into `path.join` (~1739-1803): `../templates` re-validates the root templates (duplicate findings), `../../x` reads JSON outside the theme. `listDirs`/`listFiles` (~194-207) use `Dirent.isFile`/`isDirectory`, so symlinked widgets, templates and snippets are skipped and produce false `unknown-widget-type` / `missing-snippet` errors. Reproduced. Read-only CLI, not a security issue.
- **Doesn't check widget-local non-CSS/JS assets.** A widget's `{% asset %}` for e.g. `badge.svg` (~854) is neither checked for existence nor flagged as non-exported, though it works in preview. Likely, not reproduced.
- **Accepts `imageSizes` entries without `width`.** Any key under `settings.imageSizes` becomes a known size (~1084) without checking `width`/`enabled`/`quality`; a widthless size can't be generated and rendering falls back to the original. Likely, not reproduced.

**Done when:** Each case gives a correct finding (or none) instead of a false pass, false error or crash, with a test per case in the theme-skill tests.

**Start:** [validate-theme.js](../scripts/validate-theme.js), [build-theme-skill-contract.js](../scripts/build-theme-skill-contract.js), [themeSkill.test.js](../packages/builder-server/src/tests/themeSkill.test.js). **Source:** 2026-10-05 code review of `9e98dad7..e2f61b21`.

### PREVIEW-SCRIPT-URL · A malformed theme script address stops a widget's live preview

**Open · Low · Shared**

`morphWidget` in `previewRuntime.js` (~1042) resolves each enqueued stylesheet/script address with `new URL(url, document.baseURI)` to de-duplicate it. A syntactically invalid address (e.g. `http://[cdn.example/x.js`, not merely a 404) throws there, the surrounding `try` (~1012-1069) returns false, and the widget's new markup is never applied: the editor posts `WIDGET_MORPH_FAILED`, which nothing handles, so that widget stops updating until the preview reloads. A full page load only loses the one script. Not reproduced; only a broken theme triggers it.

**Done when:** An address that can't be resolved is skipped (or left to the browser) and the rest of the morph still applies, with a runtime test.

**Start:** [previewRuntime.js](../packages/core/src/runtime/previewRuntime.js), [previewRuntimeMedia.test.js](../packages/core/src/runtime/__tests__/previewRuntimeMedia.test.js). **Source:** 2026-10-07 review of `b9c9fc13`.

### VIDEO-EMBED-FILTER · Turn YouTube/Vimeo links into embed addresses in one core filter

**Open · Low · Shared**

Arch recognises video links in Liquid by substring (`contains 'youtube.com/watch'`, `'vimeo.com/'`…) and splits out the ID. Every branch now rebuilds the address on `youtube.com/embed/` or `player.vimeo.com/video/` and refuses an ID containing `.`, `%` or `:`, so a frame stays on the provider's embed path, but the ID's shape isn't checked (a wrong-length or misspelled ID gives a broken player, not none), the same ~40 lines are duplicated, `youtube.com/shorts/ID` and `vimeo.com/ID/<hash>` (unlisted share links) aren't recognised, and `youtu.be`/watch links drop options like `t=`. Core already parses YouTube links in `extractVideoId` (`youtubeHelpers.js`, used by the `youtube` setting type and `{% youtube %}`).

Add a filter, e.g. `{{ url | video_embed_url }}`: parse with `URL`, accept exact hosts (`youtube.com`, `www.`/`m.youtube.com`, `youtu.be`, `youtube-nocookie.com`, `vimeo.com`, `www.vimeo.com`, `player.vimeo.com`), check the ID shape (YouTube 11 of `[A-Za-z0-9_-]`, Vimeo digits), keep only allowed options (start time, Vimeo `h`), return `https://www.youtube.com/embed/ID` / `https://player.vimeo.com/video/ID` or "". Use it in Arch at the URL-parsing block of `widgets/video-embed/widget.liquid` (feeds the iframe `src`) and `widgets/video-popup/widget.liquid` (feeds `data-video-url`, which `video-modal.js` opens with `autoplay=1`), and in their `updates/<version>/` copies. No other Arch template parses video links (profile-grid/team-highlight/social-icons only link to YouTube channels through `safe_url`).

**Done when:** Both widgets use the filter; filter tests cover each accepted form, a look-alike host, a bad ID and kept/dropped options; the existing `videoEmbedWidget.test.js` address cases still pass; theming docs, `docs-website` theme-dev pages and the theme-skill references list it, and the skill contract is regenerated.

**Start:** [youtubeHelpers.js](../packages/core/src/utils/youtubeHelpers.js), [safeUrlFilter.js](../packages/core/src/filters/safeUrlFilter.js) (registration pattern), [renderEngine.js](../packages/render-engine/src/renderEngine.js), [video-embed](../themes/arch/widgets/video-embed/widget.liquid), [video-popup](../themes/arch/widgets/video-popup/widget.liquid), [videoEmbedWidget.test.js](../packages/builder-server/src/tests/videoEmbedWidget.test.js), [build-theme-skill-contract.js](../scripts/build-theme-skill-contract.js). **Source:** 2026-10-07 review of `b9c9fc13`.

### THEME-WARNING-LABEL · Name the corrected setting in theme-save warnings

**Open · Low · Shared**

A theme save whose value the server corrects warns `"tTheme:global.colors.settings.standard_border_color.label" contained an invalid value and was reset.` The label is the raw theme key: the server builds the warning from `item.label` (`mergeThemeSettingChanges`, and `sanitizeThemeSettings` ~455 for the whole-file POST), and Settings' `describeWarning` (`Settings.jsx` ~15-24) shows it untranslated. Seen 2026-10-07 in the browser; the same text appeared before `theme-save-concurrency`.

**Done when:** The warning names the setting in the user's language (resolve the label through the theme locale on the client), with a test.

**Start:** [Settings.jsx](../packages/editor-ui/src/pages/Settings.jsx), [useThemeLocale.js](../packages/editor-ui/src/hooks/useThemeLocale.js). **Source:** 2026-10-07 browser regression pass on `theme-save-concurrency`.

### SETTINGS-DISCARD · Site settings keeps a draft the user chose to discard

**Open · Low · Shared**

On Site settings with unsaved changes, leaving shows "You have unsaved changes. If you leave this page, they will be lost." with "Discard changes". Choosing it leaves, but `useFormNavigationGuard` (~84-92) only proceeds; nothing resets `themeStore`, and Settings' mount effect (~44-50) keeps a draft for the same project, so returning shows the "discarded" edits, still unsaved. The page editor's discard does reset (`saveStore.reset` → `discardDraft`).

**Done when:** Discarding on Site settings drops the theme draft (or the dialog stops promising it will), with a test.

**Start:** [useFormNavigationGuard.js](../packages/editor-ui/src/hooks/useFormNavigationGuard.js), [Settings.jsx](../packages/editor-ui/src/pages/Settings.jsx). **Source:** 2026-10-07 browser regression pass on `theme-save-concurrency`.

### UNDO-CLEAN · Undoing back to the saved state leaves Save enabled

**Open · Low · Shared**

In the page editor, undoing a theme edit or a structural change (delete, reorder) back to exactly the saved state leaves Save enabled. `reconcileModifiedWidgets` (`saveStore.js` ~136-180) re-derives per-widget dirtiness but never clears `themeSettingsModified` or `structureModified`, and `hasUnsavedChanges` reads both flags. Saving then sends nothing for the theme (empty change list) and clears the flags.

**Done when:** After undo returns page, globals and theme to their saved state, Save is disabled and no unsaved marker shows, with a test.

**Start:** [saveStore.js](../packages/editor-ui/src/stores/saveStore.js), [EditorTopBar.jsx](../packages/editor-ui/src/components/pageEditor/EditorTopBar.jsx). **Source:** 2026-10-07 browser regression pass on `theme-save-concurrency`.

### EDITOR-THEME-USAGE-NOTICE · The editor's image-tracking notice says "this page" for theme saves

**Open · Low · Shared**

`saveStore` folds a theme save's `MEDIA_USAGE_STALE` into the same `mediaUsageStale` flag as page and header/footer saves, and `PageEditor.jsx` (~85-90) announces it with `pageEditor.mediaUsage.stale` ("Your page is saved… which images this page uses…"). For a theme-only save that names the wrong thing; Site settings has its own wording (`themeSettings.toasts.mediaUsageStale`).

**Done when:** A theme-only save in the editor announces it with wording about the site settings, with a test.

**Start:** [saveStore.js](../packages/editor-ui/src/stores/saveStore.js), [PageEditor.jsx](../packages/editor-ui/src/pages/PageEditor.jsx), [en.json](../packages/core/src/locales/en.json). **Source:** 2026-10-07 browser regression pass on `theme-save-concurrency`.

### SETTINGS-LOAD-RETRY · Site settings does not retry a failed load

**Open · Low · Shared**

If the theme-settings load fails (API down), Site settings shows "No theme settings available" with no error message, and keeps showing it after the API is back until the editor is opened or the project changes. A failed `loadSettings` records `loadedProjectId` with `settings: null` (`themeStore.js` load catch), and Settings reloads only when `loadedProjectId` differs (~44-50). `pageStore.loadPage` already retries on `settings === null`.

**Done when:** Site settings shows the load error and retries on return (or offers a retry), with a test.

**Start:** [Settings.jsx](../packages/editor-ui/src/pages/Settings.jsx), [themeStore.js](../packages/editor-ui/src/stores/themeStore.js). **Source:** 2026-10-07 browser regression pass on `theme-save-concurrency`.

### MISSING-IMAGE-MESSAGE · Say why a theme save with a deleted image failed

**Open · Low · Shared**

Choosing a library image in a theme setting and saving after that image was deleted is refused with `MEDIA_REFERENCE_MISSING`, but Site settings shows the generic "Failed to save theme settings. Please try again." (`Settings.jsx` ~107-111), which retrying cannot fix. The page editor has a specific message (`pageEditor.mediaUsage.missing`).

**Done when:** Site settings says the chosen image is no longer in the media library and what to do, with a test.

**Start:** [Settings.jsx](../packages/editor-ui/src/pages/Settings.jsx), [en.json](../packages/core/src/locales/en.json). **Source:** 2026-10-07 browser regression pass on `theme-save-concurrency`.

### THEME-LOCALE-STALE · Theme labels stay untranslated after a theme update

**Open · Low · Shared**

After applying a theme update, a setting the update added (e.g. `show_breadcrumbs`) shows its raw key (`global.general.settings.show_breadcrumbs.label`) in Site settings and the editor until the page reloads. `useThemeLocale` keeps a module-level cache per project and language for 5 minutes (`useThemeLocale.js` ~6-8) with no invalidation, so the pre-update locale stays in use.

**Done when:** Applying a theme update refreshes the theme locale for that project, so new settings show their labels without a reload, with a test.

**Start:** [useThemeLocale.js](../packages/editor-ui/src/hooks/useThemeLocale.js), [ProjectsEdit.jsx](../app/src/pages/ProjectsEdit.jsx). **Source:** 2026-10-07 browser regression pass on `theme-save-concurrency`.

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

Candidates: truncated ZIP, future formatVersion, valid JSON with invalid content shape. Existing media-library and language refusals are already covered. No instructions to edit archive files. Crafted (malicious) content in an otherwise valid backup is refused since `46119daa` (BACKUP-TRUST, completed); a truncated or damaged ZIP is now a 400 from `utils/zipSafety.js`.

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

MAX_PAGES_PER_PROJECT is declared/answered but unread by page create/duplicate/version. Decide counting policy and enforce every creation path consistently. The collection-item allowance has a related gap (2026-10-05): `createCollectionItem` counts items before the content-write lock (`collectionController.js` ~246-260), so concurrent creates at 99/100 both pass. Count inside the lock for both.

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
