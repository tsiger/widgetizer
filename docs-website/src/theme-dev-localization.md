---
description: Make a Widgetizer theme read correctly in every language a site publishes. Visitor dictionaries, the t filter, localized defaults, the language switcher, links, dates and image text.
---

A Widgetizer site can publish in several languages. The owner writes each language's pages, collection items, menus, header and footer separately; nothing is translated automatically. Your theme's job is smaller but important: every word **the theme itself** puts on the page (a "Next" button, a screen-reader label, an empty-list message) has to follow the language of the page being rendered.

This page covers how. Arch is the worked example throughout: it ships English and Greek dictionaries and a header language switcher. For the owner's side of languages, see [Languages](languages.html).

# Three Kinds of Words

| Words | Who owns them | Mechanism |
| :-- | :-- | :-- |
| Editor labels, help text, option names | The theme | `tTheme:` keys, read from `locales/en.json` |
| Visitor-facing theme words | The theme | The `site` dictionary in `locales/<lang>.json`, read with the `t` filter |
| Page content (headings, text, links) | The site owner | Stored per language; edited in the editor |

The editor interface is English, so `tTheme:` labels only need `en.json` (see [Theme Manifest & Settings](theme-dev-manifest-settings.html#theme-locales)). Visitor words resolve in the language of the page being rendered, so they need a file per language you want to support.

> **Rule of thumb:** never hardcode a word a visitor reads in a template. Put it in the `site` dictionary, or expose it as a setting the owner can edit.

# The `site` Dictionary

A theme's `locales/<lang>.json` has two halves, and the split is visible from the key. Everything under `site` is visitor-facing; everything else is an editor label:

```json
{
  "site": {
    "common": { "next": "Next", "previous": "Previous" },
    "slideshow": { "go_to_slide": "Go to slide {{ number }}" },
    "news_grid": { "empty": "No news items yet." }
  },
  "news_grid": {
    "settings": { "empty_text": { "label": "Empty message" } }
  }
}
```

A translation file needs only the `site` block, as in Arch's `locales/el.json` (shortened here):

```json
{
  "site": {
    "common": { "next": "Επόμενο", "previous": "Προηγούμενο" },
    "slideshow": { "go_to_slide": "Μετάβαση στη διαφάνεια {{ number }}" }
  }
}
```

Each language is merged over English key by key, so a half-finished translation falls back word by word to English instead of leaving blanks. The language codes match the ones the site uses (`el`, `de`, `pt-br`, …).

### Built-in Words You Can Override

Built-in widgets and snippets ship their own words with the app, so they read correctly even in a theme with no locale files. The keys are `site.breadcrumbs.label`, `site.breadcrumbs.page` and `site.core_form.*` (the built-in form's labels and button). **A theme's word wins over the built-in one**, key by key and language by language. Define `site.core_form.submit` in your dictionary and the built-in form's button reads your wording; anything you leave alone falls back to the app's.

# Reading a Word: the `t` Filter

```liquid
<button aria-label="{{ 'site.common.next' | t }}">
  {{ 'site.common.next' | t }}
</button>

<span>{{ 'site.slideshow.go_to_slide' | t: number: forloop.index }}</span>
```

- **Interpolation.** Named arguments fill `{{ name }}` placeholders in the string. A placeholder with no matching argument is left as written.
- **Language order.** The word is looked up in the page's language, which already includes English underneath it, so a word missing there comes out in English.
- **Missing keys.** A key no dictionary defines renders its last segment with underscores turned into spaces (`site.slideshow.go_to_slide` reads `go to slide`). The gap is visible without leaving a control unlabeled, but treat it as a bug, not final copy.
- **Escaping.** The result is autoescaped like any other output. Keep markup in templates and words in the dictionary; don't add `| raw`.

`t` works the same inside a `{% render %}`'d snippet.

# Words the Owner Can Edit: `defaultKey`

When the owner should be able to change a word (an empty-state message, a "Read more" label), make it a widget or block setting and point its default at a dictionary key with `defaultKey` instead of a fixed `default`:

```json
{
  "type": "text",
  "id": "empty_text",
  "label": "tTheme:news_grid.settings.empty_text.label",
  "defaultKey": "site.news_grid.empty"
}
```

Until the owner types something, the setting reads in the language of the page, both in the editor and on the published site. Once they type, their value is stored with that page's content, per language, like any other setting. Arch's News grid empty message and Slideshow play/pause labels work this way. `defaultKey` applies to widget and block settings; it is not read for global theme settings or collection fields.

Use it for words an owner might reasonably want to change. Screen-reader labels repeated across many widgets are better left to the dictionary alone.

### An Emptied Field Is a Choice

The dictionary word fills the setting only while it has **no stored value at all**. An owner who clears the field gets an empty field, not the default back. If your template adds its own fallback, test for `nil`, not `blank` (and not the `default` filter, which treats `""` as missing): `nil` means nothing was stored, `""` means the owner emptied it on purpose.

```liquid
{% if widget.settings.empty_text == nil %}
  {% assign empty_text = 'site.news_grid.empty' | t %}
{% else %}
  {% assign empty_text = widget.settings.empty_text %}
{% endif %}
{% if empty_text != blank %}<p>{{ empty_text }}</p>{% endif %}
```

### `defaultKey` Together with `default`

With **both** a literal `default` and a `defaultKey`, the word is resolved in the language being edited and **stored** in the widget when it is added. Use the pair only when something downstream reads the stored value. The built-in form does this for field labels, because a label is also the field's submitted name. Everywhere else, use `defaultKey` alone: a stored word would follow a page into its translations when the owner copies it to another language.

Starter blocks in `defaultBlocks` name their words with a `defaultKeys` map, since one block schema can't hold several different starting labels:

```json
{
  "type": "field",
  "settings": { "label": "Your name" },
  "defaultKeys": { "label": "site.core_form.name_field" }
}
```

Starter block settings are always stored. The literal value is the fallback when the key resolves nowhere.

# Words a Script Builds

Browser JavaScript runs after rendering, so it can't call a Liquid filter. Render the words into the markup and let the script read them. Arch puts its lightbox and menu labels on `<body>` in `layout.liquid`:

```liquid
<body
  class="{{ body_class }}"
  data-t-lightbox-close="{{ 'site.lightbox.close' | t }}"
  data-t-lightbox-next="{{ 'site.lightbox.next' | t }}"
>
```

```javascript
const label = document.body.dataset.tLightboxClose || "Close";
closeButton.setAttribute("aria-label", label);
```

Widget-specific words can go on the widget's own root element the same way (Arch's slideshow carries `data-t-pause-autoplay`). Put them into the DOM with `textContent` or `setAttribute`, never by building HTML strings, and don't paste translated text into inline JavaScript string literals.

# The Document Language

Every page, item page included, knows its language. Use it on `<html>` instead of a hardcoded `lang="en"`:

```liquid
<html lang="{{ page.language | default: project.defaultLanguage | default: 'en' }}" dir="{{ page.dir | default: 'ltr' }}">
```

| Value | Meaning |
| :-- | :-- |
| `page.language` | Language code of the content being rendered (`en`, `el`) |
| `page.dir` | `ltr` or `rtl` |
| `project.defaultLanguage` | The site's default language |
| `project.languages` | The site's additional languages (empty for a single-language site) |

Right-to-left languages can't be added to a site yet, so `page.dir` is currently always `ltr`. Emit it anyway; your layout then keeps working when they arrive. Use logical CSS properties (`margin-inline-start`) for the same reason.

# The Language Switcher

`page.translations` lists the languages a visitor can switch to from the current page or item. It is empty on a single-language site, so a switcher built on it disappears by itself.

| Field | Meaning |
| :-- | :-- |
| `language` | Language code (`el`) |
| `hreflang` | The same code in the form the `lang`/`hreflang` attributes want |
| `label` | The language's own name (`Ελληνικά`), what a switcher shows |
| `href` | Link to that language's version of this page, already correct for depth and Clean URLs |
| `seoUrl` | Absolute address for metadata; empty without a Website Address |
| `active` | `true` for the language being rendered |
| `fallback` | `true` when this page has no version in that language, so `href` points at that language's homepage |
| `noindex` | `true` when the destination asked search engines not to index it |
| `dir` | `ltr` or `rtl` |

Behavior worth knowing:

- Entries follow the site's language order. A language with no homepage is left out entirely.
- Linking fallback entries is fine: landing on a language's homepage beats a dead end. `noindex` matters to search engines, not to visitors, so a switcher can ignore it.
- On page 2 and later of a [page split into pages](theme-dev-widgets-blocks.html#splitting-a-list-into-pages), each entry links to the other language's version of the base page, not to the same page number, since the lists can differ in length.
- Always use `href`. Don't build language links by rewriting the current path.
- You don't emit `hreflang` tags yourself: `{% seo %}` builds them from the same list.

```liquid
{%- if translations and translations.size > 1 -%}
  <nav class="language-switcher" aria-label="{{ label }}">
    <ul>
      {%- for entry in translations -%}
        <li>
          <a href="{{ entry.href }}" lang="{{ entry.hreflang }}"{% if entry.active %} aria-current="true"{% endif %}>
            {{ entry.label }}
          </a>
        </li>
      {%- endfor -%}
    </ul>
  </nav>
{%- endif -%}
```

A snippet doesn't see the caller's `page`, so pass the list in explicitly:

```liquid
{% render 'language-switcher', translations: page.translations, label: widget.settings.language_switcher_label %}
```

Arch ships this as `snippets/language-switcher.liquid`. Its header has a **Show language switcher** setting and renders the snippet twice: a `<details>` dropdown in the desktop bar and a plain list inside the mobile navigation (`landmark: false` drops the `<nav>` wrapper there, so there is one landmark per switcher).

# Links in the Page's Language

Menus, `link` settings and richtext links the owner picks in the editor are resolved for you. A target picked from the page picker stays that exact page: an English page chosen on a Greek page remains a link to the English page. A menu the owner picks stays that exact menu; a menu named by slug in a schema default or starter content resolves to the current language's menu of that name. A menu picked in a shared theme setting therefore shows the same menu, labels included, on every language.

Links your theme builds itself go through `page_url` and `item_url`, which link **within the rendered page's language**. On a Greek page, `{{ 'index' | page_url }}` is the Greek homepage:

```liquid
<a href="{{ 'index' | page_url }}">{{ project.siteTitle }}</a>

{% comment %} A deliberate cross-language link {% endcomment %}
<a href="{{ 'index' | page_url: lang: 'en' }}">English site</a>
<a href="{{ item.slug | item_url: 'news', lang: 'en' }}">Read in English</a>
```

A slug is per language, though. `'contact' | page_url` on a Greek page links to the Greek page slugged `contact`; if the owner named the Greek version `epikoinonia`, that link is broken. A typed `contact.html` link has the same problem. Prefer the home link, links the owner picks, and `page.translations`; for starter links, see [Starter Links](theme-dev-distribution.html#starter-links-and-updates).

# Collections in Several Languages

Each language has its own collection items, with their own order and their own slugs. The `collection` filter returns the items of the page's language only; a Greek listing never borrows English items, and is empty when no Greek items exist. Pagination counts the current language's items. Item URLs carry the language folder (`el/news/story.html`), and the `url` on each item is already correct. See [Collections](theme-dev-collections.html#languages).

# Dates

`format_date` keeps the date format the site chose, but writes month names in the page's language:

```liquid
<time datetime="{{ item.settings.date }}">{{ item.settings.date | format_date }}</time>
```

# Image Text

The media library is shared by every language, but each file's alt text, title and caption can be translated. `{% image %}` and `media_meta` return them in the page's language:

```liquid
{% image src: widget.settings.image, size: 'large' %}
{% assign caption = widget.settings.image | media_meta: 'caption' %}
{% if caption != blank %}<figcaption>{{ caption }}</figcaption>{% endif %}
```

A field with no translation inherits the default language's text. Passing a non-empty `alt:` or `title:` to `{% image %}` overrides the library value in every language, so only do that with text that is itself translated, such as a setting or `t` output. An empty `alt: ''` does not clear library text; it falls back to it.

# Business Details

`project.identity` (address, phone, opening hours) is shared by every language. The words around it aren't: Arch's `snippets/business-details.liquid` takes its day names and "Closed" from `site.business_details.*`, so opening hours read in the page's language. Do the same rather than printing the raw `monday` ids.

# Checking and Shipping Translations

From a source checkout, run the app's theme checker:

```bash
npm run validate:theme -- themes/my-theme
```

Among its other checks, it confirms against `locales/en.json` that every `tTheme:` label, group name, literal `t` key and `defaultKey`/`defaultKeys` reference exists (the built-in words count as present). An undefined visitor key is an error. It can't see keys built at runtime, and it doesn't check other languages for completeness or matching `{{ placeholder }}` names.

For a theme in the `themes/` folder, the locale checker adds those cross-language comparisons:

```bash
npm run validate:theme-locales               # every theme in themes/
node scripts/validate-theme-locales.js my-theme
```

It warns about `site` keys nothing uses, and about another language missing or adding `site` keys compared to English.

### How Words Reach Existing Sites

- **Theme words** live in each project's own copy of the theme. Editing your locale files changes new projects only; existing projects get new or corrected words when they [apply a theme update](theme-dev-distribution.html) that ships the changed `locales/` folder.
- **Built-in widget words** ship with the app, so they change when the app is updated.
- **Owner content** is never touched by either. Starter pages come from your templates in one language; when an owner adds a language, Widgetizer copies the menus, header and footer for them to translate.

# Checklist

- [ ] No hardcoded visitor words in templates, snippets or scripts
- [ ] Every visitor word under `site` in `locales/en.json`, plus a `site`-only file for each supported language
- [ ] Owner-editable words use `defaultKey`; a literal `default` beside it only where the stored value matters
- [ ] Template fallbacks on owner text guard on `nil`, not `blank`
- [ ] Script labels passed through `data-*` attributes
- [ ] `<html lang>` and `dir` from `page.language` and `page.dir`
- [ ] A switcher built on `page.translations`, passed explicitly into its snippet
- [ ] Theme-built links through `page_url` / `item_url`
- [ ] `npm run validate:theme` clean
