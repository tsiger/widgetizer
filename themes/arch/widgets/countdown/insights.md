# countdown

## Purpose

A timer that counts down to one moment: an opening, a launch, a sale ending, a registration deadline. It shows days, hours, minutes and optionally seconds under a heading, with room for a short richtext note and one button; once the moment passes, the digits are replaced by an expiry message.

The whole block is centred by default. `cards` puts each unit in its own bordered box, which reads as a self-contained section; `minimal` shows large bare numbers separated by colons, which sits quietly between other content.

## When to use

- A short, urgent moment on a home page or landing page, above the main call to action or directly under an opener.
- Good for: grand openings, seasonal menus, enrolment cut-offs, event registration, a new location. Bad for: anything without a real date, dates more than a few months out, and recurring weekly events (use `event-list` or `schedule-table`).
- It can open a page: its title becomes the page heading when it is first. It cannot sit under a header with `transparent_on_hero`; only `banner`, `slideshow` and `video-popup` support the transparent header. A `banner` can also carry a countdown of its own when the timer should sit on an image.
- Natural neighbours: `banner` or `rich-text` above, `action-bar`, `event-list` or `pricing` below, `trust-bar` after it.
- Needs almost no content: an eyebrow, a title, one line of description, a button label and the date.
- Fits shops, restaurants, gyms, studios, schools, venues, nonprofits with a campaign.

## Pitfalls

- `target_date` is read by the visitor's browser in the visitor's local time zone. Write it as `2027-06-01 18:00`; a date without a time counts down to midnight, and wording such as "6pm" or a month name is not understood and the timer never starts.
- The section stays on the page after the date passes. A dead timer with no next step wastes prime space: write an `expired_message` that drives the next action ("Doors are open, book your first visit") and keep the `button` pointing somewhere useful afterwards, or remove the section on the day.
- Turn `show_seconds` off for dates more than a week away. Seconds racing on a 40-day countdown feel meaningless; they earn their place in the last day or two.
- `heading_alignment` set to `start` left-aligns everything, including the digits and the button, not just the heading. Use it only when the surrounding sections are left-aligned too.
- Any scheme other than `standard-primary` pads the content inside its own coloured band, so `top_spacing` and `bottom_spacing` set to `none` remove that inner padding; under a filled hero use `small`. On `standard-secondary` and `highlight-secondary` the `cards` get a filled background, which makes the digits stand out most; on the highlight schemes with `minimal` the digits rely on text contrast alone.
- The `text` note sits between the digits and the button. Keep it to one or two short lines (terms, "limited places") or the button drops below the fold on phones.
- Use a short, specific eyebrow ("Opening 1 June", "Ends Sunday") and one title; the description is optional and best left empty when the eyebrow already says when.

## Recipes

### Grand opening

A standalone announcement in bordered cards on the strongest surface, pointing to directions or a booking page. The user supplies the opening date and a one-line invitation.

```json
{
  "type": "countdown",
  "settings": { "eyebrow": "Save the Date", "title": "We're Opening Our Doors", "description": "Join us for the opening day with tours, tastings and a few surprises.", "target_date": "2027-06-01 10:00", "expired_message": "We're open. Come and visit!", "show_seconds": false, "style": "cards", "color_scheme": "highlight-primary", "button": { "text": "Get Directions", "href": "contact.html" } }
}
```

### Sale ending strip

A quiet, left-aligned `minimal` timer with seconds running, meant for the final days of an offer. The user supplies the offer wording and the end date.

```json
{
  "type": "countdown",
  "settings": { "eyebrow": "Ends Sunday", "title": "Placeholder Offer Ends Soon", "heading_alignment": "start", "target_date": "2027-03-14 23:59", "expired_message": "This offer has ended. Join the list for the next one.", "show_seconds": true, "style": "minimal", "color_scheme": "standard-secondary", "top_spacing": "small", "bottom_spacing": "small", "button": { "text": "Book Now", "href": "contact.html" } }
}
```

### Registration deadline

For a course, workshop or event with a firm cut-off; the note carries the terms. The user supplies the programme name, the deadline and the terms line.

```json
{
  "type": "countdown",
  "settings": { "eyebrow": "Places Limited", "title": "Spring Workshop Series", "description": "Registration closes when the timer reaches zero.", "target_date": "2027-04-30 17:00", "expired_message": "Registration is closed. Join the waitlist for the next series.", "text": "<p>Early registrations include a free introductory session.</p>", "show_seconds": false, "style": "cards", "color_scheme": "standard-primary", "button": { "text": "Register Now", "href": "contact.html" } }
}
```

### New location teaser

A softer "coming soon" that collects interest before the doors open. The user supplies the location name and the planned opening date.

```json
{
  "type": "countdown",
  "settings": { "eyebrow": "Coming Soon", "title": "A Second Studio Is on Its Way", "description": "Be the first to book when the new space opens.", "target_date": "2027-09-01 09:00", "expired_message": "The new studio is open. Book your first visit.", "show_seconds": false, "style": "minimal", "color_scheme": "highlight-secondary", "button": { "text": "Get Notified", "href": "contact.html" } }
}
```
