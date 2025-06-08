import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Pencil, Trash2, Palette, AlertCircle, CirclePlus, Copy } from "lucide-react";

import PageLayout from "../components/layout/PageLayout";
import Tooltip from "../components/ui/Tooltip";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Table from "../components/ui/Table";
import { IconButton } from "../components/ui/Button";

import { getAllPages, deletePage, duplicatePage } from "../utils/pageManager";
import ConfirmationModal from "../components/ui/ConfirmationModal";
import useProjectStore from "../stores/projectStore";
import useToastStore from "../stores/toastStore";
import useConfirmationModal from "../hooks/useConfirmationModal";

export default function Pages() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const showToast = useToastStore((state) => state.showToast);
  const activeProject = useProjectStore((state) => state.activeProject);

  // Handle page deletion with confirmation
  const handleDelete = async (data) => {
    try {
      await deletePage(data.pageId);
      setPages(pages.filter((page) => page.id !== data.pageId));
      showToast(`Page "${data.pageName}" was deleted successfully`, "success");
    } catch (error) {
      showToast("Failed to delete page", "error");
    }
  };

  // Use our custom confirmation modal hook
  const { modalState, openModal, closeModal, handleConfirm } = useConfirmationModal(handleDelete);

  useEffect(() => {
    const loadPages = async () => {
      try {
        const themePages = await getAllPages();
        setPages(themePages);
      } catch (error) {
        showToast("Failed to load pages", "error");
      } finally {
        setLoading(false);
      }
    };

    loadPages();
  }, [showToast]);

  const handleNewPage = () => {
    navigate("/pages/add");
  };

  const handleDuplicate = async (pageId) => {
    try {
      const newPage = await duplicatePage(pageId);
      setPages([...pages, newPage]);
      showToast(`Page duplicated successfully`, "success");
    } catch (error) {
      showToast("Failed to duplicate page", "error");
    }
  };

  const openDeleteConfirmation = (pageId, pageName) => {
    openModal({
      title: "Delete Page",
      message: `Are you sure you want to delete "${pageName}"? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
      data: { pageId, pageName },
    });
  };

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
        <LoadingSpinner message="Loading pages..." />
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
      <div>
        <Table
          headers={["Title", "Filename", "Actions"]}
          data={pages}
          emptyMessage={
            <>
              No pages yet.{" "}
              <Link to="/pages/add" className="text-pink-600 hover:text-pink-700 font-medium">
                Create your first page!
              </Link>
            </>
          }
          renderRow={(page) => (
            <>
              <td className="py-3 px-4 font-semibold">{page.name}</td>
              <td className="py-3 px-4 text-slate-600">/{page.slug}.html</td>
              <td className="py-3 px-4 text-right">
                <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <div className="flex gap-2 pr-2 border-r border-slate-200">
                    <Tooltip content="Design page">
                      <IconButton
                        onClick={() => navigate(`/page-editor?pageId=${page.id}`)}
                        variant="neutral"
                        size="sm"
                      >
                        <Palette size={18} />
                      </IconButton>
                    </Tooltip>
                  </div>
                  <Tooltip content="Duplicate page">
                    <IconButton onClick={() => handleDuplicate(page.id)} variant="neutral" size="sm">
                      <Copy size={18} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip content="Edit page">
                    <IconButton onClick={() => navigate(`/pages/${page.id}/edit`)} variant="neutral" size="sm">
                      <Pencil size={18} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip content="Delete page">
                    <IconButton onClick={() => openDeleteConfirmation(page.id, page.name)} variant="danger" size="sm">
                      <Trash2 size={18} />
                    </IconButton>
                  </Tooltip>
                </div>
              </td>
            </>
          )}
        />
      </div>

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
