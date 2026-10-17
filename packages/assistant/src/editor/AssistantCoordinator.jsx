import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { API_URL } from "@widgetizer/editor-ui/lib/config";
import { apiFetchJson } from "@widgetizer/editor-ui/lib/apiFetch";
import { saveAppSettings } from "@widgetizer/editor-ui/queries/appSettingsManager";
import { setSiteGeneration } from "@widgetizer/editor-ui/lib/siteGeneration";
import { setEditorLocked } from "@widgetizer/editor-ui/lib/editorLock";
import { hasUnsavedWork } from "@widgetizer/editor-ui/stores/unsavedRegistry";
import useAutoSave from "@widgetizer/editor-ui/stores/saveStore";
import useProjectStore from "@widgetizer/editor-ui/stores/projectStore";
import Button from "@widgetizer/editor-ui/components/ui/Button.jsx";

const DOCUMENT_ID = crypto.randomUUID().replaceAll("-", "");
const LOCK_AFTER_MS = 1500;
const UNDO_OFFER_MS = 60 * 60 * 1000;
const DISMISSED_KEY = "widgetizer.assistant.dismissedJobs";
const ARRIVED_KEY = "widgetizer.assistant.shownJobs";

// Once per finished job, an editor window goes to the page the job changed; the preview stays put.
function arrivalFor(finished) {
  const target = finished?.completion?.navigate;
  if (!target || window.location.pathname.startsWith("/preview")) return null;
  try {
    const shown = JSON.parse(sessionStorage.getItem(ARRIVED_KEY) ?? "[]");
    if (shown.includes(finished.id)) return null;
    sessionStorage.setItem(ARRIVED_KEY, JSON.stringify([finished.id, ...shown].slice(0, 20)));
  } catch {
    // Without storage the window still arrives; it just might again after a later reload.
  }
  const query = new URLSearchParams({ pageId: target.page, ...(target.language ? { language: target.language } : {}), ...(target.section ? { section: target.section } : {}) });
  return `/page-editor?${query}`;
}

function readDismissed() {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function dismiss(jobId) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([jobId, ...readDismissed()].slice(0, 20)));
  } catch {
    // The offer comes back after a reload; nothing else depends on it.
  }
}
const SAVE_SETTLE_MS = 4000;

async function savesSettled() {
  const until = Date.now() + SAVE_SETTLE_MS;
  while (useAutoSave.getState().isSaving && Date.now() < until) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

// Everything outside the overlay stops taking input while the window is locked, portals included.
function useInertOutside(active, overlayRef) {
  useEffect(() => {
    if (!active) return;
    const marked = new Set();
    const apply = () => {
      for (const element of document.body.children) {
        if (element === overlayRef.current || element.inert) continue;
        element.inert = true;
        marked.add(element);
      }
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true });
    return () => {
      observer.disconnect();
      for (const element of marked) element.inert = false;
    };
  }, [active, overlayRef]);
}

/**
 * Keeps this window in step with assistant jobs: it holds the app until it knows
 * which version of the site it is loading, answers whether it has unsaved work
 * before a job starts, locks while a job runs, and reloads once the site changed.
 */
export default function AssistantCoordinator({ children }) {
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);
  const [connected, setConnected] = useState(false);
  const [lostLongEnough, setLostLongEnough] = useState(false);
  const [job, setJob] = useState(null);
  const [missed, setMissed] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [lastFinished, setLastFinished] = useState(null);
  const [dismissed, setDismissed] = useState(readDismissed);
  const [undoError, setUndoError] = useState(null);
  const [, setClock] = useState(0);
  const activeSiteId = useProjectStore((state) => state.activeProject?.id ?? null);
  const [editorProtected, setEditorProtected] = useState(false);

  useEffect(() => {
    apiFetchJson("/api/assistant/status")
      .then((status) => setEditorProtected(Boolean(status?.editorProtected)))
      .catch(() => {});
  }, []);
  const baselineRef = useRef(null);
  const overlayRef = useRef(null);

  const reload = useCallback(() => {
    setReloading(true);
    window.location.reload();
  }, []);

  const consider = useCallback(
    ({ generation, job: openJob, lastFinished: finished }) => {
      setJob(openJob ?? null);
      setLastFinished(finished ?? null);
      if (generation == null) return;
      if (baselineRef.current == null) {
        baselineRef.current = generation;
        setSiteGeneration(generation);
        return;
      }
      if (generation === baselineRef.current || openJob) return;
      if (hasUnsavedWork()) setMissed(true);
      else {
        const target = arrivalFor(finished);
        if (target) {
          setReloading(true);
          window.location.assign(target);
        } else reload();
      }
    },
    [reload],
  );

  // Content loads only after the first hello, so the generation it was loaded at is never older than the baseline.
  useEffect(() => {
    // Without a live stream this window can't be asked before a job, so it shows the site but stays locked.
    if (typeof EventSource === "undefined") {
      let stopped = false;
      apiFetchJson("/api/assistant/jobs/state")
        .then(({ job: state }) => {
          if (stopped) return;
          consider(state ?? {});
          setReady(true);
        })
        .catch(() => {});
      return () => {
        stopped = true;
      };
    }
    const source = new EventSource(API_URL(`/api/assistant/events?doc=${DOCUMENT_ID}`));
    const read = (event) => JSON.parse(event.data);

    source.addEventListener("hello", (event) => {
      setConnected(true);
      consider(read(event));
      setReady(true);
    });
    source.addEventListener("state", (event) => consider(read(event)));
    source.addEventListener("site", (event) => {
      const { path } = read(event);
      setReloading(true);
      window.location.assign(typeof path === "string" && path.startsWith("/") ? path : "/pages");
    });
    source.addEventListener("prepare", async (event) => {
      const { operation, jobId } = read(event);
      setJob((current) => current ?? { id: jobId, state: "preparing" });
      await savesSettled();
      apiFetchJson("/api/assistant/editor/ready", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc: DOCUMENT_ID, operation, clean: !hasUnsavedWork() }),
      }).catch(() => {});
    });
    source.addEventListener("error", () => setConnected(false));
    return () => source.close();
  }, [consider]);

  useEffect(() => {
    if (connected) {
      setLostLongEnough(false);
      return;
    }
    const timer = setTimeout(() => setLostLongEnough(true), LOCK_AFTER_MS);
    return () => clearTimeout(timer);
  }, [connected]);

  const act = useCallback(async (path, body = {}) => {
    setBusy(true);
    setError(null);
    try {
      if (path === "turn-off") await saveAppSettings({ assistant: { enabled: false } });
      else await apiFetchJson(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }, []);

  const turnOff = (
    <Button variant="secondary" disabled={busy} onClick={() => act("turn-off")}>
      {t("assistantJob.turnOff")}
    </Button>
  );
  let message = null;
  let actions = null;
  if (reloading) message = t("assistantJob.reloading");
  else if (missed) {
    message = t("assistantJob.missed");
    actions = <Button onClick={reload}>{t("assistantJob.discard")}</Button>;
  } else if (job?.state === "awaiting_approval" || job?.state === "decision_needed") {
    const asking = job.state === "awaiting_approval";
    message = (
      <>
        {asking ? t("assistantJob.approvalAsk") : t("assistantJob.decision")}
        {asking && (
          <ul className="mt-2 list-disc pl-5">
            {(job.approval?.plan ?? []).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
        {editorProtected && <span className="mt-2 block text-slate-500">{t("assistantJob.answerInWindow")}</span>}
      </>
    );
    actions = (
      <>
        {!editorProtected && asking && (
          <>
            <Button loading={busy} onClick={() => act(`/api/assistant/approvals/${job.approval.id}`, { allow: true })}>
              {t("assistantJob.allow")}
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => act(`/api/assistant/approvals/${job.approval.id}`, { allow: false })}>
              {t("assistantJob.cancel")}
            </Button>
          </>
        )}
        {!editorProtected && !asking && (
          <>
            <Button loading={busy} onClick={() => act("/api/assistant/decision", { keep: true })}>
              {t("assistantJob.keepChanges")}
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => act("/api/assistant/decision", { keep: false })}>
              {t("assistantJob.undoChanges")}
            </Button>
          </>
        )}
        {asking && (
          <Button variant="secondary" disabled={busy} onClick={() => act("/api/assistant/jobs/stop")}>
            {t("assistantJob.stop")}
          </Button>
        )}
        {turnOff}
      </>
    );
  } else if (job?.state === "recovery_needed") {
    message = t("assistantJob.recovery");
    actions = (
      <>
        <Button loading={busy} onClick={() => act("/api/assistant/recovery/retry")}>
          {t("assistantJob.retry")}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => act("/api/assistant/recovery/keep")}>
          {t("assistantJob.keep")}
        </Button>
        {turnOff}
      </>
    );
  } else if (job && ["stopping", "restoring", "undoing"].includes(job.state)) message = t("assistantJob.stopping");
  else if (job) {
    message = t(job.state === "preparing" ? "assistantJob.preparing" : "assistantJob.working", { summary: job.summary ?? "" });
    actions = (
      <>
        <Button variant="secondary" loading={busy} onClick={() => act("/api/assistant/jobs/stop")}>
          {t("assistantJob.stop")}
        </Button>
        {turnOff}
      </>
    );
  } else if (lostLongEnough) message = t("assistantJob.connecting");

  const locked = Boolean(message);
  useInertOutside(locked, overlayRef);
  useEffect(() => setEditorLocked(locked), [locked]);

  // The last finished job belongs to the site that was open when it was announced; switching sites asks again.
  useEffect(() => {
    if (!activeSiteId) return;
    let stale = false;
    setUndoError(null);
    apiFetchJson("/api/assistant/jobs/state")
      .then(({ job: state }) => {
        if (!stale) setLastFinished(state?.lastFinished ?? null);
      })
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, [activeSiteId]);

  const offerEnds = lastFinished ? Date.parse(lastFinished.ended ?? 0) + UNDO_OFFER_MS : 0;
  const offerUndo =
    !locked &&
    lastFinished &&
    lastFinished.siteId === activeSiteId &&
    !dismissed.includes(lastFinished.id) &&
    Date.now() < offerEnds;

  useEffect(() => {
    if (!offerUndo) return;
    const timer = setTimeout(() => setClock((tick) => tick + 1), Math.max(0, offerEnds - Date.now()) + 50);
    return () => clearTimeout(timer);
  }, [offerUndo, offerEnds]);

  const undo = async () => {
    setBusy(true);
    setUndoError(null);
    try {
      await apiFetchJson("/api/assistant/jobs/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: lastFinished.id }),
      });
    } catch (failure) {
      setUndoError(failure.message);
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    dismiss(lastFinished.id);
    setDismissed(readDismissed());
    setUndoError(null);
  };

  return (
    <>
      {ready ? children : null}
      {locked &&
        createPortal(
          <div ref={overlayRef} className="fixed inset-0 z-[2147483000] flex items-start justify-center bg-slate-900/30 pt-24" role="alertdialog" aria-live="polite">
            <div className="mx-4 max-w-lg rounded-lg bg-white p-5 shadow-xl">
              <div className="text-sm text-slate-800">{message}</div>
              {error && <p className="mt-2 text-sm text-red-600">{t("assistantJob.failed", { error })}</p>}
              {actions && <div className="mt-4 flex gap-2">{actions}</div>}
            </div>
          </div>,
          document.body,
        )}
      {ready &&
        offerUndo &&
        createPortal(
          <div className="fixed bottom-4 right-4 z-[2147482000] max-w-sm rounded-lg bg-white p-4 shadow-xl ring-1 ring-slate-200" role="status">
            <p className="text-sm text-slate-800">{t("assistantJob.finished", { summary: lastFinished.summary ?? "" })}</p>
            {lastFinished.completion?.changes?.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
                {lastFinished.completion.changes.map((change) => (
                  <li key={change.label}>
                    {change.link ? (
                      <a className="underline" href={`/page-editor?${new URLSearchParams({ pageId: change.link.page, language: change.link.language ?? "" })}`}>
                        {change.label}
                      </a>
                    ) : (
                      change.label
                    )}
                    {change.notes?.map((note) => (
                      <span key={note} className="block text-slate-500">
                        {note}
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            )}
            {lastFinished.completion?.nextSteps?.length > 0 && (
              <>
                <p className="mt-2 text-sm font-semibold text-slate-800">{t("assistantJob.nextSteps")}</p>
                <ul className="list-disc pl-5 text-sm text-slate-700">
                  {lastFinished.completion.nextSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </>
            )}
            {undoError && <p className="mt-2 text-sm text-red-600">{undoError}</p>}
            <div className="mt-3 flex gap-2">
              <Button size="sm" loading={busy} onClick={undo}>
                {t("assistantJob.undo")}
              </Button>
              <Button size="sm" variant="secondary" disabled={busy} onClick={close}>
                {t("assistantJob.close")}
              </Button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
