import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react";

import PageLayout from "../components/layout/PageLayout";
import PageForm from "../components/pages/PageForm";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Button from "../components/ui/Button";

import useToastStore from "../stores/toastStore";
import useProjectStore from "../stores/projectStore";
import { getPage, updatePage } from "../queries/pageManager";
import { invalidateMediaCache } from "../queries/mediaManager";
import useFormNavigationGuard from "../hooks/useFormNavigationGuard";

export default function PagesEdit() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessActions, setShowSuccessActions] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const isNavigatingAfterSaveRef = useRef(false);

  const showToast = useToastStore((state) => state.showToast);

  // Add navigation guard - bypass when navigating after successful save
  useFormNavigationGuard(isDirty, isNavigatingAfterSaveRef);

  useEffect(() => {
    // Reset navigation skip ref when page changes
    isNavigatingAfterSaveRef.current = false;
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadPage = async () => {
    try {
      const pageData = await getPage(id);
      setPage(pageData);
      setLoading(false);
    } catch (err) {
      showToast(err.message || t("pagesEdit.toasts.loadError"), "error");
      setLoading(false);
    }
  };

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);

    try {
      const result = await updatePage(id, {
        ...page,
        ...formData,
        updated: new Date().toISOString(),
      });

      if (result.success) {
        const savedName = result.data?.name || formData.name;
        // Set ref BEFORE navigation to bypass guard (refs update synchronously)
        if (formData.slug !== id) {
          isNavigatingAfterSaveRef.current = true;
          navigate(`/pages/${formData.slug}/edit`, { replace: true });
          showToast(t("pagesEdit.toasts.updateSuccessUrlChanged", { name: savedName }), "success");
        } else {
          showToast(t("pagesEdit.toasts.updateSuccess", { name: savedName }), "success");
        }
        setPage(result.data || {
          ...page,
          ...formData,
          updated: new Date().toISOString(),
        });
        setShowSuccessActions(true);
        setIsDirty(false);
        // Invalidate media cache since SEO images may have changed
        const activeProject = useProjectStore.getState().activeProject;
        if (activeProject) {
          invalidateMediaCache(activeProject.id);
        }
        return true;
      } else {
        showToast(result.message || t("pagesEdit.toasts.unknownError"), "error");
        return false;
      }
    } catch (err) {
      showToast(err.message || t("pagesEdit.toasts.updateError"), "error");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading)
    return (
      <PageLayout title={t("pagesEdit.title")}>
        <LoadingSpinner message={t("pagesEdit.loading")} />
      </PageLayout>
    );

  const pageTitle = (
    <span className="flex items-center gap-2">
      {t("pagesEdit.title")}
      {isDirty && <span className="w-2 h-2 bg-pink-500 rounded-full" />}
    </span>
  );

  return (
    <PageLayout title={pageTitle}>
      {showSuccessActions && (
        <div className="mb-4 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => navigate("/pages")} icon={<ChevronLeft size={18} />}>
            {t("pagesEdit.backToList")}
          </Button>
        </div>
      )}

      {page && (
        <PageForm
          initialData={page}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel={t("pagesEdit.saveChanges")}
          onCancel={() => {
            isNavigatingAfterSaveRef.current = true; // Bypass guard for intentional cancel
            navigate("/pages");
          }}
          onDirtyChange={setIsDirty}
          isDirty={isDirty}
        />
      )}
    </PageLayout>
  );
}
