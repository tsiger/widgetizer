import { useState, useEffect, useRef, useCallback } from "react";
import { Save, ChevronDown, Monitor, Smartphone, Eye, ArrowLeft, Undo2, Redo2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getAllPages } from "../../queries/pageManager";
import useAutoSave from "../../stores/saveStore";
import usePageStore from "../../stores/pageStore";

export default function EditorTopBar({
  pageName,
  pageId,
  onPreviewModeChange, // Callback to notify parent of preview mode changes
  children,
}) {
  const { t } = useTranslation();
  const { hasUnsavedChanges, isSaving, save, startAutoSave, stopAutoSave } = useAutoSave();
  const [pages, setPages] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(() => {
    return localStorage.getItem("editorPreviewMode") || "desktop";
  });
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Force re-render when undo/redo happens
  const [, forceUpdate] = useState(0);

  // Subscribe to temporal store changes
  useEffect(() => {
    const unsubscribe = usePageStore.temporal.subscribe(() => {
      forceUpdate((c) => c + 1);
    });
    return unsubscribe;
  }, []);

  // Get undo/redo state
  const { pastStates, futureStates } = usePageStore.temporal.getState();
  const canUndo = pastStates.length > 0 && pastStates[pastStates.length - 1]?.page;
  const canRedo = futureStates.length > 0;

  // Safe undo - only undo if the previous state has a valid page
  const safeUndo = useCallback(() => {
    const { pastStates, undo } = usePageStore.temporal.getState();
    if (pastStates.length > 0 && pastStates[pastStates.length - 1]?.page) {
      undo();
    }
  }, []);

  const safeRedo = useCallback(() => {
    const { redo } = usePageStore.temporal.getState();
    redo();
  }, []);

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

  // Setup auto-save lifecycle
  useEffect(() => {
    startAutoSave();
    return () => stopAutoSave();
  }, [startAutoSave, stopAutoSave]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          safeRedo();
        } else {
          e.preventDefault();
          safeUndo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        safeRedo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [safeUndo, safeRedo]);

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
    localStorage.setItem("editorPreviewMode", mode);
    onPreviewModeChange?.(mode);
  };

  const hasMultiplePages = pages.length > 1;

  return (
    <div className="bg-white text-slate-900 border-b border-slate-200 p-2 flex justify-between items-center">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/pages")}
          className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-sm hover:bg-slate-100 text-slate-600 hover:text-slate-800"
          title={t("pageEditor.toolbar.backToPages")}
        >
          <ArrowLeft size={18} />
          {t("pageEditor.toolbar.back")}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative" ref={dropdownRef}>
          {hasMultiplePages ? (
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="font-medium px-4 py-2 rounded-sm hover:bg-slate-100 flex items-center gap-2"
            >
              {pageName} {hasUnsavedChanges() && <div className="w-2 h-2 bg-pink-500 rounded-full"></div>}
              <ChevronDown
                size={16}
                className={`transform transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>
          ) : (
            <div className="font-medium px-4 py-2 flex items-center gap-2">
              {pageName} {hasUnsavedChanges() && <div className="w-2 h-2 bg-pink-500 rounded-full"></div>}
            </div>
          )}
          {isDropdownOpen && hasMultiplePages && (
            <div className="absolute top-full left-0 mt-1 w-64 max-h-96 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-lg z-50">
              {pages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => handlePageChange(page.id)}
                  className={`w-full px-4 py-2 text-left flex items-center justify-between ${
                    page.id === pageId
                      ? "bg-pink-600 text-white hover:bg-pink-700"
                      : "text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  <span>{page.name}</span>
                  {page.id === pageId && hasUnsavedChanges() && (
                    <div className="w-2 h-2 bg-pink-500 rounded-full border border-white"></div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Render injected children (e.g. ThemeSelector) */}
        {children}
      </div>

      <div className="flex items-center gap-3">
        {/* Desktop/Mobile switcher */}
        <div className="flex gap-1 p-1 h-9 bg-slate-200 rounded-md items-center">
          <button
            onClick={() => handlePreviewModeChange("desktop")}
            title={t("pageEditor.toolbar.desktopView")}
            className={`p-1.5 rounded ${
              previewMode === "desktop" ? "bg-white text-pink-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Monitor size={18} />
          </button>
          <button
            onClick={() => handlePreviewModeChange("mobile")}
            title={t("pageEditor.toolbar.mobileView")}
            className={`p-1.5 rounded ${
              previewMode === "mobile" ? "bg-white text-pink-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Smartphone size={18} />
          </button>
        </div>

        <Link
          to={`/preview/${pageId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 h-9 rounded-sm text-sm bg-slate-200 hover:bg-slate-300 text-slate-800"
        >
          <Eye size={18} />
          {t("pageEditor.toolbar.preview")}
        </Link>

        {/* Vertical divider */}
        <div className="h-6 w-px bg-slate-300"></div>

        {/* Undo/Redo buttons */}
        <div className="flex gap-1 p-1 h-9 bg-slate-200 rounded-md items-center">
          <button
            onClick={safeUndo}
            disabled={!canUndo}
            title={`${t("pageEditor.toolbar.undo")} (Ctrl+Z)`}
            className={`p-1.5 rounded ${
              canUndo ? "text-slate-600 hover:bg-white hover:text-slate-800" : "text-slate-400 cursor-not-allowed"
            }`}
          >
            <Undo2 size={18} />
          </button>
          <button
            onClick={safeRedo}
            disabled={!canRedo}
            title={`${t("pageEditor.toolbar.redo")} (Ctrl+Shift+Z)`}
            className={`p-1.5 rounded ${
              canRedo ? "text-slate-600 hover:bg-white hover:text-slate-800" : "text-slate-400 cursor-not-allowed"
            }`}
          >
            <Redo2 size={18} />
          </button>
        </div>

        <button
          onClick={() => save(false)}
          disabled={!hasUnsavedChanges() || isSaving}
          className={`flex items-center justify-center gap-2 px-3 h-9 min-w-24 rounded-sm text-sm ${
            hasUnsavedChanges() && !isSaving
              ? "bg-pink-600 hover:bg-pink-700 text-white"
              : "bg-slate-200 text-slate-500 cursor-not-allowed"
          }`}
        >
          <Save size={18} />
          {isSaving ? t("pageEditor.toolbar.saving") : t("pageEditor.toolbar.save")}
        </button>
      </div>
    </div>
  );
}
