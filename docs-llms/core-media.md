# Media Library

Canonical reference for the Media Library: per-project file storage and image resizing, the SQLite metadata model, usage tracking (pages, global widgets, theme settings, collection items), audio/range streaming, the Media page + hooks, and the media controller/routes/usage service.

The library is a single **asset system** spanning two categories — `image` and `file` (PDFs, audio) — managed together and scoped per project. There is no separate "Files" page or parallel storage model; file assets are first-class media records that share usage tracking, deletion protection, and export participation with images. See [Export System](core-export.md) for how used file assets are copied into static exports.

## 1. Architecture & Data Storage

### Physical File Storage

Uploaded binaries are stored through the **`AssetStorageAdapter`** (local FS in OSS, cloud object storage in hosted), scoped per project. The OSS adapter maps adapter keys to on-disk paths:

- **Images**: `data/projects/{folderName}/uploads/images/`
- **Files** (PDFs, audio): `data/projects/{folderName}/uploads/files/`

The controller chooses the subdir inline from `getMediaCategory(file.mimetype)` (`packages/builder-server/src/utils/mimeTypes.js`): `"image"` MIME types go to `images/`, everything else (PDF, audio) to `files/`. The adapter key is `${subdir}/${filename}` (originals) or `images/${variantFilename}` (generated sizes) — the historical disk layout minus the `/uploads/` URL prefix. There is no `getMediaDir` path-builder; the backend never constructs absolute paths from user input — all binary I/O routes through the adapter over `req.scope`. See [Packages & Adapter Architecture](core-packages.md).

- **File naming**: Original filenames are slugified (`My Awesome Picture.jpg` → `my-awesome-picture.jpg`, truncated to 100 chars). Collisions are deduped against the adapter's existing keys (plus names assigned earlier in the same request) by appending a counter (`my-awesome-picture-1.jpg`).
- **Automatic resizing**: For each uploaded raster image (not SVG), the system generates multiple sizes whose widths/quality come from App Settings or a theme override (§ Image Sizes). Variants are stored alongside the original with `-{size}` suffixes (`photo-thumb.jpg`).
- **Smart size generation**: Only sizes meaningfully smaller than the original are generated (`sizeConfig.width >= metadata.width` is skipped). If an 800px image has `large` configured at 1920px, no `large` variant is produced.
- **Original compression**: When the original is no larger than the largest enabled size (so the original is the effective top delivery asset), it is recompressed in place at the configured quality — dimensions preserved, only file size reduced. GIFs are excluded to preserve animation frames. When the original exceeds the largest enabled size, it is stored untouched (the `large` variant becomes the public delivery ceiling).

### Decompression-Bomb Guards

Image processing through `sharp` is bounded so a small malicious file cannot exhaust memory:

- `sharp(buffer, { limitInputPixels: 100_000_000 })` caps decoded pixels.
- After reading metadata, images with `width > 10_000` or `height > 10_000` are rejected with a descriptive `reason` (never processed).

### Two-Gate Size Enforcement

Upload size is enforced at **two** points:

1. **Streaming gate (SA-02)** — `uploadWithLimit` builds a per-request `multer` whose `limits.fileSize` is sourced from the `LimitsAdapter` (`LIMIT_KEYS.MAX_UPLOAD_SIZE_BYTES`). An oversize part is rejected mid-stream **before** the whole file is buffered into memory; `errorHandler` maps multer's `LIMIT_FILE_SIZE` to `413`. OSS returns a finite cap from app settings (default fallback `10 MB` when no adapter is wired); hosted returns its tenant ceiling.
2. **Post-buffer gate** — inside `uploadProjectMedia`, each buffered file is re-checked against `media.maxFileSizeMB` (App Settings); over-limit files are reported in `rejectedFiles` with a human-readable reason rather than throwing.

The streaming gate is the DoS-safe floor; the post-buffer gate enforces the user-configurable per-file limit. File-type acceptance is enforced by multer's `fileFilter` against `ALLOWED_MIME_TYPES`.

### Image Sizes (App Settings + Theme Overrides)

Resizing is configured through **App Settings** (`media.imageProcessing.quality`, `media.imageProcessing.sizes`) — see [App Settings](core-appSettings.md) for the full config UI and defaults. Default sizes: `thumb` 150px, `small` 480px, `medium` 1024px, `large` 1920px; a single quality value (1–100) applies to all sizes unless a size overrides it.

Themes can override the app-level sizes by defining `settings.imageSizes` in `theme.json`. When present, the theme sizes **replace** app settings for that project, except `thumb` which is **always generated** (the media UI needs it). Each size may carry its own `quality`, falling back to the global quality. Sizes are disabled with `enabled: false`.

```json
{
  "settings": {
    "imageSizes": {
      "thumb": { "width": 150, "enabled": true },
      "small": { "width": 480, "enabled": true },
      "hero": { "width": 1600, "enabled": true, "quality": 90 },
      "large": { "enabled": false }
    }
  }
}
```

When the active project's theme defines `imageSizes`, the Image Sizes controls in App Settings are hidden behind an explanatory notice; file-size limit and quality remain editable. Resolution lives in `getImageProcessingSettings(projectId)` in `packages/builder-server/src/controllers/mediaController.js`.

### Metadata Storage

Media metadata lives in SQLite (`data/widgetizer.db`); binaries live behind the asset adapter. Repository: `packages/builder-server/src/db/repositories/mediaRepository.js`.

- `media_files` — core records (id, project_id, filename, original_name, type, size, uploaded, path, alt, title, caption, width, height).
- `media_sizes` — generated image variants (size_name, path, width, height), keyed by `media_file_id`.
- `media_usage` — usage relationships: one `used_in` source string per (file, source), keyed by `media_file_id`.

API responses assemble a `files` array from these rows:

```json
{
  "files": [
    {
      "id": "c1b2a3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      "filename": "my-awesome-picture.jpg",
      "originalName": "My Awesome Picture.jpg",
      "type": "image/jpeg",
      "size": 123456,
      "uploaded": "2023-10-29T10:00:00.000Z",
      "path": "/uploads/images/my-awesome-picture.jpg",
      "metadata": { "alt": "An awesome sunset", "title": "Sunset", "caption": "Summit at dawn" },
      "width": 1920,
      "height": 1080,
      "usedIn": ["about-us", "home"],
      "sizes": {
        "thumb":  { "path": "/uploads/images/my-awesome-picture-thumb.jpg",  "width": 150,  "height": 113 },
        "small":  { "path": "/uploads/images/my-awesome-picture-small.jpg",  "width": 480,  "height": 360 },
        "medium": { "path": "/uploads/images/my-awesome-picture-medium.jpg", "width": 1024, "height": 768 }
      }
    },
    {
      "id": "d2e3f4a5-b6c7-4d8e-9f0a-1b2c3d4e5f6a",
      "filename": "brochure.pdf",
      "originalName": "Company Brochure.pdf",
      "type": "application/pdf",
      "size": 245760,
      "uploaded": "2024-03-15T14:30:00.000Z",
      "path": "/uploads/files/brochure.pdf",
      "metadata": { "alt": "", "title": "", "caption": "" },
      "width": null,
      "height": null,
      "usedIn": ["home"],
      "sizes": {}
    }
  ]
}
```

Non-image records (PDFs, audio) carry `width: null`, `height: null`, and `sizes: {}` — no resizing, no dimension extraction.

### Media Type Configuration

MIME/accept definitions are centralized:

- **Backend** (`packages/builder-server/src/utils/mimeTypes.js`):
  - `ALLOWED_MIME_TYPES` — upload allowlist: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml`, `application/pdf`, `audio/mpeg`, `audio/mp3`.
  - `ZIP_MIME_TYPES` — ZIP archive validation (project import / theme upload).
  - `getMediaCategory(mimeType)` — `"image"` for image MIME types, `"file"` for everything else (PDF, audio); decides the upload subdir inline in the controller.
  - `getContentType(ext)` / `CONTENT_TYPES` — re-exported from `@widgetizer/core/mimeTypes` (single source of truth shared with the local asset adapter); resolves an extension to a MIME type for `Content-Type` headers.
- **Frontend** (`packages/editor-ui/src/utils/uploadValidation.js`): a family of accept objects drives the upload UIs —
  - `IMAGE_ACCEPT` (jpeg/jpg, png, gif, webp, svg), `FILE_ACCEPT` (pdf), `AUDIO_ACCEPT` (mp3).
  - `NON_IMAGE_ACCEPT` = `{ ...FILE_ACCEPT, ...AUDIO_ACCEPT }` — what the `file` category covers; shared by every `filterType="file"` surface (the media drawer uploader, `FileInput`).
  - `MEDIA_ACCEPT` = `{ ...IMAGE_ACCEPT, ...AUDIO_ACCEPT, ...FILE_ACCEPT }` — the main Media Library uploader.
  - Client-side helpers: `validateFileSizes`, `mapDropzoneRejections`, ZIP validation.

### Audio Files & Range Requests

`.mp3` audio is an accepted upload type but **not** a separate storage category: `getMediaCategory` returns `"file"` for any non-image MIME, so audio binaries live under `uploads/files/` alongside PDFs, with `width/height: null` and `sizes: {}`. In the media UI the type filter groups audio under **file** (`all` / `image` / `file`; everything non-image is "file").

- Accepted MIME: `audio/mpeg` and `audio/mp3` are in `ALLOWED_MIME_TYPES`; the extension map resolves `.mp3 → audio/mpeg`. Front-end validation accepts `.mp3` via `AUDIO_ACCEPT`/`NON_IMAGE_ACCEPT`.
- The Arch theme's `audio-player` widget points each `track` block's `file` setting at an uploaded `.mp3` (with an `image` cover); audio playback is theme-rendered — there is no core audio widget.

**Byte-range streaming (HTTP 206).** `serveProjectMedia` honours `Range` requests so an `<audio>`/`<video>` element can seek without downloading the whole file:

- Always sends `Accept-Ranges: bytes`.
- Parses a single `bytes=start-end` range (including the suffix form `bytes=-N` for the final N bytes); an unsatisfiable range returns `416` with `Content-Range: bytes */<size>`.
- A valid range streams the slice as `206 Partial Content` with `Content-Range: bytes start-end/<size>`; a missing/malformed range streams the full file (`200`).
- The slice is read through the adapter — `assetStorage.download(scope, key, { start, end })` — so the same handler serves local files (OSS) and ranged object-storage GETs (hosted).

## 2. Usage Tracking

The library tracks which content references each media file so in-use assets are protected from deletion and included in export. Each file's `usedIn` array holds source identifiers; a file with a non-empty `usedIn` cannot be deleted. Service: `packages/builder-server/src/services/mediaUsageService.js`.

### Sources Tracked

Usage is keyed by a **source string** per `media_usage` row:

- **Pages** — source = page slug. Scans every widget/block setting plus the SEO social image (`seo.og_image`).
- **Global widgets** (header/footer) — source = `global:{id}`. Scans settings + blocks.
- **Theme settings** — source = `global:theme-settings`. Scans `settings.global` items (live `value`, falling back to schema `default`), e.g. favicon and any image/gallery setting.
- **Collection items** — source = `collection:{type}/{slug}`. Scans item settings plus the item's `seo.og_image`. See [Collections](core-collections.md).

### Path Matching

- A regex (`/\/uploads\/(?:images|files)\/[A-Za-z0-9._-]+/g`) extracts upload paths embedded **anywhere** in a string — including a richtext `<img src="/uploads/images/foo-large.jpg">` inside saved HTML, and `href` values inside link settings.
- Extraction recurses into nested objects and arrays (`collectMediaPaths`), so media paths inside link/gallery/object fields are tracked.
- A record matches on its original `path` **or any of its size-variant paths** (`recordMediaPaths`) — a richtext `<img>` typically embeds a variant (`-large`), which only resolves to its record via the size paths. Both `/uploads/images/` and `/uploads/files/` prefixes are recognised (`UPLOAD_PREFIXES`); relative forms without a leading slash are normalised.

Over-matching only ever marks an asset "used" (the safe direction for deletion protection and export).

### Integration & Refresh

Targeted updates run automatically on the corresponding write/delete/rename:

- `syncPageMediaUsageOnWrite` / `syncPageMediaUsageOnDelete` — page save/rename/delete (called from `pageController`).
- `updateGlobalWidgetMediaUsage` — header/footer save.
- `updateThemeSettingsMediaUsage` — theme settings save (`themeController`).
- `syncCollectionItemMediaUsageOnWrite` / `removeCollectionItemFromMediaUsage` — collection item save/rename/delete (`collectionController`).

`refreshAllMediaUsage(projectId)` is the full rescan (also exposed via the manual "refresh usage" UI action and `refreshMediaUsageAfterStructuralChange` for imports/duplication/theme updates). It rebuilds `media_usage` from scratch by scanning all pages, global widgets, theme settings, and collection items, then writing the map in one transaction (`replaceMediaUsage`). The page scan is gated on `pages/` existing; globals/theme/collections still run for collections-only or freshly-imported projects.

`getMediaUsage(projectId, fileId)` returns `{ fileId, filename, usedIn, isInUse }` for a single file.

## 3. Backend Implementation

Express 5 + `multer` (memory storage) + `sharp`. Controller: `packages/builder-server/src/controllers/mediaController.js`. The backend is adapter-agnostic and scope-first — every storage/limits call takes `req.scope` (`{ actor, projectId, folderName }`). See [Packages & Adapter Architecture](core-packages.md) and [Platform Security](core-security.md#11-cross-tenant-safety-multi-tenant-host-contract).

### API Routes (`packages/builder-server/src/routes/media.js`)

The router applies `resolveActiveProject` so active-project management routes carry the `X-Project-Id` header and read `req.scope` — the project id stays out of the path. Hosted serves these same relative routes under `/api/projects/:projectId` via the project-scoped router.

| Method | Endpoint (under the media router) | Middleware | Controller | Description |
| --- | --- | --- | --- | --- |
| `GET` | `/` | | `getProjectMedia` | List media metadata (from SQLite) for the active project. |
| `POST` | `/` | `uploadWithLimit` | `uploadProjectMedia` | Upload files (multer `array("files", 10)`; streaming size cap). |
| `POST` | `/bulk-delete` | `body.fileIds isArray` | `bulkDeleteProjectMedia` | Delete multiple files; skips in-use files. |
| `POST` | `/refresh-usage` | | `refreshMediaUsage` | Full usage rescan for the project. |
| `GET` | `/:fileId/usage` | | `getMediaFileUsage` | Usage info for one file. |
| `DELETE` | `/:fileId` | | `deleteProjectMedia` | Delete one file; blocked if in use. |

Browser-native loads (`<img src>`, downloads) and the metadata editor cannot carry the `X-Project-Id` header, so these keep the project id in the path and read `req.params.projectId`:

| Method | Endpoint | Controller | Description |
| --- | --- | --- | --- |
| `PUT` | `/projects/:projectId/media/:fileId/metadata` | `updateMediaMetadata` | Update alt/title/caption (HTML stripped). |
| `GET` | `/projects/:projectId/media/:fileId` | `serveProjectMedia` | Serve a file by metadata ID. |
| `GET` | `/projects/:projectId/uploads/images/:filename` | `serveProjectMedia` | Serve an image by filename. |
| `GET` | `/projects/:projectId/uploads/files/:filename` | `serveProjectMedia` | Serve a file asset / audio by filename. |

**Identifier contract:** `:projectId` is always the project UUID; the backend resolves it to `folderName` for storage keys. If it cannot be resolved the request fails with a standardized code (`PROJECT_NOT_FOUND`, `PROJECT_DIR_MISSING`) — no fallback directories are created.

**TI-03 cross-tenant guard.** The metadata route is path-in-path (`.../media/projects/:projectId/...`). The router-level `resolveActiveProject` owner-checks the stashed/outer id before the inner `:projectId` binds, so `updateMediaMetadata` asserts `projectId === req.scope.projectId` and returns `403` on mismatch — preventing a caller from targeting another tenant's project id in the leaf. OSS standalone is byte-neutral (its single active project's id always equals `req.params.projectId`).

### Upload Flow (`uploadProjectMedia`)

1. `multer` (memory storage) buffers each file; `fileFilter` rejects MIME types outside `ALLOWED_MIME_TYPES`.
2. A sequential pre-pass assigns a collision-free slugified filename per file (deduped against adapter keys + names assigned this request).
3. Per file, in parallel (`Promise.allSettled`):
   - Re-check `media.maxFileSizeMB` (post-buffer gate); over-limit → `rejectedFiles`.
   - Mint a UUID media id; build the `fileInfo` record (`path: /uploads/{subdir}/{filename}`).
   - **Raster images** (`image/*` except SVG): read dimensions via `sharp` (decompression-bomb guards apply), generate each enabled size smaller than the original (preserving format at the size's quality), upload each variant through the adapter, then recompress the original when it is no larger than the largest enabled size (GIFs excluded).
   - **SVG**: re-sanitize server-side with `DOMPurify` (`USE_PROFILES: { svg: true }`) before storing — defense-in-depth atop the client-side sanitize.
   - **Non-image** (PDF, audio): skip all image processing; store as-is with `width/height: null`, `sizes: {}`.
   - Upload the (possibly recompressed/sanitized) original bytes through `assetStorage.upload(scope, key, buffer)`.
4. Insert each processed record via `mediaRepo.addMediaFile`. Respond `201` (or `400` when all files were rejected) with `processedFiles` / `rejectedFiles`.

### Metadata Update (`updateMediaMetadata`)

Strips HTML from `alt`/`title`/`caption` (`stripHtmlTags`, also applied as an express-validator sanitizer on the route). **Caption is image-only**: a caption sent for a non-image (e.g. a PDF via the direct API) is stored as `""`, not text (`file.type` must start with `image/`). Persists to the `alt`/`title`/`caption` columns.

### Deletion (`deleteProjectMedia` / `bulkDeleteProjectMedia`)

1. Load the target record(s) from SQLite.
2. **Usage check** — if `usedIn` is non-empty, single delete returns `400`; bulk delete skips the in-use file and reports it under `filesInUse` (still `200`).
3. `deleteMediaAssets` removes the original key plus every generated size key through the adapter.
4. Delete the `media_files` row(s); SQLite cascades to `media_sizes` and `media_usage`.

## 4. Frontend Implementation

The Media page (`packages/editor-ui/src/pages/Media.jsx`) orchestrates specialized hooks and UI components; all user-facing text is localized via `react-i18next`.

### Hooks (`packages/editor-ui/src/hooks/`)

- `useMediaState` — files list, loading/view-mode (persisted to localStorage), search + type filter (`all`/`image`/`file`), manual usage refresh; loads media on mount.
- `useMediaUpload` — XHR progress tracking, batched (chunks of 5) multi-file uploads, client-side SVG sanitization via `DOMPurify` (server re-sanitizes — see § Upload Flow), per-file error reporting and toasts.
- `useMediaSelection` — multi-select, select-all/none with filtering, usage-aware single/bulk deletion, confirmation-modal state.
- `useMediaMetadata` — metadata drawer state, saving alt/title/caption via the API.

See [Custom Hooks](core-hooks.md) for hook-by-hook detail.

### Components (`packages/editor-ui/src/components/media/`)

- `MediaToolbar` — view toggle, search, type-filter dropdown, bulk actions, usage refresh.
- `MediaGrid` / `MediaGridItem` — thumbnail cards with usage badges; non-images show a `FileText` icon + extension badge.
- `MediaList` / `MediaListItem` — table view with select-all and per-row detail.
- `MediaDrawer` — slide-out metadata editor (alt, title, caption).
- `MediaSelectorDrawer` — media browser used inside setting inputs to pick existing files. Supports an "Upload" button (OS file dialog), search, and a `filterType` (`image` / `audio` / `file` / `all`) that adjusts upload accept types; images show thumbnails, files show an icon + extension badge. With `showTypeFilter`, it also renders a type dropdown next to search (All / Images / Audio / Files) so the user can switch type in-drawer — used by the richtext "Link to file" picker, which opens on `all`.

The thumbnail/preview path falls back to the original image when a `thumb` variant is unavailable. Copy-URL is available on media items (copies the relative storage path) so a file URL can be pasted into generic link fields.

### Setting Inputs (`packages/editor-ui/src/components/settings/inputs/`)

- `ImageInput` — image picker with **default** mode (wide preview, Upload + Browse below) and **compact** mode (`compact: true` — square preview with stacked actions and hover Edit/Remove; used for small assets like the Arch `favicon`). Opens `MediaSelectorDrawer` with `filterType="image"`.
- `FileInput` — filename-oriented picker for file assets (`type: "file"` in `SettingsRenderer`). Upload accepts `NON_IMAGE_ACCEPT`; Browse opens `MediaSelectorDrawer` with `filterType="file"`. Shows filename + extension badge + clear; no thumbnail. `value` is the file path string (e.g. `/uploads/files/brochure.pdf`). See [Setting Types](theming-setting-types.md) for the `file` type.

`MediaSelectorDrawer` is also used by `PageForm` (featured image). The Arch theme's `resource-list` widget uses the `file` setting type for download lists.

## 5. Security

Upload validation (MIME allowlist, two-gate size enforcement, decompression-bomb guards, SVG sanitization), the TI-03 cross-tenant metadata guard, and per-scope asset isolation are summarized above. For the platform-wide contract see [Platform Security](core-security.md).

---

**See also:**

- [App Settings](core-appSettings.md) — image-processing quality/sizes and the upload size limit.
- [Export System](core-export.md) — used image and file assets copied into static exports with path rewriting.
- [Setting Types](theming-setting-types.md) — the `image` and `file` setting types.
- [Collections](core-collections.md) — collection-item media usage tracking.
- [Custom Hooks](core-hooks.md) — Media hook deep-dives.
- [Packages & Adapter Architecture](core-packages.md) — `AssetStorageAdapter`, `LimitsAdapter`, `Scope`, `LIMIT_KEYS`.
