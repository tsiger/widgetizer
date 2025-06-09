import { useState, useEffect } from "react";
import { Save, Clock, ChevronDown, Monitor, Smartphone, Eye } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { getAllPages } from "../../utils/pageManager";

export default function EditorTopBar({
  pageName,
  pageId,
  hasUnsavedChanges,
  isAutoSaving,
  isSaving,
  lastSaved,
  onSave,
  previewMode = "desktop",
  onPreviewModeChange,
}) {
  const [pages, setPages] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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

  const handlePageChange = (pageId) => {
    if (hasUnsavedChanges) {
      if (window.confirm("You have unsaved changes. Are you sure you want to leave?")) {
        navigate(`/page-editor?pageId=${pageId}`);
      }
    } else {
      navigate(`/page-editor?pageId=${pageId}`);
    }
    setIsDropdownOpen(false);
  };

  const hasMultiplePages = pages.length > 1;

  return (
    <div className="bg-slate-800 p-2 flex justify-between items-center">
      <div className="relative">
        {hasMultiplePages ? (
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="text-white font-medium px-4 py-2 rounded-sm hover:bg-slate-700 flex items-center gap-2"
          >
            {pageName} {hasUnsavedChanges && <span className="text-amber-400">*</span>}
            <ChevronDown size={16} className={`transform transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
          </button>
        ) : (
          <div className="text-white font-medium px-4 py-2">
            {pageName} {hasUnsavedChanges && <span className="text-amber-400">*</span>}
          </div>
        )}

        {isDropdownOpen && hasMultiplePages && (
          <div className="absolute top-full left-0 mt-1 w-64 max-h-96 overflow-y-auto bg-slate-800 border border-slate-700 rounded-sm shadow-lg z-50">
            {pages.map((page) => (
              <button
                key={page.id}
                onClick={() => handlePageChange(page.id)}
                className={`w-full px-4 py-2 text-left hover:bg-slate-700 ${
                  page.id === pageId ? "bg-slate-700 text-white" : "text-slate-300"
                }`}
              >
                {page.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-1 p-1 bg-slate-700 rounded-md">
        <button
          onClick={() => onPreviewModeChange && onPreviewModeChange("desktop")}
          title="Desktop View"
          className={`p-1.5 rounded ${previewMode === "desktop" ? "bg-slate-600 text-white" : "text-slate-400 hover:text-white"}`}
        >
          <Monitor size={18} />
        </button>
        <button
          onClick={() => onPreviewModeChange && onPreviewModeChange("mobile")}
          title="Mobile View"
          className={`p-1.5 rounded ${previewMode === "mobile" ? "bg-slate-600 text-white" : "text-slate-400 hover:text-white"}`}
        >
          <Smartphone size={18} />
        </button>
      </div>

      <div className="flex items-center gap-4">
        {isAutoSaving && (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Clock size={14} className="animate-spin" />
            Auto-saving...
          </div>
        )}
        {lastSaved && !isAutoSaving && !isSaving && (
          <div className="text-slate-400 text-sm">Last saved: {lastSaved.toLocaleTimeString()}</div>
        )}

        <Link
          to={`/preview/${pageId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-sm bg-slate-600 hover:bg-slate-500 text-white"
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
              : "bg-slate-700 text-slate-400 cursor-not-allowed"
          }`}
        >
          <Save size={18} />
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
