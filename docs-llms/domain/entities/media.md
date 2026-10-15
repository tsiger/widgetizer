# Media, renditions, metadata, and usage

[Map](../README.md) · [Media operations](../operations/media.md) · [Metadata fallback](../multilingual.md#fallback-is-specific-to-the-kind-of-data)

## Plain-language guide

### What is media?

The media library holds a project's uploaded images and files. The same photograph can be selected in several pages, blocks or languages without uploading it repeatedly.

A media item includes the uploaded file, information about it and, for supported images, smaller versions generated for website use.

### What do the related terms mean?

| Term | Meaning |
| --- | --- |
| Original file | The uploaded image or document stored for the project. |
| Generated size or rendition | A version of the same image sized for a different use; it is not another library item to manage separately. |
| Metadata | Descriptions such as alternative text, title and image caption. Alternative text describes an image for people who cannot see it. |
| Usage | The places in saved project content that refer to the file. |
| Translated metadata | Language-specific descriptions for the same file. |

### What can you do?

Upload files, browse or filter the library, select a file for content, edit descriptions, inspect where it is used, refresh the usage information, and delete files that are no longer in use. Uploading alone does not place a file on a page.

Changing a block's selected image affects that block. Changing a file's description can affect all places that use that description. Removing a block does not remove the uploaded file.

### How do languages work?

The library is shared by all languages. An English page and a Greek page can select the same photo while using different descriptions. They can also choose different photos.

For translated descriptions, “inherit” uses the default language's value. A deliberately empty value stays empty. This matters for decorative images where alternative text is intentionally blank.

### Saving and deletion

File uploads and metadata updates are their own saved actions. Selecting a file inside a page still needs that page's changes to be saved. Recorded usage is updated from saved content; it cannot account for every unsaved selection in an open editor.

The app refuses deletion while a file is recorded as in use. Deleting an unused image also removes its generated sizes. Removing one language does not remove shared uploaded files.

### Example

One logo is used in the English header, Greek header and business details. Removing it from the English header and saving does not make it unused: the other two uses still need it.

## Technical details

A media file belongs to one project and can be referenced many times, across languages and owners. Deleting a referencing block or page does not delete the file.

| Part | Ownership / persistence |
| --- | --- |
| Media record | Project-scoped SQLite row with file ID, filename, MIME/type, dimensions and related metadata |
| Original binary | Asset storage key under the project's uploads |
| Renditions | Generated image sizes belonging to the same media file; not independent library items |
| Base metadata | Shared/default-language `alt`, `title`, `caption` |
| Translated metadata | Overrides keyed by file and language; nullable fields inherit |
| Usage rows | Derived references from source content to the media file |

## Who can use a file?

| Source | Examples | Usage identity |
| --- | --- | --- |
| Page | Widget/block image, gallery, file link, richtext image, page SEO image | `page:<page UUID>` |
| Collection item | Settings, richtext, SEO | `collection:<item UUID>` |
| Global widget | Header/footer settings and blocks | `global:root:header`, `global:el:footer`, etc. |
| Theme settings | Favicon and media-backed settings | `global:theme-settings` |
| Site identity | Business/person logo | `global:site-identity` |

Legacy documents without UUIDs have qualified fallback identities until migration/rescan. Usage belongs to the **containing document**, not an individual block, so removing one reference must retain the source's usage if another reference in that document remains.

## Language and deletion rules

The library and binaries are shared. A translated image setting may choose a different file, but creating a language does not clone the media library. Metadata resolves field by field: absent/`null` inherits the base; `""` deliberately stays empty. Captions are image-only in the metadata API.

Deleting media is refused while the file is in use, and "in use" is not read from the recorded `usedIn` list alone: deletion re-derives usage from content first and refuses unless both agree the file is unused. It also refuses outright when any content could not be read, rather than counting an unreadable page as one that references nothing. On an allowed delete, the original and generated assets are removed before the database record.

`usedIn` is therefore best-effort *labelling*, not the safety mechanism. A save whose usage sync failed still succeeds (the content is saved) and returns a `MEDIA_USAGE_STALE` warning, so the library can show a file as unused while a page already uses it. The label is corrected by a usage refresh; deletion never depended on it. The deletion guarantee is scoped to participating operations within one backend process — see [delete or bulk delete](../operations/media.md#delete-or-bulk-delete) for which operations those are, and for what is not covered.

Implementation: [mediaController](../../../packages/builder-server/src/controllers/mediaController.js), [mediaRepository](../../../packages/builder-server/src/db/repositories/mediaRepository.js), [mediaUsageService](../../../packages/builder-server/src/services/mediaUsageService.js), [metadata resolution](../../../packages/core/src/utils/mediaMetadata.js).

Tests: [media](../../../packages/builder-server/src/tests/media.test.js), [mediaUsage](../../../packages/builder-server/src/tests/mediaUsage.test.js), [deletion safety](../../../packages/builder-server/src/tests/mediaDeletionSafety.test.js), [collection media](../../../packages/builder-server/src/tests/collectionMediaUsage.test.js), [upload atomicity](../../../packages/builder-server/src/tests/mediaInsertAtomicity.test.js), [image language output](../../../packages/core/src/tags/__tests__/imageTagLanguages.test.js).
