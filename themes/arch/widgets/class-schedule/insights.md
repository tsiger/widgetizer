# class-schedule

## Purpose

A weekly timetable of classes grouped by day, for gyms, yoga and dance studios, martial arts schools, swim schools, community centres and music or language schools. Each `class` block is one session with a day, a start time, a duration, a name, an instructor, a level and an optional booking button.

Three layouts: `tabs` shows one day at a time and opens on today; `accordion` lists the days as collapsible groups with the first one open; `list` prints the whole week down the page. A session row reads time and duration on the left, name, instructor and level badge in the middle, the booking button on the right. A footer `note` closes the section.

## When to use

- The core of a schedule or classes page, or the second section of a studio homepage after the hero.
- Good for recurring weekly sessions. Bad for one-off dates (use `event-list`), for opening hours (`schedule-table`, `contact-details`) and for programmes without fixed times (`services-grid`).
- Not a page opener; give the page a `banner` or `rich-text` title first.
- Sits well after `banner` or `split-content`, next to `pricing` (memberships), `profile-grid` (instructors) and `accordion` (what to bring), before an `action-bar` that links to booking.
- Needs every weekly session as a block, already in time order within each day; a short class name, a consistent time format and a real booking link if the button stays on.
- Utility content, so it belongs on `standard-primary` or `standard-secondary`; a highlight surface for a timetable is almost never right.

## Pitfalls

- Rows render in block order, not sorted by time. Enter the sessions of each day from earliest to latest, or the day reads out of sequence.
- Time and duration are free text. Pick one style ("6:00 AM" or "18:00") and keep it for every block; mixed formats look careless in a column of numbers.
- `default_day: today` falls back to the first day with classes when today has none. With `hide_empty_days` off, empty days show as disabled tabs or as a day with the `empty_text` line, so set that text.
- `tabs` hides six sevenths of the week; it suits busy studios with many sessions a day. `list` suits small timetables and printing but grows very long beyond about thirty sessions; `accordion` sits between the two.
- The level badge shows only for `beginner`, `intermediate` and `advanced`; `all-levels` is treated as the default and prints nothing. `advanced` gets a filled accent badge, so a page full of advanced classes looks loud.
- `show_book_button` applies to every row; a class whose `book_link` has no address sends the visitor nowhere. Either give every block a link (the `contact` page is a fair default) or turn the button off.
- Any scheme other than `standard-primary` makes a filled band that pads inside itself; the section below needs its own `top_spacing`.

## Recipes

### Tabbed gym week

Busy studio with several sessions a day; one tab per day, opening on today, booking buttons to the `contact` page. Enter every weekly session in time order; the example shows one Monday.

```json
{
  "type": "class-schedule",
  "settings": { "eyebrow": "Schedule", "eyebrow_uppercase": true, "title": "Weekly classes", "description": "Book a spot or just turn up ten minutes early.", "layout": "tabs", "week_start_day": "monday", "default_day": "today", "hide_empty_days": false, "empty_text": "No classes today.", "note": "Holiday changes are posted at the front desk." },
  "blocks": [
    { "type": "class", "settings": { "day": "monday", "time": "6:30 AM", "duration": "45 min", "title": "Morning strength", "instructor": "Coach A.", "level": "all-levels", "description": "Barbell basics with a warm-up and cool-down.", "book_link": { "text": "Book", "href": "contact.html" } } },
    { "type": "class", "settings": { "day": "monday", "time": "6:00 PM", "duration": "60 min", "title": "Boxing fundamentals", "instructor": "Coach B.", "level": "beginner", "description": "Footwork, guard and pad rounds.", "book_link": { "text": "Book", "href": "contact.html" } } }
  ]
}
```

### Full week list

A small yoga studio prints the whole week with levels and no booking buttons. Days without classes are hidden.

```json
{
  "type": "class-schedule",
  "settings": { "eyebrow": "Timetable", "title": "This week at the studio", "heading_alignment": "start", "layout": "list", "week_start_day": "monday", "hide_empty_days": true, "show_book_button": false, "show_description": false, "note": "Mats and blocks are provided.", "color_scheme": "standard-secondary" },
  "blocks": [
    { "type": "class", "settings": { "day": "tuesday", "time": "9:00 AM", "duration": "75 min", "title": "Slow flow", "instructor": "Teacher A.", "level": "beginner", "book_link": { "text": "", "href": "" } } },
    { "type": "class", "settings": { "day": "saturday", "time": "10:00 AM", "duration": "90 min", "title": "Deep stretch", "instructor": "Teacher A.", "level": "all-levels", "book_link": { "text": "", "href": "" } } }
  ]
}
```

### Collapsible community programme

A community centre or music school with mixed activities: days as collapsible groups, no level badges, descriptions on.

```json
{
  "type": "class-schedule",
  "settings": { "eyebrow": "Programme", "title": "Weekly activities", "layout": "accordion", "week_start_day": "monday", "hide_empty_days": true, "show_level": false, "show_duration": true, "show_description": true, "empty_text": "" },
  "blocks": [
    { "type": "class", "settings": { "day": "monday", "time": "4:00 PM", "duration": "60 min", "title": "Children's choir", "instructor": "", "level": "all-levels", "description": "Ages 7 to 11. No audition needed.", "book_link": { "text": "Enquire", "href": "contact.html" } } },
    { "type": "class", "settings": { "day": "thursday", "time": "7:00 PM", "duration": "90 min", "title": "Life drawing", "instructor": "", "level": "all-levels", "description": "Materials included.", "book_link": { "text": "Enquire", "href": "contact.html" } } }
  ]
}
```
