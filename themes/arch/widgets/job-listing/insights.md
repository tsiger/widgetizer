# job-listing

## Purpose

A careers list: each open role is a card with its title, department, location and an employment-type badge, plus an apply button. An optional row of filter buttons is built automatically from the departments typed into the cards. It is the core of a careers page or a hiring band on an `about` page.

The section only displays what is typed into it. It does not collect applications or connect to a hiring system; each `apply_link` sends the candidate to an email address, an external form or a page of the site with a form.

## When to use

- Role: the main content of a careers page, or a short "we are hiring" block near the end of an `about` page or homepage.
- Good for: any business that hires publicly: restaurants and hotels, clinics, agencies, trades, shops with seasonal staff, organisations recruiting interns.
- Bad for: a single role (a `split-content` section with a button says it better), the job descriptions themselves (link to them), anything that is not a job.
- Opening a page: acceptable for a careers page, since the `title` becomes the page heading when the section is first, though a `rich-text` or `split-content` culture statement above it gives candidates a reason to scroll. It does not support the header's transparent mode, which only `banner`, `slideshow` and `video-popup` support.
- Natural neighbours: `key-figures` or `icon-card-grid` for benefits, `profile-grid` or `team-highlight` for the people, `accordion` for hiring questions, `action-bar` for "no suitable role? write to us".
- Content needed: at least two roles for the list to look like a list; four or more before filters earn their place.

## Pitfalls

- `all_positions_text` is the label of the first filter button, the one that shows every role, and it has no default. Set it ("All roles") whenever `show_filters` is on, or that button renders empty.
- Filters come from the `department` text matched without regard to case, so "Kitchen" and "kitchen" are one filter but "Front of House" and "Front-of-house" are two. Spell each department identically on every card.
- A filter row with one department, or with fewer than about four roles, is clutter; turn `show_filters` off.
- An `apply_link` with no text hides the button and leaves a card the visitor cannot act on. Point every link at a real destination, typically an email address or the `contact` page form, and open external forms in a new tab.
- Format locations consistently across the cards; "Remote" and a city name in the same style.
- `type` is a fixed badge of four values; put shift patterns or hours in the role title or the linked description.
- On `standard-primary` the cards have no borders and read as a plain list; the other schemes give the cards a fill or border and make the section a filled band whose spacing is padding inside its colour.
- A highlight surface fits a hiring band on a homepage where recruiting is the page's call to action; on a careers page the list is the content, so keep it on a standard surface.
- The `eyebrow` is the place for urgency ("Hiring this season"); keep counts or pay out of the `title` unless they are current.

## Recipes

### Careers board with filters

A full careers page list with roles across several departments. Supply the role titles, a consistent department and location per role, and an application email or form link.

```json
{
  "type": "job-listing",
  "settings": { "eyebrow": "Careers", "title": "Open positions", "description": "Find a role that fits you and apply in a few minutes.", "heading_alignment": "center", "show_filters": true, "all_positions_text": "All roles", "color_scheme": "standard-primary" },
  "blocks": [
    { "type": "job", "settings": { "title": "Front desk coordinator", "department": "Operations", "location": "Example City", "type": "full-time", "apply_link": { "text": "Apply", "href": "mailto:hello@example.com" } } },
    { "type": "job", "settings": { "title": "Service technician", "department": "Field", "location": "Example City", "type": "full-time", "apply_link": { "text": "Apply", "href": "mailto:hello@example.com" } } },
    { "type": "job", "settings": { "title": "Weekend assistant", "department": "Operations", "location": "Example City", "type": "part-time", "apply_link": { "text": "Apply", "href": "mailto:hello@example.com" } } },
    { "type": "job", "settings": { "title": "Marketing intern", "department": "Marketing", "location": "Remote", "type": "internship", "apply_link": { "text": "Apply", "href": "mailto:hello@example.com" } } }
  ]
}
```

### Short list without filters

Two or three roles for a small team, with no filter row. Supply the roles and one application destination.

```json
{
  "type": "job-listing",
  "settings": { "eyebrow": "", "title": "We are hiring", "heading_alignment": "start", "show_filters": false, "color_scheme": "standard-primary" },
  "blocks": [
    { "type": "job", "settings": { "title": "Experienced stylist", "department": "Salon", "location": "Example City", "type": "full-time", "apply_link": { "text": "Apply", "href": "contact.html" } } },
    { "type": "job", "settings": { "title": "Reception, weekends", "department": "Salon", "location": "Example City", "type": "part-time", "apply_link": { "text": "Apply", "href": "contact.html" } } }
  ]
}
```

### Hiring band on the about page

A highlighted strip of one or two roles near the end of an `about` page, where recruiting is the page's call to action. Supply the roles; the highlight surface is the page's single emphasis moment here.

```json
{
  "type": "job-listing",
  "settings": { "eyebrow": "Join the team", "title": "Two roles open this season", "heading_alignment": "start", "show_filters": false, "color_scheme": "highlight-primary" },
  "blocks": [
    { "type": "job", "settings": { "title": "Kitchen team member", "department": "Kitchen", "location": "Example City", "type": "full-time", "apply_link": { "text": "Apply", "href": "mailto:hello@example.com" } } },
    { "type": "job", "settings": { "title": "Events assistant", "department": "Events", "location": "Example City", "type": "contract", "apply_link": { "text": "Apply", "href": "mailto:hello@example.com" } } }
  ]
}
```
