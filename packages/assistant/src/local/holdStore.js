import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const SHA = /^[a-f0-9]{64}$/;

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
const PROJECT_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** Held media bytes as files under `<dataRoot>/assistant/held/<projectId>/<sha256>`. */
export function createLocalHoldStore({ dataRoot }) {
  const root = path.join(dataRoot, "assistant", "held");

  function dirOf(scope) {
    if (!PROJECT_ID.test(String(scope?.projectId))) throw new Error("Invalid project id for held media.");
    return path.join(root, scope.projectId);
  }

  function fileOf(scope, sha) {
    if (!SHA.test(String(sha))) throw new Error("Invalid held media id.");
    return path.join(dirOf(scope), sha);
  }

  return {
    async put(scope, sha, bytes) {
      const file = fileOf(scope, sha);
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
    async size(scope, sha) {
      const stat = await fs.stat(fileOf(scope, sha)).catch(() => null);
      return stat?.size ?? 0;
    },
    async get(scope, sha) {
      try {
        return await fs.readFile(fileOf(scope, sha));
      } catch (error) {
        if (error.code === "ENOENT") return null;
        throw error;
      }
    },
    async has(scope, sha) {
      try {
        await fs.access(fileOf(scope, sha));
        return true;
      } catch {
        return false;
      }
    },
    async list(scope) {
      try {
        return (await fs.readdir(dirOf(scope))).filter((name) => SHA.test(name));
      } catch (error) {
        if (error.code === "ENOENT") return [];
        throw error;
      }
    },
    async delete(scope, sha) {
      await fs.rm(fileOf(scope, sha), { force: true });
    },
  };
}
