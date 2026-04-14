# Content Switcher Widget

Tabbed or toggle-based card grid that lets visitors flip between 2-3 groups of items without leaving the section -- built for pricing tiers, service comparisons, or any "pick a lens" pattern.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---------|--------|---------------|
| `eyebrow` | Any text | Small label above the headline (e.g., "Pricing", "Our Plans"). Omit to hide. |
| `eyebrow_uppercase` | `true` / `false` (default) | Uppercases the eyebrow text for a more formal label treatment |
| `title` | Any text | Section headline. Renders as `<h1>` when the widget is the first on the page, `<h2>` otherwise. |
| `description` | Any text | Paragraph below the headline providing context. Omit to hide. |
| `heading_alignment` | `start`, `center` (default) | Centers or left-aligns the header block **and** the switcher buttons. Left alignment gives a more editorial feel. |
| `switcher_type` | `toggle` (default), `tabs` | **Toggle** shows exactly 2 options. **Tabs** unlocks a third option button, allowing 3 content groups. |
| `option_1_label` | Text | Label for the first switcher button (e.g., "Monthly"). Leave blank to hide the entire first tab and its panel. |
| `option_2_label` | Text | Label for the second button (e.g., "Yearly"). |
| `option_3_label` | Text | Label for the third button. Only visible when `switcher_type` is `tabs`. |
| `columns` | 2 -- 5 (default 3) | Number of card columns on desktop. Cards stack on mobile regardless. |
| `aspect_ratio` | `auto`, `1/1`, `4/3` (default), `3/2`, `3/4`, `16/9` | Constrains card image proportions. Use `auto` when cards have no images or images vary. |
| `color_scheme` | `standard-primary`, `standard-secondary`, `highlight-primary`, `highlight-secondary` | **standard** = transparent background, no card border. **standard-secondary** = transparent background + card gets a secondary bg and border. **highlight** = full-width background + card border. **highlight-secondary** = full-width bg + card secondary bg and border. |
| `top_spacing` | `auto` (default), `small`, `none` | `small` reduces spacing for tighter rhythm; `none` removes it entirely for flush stacking |
| `bottom_spacing` | `auto` (default), `small`, `none` | Same as above for the bottom edge |

---

## Available Blocks

| Block Type | Key Settings | Notes |
|------------|-------------|-------|
| `item` | `title` (text), `text` (richtext), `image`, `price` (text), `link` (url + label), `target_option` (1, 2, or 3) | Each item card. **`target_option`** assigns the card to a specific switcher panel. You need a full set of cards per option group -- cards are not shared across tabs. Price renders in a large bold heading style. Link renders as a secondary button at the card bottom. All fields are optional; omit image and price for a text-only card. |

---

## Layout Recipes

### 1. Membership / Class Pass Pricing Toggle

| Setting | Value |
|---------|-------|
| `switcher_type` | `toggle` |
| `option_1_label` | Monthly |
| `option_2_label` | Class Pack |
| `columns` | 3 |
| `heading_alignment` | `center` |
| `color_scheme` | `standard-secondary` |
| `aspect_ratio` | `auto` |

Create 3 item blocks per option (6 total). Use `price` for dollar amounts and `text` for what's included. Add "Sign Up" links.

**Good for:** Businesses with recurring memberships and drop-in alternatives.

---

### 2. Three-Tier Service Packages with Tabs

| Setting | Value |
|---------|-------|
| `switcher_type` | `tabs` |
| `option_1_label` | Residential |
| `option_2_label` | Commercial |
| `option_3_label` | Industrial |
| `columns` | 3 |
| `heading_alignment` | `center` |
| `color_scheme` | `highlight-secondary` |
| `aspect_ratio` | `auto` |

Each tab shows a different audience's service lineup. Use `text` richtext for bullet-pointed scope descriptions and `link` for "Request a Quote."

**Good for:** Service businesses that serve multiple market segments from one page.

---

### 3. Before / After Portfolio Showcase

| Setting | Value |
|---------|-------|
| `switcher_type` | `toggle` |
| `option_1_label` | Before |
| `option_2_label` | After |
| `columns` | 2 |
| `heading_alignment` | `start` |
| `color_scheme` | `standard-primary` |
| `aspect_ratio` | `3/2` |

Pair images across both options so the same project appears in the same grid position. Use `title` for the project name and leave `price` blank.

**Good for:** Transformation-driven businesses that need to show results visually.

---

### 4. Dine-In / Takeout / Catering Menus

| Setting | Value |
|---------|-------|
| `switcher_type` | `tabs` |
| `option_1_label` | Dine-In |
| `option_2_label` | Takeout |
| `option_3_label` | Catering |
| `columns` | 4 |
| `heading_alignment` | `center` |
| `color_scheme` | `highlight-primary` |
| `aspect_ratio` | `1/1` |

Use `image` for dish photos, `title` for the dish name, `price` for the price, and `text` for a short description. Link to an online ordering page.

**Good for:** Restaurants and food businesses with distinct service formats.

---

### 5. Adults / Kids Service Split

| Setting | Value |
|---------|-------|
| `switcher_type` | `toggle` |
| `option_1_label` | Adults |
| `option_2_label` | Kids |
| `columns` | 3 |
| `heading_alignment` | `center` |
| `color_scheme` | `standard-secondary` |
| `aspect_ratio` | `auto` |

Each tab shows services tailored to the audience. Use `price` for per-session or package pricing and `text` for what's included.

**Good for:** Businesses that serve both adults and children with different offerings or pricing.

---

### 6. Location-Based Service Catalog

| Setting | Value |
|---------|-------|
| `switcher_type` | `tabs` |
| `option_1_label` | Downtown |
| `option_2_label` | Westside |
| `option_3_label` | Northshore |
| `columns` | 3 |
| `heading_alignment` | `start` |
| `color_scheme` | `highlight-secondary` |
| `aspect_ratio` | `4/3` |

Each tab shows the services or classes available at a specific location. Use `image` for location/facility photos and `link` for booking.

**Good for:** Multi-location businesses where offerings differ by branch.

---

### 7. Product Lines by Category

| Setting | Value |
|---------|-------|
| `switcher_type` | `toggle` |
| `option_1_label` | Shop Dogs |
| `option_2_label` | Shop Cats |
| `columns` | 4 |
| `heading_alignment` | `center` |
| `color_scheme` | `standard-primary` |
| `aspect_ratio` | `1/1` |

Product images with titles and prices. Link each card to a product detail page or external shop. No richtext needed -- keep cards visual and scannable.

**Good for:** Small retailers or makers who have a natural two-way product split.

---

## Differentiation Tips

- **Toggle vs. Tabs is a content decision.** Use toggle (2 options) when the choice is binary -- monthly/yearly, before/after, basic/pro. Use tabs (3 options) when you have three genuinely distinct groups. Do not force a third tab just because it exists.
- **Cards are duplicated, not shared.** Each tab panel maintains its own set of item blocks. If you want the same card in two tabs, you must create two separate item blocks with different `target_option` values. This is intentional -- it lets you customize titles, prices, and descriptions per option.
- **Price is optional but prominent.** When `price` is present it dominates the card visually. If you are not showing prices (e.g., a portfolio or catalog), leave the field blank and the layout adjusts cleanly.
- **Pair this widget with a FAQ below it.** Pricing and service comparison sections naturally generate questions. A FAQ widget directly underneath (with `top_spacing: none` on the FAQ) creates a seamless flow.
- **Left-align for editorial pages, center for landing pages.** Left-aligned headers with a toggle feel like part of a content page. Centered headers with accent cards feel like a standalone pricing section.
- **Use `highlight-secondary` to make the section feel like a self-contained module.** The background color plus card borders create strong visual separation from surrounding content -- useful when the switcher lives mid-page between other widgets.
- **Keep column count proportional to content.** 2 columns for comparison pairs, 3 for classic pricing tiers, 4-5 for lightweight catalog grids with images. Avoid 5 columns if cards contain long text -- it gets cramped.
