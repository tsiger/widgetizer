import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import useToastStore from "../../stores/toastStore";
import Button from "../ui/Button";

export default function MenuForm({
  initialData = { name: "", description: "" },
  onSubmit,
  isSubmitting = false,
  submitLabel = "Save",
  onCancel,
  onDirtyChange,
  isDirty: isDirtyProp = false,
}) {
  const { t } = useTranslation();
  const showToast = useToastStore((state) => state.showToast);

  const {
    register,
    handleSubmit: rhfHandleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm({
    defaultValues: {
      name: initialData.name || "",
      description: initialData.description || "",
    },
  });

  // Track previous initialData to prevent infinite loops
  const prevInitialDataRef = useRef(JSON.stringify(initialData));

  // Notify parent of dirty state changes
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Reset form when initialData actually changes
  useEffect(() => {
    const currentInitialDataStr = JSON.stringify(initialData);
    if (prevInitialDataRef.current !== currentInitialDataStr) {
      reset({
        name: initialData.name || "",
        description: initialData.description || "",
      });
      prevInitialDataRef.current = currentInitialDataStr;
    }
  });

  const onSubmitHandler = async (data) => {
    try {
      const result = await onSubmit(data);

      return result;
    } catch (err) {
      showToast(err.message || t("forms.common.formError"), "error");
      return false;
    }
  };

  return (
    <form onSubmit={rhfHandleSubmit(onSubmitHandler)} className="form-container">
      <div className="form-section">
        <div className="form-field">
          <label htmlFor="name" className="form-label">
            {t("forms.menu.titleLabel")} <span className="text-pink-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            {...register("name", {
              required: t("forms.menu.titleRequired"),
              validate: (value) => value.trim() !== "" || t("forms.menu.nameNotEmpty"),
            })}
            className="form-input"
          />
          {errors.name && <p className="form-error">{errors.name.message}</p>}
          <p className="form-description">{t("forms.menu.titleHelp")}</p>
        </div>

        <div className="form-field">
          <label htmlFor="description" className="form-label-optional">
            {t("forms.menu.descriptionLabel")}
          </label>
          <textarea id="description" {...register("description")} className="form-textarea" rows={3} />
          <p className="form-description">{t("forms.menu.descriptionHelp")}</p>
        </div>
      </div>

      <div className="form-actions">
        <Button type="submit" disabled={isSubmitting || !isDirtyProp} variant={isDirtyProp ? "dark" : "primary"}>
          {isSubmitting ? t("forms.common.saving") : submitLabel}
          {isDirtyProp && <span className="w-2 h-2 bg-pink-500 rounded-full -mt-2" />}
        </Button>
        {onCancel && (
          <Button type="button" onClick={onCancel} variant="secondary">
            {t("forms.common.cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}
