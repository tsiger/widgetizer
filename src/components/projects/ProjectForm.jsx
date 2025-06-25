import { useState, useEffect, useRef } from "react";
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
}) {
  const isNew = !initialData.id;
  const [formData, setFormData] = useState({
    name: initialData.name || "",
    slug: initialData.slug || initialData.id || "", // Use id as fallback for existing projects
    description: initialData.description || "",
    theme: initialData.theme || "",
    siteUrl: initialData.siteUrl || (isNew ? "https://" : ""),
  });
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const showToast = useToastStore((state) => state.showToast);

  // Use a ref to track if this is the first render
  const initialRender = useRef(true);

  // Store the previous initialData for comparison
  const prevInitialDataRef = useRef(JSON.stringify(initialData));

  useEffect(() => {
    loadThemes();
  }, []);

  // Reset form data when initialData changes (for example, after successful submission)
  useEffect(() => {
    // Skip the first render since we already set state from initialData
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }

    // Compare with previous initialData, not with current formData
    const currentInitialDataStr = JSON.stringify(initialData);
    if (prevInitialDataRef.current !== currentInitialDataStr) {
      setFormData({
        name: initialData.name || "",
        slug: initialData.slug || initialData.id || "", // Use id as fallback for existing projects
        description: initialData.description || "",
        theme: initialData.theme || "",
        siteUrl: initialData.siteUrl || (isNew ? "https://" : ""),
      });
      prevInitialDataRef.current = currentInitialDataStr;
    }
  }, [initialData]);

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
          setFormData((prev) => ({ ...prev, theme: defaultTheme.id }));
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast("Project name is required", "error");
      return;
    }

    if (!formData.slug.trim()) {
      showToast("Project slug is required", "error");
      return;
    }

    // Validate slug format
    const slugPattern = /^[a-z0-9-]+$/;
    if (!slugPattern.test(formData.slug)) {
      showToast("Slug can only contain lowercase letters, numbers, and hyphens", "error");
      return;
    }

    if (isNew && !formData.theme) {
      showToast("Theme is required", "error");
      return;
    }

    try {
      const result = await onSubmit({
        ...formData,
        // For new projects, the backend will generate the slug from the name
        // For existing projects, the slug doesn't change
      });

      // If the parent component signals to reset the form
      if (result === true) {
        setFormData({ name: "", slug: "", description: "", theme: "", siteUrl: "https://" });
      }
      return result;
    } catch (err) {
      showToast(err.message || "An error occurred while submitting the form", "error");
      return false;
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: value,
      };

      // For new projects, auto-generate slug from name
      if (isNew && name === "name" && value) {
        updated.slug = formatSlug(value);
      }

      return updated;
    });
  };

  if (loading) return <LoadingSpinner message="Un momento por favor..." />;

  return (
    <form onSubmit={handleSubmit} className="form-container">
      <div className="form-section">
        <div className="form-field">
          <label htmlFor="name" className="form-label">
            Title
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="form-input"
            required
          />
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
            name="slug"
            value={formData.slug}
            onChange={handleChange}
            className="form-input"
            required
            pattern="[a-z0-9-]+"
            title="Only lowercase letters, numbers, and hyphens are allowed"
          />
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
            name="description"
            value={formData.description}
            onChange={handleChange}
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
            name="siteUrl"
            value={formData.siteUrl}
            onChange={handleChange}
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
              name="theme"
              value={formData.theme}
              onChange={handleChange}
              className="form-select"
              required
            >
              <option value="">Select a theme</option>
              {themes.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.name}
                </option>
              ))}
            </select>
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
