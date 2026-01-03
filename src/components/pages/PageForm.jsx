import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { ChevronDown, ChevronUp, X, FolderOpen } from "lucide-react";
import { formatSlug } from "../../utils/slugUtils";
import useToastStore from "../../stores/toastStore";
import useProjectStore from "../../stores/projectStore";
import Button from "../ui/Button";
import MediaSelectorDrawer from "../media/MediaSelectorDrawer";
import { API_URL } from "../../config";

export default function PageForm({
  initialData = { name: "", slug: "" },
  onSubmit,
  isSubmitting = false,
  submitLabel = "Save",
  onCancel,
  onDirtyChange,
  isDirty: isDirtyProp = false,
}) {
  const { t } = useTranslation();
  const isNew = !initialData.id;
  const [mediaSelectorVisible, setMediaSelectorVisible] = useState(false);
  const [showMoreSettings, setShowMoreSettings] = useState(false);
  const showToast = useToastStore((state) => state.showToast);
  const activeProject = useProjectStore((state) => state.activeProject);

  const {
    register,
    handleSubmit: rhfHandleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue,
  } = useForm({
    defaultValues: {
      name: initialData.name || "",
      slug: initialData.slug || "",
      seo: {
        description: initialData.seo?.description || "",
        og_title: initialData.seo?.og_title || "",
        og_image: initialData.seo?.og_image || "",
        og_type: initialData.seo?.og_type || "website",
        twitter_card: initialData.seo?.twitter_card || "summary",
        canonical_url: initialData.seo?.canonical_url || "",
        robots: initialData.seo?.robots || "index,follow",
      },
    },
  });

  // Watch fields for auto-slug and media display
  const name = watch("name");
  const ogImage = watch("seo.og_image");

  // Notify parent of dirty state changes
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Track previous initialData to prevent infinite loops
  const prevInitialDataRef = useRef(JSON.stringify(initialData));

  // Auto-generate slug from name for new pages
  useEffect(() => {
    if (isNew && name) {
      setValue("slug", formatSlug(name));
    }
  }, [name, isNew, setValue]);

  // Reset form when initialData actually changes
  useEffect(() => {
    const currentInitialDataStr = JSON.stringify(initialData);
    if (prevInitialDataRef.current !== currentInitialDataStr) {
      reset({
        name: initialData.name || "",
        slug: initialData.slug || "",
        seo: {
          description: initialData.seo?.description || "",
          og_title: initialData.seo?.og_title || "",
          og_image: initialData.seo?.og_image || "",
          og_type: initialData.seo?.og_type || "website",
          twitter_card: initialData.seo?.twitter_card || "summary",
          canonical_url: initialData.seo?.canonical_url || "",
          robots: initialData.seo?.robots || "index,follow",
        },
      });
      prevInitialDataRef.current = currentInitialDataStr;
    }
  });


  const handleSlugBlur = (e) => {
    const value = e.target.value;
    if (value) {
      setValue("slug", formatSlug(value));
    }
  };

  const handleSelectMedia = (selectedFile) => {
    if (selectedFile && selectedFile.type && selectedFile.type.startsWith("image/")) {
      setValue("seo.og_image", selectedFile.path, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setMediaSelectorVisible(false);
    } else {
      showToast(t("forms.common.selectImageFile"), "error");
    }
  };

  const handleRemoveImage = () => {
    setValue("seo.og_image", "", {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const onSubmitHandler = async (data) => {
    try {
      const result = await onSubmit({
        ...data,
        slug: formatSlug(data.slug),
      });

      return result;
    } catch (err) {
      showToast(err.message || t("forms.common.formError"), "error");
      return false;
    }
  };

  return (
    <form onSubmit={rhfHandleSubmit(onSubmitHandler)} className="form-container">
      {/* Main Page Data */}
      <div className="form-section">
        <div className="form-field">
          <label htmlFor="name" className="form-label">
            {t("forms.page.titleLabel")} <span className="text-pink-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            {...register("name", {
              required: t("forms.page.titleRequired"),
              validate: (value) => value.trim() !== "" || t("forms.page.nameNotEmpty"),
            })}
            className="form-input"
          />
          {errors.name && <p className="form-error">{errors.name.message}</p>}
          <p className="form-description">{t("forms.page.titleHelp")}</p>
        </div>

        <div className="form-field">
          <label htmlFor="slug" className="form-label">
            {t("forms.page.filenameLabel")} <span className="text-pink-500">*</span>
          </label>
          <div className="flex items-center">
            <span className="text-slate-500 mr-1">/</span>
            <input
              type="text"
              id="slug"
              {...register("slug", {
                required: t("forms.page.filenameRequired"),
                validate: (value) => value.trim() !== "" || t("forms.page.filenameNotEmpty"),
              })}
              onBlur={handleSlugBlur}
              className="form-input flex-1"
            />
            <span className="text-slate-500 ml-1">.html</span>
          </div>
          {errors.slug && <p className="form-error">{errors.slug.message}</p>}
          <p className="form-description">{t("forms.page.filenameHelp")}</p>
        </div>
      </div>

      {/* More Settings Toggle */}
      <button
        type="button"
        onClick={() => setShowMoreSettings(!showMoreSettings)}
        className="flex items-center gap-1 text-sm text-pink-500 hover:text-pink-700 mt-2 mb-4"
      >
        {showMoreSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        {t("forms.project.moreSettings")}
      </button>

      {/* SEO Fields - Collapsible */}
      {showMoreSettings && (
      <div className="form-section">
        <h3 className="form-section-title">{t("forms.page.seoTitle")}</h3>

        <div className="form-field">
          <label htmlFor="seo-description" className="form-label">
            {t("forms.page.metaDescription")}
          </label>
          <textarea
            id="seo-description"
            {...register("seo.description")}
            rows={3}
            className="form-textarea"
          />
          <p className="form-description">
            {t("forms.page.metaDescriptionHelp")}
          </p>
        </div>

        <div className="form-field">
          <label htmlFor="seo-og-title" className="form-label-optional">
            {t("forms.page.socialTitle")}
          </label>
          <input
            type="text"
            id="seo-og-title"
            {...register("seo.og_title")}
            className="form-input"
          />
          <p className="form-description">
            {t("forms.page.socialTitleHelp")}
          </p>
        </div>

        <div className="form-field">
          <label className="form-label-optional">{t("forms.page.socialImage")}</label>
          {ogImage ? (
            <div className="relative w-full max-w-md bg-slate-100 rounded-md overflow-hidden group">
              <img
                src={API_URL(`/api/media/projects/${activeProject?.id}${ogImage}`)}
                alt="Social media preview"
                className="w-full h-32 object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                  type="button"
                  variant="icon" 
                  size="sm" 
                  onClick={() => setMediaSelectorVisible(true)} 
                  title={t("forms.common.changeImage")}
                >
                  <FolderOpen size={16} />
                </Button>
                <Button 
                  type="button"
                  variant="icon" 
                  size="sm" 
                  onClick={handleRemoveImage} 
                  title={t("forms.common.removeImage")}
                >
                  <X size={16} />
                </Button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setMediaSelectorVisible(true)}
              className="w-full max-w-md h-32 bg-slate-50 rounded-md border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-100 hover:border-slate-400 cursor-pointer transition-colors"
            >
              <FolderOpen size={32} />
              <p className="mt-2 text-sm font-semibold">{t("forms.common.selectImage")}</p>
              <p className="text-xs">Recommended: 1200x630 pixels</p>
            </div>
          )}
          <p className="form-description">{t("forms.page.socialImageHelp")}</p>
        </div>

        <div className="form-field">
          <label htmlFor="seo-canonical-url" className="form-label-optional">
            {t("forms.page.canonicalUrl")}
          </label>
          <input
            type="url"
            id="seo-canonical-url"
            {...register("seo.canonical_url")}
            className="form-input"
          />
          <p className="form-description">
            {t("forms.page.canonicalUrlHelp")}
          </p>
        </div>

        <div className="form-field">
          <label htmlFor="seo-robots" className="form-label">
            {t("forms.page.robotsLabel")}
          </label>
          <select
            id="seo-robots"
            {...register("seo.robots")}
            className="form-select"
          >
            <option value="index,follow">Index and Follow (Default)</option>
            <option value="noindex,follow">Don't Index, but Follow Links</option>
            <option value="index,nofollow">Index, but Don't Follow Links</option>
            <option value="noindex,nofollow">Don't Index or Follow Links</option>
          </select>
          <p className="form-description">{t("forms.page.robotsHelp")}</p>
        </div>
      </div>
      )}

      <div className="form-actions-separated">
        <Button type="submit" disabled={isSubmitting || !isDirtyProp} variant={isDirtyProp ? "dark" : "primary"}>
          {isSubmitting ? t("forms.common.saving") : submitLabel}
          {isDirtyProp && <span className="w-2 h-2 bg-pink-500 rounded-full -mt-2" />}
        </Button>
        {isDirtyProp && onCancel && (
          <Button type="button" onClick={onCancel} variant="secondary">
            {t("forms.common.cancel")}
          </Button>
        )}
      </div>

      {mediaSelectorVisible && activeProject && (
        <MediaSelectorDrawer
          visible={mediaSelectorVisible}
          onClose={() => setMediaSelectorVisible(false)}
          onSelect={handleSelectMedia}
          activeProject={activeProject}
          filterType="image"
        />
      )}
    </form>
  );
}
