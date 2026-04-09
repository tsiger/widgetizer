# Form-Page + List-Page Pattern Plan

This plan combines these backlog items from [roadmap.md](C:/Users/g_tsi/Projects/widgetizer/docs-llms/roadmap.md):

- `1.` Build a form-page abstraction around `useFormNavigationGuard()`
- `5.` Consider a higher-level list-page pattern for confirmation flows

They belong together because both are really page-shell cleanup work:

- form pages repeat the same dirty-state / guarded-navigation / cancel wiring
- list pages repeat the same confirmation-modal / destructive-action wiring

The goal is to reduce page-level boilerplate without hiding the actual business logic for each page.

## Goal

Introduce two small shared patterns:

1. a form-page helper around `useFormNavigationGuard()` and intentional navigation
2. a list-page helper around `useConfirmationModal()` and destructive actions

The target outcome is:

- less repeated `skipNavigationGuardRef` and dirty-title markup
- less repeated `openModal({ title, message, confirmText, ... })` boilerplate
- more consistent save/cancel/delete UX across admin pages
- no regression in current route-guard or destructive-action behavior

## Current Situation

### Form-page duplication is widespread

Representative pages:

- `src/pages/ProjectsAdd.jsx`
- `src/pages/ProjectsEdit.jsx`
- `src/pages/PagesAdd.jsx`
- `src/pages/PagesEdit.jsx`
- `src/pages/MenusAdd.jsx`
- `src/pages/MenusEdit.jsx`
- `src/pages/MenuStructure.jsx`
- `src/pages/Settings.jsx`
- `src/pages/AppSettings.jsx`

Repeated patterns today:

- local `isDirty` state
- local `isSubmitting` state on many pages
- `skipNavigationGuardRef = useRef(false)`
- `useFormNavigationGuard(isDirty, skipNavigationGuardRef)`
- manual `skipNavigationGuardRef.current = true; navigate(...)`
- repeated title JSX with the pink dirty dot
- repeated save/cancel/reset button-row wiring

Important exceptions:

- `src/pages/Settings.jsx` uses `useFormNavigationGuard(hasChanges)` with no skip ref because save stays on the same page
- `src/pages/AppSettings.jsx` also uses `useFormNavigationGuard(hasChanges)` with no skip ref because save stays in place there as well

These pages are not identical, but the shell around them is.

### List-page confirmation wiring is also repeated

Representative surfaces:

- `src/pages/Projects.jsx`
- `src/pages/Pages.jsx`
- `src/pages/Menus.jsx`
- `src/components/export/ExportHistoryTable.jsx`

Repeated patterns today:

- define `handleDelete(data)` or similar mutation callback
- call `useConfirmationModal(handleDelete)`
- define a page-specific `openDeleteConfirmation(...)`
- pass the same modal props through to `<ConfirmationModal />`
- repeat localized title/message/confirm/cancel assembly

There is also an outlier:

- `src/pages/Themes.jsx` still uses `window.confirm()` for theme deletion instead of the shared modal path

That page should likely move onto the shared confirmation pattern once the higher-level list pattern is in place.

## Constraints To Preserve

- Do not weaken `useFormNavigationGuard()` behavior for browser unload or React Router blocking.
- Do not force all form pages into one huge generic component.
- Keep each page’s actual mutation logic local and readable.
- Do not mix route-guard abstractions with project-switch orchestration; that is a separate roadmap concern.
- Do not expand this into menu/dropdown/outside-click abstraction in the same batch.
- Keep `ConfirmationModal` and `useConfirmationModal()` usable directly; the new layer should be additive, not mandatory.

## Recommended Architecture

Use two lightweight layers.

### 1. Guarded form-page helper

Add one small helper hook that standardizes the shell around guarded form pages.

Recommended shape:

- `useGuardedFormPage({ hasUnsavedChanges })`

Suggested return value:

- `skipNavigationGuardRef`
- `navigateSafely(navigate, to, options?)`
- `markNextNavigationSafe()`
- `getDirtyTitle(titleNode)`

Behavior:

- internally wires `useFormNavigationGuard(hasUnsavedChanges, skipNavigationGuardRef)`
- provides one deliberate path for bypassing the guard on successful save/cancel navigation
- centralizes the repeated dirty-dot title wrapper

Important:

- keep `isDirty` / `hasChanges` ownership in the page or page-specific hook
- keep submission logic in the page
- do not add form-schema logic here

This should replace repetitive shell code, not page-specific save behavior.

### 2. Confirmation-action helper for list surfaces

Add a tiny wrapper around `useConfirmationModal()` that makes destructive actions easier to open and render.

Recommended direction:

- `useConfirmationAction(onConfirm)`

Suggested return value:

- `confirm(options)`
- `confirmationModal`

Where:

- `confirm(options)` is a thin alias over `openModal(...)`
- `confirmationModal` is a ready-to-render `<ConfirmationModal />` element or a small prop bundle for rendering it

Behavior:

- keeps `handleDelete(data)` or `handleConfirmAction(data)` local to the page
- reduces the repeated `modalState / openModal / closeModal / handleConfirm` plumbing
- keeps localized copy per page

Important:

- do not bury mutation logic inside the helper
- do not try to generalize single-delete, bulk-delete, and non-delete confirmations into a complicated config system

This abstraction should remove boilerplate, not introduce a “generic list engine”.

## Design Decisions

### Form abstraction scope

Good candidates:

- add/edit pages with local dirty state and intentional post-save navigation
- settings-style pages with dirty indicators and reset/save actions, even when they do not use a skip ref

Poor candidates:

- the page editor itself
- pages whose guard logic is deeply tied to custom store behavior rather than a simple dirty flag

### List abstraction scope

Good candidates:

- pages/components already using `useConfirmationModal()`
- list/table surfaces with localized destructive confirmations

Poor candidates:

- `window.confirm()` sites that need broader UX reconsideration before direct migration
- modal flows that need multi-step async state inside the modal itself

### Non-goals for this batch

- abstracting table layouts
- abstracting action menus / three-dot dropdowns
- abstracting search bars, bulk-selection UI, or toolbar layout
- centralizing all mutation toasts

## Phased Implementation

## Phase 1. Extract the guarded form-page helper

Create a small helper, likely in:

- `src/hooks/useGuardedFormPage.js`

Possible tiny presentational helper if it earns its keep:

- `src/components/ui/DirtyPageTitle.jsx`

First migration candidates:

- `src/pages/ProjectsAdd.jsx`
- `src/pages/PagesAdd.jsx`
- `src/pages/MenusAdd.jsx`

Why these first:

- they are structurally very similar
- they all use `skipNavigationGuardRef`
- they are lower-risk than edit/settings flows

Verify:

- save success still navigates without a spurious guard prompt
- cancel still bypasses the guard only when intended
- dirty dot still appears correctly

## Phase 2. Roll the form helper across the rest of the guarded pages

Migrate:

- `src/pages/ProjectsEdit.jsx`
- `src/pages/PagesEdit.jsx`
- `src/pages/MenusEdit.jsx`
- `src/pages/MenuStructure.jsx`
- `src/pages/Settings.jsx`
- `src/pages/AppSettings.jsx`

Notes:

- `Settings.jsx` does not use `skipNavigationGuardRef` today. It stays on the same page after save, so the helper would mainly standardize guard wiring and dirty-title behavior there.
- `AppSettings.jsx` also does not use `skipNavigationGuardRef` today. It is another stay-in-place page, so the helper should be usable without any intentional-navigation API.
- `PagesEdit.jsx` already uses a differently named ref (`isNavigatingAfterSaveRef`), so the migration should preserve its intent rather than forcing naming consistency for its own sake

## Phase 3. Extract the confirmation-action helper

Create:

- `src/hooks/useConfirmationAction.js`

or, if cleaner:

- a small helper component plus the hook

First migration candidates:

- `src/pages/Projects.jsx`
- `src/pages/Menus.jsx`
- `src/components/export/ExportHistoryTable.jsx`

Why these first:

- each has straightforward single-delete confirmation behavior
- they already use `useConfirmationModal()` in the same way

Verify:

- confirmation copy still renders correctly
- destructive actions still receive the right `data`
- confirm/cancel still behave exactly the same

## Phase 4. Migrate the more complex list surface

Migrate:

- `src/pages/Pages.jsx`

Why separate:

- it has both single-delete and bulk-delete flows
- it combines confirmation with selection state and bulk actions

Success here means the abstraction can handle real variation without becoming awkward.

## Phase 5. Optional cleanup follow-up

Consider migrating:

- `src/pages/Themes.jsx`

from `window.confirm()` to the shared confirmation-modal path.

This should happen only if the helper feels clearly better after the earlier migrations. It is a good consistency win, but not essential to the first pass.

## Suggested File Targets

### New files

- `src/hooks/useGuardedFormPage.js`
- `src/hooks/useConfirmationAction.js`

### Possible new files if justified

- `src/components/ui/DirtyPageTitle.jsx`

### Likely touched form pages

- `src/pages/ProjectsAdd.jsx`
- `src/pages/ProjectsEdit.jsx`
- `src/pages/PagesAdd.jsx`
- `src/pages/PagesEdit.jsx`
- `src/pages/MenusAdd.jsx`
- `src/pages/MenusEdit.jsx`
- `src/pages/MenuStructure.jsx`
- `src/pages/Settings.jsx`
- `src/pages/AppSettings.jsx`

### Likely touched list surfaces

- `src/pages/Projects.jsx`
- `src/pages/Pages.jsx`
- `src/pages/Menus.jsx`
- `src/components/export/ExportHistoryTable.jsx`
- `src/pages/Themes.jsx` (optional follow-up)

### Likely untouched in this batch

- `src/pages/PageEditor.jsx`
- `src/stores/*`
- `src/components/pageEditor/*`

This batch should stay at the page-shell level, not bleed into editor/store refactors.

## Main Risks

- over-abstracting the forms until the helper hides too much page intent
- building a list abstraction that only works for delete-confirmation happy paths
- accidentally changing when guarded navigation is bypassed after successful saves
- coupling dirty-title UI too tightly to page layout
- trying to solve menus, toolbars, and confirmation flows all at once

## Recommended Guardrails

- keep each new helper small and narrow
- require pages to keep their own mutation logic and toast behavior
- migrate in small clusters instead of all pages at once
- compare before/after line count and readability; if a migration gets less clear, stop
- keep direct `useFormNavigationGuard()` / `useConfirmationModal()` available for outliers

## Verification Plan

### Automated

- add hook tests for guarded-navigation bypass behavior if the helper has meaningful logic
- add focused tests for confirmation helpers if they return significant computed props/JSX
- otherwise prefer page-level smoke tests on the first migrated surfaces

### Manual

- dirty a form, click browser back, and confirm the guard appears
- dirty a form, click cancel, and confirm intentional navigation bypasses the guard
- save a dirty form and confirm redirect/navigation happens without an extra prompt
- confirm dirty-dot title behavior stays consistent across migrated pages
- open delete confirmations on Projects, Pages, Menus, and export history
- confirm the right item/count/name appears in the modal copy
- confirm bulk delete in Pages still passes the correct selected IDs

## Recommended Execution Order

1. Extract `useGuardedFormPage()` and migrate the three add pages.
2. Roll it through edit/settings pages once the shape feels right.
3. Extract the confirmation-action helper and migrate the straightforward list surfaces.
4. Migrate `Pages.jsx` bulk-delete flow.
5. Optionally move `Themes.jsx` off `window.confirm()`.

## Success Criteria

This batch is successful if:

- guarded form pages no longer repeat the same skip-ref / navigate / dirty-title shell
- list pages no longer repeat most of the confirmation-modal plumbing
- individual pages still read clearly and keep their business logic local
- no guard regression appears around cancel/save navigation
- no confirmation regression appears around single-delete or bulk-delete actions
