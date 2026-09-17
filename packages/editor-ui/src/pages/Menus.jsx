import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ListTree, Trash2, Pencil, CirclePlus, Copy, MoreVertical } from "lucide-react";

import PageLayout from "../components/layout/PageLayout";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Table from "../components/ui/Table";
import Button, { IconButton } from "../components/ui/Button";
import useConfirmationAction from "../hooks/useConfirmationAction";
import useFormatDate from "../hooks/useFormatDate";

import { getAllMenus, deleteMenu, duplicateMenu } from "../queries/menuManager";
import { sortItemsByCopyName } from "../utils/copyNameSort";

import useToastStore from "../stores/toastStore";
import useProjectStore, { useDefaultLanguage, useIsMultilang } from "../stores/projectStore";
import LanguageTabs from "../components/content/LanguageTabs";
import { menuStructureHref, menuSettingsHref, menuAddHref } from "../lib/contentRoutes";
import { useEditorPath } from "../lib/routeBase.jsx";

export default function Menus() {
  const { t } = useTranslation();
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const editorPath = useEditorPath();
  const location = useLocation();
  const { formatDate } = useFormatDate();
  const showToast = useToastStore((state) => state.showToast);
  const activeProject = useProjectStore((state) => state.activeProject);
  const isMultilang = useIsMultilang();
  const defaultLanguage = useDefaultLanguage();
  const [activeLanguage, setActiveLanguage] = useState(defaultLanguage);

  // Reload menus when navigating to this page or when active project changes
  useEffect(() => {
    loadMenus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, activeProject?.id]);

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
    // A new menu belongs to the language being looked at.
    navigate(editorPath(menuAddHref(isMultilang ? activeLanguage : undefined)));
  };

  const handleDelete = async (data) => {
    try {
      await deleteMenu(data.id, data.language);
      setMenus(menus.filter((menu) => !(menu.id === data.id && menu.language === data.language)));
      showToast(t("menus.toasts.deleteSuccess", { name: data.name }), "success");
    } catch (error) {
      console.error("Failed to delete menu:", error);
      showToast(t("menus.toasts.deleteError"), "error");
    }
  };

  const handleDuplicate = async (menuId, language) => {
    try {
      const newMenu = await duplicateMenu(menuId, language);
      setMenus([...menus, newMenu]);
      showToast(t("menus.toasts.duplicateSuccess"), "success");
    } catch (error) {
      console.error("Failed to duplicate menu:", error);
      showToast(t("menus.toasts.duplicateError"), "error");
    }
  };

  const { confirm, confirmationModal } = useConfirmationAction(handleDelete);

  const openDeleteConfirmation = (id, name, language) => {
    confirm({
      title: t("menus.deleteModal.title"),
      message: t("menus.deleteModal.message", { name }),
      confirmText: t("menus.deleteModal.confirm"),
      cancelText: t("menus.deleteModal.cancel"),
      variant: "danger",
      data: { id, name, language },
      // Opened from the row menu, which closes on the same click — hand focus
      // back to its trigger, not to the menu item that is about to unmount.
      returnFocusTo: menuRef.current?.querySelector('[aria-haspopup="menu"]'),
    });
  };

  if (loading) {
    return (
      <PageLayout title={t("menus.title")}>
        <LoadingSpinner message={t("menus.loading")} />
      </PageLayout>
    );
  }

  const menusInLanguage = isMultilang
    ? menus.filter((menu) => (menu.language || defaultLanguage) === activeLanguage)
    : menus;
  const sortedMenus = sortItemsByCopyName(menusInLanguage);
  // The tabs stay reachable even when the active one is empty, so a language
  // whose menus were all deleted can still take a new one.
  const hasMenus = menus.length > 0;

  const languageTabs = (
    <LanguageTabs value={activeLanguage} onChange={setActiveLanguage} label={t("menus.languages.tabsLabel")} />
  );

  return (
    <PageLayout
      title={hasMenus ? t("menus.title") : undefined}
      buttonProps={
        hasMenus
          ? {
              onClick: handleNewMenu,
              children: t("menus.newMenu"),
              icon: <CirclePlus size={18} />,
            }
          : undefined
      }
    >
      {languageTabs}
      {hasMenus ? (
        <div>
          <Table
            headers={[
              t("menus.headers.title"),
              t("menus.headers.updated"),
              t("menus.headers.actions"),
            ]}
            data={sortedMenus}
            emptyMessage={t("menus.noMenus")}
            renderRow={(menu) => {
              const menuButtonClass = "w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors";

              return (
                <>
                  <td className="py-3 px-4">
                    <Link
                      to={editorPath(menuStructureHref(menu, isMultilang))}
                      className="block w-full min-w-0 rounded-sm font-semibold text-slate-900 transition-colors hover:text-pink-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2"
                      title={menu.name}
                    >
                      <span className="block truncate">{menu.name}</span>
                    </Link>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="text-slate-600 text-sm">{formatDate(menu.updated)}</div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="relative inline-flex items-center justify-end" ref={openMenuId === menu.id ? menuRef : null}>
                      <IconButton
                        onClick={() => setOpenMenuId(openMenuId === menu.id ? null : menu.id)}
                        variant="neutral"
                        size="sm"
                        className={`border transition-all ${
                          openMenuId === menu.id
                            ? "border-pink-200 bg-pink-50 text-pink-600"
                            : "border-transparent bg-white/80 hover:border-slate-200 hover:bg-white hover:text-slate-900"
                        }`}
                        aria-label={t("menus.actions.menu", "Menu actions")}
                        aria-haspopup="menu"
                        aria-expanded={openMenuId === menu.id}
                      >
                        <MoreVertical size={18} />
                      </IconButton>

                      {openMenuId === menu.id && (
                        <div className="absolute right-0 top-full z-10 mt-1 w-60 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                          <Link
                            to={editorPath(menuStructureHref(menu, isMultilang))}
                            onClick={() => setOpenMenuId(null)}
                            className={`${menuButtonClass} text-slate-700 hover:bg-slate-50`}
                          >
                            <ListTree size={14} />
                            {t("menus.actions.editStructure")}
                          </Link>
                          <Link
                            to={editorPath(menuSettingsHref(menu, isMultilang))}
                            onClick={() => setOpenMenuId(null)}
                            className={`${menuButtonClass} text-slate-700 hover:bg-slate-50`}
                          >
                            <Pencil size={14} />
                            {t("menus.actions.editSettings")}
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              handleDuplicate(menu.id, menu.language);
                            }}
                            className={`${menuButtonClass} text-slate-700 hover:bg-slate-50`}
                          >
                            <Copy size={14} />
                            {t("menus.actions.duplicate")}
                          </button>
                          <div className="my-1 border-t border-slate-200" />
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              openDeleteConfirmation(menu.id, menu.name, menu.language);
                            }}
                            className={`${menuButtonClass} text-red-600 hover:bg-red-50`}
                          >
                            <Trash2 size={14} />
                            {t("menus.actions.delete")}
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </>
              );
            }}
          />
        </div>
      ) : (
        <div className="p-8 text-center">
          <ListTree className="mx-auto mb-4 text-slate-400" size={48} />
          <h2 className="text-xl font-semibold mb-2">{t("menus.emptyTitle", "No menus yet")}</h2>
          <p className="text-slate-600 mb-4">{t("menus.emptyDescription", "Create your first menu")}</p>
          <Button onClick={handleNewMenu} variant="primary" icon={<CirclePlus size={18} />}>
            {t("menus.newMenu")}
          </Button>
        </div>
      )}

      {confirmationModal}
    </PageLayout>
  );
}
