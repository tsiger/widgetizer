# scrolling-text

## Purpose

A slim, endlessly scrolling strip that repeats one short phrase across the full width, optionally tilted. It is a decorative divider or a one-line announcement between sections, not a place for information people must read.

The phrase repeats many times with a separator glyph between copies, so the strip is always full however wide the screen. It paints its own band colour and text colour rather than using a colour scheme, and it has no heading and no blocks.

## When to use

- A bridge element: between a hero and the first content section, between two long sections, or just before the footer. It is a `small` spacing candidate by nature.
- Good for brand mottos, availability notices ("Now booking spring projects"), a product line-up, city names, or a repeated word that sets a mood.
- Bad for anything factual: dates, prices, phone numbers, legal text. Moving text is hard to read and skipped by many visitors.
- It cannot open a page: there is no heading, so the page would have no title. Under a transparent header it is not a hero either.
- Natural neighbours: `banner`, `split-hero`, `gallery`, `card-grid`, `logo-cloud`, `trust-bar`. Do not stack it next to `trust-bar` or `logo-cloud`; two strips in a row read as clutter.
- One per page. Two is already a pattern; three is noise.
- Fits creative studios, agencies, cafés, breweries, fashion and lifestyle brands, event venues, gyms. Rare on law, finance and medical sites.

## Pitfalls

- Keep `text` to three to six words. The phrase repeats twenty times, so a sentence becomes a wall of moving text that nobody can follow.
- `speed` is a feeling, not a reading speed: low values crawl (a full loop takes well over a minute), high values race. Mid values suit mottos; push high only for playful, urgent strips.
- `rotate` is the signature move, but the strip needs room above and below to tilt into. That room is what `auto` spacing provides. With `top_spacing` or `bottom_spacing` set to `none` the tilted strip's corners are cut off, so use `none` only with `rotate` at 0.
- Even at `rotate` 0, `none` on both sides glues the band to its neighbours; that is the right look only between two filled sections of a related colour.
- Contrast is entirely yours: `bg_color` and `text_color` are free colours with no scheme behind them. Check the pair on the actual page, especially a semi-transparent `bg_color` over a dark neighbouring band.
- A transparent or near-transparent `bg_color` turns the strip into floating text; it then needs a `text_color` that reads on the page background, and rotation looks odd without a visible band.
- `font_size` `xl` dominates the screen on phones; reserve it for very short phrases (one or two words).
- Emoji separators render differently on every device; a simple glyph (star, bullet, slash, dash) is safer.
- The strip is animated. Visitors who have asked their system to reduce motion may see it still; keep the content non-essential so nothing is lost.

## Recipes

### Angled brand motto

A tilted accent strip under the hero of a studio or agency home page. Set the brand accent as the band colour; no images needed.

```json
{
  "type": "scrolling-text",
  "settings": {
    "text": "We build modern brands",
    "separator": "★",
    "speed": 7,
    "rotate": -4,
    "font_size": "md",
    "bg_color": "#1e3a8a",
    "text_color": "#ffffff",
    "top_spacing": "small",
    "bottom_spacing": "small"
  }
}
```

### Flat announcement band

A level strip for an availability or seasonal note between two content sections. Zero rotation lets it sit flush against a filled band below.

```json
{
  "type": "scrolling-text",
  "settings": {
    "text": "Now booking spring projects",
    "separator": "•",
    "speed": 9,
    "rotate": 0,
    "font_size": "lg",
    "bg_color": "#0f766e",
    "text_color": "#ffffff",
    "top_spacing": "auto",
    "bottom_spacing": "none"
  }
}
```

### Quiet divider

A slow, small, low-contrast strip that works as a textured rule between portfolio or long-form sections. The band is a faint tint of the page.

```json
{
  "type": "scrolling-text",
  "settings": {
    "text": "Design · Build · Care",
    "separator": "—",
    "speed": 3,
    "rotate": 0,
    "font_size": "sm",
    "bg_color": "#1e3a8a14",
    "text_color": "#1e3a8a",
    "top_spacing": "small",
    "bottom_spacing": "small"
  }
}
```

### Big playful word

A single oversized word tilted the other way, for brands with personality: a brewery, a skate shop, a music venue. Supply nothing but the word.

```json
{
  "type": "scrolling-text",
  "settings": {
    "text": "Fresh",
    "separator": "/",
    "speed": 12,
    "rotate": 3,
    "font_size": "xl",
    "bg_color": "#f59e0b",
    "text_color": "#111827",
    "top_spacing": "auto",
    "bottom_spacing": "auto"
  }
}
```
