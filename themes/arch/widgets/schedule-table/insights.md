# schedule-table

## Purpose

Opening hours as a clean day-by-day table, with an optional sidebar for contact details or social links and an automatic highlight on today's row. Use it wherever visitors ask "when are you open": the `contact` page, a visit page, or the foot of the home page.

Each `day` block is one row (day on the left, hours on the right); a row marked `closed` shows the closed label instead of hours. `info` and `social` blocks fill a narrower sidebar beside the table; without them the table runs full width. The optional `note` is a small line under the last row for caveats.

## When to use

- A utility section, not a persuasion one. It sits late on a page: after `contact-details` or `map` on `contact`, or just before the footer on `index`.
- Good for shops, cafés, restaurants, clinics, salons, gyms, galleries, libraries, workshops: anyone with fixed weekly hours.
- Bad for timetables with several sessions a day or several rooms; use `class-schedule` or `event-list` for those. Bad for seasonal programmes with dates.
- It can open a page when it has a `title`, but only on a page whose whole subject is hours (a "visit" page). It never supports a transparent header; under `transparent_on_hero` open the page with `banner` or `rich-text` first.
- Natural neighbours: `contact-details`, `map`, `social-icons`, a closing `action-bar`.
- Needs five to seven `day` blocks and, ideally, one `info` block so the sidebar has something to say.

## Pitfalls

- The today highlight works by position, not by name: the first `day` block is treated as the first day of the week chosen in `week_start_day`, the second as the next day, and so on. List all seven days in order starting from that day, or the wrong row lights up. If you only list some days, turn `highlight_today` off.
- `week_start_day` must match the first block: `1` when the list starts with Monday, `0` when it starts with Sunday.
- Split shifts go in one row's `hours` text ("11:00–14:30 / 17:00–22:00"); duplicating a day as two blocks also breaks the highlight count.
- `closed` replaces the hours text, so anything typed in `hours` for that row is ignored. Edit `closed_text` only if the word should be translated or softened.
- `sidebar_position` has no effect without `info` or `social` blocks. On phones the sidebar drops below the table whichever side it is on.
- `social` draws the icons from the site's social settings (`instagram_url`, `facebook_url` and friends); it shows nothing until those are filled in and it cannot differ from the footer's icons.
- Keep `info` text to a title plus two or three short lines (address, phone, email, a booking link). Long paragraphs make the sidebar taller than the table.
- Functional content rarely earns a highlight surface. `highlight-primary` here competes with the page's real call to action; prefer `standard-primary` or `standard-secondary`.
- Filled schemes pad inside their own band, so `top_spacing` `none` on a filled table removes its inner padding rather than the gap to the section above. Use `none` only directly under an unfilled `rich-text` opener.

## Recipes

### Classic opening hours

The default arrangement: seven rows, contact details on the right, today highlighted. No images needed.

```json
{
  "type": "schedule-table",
  "settings": {
    "title": "Opening hours",
    "heading_alignment": "center",
    "note": "Closed on public holidays.",
    "sidebar_position": "end",
    "week_start_day": "1",
    "highlight_today": true,
    "color_scheme": "standard-primary"
  },
  "blocks": [
    { "type": "day", "settings": { "day": "Monday", "hours": "9:00 – 18:00" } },
    { "type": "day", "settings": { "day": "Tuesday", "hours": "9:00 – 18:00" } },
    { "type": "day", "settings": { "day": "Wednesday", "hours": "9:00 – 18:00" } },
    { "type": "day", "settings": { "day": "Thursday", "hours": "9:00 – 20:00" } },
    { "type": "day", "settings": { "day": "Friday", "hours": "9:00 – 18:00" } },
    { "type": "day", "settings": { "day": "Saturday", "hours": "10:00 – 14:00" } },
    { "type": "day", "settings": { "day": "Sunday", "hours": "", "closed": true } },
    { "type": "info", "settings": { "title": "Find us", "text": "<p>12 Example Street, Springfield</p><p>(555) 010-0100</p><p>hello@example.com</p>" } }
  ]
}
```

### Restaurant service hours

Lunch and dinner on one row each, a reservations box first so it is read before the hours, and a kitchen caveat in the note.

```json
{
  "type": "schedule-table",
  "settings": {
    "eyebrow": "Plan your visit",
    "title": "Hours and reservations",
    "heading_alignment": "start",
    "note": "The kitchen closes thirty minutes before we do.",
    "sidebar_position": "start",
    "week_start_day": "1",
    "color_scheme": "standard-secondary"
  },
  "blocks": [
    { "type": "day", "settings": { "day": "Monday", "hours": "", "closed": true } },
    { "type": "day", "settings": { "day": "Tuesday", "hours": "12:00 – 14:30 / 18:00 – 22:00" } },
    { "type": "day", "settings": { "day": "Wednesday", "hours": "12:00 – 14:30 / 18:00 – 22:00" } },
    { "type": "day", "settings": { "day": "Thursday", "hours": "12:00 – 14:30 / 18:00 – 22:00" } },
    { "type": "day", "settings": { "day": "Friday", "hours": "12:00 – 14:30 / 18:00 – 23:00" } },
    { "type": "day", "settings": { "day": "Saturday", "hours": "12:00 – 23:00" } },
    { "type": "day", "settings": { "day": "Sunday", "hours": "12:00 – 16:00" } },
    { "type": "info", "settings": { "title": "Reservations", "text": "<p>Call (555) 010-0100 or <a href=\"contact.html\">book a table online</a>.</p>" } }
  ]
}
```

### Hours with social links

A compact block for a café or shop that lives on social media: the hours, one line of address, then the icon row from the site's social settings.

```json
{
  "type": "schedule-table",
  "settings": {
    "title": "When we are open",
    "description": "Pop in, or follow along for daily specials.",
    "heading_alignment": "center",
    "note": "",
    "sidebar_position": "end",
    "week_start_day": "1",
    "color_scheme": "standard-primary"
  },
  "blocks": [
    { "type": "day", "settings": { "day": "Monday", "hours": "7:30 – 16:00" } },
    { "type": "day", "settings": { "day": "Tuesday", "hours": "7:30 – 16:00" } },
    { "type": "day", "settings": { "day": "Wednesday", "hours": "7:30 – 16:00" } },
    { "type": "day", "settings": { "day": "Thursday", "hours": "7:30 – 16:00" } },
    { "type": "day", "settings": { "day": "Friday", "hours": "7:30 – 18:00" } },
    { "type": "day", "settings": { "day": "Saturday", "hours": "8:30 – 18:00" } },
    { "type": "day", "settings": { "day": "Sunday", "hours": "9:00 – 15:00" } },
    { "type": "info", "settings": { "title": "Where", "text": "<p>Corner of Example Street and Sample Avenue.</p>" } },
    { "type": "social", "settings": {} }
  ]
}
```
