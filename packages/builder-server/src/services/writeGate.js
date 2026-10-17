import { AsyncLocalStorage } from "node:async_hooks";

// Checked by withContentWriteLock after it acquires the section, so a write queued before the gate closed is still refused.

export const SITE_GENERATION_HEADER = "x-site-generation";

const writers = new AsyncLocalStorage();
const UNIDENTIFIED = Object.freeze({ kind: "editor", baseline: null });
let gate = null;
let changeObserver = null;
let requestWriterResolver = null;

export function runAsWriter(writer, fn) {
  return writers.run(Object.freeze({ ...writer }), fn);
}

export function currentWriter() {
  return writers.getStore() ?? UNIDENTIFIED;
}

// Lets the shell recognise its own requests made on a job's behalf; null keeps the editor writer.
export function setRequestWriterResolver(next) {
  requestWriterResolver = next ?? null;
}

export function writerFromRequest(req) {
  const resolved = requestWriterResolver?.(req);
  if (resolved) return resolved;
  const baseline = req.get(SITE_GENERATION_HEADER);
  return { kind: "editor", baseline: baseline ? String(baseline).slice(0, 64) : null };
}

// Multipart parsers resume in another async context, so this runs again after them.
export function bindRequestWriter(req, res, next) {
  runAsWriter(writerFromRequest(req), next);
}

export function setWriteGate(next) {
  gate = next ?? null;
}

export async function checkWriteGate(projectId) {
  if (gate) await gate.check(projectId, currentWriter());
}

// Which site is open is shared by every window, so changing it is a write the gate rules on too.
export function checkActiveSiteChange() {
  gate?.checkActiveSite?.(currentWriter());
}

// Controllers answer most failures with a generic 500; a refusal must reach the error handler as a 423.
export function rethrowIfLocked(error) {
  if (error?.statusCode === 423) throw error;
}

// For writes a read makes along the way (uuid backfills): refused means skipped, and the read still answers.
export async function runMaintenanceWrite(fn) {
  try {
    await runAsWriter({ kind: "maintenance" }, fn);
    return true;
  } catch (error) {
    if (error?.statusCode === 423) return false;
    throw error;
  }
}

export function setChangeObserver(next) {
  changeObserver = next ?? null;
}

// Called before a change the content files and rows don't show (asset bytes, theme files), so Undo can tell.
export async function noteSiteChange(projectId, kind) {
  if (changeObserver) await changeObserver(projectId, kind);
}
