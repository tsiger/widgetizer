# Widget

[Map](../README.md) · [Blocks](block.md) · [Editor operations](../operations/editing.md)

## Plain-language guide

### What is a widget?

A widget is a section you place on a page: for example, a hero, a gallery, a contact form or a testimonials section. A page is built by arranging these sections.

**Home page → Testimonials widget → Review blocks**

A widget offers controls for its own content and appearance. Some widgets also contain blocks, letting you add or rearrange pieces within the section. The theme supplies its widgets and controls; Widgetizer also supplies [three built-in widgets](core-widget.md), unless the theme opts out. [Forms](form.md) have additional identity and export rules.

### What can you do?

| Action | What happens |
| --- | --- |
| Add | Inserts a section with its starting settings and any example blocks. |
| Select and edit | Opens its controls and lets you change that section. |
| Duplicate | Adds an independent copy after the original, including its blocks. |
| Copy and paste | Keeps a temporary copy you can insert into another place or page in the current project. |
| Reorder | Moves the entire section, including its blocks. |
| Delete | Removes the section and its contained blocks from the page. |
| Undo / redo | Reverses or reapplies supported changes during page editing. |

A copied collection listing does not automatically take over as the collection's main listing or keep automatic page splitting enabled. Those choices need to be made deliberately.

### What else changes?

Editing a normal widget affects its page version. It does not alter every widget of that kind. Its photographs, linked pages and selected menu are separate things: deleting the widget does not delete them.

Header and footer are special shared sections, explained on their own page. Their changes can affect many pages.

### Languages and saving

Each language version of a page has its own widgets. You can use a shorter Greek page, for example, without shortening the English one. Creating a language version copies the starting content once; the two versions then develop independently.

A collection-listing widget shows that page's language entries, with no automatic borrowing from English when Greek entries are missing. A contact form in another language has its own exported identity, even if both versions keep the same form name. See [output rules](../operations/output.md#multilingual-boundary-at-this-snapshot).

Changes appear in the editor before they are saved. Save the page to keep them; build a new export to include them in the generated website. Copying a widget alone does not save or change a page.

### Example

Duplicate a promotional section, change its heading and image, and move it below the contact form. After saving, the page contains two independent sections that may still share some selected images.

## Technical details

A widget instance belongs to a page version. Its `type` selects a widget definition supplied by the theme or core library. The definition is shared; the instance's content is owned by its page.

| Instance data | Meaning |
| --- | --- |
| Entry key such as `widget_<uuid>` | Identity within the page's widget map/order |
| `type` | Schema and Liquid template to use |
| `settings` | Values for that instance |
| `blocks` and `blocksOrder` | Child instances and their display order |

Adding a widget builds settings/default blocks from its schema. A localized `defaultKey` alone stays a runtime suggestion; paired with a literal `default`, it seeds a stored localized value. Starter blocks can use `defaultKeys` for their own initial wording; see [settings defaults](settings.md#localized-defaults-and-dates). Duplicating or pasting a widget generates a new widget ID and new block IDs, inserts it into the order, and clears listing/pagination flags. Copying places a snapshot in editor memory; persistence happens when the containing page is saved.

A widget has no independent language or translation-group record. Creating a page version initially copies the widget content, after which the versions can diverge in content and structure. Copying an entire page can retain its child IDs because those children live in a different page document; that differs from duplicating a widget within a page.

Global widgets use the same settings/block concepts but different ownership and persistence: see [header and footer](global-widget.md).

Implementation: [widgetStore](../../../packages/editor-ui/src/stores/widgetStore.js), [widgetStoreHelpers](../../../packages/editor-ui/src/stores/widgetStoreHelpers.js), [renderEngine](../../../packages/render-engine/src/renderEngine.js).

Tests: [widgetStore](../../../packages/editor-ui/src/stores/__tests__/widgetStore.test.js), [helpers](../../../packages/editor-ui/src/stores/__tests__/widgetStoreHelpers.test.js), [widgets](../../../packages/builder-server/src/tests/widgets.test.js), [coreWidgets](../../../packages/builder-server/src/tests/coreWidgets.test.js).
