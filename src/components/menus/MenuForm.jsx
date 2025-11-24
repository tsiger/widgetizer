import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import slugify from "slugify";
import useToastStore from "../../stores/toastStore";
import Button from "../ui/Button";

export default function MenuForm({
  initialData = { name: "", description: "" },
  onSubmit,
  isSubmitting = false,
  submitLabel = "Save",
  onCancel,
}) {
  const isNew = !initialData.id;
  const showToast = useToastStore((state) => state.showToast);

  const {
    register,
    handleSubmit: rhfHandleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      name: initialData.name || "",
      description: initialData.description || "",
    },
  });

  // Track previous initialData to prevent infinite loops
  const prevInitialDataRef = useRef(JSON.stringify(initialData));

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

  const generateId = (name) => {
    return slugify(name, {
      lower: true,
      strict: true,
      trim: true,
    });
  };

  const onSubmitHandler = async (data) => {
    try {
      const result = await onSubmit({
        ...data,
        id: generateId(data.name),
      });

      return result;
    } catch (err) {
      showToast(err.message || "An error occurred while submitting the form", "error");
      return false;
    }
  };

  return (
    <form onSubmit={rhfHandleSubmit(onSubmitHandler)} className="form-container">
      <div className="form-section">
        <div className="form-field">
          <label htmlFor="name" className="form-label">
            Title
          </label>
          <input
            type="text"
            id="name"
            {...register("name", {
              required: "Menu name is required",
              validate: (value) => value.trim() !== "" || "Name cannot be empty",
            })}
            className="form-input"
          />
          {errors.name && <p className="form-error">{errors.name.message}</p>}
        </div>

        <div className="form-field">
          <label htmlFor="description" className="form-label-optional">
            Description
          </label>
          <textarea
            id="description"
            {...register("description")}
            className="form-textarea"
            rows={3}
          />
        </div>
      </div>

      <div className="form-actions">
        <Button type="submit" disabled={isSubmitting} variant="primary">
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" onClick={onCancel} variant="secondary">
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
