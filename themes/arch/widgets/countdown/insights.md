# Countdown Widget Insights

A time-based countdown section that ticks toward a target date, displaying days/hours/minutes/seconds with optional heading text, a CTA button, and an expiry message.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---|---|---|
| `eyebrow` | Any text (blank by default) | Small label above the headline -- adds context like "Limited Time" or "Grand Opening" |
| `eyebrow_uppercase` | `true` / `false` (default) | Uppercases the eyebrow text for a more formal label treatment |
| `title` | Any text (default "Coming Soon") | Main headline rendered as h1 (first widget) or h2 |
| `description` | Any text (blank by default) | Paragraph below the headline for extra detail |
| `heading_alignment` | `start`, `center` (default) | Centers or left-aligns the entire block including the timer digits |
| `target_date` | Datetime string, e.g. `2027-01-01 00:00` | The moment the counter reaches zero |
| `expired_message` | Any text (default "The wait is over!") | Accent-colored message that replaces the digits once the target passes |
| `text` | Richtext (blank by default) | Additional richtext content below the timer and above the button. Good for extra details, terms, or a short promotional message |
| `button` | Link object (text + href + optional target) | CTA button below the timer; hidden when text is blank |
| `show_seconds` | `true` (default) / `false` | Adds or removes the seconds column and its separator |
| `style` | `cards` (default), `minimal` | Cards: bordered rounded boxes per unit. Minimal: larger bare numbers separated by colons |
| `color_scheme` | `standard-primary`, `standard-secondary`, `highlight-primary`, `highlight-secondary` | Controls background and card fill; accent variants give cards a secondary background |
| `top_spacing` | `auto` (default), `small`, `none` | `small` reduces spacing for tighter rhythm; `none` removes it entirely for flush stacking |
| `bottom_spacing` | `auto` (default), `small`, `none` | Same as above for the bottom edge |

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

---

### 2. Limited-Time Promotion Strip

| Setting | Value |
|---|---|
| `eyebrow` | "Ends This Weekend" |
| `title` | "20% Off All Services" |
| `description` | (blank) |
| `style` | `minimal` |
| `color_scheme` | `standard-secondary` |
| `button` | "Book Now" linking to contact/booking page |
| `show_seconds` | `true` |
| `top_spacing` | `none` |
| `bottom_spacing` | `none` |
| `heading_alignment` | `start` |

**Good for:** Short-duration promotions where the ticking clock creates real urgency.

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

---

### 4. New Service or Location Launch

| Setting | Value |
|---|---|
| `eyebrow` | "Coming Soon" |
| `title` | "New Location in Westside" |
| `description` | "We're expanding. Be the first to book at our new studio." |
| `style` | `minimal` |
| `color_scheme` | `highlight-secondary` |
| `button` | "Get Notified" linking to contact page |
| `show_seconds` | `false` |
| `heading_alignment` | `center` |
| `expired_message` | "We're open -- book your first visit!" |

**Good for:** Building anticipation for a new location, service, or menu launch.

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
| `heading_alignment` | `start` |

**Good for:** Seasonal rotations where you want repeat visitors checking back.

---

### 6. Class or Workshop Registration Deadline

| Setting | Value |
|---|---|
| `eyebrow` | "Spots Limited" |
| `title` | "Fall Workshop Series" |
| `description` | "Registration closes when the timer hits zero. Reserve your spot today." |
| `style` | `cards` |
| `color_scheme` | `standard-primary` |
| `button` | "Register Now" linking to booking page |
| `show_seconds` | `false` |
| `heading_alignment` | `center` |
| `expired_message` | "Registration is closed — join the waitlist for the next session." |

**Good for:** Driving enrollment for classes, workshops, or seasonal programs with a firm cutoff.

---

## Differentiation Tips

- **Pair the eyebrow with a short, punchy phrase** ("48 Hours Left", "Doors Open Dec 1") rather than generic labels. The eyebrow is the first thing the eye hits above the headline, so it should carry real information.
- **Use `minimal` style for inline urgency and `cards` style for standalone sections.** Minimal works best sandwiched between other content with spacing set to `none` on both ends. Cards command their own visual block and benefit from a highlight color scheme.
- **Turn off seconds for dates more than a week out.** Watching seconds tick on a 30-day countdown feels meaningless. Save the seconds column for last-48-hours urgency where every tick matters.
- **Write expired messages that drive action, not just announce completion.** "The wait is over!" is fine, but "Doors are open -- walk in today!" or "Sale ended -- join the list for the next one" keeps the widget useful after zero.
- **Combine `highlight-secondary` with `cards` for maximum visual weight.** The secondary background fill on the cards creates strong contrast, making the digits pop. Use this when the countdown is the hero of the page, not a supporting element.
- **Left-align when the countdown sits beside other left-aligned content** (text blocks, feature lists). Center-align when it occupies a full-width standalone section. Mixing alignment with surrounding content looks unintentional.
- **Set a meaningful `expired_message` and `button` combination.** After the countdown ends, the widget stays on the page. A dead timer with no next step wastes prime screen space. Always pair the expiry state with a redirect or follow-up action.
