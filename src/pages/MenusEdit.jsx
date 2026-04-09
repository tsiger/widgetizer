import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react";

import PageLayout from "../components/layout/PageLayout";
import MenuForm from "../components/menus/MenuForm";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Button from "../components/ui/Button";

import useToastStore from "../stores/toastStore";
import useProjectStore from "../stores/projectStore";
import { getMenu, updateMenu } from "../queries/menuManager";
import useGuardedFormPage from "../hooks/useGuardedFormPage";

export default function MenusEdit() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessActions, setShowSuccessActions] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const showToast = useToastStore((state) => state.showToast);
  const activeProject = useProjectStore((state) => state.activeProject);

  const { navigateSafely, getDirtyTitle } = useGuardedFormPage(isDirty);

  useEffect(() => {
    if (!activeProject?.id) {
      setMenu(null);
      setLoading(false);
      return;
    }
    setMenu(null);
    setLoading(true);
    loadMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, activeProject?.id]);

  const loadMenu = async () => {
    try {
      const menuData = await getMenu(id);
      setMenu(menuData);
      setLoading(false);
    } catch (err) {
      showToast(err.message || t("menusEdit.toasts.loadError"), "error");
      setLoading(false);
    }
  };

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);

    try {
      const updatedMenu = await updateMenu(id, {
        ...menu,
        ...formData,
        updated: new Date().toISOString(),
      });

      setMenu(updatedMenu);
      showToast(t("menusEdit.toasts.updateSuccess", { name: updatedMenu.name }), "success");
      setShowSuccessActions(true);
      setIsDirty(false);
      return true;
    } catch (err) {
      showToast(err.message || t("menusEdit.toasts.updateError"), "error");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading)
    return (
      <PageLayout title={t("menusEdit.title")}>
        <LoadingSpinner message={t("menusEdit.loading")} />
      </PageLayout>
    );

  if (!menu) return <PageLayout title={t("menusEdit.title")}>{t("menusEdit.notFound")}</PageLayout>;

  return (
    <PageLayout title={getDirtyTitle(t("menusEdit.title"))}>
      {showSuccessActions && (
        <div className="mb-4 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => navigate("/menus")} icon={<ChevronLeft size={18} />}>
            {t("menusEdit.backToList")}
          </Button>
        </div>
      )}

      {menu && (
        <MenuForm
          initialData={menu}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel={t("menusEdit.saveChanges")}
          onCancel={() => navigateSafely("/menus")}
          onDirtyChange={setIsDirty}
          isDirty={isDirty}
        />
      )}
    </PageLayout>
  );
}
