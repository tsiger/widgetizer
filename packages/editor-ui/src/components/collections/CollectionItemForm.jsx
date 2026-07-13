/* eslint-disable react-hooks/incompatible-library */
import { Fragment, useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useThemeLocale } from "../../hooks/useThemeLocale";
import { useForm } from "react-hook-form";
import { ChevronDown, ChevronUp, Eye, Info } from "lucide-react";
import { formatSlug } from "../../utils/slugUtils";
import { discardArchivedCollectionItem } from "../../queries/collectionManager";
import { invalidateMediaCache } from "../../queries/mediaManager";
import useConfirmationAction from "../../hooks/useConfirmationAction";
import useStickyActionBar from "../../hooks/useStickyActionBar";
import useToastStore from "../../stores/toastStore";
import useProjectStore from "../../stores/projectStore";
import Button from "../ui/Button";
import SettingsRenderer from "../settings/SettingsRenderer";
import SeoFields from "../settings/SeoFields";
import { openCollectionItemPreview } from "../../lib/openSitePreview";

const HEADER_TYPE = "header";

/** A value counts as "missing" for a required field. Mirrors the backend rule. */
function isMissingValue(value, setting) {
  if (setting?.type === "table") {
    // Column-aware (matches the backend): missing unless a row has a non-blank string in a
    // declared column. A generic `length === 0` would count a row of stale keys as present.
    const columns = Array.isArray(setting.columns) ? setting.columns : [];
    if (!Array.isArray(value) || columns.length === 0) return true;
    // "Present" must match the sanitizer: a cell counts only if it's a non-blank string
    // (non-strings sanitize to "", so a number-only row renders empty and isn't "present").
    return !value.some(
      (row) =>
        row && typeof row === "object" && columns.some((c) => typeof row[c.id] === "string" && row[c.id].trim() !== ""),
    );
  }
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

/** Today's date as a local "YYYY-MM-DD" — used to pre-fill a new item's date field. */
function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Page-shaped SEO form defaults for a collection item. Mirrors
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
  const { tTheme } = useThemeLocale();
  const showToast = useToastStore((state) => state.showToast);
  const isNew = !initialData.id && !initialData.slug;
  // Item-page collections get the same SEO editor as pages.
  const hasItemPages = !!schema?.hasItemPages;

  // Out-of-schema values are kept on disk in `_archived`. Surface
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
  const dateSetting = fieldSettings.find((s) => s.usedAsDate);

  // New items pre-fill the publication date (the usedAsDate field) with today as a
  // convenience — it stays editable, and only this one field is seeded.
  const buildDefaultSettings = () => {
    const s = { ...(initialData.settings || {}) };
    if (isNew && dateSetting && !s[dateSetting.id]) s[dateSetting.id] = todayISO();
    return s;
  };

  const {
    register,
    handleSubmit: rhfHandleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue,
  } = useForm({
    defaultValues: {
      slug: initialData.slug || "",
      settings: buildDefaultSettings(),
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

  // Re-baseline the form whenever the loaded item changes — both when switching
  // to a different item AND after a save, which returns fresh server values under
  // the same slug. Keyed on a snapshot of initialData (not just the slug): a
  // same-slug save must re-run reset() so react-hook-form's isDirty clears,
  // otherwise it stays stuck `true` and a later edit can't flip it back, leaving
  // the save button permanently disabled. Mirrors PageForm.
  const prevSnapshotRef = useRef(JSON.stringify(initialData));
  useEffect(() => {
    const snapshot = JSON.stringify(initialData);
    if (prevSnapshotRef.current === snapshot) return;
    prevSnapshotRef.current = snapshot;
    reset({
      slug: initialData.slug || "",
      settings: initialData.settings || {},
      seo: seoDefaults(initialData.seo),
    });
    setArchived(initialData._archived || {});
  }, [initialData, reset]);

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
      if (setting.required && isMissingValue(effectiveValue(setting), setting)) {
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

  // Preview is only meaningful when the collection produces item pages (otherwise
  // there's no template to render).
  const canPreview = hasItemPages;
  const [showMore, setShowMore] = useState(false);

  // Sticky action bar: the shadow shows only while the bar floats over scrollable
  // content. Re-checked when "More settings" expands/collapses the form height.
  const { sentinelRef, isStuck } = useStickyActionBar([showMore]);
  // Preview opens the item's last *saved* state in the shared navigable site preview
  // (the same door the page editor's Preview button uses): you land on the item and can
  // click through to the rest of the site. Disabled until the item is saved — there's no
  // page on disk to render before then.
  const openPreview = () => {
    if (!initialData.slug || !schema.slugPrefix) return;
    openCollectionItemPreview(schema.slugPrefix, initialData.slug);
  };

  return (
    <>
    <form onSubmit={rhfHandleSubmit(onSubmitHandler)} className="space-y-6">
      {/* Doubled setting-type rhythm: space-y-8 (32px) in place of .form-section's
          space-y-4, so schema fields breathe in the collection-item editor. */}
      <div className="max-w-xl space-y-8">
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

        {/* Schema-driven fields. (Preview lives in the bottom action bar.) */}
        {allSettings.map((setting, index) => {
          if (setting.type === HEADER_TYPE) {
            // Render schema headers as the page form's section titles (1:1 with
            // PageForm/SeoFields), not the compact panel divider SettingsRenderer
            // uses for the widget/theme settings panels.
            const headerLabel = tTheme(setting.label);
            const headerDesc = tTheme(setting.description);
            return (
              <Fragment key={setting.id}>
                {headerLabel && (
                  <h3 className={`form-section-title ${index === 0 ? "" : "pt-4"}`}>{headerLabel}</h3>
                )}
                {headerDesc && <p className="form-description">{headerDesc}</p>}
              </Fragment>
            );
          }
          const renderer = (
            <SettingsRenderer
              key={setting.id}
              setting={setting}
              value={settingsValues[setting.id]}
              onChange={handleSettingChange}
              error={fieldErrors[setting.id]}
              allowInternalLinkTargets
            />
          );
          return renderer;
        })}
      </div>

      {/* More settings - the Filename, plus the SEO editor for
          collections that render item pages. Collapsed by default, mirroring PageForm. */}
      <div className="max-w-xl form-section">
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="flex items-center gap-1 text-sm text-pink-500 hover:text-pink-700"
        >
          {showMore ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {t("forms.project.moreSettings")}
        </button>
        {showMore && (
          <>
            {/* Filename */}
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
                    validate: (value) =>
                      value.trim() === ""
                        ? t("collectionsForm.slugNotEmpty")
                        : formatSlug(value).length > 0 || t("collectionsForm.slugInvalid"),
                  })}
                  onBlur={(e) => e.target.value && setValue("slug", formatSlug(e.target.value))}
                  className="form-input flex-1"
                />
                <span className="text-slate-500 ml-1">.html</span>
              </div>
              {errors.slug && <p className="form-error">{errors.slug.message}</p>}
              <p className="form-description">{t("collectionsForm.slugHelp")}</p>
            </div>

            {hasItemPages && <SeoFields register={register} setValue={setValue} ogImage={ogImage} />}
          </>
        )}
      </div>

      <div
        className={`sticky bottom-0 z-10 -mx-6 -mb-4 flex justify-between gap-2 rounded-b-md border-t bg-white px-6 py-4 transition-shadow duration-200 ${
          isStuck
            ? "border-slate-200 shadow-[0_-12px_24px_-4px_rgba(15,23,42,0.18)] after:absolute after:left-0 after:right-0 after:top-full after:h-10 after:bg-white after:content-['']"
            : "border-transparent"
        }`}
      >
        {canPreview ? (
          <Button
            type="button"
            onClick={openPreview}
            disabled={!initialData.slug}
            variant="secondary"
            title={initialData.slug ? t("collectionsForm.preview") : t("collectionsForm.previewSaveFirst")}
          >
            <Eye size={16} />
            {t("collectionsForm.preview")}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
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
      </div>
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />
    </form>

    {confirmationModal}
    </>
  );
}
