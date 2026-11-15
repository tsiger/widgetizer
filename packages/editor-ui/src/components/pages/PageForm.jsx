/* eslint-disable react-hooks/incompatible-library */
import { useState, useEffect, useRef } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Controller, useForm } from "react-hook-form";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatSlug } from "../../utils/slugUtils";
import useToastStore from "../../stores/toastStore";
import { useDefaultLanguage } from "../../stores/projectStore";
import useStickyActionBar from "../../hooks/useStickyActionBar";
import Button from "../ui/Button";
import ImageInput from "../settings/inputs/ImageInput";
import { isHomeSlug } from "@widgetizer/core/internalHref";
import {
  isNotFoundSlug,
  isReservedPageSlug,
  languageFolder,
  resolveLanguage,
  translationGroupIdOf,
} from "@widgetizer/core/contentAddress";
import { getAllPages } from "../../queries/pageManager";
import ParentPagePicker from "./ParentPagePicker";
import { usePageSettingsFields } from "../../extension/PluginProvider.jsx";

// Each contributed field's stored value is carried too, or a save would drop it.
function toFormValues(initialData, extraFields) {
  return {
    ...Object.fromEntries(extraFields.map(({ field }) => [field, initialData[field]])),
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
    parentPageUuid: initialData.parentPageUuid || "",
  };
}

// What a "404 - Not found" page is saved with in place of More settings.
const NOT_FOUND_CLEARED = {
  parentPageUuid: "",
  seo: {
    description: "",
    og_title: "",
    og_image: "",
    og_type: "website",
    twitter_card: "summary",
    canonical_url: "",
    robots: "noindex,follow",
  },
};

export default function PageForm({
  initialData = { name: "", slug: "" },
  onSubmit,
  isSubmitting = false,
  submitLabel = "Save",
  onCancel,
  onDirtyChange,
  isDirty: isDirtyProp = false,
  language,
}) {
  const { t } = useTranslation();
  const isNew = !initialData.id;
  // The not-found page's address is set when it is created and never changes
  // (the server refuses it too), and it is always hidden from search engines.
  const isNotFoundPage = !isNew && isNotFoundSlug(initialData.slug);
  const [showMoreSettings, setShowMoreSettings] = useState(false);
  const showToast = useToastStore((state) => state.showToast);
  const extraFields = usePageSettingsFields();

  // Sticky action bar: the shadow shows only while the bar floats over scrollable
  // content. Re-checked when "More settings" expands/collapses the SEO block.
  const { sentinelRef, isStuck } = useStickyActionBar([showMoreSettings]);

  const {
    register,
    handleSubmit: rhfHandleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue,
    control,
  } = useForm({
    defaultValues: toFormValues(initialData, extraFields),
  });

  // Watch fields for auto-slug and media display
  const name = watch("name");
  const ogImage = watch("seo.og_image");
  // A new page given the address 404 becomes the "404 - Not found" page, so it
  // gets the same treatment as soon as the address is typed.
  // The folder the page is written to: `el/about.html` for a Greek page.
  const defaultLanguage = useDefaultLanguage();
  const pageLanguage = initialData.language || language;
  // A malformed language in the address makes languageFolder throw; the server
  // refuses such a page anyway, so the form just shows the root.
  let folder;
  try {
    folder = languageFolder({ language: pageLanguage, defaultLanguage });
  } catch {
    folder = "";
  }

  // Candidates for the parent picker. Loaded here so both callers (add + edit)
  // get the field without threading a prop through each.
  const [allPages, setAllPages] = useState([]);
  useEffect(() => {
    let cancelled = false;
    getAllPages()
      .then((pages) => {
        if (!cancelled) setAllPages(Array.isArray(pages) ? pages : []);
      })
      .catch(() => {
        // A failed load just leaves the picker empty; the field is optional.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // A page cannot parent itself, its own descendants (that is a cycle), or be
  // parented by the homepage — every trail already starts there. Nor by its own
  // translations: the breadcrumb shows a parent's version in the page's language,
  // which for one of its translations is the page itself.
  const ownGroup = initialData.uuid ? translationGroupIdOf(initialData) : null;
  const parentOptions = (() => {
    const descendants = new Set();
    if (initialData.uuid) {
      descendants.add(initialData.uuid);
      let grew = true;
      while (grew) {
        grew = false;
        for (const page of allPages) {
          if (page.uuid && !descendants.has(page.uuid) && descendants.has(page.parentPageUuid)) {
            descendants.add(page.uuid);
            grew = true;
          }
        }
      }
    }
    return allPages
      .filter(
        (page) =>
          page.uuid &&
          !descendants.has(page.uuid) &&
          !isHomeSlug(page.slug) &&
          !isNotFoundSlug(page.slug) &&
          !(ownGroup && translationGroupIdOf(page) === ownGroup),
      )
      .sort((a, b) => String(a.name || a.slug).localeCompare(String(b.name || b.slug)))
      .map((page) => ({ value: page.uuid, label: page.name || page.slug, language: page.language }));
  })();

  // A language has one "404 - Not found" page; a second new page at 404 would be
  // renumbered by the server, so the form says so first.
  const existingNotFound = isNew
    ? allPages.find(
        (page) =>
          isNotFoundSlug(page.slug) &&
          resolveLanguage(page.language, defaultLanguage) === resolveLanguage(pageLanguage, defaultLanguage),
      )
    : null;
  const slugValue = watch("slug");
  const willBeNotFoundPage = isNew && !existingNotFound && isNotFoundSlug(formatSlug(slugValue || ""));
  const notFoundTreatment = isNotFoundPage || willBeNotFoundPage;

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
      reset(toFormValues(initialData, extraFields));
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
        // The "404 - Not found" page has no hierarchy or search settings (More
        // settings is hidden for it), so whatever it holds is cleared on save.
        ...(notFoundTreatment ? NOT_FOUND_CLEARED : {}),
      });

      return result;
    } catch (err) {
      showToast(err.message || t("forms.common.formError"), "error");
      return false;
    }
  };

  return (
    <form onSubmit={rhfHandleSubmit(onSubmitHandler)} className="space-y-6">
      {/* Main Page Data */}
      <div className="max-w-xl form-section">
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
            <span className="text-slate-500 mr-1">{folder ? `/${folder}/` : "/"}</span>
            <input
              type="text"
              id="slug"
              {...register("slug", {
                required: t("forms.page.filenameRequired"),
                validate: (value) => {
                  if (value.trim() === "") return t("forms.page.filenameNotEmpty");
                  const slug = formatSlug(value);
                  if (!slug) return t("forms.page.filenameInvalid");
                  if (isReservedPageSlug(slug) && slug !== initialData.slug) {
                    return t("forms.page.filenameReserved", { slug });
                  }
                  if (!isNew && isNotFoundSlug(slug) && slug !== initialData.slug) {
                    return t("forms.page.notFoundSlugTaken");
                  }
                  if (isNew && isNotFoundSlug(slug) && existingNotFound) {
                    return t("forms.page.notFoundExists", { name: existingNotFound.name || existingNotFound.slug });
                  }
                  return true;
                },
              })}
              onBlur={handleSlugBlur}
              readOnly={isNotFoundPage}
              className={
                isNotFoundPage
                  ? "form-input flex-1 bg-slate-50 text-slate-500 border-slate-200 shadow-none"
                  : "form-input flex-1"
              }
            />
            <span className="text-slate-500 ml-1">.html</span>
          </div>
          {errors.slug && <p className="form-error">{errors.slug.message}</p>}
          {notFoundTreatment ? (
            <p className="form-description">
              {isNotFoundPage ? t("forms.page.notFoundNote") : t("forms.page.notFoundNoteNew")}
            </p>
          ) : (
            <p className="form-description">
              <Trans
                i18nKey="forms.page.filenameHelp"
                components={{
                  strong: <strong className="font-semibold text-slate-700" />,
                }}
              />
            </p>
          )}
        </div>

        {extraFields.map(({ id, field, Component }) => (
          <Component
            key={id}
            value={watch(field)}
            onChange={(value) => setValue(field, value, { shouldDirty: true })}
            page={initialData}
            slug={formatSlug(slugValue || "")}
            isNew={isNew}
            language={initialData.language || language}
          />
        ))}
      </div>

      {/* More Settings Toggle. The "404 - Not found" page has none of them: it is
          never indexed or shared, and nothing navigates by its parent. */}
      {!notFoundTreatment && (
        <button
          type="button"
          onClick={() => setShowMoreSettings(!showMoreSettings)}
          className="flex max-w-xl items-center gap-1 text-sm text-pink-500 hover:text-pink-700 mt-2 mb-4"
        >
          {showMoreSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {t("forms.project.moreSettings")}
        </button>
      )}

      {/* Hierarchy + SEO - Collapsible */}
      {showMoreSettings && !notFoundTreatment && (
        <div className="max-w-xl form-section">
          <h3 className="form-section-title">{t("forms.page.hierarchyTitle")}</h3>

          <div className="form-field">
            <label htmlFor="parent-page" className="form-label">
              {t("forms.page.parentPageLabel")}
            </label>
            <Controller
              name="parentPageUuid"
              control={control}
              render={({ field }) => (
                <ParentPagePicker
                  id="parent-page"
                  options={parentOptions}
                  value={field.value}
                  onChange={field.onChange}
                  language={initialData.language || language}
                />
              )}
            />
            <p className="form-description">{t("forms.page.parentPageHelp")}</p>
          </div>
        </div>
      )}

      {showMoreSettings && !notFoundTreatment && (
        <div className="max-w-xl form-section">
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

      <div
        className={`sticky bottom-0 z-10 -mx-6 -mb-4 flex justify-end gap-2 rounded-b-md border-t bg-white px-6 py-4 transition-shadow duration-200 ${
          isStuck
            ? "border-slate-200 shadow-[0_-12px_24px_-4px_rgba(15,23,42,0.18)] after:absolute after:left-0 after:right-0 after:top-full after:h-10 after:bg-white after:content-['']"
            : "border-transparent"
        }`}
      >
        {onCancel && (
          <Button type="button" onClick={onCancel} variant="secondary">
            {t("forms.common.cancel")}
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting || !isDirtyProp} variant={isDirtyProp ? "dark" : "primary"}>
          {isSubmitting ? t("forms.common.saving") : submitLabel}
          {isDirtyProp && <span className="w-2 h-2 bg-pink-500 rounded-full -mt-2" />}
        </Button>
      </div>
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />
    </form>
  );
}
