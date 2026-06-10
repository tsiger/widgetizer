# Plan: `date` setting type, date-sorted collections, theme date format, and the News collection

> **Status: 📋 Implementation plan / reviewer spec — active.** This is the design + acceptance
> criteria for an in-progress change on the `collections` branch, written for reviewer hand-off.
> Once it ships and the behavior is folded into the permanent reference docs
> (`theming-setting-types.md`, `core-collections.md`, `theming.md`), **this file should be retired** —
> it is a plan, not reference documentation.

---

## 1. Goal

Four connected pieces, smallest set that delivers a usable blog:

1. A first-class **`date` setting type** (general-purpose; usable in any widget/theme/collection schema).
2. Let a collection **sort by a date field** (publication-date ordering for a blog).
3. Give end users **visual** control over how dates render on the **published site** — a theme
   setting edited in the Settings UI, no Liquid.
4. Ship the first real Arch collection type: **News** (a simple blog), using all of the above.

This is the first concrete Arch collection type after the Aegean testbed and the Arch
`portfolio`/`team` examples were removed (see `core-collections.md`).

---

## 2. Design decisions (and the reasoning, so the review can check intent)

- **Date-only `YYYY-MM-DD`, native `<input type="date">`.** Publication / project / event dates
  don't need a time-of-day; the native picker is the simplest good UX and needs no date library;
  the stored value is canonical and lexicographically sortable.

- **Sort via a `usedAsDate` field flag + `date_desc` / `date_asc`**, mirroring the existing
  `usedAsTitle` + `title_asc`/`title_desc` convention exactly. We deliberately did **not** build a
  generic "sort by any field" engine — the named-flag pattern is what the codebase already uses for
  titles, so date sorting reads the same way and stays minimal.

- **Two distinct date-format surfaces — keep them separate on purpose:**
  - **Admin / dashboard** (the CMS item list): keeps using the existing app
    `general.dateFormat` setting (`useFormatDate`). It is a *dashboard reading preference*.
  - **Published site**: a **new theme `date_format` setting** (per-project, theme-owned, edited
    visually in Settings), consumed by a new `format_date` Liquid filter. Published presentation
    belongs to the theme — exactly like colors and fonts. The dashboard setting is **not** used for
    published output: it is frontend-only (not available to the server renderer) and most of its
    presets carry a *time* component (`h:mm A`) that is wrong for a date-only value.

- **Timezone-safe formatting.** A `YYYY-MM-DD` value must be formatted by **splitting the string**,
  never `new Date("2026-01-15")` — that parses as **UTC midnight** and renders the **previous day**
  in any timezone behind UTC. This applies to both the Liquid filter (server timezone) and the admin
  date-only display.

- **News date is optional** (not `required`). Missing dates **sort to the end** (tiebreak
  `created_desc`). This avoids save/export friction and removes any need to change preset seeding.

---

## 3. The three surfaces at a glance

| Concern | Storage | Sort key | Display (admin) | Display (published) |
| --- | --- | --- | --- | --- |
| What | `YYYY-MM-DD` string in `item.settings.<id>` | `usedAsDate` field, via `date_desc`/`date_asc` | app `general.dateFormat` (date-only, TZ-safe) | theme `date_format` via `format_date` filter |
| Owner | sanitizer | `collectionService.sortItems` | `useFormatDate` + shared `formatDateOnly` | theme setting + Liquid filter |

The stored value and the sort key never change with formatting — formatting is a pure display layer.

---

## 4. File-by-file changes

### A. The `date` setting type (general-purpose)
- **`src/components/settings/supportedSettingTypes.js`** — add `"date"` to `SUPPORTED_SETTING_TYPES`
  (single source of truth shared with the backend collection-schema validator).
- **`src/components/settings/inputs/DateInput.jsx`** (new) — native `<input type="date">` styled with
  the app form classes; value is `"YYYY-MM-DD"` or `""`. Export from `src/components/settings/inputs/index.js`.
- **`src/components/settings/SettingsRenderer.jsx`** — `case "date": return <DateInput {...inputProps} />`.
- **`server/services/sanitizationService.js`** — add `case "date"` to **`sanitizeSettingValue`**
  (covers collection items via `sanitizeCollectionItemData` **and** widget/block settings via
  `sanitizeWidgetData`) and to **`sanitizeThemeSettingValue`**: coerce to a valid `YYYY-MM-DD`
  (regex + real-calendar-date check) or `""`. Garbage is dropped, never stored.

### B. Date-based sorting (collection schema feature)
- **`server/services/collectionService.js`**:
  - `ALLOWED_SORTS` (currently `["manual","created_desc","created_asc","title_asc","title_desc"]`)
    gains `"date_desc"`, `"date_asc"`.
  - `validateCollectionSchema`: validate **`usedAsDate`** — at most one non-`header` setting may
    declare it, and it must be on a `type: "date"` field. If `defaultSort` is `date_desc`/`date_asc`,
    a `usedAsDate` field **must** exist (else there is nothing to sort by → error). Mirrors the
    existing `usedAsTitle` block.
  - `sortItems(items, sort, projectFolderName, collectionType, schema)` — pass `schema` through from
    `listCollectionItems`; add `date_desc`/`date_asc` cases that read
    `item.settings[<usedAsDate id>]`. **Empty / invalid dates sort to the end**, tiebroken by
    `created_desc`. String compare on `YYYY-MM-DD` is chronological, but compare defensively.
  - Confirm `normalizeCollectionFilterArgs` in `src/core/filters/collectionFilter.js` passes the new
    `sort` values through unchanged so `{% assign x = 'news' | collection: sort: 'date_desc' %}` works.

### C. Theme date format (published, user-controlled, no Liquid)
- **`src/core/utils/dateFormat.js`** (new) — shared, timezone-safe `formatDateOnly(value, token)`:
  splits `YYYY-MM-DD` into parts (never constructs a `Date` from the string), renders per the
  date-only token vocabulary reused from `src/utils/dateFormatter.js`
  (`MMMM D, YYYY` / `D MMMM YYYY` / `MMM D, YYYY` / `D MMM YYYY` / `MM/DD/YYYY` / `DD/MM/YYYY` /
  `YYYY-MM-DD`). Single source of truth for both the filter and the admin date-only display.
- **`src/core/filters/dateFilter.js`** (new) — `registerDateFilter(engine)` adds a `format_date`
  Liquid filter: `{{ item.settings.date | format_date }}` reads the theme format from a render global,
  accepts an optional override arg (`| format_date: 'D MMM YYYY'`), defaults to `MMMM D, YYYY`.
  Lives under `src/core/` so it imports no backend module (same constraint as `collectionFilter.js`).
- **`server/services/renderingService.js`** — register the filter in `configureLiquidEngine` (next to
  `registerCollectionFilter`); in `createBaseRenderContext`, set `globals.dateFormat` from the theme's
  `general.date_format` (default `MMMM D, YYYY`).
- **`themes/arch/theme.json`** — add a `date_format` `select` to the **`general`** group: the 7
  date-only options, default `"MMMM D, YYYY"`, `tTheme:` label per Arch convention.
- **`themes/arch/locales/en.json`** — add the `date_format` label entry. (Option labels are literal
  date examples — direct strings.)

### D. News collection type (first real Arch type)
- **`themes/arch/collection-types/news/schema.json`** (new) — see §5.
- **`themes/arch/collection-types/news/template.liquid`** (new) — see §6.

### E. Optional polish (included in this pass)
- **`src/components/collections/CollectionItemForm.jsx`** — on **create**, pre-fill the `usedAsDate`
  field with today (`YYYY-MM-DD`) as a convenience; existing items untouched.
- **`src/pages/CollectionItems.jsx`** — when a collection type has a `usedAsDate` field, the list's
  date column shows that **publication date** (date-only, app format via `formatDateOnly`) instead of
  `updated`; otherwise unchanged.

### F. Reference docs
- **`theming-setting-types.md`** — new **Date** setting type (input, stored value, template usage,
  the `format_date` filter).
- **`core-collections.md`** — the `usedAsDate` field flag, the `date_desc`/`date_asc` `defaultSort`
  values, and the validation rules; add `"date"` to the supported-types list.
- **`theming.md`** — brief note on the `date_format` theme setting + `format_date` filter.

---

## 5. News schema (`themes/arch/collection-types/news/schema.json`)

Direct-string labels (collection schemas are **not** locale-validated — the validator only scans
`widgets/` — and direct strings are explicitly supported):

```jsonc
{
  "type": "news",
  "schemaVersion": 1,
  "displayName": "Article",
  "displayNamePlural": "News",
  "description": "Articles, updates and announcements.",
  "icon": "Newspaper",
  "slugPrefix": "news",
  "hasItemPages": true,
  "sortable": false,
  "defaultSort": "date_desc",
  "settings": [
    { "type": "header",   "id": "content_header", "label": "Content" },
    { "type": "text",     "id": "title",          "label": "Title", "required": true, "usedAsTitle": true },
    { "type": "date",     "id": "date",           "label": "Publication date", "usedAsDate": true },
    { "type": "textarea", "id": "excerpt",        "label": "Excerpt", "description": "Short teaser shown in listings and at the top of the article." },
    { "type": "image",    "id": "featured_image", "label": "Featured image" },
    { "type": "richtext", "id": "body",           "label": "Body" }
  ]
}
```

Four content fields, one required (`title`). `date` is optional and drives the default `date_desc`
ordering.

---

## 6. News item page (`themes/arch/collection-types/news/template.liquid`)

Renders **inside** the Arch layout (header / main / footer), like a page template. Uses Arch design
tokens / classes. Key bindings:

- `<h1>{{ item.settings.title }}</h1>`
- Date: `<time datetime="{{ item.settings.date }}">{{ item.settings.date | format_date }}</time>`
  (only when `item.settings.date != blank`).
- Featured image via `{% image src: item.settings.featured_image, size: 'large' %}` (guarded; placeholder otherwise).
- Body: `{{ item.settings.body | raw }}` inside a richtext container.
- SEO is automatic: `hasItemPages` items carry the page-shaped `seo` object and the shared `SeoTag`
  renders title/og/twitter/canonical — no template work needed (see `core-collections.md` §8).

A "back to News" link uses a depth-aware relative href (item pages export one directory deep at
`news/{slug}.html`, so `../`). The core `menu.liquid` active-state handling is unaffected.

---

## 7. Validation rules added (collection schema)

- `usedAsDate`: at most one non-`header` setting may set it; it must be `type: "date"`.
- `defaultSort` ∈ `manual | created_desc | created_asc | title_asc | title_desc | date_desc | date_asc`.
- `defaultSort: date_desc | date_asc` requires a `usedAsDate` field to exist.
- `date` joins the supported setting types; `usedAsDate` on a non-`date` field is rejected.

---

## 8. Acceptance criteria

- A `date` field renders a native date picker in the item form and stores `YYYY-MM-DD` (or `""`).
- Invalid/garbage date input is coerced to `""` server-side (never persisted as-is).
- A News collection with `defaultSort: date_desc` lists newest-first by the publication date; items
  with no date appear last (then by `created_desc`). The `| collection` filter honors
  `sort: 'date_desc'` / `'date_asc'`.
- Changing the Arch **Date format** theme setting changes how the date renders on the published item
  page and in the editor preview — **with no Liquid edit** — and never shows a time or the wrong day.
- The dashboard item list shows the publication date using the app date-format setting (date-only).
- Schema validation rejects: two `usedAsDate` fields, `usedAsDate` on a non-date field, and
  `date_*` sort with no `usedAsDate` field.
- Existing page output is byte-unchanged (no regression); `npm test`, `npm run test:frontend`,
  `npm run lint`, `npm run validate:all-locales` all pass.

---

## 9. Test plan

- **`server/tests/collections.test.js`** — `usedAsDate` validation (≤1, must be `date`,
  `date_*` requires it); `sortItems` `date_desc`/`date_asc` ordering and the missing-date→end rule.
- **`server/tests/collectionFilter.test.js`** — `'news' | collection: sort: 'date_desc'`.
- **Sanitization test** — `date` coercion: valid `YYYY-MM-DD` kept, `"2026-13-40"` / `"garbage"` / HTML → `""`.
- **`formatDateOnly` test** — timezone-safe (no day shift), each token renders correctly, empty → `""`.
- **Light `DateInput` vitest** — renders, emits `YYYY-MM-DD` on change.

---

## 10. Deliberately out of scope

- No change to the app/dashboard `general.dateFormat` setting or its formatter.
- Published dates do **not** follow the dashboard setting (theme setting owns published output).
- News `date` is not `required`.
- No preset-seeding change (the explicit date field removes the need to preserve `created`).
- No time-of-day / `datetime` variant (a separate `time` field could be added later if ever needed).
- Taxonomies / categories, author field — out (Phase 3 / not needed for a minimal blog).

---

## Implementation status

✅ **Implemented and verified.** `npm test` → 1335 passing, `npm run test:frontend` → 427
passing, `npm run lint` → clean, `npm run validate:all-locales` → clean (the lone
`class_schedule.empty` warning is pre-existing and unrelated). The shipped News schema validates
through `validateCollectionSchema` (`defaultSort` normalizes to `date_desc`).

**Post-review fix (P2 — invalid dates persisted/sorted as valid):** the write path
(`buildCollectionItemData`) now coerces a `date` field through `sanitizeDateValue` (a malformed
value like `"2026-13-40"` is stored as `""`, never raw), and `compareByDate` validates rather than
just checking non-empty, so any malformed value (legacy / hand-edited) sorts to the end instead of
as a giant date. Date is the one type coerced on write because it is a sort key — other types keep
the store-raw / sanitize-at-render model. Regression tests added in `collectionItems.test.js`.

**Deviation from §9 (test plan):** the "light DateInput vitest" was **not** added — the frontend
vitest environment is `node` only (no `@testing-library`/jsdom), so component-render tests aren't
supported, and adding that infra is out of scope. `DateInput` is a trivial controlled native
`<input type="date">`; its value path is covered by the `sanitizeDateValue` tests and the shared
`formatDateOnly` it relies on is covered by `dateUtils.test.js`.

**Recommended manual check (not automated):** render a News item end-to-end (editor preview +
export) — the article `template.liquid` follows Arch conventions and `format_date` is unit-tested,
but no automated test renders the template itself, so a one-time visual pass confirms the template +
filter + `date_format` setting all work together.

---

## See Also
- [Collections](core-collections.md) — collection schema, item pages, `| collection`, sorting.
- [Setting Types](theming-setting-types.md) — where the Date type will be documented.
- [Theming Guide](theming.md) — theme settings + Liquid filters.
