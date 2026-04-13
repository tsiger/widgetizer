# Pricing Widget Insights

Responsive pricing-plan cards with feature lists, per-plan CTAs, and an optional featured highlight. Supports grid and carousel layouts.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---------|--------|---------------|
| `eyebrow` | Any text (blank by default) | Small label above the headline, useful for anchoring context like "Simple Pricing" or "No Hidden Fees" |
| `title` | Any text | Section headline rendered as h1 (first widget on page) or h2 |
| `description` | Any text | Subtitle paragraph below the headline |
| `heading_alignment` | `start` | Centers or left-aligns the eyebrow/title/description block |
| `layout` | `grid` (default), `carousel` | Grid shows all plans at once; carousel adds prev/next arrows and horizontal scrolling |
| `columns_desktop` | 2 -- 5 (default 3) | Number of columns on desktop; controls card width proportionally |
| `color_scheme` | `standard-primary`, `standard-secondary`, `highlight-primary`, `highlight-secondary` | `standard-primary` = no background. `accent` variants give cards a secondary background. `highlight-primary` variants add visible card borders. |
| `top_spacing` | `auto`, `none` | Removes top section padding when set to `none` |
| `bottom_spacing` | `auto`, `none` | Removes bottom section padding when set to `none` |

---

## Available Blocks

| Block Type | Key Settings | Notes |
|------------|-------------|-------|
| `plan` | `title` -- plan name (e.g. "Starter") | Rendered as h3 (or h2 when widget title is blank) |
| | `price` -- free-text price string (e.g. "$49", "Free", "Custom") | Displayed in bold oversized type; accepts any string so you can write "$19/mo" or "Contact Us" |
| | `period` -- billing interval (e.g. "per month", "per year", "one-time") | Shown as muted meta text beneath the price |
| | `features` -- newline-separated list | Prefix a line with `+` for a green check icon, `-` for an X icon, or no prefix for plain text |
| | `button_link` -- CTA with text, href, target | Full-width button at bottom of card. Change text per plan ("Get Started", "Contact Sales", "Try Free") |
| | `featured` -- checkbox | Adds accent-colored border to the card, making it visually dominant |

---

## Layout Recipes

### 1. Classic Three-Tier SaaS

- **Plans:** 3 blocks -- Free / Pro / Enterprise
- **Settings:** `layout: grid`, `columns_desktop: 3`, `heading_alignment: center`, `color_scheme: standard-secondary`
- **Featured:** Middle plan (Pro)
- **Good for:** The universal pricing page pattern visitors already understand. The featured middle plan exploits the decoy effect.
- **Industries:** SaaS tools, email marketing platforms, project management apps, web hosting

### 2. Simple Two-Option Choice

- **Plans:** 2 blocks -- Monthly / Annual (or Basic / Premium)
- **Settings:** `layout: grid`, `columns_desktop: 2`, `heading_alignment: center`, `color_scheme: highlight`
- **Featured:** The one you want people to pick (Annual or Premium)
- **Good for:** Reducing decision fatigue. Works when your offering is straightforward and more tiers would feel forced.
- **Industries:** Local gyms, single-product startups, tutoring services, subscription boxes

### 3. Service-Level Menu

- **Plans:** 4 blocks -- Bronze / Silver / Gold / Platinum
- **Settings:** `layout: grid`, `columns_desktop: 4`, `heading_alignment: start`, `color_scheme: standard`, `eyebrow: "Our Packages"`
- **Featured:** Gold (the tier most clients should land on)
- **Good for:** Service businesses that bundle different scopes of work. Feature lists become checklists of deliverables.
- **Industries:** Digital agencies, cleaning companies, landscaping, photography packages, wedding planners

### 4. Scrollable Plan Carousel

- **Plans:** 5 blocks -- various named plans
- **Settings:** `layout: carousel`, `columns_desktop: 3`, `heading_alignment: center`, `color_scheme: standard-secondary`
- **Featured:** One plan to anchor attention as users scroll
- **Good for:** Businesses with many plan variants that would crowd a grid. Carousel keeps the section compact and invites exploration.
- **Industries:** Managed hosting, co-working spaces, insurance brokers, car wash memberships

### 5. Freemium Funnel

- **Plans:** 3 blocks -- Free / Growth / Scale
- **Settings:** `layout: grid`, `columns_desktop: 3`, `heading_alignment: center`, `color_scheme: highlight-secondary`
- **Featured:** Growth (mid-tier)
- **Feature trick:** Use `-` prefix on the Free plan to show X icons for unavailable features (e.g. "- Priority Support"), and `+` on paid plans for checks. This creates a strong visual contrast that sells the upgrade.
- **Good for:** Products that need a generous free tier to build a user base while nudging toward paid.
- **Industries:** Developer tools, form builders, analytics dashboards, cloud storage

### 6. One-Time Purchase Packages

- **Plans:** 3 blocks -- "Basic Site" / "Business Site" / "E-Commerce Site"
- **Settings:** `layout: grid`, `columns_desktop: 3`, `heading_alignment: start`, `color_scheme: standard`
- **Period field:** Use "one-time" or "starting at" instead of "per month"
- **Featured:** The middle option
- **Good for:** Freelancers and agencies selling fixed-price deliverables rather than subscriptions.
- **Industries:** Web design freelancers, branding agencies, print shops, home renovation contractors

### 7. Compact Two-Column Carousel

- **Plans:** 4 blocks
- **Settings:** `layout: carousel`, `columns_desktop: 2`, `heading_alignment: center`, `color_scheme: highlight`
- **Featured:** One plan highlighted
- **Good for:** Mobile-conscious layouts where you want large readable cards. Two visible at a time keeps text legible and buttons thumb-friendly.
- **Industries:** Mobile-first audiences -- restaurants, personal trainers, beauty salons

---

## Differentiation Tips

- **Lead with the featured plan.** Put your most popular or profitable plan in the middle position and toggle `featured: true`. The accent border draws the eye immediately. Visitors who scan left-to-right will compare everything against this anchor.

- **Use the +/- feature prefix intentionally.** The check and X icons are not decorative. On lower-tier plans, explicitly list missing features with `-` so the absence is visible. This turns the feature list into a comparison tool without needing a separate comparison table.

- **Price strings are free text -- exploit that.** Write "$0 forever", "From $299", or "Let's Talk" instead of bare numbers. A well-chosen price string can reframe the entire card (e.g. "$8/day" feels smaller than "$249/month").

- **Match column count to plan count.** Three plans in three columns is clean. Four plans in three columns leaves a lonely orphan on row two. If you have four plans, use `columns_desktop: 4` or switch to carousel.

- **Pair color schemes with page context.** Use `standard-primary` when the pricing section sits between other colored sections and needs breathing room. Use `highlight-secondary` when pricing is the hero section and needs to own the page.

- **Drop the section title when pricing is the whole page.** If you have a dedicated /pricing route, consider leaving `title` blank. The plan cards become h2 elements automatically, improving both hierarchy and visual weight.

- **Keep feature lists parallel.** Every plan should list the same categories in the same order, even if the value differs ("2 GB Storage" vs "100 GB Storage"). Parallel structure lets visitors scan vertically across cards instead of reading each one in full.
