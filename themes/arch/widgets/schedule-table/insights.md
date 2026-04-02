# Schedule Table Widget — Insights

A two-column schedule widget that pairs a day/hours table with an optional sidebar for contact info and social links, with automatic "today" highlighting.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---|---|---|
| `eyebrow` | Any text (blank by default) | Small label above the headline; adds a category/context line |
| `title` | Any text (default "Opening Hours") | Main headline; renders as h1 when the widget is first on the page, h2 otherwise |
| `description` | Any text (blank by default) | Paragraph beneath the headline for extra context |
| `heading_alignment` | `left`, `center` | Controls whether the eyebrow/title/description block is left-aligned or centered |
| `note` | Any text (default "We are closed on public holidays") | Small muted footnote displayed below the last schedule row |
| `sidebar_position` | `left`, `right` | Places the info/social sidebar on the chosen side; uses CSS grid reordering |
| `week_start_day` | `0` (Sunday), `1` (Monday) | Determines which day block maps to index 0 for the "is-today" highlight calculation |
| `color_scheme` | `standard`, `standard-accent`, `highlight`, `highlight-accent` | Controls background and text theming; non-standard schemes add padded container and custom bg |
| `top_spacing` | `auto`, `none` | Removes top section padding when set to none; useful for stacking against an adjacent widget |
| `bottom_spacing` | `auto`, `none` | Removes bottom section padding when set to none |

---

## Available Blocks

| Block Type | Key Settings | Notes |
|---|---|---|
| `day` | `day` (text, e.g. "Monday"), `hours` (text, e.g. "9:00 AM - 5:00 PM"), `closed` (checkbox) | Core repeatable row. When `closed` is checked the hours text is replaced with a static "Closed" label and the row gets an `is-closed` class. Today's row is auto-highlighted with accent borders and semibold text via client-side JS. |
| `info` | `title` (text), `text` (richtext) | Sidebar content block. Supports formatted HTML via richtext. Multiple info blocks stack vertically in the sidebar. If no info or social blocks exist the sidebar column is removed and the table goes full-width. |
| `social` | (none -- pulls from theme-level social settings) | Renders the shared social-icons partial using `theme.social`. Appears in the sidebar alongside info blocks. |

---

## Layout Recipes

### 1. Classic Business Hours

- **Blocks:** 7 day blocks (Mon-Sun), 1 info block ("Contact Us" with phone + email)
- **Settings:** `heading_alignment: center`, `sidebar_position: right`, `color_scheme: standard`, `week_start_day: 1`
- **Good for:** The default setup. A clean, scannable hours table with contact details on the side.
- **Industries:** Retail shops, offices, medical clinics, banks, government offices

### 2. Restaurant Split-Shift Hours

- **Blocks:** 7 day blocks with split hours (e.g. "11:30 AM - 2:30 PM / 5:00 PM - 10:00 PM"), 1 info block ("Reservations" with phone number and a booking link in richtext)
- **Settings:** `heading_alignment: left`, `sidebar_position: right`, `color_scheme: highlight`, `note: "Kitchen closes 30 minutes before closing"`, `title: "Hours & Reservations"`
- **Good for:** Restaurants that have lunch and dinner services with a gap in between.
- **Industries:** Restaurants, bistros, wine bars, tapas bars

### 3. Weekend-Focused Venue

- **Blocks:** 5 day blocks (Wed-Sun only; Mon-Tue omitted or marked closed), 1 info block ("Location" with address), 1 social block
- **Settings:** `heading_alignment: center`, `sidebar_position: left`, `color_scheme: standard-accent`, `week_start_day: 0`, `eyebrow: "Plan Your Visit"`, `title: "We're Open"`
- **Good for:** Venues that only operate part of the week and want to emphasize open days rather than listing five closed ones.
- **Industries:** Galleries, museums, event venues, farmers markets, breweries

### 4. Gym / Fitness Studio

- **Blocks:** 7 day blocks with early-open hours (e.g. "5:30 AM - 10:00 PM"), 1 info block ("Front Desk" with phone), 1 info block ("Class Schedule" with a richtext link to a PDF or separate page)
- **Settings:** `heading_alignment: left`, `sidebar_position: right`, `color_scheme: highlight-accent`, `title: "Gym Hours"`, `note: "Staffed hours may differ -- see front desk"`
- **Good for:** Facilities where access hours differ from staffed hours, with sidebar used for secondary info links.
- **Industries:** Gyms, yoga studios, climbing gyms, community recreation centers

### 5. Seasonal / Holiday-Aware Shop

- **Blocks:** 7 day blocks, 1 info block ("Holiday Hours" with richtext listing upcoming exceptions like Christmas Eve, New Year)
- **Settings:** `heading_alignment: center`, `sidebar_position: right`, `color_scheme: standard`, `note: "Hours may change during public holidays -- see sidebar"`, `title: "Store Hours"`
- **Good for:** Shops that need to communicate both regular and exception hours without cluttering the main table.
- **Industries:** Retail, gift shops, garden centers, hardware stores

### 6. Professional Services -- Appointment Only

- **Blocks:** 5 day blocks (Mon-Fri), Saturday and Sunday marked closed, 1 info block ("Book an Appointment" with richtext containing a phone number, email, and a booking-link CTA)
- **Settings:** `heading_alignment: left`, `sidebar_position: right`, `color_scheme: standard-accent`, `title: "Office Hours"`, `eyebrow: "By Appointment"`, `note: "Walk-ins welcome Mon-Wed only"`
- **Good for:** Services where availability and booking info matter more than a simple open/closed status.
- **Industries:** Law firms, dental offices, accountants, therapists, consultants

### 7. Cafe with Social Presence

- **Blocks:** 7 day blocks, 1 info block ("Find Us" with address and a short richtext blurb), 1 social block
- **Settings:** `heading_alignment: center`, `sidebar_position: left`, `color_scheme: highlight`, `title: "When We're Brewing"`, `note: ""`
- **Good for:** Small cafes that lean on social media for daily specials and want their social links prominent alongside hours.
- **Industries:** Coffee shops, bakeries, juice bars, ice cream shops

---

## Differentiation Tips

- **Use the eyebrow to add context, not decoration.** "Visit Us", "By Appointment", or "Summer 2026 Hours" turns a generic hours table into something that communicates intent before the visitor even reads the title.
- **The note field is underused.** It is ideal for caveats that prevent phone calls: "Kitchen closes 30 min early", "Last entry at 4:30 PM", "Closed for private events -- check our Instagram." Delete the default if it does not apply.
- **Sidebar position matters for reading flow.** Put the sidebar on the left when the info block is the primary action (booking link, directions) and you want visitors to see it first. Keep it on the right when the hours themselves are the main content.
- **Do not list days you are never open.** A five-row table for a Mon-Fri business is cleaner than seven rows with two saying "Closed." Fewer rows means faster scanning.
- **Split hours go in the hours text field, not separate blocks.** "11 AM - 2 PM / 5 PM - 10 PM" on a single day row is more scannable than duplicating the day as two blocks.
- **The today-highlight is automatic but depends on `week_start_day`.** If the day blocks start with Sunday, set `week_start_day` to 0. If they start with Monday, leave it at 1. A mismatch will highlight the wrong row.
- **Stack multiple info blocks for distinct sidebar sections.** One for "Location", one for "Parking", one for "Reservations" keeps each piece of information under its own heading rather than cramming everything into one richtext blob.
- **Color scheme accent variants pair well with adjacent neutral widgets.** Using `highlight-accent` on the schedule table between two `standard` widgets draws the eye to hours without repainting the whole page.
