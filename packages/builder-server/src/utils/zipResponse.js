import { ZipArchive } from "archiver";
import { pipeline } from "stream";

/**
 * Stream a ZIP built from `entries` as the response body, and stop cleanly
 * when the client leaves.
 *
 * Archiver alone can't stop a download whose client left: `abort()` drops the
 * queue but leaves the entry in progress reading its file, the file streams
 * `archive.file()`/`archive.directory()` open are internal and out of reach,
 * and `finalize()` never settles after an abort. So entries go in one at a time
 * here, each file opened by its own `open()` only when its turn comes; the one
 * open stream is always reachable, and `finalize()` runs only once everything
 * went in.
 *
 * Each entry is one of:
 *   - `{ name, content }` — a string or Buffer;
 *   - `{ name, open, stats? }` — `open()` returns a Readable with the file's bytes;
 *   - `{ name, directory: true, stats? }` — a folder entry (`name` ends in `/`);
 *   - `{ name, symlink, mode? }` — a symbolic link to `symlink`, stored as a link.
 * `stats` (an `fs.Stats`) gives the entry its mode and date, as archiver's own
 * file entries have.
 *
 * Resolves once the ZIP was sent, or once the client left (routine, not an
 * error). Rejects with the failure when an entry, the walk producing `entries`,
 * or archiver fails. The first entry is taken before anything is sent, so a walk
 * that fails at once (an unreadable folder) leaves the response untouched for
 * the caller to answer with an error status; any later failure cuts the
 * download off, since its headers are gone by then.
 *
 * @param {import('http').ServerResponse} res
 * @param {Iterable<object>|AsyncIterable<object>} entries
 * @param {{ zlibLevel?: number }} [options]
 */
export async function streamZipToResponse(res, entries, { zlibLevel = 9 } = {}) {
  const iterator = entries[Symbol.asyncIterator]?.() ?? entries[Symbol.iterator]();
  let next = await iterator.next();

  const archive = new ZipArchive({ zlib: { level: zlibLevel } });
  let current = null; // the file stream being read, if any
  let clientGone = false;
  let failure = null;
  let wakeTurn = null;
  const wake = () => {
    const resolve = wakeTurn;
    wakeTurn = null;
    resolve?.();
  };

  // Whichever happens first decides: tearing down after a failure also closes
  // the response, and a client leaving also makes archiver report an error.
  res.once("close", () => {
    if (res.writableFinished || failure) return;
    clientGone = true;
    current?.destroy();
    wake();
  });
  archive.on("error", (err) => {
    if (clientGone || failure) return;
    failure = err;
    current?.destroy();
    wake();
  });
  archive.on("entry", wake);

  const sent = new Promise((resolve) => pipeline(archive, res, () => resolve()));

  function append(entry) {
    const data = { name: entry.name, ...(entry.stats ? { stats: entry.stats } : {}) };
    if (entry.directory) {
      archive.append(null, { ...data, type: "directory" });
    } else if (entry.symlink) {
      archive.symlink(entry.name, entry.symlink, entry.mode);
    } else if (entry.open) {
      const source = entry.open();
      current = source;
      // Archiver's zip module pipes the source without watching it, so an error
      // would otherwise surface as an uncaught exception and stall the download.
      // The listener stays for the stream's life: an error after its entry is in
      // the ZIP only closes it, and must not fail or wake a later entry.
      source.on("error", (err) => {
        source.destroy();
        if (source !== current || clientGone || failure) return;
        failure = err;
        wake();
      });
      archive.append(source, data);
    } else {
      archive.append(entry.content, data);
    }
  }

  try {
    while (!next.done && !clientGone && !failure) {
      const turn = new Promise((resolve) => (wakeTurn = resolve));
      append(next.value);
      await turn;
      if (clientGone || failure) break;
      current = null;
      next = await iterator.next();
    }
  } catch (err) {
    if (!clientGone && !failure) failure = err;
  }

  if (clientGone || failure) {
    current?.destroy();
    await iterator.return?.();
    archive.abort();
    if (!archive.destroyed) archive.destroy();
  } else {
    archive.finalize().catch(() => {}); // a failure reaches the "error" listener as well
  }
  await sent;
  if (failure) throw failure;
}
