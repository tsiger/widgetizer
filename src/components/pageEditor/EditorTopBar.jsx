import { useState, useEffect, useRef } from "react";
import { Save, Clock, ChevronDown, Monitor, Smartphone, Eye, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { getAllPages } from "../../queries/pageManager";

export default function EditorTopBar({
  pageName,
  pageId,
  hasUnsavedChanges,
  isAutoSaving,
  isSaving,
  lastSaved,
  onSave,
  onPreviewModeChange, // Callback to notify parent of preview mode changes
}) {
  const [pages, setPages] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState("desktop");
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadPages = async () => {
      try {
        const allPages = await getAllPages();
        setPages(allPages);
      } catch (error) {
        console.error("Failed to load pages:", error);
      }
    };
    loadPages();
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handlePageChange = (pageId) => {
    navigate(`/page-editor?pageId=${pageId}`);
    setIsDropdownOpen(false);
  };

  const handlePreviewModeChange = (mode) => {
    setPreviewMode(mode);
    onPreviewModeChange?.(mode);
  };

  const hasMultiplePages = pages.length > 1;

  return (
    <div className="bg-white text-slate-900 border-b border-slate-200 p-2 flex justify-between items-center">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/pages")}
          className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-sm hover:bg-slate-100 text-slate-600 hover:text-slate-800"
          title="Back to Pages"
        >
          <ArrowLeft size={18} />
          Back
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex gap-1 p-1 bg-slate-200 rounded-md">
          <button
            onClick={() => handlePreviewModeChange("desktop")}
            title="Desktop View"
            className={`p-1.5 rounded ${
              previewMode === "desktop" ? "bg-white text-pink-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Monitor size={18} />
          </button>
          <button
            onClick={() => handlePreviewModeChange("mobile")}
            title="Mobile View"
            className={`p-1.5 rounded ${
              previewMode === "mobile" ? "bg-white text-pink-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Smartphone size={18} />
          </button>
        </div>

        <div className="relative" ref={dropdownRef}>
          {hasMultiplePages ? (
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="font-medium px-4 py-2 rounded-sm hover:bg-slate-100 flex items-center gap-2"
            >
              {pageName} {hasUnsavedChanges && <div className="w-2 h-2 bg-pink-500 rounded-full"></div>}
              <ChevronDown
                size={16}
                className={`transform transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>
          ) : (
            <div className="font-medium px-4 py-2 flex items-center gap-2">
              {pageName} {hasUnsavedChanges && <div className="w-2 h-2 bg-pink-500 rounded-full"></div>}
            </div>
          )}

          {isDropdownOpen && hasMultiplePages && (
            <div className="absolute top-full left-0 mt-1 w-64 max-h-96 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-lg z-50">
              {pages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => handlePageChange(page.id)}
                  className={`w-full px-4 py-2 text-left ${
                    page.id === pageId
                      ? "bg-pink-600 text-white hover:bg-pink-700"
                      : "text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  {page.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {isAutoSaving && (
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Clock size={14} className="animate-spin" />
            Auto-saving...
          </div>
        )}
        {lastSaved && !isAutoSaving && !isSaving && (
          <div className="text-slate-500 text-sm">Last saved: {lastSaved.toLocaleTimeString()}</div>
        )}

        <Link
          to={`/preview/${pageId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-sm bg-slate-200 hover:bg-slate-300 text-slate-800"
        >
          <Eye size={18} />
          Preview
        </Link>

        <button
          onClick={onSave}
          disabled={!hasUnsavedChanges || isSaving || isAutoSaving}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-sm ${
            hasUnsavedChanges && !isSaving && !isAutoSaving
              ? "bg-pink-600 hover:bg-pink-700 text-white"
              : "bg-slate-200 text-slate-500 cursor-not-allowed"
          }`}
        >
          <Save size={18} />
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
