# Theme skills: working status

Updated 2026-10-09. This is the maintainer handoff for the reusable skills and app-owned authoring tools. It is outside the portable skill folders.

## Where to continue

- **Skill and tooling work:** use this file and [README.md](README.md).
- **Premium collection planning and theme progress:** use `WIDGETIZER-PREMIUM-THEMES.md` in the private theme repository. In the maintainer's sibling checkout, it is [here](../../premium-themes/WIDGETIZER-PREMIUM-THEMES.md). Acceptance, preset ideas, review feedback and theme-specific implementation evidence are maintained there, rather than duplicated here or in Google Drive.
- **Confirmed collection design rules:** use [widgetizer-premium.json](theme-collections/widgetizer-premium.json). These preferences stay separate from portable skills and platform validation.

The collection notebook and theme sources belong together in the private repository. The reusable skills and app tooling remain in Widgetizer's public repository.

## What exists

| Component | Current state |
| --- | --- |
| [Technical skill](widgetizer-theme/SKILL.md) | Authoring workflow, focused references, a minimal working starter and generated capability catalog |
| [Design skill](widgetizer-theme-design/SKILL.md) | Brief, clarification of unresolved character choices, reference handling, direction selection, responsive preview/styleguide with character review, imagery and simple editing guidance |
| [Catalog generator](../scripts/build-theme-skill-contract.js) | Generates `contract.json` from the app; `--check` detects drift |
| [App-owned validator](../scripts/validate-theme.js) | Static validation using the app's configured LiquidJS engine and Widgetizer rules |
| [Theme-skill tests](../packages/builder-server/src/tests/themeSkill.test.js) | Catalog freshness, starter import/project/export, Arch/preset validation and invalid-theme regression coverage |

The catalog records supported names and selected metadata, including available font stacks and weights. It is not the complete runtime behavior specification. Static validation, actual rendering, editor behavior, export/update preservation and visual assessment remain distinct checks.

## Established boundaries

- Keep the technical and design skills portable and useful to other theme authors. They have separate responsibilities and work together.
- Keep author-specific collection preferences in the collection rules, not in platform validation or universal design requirements.
- Let each exploration's intended character guide its composition and motion. The premium collection supports forceful as well as restrained directions; accepted explorations retain their established character.
- Keep editing simple: content and branding should be easy to change; themes should handle most responsive layout and detailed spacing.
- Grow reusable theme-widget patterns from actual work. No new Core widgets are planned for the premium collection; packaging a shared pool remains undecided.
- App discovery supports external source roots through `THEMES_EXTRA_ROOTS`. The development sync scripts still construct their source paths under the app checkout's `themes/` folder. Review that assumption before syncing an external theme; collection-specific setup and preview notes belong in its repository.

## Remaining skill and tooling work

- Develop curated design examples and quality criteria for completed reusable themes, beyond the initial responsive preview guidance. Add a contrasting forceful example after an actual exploration is accepted.
- Exercise the skills through full theme development and presets; retain findings that improve general guidance while keeping individual-theme progress in its notebook.
- Finish the desktop-user workflow: data locations, safe sync into a test project and validation access. There is no desktop validation UI yet.
- Decide and build distribution/packaging. The skills are not published as a standalone package. Historical proposals are in [future-skills-theme.md](../docs-llms/future-skills-theme.md); verify third-party platform details before using them for distribution work.

## Verification and checkpoint history

On 2026-10-09, the design skill gained explicit character selection, clarification before preview work when that choice is unresolved and not delegated, and whole-preview review against the recorded character. Premium rules now support restrained through forceful directions and motion suited to each theme. The collection notebook's shared preferences were aligned without changing accepted theme directions.

Claude reviewed the wording and expected responses to vague versus explicitly delegated business-theme prompts. Its three refinements were incorporated, and the final review found no substantive issues. Skill metadata validation, collection JSON parsing, catalog freshness and diff checks passed; catalog regeneration produced no changes. This was an instruction review, not a new visual exploration or an application test run. The next practical check is to use the revised skills for a real exploration and retain accepted design evidence.

The original skill/tooling checkpoint recorded 204 passing targeted tests across theme-skill validation, export, rendering, collection rendering and collection services. Those included catalog freshness and the starter's real import/project/export flow. This is historical evidence; the documentation cleanup did not rerun application tests or certify any theme's full editor lifecycle.

The implementation checkpoint `3bebc423`, collection-rule checkpoint `c25c2219` and external-source handoff `180fe961` are present in the tracked `origin/0.9.10` history checked on 2026-10-05. The earlier “not pushed” note is superseded. Premium theme sources are maintained separately.

When tooling or platform behavior changes, update the matching skill reference and regenerate its catalog as described in [README.md](README.md).
