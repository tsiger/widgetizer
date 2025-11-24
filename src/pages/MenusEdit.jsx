import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

import PageLayout from "../components/layout/PageLayout";
import MenuForm from "../components/menus/MenuForm";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Button from "../components/ui/Button";

import useToastStore from "../stores/toastStore";
import { getMenu, updateMenu } from "../queries/menuManager";
import useFormNavigationGuard from "../hooks/useFormNavigationGuard";

export default function MenusEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessActions, setShowSuccessActions] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const showToast = useToastStore((state) => state.showToast);

  // Add navigation guard
  useFormNavigationGuard(isDirty);

  useEffect(() => {
    loadMenu();
  }, [id]);

  const loadMenu = async () => {
    try {
      const menuData = await getMenu(id);
      setMenu(menuData);
      setLoading(false);
    } catch (err) {
      showToast(err.message || "Failed to load menu", "error");
      setLoading(false);
    }
  };

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);

    try {
      const updatedMenu = await updateMenu(id, {
        ...menu,
        ...formData,
        updated: new Date().toISOString(),
      });

      setMenu(updatedMenu);
      showToast(`Menu "${formData.name}" was updated successfully!`, "success");
      setShowSuccessActions(true);
      setIsDirty(false); // Reset dirty state after successful save
      return true;
    } catch (err) {
      showToast(err.message || "Failed to update menu", "error");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading)
    return (
      <PageLayout title="Edit menu">
        <LoadingSpinner message="Loading menu..." />
      </PageLayout>
    );

  if (!menu) return <PageLayout title="Edit menu">Menu not found</PageLayout>;

  return (
    <PageLayout title="Edit menu">
      {showSuccessActions && (
        <div className="mb-4 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => navigate("/menus")} icon={<ChevronLeft size={18} />}>
            Back to menus list
          </Button>
        </div>
      )}

      {menu && (
        <MenuForm
          initialData={menu}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel="Save Changes"
          onCancel={() => navigate("/menus")}
          onDirtyChange={setIsDirty}
        />
      )}
      
      {isDirty && (
        <div className="mt-4 text-sm text-amber-600">
          You have unsaved changes
        </div>
      )}
    </PageLayout>
  );
}
