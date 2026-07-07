import { AlertTriangle, RefreshCw } from "lucide-react";
import Button from "./Button";

// Shown by the OSS bootstrap gates (HomeRedirect / RequireActiveProject) when the
// singleton active-project probe fails after retries, so a failed
// GET /api/projects/active is never silently treated as "no project" (which
// wrongly bounces the user to the picker). Retry re-runs the probe; Reload is a
// hard-reload fallback.
export default function WorkspaceLoadFailed({ onRetry }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-md border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <h1 className="text-lg font-semibold text-slate-900">Couldn&rsquo;t load your workspace</h1>
        <p className="mt-2 text-sm text-slate-500">
          We couldn&rsquo;t reach the app server to load your project. Check that it&rsquo;s running, then try
          again.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Reload
          </Button>
          <Button variant="primary" icon={<RefreshCw size={16} />} onClick={onRetry}>
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
}
