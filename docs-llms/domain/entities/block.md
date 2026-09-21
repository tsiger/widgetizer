# Block

[Map](../README.md) · [Widget](widget.md) · [Settings](settings.md) · [Editor operations](../operations/editing.md)

## Plain-language guide

### What is a block?

A block is an individual piece of content inside a widget. For example, a Testimonials widget might hold several customer reviews. Each review is a block with its own quote, customer name and photograph.

**Home page → Testimonials widget → Individual customer review**

The widget controls the overall section; each block supplies one part of it. A different widget might offer heading, text, image or button blocks. The theme or built-in widget definition decides which kinds are available, what you can change, their starting values and any maximum number of blocks. Some widgets arrive with example blocks already added.

### What can you do?

| Action | What happens |
| --- | --- |
| Add | Creates a block using the theme's starting values, at the end or the chosen insertion point. |
| Select | Opens its editing controls without changing the content. |
| Edit | Changes that block's content or available appearance settings in the editor preview. |
| Duplicate | Places an independent copy immediately after it, keeping its current content and selections. |
| Reorder | Moves it within its widget without changing its content. |
| Delete | Removes it from that widget; the other blocks remain. |
| Undo / redo | Reverses or reapplies supported editing changes through the page editor's history. |

When the widget reaches its block limit, adding or duplicating is prevented until there is room again.

### Where do changes appear?

A block on a page belongs to that page. A block in a shared header or footer affects the pages that use that header or footer. On a multilingual site, that shared content belongs to the corresponding language.

English and Greek page versions have their own blocks. Editing one does not translate or update the other, even if they originally looked identical.

### What happens to images and saving?

Duplicating a block keeps its image selection; it does not upload a second photograph. Deleting the block removes that use from the saved content when the change is saved. The photograph remains in the media library and may still be used elsewhere.

Blocks are saved with their page or shared header/footer through the editor's save process. They have no separate Save action. An editor preview can show unsaved changes; an already exported website stays unchanged until you export again and replace the deployed files.

### Example

You have three testimonials. Duplicate the second, replace the copied quote and name, select another photograph, move the new review first, and save. You now have four testimonials. The original review is unchanged.

## Technical details

A block is a child instance inside a page widget or a global widget. Its type must correspond to a block definition in that widget's schema. It is not a reusable global object and has no independent backend CRUD resource.

- The owner's `blocks` map holds `{ type, settings }` keyed by block ID.
- `blocksOrder` defines display order.
- Defaults come from the block schema, with default-block overrides where supplied.
- Add, duplicate, remove, reorder, and edit update the owning widget; save persists the page or global document.
- Duplication creates a new block ID. Removing a block does not delete its referenced media.
- Block count rules are schema-dependent. The shared limit helper and editor enforce adding/duplicating constraints; rendering also protects against over-limit content.

Block text, images, links, tables, and other settings follow the language scope of the containing page/global. There is no field-by-field synchronization with the corresponding block in another page version.

Implementation: [widgetStore](../../../packages/editor-ui/src/stores/widgetStore.js), [default/clone helpers](../../../packages/editor-ui/src/stores/widgetStoreHelpers.js), [blockLimits](../../../packages/core/src/utils/blockLimits.js).

Tests: [widgetStore](../../../packages/editor-ui/src/stores/__tests__/widgetStore.test.js), [blockLimits](../../../packages/core/src/utils/__tests__/blockLimits.test.js), [maxBlocks](../../../packages/builder-server/src/tests/maxBlocks.test.js).

Review: include page-owned and global-owned blocks when checking every setting type and media-reference cleanup; one does not prove coverage of the other.
