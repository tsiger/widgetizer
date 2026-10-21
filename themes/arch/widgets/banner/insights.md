# banner

## Purpose

The hero and page-title section: a full-width band, with or without a background photo, holding a stack of blocks (eyebrow text, heading, paragraph, buttons, feature list, icon, numbered items, star rating, countdown). It is how most Arch pages open, and the only section besides `slideshow` and `video-popup` that a transparent header can sit over.

Two roles. As a homepage hero it carries a photo, a dark overlay and a tall fixed `height`. As an inner-page title it has no image, `height: auto` and a quiet scheme. Deeper in a page it also works as a tall call-to-action band.

## When to use

- Opens a page. Choose it for the first section whenever the page needs a photo, a title plus intro, or a hero with buttons.
- Good for one message with one or two actions. Bad for several equal items (use `card-grid`, `bento-grid`) or for long copy (`rich-text`).
- Natural followers: `trust-bar` or `logo-cloud` docked under the hero with `top_spacing: small`, then `split-content`, `services-grid` or `card-grid`. As a closer, it follows `testimonials` or `accordion`.
- Needs a short heading (two to eight words), one or two sentences, and for the hero role one strong landscape photo with calm areas where the text will sit.
- Fits every industry; the block mix sets the tone: `rating` for trust, `features` for value points, `countdown` for a launch, `numbered-item` for a three-step promise.

## Pitfalls

- Transparent header: the header overlays the first section whenever it is a banner, with or without an image, so an imageless light banner opener puts light header text on a light background. On sites whose header uses `transparent_on_hero`, open inner pages with `rich-text` or `split-content` and reserve the banner for photo or highlight heroes, with `top_spacing: none` so the image slides under the header.
- A filled banner (image or any scheme other than `standard-primary`) pads inside its own band; the section below needs its own `top_spacing` (`small` for the docked look). `none` on the banner's bottom only when the next section should touch it.
- `vertical_alignment` does nothing at `height: auto`; it needs `small`, `medium` or `large`.
- `fullwidth` off makes a rounded, contained card. As the first section that is only safe on `standard-primary` with no image; a floating coloured card under a solid header looks broken. Deeper in the page it is a good callout.
- Keep the overlay dark enough for white text; a light photo with a faint overlay is unreadable. Tint the overlay toward a brand colour rather than only changing its opacity.
- A mid-page banner on a highlight scheme is one of the page's one or two highlight sections; never place it next to another one (an `action-bar` closer).
- `countdown` needs a real date and an `expired_message` that still makes sense; `rating` without reviews elsewhere on the site is an empty claim. Heading sizes of `7xl` and above fit two or three words.

## Recipes

### Photo hero

Homepage opener with a wide photo, dark overlay and two buttons. The user supplies one landscape image of at least 1600 px width.

```json
{
  "type": "banner",
  "settings": { "height": "large", "fullwidth": true, "content_width": "medium", "alignment": "center", "vertical_alignment": "center", "color_scheme": "highlight-primary", "top_spacing": "none" },
  "blocks": [
    { "type": "text", "settings": { "text": "<p>Family-run since forever</p>", "size": "sm", "uppercase": true } },
    { "type": "heading", "settings": { "text": "Good work, done properly", "size": "6xl" } },
    { "type": "text", "settings": { "text": "<p>One sentence that says who you help and how.</p>", "size": "lg" } },
    { "type": "button", "settings": { "link": { "text": "Get a quote", "href": "contact.html" }, "style": "primary", "link_2": { "text": "See our work", "href": "services.html" }, "style_2": "secondary", "size": "medium" } }
  ]
}
```

### Editorial hero with value points

Left-aligned, medium height, with a checklist of three differentiators. Needs a photo with empty space on the left.

```json
{
  "type": "banner",
  "settings": { "height": "medium", "content_width": "medium", "alignment": "start", "color_scheme": "highlight-secondary", "top_spacing": "none" },
  "blocks": [
    { "type": "heading", "settings": { "text": "Advice you can act on", "size": "5xl" } },
    { "type": "text", "settings": { "text": "<p>Plain-language guidance for small teams.</p>", "size": "base" } },
    { "type": "features", "settings": { "features": "+ Free first consultation\n+ Fixed monthly fee\n+ Replies within one working day" } },
    { "type": "button", "settings": { "link": { "text": "Book a call", "href": "contact.html" }, "style": "primary", "size": "medium" } }
  ]
}
```

### Page title

Imageless opener for an inner page, only on sites whose header is not transparent. Eyebrow names the section, heading states the promise, one line of context.

```json
{
  "type": "banner",
  "settings": { "height": "auto", "content_width": "medium", "alignment": "center", "color_scheme": "standard-primary" },
  "blocks": [
    { "type": "text", "settings": { "text": "<p>About us</p>", "size": "sm", "uppercase": true, "muted": true } },
    { "type": "heading", "settings": { "text": "A small team with a long memory", "size": "4xl" } },
    { "type": "text", "settings": { "text": "<p>Who we are, how we work and why clients stay.</p>", "size": "base" } }
  ]
}
```

### Contained callout

A rounded highlight card deep in the page: icon, heading, one sentence, one button. Counts as a highlight section.

```json
{
  "type": "banner",
  "settings": { "height": "auto", "fullwidth": false, "content_width": "narrow", "alignment": "center", "color_scheme": "highlight-primary" },
  "blocks": [
    { "type": "icon", "settings": { "icon": "star", "style": "filled", "size": "lg", "shape": "circle" } },
    { "type": "heading", "settings": { "text": "Not sure where to start?", "size": "3xl" } },
    { "type": "text", "settings": { "text": "<p>A free twenty-minute call is the quickest way to find out.</p>", "size": "base" } },
    { "type": "button", "settings": { "link": { "text": "Book a call", "href": "contact.html" }, "style": "secondary", "size": "medium" } }
  ]
}
```
