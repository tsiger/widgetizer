import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Pencil,
  Trash2,
  Copy,
  Search,
  Check,
  CirclePlus,
  MoreVertical,
  AlertTriangle,
  Database,
  Eye,
} from "lucide-react";
import {
  duplicateCollectionItem,
  deleteCollectionItem,
  bulkDeleteCollectionItems,
  reorderCollectionItems,
  createItemLanguageVersion,
} from "../queries/collectionManager";
import { hasIncompleteReferenceCleanup } from "../lib/referenceCleanupWarning";
import useCollections from "../hooks/useCollections";
import useCollectionItems from "../hooks/useCollectionItems";
import { invalidateMediaCache } from "../queries/mediaManager";
import { invalidateLinkTargetsCache } from "../hooks/useLinkTargets";
import useConfirmationAction from "../hooks/useConfirmationAction";
import useFormatDate from "../hooks/useFormatDate";
import useToastStore from "../stores/toastStore";
import useProjectStore, { useDefaultLanguage, useIsMultilang } from "../stores/projectStore";
import useTranslationVersions from "../hooks/useTranslationVersions";
import LanguageTabs from "../components/content/LanguageTabs";
import TranslationChips from "../components/content/TranslationChips";
import { itemEditHref, itemAddHref } from "../lib/contentRoutes";
import { resolveLucideIcon } from "../utils/lucideIcon";
import { formatDateOnly, toDateOnlyFormat } from "@widgetizer/core/dateFormat";
import PageLayout from "../components/layout/PageLayout";
import Button, { IconButton } from "../components/ui/Button";
import Table from "../components/ui/Table";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { openCollectionItemPreview } from "../lib/openSitePreview";
import { useEditorPath } from "../lib/routeBase.jsx";

export default function CollectionItems() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { type } = useParams();
  const { formatDate, dateFormat } = useFormatDate();
  const showToast = useToastStore((state) => state.showToast);
  const activeProject = useProjectStore((state) => state.activeProject);

  const { schemas, loading: schemasLoading } = useCollections();
  const editorPath = useEditorPath();
  const { items, loading: itemsLoading, refetch: refetchItems } = useCollectionItems(type);
  const isMultilang = useIsMultilang();
  const defaultLanguage = useDefaultLanguage();

  const [activeLanguage, setActiveLanguage] = useState(defaultLanguage);
  const [searchTerm, setSearchTerm] = useState("");
  const [showInvalidOnly, setShowInvalidOnly] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedSlugs, setSelectedSlugs] = useState([]);
  const [orderedItems, setOrderedItems] = useState([]);
  const menuRef = useRef(null);

  const schema = (schemas || []).find((s) => s.type === type) || null;
  // When the type has a publication date (usedAsDate), the list shows it (date-only,
  // honoring the app date-format preference) instead of the generic `updated` column.
  const dateField = (schema?.settings || []).find((s) => s.usedAsDate)?.id || null;
  const displayName = schema?.displayName || type;
  const displayNamePlural = schema?.displayNamePlural || displayName;

  // Reset transient UI state when switching collection types.
  useEffect(() => {
    setSearchTerm("");
    setShowInvalidOnly(false);
    setOpenMenuId(null);
    setSelectedSlugs([]);
  }, [type]);

  // Keep the local (drag-mutable) order in sync with fetched items.
  useEffect(() => {
    setOrderedItems(items);
  }, [items]);

  // Close the actions menu on outside click / Escape.
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpenMenuId(null);
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") setOpenMenuId(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const toggleSelect = (slug) => {
    setSelectedSlugs((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  };

  const itemsInLanguage = isMultilang
    ? orderedItems.filter((item) => (item.language || defaultLanguage) === activeLanguage)
    : orderedItems;

  const invalidCount = itemsInLanguage.filter((item) => item.invalid).length;

  const filteredItems = itemsInLanguage
    .filter((item) => (showInvalidOnly ? item.invalid : true))
    .filter((item) => {
      const term = searchTerm.toLowerCase();
      return (
        (item.title || "").toLowerCase().includes(term) || (item.slug || "").toLowerCase().includes(term)
      );
    });

  // Drag-to-reorder is only meaningful over the full, unfiltered list.
  const reorderActive = !!schema?.sortable && !searchTerm && !showInvalidOnly;

  const allFilteredSelected =
    filteredItems.length > 0 && filteredItems.every((item) => selectedSlugs.includes(item.slug));

  const handleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedSlugs([]);
    } else {
      setSelectedSlugs(filteredItems.map((item) => item.slug));
    }
  };

  const afterMutation = () => {
    invalidateMediaCache(activeProject?.id);
    invalidateLinkTargetsCache(activeProject?.id);
    refetchItems();
  };

  const handleDelete = async (data) => {
    try {
      if (data.isBulkDelete) {
        const result = await bulkDeleteCollectionItems(type, data.slugs, data.language);
        const deletedSlugs = new Set(data.slugs);
        setSelectedSlugs((prev) => prev.filter((slug) => !deletedSlugs.has(slug)));
        showToast(
          hasIncompleteReferenceCleanup(result)
            ? t("collections.toasts.deleteBulkLinksIncomplete", { count: data.slugs.length })
            : t("collections.toasts.deleteBulkSuccess", { count: data.slugs.length }),
          hasIncompleteReferenceCleanup(result) ? "warning" : "success",
        );
      } else {
        const result = await deleteCollectionItem(type, data.slug, data.language);
        // The deleted item may also be checkbox-selected; drop it so the
        // selection count and bulk actions don't keep referencing a gone slug.
        setSelectedSlugs((prev) => prev.filter((s) => s !== data.slug));
        showToast(
          hasIncompleteReferenceCleanup(result)
            ? t("collections.toasts.deleteLinksIncomplete")
            : t("collections.toasts.deleteSuccess"),
          hasIncompleteReferenceCleanup(result) ? "warning" : "success",
        );
      }
      afterMutation();
    } catch (error) {
      console.error("Error deleting item(s):", error);
      showToast(t("collections.toasts.deleteError"), "error");
    }
  };

  const { confirm, confirmationModal } = useConfirmationAction(handleDelete);

  const handleDeleteItem = (item) => {
    confirm({
      title: t("collections.deleteModal.title"),
      message: t("collections.deleteModal.message", { name: item.title || item.slug }),
      confirmText: t("collections.deleteModal.confirm"),
      cancelText: t("collections.deleteModal.cancel"),
      variant: "danger",
      data: { slug: item.slug, language: item.language, isBulkDelete: false },
      // Opened from the row menu, which closes on the same click — hand focus
      // back to its trigger, not to the menu item that is about to unmount.
      returnFocusTo: menuRef.current?.querySelector('[aria-haspopup="menu"]'),
    });
  };

  const handleBulkDelete = () => {
    confirm({
      title: t("collections.deleteModal.titleBulk"),
      message: t("collections.deleteModal.messageBulk", { count: selectedSlugs.length }),
      confirmText: t("collections.deleteModal.confirmBulk", { count: selectedSlugs.length }),
      cancelText: t("collections.deleteModal.cancel"),
      variant: "danger",
      data: { slugs: selectedSlugs, language: activeLanguage, isBulkDelete: true },
    });
  };

  const handleDuplicate = async (slug, language) => {
    try {
      await duplicateCollectionItem(type, slug, language);
      showToast(t("collections.toasts.duplicateSuccess"), "success");
      afterMutation();
    } catch (error) {
      console.error("Error duplicating item:", error);
      showToast(t("collections.toasts.duplicateError"), "error");
    }
  };

  // Drag-reorder persists the new order; revert to server truth on failure.
  // (Only reachable when reorderActive, so filteredItems is the full order.)
  const handleReorder = async (reordered) => {
    // Optimistic, and only over this language's block — the other languages keep
    // the order their own `_order.json` gave them.
    setOrderedItems((prev) => [
      ...prev.filter((item) => isMultilang && (item.language || defaultLanguage) !== activeLanguage),
      ...reordered,
    ]);
    try {
      await reorderCollectionItems(
        type,
        reordered.map((item) => item.slug),
        activeLanguage,
      );
    } catch (error) {
      console.error("Error reordering items:", error);
      showToast(t("collections.toasts.reorderError"), "error");
      refetchItems();
    }
  };

  const itemEditPath = (item) => editorPath(itemEditHref(type, item, isMultilang));

  // Every language came back in the one fetch, so a row's siblings are already in
  // hand — the same shape as the pages list.
  const { siblingsOf, createIn, pendingKey } = useTranslationVersions({
    entries: items,
    defaultLanguage,
    createVersion: (item, targetLanguage) =>
      createItemLanguageVersion(type, item.slug, { targetLanguage, sourceLanguage: item.language }),
    onCreated: (created) => {
      afterMutation();
      navigate(itemEditPath(created));
    },
  });

  const loading = schemasLoading || itemsLoading;

  if (loading) {
    return (
      <PageLayout title={displayNamePlural}>
        <LoadingSpinner message={t("collections.loading")} />
      </PageLayout>
    );
  }

  // Schema list loaded but this type isn't defined by the theme.
  if (schemas && !schema) {
    return (
      <PageLayout title={t("collections.notFound")}>
        <div className="p-8 text-center">
          <Database className="mx-auto mb-4 text-slate-400" size={48} />
          <h2 className="text-xl font-semibold mb-2">{t("collections.notFound")}</h2>
          <p className="text-slate-600">{t("collections.notFoundHelp")}</p>
        </div>
      </PageLayout>
    );
  }

  // Of the active language: an empty one gets the empty state, whose button
  // starts an item in it. The tabs sit above both branches either way, so a
  // language with nothing in it yet is still reachable.
  const hasItems = itemsInLanguage.length > 0;

  const handleNewItem = () => navigate(editorPath(itemAddHref(type, isMultilang ? activeLanguage : undefined)));
  const SchemaIcon = resolveLucideIcon(schema?.icon);

  const renderRowActions = (item) => {
    const menuButtonClass = "w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors";
    return (
      <div className="relative inline-flex items-center justify-end" ref={openMenuId === item.slug ? menuRef : null}>
        <IconButton
          onClick={() => setOpenMenuId(openMenuId === item.slug ? null : item.slug)}
          variant="neutral"
          size="sm"
          className={`border transition-all ${
            openMenuId === item.slug
              ? "border-pink-200 bg-pink-50 text-pink-600"
              : "border-transparent bg-white/80 hover:border-slate-200 hover:bg-white hover:text-slate-900"
          }`}
          aria-label={t("collections.actions.menu")}
          aria-haspopup="menu"
          aria-expanded={openMenuId === item.slug}
        >
          <MoreVertical size={18} />
        </IconButton>
        {openMenuId === item.slug && (
          <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
            {schema?.hasItemPages && (
              <button
                type="button"
                onClick={() => {
                  setOpenMenuId(null);
                  openCollectionItemPreview(schema.slugPrefix, item.slug, isMultilang ? item.language : undefined);
                }}
                className={`${menuButtonClass} text-slate-700 hover:bg-slate-50`}
              >
                <Eye size={14} />
                {t("collectionsForm.preview")}
              </button>
            )}
            <Link
              to={itemEditPath(item)}
              onClick={() => setOpenMenuId(null)}
              className={`${menuButtonClass} text-slate-700 hover:bg-slate-50`}
            >
              <Pencil size={14} />
              {t("collections.actions.edit")}
            </Link>
            <button
              type="button"
              onClick={() => {
                setOpenMenuId(null);
                handleDuplicate(item.slug, item.language);
              }}
              className={`${menuButtonClass} text-slate-700 hover:bg-slate-50`}
            >
              <Copy size={14} />
              {t("collections.actions.duplicate")}
            </button>
            <div className="my-1 border-t border-slate-200" />
            <button
              type="button"
              onClick={() => {
                setOpenMenuId(null);
                handleDeleteItem(item);
              }}
              className={`${menuButtonClass} text-red-600 hover:bg-red-50`}
            >
              <Trash2 size={14} />
              {t("collections.actions.delete")}
            </button>
          </div>
        )}
      </div>
    );
  };

  // Per-row <td>s for the shared <Table>. The drag-handle cell (sortable mode)
  // and the selected-row background are owned by <Table> (via rowClassName), so
  // these cells stay presentation-only.
  const renderItemRow = (item) => (
    <>
      <td className="py-3 px-4 w-12">
        <IconButton
          onClick={() => toggleSelect(item.slug)}
          variant="neutral"
          size="sm"
          className="border border-transparent bg-white/80 hover:border-slate-200 hover:bg-white"
        >
          {selectedSlugs.includes(item.slug) ? (
            <div className="w-4 h-4 bg-pink-500 text-white flex items-center justify-center rounded-sm">
              <Check size={12} />
            </div>
          ) : (
            <div className="w-4 h-4 border border-slate-400 rounded-sm" />
          )}
        </IconButton>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            to={itemEditPath(item)}
            className="block min-w-0 rounded-sm font-medium text-slate-900 transition-colors hover:text-pink-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2"
          >
            <span className="block truncate">{item.title || item.slug}</span>
          </Link>
          {item.invalid && (
            <span
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800"
              title={t("collections.invalidBadge")}
            >
              <AlertTriangle size={12} />
              {t("collections.invalidBadge")}
            </span>
          )}
        </div>
      </td>
      <td className="py-3 px-4 whitespace-nowrap">
        <div className="text-slate-600 text-sm">
          {dateField
            ? formatDateOnly(item.settings?.[dateField], toDateOnlyFormat(dateFormat)) || "—"
            : formatDate(item.updated)}
        </div>
      </td>
      {isMultilang && (
        <td className="py-3 px-4 whitespace-nowrap">
          <TranslationChips
            entry={item}
            siblings={siblingsOf(item)}
            hrefOf={itemEditPath}
            onCreate={createIn}
            pendingKey={pendingKey}
          />
        </td>
      )}
      <td className="py-3 px-4 text-right">{renderRowActions(item)}</td>
    </>
  );

  const headers = [
    <IconButton
      key="select-all"
      onClick={handleSelectAll}
      variant="neutral"
      size="sm"
      className="border border-transparent bg-white/80 hover:border-slate-200 hover:bg-white"
    >
      {allFilteredSelected ? (
        <div className="w-4 h-4 bg-pink-500 text-white flex items-center justify-center rounded-sm">
          <Check size={12} />
        </div>
      ) : (
        <div className="w-4 h-4 border border-slate-400 rounded-sm" />
      )}
    </IconButton>,
    t("collections.headers.title"),
    dateField ? t("collections.headers.date") : t("collections.headers.updated"),
    ...(isMultilang ? [t("collections.languages.header")] : []),
    t("collections.headers.actions"),
  ];

  // Search-empty state mirrors the Pages listing (icon + heading + subtext);
  // the non-search fallback is a plain string (rendered in Table's empty cell).
  const emptyState = searchTerm ? (
    <div className="text-center">
      <SchemaIcon className="mx-auto mb-2 text-slate-400" size={32} />
      <div className="font-medium text-slate-700">{t("collections.noItemsFound")}</div>
      <div className="text-sm text-slate-500">{t("collections.noItemsMatch", { term: searchTerm })}</div>
    </div>
  ) : (
    t("collections.noItemsAvailable")
  );

  return (
    <PageLayout
      title={hasItems ? displayNamePlural : undefined}
      buttonProps={
        hasItems
          ? {
              onClick: handleNewItem,
              children: t("collections.newItem", { name: displayName }),
              icon: <CirclePlus size={18} />,
            }
          : undefined
      }
    >
      <LanguageTabs
        value={activeLanguage}
        label={t("collections.languages.tabsLabel")}
        onChange={(code) => {
          setActiveLanguage(code);
          setSelectedSlugs([]);
          setOpenMenuId(null);
        }}
      />
      {hasItems && (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap justify-between mb-4 items-center gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-600">
                {t("collections.count", { count: itemsInLanguage.length })}
              </span>
              {selectedSlugs.length > 0 && (
                <>
                  <span className="text-sm text-slate-600">
                    • {t("collections.selected", { count: selectedSlugs.length })}
                  </span>
                  <Button onClick={handleBulkDelete} variant="danger" size="sm" icon={<Trash2 size={18} />}>
                    {t("collections.delete")}
                  </Button>
                </>
              )}
              {invalidCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowInvalidOnly((v) => !v)}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    showInvalidOnly
                      ? "border-amber-300 bg-amber-100 text-amber-900"
                      : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                  }`}
                >
                  <AlertTriangle size={12} />
                  {showInvalidOnly
                    ? t("collections.showAll")
                    : t("collections.needsAttentionCount", { count: invalidCount })}
                </button>
              )}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder={t("collections.searchPlaceholder", { name: displayNamePlural })}
                className="form-input pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <Table
            sortable={reorderActive}
            getRowId={(item) => item.slug}
            onReorder={handleReorder}
            rowClassName={(item) => (selectedSlugs.includes(item.slug) ? "bg-pink-50" : "")}
            headers={headers}
            data={filteredItems}
            emptyMessage={emptyState}
            renderRow={renderItemRow}
          />
        </>
      )}

      {!hasItems && (
        <div className="p-8 text-center">
          <SchemaIcon className="mx-auto mb-4 text-slate-400" size={48} />
          <h2 className="text-xl font-semibold mb-2">{t("collections.noItemsYet", { name: displayNamePlural })}</h2>
          <p className="text-slate-600 mb-4">{t("collections.createFirst", { name: displayName })}</p>
          <Button onClick={handleNewItem} variant="primary" icon={<CirclePlus size={18} />}>
            {t("collections.newItem", { name: displayName })}
          </Button>
        </div>
      )}

      {confirmationModal}

    </PageLayout>
  );
}
