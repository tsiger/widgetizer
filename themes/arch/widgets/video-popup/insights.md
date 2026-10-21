# video-popup

## Purpose

A full-width photograph under a colour overlay with one large play button in the middle; pressing anywhere on it opens a YouTube or Vimeo video in a lightbox over the page. It is the cinematic way to offer a video: the still image sets the mood and the visitor chooses to watch.

The section has no text of its own, no heading and no caption. Its height is set in three steps from half the screen to a full screen, and it can bleed edge to edge or sit as a rounded card inside the content width.

## When to use

- A homepage or landing-page opener where a brand film or showreel is the main message, or a mid-page break on an about, portfolio or event page.
- Good for one strong still and one video worth a full-screen viewing. Bad for tutorials, demos and anything that should play in place; that is `video-embed`.
- Can open a page, and it supports the transparent header: when it is the first section and the header has `transparent_on_hero` on, the header floats over the image in its light styling. The image reaches the top edge on its own; `top_spacing` `none` only tightens the space inside it.
- Because it carries no words, put a `rich-text` title or a `split-content` section before or after it to say what the video is; on an inner page under a transparent header, open with that text section and let the video follow.
- Needs one high-resolution still (the image is most of the impact) and a YouTube or Vimeo link.
- Fits venues, hospitality, weddings and events, architecture and design studios, agencies, fitness and wellness brands.

## Pitfalls

- The whole section is the button. Nothing else can be placed on it, and visitors cannot select text or follow links inside it.
- `overlay_color` tints the whole image and must have transparency; a solid colour hides the photo completely. Darker overlays make the light play button read; a pale or white overlay needs `play_button_style` `dark`.
- Without an `image` the section is a flat band in the overlay colour and the header's transparent state still engages, so an imageless popup as a page opener gives a washed-out header and an empty-looking band.
- `height` `large` fills the visitor's screen. Use it only as the first section; mid-page it hides everything around it. `medium` suits a mid-page break, `small` a compact strip.
- `fullwidth` off turns the section into a rounded card at the content width. That reads well mid-page and badly as an opener under a transparent header, where the header then floats over the page background beside the card.
- Only YouTube and Vimeo links work. An unrecognised link leaves the play button doing nothing on the published site, so test a new link in the preview.
- `video_title` is announced to screen-reader users and used as the lightbox title; name the video rather than leaving "Video".
- The image fills the whole section, so its spacing lives inside the picture like a filled band's padding and contributes no gap outside it. The section below must bring its own breathing room with `top_spacing` `small`; `none` there butts it against the image edge.

## Recipes

### Cinematic opener

A full-screen edge-to-edge hero as the first section of the homepage, sliding under a transparent header. The user supplies a wide, high-resolution still and the video link (placeholder below).

```json
{
  "type": "video-popup",
  "settings": {
    "video_url": "https://www.youtube.com/watch?v=XXXXXXXXXXX",
    "video_title": "Brand film",
    "height": "large",
    "fullwidth": true,
    "play_button_style": "light",
    "top_spacing": "none"
  }
}
```

### Mid-page showreel card

A contained, rounded card at three-quarter height between two text sections on a portfolio or about page. The user supplies a behind-the-scenes still and the video link (placeholder below).

```json
{
  "type": "video-popup",
  "settings": {
    "video_url": "https://www.youtube.com/watch?v=XXXXXXXXXXX",
    "video_title": "Studio showreel",
    "height": "medium",
    "fullwidth": false,
    "play_button_style": "light"
  }
}
```

### Light, airy teaser

A half-height strip with a pale overlay and a dark play button, for wellness, interiors or lifestyle brands with bright photography. The user supplies a bright still and the video link (placeholder below).

```json
{
  "type": "video-popup",
  "settings": {
    "overlay_color": "#ffffff55",
    "video_url": "https://www.youtube.com/watch?v=XXXXXXXXXXX",
    "video_title": "A day at the studio",
    "height": "small",
    "fullwidth": false,
    "play_button_style": "dark"
  }
}
```

### Event teaser strip

A compact full-width strip glued to the section below it, for an event or launch page: last year's highlights invite this year's sign-up. The user supplies a crowd or stage still and the video link (placeholder below).

```json
{
  "type": "video-popup",
  "settings": {
    "video_url": "https://www.youtube.com/watch?v=XXXXXXXXXXX",
    "video_title": "Last year's highlights",
    "height": "small",
    "fullwidth": true,
    "play_button_style": "light",
    "bottom_spacing": "none"
  }
}
```
