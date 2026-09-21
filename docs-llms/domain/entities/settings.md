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

## Localized defaults and dates

A widget/block setting may declare `defaultKey: "site.common.next"`. The renderer resolves that dictionary key in the page language, then applies explicitly stored settings on top (including a stored empty string). The core form preserves explicit empty notes/placeholders; clearing the note removes its whole line. The submit label deliberately falls back on blank so the button retains an accessible name. See [form behavior](form.md#languages-and-current-boundaries). The catalog accepts the editing language and returns `resolvedDefault` for the control to display. With `defaultKey` alone, creating widgets/blocks leaves the value absent until the owner writes it. With both `defaultKey` and a literal `default`, the editor instead stores the resolved initial value. Form field labels/options use this second mode because their saved text determines submitted keys/values. Starter blocks can supply per-setting `defaultKeys`, returned as `resolvedDefaults` and applied over their literal starting settings. Existing explicitly stored English copy remains authored content and still needs translation.

Widget-schema loading is language-aware and guarded by a request generation, so an older language response cannot replace the newer catalog. These defaults are implemented for widget/block settings; they do not introduce a universal translated wrapper for theme settings or collection fields.

The date filter passes the page language to `formatDateOnly`. Month names use locale-aware `Intl` formatting, including contextual forms, while day/year order and separators keep the chosen token. Date-only values remain timezone-safe; numeric formats do not change. The editor's caller still uses English by default. Evidence: [siteStrings](../../../packages/builder-server/src/tests/siteStrings.test.js), [widgetStore](../../../packages/editor-ui/src/stores/__tests__/widgetStore.test.js), [dateFormat](../../../packages/core/src/utils/__tests__/dateFormat.test.js).

## Reference rules

| Reference | Target and consequence |
| --- | --- |
| Page UUID in a link/menu/richtext | Resolves the current slug of that exact page version |
| Collection-item UUID | Resolves that exact item's current public address, when item pages exist |
| `parentPageUuid` | Breadcrumb relationship; does not contain or delete the referenced page |
| Menu UUID or legacy slug | Resolves a menu; explicit UUID can refer across languages, slug lookup is local to render language |
| Uploaded asset path | Connects content to a shared media record and generated sizes |
| Theme-generated slug via `page_url` / `item_url` | Uses the rendered language by default; an explicit `lang:` selects another language. Respects render depth/Clean URLs, but does not verify target existence or choose a translation sibling |
| Translation-group ID | Finds sibling versions; does not automatically replace every explicit link with a sibling |

Renaming a referenced object should preserve its stable identity. Deletion cleanup and render-time missing-target behavior are separate safeguards. Custom string URLs do not automatically acquire the same rename behavior as UUID-backed links.

## Reference traversal boundaries

Theme-wide `link`, `menu` and `richtext` settings use declared-type handlers during seeding, duplication and deletion, and resolve at render. Both stored values and schema defaults are transformed where applicable. Ordinary text is not inferred to be a reference. Theme richtext uses the same internal-link picker and sanitizer-preserved reference attributes as widget richtext.

Current reference transformers visit setting values and block settings, not arbitrary nested structures inside a value. Media collection does recurse into arrays/objects. The current table setting has text-only cells, so it does not create nested managed links.

Widget menu cleanup matches a selected UUID by equality rather than loading every widget schema; unrelated bare UUID values are not a supported ambiguous reference shape. Custom typed URLs remain authored, including under Clean URLs; themes can use `page_url` and `item_url` for maintained address construction.

## Output rules

Liquid autoescapes ordinary values. Richtext is sanitized before intentional raw output. Code fields are not sanitized as richtext; explicit raw/script/CSS sinks matter. Use the [security reference](../../core-security.md) for the complete trust model.

There is no universal translated-setting wrapper: page/block values vary because their owner is language-specific; theme settings remain shared. Media metadata is the explicit per-field override exception.

Implementation: [linkEnrichment](../../../packages/builder-server/src/utils/linkEnrichment.js), [menuResolver](../../../packages/render-engine/src/menuResolver.js), [richtextLinks](../../../packages/core/src/utils/richtextLinks.js), [sanitizationService](../../../packages/builder-server/src/services/sanitizationService.js).

Tests: [settingTypes](../../../packages/core/src/__tests__/settingTypes.test.js), [richtext links](../../../packages/core/src/utils/__tests__/richtextLinks.test.js), [sanitization](../../../packages/builder-server/src/tests/sanitization.test.js), [collection link resolution](../../../packages/builder-server/src/tests/collectionLinkResolution.test.js).
