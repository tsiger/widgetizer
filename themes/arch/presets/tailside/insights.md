# Tailside

## Suits

- A small-animal veterinary clinic, or any appointment-based health practice where the visitor is anxious and wants clarity. The `index` page is short and explanatory: a `split-hero` with a photo, a `trust-bar`, an `icon-card-grid` of everyday care, a `horizontal` `timeline` that walks through a clinic visit, and a `highlight-secondary` `action-bar`.
- `services` groups common reasons to visit in an `icon-card-grid`, explains how care changes with age in a `highlight-primary` `features-split`, and answers questions in an `accordion`. The `services` collection is seeded with five items (wellness exams, vaccinations, dental, diagnostics, urgent care) so each has its own detail page.
- `new-patients` is the differentiator: a `vertical` `timeline` of the first visit, a `resource-list` of documents to read beforehand, and a first-visit `accordion`. Suitability is not functionality: the clinic does not take bookings on the site; the phone number in `contactDetailsLine1` and the `contact-details` section are the way in.
- `about` opens with a `split-hero`, states values in `features-split` and introduces the team with a `profile-grid`. `contact` opens directly on `contact-details` in a `first-featured` layout, then a `map` and an `accordion`.
- Seeds `news` with five posts used as pet-care advice and clinic announcements. No `projects` items.
- Every page except `contact` and `news` opens with a `split-hero`, which gives the site a consistent, calm rhythm rather than a dramatic one.

## Look

Clinical but kind: warm off-white surfaces, a pale mint banding tone, a teal-green accent, and deep forest-green highlight bands where the accent becomes a soft aqua. Headings are a readable, slightly bookish serif (Literata) over a plain, legible sans (Public Sans), a pairing that says careful and professional without feeling cold. The header is `sticky`, `full_width` and solid on every page, with `transparent_on_hero` off; openers are `split-hero` sections rather than full-bleed banners, so text and image sit side by side. `spacing_density` is `default`, corners `slightly-rounded`, buttons `auto`: neat and trustworthy.

## Adapting

- Dental, GP or physiotherapy practice: keep the whole structure; the `new-patients` page and the visit `timeline` are exactly what human clinics need. Repurpose `services` items as treatments.
- Dog groomer, pet boarding or dog trainer: lighten the clinical tone through images, turn `new-patients` into a first-visit or trial-day guide, and use `news` for seasonal tips.
- Counselling or therapy practice: the explain-the-visit `timeline` and gentle palette fit well; drop the `trust-bar` and `map` if discretion matters.
- Poor fit for an emergency-only animal hospital that needs to shout its phone number, since the layout is measured and the header has no urgency framing. Also a poor fit for a shop or any business built around photos and portfolio work; there is no `gallery` or `masonry-gallery` anywhere.
