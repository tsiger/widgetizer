import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import busboy from "busboy";
import { WidgetizerError } from "@widgetizer/core/errors";
import { getMaxUploadBytes, MAX_UPLOAD_FILES } from "../utils/uploadLimits.js";

const FIELD_NAME = "files";

// Browsers escape exactly LF, CR and `"` in multipart filenames; busboy leaves
// them escaped. A full decodeURIComponent would corrupt names like `50%.pdf`.
function decodeFormDataName(name) {
  return name.replace(/%0A|%0D|%22/gi, (m) => ({ "%0A": "\n", "%0D": "\r" })[m.toUpperCase()] ?? '"');
}

/**
 * Multipart parser for the media upload route. Each file part is written to a
 * temp file as it arrives (nothing is held in memory), and `req.files` gets one
 * entry per part: `{ fieldname, originalname, mimetype, size, path, refused }`.
 *
 * A part over the per-file limit (MAX_UPLOAD_SIZE_BYTES from the limits
 * adapter) stops being written and is drained, so the client still finishes
 * sending; it arrives with `refused: true`, `path: null` and its full `size`,
 * and the controller reports it while the rest of the batch is stored. Only a
 * request whose file bytes pass MAX_UPLOAD_FILES × the per-file limit is
 * aborted as a whole (413); with no per-file limit there is no such bound.
 *
 * `fileFilter` has multer's signature; a part it rejects fails the request, as
 * multer did. The temp directory is removed when the response closes.
 * @param {{ fileFilter: (req: object, file: object, cb: (err: Error | null, ok?: boolean) => void) => void }} options
 */
export function parseMediaUpload({ fileFilter }) {
  return async function parseMediaUploadMiddleware(req, res, next) {
    req.files = [];
    if (!req.is("multipart")) return next();

    let maxFileBytes;
    let bb;
    try {
      maxFileBytes = await getMaxUploadBytes(req.adapters, req.scope);
      bb = busboy({ headers: req.headers, limits: { files: MAX_UPLOAD_FILES } });
    } catch (err) {
      return next(err);
    }
    const maxRequestBytes = Number.isFinite(maxFileBytes) ? maxFileBytes * MAX_UPLOAD_FILES : Infinity;

    let tempDir = null;
    let responseClosed = false;
    res.once("close", () => {
      responseClosed = true;
      if (tempDir) fs.rm(tempDir, { recursive: true, force: true }, () => {});
    });

    let finished = false;
    let parsed = false;
    let pendingWrites = 0;
    let totalBytes = 0;
    let index = 0;

    function finish(err) {
      if (finished) return;
      finished = true;
      req.unpipe(bb);
      bb.removeAllListeners();
      bb.on("error", () => {}); // a late parser error after teardown must not crash the process
      if (err) {
        // Answer now and drop the connection after the response, instead of
        // reading the rest of an oversized body.
        res.set("Connection", "close");
        req.resume();
        return next(err);
      }
      next();
    }

    function maybeDone() {
      if (parsed && pendingWrites === 0) finish();
    }

    bb.on("file", (fieldname, stream, info) => {
      if (finished || fieldname !== FIELD_NAME) {
        stream.resume();
        return;
      }
      const entry = {
        fieldname,
        originalname: decodeFormDataName(info.filename ?? ""),
        mimetype: info.mimeType,
        size: 0,
        path: null,
        refused: false,
      };

      fileFilter(req, entry, (filterErr, accepted) => {
        if (filterErr || !accepted) {
          stream.resume();
          return finish(filterErr ?? new WidgetizerError("File type not allowed", { statusCode: 400 }));
        }
        if (finished || responseClosed) {
          stream.resume();
          return;
        }
        if (!tempDir) tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "widgetizer-upload-"));
        entry.path = path.join(tempDir, `part-${index++}`);
        req.files.push(entry);

        pendingWrites++;
        const out = fs.createWriteStream(entry.path);
        out.on("error", (err) => finish(err));
        out.on("close", () => {
          pendingWrites--;
          maybeDone();
        });

        stream.on("data", (chunk) => {
          entry.size += chunk.length;
          totalBytes += chunk.length;
          if (totalBytes > maxRequestBytes) {
            out.destroy();
            return finish(
              new WidgetizerError("Upload too large", { statusCode: 413, code: "UPLOAD_TOO_LARGE" }),
            );
          }
          if (entry.refused) return;
          if (entry.size > maxFileBytes) {
            entry.refused = true;
            const partPath = entry.path;
            entry.path = null;
            out.destroy();
            fs.rm(partPath, { force: true }, () => {});
            stream.resume(); // it may be paused waiting on a write stream that is gone
            return;
          }
          if (!out.write(chunk)) {
            stream.pause();
            out.once("drain", () => stream.resume());
          }
        });
        stream.on("end", () => {
          if (!entry.refused) out.end();
        });
        stream.on("error", (err) => finish(err));
      });
    });

    bb.on("filesLimit", () =>
      finish(
        new WidgetizerError(`Too many files: at most ${MAX_UPLOAD_FILES} per upload`, {
          statusCode: 400,
          code: "LIMIT_FILE_COUNT",
        }),
      ),
    );
    bb.on("error", (err) => finish(err));
    bb.on("close", () => {
      parsed = true;
      maybeDone();
    });

    req.pipe(bb);
  };
}
