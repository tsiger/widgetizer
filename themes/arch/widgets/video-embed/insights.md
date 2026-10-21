# video-embed

## Purpose

An inline video player with an optional heading above it: either a YouTube or Vimeo link shown in the provider's player, or an uploaded video file played directly with its own poster frame. The video sits in the content column at a chosen aspect ratio and plays in place when the visitor presses play.

Nothing autoplays and nothing pops up; this is the section for a video the visitor is meant to watch where it is, such as a product demo, a tour or a founder's message.

## When to use

- A demo or explainer on a product or service page, a team or story video on the about page, a recap on an event page, a tutorial on a support page.
- Good for one video that deserves attention and a caption. Bad for a cinematic image-with-play-button moment, which is `video-popup`, and for a gallery of clips, which needs one section per video.
- Can open a page, since its `title` becomes the page heading, but it is a poor first impression on a slow connection; a `rich-text` or `split-content` opener followed by this section works better. It does not support the transparent header.
- Pairs with `rich-text` or `image-text` that explains what the video shows, and with `key-figures` or `testimonials` that back up its claims.
- Needs a video link or an uploaded file, a `video_title` for people who cannot see the frame, and a short heading or none at all.
- Fits software and products, agencies, schools and courses, hospitality and venues, nonprofits and events.

## Pitfalls

- An uploaded `video_file` always wins over `video_url`. To switch to YouTube or Vimeo, clear the uploaded file.
- `poster` only applies to an uploaded file. Streaming players show their own thumbnail, so set the poster in the provider's own settings instead.
- Links are accepted in the usual forms (watch links, short links, embed links, Vimeo page or player links). Anything else gives an empty frame on the published site and a hint only in the editor; check a new link in the preview.
- `aspect_ratio` reserves the frame before the video loads. Match it to the footage: `16 / 9` for most video, `4 / 3` for screen recordings, `21:9` for cinematic footage, `1 / 1` for social clips. A mismatch shows black bars inside the frame.
- `video_title` is never shown on the page; it is the name screen readers announce. "Video" says nothing; name the content.
- The player takes the full content width, so with the default ratio it is a tall section. Leaving `title`, `eyebrow` and `description` blank gives a bare, cinematic frame; filling them adds the usual section header above it.
- Filled schemes pad inside their own band, so `top_spacing` or `bottom_spacing` set to `none` on a highlight section removes that inner padding; use `none` to fuse with a same-scheme neighbour, not to tuck under an image hero.
- Uploaded files are served from the site itself. Keep them short and compressed; a long high-bitrate file makes the page slow for everyone, not only for those who press play.

## Recipes

### Product demo

A headed demo on the strongest surface, placed right after the opener, with the video doing the explaining. The user supplies a YouTube or Vimeo link (the address below is a placeholder) and a one-sentence description.

```json
{
  "type": "video-embed",
  "settings": {
    "eyebrow": "See it in action",
    "title": "How it works",
    "description": "One sentence on what the video shows.",
    "heading_alignment": "center",
    "video_url": "https://www.youtube.com/watch?v=XXXXXXXXXXX",
    "video_title": "Two-minute product demo",
    "aspect_ratio": "16 / 9",
    "color_scheme": "highlight-primary"
  }
}
```

### Cinematic break

A bare ultra-wide frame with no heading, used as a visual pause between text-heavy sections. The user supplies the video link (placeholder below) and a descriptive title for screen readers.

```json
{
  "type": "video-embed",
  "settings": {
    "title": "",
    "video_url": "https://www.youtube.com/watch?v=XXXXXXXXXXX",
    "video_title": "Brand film",
    "aspect_ratio": "21:9",
    "color_scheme": "standard-primary"
  }
}
```

### Meet the team

A left-aligned, conversational about-page video on the soft surface. The user supplies the link (placeholder below) and a short introduction.

```json
{
  "type": "video-embed",
  "settings": {
    "eyebrow": "Our story",
    "title": "Meet the people behind the work",
    "description": "A short, friendly introduction to the video.",
    "heading_alignment": "start",
    "video_url": "https://www.youtube.com/watch?v=XXXXXXXXXXX",
    "video_title": "Team introduction",
    "aspect_ratio": "16 / 9",
    "color_scheme": "standard-secondary"
  }
}
```

### Uploaded walkthrough

A self-hosted screen recording in 4:3 for a support or onboarding page. The user uploads a short compressed video file and a poster image; no link is needed, so `video_url` is left out.

```json
{
  "type": "video-embed",
  "settings": {
    "eyebrow": "Guide",
    "title": "Getting started",
    "description": "Watch the three-minute walkthrough.",
    "heading_alignment": "center",
    "video_title": "Getting started walkthrough",
    "aspect_ratio": "4 / 3",
    "color_scheme": "standard-primary"
  }
}
```
