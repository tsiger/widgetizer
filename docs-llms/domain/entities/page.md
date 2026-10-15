# Page

[Map](../README.md) · [Page operations](../operations/content.md#pages) · [Language versions](../operations/languages.md#create-a-language-version)

## Plain-language guide

### What is a page?

A page is a destination on your website, such as Home, About or Contact. It contains an ordered set of widgets and information such as its name, web address, search description and social-sharing image.

Its address name is often called a “slug”: for example, the “about” part of an About page address. The page's display name and its address serve different purposes.

### What can you do?

| Action | What happens |
| --- | --- |
| Create | Adds a page ready for you to build with widgets. |
| Edit | Changes its content, name, address or search/sharing details. |
| Choose a parent | Describes where it belongs in breadcrumb navigation; it does not move the page inside another page. |
| Duplicate | Creates a separate page with copied content and a new name/address. |
| Create another-language version | Starts a related page in another language using the existing content as a starting point. |
| Preview | Lets you inspect its appearance; save first when opening the separate preview window. |
| Delete | Removes that page version. Its translated counterparts remain. |

A collection listing can identify this page as the main destination for a collection. If a listing is split into several pages, Widgetizer generates the extra pages when building the website; you do not manually create each one.

### What is shared?

A page uses its language's shared header and footer. It may also use shared images, menus and theme appearance settings. Those resources do not belong exclusively to this page and remain after it is deleted.

When you choose another page through Widgetizer's link controls, the link can follow that page if its address changes. A web address typed as ordinary text may need updating manually. Renaming a page does not create a redirect for old bookmarks outside the app.

### Languages and saving

English About and Greek About are related but independently editable pages. Their text, section arrangement, address and sharing information can differ.

Page-editor changes are kept by Save or autosave. List actions such as creating or deleting a page take effect when that operation succeeds; they do not wait for a later editor Save. Existing exported files stay unchanged.

### Example

Create a Greek version of About, translate its text and remove a section that is unnecessary in Greek. The English page keeps that section, and both pages can still use the same photographs.

## Technical details

A page is a complete document in one project language. It owns its widget instances and their order, page settings, SEO data, and optional breadcrumb-parent reference.

| Property | Rule |
| --- | --- |
| `uuid` | Stable across normal edits and slug changes |
| `id` / `slug` | Address and filename; unique within a language |
| `translationGroupId` | Joins independent language versions |
| `widgets` / `widgetsOrder` | Instance map plus explicit display order |
| `parentPageUuid` | Reference to another page, not ownership; a self-reference is dropped on save and the save succeeds |
| `seo` | Version-specific metadata; can reference media |

The default path is `pages/<slug>.json`; an additional-language path is `pages/<code>/<slug>.json`. Slug `page` is reserved for pagination; enabled language codes are reserved as root-page slugs. `index` and `home` both make a page its language's homepage, published as `index.html`, so a language holds at most one of them: a new page gets the next free slug instead, and a rename onto the other one is refused. Export requires a default-language homepage and refuses a language holding both.

## What a page does not own

Header and footer are language-specific project singletons. Media files, menu objects, theme settings, and collection items are referenced or rendered by a page but survive deleting it. A collection item page is generated from an item/template and is not an ordinary stored page document.

## Listing and pagination

A collection-aware widget may mark this page as its collection's listing anchor, which also decides where that collection's items sit in [breadcrumbs](#breadcrumbs). Saving that claim clears competing anchors in the same language. Pagination implies the listing-anchor flag; only one widget per page may paginate, with a positive integer page size. Duplicating a page clears these flags; creating another-language version keeps them because it belongs to another language partition.

The listing and its valid-item count use this page's language. Pager links, generated copies and their sitemap addresses stay in that language; an English count cannot determine a Greek page's number of copies. Live widget preview updates receive the page language too. Copy *N* is published at `<slug>/page/N.html` (homepage: `page/N.html`, under `<language>/` for another language) and its title gets a ` - N` suffix; see [addresses](../multilingual.md#addresses-and-identity). See [collection behavior](collection.md#listings-and-multilingual-output) and [export eligibility](../operations/output.md#which-languages-are-included).

## Breadcrumbs

The trail comes only from `parentPageUuid`, never from menus or URLs. Walking up stops at the homepage, a cycle, a missing UUID or `MAX_DEPTH` (10). A parent that exists only in another language, with no sibling in the trail's language, ends the chain. A collection item hangs under its collection's listing-anchor page in the same language, else the anchor chosen in any language (via its sibling here), else the only page listing the collection; several listing pages and no anchor put it directly under Home. The homepage has no trail; a numbered copy ends with its number. Export warns about items whose listing parent is ambiguous or missing (see [structured data](../operations/output.md#structured-data-json-ld)), and the trail also feeds the `BreadcrumbList`. Core ships a `breadcrumbs.liquid` snippet that themes render. Source: [breadcrumbs](../../../packages/core/src/utils/breadcrumbs.js), [snippet](../../../packages/core/src/snippets/breadcrumbs.liquid).

## Failure and cleanup

Normal saves write content before synchronizing media usage; a usage failure can be logged without rejecting the save. Renaming writes the new file before removing the old one, and failure removing the old file is logged. Deletion attempts to scrub references throughout the project's content; it does not delete translation siblings or shared media.

Implementation: [pageController](../../../packages/builder-server/src/controllers/pageController.js), [linkEnrichment](../../../packages/builder-server/src/utils/linkEnrichment.js), [contentAddress](../../../packages/core/src/utils/contentAddress.js).

Tests: [pages](../../../packages/builder-server/src/tests/pages.test.js) includes UUID preservation, slug collisions, parent cleanup, listing/pagination rules, and language isolation; [translationGroups](../../../packages/builder-server/src/tests/translationGroups.test.js) covers versions. Full failure-path coverage is still [under review](../coverage.md).
