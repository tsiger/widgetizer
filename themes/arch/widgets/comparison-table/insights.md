# Comparison Table Widget -- Insights

Side-by-side feature comparison rendered as a full-width responsive table with optional column highlighting, badges, and per-column CTAs.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---|---|---|
| `eyebrow` | Any text | Small label above the headline; adds a category/context cue (e.g. "Pricing", "Plans") |
| `title` | Any text (default "Compare Our Plans") | Main headline; renders as `<h1>` when the widget is first on the page, `<h2>` otherwise |
| `description` | Any text | Supporting paragraph below the headline |
| `heading_alignment` | `left`, `center` (default) | Controls whether the eyebrow/title/description block is centered or left-aligned |
| `feature_column_label` | Any text (default "Features") | Header text for the first (feature-name) column |
| `color_scheme` | `standard`, `standard-accent`, `highlight`, `highlight-accent` | Background and accent treatment for the entire section; non-standard schemes add padded container styling and override `--widget-bg-color` |
| `top_spacing` | `auto`, `none` | Removes the default top margin when set to `none`; useful for stacking sections flush |
| `bottom_spacing` | `auto`, `none` | Removes the default bottom margin when set to `none` |

---

## Available Blocks

| Block Type | Key Settings | Notes |
|---|---|---|
| **column** | `name` -- column header label; `badge` -- small accent-colored pill below the name (e.g. "Popular", "Best Value"); `link` -- CTA button with text, href, and target; `featured` -- boolean that adds accent-colored borders and promotes the CTA to primary style | Columns define the plans/products/options being compared. Order matters -- feature values map to columns positionally. At least two columns are needed for the table to make sense. |
| **feature** | `name` -- row label shown in the first column; `values` -- newline-separated list, one entry per column | Each value is parsed: `yes`/`true`/check-mark renders a colored check icon, `no`/`false`/`x` renders a muted cross icon, any other non-blank string renders as plain text (great for limits like "5 GB" or "Unlimited"). Blank values default to the cross icon. The number of lines in `values` must match the number of column blocks. |

---

## Layout Recipes

### 1. SaaS Pricing Comparison

- **Columns:** 3 (Free / Pro / Enterprise)
- **Settings:** `eyebrow` = "Pricing", `title` = "Find Your Plan", `heading_alignment` = center, `color_scheme` = standard-accent, featured on Pro column with badge "Most Popular"
- **Features:** 8-10 rows mixing boolean checks (SSO, API Access) with text values (storage limits, seat counts)
- **Good for:** Software companies, digital tools, subscription services
- **Industries:** SaaS, developer tools, productivity apps

### 2. Service Tier Breakdown

- **Columns:** 2 (Standard / Premium)
- **Settings:** `eyebrow` = "Our Services", `title` = "What's Included", `heading_alignment` = left, `color_scheme` = standard, featured on Premium column with badge "Full Service"
- **Features:** 6-8 rows, mostly boolean (Initial Consultation, Monthly Reports, Dedicated Account Manager) with a couple of text entries ("Response within 48h" vs "Same-day response")
- **Good for:** Agencies, consultants, law firms, accounting practices
- **Industries:** Professional services, marketing agencies, legal

### 3. Product Spec Sheet

- **Columns:** 3-4 (product models or package sizes)
- **Settings:** No eyebrow, `title` = "Technical Specifications", `feature_column_label` = "Specs", `heading_alignment` = left, `color_scheme` = highlight, no featured column, no CTAs
- **Features:** 10-12 rows, almost entirely text values (dimensions, weight, wattage, material, warranty period)
- **Good for:** Manufacturers, hardware retailers, equipment suppliers
- **Industries:** Electronics, industrial equipment, home appliances

### 4. Membership Levels

- **Columns:** 3 (Individual / Family / Corporate)
- **Settings:** `eyebrow` = "Membership", `title` = "Choose Your Level", `heading_alignment` = center, `color_scheme` = highlight-accent, featured on Family column with badge "Best Value"
- **Features:** 6-8 rows mixing booleans (Guest Passes, Pool Access) with text ("2 classes/week" vs "Unlimited")
- **Good for:** Gyms, clubs, coworking spaces, community organizations
- **Industries:** Fitness, wellness, coworking, nonprofits

### 5. Venue or Rental Packages

- **Columns:** 3 (Basic / Deluxe / All-Inclusive)
- **Settings:** `title` = "Event Packages", `heading_alignment` = center, `color_scheme` = standard-accent, featured on Deluxe with badge "Popular"
- **Features:** 6-8 rows with text values for capacity, hours included, catering options, and booleans for add-ons (DJ, Photography, Setup/Cleanup)
- **Good for:** Event venues, wedding barns, conference centers, vacation rentals
- **Industries:** Hospitality, events, tourism

### 6. Competitor Comparison

- **Columns:** 2-3 (Our Product / Competitor A / Competitor B)
- **Settings:** `title` = "Why Choose Us", `feature_column_label` = "What Matters", `heading_alignment` = left, `color_scheme` = standard, featured on the first "Our Product" column with badge "Us"
- **Features:** 5-7 rows focused on differentiators, mixing booleans and short text; lean heavily on checks for your column and crosses for competitors
- **Good for:** Landing pages, sales enablement, competitive positioning
- **Industries:** Any B2B or B2C business in a competitive market

### 7. Course or Training Matrix

- **Columns:** 3 (Beginner / Intermediate / Advanced)
- **Settings:** `eyebrow` = "Programs", `title` = "Course Comparison", `heading_alignment` = center, `color_scheme` = highlight, no featured column, link text set to "Enroll Now" on each
- **Features:** 7-9 rows with text values for duration, class size, and certification level alongside booleans for features like 1-on-1 mentorship or job placement assistance
- **Good for:** Online course platforms, trade schools, tutoring centers, bootcamps
- **Industries:** Education, professional training, e-learning

---

## Differentiation Tips

- **Feature the decision, not just the column.** Reserve the `featured` flag for the tier you actually want people to pick. One featured column per table keeps the eye focused; marking multiple columns dilutes the signal.
- **Mix value types for scannability.** Tables that are all check/cross icons become a wall of green and gray. Break it up with concrete text values ("10 GB", "24/7", "Up to 50 users") on the rows that matter most so visitors can compare without reading fine print.
- **Keep row count under 12.** Long tables lose casual scanners. Group "nice to have" features into a single row ("All Basic Features") and save the granular breakdown for a dedicated features page.
- **Use the badge sparingly.** A single badge like "Popular" or "Best Value" on one column acts as social proof. Badges on every column compete for attention and none of them win.
- **Pair with a pricing widget above.** The comparison table works best when visitors already know the price points. Place a pricing-cards widget first for the headline numbers, then follow with this widget for the detailed breakdown.
- **Write the feature label as a benefit.** "Priority Support" beats "Support Level". Visitors scan the first column quickly -- benefit-oriented labels do the selling before they even look right.
- **Leverage the first-column label.** Changing `feature_column_label` from the default "Features" to something domain-specific ("What You Get", "Specs", "Included Services") frames the entire table and signals what kind of comparison this is.
- **Use `heading_alignment: left` for technical audiences.** Centered headings feel natural for pricing pages aimed at general consumers. Left-aligned headings read more like a data sheet, which engineers and procurement teams prefer.
