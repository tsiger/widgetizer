# Settings and references

[Map](../README.md) · [Media](media.md) · [Multilingual rules](../multilingual.md)

## Plain-language guide

### What is a setting?

A setting is one control that lets you change content or appearance: a heading, button destination, photograph, color, date, menu choice or font, for example.

Settings belong to something. A heading inside one block is local to that block; a theme-wide font setting can affect the whole website. The place where you edit a setting tells you how widely it applies.

### What kinds are there?

| Kind | Everyday examples |
| --- | --- |
| Text | Short headings, longer descriptions, formatted paragraphs and button labels. |
| Appearance or choice | Color, spacing, font, size, an on/off option or a choice from a list. |
| Date or number | A publication date, price or quantity where the theme provides that field. |
| Image or file | A photograph, gallery or downloadable document selected from the media library. |
| Destination or menu | A page for a button to open, a web address, or a navigation menu to display. |
| Structured content | A table with editable rows and cells. |
| Specialized content | An icon, external video or custom code field where the theme supports it. |

The theme decides which controls appear and their starting values. A section heading in the settings panel may only organize the controls; it is not necessarily text visitors will see.

### What is a reference?

A reference is a selection of something that exists elsewhere. Selecting a photograph in a block does not move the photograph into the block. Selecting Contact as a button destination does not make Contact a child of the button.

This matters when deleting things: removing the button does not delete Contact, and clearing the image selection does not delete the photograph. Changing the selected target affects that use, while editing the target itself may affect every place that uses it.

### Languages and saving

Settings follow their owner. A Greek block's text belongs to the Greek version; shared theme colors apply across languages. Media descriptions have their own translated values.

Save through the page, item, project or settings form that contains the control. The page editor can autosave its changes; that does not mean every form in the app autosaves.

### Example

Two buttons point to Contact. Changing one button's label changes only that button. Editing the Contact page changes the destination both buttons open.

## Technical details

A setting definition supplies an ID, type, defaults, and editor constraints. A setting value belongs to its containing widget, block, collection item, or shared theme settings. The setting ID is local to that schema, not a globally unique content identity.

## Setting families

The canonical [setting-type list](../../../packages/core/src/config/settingTypes.js) currently includes:

| Family | Types | Relationships to remember |
| --- | --- | --- |
| Text/content | `text`, `textarea`, `richtext`, `code` | Richtext can embed media and stable links; code has a different trust/output contract |
| Primitive/design | `number`, `date`, `color`, `range`, `select`, `checkbox`, `radio`, `font_picker` | Validation/defaults vary by owner and type |
| Media | `image`, `gallery`, `file`, `youtube`, `icon` | Uploaded media is referenced, not owned; external video/icon values are not uploaded media records |
| Navigation | `link`, `menu` | Stable target IDs plus fallback/display data where supported |
| Structured content | `table` | Rows/cells live inside the setting, not as collection items |
| Presentation | `header` | Schema/editor grouping, not a content entity |

Detailed shapes belong in the existing [setting types reference](../../theming-setting-types.md).

## Reference rules

| Reference | Target and consequence |
| --- | --- |
| Page UUID in a link/menu/richtext | Resolves the current slug of that exact page version |
| Collection-item UUID | Resolves that exact item's current public address, when item pages exist |
| `parentPageUuid` | Breadcrumb relationship; does not contain or delete the referenced page |
| Menu UUID or legacy slug | Resolves a menu; explicit UUID can refer across languages, slug lookup is local to render language |
| Uploaded asset path | Connects content to a shared media record and generated sizes |
| Translation-group ID | Finds sibling versions; does not automatically replace every explicit link with a sibling |

Renaming a referenced object should preserve its stable identity. Deletion cleanup and render-time missing-target behavior are separate safeguards. Custom string URLs do not automatically acquire the same rename behavior as UUID-backed links.

## Output rules

Liquid autoescapes ordinary values. Richtext is sanitized before intentional raw output. Code fields are not sanitized as richtext; explicit raw/script/CSS sinks matter. Use the [security reference](../../core-security.md) for the complete trust model.

There is no universal translated-setting wrapper: page/block values vary because their owner is language-specific; theme settings remain shared. Media metadata is the explicit per-field override exception.

Implementation: [linkEnrichment](../../../packages/builder-server/src/utils/linkEnrichment.js), [menuResolver](../../../packages/render-engine/src/menuResolver.js), [richtextLinks](../../../packages/core/src/utils/richtextLinks.js), [sanitizationService](../../../packages/builder-server/src/services/sanitizationService.js).

Tests: [settingTypes](../../../packages/core/src/__tests__/settingTypes.test.js), [richtext links](../../../packages/core/src/utils/__tests__/richtextLinks.test.js), [sanitization](../../../packages/builder-server/src/tests/sanitization.test.js), [collection link resolution](../../../packages/builder-server/src/tests/collectionLinkResolution.test.js).
