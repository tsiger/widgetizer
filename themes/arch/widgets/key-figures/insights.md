# Key Figures Widget

Animated statistics strip that counts up numbers on scroll, used to build instant credibility with visitors.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---------|--------|---------------|
| `eyebrow` | Any text | Small label above the headline, adds context like "Our Track Record" |
| `title` | Any text (default "By The Numbers") | Section headline; rendered as h1 when the widget is first on the page, h2 otherwise |
| `description` | Any text | Paragraph below the headline for framing the stats |
| `heading_alignment` | `start`, `center` | Controls whether the header block sits flush-left or centered; left works better when the widget follows a text-heavy section |
| `layout` | `grid`, `carousel` | Grid shows all figures at once; carousel adds prev/next arrows and swipeable track, better when you have 5+ figures |
| `columns_desktop` | 2 -- 5 | Number of columns on desktop; mobile always stacks. 4 is the sweet spot for most sites; 2 gives each stat more breathing room |
| `card_layout` | `box`, `flat` | Box adds padding and (depending on color scheme) a background/border to each card; flat removes all card chrome for a minimal look |
| `animate` | true / false | Enables the odometer count-up animation on scroll. Respects prefers-reduced-motion. Resets and replays when scrolled out and back in |
| `color_scheme` | `standard-primary`, `standard-secondary`, `highlight-primary`, `highlight-secondary` | Standard uses page background; accent adds secondary background to cards; highlight inverts to the theme highlight palette; highlight-secondary combines both |
| `top_spacing` | `auto`, `none` | Removes top padding so the widget can butt against the section above it |
| `bottom_spacing` | `auto`, `none` | Removes bottom padding for the same purpose |

---

## Available Blocks

| Block Type | Key Settings | Notes |
|------------|-------------|-------|
| `figure` | `number` -- the numeric value (string, e.g. "500") | Drives the odometer animation target. Can include non-digit characters like commas or decimals within the number string |
| | `suffix` -- text appended after the number (e.g. "+", "%", "/7") | Displayed as static characters next to the animated digits |
| | `label` -- short heading below the number (e.g. "Happy Clients") | Rendered as h3 (or h2 when widget has no title) |
| | `description` -- supporting detail (e.g. "And growing every day") | Optional one-liner beneath the label, rendered as body-small text |

---

## Layout Recipes

### 1. The Trust Bar

**Settings:** 4 figures, grid, 4 columns, flat card layout, standard color scheme, heading alignment center, animate on.
**Blocks:** Years in Business / Clients Served / Projects Completed / Satisfaction Rate.
**Good for:** Placing right below the hero on a homepage to establish credibility before the visitor scrolls further.
**Industries:** Consulting firms, law offices, accounting practices, any professional service.

### 2. Impact Dashboard

**Settings:** 3 figures, grid, 3 columns, box card layout, highlight color scheme, heading alignment start, animate on. Set eyebrow to something like "Our Impact" and add a description paragraph.
**Blocks:** Homes Sold / Average Days on Market / Total Sales Volume.
**Good for:** A dedicated results section on a landing page where the numbers themselves are the selling point.
**Industries:** Real estate agencies, nonprofits reporting outcomes, SaaS companies showing growth metrics.

### 3. Scrolling Social Proof

**Settings:** 6-8 figures, carousel layout, 4 columns, box card layout, standard-secondary color scheme, animate on.
**Blocks:** Mix of achievement stats like Certifications / 5-Star Reviews / Repeat Customers / Awards Won / Countries Served / Team Members.
**Good for:** Service pages where you have more proof points than a grid can comfortably fit without shrinking the numbers.
**Industries:** E-commerce stores, travel agencies, fitness studios, event companies.

### 4. Minimal Duo

**Settings:** 2 figures, grid, 2 columns, flat card layout, standard color scheme, heading alignment start, animate on. Remove spacing top/bottom (set both to none) so it sits tight between content sections.
**Blocks:** Two high-impact numbers, e.g. "15+ Years Experience" and "3,000+ Clients".
**Good for:** About pages or sidebar-style callouts where you want a quick credibility bump without a full stats section.
**Industries:** Freelancers, solo practitioners, boutique agencies, personal brand sites.

### 5. Highlighted Hero Stats

**Settings:** 3 figures, grid, 3 columns, box card layout, highlight-secondary color scheme, heading alignment center, animate on. Use a punchy title like "Why Choose Us" with no description to keep it tight.
**Blocks:** Response Time ("< 1" suffix "hr") / Uptime ("99.9" suffix "%") / Customers ("2,500" suffix "+").
**Good for:** Placing directly below a hero or CTA section on a tech or service homepage, using the highlight background to create visual separation.
**Industries:** IT services, hosting companies, SaaS products, managed service providers.

### 6. Full-Width Campaign Strip

**Settings:** 5 figures, grid, 5 columns, flat card layout, highlight color scheme, animate on. No title, no eyebrow, no description -- just the numbers. Set top and bottom spacing to none.
**Blocks:** Campaign metrics like Funds Raised / Volunteers / Events Held / Communities Reached / Meals Served.
**Good for:** A bold data band across a fundraising or campaign page that speaks for itself without any header copy.
**Industries:** Nonprofits, political campaigns, community organizations, crowdfunding pages.

### 7. Before-and-After Comparison

**Settings:** 4 figures, grid, 4 columns, box card layout, standard-secondary color scheme, heading alignment center, animate on. Title: "The Results Speak". Use the description field on each block to explain what the number means.
**Blocks:** Weight Lost ("1,200" suffix "lbs") with description "Total client results" / Sessions Completed / Retention Rate / Client Satisfaction.
**Good for:** Results-oriented pages where each number needs a short explanation to land properly.
**Industries:** Gyms, coaching businesses, weight loss clinics, tutoring services, marketing agencies reporting ROI.

---

## Differentiation Tips

- **Suffix creativity matters.** Go beyond "+" and "%". Suffixes like "/5", "x", "hrs", "M", or even short words make the stat more specific and memorable. "4.9/5" reads better than "98%".
- **Fewer figures hit harder.** Three or four well-chosen stats outperform six generic ones. Pick numbers that would surprise the visitor or that they can compare against competitors.
- **Pair flat + highlight for drama.** Using flat card layout with a highlight color scheme creates floating numbers on a bold background -- no card borders, just pure contrast.
- **Turn off animation for above-the-fold placement.** If the widget loads inside the initial viewport, the count-up animation happens before the user is ready to watch. Consider disabling animate and letting the numbers just appear.
- **Use the description field sparingly.** A label like "Happy Clients" is self-explanatory. Only add a description when the number needs context, like "Since 2018" or "Across 12 states".
- **Mix number magnitudes.** A row of "500+ / 98% / 24/7 / 10+" is visually more interesting than "500 / 600 / 700 / 800" because the varying digit counts create natural rhythm in the odometer animation.
- **Collapse spacing to merge with adjacent sections.** Setting top or bottom spacing to none lets you visually attach the stats strip to a hero, CTA, or testimonial section above or below it, creating one unified block instead of isolated sections.
