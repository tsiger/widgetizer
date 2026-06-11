# Form Widget & Forms Manifest

The `core-form` widget is a configurable contact/inquiry form. On export it
emits a `widgetizer.forms.json` manifest at the ZIP root describing every form
on the site. Together these are the two artifacts the **Widgetizer Hosted**
forms service consumes to recognise forms, accept submissions, and surface them
in its dashboard.

This widget is **only useful when the exported site is deployed to Widgetizer
Hosting** — the platform Worker is what intercepts submissions and stores them.
On any other static host the form renders correctly but submissions POST to a
404.

## Implementation Files

| Concern | File |
|---|---|
| Widget schema (settings + blocks) | `src/core/widgets/core-form/schema.json` |
| Widget markup | `src/core/widgets/core-form/widget.liquid` |
| Authoring/usage guidance | `src/core/widgets/core-form/insights.md` |
| Manifest builder | `server/services/formsManifestService.js` |
| Export wiring | `server/controllers/exportController.js` (writes `widgetizer.forms.json`) |
| Locale strings | `src/core/widgets/locales/en.json` (`core_form.*`) |
| Tests | `server/tests/formsManifest.test.js` |

---

## The two export artifacts

Both live inside the exported ZIP:

1. **Form HTML markup**, rendered by `widget.liquid` into whatever page hosts
   the widget.
2. **`widgetizer.forms.json`** at the ZIP root, written by the export
   controller via `buildFormsManifest()`.

If either is missing or malformed, the hosted service ignores forms for that
site. There is no partial recognition — the manifest must validate and the
markup must match it exactly. The export fails fast (HTTP 400) if any form
configuration violates the hosted contract, so a broken manifest never ships.

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
export pipeline derives them silently using the same `handleize` slug rules the
widget template uses (`server/services/formsManifestService.js` mirrors
`src/core/filters/handleizeFilter.js` exactly):

- The **form identifier** comes from the form name (`"Contact"` → `contact`,
  `"Quote Request"` → `quote-request`). Two forms with the same name on
  different pages are treated as the same form.
- The **field identifier** comes from each field's label (`"Email address"` →
  `email-address`). Two fields with the same derived identifier inside one form
  fail the export with a clear message naming both labels.
- The **option value** for select/radio fields comes from each option line
  (`"General inquiry"` → `general-inquiry`).
- The **max length** for each field is set silently by type to match the
  platform caps (text/tel/url 500, email 320, textarea 5000).

All identifiers are validated at export time against the hosted contract
(`/^[a-z0-9_-]{1,64}$/`). Error messages reference the form name or field
label, never the derived key.

> **Key vs. option-value cap.** Form/field keys truncate at 64 chars; option
> values truncate at 200. The manifest builder and the Liquid template apply the
> *same* caps so the rendered HTML never submits a value the manifest doesn't
> know about. (This is covered by a dedicated test for 100-char option labels.)

---

## Widget settings

Defined in `schema.json`. Labels are `tTheme:` i18n keys resolved from
`src/core/widgets/locales/en.json`.

| Setting | Values | Effect |
|---|---|---|
| `form_name` | Text ≤ 200 chars (default "Contact") | Display name in the dashboard; source of the derived form identifier. Use a unique name per form on a site. |
| `submit_label` | Any text (default "Send message") | Submit button label. |
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
name (text), Email address (email), Message (textarea).

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

Limits enforced at export time (`formsManifestService.js`):

- **Max 5 forms per site** (distinct derived form keys)
- **Max 30 fields per form**
- **Max 50 options per choice field**, each value/label ≤ 200 chars
- Form/field keys match `/^[a-z0-9_-]{1,64}$/`

---

## What the export pipeline does

When a project is exported (`exportController.js`):

1. Each `core-form` widget renders the markup above — required
   `data-widgetizer-*` attributes, off-screen honeypot named `website`, empty
   Turnstile placeholder, status element.
2. `buildFormsManifest(pagesDataArray, appVersion)` walks every page, finds
   every `core-form` widget, derives keys, validates, and returns
   `{ manifest, warnings }`.
3. Forms sharing a derived key (same name) across pages are **deduped** — the
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
      "key": "contact",          // /^[a-z0-9_-]{1,64}$/, derived from name
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

`page_path` uses `index.html` for the `index`/`home` page id and `<id>.html`
otherwise.

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

See `src/core/widgets/core-form/insights.md` for the full set of recipes and
per-setting authoring guidance.

---

## Authoring gotchas

- **Form name = dashboard name = identifier.** The same name on two pages is one
  shared form receiving submissions from both. Two distinct intents need two
  distinct names.
- **The honeypot is hardcoded.** The Worker rejects any submission where
  `website` is non-empty. The widget bakes the field in — don't override it.
- **Choice options are one label per line.** Values are auto-derived; two labels
  that produce the same identifier (e.g. "Sales" and "sales") fail the export.
- **Renaming a form after deployment splits it.** Old submissions keep going to
  the existing dashboard entry; the renamed form starts a new one. Migrate
  before going live.
- **The widget only works on Widgetizer Hosting.** On Netlify/Vercel/S3 the
  form looks right but submissions 404. Flag this in any preset that uses it.

---

**See also:**

- [core-widgets.md](core-widgets.md) — the core widget system this widget is part of
- [core-export.md](core-export.md) — the export pipeline that writes the manifest
- [theming-widgets.md](theming-widgets.md) — widget authoring (schema.json + widget.liquid)
