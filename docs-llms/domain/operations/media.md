# Media lifecycle

[Map](../README.md) · [Media entity](../entities/media.md) · [Coverage](../coverage.md#media-and-references)

## Plain-language guide

### Uploading and choosing a file

Upload photographs or supported documents into the project's media library. Widgetizer checks the upload and prepares image sizes where appropriate. You can then browse or filter the library to choose a file for a block, gallery, sharing image, logo or another supported field.

Uploading saves the file to the library. Selecting it for an unsaved page edit is a separate step; save the page to keep that selection. One file can be selected in many places.

Opening or downloading an uploaded file lets you view or keep a copy of it; it does not remove it from the library. Playing supported audio or video and jumping to another position are viewing actions, not content edits.

### Editing descriptions

A file can have alternative text, a title and, for images, a caption. Edit the default descriptions, or choose another language and supply translated descriptions for the same file.

“Inherit” uses the default-language description. An intentionally empty description stays empty. For example, an image used decoratively in the Greek content may have intentionally empty Greek alternative text.

Changing a library description can affect all places that use it when they are rendered again. Changing one block's image selection affects only that block's selection.

### Inspecting usage

The usage view tells you which saved parts of the project use a file. These can include pages, collection entries, shared headers/footers, theme settings and the business logo.

Refresh usage asks Widgetizer to check saved content again. An unsaved image selection in an open editor is not yet a saved use. A successful refresh and a complete usage list also depend on the underlying content being readable; the technical notes describe those limits.

### Deleting files

The app blocks deletion when a file is in use. Before deleting, it re-reads your saved content rather than relying on the recorded usage list, so a file is protected even if that list has fallen behind. To remove a used photograph, first replace or remove its uses and save those content changes. Other languages or shared settings may still use it.

If the app cannot read all of your content, it cannot tell whether a file is still needed — so it refuses to delete and says which content it could not read. This is not a failed deletion so much as an unanswered question; it is safe to try again once the content is readable.

Two promises worth keeping apart: **deletion is safe**, and the **"unused" label is accurate**. The first always holds. The second can be temporarily wrong — the library may show a file as unused while a recent save has not been fully accounted for. Refresh usage corrects the label; deletion does not depend on it being correct in the first place.

Deleting an unused image removes the file and its generated sizes. Deleting several files can succeed for some and fail for others; inspect the results rather than assuming the entire selection was removed.

Deleting a block, page or language does not automatically delete its uploaded media. This lets the same file survive while another part of the project still needs it.

### If an upload fails

An unsupported file, size limit or processing/storage problem can prevent an upload. A batch can contain both successful and failed files. Check which files were added before repeating the whole batch.

### Example

Replace a photo in an English block and save. The old photo remains in use by its Greek counterpart, so it cannot yet be deleted. Replace it there too and save; then check usage again.

## Technical details

## Upload and process

Validate the project scope, accepted type and upload size; choose a safe unique filename; process supported images and generated sizes; upload original/renditions through asset storage; insert file metadata and sizes under the project. The upload middleware consults the upload-size limit; the presence of a total-media limit key in adapter contracts does not establish enforcement in this handler. Non-image uploads follow the file-asset path. Creation of a file and selecting it in a widget are separate actions: the library can contain unused uploads.

Upload error handling includes cleanup around failed persistence. [mediaInsertAtomicity](../../../packages/builder-server/src/tests/mediaInsertAtomicity.test.js) is a relevant suite, but does not establish that every asset-adapter failure is recoverable. Check both original and rendition cleanup, not only the row insert.

## Select or reference media

Choosing a file changes the containing setting or SEO/identity field. Saving that owner updates its usage source. Another language may reference the same binary or choose a different one. Replacing an image setting should release only the old owner's reference, not delete the old file or affect other owners.

## Edit metadata

Default-language updates store base alt/title/caption. Other-language updates store per-field overrides. Omitted/`null` means inherit; empty string means deliberately blank. Returning every field to inheritance removes the redundant translation row. Caption data is image-only. Content owners do not need to duplicate the binary to get translated metadata.

Test assertions inspected in [media](../../../packages/builder-server/src/tests/media.test.js), `updateMediaMetadata across languages`: preserve base values, absent versus empty override, remove all-inherited rows, reject unknown language, preserve overrides through the metadata rewrite used by import/duplication.

## Inspect or rebuild usage

Usage queries return the file's recorded sources. Refresh enumerates pages/globals across language folders, collection items, theme settings and site identity, then rebuilds usage. Legacy usage identities are migrated through a rescan where required.

Usage is derived state. Several content paths deliberately warn rather than fail when syncing it — the content IS saved, so reporting a failed save would be false; they return a `MEDIA_USAGE_STALE` warning alongside the success instead. Because the rows can therefore be behind, deletion re-derives usage rather than trusting them (below), and the stored rows are not a promise about current content.

## Delete or bulk delete

Deletion does not trust the recorded usage list. It re-derives usage from content through the same traversal the Refresh Usage button runs — every language's pages, headers/footers, collection items, theme settings and the site identity — and a file is deletable only when **both** the recorded rows and that fresh scan agree it is unused. The rescan exists to catch a *missing* row, not to overrule a present one: a row with no matching content is the harmless direction of staleness, and honouring it keeps a delete that was previously refused from suddenly going through.

An incomplete scan is not an answer. When any content could not be read, the traversal reports it in `skipped`, and deletion answers `409 MEDIA_USAGE_UNVERIFIED` naming that content instead of deleting — an unreadable page contributes no references, which is otherwise indistinguishable from a page that has none.

Verification and deletion run inside the shared per-project content-write section that content writes also take, so a save cannot land a new reference between the scan and the delete it authorised. Ordering alone does not cover the save that was *queued behind* the delete, which would otherwise introduce a reference to a file that is now gone; deletion therefore records what it removed, and a write that would newly introduce one of those paths is refused with `409 MEDIA_REFERENCE_MISSING`. That check is deliberately narrow — only newly introduced paths, only paths this process deleted, and only while the asset is still absent, so re-uploading the same filename clears it. An upload path with nothing behind it stays legitimate everywhere else.

**What a write may still reference.** Only one case is refused: a path this process deleted, newly introduced, while the asset is still absent. A path that is **present but unregistered** (bytes on disk, no media record) and a path that is **genuinely missing but was not deleted here** (imported content whose binaries did not travel, hand-edited JSON, a file deleted before this process started) both keep saving. A dangling reference is a tolerated state in this system, not an error; what is prevented is a save *creating* one out of a file the library showed a moment ago.

**Scope of the guarantee.** An image is not deleted while saved content references it — **for participating operations, within one backend process.** Both qualifiers matter.

*Participating* means the operation takes the [content-write section](languages.md#coordination-with-content-writes): media delete and bulk delete; page content/details save, create, duplicate, delete and language version; global widget save; menu create, update and duplicate; collection item create, update, duplicate, discard-archived, delete, bulk delete, reorder and language version; theme settings; site identity; and language add and remove. Link enrichment and the structural flows (project create, duplicate, import, theme update) do **not** participate. Each copies content that already exists in the project, so the reference it introduces is normally also held by the source a verification scan reads — a reason to expect no harm, not a proof of exclusion.

*Within one backend process* is **not** softened by verification reading shared storage. Two processes against one project can both scan concurrently and both conclude a file is unused, and one can write a reference between the other's scan and its delete. Re-reading shared content orders nothing; only the section does, and the section is in-process. **Cross-process deletion safety is not established here.** An embedding host running more than one backend process against a project must coordinate in the database and should not treat this as cover.

**The restart case.** Deleted paths are held in memory for the process lifetime, without time or count eviction. Elapsed time does not prove a pending edit is gone, and a future memory bound must refuse unverifiable writes rather than silently discard protection.

The record is not shared between processes and is lost on restart. In-flight and queued requests end with the process, but an editor can retain pending work across a backend restart. Saving it afterwards may introduce a reference to an image deleted before that restart. Missing references from that case remain a tolerated content state; restart does not provide draft recovery.

These limits are accepted for the OSS desktop and web shells, which run a single backend process.

Single deletion checks ownership/existence. It removes the original and generated assets, then deletes the database record and dependent metadata. Bulk deletion verifies the whole batch in one scan and reports per-file outcomes, including files still in use. Neither workflow should treat removing one language's usage as evidence that the file is unused in the whole project.

Implementation: [contentCoordination](../../../packages/builder-server/src/services/contentCoordination.js). Tests: [mediaDeletionSafety](../../../packages/builder-server/src/tests/mediaDeletionSafety.test.js), [languageLifecycle](../../../packages/builder-server/src/tests/languageLifecycle.test.js).

## Serve and browse

List/filter/select are library/session reads. Serving resolves the project/file, validates paths, and uses the asset adapter; range requests support media seeking. These are distinct from exporting/copying the underlying file into a generated site.

Implementation: [mediaController](../../../packages/builder-server/src/controllers/mediaController.js), [mediaUsageService](../../../packages/builder-server/src/services/mediaUsageService.js), [media routes](../../../packages/builder-server/src/routes/media.js), [mediaRepository](../../../packages/builder-server/src/db/repositories/mediaRepository.js).

Tests: [media](../../../packages/builder-server/src/tests/media.test.js), [mediaUsage](../../../packages/builder-server/src/tests/mediaUsage.test.js), [collectionMediaUsage](../../../packages/builder-server/src/tests/collectionMediaUsage.test.js), [richtextMedia](../../../packages/builder-server/src/tests/richtextMedia.test.js), [upload filter](../../../packages/builder-server/src/tests/mediaUploadFilter.test.js), [MediaDrawerLanguages](../../../packages/editor-ui/src/components/media/__tests__/MediaDrawerLanguages.test.jsx).
