# Build, copy, translate, and export a form

[Map](../README.md) · [Form entity](../entities/form.md) · [Editor saves](editing.md) · [Output](output.md)

## Plain-language guide

1. Add the built-in Form widget to a page, when the theme enables built-in widgets.
2. Give it a name describing its purpose. Edit the heading, button label and fields; add choices, consent or sidebar content as needed.
3. Save the page. Field edits use the page editor's Save/autosave, not a separate form record.
4. To repeat the same form elsewhere, copy/paste it and keep its field definitions compatible. To collect something different, use a different form name.
5. For another language, create/edit the page version and translate the form content. It receives its own exported identity. New display defaults follow the page's language; copied authored field labels remain yours to translate. The required-fields note is localized too; clearing it removes the whole line. A cleared choice placeholder stays empty, while a cleared submit label retains a translated fallback.
6. Export. If form validation reports conflicts or invalid fields, correct the named form/labels and export again.
7. Deploy the output to a platform that handles the generated submission address, then verify actual submission there. A preview or successful export alone does not test delivery.

Removing the widget takes effect in saved content after Save, and in visitor output after a new deployment. It does not erase answers held by a serving platform.

## Technical details

| Operation | Identity/content effect | Failure or retry boundary |
| --- | --- | --- |
| Add/edit/reorder fields | New labels/options are resolved in the editing language and stored; display-only defaults stay runtime suggestions until edited | Unsaved work follows ordinary discard and save rules |
| Duplicate/paste | New widget/block IDs, same copied form name and labels | Can still share the source's exported form key; field drift under that key fails export |
| Rename form/field/option | Changes the derived identifier/value when its handle changes | No migration of externally stored submissions is performed |
| Create language version | New page UUID/group member; copied form content | Additional language qualifies the form key; only exportable languages enter the manifest |
| Export | Generates form HTML and optional `widgetizer.forms.json` from saved included pages | Collects configuration errors and fails the build; fixing and rebuilding regenerates definitions |
| Delete widget/page/language | Removes the relevant authored content via its owner's operation | Does not delete prior bundles or external submissions |

There is no additional forms CRUD or submissions route to add to the [API inventory](api-index.md). The authoring endpoints are the existing page endpoints; generated definitions are export artifacts. Limits and deduplication apply across the selected export pages, not to the number of widgets currently visible in one editor.

Source and test evidence are recorded with the [form entity](../entities/form.md#technical-details) and the [coverage map](../coverage.md#built-in-widgets-and-forms).
