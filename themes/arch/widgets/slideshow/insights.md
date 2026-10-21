# slideshow

## Purpose

A full-width hero carousel of up to five slides, each with its own photo, tinted overlay, headline, short text and up to two buttons. It opens a home page that has several messages or several strong photographs to rotate through, and it supports the transparent header.

Slides advance automatically or by arrows and dots; a pause button appears when autoplay is on. A slide with an image is painted with the overlay colour so the text reads over the photo; a slide without an image is a flat band in its own colour scheme. The headline of the first slide becomes the page title when the slideshow is the first section.

## When to use

- A page opener, almost always on `index`. It is one of the three sections that support the header's `transparent_on_hero` mode (with `banner` and `video-popup`).
- Good for businesses with several equally important offers or spaces: hotels and venues, restaurants with a menu and an events side, schools, retailers, multi-service studios, festivals.
- Bad for a single message (use `banner`), for a split photo-and-text opener (`split-hero`), and for anything that must be read in full, since slides move on.
- Natural neighbours below: `trust-bar` or `logo-cloud` with `top_spacing` `small`, then `services-grid`, `card-grid` or `image-text`.
- Needs one to three slides with real photos and one short sentence each. Five slides is the limit and rarely worth it: most visitors see only the first one or two.
- Fits hospitality, tourism, retail, education, events, fitness, real estate. Rare on professional-services sites, where one still hero does the job.

## Pitfalls

- Visitors read slide one; treat it as the real hero and put the primary call to action there. Later slides are bonuses, not places for essential information.
- Under a transparent header the first section must give the header something to sit on. A slideshow whose first slide has a photo and a dark `overlay_color` is fine; a first slide with no image and a light `color_scheme` (`standard-primary`, `standard-secondary`) puts the header's light over-image styling on a light background and it washes out. Give the first slide a photo or a highlight scheme.
- The section takes its background from the first slide's `color_scheme`, so the editor preview around the carousel follows slide one.
- `height` `auto` sizes each slide to its content, so slides with different amounts of text change height as they rotate and the page jumps. Pick `small`, `medium` or `large` for a fixed height (about half, three quarters and the full screen), and keep the text short enough to fit inside `small` on a phone.
- `overlay_color` applies only when the slide has an image. The default is a deep, fairly opaque tint that keeps text readable but hides much of the photo; lower its opacity for a photo-forward look and compensate with a shorter headline, or raise it for busy photos.
- `heading_size` `7xl` and above fits two or three words. Long headlines at that size wrap into four lines on phones and push the buttons below the fold.
- `autoplay_speed` must cover reading time: a headline plus two lines of text plus two buttons needs the upper range; image-only slides can rotate faster.
- `fullwidth` off keeps the carousel inside the content width with page margins; it then no longer works as a bleed hero and should not open a page under a transparent header.
- `vertical_alignment` `end` puts the text near the bottom edge, where a bottom-heavy photo (people, products) collides with it. Choose photos with quiet areas where the text will land.
- Two buttons per slide is the maximum; `button_size` is shared by both buttons on that slide.

## Recipes

### Single bold hero

One slide, full screen, centred, one primary button: a `banner` alternative that keeps the slideshow's full-bleed treatment. Supply one wide, high-contrast photo.

```json
{
  "type": "slideshow",
  "settings": {
    "height": "large",
    "fullwidth": true,
    "autoplay": false
  },
  "blocks": [
    {
      "type": "slide",
      "settings": {
        "heading_text": "Spaces made for staying",
        "text_content": "Rooms, dining and gardens in the heart of the old town.",
        "button_link": { "text": "Check availability", "href": "contact.html" },
        "alignment": "center",
        "vertical_alignment": "center",
        "heading_size": "7xl",
        "text_size": "lg",
        "button_style": "primary",
        "button_size": "large",
        "color_scheme": "highlight-primary"
      }
    }
  ]
}
```

### Two offers rotating

A hospitality home page with one slide per experience, the first with a primary and a secondary button. Supply one landscape photo per slide with a calm area behind the text.

```json
{
  "type": "slideshow",
  "settings": {
    "height": "medium",
    "fullwidth": true,
    "autoplay": true,
    "autoplay_speed": 7000
  },
  "blocks": [
    {
      "type": "slide",
      "settings": {
        "heading_text": "Dinner worth the drive",
        "text_content": "Seasonal menus from our kitchen garden.",
        "button_link": { "text": "See the menu", "href": "menu.html" },
        "button_link_2": { "text": "Book a table", "href": "contact.html" },
        "alignment": "start",
        "heading_size": "5xl",
        "button_style": "primary",
        "button_style_2": "secondary",
        "color_scheme": "highlight-primary"
      }
    },
    {
      "type": "slide",
      "settings": {
        "heading_text": "Celebrate with us",
        "text_content": "Private rooms for twelve to one hundred and twenty guests.",
        "button_link": { "text": "Plan an event", "href": "contact.html" },
        "alignment": "start",
        "heading_size": "5xl",
        "button_style": "primary",
        "color_scheme": "highlight-secondary"
      }
    }
  ]
}
```

### Photo story without buttons

Three image slides with a single word each and no text or buttons, for photographers, venues and designers. Lower the overlay so the photos carry the section; supply three strong landscape images.

```json
{
  "type": "slideshow",
  "settings": {
    "height": "large",
    "fullwidth": true,
    "autoplay": true,
    "autoplay_speed": 4000
  },
  "blocks": [
    { "type": "slide", "settings": { "overlay_color": "#0a1e3866", "heading_text": "Light", "text_content": "", "button_link": { "text": "", "href": "" }, "heading_size": "8xl", "vertical_alignment": "end", "alignment": "start", "color_scheme": "highlight-primary" } },
    { "type": "slide", "settings": { "overlay_color": "#0a1e3866", "heading_text": "Space", "text_content": "", "button_link": { "text": "", "href": "" }, "heading_size": "8xl", "vertical_alignment": "end", "alignment": "start", "color_scheme": "highlight-primary" } },
    { "type": "slide", "settings": { "overlay_color": "#0a1e3866", "heading_text": "Material", "text_content": "", "button_link": { "text": "", "href": "" }, "heading_size": "8xl", "vertical_alignment": "end", "alignment": "start", "color_scheme": "highlight-primary" } }
  ]
}
```

### Imageless announcement rotator

Two short slides without photos on highlight bands, constrained to the content width, for a notice strip further down a page or an opener on a site with a solid header. Not for a transparent header.

```json
{
  "type": "slideshow",
  "settings": {
    "height": "small",
    "fullwidth": false,
    "autoplay": true,
    "autoplay_speed": 5000
  },
  "blocks": [
    {
      "type": "slide",
      "settings": {
        "heading_text": "Spring timetable now live",
        "text_content": "New evening classes on Tuesdays and Thursdays.",
        "button_link": { "text": "See classes", "href": "classes.html" },
        "heading_size": "3xl",
        "text_size": "base",
        "text_uppercase": false,
        "button_style": "primary",
        "button_size": "small",
        "color_scheme": "highlight-primary"
      }
    },
    {
      "type": "slide",
      "settings": {
        "heading_text": "Open day, first Saturday of the month",
        "text_content": "Try any class free. No booking needed.",
        "button_link": { "text": "Find out more", "href": "contact.html" },
        "heading_size": "3xl",
        "text_size": "base",
        "button_style": "primary",
        "button_size": "small",
        "color_scheme": "highlight-secondary"
      }
    }
  ]
}
```
