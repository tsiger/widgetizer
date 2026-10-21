# embed

## Purpose

A container for third-party code: a booking calendar, a newsletter form, a payment button, a social feed, a review widget. It drops the pasted snippet onto the page under the usual heading group, at a chosen width and alignment. Use it when no dedicated section exists for the content.

The snippet is shown as-is, so the section looks like whatever the provider renders. An optional background image with a colour overlay turns the whole section into a filled band, which is the only way this section carries visual weight of its own.

## When to use

- Mid-page on a `contact`, `book` or `services` page, wherever the visitor should act inside the site instead of leaving it.
- Good for: booking and scheduling tools, payment or donation buttons, newsletter sign-ups, live review or social feeds, a widget from a service the business already uses. Bad for: a map (use `map`), a hosted video (use `video-embed` or `video-popup`), a contact form (use `core-form`), anything you could build with ordinary sections.
- It can open a page, but should not: a cold iframe is a weak opener and it does not support the transparent header (only `banner`, `slideshow` and `video-popup` do). Place a title section above it.
- Natural neighbours: `rich-text` explaining what the tool does, `contact-details` beside a booking tool, `accordion` for questions, `action-bar` elsewhere on the page for visitors who skip the tool.
- Needs one working snippet from the provider and, ideally, a one-line description setting expectations.
- Fits salons, clinics, studios, nonprofits, restaurants with online reservations, any business that lives in a third-party tool.

## Pitfalls

- Replace the default title and description; they are template placeholders and the default `code` is a sample box, not real content. If the embedded tool carries its own heading, leave `title` blank.
- Paste only the snippet the provider gives you. Extra wrappers or inline styles fight the section's own width handling. The section caps an iframe to the container width but keeps the height the snippet asks for, so a fixed tall height leaves empty space on phones.
- Match `max_width` to the tool: `narrow` for a payment button or sign-up form, `medium` for a booking calendar, `wide` for a feed, `fullwidth` only for something that is designed to stretch. `alignment` has no visible effect at `fullwidth`.
- Third-party scripts load from the provider's servers, may track visitors and may need a consent notice. Check the snippet works on the published site, not just in the editor preview.
- Setting an `image` makes the section a filled band with the `overlay_color` on top, regardless of `color_scheme`. Keep the overlay dark enough that the heading stays readable, and expect the embedded tool to render in its own colours, which may clash with a photo.
- Any scheme other than `standard-primary`, or any background image, pads the content inside its own band, so `top_spacing` and `bottom_spacing` set to `none` remove that inner padding; under a filled section above use `small`. As a utility section it usually belongs on a standard surface; reserve a highlight scheme for the one booking or donation tool the page is built around.
- `heading_alignment` set to `start` suits tools and forms; keep `center` for showcase content such as a feed.

## Recipes

### Booking calendar

A centred scheduling tool with a short explanation above it. The user supplies the provider's booking snippet in place of the placeholder markup.

```json
{
  "type": "embed",
  "settings": { "title": "Book Your Appointment", "description": "Pick a time that works for you. Confirmation arrives by email.", "heading_alignment": "center", "code": "<div class=\"example-placeholder\"><p>Booking calendar placeholder</p></div>", "max_width": "medium", "alignment": "center", "color_scheme": "standard-primary" }
}
```

### Donation button on a highlight band

The one conversion tool a campaign page is built around, given the strongest surface. The user supplies the payment provider's snippet.

```json
{
  "type": "embed",
  "settings": { "eyebrow": "Support the Work", "title": "Make a Donation", "description": "Every contribution goes straight to the programme.", "heading_alignment": "center", "code": "<div class=\"example-placeholder\"><p>Donation form placeholder</p></div>", "max_width": "narrow", "alignment": "center", "color_scheme": "highlight-primary" }
}
```

### Newsletter sign-up, left-aligned

A small form docked under a text section, reading like part of the page rather than a separate block. The user supplies the newsletter provider's form snippet.

```json
{
  "type": "embed",
  "settings": { "title": "Stay in the Loop", "description": "A short monthly note. Unsubscribe any time.", "heading_alignment": "start", "code": "<div class=\"example-placeholder\"><p>Sign-up form placeholder</p></div>", "max_width": "narrow", "alignment": "start", "color_scheme": "standard-secondary", "top_spacing": "small" }
}
```

### Social feed

A wide live feed that keeps the page feeling current. The user supplies the feed provider's snippet; the section title replaces any heading the feed lacks.

```json
{
  "type": "embed",
  "settings": { "eyebrow": "Follow Along", "title": "Latest from the Studio", "heading_alignment": "center", "code": "<div class=\"example-placeholder\"><p>Social feed placeholder</p></div>", "max_width": "wide", "alignment": "center", "color_scheme": "standard-primary" }
}
```
