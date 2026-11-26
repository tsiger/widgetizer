// Reads the theme a project backup was made with, in the browser, without
// loading the backup: only the ZIP's directory and its small manifest entry are
// read from the file. The import dialog uses it to refuse a backup whose theme
// isn't installed before a long upload, so every failure here answers `null`
// ("can't tell") and leaves the decision to the server, which checks again.

const MANIFEST_ENTRY = "project-export.json";

const END_OF_DIRECTORY = 0x06054b50;
const DIRECTORY_ENTRY = 0x02014b50;
const LOCAL_HEADER = 0x04034b50;
// The end record is 22 bytes plus a comment of at most 65,535.
const END_SEARCH_BYTES = 22 + 0xffff;
// Far above what a real backup needs; a file claiming more isn't worth reading here.
const MAX_DIRECTORY_BYTES = 64 * 1024 * 1024;
const MAX_MANIFEST_BYTES = 5 * 1024 * 1024;

const STORED = 0;
const DEFLATED = 8;

async function readView(file, start, length) {
  if (start < 0 || length < 0 || start + length > file.size) return null;
  return new DataView(await file.slice(start, start + length).arrayBuffer());
}

// Inflates one entry, giving up once more comes out than the directory said
// the entry holds, so a small file can't be made to fill memory here.
async function inflate(file, start, length, expectedSize) {
  if (typeof DecompressionStream === "undefined") return null;
  const reader = file
    .slice(start, start + length)
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"))
    .getReader();
  const bytes = new Uint8Array(expectedSize);
  let filled = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (filled + value.byteLength > expectedSize) {
      await reader.cancel();
      return null;
    }
    bytes.set(value, filled);
    filled += value.byteLength;
  }
  return filled === expectedSize ? bytes : null;
}

async function findManifestEntry(file) {
  const tailLength = Math.min(file.size, END_SEARCH_BYTES);
  const tailStart = file.size - tailLength;
  const tail = await readView(file, tailStart, tailLength);
  if (!tail) return null;

  // The record's signature can also turn up inside its own comment, so a
  // candidate counts only when its comment runs exactly to the end of the file
  // and its directory fits in front of it.
  let directory = null;
  let entryCount = 0;
  for (let i = tail.byteLength - 22; i >= 0 && !directory; i--) {
    if (tail.getUint32(i, true) !== END_OF_DIRECTORY) continue;
    if (i + 22 + tail.getUint16(i + 20, true) !== tail.byteLength) continue;

    const count = tail.getUint16(i + 10, true);
    const directorySize = tail.getUint32(i + 12, true);
    const directoryStart = tail.getUint32(i + 16, true);
    // These values mean a ZIP64 archive (over 4 GB or 65,535 files), whose real
    // numbers live in another record. Left to the server.
    if (count === 0xffff || directorySize === 0xffffffff || directoryStart === 0xffffffff) return null;
    if (directorySize > MAX_DIRECTORY_BYTES) return null;
    if (directoryStart + directorySize > tailStart + i) continue;

    directory = await readView(file, directoryStart, directorySize);
    entryCount = count;
  }
  if (!directory) return null;

  const decoder = new TextDecoder();
  let at = 0;
  for (let n = 0; n < entryCount && at + 46 <= directory.byteLength; n++) {
    if (directory.getUint32(at, true) !== DIRECTORY_ENTRY) return null;
    const nameLength = directory.getUint16(at + 28, true);
    const extraLength = directory.getUint16(at + 30, true);
    const commentLength = directory.getUint16(at + 32, true);
    if (at + 46 + nameLength > directory.byteLength) return null;
    const name = decoder.decode(new Uint8Array(directory.buffer, directory.byteOffset + at + 46, nameLength));
    if (name === MANIFEST_ENTRY) {
      return {
        method: directory.getUint16(at + 10, true),
        compressedSize: directory.getUint32(at + 20, true),
        size: directory.getUint32(at + 24, true),
        headerStart: directory.getUint32(at + 42, true),
      };
    }
    at += 46 + nameLength + extraLength + commentLength;
  }
  return null;
}

async function readManifest(file) {
  const entry = await findManifestEntry(file);
  if (!entry) return null;
  if (entry.compressedSize > MAX_MANIFEST_BYTES || entry.size > MAX_MANIFEST_BYTES) return null;

  // The sizes come from the directory: a streamed ZIP leaves them empty in the
  // entry's own header, which is read only to find where the bytes begin.
  const header = await readView(file, entry.headerStart, 30);
  if (!header || header.getUint32(0, true) !== LOCAL_HEADER) return null;
  const dataStart = entry.headerStart + 30 + header.getUint16(26, true) + header.getUint16(28, true);
  if (dataStart + entry.compressedSize > file.size) return null;

  let bytes;
  if (entry.method === STORED) {
    if (entry.compressedSize !== entry.size) return null;
    bytes = await file.slice(dataStart, dataStart + entry.compressedSize).arrayBuffer();
  } else if (entry.method === DEFLATED) {
    bytes = await inflate(file, dataStart, entry.compressedSize, entry.size);
  }
  if (!bytes) return null;

  return JSON.parse(new TextDecoder().decode(bytes));
}

/**
 * The id of the theme a project backup needs.
 * @param {Blob} file - The backup ZIP
 * @returns {Promise<string|null>} The theme id, or `null` when the file can't be read that far
 */
export async function readBackupTheme(file) {
  try {
    const theme = (await readManifest(file))?.project?.theme;
    return typeof theme === "string" && theme ? theme : null;
  } catch {
    return null;
  }
}
