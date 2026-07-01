# Product Grid Widget Insights

A responsive grid of Shopify products from a collection (or your whole catalog), with optional pagination. Each cell is the same theme-owned product card used by the Product Card widget (`snippets/product-card.liquid`): image, title, live price, and add-to-cart. Product data loads live in the browser.

**Requires a store connection.** The grid only renders when a Shopify domain is set in Theme Settings, under Shopify. Until then it shows an inline setup notice.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---|---|---|
| `eyebrow` | Any text | Small label above the heading. Leave blank to hide. |
| `eyebrow_uppercase` | `true` / `false` (default) | Uppercases the eyebrow. |
| `title` | Any text (default "Shop") | Section heading. `<h1>` when first on the page, `<h2>` otherwise. |
| `description` | Any text | Supporting paragraph. Leave blank to hide. |
| `heading_alignment` | `start`, `center` (default) | Aligns the header block. |
| `collection_handle` | Shopify handle | Which collection to show, from its Shopify URL. **Leave blank to show all products.** |
| `products_count` | 2 - 24 (default 8) | How many products per page (the `first` count). |
| `button_text` | Any text (default "Add to cart") | Label on each card's button. |
| `show_options` | `true` / `false` (default) | Adds a variant selector to every card. Off by default: buttons add the first available variant. |
| `show_pagination` | `true` (default) / `false` | Adds Previous / Next buttons to page through the collection. |
| `columns_desktop` | 2 - 5 (default 4) | Desktop column count. Collapses to 2 on tablet, 1 on mobile automatically. |
| `aspect_ratio` | `auto`, `1/1` (default), `4/3`, `3/2`, `3/4`, `16/9` | Image crop. A fixed ratio keeps the grid tidy when product photos are inconsistent; `auto` shows natural shapes. |
| `color_scheme` | `standard-primary` (default), `standard-secondary`, `highlight-primary`, `highlight-secondary` | Standard uses the page background. Highlight variants add section padding and contrast. |
| `top_spacing` / `bottom_spacing` | `auto` (default), `small`, `none` | Trim or remove section spacing. |

---

## Layout Recipes

### 1. Featured Collection (4-up, square)

| Setting | Value |
|---|---|
| `title` | e.g. "New Arrivals" |
| `collection_handle` | your collection handle |
| `columns_desktop` | 4 |
| `aspect_ratio` | 1/1 |
| `products_count` | 8 |
| `show_pagination` | true |

**Good for:** A homepage or landing section that surfaces a curated collection with room to page through more.

### 2. Full Catalog Wall (5-up, tight)

| Setting | Value |
|---|---|
| `collection_handle` | blank (all products) |
| `columns_desktop` | 5 |
| `aspect_ratio` | 1/1 |
| `products_count` | 15 |
| `color_scheme` | standard-secondary |

**Good for:** A dedicated shop page showing everything, dense and scannable.

---

## Differentiation Tips

- **A fixed `aspect_ratio` is what makes a grid look intentional.** Mixed natural shapes read as messy across many cells; pick one ratio (usually 1/1) so every card frames identically.
- **Match `products_count` to `columns_desktop`.** A page size that fills whole rows (e.g. 8 across 4 columns, 15 across 5) avoids a ragged last row.
- **Leave `show_options` off for grids.** Per-card variant selectors clutter a grid fast; variant choice belongs on a product detail page. The button adds the first available variant.
- **Blank `collection_handle` is the fastest way to a shop page** when you have not set up collections yet.

---

## How It Connects (for maintainers)

- The card markup is shared with the Product Card widget via `snippets/product-card.liquid`; its styling lives in the COMMERCE section of `base.css`.
- The grid is a `<shopify-list-context>` carrying the `.widget-grid` class, so cloned cards flow into the theme's responsive grid. Collections wrap it in a `<shopify-context type="collection">`; blank handle queries `products` (all).
- Pagination: `assets/shopify-list.js` wires the Previous/Next buttons to `nextPage()` / `previousPage()` and toggles their disabled state from the `shopify-list-context-update` event. Loaded only when `show_pagination` is on.
- Add-to-cart reuses the global cart wiring from `assets/shopify-cart.js` (mounted in `layout.liquid`).
- **Client-side render caveat:** products load via JavaScript, so they are not in the static HTML (weaker SEO, needs JS on). This is inherent to Storefront Web Components.
