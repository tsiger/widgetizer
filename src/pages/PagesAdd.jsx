import { useState } from "react";
import { useTranslation } from "react-i18next";

import PageLayout from "../components/layout/PageLayout";
import PageForm from "../components/pages/PageForm";
import useToastStore from "../stores/toastStore";
import useProjectStore from "../stores/projectStore";
import { createPage } from "../queries/pageManager";
import { invalidateMediaCache } from "../queries/mediaManager";
import useGuardedFormPage from "../hooks/useGuardedFormPage";

export default function PagesAdd() {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const showToast = useToastStore((state) => state.showToast);

  const { navigateSafely, getDirtyTitle } = useGuardedFormPage(isDirty);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);

    try {
      const newPage = await createPage(formData);
      showToast(t("pagesAdd.toasts.createSuccess", { name: newPage.name }), "success");

      // Invalidate media cache since SEO images may have been set
      const activeProject = useProjectStore.getState().activeProject;
      if (activeProject) {
        invalidateMediaCache(activeProject.id);
      }

      navigateSafely("/pages");
      return true;
    } catch (err) {
      showToast(err.message || t("pagesAdd.toasts.createError"), "error");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageLayout title={getDirtyTitle(t("pagesAdd.title"))}>
      <PageForm
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel={t("pagesAdd.create")}
        onCancel={() => navigateSafely("/pages")}
        onDirtyChange={setIsDirty}
        isDirty={isDirty}
      />
    </PageLayout>
  );
}
