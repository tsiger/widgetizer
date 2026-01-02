import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Pencil } from "lucide-react";

import PageLayout from "../components/layout/PageLayout";
import MenuForm from "../components/menus/MenuForm";
import Button from "../components/ui/Button";
import useToastStore from "../stores/toastStore";
import { createMenu } from "../queries/menuManager";
import useFormNavigationGuard from "../hooks/useFormNavigationGuard";

export default function MenusAdd() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCreatedMenu, setLastCreatedMenu] = useState(null);
  const [formKey, setFormKey] = useState("initial");
  const [isDirty, setIsDirty] = useState(false);
  const skipNavigationGuardRef = useRef(false);

  const showToast = useToastStore((state) => state.showToast);

  // Add navigation guard with skip ref
  useFormNavigationGuard(isDirty, skipNavigationGuardRef);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);

    try {
      const newMenu = await createMenu(formData);
      setLastCreatedMenu(newMenu);
      showToast(t("menusAdd.toasts.createSuccess", { name: formData.name }), "success");
      setFormKey(`new-form-${Date.now()}`);
      setIsDirty(false); // Reset dirty state after successful save
      return true;
    } catch (err) {
      showToast(err.message || t("menusAdd.toasts.createError"), "error");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageLayout title={t("menusAdd.title")}>
      {lastCreatedMenu && (
        <div className="mb-4 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => navigate("/menus")} icon={<ChevronLeft size={18} />}>
            {t("menusAdd.goToList")}
          </Button>
          {lastCreatedMenu && (
            <Button
              variant="secondary"
              onClick={() => navigate(`/menus/${lastCreatedMenu.id}/structure`)}
              icon={<Pencil size={18} />}
            >
              {t("menusAdd.editThis")}
            </Button>
          )}
        </div>
      )}

      <MenuForm
        key={formKey}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel={t("menusAdd.create")}
        onCancel={() => {
          skipNavigationGuardRef.current = true;
          navigate("/menus");
        }}
        onDirtyChange={setIsDirty}
      />
      
      {isDirty && (
        <div className="mt-4 text-sm text-amber-600">
          {t("common.unsavedChanges")}
        </div>
      )}
    </PageLayout>
  );
}
