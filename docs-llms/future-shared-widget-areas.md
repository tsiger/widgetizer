# Shared widget areas — early concept

**Notes started 21 September 2026. Brainstorming only: not implemented, scheduled, or a finished design.** Expand this document as the idea develops. Requirements below describe intended behaviour, not capabilities the app already has.

## The idea

Let a theme author define named places in the website layout where the site owner can add and arrange widgets. The first examples are **After header** and **Before footer**. Other themes might offer an announcement area above the header or a sidebar.

The theme author creates, names and positions the areas. The website owner fills them with widgets. An area is an ordered group of widgets, not one new widget type.

Today, the header and footer are each a shared widget per language, while page content is a list of widgets belonging to one page. Custom shared areas would extend that model.

## Direction agreed so far

- **Areas are always shared.** Configure one area and its content appears on every page using that area in the layout. There is no page-only variant: existing page content serves that purpose.
- **Each language has its own area content.** English and Greek can have different words, images, widgets and ordering, following the existing shared header/footer model.
- **Use ordinary widgets.** Support the project's available theme and built-in widgets, their blocks and their settings. Avoid introducing a separate set of area-compatible widgets.
- **Integrate with the existing system.** Saving, preview, export, links, media, language handling and project operations must account for areas. Making widgets appear in another position is only part of the feature.
- **Internal links are explicitly in scope.** Renames, address changes, deletion and other existing reference-update rules must include shared areas in every language.

## Suggestions still to settle

- Keep the existing special header and footer working as they do today for the first version; custom areas would extend them rather than require a redesign.
- Empty areas should output no content. Any surrounding spacing or decoration should be intentional theme behaviour.
- Removing an area from a theme should stop displaying it without deleting its saved widgets. The owner should be able to recover them if the area returns.
- Allow collection widgets as shared lists, but keep the options that make a page the collection's main listing and generate numbered pages in ordinary page content. Those options currently need one owning page.
- Declaration format, layout placement syntax, storage and editor design are not decided. The earlier illustrative examples were proposals, not an authoring contract.

## Compatibility checklist

### 1. Placement and existing themes

The theme author controls where each area appears. Ordinary pages, collection item pages such as articles, and generated numbered pages should all display the areas used by their layout.

Existing themes and projects should keep working without declaring areas. An area name should be understandable to a site owner, and changing its displayed label should not disconnect its content.

### 2. Ownership and sharing

An area's saved content belongs to the website and language, not the page open when it was edited. Opening another page should show the same saved area. Deleting or duplicating a page must not delete or duplicate shared content.

Sharing content does not mean linking every instance of a widget type together. Two separate widgets in an area remain independently editable.

### 3. Widgets, blocks and settings

Support all ordinary widgets available to the project, including built-in widgets when the theme enables them. Preserve widget settings, starting content, appearance choices and interactive behaviour.

Blocks need their normal add, edit, duplicate, reorder and delete actions, including existing block limits. All setting types must work: text, rich text, images, files, links, menus, icons, colors, fonts, tables, code and other available controls. Conditional controls and translated starting values must work too.

Putting the existing special header or footer inside an area is not an agreed requirement.

### 4. Editing, copying and moving

Adding, selecting, duplicating, removing and rearranging widgets should feel like editing page content. Selecting something in the preview should open the correct widget or block in the correct area.

Copy and paste should work between page content and shared areas, producing independent copies with their contained blocks. Copies must not interfere with their originals when both appear on the same page.

If moving between page content and areas is offered, the editor must make the change in reach clear: a formerly page-only widget will now appear across the website. Moving the other way also needs an explicit, understandable result.

### 5. Editor presentation

Clearly distinguish shared areas from page content and identify the language being edited. Empty areas need an obvious way to add a first widget. Long areas should be manageable without overwhelming the page's widget list.

If the current layout does not display an area, explain why its content is not visible. Do not present retained content as lost or silently discard it.

### 6. Save, autosave and navigation

Area changes should participate in the existing Save and autosave experience. Editing only an area must mark work as unsaved and trigger the appropriate protection when leaving.

A save can involve several parts of the website. If one part fails after another succeeded, report what remains unsaved accurately. Continuing to edit during a save must preserve the newer changes for a subsequent save.

Switching page, language or project must not discard changes unexpectedly or save into the wrong place. Discard should follow the existing rules, including the fact that it cannot undo a save already stored.

### 7. Undo and redo

Include widget and block additions, edits, movement and removal in the normal editing history. Manual save and autosave should not erase the ability to undo. Undoing a saved area change creates a new unsaved change affecting that shared area.

Follow the current editing-history lifetime unless a different experience is deliberately chosen. A separate permanent history for areas is not part of the idea so far.

### 8. Language lifecycle

Each language owns its area content independently. Adding a language should prepare starting copies consistently with header/footer setup, including correct connections to copied menus. Copied words are not automatically translated, and later edits must not synchronize across languages.

Localized widget defaults, built-in visitor wording, dates and image descriptions should follow the language being viewed. Changing the default-language designation must handle areas under the existing language rules.

Removing a language must include its areas while preserving other languages and shared uploaded files. An editor left open in a removed language must not recreate deleted content through a late save. Missing language content must not silently become another language's authored area.

### 9. Awareness of the current page

Shared widgets still need to understand the page being viewed. Navigation highlights, breadcrumbs, visitor language switching and collection content should reflect the current page and language.

Reuse of shared content must not cause an article to display information calculated for a different page. Explicitly selected links should retain their existing meaning rather than being automatically replaced with translated destinations.

### 10. Internal links and reference cleanup

Apply the same link-maintenance rules as page content and existing shared sections. Cover widget settings, block settings and rich-text links in **every area and every language**, including retained areas no longer displayed by the theme.

- When a selected page or article is renamed or its address changes, its links continue to follow it.
- When a destination is deleted, apply the existing cleanup behaviour rather than leave a link to missing content.
- When a menu is deleted, clear affected menu selections using the existing rules.
- When a language is removed, include references affected by its removed content.
- When a project is copied or restored, preserve or reconnect references according to the existing operation's rules.

Links selected through Widgetizer and manually typed addresses remain different: manual addresses retain the existing manual-link behaviour. If cleanup only partly succeeds, preserve the current warning behaviour rather than claim everything was repaired.

### 11. Clean URLs and links from nested pages

Links, images and downloads must work from the homepage, normal pages, translated pages, articles and numbered listing pages. Clean URLs on or off must work consistently across those destinations.

Links to a particular section need care when widgets are copied between page content and shared areas. Widgets appearing together must not accidentally share an identity that makes links or controls target the wrong section.

### 12. Media usage

Images and files used only in an area must be recognized as in use. Show a useful location, such as “Before footer — Greek,” in usage information. Existing protection against deleting media still needed by saved content must include areas.

Removing a widget removes its saved use of an image or file; it does not delete the uploaded media itself. Export must include the necessary files and image sizes. Translated image descriptions should work as usual.

If removed theme areas retain recoverable content, decide how that content keeps its media protected so recovery does not bring back missing images.

### 13. Collections and numbered listings

Collection widgets should work as shared content, such as “Latest articles” or a services list. They should show entries in the current page's language and follow the existing rules for unavailable entries.

The main-listing and numbered-page options require a separate decision. Today they belong to a specific page, and copying widgets clears those roles. A widget displayed everywhere cannot silently become the main listing on every page. The current suggestion is to keep those page-specific options in page content while allowing the widget itself in shared areas.

### 14. Forms

Include forms from areas in the exported information required by compatible form-processing systems, not only in visible page content. A shared form appearing on many pages should remain one form within that language; translated forms follow the existing separate-language identity rules.

Check conflicts between shared-area forms and page forms, including matching names with incompatible fields. Copying a form must not bypass those rules. Decide how the exported form description records where a shared form appears.

Field behaviour, required values and visitor messages should work as usual. Shared areas do not add submission processing or a submissions inbox to the standalone app.

### 15. Preview and interactive widgets

Support live editor preview, separate saved-site preview, temporary preview links and exported pages. Preserve the distinction between unsaved editor content and saved content used elsewhere.

Slideshows, accordions, video controls and forms must keep working after live edits and with multiple widget instances. Selecting or changing one must not affect another accidentally.

Load required styles and scripts even when a widget appears only in an area. Shared libraries should still load once, with the existing enqueue and flat widget asset rules respected.

### 16. Export and generated information

Every included page using an area should receive its correct saved language content, including collection item pages and additional numbered pages. Languages omitted from an export must not contribute displayed areas or form definitions.

Use a consistent saved version of shared content throughout a build, so an edit during export does not leave different pages with different versions of the same announcement. Existing exports remain snapshots until a new export is produced.

Areas do not have independent website addresses and should not create extra sitemap entries. Search-engine titles, descriptions and language information still belong to the page. Check the treatment of repeated area content in optional Markdown output rather than letting it be accidental.

### 17. Appearance and accessibility

Preserve theme colors, fonts, spacing and behaviour at different screen sizes. Placement must account for existing features such as transparent headers: putting an area before the first hero may change the intended result.

Keyboard navigation, reading order, section links and heading structure should remain understandable. Empty areas should not create accidental gaps. The theme remains responsible for appropriate layout and surrounding decoration.

### 18. Theme starting content and updates

Allow themes and presets to supply initial area content when creating a project. Applying a theme update must preserve owner edits and must not refill an area the owner deliberately emptied.

New areas, renamed labels, changed widget definitions and removed areas all need predictable treatment across languages. Keep an area's lasting identity separate from its displayed name.

The proposed recovery rule is to retain content when a theme removes an area or widget definition, explain why it no longer appears, and allow recovery. Exact recovery controls and treatment of old retained content remain open.

### 19. Projects, backups and older content

Project duplication should include all areas in all languages and leave the copy independent of its source. Backup and restoration should preserve widgets, settings, blocks, order and related media, including any retained area content.

Older projects and backups without custom areas must continue to work. Project deletion should include area content in existing cleanup. Moving or renaming a project's storage folder must not disconnect areas.

### 20. Failures, limits and competing edits

Do not confuse unreadable or missing saved content with an intentional empty area and then overwrite it. Missing widget definitions should produce a useful explanation while preserving content.

Decide how existing widget limits apply to an area and the complete rendered page. Shared content must not accidentally bypass limits or be counted as separately stored content for every page where it appears. Preserve block limits and other existing content checks.

Two windows can edit the same area while displaying different pages. Agree how competing saves are detected or handled. Existing protection against saving into the wrong project is not, by itself, a solution to competing edits in the same project.

## Main questions for the next conversation

- How should areas appear in the editor, especially when empty or not shown by the current layout?
- Confirm whether collection main-listing and numbered-page options remain page-only.
- What happens when moving a widget between shared content and page content?
- How does the owner find and recover content from an area removed by a theme update?
- What should happen when two windows edit the same shared area?
- How do transparent headers interact with an area placed before the page's hero?
- How should limits and optional Markdown output treat shared content?

## Existing behaviour to build on

- [Header and footer](domain/entities/global-widget.md)
- [Widgets](domain/entities/widget.md) and [blocks](domain/entities/block.md)
- [Editing and saving](domain/operations/editing.md)
- [Language lifecycle](domain/operations/languages.md)
- [Preview and output](domain/operations/output.md)
- [Forms](domain/entities/form.md)
- [Widget authoring](theming-widgets.md)
- [Theme lifecycle](domain/operations/themes.md)
- [Project lifecycle](domain/operations/projects.md)
