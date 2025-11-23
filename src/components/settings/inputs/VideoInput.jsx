import { useState, useRef, useEffect } from "react";
import { uploadProjectMedia, getProjectMedia } from "../../../queries/mediaManager";
import { API_URL } from "../../../config";
import useProjectStore from "../../../stores/projectStore";
import useToastStore from "../../../stores/toastStore";
import { X, Edit, UploadCloud, FolderOpen, Play } from "lucide-react";
import MediaDrawer from "../../../components/media/MediaDrawer";
import MediaSelectorDrawer from "../../../components/media/MediaSelectorDrawer";
import Button from "../../ui/Button";

export default function VideoInput({ id, value = "", onChange }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const activeProject = useProjectStore((state) => state.activeProject);
  const showToast = useToastStore((state) => state.showToast);

  // State for the media drawers
  const [metadataDrawerVisible, setMetadataDrawerVisible] = useState(false);
  const [selectorDrawerVisible, setSelectorDrawerVisible] = useState(false);
  const [currentVideoFile, setCurrentVideoFile] = useState(null);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);

  // Get the current video metadata when value changes
  useEffect(() => {
    if (value && activeProject) {
      const filename = value.split("/").pop();
      const fetchVideoData = async () => {
        try {
          const mediaData = await getProjectMedia(activeProject.id);
          const videoFile = mediaData.files.find((file) => file.path.includes(filename));
          setCurrentVideoFile(videoFile || null);
        } catch (error) {
          console.error("Error fetching video metadata:", error);
          setCurrentVideoFile(null);
        }
      };
      fetchVideoData();
    } else {
      setCurrentVideoFile(null);
    }
  }, [value, activeProject]);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file || !activeProject) return;

    setUploading(true);
    try {
      const result = await uploadProjectMedia(activeProject.id, [file]);
      const { processedFiles, rejectedFiles, error } = result;

      if (processedFiles?.length > 0) {
        onChange(processedFiles[0].path);
        showToast("Video uploaded successfully.", "success");
      } else if (rejectedFiles?.length > 0) {
        showToast(rejectedFiles[0].reason || "Video rejected by server.", "error");
      } else if (error) {
        showToast(error, "error");
      } else {
        showToast("Upload failed unexpectedly.", "error");
      }
    } catch (err) {
      showToast(err?.message || "Upload failed.", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = () => onChange("");
  const handleEditMetadata = () => setMetadataDrawerVisible(true);
  const handleOpenMediaSelector = () => setSelectorDrawerVisible(true);

  const handleSaveMetadata = async (fileId, metadata) => {
    setIsSavingMetadata(true);
    try {
      const response = await fetch(API_URL(`/api/media/projects/${activeProject.id}/media/${fileId}/metadata`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metadata),
      });

      if (!response.ok) throw new Error("Failed to update metadata");

      const updatedFileData = await response.json();
      setCurrentVideoFile((prev) => ({ ...prev, metadata: updatedFileData.file.metadata }));
      setMetadataDrawerVisible(false);
      showToast("Metadata updated.", "success");
    } catch (err) {
      showToast(err.message || "Failed to save metadata", "error");
    } finally {
      setIsSavingMetadata(false);
    }
  };

  const handleSelectMedia = (selectedFile) => {
    if (selectedFile && selectedFile.type && selectedFile.type.startsWith("video/")) {
      onChange(selectedFile.path);
      setSelectorDrawerVisible(false);
    } else {
      showToast("Please select a video file.", "error");
    }
  };

  const formatDuration = (duration) => {
    if (!duration) return "";
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        id={id}
        accept="video/*"
        onChange={handleFileChange}
        disabled={uploading}
        className="hidden"
      />
      {value && currentVideoFile ? (
        <div className="relative w-full aspect-video bg-slate-100 rounded-md flex items-center justify-center group overflow-hidden">
          {/* Video icon placeholder since we don't generate thumbnails */}
          <div className="flex flex-col items-center justify-center text-slate-500">
            <Play size={48} />
            <p className="mt-2 text-sm font-medium">{currentVideoFile.originalName}</p>
            <p className="text-xs text-slate-400">{(currentVideoFile.size / 1024 / 1024).toFixed(1)}MB</p>
          </div>

          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="icon" size="sm" onClick={handleEditMetadata} title="Edit metadata">
              <Edit size={16} />
            </Button>
            <Button variant="icon" size="sm" onClick={handleRemove} title="Remove video">
              <X size={16} />
            </Button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="w-full aspect-video bg-slate-50 rounded-md border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-100 hover:border-slate-400 cursor-pointer transition-colors"
        >
          <UploadCloud size={32} />
          <p className="mt-2 text-sm font-semibold">Click to upload</p>
          <p className="text-xs">MP4, WebM, MOV up to 50MB</p>
        </div>
      )}

      <div className="flex items-center gap-2 mt-2">
        <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex-1">
          {uploading ? "Uploading..." : value ? "Replace" : "Upload"}
        </Button>
        <Button onClick={handleOpenMediaSelector} disabled={uploading} variant="secondary" className="flex-1">
          Browse
        </Button>
      </div>

      {metadataDrawerVisible && currentVideoFile && (
        <MediaDrawer
          visible={metadataDrawerVisible}
          onClose={() => setMetadataDrawerVisible(false)}
          selectedFile={currentVideoFile}
          onSave={handleSaveMetadata}
          loading={isSavingMetadata}
          activeProject={activeProject}
        />
      )}

      {selectorDrawerVisible && (
        <MediaSelectorDrawer
          visible={selectorDrawerVisible}
          onClose={() => setSelectorDrawerVisible(false)}
          onSelect={handleSelectMedia}
          activeProject={activeProject}
          filterType="video" // Filter to only show videos
        />
      )}
    </div>
  );
}
