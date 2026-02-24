import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { PUBLISHER_URL } from "../../config";
import useProjectStore from "../../stores/projectStore";

/**
 * Ensures the user is authenticated in hosted mode.
 * Shows a loading spinner while Clerk initializes, redirects to the
 * publisher sign-in page if not authenticated, or renders children
 * when signed in.
 *
 * Also bootstraps the active project store once auth is confirmed,
 * so that apiFetch() has a valid Clerk token for the request.
 *
 * Only rendered inside ClerkProvider (hosted mode only).
 */
export default function AuthGuard({ children }) {
  const { isLoaded, isSignedIn } = useAuth();

  // Bootstrap the project store after auth is confirmed.
  // This replaces the old module-level fetch in projectStore.js which
  // could fire before Clerk was ready, causing a silent 401.
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      useProjectStore.getState().fetchActiveProject();
    }
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <div className="p-6 text-center">
          <svg
            className="mx-auto h-10 w-10 text-slate-400 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="mt-2 text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    const signInUrl = PUBLISHER_URL ? `${PUBLISHER_URL}/sign-in` : "/sign-in";

    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Sign in required</h1>
          <p className="text-slate-600 mb-6">You need to sign in to access the editor.</p>
          <a
            href={signInUrl}
            className="inline-flex items-center justify-center px-6 py-3 bg-pink-600 text-white font-semibold rounded-md hover:bg-pink-700 transition-all duration-200"
          >
            Go to sign in
          </a>
        </div>
      </div>
    );
  }

  return children;
}
