import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import PageLayout from "../components/layout/PageLayout";
import MenuEditor from "../components/menus/MenuEditor";
import LoadingSpinner from "../components/ui/LoadingSpinner";

import { getMenu, updateMenu } from "../queries/menuManager";

import useToastStore from "../stores/toastStore";
import useFormNavigationGuard from "../hooks/useFormNavigationGuard";

export default function MenuStructure() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const initialMenuRef = useRef(null);
  const showToast = useToastStore((state) => state.showToast);

  // Add navigation guard for unsaved changes
  useFormNavigationGuard(isDirty);

  // Helper to check if menu has changed
  const checkIfDirty = (currentMenu) => {
    if (!initialMenuRef.current || !currentMenu) return false;
    return JSON.stringify(currentMenu.items) !== JSON.stringify(initialMenuRef.current.items);
  };

  // Handle item deletion directly (no confirmation)
  const handleDeleteItem = (itemToDelete) => {
    if (!itemToDelete || !menu) return;

    // Function to recursively filter out the item
    function removeItem(items) {
      if (!items) return [];

      // Filter out the item at this level
      const filtered = items.filter((item) => item.id !== itemToDelete.id);

      // If we found and removed the item, we're done
      if (filtered.length < items.length) {
        return filtered;
      }

      // Otherwise, check children
      return filtered.map((item) => {
        if (item.items && item.items.length > 0) {
          return {
            ...item,
            items: removeItem(item.items),
          };
        }
        return item;
      });
    }

    // Create a completely new menu object with the item removed
    const updatedMenu = {
      ...menu,
      items: removeItem(menu.items || []),
    };

    // Update state with the new menu
    setMenu(updatedMenu);
    setIsDirty(checkIfDirty(updatedMenu));

    // Show success message with subtle feedback
    showToast(
      t("menuStructure.toasts.itemDeleted", { label: itemToDelete.label || t("menuStructure.toasts.defaultItemLabel") }),
      "success",
    );
  };

  // Load menu data
  useEffect(() => {
    async function loadMenu() {
      try {
        setLoading(true);
        const data = await getMenu(id);
        setMenu(data);
        initialMenuRef.current = JSON.parse(JSON.stringify(data)); // Deep clone for comparison
        setIsDirty(false);
      } catch (err) {
        showToast(err.message || t("menuStructure.toasts.loadError"), "error");
      } finally {
        setLoading(false);
      }
    }

    loadMenu();
  }, [id, showToast, t]);

  // Save menu
  const handleSave = async () => {
    try {
      setSaving(true);
      // Get the updated menu data from the API response
      const savedMenu = await updateMenu(menu.id, menu);
      // Update the local state with the saved data (including new timestamp)
      setMenu(savedMenu);
      initialMenuRef.current = JSON.parse(JSON.stringify(savedMenu)); // Reset initial state
      setIsDirty(false);
      showToast(t("menuStructure.toasts.saveSuccess"), "success");
    } catch (err) {
      showToast(err.message || t("menuStructure.toasts.saveError"), "error");
    } finally {
      setSaving(false);
    }
  };

  // Handle menu items change
  const handleMenuItemsChange = (newItems) => {
    setMenu((prev) => {
      if (prev.items === newItems) return prev; // no change → no update
      const updatedMenu = { ...prev, items: newItems };
      // Check dirty state after update
      setIsDirty(checkIfDirty(updatedMenu));
      return updatedMenu;
    });
  };

  if (loading) {
    return (
      <PageLayout title={t("menuStructure.title")}>
        <LoadingSpinner message={t("menuStructure.loading")} />
      </PageLayout>
    );
  }

  if (!menu) {
    showToast(t("menuStructure.toasts.notFound"), "error");
    return <PageLayout title={t("menuStructure.title")}>{t("menuStructure.notFound")}</PageLayout>;
  }

  return (
    <PageLayout
      title={`${menu.name}`}
      description={t("menuStructure.description")}
      buttonProps={{
        onClick: handleSave,
        children: saving ? t("menuStructure.saving") : t("menuStructure.save"),
        disabled: saving,
      }}
    >
      <MenuEditor initialItems={menu.items || []} onChange={handleMenuItemsChange} onDeleteItem={handleDeleteItem} />
    </PageLayout>
  );
}
