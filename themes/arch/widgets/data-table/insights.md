# data-table

## Purpose

A plain rows-and-columns table for information that is naturally tabular: rate sheets, prices by size, tuition by programme, size charts, seasonal rates, "good to know" fact sheets. Two to four columns, an optional header row and a small footnote underneath.

Each `row` block is one table row; the column headings live in the section settings, not in the blocks. The table sits inside a chosen content width under the usual heading group, so it reads as a tidy sheet rather than a full-width spreadsheet.

## When to use

- Mid-page on a `pricing`, `services`, `tuition` or `visit` page, after the section that explains the offer and before an `action-bar` or `accordion`.
- Good for: one price per service, prices that vary by size or length, programme/schedule/rate rows, key-value fact sheets. Bad for: dishes or services with descriptions (use `priced-list`), "pick a plan" with buttons and a featured column (use `comparison-table` or `pricing`), opening hours (use `schedule-table`, which highlights today).
- It can open a page, but rarely should: lead with a `rich-text` or `split-content` title section and let the table follow.
- Natural neighbours: `rich-text` above, `accordion` or `action-bar` below, a second table with its own title when one would run long.
- Needs three to ten rows. Two shorter tables with their own titles scan better than one long one.
- Fits trades, salons, groomers, clinics, schools and studios, hotels and rentals, venues.

## Pitfalls

- Set `align_last_column` to `end` whenever the last column holds prices or numbers. Ragged-left figures are the clearest sign of an amateur table.
- Match `content_width` to the column count: `narrow` for two columns (full width puts half a page of air between label and value), `medium` for three, `wide` or `fullwidth` only for four columns of real text.
- Cells beyond the chosen `columns` are kept but not shown, so lowering the count never destroys data; raising it reveals whatever was typed there earlier. Fill `column_3_header` and `column_4_header` when you add columns, or the header row has blank cells.
- `striped` draws its stripes in the page's secondary colour, so on `standard-secondary` and `highlight-secondary` the stripes merge with the band and vanish. Use `lines` there.
- Three- and four-column tables scroll sideways on phones. That is expected, but keep cell text short so most of the table fits without scrolling.
- Cells are plain text: no links, bold or line breaks. If a cell wants formatting, the content belongs in a different section.
- `first_column_emphasis` bolds the first column like a label column; turn it off when the first column is just another value. Turn `show_header` off for key-value sheets.
- Any scheme other than `standard-primary` pads the table inside its own coloured band, so `top_spacing` and `bottom_spacing` set to `none` remove that inner padding; under a filled section use `small`. A utility table almost always belongs on a standard surface.

## Recipes

### Simple rate sheet

One price per service, right-aligned, narrow. The user supplies the service names, prices and the footnote.

```json
{
  "type": "data-table",
  "settings": { "title": "Rates", "columns": "2", "column_1_header": "Service", "column_2_header": "Price", "note": "Placeholder note about what prices include.", "style": "lines", "align_last_column": "end", "content_width": "narrow" },
  "blocks": [
    { "type": "row", "settings": { "cell_1": "Service one", "cell_2": "$00" } },
    { "type": "row", "settings": { "cell_1": "Service two", "cell_2": "$00" } },
    { "type": "row", "settings": { "cell_1": "Service three", "cell_2": "$00" } },
    { "type": "row", "settings": { "cell_1": "Service four", "cell_2": "$00" } }
  ]
}
```

### Prices by size

The classic case a one-price list cannot express: the same service at three sizes or lengths. The user supplies the services and a price per size.

```json
{
  "type": "data-table",
  "settings": { "eyebrow": "Pricing", "title": "Grooming by Size", "columns": "4", "column_1_header": "Service", "column_2_header": "Small", "column_3_header": "Medium", "column_4_header": "Large", "style": "striped", "align_last_column": "end", "content_width": "medium", "color_scheme": "standard-primary" },
  "blocks": [
    { "type": "row", "settings": { "cell_1": "Bath and brush", "cell_2": "$00", "cell_3": "$00", "cell_4": "$00" } },
    { "type": "row", "settings": { "cell_1": "Full groom", "cell_2": "$00", "cell_3": "$00", "cell_4": "$00" } },
    { "type": "row", "settings": { "cell_1": "Nail trim", "cell_2": "$00", "cell_3": "$00", "cell_4": "$00" } }
  ]
}
```

### Programme and schedule table

Programme, when it runs, what it costs per month; the label column stays emphasised. The user supplies the programmes, schedules and rates.

```json
{
  "type": "data-table",
  "settings": { "title": "Programmes", "heading_alignment": "start", "columns": "3", "column_1_header": "Programme", "column_2_header": "Schedule", "column_3_header": "Monthly rate", "style": "lines", "first_column_emphasis": true, "align_last_column": "end", "content_width": "medium" },
  "blocks": [
    { "type": "row", "settings": { "cell_1": "Toddlers", "cell_2": "Mon, Wed, Fri mornings", "cell_3": "$00" } },
    { "type": "row", "settings": { "cell_1": "Preschool", "cell_2": "Mon to Fri, half day", "cell_3": "$00" } },
    { "type": "row", "settings": { "cell_1": "After school", "cell_2": "Mon to Fri, 3pm to 6pm", "cell_3": "$00" } }
  ]
}
```

### Good-to-know fact sheet

A headerless key-value sheet for practical details such as parking, minimum age or deposits. The user supplies the labels and values.

```json
{
  "type": "data-table",
  "settings": { "title": "Good to Know", "heading_alignment": "start", "columns": "2", "show_header": false, "style": "plain", "content_width": "narrow" },
  "blocks": [
    { "type": "row", "settings": { "cell_1": "Parking", "cell_2": "Free on site" } },
    { "type": "row", "settings": { "cell_1": "Minimum age", "cell_2": "16" } },
    { "type": "row", "settings": { "cell_1": "Deposit", "cell_2": "Placeholder policy" } },
    { "type": "row", "settings": { "cell_1": "Cancellations", "cell_2": "24 hours notice" } }
  ]
}
```

