# Page Editor Performance Improvement Action Plans

This document outlines concrete steps for each approach described in
`Codex-PageEditor.md`.  Each section summarises the goal and lists
initial tasks that have been implemented in code.

## 1. Client‑Side Patching

* Introduce `previewRuntime.updateWidgetSetting` to apply style or text
  changes directly inside the preview iframe.
* Added helper functions in `clientPatcher.js` for sending patch messages
  from the editor.
* The `PreviewPanel` now exposes `updateWidgetSetting` via
  `previewManager`.

## 2. Partial Hydration

* Created placeholder utility `partialHydration.js` to parse data
  attributes describing how settings map to DOM nodes.
* Initial runtime support added – the new patch handler will respect the
  selectors provided by `data-update` attributes when present.

## 3. Local Template Execution

* New `localRenderer.js` exposes a small wrapper around LiquidJS so that
  simple widget templates can be rendered directly in the browser.
* This is optional and falls back to the existing API when local
  templates are unavailable.

## 4. Virtual DOM Diffing

* Added experimental `VirtualPreview.jsx` component that renders widgets
  as React elements inside the iframe.  It demonstrates how React’s diff
  algorithm could be used for fast updates.
* This component is not wired into the editor yet but serves as a
  starting point for further work.

## 5. Incremental Rendering Service

* Server side now exposes `/api/preview/widget-fragment` which returns a
  single widget’s HTML.  The new service `renderWidgetFragment` simply
  delegates to the existing `renderWidget` for now but is a foundation
  for returning smaller diffs later.

These initial steps do not implement the full optimisation strategy but
provide a working baseline for experimentation.
