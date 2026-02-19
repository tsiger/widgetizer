import { ClerkProvider } from "@clerk/clerk-react";
import { CLERK_PUBLISHABLE_KEY } from "../../config";

/**
 * Wraps children in ClerkProvider for hosted mode.
 * This component is lazy-loaded via React.lazy() so @clerk/clerk-react
 * is code-split and never downloaded in open-source mode.
 */
export default function ClerkProviderWrapper({ children }) {
  return <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>{children}</ClerkProvider>;
}
