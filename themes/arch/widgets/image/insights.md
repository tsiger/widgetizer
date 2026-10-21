# image

## Purpose

A single photograph or graphic standing on its own, either contained at page width with rounded corners or bleeding edge to edge. It carries no heading, text or colour scheme: it is a visual beat between sections, not a section with a message.

The whole picture can be a link, in which case it only dims slightly on hover. A caption saved with the image in the media library appears under it automatically; there is no caption setting of its own.

## When to use

- Role: a visual breather between two text-heavy sections, a single standout photo inside a case study, or a cinematic full-width strip that resets the page's rhythm.
- Good for: portfolio and architecture pages, hospitality and food sites, long editorial pages that need a pause, a seasonal promo graphic that links to an offer.
- Bad for: a hero with words on it (`banner`), several photos (`gallery`, `masonry-gallery`), or a picture that needs copy beside it (`image-text`, `image-callout`).
- Opening a page: avoid it. The section has no heading, so the page would start without a title, and it does not support the header's transparent mode; only `banner`, `slideshow` and `video-popup` do.
- Natural neighbours: `rich-text` above or below, `split-content`, or two `image-text` sections it separates.
- Content needed: one strong image. It does all the work, so a weak or badly cropped photo has nowhere to hide.

## Pitfalls

- This section is always unfilled, so its spacing is outside margin that a neighbour can rely on. Under a filled band (an image hero, a highlight section) use `top_spacing` `small` for a docked look; `none` presses the photo against the band's edge because the band's own padding sits inside its colour.
- `fullwidth` removes the rounded corners and stretches the image to the viewport. It needs a wide, high-resolution file (at least 2000 px across) and a landscape shape; a portrait or square image becomes a towering block. Aim for roughly 2:1 or wider for a strip.
- Contained mode shows the image at its natural proportions with rounded corners. It looks editorial between paragraphs; it looks lost if the image is small or low-contrast against the page.
- The link gives no visual cue beyond a faint hover dim. If the picture must be clickable, bake the call to action into the graphic itself or place a `rich-text` section with a button next to it.
- The caption comes from the media library entry, so clear or edit it there; it cannot be switched off from the section.
- An empty image shows a placeholder, which is fine in the editor and wrong on a published site.
- Do not stack several `image` sections to fake a gallery; each one adds its own spacing and the result is a column of gaps.

## Recipes

### Full-bleed photo strip

A wide landscape photo across the whole viewport to break a long page. Supply one image at least 2000 px wide with a roughly 2:1 or wider shape and no important detail near the top or bottom edge.

```json
{
  "type": "image",
  "settings": { "fullwidth": true, "top_spacing": "auto", "bottom_spacing": "auto" }
}
```

### Contained editorial photo

A rounded, page-width photo between two text sections, the way a magazine drops a picture into a feature. Supply one landscape or square image; portraits work only when the sections around it are long.

```json
{
  "type": "image",
  "settings": { "fullwidth": false, "top_spacing": "auto", "bottom_spacing": "auto" }
}
```

### Clickable promo graphic

A designed graphic (offer, event, announcement) that links to the page where the visitor can act. Supply an image that already shows the call to action in its artwork, since the link itself is invisible.

```json
{
  "type": "image",
  "settings": { "fullwidth": false, "link": { "text": "See the offer", "href": "services.html" } }
}
```

### Photo glued under a title section

A photo directly beneath an unfilled `rich-text` opener so the title and picture read as one block. Supply a landscape image; the opener's own bottom margin provides the gap, so the top spacing goes to `none`.

```json
{
  "type": "image",
  "settings": { "fullwidth": false, "top_spacing": "none", "bottom_spacing": "auto" }
}
```
