import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { AlertCircle } from "lucide-react";

import PageLayout from "../components/layout/PageLayout";
import MenuEditor from "../components/menus/MenuEditor";
import LoadingSpinner from "../components/ui/LoadingSpinner";

import { getMenu, updateMenu } from "../utils/menuManager";

import useToastStore from "../stores/toastStore";

export default function MenuStructure() {
  const { id } = useParams();
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const showToast = useToastStore((state) => state.showToast);

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

    // Show success message with subtle feedback
    showToast(`"${itemToDelete.label || "Menu item"}" deleted`, "success");
  };

  // Load menu data
  useEffect(() => {
    async function loadMenu() {
      try {
        setLoading(true);
        const data = await getMenu(id);
        setMenu(data);
      } catch (err) {
        showToast(err.message || "Failed to load menu", "error");
      } finally {
        setLoading(false);
      }
    }

    loadMenu();
  }, [id, showToast]);

  // Save menu
  const handleSave = async () => {
    try {
      setSaving(true);
      // Get the updated menu data from the API response
      const savedMenu = await updateMenu(menu.id, menu);
      // Update the local state with the saved data (including new timestamp)
      setMenu(savedMenu);
      showToast("Menu saved successfully", "success");
    } catch (err) {
      showToast(err.message || "Failed to save menu", "error");
    } finally {
      setSaving(false);
    }
  };

  // Handle menu items change
  const handleMenuItemsChange = (newItems) => {
    setMenu((prev) => {
      if (prev.items === newItems) return prev; // no change → no update
      return { ...prev, items: newItems };
    });
  };

  if (loading) {
    return (
      <PageLayout title="Edit Menu Structure">
        <LoadingSpinner message="Loading menu..." />
      </PageLayout>
    );
  }

  if (!menu) {
    showToast("Menu not found", "error");
    return <PageLayout title="Edit Menu Structure">Menu not found</PageLayout>;
  }

  return (
    <PageLayout
      title={`${menu.name}`}
      description="You can add up to 3 levels of menu items."
      buttonProps={{
        onClick: handleSave,
        children: saving ? "Saving..." : "Save Menu",
        disabled: saving,
      }}
    >
      <MenuEditor initialItems={menu.items || []} onChange={handleMenuItemsChange} onDeleteItem={handleDeleteItem} />
    </PageLayout>
  );
}
