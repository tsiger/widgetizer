# Form Widget Insights

A configurable contact/inquiry form built for the Widgetizer Hosted forms service. Renders the markup contract the hosted Worker recognises (`data-widgetizer-form`, honeypot, Turnstile placeholder, status element) and pairs with the export-time `widgetizer.forms.json` manifest emitter.

This widget is **only useful when the exported site is deployed to Widgetizer Hosting** — the platform Worker is what intercepts submissions and stores them. On any other static host the form will POST to a 404.

---

## Identifier model — what the user does NOT configure

To keep the editor friendly for non-technical users, the widget does not expose form keys or field keys directly. The hosted service still needs them, so the export pipeline derives them silently:

- The **form identifier** comes from the form name (`"Contact"` → `contact`, `"Quote Request"` → `quote-request`). Two forms with the same name on different pages are treated as the same form in the hosting dashboard.
- The **field identifier** comes from each field's label (`"Email address"` → `email-address`). Two fields with the same label inside a single form would collide and fail the export with a clear error asking the user to rename one of them.
- The **option value** for select/radio fields comes from each option line (`"General inquiry"` → `general-inquiry`).
- The **max length** for each field is set silently by type (text/tel/url 500, email 320, textarea 5000) to match the platform caps.

All identifiers are validated at export time against the hosted contract (`/^[a-z0-9_-]{1,64}$/`). Errors are friendly and reference the form name or field label, not the derived key.

---

## Settings Levers

| Setting | Values | Effect |
|---|---|---|
| `form_name` | Any text ≤ 200 chars (default "Contact") | Display name in the hosting dashboard. Used to derive the form identifier. Use a unique name per form on a site. |
| `submit_label` | Any text | Label of the submit button. |
| `eyebrow` | Any text (default "Contact") | Small label above the headline; omit to hide. |
| `eyebrow_uppercase` | `true` / `false` | Uppercases the eyebrow for a formal label treatment. |
| `title` | Any text (default "Get in touch") | Section heading. Renders `<h1>` when first widget on page, `<h2>` otherwise. |
| `description` | Any text | Subtitle paragraph below the headline. |
| `heading_alignment` | `start`, `center` (default) | Left-aligns or centres the eyebrow / title / description group. |
| `style` | `outlined` (default), `underlined` | Outlined = full-bordered inputs with rounded corners; underlined = single bottom border per input, editorial. |
| `sidebar_position` | `end` (default), `start` | When an info or social block is added, controls which side the sidebar sits on. |
| `color_scheme` | `standard-primary`, `standard-secondary`, `highlight-primary`, `highlight-secondary` | Standard-primary keeps the section transparent; the other three give it a padded coloured container and adjust input backgrounds. |
| `top_spacing` / `bottom_spacing` | `auto` (default), `small`, `none` | Tighten or remove vertical spacing for flush stacking. |

---

## Available Blocks

| Block Type | Settings | Notes |
|---|---|---|
| `field` | `label`, `type` (text / email / tel / url / textarea), `placeholder`, `required` | Standard single-input field. Each field block maps 1:1 to a manifest entry. Field labels must be unique within a form once converted to identifiers. |
| `choice` | `label`, `type` (select / radio), `options` (textarea, one label per line, max 50), `placeholder`, `required` | For predefined sets of answers (topic, region, plan tier). Option values are auto-generated from labels. Two options producing the same identifier fail the export. |
| `consent` | `label`, `required` | Renders a single checkbox with a label after it. Use for GDPR consent, newsletter opt-in, or "I have read the terms". Required consents must be checked for the submission to succeed. |
| `info` | `title` (text), `text` (richtext) | Sidebar block. Adding any `info` or `social` block activates the 70/30 grid layout (`sidebar_position` decides the side). |
| `social` | None — pulls from `theme.social` | Sidebar block. Renders the theme-level social icons. |

---

## What the export pipeline does

When the project is exported:

1. The widget renders the form markup with the required `data-widgetizer-*` attributes, an off-screen honeypot named `website`, an empty Turnstile placeholder, and a status element. None of these include theme-specific styling that would conflict with the hosted Worker's injection.
2. The export controller walks every page, finds every `core-form` widget, and emits `widgetizer.forms.json` at the export root.
3. Forms sharing a derived form key (same name) across pages are deduped — the first page's field definitions win. If two widgets share a name but differ in field shape, the export still succeeds but a warning is logged.
4. Validation errors (missing labels, label collisions within a form, > 5 unique forms per site, > 30 fields per form, > 50 options per choice field, labels that produce empty identifiers) fail the export with a clear message naming the offending form name and field label.

The widget does **not** include any Cloudflare Turnstile site key or script tag — the hosted Worker injects both at serve time, per the platform contract.

---

## Layout Recipes

### 1. Standalone Contact Page

| Setting / Block | Value |
|---|---|
| `style` | `outlined` |
| `heading_alignment` | `center` |
| `color_scheme` | `standard-primary` |
| Field — Your name | text, required |
| Field — Email address | email, required |
| Field — Message | textarea, required |

**Good for:** A dedicated Contact page that lives at `/contact.html`, no sidebar distractions.

---

### 2. Contact With "Reach Us Directly" Sidebar

| Setting / Block | Value |
|---|---|
| `style` | `outlined` |
| `heading_alignment` | `start` |
| `sidebar_position` | `end` |
| `color_scheme` | `standard-secondary` |
| Fields — Your name (required), Email address (required), Phone (tel, optional), Message (textarea, required) |  |
| Info block | Title: "Or get in touch directly". Text: phone, email, business hours. |
| Social block | (uses theme social) |

**Good for:** Service businesses where some prospects prefer a phone call to a form. The sidebar gives them an out without abandoning the page.

---

### 3. Inquiry Routing With Topic Dropdown

| Setting / Block | Value |
|---|---|
| `style` | `outlined` |
| `heading_alignment` | `center` |
| `color_scheme` | `highlight-primary` |
| Fields — Your name (required), Email address (required) |  |
| Choice — Topic | select, required, options: `General inquiry`, `Support`, `Sales`, `Press` |
| Field — Message | textarea, required |
| Consent — "I agree to be contacted about my inquiry." | required |

**Good for:** Sites that need to triage incoming messages. The dropdown lets the dashboard filter submissions, and the consent line covers GDPR for EU traffic.

---

### 4. Newsletter Signup

| Setting / Block | Value |
|---|---|
| `form_name` | "Newsletter" |
| `style` | `underlined` |
| `heading_alignment` | `start` |
| `color_scheme` | `standard-primary` |
| `top_spacing` | `small` |
| `submit_label` | "Subscribe" |
| Field — Email address | email, required, placeholder "you@example.com" |
| Consent — "I'd like to receive occasional updates by email." | required |

**Good for:** Inline newsletter section dropped between editorial widgets. Underlined style keeps it visually quiet so it doesn't compete with surrounding content. The "Newsletter" form name keeps it separate from the main "Contact" form in the dashboard.

---

### 5. Service Quote Request

| Setting / Block | Value |
|---|---|
| `form_name` | "Quote Request" |
| `style` | `outlined` |
| `heading_alignment` | `start` |
| `sidebar_position` | `start` |
| `color_scheme` | `highlight-secondary` |
| Fields — Your name (required), Email address (required), Phone (tel, required) |  |
| Choice — Service type | radio, required, options listing the offered services |
| Field — Project details | textarea, required |
| Field — Budget | text, optional, placeholder "Approximate budget" |
| Info block | Title: "What happens next?" Text: 3 bullets explaining the response timeline. |

**Good for:** Trades, agencies, consultants — anywhere the form is doing pre-qualification rather than just collecting "hello" messages.

---

### 6. Event RSVP

| Setting / Block | Value |
|---|---|
| `form_name` | "RSVP" |
| `style` | `outlined` |
| `heading_alignment` | `center` |
| `color_scheme` | `standard-primary` |
| Fields — Your name (required), Email address (required) |  |
| Choice — Attending | radio, required, options: `Yes, I'll be there`, `Sorry, can't make it`, `Tentative` |
| Field — Guest count | text, optional, placeholder "Including yourself" |
| Field — Dietary | textarea, optional, placeholder "Any allergies or preferences?" |

**Good for:** A dedicated RSVP page for weddings, launches, workshops. The radio for attendance avoids the dropdown UI feeling overly bureaucratic.

---

## Differentiation Tips

- **Form name = dashboard name = identifier.** "Contact" on two pages = one shared form in the hosting dashboard receiving submissions from both. Two distinct intents (e.g. newsletter signup and full inquiry) need two distinct names.
- **The honeypot is hardcoded.** The platform Worker rejects any submission where the `website` field is non-empty. The widget bakes this in — don't try to override it from settings.
- **Use `consent` blocks for binary opt-ins**, not extra checkboxes inside a richtext label. Consent blocks get a real required-validation hook and emit a proper boolean to the manifest.
- **Choice options are one label per line.** Keep labels short and human — values get auto-generated for you. Two options that produce the same identifier (e.g. "Sales" and "sales") will fail the export with a clear message.
- **`underlined` style is for editorial inline placements.** It pairs well with content-heavy pages where a bordered card would feel like a marketing pop-up. `outlined` is the safer default for standalone contact pages.
- **The sidebar layout activates the moment you add an info or social block.** Removing them collapses back to a single centred column. Use the sidebar to give visitors an escape hatch (direct contact info, social links) rather than to repeat the same content.
- **Highlight color schemes work well for contact sections** because they visually separate "here's how to reach us" from the rest of the page. Pair with `bottom_spacing: none` to butt against the footer.
- **Don't stack two form widgets with the same name on the same page.** They'd dedupe to one entry in the dashboard but visitors see two near-identical forms. Either rename one or remove it.
- **Renaming a form after deployment splits it.** Submissions to the old name keep going to the existing dashboard entry; the renamed form starts a new one. If you need to rename, plan to migrate before going live.
- **This widget only works on Widgetizer Hosting.** When demoing to clients on other static hosts (Netlify, Vercel, S3), the form will look right but submissions will 404. Mention this upfront in any preset that uses it.
