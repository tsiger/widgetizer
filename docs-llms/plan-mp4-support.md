# MP4 support implementation plan

Add uploaded MP4 playback for site pages, including upload, selection, saved references, editor and standalone preview, and static export. Reuse the existing media library and file-asset pipeline.

Prepared on **2026-10-07** against **`f14cd33b`** on **`feature/mp4-support`**, branched from and updated to **`0.9.10`**. The audit is complete; implementation has not started. The eventual integration target is `0.9.10`. Retire this temporary plan after the feature ships and its behaviour is documented in the permanent references.

## What exists and what is missing

| Stage | Current behaviour | Required work |
| --- | --- | --- |
| Upload validation | [Server MIME helpers](../packages/builder-server/src/utils/mimeTypes.js) reject both `.mp4` and `video/mp4`. [Client accept lists](../packages/editor-ui/src/utils/uploadValidation.js) omit them too. | Add MP4 to both sides while retaining extension/MIME agreement. |
| Response content type | [Shared MIME map](../packages/core/src/utils/mimeTypes.js) returns `application/octet-stream` for `.mp4`. | Map `.mp4` to `video/mp4`; server and local asset adapter already consume this map. |
| Storage and metadata | [Media controller](../packages/builder-server/src/controllers/mediaController.js) classifies non-images as `file`, stores them under `/uploads/files/`, and skips image processing. | Use this path unchanged. No new media category, directory, database table or migration is needed for new uploads. |
| Upload size | Server has an adapter-driven streaming cap and an app-setting post-buffer check. OSS defaults to 50 MB; the controller fallback without a finite adapter cap is 10 MB. The [shared upload hook](../packages/editor-ui/src/hooks/useMediaUpload.js) incorrectly passes `maxImageMB` to a validator that expects `maxSizeMB`. | Fix that option name and cover the hook's early rejection. Preserve existing server limits; do not increase caps for video. |
| Selection | [FileInput](../packages/editor-ui/src/components/settings/inputs/FileInput.jsx) and [MediaSelectorDrawer](../packages/editor-ui/src/components/media/MediaSelectorDrawer.jsx) support generic files and audio, but no MP4-only picker. The [setting registry](../packages/core/src/config/settingTypes.js) does not support `video`. | Add a `video` setting backed by the existing file picker, with an MP4-only filter and upload accept list. Generic Files should include MP4 too. |
| Widgets | Arch's [video-embed](../themes/arch/widgets/video-embed/widget.liquid) and [video-popup](../themes/arch/widgets/video-popup/widget.liquid) interpret YouTube/Vimeo URLs and render iframes. Neither renders an uploaded MP4. | Extend `video-embed` with uploaded-video playback for the first release. Keep existing embeds working. Popup playback is a separate follow-up. |
| URL resolution and preview | The [render engine](../packages/render-engine/src/renderEngine.js) already provides a mode-aware `filePath` global; Arch's [audio player](../themes/arch/widgets/audio-player/widget.liquid) uses it. The [preview runtime](../packages/core/src/runtime/previewRuntime.js) directly assigns raw values to a video tagged with `data-setting`. | Resolve video URLs through `filePath`. Avoid sending raw `/uploads/files/...` values into an optimistic video `src` update. |
| Serving and seeking | `serveProjectMedia` streams through `AssetStorageAdapter` and supports full responses, byte ranges and `416` responses. Current controller serving tests cover JPEGs, not MP4 or range playback. | Add MP4 content-type and range regression tests; retain the existing route and adapter contract. |
| Usage and deletion | [Media usage service](../packages/builder-server/src/services/mediaUsageService.js) recursively tracks `/uploads/files/...` strings in settings and blocks. Deletion protection uses those records. | Prove MP4 participation through save, replacement, removal, refresh and deletion tests; no new scanner is planned. |
| Export | [Export controller](../packages/builder-server/src/controllers/exportController.js) copies used `/uploads/files/` assets to `assets/files/` without an extension allowlist. Rendering and path rewriting handle nested output prefixes. The pulled changes add `uploadSourcePath` containment checks. | Verify MP4 copies and URLs at root and nested/language paths. Preserve the new containment checks. |

Direct helper probes reproduced the missing MIME/extension/accept-list entries and unsupported `video` setting. A 51 MB sample was accepted by `validateFileSizes(..., { maxImageMB: 50 })` and rejected with `{ maxSizeMB: 50 }`. This confirms the hook option mismatch; the server's size checks remain in place.

## First release contract

- Accept `.mp4` with declared `video/mp4`, keeping the existing case-insensitive extension handling and rejecting mismatched types. This follows current upload validation; it is not a codec or file-content verification service.
- Store original bytes as a normal `file` asset: `/uploads/files/<normalized-name>.mp4`, with MIME `video/mp4`, no generated image sizes, and no video processing job.
- Add schema setting `type: "video"`. Its value is an empty string or a project upload path ending in `.mp4`; it does not store a resolved preview URL, a media object or an external video URL.
- Register and validate this type consistently for widget, block, theme and collection settings. Use the same safe upload-path rules in both widget/collection rendering and theme-setting validation; the old theme sanitizer's string-only `video` branch is insufficient.
- Reuse `FileInput` with `filterType="video"`; retain its default `file` behaviour. The picker must prevent PDF, MP3 and image selection in video mode, including selections supplied directly to its callback.
- Extend Arch `video-embed` with `video_file` (`video` setting) and an optional `poster` (`image` setting). A nonempty uploaded video takes precedence over `video_url`; clearing it restores the existing YouTube/Vimeo behaviour. Keep existing IDs, defaults and presets compatible. Explain this precedence in the field description; no conditional-visibility schema feature is needed.
- Render native `<video controls playsinline preload="metadata">` with an accessible title, optional poster and escaped attributes. No autoplay by default. Empty uploaded settings must not produce an empty `src` request.
- Resolve the saved video's filename using the renderer's `filePath` global, following the audio-player pattern. Resolve posters through the existing image tag. Persist only the original upload path.
- Keep playback dependent on formats the browser can decode. Use a known-playable MP4 for acceptance testing and show a useful playback error for an unsupported or corrupt file. No transcoding, automatic poster generation, adaptive streaming, new upload limits, background-video controls or subtitle editor in this task.
- Keep the two storage categories `image` and `file`. A Videos UI filter is a MIME-based view, not a third storage category. Preserve existing backup acceptance of legacy upload folders; relocating old `/uploads/videos/` assets is outside this change.

## Implementation sequence

### 1. Enable upload and correct content types

- [ ] Update `packages/core/src/utils/mimeTypes.js` with `.mp4: video/mp4`.
- [ ] Update `packages/builder-server/src/utils/mimeTypes.js` with the allowed MIME and extension; update the rejection copy in `controllers/mediaController.js`.
- [ ] Add `VIDEO_MIME_TYPES` / `VIDEO_ACCEPT` in `packages/editor-ui/src/utils/uploadValidation.js`; include MP4 in `MEDIA_ACCEPT` and `NON_IMAGE_ACCEPT`.
- [ ] Fix `useMediaUpload.js` to pass `maxSizeMB`. Leave server caps and upload batching intact.
- [ ] Extend `mediaUploadFilter.test.js`, `media.test.js`, `uploadValidation.test.js` and `useMediaUpload.test.jsx` for accepted MP4, uppercase extensions, mismatched types, original byte preservation, metadata and oversized-file rejection before a request.

Exit condition: a real multipart MP4 upload becomes one ordinary file record with the original bytes, correct MIME, and the existing size restrictions. Include an HTTP upload check so controller tests that directly provide `req.files` cannot bypass the actual upload gate unnoticed.

### 2. Add selection and the schema contract

- [ ] Add `video` to `packages/core/src/config/settingTypes.js` and its registry tests.
- [ ] Add the `video` case in `SettingsRenderer.jsx`, rendering `FileInput` in video mode. Parameterize only the accept list, selector filter, labels and selection guard needed by this mode; share existing upload/progress/remove logic.
- [ ] Add `video` filtering in `MediaSelectorDrawer.jsx` and `useMediaState.js`, plus the Videos option in `MediaToolbar.jsx`. Keep Files as all non-images and keep image pickers image-only.
- [ ] Add a video icon/type label to media grid/list/selector entries and a native video preview in `MediaDrawer.jsx`, with React `onError` feedback. Do not load video players inside every grid tile. Pause/unmount the drawer player when switching or closing it.
- [ ] Add a bounded MP4 upload-path sanitizer in `packages/builder-server/src/services/sanitizationService.js` and use it for widget/block/collection and theme values, including null, invalid objects and invalid defaults.
- [ ] Teach `scripts/validate-theme.js` the `video` value contract. Collection schema validation already consumes the shared registry; verify it accepts the type and preserves values through save/reload.
- [ ] Update all affected strings in `packages/core/src/locales/*.json`, including the existing format descriptions and FileInput's hard-coded `PDF, MP3` hint.
- [ ] Add picker tests for existing selection, upload, replacement, removal, reloading a saved value and rejection of non-video selections. Cover generic file and image picker regressions.

Exit condition: a theme can declare a video field, users can choose only MP4s in it, and the saved value remains a valid upload-path string across save/reload and rendering.

### 3. Render an uploaded video in a page widget

- [ ] Extend `themes/arch/widgets/video-embed/schema.json` and `widget.liquid` with `video_file`, `poster`, native playback and styling that fits the existing aspect-ratio container.
- [ ] Add a small `themes/arch/widgets/video-embed/video-embed.js` handler for native media errors, enqueued by the widget. It should show the translated error beside the player and handle widgets inserted or updated by preview morphing without accumulating duplicate listeners. A `<video>` fallback text node alone does not handle decoding failures in browsers that support the element.
- [ ] Add the field descriptions and playback fallback text to the Arch locales using the existing translation conventions. Do not change current YouTube/Vimeo defaults or content.
- [ ] Leave `data-setting="video_file"` off the resolved video `src` element: `PreviewPanel` sends raw setting values and the runtime would temporarily replace the project media URL with an unresolved storage path. Let the existing server-rendered widget update replace the video markup. Verify changing and clearing the source in the live editor; do not introduce a second client-side URL resolver.
- [ ] Add render tests covering MP4 precedence, clearing back to external video, poster/no poster, empty state, escaped attributes, and root/nested publish prefixes. Confirm existing YouTube/Vimeo rendering remains intact.
- [ ] Deliver widget and locale changes through the repository's theme-update mechanism as well as the theme source. Check the `0.9.10` delta so existing projects can receive them. Do not overwrite users' project theme files manually.

Exit condition: selecting or replacing an uploaded MP4 produces a playable native video in editor and standalone previews, with no raw upload URL or stale player left behind.

### 4. Prove seeking, saved usage and export

- [ ] Extend `media.test.js` or add a focused streaming suite for MP4 serving by filename and media ID: `video/mp4`, byte-preserving full response, bounded/open-ended/suffix ranges, clamped end and unsatisfiable range (`416`). Assert adapter calls keep the requested project scope.
- [ ] Extend `mediaUsage.test.js` and `mediaDeletionSafety.test.js` for MP4 paths in widget and block settings, save/reload, replacing/removing references, full refresh and deletion protection. Exercise collection/theme paths through their existing integration suites if the new type is used there.
- [ ] Extend `export.test.js` and `multilangExport.test.js` with used and unused MP4 records. Assert a used file is copied byte-for-byte, unused MP4s are excluded, and HTML references the correct relative asset at root and nested/language paths. Include a downloaded ZIP check.
- [ ] Keep `exportPathContainment.test.js` passing with MP4 records too. Test backup import of a new `/uploads/files/*.mp4` record against the pulled `backupContentChecks.js` rules.
- [ ] Keep the generic export/usage implementations unless a regression test exposes an actual gap. Do not add video-only copies of those pipelines.

Exit condition: saved references keep the correct video in the export and prevent deletion while used; exported files and URLs work independently of the editor server.

### 5. Update authoring references and verify the complete workflow

- [ ] Update `docs-llms/core-media.md`, `theming-setting-types.md` and relevant export guidance with the implemented behaviour and codec/size limitations. Update matching user/theme-development documentation under `docs-website/src/`.
- [ ] Update `skills/widgetizer-theme/references/widgets-and-settings.md`, which currently explicitly lists `video` as unsupported; regenerate the authoring catalog with `node scripts/build-theme-skill-contract.js`. Keep `themeSkill.test.js` and the starter import/export checks passing.
- [ ] Run the targeted tests above, then the repository checks below once implementation is complete. Update the paired task status only after the real-file acceptance workflow succeeds.

```text
npm test
npm run test:frontend
npm run lint:all
npm run validate:all-locales
npm run validate:theme -- themes/arch
node scripts/build-theme-skill-contract.js --check
npm run build
```

Manual acceptance uses a disposable project and a small, known-playable MP4:

1. Upload through the Media page and through a video setting; test a second file, duplicate filename and oversized rejection.
2. Select the file in Arch video-embed, save, reopen the editor, play/pause/seek, replace it and clear it. Confirm an existing YouTube/Vimeo widget still works and clearing restores its URL source.
3. Repeat playback in standalone preview and Electron. Check a narrow viewport and keyboard operation. A corrupt or browser-unsupported MP4 should show useful feedback rather than imply upload success guarantees playback.
4. Verify usage and deletion protection after save and after removing the last reference. Confirm a shared video stays protected while another widget still uses it.
5. Export a site with a root page and a nested/language page, download/unpack its ZIP, and serve it separately from Widgetizer. Verify playback, seeking, poster and network URLs. Check image, PDF and MP3 upload/selection/export regressions.
6. Test an existing project receiving the theme update, not only a newly created project. Host applications adopting the shared packages must verify their own serving and publishing integration; this repository audit does not establish that downstream result.

## Audit validation

- Before the branch update, `mediaUploadFilter.test.js`, `media.test.js`, `mediaUsage.test.js` and `export.test.js`: **209 passed, 1 skipped**. The upload/MIME/hook files inspected for this audit did not change in the pulled commits.
- Client baseline: `uploadValidation.test.js`, `useMediaUpload.test.jsx`, `useMediaState.test.js`: **17 passed**. Existing tests did not cover the reproduced hook option mismatch.
- After updating to `f14cd33b`, reran `export.test.js`, `exportPathContainment.test.js` and `multilangExport.test.js`: **120 passed, 1 skipped**. These counts overlap the earlier export run and should not be added together. The skip is the existing Windows-inapplicable directory-permission test.
- No MP4 playback success is claimed by these baselines. The real-file workflow above is the implementation completion gate.

## Integration

Implement and validate on `feature/mp4-support`. Bring in any further `0.9.10` changes before final verification, review the feature diff, then merge back to `0.9.10` when the feature is complete. This planning pass does not mark the feature complete or merge the branch.
