import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ChevronLeft, Pencil } from "lucide-react";

import PageLayout from "../components/layout/PageLayout";
import PageForm from "../components/pages/PageForm";
import useToastStore from "../stores/toastStore";
import { createPage } from "../utils/pageManager";
import useProjectStore from "../stores/projectStore";

export default function PagesAdd() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCreatedPage, setLastCreatedPage] = useState(null);
  const [formKey, setFormKey] = useState("initial");

  const showToast = useToastStore((state) => state.showToast);
  const activeProject = useProjectStore((state) => state.activeProject);

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

  if (!activeProject) {
    showToast("Please select or create a project to manage your pages", "error");
    return (
      <PageLayout title="New page">
        <div className="p-8 text-center">
          <AlertCircle className="mx-auto mb-4 text-yellow-500" size={48} />
          <h2 className="text-xl font-semibold mb-2">No Active Project</h2>
          <p className="text-slate-600 mb-4">Please select or create a project to manage your pages.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="New page">
      {lastCreatedPage && (
        <div className="mb-4 flex flex-wrap gap-3">
          <button
            onClick={() => navigate("/pages")}
            className="pl-3 pr-4 py-2 border-2 border-slate-300 rounded-sm hover:bg-slate-50 flex items-center gap-1"
          >
            <ChevronLeft size={18} /> Go to Pages List
          </button>
          {lastCreatedPage && (
            <button
              onClick={() => navigate(`/pages/${lastCreatedPage.slug}/edit`)}
              className="pl-3 pr-4 py-2 border-2 border-slate-300 rounded-sm hover:bg-slate-50 flex items-center gap-1  "
            >
              <Pencil size={18} /> Edit This Page
            </button>
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
