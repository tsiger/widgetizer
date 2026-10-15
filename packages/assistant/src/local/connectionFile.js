import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { BRIDGE_PROTOCOL, CONNECTION_DIR, CONNECTION_FILE, CONNECTION_FILE_FORMAT } from "../protocol.js";

const run = promisify(execFile);

function systemTool(...segments) {
  return path.join(process.env.SystemRoot || "C:/Windows", "System32", ...segments);
}

// Who may keep access to the private folder on Windows besides the user: SYSTEM and
// Administrators, as SIDs or their SDDL aliases. Anything else exposes the token.
const WINDOWS_ALLOWED_SIDS = new Set(["S-1-5-18", "SY", "S-1-5-32-544", "BA"]);

async function currentUserSid() {
  const { stdout } = await run(systemTool("whoami.exe"), ["/user", "/fo", "csv", "/nh"], { windowsHide: true });
  const sid = stdout.trim().split(",").pop()?.replace(/"/g, "");
  if (!sid?.startsWith("S-1-")) throw new Error("Couldn't determine the current Windows user.");
  return sid;
}

async function grantedSids(dir) {
  const saved = path.join(os.tmpdir(), `widgetizer-acl-${process.pid}-${Date.now()}.txt`);
  try {
    await run(systemTool("icacls.exe"), [dir, "/save", saved], { windowsHide: true });
    const sddl = await fs.readFile(saved, "utf16le");
    return [...sddl.matchAll(/\(A;[^;]*;[^;]*;[^;]*;[^;]*;([^;)]+)\)/g)].map((match) => match[1]);
  } finally {
    await fs.rm(saved, { force: true });
  }
}

async function lockDownWindowsDir(dir) {
  const sid = await currentUserSid();
  await run(
    systemTool("icacls.exe"),
    [dir, "/inheritance:r", "/grant:r", `*${sid}:(OI)(CI)F`, "*S-1-5-18:(OI)(CI)F"],
    { windowsHide: true },
  );
  const granted = await grantedSids(dir);
  const foreign = granted.filter((entry) => entry !== sid && !WINDOWS_ALLOWED_SIDS.has(entry));
  if (!granted.includes(sid) || foreign.length > 0) {
    throw new Error("Couldn't make the assistant connection folder private to this user.");
  }
}

async function ensurePrivateDir(dir) {
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  if (process.platform === "win32") {
    await lockDownWindowsDir(dir);
    return;
  }
  await fs.chmod(dir, 0o700);
  const stat = await fs.stat(dir);
  if ((stat.mode & 0o077) !== 0 || (typeof process.getuid === "function" && stat.uid !== process.getuid())) {
    throw new Error("Couldn't make the assistant connection folder private to this user.");
  }
}

function processAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

/**
 * Whether the recorded owner may still be a running Widgetizer. Only proof counts
 * as gone: its process is dead, its address refuses connections, or a different
 * instance answers there. Anything ambiguous (slow, reset, odd reply) keeps it.
 */
export async function ownerStillRunning(owner) {
  if (!processAlive(owner?.pid)) return false;
  if (!owner.url) return true;
  let res;
  try {
    res = await fetch(new URL("/api/assistant/bridge/hello", owner.url), {
      redirect: "error",
      signal: AbortSignal.timeout(1500),
    });
  } catch (error) {
    return error?.cause?.code !== "ECONNREFUSED";
  }
  if (!res.ok) return true;
  try {
    const body = await res.json();
    if (body?.app === "widgetizer" && typeof body.instanceId === "string") return body.instanceId === owner.instanceId;
  } catch {
    // An unreadable reply proves nothing about who is there.
  }
  return true;
}

function sameOwner(a, b) {
  return a?.instanceId === b?.instanceId && a?.pid === b?.pid;
}

/**
 * Publishes how a relay reaches this running app: one private file per data folder.
 *
 * Which Widgetizer owns the folder is decided in `ownerStore`, whose transactions
 * are exclusive across processes (the shared database), and every write or removal
 * of the file happens inside such a transaction after re-checking ownership. So a
 * stale observation can't displace a newer owner, and a displaced owner can't touch
 * its successor's file. A recorded owner that is no longer running is taken over.
 *
 * @param {{
 *   dataRoot: string,
 *   ownerStore: { transaction: (fn: () => any) => any, get: () => object|null, set: (owner: object) => void, clear: () => void },
 *   isOwnerRunning?: (owner: object) => Promise<boolean>,
 * }} options - `ownerStore.transaction` runs `fn` synchronously and exclusively.
 */
export function createConnectionFile({ dataRoot, ownerStore, isOwnerRunning = ownerStillRunning }) {
  const dir = path.join(dataRoot, CONNECTION_DIR);
  const file = path.join(dir, CONNECTION_FILE);
  let owned = null;

  const ownedBy = (instanceId) => ownerStore.get()?.instanceId === instanceId;

  async function acquire({ url, instanceId }) {
    const me = { pid: process.pid, instanceId, url };
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const seen = ownerStore.get();
      if (seen && seen.instanceId !== instanceId && (await isOwnerRunning(seen))) {
        throw new Error("Another Widgetizer is already using this data folder for assistant access.");
      }
      const claimed = ownerStore.transaction(() => {
        const current = ownerStore.get();
        if (current?.instanceId === instanceId) return true;
        if (!sameOwner(current, seen)) return false;
        ownerStore.set(me);
        return true;
      });
      if (claimed) {
        owned = instanceId;
        return;
      }
    }
    throw new Error("Couldn't claim this data folder for assistant access.");
  }

  return {
    path: file,
    async publish({ url, token, instanceId }) {
      await ensurePrivateDir(dir);
      await acquire({ url, instanceId });
      const record = {
        format: CONNECTION_FILE_FORMAT,
        app: "widgetizer",
        url,
        token,
        instanceId,
        pid: process.pid,
        bridge: BRIDGE_PROTOCOL,
        writtenAt: new Date().toISOString(),
      };
      const temp = `${file}.${process.pid}.tmp`;
      ownerStore.transaction(() => {
        if (!ownedBy(instanceId)) {
          owned = null;
          throw new Error("Another Widgetizer took over assistant access for this data folder.");
        }
        fsSync.writeFileSync(temp, JSON.stringify(record, null, 2), { mode: 0o600 });
        fsSync.renameSync(temp, file);
      });
    },
    async unpublish(instanceId) {
      ownerStore.transaction(() => {
        if (ownedBy(instanceId)) fsSync.rmSync(file, { force: true });
      });
    },
    async close() {
      if (!owned) return;
      const instanceId = owned;
      owned = null;
      ownerStore.transaction(() => {
        if (!ownedBy(instanceId)) return;
        fsSync.rmSync(file, { force: true });
        ownerStore.clear();
      });
    },
  };
}
