# Testimonials Widget

Social-proof section that displays customer quotes in a grid or carousel, with optional star ratings, avatars, and attribution lines.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---|---|---|
| `eyebrow` | Any text (blank by default) | Small label above the headline, useful for phrases like "Don't take our word for it" |
| `eyebrow_uppercase` | `true` / `false` (default) | Uppercases the eyebrow text for a more formal label treatment |
| `title` | Any text (default: "What Our Customers Say") | Section headline; renders as `<h1>` when the widget is first on the page, `<h2>` otherwise |
| `description` | Any text (blank by default) | Subtext paragraph below the headline |
| `heading_alignment` | `start`, `center` (default) | Left-aligns the header block or centers it; left works better when paired with asymmetric layouts |
| `layout` | `grid` (default), `carousel` | Grid shows all cards at once with staggered reveal animations; carousel adds prev/next navigation and horizontal scrolling |
| `columns_desktop` | 2 -- 5 (default: 4) | Number of columns on desktop; mobile collapses automatically |
| `card_layout` | `box` (default), `flat` | Box gives each card a bordered, padded container; flat removes the card chrome for a more editorial look |
| `color_scheme` | `standard-primary` (default), `standard-secondary`, `highlight-primary`, `highlight-secondary` | Standard uses the default page background; highlight swaps to theme highlight colors |
| `top_spacing` | `auto` (default), `small`, `none` | `small` reduces spacing for tighter rhythm; `none` removes it entirely for flush stacking |
| `bottom_spacing` | `auto` (default), `small`, `none` | `small` reduces spacing for tighter rhythm; `none` removes it entirely for flush stacking |

---

## Available Blocks

| Block Type | Key Settings | Notes |
|---|---|---|
| `quote` | `quote` (textarea) -- the testimonial body text | The primary content; keep quotes concise (1-3 sentences) for scannability |
| | `avatar` (image) -- circular headshot | 4.8 rem circle crop; when omitted the author row tightens up automatically |
| | `name` (text) -- person's name | Rendered in semibold heading font for emphasis |
| | `title` (text) -- role / company | Smaller meta text below the name; doubles as credibility signal |
| | `rating` (select) -- `""`, `3`, `4`, `5` (default: `5`) | Star rating row above the quote; blank hides it entirely |

---

## Layout Recipes

### 1. The Classic Wall of Love

| Setting | Value |
|---|---|
| `layout` | grid |
| `columns_desktop` | 3 |
| `card_layout` | box |
| `color_scheme` | standard-secondary |
| `heading_alignment` | center |

**Good for:** Homepage social proof that needs to feel substantial without overwhelming.
Fill with 6 quotes (two clean rows). Use avatars on every card to humanize the grid.

---

### 2. Compact Review Strip

| Setting | Value |
|---|---|
| `layout` | carousel |
| `columns_desktop` | 4 |
| `card_layout` | box |
| `color_scheme` | standard-primary |
| `rating` (on blocks) | 5 on all |

**Good for:** E-commerce product pages or booking sites where star ratings matter most.
Load 6-8 short quotes (one sentence each) and let the carousel handle overflow. Stars draw the eye first.

---

### 3. Editorial Testimonials

| Setting | Value |
|---|---|
| `layout` | grid |
| `columns_desktop` | 2 |
| `card_layout` | flat |
| `color_scheme` | highlight-primary |
| `heading_alignment` | start |
| `eyebrow` | "Client Stories" |

**Good for:** Portfolio or case-study pages where longer, story-driven quotes feel natural.
Use 2-4 longer quotes without star ratings. Skip avatars for a cleaner editorial feel; rely on name + company for attribution.

---

### 4. Highlight Reel

| Setting | Value |
|---|---|
| `layout` | grid |
| `columns_desktop` | 3 |
| `card_layout` | box |
| `color_scheme` | highlight-secondary |
| `heading_alignment` | center |
| `top_spacing` | none |
| `bottom_spacing` | none |

**Good for:** A bold, colored band sandwiched between two standard-background sections for visual contrast.
Stack 3 quotes in a single row. Every card gets an avatar. The highlight-secondary scheme makes the entire strip pop against neighboring white sections.

---

### 5. Single Spotlight

| Setting | Value |
|---|---|
| `layout` | carousel |
| `columns_desktop` | 2 |
| `card_layout` | flat |
| `color_scheme` | standard-primary |
| `heading_alignment` | center |

**Good for:** Landing pages where one quote should dominate at a time and visitors can browse at their pace.
Add 4-5 quotes with avatars and titles. The carousel at 2 columns gives each quote generous breathing room while hinting that more exist.

---

### 6. Five-Star Proof Bar

| Setting | Value |
|---|---|
| `layout` | grid |
| `columns_desktop` | 5 |
| `card_layout` | flat |
| `color_scheme` | standard-secondary |
| `heading_alignment` | center |
| `rating` (on blocks) | 5 on all |

**Good for:** Maximizing density -- shows the most social proof in the least vertical space.
Use 5 very short quotes (one sentence). Drop avatars. The five columns of five-star ratings create an immediate wall of credibility.

---

### 7. Founder Quotes

| Setting | Value |
|---|---|
| `layout` | grid |
| `columns_desktop` | 2 |
| `card_layout` | box |
| `color_scheme` | highlight-primary |
| `heading_alignment` | start |
| `eyebrow` | "Trusted By Leaders" |
| `rating` (on blocks) | (blank -- hidden) |

**Good for:** Service pages where the authority of the person matters more than a star count.
Use 4 quotes. Always include avatars and detailed titles (e.g., "VP of Engineering, Stripe"). No star ratings -- the job titles do the persuading.

---

## Differentiation Tips

- **Mix ratings intentionally.** A wall of nothing but 5-star reviews can feel manufactured. Dropping one card to 4 stars actually increases trust, especially for service businesses.
- **Avatars are optional but powerful.** Cards without avatars look cleaner; cards with avatars convert better. Use avatars when credibility matters (homepage, pricing page) and skip them when aesthetics matter (portfolio, about page).
- **Flat + highlight is the editorial combo.** Removing card borders while switching to a highlight color scheme creates a magazine-style testimonial section that stands apart from the typical boxed grid.
- **Carousel shines at 6+ quotes.** Below that count, a grid is almost always better because visitors see everything at once. Carousels hide content behind interaction, so only use them when you have enough material to justify it.
- **Eyebrow text reframes the section.** Instead of letting the headline do all the work, use the eyebrow to set context: "Real Results," "From Our Clients," "Don't Just Take Our Word For It." It primes the reader before they hit the title.
- **Flush stacking creates visual bands.** Setting `top_spacing` and `bottom_spacing` to `none` lets you butt the testimonials directly against a CTA or hero section, creating a seamless color-banded page layout.
- **Title field is your credibility lever.** "Sarah J." is weak. "Sarah Johnson, Marketing Director at TechCorp" is strong. Always fill in the title with role and company when possible -- it is the single highest-impact detail for B2B proof.
