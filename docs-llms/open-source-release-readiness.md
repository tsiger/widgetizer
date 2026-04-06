## Release checklist

### Fix before release

- Verify that project switching cannot show, save, preview, export, or otherwise operate on data from the wrong project.
- Manually test the highest-risk flows while switching projects mid-action: page editor, theme settings, preview, media, export, and any autosave behavior.
- Make sure import/export works on real projects, not just happy-path local test data.
- Verify packaged Electron startup on a clean machine: first launch, data directory creation, default project behavior, and recovery when local app data already exists.
- Test upgrade safety for local users: opening an older local project, importing an older exported project, and preserving data/settings across app version changes.
- Make sure the installer/update path is predictable on the target OSes you plan to support first, especially Windows if that is the primary release target.
- Add a short "known limitations" section to the README if any project-switch edge cases, import caveats, or platform-specific issues still exist.

### Ship now

- Current folder structure and app boundaries are good enough for public release.
- Hybrid storage choice is reasonable and understandable for contributors.
- Theme system is ambitious but coherent enough for others to explore and extend.
- Existing docs and tests are already above the bar for many first open-source desktop releases.
- Localized fixes are acceptable for `v1` as long as behavior is stable and data is safe.
- For a single-user local desktop app, lack of centralized project-switch orchestration is more of a maintainability problem than a release blocker.

### Can wait until `v1.1`

- Introduce a proper project-scoped boundary so a project switch remounts or resets project-owned UI more centrally.
- Consolidate project-switch cleanup into a single orchestration layer instead of scattered component/store fixes.
- Standardize async request protection with one shared pattern instead of ad hoc stale guards.
- Expand regression coverage specifically around project switching and stale async completions.
- Consider moving more project-scoped fetching/caching to a stronger central data layer if that still feels painful after release.
