# testimonial-slider

## Purpose

A single-quote carousel: one centred testimonial at a time, with optional star rating, round avatar, name and role, cross-fading to the next with pagination dots. It gives a page one calm social-proof moment that cycles through up to eight voices without taking the space of a grid.

Each quote is set in large centred type, so the section is about reading one person at a time. With one quote the dots disappear and it becomes a static pull-quote.

## When to use

- A compact proof beat between content sections, or directly under an image hero to validate the hero's promise.
- Good for three to five quotes of similar length that each stand alone. Bad for showing many reviews at once or for comparing them; use `testimonials` for a grid.
- Can open a page only in the sense that it renders; it has no heading, so put a `rich-text` title section before it instead.
- Pairs well with `trust-bar`, `logo-cloud` and `key-figures`, and as the step before a closing `action-bar` or a `core-form`.
- Needs one to eight `quote` blocks; a name per quote; a role line and avatar are optional but a real face raises trust noticeably.
- Fits service businesses, local trades, clinics, coaches, hospitality and any high-ticket service where one story at a time is persuasive.

## Pitfalls

- Slides sit on top of one another and the section takes the height of the active quote, so quotes of very different lengths make the page below jump as the slider advances. Keep them within a sentence of each other.
- The quote is plain text at extra-large size. Two sentences is the comfortable maximum; a paragraph overflows the viewer's patience before `autoplay_speed` moves on.
- Match `autoplay_speed` to length: a one-liner reads in four seconds, two sentences need seven or more. Turn `autoplay` off when visitors must act on the quote (a link next to it, a form below).
- There is no pause on hover, so a reader who is mid-sentence loses the slide; shorter quotes and slower speeds are the only cure.
- `rating` shows stars out of five with the empty ones greyed. Leave it blank to hide the row entirely rather than giving everyone five stars; a lone four-star review makes the set believable.
- An avatar is cropped to a small circle, so faces must be centred and close up; a logo or wide photo there becomes an unreadable disc. Leave `avatar` empty rather than use a stock photo.
- Filled schemes pad inside their own band. Under an image hero use `top_spacing` `small`, not `none`, so the slider does not collide with the hero's edge; `none` fits only when the section above is unfilled and already provides the gap, or shares the same scheme and should fuse.
- Two highlight sections should not touch. If the slider is a highlight band, the sections above and below stay on standard surfaces.

## Recipes

### Three-voice proof band

A homepage proof moment on the strongest surface with three short quotes and no avatars. The user supplies three quotes, names and roles.

```json
{
  "type": "testimonial-slider",
  "settings": {
    "autoplay": true,
    "autoplay_speed": 5000,
    "color_scheme": "highlight-primary"
  },
  "blocks": [
    { "type": "quote", "settings": { "quote": "A short quote from a customer goes here.", "name": "Customer name", "title": "Role, company", "rating": "5" } },
    { "type": "quote", "settings": { "quote": "A short quote from a customer goes here.", "name": "Customer name", "title": "Role, company", "rating": "4" } },
    { "type": "quote", "settings": { "quote": "A short quote from a customer goes here.", "name": "Customer name", "title": "Role, company", "rating": "5" } }
  ]
}
```

### Faces-first under the hero

Docked under an image `banner` with a slower cadence so visitors register each face. The user supplies a close-up headshot per quote plus the quotes, names and roles.

```json
{
  "type": "testimonial-slider",
  "settings": {
    "autoplay": true,
    "autoplay_speed": 7000,
    "color_scheme": "standard-secondary",
    "top_spacing": "small"
  },
  "blocks": [
    { "type": "quote", "settings": { "quote": "A short quote from a customer goes here.", "name": "Customer name", "title": "Role, company", "rating": "" } },
    { "type": "quote", "settings": { "quote": "A short quote from a customer goes here.", "name": "Customer name", "title": "Role, company", "rating": "" } }
  ]
}
```

### Single pull-quote

One quote, no dots, no movement: an editorial pause between a services section and the contact form. The user supplies the one quote and its attribution.

```json
{
  "type": "testimonial-slider",
  "settings": {
    "autoplay": false,
    "color_scheme": "standard-primary"
  },
  "blocks": [
    { "type": "quote", "settings": { "quote": "A longer, two-sentence quote from a customer goes here. It can carry one concrete detail.", "name": "Customer name", "title": "Role, company", "rating": "" } }
  ]
}
```

### Quick review ticker

Four to eight one-sentence quotes on a fast cycle with stars showing, for a page that already has plenty of content and needs a brisk credibility beat. The user supplies the very short quotes.

```json
{
  "type": "testimonial-slider",
  "settings": {
    "autoplay": true,
    "autoplay_speed": 4000,
    "color_scheme": "standard-secondary"
  },
  "blocks": [
    { "type": "quote", "settings": { "quote": "A one-sentence quote goes here.", "name": "Customer name", "title": "Role, company", "rating": "5" } },
    { "type": "quote", "settings": { "quote": "A one-sentence quote goes here.", "name": "Customer name", "title": "Role, company", "rating": "5" } },
    { "type": "quote", "settings": { "quote": "A one-sentence quote goes here.", "name": "Customer name", "title": "Role, company", "rating": "4" } },
    { "type": "quote", "settings": { "quote": "A one-sentence quote goes here.", "name": "Customer name", "title": "Role, company", "rating": "5" } }
  ]
}
```
