# Countdown Widget Insights

A time-based countdown section that ticks toward a target date, displaying days/hours/minutes/seconds with optional heading text, a CTA button, and an expiry message.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---|---|---|
| `eyebrow` | Any text (blank by default) | Small label above the headline -- adds context like "Limited Time" or "Grand Opening" |
| `title` | Any text (default "Coming Soon") | Main headline rendered as h1 (first widget) or h2 |
| `description` | Any text (blank by default) | Paragraph below the headline for extra detail |
| `heading_alignment` | `center` (default), `left` | Centers or left-aligns the entire block including the timer digits |
| `target_date` | Datetime string, e.g. `2027-01-01 00:00` | The moment the counter reaches zero |
| `expired_message` | Any text (default "The wait is over!") | Accent-colored message that replaces the digits once the target passes |
| `button` | Link object (text + href + optional target) | CTA button below the timer; hidden when text is blank |
| `show_seconds` | `true` (default) / `false` | Adds or removes the seconds column and its separator |
| `style` | `cards` (default), `minimal` | Cards: bordered rounded boxes per unit. Minimal: larger bare numbers separated by colons |
| `color_scheme` | `standard-primary`, `standard-secondary`, `highlight-primary`, `highlight-secondary` | Controls background and card fill; accent variants give cards a secondary background |
| `top_spacing` | `auto` (default), `none` | Removes top section padding so the widget can sit flush against the section above |
| `bottom_spacing` | `auto` (default), `none` | Removes bottom section padding for the same flush effect downward |

---

## Available Blocks

This widget has no configurable blocks. All content is controlled through top-level settings.

---

## Layout Recipes

### 1. Grand Opening Announcement

| Setting | Value |
|---|---|
| `eyebrow` | "Save the Date" |
| `title` | "We're Opening Our Doors" |
| `description` | "Join us for the ribbon cutting -- refreshments, live music, and exclusive day-one deals." |
| `style` | `cards` |
| `color_scheme` | `highlight-primary` |
| `button` | "Get Directions" linking to Google Maps |
| `show_seconds` | `false` |
| `heading_alignment` | `center` |

**Good for:** Building anticipation for a physical location launch.
**Industries:** Restaurants, retail shops, fitness studios, salons, co-working spaces.

---

### 2. Flash Sale Urgency Strip

| Setting | Value |
|---|---|
| `eyebrow` | "Ends Tonight" |
| `title` | "Summer Flash Sale" |
| `description` | (blank) |
| `style` | `minimal` |
| `color_scheme` | `standard-secondary` |
| `button` | "Shop Now" linking to product catalog |
| `show_seconds` | `true` |
| `top_spacing` | `none` |
| `bottom_spacing` | `none` |
| `heading_alignment` | `left` |

**Good for:** Short-duration promotions where the ticking seconds create real urgency.
**Industries:** E-commerce, boutiques, online course creators, SaaS with limited-time pricing.

---

### 3. Event Registration Deadline

| Setting | Value |
|---|---|
| `eyebrow` | "Early Bird Pricing" |
| `title` | "Annual Fundraiser Gala" |
| `description` | "Register before the deadline to lock in discounted tickets." |
| `style` | `cards` |
| `color_scheme` | `standard-primary` |
| `button` | "Reserve Your Seat" linking to registration form |
| `show_seconds` | `false` |
| `heading_alignment` | `center` |

**Good for:** Driving early registrations by making the cutoff date tangible.
**Industries:** Nonprofits, conferences, community organizations, wedding planners.

---

### 4. Product / Service Launch Teaser

| Setting | Value |
|---|---|
| `eyebrow` | (blank) |
| `title` | "Something New Is Brewing" |
| `description` | "Sign up to be the first to know." |
| `style` | `minimal` |
| `color_scheme` | `highlight-secondary` |
| `button` | "Join the Waitlist" linking to email signup |
| `show_seconds` | `true` |
| `heading_alignment` | `center` |
| `expired_message` | "It's here -- check it out!" |

**Good for:** Pre-launch hype pages where the countdown doubles as an email capture moment.
**Industries:** Craft breweries, tech startups, skincare brands, indie game studios.

---

### 5. Seasonal Menu / Offering Countdown

| Setting | Value |
|---|---|
| `eyebrow` | "Coming This Friday" |
| `title` | "Holiday Menu Available Soon" |
| `description` | (blank) |
| `style` | `cards` |
| `color_scheme` | `highlight-primary` |
| `button` | "See the Full Menu" linking to menu page |
| `show_seconds` | `false` |
| `heading_alignment` | `left` |

**Good for:** Seasonal rotations where you want repeat visitors checking back.
**Industries:** Restaurants, bakeries, cafes, catering companies, florists.

---

### 6. Maintenance / Downtime Notice

| Setting | Value |
|---|---|
| `eyebrow` | "Scheduled Maintenance" |
| `title` | "We'll Be Back Shortly" |
| `description` | "We're upgrading our systems. Everything will be back to normal soon." |
| `style` | `minimal` |
| `color_scheme` | `standard-primary` |
| `button` | "Check Status" linking to status page |
| `show_seconds` | `true` |
| `heading_alignment` | `center` |
| `expired_message` | "We're back online!" |

**Good for:** Temporary holding pages during planned downtime that keep visitors informed instead of confused.
**Industries:** Any service-based business, SaaS platforms, booking sites, membership portals.

---

## Differentiation Tips

- **Pair the eyebrow with a short, punchy phrase** ("48 Hours Left", "Doors Open Dec 1") rather than generic labels. The eyebrow is the first thing the eye hits above the headline, so it should carry real information.
- **Use `minimal` style for inline urgency and `cards` style for standalone sections.** Minimal works best sandwiched between other content with spacing set to `none` on both ends. Cards command their own visual block and benefit from a highlight color scheme.
- **Turn off seconds for dates more than a week out.** Watching seconds tick on a 30-day countdown feels meaningless. Save the seconds column for last-48-hours urgency where every tick matters.
- **Write expired messages that drive action, not just announce completion.** "The wait is over!" is fine, but "Doors are open -- walk in today!" or "Sale ended -- join the list for the next one" keeps the widget useful after zero.
- **Combine `highlight-secondary` with `cards` for maximum visual weight.** The secondary background fill on the cards creates strong contrast, making the digits pop. Use this when the countdown is the hero of the page, not a supporting element.
- **Left-align when the countdown sits beside other left-aligned content** (text blocks, feature lists). Center-align when it occupies a full-width standalone section. Mixing alignment with surrounding content looks unintentional.
- **Set a meaningful `expired_message` and `button` combination.** After the countdown ends, the widget stays on the page. A dead timer with no next step wastes prime screen space. Always pair the expiry state with a redirect or follow-up action.
