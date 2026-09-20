# Review status and follow-ups

[Review questions](review-questions.md) · [Map](README.md) · [Coverage](coverage.md)

Updated 2026-09-20 (R1, R2, R3, R5, R7 and R8 reviewed). This is the handoff summary; the review questions retain the reasoning and evidence. Update an item's status when it is reviewed, and replace an uncommitted status with the fix commit when available.

**Priority describes the next action, not proof of a bug.** High means check before the stated release or deployment milestone; Medium means planned follow-up; Low means revisit when its trigger occurs. “Before launch” below applies when that feature is included in the launch. Future scaling work does not block a single-process MVP.

## R1 — Image usage and safe deletion

**OSS status:** Implemented and reviewed for participating operations within one backend process. The reported review defects are fixed. Fixed in `ae8102a3`.

Deletion checks saved content, refuses incomplete verification, and coordinates with participating writes. Saves distinguish saved content with stale usage tracking from a rejected missing-image reference. The usage label can remain stale until refreshed.

**Verification:** independent review ran 16 backend review cases and 102 save-store tests successfully. The implementation agent reported 1,809 backend and 1,539 frontend tests passing, plus targeted lint. Full lint still has the pre-existing theme-deletion-marker parsing errors. Regression tests live in [mediaDeletionSafety.test.js](../../packages/builder-server/src/tests/mediaDeletionSafety.test.js) and [saveStore.test.js](../../packages/editor-ui/src/stores/__tests__/saveStore.test.js).

### OSS follow-ups

| Point | Priority | When to check | Next action |
| --- | --- | --- | --- |
| Copy and structural operations outside content coordination | Medium | During R4/R6 reviews, before claiming protection for every write path | Narrowed during R3: collection duplicate/discard/version and language add/remove now participate. Still outside: link enrichment and the structural flows (project create, duplicate, import, theme update). Check overlapping copy, removal and deletion; coordinate any demonstrated gaps. |
| Pending edits saved after a backend restart | Low | Before release acceptance for save recovery; revisit sooner if reproduced in ordinary use | Record the accepted limitation or design recovery: deleted-path memory ends on restart, while an editor's pending work may survive. |
| One common save-result/write contract | Low | When a concrete change would otherwise duplicate these rules again | Evaluate then; no broad refactor is required to finish the current fix. |

### Hosted follow-ups — generic integration checklist

These are requirements for any application embedding the public packages, not a description of a private deployment.

| Point | Priority | When to check | Next action |
| --- | --- | --- | --- |
| Custom save handlers that can write media references | High | Before launching with the media-safety change | Ensure they use the same coordination and deleted-reference validation as shared deletion, and return usage warnings. An independent lock does not coordinate them. |
| Integration tests with the host's adapters | High | Before deploying the package update | Test failed usage sync, unreadable content, overlapping saves/deletes and waiting saves; verify user feedback and tenant isolation. Record the exact OSS revision tested. |
| More than one backend process writing the same project | Deferred | Before enabling multiple writers, including overlapping deployment instances | Establish coordination across processes. No work is needed for this point while all relevant writes remain in one process. |
| Restart behavior and deleted-path memory | Low | Before launch operations review; revisit with uptime/deletion-volume evidence | Make the restart limitation explicit and assess process-lifetime retention. Any future memory bound must refuse unverifiable writes rather than silently discard protection. |

**Closure:** the reviewed OSS change is implemented; follow-ups above remain separate. Multi-process support is not a blocker for a single-process MVP. The complete participation boundary is in [media operations](operations/media.md#delete-or-bulk-delete). R3 generalised this fix's per-project media section into the shared content-write section, so the two items share one mechanism (`contentCoordination`).

## R2 — One policy for references to deleted content

**OSS status:** Implemented and reviewed. Deleting a page, collection item, menu or language clears the references to what was confirmed deleted, across every surviving language. Fixed in `1845945b`.

Confirmed defects, each reproduced before fixing and each covered by a regression verified to fail without its fix: language removal left every reference to its content dangling while single-page deletion cleared the same references; nothing on any path cleared references to a deleted menu; the sweep could clear links to a page that had been renamed rather than deleted (identity read before the lock); collection deletion skipped cleanup entirely when the order-file rewrite failed afterwards, unrecoverably, since a retry finds nothing left to delete; a cleanup failure reported flat success; collection folders that could not be listed were skipped silently; and the parent-reference scan ran once per deleted page on top of the widget walk.

One behaviour was deliberately reversed rather than fixed: clearing a link used to blank its text as well as its destination. Labels, targets and surrounding words are now kept — only the destination and the dead reference go.

**Verification:** 1,845 backend and 1,560 frontend tests pass, plus targeted lint and locale validation. Full lint still has the pre-existing theme-deletion-marker parsing errors. Regression tests live in [deletedReferenceCleanup.test.js](../../packages/builder-server/src/tests/deletedReferenceCleanup.test.js), with the user-facing half in [LanguagesSection.test.jsx](../../app/src/components/projects/__tests__/LanguagesSection.test.jsx) and [PagesLanguages.test.jsx](../../packages/editor-ui/src/pages/__tests__/PagesLanguages.test.jsx).

### Verified limitations

| Limitation | Why it stands |
| --- | --- |
| Remaining references are not repaired automatically | An incomplete sweep leaves references that render as dead destinations. They are fixed by editing the content that holds them. Automatic repair is deliberately outside this change. |
| A hand-typed URL to deleted content is left as written | It is not a reference to managed content. Rewriting it would be editing the author's words on their behalf. |
| Retention on partial failure is intentional | A target whose delete threw may still exist and the operation is retryable, so its references are kept. Only confirmed deletions are swept. |
| The warning names counts, not paths | Storage keys are carried for logs only. A person cannot act on `pages/el/index.json`; they can act on "check pages and menus that linked to it". |

### OSS follow-ups

| Point | Priority | When to check | Next action |
| --- | --- | --- | --- |
| Automatic repair of references left behind | Low | If incomplete sweeps are seen in ordinary use rather than only under induced failures | Today the warning is the whole remedy. A repair pass would need to re-derive which references are dead, which is the same walk — evaluate only with evidence it is needed. |
| Menu-setting matching is by uuid equality, not schema | Low | When a setting type could hold a bare uuid that is not a menu | A `menu` setting is matched by exact equality against a deleted menu's uuid rather than by reading each widget's schema, which would cost a second walk. Unique enough today; revisit if a new setting type makes it ambiguous. |
| Structural flows still outside the sweep | Medium | During R4/R6 | Link enrichment and project create/duplicate/import/theme update copy content that already exists and do not participate. Shared with R1's boundary item. |

### Hosted follow-ups — generic integration checklist

| Point | Priority | When to check | Next action |
| --- | --- | --- | --- |
| Custom delete handlers | High | Before launching with the deletion-policy change | A host that deletes managed content must clear its references the same way, against confirmed deletions only, inside the shared content-write section. |
| Surfacing `REFERENCE_CLEANUP_INCOMPLETE` | Medium | Before launch, if the host renders its own delete UI | The code arrives on every delete response. A host that ignores it reports a clean deletion when some content still points at what went. |

**Closure:** the reviewed OSS change is implemented; follow-ups above remain separate. Automatic repair and draft recovery are outside this change.

## R3 — Removing a language while someone is editing it

**OSS status:** Implemented and reviewed. A content write addressed to a removed language is refused rather than recreating it, and the editor keeps the work, stops retrying and explains. Fixed in `92eb3481`.

Confirmed defects, all reproduced before fixing and each covered by a regression that was verified to fail without its fix: a page content save and a page language version wrote into a removed language; the listing-anchor sweep and the menu uuid backfill wrote outside the section that checked; collection delete recreated an order file; the common "request arrived after removal" ordering answered a bare 400 that the editor could not act on; autosave restarted itself after being stopped; project revalidation cleared the language warning; and the first recovery wording offered steps that could not preserve the draft.

**Verification:** 1,826 backend and 1,557 frontend tests pass, plus targeted lint. Full lint still has the pre-existing theme-deletion-marker parsing errors. Regression tests live in [languageLifecycle.test.js](../../packages/builder-server/src/tests/languageLifecycle.test.js), [saveStore.test.js](../../packages/editor-ui/src/stores/__tests__/saveStore.test.js), [StaleProjectCurtain.test.jsx](../../packages/editor-ui/src/components/ui/__tests__/StaleProjectCurtain.test.jsx) and [useStaleActiveProjectDetection.test.js](../../packages/editor-ui/src/hooks/__tests__/useStaleActiveProjectDetection.test.js).

### OSS follow-ups

| Point | Priority | When to check | Next action |
| --- | --- | --- | --- |
| Automatic draft recovery | Medium | When deciding how much unsaved work the editor should survive losing | Today the draft is reachable, not rescued: the banner leaves the editor readable so it can be copied out, and nothing preserves it automatically. A real fix is its own feature — stash the draft locally and offer it back, or let it be exported. Not a requirement for closing this fix. |
| Two editor windows on the same removed language | Low | If reported, or before supporting multi-window editing as a workflow | Only one window is covered by tests. The refusal is per request so both should behave the same, but that is reasoning, not evidence. |
| Empty language folders survive removal | Low | During a tidy-up pass, or if a folder scan is ever given meaning | Removal empties `pages/<lang>/`, its `global/` and collection folders but leaves the directories. Harmless to every current reader, and noted so a future scan does not mistake one for content. |
| Concurrency tests must be proven to fail without their fix | High | Every time a concurrency test is added | Three tests in this review passed against the reintroduced bug, for three different staging mistakes. Sabotage the fix and watch the test fail before trusting it. `Object.create(adapter)` is not a usable test proxy here — the local adapters use private class fields, so inherited methods throw and callers that swallow read errors take a silent early exit; use a `Proxy` with bound methods. |

### Hosted follow-ups — generic integration checklist

These are requirements for any application embedding the public packages, not a description of a private deployment.

| Point | Priority | When to check | Next action |
| --- | --- | --- | --- |
| Custom writes addressed to a language | High | Before launching with the language-removal change | Any handler that writes language-addressed content must take the shared content-write section and re-read the project row inside it, as the packaged handlers do. A check made before the section is not a check. |
| Surfacing the refusal to the user | Medium | Before launch, if the host renders its own editor chrome | `LANGUAGE_REMOVED` arrives on both the in-section refusal and the request-boundary one. A host that does not handle it will retry a save that cannot succeed and show nothing useful. |
| More than one backend process writing the same project | Deferred | Before enabling multiple writers | Shares R1's deferral: the section is in-process, so language coordination does not hold across processes either. |

**Closure:** the reviewed OSS change is implemented; follow-ups above remain separate. Automatic draft recovery is a future improvement, not part of this fix.

## R5 — One description of reference-bearing values

**OSS status:** Implemented and reviewed. A `link`, `menu` or `richtext` setting declared in a theme's site-wide settings is now maintained by every walk that maintains a widget's, and resolved at render. Fixed in `6e9170c2`.

Confirmed defects, each reproduced before fixing and covered by a regression verified to fail without its fix: theme settings were reached by only one of five walks, so a site-wide selection never rendered, never survived a duplication and was never cleared on deletion; resolution ran before Clean URLs and the default language were initialised, giving a site's own default language a language folder and ignoring Clean URLs on a layout-only render; the pass that gives preset collection items fresh identities skipped theme settings, so a shipped article link kept the preset's identity; a transformer applied by value shape rather than declared type rewrote ordinary prose — a `text` setting reading "main-menu", then a richtext default containing those words; and theme richtext was enriched with stable references that nothing resolved, so the anchor silently stopped following renames.

A follow-on change lifted the last inconsistency: the editor withheld the richtext internal-link picker from theme settings, which was correct while nothing maintained a reference stored there and is not any more. The picker is now offered in every richtext field, and a user-selected reference was verified through its whole life — it survives the real theme save (the sanitizer preserves both reference attributes, and picker-shaped input round-trips without a warning), follows a rename at render, is re-pointed on duplication, and on deletion loses the anchor while keeping the sentence.

**Verification:** 1,871 backend and 1,562 frontend tests pass, plus targeted lint and locale validation. Full lint still has the pre-existing theme-deletion-marker parsing errors. Regression tests live in [themeSettingReferences.test.js](../../packages/builder-server/src/tests/themeSettingReferences.test.js), which drives real `renderPageLayout` / `renderWidget` renders rather than the resolver helper alone, and [SettingsPanelLinkPicker.test.jsx](../../packages/editor-ui/src/components/pageEditor/__tests__/SettingsPanelLinkPicker.test.jsx) for which fields are offered the picker.

### Deferred

| Item | Why it stands | Revisit when |
| --- | --- | --- |
| Nested references inside a setting's value | The media collector recurses into arrays and objects; the reference transformers visit only top-level setting values and block settings. Demonstrated with a list of rows: the image inside was tracked, the link inside was not cleared. Nothing can currently produce that shape — `table`, the only structured type, has text-only cells in v1 — so unifying the two traversals now would be speculative work against an interface that does not exist. | **A setting type is introduced that contains structured, nested references.** At that point the two traversals have to become one, rather than the new type being added to each separately. |

### OSS follow-ups

| Point | Priority | When to check | Next action |
| --- | --- | --- | --- |
| Reference kinds are listed in one place, traversal is not | Medium | Alongside the deferred item above | `REFERENCE_BEARING_SETTING_TYPES` plus per-type handlers is the catalog half of R5's candidate. The shared traversal primitive is the other half and is what the deferred item needs. |
| Theme settings and media | Low | If a theme declares a media-bearing site-wide setting beyond the favicon | Media in theme settings is tracked by usage rather than rewritten by these walks, which is correct — but it is the one container where the two systems differ by design rather than by oversight. |

### Hosted follow-ups — generic integration checklist

| Point | Priority | When to check | Next action |
| --- | --- | --- | --- |
| Hosts assembling their own render context | Medium | Before shipping a theme that uses site-wide references | `resolveThemeSettingReferences` is exported from `@widgetizer/render-engine` for exactly this. A host that builds its context without calling it gets settings that store and never resolve — the same silent failure this fixed. |

**Closure:** the reviewed OSS change is implemented; the nested-settings item is deferred with the trigger recorded above.

## R7 — Multilingual website output

**OSS status:** Implemented and reviewed. The export's link resolution, its collection-item inventory and its manifest summary now describe the site being published rather than the project on disk, and a page that asked not to be indexed is kept out of the hreflang clusters. Fixed in `ef3b96ae`.

Confirmed defects, each reproduced through a real export before being fixed and each covered by a regression verified to fail without its fix: links into a language the export refused to publish resolved to real-looking hrefs for files that were never written, in widget links, richtext anchors, menus and theme settings alike; `manifest.collections[].itemCount` counted only the default language while `itemPages` beside it described the whole site; a noindex page was advertised as an hreflang alternate in both the HTML and the sitemap; a noindex *item* translation was excluded from the sitemap but still advertised in the HTML, because the two artifacts read a sibling's robots directive through different objects and the item reference carried no SEO fields; and a fallback alternate tested the missing sibling's noindex status rather than the homepage it actually points at, so a noindex homepage was still published as `x-default`.

The item-alternate defect was addressed at the shape rather than at the instance. `buildTranslations` now defines what it reads off a sibling as one exported projection, `translationSibling`; it narrows whatever it is given before reading, and the uuid reference map is built from the same function. Both paths now use one definition of the sibling fields, preventing the missing-field mismatch found in this review.

Forms and Markdown were checked and found already correct: language-qualified form keys, export refused on same-language collisions with differing fields, the distinct-form limit enforced, and Markdown twins emitted for every exported page and item and for none of a skipped language.

**Verification:** 1,885 backend and 1,565 frontend tests pass, plus targeted lint. Full lint still has the pre-existing theme-deletion-marker parsing errors. The reviewer's independent reproduction script passes unchanged. Regression tests live in [multilangExport.test.js](../../packages/builder-server/src/tests/multilangExport.test.js) and [translations.test.js](../../packages/core/src/utils/__tests__/translations.test.js).

### Verified limitations

| Limitation | Why it stands |
| --- | --- |
| A noindex translation leaves its language cluster entirely | Nothing then points an alternate at that page from anywhere. That is the correct outcome for a page asking not to be indexed, but it means setting noindex on one translation quietly removes it from the cluster. Recorded as deliberate rather than discovered later. |
| A link into a skipped language is cleared, not reported per link | The export names the skipped language and says links into it were removed. It does not list which pages held them, for the same reason R2's cleanup warning names counts rather than storage keys. |
| The manifest is informational only | Nothing in the product reads `manifest.json` back. The count was corrected because it is published to whoever unzips the export, not because a consumer depended on it. |

### OSS follow-ups

| Point | Priority | When to check | Next action |
| --- | --- | --- | --- |
| Hands-on multilingual testing in a real project | Medium | Before declaring multilingual export release-ready | The review was driven through real exports in the test harness, which is stronger than assertion review but is not the same as using a two-language project. The paused hands-on testing remains the last step. |
| The legacy upgrade path | Medium | Before releasing to existing single-language projects | Out of scope for this review and still unverified: a project created before languages existed, opened and exported after. |

### Hosted follow-ups — generic integration checklist

These are requirements for any application embedding the public packages, not a description of a private deployment.

| Point | Priority | When to check | Next action |
| --- | --- | --- | --- |
| Hosts building their own render context for publishing | High | Before publishing a multilingual site | A host that lets the renderer load its own page map publishes links into languages it chose not to render. Seed the map from the pages actually being published, and restrict the collection-item map to the same languages. |
| Hosts assembling their own SEO artifacts | Medium | Before publishing a multilingual site | `buildTranslations` is the single source of the hreflang rules, including the `noindex` and `fallback` flags. An emitter that reads `translations` without honouring both flags republishes the defects above. |

**Closure:** the reviewed OSS change is implemented; follow-ups above remain separate. Hands-on project testing and the legacy upgrade path are the remaining work before multilingual export is release-ready.

## R8 — Backup and clone completeness

**OSS status:** Implemented and reviewed for the agreed scope. Both workflows preserve the whole project, including a language the static site export would skip; a backup this version cannot fully restore is refused instead of importing part of a site; and adding a language no longer overwrites translated content. Fixed in `57a57bfd`.

The content model itself was already correct in both workflows. One bilingual fixture carrying page and item translation groups, groups whose original identifying member was deleted, out-of-schema item fields, per-language manual order, `siteIdentity`, per-language media overrides including the difference between "inherit" and "deliberately blank", and every reference kind in the root, in language folders and in per-language globals, came through duplication and through backup/restore intact — under new identities for a duplicate and the backup's own for a restore.

Confirmed defects, each reproduced through the real controllers before being fixed and each covered by a regression verified to fail without its fix: the backup archived any `uploads/media.json` found on disk *and* appended the serialized library under the same name, so an extractor keeping the first entry made a leftover file the restored library; a media library that could not be read, was not a library (`{}`, or a `files` that is not a list), or could not be written restored as empty and reported success; the intermediate media file was deleted even when the restore had failed, turning a recoverable state into a silent loss; a single unreadable language code dropped every language including the valid ones, leaving their content on disk with nothing listing it and returning 201; adding a language back — the natural response to that — overwrote the restored menus and globals with copies of the default language's; the seeding preflight checked the files it would overwrite but not the ones it copied from, so an unreadable source header halted a run that had already created menus; rejected imports left the server's temporary upload behind; and the first refusal message told a non-technical user to remove the language it named, which is advice to delete a site's content.

**Verification:** 1,909 backend and 1,565 frontend tests pass, plus full lint (unchanged pre-existing failures) and locale validation. The reviewer's independent reproduction scripts pass unchanged. Regression tests live in [backupCloneCompleteness.test.js](../../packages/builder-server/src/tests/backupCloneCompleteness.test.js), which keeps the bilingual round-trip as one assertion applied to both workflows, and [languageService.test.js](../../packages/builder-server/src/tests/languageService.test.js) for the seeding contract.

### Scope of this review

It covered the content model across both workflows and the failure paths named above. **It is not an audit of every way an archive can be malformed**, and a successful restore of the fixture does not establish that every archive shape is handled.

### Verified limitations

| Limitation | Why it stands |
| --- | --- |
| A duplicate still copies a stale `uploads/media.json` | The file is inert: the backup path no longer reads it, so the duplicate's own backups are correct. Removing it would be a cleanup nobody asked for during a copy. |
| A refused import leaves nothing, including nothing to inspect | The failure handler removes the row and directory. Someone diagnosing a rejected backup works from the message and their own file, not from a partial project. |
| Identity rules stay different by design | A duplicate re-keys content so two projects can coexist; a restore keeps the backup's identities because they are the project. They are not being converged. |

### OSS follow-ups

| Point | Priority | When to check | Next action |
| --- | --- | --- | --- |
| Other archive shapes | Medium | When a real malformed backup is reported, or before offering restore as a supported recovery path | The refusals cover the shapes this review reproduced. A truncated ZIP, a manifest with a future `formatVersion`, and content files that parse but are not content have not been examined. |
| Structural flows still outside content coordination | Medium | During R6 | Shares R1's and R2's boundary item: project create, duplicate, import and theme update do not take the content-write section. R8 did not change that. |
| Hands-on multilingual testing in a real project | Medium | Before declaring multilingual backup/restore and export release-ready | Shared with R7. Both reviews were driven through the real controllers, which is stronger than assertion review and still not the same as using a two-language project. |

### Hosted follow-ups — generic integration checklist

These are requirements for any application embedding the public packages, not a description of a private deployment.

| Point | Priority | When to check | Next action |
| --- | --- | --- | --- |
| Hosts offering their own backup or restore | High | Before offering restore as a recovery path | Serialize the media library from the database rather than from a file in the project folder, refuse an archive this version cannot fully restore instead of importing part of it, and treat a library that cannot be read or written as a failure rather than an empty library. |
| Hosts seeding languages through their own flow | Medium | Before adding languages outside the packaged handler | Seeding must create what is missing and replace nothing, and read everything it touches before writing any of it. A host that copies unconditionally will overwrite translated content the moment a language is added over existing files. |

**Closure:** the reviewed OSS change is implemented; follow-ups above remain separate. Other archive shapes and hands-on project testing are outside it.

## R2–R8 — Review queue

These priorities are initial triage, not completed investigations. Hosted follow-ups should be added after the corresponding shared behavior is assessed, rather than guessed in advance.

**Suggested next: R6, then R4.** Both are Medium and neither gates an imminent release, so the more valuable next step may be the hands-on two-language testing paused since R1 — R7 and R8 both left it recorded as outstanding, and it is the last thing between multilingual export and calling it release-ready. R6 (operations that partly finish) is the closer follow-on of the two: R8 turned three silent partial results into refusals, and R6 asks the same question of project create, duplicate, import and theme update as whole operations.

| Item | OSS status | Review priority | When to check | Hosted follow-up |
| --- | --- | --- | --- | --- |
| [R2 — Deletion consequences](review-questions.md#r2-one-deletion-policy-for-references) | Reviewed and implemented — see [above](#r2--one-policy-for-references-to-deleted-content) | — | — | Listed above |
| [R3 — Removing a language during editing](review-questions.md#r3-language-lifecycle-and-content-writes) | Reviewed and implemented — see [above](#r3--removing-a-language-while-someone-is-editing-it) | — | — | Listed above |
| [R4 — Rules across create, duplicate and translate](review-questions.md#r4-shared-write-rules-without-forcing-one-workflow) | Not reviewed | Medium | Before releasing these workflows under enforced quotas; include R1's copy-path checks | To assess |
| [R5 — Finding every image and link reference](review-questions.md#r5-one-description-of-reference-bearing-values) | Reviewed and implemented — see [above](#r5--one-description-of-reference-bearing-values) | — | — | Listed above |
| [R6 — Operations that partly finish](review-questions.md#r6-structural-operations-and-partial-success) | Not reviewed | Medium | Before the next release changing import, clone, theme update or project deletion | To assess |
| [R7 — Multilingual website output](review-questions.md#r7-multilingual-output-completion) | Reviewed and implemented — see [above](#r7--multilingual-website-output) | — | — | Listed above |
| [R8 — Backup and clone completeness](review-questions.md#r8-backup-and-clone-completeness) | Reviewed and implemented — see [above](#r8--backup-and-clone-completeness) | — | — | Listed above |
