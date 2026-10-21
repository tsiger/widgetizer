# image-hotspots

## Purpose

One large photo with pulsing markers placed on it; each marker opens a small card with a title, a short description and an optional button. It explains the parts of a single picture: the features of a product, the areas of a room or floor plan, the dishes on a table.

Markers are positioned as percentages across and down the image. On desktop a card opens beside its marker; on phones the cards open beneath the image. Only one is open at a time, and the cards keep the theme's standard light surface whatever the section's `color_scheme`.

## When to use

- Role: an interactive explainer in the middle of a page, after the visitor knows what the business is and before the call to action.
- Good for: product and craft businesses (materials, finishes), venues and real estate (rooms, amenities), restaurants (a plated spread), renovation portfolios (what changed in the after photo), service overviews on an infographic-style image.
- Bad for: several unrelated photos, long descriptions, or anything a visitor must read without clicking; the content is hidden until a marker is tapped.
- Opening a page: avoid it. The page would start with an image that says nothing until touched, and the section does not support the header's transparent mode, which only `banner`, `slideshow` and `video-popup` support.
- Natural neighbours: a `rich-text` or `split-content` introduction above, a `key-figures` strip or `accordion` below, an `action-bar` to close.
- Content needed: one sharp, high-resolution landscape photo and three to six markers, each with a title of two to four words and one or two sentences.

## Pitfalls

- Marker positions are percentages of the image box, so swapping the photo for a different crop moves every marker onto the wrong spot. Re-place them after any image change.
- Keep `position_x` and `position_y` between roughly 10 and 90, and markers at least 15 to 20 percent apart on both axes; edge markers get clipped cards and clustered markers overlap each other's cards.
- Three to six markers is the range. Fewer looks underused; more turns the phone view into a long stack of cards under the photo.
- The marker button appears only when `button_link` has both text and a target. Reserve it for the one or two markers that drive an action.
- Descriptions are tooltips, not paragraphs: one or two sentences in `<p>`, no lists longer than three items.
- Markers are drawn in the theme's accent colour; a photo dominated by that colour, or a very busy image, hides them. Let the `title` and `description` invite the interaction, for example "Tap a marker to see the details".
- The image displays at full container width, so a portrait photo becomes very tall and pushes the lower markers off screen on laptops; use landscape.
- A `color_scheme` other than `standard-primary` makes the section a filled band whose spacing is padding inside its colour. Functional explainers rarely justify a highlight surface; `standard-secondary` is enough. Under a filled hero use `small` top spacing, never `none`.

## Recipes

### Product feature callouts

Marks the materials and details of one product or piece of work. Supply a clean landscape studio photo with the product filling most of the frame.

```json
{
  "type": "image-hotspots",
  "settings": { "eyebrow": "Product details", "title": "Every part, explained", "description": "Tap a marker to see what goes into it.", "heading_alignment": "start", "image_alt": "Close-up of the product with its main features marked", "color_scheme": "standard-primary" },
  "blocks": [
    { "type": "hotspot", "settings": { "title": "Solid frame", "description": "<p>One sentence on the material and why it matters.</p>", "position_x": 28, "position_y": 42 } },
    { "type": "hotspot", "settings": { "title": "Hand finish", "description": "<p>One sentence on the finishing process.</p>", "position_x": 62, "position_y": 30 } },
    { "type": "hotspot", "settings": { "title": "Adjustable fit", "description": "<p>One sentence on the adjustment and its range.</p>", "position_x": 74, "position_y": 72, "button_link": { "text": "See options", "href": "services.html" } } }
  ]
}
```

### Space or floor-plan tour

Lets visitors explore a venue, studio or property from one wide interior photo or an illustrated plan. Supply a landscape image where each area is clearly visible.

```json
{
  "type": "image-hotspots",
  "settings": { "title": "Explore the space", "description": "Select an area to see what it offers.", "heading_alignment": "center", "image_alt": "Overview of the venue with its main areas marked", "color_scheme": "standard-secondary" },
  "blocks": [
    { "type": "hotspot", "settings": { "title": "Reception", "description": "<p>Where guests arrive and check in.</p>", "position_x": 18, "position_y": 60 } },
    { "type": "hotspot", "settings": { "title": "Main hall", "description": "<p>Seats a stated number of guests in several layouts.</p>", "position_x": 50, "position_y": 45 } },
    { "type": "hotspot", "settings": { "title": "Terrace", "description": "<p>Outdoor area used in warm months.</p>", "position_x": 80, "position_y": 35, "button_link": { "text": "Ask about availability", "href": "contact.html" } } }
  ]
}
```

### Dishes on the table

Tags each dish in a plated spread for a restaurant, caterer or bakery. Supply a landscape overhead photo with the dishes spaced apart. The `small` top spacing docks it under a filled hero above.

```json
{
  "type": "image-hotspots",
  "settings": { "eyebrow": "From the kitchen", "title": "What is on the table", "description": "Tap a dish to learn more.", "heading_alignment": "center", "image_alt": "Overhead view of several dishes on a table", "color_scheme": "standard-primary", "top_spacing": "small" },
  "blocks": [
    { "type": "hotspot", "settings": { "title": "Starter", "description": "<p>Main ingredients and a dietary note.</p>", "position_x": 22, "position_y": 38 } },
    { "type": "hotspot", "settings": { "title": "Main course", "description": "<p>Main ingredients and a dietary note.</p>", "position_x": 55, "position_y": 55 } },
    { "type": "hotspot", "settings": { "title": "Dessert", "description": "<p>Main ingredients and a dietary note.</p>", "position_x": 82, "position_y": 30, "button_link": { "text": "See the full menu", "href": "services.html" } } }
  ]
}
```
