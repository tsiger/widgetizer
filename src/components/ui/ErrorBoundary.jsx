import { Component } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isDev = import.meta.env.DEV;

    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-xl bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-slate-900 mt-1">Something went wrong</h1>
              <p className="text-slate-600 mt-3">
                An unexpected error occurred. You can try reloading the page or going back to the dashboard.
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => {
                window.location.href = "/";
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              <Home size={16} />
              Dashboard
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-pink-600 text-white hover:bg-pink-700"
            >
              <RefreshCw size={16} />
              Reload
            </button>
          </div>

          {isDev && this.state.error?.stack && (
            <pre className="mt-6 text-xs text-slate-500 overflow-auto rounded-lg bg-slate-50 border border-slate-200 p-3">
              {this.state.error.stack}
            </pre>
          )}
        </div>
      </div>
    );
  }
}
