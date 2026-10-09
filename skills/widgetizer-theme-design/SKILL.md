---
name: widgetizer-theme-design
description: "Develop a Widgetizer theme's visual direction, responsive preview page and simple editing experience from its audience, content and the author's preferences, including screenshots, images or website references. Use when planning a new theme or discussing its design and ease of use. Technical implementation and validation belong to the widgetizer-theme skill."
---

# Widgetizer Theme Design

Turn the author's business knowledge and visual preferences into a usable theme brief and visual direction. Keep the editing experience simple as the design develops.

## Establish the brief

Read the request, existing theme and any supplied brief or references before asking questions. Distinguish the person editing the website from the visitor using it; their needs shape different decisions.

Collect the information that affects the requested work:

| Input | Decisions it informs |
| --- | --- |
| Business or niche, and intended website owner | Relevant capabilities and the owner's editing needs |
| Visitors and their main purpose | Information priority, navigation and primary actions |
| Essential content | Pages, sections and recurring content such as projects or articles |
| Visual preferences and references | The desired character, specific qualities to draw from, and things to avoid |
| Available content and imagery | Whether the design can rely on photography, illustration or substantial writing |
| Editing freedom | Which choices customers control and which the theme handles automatically |

These are areas to understand, not a questionnaire to deliver verbatim. For a narrow change, gather only the inputs that matter to it. An author need not supply references or know design terminology.

Keep a compact working brief that distinguishes supplied requirements, delegated choices and unresolved decisions. Carry collection-wide preferences into its themes when available; keep those preferences specific to that collection rather than imposing them on every author.

Read any collection rules identified by the repository instructions or supplied brief. Record confirmed design bans in that collection's maintained brief or rules file, with precise scope and examples. Apply them to markup, styles, schema controls and demo content, then check the rendered preview; structural validation does not enforce an author's visual preferences. Carry these rules into the implementation handoff.

## Ask useful questions

- Use answers already supplied in the conversation or brief. Do not restart discovery when handing off between design and implementation.
- Ask only when the missing answer would materially change the result. Keep each round small and use plain language.
- Invite the author's knowledge of the business and their taste. Propose concrete design choices with their effects instead of asking the author to specify technical design values.
- When the author is unsure, give them a useful recommendation to react to. When they delegate a choice, make it and identify the assumption briefly.

## Establish a visual direction

Accept website links, screenshots of themes or individual sections, mood boards, photographs and other visual references. References can come from a different industry. Use the available image-viewing or browser tools to inspect them; if a reference cannot be viewed, say so and work from the author's description without claiming to have inspected it.

Identify the visible qualities that could inform this theme: page composition, typography character, spacing, image treatment, colors and atmosphere. A screenshot establishes only the state it shows; other viewport layouts and interaction behavior need additional evidence or an explicit design proposal.

The author may like only part of a reference. Use their annotations and comments to distinguish desired qualities from incidental details. If their preference is unclear, explain what stands out and invite a reaction to the relevant choices. Do not require them to name fonts or describe design techniques.

For an open-ended brief, research references when browsing is available and propose a small selection of distinct directions, usually two or three. Include visual examples or source links when available, explain how each direction fits the audience and content, and identify your recommendation. Describe meaningful differences in composition, typography and imagery. For example, a restaurant theme could emphasize large dining photographs or give menus and editorial storytelling the leading role.

When the author supplies a clear direction, develop it directly. When they delegate the choice, select a suitable direction and proceed within the requested scope. Once a direction is established, carry its defining qualities and reference observations into the working brief so implementation can use them without restarting the discussion.

## Preview the direction in a working page

For a new theme, demonstrate the chosen direction in one working, responsive page before expanding it into the full theme. Use the technical skill for the implementation. For changes to an established theme, keep the preview proportionate to the affected design.

Establish the theme's typography roles, color roles, content widths, spacing, image treatment and shared details such as buttons and borders. Apply those choices consistently in the preview. A useful first page contains:

- A compact style guide showing the selected colors, typography and common controls.
- A header and hero with representative copy, imagery and a primary action.
- One or two supporting layouts suited to the niche, such as image-and-text, a gallery or service cards.

Choose examples that reveal how the design works together; the page need not demonstrate every possible widget. These are layouts within the theme and do not require new Widgetizer Core widgets. Keep page text and controls in the real page implementation so that typography, wrapping and responsive behavior can be assessed.

Inspect the rendered page at desktop and mobile widths using available browser tools, then show the author the preview and briefly explain its defining choices. Name any uninspected views or provisional assets. Use this as an early collaboration point when the author wants to review the direction; when they have delegated design decisions, inspect and refine the preview yourself before continuing. Carry accepted changes into the theme's visual rules and subsequent widgets.

This page demonstrates a direction. Completing a reusable theme, its presets and its editor/export checks remains further work.

## Choose imagery for the preview

Use supplied imagery where it fits the brief. When useful and image-generation tools are available, generate assets such as hero images, illustrations or textures to support the proposed direction. If generation is unavailable, use appropriate available assets or clearly identified placeholders and explain what remains provisional.

For the initial preview, generate only a few key images needed to demonstrate the direction. The author can then choose to have the agent generate the remaining imagery or supply it themselves. Honor an existing explicit choice; if it is unresolved, ask before generating a full set for the theme or its presets. When the author will supply images, provide a concise list of the needed subjects, intended placements and useful proportions.

Plan imagery as part of the composition: subject, atmosphere, lighting, colors, proportions, responsive crops and space for accompanying text. Keep related images visually coherent. Use generated images as assets within the working page. Website screenshots supplied as references inform the design; the theme's actual imagery is a separate asset choice.

## Make editing simple

A theme should look polished with its defaults. Customers should be able to replace content and personalize it without understanding layout or responsive design.

Use this editing model by default, adapting it to explicit requirements:

- Let customers edit text, media, links and other business content directly.
- Provide global controls for branding, including colors and fonts.
- Offer a small set of useful layout or style choices where they address a real need.
- Handle responsive behavior and most detailed spacing automatically.
- Use clear labels and consistent controls for similar tasks across widgets.

Choose controls by the customer task they support. For example, a welcome section may need a heading, introduction, image, button and a useful image-position choice. Exposing every padding, margin and breakpoint would pass the design work to the customer.

Design defaults to tolerate ordinary editing: longer headings, different images, cleared optional content, and added or reordered sections. Assess the editing experience as well as the visitor-facing result. A visually expressive theme can still have a simple editing model.

Arch can inform familiar editing interactions. Each theme's visual direction should follow its own brief.

## Connect to implementation

Use the companion `widgetizer-theme` skill, when available, for file structure, settings, Liquid, editor behavior and app validation. It owns those technical rules; avoid duplicating them here. Without it, consult the matching Widgetizer documentation before implementation.

Pass the established brief and editing choices into implementation without repeating discovery. In this repository, theme work belongs in `themes/<theme-id>/`, following the technical skill's workspace guidance. Structural validation and assessment of visual quality remain separate results.
