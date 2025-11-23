import React, { useState, useEffect } from "react";
import { X, Search, Play } from "lucide-react";
import { API_URL } from "../../config";
import { getProjectMedia } from "../../queries/mediaManager";
import LoadingSpinner from "../ui/LoadingSpinner";

export default function MediaSelectorDrawer({ visible, onClose, onSelect, activeProject, filterType = "all" }) {
  const [mediaFiles, setMediaFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Load media files when drawer is opened
  useEffect(() => {
    if (visible && activeProject) {
      loadMediaFiles();
    }
  }, [visible, activeProject]);

  // Prevent background scroll when drawer is open
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    // Cleanup function to restore scroll on component unmount
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [visible]);

  const loadMediaFiles = async () => {
    if (!activeProject) return;
    setLoading(true);

    try {
      const data = await getProjectMedia(activeProject.id);
      setMediaFiles(data.files || []);
    } catch (error) {
      console.error("Failed to load media files:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter files based on search term and type
  const filteredFiles = mediaFiles.filter((file) => {
    const matchesSearch = file.originalName.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterType === "all") {
      return matchesSearch;
    } else if (filterType === "image") {
      return matchesSearch && file.type && file.type.startsWith("image/");
    } else if (filterType === "video") {
      return matchesSearch && file.type && file.type.startsWith("video/");
    }

    return matchesSearch;
  });

  // Handle Escape key press to close the drawer
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    if (visible) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ease-in-out"
      onClick={onClose}
      aria-hidden={!visible}
    >
      <div
        className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 transition-transform duration-300 ease-in-out transform translate-x-0 flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-medium text-slate-800">Select Media</h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-pink-500"
            aria-label="Close media selector"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search media files..."
              className="form-input pl-10"
            />
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner size="medium" />
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              {searchTerm ? "No media files match your search" : "No media files available"}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="border border-slate-200 rounded-sm overflow-hidden bg-slate-50 cursor-pointer hover:border-pink-400 transition-colors"
                  onClick={() => onSelect(file)}
                >
                  <div className="aspect-square relative bg-slate-100 flex items-center justify-center">
                    {file.type && file.type.startsWith("video/") ? (
                      <div className="flex flex-col items-center justify-center text-slate-500 p-2">
                        <Play size={32} />
                        <p className="text-xs text-center mt-1 font-medium truncate max-w-full">Video</p>
                      </div>
                    ) : (
                      <img
                        src={API_URL(`/api/media/projects/${activeProject.id}${file.thumbnail || file.path}`)}
                        alt={file.metadata?.alt || ""}
                        className="max-w-full max-h-full object-contain"
                      />
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs truncate" title={file.originalName}>
                      {file.originalName}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
