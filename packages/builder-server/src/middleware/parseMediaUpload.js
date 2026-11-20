import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import busboy from "busboy";
import { WidgetizerError } from "@widgetizer/core/errors";
import { getMaxUploadBytes, MAX_UPLOAD_FILES } from "../utils/uploadLimits.js";

const FIELD_NAME = "files";

// The upload sends only files; these bound everything else a body can carry,
// whatever the per-file limit is.
const FIELD_LIMITS = { fields: 10, fieldSize: 64 * 1024, fieldNameSize: 200, parts: MAX_UPLOAD_FILES + 10 };

// Browsers escape exactly LF, CR and `"` in multipart filenames; busboy leaves
// them escaped. A full decodeURIComponent would corrupt names like `50%.pdf`.
function decodeFormDataName(name) {
  return name.replace(/%0A|%0D|%22/gi, (m) => ({ "%0A": "\n", "%0D": "\r" })[m.toUpperCase()] ?? '"');
}

const badRequest = (message, code) => new WidgetizerError(message, { statusCode: 400, code });

/**
 * Multipart parser for the media upload route. Each file part is written to a
 * temp file as it arrives (nothing is held in memory), and `req.files` gets one
 * entry per part: `{ fieldname, originalname, mimetype, size, path, refused }`.
 *
 * A part over the per-file limit (MAX_UPLOAD_SIZE_BYTES from the limits
 * adapter) stops being written and is drained, so the client still finishes
 * sending; it arrives with `refused: true`, `path: null` and its full `size`,
 * and the controller reports it while the rest of the batch is stored. Only a
 * request whose bytes (every file part and field value) pass MAX_UPLOAD_FILES
 * × the per-file limit is aborted as a whole (413); with no per-file limit
 * there is no such bound, but field and part counts stay bounded.
 *
 * `fileFilter` has multer's signature; a part it rejects fails the request, as
 * does a file under another field name. Any failure — a rejected part, a
 * malformed body, a client that goes away mid-upload, a disk error — goes
 * through one teardown: parsing stops, every open temp file is closed, and the
 * temp directory is removed. The directory is otherwise removed when the
 * response closes.
 * @param {{ fileFilter: (req: object, file: object, cb: (err: Error | null, ok?: boolean) => void) => void }} options
 */
export function parseMediaUpload({ fileFilter }) {
  return async function parseMediaUploadMiddleware(req, res, next) {
    req.files = [];
    if (!req.is("multipart")) return next();

    let maxFileBytes;
    let tempDir;
    let bb;
    try {
      maxFileBytes = await getMaxUploadBytes(req.adapters, req.scope);
      bb = busboy({ headers: req.headers, limits: { ...FIELD_LIMITS, files: MAX_UPLOAD_FILES } });
      tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "widgetizer-upload-"));
    } catch (err) {
      return next(err);
    }
    const maxRequestBytes = Number.isFinite(maxFileBytes) ? maxFileBytes * MAX_UPLOAD_FILES : Infinity;

    const removeTempDir = () => fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    let responseClosed = false;
    res.once("close", () => {
      responseClosed = true;
      removeTempDir();
    });

    const writers = new Set();
    let settled = false;
    let parsed = false;
    let totalBytes = 0;
    let index = 0;

    function closeWriters() {
      return Promise.all(
        [...writers].map(
          (out) =>
            new Promise((resolve) => {
              if (out.closed) return resolve();
              out.once("close", resolve);
              out.destroy();
            }),
        ),
      );
    }

    async function fail(err) {
      if (settled) return;
      settled = true;
      req.unpipe(bb);
      bb.destroy();
      bb.on("error", () => {}); // a late parser error after teardown must not crash the process
      await closeWriters();
      await removeTempDir();
      if (responseClosed || (!req.complete && req.destroyed)) return; // nobody is waiting for an answer
      // Answer now and drop the connection after the response, instead of
      // reading the rest of the body.
      res.set("Connection", "close");
      req.resume();
      next(err);
    }

    function succeed() {
      if (settled || !parsed || writers.size > 0) return;
      settled = true;
      next();
    }

    // Every byte the body carries counts toward the request bound.
    function count(bytes) {
      totalBytes += bytes;
      if (totalBytes > maxRequestBytes) {
        fail(new WidgetizerError("Upload too large", { statusCode: 413, code: "UPLOAD_TOO_LARGE" }));
        return false;
      }
      return true;
    }

    req.on("error", (err) => fail(err));
    req.on("close", () => {
      if (!req.complete) fail(new Error("Upload aborted by the client"));
    });

    bb.on("field", (_name, value, info) => {
      if (settled) return;
      if (info.valueTruncated || info.nameTruncated) return fail(badRequest("Form field too large", "LIMIT_FIELD_VALUE"));
      count(Buffer.byteLength(value));
    });

    bb.on("file", (fieldname, stream, info) => {
      // Attached first: an unhandled part-stream error would crash the process.
      // busboy errors a part when the body ends inside it (a malformed form).
      stream.on("error", (err) => fail(badRequest(`Malformed upload: ${err.message}`, "MALFORMED_UPLOAD")));
      if (settled) {
        stream.resume();
        return;
      }
      if (fieldname !== FIELD_NAME) {
        stream.resume();
        return fail(badRequest(`Unexpected file field "${fieldname}"`, "LIMIT_UNEXPECTED_FILE"));
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
          return fail(filterErr ?? badRequest("File type not allowed"));
        }
        if (settled) {
          stream.resume();
          return;
        }
        entry.path = path.join(tempDir, `part-${index++}`);
        req.files.push(entry);

        let out;
        try {
          out = fs.createWriteStream(entry.path);
        } catch (err) {
          stream.resume();
          return fail(err);
        }
        writers.add(out);
        // A refused part's writer is destroyed mid-file, and a write still in
        // flight then errors with ERR_STREAM_DESTROYED. Any error after the
        // refusal is about bytes already being discarded, so it must not fail
        // the rest of the batch.
        out.on("error", (err) => {
          if (!entry.refused) fail(err);
        });
        out.on("close", () => {
          writers.delete(out);
          succeed();
        });

        stream.on("data", (chunk) => {
          if (settled) return;
          entry.size += chunk.length;
          if (!count(chunk.length)) return;
          if (entry.refused) return;
          if (entry.size > maxFileBytes) {
            entry.refused = true;
            const partPath = entry.path;
            entry.path = null;
            out.once("close", () => fs.rm(partPath, { force: true }, () => {}));
            out.destroy();
            stream.resume(); // it may be paused waiting on a write stream that is gone
            return;
          }
          if (!out.write(chunk)) {
            stream.pause();
            out.once("drain", () => stream.resume());
          }
        });
        stream.on("end", () => {
          if (!entry.refused && !settled) out.end();
        });
      });
    });

    bb.on("filesLimit", () =>
      fail(badRequest(`Too many files: at most ${MAX_UPLOAD_FILES} per upload`, "LIMIT_FILE_COUNT")),
    );
    bb.on("fieldsLimit", () => fail(badRequest("Too many form fields", "LIMIT_FIELD_COUNT")));
    bb.on("partsLimit", () => fail(badRequest("Too many parts", "LIMIT_PART_COUNT")));
    // busboy's errors are about the body it was sent (a malformed form).
    bb.on("error", (err) => fail(badRequest(`Malformed upload: ${err.message}`, "MALFORMED_UPLOAD")));
    bb.on("close", () => {
      parsed = true;
      succeed();
    });

    req.pipe(bb);
  };
}
