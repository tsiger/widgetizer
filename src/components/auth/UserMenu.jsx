import { useClerk, useUser } from "@clerk/clerk-react";
import { PUBLISHER_URL } from "../../config";

/**
 * User menu for the sidebar in hosted mode.
 * Shows user avatar, display name, and a sign-out button.
 * Only rendered when HOSTED_MODE is true (lazy-loaded by Sidebar).
 */
export default function UserMenu() {
  const { signOut } = useClerk();
  const { user } = useUser();

  const handleSignOut = () => {
    const redirectUrl = PUBLISHER_URL || "/";
    signOut({ redirectUrl });
  };

  return (
    <div className="pt-4 border-t border-slate-800">
      {user && (
        <div className="flex items-center justify-center md:justify-start p-2 mb-2">
          <img src={user.imageUrl} alt="" className="w-6 h-6 rounded-full flex-shrink-0" />
          <span className="hidden md:inline ml-2 text-sm text-slate-300 truncate">
            {user.firstName || user.primaryEmailAddress?.emailAddress || "User"}
          </span>
        </div>
      )}

      <button
        onClick={handleSignOut}
        className="w-full flex items-center justify-center md:justify-start p-2 rounded-sm transition-all duration-150 hover:bg-slate-800 text-slate-400 hover:text-white"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
        <span className="hidden md:inline ml-2 text-sm">Sign out</span>
      </button>
    </div>
  );
}
