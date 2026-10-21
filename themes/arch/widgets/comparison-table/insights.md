# comparison-table

## Purpose

A feature matrix: plans, packages or product versions as columns, what each includes as rows, with ticks, crosses or short text in the cells. For helping a visitor pick the right tier once the headline prices are known.

`column` blocks define the options and can carry a `badge` and a button; `feature` blocks are the rows, each with a `values` list of one line per column, matched by position. A value of yes draws a tick, no or x draws a cross, anything else prints as text ("Up to 5 users"). One column can be `featured`: it gets accent borders and its button becomes the primary one. The button row appears only when at least one column has button text.

## When to use

- The detail section of a `pricing` or `services` page, directly after `pricing` cards that show the amounts, or on its own for packages without public prices.
- Good for two to four options and five to twelve rows. Bad for a single option (use `icon-list` or `features-split`), for long explanations (`accordion`) and for data that is not a comparison (`data-table`).
- Not a page opener.
- Sits well after `pricing`, before `accordion` (questions about the plans) and an `action-bar` that repeats the main call to action.
- Needs the option names, a benefit-worded label per row and a value for every cell; for the featured column, one short badge word and a button label.
- Fits service tiers (cleaning, maintenance, agencies), memberships (gyms, clubs, coworking), packages (venues, photographers, groomers), software plans and course levels.

## Pitfalls

- The `values` lines map to the columns by position: the first line is the first column, and so on. A missing line or an extra blank line shifts every value to the right, and an empty cell renders as a cross, which reads as "not included". Give every row exactly one line per column.
- On phones the table scrolls sideways. Two or three columns are comfortable, four is the practical limit, five or more cramp the cells.
- Mark one column `featured` at most, and give the `badge` to that column only; several badges cancel each other out.
- A wall of ticks and crosses is hard to scan. Put concrete text in the rows that decide the choice ("2 visits a month" against "Weekly") and keep the yes-or-no rows for extras.
- Cells are centred and narrow; keep values to a few words and feature names to a short phrase. Write them as benefits ("Priority support") rather than categories ("Support").
- Keep the row count under about twelve; fold minor items into one row ("Everything in Basic") and save the full breakdown for a dedicated page.
- Any scheme other than `standard-primary` makes a filled band that pads inside itself; the section below needs its own `top_spacing`.

## Recipes

### Three service packages

The classic tier table with the middle option featured and buttons to the `contact` page. Mix text values with ticks.

```json
{
  "type": "comparison-table",
  "settings": { "eyebrow": "Packages", "title": "What is included", "description": "Every package comes with the same careful team.", "heading_alignment": "center", "feature_column_label": "Included", "color_scheme": "standard-secondary" },
  "blocks": [
    { "type": "column", "settings": { "name": "Essential", "featured": false, "link": { "text": "Choose Essential", "href": "contact.html" } } },
    { "type": "column", "settings": { "name": "Complete", "badge": "Most popular", "featured": true, "link": { "text": "Choose Complete", "href": "contact.html" } } },
    { "type": "column", "settings": { "name": "Premium", "featured": false, "link": { "text": "Choose Premium", "href": "contact.html" } } },
    { "type": "feature", "settings": { "name": "Visits", "values": "Monthly\nFortnightly\nWeekly" } },
    { "type": "feature", "settings": { "name": "Kitchen and bathrooms", "values": "yes\nyes\nyes" } },
    { "type": "feature", "settings": { "name": "Same-day rescheduling", "values": "no\nno\nyes" } }
  ]
}
```

### Two tiers, left-aligned

A professional-services table in a data-sheet tone: two columns, no badge, text-heavy values, no buttons.

```json
{
  "type": "comparison-table",
  "settings": { "eyebrow": "Plans", "title": "Standard or full service", "heading_alignment": "start", "feature_column_label": "What you get" },
  "blocks": [
    { "type": "column", "settings": { "name": "Standard", "featured": false } },
    { "type": "column", "settings": { "name": "Full service", "featured": true } },
    { "type": "feature", "settings": { "name": "Response time", "values": "Within two working days\nSame day" } },
    { "type": "feature", "settings": { "name": "Monthly report", "values": "yes\nyes" } },
    { "type": "feature", "settings": { "name": "Named account manager", "values": "no\nyes" } },
    { "type": "feature", "settings": { "name": "Quarterly review meeting", "values": "no\nyes" } }
  ]
}
```

### Membership levels

Three membership tiers on a highlight surface as the decisive moment of the page; the family option is featured. Place a standard-surface section on either side.

```json
{
  "type": "comparison-table",
  "settings": { "eyebrow": "Membership", "title": "Choose your level", "heading_alignment": "center", "feature_column_label": "Benefits", "color_scheme": "highlight-secondary" },
  "blocks": [
    { "type": "column", "settings": { "name": "Individual", "featured": false, "link": { "text": "Join", "href": "contact.html" } } },
    { "type": "column", "settings": { "name": "Family", "badge": "Best value", "featured": true, "link": { "text": "Join", "href": "contact.html" } } },
    { "type": "column", "settings": { "name": "Corporate", "featured": false, "link": { "text": "Enquire", "href": "contact.html" } } },
    { "type": "feature", "settings": { "name": "Members included", "values": "1\nUp to 4\nUp to 20" } },
    { "type": "feature", "settings": { "name": "Classes per week", "values": "2\nUnlimited\nUnlimited" } },
    { "type": "feature", "settings": { "name": "Guest passes", "values": "no\n2 a month\n10 a month" } }
  ]
}
```
