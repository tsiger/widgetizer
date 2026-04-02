# Event List Widget

A date-driven list of upcoming events, each shown as a card with a prominent day/month badge, location, description, and call-to-action button.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---------|--------|---------------|
| `eyebrow` | Any text (blank by default) | Small label above the headline, useful for "What's On" or "Save the Date" framing |
| `title` | Any text (default "Upcoming Events") | Section headline; renders as `<h1>` when the widget is the first on the page, `<h2>` otherwise |
| `description` | Any text (blank by default) | Paragraph below the headline for context or a short invitation |
| `heading_alignment` | `left`, `center` (default) | Left-aligns the header block for editorial layouts; center works for standalone sections |
| `color_scheme` | `standard`, `standard-accent`, `highlight`, `highlight-accent` | **standard** -- no card background or border. **standard-accent** -- adds secondary background + border to each card. **highlight** -- tinted section background + card border. **highlight-accent** -- tinted section background + secondary card fill + border |
| `top_spacing` | `auto`, `none` | Removes top padding so the widget can sit flush against the section above it |
| `bottom_spacing` | `auto`, `none` | Removes bottom padding so the widget can sit flush against the section below it |

---

## Available Blocks

| Block Type | Key Settings | Notes |
|------------|-------------|-------|
| `event` | `day` (text, e.g. "15"), `month` (text, e.g. "Dec"), `title`, `location`, `description` (richtext), `button_link` (text + href + target) | Each block renders as one event card. The date badge is always visible. Description supports rich text (sanitized HTML). The button is a secondary-style link; leave its text blank to hide it entirely. |

---

## Layout Recipes

### 1. Simple Upcoming-Events Section
- **Settings**: title "Upcoming Events", heading_alignment center, color_scheme standard
- **Blocks**: 3 events with day/month, title, location, and "Learn More" buttons
- **Good for**: Default starting point on any site that hosts occasional events
- **Industries**: Professional services, nonprofits, community organizations

### 2. Workshop Schedule with Accent Cards
- **Settings**: eyebrow "Workshops", title "Hands-On Sessions", heading_alignment left, color_scheme standard-accent
- **Blocks**: 4-6 events, each with a description paragraph explaining what attendees will learn and a "Reserve a Spot" button
- **Good for**: Highlighting educational or training events where the description copy matters
- **Industries**: Fitness studios, cooking schools, coworking spaces, continuing education

### 3. Highlighted Concert / Performance Calendar
- **Settings**: eyebrow "Live Music", title "What's On", heading_alignment center, color_scheme highlight-accent, top_spacing none (placed directly below a hero)
- **Blocks**: 5-8 events, location set to venue + time, button text "Get Tickets"
- **Good for**: Venues that rotate acts frequently and want a bold, attention-grabbing listing
- **Industries**: Bars, music venues, theaters, cultural centers

### 4. Minimal Agenda (No Descriptions)
- **Settings**: title "Schedule", heading_alignment left, color_scheme standard
- **Blocks**: 3-5 events with day/month, title, and location only -- leave description and button_link blank
- **Good for**: A clean at-a-glance schedule where visitors just need dates, names, and places
- **Industries**: Conferences, meetup groups, religious organizations

### 5. Seasonal Open-House Dates
- **Settings**: eyebrow "Visit Us", title "Open House Dates", description "Come tour our space and meet the team.", heading_alignment center, color_scheme highlight
- **Blocks**: 2-3 events with short descriptions and "RSVP" buttons
- **Good for**: Driving foot traffic to periodic in-person visits
- **Industries**: Real estate brokerages, private schools, wedding venues, senior living communities

### 6. Multi-Day Conference Breakdown
- **Settings**: title "Conference Agenda", heading_alignment left, color_scheme standard-accent
- **Blocks**: 6-8 events spanning different days, descriptions summarizing each session, buttons linking to speaker bios or session detail pages
- **Good for**: A single-page rundown of a multi-day program
- **Industries**: Tech conferences, trade shows, academic symposiums

### 7. Fundraiser Gala Timeline
- **Settings**: eyebrow "Annual Gala", title blank (rely on a hero above), heading_alignment left, color_scheme highlight-accent, top_spacing none
- **Blocks**: 3-4 events representing gala milestones (Cocktail Hour, Dinner, Auction, After-Party), descriptions painting the scene, button text "Buy Table"
- **Good for**: Giving donors a vivid sense of the evening's flow
- **Industries**: Nonprofits, foundations, alumni associations, charities

---

## Differentiation Tips

- **Date badge is the star.** Unlike a generic card grid, the oversized day + month badge instantly communicates "this is time-sensitive." Use short month abbreviations (Jan, Feb) and numeric days to keep the badge scannable.
- **Pair with a hero or banner above.** Set top_spacing to none and use a highlight color scheme so the events section feels like a continuation of the page's main message, not a bolted-on afterthought.
- **Keep event count intentional.** Three to five events feels curated; more than eight starts to feel like an unfiltered database dump. If you have many events, show only the next few and link to a full calendar page.
- **Location doubles as context.** The location field is free text -- use it for "Online" vs. a city name, or append a time ("Brooklyn, NY -- 7 PM"). This single line often answers the two biggest questions visitors have: where and when.
- **Rich-text descriptions are optional power.** For simple listings, skip the description entirely for a tighter layout. For events that need selling (workshops, galas), use a one- or two-sentence pitch in the description to drive registrations.
- **Button text signals intent.** "Register Now," "Get Tickets," "RSVP," and "Learn More" set very different expectations. Match the button label to the action visitors will actually take on the linked page.
- **Color-scheme accent variants add card separation.** On pages with lots of content sections, switching to standard-accent or highlight-accent gives each event card a visible boundary, preventing the list from blending into surrounding widgets.
