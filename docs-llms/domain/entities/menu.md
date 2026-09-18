# Menu and menu item

[Map](../README.md) · [Content operations](../operations/content.md#menus) · [References](settings.md#reference-rules)

## Plain-language guide

### What is a menu?

A menu is a named set of navigation choices, such as Home, About, Services and Contact. A menu item is one choice in that set. Items can contain other items, such as several services grouped under Services.

A header, footer or another supported part of the theme can display a menu you select. Several places can display the same menu.

### What can you do?

| Action | What happens |
| --- | --- |
| Create | Starts an empty menu that you can fill with navigation choices. |
| Add or edit an item | Changes its visible label and destination. |
| Reorder or nest items | Changes the navigation arrangement without changing the destination pages. |
| Rename the menu | Changes how you identify it in the editor; existing selections can keep using it. |
| Duplicate | Makes a separate menu with the same starting choices. Editing the copy does not edit the original. |
| Delete | Removes the menu; it does not delete any page or collection entry it pointed to. |

A menu item's label can differ from its destination's page name. “Get in touch” can point to a page named Contact.

### What else changes?

Editing a menu affects every place that displays that menu once saved. Deleting a page can leave a menu item without a destination; the app's cleanup removes supported links to the deleted content. Deleting the menu itself leaves places that selected it without that menu to display.

### Languages and saving

Each language has its own menus. When you add a language, its starting menus copy the default language's choices. Their labels and destinations still need checking: they initially point to the same pages as the original, not to translations that may not yet exist.

A menu is not automatically kept in step with its counterparts in other languages. Save your menu edits through the menu form; changing a header's menu selection is saved through the header's editing flow.

### Example

Copy an English menu when adding Greek, translate “About” to its Greek label, then choose the Greek About page as its destination. The English menu keeps its original label and destination.

## Technical details

A menu is an independently stored navigation tree in one project language. Widgets or collection settings select it by reference. A menu item belongs to that tree and may contain child items; it does not own the page or collection item it links to.

| Identity/data | Behavior |
| --- | --- |
| Menu `uuid` | Stable reference used by settings |
| Menu `id` | Stable filename identifier; changing the name does not rename it |
| Menu item `id` | Tree/editor identity; regenerated during ordinary menu duplication |
| `items` | Nested nodes with label, link, optional stable page/item target, and children |
| Storage | `menus/<id>.json` or `menus/<code>/<id>.json` |

Menus have no translation-group relationship. Adding a language copies root menus with fresh menu UUIDs; the copied items initially retain their original page/item targets. The new language's globals are rewired to those menu copies. Translating a page later does not imply that all copied menu links are automatically retargeted.

Updates sanitize labels and links and bound the tree before recursive processing. Labels must be nonempty. The node count uses the applicable limit; nesting has a shared hard cap. Ordinary duplication copies the tree with fresh menu/item identities. Deleting a menu removes its file; it does not recursively delete linked content. Rendering a missing menu yields an empty menu object.

Implementation: [menuController](../../../packages/builder-server/src/controllers/menuController.js), [languageService](../../../packages/builder-server/src/services/languageService.js), [menuResolver](../../../packages/render-engine/src/menuResolver.js).

Tests: [menus](../../../packages/builder-server/src/tests/menus.test.js), [languageService](../../../packages/builder-server/src/tests/languageService.test.js), [menuResolver](../../../packages/render-engine/src/menuResolver.test.js), [menu active state](../../../packages/builder-server/src/tests/menuActiveState.test.js).

Review: distinguish deleting the menu itself, deleting one of its target pages/items, and deleting its whole language. Those use different cleanup paths.
