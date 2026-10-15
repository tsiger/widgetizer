import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { X, FileText } from "lucide-react";
import { nativeLanguageName, hreflangCase } from "@widgetizer/core/languages";
import Button from "../ui/Button";
import { useDefaultLanguage, useExtraLanguages, useIsMultilang } from "../../stores/projectStore";
import { API_URL } from "../../lib/config";

export default function MediaDrawer({ visible, onClose, selectedFile, onSave, loading, activeProject }) {
  const { t } = useTranslation();
  const isMultilang = useIsMultilang();
  const defaultLanguage = useDefaultLanguage();
  const extraLanguages = useExtraLanguages();
  // The binaries and the grid are shared; only these three fields are per
  // language, and only where someone has written them. The drawer stays mounted
  // between openings, so the chosen language is tied to the file it was chosen
  // for — a different file opens on the default language again.
  const [chosen, setChosen] = useState({ fileId: null, language: defaultLanguage });
  const language = chosen.fileId === (selectedFile?.id ?? null) ? chosen.language : defaultLanguage;
  const setLanguage = (code) => setChosen({ fileId: selectedFile?.id ?? null, language: code });
  const isTranslation = isMultilang && language !== defaultLanguage;
  const inherited = selectedFile?.metadata || {};
  const defaultName = nativeLanguageName(defaultLanguage);

  const {
    register,
    handleSubmit: rhfHandleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      alt: "",
      title: "",
      caption: "",
    },
  });

  // Track previous selectedFile so the populate-form effect only resets on a real file
  // change (not every render). Initialize to a sentinel — NOT the initial selectedFile —
  // so the first open WITH a file always populates. ImageInput mounts this drawer
  // already-visible with the file set; seeding the ref with that file would make the effect
  // below see "no change" and skip the reset, showing blank alt/title/caption.
  const prevSelectedFileRef = useRef(JSON.stringify(null));

  // Update form data when selectedFile, language or visibility changes
  useEffect(() => {
    const currentSelectedFileStr = JSON.stringify([selectedFile, language]);

    if (visible && selectedFile) {
      // Only reset if the file (or the language being written) actually changed
      if (prevSelectedFileRef.current !== currentSelectedFileStr) {
        const source = language === defaultLanguage ? selectedFile.metadata || {} : selectedFile.translations?.[language];
        reset({
          alt: source?.alt || "",
          title: source?.title || "",
          caption: source?.caption || "",
        });
        prevSelectedFileRef.current = currentSelectedFileStr;
      }
    } else if (!visible) {
      // Reset form when drawer is closed
      reset({ alt: "", title: "", caption: "" });
      prevSelectedFileRef.current = JSON.stringify(null);
    }
  }, [visible, selectedFile, language, defaultLanguage, reset]);

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
    if (!selectedFile) return;
    if (!isTranslation) {
      // caption is image-only (the field renders for images only; the backend also
      // gates on type), so a non-image save sends an empty caption harmlessly.
      onSave(selectedFile.id, { alt: data.alt, title: data.title, caption: data.caption });
      return;
    }

    // Omitted translated fields inherit the default-language metadata.
    const written = {};
    if (data.alt.trim()) written.alt = data.alt;
    if (data.title.trim()) written.title = data.title;
    if (data.caption.trim()) written.caption = data.caption;
    onSave(selectedFile.id, written, language);
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

  const isImage = selectedFile?.type?.startsWith("image/");
  const isAudio = selectedFile?.type?.startsWith("audio/");
  const getMediaTypeLabel = () =>
    isImage ? t("forms.media.types.image") : isAudio ? t("forms.media.types.audio") : t("forms.media.types.file");

  // Portaled to <body> so the fixed overlay escapes any ancestor stacking context
  // (e.g. a @dnd-kit sortable row's position/z-index in GalleryInput).
  return createPortal(
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

        {/* React bubbles events through portals along the component tree, so without
            this a drawer opened from inside another form would submit that form too. */}
        <form
          onSubmit={(event) => {
            event.stopPropagation();
            return rhfHandleSubmit(onSubmitHandler)(event);
          }}
          className="p-6 space-y-6"
        >
          {/* Preview section */}
          {fileUrl && (
            <div className="mb-4 p-2 border border-slate-200 rounded-sm bg-slate-50 flex flex-col items-center justify-center gap-2">
              {isImage ? (
                <img src={fileUrl} alt="Preview" className="max-h-40 max-w-full object-contain rounded-sm" />
              ) : (
                <div className="py-4">
                  <FileText className="text-slate-400" size={48} />
                </div>
              )}
              {(selectedFile.filename || selectedFile.originalName) && (
                <p className="text-xs text-slate-500 truncate max-w-full" title={selectedFile.filename || selectedFile.originalName}>
                  {selectedFile.filename || selectedFile.originalName}
                </p>
              )}
            </div>
          )}

          {isMultilang && (
            <div className="flex items-center gap-3">
              <label htmlFor="media-metadata-language" className="shrink-0 text-sm font-medium text-slate-600">
                {t("forms.media.languagesLabel")}
              </label>
              <select
                id="media-metadata-language"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="form-select min-w-0 flex-1"
              >
                {[defaultLanguage, ...extraLanguages].map((code) => (
                  <option key={code} value={code}>
                    {nativeLanguageName(code)} ({hreflangCase(code)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Alt Text (required) + Title */}
          <div className="form-field">
            <label htmlFor="alt" className={isTranslation ? "form-label-optional" : "form-label"}>
              {t(isTranslation ? "forms.media.altTranslationLabel" : "forms.media.altLabel")}
            </label>
            <input
              type="text"
              id="alt"
              {...register("alt", {
                required: isTranslation ? false : t("forms.media.altRequired"),
                validate: (value) =>
                  isTranslation || value.trim() !== "" || t("forms.media.altNotEmpty"),
              })}
              className="form-input"
              placeholder={isTranslation ? inherited.alt || "" : undefined}
              aria-required={isTranslation ? undefined : "true"}
            />
            {errors.alt && <p className="form-error">{errors.alt.message}</p>}
            <p className="form-description">
              {isTranslation
                ? t("forms.media.inheritsHelp", { name: defaultName })
                : t("forms.media.altHelp", { type: t("forms.media.types.image").toLowerCase() })}
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
              placeholder={isTranslation ? inherited.title || "" : undefined}
            />
            <p className="form-description">
              {isTranslation ? t("forms.media.inheritsHelp", { name: defaultName }) : t("forms.media.titleHelp")}
            </p>
          </div>

          {/* Caption — images only (a caption is an image concept; the backend also gates on type) */}
          {isImage && (
            <div className="form-field">
              <label htmlFor="caption" className="form-label-optional">
                {t("forms.media.captionLabel")}
              </label>
              <input
                type="text"
                id="caption"
                {...register("caption")}
                className="form-input"
                placeholder={isTranslation ? inherited.caption || "" : undefined}
              />
              <p className="form-description">
                {isTranslation ? t("forms.media.inheritsHelp", { name: defaultName }) : t("forms.media.captionHelp")}
              </p>
            </div>
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
    </div>,
    document.body,
  );
}
