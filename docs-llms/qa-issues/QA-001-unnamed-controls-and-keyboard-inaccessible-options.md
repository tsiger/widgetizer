# QA-001 — Unnamed controls and keyboard-inaccessible options

| Field | Value |
| --- | --- |
| Story IDs | `EDIT-028`, `EDIT-036`, `FIELD-003`, `FIELD-009`, `FIELD-010`, `MENU-013`, `MENU-015`, `MENU-017`, `MEDIA-010`, `PROJ-026`, `SET-002`, `THEME-002`, `THEME-004`, `SAFE-015`, `SAFE-016` |
| Severity | High |
| Environment | Web app; in-app browser; macOS; `experimentation` at `c7dff686` |
| Preconditions | Active disposable project `QA Web Smoke 2026-06-22` |
| Status | Confirmed |
| Reproducibility | Always on the inspected controls |
| Data impact | None; blocks or obscures keyboard and assistive-technology operation |

## Affected controls observed

- Page and collection-style row-selection buttons expose no accessible name.
- Editor block-selection buttons and the block-settings Back button expose no accessible name.
- Theme range sliders expose their value but no accessible name.
- Rich-text `contenteditable` surfaces have no role or accessible name.
- Advanced custom-code textboxes have no accessible name.
- Menu expand/collapse, add-child, delete, link-picker, and drag controls expose no accessible name.
- The menu internal-link suggestion is a click-handled `<li>` with no interactive role or keyboard focusability.
- Media row-selection controls and generic-file preview controls expose no accessible name; list/grid state is only expressed through color rather than `aria-pressed`.
- Media selector cards are clickable `<div class="cursor-pointer">` elements with no role, accessible name contract, or keyboard focusability.
- Collection item link autocomplete suggestions render as plain list items rather than selectable options/buttons.
- Collection item icon-card block handles in the editor render as empty role buttons; the selected block is visible only through adjacent text such as `Card`.
- Site settings image-preview actions expose generic labels such as `Preview`, and nested edit/remove icon buttons need clearer, non-ambiguous semantics.
- The Import Backup overlay has no detected `role="dialog"`/`aria-modal`, and its file input has no accessible label or ZIP `accept` metadata.
- The Themes preset-gallery collapse/expand toggle is an icon-only button with no accessible name.

## Minimal reproduction

1. Open a page in the visual editor and select a block.
2. Inspect the accessibility tree or navigate using only Tab and a screen reader.
3. Repeat in Site settings > Typography/Advanced and in a menu structure editor.

## Expected

Every interactive control has a useful accessible name, native or appropriate ARIA semantics, visible keyboard focus, and Enter/Space behavior where applicable.

## Actual

The affected controls appear as unnamed buttons, sliders, or textboxes. The menu suggestion is not represented as an interactive option and cannot be reached normally by keyboard.

## Evidence

- Browser accessibility snapshots repeatedly contained entries such as `button:`, `slider`, `textbox`, and `switch` without a quoted accessible name.
- `/settings` > Typography exposes custom sliders as plain `slider` entries without names, while `/settings` > Advanced exposes the Custom CSS, Custom Head Scripts, and Custom Footer Scripts editors as unnamed `textbox` entries.
- The Site Icon media picker rendered `qa-gallery.webp` and `qa-unsafe.svg` selectable cards as non-semantic cursor-pointer `<div>` elements.
- `/collections/services/mens-cut/edit` renders the CTA Link URL autocomplete suggestion `Contact` as an `<li>` with no option/button role; selecting it works by pointer but the control is not exposed as an interactive option.
- `/page-editor?pageId=services` renders Icon Card Grid card handles as empty `role="button"` elements next to visible `Card` text, so the block controls do not carry their own accessible names.
- `/projects` > Import Backup rendered the upload overlay without a dialog role and exposed a raw `input type="file"` with no label.
- `/themes` exposes the Arch preset expand/collapse control as `button:` in the accessibility snapshot; functional collapse/expand worked, but the toggle has no label.
- `packages/editor-ui/src/components/menus/MenuEditor/SortableItem.jsx` wraps icon-only `IconButton` controls in visual tooltips without providing accessible labels.
- `packages/editor-ui/src/components/settings/inputs/RichTextInput.jsx` assigns only a CSS class and placeholder data to the editable surface.
