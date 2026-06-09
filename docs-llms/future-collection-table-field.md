# Future: `table` collection setting type (uniform repeating rows)

> **Status: ✅ Implemented (v1).** A `table` field for collection-type schemas: an
> ordered list of rows, each with a fixed set of typed **columns** declared in the schema.
> Shipped: registration, `columns` schema validation, `sanitizeTableValue`, column-aware
> defaults/required, `TableInput`, and the Aegean rates migration (accommodation + excursion).
> Backend 1322 / frontend green. The author-facing reference is in
> [`theming-setting-types.md`](theming-setting-types.md). The sections below are retained as the
> design/implementation record.
>
> **v1 ships `text`-only columns**; more column types (`number`, `select`, `checkbox`, `link`, …)
> are added **incrementally** — the design is per-column-type so each addition is small and
> localized. First driver: the Aegean accommodation **Rates** table (today a `textarea` of
> pipe-delimited `Season | Price` lines — fragile, and users don't know what `|` means). This is
> the narrow uniform-rows take on §10's deferred "generic repeater" in
> [`future-gallery-setting-type.md`](future-gallery-setting-type.md) — *not* the heterogeneous
> block repeater (still deferred). Written for the reviewing agent; every touchpoint has a
> `file:line` reference reconciled against current code. **All open decisions from review round 1
> are now resolved (§12).**

## 1. Motivation

`gallery` was the first array-shaped collection value (`string[]`). `table` is the next: an array
of **row objects**, where each row has the same author-declared columns. It replaces delimited text
and fixed-N field hacks (`rates_1`, `rates_2`, …) with a real editable grid — add / reorder / delete
rows, each cell a proper input; the user never types a separator. With v1's text-only columns this
is, structurally, **`gallery` with named string cells instead of one path** — so it reuses the same
patterns and stays small.

## 2. Value shape

An ordered array of **row objects**, keyed by column `id`. In v1 every cell is a string:

```json
"rates": [
  { "season": "Low season",  "period": "Apr–May, Oct", "price": "€320" },
  { "season": "Mid season",  "period": "Jun, Sep",     "price": "€420" },
  { "season": "High season", "period": "Jul–Aug",      "price": "€560" }
]
```

(When `number` lands as a column type, `price` becomes a real number — §13. v1: text.) Empty value
is `[]`; row order is authored (drag-to-reorder), preserved on save.

## 3. Schema shape

```json
{
  "type": "table",
  "id": "rates",
  "label": "Rates",
  "columns": [
    { "id": "season", "type": "text", "label": "Season" },
    { "id": "period", "type": "text", "label": "Period" },
    { "id": "price",  "type": "text", "label": "Price" }
  ]
}
```

Each **column is a mini setting definition** (`id`, `type`, `label`). **v1 column type: `text`
only.** The `type` field exists from day one so new types slot in without a schema change (§13).

## 4. Scope: collection-only backend, honestly "generally renderable"

`table`'s full pipeline (validation, sanitization, required) is wired for **collection items only**
in v1 — that's where the Rates need lives, and it keeps the work off the widget/theme sanitizers.
**But be honest (decision #1, resolved):** `SUPPORTED_SETTING_TYPES` has a *single* consumer — the
collection schema validator ([`collectionService.js:75`](server/services/collectionService.js)) —
and `SettingsRenderer` dispatches on `type` without consulting it. So once `SettingsRenderer` has a
`case "table"`, the field is **generally renderable** in any schema's editor; there is no clean
renderer-level gate. A `table` placed in a widget/theme schema would render but skip the
collection-only normalization/required checks. **No security gap** — v1 cells are `text`
(autoescaped). Widget/theme backend support (their sanitizers + required paths get a `table` branch)
is a documented follow-on, not a v1 gate. (A collection-only allowlist keeping `table` out of the
shared list was considered and rejected: with one list consumer and no renderer gate, it'd be
cosmetic.)

## 5. Registration

Add `"table"` to `SUPPORTED_SETTING_TYPES`
([`supportedSettingTypes.js:12`](src/components/settings/supportedSettingTypes.js)) so the collection
validator accepts it. It is **not** a `multiple`/`repeater`/`blocks` key (those stay in
`DISALLOWED_SETTING_KEYS`, [`collectionService.js:32`](server/services/collectionService.js)).

## 6. Schema validation — the one substantial new validator

[`validateCollectionSchema`](server/services/collectionService.js) (`:42`) currently only checks
each field's `type` is supported (`:75`) and rejects `DISALLOWED_SETTING_KEYS` (`:78`). `table` needs
**structural** validation of its `columns` (new):

- `columns` is a **non-empty array**; each column is an object with a string `id` and a `type`.
- Column `id`s are **unique**, **non-empty**, and match a safe pattern (`^[a-zA-Z][a-zA-Z0-9_]*$` —
  like existing setting ids), and are **not** reserved object keys (`__proto__`, `constructor`,
  `prototype`). They become row-object keys *and* Liquid accessors (`{{ r.<id> }}`), so a weird/
  dangerous id is both a prototype-pollution risk when building row objects and a broken template
  accessor — reject at schema-validation time.
- Each column `type` ∈ a new `ALLOWED_TABLE_COLUMN_TYPES` set — **`{ "text" }` in v1**. A *set* (not
  `=== "text"`) is the extension point: adding `number` later is one entry here + its cell wiring
  (§8). It also blocks nested arrays (`gallery`/`table`) and heavy editors (`richtext`/`code`) as
  cells, for free.
- A `table` setting **cannot** be `usedAsTitle` (stays a `text`-only rule, `:83`).

(Validation is about *shape*; cell-value integrity is the sanitizer's job, §7.2 — same split as
gallery `src`.)

## 7. Backend pipeline

### 7.1 Defaults / required — required is **column-aware**
- `emptyDefaultForType` (`:269`): `case "table": return [];` (mirrors `gallery`).
- **Required must inspect only DECLARED column ids**, so the check needs the columns — not just the
  type. The call sites already have the full `setting` in scope (`isMissingValue(value, setting.type)`
  at [`:377`](server/services/collectionService.js) and [`:652`](server/services/collectionService.js),
  plus `normalizeCollectionItem`), so thread the columns through: e.g. `isMissingValue(value, setting)`
  or `(value, type, columns)`. Rule (decision #3, resolved): a required `table` is **missing** unless
  **≥1 row has, in a *declared* column, a cell where `String(cell).trim() !== ""`** — so a
  whitespace-only `" "` cell does **not** satisfy required. This must be column-aware because stale/
  unknown row keys (which the sanitizer drops, §7.2) must **not** satisfy required. Update the
  frontend `CollectionItemForm` check too (§8).

### 7.2 Sanitization — a dedicated `table` helper (text needs explicit normalization)
Add a `table` branch to `sanitizeCollectionItemData`'s value path, backed by a new helper
`sanitizeTableValue(value, columns)` (sibling of `sanitizeGalleryValue`). It:
1. non-array → `[]` (handled before the null guard, like `gallery`/`image`);
2. for each row, build a fresh object containing **only the declared column ids** (drops stale/
   unknown keys — and since declared ids are validated safe (§6), reading `row[colId]` for those ids
   only also neutralizes any `__proto__`/`constructor` key smuggled into stored row data: it's never
   read or copied);
3. normalize each cell by its column type (v1 text: `typeof cell === "string" ? cell : ""`);
4. **drop fully-empty rows** — every declared cell is blank, where *blank* means
   `String(cell).trim() === ""` (so a row of whitespace-only cells is dropped) — exactly as
   `GalleryInput`/`sanitizeGalleryValue` drop blank entries (decision #2, resolved: drop empties;
   blank rows stay editor-local only).

> **Bug the review caught — text is NOT coerced by `sanitizeSettingValue`.** It returns text
> untouched ([`sanitizationService.js:132`](server/services/sanitizationService.js),
> `default: return value`) because text is handled by Liquid autoescape, not sanitization. So a
> stray non-string cell (number/object/null from hand-edit/import) would pass through. The table
> helper therefore normalizes text cells **explicitly**: `typeof cell === "string" ? cell : ""`.

> **Forward-extensible:** when richer column types arrive, their cells delegate to the existing
> sanitizers inside this helper's per-column-type switch (`link` → `sanitizeLink`, `richtext` →
> `sanitizeRichText`, …). `text` is the lone type needing explicit handling because it has no sanitizer.

The helper needs the column defs; `sanitizeCollectionItemData` has the schema, so it resolves
`columns` there (decision #4, resolved: columns come from the schema, not `sanitizeSettingValue`'s
signature).

### 7.3 Link resolution — NOT needed in v1 (forward note)
[`resolveCollectionItemLinks`](server/services/collectionService.js) (`:999`) walks **only top-level**
settings (`:1002`); its JSDoc says *"v1 schemas are flat… repeaters arrive in Phase 3+"*. Text-only
columns have no link cells, so **no change now**. ⚠️ **When a `link` column is added**, extend this
walker to recurse table rows and resolve each `link` cell via `resolveLink` (`:966`), using the
schema to find link columns. Captured here so it isn't missed — it's the main reason `link` was held
out of v1.

### 7.4 Media-usage — no change
`collectMediaPaths` ([`mediaUsageService.js:27`](server/services/mediaUsageService.js)) already
recurses arrays + objects. Text cells carry no media; when media-bearing columns arrive the existing
walker picks them up with no change.

### 7.5 Render
The array of row objects passes through `prepareCollectionItemForRender` (`:1031`) and the
`| collection` filter unchanged — same pass-through `gallery` gets.

## 8. Frontend

**New `TableInput.jsx`** — mirror [`GalleryInput.jsx`](src/components/settings/inputs/GalleryInput.jsx):
stable per-row `uid`s (dnd-kit sortable id + React key), `@dnd-kit` reorder, add/remove, and the
commit-on-real-change logic (blank rows stay editor-local, never committed — §7.2). Each row renders
**one cell-input per column**. In v1 that's a `TextInput` per column, **directly** — decision #5,
resolved: do **not** factor a generic `renderSettingInput` out of `SettingsRenderer` yet; render
`TextInput` directly and do the factor-out when the 2nd column type lands.

**Wiring:** `case "table"` in `SettingsRenderer` → `TableInput`; barrel export
([`inputs/index.js`](src/components/settings/inputs/index.js)). Make `CollectionItemForm`'s
`isMissingValue` ([`:21`](src/components/collections/CollectionItemForm.jsx)) column-aware for tables
to match the backend rule (§7.1) — its generic `length === 0` array branch would otherwise count a
row of stale keys as present.

## 9. Render (Liquid)

```liquid
<table>
  {% for r in item.settings.rates %}
    <tr><td>{{ r.season }}</td><td>{{ r.period }}</td><td>{{ r.price }}</td></tr>
  {% endfor %}
</table>
```

All cells are autoescaped strings.

## 10. Aegean migration (throwaway test theme)

Convert the pipe `textarea` rates field to a `table` — schema `columns` + the `{% for %}` template
loop + rewrite the preset items' `rates` value to row objects. **Both** collection types carry the
same pipe-delimited rates, so migrate **accommodation *and* excursion** together (the gallery
migration set the precedent of doing both rather than leaving the theme half-converted). Disposable
data — a content edit, not a runtime migration — but it makes the feature real and manually testable.

## 11. Tests

- **Schema validation** — accepts a `table` with valid `text` columns; rejects: missing/empty
  `columns`, a non-allowlist column `type` (`number` *until added*, `gallery`, `richtext`), duplicate
  column ids, **invalid column ids (empty, `__proto__`/`constructor`/`prototype`, or non-pattern)**,
  `usedAsTitle` on a table.
- **Sanitization** (`sanitizeCollectionItemData`) — non-array → `[]`; rows keyed to declared column
  ids; **unknown/stale keys dropped** (incl. a smuggled `__proto__` row key — ignored, not copied,
  no prototype pollution); non-string cells → `""`; **fully-empty rows dropped, including
  whitespace-only-cell rows** (`" "` → trimmed-blank → dropped).
- **Defaults / required** — missing table → `[]`; a `required` table is invalid when `[]`, when all
  rows are all-empty, **when a row holds only an undeclared key**, **and when a row's only declared
  cell is whitespace-only** (`" "`) (proves the `trim()`-based, column-aware rule); valid with ≥1
  declared cell that is non-blank after `trim()`.
- **Render** — `| collection` round-trips a table and the `{% for %}` loop emits cells.

## 12. Decisions (resolved in review round 1)

1. **Scope/gate** — add to `SUPPORTED_SETTING_TYPES`; honestly *generally renderable*, backend wired
   for collections only; no security gap (text autoescaped). §4.
2. **Empty rows** — **drop** fully-empty rows; blank rows stay editor-local only (like `GalleryInput`). §7.2.
3. **Required rule** — valid only when ≥1 *declared* cell has non-empty text; **column-aware**. §7.1.
4. **Sanitizer/required get columns from the schema** (in `sanitizeCollectionItemData` /
   the required call sites), not via `sanitizeSettingValue`'s signature. §7.1–§7.2.
5. **Cell rendering** — `TextInput` directly in v1; no `renderSettingInput` factor-out yet. §8.

## 13. Out of scope / the incremental roadmap

v1 is `text`-only. Added **as we go**, each a small change at the same extension points
(`ALLOWED_TABLE_COLUMN_TYPES` §6, the cell-input map §8, the per-column-type switch in
`sanitizeTableValue` §7.2):
- `number`, `select` (needs per-column `options`), `checkbox` — simple scalar cells.
- `link` — needs the §7.3 `resolveCollectionItemLinks` extension (the one with backend weight).
- Tier-2: `image` (reuses the new `ImageInput` row layout), `icon`, `color`.

Still deferred beyond this field: the **heterogeneous block repeater** (rows that are *different*
block types) and **general-purpose `table`** in widgets/theme.

## See Also
- [Gallery setting type](future-gallery-setting-type.md) — the first array value; the precedent this mirrors.
- [Collections](core-collections.md) — schema rules, item data model, `| collection` filter, link resolution.
- [Setting Types Reference](theming-setting-types.md) — where `table` gets documented on ship.
