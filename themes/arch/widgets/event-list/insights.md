# event-list

## Purpose

A vertical list of upcoming events, one card per row, each led by a large day-and-month badge, with the event name, a location line, an optional richtext description and a button. Use it for a handful of dated happenings: workshops, open days, gigs, classes, fundraisers.

The badge is the point: it tells visitors at a glance that this content is time-bound. Cards stack full-width, so the list grows tall quickly; it is a curated "next few" rather than a full calendar.

## When to use

- The main section of an `events` page, or a "what's on" block on the home page between the opener and the closing call to action.
- Good for: three to six dated events with a place and a short pitch; a one-evening programme (doors, dinner, auction) using the badge for times. Bad for: a weekly timetable (use `schedule-table` or `class-schedule`), a long archive, undated announcements (use `card-grid` or `news-grid`).
- It can open a page: its title becomes the page heading when first. It cannot sit under a header with `transparent_on_hero`; only `banner`, `slideshow` and `video-popup` support the transparent header.
- Natural neighbours: `banner` or `rich-text` above, `countdown` for the headline event, `map` or `contact-details` after, `action-bar` to close.
- Needs a day, a month and a title per event; location and description are optional. Three to five events feel curated; more than eight reads as a database dump.
- Fits venues, studios, gyms, schools, galleries, churches and community groups, restaurants with themed nights.

## Pitfalls

- Dates are typed text, not a calendar. Nothing hides an event once it has passed, so someone must remove or update the blocks; stale events are worse than none.
- Keep `day` to a number and `month` to a three-letter abbreviation. The badge is a fixed square; "15th" or "September" overflows it.
- The badge shows no year and no time. Put the time in `location` ("Main Hall, 7pm"), and for events far ahead put the year in the title or description.
- Button text is the signal: "Get Tickets", "RSVP", "Register" and "Learn More" set very different expectations. Leave the button text blank to hide the button entirely.
- Descriptions are optional. Leave them empty for an at-a-glance agenda; for events that need selling, one or two sentences is enough, since each card is a full row and long text makes the list very tall.
- On `standard-primary` the cards have no border or fill; `standard-secondary` and the highlight schemes outline each card, which helps on busy pages. Any scheme other than `standard-primary` pads the list inside its own coloured band, so `top_spacing` and `bottom_spacing` set to `none` remove that inner padding; under a filled hero use `small`.

## Recipes

### What's on

The default starting point: three events with place and time and a neutral button. The user supplies the dates, names, locations and links.

```json
{
  "type": "event-list",
  "settings": { "title": "Upcoming Events", "heading_alignment": "center", "color_scheme": "standard-primary" },
  "blocks": [
    { "type": "event", "settings": { "day": "12", "month": "Mar", "title": "Placeholder Event One", "location": "Main Hall, 7pm", "button_link": { "text": "Learn More", "href": "contact.html" } } },
    { "type": "event", "settings": { "day": "26", "month": "Mar", "title": "Placeholder Event Two", "location": "Studio Two, 10am", "button_link": { "text": "Learn More", "href": "contact.html" } } },
    { "type": "event", "settings": { "day": "9", "month": "Apr", "title": "Placeholder Event Three", "location": "Online", "button_link": { "text": "Learn More", "href": "contact.html" } } }
  ]
}
```

### Workshops with descriptions

Educational sessions where the pitch matters, on a soft surface with outlined cards. The user supplies a one- or two-sentence description per workshop.

```json
{
  "type": "event-list",
  "settings": { "eyebrow": "Workshops", "title": "Hands-On Sessions", "heading_alignment": "start", "color_scheme": "standard-secondary" },
  "blocks": [
    { "type": "event", "settings": { "day": "4", "month": "May", "title": "Introduction Workshop", "location": "Workshop Room, 6pm to 8pm", "description": "<p>Placeholder description of what participants will learn and take home.</p>", "button_link": { "text": "Reserve a Spot", "href": "contact.html" } } },
    { "type": "event", "settings": { "day": "18", "month": "May", "title": "Intermediate Workshop", "location": "Workshop Room, 6pm to 8pm", "description": "<p>Placeholder description of the follow-on session.</p>", "button_link": { "text": "Reserve a Spot", "href": "contact.html" } } }
  ]
}
```

### Minimal agenda

Dates, names and places only; no descriptions or buttons. The user supplies three to five entries.

```json
{
  "type": "event-list",
  "settings": { "title": "Schedule", "heading_alignment": "start", "color_scheme": "standard-primary" },
  "blocks": [
    { "type": "event", "settings": { "day": "3", "month": "Jun", "title": "Placeholder Session", "location": "Room A, 9am", "button_link": { "text": "", "href": "" } } },
    { "type": "event", "settings": { "day": "10", "month": "Jun", "title": "Placeholder Session", "location": "Room A, 9am", "button_link": { "text": "", "href": "" } } },
    { "type": "event", "settings": { "day": "17", "month": "Jun", "title": "Placeholder Session", "location": "Room B, 9am", "button_link": { "text": "", "href": "" } } }
  ]
}
```

### Highlighted gig calendar

A bold listing for a venue, docked under an image opener; add five to eight entries. The user supplies the acts, times and ticket links.

```json
{
  "type": "event-list",
  "settings": { "eyebrow": "Live Music", "title": "What's On", "heading_alignment": "center", "color_scheme": "highlight-secondary", "top_spacing": "small" },
  "blocks": [
    { "type": "event", "settings": { "day": "7", "month": "Oct", "title": "Placeholder Act", "location": "Doors 8pm", "button_link": { "text": "Get Tickets", "href": "contact.html" } } },
    { "type": "event", "settings": { "day": "14", "month": "Oct", "title": "Placeholder Act", "location": "Doors 8pm", "button_link": { "text": "Get Tickets", "href": "contact.html" } } }
  ]
}
```
