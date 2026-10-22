---
description: Add a contact form to your Widgetizer site with the Form widget. Collecting submissions is part of the upcoming commercial version of Widgetizer.
---

The **Form** widget lets you add a contact or inquiry form to any page. You build the form visually by adding field blocks. Form is a built-in widget, so it's available in most themes.

# Adding a Form

1. In the page editor, add the **Form** widget to your page.
2. Give it a title and (optionally) an eyebrow and description.
3. Add field blocks to build the form (below).
4. Set the submit button label.

<figure class="doc-screenshot">
  <img src="assets/screenshots/widget-picker-form.png" alt="Widgetizer page editor showing the Add widget popover filtered to the Form widget." loading="lazy">
  <figcaption>Search the widget picker for "form" to add the built-in Form widget to a page.</figcaption>
</figure>

# Building the Form

A form is made of **blocks** you add and reorder, just like other widgets:

- **Field:** a single input. Choose its type (text, email, phone, website address, or a longer message), set the label and placeholder, and mark it required if needed.
- **Choice:** a multiple-choice input (a dropdown or radio buttons). Enter the options, one per line.
- **Consent:** a checkbox for things like privacy-policy agreement. You can make it required.

You can also add sidebar blocks that show next to the form:

- **Info:** a block of formatted text (address, hours, a short note).
- **Social:** links to your social profiles.

Use the widget's **layout** and **appearance** settings (style, sidebar position, color scheme, spacing) to match the form to your design.

# Forms in Other Languages

On a [multilingual site](languages.html), a form follows the language of the page it's on:

- **New fields** you add start with labels in the page's language, and so do new choice and consent blocks.
- **Texts you haven't changed**, such as the heading, the submit button and the required-fields note, appear in the page's language.

Widgetizer includes this wording in English and Greek, and your theme can add more languages. Where neither has the page's language, the wording is in English.

When you create a page's version in another language, its form is copied as it is. The copied labels and choices keep their original wording and aren't translated automatically, so translate them yourself.

A form on a page in another language counts as a separate form, even when it has the same name as the original.

# Where Submissions Go

Form submissions work only with the upcoming **commercial version of Widgetizer**, which will be available soon. A static site can't collect submissions on its own, so this is handled by the commercial version rather than by your exported site.

We'll document how submissions are collected here once the commercial version is available.

In the preview, submitting a form doesn't send anything: it stays on the page and says *"This is a preview, so nothing was sent."*

Of course, you can also embed a form from a third-party service like Google Forms or Typeform. Paste the service's embed code into an embed widget, and that service collects and delivers the responses for you, so it works on any static host today.

# Tips

- Keep forms short: ask only for what you need. Every extra field reduces completions.
- Mark only genuinely required fields as required.
- Always include a clear submit button label ("Send message", "Request a quote").
- Add a **Consent** block if you collect personal data and your region requires explicit agreement.
