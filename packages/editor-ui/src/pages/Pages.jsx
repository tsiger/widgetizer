import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Palette, Pencil, Trash2, Copy, Search, Check, FileText, CirclePlus, MoreVertical } from "lucide-react";
import { getAllPages, deletePage, duplicatePage, bulkDeletePages } from "../queries/pageManager";
import { invalidateMediaCache } from "../queries/mediaManager";
import { usePageSelection } from "../hooks/usePageSelection";
import useConfirmationAction from "../hooks/useConfirmationAction";
import useFormatDate from "../hooks/useFormatDate";
import useToastStore from "../stores/toastStore";
import useProjectStore from "../stores/projectStore";
import PageLayout from "../components/layout/PageLayout";
import Button, { IconButton } from "../components/ui/Button";
import Table from "../components/ui/Table";
import { sortItemsByCopyName } from "../utils/copyNameSort";
import LoadingSpinner from "../components/ui/LoadingSpinner";

export default function Pages() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);
  const { selectedPages, togglePageSelection, selectAllPages, clearSelection, isAllSelected } = usePageSelection();
  const { formatDate } = useFormatDate();
  const showToast = useToastStore((state) => state.showToast);
  const activeProject = useProjectStore((state) => state.activeProject);

  // Handle page deletion with confirmation
  const handleDelete = async (data) => {
    try {
      if (data.isBulkDelete) {
        await bulkDeletePages(data.pageIds);
        showToast(t("pages.toasts.deleteBulkSuccess", { count: data.pageIds.length }), "success");
        clearSelection();
      } else {
        await deletePage(data.pageId);
        showToast(t("pages.toasts.deleteSuccess"), "success");
      }
      if (activeProject) {
        invalidateMediaCache(activeProject.id);
      }
      loadPages();
    } catch (error) {
      console.error("Error deleting page(s):", error);
      showToast(t("pages.toasts.deleteError"), "error");
    }
  };

  const handleNewPage = () => {
    navigate("/pages/add");
  };

  const { confirm, confirmationModal } = useConfirmationAction(handleDelete);

  useEffect(() => {
    if (!activeProject?.id) {
      setPages([]);
      setLoading(false);
      clearSelection();
      return;
    }

    clearSelection();
    loadPages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject?.id]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpenMenuId(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const loadPages = async () => {
    try {
      setLoading(true);
      const data = await getAllPages();
      setPages(data);
    } catch (error) {
      console.error("Error loading pages:", error);
      showToast(t("pages.toasts.loadError"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePage = (pageId, pageName) => {
    confirm({
      title: t("pages.deleteModal.title"),
      message: t("pages.deleteModal.message", { name: pageName }),
      confirmText: t("pages.deleteModal.confirm"),
      cancelText: t("pages.deleteModal.cancel"),
      variant: "danger",
      data: { pageId, pageName, isBulkDelete: false },
    });
  };

  const handleBulkDelete = () => {
    const selectedCount = selectedPages.length;
    confirm({
      title: t("pages.deleteModal.titleBulk"),
      message: t("pages.deleteModal.messageBulk", { count: selectedCount }),
      confirmText: t("pages.deleteModal.confirmBulk", { count: selectedCount }),
      cancelText: t("pages.deleteModal.cancel"),
      variant: "danger",
      data: { pageIds: selectedPages, isBulkDelete: true },
    });
  };

  const handleDuplicatePage = async (pageId) => {
    try {
      await duplicatePage(pageId);
      showToast(t("pages.toasts.duplicateSuccess"), "success");
      loadPages();
      // Invalidate media cache since the duplicate may reference the same images
      if (activeProject) {
        invalidateMediaCache(activeProject.id);
      }
    } catch (error) {
      console.error("Error duplicating page:", error);
      showToast(t("pages.toasts.duplicateError"), "error");
    }
  };

  const handleSelectAll = () => {
    if (isAllSelected(filteredPages)) {
      clearSelection();
    } else {
      selectAllPages(filteredPages.map((page) => page.id));
    }
  };

  // Filter pages based on search term
  const filteredPages = sortItemsByCopyName(
    pages.filter(
      (page) =>
        page.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        page.slug.toLowerCase().includes(searchTerm.toLowerCase()),
    ),
  );

  if (loading) {
    return (
      <PageLayout title={t("pages.title")}>
        <LoadingSpinner message={t("pages.loading")} />
      </PageLayout>
    );
  }

  const hasPages = pages.length > 0;

  return (
    <PageLayout
      title={hasPages ? t("pages.title") : undefined}
      buttonProps={
        hasPages
          ? {
              onClick: handleNewPage,
              children: t("pages.newPage"),
              icon: <CirclePlus size={18} />,
            }
          : undefined
      }
    >
      {hasPages && (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap justify-between mb-4 items-center">
            <div className="flex items-center mb-2 sm:mb-0">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-600">{t("pages.count", { count: pages.length })}</span>
                {selectedPages.length > 0 && (
                  <>
                    <span className="text-sm text-slate-600">
                      • {t("pages.selected", { count: selectedPages.length })}
                    </span>
                    <Button
                      onClick={handleBulkDelete}
                      variant="danger"
                      size="sm"
                      icon={<Trash2 size={18} />}
                      title={t("pages.deleteSelected")}
                    >
                      {t("pages.delete")}
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder={t("pages.searchPlaceholder")}
                className="form-input pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <Table
            className="[&_th:first-child]:w-12 [&_th:first-child]:!pl-4 [&_th:first-child]:!pr-1 [&_td:first-child]:w-12 [&_td:first-child]:!pl-4 [&_td:first-child]:!pr-1 [&_th:nth-child(2)]:!pl-[11px] [&_td:nth-child(2)]:!pl-[11px]"
            headers={[
              <IconButton
                onClick={handleSelectAll}
                variant="neutral"
                size="sm"
                key="select-all"
                className="border border-transparent bg-white/80 hover:border-slate-200 hover:bg-white"
              >
                {isAllSelected(filteredPages) && filteredPages.length > 0 ? (
                  <div className="w-4 h-4 bg-pink-500 text-white flex items-center justify-center rounded-sm">
                    <Check size={12} />
                  </div>
                ) : (
                  <div className="w-4 h-4 border border-slate-400 rounded-sm"></div>
                )}
              </IconButton>,
              t("pages.headers.title"),
              t("pages.headers.updated"),
              t("pages.headers.actions"),
            ]}
            data={filteredPages}
            emptyMessage={
              searchTerm ? (
                <div className="text-center py-4">
                  <FileText className="mx-auto mb-2 text-slate-400" size={32} />
                  <div className="font-medium">{t("pages.noPagesFound")}</div>
                  <div className="text-sm text-slate-500">{t("pages.noPagesMatch", { term: searchTerm })}</div>
                </div>
              ) : (
                t("pages.noPagesAvailable")
              )
            }
            renderRow={(page) => {
              const isSelected = selectedPages.includes(page.id);
              const menuButtonClass = "w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors";

              return (
                <>
                  <td className={`py-3 px-4 ${isSelected ? "bg-pink-50" : ""}`}>
                    <IconButton
                      onClick={() => togglePageSelection(page.id)}
                      variant="neutral"
                      size="sm"
                      className="border border-transparent bg-white/80 hover:border-slate-200 hover:bg-white"
                    >
                      {isSelected ? (
                        <div className="w-4 h-4 bg-pink-500 text-white flex items-center justify-center rounded-sm">
                          <Check size={12} />
                        </div>
                      ) : (
                        <div className="w-4 h-4 border border-slate-400 rounded-sm"></div>
                      )}
                    </IconButton>
                  </td>
                  <td className={`py-3 px-4 ${isSelected ? "bg-pink-50" : ""}`}>
                    <Link
                      to={`/page-editor?pageId=${page.id}`}
                      className="block w-full min-w-0 rounded-sm font-medium text-slate-900 transition-colors hover:text-pink-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2"
                    >
                      <span className="block truncate">{page.name}</span>
                    </Link>
                  </td>
                  <td className={`py-3 px-4 whitespace-nowrap ${isSelected ? "bg-pink-50" : ""}`}>
                    <div className="text-slate-600 text-sm">{formatDate(page.updated)}</div>
                  </td>
                  <td className={`py-3 px-4 text-right ${isSelected ? "bg-pink-50" : ""}`}>
                    <div className="relative inline-flex items-center justify-end" ref={openMenuId === page.id ? menuRef : null}>
                      <IconButton
                        onClick={() => setOpenMenuId(openMenuId === page.id ? null : page.id)}
                        variant="neutral"
                        size="sm"
                        className={`border transition-all ${
                          openMenuId === page.id
                            ? "border-pink-200 bg-pink-50 text-pink-600"
                            : "border-transparent bg-white/80 hover:border-slate-200 hover:bg-white hover:text-slate-900"
                        }`}
                        aria-label={t("pages.actions.menu", "Page actions")}
                        aria-haspopup="menu"
                        aria-expanded={openMenuId === page.id}
                      >
                        <MoreVertical size={18} />
                      </IconButton>

                      {openMenuId === page.id && (
                        <div className="absolute right-0 top-full z-10 mt-1 w-56 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                          <Link
                            to={`/page-editor?pageId=${page.id}`}
                            onClick={() => setOpenMenuId(null)}
                            className={`${menuButtonClass} text-slate-700 hover:bg-slate-50`}
                          >
                            <Palette size={14} />
                            {t("pages.actions.design")}
                          </Link>
                          <Link
                            to={`/pages/${page.id}/edit`}
                            onClick={() => setOpenMenuId(null)}
                            className={`${menuButtonClass} text-slate-700 hover:bg-slate-50`}
                          >
                            <Pencil size={14} />
                            {t("pages.actions.edit")}
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              handleDuplicatePage(page.id);
                            }}
                            className={`${menuButtonClass} text-slate-700 hover:bg-slate-50`}
                          >
                            <Copy size={14} />
                            {t("pages.actions.duplicate")}
                          </button>
                          <div className="my-1 border-t border-slate-200" />
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              handleDeletePage(page.id, page.name);
                            }}
                            className={`${menuButtonClass} text-red-600 hover:bg-red-50`}
                          >
                            <Trash2 size={14} />
                            {t("pages.actions.delete")}
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </>
              );
            }}
          />
        </>
      )}

      {!hasPages && (
        <div className="p-8 text-center">
          <FileText className="mx-auto mb-4 text-slate-400" size={48} />
          <h2 className="text-xl font-semibold mb-2">{t("pages.noPagesYet")}</h2>
          <p className="text-slate-600 mb-4">{t("pages.createFirstPage")}</p>
          <Link to="/pages/add">
            <Button variant="primary" icon={<CirclePlus size={18} />}>
              {t("pages.newPage")}
            </Button>
          </Link>
        </div>
      )}

      {confirmationModal}
    </PageLayout>
  );
}
