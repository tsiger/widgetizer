# Product Card Widget Insights

A single Shopify product presented as an Arch card: image, title, live price, and an add-to-cart button. It wraps Shopify Storefront Web Components (`shopify-context`, `shopify-media`, `shopify-data`, `shopify-money`, `shopify-variant-selector`) but the entire card layout, typography, spacing, and button are the theme's own CSS. Prices and inventory are fetched live in the browser.

**Requires a store connection.** The widget only renders a product when a Shopify domain is set in Theme Settings, under Shopify. Until then (or until a product handle is entered) it shows an inline setup notice instead.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---|---|---|
| `eyebrow` | Any text | Small label above the section heading (e.g. "New Arrival"). Leave blank to hide. |
| `eyebrow_uppercase` | `true` / `false` (default) | Uppercases the eyebrow. |
| `title` | Any text | Optional section heading above the card. Renders as `<h1>` when the widget is first on the page, `<h2>` otherwise. Leave blank for a bare card. |
| `description` | Any text | Supporting paragraph below the heading. Leave blank to hide. |
| `heading_alignment` | `start`, `center` (default) | Aligns the section header block. |
| `product_handle` | Shopify handle | The product to show, taken from its Shopify URL (e.g. `classic-tee`). Required. |
| `button_text` | Any text (default "Add to cart") | Label on the add-to-cart button. |
| `show_options` | `true` / `false` (default) | Adds a variant selector (size/color). Off by default: the button adds the first available variant. |
| `content_width` | `narrow` (default), `medium`, `wide` | Max width of the card, centered in the section. Narrow suits a featured single product. |
| `aspect_ratio` | `auto` (default), `1/1`, `4/3`, `3/2`, `3/4`, `16/9` | `auto` shows the product image at its natural shape. Any fixed value crops the image (object-fit cover) for a uniform frame. |
| `color_scheme` | `standard-primary` (default), `standard-secondary`, `highlight-primary`, `highlight-secondary` | Standard uses the page background. Highlight variants add section padding and contrast. |
| `top_spacing` / `bottom_spacing` | `auto` (default), `small`, `none` | Trim or remove section spacing for tighter stacking. |

---

## Layout Recipes

### 1. Featured Product (narrow, natural image)

| Setting | Value |
|---|---|
| `title` | e.g. "Product of the Month" |
| `content_width` | narrow |
| `aspect_ratio` | auto |
| `color_scheme` | standard-secondary |
| `heading_alignment` | center |

**Good for:** A homepage or landing-page spotlight on one hero product. Leave `show_options` off for a clean one-tap add-to-cart.

### 2. Configurable Product (medium, square, with options)

| Setting | Value |
|---|---|
| `content_width` | medium |
| `aspect_ratio` | 1/1 |
| `show_options` | true |
| `color_scheme` | standard-primary |

**Good for:** Apparel or products with variants, where the shopper needs to pick a size or color before adding.

---

## Differentiation Tips

- **`auto` vs a fixed ratio is the biggest image lever.** Natural aspect keeps product photography honest; a fixed ratio (e.g. 1/1) crops for a tidy, catalog-like frame. Pick fixed when the source photos are inconsistent.
- **Skip the section title for a bare card.** With `title` blank the widget is just the card, which drops neatly beside other content or into a narrow column.
- **Leave `show_options` off unless the product truly needs it.** A single add-to-cart button is faster and cleaner; the variant selector is Shopify-rendered and only partially themeable.

---

## How It Connects (for maintainers)

- The store connection (domain, market, optional Storefront token) lives in Theme Settings, under Shopify, and is read in `layout.liquid`, which wraps the page in `<shopify-store>`, loads the web-components script, and mounts one global `<shopify-cart id="widgetizer-cart">`.
- The add-to-cart button opts in with `data-shopify-add-to-cart`; `assets/shopify-cart.js` delegates the click to the global cart.
- **Client-side render caveat:** product data loads via JavaScript, so the product title/price are not in the static HTML (weaker SEO, needs JS on). This is inherent to Storefront Web Components.
- **Cart styling is not themed yet.** The `<shopify-cart>` modal still uses Shopify's default UI; theming it is the job of the dedicated cart widget (a later slice).
