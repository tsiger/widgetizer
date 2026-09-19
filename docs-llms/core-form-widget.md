# Form Widget & Forms Manifest

The `core-form` widget is a configurable contact/inquiry form. On export it
emits a `widgetizer.forms.json` manifest at the ZIP root describing every form
on the site. Together these are the two artifacts the **Widgetizer Hosted**
forms service consumes to recognise forms, accept submissions, and surface them
in its dashboard.

The export targets the Widgetizer Hosting submission contract. A serving
platform must handle `POST /__widgetizer/forms/<key>`; a static host without
that handler cannot process submissions. This repository generates the markup
and manifest, but has no submission-storage, inbox or delivery API. Downstream
recognition and delivery behavior must be verified with the serving platform.
See the [domain guide](domain/entities/form.md) and [form workflow](domain/operations/forms.md).

## Implementation Files

| Concern | File |
|---|---|
| Widget schema (settings + blocks) | `packages/core/src/widgets/core-form/schema.json` |
| Widget markup | `packages/core/src/widgets/core-form/widget.liquid` |
| Authoring/usage guidance | `packages/core/src/widgets/core-form/insights.md` |
| Manifest builder | `packages/builder-server/src/services/formsManifestService.js` |
| Export wiring | `packages/builder-server/src/controllers/exportController.js` (writes `widgetizer.forms.json`) |
| Locale strings | `packages/core/src/widgets/locales/en.json` (editor labels and `site.core_form.*`); `el.json` supplies Greek visitor strings |
| Tests | `packages/builder-server/src/tests/formsManifest.test.js` |

---

## The two export artifacts

Both live inside the exported ZIP:

1. **Form HTML markup**, rendered by `widget.liquid` into whatever page hosts
   the widget.
2. **`widgetizer.forms.json`** at the ZIP root, written by the export
   controller via `buildFormsManifest()`.

If either is missing or malformed, the hosted service ignores forms for that
site. There is no partial recognition — the manifest must validate and the
markup must match it exactly. Export rejects the build (HTTP 400) if any form
configuration violates the hosted contract, so a broken manifest never ships.

Forms validation runs late in export, after rendering/assets work, rather than in the initial page/collection preflight. The error prevents a successful export; it is not a claim that no intermediate output was written.

### Minimal rendered markup (one field)

```html
<form
  data-widgetizer-form="contact"
  action="/__widgetizer/forms/contact"
  method="post"
>
  <label>
    Message
    <textarea name="message" required></textarea>
  </label>

  <!-- Honeypot — anti-bot. Invisible to humans. -->
  <input
    type="text"
    name="website"
    tabindex="-1"
    autocomplete="off"
    aria-hidden="true"
    class="form-honeypot"
    data-widgetizer-honeypot
  />

  <!-- Turnstile placeholder — Worker enriches this at serve time. -->
  <div class="form-turnstile" data-widgetizer-turnstile></div>

  <!-- Success/error text lands here. -->
  <p class="form-status" data-widgetizer-form-status aria-live="polite"></p>

  <button type="submit">Send</button>
</form>
```

### Matching manifest entry

```json
{
  "schema_version": 1,
  "generator": "widgetizer",
  "generator_version": "0.10.0",
  "forms": [
    {
      "key": "contact",
      "name": "Contact",
      "widget": "widgetizer/core-form",
      "page_path": "/index.html",
      "fields": [
        {
          "key": "message",
          "label": "Message",
          "type": "textarea",
          "required": true,
          "max_length": 5000
        }
      ]
    }
  ]
}
```

---

## Identifier model — what the user does NOT configure

To keep the editor friendly for non-technical users, the widget does not expose
form keys, field keys, or option values. The hosted service needs them, so the
export pipeline derives them silently. `formsManifestService.js` and the widget
template both call the **same** `handleize` exported from
`packages/core/src/filters/handleizeFilter.js`, so the manifest keys and the
rendered HTML `name`/`value` attributes can never drift apart.

`handleize` runs the same transliterating `slugify` (`strict`) used for page and
project slugs, so non-Latin labels are converted, not stripped:

- The **form identifier** comes from the form name (`"Contact"` → `contact`,
  `"Quote Request"` → `quote-request`, `"Επικοινωνία"` → `epikoinwnia`). Within one language, two
  forms with the same derived key on different pages are treated as the same form.
- The **field identifier** comes from each field's label (`"Email address"` →
  `email-address`, `"Το όνομα σας"` → `to-onoma-sas`). Two fields with the same
  derived identifier inside one form fail the export with a clear message naming
  both labels.
- The **option value** for select/radio fields comes from each option line
  (`"General inquiry"` → `general-inquiry`).
- The **max length** for each field is set silently by type to match the
  platform caps (text/tel/url 500, email 320, textarea 5000).

**Untranslatable labels get a positional fallback.** A label with no
transliterable letters or digits (CJK, emoji, punctuation-only) slugs to an empty
string. Rather than failing the export, the field key falls back to its position
(`field-1`, `field-2`, …) and an option value to `option-1`, `option-2`, … The
human label is always preserved in the manifest; only the machine key is
positional. The counters match the widget template's loops exactly so the HTML
and manifest stay in sync. (An empty/whitespace-only label is still a hard error —
that is a *missing* label, not an untranslatable one.)

Base form keys and field keys match `/^[a-z0-9_-]{1,64}$/`, since
`slugify(strict)` emits only `[a-z0-9-]` and the positional fallbacks are ASCII.
Additional-language form keys prepend `<language>:` (for example `el:contact`);
the qualified key does not match the base-key regex or share its total-length cap.
Default-language form keys remain unchanged. The HTML action and manifest use
the same qualified key, and each language counts separately toward the form limit.
Error messages reference the form name or field label, never the derived key.

> **Key vs. option-value cap.** Form/field keys truncate at 64 chars; option
> values truncate at 200. The manifest builder and the Liquid template apply the
> *same* caps so the rendered HTML never submits a value the manifest doesn't
> know about. (This is covered by a dedicated test for 100-char option labels.)

---

## Widget settings

Defined in `schema.json`. Labels are `tTheme:` i18n keys resolved from
`packages/core/src/widgets/locales/en.json`.

| Setting | Values | Effect |
|---|---|---|
| `form_name` | Text ≤ 200 chars (default "Contact") | Display name in the dashboard; source of the derived form identifier. Use a unique name per form on a site. |
| `submit_label` | Text; English fallback "Send message" | Localized runtime default; an explicit edit is stored. |
| `required_note` | Text; English fallback "Required fields" | Localized note above required fields. Clearing it removes the entire line, including its asterisk. |
| `eyebrow` | Any text (default "Contact") | Small label above the headline; omit to hide. |
| `eyebrow_uppercase` | `true` / `false` | Uppercases the eyebrow. |
| `title` | Any text (default "Get in touch") | Section heading. Renders `<h1>` when first widget on the page, `<h2>` otherwise. |
| `description` | Any text | Subtitle paragraph below the headline. |
| `heading_alignment` | `start`, `center` (default) | Aligns the eyebrow / title / description group. |
| `style` | `outlined` (default), `underlined` | Outlined = full-bordered rounded inputs; underlined = single bottom border, editorial. |
| `sidebar_position` | `end` (default), `start` | Which side the info/social sidebar sits on. |
| `color_scheme` | `standard-primary`, `standard-secondary`, `highlight-primary`, `highlight-secondary` | `standard-primary` keeps the section transparent; the others give it a padded coloured container and adjust input backgrounds. |
| `top_spacing` / `bottom_spacing` | `auto` (default), `small`, `none` | Tighten or remove vertical spacing for flush stacking. |

## Widget blocks

| Block | Settings | Notes |
|---|---|---|
| `field` | `label`, `type` (text / email / tel / url / textarea), `placeholder`, `required` | Standard single input. Maps 1:1 to a manifest entry. |
| `choice` | `label`, `type` (select / radio), `options` (one label per line, max 50), `placeholder`, `required` | For predefined answer sets. Option values auto-derived from labels; two options producing the same value fail the export. |
| `consent` | `label`, `required` | Single checkbox emitting a boolean. Use for GDPR consent / opt-in. Required consents must be checked to submit. |
| `info` | `title`, `text` (richtext) | Sidebar block. Adding any `info`/`social` block activates the 70/30 grid layout. |
| `social` | none — pulls from `theme.social` | Sidebar block rendering theme social icons. |

The default form (`defaultBlocks` in the schema) is three required fields: Your
name (text), Email address (email), Message (textarea). Each starting block
names its own word through `defaultKeys`, so the three arrive in the language of
the page being edited. They are then authored starting values like any other —
a field's label is its submitted name, so the form cannot hold an unresolved
suggestion there.
The required-fields note, the submit label and the select placeholder are
settings whose default comes from the built-in dictionary (`defaultKey`), so
their unresolved defaults read in the page's language and are not written
into content when adding a form. An owner's explicit edits are stored. The form's `form_name` is deliberately **not** localized: it is
not visitor-facing text; it supplies the form key and the manifest's display name.

---

## The markup contract (what the hosted Worker recognises)

The Worker scans the served HTML for these attributes. The widget emits all of
them; do not rename or hardcode the platform-injected pieces.

| Attribute | Where | Worker behaviour |
|---|---|---|
| `data-widgetizer-form="<key>"` | on `<form>` | Detects a form on the page → injects the client script. Value must match a form `key` in the manifest. |
| `action="/__widgetizer/forms/<key>"` | on `<form>` | The submission endpoint; the Worker derives the form key from the URL path. |
| `name="<fieldKey>"` | on each input/textarea/select | Identifies the field. Must match a `key` in the manifest's `fields` exactly. |
| `data-widgetizer-honeypot` + `name="website"` | hidden input | The Worker rejects submissions where `website` is non-empty. The name `website` is hardcoded in the Worker — the widget bakes it in. |
| `data-widgetizer-turnstile` | on a `<div>` | The Worker injects `class="cf-turnstile"`, `data-sitekey`, and the Turnstile loader script. Layout classes on the element are preserved. |
| `data-widgetizer-form-status` | any element | The client script renders the generic success/error message here. Uses `aria-live="polite"`. |

**The widget never includes:** the client script tag, the Turnstile script tag,
a `data-sitekey` value, or `class="cf-turnstile"` — the Worker injects all of
these per environment at serve time. Embedding a Turnstile key in the export
would leak it or break the widget in the wrong environment.

---

## Accessibility

The widget adds these on top of the hosted markup contract. None of them are read by the Worker.

- **Required-fields note.** When any block is required, the form opens with "* Required fields" — `site.core_form.required_note` in the page's language, or whatever the owner typed into the `required_note` setting. **Clearing the setting removes the line**, asterisk and all: the template distinguishes an unset value (`nil`, nothing reached it) from an emptied one (`""`, a choice), so the wording that arrives by itself never comes back over a deliberate blank. The submit label keeps a floor instead — a button with no label is not a form. The asterisk is `aria-hidden`; screen readers get the requirement from `required` / `aria-required` on each control.
- **Autocomplete hints.** `email`, `tel` and `url` fields get the matching `autocomplete` token. A `text` field whose derived key is `name`, `your-name` or `full-name` gets `autocomplete="name"`; any other label gets none.
- **Per-field errors.** Every field, choice and consent block renders an empty `<p class="form-error" id="form-<widgetId>-<blockId>-error" hidden>`. An inline script listens for the browser's `invalid` events: it suppresses the native bubble, writes the browser's `validationMessage` into that slot, sets `aria-invalid="true"`, links the slot through `aria-describedby` and focuses the first invalid control. It clears all three once the control is valid. Native constraint validation still gates submission, and the Worker's client script still owns submit and the `data-widgetizer-form-status` message.

**Two visitor messages the site's language does not reach.** The text written
into a field's error slot is the browser's own `validationMessage`, which
follows the *visitor's browser* language, not the page's — localizing it would
mean replacing native validation with per-type messages of our own. And the
line after submit is written by the hosted Worker's client script, which lives
outside this repository. Neither is covered by the built-in dictionary.

---

## Field types & validation caps

Enforced by the hosted service; the manifest builder applies the matching
`max_length` defaults so the export and the platform agree.

| `type` | Stored as | Validation |
|---|---|---|
| `text` | string | trimmed, `max_length` cap (default 500) |
| `email` | string | trimmed, basic email shape, `max_length` cap (default 320) |
| `tel` | string | trimmed, `max_length` cap (default 500) |
| `url` | string | trimmed, valid `http(s)://` URL, `max_length` cap (default 500) |
| `textarea` | string | outer whitespace trimmed, `max_length` cap (default 5000) |
| `select` | string | must match one of the configured `options[].value` |
| `radio` | string | same as select |
| `checkbox` | boolean | `true` when checked; required checkboxes must be checked to submit |

Limits enforced at export time (`packages/builder-server/src/services/formsManifestService.js`):

- **Forms per site** (distinct derived form keys) — adapter-backed via `LIMIT_KEYS.MAX_FORMS_PER_SITE`: OSS is unbounded (`Infinity` from the local limits adapter); the hosted-contract default is 5, which also applies when no limits adapter is wired
- **Max 30 fields per form**
- **Max 50 options per choice field**, each value/label ≤ 200 chars
- Base form handles and field keys match `/^[a-z0-9_-]{1,64}$/`; translated form keys additionally carry the language prefix

---

## What the export pipeline does

When a project is exported (`packages/builder-server/src/controllers/exportController.js`):

1. Each `core-form` widget renders the markup above — required
   `data-widgetizer-*` attributes, off-screen honeypot named `website`, empty
   Turnstile placeholder, status element.
2. `buildFormsManifest(pagesDataArray, appVersion, maxForms, { defaultLanguage })` walks included stored pages, finds
   every `core-form` widget, derives keys, validates, and returns
   `{ manifest, warnings }`.
3. Forms sharing a language-qualified derived key across pages are **deduped** — the
   first page's field definitions win. If two same-key forms have *different*
   field shapes (including differing choice option values), the export **fails**
   with a clear message, because the hosted service would reject submissions
   from the mismatched page.
4. If any validation fails, the builder throws an error carrying `statusCode:
   400` and a `formsErrors` array listing **every** problem (it collects, it
   doesn't bail on the first). The request handler surfaces these.
5. If at least one valid form exists, `widgetizer.forms.json` is written at the
   export root. If the site has no form widgets, no manifest is written
   (`buildFormsManifest` returns `null`), which the hosted service treats the
   same as an empty `forms: []`.

---

## Manifest reference

```json
{
  "schema_version": 1,          // always 1
  "generator": "widgetizer",    // always "widgetizer"
  "generator_version": "0.10.0", // the app version, passed in by the exporter
  "forms": [
    {
      "key": "contact",          // base handle; e.g. el:contact in an additional language
      "name": "Contact",         // ≤ 200 chars, the user-facing form name
      "widget": "widgetizer/core-form", // constant identifier of the emitter
      "page_path": "/index.html",// the page the form was found on
      "fields": [
        {
          "key": "message",       // /^[a-z0-9_-]{1,64}$/, unique within the form
          "label": "Message",     // 1–200 chars, the user's field label
          "type": "textarea",     // one of the 8 supported types
          "required": true,       // boolean
          "max_length": 5000      // omitted for checkbox; default by type otherwise
          // select/radio also carry:
          // "options": [{ "value": "a", "label": "Option A" }, ...]
        }
      ]
    }
  ]
}
```

`page_path` uses the shared `pageOutputPath` builder: `/index.html` for the
default homepage, `/contact.html` for a default page, or `/el/contact.html` for
an additional-language page. This records the output file path, not a Clean URLs
href. A deduplicated entry retains only its first occurrence's path.

---

## Layout recipes

The widget's flexibility covers common form patterns. A few worth knowing:

- **Standalone contact page** — outlined style, centred heading, three required
  fields (name, email, message), no sidebar.
- **Contact with "reach us directly" sidebar** — add an `info` block (and
  optionally `social`) to activate the 70/30 grid; gives prospects a non-form
  way to get in touch.
- **Inquiry routing** — add a `choice` (select) block for a Topic dropdown so
  the dashboard can triage, plus a required `consent` block for EU traffic.
- **Newsletter signup** — a single email `field` + `consent`, `underlined`
  style, a distinct `form_name` ("Newsletter") so it stays separate from the
  main Contact form in the dashboard.

See `packages/core/src/widgets/core-form/insights.md` for the full set of recipes and
per-setting authoring guidance.

---

## Authoring gotchas

- **Form name = dashboard name = identifier.** The same derived name in one language on two pages is one
  exported identity; matching field definitions are required. Two distinct intents need two
  distinct names.
- **The honeypot is hardcoded.** The Worker rejects any submission where
  `website` is non-empty. The widget bakes the field in — don't override it.
- **Choice options are one label per line.** Values are auto-derived; two labels
  that produce the same identifier (e.g. "Sales" and "sales") fail the export.
- **Renaming a form after deployment splits it.** Old submissions keep going to
  the existing dashboard entry; the renamed form starts a new one. Migrate
  before going live.
- **Submission processing is a hosting integration.** A static host needs a
  compatible handler for the generated action. Successful export does not test delivery.

---

**See also:**

- [core-widgets.md](core-widgets.md) — the core widget system this widget is part of
- [core-export.md](core-export.md) — the export pipeline that writes the manifest
- [theming-widgets.md](theming-widgets.md) — widget authoring (schema.json + widget.liquid)
