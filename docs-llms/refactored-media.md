# Refactored Media Manual Test Plan

> Manual regression checklist for the shared upload refactor across media uploads, theme ZIP uploads, project import, and theme-setting image inputs.

## Test Kit

Use the same files already referenced in `docs-llms/beta-testing-script.md` where possible:

- `photo-small.jpg`
- `photo-large.jpg`
- `photo-oversized.jpg`
- `image.webp`
- `image.gif`
- `logo.svg`
- `valid-theme.zip`
- `theme-update.zip`
- `invalid-theme.zip`
- `random-files.zip`

Add one non-zip file like `notes.txt` if you want an explicit wrong-type ZIP test.

## Preconditions

- App starts successfully.
- You have at least one project.
- You know which project is active.
- Default upload limits are known:
  - `media.maxFileSizeMB`
  - `export.maxImportSizeMB`

## 1. Media Page Uploads

### 1.1 Successful multi-file upload

1. Go to `Media`.
2. Upload `photo-small.jpg`, `image.webp`, and `image.gif`.
3. Expected:
   - progress bars appear for the selected files only
   - each successful file reaches `100%`
   - uploaded files appear in the media library
   - success toast reflects the upload result

### 1.2 Oversized image rejection

1. Upload `photo-oversized.jpg`.
2. Expected:
   - upload is rejected before or during upload with a clear error
   - rejected file does not remain in the progress list
   - no fake `100%` completion is shown

### 1.3 Wrong file type rejection

1. Try to upload a non-image file from the media uploader.
2. Expected:
   - rejection toast appears
   - nothing is added to the media library
   - no stale progress rows remain

### 1.4 Mixed valid and invalid images

1. Upload one valid image and one invalid or oversized image together.
2. Expected:
   - valid file uploads successfully
   - rejected file gets an error toast
   - only successful files reach `100%`
   - rejected files do not look completed

## 2. Media Selector Drawer Uploads

### 2.1 Drawer upload parity

1. Open a media picker drawer from any image-selection flow.
2. Upload `photo-small.jpg` from inside the drawer.
3. Expected:
   - uploader UI behaves the same as the main media page
   - progress appears correctly
   - uploaded image appears in the drawer list without refresh

### 2.2 Drawer rejection handling

1. In the same drawer, try an oversized image or wrong file type.
2. Expected:
   - you get the same rejection behavior as the media page
   - no stale upload rows remain after the rejection

## 3. Theme ZIP Uploads

### 3.1 Valid theme install

1. Go to `Themes`.
2. Upload `valid-theme.zip`.
3. Expected:
   - only that file appears in progress
   - upload completes cleanly
   - success toast appears
   - new theme card appears or existing one updates

### 3.2 Invalid theme package

1. Upload `invalid-theme.zip`.
2. Expected:
   - upload fails with the server validation message
   - no extra/stale files remain in the progress UI afterward

### 3.3 Ghost-progress regression check

1. Upload `invalid-theme.zip` and wait for the failure.
2. Immediately upload `valid-theme.zip`.
3. Expected:
   - only `valid-theme.zip` appears in the next upload attempt
   - old invalid filenames do not reappear
   - this is the key regression this refactor is meant to fix

### 3.4 Theme update ZIP

1. Upload `theme-update.zip`.
2. Expected:
   - update is accepted if it matches the installed base theme/version rules
   - updated theme card reflects new version/update data
   - success message matches update behavior rather than fresh install behavior

### 3.5 Wrong type and oversize ZIP

1. Try a non-zip file.
2. Try an oversized zip beyond `export.maxImportSizeMB`.
3. Expected:
   - both are rejected consistently
   - no fake or stale progress rows remain

## 4. Project Import Uploads

### 4.1 Successful import

1. Open the project import modal.
2. Select a valid exported project zip.
3. Start import.
4. Expected:
   - upload progress appears in the modal uploader
   - import succeeds
   - success state appears
   - imported project is usable

### 4.2 Invalid ZIP structure

1. Try `random-files.zip`.
2. Expected:
   - import fails with a meaningful error
   - rejected file does not remain in progress state

### 4.3 Wrong type and oversize import

1. Try a non-zip file.
2. Try an oversized import zip.
3. Expected:
   - same rejection style as theme ZIP upload
   - client and server messages feel consistent

## 5. Theme Setting Image Input

### 5.1 Upload from an image setting

1. Open a page or settings area containing an `image` theme setting.
2. Upload `photo-small.jpg`.
3. Expected:
   - image uploads successfully
   - control updates to show the uploaded asset
   - success toast is shown

### 5.2 Oversized image in image setting

1. Try `photo-oversized.jpg`.
2. Expected:
   - rejection message matches main media upload rules
   - input resets cleanly
   - no broken preview state remains

### 5.3 Browse existing media from image setting

1. Use `Browse media`.
2. Select an already-uploaded image.
3. Expected:
   - selection works without re-uploading
   - preview updates correctly

## 6. Cross-Flow Consistency Checks

### 6.1 Matching limits

1. Confirm image uploads use `media.maxFileSizeMB`.
2. Confirm theme upload and project import use `export.maxImportSizeMB`.
3. Expected:
   - client-side rejection thresholds match backend rejection thresholds

### 6.2 Matching acceptance rules

1. Confirm media upload only accepts supported image formats.
2. Confirm theme/project uploads only accept ZIP files.
3. Expected:
   - dropzone rejection and backend rejection are aligned closely enough that users do not get contradictory behavior

### 6.3 No stale progress after any failure

Repeat this pattern in all upload surfaces:

1. Trigger a failed upload.
2. Immediately trigger a valid upload.
3. Expected:
   - only the current files appear in progress
   - previous failed filenames never reappear

## Sign-off

Mark each section `PASS` or `FAIL` and capture:

- the exact file used
- where the upload was triggered
- the toast/error shown
- whether progress UI behaved correctly
- screenshots for any mismatch
