# Steps Widget — Insights

A numbered, zigzag timeline that pairs an image with a title, rich-text description, and optional CTA button for each step, connected by a vertical line and accent-colored badges.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---|---|---|
| `eyebrow` | Any text (blank by default) | Small label above the headline; adds a category or context tag to the section |
| `title` | Any text (default "How It Works") | Main section headline; renders as `h1` when widget is first on the page, `h2` otherwise |
| `description` | Any text (blank by default) | Subtitle paragraph below the headline |
| `heading_alignment` | `start` | Centers or left-aligns the eyebrow/title/description header block |
| `color_scheme` | `standard-primary`, `standard-secondary`, `highlight-primary`, `highlight-secondary` | Controls background and text palette for the entire section. Non-standard schemes add a padded container and override `--widget-bg-color` |
| `top_spacing` | `auto` (default), `none` | Removes top padding when set to `none`; useful for butting the widget directly against the section above |
| `bottom_spacing` | `auto` (default), `none` | Removes bottom padding when set to `none` |

---

## Available Blocks

| Block Type | Key Settings | Notes |
|---|---|---|
| `step` | `image` (image picker), `title` (text), `description` (richtext), `button_link` (link with text, href, target) | Max 8 blocks. Odd steps render image-left / text-right; even steps flip to text-left / image-right, creating the zigzag pattern. On mobile (<750px) layout collapses to a single centered column. Each badge auto-numbers from 1. |

---

## Layout Recipes

### 1. Classic "How It Works" — 3 Steps, No Images

**Settings:** title "How It Works", heading_alignment center, color_scheme standard
**Blocks:** 3 steps with titles and short descriptions; leave image blank on all; no buttons.
**Good for:** Explaining a simple booking or ordering flow.
**Industries:** Restaurants, salons, cleaning services, pet groomers.

### 2. Portfolio Process Walkthrough — 4 Steps With Photos

**Settings:** eyebrow "Our Process", title "From Concept to Completion", heading_alignment start, color_scheme standard-secondary
**Blocks:** 4 steps each with a project photo (sketch, 3D render, construction, finished room), descriptive titles, and one-paragraph descriptions.
**Good for:** Showcasing a creative or construction workflow where visuals prove credibility.
**Industries:** Architects, interior designers, renovation contractors, landscapers.

### 3. Onboarding Funnel — 3 Steps With CTAs

**Settings:** title "Get Started in Minutes", heading_alignment center, color_scheme highlight
**Blocks:** 3 steps (Sign Up, Customize, Launch) each with a short description and a button_link ("Create Account", "See Plans", "Go Live").
**Good for:** SaaS or app landing pages that need to drive sign-ups by showing simplicity.
**Industries:** Software products, online course platforms, subscription boxes.

### 4. Before-and-After Timeline — 4 Steps With Contrast Images

**Settings:** eyebrow "The Journey", title "Your Transformation", heading_alignment center, color_scheme standard
**Blocks:** 4 steps showing progression photos (initial consultation, treatment plan, mid-progress, final result), each with a detailed richtext description.
**Good for:** Demonstrating visible results over time to build trust.
**Industries:** Dental clinics, fitness studios, skincare clinics, home staging.

### 5. Highlighted FAQ Alternative — 5 Short Steps

**Settings:** title "What to Expect", heading_alignment start, color_scheme highlight-secondary, top_spacing none
**Blocks:** 5 steps with concise titles (Book, Prepare, Arrive, Experience, Follow-Up) and two-sentence descriptions; no images, no buttons.
**Good for:** Reducing pre-visit anxiety by spelling out the customer journey in detail.
**Industries:** Medical offices, spas, legal consultations, auto repair shops.

### 6. Product Manufacturing Story — 6 Steps With Photos

**Settings:** eyebrow "Craftsmanship", title "How Your Order Is Made", heading_alignment center, color_scheme standard-secondary
**Blocks:** 6 steps each with a workshop/factory photo and a short paragraph (Source materials, Cut & shape, Assemble, Finish, Quality check, Ship).
**Good for:** Artisan or DTC brands that want to justify premium pricing through transparency.
**Industries:** Custom furniture makers, jewelry designers, specialty food producers, craft breweries.

### 7. Event Planning Flow — 4 Steps With Buttons

**Settings:** title "Plan Your Event", heading_alignment center, color_scheme highlight
**Blocks:** 4 steps (Inquiry, Proposal, Planning, Event Day) with venue/decor images, descriptions, and buttons linking to contact form, sample menus, and gallery pages.
**Good for:** Walking potential clients through a service engagement from first contact to delivery.
**Industries:** Wedding planners, caterers, venue rentals, photographers.

---

## Differentiation Tips

- **Use the zigzag to your advantage.** The alternating image/text layout already creates visual interest. Avoid making all images the same shape or tone; alternate between close-ups and wide shots to reinforce the left-right rhythm.
- **Keep step count between 3 and 5 for most businesses.** More than 5 risks looking complicated. Reserve 6-8 steps for manufacturing or technical audiences who expect detail.
- **Skip images when speed is the message.** A three-step, image-free version communicates "this is easy" faster than a version loaded with photos. Pair with the highlight color scheme to keep it visually engaging without imagery.
- **Pair eyebrow + left alignment for editorial feel.** Center alignment reads as corporate; left-aligned with an eyebrow like "Our Approach" feels more personal and editorial, which suits studios and boutique agencies.
- **Use buttons sparingly.** One or two CTAs across the entire step sequence (typically on the first and last step) guide without overwhelming. Putting a button on every step dilutes urgency.
- **Collapse spacing to chain sections.** Set top_spacing or bottom_spacing to none when placing the steps widget directly below a hero or above a CTA banner to create a seamless visual flow.
- **Color scheme as a section divider.** Switching to highlight or highlight-secondary makes the steps section feel like a distinct band on the page, which helps break up long one-column layouts without adding extra widgets.
