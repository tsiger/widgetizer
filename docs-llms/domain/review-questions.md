# Review questions and simplification candidates

[Map](README.md) · [Coverage](coverage.md) · [Operations](operations/README.md) · [Status, priorities and checkpoints](review-status.md)

## Plain-language guide

These are places where we should check whether the app's rules are complete, consistent and understandable. They are questions raised by the map, not a list of confirmed problems.

| Question | Why it matters to someone using the app |
| --- | --- |
| [R1: Is image usage still accurate after a save problem?](#r1-content-persistence-and-media-usage) *(implemented; follow-ups tracked)* | An image should not appear safe to delete while saved content still needs it. |
| [R2: Does deleting related content have consistent consequences?](#r2-one-deletion-policy-for-references) | Deleting a page by itself and deleting its whole language should have a clear policy for links left behind. |
| [R3: What if a language is removed while another window is editing it?](#r3-language-lifecycle-and-content-writes) | A late save should not unexpectedly bring back content from a removed language. |
| [R4: Do different ways of creating content obey the right rules?](#r4-shared-write-rules-without-forcing-one-workflow) | Create, Duplicate and Create language version should differ intentionally, not accidentally bypass limits or checks. |
| [R5: Do we find every place that uses an image or link?](#r5-one-description-of-reference-bearing-values) | A link inside formatted text matters just as much as one in a button or menu. |
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

See [delete or bulk delete](operations/media.md#delete-or-bulk-delete) for the rule and its limits, and [mediaCoordination](../../packages/builder-server/src/services/mediaCoordination.js) for why each of the three parts is needed on its own.

**Simplification candidate (still open):** one explicit contract for content-write results and usage reconciliation, reused by callers while keeping their individual lifecycle rules. Deliberately NOT taken as part of the above: the hazard did not require it, and collapsing the write paths is a much wider change than closing the deletion hole. The `warnings: [{code, path}]` channel the saves now use (shared with theme sanitization and `LANGUAGE_SKIPPED`) is the natural shape for it if it is ever done.

Evidence: [pageController](../../packages/builder-server/src/controllers/pageController.js), [previewController](../../packages/builder-server/src/controllers/previewController.js), [mediaController](../../packages/builder-server/src/controllers/mediaController.js), [mediaUsageService](../../packages/builder-server/src/services/mediaUsageService.js). Coverage: M3/M4, C1/C5.

## R2 One deletion policy for references

**Observed:** individual page/item deletion invokes stable-reference cleanup; language removal deletes its partition and usage without invoking those helpers. Render-time resolution separately handles missing targets. Menu deletion also relies on missing-menu behavior rather than scrubbing every selecting setting.

**Question:** should bulk language removal rewrite surviving page/item/menu/richtext/parent references just as individual deletion does, or is retaining unresolved references an intentional recoverability policy?

**Simplification candidate:** document one target-deletion policy, then share a batch cleanup operation where appropriate. Keep custom URLs and explicit UUID references distinct.

Evidence: [languageService](../../packages/builder-server/src/services/languageService.js), [pageController](../../packages/builder-server/src/controllers/pageController.js), [collectionController](../../packages/builder-server/src/controllers/collectionController.js), [linkEnrichment](../../packages/builder-server/src/utils/linkEnrichment.js). Coverage: L4, C2/C6/C7.

## R3 Language lifecycle and content writes

**Observed:** language add/remove has a keyed serializer; translation creation has another. Ordinary page/menu/item writes resolve language using request project context. Serialization within one workflow does not coordinate all the others.

**Question:** what happens when language removal overlaps version creation, autosave, item reorder, or global save? Can a request validated before removal write content after cleanup?

**Simplification candidate:** define the language lifecycle consistency boundary, then choose a shared coordinator or freshness check only where needed. Avoid spreading independent locks whose ordering is difficult to reason about.

Evidence: [languageController](../../packages/builder-server/src/controllers/languageController.js), [translationService](../../packages/builder-server/src/services/translationService.js), [contentLanguage](../../packages/builder-server/src/utils/contentLanguage.js). Coverage: L2/L4/L6.

## R4 Shared write rules without forcing one workflow

**Observed:** page metadata update, content save, duplication and version creation build/write pages through different branches. Collection create/duplicate/version paths also differ. Limits, pagination, identity and sanitization must be checked on every relevant entry point.

**Question:** which invariants are universal, and which deliberately differ? A page duplicate clears listing flags; a language version keeps them. Creation quotas should not disappear merely because the user chose Duplicate or Create version.

**Simplification candidate:** shared normalization/validation and an explicit identity/copy policy, with separate orchestration for distinct operations. First compare the behavior matrix; do not collapse handlers solely because they look alike.

Evidence: [pageController](../../packages/builder-server/src/controllers/pageController.js), [collectionController](../../packages/builder-server/src/controllers/collectionController.js), [collectionService](../../packages/builder-server/src/services/collectionService.js). Coverage: C1/C7/C8, L3.

## R5 One description of reference-bearing values

**Observed:** seeding, project cloning, deletion cleanup, rendering and media usage all walk content for different kinds of references. New setting types or nested shapes must be represented in each applicable walk.

**Question:** are links/media in widgets, global blocks, collection settings, richtext and structured settings all discovered consistently?

**Simplification candidate:** reusable traversal primitives and an explicit reference-kind catalog. Keep transformations separate: rendering hrefs, remapping UUIDs and collecting media usage have different outputs and error policies.

Evidence: [linkEnrichment](../../packages/builder-server/src/utils/linkEnrichment.js), [mediaUsageService](../../packages/builder-server/src/services/mediaUsageService.js), [menuResolver](../../packages/render-engine/src/menuResolver.js), [setting types](../../packages/core/src/config/settingTypes.js). Coverage: M3/M5, P4/P5.

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
