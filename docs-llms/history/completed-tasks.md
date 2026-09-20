# Completed task records

This is history, not a work queue. Original section numbers remain retired.
For old bodies use `git show <Body at>:docs-llms/TODO.md`; the path is historical, not a live link.
The pre-cleanup snapshot is `f10e20ce`.

## Original completed records

| # | Item | Closed | Fix | Body at |
|---|------|--------|-----|---------|
| 1 | Relative preview asset URLs (robustness) | ✅ DONE 2026-07-01 | `8ca0d79f` | `efc6e957` |
| 2 | Bundled theme updates on the OSS desktop app (product/design decision) | ❌ WONTFIX 2026-06-27 | `87d2246e` | `efc6e957` |
| 3 | Modernize pre-refactor `src/...` / `server/...` paths in `docs-llms/*` (docs hygiene) | ✅ DONE 2026-06-26 | `2ddc2ef6` | `efc6e957` |
| 5 | Consolidate preview-dispatch logic (route-mapping half) | ✅ DONE 2026-06-25 | `10e33449` | `efc6e957` |
| 6 | Narrow-sidebar icon-grid + color-picker visual review | ✅ DONE 2026-06-26 | `3028aae3` | `efc6e957` |
| 7 | Missed port — theme-upload collection-schema gate not wired (`builder-server`) | ✅ DONE 2026-06-25 | `2ff036d7` | `efc6e957` |
| 8 | Missed port — `pageController` doesn't thread `projectId` into `cleanupDeletedPageReferences` (`builder-server`) | ✅ DONE 2026-06-25 | `618e4458` | `efc6e957` |
| 9 | Missed port — `Media.jsx` doesn't seed collection-item usage titles (`editor-ui`) | ✅ DONE 2026-06-25 | `8d1e22a4` | `efc6e957` |
| 10 | Missed port (tests only) — `createCollectionPreviewToken` guard tests (`builder-server`) | ✅ DONE 2026-06-26 | `ff0d0186` | `efc6e957` |
| 11 | Missed port — link-picker Combobox group headers not rendered (`editor-ui`) | ✅ DONE 2026-06-26 | `52c07216` | `efc6e957` |
| 12 | Missed port — richtext-embedded media not tracked as used (`builder-server`) | ✅ DONE 2026-06-26 | `0059c214` | `efc6e957` |
| 13 | Missed port — `theme:update-delta` release tool not ported (OSS dev tooling) | ✅ DONE 2026-06-26 | `4e129603` | `efc6e957` |
| 14 | Documentation port audit — content gaps from the master-commit doc changes | ✅ DONE 2026-06-27 | `87d2246e` | `efc6e957` |
| 15 | Missed port — collection item pages leak the `page-{slug}` body class (`render-engine`) | ✅ DONE 2026-06-26 | `4da0d2c0` | `efc6e957` |
| 16 | Missed port — `refreshAllMediaUsage` aborts early on a project with no pages dir (`builder-server`) | ✅ DONE 2026-06-26 | `9092e617` | `efc6e957` |
| 18 | Missed port (tests only) — depth-1 render smoke + depth-0 no-leak guard not ported (`builder-server`) | ✅ DONE 2026-06-26 | `01c9c393` | `efc6e957` |
| 19 | Missed port (tests only) — `renderCollectionItemPage` contract test not ported (`builder-server`) | ✅ DONE 2026-06-26 | `bfde3b9e` | `efc6e957` |
| 20 | Stale test comment — claims `remapCollectionItem{Link,Menu}Refs` "NOT ported" when they are (`builder-server`) | ✅ DONE 2026-06-26 | `cfd8678b` | `efc6e957` |
| 21 | Dedup the cross-bundle `getStandalonePreviewTarget` copy + drop its dead `editor-ui` export (`editor-ui` + OSS preview runtime) | ✅ DONE 2026-06-26 | `b73d237e` | `efc6e957` |
| 22 | Gate collection schemas on the theme **update-import** path too (`builder-server`) | ✅ DONE 2026-06-27 | `1c831b4b` | `efc6e957` |
| 23 | Widget-catalog enumeration logs spurious "Failed to parse schema" warnings (`builder-server`) | ✅ DONE 2026-06-26 | `1fdc361c` | `efc6e957` |
| 24 | Missed port (defensive) — `updatePageWidgets` lacks the `pagesDir` existence guard (`builder-server`) | ✅ DONE 2026-06-26 | `1fdc361c` | `efc6e957` |
| 25 | Decide whether to anchor `EMBEDDED_MEDIA_PATH_RE` so foreign URLs don't mark local assets "used" (`builder-server`) | ✅ RESOLVED 2026-06-26 | `6038ffff` | `efc6e957` |
| 26 | Extract the shared dropdown `<ul>` from `ui/Combobox` + `MenuCombobox` instead of the copy-pasted group header (`editor-ui`) | ✅ DONE 2026-06-26 | `8d3ba978` | `efc6e957` |
| 27 | Harden the `theme:update-delta` dev tool — version-tag parsing, quoted diff paths, util reuse (OSS dev tooling) | ✅ DONE 2026-06-27 | `e05d9c58` | `efc6e957` |
| 28 | Close the path-based storage exceptions for the hosted boundary (adapter discipline) | ✅ DONE 2026-07-02 | `e52dfe06` | `efc6e957` |
| 29 | Loud stale-active-project detection in the OSS editor | ✅ DONE 2026-07-07 | `5a792416` | `efc6e957` |
| 31 | Theme save doesn't track theme media usage (embedding-host-facing; fixed in `builder-server`) | ✅ DONE 2026-07-02 | `5996a17b` | `efc6e957` |
| 34 | `copyThemeToProject` exclude-filter widened from dirs to entries (`builder-server`) | ✅ DONE 2026-07-07 | `36d081d7` | `efc6e957` |
| 35 | Create-from-preset + Refresh Usage don't track media usage (embedding-host-facing; fixed in `builder-server`) | ✅ DONE 2026-07-02 | `cae73b17` | `efc6e957` |
| 36 | Cold-boot race bounces the editor to the picker on an aborted active-project fetch (`editor-ui`) | ✅ DONE 2026-07-07 | `2e0dc1c9` | `efc6e957` |
| 37 | `EmptyState.jsx` renders unstyled — `empty-state*` classes have no matching CSS (`editor-ui`) | ✅ DONE 2026-08-23 | `9279c720` | `9279c720` |
| 40 | OSS mounts allow-all `cors()` on the unauthenticated localhost API (`builder-server`) | ✅ DONE 2026-08-23 | `9279c720` | `9279c720` |
| 42 | Media upload allowlist trusts the client-declared MIME while serve derives Content-Type from the stored extension (`builder-server`) | ✅ DONE 2026-08-23 | `bef9e9ec` | `9279c720` |
| 45 | Dead code — empty branch in `mergeSettingsArray` (`builder-server`) | ✅ DONE 2026-08-23 | `9279c720` | `9279c720` |
| 46 | `buildLatestSnapshot` rebuilds `latest/` non-atomically (`builder-server`) | ✅ DONE 2026-08-23 | `d9c9a8bb` | `9279c720` |
| 48 | Unmerged `list-button` branch — SplitButton feature + independent `saveStore` fixes (`editor-ui`) | ✅ RESOLVED 2026-08-22 | `4bd1509a`, `d2a50a85` | `d2a50a85` |
| 50 | Structure-only undo/redo doesn't re-arm the autosave timer (`editor-ui`) | ✅ DONE 2026-08-23 | `d61ab806` | `9279c720` |
| 55 | Vitest setup lacks an i18n instance so provider-less component tests warn (`editor-ui` tests) | ✅ DONE 2026-08-23 | `9279c720` | `9279c720` |
| 56 | `EditorShell`/`PluginProvider` default-param object/array literals defeat memoization for a non-memoizing caller (`editor-ui`) | ✅ DONE 2026-08-23 | `9279c720` | `9279c720` |
| 59 | `getCachedThemeValue` — an in-flight loader can repopulate an invalidated cache entry (`builder-server`) | ✅ DONE 2026-08-23 | `d9c9a8bb` | `9279c720` |
| 60 | `layerThemeSnapshot` swallows per-update apply errors, so a partial snapshot can be promoted (`builder-server`) | ✅ DONE 2026-08-23 | `d9c9a8bb` | `9279c720` |

## Retired during the documentation cleanup

| ID | Outcome | Fix / evidence | Body at |
| --- | --- | --- | --- |
| T51 | Queued manual saves retain their error behaviour | `e209a8cc1` | `f10e20ce` |
| T52 | Re-entrant save observes the installed guard | `e209a8cc1` | `f10e20ce` |
| T62 | Packaged export operations serialize per project | `720e47df8` | `f10e20ce` |
| T68 | Consistent site-address joining | `b2783af4` | `f10e20ce` |
| T65 | Typed URLs remain authored; theme links use page_url/item_url | Groundwork and language fix `d0442659`; current Arch header uses page_url | `f10e20ce` |
| T75 | Domain review completed; documentation/task separation performed | R1–R8 and both walkthroughs recorded in domain coverage; this documentation cleanup | `f10e20ce` |
| T39 (partial) | Transaction fixes completed; only historical §39h remains deferred | Original body records 39a–g and 39i done; mediaInsertAtomicity/transactionBoundaries suites | `f10e20ce` |
| GH121 | Icon search marked completed on GitHub | [Issue #121](https://github.com/tsiger/widgetizer/issues/121), closed 2026-08-06 | GitHub issue |
| GH132 | Widget shortcuts marked completed on GitHub | [Issue #132](https://github.com/tsiger/widgetizer/issues/132), closed 2026-08-06 | GitHub issue |

## Reconciliation decisions

- GitHub #115, #122, #126, #133, #134 and #135 have implementation evidence. Their remaining local entries are review/documentation/integration work, not instructions to rebuild the features. GitHub statuses were left unchanged.
- R1/R2/R6/R8 structural coordination is one deferred boundary, not four tasks. R5 nested references and shared traversal are one conditional task.
- Accepted behaviour is documented in domain pages: manual URLs remain authored, unknown imported media may remain missing, failed cleanup can leave dead references, theme update version recording is outside file rollback, and restart/cross-process limits are explicit.
- R3's regression-test discipline is a working constraint, not a new product feature. Optional audit suggestions remain conditional rather than becoming launch requirements.
- Old private-deployment details were not copied into the new task descriptions. Embedding tasks describe only public package contracts; results for a private application belong in its own documentation.
