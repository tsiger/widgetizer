import { AlertTriangle } from "lucide-react";
import useStaleProjectStore from "../../stores/staleProjectStore.js";
import useProjectStore from "../../stores/projectStore.js";

// Blocking, non-destructive overlay shown when this tab's view is out of date
// (another tab/window switched the singleton active project). Reload re-bootstraps
// to the new active project. Auto-dismisses when the focus/visibility revalidation
// clears the stale flag (e.g. the user re-activated this project elsewhere). Not
// backdrop-dismissable on purpose — the tab can't save while stale, so recovery is
// Reload or re-activating this project in the other tab, not ignoring the notice.
export default function StaleProjectCurtain({ onReload = () => window.location.reload() }) {
  const isStale = useStaleProjectStore((s) => s.isStale);
  const incomingName = useStaleProjectStore((s) => s.incomingName);
  // This tab's own project — its store was never updated cross-tab, so it still
  // names the (now-stale) project this view is showing.
  const localName = useProjectStore((s) => s.activeProject?.name);
  if (!isStale) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="stale-project-title"
    >
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full overflow-hidden">
        <div className="p-4 bg-yellow-50 flex items-start gap-3">
          <AlertTriangle className="text-yellow-500 shrink-0" />
          <h3 id="stale-project-title" className="text-lg font-semibold">
            This view is out of date
          </h3>
        </div>

        <div className="p-4 text-slate-600">
          <p>
            Another tab switched the active project{incomingName ? ` to “${incomingName}”` : ""}. This
            tab can’t save until it’s reloaded.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Reload to continue in the new project — or re-open this project
            {localName ? ` (“${localName}”)` : ""} in the other tab to keep editing here (this notice
            clears itself when you return).
          </p>
        </div>

        <div className="p-4 bg-slate-50 flex justify-end">
          <button
            type="button"
            autoFocus
            onClick={onReload}
            className="px-4 py-2 text-white rounded-sm bg-pink-600 hover:bg-pink-700"
          >
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}
