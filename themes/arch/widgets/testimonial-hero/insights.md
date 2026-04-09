# Testimonial Hero Widget

A full-width, split-layout social proof section that pairs a large author portrait with a quote, name, and optional company logo -- designed to anchor credibility at the top of a page or directly after a hero.

---

## Settings levers

| Setting | Values | Visual effect |
|---|---|---|
| `logo` | Image upload (or empty) | Displays a company/brand logo above the quote text. Omitting it produces a cleaner, personal-feeling testimonial. |
| `author_image` | Image upload (or empty) | Large portrait shown in the right (or left) column. When empty a placeholder illustration renders instead. |
| `image_position` | `left`, `right` (default) | Swaps the two-column order on desktop. `left` puts the portrait first, giving it more visual weight on LTR screens. |
| `color_scheme` | `standard-primary`, `standard-secondary`, `highlight-primary`, `highlight-secondary` | `standard-primary` inherits the page background with no extra padding. Accent and highlight variants activate a padded container with tinted or contrasting backgrounds. |
| `top_spacing` | `auto`, `none` | `none` removes the top margin so the widget can sit flush against the section above -- useful for stacking color-banded sections. |
| `bottom_spacing` | `auto`, `none` | Same as above for the bottom edge. Combine both `none` values to create seamless vertical joins between widgets. |

---

## Available blocks

| Block | Key settings | Notes |
|---|---|---|
| **heading** | `text` (plain text), `size` (lg through 9xl) | Typically used for the author name. Renders as `<h1>` when the widget is the first on the page, `<h2>` otherwise. Can be repeated for a two-line attribution (name + company). |
| **text** | `text` (richtext), `size` (sm / base / lg), `uppercase` (bool), `muted` (bool) | The workhorse block. Use it for the quote body, job title, location, or any supplementary line. `muted` applies a lower-contrast color; `uppercase` adds letter-spaced caps for labels. |

Default block order: quote text (lg) --> author name heading (lg) --> job title text (sm, muted).

---

## Layout recipes

**1. "Flagship Client Spotlight" (homepage hero zone)**
- Settings: `image_position: right`, `color_scheme: highlight-secondary`, `top_spacing: none`, `logo: client-brand.svg`, `author_image: professional-headshot.jpg`
- Blocks: text (lg) for a two-sentence quote, heading (2xl) for client name, text (sm, muted) for "VP of Marketing, Acme Corp"
- Good for: Landing pages where you lead with proof instead of a traditional hero. The highlight-secondary background creates a bold color break.
- Industries: SaaS, marketing agencies, consulting firms

**2. "Neighborhood Trust" (local services)**
- Settings: `image_position: left`, `color_scheme: standard`, `logo: (empty)`, `author_image: casual-customer-photo.jpg`
- Blocks: text (lg) for a short, conversational quote, heading (lg) for first name + last initial, text (sm, muted, uppercase) for neighborhood or city name
- Good for: Service pages for contractors, salons, or clinics where a friendly face matters more than a corporate logo.
- Industries: home services, beauty, dental/medical, pet care

**3. "Partner Endorsement" (B2B credibility)**
- Settings: `image_position: right`, `color_scheme: standard-secondary`, `logo: partner-logo.png`, `author_image: (empty -- use placeholder)`
- Blocks: text (lg) for a results-oriented quote with a bold stat, heading (xl) for full name, text (sm, muted) for title + company, text (sm, muted, uppercase) for "Official Partner Since 2021"
- Good for: Integration or partner pages where the logo carries more weight than the photo. The placeholder image keeps the layout balanced.
- Industries: fintech, logistics, enterprise software, wholesale

**4. "Before/After Storyteller" (transformation services)**
- Settings: `image_position: left`, `color_scheme: highlight`, `logo: (empty)`, `author_image: after-transformation.jpg`
- Blocks: text (lg) for a narrative-style quote describing the journey, heading (lg) for client name, text (sm, muted) for context like "Lost 30 lbs in 4 months" or "Revenue doubled in Q3"
- Good for: Placing just below a services overview to transition into social proof. The highlight scheme draws the eye after a standard-background section.
- Industries: fitness, coaching, interior design, landscaping, real estate staging

**5. "Founder-to-Founder" (startup / indie brand)**
- Settings: `image_position: right`, `color_scheme: standard`, `top_spacing: none`, `bottom_spacing: none`, `logo: startup-logo.svg`, `author_image: candid-founder-photo.jpg`
- Blocks: text (lg) for a punchy one-liner quote, heading (xl) for full name, text (base) for title, text (sm, muted) for a Twitter/X handle or website URL
- Good for: About pages or pricing pages where peer validation from another founder seals the deal. Flush spacing lets it sit between two standard sections seamlessly.
- Industries: DTC brands, indie SaaS, creative studios, e-commerce

**6. "Event Keynote Pull-Quote" (conferences / education)**
- Settings: `image_position: right`, `color_scheme: highlight-secondary`, `logo: event-logo.png`, `author_image: speaker-on-stage.jpg`
- Blocks: text (lg) for a memorable one-sentence pull-quote, heading (3xl) for speaker name, text (sm, uppercase) for "Keynote Speaker", text (sm, muted) for event name and year
- Good for: Event recap pages or post-conference landing pages. The oversized heading makes the speaker name a design element in itself.
- Industries: conferences, online education, professional development, nonprofits

**7. "Quiet Authority" (luxury / premium positioning)**
- Settings: `image_position: left`, `color_scheme: standard-secondary`, `logo: (empty)`, `author_image: editorial-portrait.jpg`
- Blocks: text (base) for a restrained, single-sentence endorsement, heading (lg) for name, text (sm, muted, uppercase) for a short descriptor like "Private Client"
- Good for: Premium service pages where saying less signals exclusivity. No logo, small text, and the accent background do the heavy lifting.
- Industries: architecture, wealth management, luxury travel, fine dining, bespoke fashion

---

## Differentiation tips

- **Lead with the quote, not the name.** The default block order already does this. Resist the urge to put the heading first -- a compelling sentence hooks visitors before they care who said it.
- **Use the logo strategically.** A recognizable brand logo above the quote adds instant credibility. But if the logo is unknown to your audience, drop it entirely -- an unfamiliar logo adds clutter, not trust.
- **Match image_position to reading flow.** For pages where the testimonial follows a text-heavy section, place the image on the left so the eye lands on a visual break first. For pages that follow a gallery or image hero, put the image right so the quote gets attention.
- **Pair color_scheme with adjacent widgets.** Alternate between `standard-primary` and `highlight-primary` (or their accent variants) to create a visual rhythm down the page. Two consecutive `standard-primary` sections blur together; a `highlight-primary` testimonial between them acts as a divider.
- **Keep quotes to two sentences max.** The large text size at `lg` means long quotes dominate the viewport. Edit ruthlessly -- the best testimonials are one strong claim followed by one supporting detail.
- **Stack multiple text blocks for layered attribution.** Name (heading) + Title (text, sm, muted) + Company (text, sm, uppercase, muted) reads as a structured byline and feels more credible than cramming everything into one line.
- **Remove spacing to create section joins.** Setting both `top_spacing: none` and `bottom_spacing: none` on a `highlight-secondary` testimonial sandwiched between two `standard-primary` sections creates a bold color band effect that breaks up long pages without adding empty space.
- **Use placeholder images intentionally.** If you genuinely lack a client photo, the placeholder keeps the two-column layout intact. A broken layout with one empty column is worse than an obvious placeholder.
