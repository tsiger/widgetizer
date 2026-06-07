import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  Pencil,
  Trash2,
  Copy,
  Search,
  Check,
  CirclePlus,
  MoreVertical,
  GripVertical,
  AlertTriangle,
  Database,
  Eye,
} from "lucide-react";
import {
  duplicateCollectionItem,
  deleteCollectionItem,
  bulkDeleteCollectionItems,
  reorderCollectionItems,
} from "../queries/collectionManager";
import useCollections from "../hooks/useCollections";
import useCollectionItems from "../hooks/useCollectionItems";
import { invalidateMediaCache } from "../queries/mediaManager";
import useConfirmationAction from "../hooks/useConfirmationAction";
import useFormatDate from "../hooks/useFormatDate";
import useToastStore from "../stores/toastStore";
import useProjectStore from "../stores/projectStore";
import { resolveLucideIcon } from "../utils/lucideIcon";
import PageLayout from "../components/layout/PageLayout";
import Button, { IconButton } from "../components/ui/Button";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import CollectionItemPreview from "../components/collections/CollectionItemPreview";

const TABLE_CLASS = "w-full rounded-lg border border-slate-200 border-collapse bg-white";

/** Presentational row cells, shared by plain and sortable rows. */
function ItemCells({ item, type, isSelected, onToggleSelect, dragHandle, rowActions, t }) {
  const { formatDate } = useFormatDate();
  const cellClass = `py-3 px-4 ${isSelected ? "bg-pink-50" : ""}`;

  return (
    <>
      {dragHandle !== undefined && (
        <td className={`${cellClass} w-8 !pl-4 !pr-1`}>{dragHandle}</td>
      )}
      <td className={`${cellClass} w-12`}>
        <IconButton
          onClick={() => onToggleSelect(item.slug)}
          variant="neutral"
          size="sm"
          className="border border-transparent bg-white/80 hover:border-slate-200 hover:bg-white"
        >
          {isSelected ? (
            <div className="w-4 h-4 bg-pink-500 text-white flex items-center justify-center rounded-sm">
              <Check size={12} />
            </div>
          ) : (
            <div className="w-4 h-4 border border-slate-400 rounded-sm" />
          )}
        </IconButton>
      </td>
      <td className={cellClass}>
        <div className="flex items-center gap-2 min-w-0">
          <Link
            to={`/collections/${type}/${item.slug}/edit`}
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
      <td className={`${cellClass} whitespace-nowrap`}>
        <div className="text-slate-600 text-sm">{formatDate(item.updated)}</div>
      </td>
      <td className={`${cellClass} text-right`}>{rowActions}</td>
    </>
  );
}

/** A sortable <tr> wrapper used when manual reordering is active. */
function SortableRow({ item, isSelected, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.slug,
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: "relative",
    zIndex: isDragging ? 10 : "auto",
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`group border-b border-slate-100 transition-colors duration-150 hover:bg-slate-50 last:border-b-0 ${
        isSelected ? "bg-pink-50" : ""
      }`}
    >
      {children({ attributes, listeners })}
    </tr>
  );
}

export default function CollectionItems() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { type } = useParams();
  const showToast = useToastStore((state) => state.showToast);
  const activeProject = useProjectStore((state) => state.activeProject);

  const { schemas, loading: schemasLoading } = useCollections();
  const { items, loading: itemsLoading, refetch: refetchItems } = useCollectionItems(type);

  const [searchTerm, setSearchTerm] = useState("");
  const [showInvalidOnly, setShowInvalidOnly] = useState(false);
  const [previewSlug, setPreviewSlug] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedSlugs, setSelectedSlugs] = useState([]);
  const [orderedItems, setOrderedItems] = useState([]);
  const menuRef = useRef(null);

  const schema = (schemas || []).find((s) => s.type === type) || null;
  const displayName = schema?.displayName || type;
  const displayNamePlural = schema?.displayNamePlural || displayName;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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

  const invalidCount = orderedItems.filter((item) => item.invalid).length;

  const filteredItems = orderedItems
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
    refetchItems();
  };

  const handleDelete = async (data) => {
    try {
      if (data.isBulkDelete) {
        await bulkDeleteCollectionItems(type, data.slugs);
        showToast(t("collections.toasts.deleteBulkSuccess", { count: data.slugs.length }), "success");
        setSelectedSlugs([]);
      } else {
        await deleteCollectionItem(type, data.slug);
        showToast(t("collections.toasts.deleteSuccess"), "success");
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
      data: { slug: item.slug, isBulkDelete: false },
    });
  };

  const handleBulkDelete = () => {
    confirm({
      title: t("collections.deleteModal.titleBulk"),
      message: t("collections.deleteModal.messageBulk", { count: selectedSlugs.length }),
      confirmText: t("collections.deleteModal.confirmBulk", { count: selectedSlugs.length }),
      cancelText: t("collections.deleteModal.cancel"),
      variant: "danger",
      data: { slugs: selectedSlugs, isBulkDelete: true },
    });
  };

  const handleDuplicate = async (slug) => {
    try {
      await duplicateCollectionItem(type, slug);
      showToast(t("collections.toasts.duplicateSuccess"), "success");
      afterMutation();
    } catch (error) {
      console.error("Error duplicating item:", error);
      showToast(t("collections.toasts.duplicateError"), "error");
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedItems.findIndex((item) => item.slug === active.id);
    const newIndex = orderedItems.findIndex((item) => item.slug === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = arrayMove(orderedItems, oldIndex, newIndex);
    setOrderedItems(next); // optimistic
    try {
      await reorderCollectionItems(
        type,
        next.map((item) => item.slug),
      );
    } catch (error) {
      console.error("Error reordering items:", error);
      showToast(t("collections.toasts.reorderError"), "error");
      refetchItems(); // revert to server truth
    }
  };

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

  const hasItems = orderedItems.length > 0;
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
                  setPreviewSlug(item.slug);
                }}
                className={`${menuButtonClass} text-slate-700 hover:bg-slate-50`}
              >
                <Eye size={14} />
                {t("collectionsForm.preview")}
              </button>
            )}
            <Link
              to={`/collections/${type}/${item.slug}/edit`}
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
                handleDuplicate(item.slug);
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

  const headerRow = (
    <thead>
      <tr className="bg-slate-50 border-b border-slate-200">
        {reorderActive && <th className="w-8 py-3 px-4" aria-hidden="true" />}
        <th className="text-left py-3 px-4 font-medium text-slate-700 w-12">
          <IconButton
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
          </IconButton>
        </th>
        <th className="text-left py-3 px-4 font-medium text-slate-700">{t("collections.headers.title")}</th>
        <th className="text-left py-3 px-4 font-medium text-slate-700">{t("collections.headers.updated")}</th>
        <th className="text-right py-3 px-4 font-medium text-slate-700">{t("collections.headers.actions")}</th>
      </tr>
    </thead>
  );

  const colCount = reorderActive ? 5 : 4;

  const emptyBody = (
    <tbody>
      <tr>
        <td colSpan={colCount} className="text-center py-8 text-slate-500">
          {searchTerm ? t("collections.noItemsMatch", { term: searchTerm }) : t("collections.noItemsAvailable")}
        </td>
      </tr>
    </tbody>
  );

  const plainBody = (
    <tbody className="[&_td]:text-sm [&_td_*]:text-sm">
      {filteredItems.map((item) => (
        <tr
          key={item.slug}
          className="group border-b border-slate-100 transition-colors duration-150 hover:bg-slate-50 last:border-b-0"
        >
          <ItemCells
            item={item}
            type={type}
            isSelected={selectedSlugs.includes(item.slug)}
            onToggleSelect={toggleSelect}
            rowActions={renderRowActions(item)}
            t={t}
          />
        </tr>
      ))}
    </tbody>
  );

  const sortableBody = (
    <SortableContext items={filteredItems.map((item) => item.slug)} strategy={verticalListSortingStrategy}>
      <tbody className="[&_td]:text-sm [&_td_*]:text-sm">
        {filteredItems.map((item) => (
          <SortableRow key={item.slug} item={item} isSelected={selectedSlugs.includes(item.slug)}>
            {({ attributes, listeners }) => (
              <ItemCells
                item={item}
                type={type}
                isSelected={selectedSlugs.includes(item.slug)}
                onToggleSelect={toggleSelect}
                dragHandle={
                  <button
                    type="button"
                    className="cursor-grab text-slate-400 hover:text-slate-700 active:cursor-grabbing touch-none"
                    aria-label="Drag to reorder"
                    {...attributes}
                    {...listeners}
                  >
                    <GripVertical size={16} />
                  </button>
                }
                rowActions={renderRowActions(item)}
                t={t}
              />
            )}
          </SortableRow>
        ))}
      </tbody>
    </SortableContext>
  );

  return (
    <PageLayout
      title={hasItems ? displayNamePlural : undefined}
      buttonProps={
        hasItems
          ? {
              onClick: () => navigate(`/collections/${type}/add`),
              children: t("collections.newItem", { name: displayName }),
              icon: <CirclePlus size={18} />,
            }
          : undefined
      }
    >
      {hasItems && (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap justify-between mb-4 items-center gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-600">
                {t("collections.count", { count: orderedItems.length })}
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

          {reorderActive ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={handleDragEnd}
            >
              <table className={TABLE_CLASS}>
                {headerRow}
                {filteredItems.length === 0 ? emptyBody : sortableBody}
              </table>
            </DndContext>
          ) : (
            <table className={TABLE_CLASS}>
              {headerRow}
              {filteredItems.length === 0 ? emptyBody : plainBody}
            </table>
          )}
        </>
      )}

      {!hasItems && (
        <div className="p-8 text-center">
          <SchemaIcon className="mx-auto mb-4 text-slate-400" size={48} />
          <h2 className="text-xl font-semibold mb-2">{t("collections.noItemsYet", { name: displayNamePlural })}</h2>
          <p className="text-slate-600 mb-4">{t("collections.createFirst", { name: displayName })}</p>
          <Link to={`/collections/${type}/add`}>
            <Button variant="primary" icon={<CirclePlus size={18} />}>
              {t("collections.newItem", { name: displayName })}
            </Button>
          </Link>
        </div>
      )}

      {confirmationModal}

      {previewSlug && schema && (
        <CollectionItemPreview schema={schema} initialSlug={previewSlug} onClose={() => setPreviewSlug(null)} />
      )}
    </PageLayout>
  );
}
