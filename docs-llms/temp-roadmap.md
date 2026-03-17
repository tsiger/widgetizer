# Temp Roadmap

> Items to address — targeting next session. Last reviewed: 2026-03-17.

---

## Already resolved

- **Media-by-ID operations not scoped to project** (`P0`): Fixed — `getMediaFileById`, `deleteMediaFile`, `deleteMediaFiles`, `updateFileMetadata` in `mediaRepository.js` now all require `projectId` as the first parameter and enforce `AND project_id = ?` in SQL. Controllers and `mediaUsageService` updated to pass `projectId` through. Matches widgetizer-app's pattern.

- **Responsive images transfer** (`P1`): Completed — widgetizer-app now has the `{% image %}` tag with full `srcset` support (`src/core/tags/imageTag.js`), comprehensive tests (`server/tests/imageTag.test.js`), and all applicable widgets use `srcset: true` (card-grid, comparison-slider, content-switcher, image, image-tabs, gallery, masonry-gallery, image-hotspots, image-callout, profile-grid, project-showcase, testimonial-hero, image-text). The rollout planning doc (`future-responsive-images-rollout.md`) has been cleaned up.

- **Controller-to-service decoupling for media reads** (`P2`): Fixed — created `server/services/mediaService.js` with `readMediaFile()`. Updated all consumers (`renderingService.js`, `mediaUsageService.js`, `exportController.js`, `mediaController.js`, tests) to import from the service. Removed the TODO comment from `renderingService.js`.

- **`receiveThemeUpdates` enforced** (`P1`): Fixed — `getAllProjects()` now checks `project.receiveThemeUpdates` before setting `hasThemeUpdate = true`. Added "Receive theme updates" checkbox toggle in ProjectForm's "More Settings" section (edit mode only). i18n keys added for all 6 locales. The edit page banner still shows update availability regardless of the flag (useful when actively editing).

- **Folder name uniqueness** (`P1`): Fixed in widgetizer — `generateUniqueSlug` callbacks use `projectRepo.projectFolderExists()` checking the `folder_name` column. **Not fully fixed in widgetizer-app** — `generateFolderName(name)` is a simple slugify with no DB uniqueness check. `projectFolderExists` does not exist. Collision risk is reduced by per-user directory scoping (`data/users/{userId}/websites/{folderName}/`), but same-user duplicate folder names are still possible.
