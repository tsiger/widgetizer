# team-highlight

## Purpose

A team section with a pinned introduction on the left (eyebrow, heading, paragraph and an optional signature image) and a grid of people on the right: photo, name, role, an optional speciality line, a short bio and social links. It puts faces to the business on an `about` or `team` page.

The intro column stays in view while the grid scrolls, so a longer team reads as one section with a steady headline. Photos share one crop shape set by `image_ratio`.

## When to use

- The people section on `about`, a dedicated `team` page, or a "meet the founders" moment on `index` for very small businesses.
- Good for two to twelve named people with consistent photos: clinics, law and accounting firms, agencies, salons, schools, trades with a crew, restaurants with a kitchen team.
- Bad for a flat directory of twenty or more (`profile-grid`), for people without photos, and for teams that change weekly; every card is a block someone must edit.
- It can open a `team` page when it has a `title`, but it never supports a transparent header; under `transparent_on_hero` open with `split-content` or `banner` first.
- Natural neighbours: `rich-text` or `split-content` story above, `key-figures`, `testimonials` or an `action-bar` ("Work with us") below.
- Needs an intro with at least a heading and a sentence, plus two to eight `member` blocks. Even numbers fill two columns; multiples of three fill three.
- Fits any business that sells trust in people. Less useful for product shops and venues.

## Pitfalls

- The intro column is pinned on wide screens, which looks right only when the intro has enough in it (eyebrow, heading, a two- or three-line paragraph, ideally the `signature_image`). A lone heading beside a tall grid looks lost; add a description or switch `heading_alignment` to `center`.
- `columns_desktop` counts columns inside the right-hand grid, which is about sixty per cent of the width. Two columns give large portraits; four give small ones, so pair four with `square` and short names.
- A `member` without a `photo` shows a placeholder portrait. Shoot everyone or nobody, and shoot them alike: same background, same framing, same light. `image_ratio` crops every photo the same way, so a mix of head-and-shoulders and full-length shots crops badly. `auto` keeps each photo's own shape and makes the grid ragged; use it only when all photos already match.
- `specialty` shows in the accent colour under the role; it is for a discipline or focus ("Implants", "Family law"), not a second job title. `bio` is small text under that: one or two sentences, or cards grow to different heights.
- `link` wraps the photo, name and role, so it should go to a real page (a bio page, a professional profile). Linking some members and not others gives an inconsistent hover.
- Social fields take full profile addresses, one per network, and open in a new tab; `email` takes an address only. Fill at most two or three per person or the row of icons outgrows the name.
- Names and roles are not prefilled placeholders you can leave; the defaults are sample names and must be replaced.
- Photos of people on a highlight scheme sit on a dark band, which can make skin tones look flat; `standard-primary` or `standard-secondary` is usually kinder. Use a highlight scheme only when the team is the page's main message.
- Filled schemes pad inside their own band, so `top_spacing` `none` on a filled section removes its inner padding rather than the gap to the section above; use `none` only directly under an unfilled `rich-text` opener.

## Recipes

### Founding pair

Two founders in large portraits with a personal intro and a signature under it. Supply two upright portraits in the same style and a signature image on a transparent background.

```json
{
  "type": "team-highlight",
  "settings": {
    "eyebrow": "The founders",
    "title": "Two people, one workshop",
    "description": "We started the studio in a shared garage in 2015 and still make everything ourselves.",
    "heading_alignment": "start",
    "columns_desktop": 2,
    "image_ratio": "portrait",
    "color_scheme": "standard-primary"
  },
  "blocks": [
    { "type": "member", "settings": { "name": "Alex Sample", "role": "Co-founder", "specialty": "Design", "bio": "Trained as an architect, happiest at the drawing board." } },
    { "type": "member", "settings": { "name": "Sam Example", "role": "Co-founder", "specialty": "Making", "bio": "Twenty years at the bench and counting." } }
  ]
}
```

### Clinic team

Six practitioners in three columns with speciality lines, for clinics, dentists and therapy practices. Supply six square head-and-shoulders photos on the same background.

```json
{
  "type": "team-highlight",
  "settings": {
    "eyebrow": "Meet the team",
    "title": "The people who will look after you",
    "description": "Every practitioner is registered, insured and continues training each year.",
    "heading_alignment": "start",
    "columns_desktop": 3,
    "image_ratio": "square",
    "color_scheme": "standard-secondary"
  },
  "blocks": [
    { "type": "member", "settings": { "name": "Dr A. Sample", "role": "Principal dentist", "specialty": "Implants" } },
    { "type": "member", "settings": { "name": "Dr B. Sample", "role": "Associate dentist", "specialty": "Children" } },
    { "type": "member", "settings": { "name": "C. Sample", "role": "Hygienist", "specialty": "Gum health" } },
    { "type": "member", "settings": { "name": "D. Sample", "role": "Hygienist", "specialty": "Whitening" } },
    { "type": "member", "settings": { "name": "E. Sample", "role": "Practice manager", "specialty": "Your first visit" } },
    { "type": "member", "settings": { "name": "F. Sample", "role": "Reception", "specialty": "Appointments" } }
  ]
}
```

### Linked advisors

Three or four advisors or partners with professional profile links and a short bio each, centred intro, for consultancies, start-ups and nonprofits. Supply matching upright portraits.

```json
{
  "type": "team-highlight",
  "settings": {
    "eyebrow": "Advisory board",
    "title": "Guided by experience",
    "description": "Independent advisors who meet the team quarterly.",
    "heading_alignment": "center",
    "columns_desktop": 3,
    "image_ratio": "portrait",
    "color_scheme": "standard-primary"
  },
  "blocks": [
    { "type": "member", "settings": { "name": "J. Sample", "role": "Chair", "bio": "Former head of a regional hospital trust.", "linkedin": "https://www.linkedin.com/in/example" } },
    { "type": "member", "settings": { "name": "K. Sample", "role": "Finance", "bio": "Chartered accountant and charity treasurer.", "linkedin": "https://www.linkedin.com/in/example" } },
    { "type": "member", "settings": { "name": "L. Sample", "role": "Community", "bio": "Thirty years in local youth work.", "linkedin": "https://www.linkedin.com/in/example" } }
  ]
}
```

### Compact crew strip

A no-frills four-column row near the end of an `about` page: faces, names, roles, nothing else. Supply eight square photos.

```json
{
  "type": "team-highlight",
  "settings": {
    "eyebrow": "",
    "title": "The crew",
    "description": "Eight people, one van each, all local.",
    "heading_alignment": "start",
    "columns_desktop": 4,
    "image_ratio": "square",
    "color_scheme": "standard-primary"
  },
  "blocks": [
    { "type": "member", "settings": { "name": "A. Sample", "role": "Lead electrician" } },
    { "type": "member", "settings": { "name": "B. Sample", "role": "Electrician" } },
    { "type": "member", "settings": { "name": "C. Sample", "role": "Electrician" } },
    { "type": "member", "settings": { "name": "D. Sample", "role": "Apprentice" } },
    { "type": "member", "settings": { "name": "E. Sample", "role": "Plumber" } },
    { "type": "member", "settings": { "name": "F. Sample", "role": "Plumber" } },
    { "type": "member", "settings": { "name": "G. Sample", "role": "Scheduler" } },
    { "type": "member", "settings": { "name": "H. Sample", "role": "Office" } }
  ]
}
```
