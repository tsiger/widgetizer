import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ChevronLeft } from "lucide-react";

import PageLayout from "../components/layout/PageLayout";
import MenuForm from "../components/menus/MenuForm";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Button from "../components/ui/Button";

import useToastStore from "../stores/toastStore";
import { getMenu, updateMenu } from "../utils/menuManager";
import useProjectStore from "../stores/projectStore";

export default function MenusEdit() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessActions, setShowSuccessActions] = useState(false);

  const showToast = useToastStore((state) => state.showToast);
  const activeProject = useProjectStore((state) => state.activeProject);

  useEffect(() => {
    loadMenu();
  }, [slug]);

  const loadMenu = async () => {
    try {
      const menuData = await getMenu(slug);
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
      const updatedMenu = await updateMenu(slug, {
        ...menu,
        ...formData,
        updated: new Date().toISOString(),
      });

      setMenu(updatedMenu);
      showToast(`Menu "${formData.name}" was updated successfully!`, "success");
      setShowSuccessActions(true);
      return false;
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

  if (!activeProject) {
    showToast("Please select or create a project to manage your menus", "error");
    return (
      <PageLayout title="Edit menu">
        <div className="p-8 text-center">
          <AlertCircle className="mx-auto mb-4 text-yellow-500" size={48} />
          <h2 className="text-xl font-semibold mb-2">No Active Project</h2>
          <p className="text-slate-600 mb-4">Please select or create a project to manage your menus.</p>
        </div>
      </PageLayout>
    );
  }

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
        />
      )}
    </PageLayout>
  );
}
