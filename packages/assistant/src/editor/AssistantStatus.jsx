import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiFetchJson } from "@widgetizer/editor-ui/lib/apiFetch";

const POLL_MS = 5000;

function describe(status, t) {
  if (!status) return null;
  if (!status.enabled) return t("appSettings.assistant.status.off");
  if (status.error) return t("appSettings.assistant.status.error", { error: status.error });
  if (!status.ready) return t("appSettings.assistant.status.starting");
  if (status.sessions.length > 0) {
    const names = [...new Set(status.sessions.map((session) => session.client.name))].join(", ");
    return t("appSettings.assistant.status.connected", { names });
  }
  return t("appSettings.assistant.status.ready");
}

/**
 * Live state of assistant access, shown under the setting. Reflects what the
 * server actually did, not the checkbox the user hasn't saved yet. `onStatus`
 * lets the page keep the checkbox in step when access changes elsewhere.
 */
export default function AssistantStatus({ onStatus }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let timer = null;
    const load = async () => {
      try {
        const next = await apiFetchJson("/api/assistant/status");
        if (!cancelled) {
          setStatus(next);
          onStatus?.(next);
        }
      } catch {
        if (!cancelled) setStatus(null);
      }
      if (!cancelled) timer = setTimeout(load, POLL_MS);
    };
    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [onStatus]);

  const line = describe(status, t);
  if (!line) return null;

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{line}</div>
      {status.enabled && !status.editorProtected && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("appSettings.assistant.status.browserOnly")}
        </div>
      )}
    </div>
  );
}
