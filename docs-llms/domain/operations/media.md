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

The app blocks deletion when a file is recorded as in use. To remove a used photograph, first replace or remove its uses and save those content changes. Other languages or shared settings may still use it.

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

Usage is derived state. Several content paths deliberately warn rather than fail when syncing it. Review how the UI communicates/repairs this before using “unused” as an absolute statement about all current content.

## Delete or bulk delete

Single deletion checks ownership/existence and refuses a nonempty usage list. It removes the original and generated assets, then deletes the database record and dependent metadata. Bulk deletion reports per-file outcomes, including files still in use. Neither workflow should treat removing one language's usage as evidence that the file is unused in the whole project.

## Serve and browse

List/filter/select are library/session reads. Serving resolves the project/file, validates paths, and uses the asset adapter; range requests support media seeking. These are distinct from exporting/copying the underlying file into a generated site.

Implementation: [mediaController](../../../packages/builder-server/src/controllers/mediaController.js), [mediaUsageService](../../../packages/builder-server/src/services/mediaUsageService.js), [media routes](../../../packages/builder-server/src/routes/media.js), [mediaRepository](../../../packages/builder-server/src/db/repositories/mediaRepository.js).

Tests: [media](../../../packages/builder-server/src/tests/media.test.js), [mediaUsage](../../../packages/builder-server/src/tests/mediaUsage.test.js), [collectionMediaUsage](../../../packages/builder-server/src/tests/collectionMediaUsage.test.js), [richtextMedia](../../../packages/builder-server/src/tests/richtextMedia.test.js), [upload filter](../../../packages/builder-server/src/tests/mediaUploadFilter.test.js), [MediaDrawerLanguages](../../../packages/editor-ui/src/components/media/__tests__/MediaDrawerLanguages.test.jsx).
