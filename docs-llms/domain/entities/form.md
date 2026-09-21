# Form, field, and exported definition

[Map](../README.md) · [Built-in widgets](core-widget.md) · [Form workflow](../operations/forms.md) · [Implementation reference](../../core-form-widget.md)

## Plain-language guide

### What is a form?

A form is a built-in page section where visitors can enter information. Its fields are blocks inside the section. It is saved with the page; there is no separate forms library in this editor.

| Part | Purpose |
| --- | --- |
| Form settings | Name, heading, description, submit-button text and appearance |
| Field block | Text, email, telephone, URL or a longer message |
| Choice block | A dropdown or radio choices, entered one option per line |
| Consent block | A checkbox, optionally required |
| Information/social block | Supporting sidebar content; does not collect a submitted field |
| Exported definition | A generated description of the fields a compatible submission service should accept |
| Submission | A visitor's answers; handled by the serving platform, outside this repository's persisted domain |

The starting form has three required fields: name, email and message. You can add, edit, reorder or remove blocks, and duplicate the section like another widget.

### Why does the name matter?

Within one language, forms whose names produce the same identifier are treated as one exported form. Matching copies may appear on several pages. If their fields disagree, export stops and asks you to rename one. Duplicating a widget changes its editor identity but keeps its form name, so it does not automatically create a distinct exported form.

Give forms with different purposes different names. Renaming a form or field can change its exported identifier; those names are not merely visual labels. Previous exports keep their old definitions until replaced.

### Languages and current boundaries

An additional-language form has a separate exported identity, even when its name matches the original. A newly added form now starts with field labels in the page's language; newly added choice/consent blocks use localized starting content too. Creating a translated page still copies its existing form labels and choices unchanged, so those copied values need your translation.

Display defaults such as the heading, submit button, required-fields note and choice placeholder follow the page's language until edited. The app supplies English and Greek words even when the theme supplies none; a theme can override them. This shipped in `22a93fa5`. Clearing the required-fields note removes its entire line, including the asterisk; clearing a choice placeholder leaves its first option empty. A cleared submit-button label deliberately falls back to translated text so the button retains a name.

Save and export prepare the form and its definition. A deployed site needs a compatible handler for the form's submission address. This editor/backend does not provide a submission inbox, delivery service, submission deletion or retention settings. Previewing a form is not an end-to-end submission test.

## Technical details

### Ownership and identity

`core-form` instances live in ordinary page JSON; `field`, `choice`, `consent`, `info` and `social` are its schema block types. Only the first three become manifest fields. Widget/block IDs identify editing instances; generated form/field keys serve a different purpose.

| Identifier | Derivation |
| --- | --- |
| Default-language form key | Handleized form name, truncated to 64 characters; blank/untransliterable names fall back to `contact` |
| Additional-language form key | `<language>:<base-key>`, for example `el:contact`; the 64-character cap applies to the base, not the qualified key |
| Field key | Handleized label capped at 64 characters, or `field-N` when a nonblank label cannot be transliterated |
| Choice value | Handleized nonblank option line capped at 200 characters, or `option-N` when necessary |

Field positions count only field-bearing blocks; option positions count nonblank lines. The template and manifest builder use the same handleize rules and positional counters. Empty field labels fail validation. Renaming/reordering positional-fallback content can change submitted keys.

### Localized defaults and stored field content

Core dictionaries live at `packages/core/src/widgets/locales/<language>.json` under `site.core_form` (13 English/Greek keys). `siteStringsService` combines them with the project's copied theme dictionaries: theme wins over core within each language, then missing keys use merged English. Consequently a core Greek translation can win over a theme's English-only override; the theme supplies a Greek override when it wants different Greek wording.

A widget/block setting with `defaultKey` alone stays absent from new content until the owner edits it. This covers `submit_label`, `required_note`, the choice placeholder, heading/description/eyebrow and info-block title. A setting with both `defaultKey` and a literal `default` stores its resolved initial value; form labels, choices and consent text use this because the manifest reads saved field definitions. Each starter block's `defaultKeys` map resolves to `resolvedDefaults`, allowing the initial name/email/message fields to have different labels even though they share one block type.

`form_name` keeps its existing literal `Contact` default: it is not visitor-facing copy and is used in exported identity/metadata. Existing stored values are not automatically retranslated. Runtime defaults never replace valid stored field names, so `contact` / `el:contact` identities and field/choice parity remain unchanged.

### Exported definition and validation

`buildFormsManifest` scans ordered `core-form` widgets in the included stored pages. It does not discover arbitrary HTML forms, forms in custom code, or a separate collection of submitted answers. Export writes `widgetizer.forms.json` only when forms exist. The manifest has `schema_version: 1`, generator/version, and form entries with key, name, widget identifier, language-qualified `page_path`, and fields.

Forms with the same qualified key deduplicate: the first occurrence supplies the entry and page path. Compatibility requires the same ordered field keys/types/required flags and, for choices, the same option-value set (option order may differ). Different field shapes are an error. This shares an exported identity, not live synchronization between widget copies.

Validation collects errors and throws HTTP 400 with `formsErrors`: missing/oversized labels, unsupported field types, duplicate field keys or option values, empty choices, no usable fields, more than 30 fields, more than 50 options, and the distinct-form ceiling. Form names/field labels/option labels are capped at 200 characters. The ceiling uses `MAX_FORMS_PER_SITE`: local OSS supplies Infinity; direct calls default to 5. Each additional-language key counts separately. Forms are validated late in export; this is not the initial preflight for pages and collection items.

Text/tel/url limits are 500, email 320, textarea 5000; select/radio carry 500, and consent exports as a checkbox without `max_length`. These manifest limits describe the submission contract; they are not proof of server-side validation by this OSS backend.

### Submission markup

HTML emits `data-widgetizer-form` and `POST /__widgetizer/forms/<key>` matching the manifest, field names/choice values, a `website` honeypot, an empty Turnstile placeholder, and a status region. Native required-field validation and the widget's inline validation-message behavior run in the browser. Their `validationMessage` text follows the visitor's browser language; post-submit status text belongs to the hosting integration. Neither is supplied by the core visitor dictionary. The serving platform must supply submission processing and any challenge/client integration; this repository does not implement those endpoints. Deleting a local form, page, language or export does not delete externally stored submissions.

Implementation: [schema](../../../packages/core/src/widgets/core-form/schema.json), [template](../../../packages/core/src/widgets/core-form/widget.liquid), [manifest builder](../../../packages/builder-server/src/services/formsManifestService.js), [export controller](../../../packages/builder-server/src/controllers/exportController.js).

Evidence: [formsManifest](../../../packages/builder-server/src/tests/formsManifest.test.js) checks derivation, deduplication, conflicts, caps, Greek/CJK handling, and HTML/manifest parity; [multilangExport](../../../packages/builder-server/src/tests/multilangExport.test.js) checks separate translated keys and paths. New [coreWidgetStrings](../../../packages/builder-server/src/tests/coreWidgetStrings.test.js), [catalog tests](../../../packages/builder-server/src/tests/widgets.test.js), [preview tests](../../../packages/builder-server/src/tests/previewLanguages.test.js), and [default builders](../../../packages/editor-ui/src/stores/__tests__/widgetStoreHelpers.test.js) cover core localization. A reviewer also traced the actual catalog-to-editor-defaults-to-export path in both languages; see [validation](../coverage.md#latest-validation). External submission delivery is outside these tests.
