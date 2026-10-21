# comparison-slider

## Purpose

A before-and-after frame: two photos of the same scene laid over each other, with a handle the visitor drags to reveal one or the other. For renovations, cleaning, landscaping, detailing, restoration, retouching and redesigns, where the change itself is the proof.

One pair per section, set in the section's own settings; there are no blocks. The frame is always landscape (16 by 9) and both photos are cropped to fill it. `orientation: horizontal` splits left and right with the after photo on the right; `vertical` splits top and bottom with the after photo on top. Floating `before_label` and `after_label` badges sit in the corners and the heading group above is optional.

## When to use

- A proof section on a `services` page or a project page, or a single showpiece on the homepage after the hero.
- Good for one dramatic pair. Bad for several pairs in a row (use a `gallery` or `projects-grid` instead of stacking sliders) and for photos that were not taken from the same spot.
- Not a page opener.
- Sits well after `split-content` or `rich-text` that explains the service, before `testimonials` or an `action-bar`. A heading-less instance makes a strong visual break between two text-heavy sections.
- Needs exactly two photos with identical framing, lens and lighting, ideally shot on a tripod from a marked position, in landscape with the subject away from the centre line where the handle rests.
- Fits trades and renovation, interiors, cleaning, landscaping, car detailing, furniture and art restoration, photographers and retouchers, design agencies (old site versus new).

## Pitfalls

- Any shift in camera position shows as a jump at the divider and undermines the whole effect. Reject pairs that do not line up.
- `initial_position` is where the divider starts, measured from the left (or the top). The after photo fills the far side, so a low value such as 25 leads with the result and a high value such as 75 leads with the starting state; 50 is neutral.
- Portrait photos do not get a portrait frame; `vertical` changes the drag direction only. Use it when the change runs top to bottom (a ceiling, a wall, a hedge line), and keep portrait shots for `image-text` or `gallery`.
- A vertical drag fights page scrolling on phones; prefer `horizontal` unless the subject demands otherwise.
- The handle covers the middle of the frame; keep the most telling detail off centre, and do not rely on small differences that only show at full size.
- Relabel the badges when "Before" and "After" are too generic ("Original" and "Restored", "Winter" and "Summer"); turn `show_labels` off when the photos already carry captions.
- `content_width: fullwidth` stretches the frame to the full content column; the default keeps a slightly narrower reading width that matches text sections above and below.
- Any scheme other than `standard-primary` makes a filled band that pads inside itself; a highlight scheme is justified only when the slider is the page's key proof.

## Recipes

### Project reveal

A single renovation or landscaping project with a centred heading and the handle in the middle. Needs two aligned landscape photos.

```json
{
  "type": "comparison-slider",
  "settings": { "eyebrow": "Recent project", "title": "See the transformation", "description": "Drag the handle to compare.", "heading_alignment": "center", "before_label": "Before", "after_label": "After", "orientation": "horizontal", "initial_position": 50, "show_labels": true }
}
```

### Lead with the result

The divider starts near the left so the finished state dominates on load and the visitor drags to uncover the starting point. Labels renamed for restoration work.

```json
{
  "type": "comparison-slider",
  "settings": { "eyebrow": "Restoration", "title": "Brought back to life", "heading_alignment": "start", "before_label": "As found", "after_label": "Restored", "orientation": "horizontal", "initial_position": 25, "show_labels": true, "color_scheme": "standard-secondary" }
}
```

### Top-to-bottom reveal

A change that runs vertically, such as a repainted ceiling and wall or a cleared hedge line. Keep the pair landscape.

```json
{
  "type": "comparison-slider",
  "settings": { "title": "From overgrown to open", "heading_alignment": "center", "before_label": "Overgrown", "after_label": "Landscaped", "orientation": "vertical", "initial_position": 50, "show_labels": true }
}
```

### Silent break

No heading, full content width, between two text sections. The photos do the talking; keep the labels so the frame explains itself.

```json
{
  "type": "comparison-slider",
  "settings": { "eyebrow": "", "title": "", "description": "", "before_label": "Before cleaning", "after_label": "After cleaning", "content_width": "fullwidth", "orientation": "horizontal", "initial_position": 60, "show_labels": true, "top_spacing": "small", "bottom_spacing": "small" }
}
```
