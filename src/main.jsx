import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { HOSTED_MODE, CLERK_PUBLISHABLE_KEY } from "./config";
import App from "./App.jsx";
import "./index.css";

// Lazy-load Clerk components so @clerk/clerk-react is code-split
// and never downloaded in open-source mode
const ClerkProviderWrapper =
  HOSTED_MODE && CLERK_PUBLISHABLE_KEY ? lazy(() => import("./components/auth/ClerkProviderWrapper")) : null;

const AuthGuard =
  HOSTED_MODE && CLERK_PUBLISHABLE_KEY ? lazy(() => import("./components/auth/AuthGuard")) : null;

function LoadingScreen() {
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
      </div>
    </div>
  );
}

function Root() {
  // Open-source mode: render App directly, no auth overhead
  if (!ClerkProviderWrapper || !AuthGuard) {
    return <App />;
  }

  // Hosted mode: wrap in Clerk provider + auth guard
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ClerkProviderWrapper>
        <AuthGuard>
          <App />
        </AuthGuard>
      </ClerkProviderWrapper>
    </Suspense>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
