import { describe, it, expect } from "vitest";
import { EventEmitter } from "node:events";
import { createEditorEvents } from "../jobs/events.js";

function connection(events, doc) {
  const req = new EventEmitter();
  req.query = { doc };
  const res = {
    writableEnded: false,
    chunks: [],
    writeHead() {},
    flushHeaders() {},
    write(chunk) {
      this.chunks.push(chunk);
    },
    end() {
      this.writableEnded = true;
    },
    status() {
      return this;
    },
    json() {},
  };
  const connected = events.connect(req, res);
  const prepared = () =>
    res.chunks
      .filter((chunk) => chunk.startsWith("event: prepare"))
      .map((chunk) => JSON.parse(chunk.split("data: ")[1]));
  return { req, res, connected, prepared, close: () => req.emit("close") };
}

function answer(events, doc, operation, clean) {
  let accepted = null;
  events.ready({ body: { doc, operation, clean } }, { json: (body) => (accepted = body.accepted) });
  return accepted;
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

describe("editor events", () => {
  it("asks a window that connects while the verdict is still open, even after the others answered", async () => {
    const events = createEditorEvents({ state: async () => ({ generation: 1 }) });
    const a = connection(events, "doc-aaaaaaaa");
    const b = connection(events, "doc-bbbbbbbb");
    const cohort = events.openCohort({ operation: "op-1", jobId: "job-1" });
    answer(events, "doc-aaaaaaaa", "op-1", true);
    const closing = cohort.close();
    await tick();
    const c = connection(events, "doc-cccccccc");
    expect(c.prepared()).toEqual([{ operation: "op-1", jobId: "job-1" }]);
    expect(answer(events, "doc-cccccccc", "op-1", false)).toBe(true);
    answer(events, "doc-bbbbbbbb", "op-1", true);
    expect(await closing).toEqual({ ok: false, reason: "unsaved" });
    for (const entry of [a, b, c]) entry.close();
  });

  it("asks a connecting window before it has been greeted", async () => {
    let release;
    const events = createEditorEvents({ state: () => new Promise((resolve) => (release = resolve)) });
    const cohort = events.openCohort({ operation: "op-2", jobId: "job-2" });
    const late = connection(events, "doc-dddddddd");
    expect(late.prepared()).toHaveLength(1);
    answer(events, "doc-dddddddd", "op-2", true);
    expect(await cohort.close()).toMatchObject({ ok: true, documents: 1 });
    release({ generation: 1 });
    await late.connected;
    late.close();
  });

  it("refuses a verdict with no window to ask", async () => {
    const events = createEditorEvents({ state: async () => ({}) });
    expect(await events.openCohort({ operation: "op-3", jobId: "job-3" }).close()).toEqual({ ok: false, reason: "no_editor" });
  });

  it("counts a window that leaves before answering as unreachable", async () => {
    const events = createEditorEvents({ state: async () => ({}) });
    const a = connection(events, "doc-eeeeeeee");
    await a.connected;
    const cohort = events.openCohort({ operation: "op-4", jobId: "job-4" });
    a.close();
    expect(await cohort.close()).toEqual({ ok: false, reason: "unreachable" });
  });

  it("ignores answers for another operation", async () => {
    const events = createEditorEvents({ state: async () => ({}) });
    const a = connection(events, "doc-ffffffff");
    await a.connected;
    events.openCohort({ operation: "op-5", jobId: "job-5" });
    expect(answer(events, "doc-ffffffff", "op-old", true)).toBe(false);
    a.close();
  });
});
