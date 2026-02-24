import { useClerk } from "@clerk/clerk-react";
import { Globe, User } from "lucide-react";
import { PUBLISHER_URL } from "../../config";

/**
 * User menu for the sidebar in hosted mode.
 * Shows "My Sites" link, "Account" section with "My Account" link, and sign-out button.
 * Matches the publisher-frontend sidebar layout and icons.
 * Only rendered when HOSTED_MODE is true (lazy-loaded by Sidebar).
 */
export default function UserMenu() {
  const { signOut } = useClerk();

  const handleSignOut = () => {
    const redirectUrl = PUBLISHER_URL || "/";
    signOut({ redirectUrl });
  };

  return (
    <>
      {/* My Sites section */}
      {PUBLISHER_URL && (
        <div className="pt-4 border-t border-slate-800">
          <h3 className="text-slate-600 text-xs font-bold mb-2 ml-2 hidden md:block">My Sites</h3>
          <ul className="space-y-2 md:space-y-1">
            <li>
              <a
                href={`${PUBLISHER_URL}/dashboard`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center md:justify-start p-2 rounded-sm transition-all duration-150 hover:bg-slate-800 border border-slate-700 md:border-none"
              >
                <div className="w-8 h-8 md:w-4 md:h-4 flex items-center justify-center text-pink-600">
                  <Globe size={20} />
                </div>
                <span className="hidden md:inline ml-1 text-sm">My Sites</span>
              </a>
            </li>
          </ul>
        </div>
      )}

      {/* Account section */}
      {PUBLISHER_URL && (
        <div className="pt-4 border-t border-slate-800">
          <h3 className="text-slate-600 text-xs font-bold mb-2 ml-2 hidden md:block">Account</h3>
          <ul className="space-y-2 md:space-y-1">
            <li>
              <a
                href={`${PUBLISHER_URL}/account`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center md:justify-start p-2 rounded-sm transition-all duration-150 hover:bg-slate-800 border border-slate-700 md:border-none"
              >
                <div className="w-8 h-8 md:w-4 md:h-4 flex items-center justify-center text-pink-600">
                  <User size={20} />
                </div>
                <span className="hidden md:inline ml-1 text-sm">My Account</span>
              </a>
            </li>
          </ul>
        </div>
      )}

      {/* Sign out */}
      <div className="pt-4 border-t border-slate-800 mt-4">
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
    </>
  );
}
