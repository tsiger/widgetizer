import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router-dom";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import Button from "../components/ui/Button";

function getErrorPayload(error) {
  if (isRouteErrorResponse(error)) {
    return {
      status: error.status || 500,
      title: error.statusText || "Request failed",
      message: typeof error.data === "string" ? error.data : "Something went wrong while loading this page.",
    };
  }

  if (error instanceof Error) {
    return {
      status: 500,
      title: "Unexpected error",
      message: error.message || "Something went wrong while loading this page.",
    };
  }

  return {
    status: 500,
    title: "Unexpected error",
    message: "Something went wrong while loading this page.",
  };
}

export default function RouteError() {
  const error = useRouteError();
  const navigate = useNavigate();
  const payload = getErrorPayload(error);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-md p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-500">Error {payload.status}</p>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">{payload.title}</h1>
            <p className="text-slate-600 mt-3">{payload.message}</p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="secondary" icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
            Go Back
          </Button>
          <Button variant="primary" icon={<RefreshCw size={16} />} onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>

        {import.meta.env.DEV && error instanceof Error && error.stack && (
          <pre className="mt-6 text-xs text-slate-500 overflow-auto rounded-lg bg-slate-50 border border-slate-200 p-3">
            {error.stack}
          </pre>
        )}
      </div>
    </div>
  );
}
