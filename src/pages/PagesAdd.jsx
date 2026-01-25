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

  const pageTitle = (
    <span className="flex items-center gap-2">
      {t("pagesAdd.title")}
      {isDirty && <span className="w-2 h-2 bg-pink-500 rounded-full" />}
    </span>
  );

  return (
    <PageLayout title={pageTitle}>
      <PageForm
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel={t("pagesAdd.create")}
        onCancel={() => {
          skipNavigationGuardRef.current = true;
          navigate("/pages");
        }}
        onDirtyChange={setIsDirty}
        isDirty={isDirty}
      />
    </PageLayout>
  );
}
