# Project Switching Manual QA Script

Use this as a realistic manual smoke test for the local Electron app.

## Goal

Confirm that switching projects never causes the app to:

- show content from the wrong project
- save to the wrong project
- preview the wrong project
- export the wrong project
- keep stale UI state after switching
- bypass the unsaved-changes guard incorrectly

## Test setup

Create or pick **two very different projects**:

- `Project A`
- `Project B`

Make them easy to tell apart:

- different theme if possible
- different site title
- different page names
- different colors in theme settings
- different media/images
- different menu names

Best case:

- one uses `arch`
- one uses `widgetizer`

## Important note: how to switch projects

This app does **not** have an in-editor instant project switcher.

To switch projects during this test:

1. Use `Admin`
2. Open `Projects`
3. Open the other project's workspace / make the other project active

If you are on a screen with unsaved changes, the app **should** block navigation first and show the leave/discard confirmation.

That guard behavior is part of what you are testing.

## Fail conditions

Fail immediately if any of these happen:

- project A data appears while project B is active
- save/export/preview affects the wrong project
- switching projects bypasses the unsaved-changes guard unexpectedly
- confirming/canceling the guard behaves incorrectly
- stale toasts/success states modify the wrong project's UI
- console or terminal shows clear project-mismatch or stale-state breakage

## Test 1: Basic switch sanity

1. Open `Project A`.
2. Visit `Pages`, `Menus`, `Media`, `Settings`, and `Export`.
3. Notice obvious identifiers that prove you are in A.
4. Switch to `Project B` using `Admin -> Projects`.
5. Visit the same screens.

Expected:

- every screen reflects only B
- no stale A data remains visible
- no obvious console/server errors

## Test 2: Pages list and editor reset

1. Open `Project A`.
2. Go to `Pages`.
3. Open a page in the editor.
4. Click a widget/block so something is selected.
5. Switch to `Project B` through `Admin -> Projects`.
6. Go to `Pages`.
7. Open a page in B.

Expected:

- page list belongs to B
- editor shows B page content only
- no widget selection/block selection from A survives
- no A widgets/schema/state leak into B

## Test 3: Editor unsaved-changes guard

1. Open a page in `Project A`.
2. Change widget content and do **not** save.
3. Try to go to `Admin -> Projects`.
4. When the leave/discard confirmation appears, click `Cancel`.
5. Confirm you are still in the editor with your unsaved change.
6. Try again.
7. This time confirm leaving.
8. Switch to `Project B`.
9. Open a page in B.

Expected:

- first attempt: navigation is blocked and you stay on A
- second attempt: navigation proceeds only after confirmation
- B does not show A's unsaved edit
- no stale autosave or stale success toast writes A data into B

## Test 4: Theme settings load after switch

1. Open `Project A`.
2. Go to `Settings`.
3. Switch to `Project B`.
4. Immediately open `Settings` in B.
5. Repeat a few times quickly.

Expected:

- settings always settle to the active project
- A colors/title/logo/settings never pop back in after B is active
- no stale UI flash that persists

## Test 5: Theme settings unsaved-changes guard

1. Open `Project A` settings.
2. Change a visible value such as site title or a color.
3. Try to go to `Admin -> Projects`.
4. On the confirmation dialog, click `Cancel`.
5. Confirm you are still on A with the unsaved change.
6. Try again and confirm leaving.
7. Switch to `Project B`.

Expected:

- navigation guard blocks the first switch attempt
- staying keeps the local unsaved A state
- leaving discards navigation safely
- B does not show A's unsaved settings

## Test 6: Theme settings save then switch

1. Open `Project A` settings.
2. Change something obvious.
3. Click save.
4. Immediately switch to `Project B` through `Admin -> Projects`.
5. Open B settings.
6. Later return to A and verify the saved change.

Expected:

- B does not receive A's setting values
- stale success/warning behavior does not mutate B state
- A contains only A's saved change

## Test 7: Preview behavior

1. Open a page in the editor for `Project A`.
2. Interact with the preview.
3. Switch to `Project B`.
4. Open a B page in the editor.
5. Also test standalone/site preview if you use it.

Expected:

- preview refreshes to B only
- no A HTML/theme/widgets appear in B preview
- no stale iframe/preview state survives the switch

## Test 8: Export behavior

1. Open `Project A`.
2. Go to `Export`.
3. Start an export.
4. Immediately switch to `Project B`.
5. Watch the UI after the export finishes.
6. Open B export screen/history.
7. Later verify the exported output belongs to A only.

Expected:

- B does not show A's export success state as if it belongs to B
- export history settles to the active project
- exported files belong to the project that started the export

## Test 9: Menus edit guard and switch

1. Open `Project A`.
2. Go to `Menus`.
3. Open a menu edit screen or structure screen.
4. Make a change without saving.
5. Try switching to `Project B`.
6. First cancel the guard, then repeat and confirm leaving.
7. Open menus in B.

Expected:

- guard blocks as expected
- cancel keeps you on A with edits intact
- confirm allows leaving
- B menus remain B only

## Test 10: Pages edit form guard and switch

1. Open `Project A`.
2. Go to `Pages`.
3. Open a page metadata/edit form.
4. Change something without saving.
5. Try switching to `Project B`.
6. First cancel the guard, then repeat and confirm leaving.
7. Open page edit form in B.

Expected:

- guard works correctly
- no A form state leaks into B
- no wrong-project save occurs

## Test 11: Media sanity after switching

1. Open `Project A` media.
2. Note a few distinctive files.
3. Switch to `Project B`.
4. Open media again.
5. If practical, upload or rename/update metadata in A, then switch to B.

Expected:

- media list belongs only to the active project
- no media metadata/state from A appears in B
- no wrong-project media action occurs

## Test 12: Fast stress pass

Spend 5 to 10 minutes doing this quickly:

1. Switch back and forth between A and B repeatedly.
2. Open `Pages`, page editor, `Settings`, `Menus`, `Media`, and `Export` in random order.
3. Trigger real actions:
   - select widgets
   - edit settings
   - attempt guarded navigation with unsaved changes
   - save settings
   - start exports
   - open previews
4. Watch for mixed-project UI, stale toasts, stale success states, or wrong-project results.

Expected:

- no mixed-project UI
- no wrong-project saves
- no crashes
- no repeated console spam

## Nice-to-have extra checks

- Restart the Electron app while B is active and confirm the expected project reopens.
- Import an older exported project, then switch between it and a newer one.
- Try with slower/heavier projects to increase the chance of catching stale async behavior.
- If you use packaged builds, repeat the critical tests outside dev mode.

## What to write down if something fails

For each failure, note:

- which screen you were on
- which project was active
- what action you performed
- whether you canceled or confirmed a guard dialog
- what you expected
- what actually happened
- whether there was a toast, console error, or terminal error

## Final decision rule

Project switching is good enough for `1.0 MVP` if all of these are true:

- no cross-project leakage is reproducible
- no wrong-project save/export/preview is reproducible
- guard dialogs behave correctly on dirty screens
- repeated rapid switching does not leave stale UI behind
