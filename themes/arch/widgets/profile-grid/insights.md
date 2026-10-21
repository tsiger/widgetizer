# profile-grid

## Purpose

A grid of people: photo, name, role, an optional specialty line, a short bio and small round social buttons. For team pages, staff directories, instructors, agents and practitioners. Photos are round headshots by default or full portrait cards with a chosen aspect ratio.

Each `profile` block is one person, centred in its card. `image_style` `circle` crops the `photo` into a bordered circle; `full` shows it as a rectangular portrait whose shape follows `aspect_ratio`. Only the social fields that are filled in appear, as a row of icon buttons under the bio; `email` opens a mail message, every other field expects a full web address. The grid becomes a swipeable carousel for large teams.

## When to use

- The team section of `about`, or the body of a `team` or `stylists` page. Also a two-person leadership spotlight on `index` for owner-led businesses.
- Good for 2 to 12 people with consistent photos. Clinics, salons, law and accounting firms, agencies, schools, gyms, real estate offices, restaurants introducing the kitchen.
- Bad for a single founder story (`image-text` or `split-content`), for one highlighted person with a long quote (`team-highlight`) and for logos or products (`logo-cloud`, `card-grid`).
- Can open a page when it has a `title`, but it is better placed after a `rich-text` opener with `top_spacing` `none`. It never supports a transparent header; only `banner`, `slideshow` and `video-popup` do.
- Sits well after a mission statement in `rich-text` and before `testimonials` or a hiring call to action in `action-bar`.
- Needs a `photo`, `name` and `role` for everyone; `specialty`, `bio` and social links are optional but should be present for all or for none.

## Pitfalls

- Photo consistency matters more than any setting. Same background, lighting and crop for everyone; one odd photo makes the whole grid look amateur. Circles need the face centred in the source image, since the edges are cut away.
- `aspect_ratio` only applies when `image_style` is `full`; it does nothing to circles. `3 / 4` suits head-and-shoulders portraits, `1 / 1` suits tight headshots, `3 / 2` and `4 / 3` only work for environmental shots with the person in the middle.
- Match `columns_desktop` to the headcount: three people in three columns, four in four or two rows of two. Five columns only work with bios left empty, otherwise cards become narrow towers of text.
- `bio` lines wrap in a narrow centred column. Keep bios to one or two sentences; a paragraph per person at four columns is unreadable. Either everyone has a bio or nobody does.
- `role` is the job title in accent colour and `specialty` a muted line below it. Do not put the same information in both; use `specialty` for the thing that makes the person different, or leave it empty.
- One or two social buttons per person look intentional; five look like clutter and compete with the photo. Pick the platform each person actually uses. Social values must be full addresses, not handles.
- `layout` `carousel` only earns its arrows with more people than columns; with equal counts nothing scrolls. Use it from about seven people at three columns.
- Filled schemes pad inside their own band; `top_spacing` or `bottom_spacing` `none` removes inner padding, not the gap to the neighbour. A team grid is rarely the page's highest-value content, so it mostly stays on `standard-primary` or `standard-secondary`.

## Recipes

### Classic team grid

Three people with round headshots and one-sentence bios, centred. Supply three matching square headshots.

```json
{
  "type": "profile-grid",
  "settings": {
    "eyebrow": "Our team",
    "title": "The people you will work with",
    "heading_alignment": "center",
    "image_style": "circle",
    "columns_desktop": 3,
    "layout": "grid",
    "color_scheme": "standard-primary"
  },
  "blocks": [
    { "type": "profile", "settings": { "name": "Alex Example", "role": "Founder", "bio": "Started the studio after a decade in practice.", "linkedin": "https://www.linkedin.com/in/example" } },
    { "type": "profile", "settings": { "name": "Sam Example", "role": "Lead designer", "bio": "Turns briefs into plans and plans into rooms.", "linkedin": "https://www.linkedin.com/in/example" } },
    { "type": "profile", "settings": { "name": "Jo Example", "role": "Project manager", "bio": "Keeps every build on schedule and on budget.", "email": "hello@example.com" } }
  ]
}
```

### Portrait cards

Full portrait photos in a four-column directory with a specialty line and no bios, on a soft band. Supply portrait-orientation photos shot the same way.

```json
{
  "type": "profile-grid",
  "settings": {
    "eyebrow": "Stylists",
    "title": "Book with your favourite",
    "heading_alignment": "center",
    "image_style": "full",
    "aspect_ratio": "3 / 4",
    "columns_desktop": 4,
    "layout": "grid",
    "color_scheme": "standard-secondary"
  },
  "blocks": [
    { "type": "profile", "settings": { "name": "Taylor Example", "role": "Senior stylist", "specialty": "Colour and balayage", "instagram": "https://www.instagram.com/example" } },
    { "type": "profile", "settings": { "name": "Morgan Example", "role": "Stylist", "specialty": "Cuts and restyles", "instagram": "https://www.instagram.com/example" } },
    { "type": "profile", "settings": { "name": "Riley Example", "role": "Stylist", "specialty": "Bridal and occasion hair", "instagram": "https://www.instagram.com/example" } },
    { "type": "profile", "settings": { "name": "Casey Example", "role": "Junior stylist", "specialty": "Blow dries and treatments", "instagram": "https://www.instagram.com/example" } }
  ]
}
```

### Leadership pair

Two leaders with room for a longer bio each, left-aligned heading, under a `rich-text` opener.

```json
{
  "type": "profile-grid",
  "settings": {
    "eyebrow": "Leadership",
    "title": "Who runs the firm",
    "heading_alignment": "start",
    "image_style": "full",
    "aspect_ratio": "1 / 1",
    "columns_desktop": 2,
    "layout": "grid",
    "color_scheme": "standard-primary",
    "top_spacing": "none"
  },
  "blocks": [
    { "type": "profile", "settings": { "name": "Jordan Example", "role": "Managing partner", "bio": "Two sentences on background and what they look after day to day.", "linkedin": "https://www.linkedin.com/in/example", "email": "hello@example.com" } },
    { "type": "profile", "settings": { "name": "Drew Example", "role": "Partner", "bio": "Two sentences on background and what they look after day to day.", "linkedin": "https://www.linkedin.com/in/example", "email": "hello@example.com" } }
  ]
}
```
