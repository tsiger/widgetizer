import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Pencil } from "lucide-react";

import PageLayout from "../components/layout/PageLayout";
import MenuForm from "../components/menus/MenuForm";
import Button from "../components/ui/Button";
import useToastStore from "../stores/toastStore";
import { createMenu } from "../queries/menuManager";
import useFormNavigationGuard from "../hooks/useFormNavigationGuard";

export default function MenusAdd() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCreatedMenu, setLastCreatedMenu] = useState(null);
  const [formKey, setFormKey] = useState("initial");
  const [isDirty, setIsDirty] = useState(false);

  const showToast = useToastStore((state) => state.showToast);

  // Add navigation guard
  useFormNavigationGuard(isDirty);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);

    try {
      const newMenu = await createMenu(formData);
      setLastCreatedMenu(newMenu);
      showToast(`Menu "${formData.name}" was created successfully!`, "success");
      setFormKey(`new-form-${Date.now()}`);
      setIsDirty(false); // Reset dirty state after successful save
      return true;
    } catch (err) {
      showToast(err.message || "Failed to create menu", "error");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

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
              onClick={() => navigate(`/menus/${lastCreatedMenu.id}/structure`)}
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
        onDirtyChange={setIsDirty}
      />
      
      {isDirty && (
        <div className="mt-4 text-sm text-amber-600">
          You have unsaved changes
        </div>
      )}
    </PageLayout>
  );
}
