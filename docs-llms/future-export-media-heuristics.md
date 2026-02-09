## Export Media Size Heuristics Plan

### Goal

Reduce exported media size by copying only the image variants actually used by the site, while preserving safety via conservative fallback behavior.

### Scope

- Applies to export only.
- No changes to project data or media library metadata.
- Keeps full fidelity for SVGs and original assets.

### Key Inputs

- Rendered HTML for each exported page.
- `media.json` for each project (image file metadata and generated sizes).

### Proposed Approach

1. Export pages normally to HTML in memory (or to temp output).
2. Parse HTML to collect all image URLs that point to `/uploads/images/`.
3. Map each URL back to a media file in `media.json`.
4. Copy only those exact files into the export output.

### Heuristic Rules

- **Literal size use**: If a template uses literal size arguments (e.g. `image: 'large'`), expect a single deterministic output path and include only that variant.
- **Path-only usage**: If using `image: 'path'` (or `url`), include only the returned path.
- **Dynamic size use**: If the size argument is not a literal (Liquid variable or conditional), mark the widget as "low confidence".
- **JS-driven image swapping**: If a widget includes inline JS that references widget image settings or builds URLs dynamically, mark as "low confidence".

### Fallback Strategy

- For a "low confidence" widget, include **all generated sizes** for the images used by that widget.
- If any image URL cannot be resolved back to a file in `media.json`, include **all sizes** for that file's basename (or as a final fallback, include all sizes for the page).

### Confidence Scoring (Optional)

- Start at `high`.
- Downgrade to `medium` if any template logic uses Liquid conditionals for sizes.
- Downgrade to `low` if size is dynamic or referenced in JS.
- Only apply "strict copy" when confidence is `high`.

### Implementation Outline

1. Add an export option flag: `exportMediaMode = "heuristic" | "all"` (default `all`).
2. In export flow:
   - Render page HTML.
   - Collect image URLs.
   - Resolve to media files and sizes.
   - Copy only required image files.
3. When confidence is `low`, copy full size set for affected images.
4. Keep SVG behavior unchanged (always include original).

### Risks and Mitigations

- **Missed assets**: Use HTML parsing plus fallback to full-size sets.
- **Dynamic URLs**: Detect and fallback to all sizes for that widget.
- **Third-party JS**: If scripts rewrite URLs at runtime, fallback to "all".

### Validation / Test Plan

- Export a project with multiple widgets and confirm:
  - All images render correctly.
  - Output size is reduced when confidence is `high`.
  - No missing images in "low confidence" scenarios.
- Compare exported site output with baseline export (all sizes).

### Notes

- This plan keeps export safe by default and only optimizes when confidence is high.
- If needed, we can expose a UI toggle for export media mode.
