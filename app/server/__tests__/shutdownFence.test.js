import { describe, it, expect, afterAll } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const dataRoot = await fs.mkdtemp(path.join(os.tmpdir(), "wz shutdown fence "));
process.env.DATA_ROOT = dataRoot;
process.env.PORT = "0";

const { startOssServer } = await import("../../server-common.js");
const { acquireOwnerFence } = await import("../ownerFence.js");
const { closeDb } = await import("@widgetizer/builder-server");

afterAll(() => {
  closeDb();
});

describe("shutdown and the data folder lock", () => {
  it("keeps the folder owned after shutdown, since a handler can still be running", async () => {
    const { shutdown, releaseDataFolder } = await startOssServer({ defaultPort: 0 });
    await shutdown();
    await expect(acquireOwnerFence(dataRoot, { deadlineMs: 200 })).rejects.toMatchObject({ code: "ALREADY_RUNNING" });
    releaseDataFolder();
    (await acquireOwnerFence(dataRoot, { deadlineMs: 200 })).release();
  });
});
