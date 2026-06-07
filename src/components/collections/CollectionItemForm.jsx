/* eslint-disable react-hooks/incompatible-library */
import { Fragment, useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { ChevronDown, ChevronUp, Eye, Info } from "lucide-react";
import { formatSlug } from "../../utils/slugUtils";
import { discardArchivedCollectionItem } from "../../queries/collectionManager";
import { invalidateMediaCache } from "../../queries/mediaManager";
import useConfirmationAction from "../../hooks/useConfirmationAction";
import useToastStore from "../../stores/toastStore";
import useProjectStore from "../../stores/projectStore";
import Button from "../ui/Button";
import SettingsRenderer from "../settings/SettingsRenderer";
import SeoFields from "../settings/SeoFields";
import CollectionItemPreview from "./CollectionItemPreview";

const HEADER_TYPE = "header";

/** A value counts as "missing" for a required field. Mirrors the backend rule. */
function isMissingValue(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") {
    // link/youtube objects: treat as empty when their href/url is blank
    if ("href" in value) return !value.href;
    if ("url" in value) return !value.url;
  }
  return false;
}

/** Turn a stored field id (snake/kebab case) into a friendly label, e.g.
 *  "promo_code" → "Promo code". The schema label is gone once a field is
 *  removed, so this is the best human-readable name we can show the user. */
function humanizeFieldId(id) {
  return String(id)
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

/** Page-shaped SEO form defaults for a collection item (Finding #12). Mirrors
 *  the page SEO shape; items default og_type to "article" (they are content). */
function seoDefaults(seo = {}) {
  return {
    description: seo?.description || "",
    og_title: seo?.og_title || "",
    og_image: seo?.og_image || "",
    og_type: seo?.og_type || "article",
    twitter_card: seo?.twitter_card || "summary",
    canonical_url: seo?.canonical_url || "",
    robots: seo?.robots || "index,follow",
  };
}

/**
 * Schema-driven create/edit form for a collection item. Mirrors PageForm's
 * contract (initialData / onSubmit / onDirtyChange / isDirty) so the page shells
 * (CollectionItemAdd / CollectionItemEdit) stay thin. Fields render through the
 * shared SettingsRenderer, so every supported setting type is available.
 *
 * @param {Object} props
 * @param {Object} props.schema - Normalized collection schema (with settings[]).
 * @param {Object} [props.initialData] - { slug, settings, validationErrors }.
 * @param {Function} props.onSubmit - async ({ slug, settings }) => boolean.
 */
export default function CollectionItemForm({
  schema,
  initialData = { slug: "", settings: {} },
  onSubmit,
  isSubmitting = false,
  submitLabel = "Save",
  onCancel,
  onDirtyChange,
  isDirty: isDirtyProp = false,
}) {
  const { t } = useTranslation();
  const showToast = useToastStore((state) => state.showToast);
  const isNew = !initialData.id && !initialData.slug;
  // Item-page collections get the same SEO editor as pages (Finding #12).
  const hasItemPages = !!schema?.hasItemPages;

  // Finding #8: out-of-schema values are kept on disk in `_archived`. Surface
  // them with a confirmed discard. Empty for new items, so this is edit-only.
  const [archived, setArchived] = useState(() => initialData._archived || {});
  const archivedKeys = Object.keys(archived);

  const { confirm: confirmDiscardArchived, confirmationModal } = useConfirmationAction(async () => {
    try {
      await discardArchivedCollectionItem(schema.type, initialData.slug);
      // Mirror the save path: discarding can shrink media usage if an archived
      // field held an upload, so refresh the media cache (else stale usedIn /
      // delete state lingers in the media library until expiry).
      invalidateMediaCache(useProjectStore.getState().activeProject?.id);
      setArchived({});
      showToast(t("collectionsForm.toasts.archivedDiscarded"), "success");
    } catch (err) {
      showToast(err.message || t("collectionsForm.toasts.archivedDiscardError"), "error");
    }
  });

  const openDiscardArchived = () =>
    confirmDiscardArchived({
      title: t("collectionsForm.discardModal.title"),
      message: t("collectionsForm.discardModal.message"),
      confirmText: t("collectionsForm.discardModal.confirm"),
      cancelText: t("collectionsForm.discardModal.cancel"),
      variant: "warning",
    });

  const allSettings = Array.isArray(schema?.settings) ? schema.settings : [];
  const fieldSettings = allSettings.filter((s) => s.type !== HEADER_TYPE);
  const titleSetting = fieldSettings.find((s) => s.usedAsTitle);

  const {
    register,
    handleSubmit: rhfHandleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue,
    getValues,
  } = useForm({
    defaultValues: {
      slug: initialData.slug || "",
      settings: initialData.settings || {},
      seo: seoDefaults(initialData.seo),
    },
  });

  // Per-field validation errors keyed by setting id (required-empty fields).
  const [fieldErrors, setFieldErrors] = useState({});

  const settingsValues = watch("settings") || {};
  const ogImage = watch("seo.og_image");
  const titleValue = titleSetting ? settingsValues[titleSetting.id] : undefined;

  // Notify parent of dirty changes.
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Seed validation errors from a loaded invalid item so problems show on open.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    if (Array.isArray(initialData.validationErrors) && initialData.validationErrors.length > 0) {
      const seeded = {};
      for (const ve of initialData.validationErrors) {
        if (ve.fieldId && ve.fieldId !== "slug") seeded[ve.fieldId] = t("collectionsForm.fieldRequired");
      }
      setFieldErrors(seeded);
    }
  }, [initialData.validationErrors, t]);

  // Auto-generate slug from the title field for new items.
  useEffect(() => {
    if (isNew && typeof titleValue === "string" && titleValue) {
      setValue("slug", formatSlug(titleValue), { shouldDirty: true });
    }
  }, [titleValue, isNew, setValue]);

  // Reset the form when switching to a different item.
  const prevKeyRef = useRef(initialData.slug);
  useEffect(() => {
    if (prevKeyRef.current !== initialData.slug) {
      reset({
        slug: initialData.slug || "",
        settings: initialData.settings || {},
        seo: seoDefaults(initialData.seo),
      });
      setArchived(initialData._archived || {});
      prevKeyRef.current = initialData.slug;
    }
  }, [initialData.slug, initialData.settings, initialData.seo, initialData._archived, reset]);

  const effectiveValue = (setting) => {
    const v = settingsValues[setting.id];
    return v !== undefined ? v : setting.default;
  };

  const handleSettingChange = (id, value) => {
    setValue(`settings.${id}`, value, { shouldDirty: true });
    setFieldErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const validateRequired = () => {
    const nextErrors = {};
    for (const setting of fieldSettings) {
      if (setting.required && isMissingValue(effectiveValue(setting))) {
        nextErrors[setting.id] = t("collectionsForm.fieldRequired");
      }
    }
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmitHandler = async (data) => {
    if (!validateRequired()) return false;
    try {
      return await onSubmit({
        slug: formatSlug(data.slug),
        settings: data.settings || {},
        ...(hasItemPages ? { seo: data.seo } : {}),
      });
    } catch (err) {
      showToast(err.message || t("collectionsForm.toasts.updateError"), "error");
      return false;
    }
  };

  // Full-screen preview of the current (unsaved) draft rendered through the
  // collection's theme template. Only meaningful when the collection has item
  // pages (otherwise there is no template to render).
  const [previewDraft, setPreviewDraft] = useState(null);
  const canPreview = hasItemPages;
  const [showSeo, setShowSeo] = useState(false);
  const openPreview = () => {
    const values = getValues();
    setPreviewDraft({
      slug: formatSlug(values.slug || "preview"),
      settings: values.settings || {},
    });
  };

  // Float the title field as a flush bar at the top of the scroll area while
  // scrolling. A plain `sticky` element is trapped below the page's content
  // padding, so once "stuck" we switch the bar to `position: fixed` (escaping
  // that padding) and collapse its label. A sentinel just above the row tells
  // us when to flip; a spacer holds the bar's place so the form doesn't jump.
  const [titleStuck, setTitleStuck] = useState(false);
  const [titleBarStyle, setTitleBarStyle] = useState(null);
  const [titleBarHeight, setTitleBarHeight] = useState(0);
  const titleSentinelRef = useRef(null);
  const titleSpacerRef = useRef(null);
  const titleBarRef = useRef(null);
  const titleScrollRootRef = useRef(null);

  useEffect(() => {
    const sentinel = titleSentinelRef.current;
    if (!sentinel) return undefined;
    let root = sentinel.parentElement;
    while (root && root !== document.body) {
      const overflowY = getComputedStyle(root).overflowY;
      if (overflowY === "auto" || overflowY === "scroll") break;
      root = root.parentElement;
    }
    titleScrollRootRef.current = root && root !== document.body ? root : null;
    const io = new IntersectionObserver(([entry]) => setTitleStuck(!entry.isIntersecting), {
      root: titleScrollRootRef.current,
      threshold: 0,
    });
    io.observe(sentinel);
    return () => io.disconnect();
  }, [canPreview]);

  // While stuck, keep the fixed bar aligned with its in-flow spacer (left/width)
  // and pinned to the top of the scroll viewport, updating on scroll/resize.
  useEffect(() => {
    if (!titleStuck) {
      setTitleBarStyle(null);
      return undefined;
    }
    const compute = () => {
      const spacer = titleSpacerRef.current;
      if (!spacer) return;
      const rect = spacer.getBoundingClientRect();
      const root = titleScrollRootRef.current;
      const top = root ? root.getBoundingClientRect().top : 0;
      setTitleBarStyle({ position: "fixed", top, left: rect.left, width: rect.width });
    };
    compute();
    const root = titleScrollRootRef.current;
    root?.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      root?.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, [titleStuck]);

  // Measure the bar's natural height so the spacer can hold its place when the
  // bar becomes fixed (prevents the form below it from jumping up).
  useEffect(() => {
    if (!titleStuck && titleBarRef.current) {
      const h = titleBarRef.current.offsetHeight;
      setTitleBarHeight((prev) => (prev !== h ? h : prev));
    }
  }, [titleStuck]);

  const labelWithRequired = (setting) =>
    setting.required && setting.label ? `${setting.label} *` : setting.label;

  return (
    <>
    <form onSubmit={rhfHandleSubmit(onSubmitHandler)} className="form-container">
      <div className="form-section">
        {archivedKeys.length > 0 && (
          <div className="mb-4 rounded-sm border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 shrink-0 text-slate-400" size={16} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800">{t("collectionsForm.archivedTitle")}</p>
                <p className="mt-1 text-sm text-slate-600">{t("collectionsForm.archivedDescription")}</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {archivedKeys.map((key) => (
                    <li key={key} className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-700">
                      {humanizeFieldId(key)}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={openDiscardArchived}
                  className="mt-3 text-sm font-medium text-pink-600 hover:text-pink-700"
                >
                  {t("collectionsForm.discardArchived")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Slug */}
        <div className="form-field">
          <label htmlFor="slug" className="form-label">
            {t("collectionsForm.slugLabel")} <span className="text-pink-500">*</span>
          </label>
          <div className="flex items-center">
            <span className="text-slate-500 mr-1">/</span>
            <input
              type="text"
              id="slug"
              {...register("slug", {
                required: t("collectionsForm.slugRequired"),
                validate: (value) => value.trim() !== "" || t("collectionsForm.slugNotEmpty"),
              })}
              onBlur={(e) => e.target.value && setValue("slug", formatSlug(e.target.value))}
              className="form-input flex-1"
            />
          </div>
          {errors.slug && <p className="form-error">{errors.slug.message}</p>}
          <p className="form-description">{t("collectionsForm.slugHelp")}</p>
        </div>

        {/* Schema-driven fields. The title field gets a sticky row with an
            icon-only Preview button so it stays reachable while scrolling. */}
        {allSettings.map((setting) => {
          if (setting.type === HEADER_TYPE) {
            return <SettingsRenderer key={setting.id} setting={setting} value={undefined} onChange={() => {}} />;
          }
          const renderer = (
            <SettingsRenderer
              key={setting.id}
              setting={{ ...setting, label: labelWithRequired(setting) }}
              value={settingsValues[setting.id]}
              onChange={handleSettingChange}
              error={fieldErrors[setting.id]}
            />
          );
          if (setting.usedAsTitle && canPreview) {
            return (
              <Fragment key={setting.id}>
                <div ref={titleSentinelRef} aria-hidden="true" className="h-px" />
                <div ref={titleSpacerRef} className="-mx-4" style={titleStuck ? { height: titleBarHeight } : undefined}>
                  <div
                    ref={titleBarRef}
                    style={titleBarStyle || undefined}
                    className={`z-30 flex items-end gap-3 border-b border-slate-200 bg-white px-4 pb-3 pt-2 ${
                      titleStuck ? "shadow-sm [&_.form-label]:hidden" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">{renderer}</div>
                    <button
                      type="button"
                      onClick={openPreview}
                      title={t("collectionsForm.preview")}
                      aria-label={t("collectionsForm.preview")}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                    >
                      <Eye size={18} />
                    </button>
                  </div>
                </div>
              </Fragment>
            );
          }
          return renderer;
        })}
      </div>

      {/* SEO — same editor pages use (Finding #12), only for collections that
          render item pages. Collapsed by default, mirroring PageForm. */}
      {hasItemPages && (
        <div className="form-section">
          <button
            type="button"
            onClick={() => setShowSeo((v) => !v)}
            className="flex items-center gap-1 text-sm text-pink-500 hover:text-pink-700"
          >
            {showSeo ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {t("forms.project.moreSettings")}
          </button>
          {showSeo && <SeoFields register={register} setValue={setValue} ogImage={ogImage} />}
        </div>
      )}

      <div className="form-actions-separated justify-end">
        {onCancel && (
          <Button type="button" onClick={onCancel} variant="secondary">
            {t("collections.deleteModal.cancel")}
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting || !isDirtyProp} variant={isDirtyProp ? "dark" : "primary"}>
          {isSubmitting ? t("collectionsForm.loading") : submitLabel}
          {isDirtyProp && <span className="w-2 h-2 bg-pink-500 rounded-full -mt-2" />}
        </Button>
      </div>
    </form>

    {previewDraft && (
      <CollectionItemPreview
        schema={schema}
        draft={previewDraft}
        editingSlug={initialData.slug || null}
        onClose={() => setPreviewDraft(null)}
      />
    )}

    {confirmationModal}
    </>
  );
}
