# split-content

## Purpose

A two-column canvas where every block chooses its column: headings, text, images, icons, feature lists, numbered items, ratings and buttons in any mix, on either side. It is the theme's editorial layout tool, and the standard way to open an inner page with a title when the header is transparent.

The columns can be equal or weighted seven to three either way, one column can stay pinned while the other scrolls, and either column may be left empty on purpose. On phones the left column stacks above the right.

## When to use

- The standard inner-page opener on sites whose header uses `transparent_on_hero`: a `heading` block on the left and a short `text` block on the right gives `about`, `services` or `contact` a title without a hero image, while the header stays solid. The heading becomes the page title when the section is first.
- Good for editorial compositions no grid can produce: a large statement heading beside a paragraph, two-column prose, a small photo beside a caption, a pinned summary beside a long list, a feature comparison in two columns.
- Bad as a call-to-action pattern (heading, sentence, button); use `image-text`, `image-callout` or `action-bar`. Bad for one photo with one paragraph, which `image-text` does with less effort.
- It never supports a transparent header itself; it is the section you use instead of a hero under one.
- Natural neighbours: `image` or `gallery` above or below, `scrolling-text` as a divider, another split-content with the opposite `balance` for a zigzag, `services-grid` or `card-grid` after an opener.
- Needs very little content: one heading and one paragraph are enough. It also carries a lot when one column is `sticky_column`.
- Fits studios, architects, consultancies, writers, galleries, restaurants with a story to tell; any site that wants to feel designed rather than templated.

## Pitfalls

- Every block has a `position`; a block left on the default lands on the left. Check both columns after adding blocks, especially when the plan was a right-heavy layout.
- On phones the whole left column comes first, then the whole right column. A heading on the right and its paragraph on the left read in the wrong order on a small screen; keep a heading above the text it introduces in the same column, or put it on the left.
- `balance` `left-heavy` and `right-heavy` are seven to three. The narrow column holds a label, a short heading, a small image or a button, not a paragraph.
- `sticky_column` only pins on wide screens and only makes sense when the other column is clearly longer. Pinning the longer column, or pinning with two short columns, changes nothing visible or looks stuck.
- An `image` block's `width` is a share of its column, so the same percentage gives a very different picture in the narrow column of a weighted layout. For a full-column image set it to the maximum.
- `features` lines starting with a plus sign get a check mark, lines starting with a minus sign get a cross, plain lines get no icon. Mixing pluses and minuses in one list reads as pros and cons; keep a benefits list all plus.
- `numbered-item` blocks count up separately in each column; two parallel sequences work, one sequence split across both columns does not.
- Headings at `7xl` and above fit two or three words and need the wide column. In the narrow column they wrap word by word.
- `text` with `muted`, `sm` and `uppercase` makes a good label above a heading; use it once per section or the labels compete.
- Filled schemes (`standard-secondary`, `highlight-primary`, `highlight-secondary`) pad inside their own band. `top_spacing` `none` on a filled section removes that inner padding rather than the gap to the neighbour. Between two unfilled split-content sections `none` on the shared edge is the right way to make a zigzag read as one composition.

## Recipes

### Inner-page title opener

The standard first section of an `about`, `services` or `contact` page when the header is transparent. Title left, one introductory sentence right; no images.

```json
{
  "type": "split-content",
  "settings": {
    "balance": "left-heavy",
    "color_scheme": "standard-primary"
  },
  "blocks": [
    { "type": "text", "settings": { "text": "<p>About the studio</p>", "size": "sm", "uppercase": true, "muted": true, "position": "left" } },
    { "type": "heading", "settings": { "text": "Small team, considered work", "size": "6xl", "position": "left" } },
    { "type": "text", "settings": { "text": "<p>We are a design studio of eight people working on buildings, interiors and the things that go in them.</p>", "size": "lg", "position": "right" } }
  ]
}
```

### Statement heading beside a paragraph

A dramatic editorial section for a home or about page: an oversized heading dominates the wide column while the explanation sits in the narrow one.

```json
{
  "type": "split-content",
  "settings": {
    "balance": "left-heavy",
    "color_scheme": "standard-secondary"
  },
  "blocks": [
    { "type": "heading", "settings": { "text": "Made to last", "size": "8xl", "position": "left" } },
    { "type": "text", "settings": { "text": "<p>Every piece is built from solid timber and finished by hand in our own workshop.</p><p>We repair what we make, for as long as you own it.</p>", "size": "base", "position": "right" } },
    { "type": "button", "settings": { "link": { "text": "Our process", "href": "about.html" }, "style": "secondary", "size": "medium", "alignment": "start", "position": "right" } }
  ]
}
```

### Pinned summary with scrolling list

A heading and short intro stay pinned on the left while numbered items scroll on the right: a process, a programme, a list of specialities. No images needed.

```json
{
  "type": "split-content",
  "settings": {
    "balance": "right-heavy",
    "sticky_column": "left",
    "color_scheme": "standard-primary"
  },
  "blocks": [
    { "type": "heading", "settings": { "text": "How a project runs", "size": "4xl", "position": "left" } },
    { "type": "text", "settings": { "text": "<p>Five stages, one point of contact throughout.</p>", "size": "sm", "muted": true, "position": "left" } },
    { "type": "numbered-item", "settings": { "title": "Conversation", "description": "We meet, look at the site and listen.", "size": "medium", "shape": "circle", "position": "right" } },
    { "type": "numbered-item", "settings": { "title": "Concept", "description": "Sketches and a first budget range.", "size": "medium", "shape": "circle", "position": "right" } },
    { "type": "numbered-item", "settings": { "title": "Design", "description": "Drawings, materials and permissions.", "size": "medium", "shape": "circle", "position": "right" } },
    { "type": "numbered-item", "settings": { "title": "Build", "description": "Weekly site visits and a shared schedule.", "size": "medium", "shape": "circle", "position": "right" } },
    { "type": "numbered-item", "settings": { "title": "Handover", "description": "A walkthrough and a year of follow-up.", "size": "medium", "shape": "circle", "position": "right" } }
  ]
}
```

### Two-column comparison

Two parallel offers side by side, each with an icon, a heading and a feature list. Pros use plus lines; keep both lists the same length.

```json
{
  "type": "split-content",
  "settings": {
    "balance": "equal",
    "color_scheme": "standard-primary"
  },
  "blocks": [
    { "type": "icon", "settings": { "icon": "star", "style": "filled", "size": "md", "shape": "circle", "position": "left" } },
    { "type": "heading", "settings": { "text": "For homes", "size": "3xl", "position": "left" } },
    { "type": "features", "settings": { "features": "+ Free survey\n+ Fixed quote\n+ Two-year guarantee", "position": "left" } },
    { "type": "icon", "settings": { "icon": "star", "style": "outline", "size": "md", "shape": "circle", "position": "right" } },
    { "type": "heading", "settings": { "text": "For businesses", "size": "3xl", "position": "right" } },
    { "type": "features", "settings": { "features": "+ Site assessment\n+ Out-of-hours work\n+ Maintenance contracts", "position": "right" } }
  ]
}
```

### Photo with caption

One image fills the narrow column with a small heading and muted caption beside it: a project detail, a featured dish, a room. Supply one photo; the image is the only picture.

```json
{
  "type": "split-content",
  "settings": {
    "balance": "right-heavy",
    "color_scheme": "standard-primary"
  },
  "blocks": [
    { "type": "image", "settings": { "width": 100, "position": "left" } },
    { "type": "heading", "settings": { "text": "The reading room", "size": "2xl", "position": "right" } },
    { "type": "text", "settings": { "text": "<p>Oak shelving, a north-facing window and the quietest chair in the house.</p>", "size": "sm", "muted": true, "position": "right" } }
  ]
}
```
