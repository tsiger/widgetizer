import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Palette, Pencil, Trash2, Copy, Search, Check, FileText, CirclePlus, AlertCircle } from "lucide-react";
import { getAllPages, deletePage, duplicatePage, bulkDeletePages } from "../utils/pageManager";
import { usePageSelection } from "../hooks/usePageSelection";
import useConfirmationModal from "../hooks/useConfirmationModal";
import useToastStore from "../stores/toastStore";
import useProjectStore from "../stores/projectStore";
import useAppSettings from "../hooks/useAppSettings";
import PageLayout from "../components/layout/PageLayout";
import Button, { IconButton } from "../components/ui/Button";
import Tooltip from "../components/ui/Tooltip";
import ConfirmationModal from "../components/ui/ConfirmationModal";
import Table from "../components/ui/Table";
import { formatDate } from "../utils/dateFormatter";

export default function Pages() {
  const navigate = useNavigate();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { selectedPages, togglePageSelection, selectAllPages, clearSelection, isAllSelected } = usePageSelection();
  const showToast = useToastStore((state) => state.showToast);
  const activeProject = useProjectStore((state) => state.activeProject);

  // Get app settings for date formatting
  const { settings: appSettings } = useAppSettings();

  // Handle page deletion with confirmation
  const handleDelete = async (data) => {
    try {
      if (data.isBulkDelete) {
        await bulkDeletePages(data.pageIds);
        showToast(`Successfully deleted ${data.pageIds.length} page${data.pageIds.length > 1 ? "s" : ""}`, "success");
        clearSelection();
      } else {
        await deletePage(data.pageId);
        showToast("Page deleted successfully", "success");
      }
      loadPages();
    } catch (error) {
      console.error("Error deleting page(s):", error);
      showToast("Failed to delete page(s)", "error");
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
      showToast("Failed to load pages", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePage = (pageId, pageName) => {
    openModal({
      title: "Delete Page",
      message: `Are you sure you want to delete "${pageName}"? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
      data: { pageId, pageName, isBulkDelete: false },
    });
  };

  const handleBulkDelete = () => {
    const selectedCount = selectedPages.length;
    openModal({
      title: "Delete Pages",
      message: `Are you sure you want to delete ${selectedCount} page${selectedCount > 1 ? "s" : ""}? This action cannot be undone.`,
      confirmText: `Delete ${selectedCount} Page${selectedCount > 1 ? "s" : ""}`,
      cancelText: "Cancel",
      variant: "danger",
      data: { pageIds: selectedPages, isBulkDelete: true },
    });
  };

  const handleDuplicatePage = async (pageId) => {
    try {
      await duplicatePage(pageId);
      showToast("Page duplicated successfully", "success");
      loadPages();
    } catch (error) {
      console.error("Error duplicating page:", error);
      showToast("Failed to duplicate page", "error");
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

  if (!activeProject) {
    return (
      <PageLayout title="Pages">
        <div className="p-8 text-center">
          <AlertCircle className="mx-auto mb-4 text-yellow-500" size={48} />
          <h2 className="text-xl font-semibold mb-2">No Active Project</h2>
          <p className="text-slate-600 mb-4">Please select or create a project to manage your pages.</p>
        </div>
      </PageLayout>
    );
  }

  if (loading) {
    return (
      <PageLayout title="Pages">
        <div className="flex justify-center items-center h-64">
          <div className="text-slate-600">Loading pages...</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Pages"
      buttonProps={{
        onClick: handleNewPage,
        children: "New page",
        icon: <CirclePlus size={18} />,
      }}
    >
      {pages.length > 0 && (
        <>
          {/* Toolbar */}
          <div className="mt-4 flex flex-wrap justify-between mb-4 items-center">
            <div className="flex items-center mb-2 sm:mb-0">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-600">
                  {pages.length} page{pages.length !== 1 ? "s" : ""}
                </span>
                {selectedPages.length > 0 && (
                  <>
                    <span className="text-sm text-slate-600">• {selectedPages.length} selected</span>
                    <Button
                      onClick={handleBulkDelete}
                      variant="danger"
                      size="sm"
                      icon={<Trash2 size={18} />}
                      title="Delete Selected"
                    >
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search pages..."
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
              "Name",
              "Filename",
              "Created",
              "Updated",
              "Actions",
            ]}
            data={filteredPages}
            emptyMessage={
              searchTerm ? (
                <div className="text-center py-4">
                  <FileText className="mx-auto mb-2 text-slate-400" size={32} />
                  <div className="font-medium">No pages found</div>
                  <div className="text-sm text-slate-500">
                    No pages match "{searchTerm}". Try a different search term.
                  </div>
                </div>
              ) : (
                "No pages available"
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
                        <Tooltip content="Design page">
                          <Link to={`/page-editor?pageId=${page.id}`}>
                            <IconButton variant="neutral" size="sm">
                              <Palette size={18} />
                            </IconButton>
                          </Link>
                        </Tooltip>
                      </div>
                      <Tooltip content="Edit page">
                        <Link to={`/pages/${page.id}/edit`}>
                          <IconButton variant="neutral" size="sm">
                            <Pencil size={18} />
                          </IconButton>
                        </Link>
                      </Tooltip>
                      <Tooltip content="Duplicate page">
                        <IconButton onClick={() => handleDuplicatePage(page.id)} variant="neutral" size="sm">
                          <Copy size={18} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip content="Delete page">
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
          <h2 className="text-xl font-semibold mb-2">No pages yet</h2>
          <p className="text-slate-600 mb-4">Create your first page to get started.</p>
          <Link to="/pages/add">
            <Button variant="primary" icon={<CirclePlus size={18} />}>
              New page
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
