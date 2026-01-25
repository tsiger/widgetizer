import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { X, Music } from "lucide-react";
import Button from "../ui/Button";
import { API_URL } from "../../config";

export default function MediaDrawer({ visible, onClose, selectedFile, onSave, loading, activeProject }) {
  const { t } = useTranslation();

  // Determine media type
  const isVideo = selectedFile?.type?.startsWith("video/");
  const isAudio = selectedFile?.type?.startsWith("audio/");
  const isImage = !isVideo && !isAudio;

  const {
    register,
    handleSubmit: rhfHandleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      alt: "",
      title: "",
      description: "",
    },
  });

  // Track previous selectedFile to prevent infinite loops
  const prevSelectedFileRef = useRef(JSON.stringify(selectedFile));

  // Update form data when selectedFile or visibility changes
  useEffect(() => {
    const currentSelectedFileStr = JSON.stringify(selectedFile);

    if (visible && selectedFile) {
      // Only reset if the file actually changed
      if (prevSelectedFileRef.current !== currentSelectedFileStr) {
        reset({
          alt: selectedFile.metadata?.alt || "",
          title: selectedFile.metadata?.title || "",
          description: selectedFile.metadata?.description || "",
        });
        prevSelectedFileRef.current = currentSelectedFileStr;
      }
    } else if (!visible) {
      // Reset form when drawer is closed
      reset({ alt: "", title: "", description: "" });
      prevSelectedFileRef.current = JSON.stringify(null);
    }
  }, [visible, selectedFile, reset]);

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

  const onSubmitHandler = (data) => {
    if (selectedFile) {
      // Only send relevant fields based on media type
      const metadata = isImage
        ? { alt: data.alt, title: data.title }
        : { title: data.title, description: data.description };
      onSave(selectedFile.id, metadata);
    }
  };

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

  // Construct the full file URL for preview using ID-based route
  const fileUrl =
    selectedFile?.id && activeProject?.id
      ? API_URL(`/api/media/projects/${activeProject.id}/media/${selectedFile.id}`)
      : null;

  // Get the media type label for the drawer title
  const getMediaTypeLabel = () => {
    if (isAudio) return t("forms.media.types.audio");
    if (isVideo) return t("forms.media.types.video");
    return t("forms.media.types.image");
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ease-in-out"
      onClick={onClose}
      aria-hidden={!visible}
    >
      <div
        className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 transition-transform duration-300 ease-in-out transform translate-x-0"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="media-drawer-title"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 id="media-drawer-title" className="text-lg font-medium text-slate-800">
            {t("forms.media.editTitle", { type: getMediaTypeLabel() })}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-pink-500"
            aria-label="Close editor"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={rhfHandleSubmit(onSubmitHandler)} className="p-6 space-y-6">
          {/* Preview section */}
          {fileUrl && (
            <div className="mb-4 p-2 border border-slate-200 rounded-sm bg-slate-50 flex items-center justify-center">
              {isVideo ? (
                <video
                  src={fileUrl}
                  className="max-h-40 max-w-full object-contain rounded-sm"
                  controls
                  preload="metadata"
                >
                  {t("common.error")}
                </video>
              ) : isAudio ? (
                <div className="flex flex-col items-center py-4">
                  <Music size={48} className="text-pink-500 mb-2" />
                  <audio src={fileUrl} controls preload="metadata" className="w-full max-w-xs">
                    {t("common.error")}
                  </audio>
                </div>
              ) : (
                <img src={fileUrl} alt="Preview" className="max-h-40 max-w-full object-contain rounded-sm" />
              )}
            </div>
          )}

          {/* Image-specific fields: Alt Text (required) + Title */}
          {isImage && (
            <>
              <div className="form-field">
                <label htmlFor="alt" className="form-label">
                  {t("forms.media.altLabel")}
                </label>
                <input
                  type="text"
                  id="alt"
                  {...register("alt", {
                    required: t("forms.media.altRequired"),
                    validate: (value) => value.trim() !== "" || t("forms.media.altNotEmpty"),
                  })}
                  className="form-input"
                  aria-required="true"
                />
                {errors.alt && <p className="form-error">{errors.alt.message}</p>}
                <p className="form-description">
                  {t("forms.media.altHelp", { type: t("forms.media.types.image").toLowerCase() })}
                </p>
              </div>

              <div className="form-field">
                <label htmlFor="title" className="form-label-optional">
                  {t("forms.media.titleLabel")}
                </label>
                <input type="text" id="title" {...register("title")} className="form-input" />
                <p className="form-description">{t("forms.media.titleHelp")}</p>
              </div>
            </>
          )}

          {/* Video/Audio fields: Title + Description (both optional) */}
          {(isVideo || isAudio) && (
            <>
              <div className="form-field">
                <label htmlFor="title" className="form-label-optional">
                  {t("forms.media.titleLabel")}
                </label>
                <input
                  type="text"
                  id="title"
                  {...register("title")}
                  className="form-input"
                  placeholder={
                    isAudio ? t("forms.media.placeholders.audioTitle") : t("forms.media.placeholders.videoTitle")
                  }
                />
                <p className="form-description">
                  {isAudio ? t("forms.media.help.audioTitle") : t("forms.media.help.videoTitle")}
                </p>
              </div>

              <div className="form-field">
                <label htmlFor="description" className="form-label-optional">
                  {t("forms.media.descriptionLabel")}
                </label>
                <textarea
                  id="description"
                  {...register("description")}
                  className="form-input"
                  rows={3}
                  placeholder={
                    isAudio
                      ? t("forms.media.placeholders.audioDescription")
                      : t("forms.media.placeholders.videoDescription")
                  }
                />
                <p className="form-description">
                  {isAudio ? t("forms.media.help.audioDescription") : t("forms.media.help.videoDescription")}
                </p>
              </div>
            </>
          )}

          <div className="form-actions-separated">
            <Button type="button" onClick={onClose} variant="secondary">
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading} variant="primary">
              {loading ? t("forms.media.saving") : t("forms.media.save")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
