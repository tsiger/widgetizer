/**
 * Streaming a ZIP download to a client that may leave, over real HTTP.
 *
 * A dropped ZIP download must stop: the file it was reading gets closed, no
 * later file is opened, and the request handler finishes. A file that fails
 * partway must cut the download off rather than leave the client waiting.
 *
 * Run with: node --test packages/builder-server/src/tests/zipResponse.test.js
 */

import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import http from "http";
import { Readable } from "stream";
import AdmZip from "adm-zip";

const { streamZipToResponse } = await import("../utils/zipResponse.js");

let server;
let baseUrl;
let handler; // each test sets what the server does with its request

before(async () => {
  server = http.createServer((req, res) => handler(req, res));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

/** A source that never ends, like a very large file, and records being destroyed. */
function endlessSource(record) {
  return new Readable({
    read() {
      this.push(Buffer.alloc(64 * 1024, 7));
    },
    destroy(err, callback) {
      record.destroyed = true;
      callback(err);
    },
  });
}

const within = (promise, ms) =>
  Promise.race([promise.then(() => "settled", () => "settled"), new Promise((r) => setTimeout(() => r("pending"), ms))]);

describe("streamZipToResponse", () => {
  it("sends files, folders and generated content as one ZIP", async () => {
    const mtime = new Date("2026-01-02T03:04:05Z");
    handler = (_req, res) =>
      streamZipToResponse(res, [
        { name: "manifest.json", content: '{"a":1}' },
        { name: "assets/", directory: true, stats: { mode: 0o40755, mtime, isDirectory: () => true } },
        { name: "assets/a.txt", open: () => Readable.from([Buffer.from("hello")]) },
      ]);
    const zip = new AdmZip(Buffer.from(await (await fetch(baseUrl)).arrayBuffer()));
    const entries = Object.fromEntries(zip.getEntries().map((entry) => [entry.entryName, entry]));
    assert.deepEqual(Object.keys(entries).sort(), ["assets/", "assets/a.txt", "manifest.json"]);
    assert.equal(entries["assets/"].isDirectory, true);
    assert.equal(entries["manifest.json"].getData().toString(), '{"a":1}');
    assert.equal(entries["assets/a.txt"].getData().toString(), "hello");
  });

  it("stops when the client leaves: closes the file in progress, opens no other, and finishes", async () => {
    const active = { destroyed: false };
    const opened = [];
    let finished;
    handler = (_req, res) => {
      finished = streamZipToResponse(res, [
        { name: "big.bin", open: () => (opened.push("big.bin"), endlessSource(active)) },
        { name: "later.bin", open: () => (opened.push("later.bin"), Readable.from([Buffer.from("x")])) },
      ]);
    };
    const controller = new AbortController();
    const response = await fetch(baseUrl, { signal: controller.signal });
    await response.body.getReader().read(); // the download is under way
    controller.abort();

    assert.equal(await within(finished, 2000), "settled", "the handler must finish once the client is gone");
    await finished; // a client that leaves is not an error
    assert.equal(active.destroyed, true, "the file in progress must be closed, or its descriptor stays open");
    assert.deepEqual(opened, ["big.bin"], "no file may be opened after the client left");
  });

  it("closes a file that reports an error without closing itself", async () => {
    const failing = { destroyed: false };
    let finished;
    handler = (_req, res) => {
      finished = streamZipToResponse(res, [
        {
          name: "failing.bin",
          open: () => {
            const source = endlessSource(failing);
            setTimeout(() => source.emit("error", new Error("read failed")), 50);
            return source;
          },
        },
      ]);
    };
    await fetch(baseUrl)
      .then((response) => response.arrayBuffer())
      .catch(() => {});
    await assert.rejects(finished, /read failed/);
    assert.equal(failing.destroyed, true, "a failed file must be closed");
  });

  it("ignores a late error from a file already zipped", async () => {
    const first = Readable.from([Buffer.from("done")]);
    const second = { destroyed: false };
    let finished;
    handler = (_req, res) => {
      finished = streamZipToResponse(res, [
        { name: "first.txt", open: () => first },
        {
          name: "second.bin",
          open: () => {
            setTimeout(() => first.emit("error", new Error("late error")), 50);
            return endlessSource(second);
          },
        },
      ]);
    };
    const controller = new AbortController();
    const response = await fetch(baseUrl, { signal: controller.signal });
    const reader = response.body.getReader();
    await reader.read();
    await new Promise((resolve) => setTimeout(resolve, 150)); // the late error has fired
    controller.abort();
    await finished; // the late error did not fail the ZIP: the client leaving ended it
    assert.equal(second.destroyed, true, "the file in progress must be closed when the client leaves");
  });

  it("answers before any bytes when the entries fail at once, so the caller can still send an error", async () => {
    let outcome;
    handler = async (_req, res) => {
      // A walk whose first step fails, like an unreadable export folder.
      const failingWalk = {
        [Symbol.asyncIterator]: () => ({
          next: async () => {
            throw Object.assign(new Error("permission denied"), { code: "EACCES" });
          },
        }),
      };
      try {
        await streamZipToResponse(res, failingWalk);
        outcome = "resolved";
      } catch (err) {
        outcome = { headersSent: res.headersSent, destroyed: res.destroyed, message: err.message };
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Failed to download" }));
      }
    };
    const response = await fetch(baseUrl);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: "Failed to download" });
    assert.deepEqual(outcome, { headersSent: false, destroyed: false, message: "permission denied" });
  });

  it("cuts the download off when a file fails partway, and reports the failure", async () => {
    let finished;
    handler = (_req, res) => {
      finished = streamZipToResponse(res, [
        {
          name: "broken.bin",
          open: () => {
            let sent = false;
            return new Readable({
              read() {
                if (sent) return;
                sent = true;
                this.push(Buffer.alloc(64 * 1024, 1));
                setTimeout(() => this.destroy(new Error("disk read failed")), 100);
              },
            });
          },
        },
      ]);
    };
    const outcome = await Promise.race([
      fetch(baseUrl)
        .then((response) => response.arrayBuffer())
        .then(
          () => "completed",
          () => "cut off",
        ),
      new Promise((resolve) => setTimeout(() => resolve("still waiting"), 2000)),
    ]);
    assert.equal(outcome, "cut off");
    await assert.rejects(finished, /disk read failed/);
  });
});
