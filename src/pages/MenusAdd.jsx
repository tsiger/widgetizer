import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import PageLayout from "../components/layout/PageLayout";
import MenuForm from "../components/menus/MenuForm";
import useToastStore from "../stores/toastStore";
import { createMenu } from "../queries/menuManager";
import useFormNavigationGuard from "../hooks/useFormNavigationGuard";

export default function MenusAdd() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const skipNavigationGuardRef = useRef(false);

  const showToast = useToastStore((state) => state.showToast);

  // Add navigation guard with skip ref
  useFormNavigationGuard(isDirty, skipNavigationGuardRef);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);

    try {
      const newMenu = await createMenu(formData);
      showToast(t("menusAdd.toasts.createSuccess", { name: formData.name }), "success");

      // Redirect to structure editor after successful creation
      skipNavigationGuardRef.current = true;
      navigate(`/menus/${newMenu.id}/structure`);
      return true;
    } catch (err) {
      showToast(err.message || t("menusAdd.toasts.createError"), "error");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageLayout
      title={
        <span className="flex items-center gap-2">
          {t("menusAdd.title")}
          {isDirty && <span className="w-2 h-2 bg-pink-500 rounded-full" />}
        </span>
      }
    >
      <MenuForm
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel={t("menusAdd.create")}
        onCancel={() => {
          skipNavigationGuardRef.current = true;
          navigate("/menus");
        }}
        onDirtyChange={setIsDirty}
        isDirty={isDirty}
      />
    </PageLayout>
  );
}
