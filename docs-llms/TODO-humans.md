# Tasks — plain English

**Start with one task, not the whole list.** Deferred items are not release requirements.

- **Review:** work exists or is reported ready; check it before calling it done.
- **Decision needed:** agree what we want before building it.
- **Investigate:** confirm the problem; do not assume a fix is needed.
- **Open:** recorded work to do. **Deferred:** wait for its stated trigger.
- Priorities are inherited from the notes. **Unrated** means we have not chosen one.

**Areas:** OSS = the standalone app; Shared = code used by both apps; Embedding = an app reusing Widgetizer. Names on GitHub tasks are their recorded assignees.

**Jump to:** [Reviews](#ready-to-review) · [Decisions](#decisions-to-make) · [Planned features](#planned-features) · [Fixes/checks](#fixes-and-investigations) · [Later](#later--only-when-the-stated-need-arises) · [Embedding apps](#embedding-apps)

These local files own task status. GitHub is updated only when requested; its board may lag.
The same IDs appear in [the agent version](TODO-agents.md). Technical detail and evidence live there.

## Ready to review

### GH115 · Finish multilingual documentation and close the feature

**Review · Unrated · Docs · tsiger**

Multilingual websites work and both real-project walkthroughs passed. Some broader documentation may still lag.

**Next:** Reconcile the remaining documentation before closing the feature locally, starting with the [multilingual rules](domain/multilingual.md) and [user checklist](user-test-checklist.md). [GitHub #115](https://github.com/tsiger/widgetizer/issues/115)

### GH118 · Review export asset naming

**Review · Unrated · OSS · anastis**

Exports should identify their assets using a number, app version and date.

**Next:** Confirm the intended filename format and review the existing change. [GitHub #118](https://github.com/tsiger/widgetizer/issues/118)

### GH122 · Review automatic search-engine information

**Review · Unrated · OSS · tsiger**

Automatic structured information for search engines has been implemented.

**Next:** Check the shipped feature against the [documented rules](core-export.md#structured-data-json-ld) and [business details](core-projects.md#6-site-identity-and-business-details) before closing the issue. [GitHub #122](https://github.com/tsiger/widgetizer/issues/122)

### GH126 · Review the Windows leave-page prompt fix

**Review · Unrated · OSS · anastis**

The native prompt was replaced because it could leave Windows users unable to type.

**Next:** Confirm the fix in the packaged Windows app. [GitHub #126](https://github.com/tsiger/widgetizer/issues/126)

### GH127 · Review the code-field spacing fix

**Review · Unrated · OSS · tsiger**

The code input had an unwanted gap at the bottom.

**Next:** Check its appearance and the existing change. [GitHub #127](https://github.com/tsiger/widgetizer/issues/127)

### GH134 · Review Undo after autosave

**Review · Unrated · OSS · tsiger**

Undo history now survives saves, so autosave should not prevent undoing an edit. Turning on "Split into pages" currently takes three undo steps to fully reverse.

**Next:** Check the shipped behaviour against the intended experience. [GitHub #134](https://github.com/tsiger/widgetizer/issues/134)

### GH135 · Review the Widgetizer Desktop name

**Review · Unrated · OSS · tsiger**

The visible app rename has already been implemented.

**Next:** Check the user-facing names and preserve the [existing installation identity](core-electron.md#display-name-and-installation-identity) before closing the task. [GitHub #135](https://github.com/tsiger/widgetizer/issues/135)

## Decisions to make

### T54 · Choose an accessibility standard

**Decision needed · Low · Shared**

The app has accessibility support, but no agreed standard for every control.

**Next:** Choose the target and a bounded review scope.

### T57 · Decide what the editor style guide covers

**Decision needed · Low · Docs**

The style guide describes visual rules but does not document the split-button component.

**Next:** Decide whether it should also be a component guide.

### T72 · Decide how theme authors package a new base version

**Decision needed · Low · OSS**

A theme ZIP with a changed base version can install fresh but be rejected as an update.

**Next:** Choose the supported author workflow before changing validation.

### T76 · Changing the main language

**Decision needed · Medium · OSS**

Once a site has two languages, its main language cannot change without removing the others.

**Next:** Decide whether to keep the restriction or support a content-preserving switch.

### GH120 · Decide anonymous usage and bug reporting

**Decision needed · Unrated · OSS · tsiger**

The idea is to collect app usage and failures without identifying users.

**Next:** Agree what to collect, consent and privacy before implementation. [GitHub #120](https://github.com/tsiger/widgetizer/issues/120)

### GH128 · Choose additional image optimisation tools

**Decision needed · Unrated · OSS · Unassigned**

More ways to reduce image size have been proposed.

**Next:** Choose the useful options and scope first. [GitHub #128](https://github.com/tsiger/widgetizer/issues/128)

### GH129 · Decide where Arch should display image captions

**Decision needed · Unrated · OSS · tsiger**

Captions already exist in some widgets; the issue does not say where else they are wanted.

**Next:** Identify the missing caption behaviour. [GitHub #129](https://github.com/tsiger/widgetizer/issues/129)

### GH130 · Decide the layout for downloadable files

**Decision needed · Unrated · OSS · tsiger**

A files widget with columns and icons was proposed.

**Next:** Decide whether the existing icon grid should cover it. [GitHub #130](https://github.com/tsiger/widgetizer/issues/130)

### GH138 · Edit project details directly from the project list

**Decision needed · Unrated · OSS · Unassigned**

You may want to edit a project’s details without opening it first.

**Next:** Choose the interaction and which fields it should offer. [GitHub #138](https://github.com/tsiger/widgetizer/issues/138)

### GH139 · Decide whether to hide the project folder name

**Decision needed · Unrated · OSS · Unassigned**

The folder-name field may expose a technical detail users do not need.

**Next:** Decide whether to hide it, explain it or make it advanced. [GitHub #139](https://github.com/tsiger/widgetizer/issues/139)

### MEDIA-BLANK-ALT · Decide whether translated media text can be deliberately blank

**Decision needed · Low · Shared**

The server understands "deliberately blank" alt text for one language (useful for decorative images), but the media panel has no way to set it, and saving the panel quietly turns an existing blank back into "use the main language's text".

**Next:** Either bring back a control for it, or drop the idea from the server and docs so they match the screen.

## Planned features

### MEDIA-MP4 · Support uploaded MP4 videos on site pages

**Open · Unrated · Shared**

The Widgetizer marketing site needs MP4 videos on some pages. We should be able to upload a video, choose it in a page widget and play it in both the preview and the published/exported site.

**Next:** Pick this up on **2026-10-02**. Check what the current media tools already support, add the missing pieces and verify the complete workflow with a real MP4, including saved references and export.

## Fixes and investigations

### LINK-DIRTY · Choosing a page in a link picker leaves the editor permanently "unsaved"

**Open · High · Shared**

After you pick a page for a button or link and save, the editor keeps saying there are unsaved changes: Save stays active, autosave keeps re-saving, and leaving the page warns you. Your work is saved; the editor just can't tell. Reloading clears it until the next time you pick a page. An app embedding the editor that checks for unsaved changes before an action (such as publishing) gets stuck.

**Next:** Make the "unsaved changes" check ignore empty values the save itself drops, and stop the link field adding them. Add a test that picking a page and saving leaves the editor clean.

### BACKUP-TRUST · Validate everything a restored backup brings in

**Open · High · Shared**

Restoring a backup trusts too much of what is inside it. A deliberately crafted backup can make a later theme update delete another project's folder, make an export copy files from elsewhere on the computer into the published site, or make an export write outside its own folder. A tiny zip can also expand until the disk fills, and some project details and media translations are accepted without checks. Normal backups made by the app are not affected.

**Next:** Check and clean every part of a backup on restore, and also make theme updates and exports refuse paths outside their own folder. Add a test for each crafted case.

### LOGO-NOTES · Adding a logo while creating a project erases its notes

**Open · High · Shared**

If you fill in Notes and choose a logo on the New project form, the project is created with the notes and then the logo step wipes them.

**Next:** Make a partial project update leave fields it didn't send untouched, and test that create-with-logo keeps the notes.

### R-THEME-SAVE · Keep theme-settings saves in order

**Open · Medium · Shared**

Confirmed with delayed save responses: save a red color, then blue, and an older response can make the app remember red as the saved value. Reset then brings back red even though blue is actually saved. The settings screen allows these saves to overlap.

**Next:** Coordinate theme-settings saves from both the settings screen and page editor. Verify that delayed responses cannot bring back old values, Reset reflects what was saved, and changes made while saving are preserved. Also cover two smaller timing gaps: a theme draft saved after you discarded and left, and the Settings screen getting stuck on its spinner.

### GH147 · A stale tab's theme-settings save reverts a theme update

**Open · Medium · Shared**

If an editor or Site settings screen was open before a theme update and you then save a theme setting there, it puts the old theme settings back. The project still says it is on the new version, so the update is never offered again and its new settings (such as Show breadcrumbs) never appear. Nothing warns the user.

**Next:** Make the server refuse a theme-settings save based on an older copy and ask the user to reload, without losing unsaved edits. Then consider telling open tabs about an update as soon as it happens. Plan it together with R-THEME-SAVE. [GitHub #147](https://github.com/tsiger/widgetizer/issues/147)

### LANG-LOCK-CHECKS · Re-check language rules inside the write lock

**Open · Medium · Shared**

If one tab adds a language at the same moment another tab changes the main language, the project can end up in a state where project settings can no longer be saved and the language can't be removed. A similar timing can let a new page take a language code (such as "el") as its address.

**Next:** Re-check both rules at the moment of writing, and add tests for the two timings.

### COLLECTION-LIST-RACE · A slow collection list can show another collection's items

**Open · Medium · Shared**

Switching quickly between two collections can leave the second one's screen showing the first one's items. Deleting from that screen can then delete the wrong item.

**Next:** Ignore list results that arrive for a collection you have already left, and test it.

### HOME-SLUG-LINKS · Links to a page slugged "home" break when Clean URLs is off

**Open · Medium · Shared**

A homepage whose address is "home" is published as index.html, but links and breadcrumbs point to home.html, which doesn't exist. Translated homepages make this easy to hit. Preview works, so it only shows up in the exported site.

**Next:** Make links to a "home" page match the file it is published as, in every language and URL mode.

### SEO-LANG · Fix multilingual search-engine output gaps

**Open · Medium · Shared**

On translated pages, the hidden breadcrumb information for search engines names the main language's homepage as "Home". Page 2 and later of a split page tell search engines about the wrong alternate-language pages. A new translation also copies a custom canonical address from the original, so the translation points search engines at the original page.

**Next:** Fix the breadcrumb Home address and the page-2 alternates, and decide whether a custom canonical address should be copied into translations.

### PARENT-TRANSLATION · Deleting a parent page detaches its translated children

**Open · Medium · Shared**

Deleting a parent page in one language also removes the parent link from its child pages in other languages, even though the parent's translation still exists. Their breadcrumbs lose a level.

**Next:** Only clear the parent when no translation of it survives, and test it.

### T32 · Check theme-upload validation cleanup

**Investigate · Low · OSS**

Two theme uploads may share a temporary validation folder; errors may also be logged twice.

**Next:** Confirm either issue still occurs before changing anything.

### T38 · Check how the app chooses its first project

**Investigate · Low · OSS**

Reading the active project can also choose one automatically. No user-facing failure is confirmed.

**Next:** Check only if changing project selection or reproducing a related problem.

### T41 · Investigate previews slowing down over long sessions

**Investigate · Medium · Shared**

An earlier benchmark found rich-text processing got slower the longer the server ran.

**Next:** Reproduce on current dependencies and measure realistic usage first.

### T44 · Keep published images complete and filenames distinct

**Investigate · Medium · Shared**

Nested preset folders or generated image names may conflict with how exports copy files.

**Next:** Reproduce the filename cases before choosing a fix.

### T53 · Make action menus easier to use with a keyboard

**Open · Low · Shared**

The three-dot menus need more consistent keyboard navigation and focus handling.

**Next:** Reuse the existing accessible menu behaviour where suitable.

### T58 · Investigate an occasional test-suite failure

**Investigate · Low · Tests**

One backend test once received a web page where it expected data, but passed by itself.

**Next:** Reproduce in the full suite before editing the test.

### T64 · Show lasting, accurate error messages

**Investigate · Low · Shared**

Some failures may look like an empty list or disappear with a brief notification.

**Next:** Recheck the reported screens, then fix one coherent group at a time.

### UI-LIST-REPLY · A bad list reply crashes or silently empties editor screens

**Open · Low · Shared**

During one Firefox session after upgrading, some of the editor's data requests came back empty, even though the server had sent everything; a browser restart made it stop. The editor handled those empty replies badly:

- the Pages screen showed "Error 500 / Unexpected error"
- the page editor showed widgets without names or settings, and "Add widget" listed nothing
- Media's "Used in" showed codes like `page:abc…` instead of page names
- the theme-update count failed quietly

None of these told the user that something had failed to load.

**Next:** When a reply isn't what's expected, show a clear "couldn't load" message instead of crashing or showing empty content (not an empty list, which would look like deleted pages). Fix the four cases above and the other screens that use the same language-version code (collection items list, collection item form, editor top bar). Then check the other list screens (menus, media, collections and similar) once: fix crashes and silent failures here, and pass any that show an empty list instead of an error to T64. Also decide whether the server should tell browsers not to keep copies of editor data.

### PAGE-SLUG-INPUT · Validate the slug sent with a page save

**Open · Low · Shared**

A hand-made request can give a page an address like "../theme" and overwrite the project's theme settings file, or write a page into another language's folder. The app itself never sends this.

**Next:** Check page and menu addresses on the server before saving, with tests.

### EXPORT-CLASH-LANG · Catch output-path clashes inside language folders

**Open · Low · Shared**

Export refuses some address clashes only for the main language. In a translated language, a collection can silently overwrite pages: after a theme update adds a collection named like a language code, or with a split homepage and a collection item called "2".

**Next:** Detect these clashes in every language and refuse the export with a clear message.

### THEME-STRINGS · Translate the remaining built-in breadcrumb and business-details text

**Open · Low · Shared**

Translated pages still show some English: "Page 2" and the hidden "Breadcrumb" label in breadcrumbs, and "Mon"–"Sun" and "Closed" in opening hours.

**Next:** Take these words from the theme's language files.

### RENDER-LANG · Make site-wide links and single-widget re-renders follow the page language

**Investigate · Low · Shared**

Links and menus chosen in site-wide theme settings always point to the same language, so translated pages show the original targets. Arch has no such settings, so this only affects other themes. A small preview-only case can also show the wrong language in a breadcrumb.

**Next:** Decide whether theme settings should follow the page language, and fix the preview lookup.

### THEME-UPDATE-RESUME · Recover an interrupted theme update without needing another update

**Open · Low · Shared**

If the app stops in the middle of a theme update, the project can be missing theme files until another update runs, and that may never happen.

**Next:** Recover or report an interrupted update the next time the project is opened or exported.

### DUPLICATE-FOLDER · Duplicating into an existing folder can merge into it and later delete it

**Open · Low · Shared**

If a stray folder already has the name a duplicate would use, the copy is merged into it, and if the duplicate fails the cleanup deletes that folder.

**Next:** Choose a folder name that is free on disk, and only clean up what the duplicate created.

### MENU-MEDIA-USAGE · Count upload links in menus as media usage

**Investigate · Low · Shared**

A file linked from a menu isn't counted as "used", so the media library may let you delete it.

**Next:** First check whether menus can link uploaded files at all; if they can, count those links.

### MEDIA-USAGE-LABELS · Show readable "Used in" labels for other-language content

**Open · Low · Shared**

In the media library, a translated header shows as "El:header (Global)" and translated collection items show a raw code instead of their title.

**Next:** Show a readable title with its language for every language.

### EDITOR-LANG-UX · Smooth the editor's language rough edges

**Open · Low · Shared**

While the page list is still loading, the language menu can offer to create the language you are already in. The parent-page list mixes pages from all languages without saying which is which. Creating a Greek page takes you back to the English tab, so the new page looks missing.

**Next:** Fix each of the three in a two-language project.

### STALE-BANNER · A project warning can hide a language-removed warning while saves stay suspended

**Open · Low · Shared**

After an unlikely sequence (a language is removed, another tab switches project, then you switch back), the warning disappears but the editor quietly stops saving.

**Next:** Keep the language warning, or always show that saving is paused.

### LINK-CACHE · Keep link-picker targets fresh after a change mid-load

**Open · Low · Shared**

A page created while the link picker is loading can be missing from it for up to a minute.

**Next:** Discard picker data that was loading when content changed.

### PRESET-ID-INPUT · Validate the preset name when creating a project

**Open · Low · Shared**

A hand-made request to create a project can name a "preset" outside the theme, and the new project then copies pages, menus and images from that other folder. The app itself never sends this.

**Next:** Accept only presets the theme actually declares, and test it.

### THEME-CHECKER · Close gaps in the theme checker

**Open · Low · OSS**

The new theme checker passes some things that break in an export (thumbnail-size images, image files placed inside a widget folder, image sizes without a width). It crashes on one valid template tag, and it reports wrong results for themes that use linked folders or odd preset names.

**Next:** Fix each case so the checker gives the right answer, with a test for each.

### T66 · Explain form errors beside the right field

**Open · Medium · Shared**

Messages such as “Validation failed” do not explain what the user should change.

**Next:** Start with duplicate or reserved page and item filenames.

### T73 · Let themes choose the page-title separator

**Open · Low · Shared**

A theme cannot currently choose “|” instead of “-” between the page and site titles.

**Next:** Add an optional separator if this author option is wanted.

### GH136 · Investigate the missing-icons preview warning

**Investigate · Unrated · OSS · Unassigned**

Preview has reported a missing icon file. It is not yet clear whether anything visible breaks.

**Next:** Reproduce and distinguish missing icons from harmless log noise. [GitHub #136](https://github.com/tsiger/widgetizer/issues/136)

### GH137 · Check whether theme sync changes menus

**Investigate · Unrated · OSS · Unassigned**

The issue asks about copying menus during theme sync, without describing the expected result.

**Next:** Clarify the developer workflow and reproduce what it does. [GitHub #137](https://github.com/tsiger/widgetizer/issues/137)

## Later — only when the stated need arises

### T4 · Automate a basic website-building check

**Deferred · Low · OSS**

A browser test could regularly check creating, editing and exporting a site.

**Next:** Add it when browser automation becomes a priority.

### T17 · Make tests catch unwanted output too

**Deferred · Low · Shared**

Some old tests check that the right text appears, but may miss extra wrong text.

**Next:** Tighten relevant tests when another weak test is found.

### T33 · Reduce repeated editor code where useful

**Deferred · Low · Shared**

Some form rules and saved-preference handling are repeated.

**Next:** Revisit when another change would repeat them again.

### T39 · Keep image-usage labels fresh during a refresh

**Deferred · Low · Shared**

A full refresh can overwrite a newer usage label saved while the scan was running.

**Next:** Act if stale labels occur in ordinary use.

### T43 · Review template file boundaries and escaping

**Deferred · Low · Shared**

Template includes and repeated escaping helpers deserve a check if template trust changes.

**Next:** Check before adding a new way to run untrusted templates.

### T61 · Reduce harmless preview startup warnings

**Deferred · Low · Shared**

Development previews can log a warning before their frame is ready. The preview then resynchronises.

**Next:** Tidy it when touching preview startup.

### T63 · Coordinate an unused publishing route before adopting it

**Deferred · Low · OSS**

A currently unused publishing adapter shares the export numbering system.

**Next:** Address it only when a real caller starts using it.

### T67 · Check export viewing through linked folders

**Deferred · Low · OSS**

A manually placed filesystem link inside an export could point outside that export folder.

**Next:** Revisit if such links become part of a supported workflow or threat model.

### T71 · Test leave-page prompts with real navigation

**Deferred · Low · Tests**

Current prompt tests simulate navigation and may miss what the actual router does.

**Next:** Add focused tests when changing navigation guards.

### R1-COORD · Coordinate structural changes only where workflows overlap

**Deferred · Medium · Shared**

Copying or updating a project does not share all the protections used by ordinary saves.

**Next:** Revisit when a supported workflow can run these operations together.

### R1-RESTART · Decide recovery for edits held across a server restart

**Deferred · Low · Shared**

An editor left open across a server restart can forget that a selected image was deleted.

**Next:** Revisit with a real report or a draft-recovery design.

### R1-CONTRACT · Share save-result rules when another caller needs them

**Deferred · Low · Shared**

Saves distinguish saved content with a warning from content that was refused.

**Next:** Share code only when a concrete new caller needs it.

### R2-REPAIR · Automatically repair links left by incomplete cleanup

**Deferred · Low · Shared**

If link cleanup partly fails, users get a warning but remaining dead links are not repaired automatically.

**Next:** Consider automatic repair if this happens in ordinary use.

### R2-MENU · Check menu matching when new setting types appear

**Deferred · Low · Shared**

Some cleanup identifies a selected menu by its unique ID rather than its field type.

**Next:** Revisit if another setting can contain an unrelated bare ID.

### R3-DRAFT · Recover unsaved work after a language is removed

**Deferred · Medium · Shared**

Blocked edits stay readable but are not automatically preserved outside the current session.

**Next:** Decide whether and how draft recovery should work.

### R3-FOLDERS · Remove empty language folders if they become a problem

**Deferred · Low · OSS**

Removing a language leaves empty folders. Current readers handle them correctly.

**Next:** Only tidy them if needed by a real folder-based workflow.

### R5-NESTED · Support links inside future structured settings

**Deferred · Medium · Shared**

Current controls do not create nested links inside a setting value, but a future control might.

**Next:** Address when introducing such a setting type.

### R8-ARCHIVE · Test additional damaged or newer backup formats

**Deferred · Medium · OSS**

Real backups restore correctly; some unusual or damaged archive shapes have not been examined. Deliberately crafted backups are BACKUP-TRUST.

**Next:** Take a bounded case when reported or when changing the backup format.

### R6-DELETE · Clean up after a project deletion partly fails

**Deferred · Medium · OSS**

A disk failure during deletion can leave files after the project disappears from the list.

**Next:** Revisit if leftover folders are reported or recovery is added.

### QA-EXTRA · Choose extra checks when changing an area

**Deferred · Low · Tests**

The old coverage map suggested more combinations to test. They are not confirmed bugs.

**Next:** Pick only checks relevant to a reported problem or planned change.

## Embedding apps

### T30 · Make project copying easier to embed

**Deferred · Medium · Embedding**

Another app embedding Widgetizer may need to copy project content and uploaded files separately.

**Next:** Design this when an embedding app needs these operations.

### T49 · Make content-rewriting helpers work through storage adapters

**Deferred · Low · Embedding**

Some setup and copying helpers write directly to disk rather than through the supplied storage service.

**Next:** Convert them when a storage integration needs it.

### T74 · Provide a complete page-render entry point for embedding apps

**Open · High · Embedding**

An app assembling its own export can accidentally omit pagination or page information.

**Next:** Address before relying on a custom publishing pipeline.

### GH133 · Review form limits for embedding apps

**Review · Unrated · Embedding · anastis**

OSS now allows unlimited forms. Embedding apps supply their own allowance.

**Next:** Confirm the embedding adapter and translated-form counting policy. [GitHub #133](https://github.com/tsiger/widgetizer/issues/133)

### H-WRITES · Keep custom host saves and deletes consistent

**Review · High · Embedding**

An app with its own handlers must keep the same saving, deletion and language-removal rules.

**Next:** Check before deploying custom handlers using these packages.

### H-ADAPTERS · Verify an embedding app’s adapters

**Review · High · Embedding**

The OSS tests cannot prove that another app’s storage and account boundaries work correctly.

**Next:** Run integration checks before deploying the package update.

### H-MULTIPROCESS · Coordinate multiple servers editing the same project

**Deferred · Unrated · Embedding**

Separate server processes do not share the in-memory locks or deleted-image history.

**Next:** Before enabling multiple writers, including overlapping deployments.

### H-RENDER · Check a custom publishing pipeline

**Review · High · Embedding**

Custom exports must use only the content they actually publish when resolving links.

**Next:** Before publishing through a host’s own renderer.

### H-BACKUP · Check custom backup and language setup flows

**Review · High · Embedding**

Custom restore or language-setup code must not silently lose content or overwrite translations.

**Next:** Before offering those custom workflows.

### H-THEMES · Check a custom theme-update flow

**Review · High · Embedding**

An embedding app’s update must not leave half of the old theme and half of the new one.

**Next:** Before offering custom theme updates.

### H-PAGES · Enforce a configured page allowance

**Open · High · Embedding**

A host can configure a page limit, but page-creation paths currently ignore it. The collection-item limit can be exceeded when two items are created at once. OSS is unlimited.

**Next:** Fix before relying on a finite page allowance.
