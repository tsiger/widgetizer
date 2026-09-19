# Review questions and simplification candidates

[Map](README.md) · [Coverage](coverage.md) · [Operations](operations/README.md) · [Status, priorities and checkpoints](review-status.md)

## Plain-language guide

These are places where we should check whether the app's rules are complete, consistent and understandable. They are questions raised by the map, not a list of confirmed problems.

| Question | Why it matters to someone using the app |
| --- | --- |
| [R1: Is image usage still accurate after a save problem?](#r1-content-persistence-and-media-usage) *(implemented; follow-ups tracked)* | An image should not appear safe to delete while saved content still needs it. |
| [R2: Does deleting related content have consistent consequences?](#r2-one-deletion-policy-for-references) *(implemented; follow-ups tracked)* | Deleting a page by itself and deleting its whole language should have a clear policy for links left behind. |
| [R3: What if a language is removed while another window is editing it?](#r3-language-lifecycle-and-content-writes) *(implemented; follow-ups tracked)* | A late save should not unexpectedly bring back content from a removed language. |
| [R4: Do different ways of creating content obey the right rules?](#r4-shared-write-rules-without-forcing-one-workflow) | Create, Duplicate and Create language version should differ intentionally, not accidentally bypass limits or checks. |
| [R5: Do we find every place that uses an image or link?](#r5-one-description-of-reference-bearing-values) *(implemented; one item deferred)* | A link inside formatted text matters just as much as one in a button or menu. |
| [R6: Can we explain an operation that only partly finished?](#r6-structural-operations-and-partial-success) | You should be able to tell what was kept, what failed and what to do next. |
| [R7: Does the generated website include the right language content?](#r7-multilingual-output-completion) | Pages, articles, navigation and search information should agree about which versions exist. |
| [R8: Does a backup or copy preserve everything important?](#r8-backup-and-clone-completeness) | A restored website should retain translations, relationships, image descriptions and ordering. |

Simplification means putting the same rule in one dependable place or making outcomes clearer. It does not mean removing meaningful differences, such as the difference between a duplicate and a translation.

## Technical details

These are concrete follow-up questions identified while mapping source. They are **not fixes made in this change**. Current multilingual work may already be addressing some. Confirm intended product behavior and inspect existing assertions before opening work or declaring a defect.

## R1 Content persistence and media usage

**Status:** OSS implementation reviewed; remaining work and generic hosted integration checks have separate [priorities and checkpoints](review-status.md#r1--image-usage-and-safe-deletion).

**Original observation:** page/global/project-identity saves could persist content and warn on failed usage synchronization. Media deletion trusted recorded usage. Collection and language-removal paths used different ordering and error handling.

**Question:** when content is saved but usage is stale, what should the user see, and what makes a subsequent “unused” deletion safe?

**Answered.** The three paths were found to have opposite failure biases: page/global/theme/identity saves swallowed a usage-sync failure and reported plain success; collection items propagated it and answered 500 *after writing the item*; only `languageService.removeLanguage` was ordered so that staleness could only ever fall in the safe direction. That last one's rule was adopted as the contract: **never report a file unused while saved content references it.**

What settled the "what makes deletion safe" half is that staleness has a direction. Over-reporting (a row outliving its reference) blocks a delete and is harmless; under-reporting loses an image. So deletion stopped trusting the rows — it re-derives usage from content through the existing traversal and deletes only when the rows and the fresh scan agree, refuses when the scan is incomplete, runs inside a per-project section content writes also take, and records what it removed so a save queued behind it cannot reintroduce the reference. Saves keep succeeding and now carry a `MEDIA_USAGE_STALE` warning; the collection 500 became a warning too, since the item was in fact written.

Two promises were deliberately separated rather than conflated: deletion is safe, the "unused" label is accurate **eventually**. Only the first is a guarantee, and it is scoped: it holds **for participating operations, within one backend process**. Verification re-reading shared storage does *not* extend it — two processes can scan concurrently and both conclude a file is unused. The operations wired in are the ones where someone picks a file from the library; the copy-and-remap flows are not, and are listed in [delete or bulk delete](operations/media.md#delete-or-bulk-delete) along with why they are expected to be harmless rather than proven excluded.

**Embedding-host follow-up:** custom writes that introduce media references must use the same coordination as shared deletion, even within one process. Cross-process coordination is a separate, deferred requirement: check it before allowing more than one backend process to write the same project. It does not block a single-process MVP. See the [integration checklist](review-status.md#hosted-follow-ups--generic-integration-checklist) for priorities and checkpoints.

See [delete or bulk delete](operations/media.md#delete-or-bulk-delete) for the rule and its limits, and [contentCoordination](../../packages/builder-server/src/services/contentCoordination.js) for why each of the three parts is needed on its own.

**Simplification candidate (still open):** one explicit contract for content-write results and usage reconciliation, reused by callers while keeping their individual lifecycle rules. Deliberately NOT taken as part of the above: the hazard did not require it, and collapsing the write paths is a much wider change than closing the deletion hole. The `warnings: [{code, path}]` channel the saves now use (shared with theme sanitization and `LANGUAGE_SKIPPED`) is the natural shape for it if it is ever done.

Evidence: [pageController](../../packages/builder-server/src/controllers/pageController.js), [previewController](../../packages/builder-server/src/controllers/previewController.js), [mediaController](../../packages/builder-server/src/controllers/mediaController.js), [mediaUsageService](../../packages/builder-server/src/services/mediaUsageService.js). Coverage: M3/M4, C1/C5.

## R2 One deletion policy for references

**Status:** OSS implementation reviewed; remaining work has [priorities and checkpoints](review-status.md#r2--one-policy-for-references-to-deleted-content).

**Original observation:** individual page/item deletion invokes stable-reference cleanup; language removal deletes its partition and usage without invoking those helpers. Render-time resolution separately handles missing targets. Menu deletion also relies on missing-menu behavior rather than scrubbing every selecting setting.

**Question:** should bulk language removal rewrite surviving page/item/menu/richtext/parent references just as individual deletion does, or is retaining unresolved references an intentional recoverability policy?

**Answered: it should, and the retention was not a policy.** Reproduced side by side from one starting state — English content referencing a Greek page four ways. Deleting that page cleared all four; removing the language that contained it cleared none. Reachable rather than theoretical, because the link picker deliberately offers targets in every language.

What settled it is that retention here has no recovery value. Re-adding a language does not restore its pages and new content gets new uuids, so a reference into removed content is permanently dead rather than temporarily unresolvable. Rendering already degrades gracefully, so the cost falls on the editor, where the picker deliberately preserves a reference it cannot resolve ("never inferred-deleted") and would keep showing a selection that can never work again.

A third gap fell out of the same question: **nothing anywhere cleared references to a deleted menu**, on any path, including single-language sites.

The one case where retention IS right turned out to be already present and unrecognised: a removal that fails partway keeps the language listed for retry, so its surviving targets are still there. The policy therefore turns on *confirmed* deletion rather than attempted deletion — uuids are recorded as each delete returns, not before.

See [one policy for references to deleted content](operations/content.md#one-policy-for-references-to-deleted-content) for the rule, what it deliberately leaves alone, and what happens when the sweep cannot finish.

**Simplification candidate (taken):** "document one target-deletion policy, then share a batch cleanup operation where appropriate" is what was built. One batch walk handles pages, items and menus together; the per-uuid walks it replaced meant a bulk delete of twenty pages read and rewrote the whole project twenty times. Custom URLs and explicit uuid references stayed distinct, as the candidate asked — a hand-typed address is never rewritten.

Evidence: [linkEnrichment](../../packages/builder-server/src/utils/linkEnrichment.js), [languageService](../../packages/builder-server/src/services/languageService.js), [pageController](../../packages/builder-server/src/controllers/pageController.js), [collectionController](../../packages/builder-server/src/controllers/collectionController.js). Coverage: L4, C2/C6/C7.

## R3 Language lifecycle and content writes

**Status:** OSS implementation reviewed; remaining work has [priorities and checkpoints](review-status.md#r3--removing-a-language-while-someone-is-editing-it).

**Original observation:** language add/remove has a keyed serializer; translation creation has another. Ordinary page/menu/item writes resolve language using request project context. Serialization within one workflow does not coordinate all the others.

**Question:** what happens when language removal overlaps version creation, autosave, item reorder, or global save? Can a request validated before removal write content after cleanup?

**Answered: yes, it could.** Reproduced against a page content save and a page language version — both returned success and wrote into a language the project no longer listed. A menu save happened to 404 instead, but incidentally (it reads before writing), not by design.

The orphan was worse than a stray file. Export and the editor read the project row, so neither could see it; the media usage rebuild scans the folders on disk, so it could. An image referenced only by that unreachable content became permanently undeletable, blamed on a page nobody could open. R1's verify-from-content did not cause this, but it made it durable rather than transient.

**What settled it** is that ordering and freshness are two different requirements, and each is useless alone. R1's per-project section was generalised from media into one **content-write section** (`contentCoordination`) that content writes, media deletion and language add/remove all take — rather than adding a fourth independent per-project lock, which R3's own simplification candidate warns against. Inside it, each write re-reads the project row and refuses with `LANGUAGE_REMOVED`. A write that *waited* for the section validated against a world that had already changed, so the section alone would not have been enough; equally, a check outside the section is not a check.

Two boundaries turned out to matter more than expected, and both are recorded in [coordination with content writes](operations/languages.md#coordination-with-content-writes): a section has to span **every** write a request makes (a page save also sweeps the listing anchor off other pages, and that sweep sat outside it), and a check and its write must be **the same** section, not two steps (the menu listing's uuid backfill checked, then wrote, with a gap).

**The editor's half** reuses the existing stale-editor pattern rather than inventing one: the refusal keeps every edit, suspends saving for the rest of the session — durably, since the autosave tick reschedules itself and every edit re-arms it — and explains in a banner rather than an overlay, because the draft cannot be saved anywhere and the editor underneath is the only place it still exists. Recovery means copying the work out; nothing preserves it automatically, and the wording no longer implies otherwise. Automatic draft recovery is [a possible future improvement](review-status.md#r3--removing-a-language-while-someone-is-editing-it), not part of this fix.

**Simplification candidate (taken):** the "define the language lifecycle consistency boundary, then choose a shared coordinator or freshness check only where needed" candidate is what was built. The boundary is the content-write section; the freshness checks are `assertLanguageStillEnabled` and R1's `assertIntroducedMediaExists`, which share one shape — re-read the authority inside the section, compare, refuse with a stable code.

Evidence: [languageController](../../packages/builder-server/src/controllers/languageController.js), [contentCoordination](../../packages/builder-server/src/services/contentCoordination.js), [contentLanguage](../../packages/builder-server/src/utils/contentLanguage.js). Coverage: L2/L4/L6/L7.

## R4 Shared write rules without forcing one workflow

**Observed:** page metadata update, content save, duplication and version creation build/write pages through different branches. Collection create/duplicate/version paths also differ. Limits, pagination, identity and sanitization must be checked on every relevant entry point.

**Question:** which invariants are universal, and which deliberately differ? A page duplicate clears listing flags; a language version keeps them. Creation quotas should not disappear merely because the user chose Duplicate or Create version.

**Simplification candidate:** shared normalization/validation and an explicit identity/copy policy, with separate orchestration for distinct operations. First compare the behavior matrix; do not collapse handlers solely because they look alike.

Evidence: [pageController](../../packages/builder-server/src/controllers/pageController.js), [collectionController](../../packages/builder-server/src/controllers/collectionController.js), [collectionService](../../packages/builder-server/src/services/collectionService.js). Coverage: C1/C7/C8, L3.

## R5 One description of reference-bearing values

**Status:** OSS implementation reviewed; one sub-item deferred with an explicit trigger — see [priorities and checkpoints](review-status.md#r5--one-description-of-reference-bearing-values).

**Original observation:** seeding, project cloning, deletion cleanup, rendering and media usage all walk content for different kinds of references. New setting types or nested shapes must be represented in each applicable walk.

**Question:** are links/media in widgets, global blocks, collection settings, richtext and structured settings all discovered consistently?

**Answered: no, and the gap was a container rather than a kind.** Built the matrix of five walks against six containers. Pages, globals, menus and collection items were consistent across all five. **Theme settings were reached by exactly one walk** — media usage — while the other four and the renderer skipped them.

That was coherent only while theme settings carried nothing but media. They are edited through the same `SettingsRenderer` against the same shared type catalog, so a theme author could declare a `link` or `menu` among the site-wide settings, get a fully working picker, save a value — and have it never render, never survive a duplication, and never be cleared when its target was deleted. Nothing warned at any layer.

The decision was to **support** rather than forbid: theme authors can use the existing inputs, and those selections are now maintained by every walk. The editor's richtext internal-link picker, withheld from theme settings for the same reason the walks skipped them, was enabled once those walks covered them. Details and the template contract are in [setting types](../theming-setting-types.md#link).

Four rounds of review found the ways a half-supported reference still misbehaves, and they are worth keeping as the shape of this class of bug: resolution that runs before the settings governing href shape are initialised (a site's own default language was given a language folder); a later seeding pass that regenerates identities and was not included, so a preset's article link kept the preset's identity; and a transformer applied by value shape rather than by **declared type**, which rewrote ordinary prose — first a `text` setting reading "main-menu", then, once text was excluded, a richtext default merely containing those words. The last is the general lesson: dispatch on the declared type, never on what the value looks like.

**Simplification candidate (partly taken):** the "explicit reference-kind catalog" exists now as `REFERENCE_BEARING_SETTING_TYPES` plus per-type handlers, so a walk states which kinds it handles instead of inferring them. The "reusable traversal primitives" half is not done — see the deferred item below.

**Deferred: nested references.** The walks disagree about depth. The media collector recurses into arrays and objects; the reference transformers visit only top-level setting values and block settings. Demonstrated with a setting holding a list of rows: the image inside was tracked, the link inside was not cleared. Left alone because nothing can currently produce that shape — `table`, the one structured type, holds text-only cells in v1. **Revisit when a setting type is introduced that contains structured, nested references**, at which point the two traversals need to become one.

Evidence: [linkEnrichment](../../packages/builder-server/src/utils/linkEnrichment.js), [renderEngine](../../packages/render-engine/src/renderEngine.js), [mediaUsageService](../../packages/builder-server/src/services/mediaUsageService.js), [setting types](../../packages/core/src/config/settingTypes.js). Coverage: M3/M5, P4/P5.

## R6 Structural operations and partial success

**Observed:** project creation/duplication/import, theme update and project deletion cross files/assets/SQLite. Some subordinate failures become warnings; theme update can continue after path-copy errors and still record the target version. An atomic local file write cannot make the full workflow atomic.

**Question:** which outcomes count as success, partial success, or a retryable failure? Can the UI accurately explain what remains to repair?

**Simplification candidate:** consistent operation-result shapes and explicit recovery stages. Consider staging/commit boundaries for operations needing all-or-nothing behavior; use retryable cleanup where that better fits the product.

Evidence: [projectController](../../packages/builder-server/src/controllers/projectController.js), [projectScaffold](../../packages/builder-server/src/utils/projectScaffold.js), [projectService](../../packages/builder-server/src/services/projectService.js), [themeUpdateService](../../packages/builder-server/src/services/themeUpdateService.js). Coverage: P1/P2/P4/P5/P6, T2.

## R7 Multilingual output completion

**Observed:** steps 20–21 now select exportable languages, enumerate their collection items, generate multilingual SEO/form artifacts and scope listings/pagination to the rendered language. Focused source/assertion review and test runs cover the main new cases. The earlier root-oriented export observation is superseded. `manifest.collections[].itemCount` remains a default-language count, so not every summary has the same scope as the generated site.

**Question:** do the completed theme controls and upgrade path satisfy these rules in a real project? Also check explicit links into skipped languages, translated item alternates and Markdown, noindex siblings, same-language form collisions/limits, and whether the manifest count's scope is clear to consumers. These are follow-up combinations, not confirmed defects or claims of missing tests.

**Simplification candidate:** preserve the new shared export-language selection and published-address helpers. Compare the remaining inventories used by rendering, SEO, forms and manifest summaries before introducing further abstraction; align their scope where they are meant to describe the same content.

Evidence: [output boundaries](operations/output.md#multilingual-boundary-at-this-snapshot), [contentAddress](../../packages/core/src/utils/contentAddress.js), [exportController](../../packages/builder-server/src/controllers/exportController.js). Coverage: O1/O3.

## R8 Backup and clone completeness

**Observed:** duplication remaps content UUIDs; import keeps copied content UUIDs inside a new project; both regenerate media IDs. Repository-level metadata rewrite assertions exist, while a complete multilingual artifact round-trip requires more than that one layer.

**Question:** do both workflows preserve all translations, groups with deleted original members, archived fields, manual orders, media overrides and every reference kind?

**Simplification candidate:** a small shared multilingual fixture and a semantic comparison helper that accounts for each operation's intentional identity changes. Keep backup and clone semantics separate instead of forcing identical identity behavior.

Evidence: [project workflows](operations/projects.md), [remapping](../../packages/builder-server/src/utils/linkEnrichment.js), [projects tests](../../packages/builder-server/src/tests/projects.test.js), [media tests](../../packages/builder-server/src/tests/media.test.js). Coverage: P4/P5/M2.

## What is already simplifying the model

Preserve the useful existing boundaries: centralized content addresses; explicit stable UUIDs versus mutable slugs; ownerless translation groups; shared media with narrow metadata overrides; scope-first adapters; a canonical theme store; and separate theme definitions versus project content. The aim of further simplification is fewer repeated rules and clearer outcomes, not fewer meaningful domain distinctions.
