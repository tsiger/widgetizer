# Header and footer

[Map](../README.md) · [Menus](menu.md) · [Language lifecycle](../operations/languages.md)

## Plain-language guide

### What are the header and footer?

The header is the shared section at the top of pages, often containing a logo and navigation. The footer is the shared section at the bottom, often containing contact information and extra links.

You may edit them while looking at one page, but they belong to the website's shared content for that language. They can contain their own settings and blocks.

### What can you do?

You can select the header or footer, change its available content and appearance controls, choose a menu or image, and add or arrange blocks where the theme allows it. The theme defines which controls are available.

These shared sections are not ordinary page widgets that you duplicate to make another header on the same page.

### How far do changes reach?

Saving a footer change affects every page using that footer. Deleting the About page does not delete the footer. Selecting a different menu in the header changes which menu it shows; editing that menu changes its entries wherever that menu is used.

On a multilingual site, English pages and Greek pages have separate headers and footers. Adding Greek begins with copies of the default language's shared content and menus. You then edit the Greek copies yourself; their words are not automatically translated.

### When are changes saved?

The page editor's save action includes changed shared sections. A shared-section change can therefore matter beyond the page currently visible. Previewing the page alone does not save the header or footer, and previously exported files do not update themselves.

### Example

You change the Greek footer's opening hours and save. Greek pages using that footer now use the revised hours. The English footer stays as it was. The English and Greek versions can still display the same logo image.

## Technical details

Header and footer are project singletons **per language**, each with widget settings and optional blocks. They are shared by pages rendered in that language, rather than owned by whichever page is currently open in the editor.

| Concern | Current behavior |
| --- | --- |
| Identity | Slot `header` or `footer`, qualified by project and language |
| Default storage | `pages/global/header.json`, `pages/global/footer.json` |
| Additional-language storage | `pages/<code>/global/header.json`, `pages/<code>/global/footer.json` |
| Definition | Installed theme's global widget schemas/templates |
| Save | Separate endpoint and file from page save |
| Missing/corrupt API content | Returned as `null`; not silently copied from the default language |
| Media usage | Separate source such as `global:root:header` or `global:el:header` |

Adding a language copies default globals after copying menus. Schema-declared menu settings, including block menu settings, are rewritten to the copied menu UUIDs. Other inherited references remain as copied.

The editor can save page, header, and footer changes in the same user action, but those requests are separate writes. A failure in one does not roll back another. Deleting a page does not delete its language's header/footer.

Implementation: [previewController](../../../packages/builder-server/src/controllers/previewController.js) (`getGlobalWidgets`, `saveGlobalWidget`), [languageService](../../../packages/builder-server/src/services/languageService.js), [saveStore](../../../packages/editor-ui/src/stores/saveStore.js).

Tests: [preview](../../../packages/builder-server/src/tests/preview.test.js), [languageService](../../../packages/builder-server/src/tests/languageService.test.js), [mediaUsage](../../../packages/builder-server/src/tests/mediaUsage.test.js), [saveStore](../../../packages/editor-ui/src/stores/__tests__/saveStore.test.js).
