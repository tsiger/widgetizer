import { useState, useEffect } from "react";
import { Download, RefreshCw, X } from "lucide-react";

const CHANGELOG_URL = "https://docs.widgetizer.org/changelog";

export default function UpdateBanner() {
  const [state, setState] = useState(null); // null | "available" | "downloading" | "ready"
  const [version, setVersion] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updater = window.electronUpdater;
    if (!updater) return;

    updater.onUpdateAvailable((info) => {
      setVersion(info.version);
      setState("available");
    });

    updater.onDownloadProgress((info) => {
      setState("downloading");
      setProgress(info.percent);
    });

    updater.onUpdateDownloaded(() => {
      setState("ready");
    });
  }, []);

  const openChangelog = () => {
    if (window.electronUpdater?.openExternal) {
      window.electronUpdater.openExternal(CHANGELOG_URL);
      return;
    }

    window.open(CHANGELOG_URL, "_blank", "noopener,noreferrer");
  };

  if (!state) return null;

  return (
    <div className="bg-pink-600 text-white px-4 min-h-10 py-2 flex items-center justify-center gap-3 text-sm flex-wrap">
      {state === "available" && (
        <>
          <span>Version {version} is available</span>
          <button
            onClick={openChangelog}
            className="inline-flex items-center gap-1.5 bg-white/12 hover:bg-white/22 rounded px-3 py-1 text-xs font-medium transition-colors"
          >
            View changelog
          </button>
          <button
            onClick={() => window.electronUpdater.downloadUpdate()}
            className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 rounded px-3 py-1 text-xs font-medium text-white transition-colors"
          >
            <Download size={14} />
            Update
          </button>
          <button
            onClick={() => setState(null)}
            className="ml-1 hover:bg-white/20 rounded p-0.5 transition-colors"
          >
            <X size={14} />
          </button>
        </>
      )}

      {state === "downloading" && (
        <>
          <span>Downloading update... {progress}%</span>
          <div className="w-32 h-1.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </>
      )}

      {state === "ready" && (
        <>
          <span>Update ready — restart to apply</span>
          <button
            onClick={() => window.electronUpdater.installUpdate()}
            className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 rounded px-3 py-1 text-xs font-medium transition-colors"
          >
            <RefreshCw size={14} />
            Restart Now
          </button>
        </>
      )}
    </div>
  );
}
