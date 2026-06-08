import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import PageLayout from "../components/layout/PageLayout";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import CollectionItemForm from "../components/collections/CollectionItemForm";
import useToastStore from "../stores/toastStore";
import useProjectStore from "../stores/projectStore";
import { getCollectionSchema, createCollectionItem } from "../queries/collectionManager";
import { invalidateMediaCache } from "../queries/mediaManager";
import { invalidateLinkTargetsCache } from "../hooks/useLinkTargets";
import useGuardedFormPage from "../hooks/useGuardedFormPage";

export default function CollectionItemAdd() {
  const { t } = useTranslation();
  const { type } = useParams();
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const showToast = useToastStore((state) => state.showToast);
  const { navigateSafely, getDirtyTitle } = useGuardedFormPage(isDirty);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCollectionSchema(type)
      .then((data) => {
        if (!cancelled) setSchema(data);
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
  }, [type]);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      await createCollectionItem(type, formData);
      showToast(t("collectionsForm.toasts.createSuccess", { name: schema?.displayName || type }), "success");

      const activeProject = useProjectStore.getState().activeProject;
      invalidateMediaCache(activeProject?.id);
      invalidateLinkTargetsCache(activeProject?.id);

      navigateSafely(`/collections/${type}`);
      return true;
    } catch (err) {
      showToast(err.message || t("collectionsForm.toasts.createError"), "error");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = schema ? t("collectionsForm.addTitle", { name: schema.displayName }) : t("collectionsForm.loading");

  if (loading) {
    return (
      <PageLayout title={t("collectionsForm.loading")}>
        <LoadingSpinner message={t("collectionsForm.loading")} />
      </PageLayout>
    );
  }

  return (
    <PageLayout title={getDirtyTitle(title)}>
      {schema && (
        <CollectionItemForm
          schema={schema}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel={t("collectionsForm.create")}
          onCancel={() => navigateSafely(`/collections/${type}`)}
          onDirtyChange={setIsDirty}
          isDirty={isDirty}
        />
      )}
    </PageLayout>
  );
}
