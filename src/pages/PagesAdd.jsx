import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import PageLayout from "../components/layout/PageLayout";
import PageForm from "../components/pages/PageForm";
import useToastStore from "../stores/toastStore";
import { createPage } from "../queries/pageManager";
import useFormNavigationGuard from "../hooks/useFormNavigationGuard";

export default function PagesAdd() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const skipNavigationGuardRef = useRef(false);

  const showToast = useToastStore((state) => state.showToast);

  // Add navigation guard with skip ref for intentional navigation
  useFormNavigationGuard(isDirty, skipNavigationGuardRef);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);

    try {
      await createPage(formData);
      showToast(t("pagesAdd.toasts.createSuccess", { name: formData.name }), "success");
      
      // Redirect to list after successful creation
      skipNavigationGuardRef.current = true;
      navigate("/pages");
      return true;
    } catch (err) {
      showToast(err.message || t("pagesAdd.toasts.createError"), "error");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageLayout title={t("pagesAdd.title")}>
      <PageForm
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel={t("pagesAdd.create")}
        onCancel={() => {
          skipNavigationGuardRef.current = true;
          navigate("/pages");
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
