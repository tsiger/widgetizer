# Widget editing model

How to decide what a widget's editor shows: which parts are settings, which are blocks, and which controls every widget carries. The goal is a widget that an owner can bend to other content and other niches without asking for a new widget.

These are **Conventions** unless marked otherwise. They come from Arch and from widgets that owners have reviewed. When a theme already follows a different pattern, keep its pattern inside that theme.

## Settings or blocks

Ask one question for each part of the design: **could the owner want more of it, fewer of it, or in a different order?**

- **Yes → a block.** Cards, rows, questions, quotes, prices, facts, steps, opening hours lines, card contents.
- **No, it appears once and its place is fixed → a widget setting.** The section's introduction, the image of an image-and-text section, the layout and appearance controls.

Signs that a setting should have been a block:

- Numbered settings: `fact_1`, `fact_2`, `column_1_header`, `option_3_label`.
- A group of settings that together describe one "thing" inside a card or panel: `card_title`, `card_price`, `card_note`, `card_button`. The card's contents are blocks; the card itself is the widget.
- A design detail the owner cannot remove without leaving an empty gap.

When the items are reused on several pages, need sorting or paging, or get a page of their own, they are a collection, not blocks. The number of items alone does not decide.

Example: a price card beside an introduction. The introduction (eyebrow, heading, description, button) is settings. The card is built only from blocks: a heading block, a price block, detail blocks, a text block and a button block, in any order. An owner with two services adds the widget twice; an owner without a price removes the price block.

## Reuse the standard content blocks

Most widgets need the same three pieces inside a card, panel or column: a heading, some text and buttons. Give them one shape across the whole theme and reuse it:

| Block | Content | Display |
| --- | --- | --- |
| `heading` | `text` (text) | `size` (the theme's heading scale) |
| `text` | `text` (richtext) | `size` (`sm`, `base`, `lg`), `muted`, optionally `uppercase` for short labels |
| `button` | `link`, `link_2` | `style`, `style_2` (`primary`, `secondary`, `link`), `size` |

- Keep the same setting ids, options, defaults and groups wherever the block appears. An owner learns the block once.
- Add a widget's own block type only for content these cannot hold: a price with its note, a detail row with icon, label and value, a question with its answer.
- Never drop a control from a standard block to lock in the starter look. If the design needs a size, set it in the starter content.
- A theme with a build step may define these blocks once and expand them into each schema. Without one, copy them exactly.

## The section introduction

List widgets and side-by-side widgets open with the same introduction, as widget settings, in this order:

| Setting | Type | Notes |
| --- | --- | --- |
| `eyebrow` | `text` | Short label above the heading |
| `title` | `text` | The section heading |
| `title_size` | `select` | Optional; the theme's heading scale. Add it where the design needs a heading larger or smaller than the default |
| `description` | `text` or `richtext` | `richtext` when it may need two paragraphs, a link or bold |
| `intro_link` + `intro_link_style` | `link` + `select` | One optional action under the introduction; shows only with text and a destination |
| `heading_alignment` | `select` | `start`, `center` |

Use `title` for a section heading and `heading` only inside blocks or opening widgets that already use it; do not mix both in one widget.

## Controls every widget carries

| Control | Ids and values |
| --- | --- |
| Colour scheme | `color_scheme`: the theme's schemes (Arch: `standard-primary`, `standard-secondary`, `highlight-primary`, `highlight-secondary`) |
| Spacing | `top_spacing`, `bottom_spacing`: `auto`, `small`, `none`. Test `none`: the widget must sit flush |
| Position, when the layout has two sides | `<part>_position`: `start`, `end` (`image_position`, `sidebar_position`, `card_position`). Use `start`/`end`, never `left`/`right`, so right-to-left languages work |
| Image shape, when there is an image | `aspect_ratio`: `auto` plus fixed ratios written `4 / 3`; an `original` option only when the design has its own crop |
| Columns, for grids | `columns_desktop` (range) |

Keep appearance controls few: about four beyond spacing. A control that turns the widget into a different composition is a second widget in disguise; a control that rearranges the same composition (the image side, the card side) is fine. A control that works only in some layouts says so in its description.

## Group order

Group the editor with `header` settings, the same way in every widget:

1. `content_header`: the introduction and the widget's own content settings.
2. `display_header`: layout, position, columns, image shape.
3. `appearance_header`: colour scheme, then top and bottom spacing.

Blocks follow the same pattern: `content_header`, then `display_header` for the block's own display settings.

## Content kept elsewhere

- Business facts (name, phone, email, address, opening hours, social profiles) come from the site's project details. Do not add widget settings for them; add a block or a checkbox that shows them.
- A setting or block that shows content kept elsewhere carries a short `description` naming the place, for example "From Project details › Business details". Write that wording once in the theme's locale and reuse the key.

## Heading levels

- The section heading is `h1` when `widget.index == 1`, otherwise `h2`.
- Headings inside items and blocks sit one level below the section heading.
- With no section heading, item headings take the section level; on the first widget only the first one becomes `h1`, the rest `h2`.
- Apply the same rule to heading blocks inside cards and panels.

## Empty widgets

- A widget whose content is all empty outputs nothing on the live site. Arch's older widgets still render an empty section; new widgets should not. Check `renderMode == 'preview'` to show a placeholder or a short locale message in the editor only.
- An empty image shows a placeholder in the editor and nothing on the live site.
- An introduction with only its action still shows.

## Stable names

Widget types, setting ids, block types and option values never change once saved content can use them. Change a label, never a value. Add new settings with defaults that keep existing sites looking the same.

## Before handing over a widget

- Every setting changes something visible; test each one, including heading and text sizes, both button styles and sizes, and `none` spacing.
- Every label has a locale entry in each language the theme ships.
- A test page covers: the starter look, each layout option, every colour scheme, long text, missing optional parts, and the empty widget.
- Check desktop and phone.
