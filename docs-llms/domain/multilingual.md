# Multilingual rules

[Map](README.md) · [Language operations](operations/languages.md) · [Coverage](coverage.md)

## Plain-language guide

### One website, several independently written versions

Adding a language gives you a place to write that language's content. It does not automatically translate every page or make a second copy of the whole project.

Imagine a café website with English and Greek content. Its English About page and Greek About page belong together, but you can give them different wording, photographs, section arrangements and addresses. A change to one does not automatically change the other.

### What do you maintain separately?

| Part of the website | What this means for you |
| --- | --- |
| Pages and articles | Create the language versions you need and edit each separately. Not every page needs every language immediately. |
| Widgets and blocks | They are part of that page version. Greek can have three testimonials while English has five. |
| Header, footer and menus | Each language has its own. Adding a language starts these from copies; translate their labels and check their destinations. |
| Photos and uploaded documents | One shared library. Reuse the same file or choose another where needed. |
| Image descriptions | Can be written for each language without uploading the image again. |
| Theme appearance and shared business details | Apply across languages, rather than being separately translated page content. |

### Three different meanings of “switch language”

Changing **Widgetizer's interface language** changes the app's buttons and labels.

Opening **another editing language version** takes you to a different page or entry. Save pending work before leaving if you want to keep it.

Using a **visitor-facing language selector** depends on the theme. Current rendering support offers the related page when it exists, or that language's homepage when it does not. Languages without a homepage are omitted from those destinations. This is navigation help, not automatic translation.

Arch 0.9.10 offers a header language-selector setting, using `page.translations` in desktop and mobile navigation. Existing projects receive the updated template through a theme update.

### What happens when a translation is missing?

A missing page version is not silently created. You can deliberately create it later. An ordinary button that points to the English Contact page keeps that destination until you choose something else; it does not automatically become a Greek Contact link.

Image descriptions follow a different rule: an untranslated field can inherit its default-language description. A deliberately blank translation stays blank. This lets you distinguish “use the English description for now” from “this image should have no description here.”

### Adding and removing are real changes

Adding a language and creating a version are saved actions. Editing the copied content afterward follows the normal page or form save process.

Removing a language deletes its authored content and translated image descriptions. It keeps the shared uploaded files and the other languages. Adding that language again does not restore the translations you removed.

### Example

Add Greek, create Greek Home and About, and translate the Greek menu. Reuse the café photographs, giving them Greek descriptions where needed. Later, add a news article only in English. The site can contain this mix while you decide which additional versions to write.

Export requires the default homepage and includes additional languages only when they have a homepage of their own. A skipped language is named in the result; its editable content is kept. An included Greek news list shows only Greek articles, even when the English list has more. Translated forms have separate exported identities. See [output rules](operations/output.md#multilingual-boundary-at-this-snapshot).

## Technical details

The main distinction is **independent documents versus shared resources**. Language support does not multiply every entity or introduce a translation wrapper around every setting.

## What changes by language?

| Object | Shared | Language-specific |
| --- | --- | --- |
| Project | Identity, site URL/title, business identity, update settings | Default/additional language configuration |
| Page versions | Translation-group relationship | UUID, slug, SEO, settings, widget/block structure and order |
| Header/footer | Widget definitions | Complete content instance for each language |
| Menu | Definition of menu behavior | Entire tree and menu identity; no translation-group linkage |
| Collection | Schema, item template and URL prefix | Item records, SEO and manual order |
| Theme | Layout, widget definitions/assets, theme settings | Authored content in page/global/item documents |
| Media | File identity, binary, renditions | Optional alt/title/caption overrides |
| Editor | UI infrastructure | Selected editing language; separate from UI locale |

## Addresses and identity

Example: default language `en`, additional language `el`.

| Content | English storage | Greek storage |
| --- | --- | --- |
| Page | `pages/about.json` | `pages/el/sxetika.json` |
| Header | `pages/global/header.json` | `pages/el/global/header.json` |
| Menu | `menus/main.json` | `menus/el/main.json` |
| Item | `collections/news/story.json` | `collections/news/el/istoria.json` |
| Item order | `collections/news/_order.json` | `collections/news/el/_order.json` |

Storage and public output use different segment orders for collections: an item's additional-language output address is `el/news/istoria.html`. The shared address builders define storage keys, output paths, usage IDs, and preview routes. Clean URLs changes emitted hrefs, not the underlying editable documents.

A slug identifies content within a language (and collection type for items); a UUID identifies a document version. A translation-group ID identifies the relationship between versions. A page's slug may change while its UUID and group stay stable.

## Fallback is specific to the kind of data

| Situation | Current rule |
| --- | --- |
| No language supplied to a content API | Uses the project's default language |
| Unknown language supplied | Request rejected; does not create an arbitrary content folder |
| No page/item version exists | No implicit stored version; authors explicitly create it |
| Collection has no items in the rendered language | Listing is empty; does not borrow default-language items |
| Additional enabled language has no homepage | Entire language is skipped in export and reported; default homepage absence instead fails export |
| Missing global-widget content in requested language | API returns `null`; no automatic default-language clone on read |
| Missing translated media field or `null` | Inherits that field's default-language metadata |
| Translated media field is `""` | Deliberately blank; must not fall back |
| Explicit link to an English page from Greek content | Resolves that English target; group membership is not an automatic retargeting instruction |
| Menu selected by bare slug | Resolves in rendering language; explicit UUID can select a menu from another language |
| Theme language-switch destination with no sibling | Current `buildTranslations` uses the language's homepage and marks it as fallback; languages without a homepage are omitted |

Do not generalize media metadata fallback into a whole-site fallback policy. [buildTranslations](../../packages/core/src/utils/translations.js) supplies the current theme language-switch contract. Homepage fallbacks are excluded from ordinary language alternates; the special `x-default` destination may use the default homepage, unless that homepage is itself `noindex`. [Export rules](operations/output.md#multilingual-boundary-at-this-snapshot) explain the sitemap, canonical and form behavior.

## Rendered language destinations

`page.translations` is derived rendering data, not another saved translation-group record. Ordinary pages and generated item pages receive the destinations for their own group. The theme draws the visitor control; the SEO builders reuse the destination data for alternates.

| Field | Meaning |
| --- | --- |
| `language` / `hreflang` | Content language code and its search-metadata spelling |
| `label` | Native language name for a visitor-facing label |
| `href` | Link adjusted for the current output depth and Clean URLs |
| `seoUrl` | Absolute published address for search metadata; empty without a usable Site URL |
| `active` | Whether this is the rendered content's language |
| `fallback` | Whether the destination is a homepage because no sibling exists |
| `noindex` | Whether the destination asked not to be indexed. Read from the destination itself — the sibling, or for a fallback entry the homepage it points at. The SEO builders drop these entries, `x-default` included; the visitor-facing switcher ignores the flag |
| `dir` | Language text direction |

What `buildTranslations` reads off a sibling is defined once, as `translationSibling`. The SEO builders hold whole page and item records while a render holds the uuid reference map, and both are narrowed through that projection before anything is read. Both paths now use one definition of the sibling fields, preventing the missing-field mismatch found in the R7 review.

Additional languages without homepages are omitted. The default destination assumes the required root homepage; export fails when that homepage is missing. For a listing's generated copies, language destinations point to the related base page or homepage, not the same page number in another language: the two lists may have different lengths. This describes the current [builder](../../packages/core/src/utils/translations.js); final theme-contract documentation remains part of step 25.

## Lifecycle expectations

1. Create a project with one default language.
2. Add another language: seed its menus and globals, not every page/item.
3. Create a page/item version: copy content once, create a fresh UUID, join the same group, then edit independently.
4. Duplicate content: create unrelated content with a new group, even if the source has translations.
5. Remove a language: delete that partition and its usage/metadata overrides; retain shared assets and other versions.
6. Change the default code only while no additional languages exist. Root content stays in place and is relabeled.

## Behaviour evidence

The coverage map records evidence for default-only and multilingual projects, independent translation structures, missing siblings, cross-language links, inherited versus blank metadata, language removal and backup/copy identity rules. Evidence for one combination does not establish every other combination.

Source: [contentAddress](../../packages/core/src/utils/contentAddress.js), [contentLanguage](../../packages/builder-server/src/utils/contentLanguage.js), [translationService](../../packages/builder-server/src/services/translationService.js), [languageService](../../packages/builder-server/src/services/languageService.js), [metadata resolver](../../packages/core/src/utils/mediaMetadata.js), [renderEngine](../../packages/render-engine/src/renderEngine.js).

The [coverage map](coverage.md) distinguishes inspected assertions, focused test runs and suites merely located. The [output rules](operations/output.md#multilingual-boundary-at-this-snapshot) describe current rendering and export behaviour.
