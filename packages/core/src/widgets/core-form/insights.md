# core-form

## Purpose

The site's contact and enquiry form: a headed section with text, email, phone, dropdown, radio and consent fields, a submit button and an optional side column for direct contact details and social icons. Submissions are collected only when the site is published on Widgetizer Hosting; on any other host the form renders but sending fails.

Each form has a name that becomes its entry in the hosting dashboard, so a site can run several distinct forms (contact, quote, newsletter) and read their submissions separately.

## When to use

- The main section of the `contact` page, the closing section of a service or pricing page, or a compact newsletter or RSVP form between content sections.
- Good for short enquiries of three to eight fields. Bad for file uploads, payments, multi-step applications and anything that needs a reply the visitor sees on the spot; none of those are possible.
- Can open a page: its `title` becomes the page heading, so a contact page may start with it. Under a header with `transparent_on_hero` on, open that page with `rich-text` instead and follow with the form.
- Sits well after `contact-details`, `map`, `trust-bar` or `testimonials`, and before the footer; it is often the last section of a page.
- Needs a `form_name`, at least a name, an email and a message field, and a line of `description` saying what happens after sending. Add an `info` block only when direct contact details are not already shown nearby.
- Fits every business that takes enquiries by message: trades, clinics, agencies, venues, schools, consultants, shops without a checkout.

## Pitfalls

- Submissions work only on Widgetizer Hosting. Published anywhere else, the form looks right and fails on send, so a site destined for another host should show contact details instead of a form.
- `form_name` is the dashboard name and the form's identity. Two forms with the same name, even on different pages, are one form in the dashboard; two different purposes need two different names. Renaming a form after launch starts a new dashboard entry and leaves the old submissions under the old name.
- Field labels must be unique within one form, because the label identifies the field in each submission. Two `field` blocks both labelled "Phone" are a conflict; "Mobile" and "Landline" are not.
- A `choice` block lists its `options` one per line. Two lines that differ only in case or punctuation collide; keep each option distinct in wording. `type` `select` shows a dropdown whose first empty line is the `placeholder`; `radio` shows every option at once and ignores the placeholder.
- A `consent` block is a single checkbox and is required by default. Use it for permission to be contacted or for terms; do not fake a checkbox with text in another field.
- Adding an `info` or `social` block switches the section to a two-column layout, form beside a narrow side column; `sidebar_position` matters only then. Removing those blocks collapses it back to one centred column.
- `required_note` appears only when at least one field is required. Clear it to hide the note even then.
- Default wording for `submit_label`, `title`, `description`, `eyebrow` and the field labels follows the page language; typing a value fixes it in that language only.
- Keep forms short. A form holds at most 30 fields and a `choice` at most 50 options, and a site may have only a handful of distinct forms; well before those limits, every extra field costs completions.
- `style` `underlined` draws only a bottom line per input and suits editorial pages; it is easy to miss on busy surfaces, so prefer `outlined` on highlight schemes.
- Filled schemes pad inside their own band. `bottom_spacing` `none` on a highlight form removes that inner padding rather than closing a gap to the footer; leave spacing at `auto` unless fusing with a same-scheme band.

## Recipes

### Simple contact form

A dedicated contact page form with the three essential fields and no side column. The user supplies the description line that says when they reply.

```json
{
  "type": "core-form",
  "settings": {
    "form_name": "Contact",
    "eyebrow": "Contact",
    "title": "Get in touch",
    "description": "Send a message and we reply within one business day.",
    "heading_alignment": "center",
    "style": "outlined",
    "color_scheme": "standard-primary"
  },
  "blocks": [
    { "type": "field", "settings": { "label": "Your name", "type": "text", "required": true } },
    { "type": "field", "settings": { "label": "Email address", "type": "email", "required": true } },
    { "type": "field", "settings": { "label": "Message", "type": "textarea", "required": true } }
  ]
}
```

### Contact with direct details beside it

The form with an optional phone field and a side column giving the phone, email and social icons for people who prefer not to type. The user supplies the real contact details in the `info` block.

```json
{
  "type": "core-form",
  "settings": {
    "form_name": "Contact",
    "title": "How can we help?",
    "description": "Write to us or reach us directly.",
    "heading_alignment": "start",
    "style": "outlined",
    "sidebar_position": "end",
    "color_scheme": "standard-secondary"
  },
  "blocks": [
    { "type": "field", "settings": { "label": "Your name", "type": "text", "required": true } },
    { "type": "field", "settings": { "label": "Email address", "type": "email", "required": true } },
    { "type": "field", "settings": { "label": "Phone", "type": "tel", "required": false } },
    { "type": "field", "settings": { "label": "Message", "type": "textarea", "required": true } },
    { "type": "info", "settings": { "title": "Reach us directly", "text": "<p>hello@example.com</p><p>(555) 010-0100</p><p>Monday to Friday, 9:00 to 17:00</p>" } },
    { "type": "social", "settings": {} }
  ]
}
```

### Enquiry with a topic dropdown

A triaged contact form on the strongest surface: a dropdown routes the message and a consent line covers permission to reply. The user supplies the topic list.

```json
{
  "type": "core-form",
  "settings": {
    "form_name": "Enquiry",
    "title": "Tell us what you need",
    "heading_alignment": "center",
    "style": "outlined",
    "color_scheme": "highlight-primary"
  },
  "blocks": [
    { "type": "field", "settings": { "label": "Your name", "type": "text", "required": true } },
    { "type": "field", "settings": { "label": "Email address", "type": "email", "required": true } },
    { "type": "choice", "settings": { "label": "Topic", "type": "select", "options": "General enquiry\nSupport\nSales\nPress", "placeholder": "Choose a topic", "required": true } },
    { "type": "field", "settings": { "label": "Message", "type": "textarea", "required": true } },
    { "type": "consent", "settings": { "label": "I agree to be contacted about my enquiry.", "required": true } }
  ]
}
```

### Newsletter sign-up strip

A quiet, underlined single-field form dropped between content sections, kept separate from the contact form by its own name. The user supplies the one-line pitch.

```json
{
  "type": "core-form",
  "settings": {
    "form_name": "Newsletter",
    "eyebrow": "",
    "title": "Occasional news, no noise",
    "description": "One short email a month.",
    "heading_alignment": "start",
    "submit_label": "Subscribe",
    "style": "underlined",
    "color_scheme": "standard-primary",
    "top_spacing": "small",
    "bottom_spacing": "small"
  },
  "blocks": [
    { "type": "field", "settings": { "label": "Email address", "type": "email", "placeholder": "you@example.com", "required": true } },
    { "type": "consent", "settings": { "label": "Send me occasional updates by email.", "required": true } }
  ]
}
```

### Quote request

A pre-qualifying form for trades and agencies with a service choice shown as radio buttons and a side note on what happens next. The user supplies the list of services and the follow-up steps.

```json
{
  "type": "core-form",
  "settings": {
    "form_name": "Quote request",
    "title": "Request a quote",
    "description": "Tell us about the job and we come back with a price.",
    "heading_alignment": "start",
    "style": "outlined",
    "sidebar_position": "start",
    "color_scheme": "standard-primary"
  },
  "blocks": [
    { "type": "field", "settings": { "label": "Your name", "type": "text", "required": true } },
    { "type": "field", "settings": { "label": "Email address", "type": "email", "required": true } },
    { "type": "field", "settings": { "label": "Phone", "type": "tel", "required": true } },
    { "type": "choice", "settings": { "label": "Service", "type": "radio", "options": "Service one\nService two\nService three", "required": true } },
    { "type": "field", "settings": { "label": "Project details", "type": "textarea", "required": true } },
    { "type": "info", "settings": { "title": "What happens next", "text": "<ol><li>We read your request.</li><li>We call to confirm the details.</li><li>You receive a written quote.</li></ol>" } }
  ]
}
```
