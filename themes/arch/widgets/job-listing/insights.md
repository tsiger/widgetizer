# Job Listing Widget — Insights

## Description

A filterable careers section that displays open positions as stacked cards with department, location, and employment-type metadata, plus optional department filter buttons.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---|---|---|
| `eyebrow` | Any text (default "Join Our Team") | Small label above the headline; omit to hide |
| `title` | Any text (default "Open Positions") | Section headline; renders as `h1` when the widget is the first on the page, `h2` otherwise |
| `description` | Any text (default blank) | Subtext paragraph below the headline |
| `heading_alignment` | `left`, `center` (default) | Controls whether the header block and filter buttons align left or center |
| `show_filters` | `true` (default), `false` | Toggles the department filter button bar; departments are auto-extracted from blocks |
| `color_scheme` | `standard`, `standard-accent`, `highlight`, `highlight-accent` | `standard` = transparent bg, no card borders. `standard-accent` = cards get a secondary bg fill + border. `highlight` = section-level colored bg + card borders. `highlight-accent` = colored bg + filled cards + borders |
| `top_spacing` | `auto` (default), `none` | Removes the default top padding when set to `none` |
| `bottom_spacing` | `auto` (default), `none` | Removes the default bottom padding when set to `none` |

---

## Available Blocks

| Block Type | Key Settings | Notes |
|---|---|---|
| `job` | `title` (text), `department` (text), `location` (text), `type` (select), `apply_link` (link) | Each block is one job card. `type` options: full-time, part-time, contract, internship. The `department` value feeds the auto-generated filter buttons. `apply_link` supports external URLs and new-tab targeting. |

---

## Layout Recipes

### 1. Minimal Careers Page

- **Settings:** eyebrow blank, title "We're Hiring", description blank, heading_alignment center, show_filters false, color_scheme standard
- **Blocks:** 2-3 job blocks
- **Good for:** Small teams with only a handful of roles who want a clean, no-frills listing
- **Industries:** Freelance studios, boutique agencies, independent shops

### 2. Department-Filtered Tech Board

- **Settings:** eyebrow "Careers", title "Open Positions", description "Find your next role with us.", heading_alignment center, show_filters true, color_scheme standard-accent
- **Blocks:** 6-10 job blocks across 3-4 departments (Engineering, Design, Marketing, Operations)
- **Good for:** Growing startups or mid-size companies that need visitors to quickly narrow by team
- **Industries:** SaaS companies, tech startups, digital agencies

### 3. Highlighted Single-Department Banner

- **Settings:** eyebrow "Now Hiring", title "Join Our Kitchen Team", description blank, heading_alignment left, show_filters false, color_scheme highlight
- **Blocks:** 2-4 job blocks all in the same department, mix of full-time and part-time
- **Good for:** A prominent "we're hiring" band embedded on a homepage rather than a dedicated careers page
- **Industries:** Restaurants, cafes, retail stores, salons

### 4. Internship & Entry-Level Showcase

- **Settings:** eyebrow "Start Here", title "Internship & Early-Career Openings", description "Kickstart your career with hands-on experience.", heading_alignment center, show_filters true, color_scheme standard
- **Blocks:** 4-6 job blocks, type set to internship or full-time, departments like Editorial, Research, Development
- **Good for:** Organizations that recruit junior talent seasonally and want a dedicated landing section
- **Industries:** Media companies, nonprofits, universities, law firms

### 5. Multi-Location Franchise Hiring

- **Settings:** eyebrow blank, title "Positions Near You", description blank, heading_alignment left, show_filters true, color_scheme highlight-accent
- **Blocks:** 6-8 job blocks with varied locations (city names) and departments like Service, Management, Warehouse
- **Good for:** Businesses with multiple physical locations that want visitors to scan by department and see where roles are
- **Industries:** Restaurant chains, fitness studios, retail franchises, cleaning services

### 6. Contract & Freelance Opportunities Board

- **Settings:** eyebrow "Freelance With Us", title "Current Projects", description "We partner with independent contractors for specific engagements.", heading_alignment center, show_filters false, color_scheme standard-accent
- **Blocks:** 3-5 job blocks, type set to contract, locations set to "Remote"
- **Good for:** Agencies or consultancies that cycle through project-based contractors and want a public roster
- **Industries:** Creative agencies, consulting firms, event production companies

### 7. Compact Footer-Adjacent Hiring Strip

- **Settings:** eyebrow blank, title "Join Us", description blank, heading_alignment left, show_filters false, color_scheme highlight, top_spacing none, bottom_spacing none
- **Blocks:** 1-2 job blocks
- **Good for:** A tight, attention-grabbing strip placed just above the footer to catch visitors before they leave
- **Industries:** Any small business with one or two urgent openings

---

## Differentiation Tips

- **Use the department field strategically.** Even if you only have one department, giving it a clear name (e.g., "Front of House" instead of "General") makes the listing feel more organized and intentional.
- **Link apply buttons to real destinations.** Point `apply_link` to a Google Form, Typeform, BambooHR page, or a mailto link. A dead "#" link undermines credibility instantly.
- **Pair with a hero or rich-text widget above.** A job listing on its own can feel transactional. Adding a short culture statement, team photo, or benefits summary above it gives candidates a reason to scroll down.
- **Turn off filters when you have fewer than four positions.** Filter buttons with only one or two departments add clutter without utility. Let the cards speak for themselves.
- **Use the highlight color schemes to make the section pop on long pages.** On a homepage where the careers block sits between other standard-background sections, switching to `highlight` or `highlight-accent` creates a clear visual break that draws eyes to your openings.
- **Keep location values consistent.** If one card says "NYC" and another says "New York, NY", the listing looks sloppy. Pick a format and stick to it across all blocks.
- **Leverage the eyebrow for urgency.** Swap the default "Join Our Team" for something time-sensitive like "Hiring This Month" or "3 Roles Open" to create a sense of immediacy.
