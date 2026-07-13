# Table Widget — Insights

A generic content table for rows-and-columns information: rate sheets, tuition tables, size charts, service details, seasonal prices. Each row is a `row` block; the number of columns (2-4) is a widget setting, kept low so tables stay readable on phones.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---|---|---|
| `eyebrow` | Any text (blank by default) | Small label above the headline; adds a category/context line |
| `eyebrow_uppercase` | `true` / `false` (default) | Uppercases the eyebrow text for a more formal label treatment |
| `title` | Any text (default "Rates") | Main headline; renders as h1 when the widget is first on the page, h2 otherwise |
| `description` | Any text (blank by default) | Paragraph beneath the headline for extra context |
| `heading_alignment` | `start`, `center` (default) | Controls whether the eyebrow/title/description block is left-aligned or centered |
| `columns` | `2` (default), `3`, `4` | How many columns render. Row cells beyond this count are kept but not shown |
| `show_header` | `true` (default) / `false` | Toggles the bold header row. Turn off for plain key-value sheets |
| `column_1_header` … `column_4_header` | Any text (defaults "Service" / "Price" / blank / blank) | Header labels for each rendered column |
| `note` | Any text (blank by default) | Small muted footnote below the table ("Prices include VAT") |
| `style` | `lines` (default), `striped`, `plain` | `lines`: hairline row dividers with a strong header underline. `striped`: zebra rows. `plain`: no dividers at all |
| `first_column_emphasis` | `true` (default) / `false` | Bolds the first column in heading color, like a spec sheet's label column |
| `align_last_column` | `start` (default), `end` | `end` right-aligns the last column — use it whenever the last column is a price or number |
| `content_width` | `narrow`, `medium` (default), `wide` | Table container width via the theme's `widget-content-sm/md/lg` classes. Narrow reads best for 2-column tables |
| `color_scheme` | `standard-primary`, `standard-secondary`, `highlight-primary`, `highlight-secondary` | Background and text theming; non-standard schemes add padded container |
| `top_spacing` / `bottom_spacing` | `auto` (default), `small`, `none` | Section spacing rhythm controls |

---

## Available Blocks

| Block Type | Key Settings | Notes |
|---|---|---|
| `row` | `cell_1`, `cell_2`, `cell_3`, `cell_4` (all text) | One table row. `cell_1` and `cell_2` always render; `cell_3` shows when `columns` is 3+, `cell_4` when `columns` is 4. Cells beyond the active column count are kept but hidden, so lowering the column count never destroys data. |

Column **headings** live in the widget settings (`column_1_header` …), not in the blocks — they are a single non-repeating row. Column **cells** live in each `row` block.

---

## When to Use This Widget (and When Not To)

- **Prices attached to named dishes/services with descriptions** → use `priced-list` (it's menu-shaped).
- **"Pick a plan" with per-plan buttons and a featured column** → use `comparison-table` or `pricing`.
- **Opening hours** → use `schedule-table` (it highlights today automatically).
- **Everything else tabular** → this widget. If you're tempted to fake a table with stacked text widgets or a richtext blob, this is the tool.

---

## Layout Recipes

### 1. Simple Rate Sheet

- **Blocks:** 4-6 `row` blocks, `cell_1` = service, `cell_2` = price
- **Settings:** `columns: 2`, headers "Service" / "Price", `align_last_column: end`, `style: lines`, `content_width: narrow`, `note: "Prices include VAT"`
- **Good for:** Trades, salons, cleaners — any flat list of services with one price each.

### 2. Prices by Size or Length

- **Blocks:** `row` blocks with `cell_1` = service and `cell_2`/`cell_3`/`cell_4` = per-size prices
- **Settings:** `columns: 3` or `4`, headers like "Service" / "Small" / "Medium" / "Large", `align_last_column: end`, `style: striped`
- **Good for:** Dog grooming by breed size, hair services by length, portion sizes. The classic case a one-price-per-line list can't express.

### 3. Tuition / Program Table

- **Blocks:** `row` blocks, `cell_1` = program, `cell_2` = schedule, `cell_3` = monthly rate
- **Settings:** `columns: 3`, headers "Program" / "Schedule" / "Monthly rate", `style: lines`, `first_column_emphasis: true`
- **Good for:** Daycares, studios, gyms with programs that differ by age group or schedule.

### 4. Key-Value Info Sheet

- **Blocks:** `row` blocks, `cell_1` = label, `cell_2` = value
- **Settings:** `columns: 2`, `show_header: false`, `style: plain` or `lines`, `content_width: narrow`, `heading_alignment: start`
- **Good for:** "Good to know" blocks — parking, minimum age, deposits, cancellation policy. Reads like a structured fact list, not a data table.

### 5. Seasonal Rates

- **Blocks:** `row` blocks, `cell_1` = room, `cell_2` = low-season price, `cell_3` = high-season price
- **Settings:** `columns: 3`, headers "Room" / "Low season" / "High season", `align_last_column: end`, `color_scheme: standard-secondary`
- **Good for:** Hotels, rentals, venues with date-dependent pricing.

---

## Differentiation Tips

- **Right-align the last column whenever it holds numbers.** Ragged-left prices are the single biggest "amateur table" tell.
- **Narrow width for 2 columns.** A two-column table stretched across the full container puts half a page of dead air between label and value.
- **Striped style needs the primary color scheme.** On `standard-secondary` the stripe color matches the background and disappears — use `lines` there instead.
- **Don't exceed ~10 rows without a note or grouping.** Two shorter tables with their own titles scan better than one long one.
- **Cells are plain text only.** No links, bold, or line breaks inside cells — if a cell wants formatting, the content probably belongs in a different widget.
- **3- and 4-column tables scroll sideways on phones.** That's expected and fine, but keep cell text short so most of the table fits without scrolling.
