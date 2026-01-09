/* eslint-disable react-hooks/incompatible-library */
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatSlug } from "../../utils/slugUtils";
import useToastStore from "../../stores/toastStore";
import Button from "../ui/Button";
import ImageInput from "../settings/inputs/ImageInput";

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
  const [showMoreSettings, setShowMoreSettings] = useState(false);
  const showToast = useToastStore((state) => state.showToast);

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
            <textarea id="seo-description" {...register("seo.description")} rows={3} className="form-textarea" />
            <p className="form-description">{t("forms.page.metaDescriptionHelp")}</p>
          </div>

          <div className="form-field">
            <label htmlFor="seo-og-title" className="form-label-optional">
              {t("forms.page.socialTitle")}
            </label>
            <input type="text" id="seo-og-title" {...register("seo.og_title")} className="form-input" />
            <p className="form-description">{t("forms.page.socialTitleHelp")}</p>
          </div>

          <div className="form-field">
            <label className="form-label-optional">{t("forms.page.socialImage")}</label>
            <ImageInput
              id="seo-og-image"
              value={ogImage}
              onChange={(value) =>
                setValue("seo.og_image", value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
            <p className="form-description">{t("forms.page.socialImageHelp")}</p>
          </div>

          <div className="form-field">
            <label htmlFor="seo-canonical-url" className="form-label-optional">
              {t("forms.page.canonicalUrl")}
            </label>
            <input type="url" id="seo-canonical-url" {...register("seo.canonical_url")} className="form-input" />
            <p className="form-description">{t("forms.page.canonicalUrlHelp")}</p>
          </div>

          <div className="form-field">
            <label htmlFor="seo-robots" className="form-label">
              {t("forms.page.robotsLabel")}
            </label>
            <select id="seo-robots" {...register("seo.robots")} className="form-select">
              <option value="index,follow">{t("forms.page.robots.indexFollow")}</option>
              <option value="noindex,follow">{t("forms.page.robots.noindexFollow")}</option>
              <option value="index,nofollow">{t("forms.page.robots.indexNofollow")}</option>
              <option value="noindex,nofollow">{t("forms.page.robots.noindexNofollow")}</option>
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
    </form>
  );
}
