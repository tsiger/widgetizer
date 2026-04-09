import { useState } from "react";
import { useTranslation } from "react-i18next";

import PageLayout from "../components/layout/PageLayout";
import MenuForm from "../components/menus/MenuForm";
import useToastStore from "../stores/toastStore";
import { createMenu } from "../queries/menuManager";
import useGuardedFormPage from "../hooks/useGuardedFormPage";

export default function MenusAdd() {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const showToast = useToastStore((state) => state.showToast);

  const { navigateSafely, getDirtyTitle } = useGuardedFormPage(isDirty);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);

    try {
      const newMenu = await createMenu(formData);
      showToast(t("menusAdd.toasts.createSuccess", { name: newMenu.name }), "success");

      navigateSafely(`/menus/${newMenu.id}/structure`);
      return true;
    } catch (err) {
      showToast(err.message || t("menusAdd.toasts.createError"), "error");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageLayout title={getDirtyTitle(t("menusAdd.title"))}>
      <MenuForm
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel={t("menusAdd.create")}
        onCancel={() => navigateSafely("/menus")}
        onDirtyChange={setIsDirty}
        isDirty={isDirty}
      />
    </PageLayout>
  );
}
