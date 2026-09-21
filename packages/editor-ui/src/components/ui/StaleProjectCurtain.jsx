import { AlertTriangle } from "lucide-react";
import useStaleProjectStore from "../../stores/staleProjectStore.js";
import useProjectStore from "../../stores/projectStore.js";
import { languageLabel } from "../../lib/languageLabel.js";

// Blocking, non-destructive overlay shown when this tab's view is out of date
// (another tab/window switched the singleton active project). Reload re-bootstraps
// to the new active project. Auto-dismisses when the focus/visibility revalidation
// clears the stale flag (e.g. the user re-activated this project elsewhere). Not
// backdrop-dismissable on purpose — the tab can't save while stale, so recovery is
// Reload or re-activating this project in the other tab, not ignoring the notice.
export default function StaleProjectCurtain({ onReload = () => window.location.reload() }) {
  const isStale = useStaleProjectStore((s) => s.isStale);
  const reason = useStaleProjectStore((s) => s.reason);
  const incomingName = useStaleProjectStore((s) => s.incomingName);
  const removedLanguage = useStaleProjectStore((s) => s.removedLanguage);
  // This tab's own project — its store was never updated cross-tab, so it still
  // names the (now-stale) project this view is showing.
  const localName = useProjectStore((s) => s.activeProject?.name);
  if (!isStale) return null;

  // A removed language is not the same situation as a switched project, and must not
  // borrow either its wording or its blocking overlay.
  //
  // Deliberately NOT a modal. This work cannot be saved anywhere and reloading loses
  // it, so the only thing left that can preserve any of it is the editor underneath —
  // the user reading and copying what they need. A curtain over it would make the one
  // available recovery impossible while claiming to help. It is a banner instead:
  // it says what happened, stays until the page is reloaded, and leaves the content
  // reachable by mouse, keyboard and screen reader.
  //
  // No recovery instructions beyond that, because the plausible ones are false:
  // reloading discards the draft, and re-adding the language does not bring back the
  // pages that were deleted with it.
  if (reason === "language") {
    // "Greek", not "el": the code is an internal detail the user never chose, and
    // it is the one word in this message they most need to recognise.
    const languageName = languageLabel(removedLanguage);
    return (
      <div
        className="fixed top-0 inset-x-0 z-[60] bg-yellow-50 border-b border-yellow-300 shadow-sm"
        role="alert"
        aria-labelledby="stale-language-title"
      >
        <div className="max-w-5xl mx-auto p-3 flex items-start gap-3">
          <AlertTriangle className="text-yellow-600 shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-slate-700 flex-1">
            <p id="stale-language-title" className="font-semibold">
              {languageName ? `${languageName} was removed` : "This language was removed"} — this page can
              no longer be saved
            </p>
            <p className="mt-1 text-slate-600">
              Saving has been stopped so nothing is written to a language that no longer exists. Your
              unsaved changes are still here and can be copied out of the editor below.{" "}
              <strong>Reloading discards them.</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onReload}
            className="px-3 py-1.5 shrink-0 text-white rounded-sm bg-pink-600 hover:bg-pink-700"
          >
            Discard changes and return to Pages
          </button>
        </div>
      </div>
    );
  }

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
            <strong>{localName ? ` (“${localName}”)` : ""}</strong> in the other tab to keep editing here (this notice
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
