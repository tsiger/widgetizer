import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

import PageLayout from "../components/layout/PageLayout";
import PageForm from "../components/pages/PageForm";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Button from "../components/ui/Button";

import useToastStore from "../stores/toastStore";
import { getPage, updatePage } from "../queries/pageManager";

export default function PagesEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessActions, setShowSuccessActions] = useState(false);

  const showToast = useToastStore((state) => state.showToast);

  useEffect(() => {
    loadPage();
  }, [id]);

  const loadPage = async () => {
    try {
      const pageData = await getPage(id);
      setPage(pageData);
      setLoading(false);
    } catch (err) {
      showToast(err.message || "Failed to load page", "error");
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
        if (formData.slug !== id) {
          navigate(`/pages/${formData.slug}/edit`, { replace: true });
          showToast(`Page "${formData.name}" was updated successfully and URL was changed.`, "success");
        } else {
          showToast(`Page "${formData.name}" was updated successfully!`, "success");
        }
        setPage({
          ...page,
          ...formData,
          updated: new Date().toISOString(),
        });
        setShowSuccessActions(true);
        return false;
      } else {
        showToast(result.message || "Unknown error", "error");
        return false;
      }
    } catch (err) {
      showToast(err.message || "Failed to update page", "error");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading)
    return (
      <PageLayout title="Edit Page">
        <LoadingSpinner message="Loading page..." />
      </PageLayout>
    );

  return (
    <PageLayout title="Edit page">
      {showSuccessActions && (
        <div className="mb-4 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => navigate("/pages")} icon={<ChevronLeft size={18} />}>
            Back to pages list
          </Button>
        </div>
      )}

      {page && (
        <PageForm
          initialData={page}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel="Save Changes"
          onCancel={() => navigate("/pages")}
        />
      )}
    </PageLayout>
  );
}
