import { useState, useRef, useEffect } from "react";
import { uploadProjectMedia, getProjectMedia } from "../../../queries/mediaManager";
import { API_URL } from "../../../config";
import useProjectStore from "../../../stores/projectStore";
import useToastStore from "../../../stores/toastStore";
import { X, Edit, UploadCloud, Music } from "lucide-react";
import MediaDrawer from "../../../components/media/MediaDrawer";
import MediaSelectorDrawer from "../../../components/media/MediaSelectorDrawer";
import Button from "../../ui/Button";

export default function AudioInput({ id, value = "", onChange }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const activeProject = useProjectStore((state) => state.activeProject);
  const showToast = useToastStore((state) => state.showToast);

  // State for the media drawers
  const [metadataDrawerVisible, setMetadataDrawerVisible] = useState(false);
  const [selectorDrawerVisible, setSelectorDrawerVisible] = useState(false);
  const [currentAudioFile, setCurrentAudioFile] = useState(null);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);

  // Get the current audio metadata when value changes
  useEffect(() => {
    if (value && activeProject) {
      const filename = value.split("/").pop();
      const fetchAudioData = async () => {
        try {
          const mediaData = await getProjectMedia(activeProject.id);
          const audioFile = mediaData.files.find((file) => file.path.includes(filename));
          setCurrentAudioFile(audioFile || null);
        } catch (error) {
          console.error("Error fetching audio metadata:", error);
          setCurrentAudioFile(null);
        }
      };
      fetchAudioData();
    } else {
      setCurrentAudioFile(null);
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
        showToast("Audio uploaded successfully.", "success");
      } else if (rejectedFiles?.length > 0) {
        showToast(rejectedFiles[0].reason || "Audio rejected by server.", "error");
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
      setCurrentAudioFile((prev) => ({ ...prev, metadata: updatedFileData.file.metadata }));
      setMetadataDrawerVisible(false);
      showToast("Metadata updated.", "success");
    } catch (err) {
      showToast(err.message || "Failed to save metadata", "error");
    } finally {
      setIsSavingMetadata(false);
    }
  };

  const handleSelectMedia = (selectedFile) => {
    if (selectedFile && selectedFile.type && selectedFile.type.startsWith("audio/")) {
      onChange(selectedFile.path);
      setSelectorDrawerVisible(false);
    } else {
      showToast("Please select an audio file.", "error");
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        id={id}
        accept="audio/mpeg,.mp3"
        onChange={handleFileChange}
        disabled={uploading}
        className="hidden"
      />
      {value && currentAudioFile ? (
        <div className="relative w-full bg-slate-100 rounded-md flex items-center justify-between p-4 group overflow-hidden">
          {/* Audio icon and info */}
          <div className="flex items-center gap-3 text-slate-600">
            <Music size={32} className="text-pink-500" />
            <div>
              <p className="text-sm font-medium">{currentAudioFile.originalName}</p>
              <p className="text-xs text-slate-400">{(currentAudioFile.size / 1024 / 1024).toFixed(1)}MB</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="icon" size="sm" onClick={handleEditMetadata} title="Edit metadata">
              <Edit size={16} />
            </Button>
            <Button variant="icon" size="sm" onClick={handleRemove} title="Remove audio">
              <X size={16} />
            </Button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-8 bg-slate-50 rounded-md border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-100 hover:border-slate-400 cursor-pointer transition-colors"
        >
          <UploadCloud size={32} />
          <p className="mt-2 text-sm font-semibold">Click to upload</p>
          <p className="text-xs">MP3 up to 25MB</p>
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

      {metadataDrawerVisible && currentAudioFile && (
        <MediaDrawer
          visible={metadataDrawerVisible}
          onClose={() => setMetadataDrawerVisible(false)}
          selectedFile={currentAudioFile}
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
          filterType="audio" // Filter to only show audio files
        />
      )}
    </div>
  );
}
