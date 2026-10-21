# audio-player

## Purpose

A styled music or podcast player with an optional playlist: cover art, the current track's title and artist, a seek bar with times, previous and next, play, speed, volume and a download link. For bands, podcasts, recorded talks, meditations and audio guides that live on the site rather than on a streaming service.

Each `track` block is one audio file from the media library with a title, an artist line and an optional square cover. On desktop the cover sits on the left; the controls and the playlist stack on the right. With a single track the playlist is hidden and the section becomes a compact featured player. Tracks play in order and move on to the next automatically.

## When to use

- The main content of a release, episode or recordings page, or a featured block on a homepage ("listen to the latest episode").
- Good for a handful to a few dozen tracks the visitor plays here. Bad for embedding a streaming service (use `embed`) and for video (`video-embed`, `video-popup`).
- Not a page opener. Introduce it with a `banner` or `split-content` title section that names the album, show or series.
- Sits well next to `event-list` (upcoming shows), `profile-grid` or `team-highlight` (the hosts), `news-grid` (show notes) and an `action-bar` that links to subscribe or book.
- Needs one MP3 per track plus a short title; the artist line can hold the artist, the speaker, a guest or an episode date. Covers are optional but a single cover for the whole set keeps the layout calm.
- Fits musicians, podcasts, churches and congregations, language and music schools, wellness studios, museums and tours, radio and voice talent.

## Pitfalls

- A track without an audio file renders but plays nothing; make sure every block has its file before publishing.
- Long titles wrap in the playlist rows and crowd the small cover thumbnails; keep track titles to a few words and put detail in `artist`.
- `show_covers` controls both the big cover and the playlist thumbnails. Turn it off for spoken-word content with no art, which also gives the controls the full width. With covers on and no images, a placeholder note icon shows instead.
- `show_download` offers the raw file to anyone. Keep it on for podcasts, sermons and course material; turn it off for licensed or unreleased music.
- `show_speed` cycles through one, one and a quarter, one and a half and two times. Useful for talks and lessons, odd for music.
- The playlist scrolls inside its own box after roughly ten rows; very long archives are better split into several sections by season or year.
- Playback never repeats or shuffles; the order of the blocks is the order of play, so put the lead track first because it seeds the "now playing" panel on load.
- Any scheme other than `standard-primary` makes a filled band that pads inside itself; a highlight surface is justified only when the player is the page's main event. Utility placements belong on standard surfaces.

## Recipes

### Featured single

One track with its artwork: a new release or the latest episode on the homepage. The user supplies the MP3 and one square cover.

```json
{
  "type": "audio-player",
  "settings": { "eyebrow": "New release", "eyebrow_uppercase": true, "title": "Listen to the new single", "description": "", "heading_alignment": "start", "show_covers": true, "show_speed": false, "show_download": false },
  "blocks": [
    { "type": "track", "settings": { "title": "Opening Theme", "artist": "The Example Band" } }
  ]
}
```

### Album playlist

A full record with one cover per track (or the same cover repeated). Needs one MP3 per track.

```json
{
  "type": "audio-player",
  "settings": { "eyebrow": "Discography", "title": "Midnight Sessions", "description": "Eight tracks recorded live in one take.", "heading_alignment": "center", "show_covers": true, "show_speed": false, "show_download": false, "color_scheme": "standard-secondary" },
  "blocks": [
    { "type": "track", "settings": { "title": "Opening Theme", "artist": "The Example Band" } },
    { "type": "track", "settings": { "title": "Midnight Drive", "artist": "The Example Band" } },
    { "type": "track", "settings": { "title": "Closing Credits", "artist": "The Example Band" } }
  ]
}
```

### Podcast episodes

Spoken-word list with no covers, speed control and downloads. Put the episode date or guest in `artist`.

```json
{
  "type": "audio-player",
  "settings": { "eyebrow": "Podcast", "title": "Latest episodes", "description": "New episodes every other week.", "heading_alignment": "start", "show_covers": false, "show_volume": true, "show_speed": true, "show_download": true },
  "blocks": [
    { "type": "track", "settings": { "title": "Episode 12: Starting small", "artist": "With a guest from the local bakery" } },
    { "type": "track", "settings": { "title": "Episode 11: Pricing your work", "artist": "Hosts only" } },
    { "type": "track", "settings": { "title": "Episode 10: Finding your first clients", "artist": "With a guest designer" } }
  ]
}
```

### Talks and recordings archive

Sermons, lectures or guided sessions grouped by series, with downloads for offline listening. Use one section per series and a short `description` naming the dates covered.

```json
{
  "type": "audio-player",
  "settings": { "eyebrow": "Recordings", "title": "Spring series", "description": "Weekly talks, March to May.", "heading_alignment": "center", "show_covers": false, "show_speed": true, "show_download": true, "top_spacing": "small" },
  "blocks": [
    { "type": "track", "settings": { "title": "Week 1: Beginnings", "artist": "Guest speaker" } },
    { "type": "track", "settings": { "title": "Week 2: Patience", "artist": "Resident speaker" } },
    { "type": "track", "settings": { "title": "Week 3: Community", "artist": "Panel discussion" } }
  ]
}
```
