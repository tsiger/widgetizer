# pricing

## Purpose

Side-by-side plan cards, each with a name, a large price, a billing period, a checklist of features and a full-width button. One plan can be marked as featured and gets an accent border. For subscriptions, packages, memberships and fixed-price bundles where the visitor picks one.

Each `plan` block is one card. `features` is one line per feature: a line starting with "+" gets a check mark, a line starting with "-" gets a cross, a plain line shows no icon, so a lower plan can list what it lacks. `price` and `period` are free text, so "From $0", "Free", "Let's talk" and "one-time" all work. Cards show in a grid or, with many plans, in a swipeable carousel.

## When to use

- The decision point of a `pricing` or `services` page, usually the one highlight section on it, followed by `accordion` for questions and a closing call to action.
- Good for two to four plans that share the same feature categories; memberships, software tiers, packaged services, event tickets, classes.
- Bad for long à-la-carte lists (`priced-list`), for detailed feature matrices (`comparison-table`) and for a single offer, which reads better as `rich-text` or `split-content` with a button.
- Can open a page when it has a `title`, but it is usually placed after a `rich-text` opener with `top_spacing` `none`. It never supports a transparent header; only `banner`, `slideshow` and `video-popup` do.
- Needs three to six features per plan, written in parallel so visitors can read across cards, and one button each pointing at `contact` or a sign-up address.
- Fits gyms and studios, coworking spaces, software, agencies with retainers, tutors, cleaners and any business selling tiers.

## Pitfalls

- Set `columns_desktop` to the number of plans. Four plans in three columns leave one card alone on a second row; two plans in three columns leave a hole.
- Mark exactly one plan `featured`. The accent border only means something when it is unique; place that plan in the middle for three plans.
- Keep feature lists the same length and order across plans, repeating a feature with a "-" prefix on plans that lack it. Uneven lists leave buttons at different heights.
- `features` lines must be short; a long line wraps and breaks the row rhythm across cards. Numbers and nouns ("10 GB storage", "Weekly report") read best.
- `layout` `carousel` is only worth it with more plans than columns; with equal counts the arrows sit disabled. From five plans upwards, use a carousel at three columns or drop a plan.
- A blank section `title` lets the plan names become the main headings. Fine on a dedicated page opened by `rich-text`, wrong when the section opens the page.
- Pricing is a high-value decision and justifies `highlight-primary`. Keep it the only highlight on the page and never next to another highlight band.
- Filled schemes pad inside their own band; `top_spacing` or `bottom_spacing` `none` on them removes inner padding, not the gap to the neighbour. Use `none` only directly under an unfilled `rich-text` opener.
- Button text should name the action per plan ("Start free", "Book a call"); identical labels on every card waste the strongest element.

## Recipes

### Three tiers, featured middle

The familiar pattern: three plans, the middle one featured, on the page's highlight surface. No images needed.

```json
{
  "type": "pricing",
  "settings": {
    "eyebrow": "Plans",
    "title": "Pick the plan that fits",
    "description": "All prices are placeholders. Change plans any time.",
    "heading_alignment": "center",
    "layout": "grid",
    "columns_desktop": 3,
    "color_scheme": "highlight-primary"
  },
  "blocks": [
    { "type": "plan", "settings": { "title": "Starter", "price": "$0", "period": "per month", "features": "+ 1 project\n+ Email support\n- Custom domain\n- Priority support", "button_link": { "text": "Start free", "href": "contact.html" }, "featured": false } },
    { "type": "plan", "settings": { "title": "Growth", "price": "$0", "period": "per month", "features": "+ 10 projects\n+ Email support\n+ Custom domain\n- Priority support", "button_link": { "text": "Choose Growth", "href": "contact.html" }, "featured": true } },
    { "type": "plan", "settings": { "title": "Studio", "price": "$0", "period": "per month", "features": "+ Unlimited projects\n+ Email support\n+ Custom domain\n+ Priority support", "button_link": { "text": "Talk to us", "href": "contact.html" }, "featured": false } }
  ]
}
```

### Two memberships

A simple either-or choice for a gym, club or studio, on a soft band, the annual plan featured.

```json
{
  "type": "pricing",
  "settings": {
    "eyebrow": "Membership",
    "title": "Monthly or yearly",
    "heading_alignment": "center",
    "layout": "grid",
    "columns_desktop": 2,
    "color_scheme": "standard-secondary"
  },
  "blocks": [
    { "type": "plan", "settings": { "title": "Monthly", "price": "$0", "period": "per month, cancel any time", "features": "+ All classes\n+ Open gym\n+ One guest pass a month", "button_link": { "text": "Join monthly", "href": "contact.html" }, "featured": false } },
    { "type": "plan", "settings": { "title": "Yearly", "price": "$0", "period": "per year, two months free", "features": "+ All classes\n+ Open gym\n+ Unlimited guest passes", "button_link": { "text": "Join yearly", "href": "contact.html" }, "featured": true } }
  ]
}
```

### Four fixed-price packages

Service bundles sold once rather than monthly; four plans, four columns, left-aligned heading under a `rich-text` opener.

```json
{
  "type": "pricing",
  "settings": {
    "title": "",
    "description": "",
    "heading_alignment": "start",
    "layout": "grid",
    "columns_desktop": 4,
    "color_scheme": "standard-primary",
    "top_spacing": "none"
  },
  "blocks": [
    { "type": "plan", "settings": { "title": "Essentials", "price": "From $0", "period": "one-time", "features": "+ Site visit\n+ Written quote\n- Design drawings", "button_link": { "text": "Enquire", "href": "contact.html" }, "featured": false } },
    { "type": "plan", "settings": { "title": "Standard", "price": "From $0", "period": "one-time", "features": "+ Site visit\n+ Written quote\n+ Design drawings", "button_link": { "text": "Enquire", "href": "contact.html" }, "featured": true } },
    { "type": "plan", "settings": { "title": "Premium", "price": "From $0", "period": "one-time", "features": "+ Everything in Standard\n+ 3D visuals\n+ Project management", "button_link": { "text": "Enquire", "href": "contact.html" }, "featured": false } },
    { "type": "plan", "settings": { "title": "Bespoke", "price": "Let's talk", "period": "scoped together", "features": "+ Everything in Premium\n+ Dedicated lead\n+ Aftercare visits", "button_link": { "text": "Book a call", "href": "contact.html" }, "featured": false } }
  ]
}
```
