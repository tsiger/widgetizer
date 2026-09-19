# Future: Theme Strings a Visitor Reads

> **Status: plan, not built.** Written 2026-09-19 while finishing multilang step 22, which fixed
> this for the Arch header and left the rest of the theme as it was.

---

## The problem

A theme puts words on the published page that have nothing to do with the site's content: `Next`
and `Previous` on a carousel, `Pause`, `Closed`, `No news items yet.`, and a long tail of
screen-reader labels. Today those are typed into the theme's Liquid.

That is invisible on an English site and wrong on every other one — Greek content inside English
furniture, and a screen-reader user on a Greek site hearing English controls. It also means a site
owner cannot change a single one of them, in any language.

Multilang step 22 fixed the Arch header by turning its strings into settings, which works because
a header is stored per language. This plan does the rest, and gives theme authors a way to ship
their own translations.

## What it should look like when it works

- A theme author writes their strings once in `locales/en.json`, under a `site` key, and may ship
  `locales/el.json`, `locales/de.json` and so on with the same keys translated.
- A site with Greek as its only language reads Greek out of the box, with nothing to fill in.
- A site owner who wants different wording types over it in the editor, per language, like any
  other setting.
- A theme that ships no translations behaves exactly as it does today.

## Where the strings are

Counted 2026-09-19 across `themes/arch`, excluding brand names (`Facebook`, `YouTube` and friends
are not translated):

| Where | Count | Examples |
| --- | --- | --- |
| Attributes in `.liquid` (mostly `aria-label`) | 42 in 22 files | `Next`, `Previous`, `Pagination`, `Mute`, `Seek`, `Included`, `Close tooltip`, `Job filters` |
| Visible text in `.liquid` | 32 in 16 files | `Days`/`Hours`/`Minutes`/`Seconds`, `Closed`, `Pause`, `All Positions`, `No news items yet. Add some under News.` |
| Strings built in `assets/*.js` | 5 | `Image preview`, `Previous image`, `Next image`, `Close lightbox` (`lightbox.js`), `Toggle submenu` (`scripts.js`) |

**They repeat heavily.** `Next`/`Previous` appear across about a dozen carousels;
`Days`/`Hours`/`Minutes`/`Seconds` across five widgets. Roughly 79 occurrences resolve to well
under half that many distinct words, which is why the shared `site` namespace matters: one entry
serves every widget that needs the word.

## Steps

### Step 1. The `site` namespace in Arch's `en.json` — *done 2026-09-19*

Add a `site` root holding every string above, shared ones first:

```json
{
  "site": {
    "common": { "next": "Next", "previous": "Previous", "close": "Close", "pause": "Pause" },
    "carousel": { "next_slide": "Next slide", "previous_slide": "Previous slide" },
    "countdown": { "days": "Days", "hours": "Hours", "minutes": "Minutes", "seconds": "Seconds" },
    "audio_player": { "mute": "Mute", "seek": "Seek", "volume": "Volume" }
  },
  "header": { "settings": { "logoText": { "label": "Logo Text" } } }
}
```

Everything already in the file keeps its meaning: **outside `site` is what the editor shows the
person building the site, and stays English. Inside `site` is what a visitor reads.**

Nothing consumes it yet — this step is the register, and it is worth having on its own because it
is the inventory the later steps work from.

**Done when:** every string in the table above has a key, and the locale validator accepts the new
root without treating its keys as orphans.

**As built.** 44 keys in 22 groups. `site.common` holds only the two words that genuinely repeat
across widgets (`next`, `previous`, in twelve carousels each); `site.countdown` holds the four
units five widgets share. Everything else is grouped under the widget that uses it, by the same
names the file already uses for editor labels.

- **Four strings interpolate** — `Play {{ title }}`, `Map showing {{ address }}`, `Go to slide
  {{ number }}`, `Go to testimonial {{ number }}`. They are written with the placeholder in place,
  so step 2's filter has to substitute rather than only look up.
- **`class_schedule.empty` was already in the file**, unreferenced, holding exactly the string the
  widget hardcodes. Someone had the same idea before; it moved under `site` and stopped being an
  orphan.
- **Six of these are empty-state messages that currently ship to the published site** — `No news
  items yet. Add some under News.` and its siblings tell a *visitor* to go and use the editor.
  `business-details.liquid` guards its equivalent with `renderMode == 'preview'` and the others do
  not. Worth fixing while sweeping them in step 4; it is a bug on its own, not only a translation
  one.
- `scripts/validate-theme-locales.js` counts `site.*` separately from editor labels, and no longer
  demands the 871 editor keys from another language's file — a translation of the visitor strings
  alone is the shape a theme author will actually write.

### Step 2. The renderer reads site strings, and a `t` filter — *done 2026-09-19*

- The render deps gain the theme's site strings for the page's language, merged over English so a
  partial translation falls back key by key (the same merge `loadMergedLocale` already does for the
  editor).
- A `t` filter resolves a key against them: `{{ 'site.common.next' | t }}`.
- A missing key renders the key's last segment rather than nothing, so a gap is visible without
  breaking the page.

**Done when:** a Greek page in a theme shipping `el.json` renders the Greek word, an English page
renders the English one, and a theme with no `el.json` renders English on both.

**As built.** `packages/core/src/filters/siteStringFilter.js` holds the filter; the strings are
loaded by `packages/builder-server/src/services/siteStringsService.js` from the PROJECT's own copy
of the theme, so a theme update is what brings new strings in, like every other theme file.

Every language is loaded at once and the filter picks — the same shape `mediaFiles` uses, and for
the same reason: whatever builds the render context does not know which page is coming, while the
filter reading it does. `ensureSiteStrings` caches them on the render's globals beside the menu
maps.

**A key is written `site.common.next` but the loaded object IS the `site` block**, so the filter
strips that first segment. Writing keys without it would have been one less rule but would read
worse in a template, where the prefix is what says "this is visitor copy".

### Step 3. Settings whose default comes from the site strings — *done 2026-09-19*

A setting may name a site-string key instead of a literal default. When the setting has no stored
value, the default is read from the site strings for the page's language.

That is what lets both things be true at once: a Greek-only site is Greek with nothing filled in,
and an owner can still type over any of it, per language, because the value is stored with their
content.

**Open decision:** which strings get a setting at all. A word repeated across twelve carousels does
not want twenty-four settings; a one-off like `No news items yet.` clearly does. The likely split
is per-widget strings get settings, shared ones stay in the locale file only — decide it in this
step with the real list in hand.

**Done when:** a widget on a Greek page shows the Greek default, an overridden value survives, and
the English site is byte-identical to before.

**As built.** A schema setting may carry `defaultKey` instead of a literal `default`, resolved when
the widget's defaults are merged. The strings are only loaded when a schema actually names one, so
a theme using none pays nothing.

**The open decision, decided:** seven settings, for the visible words an owner might reasonably
want to change — the four collection empty states, `Closed`, `All Positions`, `Pause`. The
remaining thirty-odd are screen-reader labels repeated across a dozen widgets; they resolve
through the strings file only, so a translation reaches them and nothing clutters the editor.
Worth a second opinion: it means an owner cannot reword an `aria-label` without editing the theme.

### Step 4. The Arch sweep — templates — *done 2026-09-19*

Replace all 74 Liquid strings, widget by widget, mirroring into the newest `updates/` folder as
every theme change must.

**Done when:** a grep for visitor-facing literals in `themes/arch/**/*.liquid` finds only brand
names, and the export of an English site is byte-identical to before the sweep.

**As built.** 69 attribute swaps, 7 settings, 2 plain swaps. One literal remains, deliberately:
`business-details.liquid`'s "Add your business details in Project details", which is already
guarded by `renderMode == 'preview'` and therefore speaks to the person building the site, not to a
visitor.

**The messages that told a visitor to use the editor were split in two** (decided 2026-09-19).
What a visitor reads and what the person building the site reads are different messages, and only
one of them belongs on a published page:

- The empty states say what a visitor needs — "No news items yet." — and translate.
- The instruction that followed it — "Add some under News." — moved behind
  `renderMode == 'preview'`, where `business-details.liquid` already kept its equivalent, and
  stays English because the editor does.
- An unconfigured map or video has nothing to say to a visitor at all, so its whole placeholder is
  preview-only now and a published page renders nothing where it would have gone. Those two
  strings left the `site` namespace with it — 42 rather than 44.

### Step 5. The Arch sweep — JavaScript — *done 2026-09-19*

`lightbox.js` and `scripts.js` build labels in JavaScript, where no Liquid filter reaches. The
strings have to arrive from the markup — a `data-` attribute on the element the script enhances is
the smallest way, and keeps the rendering in Liquid where the rest of it is.

**Done when:** no English label is constructed in `themes/arch/assets/*.js`.

**As built.** `layout.liquid` puts the five words on `<body>` as `data-t-*` attributes and the
scripts read `document.body.dataset`, keeping their English as a fallback for a page rendered
before the theme shipped them. The body is the right carrier because the lightbox modal is created
once for the whole page rather than per widget.

### Step 6. Ready-made translations — *done 2026-09-19, Greek*

Ship `locales/<lang>.json` for a handful of common languages, containing only the `site` block.
Nothing else in the file needs translating, because the editor stays English.

**Done when:** adding one of those languages to a project produces a site whose furniture is in it
without the owner typing anything.

**As built.** Greek only, as the one that can actually be checked against a real site. The rest
should follow the same shape: the `site` block, nothing else in the file.

### Step 7. Docs and the second theme — *docs done 2026-09-19; Beacon not started*

- `theming.md` — the rule, the `site` namespace, the `t` filter, and how a setting names a default.
- Beacon gets the same treatment, which is the real test of whether the mechanism is a theme
  contract or an Arch convention.

---

## Notes

- Brand names are not translated and must not be swept into the namespace.
- `Arch` and `Widgetizer` appear as placeholder defaults for the logo text; they are settings
  already and are not site strings.
