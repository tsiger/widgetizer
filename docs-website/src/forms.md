---
description: Add a contact form to your Widgetizer site. Build fields with the Form widget and collect submissions through Widgetizer Publisher.
---

The **Form** widget lets you add a contact or inquiry form to any page. You build the form visually by adding field blocks, then connect it to a host that collects submissions. Form is a built-in widget, so it's available in most themes.

# Adding a Form

1. In the page editor, add the **Form** widget to your page.
2. Give it a title and (optionally) an eyebrow and description.
3. Add field blocks to build the form (below).
4. Set the submit button label.

# Building the Form

A form is made of **blocks** you add and reorder, just like other widgets:

- **Field** — a single input. Choose its type (such as text, email, or phone), set the label and placeholder, and mark it required if needed.
- **Choice** — a multiple-choice input (dropdown, radio buttons, or checkboxes). Enter the options, one per line.
- **Consent** — a required checkbox for things like privacy-policy agreement.

You can also add sidebar blocks that show next to the form:

- **Info** — a block of formatted text (address, hours, a short note).
- **Social** — links to your social profiles.

Use the widget's **layout** and **appearance** settings (style, sidebar position, color scheme, spacing) to match the form to your design.

# Where Submissions Go

A static website can't process form submissions on its own — it needs a host that receives them. Widgetizer is built to work with **[Widgetizer Publisher](https://publisher.widgetizer.org)** (free):

- When you publish a site that contains a Form widget, Publisher automatically collects submissions and emails them to you.
- Spam protection is applied for you — no setup required.

> **Important:** If you deploy your [exported](export.html) site to a generic static host instead of Publisher, the form will display but submissions won't be delivered, because there's no service to receive them. Use Widgetizer Publisher (or the hosted editor at `editor.widgetizer.org`, where publishing and forms are wired up automatically) to collect responses.

# Tips

- Keep forms short — ask only for what you need. Every extra field reduces completions.
- Mark only genuinely required fields as required.
- Always include a clear submit button label ("Send message", "Request a quote").
- Add a **Consent** block if you collect personal data and your region requires explicit agreement.
