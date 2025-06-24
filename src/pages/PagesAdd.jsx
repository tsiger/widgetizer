import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Pencil } from "lucide-react";

import PageLayout from "../components/layout/PageLayout";
import PageForm from "../components/pages/PageForm";
import Button from "../components/ui/Button";
import useToastStore from "../stores/toastStore";
import { createPage } from "../utils/pageManager";

export default function PagesAdd() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCreatedPage, setLastCreatedPage] = useState(null);
  const [formKey, setFormKey] = useState("initial");

  const showToast = useToastStore((state) => state.showToast);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);

    try {
      const newPage = await createPage(formData);
      setLastCreatedPage(newPage);
      showToast(`Page "${formData.name}" was created successfully!`, "success");
      setFormKey(`new-form-${Date.now()}`);
      return true;
    } catch (err) {
      showToast(err.message || "Failed to create page", "error");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageLayout title="New page">
      {lastCreatedPage && (
        <div className="mb-4 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => navigate("/pages")} icon={<ChevronLeft size={18} />}>
            Go to Pages List
          </Button>
          {lastCreatedPage && (
            <Button
              variant="secondary"
              onClick={() => navigate(`/pages/${lastCreatedPage.slug}/edit`)}
              icon={<Pencil size={18} />}
            >
              Edit This Page
            </Button>
          )}
        </div>
      )}

      <PageForm
        key={formKey}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Create Page"
        onCancel={() => navigate("/pages")}
      />
    </PageLayout>
  );
}
