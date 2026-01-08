# Multer 2.0 Upgrade Testing Checklist

**Upgrade Details:**
- **From:** multer `1.4.5-lts.2`
- **To:** multer `2.0.2`
- **Date:** Upgrade completed
- **Security:** Fixed CVE-2025-47935, CVE-2025-47944, CVE-2025-7338

## Testing Checklist

### 1. Media File Uploads (`/api/media/projects/:projectId/media`)

**Images:**
- [ ] Upload a single image (JPG, PNG, GIF, WebP, SVG)
- [ ] Upload multiple images (up to 10 at once)
- [ ] Verify files are saved to the correct project directory
- [ ] Verify filenames are slugified correctly
- [ ] Verify duplicate filenames get numbered (`image.jpg`, `image-1.jpg`, etc.)
- [ ] Check that image thumbnails are generated correctly

**Videos:**
- [ ] Upload a video file (MP4, WebM, etc.)
- [ ] Verify video is saved to `uploads/videos/` directory
- [ ] Verify video metadata is stored correctly

**Audio:**
- [ ] Upload an audio file (MP3, WAV, etc.)
- [ ] Verify audio is saved to `uploads/audios/` directory
- [ ] Verify audio metadata is stored correctly

**Error Handling:**
- [ ] Try uploading an invalid file type (should be rejected)
- [ ] Try uploading without selecting a file
- [ ] Try uploading to a non-existent project ID

### 2. Theme Upload (`/api/themes/upload`)

- [ ] Upload a theme zip file
- [ ] Verify the zip is stored in memory correctly
- [ ] Verify theme extraction works
- [ ] Verify theme files are saved to the correct location

### 3. File Serving

- [ ] Access uploaded images via `/api/media/projects/:projectId/media/:fileId`
- [ ] Access images via direct path `/api/media/projects/:projectId/uploads/images/:filename`
- [ ] Access videos via `/api/media/projects/:projectId/uploads/videos/:filename`
- [ ] Access audio via `/api/media/projects/:projectId/uploads/audios/:filename`

### 4. Edge Cases

- [ ] Upload files with special characters in names (should be sanitized)
- [ ] Upload very large files (if you have size limits)
- [ ] Upload files with unicode characters in names
- [ ] Test concurrent uploads (multiple files at once)

### 5. Media Library UI

- [ ] Upload files through the Media page UI
- [ ] Verify files appear in the media grid/list
- [ ] Verify file metadata displays correctly
- [ ] Test bulk delete functionality

## Quick Test Commands

If you want to test via API directly:

```bash
# Test image upload
curl -X POST http://localhost:3001/api/media/projects/YOUR_PROJECT_ID/media \
  -F "files=@/path/to/image.jpg"

# Test theme upload
curl -X POST http://localhost:3001/api/themes/upload \
  -F "themeZip=@/path/to/theme.zip"
```

## Priority Tests

**Start with these critical paths:**
1. Image uploads through the UI
2. Theme uploads
3. File serving endpoints

## Notes

- Multer 2.0 maintains API compatibility with 1.x for standard usage patterns
- All security vulnerabilities from 1.x have been patched
- Node.js 10.16.0+ required (project uses Node.js 22.13.0 ✅)

## Status

- [ ] Testing in progress
- [ ] All tests passed
- [ ] Issues found (document below)

### Issues Found

_Add any issues discovered during testing here:_

---

**Note:** This is a temporary checklist document. Remove after testing is complete and multer 2.0 is confirmed stable.
