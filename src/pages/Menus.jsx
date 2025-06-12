import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Trash2, Pencil, List, AlertCircle, CirclePlus, Copy } from "lucide-react";

import PageLayout from "../components/layout/PageLayout";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Tooltip from "../components/ui/Tooltip";
import Table from "../components/ui/Table";
import { IconButton } from "../components/ui/Button";
import ConfirmationModal from "../components/ui/ConfirmationModal";
import useConfirmationModal from "../hooks/useConfirmationModal";

import { getAllMenus, deleteMenu, duplicateMenu } from "../utils/menuManager";

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
      await deleteMenu(data.id);
      setMenus(menus.filter((menu) => menu.id !== data.id));
      showToast(`Menu "${data.name}" was deleted successfully`, "success");
    } catch (err) {
      showToast("Failed to delete menu", "error");
    }
  };

  const handleDuplicate = async (menuId) => {
    try {
      const newMenu = await duplicateMenu(menuId);
      setMenus([...menus, newMenu]);
      showToast("Menu duplicated successfully", "success");
    } catch (error) {
      showToast("Failed to duplicate menu", "error");
    }
  };

  const { modalState, openModal, closeModal, handleConfirm } = useConfirmationModal(handleDelete);

  const openDeleteConfirmation = (id, name) => {
    openModal({
      title: "Delete Menu",
      message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
      data: { id, name },
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
        <Table
          headers={["Title", "Description", "Actions"]}
          data={menus}
          emptyMessage="No menus yet. Create your first menu!"
          renderRow={(menu) => (
            <>
              <td className="py-3 px-4 font-semibold">{menu.name}</td>
              <td className="py-3 px-4 text-slate-600">{menu.description}</td>
              <td className="py-3 px-4 text-right">
                <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <div className="flex gap-2 pr-2 border-r border-slate-200">
                    <Tooltip content="Edit menu structure">
                      <IconButton
                        onClick={() => navigate(`/menus/${menu.id}/structure`)}
                        variant="neutral"
                        size="sm"
                        title="Edit Menu Structure"
                      >
                        <Menu size={18} />
                      </IconButton>
                    </Tooltip>
                  </div>
                  <Tooltip content="Duplicate menu">
                    <IconButton
                      onClick={() => handleDuplicate(menu.id)}
                      variant="neutral"
                      size="sm"
                      title="Duplicate Menu"
                    >
                      <Copy size={18} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip content="Edit menu settings">
                    <IconButton
                      onClick={() => navigate(`/menus/edit/${menu.id}`)}
                      variant="neutral"
                      size="sm"
                      title="Edit Menu Settings"
                    >
                      <Pencil size={18} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip content="Delete menu">
                    <IconButton
                      onClick={() => openDeleteConfirmation(menu.id, menu.name)}
                      variant="danger"
                      size="sm"
                      title="Delete Menu"
                    >
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
