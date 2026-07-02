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
| `quick_view` | `true` / `false` (default) | When on, each card's image and title open a popup with the full product details — larger image, variant selector, description, and add to cart. |
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
- **Leave `show_options` off for grids.** Per-card variant selectors clutter a grid fast; the button adds the first available variant. Turn on `quick_view` instead — the popup is where variant choice belongs.
- **Blank `collection_handle` is the fastest way to a shop page** when you have not set up collections yet.

---

## How It Connects (for maintainers)

- The card markup is shared with the Product Card widget via `snippets/product-card.liquid`; its styling lives in `assets/commerce.css`.
- The grid is a `<shopify-list-context>` carrying the `.widget-grid` class, so cloned cards flow into the theme's responsive grid. Collections wrap it in a `<shopify-context type="collection">`; blank handle queries `products` (all).
- Pagination: `assets/shopify-list.js` wires the Previous/Next buttons to `nextPage()` / `previousPage()` and syncs their disabled state from the live list element's `pageInfo` property (re-read after the update event, Shopify renders, and DOM changes). Don't rely on the `shopify-list-context-update` event alone: nested lists are re-cloned per page and can fire it outside the widget's subtree. Loaded only when `show_pagination` is on.
- Add-to-cart reuses the global cart wiring from `assets/shopify-cart.js` (mounted in `layout.liquid`).
- Quick view reuses one global, theme-owned modal: `layout.liquid` renders `snippets/product-modal.liquid` (a native `<dialog>` holding a `wait-for-update` product context that renders `snippets/product-detail.liquid` — the same detail view the Product widget places in-page). Each card's trigger calls the context's `update(event)`, wired in `assets/shopify-quick-view.js`; gallery controls live in `assets/shopify-gallery.js` (both enqueued only when Quick view is on), and Buy now / add-to-cart are global wiring in `assets/shopify-cart.js`. The modal is fixed-height (only the details column scrolls on desktop).
- Cart and variant selectors are themed through Shopify's CSS parts (`shopify-cart::part(...)`, `.product-card-options::part(...)` in `assets/commerce.css`) — theme colors, radius tokens, and fonts apply across the shadow boundary.
- **Client-side render caveat:** products load via JavaScript, so they are not in the static HTML (weaker SEO, needs JS on). This is inherent to Storefront Web Components.
