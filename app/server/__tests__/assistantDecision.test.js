import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { EDITOR_CREDENTIAL_HEADER } from "@widgetizer/assistant/protocol";

const dataRoot = await fs.mkdtemp(path.join(os.tmpdir(), "wz decision "));
const SECRET = "test-editor-secret";
process.env.DATA_ROOT = dataRoot;
process.env.PORT = "0";
process.env.WIDGETIZER_EDITOR_SECRET = SECRET;

const { startOssServer } = await import("../../server-common.js");
const { closeDb } = await import("@widgetizer/builder-server");

let started;
let base;

async function putSettings(body) {
  const res = await fetch(`${base}/api/settings`, {
    method: "PUT",
    headers: { origin: base, "content-type": "application/json", [EDITOR_CREDENTIAL_HEADER]: SECRET },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

async function status() {
  const res = await fetch(`${base}/api/assistant/status`, { headers: { [EDITOR_CREDENTIAL_HEADER]: SECRET } });
  return res.json();
}

beforeAll(async () => {
  started = await startOssServer({ defaultPort: 0 });
  base = `http://127.0.0.1:${started.server.address().port}`;
});

afterAll(async () => {
  await started?.shutdown();
  delete process.env.WIDGETIZER_EDITOR_SECRET;
  closeDb();
  await fs.rm(dataRoot, { recursive: true, force: true });
});

describe("turning assistant access on in the desktop app", () => {
  it("refuses it from the editor's routes, even with the editor credential", async () => {
    const res = await putSettings({ assistant: { enabled: true }, general: { language: "el" } });
    expect(res.status).toBe(403);
    expect(res.data.code).toBe("DECISION_REQUIRED");
    expect(started.assistantAccess()).toEqual({ enabled: false });
    expect((await status()).editorProtected).toBe(true);
  });

  it("allows it through the app's own channel, and turning off from the editor", async () => {
    expect(await started.enableAssistant()).toEqual({ enabled: true });
    expect(await status()).toMatchObject({ enabled: true, ready: true });
    await expect(fs.stat(path.join(dataRoot, "assistant", "connection.json"))).resolves.toBeTruthy();

    expect((await putSettings({ assistant: { enabled: false } })).status).toBe(200);
    expect(started.assistantAccess()).toEqual({ enabled: false });
  });
});
