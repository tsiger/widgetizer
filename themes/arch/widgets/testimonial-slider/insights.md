# Testimonial Slider

A single-quote carousel that cross-fades between customer testimonials, with optional star ratings, avatars, and pagination dots.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---------|--------|---------------|
| `autoplay` | `true` (default) / `false` | Slides advance automatically when enabled; pauses on manual interaction when disabled |
| `autoplay_speed` | `3000`--`10000` ms, step 1000 (default `5000`) | Controls dwell time per slide; lower values feel urgent, higher values let readers finish long quotes |
| `color_scheme` | `standard-primary` / `standard-secondary` / `highlight-primary` / `highlight-secondary` | `standard-primary` inherits page background with no extra padding. The other three add a padded container and swap `--bg-primary`, giving a distinct band of color behind the quotes |
| `top_spacing` | `auto` (default) / `none` | `none` removes the top margin so the widget can butt up against the section above it |
| `bottom_spacing` | `auto` (default) / `none` | Same as above for the bottom edge; useful when stacking testimonials directly above a CTA |

---

## Available Blocks

| Block Type | Key Settings | Notes |
|------------|-------------|-------|
| `quote` | `quote` (textarea), `avatar` (image), `name` (text), `title` (text), `rating` (select: blank / 3 / 4 / 5) | Max 8 blocks. Rating renders filled/empty stars out of 5. Avatar is circular (64px desktop, 48px mobile). Omitting rating hides the star row entirely. Omitting avatar still looks clean because the layout stacks vertically around the name/title. |

---

## Layout Recipes

### 1. The Trust Trio

Three 5-star reviews from recognizable local roles (e.g., "Owner, Main St Bakery"). Autoplay on, speed 5000 ms, `standard-primary` color scheme. No avatars needed.

**Good for:** Landing pages that need quick social proof without heavy imagery.
**Industries:** Professional services, accountants, insurance agents, consultants.

### 2. Faces-First Carousel

Five testimonials, each with a headshot avatar. Autoplay on, speed 6000 ms to give visitors time to register the face. `highlight-primary` color scheme to create a distinct band that draws the eye.

**Good for:** Service businesses where personal connection matters and real photos build trust.
**Industries:** Salons, dental offices, personal trainers, real estate agents.

### 3. Slow-Burn Single Review

One long, detailed testimonial. Autoplay off (only one slide, so pagination dots hide automatically). `highlight-secondary` color scheme for maximum contrast. Pair it between a services section and a contact form.

**Good for:** High-ticket services where a single powerful story outweighs volume.
**Industries:** Home remodelers, wedding planners, custom furniture makers, law firms.

### 4. Social-Proof Speed Strip

Six to eight short one-sentence quotes. Autoplay on, speed 3000 ms so they cycle fast. `standard-secondary` scheme with `top_spacing: none` and `bottom_spacing: none` so it sits flush between content blocks like a ticker.

**Good for:** Pages that already have lots of content and need a compact credibility beat.
**Industries:** E-commerce shops, SaaS landing pages, subscription boxes, online courses.

### 5. Star-Rated Showcase

Four reviews with explicit star ratings (mix of 4 and 5 stars to feel authentic). Autoplay on, speed 5000 ms. `standard-primary` color scheme so the stars themselves provide the visual punch. Avatars omitted to keep the focus on the rating and the quote text.

**Good for:** Businesses that also appear on Google or Yelp and want their site reviews to feel consistent with those platforms.
**Industries:** Restaurants, auto repair, cleaning services, pet groomers.

### 6. Hero Follow-Up

Two to three testimonials placed directly below a hero widget. `highlight-primary` scheme, `top_spacing: none` so there is no gap after the hero. Autoplay on, speed 7000 ms for a calm cadence. Include avatars and titles.

**Good for:** Homepage designs where the hero makes a promise and the testimonials immediately validate it.
**Industries:** Agencies, photography studios, tutoring services, gyms.

### 7. Closing Argument

Three testimonials positioned just above the footer. `standard-secondary` scheme, `bottom_spacing: none`. Autoplay on, speed 5000 ms. Short punchy quotes, no avatars, 5-star ratings.

**Good for:** Reinforcing trust right before the visitor decides to leave or take action on a contact/booking link in the footer.
**Industries:** Any small business; especially effective for service-area businesses like plumbers, electricians, and landscapers.

---

## Differentiation Tips

- **Mix ratings deliberately.** Throwing in a 4-star review among 5-star ones makes the whole set feel more believable. A wall of perfect scores triggers skepticism.
- **Keep quotes conversational.** Short sentences with specific details ("cut our water bill by 30%") outperform generic praise ("great service, highly recommend"). Edit customer quotes down to the strongest sentence or two.
- **Use titles that signal relevance.** "Owner, Downtown Cafe" tells a prospect more than "John D." Titles also explain why the reviewer's opinion should matter.
- **Avatars are optional but powerful.** A real headshot increases trust substantially, but a generic placeholder does the opposite. If you do not have a real photo, leave the avatar blank rather than using a stock image.
- **Pair with a color scheme that contrasts the surrounding sections.** If the sections above and below use `standard-primary`, switch the testimonial slider to `highlight-primary` or `highlight-secondary` so it reads as a distinct social-proof moment rather than blending in.
- **Adjust autoplay speed to quote length.** A two-sentence quote needs maybe 4000 ms. A full paragraph needs 7000-8000 ms. If visitors cannot finish reading before the slide changes, autoplay hurts rather than helps.
- **One testimonial is a valid choice.** A single powerful quote with no pagination dots looks intentional and editorial, not empty. It works especially well for niche businesses that have one marquee client story.
