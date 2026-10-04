# Theme skills: working status

Updated 2026-10-04 after the owner moved the premium themes to the sibling folder and confirmed discovery works. All fourteen visual directions are accepted. This is a maintainer handoff, outside the portable skill folders.

## Resume here

**Current source location:** all fourteen premium theme folders are now in `C:/widgetizer-app/premium-themes/`, beside the Widgetizer checkout. The local `.env` sets `THEMES_EXTRA_ROOTS=C:/widgetizer-app/premium-themes`; the owner confirmed it works. Keep premium sources outside this public repository. For the collection themes, historical `themes/<name>/` source paths below now mean `../premium-themes/<name>/`; Arch remains in Widgetizer's `themes/` folder. Do not recreate duplicate premium sources in the app repository.

**Next-session housekeeping:** the app discovers the external folder, but development sync scripts and ignored preview helpers still need their source-path assumptions reviewed and adapted before rebuilding or syncing. Existing preview servers may continue serving their exported copies; an open preview does not prove its rebuild helper uses the new source location. The root collection notebook is no longer in this checkout. Its Google Drive destination/access has not yet been supplied; ask for the link when the notebook needs updating, without blocking independent theme work.

Mova is accepted after hero refinement: "Good. We keep it." Its preview is at `http://127.0.0.1:4191/`; the styleguide remains at `/styleguide.html`. Preserve the approved palette/fonts and photographic studio invitation with its practical first-class panel. The original hero was rejected as repetitive; distinct, visually coherent heroes are now an explicit requirement in the collection rules. Proposed cooking-school and art-school presets remain future work. Nerea is accepted: "Good. We keep it." Its preview remains at `http://127.0.0.1:4190/`, with additional presets unselected. All fourteen directions are accepted.

Molto is accepted ("We keep it"). Its preview is at `http://127.0.0.1:4189/`, with its styleguide at `/styleguide.html`. It reinterprets four owner-supplied screenshots of an earlier Molto pizza direction under the current collection rules. Nerea is the resulting resort exploration, also accepted. Accord's refined direction remains accepted: "Yeap. It's a pass." Preserve its square controls, grouped engagement section and professional character. Cabinet remains accepted as "fantastic" and "very close to my style," a strong reference for the author's taste. The refined Alder direction is also accepted; retain its lessons about balanced text and coherent grids. Suggested later guesthouse presets remain California and a remote Greek island. Panna's possible additional notes remain deferred.

The current exercise is to explore different niches up to a working homepage/styleguide preview, learn the author's preferences, and carry confirmed preferences into the collection rules. Full theme development comes later. A liked preview is not a completed reusable theme.

An owner-facing collection notebook was created as `WIDGETIZER-PREMIUM-THEMES.md` in the repository root on 2026-10-04. It records all fourteen explorations, their review status, shared decisions, preset candidates and the guesthouse plan. The owner has removed the root copy and will provide Google Drive folder access later; record the supplied destination when available. Premium themes now live in the sibling folder described above, which the owner may manage as a private Git repository. Do not move, upload or commit those themes on the owner's behalf without instruction.

Each retained exploration will become a theme with 2–3 presets showing different uses. The author clarified that related professions are welcome: Parla could serve both a foreign-language teacher and a piano teacher. Guesthouse presets could instead vary strongly by location and atmosphere. The shared theme should support these content and visual differences through its widgets and settings. Build one initial direction before expanding the presets. Collection rules record this strategy alongside layout variety, gentle reveals and Arch-style CSS organization.

The author also agreed to separate individual teachers from schools offering multiple classes. Keep Parla centered on one teacher, their approach, lesson goals and enquiries. A private dance instructor is a proposed third preset alongside the language and piano examples; a private cooking teacher may also fit this model. Mova now explores the school family through a contemporary dance school: class browsing, levels, teachers, schedules and first-visit information. Cooking and art schools remain proposed additional uses. Business needs determine the grouping.

## Decisions already made

- Keep both skills in this repository and make them useful to other theme authors. The technical and design skills have separate responsibilities and work together.
- Technical correctness belongs to the app-owned validator plus explicit import, editor, export and update checks. A skill cannot guarantee validity through instructions alone.
- The design skill develops the brief, uses selective questions and references (including screenshots), proposes a direction, and builds a responsive preview with a styleguide and representative layouts.
- Keep editing simple for owners who find other systems too complex. Content and branding should be easy to change; responsive layout and detailed spacing should mostly be handled by the theme.
- The author intends a collection of roughly 30–40 premium themes, with 2–3 presets per theme. Presets can span related professions with shared website needs, or very different settings within one industry; they need not stay in one exact niche. Each theme should have its own identity rather than resemble Arch.
- Keep the explored premium themes in the owner's sibling `premium-themes/` folder, connected through `THEMES_EXTRA_ROOTS`. They are excluded from Widgetizer commits; do not relocate or publish them on the owner's behalf.
- Add no new Core widgets for this collection. A shared pool of reusable theme widgets can grow from actual theme work; its packaging is not decided or implemented yet.
- Generate only the key images needed for an initial preview. The author will choose whether to supply or request the full image set when a theme develops further.

## What exists

| Component | Current state |
| --- | --- |
| `skills/widgetizer-theme/` | Technical workflow, focused references, a minimal working starter theme and generated `references/contract.json` |
| `scripts/build-theme-skill-contract.js` | Generates the app capability catalog; `--check` detects drift |
| `scripts/validate-theme.js` | App-owned static validation using the configured LiquidJS engine and Widgetizer rules |
| `packages/builder-server/src/tests/themeSkill.test.js` | Catalog freshness, starter import/project/export, Arch/preset validation and invalid-theme regression coverage |
| `skills/widgetizer-theme-design/` | Brief, reference handling, direction selection, responsive preview, imagery and simple editing guidance |
| `skills/theme-collections/widgetizer-premium.json` | Author-confirmed collection preferences, separate from portable guidance and platform validation |

The catalog lists supported names and selected metadata, including the app's available font stacks and weights; it is not the complete Liquid or runtime behavior specification. The validator uses current app source. No desktop validation UI or skill distribution package has been built.

## Explored directions

All fourteen directions are accepted and being kept, including Accord's two implemented refinements and Mova's revised hero. They remain local, uncommitted visual previews, deliberately excluded from the skill commit.

| Theme | Niche | Existing local preview |
| --- | --- | --- |
| Common | Coworking and shared spaces | `http://127.0.0.1:4178/` |
| Kiln | Ceramics studio | `http://127.0.0.1:4179/` |
| Margin | Independent bookshop | `http://127.0.0.1:4180/` |
| Afterhours | Small live music venue | `http://127.0.0.1:4181/` |
| Cove | Sea kayaking | `http://127.0.0.1:4182/` |
| Panna | Artisan gelateria | `http://127.0.0.1:4183/` |
| Sill | Architecture and interiors studio | `http://127.0.0.1:4184/` |
| Parla | Independent foreign-language teacher | `http://127.0.0.1:4185/` |
| Alder | Boutique guesthouse in the Alps | `http://127.0.0.1:4186/` |
| Cabinet | Small museum of everyday life | `http://127.0.0.1:4187/` |
| Accord | Independent B2B sales consultancy; accepted after refinement | `http://127.0.0.1:4188/` |
| Molto | Neighbourhood pizzeria; accepted | `http://127.0.0.1:4189/` |
| Nerea | Private Mediterranean luxury resort; accepted | `http://127.0.0.1:4190/` |
| Mova | Contemporary adult dance school; accepted after hero refinement | `http://127.0.0.1:4191/` |

Each has a `styleguide.html` preview. Servers may need restarting after the session; their existing helpers are under `tmp/<theme>-preview/`. These ignored local artifacts are useful evidence, not dependencies of the skills or files supplied by this commit.

## Panna: latest accepted refinement

Panna means cream in Italian. Preserve its warm cream, deep cherry and pistachio palette, Fraunces headings, DM Sans body, calm mood and photography.

- A full-image hero demonstrates both a transparent header and text over photography. The styleguide uses a solid header. The mobile hero has its own portrait image.
- The flavour menu now uses two columns on desktop, useful ingredient icons and fewer separator lines.
- Pricing sits in a quiet pistachio panel within the menu, alongside the seasonal photograph and story.
- The visit section has a more restrained headline and distinct location, opening-hours and contact groups. Day/time pairs stay close together.
- Lucide SVG icons identify location, hours, email, serving sizes and ingredient information. Written labels remain visible.
- The secondary action is an outlined button with a soft hover fill and visible keyboard focus. Text links have one underline; the former doubled underline is fixed.
- Theme validation reported zero errors/warnings. An isolated real theme upload, project creation and export passed. Homepage layouts were checked at 1280, 980, 390 and 320px; styleguide at 1280 and 390px. No horizontal overflow, missing images or browser warnings/errors were observed. Visible text stayed at least 14px.
- Full editor lifecycle, accessibility assessment, pages and presets remain pending. The fictional shop details, prices, hours and ingredient statements are demo content.

Local evidence and helpers: `tmp/panna-preview/brief.json`, `review.json`, `refinement-checks.json`, `image-prompts.json`, `render.mjs`, `serve.mjs`, and desktop/mobile captures. `before-refinement/` preserves the previous theme and screenshots. To rebuild the isolated preview from source, run `node tmp/panna-preview/render.mjs`; restart its server with `node tmp/panna-preview/serve.mjs` only if needed. Never sync over a real customer project.

## Sill: accepted visual direction

- Chalk, charcoal and muted blue, with Manrope headings and Inter body text. A solid header and a large headline above a wide project photograph provide a different opening from Panna's overlay hero.
- Three original generated photographs show fictional courtyard, residential and workspace projects. The staggered gallery gives the images different proportions and breathing room.
- Each gallery project has an expandable story with practical location, scope and floor-area details. Native disclosures work by mouse and keyboard; Lucide icons support written labels.
- A quiet studio section groups the approach, three services and an enquiry action. The compact styleguide demonstrates colors, typography, buttons and useful iconography.
- Theme validation reported zero errors/warnings. An isolated real theme upload, project creation and export passed. Homepage layouts were checked at 1280, 980, 390 and 320px; styleguide at 1280 and 390px. No horizontal overflow, missing images or browser warnings/errors were observed. Visible text stayed at least 14px. Mobile menu dismissal/anchors and button hover/focus were checked.
- Preview scope only: full project pages/collections, presets, editor lifecycle and accessibility assessment remain pending. Project names, locations, areas and descriptions are fictional; contact uses `hello@example.com`.

Source: `themes/sill/`. Local evidence and helpers: `tmp/sill-preview/brief.json`, `review.json`, `browser-checks.json`, `image-prompts.json`, `render.mjs`, `serve.mjs`, and desktop/mobile captures. Rebuild with `node tmp/sill-preview/render.mjs`; restart the standalone preview with `node tmp/sill-preview/serve.mjs` only if needed. Existing Common, Kiln, Margin, Afterhours, Cove and Panna sources were preserved. No new commit was requested for this exploration.

## Parla: accepted visual direction

- A fictional independent teacher, Elena, offering French and Italian to adults online. Outfit headings, DM Sans body, paper, aubergine, lavender and apricot. No fabricated qualifications, testimonials or success statistics; enquiry actions use `hello@example.com`.
- Layout experiments: an overlapping portrait/introduction/practice-card composition; a goal selector that changes the lesson information and sample phrase; a photograph and personal approach joined by an offset contact invitation. The French practice card reveals its meaning on request.
- The three editable goals are conversation, life abroad and a fresh start. Mouse and keyboard selection work; the layout becomes a vertical sequence on phones. The original seven theme directories remain unchanged.
- Shared tokens and base components live in `assets/base.css`. Each widget has its own uniquely named, enqueued CSS. Gentle reveals use a short fade and small upward movement, leave content visible without JavaScript, and skip animation for reduced-motion preferences, the theme's motion-off setting and editor design mode.
- Static validation and an isolated real upload/project/export passed. Browser review covered the homepage at 1280, 980, 390 and 320px, and styleguide at 1280 and 390px. No horizontal overflow or browser warnings/errors observed; all images loaded when scrolled into view, and visible text stayed at least 14px. Mobile menu, practice disclosure, goal switching, keyboard focus and secondary-button hover were checked.
- Eight local interaction checks passed in JSDOM: independent selector instances, keyboard navigation, widget replacement, editor block selection, arrival animation, added/removed reveal elements, motion-off modes and no-JavaScript content availability. Motion preferences/observers were simulated in this harness; this is not a complete editor or accessibility assessment.
- Still pending: complete pages, 2–3 presets (language and piano teachers are proposed uses), full editor lifecycle and accessibility assessment. This is an accepted visual exploration, not a finished production theme.

Source: `themes/parla/`. Helpers and evidence: `tmp/parla-preview/brief.json`, `review.json`, `browser-checks.json`, `interaction-checks.json`, `image-prompts.json`, `render.mjs`, `serve.mjs`, and captures. Rebuild with `node tmp/parla-preview/render.mjs`; start `node tmp/parla-preview/serve.mjs` only if the standalone preview is not already running. No commit requested for this exploration.

## Alder: accepted refined Alpine guesthouse

- Fir green, warm stone and old timber, with Lora headings and Manrope body text. Four original generated photographs portray a fictional house, two guest rooms and a village path.
- The opening uses a transparent header over a full landscape photograph. The refined headline has more width and a coordinated type scale, so the default copy reads as two complete phrases across the reviewed widths, without forced English line breaks. The styleguide has a solid header. A short welcome strip introduces the house and practical amenities.
- The room browser uses wide photograph-and-detail spreads, with the next room visible at the edge. Native horizontal scrolling, previous/next buttons and keyboard navigation let visitors browse manually. Each room has capacity, size, bed information, an expandable detail and a placeholder email enquiry.
- The author rejected the first dark-green village journal's scattered placement and arbitrary gaps. Its refinement has a centered introduction followed by a two-column grid: a tall photograph and one ordered stack of local moments. The stay invitation uses the same column edges, with its explanation, button and supporting note grouped together. Both grids stack naturally on smaller screens and grow with content. Lucide icons support useful details.
- Shared tokens and foundations live in `assets/base.css`; widgets enqueue their own CSS. Gentle reveals use the same progressive-enhancement and reduced-motion approach as Parla. Room scrolling becomes instant for reduced motion and editor block selection.
- Static validation reported no errors or warnings. An isolated real theme upload, project creation and export passed. Browser review covered homepage widths 1280, 980, 390 and 320px, plus the styleguide at 1280 and 390px. No document horizontal overflow or browser warnings/errors observed. Images loaded when brought into view; visible text stayed at least 14px and actions at least 16px. Mobile navigation, disclosures, room controls, keyboard focus and secondary hover were checked.
- Eight focused JSDOM checks covered independent room browsers, keyboard boundaries, nested controls, reduced-motion scrolling, replacement, editor block selection, changing block counts and content availability without JavaScript. Geometry and media preferences were simulated. Full editor lifecycle and accessibility assessment remain pending.
- All earlier eight theme directories were verified unchanged. No commit requested. Full pages and 2–3 presets come later; there is no live booking integration. House, rooms, capacities, dimensions and services are fictional demo content.
- Refinement checks covered headline wrapping and composition at desktop, intermediate and phone widths, plus local layout fixtures with Greek, German and longer English headings, paragraphs and action labels. These fixtures test content expansion; they are not complete translated presets or a full localization certification. Collection rules now explicitly cover balanced text wrapping and coherent content grids.

Source: `themes/alder/`. Evidence and helpers: `tmp/alder-preview/brief.json`, `review.json`, `refinement-checks.json`, `browser-checks.json`, `interaction-checks.json`, `image-prompts.json`, `render.mjs`, `serve.mjs`, and desktop/mobile captures. `before-refinement/` preserves the original source, captures and report. `make-layout-fixtures.mjs` creates ignored local content-expansion examples after rendering. Rebuild with `node tmp/alder-preview/render.mjs`; start `node tmp/alder-preview/serve.mjs` only if its standalone server is not already running. The author accepted the refinement after review; older preview reports may still describe their pre-acceptance state.

## Cabinet: accepted small-museum direction

The author called this direction "fantastic" and "very close to my style." This accepts the overall visual direction; it does not add a new universal design rule or approve the proposed future presets.

- Warm paper, soft blue, dark blue ink and a restrained rust accent; Source Serif 4 headings and Public Sans body text. Four generated photographs show a fictional museum gallery and a jug, radio and weaving shuttle. Museum details, object stories, prices, address and contact are illustrative demo content, not historical provenance.
- A split gallery opening pairs the invitation with a current-exhibition note. Longer opening titles use a smaller scale automatically. A quick-facts strip gives opening times and admission with meaningful Lucide icons.
- The collection uses three aligned object cards on wide screens, photograph-and-story rows on tablets, and a vertical sequence on phones. Native disclosures reveal each story independently and remain usable without JavaScript. Editor block selection opens only the corresponding object's story.
- The blue visit section groups its invitation, enquiry action and access guidance beside a paper board for opening hours, admission and directions. The grid stacks and grows with content; no fixed-height text boxes or decorative numbering.
- Shared tokens and foundations live in `assets/base.css`; each widget enqueues its own CSS. Gentle reveals reuse the progressive-enhancement approach from Alder, respecting reduced motion, motion-off settings and design mode. Lucide licensing is retained.
- Static validation reported no errors or warnings. An isolated real theme upload, project creation and export passed. Browser review covered homepage widths 1440, 1280, 980, 768, 390 and 320px, plus the styleguide at 1280 and 390px. No document horizontal overflow or browser warnings/errors observed; images loaded when brought into view. Visible secondary text stayed at least 14px, with navigation/actions at least 16px.
- Mobile navigation, Escape/anchor dismissal, native object disclosure by mouse/keyboard, secondary hover and keyboard focus were checked. Five focused JSDOM checks covered public-view isolation, scoped editor selection, replacement, non-element event targets and no-JavaScript story markup. They do not certify the full editor lifecycle.
- Ignored Greek and longer-English fixtures checked content expansion at desktop and phone widths. These are partial layout examples, not translated presets or full localization approval. All nine earlier theme directories were verified unchanged.
- Pending: complete pages, 2–3 presets, full editor lifecycle and accessibility assessment. Possible later settings include local history, craft collections and specialist museums; these are proposals, not agreed presets. No commit requested.

Source: `themes/cabinet/`. Evidence and helpers: `tmp/cabinet-preview/brief.json`, `review.json`, `browser-checks.json`, `interaction-checks.json`, `image-prompts.json`, `render.mjs`, `serve.mjs`, `make-layout-fixtures.mjs`, and desktop/mobile captures. Rebuild with `node tmp/cabinet-preview/render.mjs`; start `node tmp/cabinet-preview/serve.mjs` only if the standalone preview is not running. This is a working visual exploration, not a finished production theme.

## Accord: accepted B2B direction after refinement

The author liked the professional, strict, to-the-point character and accepted the refined preview on 2026-10-04: "Yeap. It's a pass." Their first feedback was recorded, then implemented on request:

- Choose rounded or square buttons and carry the decision through all actions and controls. Accord now uses square corners via a shared token on primary/secondary actions, the header action, mobile navigation button and service toggles.
- The engagement section does not make visual sense despite its aligned columns. In the supplied desktop screenshot, small labels sit apart from the heading, with a large empty area above the image. Recompose the introduction, image and story as a clear, balanced group. Shared grid edges alone do not establish visual coherence. Reference: `C:/Users/g_tsi/Documents/ShareX/Screenshots/2026-10/ChatGPT_HEh3WYhtJM.png`.

The revised section groups its eyebrow and heading above equal image/story columns. The photograph uses a wider 4:3 crop; the sector and illustrative-example label form its caption. Smaller screens use one continuous reading order. Long headings receive a smaller scale to avoid awkward wrapping. The refinement was inspected at desktop, intermediate and phone widths, including expanded English and Greek content; no horizontal overflow was observed. Button radii were checked on the homepage and styleguide, and mobile-menu Escape dismissal and service keyboard operation still work. Static validation and isolated import/project/export passed again. Evidence: `tmp/accord-preview/refinement-checks.json` and `refined-engagement-desktop.jpg`. These implementation checks do not constitute author acceptance or full lifecycle/accessibility approval.

- Warm white, deep navy, soft blue and muted apricot; Plus Jakarta Sans 600 headings and Inter 400 body. Two original generated photographs show a consulting session and an engineering-business setting.
- The compact opening pairs headline and introduction above a photograph and practical partnership panel. Tablet layouts give the photograph more width to retain the people in the frame. Longer opening titles use a smaller scale automatically.
- Three service rows reveal the offer, approach and deliverables through native disclosures. The first starts open; visitors can open more than one. Details work without JavaScript; editor block selection reveals only the matching service in the selected widget.
- The engagement study now has one introduction above a balanced image/story grid. It is clearly marked as a fictional illustrative example, without fabricated client names, testimonials or numerical results. Working principles lead to a navy contact panel with an apricot action.
- Shared tokens and foundations, per-widget CSS, Lucide icons/licensing and the established progressive reveal runtime are retained. No new Core widgets or app changes.
- App validation reported no errors/warnings. An isolated real theme upload, project creation and export passed. Browser review covered homepage widths 1440, 1280, 980, 768, 390 and 320px, plus styleguide widths 1280 and 390px. No document horizontal overflow or browser warnings/errors observed; photographs loaded when brought into view. Secondary text stayed at least 14px; body, navigation and actions at least 16px.
- Native disclosures, keyboard operation, mobile menu dismissal/anchors, secondary hover and focus were checked. Five focused JSDOM checks cover public-view isolation, scoped editor selection, replacement, non-element event targets and no-JavaScript content. Partial Greek and longer-English fixtures check layout expansion; they are not translated presets or complete language approval.
- The prior ten theme directories were verified unchanged. Proposed later presets: operations consulting and business strategy. The author accepted the implemented refinements. Pending: full pages/preset set, full editor lifecycle and accessibility assessment. No commit requested.

Source: `themes/accord/`. Evidence and helpers: `tmp/accord-preview/brief.json`, `review.json`, `browser-checks.json`, `interaction-checks.json`, `image-prompts.json`, `render.mjs`, `serve.mjs`, `make-layout-fixtures.mjs`, and captures. Rebuild with `node tmp/accord-preview/render.mjs`; start `node tmp/accord-preview/serve.mjs` only if its standalone server is not running. The owner-facing root notebook records acceptance of the refined direction. Earlier preview reports may still describe their pre-acceptance state.

## Molto: accepted visual exploration

- Based on the owner's four earlier Molto screenshots. Retains bold condensed typography, food-led photography and the chalk/red/green/blue palette while applying current collection rules. Anton headings and DM Sans body; natural-case stored text with English-only heading casing and a Greek font/case fallback.
- Transparent homepage header and solid styleguide header. The opening has two grouped actions and a practical strip for hours, location and dining options. Two original generated photographs cover the pizza hero and oven story; tablet cropping protects the pizza subject.
- Category filters browse six pizzas, two small plates and two drinks. Public view starts with pizza; all items remain available without JavaScript. Desktop uses two menu columns, phones one; mobile filters form a balanced two-by-two grid. No decorative numbering or redundant item separator lines.
- The green story is a coherent photograph/text pair. Blue working principles use useful wheat, leaf and flame icons in aligned columns. Visit information groups address and hours beside an email-enquiry panel; day/time pairs stack at narrow widths.
- Shared tokens and per-widget CSS, consistently square controls, Lucide licensing and gentle progressive reveals. Focus outlines retain contrast on light and dark sections. Narrow and long headings were refined after visual inspection; translated samples retain Greek accents.
- Static validation and isolated upload/project creation/export passed. Browser review covered desktop, tablet and 390/320px phone layouts, styleguide desktop/mobile, menu clicks/keyboard, mobile navigation, and secondary-button hover/focus. Partial Greek and expanded-English fixtures are layout samples, not completed translations. Six focused JSDOM checks cover per-widget filter isolation, editor selection, replacement, unexpected event targets and no-JavaScript content.
- Author accepted the direction on 4 October 2026: "We keep it." Additional presets are unselected. Full pages, preset sets, complete editor lifecycle and accessibility assessment remain pending. Restaurant details, prices and hours are fictional; the booking link is an enquiry to `hello@example.com`, not a reservation integration. No commit requested.

Source: `themes/molto/`. Local evidence/helpers: `tmp/molto-preview/brief.json`, `review.json`, `browser-checks.json`, `interaction-checks.json`, `image-prompts.json`, `render.mjs`, `serve.mjs`, `make-layout-fixtures.mjs` and captures. Rebuild with `node tmp/molto-preview/render.mjs`; start the standalone server only if needed. The earlier eleven theme sources were preserved. The root collection notebook records Molto as accepted.

## Nerea: accepted visual exploration

- Authorized as a super elegant, expensive resort theme. Fictional private Mediterranean setting; distinct from Alder's guesthouse family. Warm ivory, limestone, bronze brown and deep umber, with Bodoni Moda 400 and Jost 400.
- Centered wordmark/header composition and panoramic opening, followed by a centered introduction, a suite image/detail grid, wide dining image with three aligned experience groups, and a composed personal enquiry section. No ornamental numbering, badges or subtitle markers; consistent square controls and licensed Lucide icons.
- Three original generated photographs cover the coast/pool, suite and dining terrace. Source assets are inside the theme. The suite photograph's desktop proportions were refined to balance the adjacent content. Phone layouts retain useful image crops and a continuous reading order.
- Native suite disclosures work with mouse, keyboard and no JavaScript. The delegated editor-selection handler opens the matching detail only within its widget. Five focused JSDOM checks cover public isolation, instance isolation, replacement, unexpected targets/missing IDs and no-JavaScript markup; full editor lifecycle is still pending.
- Shared CSS tokens and per-widget styles, progressive gentle reveals and reduced-motion support. Long hero and section headings use a smaller scale; phone text shapes were visually inspected and refined. Partial Greek samples use a serif fallback, preserve accents and avoid English uppercase treatment.
- Static validation and isolated upload/project creation/export passed. Browser checks covered desktop, tablet and 390/320px widths, homepage/styleguide, longer English and partial Greek samples, mobile navigation, native disclosures and secondary hover/focus. Minimum observed visible text was 14px; primary body/navigation/actions are at least 16px. These are preview checks, not a completed accessibility or localization assessment.
- Accepted by the author on 4 October 2026: "Good. We keep it." Additional presets, full pages, editor lifecycle and accessibility assessment remain pending. Accommodation, services and season are fictional. Contact is an email enquiry to `hello@example.com`, with no live reservation integration. Earlier twelve theme sources were preserved; no commit requested.

Source: `themes/nerea/`. Evidence and helpers: `tmp/nerea-preview/brief.json`, `review.json`, `browser-checks.json`, `interaction-checks.json`, `image-prompts.json`, `render.mjs`, `serve.mjs`, `make-layout-fixtures.mjs` and captures. Rebuild with `node tmp/nerea-preview/render.mjs`; start the standalone preview server only if needed. Content research references are recorded in the brief; no existing resort's design or brand assets were copied.

## Mova: accepted school exploration after hero refinement

- Authorized contemporary dance-school exploration, separate from Parla's individual-teacher family. Deep aubergine, warm ivory, soft lilac and pale citron; Syne 500 and Manrope 400; consistently rounded controls.
- Revised opening: a movement photograph with its title inside the image, adjoining an aubergine first-class panel with Foundations introduction, duration, audience and linked actions. The owner rejected the original heading-above-photo composition while approving its palette and typography. The rest remains three class comparison cards, a three-day timetable, a studio/team introduction and first-visit questions. Two original generated photos, licensed Lucide icons and gentle progressive reveals.
- Class cards and days are reorderable blocks. Sessions use a table setting within each teaching-day block, keeping time, class, level and teacher together. No booking integration or filtering system; enquiry links use `hello@example.com`. School, staff and timetable are fictional.
- Shared CSS tokens and per-widget styles. Refined class-title scaling at narrow phone widths and preserved natural Greek casing/accents. Main text is at least 16px; short metadata at least 14px.
- Static validation and isolated upload/project creation/export passed. Desktop, intermediate, 390/320px phone views, styleguide, longer English and partial Greek layouts inspected. Mobile menu, Escape, native disclosure click/keyboard behavior and visible focus checked. Five focused JSDOM checks cover disclosure editor-selection isolation and replacement; full editor lifecycle remains pending.
- Author accepted the revised hero on 2026-10-04: "Good. We keep it." Cooking/art school presets, full pages, accessibility and comprehensive localization remain future work. Earlier thirteen theme sources were preserved. No commit requested.

Source: `themes/mova/`. Evidence/helpers: `tmp/mova-preview/brief.json`, `review.json`, `browser-checks.json`, `interaction-checks.json`, `image-prompts.json`, `render.mjs`, `serve.mjs`, `make-layout-fixtures.mjs` and captures. Rebuild with `node tmp/mova-preview/render.mjs`; start its standalone server only if needed. The initial build helper must not be rerun over existing source. Content references are in the brief; no existing school's design or imagery was copied.

## Preferences to carry forward

The maintained source is `theme-collections/widgetizer-premium.json`. Key points from the reviews:

- Calm, clear, detailed and visibly premium. A good palette, font pairing and hero are only the start; the whole page needs considered composition and interaction states.
- Explore meaningfully different compositions and widget layouts, guided by each niche's content and visitor goals. New colors and fonts alone are not enough variety. Keep accepted themes and use their later 2–3 presets to show different uses within their design systems.
- A distinct hero is imperative for each new exploration, as far as the content allows. Compare against earlier collection heroes before implementation and record the closest precedent plus a useful compositional difference in the brief. Review image/text relationships, hierarchy, crops and mobile/translated copy. Visual coherence takes priority over forced novelty; changing fonts and colors alone is insufficient. Mova's rejected initial hero is the concrete lesson.
- Natural-case text by default. Uppercase labels only for verified languages; Greek keeps natural casing and accents.
- No decorative subtitle dots, bullets, numbers, dashes or em dashes. No decorative numbering in captions or sections.
- Use actual open-source SVG icons with consistent treatment and retained licensing. Use meaningful icons more often for practical content; avoid automatic repeated button arrows and unrelated decorative symbols.
- Choose one button shape per theme, rounded or square, and apply it across actions and controls through a shared token. Do not mix the two treatments.
- Give a heading one consistent typographic/color treatment unless a mixed treatment makes a specific meaningful contribution. Kiln's second line no longer uses decorative italics and a different color.
- Inspect the actual shape of text across viewport sizes and longer or translated content. Avoid isolated words and awkward line lengths; fitting inside the viewport and using CSS text balancing are insufficient visual checks.
- Use coherent grids with logical reading order, shared alignment edges, deliberate proportions and consistent gaps. Group explanations with their actions and notes. Labels, headings, imagery and body copy must form clear visual groups; Accord demonstrated that matching column edges alone is insufficient. Asymmetry and layout variety must serve the content; reject scattered placement and arbitrary whitespace.
- Body/navigation/actions/forms at least 16px; short secondary labels/captions at least 14px, including mobile. Larger text when the font needs it. Review Common, Kiln, Margin and Afterhours against these floors during full development; no retroactive cleanup solely for this rule now.
- Use lines intentionally. Avoid redundant stacked borders; grouping, spacing and alignment can establish relationships.
- Give practical information clear hierarchy, and check normal, hover and keyboard-focus states together.
- Explore transparent headers and text-on-image heroes as independent reusable choices. Overlay headers require a compatible first widget; other pages need a readable solid header.
- Introduce gentle reveals with restrained motion and timing. Respect reduced-motion preferences, keep content available without animation, and handle editor re-renders. Consider in subsequent previews and carry into full development.
- During full theme development, follow Arch's CSS organization: shared design tokens, common foundations and scoped CSS per widget. Use Arch as the implementation reference while retaining each theme's visual identity. Refactor the existing previews at that stage.

Older proposal notes in `docs-llms/future-skills-theme.md` include historical preferences and unresolved distribution ideas. Do not use those to override the collection's current rules or the author's accepted cream-based directions.

## Skill commit scope and checks

The skill checkpoint includes the two skills, starter/catalog, collection rules, maintainer documentation, validator/generator, and directly supporting app exports and tests. The render-engine change exposes the same configured Liquid dialect to tooling; the collection change exposes existing structured-data rules; the export-test change isolates its temporary Core widget so concurrent catalog checks stay reliable. Theme directories and ignored preview assets are excluded.

Before the checkpoint, 204 targeted tests passed across theme-skill validation, export, rendering, collection rendering and collection services. Catalog freshness and the starter import/project/export flow are covered by those tests. This does not certify the explored themes' full editor lifecycle.

The skill checkpoint was committed as `3bebc423bdf097576f9b9f4021beb4193d29fb36` (`Add theme authoring and design skills with app validation`); it was not pushed.

On 2026-10-04 the owner authorized a follow-up progress commit containing only `skills/STATUS.md` and `skills/theme-collections/widgetizer-premium.json`. Commit `c25c2219` records all fourteen accepted directions and the accumulated collection rules. The root notebook, theme folders and ignored preview evidence were excluded. The owner subsequently authorized committing the sibling-folder handoff update and pushing the current branch, including the earlier skill checkpoints.

Next step: choose the next exploration with the author, adapting the relevant development/preview paths to the sibling folder before use. All fourteen directions are accepted; Cabinet remains a strong match for the author's taste. Defer complete preset sets and full lifecycle checks until theme development.
