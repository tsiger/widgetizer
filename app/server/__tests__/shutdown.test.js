import { describe, it, expect, afterAll } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import http from "node:http";

const dataRoot = await fs.mkdtemp(path.join(os.tmpdir(), "wz shutdown "));
process.env.DATA_ROOT = dataRoot;
process.env.PORT = "0";

const { startOssServer } = await import("../../server-common.js");
const { closeDb } = await import("@widgetizer/builder-server");

afterAll(async () => {
  closeDb();
  await fs.rm(dataRoot, { recursive: true, force: true });
});

describe("server shutdown", () => {
  it("lets a save that was already running finish before closing", async () => {
    const { server, shutdown, releaseDataFolder } = await startOssServer({ defaultPort: 0 });
    const port = server.address().port;
    const body = JSON.stringify({ general: { language: "en" } });

    const response = new Promise((resolve, reject) => {
      const req = http.request(
        {
          host: "127.0.0.1",
          port,
          method: "PUT",
          path: "/api/settings",
          headers: {
            host: `127.0.0.1:${port}`,
            origin: `http://127.0.0.1:${port}`,
            "content-type": "application/json",
            "content-length": Buffer.byteLength(body),
          },
        },
        (res) => {
          res.resume();
          res.on("end", () => resolve(res.statusCode));
        },
      );
      req.on("error", reject);
      req.write(body.slice(0, 5));
      setTimeout(() => req.end(body.slice(5)), 300);
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
    const stopped = shutdown();
    expect(await response).toBe(200);
    await stopped;
    releaseDataFolder();
  });
});
