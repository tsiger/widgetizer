import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { API_URL } from "../../config";

export default function MediaDrawer({ visible, onClose, selectedFile, onSave, loading, activeProject }) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit: rhfHandleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      alt: "",
      title: "",
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
        });
        prevSelectedFileRef.current = currentSelectedFileStr;
      }
    } else if (!visible) {
      // Reset form when drawer is closed
      reset({ alt: "", title: "" });
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
      onSave(selectedFile.id, data);
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

  // Determine if the file is a video
  const isVideo = selectedFile?.type?.startsWith("video/");

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
            {t("forms.media.editTitle", { type: isVideo ? "Video" : "Image" })}
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
          {fileUrl && (
            <div className="mb-4 p-2 border border-slate-200 rounded-sm bg-slate-50 flex items-center justify-center">
              {isVideo ? (
                <video
                  src={fileUrl}
                  className="max-h-40 max-w-full object-contain rounded-sm"
                  controls
                  preload="metadata"
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <img src={fileUrl} alt="Preview" className="max-h-40 max-w-full object-contain rounded-sm" />
              )}
            </div>
          )}

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
              {t("forms.media.altHelp", { type: isVideo ? "video content" : "image" })}
            </p>
          </div>

          <div className="form-field">
            <label htmlFor="title" className="form-label-optional">
              {t("forms.media.titleLabel")}
            </label>
            <input
              type="text"
              id="title"
              {...register("title")}
              className="form-input"
            />
            <p className="form-description">{t("forms.media.titleHelp")}</p>
          </div>

          <div className="form-actions-separated">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-pink-600 border border-transparent rounded-sm hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {t("forms.media.saving")}
                </>
              ) : (
                t("forms.media.save")
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
