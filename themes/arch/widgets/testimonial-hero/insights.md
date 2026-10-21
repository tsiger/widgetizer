# testimonial-hero

## Purpose

One customer's story told large: a two-column section that pairs a big portrait with a single quote, the author's name and role, and an optional company logo. It is the heavyweight social-proof section for one marquee client, not a wall of reviews.

On desktop the text column and the portrait stand side by side at equal height, the logo at the top of the text column and the quote, name and role anchored to the bottom so they line up with the foot of the photo. On phones the text comes first and the portrait follows. Without a portrait a placeholder illustration keeps the two-column shape.

## When to use

- Mid-page proof after the section that makes the claim: a `services-grid`, `features-split` or `pricing` section followed by one strong client story, then the closing `action-bar`.
- Good for one named, recognisable customer with a real photo and a quote worth reading slowly. Bad for collecting many short reviews; that is `testimonials` or `testimonial-slider`.
- Rarely a page opener. When it is the first section its `heading` block becomes the page title, so the author's name would head the page.
- Sits well between two standard-surface sections. On `highlight-primary` or `highlight-secondary` it is one of the page's one or two emphasis bands, so do not place it next to another highlight section.
- Needs one quote of one to three sentences, a name, a role line and ideally a portrait; the `logo` is optional and adds credibility only when the brand is known to the visitor.
- Fits agencies, consultants, B2B services, contractors and clinics, premium services and transformation stories.

## Pitfalls

- Everything in the text column is a block: the quote is a `text` block, the name a `heading` block, the role a second `text` block with `muted` on. Keep that order; a name-first column reads as a profile, not a testimonial.
- The `text` block at size `lg` is large type. A quote longer than about forty words towers over the portrait; cut to the strongest sentence or two.
- The portrait shows at its own proportions and the text column stretches to match, so a tall portrait makes a tall section with a lot of empty space above the quote. Landscape or square photos balance better.
- With no `author_image` the placeholder shows on the published site too, so either supply a photo or choose a text-only section instead.
- `image_position` only matters on desktop; on phones the text always comes first.
- The `logo` is shown at up to a fifth of the content width. Use a wordmark on a transparent background; a boxed logo looks like a sticker.
- Filled schemes (`standard-secondary`, `highlight-primary`, `highlight-secondary`) pad inside their own band, so `top_spacing` and `bottom_spacing` set to `none` remove that inner padding rather than closing a gap to a neighbour; use `none` only to fuse with a same-scheme band next to it.
- The `heading` block is a page heading. Heading sizes above `2xl` make a person's name shout; `lg` or `xl` is plenty.

## Recipes

### Flagship client spotlight

A homepage proof band on the strongest surface, right after the services section. The user supplies a landscape portrait of the client and, if the brand is known, the client's logo.

```json
{
  "type": "testimonial-hero",
  "settings": {
    "image_position": "end",
    "color_scheme": "highlight-primary"
  },
  "blocks": [
    { "type": "text", "settings": { "text": "<p>A short quote from a customer goes here. One or two sentences that name the result they got.</p>", "size": "lg" } },
    { "type": "heading", "settings": { "text": "Customer name", "size": "xl" } },
    { "type": "text", "settings": { "text": "<p>Role, company</p>", "size": "sm", "muted": true } }
  ]
}
```

### Friendly local recommendation

Portrait first, plain page surface, no logo: a neighbour recommending a tradesperson, salon or clinic. The user supplies a casual photo of the customer.

```json
{
  "type": "testimonial-hero",
  "settings": {
    "image_position": "start",
    "color_scheme": "standard-primary"
  },
  "blocks": [
    { "type": "text", "settings": { "text": "<p>A short, conversational quote from a customer goes here.</p>", "size": "lg" } },
    { "type": "heading", "settings": { "text": "Customer name", "size": "lg" } },
    { "type": "text", "settings": { "text": "<p>Neighbourhood or town</p>", "size": "sm", "muted": true, "uppercase": true } }
  ]
}
```

### Partner endorsement

A B2B quote where the partner's logo carries the weight. The user supplies the partner logo and a portrait; the soft surface separates it from standard sections above and below.

```json
{
  "type": "testimonial-hero",
  "settings": {
    "image_position": "end",
    "color_scheme": "standard-secondary"
  },
  "blocks": [
    { "type": "text", "settings": { "text": "<p>A short quote from a partner goes here, ideally with one concrete figure.</p>", "size": "lg" } },
    { "type": "heading", "settings": { "text": "Customer name", "size": "lg" } },
    { "type": "text", "settings": { "text": "<p>Role, company</p>", "size": "sm", "muted": true } },
    { "type": "text", "settings": { "text": "<p>Partner since 2021</p>", "size": "sm", "muted": true, "uppercase": true } }
  ]
}
```

### Quiet premium endorsement

Restrained type for a luxury or private-client service: smaller quote, no logo, a short descriptor instead of a job title. The user supplies an editorial portrait.

```json
{
  "type": "testimonial-hero",
  "settings": {
    "image_position": "start",
    "color_scheme": "standard-primary"
  },
  "blocks": [
    { "type": "text", "settings": { "text": "<p>A single restrained sentence from a customer goes here.</p>", "size": "base" } },
    { "type": "heading", "settings": { "text": "Customer name", "size": "lg" } },
    { "type": "text", "settings": { "text": "<p>Private client</p>", "size": "sm", "muted": true, "uppercase": true } }
  ]
}
```
