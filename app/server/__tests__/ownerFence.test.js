import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const root = await fs.mkdtemp(path.join(os.tmpdir(), "wz fence "));
const fenceModule = pathToFileURL(path.resolve(import.meta.dirname, "../ownerFence.js")).href;
const childScript = path.join(root, "starter.mjs");
const children = new Set();

beforeAll(async () => {
  await fs.writeFile(
    childScript,
    `const { acquireOwnerFence } = await import(${JSON.stringify(fenceModule)});
const [dataRoot, deadline, mode] = process.argv.slice(2);
process.stdout.write("ready\\n");
process.stdin.once("data", async () => {
  try {
    await acquireOwnerFence(dataRoot, { deadlineMs: Number(deadline) });
    process.stdout.write("owner\\n");
    if (mode === "block") Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0);
    setInterval(() => {}, 1000);
  } catch (error) {
    process.stdout.write((error.code || error.message) + "\\n");
    process.exit(0);
  }
});
`,
  );
});

async function killAll() {
  const exits = [...children].map((child) =>
    child.exitCode !== null || child.signalCode !== null ? null : new Promise((resolve) => child.once("exit", resolve)),
  );
  for (const child of children) child.kill("SIGKILL");
  children.clear();
  await Promise.all(exits);
}

afterEach(killAll);

afterAll(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

function starter(dataRoot, { deadline = 400, mode = "" } = {}) {
  const child = spawn(process.execPath, [childScript, dataRoot, String(deadline), mode], { stdio: ["pipe", "pipe", "inherit"] });
  children.add(child);
  const lines = [];
  let waiters = [];
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    lines.push(...chunk.split("\n").filter(Boolean));
    for (const waiter of waiters) waiter();
  });
  const line = (index) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("no answer from the starter")), 15000);
      const check = () => {
        if (lines.length > index) {
          clearTimeout(timer);
          waiters = waiters.filter((waiter) => waiter !== check);
          resolve(lines[index]);
        }
      };
      waiters.push(check);
      check();
    });
  return {
    child,
    ready: () => line(0),
    start: () => child.stdin.write("go\n"),
    answer: () => line(1),
    exited: () => new Promise((resolve) => (child.exitCode !== null ? resolve() : child.once("exit", resolve))),
  };
}

async function race(dataRoot, count, options) {
  const starters = Array.from({ length: count }, () => starter(dataRoot, options));
  await Promise.all(starters.map((entry) => entry.ready()));
  for (const entry of starters) entry.start();
  return { starters, answers: await Promise.all(starters.map((entry) => entry.answer())) };
}

async function only(dataRoot, options) {
  const entry = starter(dataRoot, options);
  await entry.ready();
  entry.start();
  return { entry, answer: await entry.answer() };
}

describe("owner fence", () => {
  it("refuses a second starter while the first runs, and admits one after it is killed", async () => {
    const dataRoot = path.join(root, "kill");
    const first = await only(dataRoot);
    expect(first.answer).toBe("owner");
    expect((await only(dataRoot)).answer).toBe("ALREADY_RUNNING");
    first.entry.child.kill("SIGKILL");
    await first.entry.exited();
    expect((await only(dataRoot)).answer).toBe("owner");
  });

  it("keeps the lock while the owner is stuck", async () => {
    const dataRoot = path.join(root, "stuck");
    expect((await only(dataRoot, { mode: "block" })).answer).toBe("owner");
    expect((await only(dataRoot)).answer).toBe("ALREADY_RUNNING");
  });

  it.runIf(process.platform !== "win32")("keeps the lock while the owner is suspended", async () => {
    const dataRoot = path.join(root, "suspended");
    const first = await only(dataRoot);
    first.entry.child.kill("SIGSTOP");
    expect((await only(dataRoot)).answer).toBe("ALREADY_RUNNING");
    first.entry.child.kill("SIGCONT");
  });

  it("lets exactly one of several simultaneous starters win, every time", async () => {
    for (let round = 0; round < 6; round += 1) {
      const dataRoot = path.join(root, `race-${round}`);
      if (round % 2) {
        const seed = await only(dataRoot);
        seed.entry.child.kill("SIGKILL");
        await seed.entry.exited();
      }
      const { answers } = await race(dataRoot, 4, { deadline: 1500 });
      expect(answers.filter((answer) => answer === "owner")).toHaveLength(1);
      expect(answers.filter((answer) => answer === "ALREADY_RUNNING")).toHaveLength(3);
      await killAll();
    }
  }, 120000);

  it("treats another spelling of the same folder as the same folder", async () => {
    const dataRoot = path.join(root, "Spelling");
    await fs.mkdir(dataRoot, { recursive: true });
    expect((await only(dataRoot)).answer).toBe("owner");
    const alias = path.join(root, "alias");
    if (process.platform === "win32") execFileSync("cmd.exe", ["/c", "mklink", "/J", alias, dataRoot], { windowsHide: true });
    else await fs.symlink(dataRoot, alias);
    expect((await only(alias)).answer).toBe("ALREADY_RUNNING");
    const caseInsensitive = process.platform === "win32" || process.platform === "darwin";
    if (caseInsensitive) expect((await only(path.join(root, "spelling"))).answer).toBe("ALREADY_RUNNING");
  });

  it("works under a long data folder path", async () => {
    const dataRoot = path.join(root, "long-".repeat(30), "data");
    expect((await only(dataRoot)).answer).toBe("owner");
    expect((await only(dataRoot)).answer).toBe("ALREADY_RUNNING");
  });
});
