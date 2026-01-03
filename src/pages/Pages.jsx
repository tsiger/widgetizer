import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Palette, Pencil, Trash2, Copy, Search, Check, FileText, CirclePlus } from "lucide-react";
import { getAllPages, deletePage, duplicatePage, bulkDeletePages } from "../queries/pageManager";
import { usePageSelection } from "../hooks/usePageSelection";
import useConfirmationModal from "../hooks/useConfirmationModal";
import useToastStore from "../stores/toastStore";
import useAppSettings from "../hooks/useAppSettings";
import PageLayout from "../components/layout/PageLayout";
import Button, { IconButton } from "../components/ui/Button";
import Tooltip from "../components/ui/Tooltip";
import ConfirmationModal from "../components/ui/ConfirmationModal";
import Table from "../components/ui/Table";
import { formatDate } from "../utils/dateFormatter";
import LoadingSpinner from "../components/ui/LoadingSpinner";

export default function Pages() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { selectedPages, togglePageSelection, selectAllPages, clearSelection, isAllSelected } = usePageSelection();
  const showToast = useToastStore((state) => state.showToast);

  // Get app settings for date formatting
  const { settings: appSettings } = useAppSettings();

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
      loadPages();
    } catch (error) {
      console.error("Error deleting page(s):", error);
      showToast(t("pages.toasts.deleteError"), "error");
    }
  };

  const handleNewPage = () => {
    navigate("/pages/add");
  };

  const { modalState, openModal, closeModal, handleConfirm } = useConfirmationModal(handleDelete);

  useEffect(() => {
    loadPages();
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
    openModal({
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
    openModal({
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
  const filteredPages = pages.filter(
    (page) =>
      page.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      page.slug.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading) {
    return (
      <PageLayout title={t("pages.title")}>
        <LoadingSpinner message={t("pages.loading")} />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={t("pages.title")}
      buttonProps={{
        onClick: handleNewPage,
        children: t("pages.newPage"),
        icon: <CirclePlus size={18} />,
      }}
    >
      {pages.length > 0 && (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap justify-between mb-4 items-center">
            <div className="flex items-center mb-2 sm:mb-0">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-600">
                  {t("pages.count", { count: pages.length })}
                </span>
                {selectedPages.length > 0 && (
                  <>
                    <span className="text-sm text-slate-600">• {t("pages.selected", { count: selectedPages.length })}</span>
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
            headers={[
              <IconButton onClick={handleSelectAll} variant="neutral" size="sm" key="select-all">
                {isAllSelected(filteredPages) && filteredPages.length > 0 ? (
                  <div className="w-4 h-4 bg-pink-500 text-white flex items-center justify-center rounded-sm">
                    <Check size={12} />
                  </div>
                ) : (
                  <div className="w-4 h-4 border border-slate-400 rounded-sm"></div>
                )}
              </IconButton>,
              t("pages.headers.title"),
              t("pages.headers.filename"),
              t("pages.headers.created"),
              t("pages.headers.updated"),
              t("pages.headers.actions"),
            ]}
            data={filteredPages}
            emptyMessage={
              searchTerm ? (
                <div className="text-center py-4">
                  <FileText className="mx-auto mb-2 text-slate-400" size={32} />
                  <div className="font-medium">{t("pages.noPagesFound")}</div>
                  <div className="text-sm text-slate-500">
                    {t("pages.noPagesMatch", { term: searchTerm })}
                  </div>
                </div>
              ) : (
                t("pages.noPagesAvailable")
              )
            }
            renderRow={(page) => {
              const dateFormat = appSettings?.general?.dateFormat || "MM/DD/YYYY";

              return (
                <>
                  <td className={`py-3 px-4 ${selectedPages.includes(page.id) ? "bg-pink-50" : ""}`}>
                    <IconButton onClick={() => togglePageSelection(page.id)} variant="neutral" size="sm">
                      {selectedPages.includes(page.id) ? (
                        <div className="w-4 h-4 bg-pink-500 text-white flex items-center justify-center rounded-sm">
                          <Check size={12} />
                        </div>
                      ) : (
                        <div className="w-4 h-4 border border-slate-400 rounded-sm"></div>
                      )}
                    </IconButton>
                  </td>
                  <td className={`py-3 px-4 ${selectedPages.includes(page.id) ? "bg-pink-50" : ""}`}>
                    <div className="font-medium text-slate-900">{page.name}</div>
                  </td>
                  <td className={`py-3 px-4 ${selectedPages.includes(page.id) ? "bg-pink-50" : ""}`}>
                    <div className="text-slate-600 font-mono text-sm">{page.slug}.html</div>
                  </td>
                  <td className={`py-3 px-4 ${selectedPages.includes(page.id) ? "bg-pink-50" : ""}`}>
                    <div className="text-slate-600 text-sm">{formatDate(page.created, dateFormat)}</div>
                  </td>
                  <td className={`py-3 px-4 ${selectedPages.includes(page.id) ? "bg-pink-50" : ""}`}>
                    <div className="text-slate-600 text-sm">{formatDate(page.updated, dateFormat)}</div>
                  </td>
                  <td className={`py-3 px-4 text-right ${selectedPages.includes(page.id) ? "bg-pink-50" : ""}`}>
                    <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <div className="flex gap-2 pr-2 border-r border-slate-200">
                        <Tooltip content={t("pages.actions.design")}>
                          <Link to={`/page-editor?pageId=${page.id}`}>
                            <IconButton variant="neutral" size="sm">
                              <Palette size={18} />
                            </IconButton>
                          </Link>
                        </Tooltip>
                      </div>
                      <Tooltip content={t("pages.actions.edit")}>
                        <Link to={`/pages/${page.id}/edit`}>
                          <IconButton variant="neutral" size="sm">
                            <Pencil size={18} />
                          </IconButton>
                        </Link>
                      </Tooltip>
                      <Tooltip content={t("pages.actions.duplicate")}>
                        <IconButton onClick={() => handleDuplicatePage(page.id)} variant="neutral" size="sm">
                          <Copy size={18} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip content={t("pages.actions.delete")}>
                        <IconButton onClick={() => handleDeletePage(page.id, page.name)} variant="danger" size="sm">
                          <Trash2 size={18} />
                        </IconButton>
                      </Tooltip>
                    </div>
                  </td>
                </>
              );
            }}
          />
        </>
      )}

      {pages.length === 0 && (
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

      <ConfirmationModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onConfirm={handleConfirm}
        title={modalState.title}
        message={modalState.message}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        variant={modalState.variant}
      />
    </PageLayout>
  );
}
