# File Assets Architecture

This document proposes the architecture for adding reusable downloadable file assets to Widgetizer, starting with **PDF support** and leaving room for future extensions via an allowlist-driven model.

The goal is to extend the current Media Library into a broader asset system that supports both **images** and **files** without introducing a separate content area or a parallel storage model.

---

## 1. Product Framing

### Feature Name

Internally, this feature should be treated as **File Assets** rather than a one-off "PDF upload" feature.

### User-Facing Framing

- The library remains the **Media Library**
- The media-type filter exposes:
  - `All`
  - `Images`
  - `Files`
- The first enabled file type is:
  - `.pdf`

This keeps the UI simple while preserving an extensible platform model.

### Why This Fits Widgetizer

Widgetizer targets small business websites, where downloadable documents are common supporting assets:

- brochures
- catalogs
- menus
- price lists
- application forms
- capability statements
- event programs
- lead magnets and downloadable resources

These are typically uploaded once, reused in multiple places, and linked from buttons, cards, or resource sections.

---

## 2. Goals

- Allow users to upload PDF files into the existing Media Library
- Allow users to browse and filter files separately from images
- Allow widgets and theme settings to reference files cleanly
- Allow users to copy a file URL for use in generic link fields
- Preserve project-scoped usage tracking and deletion protection
- Ensure referenced files are available in exported static sites
- Keep the architecture extensible so new file extensions can be added later via configuration

---

## 3. Non-Goals For V1

- No inline document editing
- No advanced document preview or annotation workflows
- No separate "Files" page outside Media
- No broad file-type rollout on day one
- No file-specific widgets in core scope yet
- No new content model separate from the existing media asset model

---

## 4. Recommended V1 Scope

V1 should be considered complete when all of the following are true:

- `.pdf` files can be uploaded into the Media Library
- The Media Library can filter between `All`, `Images`, and `Files`
- The uploader copy clearly mentions supported file types
- Users can select a file from a dedicated file-oriented setting input
- Users can copy a file URL from the Media Library
- File references participate in usage tracking and deletion protection
- Referenced files are included in site export and remain linkable from exported pages

---

## 5. Conceptual Model

### 5.1 Asset Categories

The current media model should be generalized conceptually into **asset categories**:

- `image`
- `file`

This proposal does **not** require separate project areas for images and files. It extends the existing media system so both categories are managed together and scoped per project.

### 5.2 File Type Strategy

Supported file types should be allowlist-driven from the start.

V1 enabled:

- `.pdf`

Future candidates, not enabled initially:

- `.docx`
- `.xlsx`
- `.zip`

The important design principle is that adding a new supported type later should mostly be a matter of:

- adding extension + MIME entries
- mapping them to the `file` asset category
- exposing them in the UI where appropriate

The system should not be architected around the assumption that PDF is the only file type forever.

---

## 6. UX Architecture

## 6.1 Media Library

The existing Media Library remains the single home for reusable project assets.

Recommended UI changes:

- bring back the media-type filter so users can switch between `All`, `Images`, and `Files`
- keep upload in the same entry point users already know
- update uploader helper text and allowed-files captions to mention PDFs
- present files with file-first affordances rather than image-first assumptions

Recommended file item presentation:

- filename
- extension badge
- file size
- upload date
- usage indicator
- actions such as:
  - open
  - copy URL
  - delete

List view will likely be more useful than grid view for files, but the library can still preserve the current view-mode concept if desired.

### 6.2 Copy URL Workflow

The Media Library should expose a **Copy URL** action for file assets.

Recommended URL behavior:

- copy relative URLs in the builder, consistent with existing uploaded image behavior
- keep builder asset references aligned with export expectations, where paths are rewritten to relative published asset locations

This is important because not all file usage will come from a dedicated document widget. Users will often want to:

- paste the file URL into a generic link field
- attach the document to button widgets
- reuse a brochure/catalog in multiple places without extra schema work

### 6.3 Setting Inputs

The current image input should not be treated as the long-term UX for selecting files.

Recommended direction:

- create a **dedicated file input**
- allow it to reuse shared media-picker mechanics internally later if useful

Why a dedicated file input is preferable:

- image inputs are thumbnail-oriented
- file inputs are filename-oriented
- file selection needs actions like browse, clear, copy/open rather than visual preview emphasis

Expected file input behavior:

- browse existing files
- upload a new file
- display selected filename and extension
- clear the selection

### 6.4 Theme Authoring Patterns

Themes should eventually be able to support both of these patterns:

1. **Structured document settings**
   - widget or theme schema explicitly accepts a file asset
2. **Generic link reuse**
   - user copies a file URL and pastes it into an existing link field

This gives theme authors flexibility while letting users benefit immediately even before dedicated document widgets exist.

---

## 7. Content and Data Architecture

### 7.1 Storage Boundary

This feature should follow the existing Widgetizer persistence boundary:

- SQLite owns metadata and usage relationships
- filesystem owns the uploaded binary files

Files should therefore be modeled as first-class media assets within the existing project-scoped asset system, not as page content and not as a separate database-only concept.

### 7.2 Shared Asset Model

Images and files should share the same high-level asset model:

- project-scoped ownership
- upload metadata
- stored path/URL
- usage tracking
- deletion protection
- export participation

The system can still differentiate behavior by category:

- images have thumbnails/resized variants
- files do not require image-specific processing

### 7.3 Reference Model

Files should be referenceable from:

- widget settings
- block settings
- global widget settings
- theme settings
- generic link fields via copied URL

The reference strategy should stay consistent with the current "uploaded asset reused in many places" mental model rather than introducing ad hoc one-off file attachments.

---

## 8. Usage Tracking Expectations

File assets should follow the same product rules as images:

- if a file is referenced in project content or project settings, it counts as in use
- users should be able to see whether it is in use
- deleting an in-use file should be blocked or strongly guarded

This is especially important for PDF-style business assets, which are often:

- linked from multiple pages
- reused across theme settings and widgets
- updated occasionally but expected to remain stable once published

The feature will feel incomplete if files can be uploaded but are not covered by usage awareness.

---

## 9. Export Architecture Expectations

For this feature to be credible, file assets must work in exported static sites.

Expected export behavior:

- referenced files are copied into the static export output
- links generated from widgets/settings continue to work after export
- the exported site treats files as public downloadable assets, not editor-only resources

This matters because the primary user value of PDF support is visitor-facing download access.

If the file works in the builder but breaks in exported HTML, the feature fails its core purpose.

---

## 10. Configuration Strategy

The supported-file-type model should be list-driven.

Conceptually, the system should maintain:

- allowed extensions
- allowed MIME types
- asset category mapping

V1 should enable only PDF, but the design should make future support straightforward.

This architecture matches the desired product evolution:

- start narrow
- avoid overcommitting to low-value formats
- expand later without redesigning storage, library UX, or schema semantics

### 10.1 File Size Limits

V1 should explicitly define whether PDFs share the existing media upload limit or introduce a new one.

Recommended direction:

- PDF uploads should use the existing App Settings media upload size limit in v1
- a separate file-specific size limit should only be introduced if real usage shows downloadable business documents need a meaningfully different ceiling

This keeps the settings model simpler and reinforces the idea that files are part of the same project asset system rather than a separate subsystem.

---

## 11. Schema and Input Design Direction

At the theme/schema level, Widgetizer should support file-aware settings as a first-class pattern.

Recommended direction:

- introduce a file-oriented setting/input for selecting uploaded file assets
- keep generic link settings unchanged
- allow both patterns to coexist

That gives two valid ways to model downloads:

- explicit file asset selection for document widgets
- generic URL-based linking for flexible reuse

This balance is important because themes will vary:

- some will want a polished "Download brochure" widget
- others may only need a button linking to a file URL

---

## 12. Proposed UX Labels

Recommended naming:

- system concept: **File Assets**
- library filter label: **Files**
- first enabled extension: **PDF**

Avoid calling the whole feature "PDF support" in architecture docs, because that will become limiting as soon as a second extension is added.

---

## 13. Future Expansion

Once v1 is stable, likely next steps include:

- enabling additional file extensions based on real demand
- richer file metadata such as display title or description
- document-specific widgets in themes like Arch
- resource/download list patterns
- optional file preview where useful
- better file sorting and reporting in the Media Library

These should be treated as incremental additions on top of the same File Assets architecture, not as separate features.

---

## 14. Confirmed Decisions For V1

The following product decisions are considered settled for the first implementation pass:

- use `All`, `Images`, and `Files` in the Media Library filter, with `All` as the natural default state
- copy relative file URLs in the builder for consistency with existing asset behavior
- expose explicit actions such as open, copy URL, and delete rather than relying on implicit click behavior
- start with a dedicated file input, even if it shares picker logic internally later
- keep file metadata simple in v1
- share the existing media upload size limit in v1 unless real usage proves files need their own ceiling

### Remaining Follow-Ups

These are not blockers for the architecture, but may still be revisited during implementation planning:

- whether v1 should remain filename-only everywhere or introduce a small amount of editable display metadata
- whether PDFs eventually need a separate App Settings upload limit after real-world usage

---

## 15. Summary

The right architectural direction is to add **File Assets** as an extension of the existing Media Library and asset model, with **PDF enabled first**.

This approach:

- fits real small-business website needs
- keeps the UX simple and familiar
- avoids creating a parallel subsystem
- preserves usage tracking and export expectations
- leaves the door open for more file types later through configuration rather than redesign

---

**See also:**

- [core-media.md](core-media.md) - Existing media library architecture
- [core-export.md](core-export.md) - Static export expectations and asset copying
- [theming-setting-types.md](theming-setting-types.md) - Current setting/input patterns for theme and widget schemas
- [core-page-editor.md](core-page-editor.md) - Editor-side setting selection and asset usage patterns
