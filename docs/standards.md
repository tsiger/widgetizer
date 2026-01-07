# Widget Standardization Guidelines

## CRITICAL PROTOCOL (READ THIS FIRST)

**IF YOU DO NOT UNDERSTAND SOMETHING, NEED TO INTRODUCE NEW STYLES, OR CHANGE ANYTHING SIGNIFICANT, YOU WILL STOP AND ASK.**

**YOU WILL NEVER PROCEED WITHOUT EXPLICIT PERMISSION FROM THE USER.**

This document outlines the strict standards for all Arch theme widgets.

## 1. Class Naming & Structure

- **Widget Header**:
  - Eyebrow: `.widget-eyebrow`
  - Headline: `.widget-headline` (usually `<h2>`)
  - Description: `.widget-description` (usually `<p>`)
- **Block Content**:
  - Titles/Headings: `<h3>` tags. styling via `block-text` utilities.
  - Body Text: `<p>` tags. Styling via `block-text` utilities.
- **Buttons**:
  - Base: `.widget-button` (Do not use `.widget-button-small` anymore)
  - Modifiers: `.widget-button-primary`, `.widget-button-secondary`
  - Sizes: `.widget-button-medium`, `.widget-button-large`, `.widget-button-xlarge` (Use sparingly)

## 2. Typography & Utilities

- **NO Custom CSS** for basic text styling in widget liquid files.
- **DELETE** redundant `font-size`, `font-weight`, `line-height`, `color` in `<style>` blocks if a utility class exists.
- **USE** `block-text` modifiers:
  - Sizes: `block-text-sm`, `block-text-lg`, `block-text-xl`, `block-text-2xl`
  - Weights: `block-text-medium`, `block-text-bold`
  - Colors: `block-text-muted`, `block-text-heading`
  - Styles: `block-text-uppercase`

## 3. Semantic HTML & Accessibility

- **Headings**: Ensure logical hierarchy (`h2` for widget title, `h3` for items).
- **ARIA**: Mandatory for interactive elements (Accordions: `aria-expanded`, `aria-controls`, `role="region"`).
- **Images**: Ensure `alt` text is supported and rendered.

## 4. Layout & Spacing

- **Container-Based Spacing**:
  - Semantic classes (`.widget-title`, `.widget-description`) **DO NOT** carry default margins.
  - **USE** local style blocks with `display: flex; flex-direction: column; gap: var(--space-md);` (or consistent spacing variable) on the content container to manage vertical rhythm.
  - This allows semantic classes to be used purely as hooks without layout side effects.

## 5. Backgrounds & Color Schemes

- **Backgrounds**:
  - **DO NOT** use inline `background-color: ...`.
  - **USE** `style="--widget-bg-color: {{ widget.settings.background_color }};"` combined with `.has-bg-color` class.
  - For images: `style="background-image: ..."` with `.has-bg-image`.
- **Overlays**:
  - **USE** `.has-overlay` class.
  - **SET** `style="--widget-overlay-color: {{ widget.settings.overlay_color }};"`.
  - **Deprecated**: Do not use `.overlay-light/medium/dark` presets. Use the alpha-picker setting.
- **Color Schemes**:
  - **USE** `.color-scheme-light` or `.color-scheme-dark` classes to toggle text/border colors locally.
  - Logic: `{% if widget.settings.text_color == 'light' %}color-scheme-dark{% else %}color-scheme-light{% endif %}`.

## 6. Block Architecture

- **Flexible Content**:
  - Move away from fixed top-level settings (`eyebrow`, `headline`, `button`) where possible.
  - **USE** a `blocks` array with `heading`, `text`, `button` block types.
  - This allows users to reorder elements freely.
- **Loop Rendering**: Render blocks via `{% for blockId in widget.blocksOrder %}` using `widget.blocks[blockId]`.

## 7. Schemas & Presets

- **Defaults**:
  - **Header**: Eyebrow, Title, and Description defaults SHOULD be present and engaging.
  - **Blocks**: `defaultBlocks` must contain 3-4 realistic, varied items.
- **Settings**:
  - Consistent naming (`title`, `description`, `text`, `image`).
  - **Overlay**: Use `"type": "color"` with `"allow_alpha": true` for overlay settings.
