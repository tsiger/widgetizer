# UX Principles & Cross-Cutting Conventions

This is a thin, cross-cutting UX doc. It captures the shared interaction patterns the editor uses everywhere — toasts, confirmation modals, navigation guards, redirect/"go with the flow" conventions, and the bulk-delete pattern. Per-domain workflow detail (projects, pages, menus, media, themes, export) lives in the dedicated `core-*` docs; this doc points to them rather than re-enumerating them.

For where these patterns sit in the architecture (admin shell vs. site workspace, package layout) see [core-architecture.md](core-architecture.md).

---

## Guiding Principles

1.  **Never leave the user guessing.** After any action (save, delete, upload, etc.) the user gets immediate, explicit feedback — almost always a toast (`useToastStore`).
2.  **Go with the flow.** Redirect to the logical next step after an action. After creating a menu the user lands on its structure editor; after setting a project active they enter the site workspace.
3.  **Consistency is key.** Creating, editing, and deleting different content types should follow the same shapes — the shared `useConfirmationAction` / `ConfirmationModal` for destructive actions, the same toast copy structure, the same form navigation guard.
4.  **Prevent destructive actions.** Use in-app confirmation modals for deletions, and pre-empt destructive failures in the UI (disabled buttons, disabled menu items, tooltips) rather than relying on a server error round-trip.
5.  **Efficiency through shortcuts.** Standard keyboard shortcuts (Undo, Redo, Save) speed up common workflows.
6.  **Intelligent auto-save.** Auto-save should be "invisible" and respectful of user activity — debounced on inactivity rather than fired on a fixed interval.

---

## Shared Mechanisms

### Toasts

All workflow feedback flows through `useToastStore` (`packages/editor-ui/src/stores/toastStore.js`), invoked as `showToast(message, "success" | "error" | "warning" | "info", { duration })`. Duration defaults to 5s; pass `0`/`null` for a sticky toast. Copy is localized via `react-i18next` with English `defaultValue` fallbacks. Batch flows (media, theme upload) summarize outcomes through `showUploadOutcome` / `showRejectedFiles` (`packages/editor-ui/src/utils/uploadFeedback.js`), and cap individual error toasts (default `maxDetails: 5`) to avoid spam.

### Confirmation Modals

Destructive actions use the in-app modal, never a browser `confirm()` dialog. List pages wire it with `useConfirmationAction` (`packages/editor-ui/src/hooks/useConfirmationAction.js`), which wraps `useConfirmationModal` and returns:

- `confirm(options)` — opens the dialog with `title` / `message` / `confirmText` / `cancelText` / `variant` (`"danger"` for deletes) plus a `data` payload passed back to the confirm callback.
- `confirmationModal` — a ready-to-render `<ConfirmationModal />` element the page drops into its JSX.

The page owns its mutation logic and localized copy; the hook owns the modal wiring.

### Navigation Guards

Forms (project, page, menu, settings) install a navigation guard that blocks accidental navigation away from unsaved changes. When a save legitimately changes the URL (e.g. a page slug change rewrites the route), the guard is bypassed for that programmatic navigation.

### Bulk Delete

List pages that support multi-select (pages, media) share one pattern: selection checkboxes feed a single confirmation modal, then a batch delete runs and a count-aware success toast is shown (`File "[name]" deleted successfully.` vs. `Successfully deleted [count] files`). Single and bulk delete go through the same confirm → mutate → toast → refresh path.

### Redirect / "Go with the Flow" Conventions

- **Create → next useful surface.** Menu creation redirects into the structure editor. Project creation/activation enters the site workspace (`/pages` by default, or a preserved `next` destination when the user was bounced out of a workspace route).
- **Edit → stay put with an exit.** Edit forms keep the user on the edit surface after save and surface a "Back to List" affordance, rather than yanking them away.
- **No-op redirects are skipped.** Toasts and redirects only fire when state actually changed (e.g. the "set active" toast shows only when the active project changes).

---

## Backend Shape That Affects UX

The backend is **adapter-injected and scope-first**: every storage/asset/limits call carries a `scope` (`{ actor, projectId, folderName }`), and capability is supplied by injected adapters rather than hard-wired filesystem access (see [core-packages.md](core-packages.md)). For the OSS shell this is the local-FS + SQLite adapter set; a hosted shell swaps in cloud adapters.

One consequence is visible at the UX layer: a **limits/quota adapter** can shape create/upload outcomes. The contract exposes `LIMIT_KEYS` (`packages/core/src/adapters.js`) — `MAX_UPLOAD_SIZE_BYTES`, `MAX_PAGES_PER_PROJECT`, `MAX_PROJECTS_PER_USER`, `MAX_MEDIA_BYTES`, `CUSTOM_DOMAIN_ALLOWED`, `ANALYTICS_TIER`, `FORM_SUBMISSIONS_PER_MONTH`, `MAX_WIDGETS_PER_PAGE`, `MAX_MENU_ITEMS`, `MAX_COLLECTION_ITEMS`, `MAX_COLLECTIONS`. In OSS, the count/quota keys are effectively unbounded while `MAX_UPLOAD_SIZE_BYTES` mirrors the App Settings upload cap; under a hosted limits adapter, a create or upload can be rejected on quota grounds and the UI surfaces that as an error toast like any other failed mutation. Treat "create/upload can fail for limit reasons" as a baseline assumption.

---

## Per-Domain Workflows

The create/edit/delete/duplicate/upload specifics — exact toast copy, redirect targets, guard behavior — live in the dedicated docs:

- **Projects** (`/projects`) — create/activate handoff, active-project delete protection, edit, duplicate. See [core-projects.md](core-projects.md).
- **Pages** (`/pages`) — create, edit settings (with slug-change URL handling), single + bulk delete, duplicate. See [core-pages.md](core-pages.md).
- **Page Editor** — its own interaction model (auto-save, undo/redo, widget editing) is documented separately in [core-page-editor.md](core-page-editor.md).
- **Menus** (`/menus`) — create → structure editor, delete, duplicate. See [core-menus.md](core-menus.md).
- **Media** (`/media`) — chunked uploads with per-file progress, usage-tracked delete, single + bulk delete. See [core-media.md](core-media.md).
- **Themes** (`/themes`) — upload, update, apply-update-to-project, delete. See §Theme Management below and [core-themes.md](core-themes.md).
- **Collections** — item create/edit/delete. See [core-collections.md](core-collections.md).
- **Export** (`/export-site`) — export with a loading button state, toast feedback, and a persisted history list. See [core-export.md](core-export.md).

---

## Theme Management UX Notes

Theme management lives in the admin shell (`/themes`, `app/src/pages/Themes.jsx`). A few interaction details are easy to get wrong, so they are pinned here; the underlying theme model lives in [core-themes.md](core-themes.md).

- **No activation UI on the Themes page.** Themes are selected during project creation; there is no "Activate" button on theme cards and no active-theme badge on the Themes page. (The "Active" badge is a *project*-list concept — see [core-projects.md](core-projects.md).)
- **"In use" label.** A theme used by one or more projects shows a pink **"In use"** label next to its name, with a tooltip listing the consuming project names (`theme.projectsUsingTheme`).
- **Collapsible presets.** A theme with presets renders a chevron-collapsible presets grid below its header row (preset screenshots, names, optional descriptions and "Live demo" links), expanded by default. Themes without presets show a single inline theme screenshot instead.
- **Delete is an in-app `ConfirmationModal`, not a browser dialog.** Deletion runs through `useConfirmationAction` → `ConfirmationModal` (`variant: "danger"`), with localized title/message/buttons.
- **The in-use guard is a disabled menu item.** In the three-dot (⋮) menu, when a theme is in use the "Delete" item is rendered **disabled** with a tooltip listing the projects; clicking it does nothing. The server's `409` response is only a **fallback** — if a delete is somehow attempted on an in-use theme, the `409` is caught and shown as an error toast (`Cannot delete "[name]" - it is currently used by one or more projects`).
- **Updates.** Theme cards surface "Update available: vX.Y.Z" with an Update button; a sidebar badge counts pending updates and decrements after an update. Applying an update to a project happens from the project edit surface. Detail in [core-themes.md](core-themes.md).

---

## Summary

- All mutating workflows give toast feedback; destructive ones go through the shared in-app confirmation modal.
- Navigation guards prevent unsaved-change data loss on forms.
- Bulk delete is supported for pages and media via the shared select → confirm → batch → toast pattern.
- Redirects follow "go with the flow": create lands on the next useful surface, edit stays put with an exit.
- The backend is scope-first and adapter-injected; a hosted limits adapter (`LIMIT_KEYS`) can turn create/upload actions into quota-driven failures that surface as error toasts.
- Two surfaces sit outside the "every action redirects" model: the Page Editor (its own auto-save/undo model, see [core-page-editor.md](core-page-editor.md)) and theme activation (driven from project creation, not the Themes page).
