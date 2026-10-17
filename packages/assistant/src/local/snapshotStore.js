import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { SNAPSHOT_ID } from "../snapshots/index.js";

const SUFFIX = ".snapshot.gz";
const PROJECT_ID = /^[A-Za-z0-9_-]{1,64}$/;

async function syncDir(dir) {
  // Windows can't open a folder for syncing; the rename is still atomic there.
  if (process.platform === "win32") return;
  const handle = await fs.open(dir, "r");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

/** Snapshots as files under `<dataRoot>/assistant/snapshots/<projectId>/`. */
export function createLocalSnapshotStore({ dataRoot }) {
  const root = path.join(dataRoot, "assistant", "snapshots");

  function dirOf(scope) {
    if (!PROJECT_ID.test(String(scope?.projectId))) throw new Error("Invalid project id for a snapshot.");
    return path.join(root, scope.projectId);
  }

  function fileOf(scope, id) {
    if (!SNAPSHOT_ID.test(String(id))) throw new Error("Invalid snapshot id.");
    return path.join(dirOf(scope), `${id}${SUFFIX}`);
  }

  return {
    async put(scope, id, bytes) {
      const file = fileOf(scope, id);
      await fs.mkdir(path.dirname(file), { recursive: true });
      const temp = `${file}.${crypto.randomBytes(6).toString("hex")}.tmp`;
      try {
        const handle = await fs.open(temp, "wx");
        try {
          await handle.writeFile(bytes);
          await handle.sync();
        } finally {
          await handle.close();
        }
        await fs.rename(temp, file);
      } catch (error) {
        await fs.rm(temp, { force: true }).catch(() => {});
        throw error;
      }
      await syncDir(path.dirname(file));
    },

    async get(scope, id) {
      try {
        return await fs.readFile(fileOf(scope, id));
      } catch (error) {
        if (error.code === "ENOENT") return null;
        throw error;
      }
    },

    async delete(scope, id) {
      await fs.rm(fileOf(scope, id), { force: true });
    },

    async list(scope) {
      let names;
      try {
        names = await fs.readdir(dirOf(scope));
      } catch (error) {
        if (error.code === "ENOENT") return [];
        throw error;
      }
      const entries = [];
      for (const name of names) {
        if (!name.endsWith(SUFFIX)) continue;
        const id = name.slice(0, -SUFFIX.length);
        if (!SNAPSHOT_ID.test(id)) continue;
        const stat = await fs.stat(path.join(dirOf(scope), name)).catch(() => null);
        if (stat) entries.push({ id, size: stat.size });
      }
      return entries;
    },
  };
}
