import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Pencil } from "lucide-react";

import PageLayout from "../components/layout/PageLayout";
import PageForm from "../components/pages/PageForm";
import Button from "../components/ui/Button";
import useToastStore from "../stores/toastStore";
import { createPage } from "../queries/pageManager";
import useFormNavigationGuard from "../hooks/useFormNavigationGuard";

export default function PagesAdd() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCreatedPage, setLastCreatedPage] = useState(null);
  const [formKey, setFormKey] = useState("initial");
  const [isDirty, setIsDirty] = useState(false);
  const skipNavigationGuardRef = useRef(false);

  const showToast = useToastStore((state) => state.showToast);

  // Add navigation guard with skip ref for intentional navigation
  useFormNavigationGuard(isDirty, skipNavigationGuardRef);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);

    try {
      const newPage = await createPage(formData);
      setLastCreatedPage(newPage);
      showToast(t("pagesAdd.toasts.createSuccess", { name: formData.name }), "success");
      setFormKey(`new-form-${Date.now()}`);
      setIsDirty(false); // Reset dirty state after successful save
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
      {lastCreatedPage && (
        <div className="mb-4 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => navigate("/pages")} icon={<ChevronLeft size={18} />}>
            {t("pagesAdd.goToList")}
          </Button>
          {lastCreatedPage && (
            <Button
              variant="secondary"
              onClick={() => navigate(`/pages/${lastCreatedPage.slug}/edit`)}
              icon={<Pencil size={18} />}
            >
              {t("pagesAdd.editThis")}
            </Button>
          )}
        </div>
      )}

      <PageForm
        key={formKey}
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
