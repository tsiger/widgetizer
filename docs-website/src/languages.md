---
description: Build a multilingual website in Widgetizer. Add languages, write each page in each language, translate menus and image descriptions, and let visitors switch languages.
---

A Widgetizer site can be published in more than one language. Each language gets its own pages, collection items, menus, header and footer, which you write yourself. Widgetizer does not translate anything automatically: it keeps the versions together, links them for search engines, and lets visitors move between them.

# Three Kinds of Language

The word "language" means three different things in Widgetizer:

- **The app's language:** the language of Widgetizer's own buttons and labels. You change it in [App Settings](settings.html). It has nothing to do with your website's content.
- **Your site's languages:** the languages you write your website in. You set these for each project, as described below.
- **The visitor's language switcher:** a control on your published site that lets visitors move between your languages. It is drawn by your [theme](themes.html).

# What Is Shared and What Is Separate

Each language has its own:

- **Pages**, with their own layout, widgets, filename and SEO settings
- **Collection items**, with their own fields, SEO settings and order
- **Menus**
- **Header and footer**
- **Image descriptions** (alt text, title and caption)

All languages share:

- **Uploaded files** in the [Media Library](media.html)
- **Theme settings**, such as colors and fonts
- **Project details**, such as the Site Title, Site Address, logo and Business Details

> **Note:** The Site Title is the same in every language.

# Adding a Language

Languages are set in the project's details:

1. Open **Project details** from the admin menu and go to the **Site** tab.
2. Under **Add a Language**, pick a language from the list.
3. Click **"Add"**.

The language is added straight away; you don't need to save the form. It now appears under **Other Languages**.

### The Default Language

The **Default Language** is the language your site is written in to begin with. Its pages are published at the top level of your site, and it is the language search engines are offered when no other fits.

You can change the Default Language only while the site has one language. Changing it does not translate anything; it only says which language your existing content is in. Once you add another language, the Default Language is locked.

> **Tip:** Set the right Default Language before you add other languages. If you change it, click **"Save"** first, then add the other languages.

### What Adding a Language Creates

Adding a language gives you a place to write in it. Widgetizer creates:

- A copy of each of your **menus** in the new language
- A copy of your **header** and **footer**, already using the new language's menus

It does **not** copy your pages or collection items. You create those one at a time, when you're ready (see below).

The copied menus and header and footer still contain your original wording, so translate their labels. Their links still point to your original pages until you change them (see [Links Between Languages](#links-between-languages)).

### Choosing a Language

The list has over 70 languages, including Brazilian Portuguese and Traditional Chinese as separate choices. If your theme's fonts don't include a language's letters (some Asian and African scripts, for example), the browser shows that text in a standard system font instead.

### Languages You Can't Add

- **Right-to-left languages**, such as Arabic and Hebrew, are not supported yet and are not in the list.
- If a page's filename is the same as a language code (for example a page named `de`), rename that page before adding the language. Each language is published in a folder named after its code, and the two would clash.

# Writing a Page in Another Language

When your site has more than one language, the **Pages** screen shows a tab for each language. Each tab lists only that language's pages, and a new page is created in the language whose tab is open.

Each page row also has small language chips in the **Languages** column, one for every other language:

- A **filled** chip means the page exists in that language. Click it to open that version.
- A **dashed** chip means it doesn't exist yet. Click it to create that version.

You can do the same from inside the page editor. The language menu in the editor's toolbar shows the page's language; choose another language to open that version, or one marked **+** to create it.

### How a New Version Starts

A new version starts as a copy of the page as it was last saved, then opens in the editor. Save your changes before creating it, so it copies what you expect.

From then on, the two versions are edited separately. You can translate the text, rearrange or remove widgets, change the filename and set different SEO details. A change to one never changes the other.

> **Note:** A custom **Canonical URL** is not copied, because it names the original page's address. The new version starts with its own automatic one.

### Versions vs. Duplicates

Only a version created this way is linked to the original as "the same page in another language". That link is what the visitor's language switcher and search engines use.

The **Duplicate** action makes a separate, unrelated page, even if you then translate it. Use the language chips or the editor's language menu when you want a translation.

# Collections in Other Languages

[Collections](collections.html) work the same way. Each collection's item list has a tab for each language and language chips on each row, and the item editor has its own language menu.

Each language keeps its own items, with their own fields, SEO settings and manual order. A listing on a page shows only the items in that page's language. If your Greek news has no articles yet, the Greek news list is empty; it doesn't borrow the English ones.

# Menus, Header and Footer

Each language has its own [menus](menus.html), header and footer:

- The **Menus** screen has a tab for each language. Open a language's tab to edit its menus.
- When you edit a page in the page editor, the header and footer you see and edit are the ones for that page's language.

# Links Between Languages

A link always goes to the exact page or item you chose. If a Greek page has a button linking to the English Contact page, it stays an English link. It does not switch to the Greek Contact page by itself.

On a multilingual site, the page and item picker helps you choose the right version:

- It opens on the language you're editing, with buttons to show another language or **"All"**.
- Every page and item is labelled with its language code (such as `en` or `el`), both in the list and once selected.

This matters most for the menus, header and footer a new language starts with: their links point to your original pages until you choose the translated ones.

# Image Descriptions

Uploaded files are shared by every language, but each language can have its own **Alt Text**, **Title** and **Caption**. You don't need to upload the image again.

In the [Media Library](media.html), open a file's metadata and choose a language from the **Language** list at the top. Fill in the fields for that language and save.

Any field you leave empty uses the default language's text. Pages in that language then show the default language's description until you write one.

# Forms

A [form](forms.html) follows the language of the page it's on. New fields you add start with labels in that language, and texts you haven't changed, such as the submit button, appear in the page's language.

Fields that were copied with a page (when you created a version) keep their original wording, so translate them. See [Forms](forms.html) for details.

# The Visitor's Language Switcher

The switcher on your published site comes from your theme. In **Arch**, it is part of the header: open the header's settings and use **Show language switcher** (on by default). It is hidden on a site with only one language.

When a visitor picks a language, they go to:

- The same page in that language, if you've created it
- Otherwise, that language's homepage

A language without a homepage is left out of the switcher.

> **Note:** Projects created before Arch 0.9.10 get the switcher by applying the Arch theme update. See [Theme Updates](themes.html#theme-updates).

# Exporting a Multilingual Site

When you [export](export.html), the default language is published at the top level of your site and each other language in a folder named after its code. For example, an English About page becomes `about.html`, and its Greek version `el/about.html` (or whatever filename you gave it).

- **Each language needs its own homepage.** The default language must have one, or the export stops. Another language without a homepage is left out of that export, and the export result names it. Links you picked that point into a left-out language are removed from the exported pages; links you typed by hand are kept as they are, so check them. Its content stays in your project.
- **Search engines are told about your translations automatically.** With a **Site Address** set in [Project details](projects.html), every page and item lists its versions in other languages, both in the page and in `sitemap.xml`. You don't need to set anything up. Pages set to not be indexed, and pages 2 and later of a list split into pages, are left out of these links.

> **Tip:** Having a homepage is the only check Widgetizer makes. A page you copied but haven't translated yet is still exported, so review each language before you publish.

# Removing a Language

To remove a language, open **Project details**, go to the **Site** tab and click **"Remove"** next to it under **Other Languages**. Widgetizer first shows how many pages, collection items and menus the language contains.

Removing a language **permanently deletes** everything written in it: its pages, collection items, menus, header and footer, and its image descriptions. Links to that content from other languages are removed too. Your uploaded files and your other languages are not affected.

> **Warning:** This cannot be undone. Adding the language again starts it fresh, with new copies of your menus, header and footer; it does not bring back what was deleted.

### If Someone Is Editing That Language

If a language is removed while one of its pages is open in another window, that editor stops saving and shows a notice. Your unsaved changes stay on screen so you can copy out anything you want to keep.

Nothing is kept for you: leaving the page or clicking **"Discard changes and return to Pages"** discards those changes, and adding the language back doesn't restore them.
