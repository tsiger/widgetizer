import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { createAssistantOwnerStore } from "../assistantOwner.js";

const cleanups = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

async function openTwice() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "wz owner "));
  const file = path.join(dir, "widgetizer.db");
  const a = new Database(file);
  a.exec("CREATE TABLE app_settings (key TEXT PRIMARY KEY, value TEXT)");
  const b = new Database(file, { timeout: 50 });
  cleanups.push(async () => {
    a.close();
    b.close();
    await fs.rm(dir, { recursive: true, force: true });
  });
  return [createAssistantOwnerStore(a), createAssistantOwnerStore(b)];
}

describe("assistant owner store", () => {
  it("stores and clears the owner in the shared database", async () => {
    const [a, b] = await openTwice();
    expect(a.get()).toBeNull();
    a.transaction(() => a.set({ pid: 1, instanceId: "a" }));
    expect(b.get()).toEqual({ pid: 1, instanceId: "a" });
    b.transaction(() => b.clear());
    expect(a.get()).toBeNull();
  });

  it("holds other connections off while a transaction runs", async () => {
    const [a, b] = await openTwice();
    let blocked = false;
    a.transaction(() => {
      a.set({ pid: 1, instanceId: "a" });
      try {
        b.transaction(() => b.set({ pid: 2, instanceId: "b" }));
      } catch (error) {
        blocked = error.code === "SQLITE_BUSY";
      }
    });
    expect(blocked).toBe(true);
    expect(b.get().instanceId).toBe("a");
  });
});
