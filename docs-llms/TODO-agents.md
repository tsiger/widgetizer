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

### MEDIA-MP4 · Support uploaded MP4 videos on site pages

**Open · Unrated · Shared**

Needed for the Widgetizer marketing site. Planned follow-up: **2026-10-02**. Support uploading MP4 (`video/mp4`), selecting it in page widgets and playing it in preview and published/exported pages. First check the existing media/file path and theme controls to identify the missing pieces; keep the initial scope to MP4 playback.

**Done when:** A real MP4 can be uploaded, selected, saved and played in preview and exported output, with correct asset URLs and media-usage tracking; existing image/file workflows still work.

**Start:** [Media system](core-media.md), [MIME types](../packages/core/src/utils/mimeTypes.js), [upload validation](../packages/editor-ui/src/utils/uploadValidation.js), [file input](../packages/editor-ui/src/components/settings/inputs/FileInput.jsx) and [export controller](../packages/builder-server/src/controllers/exportController.js). **Source:** User request, 2026-10-01.

## Fixes and investigations

### LINK-DIRTY · Choosing a page in a link picker leaves the editor permanently "unsaved"

**Open · High · Shared**

Found 2026-10-03 at `9e98dad7`; both halves already exist at `48eef6f4`, so it predates 0.9.10. Selecting a page in a link field stores the value with `collectionType: undefined, collectionItemUuid: undefined` (`LinkInput.jsx` `handleLinkChange`; the item branch likewise sets `pageUuid: undefined`). After a successful save the baseline is a JSON round trip (`pageStore.js`, `originalPage: JSON.parse(JSON.stringify(page))`), which drops undefined keys. `hasUnsavedPageChanges` compares with lodash `isEqual`, which treats a present-but-undefined key as different from an absent one, so the page never equals its baseline again. Observed in a live tab: `modifiedWidgets` empty, `structureModified` false, a JSON comparison of `page` and `originalPage` empty, `hasUnsavedChanges()` true, and the only difference the two undefined keys on the edited link. Effects until reload: the Save button stays enabled, autosave re-sends identical content (six consecutive 200 saves seen), and the leave-page prompt warns about changes that don't exist. Any embedding app that gates an action on `hasUnsavedChanges()` after saving (e.g. save-then-publish) is blocked until the editor reloads. The data itself is saved correctly.

Fix at the comparison so no input can trip it: compare page and baseline in the same normalized form the baseline is made in (or normalize undefined away on write), and also stop `LinkInput` writing undefined keys. Check `globalWidgets`/`originalGlobalWidgets` and the other `isEqual` call sites in `saveStore.js` (`reconcile…`, `save`) for the same mismatch.

**Done when:** Choosing a page or collection item in a link picker, saving, and doing nothing else leaves the editor clean (Save disabled, no further autosaves, no leave prompt), for page content and global widgets; a regression test covers a value carrying undefined keys.

**Start:** [saveStore.js](../packages/editor-ui/src/stores/saveStore.js), [pageStore.js](../packages/editor-ui/src/stores/pageStore.js), [LinkInput.jsx](../packages/editor-ui/src/components/settings/inputs/LinkInput.jsx). **Source:** 2026-10-03 walkthrough.

### BACKUP-TRUST · Validate everything a restored backup brings in

**Open · High · Shared**

Import (`projectController.js` ~1347-1545) checks only that zip entry names don't start with `..` or are absolute, then trusts the extracted content. Confirmed paths:

- **Theme-update recovery file.** `.theme-update-backup/.in-progress` survives import (export skips dot-folders, import doesn't strip them). On the next "Apply theme update", `recoverInterruptedUpdate` → `undoSwap` (`themeUpdateService.js` ~196-251) runs `fs.remove(path.join(projectDir, rel))` for every `added`/`placedWhereAbsent` entry with no containment check: `{"added":["../other-project"]}` deletes a sibling project. Reproduced with a scratch script on temp folders.
- **Media rendition paths.** `uploads/media.json` is written to the DB with only IDs regenerated (~1533). Export copies each `sizes[*].path` via `path.join(projectDir, sizeInfo.path…)` (`exportController.js` ~1102-1110), so `/uploads/images/../../../../etc/passwd` is copied into the published output. Pre-existing.
- **Collection item slugs.** The item's embedded `slug` wins over its filename (`collectionService.js` ~515) and export writes ``path.join(collectionOutputDir, `${item.slug}.html`)`` (`exportController.js` ~911), so `../../other-v1/index` writes outside the export folder. Pre-existing.
- **Size.** `extractAllTo` has no cap on expanded bytes or entry count; the upload limit bounds only the compressed file (zip bomb fills `data/temp`). Pre-existing.
- **Manifest fields.** `siteUrl` skips `isValidSiteUrl`; `name`, `siteTitle`, `description` are not type-checked or tag-stripped (a non-string `name` makes `resolveProjectIdentity` throw a 500); `theme` is used as a folder name unchecked. Only `siteIdentity` and languages are validated.
- **Media translations.** `insertMediaFileStatements` (`mediaRepository.js` ~334-349) inserts any language key, including the default language and languages the project lacks, and inserts all-NULL rows. A row keyed by the default language overrides the default metadata at render.

Fix at both ends: validate/strip on import (drop `.theme-update-*`, validate item slugs, media paths, manifest fields and translation languages, bound extraction), and add containment checks where the paths are used (theme recovery, export copy/write), since content can also arrive by other routes. Embedding apps with their own import or export pipeline need the same checks. R8-ARCHIVE stays about damaged/newer formats.

**Done when:** Each case above is refused or neutralised on import with cleanup, the theme-recovery and export paths refuse anything outside their folder regardless of source, and tests cover each crafted input.

**Start:** [projectController.js](../packages/builder-server/src/controllers/projectController.js), [themeUpdateService.js](../packages/builder-server/src/services/themeUpdateService.js), [exportController.js](../packages/builder-server/src/controllers/exportController.js), [mediaRepository.js](../packages/builder-server/src/db/repositories/mediaRepository.js). **Source:** 2026-10-05 code review of `48eef6f4..9e98dad7`.

### LOGO-NOTES · Adding a logo while creating a project erases its notes

**Open · High · Shared**

`ProjectsAdd.jsx` `addLogo` (~19) follows `createProject` with a partial `updateProject(id, { name, siteIdentity })`. The PUT route runs `body("description").trim()…` without `.optional()` (`routes/projects.js` ~58), and express-validator writes `""` into `req.body` for the missing field; `projectRepository.updateProject` (~91) keeps a value only when it is `undefined`, so it stores `""`. Confirmed with a scratch `body("description").trim().run(req)`. Any other partial PUT caller has the same exposure.

**Done when:** A partial project update leaves omitted fields untouched (route marks optional fields `.optional()`, or the client sends the full record), and a test covers create-with-logo keeping the notes.

**Start:** [ProjectsAdd.jsx](../app/src/pages/ProjectsAdd.jsx), [projects.js routes](../packages/builder-server/src/routes/projects.js), [projectRepository.js](../packages/builder-server/src/db/repositories/projectRepository.js). **Source:** 2026-10-05 code review of `48eef6f4..9e98dad7`.

### R-THEME-SAVE · Keep theme-settings saves in order

**Open · Medium · Shared**

Confirmed 2026-09-21 at `8846ab29` with a controlled delayed-response test against the real theme store. Settings permits repeated saves while a request is pending; `themeStore.saveSettings()` has no shared queue. Save red, then blue; let the server store both in order but deliver blue's response before red's. The late red response replaces `originalSettings`, reports the blue draft dirty, and Reset restores red while declaring it clean although the server holds blue. The 17 existing theme-store tests passed; the temporary diagnostic reproduced the gap and was removed.

Coordinate saves at the shared theme-store boundary used by Settings and the page editor. Preserve newer edits, warning corrections, project/load isolation and manual failure reporting. Do not redo the completed page-save redesign or expand into unrelated cross-window/backend coordination. Also check two related gaps found 2026-10-05 (read only): `saveStore.save` has no generation check between Phase 1 (page/globals) and Phase 2 (theme, ~312-319), so after discard-and-leave during Phase 1 the theme draft live at that moment is sent; and `themeStore.reconcileFromServer` (~179) bumps `activeLoadId`, so an in-flight `loadSettings` drops its result and neither sets `loading:false` (Settings can stay on a spinner).

**Done when:** A retained regression test covers the demonstrated response ordering and Reset agrees with saved content. Shared callers cannot race theme writes or saved baselines; edits during a save remain dirty, and failures/corrections do not overwrite newer work. Check the Settings controls and page-editor caller together.

**Start:** [themeStore.js](../packages/editor-ui/src/stores/themeStore.js), [Settings.jsx](../packages/editor-ui/src/pages/Settings.jsx), [saveStore.js](../packages/editor-ui/src/stores/saveStore.js), [theme-store tests](../packages/editor-ui/src/stores/__tests__/themeStore.test.js). **Source:** 2026-09-21 follow-up check; the retired redesign is retrievable with `git show 8846ab29:docs-llms/plan-savestore-concurrency-redesign.md`.

### GH147 · A stale tab's theme-settings save reverts a theme update

**Open · Medium · Shared**

Reproduced 2026-10-03 at `9e98dad7` on duplicates of a 0.9.9 Arch project. Open the page editor (or Site settings), apply the 0.9.10 update from another tab, then change any theme setting in the first tab without reloading and save. `theme.json` goes back to `"version": "0.9.9"` and loses `show_breadcrumbs`, while the project row keeps `theme_version` 0.9.10, so no update is offered again and the new settings never appear. A screen opened after the update saves correctly. Cause: `saveProjectThemeSettings` (`themeController.js`) writes the whole `theme.json` from the request body, and `themeStore` holds the copy it loaded until the screen reloads. The whole-file write predates 0.9.10. Distinct from R-THEME-SAVE (response ordering within one tab), though both sit at the same boundary. Embedding apps with their own theme-settings save route have the same exposure and need the same guard.

Recommended: optimistic concurrency at the save boundary. The load returns a revision of `theme.json`, the save sends it back, and the server answers 409 when the file has changed; the screen then shows a reload prompt that warns about unsaved edits. Optionally also merge only the changed setting values into the current file. Follow-up: detect an applied update in open tabs before they save, reusing the stale-active-project pattern (`resolveActiveProject` 409, `activeProjectChannel`, focus re-check, `useStaleActiveProjectDetection`). Coordinate with R-THEME-SAVE rather than building two mechanisms.

**Done when:** A theme-settings save from a screen loaded before a theme update (or before any other change to `theme.json`) cannot overwrite the newer file, the user is told to reload without silently losing edits, and a regression test covers the reproduced sequence.

**Start:** [themeController.js](../packages/builder-server/src/controllers/themeController.js), [themeStore.js](../packages/editor-ui/src/stores/themeStore.js), [themeUpdateService.js](../packages/builder-server/src/services/themeUpdateService.js), [useStaleActiveProjectDetection.js](../packages/editor-ui/src/hooks/useStaleActiveProjectDetection.js). **Source:** 2026-10-03 walkthrough. [GitHub #147](https://github.com/tsiger/widgetizer/issues/147)

### LANG-LOCK-CHECKS · Re-check language rules inside the write lock

**Open · Medium · Shared**

Two rules are checked against the project as read before the content-write lock and never re-checked inside it:

- **Default language.** `updateProject` validates "the default can only change while the site has one language" via `readLanguages(updates, currentProject)` (`projectController.js` ~688) before `withContentWriteLock` (~726). Tab A adds `el` while tab B changes the default to `el`: the row becomes `{defaultLanguage:"el", languages:["el"]}`. Every later project save is refused ("already the site's default language"), `DELETE /languages/el` is refused, changing back is refused, `pages/el/` is orphaned and `projectLanguageContexts` yields `[el, el]` (pages listed twice). With another code (`de`) the default changes on a multilingual site. Reproduced with a scratch script delaying the seed. The UI's `blocked` flag only covers one screen.
- **Page slug vs language code.** `createPage`/`updatePage` reserve slugs against `req.activeProject` before the lock; `addLanguage("el")` can run in between and the queued write then creates `pages/el.json`, colliding with the Greek homepage (`el.html` vs `el/`). Narrow window; read only.

Related to T76 (product rule) and R1-COORD (scope of coordination), but both cases already take the lock and only need to re-read.

**Done when:** Both rules are re-checked against the project row read inside the lock, and tests cover the two interleavings.

**Start:** [projectController.js](../packages/builder-server/src/controllers/projectController.js), [pageController.js](../packages/builder-server/src/controllers/pageController.js), [languageService.js](../packages/builder-server/src/services/languageService.js). **Source:** 2026-10-05 code review of `48eef6f4..9e98dad7`.

### COLLECTION-LIST-RACE · A slow collection list can show another collection's items

**Open · Medium · Shared**

`useCollectionItems.fetchItems` (~31-61) has no stale-response guard and now fetches one language after another. The `collections/:type` route has no `key` (`EditorShell.jsx` ~135), so switching collections reuses the component: open A, quickly open B, and if A's requests finish last B's screen lists A's items. Delete, Duplicate and Reorder then call the API with type B and A's slugs; Delete removes a B item that shares a slug. Pattern predates 0.9.10; the per-language loop widens the window.

**Done when:** A response for a previous type/project/language set is discarded, and a test covers out-of-order responses.

**Start:** [useCollectionItems.js](../packages/editor-ui/src/hooks/useCollectionItems.js), [CollectionItems.jsx](../packages/editor-ui/src/pages/CollectionItems.jsx). **Source:** 2026-10-05 code review of `48eef6f4..9e98dad7`.

### HOME-SLUG-LINKS · Links to a page slugged "home" break when Clean URLs is off

**Open · Medium · Shared**

`isHomeSlug` accepts `index` and `home`, and `pageOutputPath` writes both to `index.html`, but `pageHref` (`internalHref.js` ~29) only special-cases the homepage when Clean URLs is on; otherwise it emits `home.html`. Menus, link fields and the breadcrumb Home crumb (`breadcrumbs.js` ~180) then point at a missing file. Export accepts a non-default language whose homepage is slugged `home`, so `el/index.html` is linked as `el/home.html`. Standalone preview still navigates (it maps to `/preview/page/el/home`), so preview and export disagree. Reproduced with a script. Same mismatch existed for a root `home` page.

**Done when:** Every href to a home-slugged page matches its output file in both URL modes and languages, with a test.

**Start:** [internalHref.js](../packages/core/src/utils/internalHref.js), [contentAddress.js](../packages/core/src/utils/contentAddress.js), [breadcrumbs.js](../packages/core/src/utils/breadcrumbs.js). **Source:** 2026-10-05 code review of `48eef6f4..9e98dad7`.

### SEO-LANG · Fix multilingual search-engine output gaps

**Open · Medium · Shared**

- **Breadcrumb JSON-LD Home** (`structuredData/breadcrumbNode.js` ~20) always maps `crumb.home` to `absoluteSiteUrl(siteUrl, "")`, ignoring the crumb's `canonicalPath`: on `/el/about.html` the visible trail links the Greek home but JSON-LD says `https://site/`. Reproduced with a script. Medium.
- **Numbered copies emit page-1 hreflang** (`tags/SeoTag.js` ~64): `blog/page/2.html` has canonical `…/blog/page/2.html` but hreflang en→`blog.html`, el→`el/blog.html`, x-default→`blog.html`, with no self-reference. `seoArtifacts.js` deliberately leaves alternates off numbered copies, so HTML and sitemap disagree. Reproduced with `SeoTag.render`. Low.
- **New language versions copy a custom canonical URL** (`pageController.createPageLanguageVersion` `...source`; `collectionService.createItemLanguageVersion` keeps `canonical_url`): the Greek page declares the English URL canonical while marked as the Greek alternate. Low; may be accepted "copy then edit".

**Done when:** Breadcrumb JSON-LD uses the language's home, numbered copies emit no (or self-consistent) alternates matching the sitemap, and the canonical-copy rule is decided and tested.

**Start:** [breadcrumbNode.js](../packages/core/src/structuredData/breadcrumbNode.js), [SeoTag.js](../packages/core/src/tags/SeoTag.js), [seoArtifacts.js](../packages/builder-server/src/services/seoArtifacts.js). **Source:** 2026-10-05 code review of `48eef6f4..9e98dad7`.

### PARENT-TRANSLATION · Deleting a parent page detaches its translated children

**Open · Medium · Shared**

A language version keeps the source's `parentPageUuid` (by design; breadcrumbs map it to the same-language sibling through the translation group). After a delete, `updatePagesViaStorage` (`linkEnrichment.js` ~247) removes any `parentPageUuid` naming a deleted page in every language without checking for a surviving sibling. Delete English `about` and Greek `team` loses its parent even though Greek `about` exists. Reproduced with a script.

**Done when:** A child keeps (or is retargeted to) a surviving same-group parent, and only children with no surviving parent are cleared, with a test.

**Start:** [linkEnrichment.js](../packages/builder-server/src/utils/linkEnrichment.js), [breadcrumbs.js](../packages/core/src/utils/breadcrumbs.js). **Source:** 2026-10-05 code review of `48eef6f4..9e98dad7`.

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

### PAGE-SLUG-INPUT · Validate the slug sent with a page save

**Open · Low · Shared**

`savePageContent` (`pageController.js` ~681) uses `pageData.slug` from the body without `sanitizeSlug`, and `pageKey` builds `pages/<lang>/${slug}.json`; route params are only `notEmpty` (Express decodes `%2F`). A body slug of `../theme` writes page JSON over `theme.json` and the rename path then deletes the original page; `el/foo` writes into a language folder (even a removed one), bypassing `requestLanguage` and `assertLanguageStillEnabled`. The storage adapter keeps it inside the project, and it needs a hand-crafted request. Predates 0.9.10; language folders make it matter more. Check bulk delete IDs and menu IDs the same way.

**Done when:** Page/menu slugs and IDs from requests are validated before building storage keys, with tests for `../` and `/` input.

**Start:** [pageController.js](../packages/builder-server/src/controllers/pageController.js), [contentAddress.js](../packages/core/src/utils/contentAddress.js), [pages routes](../packages/builder-server/src/routes/pages.js). **Source:** 2026-10-05 code review of `48eef6f4..9e98dad7`.

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

### THEME-UPDATE-RESUME · Recover an interrupted theme update without needing another update

**Open · Low · Shared**

Recovery runs only at the start of the next `applyThemeUpdateToDir` (`themeUpdateService.js` ~221, ~288). After a crash mid-swap, folders such as `assets`/`widgets` sit inside `.theme-update-backup`, so the project renders without them and a backup exported then omits them (dot-folders excluded). If theme updates are switched off or no newer version exists, nothing triggers recovery. Read only.

**Done when:** An interrupted update is recovered (or clearly reported) when the project is next opened or exported, with a test.

**Start:** [themeUpdateService.js](../packages/builder-server/src/services/themeUpdateService.js). **Source:** 2026-10-05 code review of `48eef6f4..9e98dad7`.

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

### EDITOR-LANG-UX · Smooth the editor's language rough edges

**Open · Low · Shared**

- `LanguageMenu.jsx` (~55-97) shows every language without a sibling as "create", including the current one; until `EditorTopBar`'s `allPages` loads (or if it fails) it offers "create English" on the English page (400) and existing siblings (409). `CollectionItemForm` does the same for an item without uuid/group. `TranslationChips` filters the own language; this menu doesn't.
- The parent-page picker (`PageForm.jsx` ~66-102) lists pages from every language with no language label.
- `activeLanguage` starts on the default language (`Pages.jsx` ~55, `CollectionItems.jsx` ~59, `Menus.jsx` ~37) and create returns to the bare list URL (`PagesAdd.jsx` ~42, `CollectionItemAdd.jsx` ~60), so a new Greek page lands you on the English tab.

**Done when:** Each of the three behaves as expected in a two-language project.

**Start:** [LanguageMenu.jsx](../packages/editor-ui/src/components/content/LanguageMenu.jsx), [PageForm.jsx](../packages/editor-ui/src/components/pages/PageForm.jsx), [Pages.jsx](../packages/editor-ui/src/pages/Pages.jsx). **Source:** 2026-10-05 code review of `48eef6f4..9e98dad7`.

### STALE-BANNER · A project warning can hide a language-removed warning while saves stay suspended

**Open · Low · Shared**

`staleProjectStore.markStale` (~24) overwrites a `reason: "language"` warning with `"project"`; the next focus check then calls `clearStale()` (`useStaleActiveProjectDetection.js` ~37-44), hiding the banner while `saveStore.savingSuspended` stays true. Every save returns `{status:"suspended"}` and `saveAndReport` reacts only to rejections, so nothing tells the user. Needs: language removed, then another tab switches project, then this project re-activated. Read only.

**Done when:** A language warning survives a project warning being raised and cleared, or suspended saves are always visible, with a test.

**Start:** [staleProjectStore.js](../packages/editor-ui/src/stores/staleProjectStore.js), [useStaleActiveProjectDetection.js](../packages/editor-ui/src/hooks/useStaleActiveProjectDetection.js). **Source:** 2026-10-05 code review of `48eef6f4..9e98dad7`.

### LINK-CACHE · Keep link-picker targets fresh after a change mid-load

**Open · Low · Shared**

In `useLinkTargets.js` (~141-153) a load in flight when `invalidateLinkTargetsCache` runs still writes its older data into the cache afterwards, and its `finally` can delete a newer in-flight entry for the same key. A page created mid-load is missing from link pickers for up to 60 s. Predates 0.9.10; the load is now per language × collection and sequential, so the window is longer.

**Done when:** An invalidation discards results of loads started before it, with a test.

**Start:** [useLinkTargets.js](../packages/editor-ui/src/hooks/useLinkTargets.js). **Source:** 2026-10-05 code review of `48eef6f4..9e98dad7`.

### PRESET-ID-INPUT · Validate the preset name when creating a project

**Open · Low · Shared**

`POST /api/projects` accepts `preset` as any string (`routes/projects.js` ~37, `body("preset").optional().isString().trim()`), and `resolvePresetPaths` joins it straight into a path (`themeController.js` ~672, `path.join(sourceDir, "presets", presetId)`). A preset of `../../somewhere` makes the new project copy templates, menus, collections, settings and media from outside the theme. Needs a hand-crafted request; predates 0.9.10. Same family as PAGE-SLUG-INPUT and BACKUP-TRUST. Embedding apps with their own create flow should apply the same rule.

**Done when:** A preset ID must name a preset the theme declares (or match a strict pattern and stay inside `presets/`), anything else is refused before scaffolding, with a test.

**Start:** [themeController.js](../packages/builder-server/src/controllers/themeController.js), [projectController.js](../packages/builder-server/src/controllers/projectController.js), [projects.js routes](../packages/builder-server/src/routes/projects.js). **Source:** 2026-10-05 code review of `9e98dad7..e2f61b21`.

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

Candidates: truncated ZIP, future formatVersion, valid JSON with invalid content shape. Existing media-library and language refusals are already covered. No instructions to edit archive files. Crafted (malicious) content in an otherwise valid backup is BACKUP-TRUST.

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
