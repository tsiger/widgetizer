# Tasks — plain English

**Start with one task, not the whole list.** Deferred items are not release requirements.

- **Review:** work exists or is reported ready; check it before calling it done.
- **Decision needed:** agree what we want before building it.
- **Investigate:** confirm the problem; do not assume a fix is needed.
- **Open:** recorded work to do. **Deferred:** wait for its stated trigger.
- Priorities are inherited from the notes. **Unrated** means we have not chosen one.

**Areas:** OSS = the standalone app; Shared = code used by both apps; Embedding = an app reusing Widgetizer. Names on GitHub tasks are their recorded assignees.

**Jump to:** [Reviews](#ready-to-review) · [Decisions](#decisions-to-make) · [Fixes/checks](#fixes-and-investigations) · [Later](#later--only-when-the-stated-need-arises) · [Embedding apps](#embedding-apps)

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

Undo history now survives saves, so autosave should not prevent undoing an edit.

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

## Fixes and investigations

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

Real backups restore correctly; some unusual or damaged archive shapes have not been examined.

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

A host can configure a page limit, but page-creation paths currently ignore it. OSS is unlimited.

**Next:** Fix before relying on a finite page allowance.
