import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Trash2, Pencil, List, AlertCircle, CirclePlus } from "lucide-react";

import PageLayout from "../components/layout/PageLayout";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Tooltip from "../components/ui/Tooltip";
import ConfirmationModal from "../components/ui/ConfirmationModal";
import useConfirmationModal from "../hooks/useConfirmationModal";

import { getAllMenus, deleteMenu } from "../utils/menuManager";

import useToastStore from "../stores/toastStore";
import useProjectStore from "../stores/projectStore";

export default function Menus() {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const showToast = useToastStore((state) => state.showToast);
  const activeProject = useProjectStore((state) => state.activeProject);

  useEffect(() => {
    loadMenus();
  }, []);

  const loadMenus = async () => {
    try {
      const menuData = await getAllMenus();
      setMenus(menuData);
    } catch (err) {
      showToast("Failed to load menus", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleNewMenu = () => {
    navigate("/menus/add");
  };

  const handleDelete = async (data) => {
    try {
      await deleteMenu(data.slug);
      setMenus(menus.filter((menu) => menu.slug !== data.slug));
      showToast(`Menu "${data.name}" was deleted successfully`, "success");
    } catch (err) {
      showToast("Failed to delete menu", "error");
    }
  };

  const { modalState, openModal, closeModal, handleConfirm } = useConfirmationModal(handleDelete);

  const openDeleteConfirmation = (slug, name) => {
    openModal({
      title: "Delete Menu",
      message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
      data: { slug, name },
    });
  };

  if (!activeProject) {
    return (
      <PageLayout title="Menus">
        <div className="p-8 text-center">
          <AlertCircle className="mx-auto mb-4 text-yellow-500" size={48} />
          <h2 className="text-xl font-semibold mb-2">No Active Project</h2>
          <p className="text-slate-600 mb-4">Please select or create a project to manage your menus.</p>
        </div>
      </PageLayout>
    );
  }

  if (loading) {
    return (
      <PageLayout title="Menus">
        <LoadingSpinner message="Loading menus..." />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Menus"
      buttonProps={{
        onClick: handleNewMenu,
        children: "New menu",
        icon: <CirclePlus size={18} />,
      }}
    >
      <div>
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="text-left py-3 px-4">Title</th>
              <th className="text-left py-3 px-4">Description</th>
              <th className="text-right py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {menus.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-8 text-slate-500">
                  No menus yet. Create your first menu!
                </td>
              </tr>
            ) : (
              menus.map((menu) => (
                <tr
                  key={menu.slug}
                  className="border-b border-slate-200 hover:bg-slate-50 transition-colors duration-150 group"
                >
                  <td className="py-3 px-4 font-semibold">{menu.name}</td>
                  <td className="py-3 px-4 text-slate-600">{menu.description}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <Tooltip content="Edit menu structure">
                        <button
                          onClick={() => navigate(`/menus/${menu.slug}/structure`)}
                          className="p-2 hover:bg-slate-100 rounded-sm text-slate-600 cursor-pointer"
                          title="Edit Menu Structure"
                        >
                          <Menu size={18} />
                        </button>
                      </Tooltip>
                      <Tooltip content="Edit menu settings">
                        <button
                          onClick={() => navigate(`/menus/edit/${menu.slug}`)}
                          className="p-2 hover:bg-slate-100 rounded-sm text-slate-600 cursor-pointer"
                          title="Edit Menu Settings"
                        >
                          <Pencil size={18} />
                        </button>
                      </Tooltip>
                      <Tooltip content="Delete menu">
                        <button
                          onClick={() => openDeleteConfirmation(menu.slug, menu.name)}
                          className="p-2 hover:bg-slate-100 rounded-sm text-red-600 cursor-pointer"
                          title="Delete Menu"
                        >
                          <Trash2 size={18} />
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
