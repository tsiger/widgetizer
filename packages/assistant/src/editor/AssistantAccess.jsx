import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiFetchJson } from "@widgetizer/editor-ui/lib/apiFetch";
import { saveAppSettings } from "@widgetizer/editor-ui/queries/appSettingsManager";
import Button from "@widgetizer/editor-ui/components/ui/Button.jsx";
import useToastStore from "@widgetizer/editor-ui/stores/toastStore";

const POLL_MS = 5000;

function describe(status, t) {
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
 * The AI Assistant tab: what the server actually did, and the switch. In the
 * desktop app, turning access on goes through the app's own prompt, which page
 * code can't answer; elsewhere it is an ordinary settings change.
 */
export default function AssistantAccess() {
  const { t } = useTranslation();
  const showToast = useToastStore((state) => state.showToast);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const reloadRef = useRef(() => {});

  useEffect(() => {
    let cancelled = false;
    let timer = null;
    let latest = 0;
    const load = async () => {
      const current = ++latest;
      clearTimeout(timer);
      let next = null;
      try {
        next = await apiFetchJson("/api/assistant/status");
      } catch {
        // Keep the last known state through a passing failure.
      }
      if (cancelled || current !== latest) return;
      if (next) setStatus(next);
      timer = setTimeout(load, POLL_MS);
    };
    reloadRef.current = load;
    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const turnOn = useCallback(async () => {
    if (!status.editorProtected) return saveAppSettings({ assistant: { enabled: true } });
    const requestEnable = window.electronAssistant?.requestEnable;
    if (!requestEnable) throw new Error(t("appSettings.assistant.desktopOnly"));
    const { result } = await requestEnable();
    if (result === "unknown" || result === "unavailable") throw new Error(t("appSettings.assistant.notConfirmed"));
  }, [status, t]);

  const toggle = async () => {
    setBusy(true);
    try {
      if (status.enabled) await saveAppSettings({ assistant: { enabled: false } });
      else await turnOn();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      await reloadRef.current();
      setBusy(false);
    }
  };

  if (!status) return null;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium text-slate-800">{t("appSettings.assistant.enabled.label")}</h3>
        <p className="mt-1 text-sm text-slate-500">{t("appSettings.assistant.enabled.description")}</p>
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={toggle} loading={busy} variant={status.enabled ? "secondary" : "primary"}>
          {status.enabled ? t("appSettings.assistant.turnOff") : t("appSettings.assistant.turnOn")}
        </Button>
      </div>
      <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{describe(status, t)}</div>
      {status.enabled && !status.editorProtected && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("appSettings.assistant.status.browserOnly")}
        </div>
      )}
    </div>
  );
}
