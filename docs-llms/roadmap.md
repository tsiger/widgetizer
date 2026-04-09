# Roadmap

This file now focuses on the remaining release decisions rather than preserving the full history of completed cleanup work.

## `v1` Verdict

Widgetizer looks good enough to release from an architecture and code-health perspective.

The remaining risk is mostly verification risk, not "we still need another major refactor" risk.

That means:

- **Architecture verdict:** good enough for `v1`
- **Release verdict:** ship after a focused manual validation pass
- **Not worth doing before `v1`:** another broad structural cleanup just because there is time

## Must Verify Before Release

- Verify that project switching cannot show, save, preview, export, or otherwise operate on data from the wrong project.
- Manually test the highest-risk flows while switching projects mid-action:
  - page editor
  - theme settings
  - preview
  - media
  - export
  - any autosave behavior
- Make sure import/export works on real projects, not just happy-path local test data.
- Verify packaged Electron startup on a clean machine:
  - first launch
  - data directory creation
  - default project behavior
  - recovery when local app data already exists
- Test upgrade safety for local users:
  - opening an older local project
  - importing an older exported project
  - preserving data/settings across app version changes
- Make sure the installer/update path is predictable on the target OSes you plan to support first, especially Windows if that is the primary release target.
- Add a short "known limitations" section to the README if any project-switch edge cases, import caveats, or platform-specific issues still exist.

## Good Enough To Ship

- Current folder structure and app boundaries are good enough for public release.
- Hybrid storage is a reasonable and understandable choice for contributors.
- The theme system is ambitious but coherent enough for others to explore and extend.
- Existing docs and tests are already above the bar for many first open-source desktop releases.
- Localized fixes are acceptable for `v1` as long as behavior is stable and data is safe.
- For a single-user local desktop app, the remaining lack of fully centralized project-switch orchestration is more of a maintainability problem than a release blocker.

## Best Use Of Extra Time

If there is still time before release, the most valuable remaining work is:

1. Expand regression coverage specifically around project switching and stale async completions.
2. Add a small project-scoped boundary so project switches remount or reset more project-owned UI centrally.
3. Consolidate more project-switch cleanup into one orchestration path instead of relying on scattered component/store resets.

## Save For After `v1`

- Moving more project-scoped fetching/caching to a stronger central data layer, if project-scoped state still feels painful after release.
- Any broader architectural cleanup that does not directly improve release safety.

## Deferred TypeScript Prep

TypeScript preparation is intentionally not active right now.

If it comes back later, start with:

- defining shared response/domain types
- tightening object-shape consistency across controllers, queries, and stores
- expanding useful JSDoc coverage

Do not start with a direct conversion push.
