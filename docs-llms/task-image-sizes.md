# Task: Responsive Image Sizes Audit

This document captures the current responsive image audit for the default Arch theme and defines the implementation plan for fixing widget `sizes` usage while continuing to inherit Widgetizer's global image size configuration.

## Goal

Keep the default Widgetizer image sizes as the single source of truth for the default Arch theme.

- Do not add `settings.imageSizes` to `themes/arch/theme.json`
- Assume the theme will inherit the app-level default size ladder
- Make widget `srcset` and `sizes` behavior sensible for the layouts the theme actually renders
- Create a pattern that will also work well across future presets of the same theme

## Current Global Size Ladder

Arch currently inherits the default Widgetizer image sizes:

- `thumb`: `150px`
- `small`: `480px`
- `medium`: `1024px`
- `large`: `1920px`

This means widget-level `sizes` strings are critical. If `sizes` overstates rendered width, browsers will often select `1024w` or `1920w` candidates unnecessarily.

## Important Constraint

This is the default theme. We do **not** want custom theme image sizes here.

Reason:

- The default theme should inherit platform defaults
- Future presets should share one reliable image-size ladder
- We want to fix template behavior, not solve layout mismatches by introducing theme-specific size variants

## Implementation Notes

### Responsive image plumbing is already in place

The core `image` Liquid tag already supports:

- `srcset: true`
- `sizes: '...'`
- width-based `srcset` generation from available variants
- original-image fallback only when no public `large` variant exists
- omission of `srcset` when there are fewer than 2 useful candidates

This means the main issue is not backend generation. The main issue is how widgets describe their rendered width through `sizes`.

### Public delivery policy

Raster originals should stay internal when a `large` variant exists.

- If `sizes.large` exists, public delivery should stop at `large`
- The original upload should not appear in `srcset`
- Export should not copy the original raster file
- If no `large` variant exists, the original can still act as the top delivered asset
- SVGs remain original-only

### Docs currently encourage generic examples

The docs are technically correct, but they currently normalize examples like:

- `(max-width: 768px) 100vw, 50vw`
- `(max-width: 768px) 100vw, 400px`

Those examples were copied into several widgets even when the real layout breakpoints are `750px` or `990px`, or when the image lives in a constrained container instead of the full viewport.

## Findings

### 1. `srcset` without `sizes`

Some widgets enable `srcset` but omit `sizes` entirely.

Affected patterns:

- `themes/arch/widgets/banner/widget.liquid`
- `themes/arch/widgets/image-text/widget.liquid` for inner block images
- `themes/arch/widgets/split-content/widget.liquid`

Why this is a problem:

- These widgets render `.widget-block-image`
- `.widget-block-image` is capped by `--block-image-width`
- The image is often much narrower than the viewport
- Without `sizes`, the browser assumes a much larger rendered slot and may fetch larger candidates than needed

### 2. Wrong breakpoint in `sizes`

Some widgets switch layout at `750px` or `990px`, but their `sizes` string switches behavior at `768px`.

Affected widgets:

- `themes/arch/widgets/image-text/widget.liquid`
- `themes/arch/widgets/image-callout/widget.liquid`
- `themes/arch/widgets/testimonial-hero/widget.liquid`

Why this is a problem:

- In the `769px` to `989px` range, several widgets are still effectively single-column
- Their `sizes` string already tells the browser to assume half-width rendering
- This can lead to under-describing or over-describing the real slot, depending on layout

### 3. `100vw` used for contained images

Some widgets use `sizes: '100vw'` even though the image is constrained by a centered container or by a split layout.

Affected widgets:

- `themes/arch/widgets/image/widget.liquid`
- `themes/arch/widgets/image-hotspots/widget.liquid`
- `themes/arch/widgets/image-tabs/widget.liquid`
- `themes/arch/widgets/comparison-slider/widget.liquid`
- `themes/arch/widgets/testimonial-hero/widget.liquid`

Why this is a problem:

- `100vw` tells the browser the image renders at full viewport width
- In reality, the image is often inside `--container-max-width`, `widget-content-lg`, or a multi-column layout
- This makes candidate selection larger than necessary on desktop

### 4. `50vw` used as a rough guess when the image is not actually half the viewport

Some widgets use `50vw` as a generic desktop fallback even when the image is narrower than half the viewport or only becomes split-layout at a later breakpoint.

Affected widgets:

- `themes/arch/widgets/image-text/widget.liquid`
- `themes/arch/widgets/image-callout/widget.liquid`
- `themes/arch/widgets/project-showcase/widget.liquid`
- `themes/arch/widgets/sliding-panels/widget.liquid`
- `themes/arch/widgets/steps/widget.liquid`
- `themes/arch/widgets/team-highlight/widget.liquid`
- `themes/arch/widgets/profile-grid/widget.liquid`

Notes:

- Some of these are acceptable approximations
- Some are clearly wrong
- `sliding-panels` is inherently dynamic, so only an approximate value is possible

### 5. Small fixed-size images are inconsistent

Some small images do not use `srcset`, which is usually fine, but we should make a conscious decision widget by widget.

Examples:

- header logos
- footer logos
- testimonial avatars
- signature images
- priced-list images

Recommendation:

- Keep simple fixed-size assets simple unless there is a strong reason to support higher-DPR responsive candidates
- Do not add `srcset` everywhere blindly

### 6. CSS background images bypass responsive image selection entirely

These widgets use `output: 'url'` or `output: 'path'` for CSS backgrounds:

- `themes/arch/widgets/banner/widget.liquid`
- `themes/arch/widgets/slideshow/widget.liquid`
- `themes/arch/widgets/split-hero/widget.liquid`
- `themes/arch/widgets/video-popup/widget.liquid`
- `themes/arch/widgets/bento-grid/widget.liquid`
- `themes/arch/widgets/icon-card-grid/widget.liquid`

This is expected in many cases, but it means:

- no `srcset`
- no `sizes`
- one chosen asset only

This is not the first priority for the current task. The immediate task is to fix actual `<img>` usage first.

## Widget Groups

### Group A: Good enough baseline, likely minor or no changes

These already follow a roughly sensible pattern relative to their layout:

- `themes/arch/widgets/card-grid/widget.liquid`
- `themes/arch/widgets/checkerboard/widget.liquid`
- `themes/arch/widgets/content-switcher/widget.liquid`
- `themes/arch/widgets/gallery/widget.liquid`
- `themes/arch/widgets/masonry-gallery/widget.liquid`

Current shared pattern:

- `size: 'medium'`
- `srcset: true`
- `sizes: '(max-width: 768px) 100vw, 400px'`

Open question:

- whether to align `768px` to the theme's `750px` breakpoint for consistency

### Group B: Clear fixes needed

These have obvious mismatches between layout and `sizes`:

- `themes/arch/widgets/banner/widget.liquid` block images
- `themes/arch/widgets/image-text/widget.liquid`
- `themes/arch/widgets/image-callout/widget.liquid`
- `themes/arch/widgets/image-tabs/widget.liquid`
- `themes/arch/widgets/image/widget.liquid`
- `themes/arch/widgets/testimonial-hero/widget.liquid`
- `themes/arch/widgets/comparison-slider/widget.liquid`
- `themes/arch/widgets/split-content/widget.liquid`

### Group C: Approximation is unavoidable, but values should improve

These are harder because width changes by configuration, carousel mode, or interaction:

- `themes/arch/widgets/project-showcase/widget.liquid`
- `themes/arch/widgets/sliding-panels/widget.liquid`
- `themes/arch/widgets/steps/widget.liquid`
- `themes/arch/widgets/team-highlight/widget.liquid`
- `themes/arch/widgets/profile-grid/widget.liquid`

## Approach

### Phase 1: Normalize the rules we want to follow

Before changing widgets, define the standard:

- `sizes` should describe rendered layout width, not image intrinsic size
- use theme breakpoints that match actual CSS behavior
- prefer concrete pixel caps for fixed or card-like image slots
- use viewport units only when the image really tracks viewport width
- for contained layouts, avoid defaulting to `100vw`
- for dynamic widgets, use the closest honest approximation rather than a generic copy-paste value

### Phase 2: Fix obvious template mismatches

Start with the widgets that are clearly wrong and low-risk to correct:

- missing `sizes` on `.widget-block-image`
- `100vw` on contained non-fullwidth images
- `50vw` on layouts that do not become two-column until `990px`
- `100vw` on image areas that become `1fr 1fr` at `750px`

### Phase 3: Review approximate-layout widgets

For widgets with config-dependent or interaction-dependent width:

- choose a conservative approximation
- prefer slightly under-claiming full viewport usage over blindly using `100vw`
- document any cases where a perfect `sizes` expression is not realistically possible

### Phase 4: Update docs

After template fixes:

- update `docs-llms/theming.md`
- update `docs-llms/theming-widgets.md`

Doc changes should explicitly say:

- examples are illustrative, not universal
- `sizes` must match the widget's actual layout breakpoints and container width
- do not copy `50vw` or `100vw` unless the layout truly behaves that way

### Phase 5: Validate in output

Check preview or published HTML and verify:

- `srcset` is emitted where expected
- `sizes` reflects the actual widget layout
- large desktop pages are no longer over-describing narrow image slots
- there are no regressions for mobile layouts

## Proposed Task List

- [ ] Audit every Arch widget that uses `{% image %}` and classify it as fixed-size, card-size, container-width, split-layout, or dynamic-width
- [ ] Add explicit `sizes` to all `.widget-block-image` usages that currently rely on `srcset` without `sizes`
- [ ] Replace clearly wrong `100vw` values on contained widgets with layout-aware values
- [ ] Replace clearly wrong `50vw` values on widgets that remain single-column until `990px`
- [ ] Align `sizes` breakpoints with actual theme breakpoints where practical, especially `750px` and `990px`
- [ ] Review `project-showcase`, `sliding-panels`, `steps`, `team-highlight`, and `profile-grid` for better approximations instead of generic `50vw` or `30vw`
- [ ] Decide intentionally which small/fixed assets should stay non-responsive and document that choice
- [ ] Leave CSS background-image widgets out of the first pass unless a widget should be refactored to real `<img>` output
- [ ] Update `docs-llms/theming.md` with stricter guidance on choosing `sizes`
- [ ] Update `docs-llms/theming-widgets.md` so example snippets do not encourage copy-paste misuse
- [ ] Manually inspect generated preview or published HTML for representative widgets after changes
- [ ] Run a final pass to ensure presets will inherit the same corrected behavior without needing custom image sizes

## Suggested Order of Implementation

1. Fix Group B widgets with clear mismatches.
2. Re-check output HTML and real rendered widths.
3. Tackle Group C approximation widgets.
4. Update docs.
5. Do a final QA pass in preview/exported output.

## Success Criteria

We are done when:

- Arch still inherits the default Widgetizer image sizes
- widgets no longer use obviously misleading `sizes` values
- `.widget-block-image` patterns have explicit responsive sizing rules
- documentation teaches widget authors how to choose `sizes` correctly
- future presets can reuse the same responsive-image behavior without needing theme-specific image sizes
