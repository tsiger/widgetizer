import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react";

import PageLayout from "../components/layout/PageLayout";
import MenuForm from "../components/menus/MenuForm";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Button from "../components/ui/Button";

import useToastStore from "../stores/toastStore";
import { getMenu, updateMenu } from "../queries/menuManager";
import useFormNavigationGuard from "../hooks/useFormNavigationGuard";

export default function MenusEdit() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessActions, setShowSuccessActions] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const skipNavigationGuardRef = useRef(false);

  const showToast = useToastStore((state) => state.showToast);

  // Add navigation guard with skip ref
  useFormNavigationGuard(isDirty, skipNavigationGuardRef);

  useEffect(() => {
    loadMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
      setIsDirty(false); // Reset dirty state after successful save
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
    <PageLayout
      title={
        <span className="flex items-center gap-2">
          {t("menusEdit.title")}
          {isDirty && <span className="w-2 h-2 bg-pink-500 rounded-full" />}
        </span>
      }
    >
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
          onCancel={() => {
            skipNavigationGuardRef.current = true;
            navigate("/menus");
          }}
          onDirtyChange={setIsDirty}
          isDirty={isDirty}
        />
      )}
    </PageLayout>
  );
}
