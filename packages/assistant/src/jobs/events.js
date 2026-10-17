import crypto from "node:crypto";

const DOCUMENT_ID = /^[A-Za-z0-9_-]{8,64}$/;
const HEARTBEAT_MS = 15000;
const ANSWER_DEADLINE_MS = 5000;

/**
 * The live channel to editor windows. Each window is one document with an id it
 * made at load; reconnects keep the id. A cohort asks every connected document,
 * and every document that connects while it is open, whether it has unsaved work.
 *
 * @param {{ state: () => Promise<object>, now?: () => number, heartbeatMs?: number, deadlineMs?: number }} options
 */
export function createEditorEvents({ state, now = Date.now, heartbeatMs = HEARTBEAT_MS, deadlineMs = ANSWER_DEADLINE_MS }) {
  const documents = new Map();
  let cohort = null;

  function send(res, event, data) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  function broadcast(event, data) {
    for (const connections of documents.values()) for (const res of connections) send(res, event, data);
  }

  function sendTo(doc, event, data) {
    for (const res of documents.get(doc) ?? []) send(res, event, data);
  }

  function openCohort({ operation, jobId }) {
    const members = new Map();
    const waiters = new Set();
    let closed = false;
    let cancelled = false;

    const add = (doc) => {
      if (closed || members.has(doc)) return;
      const member = { answer: null, timer: null };
      member.timer = setTimeout(() => {
        if (member.answer === null) member.answer = "unreachable";
        wake();
      }, deadlineMs);
      member.timer.unref?.();
      members.set(doc, member);
      sendTo(doc, "prepare", { operation, jobId });
    };

    function verdict() {
      if (cancelled) return { ok: false, reason: "cancelled" };
      if (members.size === 0) return { ok: false, reason: "no_editor" };
      for (const member of members.values()) {
        if (member.answer === "dirty") return { ok: false, reason: "unsaved" };
        if (member.answer === "unreachable") return { ok: false, reason: "unreachable" };
      }
      if ([...members.values()].some((member) => member.answer === null)) return null;
      return { ok: true, documents: members.size };
    }

    function wake() {
      for (const waiter of [...waiters]) waiter();
    }

    const wait = () =>
      new Promise((resolve) => {
        const check = () => {
          const result = verdict();
          if (!result) return;
          waiters.delete(check);
          resolve(result);
        };
        waiters.add(check);
        check();
      });

    const entry = {
      operation,
      add,
      answer(doc, clean) {
        const member = members.get(doc);
        if (!member || member.answer !== null) return false;
        member.answer = clean ? "clean" : "dirty";
        clearTimeout(member.timer);
        wake();
        return true;
      },
      gone(doc) {
        const member = members.get(doc);
        if (member && member.answer === null) {
          member.answer = "unreachable";
          clearTimeout(member.timer);
          wake();
        }
      },
      size: () => members.size,
      /** Every member so far has answered clean, or one didn't. */
      settled: wait,
      /** The verdict over everyone admitted until it is reached; then admits no one. Callers act on it without awaiting. */
      async close() {
        const result = await wait();
        closed = true;
        dispose();
        return result;
      },
      cancel() {
        cancelled = true;
        wake();
        dispose();
      },
    };

    function dispose() {
      for (const member of members.values()) clearTimeout(member.timer);
      if (cohort === entry) cohort = null;
    }

    cohort = entry;
    for (const doc of documents.keys()) add(doc);
    return entry;
  }

  async function connect(req, res) {
    const doc = String(req.query.doc ?? "");
    if (!DOCUMENT_ID.test(doc)) return res.status(400).json({ error: "A document id is required." });
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders?.();
    let connections = documents.get(doc);
    if (!connections) documents.set(doc, (connections = new Set()));
    connections.add(res);
    cohort?.add(doc);
    const heartbeat = setInterval(() => res.write(": ping\n\n"), heartbeatMs);
    heartbeat.unref?.();
    req.on("close", () => {
      clearInterval(heartbeat);
      connections.delete(res);
      if (connections.size === 0) {
        documents.delete(doc);
        cohort?.gone(doc);
      }
    });
    const hello = await state();
    if (!res.writableEnded) send(res, "hello", { connection: crypto.randomUUID(), at: now(), ...hello });
  }

  function ready(req, res) {
    const { doc, operation, clean } = req.body ?? {};
    const accepted = Boolean(cohort && cohort.operation === operation && typeof clean === "boolean" && cohort.answer(String(doc), clean));
    res.json({ accepted });
  }

  return {
    connect,
    ready,
    broadcast,
    openCohort,
    hasDocuments: () => documents.size > 0,
    close() {
      cohort?.cancel();
      for (const connections of documents.values()) for (const res of connections) res.end();
      documents.clear();
    },
  };
}
