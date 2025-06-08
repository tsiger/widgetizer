import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ChevronLeft, Pencil } from "lucide-react";

import PageLayout from "../components/layout/PageLayout";
import MenuForm from "../components/menus/MenuForm";
import Button from "../components/ui/Button";
import useToastStore from "../stores/toastStore";
import { createMenu } from "../utils/menuManager";
import useProjectStore from "../stores/projectStore";

export default function MenusAdd() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCreatedMenu, setLastCreatedMenu] = useState(null);
  const [formKey, setFormKey] = useState("initial");

  const showToast = useToastStore((state) => state.showToast);
  const activeProject = useProjectStore((state) => state.activeProject);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);

    try {
      const newMenu = await createMenu(formData);
      setLastCreatedMenu(newMenu);
      showToast(`Menu "${formData.name}" was created successfully!`, "success");
      setFormKey(`new-form-${Date.now()}`);
      return true;
    } catch (err) {
      showToast(err.message || "Failed to create menu", "error");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!activeProject) {
    return (
      <PageLayout title="Add menu">
        <div className="p-8 text-center">
          <AlertCircle className="mx-auto mb-4 text-yellow-500" size={48} />
          <h2 className="text-xl font-semibold mb-2">No Active Project</h2>
          <p className="text-slate-600 mb-4">Please select or create a project to manage your menus.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Add menu">
      {lastCreatedMenu && (
        <div className="mb-4 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => navigate("/menus")} icon={<ChevronLeft size={18} />}>
            Go to menus list
          </Button>
          {lastCreatedMenu && (
            <Button
              variant="secondary"
              onClick={() => navigate(`/menus/${lastCreatedMenu.slug}/structure`)}
              icon={<Pencil size={18} />}
            >
              Edit this menu
            </Button>
          )}
        </div>
      )}

      <MenuForm
        key={formKey}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Create Menu"
        onCancel={() => navigate("/menus")}
      />
    </PageLayout>
  );
}
