import fs from "fs-extra";
import path from "path";
import zlib from "zlib";
import { Readable, Transform } from "stream";
import { pipeline } from "stream/promises";
import { isWithinDirectory } from "./pathSecurity.js";

/**
 * How many times its own size a ZIP may unpack to. Real project backups and
 * themes are mostly already-compressed images and fonts and unpack to little
 * more than their size; a page-text-only project is around 10–20 times. A ZIP
 * bomb is a small file that unpacks to thousands or millions of times its size,
 * which is the one thing this guards against: filling the user's disk.
 */
export const MAX_COMPRESSION_RATIO = 100;

/**
 * The most a single metadata file (a backup manifest, a theme.json) may hold
 * when it is read into memory to decide whether to unpack anything at all.
 * Real ones are a few kilobytes.
 */
const MAX_METADATA_BYTES = 16 * 1024 * 1024;

/** A ZIP refused before or while unpacking. `statusCode` is for the HTTP reply. */
export class UnsafeZipError extends Error {
  constructor(message) {
    super(message);
    this.name = "UnsafeZipError";
    this.statusCode = 400;
  }
}

const ZIP_BOMB_MESSAGE = `This ZIP file unpacks to more than ${MAX_COMPRESSION_RATIO} times its own size, which is how a malicious ZIP file (a "ZIP bomb") fills a disk. Nothing was unpacked from it.`;
const damaged = (entryName) => new UnsafeZipError(`This ZIP file is damaged and could not be read (${entryName}).`);

/**
 * Open a ZIP for reading. A file that is not a readable ZIP is refused rather
 * than failing as a server error.
 * @param {string} zipPath
 */
export async function openZip(zipPath) {
  const AdmZip = (await import("adm-zip")).default;
  try {
    return new AdmZip(zipPath);
  } catch {
    throw new UnsafeZipError("This file is not a readable ZIP file.");
  }
}

/** The byte budget for a ZIP of `zipSizeBytes`: everything unpacked from it, together. */
export function unpackBudget(zipSizeBytes) {
  return Math.max(1, zipSizeBytes) * MAX_COMPRESSION_RATIO;
}

/**
 * Stream one entry's unpacked bytes into `sink`, stopping as soon as they pass
 * `maxBytes`. The sizes a ZIP records about itself can be false, so the limit
 * applies to the bytes actually produced; the recorded length and CRC are then
 * checked, as adm-zip's own reader did, so a damaged entry is refused.
 * @returns {Promise<number>} bytes produced
 */
async function streamEntry(entry, maxBytes, sink, onTooLarge = () => new UnsafeZipError(ZIP_BOMB_MESSAGE)) {
  const { header } = entry;
  if (header.encrypted || header.flags & 1) {
    throw new UnsafeZipError(`This ZIP file contains an encrypted entry (${entry.entryName}), which cannot be read.`);
  }
  if (header.method !== 0 && header.method !== 8) {
    throw new UnsafeZipError(`This ZIP file uses a compression method this app cannot read (${entry.entryName}).`);
  }
  let compressed;
  try {
    compressed = entry.getCompressedData();
  } catch {
    throw damaged(entry.entryName);
  }
  // An empty file some writers store as "deflated" with no bytes at all, which
  // the inflater would otherwise read as a cut-off stream.
  if (compressed.length === 0 && Number(header.size) === 0) {
    await pipeline(Readable.from([]), sink);
    return 0;
  }

  let produced = 0;
  let crc = 0;
  const counter = new Transform({
    transform(chunk, _encoding, callback) {
      produced += chunk.length;
      if (produced > maxBytes) return callback(onTooLarge());
      crc = zlib.crc32(chunk, crc);
      callback(null, chunk);
    },
  });
  const stages = [Readable.from([compressed]), ...(header.method === 8 ? [zlib.createInflateRaw()] : []), counter, sink];
  try {
    await pipeline(...stages);
  } catch (error) {
    if (error instanceof UnsafeZipError) throw error;
    throw damaged(entry.entryName);
  }
  if (produced !== Number(header.size) || (typeof header.crc === "number" && crc >>> 0 !== header.crc >>> 0)) {
    throw damaged(entry.entryName);
  }
  return produced;
}

/**
 * Read one metadata entry (a manifest, a theme.json) into memory, within the
 * ZIP's budget and at most a size no real metadata file comes near.
 *
 * @param {object} entry - adm-zip entry
 * @param {number} zipSizeBytes - size of the ZIP file on disk
 * @returns {Promise<Buffer>}
 */
export async function readZipEntry(entry, zipSizeBytes) {
  const chunks = [];
  const collect = new Transform({
    transform(chunk, _encoding, callback) {
      chunks.push(chunk);
      callback();
    },
  });
  const limit = Math.min(unpackBudget(zipSizeBytes), MAX_METADATA_BYTES);
  const tooLarge = () =>
    limit === MAX_METADATA_BYTES
      ? new UnsafeZipError(`${entry.entryName} in this ZIP file is too large to be what it claims.`)
      : new UnsafeZipError(ZIP_BOMB_MESSAGE);
  await streamEntry(entry, limit, collect, tooLarge);
  return Buffer.concat(chunks);
}

/**
 * Where an entry lands under `root`, and its path relative to it with `/`
 * separators. An entry name has to be the plain path itself: a `.` or `..`
 * segment or an empty one (`a//b`, a leading `/`) would let one name stand for
 * another — slip past a check made on the name, or overwrite a file another
 * entry already wrote. `\` counts as a folder separator, as it did for adm-zip.
 */
function entryTarget(root, entryName) {
  // Some older Windows tools write `\` between folders; adm-zip read those as
  // folders too, so they are read the same way here.
  const segments = entryName.split("\\").join("/").split("/");
  if (segments.at(-1) === "") segments.pop(); // a directory entry's trailing slash
  if (!segments.length || segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new UnsafeZipError(`This ZIP file contains an unsafe path: ${entryName}`);
  }
  const target = path.resolve(root, ...segments);
  if (!isWithinDirectory(target, root)) {
    throw new UnsafeZipError(`This ZIP file contains an unsafe path: ${entryName}`);
  }
  return { target, relative: path.relative(root, target).split(path.sep).join("/") };
}

/**
 * Unpack an adm-zip archive into `destDir`, entry by entry, refusing it once
 * the bytes it unpacks to pass {@link MAX_COMPRESSION_RATIO} times the ZIP's own
 * size. Every entry must land inside `destDir` under its own plain name, and no
 * two entries may write the same file. Symlink entries are written as plain
 * files, as adm-zip itself does.
 *
 * A refusal throws {@link UnsafeZipError}; files already written stay in
 * `destDir` for the caller's cleanup, which already removes it on failure.
 *
 * @param {object} zip - adm-zip instance
 * @param {number} zipSizeBytes - size of the ZIP file on disk
 * @param {string} destDir
 * @param {{ skip?: (relativePath: string) => boolean }} [options] - entries to
 *   leave out, by their path inside the ZIP
 */
export async function extractZipSafely(zip, zipSizeBytes, destDir, { skip } = {}) {
  const budget = unpackBudget(zipSizeBytes);
  let entries;
  try {
    entries = zip.getEntries();
  } catch {
    throw new UnsafeZipError("This file is not a readable ZIP file.");
  }

  // A first look at what the ZIP claims, so an honest bomb is refused before
  // a byte is written. A false claim is caught below, on the real bytes.
  const claimed = entries.reduce((sum, entry) => sum + (Number(entry.header.size) || 0), 0);
  if (claimed > budget) throw new UnsafeZipError(ZIP_BOMB_MESSAGE);

  const root = path.resolve(destDir);
  await fs.ensureDir(root);
  const written = new Set();
  let total = 0;

  for (const entry of entries) {
    const { target, relative } = entryTarget(root, entry.entryName);
    if (skip?.(relative)) continue;
    if (entry.isDirectory) {
      await fs.ensureDir(target);
      continue;
    }
    // Case-insensitively, as the user's disk may be.
    const key = target.toLowerCase();
    if (written.has(key)) throw new UnsafeZipError(`This ZIP file contains the same file twice: ${entry.entryName}`);
    written.add(key);

    await fs.ensureDir(path.dirname(target));
    total += await streamEntry(entry, budget - total, fs.createWriteStream(target));
  }
}
