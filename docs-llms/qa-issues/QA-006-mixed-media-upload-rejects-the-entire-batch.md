# QA-006 — Mixed media upload rejects the entire batch

| Field | Value |
| --- | --- |
| Story IDs | `MEDIA-007`, `MEDIA-008` |
| Severity | Medium |
| Environment | Web app API; macOS; `experimentation` at `c7dff686` |
| Preconditions | Active disposable project; multipart batch containing one valid image and one unsupported file |
| Status | Confirmed |
| Reproducibility | Always |
| Data impact | Valid files in a partially invalid batch are discarded and must be uploaded again |

## Minimal reproduction

1. Submit one JPEG and one `text/plain` file together to the media upload endpoint.
2. Inspect the response and media library.

## Expected

The JPEG is retained and reported in `processedFiles`; the text file is reported in `rejectedFiles` with a per-file reason.

## Actual

The endpoint returns HTTP 500 for the entire request. The valid JPEG is neither written to storage nor added to media metadata. The response only contains the Multer error and does not identify the rejected filename; its message also says only images and PDF are supported even though MP3 is accepted.

## Evidence

- Request batch: `qa-partial-valid.jpg` plus `qa-partial-invalid.txt`.
- Response: `Invalid file type. Supported types: images and PDF.` with HTTP 500.
- Both the project upload directory and `media_files` table contained zero records for `qa-partial-valid.jpg` after the request.
- `packages/builder-server/src/controllers/mediaController.js` calls `cb(error)` from the Multer `fileFilter`, aborting middleware before `uploadProjectMedia` can produce its partial-success payload.
