import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, RotateCw, ChevronDown } from "lucide-react";
import { BASE_URL } from "../../config";
import { getCollectionItems, getCollectionItem, previewCollectionItem } from "../../queries/collectionManager";
import useToastStore from "../../stores/toastStore";
import PreviewModeToggle from "../preview/PreviewModeToggle";
import PreviewStage, { STANDALONE_SANDBOX } from "../preview/PreviewStage";

const DRAFT_VALUE = "__draft__";

/**
 * Full-screen, page-editor-style preview for a collection's item pages.
 * Renders the selected item through the theme template (via /render/:token) in
 * an iframe, with a room dropdown, a desktop/mobile toggle, and a back button.
 *
 * @param {Object} props
 * @param {Object} props.schema       - Collection schema (type, displayName(Plural), settings).
 * @param {Function} props.onClose    - Called when "Back" is pressed (or Escape).
 * @param {{slug: string, settings: Object}} [props.draft] - Live unsaved draft to preview first.
 * @param {string} [props.editingSlug] - Saved slug of the item being edited (deduped from the list).
 * @param {string} [props.initialSlug] - Saved slug to show first when there is no draft.
 */
export default function CollectionItemPreview({ schema, onClose, draft = null, editingSlug = null, initialSlug = null }) {
  const { t } = useTranslation();
  const showToast = useToastStore((s) => s.showToast);
  const type = schema.type;
  const label = schema.displayNamePlural || schema.displayName || type;
  const titleFieldId = useMemo(
    () => (schema.settings || []).find((s) => s.usedAsTitle)?.id,
    [schema],
  );

  const [savedItems, setSavedItems] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [selected, setSelected] = useState(draft ? DRAFT_VALUE : initialSlug || "");
  const [previewMode, setPreviewMode] = useState(() => localStorage.getItem("editorPreviewMode") || "desktop");
  const [src, setSrc] = useState("");
  const [building, setBuilding] = useState(false);

  // Dropdown options: the draft (if any) first, then saved items (minus the
  // edited one, which the draft already represents).
  const options = useMemo(() => {
    let opts = savedItems
      .filter((i) => !(draft && editingSlug && i.slug === editingSlug))
      .map((i) => ({ value: i.slug, label: i.title || i.slug }));
    if (draft) {
      const draftTitle = (titleFieldId && draft.settings?.[titleFieldId]) || draft.slug || label;
      opts = [{ value: DRAFT_VALUE, label: `${draftTitle} ${t("collectionsPreview.draftSuffix")}` }, ...opts];
    }
    return opts;
  }, [savedItems, draft, editingSlug, titleFieldId, label, t]);

  // Load the dropdown list once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const items = await getCollectionItems(type);
        if (cancelled) return;
        setSavedItems(items || []);
        setSelected((cur) => cur || (draft ? DRAFT_VALUE : initialSlug || items?.[0]?.slug || ""));
      } catch (e) {
        if (!cancelled) showToast(e.message || t("collectionsForm.previewError"), "error");
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  // Render the current selection to a token and point the iframe at it.
  const build = useCallback(
    async (value) => {
      if (!value) return;
      setBuilding(true);
      try {
        let slug;
        let settings;
        if (value === DRAFT_VALUE && draft) {
          slug = draft.slug;
          settings = draft.settings || {};
        } else {
          const item = await getCollectionItem(type, value);
          slug = item.slug;
          settings = item.settings || {};
        }
        const { token } = await previewCollectionItem({ collectionType: type, slug: slug || "preview", settings });
        setSrc(`${BASE_URL}/render/${token}`);
      } catch (e) {
        showToast(e.message || t("collectionsForm.previewError"), "error");
      } finally {
        setBuilding(false);
      }
    },
    [draft, type, showToast, t],
  );

  // Rebuild whenever the selection changes.
  useEffect(() => {
    if (selected) build(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // Escape closes the preview.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const choosePreviewMode = (mode) => {
    setPreviewMode(mode);
    localStorage.setItem("editorPreviewMode", mode);
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-100">
      {/* Top bar — mirrors the page editor: back (left), item dropdown (center), device toggle (right) */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2">
        {/* Back (left) */}
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 rounded-sm bg-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-300"
        >
          <ArrowLeft size={18} />
          <span className="hidden sm:inline">{t("collectionsPreview.back", { name: label })}</span>
        </button>

        {/* Item dropdown + refresh (center) */}
        <div className="flex min-w-0 items-center gap-2">
          <span className="hidden whitespace-nowrap text-sm font-medium text-slate-500 md:inline">{label}:</span>
          <div className="relative">
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              disabled={listLoading}
              className="max-w-[16rem] appearance-none truncate rounded-md border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-pink-200 disabled:opacity-60"
            >
              {options.length === 0 && (
                <option value="">{listLoading ? t("collectionsPreview.loading") : t("collectionsPreview.noItems")}</option>
              )}
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          <button
            type="button"
            onClick={() => build(selected)}
            title={t("collectionsPreview.refresh")}
            aria-label={t("collectionsPreview.refresh")}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <RotateCw size={16} className={building ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Device toggle (right) — shared chrome with the page editor/preview */}
        <PreviewModeToggle mode={previewMode} onChange={choosePreviewMode} />
      </div>

      {/* Iframe stage — shared with the page editor/preview (no device bezel) */}
      <PreviewStage
        src={src}
        loading={building}
        isMobile={previewMode === "mobile"}
        title={t("collectionsForm.preview")}
        sandbox={STANDALONE_SANDBOX}
      />
    </div>
  );
}
