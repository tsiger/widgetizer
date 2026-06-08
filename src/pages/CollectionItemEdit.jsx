import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react";

import PageLayout from "../components/layout/PageLayout";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Button from "../components/ui/Button";
import CollectionItemForm from "../components/collections/CollectionItemForm";
import useToastStore from "../stores/toastStore";
import useProjectStore from "../stores/projectStore";
import { getCollectionSchema, getCollectionItem, updateCollectionItem } from "../queries/collectionManager";
import { invalidateMediaCache } from "../queries/mediaManager";
import { invalidateLinkTargetsCache } from "../hooks/useLinkTargets";
import useGuardedFormPage from "../hooks/useGuardedFormPage";

export default function CollectionItemEdit() {
  const { t } = useTranslation();
  const { type, slug } = useParams();
  const navigate = useNavigate();

  const [schema, setSchema] = useState(null);
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBackAction, setShowBackAction] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const showToast = useToastStore((state) => state.showToast);
  const { navigateSafely, getDirtyTitle } = useGuardedFormPage(isDirty);

  useEffect(() => {
    let cancelled = false;
    setItem(null);
    setLoading(true);
    Promise.all([getCollectionSchema(type), getCollectionItem(type, slug)])
      .then(([schemaData, itemData]) => {
        if (cancelled) return;
        setSchema(schemaData);
        setItem(itemData);
      })
      .catch((err) => {
        if (!cancelled) showToast(err.message || t("collectionsForm.loadError"), "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, slug]);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      const updated = await updateCollectionItem(type, slug, formData);

      const savedName = updated?.title || schema?.displayName || type;
      const activeProject = useProjectStore.getState().activeProject;
      invalidateMediaCache(activeProject?.id);
      invalidateLinkTargetsCache(activeProject?.id);

      if (updated.slug !== slug) {
        navigateSafely(`/collections/${type}/${updated.slug}/edit`, { replace: true });
        showToast(t("collectionsForm.toasts.updateSuccessUrlChanged", { name: savedName }), "success");
      } else {
        showToast(t("collectionsForm.toasts.updateSuccess", { name: savedName }), "success");
      }
      setItem(updated);
      setIsDirty(false);
      setShowBackAction(true);
      return true;
    } catch (err) {
      showToast(err.message || t("collectionsForm.toasts.updateError"), "error");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title={t("collectionsForm.loading")}>
        <LoadingSpinner message={t("collectionsForm.loading")} />
      </PageLayout>
    );
  }

  const title = schema ? t("collectionsForm.editTitle", { name: schema.displayName }) : t("collectionsForm.editTitle");

  return (
    <PageLayout title={getDirtyTitle(title)}>
      {showBackAction && (
        <div className="mb-4 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => navigate(`/collections/${type}`)} icon={<ChevronLeft size={18} />}>
            {t("collectionsForm.backToList")}
          </Button>
        </div>
      )}

      {schema && item && (
        <CollectionItemForm
          schema={schema}
          initialData={item}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel={t("collectionsForm.saveChanges")}
          onCancel={() => navigateSafely(`/collections/${type}`)}
          onDirtyChange={setIsDirty}
          isDirty={isDirty}
        />
      )}
    </PageLayout>
  );
}
