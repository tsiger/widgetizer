import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, Trash2, Pencil, CirclePlus, Copy } from "lucide-react";

import PageLayout from "../components/layout/PageLayout";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Tooltip from "../components/ui/Tooltip";
import Table from "../components/ui/Table";
import { IconButton } from "../components/ui/Button";
import ConfirmationModal from "../components/ui/ConfirmationModal";
import useConfirmationModal from "../hooks/useConfirmationModal";

import { getAllMenus, deleteMenu, duplicateMenu } from "../queries/menuManager";
import { formatDate } from "../utils/dateFormatter";

import useToastStore from "../stores/toastStore";
import useProjectStore from "../stores/projectStore";
import useAppSettings from "../hooks/useAppSettings";

export default function Menus() {
  const { t } = useTranslation();
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const showToast = useToastStore((state) => state.showToast);
  const activeProject = useProjectStore((state) => state.activeProject);

  // Get app settings for date formatting
  const { settings: appSettings } = useAppSettings();

  // Reload menus when navigating to this page or when active project changes
  useEffect(() => {
    loadMenus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, activeProject?.id]);

  const loadMenus = async () => {
    try {
      const menuData = await getAllMenus();
      setMenus(menuData);
    } catch (error) {
      console.error("Failed to load menus:", error);
      showToast(t("menus.toasts.loadError"), "error");
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
      showToast(t("menus.toasts.deleteSuccess", { name: data.name }), "success");
    } catch (error) {
      console.error("Failed to delete menu:", error);
      showToast(t("menus.toasts.deleteError"), "error");
    }
  };

  const handleDuplicate = async (menuId) => {
    try {
      const newMenu = await duplicateMenu(menuId);
      setMenus([...menus, newMenu]);
      showToast(t("menus.toasts.duplicateSuccess"), "success");
    } catch (error) {
      console.error("Failed to duplicate menu:", error);
      showToast(t("menus.toasts.duplicateError"), "error");
    }
  };

  const { modalState, openModal, closeModal, handleConfirm } = useConfirmationModal(handleDelete);

  const openDeleteConfirmation = (id, name) => {
    openModal({
      title: t("menus.deleteModal.title"),
      message: t("menus.deleteModal.message", { name }),
      confirmText: t("menus.deleteModal.confirm"),
      cancelText: t("menus.deleteModal.cancel"),
      variant: "danger",
      data: { id, name },
    });
  };

  if (loading) {
    return (
      <PageLayout title={t("menus.title")}>
        <LoadingSpinner message={t("menus.loading")} />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={t("menus.title")}
      buttonProps={{
        onClick: handleNewMenu,
        children: t("menus.newMenu"),
        icon: <CirclePlus size={18} />,
      }}
    >
      <div>
        <Table
          headers={[
            t("menus.headers.title"),
            t("menus.headers.description"),
            t("menus.headers.created"),
            t("menus.headers.updated"),
            t("menus.headers.actions"),
          ]}
          data={menus}
          emptyMessage={t("menus.noMenus")}
          renderRow={(menu) => {
            const dateFormat = appSettings?.general?.dateFormat || "MM/DD/YYYY";

            return (
              <>
                <td className="py-3 px-4 font-semibold">{menu.name}</td>
                <td className="py-3 px-4 text-slate-600">{menu.description}</td>
                <td className="py-3 px-4">
                  <div className="text-slate-600 text-sm">{formatDate(menu.created, dateFormat)}</div>
                </td>
                <td className="py-3 px-4">
                  <div className="text-slate-600 text-sm">{formatDate(menu.updated, dateFormat)}</div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <div className="flex gap-2 pr-2 border-r border-slate-200">
                      <Tooltip content={t("menus.actions.editStructure")}>
                        <IconButton
                          onClick={() => navigate(`/menus/${menu.id}/structure`)}
                          variant="neutral"
                          size="sm"
                          title={t("menus.actions.editStructure")}
                        >
                          <Menu size={18} />
                        </IconButton>
                      </Tooltip>
                    </div>
                    <Tooltip content={t("menus.actions.duplicate")}>
                      <IconButton
                        onClick={() => handleDuplicate(menu.id)}
                        variant="neutral"
                        size="sm"
                        title={t("menus.actions.duplicate")}
                      >
                        <Copy size={18} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip content={t("menus.actions.editSettings")}>
                      <IconButton
                        onClick={() => navigate(`/menus/edit/${menu.id}`)}
                        variant="neutral"
                        size="sm"
                        title={t("menus.actions.editSettings")}
                      >
                        <Pencil size={18} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip content={t("menus.actions.delete")}>
                      <IconButton
                        onClick={() => openDeleteConfirmation(menu.id, menu.name)}
                        variant="danger"
                        size="sm"
                        title={t("menus.actions.delete")}
                      >
                        <Trash2 size={18} />
                      </IconButton>
                    </Tooltip>
                  </div>
                </td>
              </>
            );
          }}
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
