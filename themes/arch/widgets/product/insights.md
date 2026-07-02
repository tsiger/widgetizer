# Product Widget Insights

A full Shopify product detail section for any page: image gallery with thumbnails, title, live price (with compare-at strike-through when discounted), variant selector, add-to-cart, optional Buy now, and the product's rich description. It is the same theme-owned detail view the quick-view modal uses, laid out as a two-column section — made for promoting a single product on a landing or home page.

**Requires a store connection.** The widget only renders a product when a Shopify domain is set in Theme Settings, under Shopify. Until then (or until a product handle is entered) it shows an inline setup notice instead.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---|---|---|
| `eyebrow` | Any text | Small label above the section heading. Leave blank to hide. |
| `eyebrow_uppercase` | `true` / `false` (default) | Uppercases the eyebrow. |
| `title` | Any text | Optional section heading above the product. Leave blank to let the product speak for itself. |
| `description` | Any text | Supporting paragraph below the heading. Leave blank to hide. |
| `heading_alignment` | `start`, `center` (default) | Aligns the section header block. |
| `product_handle` | Shopify handle | The product to show, taken from its Shopify URL (e.g. `classic-tee`). Required. |
| `button_text` | Any text (default "Add to cart") | Label on the add-to-cart button. |
| `show_buy_now` | `true` (default) / `false` | Second, outline-style button that goes straight to checkout. |
| `show_description` | `true` (default) / `false` | The product's full description from Shopify, rendered on the theme's rich-text styles. |
| `content_width` | `medium`, `wide` (default), `fullwidth` | Max width of the product section, centered. Medium suits pages with narrow copy; fullwidth fills the container. |
| `color_scheme` | `standard-primary` (default), `standard-secondary`, `highlight-primary`, `highlight-secondary` | Standard uses the page background. Highlight variants add section padding and contrast. |
| `top_spacing` / `bottom_spacing` | `auto` (default), `small`, `none` | Trim or remove section spacing. |

---

## Layout Recipes

### 1. Landing-Page Hero Product

| Setting | Value |
|---|---|
| `eyebrow` | e.g. "New" |
| `title` | e.g. "Meet the Classic Tee" |
| `content_width` | wide |
| `show_buy_now` | true |
| `color_scheme` | standard-primary |

**Good for:** A product-launch page where the product IS the page. Put it first so the section title renders as the page `<h1>`.

### 2. Compact Promo Between Content

| Setting | Value |
|---|---|
| `title` | blank |
| `content_width` | medium |
| `show_description` | false |
| `color_scheme` | standard-secondary |

**Good for:** Dropping a buyable product mid-page (e.g. between editorial sections) without the full description weighing it down.

---

## Differentiation Tips

- **This widget vs Product Card:** the card is a compact teaser (one image, optional quick-view popup); this is the full destination view — gallery, options, description, checkout. Use cards in grids to browse, this widget to sell one thing.
- **Turn `show_description` off for mid-page promos.** Shopify descriptions can be long; without it the section reads as a rich buy module rather than a product page.
- **Leave the section `title` blank on dedicated product pages** so the product title itself carries the heading hierarchy (`<h2>`, or the page's own title stays `<h1>`).

---

## How It Connects (for maintainers)

- The detail view is `snippets/product-detail.liquid` — shared verbatim with the quick-view modal (`snippets/product-modal.liquid`); its styling lives in `assets/commerce.css`. Modal-only constraints are scoped under `.product-modal`, so in-page rendering flows naturally at any height.
- Gallery thumbnails and the variant-image sync are wired by `assets/shopify-gallery.js` (enqueued by this widget when a store + handle are set). Add-to-cart, Buy now, and the header cart button are global wiring in `assets/shopify-cart.js`, loaded from `layout.liquid` whenever a store is connected.
- The variant selector and prices are Shopify web components (`shopify-variant-selector`, `shopify-money`) themed via CSS parts; slide 0 of the gallery binds `product.selectedOrFirstAvailableVariant.image`, so choosing a variant updates the visible photo.
- **Client-side render caveat:** product data loads via JavaScript, so it is not in the static HTML (weaker SEO, needs JS on). This is inherent to Storefront Web Components.
