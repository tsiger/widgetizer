import { useState, useEffect, useRef } from "react";

export default function Toolbar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="bg-white shadow-sm flex justify-between items-center border-b border-slate-200">
      <div className="relative ml-auto" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="p-4 border-l border-slate-200 focus:outline-hidden"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </button>
        {isDropdownOpen && (
          <div className="absolute right-0 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-slate-200">
            <a href="#" className="block px-4 py-2 text-sm hover:bg-slate-100">
              Profile
            </a>
            <a href="#" className="block px-4 py-2 text-sm hover:bg-slate-100">
              Settings
            </a>
            <a href="#" className="border-t border-slate-200 block px-4 py-2 text-sm text-pink-600 hover:bg-slate-100">
              Logout
            </a>
          </div>
        )}
      </div>
    </header>
  );
}
