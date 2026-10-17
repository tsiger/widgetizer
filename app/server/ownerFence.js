import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const LOCK_FILE = "owner.lock";
const DEADLINE_MS = 3000;

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class AlreadyRunningError extends Error {
  constructor() {
    super("Widgetizer is already running with this data folder.");
    this.code = "ALREADY_RUNNING";
  }
}

function tryAcquire(file) {
  const db = new Database(file, { timeout: 0 });
  try {
    db.pragma("locking_mode = EXCLUSIVE");
    db.exec("BEGIN EXCLUSIVE; COMMIT;");
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

/**
 * Holds an exclusive OS lock on a file in the data folder until `release`, so a second
 * Widgetizer on the same folder can't start. The OS drops the lock if the process dies.
 */
export async function acquireOwnerFence(dataRoot, { deadlineMs = DEADLINE_MS } = {}) {
  fs.mkdirSync(dataRoot, { recursive: true });
  const file = path.join(dataRoot, LOCK_FILE);
  const until = Date.now() + deadlineMs;
  for (;;) {
    try {
      const db = tryAcquire(file);
      return { release: () => db.close() };
    } catch (error) {
      if (error?.code !== "SQLITE_BUSY") throw error;
      // Two starters can block each other's acquisition without either winning, so back off and retry.
      if (Date.now() >= until) throw new AlreadyRunningError();
      await pause(25 + Math.random() * 125);
    }
  }
}
