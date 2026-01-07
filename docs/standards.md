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

## 4. Schemas & Presets

- **Defaults**:
  - **Header**: Eyebrow, Title, and Description defaults SHOULD be present.
  - **Blocks**: `defaultBlocks` must contain 3-4 realistic, varied items (not "Item 1", "Item 2").
- **Settings**:
  - Consistent naming (`title`, `description`, `text`, `image`).
