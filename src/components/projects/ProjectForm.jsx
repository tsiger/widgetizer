import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { API_URL } from "../../config";
import LoadingSpinner from "../ui/LoadingSpinner";
import Button from "../ui/Button";
import slugify from "slugify";
import useToastStore from "../../stores/toastStore";

export default function ProjectForm({
  initialData = { name: "", description: "", theme: "", siteUrl: "" },
  onSubmit,
  isSubmitting,
  submitLabel = "Save",
  onCancel,
  onDirtyChange,
}) {
  const isNew = !initialData.id;
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const showToast = useToastStore((state) => state.showToast);

  const {
    register,
    handleSubmit: rhfHandleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue,
  } = useForm({
    defaultValues: {
      name: initialData.name || "",
      slug: initialData.slug || initialData.id || "",
      description: initialData.description || "",
      theme: initialData.theme || "",
      siteUrl: initialData.siteUrl || (isNew ? "https://" : ""),
    },
  });

  // Watch name for auto-slug generation
  const name = watch("name");

  // Notify parent of dirty state changes
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);
  
  // Track previous initialData to prevent infinite loops
  const prevInitialDataRef = useRef(JSON.stringify(initialData));

  // Auto-generate slug from name for new projects
  useEffect(() => {
    if (isNew && name) {
      setValue("slug", formatSlug(name));
    }
  }, [name, isNew, setValue]);

  // Reset form when initialData actually changes
  useEffect(() => {
    const currentInitialDataStr = JSON.stringify(initialData);
    if (prevInitialDataRef.current !== currentInitialDataStr) {
      reset({
        name: initialData.name || "",
        slug: initialData.slug || initialData.id || "",
        description: initialData.description || "",
        theme: initialData.theme || "",
        siteUrl: initialData.siteUrl || (isNew ? "https://" : ""),
      });
      prevInitialDataRef.current = currentInitialDataStr;
    }
  });

  // Load themes and auto-select default
  useEffect(() => {
    loadThemes();
  }, []);

  const loadThemes = async () => {
    try {
      const response = await fetch(API_URL("/api/themes"));
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setThemes(data);

      // Auto-select Default theme for new projects
      if (isNew && !initialData.theme) {
        const defaultTheme = data.find((theme) => theme.id === "default" || theme.name.toLowerCase() === "default");
        if (defaultTheme) {
          setValue("theme", defaultTheme.id);
        }
      }
    } catch {
      showToast("Failed to load themes", "error");
    } finally {
      setLoading(false);
    }
  };

  const formatSlug = (value) => {
    return slugify(value, {
      lower: true,
      strict: true,
      trim: true,
    });
  };

  const onSubmitHandler = async (data) => {
    try {
      const result = await onSubmit(data);

      // If the parent component signals to reset the form
      if (result === true) {
        reset({
          name: "",
          slug: "",
          description: "",
          theme: "",
          siteUrl: "https://",
        });
      }
      return result;
    } catch (err) {
      showToast(err.message || "An error occurred while submitting the form", "error");
      return false;
    }
  };

  if (loading) return <LoadingSpinner message="Un momento por favor..." />;

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
              required: "Project name is required",
              validate: (value) => value.trim() !== "" || "Name cannot be empty",
            })}
            className="form-input"
          />
          {errors.name && <p className="form-error">{errors.name.message}</p>}
          <p className="form-description">
            The display name for your project. Can be changed anytime without affecting the folder structure.
          </p>
        </div>

        <div className="form-field">
          <label htmlFor="slug" className="form-label">
            Slug
          </label>
          <input
            type="text"
            id="slug"
            {...register("slug", {
              required: "Project slug is required",
              validate: (value) => value.trim() !== "" || "Slug cannot be empty",
              pattern: {
                value: /^[a-z0-9-]+$/,
                message: "Slug can only contain lowercase letters, numbers, and hyphens",
              },
            })}
            className="form-input"
          />
          {errors.slug && <p className="form-error">{errors.slug.message}</p>}
          <p className="form-description">
            The folder name for your project. Only lowercase letters, numbers, and hyphens.{" "}
            {isNew ? "Auto-fills from title but you can edit it." : "Changing this will rename the project folder."}
          </p>
        </div>

        <div className="form-field">
          <label htmlFor="description" className="form-label-optional">
            Description
          </label>
          <textarea
            id="description"
            {...register("description")}
            rows="4"
            className="form-textarea"
          />
        </div>

        <div className="form-field">
          <label htmlFor="siteUrl" className="form-label-optional">
            Site URL
          </label>
          <input
            type="url"
            id="siteUrl"
            {...register("siteUrl")}
            className="form-input"
            placeholder="https://mysite.com"
          />
          <p className="form-description">
            The full URL where this project will be deployed. Used for social media images and canonical URLs.
          </p>
        </div>

        {isNew && (
          <div className="form-field">
            <label htmlFor="theme" className="form-label">
              Theme
            </label>
            <select
              id="theme"
              {...register("theme", {
                required: isNew ? "Theme is required" : false,
              })}
              className="form-select"
            >
              <option value="">Select a theme</option>
              {themes.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.name}
                </option>
              ))}
            </select>
            {errors.theme && <p className="form-error">{errors.theme.message}</p>}
          </div>
        )}
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
