/**
 * Reading a backup's theme from the ZIP in the browser: only the directory and
 * the manifest entry are read, and anything unreadable answers null so the
 * server decides.
 */
import { describe, expect, it } from "vitest";
import { Buffer } from "node:buffer";
import { deflateRawSync } from "node:zlib";
import { readBackupTheme } from "../backupManifest";

// A minimal ZIP writer. `streamed` leaves the sizes out of each entry's own
// header (they follow the data instead), as the app's backup download does. `claimedSize`
// makes the directory understate what the entries unpack to.
function zip(entries, { streamed = false, comment = "", claimedSize } = {}) {
  const parts = [];
  const directory = [];
  let offset = 0;
  for (const { name, content, deflate = true } of entries) {
    const nameBytes = Buffer.from(name);
    const raw = Buffer.from(content);
    const data = deflate ? deflateRawSync(raw) : raw;
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(streamed ? 0x08 : 0, 6);
    header.writeUInt16LE(deflate ? 8 : 0, 8);
    header.writeUInt32LE(streamed ? 0 : data.length, 18);
    header.writeUInt32LE(streamed ? 0 : raw.length, 22);
    header.writeUInt16LE(nameBytes.length, 26);
    const descriptor = streamed ? Buffer.alloc(16) : Buffer.alloc(0);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(deflate ? 8 : 0, 10);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(claimedSize ?? raw.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    directory.push(central, nameBytes);
    parts.push(header, nameBytes, data, descriptor);
    offset += 30 + nameBytes.length + data.length + descriptor.length;
  }
  const directoryBytes = Buffer.concat(directory);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directoryBytes.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(Buffer.byteLength(comment), 20);
  return new File([...parts, directoryBytes, end, comment], "backup.zip");
}

const manifest = (project) => ({ name: "project-export.json", content: JSON.stringify({ formatVersion: 1, project }) });
const filler = { name: "uploads/images/photo.bin", content: "x".repeat(50_000) };

describe("readBackupTheme", () => {
  it("reads the theme from a backup as the app writes it", async () => {
    const file = zip([manifest({ name: "Brightside", theme: "arch" }), filler], { streamed: true });
    expect(await readBackupTheme(file)).toBe("arch");
  });

  it("reads a manifest that is stored uncompressed, wherever it sits in the ZIP", async () => {
    const file = zip([filler, { ...manifest({ name: "Brightside", theme: "meridian" }), deflate: false }]);
    expect(await readBackupTheme(file)).toBe("meridian");
  });

  it("finds the ZIP's directory behind a trailing comment", async () => {
    const file = zip([manifest({ name: "Brightside", theme: "arch" })], { comment: "made by hand ".repeat(40) });
    expect(await readBackupTheme(file)).toBe("arch");
  });

  it("isn't fooled by an end-of-ZIP marker inside the comment", async () => {
    const fake = Buffer.alloc(22);
    fake.writeUInt32LE(0x06054b50, 0);
    const file = zip([manifest({ name: "Brightside", theme: "arch" })], {
      comment: `note ${fake.toString("latin1")} and more text`,
    });
    expect(await readBackupTheme(file)).toBe("arch");
  });

  it("answers null when the manifest unpacks to more than the ZIP says it holds", async () => {
    const entry = manifest({ name: "Brightside", theme: "arch", notes: "x".repeat(200_000) });
    const file = zip([entry], { claimedSize: 64 });
    expect(await readBackupTheme(file)).toBeNull();
  });

  it("answers null for a ZIP with no manifest", async () => {
    expect(await readBackupTheme(zip([filler]))).toBeNull();
  });

  it("answers null for a manifest that names no theme, or isn't JSON", async () => {
    expect(await readBackupTheme(zip([manifest({ name: "Brightside" })]))).toBeNull();
    expect(await readBackupTheme(zip([manifest({ name: "Brightside", theme: 7 })]))).toBeNull();
    expect(await readBackupTheme(zip([{ name: "project-export.json", content: "{ not json" }]))).toBeNull();
  });

  it("answers null for a file that isn't a ZIP, an empty one and a cut-off one", async () => {
    expect(await readBackupTheme(new File(["plain text, long enough to search ".repeat(10)], "notes.zip"))).toBeNull();
    expect(await readBackupTheme(new File([], "empty.zip"))).toBeNull();
    const whole = zip([manifest({ name: "Brightside", theme: "arch" }), filler]);
    expect(await readBackupTheme(whole.slice(0, whole.size - 40))).toBeNull();
  });
});
